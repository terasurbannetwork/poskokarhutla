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
