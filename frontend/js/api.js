/* ============================================================
   公共工具：接口请求 / 图片地址 / 提示条 / 转义
   ============================================================ */

/**
 * 后端地址。
 *
 * 默认留空 = 用相对路径，请求交给代理转发：
 *   - 开发：Vite 开发服务器代理到 localhost:8080（见 vite.config.js）
 *   - 生产：Nginx 把 /api 和 /uploads 反代到后端
 *
 * 如果前后端部署在不同域名（比如前端在 CDN、后端在 api.xxx.com），
 * 就在 frontend/.env.local 里写一行：VITE_API_BASE=https://api.xxx.com
 */
const API_BASE = import.meta.env.VITE_API_BASE || '';

/** 后端返回的图片地址是 /uploads/xxx.png，这里补成浏览器能直接用的完整地址 */
export function assetUrl(path) {
    if (!path) {
        return '';
    }
    return /^https?:\/\//.test(path) ? path : API_BASE + path;
}

/**
 * 请求后端，自动拆 Result 包装：{code,msg,data}
 * 业务码非 0 或 HTTP 异常都抛 Error，交给调用方 catch
 */
async function request(url, options = {}) {
    let res;
    try {
        res = await fetch(API_BASE + url, options);
    } catch (e) {
        throw new Error('连不上服务器（后端启动了吗？）');
    }
    if (!res.ok) {
        throw new Error(`请求失败（HTTP ${res.status}）`);
    }
    const json = await res.json();
    if (json.code !== 0) {
        throw new Error(json.msg || '请求失败');
    }
    return json.data;
}

/** GET /api/works —— 全部作品，新的在前。按省份分组是前端自己做的 */
export function fetchWorks() {
    return request('/api/works');
}

/** 描述字数上限，和后端 WorkService.DESC_MAX 保持一致 */
export const DESC_MAX = 50;

/** 城市名长度上限，和后端 WorkService.CITY_MAX 保持一致 */
export const CITY_MAX = 20;

/**
 * POST /api/work —— 两张图 + 标题 + 一句话描述 + 省份（可多选、可为空）+ 拍摄信息
 *
 * provinces 用重复字段传，Spring 那边收成 List<String>；一个省都不选时
 * 就一个都不 append，后端那个参数是 required = false，会当空表处理。
 *
 * city / takenAt 都可选：takenAt 是 dateToEpoch 算出来的毫秒数，没填传 0。
 */
export function uploadWork({ title, desc, provinces, city, takenAt, beforeFile, afterFile }) {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('desc', desc || '');
    (provinces || []).forEach(name => fd.append('provinces', name));
    fd.append('city', city || '');
    fd.append('takenAt', String(takenAt || 0));
    fd.append('before', beforeFile);
    fd.append('after', afterFile);
    return request('/api/work', { method: 'POST', body: fd });
}

/**
 * PUT /api/work/{id} —— 改一件作品的拍摄城市和拍摄日期，别的字段不动。
 * 给老作品补填用：这两个字段是后加的，之前传的作品都没有。
 * 两个字段都是全量的，传空串 / 0 就是清掉。
 */
export function updateWork(id, { city, takenAt }) {
    return request(`/api/work/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: city || '', takenAt: takenAt || 0 }),
    });
}

/** DELETE /api/work/{id} */
export function removeWork(id) {
    return request(`/api/work/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * '2026-05-14'（<input type="date"> 的值）-> 当地零点的时间戳。空串 -> 0。
 *
 * ⚠️ 不能用 new Date('2026-05-14')：那种「只有日期」的字符串按 ISO 当 UTC 解析，
 * 东八区算出来是当天早上 8 点，不是零点。后端存的必须是当地零点，
 * 否则地图页那个「旅途天数」（max - min 除以一天的毫秒）会无缘无故多出一天。
 * 拆成数字再 new Date(y, m-1, d) 才是当地时间的零点。
 */
export function dateToEpoch(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || '').trim());
    if (!m) {
        return 0;
    }
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

/** dateToEpoch 的反向：毫秒 -> '2026-05-14'，给 <input type="date"> 当 value 用。0 -> 空串 */
export function epochToDate(ts) {
    if (!ts) {
        return '';
    }
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** GET /api/site-config —— 首屏封面、文字、字体 */
export function fetchSiteConfig() {
    return request('/api/site-config');
}

/** POST /api/site-config/cover —— 上传/替换首屏封面，单张图 */
export function uploadCover(file) {
    const fd = new FormData();
    fd.append('file', file);
    return request('/api/site-config/cover', { method: 'POST', body: fd });
}

/** DELETE /api/site-config/cover —— 恢复内置封面 */
export function clearCover() {
    return request('/api/site-config/cover', { method: 'DELETE' });
}

/** 省份介绍字数上限，和后端 ProvinceProfileService.NOTE_MAX 保持一致 */
export const NOTE_MAX = 200;

/**
 * GET /api/province-profiles —— 全部省份设置，形如
 * { "四川省": { "note": "...", "cover": "/uploads/xxx.jpg" } }
 *
 * 没设置过的省不在这个表里。地图页拿 note 填详情里那段文字、拿 cover 当详情顶上的背景图。
 * 两个字段都可能是空串（只写了介绍、或只传了图）。
 */
export function fetchProvinceProfiles() {
    return request('/api/province-profiles');
}

/**
 * PUT /api/province-profile —— 保存一个省的介绍；note 传空串就是清掉。
 * 只动介绍这一个字段，这个省已经传过的背景图不受影响（后端那边是分开写的）。
 */
export function saveProvinceNote(province, note) {
    return request('/api/province-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ province, note: note || '' }),
    });
}

/**
 * POST /api/province-cover —— 上传/替换一个省的背景图。
 * province 走表单字段（不是 URL），中文省名不用编码。
 */
export function uploadProvinceCover(province, file) {
    const fd = new FormData();
    fd.append('province', province);
    fd.append('file', file);
    return request('/api/province-cover', { method: 'POST', body: fd });
}

/**
 * DELETE /api/province-cover?province=… —— 清掉背景图（恢复成底色渐变），介绍保留。
 *
 * 省名必须 encodeURIComponent：这里是拼进 URL 的，中文直接拼进去
 * 有些环境会当成非法字符，或者按错的编码解出另一个省名。
 */
export function clearProvinceCover(province) {
    return request(`/api/province-cover?province=${encodeURIComponent(province)}`, { method: 'DELETE' });
}

/** 顶部提示条 */
export function toast(message, type = 'ok') {
    let box = document.querySelector('.toast-box');
    if (!box) {
        box = document.createElement('div');
        box.className = 'toast-box';
        document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), 2600);
}

/** 渲染用户输入前先转义，防止标题里的尖括号破坏结构 */
export function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

/** 时间戳 -> 2026-09-25 21:30 */
export function formatTime(ts) {
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
