/* Pembungkus pustaka wajah Human (MIT, 3.3.6) di peramban: muat sekali (lazy), kamera, deteksi di requestAnimationFrame, pendaftaran lima arah,
   pindai wajah saat absen. Semua berkas dari aset sendiri (/petugas/vendor, /petugas/model); tanpa CDN. Backend webgl (cadangan cpu), tanpa WASM, tanpa worker blob.
   Vektor hanya hidup di memori sampai dikirim: tidak ke localStorage, tidak ke layar. Angka sudut/mutu/tantangan dari `konst` (GET /api/petugas/konst). */
import {sudutDerajat, sudutCocok, cekMutu, pesanMutu, TEKS_ARAH, penghitung, pilihTerbaik, rataL2, keBase64, variansLaplacian, buatTantangan, sisaDetik, pesanKamera} from "./wajah_murni.js";
import {muatAntispoof, potongWajah, skorHidupModel} from "./antispoof.js";

export const VERSI_PUSTAKA = "human-3.3.6", MODEL_VEKTOR = "faceres";
export const VERSI_MODEL = `${VERSI_PUSTAKA}+${MODEL_VEKTOR}`;
const SISI_LAPLACE = 96;   // potongan wajah diperkecil ke 96 x 96 sebelum ketajaman dihitung, supaya ambang tajamMin tidak bergantung pada jarak kamera

const MODEL = (berkas) => ({enabled: true, modelPath: berkas, skipFrames: 0, skipTime: 0});
const CONFIG = {
  backend: "webgl", modelBasePath: "/petugas/model/", wasmPath: "/petugas/vendor/", cacheModels: false, debug: false, async: true, warmup: "none",
  cacheSensitivity: 0, filter: {enabled: false}, gesture: {enabled: true},
  face: {
    enabled: true, detector: {modelPath: "blazeface.json", maxDetected: 2, rotation: false, return: false, skipFrames: 0, skipTime: 0},
    mesh: MODEL("facemesh.json"), iris: {enabled: false}, attention: {enabled: false},
    description: MODEL("faceres.json"), antispoof: {enabled: false}, liveness: {enabled: false},   // anti-palsu: MiniFASNet di antispoof.js, bukan model Human
    emotion: {enabled: false}, gear: {enabled: false}, mobilefacenet: {enabled: false}, insightface: {enabled: false},
  },
  body: {enabled: false}, hand: {enabled: false}, object: {enabled: false}, segmentation: {enabled: false},
};

let human = null, memuat = null;
/* muat Human + tiga model sekali per halaman. Dipanggil saat layar kamera dibuka, bukan saat beranda. */
export function muatHuman() {
  return memuat ??= (async () => {
    const {Human} = await import("/petugas/vendor/human.esm.js");
    let h = new Human(CONFIG);
    try { await h.load(); await h.init(); }
    catch (e) { h = new Human({...CONFIG, backend: "cpu"}); await h.load(); }   // WebGL tak tersedia: lebih lambat, tetap jalan
    human = h; return h;
  })().catch(e => { memuat = null; throw e; });
}

const rafBerikut = () => new Promise(r => requestAnimationFrame(r));

/* kamera. depan=true kamera depan (pindai wajah), false kamera belakang (foto logbook). Gambar sumber lebih besar dari 640 x 480 supaya foto bisa 1.280 px; deteksi memakai kanvas 640 x 480. */
export async function bukaKamera(video, {depan = true} = {}) {
  let s;
  try {
    s = await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: depan ? "user" : {ideal: "environment"}, width: {ideal: 1280}, height: {ideal: 960}}});
  } catch (e) { const g = new Error(pesanKamera(e?.name)); g.kamera = true; throw g; }
  video.srcObject = s; video.muted = true; video.setAttribute("playsinline", "");
  await video.play().catch(() => {});
  return {henti() { s.getTracks().forEach(t => t.stop()); video.srcObject = null; }};
}

/* salinan bingkai video ke kanvas baru, sisi panjang <= maks (tidak diperbesar), tidak dicerminkan */
export function salinFoto(video, maks = 1280) {
  const w0 = video.videoWidth || 640, h0 = video.videoHeight || 480, k = Math.min(1, maks / Math.max(w0, h0));
  const c = document.createElement("canvas"); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
  return c;
}

/* lingkaran deteksi: tiap frame -> onFrame(f); onFrame mengembalikan true untuk berhenti. -> {henti(), janji} (janji selesai saat berhenti; galat model = reject) */
function jalankan(video, konst, onFrame, {potong = false} = {}) {
  let batal = false, lebar = 640, turun = false, n = 0, t0 = 0, hangat = 0;
  const kanvas = document.createElement("canvas"), ctx = kanvas.getContext("2d", {willReadFrequently: true});
  const kecil = document.createElement("canvas"); kecil.width = kecil.height = SISI_LAPLACE;
  const kctx = kecil.getContext("2d", {willReadFrequently: true});
  const janji = (async () => {
    const h = await muatHuman();
    while (!batal) {
      await rafBerikut();
      if (batal || video.readyState < 2 || !video.videoWidth) continue;
      const tinggi = Math.round(lebar * video.videoHeight / video.videoWidth);
      if (kanvas.width !== lebar || kanvas.height !== tinggi) { kanvas.width = lebar; kanvas.height = tinggi; }
      ctx.drawImage(video, 0, 0, kanvas.width, kanvas.height);
      const res = await h.detect(kanvas);
      if (batal) break;
      /* fps: abaikan 3 frame pertama (kompilasi shader), lalu 3 detik; di bawah 10 fps turun ke 480 x 360 */
      if (!turun) {
        if (++hangat === 3) { t0 = performance.now(); n = 0; }
        else if (hangat > 3 && ++n && performance.now() - t0 >= 3000) { if (n / 3 < 10) { turun = true; lebar = 480; } t0 = performance.now(); n = 0; }
      }
      if (onFrame(ubah(res, kanvas, kctx, konst, potong))) break;
    }
  })();
  return {henti() { batal = true; }, janji};
}

function ubah(res, kanvas, kctx, konst, potong) {
  const w = res.face || [], f0 = w[0];
  const kosong = {jumlah: w.length, skor: 0, lebarKotak: 0, lebarVideo: kanvas.width, tajam: 0, yaw: 0, pitch: 0, tutup: 0, potong: null, embedding: null};
  if (!f0) return {...kosong, mutu: cekMutu(konst.mutu, kosong)};
  const [x, y, bw, bh] = f0.box || [0, 0, 0, 0], {yaw, pitch} = sudutDerajat(f0.rotation?.angle);
  let tajam = 0;
  if (w.length === 1 && bw > 8 && bh > 8) {
    kctx.drawImage(kanvas, Math.max(0, x), Math.max(0, y), bw, bh, 0, 0, SISI_LAPLACE, SISI_LAPLACE);
    const px = kctx.getImageData(0, 0, SISI_LAPLACE, SISI_LAPLACE).data, abu = new Float32Array(SISI_LAPLACE * SISI_LAPLACE);
    for (let i = 0; i < abu.length; i++) abu[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    tajam = variansLaplacian(abu, SISI_LAPLACE, SISI_LAPLACE);
  }
  const tutup = (res.gesture || []).some(g => g.face === 0 && /^blink /.test(g.gesture)) ? 1 : 0;
  const f = {jumlah: w.length, skor: f0.boxScore ?? f0.score ?? 0, lebarKotak: bw, lebarVideo: kanvas.width, tajam, yaw, pitch, tutup,
    potong: null, embedding: f0.embedding?.length ? Float32Array.from(f0.embedding) : null};
  const mutu = cekMutu(konst.mutu, f);
  if (mutu.ok && f.embedding && potong) f.potong = potongWajah(kanvas, [x, y, bw, bh]);   // hanya frame yang lolos mutu; inferensi nanti, 3 frame terbaik
  return {...f, mutu};
}

/* kumpulan frame lolos berturut-turut -> {vektor base64, mutu, terbaik}: 3 frame skor tertinggi, vektor dirata-rata lalu L2; skor hidup dihitung terpisah (skorHidupModel) */
function ringkas(konst, run) {
  const terbaik = pilihTerbaik(run, konst.mutu.frameTerbaik);
  return {vektor: keBase64(rataL2(terbaik.map(f => f.embedding))), mutu: terbaik.reduce((a, f) => a + f.skor, 0) / terbaik.length, terbaik};
}

/* Pendaftaran SATU arah. Lolos bila mutu + sudut terpenuhi `frameBerturut` frame berturut; lewat batasArahDetik, hitungan diulang (onInfo.ulang).
   onInfo({teks, mutuOk, sudutOk, jumlah, perlu, sisa, ulang}) tiap frame. -> {vektor, mutu}. Pembatalan: panggil sinyal.henti() -> reject {batal:true}. */
export function daftarArah({video, konst, arah, onInfo, sinyal = {}}) {
  return new Promise((ok, tolak) => {
    let run = [], mulai = performance.now(), ulang = false;
    const p = jalankan(video, konst, f => {
      if (sinyal.batal) return true;
      const sisa = sisaDetik(mulai, performance.now(), konst.mutu.batasArahDetik);
      if (sisa <= 0) { run = []; mulai = performance.now(); ulang = true; }
      const sudutOk = sudutCocok(konst, arah, f.yaw, f.pitch), lolos = f.mutu.ok && sudutOk && !!f.embedding;
      run = lolos ? [...run, f] : [];
      onInfo?.({teks: !f.mutu.ok ? pesanMutu(f.mutu.alasan) : sudutOk ? "Tahan sebentar" : TEKS_ARAH[arah], mutuOk: f.mutu.ok, sudutOk, jumlah: run.length, perlu: konst.mutu.frameBerturut, sisa, ulang});
      if (run.length >= konst.mutu.frameBerturut) { const r = ringkas(konst, run); ok({vektor: r.vektor, mutu: r.mutu}); return true; }
      return false;
    });
    p.janji.then(() => { if (sinyal.batal) tolak(Object.assign(new Error("dibatalkan"), {batal: true})); }, tolak);
    sinyal.henti = () => { sinyal.batal = true; p.henti(); };
  });
}

/* Pindai wajah saat absen (ALGORITMA §3): (1) wajah depan lolos mutu `tantangan_frame_depan` frame, (2) tantangan dalam `tantangan_batas_detik`,
   (3) `frameBerturut` frame depan lolos -> vektor 3 terbaik. Tantangan gagal TIDAK menolak: tantangan_lolos=false, server menandai tinjau (D3).
   -> {vektor, skor_hidup, tantangan_lolos, versi_model, foto (kanvas mentah, belum berstempel)} */
export function pindaiAbsen({video, konst, tantangan, onInfo, sinyal = {}}) {
  return new Promise((ok, tolak) => {
    let tahap = "depan", sudahDepan = penghitung(konst.tantangan_frame_depan), tg = null, mulaiTg = 0, lolosTg = false, run = [], mulai = performance.now();
    const info = (teks, extra = {}) => onInfo?.({teks, tahap, ...extra});
    let selesai = null;
    muatAntispoof().catch(() => {});   // unduh model anti-palsu selagi wajah dipindai; galatnya ditangani saat skor dihitung
    const p = jalankan(video, konst, f => {
      if (sinyal.batal) return true;
      const depanOk = f.mutu.ok && sudutCocok(konst, "depan", f.yaw, f.pitch);
      if (tahap === "depan") {
        if (sisaDetik(mulai, performance.now(), konst.mutu.batasArahDetik) <= 0) { tolak(Object.assign(new Error("Wajah tidak terbaca. Coba lagi di tempat yang lebih terang."), {habis: true})); return true; }
        info(!f.mutu.ok ? pesanMutu(f.mutu.alasan) : depanOk ? "Tahan sebentar" : TEKS_ARAH.depan, {mutuOk: f.mutu.ok});
        if (sudahDepan.tambah(depanOk)) { tahap = "tantangan"; tg = buatTantangan(konst, tantangan); mulaiTg = performance.now(); }
        return false;
      }
      if (tahap === "tantangan") {
        const sisa = sisaDetik(mulaiTg, performance.now(), konst.tantangan_batas_detik);
        if (tg.langkah({mutuOk: f.mutu.ok, yaw: f.yaw, pitch: f.pitch, tutup: f.tutup})) lolosTg = true;
        if (lolosTg || sisa <= 0) { tahap = "ambil"; mulai = performance.now(); run = []; info(lolosTg ? "Bagus. Hadap lurus, tahan sebentar" : "Tantangan belum terbaca. Hadap lurus, tahan sebentar", {sisa}); return false; }
        info(tantanganTeks(tantangan, tg.tahap), {sisa});
        return false;
      }
      /* ambil */
      if (sisaDetik(mulai, performance.now(), konst.mutu.batasArahDetik) <= 0) { tolak(Object.assign(new Error("Wajah tidak terbaca. Coba lagi di tempat yang lebih terang."), {habis: true})); return true; }
      run = depanOk && f.embedding ? [...run, f] : [];
      info(!f.mutu.ok ? pesanMutu(f.mutu.alasan) : depanOk ? "Tahan sebentar" : TEKS_ARAH.depan, {jumlah: run.length, perlu: konst.mutu.frameBerturut});
      if (run.length >= konst.mutu.frameBerturut) {
        selesai = {r: ringkas(konst, run), tantangan_lolos: lolosTg, foto: salinFoto(video)};
        return true;
      }
      return false;
    }, {potong: true});
    p.janji.then(async () => {
      if (sinyal.batal) return tolak(Object.assign(new Error("dibatalkan"), {batal: true}));
      if (!selesai) return;
      info("Memeriksa keaslian wajah...", {memeriksa: true});
      video.srcObject?.getTracks().forEach(t => t.stop());   // kamera mati dulu: layar tidak membeku di bingkai terakhir saat inferensi
      await rafBerikut();
      const hidup = await skorHidupModel(selesai.r.terbaik);   // inferensi MiniFASNet setelah kamera selesai menangkap, bukan di tiap frame
      ok({vektor: selesai.r.vektor, skor_hidup: Math.round(hidup * 1000) / 1000, tantangan_lolos: selesai.tantangan_lolos, versi_model: VERSI_MODEL, foto: selesai.foto});
    }, tolak);
    sinyal.henti = () => { sinyal.batal = true; p.henti(); };
  });
}
const tantanganTeks = (jenis, tahap) => jenis === "kedip" ? "Kedipkan mata" : tahap === 0 ? (jenis === "toleh_kiri" ? "Toleh pelan ke kiri" : "Toleh pelan ke kanan") : "Sekarang hadap lurus lagi";
