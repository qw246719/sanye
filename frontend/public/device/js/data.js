/* =========================================================
   A7C — 部件数据 / 参数
   所有 3D 元素均由代码生成，无外部模型依赖
   ========================================================= */
window.A7C = window.A7C || {};

A7C.parts = [
  /* ---------------- 机身 ---------------- */
  {
    id:'top', cat:'body', type:'structure',
    name:'顶盖组件', en:'TOP COVER', param:'镁合金 · 双拨盘',
    desc:'一体化镁合金顶盖集成模式拨盘、快门按钮与 Multi Interface 热靴。顶盖同时承担顶部密封与机身刚性连接，是整机最上层的结构件。',
    specs:[['材质','镁合金'],['拨盘','模式 / 控制'],['热靴','Multi Interface'],['快门','1/4000–30s'],['密封','防尘防滴']],
    offset:[-3, 8, 0], anchor:[0, 3.8, 2.0], tags:['结构','外装']
  },
  {
    id:'evf', cat:'body', type:'optic',
    name:'电子取景器', en:'OLED EVF', param:'236 万点 · 0.59×',
    desc:'0.59× 放大倍率的 OLED 电子取景器，236 万点分辨率，内置于机身左上角，保持 a7C 平顶设计的紧凑轮廓。',
    specs:[['类型','OLED'],['分辨率','2,359,296 点'],['放大倍率','0.59×'],['视点','约 20mm'],['刷新率','60fps']],
    offset:[3.5, 6.5, -1], anchor:[4.1, 3.7, -0.4], tags:['光学','取景']
  },
  {
    id:'grip', cat:'body', type:'structure',
    name:'握把', en:'GRIP', param:'皮革纹理 · 深握持',
    desc:'深握把采用橡胶皮革包覆，内部容纳 NP-FZ100 电池与 SD 卡槽，握持区与快门、前拨盘形成单手操作三角。',
    specs:[['材质','橡胶 / 皮革'],['内部','电池仓'],['适配','NP-FZ100'],['机身深度','59.7mm']],
    offset:[-9, -5, 2], anchor:[-4.6, -0.6, 2.95], tags:['结构','握持']
  },
  {
    id:'front', cat:'body', type:'structure',
    name:'前盖 & E 卡口', en:'FRONT COVER / E-MOUNT', param:'E-mount · 18mm',
    desc:'前盖承载 E 卡口与 10 触点电子接口，法兰距 18mm。不锈钢卡口环与镁合金框架刚性连接，保证镜头光轴稳定。',
    specs:[['卡口','E-mount'],['法兰距','18mm'],['触点','10-pin'],['材质','不锈钢 / 镁合金'],['释放键','机械式']],
    offset:[13, -8, 3], anchor:[0.4, -0.4, 3.7], tags:['结构','接口']
  },
  {
    id:'screen', cat:'body', type:'optic',
    name:'翻转触控屏', en:'VARI-ANGLE LCD', param:'3.0" · 92 万点',
    desc:'3.0 英寸 92 万点可翻转触控屏，向侧方翻出后可 180° 旋转，支持触摸对焦、触摸快门与菜单操作。',
    specs:[['尺寸','3.0 英寸'],['分辨率','921,600 点'],['类型','侧翻触控'],['亮度','手动可调'],['连接','柔性排线']],
    offset:[-9, -2, -5], anchor:[0.4, -0.2, -3.4], tags:['显示','交互']
  },
  {
    id:'bottom', cat:'body', type:'structure',
    name:'底盖 & 三脚架', en:'BOTTOM PLATE', param:'1/4" 螺孔 · 电池仓',
    desc:'底盖集成 1/4"-20 三脚架螺孔、电池仓门与密封胶圈，是机身结构的下部承力面，也承担电池与存储卡的快拆维护。',
    specs:[['螺孔','1/4"-20'],['材质','镁合金'],['电池仓','NP-FZ100'],['卡仓','SD UHS-II']],
    offset:[7, -9, -1], anchor:[2.4, -3.6, 0.8], tags:['结构','底部']
  },
  {
    id:'shell', cat:'body', type:'structure',
    name:'镁合金骨架', en:'MAGNESIUM CHASSIS', param:'轻量化承力结构',
    desc:'镁合金骨架构成机身主承力结构，内部为传感器、快门与主板预留安装基准面，外部覆盖前盖、顶盖与握把。',
    specs:[['材质','镁合金'],['结构','一体式框架'],['防护','防尘防滴'],['整机重量','509g']],
    offset:[-14, 0, -3], anchor:[-5.7, 0.9, 0.6], tags:['结构','核心']
  },
  {
    id:'sensor', cat:'body', type:'optic',
    name:'全画幅传感器', en:'EXMOR R CMOS', param:'2420 万 · 全画幅',
    desc:'35mm 全画幅背照式 Exmor R CMOS，有效像素 2420 万，配合 BIONZ XR 处理器实现 15 级动态范围与 4K 超采样。',
    specs:[['类型','Exmor R CMOS'],['尺寸','35.6×23.8mm'],['有效像素','2420 万'],['色深','14bit RAW'],['防抖','传感器位移']],
    offset:[0, 1.5, 0.8], anchor:[0, -0.25, 1.9], tags:['光学','核心']
  },
  {
    id:'ibis', cat:'body', type:'drive',
    name:'五轴防抖单元', en:'5-AXIS IBIS', param:'5 轴 · 5.0 EV',
    desc:'五轴机身防抖单元以电磁悬浮方式固定传感器，提供最高 5.0 级快门补偿，并支持视频主动防抖与呼吸补偿。',
    specs:[['轴数','5 轴'],['补偿','5.0 EV'],['结构','电磁悬浮'],['兼容','全部 E 卡口镜头']],
    offset:[-1.5, -1.2, 0.3], anchor:[0, -1.9, 1.2], tags:['驱动','稳定']
  },
  {
    id:'shutter', cat:'body', type:'drive',
    name:'快门组件', en:'SHUTTER UNIT', param:'机械快门 · 1/4000s',
    desc:'电子控制纵走式焦平面快门，机械速度 1/4000s，闪光同步 1/160s，快门寿命约 20 万次，支持静音电子快门。',
    specs:[['类型','纵走式焦平面'],['速度','1/4000–30s'],['闪光同步','1/160s'],['寿命','约 20 万次']],
    offset:[1.5, -1, 1], anchor:[0, -0.5, 2.5], tags:['驱动','机械']
  },
  {
    id:'mainboard', cat:'body', type:'electron',
    name:'主板', en:'MAIN BOARD', param:'BIONZ XR · 影像中枢',
    desc:'主板集成 BIONZ XR 影像处理器、内存、USB-C 与 HDMI 接口，是整机的数据与供电中枢，采用多层高密度 PCB。',
    specs:[['处理器','BIONZ XR'],['接口','USB-C 3.2 / HDMI'],['卡槽','SD UHS-II'],['无线','Wi-Fi 5 / 蓝牙']],
    offset:[0.5, 0.8, -2], anchor:[2.2, 0.4, -1.5], tags:['电子','算力']
  },
  {
    id:'battery', cat:'body', type:'electron',
    name:'电池 NP-FZ100', en:'BATTERY PACK', param:'2280mAh · 7.2V',
    desc:'NP-FZ100 锂离子电池，2280mAh / 16.4Wh，CIPA 标准下约 740 张续航，支持 USB-C 供电与机身内充电。',
    specs:[['型号','NP-FZ100'],['容量','2280mAh'],['电压','7.2V'],['续航','约 740 张'],['充电','USB-C']],
    offset:[-2, -2, -0.5], anchor:[-3.4, -1.9, -1.2], tags:['电子','供电']
  },
  {
    id:'sd', cat:'body', type:'electron',
    name:'SD 卡槽', en:'SD CARD SLOT', param:'UHS-II · 双通道',
    desc:'单 SD 卡槽，支持 UHS-II 双通道高速读写，兼容 UHS-I 与 microSD（转接），卡槽位于握把侧下方。',
    specs:[['类型','SD UHS-II'],['总线','双通道'],['最大容量','1TB'],['读写','约 300MB/s']],
    offset:[3.5, -2.5, 0], anchor:[4.6, -1.4, 0.4], tags:['电子','存储']
  },
  {
    id:'heatsink', cat:'body', type:'structure',
    name:'散热模块', en:'HEAT SINK', param:'铜质鳍片 · 静音',
    desc:'铜质散热鳍片与导热垫贴合主板与影像处理器，负责 4K 长时间录制时的热管理，保证持续写入不掉速。',
    specs:[['材质','铜 / 铝合金'],['结构','鳍片阵列'],['导热','硅脂导热垫'],['目标','4K 长录']],
    offset:[2.5, 1.2, -1.2], anchor:[4.2, 0.6, -1.4], tags:['结构','热管理']
  },

  /* ---------------- 镜头 ---------------- */
  {
    id:'hood', cat:'lens', type:'structure',
    name:'遮光罩', en:'LENS HOOD', param:'花瓣形 · 卡口',
    desc:'花瓣形遮光罩 ALC-SH168，卡口式安装，可有效抑制杂散光并保护前镜组，反装时可收纳于镜身。',
    specs:[['型号','ALC-SH168'],['类型','花瓣形'],['接口','卡口'],['材质','工程塑料']],
    offset:[0, 0, 10], anchor:[0, 5.1, 16.9], tags:['结构','光学附件']
  },
  {
    id:'frontElement', cat:'lens', type:'optic',
    name:'前镜组', en:'FRONT ELEMENT', param:'非球面 · Nano AR II',
    desc:'前镜组由两片大口径非球面镜片构成，表面覆盖 Nano AR II 纳米增透镀膜，抑制鬼影与眩光，并呈现柔和的焦外过渡。',
    specs:[['镜片','2 片'],['类型','非球面 / XA'],['镀膜','Nano AR II'],['滤镜口径','82mm']],
    offset:[0, 0, 6], anchor:[0, 3.9, 12.7], tags:['光学','前组']
  },
  {
    id:'barrel', cat:'lens', type:'structure',
    name:'镜筒 & 变焦环', en:'BARREL / ZOOM RING', param:'24–70mm · F2.8',
    desc:'镜筒集成变焦环、对焦环与光圈环，采用内变焦内对焦结构，防尘防滴设计贯穿整个镜身，变焦时长度保持不变。',
    specs:[['焦段','24–70mm'],['光圈','F2.8–22'],['最近对焦','0.21m'],['滤镜','82mm'],['重量','695g']],
    offset:[9, 9, 2], anchor:[0, 4.5, 9.2], tags:['结构','操控']
  },
  {
    id:'focusGroup', cat:'lens', type:'optic',
    name:'对焦镜组', en:'FOCUS GROUP', param:'浮动对焦 · 双 XD',
    desc:'浮动对焦镜组由双 XD 线性马达驱动，实现高速、安静且低振动的自动对焦，兼顾照片与视频的呼吸控制。',
    specs:[['结构','2 片'],['驱动','双 XD 线性'],['对焦','内对焦'],['最近','0.21m']],
    offset:[0, 0, 4], anchor:[0, -2.8, 8.9], tags:['光学','对焦']
  },
  {
    id:'aperture', cat:'lens', type:'drive',
    name:'光圈单元', en:'APERTURE UNIT', param:'11 片 · F2.8–22',
    desc:'11 片圆形光圈叶片，电磁驱动，全开时保持圆形虚化，收缩时形成平滑的多边形光斑，支持无级光圈。',
    specs:[['叶片','11 片'],['范围','F2.8–22'],['驱动','电磁'],['特性','圆形光圈']],
    offset:[0, 0, 2.5], anchor:[0, 3.4, 7.1], tags:['驱动','光学']
  },
  {
    id:'motor', cat:'lens', type:'drive',
    name:'XD 线性马达', en:'XD LINEAR MOTOR', param:'双 XD · 静音',
    desc:'双 XD 线性马达直接驱动对焦镜组，推力大、响应快，配合对焦位置传感器实现微米级定位与极低振动。',
    specs:[['类型','XD 线性'],['数量','2'],['驱动','电磁'],['特性','静音 / 低振动']],
    offset:[3, -4, 1.5], anchor:[1.8, -1.9, 5.7], tags:['驱动','对焦']
  },
  {
    id:'rearGroup', cat:'lens', type:'optic',
    name:'后镜组', en:'REAR GROUP', param:'3 片 · 场曲补偿',
    desc:'后镜组包含 ED 低色散与非球面镜片，负责场曲与色差补偿，使边缘画质在全焦段保持稳定。',
    specs:[['结构','3 片'],['类型','ED / 非球面'],['功能','场曲补偿'],['镀膜','Nano AR II']],
    offset:[0, 0, 1], anchor:[0, -3.0, 4.9], tags:['光学','后组']
  },
  {
    id:'mount', cat:'lens', type:'structure',
    name:'镜头卡口', en:'LENS MOUNT', param:'不锈钢 · 10 触点',
    desc:'不锈钢镜头卡口与 10 触点电子接口，橡胶密封圈提供防尘防滴，卡口环同时固定后镜组与镜筒。',
    specs:[['卡口','E-mount'],['材质','不锈钢'],['触点','10-pin'],['密封','橡胶圈']],
    offset:[-4, -3, 0.5], anchor:[0, -3.6, 3.4], tags:['结构','接口']
  }
];

A7C.typeColor = {
  structure:'#D8A46F',
  optic:'#9BC46F',
  electron:'#B7DD8A',
  drive:'#A8B8C0'
};
A7C.typeName = {
  structure:'结构', optic:'光学', electron:'电子', drive:'驱动'
};

A7C.overview = {
  stats:[
    { v:'24.2', u:'MP', l:'全画幅有效像素' },
    { v:'509', u:'g', l:'机身重量' },
    { v:'4K', u:'30p', l:'6K 超采样视频' }
  ],
  desc:'α7C 将 35mm 全画幅传感器装进 509g 的紧凑机身，配合 FE 24-70mm F2.8 GM II 恒定光圈变焦镜头，构成一套轻量化的专业影像系统。页面中全部 3D 结构均由代码实时生成。',
  camera:[
    ['传感器','35mm 全画幅 Exmor R CMOS'],
    ['有效像素','2420 万'],
    ['处理器','BIONZ XR'],
    ['ISO','100–51200（扩展 50–204800）'],
    ['对焦','693 点相位检测 / 实时眼部'],
    ['防抖','5 轴机身防抖 · 5.0 EV'],
    ['连拍','最高 10fps'],
    ['视频','4K 30p / FHD 120p'],
    ['取景器','236 万点 OLED · 0.59×'],
    ['屏幕','3.0" 92 万点侧翻触控'],
    ['存储','SD UHS-II 单卡槽'],
    ['电池','NP-FZ100 · 约 740 张'],
    ['尺寸','124 × 71.1 × 59.7mm'],
    ['重量','509g（含电池与卡）']
  ],
  lens:[
    ['型号','FE 24-70mm F2.8 GM II'],
    ['结构','15 组 20 片'],
    ['特殊镜片','2 片 XA · 2 片 ED'],
    ['光圈','F2.8–22 · 11 片圆形'],
    ['最近对焦','0.21m（24mm）/ 0.30m（70mm）'],
    ['最大放大','0.32×'],
    ['滤镜口径','82mm'],
    ['对焦','双 XD 线性马达'],
    ['尺寸','87.8 × 119.9mm'],
    ['重量','695g']
  ]
};
