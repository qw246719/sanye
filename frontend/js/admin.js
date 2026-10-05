/* ============================================================
   后台管理页
   - 表单提交：FormData 上传两张图 -> POST /api/work
   - 列表渲染：GET /api/works
   - 改作品的拍摄城市 / 日期：PUT /api/work/{id}（列表里每行那个「编辑」）
   - 删除：DELETE /api/work/{id}
   - 首页封面：GET /api/site-config、POST/DELETE /api/site-config/cover
   - 省份设置：GET /api/province-profiles、PUT /api/province-profile、
     POST/DELETE /api/province-cover（一个省的背景图 + 介绍，两块各自提交）
   ============================================================ */

import {
    fetchSiteConfig, fetchWorks, uploadWork, updateWork, removeWork,
    uploadCover, clearCover,
    fetchProvinceProfiles, saveProvinceNote, uploadProvinceCover, clearProvinceCover,
    toast, escapeHtml, formatTime, assetUrl,
    dateToEpoch, epochToDate, DESC_MAX, CITY_MAX, NOTE_MAX
} from './api.js';
import { PROVINCES } from './provinces.js';

const formEl = document.getElementById('uploadForm');
const titleEl = document.getElementById('title');
const descEl = document.getElementById('desc');
const descCountEl = document.getElementById('descCount');
const cityEl = document.getElementById('city');
const takenAtEl = document.getElementById('takenAt');
const chipsEl = document.getElementById('provinceChips');
const provCountEl = document.getElementById('provCount');
const beforeEl = document.getElementById('beforeFile');
const afterEl = document.getElementById('afterFile');
const beforePreviewEl = document.getElementById('beforePreview');
const afterPreviewEl = document.getElementById('afterPreview');
const submitBtn = document.getElementById('submitBtn');
const listEl = document.getElementById('adminList');
const countEl = document.getElementById('count');
const coverFileEl = document.getElementById('coverFile');
const coverPreviewEl = document.getElementById('coverPreview');
const coverSubmitBtn = document.getElementById('coverSubmit');
const coverResetBtn = document.getElementById('coverReset');
const profileProvinceEl = document.getElementById('profileProvince');
const noteTextEl = document.getElementById('noteText');
const noteCountEl = document.getElementById('noteCount');
const noteSubmitBtn = document.getElementById('noteSubmit');
const noteStateEl = document.getElementById('noteState');
const provinceCoverFileEl = document.getElementById('provinceCoverFile');
const provinceCoverPreviewEl = document.getElementById('provinceCoverPreview');
const provinceCoverSubmitBtn = document.getElementById('provinceCoverSubmit');
const provinceCoverResetBtn = document.getElementById('provinceCoverReset');
const provinceCoverStateEl = document.getElementById('provinceCoverState');

/** 省份设置面板里预览框空着时显示的话。和 renderProvinceCover 里那句保持一致 */
const PROVINCE_COVER_EMPTY = '没传背景图，地图页走深色渐变';

let works = [];
/** 当前的封面地址，空串 = 用的内置 /cover.jpg */
let coverUrl = '';
/** 省名 -> { note, cover }。保存成功后就地更新，不用重新拉一遍 */
let profiles = {};
/** 预览图的 objectURL，选择新文件时释放旧的，避免内存泄漏 */
let previewUrls = {};

// 事件只绑一次（init 可能因重试被再次调用）
bindEvents();
init();

async function init() {
    renderListSkeleton();
    updateDescCount();
    // 这两块各自带 catch，谁失败也只影响自己那块面板
    loadCover();
    loadProfiles();
    try {
        setWorks((await fetchWorks()) || []);
    } catch (err) {
        listEl.innerHTML = `<div class="state"><div class="state__title">加载失败</div>
            <div>${escapeHtml(err.message)}</div>
            <button class="btn" id="retryBtn">重试</button></div>`;
        document.getElementById('retryBtn').addEventListener('click', init);
    }
}

/* ---------------- 表单 ---------------- */

/* ---------------- 省份 ---------------- */

/* 省份清单是本地常量（provinces.js），不依赖接口，所以在这儿渲染一次就够。
   跟着 init() 走的话，接口一失败点「重试」就会把用户已经勾好的省份清掉 */
function renderProvinceChips() {
    chipsEl.innerHTML = PROVINCES.map(name => `
        <button class="chip" type="button" data-province="${escapeHtml(name)}" aria-pressed="false">${escapeHtml(name)}</button>
    `).join('');
}

/** 选中的省份。状态只有 aria-pressed 一份，读屏读到的和提交的永远是一致的 */
function selectedProvinces() {
    return Array.from(chipsEl.querySelectorAll('.chip[aria-pressed="true"]'))
        .map(chip => chip.dataset.province);
}

function updateProvCount() {
    const n = selectedProvinces().length;
    provCountEl.textContent = n ? `已选 ${n} 个` : '未归类';
    // 复用 .field__count.is-full 那点变色：那边是「快写满了」，这边是「已经选上了」
    provCountEl.classList.toggle('is-full', n > 0);
}

function bindEvents() {
    beforeEl.addEventListener('change', () => showPreview(beforeEl, beforePreviewEl, 'before'));
    afterEl.addEventListener('change', () => showPreview(afterEl, afterPreviewEl, 'after'));
    descEl.addEventListener('input', updateDescCount);
    formEl.addEventListener('submit', onSubmit);

    /* 整块绑一次，不给 34 个按钮各绑一个 */
    chipsEl.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) {
            return;
        }
        const on = chip.getAttribute('aria-pressed') === 'true';
        chip.setAttribute('aria-pressed', on ? 'false' : 'true');
        updateProvCount();
    });
    renderProvinceChips();
    updateProvCount();

    // 封面这块面板是写死在 html 里的，不像作品列表那样每次重建，
    // 所以监听跟着上面那批一起只绑一次
    coverFileEl.addEventListener('change', () => showPreview(coverFileEl, coverPreviewEl, 'cover'));
    coverSubmitBtn.addEventListener('click', onCoverSubmit);
    coverResetBtn.addEventListener('click', onCoverReset);

    /* 日期框的上限是「今天」。写死在 HTML 里的话过一天就过期，
       所以起手时按当前时间算一次 —— 后端对未来的日期是当没填处理的，
       不如在浏览器这一层就让人选不出来 */
    takenAtEl.max = epochToDate(Date.now());

    // 省份设置同理：下拉的选项是本地常量，绑一次就够
    profileProvinceEl.addEventListener('change', onProfileProvinceChange);
    noteTextEl.addEventListener('input', updateNoteCount);
    noteSubmitBtn.addEventListener('click', onNoteSubmit);
    provinceCoverFileEl.addEventListener('change',
        () => showPreview(provinceCoverFileEl, provinceCoverPreviewEl, 'provinceCover', PROVINCE_COVER_EMPTY));
    provinceCoverSubmitBtn.addEventListener('click', onProvinceCoverSubmit);
    provinceCoverResetBtn.addEventListener('click', onProvinceCoverReset);
    renderProvinceOptions();
    updateNoteCount();
}

/* maxlength 已经拦住超长输入了，这里只是让人看得见还剩多少字 */
function updateDescCount() {
    const n = descEl.value.length;
    descCountEl.textContent = `${n} / ${DESC_MAX}`;
    descCountEl.classList.toggle('is-full', n >= DESC_MAX);
}

/**
 * 选中文件后立刻本地预览。
 *
 * emptyText 是「一个文件都没选」时框里那行字。默认「未选择」是给上传表单那两格用的；
 * 省份背景图那格要说明白「没图会怎样」，所以由调用方传一句自己的话进来。
 */
function showPreview(input, box, key, emptyText = '未选择') {
    const file = input.files && input.files[0];
    if (previewUrls[key]) {
        URL.revokeObjectURL(previewUrls[key]);
        delete previewUrls[key];
    }
    if (!file) {
        box.textContent = emptyText;
        return;
    }
    const url = URL.createObjectURL(file);
    previewUrls[key] = url;
    box.innerHTML = `<img src="${url}" alt="预览">`;
}

async function onSubmit(e) {
    e.preventDefault();

    const title = titleEl.value.trim();
    const desc = descEl.value.trim();
    const provinces = selectedProvinces();
    const city = cityEl.value.trim();
    const takenAt = dateToEpoch(takenAtEl.value);
    const beforeFile = beforeEl.files[0];
    const afterFile = afterEl.files[0];

    // 前端先做一轮校验，减少无意义的请求。
    // 省份不在校验之列：一个都不勾是合法状态（未归类），不是漏填
    if (!title) {
        toast('请填写作品标题', 'err');
        titleEl.focus();
        return;
    }
    if (!beforeFile || !afterFile) {
        toast('Before 和 After 两张图都要选', 'err');
        return;
    }
    if (beforeFile.size > 10 * 1024 * 1024 || afterFile.size > 10 * 1024 * 1024) {
        toast('单张图片不能超过 10MB', 'err');
        return;
    }

    // 城市名超长交给后端报错也行，但那要等两张图都传完才知道，白等一趟
    if (city.length > CITY_MAX) {
        toast(`城市名最多 ${CITY_MAX} 个字`, 'err');
        cityEl.focus();
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '上传中…';
    try {
        const work = await uploadWork({ title, desc, provinces, city, takenAt, beforeFile, afterFile });
        toast('上传成功', 'ok');
        resetForm();
        works.unshift(work);
        renderList();
    } catch (err) {
        toast(err.message, 'err');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '提交作品';
    }
}

function resetForm() {
    formEl.reset();
    /* ⚠️ formEl.reset() 清不掉上面那排省份按钮：chip 不是表单控件
       （没有 name，也不是 input/select/textarea），reset 会静默跳过它。
       不手动清的话，下一次上传会悄悄沿用上一次勾的省份 */
    chipsEl.querySelectorAll('.chip[aria-pressed="true"]')
        .forEach(chip => chip.setAttribute('aria-pressed', 'false'));
    updateProvCount();

    ['before', 'after'].forEach(key => {
        if (previewUrls[key]) {
            URL.revokeObjectURL(previewUrls[key]);
            delete previewUrls[key];
        }
    });
    beforePreviewEl.textContent = '未选择';
    afterPreviewEl.textContent = '未选择';
    updateDescCount();
}

/* ---------------- 首页封面 ---------------- */

/*
 * 故意不并进 init() 里那个 Promise.all：那个一旦失败就整页渲染「加载失败」，
 * 封面接口偶发失败不该连累作品列表。这里失败只让封面面板自己说明情况。
 */
function loadCover() {
    fetchSiteConfig()
        .then(cfg => renderCover(cfg && cfg.coverUrl))
        .catch(err => {
            coverPreviewEl.textContent = `读取失败：${err.message}`;
        });
}

/* 预览的是「当前生效的那张」：没传过自定义封面就是内置的 /cover.jpg。
   内置那张在前端目录里，不能套 assetUrl —— 前后端分域名部署时会被指到后端域名上。 */
function renderCover(url) {
    coverUrl = url || '';
    coverPreviewEl.innerHTML =
        `<img src="${escapeHtml(assetUrl(coverUrl) || (import.meta.env.BASE_URL + 'cover.jpg'))}" alt="当前封面预览" decoding="async">`;
    coverResetBtn.hidden = !coverUrl;
}

async function onCoverSubmit() {
    const file = coverFileEl.files && coverFileEl.files[0];
    if (!file) {
        toast('请先选一张图片', 'err');
        coverFileEl.focus();
        return;
    }
    // 和后端 multipart 的上限对齐，先在本地拦一道，省一次往返
    if (file.size > 10 * 1024 * 1024) {
        toast('单张图片不能超过 10MB', 'err');
        return;
    }

    coverSubmitBtn.disabled = true;
    coverSubmitBtn.textContent = '上传中…';
    try {
        const cfg = await uploadCover(file);
        renderCover(cfg && cfg.coverUrl);
        toast('封面已更新', 'ok');
        resetCoverInput();
    } catch (err) {
        toast(err.message, 'err');
    } finally {
        coverSubmitBtn.disabled = false;
        coverSubmitBtn.textContent = '上传封面';
    }
}

async function onCoverReset() {
    if (!confirm('确定恢复成内置封面吗？上传的那张图会被一并删除，不可恢复。')) {
        return;
    }

    coverResetBtn.disabled = true;
    try {
        const cfg = await clearCover();
        renderCover(cfg && cfg.coverUrl);
        resetCoverInput();
        toast('已恢复内置封面', 'ok');
    } catch (err) {
        toast(err.message, 'err');
    } finally {
        coverResetBtn.disabled = false;
    }
}

/* 清掉 input 里选过的文件，否则改完再点一次会把同一张重复传一遍。
   此时预览已经换成服务器返回的地址，本地那个 objectURL 可以释放了 */
function resetCoverInput() {
    coverFileEl.value = '';
    if (previewUrls.cover) {
        URL.revokeObjectURL(previewUrls.cover);
        delete previewUrls.cover;
    }
}

/* ---------------- 省份设置 ---------------- */

/*
 * 「省名 -> {介绍, 背景图}」的一张表，后台一次只编辑一个省。
 * 省份本身改不了：它跟着 public/china.json 里的 feature 名走，
 * 这里能做的只是给某个省配这两样。
 *
 * 两块内容各自提交、各走各的接口 —— 保存介绍不会碰到背景图，换背景图也不会碰到介绍。
 * 两个接口返回的都是这个省保存后的完整记录，所以本地这份表直接拿返回值覆盖就行，
 * 不用自己拼「哪个字段该留、哪个该清」。
 */

/** 正在编辑哪个省。用来判断切走的时候有没有没存的改动 */
let editingProvince = '';

/* 下拉的选项和上面那排 chip 一样是本地常量，不依赖接口 ——
   跟着 loadProfiles() 走的话，这个接口一失败，这个下拉就是空的 */
function renderProvinceOptions() {
    profileProvinceEl.innerHTML = PROVINCES
        .map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
        .join('');
}

/* 单独一趟、单独 catch：省份设置拿不到只让这块面板自己说明情况，
   没理由连累作品列表 */
function loadProfiles() {
    fetchProvinceProfiles()
        .then(table => {
            profiles = table || {};
            loadProfileFor(profileProvinceEl.value);
        })
        .catch(err => {
            noteStateEl.textContent = `读取失败：${err.message}`;
        });
}

/** 用服务器返回的记录覆盖本地这一条。两个字段都空 = 后端把这个键删了，本地跟着删 */
function setProfile(province, profile) {
    const note = (profile && profile.note) || '';
    const cover = (profile && profile.cover) || '';
    if (!note && !cover) {
        delete profiles[province];
    } else {
        profiles[province] = { note, cover };
    }
}

/** 换省就是换一份设置。没设置过的省两样都是空的，不给任何默认文案 */
function loadProfileFor(province) {
    editingProvince = province;
    const profile = profiles[province] || {};
    noteTextEl.value = profile.note || '';
    /* 先渲染服务器那张再清 input：清的时候会 revoke 掉上一张的 objectURL，
       预览里要是还挂着它就是个破图。上一个省「选了图还没传」的那张也得清掉，
       否则会不小心传到这个省头上 */
    renderProvinceCover(profile.cover || '');
    resetProvinceCoverInput();
    noteStateEl.textContent = '';
    provinceCoverStateEl.textContent = '';
    updateNoteCount();
}

function onProfileProvinceChange() {
    const next = profileProvinceEl.value;
    /* 切走会把没保存的改动丢掉，拦一下。和删除一样用 confirm ——
       这一页别处也是这么问的，不做一套自己的弹窗。
       光是选了图还没点上传也算改动：那个文件同样会被 switch 清掉 */
    const dirty = noteTextEl.value.trim() !== (((profiles[editingProvince] || {}).note) || '')
        || !!(provinceCoverFileEl.files && provinceCoverFileEl.files[0]);
    if (dirty && !confirm('这个省的设置还没保存，切换过去就丢了。继续吗？')) {
        profileProvinceEl.value = editingProvince;
        return;
    }
    loadProfileFor(next);
}

/* 预览的是「当前生效的那张」。没传过就不是一张图，而是一句说明 ——
   map.js 那边这种省走的是 .detail__hero 的深色渐变，不自动兜一张最新作品上去 */
function renderProvinceCover(url) {
    const hasCover = !!url;
    provinceCoverPreviewEl.innerHTML = hasCover
        ? `<img src="${escapeHtml(assetUrl(url))}" alt="背景图预览" decoding="async">`
        : PROVINCE_COVER_EMPTY;
    provinceCoverResetBtn.hidden = !hasCover;
}

async function onProvinceCoverSubmit() {
    const province = profileProvinceEl.value;
    if (!province) {
        return;
    }
    const file = provinceCoverFileEl.files && provinceCoverFileEl.files[0];
    if (!file) {
        toast('请先选一张图片', 'err');
        provinceCoverFileEl.focus();
        return;
    }
    // 和后端 multipart 的上限对齐，先在本地拦一道，省一次往返
    if (file.size > 10 * 1024 * 1024) {
        toast('单张图片不能超过 10MB', 'err');
        return;
    }

    provinceCoverSubmitBtn.disabled = true;
    provinceCoverSubmitBtn.textContent = '上传中…';
    try {
        const saved = await uploadProvinceCover(province, file);
        setProfile(province, saved);
        // 先渲染服务器返回的地址再清 input：清的时候会 revoke 掉本地那张的 objectURL。
        // input 也必须清，否则改完再点一次会把同一张重复传一遍
        renderProvinceCover((saved && saved.cover) || '');
        resetProvinceCoverInput();
        provinceCoverStateEl.textContent = '已保存';
        toast('背景图已更新', 'ok');
    } catch (err) {
        toast(err.message, 'err');
    } finally {
        provinceCoverSubmitBtn.disabled = false;
        provinceCoverSubmitBtn.textContent = '上传背景图';
    }
}

async function onProvinceCoverReset() {
    const province = profileProvinceEl.value;
    if (!province) {
        return;
    }
    if (!confirm(`确定清掉「${province}」的背景图吗？那张图会被一并删除，不可恢复。介绍不受影响。`)) {
        return;
    }

    provinceCoverResetBtn.disabled = true;
    try {
        const saved = await clearProvinceCover(province);
        setProfile(province, saved);
        renderProvinceCover((saved && saved.cover) || '');
        resetProvinceCoverInput();
        provinceCoverStateEl.textContent = '已恢复默认';
        toast('已恢复成底色渐变', 'ok');
    } catch (err) {
        toast(err.message, 'err');
    } finally {
        provinceCoverResetBtn.disabled = false;
    }
}

/* 清掉 input 里选过的文件。此时预览已经换成服务器返回的地址，本地那个 objectURL 可以释放了 */
function resetProvinceCoverInput() {
    provinceCoverFileEl.value = '';
    if (previewUrls.provinceCover) {
        URL.revokeObjectURL(previewUrls.provinceCover);
        delete previewUrls.provinceCover;
    }
}

function updateNoteCount() {
    const n = noteTextEl.value.length;
    noteCountEl.textContent = `${n} / ${NOTE_MAX}`;
    // 同一个 .field__count.is-full，那边是「快写满了」，这边意思一样
    noteCountEl.classList.toggle('is-full', n >= NOTE_MAX);
}

async function onNoteSubmit() {
    const province = profileProvinceEl.value;
    if (!province) {
        return;
    }
    const note = noteTextEl.value.trim();

    noteSubmitBtn.disabled = true;
    noteSubmitBtn.textContent = '保存中…';
    try {
        const saved = await saveProvinceNote(province, note);
        setProfile(province, saved);
        /* 存进去的是 trim 过的，回写一份，免得本地留着的和服务器上的差一个空格，
           下次切回来又变成「有改动」 */
        noteTextEl.value = (saved && saved.note) || '';
        updateNoteCount();
        noteStateEl.textContent = note ? '已保存' : '已清空';
        toast(note ? '介绍已保存' : '介绍已清空', 'ok');
    } catch (err) {
        toast(err.message, 'err');
    } finally {
        noteSubmitBtn.disabled = false;
        noteSubmitBtn.textContent = '保存介绍';
    }
}

/* ---------------- 列表 ---------------- */

function setWorks(list) {
    works = list;
    renderList();
}

function renderList() {
    countEl.textContent = works.length ? `（共 ${works.length} 件）` : '';

    if (!works.length) {
        listEl.innerHTML = `<div class="state"><div class="state__title">还没有作品</div>
            <div>用左边的表单上传第一件作品吧</div></div>`;
        return;
    }

    listEl.innerHTML = works.map(w => `
        <div class="admin-item" data-id="${w.id}">
            <div class="admin-item__thumb">
                <!-- 列表每次增删都会整体重建，这里不用 lazy，否则缩略图会闪一下空白 -->
                <img src="${escapeHtml(assetUrl(w.beforeUrl))}" alt="${escapeHtml(w.title)} 修图前" decoding="async">
            </div>
            <div>
                <h4 class="admin-item__title" title="${escapeHtml(w.title)}">${escapeHtml(w.title)}</h4>
                ${w.desc ? `<p class="admin-item__desc">${escapeHtml(w.desc)}</p>` : ''}
                <div class="admin-item__sub">
                    <span>${escapeHtml(provinceLabel(w))}</span>
                    ${metaLabel(w)}
                    <span>${formatTime(w.createTime)}</span>
                    <span>#${w.id}</span>
                </div>
            </div>
            <div class="admin-item__actions">
                <button class="btn btn--sm" type="button" data-edit="${w.id}"
                        aria-expanded="false" aria-controls="edit-${w.id}">编辑</button>
                <button class="btn btn--sm btn--danger" type="button" data-delete="${w.id}">删除</button>
            </div>
            <!-- 展开的补填块。占满整行（见 admin.css 里 .admin-item__edit 那段），
                 自带 display 所以 [hidden] 属性压不过它，那边补了一条 [hidden] 规则 -->
            <form class="admin-item__edit" id="edit-${w.id}" data-edit-form hidden>
                <div class="field">
                    <label for="city-${w.id}">拍摄城市</label>
                    <input class="input" type="text" id="city-${w.id}" name="city"
                           maxlength="${CITY_MAX}" placeholder="例如：杭州"
                           value="${escapeHtml(w.city || '')}">
                </div>
                <div class="field">
                    <label for="taken-${w.id}">拍摄日期</label>
                    <input class="input" type="date" id="taken-${w.id}" name="takenAt"
                           max="${todayStr()}" value="${epochToDate(w.takenAt)}">
                </div>
                <div class="admin-item__edit-actions">
                    <button class="btn btn--sm btn--primary" type="submit">保存</button>
                    <button class="btn btn--sm" type="button" data-cancel>取消</button>
                </div>
            </form>
        </div>
    `).join('');

    listEl.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => onDelete(Number(btn.dataset.delete), btn));
    });
    listEl.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => toggleEdit(Number(btn.dataset.edit)));
    });
    listEl.querySelectorAll('.admin-item__edit').forEach(editForm => {
        editForm.addEventListener('submit', e => {
            e.preventDefault();
            onMetaSubmit(Number(editForm.closest('.admin-item').dataset.id), editForm);
        });
        editForm.querySelector('[data-cancel]').addEventListener('click', () => closeEdit(editForm));
    });
}

/**
 * 列表里那行「城市 · 2026.05.14」。两个都没填就一个字都不出现 ——
 * 老作品全都没有，每行都挂一句「未填写」只会把这一行挤满。
 */
function metaLabel(w) {
    const parts = [];
    if (w.city) {
        parts.push(escapeHtml(w.city));
    }
    if (w.takenAt) {
        parts.push(escapeHtml(epochToDate(w.takenAt).replace(/-/g, '.')));
    }
    return parts.length ? `<span>${parts.join(' · ')}</span>` : '';
}

function todayStr() {
    return epochToDate(Date.now());
}

/* ---------------- 编辑（补填城市 / 拍摄日期） ---------------- */

/* 同一时刻只开一行：两行都摊着的时候，列表一眼看不出在改哪件。
   打开前先把已经开着的那行收掉，那行里没保存的输入跟着丢 —— 和省份设置
   切省时的处理一致，那边也是直接丢，不问 */
function toggleEdit(id) {
    const item = listEl.querySelector(`.admin-item[data-id="${id}"]`);
    const form = item && item.querySelector('.admin-item__edit');
    if (!form) {
        return;
    }
    const willOpen = form.hidden;
    closeEdit();
    if (!willOpen) {
        return;
    }
    form.hidden = false;
    item.querySelector('[data-edit]').setAttribute('aria-expanded', 'true');
    // 打开就把光标放进第一个框：这一行的用途就是补填，进来就要打字
    form.querySelector('input[name="city"]').focus();
}

/** 收起某一行。不传就把所有开着的都收掉 */
function closeEdit(form) {
    const forms = form ? [form] : Array.from(listEl.querySelectorAll('.admin-item__edit'));
    forms.forEach(el => {
        if (el.hidden) {
            return;
        }
        el.hidden = true;
        el.closest('.admin-item').querySelector('[data-edit]').setAttribute('aria-expanded', 'false');
    });
}

async function onMetaSubmit(id, form) {
    const city = form.querySelector('input[name="city"]').value.trim();
    const takenAt = dateToEpoch(form.querySelector('input[name="takenAt"]').value);
    if (city.length > CITY_MAX) {
        toast(`城市名最多 ${CITY_MAX} 个字`, 'err');
        return;
    }

    const saveBtn = form.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中…';
    try {
        /* 用返回值就地更新那条。后端只动这两个字段，回来的是整件作品，
           所以别的字段照抄服务器那份，本地不用自己拼 */
        const saved = await updateWork(id, { city, takenAt });
        works = works.map(w => (w.id === id ? saved : w));
        renderList();
        toast('已保存', 'ok');
    } catch (err) {
        toast(err.message, 'err');
        saveBtn.disabled = false;
        saveBtn.textContent = '保存';
    }
}

/** 列表里那行省份。没勾的写「未归类」，和地图左下角那个入口一个叫法 */
function provinceLabel(w) {
    const names = Array.isArray(w.provinces) ? w.provinces : [];
    return names.length ? names.join(' · ') : '未归类';
}

async function onDelete(id, btn) {
    const work = works.find(w => w.id === id);
    if (!work) {
        return;
    }
    if (!confirm(`确定删除《${work.title}》吗？图片会一并删除，不可恢复。`)) {
        return;
    }

    btn.disabled = true;
    btn.textContent = '删除中…';
    try {
        await removeWork(id);
        works = works.filter(w => w.id !== id);
        renderList();
        toast('已删除', 'ok');
    } catch (err) {
        toast(err.message, 'err');
        btn.disabled = false;
        btn.textContent = '删除';
    }
}

function renderListSkeleton() {
    listEl.innerHTML = Array.from({ length: 3 }, () => `
        <div class="admin-item">
            <div class="skeleton__box" style="width:92px;aspect-ratio:4/3;border-radius:8px"></div>
            <div class="skeleton__bar" style="margin:0;width:60%"></div>
            <div></div>
        </div>
    `).join('');
}
