package com.sanye.controller;

import com.sanye.common.Result;
import com.sanye.model.Work;
import com.sanye.service.WorkService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
public class WorkController {

    private final WorkService workService;

    public WorkController(WorkService workService) {
        this.workService = workService;
    }

    /** 作品列表，新的在前。按省份分组是前端的事 */
    @GetMapping("/works")
    public Result<List<Work>> list() {
        return Result.ok(workService.list());
    }

    /**
     * 上传两张图片（before/after）新建作品，desc 是可选的一句话描述。
     * provinces 用重复参数传（provinces=四川省&provinces=西藏自治区），
     * 一个都不勾时这个参数整个不存在，所以必须 required = false —— 未归类的作品也要能传。
     */
    @PostMapping("/work")
    public Result<Work> upload(@RequestParam("title") String title,
                               @RequestParam(value = "desc", required = false) String desc,
                               @RequestParam(value = "provinces", required = false) List<String> provinces,
                               @RequestParam("before") MultipartFile before,
                               @RequestParam("after") MultipartFile after) {
        return Result.ok(workService.create(provinces, title, desc, before, after));
    }

    /** 删除作品 */
    @DeleteMapping("/work/{id}")
    public Result<Void> delete(@PathVariable("id") Long id) {
        workService.delete(id);
        return Result.ok();
    }
}
