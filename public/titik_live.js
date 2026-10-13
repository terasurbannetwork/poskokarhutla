/* titik_live.js — titik panas hampir-waktu-nyata (tiap 3 jam) di atas data harian, halaman karhutla.
   Skrip klasik, dimuat SETELAH skrip utama: memakai global S, peta, Peta, hitung, Kini, jamWIB, $.
   GET /api/titik (src/titik.js) berformat sama dengan data/hotspot.json; hanya titik yang LEBIH BARU dari acuan data
   harian yang ditambahkan (dedup lat/lon/menit/sensor), lalu kolom jam semua baris digeser ke acuan baru.
   Kalau API gagal atau belum ada putaran, halaman tetap memakai data harian tanpa pesan apa pun. */
(() => {
  let live = null, untuk = null, asli = null, terakhir = null;   // terakhir = array yang barisnya sudah digeser
  const kunci = (la, lo, t, s) => `${la}|${lo}|${Math.round(t / 6e4)}|${s}`;
  const siapHalaman = () => typeof S !== "undefined" && Array.isArray(S.titik) && S.acuan && S.wilKunci && typeof peta !== "undefined" && peta && typeof Peta !== "undefined";

  function gabung() {
    if (!live || !siapHalaman() || untuk === S.titik) return;
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
    const el = document.getElementById("upd");
    if (el) { el.dataset.harian ??= el.textContent; el.textContent = `${el.dataset.harian} · Titik panas diperbarui ${jamWIB(live.dibuat).replace(/^\d+ \S+ /, "")} (tiap 3 jam)`;
      el.title = `${tambah.length} titik baru dari FIRMS NRT sejak data harian`; }
  }
  async function ambil() {
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
