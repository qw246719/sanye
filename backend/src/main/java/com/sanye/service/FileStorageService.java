package com.sanye.service;

import com.sanye.common.BizException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * 图片落盘：uploads/{uuid}.{ext}，对外通过 /uploads/** 暴露。
 */
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_EXT = Set.of("jpg", "jpeg", "png", "webp", "gif", "bmp");

    private final Path root;

    public FileStorageService(@Value("${app.upload-dir:./uploads}") String uploadDir) throws IOException {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    /** 保存图片，返回可直接放进 img.src 的 URL */
    public String save(MultipartFile file, String fieldName) {
        if (file == null || file.isEmpty()) {
            throw new BizException(fieldName + " 不能为空");
        }
        String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
        ext = ext == null ? "" : ext.toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXT.contains(ext)) {
            throw new BizException(fieldName + " 只支持 " + ALLOWED_EXT + " 格式");
        }
        String filename = UUID.randomUUID().toString().replace("-", "") + "." + ext;
        try {
            file.transferTo(root.resolve(filename));
        } catch (IOException e) {
            throw new BizException(fieldName + " 保存失败：" + e.getMessage());
        }
        return "/uploads/" + filename;
    }

    /** 删除文件，url 形如 /uploads/xxx.jpg；文件不存在时静默忽略 */
    public void deleteByUrl(String url) {
        if (url == null || !url.startsWith("/uploads/")) {
            return;
        }
        String filename = url.substring("/uploads/".length());
        Path target = root.resolve(filename).normalize();
        // 防止 ../ 越权删除
        if (!target.startsWith(root)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // 删不掉不影响主流程
        }
    }
}
