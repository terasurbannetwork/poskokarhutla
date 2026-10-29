"use strict";
/* Profil wilayah kab/kota (public/inti): dialog bersama karhutla dan banjir. Data: /data/wilayah/NN.json (scripts/umum/profil_wilayah.py).
   Terbuka lewat ProfilWilayah.buka(kode4) / bukaNama(prov, kab), klik [data-profil="kode"], atau tombol yang disisipkan sendiri di kepala #laci
   (kartu kab banjir, kecamatan banjir, cluster karhutla). Mandiri: tidak butuh format.js/tip.js. */
const ProfilWilayah = (() => {
  const SRC = document.currentScript?.src || "/inti/profil_wilayah.js", DATA = new URL("../data/wilayah/", SRC).href;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const fmt = (n, d = 0) => Number(n).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
  const juta = n => n >= 1e6 ? fmt(n / 1e6, 1) + " jt" : n >= 1e3 ? fmt(n / 1e3, 1) + " rb" : fmt(n);
  const aman = u => /^https?:\/\//i.test(u || "") ? esc(u) : "";
  const norm = s => (s || "").toLowerCase().trim().replace(/^(kab\.?|kabupaten|kota|adm\.?|administrasi)\s+/, "").replace(/[^a-z0-9]/g, "");
  const IK = {
    risiko: "M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Zm0 6v4m0 3h.01",
    regulasi: "M6 3h9l4 4v14H6V3Zm8 0v5h5M9 13h7M9 17h7",
    paparan: "M16 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM6 20c0-3 3-5 7-5s7 2 7 5M5 9a2.5 2.5 0 1 1 0-.1",
    bpbd: "M5 4h14v16H5V4Zm4 4h6M9 12h6M9 16h3",
    riwayat: "M12 7v5l3 2M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4",
    tutup: "M6 6l12 12M18 6 6 18", ya: "m5 12 5 5 9-10", tdk: "M6 6l12 12M18 6 6 18", tel: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
    surel: "M3 6h18v12H3V6Zm0 0 9 7 9-7", web: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18", pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
  };
  const ik = k => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IK[k]}"/></svg>`;
  const BHY = {banjir: "Banjir", gempabumi: "Gempa bumi", tsunami: "Tsunami", longsor: "Tanah longsor", gunungapi: "Gunung api", kekeringan: "Kekeringan", karlahut: "Karhutla", cuaca_ekstrem: "Cuaca ekstrem", abrasi: "Abrasi"};
  const JNS = {EQ: "Gempa bumi", FL: "Banjir", WF: "Kebakaran hutan", VO: "Gunung api", TC: "Siklon", DR: "Kekeringan", Earthquake: "Gempa bumi", Tsunami: "Tsunami", Flood: "Banjir", Wildfire: "Kebakaran hutan", Volcano: "Gunung api"};
  const JENIS_REG = {rpb: "RPB", renkon: "Renkon", perda: "Perda", perkada: "Perkada"};
  const ALERT = {Red: "Merah", Orange: "Oranye", Green: "Hijau"};
  let indeks = null, cache = {}, dlg, tip;

  const muat = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
  const muatIndeks = () => indeks || (indeks = muat(DATA + "indeks.json"));
  const muatProv = pr => cache[pr] || (cache[pr] = muat(DATA + pr + ".json"));

  /* nama (+ kode atau nama provinsi) -> kode BPS 4 digit; kembar kab/kota dibedakan awalan "Kota" */
  async function cari(prov, kab) {
    const I = await muatIndeks(), n = norm(kab), kota = /^kota\b/i.test((kab || "").trim());
    let c = Object.keys(I).filter(k => norm(I[k][1]) === n);
    if (prov) { const p = String(prov), f = c.filter(k => /^\d+$/.test(p) ? k.startsWith(p) : norm(I[k][0]) === norm(p)); if (f.length) c = f; }
    if (c.length > 1) { const f = c.filter(k => /^kota\b/i.test(I[k][1]) === kota); if (f.length) c = f; }
    return c[0] || null;
  }

  const k = (eyebrow, ikon, kalimat, isi, kaki = "") => `<section class="pw-k"><span class="pw-ey">${ik(ikon)}${eyebrow}</span><p class="pw-t">${kalimat}</p>${isi}${kaki ? `<p class="pw-ft">${kaki}</p>` : ""}</section>`;
  const o = t => `<b class="pw-o">${t}</b>`;
  const pil = (t, kls = "", tip = "") => `<span class="pw-pil ${kls}"${tip ? ` data-tip="${esc(tip)}" tabindex="0"` : ""}>${t}</span>`;

  /* 1. risiko IRBI: garis skor 2015-2024 dan titik 2025 terpisah (skala baru, ambang 176 bukan 144) */
  function risiko(d, nama) {
    const r = d.ir; if (!r || !r.y.length) return "";
    const n = r.y.length, i25 = r.y.indexOf(2025), lama = r.y.map((y, i) => i).filter(i => r.y[i] < 2025);
    const W = 330, H = 150, L = 30, R = 10, T = 14, B = 24, xs = i => lama.includes(i) ? L + (W - L - R - 46) * lama.indexOf(i) / Math.max(1, lama.length - 1) : W - R - 14;
    const sn = r.s, ls = lama.map(i => r.s[i]), lo = Math.min(...ls), hi = Math.max(...ls), pad = Math.max(4, (hi - lo) * .12), a = lo - pad, b = hi + pad, ys = v => v == null ? (T + H - B) / 2 : T + (H - T - B) * (1 - (v - a) / (b - a));
    const warna = i => r.k[i] ? "#c9503a" : "#d29a2b", ambang = (v, x1, x2) => v >= a && v <= b ? `<line x1="${x1.toFixed(1)}" x2="${x2.toFixed(1)}" y1="${ys(v).toFixed(1)}" y2="${ys(v).toFixed(1)}" class="pw-amb"/>` : "";
    const garis = lama.map(i => `${xs(i).toFixed(1)},${ys(sn[i]).toFixed(1)}`).join(" "), xb = (xs(lama.at(-1)) + xs(i25 >= 0 ? i25 : lama.at(-1))) / 2;
    const yt = [b, (a + b) / 2, a].map(v => `<text x="${L - 5}" y="${ys(v) + 3}" text-anchor="end" class="pw-ax">${fmt(v)}</text>`).join("");
    const xt = r.y.map((y, i) => (i % 2 === 0 || y === 2025) ? `<text x="${xs(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="pw-ax">${y}</text>` : "").join("");
    const titik = r.y.map((y, i) => `<circle cx="${xs(i).toFixed(1)}" cy="${ys(y === 2025 ? null : sn[i]).toFixed(1)}" r="${y === 2025 ? 5 : 3.6}" fill="${warna(i)}" stroke="var(--card)" stroke-width="1.5"/>${y === 2025 ? `<text x="${xs(i).toFixed(1)}" y="${(ys(null) - 10).toFixed(1)}" text-anchor="middle" class="pw-ax pw-axb">${fmt(r.s[i], 1)}</text>` : ""}`).join("");
    const kol = r.y.map((y, i) => `<rect x="${(xs(i) - 12).toFixed(1)}" y="${T}" width="24" height="${H - T - B}" fill="transparent" data-tip="${esc(`<b>${y}</b><br>Skor: ${fmt(r.s[i], 1)}<br>Kelas: ${r.k[i] ? "Tinggi" : "Sedang"}${y === 2025 ? "<br>Skala baru, ambang kelas 176" : "<br>Ambang kelas 144"}`)}"/>`).join("");
    const svg = `<svg class="pw-g" viewBox="0 0 ${W} ${H}" role="img" aria-label="Skor risiko ${esc(nama)} 2015 sampai 2025">${yt}${xt}${ambang(144, L, i25 >= 0 ? xb - 6 : W - R)}${i25 >= 0 ? ambang(144, xb + 6, W - R) : ""}
      ${i25 >= 0 ? `<line x1="${xb}" x2="${xb}" y1="${T - 4}" y2="${H - B}" class="pw-brk"/><text x="${xb}" y="${T - 5}" text-anchor="middle" class="pw-ax pw-axb">skala baru</text>` : ""}
      <polyline points="${garis}" fill="none" stroke="var(--brand2)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${titik}${kol}</svg>`;
    const s = i25 >= 0 ? i25 : n - 1, kelas = r.k[s] ? "Tinggi" : "Sedang", th = r.y[s], i24 = r.y.indexOf(2024);
    const kal = `Risiko bencana ${esc(nama)} masuk kelas ${o(kelas)} pada ${th} dengan skor ${o(fmt(r.s[s], 1))}${i25 >= 0 && i24 >= 0 ? ` (2024: ${fmt(r.s[i24], 1)} pada skala lama)` : ""}.`;
    const bh = Object.entries(r.b || {}).sort((x, y) => y[1] - x[1]), mx = bh[0]?.[1] || 1;
    const pills = bh.map(([h, v], i) => pil(`${esc(BHY[h] || h)} <b>${fmt(v, v % 1 ? 1 : 0)}</b>`, v >= mx * .85 ? "pw-t1" : "", `${BHY[h] || h}: ${fmt(v, v % 1 ? 1 : 0)} (peringkat ${i + 1} dari ${bh.length} bahaya)`)).join("");
    return k("Risiko IRBI 2015-2025", "risiko", kal, `<div class="pw-pils">${pil("skala baru 2025", "pw-info", "2025 memakai skala dan ambang kelas berbeda (176 dibanding 144), jadi tidak ditarik tren menerus.")}${pil("Tinggi", "pw-hi")}${pil("Sedang", "pw-md")}</div>${svg}
      ${bh.length ? `<p class="pw-sub">Rincian ${th} per bahaya, nilai makin besar makin tinggi</p><div class="pw-pils">${pills}</div>` : ""}`,
      `Sumber: InaRISK BNPB (bukan data terbuka). Kelas 2015-2020 dan 2022 diturunkan dari ambang 144; 2021, 2023, 2024 dan 2025 mengikuti kelas resmi. Garis putus = ambang kelas Tinggi (144; 176 pada 2025). Titik 2025 sengaja tidak diletakkan pada sumbu skor lama dan tidak disambung garis.`);
  }

  /* 2. regulasi */
  function regulasi(d) {
    const g = d.rg; if (!g) return "";
    const st = [["Perda PB", g.pb], ["Perda BPBD", g.bp], ["RPB", g.rp], ["Renkon", g.rk]], ada = st.filter(x => x[1]).length;
    const kal = g.n ? `${o(fmt(g.n))} dokumen peraturan kebencanaan tercatat, ${ada ? `${ada} dari 4 dokumen pokok sudah ada` : "dokumen pokok belum ada satu pun"}.` : `Belum ada dokumen peraturan kebencanaan yang tercatat untuk wilayah ini.`;
    const pills = st.map(([t, v]) => pil(`${ik(v ? "ya" : "tdk")}${t}`, v ? "pw-ok" : "pw-no", `${t}: ${v ? "ada" : "belum tercatat"}`)).join("");
    const dr = g.dr ? `<p class="pw-baris"><b>Status darurat terakhir</b> ${g.dr[0]}${g.dr[1] ? `, nomor ${esc(g.dr[1])}` : ""}: ${aman(g.dr[3]) ? `<a href="${aman(g.dr[3])}" target="_blank" rel="noopener">${esc(g.dr[2])}</a>` : esc(g.dr[2])}</p>` : "";
    const dok = (g.d || []).map(x => `<li>${pil(JENIS_REG[x[0]] || esc(x[0]))}<span>${aman(x[4]) ? `<a href="${aman(x[4])}" target="_blank" rel="noopener">${esc(x[3])}</a>` : esc(x[3])}${x[1] || x[2] ? `<small>${x[1] ? "Nomor " + esc(x[1]) + ", " : ""}${esc(x[2] || "")}</small>` : ""}</span></li>`).join("");
    return k("Regulasi", "regulasi", kal, `<div class="pw-pils">${pills}</div>${dr}${dok ? `<ul class="pw-ls">${dok}</ul>` : ""}`,
      `Sumber: peraturan.bpk.go.id. Kode wilayah Kemendagri 2019 dengan beberapa alias Papua manual. Tanggal dan jenis bencana status darurat tidak diekstrak, lihat judul.${g.n > (g.d || []).length && g.d?.length ? ` Menampilkan ${g.d.length} dari ${fmt(g.n)} dokumen.` : ""}`);
  }

  /* 3. paparan */
  function paparan(d, kode) {
    const p = d.pp; if (!p || !(p.t || p.wp || p.g)) return "";
    const pakaiWP = !p.t && p.wp, pend = p.t || p.wp;
    const kal = `${pend ? `Sekitar ${o(juta(pend))} penduduk` : ""}${pend && p.g ? " dan " : ""}${p.g ? `${o(juta(p.g))} bangunan` : ""}${p.ob ? `, rata-rata ${o(fmt(p.ob, 1))} orang per bangunan` : ""}.`;
    const sisa = p.t - p.b - p.l, seg = p.t ? [["Balita 0-5", p.b, "#e58a45"], ["Lansia 60+", p.l, "#c9503a"], ["Usia lain", sisa, "var(--accent)"]] : [];
    const bar = seg.length ? `<div class="pw-bar" role="img" aria-label="Komposisi penduduk">${seg.map(([n, v, c]) => `<i style="flex:${Math.max(v, 1)};background:${c}" data-tip="${esc(`<b>${n}</b><br>${fmt(v)} orang<br>${fmt(v / p.t * 100, 1)}% penduduk`)}"></i>`).join("")}</div>` : "";
    const pils = (p.t ? [pil(`Wanita <b>${fmt(p.w / p.t * 100, 1)}%</b>`), pil(`Balita 0-5 <b>${juta(p.b)}</b>`), pil(`Lansia 60+ <b>${juta(p.l)}</b>`)] : []).join("")
      + (pakaiWP ? pil("hanya WorldPop", "pw-info", "Data HRSL Meta tidak ada untuk wilayah ini; angka penduduk dari WorldPop.") : p.wp ? pil(`WorldPop ${juta(p.wp)}`, "", "Pembanding independen: WorldPop, total penduduk wilayah.") : "")
      + (p.rr ? pil("bangunan kurang andal", "pw-no", kode.startsWith("31") ? "Kepadatan atap di DKI membuat cacahan bangunan satelit menyatu dan kurang andal." : "Dataran tinggi Papua: awan dan atap kecil membuat cacahan bangunan satelit kurang andal.") : "");
    return k("Paparan penduduk dan bangunan", "paparan", kal, `${bar}<div class="pw-pils">${pils}</div>`,
      `Sumber: Meta/CIESIN HRSL (CC BY 4.0), Google Open Buildings, Microsoft, Overture (ODbL). Bangunan dijumlah dari kecamatan, sumber tambalan terbanyak ${esc(p.sg || "")}.${pakaiWP || p.wp ? " Pembanding: WorldPop (CC BY 4.0)." : ""}`);
  }

  /* 4. BPBD */
  function bpbd(d) {
    const b = d.bp; if (!b || !(b.s || b.a || b.t || b.e || b.w)) return "";
    const ok = /^terbentuk/i.test(b.s || ""), kal = b.s ? `BPBD ${esc(d.n)} berstatus ${o(esc(b.s.toLowerCase()))}.` : `Kontak BPBD ${esc(d.n)} tercatat di BNPB.`;
    const bar = (i, t) => t ? `<li>${ik(i)}<span>${t}</span></li>` : "";
    const web = aman(b.w), hp = b.t, sur = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.e || "") ? esc(b.e) : "";
    return k("BPBD", "bpbd", kal, `<div class="pw-pils">${pil(esc(b.s || "status belum tercatat"), ok ? "pw-ok" : "pw-no")}</div><ul class="pw-ls pw-kon">${bar("pin", esc(b.a))}${bar("tel", esc(hp))}${bar("surel", sur && `<a href="mailto:${sur}">${sur}</a>`)}${bar("web", web && `<a href="${web}" target="_blank" rel="noopener">${esc(web.replace(/^https?:\/\//, "").slice(0, 60))}</a>`)}</ul>`,
      "Sumber: BNPB ATLAS Pusdalops dan kontak BPBD kab/kota (Agustus 2024). Hanya kantor resmi; nomor dan surel dapat sudah berganti.");
  }

  /* 5. riwayat GDACS + Copernicus EMS */
  function riwayat(d, semua) {
    const L = d.rw; if (!L || !L.length) return "";
    const g = L.filter(x => x[0] === "G").length, e = L.length - g, tampil = semua ? L : L.slice(0, 6);
    const kal = `${o(fmt(L.length))} kejadian tercatat di wilayah ini, terakhir ${L[0][2].slice(0, 4)}${e ? `, ${e} di antaranya aktivasi Copernicus EMS` : ""}.`;
    const rows = tampil.map(x => `<li>${pil(esc(JNS[x[1]] || x[1]))}<span>${aman(x[6]) ? `<a href="${aman(x[6])}" target="_blank" rel="noopener">${esc(x[3])}</a>` : esc(x[3])}<small>${esc(x[2])}${x[4] ? `, siaga ${esc(ALERT[x[4]] || x[4])}` : ""}${x[5] ? `, ${esc(x[5])}` : ""}, ${x[0] === "G" ? "GDACS" : "Copernicus EMS"}</small></span></li>`).join("");
    return k("Riwayat kejadian", "riwayat", kal, `<ul class="pw-ls">${rows}</ul>${L.length > 6 && !semua ? `<button class="pw-lagi" data-lagi>Tampilkan ${L.length - 6} lainnya</button>` : ""}`,
      "Sumber: GDACS (kejadian di dalam batas kab/kota) dan Copernicus EMS Rapid Mapping (titik pusat area pemetaan). Gempa laut lepas pantai tidak masuk.");
  }

  function pastiDlg() {
    if (dlg) return dlg;
    if (!document.querySelector('link[href*="profil_wilayah.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = new URL("profil_wilayah.css", SRC).href; document.head.appendChild(l); }
    dlg = document.createElement("dialog"); dlg.className = "pw"; dlg.setAttribute("aria-label", "Profil wilayah");
    tip = document.createElement("div"); tip.className = "pw-tip"; dlg.appendChild(tip);
    dlg.addEventListener("click", e => {
      if (e.target === dlg || e.target.closest("[data-tutup]")) dlg.close();
      const l = e.target.closest("[data-lagi]"); if (l && dlg._d) { const s = l.closest(".pw-k"); s.outerHTML = riwayat(dlg._d, true); }
    });
    const hide = () => tip.classList.remove("on");
    dlg.addEventListener("pointermove", e => {
      const x = e.target.closest?.("[data-tip]"); if (!x) return hide();
      if (tip._x !== x) { tip._x = x; tip.innerHTML = x.dataset.tip.includes("<") ? x.dataset.tip : esc(x.dataset.tip); }
      tip.classList.add("on"); const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.max(6, Math.min(innerWidth - w - 6, e.clientX - w / 2)) + "px"; tip.style.top = Math.max(6, e.clientY - h - 14) + "px";
    });
    dlg.addEventListener("pointerleave", hide); dlg.addEventListener("scroll", hide, true); dlg.addEventListener("close", () => { hide(); tip._x = null; });
    dlg.addEventListener("focusin", e => { const x = e.target.closest?.("[data-tip]"); if (x) { tip._x = x; tip.innerHTML = x.dataset.tip; tip.classList.add("on"); const r = x.getBoundingClientRect(); tip.style.left = Math.max(6, r.left) + "px"; tip.style.top = Math.max(6, r.top - tip.offsetHeight - 8) + "px"; } });
    dlg.addEventListener("focusout", hide);
    document.body.appendChild(dlg); return dlg;
  }
  const kepala = (n, p) => `<header class="pw-hd"><div><span class="pw-ey pw-ey-h">Profil wilayah</span><h2>${esc(n)}</h2>${p ? `<p>${esc(p)}</p>` : ""}</div><button class="pw-x" data-tutup aria-label="Tutup" title="Tutup"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="${IK.tutup}"/></svg></button></header>`;

  async function buka(kode) {
    const D = pastiDlg(); D.innerHTML = ""; D.appendChild(tip);
    D.insertAdjacentHTML("beforeend", kepala("Memuat profil wilayah") + `<div class="pw-bd"><p class="pw-kos">Memuat data...</p></div>`);
    if (!D.open) D.showModal();
    try {
      const d = (await muatProv(String(kode).slice(0, 2)))[kode]; if (!d) throw 0;
      D._d = d; D.querySelector(".pw-hd")?.remove(); D.querySelector(".pw-bd")?.remove();
      /* bagian berat dirakit sesudah dialog tampil: klik tetap ringan */
      requestAnimationFrame(() => setTimeout(() => {
        const bagian = [risiko(d, d.n), regulasi(d), paparan(d, kode), bpbd(d), riwayat(d)].filter(Boolean);
        D.insertAdjacentHTML("beforeend", kepala(d.n, d.p) + `<div class="pw-bd">${bagian.join("") || `<p class="pw-kos">Belum ada data profil untuk wilayah ini.</p>`}</div>`);
      }, 0));
    } catch (e) { D.querySelector(".pw-hd")?.remove(); D.querySelector(".pw-bd")?.remove(); D.insertAdjacentHTML("beforeend", kepala("Profil wilayah") + `<div class="pw-bd"><p class="pw-kos">Profil wilayah ini belum tersedia.</p></div>`); }
  }
  const bukaNama = async (prov, kab) => { const kd = await cari(prov, kab); if (kd) buka(kd); };

  /* tombol di kepala #laci: kartu kab banjir, kecamatan banjir, cluster karhutla (data-prov pada h2) */
  function sisip(laci) {
    const hd = laci.querySelector(".hd"), aksi = hd?.querySelector(".hd-aksi"); if (!aksi || aksi.querySelector(".pw-btn")) return;
    const ey = hd.querySelector(".hd-ey")?.textContent.trim() || "", h2 = hd.querySelector("h2"), meta = hd.querySelector(".hd-meta")?.textContent.trim() || "";
    let prov, kab;
    if (/^Cluster/i.test(ey)) { prov = h2?.dataset.prov; kab = (h2?.getAttribute("title") || h2?.textContent || "").split(", ").pop(); }
    else if (/^Kabupaten|^Kota/i.test(ey)) { kab = h2?.textContent; prov = meta; }
    else if (/^Kecamatan/i.test(ey)) { const p = meta.split(", "); kab = p[0]; prov = p.slice(1).join(", "); }
    if (!kab) return;
    const b = document.createElement("button"); b.className = "ik-btn pw-btn"; b.title = b.ariaLabel = "Profil wilayah"; b.innerHTML = ik("risiko");
    b.onclick = () => bukaNama(prov, kab); aksi.insertBefore(b, aksi.querySelector(".tutup") || null);
  }
  function pasang() {
    document.addEventListener("click", e => { const t = e.target.closest?.("[data-profil]"); if (!t) return; const v = t.dataset.profil; /^\d{4}$/.test(v) ? buka(v) : bukaNama(...v.split("|")); });
    const laci = document.getElementById("laci"); if (!laci) return;
    let j = 0; new MutationObserver(() => { cancelAnimationFrame(j); j = requestAnimationFrame(() => sisip(laci)); }).observe(laci, {childList: true});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasang); else pasang();
  return {buka, bukaNama, cari};
})();
