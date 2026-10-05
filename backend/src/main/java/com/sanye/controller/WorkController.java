package com.sanye.controller;

import com.sanye.common.Result;
import com.sanye.model.Work;
import com.sanye.model.WorkMeta;
import com.sanye.service.WorkService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
     * <p>
     * city / takenAt 同理都可选：城市是自由文本，拍摄日期是当地零点的时间戳（毫秒，
     * 前端 js/api.js 的 dateToEpoch 算的）。takenAt 用 defaultValue 而不是
     * required = false + 包装类型 —— multipart 里缺这个字段时，基本类型接不住 null。
     */
    @PostMapping("/work")
    public Result<Work> upload(@RequestParam("title") String title,
                               @RequestParam(value = "desc", required = false) String desc,
                               @RequestParam(value = "provinces", required = false) List<String> provinces,
                               @RequestParam(value = "city", required = false) String city,
                               @RequestParam(value = "takenAt", required = false, defaultValue = "0") long takenAt,
                               @RequestParam("before") MultipartFile before,
                               @RequestParam("after") MultipartFile after) {
        return Result.ok(workService.create(provinces, title, desc, city, takenAt, before, after));
    }

    /**
     * 改一件作品的拍摄城市 / 拍摄日期，只动这两个字段，别的原样留着。
     * <p>
     * 给老作品补填用的 —— 这两个字段是后加的，之前传的作品都没有，
     * 没这个接口就只能删掉重传。两个字段都是全量的：空串 / 0 = 清掉。
     */
    @PutMapping("/work/{id}")
    public Result<Work> updateMeta(@PathVariable("id") Long id, @RequestBody WorkMeta meta) {
        WorkMeta body = meta == null ? new WorkMeta() : meta;
        return Result.ok(workService.updateMeta(id, body.getCity(), body.getTakenAt()));
    }

    /** 删除作品 */
    @DeleteMapping("/work/{id}")
    public Result<Void> delete(@PathVariable("id") Long id) {
        workService.delete(id);
        return Result.ok();
    }
}
