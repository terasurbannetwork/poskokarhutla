/* fabdem.mjs: tinggi tanah dari FABDEM V1-2 (Hawker dkk. 2022, Universitas Bristol; Copernicus GLO-30 yang pohon dan bangunannya dibuang),
   1 detik busur (~30 m), Float32, nodata -9999. Lisensi CC BY-NC-SA 4.0: hanya untuk uji dan kajian non-komersial, tidak disajikan di layar publik.

   Sumber hanya berupa zip 10x10 derajat (~700 MB) berisi GeoTIFF 1x1 derajat yang DISIMPAN tanpa kompresi zip, jadi tiap GeoTIFF adalah
   rentang byte di dalam zip. Modul ini membaca daftar isi zip, kepala TIFF, dan hanya ubin internal 256x256 yang diperlukan, lewat permintaan
   Range. Semua yang diunduh disimpan di data/raw/banjir/fabdem (tidak di-commit), jadi panggilan ulang tidak mengunduh lagi.

   Pakai: const t = await bukaFabdem(); t.tinggi(lon, lat) -> meter | NaN (laut atau di luar data). Muat dulu: await t.muat(bbox). */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const AKAR = new URL("../../", import.meta.url).pathname;
const SIMPAN = path.join(AKAR, "data/raw/banjir/fabdem");
const DASAR = "https://data.bris.ac.uk/datasets/s5hqmjcdj8yo2ibzi9b4ew3sn/";
const salah = m => { throw new Error("fabdem: " + m); };

const huruf = (v, ns, n) => (v < 0 ? ns[0] : ns[1]) + String(Math.abs(v)).padStart(n, "0");
/* nama zip 10x10 dan anggota 1x1 untuk ubin bersudut barat daya (la, lo) */
export function namaZip(la, lo) {
  const a = Math.floor(la / 10) * 10, b = Math.floor(lo / 10) * 10;
  return `${huruf(a, "SN", 2)}${huruf(b, "WE", 3)}-${huruf(a + 10, "SN", 2)}${huruf(b + 10, "WE", 3)}_FABDEM_V1-2.zip`;
}
export const namaAnggota = (la, lo) => `${huruf(la, "SN", 2)}${huruf(lo, "WE", 3)}_FABDEM_V1-2.tif`;

/* predictor 2 libtiff untuk sampel 32 bit: beda horizontal dijumlah ulang per baris sebagai bilangan bulat tak bertanda */
export function bukaPrediktor(buf, lebar) {
  const w = new Uint32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  for (let r = 0; r < w.length / lebar; r++) for (let i = 1; i < lebar; i++) w[r * lebar + i] = (w[r * lebar + i] + w[r * lebar + i - 1]) >>> 0;
  return new Float32Array(w.buffer, w.byteOffset, w.length);
}

async function rentang(url, a, b) {
  for (let coba = 0; ; coba++) {
    try { const r = await fetch(url, {headers: {Range: `bytes=${a}-${b}`}, signal: AbortSignal.timeout(60000)});
      (r.status === 206) || salah(`HTTP ${r.status} untuk ${url}`); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (coba >= 3) throw e; await new Promise(s => setTimeout(s, 2000 * (coba + 1))); }
  }
}
function simpanJSON(nama, f) {
  const p = path.join(SIMPAN, nama); if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  return f().then(v => { fs.mkdirSync(SIMPAN, {recursive: true}); fs.writeFileSync(p, JSON.stringify(v)); return v; });
}

/* daftar isi zip: {anggota: offset kepala lokal}; null bila zip tidak ada (laut lepas) */
async function daftarZip(zip) {
  return simpanJSON(zip + ".json", async () => {
    const h = await fetch(DASAR + zip, {method: "HEAD"}); if (h.status === 404) return null; (h.ok) || salah(`HEAD ${h.status} ${zip}`);
    const n = +h.headers.get("content-length"), t = await rentang(DASAR + zip, n - 70000, n - 1);
    const e = t.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); (e >= 0) || salah("akhir zip tidak ditemukan");
    let cnt = t.readUInt16LE(e + 10), cdSize = t.readUInt32LE(e + 12), cdOff = t.readUInt32LE(e + 16);
    const e64 = t.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x06]));
    if (e64 >= 0) { cnt = Number(t.readBigUInt64LE(e64 + 32)); cdSize = Number(t.readBigUInt64LE(e64 + 40)); cdOff = Number(t.readBigUInt64LE(e64 + 48)); }
    const cd = await rentang(DASAR + zip, cdOff, cdOff + cdSize - 1), isi = {};
    for (let i = 0, o = 0; i < cnt; i++) {
      const metode = cd.readUInt16LE(o + 10), nl = cd.readUInt16LE(o + 28), xl = cd.readUInt16LE(o + 30), cl = cd.readUInt16LE(o + 32);
      let lo = cd.readUInt32LE(o + 42); const nama = cd.toString("utf8", o + 46, o + 46 + nl);
      if (lo === 0xffffffff) { /* ZIP64: offset ada di medan ekstra 0x0001 */
        for (let x = o + 46 + nl; x < o + 46 + nl + xl;) { const id = cd.readUInt16LE(x), sz = cd.readUInt16LE(x + 2);
          if (id === 1) { let p = x + 4; if (cd.readUInt32LE(o + 24) === 0xffffffff) p += 8; if (cd.readUInt32LE(o + 20) === 0xffffffff) p += 8; lo = Number(cd.readBigUInt64LE(p)); } x += 4 + sz; } }
      if (metode === 0) isi[nama] = lo; o += 46 + nl + xl + cl;
    }
    return {n, isi};
  });
}

/* kepala GeoTIFF anggota: awal data, ukuran, ubin, offset dan panjang tiap ubin, titik ikat */
async function kepala(la, lo) {
  const zip = namaZip(la, lo), nama = namaAnggota(la, lo);
  return simpanJSON(nama + ".json", async () => {
    const d = await daftarZip(zip); if (!d || d.isi[nama] == null) return null;
    const lh = await rentang(DASAR + zip, d.isi[nama], d.isi[nama] + 29), awal = d.isi[nama] + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28);
    const b = await rentang(DASAR + zip, awal, awal + 65535);
    (b.toString("ascii", 0, 2) === "II" && b.readUInt16LE(2) === 42) || salah(`${nama} bukan TIFF klasik little-endian`);
    const ifd = b.readUInt32LE(4), n = b.readUInt16LE(ifd), tag = {};
    for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12, t = b.readUInt16LE(e), typ = b.readUInt16LE(e + 2), c = b.readUInt32LE(e + 4);
      const lebar = {3: 2, 4: 4, 12: 8}[typ] || 1, nilai = c * lebar <= 4 ? e + 8 : b.readUInt32LE(e + 8);
      tag[t] = typ === 3 ? Array.from({length: c}, (_, k) => b.readUInt16LE(nilai + k * 2)) : typ === 4 ? Array.from({length: c}, (_, k) => b.readUInt32LE(nilai + k * 4))
        : typ === 12 ? Array.from({length: c}, (_, k) => b.readDoubleLE(nilai + k * 8)) : b.toString("ascii", nilai, nilai + c).replace(/\0+$/, ""); }
    (tag[258][0] === 32 && tag[339][0] === 3 && tag[259][0] === 8 && tag[317][0] === 2 && tag[322] && tag[324])
      || salah(`${nama}: hanya Float32 berubin, deflate, predictor 2 yang didukung`);
    return {zip, awal, w: tag[256][0], h: tag[257][0], tw: tag[322][0], th: tag[323][0], off: tag[324], len: tag[325],
      skala: tag[33550].slice(0, 2), ikat: tag[33922].slice(3, 5), nodata: +tag[42113]};
  });
}

/* ubin internal (Float32Array tw*th), disimpan mentah setelah dibuka */
async function ubinDalam(la, lo, H, i) {
  const p = path.join(SIMPAN, `${namaAnggota(la, lo)}.${i}.f32`);
  if (fs.existsSync(p)) { const b = fs.readFileSync(p); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); }
  const raw = zlib.inflateSync(await rentang(DASAR + H.zip, H.awal + H.off[i], H.awal + H.off[i] + H.len[i] - 1));
  const f = bukaPrediktor(raw, H.tw); fs.writeFileSync(p, Buffer.from(f.buffer, f.byteOffset, f.byteLength)); return f;
}

export async function bukaFabdem() {
  const KEPALA = new Map(), UBIN = new Map();
  /* pastikan semua ubin internal yang memotong bbox [lon0, lat0, lon1, lat1] (plus 1 piksel) termuat */
  async function muat([x0, y0, x1, y1]) {
    for (let la = Math.floor(y0); la <= Math.floor(y1); la++) for (let lo = Math.floor(x0); lo <= Math.floor(x1); lo++) {
      const k = `${la},${lo}`; if (!KEPALA.has(k)) KEPALA.set(k, await kepala(la, lo)); const H = KEPALA.get(k); if (!H) continue;
      const kol = x => Math.max(0, Math.min(H.w - 1, Math.floor((x - H.ikat[0]) / H.skala[0]))), bar = y => Math.max(0, Math.min(H.h - 1, Math.floor((H.ikat[1] - y) / H.skala[1])));
      const per = Math.ceil(H.w / H.tw);
      const c0 = Math.floor(kol(x0 - H.skala[0]) / H.tw), c1 = Math.floor(kol(x1 + H.skala[0]) / H.tw), r0 = Math.floor(bar(y1 + H.skala[1]) / H.th), r1 = Math.floor(bar(y0 - H.skala[1]) / H.th);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = r * per + c, ku = `${k},${i}`; if (!UBIN.has(ku)) UBIN.set(ku, await ubinDalam(la, lo, H, i)); }
    }
  }
  /* nilai satu piksel (kolom/baris global per derajat), NaN bila tidak termuat atau nodata */
  function piksel(lon, lat) {
    const la = Math.floor(lat), lo = Math.floor(lon), H = KEPALA.get(`${la},${lo}`); if (!H) return NaN;
    const c = Math.floor((lon - H.ikat[0]) / H.skala[0]), r = Math.floor((H.ikat[1] - lat) / H.skala[1]);
    if (c < 0 || r < 0 || c >= H.w || r >= H.h) return NaN;
    const u = UBIN.get(`${la},${lo},${Math.floor(r / H.th) * Math.ceil(H.w / H.tw) + Math.floor(c / H.tw)}`); if (!u) return NaN;
    const v = u[(r % H.th) * H.tw + (c % H.tw)]; return v === H.nodata || !Number.isFinite(v) ? NaN : v;
  }
  /* bilinear antar pusat piksel; satu tetangga nodata = NaN (tepi pantai jatuh ke DEM cadangan) */
  function tinggi(lon, lat) {
    const s = 1 / 3600, x = lon / s - .5, y = lat / s - .5, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const v = (i, j) => piksel((i + .5) * s, (j + .5) * s);
    return (v(xi, yi) * (1 - fx) + v(xi + 1, yi) * fx) * (1 - fy) + (v(xi, yi + 1) * (1 - fx) + v(xi + 1, yi + 1) * fx) * fy;
  }
  return {muat, tinggi};
}

if (process.argv[2] === "uji") {
  const ok = (c, m) => { if (!c) throw new Error("GAGAL: " + m); };
  ok(namaZip(-7.5, 107.2) === "S10E100-N00E110_FABDEM_V1-2.zip", namaZip(-7.5, 107.2));
  ok(namaZip(3, 98) === "N00E090-N10E100_FABDEM_V1-2.zip", namaZip(3, 98));
  ok(namaZip(-1, 140) === "S10E140-N00E150_FABDEM_V1-2.zip", namaZip(-1, 140));
  ok(namaAnggota(-8, 107) === "S08E107_FABDEM_V1-2.tif" && namaAnggota(0, 100) === "N00E100_FABDEM_V1-2.tif", "nama anggota");
  /* predictor: [1.5, 2.5] dan [-3, 7] per baris, dibedakan sebagai uint32 */
  const asli = new Float32Array([1.5, 2.5, -3, 7]), u = new Uint32Array(asli.buffer.slice(0)), d = new Uint32Array(4);
  for (let r = 0; r < 2; r++) { d[r * 2] = u[r * 2]; d[r * 2 + 1] = (u[r * 2 + 1] - u[r * 2]) >>> 0; }
  ok(String([...bukaPrediktor(Buffer.from(d.buffer), 2)]) === "1.5,2.5,-3,7", "predictor 2");
  console.log("fabdem: uji lulus");
}
