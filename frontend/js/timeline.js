/* ============================================================
   人生足迹时间轴

   数据全部来自已有的 /api/works：一件**「填了城市 + 拍摄日期」**的作品
   就是一条足迹。不新开接口、不加字段、后端一行没动。

   ⚠️ 为什么不能拿 createTime 顶替 takenAt：那是**上传时间**。把
   「2026-10-05 上传」当成「2026-10-05 去的」，这一页就变成上传记录了，
   不是足迹。地图页「旅途天数」不认 createTime 是同一条理由
   （见 map.js 的 toWorks 里那段注释）。
   ============================================================ */

import { fetchWorks, assetUrl, escapeHtml } from './api.js';

/**
 * 年份寄语：一年一句，**前端写死的**。
 * 没有配寄语的年份，那一行整个不出现 —— 不拿别的年份顶替，也不现编。
 * 加一年就在这儿加一行，键是数字（不是字符串，下面的查表用的是年份数字）。
 */
const YEAR_NOTES = {
    2026: '这一年，开始学着把远方装进口袋。',
};

/* 入场错峰：这里只写序号，55ms 的步长和 180ms 的基数在 CSS 里
   （timeline.css 的 .tl-item__hit，跟地图页「最近的回忆」同一套）。
   序号封顶 —— 条目一多，第 30 条要等一秒半才出来，那不叫错峰叫罚站；
   到顶之后剩下的同一时刻一起进，地图页照片墙也是这么干的（封 12） */
const STAGGER_MAX = 12;

const els = {
    list: document.getElementById('tlList'),
    hint: document.getElementById('tlHint'),
    state: document.getElementById('tlState'),
    stat: document.getElementById('tlStat'),
    jump: document.getElementById('tlJump'),
};

/* 减少动态效果：跳转用瞬时滚动，不做平滑 */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

init();

async function init() {
    let list;
    try {
        list = await fetchWorks();
    } catch (e) {
        /* 后端没起来。这一页的内容全在后端，没什么可退的 —— 说清楚就行 */
        showState('连不上后端。时间轴读的是作品数据，先把后端起来再刷新。');
        return;
    }

    const trips = toTrips(list);
    if (!trips.length) {
        showState('还没有带城市和拍摄日期的作品。到后台给作品补上城市和日期，这儿就长出来了。');
        return;
    }

    const groups = groupByYear(trips);
    render(groups);
    renderStat(trips, groups);
    renderJump(groups);
    initScrollSpy();
    openFromQuery();
    renderHint(list);
}

/**
 * 后端作品 -> 时间轴条目。
 * 只留 city 非空**且** takenAt > 0 的：少了任何一个都没法在时间轴上定位。
 */
function toTrips(list) {
    return (list || []).map(w => ({
        id: w.id,
        city: String(w.city == null ? '' : w.city).trim(),
        takenAt: Number(w.takenAt) || 0,
        /* 旅行备注直接复用作品那句描述 —— 地图页「最近的回忆」那几行
           本来就是「城市 + 日期 + 描述」这个三件套，两边显示的是同一组东西 */
        note: String(w.desc == null ? '' : w.desc).trim(),
        /* 点一条跳回地图页那个省。一件作品可能属于多个省，取第一个 ——
           时间轴是「这一次去了哪」，一个落点就够；真要按多个省拆，
           同一次旅行会在时间轴上出现好几遍 */
        province: Array.isArray(w.provinces) && w.provinces.length
            ? String(w.provinces[0]).trim()
            : '',
        /* 缩略图直接用作品成片。这一页原来只有字，加了这张之后
           「去过哪儿」和「看过什么」才是同一件事 */
        url: assetUrl(w.afterUrl) || '',
    })).filter(t => t.city && t.takenAt > 0);
}

/** 按年分组：年份倒序，组内按拍摄日期倒序（越近越靠上） */
function groupByYear(trips) {
    const byYear = new Map();
    for (const t of trips) {
        const y = new Date(t.takenAt).getFullYear();
        if (!byYear.has(y)) {
            byYear.set(y, []);
        }
        byYear.get(y).push(t);
    }
    return Array.from(byYear, ([year, items]) => ({
        year,
        items: items.slice().sort((a, b) => b.takenAt - a.takenAt),
    })).sort((a, b) => b.year - a.year);
}

/* ------------------------------------------------------------
   渲染
   ------------------------------------------------------------ */

function render(groups) {
    /* --i 是**按 DOM 顺序**数的（年份头先，然后才是它下面那几条），
       所以不能分开渲染；一边走一边加 */
    let i = 0;
    const next = () => Math.min(i++, STAGGER_MAX);

    const blocks = groups.map(group => {
        /* id / data-year 给年份跳转和「滚到哪一年」的高亮用（见 initScrollSpy） */
        const head = `
            <li class="tl-year" id="year-${group.year}" data-year="${group.year}" style="--i:${next()}">
                <h2 class="tl-year__head">
                    <span class="tl-year__n">${group.year}</span>
                    <span class="tl-year__count">${group.items.length} ${group.items.length > 1 ? 'JOURNEYS' : 'JOURNEY'}</span>
                </h2>
                ${YEAR_NOTES[group.year] ? `<p class="tl-year__note">${escapeHtml(YEAR_NOTES[group.year])}</p>` : ''}
                ${platesHtml(group.items, next)}
            </li>`;

        const rows = group.items.map(t => `
            <li class="tl-item">
                <a class="tl-item__hit" href="${tripHref(t)}" style="--i:${next()}">
                    <span class="tl-item__text">
                        <span class="tl-item__city">${escapeHtml(t.city)}</span>
                        <span class="tl-item__date">${ymd(t.takenAt)}</span>
                        ${t.note ? `<span class="tl-item__note">${escapeHtml(t.note)}</span>` : ''}
                    </span>
                </a>
            </li>`).join('');

        return head + rows;
    });

    els.list.innerHTML = blocks.join('');
}

/**
 * 每一年开头的那排照片：这一年的行程各配一张，点一张回到作品辑里的那一件
 * （首页认 ?work=<id>，见 gallery.js 的 focusFromQuery）。
 * 照片全都取不到时整排不出现，不占一块空位。
 */
function platesHtml(items, next) {
    const shots = items.filter(t => t.url);
    if (!shots.length) {
        return '';
    }
    return `<div class="tl-plates" style="--i:${next()}">${shots.map(t => `
        <a class="tl-plate" href="index.html?work=${encodeURIComponent(t.id)}"
           title="${escapeHtml(t.city)} · ${ymd(t.takenAt)}">
            <span class="tl-plate__img"><img src="${escapeHtml(t.url)}" alt="" loading="lazy" decoding="async"></span>
            <span class="tl-plate__cap">${escapeHtml(t.city)}</span>
        </a>`).join('')}</div>`;
}

/**
 * 点一条跳回地图页，把那个省的详情直接打开（map.js 启动时读这两个参数）。
 * 作品一个省都没匹配上的，跳去「未归类」那张面板 —— 跟地图页左下角那个入口
 * 看到的是同一批东西，不会点过去扑空。
 */
function tripHref(trip) {
    return trip.province
        ? `map.html?province=${encodeURIComponent(trip.province)}`
        : 'map.html?uncat=1';
}

/* ------------------------------------------------------------
   页头的数字与年份跳转
   ------------------------------------------------------------ */

/* 年份跨度 · 城市数 · 旅途天数。
   和地图页「旅途印记」是同一套口径（拍摄日期 max - min + 1），
   两页的数字必须对得上，不然用户会以为是两个数 */
function renderStat(trips, groups) {
    const years = groups.map(g => g.year);
    const span = years.length > 1
        ? `${Math.min(...years)} — ${Math.max(...years)}`
        : String(years[0]);
    const cities = new Set(trips.map(t => t.city)).size;

    const stamps = trips.map(t => dayOf(t.takenAt));
    const days = Math.round((Math.max(...stamps) - Math.min(...stamps)) / 86400000) + 1;

    els.stat.innerHTML = `<span>${span}</span>`
        + '<span class="tl-head__sep" aria-hidden="true">·</span>'
        + `<span>${cities} 座城市</span>`
        + '<span class="tl-head__sep" aria-hidden="true">·</span>'
        + `<span>旅途 ${days} 天</span>`;
    els.stat.hidden = false;
}

/** 归到当地零点。直接拿时间戳相减的话，中间隔着夏令时会差出一小时 */
function dayOf(ts) {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function renderJump(groups) {
    /* 只有一年的时候一排 chip 没有意义，直接不出现 */
    if (groups.length < 2) {
        return;
    }

    els.jump.innerHTML = groups.map(g => `
        <a class="tl-jump__item" href="#year-${g.year}" data-year="${g.year}">
            ${g.year}<span class="tl-jump__n">${g.items.length}</span>
        </a>`).join('');
    els.jump.hidden = false;

    els.jump.addEventListener('click', (e) => {
        const a = e.target.closest('.tl-jump__item');
        const target = a && document.getElementById(`year-${a.dataset.year}`);
        if (!target) {
            return;
        }
        e.preventDefault();
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        target.classList.add('is-flash');
        setTimeout(() => target.classList.remove('is-flash'), 1800);
    });
}

/* 滚过一条就点亮一段竖线，同时把顶上的年份 chip 换到当前那一年。

   一条条算而不是用 IntersectionObserver：这里要的是「已经滚过去的都亮着」，
   观察器只知道「此刻在不在视口里」—— 往回跳一年，会留下一段暗的 */
function initScrollSpy() {
    const items = [...els.list.children];
    const years = items.filter(el => el.classList.contains('tl-year'));
    const chips = [...els.jump.querySelectorAll('.tl-jump__item')];
    let raf = 0;

    function frame() {
        raf = 0;
        const line = innerHeight * .62;
        items.forEach(li => li.classList.toggle('is-lit', li.getBoundingClientRect().top < line));

        let active = years.length ? years[0].dataset.year : '';
        years.forEach(y => {
            if (y.getBoundingClientRect().top < innerHeight * .4) {
                active = y.dataset.year;
            }
        });
        chips.forEach(c => c.classList.toggle('is-on', c.dataset.year === active));
    }

    function onScroll() {
        if (!raf) {
            raf = requestAnimationFrame(frame);
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();
}

/* 地图页的省详情会带 ?year= 过来：滚到那一年、闪一下，再把查询串擦掉 ——
   不擦的话刷新一次又跳一次。认不出来就安静停着，不弹错 */
function openFromQuery() {
    const year = new URLSearchParams(location.search).get('year');
    if (!year) {
        return;
    }
    const target = document.getElementById(`year-${year}`);
    if (!target) {
        return;
    }
    history.replaceState(null, '', location.pathname);
    requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        target.classList.add('is-flash');
        setTimeout(() => target.classList.remove('is-flash'), 2000);
    });
}

/**
 * 有城市、但没填拍摄日期的件数 —— 这些排不进时间轴（没有日期就没法定位）。
 * 不静默吞掉：跟地图页「未归类作品 (N)」是同一条规矩，东西可以不入列表，
 * 但不能凭空消失，否则看着像 bug。
 */
function renderHint(list) {
    const n = (list || []).filter(w => {
        const city = String(w.city == null ? '' : w.city).trim();
        return city && !(Number(w.takenAt) > 0);
    }).length;

    if (!n) {
        els.hint.hidden = true;
        return;
    }
    els.hint.hidden = false;
    els.hint.textContent = `另有 ${n} 件作品没填拍摄日期，没排进来。`;
}

function showState(message) {
    els.state.hidden = false;
    els.state.textContent = message;
}

/**
 * 毫秒 -> 「2026-10-04」。
 * 地图页那个 ymd() 写的是点号（2026.05.14，给详情里那行日期用的），
 * 格式不一样、也导不出来，所以在这儿另写一个。
 * 用 getFullYear / getMonth / getDate 而不是 toISOString：存的本来就是
 * 当地零点，转 UTC 会让东八区整体退回前一天。
 */
function ymd(ts) {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
