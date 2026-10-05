/* ============================================================
   作品地图页

   - 画一张中国地图：没作品的省只有描边，有作品的省各自亮起一点颜色
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
import { findProvince } from './city-map.js';

// series.type:'map' 用不着 GeoComponent（那是独立的 geo 组件才要的），
// roam 在 ECharts 5 也已经内置，不用额外引组件
echarts.use([MapChart, TooltipComponent, CanvasRenderer]);

const els = {
    map: document.getElementById('map'),
    boot: document.getElementById('boot'),
    uncat: document.getElementById('uncatEntry'),
    journey: document.getElementById('journey'),
    journeyToggle: document.getElementById('journeyToggle'),
    journeyCities: document.getElementById('journeyCities'),
    journeyProvinces: document.getElementById('journeyProvinces'),
    journeyCoverage: document.getElementById('journeyCoverage'),
    journeyBar: document.getElementById('journeyBar'),
    journeyBarFill: document.getElementById('journeyBarFill'),
    journeyDays: document.getElementById('journeyDays'),
    journeyPhotos: document.getElementById('journeyPhotos'),
    journeyList: document.getElementById('journeyList'),
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
    mapSearch: document.getElementById('mapSearch'),
    mapSearchInput: document.getElementById('mapSearchInput'),
    mapSearchBtn: document.getElementById('mapSearchBtn'),
};

/* 强调色不写常量：gallery.css 里的 --accent 已经是唯一事实来源，
   这边再抄一份 RGB，将来改配色时就是漏改一处。
   —— 唯一的例外是下面 PROVINCE_COLORS：亮起来的那块地有自己的色板。
   这里仍是**全站**的强调色（进度条、聚焦环、未归类入口那些），没被取代。 */
const ACCENT = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#9BC46F').trim();
const ACCENT_RGB = hexToRgbTriple(ACCENT);

/** '#9BC46F' / '#9cf' -> '155, 196, 111'，拿来拼各种透明度 */
function hexToRgbTriple(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.replace(/./g, c => c + c) : h;
    const n = parseInt(full, 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/* 每个省亮起来用哪支颜色。

   ⚠️ 这张表是**算出来的，别手改**。脚本在 `$CLAUDE_JOB_DIR/tmp/color-provinces.mjs`：
   拿 34 个省按**陆地邻接**做了一遍图着色，保证「地理上挨着的省一定不同色」。
   手改一定会排出两个相邻的省同色 —— 那正是这次要解决的事，而且铺在地图上
   一眼就能看出来（两个连着的色块一个色）。
   动了色板、或者 china.json 多出省名，就重跑一遍脚本再整段替换。
   ↳ 省名必须和 china.json 里的 `properties.name` 逐字一致（`内蒙古自治区` 这种全称），
     写错一个这个省就不上色、悄悄退回 --accent 那支绿。

   色板是 8 支 `hsl(H, 42%, 60%)` —— 和站里那支绿同一个明度和饱和度，只换色相，
   所以在暗底上轻重一致，不会有的省扎眼有的省看不见。
   第一支（那支绿）就是 `--accent` 本身，不是另算一个差不多的绿 —— 脚本会去
   `gallery.css` 里读，省得站里漂着两个「几乎一样却不相等」的绿。其余 7 支是算的。
   8 支的**顺序**是位反转排过的（90°→270°→180°→0°→135°→315°→225°→45°）：
   摊色时最先用到的那几支色相拉得最开，免得前四支全是绿、看着还是「都一个色」。

   为什么不是 first-fit 尽量少用色：中国的省界邻接图正好 4 着色，first-fit 只用 4 支，
   绿的一家占 18 个省，铺出来又是「大部分都绿」。现在每支 4~5 个省，摊平。 */
const PROVINCE_COLORS = {
    '北京市': '#9BC46F',
    '天津市': '#996EC4',
    '河北省': '#6EC4C4',
    '山西省': '#C46E6E',
    '内蒙古自治区': '#6EC484',
    '辽宁省': '#C46EAE',
    '吉林省': '#6E84C4',
    '黑龙江省': '#C4AE6E',
    '上海市': '#9BC46F',
    '江苏省': '#996EC4',
    '浙江省': '#6EC4C4',
    '安徽省': '#C46E6E',
    '福建省': '#6EC484',
    '江西省': '#C46EAE',
    '山东省': '#6E84C4',
    '河南省': '#C4AE6E',
    '湖北省': '#9BC46F',
    '湖南省': '#996EC4',
    '广东省': '#6EC4C4',
    '广西壮族自治区': '#C46E6E',
    '海南省': '#6EC484',
    '重庆市': '#C46EAE',
    '四川省': '#6E84C4',
    '贵州省': '#C4AE6E',
    '云南省': '#9BC46F',
    '西藏自治区': '#996EC4',
    '陕西省': '#6EC4C4',
    '甘肃省': '#C46E6E',
    '青海省': '#6EC484',
    '宁夏回族自治区': '#C46EAE',
    '新疆维吾尔自治区': '#6E84C4',
    '台湾省': '#C4AE6E',
    '香港特别行政区': '#9BC46F',
    '澳门特别行政区': '#996EC4',
};

/** 这个省该用哪支色。表里没有（china.json 以后多出省名）就退回落回 --accent */
function provinceRgb(name) {
    return hexToRgbTriple(PROVINCE_COLORS[name] || ACCENT);
}

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 省名 -> 该省的作品（新的在前） */
const byProvince = new Map();
/** provinces 一个都没匹配上、以及省名为空的作品 */
const uncategorized = [];
/**
 * china.json 里出现过的省级名（全称）。九段线那个 feature 的 name 是空串，不进来。
 * 「旅途印记」里那个覆盖率的分母就是它的 size（34 个省级行政区）。
 * 由 index() 灌一次，之后只读。
 */
const knownProvinces = new Set();
/**
 * 全部作品，一件算一次。
 * 不能拿 byProvince 拼出来 —— 一件跨两省的作品在里面出现两次，
 * 「珍藏照片」会平白多算一张。
 */
let allWorks = [];
/** 省名 -> { note, cover }。后台可改；没设置过的省不在表里 */
let profiles = {};

/** 详情此刻展示的那批，照片按 data-i 回查 */
let detailWorks = [];

let chart = null;

/**
 * 地址栏上那条「进来就开某个省」的指令是不是已经处理过了。
 * 见底下的 openFromQuery()。
 */
let linked = false;

/* 照片墙的节奏：宽 / 两条竖 / 宽 / 两条方，按序号循环。
   写死一张表而不是用 i % 3 之类的算式 —— 想调拼接方式时一眼就能看出改哪儿 */
const WALL_SHAPE = ['is-wide', 'is-tall', 'is-tall', 'is-wide', 'is-square', 'is-square'];

/* ---------------- 起手 ---------------- */

init();

async function init() {
    let geo;
    try {
        const res = await fetch(import.meta.env.BASE_URL + 'china.json');
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
    currentGeo = geo;
    renderMap(geo);

    /* 地图画完了：淡进来，同时把「载入中」收掉。
       这个类由 JS 加（CSS 那边地图默认就是 opacity: 1），
       所以脚本整个挂掉时地图照样看得见，只是没有淡入 */
    els.map.classList.add('is-ready');
    els.boot.classList.add('is-gone');

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

    // 和首页同一条规矩：后端有作品就用后端的，一件都没有（或连不上）
    // 就用内置演示图 —— 两边看到的必须是同一批，不然地图上的亮点对不上列表
    const usingDemo = !toWorks(works).length;
    apply(geo, usingDemo ? DEMO_WORKS.map(w => ({ ...w, time: 0 })) : toWorks(works));

    /* 数据到位了才有 byProvince / uncategorized 可查，所以放在 apply 之后 */
    openFromQuery();
}

/**
 * 「人生足迹时间轴」那一页点一条会跳到
 * `map.html?province=<省全称>` 或 `map.html?uncat=1`，在这儿把它兑现：
 * 直接打开那个省的详情（跟点地图上那块地、点左下角那个入口是同一套）。
 *
 * 三条纪律：
 * - **只做一次**（`linked`）。这条是**防未来的**：现在它只挂在 init() 末尾、
 *   一次性的，加不加都不会重复弹。但 apply() 会在切回标签页时重跑，
 *   哪天有人图省事把它挪进 apply()，没有这个标志位就会每次切回来弹一次面板。
 * - **先把查询串从地址栏擦掉**，再让 openDetail 去压它自己那条 history。
 *   不擦的话关掉详情后 URL 还挂着 ?province=…，刷新一下又弹一次。
 * - **认不出来就什么都不做**（省名拼错、china.json 以后改名、
 *   「未归类」这会儿是空的）。安静地停在地图上，不弹错 ——
 *   跟这一页别处的兜底口径一致。
 */
function openFromQuery() {
    if (linked) {
        return;
    }
    linked = true;

    const query = new URLSearchParams(location.search);
    const province = query.get('province');
    const wantUncat = query.get('uncat');
    if (!province && !wantUncat) {
        return;
    }

    // 走完这一步，浏览器里那条记录就是干净的 /map.html 了
    history.replaceState(null, '', location.pathname);

    if (province && byProvince.has(province)) {
        openDetail(province, byProvince.get(province), null, true);
    } else if (wantUncat && uncategorized.length) {
        openDetail('未归类', uncategorized, null, true);
    }
}

/**
 * 后端回来的作品 -> 地图页自己那份。演示图结构已经和它对齐（见 demo-works.js），
 * 所以两条路走的是同一套渲染代码。
 */
function toWorks(list) {
    return (list || []).map(w => ({
        id: w.id,
        title: w.title || '未命名',
        desc: w.desc || '',
        city: String(w.city == null ? '' : w.city).trim(),
        provinces: Array.isArray(w.provinces) ? w.provinces : [],
        url: assetUrl(w.afterUrl),
        // 拍摄日期，没填是 0。只给「旅途天数」用 —— 它必须是真的拍摄日期，
        // 不能拿上传时间顶替
        takenAt: Number(w.takenAt) || 0,
        /* 排序和「第一次 / 最近」用的时间：拍摄日期优先，没填的落回上传时间。
           演示图两个字段都没有，落成 0，统计那行会显示成「—」 */
        time: Number(w.takenAt) || Number(w.createTime) || 0,
    })).filter(w => w.url);
}

/** 作品到货（或重新到货）后统一走这一遍：分省 -> 画各省的色块 -> 两个入口 -> 统计面板 */
function apply(geo, works) {
    index(geo, works);
    chart.setOption({ series: [{ data: seriesData() }] });
    renderEntries();
    renderJourney();
}

/* 省份设置和作品都是起手拉一次的。去后台传完新作品、或者改完某个省的介绍，
   切回这个标签页面上还是旧的 —— 监听可见性，切回来就静默重拉一次。
   两份数据各拉各的、各失败各的，失败什么都不说：这是顺手刷新，
   不该为它弹一条红提示。
   （不能复用 init()：那里面会重新 registerMap，ECharts 会报重复注册） */
document.addEventListener('visibilitychange', () => {
    /* 只认「变成可见」。切走那一刻也发一次事件，那次拉回来没人看得到，
       而且很快就又切回来了 */
    if (document.hidden) {
        return;
    }
    refreshProfiles();
    refreshWorks();
});

async function refreshProfiles() {
    try {
        const next = await fetchProvinceProfiles();
        profiles = next || {};
    } catch (e) {
        /* 静默：地图页本来就不靠这份数据活着 */
    }
}

/* 作品这边不能只重拉列表：点亮的省、未归类那个数字、右边那块统计面板
   全是从 byProvince / uncategorized / allWorks 里算出来的，得整条重跑一遍。
   index() 自己会先清空那几张表（见那里的注释），不会越滚越多。
   演示图那一段不重跑：真·后端作品为空时它不是「加载失败」而是「还没有作品」，
   刷新一次不该把演示图换成一片空地图 */
async function refreshWorks() {
    /* 详情开着的时候不刷：面板里正摊着某个省的照片墙，脚下把它换掉，
       用户看到的和 detailWorks 里那批就不是一回事了。关掉详情再看 */
    if (detailOpen || !chart) {
        return;
    }
    let next;
    try {
        next = await fetchWorks();
    } catch (e) {
        return;
    }
    const real = toWorks(next);
    if (!real.length) {
        return;
    }
    // 详情那层已经挡住右边面板了，但地图上那些亮起来的省就在眼前，没必要晃这一下
    apply(currentGeo, real);
}

/** init() 拿到的那份 GeoJSON。重拉作品时要重跑 index()，得留着 */
let currentGeo = null;

/**
 * 把作品摊到省份上。
 *
 * 省名用**全称**（"四川省" 而不是 "四川"），ECharts 是拿它跟 GeoJSON 里
 * feature 的 properties.name 做字符串匹配的。
 *
 * 每次调用都先清空那几张表再灌一遍，所以它是**幂等**的，可以重跑
 * （切回标签页重拉作品时要重跑一次）。原来是只往后 push 的，
 * 跑第二遍就会把每件作品数两遍。
 */
function index(geo, works) {
    byProvince.clear();
    uncategorized.length = 0;
    knownProvinces.clear();
    allWorks = works;

    // 九段线那个 feature 的 name 是空串（adcode 100000_JD）。它得留在图上，
    // 但不能进这个集合，否则会多出一个能 hover 能点的幽灵省份
    geo.features.forEach(f => {
        const name = f.properties && f.properties.name;
        if (name) {
            knownProvinces.add(name);
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
            if (!knownProvinces.has(name)) {
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
            w.prov = '';
            uncategorized.push(w);
            return;
        }
        /* 跨省的作品（川藏线那种）在好几个省里都算一份，点它那一行进哪个省
           就随第一个 —— 「最近的回忆」那一行只点得开一个省，不做二级选择 */
        w.prov = names[0];
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

/** 有作品的省：各自泛一点自己的光。空表就全都不亮 */
function seriesData() {
    return Array.from(byProvince, ([name, list]) => {
        /* 每个省自己的那支色。描边、投影、渐变全从它派生 —— 改成「一省一色」
           之前这几处写的是 ACCENT_RGB，只换 areaColor 的话，紫省的边框会还是绿的 */
        const rgb = provinceRgb(name);
        return {
            name,
            value: list.length,
            itemStyle: {
                /* 竖着的渐变：上缘亮、下缘沉下去。一块平涂的色在整张描线地图上
                   显得像贴纸，有一点明暗就成了「亮起来的地区」 */
                areaColor: areaGradient(rgb, .34, .13),
                borderColor: `rgba(${rgb}, .7)`,
                borderWidth: .8,
                shadowBlur: 26,
                shadowColor: `rgba(${rgb}, .42)`,
            },
            /* 每个点亮起来的省都得自己写一份 emphasis。
               系列级那条 emphasis 是给描线省份用的（很淡的白），只用系列级的话，
               鼠标一压到亮省上，颜色会被它整个盖成灰白 —— 越悬停越不像「有作品」。
               压到哪个省就用哪个省自己的色变亮（不是全站那支绿）。 */
            emphasis: {
                itemStyle: {
                    areaColor: areaGradient(rgb, .55, .26),
                    borderColor: `rgba(${rgb}, .95)`,
                    borderWidth: 1.2,
                    shadowBlur: 36,
                    shadowColor: `rgba(${rgb}, .62)`,
                },
            },
        };
    });
}

/** 省这块的竖向渐变：两个 stop 是同一支色的两个透明度 */
function areaGradient(rgb, topAlpha, bottomAlpha) {
    return {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
            { offset: 0, color: `rgba(${rgb}, ${topAlpha})` },
            { offset: 1, color: `rgba(${rgb}, ${bottomAlpha})` },
        ],
    };
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
                /* 有作品的省在省名前点一个小点，一眼看出哪个点得开。
                   点的颜色跟着**这个省自己那支色**，不是固定那支绿 —— 省份
                   一省一色之后，悬停一个红省、旁边杵个绿点，看着像 bug。
                   色值走行内（和上面 extraCssText 同一个做法），CSS 那边只留形状。 */
                const dot = list
                    ? `<span class="map-tip__dot" style="background:${PROVINCE_COLORS[p.name] || ACCENT};box-shadow:0 0 8px rgba(${provinceRgb(p.name)}, .75)"></span>`
                    : '';
                return `${dot}${escapeHtml(p.name)}<br><span class="map-tip__n">${n}</span>`;
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
            /* 起手（data 还是空表）和作品到货后那次 setOption 都走这套时长。
               后一次是「哪个省亮起来」那一瞬，慢一点才看得出是在亮 */
            animationDuration: 900,
            animationEasing: 'cubicOut',
            animationDurationUpdate: 750,
            animationEasingUpdate: 'cubicOut',
            itemStyle: {
                /* 不填色块这条没变，但不能是全透明 —— 全透明时整张地图只剩
                   一层描线，漂在黑底上像一张网。给一点极淡的填充，陆地才
                   成其为一块「地」，那些描线也才有东西可圈。

                   色相特意偏暖（214, 202, 184，砂纸那种灰），跟底子上的
                   冷色光晕分开：海是冷的，陆是暖的。全是中性灰的时候，
                   整页就只剩深浅，怎么调都是一片黑 */
                areaColor: 'rgba(214, 202, 184, .042)',
                borderColor: 'rgba(242, 240, 236, .24)',
                borderWidth: .6,
            },
            emphasis: {
                /* 悬停某个省时，别的省淡下去 —— 不然鼠标扫过去，
                   一整片描线都在那儿，看不出当前指的是哪一块 */
                focus: 'self',
                label: { show: true, color: '#F2F0EC', fontSize: 11 },
                itemStyle: {
                    areaColor: 'rgba(242, 240, 236, .085)',
                    borderColor: 'rgba(242, 240, 236, .8)',
                    borderWidth: 1,
                    shadowBlur: 16,
                    shadowColor: 'rgba(242, 240, 236, .16)',
                },
            },
            /* 别的省淡下去，但只淡到 .5 —— 再低整张图就没了。
               描线本来就细，压到 .3 的时候页面上只剩悬停的那一块，
               看着像地图加载失败 */
            blur: {
                itemStyle: { opacity: .5 },
                label: { show: false },
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

    /* 光标：只有「有作品的省」是能点的，得让手型说出来。
       ECharts 不给这个能力（画布就一个 cursor），所以按 mouseover 自己切类。
       globalout 是兜底 —— 直接从省上滑出画布时不一定补一次 mouseout */
    chart.on('mouseover', p => {
        if (p.name && byProvince.has(p.name)) {
            els.map.classList.add('is-hot');
        }
    });
    chart.on('mouseout', () => els.map.classList.remove('is-hot'));
    chart.on('globalout', () => els.map.classList.remove('is-hot'));

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
/** 这一层是从时间轴那条深链开出来的（不是在地图上点出来的），见 closeDetail */
let fromTimeline = false;

/**
 * @param {string} title  省名（全称）或「未归类」
 * @param {Array}  works  该省的作品
 * @param {Element|null} sourceEl  触发元素，关闭后焦点还给它
 * @param {boolean} fromLink  是不是从时间轴的深链进来的
 */
function openDetail(title, works, sourceEl, fromLink = false) {
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
    fromTimeline = fromLink;

    els.detail.hidden = false;
    els.detail.scrollTop = 0;
    // 先让浏览器认下 hidden 撤掉后的这一帧，再加 is-open，
    // 否则过渡会被同一帧的两处改动合并掉、看不到淡入
    void els.detail.offsetWidth;
    els.detail.classList.add('is-open');

    /* 往 history 里压一条，这样手机上的返回手势 / 浏览器的返回键
       是关掉详情，而不是直接退出整个地图页（那两下就丢掉缩放位置了）。

       ⚠️ 深链那一层（从时间轴点城市进来的）**不压**。它不是「盖在地图页上的
       面板」，而是「从时间轴过来看一眼这个省」—— 压了的话栈是
       「时间轴 → 地图 → 详情」，关掉只退回「地图」那一格，人还停在地图上，
       回不去时间轴。不压就是「时间轴 → 地图」，关掉 = 退回上一条 = 时间轴，
       浏览器返回键也走同一条路，两边一致。 */
    if (!pushed && !fromTimeline) {
        history.pushState({ detail: title }, '');
        pushed = true;
    }

    /* 按钮的 aria-label 默认是「返回地图」，深链进来时它其实回的是时间轴。
       改掉 —— 读屏和悬停提示都得跟实际去向一致 */
    els.detailBack.setAttribute('aria-label', fromTimeline ? '返回时间轴' : '返回地图');
    els.detailBack.title = fromTimeline ? '返回时间轴' : '返回地图';

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

    /* 从时间轴过来的：关掉这一层 = 离开地图页、回时间轴。
       上面没压记录，所以 history.back() 退的那一格就是时间轴本身。
       用 back() 而不是 location.href：往回退不往历史里多堆一格，
       而且浏览器返回键跟这个按钮走的是同一条路。
       history.length 那个判断是给「直接开链接 / 新标签页打开」用的 ——
       那种情况历史里没有上一条，back() 是空操作，closing 会卡住、
       按钮从此变成死的，所以改成显式跳过去。 */
    if (fromTimeline) {
        closing = true;
        if (history.length > 1) {
            history.back();
        } else {
            location.href = 'timeline.html';
        }
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
    fromTimeline = false;
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
    /* --i 是入场错峰用的序号（map.css 里的 riseIn）。封顶在 12：
       一面墙几十张的话，最后那张要等好几秒才浮上来，那不是入场是卡顿 */
    const step = Math.min(i, 12);
    return `
        <button class="dphoto ${WALL_SHAPE[i % WALL_SHAPE.length]}" type="button" data-i="${i}"
                style="--i:${step}">
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

/* ============================================================
   右侧的「旅途印记」面板

   数字全部是数出来的，没有一个近似值：
     到访城市总数 —— 作品的 city 字段去重（没填的不算）
     足迹遍布 N 个省份 —— byProvince.size
     中国省份覆盖率 —— 分子同上，分母是 china.json 里的省名个数
     旅途天数 —— 填了拍摄日期的作品里 max - min 再加 1
     珍藏照片 —— 作品数 × 2（每件前后各一张）
   ＊
   「旅途天数」特意不用上传时间凑：那个数只能反映「我什么时候开始往站上囤照片」，
   和旅途本身没关系。一条拍摄日期都没有时它显示「—」，不编一个数出来。
   ============================================================ */

/** 「最近的回忆」此刻列出的那几件，点行时按 data-i 回查 */
let recentWorks = [];

const JOURNEY_ROWS = 3;

function renderJourney() {
    const cities = new Set();
    allWorks.forEach(w => {
        const city = String(w.city == null ? '' : w.city).trim();
        if (city) {
            cities.add(city);
        }
    });

    const days = tripDays();
    els.journeyCities.textContent = String(cities.size);
    els.journeyProvinces.textContent = byProvince.size
        ? `足迹遍布 ${byProvince.size} 个省份`
        : '还没有点亮任何省份';

    const total = knownProvinces.size;
    const lit = byProvince.size;
    els.journeyCoverage.textContent = total ? `${lit} / ${total}` : '—';
    const pct = total ? Math.round((lit / total) * 100) : 0;
    els.journeyBarFill.style.width = `${pct}%`;
    // 读屏读的是 aria-valuenow 那个数，不是 CSS 的宽度
    els.journeyBar.setAttribute('aria-valuenow', String(lit));
    els.journeyBar.setAttribute('aria-valuemax', String(total || 0));

    els.journeyDays.textContent = days === null ? '—' : String(days);
    els.journeyPhotos.textContent = String(allWorks.length * 2);

    renderRecent();
}

/**
 * 旅途天数：有拍摄日期的作品里，最早那天到最近那天一共多少天（含头含尾）。
 * 一条拍摄日期都没有就是 null —— 调用方显示「—」。
 *
 * 先把时间戳归到当地零点再相减（除一天取整），不直接拿毫秒差算天数：
 * 中间隔着一个夏令时的话，毫秒差会差出一小时，除以一天正好落成 .99，
 * 取整就少了一天。
 */
function tripDays() {
    const stamps = [];
    allWorks.forEach(w => {
        const t = Number(w.takenAt) || 0;
        if (t > 0) {
            stamps.push(t);
        }
    });
    if (!stamps.length) {
        return null;
    }

    const dayOf = ts => {
        const d = new Date(ts);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };
    const first = dayOf(Math.min(...stamps));
    const last = dayOf(Math.max(...stamps));
    return Math.round((last - first) / 86400000) + 1;
}

function renderRecent() {
    /* 最近的那几件。time 已经是「拍摄日期优先、没填的落回上传时间」，
       所以这一列和省份详情里的「最近」是同一个口径 */
    recentWorks = allWorks
        .slice()
        .sort((a, b) => (b.time || 0) - (a.time || 0))
        .slice(0, JOURNEY_ROWS);

    if (!recentWorks.length) {
        els.journeyList.innerHTML = '<p class="journey__empty">还没有作品</p>';
        return;
    }

    els.journeyList.innerHTML = recentWorks.map((w, i) => `
        <button class="journey__row" type="button" data-i="${i}" style="--i:${i}">
            <span class="journey__thumb">
                <img src="${escapeHtml(w.url)}" alt="" loading="lazy" decoding="async">
            </span>
            <span class="journey__text">
                <span class="journey__row-top">
                    <span class="journey__city">${escapeHtml(cityLabel(w))}</span>
                    ${w.time ? `<span class="journey__date">${ymd(w.time)}</span>` : ''}
                </span>
                <span class="journey__desc">${escapeHtml(w.desc || '')}</span>
            </span>
        </button>
    `).join('');
}

/* 这一行显示的城市：优先作品自己填的城市；没填就退到它匹配上的省名；
   连省份都没匹配上就是「未归类」。别的作品都填了城市、就它没填时，
   一行空着比写个「未填」更难看 */
function cityLabel(w) {
    return String(w.city || '').trim() || w.prov || '未归类';
}

/* ---------------- 搜索定位 ---------------- */

/**
 * 输入城市（或省份），把它归到省份（city-map.js 那张表），
 * 再放大定位到那块地。认不出来就弹一条红提示，不静默。
 */
function searchProvince(input) {
    const name = findProvince(input);
    if (!name) {
        toast(`没找到「${String(input).trim()}」对应的省份`, 'err');
        return;
    }
    if (!locateToProvince(name)) {
        toast(`「${name}」在地图上认不出来`, 'err');
        return;
    }
    toast(`已定位到 ${name}`);
}

/**
 * 把地图缩放到某个省。
 *
 * 用 series 的 `center` / `zoom` 直接 setOption，而不是 geoRoam：
 *   geoRoam 的 originX/originY 是按「这个省此刻在屏幕上哪儿」算的，
 *   第一次搜完已经缩到 A 省，第二次搜 B 省时 B 在画布外面，
 *   convertToPixel 给的是画布外的坐标，geoRoam 就不动换了。
 *   center/zoom 是绝对定位 —— 不管当前停在哪儿，都把这个省的中心
 *   拉到视口正中、按 zoomFor 算好的倍数放大。
 *
 * `center` 取 china.json 里这个省的 center（不写死经纬度，
 *   地图数据换省就跟着换）；`zoom` 按省的大小算一个合适的倍数。
 */
function locateToProvince(name) {
    if (!chart || !currentGeo) {
        return false;
    }
    const feat = currentGeo.features.find(f => f.properties && f.properties.name === name);
    if (!feat) {
        return false;
    }
    const center = feat.properties.center || feat.properties.centroid;
    if (!center) {
        return false;
    }
    chart.setOption({
        series: [{
            type: 'map',
            map: 'china',
            center,
            zoom: zoomFor(feat),
        }],
    });
    /* 定位完让这块地亮一下（hover 的强调样式），告诉用户「就是这儿」。
       1.5s 后再按下去 —— 一直亮着会把后面真正 hover 时的那下闪烁挤掉 */
    chart.dispatchAction({ type: 'highlight', seriesIndex: 0, name });
    setTimeout(() => {
        chart.dispatchAction({ type: 'downplay', seriesIndex: 0, name });
    }, 1500);
    return true;
}

/** 按省的经度跨度算一个合适的放大倍数，上下限兜住极端（北京 / 新疆） */
function zoomFor(feat) {
    const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    (function walk(cs) {
        if (typeof cs[0] === 'number') {
            b.minX = Math.min(b.minX, cs[0]);
            b.maxX = Math.max(b.maxX, cs[0]);
            b.minY = Math.min(b.minY, cs[1]);
            b.maxY = Math.max(b.maxY, cs[1]);
            return;
        }
        cs.forEach(walk);
    })(feat.geometry.coordinates);

    /* 中国东西约 62 度经度；地图起手 zoom 1.05 时全图正好铺满。
       让这个省的跨度约占屏六成（系数 .62 留出边距）*/
    const span = Math.max(b.maxX - b.minX, 0.01);
    const zoom = 1.05 * (62 / span) * 0.62;
    return Math.min(8, Math.max(3.2, zoom));
}

/* 回车（type=search 的输入框在 form 里）和点「搜」按钮都走 submit，
   一个监听就够 */
els.mapSearch.addEventListener('submit', e => {
    e.preventDefault();
    searchProvince(els.mapSearchInput.value);
});

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

/* 「最近的回忆」点一行 -> 开这件作品所在省的详情。
   这件作品跨了好几个省的话进第一个（见 index() 里写的 w.prov），
   这里不做二级选择 —— 那一行本来就是个快捷入口。
   sourceEl 传这一行，详情关掉后焦点正好还回来 */
els.journeyList.addEventListener('click', e => {
    const row = e.target.closest('.journey__row');
    if (!row) {
        return;
    }
    const w = recentWorks[Number(row.dataset.i)];
    if (!w) {
        return;
    }
    if (w.prov && byProvince.has(w.prov)) {
        openDetail(w.prov, byProvince.get(w.prov), row);
    } else if (uncategorized.length) {
        openDetail('未归类', uncategorized, row);
    }
});

/* 窄屏那个开合按钮。桌面上它是 display: none，点不到，
   所以不用按屏宽再判一次 */
els.journeyToggle.addEventListener('click', () => {
    const open = els.journey.classList.toggle('is-open');
    els.journeyToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});

/** 窄屏那块面板收起来。桌面上它是常驻的（没有 is-open 这个类），这里就是空操作 */
function closeJourney() {
    if (!els.journey.classList.contains('is-open')) {
        return;
    }
    els.journey.classList.remove('is-open');
    els.journeyToggle.setAttribute('aria-expanded', 'false');
    els.journeyToggle.focus({ preventScroll: true });
}

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
        /* 一层压一层：灯箱在最上面，往下是详情，最下面是窄屏那块面板。
           ESC 每次只关最上面那层 */
        if (viewerOpen) {
            closeViewer();
        } else if (detailOpen) {
            closeDetail();
        } else {
            closeJourney();
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
    /* 地图都没画出来，右边那块统计面板（和窄屏上开它的按钮）一块收起来 ——
       页面上就剩一句错误说明，不再挂着一堆 0 */
    els.journey.hidden = true;
    els.journeyToggle.hidden = true;
    // 地图没画出来，别让「载入中」一直转着骗人
    els.boot.classList.add('is-gone');
}
