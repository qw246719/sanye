package com.sanye.controller;

import com.sanye.common.Result;
import com.sanye.model.FontPreset;
import com.sanye.model.SiteConfig;
import com.sanye.service.SiteConfigService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SiteConfigController {

    private final SiteConfigService siteConfigService;

    public SiteConfigController(SiteConfigService siteConfigService) {
        this.siteConfigService = siteConfigService;
    }

    /** 取站点配置（首屏封面 + 文字 + 字体） */
    @GetMapping("/site-config")
    public Result<SiteConfig> get() {
        return Result.ok(siteConfigService.get());
    }

    /** 保存站点配置。注意这里改的是文字和字体，封面走下面那个单独的接口 */
    @PutMapping("/site-config")
    public Result<SiteConfig> update(@RequestBody SiteConfig config) {
        return Result.ok(siteConfigService.update(config));
    }

    /** 上传/替换首屏封面，单张图，字段名 file */
    @PostMapping("/site-config/cover")
    public Result<SiteConfig> uploadCover(@RequestParam("file") MultipartFile file) {
        return Result.ok(siteConfigService.updateCover(file));
    }

    /** 恢复内置封面，并把上传的那张删掉 */
    @DeleteMapping("/site-config/cover")
    public Result<SiteConfig> clearCover() {
        return Result.ok(siteConfigService.clearCover());
    }

    /** 可选的艺术字体列表，后台下拉用 */
    @GetMapping("/fonts")
    public Result<List<FontPreset>> fonts() {
        return Result.ok(siteConfigService.listFonts());
    }
}
