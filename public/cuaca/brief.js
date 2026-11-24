"use strict";
/* Adaptor Brief pimpinan untuk cuaca ekstrem (PB-79c, F-35): mesin tata letak dua halaman A4 ada di public/inti/brief.js; di sini hanya angka
   dari data yang SUDAH dimuat halaman (S.nc, S.gl, Kejadian.K). Hanya pernyataan BMKG yang masuk tabel dan KPI; prakiraan model Centurisk97
   tidak dimasukkan, dan kejadian hasil deteksi Centurisk97 diberi label hipotesis (D6). Tanpa model baru, tanpa kalimat kebijakan.
   Nilai yang tidak ada ditulis "belum tersedia" oleh mesin. Dimuat SESUDAH ../inti/brief.js dan skrip halaman (butuh S, Kejadian, namaProv,
   SEV_ID, GEL, jamRentang, hurufJudul, jamWIB, fmt). */
(() => {
  const SEV = ["Minor", "Moderate", "Severe", "Extreme"], rs = s => SEV.indexOf(s);
  const tglPanjang = t => new Date(t).toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"});
  const wilNc = a => a.headline?.match(/\bdi (.+)$/)?.[1] || (a.prov?.[0] ? namaProv(a.prov[0]) : "") || a.event;
  const labelSev = s => SEV_ID[s] || s;
  const rankKej = k => String(k.jenis || "").startsWith("cap:") ? rs(k.besaran?.nilai) : (k.besaran?.nilai ?? 0);

  /* model murni dari daftar peringatan yang berlaku (dipakai juga oleh uji lewat Brief.cuaca.bangun) */
  function bangun(nc, gl, kejadian, {cutoff, sekarang}) {
    const berat = nc.filter(a => rs(a.severity) >= 2), tertinggi = gl.reduce((m, o) => Math.max(m, o.lv), 0);
    const prov = new Map();
    const sel = p => prov.get(p) || (prov.set(p, {n: 0, sev: -1, lv: 0}), prov.get(p));
    nc.forEach(a => (a.prov || []).forEach(p => { const o = sel(p); o.n++; o.sev = Math.max(o.sev, rs(a.severity)); }));
    gl.forEach(o => { sel(o.prov).lv = o.lv; });
    const baris = [...prov.entries()].sort((a, b) => b[1].sev - a[1].sev || b[1].n - a[1].n || b[1].lv - a[1].lv)
      .map(([p, o]) => [namaProv(p), o.n ? fmt(o.n) : "–", o.sev >= 0 ? labelSev(SEV[o.sev]) : "–", o.lv ? GEL[o.lv - 1][1] : "–"]);
    const aktif = kejadian ? kejadian.filter(k => k.aktif) : null;
    return {
      nama: "Cuaca ekstrem", subjudul: "Brief pimpinan: peringatan dini cuaca yang berlaku", cutoff, tanggal: tglPanjang(sekarang),
      kpi: [
        {l: "Peringatan nowcast berlaku", v: fmt(nc.length), k: `${fmt(berat.length)} berkategori Berat atau Ekstrem`},
        {l: "Provinsi dalam nowcast", v: fmt(new Set(nc.flatMap(a => a.prov || [])).size), k: "provinsi yang tercakup poligon peringatan"},
        {l: "Provinsi gelombang tinggi", v: fmt(gl.length), k: tertinggi ? `tertinggi: ${GEL[tertinggi - 1][1].toLowerCase()} (${GEL[tertinggi - 1][2]})` : "belum ada peringatan gelombang berlaku"},
        {l: "Kejadian aktif", v: aktif ? fmt(aktif.length) : null, k: "peringatan BMKG dan deteksi Centurisk97 (hipotesis)"}],
      tabel1: {judul: "II. Provinsi dalam peringatan dini BMKG yang berlaku", satuan: "provinsi", kolom: ["Provinsi", "Nowcast", "Tingkat tertinggi", "Gelombang"], baris,
        kosong: "belum tersedia: tidak ada peringatan nowcast atau gelombang yang berlaku pada data BMKG"},
      tabel2: {judul: "III. Peringatan nowcast terkuat", satuan: "peringatan", kolom: ["Berlaku", "Wilayah", "Peringatan", "Tingkat"],
        baris: [...nc].sort((a, b) => rs(b.severity) - rs(a.severity) || b.n - a.n).slice(0, 10).map(a => [jamRentang(a.mulai, a.selesai), hurufJudul(wilNc(a)), a.event, labelSev(a.severity)]), kosong: "belum tersedia"},
      daftar: {judul: "IV. Kejadian cuaca aktif", satuan: "kejadian", kosong: "belum tersedia", item: aktif
        ? [...aktif].sort((a, b) => rankKej(b) - rankKej(a)).slice(0, 8).map(k => `${k.kode}: ${k.nama}, ${fmt(k.n_kab || 0)} kabupaten atau kota, ${String(k.jenis || "").startsWith("cap:") ? "peringatan BMKG" : "hipotesis, deteksi Centurisk97 dari prakiraan model"}`) : []},
      sumber: "BMKG (nowcast peringatan dini cuaca dan peringatan gelombang tinggi); kejadian aktif dari tab Kejadian.",
      catatan: "Hanya pernyataan BMKG yang dihitung pada KPI dan tabel; prakiraan model Centurisk97 tidak dimasukkan. Wilayah tanpa peringatan berarti BMKG belum menerbitkan peringatan untuk wilayah itu, bukan jaminan keadaan lapangan. Kejadian berlabel hipotesis bukan pernyataan resmi."};
  }

  Brief.tema({
    id: "cuaca",
    siap: () => !!(S.pr && S.per),
    async data() {
      let kej = null; try { kej = typeof Kejadian !== "undefined" ? await Kejadian.muatAwal() : null; } catch (e) { kej = null; }
      /* berkas kejadian basi atau gagal dimuat (Kejadian.D kosong) = belum tersedia, bukan "0 kejadian" (D16) */
      return bangun(S.nc || [], S.gl || [], Array.isArray(kej) && Kejadian.D ? kej : null, {cutoff: jamWIB(S.ncDibuat ?? S.per.dibuat), sekarang: Date.now()});
    }});
  Brief.cuaca = {bangun};

  /* tombol di kepala halaman, sebelum ikon Laporan harian */
  Brief.pasang('a.iconbtn[href$="laporan.html"]');
})();
