package com.sanye.model;

/**
 * 「保存某个省介绍」的请求体（{@code PUT /api/province-profile}），只有介绍这一个字段。
 * 省名用全称（"四川省"），和 china.json 里 feature 的 properties.name 是同一套字符串
 * —— 前端拿它去对地图上的省份。
 * <p>
 * 存下来的形态是 {@link ProvinceProfile}（多了背景图），这个类只当入参用：
 * 介绍和背景图各走各的接口，PUT 上来的 JSON 里没有 cover，也正因如此改介绍不会碰到背景图。
 */
public class ProvinceNote {

    private String province;
    private String note;

    public ProvinceNote() {
    }

    public ProvinceNote(String province, String note) {
        this.province = province;
        this.note = note;
    }

    public String getProvince() {
        return province;
    }

    public void setProvince(String province) {
        this.province = province;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
