package com.sanye.controller;

import com.sanye.common.Result;
import com.sanye.model.ProvinceNote;
import com.sanye.model.ProvinceProfile;
import com.sanye.service.ProvinceProfileService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * 省份设置：地图页点开某个省时，详情里那段介绍 + 顶上那张背景图。
 * 省份本身是固定的（来自 china.json），能改的只有这两样。
 * <p>
 * 介绍和背景图各走各的接口，谁都不会把对方冲掉 —— 后台面板里那两块也是各自提交的。
 */
@RestController
@RequestMapping("/api")
public class ProvinceProfileController {

    private final ProvinceProfileService provinceProfileService;

    public ProvinceProfileController(ProvinceProfileService provinceProfileService) {
        this.provinceProfileService = provinceProfileService;
    }

    /** 取全部省份设置，形如 {"四川省": {"note": "...", "cover": "/uploads/xxx.jpg"}}。没设置过的省不在里面 */
    @GetMapping("/province-profiles")
    public Result<Map<String, ProvinceProfile>> list() {
        return Result.ok(provinceProfileService.get());
    }

    /** 保存一个省的介绍，背景图不受影响。note 传空串就是清掉这个省的介绍 */
    @PutMapping("/province-profile")
    public Result<ProvinceProfile> updateNote(@RequestBody ProvinceNote note) {
        return Result.ok(provinceProfileService.updateNote(note));
    }

    /** 上传/替换一个省的背景图，multipart：province + file。介绍不受影响 */
    @PostMapping("/province-cover")
    public Result<ProvinceProfile> uploadCover(@RequestParam("province") String province,
                                               @RequestParam("file") MultipartFile file) {
        return Result.ok(provinceProfileService.updateCover(province, file));
    }

    /** 清掉一个省的背景图（恢复成底色渐变），介绍保留 */
    @DeleteMapping("/province-cover")
    public Result<ProvinceProfile> clearCover(@RequestParam("province") String province) {
        return Result.ok(provinceProfileService.clearCover(province));
    }
}
