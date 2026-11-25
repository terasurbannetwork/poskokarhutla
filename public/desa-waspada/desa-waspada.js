"use strict";
/* Desa Waspada (DW-07): dua daftar desa dari public/data/desa_waspada/ (indeks.json + satu berkas per pulau), dibaca apa adanya.
   Metode daftar dan hindcast diadaptasi dari Pantau Karhutla (MIT, Copyright (c) 2026 Pantau Karhutla), ditulis ulang dan diukur ulang di data kita.
   Teks dari data masuk DOM lewat textContent. Fetch hanya berkas data itu sendiri (peta mini memuat ubin dasar). */
(() => {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const fmt = n => n == null ? "–" : Number(n).toLocaleString("id-ID");
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const HAL = 100, MAKS_JAM_BASI = 12, SEKSI_IK = {
    ringkas: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    a: '<path d="M12 3c1.8 3.5 5.5 5.6 5.5 10a5.5 5.5 0 0 1-11 0c0-2.2 1-3.7 2.4-5 .3 1.8 1.2 2.8 2.3 3.3C11 9 11.3 6 12 3Z"/>',
    b: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/>',
    laju: '<path d="M3 20h18M6 20v-6M11 20V8M16 20v-9"/>',
    batas: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
  };
  const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SEKSI_IK[k]}</svg>`;

  /* ---------- format ---------- */
  const wibDari = ms => { const d = new Date(ms + 7 * 36e5); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), n: d.getUTCMinutes() }; };
  const jam = (h, n) => String(h).padStart(2, "0") + "." + String(n).padStart(2, "0");
  const tglWib = (ms, tahun) => { const w = wibDari(ms); return `${w.d} ${BLN[w.m]}${tahun ? " " + w.y : ""} ${jam(w.h, w.n)} WIB`; };
  /* "2026-10-12 13:57" (sudah WIB) -> "12 Okt 13.57 WIB"; tahun ditulis bila bukan tahun berjalan */
  const terakhir = (s, tahunIni) => { const m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/.exec(s || ""); if (!m) return "–";
    return `${+m[3]} ${BLN[+m[2] - 1]}${+m[1] === tahunIni ? "" : " " + m[1]} ${m[4]}.${m[5]} WIB`; };
  /* porsi gambut dibulatkan ke 5; yang kecil tetapi bukan nol tidak boleh jadi 0 */
  const gambutAng = g => g == null ? null : g === 0 ? "0" : g < .025 ? "<5" : String(Math.round(g * 20) * 5);
  const gambutTeks = g => g == null ? "–" : gambutAng(g) + "%";
  const persen = f => (f * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const persenR = f => f * 100 < 2 ? (f * 100).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : persen(f);

  /* ---------- CSV: penetral rumus (sel teks berawalan = + - @ tab CR diberi apostrof) lalu kutip ---------- */
  const netral = s => /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  const sel = v => { if (v == null) return ""; const s = typeof v === "string" ? netral(v) : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const KOLOM_CSV = ["kode desa", "desa/kelurahan", "kecamatan", "kabupaten/kota", "provinsi", "titik panas 7 hari (VIIRS)", "titik panas 24 jam (VIIRS)",
    "terakhir terdeteksi (WIB)", "tahun terbakar 2012-2025", "bagian di gambut", "peluang kab/kota hari ke-1 (%)", "peluang kab/kota hari ke-2 (%)",
    "peluang kab/kota hari ke-3 (%)", "bujur", "lintang", "daftar"];
  window.DesaWaspadaCsv = { netral, sel, KOLOM_CSV };   /* dipakai uji murni */

  let D = null, P = null, PULAU = "", TAMPIL = "", sPul = null, cache = {}, tokenPulau = 0, K = {}, TAHUN_INI = new Date().getFullYear(), N_TAHUN = 14;
  const peta = {};   /* id daftar -> {map, ...} */

  /* ---------- definisi kolom per daftar ---------- */
  const tahunTeks = r => r[K.tahun] == null ? "kurang dari 3" : r[K.tahun] + " dari " + N_TAHUN;
  const KOL = {
    desa: { n: "Desa", urut: "desa", tip: "Nama desa dan kecamatan. Batas desa disederhanakan, bukan SK batas desa." },
    kab: { n: "Kab/kota", urut: "kab" },
    titik7: { n: "Titik 7 hari", urut: "titik7", num: 1, tip: "Titik panas VIIRS keyakinan nominal dan tinggi, satu per petak 375 m per hari, 7 hari terakhir. Tidak sama dengan angka utama di peta dan tidak dijumlahkan dengannya." },
    titik24: { n: "Titik 24 jam", urut: "titik24", num: 1, ponsel: 1, tip: "Titik panas dengan definisi yang sama, 24 jam terakhir." },
    terakhir: { n: "Terakhir terdeteksi", urut: "terakhir", ponsel: 1 },
    tahun: { n: "Tahun terbakar", urut: "tahun", num: 1, tip: "Jumlah tahun terbanyak pada satu petak 375 m milik desa, 2012 sampai 2025: batas bawah. Kurang dari 3 bukan berarti 0." },
    tahun_akhir: { n: "Tahun terakhir terbakar", urut: "tahun_akhir", num: 1, ponsel: 1 },
    gambut: { n: "Gambut", urut: "gambut", num: 1, ponsel: 1, pil: "perkiraan", tip: "Perkiraan bagian desa di atas gambut dari poligon 1:250.000, dibulatkan ke 5 persen. Tanda – berarti tanpa data." },
  };
  const ISI = {
    desa: (r, c) => { const b = el("button", "dw-desa", r[K.desa]); b.type = "button"; b.dataset.kd = r[K.kd]; b.title = `${r[K.desa]}, kecamatan ${r[K.kec]}, ${r[K.kab]}`;
      const s = el("small", null, r[K.kec]); c.append(b, s); },
    kab: (r, c) => { c.textContent = r[K.kab]; },
    titik7: (r, c) => { c.textContent = fmt(r[K.titik7]); },
    titik24: (r, c) => { c.textContent = fmt(r[K.titik24]); },
    terakhir: (r, c) => { c.textContent = terakhir(r[K.terakhir], TAHUN_INI); },
    tahun: (r, c) => { c.textContent = tahunTeks(r); },
    tahun_akhir: (r, c) => { c.textContent = r[K.tahun_akhir] ?? "–"; },
    gambut: (r, c) => { c.textContent = gambutTeks(r[K.gambut]); },
  };
  const P_KUNCI = ["p1", "p2", "p3"];
  const DAFTAR = {
    a: { id: "a", kol: ["desa", "kab", "titik7", "titik24", "terakhir", "tahun", "gambut"], urut: ["titik7", -1], judul: "Titik panas 7 hari", warna: "--bad", kosong: "Tidak ada desa dengan titik panas 7 hari di sini." },
    b: { id: "b", kol: ["desa", "kab", "tahun", "tahun_akhir", "gambut"], urut: ["tahun", -1], judul: "Pernah terbakar berulang", warna: "--brand2", kosong: "Tidak ada desa yang memenuhi riwayat berulang di sini." },
  };

  /* ---------- kartu ---------- */
  const kotak = (host, kunci, judul, tip, kanan) => {
    const a = el("article", "ex ex-std"), hd = el("header", "ex-hd"), jd = el("div", "ex-jd"), h3 = el("h3");
    h3.insertAdjacentHTML("afterbegin", svg(kunci)); h3.append(judul); h3.title = tip || "";
    jd.append(h3); if (kanan) jd.append(kanan);
    hd.append(el("span", "ex-ey"), jd); const bd = el("div", "ex-bd"); a.append(hd, bd); host.replaceChildren(a); return { a, hd, jd, bd, h3 }; };
  const pil = t => el("span", "dw-pil", t);

  const sibuk = ya => ["dwA", "dwB"].forEach(id => { const h = document.getElementById(id); h.classList.toggle("dw-sibuk", ya); if (ya) h.setAttribute("aria-busy", "true"); else h.removeAttribute("aria-busy"); });
  const hipotesis = () => D.laju?.status !== "lulus";
  const jumlah = k => { const v = Object.values(D.pulau).map(p => p[k]); return v.some(x => x == null) ? null : v.reduce((s, x) => s + x, 0); };

  function ringkasan() {
    const host = document.getElementById("dwRingkas"), k = kotak(host, "ringkas", "Ringkasan", "Dua daftar desa dari titik panas VIIRS 7 hari dan riwayat petak 2012 sampai 2025.");
    const dl = el("dl", "dw-ring");
    const baris = (n, v) => { const d = el("div"); d.append(el("dt", null, n), el("dd", null, v)); dl.append(d); };
    baris("Desa dengan titik panas 7 hari", fmt(jumlah("a_total"))); baris("Desa pernah terbakar berulang, tanpa titik minggu ini", fmt(jumlah("b_total")));
    const dibuat = Date.parse(D.dibuat), acuan = Date.parse(D.acuan);
    baris("Daftar dibuat", isNaN(dibuat) ? "–" : tglWib(dibuat, true)); baris("Titik panas terakhir diperbarui", isNaN(acuan) ? "–" : tglWib(acuan, true));
    k.bd.append(dl);
    if (!isNaN(acuan) && Date.now() - acuan > MAKS_JAM_BASI * 36e5) k.bd.append(el("p", "dw-awas", `Data titik panas lebih tua dari ${MAKS_JAM_BASI} jam. Daftar belum mengikuti keadaan terbaru.`));
    const def = D.definisi || {};
    k.bd.append(el("p", "dw-def", `Titik panas: satelit VIIRS, keyakinan nominal dan tinggi, ${Math.round((def.jendela_jam || 168) / 24)} hari terakhir. Pernah terbakar berulang: sedikitnya ${def.min_tahun || 3} tahun terbakar pada satu petak, ${(def.tahun_riwayat || [])[0]} sampai ${(def.tahun_riwayat || [])[1]}, dan tanpa titik panas 7 hari. Peluang yang ditampilkan adalah peluang kab/kota, bukan peluang desa.`));
    if (hipotesis()) k.jd.append(pil("hipotesis")), k.h3.title += " Laju terukur belum lolos ambang pengesahan, jadi berlabel hipotesis.";
    sPul = el("select"); sPul.setAttribute("aria-label", "Pulau");
    Object.entries(D.pulau).forEach(([n, v]) => sPul.append(new Option(`${n} (${fmt(v.a_total)} desa dengan titik, ${fmt(v.b_total)} desa berulang)`, n)));
    sPul.value = PULAU; sPul.addEventListener("change", () => { PULAU = sPul.value; sibuk(true); nanti(() => muatPulau(PULAU)); });   /* chrome langsung, muat menyusul */
    const w = el("div", "dw-ctl"); w.append(sPul); k.jd.append(w);
  }

  /* ---------- daftar ---------- */
  /* satu pendengar untuk semua daftar: layar lebar membuka peta yang ada */
  const mq = matchMedia("(min-width: 640px)");
  mq.addEventListener("change", () => { if (mq.matches) [DAFTAR.a, DAFTAR.b].forEach(d => { if (d.kanPeta) d.kanPeta.open = true; }); });
  function bangun(d) {
    const host = document.getElementById(d.id === "a" ? "dwA" : "dwB");
    /* ganti pulau: peta MapLibre dipakai ulang (elemen d.mpEl dipindah ke kartu baru), hanya sumbernya diisi ulang */
    const kanan = el("div", "dw-ctl");
    const sProv = el("select"), sKab = el("select"), cari = el("input"), unduh = el("button", "dw-unduh", "Unduh CSV");
    sProv.setAttribute("aria-label", "Provinsi"); sKab.setAttribute("aria-label", "Kabupaten/kota"); sKab.disabled = true;
    cari.type = "search"; cari.placeholder = "Cari nama desa"; cari.setAttribute("aria-label", "Cari nama desa"); cari.autocomplete = "off";
    unduh.type = "button"; unduh.title = "Mengunduh daftar yang sedang disaring, semua halaman.";
    kanan.append(sProv, sKab, cari, unduh);
    const k = kotak(host, d.id, d.judul, d.id === "a" ? "Desa dengan sedikitnya satu titik panas VIIRS dalam 7 hari. Desa di lereng gunung api aktif bisa masuk karena titik gunung, bukan kebakaran lahan." : "Desa tanpa titik panas 7 hari yang sedikitnya 3 tahun terbakar pada satu petak, 2012 sampai 2025. Riwayat bukan penilaian atas desa.", kanan);
    if (d.id === "b" && hipotesis()) k.jd.append(pil("hipotesis"));
    k.jd.append(pil(PULAU));
    const ket = el("p", "dw-ket"), grid = el("div", "dw-grid"), kiri = el("div", "dw-kiri"), tw = el("div", "tw ex-tabel"), pager = el("div", "pager");
    const kanPeta = el("details", "dw-peta"), sum = el("summary", null, "Peta"), mp = d.mpEl || (d.mpEl = el("div", "dw-mp"));
    kanPeta.append(sum, mp);
    kiri.append(tw, pager); grid.append(kiri, kanPeta); k.bd.append(ket, grid);
    Object.assign(d, { k, sProv, sKab, cari, tw, pager, ket, mp, kanPeta, hal: 0, pilih: null, pulauBaru: true, prov: "", kab: "", q: "", gen: 0 });
    /* ponsel: peta dilipat; layar lebar: selalu terbuka */
    if (mq.matches) kanPeta.open = true;
    kanPeta.addEventListener("toggle", () => { if (!kanPeta.open) return; nanti(() => { if (peta[d.id]) peta[d.id].map.resize(); else bukaPeta(d); }); });

    const provs = new Map();
    d.baris.forEach(r => provs.set(r[K.kd].slice(0, 2), r[K.prov]));
    sProv.append(new Option("Semua provinsi", ""));
    [...provs].sort((x, y) => x[1].localeCompare(y[1], "id")).forEach(([c, n]) => sProv.append(new Option(n, c)));
    sKab.append(new Option("Semua kabupaten/kota", ""));

    /* chrome kontrol urgent (nilai langsung tampil), daftar berat ditunda */
    sProv.addEventListener("change", () => { d.prov = sProv.value; d.kab = ""; isiKab(d); d.hal = 0; nanti(() => terapkan(d, true)); });
    sKab.addEventListener("change", () => { d.kab = sKab.value; d.hal = 0; nanti(() => terapkan(d, true)); });
    cari.addEventListener("input", () => { d.q = cari.value.trim().toLocaleLowerCase("id"); d.hal = 0; const g = ++d.gen; nanti(() => { if (g === d.gen) terapkan(d, true); }); });
    unduh.addEventListener("click", () => { if (unduh.disabled) return; unduh.disabled = true; unduh.textContent = "Menyiapkan…"; nanti(() => { try { csv(d); } finally { unduh.disabled = false; unduh.textContent = "Unduh CSV"; } }); });
    tw.addEventListener("click", e => {
      const th = e.target.closest("th[data-u]"); if (th) {
        const u = th.dataset.u; d.urut = [u, d.urut[0] === u ? -d.urut[1] : (u === "desa" || u === "kab" ? 1 : -1)]; d.hal = 0;
        tw.querySelectorAll("thead th[data-u]").forEach(t => t.setAttribute("aria-sort", t.dataset.u === d.urut[0] ? (d.urut[1] > 0 ? "ascending" : "descending") : "none"));
        nanti(() => gambarTabel(d)); return; }
      const b = e.target.closest("button.dw-desa"); if (b) fokus(d, b.dataset.kd, false);
    });
    pager.addEventListener("click", e => { const b = e.target.closest("button[data-h]"); if (!b) return; if (b.disabled) return; d.hal = Math.max(0, d.hal + +b.dataset.h);
      const hl = Math.max(1, Math.ceil(d.sel.length / HAL)); d.hal = Math.min(d.hal, hl - 1);   /* chrome pager langsung, tabel menyusul */
      pager.querySelector("span").textContent = `Halaman ${fmt(d.hal + 1)} dari ${fmt(hl)}`;
      pager.querySelector('button[data-h="-1"]').disabled = d.hal === 0; pager.querySelector('button[data-h="1"]').disabled = d.hal >= hl - 1;
      nanti(() => gambarTabel(d)); });
    terapkan(d, !!peta[d.id]);
    if (!kanPeta.hidden && kanPeta.open) { if (peta[d.id]) nanti(() => peta[d.id].map.resize()); else bukaPeta(d); }
  }

  function isiKab(d) {
    d.sKab.replaceChildren(new Option("Semua kabupaten/kota", ""));
    d.sKab.disabled = !d.prov; if (!d.prov) return;
    const m = new Map(); d.baris.forEach(r => { if (r[K.kd].startsWith(d.prov + ".")) m.set(r[K.kd].slice(0, 5), r[K.kab]); });
    [...m].sort((x, y) => x[1].localeCompare(y[1], "id")).forEach(([c, n]) => d.sKab.append(new Option(n, c)));
  }

  const urutFn = d => { const [u, arah] = d.urut, i = K[u];
    return (x, y) => { let a = x[i], b = y[i];
      if (a == null && b == null) return 0; if (a == null) return 1; if (b == null) return -1;   /* kosong selalu di ujung */
      const c = typeof a === "string" ? a.localeCompare(b, "id") : a - b;
      return c ? c * arah : (d.id === "a" ? y[K.titik7] - x[K.titik7] : y[K.tahun] - x[K.tahun]) || x[K.desa].localeCompare(y[K.desa], "id"); }; };

  function terapkan(d, geser) {
    d.sel = d.baris.filter(r => (!d.prov || r[K.kd].startsWith(d.prov + ".")) && (!d.kab || r[K.kd].startsWith(d.kab + ".")) && (!d.q || r[K.desa].toLocaleLowerCase("id").includes(d.q)));
    d.pilih = null; d.byKd = new Map(d.sel.map(r => [r[K.kd], r])); gambarTabel(d, true); nanti(() => perbaruiPeta(d, geser));
  }

  function gambarTabel(d, baru) {
    const kolom = d.kol, tw = d.tw, W = d.sel.slice().sort(urutFn(d)); d.urutan = W;
    const hal = Math.min(d.hal, Math.max(0, Math.ceil(W.length / HAL) - 1)); d.hal = hal;
    const t = el("table"), th = el("thead"), r1 = el("tr"), r2 = el("tr");
    const kepala = (c, rows) => { const x = el("th"); x.scope = "col"; if (rows) x.rowSpan = rows;
      const def = KOL[c]; if (def.tip) x.title = def.tip; if (def.ponsel) x.classList.add("dw-p");
      if (def.urut) { x.dataset.u = def.urut; x.setAttribute("aria-sort", d.urut[0] === def.urut ? (d.urut[1] > 0 ? "ascending" : "descending") : "none");
        const b = el("button", null, def.n); b.type = "button"; x.append(b); } else x.textContent = def.n;
      if (def.pil) x.append(" ", el("span", "dw-pk", def.pil)); return x; };
    kolom.forEach(c => r1.append(kepala(c, 2)));
    const gp = el("th", "dw-p"); gp.colSpan = 3; gp.scope = "colgroup"; gp.title = "Peluang kabupaten/kota dari model prakiraan, sama untuk semua desa di kab/kota yang sama. Bukan peluang desa, jadi tidak dipakai untuk mengurutkan.";
    gp.append("Peluang kab/kota"); if (D.peluang?.status !== "dinilai") gp.append(" ", el("span", "dw-pk", "hipotesis"));
    r1.append(gp); ["Hari 1", "Hari 2", "Hari 3"].forEach(n => { const x = el("th", "dw-p", n); x.scope = "col"; r2.append(x); });
    th.append(r1, r2); t.append(th);
    const tb = el("tbody"), f = document.createDocumentFragment();
    W.slice(hal * HAL, hal * HAL + HAL).forEach(r => {
      const tr = el("tr"); tr.dataset.kd = r[K.kd]; if (r[K.kd] === d.pilih) tr.className = "dw-pilih";
      kolom.forEach(c => { const td = el("td", (KOL[c].num ? "n" : "") + (KOL[c].ponsel ? " dw-p" : "")); ISI[c](r, td); tr.append(td); });
      P_KUNCI.forEach(p => { const v = r[K[p]], td = el("td", "n dw-p", v == null ? "–" : fmt(v) + "%"); tr.append(td); });
      f.append(tr); });
    tb.append(f); t.append(tb);
    if (!W.length) tw.replaceChildren(el("p", "dw-kosong", d.kosong)); else tw.replaceChildren(t);
    /* keterangan potongan (jujur, tidak diam-diam) */
    const baris = P[d.id], hasil = [], per = baris.terpotong_per_prov || {}, apa = d.id === "a" ? "dengan titik panas" : "yang memenuhi riwayat";
    if (d.prov) { const n = per[d.prov]; if (n) hasil.push(`Daftar provinsi ini dipotong: ${fmt(n)} desa lain ${apa} tidak ditampilkan.`); }
    else { const n = Object.values(per).reduce((s, v) => s + v, 0) || baris.terpotong || 0; if (n) hasil.push(`Menampilkan ${fmt(baris.baris.length)} dari ${fmt(baris.total)} desa di ${PULAU}; daftar dipotong per provinsi, ${fmt(n)} desa tidak ditampilkan.`); }
    hasil.push(`${fmt(W.length)} desa sesuai saringan.`);
    d.ket.textContent = hasil.join(" ");
    const hl = Math.max(1, Math.ceil(W.length / HAL)); d.pager.replaceChildren();
    if (hl > 1) { const s = (t, h, off) => { const b = el("button", null, t); b.type = "button"; b.dataset.h = h; b.disabled = off; return b; };
      d.pager.append(s("Sebelumnya", -1, hal === 0), el("span", null, `Halaman ${fmt(hal + 1)} dari ${fmt(hl)}`), s("Berikutnya", 1, hal >= hl - 1)); }
  }

  /* ---------- CSV ---------- */
  function csv(d) {
    const sebut = d.id === "a" ? "A" : "B", L = [];
    const baris = a => L.push(a.map(sel).join(","));
    const tgl = (D.dibuat || "").slice(0, 10);
    /* baris keterangan tanpa koma supaya benar-benar diawali "#" tanpa kutip */
    const ac = Date.parse(D.acuan); L.push(`# Desa Waspada daftar ${sebut}, pulau ${PULAU}, dibuat ${tgl}; titik panas terakhir diperbarui ${isNaN(ac) ? "" : tglWib(ac, true)}`);
    L.push("# Koordinat (bujur dan lintang) memakai titik sebagai pemisah desimal.");
    L.push("# Titik panas: VIIRS keyakinan nominal dan tinggi; tidak sama dengan angka utama. Tahun terbakar: batas bawah 2012 sampai 2025. Bagian di gambut: persen perkiraan. Sel kosong berarti tidak ada data; bukan 0.");
    L.push("# Peluang kab/kota: peluang kabupaten/kota dari model prakiraan; sama untuk semua desa di kab/kota itu; bukan peluang desa.");
    baris(KOLOM_CSV);
    (d.urutan || d.sel).forEach(r => baris([r[K.kd], r[K.desa], r[K.kec], r[K.kab], r[K.prov], r[K.titik7], r[K.titik24], r[K.terakhir] ? terakhir(r[K.terakhir], 0) : null, r[K.tahun], gambutAng(r[K.gambut]), r[K.p1], r[K.p2], r[K.p3], r[K.lon], r[K.lat], sebut]));
    const u = URL.createObjectURL(new Blob(["﻿" + L.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" }));
    const a = el("a"); a.href = u; a.download = `desa-waspada-${PULAU.toLowerCase().replace(/\s+/g, "-")}-${sebut}-${tgl}.csv`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  }

  /* ---------- peta mini ---------- */
  const warna = v => { const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d", { willReadFrequently: true });
    x.fillStyle = "#000"; x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(v).trim(); x.fillRect(0, 0, 1, 1);
    const [r, g, b] = x.getImageData(0, 0, 1, 1).data; return `rgb(${r},${g},${b})`; };
  const fitur = d => ({ type: "FeatureCollection", features: d.sel.map(r => ({ type: "Feature", properties: { kd: r[K.kd] }, geometry: { type: "Point", coordinates: [r[K.lon], r[K.lat]] } })) });
  const kosongFc = { type: "FeatureCollection", features: [] };

  function bukaPeta(d) {
    if (peta[d.id] || typeof maplibregl === "undefined") { if (typeof maplibregl === "undefined") d.kanPeta.hidden = true; return; }
    let map; try { map = new maplibregl.Map({ container: d.mp, style: "https://tiles.openfreemap.org/styles/positron", center: [118, -2.4], zoom: 3.6, minZoom: 3, maxZoom: 14, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false }); }
    catch (e) { d.kanPeta.hidden = true; return; }   /* tanpa WebGL: tabel tetap jalan, peta disembunyikan */
    const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    const p = peta[d.id] = { map, pop, siap: false };
    map.on("load", () => {
      map.addSource("pin", { type: "geojson", data: fitur(d) }); map.addSource("pilih", { type: "geojson", data: kosongFc });
      map.addLayer({ id: "pin", type: "circle", source: "pin", paint: { "circle-radius": 5, "circle-color": warna(d.warna), "circle-opacity": .8, "circle-stroke-width": 1, "circle-stroke-color": warna("--card") } });
      map.addLayer({ id: "pilih", type: "circle", source: "pilih", paint: { "circle-radius": 9, "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 3, "circle-stroke-color": warna("--ink") } });
      map.on("mousemove", "pin", e => { map.getCanvas().style.cursor = "pointer"; const kd = e.features[0].properties.kd; if (kd !== p.tipKd) { p.tipKd = kd; tip(d, kd, e.lngLat); } });
      map.on("mouseleave", "pin", () => { map.getCanvas().style.cursor = ""; p.tipKd = null; pop.remove(); });
      map.on("click", "pin", e => fokus(d, e.features[0].properties.kd, true));
      p.siap = true; perbaruiPeta(d, true);
    });
  }
  function tip(d, kd, ll) {
    const r = d.byKd.get(kd); if (!r) return;
    const b = el("div", "dw-tip"); b.append(el("b", null, r[K.desa]), el("span", null, `${r[K.kab]}, ${r[K.prov]}`),
      el("span", null, d.id === "a" ? `Titik 7 hari: ${fmt(r[K.titik7])}` : `Tahun terbakar: ${tahunTeks(r)}`));
    peta[d.id].pop.setLngLat(ll || [r[K.lon], r[K.lat]]).setDOMContent(b).addTo(peta[d.id].map); }
  function perbaruiPeta(d, geser) {
    const p = peta[d.id]; if (!p?.siap) return;
    p.map.getSource("pin").setData(fitur(d)); p.map.getSource("pilih").setData(kosongFc); p.pop.remove();
    if (geser && d.sel.length && (d.prov || d.kab || d.q || d.pulauBaru)) { d.pulauBaru = false;
      const b = new maplibregl.LngLatBounds(); d.sel.forEach(r => b.extend([r[K.lon], r[K.lat]]));
      p.map.fitBounds(b, { padding: 40, maxZoom: 11, duration: 0 });
    } else if (geser && !d.sel.length) p.map.jumpTo({ center: [118, -2.4], zoom: 3.6 });
  }
  /* klik baris atau pin: tabel dan peta saling menyorot; kerja peta ditunda satu frame */
  function fokus(d, kd, dariPeta) {
    const r = d.byKd.get(kd); if (!r) return; d.pilih = kd;
    d.tw.querySelectorAll("tr.dw-pilih").forEach(t => t.classList.remove("dw-pilih"));
    const tr = [...d.tw.querySelectorAll("tbody tr")].find(t => t.dataset.kd === kd);
    if (tr) tr.classList.add("dw-pilih");
    const p = peta[d.id];   /* cincin sorot langsung (satu titik, murah); tabel dan gerak peta menyusul */
    if (p?.siap) p.map.getSource("pilih").setData({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [r[K.lon], r[K.lat]] } });
    nanti(() => {
      if (dariPeta && !tr) { const h = Math.floor(d.urutan.findIndex(x => x[K.kd] === kd) / HAL); if (h !== d.hal) { d.hal = h; gambarTabel(d); } }
      if (dariPeta) d.tw.querySelector("tr.dw-pilih")?.scrollIntoView({ block: "nearest" });
      if (!p?.siap) return; p.tipKd = kd;
      p.map.easeTo({ center: [r[K.lon], r[K.lat]], zoom: Math.max(p.map.getZoom(), 9), duration: 300 }); tip(d, kd); });
  }

  /* ---------- laju ---------- */
  function laju() {
    const host = document.getElementById("dwLaju"), L = D.laju || { status: "belum" };
    const k = kotak(host, "laju", "Laju terukur", `Dari semua desa-minggu musim kering ${L.musim || 2023} (Juli sampai Oktober): persen desa yang punya titik panas VIIRS pada minggu berikutnya. Riwayat petak hanya 2012 sampai 2022. Sensor ${L.sensor || "S-NPP"}. Definisi titik sama dengan daftar.`);
    if (hipotesis()) k.jd.append(pil("hipotesis"));
    if (L.status === "belum" || !L.kelompok) { k.bd.append(el("p", "dw-kosong", "Laju belum terukur.")); return; }
    const NAMA = [["a", "Ada titik panas minggu ini (daftar A)"], ["b", "Pernah terbakar berulang, tanpa titik minggu ini (daftar B)"], ["lain", "Desa lain"], ["tak_pernah", "Tidak pernah tercatat terbakar"]];
    const t = el("table"), th = el("thead"), tr = el("tr");
    [["Kelompok", ""], ["Desa-minggu", ""], ["Minggu berikutnya ada titik (%)", ""], ["Selang 95%", "Selang kepercayaan Wilson 95 persen."], ["NOAA-20 (%)", "Periksa kepekaan dengan sensor NOAA-20, musim yang sama."]].forEach(([n, tp]) => { const x = el("th", null, n); x.scope = "col"; if (tp) x.title = tp; tr.append(x); });
    th.append(tr); t.append(th); const tb = el("tbody");
    NAMA.forEach(([c, n]) => { const g = L.kelompok[c], a = L.kepekaan?.noaa20?.[c], r = el("tr");
      const td = (x, cls) => r.append(el("td", cls, x));
      td(n, "dw-nama"); td(g ? fmt(g.n) : "belum terukur", "n"); td(g ? persenR(g.laju) : "belum terukur", "n");
      td(g?.wilson ? `${persenR(g.wilson[0])} sampai ${persenR(g.wilson[1])}` : "belum terukur", "n"); td(a ? persenR(a.laju) : "belum terukur", "n");
      if (L.status === "gagal") r.title = "Belum cukup membedakan dari desa lain.";
      tb.append(r); });
    t.append(tb); const w = el("div", "tw ex-tabel"); w.append(t); k.bd.append(w);
  }

  function batasan() {
    const host = document.getElementById("dwBatas"), k = kotak(host, "batas", "Batasan data", "Cara membaca dua daftar di atas.");
    const ul = el("ul", "dw-bt"); (D.batasan || []).forEach(s => ul.append(el("li", null, s)));
    if (D.tanpa_desa) ul.append(el("li", null, `${fmt(D.tanpa_desa)} titik panas jatuh di kab/kota tanpa poligon desa dan tidak masuk daftar.`));
    k.bd.append(ul);
  }

  /* ---------- mulai ---------- */
  const galat = (id, jd) => { const k = kotak(document.getElementById(id), "ringkas", jd, ""); k.bd.append(el("p", "dw-kosong", "Daftar belum tersedia. Coba lagi nanti.")); };
  async function ambil(url) { const res = await fetch(url, { cache: "no-cache" }); if (!res.ok) throw new Error(res.status); return res.json(); }
  async function muatPulau(n) {
    const t = ++tokenPulau;
    try { cache[n] = cache[n] || await ambil("/data/desa_waspada/" + D.pulau[n].berkas); }
    catch (e) {
      if (t !== tokenPulau) return;
      sibuk(false); PULAU = TAMPIL; if (sPul) sPul.value = TAMPIL;   /* kembali ke pulau yang tampil */
      if (!TAMPIL) { ["dwA", "dwB"].forEach(id => document.getElementById(id).replaceChildren()); galat("dwA", "Titik panas 7 hari"); }
      else { const k = document.querySelector("#dwA .dw-ket"); if (k) k.textContent = "Pulau itu belum bisa dimuat. Coba lagi nanti."; }
      return; }
    if (t !== tokenPulau) return;   /* pilihan sudah berganti selagi memuat; yang terbaru yang melepas sibuk */
    P = cache[n]; K = Object.fromEntries(P.kolom.map((c, i) => [c, i])); TAMPIL = n;
    for (const c of ["a", "b"]) { const d = DAFTAR[c]; d.baris = P[c].baris; d.urut = c === "a" ? ["titik7", -1] : ["tahun", -1]; d.hal = 0; }
    bangun(DAFTAR.a); sibuk(false); nanti(() => bangun(DAFTAR.b));
  }
  async function mulai() {
    try { D = await ambil("/data/desa_waspada/indeks.json"); } catch (e) { galat("dwRingkas", "Ringkasan"); return; }
    const ry = D.definisi?.tahun_riwayat; if (ry) N_TAHUN = ry[1] - ry[0] + 1;
    TAHUN_INI = wibDari(Date.now()).y;
    PULAU = Object.entries(D.pulau).sort((x, y) => y[1].a_total - x[1].a_total)[0][0];
    ringkasan();
    nanti(() => muatPulau(PULAU));
    nanti(() => { laju(); batasan(); });
  }
  mulai();
})();
