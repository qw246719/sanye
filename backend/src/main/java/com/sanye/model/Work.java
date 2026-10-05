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
    /**
     * 拍摄城市，可空（老作品都没有）。只用来数地图页「旅途印记」里的
     * 「到访城市总数」，不参与地图本身 —— 地图是省级的，china.json 里没有市级边界。
     */
    private String city;
    /**
     * 拍摄日期，当地零点的时间戳（毫秒）。0 = 没填。
     * <p>
     * 用毫秒而不是 "2026-05-14" 这种字符串，是为了和 {@link #createTime} 一致：
     * 前端的 ymd / dateSpan / formatTime 全都吃毫秒，混两种类型迟早要出事。
     */
    private long takenAt;

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

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public long getTakenAt() {
        return takenAt;
    }

    public void setTakenAt(long takenAt) {
        this.takenAt = takenAt;
    }
}
