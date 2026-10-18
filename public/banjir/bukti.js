"use strict";
/* Bukti DAS hulu (public/banjir/laporan-das.html). Data: public/banjir/data/bukti/{index,<slug>}.json dari scripts/banjir/bukti_das.py
   dan citra_banjir.py. Dimuat juga oleh public/banjir/index.html: di sana tidak ada #bkIsi, jadi tidak melakukan apa pun. */
(() => {
  const akar = document.getElementById("bkIsi");
  if (!akar) return;
  const DIR = "/banjir/data/bukti/";
  const cache = new Map();
  let IDX = null, peta = null, aktif = null, tabCitra = "s2", penanda = [];
  const elPeta = document.createElement("div"); elPeta.className = "kn-peta bk-peta"; elPeta.id = "bkPeta";
  /* dua rAF + setTimeout (paint dulu, baru kerja berat), dengan jaring 120 ms bila rAF tertahan (tab latar) */
  const nanti = f => { let jalan = false; const g = () => { if (!jalan) { jalan = true; f(); } };
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(g))); setTimeout(g, 120); };
  const nm = s => `<span translate="no">${esc(s)}</span>`;
  const r1 = v => v == null ? "–" : fmt(Math.round(v * 10) / 10);
  const pct = (a, b) => a > 0 && b != null ? r1(100 * b / a) + "%" : "–";
  /* hektare: di bawah 10 ha masih derau cuplikan 120 m, jadi diberi "~" */
  const ha = v => v == null ? "–" : v > 0 && v < 10 ? "~" + fmt(Math.round(v)) : fmt(v);
  const tgl = s => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const rentang = h => { const [a, b] = h.map(s => new Date(s + "T00:00:00Z")); return a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()} s.d. ${b.getUTCDate()} ${BLN[b.getUTCMonth()]}` : `${a.getUTCDate()} ${BLN[a.getUTCMonth()]} s.d. ${b.getUTCDate()} ${BLN[b.getUTCMonth()]}`; };
  const JN = {sawit: "Sawit", hti: "HTI", hph: "HPH", tambang: "Tambang", semua: "Semua konsesi"};
  const CATATAN = "Hilang = kehilangan kanopi 30% atau lebih dari sebab apa pun (panen HTI/sawit, kebakaran, longsor), bukan deforestasi permanen; pertumbuhan kembali tidak dihitung dan batas konsesi adalah yang terakhir.";
  const sumber = t => `<p class="bk-sumber">Sumber: ${t}</p>`;

  const muat = slug => {
    if (!cache.has(slug)) cache.set(slug, fetch(`${DIR}${slug}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { cache.delete(slug); throw e; }));
    return cache.get(slug);
  };

  /* satu kalimat jujur; angka r hanya di RISET-BUKTI.md dan Metode */
  function kataKorelasi(k) {
    if (!k.bisa) return "Kejadian banjir tercatat terlalu sedikit (kurang dari 30 kejadian atau kurang dari 8 tahun berkejadian) untuk dibandingkan dengan hutan hilang.";
    const cat = `${k.n} titik, kedua deret naik dan pencatatan DIBI membaik`;
    if (Math.abs(k.r) < k.r_kritis) return `Per tahun, hutan hilang dan kejadian banjir tidak dapat dibedakan dari kebetulan (${cat}), dan itu bukan bukti sebab-akibat.`;
    const sel = k.r_selisih != null && Math.abs(k.r_selisih) >= k.r_kritis ? "juga pada selisih tahunan" : "tetapi tidak pada selisih tahunan";
    return `Per tahun, hutan hilang dan kejadian banjir bergerak ${k.r >= 0 ? "searah" : "berlawanan arah"}, ${sel} (${cat}), jadi belum membuktikan sebab-akibat.`;
  }

  function grafik(d) {
    const W = 640, H = 230, L = 46, R = 40, T = 14, B = 26;
    const th = Array.from({length: 25}, (_, i) => 2001 + i), kj = d.kejadian;
    const maksH = Math.max(1, ...th.map(y => d.hutan.tahun[y] || 0));
    const maksK = Math.max(1, ...Object.values(kj));
    const x = y => L + (y - 2001 + .5) * (W - L - R) / 25, lb = (W - L - R) / 25 * .66;
    const yh = v => T + (H - T - B) * (1 - v / maksH), yk = v => T + (H - T - B) * (1 - v / maksK);
    const bar = th.map(y => { const v = d.hutan.tahun[y] || 0; return `<rect x="${x(y) - lb / 2}" y="${yh(v)}" width="${lb}" height="${H - B - yh(v)}" rx="1.5" fill="var(--bad,#c9503a)" opacity=".75"><title>${y}: ${ha(v)} ha hutan hilang</title></rect>`; }).join("");
    const ky = Object.keys(kj).map(Number).filter(y => y >= 2001).sort();   // hanya tahun yang ada catatannya, tidak diisi 0
    const cat = y => y === 2024 ? " (pencatatan 2024 tidak lengkap)" : y === 2025 ? " (pencatatan 2025 melonjak)" : "";
    const gar = ky.map(y => `${x(y)},${yk(kj[y])}`).join(" ");
    const dot = ky.map(y => `<circle cx="${x(y)}" cy="${yk(kj[y])}" r="3" fill="var(--brand,#1e5fa8)"><title>${y}: ${fmt(kj[y])} kejadian banjir${cat(y)}</title></circle>`).join("");
    const sumbuX = [2001, 2005, 2010, 2015, 2020, 2025].map(y => `<text x="${x(y)}" y="${H - 8}" text-anchor="middle">${y}</text>`).join("");
    const tik = (m, f, sisi) => [0, .5, 1].map(p => `<text x="${sisi === "k" ? L - 6 : W - R + 6}" y="${f(m * p) + 4}" text-anchor="${sisi === "k" ? "end" : "start"}">${fmt(Math.round(m * p))}</text>`).join("");
    return `<svg class="bk-graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hutan hilang per tahun dan kejadian banjir per tahun">
      <line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="var(--line)"/>${bar}<polyline points="${gar}" fill="none" stroke="var(--brand,#1e5fa8)" stroke-width="2"/>${dot}${sumbuX}${tik(maksH, yh, "k")}${tik(maksK, yk, "r")}</svg>
      <div class="kn-leg"><span><i class="bk-sw" style="background:var(--bad,#c9503a)"></i>Hutan hilang (ha, sumbu kiri)</span><span><i class="bk-sw bk-sw-g"></i>Kejadian banjir DIBI (sumbu kanan)</span></div>`;
  }

  function tabelKonsesi(d) {
    const k = d.konsesi, ada = k.semua.luas_ha > 0;
    const baris = ada ? ["semua", ...["sawit", "hti", "hph", "tambang"].filter(j => k[j].luas_ha > 0)] : ["semua"];
    const sel = (j, f) => ada ? ha(k[j][f]) : "–";
    const rj = baris.map(j => `<tr${j === "semua" ? ' class="kn-tot"' : ""}><td>${JN[j]}</td><td class="r">${ada ? fmt(k[j].n) : "–"}</td><td class="r">${sel(j, "luas_ha")}</td><td class="r">${sel(j, "hutan_ha")}</td><td class="r">${sel(j, "hilang_ha")}</td></tr>`).join("");
    const top = d.konsesi_top.map(t => `<tr><td>${nm(t.nama)}<small>${nm(t.kab)}</small></td><td>${JN[t.jenis]}</td><td class="r">${ha(t.luas_ha)}</td><td class="r">${ha(t.hilang_ha)}</td></tr>`).join("");
    return `<div class="tw"><table class="kn-tb"><thead><tr><th>Jenis</th><th class="r">Blok</th><th class="r">Luas di hulu (ha)</th><th class="r">Hutan 2000 (ha)</th><th class="r">Hilang 2001 s.d. 2025 (ha)</th></tr></thead><tbody>${rj}</tbody></table></div>
      ${top ? `<h3>Terluas di hulu</h3><div class="tw"><table class="kn-tb"><thead><tr><th>Konsesi</th><th>Jenis</th><th class="r">Luas di hulu (ha)</th><th class="r">Hilang (ha)</th></tr></thead><tbody>${top}</tbody></table></div>` : ""}`;
  }

  function geserCitra(w) {
    const s = w.querySelector("input"), a = w.querySelector(".bk-sebelum");
    const pasang = () => { a.style.clipPath = `inset(0 ${100 - s.value}% 0 0)`; w.querySelector(".bk-garis").style.left = s.value + "%"; };
    s.addEventListener("input", pasang); pasang();
  }

  function citraHtml(d) {
    const c = d.citra || {}, ada = ["s2", "s1"].filter(k => c[k]);
    if (!ada.length) return `<p class="bk-ket">Belum ada citra yang memenuhi syarat untuk daerah ini.</p>`;
    if (!ada.includes(tabCitra)) tabCitra = ada[0];
    const x = c[tabCitra];
    const seg = `<div class="seg penuh" data-grup="citra">${ada.map(k => `<button data-v="${k}" aria-pressed="${k === tabCitra}">${k === "s2" ? "Tutupan hulu" : "Radar: piksel menggelap"}</button>`).join("")}</div>`;
    const ket = tabCitra === "s2"
      ? `Sentinel-2, kotak 12 km di sel hutan hilang terbanyak sejak 2021 di DAS; geser untuk membandingkan.`
      : `Sentinel-1 VV, kotak 16 km di sekitar kecamatan ${nm(d.keluaran.kec)} pada banjir ${tgl(x.kejadian.tanggal)}: ${x.gelap_baru_persen > 0 ? `${r1(x.gelap_baru_persen)}% piksel menggelap (bisa air, sawah atau tambak berair)` : "tidak ada piksel yang menggelap jauh"}, ${fmt(x.sah_persen)}% kotak terbaca, dan ${fmt(x.kejadian.terdampak)} warga terdampak berlaku untuk seluruh kabupaten.`;
    const sum = tabCitra === "s2" ? d.sumber.citra : `${d.sumber.citra}; warga terdampak: DIBI/BNPB`;
    return `${seg}<p class="bk-ket">${ket}</p><div class="bk-geser">
      <img class="bk-sesudah" src="${DIR}${x.sesudah.berkas}" alt="Sesudah" decoding="async">
      <img class="bk-sebelum" src="${DIR}${x.sebelum.berkas}" alt="Sebelum" decoding="async">
      <i class="bk-garis"></i><span class="bk-lb bk-lb-a">Sebelum ${tgl(x.sebelum.tgl)}</span><span class="bk-lb bk-lb-b">Sesudah ${tgl(x.sesudah.tgl)}</span>
      <input type="range" min="0" max="100" value="50" aria-label="Geser sebelum dan sesudah"></div>${sumber(sum)}`;
  }

  const bagianCitra = d => `<span class="bk-pil">Citra satelit</span><h2>Sebelum dan sesudah</h2>${citraHtml(d)}`;

  function detail(d) {
    const h = d.hutan, k = d.konsesi, das = d.das;
    const chip = [das.persen_kab != null ? `${r1(das.persen_kab)}% DAS di dalam kabupaten` : "",
      ...(das.memuat || []).map(n => `Memuat DAS ${n}`), ...(das.bagian_dari || []).map(n => `Bagian dari DAS ${n}`)].filter(Boolean).map(t => `<span class="bk-pil bk-pil-n">${nm(t)}</span>`).join("");
    const siaga = d.status.level >= 2 ? `<span class="bk-pil bk-pil-s">Siaga/Awas ${rentang(d.status.hari)}</span>` : "";
    const kJudul = k.semua.luas_ha > 0 ? `${ha(k.semua.luas_ha)} ha konsesi, ${ha(k.semua.hilang_ha)} ha hutan hilang di dalamnya` : "Belum ada konsesi tercatat di hulu";
    const kKet = k.lengkap === null ? "Data konsesi belum lengkap, jadi 0 ha tercatat tidak berarti tidak ada konsesi."
      : "Dipotong ke batas DAS; data konsesi belum lengkap dan berada di hulu tidak berarti penyebab banjir.";
    return `<article class="kn-kartu bk-d" id="bkD">
      <div class="kn-ph"><div class="kn-ph-t"><b>${nm(d.kab)} <small>${nm(d.prov_nama)}</small></b></div>${siaga}</div>
      <section class="bk-k"><span class="bk-pil">Batas DAS</span><h2>${fmt(das.luas_km2)} km² di hulu ${nm(d.keluaran.kec)}</h2>
        <p class="bk-ket">Gabungan ${fmt(das.n_subdas)} sub-DAS yang mengalir ke sub-DAS terbesar (di bawah 25.000 km²) yang memuat pusat kecamatan di kabupaten ini, jadi bukan titik banjir persisnya.</p>
        ${chip ? `<div class="bk-chip">${chip}</div>` : ""}<div id="bkPetaSlot"></div>${sumber(d.sumber.das)}</section>
      <section class="bk-k"><span class="bk-pil">Hutan hilang</span><h2>${ha(h.hilang_ha)} ha hilang 2001 s.d. 2025 (${pct(h.awal_ha, h.hilang_ha)} hutan tahun 2000)</h2><p class="bk-ket">${kataKorelasi(d.korelasi)}</p>${grafik(d)}
        ${sumber(`${d.sumber.hutan}; kejadian ${d.sumber.kejadian}. ${CATATAN}`)}</section>
      <section class="bk-k"><span class="bk-pil">Konsesi di hulu</span><h2>${kJudul}</h2><p class="bk-ket">${kKet}</p>${tabelKonsesi(d)}
        ${sumber(`${d.sumber.konsesi}. ${CATATAN}`)}</section>
      <section class="bk-k" id="bkCitra">${bagianCitra(d)}</section>
    </article>`;
  }

  function gambarPeta(d) {
    if (typeof maplibregl === "undefined") return;
    const [x0, y0, x1, y1] = d.das.bbox, feat = {type: "Feature", geometry: d.das.geom, properties: {}};
    penanda.forEach(m => m.remove()); penanda = [];
    const tanda = () => {
      penanda.push(new maplibregl.Marker({color: "#1e5fa8"}).setLngLat([d.keluaran.lon, d.keluaran.lat]).setPopup(new maplibregl.Popup().setHTML("Titik keluaran: kecamatan " + nm(d.keluaran.kec))).addTo(peta));
      if (d.titik_hilang) penanda.push(new maplibregl.Marker({color: "#c9503a"}).setLngLat([d.titik_hilang[1], d.titik_hilang[0]]).setPopup(new maplibregl.Popup().setText("Sel hutan hilang terbanyak sejak 2021")).addTo(peta));
    };
    if (peta) {   // satu instance dipakai ulang: ganti data lalu zoom ke DAS baru
      peta.resize(); peta.getSource("p").setData(feat); peta.fitBounds([[x0, y0], [x1, y1]], {padding: 24, duration: 0}); tanda(); return;
    }
    peta = new maplibregl.Map({container: elPeta, bounds: [[x0, y0], [x1, y1]], fitBoundsOptions: {padding: 24}, attributionControl: {compact: true},
      style: {version: 8, sources: {d: {type: "raster", tileSize: 256, maxzoom: 18, attribution: "Citra © Esri, Maxar, Earthstar", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"]},
        p: {type: "geojson", data: feat}},
        layers: [{id: "d", type: "raster", source: "d"}, {id: "pf", type: "fill", source: "p", paint: {"fill-color": "#00e5ff", "fill-opacity": .1}}, {id: "pl", type: "line", source: "p", paint: {"line-color": "#00e5ff", "line-width": 2.2}}]}});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}));
    peta.on("load", tanda);
  }

  function tampil(slug) {
    aktif = slug;
    muat(slug).then(d => {
      if (aktif !== slug) return;
      const w = document.getElementById("bkDetail");
      w.innerHTML = detail(d);
      document.getElementById("bkPetaSlot").replaceWith(elPeta);
      const g = w.querySelector(".bk-geser"); if (g) geserCitra(g);
      nanti(() => gambarPeta(d));
    }).catch(() => { document.getElementById("bkDetail").innerHTML = `<div class="kosong">Data daerah ini belum tersedia.</div>`; });
  }

  function tabelDaftar(es, kolom) {
    const baris = es.map(e => `<tr><td><button type="button" class="bk-baris" data-slug="${e.slug}" aria-pressed="false">${nm(e.kab)}</button><small>${nm(e.prov_nama)}</small></td>
      <td class="r">${fmt(e.luas_km2)}</td><td class="r">${ha(e.hilang_ha)}</td><td class="r">${pct(e.hutan_awal_ha, e.hilang_ha)}</td><td class="r">${e.konsesi_ha > 0 ? ha(e.konsesi_ha) : "–"}</td><td class="r">${kolom(e)}</td></tr>`).join("");
    return `<div class="tw"><table class="kn-tb bk-tb"><thead><tr><th>Daerah</th><th class="r">DAS hulu (km²)</th><th class="r">Hilang 2001 s.d. 2025 (ha)</th><th class="r">% hutan 2000</th><th class="r">Konsesi (ha)</th><th class="r">${kolom.judul}</th></tr></thead><tbody>${baris}</tbody></table></div>`;
  }

  function daftar(idx) {
    const lang = idx.daerah.filter(e => e.golongan !== "siaga"), sg = idx.daerah.filter(e => e.golongan === "siaga");
    const kL = e => fmt(e.kejadian); kL.judul = "Kejadian DIBI 2010 s.d. 2023";
    const kS = () => "Siaga/Awas"; kS.judul = "Status";
    const src = `${idx.sumber.das}; ${idx.sumber.hutan}; ${idx.sumber.kejadian}`;
    return `<div class="kn-kartu"><span class="bk-pil">Langganan banjir</span><h2>${fmt(lang.length)} daerah dengan kejadian banjir terbanyak</h2><p class="bk-ket">Menurut kejadian DIBI 2010 s.d. 2023 per kabupaten, paling banyak 2 per provinsi dan 4 untuk seluruh Jawa.</p>${tabelDaftar(lang, kL)}${sumber(src)}</div>
      ${sg.length ? `<div class="kn-kartu"><span class="bk-pil bk-pil-s">Siaga/Awas ${rentang(idx.status_hari)}</span><h2>${fmt(sg.length)} daerah berstatus Siaga atau Awas</h2><p class="bk-ket">Menurut status kecamatan di Peta banjir pada rentang itu, bukan daftar langganan.</p>${tabelDaftar(sg, kS)}${sumber(src)}</div>` : ""}<div id="bkDetail"></div>`;
  }

  fetch(DIR + "index.json").then(r => r.json()).then(idx => {
    IDX = idx;
    document.getElementById("bkPils").innerHTML = `<span class="lp-pil">Hansen v1.13</span><span class="lp-pil">HydroBASINS</span><span class="lp-pil ok">${fmt(idx.daerah.length)} daerah</span>`;
    akar.innerHTML = daftar(idx);
    const tandai = slug => document.querySelectorAll(".bk-baris").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.slug === slug)));
    akar.addEventListener("click", e => {
      const b = e.target.closest(".bk-baris");
      if (b) { const s = b.dataset.slug; tandai(s); nanti(() => { history.replaceState(null, "", "#" + s); tampil(s); }); return; }
      const t = e.target.closest('[data-grup="citra"] button'); if (t) {
        tabCitra = t.dataset.v;
        t.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === t)));   // umpan balik langsung
        muat(aktif).then(d => { const c = d.citra?.[tabCitra]; if (c) ["sebelum", "sesudah"].forEach(n => { new Image().src = DIR + c[n].berkas; });   // prapemuat
          nanti(() => { const w = document.getElementById("bkCitra"); w.innerHTML = bagianCitra(d); const g = w.querySelector(".bk-geser"); if (g) geserCitra(g); }); });
      }
    });
    const awal = idx.daerah.find(e => e.slug === location.hash.slice(1)) || idx.daerah.find(e => e.citra) || idx.daerah[0];
    if (awal) { tandai(awal.slug); tampil(awal.slug); }
  }).catch(() => { akar.innerHTML = `<div class="kosong">Data bukti belum tersedia.</div>`; });

  document.getElementById("tema")?.addEventListener("click", () => { const d = document.documentElement, t = d.dataset.theme === "dark" ? "light" : "dark"; d.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {} });
})();
