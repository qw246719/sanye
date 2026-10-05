/* ============================================================
   作品地图页

   - 画一张中国地图：没作品的省只有描边，有作品的省泛一点绿光
   - 点省份 -> 右侧半屏的省份详情（Hero 背景图 + 介绍 + 统计 + 照片墙）。
     是覆盖层不是新页面，地图的缩放平移状态留在下面，返回就是关掉
   - 点照片 -> 灯箱看大图（外观和摆位跟首页共用，但没有 FLIP 飞行、
     也没有左右切换 —— 地图页就一张）
   - 左下角入口 -> 一个省都没匹配上的作品

   数据三条线，各失败各的：
   /china.json 拿不到就没得画，整页给错误态；
   /api/works 拿不到只是没有泛光的省，地图照画（退回内置演示图）；
   /api/province-profiles 拿不到只是详情里少一段介绍、Hero 走底色渐变，别的都在。
   ============================================================ */

import * as echarts from 'echarts/core';
import { MapChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import { fetchWorks, fetchProvinceProfiles, assetUrl, escapeHtml, toast } from './api.js';
import { DEMO_WORKS } from './demo-works.js';
import { fitBox, placeImage, placeCaption } from './lightbox.js';

// series.type:'map' 用不着 GeoComponent（那是独立的 geo 组件才要的），
// roam 在 ECharts 5 也已经内置，不用额外引组件
echarts.use([MapChart, TooltipComponent, CanvasRenderer]);

const els = {
    map: document.getElementById('map'),
    uncat: document.getElementById('uncatEntry'),
    detail: document.getElementById('detail'),
    detailImg: document.getElementById('detailImg'),
    detailBack: document.getElementById('detailBack'),
    detailPill: document.getElementById('detailPill'),
    detailDate: document.getElementById('detailDate'),
    detailName: document.getElementById('detailName'),
    detailIntro: document.getElementById('detailIntro'),
    detailStats: document.getElementById('detailStats'),
    detailUpdated: document.getElementById('detailUpdated'),
    detailWall: document.getElementById('detailWall'),
    lb: document.getElementById('lb'),
    lbBackdrop: document.getElementById('lbBackdrop'),
    lbImg: document.getElementById('lbImg'),
    lbCap: document.getElementById('lbCap'),
    lbTitle: document.getElementById('lbTitle'),
    lbDesc: document.getElementById('lbDesc'),
    lbProv: document.getElementById('lbProv'),
    lbClose: document.getElementById('lbClose'),
};

/* 强调色不写常量：gallery.css 里的 --accent 已经是唯一事实来源，
   这边再抄一份 RGB，将来改配色时就是漏改一处 */
const ACCENT = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#9BC46F').trim();
const ACCENT_RGB = hexToRgbTriple(ACCENT);

/** '#9BC46F' / '#9cf' -> '155, 196, 111'，拿来拼各种透明度 */
function hexToRgbTriple(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.replace(/./g, c => c + c) : h;
    const n = parseInt(full, 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 省名 -> 该省的作品（新的在前） */
const byProvince = new Map();
/** provinces 一个都没匹配上、以及省名为空的作品 */
const uncategorized = [];
/** 省名 -> { note, cover }。后台可改；没设置过的省不在表里 */
let profiles = {};

/** 详情此刻展示的那批，照片按 data-i 回查 */
let detailWorks = [];

let chart = null;

/* 照片墙的节奏：宽 / 两条竖 / 宽 / 两条方，按序号循环。
   写死一张表而不是用 i % 3 之类的算式 —— 想调拼接方式时一眼就能看出改哪儿 */
const WALL_SHAPE = ['is-wide', 'is-tall', 'is-tall', 'is-wide', 'is-square', 'is-square'];

/* ---------------- 起手 ---------------- */

init();

async function init() {
    let geo;
    try {
        const res = await fetch('/china.json');
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        geo = await res.json();
    } catch (e) {
        fail('地图数据没加载出来，刷新试试。');
        return;
    }

    /* 地图先画出来，不等作品接口。
       反过来的话，后端要是接了连接却一直不回（api.js 的 request 没有超时），
       整页会一直白着，而且什么错都不报 —— 地图本身跟作品一点关系都没有，
       没理由陪着一起等 */
    renderMap(geo);

    /* 两趟请求并发，各成功各的、各失败各的。串起来 await 的话，
       作品那趟慢一点就白白多等一个往返，而这两份数据互不依赖 */
    const [worksRes, profilesRes] = await Promise.allSettled([fetchWorks(), fetchProvinceProfiles()]);

    // 作品拿不到不该拖垮整页：地图照画，只是没有一个省亮
    const works = worksRes.status === 'fulfilled' ? worksRes.value : null;
    if (worksRes.status === 'rejected') {
        toast('连不上后端，先用内置演示图', 'err');
    }
    /* 省份设置只影响详情里那段文字和 Hero 的背景图，拿不到就都不显示
       （intro 是空的，CSS 那条 :empty 会把它收掉），绝不该把这个页面拖成错误态 */
    profiles = profilesRes.status === 'fulfilled' && profilesRes.value ? profilesRes.value : {};

    const real = (works || []).map(w => ({
        id: w.id,
        title: w.title || '未命名',
        desc: w.desc || '',
        provinces: Array.isArray(w.provinces) ? w.provinces : [],
        url: assetUrl(w.afterUrl),
        // 演示图没有这个字段，落成 0，下面统计那行会显示成「—」
        time: Number(w.createTime) || 0,
    })).filter(w => w.url);

    // 和首页同一条规矩：后端有作品就用后端的，一件都没有（或连不上）
    // 就用内置演示图 —— 两边看到的必须是同一批，不然地图上的亮点对不上列表
    const usingDemo = !real.length;
    index(geo, usingDemo ? DEMO_WORKS.map(w => ({ ...w, time: 0 })) : real);

    // 到这一步才数得出哪个省有几件，把泛光的省和未归类那个数字补上
    chart.setOption({ series: [{ data: seriesData() }] });
    renderEntries();
}

/* 省份设置是起手拉一次的。去后台改完介绍/背景图再切回这个标签，
   页面上还是旧的那份 —— 监听可见性，切回来就静默重拉一次。
   失败什么都不说：这是顺手刷新，不该为它弹一条红提示。
   （不能复用 init()：那里面会重新 registerMap，ECharts 会报重复注册） */
async function refreshProfiles() {
    try {
        const next = await fetchProvinceProfiles();
        profiles = next || {};
    } catch (e) {
        /* 静默：地图页本来就不靠这份数据活着 */
    }
}

document.addEventListener('visibilitychange', () => {
    /* 只认「变成可见」。切走那一刻也发一次事件，那次拉回来没人看得到，
       而且很快就又切回来了 */
    if (!document.hidden) {
        refreshProfiles();
    }
});

/**
 * 把作品摊到省份上。
 *
 * 省名用**全称**（"四川省" 而不是 "四川"），ECharts 是拿它跟 GeoJSON 里
 * feature 的 properties.name 做字符串匹配的。
 */
function index(geo, works) {
    // 九段线那个 feature 的 name 是空串（adcode 100000_JD）。它得留在图上，
    // 但不能进这个集合，否则会多出一个能 hover 能点的幽灵省份
    const known = new Set();
    geo.features.forEach(f => {
        const name = f.properties && f.properties.name;
        if (name) {
            known.add(name);
        }
    });

    // 对不上号的省名攒起来，最后一次性打出来，别静默吞掉
    const unknown = new Set();

    works.forEach(w => {
        const names = [];
        (Array.isArray(w.provinces) ? w.provinces : []).forEach(raw => {
            const name = String(raw == null ? '' : raw).trim();
            if (!name) {
                return;
            }
            if (!known.has(name)) {
                unknown.add(name);
                return;
            }
            // 同一件作品在一个省里只算一次
            if (!names.includes(name)) {
                names.push(name);
            }
        });

        /* 一个省都对不上就归进未归类。这样即使省名拼错、或者日后换了地图数据，
           最坏是这件作品掉进未归类，而不是「有省份但地图上哪儿都不亮」——
           那种情况下作品是真的凭空消失了 */
        if (!names.length) {
            uncategorized.push(w);
            return;
        }
        names.forEach(name => {
            if (!byProvince.has(name)) {
                byProvince.set(name, []);
            }
            byProvince.get(name).push(w);
        });
    });

    if (unknown.size) {
        console.warn('[作品地图] 这些省名在 china.json 里找不到，相关作品已归入未归类：', Array.from(unknown));
    }
}

/** 有作品的省：泛一点绿光。空表就全都不亮 */
function seriesData() {
    return Array.from(byProvince, ([name, list]) => ({
        name,
        value: list.length,
        itemStyle: {
            areaColor: `rgba(${ACCENT_RGB}, .18)`,
            borderColor: `rgba(${ACCENT_RGB}, .62)`,
            shadowBlur: 18,
            shadowColor: `rgba(${ACCENT_RGB}, .35)`,
        },
    }));
}

/* ---------------- 地图 ---------------- */

function renderMap(geo) {
    chart = echarts.init(els.map);
    echarts.registerMap('china', geo);

    chart.setOption({
        tooltip: {
            trigger: 'item',
            // 保证提示框不跑出地图容器
            confine: true,
            /* 提示框默认是挂在 #map 里的。而 #map 是 position: fixed —— fixed
               元素自己就是一个层叠上下文，ECharts 给提示框写的那个
               z-index: 9999999 会被圈在里面，外面顶栏那份 z-index: 100 就压得住它。
               黑龙江、内蒙贴顶栏很近，hover 上去提示框会被顶栏的磨砂糊掉。
               挂到 body 上它就回到根层叠上下文，谁也压不住了 */
            appendToBody: true,
            /* 壳的样式只能在这儿配：ECharts 会给 tooltip 写行内样式，
               外部 CSS 压不过它。里面那行小字归 map.css 管（它是子节点，
               父级的行内样式管不着它） */
            backgroundColor: 'rgba(16, 16, 20, .86)',
            borderColor: 'rgba(242, 240, 236, .14)',
            borderWidth: 1,
            padding: [9, 13],
            textStyle: { color: '#F2F0EC', fontSize: 12.5 },
            extraCssText: 'border-radius: 10px; box-shadow: 0 12px 32px rgba(0, 0, 0, .55);'
                + ' backdrop-filter: blur(20px) saturate(1.3); -webkit-backdrop-filter: blur(20px) saturate(1.3);',
            formatter: p => {
                // 九段线（name 是空串）不弹提示
                if (!p.name) {
                    return '';
                }
                const list = byProvince.get(p.name);
                const n = list ? `有 ${list.length} 组作品` : '暂无作品';
                return `${escapeHtml(p.name)}<br><span class="map-tip__n">${n}</span>`;
            },
        },
        series: [{
            type: 'map',
            map: 'china',
            roam: true,
            // min: 1 就是「别缩得比整张图还小」
            scaleLimit: { min: 1, max: 8 },
            // 默认开着的话点一下会留个粘住的选中态，跟「点击开详情」打架
            selectedMode: false,
            zoom: 1.05,
            label: { show: false },
            itemStyle: {
                // 需求：省份不填色块，只留一道细描边
                areaColor: 'transparent',
                borderColor: 'rgba(242, 240, 236, .28)',
                borderWidth: .6,
            },
            emphasis: {
                label: { show: true, color: '#F2F0EC', fontSize: 11 },
                itemStyle: {
                    areaColor: 'rgba(242, 240, 236, .06)',
                    borderColor: 'rgba(242, 240, 236, .75)',
                    borderWidth: 1,
                },
            },
            // 起手是空的：这时候作品还没拿到（见 init），拿到后再 setOption 补一次
            data: seriesData(),
        }],
    });

    chart.on('click', p => {
        // 空名 = 九段线；没作品的省按需求就是「点了没反应」
        if (!p.name) {
            return;
        }
        const list = byProvince.get(p.name);
        if (list && list.length) {
            openDetail(p.name, list, null);
        }
    });

    // 容器尺寸变了要告诉 ECharts，否则画布还是旧的尺寸
    new ResizeObserver(() => chart.resize()).observe(els.map);
}

/* ---------------- 省份详情 ---------------- */

let detailOpen = false;
/** 这条 history 记录是不是我们自己加的。是的话关闭时得还回去 */
let pushed = false;
/** 正在等 popstate 回来（见 closeDetail 里那段） */
let closing = false;
/** 关掉详情后焦点还给谁（点地图进来的没有元素可还，就是 null） */
let detailFocus = null;

/**
 * @param {string} title  省名（全称）或「未归类」
 * @param {Array}  works  该省的作品
 * @param {Element|null} sourceEl  触发元素，关闭后焦点还给它
 */
function openDetail(title, works, sourceEl) {
    /* 后端回来的顺序是「新的在前」，演示图是数组顺序。这里统一按时间再排一次，
       照片墙得是最新的一张在最前面 */
    detailWorks = works.slice().sort((a, b) => (b.time || 0) - (a.time || 0));

    const times = detailWorks.map(w => w.time).filter(Boolean);
    const first = times.length ? Math.min(...times) : 0;
    const last = times.length ? Math.max(...times) : 0;

    const profile = profiles[title] || {};

    els.detailName.textContent = title;
    els.detailPill.textContent = `${detailWorks.length} 组作品`;
    els.detailDate.textContent = dateSpan(first, last);
    els.detailIntro.textContent = profile.note || '';

    /* Hero 的背景图是后台按省传的，**不是**该省最新作品的成片 ——
       传一件新作品不该悄悄把省的脸换掉。没传过就整个属性摘掉，
       .detail__hero 那层深色渐变露出来（赋空串在某些浏览器里会被当成
       「相对当前页」，白白发一次请求回来一个 HTML）。
       alt 一律留空：它是纯装饰，上面压着遮罩和整个标题块，
       读屏念一遍文件名只会添乱 */
    if (profile.cover) {
        els.detailImg.src = assetUrl(profile.cover);
    } else {
        els.detailImg.removeAttribute('src');
    }
    els.detailImg.alt = '';

    els.detailStats.innerHTML = statHtml(detailWorks.length, first, last);
    els.detailUpdated.textContent = last ? `已更新 ${ymd(last)}` : '';
    els.detailWall.innerHTML = detailWorks.length
        ? detailWorks.map(photoHtml).join('')
        : '<p class="detail__empty">这里还没有作品</p>';

    detailOpen = true;
    closing = false;
    detailFocus = sourceEl || null;

    els.detail.hidden = false;
    els.detail.scrollTop = 0;
    // 先让浏览器认下 hidden 撤掉后的这一帧，再加 is-open，
    // 否则过渡会被同一帧的两处改动合并掉、看不到淡入
    void els.detail.offsetWidth;
    els.detail.classList.add('is-open');

    /* 往 history 里压一条，这样手机上的返回手势 / 浏览器的返回键
       是关掉详情，而不是直接退出整个地图页（那两下就丢掉缩放位置了） */
    if (!pushed) {
        history.pushState({ detail: title }, '');
        pushed = true;
    }

    els.detailBack.focus({ preventScroll: true });
}

/** 返回按钮、ESC 走这儿；浏览器返回键走 popstate（见下面） */
function closeDetail() {
    /* closing 挡的是连点：history.back() 是异步的，popstate 要下一轮才来，
       这中间 detailOpen 还是 true。不挡的话第二次点击会再退一步，
       直接把整个地图页也退掉了 */
    if (!detailOpen || closing) {
        return;
    }
    /* 有我们自己压的那条记录就先还回去，让 hideDetail 由 popstate 触发。
       不还的话点一次返回要按两下浏览器返回键才出得去 */
    if (pushed) {
        closing = true;
        history.back();
        return;
    }
    hideDetail();
}

function hideDetail() {
    if (!detailOpen) {
        return;
    }
    detailOpen = false;
    pushed = false;
    closing = false;
    els.detail.classList.remove('is-open');

    /* 入场那 0.38s 跑完才真的藏起来。除了省一点合成，主要是让
       visibility 那条延迟过渡走完 —— 否则这一层还留在 Tab 顺序里 */
    const done = () => {
        /* 这 380ms 里用户完全可能又点开了另一个省（关了再点，手很快），
           那次 openDetail 已经把 detailOpen 置回 true 了 */
        if (detailOpen) {
            return;
        }
        els.detail.hidden = true;
        els.detailImg.removeAttribute('src');
    };
    if (reduceMotion) {
        done();
    } else {
        setTimeout(done, 380);
    }

    if (detailFocus && document.contains(detailFocus)) {
        detailFocus.focus({ preventScroll: true });
    }
}

/** 三个数字 + 一行日期。时间戳是 0（演示图）就显示「—」，不编一个假日期出来 */
function statHtml(count, first, last) {
    const cell = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
    return cell('打卡次数', `${count} 组`)
        + cell('第一次', first ? ymd(first) : '—')
        + cell('最近', last ? ymd(last) : '—');
}

/** 同一年的就只写一个年份，跨年写「2024 — 2025」 */
function dateSpan(first, last) {
    if (!first) {
        return '';
    }
    const a = new Date(first).getFullYear();
    const b = new Date(last).getFullYear();
    return a === b ? String(a) : `${a} — ${b}`;
}

/** 2026.05.14 */
function ymd(ts) {
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function photoHtml(w, i) {
    return `
        <button class="dphoto ${WALL_SHAPE[i % WALL_SHAPE.length]}" type="button" data-i="${i}">
            <img class="dphoto__img" src="${escapeHtml(w.url)}" alt="${escapeHtml(w.title)}"
                 loading="lazy" decoding="async">
        </button>`;
}

function renderEntries() {
    els.uncat.textContent = `未归类作品 (${uncategorized.length})`;
    /* 一件未归类都没有时整个收起来：一个点了没反应的按钮不如不放
       （演示数据里那条空省份是故意留的，好让这个入口有东西可点） */
    els.uncat.hidden = uncategorized.length === 0;
}

/* ---------------- 灯箱 ---------------- */

let viewerOpen = false;
/** 关灯箱后焦点要还给它 */
let viewerFocus = null;
/** 摆位用的原图尺寸。开灯箱时先从缩略图问一次，等大图自己 load 完再校正 */
let viewerSize = { w: 3, h: 2 };

function openViewer(item, sourceEl) {
    if (!item) {
        return;
    }
    /* 先拿缩略图的尺寸占个位（同一张图，多半已经解码好了）。
       但缩略图是 loading="lazy" 的，墙刚铺好就点的话它可能还没解码，
       naturalWidth 是 0 —— 这时先落到 3:2，等下面那个 load 监听来校正。
       不校正的话这个错比例会一直锁着：.lb__img 是 object-fit: cover，
       竖构图会被裁掉一截，而且要关掉重开才好 */
    const thumb = sourceEl ? sourceEl.querySelector('.dphoto__img') : null;
    viewerSize = thumb && thumb.naturalWidth
        ? { w: thumb.naturalWidth, h: thumb.naturalHeight }
        : { w: 3, h: 2 };

    viewerOpen = true;
    viewerFocus = sourceEl || null;

    els.lbImg.src = item.url;
    els.lbImg.alt = item.title;
    els.lbTitle.textContent = item.title;
    els.lbDesc.textContent = item.desc || '';
    els.lbProv.textContent = (item.provinces || []).join(' · ');

    els.lb.hidden = false;
    layoutViewer();

    // 先让浏览器认下 hidden 撤掉后的这一帧，再加 is-open，否则过渡看不到
    void els.lb.offsetWidth;
    els.lb.classList.add('is-open');
    document.body.classList.add('is-lb');
    els.lbClose.focus({ preventScroll: true });
}

function layoutViewer() {
    const box = fitBox(viewerSize.w, viewerSize.h);
    placeImage(els.lbImg, box);
    placeCaption(els.lbCap, box);
}

function closeViewer() {
    if (!viewerOpen) {
        return;
    }
    viewerOpen = false;
    els.lb.classList.remove('is-open');
    document.body.classList.remove('is-lb');

    /* .lb__backdrop 的淡出是 .42s（gallery.css），
       立刻 hidden 的话那下淡出根本看不见，会直接闪没 */
    const done = () => {
        /* 这 420ms 里用户完全可能又点开了另一张（关了再点，手很快）。
           那次 openViewer 已经把 viewerOpen 置回 true 了，
           这里再收一次就会把新开的那张一起吃掉 */
        if (viewerOpen) {
            return;
        }
        els.lb.hidden = true;
        els.lbImg.removeAttribute('src');
    };
    if (reduceMotion) {
        done();
    } else {
        setTimeout(done, 420);
    }

    if (viewerFocus && document.contains(viewerFocus)) {
        viewerFocus.focus({ preventScroll: true });
    }
}

/* ---------------- 事件 ---------------- */

els.detailWall.addEventListener('click', e => {
    const photo = e.target.closest('.dphoto');
    if (photo) {
        openViewer(detailWorks[Number(photo.dataset.i)], photo);
    }
});

/* 照片是 loading="lazy" 的，解码完再加这个类淡进来（map.css 里没这个类就是透明的）。
   load 和 error 都不冒泡，所以得用捕获。图挂了也要把类加上 ——
   否则那一格永远是空的，连占位底色都看不见，看着像布局塌了 */
const markLoaded = e => {
    if (e.target.classList && e.target.classList.contains('dphoto__img')) {
        e.target.classList.add('is-loaded');
    }
};
els.detailWall.addEventListener('load', markLoaded, true);
els.detailWall.addEventListener('error', markLoaded, true);

els.detailBack.addEventListener('click', closeDetail);
els.uncat.addEventListener('click', () => {
    if (uncategorized.length) {
        openDetail('未归类', uncategorized, els.uncat);
    }
});

els.lbClose.addEventListener('click', closeViewer);
els.lbBackdrop.addEventListener('click', closeViewer);

/* 大图自己 load 完就把尺寸校正一遍。上面那个缩略图尺寸只是占位，
   lazy 的缩略图没解码时它是 0，这里才是准的 */
els.lbImg.addEventListener('load', () => {
    if (!viewerOpen || !els.lbImg.naturalWidth) {
        return;
    }
    viewerSize = { w: els.lbImg.naturalWidth, h: els.lbImg.naturalHeight };
    layoutViewer();
});

/* 浏览器返回键 / 手机返回手势。走到这儿说明那条我们压进去的记录被弹出来了，
   把详情收掉即可 —— 这里**不能**再调 history.back()，会多退一步退出整个页面 */
addEventListener('popstate', () => {
    if (detailOpen) {
        hideDetail();
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        // 一层压一层：灯箱在详情上面，ESC 先关最上面那层
        if (viewerOpen) {
            closeViewer();
        } else {
            closeDetail();
        }
        return;
    }

    if (e.key !== 'Tab') {
        return;
    }

    /* 灯箱和详情都写了 aria-modal，得把 Tab 圈在里面。
       不拦的话 Tab 会走到后面顶栏、未归类那些按钮上 —— 它们被盖着，
       看不见却按得着 */
    if (viewerOpen) {
        e.preventDefault();
        els.lbClose.focus({ preventScroll: true });
    } else if (detailOpen) {
        trapIn(els.detail, e);
    }
});

/**
 * 把 Tab 圈在 root 内。详情里可聚焦的元素是动态渲染的（照片数量不定），
 * 所以每次按键现查一遍，不缓存
 */
function trapIn(root, e) {
    const items = Array.from(root.querySelectorAll('button, [href]'))
        /* 没渲染的（display:none / 还没画出来）getClientRects() 是空的。
           ⚠️ 这里不能用 offsetParent 判 —— 返回按钮是 position: fixed，
           fixed 元素的 offsetParent 恒为 null，用它会把按钮自己筛掉，
           Shift+Tab 就漏到后面顶栏去了 */
        .filter(el => el.getClientRects().length > 0);
    if (!items.length) {
        return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

addEventListener('resize', () => {
    // 图是按视口算出来的位置摆的，转屏/改窗口大小要重摆一次
    if (viewerOpen) {
        layoutViewer();
    }
});

/* ---------------- 兜底 ---------------- */

function fail(message) {
    els.map.innerHTML = `<p class="map-error">${escapeHtml(message)}</p>`;
    els.uncat.hidden = true;
}
