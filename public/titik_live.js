/* titik_live.js — titik panas hampir-waktu-nyata (tiap 3 jam) di atas data harian, halaman karhutla.
   Skrip klasik, dimuat SETELAH skrip utama: memakai global S, peta, Peta, hitung, Kini, jamWIB, $.
   GET /api/titik (src/titik.js) berformat sama dengan data/hotspot.json; hanya titik yang LEBIH BARU dari acuan data
   harian yang ditambahkan (dedup lat/lon/menit/sensor), lalu kolom jam semua baris digeser ke acuan baru.
   Antarmuka ke layar lain: S.titikDiambil (ms) = live.dibuat, kapan Worker terakhir mengambil FIRMS (dibaca popover lintasan satelit,
   terisi tiap respons digabung walau tanpa titik baru); pil #upd ditulis ulang (jam = S.acuan baru) hanya bila ada titik baru.
   Kalau API gagal atau belum ada putaran, halaman tetap memakai data harian tanpa pesan apa pun. */
(() => {
  let live = null, untuk = null, asli = null, terakhir = null;   // terakhir = array yang barisnya sudah digeser
  const kunci = (la, lo, t, s) => `${la}|${lo}|${Math.round(t / 6e4)}|${s}`;
  const siapHalaman = () => typeof S !== "undefined" && Array.isArray(S.titik) && S.acuan && S.wilKunci && typeof peta !== "undefined" && peta && typeof Peta !== "undefined";
  const labelJam = d => `<span class="pjg">Data </span>${jamWIB(d).replace(" WIB", '<span class="pjg"> WIB</span>')}`;   // markup sama dengan pil #upd di index.html

  function gabung() {
    if (!live || !siapHalaman()) return;
    const diambil = Date.parse(live.dibuat);
    if (diambil > 0) S.titikDiambil = diambil;       // kapan FIRMS terakhir DIAMBIL Worker (ms); dibaca popover lintasan satelit, juga bila tak ada titik baru
    if (untuk === S.titik) return;
    if (asli == null) asli = S.acuan.getTime();
    if (terakhir === S.titik) { const g = (S.acuan.getTime() - asli) / 36e5; for (const b of S.titik) b[2] = Math.round((b[2] + g) * 100) / 100; }
    S.acuan = new Date(asli);                       // semua baris kini relatif ke acuan harian
    const a0 = asli, aBaru = Date.parse(live.acuan), ada = new Set(S.titik.map(b => kunci(b[0], b[1], a0 + b[2] * 36e5, b[3])));
    const idx = new Map(S.wilKunci.map((w, i) => [w[2], i])), tambah = [];
    for (const b of live.baris) {
      const t = aBaru + b[2] * 36e5;
      if (t <= a0 || ada.has(kunci(b[0], b[1], t, b[3]))) continue;
      const k3 = live.wilayah[b[6]]; if (!k3) continue;
      let wi = idx.get(k3);
      if (wi == null) { const p = k3.split("|"); wi = S.wilKunci.push([p[0], p[0] + "|" + p[1], k3]) - 1; idx.set(k3, wi); }
      tambah.push([b[0], b[1], t, b[3], b[4], b[5], wi, b[7]]);
    }
    untuk = S.titik;
    if (!tambah.length) return;
    const acuan = tambah.reduce((m, x) => Math.max(m, x[2]), a0), geser = (acuan - a0) / 36e5;
    for (const b of S.titik) b[2] = Math.round((b[2] - geser) * 100) / 100;
    for (const x of tambah) { x[2] = Math.round((x[2] - acuan) / 36e5 * 100) / 100; S.titik.push(x); }
    S.acuan = new Date(acuan); terakhir = S.titik;
    clearTimeout(gabung._t);   // satu penyegaran saja bila dua penggabungan beruntun (72 jam lalu 7 hari): updateImage Kini tidak saling membatalkan
    gabung._t = setTimeout(() => { try { hitung(); peta.getSource("titik")?.setData(Peta.geoTitik()); Peta.aturWilayah(false); Kini?.segarkan?.(); } catch (e) { console.warn("titik_live", e); } }, 1500);
    const el = document.getElementById("upd"), diolah = Math.max(Date.parse(S.meta?.dibuat) || 0, S.titikDiambil || 0);
    if (el) { el.innerHTML = labelJam(S.acuan);      // jam data = deteksi terbaru (S.acuan sudah maju), bukan acuan harian
      if (diolah) el.title = `Lintasan satelit terakhir; diolah ${jamWIB(diolah)} · ${tambah.length} titik baru dari FIRMS NRT`; }
  }
  /* Worker cron (:15 tiap 3 jam) dan titik.yml (:40 tiap 3 jam, terbit statis) mengambil FIRMS yang sama: selama data statis
     < 3,5 jam, /api/titik hampir tidak menambah titik tapi memakan satu pemanggilan Worker per kunjungan. Baru dipanggil bila
     terbit statis terlambat/gagal (cek ulang tiap 30 menit). meta.dibuat = jam pipeline JALAN, bukan umur titiknya: 28 Okt 2026 titik.yml
     08.42 WIB terbit dengan titik terakhir 27 Okt 19.21 WIB (FIRMS terlambat), /api/titik sudah punya lintasan malam tetapi dilewati.
     Jadi dilewati hanya bila titik terakhir data statis juga < 10 jam (celah lintasan terpanjang ~7 jam + latensi FIRMS ~3 jam). */
  const STATIS_SEGAR = 3.5 * 36e5, TITIK_SEGAR = 10 * 36e5;
  async function ambil() {
    if (S.meta?.dibuat && Date.now() - Date.parse(S.meta.dibuat) < STATIS_SEGAR && Date.now() - S.acuan0 < TITIK_SEGAR) return;
    try { const r = await fetch("/api/titik"); if (!r.ok) return; const d = await r.json();
      if (!Array.isArray(d.baris) || !Array.isArray(d.wilayah)) return;
      if (!live || d.dibuat !== live.dibuat) { live = d; untuk = null; } gabung();
    } catch (e) {}
  }
  const tunggu = setInterval(() => { if (siapHalaman()) { clearInterval(tunggu); ambil(); } }, 2000);
  setTimeout(() => clearInterval(tunggu), 180e3);
  setInterval(() => { if (!document.hidden) ambil(); }, 30 * 60e3);
  setInterval(gabung, 5000);                       // data 7 hari dimuat belakangan mengganti S.titik: gabung lagi
})();
