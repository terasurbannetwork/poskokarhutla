/* Fungsi MURNI halaman Perencanaan (/bnpb/perencanaan): tanpa DOM, tanpa fetch. Masukan = tiga JSON statis dari scripts/bnpb/perencanaan.py
   (kab_prioritas.json, kalender_operasi.json, stok_prapemusim.json). Layar tidak menghitung ulang angka pipeline; di sini hanya memilih, mengurutkan, memformat.
   Dimuat peramban (window.PerencanaanPusdalops) dan node untuk uji (tests/bnpb/perencanaan_pusdalops.test.mjs). */
(g => {
  "use strict";
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const bln = m => BLN[m - 1] || "–";
  const fmt = (n, d = 1) => n == null || Number.isNaN(Number(n)) ? "–" : Number(Number(n).toFixed(d)).toString().replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))(?<![,\d]\d*,\d*)/g, ".");
  const bulat = n => n == null || Number.isNaN(Number(n)) ? "–" : fmt(Math.round(Number(n)), 0);
  const persen = n => n == null || Number.isNaN(Number(n)) ? "–" : bulat(n) + "%";
  const tglIndo = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "–" : `${d.getUTCDate()} ${bln(d.getUTCMonth() + 1)} ${d.getUTCFullYear()}`; };
  const label = s => { const t = String(s || "").replace(/_/g, " "); return t ? t[0].toUpperCase() + t.slice(1) : "–"; };
  const kiriTengah = (a, b) => (a == null || b == null) ? "–" : `${a} s.d. ${b}`;

  /* ---------- tab 1: kab prioritas ---------- */
  const kunciUrut = (a, b) => a.peringkat - b.peringkat;
  /* mode "semua" = kab[] (51, beban semua jenis); mode "alam" = prioritas_bencana_alam[] (daftar khusus bencana alam, 57). Detail hanya ada bila kab-nya juga di kab[]. */
  function daftarKab(d, mode) {
    const per = new Map((d.kab || []).map(k => [k.kab, k]));
    if (mode === "alam") return (d.prioritas_bencana_alam || []).slice().sort(kunciUrut).map(a => ({...a, rinci: per.get(a.kab) || null, perTahun: null, per100rb: per.get(a.kab)?.per_100rb_penduduk ?? null, per100km2: per.get(a.kab)?.per_100km2 ?? null, dominanNonAlam: false}));
    return (d.kab || []).slice().sort(kunciUrut).map(k => ({kab: k.kab, nama: k.nama, prov: k.prov, peringkat: k.peringkat, kejadian: k.kejadian, perTahun: k.kejadian_per_tahun, per100rb: k.per_100rb_penduduk, per100km2: k.per_100km2,
      dominanNonAlam: !!k.dominan_non_alam, jenisDominan: k.jenis_dominan, pctDominan: k.jenis_dominan_pct, kumulatif: k.kumulatif_pct, rinci: k}));
  }
  /* pasangan berantai: JANGAN urut menurut lift (lift tinggi tanpa koreksi bisa kebetulan); urut menurut n pemicu menurun lalu k */
  function pasangan(berantai) {
    return (berantai || []).slice().sort((a, b) => b.n - a.n || b.k - a.k || (a.pasangan < b.pasangan ? -1 : 1)).map(p => {
      const [dari, ke] = String(p.pasangan).split(">");
      return {nama: `${label(dari)} lalu ${label(ke).toLowerCase()}`, n: p.n, k: p.k, laju: p.laju, lift: p.lift, selang: p.ci95 ? `${fmt(p.ci95[0], 1)} s.d. ${fmt(p.ci95[1], 1)}` : "–", diAtas1: !!p.ci_tanpa_koreksi_di_atas_1};
    });
  }
  const skBaris = sk => sk == null ? null : Object.entries(sk).sort((a, b) => b[1] - a[1]).map(([t, n]) => ({tingkat: t, n}));
  const kebutuhanKhas = k => !k ? null : {dasar: k.dasar, nBerisi: k.n_berisi, kategori: (k.kategori || []).map(c => ({nama: label(c.kode), n: c.n, pct: c.pct}))};

  /* ---------- tab 2: kalender ---------- */
  const URUT_JENIS = ["banjir", "longsor", "gelombang_pasang", "cuaca", "kekeringan", "karhutla", "gempabumi", "tsunami", "gunungapi", "wabah", "kebakaran_permukiman", "kecelakaan", "kegagalan_teknologi", "konflik_sosial", "omc", "lainnya"];
  const rank = j => { const i = URUT_JENIS.indexOf(j); return i < 0 ? URUT_JENIS.length - 1.5 : i; };
  const jenisKalender = (kal, kunci = "provinsi") => [...new Set(Object.values(kal[kunci] || {}).flatMap(p => Object.keys(p.jenis || {})))].sort((a, b) => rank(a) - rank(b));
  const pudar = e => e.keyakinan === "rendah" || !!e.tidak_musiman;
  /* sel bulan: puncak > musim > persiapan > kosong. Persiapan hanya bila persiapan_logistik_dipakai bukan null DAN entri tidak pudar. */
  function barisKalender(kal, jenis) {
    return Object.entries(kal.provinsi || {}).filter(([, p]) => p.jenis && p.jenis[jenis]).sort((a, b) => Number(a[0]) - Number(b[0])).map(([kode, p]) => {
      const e = p.jenis[jenis], pd = pudar(e), siap = pd ? null : (e.persiapan_logistik_dipakai ?? null);
      const sel = Array.from({length: 12}, (_, i) => {
        const m = i + 1; let s = "kosong";
        if ((e.musim || []).some(x => x.puncak === m)) s = "puncak"; else if ((e.musim || []).some(x => (x.bulan || []).includes(m))) s = "musim"; else if (siap === m) s = "persiapan";
        return {bulan: m, s, rata: (e.per_bulan || [])[i] ?? null};
      });
      return {kode, nama: p.nama, n: e.n, sel, pudar: pd, keyakinan: e.keyakinan, alasan: e.keyakinan_alasan || [], tidakMusiman: !!e.tidak_musiman, siap,
        sumber: siap == null ? null : (e.sumber_persiapan === "titik_panas" ? "titik panas" : "laporan"),
        musim: (e.musim || []).map(x => `${bln(x.mulai)} s.d. ${bln(x.selesai)}, puncak ${bln(x.puncak)}`)};
    });
  }

  /* ---------- tab 3: stok pra-musim ---------- */
  const jenisStok = stok => jenisKalender(stok);
  function barisStok(stok, jenis) {
    return Object.entries(stok.provinsi || {}).filter(([, p]) => p.jenis && p.jenis[jenis]).sort((a, b) => Number(a[0]) - Number(b[0])).map(([kode, p]) => {
      const e = p.jenis[jenis], gr = ["kebutuhan", "peralatan"].filter(k => e[k]).map(k => ({kunci: k, judul: label(k), g: e[k]}))[0];
      return {kode, nama: p.nama, perTahun: e.n_kejadian_per_tahun, siap: e.persiapan_logistik ?? null, sumber: e.sumber_persiapan, keyakinan: e.keyakinan_kalender,
        judulGrup: gr ? gr.judul : null, cakupan: gr ? gr.g.cakupan_isian_pct : null, nBerisi: gr ? gr.g.n_berisi_tahun_dasar : null, tidakAndal: gr ? gr.g.ekstrapolasi === "tidak andal" : true, grup: gr ? gr.g : null};
    });
  }
  const kategoriStok = (grup, tidakAndal) => (grup && grup.kategori || []).map(c => ({nama: label(c.kode), pct: c.pct, selang: c.pct_ci95_wilson ? `${persen(c.pct_ci95_wilson[0])} s.d. ${persen(c.pct_ci95_wilson[1])}` : "–",
    teramati: c.kejadian_per_tahun_teramati, ekstrapolasi: tidakAndal || c.ekstrapolasi_kejadian_per_tahun == null ? null : c.ekstrapolasi_kejadian_per_tahun, puncak: c.bulan_puncak ?? null}));

  g.PerencanaanPusdalops = {BLN, bln, fmt, bulat, persen, tglIndo, label, kiriTengah, daftarKab, pasangan, skBaris, kebutuhanKhas, jenisKalender, barisKalender, jenisStok, barisStok, kategoriStok, pudar, URUT_JENIS};
})(globalThis);
