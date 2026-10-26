/* =========================================================
   A7C — procedural model
   全部几何体 / 纹理由代码生成，不依赖任何外部模型或贴图文件
   ========================================================= */
(function () {
  'use strict';
  const T = THREE;
  const A = window.A7C;

  let MAX_ANISO = 8;
  let seed = 20248;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  /* ---------------- textures ---------------- */
  function makeTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = MAX_ANISO;
    return t;
  }

  function textTex(text, w, h, opt) {
    opt = opt || {};
    return makeTex(w, h, (ctx) => {
      const fs = opt.fs || Math.floor(h * 0.52);
      const weight = opt.weight || 600;
      const font = opt.font || '"Bahnschrift","Segoe UI",Arial,sans-serif';
      ctx.font = weight + ' ' + fs + 'px ' + font;
      if ('letterSpacing' in ctx) ctx.letterSpacing = (opt.spacing == null ? 2 : opt.spacing) + 'px';
      ctx.textAlign = opt.align || 'center';
      ctx.textBaseline = 'middle';
      if (opt.glow) { ctx.shadowColor = opt.glow; ctx.shadowBlur = opt.glowBlur || 16; }
      ctx.fillStyle = opt.color || '#f2f8fb';
      const x = opt.align === 'left' ? (opt.padX || 0) : w / 2;
      ctx.fillText(text, x, h / 2 + (opt.dy || 0));
    });
  }

  function leatherTex() {
    seed = 77;
    return makeTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#0d0f12'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5200; i++) {
        const x = rand() * w, y = rand() * h, r = 1 + rand() * 3.4;
        const g = 12 + Math.floor(rand() * 22);
        ctx.fillStyle = 'rgba(' + g + ',' + (g + 1) + ',' + (g + 3) + ',.55)';
        ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.6 + rand() * 0.6), rand() * 3.14, 0, 6.283); ctx.fill();
      }
      for (let i = 0; i < 260; i++) {
        const x = rand() * w, y = rand() * h, r = 3 + rand() * 9;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(0,0,0,.28)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      }
    });
  }

  function pcbTex() {
    seed = 991;
    return makeTex(1024, 768, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#0c2b22'); g.addColorStop(.55, '#0a241d'); g.addColorStop(1, '#081c17');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // fine grid
      ctx.strokeStyle = 'rgba(120,200,170,.045)'; ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      // traces
      ctx.lineCap = 'round';
      for (let i = 0; i < 90; i++) {
        let x = rand() * w, y = rand() * h;
        ctx.beginPath(); ctx.moveTo(x, y);
        const segs = 2 + Math.floor(rand() * 4);
        for (let s = 0; s < segs; s++) {
          if (rand() < 0.5) x += (rand() < 0.5 ? -1 : 1) * (18 + rand() * 110);
          else y += (rand() < 0.5 ? -1 : 1) * (18 + rand() * 90);
          x = Math.max(10, Math.min(w - 10, x)); y = Math.max(10, Math.min(h - 10, y));
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(196,156,82,' + (0.12 + rand() * 0.3) + ')';
        ctx.lineWidth = 1 + rand() * 2.6;
        ctx.stroke();
      }
      // pads & vias
      for (let i = 0; i < 260; i++) {
        const x = rand() * w, y = rand() * h, r = 2 + rand() * 5;
        ctx.fillStyle = 'rgba(212,170,90,.5)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#0a1f19';
        ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 6.283); ctx.fill();
      }
      // silkscreen
      ctx.font = '600 18px "Cascadia Mono",Consolas,monospace';
      ctx.fillStyle = 'rgba(225,238,235,.7)';
      ctx.fillText('BIONZ XR', 120, 150);
      ctx.fillText('U3', 740, 120);
      ctx.fillText('WIFI/BT', 700, 640);
      ctx.fillText('REV 1.4', 96, 660);
      ctx.strokeStyle = 'rgba(225,238,235,.45)'; ctx.lineWidth = 2;
      ctx.strokeRect(96, 196, 330, 260);
      ctx.strokeRect(560, 300, 180, 190);
      // connector footprints
      ctx.fillStyle = 'rgba(10,12,14,.85)';
      ctx.fillRect(40, 40, 120, 54);
      ctx.fillRect(860, 400, 120, 44);
    });
  }

  function sensorTex() {
    seed = 551;
    return makeTex(900, 600, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#0b2233'); g.addColorStop(.5, '#102f45'); g.addColorStop(1, '#081826');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // photosite grid
      for (let y = 40; y < h - 40; y += 6) {
        for (let x = 40; x < w - 40; x += 6) {
          const v = Math.random();
          ctx.fillStyle = 'rgba(' + (40 + v * 50) + ',' + (90 + v * 70) + ',' + (130 + v * 80) + ',.5)';
          ctx.fillRect(x, y, 3, 3);
        }
      }
      // gold border & pads
      ctx.strokeStyle = 'rgba(220,178,92,.85)'; ctx.lineWidth = 10;
      ctx.strokeRect(16, 16, w - 32, h - 32);
      ctx.fillStyle = 'rgba(230,188,98,.9)';
      for (let i = 0; i < 26; i++) {
        ctx.fillRect(26 + i * 33, 22, 18, 7);
        ctx.fillRect(26 + i * 33, h - 29, 18, 7);
      }
      ctx.font = '600 30px "Bahnschrift",Arial,sans-serif';
      ctx.fillStyle = 'rgba(220,238,245,.85)';
      ctx.textAlign = 'center';
      ctx.fillText('35mm  FULL  FRAME', w / 2, 108);
      ctx.font = '500 20px "Cascadia Mono",Consolas,monospace';
      ctx.fillStyle = 'rgba(160,205,225,.7)';
      ctx.fillText('EXMOR R  ·  CMOS  IMAGE  SENSOR', w / 2, h - 80);
    });
  }

  function screenTex() {
    seed = 8123;
    return makeTex(1000, 640, (ctx, w, h) => {
      // live view — night city
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.78);
      sky.addColorStop(0, '#07131f'); sky.addColorStop(.45, '#12324a');
      sky.addColorStop(.72, '#6d5a63'); sky.addColorStop(1, '#e9a06a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      // sun glow
      const sg = ctx.createRadialGradient(w * .68, h * .52, 0, w * .68, h * .52, 300);
      sg.addColorStop(0, 'rgba(255,196,130,.95)'); sg.addColorStop(.25, 'rgba(255,150,80,.45)');
      sg.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
      // bokeh
      for (let i = 0; i < 26; i++) {
        const x = rand() * w, y = h * .35 + rand() * h * .5, r = 8 + rand() * 44;
        const col = rand() < .5 ? '255,190,120' : '120,220,255';
        const bg = ctx.createRadialGradient(x, y, 0, x, y, r);
        bg.addColorStop(0, 'rgba(' + col + ',.55)');
        bg.addColorStop(.6, 'rgba(' + col + ',.16)');
        bg.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      }
      // skyline
      ctx.fillStyle = 'rgba(5,10,16,.94)';
      let x = 0;
      while (x < w) {
        const bw = 26 + rand() * 70, bh = 60 + rand() * 230;
        ctx.fillRect(x, h - 120 - bh, bw, bh + 140);
        ctx.fillStyle = 'rgba(255,178,110,.5)';
        for (let wy = h - 110 - bh; wy < h - 130; wy += 22) {
          for (let wx = x + 7; wx < x + bw - 7; wx += 15) {
            if (rand() < .3) ctx.fillRect(wx, wy, 5, 8);
          }
        }
        ctx.fillStyle = 'rgba(5,10,16,.94)';
        x += bw + 3;
      }
      // bottom ground glow
      const gg = ctx.createLinearGradient(0, h * .78, 0, h);
      gg.addColorStop(0, 'rgba(20,40,55,0)'); gg.addColorStop(1, 'rgba(6,14,22,.9)');
      ctx.fillStyle = gg; ctx.fillRect(0, h * .7, w, h * .3);

      // ---- camera UI ----
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
      const bx = w * .33, by = h * .3, bw2 = w * .34, bh2 = h * .36;
      const L = 34;
      [[bx, by, 1, 1], [bx + bw2, by, -1, 1], [bx, by + bh2, 1, -1], [bx + bw2, by + bh2, -1, -1]].forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p[0] + p[2] * L, p[1]); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0], p[1] + p[3] * L);
        ctx.stroke();
      });
      // center cross
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 12, h * .48); ctx.lineTo(w / 2 + 12, h * .48);
      ctx.moveTo(w / 2, h * .48 - 12); ctx.lineTo(w / 2, h * .48 + 12);
      ctx.stroke();

      // top bar
      ctx.fillStyle = 'rgba(3,8,12,.55)'; ctx.fillRect(0, 0, w, 62);
      ctx.font = '600 26px "Bahnschrift",Arial'; ctx.fillStyle = '#f2f8fb'; ctx.textAlign = 'left';
      ctx.fillText('4K', 30, 42);
      ctx.font = '500 18px "Cascadia Mono",Consolas'; ctx.fillStyle = '#ffb27a';
      ctx.fillText('24p  100M', 78, 41);
      ctx.fillStyle = '#ff5a3c'; ctx.beginPath(); ctx.arc(w - 176, 32, 9, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#f2f8fb'; ctx.font = '600 20px "Bahnschrift",Arial';
      ctx.fillText('REC', w - 158, 39);
      // battery
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
      ctx.strokeRect(w - 92, 20, 46, 22); ctx.fillRect(w - 46, 26, 5, 10);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(w - 88, 24, 30, 14);
      // bottom bar
      ctx.fillStyle = 'rgba(3,8,12,.55)'; ctx.fillRect(0, h - 62, w, 62);
      ctx.font = '500 20px "Cascadia Mono",Consolas'; ctx.fillStyle = '#d9ecf4'; ctx.textAlign = 'left';
      ctx.fillText('1/60', 28, h - 24);
      ctx.fillText('F2.8', 108, h - 24);
      ctx.fillText('ISO 800', 188, h - 24);
      ctx.fillStyle = '#ffb27a'; ctx.fillText('AF-C', 320, h - 24);
      ctx.fillStyle = '#8fb4c6'; ctx.textAlign = 'right';
      ctx.fillText('WIDE', w - 30, h - 24);
      // histogram
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1;
      ctx.strokeRect(w - 214, h - 138, 184, 66);
      ctx.beginPath();
      for (let i = 0; i < 60; i++) {
        const hx = w - 210 + i * 3, hh = 4 + Math.pow(rand(), 1.6) * 54;
        ctx.moveTo(hx, h - 76); ctx.lineTo(hx, h - 76 - hh);
      }
      ctx.strokeStyle = 'rgba(255,190,130,.7)'; ctx.stroke();
    });
  }

  function evfTex() {
    return makeTex(640, 420, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#04120e'); g.addColorStop(.6, '#07231c'); g.addColorStop(1, '#04100d');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(120,255,200,.5)'; ctx.lineWidth = 1;
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 + Math.cos(i / 9 * 6.283) * 240, h / 2 + Math.sin(i / 9 * 6.283) * 240); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(120,255,200,.85)';
      ctx.strokeRect(w * .3, h * .28, w * .4, h * .44);
      ctx.font = '500 22px "Cascadia Mono",Consolas';
      ctx.fillStyle = 'rgba(150,255,215,.9)'; ctx.textAlign = 'left';
      ctx.fillText('EVF  2.36M', 28, 42);
      ctx.fillText('1/250   F4.0', 28, h - 28);
      ctx.textAlign = 'right';
      ctx.fillText('+0.3', w - 28, h - 28);
    });
  }

  function batteryTex() {
    return makeTex(512, 700, (ctx, w, h) => {
      ctx.fillStyle = '#15181c'; ctx.fillRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f2f5f7';
      ctx.font = '700 62px "Bahnschrift",Arial,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SONY', 46, 120);
      ctx.font = '500 22px "Cascadia Mono",Consolas';
      ctx.fillStyle = '#9fb2bc';
      ctx.fillText('RECHARGEABLE BATTERY PACK', 46, 158);
      ctx.fillStyle = '#e8eef2';
      ctx.font = '600 46px "Bahnschrift",Arial';
      ctx.fillText('NP-FZ100', 46, 268);
      ctx.font = '500 24px "Cascadia Mono",Consolas';
      ctx.fillStyle = '#b8c8d0';
      ctx.fillText('7.2V   2280mAh   16.4Wh', 46, 312);
      ctx.fillStyle = '#ff6a2a'; ctx.fillRect(46, 356, 420, 7);
      ctx.fillStyle = '#dbe6ec'; ctx.font = '500 28px "Bahnschrift",Arial';
      ctx.fillText('Li-ion  ·  MADE IN JAPAN', 46, 414);
      // barcode
      ctx.fillStyle = '#e9eef1';
      for (let i = 0; i < 54; i++) {
        const bw = 1 + Math.floor(rand() * 4);
        if (rand() < .7) ctx.fillRect(46 + i * 7, 480, bw, 92);
      }
      ctx.strokeStyle = '#5d737f'; ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, w - 60, h - 60);
      // contacts hint
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(46, 620, 60, 18); ctx.fillRect(126, 620, 60, 18); ctx.fillRect(206, 620, 60, 18);
    });
  }

  function dialTex() {
    return makeTex(512, 512, (ctx, w, h) => {
      const cx = w / 2, cy = h / 2;
      const g = ctx.createRadialGradient(cx, cy - 40, 10, cx, cy, w / 2);
      g.addColorStop(0, '#2c323a'); g.addColorStop(.7, '#1a1e24'); g.addColorStop(1, '#0d1014');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 250, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 200, 0, 6.283); ctx.stroke();
      const modes = ['AUTO', 'P', 'A', 'S', 'M', 'MR', '1', '2', '3'];
      ctx.font = '600 26px "Bahnschrift",Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      modes.forEach((m, i) => {
        const a = -Math.PI / 2 + i / modes.length * Math.PI * 2;
        ctx.save(); ctx.translate(cx + Math.cos(a) * 172, cy + Math.sin(a) * 172);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = i === 4 ? '#ff8a4c' : '#c9d6dd';
        ctx.fillText(m, 0, 0);
        ctx.restore();
      });
      ctx.fillStyle = '#ff6a2a';
      ctx.beginPath(); ctx.moveTo(cx, cy - 232); ctx.lineTo(cx - 9, cy - 210); ctx.lineTo(cx + 9, cy - 210); ctx.fill();
    });
  }

  function glowTex() {
    return makeTex(256, 256, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(.18, 'rgba(255,255,255,.55)');
      g.addColorStop(.5, 'rgba(255,255,255,.12)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
  }

  function shadowTex() {
    return makeTex(512, 512, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(0,0,0,.75)');
      g.addColorStop(.45, 'rgba(0,0,0,.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
  }

  /* ---------------- geometry ---------------- */
  function rbox(w, h, d, r, bevel) {
    r = r == null ? 0.2 : r;
    bevel = bevel == null ? 0.04 : bevel;
    const bw = Math.max(0.02, w - 2 * bevel);
    const bh = Math.max(0.02, h - 2 * bevel);
    const rr = Math.min(r, bw / 2, bh / 2);
    const x0 = -bw / 2, y0 = -bh / 2;
    const s = new T.Shape();
    s.moveTo(x0 + rr, y0);
    s.lineTo(x0 + bw - rr, y0);
    s.quadraticCurveTo(x0 + bw, y0, x0 + bw, y0 + rr);
    s.lineTo(x0 + bw, y0 + bh - rr);
    s.quadraticCurveTo(x0 + bw, y0 + bh, x0 + bw - rr, y0 + bh);
    s.lineTo(x0 + rr, y0 + bh);
    s.quadraticCurveTo(x0, y0 + bh, x0, y0 + bh - rr);
    s.lineTo(x0, y0 + rr);
    s.quadraticCurveTo(x0, y0, x0 + rr, y0);
    const depth = Math.max(0.02, d - 2 * bevel);
    const g = new T.ExtrudeGeometry(s, {
      depth: depth, bevelEnabled: bevel > 0, bevelThickness: bevel,
      bevelSize: bevel, bevelSegments: 2, curveSegments: 8, steps: 1
    });
    g.center();
    return g;
  }

  function cylinderZ(rt, rb, len, mat, seg, open) {
    const g = new T.CylinderGeometry(rt, rb, len, seg || 48, 1, !!open);
    g.rotateX(Math.PI / 2);
    return new T.Mesh(g, mat);
  }
  function cylinderY(r, len, mat, seg, open) {
    return new T.Mesh(new T.CylinderGeometry(r, r, len, seg || 48, 1, !!open), mat);
  }
  function cylinderX(r, len, mat, seg) {
    const g = new T.CylinderGeometry(r, r, len, seg || 32, 1, false);
    g.rotateZ(Math.PI / 2);
    return new T.Mesh(g, mat);
  }
  function torusZ(r, tube, mat, seg) {
    return new T.Mesh(new T.TorusGeometry(r, tube, 8, seg || 64), mat);
  }
  function torusX(r, tube, mat) {
    const g = new T.TorusGeometry(r, tube, 8, 48);
    g.rotateY(Math.PI / 2);
    return new T.Mesh(g, mat);
  }

  function add(g, mesh, x, y, z) {
    mesh.position.set(x || 0, y || 0, z || 0);
    g.add(mesh);
    return mesh;
  }

  function knurlZ(g, radius, z, len, count, mat, ribW, ribH) {
    ribW = ribW || 0.075; ribH = ribH || 0.13;
    const geo = new T.BoxGeometry(ribW, ribH, len);
    const inst = new T.InstancedMesh(geo, mat, count);
    const d = new T.Object3D();
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2;
      d.position.set(Math.cos(a) * (radius + ribH * 0.22), Math.sin(a) * (radius + ribH * 0.22), z);
      d.rotation.set(0, 0, a - Math.PI / 2);
      d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    g.add(inst);
    return inst;
  }

  function knurlY(g, radius, y, len, count, mat, ribW, ribH) {
    ribW = ribW || 0.08; ribH = ribH || 0.1;
    const geo = new T.BoxGeometry(ribH, len, ribW);
    const inst = new T.InstancedMesh(geo, mat, count);
    const d = new T.Object3D();
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2;
      d.position.set(Math.cos(a) * (radius + ribH * 0.2), y, Math.sin(a) * (radius + ribH * 0.2));
      d.rotation.set(0, -a, 0);
      d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    g.add(inst);
    return inst;
  }

  function lensGlass(R, thick, bulgeF, bulgeB, mat, seg) {
    const N = 14, pts = [];
    pts.push(new T.Vector2(0, thick / 2 + bulgeF));
    for (let i = 1; i <= N; i++) {
      const t = i / N;
      pts.push(new T.Vector2(R * t, thick / 2 + bulgeF * (1 - t * t)));
    }
    pts.push(new T.Vector2(R, thick / 2));
    pts.push(new T.Vector2(R, -thick / 2));
    for (let i = N; i >= 0; i--) {
      const t = i / N;
      pts.push(new T.Vector2(R * t, -thick / 2 - bulgeB * (1 - t * t)));
    }
    const g = new T.LatheGeometry(pts, seg || 72);
    g.rotateX(Math.PI / 2);
    return new T.Mesh(g, mat);
  }

  function ringSector(rIn, rOut, a0, a1) {
    const s = new T.Shape();
    s.absarc(0, 0, rOut, a0, a1, false);
    s.absarc(0, 0, rIn, a1, a0, true);
    s.closePath();
    return new T.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false, curveSegments: 10, steps: 1 });
  }

  function decal(tex, width) {
    const ratio = tex.image.height / tex.image.width;
    const geo = new T.PlaneGeometry(width, width * ratio);
    const mat = new T.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -2, side: T.DoubleSide
    });
    return new T.Mesh(geo, mat);
  }

  function arcDecal(tex, radius, height, arc, z, flip) {
    const geo = new T.CylinderGeometry(radius, radius, height, 64, 1, true, Math.PI - arc / 2, arc);
    geo.rotateX(Math.PI / 2);
    if (flip) tex.flipY = false;
    const mat = new T.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -2, side: T.DoubleSide
    });
    const m = new T.Mesh(geo, mat);
    m.position.z = z;
    return m;
  }

  /* ---------------- materials ---------------- */
  const leatherMap = leatherTex();
  const pcbMap = pcbTex();
  const sensorMap = sensorTex();
  const screenMap = screenTex();
  const evfMap = evfTex();
  const batteryMap = batteryTex();
  const dialMap = dialTex();

  function leatherMat() {
    const m = new T.MeshStandardMaterial({
      color: 0x0c0e11, map: leatherMap, bumpMap: leatherMap, bumpScale: 0.075,
      metalness: 0.02, roughness: 1.0
    });
    m.map.repeat.set(2.6, 2.6);
    m.bumpMap.repeat.set(2.6, 2.6);
    return m;
  }
  function metalMat(color, rough, metal) {
    return new T.MeshStandardMaterial({ color: color, metalness: metal == null ? 0.85 : metal, roughness: rough == null ? 0.35 : rough });
  }
  function matteMat(color, rough) {
    return new T.MeshStandardMaterial({ color: color, metalness: 0.2, roughness: rough == null ? 0.7 : rough });
  }
  function glassMat(tint, opacity) {
    return new T.MeshPhysicalMaterial({
      color: tint == null ? 0x2d6f8f : tint,
      metalness: 0.02, roughness: 0.045,
      transparent: true, opacity: opacity == null ? 0.52 : opacity,
      envMapIntensity: 3.2, clearcoat: 1, clearcoatRoughness: 0.04,
      side: T.DoubleSide, depthWrite: false,
      iridescence: 0.5, iridescenceIOR: 1.32, iridescenceThicknessRange: [140, 460],
      emissive: 0x081c26, emissiveIntensity: 0.35
    });
  }
  function chipMat() {
    return new T.MeshStandardMaterial({ color: 0x22262b, metalness: 0.9, roughness: 0.3 });
  }
  function screw(g, x, y, z, r, mat) {
    const s = cylinderZ(r || 0.055, r || 0.055, 0.035, mat, 12);
    add(g, s, x, y, z);
    const slot = new T.Mesh(new T.BoxGeometry((r || 0.055) * 1.35, 0.012, 0.012), matteMat(0x05070a, 0.8));
    add(g, slot, x, y, z + 0.02);
    return s;
  }

  /* =========================================================
     BODY
     ========================================================= */
  function buildTop() {
    const g = new T.Group();
    const metal = metalMat(0x272c34, 0.32, 0.88);
    const dark = matteMat(0x111419, 0.55);
    const chrome = metalMat(0xc9d3da, 0.18, 1);

    // main plate
    add(g, new T.Mesh(rbox(12.06, 1.0, 4.94, 0.24, 0.05), metal), 0, 3.24, -0.03);
    add(g, new T.Mesh(rbox(11.2, 0.06, 4.1, 0.2, 0.012), metalMat(0x333a43, 0.28, 0.92)), 0, 3.76, -0.1);
    // front bevel strip
    add(g, new T.Mesh(rbox(11.7, 0.14, 0.16, 0.06, 0.01), metalMat(0x15181d, 0.45, 0.7)), 0, 3.7, 2.31);

    // mode dial
    const dial = new T.Group();
    add(dial, cylinderY(1.03, 0.34, dark, 64), 0, 0.17, 0);
    add(dial, cylinderY(1.09, 0.08, chrome, 64), 0, 0.02, 0);
    knurlY(dial, 1.03, 0.19, 0.28, 54, metalMat(0x1c2026, 0.5, 0.8), 0.075, 0.09);
    add(dial, cylinderY(0.98, 0.05, metal, 64), 0, 0.35, 0);
    const dtop = new T.Mesh(new T.CircleGeometry(0.95, 64), new T.MeshStandardMaterial({
      map: dialMap, metalness: 0.75, roughness: 0.4
    }));
    dtop.rotation.x = -Math.PI / 2;
    add(dial, dtop, 0, 0.377, 0);
    dial.position.set(-2.72, 3.76, -0.42);
    g.add(dial);

    // shutter ring + button
    add(g, cylinderY(0.63, 0.1, chrome, 48), -4.35, 3.79, 0.78);
    add(g, cylinderY(0.47, 0.26, metalMat(0x30363e, 0.28, 0.9), 48), -4.35, 3.9, 0.78);
    add(g, torusX(0.4, 0.035, chrome), -4.35, 3.98, 0.78);
    add(g, cylinderY(0.3, 0.05, matteMat(0x0b0d10, 0.35), 32), -4.35, 4.03, 0.78);
    // on/off lever
    add(g, new T.Mesh(rbox(0.55, 0.07, 0.17, 0.03, 0.01), metalMat(0x3b424b, 0.3, 0.9)), -5.02, 3.8, 0.5);

    // C1 + REC
    add(g, cylinderY(0.2, 0.14, metalMat(0x2a3037, 0.4, 0.8), 28), -1.75, 3.8, 1.42);
    add(g, cylinderY(0.15, 0.12, matteMat(0xb42a1e, 0.4), 24), -0.92, 3.8, 1.46);

    // hot shoe
    const shoe = new T.Group();
    add(shoe, new T.Mesh(rbox(2.55, 0.12, 1.62, 0.06, 0.02), metalMat(0x16191e, 0.4, 0.85)), 0, 3.8, 0);
    add(shoe, new T.Mesh(rbox(2.3, 0.07, 1.38, 0.04, 0.01), matteMat(0x0a0c0f, 0.7)), 0, 3.87, 0);
    [-1.08, 1.08].forEach(x => {
      add(shoe, new T.Mesh(rbox(0.19, 0.2, 1.5, 0.04, 0.01), chrome), x, 3.89, 0);
    });
    for (let i = 0; i < 5; i++) add(shoe, new T.Mesh(new T.BoxGeometry(0.28, 0.035, 0.1), metalMat(0xc9a35a, 0.35, 1)), -0.75 + i * 0.375, 3.87, 0.32);
    shoe.position.set(1.28, 0, -0.42);
    g.add(shoe);

    // mic holes
    for (let i = 0; i < 6; i++) {
      add(g, cylinderY(0.035, 0.03, dark, 10), 2.62 + (i % 3) * 0.16, 3.802, 1.02 + Math.floor(i / 3) * 0.18);
    }

    // top print
    const print = decal(textTex('α7C', 256, 128, { fs: 74, color: '#e8eef2', spacing: 2 }), 0.78);
    print.rotation.x = -Math.PI / 2;
    add(g, print, -0.1, 3.803, 1.72);

    return g;
  }

  function buildEvf() {
    const g = new T.Group();
    const body = metalMat(0x22262c, 0.38, 0.8);
    const rubber = matteMat(0x0b0d10, 0.85);

    add(g, new T.Mesh(rbox(3.26, 1.28, 2.72, 0.24, 0.04), body), 4.02, 3.34, -0.52);
    add(g, new T.Mesh(rbox(2.94, 1.34, 0.5, 0.2, 0.03), body), 4.02, 3.34, -1.94);
    // eyecup
    const cup = new T.Group();
    add(cup, new T.Mesh(rbox(2.96, 0.26, 0.34, 0.1, 0.02), rubber), 0, 0.78, 0);
    add(cup, new T.Mesh(rbox(2.96, 0.26, 0.34, 0.1, 0.02), rubber), 0, -0.78, 0);
    add(cup, new T.Mesh(rbox(0.28, 1.3, 0.34, 0.1, 0.02), rubber), -1.34, 0, 0);
    add(cup, new T.Mesh(rbox(0.28, 1.3, 0.34, 0.1, 0.02), rubber), 1.34, 0, 0);
    cup.position.set(4.02, 3.34, -2.24);
    g.add(cup);
    // recess / glass
    add(g, new T.Mesh(rbox(2.5, 1.2, 0.06, 0.06, 0.01), matteMat(0x05070a, 0.5)), 4.02, 3.34, -2.12);
    const glass = new T.Mesh(new T.PlaneGeometry(1.6, 1.0), glassMat(0x2a6b5c, 0.34));
    glass.rotation.y = Math.PI;
    add(g, glass, 4.02, 3.34, -2.16);
    const oled = new T.Mesh(new T.PlaneGeometry(1.5, 0.94), new T.MeshBasicMaterial({ map: evfMap, toneMapped: false }));
    oled.rotation.y = Math.PI;
    add(g, oled, 4.02, 3.34, -2.19);

    // diopter wheel
    const dw = cylinderX(0.3, 0.18, metalMat(0x282d34, 0.4, 0.8), 32);
    add(g, dw, 5.7, 3.2, -1.3);
    const dk = new T.Group(); dk.position.set(5.7, 3.2, -1.3); dk.rotation.y = Math.PI / 2;
    knurlZ(dk, 0.3, 0, 0.16, 28, metalMat(0x1b1f24, 0.5, 0.7), 0.05, 0.07);
    g.add(dk);

    add(g, new T.Mesh(rbox(3.1, 0.05, 2.5, 0.16, 0.01), metalMat(0x333941, 0.3, 0.9)), 4.02, 3.99, -0.6);
    return g;
  }

  function buildGrip() {
    const g = new T.Group();
    const leather = leatherMat();
    const metal = metalMat(0x23272d, 0.4, 0.8);

    add(g, new T.Mesh(rbox(3.55, 6.5, 2.45, 0.78, 0.06), leather), -4.5, -0.18, 1.42);
    add(g, new T.Mesh(rbox(3.0, 3.4, 0.85, 0.38, 0.05), leather), -4.42, 0.62, 2.58);
    add(g, new T.Mesh(rbox(3.3, 0.85, 2.3, 0.32, 0.04), metal), -4.5, 2.77, 1.32);
    add(g, new T.Mesh(rbox(3.58, 0.05, 2.5, 0.78, 0.01), metalMat(0x0c0e11, 0.6, 0.5)), -4.5, 2.36, 1.42);
    // finger grooves
    [1.16, 0.44, -0.28].forEach(y => {
      add(g, new T.Mesh(new T.BoxGeometry(2.8, 0.045, 0.06), matteMat(0x050607, 0.9)), -4.42, y, 3.0);
    });
    // small alpha deboss
    return g;
  }

  function buildFront() {
    const g = new T.Group();
    const metal = metalMat(0x262b32, 0.36, 0.86);
    const chrome = metalMat(0xcfd8de, 0.16, 1);
    const dark = matteMat(0x0a0c0f, 0.5);
    const gold = metalMat(0xd3a24d, 0.3, 1);

    add(g, new T.Mesh(rbox(8.2, 6.5, 0.42, 0.38, 0.04), metal), 0.55, -0.15, 2.62);
    // mount boss
    add(g, cylinderZ(3.18, 3.18, 0.72, metal, 72), 0, -0.28, 3.05);
    add(g, cylinderZ(3.3, 3.3, 0.16, chrome, 72), 0, -0.28, 3.44);
    add(g, torusZ(3.2, 0.045, chrome), 0, -0.28, 3.53);
    add(g, cylinderZ(2.62, 2.62, 0.8, dark, 64, true), 0, -0.28, 3.15);
    add(g, cylinderZ(2.05, 2.05, 0.12, matteMat(0x06080a, 0.4), 48), 0, -0.28, 3.02);
    // red index
    add(g, new T.Mesh(new T.SphereGeometry(0.075, 16, 12), new T.MeshStandardMaterial({ color: 0xd42a18, emissive: 0x5a0d05, emissiveIntensity: 0.7, roughness: 0.4 })), 0, 2.92, 3.5);
    // bayonet tabs
    [0, 2.094, 4.188].forEach(a => {
      const tab = new T.Mesh(new T.BoxGeometry(0.62, 0.22, 0.12), metalMat(0x9aa4ad, 0.3, 0.95));
      tab.position.set(Math.cos(a) * 2.86, -0.28 + Math.sin(a) * 2.86, 3.45);
      tab.rotation.z = a;
      g.add(tab);
    });
    // contacts
    for (let i = 0; i < 10; i++) {
      const a = -1.5 + i * 0.115;
      add(g, new T.Mesh(new T.BoxGeometry(0.13, 0.2, 0.05), gold), Math.cos(a) * 2.36, -0.28 + Math.sin(a) * 2.36, 3.48);
    }
    // release button
    add(g, cylinderZ(0.2, 0.2, 0.16, chrome, 24), 3.52, -2.42, 2.82);
    add(g, cylinderZ(0.13, 0.13, 0.19, dark, 20), 3.52, -2.42, 2.85);
    // SONY + alpha
    const sony = decal(textTex('SONY', 512, 128, { fs: 84, spacing: 12, color: '#e6eef2' }), 1.28);
    add(g, sony, -2.42, 2.62, 2.845);
    const alpha = decal(textTex('α', 160, 160, { fs: 128, color: '#ff6a2a' }), 0.42);
    add(g, alpha, 3.12, -2.28, 2.845);
    const model = decal(textTex('α7C', 320, 128, { fs: 68, spacing: 2, color: '#dbe6ec' }), 0.86);
    add(g, model, -2.55, -2.35, 2.845);
    // screws
    [[-2.9, 2.35], [3.35, 2.35], [-2.9, -2.9], [3.35, -2.9]].forEach(p => screw(g, p[0], p[1], 2.85, 0.06));

    return g;
  }

  function buildScreen() {
    const g = new T.Group();
    const metal = metalMat(0x24282e, 0.4, 0.8);
    const dark = matteMat(0x06080b, 0.6);

    add(g, new T.Mesh(rbox(7.5, 5.4, 0.42, 0.16, 0.03), metal), 0.2, -0.18, -2.86);
    add(g, new T.Mesh(rbox(7.1, 5.0, 0.03, 0.12, 0.01), dark), 0.2, -0.18, -3.075);
    const scr = new T.Mesh(new T.PlaneGeometry(6.9, 4.42), new T.MeshBasicMaterial({ map: screenMap, toneMapped: false }));
    scr.rotation.y = Math.PI;
    add(g, scr, 0.2, -0.06, -3.098);
    const sony = decal(textTex('SONY', 256, 64, { fs: 34, spacing: 6, color: 'rgba(220,230,236,.55)' }), 0.66);
    sony.rotation.y = Math.PI;
    add(g, sony, 0.2, -2.52, -3.1);
    // hinge
    add(g, cylinderY(0.27, 5.05, metalMat(0x33383f, 0.3, 0.9), 24), 4.02, -0.18, -2.94);
    add(g, new T.Mesh(rbox(0.55, 1.2, 0.5, 0.1, 0.02), dark), 4.02, 2.1, -2.94);
    add(g, new T.Mesh(rbox(0.55, 1.2, 0.5, 0.1, 0.02), dark), 4.02, -2.45, -2.94);
    // flex
    add(g, new T.Mesh(new T.BoxGeometry(0.5, 0.08, 1.2), matteMat(0x5a3b20, 0.7)), 3.6, -2.2, -2.2);

    return g;
  }

  function buildBottom() {
    const g = new T.Group();
    const metal = metalMat(0x20242a, 0.42, 0.8);
    const chrome = metalMat(0xc3ccd3, 0.2, 1);
    add(g, new T.Mesh(rbox(11.55, 0.34, 4.55, 0.26, 0.03), metal), 0, -3.51, -0.05);
    add(g, new T.Mesh(rbox(11.2, 0.06, 4.2, 0.2, 0.01), metalMat(0x2a2f36, 0.4, 0.8)), 0, -3.68, -0.05);
    // tripod socket
    add(g, cylinderY(0.55, 0.12, chrome, 32), 0, -3.7, 0.1);
    add(g, cylinderY(0.34, 0.14, matteMat(0x040506, 0.7), 28), 0, -3.68, 0.1);
    // battery door
    add(g, new T.Mesh(rbox(3.7, 0.07, 2.55, 0.1, 0.01), metalMat(0x191d22, 0.5, 0.7)), -3.45, -3.7, -0.55);
    add(g, new T.Mesh(new T.BoxGeometry(0.5, 0.04, 0.14), chrome), -3.45, -3.73, -2.16);
    // screws
    [[-5.1, 1.7], [5.1, 1.7], [-5.1, -1.8], [5.1, -1.8]].forEach(p => {
      const s = cylinderY(0.07, 0.04, chrome, 12);
      add(g, s, p[0], -3.69, p[1]);
    });
    return g;
  }

  function buildShell() {
    const g = new T.Group();
    const metal = metalMat(0x1e2228, 0.42, 0.8);
    const dark = matteMat(0x0a0c0f, 0.65);
    add(g, new T.Mesh(rbox(11.9, 6.4, 4.8, 0.35, 0.06), metal), 0, -0.15, 0);
    add(g, new T.Mesh(rbox(11.4, 6.0, 0.35, 0.2, 0.02), metalMat(0x24282e, 0.45, 0.75)), 0, -0.15, -2.42);

    // side ports (-X)
    add(g, new T.Mesh(rbox(0.09, 2.5, 2.3, 0.08, 0.01), matteMat(0x07090b, 0.6)), -5.97, 0.55, -0.5);
    add(g, new T.Mesh(new T.BoxGeometry(0.1, 0.62, 0.9), matteMat(0x11151a, 0.5)), -6.02, 1.1, 0.05);
    add(g, new T.Mesh(new T.BoxGeometry(0.1, 0.5, 0.62), matteMat(0x151a1f, 0.5)), -6.02, 0.3, 0.05);
    add(g, cylinderX(0.13, 0.1, dark, 16), -6.02, -0.4, 0.05);
    add(g, new T.Mesh(new T.BoxGeometry(0.1, 0.34, 0.42), matteMat(0x0d1014, 0.5)), -6.02, 0.3, -0.9);

    // card slot (+X)
    add(g, new T.Mesh(new T.BoxGeometry(0.07, 0.34, 3.1, 1, 1, 1), matteMat(0x050709, 0.7)), 5.97, -1.65, 0.5);

    // back controls
    add(g, cylinderZ(0.36, 0.3, 0.16, metalMat(0x2a2f36, 0.4, 0.8), 32), 4.35, 2.05, -2.62);
    add(g, cylinderZ(0.22, 0.22, 0.15, dark, 24), 4.35, 2.05, -2.67);
    [[4.35, 1.1], [4.95, 0.2], [4.2, -0.3], [4.9, -1.1], [4.35, -1.9]].forEach(p => {
      add(g, cylinderZ(0.17, 0.17, 0.13, matteMat(0x1b1f24, 0.6), 20), p[0], p[1], -2.63);
    });
    add(g, new T.Mesh(rbox(0.9, 0.55, 0.12, 0.08, 0.01), dark), 4.55, 0.65, -2.64);

    // strap lugs
    add(g, torusX(0.27, 0.065, metalMat(0x8b969f, 0.3, 1)), -6.1, 2.25, -1.6);
    add(g, torusX(0.27, 0.065, metalMat(0x8b969f, 0.3, 1)), 6.05, 2.25, -1.6);

    // mic perforations on top front
    for (let i = 0; i < 8; i++) {
      add(g, cylinderY(0.032, 0.02, dark, 8), -1.9 + (i % 4) * 0.22, 3.05, 1.9 + Math.floor(i / 4) * 0.2);
    }
    return g;
  }

  function buildSensor() {
    const g = new T.Group();
    const ceramic = matteMat(0x1b252c, 0.5);
    const gold = metalMat(0xcaa04f, 0.3, 1);
    const chip = new T.MeshStandardMaterial({ color: 0x0b2232, metalness: 0.55, roughness: 0.18 });

    add(g, new T.Mesh(rbox(5.3, 4.5, 0.46, 0.08, 0.02), ceramic), 0, -0.3, 1.0);
    add(g, new T.Mesh(rbox(4.65, 3.75, 0.2, 0.05, 0.01), matteMat(0x122029, 0.45)), 0, -0.3, 1.27);
    // gold frame
    add(g, new T.Mesh(new T.BoxGeometry(4.15, 0.12, 0.06), gold), 0, 1.35, 1.4);
    add(g, new T.Mesh(new T.BoxGeometry(4.15, 0.12, 0.06), gold), 0, -1.95, 1.4);
    add(g, new T.Mesh(new T.BoxGeometry(0.12, 3.2, 0.06), gold), -2.02, -0.3, 1.4);
    add(g, new T.Mesh(new T.BoxGeometry(0.12, 3.2, 0.06), gold), 2.02, -0.3, 1.4);
    // chip + texture
    add(g, new T.Mesh(new T.BoxGeometry(3.66, 2.46, 0.09), chip), 0, -0.3, 1.43);
    const face = new T.Mesh(new T.PlaneGeometry(3.58, 2.38), new T.MeshBasicMaterial({ map: sensorMap, toneMapped: false }));
    add(g, face, 0, -0.3, 1.48);
    // cover glass
    const cg = new T.Mesh(new T.BoxGeometry(3.85, 2.62, 0.07), glassMat(0x1d5a72, 0.22));
    add(g, cg, 0, -0.3, 1.53);
    // flex ribbon
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(0, -2.5, 1.05),
      new T.Vector3(0.2, -2.3, 0.2),
      new T.Vector3(0.8, -1.2, -0.9),
      new T.Vector3(0.9, 0.2, -1.4)
    ]);
    const tube = new T.Mesh(new T.TubeGeometry(curve, 24, 0.24, 6, false), matteMat(0x6b4520, 0.7));
    tube.scale.y = 0.4;
    add(g, tube, 0, 0, 0);
    add(g, new T.Mesh(new T.BoxGeometry(1.1, 0.16, 0.5), matteMat(0x1c1a15, 0.6)), 0.9, 0.25, -1.55);
    return g;
  }

  function buildIbis() {
    const g = new T.Group();
    const metal = metalMat(0x7e878f, 0.35, 0.9);
    const copper = metalMat(0xb46f3c, 0.3, 1);
    const dark = matteMat(0x101419, 0.55);

    // frame bars
    add(g, new T.Mesh(new T.BoxGeometry(6.0, 0.34, 0.3), metal), 0, 2.12, 0.5);
    add(g, new T.Mesh(new T.BoxGeometry(6.0, 0.34, 0.3), metal), 0, -2.72, 0.5);
    add(g, new T.Mesh(new T.BoxGeometry(0.34, 4.5, 0.3), metal), -2.83, -0.3, 0.5);
    add(g, new T.Mesh(new T.BoxGeometry(0.34, 4.5, 0.3), metal), 2.83, -0.3, 0.5);
    // coils
    [[-2.35, 1.6], [2.35, 1.6], [-2.35, -2.2], [2.35, -2.2]].forEach(p => {
      add(g, cylinderZ(0.48, 0.48, 0.26, copper, 32), p[0], p[1], 0.58);
      add(g, cylinderZ(0.26, 0.26, 0.3, dark, 24), p[0], p[1], 0.58);
      add(g, new T.Mesh(new T.BoxGeometry(0.78, 0.78, 0.16), dark), p[0], p[1], 0.34);
    });
    // springs
    [[-2.35, 1.6], [2.35, 1.6], [-2.35, -2.2], [2.35, -2.2]].forEach(p => {
      const s = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.9, 6), metalMat(0xd9e0e4, 0.25, 1));
      s.position.set(p[0] * 0.75, p[1] * 0.75, 0.72);
      s.rotation.z = Math.PI / 4;
      g.add(s);
    });
    add(g, new T.Mesh(new T.BoxGeometry(2.1, 0.16, 0.08), matteMat(0x4a3a1e, 0.7)), 0, -2.92, 0.62);
    return g;
  }

  function buildShutter() {
    const g = new T.Group();
    const metal = metalMat(0x555d66, 0.32, 0.95);
    const blade = new T.MeshStandardMaterial({ color: 0x2c3138, metalness: 0.9, roughness: 0.26 });
    add(g, new T.Mesh(new T.BoxGeometry(5.7, 0.32, 0.34), metal), 0, 2.0, 2.2);
    add(g, new T.Mesh(new T.BoxGeometry(5.7, 0.32, 0.34), metal), 0, -2.55, 2.2);
    add(g, new T.Mesh(new T.BoxGeometry(0.32, 4.2, 0.34), metal), -2.69, -0.3, 2.2);
    add(g, new T.Mesh(new T.BoxGeometry(0.32, 4.2, 0.34), metal), 2.69, -0.3, 2.2);
    add(g, new T.Mesh(new T.BoxGeometry(3.55, 2.35, 0.04), blade), -0.55, -0.3, 2.16);
    add(g, new T.Mesh(new T.BoxGeometry(3.55, 2.35, 0.04), blade), 0.62, -0.3, 2.26);
    add(g, new T.Mesh(new T.BoxGeometry(3.4, 0.06, 0.06), metal), 0, 0.95, 2.3);
    // motor
    add(g, cylinderZ(0.33, 0.33, 1.05, metal, 28), 2.95, 1.55, 2.2);
    const gear = new T.Group();
    gear.position.set(2.95, 1.55, 2.78);
    add(gear, cylinderZ(0.4, 0.4, 0.09, metalMat(0x8f9aa3, 0.3, 1), 24), 0, 0, 0);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const tooth = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.09), metalMat(0x8f9aa3, 0.3, 1));
      tooth.position.set(Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0);
      tooth.rotation.z = a;
      gear.add(tooth);
    }
    g.add(gear);
    add(g, new T.Mesh(new T.BoxGeometry(0.25, 2.4, 0.06), matteMat(0x66431f, 0.7)), -2.2, -2.9, 2.25);
    return g;
  }

  function buildMainboard() {
    const g = new T.Group();
    const board = new T.MeshStandardMaterial({ color: 0x0b2a21, metalness: 0.2, roughness: 0.62 });
    add(g, new T.Mesh(rbox(7.2, 5.2, 0.2, 0.06, 0.02), board), 0.25, 0.3, -1.55);
    const face = new T.Mesh(new T.PlaneGeometry(6.95, 4.95), new T.MeshBasicMaterial({ map: pcbMap, toneMapped: false }));
    add(g, face, 0.25, 0.3, -1.44);
    // chips
    const silver = metalMat(0xb9c2c9, 0.28, 1);
    add(g, new T.Mesh(rbox(1.5, 1.5, 0.2, 0.04, 0.01), silver), 0.55, 0.62, -1.33);
    add(g, new T.Mesh(rbox(1.0, 0.95, 0.16, 0.03, 0.01), metalMat(0x3c4249, 0.4, 0.9)), 0.55, 0.62, -1.22);
    add(g, new T.Mesh(rbox(1.1, 0.8, 0.13, 0.03, 0.01), matteMat(0x14181d, 0.55)), -1.55, 0.1, -1.35);
    add(g, new T.Mesh(rbox(1.1, 0.8, 0.13, 0.03, 0.01), matteMat(0x14181d, 0.55)), -0.2, -1.0, -1.35);
    add(g, new T.Mesh(rbox(2.3, 2.7, 0.14, 0.05, 0.01), metalMat(0x8d979f, 0.45, 0.9)), 2.48, 1.35, -1.37);
    // connectors
    add(g, new T.Mesh(rbox(0.9, 0.5, 0.4, 0.06, 0.01), metalMat(0xaeb7bd, 0.35, 1)), 3.4, -0.3, -1.42);
    add(g, new T.Mesh(rbox(0.8, 0.4, 0.32, 0.05, 0.01), matteMat(0x0d1013, 0.5)), 2.9, -1.7, -1.4);
    add(g, new T.Mesh(new T.BoxGeometry(0.35, 1.8, 0.12), matteMat(0xd0a24a, 0.45)), -3.1, 0.2, -1.42);
    // mounting holes
    [[-2.9, 2.05], [3.0, 2.05], [-2.9, -1.9], [3.0, -1.9]].forEach(p => {
      add(g, new T.Mesh(new T.CylinderGeometry(0.14, 0.14, 0.06, 16), metalMat(0xd4b061, 0.3, 1)), p[0], p[1], -1.42);
    });
    // status LEDs
    add(g, new T.Mesh(new T.BoxGeometry(0.09, 0.09, 0.04), new T.MeshStandardMaterial({ color: 0x5fe3ff, emissive: 0x2ec8ff, emissiveIntensity: 2.2 })), -2.4, -1.9, -1.41);
    add(g, new T.Mesh(new T.BoxGeometry(0.09, 0.09, 0.04), new T.MeshStandardMaterial({ color: 0x74ffc8, emissive: 0x1fbf7a, emissiveIntensity: 1.8 })), -2.15, -1.9, -1.41);
    return g;
  }

  function buildBattery() {
    const g = new T.Group();
    const plastic = matteMat(0x171a1f, 0.55);
    add(g, new T.Mesh(rbox(3.6, 5.3, 1.65, 0.16, 0.03), plastic), -3.35, -0.9, -1.25);
    const label = decal(batteryMap, 3.15);
    add(g, label, -3.35, -0.85, -0.405);
    add(g, new T.Mesh(new T.BoxGeometry(3.1, 0.12, 1.3), matteMat(0x0c0e11, 0.6)), -3.35, 1.68, -1.3);
    [-4.1, -3.5, -2.9].forEach(x => {
      add(g, new T.Mesh(new T.BoxGeometry(0.3, 0.06, 0.22), metalMat(0xd0a24a, 0.3, 1)), x, 1.75, -1.55);
    });
    add(g, new T.Mesh(new T.BoxGeometry(0.6, 0.2, 0.12), matteMat(0x2c3138, 0.6)), -3.35, 1.65, -0.9);
    return g;
  }

  function buildHeatsink() {
    const g = new T.Group();
    const copper = metalMat(0xa86a3f, 0.32, 1);
    add(g, new T.Mesh(rbox(2.7, 3.2, 0.18, 0.05, 0.01), copper), 4.1, 0.5, -1.78);
    for (let i = 0; i < 13; i++) {
      add(g, new T.Mesh(new T.BoxGeometry(0.07, 2.9, 0.78), copper), 2.95 + i * 0.19, 0.5, -1.98);
    }
    add(g, new T.Mesh(new T.BoxGeometry(2.5, 2.9, 0.06), matteMat(0x2a2d31, 0.8)), 4.1, 0.5, -1.68);
    add(g, new T.Mesh(new T.BoxGeometry(0.4, 0.8, 0.05), matteMat(0x1a1d21, 0.7)), 4.1, 1.5, -1.66);
    return g;
  }

  function buildSd() {
    const g = new T.Group();
    add(g, new T.Mesh(rbox(2.3, 0.18, 3.1, 0.08, 0.02), matteMat(0x1b1f24, 0.55)), 4.5, -1.7, 0.35);
    const label = decal(textTex('SF-M  128GB', 512, 256, { fs: 58, spacing: 3, color: '#e8eef2' }), 1.9);
    label.rotation.x = -Math.PI / 2;
    add(g, label, 4.5, -1.6, 0.28);
    add(g, new T.Mesh(new T.BoxGeometry(1.9, 0.02, 0.45), matteMat(0x2a2e33, 0.6)), 4.5, -1.6, 1.25);
    // contacts
    for (let i = 0; i < 8; i++) add(g, new T.Mesh(new T.BoxGeometry(0.09, 0.03, 0.35), metalMat(0xd0a24a, 0.3, 1)), 3.65 + i * 0.2, -1.6, -1.05);
    return g;
  }

  /* expose partial for next section */
  A._builders = {
    top: buildTop,
    evf: buildEvf,
    grip: buildGrip,
    front: buildFront,
    screen: buildScreen,
    bottom: buildBottom,
    shell: buildShell,
    sensor: buildSensor,
    ibis: buildIbis,
    shutter: buildShutter,
    mainboard: buildMainboard,
    battery: buildBattery,
    sd: buildSd,
    heatsink: buildHeatsink
  };
  A._lib = {
    T,
    rbox, cylinderZ, cylinderY, cylinderX, torusZ, torusX, add, knurlZ, knurlY,
    lensGlass, ringSector, decal, arcDecal, textTex, makeTex, glassMat, metalMat,
    matteMat, chipMat, screw, glowTex, shadowTex,
    setAniso(v) { MAX_ANISO = v; }
  };
})();

/* =========================================================
   LENS — FE 24-70mm F2.8 GM II
   ========================================================= */
(function () {
  'use strict';
  const A = window.A7C;
  const L = A._lib;
  const T = L.T;
  const add = L.add;
  const rbox = L.rbox;
  const decal = L.decal;
  const arcDecal = L.arcDecal;
  const lensGlass = L.lensGlass;
  const glassMat = L.glassMat;
  const metalMat = L.metalMat;
  const matteMat = L.matteMat;

  function gBadgeTex() {
    return L.makeTex(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const r = 34;
      ctx.beginPath();
      ctx.moveTo(14 + r, 14);
      ctx.arcTo(w - 14, 14, w - 14, h - 14, r);
      ctx.arcTo(w - 14, h - 14, 14, h - 14, r);
      ctx.arcTo(14, h - 14, 14, 14, r);
      ctx.arcTo(14, 14, w - 14, 14, r);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#ff5a2a'); g.addColorStop(1, '#c11f0c');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '700 156px "Bahnschrift",Arial,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('G', w / 2, h / 2 - 6);
      ctx.font = '600 26px "Bahnschrift",Arial,sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('MASTER', w / 2, h - 34);
    });
  }

  function hoodGeo() {
    const seg = 128, rings = 8;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const th = i / seg * Math.PI * 2;
      const zf = 17.55 + 1.15 * Math.pow(Math.abs(Math.sin(th)), 1.7);
      for (let j = 0; j <= rings; j++) {
        const t = j / rings;
        const r = 4.52 + 0.92 * t;
        const z = 15.02 + (zf - 15.02) * t;
        pos.push(Math.cos(th) * r, Math.sin(th) * r, z);
        uv.push(i / seg, t);
      }
    }
    for (let i = 0; i < seg; i++) {
      for (let j = 0; j < rings; j++) {
        const a = i * (rings + 1) + j;
        const b = a + rings + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function buildHood() {
    const g = new T.Group();
    const plastic = new T.MeshStandardMaterial({ color: 0x050607, metalness: 0.15, roughness: 0.92, side: T.DoubleSide });
    const dark = matteMat(0x07090b, 0.75);
    add(g, new T.Mesh(hoodGeo(), plastic), 0, 0, 0);
    // bayonet ring + grip ribs
    add(g, L.cylinderZ(4.56, 4.56, 0.3, metalMat(0x2b3037, 0.4, 0.8), 72, true), 0, 0, 15.12);
    add(g, L.torusZ(4.56, 0.055, metalMat(0x59626b, 0.3, 1)), 0, 0, 15.26);
    L.knurlZ(g, 4.58, 15.1, 0.24, 90, matteMat(0x14171b, 0.85), 0.05, 0.06);
    // red index dot
    add(g, new T.Mesh(new T.SphereGeometry(0.075, 12, 10), new T.MeshStandardMaterial({ color: 0xd42a18, emissive: 0x4a0b04, emissiveIntensity: 0.6, roughness: 0.4 })), 0, 4.55, 15.3);
    return g;
  }

  function buildFrontElement() {
    const g = new T.Group();
    const cell = metalMat(0x16191d, 0.42, 0.75);
    const chrome = metalMat(0x8f99a1, 0.3, 1);
    add(g, L.cylinderZ(3.98, 3.9, 1.25, cell, 72, true), 0, 0, 12.5);
    add(g, L.torusZ(3.97, 0.075, chrome), 0, 0, 13.08);
    add(g, L.torusZ(3.62, 0.05, matteMat(0x05070a, 0.6)), 0, 0, 12.15);
    // elements
    add(g, lensGlass(3.72, 0.62, 0.56, 0.34, glassMat(0x123846, 0.72), 80), 0, 0, 12.78);
    add(g, lensGlass(3.15, 0.3, 0.22, 0.22, glassMat(0x1d4a58, 0.5), 72), 0, 0, 12.18);
    add(g, L.torusZ(3.45, 0.02, new T.MeshBasicMaterial({ color: 0x6fe6ff, transparent: true, opacity: 0.75, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })), 0, 0, 12.93);
    // inner spacer
    add(g, L.cylinderZ(3.35, 3.35, 0.16, matteMat(0x080a0c, 0.7), 64, true), 0, 0, 12.46);
    return g;
  }

  function buildBarrel() {
    const g = new T.Group();
    const metal = new T.MeshStandardMaterial({ color: 0x24282e, metalness: 0.62, roughness: 0.36, side: T.DoubleSide });
    const rubber = new T.MeshStandardMaterial({ color: 0x111417, metalness: 0.06, roughness: 0.9, side: T.DoubleSide });
    const chrome = metalMat(0xaab4bc, 0.25, 1);

    // structural tube
    add(g, L.cylinderZ(4.3, 4.34, 8.5, metal, 96, true), 0, 0, 10.65);
    // rear collar / aperture ring
    add(g, L.cylinderZ(4.34, 4.34, 0.55, metalMat(0x262b31, 0.38, 0.8), 96, true), 0, 0, 6.7);
    L.knurlZ(g, 4.34, 6.7, 0.5, 96, matteMat(0x171b20, 0.8), 0.06, 0.09);
    add(g, L.torusZ(4.37, 0.05, chrome), 0, 0, 7.0);

    // zoom ring
    add(g, L.cylinderZ(4.46, 4.46, 2.75, rubber, 96, true), 0, 0, 8.45);
    L.knurlZ(g, 4.47, 8.45, 2.68, 104, matteMat(0x14171b, 0.92), 0.055, 0.05);
    add(g, L.torusZ(4.48, 0.05, metalMat(0x2d333a, 0.45, 0.7)), 0, 0, 7.1);
    add(g, L.torusZ(4.48, 0.05, metalMat(0x2d333a, 0.45, 0.7)), 0, 0, 9.8);

    // focus ring
    add(g, L.cylinderZ(4.46, 4.46, 1.95, rubber, 96, true), 0, 0, 11.05);
    L.knurlZ(g, 4.47, 11.05, 1.88, 104, matteMat(0x14171b, 0.92), 0.055, 0.05);
    add(g, L.torusZ(4.48, 0.05, metalMat(0x2d333a, 0.45, 0.7)), 0, 0, 10.05);
    add(g, L.torusZ(4.48, 0.05, chrome), 0, 0, 12.05);

    // front barrel section
    add(g, L.cylinderZ(4.4, 4.4, 2.95, metal, 96, true), 0, 0, 13.45);
    add(g, L.torusZ(4.4, 0.06, chrome), 0, 0, 14.9);
    add(g, L.cylinderZ(4.28, 4.28, 0.12, matteMat(0x06080a, 0.6), 72, true), 0, 0, 14.94);
    // inner baffles
    [12.35, 13.2, 14.05].forEach(z => add(g, L.torusZ(4.18, 0.035, matteMat(0x050708, 0.8)), 0, 0, z));

    // markings
    const t1 = L.textTex('FE 24-70mm  1:2.8  GM II', 2048, 150, { fs: 78, spacing: 6, color: '#e5edf2' });
    add(g, arcDecal(t1, 4.44, 0.5, 1.55, 13.62, true), 0, 0, 13.62);
    const t2 = L.textTex('SONY', 512, 128, { fs: 74, spacing: 18, color: '#dfe8ee' });
    add(g, arcDecal(t2, 4.44, 0.34, 0.52, 14.28, true), 0, 0, 14.28);
    const t3 = L.textTex('82', 256, 128, { fs: 72, spacing: 2, color: '#b9c9d3' });
    add(g, arcDecal(t3, 4.44, 0.3, 0.24, 12.45, true), 0, 0, 12.45);
    const badge = decal(gBadgeTex(), 0.92);
    badge.rotation.x = -Math.PI / 2;
    add(g, badge, 0, 4.41, 12.55);
    // small white index marks
    for (let i = 0; i < 5; i++) {
      const a = 0.35 + i * 0.09;
      const tick = new T.Mesh(new T.BoxGeometry(0.03, 0.01, 0.22), new T.MeshBasicMaterial({ color: 0xdfe8ee, toneMapped: false }));
      tick.position.set(Math.cos(a) * 4.41, Math.sin(a) * 4.41, 12.78);
      tick.rotation.z = a;
      g.add(tick);
    }
    return g;
  }

  function buildFocusGroup() {
    const g = new T.Group();
    const metal = metalMat(0x474f57, 0.35, 0.95);
    add(g, L.cylinderZ(2.9, 2.9, 0.95, metalMat(0x191d22, 0.45, 0.8), 64, true), 0, 0, 9.25);
    add(g, L.torusZ(2.86, 0.07, metal), 0, 0, 9.0);
    add(g, L.torusZ(2.86, 0.07, metal), 0, 0, 9.5);
    add(g, lensGlass(2.44, 0.42, 0.3, 0.26, glassMat(0x2e7894, 0.5), 64), 0, 0, 9.2);
    add(g, lensGlass(2.02, 0.26, 0.2, 0.18, glassMat(0x2e7894, 0.38), 64), 0, 0, 9.55);
    add(g, L.cylinderZ(2.2, 2.2, 0.1, matteMat(0x06080a, 0.7), 48, true), 0, 0, 9.38);
    // drive pin
    add(g, new T.Mesh(new T.BoxGeometry(0.18, 0.5, 0.3), metalMat(0x9aa4ac, 0.3, 1)), 2.72, 0, 9.3);
    return g;
  }

  function buildAperture() {
    const g = new T.Group();
    const metal = metalMat(0x3b424a, 0.35, 0.95);
    const bladeMat = new T.MeshStandardMaterial({ color: 0x23272d, metalness: 0.9, roughness: 0.3, side: T.DoubleSide });
    add(g, L.cylinderZ(3.6, 3.6, 0.5, metal, 72, true), 0, 0, 7.4);
    add(g, L.torusZ(3.58, 0.06, metalMat(0x7f8992, 0.3, 1)), 0, 0, 7.62);
    add(g, L.torusZ(3.58, 0.06, metalMat(0x7f8992, 0.3, 1)), 0, 0, 7.18);
    // 11 blades
    const count = 11;
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2;
      const blade = new T.Mesh(L.ringSector(1.42, 3.44, -0.34, 0.34), bladeMat);
      blade.position.z = 7.4 + i * 0.003;
      blade.rotation.z = a + 0.16;
      g.add(blade);
    }
    add(g, L.torusZ(3.44, 0.035, metalMat(0x0a0c0f, 0.5)), 0, 0, 7.42);
    // aperture lever + flex
    add(g, new T.Mesh(new T.BoxGeometry(0.32, 0.7, 0.16), metalMat(0x9aa4ac, 0.3, 1)), 2.9, 1.7, 7.7);
    add(g, new T.Mesh(new T.BoxGeometry(0.5, 0.14, 0.18), matteMat(0x6b4520, 0.7)), 2.6, 2.2, 7.55);
    return g;
  }

  function buildMotor() {
    const g = new T.Group();
    const steel = metalMat(0x6b747c, 0.3, 1);
    const copper = metalMat(0xb06a3a, 0.32, 1);
    [[1.95, -2.05], [-1.95, -2.05]].forEach(p => {
      const x = p[0], y = p[1];
      add(g, L.cylinderZ(0.44, 0.44, 1.45, steel, 32), x, y, 6.0);
      add(g, L.cylinderZ(0.47, 0.47, 0.22, copper, 32), x, y, 5.55);
      add(g, L.cylinderZ(0.47, 0.47, 0.22, copper, 32), x, y, 6.0);
      add(g, L.cylinderZ(0.47, 0.47, 0.22, copper, 32), x, y, 6.45);
      add(g, L.cylinderZ(0.08, 0.08, 0.6, steel, 16), x, y, 6.85);
      // pinion
      add(g, L.cylinderZ(0.3, 0.3, 0.16, metalMat(0x2b3036, 0.4, 0.9), 24), x, y, 6.95);
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        const tooth = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 0.16), metalMat(0x2b3036, 0.4, 0.9));
        tooth.position.set(x + Math.cos(a) * 0.32, y + Math.sin(a) * 0.32, 6.95);
        tooth.rotation.z = a;
        g.add(tooth);
      }
    });
    add(g, new T.Mesh(new T.BoxGeometry(3.9, 0.7, 0.08), matteMat(0x5c3a1c, 0.7)), 0, -2.05, 5.35);
    add(g, new T.Mesh(new T.BoxGeometry(1.1, 0.16, 0.5), matteMat(0x1b1e22, 0.6)), 0, -2.6, 5.9);
    return g;
  }

  function buildRearGroup() {
    const g = new T.Group();
    const metal = metalMat(0x343a41, 0.4, 0.9);
    add(g, L.cylinderZ(3.02, 3.02, 1.15, metalMat(0x191d21, 0.45, 0.8), 64, true), 0, 0, 5.1);
    add(g, L.torusZ(3.0, 0.07, metal), 0, 0, 5.65);
    add(g, L.torusZ(3.0, 0.07, metal), 0, 0, 4.58);
    add(g, lensGlass(2.62, 0.34, 0.26, 0.24, glassMat(0x2a718c, 0.48), 64), 0, 0, 5.5);
    add(g, lensGlass(2.2, 0.28, 0.24, 0.2, glassMat(0x2a718c, 0.42), 64), 0, 0, 5.1);
    add(g, lensGlass(2.35, 0.3, 0.18, 0.22, glassMat(0x2a718c, 0.38), 64), 0, 0, 4.76);
    add(g, L.cylinderZ(3.1, 2.6, 0.35, matteMat(0x06080a, 0.7), 48), 0, 0, 4.6);
    return g;
  }

  function buildMount() {
    const g = new T.Group();
    const steel = metalMat(0x8f99a2, 0.3, 1);
    const dark = matteMat(0x0b0d10, 0.55);
    const gold = metalMat(0xd2a44e, 0.3, 1);

    // mount ring
    add(g, L.cylinderZ(3.4, 3.4, 0.62, steel, 72, true), 0, 0, 3.86);
    add(g, L.torusZ(3.38, 0.06, metalMat(0x6f7880, 0.35, 1)), 0, 0, 4.16);
    add(g, L.cylinderZ(2.62, 2.62, 0.64, dark, 64, true), 0, 0, 3.86);
    // rear face ring
    const face = new T.Mesh(new T.RingGeometry(2.55, 3.38, 64), metalMat(0x3b4249, 0.4, 0.9));
    face.position.z = 3.55;
    face.rotation.y = Math.PI;
    g.add(face);
    // contacts
    for (let i = 0; i < 10; i++) {
      const a = -1.35 + i * 0.3;
      add(g, new T.Mesh(new T.BoxGeometry(0.14, 0.2, 0.04), gold), Math.cos(a) * 2.92, Math.sin(a) * 2.92, 3.53);
    }
    // bayonet tabs
    [0.4, 2.5, 4.6].forEach(a => {
      const t = new T.Mesh(new T.BoxGeometry(0.45, 0.18, 0.1), steel);
      t.position.set(Math.cos(a) * 3.0, Math.sin(a) * 3.0, 4.2);
      t.rotation.z = a;
      g.add(t);
    });
    // gasket
    add(g, L.torusZ(3.12, 0.045, matteMat(0x0a0c10, 0.9)), 0, 0, 3.56);

    // rear barrel
    add(g, L.cylinderZ(3.92, 3.92, 2.25, metalMat(0x1c2025, 0.42, 0.8), 72, true), 0, 0, 5.32);
    add(g, L.torusZ(3.92, 0.06, metalMat(0x555e66, 0.35, 1)), 0, 0, 6.4);
    L.knurlZ(g, 3.94, 4.55, 0.55, 80, matteMat(0x101318, 0.9), 0.07, 0.1);
    add(g, L.cylinderZ(3.94, 3.94, 0.55, matteMat(0x101318, 0.9), 72, true), 0, 0, 4.55);

    // switches
    add(g, new T.Mesh(rbox(1.15, 0.16, 0.62, 0.08, 0.02), dark), 0.7, 3.94, 5.35);
    add(g, new T.Mesh(rbox(0.42, 0.09, 0.3, 0.05, 0.01), steel), 0.52, 4.03, 5.35);
    add(g, new T.Mesh(rbox(1.0, 0.16, 0.5, 0.08, 0.02), dark), -1.35, 3.93, 5.7);
    add(g, new T.Mesh(rbox(0.3, 0.08, 0.26, 0.05, 0.01), steel), -1.22, 4.01, 5.7);
    // alignment dot
    add(g, new T.Mesh(new T.SphereGeometry(0.08, 14, 10), new T.MeshStandardMaterial({ color: 0xd42a18, emissive: 0x4a0b04, emissiveIntensity: 0.8, roughness: 0.4 })), 0, 3.44, 4.3);

    return g;
  }

  A.buildModel = function (opts) {
    const makers = Object.assign({}, A._builders, {
      hood: buildHood, frontElement: buildFrontElement, barrel: buildBarrel,
      focusGroup: buildFocusGroup, aperture: buildAperture, motor: buildMotor,
      rearGroup: buildRearGroup, mount: buildMount
    });
    const groups = [];
    A.parts.forEach(p => {
      const g = makers[p.id] ? makers[p.id]() : new T.Group();
      g.userData.partId = p.id;
      g.name = p.id;
      groups.push(g);
    });
    return groups;
  };
})();
