/* aktor.js — perusahaan di balik titik panas karhutla 2026 (kajian WALHI "Siapa di Balik Api?"), dicek silang ke peta konsesi.
   Data: data/aktor_karhutla.json (scripts/data/aktor_walhi.py). Nama & grup pemegang konsesi tampil lagi (pemilik, 17 Okt 2026).
   Menambah: lima kartu Insight (daftar perusahaan, modal asing per negara, grup usaha, PSN Merauke, tokoh politik);
   di peta: garis tebal di poligon perusahaan WALHI, pil bendera negara afiliasi saat poligon diklik, tooltip poligon konsesi bernama.
   Skrip klasik dimuat SETELAH konsesi.js. Memakai global halaman: Insight, Lapis, Peta, peta, $, esc, fmt, muatJSON, bukaTab,
   kiriPad, paginasi, pengurutKepala, tampilTip, kartuTip, ikon, maplibregl, nanti. */
(() => {
  if (typeof Insight === "undefined" || !Array.isArray(Insight.EX)) return;
  const A = window.Aktor = {d: null, janji: null, poli: {}};
  A.muat = () => A.janji ||= muatJSON("data/aktor_karhutla.json").then(d => {
    /* perusahaan yang tidak ada di peta konsesi disembunyikan; poligon senama di provinsi lain tetap tampil dengan provinsi poligon
       peta (pemilik, 17 Okt 2026) */
    d.perusahaan = d.perusahaan.filter(p => p.cek?.poligon);
    d.perusahaan.forEach(p => { if (p.cek.lokasi === "beda" && p.cek.prov_peta) { p.prov = p.cek.prov_peta; p.cek.lokasi = "cocok"; } });
    A.d = d; A.per = Object.fromEntries(d.perusahaan.map(p => [p.nama, p]));
    for (const [id, nm] of Object.entries(d.poligon)) (A.poli[nm] ||= []).push(id);
    document.querySelectorAll('[data-ex^="aktor"]').forEach(b => { b.innerHTML = Insight.gambar(b.dataset.ex); });
    pasangPeta(); }).catch(() => { A.d = {gagal: true}; });

  const NEG = () => A.d?.negara || {};
  const bendera = (k, h = 13) => k && k !== "ID" ? `<img class="ak-bd" src="img/bendera/${k.toLowerCase()}.svg" alt="${esc(NEG()[k] || k)}" width="${Math.round(h * 4 / 3)}" height="${h}" data-tip="${esc(NEG()[k] || k)}">` : "";
  const benderaDaf = (ks, h) => (ks || []).filter(k => k !== "ID").map(k => bendera(k, h)).join("");
  /* industri (aktor_walhi.py industri()) -> warna pil */
  const IND = {"Kelapa sawit": "#c98a3c", "Hutan tanaman (pulp)": "#6b8e3a", "Hutan alam (HPH)": "#2f6f8f", "Tebu dan gula": "#b5658a", "Restorasi ekosistem": "#2b8c86"};
  const indPil = t => t ? `<span class="ak-j" style="--w:${IND[t] || "#8a94a6"}">${esc(t)}</span>` : "";
  /* logo grup/pemegang: favicon resmi situs grupnya, disimpan di img/logo-grup; tanpa logo resmi = tidak ada logo (pemilik, 17 Okt 2026) */
  const LOGO = [[/Nordic Forest|Stora Enso/i, "stora-enso"], [/Salween|GIC/i, "gic"], [/Gochean|TPG/i, "tpg"], [/Sampoerna|AGPA/i, "sampoerna-agro"], [/POSCO/i, "posco"],
    [/Musim Mas/i, "musim-mas"], [/^Wilmar/i, "wilmar"], [/APP|Asia Pulp/i, "app"], [/Sinar Mas/i, "sinar-mas"], [/APRIL/i, "april"], [/RGE|Royal Golden/i, "rge"],
    [/Sime Darby|Synergy Drive/i, "sime-darby"], [/Genting/i, "genting"], [/Jcorp/i, "jcorp"], [/Lion Group/i, "lion"],
    [/Salim|Indofood/i, "salim"], [/London Sumatra|Lonsum/i, "lonsum"], [/Medco/i, "medco"], [/Perkebunan Nusantara|PTPN/i, "ptpn"], [/Goodhope/i, "goodhope"],
    [/Cargill/i, "cargill"], [/Barito/i, "barito"], [/Charoen Pokphand/i, "cp"], [/Sumitomo/i, "sumitomo"], [/Royal Golden Eagle/i, "rge"]];
  A.logo = (nama, h = 22) => { const f = LOGO.find(([re]) => re.test(nama || ""))?.[1];
    return f ? `<img class="ak-lg" src="img/logo-grup/${f}.png" alt="" width="${h}" height="${h}" loading="lazy">` : ""; };
  const titik = p => p.titik_agu ?? p.titik_sep;
  const titikPil = p => p.cek?.poligon && p.cek.lokasi !== "beda" ? `<span class="ak-tj" data-tip="Titik panas VIIRS di konsesi, Jan–Agu 2026">${fmt(p.cek.titik_viirs ?? 0)} titik</span>` : "";
  const tunggu = () => { A.muat(); return `<article class="ex"><div class="kosong"><div class="spin"></div>Memuat data perusahaan…</div></article>`; };
  /* tooltip perusahaan (kartu rata kiri): logo + nama + grup, ubin titik panas di konsesi, pemegang saham asing, catatan */
  A.tip = p => { const ok = p.cek?.poligon && p.cek.lokasi !== "beda", ps = (p.pemegang || []).filter(x => x.negara !== "ID");
    return `<div class="tp2-h ak-tch">${A.logo(p.grup[0] || p.nama, 26)}<span><b>${esc(p.nama)}</b><small>${esc([p.grup.join(", "), p.prov].filter(Boolean).join(" · "))}</small></span></div>`
      + (ok ? `<div class="ak-tcs"><span><b>${fmt(p.cek.titik_viirs ?? 0)}</b>titik panas Jan–Agu</span>${p.cek.titik_terkini != null ? `<span${p.cek.titik_terkini ? ' class="ak-tck"' : ""}><b>${fmt(p.cek.titik_terkini)}</b>titik terkini</span>` : ""}</div>`
        : `<div class="ak-tcm">${!p.cek?.poligon ? "Tidak ada di peta konsesi" : "Poligon senama di peta ada di provinsi lain"}</div>`)
      + (ps.length ? `<div class="ak-tcl"><small>Pemegang saham</small>${ps.map(x => `<span>${bendera(x.negara, 11)}${esc(x.nama)}</span>`).join("")}</div>` : "")
      + (p.catatan ? `<p class="ak-tcn">${esc(p.catatan)}</p>` : ""); };

  Object.assign(Insight.st, {akJenis: "", akHal: 0, akUrut: "peta", akTurun: true});
  Object.assign(Insight.LABEL, {aktor: "Perusahaan", aktorNegara: "Modal asing", aktorGrup: "Grup usaha", aktorPsn: "PSN Merauke", aktorTokoh: "Tokoh politik"});
  ["aktor", "aktorNegara"].forEach(k => Insight.PENUH.add(k));
  const i0 = Insight.EX.indexOf("nasional");
  Insight.EX.splice(i0 < 0 ? Insight.EX.length : i0, 0, "aktor", "aktorNegara", "aktorGrup");   /* aktorPsn dan aktorTokoh disembunyikan (pemilik, 17 Okt 2026); fungsinya tetap ada */

  /* ---------- 1. daftar perusahaan ---------- */
  const PER = 10;
  Insight.exAktor = function () {
    if (!A.d) return tunggu(); if (A.d.gagal) return "";
    const st = this.st, semua = A.d.perusahaan.filter(p => titik(p) != null);
    let r = semua.filter(p => !st.akJenis || (st.akJenis === "asing" ? p.negara.some(k => k !== "ID") : p.jenis === st.akJenis));
    const nilai = {titik, nama: p => p.nama, grup: p => p.grup.join(", "), prov: p => p.prov, peta: p => p.cek?.titik_viirs ?? -1, kini: p => p.cek?.titik_terkini ?? -1, negara: p => p.negara.filter(k => k !== "ID").length};
    const tk = A.d.periode?.terkini, lbKini = tk?.dari ? (tk.dari === tk.sampai ? +tk.dari.slice(3) : `${+tk.dari.slice(3)}–${+tk.sampai.slice(3)}`) + " " + ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][+tk.sampai.slice(0, 2) - 1] : "Terkini";
    const f = nilai[st.akUrut] || titik;
    r = r.slice().sort((a, b) => { const x = f(a), y = f(b); const c = typeof x === "string" ? x.localeCompare(y, "id") : x - y; return st.akTurun ? -c : c; });
    const jml = Math.max(1, Math.ceil(r.length / PER)); st.akHal = Math.min(st.akHal, jml - 1);
    const hal = r.slice(st.akHal * PER, st.akHal * PER + PER), asing = semua.filter(p => p.negara.some(k => k !== "ID")).length;
    const th = (k, t, n) => `<th${n ? ' class="n"' : ""}><button data-ak-urut="${k}">${t}<i>${st.akUrut === k ? (st.akTurun ? "↓" : "↑") : ""}</i></button></th>`;
    const tabel = `<div class="tw ak-tw"><table><thead><tr><th class="n">No</th>${th("nama", "Perusahaan")}${th("negara", "Negara")}${th("grup", "Grup")}<th>Industri</th>${th("prov", "Provinsi")}${th("peta", "Peta Jan–Agu", 1)}${th("kini", lbKini, 1)}</tr></thead>
      <tbody>${hal.map((p, i) => `<tr data-ak="${esc(p.nama)}" tabindex="0" data-tip="${esc(A.tip(p))}">
        <td class="n">${st.akHal * PER + i + 1}</td><td class="ak-nm">${esc(p.nama)}</td>
        <td class="ak-ng">${benderaDaf(p.negara, 14) || `<span class="ak-mt">–</span>`}</td><td class="ak-gr">${esc(p.grup.join(", ") || "–")}</td><td>${indPil(p.industri)}</td><td>${esc(p.prov)}</td>
        <td class="n">${!p.cek?.poligon ? `<span class="ak-mt" data-tip="Nama ini tidak ada di peta konsesi GFW/Trase">tidak di peta</span>`
          : p.cek.lokasi === "beda" ? `<span class="ak-pl ak-pl3" data-tip="Poligon senama di peta berada di provinsi lain dari yang tercatat; ${fmt(p.cek.titik_viirs)} titik VIIRS di poligon itu">lokasi beda</span>`
          : `<span class="ak-pl ak-pl2">${fmt(p.cek.titik_viirs ?? 0)}</span>`}</td>
        <td class="n">${p.cek?.poligon && p.cek.lokasi !== "beda" ? (p.cek.titik_terkini ? `<span class="ak-pl">${fmt(p.cek.titik_terkini)}</span>` : `<span class="ak-mt">0</span>`) : `<span class="ak-mt">–</span>`}</td></tr>`).join("")
        || `<tr><td colspan="8" class="kosong">Tidak ada perusahaan.</td></tr>`}</tbody></table></div>${paginasi(st.akHal, r.length, PER, "perusahaan")}`;
    const kini = semua.filter(p => p.cek?.titik_terkini && p.cek.lokasi !== "beda").length;
    return this.ex(`${this.hl(fmt(semua.length) + " perusahaan")} terindikasi karhutla 2026, ${this.hl(fmt(asing))} terafiliasi luar negeri; ${this.hl(fmt(kini))} masih ada titik panas di konsesinya ${esc(lbKini)}`, "", "", tabel,
      `Sumber: NASA FIRMS VIIRS di poligon konsesi GFW/Trase senama (Peta Jan–Agu, ${esc(lbKini)})`,
      this.seg("akJenis", [["", "Semua"], ["sawit", "Sawit"], ["pbph", "PBPH"], ["asing", "Modal asing"]])); };

  /* ---------- 2. modal asing per negara (Tabel 3) ---------- */
  Insight.exAktorNegara = function () {
    if (!A.d) return tunggu(); if (A.d.gagal) return "";
    /* negara -> perusahaan -> pemegang (dua pemegang satu negara jadi satu baris, dipisah titik koma) */
    const g = {}; A.d.perusahaan.forEach(p => (p.pemegang || []).forEach(x => { if (x.negara === "ID") return; const o = g[x.negara] ||= new Map(); if (!o.has(p)) o.set(p, []); o.get(p).push(x.nama); }));
    const urut = Object.entries(g).map(([k, m]) => [k, [...m].map(([p, xs]) => [p, {nama: xs.join("; ")}])]).sort((a, b) => b[1].length - a[1].length);
    const nP = new Set(urut.flatMap(([, rs]) => rs.map(([p]) => p.nama))).size;
    /* satu baris per perusahaan: logo pemegang | nama | industri | ← pemegang. Negara terbanyak selebar kartu (daftar 4 kolom),
       negara lain sebaris di bawahnya (pemilik, 17 Okt 2026) */
    const kotak = ([k, rs], lebar) => `<section class="ak-nk${lebar ? " ak-nk-lebar" : ""}"><header>${bendera(k, 18)}<b>${esc(NEG()[k] || k)}</b><span class="ak-pl">${rs.length}</span></header>
      <ul>${rs.map(([p, x]) => `<li data-ak="${esc(p.nama)}" data-tip="${esc(A.tip(p))}">${A.logo(x.nama, 28)}<span class="ak-li"><span class="ak-lb"><b>${esc(p.nama)}</b><span class="ak-ph">← ${esc(x.nama)}</span></span><span class="ak-lf">${indPil(p.industri)}${titikPil(p)}</span></span></li>`).join("")}</ul></section>`;
    const [besar, ...lain] = urut, lebar = besar && besar[1].length >= 4;
    const isi = `<div class="ak-ngr">${lebar ? kotak(besar, 1) : ""}<div class="ak-ngr-lain" style="--n:${Math.max(1, Math.min(5, (lebar ? lain : urut).length))}">${(lebar ? lain : urut).map(r => kotak(r)).join("")}</div></div>`;
    return this.ex(`${this.hl(nP + " perusahaan")} dengan titik panas terbanyak dimiliki pemegang saham di ${this.hl(urut.length + " negara")}, termasuk yurisdiksi rahasia BVI dan Samoa`, "", "", isi,
      ""   /* nama kajian sumber tidak ditampilkan (pemilik, 17 Okt 2026) */); };

  /* ---------- 3. grup usaha & negara (Tabel 4) ---------- */
  Insight.exAktorGrup = function () {
    if (!A.d) return tunggu(); if (A.d.gagal) return "";
    const G = A.d.grup, mx = Math.max(...G.map(x => x.jumlah)), tot = G.reduce((a, x) => a + x.jumlah, 0);
    const per = k => G.filter(x => x.negara === k).reduce((a, x) => a + x.jumlah, 0);
    /* klik baris grup: rincian perusahaannya terbuka di bawah (pemilik, 17 Okt 2026). Kajian sumber menghitung sebagian
       perusahaan yang tidak ada di data rincian; selisihnya disebut, tidak dikarang */
    const anak = g => { const k = g.split(" (")[0].toLowerCase(); return A.d.perusahaan.filter(p => p.grup.some(x => x.toLowerCase().startsWith(k)) || (p.pemegang || []).some(x => x.nama.toLowerCase().includes(k))); };
    const tipG = (x, ps) => { const ok = ps.filter(p => p.cek?.poligon && p.cek.lokasi !== "beda"), t = ok.reduce((a, p) => a + (p.cek.titik_viirs || 0), 0);
      return `<div class="tp2-h ak-tch">${A.logo(x.grup, 26)}<span><b>${esc(x.grup)}</b><small>${bendera(x.negara, 10)}${esc(NEG()[x.negara] || x.negara)}</small></span></div>`
        + `<div class="ak-tcs"><span><b>${fmt(x.jumlah)}</b>perusahaan terindikasi</span>${ok.length ? `<span><b>${fmt(t)}</b>titik panas Jan–Agu</span>` : ""}</div><div class="ak-tcm">Klik untuk rincian perusahaan</div>`; };
    const isi = `<div class="ak-bar">${G.map(x => { const ps = anak(x.grup).sort((a, b) => (b.cek?.titik_viirs || 0) - (a.cek?.titik_viirs || 0)), sisa = x.jumlah - ps.length;
      return `<details class="ak-gd"><summary class="ak-br" data-tip="${esc(tipG(x, ps))}">
      <span class="ak-bl">${A.logo(x.grup, 18)}${bendera(x.negara, 12)}${esc(x.grup)}</span><i><b style="width:${x.jumlah / mx * 100}%;background:${x.negara === "MY" ? "#2f6f8f" : "#c9503a"}"></b></i><span class="ak-pl">${x.jumlah}</span></summary>
      <ul>${ps.map(p => `<li data-ak="${esc(p.nama)}" tabindex="0" data-tip="${esc(A.tip(p))}"><b>${esc(p.nama)}</b><span class="ak-mt">${esc([p.kab, p.prov].filter(Boolean).join(", "))}</span>${indPil(p.industri)}${titikPil(p) || `<span class="ak-mt">tidak di peta</span>`}</li>`).join("")}</ul>
      ${sisa > 0 ? `<p class="ak-gs">${sisa} perusahaan lain tercatat di kajian sumber tanpa rincian nama</p>` : ""}</details>`; }).join("")}</div>`;
    Insight.leg([["#c9503a", `Singapura (${per("SG")})`], ["#2f6f8f", `Malaysia (${per("MY")})`]]);
    return this.ex(`${this.hl(tot + " perusahaan")} terindikasi karhutla terafiliasi grup asal Singapura dan Malaysia; ${this.hl("Sinar Mas")} dan ${this.hl("Wilmar")} terbanyak`, "", "", isi,
      ""   /* nama kajian sumber tidak ditampilkan (pemilik, 17 Okt 2026) */); };

  /* ---------- 4. PSN Merauke (Tabel 5) ---------- */
  Insight.exAktorPsn = function () {
    if (!A.d) return tunggu(); if (A.d.gagal) return "";
    const P = A.d.psn, en = P.energi.reduce((a, x) => a + x.titik, 0), pg = P.pangan.reduce((a, x) => a + x.titik, 0), mx = Math.max(...[...P.energi, ...P.pangan].map(x => x.titik));
    /* nama | grup atau pengampu (kolom sendiri, tidak terpotong) | batang | pil */
    const baris = (nm, sub, n, w, kiri) => `<div class="ak-br ak-br4" data-tip="<b>${esc(nm)}</b><br>${esc(sub)}<br>${fmt(n)} titik panas"><span class="ak-bl">${kiri}${esc(nm)}</span><span class="ak-sub">${esc(sub)}</span><i><b style="width:${n / mx * 100}%;background:${w}"></b></i><span class="ak-pl">${fmt(n)}</span></div>`;
    const isi = `<div class="ak-psn"><div><div class="ak-sb">Energy estate · ${fmt(en)} titik</div><div class="ak-bar">${P.energi.map(x => baris(x.nama, x.grup, x.titik, "#c98a3c", bendera(x.negara, 12))).join("")}</div></div>
      <div><div class="ak-sb">Food estate · ${fmt(pg)} titik</div><div class="ak-bar">${P.pangan.map(x => baris(x.nama, x.pengampu, x.titik, "#7a4bb0", "")).join("")}</div></div></div>`;
    return this.ex(`${this.hl(fmt(pg) + " dari " + fmt(P.total))} titik panas PSN Pangan dan Energi Merauke ada di klaster food estate yang diampu pemerintah`, "", "", isi,
      ""   /* nama kajian sumber tidak ditampilkan (pemilik, 17 Okt 2026) */); };

  /* ---------- 5. tokoh politik (bab 2) ---------- */
  Insight.exAktorTokoh = function () {
    if (!A.d) return tunggu(); if (A.d.gagal) return "";
    const T = A.d.tokoh, nP = new Set(T.map(t => t.perusahaan)).size;
    const isi = `<div class="tw ak-tw"><table><thead><tr><th>Tokoh</th><th>Jabatan politik</th><th>Kaitan</th><th>Perusahaan</th><th class="n">Titik panas</th></tr></thead><tbody>
      ${T.map(t => { const p = A.per[t.perusahaan] || {}; return `<tr data-ak="${esc(t.perusahaan)}" tabindex="0"><td class="ak-nm">${esc(t.nama)}</td><td class="ak-gr" data-tip="${esc(t.peran)}">${esc(t.peran)}</td><td class="ak-gr" data-tip="${esc(t.kaitan)}">${esc(t.kaitan)}</td><td>${esc(t.perusahaan)}</td>
        <td class="n">${titik(p) != null ? `<span class="ak-pl">${fmt(titik(p))}</span>` : `<span class="ak-mt" data-tip="Kebakaran ditemukan lewat pemantauan lapangan">–</span>`}</td></tr>`; }).join("")}</tbody></table></div>`;
    return this.ex(`${this.hl(T.length + " tokoh politik")} duduk di jajaran pemilik atau pengurus ${this.hl(nP + " perusahaan")} terindikasi karhutla`, "", "", isi,
      ""   /* nama kajian sumber tidak ditampilkan (pemilik, 17 Okt 2026) */); };

  /* klik di kartu: urut, halaman, baris -> peta */
  document.addEventListener("click", e => {
    const box = e.target.closest('[data-ex^="aktor"]'); if (!box) return;
    const st = Insight.st, ulang = () => nanti(() => { const b = document.querySelector('[data-ex="aktor"]'); if (b) b.innerHTML = Insight.gambar("aktor"); });
    const u = e.target.closest("[data-ak-urut]"); if (u) { st.akTurun = st.akUrut === u.dataset.akUrut ? !st.akTurun : true; st.akUrut = u.dataset.akUrut; st.akHal = 0; return ulang(); }
    const h = e.target.closest(".pgn [data-h]"); if (h && box.dataset.ex === "aktor") { st.akHal = +h.dataset.h; return ulang(); }
    if (e.target.closest("[data-set=akJenis]")) st.akHal = 0;
    const r = e.target.closest("[data-ak]"); if (r) A.buka(r.dataset.ak); });
  document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.('[data-ex^="aktor"] [data-ak]')) { e.preventDefault(); A.buka(e.target.dataset.ak); } });

  /* ---------- laci perusahaan: memakai #laci (laci kompleks) dengan isi perusahaan; Laci.buka menimpanya lagi ---------- */
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = s => `${+s.slice(8, 10)} ${BLN[+s.slice(5, 7) - 1]}`;                       /* "2026-10-12" -> "12 Okt" */
  const rentang = (a, b) => a === b ? tgl(a) : a.slice(5, 7) === b.slice(5, 7) ? `${+a.slice(8, 10)}–${tgl(b)}` : `${tgl(a)}–${tgl(b)}`;
  const hariKe = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
  const NAMA_TAHUN = 2026, AWAL = hariKe(NAMA_TAHUN + "-01-01"), AWAL_TITIK = 20;
  const lipatA = (judul, isi, buka = true) => `<details class="lipat" ${buka ? "open" : ""}><summary>${judul}</summary><div class="isi">${isi}</div></details>`;
  /* grafik harian: satu batang per hari, 1 Jan sampai hari ini (WIB), skala tegak ke puncak; hari kosong tidak digambar */
  A.grafikHarian = (harian, hariIni) => {
    const n = hariIni - AWAL + 1, W = 3, H = 60, mx = Math.max(1, ...harian.map(x => x[1]));
    const bar = harian.map(([t, v]) => { const i = hariKe(t) - AWAL, h = Math.max(1.5, v / mx * (H - 4)), tip = `<b>${tgl(t)}</b><br>${fmt(v)} titik panas`;
      return `<rect x="${i * W}" y="0" width="${W}" height="${H}" fill="transparent" data-tip="${tip}"/><rect x="${i * W + .4}" y="${H - h}" width="${W - .8}" height="${h}" rx=".6" fill="#c9503a" pointer-events="none"/>`; }).join("");
    const bln = BLN.map((b, m) => [b, hariKe(`${NAMA_TAHUN}-${String(m + 1).padStart(2, "0")}-01`) - AWAL]).filter(([, i]) => i < n)
      .map(([b, i]) => `<span style="left:${i / n * 100}%">${b}</span>`).join("");
    return `<svg viewBox="0 0 ${n * W} ${H}" preserveAspectRatio="none" width="100%" height="64" role="img" aria-label="Titik panas harian">${bar}</svg><div class="ak-bln">${bln}</div>`; };
  const hariIniWIB = () => { const d = new Date(Date.now() + 7 * 36e5); return Math.floor(d.getTime() / 864e5); };
  const barisTitik = (t, i) => `<tr data-lat="${t[0]}" data-lon="${t[1]}" tabindex="0"><td class="n">${i + 1}</td><td>${tgl(t[2])} ${t[2].slice(11, 16)} WIB</td><td class="n">${fmt(Math.round(t[3]))}</td><td class="ak-mt">${esc(t[4] === "SNPP" ? "S-NPP" : t[4] || "")}</td></tr>`;
  A.isiLaci = p => {
    const bendera_ = benderaDaf(p.negara, 14), grup = p.grup.join(", ");
    let isi;
    if (p.kosong || !p.cek?.poligon) isi = `<p class="fnd">Tidak ada di peta konsesi.</p>`;
    else {
      const har = p.harian || [], tot = har.reduce((a, x) => a + x[1], 0), puncak = har.reduce((a, x) => x[1] > (a?.[1] || 0) ? x : a, null);
      const lini = har.length ? `<div class="ak-ml"><span class="ak-pl">${fmt(tot)}</span> titik panas${puncak ? ` · puncak <b>${tgl(puncak[0])}</b> (${fmt(puncak[1])})` : ""}</div>${A.grafikHarian(har, Math.max(hariIniWIB(), hariKe(har[har.length - 1][0])))}`
        : `<p class="fnd">Belum ada titik panas di konsesi ini sepanjang 2026.</p>`;
      const kom = (p.kompleks || []).length ? `<div class="tw ak-tw ak-kt"><table><thead><tr><th class="n">No</th><th>Kompleks</th><th class="n">Titik panas</th><th>Rentang</th></tr></thead><tbody>${p.kompleks.map((k, i) => `<tr data-kom="${esc(k.id)}" tabindex="0"><td class="n">${i + 1}</td><td>${esc(k.id)}</td><td class="n">${fmt(k.n)}</td><td class="ak-mt">${rentang(k.dari, k.sampai)}</td></tr>`).join("")}</tbody></table></div>`
        : `<p class="fnd">Tidak ada kompleks api aktif di konsesi ini dalam 7 hari terakhir.</p>`;
      const tt = p.titik || [];
      const tp = tt.length ? `<div class="tw ak-tw ak-kt"><table><thead><tr><th class="n">No</th><th>Waktu</th><th class="n">Daya api (MW)</th><th>Satelit</th></tr></thead><tbody data-tt>${tt.slice(0, AWAL_TITIK).map(barisTitik).join("")}</tbody></table></div>${tt.length > AWAL_TITIK ? `<button type="button" class="btn" data-semua-tt>Tampilkan semua (${fmt(tt.length)})</button>` : ""}`
        : `<p class="fnd">Belum ada titik panas di konsesi ini sepanjang 2026.</p>`;
      isi = lipatA("Linimasa titik panas 2026", lini) + lipatA("Kompleks api 7 hari", kom) + lipatA("Titik panas terbaru", tp);
    }
    return `<div class="hd"><div class="hd-isi"><span class="hd-ey">Perusahaan</span><h2 title="${esc(p.nama)}">${esc(p.nama)}</h2>
      <div class="hd-meta">${bendera_}${grup ? `<span class="ak-gr" data-tip="${esc(grup)}">${esc(grup)}</span>` : ""}<span>${esc(p.prov || "")}</span>${indPil(p.industri)}</div></div>
      <div class="hd-aksi"><button class="tutup ik-btn" aria-label="Tutup" title="Tutup"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>
      <div class="bd" style="display:grid;gap:10px">${isi}</div>`; };
  let denyut = null;
  const lepasDenyut = () => { denyut?.remove(); denyut = null; };
  A.buka = nama => {
    const p = A.per?.[nama]; A.tunjuk(nama);
    if (!p) return;
    const dl = $("#dlgLaci"); if (dl?.open) dl.close();                                  /* laci kompleks mode pop-up: kembalikan #laci ke peta */
    const el = $("#laci"); el.innerHTML = A.isiLaci(p); el.classList.add("on");
    if (el._tarik) el.appendChild(el._tarik);                                            /* pegangan lebar ikut terhapus innerHTML */
    const bd = el.querySelector(".bd");
    el.querySelector(".tutup").onclick = () => { el.classList.remove("on"); lepasDenyut(); };
    bd.onclick = e => {
      const k = e.target.closest("[data-kom]"); if (k) { if (!S.kluster?.features.some(f => f.properties.id === k.dataset.kom)) return typeof toast === "function" && toast("Kompleks ini sudah tidak aktif"); return Laci.buka(k.dataset.kom); }
      const t = e.target.closest("[data-lat]"); if (t) { const lat = +t.dataset.lat, lon = +t.dataset.lon; bukaTab("peta"); lepasDenyut();
        requestAnimationFrame(() => { peta.flyTo({center: [lon, lat], zoom: 13, duration: 900});
          const m = document.createElement("div"); m.className = "ak-dn"; denyut = new maplibregl.Marker({element: m}).setLngLat([lon, lat]).addTo(peta); }); return; }
      if (e.target.closest("[data-semua-tt]")) { const b = e.target.closest("[data-semua-tt]"); b.remove();
        nanti(() => bd.querySelector("[data-tt]").insertAdjacentHTML("beforeend", p.titik.slice(AWAL_TITIK).map((t, i) => barisTitik(t, AWAL_TITIK + i)).join(""))); } };
    bd.onkeydown = e => { if (e.key === "Enter" && e.target.matches("tr[data-kom],tr[data-lat]")) e.target.click(); };
  };

  /* ---------- peta ---------- */
  const kotak = g => { let x0 = 180, y0 = 90, x1 = -180, y1 = -90; (g.type === "MultiPolygon" ? g.coordinates : [g.coordinates]).forEach(p => p[0].forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); })); return [x0, y0, x1, y1]; };
  const nyalaKonsesi = () => { const i = $('#lapis input[data-l="konsesi"]'); if (i && !i.checked) { i.checked = true; i.dispatchEvent(new Event("change", {bubbles: true})); } };
  async function geo() { return Lapis.cache.konsesi ||= await muatJSON("data/lahan/konsesi.geojson"); }
  A.tunjuk = async nama => {
    const p = A.per[nama], ids = A.poli[nama] || [];
    if (!ids.length) { if (typeof toast === "function") toast(`${nama} tidak ada di peta konsesi`); return; }
    bukaTab("peta"); nyalaKonsesi();
    const fs = (await geo()).features.filter(f => ids.includes(f.properties.id)), b = new maplibregl.LngLatBounds();
    fs.forEach(f => { const [x0, y0, x1, y1] = kotak(f.geometry); b.extend([x0, y0]); b.extend([x1, y1]); });
    nanti(() => { peta.fitBounds(b, {padding: kiriPad(), maxZoom: 10, duration: 900}); if (typeof toast === "function" && p) toast(`${p.nama}: ${fmt(p.cek?.titik_viirs ?? 0)} titik panas di konsesi Jan–Agu (VIIRS)`); });
  };
  /* poligon perusahaan WALHI: garis merah tebal, hanya saat lapisan Konsesi menyala. Pil bendera di peta dibuang
     (pemilik, 17 Okt 2026): negara afiliasi cukup di tooltip poligon dan laci Aktor */
  function pasangPeta() {
    if (typeof peta === "undefined" || !peta?.getLayer) return setTimeout(pasangPeta, 1500);
    const ids = Object.keys(A.d.poligon);
    const garis = () => { if (!peta.getLayer("konsesi") || peta.getLayer("konsesi-walhi")) return;
      peta.addLayer({id: "konsesi-walhi", type: "line", source: "konsesi", filter: ["in", ["get", "id"], ["literal", ids]], paint: {"line-color": "#c9503a", "line-width": 2.4}}, "wil-line");
      sinkron(); };
    const sinkron = () => { if (peta.getLayer("konsesi-walhi")) peta.setLayoutProperty("konsesi-walhi", "visibility", Peta.lihat("konsesi") && peta.getLayer("konsesi") ? "visible" : "none"); };
    peta.on("styledata", () => nanti(garis)); garis();
    $("#lapis")?.addEventListener("change", e => { if (e.target.dataset?.l === "konsesi") setTimeout(() => { garis(); sinkron(); }, 400); });
  }
  /* tooltip poligon konsesi (konsesi.js memanggil ini): logo grup (kalau ada), nama pemegang, grup, bendera, titik panas VIIRS */
  A.kartuPoligon = p => {
    const w = A.d && !A.d.gagal ? A.per[A.d.poligon[p.id]] : null, ng = w ? w.negara : [A.d?.grup_negara?.[p.grup]].filter(Boolean);
    const sub = [p.grup, p.kab].filter(Boolean).map(esc).join(" · ");
    return `<div class="tp2-h tp2-only"><div class="tp2-hr">${A.logo(p.grup, 20)}<b>${benderaDaf(ng, 11)}${esc(p.nama || "Areal konsesi")}</b></div><small>${sub}</small>${w && w.cek?.titik_viirs != null && w.cek.lokasi !== "beda" ? `<small class="ak-tw2">${fmt(w.cek.titik_viirs)} titik panas Jan–Agu 2026 (VIIRS)</small>` : ""}</div>`; };
  A.muat();
})();
