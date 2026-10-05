package com.sanye.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanye.common.BizException;
import com.sanye.model.ProvinceNote;
import com.sanye.model.ProvinceProfile;
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
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 省份设置：省名 -> {介绍, 背景图}，JSON 文件持久化。
 * <p>
 * 落盘方式与 {@link WorkService}、{@link SiteConfigService} 一致（先写 .tmp 再原子替换）。
 * <p>
 * 为什么单独一个服务、不塞进 {@link com.sanye.model.SiteConfig}：那份配置是「一个对象」，
 * 加字段就得同时改 copyOf / normalize / update 三处，漏一处就会静默丢数据（README 里记着这条）。
 * 这里每个省一个键，写成 Map 更贴合，也让后台保存一个省时不会碰到别的省的键。
 * <p>
 * 三个写方法**只动自己那个字段**：改介绍不会碰背景图，换背景图不会碰介绍。两者都动了
 * 才需要一次 PUT，后台的面板正好也是这么用的（一个省一份，两块内容各自提交）。
 */
@Service
public class ProvinceProfileService {

    private static final Logger log = LoggerFactory.getLogger(ProvinceProfileService.class);

    /** 介绍文字长度上限。前端 textarea 的 maxlength 要跟这个数保持一致 */
    public static final int NOTE_MAX = 200;

    /** 省名长度上限。够放"新疆维吾尔自治区"（8 字）再留一大截余量 */
    private static final int PROVINCE_MAX = 32;

    private final ObjectMapper objectMapper;
    private final FileStorageService fileStorageService;
    private final Path dataFile;

    /** 省名 -> 设置。整体替换引用，读方永远看到一个完整对象 */
    private volatile Map<String, ProvinceProfile> profiles = new LinkedHashMap<>();

    public ProvinceProfileService(ObjectMapper objectMapper,
                                  FileStorageService fileStorageService,
                                  @Value("${app.province-profile-file:./data/province-profiles.json}") String dataFile) {
        this.objectMapper = objectMapper;
        this.fileStorageService = fileStorageService;
        this.dataFile = Paths.get(dataFile).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        load();
    }

    /**
     * 全部省份设置。没设置过的省不在表里。
     * <p>
     * 值要**复制一份**再交出去：{@link ProvinceProfile} 是可变的，而它是当前表里那个
     * 实例本身，调用方（Jackson 序列化、Controller）理论上能改到内存里的状态。
     */
    public Map<String, ProvinceProfile> get() {
        Map<String, ProvinceProfile> copy = new LinkedHashMap<>();
        profiles.forEach((province, profile) -> copy.put(province, copyOf(profile)));
        return copy;
    }

    /**
     * 保存一个省的介绍，背景图原样留着。
     * <p>
     * 介绍传空串 = 想清掉这个字段。但只有背景图也是空的时候才把整个键删掉 ——
     * 否则「清空介绍」会顺手把这个省传过的背景图一起弄没。
     */
    public synchronized ProvinceProfile updateNote(ProvinceNote incoming) {
        if (incoming == null) {
            throw new BizException("内容不能为空");
        }

        String province = checkProvince(incoming.getProvince());

        String note = incoming.getNote() == null ? "" : incoming.getNote().trim();
        if (note.length() > NOTE_MAX) {
            throw new BizException("介绍最多 " + NOTE_MAX + " 个字");
        }

        Map<String, ProvinceProfile> next = new LinkedHashMap<>(profiles);
        String cover = coverOf(profiles.get(province));
        if (note.isEmpty() && cover.isEmpty()) {
            next.remove(province);
        } else {
            next.put(province, new ProvinceProfile(note, cover));
        }

        profiles = next;
        persist(next);
        return copyOf(next.get(province));
    }

    /**
     * 换一个省的背景图：落盘新图 -> 写进表 -> 删掉上一张。介绍原样留着。
     * <p>
     * 顺序不能反。persist 失败只记日志、不会回滚，先删旧文件的话会留下
     * 「文件已经没了，表里还指着它」的 404。
     */
    public synchronized ProvinceProfile updateCover(String province, MultipartFile file) {
        String name = checkProvince(province);

        // 先验省名再存文件：反过来的话，省名不合法会抛异常，而那张图已经落在 uploads/ 里了，
        // 没有任何记录指着它，成了永远清不掉的孤儿
        String url = fileStorageService.save(file, "背景图");
        String previous = coverOf(profiles.get(name));

        Map<String, ProvinceProfile> next = new LinkedHashMap<>(profiles);
        next.put(name, new ProvinceProfile(noteOf(profiles.get(name)), url));
        profiles = next;
        persist(next);

        // deleteByUrl 对非 /uploads/ 开头的路径直接 return，内置图不会被误删
        if (!previous.isEmpty() && !previous.equals(url)) {
            fileStorageService.deleteByUrl(previous);
        }
        return copyOf(next.get(name));
    }

    /** 清掉一个省的背景图并删文件，介绍保留。本来就没传过时是空操作，重复调用安全 */
    public synchronized ProvinceProfile clearCover(String province) {
        String name = checkProvince(province);
        ProvinceProfile current = profiles.get(name);
        String previous = coverOf(current);
        if (previous.isEmpty()) {
            return copyOf(current);
        }

        String note = noteOf(current);
        Map<String, ProvinceProfile> next = new LinkedHashMap<>(profiles);
        if (note.isEmpty()) {
            next.remove(name);
        } else {
            next.put(name, new ProvinceProfile(note, ""));
        }
        profiles = next;
        persist(next);

        fileStorageService.deleteByUrl(previous);
        return copyOf(next.get(name));
    }

    private String checkProvince(String raw) {
        String province = raw == null ? "" : raw.trim();
        if (province.isEmpty()) {
            throw new BizException("请选择省份");
        }
        if (province.length() > PROVINCE_MAX) {
            throw new BizException("省份名不正确");
        }
        return province;
    }

    /**
     * 缺文件、文件是空对象、或者某条记录被手改坏了都要兜住。
     * <p>
     * 用 JsonNode 而不是直接映射成 Map<String, ProvinceProfile>：手改过的文件里
     * 可能出现 {"四川省": "一段文字"} 这种老形态、或者 {"四川省": null} 这种，
     * 直接映射要么抛异常让后端起不来，要么塞一个字段全是 null 的对象进内存。
     * 这里逐条读，读不出字符串就当空串，两个字段都空的整条丢掉。
     */
    private void load() {
        if (!Files.exists(dataFile)) {
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(dataFile.toFile());
            Map<String, ProvinceProfile> fixed = new LinkedHashMap<>();
            if (root != null && root.isObject()) {
                Iterator<Map.Entry<String, JsonNode>> fields = root.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> entry = fields.next();
                    String name = entry.getKey() == null ? "" : entry.getKey().trim();
                    if (name.isEmpty()) {
                        continue;
                    }
                    JsonNode value = entry.getValue();
                    String note = text(value, "note");
                    String cover = text(value, "cover");
                    if (!note.isEmpty() || !cover.isEmpty()) {
                        fixed.put(name, new ProvinceProfile(note, cover));
                    }
                }
            }
            profiles = fixed;
            log.info("已从 {} 加载 {} 个省份设置", dataFile, fixed.size());
        } catch (IOException e) {
            // 解析不了就按空的起，别让后端起不来
            log.warn("读取省份设置失败，按空表启动：{}", e.getMessage());
        }
    }

    /** 从一条记录里取一个字符串字段。不是对象、字段缺失、或者值不是字符串，一律算空 */
    private String text(JsonNode value, String field) {
        if (value == null || !value.isObject()) {
            return "";
        }
        JsonNode node = value.get(field);
        return node == null || !node.isTextual() ? "" : node.asText().trim();
    }

    /** 全量写回；写临时文件再原子替换，避免写一半把文件写坏 */
    private synchronized void persist(Map<String, ProvinceProfile> data) {
        try {
            Path parent = dataFile.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Path tmp = dataFile.resolveSibling(dataFile.getFileName() + ".tmp");
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(tmp.toFile(), data);
            Files.move(tmp, dataFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("省份设置落盘失败", e);
        }
    }

    /** 复制一份；raw 为 null（键刚被删掉）时给一个空壳，别把 null 交给 Result 序列化出去 */
    private static ProvinceProfile copyOf(ProvinceProfile raw) {
        return new ProvinceProfile(noteOf(raw), coverOf(raw));
    }

    private static String noteOf(ProvinceProfile raw) {
        return raw == null || raw.getNote() == null ? "" : raw.getNote();
    }

    private static String coverOf(ProvinceProfile raw) {
        return raw == null || raw.getCover() == null ? "" : raw.getCover();
    }
}
