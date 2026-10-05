package com.sanye.model;

/**
 * 首屏艺术字可选的一款字体。
 * <p>
 * {@code pkg} 为空表示不加载任何网络字体，直接用系统字体栈。
 */
public class FontPreset {

    /** 存进 SiteConfig#fontId 的值 */
    private String id;
    /** 后台下拉里显示的中文名 */
    private String name;
    /** CSS 里的 font-family 名，前端拿它去调 document.fonts.load() */
    private String family;
    /** 「中文网字计划」的 npm 包名，前端拼成 {CDN}/{pkg}/font.css 加载 */
    private String pkg;
    /** 完整 font-family 回退栈，前端直接赋值给 --font-art */
    private String stack;

    public FontPreset() {
    }

    public FontPreset(String id, String name, String family, String pkg, String stack) {
        this.id = id;
        this.name = name;
        this.family = family;
        this.pkg = pkg;
        this.stack = stack;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFamily() {
        return family;
    }

    public void setFamily(String family) {
        this.family = family;
    }

    public String getPkg() {
        return pkg;
    }

    public void setPkg(String pkg) {
        this.pkg = pkg;
    }

    public String getStack() {
        return stack;
    }

    public void setStack(String stack) {
        this.stack = stack;
    }
}
