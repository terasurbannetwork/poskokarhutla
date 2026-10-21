"use strict";
/* sim_model.js: tab Model di simulasi cuaca. Dampak angin, genangan hujan (pita ansambel), gelombang badai, batas operasi kapal, dan peringkat tindakan.
   Rumus ada di sim_dampak.js. Titik hitung: sel penduduk 0,25 derajat (WorldPop), sekolah dan faskes (fasilitas.json), DEM Terrarium z6.
   Semua hitungan dipecah per bingkai (10 ms); berkas yang tidak terbaca membuang bagiannya, tidak dikarang. */
(() => {
  const C = window.SimCtx, SK = window.SimSk, D = window.SimDampak; if (!C || !SK || !D) return;
  const S = C.S, SC = C.SC, K = SK.K, f1 = C.f1, f0 = C.f0, kartu = SK.kartu;
  const Z = 6, B = "/banjir/data/", R = {gen: 0, tab: "", kotor: true, jalan: false, pts: null, bahan: null, hasil: null, status: ""};
  const rp = x => x == null ? "–" : x >= 1e12 ? `Rp ${fmt(Math.round(x / 1e11) / 10)} triliun` : x >= 1e9 ? `Rp ${fmt(Math.round(x / 1e8) / 10)} miliar` : x >= 1e6 ? `Rp ${fmt(Math.round(x / 1e5) / 10)} juta` : `Rp ${fmt(Math.round(x / 1e3))} ribu`;
  const jt = x => x == null ? "–" : x >= 1e6 ? `${fmt(Math.round(x / 1e5) / 10)} juta` : fmt(Math.round(x / (x >= 1e4 ? 100 : 1)) * (x >= 1e4 ? 100 : 1)); /* jiwa dibulatkan: tanpa presisi palsu */
  const json = u => fetch(u, {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null);
  const tunggu = () => new Promise(r => requestAnimationFrame(() => r()));

  /* ---------------------------------------------------------------- bahan: penduduk, fasilitas, DEM */
  const ubin = new Map();
  const ambilUbin = (x, y) => { const k = x + "/" + y; if (!ubin.has(k)) ubin.set(k, fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${k}.png`).then(r => r.ok ? r.blob() : Promise.reject()).then(createImageBitmap)
    .then(bm => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d", {willReadFrequently: true}); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, 256, 256).data; }).catch(() => null)); return ubin.get(k); };
  async function siapBahan() {
    if (R.pts) return R.pts;
    const M = S.M, [pen, fas] = await Promise.all([json("/data/penduduk.json"), json("/data/fasilitas.json")]);
    const pts = [], dalam = (la, lo) => lo >= M.lon0 && lo <= M.lon0 + (M.nx - 1) * M.d && la >= M.lat0 && la <= M.lat0 + (M.ny - 1) * M.d;
    if (pen?.grid) { const m = new Map(); for (const [la, lo, w] of pen.grid) if (w > 0 && dalam(la, lo)) { const k = la + "," + lo, a = m.get(k); a ? a.w += w : m.set(k, {lat: la, lon: lo, w, k: "p"}); } pts.push(...m.values()); }
    for (const x of fas || []) if (dalam(x.lat, x.lon)) pts.push({lat: x.lat, lon: x.lon, w: 1, k: x.t === "sekolah" ? "s" : "f", nama: x.nama});
    /* DEM: ubin dimuat 6 sekaligus; tanpa ubin, elevasi null (titik tidak pernah dihitung tergenang) */
    const perlu = new Map(); for (const p of pts) { const u = D.ubin(p.lon, p.lat, Z); p.u = u; perlu.set(u.x + "/" + u.y, [u.x, u.y]); }
    const daftar = [...perlu.values()]; let n = 0; R.status = `Memuat DEM 0 dari ${daftar.length}`; segarStatus();
    const kerja = async () => { while (daftar.length) { const [x, y] = daftar.pop(); await ambilUbin(x, y); R.status = `Memuat DEM ${++n} dari ${perlu.size}`; segarStatus(); } };
    await Promise.all(Array.from({length: 6}, kerja));
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], u = p.u, d = ubin.get(u.x + "/" + u.y) && await ubin.get(u.x + "/" + u.y); delete p.u; if (!d) { p.elev = null; p.lereng = 0; continue; }
      const at = (dx, dy) => { const px = Math.min(255, Math.max(0, u.px + dx)), py = Math.min(255, Math.max(0, u.py + dy)), o = (py * 256 + px) * 4; return Math.max(0, D.mdpl(d[o], d[o + 1], d[o + 2])); };
      const e = at(0, 0), m = 156543 * Math.cos(p.lat * Math.PI / 180) / 2 ** Z; p.elev = e; p.lereng = Math.atan(Math.hypot((at(1, 0) - at(-1, 0)) / (2 * m), (at(0, 1) - at(0, -1)) / (2 * m))) * 180 / Math.PI;
      if (i % 3000 === 2999) await tunggu();
    }
    R.pts = pts; return pts;
  }
  async function siapLain() {
    if (R.bahan) return R.bahan;
    const [ens, par, ver] = await Promise.all([json(B + "hujan_ansambel.json"), json(B + "param_banjir.json"), json(B + "cuaca_verifikasi.json")]);
    const q = par?.param, uang = q?.stimulan_rumah_rr && q?.nilai_nyawa_statistik && q?.biaya_pengungsi_hari ? {rr: q.stimulan_rumah_rr[0], rrRendah: q.stimulan_rumah_rr[1], rrTinggi: q.stimulan_rumah_rr[2], nyawa: q.nilai_nyawa_statistik[0], nyawaRendah: q.nilai_nyawa_statistik[1], nyawaTinggi: q.nilai_nyawa_statistik[2], pengungsiHari: q.biaya_pengungsi_hari[0]} : null;
    return R.bahan = {ens: ens?.grid?.length ? ens : null, uang, ver};
  }

  /* ---------------------------------------------------------------- hitung (dipecah per bingkai) */
  async function jalankan(F, vorAt, pts, Bw, id) {
    const nd = D.hariKe(S.jam0, S.n - 1) + 1, st = D.baru(pts.length, nd);
    for (let h = 0; h < S.n;) { const t = performance.now(); while (h < S.n && performance.now() - t < 10) { D.langkah(st, Bw, pts, F, S.jam0, h, h + 1, vorAt); h++; } await tunggu(); if (id !== R.gen) return null; }
    return st;
  }
  const dihitungPada = (pts, ms) => { if (ms < pts[0].ms || ms > pts[pts.length - 1].ms) return null; let i = 0; while (i < pts.length - 2 && pts[i + 1].ms < ms) i++; const a = pts[i], b = pts[i + 1], w = (ms - a.ms) / (b.ms - a.ms || 1); return {lat: a.lat + (b.lat - a.lat) * w, lon: a.lon + (b.lon - a.lon) * w, kt: a.kt + (b.kt - a.kt) * w}; };
  /* gelombang badai di tiap pelabuhan: maksimum atas jam dari defisit tekanan Holland di jarak pelabuhan dan angin total di sana */
  function badaiPelabuhan() {
    if (!K.vor || !K.skn) return [];
    const o = []; K.sites.forEach((s, i) => { if (s.j !== "p") return; let m = 0, jam = -1, dp = 0;
      for (let h = 0; h < S.n; h++) { const p = dihitungPada(K.vor.pts, S.jam0 + h * 36e5); if (!p) continue; const r = D.jarak(p.lat, p.lon, s.lat, s.lon); if (r > 600) continue;
        const d = D.dpDi(p.kt, r, K.sik.rm), b = D.badai(d, K.skn.st[i].kt[h] * SC.KT); if (b.total > m) { m = b.total; jam = h; dp = d; } }
      if (m > .05) o.push({nama: s.nama, lat: s.lat, lon: s.lon, m, jam, dp, prov: s.prov}); });
    return o.sort((a, b) => b.m - a.m);
  }
  async function hitungSemua() {
    const id = ++R.gen; R.jalan = true; R.kotor = false; R.status = "Menyiapkan penduduk, sekolah, faskes, dan DEM"; segarStatus();
    const [pts, lain] = await Promise.all([siapBahan(), siapLain()]); if (id !== R.gen) return;
    const Bw = D.bobot(S.M, pts), peta = D.petaAnsambel(pts, lain.ens), ada = SK.adaSkenario();
    R.status = "Menghitung prakiraan"; segarStatus();
    const s0 = await jalankan(K.F0, null, pts, Bw, id); if (!s0) return;
    let s1 = s0; if (ada) { R.status = "Menghitung skenario"; segarStatus(); s1 = await jalankan(K.F1, S.vorAt, pts, Bw, id); if (!s1) return; }
    const surge = ada ? badaiPelabuhan() : [], hit = (st, sg) => { const pt = D.hujanPita(st, pts.length, S.jam0, lain.ens, peta); return {...D.ringkas(pts, st, pt.pita, sg), hariAda: pt.hariAda, gmaks: st.gmax.reduce((a, b) => Math.max(a, b), 0), nd: st.nd}; };
    const sk = hit(s1, surge);
    R.hasil = {dasar: ada ? hit(s0, []) : sk, sk, ada, surge, kapal: D.kapal(K.skn.HS, K.skn.WK), kapal0: ada ? D.kapal(K.dasar.HS, K.dasar.WK) : null, ens: lain.ens, uang: lain.uang, ver: lain.ver, n: pts.length, nd: sk.nd};
    R.jalan = false; R.status = ""; render();
  }

  /* ---------------------------------------------------------------- tampilan */
  const baris = (nama, a, b, ada, fm = jt, cat = "") => `<tr><td>${nama}${cat ? `<span class="m">${cat}</span>` : ""}</td>${ada ? `<td class="n">${fm(a)}</td>` : ""}<td class="n"><b>${fm(b)}</b></td></tr>`;
  const kepala = ada => `<thead><tr><th></th>${ada ? `<th class="n">Prakiraan</th>` : ""}<th class="n">${ada ? "Skenario" : "Prakiraan"}</th></tr></thead>`;
  function segarStatus() { const e = document.getElementById("mdStatus"); if (e) e.textContent = R.status; }
  function render() {
    const el = document.getElementById("t-model"); if (!el) return;
    if (!R.hasil) { el.innerHTML = `<div class="sc-gen"><div class="spin"></div><span id="mdStatus">${esc(R.status || "Menyiapkan")}</span></div>`; return; }
    const h = R.hasil, a = h.dasar, s = h.sk, ada = h.ada, pil = t => `<span class="sc-pil" style="--w:#c9503a">${t}</span>`;
    const kataAtap = s.gmaks >= D.PARAM.atap[0] ? `Embusan tertinggi ${f0(s.gmaks)} km/jam sudah melewati median kerusakan atap.` : `Embusan tertinggi ${f0(s.gmaks)} km/jam, masih di bawah median kerusakan atap (${f0(D.PARAM.atap[0])} km/jam).`;
    let html = `<p class="sc-cat" style="margin:0 0 8px">${pil("Hasil model, belum divalidasi")} ${ada ? "Skenario dibandingkan dengan prakiraan." : "Dihitung dari prakiraan 72 jam."}</p>
      <button type="button" class="sc-reset" id="mdGenting" style="width:100%;margin:0 0 10px">Ke jam paling berbahaya</button>`;
    html += kartu("naik", "Angin kencang", `${kataAtap} Kerapuhan atap dan pohon memakai kurva lognormal.`,
      `<table class="sc-tb">${kepala(ada)}<tbody>${baris("Rumah rusak atapnya", a.rumahAtap, s.rumahAtap, ada)}${baris("Jiwa di sel dengan peluang rusak atap 50% atau lebih", a.jiwaAtap, s.jiwaAtap, ada)}${baris("Jiwa di sel dengan peluang pohon tumbang 50% atau lebih", a.jiwaPohon, s.jiwaPohon, ada)}${baris("Sekolah di sel itu", a.sekolah.atap, s.sekolah.atap, ada, fmt, `dari ${fmt(s.sekolah.n)}`)}${baris("Faskes di sel itu", a.faskes.atap, s.faskes.atap, ada, fmt, `dari ${fmt(s.faskes.n)}`)}</tbody></table>`);
    html += kartu("sel", "Hujan dan genangan", `Dataran rendah dengan limpasan di atas ambang: ${jt(s.genang[1])} jiwa (p10 sampai p90: ${jt(s.genang[0])} sampai ${jt(s.genang[2])}).`,
      `<table class="sc-tb"><thead><tr><th></th><th class="n">p10</th><th class="n">p50</th><th class="n">p90</th></tr></thead><tbody>
        <tr><td>Jiwa tergenang</td>${[0, 1, 2].map(i => `<td class="n">${jt(s.genang[i])}</td>`).join("")}</tr>
        <tr><td>Sekolah tergenang</td>${[0, 1, 2].map(i => `<td class="n">${fmt(s.sekolah.genang[i])}</td>`).join("")}</tr>
        <tr><td>Faskes tergenang</td>${[0, 1, 2].map(i => `<td class="n">${fmt(s.faskes.genang[i])}</td>`).join("")}</tr></tbody></table>
      <p class="sc-cat">${h.ens ? `Pita dari ansambel ECMWF 51 anggota, batas lebar: kuantil harian dijumlahkan, seolah anggota sama tinggi tiap hari; ${h.sk.hariAda} dari ${h.nd} hari prakiraan tercakup ansambel, sisanya pitanya sama dengan prakiraan.` : "Berkas ansambel tidak terbaca, jadi tidak ada pita."} Limpasan SCS-CN dengan CN tunggal; DEM Terrarium kira-kira 2,4 km per piksel hanya dipakai untuk elevasi dan lereng ambang, jadi dataran rendah pesisir terbaca kasar.${ada ? ` Prakiraan tanpa skenario: ${jt(a.genang[1])} jiwa.` : ""}</p>`);
    if (ada && K.vor) html += kartu("siklon", "Gelombang badai", h.surge.length ? `Pelabuhan dengan kenaikan air laut tertinggi dari ${esc(K.vor.nama)}: ${esc(h.surge[0].nama)}, ${f1(h.surge[0].m)} m.` : "Tidak ada pelabuhan yang naik lebih dari 5 cm pada skenario ini.",
      h.surge.length ? `<table class="sc-tb"><thead><tr><th>Pelabuhan</th><th class="n">Naik (m)</th><th class="n">Puncak</th></tr></thead><tbody>${h.surge.slice(0, 6).map(x => `<tr><td>${esc(x.nama)}<small>${esc(K.namaProv[x.prov] || "")}</small></td><td class="n">${f1(x.m)}</td><td class="n">${C.teksWaktu(S.jam0 + x.jam * 36e5).replace(" WIB", "")}</td></tr>`).join("")}</tbody></table>
        <p class="sc-cat">Jiwa di dataran rendah dalam ${fmt(D.PARAM.pesisir_km[0])} km dari pelabuhan itu dan lebih rendah dari kenaikan air: ${jt(s.pesisir)}. Perkiraan atas: tanpa batimetri, arah angin, dan pasang.</p>` : "");
    else html += kartu("siklon", "Gelombang badai", "Nyalakan siklon di tab Skenario untuk menghitung kenaikan air laut di pelabuhan.");
    const kp = ada ? h.kapal0 : null;
    html += kartu("kapal", "Batas operasi kapal", "Titik perairan dan jam yang melewati batas tiap kelas kapal (gelombang atau angin).",
      `<table class="sc-tb"><thead><tr><th>Kelas</th><th class="n">Titik</th><th class="n">Jam</th></tr></thead><tbody>${h.kapal.map((k, i) => `<tr><td>${esc(k.nama)}<span class="m">≥ ${fmt(k.hs)} m atau ${fmt(k.kt)} knot</span></td><td class="n">${fmt(k.titik)}${kp ? `<span class="m">prakiraan ${fmt(kp[i].titik)}</span>` : ""}</td><td class="n">${fmt(k.jam)}${kp ? `<span class="m">prakiraan ${fmt(kp[i].jam)}</span>` : ""}</td></tr>`).join("")}</tbody></table>
      <p class="sc-cat">Dari ${fmt(h.kapal[0].total)} titik gelombang. Batas adalah hipotesis kami, belum dicek ke dokumen BMKG Maritim.</p>`);
    /* uji balik: prakiraan 1 hari pada kejadian DIBI */
    const L = h.ver?.kita?.lead?.["1"], n = L ? L.a + L.c : 0;
    html += kartu("info", "Seberapa bisa dipercaya", L ? `Pada uji balik ${fmt(h.ver.kita.n_hari)} hari, prakiraan 1 hari sebelumnya menangkap ${fmt(L.a)} dari ${fmt(n)} provinsi-hari ber-kejadian DIBI (${fmt(Math.round(L.pod * 1000) / 10)}%).` : "Uji balik tidak terbaca, jadi tidak ada tolok ukur.",
      L ? `<p class="sc-cat">Alarm palsu ${fmt(Math.round(L.far * 100))}%. DIBI hanya memuat kejadian yang dilaporkan dan titik sampel jarang, jadi angka ini batas bawah. Baca pita p10 sampai p90 sebagai sebaran ansambel, bukan peluang kejadian nyata berada di dalamnya.</p>` : "");
    /* peringkat tindakan */
    const pr = D.perlakuan(s, h.uang), b0 = x => x == null ? "–" : fmt(Math.round(x)), rg = x => x.bcrRendah != null ? `${b0(x.bcrRendah)} sampai ${b0(x.bcrTinggi)}` : "";
    const sel = x => x.bcr != null ? `<b>${b0(x.bcr)}</b><span class="m">${rg(x)}</span>` : x.bcrRendah != null ? `${rg(x)}<span class="m">tanpa angka tunggal${x.tumpang ? "; rentangnya menimpa pangkas pohon, urutan tidak bermakna" : ""}</span>` : "–";
    html += kartu("atur", "Peringkat tindakan", pr.length ? `Tiap tindakan dijalankan pada hasil model di atas. Hanya yang punya dasar hitung diurut menurut manfaat dibagi biaya.` : "Tidak ada zona berisiko pada hasil ini, jadi tidak ada tindakan yang diperingkat.",
      pr.length ? `<table class="sc-tb"><thead><tr><th>Tindakan</th><th class="n">Jiwa di zona</th><th class="n">Biaya</th><th class="n">Manfaat / biaya</th></tr></thead><tbody>${pr.map(x => `<tr><td>${esc(x.nama)}<span class="m">${esc(x.catatan)}</span></td><td class="n">${jt(x.jiwa)}</td><td class="n">${rp(x.biaya)}</td><td class="n">${sel(x)}</td></tr>`).join("")}</tbody></table>
        <p class="sc-cat">${h.uang ? "Rp: stimulan perbaikan rumah, nilai nyawa statistik, dan biaya pengungsi dari param_banjir.json (bersumber). Rentang memakai batas bawah dan atas semua parameter, termasuk nilai nyawa rendah dan tinggi. Manfaat evakuasi bergantung peluang meninggal yang tidak punya sumber, jadi hanya rentang yang ditampilkan." : "Parameter uang tidak terbaca, jadi Rp tidak dihitung."} Penutupan pelabuhan, bandara, dan melaut ada di tab Dampak.</p>` : "");
    html += kartu("buku", "Asumsi", "", `<details class="sc-asumsi"><summary>Lihat asumsi</summary><ul>${Object.entries(D.PARAM).map(([k, v]) => `<li><b>${esc(v[3])}</b>: ${fmt(v[0])} (rentang ${fmt(v[1])} sampai ${fmt(v[2])}). ${esc(v[4])}</li>`).join("")}
      <li>Kurva kerapuhan: bentuk lognormal P = Φ(ln(v/median)/β), FEMA HAZUS-MH Hurricane. Limpasan: USDA-NRCS TR-55, koreksi lereng Sharpley dan Williams (1990). Tekanan pusat: Atkinson dan Holliday (1977). Profil tekanan dan angin: Holland (1980).</li>
      <li>Embusan memakai kolom embusan prakiraan; di bawah siklon skenario diambil yang lebih besar dari embusan prakiraan dan angin Holland.</li></ul></details>`);
    document.getElementById("t-model").innerHTML = html;
    document.getElementById("mdGenting").onclick = () => { let b = 0, bh = 0; K.F1.forEach((fr, i) => { const r = SC.ringkas(fr), v = r.embus / 54 + r.hujan / 20; if (v > b) { b = v; bh = i; } }); S.t = bh; S.main = false; C.jadwal(true); };
  }
  function buka() { if (R.tab !== "model" || !S.M) return; if (!K.skn) { render(); return; } if (R.kotor && !R.jalan) { render(); hitungSemua(); } else if (!R.hasil && !R.jalan) hitungSemua(); else render(); }
  document.addEventListener("sim-tab", e => { R.tab = e.detail; buka(); });
  document.addEventListener("sim-hitung", () => { R.kotor = true; R.hasil = null; if (R.tab === "model") { R.gen++; R.jalan = false; clearTimeout(R.t); R.t = setTimeout(buka, 300); } });
  window.SimModel = {R, hitungSemua};
})();
