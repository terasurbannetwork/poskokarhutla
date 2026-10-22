/* Bantuan bersama uji Lapor Warga: membaca migrasi apa adanya dan memecahnya per pernyataan (trigger BEGIN…END utuh). */
import {readFileSync, readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

export const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const migrasi = () => readdirSync(path.join(AKAR, "migrations")).filter(f => f.endsWith(".sql")).sort()
  .map(f => readFileSync(path.join(AKAR, "migrations", f), "utf8")).join("\n");

export function pecah(sql) {
  const out = []; let buf = [];
  for (const baris of sql.split("\n")) {
    const t = baris.trim();
    if (!t || t.startsWith("--")) continue;
    buf.push(baris);
    const s = buf.join("\n").trim();
    if (/^CREATE TRIGGER/i.test(s) ? /\bEND;$/i.test(t) : t.endsWith(";")) { out.push(s); buf = []; }
  }
  if (buf.length) throw new Error(`migrasi berakhir tanpa ';': ${buf.join(" ").slice(0, 80)}`);
  return out;
}

/* Berkas media sah minimal (lolos src/media_bersih.js, byte-nya tidak berubah saat dibersihkan) dan badan multipart ber-Content-Length (server mewajibkannya, seperti peramban). */
export const JPEG_SAH = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 1, 0, 1, 1, 1, 0x11, 0, 0xff, 0xda, 0, 8, 1, 1, 0, 0, 0x3f, 0, ...Array(2000).fill(7), 0xff, 0xd9]);
export const WEBP_SAH = (() => { const t = s => [...s].map(c => c.charCodeAt(0)), isi = Array(500).fill(1), n = 4 + 8 + isi.length;
  return new Uint8Array([...t("RIFF"), n & 255, n >> 8 & 255, 0, 0, ...t("WEBP"), ...t("VP8 "), isi.length & 255, isi.length >> 8 & 255, 0, 0, ...isi]); })();
export async function badanPanjang(form, tambah = {}) {
  const r0 = new Response(form), body = new Uint8Array(await r0.arrayBuffer());
  return {body, headers: {"content-type": r0.headers.get("content-type"), "content-length": String(body.length), ...tambah}};
}
