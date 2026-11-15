/* Pesan layar: satu sumber kalimat, tanggal, dan penyamar nomor untuk semua layar (paket pintu-masuk).
   Skrip klasik mandiri, global window.PesanLayar, tanpa DOM dan tanpa efek samping, aman dimuat dua kali.
   Pemuat: <script src="/inti/pesan.js"></script> SEBELUM skrip yang memakainya (mis. /inti/undang.js).
   Tidak memakai format.js (itu mendeklarasikan $ global dan hanya dimuat halaman peta). */
(g => {
  "use strict";
  if (g.PesanLayar) return;
  const KOSONG = "–";
  const ok = ms => ms != null && ms !== "" && Number.isFinite(Number(ms));
  const angka = n => Number(n).toLocaleString("id-ID");
  const tunggu = d => { d = Math.max(0, Math.ceil(Number(d) || 0)); return d < 90 ? `${angka(d)} detik` : `${angka(Math.ceil(d / 60))} menit`; };
  const LURING = "Tidak ada koneksi.";
  const galat = (status, pesanServer, retry) => {
    if (status === 0) return LURING;
    if (status === 429) return Number(retry) > 0 ? `Terlalu sering. Coba lagi ${tunggu(retry)} lagi.` : "Terlalu sering. Coba lagi nanti.";
    return typeof pesanServer === "string" && pesanServer.trim() ? pesanServer : "Gagal. Coba lagi.";
  };
  const tanggal = ms => ok(ms) ? new Date(Number(ms)).toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta"}) : KOSONG;
  const relatif = (ms, kini = Date.now()) => {
    if (!ok(ms)) return "Belum pernah";
    const d = (kini - Number(ms)) / 1000;
    if (d < 60) return "baru saja";
    if (d < 3600) return `${angka(Math.floor(d / 60))} menit lalu`;
    if (d < 86400) return `${angka(Math.floor(d / 3600))} jam lalu`;
    if (d < 30 * 86400) return `${angka(Math.floor(d / 86400))} hari lalu`;
    return tanggal(ms);
  };
  /* semua karakter kecuali empat terakhir jadi "x"; nomor sependek empat karakter atau kurang tersamar penuh */
  const samar = nomor => {
    if (nomor == null || nomor === "") return KOSONG;
    const s = String(nomor), n = s.length;
    return n <= 4 ? "x".repeat(n) : "x".repeat(n - 4) + s.slice(-4);
  };
  g.PesanLayar = {KOSONG, MASUK_WA: "Masuk dengan nomor WhatsApp", MENUNGGU: "Menunggu pemeriksaan", LURING, tunggu, galat, tanggal, relatif, samar};
})(typeof window !== "undefined" ? window : globalThis);
