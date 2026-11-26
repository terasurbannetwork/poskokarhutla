"use strict";
/* KPOD-3 cakupan Laphar terurai (tiket RU-047; DESAIN-TEKNIS 5.6, baris Layar). Menyusun satu skema rapor dari public/data/laphar_riwayat.json
   (cakupan.mulai, sampai, hari, tanpa_pdf; data publik agregat, tanpa nama petugas); perendernya UnitRapor (rapor.js). Fungsi murni: hanya
   menghitung selisih tanggal, angka berkas tidak diubah. Hari bolong = hari tanpa PDF di antara mulai dan sampai; hari tanpa PDF sesudah
   sampai ditulis terpisah (belum diurai, bukan bolong). Pil basi bila cakupan.sampai tertinggal lebih dari 1 hari dari hari ini (WIB),
   lewat pasangan dibuat dan basi_jam yang sama dengan pil tanggal rapor.js. Tanpa DOM.
   Pakai: UnitKpod3.bangun(riwayat, sekarang) -> skema; UnitKpod3.per(riwayat) -> {dibuat, basi_jam} untuk UnitRapor.render. */
(() => {
  const SAH = /^\d{4}-\d{2}-\d{2}$/, HARI = 864e5, WIB = 7 * 36e5;
  const ms = d => Date.parse(d + "T00:00:00Z");
  const sahTgl = d => typeof d === "string" && SAH.test(d) && !isNaN(ms(d)) && new Date(ms(d)).toISOString().slice(0, 10) === d;   // Date.parse menggulirkan 31 Feb ke Maret
  const tgl = d => new Date(ms(d)).toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}).replace(/\./g, "");
  const hariWib = t => new Date(t + WIB).toISOString().slice(0, 10);
  const sahCakupan = j => { const c = j?.cakupan; return c && sahTgl(c.sampai) && Number.isInteger(c.hari) && c.hari >= 0 ? c : null; };

  function bangun(j, sekarang = Date.now()) {
    const c = sahCakupan(j); if (!c) return null;
    const tanpa = [...new Set((Array.isArray(c.tanpa_pdf) ? c.tanpa_pdf : []).filter(sahTgl))].sort();
    const dalam = tanpa.filter(d => (!sahTgl(c.mulai) || d >= c.mulai) && d <= c.sampai);
    const tertinggal = Math.max(0, Math.round((ms(hariWib(sekarang)) - ms(c.sampai)) / HARI));
    const rentang = sahTgl(c.mulai) ? `${tgl(c.mulai)} sampai ${tgl(c.sampai)}` : `sampai ${tgl(c.sampai)}`;
    return {id: "kpod3-laphar", sistem: "KPOD-3", pil: "Laphar terurai", ikon: "kalender", judul: "Cakupan Laphar terurai", label: ["hitungan_kita"],
      sumber: ["laphar_riwayat"], rumus: "hari bolong = hari tanpa PDF di antara tanggal mulai dan sampai; tertinggal = hari ini (WIB) dikurangi tanggal sampai", aturan: [], asumsi: [],
      angka: [{k: "hari", label: `Hari terurai, ${rentang}`, nilai: c.hari, title: "jumlah hari yang PDF-nya sudah diurai ke riwayat laporan harian"},
        {k: "bolong", label: "Hari bolong tanpa PDF di dalam rentang", nilai: dalam.length, title: "PDF laporan harian tidak tiba di arsip; hari itu belum bisa diurai"},
        {k: "tertinggal", label: "Hari tertinggal dari hari ini", nilai: tertinggal, title: "lebih dari 1 hari: pil basi di kepala kartu menyala"},
        {k: "sesudah", label: "Hari tanpa PDF sesudah tanggal sampai", nilai: tanpa.length - dalam.length, title: "belum diurai; bukan hari bolong sebelum PDF-nya tiba atau dipastikan tidak ada"}],
      kolom: tanpa.length ? [{k: "tanggal", label: "Tanggal tanpa PDF"}, {k: "letak", label: "Letak", title: "bolong = di dalam rentang terurai; belum diurai = sesudah tanggal sampai"}] : [],
      baris: tanpa.map(d => ({tanggal: tgl(d), letak: d <= c.sampai ? "bolong, di dalam rentang" : "belum diurai, sesudah tanggal sampai"}))};
  }
  /* sampai = awal hari itu menurut WIB; basi_jam 48 membuat pil basi menyala saat hari ini WIB sudah 2 hari sesudah sampai (tertinggal lebih dari 1 hari) */
  const per = j => { const c = sahCakupan(j); return c ? {dibuat: new Date(ms(c.sampai) - WIB).toISOString(), basi_jam: 48} : null; };

  const api = {bangun, per};
  (typeof window !== "undefined" ? window : globalThis).UnitKpod3 = api;
  if (typeof window !== "undefined" && window.UnitRapor) (window.UnitTampil ||= {})["KPOD-3"] = j => { const k = bangun(j); return k ? [window.UnitRapor.render(k, per(j))] : []; };
})();
