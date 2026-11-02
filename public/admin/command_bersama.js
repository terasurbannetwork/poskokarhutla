"use strict";
/* Pembantu bersama command center karhutla: MEJA OPERATOR (public/admin/command_center.js).
   Dimuat sesudah /inti/format.js (fmt.durasi = SATU formatter durasi semua layar). Datanya dari /api/cc/* (src/command_center.js).
   Aturan: teks dari API TIDAK PERNAH lewat innerHTML (h() memakai textContent); tanpa gaya sebaris (CSP: style-src 'self'); jam dan tanggal format Indonesia zona WIB ("07.42"). */
(() => {
  const WIB = "Asia/Jakarta";
  const NAMA_STATUS = {baru: "Baru", dalam_konfirmasi: "Dalam konfirmasi", ada_api: "Ada api", tidak_ada_api: "Tidak ada api"};
  const fJam = new Intl.DateTimeFormat("id-ID", {timeZone: WIB, hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
  const fTgl = new Intl.DateTimeFormat("id-ID", {timeZone: WIB, weekday: "long", day: "numeric", month: "long", year: "numeric"});
  const fPendek = new Intl.DateTimeFormat("id-ID", {timeZone: WIB, day: "numeric", month: "short"});

  /* ---------- format ---------- */
  const jam = ms => Number.isFinite(ms) ? fJam.format(ms).replace(":", ".") : "–";
  const tgl = ms => Number.isFinite(ms) ? fTgl.format(ms) : "–";
  const pendek = ms => Number.isFinite(ms) ? fPendek.format(ms) : "–";
  /* jam saja bila ms jatuh di hari WIB yang sama dengan jam server ("07.42"), selain itu "1 Nov 07.42": status yang dipegang berhari-hari tak boleh terbaca sebagai pagi ini */
  const hariWib = ms => Math.floor((ms + 7 * 36e5) / 864e5);
  const jamTgl = ms => !Number.isFinite(ms) ? "–" : hariWib(ms) === hariWib(waktu.kini()) ? jam(ms) : `${pendek(ms)} ${jam(ms)}`;
  const durasi = ms => !Number.isFinite(ms) ? "–" : Math.abs(ms) < 6e4 ? "kurang dari 1 menit" : fmt.durasi(ms);
  /* [nilai, satuan] untuk kartu angka: satuan menempel di posisi tetap, nilai rata kanan */
  function durasiPecah(ms) {
    if (!Number.isFinite(ms)) return ["–", ""];
    if (Math.abs(ms) < 6e4) return ["< 1", "menit"];   // sama dengan durasi(): "kurang dari 1 menit", tidak dilantai ke 1 (median 20 dtk bukan "1 menit")
    const m = Math.round(Math.abs(ms) / 6e4), j = Math.floor(m / 60);
    if (j < 1) return [fmt(m), "menit"];
    if (j < 24) return m % 60 ? [`${j} jam ${m % 60}`, "menit"] : [fmt(j), "jam"];
    return [fmt.durasi(ms), ""];
  }
  const lokasi = a => [a.kec, a.kab].filter(Boolean).join(", ") || a.prov_nama || "Lokasi belum diketahui";

  /* ---------- DOM tanpa innerHTML ---------- */
  const h = (tag, att, ...anak) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) {
      if (v == null || v === false || k === "style") continue;   // gaya sebaris diblokir CSP: pakai kelas
      if (k === "teks") e.textContent = v;
      else if (k === "class") e.className = v;
      else if (/^on[a-z]+$/.test(k)) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const a of anak.flat()) if (a != null && a !== false) e.append(a);
    return e;
  };

  /* ---------- jaringan ---------- */
  /* GET JSON dengan batas waktu: tidak melempar. status 0 = jaringan putus, kehabisan waktu, atau dibatalkan lewat `batal` (AbortSignal milik pemanggil: permintaan usang diputus, jawabannya tak ikut tiba). */
  async function ambil(url, {cache = "no-store", batas = 15e3, batal = null} = {}) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), batas), putus = () => ac.abort();
    if (batal) { if (batal.aborted) ac.abort(); else batal.addEventListener("abort", putus, {once: true}); }
    try { const r = await fetch(url, {cache, signal: ac.signal}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {ok: false, status: 0, j: {}}; }
    finally { clearTimeout(t); batal?.removeEventListener("abort", putus); }
  }
  /* POST JSON; sesi staf wajib x-pb: 1. Sama seperti ambil(): BERBATAS WAKTU (15 dtk), tidak melempar; status 0 = jaringan putus atau tak ada jawaban. Tanpa batas, koneksi yang menggantung membuat
     tombol kartu terkunci "sibuk" selamanya (lakukan() di command_center.js menunggu kirim() selesai) dan operator tak bisa mencoba lagi. Pada status 0 POST-nya mungkin SUDAH masuk: pemanggil
     memuat ulang antrean, dan compare-and-set server menjawab 409 bila klik ulang ternyata kalah. */
  async function kirim(url, body, {batas = 15e3} = {}) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), batas);
    try { const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(body || {}), signal: ac.signal}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {ok: false, status: 0, j: {galat: ac.signal.aborted ? "tidak ada jawaban dari server; antrean dimuat ulang, periksa statusnya sebelum mencoba lagi" : "jaringan putus; coba lagi"}}; }
    finally { clearTimeout(t); }
  }
  /* jam server: selisihnya dipakai semua umur/hitung mundur, supaya jam komputer ruangan yang meleset tidak menggeser angka */
  const waktu = {offset: 0, sinkron(kini) { if (Number.isFinite(kini)) this.offset = kini - Date.now(); }, kini() { return Date.now() + this.offset; }};
  /* jajak berantai (tidak menumpuk), tetap jalan walau tab tersembunyi; kembali ke layar = jajak segera */
  function jajak(fn, jeda) {
    let t = 0, jalan = false, mati = false;
    const putar = async () => {
      if (jalan || mati) return;
      jalan = true; clearTimeout(t);
      try { await fn(); } catch (e) { console.error("jajak", e); }
      jalan = false; if (!mati) t = setTimeout(putar, jeda);
    };
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") putar(); });
    putar();
    return {sekarang: putar, henti() { mati = true; clearTimeout(t); }};
  }
  /* semua [data-dari="<ms>"] di bawah induk menampilkan umur sejak ms itu */
  const perbaruiUmur = (induk = document) => { const n = waktu.kini(); for (const e of induk.querySelectorAll("[data-dari]")) e.textContent = durasi(n - Number(e.dataset.dari)); };

  window.Cc = {NAMA_STATUS, jam, jamTgl, tgl, pendek, durasi, durasiPecah, lokasi, h, ambil, kirim, waktu, jajak, perbaruiUmur};
})();
