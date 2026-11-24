/* api3d.js: api dan asap 3D (ilustrasi) di peta utama. Lapisan khusus WebGL2 di dalam kamera MapLibre.
   Sumber: titik panas 24 jam terakhir yang sudah dimuat index.html (S.titik), digabung per sel 16 px atau 375 m;
   intensitas dari FRP, angin dari medan angin yang sama dengan lapisan Angin (Angin.di). Tanpa WebGL2 atau bila
   shader gagal, lapisan tidak dipasang dan tampilan tetap seperti semula.

   Port dari fire3d.ts (Pantau Karhutla), lisensi MIT:
   Copyright (c) 2026 Pantau Karhutla
   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
   documentation files (the "Software"), to deal in the Software without restriction, including without limitation
   the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
   to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above
   copyright notice and this permission notice shall be included in all copies or substantial portions of the
   Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
   LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
   SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
   OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
   DEALINGS IN THE SOFTWARE.

   Perubahan dari aslinya: JS biasa tanpa tipe; matriks MapLibre 4.7.1 (satuan koordinat mercator, bukan piksel dunia);
   tanpa uji kedalaman (peta datar tanpa medan); penyusunan ulang buffer saat moveend, bukan idle. */
(() => {
  "use strict";
  const C = 40075016.686;   /* keliling bumi, m */
  const KUNCI = "api3d";
  const ID = "api3d";

  const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec3 aPos;
layout(location=2) in vec4 aP;
layout(location=3) in vec2 aWind;
uniform mat4 uMatrix;
uniform float uTime;
uniform float uUnit;
uniform float uK;
uniform vec2 uAspect;
uniform float uKind;
out vec2 vUv;
out float vAge;
out float vSeed;
out float vI;

float rnd(float s) { return fract(sin(s * 12.9898) * 43758.5453); }

void main() {
  float seed = aP.x;
  float I = aP.y;
  float life = uKind < 0.5 ? 1.8 + 0.8 * rnd(seed + 1.0) : 9.0 + 5.0 * rnd(seed + 2.0);
  float tl = uTime / life + aP.z;
  float cyc = floor(tl);
  float a = fract(tl);
  float r1 = rnd(seed + cyc * 7.13);
  float r2 = rnd(seed * 1.7 + cyc * 3.1);
  float U = uUnit;
  float sI = sqrt(I);
  vec3 p = aPos;
  float ws = length(aWind);
  vec2 wd = ws > 0.1 ? aWind / ws : vec2(0.0);
  float half_;
  if (uKind < 0.5) {
    float ang = r1 * 6.2831;
    float spread = max(3.5 * U * sI, aP.w);
    float rad = sqrt(r2) * spread;
    p.xy += vec2(cos(ang), sin(ang)) * rad * (1.0 - 0.3 * a);
    p.z += a * 16.0 * U * sI;
    p.xy += wd * min(ws, 8.0) * a * a * 0.35 * U;
    half_ = max(U * (3.0 + 1.8 * r1) * sI, aP.w * (0.4 + 0.25 * r1)) * (1.0 - 0.5 * a);
  } else {
    float ang = r1 * 6.2831;
    float rad = sqrt(r2) * 3.0 * U * sI;
    p.xy += vec2(cos(ang), sin(ang)) * rad;
    float rise = (1.0 - exp(-a * 4.0)) * (10.0 + 10.0 * sI) * U;
    p.z += 4.0 * U + rise;
    float drift = (1.5 + ws) * a * 30.0 * U * (0.7 + 0.3 * sI);
    vec2 side = vec2(-wd.y, wd.x);
    p.xy += wd * drift + side * (r2 - 0.5) * a * 14.0 * U * sI;
    if (ws <= 0.1) p.xy += vec2(cos(ang), sin(ang)) * a * 18.0 * U;
    half_ = U * (3.0 + 18.0 * pow(a, 0.7)) * (0.6 + 0.4 * sI);
  }
  vec4 c = uMatrix * vec4(p, 1.0);
  c.xy += aCorner * half_ * uK * uAspect;
  gl_Position = c;
  vUv = aCorner;
  vAge = a;
  vSeed = seed + cyc;
  vI = I;
}`;

  const FS = `#version 300 es
precision highp float;
in vec2 vUv;
in float vAge;
in float vSeed;
in float vI;
uniform float uKind;
uniform float uFade;
uniform vec3 uSun;
uniform float uDay;
uniform float uFireGain;
out vec4 frag;

float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 s = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), s.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), s.x), s.y);
}

void main() {
  float d = length(vUv);
  if (d > 1.0) discard;
  float a = vAge;
  if (uKind < 0.5) {
    float n = vnoise(vUv * 3.0 + vSeed * 13.0);
    float core = exp(-d * d * 3.2) * (0.75 + 0.5 * n);
    float temp = core * (1.0 - a * 0.85);
    vec3 col = mix(vec3(0.55, 0.05, 0.0), vec3(1.0, 0.42, 0.04), smoothstep(0.05, 0.4, temp));
    col = mix(col, vec3(1.0, 0.86, 0.45), smoothstep(0.45, 0.8, temp));
    float alpha = core * smoothstep(0.0, 0.08, a) * (1.0 - smoothstep(0.55, 1.0, a));
    frag = vec4(col * alpha * 0.55 * uFireGain * uFade, 0.0);
  } else {
    float n = vnoise(vUv * 2.2 + vSeed * 5.0) * 0.6 + vnoise(vUv * 5.0 - vSeed * 3.0) * 0.4;
    float body = smoothstep(1.0, 0.25, d + (n - 0.5) * 0.55);
    vec3 grey = mix(vec3(0.27, 0.24, 0.21), vec3(0.58, 0.56, 0.52), smoothstep(0.0, 0.6, a));
    grey *= vec3(0.22) + uSun * 0.7 + vec3(1.0, 0.95, 0.85) * 0.5 * uDay;
    vec3 lit = vec3(0.95, 0.45, 0.15);
    float under = (1.0 - smoothstep(0.0, 0.12 + 0.18 * (1.0 - uDay), a)) * (0.6 + 0.3 * (1.0 - uDay));
    vec3 col = mix(grey, lit, under);
    float alpha = body * 0.24 * (0.55 + 0.45 * uDay) * smoothstep(0.0, 0.1, a) * (1.0 - smoothstep(0.45, 1.0, a)) * uFade;
    frag = vec4(col * alpha, alpha);
  }
}`;

  function kompilasi(gl, tipe, src) {
    const s = gl.createShader(tipe);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  }

  /* perkalian matriks 4x4 kolom-utama (a * b), double */
  function kali(a, b) {
    const o = new Float64Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  }

  class Api3DLayer {
    constructor() {
      this.id = ID; this.type = "custom"; this.renderingMode = "2d";
      this.map = null; this.gl = null; this.prog = null; this.quad = null; this.flames = null; this.smoke = null;
      this.sources = []; this.perSource = [10, 10]; this.origin = {lon: 0, lat: 0}; this.uni = {};
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.t0 = performance.now(); this.nextFrame = 0;
      this.light = {sun: [0.9, 0.8, 0.7], day: 1, fireGain: 1};
      this.aktif = performance.now();
    }
    /* animasi berhenti sesudah 20 dtk tanpa interaksi; gerak, klik, atau penunjuk di peta menghidupkannya lagi */
    bangun = () => { const lama = performance.now() - this.aktif > 20000; this.aktif = performance.now(); if (lama && !this.nextFrame) this.map?.triggerRepaint(); };
    setLighting(sun, day, fireGain) { this.light = {sun, day, fireGain}; this.map?.triggerRepaint(); }
    setSources(sources, perSource) { this.sources = sources; this.perSource = perSource; this.rebuild(); }
    onAdd(map, gl) {
      if (typeof WebGL2RenderingContext === "undefined" || !(gl instanceof WebGL2RenderingContext)) throw new Error("tanpa WebGL2");
      this.map = map; this.gl = gl;
      const p = gl.createProgram();
      gl.attachShader(p, kompilasi(gl, gl.VERTEX_SHADER, VS));
      gl.attachShader(p, kompilasi(gl, gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
      this.prog = p;
      for (const u of ["uMatrix", "uTime", "uUnit", "uK", "uAspect", "uKind", "uFade", "uSun", "uDay", "uFireGain"]) this.uni[u] = gl.getUniformLocation(p, u);
      this.quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      this.flames = this.batch(); this.smoke = this.batch();
      document.addEventListener("visibilitychange", this.terlihat);
      map.on("movestart", this.bangun); map.on("click", this.bangun); map.on("mousemove", this.bangun);
      this.rebuild();
    }
    onRemove() {
      document.removeEventListener("visibilitychange", this.terlihat);
      this.map?.off("movestart", this.bangun); this.map?.off("click", this.bangun); this.map?.off("mousemove", this.bangun);
      clearTimeout(this.nextFrame); this.nextFrame = 0;
      const gl = this.gl; if (!gl) return;
      for (const b of [this.flames, this.smoke]) if (b) { gl.deleteBuffer(b.buf); gl.deleteVertexArray(b.vao); }
      gl.deleteBuffer(this.quad); gl.deleteProgram(this.prog);
      this.gl = null; this.prog = null;
    }
    terlihat = () => { if (!document.hidden) this.map?.triggerRepaint(); };
    batch() {
      const gl = this.gl, vao = gl.createVertexArray(), buf = gl.createBuffer(), st = 9 * 4;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      [[1, 3, 0], [2, 4, 12], [3, 2, 28]].forEach(([loc, n, off]) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, st, off); gl.vertexAttribDivisor(loc, 1); });
      gl.bindVertexArray(null);
      return {vao, buf, count: 0};
    }
    rebuild() {
      const gl = this.gl, map = this.map; if (!gl || !map) return;
      const c = map.getCenter(); this.origin = {lon: c.lng, lat: c.lat};
      const mLat = C / 360, mLon = mLat * Math.cos(c.lat * Math.PI / 180);
      const isi = (n, salt) => {
        const data = new Float32Array(this.sources.length * n * 9); let o = 0;
        this.sources.forEach((s, si) => {
          const x = (s.lon - c.lng) * mLon, y = (s.lat - c.lat) * mLat;
          for (let k = 0; k < n; k++) {
            data.set([x, y, 0, (si * 131 + k * 17 + salt) % 997, s.i, (k / n + ((si * 0.618) % 1)) % 1, s.r || 0, s.u, s.v], o); o += 9;
          }
        });
        return data;
      };
      for (const [b, n, salt] of [[this.flames, this.perSource[0], 0], [this.smoke, this.perSource[1], 500]]) {
        gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); gl.bufferData(gl.ARRAY_BUFFER, isi(n, salt), gl.DYNAMIC_DRAW); b.count = this.sources.length * n;
      }
      map.triggerRepaint();
    }
    render(gl, arg) {
      if (!this.gl || !this.prog || !arg || (!this.flames.count && !this.smoke.count)) return;
      const map = this.map, z = map.getZoom();
      if (z < 4.2) return;
      const latR = this.origin.lat * Math.PI / 180, mPerMerc = C * Math.cos(latR);
      const mx = (this.origin.lon + 180) / 360, my = (180 - 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + latR / 2))) / 360;
      const s = 1 / mPerMerc;
      /* MapLibre 5 memberi objek dengan matriks dalam piksel dunia; MapLibre 4 memberi matriks dalam koordinat mercator */
      const v5 = !!arg.modelViewProjectionMatrix, ws = 512 * 2 ** z, pxPerM = ws / mPerMerc;
      const model = v5
        ? new Float64Array([pxPerM, 0, 0, 0, 0, -pxPerM, 0, 0, 0, 0, 1, 0, mx * ws, my * ws, 0, 1])
        : new Float64Array([s, 0, 0, 0, 0, -s, 0, 0, 0, 0, s, 0, mx, my, 0, 1]);
      const mvp = kali(v5 ? arg.modelViewProjectionMatrix : arg, model);
      const ctr = map.getCenter();
      const cx = (ctr.lng - this.origin.lon) * (C / 360) * Math.cos(latR), cy = (ctr.lat - this.origin.lat) * (C / 360);
      const wC = mvp[3] * cx + mvp[7] * cy + mvp[15];
      const cv = map.getCanvas(), cssW = cv.clientWidth || 1, cssH = cv.clientHeight || 1;
      const k = pxPerM * wC * 2 / cssW;
      const unit = (1 / pxPerM) * (0.55 + 0.12 * Math.max(0, z - 5));
      const diam = this.reduced;
      const waktu = diam ? 3.0 : (performance.now() - this.t0) / 1000;
      const L = this.light;

      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.uni.uMatrix, false, new Float32Array(mvp));
      gl.uniform1f(this.uni.uTime, waktu); gl.uniform1f(this.uni.uUnit, unit); gl.uniform1f(this.uni.uK, k);
      gl.uniform2f(this.uni.uAspect, 1, cssW / cssH);
      gl.uniform1f(this.uni.uFade, Math.min(1, Math.max(0, (z - 4.2) / 1.2)));
      gl.uniform3f(this.uni.uSun, L.sun[0], L.sun[1], L.sun[2]); gl.uniform1f(this.uni.uDay, L.day); gl.uniform1f(this.uni.uFireGain, L.fireGain);
      gl.enable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      /* asap dulu (premultiplied over), api di atasnya (cahaya aditif) */
      gl.uniform1f(this.uni.uKind, 1); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(this.smoke.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.smoke.count);
      gl.uniform1f(this.uni.uKind, 0); gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(this.flames.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.flames.count);
      gl.bindVertexArray(null);
      /* ~15 fps: setiap gambar ulang menggambar seluruh peta; berhenti saat tab tersembunyi, gerak dikurangi, atau 20 dtk tanpa interaksi */
      if (!diam && !document.hidden && !this.nextFrame && performance.now() - this.aktif < 20000) {
        this.nextFrame = setTimeout(() => { this.nextFrame = 0; map.triggerRepaint(); }, 66);
      }
    }
  }

  /* ---------- pengendali: sumber dari titik panas 24 jam, saklar, ingatan pilihan ---------- */
  const ponsel = () => innerWidth <= 900 || matchMedia("(pointer: coarse)").matches;
  const anggaran = () => ponsel() ? 300 : 1500;
  const bisaWebGL2 = (() => { let ok; return () => ok ??= !!document.createElement("canvas").getContext("webgl2"); })();
  /* nanti() milik index.html: dua rAF atau 120 ms, supaya klik selesai digambar dulu */
  const tunda = fn => (typeof nanti === "function" ? nanti(fn) : setTimeout(fn, 120));

  const Api3D = {
    on: false, lap: null, _t: 0, _iv: 0, _pr0: null, _kc: null,
    /* tersimpan: "1" nyala; belum pernah memilih = mati di semua perangkat */
    pilihan() { const v = localStorage.getItem(KUNCI); return v === "1"; },
    /* sumber: titik <= 24 jam, digabung per sel max(16 px, 375 m); intensitas dari jumlah FRP */
    sumber() {
      if (typeof S === "undefined" || !Array.isArray(S.titik) || !S.acuan) return [];
      const z = peta.getZoom(), b = peta.getBounds(), c = peta.getCenter();
      const padLon = (b.getEast() - b.getWest()) * 0.1, padLat = (b.getNorth() - b.getSouth()) * 0.1;
      const w = b.getWest() - padLon, e = b.getEast() + padLon, so = b.getSouth() - padLat, no = b.getNorth() + padLat;
      const cosL = Math.cos(c.lat * Math.PI / 180), mPx = C * cosL / (512 * 2 ** z);
      const sel = Math.max(375, 16 * mPx), dLat = sel / (C / 360), dLon = sel / (C / 360 * cosL);
      /* saringan 24 jam dicache per acuan, jumlah titik, dan 5 menit; bbox dulu, S.dihitung hanya pada yang lolos */
      const kc = +S.acuan + "|" + S.titik.length + "|" + Math.floor(Date.now() / 3e5);
      if (this._kc?.k !== kc) { const dari = (Date.now() - +S.acuan) / 36e5; this._kc = {k: kc, a: S.titik.filter(t => dari - t[2] <= 24)}; }
      const sel2 = new Map();
      for (const t of this._kc.a) {
        const lat = t[0], lon = t[1];
        if (lon < w || lon > e || lat < so || lat > no || !S.dihitung(t)) continue;
        const kunci = Math.floor(lon / dLon) * 1e6 + Math.floor(lat / dLat), bobot = Math.max(t[4] || 0, 1);
        const g = sel2.get(kunci) || {n: 0, frp: 0, la: 0, lo: 0};
        g.n++; g.frp += t[4] || 0; g.la += lat * bobot; g.lo += lon * bobot; g.bobot = (g.bobot || 0) + bobot; sel2.set(kunci, g);
      }
      const hasil = [...sel2.values()].sort((a, b2) => b2.frp - a.frp).slice(0, anggaran());
      const angin = typeof Angin !== "undefined" && S.fwi ? (Angin.medan || (Angin.bangun(), Angin.medan)) && Angin : null;
      return hasil.map(g => {
        const lon = g.lo / g.bobot, lat = g.la / g.bobot, a = angin?.di(lon, lat) || [0, 0];
        return {lon, lat, i: Math.min(3, 0.4 + 0.6 * Math.log2(1 + g.frp / 10)), u: a[0], v: a[1], r: g.n > 1 ? Math.min(600, 187 * Math.sqrt(g.n)) : 0};
      });
    },
    segarkan() {
      if (!this.on || !this.lap || document.hidden) return;
      const z = peta.getZoom();
      const s = z < 4.2 ? [] : this.sumber();
      this.lap.setSources(s, s.length > 600 ? [5, 5] : [10, 10]);
    },
    jadwal() { clearTimeout(this._t); this._t = setTimeout(() => tunda(() => this.segarkan()), 250); },
    pr(nilai) { if (typeof peta.setPixelRatio === "function" && peta.getPixelRatio?.() !== nilai) peta.setPixelRatio(nilai); },
    pasang() {
      if (!this.on || peta.getLayer(ID)) return;
      try {
        this.lap = new Api3DLayer(); peta.addLayer(this.lap);
        this._pr0 ??= peta.getPixelRatio?.(); this.pr(Math.min(devicePixelRatio || 1, 2));
      } catch (err) {
        /* tanpa WebGL2 atau shader gagal: diam saja, peta tetap seperti semula */
        console.warn("api3d", err); if (peta.getLayer(ID)) peta.removeLayer(ID); this.lap = null; this.on = false; this.sembunyikan(); return;
      }
      this.segarkan(); window.Matahari?.paksa();
    },
    sembunyikan() { const l = document.querySelector('#lapis input[data-l="api3d"]')?.closest("label"); if (l) l.hidden = true; if (typeof renderLegenda === "function") renderLegenda(); },
    /* dipanggil pemilih lapisan: kotak centang langsung berubah, kerja berat ditunda */
    lapis(nyala) {
      localStorage.setItem(KUNCI, nyala ? "1" : "0"); this.on = nyala;
      tunda(() => {
        if (nyala) this.pasang();
        else { if (peta.getLayer(ID)) peta.removeLayer(ID); this.lap = null; if (this._pr0 != null) this.pr(this._pr0); }
        if (typeof renderLegenda === "function") renderLegenda();
      });
    },
    mulai() {
      if (!bisaWebGL2()) return this.sembunyikan();
      const kotak = document.querySelector('#lapis input[data-l="api3d"]');
      this.on = this.pilihan(); if (kotak) kotak.checked = this.on;
      /* gaya dasar diganti (mode gelap) membuang semua lapisan: pasang lagi */
      peta.on("style.load", () => { this.lap = null; this.pasang(); });
      peta.on("moveend", () => this.on && this.jadwal());
      document.addEventListener("visibilitychange", () => { if (!document.hidden) this.jadwal(); });
      this._iv = setInterval(() => this.on && !document.hidden && this.jadwal(), 5 * 6e4);   /* titik_live menambah titik tiap 3 jam */
      if (this.on) tunda(() => this.pasang());
      if (typeof renderLegenda === "function") renderLegenda();
    },
  };
  window.Api3D = Api3D;
  window.Api3DLayer = Api3DLayer;
  /* peta dibuat saat init; tunggu sampai lapisan data terpasang */
  const tunggu = setInterval(() => { if (typeof peta !== "undefined" && peta && peta.getSource?.("titik")) { clearInterval(tunggu); Api3D.mulai(); } }, 500);
})();
