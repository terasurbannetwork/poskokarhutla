/* foto_kecil.js: kecilkan foto di peramban sebelum diunggah (sisi panjang ≤ 1280 px, JPEG, ≤ maks byte).
   Dipakai tab Peralatan dan Korban di /instansi serta /admin/korban. null = foto tidak terbaca atau tetap terlalu besar. */
window.fotoKecil = async (file, maks = 1.4 * 1048576) => {
  if (!file) return null;
  try {
    const bmp = await createImageBitmap(file), s = Math.min(1, 1280 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    for (const q of [0.72, 0.55, 0.4]) { const b = await new Promise(r => c.toBlob(r, "image/jpeg", q)); if (b && b.size <= maks) return b; }
  } catch (e) { /* jatuh ke berkas asli di bawah */ }
  return file.size <= maks && file.type === "image/jpeg" ? file : null;
};
