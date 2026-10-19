/* Fungsi murni membaca kejadian dan tingkat respons per bencana dari laporan.json + registry. Dipakai /bnpb/sitrep.js DAN /admin/pimpinan.js (satu salinan, gerbang menolak salinan).
   Tidak menghitung ulang angka pipeline; tidak menyentuh DOM. */
window.RingkasBencana = (() => {
  "use strict";
  const PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung", "19": "Kepulauan Bangka Belitung",
    "21": "Kepulauan Riau", "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten", "51": "Bali", "52": "Nusa Tenggara Barat",
    "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara", "71": "Sulawesi Utara",
    "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo", "76": "Sulawesi Barat", "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat",
    "93": "Papua Selatan", "94": "Papua Tengah", "95": "Papua Pegunungan", "96": "Papua Barat Daya"};
  const ada = v => typeof v === "number" && isFinite(v);
  const F = (v, d = 0) => ada(v) ? v.toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d}) : "–";
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
  const tingkatNama = (b, k) => (b.tingkat || []).find(t => t.kode === k) || null;
  function ubahTeks(a, b, arah) {
    if (!ada(a) || !ada(b)) return {t: "–", ikon: null, kelas: ""};
    if (a === b) return {t: "tetap", ikon: "tetap", kelas: ""};
    const naik = a > b, p = b === 0 ? null : Math.round(Math.abs(a - b) / Math.abs(b) * 100);
    return {t: (naik ? "naik " : "turun ") + (p == null ? "dari nol" : F(p) + "%"), ikon: naik ? "naik" : "turun", kelas: arah === "netral" ? "" : naik === (arah !== "naik_baik") ? "buruk" : "baik"};
  }
  function barisLaporan(b, L, prov) {
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
  function barisGunung(b, G, prov) {
    const daftar = (G.gunung || []).filter(g => !prov || nm(g.prov) === nm(PROV[prov]));
    if (prov && !daftar.length) return {b, belum: "tidak ada gunung api terpantau di wilayah ini"};
    const nama = new Set(daftar.map(g => g.nama)), per = (G.perubahan || []).filter(x => nama.has(x.nama));
    const naik = per.filter(x => x.ke > x.dari).length, turun = per.filter(x => x.ke < x.dari).length, kode = Math.max(0, ...daftar.map(g => g.level - 1));
    return {b, angka: daftar.filter(g => g.level >= 3).length, satuan: "gunung level III atau IV", utama: {label: "Gunung api Siaga atau Awas"},
      ubah: {t: naik || turun ? [naik ? `${F(naik)} naik level` : "", turun ? `${F(turun)} turun level` : ""].filter(Boolean).join(", ") : "tetap", ikon: naik ? "naik" : turun ? "turun" : "tetap", kelas: naik ? "buruk" : turun ? "baik" : ""},
      tgl: G.dibuat, kode, tingkat: tingkatNama(b, kode), sumber: KONFIG.gunungapi.sumber, dibuat: G.dibuat, tambahan: [{label: "Gunung api terpantau", satuan: "", nilai: daftar.length, desimal: 0}]};
  }
  /* semua baris kejadian dari registry (reg), laporan per bencana (lap), status gunung api (gunung) untuk satu cakupan (prov "" = nasional) */
  function kejadian(reg, lap, gunung, prov) {
    return (reg?.bencana || []).filter(b => KONFIG[b.id]).map(b => {
      const L = b.id === "gunungapi" ? gunung : lap[b.id];
      if (!L) return {b, belum: "belum aktif"};
      try { return b.id === "gunungapi" ? barisGunung(b, L, prov) : barisLaporan(b, L, prov); } catch (e) { return {b, belum: "data belum bisa dibaca"}; }
    });
  }
  return {PROV, ada, F, nm, METRIK_KARHUTLA, KONFIG, SOROT, tingkatNama, ubahTeks, barisLaporan, barisGunung, kejadian};
})();
