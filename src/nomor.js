/* Satu-satunya penormal nomor WhatsApp Indonesia (KP-02, D11). Terima 0812.., +62 812.., 62812.., 812.. dengan spasi, strip, titik, kurung, garis miring, garis bawah, koma;
   keluaran "628…" (8-13 digit setelah 62, lolos CHECK wa GLOB '62[0-9]*'); null bila tak sah. Pemanggil yang butuh kontrak lain membungkusnya di tempat. */
export function normalWA(s) {
  const m = String(s ?? "").replace(/[\s\-().\/_,]/g, "").match(/^(?:\+?62|0)?(8\d{7,12})$/);
  return m ? "62" + m[1] : null;
}
