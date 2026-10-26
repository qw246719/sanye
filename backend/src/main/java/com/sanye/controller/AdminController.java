package com.sanye.controller;

import com.sanye.common.BizException;
import com.sanye.common.Result;
import com.sanye.model.AdminLogin;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 后台登录。密码只存后端配置（application.yml 的 app.admin-password），
 * 前端源码里没有明文 —— 校验在这边做，前端只负责把输进去的密码递过来。
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final String adminPassword;

    public AdminController(@Value("${app.admin-password:}") String adminPassword) {
        this.adminPassword = adminPassword;
    }

    /** 密码对上返回 code 0；不对抛业务异常（前端会 toast 出 msg）。 */
    @PostMapping("/login")
    public Result<Void> login(@RequestBody AdminLogin body) {
        String input = body == null ? null : body.password();
        if (adminPassword == null || adminPassword.isEmpty() || !adminPassword.equals(input)) {
            throw new BizException("密码错误");
        }
        return Result.ok();
    }
}
