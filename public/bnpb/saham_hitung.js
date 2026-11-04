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
  buy: "beli", sell: "jual", value: "nilai", frequency: "frekuensi", waktu: "waktu", harga: "harga", sisi: "sisi", tanggal: "tanggal", nilai: "nilai", jenis: "jenis", bayar: "tanggal bayar", yield: "yield",
  kode: "kode", nama: "nama", bursa: "bursa", sektor: "sektor", sub_sektor: "subsektor", jenis: "jenis", sebelumnya: "tutup sebelumnya (Rp)", rata_rata: "rata-rata (Rp)",
  bid_harga: "bid (Rp)", bid_volume: "volume bid (lembar)", offer_harga: "offer (Rp)", offer_volume: "volume offer (lembar)", status_pasar: "status pasar", diperbarui: "diperbarui", papan: "papan"};
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
  ["Perubahan", ["change", "perubahan"], v => tanda(v, x => rupiah(x, 2))], ["Perubahan (%)", ["perubahan_persen", "change_percent", "percent_change", "pct_change"], v => tanda(v, x => persen(x))],
  ["Volume", ["volume", "vol"], v => angka(v, 0) + " lembar"]];
export function ringkasInfo(data) {
  const o = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const lc = {}; for (const k of Object.keys(o)) lc[k.toLowerCase()] = o[k];
  const sorot = [], dipakai = new Set();
  for (const [nama, ks, f] of SOROT) {
    const k = ks.find(x => lc[x] != null && typeof lc[x] !== "object");
    if (k) { dipakai.add(k); sorot.push({nama, nilai: num(lc[k]) !== null ? f(num(lc[k])) : String(lc[k])}); }
  }
  for (const k of ["change", "perubahan", "perubahan_persen", "change_percent", "percent_change", "pct_change", "volume", "vol", "last", "last_price", "price", "close", "harga"]) dipakai.add(k);   // sudah disorot atau duplikat sorotan
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

/* ---------- analisa konsesi x saham (fungsi murni) ---------- */
const HARI = 864e5;
const waktuMs = v => { if (typeof v === "number") return v < 1e11 ? v * 1000 : v; const t = Date.parse(v); return Number.isNaN(t) ? null : t; };
/* ms epoch -> tanggal Senin (WIB) minggu itu, "YYYY-MM-DD" */
export function seninWib(ms) { const d = new Date(ms + 7 * 36e5); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (d.getUTCDay() + 6) % 7)).toISOString().slice(0, 10); }
const geserMinggu = (m, n) => new Date(Date.parse(m) + n * 7 * HARI).toISOString().slice(0, 10);

/* deret [{t, harga|close|v}] -> penutupan terakhir tiap minggu ISO (Senin WIB): [{minggu, harga}] menaik; masukan buruk -> [] */
export function hargaMingguan(deret) {
  if (!Array.isArray(deret)) return [];
  const per = new Map();
  deret.map(e => { const t = e ? waktuMs(e.t) : null, v = e && typeof e === "object" ? pilih(e, ["harga", "close", "v", "price"]) : null; return t === null || v === null ? null : {t, v}; })
    .filter(Boolean).sort((a, b) => a.t - b.t).forEach(({t, v}) => per.set(seninWib(t), v));
  return [...per].map(([minggu, harga]) => ({minggu, harga}));
}

const rata = a => a.reduce((s, x) => s + x, 0) / a.length;
/* peringkat dengan rata-rata untuk seri */
function peringkat(a) {
  const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; }
  return r;
}
/* korelasi Spearman; null bila n < 3 atau salah satu sisi tanpa ragam */
export function spearman(x, y) {
  if (x.length !== y.length || x.length < 3) return null;
  const a = peringkat(x), b = peringkat(y), ma = rata(a), mb = rata(b);
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa === 0 || sbb === 0 ? null : sab / Math.sqrt(saa * sbb);
}
/* persentil dengan interpolasi linear, p 0..1 */
export function persentil(a, p) {
  if (!a.length) return null; const s = [...a].sort((x, y) => x - y), i = (s.length - 1) * p, lo = Math.floor(i);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo);
}
/* titik mingguan [{minggu, titik}] -> deret rapat Senin ke Senin (minggu kosong = 0); minggu ganda dijumlah */
export function rapatkanTitik(mingguan) {
  const per = new Map();
  for (const e of Array.isArray(mingguan) ? mingguan : []) { const t = e ? waktuMs(e.minggu) : null, v = e ? num(e.titik) : null; if (t !== null && v !== null) { const m = seninWib(t); per.set(m, (per.get(m) || 0) + v); } }
  if (!per.size) return [];
  const ms = [...per.keys()].sort(), out = [];
  for (let m = ms[0]; m <= ms.at(-1); m = geserMinggu(m, 1)) out.push({minggu: m, titik: per.get(m) || 0});
  return out;
}
/* titik dan harga mingguan digabung per minggu untuk grafik dua sumbu: [{minggu, titik, harga|null}] */
export function gabungMingguan(mingguan, harga) {
  const hm = new Map((harga || []).map(x => [x.minggu, x.harga]));
  return rapatkanTitik(mingguan).map(x => ({...x, harga: hm.get(x.minggu) ?? null}));
}

export const KALIMAT_WAJIB = "Keterkaitan, bukan sebab; titik panas di konsesi bukan bukti pelanggaran.";
const tp = x => (x > 0 ? "+" : "") + angka(x, 1) + "%";
const tpp = x => tp(x).replace("%", " poin persen");
const MIN_N = 8, MIN_KORELASI = 20;

/* analisa: korelasi titik minggu t vs return minggu t+1 dan studi peristiwa minggu lonjakan (titik >= persentil 80 dan > 0).
   Minggu pertama dan terakhir deret titik (parsial) dibuang; pembanding hanya minggu di jendela titik, minggu lonjakan dikeluarkan dari dasar. */
export function analisa(mingguan, harga) {
  const titik = rapatkanTitik(mingguan).slice(1, -1), hm = new Map((harga || []).map(x => [x.minggu, x.harga]));
  const ret = (m, k) => { const a = hm.get(m), b = hm.get(geserMinggu(m, k)); return a > 0 && b != null ? (b / a - 1) * 100 : null; };
  const punyaHarga = hm.size >= 2;
  const xs = [], ys = [];
  for (const {minggu, titik: v} of titik) { const r = ret(minggu, 1); if (r !== null) { xs.push(v); ys.push(r); } }
  const n = xs.length, rho = spearman(xs, ys);
  const ambang = persentil(titik.map(x => x.titik), 0.8);
  const lonjak = ambang === null ? [] : titik.filter(x => x.titik >= ambang && x.titik > 0).map(x => x.minggu);
  const jLonjak = new Set(lonjak), dasarMinggu = titik.map(x => x.minggu).filter(m => !jLonjak.has(m));
  const dasarDari = k => dasarMinggu.map(m => ret(m, k)).filter(r => r !== null);
  const sesudah = k => lonjak.map(m => ret(m, k)).filter(r => r !== null);
  const per = (r, d) => r.length && d.length ? {n: r.length, rata: rata(r), dasar: rata(d), selisih: rata(r) - rata(d)} : null;
  const peristiwa = {n: lonjak.length, ambang, minggu: lonjak, h1: per(sesudah(1), dasarDari(1)), h4: per(sesudah(4), dasarDari(4))};

  const narasi = [];
  if (!punyaHarga) narasi.push("Harga saham belum tersedia, jadi keterkaitan dengan titik panas belum bisa dihitung. Bagian titik panas tetap lengkap.");
  else {
    if (rho === null) narasi.push(`Korelasi tidak bisa dihitung (n = ${n} minggu berpasangan, atau salah satu deret tidak bervariasi).`);
    else if (n < MIN_KORELASI) narasi.push(`Korelasi Spearman ${angka(rho, 2)} dari n = ${n} minggu berpasangan: sampel terlalu kecil untuk disimpulkan.`);
    else {
      const a = Math.abs(rho), kuat = a < 0.1 ? "hampir tidak ada hubungan" : `hubungan ${a < 0.3 ? "lemah" : a < 0.5 ? "sedang" : "kuat"} ${rho > 0 ? "searah" : "berlawanan arah"}`;
      narasi.push(`Korelasi Spearman antara titik minggu ini dan return saham minggu berikutnya ${angka(rho, 2)} (n = ${n} minggu): ${kuat}; belum diuji signifikansi.`);
    }
    if (peristiwa.n < MIN_N) narasi.push(`Hanya ${peristiwa.n} minggu lonjakan: sampel terlalu kecil untuk disimpulkan.`);
    else if (!peristiwa.h1) narasi.push(`Ada ${peristiwa.n} minggu lonjakan, tetapi harga sesudahnya belum cukup.`);
    else {
      const h = peristiwa.h1, h4 = peristiwa.h4;
      narasi.push(`Pada ${peristiwa.n} minggu lonjakan (minggu dengan titik di atas persentil 80 dan > 0), return rata-rata 1 minggu sesudahnya ${tp(h.rata)} dibanding ${tp(h.dasar)} untuk minggu lain di jendela yang sama (selisih kasar ${tpp(h.selisih)})` +
        (h4 ? `; 4 minggu sesudahnya ${tp(h4.rata)} dibanding ${tp(h4.dasar)} (selisih ${tpp(h4.selisih)}).` : "."));
    }
    narasi.push("Ambang dihitung dari seluruh deret 2026 (ex-post), minggu pertama dan terakhir yang parsial dibuang. Return mentah, belum disesuaikan IHSG atau musim; minggu lonjakan berurutan tumpang tindih. Selisih belum diuji signifikansi.");
  }
  narasi.push(KALIMAT_WAJIB);
  return {n, rho, peristiwa, narasi, punyaHarga};
}

/* /info -> {harga, persen} (angka atau null), nama kunci bervariasi */
export function hargaInfo(data) {
  const o = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  return {harga: pilih(o, ["harga", "last", "last_price", "price", "close"]), persen: pilih(o, ["perubahan_persen", "change_percent", "percent_change", "pct_change"])};
}
export const persenTanda = v => v == null ? "–" : tp(v);
export const adaDiIdx = bursa => /jakarta|idx/i.test(bursa || "");
