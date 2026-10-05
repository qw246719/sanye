package com.sanye.model;

/**
 * 一个省的「设置」：一段介绍文字 + 一张背景图。
 * <p>
 * 这是存进 province-profiles.json 的**值**（省名当键，所以这儿不带 province），
 * 同时也是 {@code GET /api/province-profiles} 返回的每一项。请求体用
 * {@link ProvinceNote}（带 province，只有介绍），两个接口各管一个字段，
 * 见 {@link com.sanye.service.ProvinceProfileService}。
 * <p>
 * 两个字段都为空就代表「这个省没设置过」，Service 会把整个键删掉，
 * 而不是在文件里留一条空记录。
 */
public class ProvinceProfile {

    /** 介绍文字，可空串 */
    private String note;

    /** 背景图的 URL，形如 /uploads/xxx.jpg；没传过就是空串 */
    private String cover;

    public ProvinceProfile() {
    }

    public ProvinceProfile(String note, String cover) {
        this.note = note;
        this.cover = cover;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getCover() {
        return cover;
    }

    public void setCover(String cover) {
        this.cover = cover;
    }
}
