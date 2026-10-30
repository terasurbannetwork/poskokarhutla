/* Saringan pilihan bencana multi-pilih (OR): murni fungsi, dipakai layar /direktori dan diuji di tests/agen. */
(function (akar) {
  const ALIAS = {wabah: "kesehatan bencana"};
  const kunciRumpun = k => ALIAS[k] || k;
  /* butir cocok bila himpunan pilihan kosong, atau punya salah satu rumpun terpilih */
  function cocokBencana(pilihan, rumpun) {
    const p = [...(pilihan || [])].map(kunciRumpun); if (!p.length) return true;
    const r = new Set(Array.isArray(rumpun) ? rumpun : rumpun instanceof Set ? [...rumpun] : []);
    return p.some(k => r.has(k));
  }
  /* "gempa,banjir" atau "gempa" (URL lama) -> himpunan kunci yang sah, tanpa duplikat */
  function bacaBencana(teks, sah) { const s = new Set(sah || []); return [...new Set(String(teks || "").split(",").map(t => t.trim()).filter(t => t && (!sah || s.has(t))))]; }
  function tulisBencana(pilihan) { return [...(pilihan || [])].join(","); }
  akar.cocokBencana = cocokBencana; akar.bacaBencana = bacaBencana; akar.tulisBencana = tulisBencana;
})(typeof window !== "undefined" ? window : globalThis);
