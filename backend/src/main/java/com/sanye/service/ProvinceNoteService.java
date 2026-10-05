package com.sanye.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanye.common.BizException;
import com.sanye.model.ProvinceNote;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 省份介绍：省名 -> 一段文字，JSON 文件持久化。
 * <p>
 * 落盘方式与 {@link WorkService}、{@link SiteConfigService} 一致（先写 .tmp 再原子替换）。
 * <p>
 * 为什么单独一个服务、不塞进 {@link com.sanye.model.SiteConfig}：那份配置是「一个对象」，
 * 加字段就得同时改 copyOf / normalize / update 三处，漏一处就会静默丢数据（README 里记着这条）。
 * 这里每个省一个键，写成 Map 更贴合，也让后台保存一个省时不会碰到别的省的键。
 */
@Service
public class ProvinceNoteService {

    private static final Logger log = LoggerFactory.getLogger(ProvinceNoteService.class);

    /** 介绍文字长度上限。前端 textarea 的 maxlength 要跟这个数保持一致 */
    public static final int NOTE_MAX = 200;

    /** 省名长度上限。够放"新疆维吾尔自治区"（8 字）再留一大截余量 */
    private static final int PROVINCE_MAX = 32;

    private final ObjectMapper objectMapper;
    private final Path dataFile;

    /** 省名 -> 介绍。整体替换引用，读方永远看到一个完整对象 */
    private volatile Map<String, String> notes = new LinkedHashMap<>();

    public ProvinceNoteService(ObjectMapper objectMapper,
                               @Value("${app.province-note-file:./data/province-notes.json}") String dataFile) {
        this.objectMapper = objectMapper;
        this.dataFile = Paths.get(dataFile).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        load();
    }

    /** 全部省份介绍。没写过的省不在表里，前端取不到就是没介绍 */
    public Map<String, String> get() {
        return new LinkedHashMap<>(notes);
    }

    /**
     * 保存一个省的介绍。整体替换当前的表。
     * <p>
     * 介绍传空串等于删掉这个省 —— 留一个键映射到空串的话，文件里会攒下一堆
     * 空字符串，跟「没写过」在语义上也没区别。
     */
    public synchronized ProvinceNote update(ProvinceNote incoming) {
        if (incoming == null) {
            throw new BizException("内容不能为空");
        }

        String province = incoming.getProvince() == null ? "" : incoming.getProvince().trim();
        if (province.isEmpty()) {
            throw new BizException("请选择省份");
        }
        if (province.length() > PROVINCE_MAX) {
            throw new BizException("省份名不正确");
        }

        String note = incoming.getNote() == null ? "" : incoming.getNote().trim();
        if (note.length() > NOTE_MAX) {
            throw new BizException("介绍最多 " + NOTE_MAX + " 个字");
        }

        Map<String, String> next = new LinkedHashMap<>(notes);
        if (note.isEmpty()) {
            next.remove(province);
        } else {
            next.put(province, note);
        }

        notes = next;
        persist(next);
        return new ProvinceNote(province, note);
    }

    /**
     * 缺文件、文件是空对象、或者某个值是 null 都要兜住。
     * <p>
     * 这里读的是 Map，不用像 SiteConfig 那样逐字段 normalize —— 唯一能出问题的是
     * 值里有 null（手改成 {"四川省": null}），前端拿到会当字符串拼接。
     */
    private void load() {
        if (!Files.exists(dataFile)) {
            return;
        }
        try {
            Map<String, String> loaded = objectMapper.readValue(
                    dataFile.toFile(), new TypeReference<LinkedHashMap<String, String>>() {
                    });
            Map<String, String> fixed = new LinkedHashMap<>();
            if (loaded != null) {
                loaded.forEach((key, value) -> {
                    String name = key == null ? "" : key.trim();
                    String text = value == null ? "" : value.trim();
                    if (!name.isEmpty() && !text.isEmpty()) {
                        fixed.put(name, text);
                    }
                });
            }
            notes = fixed;
            log.info("已从 {} 加载 {} 个省份介绍", dataFile, fixed.size());
        } catch (IOException e) {
            // 解析不了就按空的起，别让后端起不来
            log.warn("读取省份介绍失败，按空表启动：{}", e.getMessage());
        }
    }

    /** 全量写回；写临时文件再原子替换，避免写一半把文件写坏 */
    private synchronized void persist(Map<String, String> data) {
        try {
            Path parent = dataFile.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Path tmp = dataFile.resolveSibling(dataFile.getFileName() + ".tmp");
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(tmp.toFile(), data);
            Files.move(tmp, dataFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("省份介绍落盘失败", e);
        }
    }
}
