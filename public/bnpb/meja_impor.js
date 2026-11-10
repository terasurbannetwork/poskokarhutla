/* Pembaca berkas .xlsx untuk impor data kejadian dan dampak di /meja (JK-20). Fungsi murni tanpa DOM dan tanpa pustaka:
   zip dibuka dengan DecompressionStream('deflate-raw') (peramban dan Node 18+), XML dibaca dengan ekspresi reguler (sharedStrings, sel inline, tanggal Excel).
   Dipakai public/bnpb/meja.js; diuji tests/bnpb/meja_impor.test.mjs. Kolom lembar = nama kolom spek (GET /api/meja/spek), baris kunci di bawah baris label.
   Aturan: sel kosong = belum didata (tidak dikirim), 0 = nihil/terjawab. Batas: zip biasa (bukan zip64), lembar pertama bernama "Data" atau lembar pertama. */

export const MAKS_BARIS = 50, MAKS_BYTE = 240 * 1024;   // batas POST /api/meja/impor: 50 baris dan 256 KB per kirim (disisakan ruang), 5 kirim per jam
const tidur = () => new Promise(r => setTimeout(r, 0)), NAPAS = 200;   // tiap 200 baris/butir beri napas ke antarmuka (INP)

/* ---------- zip ---------- */
const inflasi = async b => new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
export async function bacaZip(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf), d = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let e = -1; for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (d.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("Berkas bukan .xlsx yang sah (zip tidak terbaca).");
  const n = d.getUint16(e + 10, true), isi = new Map(); let o = d.getUint32(e + 16, true);
  for (let i = 0; i < n; i++) {
    if (d.getUint32(o, true) !== 0x02014b50) throw new Error("Daftar isi zip rusak.");
    const metode = d.getUint16(o + 10, true), cs = d.getUint32(o + 20, true), pn = d.getUint16(o + 28, true), px = d.getUint16(o + 30, true), pk = d.getUint16(o + 32, true), lok = d.getUint32(o + 42, true);
    const nama = new TextDecoder().decode(b.subarray(o + 46, o + 46 + pn)), mulai = lok + 30 + d.getUint16(lok + 26, true) + d.getUint16(lok + 28, true);
    isi.set(nama, async () => { const mentah = b.subarray(mulai, mulai + cs); return metode === 0 ? mentah : metode === 8 ? inflasi(mentah) : Promise.reject(new Error("Kompresi zip tidak didukung.")); });
    o += 46 + pn + px + pk;
  }
  return {ada: nama => isi.has(nama), teks: async nama => new TextDecoder().decode(await isi.get(nama)())};
}

/* ---------- XML ---------- */
const lepas = s => s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, k) => k[0] === "#" ? String.fromCodePoint(k[1] === "x" ? parseInt(k.slice(2), 16) : +k.slice(1)) : {amp: "&", lt: "<", gt: ">", quot: '"', apos: "'"}[k]);
const atribut = s => Object.fromEntries([...s.matchAll(/([\w:.-]+)="([^"]*)"/g)].map(m => [m[1], lepas(m[2])]));
const teksT = s => [...s.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g)].map(m => lepas(m[1] ?? "")).join("");
const kolomKe = ref => [...ref.replace(/\d+/g, "")].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;

/* lembar -> larik baris, tiap baris larik sel (string | number | boolean | undefined) */
export async function bacaXlsx(buf) {
  const z = await bacaZip(buf);
  if (!z.ada("xl/workbook.xml")) throw new Error("Berkas ini bukan buku kerja Excel (.xlsx).");
  const bersama = [];
  if (z.ada("xl/sharedStrings.xml")) for (const m of (await z.teks("xl/sharedStrings.xml")).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)) { bersama.push(teksT(m[1] ?? "")); if (bersama.length % NAPAS === 0) await tidur(); }
  const lembar = [...(await z.teks("xl/workbook.xml")).matchAll(/<sheet\b([^>]*)\/?>/g)].map(m => atribut(m[1])), rel = z.ada("xl/_rels/workbook.xml.rels") ? await z.teks("xl/_rels/workbook.xml.rels") : "";
  const target = Object.fromEntries([...rel.matchAll(/<Relationship\b([^>]*)\/?>/g)].map(m => atribut(m[1])).map(a => [a.Id, a.Target]));
  const pilih = lembar.find(s => s.name === "Data") || lembar[0], t = pilih && target[pilih["r:id"]];
  const jalur = t ? (t.startsWith("/") ? t.slice(1) : "xl/" + t) : "xl/worksheets/sheet1.xml";
  if (!z.ada(jalur)) throw new Error("Lembar data tidak ditemukan di berkas.");
  const xml = await z.teks(jalur), baris = [];
  let n = 0;
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const a = atribut(m[1]), isi = m[2] ?? "", v = isi.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
    if (!a.r) continue;
    let nilai;
    if (a.t === "s") nilai = bersama[+v]; else if (a.t === "inlineStr") nilai = teksT(isi); else if (a.t === "str" || a.t === "d") nilai = v == null ? undefined : lepas(v);
    else if (a.t === "b") nilai = v === "1"; else if (a.t === "e" || v == null || v === "") nilai = undefined; else nilai = Number(v);
    if (nilai === undefined || nilai === "") continue;
    const r = +a.r.replace(/\D/g, "") - 1; (baris[r] ||= [])[kolomKe(a.r)] = nilai;
    if (++n % 4000 === 0) await tidur();   // berkas besar: beri napas ke antarmuka
  }
  return Array.from(baris, r => r || []);
}

/* ---------- nilai sel -> nilai isian ---------- */
export const tanggalExcel = n => new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 864e5).toISOString().slice(0, 10);
const jamExcel = n => { const m = Math.round((n % 1) * 1440), j = String(Math.floor(m / 60) % 24).padStart(2, "0"); return `${j}:${String(m % 60).padStart(2, "0")}`; };
/* 1.234,5 / 1.234 (ribuan) / 1.5 (titik desimal) -> angka; yang tak terbaca dikembalikan apa adanya (string) */
export const angkaId = v => { const s = String(v).trim(), n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s); return Number.isNaN(n) || s === "" ? v : n; };
const sebutan = s => String(s).trim().toLowerCase().replace(/[\s-]+/g, "_");
const tglId = s => { const m = String(s).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/) || String(s).trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); if (!m) return null;
  const [y, mo, d] = m[1].length === 4 ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]], iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return new Date(iso).toISOString().slice(0, 10) === iso ? iso : null; };
const YA = new Set(["ya", "y", "1", "true", "x", "v", "iya"]), TIDAK = new Set(["tidak", "t", "0", "false", "no", "n"]);

/* kembalikan {nilai} (nilai undefined = lewati), atau {galat} */
export function ubahSel(k, v) {
  if (k.tipe === "angka") { const n = typeof v === "number" ? v : typeof v === "string" ? angkaId(v) : NaN; return typeof n === "number" && !Number.isNaN(n) ? {nilai: n} : {galat: `"${v}" bukan angka`}; }
  if (k.tipe === "ya") { const s = sebutan(v); return v === true || YA.has(s) ? {nilai: true} : v === false || TIDAK.has(s) ? {} : {galat: `"${v}" bukan ya atau tidak`}; }
  if (k.tipe === "tanggal") { const t = typeof v === "number" ? tanggalExcel(v) : tglId(v); return t ? {nilai: t} : {galat: `"${v}" bukan tanggal (pakai tttt-bb-hh atau hh/bb/tttt)`}; }
  if (k.tipe === "pilih") { const s = sebutan(v), p = k.nilai.find(o => o === s || sebutan(o.replace(/_/g, " ")) === s); return p ? {nilai: p} : {galat: `"${v}" bukan salah satu pilihan: ${k.nilai.join(", ")}`}; }
  if (k.tipe === "multi") { const l = String(v).split(/[,;]/).map(sebutan).filter(Boolean), p = l.map(s => k.nilai.find(o => o === s)); return p.includes(undefined) ? {galat: `pilihan tidak dikenal di "${v}"`} : {nilai: p}; }
  if (k.nama === "jam" && typeof v === "number" && v >= 0 && v < 1) return {nilai: jamExcel(v)};
  return {nilai: String(v).trim()};
}

/* rows (dari bacaXlsx) + kolom meja (spek) -> {baris:[{sumber, kec?, desa?, prov?, kab?, data}], galat:[{sumber, pesan}], dikenal, asing:[...], kosong}
   sumber = nomor baris di Excel, supaya galat bisa ditunjuk ke petugas. */
export async function barisDariLembar(rows, kolom, kemajuan = () => {}) {
  const peta = new Map(kolom.filter(k => !["gudang"].includes(k.tipe)).map(k => [k.nama, k])), TOP = new Set(["prov", "kab"]);
  const kunci = rows.findIndex((r, i) => i < 6 && r.filter(c => typeof c === "string" && (peta.has(c.trim().toLowerCase()) || TOP.has(c.trim().toLowerCase()))).length >= 3);
  if (kunci < 0) throw new Error("Baris kunci kolom tidak ditemukan. Pakai templat dari tombol Unduh templat tanpa mengubah baris kedua.");
  const kepala = rows[kunci].map(c => typeof c === "string" ? c.trim().toLowerCase() : ""), kolomAda = kepala.map(c => c && (peta.has(c) || TOP.has(c)));
  const asing = kepala.filter((c, i) => c && !kolomAda[i]);
  const baris = [], galat = []; let kosong = 0;
  for (let i = kunci + 1; i < rows.length; i++) {
    if ((i - kunci) % NAPAS === 0) { kemajuan(i - kunci, rows.length - kunci - 1); await tidur(); }
    const r = rows[i] || [], ada = r.some(c => c !== undefined && c !== "" && !(typeof c === "string" && !c.trim()));
    if (!ada) { kosong++; continue; }
    const o = {sumber: i + 1, data: {}}, sal = [];
    kepala.forEach((nama, j) => {
      const v = r[j]; if (!kolomAda[j] || v === undefined || (typeof v === "string" && !v.trim())) return;
      const k = peta.get(nama);
      if (TOP.has(nama)) { o[nama] = String(v).trim(); return; }
      if (k.tipe === "wilayah") { o[nama] = String(v).trim(); return; }
      const h = ubahSel(k, v); if (h.galat) sal.push(`${k.label}: ${h.galat}`); else if (h.nilai !== undefined) o.data[nama] = h.nilai;
    });
    if (sal.length) galat.push({sumber: o.sumber, pesan: sal.slice(0, 3).join("; ") + (sal.length > 3 ? `; dan ${sal.length - 3} lainnya` : "")}); else baris.push(o);
  }
  return {baris, galat, dikenal: kolomAda.filter(Boolean).length, asing, kosong};
}

/* pecah per MAKS_BARIS baris DAN per MAKS_BYTE ukuran JSON (baris {kec, desa, data} seperti yang dikirim); beri napas tiap 200 baris */
export async function potong(a, n = MAKS_BARIS, maks = MAKS_BYTE) {
  const out = [], enc = new TextEncoder(); let cur = [], ukuran = 2, i = 0;
  for (const x of a) {
    if (++i % NAPAS === 0) await tidur();
    const u = enc.encode(JSON.stringify(x)).length + 1;
    if (cur.length && (cur.length >= n || ukuran + u > maks)) { out.push(cur); cur = []; ukuran = 2; }
    cur.push(x); ukuran += u;
  }
  if (cur.length) out.push(cur);
  return out;
}
