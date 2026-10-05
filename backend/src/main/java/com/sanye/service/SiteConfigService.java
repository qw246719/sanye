package com.sanye.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanye.common.BizException;
import com.sanye.model.FontPreset;
import com.sanye.model.SiteConfig;
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
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 站点配置服务：单个配置对象，JSON 文件持久化。
 * 落盘方式与 {@link WorkService} 一致（先写 .tmp 再原子替换）。
 * <p>
 * 首屏封面也挂在这里（{@link SiteConfig#getCoverUrl()}），图片本身仍走
 * {@link FileStorageService} 落到 uploads/，这里只存 URL。
 */
@Service
public class SiteConfigService {

    private static final Logger log = LoggerFactory.getLogger(SiteConfigService.class);

    /** 首屏文字长度上限。前端 input 的 maxlength 要跟这个数保持一致 */
    public static final int INTRO_TEXT_MAX = 12;

    /** 不加载网络字体时的回退栈，和 style.css 里 --font 的值一致 */
    private static final String SYSTEM_STACK =
            "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";

    private final List<FontPreset> fonts = new CopyOnWriteArrayList<>();

    private final ObjectMapper objectMapper;
    private final FileStorageService fileStorageService;
    private final Path dataFile;

    /** 当前配置。update 整体替换引用，所以读方永远看到一个完整对象 */
    private volatile SiteConfig current = new SiteConfig();

    public SiteConfigService(ObjectMapper objectMapper,
                             FileStorageService fileStorageService,
                             @Value("${app.site-config-file:./data/site.json}") String dataFile) {
        this.objectMapper = objectMapper;
        this.fileStorageService = fileStorageService;
        this.dataFile = Paths.get(dataFile).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        initFonts();
        load();
    }

    /**
     * 字体预设写死在代码里，接数据库时只改这个方法。
     * <p>
     * pkg 是「中文网字计划」在 npm 上的包名，每个包里是 cn-font-split 切好的、
     * 带 unicode-range 的分片 CSS，浏览器只会下载真正用到的那几片。
     */
    private void initFonts() {
        fonts.add(new FontPreset("default", "系统默认", "", "", SYSTEM_STACK));

        fonts.add(new FontPreset("lxgw-zhisong", "霞鹜新致宋", "LXGW Neo ZhiSong CHS",
                "cn-fontsource-lxgw-neo-zhi-song-chs-regular-lxgw-neo-zhi-song",
                "'LXGW Neo ZhiSong CHS', 'Songti SC', 'SimSun', serif"));

        fonts.add(new FontPreset("source-han-serif", "思源宋体", "Source Han Serif SC VF",
                "cn-fontsource-source-han-serif-sc-vf-regular",
                "'Source Han Serif SC VF', 'Songti SC', 'SimSun', serif"));

        fonts.add(new FontPreset("lxgw-wenkai", "霞鹜文楷", "LXGW WenKai Screen R",
                "cn-fontsource-lxgw-wen-kai-screen-r",
                "'LXGW WenKai Screen R', 'Kaiti SC', 'KaiTi', serif"));

        fonts.add(new FontPreset("smiley-sans", "得意黑", "Smiley Sans Oblique",
                "cn-fontsource-smiley-sans-oblique-regular",
                "'Smiley Sans Oblique', 'PingFang SC', 'Microsoft YaHei', sans-serif"));

        fonts.add(new FontPreset("alimama-dakai", "阿里妈妈东方大楷", "Alimama DongFangDaKai",
                "cn-fontsource-alimama-dong-fang-da-kai-regular",
                "'Alimama DongFangDaKai', 'Kaiti SC', 'KaiTi', serif"));

        fonts.add(new FontPreset("lxgw-marker", "霞鹜漫黑", "LXGW Marker Gothic",
                "cn-fontsource-lxgw-marker-gothic-regular",
                "'LXGW Marker Gothic', 'PingFang SC', 'Microsoft YaHei', sans-serif"));

        fonts.add(new FontPreset("honglei-xingshu", "洪雷行书", "hongleixingshu",
                "cn-fontsource-hongleixingshu-regular",
                "'hongleixingshu', 'Kaiti SC', 'KaiTi', cursive"));

        fonts.add(new FontPreset("maoken-zhuyuan", "猫啃珠圆体", "MaokenZhuyuanTi",
                "cn-fontsource-maoken-zhuyuan-ti-regular",
                "'MaokenZhuyuanTi', 'PingFang SC', 'Microsoft YaHei', sans-serif"));

        fonts.add(new FontPreset("longzhu", "龙珠体", "LongZhuTi",
                "cn-fontsource-long-zhu-ti-regular",
                "'LongZhuTi', 'PingFang SC', 'Microsoft YaHei', sans-serif"));
    }

    private void load() {
        if (!Files.exists(dataFile)) {
            return;
        }
        try {
            SiteConfig loaded = objectMapper.readValue(dataFile.toFile(), SiteConfig.class);
            current = normalize(loaded);
            log.info("已从 {} 加载站点配置", dataFile);
        } catch (IOException e) {
            log.warn("读取站点配置失败，用默认值启动：{}", e.getMessage());
        }
    }

    public SiteConfig get() {
        return copyOf(current);
    }

    public List<FontPreset> listFonts() {
        return new ArrayList<>(fonts);
    }

    /**
     * 校验并保存，整体替换当前配置。
     * <p>
     * synchronized 和下面两个封面方法共用同一把锁：三处都是「读 current → 造 next → 写 current」
     * 的读-改-写，光靠 persist 里那把锁保护不了整体，并发时会互相覆盖掉对方刚写的字段。
     */
    public synchronized SiteConfig update(SiteConfig incoming) {
        if (incoming == null) {
            throw new BizException("配置内容不能为空");
        }

        String text = incoming.getIntroText() == null ? "" : incoming.getIntroText().trim();
        if (text.isEmpty()) {
            throw new BizException("首屏文字不能为空");
        }
        if (text.length() > INTRO_TEXT_MAX) {
            throw new BizException("首屏文字最多 " + INTRO_TEXT_MAX + " 个字");
        }

        String fontId = incoming.getFontId();
        if (fontId == null || fonts.stream().noneMatch(f -> fontId.equals(f.getId()))) {
            throw new BizException("请选择有效的字体");
        }

        // 从当前配置起手而不是从零 new，这样 coverUrl 会被原样带过去。
        // 这里必须读 current，不能读 incoming —— PUT 的 JSON 里压根没有 coverUrl 这个字段，
        // 用 incoming 会拿到 null，等于每存一次首屏文字就把封面抹掉。
        SiteConfig next = copyOf(current);
        next.setIntroText(text);
        next.setFontId(fontId);

        current = next;
        persist(next);
        return copyOf(next);
    }

    /**
     * 换首屏封面：落盘新图 → 写进配置 → 删掉上一张。
     * <p>
     * 顺序不能反。persist 失败只记日志、不会回滚，先删旧文件的话会留下
     * 「文件已经没了，配置还指着它」的 404。
     */
    public synchronized SiteConfig updateCover(MultipartFile file) {
        String url = fileStorageService.save(file, "封面图");
        String previous = current.getCoverUrl();

        SiteConfig next = copyOf(current);
        next.setCoverUrl(url);
        current = next;
        persist(next);

        // deleteByUrl 对非 /uploads/ 开头的路径直接 return，内置的 /cover.jpg 不会被误删
        if (!isBlank(previous)) {
            fileStorageService.deleteByUrl(previous);
        }
        return copyOf(next);
    }

    /** 恢复内置封面：清空配置并删掉上传的那张。本来就没传过时是空操作，重复调用安全 */
    public synchronized SiteConfig clearCover() {
        String previous = current.getCoverUrl();
        if (isBlank(previous)) {
            return copyOf(current);
        }

        SiteConfig next = copyOf(current);
        next.setCoverUrl("");
        current = next;
        persist(next);

        fileStorageService.deleteByUrl(previous);
        return copyOf(next);
    }

    /** 缺字段或字段为 null 时补默认值，避免手改坏了 site.json 之后整个接口返回 null */
    private SiteConfig normalize(SiteConfig raw) {
        SiteConfig defaults = new SiteConfig();
        SiteConfig fixed = new SiteConfig();
        fixed.setIntroText(raw == null || isBlank(raw.getIntroText())
                ? defaults.getIntroText() : raw.getIntroText().trim());
        fixed.setFontId(raw == null || isBlank(raw.getFontId())
                ? defaults.getFontId() : raw.getFontId());
        // raw == null 那条短路不能省：写成裸的 isBlank(raw.getCoverUrl()) 会在这里抛 NPE，
        // 而 load() 只 catch IOException，NPE 会直接把后端起不来
        fixed.setCoverUrl(raw == null || isBlank(raw.getCoverUrl())
                ? "" : raw.getCoverUrl().trim());
        return fixed;
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private SiteConfig copyOf(SiteConfig src) {
        SiteConfig copy = new SiteConfig();
        copy.setIntroText(src.getIntroText());
        copy.setFontId(src.getFontId());
        copy.setCoverUrl(src.getCoverUrl());
        return copy;
    }

    /** 全量写回；写临时文件再原子替换，避免写一半把配置写坏 */
    private synchronized void persist(SiteConfig config) {
        try {
            Path parent = dataFile.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Path tmp = dataFile.resolveSibling(dataFile.getFileName() + ".tmp");
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(tmp.toFile(), config);
            Files.move(tmp, dataFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("站点配置落盘失败", e);
        }
    }
}
