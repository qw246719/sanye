# 三叶修图 · 作品辑

前后端分离：`backend/` 是 SpringBoot 接口服务，`frontend/` 是原生 HTML/CSS/JS（Vite 只做开发服务器和打包，不引入任何前端框架）。

```
sanye/
├── backend/            SpringBoot，只出 JSON 接口，不托管页面
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd
│   └── src/main/java/com/sanye/
│       ├── common/     Result 统一响应 / 业务异常 / 全局异常处理
│       ├── config/     /uploads/** 静态映射 + CORS
│       ├── controller/ Work / SiteConfig / ProvinceProfile / Root
│       ├── model/      Work、SiteConfig、FontPreset、ProvinceProfile（存下来的）、ProvinceNote（PUT 的请求体）
│       └── service/    WorkService、SiteConfigService、ProvinceProfileService、FileStorageService
└── frontend/           原生三件套 + Vite
    ├── package.json
    ├── vite.config.js  开发代理：/api、/uploads -> localhost:8080
    ├── index.html      作品辑（整屏封面 + 作品列表 + 灯箱）
    ├── admin.html      后台管理页（上传 / 删除 / 换首页封面 / 设省份背景图和介绍）
    ├── map.html        作品地图（按省份看作品，点开是从右侧拉出的半屏省份详情）
    ├── public/cover.jpg    首屏封面的兜底图，后台没传过自定义封面时用它
    ├── public/china.json   中国地图的 GeoJSON，地图页的数据源（569 KB）
    ├── assets/demo/    12 张内置演示图，后端没作品时顶上
    ├── css/            style.css（公共基础）、toast.css、gallery.css、admin.css、map.css
    └── js/             api.js、gallery.js、admin.js、map.js
                        lightbox.js / demo-works.js / provinces.js（多页共用）
```

## 跑起来

要开**两个终端**，后端先启动。

**终端 1 — 后端**

```bash
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
```

跑在 http://localhost:8080 。直接访问会看到一份接口清单 JSON（不再有页面）。

**终端 2 — 前端**

```bash
cd frontend
npm install                     # 第一次需要
npm run dev
```

跑在 http://localhost:5173 ，浏览器打开：

| 页面 | 地址 |
| --- | --- |
| 作品辑（封面 + 作品列表） | http://localhost:5173/index.html |
| 作品地图（按省份看作品） | http://localhost:5173/map.html |
| 后台管理（上传/删除/换封面） | http://localhost:5173/admin.html |

改前端代码浏览器会立刻热更新，不用重启。改后端 Java 代码需要重启终端 1。

> **别直接双击 `index.html` / `map.html` 打开。** 三个页面都是 `<script type="module">`，
> 还要 `fetch()` 接口和 `china.json`，`file://` 下浏览器按 CORS 一律挡掉，`dist/` 双击也一样。
> 必须过一层静态服务器：开发时 `npm run dev`，或者拿 `npm run preview` 直接 serve `dist/`。
> 但**不要求后端**：后端没起来时作品辑和地图页都退回 `assets/demo/` 那 12 张内置演示图。

## 接口

统一返回 `{ "code": 0, "msg": "ok", "data": ... }`，`code != 0` 即业务失败，`msg` 是原因。

| 方法 | 路径 | 说明 | 参数 |
| --- | --- | --- | --- |
| GET | `/api/works` | 作品列表，新的在前（按省份分组是前端的事） | — |
| POST | `/api/work` | 新建作品 | `multipart/form-data`：`title`、`desc`(可选，≤50 字)、`provinces`(可选，可重复，省级全称)、`before`(文件)、`after`(文件) |
| DELETE | `/api/work/{id}` | 删除作品（连图片一起删） | — |
| GET | `/api/site-config` | 站点配置（首屏封面 + 文字 + 字体 id） | — |
| PUT | `/api/site-config` | 保存首屏文字 / 字体，**不碰封面** | JSON：`introText`、`fontId` |
| POST | `/api/site-config/cover` | 上传 / 替换首屏封面 | `multipart/form-data`：`file`（单张图，≤10MB） |
| DELETE | `/api/site-config/cover` | 恢复内置封面，并把上传那张删掉 | — |
| GET | `/api/fonts` | 首屏艺术字体预设列表 | — |
| GET | `/api/province-profiles` | 全部省份设置，形如 `{"四川省": {"note": "...", "cover": "/uploads/xxx.jpg"}}`，没设置过的省不在表里 | — |
| PUT | `/api/province-profile` | 保存一个省的介绍，**不碰背景图** | JSON：`province`、`note`（`note` 传空串 = 清掉这段介绍） |
| POST | `/api/province-cover` | 上传 / 替换一个省的背景图，**不碰介绍** | `multipart/form-data`：`province`、`file`（单张图，≤10MB） |
| DELETE | `/api/province-cover` | 清掉一个省的背景图（回到底色渐变），**介绍保留** | query：`province`（中文要 `encodeURIComponent`） |

图片通过 `/uploads/**` 暴露，接口返回的 `beforeUrl` / `afterUrl` / `coverUrl` 形如 `/uploads/xxx.png`，前端用 `assetUrl()` 补成完整地址。

> 页面上实际用到的是 `works` / `work`，作品辑和地图页都取 `afterUrl`；首屏封面走
> `GET /api/site-config` 的 `coverUrl`（后台那个「首页封面」面板写它）。
> `PUT /api/site-config` 和 `/api/fonts` **仍然没有前端消费方**：吃它们的首屏艺术字
> 随海洋首屏一起删了，后台的站点设置面板也拆了。后端和服务都在，只是没人调（见文末「需要注意」）。

```bash
# provinces 用重复参数传。一个省都不勾时整个参数不存在，作品归入「未归类」
curl -X POST http://localhost:8080/api/work \
  -F "title=海边人像精修" -F "desc=等了四十分钟，浪才拍到礁石上" \
  -F "provinces=四川省" -F "provinces=西藏自治区" \
  -F "before=@before.jpg" -F "after=@after.jpg"

curl -X DELETE http://localhost:8080/api/work/1

# 保存某个省的介绍（JSON 带中文，同上，从 UTF-8 文件读）
curl -X PUT http://localhost:8080/api/province-profile \
  -H 'Content-Type: application/json' --data-binary @note.json

# 传一个省的背景图。province 是表单字段，中文同样得从文件读（见下面那条）
curl -X POST http://localhost:8080/api/province-cover \
  -F "province=<province.txt" -F "file=@cover.jpg"

curl -X DELETE "http://localhost:8080/api/province-cover?province=%E5%9B%9B%E5%B7%9D%E7%9C%81"
```

> 在 Git Bash 里测中文标题会乱码（shell 按本地码页编码参数），改成从文件读：
> `-F "title=<title.txt"`（文件存 UTF-8）。浏览器上传不受影响。
>
> 同理，任何带中文的 JSON 请求体别直接写在 `-d` 里，用 `--data-binary @body.json`
> 从 UTF-8 文件读，否则后端会报 `JSON parse error: Invalid UTF-8`。
>
> **multipart 的文本字段更阴**：`-F "province=四川省"` 不会报错，那几个字节会被
> 当成合法的「另一个字符串」收下（GBK 的 `四川省` 被当 UTF-8 解就成了乱码省名），
> 于是表里多出一个谁也点不开的键。要么用 `-F "province=<province.txt"` 从文件读，
> 要么干脆用浏览器 / Node 的 `FormData` 走一遍（`frontend/js/api.js` 就是这么发的，
> 浏览器一定发 UTF-8，后端也一定按 UTF-8 解）。

## 前后端怎么连上的

前端 JS 里**没有写死后端地址**，一直用相对路径 `/api/...`、`/uploads/...`：

- **开发**：Vite 开发服务器按 `vite.config.js` 的 `server.proxy` 转发到 `localhost:8080`。所以开发时**不需要 CORS**，图片也不会挂。
- **生产**：`npm run build` 出 `dist/`，交给 Nginx 托管，同时把 `/api` 和 `/uploads` 反代到后端：

```nginx
server {
    listen 80;
    root /var/www/sanye/dist;

    location /api/     { proxy_pass http://127.0.0.1:8080; }
    location /uploads/ { proxy_pass http://127.0.0.1:8080; }

    location / { try_files $uri $uri/ =404; }
}
```

- **前后端不同域名**（前端 CDN、后端 `api.xxx.com`）：在 `frontend/.env.local` 写一行
  `VITE_API_BASE=https://api.xxx.com` 即可，代理就不需要了（此时后端的 CORS 配置已允许跨域）。

## 前端实现要点

**首屏**（`.hero` + `driveHero()`）

封面整屏钉在顶部 —— 用 `position: sticky` 而不是 `fixed`：布局高度照常占一屏，后面的正文自然接上，移动端地址栏伸缩时也不会跳。往下滚时 JS 把「滚了多远」归一化成 `p`（0 → 1，滚满一屏正好是 1），再摊到几件事上：封面化开、变暗、往下沉，标题比照片先一步让开。「变暗」是**封了顶**的 —— 遮罩最多到 0.65，不是全黑，因为 `.flow` 是磨砂的、采样的就是这块首屏，压到全黑的话列表滚下去背后就什么都看不见了。正文 `.flow` 带圆角顶边盖在封面之上，四个角上还留着一点封面，读起来才像「一张纸压上去」，而不是画面切了一下。

- **`.flow` 是磨砂的，不是不透明的**：半透明的 `rgba(8, 8, 10, α)` + `backdrop-filter: blur(24px)`，封面从纸底下虚着透出来。两层黑各有分工 —— 半透明底色保证文字背后永远是糊的、没有细节的颜色，虚化只负责好看；老浏览器上 `backdrop-filter` 不生效时，光靠底色也还读得清。**α 就是「能看到多少后面的图」那个旋钮**（现在在 `.6` 一带），往 `.45` 以下压，亮照片上的小字就开始糊了。顶边那片 `box-shadow` 从 `.8` 收到 `.35`，否则纸一透，它会在照片上压出一条黑带。
- **「化开」不是逐帧改 `filter: blur()`** —— 那样每帧都要重新栅格化整屏，必掉帧。这里是两层同一张图叠着：底层锐利，上层用常量 `blur(30px)` 提前糊好、放大 1.14（补掉模糊啃掉的边缘透明），JS 只推它的 `opacity`。全程只碰 `transform` 和 `opacity`，都是合成器属性，不触发布局也不重绘。
- **`.hero` 不再在 `p >= 1` 时设 `visibility: hidden`**。那句原本是省一层合成用的，现在不能留：磨砂底靠 `backdrop-filter` 采样背后那层，首屏一 hidden，磨砂会在滚满一屏的那一刻从「照片」闪成「纯黑」。代价是首屏那张图整页都留在合成树里。**性能吃紧的话，这里和 `.flow` 的 `backdrop-filter` 是最先该怀疑的两处** —— 想省就先把虚化撤掉、只留半透明的底色，或者把 `visibility` 加回来并接受那道闪。
- 驱动只在 `scroll` 里挂一次 rAF。

**封面图从哪来**：HTML 里写死的 `src="/cover.jpg"` 是**内置兜底**（直接给上 `src`，首屏不会先黑一下，后端没起来或 JS 出错时也还有图）。`applyCover()` 另外拉一次 `GET /api/site-config`，`coverUrl` 非空才换掉。换的时候有两个约束：

1. **两层必须同 URL。** 上层是预先糊好的那层，`driveHero()` 只推它的 `opacity`，同一张图才读得出「化开」；换成两张不同的图会变成两个画面 crossfade。
2. **先 `decode()` 再同帧赋值。** 两个 `<img>` 各自从 pending 切到 current 的时机不保证一致，只推一个的话，`heroSoft` 的 opacity 卡在中间值时会闪一帧「锐利层还是旧图、模糊层已是新图」的鬼影。

换过之后还会给两层挂一次性的 `error` 兜底：这张图日后取不到了（`uploads/` 被清掉、配置指向了不存在的文件）就退回内置那张，否则首屏是一张碎图加一块黑遮罩。

**作品列表**（`js/gallery.js` + `css/gallery.css`）

一行一件，左图右文、下一件左右对调（`grid-column` / `grid-row` 互换），照片旁边就是自己写的那句话。窄屏塌成单列，照片永远在上面。

1. **入场**：`.work` 初始是 `opacity: 0` + `translateY(34px)` + `blur(16px)`，IntersectionObserver 按从上到下的顺序错峰加 `.is-in` 浮上来，和封面化开是同一套语言。`transitionend` 里把 `filter` 摘成 `none`，否则每件作品都永久挂一个合成图层。
2. **图片自己再化开一次**：`.work__ph` 是按标题哈希调出来的深色渐变占位（明度卡在 12%~9%，只分得出彼此、不抢照片）加一道流光；`load` → `decode()` 完成后加 `.is-loaded`，占位淡出、图从 `blur(18px) scale(1.06)` 化开（`--dl` 让同屏到达的图错开 110ms）。
   - `renderWorks` 里那句 `void worksEl.offsetWidth` **不能删**：不先强制结算一次初始态的话，命中缓存的小图可能在同一次样式结算里就从「模糊、透明」跳到「加载完成」，transition 没有可比的「前值」，化开的效果整段丢掉。
   - 加载失败（`.is-failed`）要停掉流光，否则那张图会一直装作还在加载。
3. **灯箱**走 FLIP：量缩略图的 `getBoundingClientRect()` 和目标框，算出 `translate + scale` 一条 transform 插值到底；模糊在行程 42% 处封顶 —— 停在原地淡入是「出现」，模糊有峰值才读得出是「飞过去」。关灯箱原路飞回缩略图。左右切换是旧图朝行进方向的反侧甩出去并糊掉、新图从另一侧糊着进来。灯箱的目标尺寸直接问列表里那张缩略图要 `naturalWidth/Height`（同一个 URL，早就解码好了），不用等灯箱里这张大图 load 完再算，省掉一次尺寸未知的空窗。背景用 `backdrop-filter` 虚化页面本身而不是纯色遮罩，景深拉开照片才浮起来。
   - 灯箱必须是 `.flow` 的**兄弟节点**：祖先一旦有 `filter`（`.work` 入场时就有）就会成为包含块，里面的 `position: fixed` 就不再相对视口定位了。

`prefers-reduced-motion` 下位移和模糊全部撤掉，只留淡入淡出（首屏那层糊图仍然跟着 `p` 淡进来，但封面本身不位移不缩放）。

**页脚**：只剩一条细带加几个链接（回到顶部 / 作品地图 / 后台管理）。原先那行分类整个删了。

**进地图的入口有两个，互斥**：首屏时顶栏 `.bar` 还收在屏幕外（它是靠 `body.is-past` 滑下来的），所以右上角常驻一个 `.map-fab`；滚过封面之后 `.bar` 下来，`.map-fab` 淡出并 `pointer-events: none`（过渡那 0.35s 里两个入口会同时可见，不收点击会跟顶栏抢）。这里不需要新的滚动监听，`body.is-past` 已经在切了。`.bar` 里那两个链接包了一层 `.bar__links`：`.bar` 自己是 `space-between`，直接塞第三个子元素会被摆到正中间。

**作品地图**（`map.html` + `js/map.js` + `css/map.css`）

一张中国地图，有作品的省泛一点绿光，点开看那一省的详情。四件值得记下来的事：

1. **ECharts 按需引入，而且钉在 5.x**（`package.json` 里是 `^5.6.0`）。`npm i echarts` 现在会装 6.x，默认主题和个别选项跟这里调好的不是一回事，别顺手升。按需这套组合是够用的：`MapChart` + `TooltipComponent` + `CanvasRenderer`，`registerMap` 在 `echarts/core` 上；`series.type: 'map'` **不需要 `GeoComponent`**（那是独立的 `geo` 组件才要的），`roam` 在 5.x 也已经内置。打包出来约 435 KB（gzip 145 KB）。
2. **`china.json` 放 `public/`，用裸路径 `/china.json` 取。** 它是静态资源，不进 JS bundle，也不该套 `assetUrl()` —— 那个只给后端的 `/uploads/` 补域名，套上前端 CDN + 后端分域名部署会把它指到后端去（`/cover.jpg` 同理）。
3. **省名必须写官方全称**（`四川省` 而不是 `四川`），ECharts 是拿它跟 GeoJSON 里 feature 的 `properties.name` 做字符串匹配的。九段线那个 feature 的 `name` 是空串（`adcode` 是 `100000_JD`），地图上要画，但会被 `map.js` 从「已知省份」集合里滤掉，免得出现一个能 hover 能点的幽灵省份。
4. **作品进不了地图有两条路**：`provinces` 是空表，或者一个省名都对不上 `china.json`。两条都归进左下角那个「未归类作品 (N)」，不会让作品凭空消失。后端**不**校验省名白名单（在 Java 里再抄一份 34 个省名就是第三份副本了），所以拼错的省名最坏是掉进未归类，`map.js` 会给这些名字打一条 `console.warn`，不静默。

灯箱复用首页那套外观：`js/lightbox.js` 里的 `fitBox` / `placeImage` / `placeCaption` 是两边共用的纯函数（`.lb__img` 和 `.lb__cap` 在 CSS 里没有宽高也没有 `top`，位置全靠它们算出来写进 style），地图页**只有单张**，不做 FLIP 飞行、没有左右切换，提示语也改成「ESC 关闭」。

`map.css` 里有三处对 `gallery.css` 的必要覆盖，都是实测会咬的：`.lb` 从 `z-index: 60` 提到 200（否则灯箱会被 160 的详情层盖住）、`html` 的 `scrollbar-gutter` 改回 `auto`（地图页不滚动，`stable` 会在右边留一条约 15px 的缝）、`html, body` 锁成 `height: 100%; overflow: hidden`。

层级从下到上：地图 → 顶栏/未归类入口 `100` → 详情层 `160` → 灯箱 `200` → 提示条 `300`。详情层夹在中间是必须的：得盖住顶栏，又得被灯箱盖住。

**省份详情**（点地图上有作品的省，或者左下角那个「未归类作品」）

从右侧拉出的**半屏面板，不是新页面** —— 只盖住右边（`--detail-w: clamp(460px, 60vw, 940px)`，窄屏覆盖成 `100vw`），左边的地图仍然露着。地图的缩放平移状态也留在下面，返回时还是刚才那张图，不用重画也不用重拉数据。从上到下：该省在后台配的**背景图**当 Hero、左上角固定的圆形返回按钮、右上角作品数、一行年份、省名大标题、省份介绍（后台可改，见下）、一行统计（打卡次数 / 第一次 / 最近）、「省份影像」标题紧跟着一句「已更新 2026.05.14」，最后是一面两列照片墙。文字一律**靠左**，但分两条竖线：Hero 里的年份、省名、介绍贴得更靠边（`--head-pad`，1440 屏上 26px），下面正文那列（统计 / 区块标题 / 照片墙）走站点通用的 `--pad`（72px）。这个错开是有意的，理由见下面的条目。

几个实现上的点：

- **照片墙的比例是排出来的，不是随机的**：`map.js` 里一张 `WALL_SHAPE` 表按 `i % 6` 循环（宽 / 两条竖 / 宽 / 两条方）。随机那种每次刷新拼出来的都不一样，图是散的。墙上**不复用首页 `.work` 那套「按原图比例撑开」** —— 几十张比例各异的图逐张撑开，两列的高度差会拉到没法看，统一裁成固定几个比例才是一面墙。
- **日期取不到就写「—」，不编一个假的**：`createTime` 是 0（演示图就是这样）时不推算日期出来。
- **返回接的是浏览器历史**：打开时 `history.pushState`，关闭时 `history.back()`（有个 `closing` 标志挡住连点，`history.back()` 是异步的，连点两下会一路退回上一个页面）。手机上的返回手势、浏览器的返回键因此都是关掉详情，而不是退出整个地图页 —— 那两下会把缩放位置一起丢掉。`popstate` 回调里只收详情、**不再**调 `history.back()`，否则会多退一步。
- 没作品的省点了没反应（按需求）；未归类一件都没有时，那个入口整个收起来 —— 一个点了没反应的按钮不如不放。演示数据里那条空省份是故意留的，好让这个入口有东西可点。
- 详情是 `role="dialog" aria-modal="true"`，`Tab` 被圈在里面。判断可聚焦元素用的是 `getClientRects()` 而**不是** `offsetParent` —— 返回按钮是 `position: fixed`，fixed 元素的 `offsetParent` 恒为 `null`，用它会把按钮自己筛掉，`Shift+Tab` 就漏到后面顶栏去了。
- **面板这一层不能加 `transform`**（`translate` / `scale` 这些独立属性同样不行）：`.detail__back` 是 `position: fixed`、靠视口定位，`.detail` 一旦带上有值的 transform 就成了它的包含块，按钮会改成相对面板定位、并跟着面板内容一起滚走。所以面板入场只做淡入，不做位移。返回按钮的 `left` 写成 `calc(100vw - var(--detail-w) + var(--pad))` —— 面板贴右边、宽 `--detail-w`，它的左缘就是 `100vw - --detail-w`；写成 `left: var(--pad)` 会跑到视口左边、盖在露出来的地图上。窄屏把 `--detail-w` 覆盖成 `100vw`，这个算式自动退化成 `var(--pad)`，不用另写一条。
- **`.detail__head` / `.detail__body` 上不能写 `max-width` + `margin: 0 auto`**：面板宽 60vw 之后它比 760px 宽，`auto` 外边距会把整块内容居中，在 `--pad` 之外又叠一层内缩（1440 屏上 52px，1920 屏上 90px），标题就跟左上角的返回按钮错开了。内容一律靠左。「省份影像」那行的「已更新」同理，不再用 `space-between` 甩到面板最右边 —— 面板最宽 940px，两端对齐会把它甩出 700 多像素，跟标题断成两块。
- **Hero 里的文字比正文更贴左边，是故意的**：`.detail__head` 用自己的一份 `--head-pad: clamp(20px, 1.8vw, 30px)`，不跟正文共用 `--pad`。Hero 是铺满整块面板的图，省名和介绍站在它自己的左缘；1440 屏上名字内缩 26px、正文内缩 72px。窄屏（≤390px 一带）两者都退到 20px、看不出差别，只有宽屏才错开。别看到数值不一样就把两处"统一"掉。
- 注意返回按钮在 `--pad` 那条线（正文那一列），不在 `--head-pad` 那条 —— 它跟省名横向差着 40 多像素，纵向隔着大半个 Hero，视觉上是个浮动控件，不跟着标题走。

**省份设置**：省份本身是固定的（跟着 `china.json` 的 feature 名走，改不了），能改的是这个省的两样东西 —— 顶上那张**背景图**，和它下面那段**介绍**。存在 `data/province-profiles.json`，就是一个 `{"四川省": {"note": "…", "cover": "/uploads/…"}}` 的表，走 `ProvinceProfileService`（落盘方式和另外两个 Service 一样：先写 `.tmp` 再原子替换）。

> 单独一个 Service 配一份文件，而**不是**往 `SiteConfig` 里加字段：那份配置加字段得同时改 `copyOf` / `normalize` / `update` 三处，漏一处就静默丢数据（下面「需要注意」里记着这条）。这里一个省一个键，写成 Map 更贴合，后台存一个省也碰不到别的省。

几条容易改坏的约定：

- **两个字段各走各的接口，每个只动自己那个**。保存介绍不会碰背景图，换背景图也不会碰介绍 —— 后台那两块也是各自提交的。后端的方法是拿当前记录起手、只覆盖自己那个字段，而不是从零 `new` 一个（跟 `SiteConfigService.update()` 不碰 `coverUrl` 是同一条理由）。
- **省名要先验再存图**。`updateCover()` 里 `checkProvince()` 在 `fileStorageService.save()` **之前**：反过来的话省名不合法会抛异常，而那张图已经落在 `uploads/` 里了，没有任何记录指着它，成了永远清不掉的孤儿。
- **传空串只是清掉那个字段，不是删键**；两个字段都空了，这个键才从表里整个消失。所以「清空介绍」不会顺手把这个省的背景图一起弄没。
- **`get()` 返回的是深拷贝**。值是 `ProvinceProfile` 这种可变对象，直接把内存里那份交出去，调用方理论上能改到当前表的状态（`Map<String,String>` 那会儿没这个问题，值是不可变的字符串）。
- **`load()` 走 `JsonNode` 逐条读，不直接映射成 `Map<String, ProvinceProfile>`**：手改坏的文件里出现 `{"四川省": null}` 或者值不是对象的形态时，直接映射要么抛异常让后端起不来，要么塞一个字段全是 `null` 的对象进内存。现在读不出字符串就当空串，两个字段都空的整条丢掉。

**后台上传**（`js/admin.js`）：`FormData` 组装 `title/desc/provinces/before/after` 直接 POST；省份是一排 chip 按钮（`aria-pressed` 就是选中态，不再单独存一个类），清单来自本地常量 `provinces.js`、在 `bindEvents()` 阶段渲染一次，**不能跟着 `init()` 走** —— 接口一失败点「重试」就会把用户已经勾好的省份清掉。描述框的 `maxlength` 与 `DESC_MAX` 都是 50，右边挂一个字数计数器（后端 `WorkService` 里还有一道校验防绕过）；选完文件用 `URL.createObjectURL` 本地预览（换文件时 `revokeObjectURL` 释放）；删除走 confirm + `DELETE`。

> 这里有个 `formEl.reset()` 的坑：chip 不是表单控件（没有 `name`，也不是 `input`/`select`/`textarea`），`reset()` 会**静默跳过**它。提交成功后不手动把每个 chip 的 `aria-pressed` 置回 `false` 的话，下一次上传会悄悄沿用上一次勾的省份。同理 chip 必须写 `type="button"`，否则在 `<form>` 里点一下就触发提交。

**省份设置**（同一个 `js/admin.js`，`admin.html` 里第三块面板）：一个省份下拉 + 背景图预览/选择/上传/恢复默认 + 一个 textarea + 保存按钮。下拉的选项和那排 chip 一样来自本地常量 `provinces.js`、在 `bindEvents()` 里渲染一次（理由同上）；整张表是**单独一条 GET、自己带 catch**，失败只让这块面板自己说明情况，不连累作品列表。切换省份时如果当前内容没保存 —— 介绍改过、**或者只是选了图还没上传** —— 会 `confirm` 拦一下（页面别处也是这么问的，不做第二套弹窗），切过去会清掉选中的文件，不拦就传错省了。`maxlength` 与 `NOTE_MAX`（200）一致，后端 `ProvinceProfileService` 里还有一道校验防绕过。

> 两个接口返回的都是这个省保存后的**完整记录**，所以本地那张表直接拿返回值覆盖就行（`setProfile()`），不用自己拼「哪个字段该留、哪个该清」；两个字段都空时把它从本地表里删掉，和后端的规则对齐。
>
> 预览框没传图时显示的是**一句说明**而不是破图，所以没复用 `showPreview()` 那个「未选择」的默认话术，给它加了个 `emptyText` 参数。另外渲染服务器那张图要在清 input **之前** —— 清的时候会 `revokeObjectURL`，预览里还挂着那个地址就是个破图。

**首页封面**（同一个 `js/admin.js`）：`POST /api/site-config/cover` 传单张图，`DELETE` 恢复内置那张。这块面板是**写死在 `admin.html` 里**的（不像作品列表每次增删都整体重建），所以它的监听跟着其它静态元素一起只在 `bindEvents()` 里绑一次；拉配置是**单独一条请求、自己带 catch**，不并进作品列表那个 `Promise.all` —— 那个一旦失败就整页渲染「加载失败」，封面接口偶发失败不该连累列表。预览显示的是「当前生效的那张」，没传过自定义封面就是内置的 `/cover.jpg`。

> 这里有个容易踩的点：`.btn` 是 `display: inline-flex`，作者样式压得过浏览器默认的 `[hidden]{display:none}`，所以「恢复默认」按钮光加 `hidden` 属性是藏不住的，`admin.css` 里补了条 `.cover-actions .btn[hidden]`。

## 数据存哪

原型阶段没上数据库：

- 图片 → `backend/uploads/{uuid}.{ext}`（只允许图片后缀，删除时防 `../` 越权）
- 作品元数据 → `backend/data/works.json`（改一次写一次，先写 `.tmp` 再原子替换）
- 站点配置 → `backend/data/site.json`（同上；首屏封面 URL + 一段文字 + 字体 id）
- 首屏封面图不吃单独的存储，就是 `uploads/` 里的普通一张图，`site.json` 只记它的 URL；换封面时旧文件会被删掉，恢复默认也会删

两个目录都在 `.gitignore` 里。作品的省份就存在 `works.json` 每条的 `provinces` 数组里（省级全称，一件作品可以有多个省）；省份背景图和介绍在 `data/province-profiles.json`（`app.province-profile-file` 可配，**文件不存在就一直不存在**，第一次保存才生成）；字体预设写死在 `SiteConfigService#init`，要接数据库只改 Service，Controller 不动。

## 需要注意

- 上传限制单张 10MB / 单请求 24MB，在 `backend/src/main/resources/application.yml` 调。
- **后台页面没有任何登录校验**，谁能访问 `admin.html` 谁就能删作品。上线前必须加鉴权。
- 后端 CORS 目前是 `allowedOriginPatterns("*")`（`config/WebConfig.java`）。走代理时用不到；如果直接跨域调用，上线前应收窄成具体域名。
- 后端 CORS 的 `allowedMethods` 里**必须有 `PUT`**（站点配置用它）。漏了的话走 Vite 代理（同源）看不出问题，但按上面那条「前后端不同域名」部署时会被浏览器挡掉。
- **首屏封面现在可以在后台换**：`admin.html` 的「首页封面」面板传一张图，URL 存进 `site.json` 的 `coverUrl`。HTML 里那个 `src="/cover.jpg"` 退成**兜底**（没传过自定义封面、后端没起来、或者 `onerror` 兜底触发时用它），所以 `frontend/public/cover.jpg` 别删。两个代价：
  - 设了自定义封面的站点，浏览器可能已经先开始拉那张 751KB 的兜底图，随后被 JS 换 `src` 打断。换 `src` 会中止上一个请求，浪费有上限（通常几十 KB 就断了），但**理论上存在「内置封面先画出来、再换成自定义封面」的闪一下**。要彻底消除就得把 HTML 里的 `src` 拿掉、等配置回来再设，那样每次首屏都要先黑着等一个网络往返 —— 对这个站不划算，所以没那么做。
  - 封面就是首屏 LCP 那张图，**服务端不做压缩和缩放**。别传手机原图，对齐内置那张 1920×1200 的量级，否则首屏会明显变慢。
- **作品图的宽高没有存进 `works.json`**，前台列表只能先按 4:3 猜、等图加载完再按真实比例校正（`createWork` 的 `reveal()` 里改 `aspect-ratio`），所以图片偏高或偏宽时，滚动中会看到一次轻微位移。要根治就让后端在上传时把宽高一起存下来（`ImageIO.read()` 就能读），前端把 `ratio` 换成真实值就行。
- **「分类」这个概念整个删掉了**（`Category` / `CategoryService` / `CategoryController` / `GET /api/category` / 后台那个下拉 / 页脚那行）。取而代之的是 `Work.provinces`，按省份浏览。改动前 `works.json` 里已有的作品都没有省份，**一律变成「未归类」**，要后台逐个补选；`categoryId` 和它原本指的分类之间没有可换算的关系，所以没写迁移脚本，下次落盘 `persist()` 就会把 `categoryId` 永久抹掉 —— 这是有意的，不是 bug。
- **`provinces` 存的是省名全称，和 `frontend/public/china.json` 里 feature 的 `properties.name` 必须一字不差**。换了地图数据就要同步重抽 `frontend/js/provinces.js`（那是给后台 chip 列表用的，地图本身是从 GeoJSON 现取的，不引这个文件）。后端不做白名单校验，拼错的省名不会报错，只会让作品掉进「未归类」。
- **省份设置是单独一份文件，不是 `SiteConfig` 的字段**（`data/province-profiles.json`，一个省一个键）。所以它**不受**上面那条「加字段要同时改三处」的约束；反过来说，往里加东西也别指望 `SiteConfig` 那套 `normalize` 会兜住它 —— 它自己在 `load()` 里逐条判类型、滤掉空键和空记录。**两个字段都空 = 删键**，不是存一条空记录。
- **详情页的 Hero 背景图是后台按省传的，不再自动取该省最新作品的成片**。传一件新作品不会把省的脸换掉。没传过的省就是没有 `<img>` 的 `src`（`map.js` 里用 `removeAttribute('src')`，不能赋空串 —— 那在某些浏览器里会被当成「相对当前页」，白白发一次请求回来一个 HTML），`.detail__hero` 那层深色渐变露出来，这是**有意的兜底**，不是缺省态。`alt` 一律留空：那张图是纯装饰，上面压着遮罩和整个标题块，读屏念一遍文件名只会添乱。
- **地图页的省份设置只在打开时拉一次**，另外挂了个 `visibilitychange`：标签重新可见时静默重拉一遍（去后台改完切回来就能看到），失败什么都不说。它**不能复用 `init()`** —— 那里面要重新 `registerMap`，ECharts 会报重复注册。已经打开着的详情面板不跟着变（内容在用户眼皮底下换掉太跳），返回再点开就是新的。
- **站点设置只剩封面在用**。前台艺术字那套（表单、`js/fonts.js`、`css/style.css` 的 `--font-art`）已经拆掉，`PUT /api/site-config` 和 `/api/fonts` 现在没有前端消费方，首页只 `GET /api/site-config` 取 `coverUrl`。**这几个类现在不能顺手删了** —— 首屏封面就挂在 `SiteConfig` 上。真要清理，只能删 `FontPreset` / `/api/fonts` / `update()` 那条链，同时把 `SiteConfig` 的 `introText`、`fontId` 一起摘掉。
- **`PUT /api/site-config` 改的是文字和字体，不碰封面**。后端 `update()` 是拿 `copyOf(current)` 起手再覆盖 `introText`/`fontId`，而不是从零 `new` —— 否则每存一次文字就会把 `coverUrl` 抹成 null。以后往 `SiteConfig` 加字段，记得同时改 `copyOf()` / `normalize()` / `update()` 这三处，漏一处就会丢配置。
- 依赖参数名反射的写法（`@RequestParam` 不写名字）在 IDEA 直接编译时会失效，因为 IDEA 默认不加 `-parameters`。本项目所有 `@RequestParam`/`@PathVariable` 都写了显式名字，别改回去。
