/* MiniFASNet lewat onnxruntime-web (MIT) build WASM tanpa threads: tidak butuh COOP/COEP. Semua dari aset sendiri (/petugas/vendor, /petugas/model), tanpa CDN.
   Butuh CSP script-src 'wasm-unsafe-eval'. Dimuat lazy saat pindai absen; galat muat/jalan = skor 0 (server menandai tinjau), bukan menggagalkan absen. */
import {SISI_ANTISPOOF as S, MODEL_ANTISPOOF, kotakPotong, keTensorBgr, skorAsli, rataHidup} from "./antispoof_murni.js";

let ort = null, sesi = null;
/* pra-muat sekali saat idle, kecuali Hemat Data / jaringan 2g. SW menyimpan vendor + model cache-first saat pertama diambil (sw.js BERAT), jadi
   tidak ada precache paksa 14 MB saat install: HP yang tak pernah absen tidak membayarnya. */
export function praMuatAntispoof() {
  const c = navigator.connection; if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return;
  (window.requestIdleCallback || (f => setTimeout(f, 2000)))(() => { muatAntispoof().catch(() => {}); });
}
/* muat dengan batas waktu: lewat batas = galat, skor jatuh ke 0 dan server menandai tinjau */
export const muatAntispoofBatas = (ms = 15000) => Promise.race([muatAntispoof(), new Promise((_, tolak) => setTimeout(() => tolak(new Error("antispoof lambat")), ms))]);
export function muatAntispoof() {
  return sesi ??= (async () => {
    ort = await import("/petugas/vendor/ort.wasm.min.mjs");
    ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false; ort.env.wasm.wasmPaths = "/petugas/vendor/";
    return Promise.all(MODEL_ANTISPOOF.map(async m => ort.InferenceSession.create(new Uint8Array(await (await fetch("/petugas/model/" + m.berkas)).arrayBuffer()), {executionProviders: ["wasm"], graphOptimizationLevel: "all"})));
  })().catch(e => { sesi = null; throw e; });
}

let kanvasPotong = null;
/* potongan wajah satu frame untuk tiap model: tensor BGR 80 x 80. kanvas = gambar deteksi, kotak = [x, y, w, h] pada kanvas itu. Murah (drawImage + getImageData); inferensi menyusul untuk 3 frame terbaik saja. */
export function potongWajah(kanvas, kotak) {
  kanvasPotong ??= Object.assign(document.createElement("canvas"), {width: S, height: S});
  const ctx = kanvasPotong.getContext("2d", {willReadFrequently: true}); ctx.imageSmoothingQuality = "high";
  const hasil = [];
  for (const m of MODEL_ANTISPOOF) {
    const b = kotakPotong(kanvas.width, kanvas.height, kotak, m.skala); if (!b) return null;
    ctx.drawImage(kanvas, b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1, 0, 0, S, S);
    hasil.push(keTensorBgr(ctx.getImageData(0, 0, S, S).data, S));
  }
  return hasil;
}

/* frame[] (tiap frame punya .potong dari potongWajah) -> skor hidup rata-rata 0..1. Galat apa pun = 0. */
export async function skorHidupModel(frame) {
  try {
    const ss = await muatAntispoofBatas(), skor = [];
    for (const f of frame) {
      if (!f.potong) continue;
      await new Promise(r => setTimeout(r));   // beri jeda: tugas panjang dipecah per frame supaya input/paint sempat jalan
      const logit = await Promise.all(ss.map(async (s, i) => Array.from((await s.run({input: new ort.Tensor("float32", f.potong[i], [1, 3, S, S])})).logit.data)));
      skor.push(skorAsli(logit));
    }
    return rataHidup(skor);
  } catch (e) { return 0; }
}
