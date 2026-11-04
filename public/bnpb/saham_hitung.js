/* Fungsi murni halaman /bnpb/saham: format angka Indonesia, pemetaan galat ke pesan, pengurai payload penyedia yang bentuknya belum pasti.
   Tanpa DOM supaya bisa diuji node (tests/bnpb/saham_hitung.test.mjs). */
export const BELUM = "Akses data ini belum dibuka penyedia (Stellar Data).";

/* 1234567.891 -> "1.234.567,89"; bukan angka -> "–" */
export function angka(v, desimal = 2) {
  const x = typeof v === "string" ? Number(v.replace(/,/g, "")) : v;
  if (v == null || v === "" || typeof x !== "number" || !Number.isFinite(x)) return "–";
  const [b, d = ""] = Math.abs(x).toFixed(desimal).split(".");
  const ribu = b.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (x < 0 && Number(Math.abs(x).toFixed(desimal)) !== 0 ? "-" : "") + ribu + (d ? "," + d : "");
}
export const persen = (v, d = 2) => v == null || v === "" || !Number.isFinite(Number(v)) ? "–" : angka(v, d) + "%";

export const rupiah = (v, d = 0) => { const a = angka(v, d); return a === "–" ? a : "Rp " + a; };
const tanda = (v, f) => { const a = f(v); return a !== "–" && Number(v) > 0 ? "+" + a : a; };
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
/* "2026-11-19" atau "2026-11-19T09:30:00Z" -> "19 Nov 2026"; bukan tanggal ISO -> apa adanya */
export function tglId(t) { const m = /^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d))?/.exec(String(t ?? "")); return m ? `${Number(m[3])} ${BLN[Number(m[2]) - 1]} ${m[1]}` : String(t ?? "–"); }
/* peta label Indonesia; kunci tak dikenal tampil apa adanya (garis bawah jadi spasi) */
export const LABEL = {name: "nama", symbol: "kode", exchange: "bursa", sector: "sektor", industry: "industri", currency: "mata uang", country: "negara", market_cap: "kapitalisasi pasar",
  open: "buka", high: "tertinggi", low: "terendah", close: "tutup", previous_close: "tutup sebelumnya", time: "waktu", date: "tanggal", price: "harga", last: "harga", volume: "volume", lot: "lot", side: "sisi", action: "sisi",
  buy: "beli", sell: "jual", value: "nilai", frequency: "frekuensi", waktu: "waktu", harga: "harga", sisi: "sisi", tanggal: "tanggal", nilai: "nilai", jenis: "jenis", bayar: "tanggal bayar", yield: "yield"};
export const label = k => LABEL[String(k).toLowerCase()] || String(k).replace(/_/g, " ");
const KOLOM_RUPIAH = /^(price|last|harga|open|high|low|close|value|nilai)$/i;

/* label awal dan akhir sumbu grafik dari deret ({t ms epoch}); null bila t hanya indeks */
export function labelSkala(d) {
  if (!d || d.length < 2 || d[0].t < 1e11) return null;
  const f = t => { const x = new Date(t + 7 * 36e5).toISOString(); return d.at(-1).t - d[0].t <= 2 * 864e5 ? x.slice(11, 16) + " WIB" : tglId(x); };
  return [f(d[0].t), f(d.at(-1).t)];
}

/* balasan API ({ok:false,kode,pesan} atau galat jaringan) -> {jenis:"belum"|"salah"|"jaringan", pesan} */
export function petaGalat(j, status) {
  if (!j || (status === 0 && !j.kode)) return {jenis: "jaringan", pesan: "Tidak ada sinyal. Coba lagi sebentar."};
  if (j.kode === "akses_belum_dibuka") return {jenis: "belum", pesan: BELUM};
  if (j.kode === "masukan_salah") return {jenis: "salah", pesan: j.pesan || "Masukan tidak valid."};
  if (j.kode === "penyedia_galat") return {jenis: "salah", pesan: "Penyedia data sedang bermasalah. " + (j.pesan || "Coba lagi nanti.")};
  if (status === 401 || status === 403) return {jenis: "salah", pesan: "Halaman ini hanya untuk staf. Masuk dulu dengan akun staf."};
  return {jenis: "salah", pesan: j.pesan || `Gagal memuat (${status}).`};
}

const KUNCI_NILAI = ["price", "close", "last", "harga", "value", "c", "y", "p"];
const KUNCI_WAKTU = ["time", "date", "t", "x", "tanggal", "timestamp", "datetime", "ts"];
const num = v => { const x = typeof v === "string" ? Number(v.replace(/,/g, "")) : v; return typeof x === "number" && Number.isFinite(x) ? x : null; };
const pilih = (o, ks) => { for (const k of ks) if (o[k] != null && num(o[k]) !== null) return num(o[k]); return null; };
const waktuKe = v => {
  if (typeof v === "number") return v < 1e11 ? v * 1000 : v;
  const t = Date.parse(v); return Number.isNaN(t) ? null : t;
};

/* cari larik pertama (sampai kedalaman 4) yang terbaca sebagai deret harga: [angka..], [[t,v]..], atau [{time,price}..] -> [{t,v}] atau null */
export function uraiDeret(data, dalam = 0) {
  if (data == null || dalam > 4) return null;
  if (Array.isArray(data)) {
    if (data.length >= 2) {
      const baris = data.map((e, i) => {
        if (num(e) !== null) return {t: i, v: num(e)};
        if (Array.isArray(e) && e.length >= 2 && num(e[1]) !== null) return {t: waktuKe(e[0]) ?? i, v: num(e[1])};
        if (e && typeof e === "object" && !Array.isArray(e)) {
          const v = pilih(e, KUNCI_NILAI); if (v === null) return null;
          const kw = KUNCI_WAKTU.find(k => e[k] != null); return {t: kw ? waktuKe(e[kw]) ?? i : i, v};
        }
        return null;
      });
      if (baris.every(Boolean)) return baris;
    }
    for (const e of data) { const r = uraiDeret(e, dalam + 1); if (r) return r; }
    return null;
  }
  if (typeof data === "object") for (const k of Object.keys(data)) { const r = uraiDeret(data[k], dalam + 1); if (r) return r; }
  return null;
}

/* titik SVG "x,y x,y" dalam kotak lebar x tinggi; null bila kurang dari 2 titik */
export function titikGaris(deret, lebar = 640, tinggi = 200, pad = 8) {
  if (!deret || deret.length < 2) return null;
  const ts = deret.map(d => d.t), vs = deret.map(d => d.v);
  const t0 = Math.min(...ts), t1 = Math.max(...ts), v0 = Math.min(...vs), v1 = Math.max(...vs);
  const dt = t1 - t0 || 1, dv = v1 - v0 || 1;
  return deret.map(d => `${(pad + (d.t - t0) / dt * (lebar - 2 * pad)).toFixed(1)},${(tinggi - pad - (d.v - v0) / dv * (tinggi - 2 * pad)).toFixed(1)}`).join(" ");
}

/* info: ambil harga/perubahan/volume bila ada (nama kunci bervariasi), sisanya jadi daftar bidang skalar berlabel Indonesia */
const SOROT = [["Harga terakhir", ["last", "last_price", "price", "close", "harga"], v => rupiah(v)],
  ["Perubahan", ["change", "perubahan"], v => tanda(v, x => rupiah(x, 2))], ["Perubahan (%)", ["change_percent", "percent_change", "pct_change"], v => tanda(v, x => persen(x))],
  ["Volume", ["volume", "vol"], v => angka(v, 0) + " lembar"]];
export function ringkasInfo(data) {
  const o = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const lc = {}; for (const k of Object.keys(o)) lc[k.toLowerCase()] = o[k];
  const sorot = [], dipakai = new Set();
  for (const [nama, ks, f] of SOROT) {
    const k = ks.find(x => lc[x] != null && typeof lc[x] !== "object");
    if (k) { dipakai.add(k); sorot.push({nama, nilai: num(lc[k]) !== null ? f(num(lc[k])) : String(lc[k])}); }
  }
  for (const k of ["change", "perubahan", "change_percent", "percent_change", "pct_change", "volume", "vol", "last", "last_price", "price", "close", "harga"]) dipakai.add(k);   // sudah disorot atau duplikat sorotan
  const lain = Object.keys(o).filter(k => !dipakai.has(k.toLowerCase()) && o[k] != null && typeof o[k] !== "object")
    .map(k => ({nama: label(k), nilai: typeof o[k] === "number" ? angka(o[k], Number.isInteger(o[k]) ? 0 : 2) : tglId(o[k])}));
  return {sorot, lain};
}

/* transaksi: larik objek pertama di payload -> {kolom, baris} maksimal 50 baris; null bila bentuk tak dikenal */
export function uraiTabel(data, maks = 50, dalam = 0) {
  if (data == null || dalam > 4) return null;
  if (Array.isArray(data)) {
    if (data.length && data.every(e => e && typeof e === "object" && !Array.isArray(e))) {
      const kolom = [...new Set(data.slice(0, maks).flatMap(e => Object.keys(e).filter(k => typeof e[k] !== "object" || e[k] == null)))].slice(0, 8);
      if (kolom.length) return {kolom: kolom.map(k => KOLOM_RUPIAH.test(k) ? label(k) + " (Rp)" : label(k)), baris: data.slice(0, maks).map(e => kolom.map(k => e[k] == null ? "–" : typeof e[k] === "number" ? angka(e[k], Number.isInteger(e[k]) ? 0 : 2) : tglId(e[k])))};
    }
    for (const e of data) { const r = uraiTabel(e, maks, dalam + 1); if (r) return r; }
    return null;
  }
  if (typeof data === "object") for (const k of Object.keys(data)) { const r = uraiTabel(data[k], maks, dalam + 1); if (r) return r; }
  return null;
}
