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

    /** 城市名长度上限，前端两个输入框的 maxlength 与这里保持一致 */
    public static final int CITY_MAX = 20;

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

    public Work create(List<String> provinces, String title, String desc, String city, long takenAt,
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
        // 城市名在存图**之前**校验：放后面的话，名字不合法会抛异常，而两张图已经
        // 落在 uploads/ 里了，没有任何记录指着它们，成了永远清不掉的孤儿
        String cleanCity = checkCity(city);

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
        work.setCity(cleanCity);
        work.setTakenAt(takenAt);
        normalize(work);

        store.put(work.getId(), work);
        persist();
        return work;
    }

    /**
     * 改一件作品的拍摄城市和拍摄日期，别的字段一个都不动。
     * <p>
     * 为什么单开一个方法、而不是复用 create 或者干脆整个对象覆盖：图片、标题、描述、
     * 省份各有所属，这个接口只该管这两个字段。整个对象覆盖的话，前端少传一个字段
     * 就会把那个字段抹成 null —— 这正是 {@link ProvinceProfileService} 里
     * 「一个字段一个方法、不从零 new」那条理由（README 里记着）。
     * <p>
     * 走同一把锁 + 同一个 persist()，和 create/delete 是一条路。
     */
    public synchronized Work updateMeta(Long id, String city, long takenAt) {
        Work work = store.get(id);
        if (work == null) {
            throw new BizException("作品不存在或已被删除");
        }
        work.setCity(checkCity(city));
        work.setTakenAt(takenAt);
        normalize(work);
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
     * <p>
     * 城市和拍摄日期也在这儿收一遍：这两个字段是后加的，works.json 里
     * 已有的记录都没有，加载时会被读成 null / 0，正好是「没填」的语义。
     */
    private static void normalize(Work w) {
        if (w == null) {
            return;
        }
        w.setCity(cleanCity(w.getCity()));
        w.setTakenAt(cleanTakenAt(w.getTakenAt()));
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

    /**
     * 写入路径的城市名校验：trim 之后空串归 null（= 清掉），超长直接报错。
     * <p>
     * 报错而不是静默截断 —— 上传的人该知道自己的字被砍了。
     * <p>
     * ⚠️ 这里**不能**先转手给 cleanCity 再判长度：那个方法自己会截断，
     * 截完长度永远不超，这条检查就成了死代码（实测过，21 个字照样写进去了）。
     */
    private static String checkCity(String raw) {
        String city = raw == null ? null : raw.trim();
        if (city != null && city.isEmpty()) {
            return null;
        }
        if (city != null && city.length() > CITY_MAX) {
            throw new BizException("城市名最多 " + CITY_MAX + " 个字");
        }
        return city;
    }

    /**
     * 城市名的收尾：null / 纯空白都归 null（"没填"就这一种表示）。
     * <p>
     * 超长在这里是<b>截断</b>而不是报错：normalize() 在启动加载时也会对历史数据跑一遍，
     * 从那儿抛异常会让整个后端起不来。写入路径会先走 checkCity 把话说清楚。
     */
    private static String cleanCity(String raw) {
        if (raw == null) {
            return null;
        }
        String city = raw.trim();
        if (city.isEmpty()) {
            return null;
        }
        return city.length() > CITY_MAX ? city.substring(0, CITY_MAX) : city;
    }

    /**
     * 拍摄日期的收尾：小于等于 0（没填）和晚于此刻的值一律归 0。
     * <p>
     * 未来日期是挡不住的输入错 —— 日期框里手打一个 2099 进去，面板上那个
     * 「旅途天数」会算出一个几万天的数。宁可当没填。
     * （当天本身没问题：前端传的是当地零点，它一定小于此刻。）
     */
    private static long cleanTakenAt(long raw) {
        if (raw <= 0 || raw > System.currentTimeMillis()) {
            return 0;
        }
        return raw;
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
