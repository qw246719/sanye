package com.sanye.controller;

import com.sanye.common.Result;
import com.sanye.model.ProvinceNote;
import com.sanye.service.ProvinceNoteService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 省份介绍：地图页点开某个省时，详情里那段可编辑的文字。
 * 省份本身是固定的（来自 china.json），能改的只有介绍。
 */
@RestController
@RequestMapping("/api")
public class ProvinceNoteController {

    private final ProvinceNoteService provinceNoteService;

    public ProvinceNoteController(ProvinceNoteService provinceNoteService) {
        this.provinceNoteService = provinceNoteService;
    }

    /** 取全部省份介绍，形如 {"四川省": "..."}。没写过的省不在里面 */
    @GetMapping("/province-notes")
    public Result<Map<String, String>> list() {
        return Result.ok(provinceNoteService.get());
    }

    /** 保存一个省的介绍。note 传空串就是清掉这个省的介绍 */
    @PutMapping("/province-note")
    public Result<ProvinceNote> update(@RequestBody ProvinceNote note) {
        return Result.ok(provinceNoteService.update(note));
    }
}
