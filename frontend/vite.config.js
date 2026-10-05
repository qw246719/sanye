import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const entry = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
    server: {
        port: 5173,
        // 开发时把接口和图片请求转发给 SpringBoot。
        // 这样前端代码里一直用相对路径（/api/...、/uploads/...），
        // 既不用配 CORS，也不用把后端地址写死在 JS 里。
        proxy: {
            '/api': { target: 'http://localhost:8080', changeOrigin: true },
            '/uploads': { target: 'http://localhost:8080', changeOrigin: true },
        },
    },
    build: {
        outDir: 'dist',
        // 四个页面都是入口；不写这里的话 build 只会打包 index.html
        // ⚠️ 这一条只在 build 时才咬人：漏了新页面，dev server 照常能开，
        //    只有 dist 里少一页 —— 上线才发现。
        rollupOptions: {
            input: {
                index: entry('./index.html'),
                admin: entry('./admin.html'),
                map: entry('./map.html'),
                timeline: entry('./timeline.html'),
            },
        },
    },
});
