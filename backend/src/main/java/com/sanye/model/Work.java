package com.sanye.model;

import java.util.ArrayList;
import java.util.List;

/** 一件作品 = 一张 before + 一张 after */
public class Work {

    private Long id;
    /**
     * 作品所属省份，一件作品可以属于多个省（川藏线的照片既是四川也是西藏）。
     * 值必须和 public/china.json 里 feature 的 properties.name 一模一样（"四川省" 而不是 "四川"），
     * 地图是按这个字符串认省的。空表 = 未归类，地图上不出现。
     */
    private List<String> provinces = new ArrayList<>();
    private String title;
    /** 作者自己写的一句话描述，前台显示在照片旁边，最长 50 字，可为空 */
    private String desc;
    /** 修图前图片地址，形如 /uploads/xxx.jpg */
    private String beforeUrl;
    /** 修图后图片地址 */
    private String afterUrl;
    private long createTime;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public List<String> getProvinces() {
        return provinces;
    }

    public void setProvinces(List<String> provinces) {
        this.provinces = provinces;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDesc() {
        return desc;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }

    public String getBeforeUrl() {
        return beforeUrl;
    }

    public void setBeforeUrl(String beforeUrl) {
        this.beforeUrl = beforeUrl;
    }

    public String getAfterUrl() {
        return afterUrl;
    }

    public void setAfterUrl(String afterUrl) {
        this.afterUrl = afterUrl;
    }

    public long getCreateTime() {
        return createTime;
    }

    public void setCreateTime(long createTime) {
        this.createTime = createTime;
    }
}
