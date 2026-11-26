/* Lapor tanpa sinyal (paket data/kajian-bnpb/lapor-luring, LR-03 sampai LR-05).
   Saat tidak ada sinyal, tombol Lapor darurat dan Lapor kejadian membuka formulir pendek seperti Lapor darurat (jenis, lokasi GPS, ada korban atau tidak, catatan).
   Butir disimpan di HP lewat antrean bersama public/inti/antre.js (saluran "lapor-luring", 14 hari, Q4) dan dikirim otomatis begitu sinyal kembali.
   Pengiriman memutar ulang alur Lapor darurat di /api/lapor/pesan langkah demi langkah, jadi mesin percakapan tetap satu (src/lapor_mesin.js) dan meja menerima laporan biasa.
   Hanya untuk perangkat yang sudah pernah melapor (nomor tersimpan, Q2).
   LR-06: sampai 3 foto kamera ikut disimpan di butir (data URL yang sudah dikecilkan, batas 5 butir dan 20 MB dari spek) dan dikirim di langkah foto Lapor darurat.
   LR-09: waktu simpan di HP ikut tiap pesan sebagai `luring`; Worker hanya memakainya sebagai keterangan meja dan penilai foto (Q1), tidak pernah sebagai waktu kejadian. */
import {JENIS as JENIS_SPEK, KORBAN, BATAS, bolehSimpan} from "../inti/luring_spek.js";
const $ = id => document.getElementById(id);
const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
const ikon = id => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"), u = document.createElementNS("http://www.w3.org/2000/svg", "use"); s.setAttribute("aria-hidden", "true"); u.setAttribute("href", `#${id}`); s.append(u); return s; };
// jenis dan korban dari spek luring bersama (public/inti/luring_spek.js); label jenis dicocokkan ke label pilihan server saat dikirim
const JENIS = JENIS_SPEK.map(x => x[1]);
const nomor = () => { try { const v = JSON.parse(localStorage.getItem("lapor-wa") || "null"); return v ? String(v) : null; } catch { return null; } };
const luring = () => navigator.onLine === false;

/* ---- pengiriman: putar ulang alur Lapor darurat ---- */
async function kirimJson(url, body, w, ms) {
  const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, credentials: "same-origin",
    body: JSON.stringify({wa: nomor(), saluran: "web", bahasa: "id", ...body, ...(Number.isFinite(w) ? {luring: w, luring_kirim: Date.now()} : {})}), signal: AbortSignal.timeout(ms)});
  return {s: r.status, j: await r.json().catch(() => ({}))};
}
const ulangNanti = s => s === 0 || s === 401 || s === 403 || s === 408 || s === 429 || s >= 500;   // sama dengan kelas antre.js: butir tetap menunggu
export async function putarUlang(d) {
  if (!nomor()) return {s: 401, j: {galat: "Nomor pelapor belum tersimpan di perangkat ini."}};
  const w = d.waktu_klien ?? d.waktu_simpan, pesan = body => kirimJson("/api/lapor/pesan", body, w, 45000), foto = [...(d.foto || [])];
  let r = await pesan({teks: "darurat"});
  for (let langkah = 0; langkah < 20; langkah++) {
    if (r.s !== 200) return r;
    const j = r.j, pil = j.pilihanAsli || j.pilihan || [];
    if (j.nomor) { catatTerkirim(j); return {s: 200, j: {nomor: j.nomor}}; }
    if (j.minta === "identitas") return {s: 401, j: {galat: "Identitas pelapor perlu diisi dulu saat ada sinyal."}};
    if (j.minta === "lokasi") { r = await pesan({lokasi: {lat: d.lat, lon: d.lon, akurasi: d.akurasi, sumber: "gps"}}); continue; }
    if (j.minta === "foto" && foto.length) {   // LR-06: foto luring satu per satu lewat rute foto biasa; foto yang ditolak dilewati, laporan tetap terkirim
      const f = foto.shift(), u = await kirimJson("/api/lapor/foto", {data: f.data, gps: f.gps || null, exif: f.exif || null}, w, 60000);
      if (u.s === 200) r = u; else if (ulangNanti(u.s)) return u;
      continue;
    }
    if (j.minta === "foto" || j.minta === "foto_cari") { r = await pesan({teks: "1"}); continue; }   // tanpa foto (lagi): lanjut ke ringkasan
    if (j.status === "darurat_jenis") { const i = pil.findIndex(x => x === d.jenis); if (i < 0) return {s: 422, j: {galat: `Jenis "${d.jenis}" tidak ada di pilihan.`}}; r = await pesan({teks: String(i + 1)}); continue; }
    if (j.status === "darurat_korban") { r = await pesan({teks: String(KORBAN.findIndex(x => x[0] === d.korban) + 1 || 3)}); continue; }
    // K98: korban "ya" membuka pertanyaan orang terjebak dan butuh medis; formulir luring tidak menanyakannya, jadi dijawab "Tidak tahu" (bukan "Tidak ada"), petugas menanyakan lewat tindak lanjut
    if (j.status === "darurat_isi") { const i = pil.findIndex(x => /^tidak tahu$/i.test(x)); if (i < 0) return {s: 409, j: {galat: "Pertanyaan korban berubah; buka chat untuk melanjutkan.", keadaan: "darurat_isi"}}; r = await pesan({teks: String(i + 1)}); continue; }
    if (j.status === "ringkasan") { r = await pesan({teks: "kirim"}); continue; }
    if (pil[0] === "Benar" || pil.join("|") === "Ya|Ganti" || j.minta === "setuju") { r = await pesan({teks: "1"}); continue; }   // lokasi benar, identitas sama, persetujuan sudah diberikan di formulir
    return {s: 409, j: {galat: "Alur laporan berubah; buka chat untuk melanjutkan.", keadaan: j.status || j.minta || "tidak dikenal"}};
  }
  return {s: 409, j: {galat: "Alur laporan terlalu panjang; buka chat untuk melanjutkan.", keadaan: "panjang"}};
}

/* laporan terkirim masuk daftar Laporan di perangkat (kunci simpanan lapor.js), lalu kabar ke layar yang sedang terbuka */
function catatTerkirim(j) {
  const k = `lapor-cache-${nomor()}`, lacak = j.lacak || (j.unduhan || []).find(u => u.lacak)?.url || null;
  try { const c = JSON.parse(localStorage.getItem(k) || "{}"); c.laporan = [{nomor: j.nomor, lacak, foto: null, status: "baru", statusLabel: "Laporan diterima", waktu: Date.now(), luring: true}, ...(c.laporan || []).filter(l => l.nomor !== j.nomor)];
    localStorage.setItem(k, JSON.stringify(c)); } catch {}
  dispatchEvent(new CustomEvent("pb:luring-terkirim", {detail: {nomor: j.nomor, lacak}}));
}
let antrean = null;
function siapkanAntrean() {
  if (antrean || !window.PbAntre) return antrean;
  antrean = window.PbAntre.saluran("lapor-luring", {kirim: async badan => { try { return await putarUlang(badan[0] || badan); } catch { return {s: 0, j: {}}; } }});
  window.PbAntre.dengar(gambarPita);
  return antrean;
}

/* ---- pita butir yang menunggu sinyal (jenis dan waktu saja, tanpa lokasi dan nomor: Q6) ---- */
let urutPita = 0;
async function gambarPita() {
  const a = siapkanAntrean(); if (!a) return;
  const n = ++urutPita, daftar = (await a.daftar()).filter(x => x.status === "menunggu" || x.status === "ditolak");
  if (n !== urutPita) return;   // panggilan lebih baru sudah jalan: jangan menimpa dengan daftar lama
  let p = $("lrPita");
  if (!daftar.length) { p?.remove(); return; }
  if (!p) { p = el("div", "lp-lr-pita"); p.id = "lrPita"; p.setAttribute("role", "status"); ($("lBeranda")?.querySelector(".lp-isi-beranda") || document.body).prepend(p); }
  const tunggu = daftar.filter(x => x.status === "menunggu"), tolak = daftar.filter(x => x.status === "ditolak");
  const ik = el("span", "lp-lr-ik"); ik.append(ikon(luring() ? "i-status" : "i-kirim"));
  const tx = el("div"); tx.append(el("b", null, tunggu.length ? `${tunggu.length} laporan menunggu sinyal` : `${tolak.length} laporan belum terkirim`),
    el("small", null, tunggu.length ? (luring() ? "Tersimpan di HP ini dan terkirim otomatis begitu ada sinyal." : "Sedang dikirim...") : tolak[0].alasan || "Buka chat untuk melanjutkan."));
  const aksi = el("div", "lp-lr-aksi");
  if (tunggu.length && !luring()) { const b = el("button", "lp-kedua"); b.type = "button"; b.append(ikon("i-kirim"), "Kirim sekarang"); b.addEventListener("click", () => a.kirimSekarang()); aksi.append(b); }
  const hapus = el("button", "lp-teks-tombol"); hapus.type = "button"; hapus.textContent = "Hapus dari HP";
  hapus.addEventListener("click", async () => { if (!confirm("Hapus laporan yang belum terkirim dari HP ini?")) return; for (const x of daftar) await a.buang(x.klien_id); gambarPita(); });
  aksi.append(hapus); p.replaceChildren(ik, tx, aksi);
}

/* ---- formulir luring ---- */
function bukaFormulir() {
  if (!nomor()) return tanpaNomor();
  const d = el("dialog", "lp-lr-dialog"), kep = el("div", "lp-pw-dkep"), tutup = el("button", "lp-ikon"); tutup.type = "button"; tutup.setAttribute("aria-label", "Tutup"); tutup.append(ikon("i-tutup"));
  tutup.addEventListener("click", () => d.close()); d.addEventListener("close", () => d.remove());
  const h = el("h2", null, "Lapor tanpa sinyal"); h.id = "lrJudul"; d.setAttribute("aria-labelledby", h.id); kep.append(h, tutup);
  const pengantar = el("p", "lp-lr-pengantar", "Tidak ada sinyal. Laporan disimpan di HP ini dan terkirim otomatis begitu ada sinyal. Bila ada nyawa terancam, telepon 112.");
  const f = el("div", "lp-lr-form"), status = el("p", "lp-pw-status"); status.setAttribute("role", "status");
  // jenis
  const jg = el("fieldset", "lp-lr-jenis"); jg.append(el("legend", null, "Kejadian apa?"));
  let jenis = null;
  for (const j of JENIS) { const b = el("button", "lp-lr-pil", j); b.type = "button"; b.setAttribute("aria-pressed", "false"); b.addEventListener("click", () => { jenis = j; jg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }); jg.append(b); }
  // lokasi
  let pos = null; const lok = el("div", "lp-lr-lok"), lokT = el("small", null, "Lokasi belum diambil.");
  const ambil = el("button", "lp-kedua"); ambil.type = "button"; ambil.append(ikon("i-lokasi"), "Ambil lokasi saya");
  ambil.addEventListener("click", () => { lokT.textContent = "Mengambil lokasi dari GPS..."; navigator.geolocation?.getCurrentPosition(p => { pos = p.coords; lokT.textContent = `Lokasi tercatat, ketelitian sekitar ${Math.round(p.coords.accuracy).toLocaleString("id-ID")} m.`; },
    () => { lokT.textContent = "Lokasi belum terbaca. Nyalakan GPS atau izin lokasi, lalu coba lagi."; }, {enableHighAccuracy: true, timeout: 20000, maximumAge: 120000}); });
  lok.append(ambil, lokT); ambil.click();
  // korban
  const kg = el("fieldset", "lp-lr-korban"); kg.append(el("legend", null, "Ada korban?"));
  let korban = null;
  for (const [k, t] of KORBAN) { const b = el("button", "lp-lr-pil", t); b.type = "button"; b.setAttribute("aria-pressed", "false"); b.addEventListener("click", () => { korban = k; kg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); }); kg.append(b); }
  // foto (LR-06): kamera saja, paling lama 5 menit sebelum disimpan (K75, Q1); GPS dibaca saat memotret
  const foto = [], fg = el("div", "lp-lr-foto"), kisi = el("div", "lp-lr-foto-kisi"), fotoT = el("small", null, `Boleh dilewati. Paling banyak ${BATAS.fotoPerButir} foto, langsung dari kamera.`);
  const masukan = el("input"); masukan.type = "file"; masukan.accept = "image/jpeg,image/*"; masukan.capture = "environment"; masukan.hidden = true;
  const potret = el("button", "lp-kedua"); potret.type = "button"; potret.append(ikon("i-kamera"), "Ambil foto");
  potret.addEventListener("click", () => masukan.click());
  const gambarKisi = () => { kisi.replaceChildren(...foto.map((x, i) => { const b = el("button", "lp-lr-foto-item"); b.type = "button"; b.setAttribute("aria-label", `Hapus foto ${i + 1}`);
    const im = el("img"); im.src = x.data; im.alt = ""; b.append(im, ikon("i-tutup")); b.addEventListener("click", () => { foto.splice(i, 1); gambarKisi(); }); return b; }));
    potret.hidden = foto.length >= BATAS.fotoPerButir; };
  masukan.addEventListener("change", async () => {
    const f = masukan.files[0]; masukan.value = ""; if (!f) return;
    fotoT.textContent = "Menyiapkan foto...";
    const h = await siapkanFoto(f).catch(() => ({g: "Foto tidak terbaca. Coba ambil ulang."}));
    if (h.g) { fotoT.textContent = h.g; return; }
    foto.push(h.v); gambarKisi(); fotoT.textContent = `${foto.length} dari ${BATAS.fotoPerButir} foto. Ketuk foto untuk menghapusnya.`;
  });
  fg.append(potret, kisi, fotoT, masukan);
  const setuju = el("p", "lp-redup lp-kecil", "Dengan menyimpan, Anda menyetujui pemakaian data laporan seperti pada kebijakan privasi Pantau Bencana. Data hanya diterima petugas BNPB dan BPBD.");
  const simpan = el("button", "lp-utama"); simpan.type = "button"; simpan.append(ikon("i-centang"), "Simpan laporan");
  simpan.addEventListener("click", async () => {
    if (!jenis) { status.textContent = "Pilih jenis kejadian."; return; }
    if (!pos) { status.textContent = "Lokasi belum terbaca. Ambil lokasi dulu."; return; }
    if (!korban) { status.textContent = "Pilih ada korban atau tidak."; return; }
    const a = siapkanAntrean(); if (!a) { status.textContent = "Penyimpanan di HP ini tidak tersedia."; return; }
    const kini = Date.now(), tua = foto.filter(x => kini - x.diambil > BATAS.fotoSegarMs);   // Q1: 5 menit dihitung sampai saat simpan
    if (tua.length) { for (const x of tua) foto.splice(foto.indexOf(x), 1); gambarKisi(); status.textContent = "Foto yang diambil lebih dari 5 menit lalu dilepas. Ambil foto baru, atau simpan lagi tanpa foto itu."; return; }
    if (foto.length && a.cadangan) { status.textContent = "Foto tidak bisa disimpan di HP ini. Hapus fotonya untuk menyimpan laporan tanpa foto."; return; }
    const ada = (await a.daftar()).filter(x => x.status === "menunggu"), ukur = l => l.reduce((n, x) => n + (x.data?.length || 0), 0);
    let sisaKuota = null; try { const e = await navigator.storage?.estimate?.(); if (e?.quota) sisaKuota = e.quota - (e.usage || 0); } catch {}
    const boleh = bolehSimpan({butirMenunggu: ada.length, foto: foto.length, byteTersimpan: ada.reduce((n, x) => n + ukur(x.data?.foto || []), 0), byteBaru: ukur(foto), sisaKuota});
    if (!boleh.ok) { status.textContent = boleh.pesan; return; }
    navigator.storage?.persist?.().catch(() => {});   // minta simpanan bertahan (DL10); ditolak pun butir tetap tersimpan
    try { await a.tambah({jenis, korban, lat: Number(pos.latitude.toFixed(6)), lon: Number(pos.longitude.toFixed(6)), akurasi: Math.round(pos.accuracy), waktu_simpan: kini,
      ...(foto.length ? {foto: foto.map(({data, exif, gps}) => ({data, exif, gps}))} : {})}); }
    catch { status.textContent = "Penyimpanan HP penuh, laporan belum tersimpan. Kirim yang menunggu dulu atau kosongkan ruang."; return; }
    d.close(); gambarPita();
  });
  f.append(jg, el("p", "lp-pw-label", "Lokasi kejadian"), lok, kg, el("p", "lp-pw-label", "Foto kejadian"), fg, setuju, simpan, status);
  d.append(kep, pengantar, f); document.body.append(d); d.showModal();
}
/* foto kamera: EXIF wajib punya Make/Model, umur paling 5 menit menurut jam HP (aturan bukanKamera di lapor.js); dikecilkan lalu jadi data URL; GPS dibaca saat itu */
const lokasiKini = () => new Promise(ok => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => ok({lat: p.coords.latitude, lon: p.coords.longitude, akurasi: Math.round(p.coords.accuracy), waktu: Date.now()}), () => ok(null),
  {enableHighAccuracy: true, timeout: 15000, maximumAge: 60000}) : ok(null));
async function siapkanFoto(f) {
  const kini = Date.now(), exif = window.bacaExif ? window.bacaExif(await f.slice(0, 262144).arrayBuffer()) : null;
  if (!exif || !exif.kamera) return {g: "Ambil foto langsung dengan kamera HP. Tangkapan layar dan gambar dari galeri tidak diterima."};
  if (exif.waktu && Math.abs(kini - exif.waktu) > BATAS.fotoSegarMs || f.lastModified && kini - f.lastModified > BATAS.fotoSegarMs) return {g: "Foto ini diambil lebih dari 5 menit lalu. Ambil foto baru langsung dengan kamera."};
  const [kecil, gps] = await Promise.all([window.fotoKecil ? window.fotoKecil(f) : null, lokasiKini()]);
  if (!kecil) return {g: "Foto tidak terbaca atau terlalu besar. Coba ambil ulang."};
  const data = await new Promise((ok, gagal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = gagal; r.readAsDataURL(kecil); });
  return {v: {data, exif, gps, diambil: exif.waktu || f.lastModified || kini}};
}
function tanpaNomor() {   // Q2: perangkat yang belum pernah melapor tidak bisa melapor luring
  const d = el("dialog", "lp-lr-dialog"), tutup = el("button", "lp-utama", "Tutup"); tutup.type = "button"; tutup.addEventListener("click", () => d.close()); d.addEventListener("close", () => d.remove());
  const t112 = el("a", "lp-kedua"); t112.href = "tel:112"; t112.append(ikon("i-telepon"), "Telepon 112");
  const t117 = el("a", "lp-kedua"); t117.href = "tel:117"; t117.append(ikon("i-telepon"), "Telepon BNPB 117");
  d.append(el("h2", null, "Tidak ada sinyal"), el("p", null, "Lapor tanpa sinyal bisa dipakai sesudah Anda pernah melapor sekali dari HP ini saat ada sinyal. Untuk keadaan darurat, telepon:"), t112, t117, tutup);
  document.body.append(d); d.showModal();
}

/* tombol lapor saat tidak ada sinyal membuka formulir luring (fase tangkap: sebelum handler chat di lapor.js) */
addEventListener("click", e => {
  if (!luring()) return;
  const b = e.target.closest?.('#bDarurat, #bLaporBaru, [data-aksi="darurat"], [data-aksi="lapor"], .lp-tab-lapor, [data-tip-aksi="darurat"], [data-tip-aksi="lapor"]');
  if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation(); bukaFormulir();
}, true);
addEventListener("online", gambarPita); addEventListener("offline", gambarPita);
// antre.js dimuat sebagai skrip klasik di index.html; tunggu sebentar bila belum siap
(function tunggu(n = 0) { if (window.PbAntre) gambarPita(); else if (n < 40) setTimeout(() => tunggu(n + 1), 100); })();
