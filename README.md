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
│       ├── model/      Work、SiteConfig、FontPreset、ProvinceProfile（存下来的）、ProvinceNote / WorkMeta（PUT 的请求体）
│       └── service/    WorkService、SiteConfigService、ProvinceProfileService、FileStorageService
└── frontend/           原生三件套 + Vite
    ├── package.json
    ├── vite.config.js  开发代理：/api、/uploads -> localhost:8080
    ├── index.html      作品辑（整屏封面 + 作品列表 + 灯箱）
    ├── admin.html      后台管理页（上传 / 删除 / 换首页封面 / 设省份背景图和介绍）
    ├── map.html        作品地图（按省份看作品，点开是从右侧拉出的半屏省份详情）
    ├── timeline.html   人生足迹时间轴（按年份把去过的城市串成一条竖线）
    ├── public/cover.jpg    首屏封面的兜底图，后台没传过自定义封面时用它
    ├── public/china.json   中国地图的 GeoJSON，地图页的数据源（569 KB）
    ├── public/map-bg.jpg   地图页的背景照片（2560×1440，从 4K 原图重编码，0.45 MB）
    ├── tools/          province-colors.mjs（生成省→色表，不要手改那张表）
    ├── assets/demo/    12 张内置演示图，后端没作品时顶上
    ├── css/            style.css（公共基础）、toast.css、gallery.css、admin.css、map.css、timeline.css
    └── js/             api.js、gallery.js、admin.js、map.js、timeline.js
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
| 人生足迹时间轴（按年份看走过的城市） | http://localhost:5173/timeline.html |
| 后台管理（上传/删除/换封面） | http://localhost:5173/admin.html |

改前端代码浏览器会立刻热更新，不用重启。改后端 Java 代码需要重启终端 1。

> **别直接双击 `index.html` / `map.html` 打开。** 四个页面都是 `<script type="module">`，
> 还要 `fetch()` 接口和 `china.json`，`file://` 下浏览器按 CORS 一律挡掉，`dist/` 双击也一样。
> 必须过一层静态服务器：开发时 `npm run dev`，或者拿 `npm run preview` 直接 serve `dist/`。
> 但**不要求后端**：后端没起来时作品辑和地图页都退回 `assets/demo/` 那 12 张内置演示图。

## 接口

统一返回 `{ "code": 0, "msg": "ok", "data": ... }`，`code != 0` 即业务失败，`msg` 是原因。

| 方法 | 路径 | 说明 | 参数 |
| --- | --- | --- | --- |
| GET | `/api/works` | 作品列表，新的在前（按省份分组是前端的事） | — |
| POST | `/api/work` | 新建作品 | `multipart/form-data`：`title`、`desc`(可选，≤50 字)、`provinces`(可选，可重复，省级全称)、`city`(可选，≤20 字)、`takenAt`(可选，毫秒，当地零点，缺省 0)、`before`(文件)、`after`(文件) |
| PUT | `/api/work/{id}` | **只改**拍摄城市和拍摄日期，别的字段一个都不动 | JSON：`city`、`takenAt`（空串 / 0 = 清掉） |
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

> 页面上实际用到的是 `works` / `work`（后台补填城市和日期时用 `PUT /api/work/{id}`），
> 作品辑和地图页都取 `afterUrl`；首屏封面走
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

# 补填 / 修改拍摄城市和日期。两个字段**总是全量下发**：空串 = 清掉城市，0 = 清掉日期
curl -X PUT http://localhost:8080/api/work/1 \
  -H 'Content-Type: application/json' --data-binary @meta.json

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

一张中国地图，有作品的省各自亮起一点颜色（**一省一色**，见下面「配色与动效」那节），点开看那一省的详情。四件值得记下来的事：

1. **ECharts 按需引入，而且钉在 5.x**（`package.json` 里是 `^5.6.0`）。`npm i echarts` 现在会装 6.x，默认主题和个别选项跟这里调好的不是一回事，别顺手升。按需这套组合是够用的：`MapChart` + `TooltipComponent` + `CanvasRenderer`，`registerMap` 在 `echarts/core` 上；`series.type: 'map'` **不需要 `GeoComponent`**（那是独立的 `geo` 组件才要的），`roam` 在 5.x 也已经内置。打包出来约 435 KB（gzip 145 KB）。
2. **`china.json` 放 `public/`，用裸路径 `/china.json` 取。** 它是静态资源，不进 JS bundle，也不该套 `assetUrl()` —— 那个只给后端的 `/uploads/` 补域名，套上前端 CDN + 后端分域名部署会把它指到后端去（`/cover.jpg` 同理）。
3. **省名必须写官方全称**（`四川省` 而不是 `四川`），ECharts 是拿它跟 GeoJSON 里 feature 的 `properties.name` 做字符串匹配的。九段线那个 feature 的 `name` 是空串（`adcode` 是 `100000_JD`），地图上要画，但会被 `map.js` 从「已知省份」集合里滤掉，免得出现一个能 hover 能点的幽灵省份。
4. **作品进不了地图有两条路**：`provinces` 是空表，或者一个省名都对不上 `china.json`。两条都归进左下角那个「未归类作品 (N)」，不会让作品凭空消失。后端**不**校验省名白名单（在 Java 里再抄一份 34 个省名就是第三份副本了），所以拼错的省名最坏是掉进未归类，`map.js` 会给这些名字打一条 `console.warn`，不静默。

灯箱复用首页那套外观：`js/lightbox.js` 里的 `fitBox` / `placeImage` / `placeCaption` 是两边共用的纯函数（`.lb__img` 和 `.lb__cap` 在 CSS 里没有宽高也没有 `top`，位置全靠它们算出来写进 style），地图页**只有单张**，不做 FLIP 飞行、没有左右切换，提示语也改成「ESC 关闭」。

`map.css` 里有三处对 `gallery.css` 的必要覆盖，都是实测会咬的：`.lb` 从 `z-index: 60` 提到 200（否则灯箱会被 160 的详情层盖住）、`html` 的 `scrollbar-gutter` 改回 `auto`（地图页不滚动，`stable` 会在右边留一条约 15px 的缝）、`html, body` 锁成 `height: 100%; overflow: hidden`。

层级从下到上：地图 → 顶栏/未归类入口 `100` → 「旅途印记」面板 `120` → 详情层 `160` → 灯箱 `200` → 提示条 `300`（窄屏那个 `.journey-toggle` 按钮在 `130`，要浮在抽屉上面）。详情层夹在中间是必须的：得盖住顶栏和面板，又得被灯箱盖住。

**人生足迹时间轴**（`timeline.html` + `js/timeline.js` + `css/timeline.css`）

地图页看的是「去过哪些省」，这一页看的是「什么时候去的」：一条竖线 + 每条的圆点，年份做头（旅程计数 + 一句寄语），下面是城市条目（城市名 / 日期 / 旅行备注），点一条跳回地图页看那个省的作品。入口在地图页顶栏右侧（`.map-bar__links`，跟首页 `.bar__links` 是同一个做法 —— `.map-bar` 是 `space-between`，不包一层直接塞第二个子元素会被摆到正中间）。

**数据全部来自已有的 `/api/works`，后端一行没动。**

- **一条足迹 = 一件 `city` 非空 且 `takenAt > 0` 的作品。** 组内按 `takenAt` 倒序、年份头按年份倒序（越近越靠上）。
- **`takenAt` 为 0 的不排进来，也绝不用 `createTime` 顶替** —— 那是上传时间，拿它排出来的就不是足迹而是上传记录了。跟地图页「旅途天数」不认 `createTime` 是同一条理由。
- **一件作品一条**：同城不同日期就是两条；两件同城同日会并排出现两条看着像重复的行。**不合并** —— 合并了不知道该留哪条的备注。
- **有城市、没日期的不静默丢掉**：页面底部给一句「另有 N 件作品没填拍摄日期，没排进来」。跟地图页「未归类」是同一条规矩：可以不入列表，但不能凭空消失、也不该看着像 bug。
- **「旅行备注」直接复用 `Work.desc`**。地图页「最近的回忆」那几行本来就是 `city` + 日期 + `desc` 这个三件套，两边显示的是同一组东西，所以复用不需要在后台多填一个框、也不用加字段。代价：改作品描述会同时改掉时间轴上那一行。想拆开就得在 `Work` 上加第三个字段，再把后台那一行和 `WorkService` / `WorkController` / `api.js` 各跟一处。
- **年份寄语是前端写死的一张表**（`js/timeline.js` 的 `YEAR_NOTES`，键是**数字**）。要加一年就在那儿加一行；**没配寄语的年份那一行整个不出现**，不拿别的年份顶替也不现编。

**日期格式是 `YYYY-MM-DD`，用 `getFullYear/getMonth/getDate` 拼，不能用 `toISOString()`** —— 存的本来就是当地零点，转 UTC 会让东八区整体退回前一天（实测 `takenAt=1791129600000` 会从 10-05 变成 10-04）。地图页那个 `ymd()` 写的是点号（`2026.05.14`，给详情里那行用的），格式不一样也没导出，所以这儿另写了一个。

**竖线和圆点**：不用伪元素铺满整列再在头尾各截一刀 —— 每个 `li` 的 `::before` 从自己头顶画到底，`.tl > li:first-child::before` 把第一个圆点上面那段截掉、`:last-child` 只画到圆点为止（`bottom: auto; height: var(--tl-dot-top)`）。这样年份头和条目之间的间距怎么变都不用重算线段长度。

⚠️ **`--tl-dot-top`（圆点圆心距本条顶部的距离）必须由字号算出来，不能写死像素**：它是 `calc(留白 + 字号 × line-height ÷ 2)`，而字号和留白都是 `clamp()`。写死过一次 62px，在 1440 下看着是准的，换到 1024（字号被 clamp 卡到另一档）点就浮到年份数字头上去了。还有两个坑：

- **兜底值要写在 `.tl` 上（靠继承往下传），不能写在 `.tl > li` 上**。`.tl > li` 的优先级是 `(0,1,1)`，比 `.tl-year` / `.tl-item` 的 `(0,1,0)` 高，会把它们算好的值整个盖回兜底值 —— 而且不报错，只是点悄悄偏了 40px。元素自己声明的值永远赢过继承来的。
- 条目那一条算式里**要算上 `.tl-item__hit` 那 1px 的透明边框**（文字上沿是「边框 + padding」）。漏掉的话四个宽度上量出来都整整齐齐地高 1px。

**背景沿用地图页那张照片**，`body::before` 里五层（照片 → 压暗 → 三团淡光 → 暗角）和 `css/map.css` 里那份是**同一组数值**，改一处要一起改。两点和地图页不同：

- 这一页是可滚动的，所以那层 `position: fixed` 是**故意**让它跟着视口不动（地图页不滚动，看不出区别）。
- 这页没有 `#map` 那种带 `z-index` 的容器，而 `body::before` 是定位元素、绘制顺序排在普通流内容之上 —— **必须给 `.tl-head / .tl-main / .tl-foot` 补 `position: relative; z-index: 1`**，否则整页文字被照片整个盖住，只看得到背景。

**从时间轴点回地图走深链**：`map.html?province=<省全称>`，那件作品一个省都没匹配上时走 `map.html?uncat=1`（跟地图页左下角那个入口是同一批东西，不会点过去扑空）。`js/map.js` 的 `openFromQuery()` 在 `init()` 末尾兑现它。三条纪律：

- **先把查询串 `replaceState` 擦掉**，再让 `openDetail` 去压它自己那条 history。不擦的话关掉详情后 URL 还挂着 `?province=…`，刷新一下又弹一次。
- **深链开出来的那一层不压 history 记录**（`openDetail` 的第 4 个参数 `fromLink`）。这条是**看着简单但必须这么写**的：`openDetail` 默认会 `pushState` 一条，好让浏览器返回键是「关掉详情」而不是「退出地图页」。但深链那一层栈是「时间轴 → 地图 → 详情」，关掉只退回「地图」那一格 —— 人卡在地图上，回不去时间轴（第一版就是这样，实测点完返回落在作品地图）。不压就是「时间轴 → 地图」，关掉 = 退回上一条 = 时间轴，**浏览器返回键和那个 ← 按钮走的是同一条路**，两边一致。
  - 于是 `closeDetail()` 在 `fromTimeline` 时走 `history.back()`；`history.length === 1`（新标签页直接开链接，历史里没有上一条）时 `back()` 是空操作，会**把 `closing` 卡住、按钮从此变成死的**，所以那种情况改成 `location.href = 'timeline.html'` 显式跳。
  - ← 按钮的 `aria-label` / `title` 也跟着切成「返回时间轴」—— 默认那两个字是「返回地图」，深链时它回的不是地图，读屏和悬停提示得跟实际去向一致。
  - 在地图上点省进来的那层**不受影响**：照旧 `pushState`，← 只关面板、人留在地图页。
- **认不出来就什么都不做**（省名拼错、`china.json` 以后改名、未归类这会儿是空的），安静停在地图上不弹错。

`linked` 那个一次性标志位现在是防未来的 —— `openFromQuery()` 目前只挂在一次性的 `init()` 上，而 `apply()` 会在切回标签页时重跑，哪天有人把它挪进 `apply()`，没有标志位就会每次切回来弹一次面板。

⚠️ **新页面必须加进 `vite.config.js` 的 `build.rollupOptions.input`**，漏了的话 **dev server 照常能开、只有 `npm run build` 才炸**（build 出来少一页，上线才发现）。

> 这一页的长相完全由「填了城市 + 拍摄日期」的作品数决定。真数据里这种作品还很少，所以看着空 —— 那是**数据还没补，不是页面坏了**，后台作品列表每行的「编辑」就能补，补完刷新即变。另外**两件作品的 `takenAt` 完全一样时，谁在上面由接口返回的顺序决定**（稳定排序，不额外定义 tie-break），不值得为它加规则。

**配色与动效**（这一节记的是「为什么这么调」，不是清单）

- 页面底子从下到上是五层，全写在 `body::before` 的一条 `background` 里：**背景照片 → 压暗 → 三团很淡的光 → 暗角**。三团光（中间偏上一团绿、右上角一团冷色、左下角一点点暖）**每层透明度都在 .1 以下** —— 要的是深度，不是颜色，照片和被点亮的省还是唯一的主角。这层挂在伪元素上而不是 `#map` 上（`#map` 是 ECharts 反复读尺寸的容器，canvas 本身透明，垫在下面照样透得出来）。省份改成一省一色之后，这团底光**仍然是那支单色绿**、没跟着变成彩色：它是背景，不是内容；而且正好和色板里那支绿是同一支。
- **地图页背景照片**（`public/map-bg.jpg` + `css/map.css` 的 `body::before`）：
  - 图是 `C:\xiangmu\素材\3840x2160.jpg` 缩出来的：**2560×1440、JPEG q82，2.47 MB → 0.45 MB**。原图没进仓库 —— 4K 原图当一张背景太重了，而它在 1440 屏上多出来的那点细节全被压暗层吃掉了。**这台机器上没有 ImageMagick 也没有 sharp**（`C:\Windows\system32\convert` 是 Windows 那个 FAT→NTFS 的转换工具，不是 ImageMagick），所以是用浏览器 canvas `toDataURL('image/jpeg', q)` 重编码的；脚本要求同源页面才导得出（canvas 被跨源图污染就 `toDataURL` 直接抛），做法是先把原图临时拷进 `public/`、缩完立刻删。要换图就照这个来，别在仓库里放大图。
  - 路径写的是裸的 `/map-bg.jpg`（跟 `/china.json` 同理，`public/` 里的东西都是裸路径）。**别套 `assetUrl()`** —— 那个只给后端的 `/uploads/` 补域名，套上去这张图就 404 了，而且不会报错，只是悄悄退回 `--bg`。`npm run build` 会把文件原样拷到 `dist/`、CSS 里的绝对 `/` 也保持不动。
  - **照片和压暗层必须在同一个元素上**（都写进这条 `background`），不能照片挂 `body`、压暗挂 `body::before`：这层有一条 1.6s 的 `ambientIn` 淡入（从 `opacity: 0`），分开写的话加载瞬间会**先闪一整张没压暗的亮照片，再慢慢暗下去**。合在一起是从近黑里一起浮出来。
  - **压暗这一组数值是这一块最需要手感的地方**（`radial-gradient(76% 70% at 47% 47%, …)`）：这张素材的太阳正好在画面正中，而地图也在正中，所以是「中间压得最狠、往四周松开」—— 地图那一块始终是暗的，照片在山峦和天空那几块透出来当画框。压得太狠照片就白放了，轻一点好看但中层那几个省的边界会糊进雪山山脊里（没作品的省填充只有 `.042`，叠在白雪上等于全白）。用的是 `--bg` 那支 `(8,8,10)` 而不是纯黑，跟页面底色接得上、不会有灰边。调的时候看 **1440×900 和 1366×768** 两档。
  - 伪元素是 `inset: -10%`（光晕是椭圆，铺满容器边角才不会有硬边），代价是 cover 按放大过的盒子算、比按视口算多裁一圈（2560 宽的图上约 16px/边），可以接受。
  - 这张图**是写死的静态文件，后台换不了**（跟省名色板一样是「前端写死」那一路）。想做「后台传一张当背景」的话，`POST /api/site-config/cover` 那套是现成的先例，但那是另一件事。
- 省份的填充是**偏暖**的灰（`214, 202, 184`），底子是冷的。海冷陆暖，整页才有冷暖关系；全是中性灰的时候怎么调深浅都还是一块黑。
- 地图页有一份自己的 `--accent-lite: #B7DD8A`（提亮过的绿），只给黑底上的小面积高光用：顶栏那个点、载入时跳动的点、统计里的「N 组」、照片悬停的描边。`--accent` 仍是**全站**那支强调色的唯一事实来源，`--accent-lite` 是它提亮出来的一支，只加不改。
- **有作品的省一省一色**（`js/map.js` 里的 `PROVINCE_COLORS`）。这张表是**算出来的，不要手改**：
  - 生成脚本是 **`frontend/tools/province-colors.mjs`**（`node frontend/tools/province-colors.mjs`，或 `npm run province-colors`）。它拿 34 个省按**陆地邻接**做了一遍图着色，保证「地理上挨着的省一定不同色」。手改这张表一定会排出两个相邻的省同色 —— 那正是这张表存在的意义，而且铺在地图上两个连着的色块一个色，一眼就能看出来。脚本自己会验一遍邻接表的对称性、有没有漏省、有没有撞色，有问题就不输出、直接报错。
  - 色板是 8 支 `hsl(H, 42%, 60%)`，和站里那支绿**同一个明度和饱和度**，只换色相，所以暗底上轻重一致，不会有的省扎眼、有的省看不见。**第一支就是 `--accent` 本身**，是脚本去 `gallery.css` 里读来的 —— 不是另算一个差不多的绿（算出来是 `#99C46E`，和 `#9BC46F` 差 1/255，肉眼看不出来，但代码里漂着两个「几乎一样却不相等」的绿早晚被人当 bug）。
  - 8 支的**顺序**是位反转排过的（90°→270°→180°→0°→135°→315°→225°→45°），摊色时最先用到的那几支色相拉得最开。
  - 摊色时每步在「邻省没用过的色」里挑**目前用得最少**的那支，不是 first-fit。中国省界的邻接图正好是 4 着色的，first-fit 只用 4 支、绿的一家占 18 个省，铺出来又是「大部分都绿」。现在每支 4~5 个省。**这是这次返工过一次的地方**，改摊色策略时记得看分布均不均匀。
  - 省名必须和 `china.json` 的 `properties.name` 逐字一致（`内蒙古自治区` 这种全称）。写错一个，那个省就不上色、悄悄退回 `--accent` 那支绿 —— `provinceRgb()` 里是个 `|| ACCENT` 的兜底，不报错。有测试盯着 34 个名字一个不差。
  - **动了色板、或者 `china.json` 多出省名，就重跑一遍脚本再整段替换。** 脚本的输出和 `map.js` 里那张表是逐字对应的（只是 `map.js` 是 CRLF），所以替换完再跑一次脚本、和前 35 行对一下就知道有没有漏贴。
- 有作品的省用**竖向渐变 + 外发光**，不是一块平涂 —— 平涂贴在一片描线上像贴纸。填充、描边、投影三处都从**这个省自己那支色**派生（`rgba(${rgb}, …)`）：只换 `areaColor` 的话，紫省的边框会还是绿的。另外**每个点亮起来的省都得自己写一份 `emphasis`**：系列级那条是给描线省份用的淡白，只用系列级的话，鼠标一压到亮省上颜色会被盖成灰白，越悬停越不像「有作品」；悬停色同样是各省自己那支色变亮，不是统一一个色。
- 底图那层（没作品的省）**没动**：还是偏暖的灰 `rgba(214, 202, 184, .042)`，`itemStyle` 都没有。
- **提示框里省名前那个小点也跟着各省自己的色**（`formatter` 里拼的行内 style）。它原来是固定的 `--accent` 绿，而且 `map.css` 里还硬写了一份 accent 的 RGB 当发光 —— 省份一省一色之后，悬停一个红省、旁边杵个绿点，看着像 bug。那份硬写的 RGB 也删了（它是 `--accent` 的第二份副本）。CSS 那边只留形状，`background: var(--accent)` 留着当兜底。
- 悬停时会 `focus: 'self'` 把别的省淡下去，但**只淡到 `.5`**。描线本来就细，压到 `.3` 整张图就没了，看着像加载失败。光标也在这儿切成 `pointer`（ECharts 画布只有一个 cursor，只能按 `mouseover` 自己加类）。
- **动效全部只做在内容上，绝不做在 `.detail` 和 `.detail__hero` 上**：返回按钮是面板里的 `position: fixed`，那两个容器一旦带上 transform 就成了它的包含块，按钮会跟着面板一起滚走（同一类坑见下面「面板这一层不能加 transform」）。所以入场的位移一律下到 `.detail__head` 的子元素、`.detail__stats`、`.detail__sec`、`.detail__wall` 这些不含 fixed 的容器上。
- 这些错峰入场用的是 `animation` 而**不是 `transition`**：animation 跑完（末帧 `transform: none`，`fill: both`）不留任何 transform，将来谁往这些容器里塞个 fixed 子元素也不会踩雷。代价是 `prefers-reduced-motion` 那一节必须写 `animation: none` —— 只把时长改成 0 的话，`fill: both` 会把这些元素钉在首帧的 `opacity: 0` 上，整块内容直接看不见。
- `#map` 的淡入靠 `.is-ready` 这个类，**类只由 JS 加，CSS 那边默认就是 `opacity: 1`**：脚本整个挂掉时地图照样看得见，只是没有淡入。同理「载入中」是写死在 HTML 里的，不是 JS 插进去的。
- 顶栏原来靠 `border-bottom` 收边，那条等宽细线横贯全屏，像给页面盖了个盖子。现在用 `mask-image` 把整块（连 `backdrop-filter` 一起）从下往上擦掉，顶栏化进地图里，没有边。
- 背景图不是「啪」地出现：淡入 + 从 `scale(1.05)` 用 5.5s 慢慢退回 1，像镜头轻推了一下。它是个 `<img>`，底下没有 fixed 元素，所以这里是**可以**动 transform 的。

**省份详情**（点地图上有作品的省，或者左下角那个「未归类作品」）

从右侧拉出的**半屏面板，不是新页面** —— 只盖住右边（`--detail-w: clamp(460px, 60vw, 940px)`，窄屏覆盖成 `100vw`），左边的地图仍然露着。地图的缩放平移状态也留在下面，返回时还是刚才那张图，不用重画也不用重拉数据。从上到下：该省在后台配的**背景图**当 Hero、左上角固定的圆形返回按钮、右上角作品数、一行年份、省名大标题、省份介绍（后台可改，见下）、一行统计（打卡次数 / 第一次 / 最近）、「省份影像」标题紧跟着一句「已更新 2026.05.14」，最后是一面两列照片墙。文字一律**靠左**，但分两条竖线：年份、省名、介绍，以及紧跟其后的**那行统计**（打卡次数 / 第一次 / 最近）贴得靠边（`--head-pad`，1440 屏上 26px）；再往下的区块标题和照片墙走站点通用的 `--pad`（72px）。这个错开是有意的，理由见下面的条目。

几个实现上的点：

- **照片墙的比例是排出来的，不是随机的**：`map.js` 里一张 `WALL_SHAPE` 表按 `i % 6` 循环（宽 / 两条竖 / 宽 / 两条方）。随机那种每次刷新拼出来的都不一样，图是散的。墙上**不复用首页 `.work` 那套「按原图比例撑开」** —— 几十张比例各异的图逐张撑开，两列的高度差会拉到没法看，统一裁成固定几个比例才是一面墙。
- **日期取不到就写「—」，不编一个假的**：`createTime` 是 0（演示图就是这样）时不推算日期出来。
- **返回接的是浏览器历史**：打开时 `history.pushState`，关闭时 `history.back()`（有个 `closing` 标志挡住连点，`history.back()` 是异步的，连点两下会一路退回上一个页面）。手机上的返回手势、浏览器的返回键因此都是关掉详情，而不是退出整个地图页 —— 那两下会把缩放位置一起丢掉。`popstate` 回调里只收详情、**不再**调 `history.back()`，否则会多退一步。
- 没作品的省点了没反应（按需求）；未归类一件都没有时，那个入口整个收起来 —— 一个点了没反应的按钮不如不放。演示数据里那条空省份是故意留的，好让这个入口有东西可点。
- 详情是 `role="dialog" aria-modal="true"`，`Tab` 被圈在里面。判断可聚焦元素用的是 `getClientRects()` 而**不是** `offsetParent` —— 返回按钮是 `position: fixed`，fixed 元素的 `offsetParent` 恒为 `null`，用它会把按钮自己筛掉，`Shift+Tab` 就漏到后面顶栏去了。
- **面板这一层不能加 `transform`**（`translate` / `scale` 这些独立属性同样不行）：`.detail__back` 是 `position: fixed`、靠视口定位，`.detail` 一旦带上有值的 transform 就成了它的包含块，按钮会改成相对面板定位、并跟着面板内容一起滚走。所以面板入场只做淡入，不做位移。返回按钮的 `left` 写成 `calc(100vw - var(--detail-w) + var(--pad))` —— 面板贴右边、宽 `--detail-w`，它的左缘就是 `100vw - --detail-w`；写成 `left: var(--pad)` 会跑到视口左边、盖在露出来的地图上。窄屏把 `--detail-w` 覆盖成 `100vw`，这个算式自动退化成 `var(--pad)`，不用另写一条。
- **`.detail__head` / `.detail__body` 上不能写 `max-width` + `margin: 0 auto`**：面板宽 60vw 之后它比 760px 宽，`auto` 外边距会把整块内容居中，在 `--pad` 之外又叠一层内缩（1440 屏上 52px，1920 屏上 90px），标题就跟左上角的返回按钮错开了。内容一律靠左。「省份影像」那行的「已更新」同理，不再用 `space-between` 甩到面板最右边 —— 面板最宽 940px，两端对齐会把它甩出 700 多像素，跟标题断成两块。
- **贴边那条线是 `--head-pad: clamp(20px, 1.8vw, 30px)`，定义在 `.detail` 上**（不是 `.detail__head` 上）：省名和介绍在 Hero 里用它，正文最上面那行统计不在 Hero 里面，得从面板这一层继承下去。1440 屏上它是 26px，正文那条 `--pad` 是 72px。别看到两个数值不一样就把它们"统一"掉。
- **统计那行是从正文那条线往左挪过去的**：`.detail__stats` 挂在 `.detail__body` 里（那个盒子给的是 `--pad`），所以它自己带一条 `margin-left: calc(var(--head-pad) - var(--pad))`。`--head-pad` 恒 ≤ `--pad`（两个 clamp 的下限都是 20px，而 5vw 永远大于 1.8vw），负值不会把统计推出面板外；窄屏两边都收到 20px，偏移自然归零，不用另写媒体查询。
- 注意返回按钮在 `--pad` 那条线（正文那一列），不在 `--head-pad` 那条 —— 它跟省名横向差着 40 多像素，纵向隔着大半个 Hero，视觉上是个浮动控件，不跟着标题走。「省份影像」和照片墙同理，留在 `--pad` 那列。

**「旅途印记」面板**（地图页右上角那张浮起来的统计卡，桌面端常驻）

面板上的每一个数都是从 **`byProvince` / `uncategorized` 现算的，没有新接口**：

| 面板上的数 | 怎么来的 |
| --- | --- |
| 到访城市总数 | 所有作品 `city` trim 去重后的个数，没填的不算（同一座城市传两件只算一座） |
| 足迹遍布 X 个省份 | `byProvince.size`。注意是**有作品的省**，跟上面那个城市数不是一回事 |
| 中国省份覆盖率 | 分子同上，分母 **34** —— `knownProvinces`（`index()` 里滤掉九段线那个空 `name` feature 之后的集合）的 `size`，不写死 34 |
| 旅途天数 | 有 `takenAt` 的作品里 `max - min` ÷ 86400000 + 1；**一条拍摄日期都没有时显示 `—`**，不编一个数 |
| 珍藏照片 | 作品数 × 2（每件前后各一张） |
| 最近的回忆 | 按 `takenAt \|\| createTime` 倒序取 **3** 件（`JOURNEY_ROWS`），缩略图用 `afterUrl`（和首页、详情照片墙一致） |

- **点一行开的是那一件作品所在省份的详情**，走现成的 `openDetail(省名, byProvince.get(省名), rowEl)`，`sourceEl` 就是归还焦点用的。作品 `provinces` 是空表、或者省名一个都对不上 `china.json` 时，退成 `openDetail('未归类', uncategorized, rowEl)`。
- **城市名取 `w.city || 该作品匹配到的省名 || '未归类'`**。老作品没填城市，这一行也不至于空着；行右侧那个日期同样，同一个城市有好几件时只写城市名读不出「最近」。
- **桌面端是右上角一张浮起来的卡片**，不是贴边拉满的一条：`top: calc(var(--bar-h) + 22px)`、`right: 22px`、四角 `18px` 圆角、四周一圈描边加一层投影。
  - **只给 `top` 和 `max-height`、不给 `bottom`**，高度就跟着内容走 —— 内容少时是张小卡，不白占半屏地图；多到放不下才在里面滚。给上 `bottom` 的话它永远是满高的一条，那就退回原来那个样子了。
  - **`top` 必须让开顶栏那 60px**。原来写的是 `top: 0`，而这一层 `z-index: 120` 压过顶栏的 100 —— 顶栏右上角「作品辑 / 后台管理」两个链接被盖得严严实实、根本点不着。这条有测试盯着（拿 `elementFromPoint` 打链接中心那一点）。
- **面板是常驻的，被详情盖住而不是让开**：`z-index: 120`，夹在「未归类」入口的 100 和详情的 160 之间。点开省份详情时它整个被盖住，返回再露出来（`elementFromPoint` 验过）。
- **窄屏不收成常驻**，塌成一块 `60vh` 的底部抽屉，右下角一个 `.journey-toggle` 按钮控制（`aria-expanded` 跟着走，这个按钮桌面上 `display: none`）。手机上一块 60vh 一直压着，地图就没法看了。
- 抽屉那层**必须写 `animation: none`**，不能只写 `transform: translateY(100%)`：桌面那份入场动画末帧是 `transform: none` 且 `fill: both`，会盖过作者样式，抽屉一上来就是开着的、点了也关不上。`prefers-reduced-motion` 那边同理 —— 写 `duration: 0` 会被 `fill: both` 钉在首帧的 `opacity: 0` 上（同 `.detail` 那条）。
- **里面所有尺寸都是缩过两轮的**：宽度 `clamp(300px, 24vw, 356px)`、内边距 `16px 20px 18px`，字号也都跟着收了一档（大数字 36px、标题 22px、城市名 13px、描述 11px）。起因是矮窗口 —— 第一版内容高 674px，1366×640 这种屏上可用高度只有 536px，第三行「最近的回忆」被裁成了两半（截图里看得一清二楚）。缩到 **502px** 之后，1440×900 / 1366×768 / 1366×640 / 1280×720 / 1100×700 五个尺寸下都正好放得下、不溢出不滚动。**要往面板里加东西之前先量一下这几个尺寸**，别想当然。
- **这块面板不画自己的滚动条**：`scrollbar-width: none` + `.journey::-webkit-scrollbar { display: none }`。注意 **藏 ≠ 画** —— 这不是又一处自定义滚动条（站上仍然一处都没有，见下面「站上不用手写的滚动条」那条），只是让浏览器别画。滚轮、触摸、键盘都还能滚，`overflow-y` 一行没动。⚠️ **只藏这一块**：列表、正文那种要滚一大段的地方不能藏，没有滚动条用户根本不知道下面还有东西。这块是纯装饰的统计卡，右边杵一条 17px 的灰条很难看，而且内容本来就该在常见屏高下放得下 —— 滚动条只是极矮窗口下的兜底，不该天天露脸。

**顺带一处口径变更**：省份详情里的「第一次 / 最近」，以及 `openDetail` 里那次排序，从 `createTime` 改成 **`takenAt || createTime`**。有了拍摄日期，「第一次」指的应该是第一次去，而不是第一次上传 —— 但这也意味着一件填了拍摄日期的老作品，会排到没填的后面（拍摄日期总是早于上传时间）。全部补填完就一致了。

**`visibilitychange` 现在也重拉作品**（原来只重拉省份设置）：去后台传完新作品切回地图页，点亮的省和这块面板原本都是旧的。重拉前要清空 `byProvince` / `uncategorized` / `knownProvinces` —— `index()` 只往里 `push`，不清会越堆越多。这几处在详情开着时不动作，也吞掉请求异常，拉回来一件作品都没有时直接放弃（别把演示数据顶掉了）。

**省份设置**：省份本身是固定的（跟着 `china.json` 的 feature 名走，改不了），能改的是这个省的两样东西 —— 顶上那张**背景图**，和它下面那段**介绍**。存在 `data/province-profiles.json`，就是一个 `{"四川省": {"note": "…", "cover": "/uploads/…"}}` 的表，走 `ProvinceProfileService`（落盘方式和另外两个 Service 一样：先写 `.tmp` 再原子替换）。

> 单独一个 Service 配一份文件，而**不是**往 `SiteConfig` 里加字段：那份配置加字段得同时改 `copyOf` / `normalize` / `update` 三处，漏一处就静默丢数据（下面「需要注意」里记着这条）。这里一个省一个键，写成 Map 更贴合，后台存一个省也碰不到别的省。

几条容易改坏的约定：

- **两个字段各走各的接口，每个只动自己那个**。保存介绍不会碰背景图，换背景图也不会碰介绍 —— 后台那两块也是各自提交的。后端的方法是拿当前记录起手、只覆盖自己那个字段，而不是从零 `new` 一个（跟 `SiteConfigService.update()` 不碰 `coverUrl` 是同一条理由）。
- **省名要先验再存图**。`updateCover()` 里 `checkProvince()` 在 `fileStorageService.save()` **之前**：反过来的话省名不合法会抛异常，而那张图已经落在 `uploads/` 里了，没有任何记录指着它，成了永远清不掉的孤儿。
- **传空串只是清掉那个字段，不是删键**；两个字段都空了，这个键才从表里整个消失。所以「清空介绍」不会顺手把这个省的背景图一起弄没。
- **`get()` 返回的是深拷贝**。值是 `ProvinceProfile` 这种可变对象，直接把内存里那份交出去，调用方理论上能改到当前表的状态（`Map<String,String>` 那会儿没这个问题，值是不可变的字符串）。
- **`load()` 走 `JsonNode` 逐条读，不直接映射成 `Map<String, ProvinceProfile>`**：手改坏的文件里出现 `{"四川省": null}` 或者值不是对象的形态时，直接映射要么抛异常让后端起不来，要么塞一个字段全是 `null` 的对象进内存。现在读不出字符串就当空串，两个字段都空的整条丢掉。

**后台页面分两组**（`admin.html` + `css/admin.css`）：页头一行 h1 加一句「什么在哪儿」，下面是「作品」（上传新作品 / 作品列表）和「站点设置」（首页封面 / 省份设置）两组，每组一个标题 —— 标题前一小条绿、后面跟一句说明、再由一条化开的细线拉到栏末。分组不是为了好看：原来四个面板平铺，左栏两米多高、右栏下面空一大片，而且「传作品」和「改站点设置」看上去一样重，落地不知道从哪儿下手。标题层级也跟着排了一遍（页 h1 → 组 h2 → 面板 h3 → 列表项 h4），所以 **`.admin-item__title` 的字号是写死的** —— 它是 h4 了，不写就由浏览器默认标题样式决定，换个标签跟着变一档。

**后台上传**（`js/admin.js`）：`FormData` 组装 `title/desc/provinces/city/takenAt/before/after` 直接 POST；省份是一排 chip 按钮（`aria-pressed` 就是选中态，不再单独存一个类），清单来自本地常量 `provinces.js`、在 `bindEvents()` 阶段渲染一次，**不能跟着 `init()` 走** —— 接口一失败点「重试」就会把用户已经勾好的省份清掉。描述框的 `maxlength` 与 `DESC_MAX` 都是 50，右边挂一个字数计数器（后端 `WorkService` 里还有一道校验防绕过）；选完文件用 `URL.createObjectURL` 本地预览（换文件时 `revokeObjectURL` 释放）；删除走 confirm + `DELETE`。

**「拍摄城市 / 拍摄日期」这两项在后台有两处入口**：上传表单里各一个框（选填，城市 `maxlength=20`，和 `WorkService.CITY_MAX` 对齐），以及**作品列表每一行的「编辑」按钮** —— 点开把这一行展开成 `城市 [__] 拍摄日期 [__] [保存] [取消]`，占满整行（`grid-column: 1 / -1`）。第二处是必须的：这两个字段是后加的，老作品全都没有，只能上传时填的话就只能删掉重传了。保存走 `PUT /api/work/{id}`，拿返回值就地更新本地那条再 `renderList()`。

> - 日期框的 `max` 由 JS 填成**今天**，HTML 里写死日期的话过一天就过期了。同一天打开着过夜只是个理论问题，没管。
> - `dateToEpoch()` 用的是 `new Date(y, m-1, d).getTime()`（当地零点），**不是** `new Date('2026-05-14')` —— 后者按 UTC 解析，东八区会整整偏 8 小时，存进去的日期在面板上显示成前一天。
> - `.admin-item__edit` 自带 `display: flex`，**压得过浏览器默认的 `[hidden]{display:none}`**，所以 `admin.css` 里必须补一条 `.admin-item__edit[hidden] { display: none }`。这个坑 `.cover-actions .btn[hidden]` 那儿踩过一次了。
> - 同一时刻只开一行：开新的之前先把上一个收起来（不然列表里能同时挂好几个展开块，滚起来找不着北）。

> 这里有个 `formEl.reset()` 的坑：chip 不是表单控件（没有 `name`，也不是 `input`/`select`/`textarea`），`reset()` 会**静默跳过**它。提交成功后不手动把每个 chip 的 `aria-pressed` 置回 `false` 的话，下一次上传会悄悄沿用上一次勾的省份。同理 chip 必须写 `type="button"`，否则在 `<form>` 里点一下就触发提交。

**作品列表是个定高的方框，多出来的在里面自己滚**：作品只增不减，不封顶的话这一列会一路长下去，把整组（连同下面的「站点设置」）往下顶 —— 左边那张上传表单高度是固定的，于是「作品」这一组的高度就完全由作品数量决定了。`admin.css` 里给 `.admin-list` 定了 `max-height: 900px`（取的就是左边那张表单的高度，两边底边齐），再加 `overflow-y: auto`，这一组的高度就跟作品数量彻底脱钩，加多少张都不再往下长。

> `overscroll-behavior: contain` 是必须的：滚到框底之后接着滚，不拦的话链式滚动会把整页一起带着走，鼠标明明还停在框里，页面却动了。触屏上那条橡皮筋它挡不住，但桌面滚轮这条是它管的。
>
> 滚轮落在框里就只滚框，所以点删除之前不用先对准 —— 但也意味着**框里滚不动的时候页面不会跟着走**，得把鼠标移出去。框右边那条滚动条**是浏览器原生那条**，站上没有手写 `::-webkit-scrollbar`（原来这里有一份 6px 的，删了）—— 深色底配浅色条的毛病改由 `gallery.css` `:root` 里的 `color-scheme: dark` 解决，浏览器自己按深色主题画，还白拿悬停态、按下态和可拖拽的轨道。

**省份设置**（同一个 `js/admin.js`，「站点设置」那组右栏的面板）：一个省份下拉，下面拆成「顶部背景图」和「介绍」两个小节，中间一条通栏细线 —— 两块各有一个绿色的保存按钮，挨着排很容易按错那个。背景图那节是预览/选择/上传/恢复默认，介绍那节是一个 textarea + 保存按钮。下拉的选项和那排 chip 一样来自本地常量 `provinces.js`、在 `bindEvents()` 里渲染一次（理由同上）；整张表是**单独一条 GET、自己带 catch**，失败只让这块面板自己说明情况，不连累作品列表。切换省份时如果当前内容没保存 —— 介绍改过、**或者只是选了图还没上传** —— 会 `confirm` 拦一下（页面别处也是这么问的，不做第二套弹窗），切过去会清掉选中的文件，不拦就传错省了。`maxlength` 与 `NOTE_MAX`（200）一致，后端 `ProvinceProfileService` 里还有一道校验防绕过。

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

两个目录都在 `.gitignore` 里。作品的省份就存在 `works.json` 每条的 `provinces` 数组里（省级全称，一件作品可以有多个省）；**拍摄城市和拍摄日期也在同一条记录里**（`city` 字符串 + `takenAt` 毫秒，0 = 没填）；省份背景图和介绍在 `data/province-profiles.json`（`app.province-profile-file` 可配，**文件不存在就一直不存在**，第一次保存才生成）；字体预设写死在 `SiteConfigService#init`，要接数据库只改 Service，Controller 不动。

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
- **`city` / `takenAt` 是可空的，老记录读进来就是 `null` / `0`**，正好是「没填」的语义，不用写迁移脚本。放新字段不会动到已有数据，但下一次 `persist()` 之后 `works.json` 会多出这两个键（`"city": null, "takenAt": 0`）—— **整份文件跟改动前 `diff` 出来是不为空的**，那是这两个键，不是内容被改了。逐字段比对时注意这一点。
- **`takenAt` 是毫秒、不是 `"2026-05-14"` 字符串**，和 `createTime` 保持一致：前端的 `ymd()` / `formatTime()` / `dateSpan()` 全吃毫秒，混两种类型迟早要出事。**晚于此刻的值一律归 0**（`cleanTakenAt()`）—— 日期框里手打一个 2099 进去，「旅途天数」会算出一个几万天的数，宁可当没填。当天本身没问题：前端传的是当地零点，一定小于此刻。
- **城市名超长在两条路上处理得不一样，是有意的**：写入路径（`create` / `updateMeta`）走 `checkCity()`，**报错**而不是截断（上传的人该知道自己的字被砍了）；`normalize()` 走 `cleanCity()`，**截断**。因为 `normalize()` 在启动加载历史数据时也会跑，从那儿抛异常会让整个后端起不来。
  - ⚠️ `checkCity()` 里**不能**先转手给 `cleanCity()` 再判长度：那个方法自己会截断，截完长度永远不超，这条检查就成了死代码。第一版就是这么写的，实测 21 个字照样写进去了。
  - 城市名在 `create()` 里是**存图之前**校验的：放后面的话，名字不合法会抛异常，而两张图已经落在 `uploads/` 里了，没有任何记录指着它们，成了永远清不掉的孤儿（同 `ProvinceProfileService` 那条）。
- **`updateMeta` 是拿现有记录起手、只覆盖那两个字段**，不是整个对象覆盖 —— 前端少传一个字段就会把那个字段抹成 `null`。跟 `ProvinceProfileService` 里「一个字段一个方法、不从零 `new`」是同一条理由。
- ~~**地图页右边那条 420px 的常驻面板会盖住地图的东北角和南海诸岛那个小方框**~~ —— 面板改成右上角那张浮起来的卡片之后就绕开了：宽度收到 `clamp(300px, 24vw, 356px)`，1440 屏上左边缘落在 x≈1072，东北那几个省和南海诸岛那个小方框都在它左边露着。`#map` 的几何**始终没动**（还是 `right: 0`，配色、悬停、错峰入场都是单独调过的，别顺手改它的宽度）。
- **「最近的回忆」按 `takenAt || createTime` 排序**，在全部补填完之前会有个可见的副作用：填了拍摄日期的作品会排到没填的后面（拍摄日期总是早于上传时间）。现在这 9 件都是同一天传的，随便给哪件填个日期，它就会掉出前 3 行。这是当初选的语义，不是 bug。
- **站上不用手写的滚动条**。深色底配浅色条的毛病走 `color-scheme: dark` 解决，拿到的仍是浏览器**原生**那条（有悬停态、有按下态、能拖轨道）。⚠️ 这条变量**写在两个地方**：`style.css` 的 `:root`（后台页用）和 `gallery.css` 的 `:root`（首页和地图页用）。这两个 `:root` 一直是各写一份、取值对齐的（见两个文件的开头注释），**改一处要一起改** —— 只改一个的话，另一个页面会悄无声息地退回浅色滚动条。
- **`PROVINCE_COLORS` 那张省→色表是脚本算出来的，别手改**（`js/map.js`）。改成「一省一色」时要求「地理上挨着的省不同色」，手排一定排不对 —— 而且错了不报错，就是地图上两个连着的色块一个颜色。要重排就重跑生成脚本（路径写在那个常量上面的注释里），整段替换。另外 `provinceRgb()` 对表里没有的省名是**静默兜底**回 `--accent` 的：`china.json` 以后多出省名、或者名字拼错一个字，那个省就不上色、也不报错。有测试盯着「色表 = china.json 里那 34 个名字，一个不多一个不少」，改动 `china.json` 之后记得跑一遍。
- **地图页的背景照片是 `frontend/public/map-bg.jpg` 这个静态文件，后台换不了**（当初定的就是「前端写死」，跟省名色表同一路）。三件容易踩的：
  - 引用要写裸的 **`/map-bg.jpg`**，**不能套 `assetUrl()`** —— 那个只给后端的 `/uploads/` 补域名，套上去就 404，而且不报错，只是悄悄退回 `--bg` 那块近黑，看着像「照片没生效」而不是「路径错了」。
  - **照片和压暗层必须在 `body::before` 的**同一条 `background`**里**。分开写（照片挂 `body`、压暗挂 `::before`）会在加载瞬间先闪一整张没压暗的亮照片 —— `::before` 那条 1.6s 的 `ambientIn` 是从 `opacity: 0` 起步的。
  - 换图请**先缩再放进来**（2560×1440 / q82 / ≈0.45 MB）。这台机器上没有 ImageMagick / sharp，当初是用浏览器 canvas `toDataURL('image/jpeg', q)` 重编码的；`toDataURL` 要求同源，所以得先把原图临时拷进 `public/`、缩完立刻删。**别把 4K 原图（2.47 MB）提交进仓库。**
  - 顺带：`admin.css` 里那个 `input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) }` 也是因为这个才删的 —— 深色主题下浏览器已经给了一个浅色图标，再 `invert` 一次就变回黑的、看不见了。它是**纯属多余**，不是「反正也不碍事」。
  - ⚠️ **时间轴页（`css/timeline.css`）里有一份一模一样的五层配方**，两页是连着走的、底色必须一致。**改数值要两处一起改** —— 只改一边的话，从地图点进时间轴会发现背景暗了一档或亮了一档。
- **`provinces` 存的是省名全称，和 `frontend/public/china.json` 里 feature 的 `properties.name` 必须一字不差**。换了地图数据就要同步重抽 `frontend/js/provinces.js`（那是给后台 chip 列表用的，地图本身是从 GeoJSON 现取的，不引这个文件）。后端不做白名单校验，拼错的省名不会报错，只会让作品掉进「未归类」。
- **省份设置是单独一份文件，不是 `SiteConfig` 的字段**（`data/province-profiles.json`，一个省一个键）。所以它**不受**上面那条「加字段要同时改三处」的约束；反过来说，往里加东西也别指望 `SiteConfig` 那套 `normalize` 会兜住它 —— 它自己在 `load()` 里逐条判类型、滤掉空键和空记录。**两个字段都空 = 删键**，不是存一条空记录。
- **详情页的 Hero 背景图是后台按省传的，不再自动取该省最新作品的成片**。传一件新作品不会把省的脸换掉。没传过的省就是没有 `<img>` 的 `src`（`map.js` 里用 `removeAttribute('src')`，不能赋空串 —— 那在某些浏览器里会被当成「相对当前页」，白白发一次请求回来一个 HTML），`.detail__hero` 那层深色渐变露出来，这是**有意的兜底**，不是缺省态。`alt` 一律留空：那张图是纯装饰，上面压着遮罩和整个标题块，读屏念一遍文件名只会添乱。
- **地图页的省份设置只在打开时拉一次**，另外挂了个 `visibilitychange`：标签重新可见时静默重拉一遍（去后台改完切回来就能看到），失败什么都不说。它**不能复用 `init()`** —— 那里面要重新 `registerMap`，ECharts 会报重复注册。已经打开着的详情面板不跟着变（内容在用户眼皮底下换掉太跳），返回再点开就是新的。
- **站点设置只剩封面在用**。前台艺术字那套（表单、`js/fonts.js`、`css/style.css` 的 `--font-art`）已经拆掉，`PUT /api/site-config` 和 `/api/fonts` 现在没有前端消费方，首页只 `GET /api/site-config` 取 `coverUrl`。**这几个类现在不能顺手删了** —— 首屏封面就挂在 `SiteConfig` 上。真要清理，只能删 `FontPreset` / `/api/fonts` / `update()` 那条链，同时把 `SiteConfig` 的 `introText`、`fontId` 一起摘掉。
- **`PUT /api/site-config` 改的是文字和字体，不碰封面**。后端 `update()` 是拿 `copyOf(current)` 起手再覆盖 `introText`/`fontId`，而不是从零 `new` —— 否则每存一次文字就会把 `coverUrl` 抹成 null。以后往 `SiteConfig` 加字段，记得同时改 `copyOf()` / `normalize()` / `update()` 这三处，漏一处就会丢配置。
- 依赖参数名反射的写法（`@RequestParam` 不写名字）在 IDEA 直接编译时会失效，因为 IDEA 默认不加 `-parameters`。本项目所有 `@RequestParam`/`@PathVariable` 都写了显式名字，别改回去。
