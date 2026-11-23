/* Rekonsiliasi tiga sumber (lapor-ai LA-77, pemilik 23 Nov 2026): DIBI, logbook Pusdalops, Lapor Bencana terverifikasi BPBD.
   Fungsi MURNI tanpa DOM dan tanpa fetch: dimuat peramban (window.RekonTiga) dan node untuk uji (tests/bnpb/rekon_tiga.test.mjs).
   Butir = {prov, kabN, kel, lo, hi} tanggal YYYY-MM-DD. Butir satu kab dan satu kelompok jenis bersambung bila jaraknya paling jauh
   `jendela` hari (aturan yang sama dengan daftar Belum tercatat di DIBI: DIBI di [mulai - 3, terakhir + 3]). Angka antarsumber tidak
   dijumlah: tiap baris hanya mencatat ada atau tidak ada per sumber, plus jumlah laporan Lapor apa adanya. */
(g => {
  "use strict";
  const hari = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
  /* Lapor Bencana jenis id (src/lapor_spek) -> kelompok layar data_bencana.js */
  const KEL_LAPOR = {banjir: "banjir", longsor: "longsor", cuaca: "cuaca", karhutla: "karhutla", gempa: "gempabumi", erupsi: "gunungapi", tsunami: "tsunami",
    kebakaran_gedung: "kebakaran_permukiman", kekeringan: "kekeringan", abrasi: "gelombang_pasang", gelombang: "gelombang_pasang"};
  /* sumber = {dibi: [...], logbook: [...], lapor: [...]}; tiap butir sudah punya prov, kabN, kel, lo, hi; butir lain ikut di `isi` */
  function rekon(sumber, jendela = 3) {
    const per = new Map();
    for (const [nama, xs] of Object.entries(sumber)) for (const x of xs || []) {
      if (!x.prov || !x.kabN || !x.kel || !x.lo) continue;
      const k = `${x.prov}|${x.kabN}|${x.kel}`; (per.get(k) || per.set(k, []).get(k)).push({...x, hi: x.hi || x.lo, sumber: nama});
    }
    const baris = [];
    for (const xs of per.values()) {
      xs.sort((a, b) => a.lo.localeCompare(b.lo));
      let cur = null;
      for (const x of xs) {
        if (cur && hari(x.lo) - hari(cur.hi) <= jendela) { cur.isi.push(x); if (x.hi > cur.hi) cur.hi = x.hi; continue; }
        cur = {prov: x.prov, kabN: x.kabN, kel: x.kel, lo: x.lo, hi: x.hi, isi: [x]}; baris.push(cur);
      }
    }
    return baris.map(b => {
      const ada = n => b.isi.filter(x => x.sumber === n);
      const nama = b.isi.find(x => x.nama)?.nama || b.kabN;
      return {prov: b.prov, kabN: b.kabN, kel: b.kel, nama, mulai: b.lo, akhir: b.hi, bulan: b.lo.slice(0, 7),
        dibi: ada("dibi").length > 0, logbook: ada("logbook").length > 0, lapor: ada("lapor").reduce((t, x) => t + (x.n || 1), 0), isi: b.isi};
    }).sort((a, b) => a.mulai.localeCompare(b.mulai) || a.nama.localeCompare(b.nama));
  }
  /* baris yang perlu dilengkapi: belum ada di DIBI, atau ada laporan warga terverifikasi tetapi tidak ada di logbook */
  const perluDilengkapi = r => !r.dibi || (r.lapor > 0 && !r.logbook);
  /* teks tagihan: hanya jenis, kab, tanggal, dan sumber (Q-R2); tanpa isi laporan warga */
  function pesanTagih(r, kata) {
    const dari = [r.logbook && "logbook Pusdalops BNPB", r.lapor && "laporan warga yang sudah diverifikasi BPBD di Lapor Bencana"].filter(Boolean).join(" dan ");
    const belum = [!r.dibi && "DIBI (dibi.bnpb.go.id)", r.dibi && !r.logbook && "laporan harian ke Pusdalops BNPB"].filter(Boolean).join(" dan ");
    return `Yth. rekan BPBD ${r.nama}. Menurut ${dari || "DIBI"}, ada kejadian ${kata} di ${r.nama} pada ${r.mulai}${r.akhir !== r.mulai ? ` sampai ${r.akhir}` : ""}. ` +
      `Kejadian ini belum kami temukan di ${belum}. Mohon dilengkapi beserta data korban, pengungsi, dan kerusakannya. Terima kasih.`;
  }
  g.RekonTiga = {rekon, perluDilengkapi, pesanTagih, KEL_LAPOR};
})(globalThis);
