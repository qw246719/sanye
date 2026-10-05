package com.sanye.model;

/**
 * 「改一件作品的拍摄信息」的请求体（{@code PUT /api/work/{id}}），只有城市和拍摄日期两个字段。
 * <p>
 * 用途是把老作品补上这两个字段 —— 它们当初上传时还不存在，只靠上传表单填的话，
 * 就只能删掉重传。这个类只当入参用：图片、标题、描述、省份都不在里面，
 * 所以走这个接口**不可能**碰到那几样（也不该碰，那些各有各的归属）。
 * <p>
 * 两个字段都是全量的：城市传空串 = 清掉，{@code takenAt} 传 0 = 清掉。
 */
public class WorkMeta {

    private String city;
    /** 拍摄日期，当地零点的时间戳（毫秒）。0 = 没填 */
    private long takenAt;

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
