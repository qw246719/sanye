package com.sanye.controller;

import com.sanye.common.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 前后端分离后，后端不再托管页面，
 * 根路径直接给一份接口清单，避免开发者打开 8080 看到 404 一头雾水。
 */
@RestController
public class RootController {

    @GetMapping("/")
    public Result<Map<String, String>> index() {
        Map<String, String> info = new LinkedHashMap<>();
        info.put("service", "sanye-showcase-backend");
        info.put("note", "这里只是接口服务，页面在前端工程里");
        info.put("frontend", "http://localhost:5173（在 frontend/ 下执行 npm run dev）");
        info.put("works", "GET  /api/works");
        info.put("upload", "POST /api/work  (multipart: title, provinces(可重复/可空), before, after)");
        info.put("delete", "DELETE /api/work/{id}");
        info.put("images", "GET  /uploads/{filename}");
        info.put("siteConfig", "GET  /api/site-config  /  PUT /api/site-config  (json: introText, fontId)");
        info.put("cover", "POST /api/site-config/cover  (multipart: file)  /  DELETE /api/site-config/cover");
        info.put("fonts", "GET  /api/fonts  (首屏艺术字体预设，后台下拉用)");
        info.put("provinceNotes", "GET  /api/province-notes  /  PUT /api/province-note  (json: province, note)");
        return Result.ok(info);
    }
}
