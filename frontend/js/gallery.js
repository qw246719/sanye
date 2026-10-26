/* ============================================================
   作品辑 · 全黑摄影站

   数据来自 GET /api/works（取修图后的 afterUrl 铺图）。
   后端没作品或没启动时退回内置演示图（assets/demo/*.svg），
   页首会挂一条说明，不会让人以为是坏了。

   三块各管各的，互不抢同一个属性：
   - 首屏   driveHero()：滚多少就把封面糊多少、压暗多少、往下沉多少
   - 列表   IntersectionObserver 错峰入场，图片自己再化开一次
   - 灯箱   FLIP：从缩略图那个框飞到大图那个框，中途糊一下
            （摆位的数学在 js/lightbox.js，地图页共用那几个函数）
   ============================================================ */

import { fetchSiteConfig, fetchWorks, assetUrl, escapeHtml } from './api.js';
import { DEMO_WORKS } from './demo-works.js';
import { fitBox, placeImage, placeCaption } from './lightbox.js';

const worksEl = document.getElementById('works');

const hero = document.getElementById('hero');
const heroMedia = document.getElementById('heroMedia');
const heroImg = document.getElementById('heroImg');
const heroSoft = document.getElementById('heroSoft');
const heroVeil = document.getElementById('heroVeil');
const heroText = document.getElementById('heroText');

const lb = document.getElementById('lb');
const lbImg = document.getElementById('lbImg');
const lbCap = document.getElementById('lbCap');
const lbTitle = document.getElementById('lbTitle');
const lbDesc = document.getElementById('lbDesc');
const lbProv = document.getElementById('lbProv');
const lbIdx = document.getElementById('lbIdx');
const lbBackdrop = document.getElementById('lbBackdrop');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');
const lbClose = document.getElementById('lbClose');

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 滚动进度线：宽度跟着「滚了多少」走，见 updateProgress() */
const progress = document.getElementById('progress');
/* 页脚：滚到眼前才浮现，见 init() 里那个观察器 */
const footEl = document.querySelector('.foot');

/* ---------------- 状态 ---------------- */

const state = {
    works: [],
};


/* ---------------- 启动 ---------------- */

init();

async function init() {
    /* 给 CSS 一个「脚本在跑」的信号：像 .foot 那种默认要可见的兜底，
       只在确认脚本活着时才交给动画去藏（见 gallery.css 的 .js .foot） */
    document.body.classList.add('js');
    driveHero();
    // 不 await：封面要等一个网络往返，别让它挡住滚动驱动的初始化和下面那批请求
    applyCover();
    bindLightbox();
    showSkeletons();
    revealFooter();
    revealClosing();

    let works = null;
    try {
        works = await fetchWorks();
    } catch (e) {
        // 连不上后端就退回演示图（见下），别让一个作品站因为接口挂了整页白
    }

    const real = (works || []).map(w => ({
        id: w.id,
        title: w.title || '未命名',
        desc: w.desc || '',
        provinces: Array.isArray(w.provinces) ? w.provinces : [],
        // 城市和拍摄日期是后来加的字段（老作品没有），图注用得上就顺手带上
        city: w.city || '',
        takenAt: Number(w.takenAt) || 0,
        url: assetUrl(w.afterUrl),
        ratio: '4 / 3',
    })).filter(w => w.url);

    if (real.length) {
        state.works = real;
    } else {
        state.works = DEMO_WORKS;
        showNote(works
            ? '现在放的是内置演示图 —— 去<a href="admin.html">后台</a>传一张，这里就换成你的照片。'
            : '连不上后端，先看内置演示图 —— 后端起来后刷新即可。');
    }

    renderWorks();
    focusFromQuery();
}

function showNote(html) {
    const p = document.createElement('p');
    p.className = 'note';
    p.innerHTML = html;
    worksEl.parentNode.insertBefore(p, worksEl);
}

/* ---------------- 首屏 ---------------- */

/*
 * 一次性把「滚了多远」换算成封面该有的样子：
 *   p = 0  刚进页面，照片是清晰的
 *   p = 1  正文刚好盖满视口，照片已完全化开、压暗、沉下去
 * 只改 transform 和 opacity —— 两个都是合成器属性，不碰布局也不重绘。
 */
function driveHero() {
    let raf = 0;

    function frame() {
        raf = 0;
        const h = hero.offsetHeight || innerHeight;
        const p = Math.min(1, Math.max(0, window.scrollY / h));

        // 上层那张糊图跟着 p 淡进来，「化开」读起来就是它的透明度在变
        heroSoft.style.opacity = p.toFixed(3);
        // 压暗的**上限**只到 0.4 + 0.25 = 0.65，不到 1：.flow 是磨砂的，
        // 它采样的是这块首屏，遮罩要是一路压到全黑，列表滚下去背后就什么都看不见了。
        // 基数 0.4 没动 —— 那是第一屏静止时的观感，文字还压在上面
        heroVeil.style.opacity = (0.4 + p * 0.25).toFixed(3);
        // 文字比照片走得快：先它一步让开，视线自然落到正文上
        heroText.style.opacity = Math.max(0, 1 - p * 2.6).toFixed(3);

        if (!reduced) {
            // 往下沉 + 微微放大，像被推远
            heroMedia.style.transform =
                `translate3d(0, ${(p * 8).toFixed(2)}%, 0) scale(${(1 + p * 0.05).toFixed(4)})`;
            heroText.style.transform = `translate3d(0, ${(-p * 46).toFixed(1)}px, 0)`;
        }

        // 这里原来会在 p >= 1 时把 .hero 设成 visibility: hidden，省掉一层合成。
        // 现在不能这么干了：.flow 是磨砂的，backdrop-filter 要采样背后这一层，
        // 首屏一旦 hidden，磨砂底就会在滚满一屏的那一刻从「照片」闪成「纯黑」。
        // 代价是整张首屏会一直留在合成树里 —— 换来的是列表一路滚下去背景都是它
    }

    function onScroll() {
        const h = hero.offsetHeight || innerHeight;
        document.body.classList.toggle('is-past', window.scrollY > h * 0.55);
        updateProgress();
        if (!raf) {
            raf = requestAnimationFrame(frame);
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
}

/* 顶上的进度线：读到哪儿，线就铺到哪儿。scrollHeight 随时会变
   （图 decode 完把卡片撑高），所以每次现算，不缓存 */
function updateProgress() {
    if (!progress) {
        return;
    }
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
}

/* 页脚滚到眼前才浮现。和作品卡那套错峰同构，但页脚只有一个 */
function revealFooter() {
    if (!footEl) {
        return;
    }
    const ioFoot = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                footEl.classList.add('is-in');
                ioFoot.disconnect();
            }
        });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .1 });
    ioFoot.observe(footEl);
}

/* 作品集尽头的结尾语：滚到眼前才浮现。和页脚同一套观察器，各管各的 */
function revealClosing() {
    const el = document.getElementById('closing');
    if (!el) {
        return;
    }
    const ioClosing = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                el.classList.add('is-in');
                ioClosing.disconnect();
            }
        });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .1 });
    ioClosing.observe(el);
}

/* ---------------- 首屏封面 ---------------- */

/*
 * 首屏那张图默认是内置的 /cover.jpg（直接写在 HTML 里，后端没起来或
 * JS 出问题时也还有这张兜底）。但 CSS 里它默认是 opacity: 0 藏着的 ——
 * 直接藏，不靠 JS 去藏，否则模块脚本（延迟执行）跑起来之前那一小段
 * 解析期 /cover.jpg 已经画出来闪一下了。applyCover() 拿到真正的封面、
 * 解码好、换好 src，才给 hero 加 .is-in 淡进来。
 */
function applyCover() {
    const settle = () => revealHero();

    fetchSiteConfig()
        .then((cfg) => {
            // assetUrl 只套在后端返回的 coverUrl 上：它在 /uploads/ 下，属于后端域名，
            // 前后端分域名部署时要补成绝对地址。内置的 /cover.jpg 在**前端**目录里，
            // 套上去反而会被指到后端域名上，所以它永远是裸字面量。
            const url = assetUrl(cfg && cfg.coverUrl);
            if (url) {
                swapHero(url);
            } else {
                // 没配自定义封面：内置那张就是封面，把它淡进来即可
                settle();
            }
        })
        .catch(() => {
            // 连不上后端就什么都不做，内置封面照旧 ——
            // 和「后端没作品就退回演示图」是同一套兜底
            settle();
        });
}

/* 封面最终确定后把图淡进来（撤掉默认的 opacity: 0）。
   必须先在下一帧让浏览器认下这次 src 赋值再加 .is-in —— 不然淡入和换图
   挤在同一帧，opacity 从 0 到 1 没有可比的起点，整段过渡会丢掉 */
function revealHero() {
    void hero.offsetWidth;
    hero.classList.add('is-in');
}

/*
 * 换封面图。两件事必须一起做到：
 *   1. 两层同 URL。上层是预先糊好的一层（blur(30px)），driveHero() 只推它的 opacity，
 *      同一张图才读得出「化开」；换成两张不同的图会变成两个画面 crossfade。
 *   2. 先解码再同帧赋值。两个 <img> 各自从 pending 切到 current 的时机不保证一致，
 *      只推一个的话，heroSoft 的 opacity 卡在中间值时会闪一帧
 *      「锐利层还是旧图、模糊层已是新图」的鬼影。
 */
function swapHero(url) {
    const pre = new Image();
    pre.src = url;

    const decoded = pre.decode ? pre.decode() : Promise.resolve();

    decoded.then(() => {
        heroImg.src = url;
        heroSoft.src = url;

        // 换过之后，那句「仰拍的三叶草丛和蓝天」就是错的描述了。
        // 首屏这张图在语义上算装饰，h1 和 .hero__sub 已经撑住了内容。
        heroImg.alt = '';
        heroImg.setAttribute('aria-hidden', 'true');

        // 兜底：这张图日后取不到了（uploads 被清掉、或者配置指向了不存在的文件）就
        // 退回内置那张，否则首屏会是一张碎图加一块黑遮罩。只在换过之后才需要挂。
        const back = () => {
            heroImg.removeEventListener('error', back);
            heroSoft.removeEventListener('error', back);
            const cover = import.meta.env.BASE_URL + 'cover.jpg';
            heroImg.src = cover;
            heroSoft.src = cover;
            heroImg.alt = '仰拍的三叶草丛和蓝天';
            heroImg.removeAttribute('aria-hidden');
            revealHero();
        };
        heroImg.addEventListener('error', back);
        heroSoft.addEventListener('error', back);

        revealHero();
    }, () => {
        // decode 失败说明这张图压根取不到，那就别换，内置那张照旧
        revealHero();
    });
}

/* ============================================================
   列表的两层「动」

   1. 滚动视差：照片比页面慢半拍地飘（动的是 .work__fig，说明不动）
   2. 指针跟手：鼠标在照片上移动时，图在里面偏一点点 —— 只有真有 hover
      的设备才开，触屏上没有任何意义
   ============================================================ */

function initParallax() {
    if (reduced || !matchMedia('(min-width: 881px)').matches) {
        return;
    }
    const cards = [...worksEl.querySelectorAll('.work')];
    let raf = 0;

    function frame() {
        raf = 0;
        const mid = innerHeight / 2;
        cards.forEach(card => {
            const r = card.getBoundingClientRect();
            if (r.bottom < -180 || r.top > innerHeight + 180) {
                return;
            }
            // 卡片中心离屏幕中线越远，偏得越多。上限只给 ±14px —— 说明栏是
            // 和照片底边对齐的，飘太多两者就散架了，这是「呼吸」不是「漂移」
            const d = (r.top + r.height / 2 - mid) / innerHeight;
            const y = Math.max(-14, Math.min(14, d * -36));
            card.style.setProperty('--fig-y', `${y.toFixed(1)}px`);
        });
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

function bindPointerPan() {
    if (reduced || !matchMedia('(hover: hover) and (pointer: fine)').matches) {
        return;
    }
    worksEl.querySelectorAll('.work__frame').forEach(frame => {
        let rect = null;

        frame.addEventListener('pointerenter', () => {
            rect = frame.getBoundingClientRect();
        });

        frame.addEventListener('pointermove', (e) => {
            if (!rect) {
                rect = frame.getBoundingClientRect();
            }
            const x = (e.clientX - rect.left) / rect.width - .5;
            const y = (e.clientY - rect.top) / rect.height - .5;
            frame.style.setProperty('--tx', `${(x * 22).toFixed(1)}px`);
            frame.style.setProperty('--ty', `${(y * 16).toFixed(1)}px`);
        });

        frame.addEventListener('pointerleave', () => {
            rect = null;
            frame.style.setProperty('--tx', '0px');
            frame.style.setProperty('--ty', '0px');
        });
    });
}

/* 从别的页用 ?work=<id> 跳过来：滚到那一件、闪一下，再把查询串擦掉 ——
   不擦的话刷新一次又跳一次。id 对不上就安静停着，不弹错 */
function focusFromQuery() {
    const id = new URLSearchParams(location.search).get('work');
    if (!id) {
        return;
    }
    const el = [...worksEl.querySelectorAll('.work')].find(w => w.dataset.id === id);
    if (!el) {
        return;
    }
    history.replaceState(null, '', location.pathname + location.hash);
    requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        el.classList.add('is-flash');
        setTimeout(() => el.classList.remove('is-flash'), 2800);
    });
}

/* ---------------- 作品列表 ---------------- */

const io = new IntersectionObserver(onReveal, {
    rootMargin: '0px 0px -8% 0px',
    threshold: .06,
});

/* 同一批进视口的按从上到下错峰浮上来，不是齐刷刷一起亮 */
function onReveal(entries) {
    entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        .forEach((e, k) => {
            e.target.style.setProperty('--rd', Math.min(k, 4) * 90 + 'ms');
            e.target.classList.add('is-in');
            io.unobserve(e.target);
        });
}

/* 一件作品一行，三档尺寸轮着走：每 4 件的第一件是通栏大图，
   剩下两件左右对调。原来是每一件都一模一样的一左一右，滚起来像表格 */
function renderWorks() {
    io.disconnect();
    worksEl.innerHTML = '';
    worksEl.setAttribute('aria-busy', 'false');

    if (!state.works.length) {
        worksEl.innerHTML = `
            <div class="state">
                <p class="state__t">这里还没有作品</p>
                <p style="margin:0">去后台上传一张图，刷新就有啦。</p>
                <a href="admin.html">前往后台管理</a>
            </div>`;
        return;
    }

    const frag = document.createDocumentFragment();
    frag.appendChild(createIndexHead(state.works));

    // 通栏大图之外的两件左右对调。flip 单独数，不受大图插队的影响。
    // ⚠️ 大图从第 4 件（i = 3）开始，**不能落在第 1 件**：接口是新作品在前，
    // 第 1 件永远是刚传的那张，而大图的说明是压在图片下面的 —— 新照片
    // 一上传就"标题跑到图下面"，看着像出错。现在每传一张，新照片都是侧边图文
    let flip = 0;
    state.works.forEach((item, i) => {
        const variant = (i + 1) % 4 === 0 ? 'plate' : (flip++ % 2 ? 'right' : 'left');
        frag.appendChild(createWork(item, i, variant));
    });

    worksEl.appendChild(frag);

    // 先把「模糊、透明」这个初始态结算一次。不强制的话，命中缓存的小图
    // 可能在同一帧里就从初始态跳到加载完成，前一个计算值从未落地，
    // transition 没得可比，化开的效果整段丢掉。
    void worksEl.offsetWidth;

    worksEl.querySelectorAll('.work').forEach(el => io.observe(el));
    initRail();
    initParallax();
    bindPointerPan();
}

/* 列表开头的 INDEX 行：件数 + 年份跨度（只算填了拍摄日期的那些作品） */
function createIndexHead(list) {
    const el = document.createElement('header');
    el.className = 'works__head';

    const years = list.map(w => w.takenAt ? new Date(w.takenAt).getFullYear() : 0).filter(Boolean);
    const lo = years.length ? Math.min(...years) : 0;
    const hi = years.length ? Math.max(...years) : 0;
    const span = !years.length ? '' : (lo === hi ? `${lo}` : `${lo} — ${hi}`);

    el.innerHTML = `
        <p class="works__kick">INDEX</p>
        <p class="works__sum">
            <span>${list.length} 件</span>
            ${span ? `<span class="works__sep" aria-hidden="true">·</span><span>${span}</span>` : ''}
        </p>`;
    return el;
}

function createWork(item, i, variant) {
    const el = document.createElement('article');
    el.className = `work work--${variant}`;
    el.id = `work-${i}`;
    el.dataset.i = i;
    // 别的页用 ?work=<后端 id> 能直接圈到这一张（见 focusFromQuery）
    el.dataset.id = String(item.id ?? '');

    // 每张图的「等待色」由标题哈希而来：都很暗，只分得出彼此，不抢照片
    const [ta, tb] = tint(item);
    el.style.setProperty('--ta', ta);
    el.style.setProperty('--tb', tb);
    // 同屏到达的图错开一点化开，别一堵墙一起亮
    el.style.setProperty('--dl', (i % 3) * 110 + 'ms');

    el.innerHTML = `
        <figure class="work__fig">
            <button class="work__frame" type="button" aria-label="放大查看《${escapeHtml(item.title)}》">
                <span class="work__ph"></span>
                <img class="work__img" alt="" loading="lazy" decoding="async">
                <span class="work__zoom" aria-hidden="true">↗</span>
            </button>
        </figure>
        <div class="work__body">
            <p class="work__idx">${String(i + 1).padStart(2, '0')}</p>
            <h2 class="work__title">${escapeHtml(item.title)}</h2>
            <div class="work__note">
                ${item.desc ? `<p class="work__desc">${escapeHtml(item.desc)}</p>` : ''}
                ${metaLine(item)}
            </div>
        </div>`;

    const frame = el.querySelector('.work__frame');
    const img = el.querySelector('.work__img');

    img.addEventListener('load', () => {
        // 等解码完再放出来：不然大图会一边解码一边淡入，中途掉帧
        (img.decode ? img.decode() : Promise.resolve()).then(reveal, reveal);
    }, { once: true });

    img.addEventListener('error', () => el.classList.add('is-failed'), { once: true });

    function reveal() {
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        if (nw && nh) {
            // 极端的竖图（长截图那种）不收窄就成了一条细线：给个下限，
            // 多出来的让 object-fit: cover 裁掉，总比四十像素宽强
            const ar = Math.max(nw / nh, .62);
            // 高度预算：大图 84vh，其余 66vh。照片不该高过一屏，
            // 竖图按这个高度反算宽度，横图照常撑满那一栏
            const budget = variant === 'plate' ? 88 : 66;
            frame.style.aspectRatio = `${ar}`;
            frame.style.setProperty('--w', `${(budget * ar).toFixed(2)}vh`);
        }
        el.classList.add('is-loaded');
    }

    // 入场动画跑完就把 filter 摘掉，别让每个作品都永久挂一个合成图层
    el.addEventListener('transitionend', (e) => {
        if (e.target === el && e.propertyName === 'filter') {
            el.style.filter = 'none';
        }
    });

    frame.addEventListener('click', () => openLightbox(i, frame));

    img.src = item.url;
    return el;
}

/* 图注最底下一行：年份 · 省份 · 城市。
   年份和省份是真链接 —— 年份去时间轴那一年，省份去地图那个省；
   城市只是文字（地图按省，没有市级边界）。三个都可能没有，一个都没就整行不输出 */
function metaLine(item) {
    const bits = [];
    if (item.takenAt) {
        const year = new Date(item.takenAt).getFullYear();
        bits.push(`<a href="timeline.html?year=${year}">${year}</a>`);
    }
    const provs = Array.isArray(item.provinces) ? item.provinces : [];
    provs.forEach(name => {
        bits.push(`<a href="map.html?province=${encodeURIComponent(name)}">${escapeHtml(name)}</a>`);
    });
    if (item.city) {
        bits.push(`<span>${escapeHtml(item.city)}</span>`);
    }
    if (!bits.length) {
        return '';
    }
    return `<p class="work__meta">${bits
        .join('<span class="work__dot" aria-hidden="true">·</span>')}</p>`;
}

function tint(item) {
    const seed = String(item.id ?? item.title ?? '');
    let h = 7;
    for (let i = 0; i < seed.length; i++) {
        h = (h * 31 + seed.charCodeAt(i)) % 100000;
    }
    const hue = h % 360;
    // 明度卡在 12%~9%，色相摆动只是让每块占位颜色略有差别
    return [`hsl(${hue} 16% 12%)`, `hsl(${hue} 11% 8%)`];
}

/* 右侧那条作品索引：一件一格刻度，滚到哪一件哪一格变绿 */
function initRail() {
    document.querySelector('.rail')?.remove();
    if (state.works.length < 2) {
        return;
    }

    const nav = document.createElement('nav');
    nav.className = 'rail';
    nav.setAttribute('aria-label', '作品索引');
    nav.innerHTML = `
        <p class="rail__now"><span class="rail__num">01</span><span>/ ${String(state.works.length).padStart(2, '0')}</span></p>
        <ol class="rail__list">
            ${state.works.map((w, i) => `<li><a class="rail__item" href="#work-${i}" data-i="${i}" aria-label="第 ${i + 1} 件：${escapeHtml(w.title)}"><span class="rail__tick"></span></a></li>`).join('')}
        </ol>`;
    document.body.appendChild(nav);

    const links = [...nav.querySelectorAll('.rail__item')];
    const numEl = nav.querySelector('.rail__num');
    const cards = [...worksEl.querySelectorAll('.work')];
    let active = -1;
    let raf = 0;

    function setActive(i) {
        if (i === active) {
            return;
        }
        links[active]?.classList.remove('is-on');
        links[active]?.removeAttribute('aria-current');
        active = i;
        links[i].classList.add('is-on');
        links[i].setAttribute('aria-current', 'true');
        numEl.textContent = String(i + 1).padStart(2, '0');
    }

    // 不另开一个观察器：十几张图的中心点算一遍很便宜，
    // 而且「离屏幕中线最近的那张」比 IntersectionObserver 的阈值好调
    function frame() {
        raf = 0;
        const mid = innerHeight / 2;
        let best = 0;
        let bestD = Infinity;
        cards.forEach((el, i) => {
            const r = el.getBoundingClientRect();
            const d = Math.abs(r.top + r.height / 2 - mid);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        });
        setActive(best);
    }

    function onScroll() {
        if (!raf) {
            raf = requestAnimationFrame(frame);
        }
    }

    nav.addEventListener('click', (e) => {
        const a = e.target.closest('.rail__item');
        if (!a) {
            return;
        }
        const card = cards[+a.dataset.i];
        if (!card) {
            return;
        }
        e.preventDefault();
        card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();
}

function showSkeletons() {
    /* 第一件现在不是通栏大图了（见 renderWorks 的注释），骨架也就别再画一张
       大图占位 —— 加载完从大图跳成侧边图文，会白抖一下 */
    const shapes = ['3 / 2', '4 / 5', '3 / 2'];
    worksEl.innerHTML = shapes.map((ratio) => `
        <div class="sk">
            <div class="sk__box" style="aspect-ratio:${ratio}"></div>
            <div class="sk__side">
                <div class="sk__bar" style="width:34px"></div>
                <div class="sk__bar" style="width:62%"></div>
                <div class="sk__bar" style="width:88%"></div>
            </div>
        </div>
    `).join('');
}

/* ---------------- 灯箱 ---------------- */

let lbIndex = -1;
let lbOpen = false;
let lbLastFocus = null;

function bindLightbox() {
    lbClose.addEventListener('click', closeLightbox);
    lbBackdrop.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', () => step(-1));
    lbNext.addEventListener('click', () => step(1));

    document.addEventListener('keydown', (e) => {
        if (!lbOpen) {
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            step(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            step(1);
        } else if (e.key === 'Tab') {
            trapFocus(e);
        }
    });

    window.addEventListener('resize', () => {
        if (!lbOpen) {
            return;
        }
        place(fitCurrent());
    });
}

function openLightbox(i, sourceEl) {
    const item = state.works[i];
    if (!item) {
        return;
    }
    lbIndex = i;
    lbOpen = true;
    lbLastFocus = sourceEl;
    lb.dataset.single = state.works.length < 2 ? '1' : '0';

    lbImg.src = item.url;
    lbImg.alt = item.title;
    fillCaption(item, i);

    lb.hidden = false;
    document.body.classList.add('is-lb');

    const box = fitCurrent();
    place(box);

    // 先让 display:none → block 落地，backdrop 才有得过渡；
    // 只等一帧 rAF 的话两次样式可能挤在同一次结算里，淡入就没了
    void lb.offsetWidth;
    lb.classList.add('is-open');

    clearAnims(lbImg);
    const from = flightFrom(sourceEl, box);

    if (reduced || !from) {
        lbImg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    } else {
        // 位移和缩放从头到尾一次插值，模糊在行程 42% 处封顶 ——
        // 停在原地淡入是「出现」，这才读得出是「飞过去」
        lbImg.animate([
            { transform: from, opacity: .3, filter: 'blur(0px)' },
            { opacity: 1, filter: 'blur(15px)', offset: .42 },
            { transform: 'none', filter: 'blur(0px)', opacity: 1 },
        ], { duration: 660, easing: 'cubic-bezier(.2,.72,.25,1)' });
    }

    lbClose.focus({ preventScroll: true });
}

function closeLightbox() {
    if (!lbOpen) {
        return;
    }
    lbOpen = false;
    lb.classList.remove('is-open', 'is-shifting');
    document.body.classList.remove('is-lb');

    // 回到它出发的那个框上（和 openLightbox 用同一个元素，来回才是同一条轨迹）
    const from = worksEl.querySelector(`.work[data-i="${lbIndex}"] .work__frame`);
    const cur = lbImg.getBoundingClientRect();
    const to = flightFrom(from, {
        left: cur.left, top: cur.top, w: cur.width, h: cur.height,
    });

    clearAnims(lbImg);
    const done = () => {
        lb.hidden = true;
        lbImg.removeAttribute('src');
    };

    if (reduced || !to) {
        lbImg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in' })
            .finished.then(done, done);
    } else {
        lbImg.animate([
            { transform: 'none', opacity: 1, filter: 'blur(0px)' },
            { opacity: .95, filter: 'blur(11px)', offset: .4 },
            { transform: to, opacity: 0, filter: 'blur(2px)' },
        ], { duration: 460, easing: 'cubic-bezier(.45,.05,.75,.3)', fill: 'forwards' })
            .finished.then(done, done);
    }

    if (lbLastFocus && document.contains(lbLastFocus)) {
        lbLastFocus.focus({ preventScroll: true });
    }
}

function step(dir) {
    const n = state.works.length;
    if (n < 2) {
        return;
    }
    goTo((lbIndex + dir + n) % n, dir);
}

/* 换图：旧图朝行进方向的**反**侧甩出去并糊掉，新图从另一侧糊着进来 */
function goTo(i, dir) {
    const item = state.works[i];
    if (!item) {
        return;
    }
    lbIndex = i;

    const box = fitCurrent();
    const paint = () => {
        lbImg.src = item.url;
        lbImg.alt = item.title;
        place(box);
        fillCaption(item, i);
        lb.classList.remove('is-shifting');
    };

    clearAnims(lbImg);

    if (reduced) {
        paint();
        return;
    }

    lb.classList.add('is-shifting');
    lbImg.animate([
        { transform: 'none', filter: 'blur(0px)', opacity: 1 },
        { transform: `translateX(${-52 * dir}px)`, filter: 'blur(13px)', opacity: 0 },
    ], { duration: 260, easing: 'ease-in', fill: 'forwards' })
        .finished.then(() => {
            clearAnims(lbImg);
            paint();
            lbImg.animate([
                { transform: `translateX(${52 * dir}px)`, filter: 'blur(13px)', opacity: 0 },
                { transform: 'none', filter: 'blur(0px)', opacity: 1 },
            ], { duration: 420, easing: 'cubic-bezier(.2,.72,.25,1)' });
        }, () => {
        });
}

function fillCaption(item, i) {
    lbTitle.textContent = item.title;
    lbDesc.textContent = item.desc || '';
    lbProv.textContent = Array.isArray(item.provinces) ? item.provinces.join(' · ') : '';
    lbIdx.textContent = `${i + 1} / ${state.works.length}`;
}

/*
 * 当前这张图的落位。摆位的数学在 js/lightbox.js（地图页共用那几个函数），
 * 这里只负责把「原图多大」喂给它。
 */
function fitCurrent() {
    const { w, h } = naturalSize();
    return fitBox(w, h);
}

/* 图和它下面那行说明一起摆 —— 换图、转屏、开灯箱都走这一个入口 */
function place(box) {
    placeImage(lbImg, box);
    placeCaption(lbCap, box);
}

/*
 * 原图尺寸直接问缩略图：两者是同一个 URL，列表里那张早就解码好了，
 * 不用等灯箱里这张大图 load 完再算，省掉一次尺寸未知的空窗。
 */
function naturalSize() {
    const item = state.works[lbIndex];
    if (!item) {
        return { w: 4, h: 3 };
    }
    const thumb = worksEl.querySelector(`.work[data-i="${lbIndex}"] .work__img`);
    if (thumb && thumb.naturalWidth) {
        return { w: thumb.naturalWidth, h: thumb.naturalHeight };
    }
    const parts = String(item.ratio || '4 / 3').split('/');
    return {
        w: parseFloat(parts[0]) || 4,
        h: parseFloat(parts[1]) || 3,
    };
}

/* 从 el 当前所在的框，飞到 box 需要的那条 transform（transform-origin 默认居中） */
function flightFrom(el, box) {
    if (!el || !box.w || !box.h) {
        return null;
    }
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) {
        return null;
    }
    const dx = (r.left + r.width / 2) - (box.left + box.w / 2);
    const dy = (r.top + r.height / 2) - (box.top + box.h / 2);
    const sx = r.width / box.w;
    const sy = r.height / box.h;
    return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
}

function clearAnims(el) {
    el.getAnimations().forEach(a => a.cancel());
}

function trapFocus(e) {
    // 不能用 offsetParent 判可见：fixed 定位的元素 offsetParent 恒为 null
    const items = [lbPrev, lbNext, lbClose].filter(el => el.getClientRects().length > 0);
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
