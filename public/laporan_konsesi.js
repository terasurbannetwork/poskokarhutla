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
  const SB = {sawit: ["KLHK", "Peta izin perkebunan sawit KLHK (data 2012, diperbarui 2014)"],
    hti: ["KLHK / Kemenhut", "Izin PBPH-HT KLHK/Kemenhut (data 2020–2022)"],
    hph: ["KLHK", "Peta izin PBPH-HA (HPH) KLHK 2014"],
    tambang: ["Kemenhut", "PPKH Ditjen Planologi Kehutanan, Kementerian Kehutanan (Jan 2026)"]};
  const SB_LAIN = [["Titik panas", "NASA FIRMS", "VIIRS S-NPP 375 m, keyakinan nominal/tinggi (arsip SP + NRT)"],
    ["Kawasan hutan", "KLHK", "Peta kawasan hutan KLHK versi 2017"],
    ["Lahan gambut", "CIFOR", "Miettinen dkk. 2016 + Gumbricht dkk. 2017"],
    ["Batas wilayah", "Kemendagri", "Kode dan batas provinsi, kabupaten/kota, kecamatan Kemendagri"],
    ["Grup & pemegang saham", "Centurisk97", "Atribut grup peta konsesi dan penelusuran kepemilikan perusahaan"],
    ["Citra peta", "Google, Copernicus", "Citra satelit dasar Google; SWIR Sentinel-2 L2A 20 m (B12/B8A/B04), mengandung data Copernicus Sentinel 2026 yang diolah"]];
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
  /* grup di peta konsesi tanpa negara induk tercatat: nama rapi + negara induk (kantor pusat grup) */
  const GRUP_RAPI = {"Adr": "ADR Group", "Government": "Perum Perhutani", "RGE Group": "Royal Golden Eagle", "Sime Darby, Synergy Drive": "Sime Darby"};
  const NEG_GRUP = {"Marubeni": "JP", "Sumitomo": "JP", "Cargill": "US", "Charoen Pokphand": "TH", "MP Evans Group PLC (MPE)": "GB", "PTT Green Energy Pte Ltd (PTTGE)": "TH",
    "Wilmar": "SG", "Musim Mas": "SG", "First Resources": "SG", "Royal Golden Eagle": "SG", "RGE/APRIL": "SG", "Sinar Mas": "ID", "Salim Group": "SG", "Goodhope Asia Holdings": "SG",
    "Sime Darby": "MY", "Genting Group": "MY", "BHD Group": "MY", "Lion Group": "MY", "Sampoerna Agro/POSCO": "ID", "Sampoerna Agro": "ID",
    "Astra International": "ID", "Duta Palma Group": "ID", "Surya Dumai Group": "ID", "Incasi Raya": "ID", "Lyman Group": "ID", "Ganda Group": "ID", "Perkebunan Nusantara": "ID",
    "Barito Pacific": "ID", "Bakrie Group": "ID", "Medco Group": "ID", "Djarum Group": "ID", "Sambu Group": "ID", "Rokan Group": "ID", "Berca Group": "ID", "Wings": "ID",
    "Sungai Budi Group": "ID", "Media Group": "ID", "ADR Group": "ID", "Perum Perhutani": "ID", "Borneo Group": "ID", "Kaestindo Group": "ID", "SIMP": "ID"};
  /* unit usaha di bawah grup menurut jenis konsesi (mis. Sinar Mas di HTI = APP); logo ikut unitnya */
  const UNIT = {"Sinar Mas|hti": "Asia Pulp & Paper (APP)", "Sinar Mas|sawit": "Golden Agri-Resources (GAR)", "Royal Golden Eagle|hti": "APRIL (Asia Pacific Resources International)",
    "RGE/APRIL|hti": "APRIL (Asia Pacific Resources International)", "Royal Golden Eagle|sawit": "Asian Agri", "Salim Group|sawit": "Indofood Agri Resources (IndoAgri)",
    "Astra International|sawit": "Astra Agro Lestari", "Sime Darby|sawit": "SD Guthrie", "Wilmar|sawit": "Wilmar International", "Musim Mas|sawit": "Musim Mas Holdings",
    "Marubeni|hti": "Musi Hutan Persada (Marubeni Corp.)", "Perkebunan Nusantara|sawit": "PTPN (Holding Perkebunan Nusantara)", "Barito Pacific|hti": "Barito Pacific Timber"};
  const unitDari = r => UNIT[`${r.grup}|${r.jenis}`] || "";
  /* BUMN: dikenali dari nama (bukan dari "d/h ..." yang menyebut pemilik lama). Patungan swasta (Silva Inhutani, Wono Inhutani) tidak ikut */
  const BUMN = [[/^(PT\.?\s+)?Inhutani|^PT INHUTANI/i, "Perum Perhutani"], [/Perkebunan Nusantara|^Ptpn|PTP Nusantara|^PT PN [IVX]+/i, "Holding Perkebunan Nusantara (PTPN III)"],
    [/Bukit Asam|Aneka Tambang/i, "MIND ID"], [/Semen Baturaja/i, "SIG (Semen Indonesia)"], [/Pertamina EP|PHE /i, "Pertamina"]];
  const bumnDari = r => { const n = r.nama.replace(/\([^)]*\)/g, ""); return BUMN.find(([re]) => re.test(n))?.[1] || ""; };
  const rapikan = r => { if (r._rapi) return r; r._rapi = 1; r.grup = GRUP_RAPI[r.grup] ?? r.grup;
    if (/Sinar Mas/i.test(r.grup)) r.negara = ["ID"];   /* Sinar Mas = grup Indonesia (pemilik, 18 Okt 2026) */
    if (!(r.negara || []).length && NEG_GRUP[r.grup]) r.negara = [NEG_GRUP[r.grup]]; r.unit = unitDari(r);
    r.bumn = bumnDari(r); if (r.bumn) { r.grup = "BUMN"; r.unit = r.bumn; r.negara = ["ID"]; }   /* grup ditulis BUMN, holding jadi unit usaha (pemilik, 18 Okt 2026) */
    return r; };
  const API = '<svg class="kn-api" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c1.8 4 6.5 6.4 6.5 11.5a6.5 6.5 0 0 1-13 0c0-2.5 1.2-4.3 2.8-5.8.3 2.1 1.4 3.3 2.7 3.8C10.6 9 11.1 5.8 12 2.5Z" fill="#f08a3c"/><path d="M12 20.5a3.5 3.5 0 0 1-3.5-3.5c0-2 1.7-3.1 3.5-5.8 1.8 2.7 3.5 3.8 3.5 5.8a3.5 3.5 0 0 1-3.5 3.5Z" fill="#ffd36b"/></svg>';
  /* kunci warna SWIR (sama dengan citra.js) */
  const LEG_SWIR = `<div class="kn-leg kn-leg-sw">${[["#ff5a1f", "Api aktif / bara"], ["#5a3a24", "Bekas terbakar"], ["#3f9a3a", "Vegetasi hidup"], ["#e8b98a", "Tanah terbuka"], ["#b9d3e6", "Asap tebal"], ["#fff", "Awan"]]
    .map(([w, n]) => `<span><i style="background:${w}"></i>${n}</span>`).join("")}<span><i style="background:transparent;border:1.5px solid #e0b800;border-radius:50%"></i>Lokasi titik panas</span></div>`;
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = d => d ? `${+d.slice(8, 10)} ${BLN[+d.slice(5, 7) - 1]}` : "–";
  const tglT = d => d ? `${tgl(d)} 2026` : "–";
  const rentang = (a, b) => a === b ? tgl(a) : a.slice(5, 7) === b.slice(5, 7) ? `${+a.slice(8)}–${tgl(b)}` : `${tgl(a)} – ${tgl(b)}`;
  const ha = n => fmt(Math.round(n));
  const pct = p => p == null ? "–" : p > 0 && p < .005 ? "< 1%" : Math.round(p * 100) + "%";
  const bumnPil = r => r.bumn ? `<span class="kn-bumn" title="Badan Usaha Milik Negara · ${esc(r.bumn)}">BUMN</span>` : "";
  const SNK = {perdata: "Gugatan perdata", pidana: "Pidana korporasi", administratif: "Sanksi administratif", penyegelan: "Penyegelan"};
  const jenisPil = j => `<span class="kn-j" style="--w:${JN[j]?.[1] || "#888"}">${JN[j]?.[0] || j}</span>`;

  const S = {prov: new Set(BNPB), jenis: new Set(Object.keys(JN)), cari: "", profil: 20, dasar: "google", urut: "titik"};
  let IDX = null; const DATA = {}; let daftar = [];
  const gambar = new Map();   // id + dasar -> [citra, viirs]

  let CIT = {}, CITJ = {};
  const janjiCit = Promise.all([fetch("/data/konsesi2026/citra.json").then(r => r.ok ? r.json() : {}).then(d => { CIT = d; }).catch(() => {}),
    fetch("/data/konsesi2026/citra_jelas.json").then(r => r.ok ? r.json() : {}).then(d => { CITJ = d; }).catch(() => {})]);
  fetch("/data/konsesi2026/index.json").then(r => r.json()).then(d => { IDX = d; gambarKendali(); muat(); })
    .catch(() => { $("#knIsi").innerHTML = `<div class="kosong">Data laporan belum tersedia.</div>`; });

  /* pemilih provinsi bercari: rupa PilihCantik (kartu.css .pc/.pc-menu) + kotak cari di atas daftar */
  const GAB = [["bnpb", "6 provinsi BNPB"], ["9", "9 provinsi prioritas"], ["semua", "Semua provinsi"]];
  /* pilihProv = kunci GAB (pilihan jadi), atau kode provinsi dipisah koma (centang beberapa, pemilik 18 Okt 2026) */
  let pilihProv = "bnpb", menuP = null;
  const grup = () => GAB.some(g => g[0] === pilihProv), dipilih = v => grup() ? v === pilihProv : pilihProv.split(",").includes(v);
  const opsiProv = () => [...GAB.map(([v, n]) => ({v, n, g: 1})), ...IDX.prov.slice().sort((a, b) => a.nama.localeCompare(b.nama, "id")).map(p => ({v: p.kode, n: p.nama, t: p.perusahaan}))];
  function gambarKendali() { const P = pilihProv.split(","); $("#knProv span").textContent = GAB.find(g => g[0] === pilihProv)?.[1] || (P.length === 1 ? namaProv(P[0]) : P.length + " provinsi"); }
  const tutupProv = () => { menuP?.remove(); menuP = null; $(".kn-pp").classList.remove("on"); };
  function bukaProv() {
    if (menuP) return tutupProv();
    const w = $(".kn-pp"), r = w.getBoundingClientRect(); w.classList.add("on");
    menuP = document.createElement("div"); menuP.className = "pc-menu multi kn-pp-menu"; menuP.setAttribute("role", "listbox"); menuP.setAttribute("aria-multiselectable", "true");
    menuP.innerHTML = `<input type="search" placeholder="Cari provinsi…" aria-label="Cari provinsi"><div class="kn-pp-daf"></div>`;
    document.body.append(menuP);
    Object.assign(menuP.style, {left: r.left + "px", width: Math.max(r.width, 260) + "px", top: r.bottom + 6 + "px"});
    const daf = menuP.querySelector(".kn-pp-daf"), cari = menuP.querySelector("input");
    const isi = q => { const o = opsiProv().filter(x => !q || x.n.toLowerCase().includes(q));
      daf.innerHTML = o.map((x, i) => `${i && o[i - 1].g && !x.g ? '<hr>' : ""}<button type="button" role="option" data-v="${x.v}" aria-selected="${dipilih(x.v)}">${esc(x.n)}${x.t ? `<em>${fmt(x.t)}</em>` : ""}</button>`).join("") || `<p class="kn-mt">Tidak ada provinsi "${esc(q)}"</p>`; };
    isi(""); cari.focus();
    cari.addEventListener("input", () => isi(cari.value.trim().toLowerCase()));
    cari.addEventListener("keydown", e => { if (e.key === "Enter") daf.querySelector("button")?.click(); if (e.key === "Escape") { tutupProv(); $("#knProv").focus(); } if (e.key === "ArrowDown") { e.preventDefault(); daf.querySelector("button")?.focus(); } });
    daf.addEventListener("keydown", e => { const bs = [...daf.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); bs[i + 1]?.focus(); } else if (e.key === "ArrowUp") { e.preventDefault(); (bs[i - 1] || cari).focus(); } else if (e.key === "Escape") { tutupProv(); $("#knProv").focus(); } });
    daf.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (!b) return;
      const v = b.dataset.v;
      if (GAB.some(g => g[0] === v)) { pilihProv = v; tutupProv(); }   /* pilihan jadi: langsung tutup */
      else { const P = grup() ? [] : pilihProv.split(","), i = P.indexOf(v); i < 0 ? P.push(v) : P.splice(i, 1); pilihProv = P.join(",") || "bnpb";
        daf.querySelectorAll("[data-v]").forEach(x => x.setAttribute("aria-selected", dipilih(x.dataset.v))); }   /* provinsi: menu tetap terbuka, centang beberapa */
      gambarKendali();
      S.prov = new Set(pilihProv === "bnpb" ? BNPB : pilihProv === "9" ? PRIO : pilihProv === "semua" ? IDX.prov.map(p => p.kode) : pilihProv.split(","));
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
    Promise.all([janjiCit, ...perlu.map(k => fetch(`/data/konsesi2026/${k}.json`).then(r => r.json()).then(d => { d.perusahaan.forEach(rapikan); DATA[k] = d; }))]).then(() => { status(""); render(); })
      .catch(e => { console.error(e); status("Sebagian data provinsi gagal dimuat."); });
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
      rs.forEach((r, j) => { r._top = j + 1; });
      const kab = {}; rs.forEach(r => (kab[r.kabU] ||= []).push(r));
      const kb = Object.entries(kab).sort((a, b) => jumlah(b[1]).t - jumlah(a[1]).t);
            let no = 0; kb.forEach(([, xs]) => xs.forEach(r => { r._rp = ++no; }));   /* nomor urut tampil: 1, 2, 3 … mengikuti urutan kab/kota */
      SUSUN.push({k, rs, kab: kb});
    }
    SUSUN.sort((a, b) => jumlah(b.rs).t - jumlah(a.rs).t);
    const out = [];
    SUSUN.forEach(p => p.kab.forEach(([, rs]) => rs.forEach(r => { r._i = out.length; out.push(r); })));
    return out;
  }
  const tampilProfil = r => r._top <= S.profil || BUKA.has(r.id);
  const BUKA = new Set();

  const tabelUsaha = rs => `<div class="tw"><table class="kn-tb kn-rk"><thead><tr><th>No</th><th>Perusahaan</th><th>Jenis</th><th>Kecamatan</th><th class="r">Luas konsesi (ha)</th><th class="r">Titik</th><th class="r">Terbakar (ha)</th><th>Periode api</th><th class="r">Hari dengan hotspot</th><th class="r">7 hari</th></tr></thead><tbody>
    ${rs.map((r, j) => `<tr><td>${j + 1}</td><td><a href="#p${r._i}" class="kn-nm" data-buka="${r._i}">${esc(r.nama)}</a>${r.grup ? `<small>${bendera(r.negara?.[0], 10)}${esc(r.grup)}</small>` : ""}</td><td>${jenisPil(r.jenis)}</td>
      <td>${esc(r.kec.slice(0, 2).map(k => k.split(",")[0]).join(", ") || "–")}</td><td class="r">${ha(r.luas_ha)}</td><td class="r"><b>${fmt(r.titik)}</b></td>
      <td class="r">${ha(r.luas_bakar_ha)}<small>${pct(r.persen_bakar)}</small></td><td>${rentang(r.pertama, r.terakhir)}</td><td class="r">${fmt(r.hari_aktif)}</td>
      <td class="r">${r.titik_7h ? `<span class="kn-ak">${fmt(r.titik_7h)}</span>` : "–"}</td></tr>`).join("")}
    </tbody></table></div>`;

  /* r.rspo = {grup, sertifikat, sejak} dari data RSPO 2020 (GFW), dicocokkan lewat nama; tak cocok bukan berarti bukan anggota, jadi "–".
     HGU tidak ada di data (peta izin KLHK, bukan HGU ATR/BPN): r.hgu_ha bila kelak ada */
  const rspoTeks = r => r.jenis !== "sawit" || !r.rspo ? "–" : r.rspo.sertifikat ? "Bersertifikat" : "Anggota";
  const rspoPil = r => r.jenis === "sawit" && r.rspo ? ` <span class="kn-rspo" title="Anggota RSPO lewat ${esc(r.rspo.grup)} (data RSPO 2020)">RSPO</span>` : "";
  /* titik yang bertahan > 2 hari = titik panas dalam kejadian (rangkaian hari ber-hotspot, jeda dihitung) yang lamanya lebih dari 2 hari */
  const titikLama = r => r.kejadian.reduce((a, e) => a + (e[2] > 2 ? e[3] : 0), 0);
  const kecDari = r => [...new Set(r.kec.map(k => k.split(",")[0].trim()))];
  const NA = '<span class="kn-mt">–</span>';
  /* daftar wilayah satu baris: n pertama, sisanya "+n" dengan daftar lengkap di title */
  const ringkas = (ks, n) => !ks.length ? "–" : ks.length <= n ? esc(ks.join(", ")) : `<span title="${esc(ks.join(", "))}">${esc(ks.slice(0, n).join(", "))} <span class="kn-mt">+${ks.length - n}</span></span>`;
  /* tabel daftar perusahaan dikelompokkan per kab/kota (pemilik 19 Okt 2026): baris kab bisa dibuka-tutup, isinya PT yang titiknya
     terbanyak di kab itu; baris PT bisa diklik/Enter, menggulir ke profil (dibuka bila belum tampil). KAB_BUKA bertahan lintas render. */
  const KAB_BUKA = new Set();
  function tabelDaftar(rs) {
    const kabUtama = r => (r.kab_titik?.length ? r.kab_titik : r.kab)[0] || "–";
    const grup = new Map();
    for (const r of rs.slice().sort((a, b) => a._rp - b._rp)) { const k = kabUtama(r); if (!grup.has(k)) grup.set(k, []); grup.get(k).push(r); }
    const jml = (g, f) => g.reduce((t, r) => t + (f(r) || 0), 0);
    const kel = [...grup].sort((a, b) => jml(b[1], r => r.titik) - jml(a[1], r => r.titik));
    const sel = g => `<td class="r">${ha(jml(g, r => r.luas_ha))}</td><td class="r"><b>${fmt(jml(g, r => r.titik))}</b></td><td class="r">${fmt(jml(g, titikLama))}</td><td class="r">${fmt(jml(g, r => r.titik_7h))}</td><td class="r">${fmt(jml(g, r => r.kejadian.length))}</td><td class="r">${ha(jml(g, r => r.luas_bakar_ha))}</td>`;
    const baris = r => `<tr class="kn-baris" tabindex="0" role="link" data-gulir="${r._i}" aria-label="Buka profil ${esc(r.nama)}"><td>${r._rp}</td><td><a class="kn-nm" href="#p${r._i}" data-buka="${r._i}">${esc(r.nama)}</a></td><td class="kn-nw">${ringkas(kecDari(r), 1)}</td><td>${jenisPil(r.jenis)}</td>
        <td class="kn-c">${rspoTeks(r) === "–" ? NA : rspoTeks(r) === "Bersertifikat" ? '<span class="kn-cek" title="Bersertifikat RSPO" aria-label="Bersertifikat RSPO">✓</span>' : rspoTeks(r)}</td><td class="r">${ha(r.luas_ha)}</td><td class="r"><b>${fmt(r.titik)}</b></td><td class="r">${titikLama(r) ? fmt(titikLama(r)) : NA}</td><td class="r">${r.titik_7h ? `<span class="kn-ak">${fmt(r.titik_7h)}</span>` : NA}</td>
        <td class="r">${fmt(r.kejadian.length)}</td><td class="r">${ha(r.luas_bakar_ha)}</td></tr>`;
    return `<div class="tw"><table class="kn-tb kn-dft"><thead><tr><th>No</th><th>Nama PT</th><th>Kecamatan</th><th>Jenis</th><th class="kn-c">RSPO</th><th class="r">Konsesi (ha)</th><th class="r">Titik panas</th><th class="r" title="Titik bertahan lebih dari 2 hari">&gt; 2 hari</th><th class="r" title="Titik panas aktif 7 hari terakhir">7 hari</th><th class="r" title="Kompleks api (kejadian)">Kompleks</th><th class="r" title="Indikasi terbakar (ha)">Terbakar (ha)</th></tr></thead>
      ${kel.map(([k, g]) => { const buka = KAB_BUKA.has(k);
        /* di layar jumlahnya di baris kab; di PDF baris kab jadi judul dan jumlahnya turun ke baris subtotal di bawah PT-nya */
        const sub = sel(g);
        return `<tbody><tr class="kn-kab" data-kab="${esc(k)}"><td colspan="2"><button type="button" class="kn-kab-b" aria-expanded="${buka}"><span class="kn-kab-i" aria-hidden="true">▸</span>${esc(k)}</button></td><td><span class="kn-jml">${fmt(g.length)} PT</span></td><td colspan="2"></td>${sub}</tr>
        ${g.map(r => baris(r).replace("<tr ", `<tr${buka ? "" : " hidden"} `)).join("")}
        <tr class="kn-sub kn-subkab"><td colspan="5">Subtotal ${esc(k)}</td>${sub}</tr></tbody>`; }).join("")}
      <tfoot><tr class="kn-tot"><td colspan="2">Grand total</td><td><span class="kn-jml">${fmt(rs.length)} PT</span></td><td colspan="2"></td>${sel(rs)}</tr></tfoot></table></div>`;
  }
  /* 5 hari titik panas tertinggi: kompleks hari itu + lama rangkaian hari berturut-turut (harian) yang memuat tanggal itu */
  function top5Hari(r) {
    const top = r.harian.slice().sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0])).slice(0, 5);
    return `<div class="kn-top5"><div class="kn-band"><b>Top 5 hari tertinggi</b><span>hari dengan titik panas terbanyak</span></div><div class="tw"><table class="kn-tb"><thead><tr><th>Peringkat</th><th>Tanggal</th><th class="r">Titik panas</th><th class="r">Kompleks api</th><th class="r">Bertahan (hari berturut-turut)</th></tr></thead><tbody>
      ${top.map(([d, n], j) => `<tr><td>${j + 1}</td><td><b>${tglT(d)}</b></td><td class="r"><b>${fmt(n)}</b></td><td class="r">${fmt(kompleksHari(r, d).length)}</td><td class="r">${fmt(lamaBerturut(r, d))} hari</td></tr>`).join("")}
      </tbody></table></div><p class="kn-mt kn-hr-k">Kompleks api = kelompok titik hari itu yang berjarak ≤ 1,5 km. Bertahan = panjang rangkaian hari berturut-turut dengan hotspot yang memuat tanggal itu.</p></div>`;
  }

  /* keparahan: satu aturan untuk tabel kompleks dan tabel harian. k = [lat, lon, lokasi, titik, awal, akhir, hari, FRP maks] */
  const parah = k => k[3] >= 100 || (k[6] >= 5 && k[7] >= 50) ? ["Sangat tinggi", "#8f1d14"] : k[3] >= 20 || k[6] >= 4 ? ["Tinggi", "#c9503a"] : k[3] >= 5 ? ["Sedang", "#d2772c"] : ["Rendah", "#8a94a6"];
  const PARAH_URUT = ["Rendah", "Sedang", "Tinggi", "Sangat tinggi"];
  const lamaBerturut = (r, d) => { const tg = new Set(r.harian.map(h => h[0])), g = (x, k) => new Date(Date.parse(x) + k * 864e5).toISOString().slice(0, 10);
    let a = 1, x = d; while (tg.has(g(x, -1))) { x = g(x, -1); a++; } x = d; while (tg.has(g(x, 1))) { x = g(x, 1); a++; } return a; };
  /* kompleks api pada satu hari: titik hari itu digabung bila berjarak <= 1,5 km; tiap kompleks = [titik, FRP maks] */
  function kompleksHari(r, d) {
    const ps = r.pt.filter(p => p[2].slice(0, 5) === d.slice(5)), par = ps.map((_, i) => i), cari = i => par[i] === i ? i : (par[i] = cari(par[i]));
    const jarak = (a, b) => { const k = Math.PI / 180, x = (b[1] - a[1]) * k * Math.cos((a[0] + b[0]) * k / 2), y = (b[0] - a[0]) * k; return 6371 * Math.hypot(x, y); };
    ps.forEach((a, i) => ps.forEach((b, j) => { if (j > i && jarak(a, b) <= 1.5) par[cari(j)] = cari(i); }));
    const g = {}; ps.forEach((p, i) => { const c = (g[cari(i)] ||= [0, 0]); c[0]++; c[1] = Math.max(c[1], p[3]); });
    return Object.values(g);
  }
  /* keparahan hari = yang tertinggi di antara kompleks hari itu (aturan parah, hari = rangkaian berturut-turut) */
  const parahHari = (r, d) => { const L = lamaBerturut(r, d); return kompleksHari(r, d).map(([n, f]) => parah([0, 0, "", n, d, d, L, f])).sort((a, b) => PARAH_URUT.indexOf(b[0]) - PARAH_URUT.indexOf(a[0]))[0]; };
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
  /* satu perusahaan satu baris, sel kab/kota digabung ke bawah, subtotal per kab/kota (model ekspor KDMP Pangantara) */
  /* halaman pemisah tiap kab/kota di kertas cetak (model sampul ekspor KDMP Pangantara): logo, merek, provinsi, nama besar, kotak navy */
  function sampulKab(k, kb, rs) {
    const x = jumlah(rs), jn = Object.keys(JN).map(j => [j, rs.filter(r => r.jenis === j).length]).filter(([, n]) => n);
    const kotak = [["Perusahaan", fmt(rs.length), jn.map(([j, n]) => `${JN[j][0]} ${n}`).join(" · ")], ["Titik panas 2026", fmt(x.t), `terbanyak ${rs[0].nama}`],
      ["Indikasi terbakar", ha(x.l) + " ha", `dari ${ha(x.k)} ha konsesi`], ["Masih ada api", fmt(x.a) + " konsesi", "titik dalam 7 hari terakhir"]];
    return `<div class="kn-sampul"><img src="/img/logo.svg?v=2" alt="" width="64" height="64"><b class="kn-sp-m">CENTURISK97</b><span class="kn-sp-t">Laporan Konsesi Terbakar 2026</span>
      <span class="kn-sp-p">${esc(namaProv(k))}</span><h2 class="kn-sp-n">${esc(kb)}</h2><i class="kn-sp-g"></i>
      <div class="kn-sp-k">${kotak.map(([l, v, ket]) => `<div><span>${l}</span><b>${v}</b><small>${esc(ket)}</small></div>`).join("")}</div>
      <div class="kn-sp-d">${rs.map(r => `<span><i style="background:${JN[r.jenis][1]}"></i>${esc(r.nama)} <em>${fmt(r.titik)}</em></span>`).join("")}</div></div>`;
  }

  /* titik 3 hari terakhir (hari WIB, termasuk hari data terakhir) */
  const t3 = r => { if (r._t3 == null) { const b = new Date(Date.parse(IDX.sampai.slice(0, 10)) - 2 * 864e5).toISOString().slice(5, 10); r._t3 = r.pt.filter(p => p[2].slice(0, 5) >= b).length; } return r._t3; };
  function tabelKab(p) {
    const T = jumlah(p.rs);
    return `<div class="tw"><table class="kn-tb kn-tk-kab"><thead><tr><th>No</th><th>Perusahaan</th><th>Jenis</th><th>Grup</th><th class="r">Konsesi (ha)</th><th class="r">Titik panas</th><th class="r" title="Indikasi terbakar (ha)">Terbakar (ha)</th><th class="r">% konsesi</th><th>Periode api</th><th class="r">3 hari</th><th class="r">7 hari</th></tr></thead><tbody>
      ${p.kab.map(([kb, rs], j) => { const x = jumlah(rs);
        return `<tr class="kn-pita kn-pita-i"><td colspan="11"><a href="#v${p.k}-${j}">${j + 1}. ${esc(kb)}</a></td></tr>`
          + rs.map((r, m) => `<tr><td class="kn-mt">${m + 1}</td><td><a href="#p${r._i}" data-buka="${r._i}" class="kn-nm">${esc(r.nama)}</a></td><td>${jenisPil(r.jenis)}</td>
          <td class="kn-nw">${r.grup ? `<span class="kn-gr">${logo(r.unit || r.grup, 18)}${esc(r.grup)}</span>` : `<span class="kn-mt">–</span>`}</td>
          <td class="r">${ha(r.luas_ha)}</td><td class="r"><b>${fmt(r.titik)}</b></td><td class="r">${ha(r.luas_bakar_ha)}</td><td class="r kn-mt">${pct(r.persen_bakar)}</td>
          <td class="kn-nw">${rentang(r.pertama, r.terakhir)}</td><td class="r">${t3(r) ? `<span class="kn-ak">${fmt(t3(r))}</span>` : `<span class="kn-mt">–</span>`}</td><td class="r">${r.titik_7h ? `<span class="kn-ak">${fmt(r.titik_7h)}</span>` : `<span class="kn-mt">–</span>`}</td></tr>`).join("")
          + (rs.length > 1 ? `<tr class="kn-sub"><td></td><td colspan="3">Subtotal ${esc(kb)}</td><td class="r">${ha(x.k)}</td><td class="r">${fmt(x.t)}</td><td class="r">${ha(x.l)}</td><td class="r">${pct(x.k ? x.l / x.k : 0)}</td><td></td><td class="r">${fmt(rs.reduce((a, r) => a + t3(r), 0))}</td><td class="r">${fmt(rs.reduce((a, r) => a + r.titik_7h, 0))}</td></tr>` : ""); }).join("")}
      <tr class="kn-tot"><td></td><td colspan="3">Jumlah ${esc(namaProv(p.k))}</td><td class="r">${ha(T.k)}</td><td class="r">${fmt(T.t)}</td><td class="r">${ha(T.l)}</td><td class="r">${pct(T.k ? T.l / T.k : 0)}</td><td></td><td class="r">${fmt(p.rs.reduce((a, r) => a + t3(r), 0))}</td><td class="r">${fmt(p.rs.reduce((a, r) => a + r.titik_7h, 0))}</td></tr></tbody></table></div>`;
  }

  function tabelGrup(rs) {
    const grup = {}; rs.forEach(r => { if (r.grup) (grup[r.grup] ||= []).push(r); });
    const u = Object.entries(grup).sort((a, b) => jumlah(b[1]).t - jumlah(a[1]).t);
    return u.length ? `<h3>Grup perusahaan</h3><div class="tw"><table class="kn-tb kn-tk-kab"><thead><tr><th>Grup</th><th>Perusahaan</th><th>Jenis konsesi</th><th>Kabupaten/kota</th><th class="r">Luas konsesi (ha)</th><th class="r">Titik panas</th><th class="r">Indikasi terbakar (ha)</th></tr></thead><tbody>
      ${u.map(([g, xs]) => { const x = jumlah(xs), n = xs.length + (xs.length > 1 ? 1 : 0), neg = xs[0].negara || [];
        return xs.map((r, m) => `<tr>${m ? "" : `<td rowspan="${n}" class="kn-rs"><span class="kn-gr">${logo(g, 22)}<b>${esc(g)}</b></span><span class="kn-gr-n">${neg.map(k => `${bendera(k, 12)}${NEG[k] || k}`).join(", ") || "Negara belum diketahui"}</span></td>`}
          <td><a href="#p${r._i}" data-buka="${r._i}" class="kn-nm">${esc(r.nama)}</a></td><td>${jenisPil(r.jenis)}${rspoPil(r)}</td><td>${esc(r.kabU)}</td><td class="r">${ha(r.luas_ha)}</td><td class="r"><b>${fmt(r.titik)}</b></td><td class="r">${ha(r.luas_bakar_ha)}</td></tr>`).join("")
          + (xs.length > 1 ? `<tr class="kn-sub"><td colspan="3">Subtotal ${esc(g)}</td><td class="r">${ha(x.k)}</td><td class="r">${fmt(x.t)}</td><td class="r">${ha(x.l)}</td></tr>` : ""); }).join("")}
      </tbody></table></div>` : "";
  }

  function render() {
    daftar = saring();
    const P = [...S.prov].map(namaProv);
    $("#knJudul").textContent = "Laporan Konsesi Terbakar 2026" + (P.length === 1 ? " · " + P[0] : "");
    $("#knPils").innerHTML = `<span class="lp-pil">1 Jan – ${tglT(IDX.sampai.slice(0, 10))}</span><span class="lp-pil ok">Data s.d. ${esc(IDX.sampai.slice(11))}</span>${P.length > 1 ? `<span class="lp-pil">${fmt(P.length)} provinsi</span>` : ""}`;
    document.title = `Laporan Konsesi Terbakar 2026 ${P.length === 1 ? P[0] : ""}`.trim();
    if (!daftar.length) { $("#knIsi").innerHTML = `<div class="kosong">${S.prov.size ? "Tidak ada areal konsesi dengan hotspot untuk pilihan ini." : "Pilih minimal satu provinsi."}</div>`; return; }
    const T = jumlah(daftar);
    $("#knIsi").innerHTML = `
      <div class="kn-nas">
      ${SUSUN.length > 1 ? kpi(daftar) : ""}
      ${SUSUN.length > 1 ? `<section class="kn-kartu"><h2>Ringkasan per provinsi</h2>
        <div class="tw"><table class="kn-tb"><thead><tr><th>Provinsi</th><th class="r">Perusahaan</th><th class="r">Titik panas</th><th class="r">Indikasi terbakar (ha)</th><th class="r">Masih ada api</th><th>PDF</th></tr></thead><tbody>
        ${SUSUN.map(p => { const t = jumlah(p.rs); return `<tr><td><a class="kn-nm" href="#v${p.k}">${esc(namaProv(p.k))}</a></td><td class="r">${fmt(p.rs.length)}</td><td class="r">${fmt(t.t)}</td><td class="r">${ha(t.l)}</td><td class="r">${fmt(t.a)}</td><td><button type="button" class="kn-mini" data-pdf="${p.k}">Unduh PDF</button></td></tr>`; }).join("")}
        <tr class="kn-tot"><td>Jumlah</td><td class="r">${fmt(daftar.length)}</td><td class="r">${fmt(T.t)}</td><td class="r">${ha(T.l)}</td><td class="r">${fmt(T.a)}</td><td></td></tr></tbody></table></div></section>` : ""}
      ${SUSUN.length > 1 ? `<section class="kn-kartu"><h2>Per jenis usaha</h2>${tabelJenis(daftar)}${tabelGrup(daftar)}</section>` : ""}
      <section class="kn-kartu kn-pt"><h2>Peta sebaran</h2><div id="knPeta" class="kn-peta"></div>${legenda()}
        </section>${SUSUN.length === 1 ? `<section class="kn-kartu"><h2>Daftar perusahaan</h2>${tabelDaftar(daftar)}</section>` : ""}
      </div>
      ${SUSUN.map(p => { const t = jumlah(p.rs); return `<section class="kn-provsek" id="v${p.k}" data-prov="${p.k}">
        <header class="kn-provh"><div><span class="lbl">Provinsi</span><h2>${esc(namaProv(p.k))}</h2></div><button type="button" class="kn-mini kn-utama" data-pdf="${p.k}">Unduh PDF ${esc(namaProv(p.k))}</button></header>
        ${kpi(p.rs)}
        <section class="kn-kartu"><h2>Per jenis usaha</h2>${tabelJenis(p.rs)}</section>
        <section class="kn-kartu kn-pvk"><h2>Peta provinsi</h2><figure class="kn-pv"><div class="kn-img kn-img-l" data-pv="${p.k}"><span>Menggambar peta…</span></div><figcaption>Batas konsesi dengan hotspot dan titik panas 2026 di ${esc(namaProv(p.k))}. Angka = nomor perusahaan.</figcaption></figure>${legenda()}
        </section>
        <section class="kn-kartu"><h2>Daftar perusahaan</h2>${tabelDaftar(p.rs)}</section>
        <section class="kn-kartu"><h2>Per kabupaten/kota</h2>${tabelKab(p)}</section>
        ${tabelGrup(p.rs) ? `<section class="kn-kartu kn-grk"><h2>Grup perusahaan</h2>${tabelGrup(p.rs).replace("<h3>Grup perusahaan</h3>", "")}</section>` : ""}
        ${p.kab.map(([kb, rs], j) => `<section class="kn-kabsek" id="v${p.k}-${j}">${sampulKab(p.k, kb, rs)}
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
          <li><b>Kejadian:</b> rangkaian hari dengan hotspot dengan jeda paling lama ${IDX.jeda_kejadian} hari tanpa titik.</li>
          <li><b>Grup dan pemegang saham:</b> atribut grup di peta konsesi dan penelusuran kepemilikan perusahaan.</li>
          <li><b>Kompleks api:</b> kelompok titik VIIRS berdekatan (1,5 km, 7 hari) seperti di peta Centurisk97.</li>
          <li>Titik panas di dalam areal konsesi menunjukkan lokasi api, <b>bukan bukti siapa yang membakar</b>. Verifikasi lapangan tetap diperlukan.</li>
        </ul>
      </section>`;
    petaUtama();
    pasangGambar();
  }

  const wilayah = r => (r.kab_titik?.length ? r.kab_titik : r.kab).slice(0, 2).join(", ") || "–";
  const legenda = () => `<div class="kn-leg"><span><i class="kn-lg-p"></i>Batas konsesi</span><span><i class="kn-lg-t" style="background:#ffcc00"></i>Titik panas 2026</span><span><i class="kn-lg-t" style="background:#ff2d2d"></i>Titik 7 hari terakhir</span></div>`;

  /* grafik harian: lebar tetap (teks tidak melar), garis bantu sumbu Y, penanda puncak, jumlah per bulan di bawah label bulan */
  function grafik(r) {
    const a = Date.parse("2026-01-01"), b = Date.parse(IDX.sampai.slice(0, 10)), hari = Math.round((b - a) / 864e5) + 1;
    const W = 1000, H = 200, L = 48, R = 10, T = 24, B = 48, iw = W - L - R, ih = H - T - B, bw = iw / hari;
    const mx = Math.max(...r.harian.map(x => x[1])), langkah = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(v => mx / v <= 4) || 1000, top = Math.ceil(mx / langkah) * langkah;
    const y = v => T + ih - v / top * ih, x = d => L + (Date.parse(d) - a) / 864e5 * bw, b7 = Date.parse(IDX.sampai.slice(0, 10)) - 6 * 864e5;
    const grid = Array.from({length: top / langkah + 1}, (_, i) => i * langkah).map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="kn-gd"/><text x="${L - 6}" y="${y(v) + 3.5}" text-anchor="end" class="kn-yl">${fmt(v)}</text>`).join("");
    const bar = r.harian.map(([d, n]) => `<rect x="${x(d).toFixed(1)}" y="${y(n).toFixed(1)}" width="${Math.max(1.6, bw * .78).toFixed(1)}" height="${(T + ih - y(n)).toFixed(1)}" rx="${bw > 4 ? 1 : 0}" class="${Date.parse(d) >= b7 ? "kn-b7" : ""}"><title>${tgl(d)}: ${fmt(n)} titik</title></rect>`).join("");
    const bul = {}; r.harian.forEach(([d, n]) => { bul[+d.slice(5, 7)] = (bul[+d.slice(5, 7)] || 0) + n; });
    const nb = new Date(b).getUTCMonth() + 1;
    const blabel = Array.from({length: nb}, (_, i) => { const x0 = L + (Date.parse(`2026-${String(i + 1).padStart(2, "0")}-01`) - a) / 864e5 * bw, x1 = i + 1 < nb ? L + (Date.parse(`2026-${String(i + 2).padStart(2, "0")}-01`) - a) / 864e5 * bw : W - R, xm = (x0 + x1) / 2;
      return `<line x1="${x0}" x2="${x0}" y1="${T + ih}" y2="${T + ih + 5}" class="kn-ax"/><text x="${xm}" y="${T + ih + 19}" text-anchor="middle" class="kn-ml">${BLN[i]}</text><text x="${xm}" y="${T + ih + 38}" text-anchor="middle" class="kn-mv${bul[i + 1] ? "" : " kn-m0"}">${bul[i + 1] ? fmt(bul[i + 1]) : "–"}</text>`; }).join("");
    const px = x(r.puncak[0]) + bw * .39, py = y(r.puncak[1]), kiri = px > W - 170;
    const pk = `<circle cx="${px}" cy="${py - 4}" r="3" class="kn-pkc"/><text x="${kiri ? px - 8 : px + 8}" y="${py - 1}" text-anchor="${kiri ? "end" : "start"}" class="kn-pkt">Puncak ${tgl(r.puncak[0])} · ${fmt(r.puncak[1])} titik</text>`;
    return `<svg class="kn-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Titik panas harian 2026, puncak ${tgl(r.puncak[0])}">${grid}<line x1="${L}" x2="${W - R}" y1="${T + ih}" y2="${T + ih}" class="kn-ax"/><g class="kn-br">${bar}</g>${pk}${blabel}</svg>
      <div class="kn-leg"><span><i class="kn-lg-t" style="background:#d9534f;border-radius:2px"></i>Titik panas per hari</span><span><i class="kn-lg-t" style="background:#8f1d14;border-radius:2px"></i>7 hari terakhir</span><span>Angka di bawah bulan = jumlah titik sebulan</span></div>`;
  }

  /* bagian titik panas harian: grafik selebar kartu + tabel lengkap tiap hari dengan hotspot (dibagi 3 lajur) */
  function harian(r) {
    const frp = {}, jam = {}, ke = {};
    r.pt.forEach(p => { const d = "2026-" + p[2].slice(0, 5); frp[d] = Math.max(frp[d] || 0, p[3]); (jam[d] ||= new Set()).add(p[2].slice(6)); });
    const lama = {};  /* api bertahan: hari ke-berapa dalam kejadiannya, dari lama kejadian itu */
    r.kejadian.forEach((e, j) => r.harian.forEach(([d]) => { if (d >= e[0] && d <= e[1]) { ke[d] = j + 1; lama[d] = [(Date.parse(d) - Date.parse(e[0])) / 864e5 + 1, e[2]]; } }));
    const HR = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"], mx = Math.max(...r.harian.map(x => x[1]));
    const BLN_P = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const perB = {}; r.harian.forEach(h => (perB[h[0].slice(5, 7)] ||= []).push(h));
    let kum = 0;
    const isi = Object.keys(perB).sort().map(m => { const xs = perB[m], t = xs.reduce((a, x) => a + x[1], 0);
      return xs.map(([d, n]) => { kum += n; return `<tr${d === r.puncak[0] ? ' class="kn-pk"' : ""}><td><b>${tgl(d)}</b></td><td class="kn-mt">${HR[new Date(d + "T00:00:00Z").getUTCDay()]}</td>
          <td class="kn-cb"><span class="kn-cbi">${batang(n, mx)}<b class="num">${fmt(n)}</b></span></td><td class="r">${fmt(kum)}</td><td class="r">${fmt(frp[d])}</td><td class="r">${[...jam[d]].length}</td><td class="r" style="white-space:nowrap">${lama[d][1] > 1 ? `hari ke-${fmt(lama[d][0])}<span class="kn-mt"> / ${fmt(lama[d][1])}</span>` : "1 hari"}</td><td class="r">${ke[d]}</td><td>${(([n, w]) => `<span class="kn-pr" style="--w:${w}">${n}</span>`)(parahHari(r, d))}</td></tr>`; }).join("")
        + (xs.length > 1 ? `<tr class="kn-sub"><td colspan="2">Subtotal ${BLN_P[+m - 1]}</td><td class="r">${fmt(t)} titik</td><td class="r">${fmt(kum)}</td><td colspan="5" class="kn-mt">${fmt(xs.length)} hari dengan hotspot</td></tr>` : ""); }).join("");
    return `<section class="kn-harian"><div class="kn-band"><b>Titik panas harian 2026</b><span>${fmt(r.titik)} titik · ${fmt(r.hari_aktif)} hari dengan hotspot · puncak ${tgl(r.puncak[0])} (${fmt(r.puncak[1])})</span></div>${grafik(r)}${top5Hari(r)}
      <div class="tw kn-hr-tb"><table class="kn-tb"><thead><tr><th>Tanggal</th><th>Hari</th><th class="kn-cb">Titik panas</th><th class="r">Kumulatif</th><th class="r">FRP maks (MW)</th><th class="r">Lintasan satelit</th><th class="r">Api bertahan</th><th class="r">Kejadian ke-</th><th>Keparahan</th></tr></thead>
      <tbody>${isi}<tr class="kn-tot"><td colspan="2">Jumlah</td><td class="r">${fmt(r.titik)}</td><td class="r">${fmt(r.titik)}</td><td class="r">${fmt(r.frp_maks)}</td><td></td><td class="r">terlama ${fmt(Math.max(...r.kejadian.map(e => e[2])))} hari</td><td class="r">${fmt(r.kejadian.length)}</td><td></td></tr></tbody></table></div>
      <p class="kn-mt kn-hr-k">${fmt(r.hari_aktif)} hari dengan hotspot, ${fmt(r.titik)} titik. Baris berwarna = hari puncak. Lintasan = jumlah lewatan satelit S-NPP yang menangkap api hari itu. Api bertahan = hari ke-berapa dalam kejadiannya, dari lama kejadian itu (jeda ≤ ${IDX.jeda_kejadian} hari tanpa hotspot tetap satu kejadian). Keparahan = aturan tabel kompleks api, dihitung per hari dari kompleks titik ≤ 1,5 km hari itu (titik, FRP maks, hari berturut-turut): sangat tinggi ≥ 100 titik atau ≥ 5 hari dengan FRP ≥ 50 MW; tinggi ≥ 20 titik atau ≥ 4 hari; sedang ≥ 5 titik.</p></section>`;
  }

  /* kejadian kebakaran (urut waktu) + kompleks api 7 hari + titik terbaru, tiap bagian berpita navy */
  function kejadianTabel(r) {
    const b7 = new Date(Date.parse(IDX.sampai.slice(0, 10)) - 6 * 864e5).toISOString().slice(0, 10);
    const mxL = Math.max(...r.kejadian.map(e => e[2])), mxT = Math.max(...r.kejadian.map(e => e[3]));
    const kj = `<section class="kn-sek"><div class="kn-band"><b>Kejadian kebakaran</b><span>${r.kejadian.length} kejadian · jeda ≤ ${IDX.jeda_kejadian} hari tanpa hotspot dihitung satu kejadian</span></div>
      <div class="tw"><table class="kn-tb"><thead><tr><th>No</th><th>Periode</th><th class="kn-cb">Lama</th><th class="kn-cb">Titik panas</th><th>Status</th></tr></thead><tbody>
      ${r.kejadian.map((e, j) => `<tr${e[3] === mxT ? ' class="kn-pk"' : ""}><td>${j + 1}</td><td class="kn-nw"><b>${rentang(e[0], e[1])}</b></td>
        <td class="kn-cb"><span class="kn-cbi">${batang(e[2], mxL, "#1d4e89")}<b class="num">${fmt(e[2])} hari</b></span></td><td class="kn-cb"><span class="kn-cbi">${batang(e[3], mxT)}<b class="num">${fmt(e[3])}</b></span></td>
        <td>${e[1] >= b7 ? '<span class="kn-ak">Masih berlangsung</span>' : '<span class="kn-sl">Selesai</span>'}</td></tr>`).join("")}
      </tbody></table></div></section>`;
    /* keparahan kompleks: titik, lama (hari dengan hotspot), daya api maksimum */
    /* tabel kompleks: 10 terbesar + satu baris ringkasan sisanya; lain = [jumlah, titik, titik maks] di luar daftar */
    const tabelK = (judul, ks, lain, catatan) => {
      const sisa = ks.slice(10), nS = sisa.length + (lain ? lain[0] : 0), tS = sisa.reduce((a, k) => a + k[3], 0) + (lain ? lain[1] : 0),
        mS = Math.max(0, ...sisa.map(k => k[3]), lain ? lain[2] : 0), nT = ks.length + (lain ? lain[0] : 0);
      return `<section class="kn-sek"><div class="kn-band"><b>${judul}</b><span>${fmt(nT)} kompleks · ${catatan}</span></div>
      <div class="tw"><table class="kn-tb"><thead><tr><th>No</th><th>Lokasi</th><th>Koordinat</th><th class="r">Titik</th><th class="r">Hari</th><th>Rentang</th><th class="r">FRP maks (MW)</th><th>Keparahan</th></tr></thead><tbody>
      ${ks.slice(0, 10).map((k, j) => { const [n, w] = parah(k); return `<tr><td>${j + 1}</td><td class="kn-nw"><b>${esc(k[2].split(",")[0] || "–")}</b>, ${esc((k[2].split(",")[1] || "").trim())}</td>
        <td class="num kn-nw"><a class="kn-ln" href="https://www.google.com/maps/dir/?api=1&destination=${k[0]},${k[1]}" target="_blank" rel="noopener">${k[0].toFixed(4)}, ${k[1].toFixed(4)}</a></td>
        <td class="r"><b>${fmt(k[3])}</b></td><td class="r">${fmt(k[6])}</td><td class="kn-nw">${rentang(k[4], k[5])}</td><td class="r">${fmt(k[7])}</td><td><span class="kn-pr" style="--w:${w}">${n}</span></td></tr>`; }).join("")}
      ${nS ? `<tr class="kn-sub"><td></td><td colspan="2">${fmt(nS)} kompleks kecil lain</td><td class="r">${fmt(tS)}</td><td colspan="4" class="kn-mt">masing-masing ≤ ${fmt(mS)} titik</td></tr>` : ""}
      </tbody></table></div></section>`; };
    const kl = r.kompleks_lalu || [];
    const kp = (r.kompleks?.length ? tabelK("Kompleks api 7 hari terakhir", r.kompleks, null, "titik berdekatan ≤ 1,5 km") : "")
      + (kl.length ? tabelK("Kompleks api sebelumnya", kl, r.kompleks_lalu_sisa, `sejak ${tgl(r.pertama)}, sebelum 7 hari terakhir`) : "")
      + (r.kompleks?.length || kl.length ? `<p class="kn-mt kn-hr-k">Kompleks = titik berdekatan ≤ 1,5 km dengan selang ≤ 7 hari. Hari = hari dengan hotspot. Keparahan: sangat tinggi ≥ 100 titik atau ≥ 5 hari dengan FRP ≥ 50 MW; tinggi ≥ 20 titik atau ≥ 4 hari; sedang ≥ 5 titik.</p>` : "");
    const tt = `<section class="kn-sek"><div class="kn-band"><b>Titik panas terbaru</b><span>12 deteksi terakhir VIIRS S-NPP</span></div>
      <div class="tw"><table class="kn-tb"><thead><tr><th>No</th><th>Waktu</th><th>Koordinat</th><th class="r">Daya api (MW)</th></tr></thead><tbody>
      ${r.pt.slice(-12).reverse().map((p, j) => `<tr><td>${j + 1}</td><td class="kn-nw"><b>${tgl("2026-" + p[2].slice(0, 5))}</b> ${p[2].slice(6)} WIB</td><td class="num kn-nw">${p[0].toFixed(4)}, ${p[1].toFixed(4)}</td><td class="r">${fmt(p[3])}</td></tr>`).join("")}
      </tbody></table></div></section>`;
    /* kebakaran di gambut: kejadian yang titiknya jatuh di lahan gambut (jeda sama dengan kejadian umum) */
    const gk = r.gambut_kejadian || [];
    const gm = gk.length ? (() => { const mL = Math.max(...gk.map(e => e[2])), mT = Math.max(...gk.map(e => e[3]));
      return `<section class="kn-sek"><div class="kn-band"><b>Kebakaran di lahan gambut</b><span>${fmt(r.gambut_ha)} ha gambut di konsesi · ${fmt(r.gambut_titik)} titik · indikasi terbakar ${ha(r.gambut_bakar_ha)} ha · ${gk.length} kejadian</span></div>
      <div class="tw"><table class="kn-tb"><thead><tr><th>No</th><th>Periode</th><th class="kn-cb">Lama</th><th class="kn-cb">Titik di gambut</th><th>Status</th></tr></thead><tbody>
      ${gk.map((e, j) => `<tr${e[3] === mT ? ' class="kn-pk"' : ""}><td>${j + 1}</td><td class="kn-nw"><b>${rentang(e[0], e[1])}</b></td>
        <td class="kn-cb"><span class="kn-cbi">${batang(e[2], mL, "#6b4a2b")}<b class="num">${fmt(e[2])} hari</b></span></td><td class="kn-cb"><span class="kn-cbi">${batang(e[3], mT, "#6b4a2b")}<b class="num">${fmt(e[3])}</b></span></td>
        <td>${e[1] >= b7 ? '<span class="kn-ak">Masih berlangsung</span>' : '<span class="kn-sl">Selesai</span>'}</td></tr>`).join("")}
      </tbody></table></div></section>`; })() : "";
    return `<div class="kn-dua kn-dua-b"><div>${kj}</div><div>${tt}</div></div>${gm}${kp}`;
  }

  const blokInfo = (judul, rows) => `<table class="kn-it"><thead><tr><th colspan="2">${judul}</th></tr></thead><tbody>${rows.map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join("")}</tbody></table>`;
  function profil(r, i) {
    const kw = Object.entries(r.kawasan || {}).filter(([, v]) => v >= .01).map(([f, v]) => `${KWS[f] || f} ${pct(v)}`).join(", ") || "Di luar kawasan hutan tercatat";
    const ps = r.pemegang || [];
    const terlama = r.kejadian.reduce((a, e) => e[2] > a[2] ? e : a, r.kejadian[0]);
    const g = gambar.get(r.id + S.dasar);
    const [la, lo] = r.pusat;
    return `<article class="kn-kartu kn-prof" id="p${i}" data-i="${i}">
      <header class="kn-ph">
        <span class="kn-no">${r._rp}</span>
        <div class="kn-ph-t"><span class="kn-ph-ey">${esc(r.kabU)}, ${esc(namaProv(r.prov))}</span><h2>${esc(r.nama)}</h2></div>
        <div class="kn-ph-m">${jenisPil(r.jenis)}${r.rspo ? `<span class="kn-j" style="--w:#2f7d4f" title="Anggota RSPO (data RSPO 2020)">RSPO</span>` : ""}${r.grup ? `<span class="kn-grp">${logo(r.unit || r.grup, 20)}${(r.negara || []).map(k => bendera(k, 14)).join("")}<b>${esc(r.grup)}</b>${r.unit ? `<em>${esc(r.unit)}</em>` : ""}</span>` : ""}
          ${r.titik_7h ? `<span class="kn-sta kn-sta-a"><i></i><span>Masih ada api</span><b>${fmt(r.titik_7h)}</b><small>titik${r.kompleks?.length ? ` · ${fmt(r.kompleks.length)} kompleks` : ""} · 7 hari</small></span>` : `<span class="kn-sta"><i></i><span>Tanpa hotspot 7 hari terakhir</span></span>`}</div>
      </header>
      <section class="kn-kpi kn-kpi-p">
        <div><span class="kn-kpi-l">Titik panas 2026</span><b>${fmt(r.titik)}</b><small>puncak ${tgl(r.puncak[0])} (${fmt(r.puncak[1])} titik)</small></div>
        <div><span class="kn-kpi-l">Indikasi terbakar</span><b>${ha(r.luas_bakar_ha)}<em> ha</em></b><small>${pct(r.persen_bakar)} dari ${ha(r.luas_ha)} ha konsesi</small></div>
        <div><span class="kn-kpi-l">Hari dengan hotspot</span><b>${fmt(r.hari_aktif)}<em> hari</em></b><small>${r.kejadian.length} kejadian, terlama ${fmt(terlama[2])} hari</small></div>
        <div class="${r.titik_7h ? "kn-kpi-a" : ""}"><span class="kn-kpi-l">7 hari terakhir</span><b>${fmt(r.titik_7h)}</b><small>${r.titik_7h ? "titik, api masih menyala" : "tidak ada titik"}</small></div>
      </section>
      <div class="kn-dua">
        <div class="kn-info">
          ${blokInfo("Identitas", [
            ["Jenis usaha", `${jenisPil(r.jenis)} ${JN[r.jenis]?.[2] || r.jenis}`],
            ["Grup usaha", r.grup ? `<span class="kn-isi"><span class="kn-gr">${logo(r.grup, 20)}<b>${esc(r.grup)}</b></span>${(r.negara || []).map(k => `<span class="kn-ngp">${bendera(k, 12)}${NEG[k] || k}</span>`).join("")}</span>` : `<span class="kn-mt">Belum teridentifikasi</span>`],
            ...(r.unit ? [["Unit usaha", `<span class="kn-isi"><span class="kn-gr">${logo(r.unit, 20)}<b>${esc(r.unit)}</b></span><span class="kn-ngp kn-ngp-j">${JN[r.jenis][0]}</span></span>`]] : []),
            ...(ps.length ? [["Pemegang saham", ps.map(x => `<span class="kn-ps">${bendera(x.negara, 11)}${esc(x.nama)}</span>`).join("")]] : []),
            ...((r.tokoh || []).length ? [["Tokoh terkait", r.tokoh.map(t => `<span class="kn-ps"><b>${esc(t.nama)}</b> · ${esc(t.peran)}<small>${esc(t.kaitan)}</small></span>`).join("")]] : []),
            ...(r.rspo ? [["RSPO", `<b>Anggota</b> lewat ${esc(r.rspo.grup)}${r.rspo.sejak ? ` sejak ${esc(r.rspo.sejak)}` : ""}; unit ${r.rspo.sertifikat ? "<b>bersertifikat</b>" : "belum bersertifikat"} <small>data RSPO 2020 via GFW</small>`]]
              : r.jenis === "sawit" ? [["RSPO", `<span class="kn-mt">Tidak tercatat sebagai anggota (data RSPO 2020)</span>`]] : []),
            ...((r.sanksi || []).length ? [["Sanksi karhutla", r.sanksi.map(x => `<span class="kn-ps"><b>${esc(SNK[x.jenis] || x.jenis)}</b>${x.tahun ? ` ${x.tahun}` : ""}${x.nilai ? ` · Rp${fmt(Math.round(x.nilai / 1e9))} miliar` : ""}${x.perkara ? ` · ${esc(x.perkara)}` : ""}<small>${esc(x.status)} · <a class="kn-ln" href="${esc(x.url)}" target="_blank" rel="noopener">sumber</a></small></span>`).join("")]] : []),
            ["Luas konsesi", `<b>${ha(r.luas_ha)} ha</b> <small>${r.blok} blok · peta ${r.tahun_data || "–"}</small>`],
            ["Sumber peta", `<span class="kn-sb">${SB[r.jenis]?.[0] || "–"}</span> <small>${SB[r.jenis]?.[1] || ""}</small>`],
            ...(r.walhi_ket ? [["Keterangan", esc(r.walhi_ket.replace(/\s*\(WALHI[^)]*\)/g, ""))]] : [])])}
          ${blokInfo("Wilayah", [
            ["Provinsi", esc(namaProv(r.prov))],
            ["Kabupaten/kota", esc((r.kab_titik?.length ? r.kab_titik : r.kab).join(", ") || "–")],
            ["Kecamatan", esc(r.kec.map(k => k.split(",")[0]).join(", ") || "–")],
            ["Titik tengah api", `<span class="num">${la}, ${lo}</span> <a class="kn-ln" href="https://www.google.com/maps/dir/?api=1&destination=${la},${lo}" target="_blank" rel="noopener">Rute</a>`]])}
          ${blokInfo("Kebakaran", [
            ["Periode api", `<b>${tglT(r.pertama)} – ${tglT(r.terakhir)}</b> <small>rentang ${fmt(r.rentang_hari)} hari</small>`],
            ["Kejadian terlama", `<b>${rentang(terlama[0], terlama[1])}</b> <small>${fmt(terlama[2])} hari · ${fmt(terlama[3])} titik</small>`],
            ["Lahan gambut", r.gambut_ha == null ? `${batang(r.gambut, 1, "#6b4a2b")} <b>${pct(r.gambut)}</b> <small>titik di gambut</small>`
              : `<b>${ha(r.gambut_ha)} ha</b> <small>${pct(r.luas_ha ? r.gambut_ha / r.luas_ha : null)} konsesi</small>`],
            ...(r.gambut_titik ? [["Api di gambut", `<b>${fmt(r.gambut_titik)} titik</b> <small>${pct(r.gambut)} titik · indikasi terbakar ${ha(r.gambut_bakar_ha)} ha · ${r.gambut_kejadian.length} kejadian, terlama ${fmt(Math.max(...r.gambut_kejadian.map(e => e[2])))} hari</small>`]] : []),
            ["Status kawasan", esc(kw)],
            ["Daya api (FRP)", `<b>maks ${fmt(r.frp_maks)} MW</b> <small>total ${fmt(r.frp_total)} MW</small>`]])}
        </div>
        <div class="kn-kanan"><figure><div class="kn-img" data-k="0">${g ? `<img src="${g[0]}" alt="">` : `<span>Menggambar peta…</span>`}</div>
          <figcaption>${S.dasar === "google" ? "Google Satelit" : S.dasar === "esri" ? "Citra satelit Esri" : "Peta jalan OpenStreetMap"}: batas konsesi dan ${fmt(r.titik)} titik panas 2026</figcaption></figure>${legenda()}</div>
      </div>
      <section class="kn-sek kn-pasang"><div class="kn-band"><b>Citra Sentinel-2 paling jelas: api &amp; bekas bakar</b><span>kiri citra dasar + titik 14 hari sebelumnya · kanan SWIR Sentinel-2 20 m</span></div>
        <div class="kn-ps-grid">${pasangan(r).map(({d, n, c, jelas}, j) => `<div class="kn-ps-row"><div class="kn-ps-h"><b>${tglT(d)}${jelas ? ' <span class="kn-jl">Jelas</span>' : ""}</b><span>${API}${fmt(n)} titik${jelas ? " · 14 hari" : ""}</span></div>
          <figure><div class="kn-img" data-k="${1 + 2 * j}">${g ? `<img src="${g[1 + 2 * j]}" alt="">` : `<span>Menggambar…</span>`}</div><figcaption>${S.dasar === "google" ? "Google Satelit" : S.dasar === "esri" ? "Citra Esri" : "Peta jalan"} + titik ${jelas ? `s.d. ${tgl(d)}` : tgl(d)}</figcaption></figure>
          <figure><div class="kn-img" data-k="${2 + 2 * j}">${g ? `<img src="${g[2 + 2 * j]}" alt="">` : `<span>Menggambar…</span>`}</div><figcaption>${c ? `SWIR ${esc(c.satelit)} ${tgl(c.tgl)} · awan ${c.awan}%${c.bakar_pct != null ? ` · lahan hangus ${fmt(c.bakar_pct)}%` : ""}` : "SWIR VIIRS (Sentinel-2 belum ada)"}</figcaption></figure></div>`).join("")}</div>
        ${LEG_SWIR}
      </section>
      ${harian(r)}
      ${kejadianTabel(r)}
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
  const gibs = (d, sat = "SNPP") => ({tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_${sat}_CorrectedReflectance_BandsM11-I2-I1/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`], attribution: "NASA GIBS / VIIRS S-NPP SWIR", maxzoom: 9, swir: true});
  const batasTujuh = () => { const b = new Date(Date.parse(IDX.sampai.slice(0, 10)) - 6 * 864e5).toISOString().slice(5, 10); return b; };
  const fiturPoli = rs => ({type: "FeatureCollection", features: rs.flatMap((r, i) => r.geom.map(g => ({type: "Feature", properties: {i, nama: r.nama, w: JN[r.jenis]?.[1]}, geometry: g})))});
  const fiturTitik = (rs, hari) => { const b7 = batasTujuh();
    return {type: "FeatureCollection", features: rs.flatMap(r => r.pt.filter(p => !hari || (Array.isArray(hari) ? hari.includes(p[2].slice(0, 5)) : p[2].startsWith(hari))).map(p => ({type: "Feature", properties: {b: p[2].slice(0, 5) >= b7 ? 1 : 0}, geometry: {type: "Point", coordinates: [p[1], p[0]]}})))}; };
  /* label nama perusahaan di titik tengah apinya (callout); lab = jumlah label teratas, 0 = tanpa label */
  const fiturLabel = (rs, lab) => ({type: "FeatureCollection", features: rs.slice().sort((a, b) => a._rp - b._rp).slice(0, lab).map(r => ({type: "Feature", properties: {n: String(r._rp), t: r.titik}, geometry: {type: "Point", coordinates: [r.pusat[1], r.pusat[0]]}}))});
  const gaya = (dasar, rs, hari, rad, lab = 0) => ({version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {...(dasar.img ? {d0: {type: "raster", tileSize: 256, ...DASAR.google}} : {}), d: dasar.img ? {type: "image", url: dasar.img, coordinates: [[dasar.bb[0], dasar.bb[3]], [dasar.bb[2], dasar.bb[3]], [dasar.bb[2], dasar.bb[1]], [dasar.bb[0], dasar.bb[1]]]} : {type: "raster", tileSize: 256, ...dasar}, p: {type: "geojson", data: fiturPoli(rs)}, t: {type: "geojson", data: fiturTitik(rs, hari)}, l: {type: "geojson", data: fiturLabel(rs, lab)}},
    layers: [{id: "bg", type: "background", paint: {"background-color": "#10202f"}},
      ...(dasar.img ? [{id: "d0", type: "raster", source: "d0", paint: {"raster-saturation": -.6, "raster-brightness-max": .75}}] : []),
      {id: "d", type: "raster", source: "d", paint: dasar.img ? {"raster-fade-duration": 0} : {}},
      {id: "pf", type: "fill", source: "p", paint: {"fill-color": "#00e5ff", "fill-opacity": .08}},
      {id: "pl", type: "line", source: "p", paint: {"line-color": "#00e5ff", "line-width": 2.2}},
      /* di citra SWIR titik hanya cincin tipis, supaya bekas bakar di bawahnya tetap terlihat (pemilik, 18 Okt 2026) */
      dasar.img || dasar.swir ? {id: "t", type: "circle", source: "t", paint: {"circle-radius": 3, "circle-opacity": 0, "circle-stroke-color": "#ffe14d", "circle-stroke-width": .8, "circle-stroke-opacity": .85}} :
      {id: "t", type: "circle", source: "t", paint: {"circle-radius": rad, "circle-color": ["case", ["==", ["get", "b"], 1], "#ff2d2d", "#ffcc00"], "circle-stroke-color": "#3a0a00", "circle-stroke-width": .6, "circle-opacity": .92}}]});
  const bbox = rs => { let a = [180, 90, -180, -90]; const ad = ([x, y]) => { a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)]; };
    rs.forEach(r => { r.geom.forEach(g => (g.type === "MultiPolygon" ? g.coordinates.flat(2) : g.coordinates.flat(1)).forEach(ad)); r.pt.forEach(p => ad([p[1], p[0]])); }); return [[a[0], a[1]], [a[2], a[3]]]; };

  let peta = null;
  function petaUtama() {
    if (peta) { peta.remove(); peta = null; }
    const rs = daftar.slice(0, 300);   // ponytail: peta utama dibatasi 300 konsesi teratas supaya ringan
    peta = new maplibregl.Map({container: "knPeta", style: gaya(DASAR[S.dasar], rs, null, ["interpolate", ["linear"], ["zoom"], 5, 1.6, 10, 4], SUSUN.length === 1 ? 300 : 0), bounds: bbox(rs), fitBoundsOptions: {padding: 30},
      attributionControl: {compact: true}, canvasContextAttributes: {preserveDrawingBuffer: true}, preserveDrawingBuffer: true});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}));
    if (SUSUN.length === 1) { const tata = () => calloutSvg(peta, rs, 300); peta.on("load", tata); peta.on("moveend", tata); peta.on("resize", tata); }
    peta.on("click", "pf", e => { const p = e.features[0].properties;
      new maplibregl.Popup({closeButton: true}).setLngLat(e.lngLat).setHTML(`<b>${esc(p.nama)}</b><br>${+p.i < S.profil ? `<a href="#p${p.i}">Lihat profil</a>` : `peringkat ${+p.i + 1}`}`).addTo(peta); });
    peta.on("mouseenter", "pf", () => { peta.getCanvas().style.cursor = "pointer"; });
    peta.on("mouseleave", "pf", () => { peta.getCanvas().style.cursor = ""; });
  }

  /* ---------- gambar peta per perusahaan: satu peta tersembunyi, antre ---------- */
  let kanvas = null, antre = Promise.resolve();
  const siapKanvas = () => kanvas ||= new maplibregl.Map({container: "knKanvas", style: {version: 8, sources: {}, layers: []}, interactive: false, attributionControl: false,
    preserveDrawingBuffer: true, canvasContextAttributes: {preserveDrawingBuffer: true}, fadeDuration: 0});
  /* ---------- callout bernomor: ditaruh berurut nomor, tiap penanda mencoba titik tengah apinya lalu cincin di sekitarnya;
     yang tak kebagian tempat tidak digambar (muncul saat diperbesar). Dulu disebar paksa semuanya, hasilnya gumpalan
     sarang lebah yang menutupi peta saat zoom jauh (pemilik, 18 Okt 2026) ---------- */
  function tataCallout(ps, w, h, r = 11) {
    const min = r * 2 + 3, L = [], xs = ps.map(p => p.x), ys = ps.map(p => p.y);
    /* label paling banyak menutup ~1/4 kotak sebaran api (+ satu cincin), prioritas titik panas terbanyak */
    const maks = Math.max(8, Math.floor((Math.max(...xs) - Math.min(...xs) + min * 2) * (Math.max(...ys) - Math.min(...ys) + min * 2) / (min * min * 4)));
    ps = ps.slice().sort((a, b) => b.t - a.t);
    const arah = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);
    for (const p of ps) {
      const calon = [[p.x, p.y], ...[min, min * 1.8].flatMap(d => arah.map(([ux, uy]) => [p.x + ux * d, p.y + uy * d]))];
      const ok = calon.find(([lx, ly]) => lx > r && ly > r && lx < w - r && ly < h - r && L.every(q => Math.hypot(q.lx - lx, q.ly - ly) >= min));
      if (ok && L.push({...p, lx: ok[0], ly: ok[1]}) >= maks) break;
    }
    return L;
  }
  const labelDari = (rs, lab) => rs.slice().sort((a, b) => a._rp - b._rp).slice(0, lab).map(r => ({n: String(r._rp), t: r.titik, lon: r.pusat[1], lat: r.pusat[0]}));
  /* gambar callout di atas gambar peta (kanvas 2D), dipakai untuk potret/cetak */
  function callout2d(m, rs, lab) {
    const src = m.getCanvas(), c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
    const x = c.getContext("2d"), s = src.width / src.clientWidth; x.drawImage(src, 0, 0);
    const L = tataCallout(labelDari(rs, lab).map(p => { const q = m.project([p.lon, p.lat]); return {...p, x: q.x * s, y: q.y * s}; }), c.width, c.height, 11 * s);
    x.lineWidth = 1.6 * s; x.strokeStyle = "#ffffff";
    L.forEach(p => { if (Math.hypot(p.lx - p.x, p.ly - p.y) > 4 * s) { x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.lx, p.ly); x.stroke(); x.beginPath(); x.arc(p.x, p.y, 2.6 * s, 0, 7); x.fillStyle = "#fff"; x.fill(); } });
    L.forEach(p => { x.beginPath(); x.arc(p.lx, p.ly, 11 * s, 0, 7); x.fillStyle = "#0b2545"; x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 2 * s; x.stroke();
      x.fillStyle = "#fff"; x.font = `800 ${(p.n.length > 2 ? 8.5 : 10) * s}px Inter, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(p.n, p.lx, p.ly + .5 * s); });
    return c.toDataURL("image/jpeg", .88);
  }
  /* callout di peta interaktif: SVG di atas peta, ditata ulang tiap selesai geser/zoom */
  function calloutSvg(m, rs, lab) {
    let svg = m.getContainer().querySelector(".kn-co");
    if (!svg) { svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "kn-co"); m.getContainer().append(svg); }
    const w = m.getContainer().clientWidth, h = m.getContainer().clientHeight;
    const L = tataCallout(labelDari(rs, lab).map(p => { const q = m.project([p.lon, p.lat]); return {...p, x: q.x, y: q.y}; }).filter(p => p.x > -20 && p.y > -20 && p.x < w + 20 && p.y < h + 20), w, h);
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = L.map(p => Math.hypot(p.lx - p.x, p.ly - p.y) > 4 ? `<line x1="${p.x}" y1="${p.y}" x2="${p.lx}" y2="${p.ly}"/><circle class="a" cx="${p.x}" cy="${p.y}" r="2.6"/>` : "").join("")
      + L.map(p => `<g><circle cx="${p.lx}" cy="${p.ly}" r="11"/><text x="${p.lx}" y="${p.ly + 3.6}" font-size="${p.n.length > 2 ? 8.5 : 10}">${p.n}</text></g>`).join("");
  }

  /* uk = [lebar, tinggi] kanvas; peta provinsi digambar besar & mendatar supaya penuh satu halaman A4 */
  const potret = (dasar, rs, hari, lab = 0, uk = [720, 460]) => new Promise(ok => {
    const m = siapKanvas(), kv = $("#knKanvas");
    if (kv.offsetWidth !== uk[0] || kv.offsetHeight !== uk[1]) { kv.style.width = uk[0] + "px"; kv.style.height = uk[1] + "px"; m.resize(); }
    m.setStyle(gaya(dasar, rs, hari, lab ? 2.4 : 3.2, lab), {diff: false});
    m.fitBounds(dasar.img ? [[dasar.bb[0], dasar.bb[1]], [dasar.bb[2], dasar.bb[3]]] : bbox(rs), {padding: dasar.img ? 0 : 28, maxZoom: dasar.maxzoom === 9 ? 11 : 14, animate: false});
    let selesai = false; const t0 = Date.now();
    const ambil = () => { if (selesai) return; if (!m.areTilesLoaded() && Date.now() - t0 < 12000) return void m.once("idle", ambil); selesai = true; try { ok(lab ? callout2d(m, rs, lab) : m.getCanvas().toDataURL("image/jpeg", .86)); } catch (e) { ok(""); } };
    m.once("idle", ambil); setTimeout(ambil, 15000);
  });
  /* piksel hitam (di luar cakupan adegan Sentinel) jadi transparan, supaya citra dasar di bawahnya terlihat */
  const bening = new Map();
  const transparan = url => bening.get(url) || bening.set(url, new Promise(ok => { const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height); for (let i = 0; i < d.data.length; i += 4) if (d.data[i] + d.data[i + 1] + d.data[i + 2] < 12) d.data[i + 3] = 0;
      x.putImageData(d, 0, 0); ok(c.toDataURL("image/png")); }; im.onerror = () => ok(url); im.src = url; })).get(url);
  /* porsi piksel hampir hitam di gambar (celah data VIIRS) */
  const gelap = src => new Promise(ok => { if (!src) return ok(true); const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = 48; c.height = 32;
    const x = c.getContext("2d"); x.drawImage(im, 0, 0, 48, 32); const d = x.getImageData(0, 0, 48, 32).data; let h = 0; for (let i = 0; i < d.length; i += 4) h += d[i] + d[i + 1] + d[i + 2] < 30;
    ok(h / (d.length / 4) > .35); }; im.onerror = () => ok(true); im.src = src; });
  /* pasangan citra: adegan Sentinel-2 paling jelas (citra_jelas.json) dulu, sisanya hari dengan titik terbanyak */
  const hariSebelum = (t, k) => Array.from({length: k + 1}, (_, i) => new Date(Date.parse(t) - i * 864e5).toISOString().slice(5, 10));
  const pasangan = r => {
    const j = (CITJ[r.id] || []).map(c => { const h = hariSebelum(c.tgl, 14); return {d: c.tgl, c, jelas: true, hari: h, n: r.pt.filter(p => h.includes(p[2].slice(0, 5))).length}; });
    const sisa = hariTop(r).filter(([d]) => !j.some(x => x.d === d)).map(([d, n]) => ({d, n, hari: [d.slice(5)], c: CIT[r.id]?.[d]}));
    return [...j, ...sisa].slice(0, 4).sort((a, b) => a.d.localeCompare(b.d));
  };
  /* 4 hari dengan titik terbanyak, urut tanggal */
  const hariTop = r => r.harian.slice().sort((a, b) => b[1] - a[1]).slice(0, 4).sort((a, b) => a[0].localeCompare(b[0]));
  function gambarProfil(i) {
    const r = daftar[i], kunci = r.id + S.dasar;
    if (gambar.has(kunci)) return Promise.resolve();
    return antre = antre.then(async () => {
      if (gambar.has(kunci)) return;
      const out = [await potret(DASAR[S.dasar], [r], null)];
      await janjiCit;
      for (const {d, c, hari} of pasangan(r)) {
        out.push(await potret(DASAR[S.dasar], [r], hari));
        let sw = "";
        if (c) sw = await potret({img: await transparan("/data/" + c.f), bb: c.bbox}, [r], hariSebelum(c.tgl, 1));   /* di SWIR hanya api saat citra diambil */
        /* celah lintasan VIIRS = citra hitam: coba satelit kembar NOAA-20 lalu NOAA-21 */
        else for (const sat of ["SNPP", "NOAA20", "NOAA21"]) { sw = await potret(gibs(d, sat), [r], hari); if (!(await gelap(sw))) break; }
        out.push(sw);
      }
      gambar.set(kunci, out);
      const el = document.getElementById("p" + i);
      if (el && daftar[i] === r) el.querySelectorAll(".kn-img").forEach(d => { const s = gambar.get(kunci)[+d.dataset.k]; d.innerHTML = s ? `<img src="${s}" alt="">` : `<span>Peta gagal digambar</span>`; });
    });
  }
  let io = null;
  function pasangGambar() {
    io?.disconnect();
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); e.target.dataset.pv ? gambarProv(e.target.dataset.pv) : gambarProfil(+e.target.dataset.i); } }), {rootMargin: "150px"});
    document.querySelectorAll(".kn-prof").forEach(el => io.observe(el));
    document.querySelectorAll("[data-pv]").forEach(el => io.observe(el));
  }
  const gambarPv = new Map();
  function gambarProv(k) {
    const kunci = k + S.dasar + S.jenis.size + S.cari;
    if (gambarPv.has(kunci)) { tulisPv(k, gambarPv.get(kunci)); return Promise.resolve(); }
    const rs = SUSUN.find(p => p.k === k)?.rs || [];
    return antre = antre.then(async () => { const g = await potret(DASAR[S.dasar], rs.slice(0, 300), null, 300, [1700, 800]); gambarPv.set(kunci, g); tulisPv(k, g); });
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
  /* gulir ke profil perusahaan (dibuka dulu bila belum dirender), sorot sebentar */
  function naik(i) {
    const r = daftar[i]; if (!r) return;
    if (!document.getElementById("p" + i)) { BUKA.add(r.id); const y = scrollY; render(); scrollTo(0, y); }
    const el = document.getElementById("p" + i); if (!el) return;
    el.scrollIntoView({behavior: "smooth", block: "start"}); el.classList.remove("kn-sorot"); void el.offsetWidth; el.classList.add("kn-sorot");
  }
  $("#knIsi").addEventListener("keydown", e => { const br = e.target.closest?.("[data-gulir]"); if (br && e.target === br && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); naik(+br.dataset.gulir); } });
  $("#knIsi").addEventListener("click", e => {
    const kb = e.target.closest("[data-kab]");
    if (kb) { const k = kb.dataset.kab, buka = !KAB_BUKA.has(k); buka ? KAB_BUKA.add(k) : KAB_BUKA.delete(k); kb.querySelector("button").setAttribute("aria-expanded", buka);
      kb.closest("tbody").querySelectorAll(".kn-baris").forEach(tr => tr.hidden = !buka); return; }
    const br = e.target.closest("[data-gulir]");
    if (br && !e.target.closest("a")) { e.preventDefault(); naik(+br.dataset.gulir); return; }
    const b = e.target.closest("[data-buka]");
    if (b && b.closest("[data-gulir]")) { e.preventDefault(); naik(+b.dataset.buka); return; }
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
      @bottom-left{content:"Sumber: NASA FIRMS; batas konsesi KLHK/Kemenhut; kawasan hutan KLHK; wilayah Kemendagri; olahan Centurisk97";${f}}
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
