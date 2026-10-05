package com.sanye.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanye.common.BizException;
import com.sanye.model.Work;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 作品服务：内存 Map + JSON 文件持久化（原型够用，换数据库只需替换 load/persist）。
 */
@Service
public class WorkService {

    private static final Logger log = LoggerFactory.getLogger(WorkService.class);

    /** 描述字数上限，前端 admin.js 的 maxlength 与这里保持一致 */
    public static final int DESC_MAX = 50;

    /** 省份个数上限 = 34 个省级行政区 */
    public static final int PROVINCES_MAX = 34;
    /** 单个省名长度上限。"新疆维吾尔自治区" 是 8 个字，留足余量，只挡明显是垃圾的值 */
    private static final int PROVINCE_NAME_MAX = 32;

    private final Map<Long, Work> store = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(1);

    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;
    private final Path dataFile;

    public WorkService(FileStorageService fileStorageService,
                       ObjectMapper objectMapper,
                       @Value("${app.data-file:./data/works.json}") String dataFile) {
        this.fileStorageService = fileStorageService;
        this.objectMapper = objectMapper;
        this.dataFile = Paths.get(dataFile).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void load() {
        if (!Files.exists(dataFile)) {
            return;
        }
        try {
            List<Work> works = objectMapper.readValue(dataFile.toFile(), new TypeReference<List<Work>>() {
            });
            long maxId = 0;
            for (Work w : works) {
                normalize(w);
                store.put(w.getId(), w);
                maxId = Math.max(maxId, w.getId());
            }
            idGen.set(maxId + 1);
            log.info("已从 {} 加载 {} 件作品", dataFile, works.size());
        } catch (IOException e) {
            log.warn("读取作品数据失败，按空数据启动：{}", e.getMessage());
        }
    }

    /** 全部作品，新的在前。按省份看的那一份在前端自己分组，服务端不再过滤 */
    public List<Work> list() {
        List<Work> all = new ArrayList<>(store.values());
        all.sort(Comparator.comparingLong(Work::getCreateTime).reversed()
                .thenComparing(Comparator.comparingLong(Work::getId).reversed()));
        return all;
    }

    public Work create(List<String> provinces, String title, String desc,
                       MultipartFile before, MultipartFile after) {
        if (title == null || title.trim().isEmpty()) {
            throw new BizException("标题不能为空");
        }
        String cleanDesc = desc == null ? null : desc.trim();
        if (cleanDesc != null && cleanDesc.isEmpty()) {
            cleanDesc = null;
        }
        if (cleanDesc != null && cleanDesc.length() > DESC_MAX) {
            // 前端有 maxlength 兜着，这里是防绕过（curl / 改前端）的最后一道
            throw new BizException("描述最多 " + DESC_MAX + " 个字");
        }

        String beforeUrl = fileStorageService.save(before, "Before 图片");
        String afterUrl;
        try {
            afterUrl = fileStorageService.save(after, "After 图片");
        } catch (RuntimeException e) {
            // After 失败时回滚已落盘的 Before，避免产生孤儿文件
            fileStorageService.deleteByUrl(beforeUrl);
            throw e;
        }

        Work work = new Work();
        work.setId(idGen.getAndIncrement());
        work.setTitle(title.trim());
        work.setDesc(cleanDesc);
        work.setBeforeUrl(beforeUrl);
        work.setAfterUrl(afterUrl);
        work.setCreateTime(System.currentTimeMillis());
        work.setProvinces(provinces);
        normalize(work);

        store.put(work.getId(), work);
        persist();
        return work;
    }

    public void delete(Long id) {
        Work removed = store.remove(id);
        if (removed == null) {
            throw new BizException("作品不存在或已被删除");
        }
        fileStorageService.deleteByUrl(removed.getBeforeUrl());
        fileStorageService.deleteByUrl(removed.getAfterUrl());
        persist();
    }

    public Work get(Long id) {
        return store.get(id);
    }

    /**
     * 省份字段的兜底：null 归成空表，逐项 trim、丢空串、去重（保序）。
     * 旧数据没有这个字段、前端也可能一个省都不选，落盘前统一收一遍，
     * 别让 null 或重复值写进 works.json。
     * <p>
     * 这里刻意<b>不</b>做省名白名单 —— 那份名单在前端（js/provinces.js 和
     * china.json）。地图页对匹配不上的省名有兜底（归入「未归类」），
     * 所以在 Java 里再抄一份只会多一个会失同步的地方。
     */
    private static void normalize(Work w) {
        if (w == null) {
            return;
        }
        List<String> clean = new ArrayList<>();
        List<String> raw = w.getProvinces();
        if (raw != null) {
            for (String item : raw) {
                if (item == null) {
                    continue;
                }
                String name = item.trim();
                if (name.isEmpty() || name.length() > PROVINCE_NAME_MAX) {
                    continue;
                }
                if (!clean.contains(name)) {
                    clean.add(name);
                }
                if (clean.size() >= PROVINCES_MAX) {
                    break;
                }
            }
        }
        w.setProvinces(clean);
    }

    /** 全量写回；写临时文件再原子替换，避免写一半把数据写坏 */
    private synchronized void persist() {
        try {
            Path parent = dataFile.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Path tmp = dataFile.resolveSibling(dataFile.getFileName() + ".tmp");
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(tmp.toFile(), new ArrayList<>(store.values()));
            Files.move(tmp, dataFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("作品数据落盘失败", e);
        }
    }
}
