/* /lapangan: api yang ditugaskan ke regu (Kartu Api, akses, cara) dan peta luring area itu.
   Tugas: GET /api/lapangan/tugas (header x-kode-regu) -> {kini, tugas:[{id, lat, lon, kab, kec, level, rekomendasi, akses, kartu}]}. Server belum punya rute ini? 404/405 dijawab "belum aktif", bukan galat.
   Jawaban terakhir disimpan service worker (public/sw-lapangan.js, per kode regu) dan datang kembali dengan header x-dari-cache saat luring.
   Peta luring: ubin vektor OpenFreeMap (gaya terang dan gelap, sprite, huruf Latin, ubin radius 10 km zoom 7-14) disalin ke Cache Storage "pb-peta-luring-v1"; service worker membacanya untuk tiles.openfreemap.org.
   Satu area per ponsel (area baru menggantikan yang lama), batas 80 MB dan 700 ubin.
   Fungsi murni (daftarUbin, ukuran, jarakKm) bisa diuji di Node. CSP: tanpa skrip/gaya inline; semua teks data lewat textContent atau KartuApi/AksesKartu (esc). INP: ketukan hanya mengubah teks kecil; unduhan berjalan async. */
(() => {
  "use strict";
  const PETA = "pb-peta-luring-v1", K_PETA = "pb_peta_luring", GAYA = {terang: "https://tiles.openfreemap.org/styles/positron", gelap: "https://tiles.openfreemap.org/styles/dark"};
  const BATAS = {radiusKm: 10, zMin: 7, zMaks: 14, ubinMaks: 700, byteMaks: 80 * 1048576, paralel: 6, glyph: ["0-255", "256-511"]};
  const bulatKm = 111.32;

  /* ---------- fungsi murni ---------- */
  const xUbin = (lon, z) => Math.floor((lon + 180) / 360 * 2 ** z);
  const yUbin = (lat, z) => { const r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z); };
  function daftarUbin(lat, lon, radiusKm, zMin, zMaks) {
    const dLat = radiusKm / bulatKm, dLon = radiusKm / (bulatKm * Math.cos(lat * Math.PI / 180)), hasil = [];
    for (let z = zMin; z <= zMaks; z++) {
      const n = 2 ** z, x0 = Math.max(0, xUbin(lon - dLon, z)), x1 = Math.min(n - 1, xUbin(lon + dLon, z)), y0 = Math.max(0, yUbin(Math.min(lat + dLat, 85), z)), y1 = Math.min(n - 1, yUbin(Math.max(lat - dLat, -85), z));
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) hasil.push({z, x, y});
    }
    return hasil;
  }
  const jarakKm = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371; };
  const ukuran = b => b >= 1048576 ? (b / 1048576).toLocaleString("id-ID", {maximumFractionDigits: 1}) + " MB" : Math.max(1, Math.round(b / 1024)).toLocaleString("id-ID") + " KB";
  const jamLokal = ms => new Date(ms).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "");
  /* huruf dari lapisan gaya: text-font berupa larik teks; ekspresi dilewati */
  const tumpukanHuruf = gaya => { const s = new Set(); for (const l of gaya.layers || []) { const f = l.layout && l.layout["text-font"]; if (Array.isArray(f) && f.every(x => typeof x === "string")) s.add(f.join(",")); } return [...s]; };
  const sprite = gaya => typeof gaya.sprite === "string" ? [".json", ".png", "@2x.json", "@2x.png"].map(e => gaya.sprite + e) : [];
  const api = {daftarUbin, jarakKm, ukuran, tumpukanHuruf, sprite, BATAS};
  if (typeof document === "undefined") { (typeof window !== "undefined" ? window : globalThis).LapanganTugas = api; return; }

  /* ---------- unduh peta ---------- */
  const metaMentah = () => { try { return JSON.parse(localStorage.getItem(K_PETA) || "null"); } catch (e) { return null; } };
  const bacaMeta = () => { const m = metaMentah(); return m && opsi && opsi.kh && m.h === opsi.kh() ? m : null; };   // peta milik kode regu lain tidak dianggap ada
  const tulisMeta = m => { try { m ? localStorage.setItem(K_PETA, JSON.stringify(m)) : localStorage.removeItem(K_PETA); } catch (e) {} };
  async function simpanKe(cache, url, sinyal) {
    const r = await fetch(url, {signal: sinyal});
    if (!r.ok) return 0;
    const buf = await r.arrayBuffer();
    await cache.put(url, new Response(buf, {status: 200, headers: {"content-type": r.headers.get("content-type") || "application/octet-stream"}}));
    return buf.byteLength;
  }
  /* pada({selesai, total, byte}); sinyal = AbortSignal. Mengembalikan meta; melempar hanya bila gaya/tilejson gagal diambil (belum ada yang tersimpan). */
  async function unduhPeta(lat, lon, tugasId, pada, sinyal) {
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    await caches.delete(PETA); const cache = await caches.open(PETA);
    let byte = 0, selesai = 0, total = 0, henti = null; const lapor = () => pada && pada({selesai, total, byte});
    const kerja = async url => { if (henti || sinyal.aborted) return; try { byte += await simpanKe(cache, url, sinyal); } catch (e) { if (sinyal.aborted) return; } selesai++; lapor(); if (byte > BATAS.byteMaks) henti = "batas"; };
    const antre = async (daftar) => { const q = [...daftar]; await Promise.all(Array.from({length: BATAS.paralel}, async () => { while (q.length && !henti && !sinyal.aborted) await kerja(q.shift()); })); };
    total = 2; lapor();
    const gaya = []; for (const u of Object.values(GAYA)) { const r = await fetch(u, {signal: sinyal}); if (!r.ok) throw new Error("gaya peta tidak bisa diambil"); const j = await r.json(); gaya.push(j); await simpanKe(cache, u, sinyal); selesai++; lapor(); }
    const tj = new Set(); let templ = null, zMaks = BATAS.zMaks;
    for (const g of gaya) for (const s of Object.values(g.sources || {})) if (s.type === "vector" && typeof s.url === "string") tj.add(s.url);
    for (const u of tj) { const r = await fetch(u, {signal: sinyal}); if (!r.ok) throw new Error("data ubin tidak bisa diambil"); const j = await r.json(); await simpanKe(cache, u, sinyal); if (!templ && Array.isArray(j.tiles) && j.tiles[0]) { templ = j.tiles[0]; if (Number.isFinite(j.maxzoom)) zMaks = Math.min(zMaks, j.maxzoom); } }
    if (!templ) throw new Error("alamat ubin tidak ditemukan");
    const tetap = new Set(); for (const g of gaya) { sprite(g).forEach(u => tetap.add(u)); if (g.glyphs) for (const f of tumpukanHuruf(g)) for (const rg of BATAS.glyph) tetap.add(g.glyphs.replace("{fontstack}", f).replace("{range}", rg)); }
    const ubin = daftarUbin(lat, lon, BATAS.radiusKm, BATAS.zMin, zMaks);
    if (ubin.length > BATAS.ubinMaks) ubin.length = BATAS.ubinMaks;
    total = selesai + tetap.size + ubin.length; lapor();
    await antre(tetap); await antre(ubin.map(u => templ.replace("{z}", u.z).replace("{x}", u.x).replace("{y}", u.y)));
    const meta = {h: opsi.kh(), lat, lon, radius_km: BATAS.radiusKm, ubin: ubin.length, byte, waktu: Date.now(), tugas: tugasId || null, tidak_lengkap: sinyal.aborted ? "batal" : henti};
    tulisMeta(meta); return meta;
  }
  async function hapusPeta() { await caches.delete(PETA); tulisMeta(null); }

  /* ---------- tampilan ---------- */
  const $ = id => document.getElementById(id);
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  let opsi = null, daftar = [], dipilih = 0, petaGL = null, dariCache = null, sedangUnduh = null;
  const gelap = () => matchMedia("(prefers-color-scheme: dark)").matches;
  const urut = () => { const l = opsi.lokasi && opsi.lokasi(); if (l) daftar.sort((a, b) => jarakKm(l.lat, l.lon, a.lat, a.lon) - jarakKm(l.lat, l.lon, b.lat, b.lon)); return l; };

  function keadaan(jenis, judul, isi, tombol) {   // jenis: memuat | kosong | galat | luring | belum
    const w = $("tugasIsi"); w.replaceChildren();
    const k = el("div", "lp-keadaan " + jenis); k.append(el("b", "", judul)); if (isi) k.append(el("span", "lp-kecil", isi));
    if (tombol) { const b = el("button", "lp-tombol", tombol); b.type = "button"; b.addEventListener("click", () => muat()); k.append(b); }
    w.append(k);
  }
  async function muat() {
    if (!opsi || !opsi.kode()) return;
    keadaan("memuat", "Memuat tugas api…");
    let r;
    try { r = await fetch("/api/lapangan/tugas", {headers: {"x-kode-regu": opsi.kode()}}); }
    catch (e) { opsi.jaringan(false); return keadaan("luring", "Belum ada tugas yang tersimpan", "Ponsel sedang tanpa sinyal dan tugas belum pernah dimuat di sini. Buka halaman ini sekali saat ada sinyal supaya tugas tersimpan.", "Coba lagi"); }
    opsi.jaringan(!r.headers.get("x-dari-cache"));
    if (r.status === 403) return opsi.kodeMati();
    if (r.status === 404 || r.status === 405 || r.status === 503) return keadaan("belum", "Daftar tugas belum aktif", "Server belum menyediakan tugas api untuk regu. Formulir lapor di bawah tetap bisa dipakai.");
    if (!r.ok) return keadaan("galat", "Tugas belum bisa dimuat", `Server menjawab ${r.status}. Formulir lapor di bawah tetap bisa dipakai.`, "Coba lagi");
    const j = await r.json().catch(() => null);
    dariCache = r.headers.get("x-dari-cache") ? Number(r.headers.get("x-disimpan")) || true : null;
    daftar = j && Array.isArray(j.tugas) ? j.tugas.filter(t => t && Number.isFinite(t.lat) && Number.isFinite(t.lon)).slice(0, 5) : [];
    dipilih = 0; if (!daftar.length) return keadaan("kosong", "Belum ada api yang ditugaskan", "Posko belum menugaskan regu ini ke api. Halaman ini akan menampilkan Kartu Api begitu ada tugas. Formulir lapor di bawah tetap bisa dipakai.", "Muat ulang");
    gambar();
  }
  function gambar() {
    const lok = urut(), t = daftar[dipilih], w = $("tugasIsi"); w.replaceChildren();
    const kop = el("div", "lp-tugas-kop");
    kop.append(el("p", "lp-kecil", lok ? "Api terdekat dari lokasimu" : "Tugas pertama dari posko"));
    kop.append(el("h3", "", `${t.kec ? t.kec + ", " : ""}${t.kab || "lokasi tugas"}`));
    kop.append(el("p", "lp-jarak", lok ? `Sekitar ${jarakKm(lok.lat, lok.lon, t.lat, t.lon).toLocaleString("id-ID", {maximumFractionDigits: 1})} km garis lurus dari lokasimu` : "Ambil lokasi di bagian 1 untuk melihat jarak."));
    if (dariCache) kop.append(el("p", "lp-simpanan", `Data tersimpan di ponsel${typeof dariCache === "number" ? ` sejak ${jamLokal(dariCache)}` : ""}. Bisa sudah berubah, periksa lagi saat ada sinyal.`));
    w.append(kop);
    if (daftar.length > 1) {
      const lb = el("label", "", "Api lain yang ditugaskan"), s = el("select"); s.id = "tugasPilih";
      daftar.forEach((x, i) => { const o = el("option", "", `${x.kec ? x.kec + ", " : ""}${x.kab || "tugas"}${lok ? `, ${jarakKm(lok.lat, lok.lon, x.lat, x.lon).toLocaleString("id-ID", {maximumFractionDigits: 1})} km` : ""}`); o.value = String(i); s.append(o); });
      s.value = String(dipilih); s.addEventListener("change", () => { dipilih = Number(s.value); gambar(); }); lb.append(s); w.append(lb);
    }
    const kartu = el("div", "lp-kartu-api"); w.append(kartu);
    if (window.KartuApi) window.KartuApi.pasang(kartu, t, t.kartu || null);
    if (window.AksesKartu && t.akses) { const a = el("div"); a.innerHTML = window.AksesKartu.html(t.akses); w.append(a); }
    const cara = (Array.isArray(t.cara) ? t.cara : (Array.isArray(t.rekomendasi && t.rekomendasi.cara) ? t.rekomendasi.cara.map(c => c && c.metode) : [])).filter(x => typeof x === "string").slice(0, 4);
    if (cara.length) { const s = el("section", "ak-kartu"); s.append(el("h2", "", "Taktik pemadaman"), el("span", "ak-pil", "Perkiraan, belum divalidasi lapangan")); const ol = el("ol"); cara.forEach(c => ol.append(el("li", "", c))); s.append(ol); w.append(s); }
    w.append(blokPeta(t));
  }

  function blokPeta(t) {
    const s = el("section", "lp-peta-blok"); s.append(el("h3", "", "Peta area ini"));
    const wadah = el("div", "lp-peta"); wadah.id = "tugasPeta"; wadah.hidden = true;
    const bTampil = el("button", "lp-tombol", "Tampilkan peta"); bTampil.type = "button";
    bTampil.addEventListener("click", async () => {
      bTampil.disabled = true; bTampil.textContent = "Memuat peta…";
      try { await opsi.muatMapLibre(); wadah.hidden = false; bTampil.hidden = true; pasangPeta(wadah, t); }
      catch (e) { bTampil.disabled = false; bTampil.textContent = "Tampilkan peta"; info.textContent = "Peta belum termuat. Ketuk lagi, atau simpan peta saat ada sinyal."; }
    });
    const info = el("p", "lp-kecil"); info.id = "petaInfo"; info.setAttribute("role", "status"); info.setAttribute("aria-live", "polite");
    const prog = el("progress"); prog.id = "petaProg"; prog.hidden = true; prog.max = 1;
    const bSimpan = el("button", "lp-tombol utama", "Simpan peta area ini"); bSimpan.type = "button";
    const bBatal = el("button", "lp-tombol", "Batalkan"); bBatal.type = "button"; bBatal.hidden = true;
    const bHapus = el("button", "lp-tombol", "Hapus peta tersimpan"); bHapus.type = "button";
    const tampilMeta = () => {
      const m = bacaMeta(); bHapus.hidden = !m;
      if (!m) info.textContent = `Belum ada peta tersimpan. Satu area radius ${BATAS.radiusKm} km dari api ini, beberapa MB sampai puluhan MB. Simpan saat ada sinyal.`;
      else info.textContent = `Tersimpan ${ukuran(m.byte)}, ${m.ubin} ubin radius ${m.radius_km} km, ${jamLokal(m.waktu)}.${m.tugas && m.tugas !== t.id ? " Area ini milik api lain; simpan lagi untuk menggantinya." : ""}${m.tidak_lengkap ? (m.tidak_lengkap === "batas" ? " Berhenti di batas 80 MB, sebagian ubin belum tersimpan." : " Dibatalkan, sebagian ubin belum tersimpan.") : ""}`;
    };
    bSimpan.addEventListener("click", async () => {
      if (sedangUnduh) return;
      if (!navigator.onLine) { info.textContent = "Tidak ada sinyal. Simpan peta saat online."; return; }
      if (!window.caches) { info.textContent = "Peramban ini tidak punya penyimpanan luring."; return; }
      const m = bacaMeta(); if (m && m.tugas === t.id && !m.tidak_lengkap && Date.now() - m.waktu < 6e4) { info.textContent = "Peta area ini baru saja disimpan."; return; }
      sedangUnduh = new AbortController(); bSimpan.disabled = true; bHapus.disabled = true; bBatal.hidden = false; prog.hidden = false; prog.value = 0; info.textContent = "Menyiapkan unduhan…";
      try {
        await unduhPeta(t.lat, t.lon, t.id, p => { prog.max = p.total || 1; prog.value = p.selesai; info.textContent = `Mengunduh ${p.selesai} dari ${p.total}, ${ukuran(p.byte)}`; }, sedangUnduh.signal);
        tampilMeta();
      } catch (e) { info.textContent = "Peta belum bisa disimpan: " + (e && e.name === "QuotaExceededError" ? "penyimpanan ponsel penuh." : "periksa sinyal lalu ketuk lagi."); await hapusPeta().catch(() => {}); }
      sedangUnduh = null; bSimpan.disabled = false; bHapus.disabled = false; bBatal.hidden = true; prog.hidden = true;
    });
    bBatal.addEventListener("click", () => { if (sedangUnduh) sedangUnduh.abort(); });
    bHapus.addEventListener("click", async () => { bHapus.disabled = true; await hapusPeta().catch(() => {}); bHapus.disabled = false; tampilMeta(); });
    s.append(wadah, bTampil, info, prog, bSimpan, bBatal, bHapus); tampilMeta();
    if (!navigator.onLine && bacaMeta()) setTimeout(() => bTampil.click(), 0);   // luring dengan peta tersimpan: langsung tampil
    return s;
  }
  function pasangPeta(wadah, t) {
    if (petaGL) { petaGL.remove(); petaGL = null; }
    if (!window.maplibregl) return;
    petaGL = new maplibregl.Map({container: wadah, style: gelap() ? GAYA.gelap : GAYA.terang, center: [t.lon, t.lat], zoom: 12, minZoom: 7, maxZoom: 17, dragRotate: false, attributionControl: {compact: true}});
    petaGL.touchZoomRotate.disableRotation();
    petaGL.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    new maplibregl.Marker({color: "#c9503a"}).setLngLat([t.lon, t.lat]).addTo(petaGL);
  }

  api.hapusPeta = () => hapusPeta().catch(() => {});
  api.mulai = o => { opsi = o; const m = metaMentah(); if (m && m.h !== o.kh()) hapusPeta().catch(() => {}); muat(); };   // kode regu berganti: peta area api regu lama dibuang
  api.segar = () => { if (!sedangUnduh && !petaGL) muat(); };   // saat sinyal kembali: tidak mengganggu unduhan atau peta yang sedang tampil
  api.lokasiBaru = () => { if (!daftar.length || sedangUnduh || petaGL || !$("tugasIsi").querySelector(".lp-tugas-kop")) return; dipilih = 0; gambar(); };   // tidak menggambar ulang saat unduhan atau peta aktif
  window.LapanganTugas = api;
})();
