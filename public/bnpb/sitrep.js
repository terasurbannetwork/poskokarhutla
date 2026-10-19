/* Laporan situasi harian (/sitrep, /sitrep?prov=NN). Tanpa input baru: semua angka dibaca dari berkas laporan tiap bencana dan endpoint ringkas
   yang sudah ada; halaman ini tidak menghitung ulang angka pipeline (hanya memilih hari, selisih, dan hitungan baris yang memang tidak disimpan).
   Semua teks dari data masuk lewat textContent. Endpoint yang belum aktif (404/503/galat) tampil "belum aktif", bukan rusak. */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg", $ = id => document.getElementById(id);
  const IKON = {
    api: "M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
    naik: "M12 19V5|M5 12l7-7 7 7", turun: "M12 5v14|M19 12l-7 7-7-7", tetap: "M5 12h14",
    perisai: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
    peta: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z|M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
    kotak: "M3 7l9-4 9 4-9 4z|M3 7v10l9 4 9-4V7|M12 11v10",
    warga: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0",
    pesan: "M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z",
    alat: "M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z",
    segitiga: "M12 3l9 16H3z|M12 10v4|M12 17h.01",
  };
  const svg = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak) if (a != null) e.append(a); return e; };
  const pil = (teks, ikon, warna, kelas) => { const e = h("span", {class: "bn-pil" + (kelas ? " " + kelas : "")}); if (ikon) e.append(svg(ikon)); e.append(teks); if (warna) e.style.setProperty("--pil", warna); return e; };

  const PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung", "19": "Kepulauan Bangka Belitung",
    "21": "Kepulauan Riau", "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten", "51": "Bali", "52": "Nusa Tenggara Barat",
    "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara", "71": "Sulawesi Utara",
    "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo", "76": "Sulawesi Barat", "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat",
    "93": "Papua Selatan", "94": "Papua Tengah", "95": "Papua Pegunungan", "96": "Papua Barat Daya"};
  const ada = v => typeof v === "number" && isFinite(v);
  const F = (v, d = 0) => ada(v) ? v.toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d}) : "-";
  const wib = (t, opsi) => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", ...opsi});
  const tglPendek = iso => { const d = new Date(String(iso).slice(0, 10) + "T12:00:00Z"); return isNaN(d) ? "-" : d.toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}); };
  const jamWIB = iso => { const d = new Date(iso); return iso && !isNaN(d) ? wib(d, {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false}).replace(".", ":") + " WIB" : "-"; };
  const ambil = u => fetch(u, {cache: "no-cache", signal: AbortSignal.timeout(9000)}).then(r => r.ok ? r.json() : null).catch(() => null);
  const nm = s => String(s || "").toLowerCase().replace(/^(di|daerah istimewa)\s+/, "").trim();

  /* bencana yang punya berkas laporan; t = cara membaca tingkat dari data yang sudah ada (bukan aturan baru) */
  const METRIK_KARHUTLA = [{k: "titik", label: "Titik panas", satuan: "titik", utama: true, arah: "naik_buruk"}, {k: "luas", label: "Perkiraan luas terbakar", satuan: "ha"}];
  const KONFIG = {
    karhutla: {u: "/data/laporan.json", t: "level", sumber: "NASA FIRMS, laporan harian karhutla"},
    banjir: {u: "/banjir/data/laporan.json", t: "sorot", sumber: "BMKG, laporan harian banjir"},
    gempa: {u: "/gempa/data/laporan.json", sumber: "BMKG, laporan harian gempa"},
    cuaca: {u: "/banjir/data/cuaca_laporan.json", t: "sorot", sumber: "BMKG, laporan harian cuaca"},
    udara: {u: "/udara/data/laporan.json", sumber: "laporan harian kualitas udara"},
    kekeringan: {u: "/data/kekeringan_laporan.json", t: "sorot", sumber: "laporan harian kekeringan"},
    gunungapi: {u: "/banjir/data/gunungapi_status.json", t: "gunung", sumber: "MAGMA Indonesia, PVMBG"},
  };
  const SOROT = {awas: 3, siaga: 2, waspada: 1, info: 0};
  const MEJA = {kaji_cepat: "Kaji cepat", logistik: "Logistik"};
  const STATUS_MEJA = {dilaporkan: "Dilaporkan", diverifikasi: "Diverifikasi", masuk_jitupasna: "Masuk JITUPASNA", diminta: "Diminta", disetujui: "Disetujui", dikirim: "Dikirim", diterima: "Diterima"};
  const JENIS_WARGA = s => { const t = String(s || "lainnya").replace(/_/g, " "); return t.charAt(0).toUpperCase() + t.slice(1); };

  const D = {laporan: {}, neraca: {}};
  let prov = "";

  async function muatAwal() {
    const [reg, meta, gunung, warga, relawan, meja, alun] = await Promise.all([ambil("/bencana.json"), ambil("/data/meta.json"), ambil(KONFIG.gunungapi.u),
      ambil("/api/warga?jam=24"), ambil("/api/relawan/ringkas"), ambil("/api/meja/ringkas"), ambil("/api/alun?jenis=butuh_bantuan")]);
    Object.assign(D, {reg, meta, gunung, warga, relawan, meja, alun});
    const ids = (reg?.bencana || []).map(b => b.id).filter(id => KONFIG[id] && KONFIG[id].t !== "gunung");
    await Promise.all(ids.map(async id => { D.laporan[id] = await ambil(KONFIG[id].u); }));
  }
  async function muatNeraca() {
    if (!prov) return null;
    if (!(prov in D.neraca)) D.neraca[prov] = await ambil("/api/neraca?prov=" + encodeURIComponent(prov));
    return D.neraca[prov];
  }

  /* ---- baris kejadian per bencana ---- */
  const tingkatNama = (b, k) => (b.tingkat || []).find(t => t.kode === k) || null;
  function ubahTeks(a, b, arah) {
    if (!ada(a) || !ada(b)) return {t: "-", ikon: null, kelas: ""};
    if (a === b) return {t: "tetap", ikon: "tetap", kelas: ""};
    const naik = a > b, p = b === 0 ? null : Math.round(Math.abs(a - b) / Math.abs(b) * 100);
    return {t: (naik ? "naik " : "turun ") + (p == null ? "dari nol" : F(p) + "%"), ikon: naik ? "naik" : "turun", kelas: arah === "netral" ? "" : naik === (arah !== "naik_baik") ? "buruk" : "baik"};
  }
  function barisLaporan(b, L) {
    const kf = KONFIG[b.id], ms = L.metrik || METRIK_KARHUTLA, u = ms.find(m => m.utama) || ms[0], s = prov ? L.prov?.[prov] : L.nasional;
    if (!s) return {b, belum: prov ? "tidak ada kejadian tercatat di wilayah ini" : "belum ada data"};
    let i = L.hari.indexOf(L.hari_lengkap); if (i < 0) i = L.hari.length - 1;
    const a = s[u.k]?.[i], p = i > 0 ? s[u.k]?.[i - 1] : null;
    let kode = null;
    if (kf.t === "level") kode = prov ? s.level : Math.max(0, ...Object.values(L.prov || {}).map(x => x.level ?? 0));
    else if (kf.t === "sorot") kode = Math.max(0, ...(L.sorot || []).filter(o => !prov || !o.prov || o.prov === prov).map(o => SOROT[o.tingkat] ?? 0));
    return {b, utama: u, angka: a, satuan: u.satuan, ubah: ubahTeks(a, p, u.arah), tgl: L.hari[i], kode, tingkat: kode == null ? null : tingkatNama(b, kode), sumber: kf.sumber, dibuat: L.dibuat,
      tambahan: ms.filter(m => m !== u).slice(0, 2).map(m => ({label: m.label, satuan: m.satuan, nilai: s[m.k]?.[i], desimal: m.desimal | 0}))};
  }
  function barisGunung(b, G) {
    const daftar = (G.gunung || []).filter(g => !prov || nm(g.prov) === nm(PROV[prov]));
    if (prov && !daftar.length) return {b, belum: "tidak ada gunung api terpantau di wilayah ini"};
    const nama = new Set(daftar.map(g => g.nama)), per = (G.perubahan || []).filter(x => nama.has(x.nama));
    const naik = per.filter(x => x.ke > x.dari).length, turun = per.filter(x => x.ke < x.dari).length, kode = Math.max(0, ...daftar.map(g => g.level - 1));
    return {b, angka: daftar.filter(g => g.level >= 3).length, satuan: "gunung level III atau IV", utama: {label: "Gunung api Siaga atau Awas"},
      ubah: {t: naik || turun ? [naik ? `${F(naik)} naik level` : "", turun ? `${F(turun)} turun level` : ""].filter(Boolean).join(", ") : "tetap", ikon: naik ? "naik" : turun ? "turun" : "tetap", kelas: naik ? "buruk" : turun ? "baik" : ""},
      tgl: G.dibuat, kode, tingkat: tingkatNama(b, kode), sumber: KONFIG.gunungapi.sumber, dibuat: G.dibuat, tambahan: [{label: "Gunung api terpantau", satuan: "", nilai: daftar.length, desimal: 0}]};
  }
  function kejadian() {
    return (D.reg?.bencana || []).filter(b => KONFIG[b.id]).map(b => {
      const L = b.id === "gunungapi" ? D.gunung : D.laporan[b.id];
      if (!L) return {b, belum: "belum aktif"};
      try { return b.id === "gunungapi" ? barisGunung(b, L) : barisLaporan(b, L); } catch (e) { return {b, belum: "data belum bisa dibaca"}; }
    });
  }
  /* wilayah dengan angka utama naik terbanyak dibanding hari sebelumnya (kab/kota), dan gunung api yang naik level */
  function wilayahNaik() {
    const out = [];
    for (const b of D.reg?.bencana || []) {
      if (b.id === "gunungapi") {
        for (const x of (D.gunung?.perubahan || [])) {
          const g = (D.gunung.gunung || []).find(y => y.nama === x.nama);
          if (x.ke > x.dari && (!prov || nm(g?.prov) === nm(PROV[prov]))) out.push({b, nama: x.nama, prov: g?.prov || "-", dari: tingkatNama(b, x.dari - 1)?.nama || "-", ke: tingkatNama(b, x.ke - 1)?.nama || "-", naik: `naik ${F(x.ke - x.dari)} level`, urut: 1e9});
        }
        continue;
      }
      const L = D.laporan[b.id]; if (!L?.kab) continue;
      const ms = L.metrik || METRIK_KARHUTLA, u = ms.find(m => m.utama) || ms[0], d = u.desimal | 0;
      let i = L.hari.indexOf(L.hari_lengkap); if (i < 1) i = L.hari.length - 1; if (i < 1) continue;
      L.kab.filter(k => !prov || k.prov === prov).map(k => ({k, a: k[u.k]?.[i], p: k[u.k]?.[i - 1]})).filter(x => ada(x.a) && ada(x.p) && x.a > x.p)
        .sort((x, y) => (y.a - y.p) - (x.a - x.p)).slice(0, 3)
        .forEach(x => out.push({b, nama: x.k.nama, prov: L.prov?.[x.k.prov]?.nama || PROV[x.k.prov] || "-", dari: F(x.p, d), ke: F(x.a, d), naik: "naik " + F(x.a - x.p, d) + (u.satuan ? " " + u.satuan : ""), urut: (x.a - x.p) / Math.max(1, x.p)}));
    }
    return out;
  }

  /* ---- bagian lain ---- */
  function wargaHitung() {
    const f = D.warga?.features; if (!Array.isArray(f)) return null;
    const per = new Map();
    for (const x of f) { const p = x.properties || {}, e = per.get(p.jenis) || {n: 0, benar: 0}; e.n++; if ((p.benar || 0) >= 1 && p.benar > (p.salah || 0)) e.benar++; per.set(p.jenis, e); }
    return {total: f.length, terpotong: !!D.warga.terpotong, per: [...per].map(([jenis, e]) => ({jenis, ...e})).sort((a, b) => b.n - a.n)};
  }
  function relawanHitung() {
    const R = D.relawan; if (!R || typeof R.relawan !== "number") return null;
    const p = prov ? (R.per_provinsi || []).find(x => x.prov === prov) : null;
    return {siap: prov ? p?.n ?? 0 : R.siap_tugas, bertugas: R.bertugas, jam: R.jam_kerja_jam, ahli: (R.per_keahlian || []).slice(0, 5)};
  }
  function mejaHitung() {
    const M = D.meja?.meja; if (!M) return null;
    return Object.entries(MEJA).map(([k, nama]) => {
      const a = {n: 0, bahaya: 0, status: {}, jumlah: {}};
      for (const [p, v] of Object.entries(M[k] || {})) { if (prov && p !== prov) continue; a.n += v.n; a.bahaya += v.bahaya;
        for (const [s, n] of Object.entries(v.status || {})) a.status[s] = (a.status[s] || 0) + n; for (const [c, n] of Object.entries(v.jumlah || {})) a.jumlah[c] = (a.jumlah[c] || 0) + n; }
      return {k, nama, ...a};
    });
  }
  function alunHitung() {
    const A = D.alun; if (!A || !Array.isArray(A.utas)) return null;
    const semua = [...(A.sematan || []), ...A.utas].filter(u => u.jenis === "butuh_bantuan" && (!prov || u.prov === prov));
    const terbuka = semua.filter(u => u.bantuan === "terbuka").sort((a, b) => a.dibuat - b.dibuat);
    return {terbuka: terbuka.length, ditangani: semua.filter(u => u.bantuan === "ditangani").length, lebih: !!A.berikut, daftar: terbuka.slice(0, 5)};
  }

  /* ---- penyusun DOM ---- */
  function tabel(kolom, baris, kelas) {
    const t = h("table", {class: "ad-tabel" + (kelas ? " " + kelas : "")});
    t.append(h("thead", null, h("tr", null, ...kolom.map(k => h("th", {teks: k})))));
    t.append(h("tbody", null, ...baris.map(r => h("tr", null, ...r.map((c, i) => { const n = c instanceof Node; return h("td", {"data-label": kolom[i], class: !n && c && c.n ? "n" : null}, n ? c : String(c && c.t != null ? c.t : c)); })))));
    return h("div", {class: "ad-tabel-wadah"}, t);
  }
  const kartu = (judul, ikon, isi, sumber) => h("section", {class: "bn-kartu sr-kartu"}, h("h2", null, svg(ikon), judul), isi, sumber ? h("p", {class: "bn-label sr-sumber", teks: "Sumber: " + sumber}) : null);
  const belum = teks => h("p", {class: "sr-belum"}, svg("segitiga"), teks);
  const ukuran = (label, nilai, catatan) => h("div", {class: "sr-ukur"}, h("span", {class: "bn-angka", teks: nilai}), h("span", {class: "bn-label", teks: label + (catatan ? " (" + catatan + ")" : "")}));
  const namaWil = () => prov ? PROV[prov] : "Nasional";

  function sKejadian(rows) {
    const baris = rows.map(r => {
      const titik = h("span", {class: "sr-nama"}); const dot = h("i", {class: "sr-titik"}); dot.style.setProperty("--w", r.b.warna || "#4f8fc4"); titik.append(dot, r.b.nama);
      if (r.belum) return [titik, h("span", {class: "bn-label", teks: r.belum}), "-", "-", "-"];
      const tren = h("span", {class: "sr-tren " + (r.ubah.kelas || "")}); if (r.ubah.ikon) tren.append(svg(r.ubah.ikon)); tren.append(r.ubah.t);
      const angka = h("span", {class: "sr-angka"}, h("b", {teks: F(r.angka, r.utama?.desimal | 0)}), h("small", {teks: ada(r.angka) ? " " + (r.satuan || "") : ""}));
      return [titik, r.tingkat ? pil(r.tingkat.nama, "perisai", r.tingkat.warna) : h("span", {class: "bn-label", teks: "tanpa tingkat"}), angka, tren, tglPendek(r.tgl)];
    });
    return kartu("Kejadian aktif dan tingkat respons", "api", tabel(["Bencana", "Tingkat respons", "Angka utama", "Tren 24 jam", "Data"], baris), "laporan harian tiap bencana (hari lengkap terakhir), registry tingkat Pantau Bencana");
  }
  function sNaik(l) {
    const isi = l.length ? tabel(["Bencana", "Wilayah", "Provinsi", "Sebelumnya", "Terbaru", "Perubahan"], l.map(x => [x.b.nama, x.nama, x.prov, {t: x.dari, n: 1}, {t: x.ke, n: 1}, pil(x.naik, "naik", "var(--c1)")]))
      : h("p", {class: "sr-belum", teks: "Tidak ada wilayah yang naik dibanding hari sebelumnya."});
    return kartu("Wilayah yang naik", "naik", isi, "laporan harian per kab/kota, status gunung api PVMBG");
  }
  function sNeraca(N) {
    if (!prov) return kartu("Neraca Posko karhutla", "api", belum("Pilih satu provinsi untuk melihat neraca Posko."), "Posko karhutla, rakor dan regu lapangan");
    if (!N) return kartu("Neraca Posko karhutla", "api", belum("Neraca belum aktif atau belum bisa dimuat."), "Posko karhutla");
    const t = N.total || {}, kab = N.kab || [];
    if (!kab.length) return kartu("Neraca Posko karhutla", "api", h("p", {class: "sr-belum", teks: "Belum ada neraca masuk untuk " + tglPendek(N.tgl) + "."}), "Posko karhutla");
    const kend = (t.kendala || []).map(k => pil(N.kendala_nama?.[k] || k, "segitiga", "var(--c2)"));
    const isi = h("div", {class: "sr-isi"}, h("div", {class: "sr-ukurbaris"}, ukuran("Titik api", F(t.fs)), ukuran("Luas (ha)", F(t.luas_ha, 1)), ukuran("Dipadamkan (ha)", F(t.padam_ha, 1)), ukuran("Sisa (ha)", F(t.sisa_ha, 1)), ukuran("Personel", F(t.personel))),
      kend.length ? h("div", {class: "sr-pils"}, ...kend) : null,
      tabel(["Kab/kota", "Titik api", "Luas (ha)", "Dipadamkan (ha)", "Sisa (ha)", "Personel"], kab.map(r => [r.kab, {t: F(r.fs), n: 1}, {t: F(r.luas_ha, 1), n: 1}, {t: F(r.padam_ha, 1), n: 1}, {t: F(r.sisa_ha, 1), n: 1}, {t: F(r.personel), n: 1}])));
    return kartu("Neraca Posko karhutla " + tglPendek(N.tgl), "api", isi, "Posko karhutla, rakor dan regu lapangan");
  }
  function sWarga(W) {
    if (!W) return kartu("Lapor Warga 24 jam", "warga", belum("Laporan warga belum bisa dimuat."), "Lapor Warga");
    const isi = h("div", {class: "sr-isi"}, h("div", {class: "sr-ukurbaris"}, ukuran("Laporan aktif 24 jam", F(W.total) + (W.terpotong ? "+" : "")), ukuran("Dibenarkan warga lain", F(W.per.reduce((a, x) => a + x.benar, 0)))),
      W.per.length ? tabel(["Jenis", "Laporan", "Dibenarkan warga"], W.per.map(x => [JENIS_WARGA(x.jenis), {t: F(x.n), n: 1}, {t: F(x.benar), n: 1}])) : null);
    return kartu("Lapor Warga 24 jam", "warga", isi, "Lapor Warga" + (prov ? ", seluruh Indonesia (laporan belum dipilah per provinsi)" : ""));
  }
  function sRelawan(R) {
    if (!R) return kartu("Relawan", "warga", belum("Relawan belum aktif."), "Relawan Pantau Bencana");
    const isi = h("div", {class: "sr-isi"}, h("div", {class: "sr-ukurbaris"}, ukuran("Siap tugas", F(R.siap), prov ? PROV[prov] : null), ukuran("Bertugas sekarang", F(R.bertugas), prov ? "nasional" : null), ukuran("Jam kerja sah", F(R.jam, 1), prov ? "nasional" : null)),
      R.ahli.length ? h("div", {class: "sr-pils"}, ...R.ahli.map(a => pil(`${a.nama} ${F(a.n)}`, "alat", "var(--c7)"))) : null);
    return kartu("Relawan", "warga", isi, "Relawan Pantau Bencana (siap tugas per provinsi, keahlian nasional)");
  }
  function sMeja(M) {
    if (!M) return kartu("Logistik dan kaji cepat", "kotak", belum("Meja Kerja belum aktif."), "Meja Kerja BPBD");
    const baris = M.map(m => {
      const st = h("span", {class: "sr-pils"}, ...Object.entries(m.status).map(([s, n]) => pil(`${STATUS_MEJA[s] || s} ${F(n)}`, null, "var(--c5)")));
      if (m.k === "kaji_cepat" && m.n) st.append(pil(`Rumah rusak ${F((m.jumlah.rumah_rb || 0) + (m.jumlah.rumah_rs || 0) + (m.jumlah.rumah_rr || 0))}`, null, "var(--c1)"), pil(`Mengungsi ${F(m.jumlah.mengungsi || 0)}`, null, "var(--c2)"));
      return [m.nama, {t: F(m.n), n: 1}, m.bahaya ? pil(F(m.bahaya), "segitiga", "var(--c1)") : {t: "0", n: 1}, m.n ? st : "-"];
    });
    return kartu("Logistik dan kaji cepat", "kotak", tabel(["Meja", "Catatan", "Perlu perhatian", "Status"], baris), "Meja Kerja BPBD (angka per provinsi)");
  }
  function sAlun(A) {
    if (!A) return kartu("Alun-alun: butuh bantuan", "pesan", belum("Alun-alun belum aktif."), "Alun-alun");
    const isi = h("div", {class: "sr-isi"}, h("div", {class: "sr-ukurbaris"}, ukuran("Terbuka", F(A.terbuka) + (A.lebih ? "+" : "")), ukuran("Ditangani", F(A.ditangani))),
      A.daftar.length ? tabel(["Permintaan", "Wilayah", "Sejak"], A.daftar.map(u => [u.judul, [u.kab, u.prov_nama].filter(Boolean).join(", "), wib(u.dibuat, {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false}).replace(".", ":")])) : h("p", {class: "sr-belum", teks: "Tidak ada permintaan bantuan terbuka."}));
    return kartu("Alun-alun: butuh bantuan", "pesan", isi, "Alun-alun");
  }

  /* ---- teks WhatsApp dari model yang sama ---- */
  function teksWA(m) {
    const L = [`*LAPORAN SITUASI ${namaWil().toUpperCase()}*`, `${wib(m.kini, {weekday: "long", day: "numeric", month: "long", year: "numeric"})}, ${wib(m.kini, {hour: "2-digit", minute: "2-digit", hour12: false}).replace(".", ":")} WIB`, ""];
    L.push("*Kejadian aktif*");
    for (const r of m.kej) L.push(r.belum ? `- ${r.b.nama}: ${r.belum}` : `- ${r.b.nama}${r.tingkat ? ` [${r.tingkat.nama}]` : ""}: ${ada(r.angka) ? `${F(r.angka, r.utama?.desimal | 0)} ${r.satuan || ""}, ${r.ubah.t} (${tglPendek(r.tgl)})` : "belum ada angka"}`);
    if (m.naik.length) { L.push("", "*Wilayah naik*"); for (const x of m.naik.slice(0, 8)) L.push(`- ${x.b.nama}: ${x.nama}, ${x.prov} (${x.naik})`); }
    if (m.neraca?.kab?.length) { const t = m.neraca.total; L.push("", `*Neraca Posko ${tglPendek(m.neraca.tgl)}*`, `- Titik api ${F(t.fs)}, luas ${F(t.luas_ha, 1)} ha, dipadamkan ${F(t.padam_ha, 1)} ha, sisa ${F(t.sisa_ha, 1)} ha, personel ${F(t.personel)}`); }
    if (m.warga) L.push("", "*Lapor Warga 24 jam*", `- ${F(m.warga.total)}${m.warga.terpotong ? "+" : ""} laporan, ${F(m.warga.per.reduce((a, x) => a + x.benar, 0))} dibenarkan warga lain`, ...m.warga.per.slice(0, 5).map(x => `- ${JENIS_WARGA(x.jenis)}: ${F(x.n)}`));
    if (m.relawan) L.push("", "*Relawan*", `- Siap tugas ${F(m.relawan.siap)}${prov ? " di " + PROV[prov] : ""}, bertugas sekarang ${F(m.relawan.bertugas)}`);
    if (m.meja) { L.push("", "*Logistik dan kaji cepat*"); for (const x of m.meja) L.push(`- ${x.nama}: ${F(x.n)} catatan, ${F(x.bahaya)} perlu perhatian`); }
    if (m.alun) L.push("", "*Alun-alun*", `- Permintaan bantuan terbuka ${F(m.alun.terbuka)}${m.alun.lebih ? "+" : ""}, ditangani ${F(m.alun.ditangani)}`);
    L.push("", "Sumber: Pantau Bencana (BMKG, NASA FIRMS, PVMBG, Posko, Lapor Warga)", location.origin + "/sitrep" + (prov ? "?prov=" + prov : ""));
    return L.join("\n").replace(/\u2014/g, "-");
  }

  /* ---- render ---- */
  let model = null, gen = 0;
  async function render() {
    const id = ++gen, lap = $("lap");
    const N = await muatNeraca(); if (id !== gen) return;
    model = {kini: Date.now(), kej: kejadian(), naik: wilayahNaik(), neraca: N, warga: wargaHitung(), relawan: relawanHitung(), meja: mejaHitung(), alun: alunHitung()};
    const dataTgl = model.kej.map(r => r.dibuat).filter(Boolean).sort().pop();
    const kop = h("header", {class: "sr-kop"}, h("img", {src: "/img/logo.svg?v=2", alt: "", width: 40, height: 40}),
      h("div", null, h("h2", {class: "sr-judul", teks: "Laporan situasi harian"}), h("p", {class: "bn-label", teks: "Pantau Bencana · Ruang Koordinasi"})),
      h("div", {class: "sr-pils"}, pil(namaWil(), "peta", "var(--navy2)"), pil(wib(model.kini, {day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false}).replace(".", ":") + " WIB", null, "var(--c7)"),
        dataTgl ? pil("Data terbaru " + jamWIB(dataTgl), null, "var(--c5)") : null));
    const grid = h("div", {class: "sr-grid"}, sNeraca(N), sWarga(model.warga), sRelawan(model.relawan), sMeja(model.meja), sAlun(model.alun));
    lap.replaceChildren(kop, sKejadian(model.kej), sNaik(model.naik), grid);
    document.title = `Laporan situasi ${namaWil()} · Pantau Bencana`;
  }

  function pesan(t, ok) { const e = $("pesan"); e.textContent = t; e.className = "bn-pesan " + (ok ? "ok" : "galat"); clearTimeout(pesan.t); pesan.t = setTimeout(() => { e.textContent = ""; }, 4000); }

  async function mulai() {
    const sel = $("prov");
    sel.append(h("option", {value: "", teks: "Nasional"}), ...Object.entries(PROV).map(([k, n]) => h("option", {value: k, teks: n})));
    const q = new URLSearchParams(location.search).get("prov") || ""; prov = PROV[q] ? q : ""; sel.value = prov;
    sel.addEventListener("change", () => {
      prov = sel.value; const u = new URL(location.href); prov ? u.searchParams.set("prov", prov) : u.searchParams.delete("prov"); history.replaceState(null, "", u);
      requestAnimationFrame(() => setTimeout(render, 0));   /* kontrol urgent, isi laporan menyusul */
    });
    $("cetak").addEventListener("click", () => window.print());
    $("salin").addEventListener("click", async () => {
      if (!model) return;
      try { await navigator.clipboard.writeText(teksWA(model)); pesan("Teks WhatsApp sudah disalin.", true); }
      catch (e) { pesan("Tidak bisa menyalin otomatis. Izinkan akses papan klip lalu coba lagi.", false); }
    });
    await muatAwal();
    if (!D.reg) { $("lap").replaceChildren(h("p", {class: "bn-pesan galat", role: "alert", teks: "Daftar bencana belum bisa dimuat. Coba lagi nanti."})); return; }
    await render();
  }
  mulai();
})();
