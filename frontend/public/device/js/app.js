/* =========================================================
   A7C — scene / interaction / UI
   ========================================================= */
(function () {
  'use strict';
  const A = window.A7C;
  if (!A || !window.THREE) return;
  const T = THREE;
  const partsData = A.parts;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));

  const boot = $('#boot');
  const stage = $('#stage');
  const webglError = $('#webglError');
  const labelLayer = $('#labels');
  const svg = $('#leaders');
  const partListEl = $('#partList');
  const infoScroll = $('#infoScroll');
  const infoDefault = $('#infoDefault');
  const infoPart = $('#infoPart');
  const infoHeadTitle = $('#infoHeadTitle');
  const infoHeadMeta = $('#infoHeadMeta');
  const hudCount = $('#hudCount');
  const hudStatus = $('#hudStatus');
  const hudView = $('#hudView');
  const dock = $('#dock');
  const guide = $('#guide');

  /* ---------------- renderer ---------------- */
  let renderer;
  try {
    renderer = new T.WebGLRenderer({
      canvas: stage, antialias: true, alpha: true, powerPreference: 'high-performance'
    });
  } catch (err) {
    window.__glError = (err && (err.message || String(err))) || 'unknown';
    console.error('WebGL init failed:', window.__glError);
    if (webglError) webglError.hidden = false;
    if (boot) boot.classList.add('done');
    return;
  }
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.setClearAlpha(0);

  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x08080a, 0.0075);
  const camera = new T.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.2, 300);

  /* ---------------- environment ---------------- */
  (function buildEnvironment() {
    const env = new T.Scene();
    const room = new T.Mesh(
      new T.BoxGeometry(90, 56, 90),
      new T.MeshBasicMaterial({ color: 0x08080a, side: T.BackSide })
    );
    env.add(room);

    function panel(w, h, pos, rot, color, mul) {
      const c = new T.Color(color).multiplyScalar(mul);
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
      m.position.set(pos[0], pos[1], pos[2]);
      m.rotation.set(rot[0], rot[1], rot[2]);
      env.add(m);
    }
    // key softbox
    panel(38, 18, [0, 18, 34], [0, Math.PI, 0], 0xffffff, 2.4);
    // cool side strip
    panel(3, 28, [-30, 5, 7], [0, Math.PI / 2, 0], 0xc9d8bd, 2.6);
    // warm side strip
    panel(2.6, 22, [30, 3, 8], [0, -Math.PI / 2, 0], 0xd8a46f, 2.0);
    // top rim
    panel(26, 9, [0, 27, -15], [0, 0, 0], 0xf2f5ea, 1.5);
    // thin white highlights
    panel(0.7, 16, [12, 10, -28], [0, 0, 0], 0xffffff, 3.2);
    panel(0.6, 12, [-14, 8, -28], [0, 0, 0], 0xe8eee0, 2.2);
    // floor bounce
    panel(30, 30, [0, -20, 0], [-Math.PI / 2, 0, 0], 0x1a2416, 1.6);

    const pmrem = new T.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(env, 0.02, 0.1, 100);
    scene.environment = rt.texture;
    pmrem.dispose();
  })();

  /* ---------------- lights ---------------- */
  scene.add(new T.HemisphereLight(0xdcd8d1, 0x08080a, 0.72));
  const keyLight = new T.DirectionalLight(0xffffff, 3.6); keyLight.position.set(16, 22, 18);
  scene.add(keyLight);
  const fillLight = new T.DirectionalLight(0xc9d8bd, 1.9); fillLight.position.set(-20, 8, 12);
  scene.add(fillLight);
  const rimLight = new T.DirectionalLight(0xd8a46f, 2.2); rimLight.position.set(-8, 12, -18);
  scene.add(rimLight);
  const topLight = new T.DirectionalLight(0xd8e7c8, 1.6); topLight.position.set(6, 20, -8);
  scene.add(topLight);
  const frontFill = new T.DirectionalLight(0xd8d4cc, 1.7); frontFill.position.set(-14, 7, 26);
  scene.add(frontFill);
  const rimCool = new T.DirectionalLight(0xb7cc9e, 2.0); rimCool.position.set(-26, 9, -8);
  scene.add(rimCool);
  const gripFill = new T.PointLight(0xb7cc9e, 110, 40, 2); gripFill.position.set(-16, 2, 12);
  scene.add(gripFill);
  const selectLight = new T.PointLight(0x9bc46f, 0, 22, 2);
  scene.add(selectLight);

  /* ---------------- floor / dust ---------------- */
  const floorUniforms = {
    uColor: { value: new T.Color(0x5f8a44) },
    uTime: { value: 0 }
  };
  const floor = new T.Mesh(
    new T.PlaneGeometry(180, 180),
    new T.ShaderMaterial({
      uniforms: floorUniforms,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      vertexShader: `
        varying vec3 vP;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vP = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec3 vP;
        float gridLine(vec2 p, float scale, float w){
          vec2 q = abs(fract(p * scale) - 0.5);
          return smoothstep(w, 0.0, min(q.x, q.y));
        }
        void main(){
          vec2 p = vP.xz;
          float d = length(p);
          float g1 = gridLine(p, 0.5, 0.018) * 0.30;
          float g2 = gridLine(p, 0.125, 0.010) * 0.55;
          float fade = smoothstep(72.0, 6.0, d);
          float ring = smoothstep(0.9, 0.0, abs(d - 13.5)) * 0.35;
          float ring2 = smoothstep(0.55, 0.0, abs(d - 23.0)) * 0.18;
          float scan = smoothstep(1.5, 0.0, abs(d - mod(uTime * 3.2, 46.0))) * 0.06;
          float pulse = 0.72 + 0.28 * sin(uTime * 0.8 - d * 0.22);
          float a = (g1 + g2 + ring + ring2 + scan) * fade;
          gl_FragColor = vec4(uColor * a * pulse, a * 0.85);
        }`
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -10.6;
  scene.add(floor);

  const pool = new T.Mesh(
    new T.PlaneGeometry(34, 26),
    new T.MeshBasicMaterial({
      map: A._lib.glowTex(), color: 0x2f4a24, transparent: true,
      blending: T.AdditiveBlending, depthWrite: false, opacity: 0.45, toneMapped: false
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -10.5;
  scene.add(pool);

  const dust = (function () {
    const N = 900;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 6 + Math.random() * 42;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = -8 + Math.random() * 34;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const m = new T.PointsMaterial({
      color: 0xc9e8ac, size: 0.13, transparent: true, opacity: 0.5,
      blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    const pts = new T.Points(g, m);
    scene.add(pts);
    return pts;
  })();

  /* ---------------- model ---------------- */
  const groups = A.buildModel({ anisotropy: renderer.capabilities.getMaxAnisotropy() });
  groups.forEach(g => scene.add(g));

  const glowTexture = A._lib.glowTex();
  const partById = new Map();
  const P = [];
  const raycaster = new T.Raycaster();
  const pointerNDC = new T.Vector2();
  const tmpV = new T.Vector3();
  const tmpV2 = new T.Vector3();
  const tmpBox = new T.Box3();
  const tmpSphere = new T.Sphere();

  partsData.forEach((data, i) => {
    const group = groups[i];
    const idx = String(i + 1).padStart(2, '0');
    const accent = A.typeColor[data.type] || '#9BC46F';
    const p = Object.assign({}, data, {
      index: i, idx, group, accent,
      accentColor: new T.Color(accent),
      amount: 0, exploded: false, tween: null,
      offsetVec: new T.Vector3(data.offset[0], data.offset[1], data.offset[2]),
      anchorVec: new T.Vector3(data.anchor[0], data.anchor[1], data.anchor[2]),
      dirVec: new T.Vector3(data.offset[0], data.offset[1], data.offset[2]).normalize(),
      mats: [], glowMats: [], edges: [], glow: null
    });
    partById.set(data.id, p);
    P.push(p);

    // clone materials so highlights stay per-part
    group.traverse(o => {
      if (!o.isMesh) return;
      if (Array.isArray(o.material)) o.material = o.material.map(mm => mm.clone());
      else o.material = o.material.clone();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(mm => {
        if (mm.userData.baseEI == null) {
          mm.userData.baseEI = mm.emissiveIntensity == null ? 1 : mm.emissiveIntensity;
          mm.userData.baseEmissive = mm.emissive ? mm.emissive.clone() : null;
          p.mats.push(mm);
          if (mm.emissive) p.glowMats.push(mm);
        }
      });
    });

    // bounds before adding helpers
    tmpBox.setFromObject(group);
    tmpBox.getCenter(p.center = new T.Vector3());
    tmpBox.getBoundingSphere(tmpSphere);
    p.radius = tmpSphere.radius;

    // outline edges
    if (tmpSphere.radius < 9) {
      group.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh) return;
        const mm = Array.isArray(o.material) ? o.material[0] : o.material;
        if (!mm || mm.transparent || mm.type === 'MeshBasicMaterial') return;
        if (o.geometry.attributes.position.count > 6000) return;
        let eg;
        try { eg = new T.EdgesGeometry(o.geometry, 34); } catch (e) { return; }
        const em = new T.LineBasicMaterial({
          color: p.accentColor, transparent: true, opacity: 0.85,
          blending: T.AdditiveBlending, depthWrite: false, toneMapped: false
        });
        const line = new T.LineSegments(eg, em);
        line.visible = false;
        line.raycast = () => {};
        o.add(line);
        p.edges.push(line);
      });
    }

    // glow sprite
    const spr = new T.Sprite(new T.SpriteMaterial({
      map: glowTexture, color: p.accentColor, transparent: true,
      blending: T.AdditiveBlending, depthWrite: false, depthTest: false,
      opacity: 0.32, toneMapped: false
    }));
    spr.position.copy(p.center);
    spr.scale.setScalar(Math.max(2.2, p.radius * 2.6));
    spr.visible = false;
    spr.raycast = () => {};
    spr.renderOrder = 20;
    group.add(spr);
    p.glow = spr;

    const ov = new T.Vector3(data.offset[0], data.offset[1], data.offset[2]);
    p.explodedPos = p.center.clone().add(ov);
  });

  /* ---------------- labels ---------------- */
  const SVGNS = 'http://www.w3.org/2000/svg';
  P.forEach(p => {
    const el = document.createElement('div');
    el.className = 'lbl';
    el.style.setProperty('--accent', p.accent);
    const i = document.createElement('span'); i.className = 'i'; i.textContent = p.idx;
    const n = document.createElement('span'); n.className = 'n'; n.textContent = p.name;
    const s = document.createElement('span'); s.className = 'p'; s.textContent = p.param;
    el.appendChild(n); el.appendChild(s); el.appendChild(i);
    labelLayer.appendChild(el);
    p.labelEl = el;

    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'lk');
    const line = document.createElementNS(SVGNS, 'line');
    line.setAttribute('stroke', p.accent);
    const dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('r', '2.4');
    dot.setAttribute('fill', p.accent);
    g.appendChild(line); g.appendChild(dot);
    svg.appendChild(g);
    p.lk = g; p.line = line; p.dot = dot;
  });

  /* ---------------- UI: list ---------------- */
  const GROUP_LABEL = { body: ['机身', 'BODY'], lens: ['镜头', 'LENS'] };
  let lastCat = null;
  P.forEach(p => {
    if (p.cat !== lastCat) {
      lastCat = p.cat;
      const h = document.createElement('div');
      h.className = 'group-head';
      h.innerHTML = '<i>' + GROUP_LABEL[p.cat][0] + '</i>' + GROUP_LABEL[p.cat][1];
      partListEl.appendChild(h);
    }
    const row = document.createElement('button');
    row.className = 'part-row';
    row.dataset.id = p.id;
    row.innerHTML =
      '<span class="idx">' + p.idx + '</span>' +
      '<span class="names"><span class="cn">' + p.name + '</span><span class="en">' + p.en + '</span></span>' +
      '<span class="state"></span>';
    partListEl.appendChild(row);
    p.row = row;
    row.addEventListener('click', () => {
      document.body.classList.remove('list-open');
      if (selected === p) {
        setPartExploded(p, !p.exploded);
        refreshGlow();
      } else {
        selectPart(p, true);
      }
    });
    row.addEventListener('mouseenter', () => { setHovered(p); });
    row.addEventListener('mouseleave', () => { if (hovered === p) setHovered(null); });
  });
  $('#partCount').textContent = P.length;
  $('#hudCount').nextElementSibling.textContent = '/' + P.length;

  /* ---------------- UI: overview ---------------- */
  function specRows(rows) {
    return rows.map(r => '<div class="spec-row"><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>').join('');
  }
  function specGroup(title, sub, rows) {
    return '<div class="spec-group"><div class="spec-h"><span>' + title + '</span><b>' + (sub || '') + '</b></div><dl>' + specRows(rows) + '</dl></div>';
  }
  function buildOverview() {
    const o = A.overview;
    const stats = o.stats.map(s =>
      '<div class="stat"><b>' + s.v + '<small>' + s.u + '</small></b><span>' + s.l + '</span></div>'
    ).join('');
    infoDefault.innerHTML =
      '<div class="ip-kicker">SYSTEM OVERVIEW / 系统概览</div>' +
      '<div class="ov-title"><h2>α7C<em>ILCE-7C</em></h2><div class="sub">FULL-FRAME · 2020</div></div>' +
      '<p class="ov-desc">' + o.desc + '</p>' +
      '<div class="stat-row">' + stats + '</div>' +
      specGroup('机身 / CAMERA BODY', '14 PARTS', o.camera) +
      specGroup('镜头 / FE 24-70MM F2.8 GM II', '8 PARTS', o.lens) +
      '<div class="ip-note"><b>GUIDE</b> 点击左侧清单或 3D 模型中的任意部件，查看结构说明与关键参数；再次点击可将部件归位。</div>' +
      '<div class="ip-note" style="border-color:rgba(242,240,236,0.14);background:rgba(242,240,236,0.03);color:rgb(110,106,100);margin-top:8px"><b style="color:rgb(156,152,144)">NOTE</b> 模型与参数为公开资料整理，仅用于可视化演示，非官方工程数据。</div>';
  }
  buildOverview();

  function icon(name) {
    if (name === 'expand') return '<svg viewBox="0 0 24 24"><path d="M12 3v6M12 3l-3 3M12 3l3 3M12 21v-6M12 21l-3-3M12 21l3-3M3 12h6M3 12l3-3M3 12l3 3M21 12h-6M21 12l-3-3M21 12l-3 3"/></svg>';
    if (name === 'collapse') return '<svg viewBox="0 0 24 24"><path d="M12 8V2M12 2L9 5M12 2l3 3M12 16v6M12 22l-3-3M12 22l3-3M8 12H2M2 12l3-3M2 12l3 3M16 12h6M22 12l-3-3M22 12l-3 3"/></svg>';
    return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
  }

  function renderPartInfo(p) {
    const tagType = A.typeName[p.type] || '结构';
    const tags = ['<span class="tag hot">' + tagType + '</span>'].concat(
      p.tags.map(t => '<span class="tag">' + t + '</span>')
    ).join('');
    infoPart.innerHTML =
      '<div class="ip-ghost">' + p.idx + '</div>' +
      '<div class="ip-head"><div class="ip-num">' + p.idx + '</div>' +
      '<div class="ip-title"><h2>' + p.name + '</h2><div class="en">' + p.en + '</div></div></div>' +
      '<div class="ip-tags">' + tags + '</div>' +
      '<div class="ip-body">' + p.desc + '</div>' +
      '<div class="ip-specs">' + specRows(p.specs) + '</div>' +
      '<div class="ip-actions">' +
      '<button class="ip-btn accent" data-ip="toggle">' + (p.exploded ? icon('collapse') : icon('expand')) + '<span>' + (p.exploded ? '归位' : '拆解') + '</span></button>' +
      '<button class="ip-btn" data-ip="focus">' + icon('focus') + '<span>聚焦视角</span></button>' +
      '</div>' +
      '<div class="ip-note" style="border-color:rgba(242,240,236,0.14);background:rgba(242,240,236,0.03);color:rgb(110,106,100)"><b style="color:rgb(156,152,144)">HINT</b> 点击「聚焦视角」拉近观察，再次点击模型可切换拆解 / 归位。</div>';
    infoPart.style.animation = 'none';
    void infoPart.offsetWidth;
    infoPart.style.animation = '';
    infoScroll.scrollTop = 0;
  }

  function showInfo(p) {
    if (p) {
      infoDefault.hidden = true;
      infoPart.hidden = false;
      renderPartInfo(p);
      infoHeadTitle.textContent = '部件详情';
      infoHeadMeta.textContent = 'COMPONENT ' + p.idx;
    } else {
      infoDefault.hidden = false;
      infoPart.hidden = true;
      infoHeadTitle.textContent = '整机参数';
      infoHeadMeta.textContent = 'SPECIFICATION';
    }
    document.body.classList.toggle('has-selection', !!p);
  }

  infoPart.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ip]');
    if (!btn || !selected) return;
    if (btn.dataset.ip === 'toggle') {
      setPartExploded(selected, !selected.exploded);
    } else if (btn.dataset.ip === 'focus') {
      focusPart(selected);
    }
  });

  /* ---------------- state ---------------- */
  let selected = null;
  let hovered = null;
  let showLabels = true;
  let now = 0;
  let time = 0;

  function refreshGlow() {
    P.forEach(p => {
      const mode = p === selected ? 2 : (p === hovered ? 1 : 0);
      p.glowMats.forEach(m => {
        if (mode === 2) {
          m.emissive.copy(p.accentColor);
          m.emissiveIntensity = 0.32;
        } else if (mode === 1) {
          m.emissive.copy(p.accentColor);
          m.emissiveIntensity = 0.14;
        } else {
          m.emissive.copy(m.userData.baseEmissive);
          m.emissiveIntensity = m.userData.baseEI;
        }
      });
      const on = mode === 2;
      p.edges.forEach(e => { e.visible = on; });
      if (p.glow) p.glow.visible = on;
    });
    if (selected) {
      selectLight.color.copy(selected.accentColor);
      selectLight.position.copy(selected.center).add(selected.group.position);
    }
    selectLight.intensity = selected ? 55 : 0;
  }

  function selectPart(p, explode) {
    if (!p) return deselect();
    selected = p;
    if (explode && !p.exploded) setPartExploded(p, true);
    showInfo(p);
    syncList();
    refreshGlow();
    if (p.row) p.row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (guide) guide.classList.add('out');
  }

  function deselect() {
    selected = null;
    showInfo(null);
    syncList();
    refreshGlow();
  }

  function setHovered(p) {
    if (hovered === p) return;
    hovered = p;
    stage.classList.toggle('hovering', !!p);
    refreshGlow();
  }

  function syncList() {
    P.forEach(p => {
      p.row.classList.toggle('active', p === selected);
      p.row.classList.toggle('out', p.exploded);
    });
  }

  function updateHud() {
    const count = P.filter(p => p.exploded).length;
    hudCount.textContent = String(count).padStart(2, '0');
    hudCount.classList.toggle('hot', count > 0);
    hudStatus.textContent = count === 0 ? 'ASSEMBLED' : (count === P.length ? 'EXPLODED' : 'PARTIAL');
    hudStatus.classList.toggle('hot', count > 0);
    hudView.textContent = orbit.auto ? 'AUTO ORBIT' : 'ORBIT';
  }

  function updateDock() {
    const r = document.querySelector('[data-act="rotate"]');
    const l = document.querySelector('[data-act="labels"]');
    if (r) r.classList.toggle('on', orbit.auto);
    if (l) l.classList.toggle('on', showLabels);
    updateHud();
  }

  /* ---------------- explode tween ---------------- */
  const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function setPartExploded(p, on, delay) {
    p.exploded = !!on;
    p.tween = {
      from: p.amount,
      to: on ? 1 : 0,
      t0: now + (delay || 0),
      dur: 0.85
    };
    syncList();
    updateHud();
    if (selected === p) renderPartInfo(p);
  }

  function setAllExploded(on) {
    P.forEach((p, i) => setPartExploded(p, on, i * 0.035));
    if (on) {
      orbit.tTarget.set(0.8, 0.2, 8.4);
      orbit.tRadius = Math.max(orbit.tRadius, 88 * aspectFactor);
      orbit.tPhi = Math.min(orbit.tPhi, 1.14);
    } else {
      orbit.tTarget.set(0, 0.25, 7.4);
      orbit.tRadius = 58 * aspectFactor;
    }
    if (guide) guide.classList.add('out');
  }

  function focusPart(p) {
    if (!p) return;
    const target = p.center.clone().add(p.offsetVec);
    orbit.tTarget.copy(target);
    orbit.tRadius = Math.max(28, Math.min(38, p.radius * 4.2));
    orbit.auto = false;
    updateDock();
    if (guide) guide.classList.add('out');
  }

  /* ---------------- orbit ---------------- */
  const orbit = {
    theta: -0.62, phi: 1.28, radius: 66,
    tTheta: -1.05, tPhi: 1.17, tRadius: 58,
    target: new T.Vector3(0, 1.0, 8.0),
    tTarget: new T.Vector3(0, 0.25, 7.4),
    auto: false, intro: true,
    minR: 22, maxR: 110
  };
  let dragging = false;
  let dragState = null;
  const pointers = new Map();
  let pinchDist = 0, pinchRadius = 0;

  function updateOrbit(dt) {
    if (orbit.auto && !dragState) {
      orbit.tTheta += dt * 0.085;
    }
    const k = 1 - Math.exp(-dt * (orbit.intro ? 3.4 : 7.5));
    orbit.theta += (orbit.tTheta - orbit.theta) * k;
    orbit.phi += (orbit.tPhi - orbit.phi) * k;
    orbit.radius += (orbit.tRadius - orbit.radius) * k;
    orbit.target.lerp(orbit.tTarget, k);

    const sp = Math.sin(orbit.phi), cp = Math.cos(orbit.phi);
    camera.position.set(
      orbit.target.x + orbit.radius * sp * Math.sin(orbit.theta),
      orbit.target.y + orbit.radius * cp,
      orbit.target.z + orbit.radius * sp * Math.cos(orbit.theta)
    );
    camera.lookAt(orbit.target);
  }

  function clampTarget() {
    orbit.tTarget.x = T.MathUtils.clamp(orbit.tTarget.x, -38, 38);
    orbit.tTarget.y = T.MathUtils.clamp(orbit.tTarget.y, -18, 22);
    orbit.tTarget.z = T.MathUtils.clamp(orbit.tTarget.z, -18, 34);
  }

  function resetView() {
    orbit.tTheta = -1.05;
    orbit.tPhi = 1.17;
    orbit.tRadius = 58 * aspectFactor;
    orbit.tTarget.set(0, 0.25, 7.4);
    orbit.auto = false;
    updateDock();
  }

  function pointerPos(e) {
    return { x: e.clientX, y: e.clientY };
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2 && e.button !== 1) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, pointerPos(e));
    orbit.intro = false;
    if (pointers.size === 1) {
      dragging = true;
      dragState = {
        x: e.clientX, y: e.clientY,
        mode: (e.button === 2 || e.button === 1 || e.shiftKey) ? 'pan' : 'rotate',
        dist: 0
      };
      stage.classList.add('dragging');
      if (orbit.auto) { orbit.auto = false; updateDock(); }
      if (guide) guide.classList.add('out');
    } else if (pointers.size === 2) {
      const arr = Array.from(pointers.values());
      pinchDist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      pinchRadius = orbit.tRadius;
      dragState = null;
    }
    e.preventDefault();
  });

  stage.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === 'mouse') hoverAt(e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, pointerPos(e));

    if (pointers.size >= 2) {
      const arr = Array.from(pointers.values());
      const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      if (pinchDist > 0) {
        orbit.tRadius = T.MathUtils.clamp(pinchRadius * (pinchDist / Math.max(1, d)), orbit.minR, orbit.maxR);
      }
      return;
    }

    if (!dragState) {
      if (e.pointerType === 'mouse') hoverAt(e.clientX, e.clientY);
      return;
    }
    dragState.dist += Math.abs(dx) + Math.abs(dy);
    if (dragState.mode === 'pan') {
      const s = orbit.radius * 0.00135;
      const right = new T.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const up = new T.Vector3().setFromMatrixColumn(camera.matrix, 1);
      orbit.tTarget.addScaledVector(right, -dx * s).addScaledVector(up, dy * s);
      clampTarget();
    } else {
      orbit.tTheta -= dx * 0.0062;
      orbit.tPhi = T.MathUtils.clamp(orbit.tPhi - dy * 0.0052, 0.26, 1.5);
    }
  });

  function endPointer(e) {
    const was = dragState;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      dragging = false;
      stage.classList.remove('dragging');
      dragState = null;
      if (was && was.dist < 7 && e.button !== 2) {
        clickAt(e.clientX, e.clientY);
      }
    } else if (pointers.size === 1) {
      const arr = Array.from(pointers.entries());
      const last = arr[0];
      dragState = {
        x: last[1].x, y: last[1].y,
        mode: 'rotate', dist: 0
      };
    }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      dragging = false; dragState = null;
      stage.classList.remove('dragging');
    }
  });
  stage.addEventListener('pointerleave', () => {
    if (!dragState) setHovered(null);
  });
  stage.addEventListener('contextmenu', e => e.preventDefault());
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbit.tRadius = T.MathUtils.clamp(
      orbit.tRadius * Math.exp(e.deltaY * 0.00115), orbit.minR, orbit.maxR
    );
    orbit.intro = false;
  }, { passive: false });

  function hoverAt(x, y) {
    const p = pick(x, y);
    setHovered(p);
  }

  function pick(x, y) {
    const rect = stage.getBoundingClientRect();
    pointerNDC.x = ((x - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((y - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(groups, true);
    for (let i = 0; i < hits.length; i++) {
      let o = hits[i].object;
      while (o && !o.userData.partId) o = o.parent;
      if (o) return partById.get(o.userData.partId) || null;
    }
    return null;
  }

  function clickAt(x, y) {
    const p = pick(x, y);
    if (!p) { deselect(); return; }
    if (selected === p) {
      setPartExploded(p, !p.exploded);
      refreshGlow();
      return;
    }
    selectPart(p, true);
    if (p.cat === 'lens') {
      // keep current view for lens parts, they are already in frame
    }
  }

  /* ---------------- labels update ---------------- */
  function projectPoint(world, out) {
    tmpV.copy(world).project(camera);
    out.x = (tmpV.x * 0.5 + 0.5) * window.innerWidth;
    out.y = (-tmpV.y * 0.5 + 0.5) * window.innerHeight;
    out.z = tmpV.z;
    return out;
  }

  const projA = new T.Vector3();
  const projB = new T.Vector3();
  const screenA = { x: 0, y: 0, z: 0 };
  const screenB = { x: 0, y: 0, z: 0 };

  function updateLabels() {
    const W = window.innerWidth, H = window.innerHeight;
    const desktop = W > 900;
    let safeL, safeR, safeT, safeB;
    if (desktop) {
      const leftW = W > 1200 ? 296 : 264;
      const rightW = W > 1200 ? 344 : 308;
      safeL = (W > 1200 ? 26 : 18) + leftW + 18;
      safeR = W - ((W > 1200 ? 26 : 18) + rightW + 18);
      safeT = 112; safeB = H - 118;
    } else {
      safeL = 12; safeR = W - 12; safeT = 90; safeB = H - 116;
    }
    const visible = [];

    P.forEach(p => {
      const isOn = p === selected || p === hovered;
      const show = showLabels && (p.amount > 0.12 || isOn);
      if (!show) {
        if (p.lk.style.display !== 'none') { p.lk.style.display = 'none'; p.labelEl.classList.remove('show'); }
        return;
      }
      tmpV2.copy(p.anchorVec).add(p.group.position);
      projectPoint(tmpV2, screenA);
      projA.copy(tmpV2).addScaledVector(p.dirVec, 3.2);
      projectPoint(projA, screenB);
      let dx = screenB.x - screenA.x, dy = screenB.y - screenA.y;
      let len = Math.hypot(dx, dy);
      if (len < 8) { dx = 0; dy = -1; } else { dx /= len; dy /= len; }
      let x = screenA.x + dx * 82;
      let y = screenA.y + dy * 82;
      if (screenA.z > 1 || screenA.z < -1) { p.lk.style.display = 'none'; p.labelEl.classList.remove('show'); return; }
      const halfW = 74;
      x = T.MathUtils.clamp(x, safeL + halfW, safeR - halfW);
      y = T.MathUtils.clamp(y, safeT + 14, safeB - 14);
      visible.push({ p, x, y, ax: screenA.x, ay: screenA.y, z: screenA.z });
    });

    // 2D-aware collision relaxation: only labels close in X push each other down
    visible.sort((a, b) => a.y - b.y);
    for (let i = 0; i < visible.length; i++) {
      for (let j = 0; j < i; j++) {
        if (Math.abs(visible[i].x - visible[j].x) < 128 &&
            visible[i].y - visible[j].y < 34 &&
            visible[i].y >= visible[j].y) {
          visible[i].y = visible[j].y + 34;
        }
      }
    }
    visible.forEach(v => {
      v.y = Math.min(v.y, safeB - 14);
      v.x = T.MathUtils.clamp(v.x, safeL + 66, safeR - 66);
    });
    // bottom-up pass so labels pinned to the lower bound don't stack
    visible.sort((a, b) => b.y - a.y);
    for (let i = 0; i < visible.length; i++) {
      for (let j = 0; j < i; j++) {
        if (Math.abs(visible[i].x - visible[j].x) < 128 &&
            Math.abs(visible[i].y - visible[j].y) < 34) {
          visible[i].y = Math.max(safeT + 14, visible[j].y - 34);
        }
      }
    }

    visible.forEach(v => {
      const p = v.p;
      p.lk.style.display = '';
      p.labelEl.classList.add('show');
      p.labelEl.classList.toggle('on', p === selected);
      p.labelEl.style.transform = 'translate3d(' + v.x.toFixed(1) + 'px,' + v.y.toFixed(1) + 'px,0) translate(-50%,-50%)';
      const ddx = v.x - v.ax, ddy = v.y - v.ay;
      const dl = Math.hypot(ddx, ddy) || 1;
      const ex = v.x - ddx / dl * 30;
      const ey = v.y - ddy / dl * 22;
      p.line.setAttribute('x1', v.ax.toFixed(1)); p.line.setAttribute('y1', v.ay.toFixed(1));
      p.line.setAttribute('x2', ex.toFixed(1)); p.line.setAttribute('y2', ey.toFixed(1));
      p.dot.setAttribute('cx', v.ax.toFixed(1)); p.dot.setAttribute('cy', v.ay.toFixed(1));
      p.lk.classList.toggle('on', p === selected);
    });
  }

  /* ---------------- dock / keyboard ---------------- */
  // mobile list toggle
  const dockBtns = document.querySelector('.dock-btns');
  const mobileBtn = document.createElement('button');
  mobileBtn.className = 'btn only-mobile toggle';
  mobileBtn.dataset.act = 'list';
  mobileBtn.title = '部件清单';
  mobileBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg><span>清单</span>';
  dockBtns.insertBefore(mobileBtn, dockBtns.firstChild);

  function doAction(act) {
    if (act === 'explode') setAllExploded(true);
    else if (act === 'assemble') setAllExploded(false);
    else if (act === 'reset') resetView();
    else if (act === 'rotate') { orbit.auto = !orbit.auto; updateDock(); }
    else if (act === 'labels') {
      showLabels = !showLabels;
      if (!showLabels) {
        P.forEach(p => { p.labelEl.classList.remove('show'); p.lk.style.display = 'none'; });
      }
      updateDock();
    }
    else if (act === 'list') document.body.classList.toggle('list-open');
    if (guide) guide.classList.add('out');
  }
  $$('[data-act]').forEach(b => b.addEventListener('click', () => doAction(b.dataset.act)));

  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (e.code === 'Space') {
      e.preventDefault();
      const all = P.every(p => p.exploded);
      setAllExploded(!all);
    } else if (k === 'r') resetView();
    else if (k === 'a') { orbit.auto = !orbit.auto; updateDock(); }
    else if (k === 'l') doAction('labels');
    else if (e.key === 'Escape') deselect();
  });

  /* ---------------- resize ---------------- */
  let aspectFactor = 1;
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    const a = w / h;
    camera.aspect = a;
    camera.fov = a < 0.8 ? 42 : (a < 1.05 ? 34 : 30);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

    const f = a < 0.8 ? 1.4 : (a < 1.05 ? 1.15 : 1);
    if (f !== aspectFactor) {
      const k = f / aspectFactor;
      orbit.tRadius *= k;
      orbit.radius *= k;
      aspectFactor = f;
    }
  }
  window.addEventListener('resize', onResize);
  onResize();

  /* ---------------- boot ---------------- */
  const bootStatus = $('#bootStatus');
  setTimeout(() => { if (bootStatus) bootStatus.textContent = 'CALIBRATING OPTICAL ASSEMBLY'; }, 600);
  setTimeout(() => { if (bootStatus) bootStatus.textContent = 'READY'; }, 1500);
  setTimeout(() => { if (boot) boot.classList.add('done'); }, 2300);
  setTimeout(() => { if (guide) guide.classList.add('out'); }, 11000);
  if (boot) boot.addEventListener('pointerdown', () => boot.classList.add('done'));

  /* ---------------- loop ---------------- */
  let last = performance.now() / 1000;
  let labelAcc = 0;
  function tick() {
    const t = performance.now() / 1000;
    let dt = t - last;
    last = t;
    if (dt > 0.06) dt = 0.06;
    now = t;
    time = t;

    // intro damping ends
    if (orbit.intro && t > 3.2) orbit.intro = false;

    // tweens
    P.forEach(p => {
      const tw = p.tween;
      if (!tw) return;
      const k = (now - tw.t0) / tw.dur;
      if (now < tw.t0) return;
      const e = easeInOutCubic(Math.min(1, k));
      p.amount = tw.from + (tw.to - tw.from) * e;
      p.group.position.copy(p.offsetVec).multiplyScalar(p.amount);
      if (k >= 1) {
        p.amount = tw.to;
        p.group.position.copy(p.offsetVec).multiplyScalar(p.amount);
        p.tween = null;
      }
    });

    updateOrbit(dt);

    // selected pulse
    if (selected) {
      const pulse = 0.3 + 0.12 * Math.sin(t * 3.6);
      selected.glowMats.forEach(m => { m.emissiveIntensity = pulse; });
      if (selected.glow) {
        selected.glow.material.opacity = 0.2 + 0.08 * (0.5 + 0.5 * Math.sin(t * 3.6));
      }
      selectLight.position.copy(selected.center).add(selected.group.position);
      selectLight.intensity = 42 + 16 * (0.5 + 0.5 * Math.sin(t * 3.6));
    }

    dust.rotation.y += dt * 0.012;
    floorUniforms.uTime.value = t;
    pool.material.opacity = 0.38 + 0.06 * Math.sin(t * 0.9);

    labelAcc += dt;
    if (labelAcc > 0.016) { updateLabels(); labelAcc = 0; }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  syncList();
  updateDock();
  refreshGlow();
  onResize();
  requestAnimationFrame(tick);

  // small dev hook (used by the local screenshot harness)
  window.__A7C_DEBUG = {
    orbit, parts: P, selectPart, setAllExploded, focusPart,
    scene, camera, renderer
  };
})();
