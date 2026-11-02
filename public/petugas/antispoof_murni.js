/* Fungsi murni anti-palsu MiniFASNet (minivision-ai/Silent-Face-Anti-Spoofing, Apache-2.0): potongan wajah, tensor, softmax rata-rata.
   Meniru aslinya: CropImage._get_new_box, ToTensor tanpa pembagian 255 (masukan BGR 0..255), softmax tiap model dijumlah, kelas 1 = asli, dibagi jumlah model.
   Angka di sini sifat bobot model (skala potong, sisi masukan), bukan kebijakan; ambang keputusan tetap di server. */

export const SISI_ANTISPOOF = 80;
export const MODEL_ANTISPOOF = [{berkas: "2.7_80x80_MiniFASNetV2.onnx", skala: 2.7}, {berkas: "4_0_0_80x80_MiniFASNetV1SE.onnx", skala: 4}];
export const KELAS_ASLI = 1;

/* kotak wajah [x, y, w, h] pada gambar sumber lebar x tinggi -> {x0, y0, x1, y1} bulat, INKLUSIF (piksel x1/y1 ikut), persis _get_new_box. null bila kotak tak sah */
export function kotakPotong(srcW, srcH, [x, y, w, h], skala) {
  if (!(w > 0 && h > 0 && srcW > 1 && srcH > 1)) return null;
  const k = Math.min((srcH - 1) / h, Math.min((srcW - 1) / w, skala)), lebar = w * k, tinggi = h * k, cx = w / 2 + x, cy = h / 2 + y;
  let x0 = cx - lebar / 2, y0 = cy - tinggi / 2, x1 = cx + lebar / 2, y1 = cy + tinggi / 2;
  if (x0 < 0) { x1 -= x0; x0 = 0; }
  if (y0 < 0) { y1 -= y0; y0 = 0; }
  if (x1 > srcW - 1) { x0 -= x1 - srcW + 1; x1 = srcW - 1; }
  if (y1 > srcH - 1) { y0 -= y1 - srcH + 1; y1 = srcH - 1; }
  return {x0: Math.trunc(x0), y0: Math.trunc(y0), x1: Math.trunc(x1), y1: Math.trunc(y1)};
}

/* RGBA (ImageData.data, sisi x sisi) -> Float32Array CHW urutan BGR, nilai 0..255 apa adanya */
export function keTensorBgr(rgba, sisi = SISI_ANTISPOOF) {
  const n = sisi * sisi, t = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) { t[i] = rgba[i * 4 + 2]; t[n + i] = rgba[i * 4 + 1]; t[2 * n + i] = rgba[i * 4]; }
  return t;
}

/* logit -> peluang, stabil terhadap nilai besar */
export function softmax(logit) {
  const m = Math.max(...logit), e = Array.from(logit, v => Math.exp(v - m)), j = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / j);
}

/* logit tiap model (satu frame) -> skor asli 0..1 = rata-rata softmax kelas asli (aslinya: jumlah softmax / 2) */
export function skorAsli(logitPerModel) {
  if (!logitPerModel.length) return NaN;
  return logitPerModel.reduce((a, l) => a + softmax(l)[KELAS_ASLI], 0) / logitPerModel.length;
}

/* skor per frame -> rata-rata frame yang terbaca; tak ada yang terbaca = 0 (server menandai tinjau) */
export function rataHidup(skor) {
  const ada = skor.filter(Number.isFinite);
  return ada.length ? ada.reduce((a, b) => a + b, 0) / ada.length : 0;
}
