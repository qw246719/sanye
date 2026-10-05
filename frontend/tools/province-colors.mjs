/* 生成 js/map.js 里那张「省 -> 颜色」表（PROVINCE_COLORS）。
 *
 *   node frontend/tools/province-colors.mjs
 *
 * 为什么要有这个脚本、而不是直接手写那张表：
 *   地图页要「一省一色」，同时**地理上挨着的省不能撞色**（两个连着的色块一个色，
 *   铺在地图上很显眼）。34 个省手排一定排不对，而且错了不报错。
 *   这里按陆地邻接做一遍图着色，脚本自己会验一遍「任何一对相邻的省都不同色」。
 *
 * 改完把输出整段贴回 js/map.js 的 PROVINCE_COLORS —— 那个常量上面的注释会指回这里。
 *
 * ⚠️ 动 china.json（多出省名）之后要重跑；色板本身改了也要重跑。
 *    省名必须和 china.json 的 properties.name 逐字一致。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));   // frontend/tools
const FRONTEND = path.resolve(HERE, '..');

const NAMES = JSON.parse(fs.readFileSync(path.join(FRONTEND, 'public/china.json'), 'utf8'))
    .features.map(f => f.properties && f.properties.name).filter(Boolean);

/* 陆地相邻。海南/台湾 是岛，没有陆地邻接；港澳只挨着广东。 */
const NEIGHBORS = {
    '北京市': ['河北省', '天津市'],
    '天津市': ['北京市', '河北省'],
    '河北省': ['北京市', '天津市', '辽宁省', '内蒙古自治区', '山西省', '河南省', '山东省'],
    '山西省': ['河北省', '内蒙古自治区', '陕西省', '河南省'],
    '内蒙古自治区': ['黑龙江省', '吉林省', '辽宁省', '河北省', '山西省', '陕西省', '宁夏回族自治区', '甘肃省'],
    '辽宁省': ['吉林省', '内蒙古自治区', '河北省'],
    '吉林省': ['黑龙江省', '辽宁省', '内蒙古自治区'],
    '黑龙江省': ['吉林省', '内蒙古自治区'],
    '上海市': ['江苏省', '浙江省'],
    '江苏省': ['山东省', '安徽省', '浙江省', '上海市'],
    '浙江省': ['上海市', '江苏省', '安徽省', '江西省', '福建省'],
    '安徽省': ['江苏省', '浙江省', '江西省', '湖北省', '河南省', '山东省'],
    '福建省': ['浙江省', '江西省', '广东省'],
    '江西省': ['安徽省', '浙江省', '福建省', '广东省', '湖南省', '湖北省'],
    '山东省': ['河北省', '河南省', '安徽省', '江苏省'],
    '河南省': ['河北省', '山西省', '陕西省', '湖北省', '安徽省', '山东省'],
    '湖北省': ['河南省', '安徽省', '江西省', '湖南省', '重庆市', '陕西省'],
    '湖南省': ['湖北省', '江西省', '广东省', '广西壮族自治区', '贵州省', '重庆市'],
    '广东省': ['福建省', '江西省', '湖南省', '广西壮族自治区', '香港特别行政区', '澳门特别行政区'],
    '广西壮族自治区': ['广东省', '湖南省', '贵州省', '云南省'],
    '海南省': [],
    '重庆市': ['湖北省', '湖南省', '贵州省', '四川省', '陕西省'],
    '四川省': ['重庆市', '贵州省', '云南省', '西藏自治区', '青海省', '甘肃省', '陕西省'],
    '贵州省': ['重庆市', '湖南省', '广西壮族自治区', '云南省', '四川省'],
    '云南省': ['广西壮族自治区', '贵州省', '四川省', '西藏自治区'],
    '西藏自治区': ['云南省', '四川省', '青海省', '新疆维吾尔自治区'],
    '陕西省': ['山西省', '河南省', '湖北省', '重庆市', '四川省', '甘肃省', '宁夏回族自治区', '内蒙古自治区'],
    '甘肃省': ['内蒙古自治区', '宁夏回族自治区', '陕西省', '四川省', '青海省', '新疆维吾尔自治区'],
    '青海省': ['甘肃省', '四川省', '西藏自治区', '新疆维吾尔自治区'],
    '宁夏回族自治区': ['内蒙古自治区', '陕西省', '甘肃省'],
    '新疆维吾尔自治区': ['甘肃省', '青海省', '西藏自治区'],
    '台湾省': [],
    '香港特别行政区': ['广东省'],
    '澳门特别行政区': ['广东省'],
};

/* 色板：和站里那支绿同一个调门 —— hsl(H, 42%, 60%)，只换色相。
   8 支的**顺序**按位反转排（90,270,180,0,135,315,225,45），让贪心最先用到的
   几支色相离得最远。要是按 90/135/180/… 的顺序，前四支全是绿，等于白做。 */
const SAT = .42, LIGHT = .60;
const HUE_STEPS = [90, 270, 180, 0, 135, 315, 225, 45];

function hslToHex(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const seg = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
    return '#' + seg.map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

const PALETTE = HUE_STEPS.map(h => hslToHex(h, SAT, LIGHT));

/* 90° 那支（绿）直接换成 gallery.css 里的 --accent。
   算出来的 hsl(90,42%,60%) = #99C46E，和 --accent 的 #9BC46F 差 1~2/255 ——
   肉眼看不出来，但代码里留着两个「几乎一样却不相等」的绿，早晚被人当 bug 改。
   读 CSS 变量而不是写死，省得以后改了 --accent 这里还留着旧值。 */
const ACCENT = (fs.readFileSync(path.join(FRONTEND, 'css/gallery.css'), 'utf8')
    .match(/--accent:\s*(#[0-9A-Fa-f]{3,6})/) || [])[1];
if (!ACCENT) throw new Error('没在 css/gallery.css 里找到 --accent');
PALETTE[HUE_STEPS.indexOf(90)] = ACCENT.toUpperCase();

/* 摊色：每步在「邻省没用过的色」里挑**目前用得最少**的那支，不是 first-fit。
   中国的省界邻接图正好是 4 着色的 —— first-fit 只用 4 支，绿的一家占 18 个省，
   铺出来又是「大部分都绿」，等于没做。这样摊完每支 4~5 个省。 */
const assign = {};
const useCount = HUE_STEPS.map(() => 0);
for (const name of NAMES) {
    const taken = new Set((NEIGHBORS[name] || []).map(n => assign[n]).filter(v => v !== undefined));
    let best = null;
    for (let i = 0; i < HUE_STEPS.length; i++) {
        if (taken.has(i)) continue;
        if (best === null || useCount[i] < useCount[best]) best = i;
    }
    assign[name] = best;
    useCount[best]++;
}

/* ---- 自检：错了就别往 map.js 里贴 ---- */
let errs = 0;
for (const [a, list] of Object.entries(NEIGHBORS)) {
    for (const b of list) {
        if (!NAMES.includes(b)) { console.log(`❌ 邻接表里写了不存在的省名：${a} -> ${b}`); errs++; }
        if (!(NEIGHBORS[b] || []).includes(a)) { console.log(`❌ 邻接不对称：${a} -> ${b}，但 ${b} 里没写 ${a}`); errs++; }
    }
}
for (const n of NAMES) if (!(n in NEIGHBORS)) { console.log(`❌ 邻接表漏了这个省：${n}`); errs++; }
for (const [a, list] of Object.entries(NEIGHBORS)) {
    for (const b of list) if (assign[a] === assign[b]) { console.log(`❌ 相邻撞色：${a} 和 ${b} 都是 ${assign[a]}`); errs++; }
}
if (errs) { console.log(`\n${errs} 个问题，先修邻接表再重跑`); process.exit(1); }

const used = [...new Set(Object.values(assign))].sort((a, b) => a - b);
console.log(`用了 ${used.length} 支颜色：`, used.map(i => `${i}=${PALETTE[i]}`).join('  '));
const byColor = {};
for (const [n, i] of Object.entries(assign)) (byColor[i] ||= []).push(n);
for (const i of used) console.log(`  ${PALETTE[i]}  ${byColor[i].map(n => n.replace(/(省|市|自治区|特别行政区|壮族|回族|维吾尔)/g, '')).join(' ')}`);

console.log('\n---- 整段贴进 js/map.js 的 PROVINCE_COLORS ----\n');
console.log('const PROVINCE_COLORS = {');
for (const n of NAMES) console.log(`    '${n}': '${PALETTE[assign[n]]}',`);
console.log('};');
