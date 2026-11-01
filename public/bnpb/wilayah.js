/* Bagian bersama layar staf logbook dan siaga: daftar wilayah (provinsi, kab/kota, kecamatan, desa dari /data/desa_cari.json), ikon, pembantu DOM.
   Satu salinan; tanpa gaya/skrip inline (CSP). Teks dari data selalu lewat textContent. */
(() => {
  "use strict";
  const PROV = {11: "Aceh", 12: "Sumatera Utara", 13: "Sumatera Barat", 14: "Riau", 15: "Jambi", 16: "Sumatera Selatan", 17: "Bengkulu", 18: "Lampung", 19: "Kepulauan Bangka Belitung", 21: "Kepulauan Riau",
    31: "DKI Jakarta", 32: "Jawa Barat", 33: "Jawa Tengah", 34: "DI Yogyakarta", 35: "Jawa Timur", 36: "Banten", 51: "Bali", 52: "Nusa Tenggara Barat", 53: "Nusa Tenggara Timur",
    61: "Kalimantan Barat", 62: "Kalimantan Tengah", 63: "Kalimantan Selatan", 64: "Kalimantan Timur", 65: "Kalimantan Utara", 71: "Sulawesi Utara", 72: "Sulawesi Tengah", 73: "Sulawesi Selatan",
    74: "Sulawesi Tenggara", 75: "Gorontalo", 76: "Sulawesi Barat", 81: "Maluku", 82: "Maluku Utara", 91: "Papua", 92: "Papua Barat", 93: "Papua Selatan", 94: "Papua Tengah", 95: "Papua Pegunungan", 96: "Papua Barat Daya"};
  const NS = "http://www.w3.org/2000/svg";
  /* ikon garis 24x24; "|" memisah path */
  const IKON = {
    banjir: "M3 17c2 0 2-2 4.5-2S10 17 12 17s2.5-2 4.5-2S19 17 21 17|M3 21c2 0 2-2 4.5-2S10 21 12 21s2.5-2 4.5-2S19 21 21 21|M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.500 2-5 5-9z",
    longsor: "M3 20l6-9 4 5 3-4 5 8z|M14 4l2 2M17 3l1 3",
    cuaca: "M7 17a4 4 0 0 1 0-8 5 5 0 0 1 9.600-1A4.500 4.500 0 0 1 17 17z|M9 20l1-2M13 20l1-2",
    karhutla: "M12 3c1 3-1 4-1 6 0 1.500 1 2 2 2 0-1 1-2 1-2 2 1.500 3 3.500 3 6a5 5 0 0 1-10 0c0-3 3-5 5-12z",
    kebakaran_permukiman: "M4 20V10l8-6 8 6v10z|M12 11c.700 1.500-.500 2-.500 3a1.500 1.500 0 0 0 3 0c0-1-.500-1.500-1-2",
    gempabumi: "M2 12h4l2-5 3 10 3-8 2 3h6",
    gunungapi: "M3 20l7-13h4l7 13z|M10 7L8 3M14 7l2-4M12 7V2",
    gelombang_pasang: "M3 15c2 0 2-2 4.500-2S10 15 12 15s2.500-2 4.500-2S19 15 21 15|M3 19c2 0 2-2 4.500-2S10 19 12 19s2.500-2 4.500-2S19 19 21 19|M4 9l4-4 3 3 4-5 5 6",
    tsunami: "M2 18c3 0 4-1 6-4s4-9 9-9c2 0 3 1 3 3s-2 2-3 2c2 1 3 3 3 5|M2 21h20",
    wabah: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z|M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
    kekeringan: "M12 3v3M5 6l2 2M19 6l-2 2|M8 14a4 4 0 0 1 8 0|M3 20h18M7 17l-2 3M17 17l2 3",
    kecelakaan: "M3 15l2-6h14l2 6v3H3z|M7 18v2M17 18v2M6 12h12",
    kegagalan_teknologi: "M12 3l9 16H3z|M12 10v4M12 17v.5",
    konflik_sosial: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M2 20a6 6 0 0 1 12 0M10 20a6 6 0 0 1 12 0",
    lainnya: "M5 12h.01M12 12h.01M19 12h.01",
    akses: "M3 12h6M15 12h6|M9 7l6 10M12 4v3M12 17v3",
    logistik: "M3 7l9-4 9 4v10l-9 4-9-4z|M3 7l9 4 9-4M12 11v10",
    sinyal: "M4 20l.01 0M8 16a5.500 5.500 0 0 1 8 0M5 12.500a10 10 0 0 1 14 0|M3 3l18 18",
    air: "M12 3c3 4 5 6.500 5 9a5 5 0 0 1-10 0c0-2.500 2-5 5-9z",
    personel: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0",
    alat_berat: "M3 18h13M5 18v-5h7l2-4h3l2 4v5|M8 21h.01M15 21h.01M17 9V5",
    gambut: "M4 18c3-3 5 0 8-2s5 1 8-1|M4 13c3-3 5 0 8-2s5 1 8-1|M4 8c3-3 5 0 8-2s5 1 8-1",
    angin: "M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8",
    data: "M4 6c0-1.500 3.500-3 8-3s8 1.500 8 3-3.500 3-8 3-8-1.500-8-3z|M4 6v12c0 1.500 3.500 3 8 3s8-1.500 8-3V6",
    dana: "M12 3v18M16 7.500C16 6 14.500 5 12 5S8 6 8 8s1.500 2.500 4 3 4 1 4 3-1.500 3-4 3-4-1-4-2.500",
    malam: "M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z",
    sosial: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M2 20a6 6 0 0 1 12 0M10 20a6 6 0 0 1 12 0",
    listrik: "M13 2L4 14h7l-1 8 9-12h-7z",
    makanan: "M7 3v8a2 2 0 0 0 2 2v8M5 3v6M9 3v6|M17 21V3c-2.500 2-3 5-3 8h3",
    tenda: "M3 20L12 4l9 16z|M12 4v16M9 20l3-6 3 6",
    sandang: "M8 3l-5 4 3 3 2-1v12h8V9l2 1 3-3-5-4a4 4 0 0 1-8 0z",
    air_bersih: "M12 3c3 4 5 6.500 5 9a5 5 0 0 1-10 0c0-2.500 2-5 5-9z|M10 13a2 2 0 0 0 2 2",
    obat: "M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z",
    perahu: "M3 14h18l-3 6H6z|M12 14V4l6 8",
    material: "M4 20h16M6 20v-5h5v5M11 15v-5h5v5M16 20v-5h4v5",
    pompa: "M6 20h12M8 20v-6h8v6|M12 14V8M12 8h5a2 2 0 0 0 2-2V4",
    tambah: "M12 5v14M5 12h14", peringatan: "M12 3l9 16H3z|M12 10v4M12 17v.5", ok: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M8 12l3 3 5-6",
    simpan: "M5 3h11l3 3v15H5z|M8 3v6h7V3M8 21v-7h8v7", cetak: "M7 9V3h10v6|M7 17H4v-7h16v7h-3|M7 14h10v7H7z", unduh: "M12 3v12M7 10l5 5 5-5M4 21h16",
    daftar: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", lanjut: "M5 12h14M13 6l6 6-6 6", pin: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z|M12 12a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z",
    kalender: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4", senyap: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M9 9l6 6M15 9l-6 6", tunggu: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z|M12 7v5l3 2",
    uji: "M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 3h8", sapu: "M4 20l8-8M12 12l6-9 3 3-9 6zM4 20l3-1 1-3",
  };
  const ikon = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of (IKON[n] || IKON.lainnya).split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null && a !== false) e.append(a); return e; };
  const F = n => (n == null || Number.isNaN(n)) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
  const label = s => { const t = String(s).replace(/_/g, " "); return t[0].toUpperCase() + t.slice(1); };
  /* urutan resmi Pusdalops: alam hidrometeorologi, geologi, lalu non-alam, sosial, lainnya. Jenis tak dikenal jatuh sebelum "lainnya". */
  const JENIS_URUT = ["banjir", "longsor", "gelombang_pasang", "cuaca", "kekeringan", "karhutla", "gempabumi", "tsunami", "gunungapi", "wabah", "kebakaran_permukiman", "kecelakaan", "kegagalan_teknologi", "konflik_sosial", "omc", "lainnya"];
  const NAMA_JENIS = {cuaca: "Cuaca ekstrem", gelombang_pasang: "Gelombang pasang dan abrasi", tsunami: "Tsunami", wabah: "Epidemi dan wabah penyakit", gempabumi: "Gempa bumi", gunungapi: "Gunung api", karhutla: "Karhutla", kebakaran_permukiman: "Kebakaran permukiman", kegagalan_teknologi: "Gagal teknologi", konflik_sosial: "Konflik sosial", omc: "OMC"};
  const namaJenis = j => NAMA_JENIS[j] || label(j);
  const rankJ = j => { const i = JENIS_URUT.indexOf(j); return i < 0 ? JENIS_URUT.length - 1.5 : i; };
  const urutJenis = (a, b) => rankJ(a) - rankJ(b);
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tutup = (s) => (s || "").replace(/^(Kab\.|Kabupaten)\s+/i, "");

  /* indeks kab (38 KB) sekali; kecamatan dan desa hanya untuk kab terpilih (scripts/bnpb/wilayah_kab.py), diingat per berkas */
  let janji = null; const desaIng = new Map();
  const muat = () => janji || (janji = fetch("/data/bnpb/wilayah.json").then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(d => ({kab: d.kab})).catch(e => { janji = null; throw e; }));
  const desaKab = k => desaIng.get(k.berkas) || desaIng.set(k.berkas, fetch(`/data/bnpb/desa/${k.berkas}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .catch(e => { desaIng.delete(k.berkas); throw e; })).get(k.berkas);
  const kunciKab = k => k.prov + "|" + k.nama;   // kunci logbook: sama dengan public/geo dan logbook_riwayat.json

  window.Wilayah = {PROV, IKON, ikon, h, F, label, namaJenis, urutJenis, JENIS_URUT, BLN, muat, desaKab, kunciKab, tutup};
})();
