"use strict";
/* laporan_konsesi.js: Laporan Konsesi Terbakar 2026 (/laporan-konsesi, hanya *.workers.dev / Centurisk97, pemilik 18 Okt 2026).
   Data: data/konsesi2026/index.json + <kode prov>.json (scripts/data/konsesi_laporan.py, dijalankan manual).
   Peta per perusahaan digambar satu-satu di satu peta MapLibre tersembunyi lalu disimpan jadi gambar (batas konteks WebGL
   peramban ~16), jadi profil berapa pun bisa dicetak. Titik di areal konsesi bukan bukti siapa yang membakar. */
(() => {
  const situsW = document.documentElement.dataset.situs === "w" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!situsW) { $("#knIsi").innerHTML = `<div class="kosong">Halaman ini tidak tersedia.</div>`; document.querySelectorAll(".kn-saring,.lp-aksi").forEach(x => x.remove()); return; }

  const JN = {sawit: ["Sawit", "#c98a3c", "Perkebunan kelapa sawit (HGU/IUP)"], hti: ["HTI", "#6b8e3a", "Hutan tanaman industri (PBPH-HT, pulp & kertas)"],
    hph: ["HPH", "#2f6f8f", "Hutan alam (PBPH-HA, penebangan kayu)"], tambang: ["Tambang", "#7a5c99", "Izin pinjam pakai kawasan hutan untuk tambang (PPKH)"]};
  /* instansi pemilik peta batas per jenis (scripts/scrape/lahan.py, konsesi.geojson "sumber"). Bukan ATR/BPN: HGU tidak dipakai */
  const SB = {sawit: ["KLHK", "Peta izin perkebunan sawit KLHK (data 2012, diperbarui 2014), diunduh lewat Global Forest Watch"],
    hti: ["KLHK / Kemenhut", "Izin PBPH-HT KLHK/Kemenhut, dihimpun Trase 2026 (Indonesia wood pulp concessions v3)"],
    hph: ["KLHK", "Peta izin PBPH-HA (HPH) KLHK 2014, diunduh lewat Global Forest Watch"],
    tambang: ["Kemenhut", "PPKH Ditjen Planologi Kehutanan, Kementerian Kehutanan (Jan 2026)"]};
  const SB_LAIN = [["Titik panas", "NASA FIRMS", "VIIRS S-NPP 375 m, keyakinan nominal/tinggi (arsip SP + NRT)"],
    ["Kawasan hutan", "KLHK", "Peta kawasan hutan KLHK versi 2017, lewat Global Forest Watch"],
    ["Lahan gambut", "CIFOR", "Miettinen dkk. 2016 + Gumbricht dkk. 2017, lewat Global Forest Watch"],
    ["Batas wilayah", "Kemendagri", "Kode dan batas provinsi, kabupaten/kota, kecamatan Kemendagri"],
    ["Grup & pemegang saham", "WALHI", "Kajian Eksekutif Nasional WALHI 2026 \"Siapa di Balik Api?\""],
    ["Citra peta", "Google, Esri, NASA GIBS", "Citra satelit dasar; VIIRS S-NPP warna asli dari NASA GIBS"]];
  const KWS = {HK: "Hutan konservasi", HL: "Hutan lindung", HP: "Hutan produksi", HPT: "Hutan produksi terbatas", HPK: "Hutan produksi konversi",
    KSA: "Kawasan suaka alam", KPA: "Kawasan pelestarian alam", THR: "Taman hutan raya", APL: "Areal penggunaan lain"};
  const NEG = {ID: "Indonesia", SG: "Singapura", MY: "Malaysia", JP: "Jepang", US: "Amerika Serikat", TH: "Thailand", GB: "Inggris", IN: "India", KR: "Korea Selatan", KY: "Kep. Cayman", VG: "Kep. Virgin Britania", WS: "Samoa"};
  const BNPB = ["14", "15", "16", "61", "62", "63"], PRIO = [...BNPB, "93", "64", "53"];
  /* logo grup: sama dengan aktor.js (favicon resmi di img/logo-grup) */
  const LOGO = [[/Nordic Forest|Stora Enso/i, "stora-enso"], [/Salween|GIC/i, "gic"], [/Gochean|TPG/i, "tpg"], [/Sampoerna|AGPA/i, "sampoerna-agro"], [/POSCO/i, "posco"],
    [/Musim Mas/i, "musim-mas"], [/^Wilmar/i, "wilmar"], [/APP|Asia Pulp/i, "app"], [/Sinar Mas/i, "sinar-mas"], [/APRIL/i, "april"], [/RGE|Royal Golden/i, "rge"],
    [/Sime Darby|Synergy Drive/i, "sime-darby"], [/Genting/i, "genting"], [/Jcorp/i, "jcorp"], [/Lion Group/i, "lion"],
    [/Salim|Indofood/i, "salim"], [/London Sumatra|Lonsum/i, "lonsum"], [/Medco/i, "medco"], [/Perkebunan Nusantara|PTPN/i, "ptpn"], [/Goodhope/i, "goodhope"],
    [/Cargill/i, "cargill"], [/Barito/i, "barito"], [/Charoen Pokphand/i, "cp"], [/Sumitomo/i, "sumitomo"]];
  const logo = (n, h = 22) => { const f = LOGO.find(([re]) => re.test(n || ""))?.[1]; return f ? `<img class="kn-lg" src="/img/logo-grup/${f}.png" alt="" width="${h}" height="${h}">`
    : n ? `<span class="kn-lg kn-lg-i" style="width:${h}px;height:${h}px;font-size:${Math.round(h * .42)}px" aria-hidden="true">${esc(n.replace(/^(PT|Grup)\s+/i, "").split(/[\s/,()-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase())}</span>` : ""; };
  const bendera = (k, h = 14) => k && NEG[k] ? `<img class="kn-bd" src="/img/bendera/${k.toLowerCase()}.svg" alt="${NEG[k]}" title="${NEG[k]}" width="${Math.round(h * 4 / 3)}" height="${h}">` : "";
  /* grup di peta konsesi yang tidak ada di kajian WALHI: nama rapi + negara induk (kantor pusat grup) */
  const GRUP_RAPI = {"Adr": "ADR Group", "Government": "BUMN (Perhutani/Inhutani)", "RGE Group": "Royal Golden Eagle", "Sime Darby, Synergy Drive": "Sime Darby"};
  const NEG_GRUP = {"Marubeni": "JP", "Sumitomo": "JP", "Cargill": "US", "Charoen Pokphand": "TH", "MP Evans Group PLC (MPE)": "GB", "PTT Green Energy Pte Ltd (PTTGE)": "TH",
    "Wilmar": "SG", "Musim Mas": "SG", "First Resources": "SG", "Royal Golden Eagle": "SG", "RGE/APRIL": "SG", "Sinar Mas": "SG", "Salim Group": "SG", "Goodhope Asia Holdings": "SG",
    "Sime Darby": "MY", "Genting Group": "MY", "BHD Group": "MY", "Lion Group": "MY", "Sampoerna Agro/POSCO": "ID", "Sampoerna Agro": "ID",
    "Astra International": "ID", "Duta Palma Group": "ID", "Surya Dumai Group": "ID", "Incasi Raya": "ID", "Lyman Group": "ID", "Ganda Group": "ID", "Perkebunan Nusantara": "ID",
    "Barito Pacific": "ID", "Bakrie Group": "ID", "Medco Group": "ID", "Djarum Group": "ID", "Sambu Group": "ID", "Rokan Group": "ID", "Berca Group": "ID", "Wings": "ID",
    "Sungai Budi Group": "ID", "Media Group": "ID", "ADR Group": "ID", "BUMN (Perhutani/Inhutani)": "ID", "Borneo Group": "ID", "Kaestindo Group": "ID", "SIMP": "ID"};
  const rapikan = r => { if (r._rapi) return r; r._rapi = 1; r.grup = GRUP_RAPI[r.grup] ?? r.grup;
    if (!(r.negara || []).length && NEG_GRUP[r.grup]) r.negara = [NEG_GRUP[r.grup]]; return r; };
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = d => d ? `${+d.slice(8, 10)} ${BLN[+d.slice(5, 7) - 1]}` : "–";
  const tglT = d => d ? `${tgl(d)} 2026` : "–";
  const rentang = (a, b) => a === b ? tgl(a) : a.slice(5, 7) === b.slice(5, 7) ? `${+a.slice(8)}–${tgl(b)}` : `${tgl(a)} – ${tgl(b)}`;
  const ha = n => fmt(Math.round(n));
  const pct = p => p == null ? "–" : p > 0 && p < .005 ? "< 1%" : Math.round(p * 100) + "%";
  const jenisPil = j => `<span class="kn-j" style="--w:${JN[j]?.[1] || "#888"}">${JN[j]?.[0] || j}</span>`;

  const S = {prov: new Set(BNPB), jenis: new Set(Object.keys(JN)), cari: "", profil: 20, dasar: "google", urut: "titik"};
  let IDX = null; const DATA = {}; let daftar = [];
  const gambar = new Map();   // id + dasar -> [citra, viirs]

  fetch("/data/konsesi2026/index.json").then(r => r.json()).then(d => { IDX = d; gambarKendali(); muat(); })
    .catch(() => { $("#knIsi").innerHTML = `<div class="kosong">Data laporan belum tersedia.</div>`; });

  /* pemilih provinsi bercari: rupa PilihCantik (kartu.css .pc/.pc-menu) + kotak cari di atas daftar */
  const GAB = [["bnpb", "6 provinsi BNPB"], ["9", "9 provinsi prioritas"], ["semua", "Semua provinsi"]];
  let pilihProv = "bnpb", menuP = null;
  const opsiProv = () => [...GAB.map(([v, n]) => ({v, n, g: 1})), ...IDX.prov.slice().sort((a, b) => a.nama.localeCompare(b.nama, "id")).map(p => ({v: p.kode, n: p.nama, t: p.perusahaan}))];
  function gambarKendali() { $("#knProv span").textContent = GAB.find(g => g[0] === pilihProv)?.[1] || namaProv(pilihProv); }
  const tutupProv = () => { menuP?.remove(); menuP = null; $(".kn-pp").classList.remove("on"); };
  function bukaProv() {
    if (menuP) return tutupProv();
    const w = $(".kn-pp"), r = w.getBoundingClientRect(); w.classList.add("on");
    menuP = document.createElement("div"); menuP.className = "pc-menu kn-pp-menu"; menuP.setAttribute("role", "listbox");
    menuP.innerHTML = `<input type="search" placeholder="Cari provinsi…" aria-label="Cari provinsi"><div class="kn-pp-daf"></div>`;
    document.body.append(menuP);
    Object.assign(menuP.style, {left: r.left + "px", width: Math.max(r.width, 260) + "px", top: r.bottom + 6 + "px"});
    const daf = menuP.querySelector(".kn-pp-daf"), cari = menuP.querySelector("input");
    const isi = q => { const o = opsiProv().filter(x => !q || x.n.toLowerCase().includes(q));
      daf.innerHTML = o.map((x, i) => `${i && o[i - 1].g && !x.g ? '<hr>' : ""}<button type="button" role="option" data-v="${x.v}" aria-selected="${x.v === pilihProv}">${esc(x.n)}${x.t ? `<em>${fmt(x.t)}</em>` : ""}</button>`).join("") || `<p class="kn-mt">Tidak ada provinsi "${esc(q)}"</p>`; };
    isi(""); cari.focus();
    cari.addEventListener("input", () => isi(cari.value.trim().toLowerCase()));
    cari.addEventListener("keydown", e => { if (e.key === "Enter") daf.querySelector("button")?.click(); if (e.key === "Escape") { tutupProv(); $("#knProv").focus(); } if (e.key === "ArrowDown") { e.preventDefault(); daf.querySelector("button")?.focus(); } });
    daf.addEventListener("keydown", e => { const bs = [...daf.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); bs[i + 1]?.focus(); } else if (e.key === "ArrowUp") { e.preventDefault(); (bs[i - 1] || cari).focus(); } else if (e.key === "Escape") { tutupProv(); $("#knProv").focus(); } });
    daf.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (!b) return;
      pilihProv = b.dataset.v; tutupProv(); gambarKendali();
      S.prov = new Set(pilihProv === "bnpb" ? BNPB : pilihProv === "9" ? PRIO : pilihProv === "semua" ? IDX.prov.map(p => p.kode) : [pilihProv]);
      setTimeout(muat); });
  }
  $("#knProv").addEventListener("click", e => { e.stopPropagation(); bukaProv(); });
  document.addEventListener("click", e => { if (menuP && !e.target.closest(".kn-pp-menu")) tutupProv(); });
  addEventListener("resize", tutupProv);
  addEventListener("scroll", e => { if (menuP && !e.target.closest?.(".kn-pp-menu")) tutupProv(); }, true);
  const tunda = (f, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
  $("#knCari").addEventListener("input", tunda(e => { S.cari = e.target.value.trim().toLowerCase(); render(); }));
  document.querySelector(".kn-saring").addEventListener("click", e => {
    const b = e.target.closest(".seg button"); if (!b) return;
    const g = b.parentElement.dataset.grup, v = b.dataset.v;
    b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    if (g === "jenis") S.jenis = new Set(v === "semua" ? Object.keys(JN) : [v]);
    else if (g === "profil") S.profil = +v; else S[g] = v;
    setTimeout(render);   /* gambar ulang di luar jalur klik (INP) */
  });
  $("#tema").addEventListener("click", () => { const d = document.documentElement, t = d.dataset.theme === "dark" ? "light" : "dark"; d.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {} });

  function muat() {
    const perlu = [...S.prov].filter(k => !DATA[k]);
    status(perlu.length ? "Memuat data provinsi…" : "");
    Promise.all(perlu.map(k => fetch(`/data/konsesi2026/${k}.json`).then(r => r.json()).then(d => { d.perusahaan.forEach(rapikan); DATA[k] = d; }))).then(() => { status(""); render(); })
      .catch(() => status("Sebagian data provinsi gagal dimuat."));
  }
  const status = t => { $("#knStatus").textContent = t; };
  const namaProv = k => IDX.prov.find(p => p.kode === k)?.nama || k;

  const kabUtama = r => (r.kab_titik?.length ? r.kab_titik : r.kab)[0] || "Tidak diketahui";
  const urut = (a, b) => (b[S.urut] ?? -1) - (a[S.urut] ?? -1) || b.titik - a.titik;
  const jumlah = rs => rs.reduce((a, r) => (a.t += r.titik, a.l += r.luas_bakar_ha, a.k += r.luas_ha, a.a += r.titik_7h > 0, a), {t: 0, l: 0, k: 0, a: 0});

  /* susunan: provinsi -> kabupaten/kota -> perusahaan; daftar = urutan datar, r._i = indeks profil */
  let SUSUN = [];
  function saring() {
    SUSUN = [];
    for (const k of S.prov) {
      const rs = (DATA[k]?.perusahaan || []).filter(r => S.jenis.has(r.jenis) && (!S.cari || (r.nama + " " + r.grup).toLowerCase().includes(S.cari)))
        .map(r => Object.assign(r, {prov: k, kabU: kabUtama(r)})).sort(urut);
      if (!rs.length) continue;
      rs.forEach((r, j) => { r._rp = j + 1; });
      const kab = {}; rs.forEach(r => (kab[r.kabU] ||= []).push(r));
      SUSUN.push({k, rs, kab: Object.entries(kab).sort((a, b) => jumlah(b[1]).t - jumlah(a[1]).t)});
    }
    SUSUN.sort((a, b) => jumlah(b.rs).t - jumlah(a.rs).t);
    const out = [];
    SUSUN.forEach(p => p.kab.forEach(([, rs]) => rs.forEach(r => { r._i = out.length; out.push(r); })));
    return out;
  }
  const tampilProfil = r => r._rp <= S.profil || BUKA.has(r.id);
  const BUKA = new Set();

  const tabelUsaha = rs => `<div class="tw"><table class="kn-tb kn-rk"><thead><tr><th>No</th><th>Perusahaan</th><th>Jenis</th><th>Kecamatan</th><th class="r">Luas konsesi (ha)</th><th class="r">Titik</th><th class="r">Terbakar (ha)</th><th>Periode api</th><th class="r">Hari bertitik</th><th class="r">7 hari</th></tr></thead><tbody>
    ${rs.map((r, j) => `<tr><td>${j + 1}</td><td><a href="#p${r._i}" class="kn-nm" data-buka="${r._i}">${esc(r.nama)}</a>${r.grup ? `<small>${bendera(r.negara?.[0], 10)}${esc(r.grup)}</small>` : ""}</td><td>${jenisPil(r.jenis)}</td>
      <td>${esc(r.kec.slice(0, 2).map(k => k.split(",")[0]).join(", ") || "–")}</td><td class="r">${ha(r.luas_ha)}</td><td class="r"><b>${fmt(r.titik)}</b></td>
      <td class="r">${ha(r.luas_bakar_ha)}<small>${pct(r.persen_bakar)}</small></td><td>${rentang(r.pertama, r.terakhir)}</td><td class="r">${fmt(r.hari_aktif)}</td>
      <td class="r">${r.titik_7h ? `<span class="kn-ak">${fmt(r.titik_7h)}</span>` : "–"}</td></tr>`).join("")}
    </tbody></table></div>`;

  function kpi(rs) {
    const T = jumlah(rs), t7 = rs.reduce((a, r) => a + r.titik_7h, 0), top = rs.reduce((a, r) => r.titik > a.titik ? r : a, rs[0]);
    const pj = Object.keys(JN).map(j => [j, rs.filter(r => r.jenis === j).length]).filter(([, n]) => n);
    const ubin = (lbl, nilai, ket, cls = "") => `<div class="${cls}"><span class="kn-kpi-l">${lbl}</span><b>${nilai}</b><small>${ket}</small></div>`;
    return `<section class="kn-kpi">
      ${ubin("Konsesi terbakar", fmt(rs.length), pj.map(([j, n]) => `${JN[j][0]} ${fmt(n)}`).join(" · "))}
      ${ubin("Titik panas", fmt(T.t), `terbanyak di ${esc(top.nama)} (${fmt(top.titik)})`)}
      ${ubin("Indikasi luas terbakar", `${ha(T.l)}<em> ha</em>`, `${pct(T.k ? T.l / T.k : 0)} dari ${ha(T.k)} ha luas konsesi`)}
      ${ubin("Masih ada api", fmt(T.a), `konsesi · ${fmt(t7)} titik 7 hari terakhir`, "kn-kpi-a")}</section>`;
  }
  const batang = (v, mx, w = "#d9534f") => `<span class="kn-bt"><i style="width:${mx ? Math.max(2, v / mx * 100) : 0}%;background:${w}"></i></span>`;
  function tabelJenis(rs) {
    const T = jumlah(rs), perJ = Object.keys(JN).map(j => [j, rs.filter(r => r.jenis === j), jumlah(rs.filter(r => r.jenis === j))]).filter(([, x]) => x.length);
    const mx = Math.max(...perJ.map(x => x[2].t));
    return `<div class="tw"><table class="kn-tb kn-tj"><thead><tr><th>Jenis usaha</th><th class="r">Perusahaan</th><th class="kn-cb">Titik panas</th><th class="r">Luas konsesi (ha)</th><th class="r">Indikasi terbakar (ha)</th></tr></thead><tbody>
      ${perJ.map(([j, x, t]) => `<tr><td><span class="kn-jn"><i style="background:${JN[j][1]}"></i><b>${JN[j][0]} <span class="kn-sb" title="Sumber peta batas">${SB[j][0]}</span></b><small>${JN[j][2]}</small></span></td>
        <td class="r">${fmt(x.length)}</td><td class="kn-cb"><span class="kn-cbi">${batang(t.t, mx, JN[j][1])}<b class="num">${fmt(t.t)}</b></span></td><td class="r">${ha(t.k)}</td><td class="r">${ha(t.l)}</td></tr>`).join("")}
      <tr class="kn-tot"><td>Jumlah</td><td class="r">${fmt(rs.length)}</td><td class="r">${fmt(T.t)}</td><td class="r">${ha(T.k)}</td><td class="r">${ha(T.l)}</td></tr></tbody></table></div>`;
  }
  function tabelGrup(rs) {
    const grup = {}; rs.forEach(r => { if (r.grup) { const g = grup[r.grup] ||= {n: 0, t: 0, l: 0, neg: r.negara}; g.n++; g.t += r.titik; g.l += r.luas_bakar_ha; } });
    const u = Object.entries(grup).sort((a, b) => b[1].t - a[1].t).slice(0, 15), mx = u[0]?.[1].t || 1;
    return u.length ? `<h3>Grup perusahaan</h3><div class="tw"><table class="kn-tb"><thead><tr><th>Grup</th><th>Negara induk</th><th class="r">Perusahaan</th><th class="kn-cb">Titik panas</th><th class="r">Indikasi terbakar (ha)</th></tr></thead><tbody>
      ${u.map(([g, v]) => `<tr><td><span class="kn-gr">${logo(g, 22)}<b>${esc(g)}</b></span></td><td>${(v.neg || []).map(k => `<span class="kn-ng">${bendera(k, 13)}${NEG[k] || k}</span>`).join(" ") || `<span class="kn-mt">Belum diketahui</span>`}</td>
        <td class="r">${fmt(v.n)}</td><td class="kn-cb"><span class="kn-cbi">${batang(v.t, mx, "#0b2545")}<b class="num">${fmt(v.t)}</b></span></td><td class="r">${ha(v.l)}</td></tr>`).join("")}
      </tbody></table></div>` : "";
  }

  function render() {
    daftar = saring();
    const P = [...S.prov].map(namaProv);
    $("#knJudul").textContent = "Laporan Konsesi Terbakar 2026" + (P.length === 1 ? " · " + P[0] : "");
    $("#knPils").innerHTML = `<span class="lp-pil">1 Jan – ${tglT(IDX.sampai.slice(0, 10))}</span><span class="lp-pil ok">Data s.d. ${esc(IDX.sampai.slice(11))}</span>${P.length > 1 ? `<span class="lp-pil">${fmt(P.length)} provinsi</span>` : ""}`;
    document.title = `Laporan Konsesi Terbakar 2026 ${P.length === 1 ? P[0] : ""}`.trim();
    if (!daftar.length) { $("#knIsi").innerHTML = `<div class="kosong">${S.prov.size ? "Tidak ada areal konsesi bertitik panas untuk pilihan ini." : "Pilih minimal satu provinsi."}</div>`; return; }
    const T = jumlah(daftar);
    $("#knIsi").innerHTML = `
      <div class="kn-nas">
      ${kpi(daftar)}
      ${SUSUN.length > 1 ? `<section class="kn-kartu"><h2>Ringkasan per provinsi</h2>
        <div class="tw"><table class="kn-tb"><thead><tr><th>Provinsi</th><th class="r">Perusahaan</th><th class="r">Titik panas</th><th class="r">Indikasi terbakar (ha)</th><th class="r">Masih ada api</th><th>PDF</th></tr></thead><tbody>
        ${SUSUN.map(p => { const t = jumlah(p.rs); return `<tr><td><a class="kn-nm" href="#v${p.k}">${esc(namaProv(p.k))}</a></td><td class="r">${fmt(p.rs.length)}</td><td class="r">${fmt(t.t)}</td><td class="r">${ha(t.l)}</td><td class="r">${fmt(t.a)}</td><td><button type="button" class="kn-mini" data-pdf="${p.k}">Unduh PDF</button></td></tr>`; }).join("")}
        <tr class="kn-tot"><td>Jumlah</td><td class="r">${fmt(daftar.length)}</td><td class="r">${fmt(T.t)}</td><td class="r">${ha(T.l)}</td><td class="r">${fmt(T.a)}</td><td></td></tr></tbody></table></div></section>` : ""}
      <section class="kn-kartu"><h2>Per jenis usaha</h2>${tabelJenis(daftar)}${tabelGrup(daftar)}</section>
      <section class="kn-kartu kn-pt"><h2>Peta sebaran</h2><div id="knPeta" class="kn-peta"></div>${legenda()}</section>
      </div>
      ${SUSUN.map(p => { const t = jumlah(p.rs); return `<section class="kn-provsek" id="v${p.k}" data-prov="${p.k}">
        <header class="kn-provh"><div><span class="lbl">Provinsi</span><h2>${esc(namaProv(p.k))}</h2></div><button type="button" class="kn-mini kn-utama" data-pdf="${p.k}">Unduh PDF ${esc(namaProv(p.k))}</button></header>
        ${kpi(p.rs)}
        <section class="kn-kartu"><h2>Per kabupaten/kota</h2>
          <div class="tw"><table class="kn-tb"><thead><tr><th>No</th><th>Kabupaten/kota</th><th>Perusahaan di wilayah ini</th><th class="r">Titik panas</th><th class="r">Indikasi terbakar (ha)</th><th class="r">Masih ada api</th></tr></thead><tbody>
          ${p.kab.map(([kb, rs], j) => { const x = jumlah(rs); return `<tr><td>${j + 1}</td><td><a class="kn-nm" href="#v${p.k}-${j}">${esc(kb)}</a><small>${fmt(rs.length)} perusahaan</small></td>
            <td><span class="kn-pl">${rs.map(r => `<a href="#p${r._i}" data-buka="${r._i}" class="kn-pli"><i style="background:${JN[r.jenis][1]}"></i>${esc(r.nama)}<em>${fmt(r.titik)}</em></a>`).join("")}</span></td><td class="r">${fmt(x.t)}</td><td class="r">${ha(x.l)}</td><td class="r">${fmt(x.a)}</td></tr>`; }).join("")}
          </tbody></table></div>
          <h3>Per jenis usaha</h3>${tabelJenis(p.rs)}${tabelGrup(p.rs)}
          <h3>Peta provinsi</h3><figure class="kn-pv"><div class="kn-img kn-img-l" data-pv="${p.k}"><span>Menggambar peta…</span></div><figcaption>Batas konsesi bertitik panas dan titik panas 2026 di ${esc(namaProv(p.k))}</figcaption></figure>${legenda()}
        </section>
        ${p.kab.map(([kb, rs], j) => `<section class="kn-kabsek" id="v${p.k}-${j}">
          <section class="kn-kartu"><div class="kn-kabh"><span class="lbl">${esc(namaProv(p.k))} · Kabupaten/kota</span><h2>${esc(kb)}</h2>
            <p class="kn-mt">${fmt(rs.length)} perusahaan · ${fmt(jumlah(rs).t)} titik panas · ${ha(jumlah(rs).l)} ha indikasi terbakar</p></div>
            ${tabelUsaha(rs)}</section>
          ${rs.filter(tampilProfil).map(r => profil(r, r._i)).join("")}
        </section>`).join("")}
      </section>`; }).join("")}
      <section class="kn-kartu kn-metode">
        <h2>Sumber dan cara hitung</h2>
        <div class="tw"><table class="kn-tb"><thead><tr><th>Data</th><th>Instansi</th><th>Rincian</th></tr></thead><tbody>
          ${Object.entries(SB).map(([j, [i, t]]) => `<tr><td>Batas konsesi ${JN[j][0]}</td><td><span class="kn-sb">${i}</span></td><td class="kn-mt">${t}</td></tr>`).join("")}
          ${SB_LAIN.map(([d, i, t]) => `<tr><td>${d}</td><td><span class="kn-sb">${i}</span></td><td class="kn-mt">${esc(t)}</td></tr>`).join("")}
        </tbody></table></div>
        <ul>
          <li><b>Titik panas:</b> ${esc(IDX.sumber_titik)}. Hari dihitung kalender WIB. ${esc(IDX.celah)}, jadi angka Mei–Juni lebih rendah dari kenyataan.</li>
          <li><b>Batas konsesi:</b> peta izin, bukan sertifikat HGU ATR/BPN; batas berumur dan bisa sudah berubah.</li>
          <li><b>Kabupaten/kota perusahaan:</b> wilayah tempat titik panas terbanyak di konsesinya jatuh (batas Kemendagri).</li>
          <li><b>Indikasi luas terbakar:</b> jumlah piksel VIIRS 375 m yang kemasukan titik × ${fmt(IDX.ha_piksel)} ha, paling besar seluas konsesi. Bukan peta luas bakar resmi; piksel bisa terbakar sebagian.</li>
          <li><b>Kejadian:</b> rangkaian hari bertitik panas dengan jeda paling lama ${IDX.jeda_kejadian} hari tanpa titik.</li>
          <li><b>Grup, pemegang saham, keterangan:</b> kajian Eksekutif Nasional WALHI (2026) <i>Siapa di Balik Api?</i> dan atribut grup di peta konsesi.</li>
          <li><b>Kompleks api:</b> kelompok titik VIIRS berdekatan (1,5 km, 7 hari) seperti di peta Centurisk97.</li>
          <li>Titik panas di dalam areal konsesi menunjukkan lokasi api, <b>bukan bukti siapa yang membakar</b>. Verifikasi lapangan tetap diperlukan.</li>
        </ul>
        <p class="kn-mt">Disusun ${esc(IDX.dibuat.replace("T", " "))} UTC.</p>
      </section>`;
    petaUtama();
    pasangGambar();
  }

  const wilayah = r => (r.kab_titik?.length ? r.kab_titik : r.kab).slice(0, 2).join(", ") || "–";
  const legenda = () => `<div class="kn-leg"><span><i class="kn-lg-p"></i>Batas konsesi</span><span><i class="kn-lg-t" style="background:#ffcc00"></i>Titik panas 2026</span><span><i class="kn-lg-t" style="background:#ff2d2d"></i>Titik 7 hari terakhir</span></div>`;

  function grafik(r) {
    const a = Date.parse("2026-01-01"), b = Date.parse(IDX.sampai.slice(0, 10)), hari = Math.round((b - a) / 864e5) + 1;
    const W = 720, H = 110, bw = W / hari, mx = Math.max(...r.harian.map(x => x[1]));
    const bar = r.harian.map(([d, n]) => { const x = (Date.parse(d) - a) / 864e5 * bw, h = Math.max(1.5, n / mx * (H - 8));
      return `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${Math.max(1.2, bw * .8).toFixed(1)}" height="${h.toFixed(1)}"><title>${tgl(d)}: ${fmt(n)} titik</title></rect>`; }).join("");
    const bl = BLN.slice(0, new Date(b).getUTCMonth() + 1).map((m, i) => { const x = (Date.parse(`2026-${String(i + 1).padStart(2, "0")}-01`) - a) / 864e5 * bw; return `<text x="${x + 2}" y="${H + 16}">${m}</text><line x1="${x}" x2="${x}" y1="${H}" y2="${H + 4}"/>`; }).join("");
    return `<div class="kn-gr-h"><span class="kn-tk">${fmt(r.titik)}</span> titik panas · puncak <b>${tgl(r.puncak[0])}</b> (${fmt(r.puncak[1])})</div>
      <svg class="kn-svg" viewBox="0 -2 ${W} ${H + 22}" preserveAspectRatio="none" role="img" aria-label="Titik panas harian 2026"><line x1="0" x2="${W}" y1="${H}" y2="${H}" class="kn-ax"/><g class="kn-br">${bar}</g><g class="kn-bl">${bl}</g></svg>`;
  }

  function profil(r, i) {
    const kw = Object.entries(r.kawasan || {}).filter(([, v]) => v >= .01).map(([f, v]) => `${KWS[f] || f} ${pct(v)}`).join(", ") || "Di luar kawasan hutan tercatat";
    const ps = r.pemegang || [];
    const terlama = r.kejadian.reduce((a, e) => e[2] > a[2] ? e : a, r.kejadian[0]);
    const tglDaf = {};
    r.harian.forEach(([d, n]) => (tglDaf[d.slice(5, 7)] ||= []).push([d, n]));
    const g = gambar.get(r.id + S.dasar);
    const [la, lo] = r.pusat;
    return `<article class="kn-kartu kn-prof" id="p${i}" data-i="${i}">
      <header class="kn-ph">
        <span class="kn-no">${r._rp}</span>
        <div><span class="lbl">${esc(r.kabU)}, ${esc(namaProv(r.prov))}</span><h2>${esc(r.nama)}</h2>
          <div class="kn-ph-m">${jenisPil(r.jenis)}${r.grup ? `<span class="kn-grp">${logo(r.grup, 20)}${(r.negara || []).map(k => bendera(k, 15)).join("")}<b>${esc(r.grup)}</b></span>` : ""}
          ${r.titik_7h ? `<span class="kn-ak">Masih ada api: ${fmt(r.titik_7h)} titik 7 hari terakhir</span>` : ""}</div></div>
      </header>
      <div class="kn-ubin">
        <div><b>${fmt(r.titik)}</b><span>titik panas 2026</span></div>
        <div><b>${ha(r.luas_bakar_ha)} ha</b><span>indikasi terbakar (${pct(r.persen_bakar)} konsesi)</span></div>
        <div><b>${fmt(r.hari_aktif)} hari</b><span>bertitik panas, ${r.kejadian.length} kejadian</span></div>
        <div><b>${fmt(r.titik_7h)}</b><span>titik 7 hari terakhir</span></div>
      </div>
      <div class="kn-dua">
        <dl class="kn-id">
          <dt>Nama perusahaan</dt><dd>${esc(r.nama)}</dd>
          <dt>Jenis usaha</dt><dd>${JN[r.jenis]?.[2] || r.jenis}</dd>
          <dt>Grup usaha</dt><dd>${r.grup ? `<span class="kn-grp">${logo(r.grup, 18)}${esc(r.grup)}</span>${(r.negara || []).length ? `<small>${r.negara.map(k => `${bendera(k, 12)} ${NEG[k] || k}`).join(", ")}</small>` : ""}` : "Belum teridentifikasi"}</dd>
          ${ps.length ? `<dt>Pemegang saham</dt><dd>${ps.map(x => `<span class="kn-ps">${bendera(x.negara, 12)}${esc(x.nama)}</span>`).join("")}</dd>` : ""}
          ${(r.tokoh || []).length ? `<dt>Tokoh terkait</dt><dd>${r.tokoh.map(t => `<span class="kn-ps"><b>${esc(t.nama)}</b> · ${esc(t.peran)}<small>${esc(t.kaitan)}</small></span>`).join("")}</dd>` : ""}
          <dt>Sumber data batas</dt><dd><span class="kn-sb">${SB[r.jenis]?.[0] || "–"}</span><small>${SB[r.jenis]?.[1] || ""}</small></dd>
          <dt>Luas konsesi</dt><dd>${ha(r.luas_ha)} ha <small>${r.blok} blok, peta ${r.tahun_data || "–"}</small></dd>
          <dt>Provinsi</dt><dd>${esc(namaProv(r.prov))}</dd>
          <dt>Kabupaten/kota</dt><dd>${esc((r.kab_titik?.length ? r.kab_titik : r.kab).join(", ") || "–")}</dd>
          <dt>Kecamatan</dt><dd>${esc(r.kec.map(k => k.split(",")[0]).join(", ") || "–")}</dd>
          <dt>Periode api</dt><dd>${tglT(r.pertama)} – ${tglT(r.terakhir)} <small>rentang ${fmt(r.rentang_hari)} hari, ${fmt(r.hari_aktif)} hari bertitik</small></dd>
          <dt>Kejadian terlama</dt><dd>${rentang(terlama[0], terlama[1])} <small>${fmt(terlama[2])} hari, ${fmt(terlama[3])} titik</small></dd>
          <dt>Lahan gambut</dt><dd>${pct(r.gambut)} titik di gambut</dd>
          <dt>Status kawasan</dt><dd>${esc(kw)}</dd>
          <dt>Daya api</dt><dd>maks ${fmt(r.frp_maks)} MW <small>FRP total ${fmt(r.frp_total)} MW</small></dd>
          <dt>Titik tengah api</dt><dd class="num">${la}, ${lo} <a class="kn-ln" href="https://www.google.com/maps/dir/?api=1&destination=${la},${lo}" target="_blank" rel="noopener">Rute Google Maps</a></dd>
          ${r.walhi_ket ? `<dt>Keterangan</dt><dd>${esc(r.walhi_ket)}</dd>` : ""}
        </dl>
        <div class="kn-grafik">${grafik(r)}</div>
      </div>
      <div class="kn-peta2">
        <figure><div class="kn-img" data-k="0">${g ? `<img src="${g[0]}" alt="">` : `<span>Menggambar peta…</span>`}</div>
          <figcaption>${S.dasar === "google" ? "Google Satelit" : S.dasar === "esri" ? "Citra satelit Esri World Imagery" : "Peta jalan OpenStreetMap"}: batas konsesi dan ${fmt(r.titik)} titik panas 2026</figcaption></figure>
        <figure><div class="kn-img" data-k="1">${g ? `<img src="${g[1]}" alt="">` : `<span>Menggambar peta…</span>`}</div>
          <figcaption>Citra VIIRS S-NPP warna asli ${tglT(r.puncak[0])} (hari puncak, NASA GIBS): titik panas hari itu</figcaption></figure>
      </div>
      ${legenda()}
      <div class="kn-dua kn-dua-b">
        <div><h3>Kejadian kebakaran</h3>
          <div class="tw"><table class="kn-tb kn-kc"><thead><tr><th>No</th><th>Mulai</th><th>Selesai</th><th class="r">Lama</th><th class="r">Titik</th></tr></thead><tbody>
          ${r.kejadian.slice().reverse().map((e, j) => `<tr><td>${r.kejadian.length - j}</td><td>${tglT(e[0])}</td><td>${tglT(e[1])}</td><td class="r">${fmt(e[2])} hari</td><td class="r">${fmt(e[3])}</td></tr>`).join("")}
          </tbody></table></div>
          ${r.kompleks?.length ? `<h3>Kompleks api 7 hari terakhir</h3>
          <div class="tw"><table class="kn-tb"><thead><tr><th>No</th><th>Kompleks</th><th class="r">Titik panas</th><th>Rentang</th></tr></thead><tbody>
          ${r.kompleks.slice(0, 10).map((k, j) => `<tr><td>${j + 1}</td><td>${esc(k[0])}</td><td class="r">${fmt(k[1])}</td><td class="kn-mt">${rentang(k[2], k[3])}</td></tr>`).join("")}
          </tbody></table></div>${r.kompleks.length > 10 ? `<p class="kn-mt">dan ${fmt(r.kompleks.length - 10)} kompleks kecil lain</p>` : ""}` : ""}
        </div>
        <div><h3>Daftar titik panas per tanggal</h3>
          <div class="kn-tgl">${Object.entries(tglDaf).sort((a, b) => a[0].localeCompare(b[0])).map(([m, xs]) => `<div><b>${BLN[+m - 1]}</b><span>${xs.map(([d, n]) => `<i>${+d.slice(8)}<em>${fmt(n)}</em></i>`).join("")}</span></div>`).join("")}</div>
          <h3>Titik panas terbaru</h3>
          <div class="tw"><table class="kn-tb kn-tt"><thead><tr><th>No</th><th>Waktu</th><th>Koordinat</th><th class="r">Daya api (MW)</th><th>Satelit</th></tr></thead><tbody>
          ${r.pt.slice(-12).reverse().map((p, j) => `<tr><td>${j + 1}</td><td>${tgl("2026-" + p[2].slice(0, 5))} ${p[2].slice(6)} WIB</td><td class="num">${p[0]}, ${p[1]}</td><td class="r">${fmt(p[3])}</td><td class="kn-mt">S-NPP</td></tr>`).join("")}
          </tbody></table></div>
        </div>
      </div>
      <div class="kn-aksi">
        <button type="button" data-kml="${i}">KML Google Earth</button>
        <button type="button" data-csv="${i}">Semua ${fmt(r.titik)} titik (CSV)</button>
        <a href="https://earth.google.com/web/@${la},${lo},800a,20000d,35y,0h,0t,0r" target="_blank" rel="noopener">Buka di Google Earth</a>
      </div>
    </article>`;
  }

  /* ---------- peta utama (interaktif) ---------- */
  const DASAR = {
    google: {tiles: ["https://mt0.google.com/vt/lyrs=y&hl=id&x={x}&y={y}&z={z}", "https://mt1.google.com/vt/lyrs=y&hl=id&x={x}&y={y}&z={z}"], attribution: "Citra © Google", maxzoom: 20},
    esri: {tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Citra © Esri, Maxar, Earthstar", maxzoom: 18},
    osm: {tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], attribution: "© OpenStreetMap", maxzoom: 19},
  };
  const gibs = d => ({tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`], attribution: "NASA GIBS / VIIRS S-NPP", maxzoom: 9});
  const batasTujuh = () => { const b = new Date(Date.parse(IDX.sampai.slice(0, 10)) - 6 * 864e5).toISOString().slice(5, 10); return b; };
  const fiturPoli = rs => ({type: "FeatureCollection", features: rs.flatMap((r, i) => r.geom.map(g => ({type: "Feature", properties: {i, nama: r.nama, w: JN[r.jenis]?.[1]}, geometry: g})))});
  const fiturTitik = (rs, hari) => { const b7 = batasTujuh();
    return {type: "FeatureCollection", features: rs.flatMap(r => r.pt.filter(p => !hari || p[2].startsWith(hari)).map(p => ({type: "Feature", properties: {b: p[2].slice(0, 5) >= b7 ? 1 : 0}, geometry: {type: "Point", coordinates: [p[1], p[0]]}})))}; };
  const gaya = (dasar, rs, hari, rad) => ({version: 8, sources: {d: {type: "raster", tileSize: 256, ...dasar}, p: {type: "geojson", data: fiturPoli(rs)}, t: {type: "geojson", data: fiturTitik(rs, hari)}},
    layers: [{id: "d", type: "raster", source: "d"},
      {id: "pf", type: "fill", source: "p", paint: {"fill-color": "#00e5ff", "fill-opacity": .08}},
      {id: "pl", type: "line", source: "p", paint: {"line-color": "#00e5ff", "line-width": 2.2}},
      {id: "t", type: "circle", source: "t", paint: {"circle-radius": rad, "circle-color": ["case", ["==", ["get", "b"], 1], "#ff2d2d", "#ffcc00"], "circle-stroke-color": "#3a0a00", "circle-stroke-width": .6, "circle-opacity": .92}}]});
  const bbox = rs => { let a = [180, 90, -180, -90]; const ad = ([x, y]) => { a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)]; };
    rs.forEach(r => { r.geom.forEach(g => (g.type === "MultiPolygon" ? g.coordinates.flat(2) : g.coordinates.flat(1)).forEach(ad)); r.pt.forEach(p => ad([p[1], p[0]])); }); return [[a[0], a[1]], [a[2], a[3]]]; };

  let peta = null;
  function petaUtama() {
    if (peta) { peta.remove(); peta = null; }
    const rs = daftar.slice(0, 300);   // ponytail: peta utama dibatasi 300 konsesi teratas supaya ringan
    peta = new maplibregl.Map({container: "knPeta", style: gaya(DASAR[S.dasar], rs, null, ["interpolate", ["linear"], ["zoom"], 5, 1.6, 10, 4]), bounds: bbox(rs), fitBoundsOptions: {padding: 30},
      attributionControl: {compact: true}, canvasContextAttributes: {preserveDrawingBuffer: true}, preserveDrawingBuffer: true});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}));
    peta.on("click", "pf", e => { const p = e.features[0].properties;
      new maplibregl.Popup({closeButton: true}).setLngLat(e.lngLat).setHTML(`<b>${esc(p.nama)}</b><br>${+p.i < S.profil ? `<a href="#p${p.i}">Lihat profil</a>` : `peringkat ${+p.i + 1}`}`).addTo(peta); });
    peta.on("mouseenter", "pf", () => { peta.getCanvas().style.cursor = "pointer"; });
    peta.on("mouseleave", "pf", () => { peta.getCanvas().style.cursor = ""; });
  }

  /* ---------- gambar peta per perusahaan: satu peta tersembunyi, antre ---------- */
  let kanvas = null, antre = Promise.resolve();
  const siapKanvas = () => kanvas ||= new maplibregl.Map({container: "knKanvas", style: {version: 8, sources: {}, layers: []}, interactive: false, attributionControl: false,
    preserveDrawingBuffer: true, canvasContextAttributes: {preserveDrawingBuffer: true}, fadeDuration: 0});
  const potret = (dasar, rs, hari) => new Promise(ok => {
    const m = siapKanvas();
    m.setStyle(gaya(dasar, rs, hari, 3.2), {diff: false});
    m.fitBounds(bbox(rs), {padding: 28, maxZoom: dasar.maxzoom === 9 ? 11 : 14, animate: false});
    let selesai = false;
    const ambil = () => { if (selesai) return; selesai = true; try { ok(m.getCanvas().toDataURL("image/jpeg", .86)); } catch (e) { ok(""); } };
    m.once("idle", ambil); setTimeout(ambil, 15000);
  });
  function gambarProfil(i) {
    const r = daftar[i], kunci = r.id + S.dasar;
    if (gambar.has(kunci)) return Promise.resolve();
    return antre = antre.then(async () => {
      if (gambar.has(kunci)) return;
      const a = await potret(DASAR[S.dasar], [r], null), b = await potret(gibs(r.puncak[0]), [r], r.puncak[0].slice(5));
      gambar.set(kunci, [a, b]);
      const el = document.getElementById("p" + i);
      if (el && daftar[i] === r) el.querySelectorAll(".kn-img").forEach(d => { const s = gambar.get(kunci)[+d.dataset.k]; d.innerHTML = s ? `<img src="${s}" alt="">` : `<span>Peta gagal digambar</span>`; });
    });
  }
  let io = null;
  function pasangGambar() {
    io?.disconnect();
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); e.target.dataset.pv ? gambarProv(e.target.dataset.pv) : gambarProfil(+e.target.dataset.i); } }), {rootMargin: "600px"});
    document.querySelectorAll(".kn-prof").forEach(el => io.observe(el));
    document.querySelectorAll("[data-pv]").forEach(el => io.observe(el));
  }
  const gambarPv = new Map();
  function gambarProv(k) {
    const kunci = k + S.dasar + S.jenis.size + S.cari;
    if (gambarPv.has(kunci)) { tulisPv(k, gambarPv.get(kunci)); return Promise.resolve(); }
    const rs = SUSUN.find(p => p.k === k)?.rs || [];
    return antre = antre.then(async () => { const g = await potret(DASAR[S.dasar], rs.slice(0, 300), null); gambarPv.set(kunci, g); tulisPv(k, g); });
  }
  const tulisPv = (k, g) => { const d = document.querySelector(`[data-pv="${k}"]`); if (d) d.innerHTML = g ? `<img src="${g}" alt="">` : `<span>Peta gagal digambar</span>`; };

  /* ---------- unduhan ---------- */
  const unduh = (nama, isi, tipe) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([isi], {type: tipe})); a.download = nama; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const sel = v => { const s = String(v ?? ""); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const xml = s => String(s ?? "").replace(/[&<>]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"}[c]));
  const berkas = s => s.replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");
  function kml(rs, judul) {
    const cin = r => r.map(c => `${c[0]},${c[1]},0`).join(" ");
    const pol = g => (g.type === "MultiPolygon" ? g.coordinates : [g.coordinates]).map(p => `<Polygon><outerBoundaryIs><LinearRing><coordinates>${cin(p[0])}</coordinates></LinearRing></outerBoundaryIs>${p.slice(1).map(h => `<innerBoundaryIs><LinearRing><coordinates>${cin(h)}</coordinates></LinearRing></innerBoundaryIs>`).join("")}</Polygon>`).join("");
    return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(judul)}</name>
<Style id="k"><LineStyle><color>ffffe500</color><width>2.5</width></LineStyle><PolyStyle><color>2effe500</color></PolyStyle></Style>
<Style id="t"><IconStyle><color>ff00ccff</color><scale>.6</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/shaded_dot.png</href></Icon></IconStyle></Style>
${rs.map(r => `<Folder><name>${xml(r.nama)}</name><Placemark><name>${xml(r.nama)}</name><description>${xml(`${JN[r.jenis]?.[0]} · ${r.grup || "grup belum teridentifikasi"} · luas ${ha(r.luas_ha)} ha · ${fmt(r.titik)} titik panas 2026 · indikasi terbakar ${ha(r.luas_bakar_ha)} ha`)}</description><styleUrl>#k</styleUrl><MultiGeometry>${r.geom.map(pol).join("")}</MultiGeometry></Placemark>
<Folder><name>Titik panas (${r.titik})</name>${r.pt.map(p => `<Placemark><TimeStamp><when>2026-${p[2].slice(0, 5)}T${p[2].slice(6)}:00+07:00</when></TimeStamp><description>${p[2]} WIB, ${p[3]} MW</description><styleUrl>#t</styleUrl><Point><coordinates>${p[1]},${p[0]},0</coordinates></Point></Placemark>`).join("")}</Folder></Folder>`).join("\n")}
</Document></kml>`;
  }
  $("#knIsi").addEventListener("click", e => {
    const b = e.target.closest("[data-buka]");
    if (b) { const r = daftar[+b.dataset.buka]; if (!document.getElementById("p" + r._i)) { e.preventDefault(); BUKA.add(r.id); const y = scrollY; render(); scrollTo(0, y); document.getElementById("p" + r._i)?.scrollIntoView({behavior: "smooth"}); } }
    const pd = e.target.closest("[data-pdf]");
    if (pd) cetak(pd.dataset.pdf);
    const k = e.target.closest("[data-kml]"), c = e.target.closest("[data-csv]");
    if (k) { const r = daftar[+k.dataset.kml]; unduh(`${berkas(r.nama)}_2026.kml`, kml([r], r.nama), "application/vnd.google-earth.kml+xml"); }
    if (c) { const r = daftar[+c.dataset.csv];
      unduh(`${berkas(r.nama)}_titik_2026.csv`, "﻿lintang,bujur,waktu_wib,frp_mw,satelit\n" + r.pt.map(p => [p[0], p[1], `2026-${p[2]}`, p[3], "VIIRS S-NPP"].join(",")).join("\n"), "text/csv"); }
  });
  /* kop & kaki kertas cetak = kotak margin @page (standar Laporan Harian laporan.js: SVG berukuran tetap, bukan elemen fixed) */
  let LOGO_SVG = ""; fetch("/img/logo.svg?v=2").then(r => r.text()).then(t => { LOGO_SVG = t.replace(/<title>.*?<\/title>/, ""); }).catch(() => {});
  function halaman(k) {
    const xe = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const wil = k ? namaProv(k) : [...S.prov].length === 1 ? namaProv([...S.prov][0]) : "";
    const kiri = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="26" viewBox="0 0 380 26">${LOGO_SVG.replace("<svg ", '<svg x="0" y="1" width="24" height="24" ')}`
      + `<g font-family="Inter,system-ui,sans-serif" fill="#0b2545"><text x="31" y="11" font-size="10.5" font-weight="800">Centurisk97</text>`
      + `<text x="31" y="22" font-size="8" font-weight="700">Laporan Konsesi Terbakar 2026${wil ? ` · <tspan fill="#c9503a">${xe(wil)}</tspan>` : ""}</text></g></svg>`;
    const cetakTgl = tglT(new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)), pil = `Data s.d. ${tglT(IDX.sampai.slice(0, 10))} ${IDX.sampai.slice(11)}`, lw = pil.length * 4.3 + 12;
    const kanan = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="26" viewBox="0 0 380 26"><g font-family="Inter,system-ui,sans-serif">`
      + `<text x="380" y="9" font-size="8.5" font-weight="800" fill="#0b2545" text-anchor="end">Dicetak ${xe(cetakTgl)}</text>`
      + `<rect x="${380 - lw}" y="13" width="${lw}" height="12" rx="6" fill="#2b8c86"/><text x="${380 - lw / 2}" y="21.5" font-size="7" font-weight="700" fill="#fff" text-anchor="middle">${xe(pil)}</text></g></svg>`;
    const uri = t => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(t)}")`, garis = "vertical-align:bottom;padding-bottom:2.5mm;border-bottom:1.5px solid #0b2545;margin-bottom:5mm";
    const f = "font:600 8.5px Inter,system-ui,sans-serif;color:#5b6b82;border-top:1px solid #c9d3e0;vertical-align:top;padding-top:3mm";
    $("#knHalaman").textContent = `@page{size:A4 landscape;margin:22mm 10mm 14mm;
      @top-left{content:${uri(kiri)};${garis};text-align:left}@top-center{content:" ";${garis}}@top-right{content:${uri(kanan)};${garis};text-align:right}
      @bottom-left{content:"Sumber: NASA FIRMS; batas konsesi KLHK/Kemenhut (GFW, Trase); kawasan hutan KLHK; wilayah Kemendagri; olahan Centurisk97";${f}}
      @bottom-right{content:"Halaman " counter(page) " dari " counter(pages);${f}}}`;
  }
  addEventListener("beforeprint", () => { if (IDX) halaman(document.body.dataset.cetak || ""); });

  /* PDF: gambar semua peta dulu, baru dialog cetak (Simpan sebagai PDF). k = satu provinsi, kosong = semua yang dipilih */
  async function cetak(k) {
    const rs = daftar.filter(r => (!k || r.prov === k) && document.getElementById("p" + r._i));
    const pv = SUSUN.filter(p => !k || p.k === k);
    document.querySelectorAll("[data-pdf],#knPdf").forEach(b => { b.disabled = true; });
    if (k === "" && SUSUN.length === 1) k = SUSUN[0].k;
    let n = 0; const tot = rs.length + pv.length;
    for (const p of pv) { status(`Menyiapkan peta ${++n} dari ${tot}…`); await gambarProv(p.k); }
    for (const r of rs) { status(`Menyiapkan peta ${++n} dari ${tot}…`); await gambarProfil(r._i); }
    status(""); document.querySelectorAll("[data-pdf],#knPdf").forEach(b => { b.disabled = false; });
    const judul = document.title;
    halaman(k);
    if (k) { document.body.dataset.cetak = k; document.querySelector(`.kn-provsek[data-prov="${k}"]`)?.classList.add("kn-ini"); document.title = `Laporan Konsesi Terbakar 2026 ${namaProv(k)}`; }
    print();
  }
  addEventListener("afterprint", () => { delete document.body.dataset.cetak; document.querySelectorAll(".kn-ini").forEach(x => x.classList.remove("kn-ini")); render(); });
  $("#knPdf").addEventListener("click", () => cetak(""));
})();
