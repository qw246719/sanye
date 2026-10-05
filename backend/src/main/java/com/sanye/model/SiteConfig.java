package com.sanye.model;

/** 站点配置：首屏封面图、首屏那行艺术字，以及它用哪款字体 */
public class SiteConfig {

    /** 首屏大字，后台可改 */
    private String introText = "起始";
    /** 字体预设 id，对应 FontPreset#id */
    private String fontId = "lxgw-zhisong";
    /**
     * 首屏封面图，形如 /uploads/xxx.jpg，由后台上传。
     * <p>
     * 空串表示没设过，前台回退到内置的 /cover.jpg。默认值不写死成 /cover.jpg，
     * 是为了让「没设过」和「设过又删了」是同一种状态，前台只需判空。
     */
    private String coverUrl = "";

    public String getIntroText() {
        return introText;
    }

    public void setIntroText(String introText) {
        this.introText = introText;
    }

    public String getFontId() {
        return fontId;
    }

    public void setFontId(String fontId) {
        this.fontId = fontId;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }
}
