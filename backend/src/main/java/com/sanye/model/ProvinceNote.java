package com.sanye.model;

/**
 * 一个省的介绍文字。省名用全称（"四川省"），和 china.json 里 feature 的
 * properties.name 是同一套字符串 —— 前端拿它去对地图上的省份。
 * <p>
 * 没存过的省就是「没有介绍」，不是空串：{@link com.sanye.service.ProvinceNoteService}
 * 里把介绍清空等于把这个键删掉。
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
