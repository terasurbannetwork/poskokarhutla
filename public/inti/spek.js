/* Spek formulir bersama (Keterpaduan KP-16; data/kajian-bnpb/keterpaduan/ALGORITMA.md bagian 3, KEPUTUSAN D7 D8).
   SATU validator, satu penggambar form, satu daftar kolom templat Excel. ES module tanpa impor dan tanpa DOM di tingkat atas:
   Worker mengimpornya langsung (`import {periksa} from "../public/inti/spek.js"`, pola src/sippa.js memuat public/pipa/formulir.js;
   wrangler membundelnya) dan peramban memuatnya lewat <script type="module">. Spek lama tetap jalan lewat adapter dariMeja / dariPipa / dariKolom.

   Spek = {kolom: [medan], cek?: (isi, opsi) => galat[], cekSelalu?, bersih?: teks => pesan, bebas?}.
   Medan = {nama, label, tipe, wajib, min, maks, pilihan, satuan, bantu, tampil_jika, rupiah} (+ desimal, pola, tautan, json, panjang_tepat, minEksklusif, ketat).
   Tipe: teks, panjang (teks banyak baris), angka, bulat, tanggal, jam, pilihan, ganda, koordinat ({lat, lon}), foto (id atau larik id), plus ya (boolean).
   Hasil periksa: {ok, galat: [{nama, pesan}], data}. Galat lintas medan (cek) bernama "" kecuali cek menyebut namanya. */

const KONTROL = /[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;
const HARI = 864e5, JAM_WIB = 7 * 36e5;
const wib = t => new Date(t + JAM_WIB).toISOString().slice(0, 10);
const ada = v => v !== undefined && v !== null;
const objek = v => v && typeof v === "object" && !Array.isArray(v);
const tglSah = t => /^\d{4}-[01]\d-[0-3]\d$/.test(t) && new Date(t + "T00:00:00Z").toISOString().slice(0, 10) === t;
const urlOK = s => { try { const u = new URL(s); return (u.protocol === "http:" || u.protocol === "https:") && !u.username && !u.password && !/\s/.test(s); } catch (e) { return false; } };
const id = n => Number(n).toLocaleString("id-ID");

/* ---------- rupiah (murni, dipakai penggambar dan uji) ---------- */
export const formatRupiah = n => n == null || n === "" || !Number.isFinite(Number(n)) ? "" : "Rp " + id(Math.round(Number(n)));
export const uraiRupiah = s => { const d = String(s ?? "").replace(/[^\d]/g, ""); return d ? Number(d) : null; };

/* ---------- tampil_jika: fungsi(isi), {nama, dalam:[..]} atau {bila:[nama..]} (tampil bila salah satu > 0) ---------- */
export function tampil(c, isi) {
  const t = c.tampil_jika; if (!t) return true;
  if (typeof t === "function") return !!t(isi || {});
  if (Array.isArray(t.bila)) return t.bila.some(n => Number(isi?.[n]) > 0);
  return t.dalam.includes(isi?.[t.nama]);
}

/* ---------- satu medan: {v} sah (nilai ternormalkan) atau {g} pesan ---------- */
function satu(c, v, o) {
  const L = c.label, kosong = c.ketat ? v == null : v == null || v === "";
  if (kosong) return c.wajib ? {g: `${L} wajib diisi`} : {};
  switch (c.tipe) {
    case "teks": case "panjang": {
      if (typeof v !== "string") return {g: `${L}: harus berupa teks`};
      const s = c.ketat ? v : v.normalize("NFC").replace(KONTROL, "").trim();
      if (!c.ketat && !s) return {g: `${L}: tidak boleh kosong`};
      if (c.json) { try { JSON.parse(s); } catch (e) { return {g: `${L}: bukan JSON yang sah`}; } }
      if (c.panjang_tepat && !c.panjang_tepat.includes(s.length)) return {g: `${L}: panjang harus ${c.panjang_tepat.map(id).join(" atau ")} karakter`};
      if (c.min != null && s.length < c.min) return {g: `${L}: minimal ${id(c.min)} karakter`};
      if (c.maks != null && s.length > c.maks) return {g: `${L}: maksimal ${id(c.maks)} karakter`};
      if (c.tautan && !urlOK(s)) return {g: `${L}: tautan http atau https yang sah`};
      if (c.pola && !new RegExp(c.pola).test(s)) return {g: `${L}: format tidak sah`};
      const b = c.bersih && o.bersih ? o.bersih(s) : ""; if (b) return {g: `${L}: ${b}`};
      return {v: s};
    }
    case "angka": case "bulat": {
      let n = v;
      if (c.ketat) { if (typeof v !== "number" || !Number.isFinite(v)) return {g: `${L}: harus berupa angka`}; }
      else { n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN; if (!Number.isFinite(n)) return {g: `${L}: harus berupa angka`}; }
      if (c.tipe === "bulat" && !Number.isInteger(n)) return {g: `${L}: harus bilangan bulat`};
      if (c.min != null && (c.minEksklusif ? n <= c.min : n < c.min)) return {g: `${L}: ${c.maks != null ? `antara ${id(c.min)} dan ${id(c.maks)}` : `minimal ${id(c.min)}`}`};
      if (c.maks != null && n > c.maks) return {g: `${L}: antara ${id(c.min ?? 0)} dan ${id(c.maks)}`};
      if (c.desimal) { const p = 10 ** (typeof c.desimal === "number" ? c.desimal : 2); n = Math.round(n * p) / p; }
      return {v: n};
    }
    case "tanggal": {
      const maks = c.maks === "hariini" ? wib(o.kini + HARI) : c.maks ?? "2100-12-31", min = c.min ?? "2000-01-01";
      return typeof v === "string" && tglSah(v) && v >= min && v <= maks ? {v} : {g: `${L}: tanggal YYYY-MM-DD antara ${min} dan ${maks}`};
    }
    case "jam": return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? {v} : {g: `${L}: jam:menit 24 jam, contoh 14:30`};
    case "pilihan": return c.pilihan.includes(v) ? {v} : {g: `${L}: harus salah satu dari ${c.pilihan.map(String).join(", ")}`};
    case "ganda": return Array.isArray(v) && v.length <= c.pilihan.length && v.every(x => c.pilihan.includes(x)) && new Set(v).size === v.length ? {v} : {g: `${L}: pilihan tidak sah`};
    case "ya": return typeof v === "boolean" ? {v} : {g: `${L}: harus ya atau tidak`};
    case "koordinat": {
      const lat = Number(v?.lat), lon = Number(v?.lon);
      return objek(v) && v.lat != null && v.lon != null && Number.isFinite(lat) && Number.isFinite(lon) && lat >= -11.5 && lat <= 6.5 && lon >= 94.5 && lon <= 141.5 ? {v: {lat, lon}} : {g: `${L}: koordinat di wilayah Indonesia (lintang -11,5 sampai 6,5; bujur 94,5 sampai 141,5)`};
    }
    case "foto": {
      const a = Array.isArray(v) ? v : [v];
      return a.length <= (c.maks ?? 5) && a.every(x => typeof x === "string" && x && x.length <= 300) ? {v} : {g: `${L}: foto tidak sah atau lebih dari ${c.maks ?? 5}`};
    }
  }
  return {g: `${L}: tipe tidak dikenal`};
}

/* ---------- validator: sama di Worker dan peramban ---------- */
export function periksa(spek, isi, opsi = {}) {
  const o = {kini: opsi.kini ?? Date.now(), bersih: spek.bersih}, galat = [], data = {};
  if (!objek(isi)) return {ok: false, galat: [{nama: "", pesan: "isi harus berupa objek"}], data};
  const ke = (nama, pesan) => { if (!galat.some(g => g.nama === nama)) galat.push({nama, pesan}); };
  const nama = new Set(spek.kolom.map(c => c.nama));
  if (!spek.bebas) for (const k of Object.keys(isi)) if (!nama.has(k)) ke(k, `kolom "${k.slice(0, 40)}" tidak dikenal`);
  for (const c of spek.kolom) { const r = satu(c, isi[c.nama], o); if (r.g) ke(c.nama, r.g); else if (r.v !== undefined) data[c.nama] = r.v; }
  if (spek.cek && (!galat.length || spek.cekSelalu)) for (const g of spek.cek({...opsi.lama, ...(spek.cekSelalu ? isi : data)}, o) || []) ke(g.nama ?? "", g.pesan ?? String(g));
  return {ok: !galat.length, galat, data};
}

/* ---------- templat Excel: hanya kolom, penulisan berkas urusan src/xlsx_mini.js ---------- */
export const templatKolom = spek => spek.kolom.map(c => ({
  kunci: c.nama, judul: c.satuan ? `${c.label} (${c.satuan})` : c.label, jenis: c.rupiah || c.tipe === "angka" || c.tipe === "bulat" ? "angka" : c.tipe === "tanggal" ? "tanggal" : "teks",
  wajib: !!c.wajib, pilihan: c.pilihan ?? null, bantu: c.bantu ?? "",
}));

/* ---------- adapter: spek lama ke baru ---------- */
export function dariMeja(M, {tahap = null, bersih} = {}) {
  const kolom = M.kolom.filter(c => (c.tahap ?? null) === tahap && c.tipe !== "wilayah").map(c => {
    const b = {nama: c.nama, label: c.label, wajib: !!c.wajib};
    if (c.bila) b.tampil_jika = {bila: c.bila};
    if (c.rupiah) b.rupiah = true;
    switch (c.tipe) {
      case "teks": return {...b, tipe: "teks", maks: c.maks ?? 120, bersih: !!c.bersih};
      case "angka": return {...b, tipe: c.desimal ? "angka" : "bulat", min: c.min ?? 0, maks: c.maks ?? 1e9, desimal: c.desimal};
      case "pilih": return {...b, tipe: "pilihan", pilihan: c.nilai};
      case "multi": return {...b, tipe: "ganda", pilihan: c.nilai};
      case "ya": return {...b, tipe: "ya"};
      case "tanggal": return {...b, tipe: "tanggal", min: c.min, maks: c.maks};
      case "tautan": return {...b, tipe: "teks", tautan: true, maks: 300};
      case "gudang": return {...b, tipe: "teks", pola: "^[0-9a-f]{16}$", maks: 16};
    }
    return {...b, tipe: "tidak_dikenal"};
  });
  return {kolom, bersih, cek: d => { const g = M.cek?.(d); return g ? [{nama: "", pesan: g}] : []; }};
}
/* MEDAN[jenis] dari public/pipa/formulir.js (objek nama -> medan). cek lintas medan (urutan waktu dll) diberikan pemanggil; jalan walau ada galat medan dan melihat isi mentah, seperti cekButir. */
export function dariPipa(def, cek) {
  const kolom = Object.values(def).map(m => {
    const b = {nama: m.nama, label: m.label, wajib: !!m.wajib, ketat: true, min: m.min, maks: m.maks, minEksklusif: m.minEksklusif};
    if (m.panjang) b.panjang_tepat = m.panjang;
    if (m.tipe === "pilihan") return {...b, tipe: "pilihan", pilihan: m.pilihan};
    if (m.tipe === "bool") return {...b, tipe: "pilihan", pilihan: m.pilihan};
    if (m.tipe === "json") return {...b, tipe: "teks", json: true};
    if (m.tipe === "angka") return {...b, tipe: "angka"};
    return {...b, tipe: m.tipe === "teks" ? "teks" : "bulat"};   // bulat dan waktu (detik epoch) sama-sama bilangan bulat
  });
  return {kolom, cek, cekSelalu: true};
}
/* bentuk KOLOM {k, label, tipe, wajib, maks, bantu} (pendataan, uji pilot); tipe lain lewat apa adanya */
export const dariKolom = (daftar, cek) => ({kolom: daftar.map(({k, ...r}) => ({nama: k, ...r})), cek});

/* ---------- penggambar form ---------- */
const sebarang = (d, tag, kelas, teks) => { const e = d.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
/* Peta dependensi tampil_jika: nama medan pemicu -> medan yang perlu dihitung ulang. Syarat berupa fungsi tidak bisa dibaca, jadi masuk `fungsi` (dihitung ulang tiap perubahan). */
export function petaDependensi(spek) {
  const peta = new Map(), fungsi = [];
  for (const c of spek.kolom) { const t = c.tampil_jika; if (!t) continue;
    if (typeof t === "function") fungsi.push(c.nama);
    else for (const n of t.bila ?? [t.nama]) { if (!peta.has(n)) peta.set(n, new Set()); peta.get(n).add(c.nama); } }
  return {peta, fungsi};
}
const kosongNilai = x => x === "" || x == null || (Array.isArray(x) && !x.length);
let nomor = 0;
/* gambar(spek, el, isiAwal, {onUbah}) mengisi el dengan form; mengembalikan {isi(), periksa(), set(nama, nilai)}. Pilihan, tanggal, jam pakai kontrol native.
   onUbah(isi, nama) dipanggil SINKRON di dalam penangan input: harus ringan; kerja berat didebounce pemanggil. Galat sebuah medan hilang saat nilainya berubah dan dihitung ulang (hanya medan itu) saat blur. */
export function gambar(spek, el, isiAwal = {}, {onUbah} = {}) {
  const d = el.ownerDocument, isi = {...isiAwal}, baris = new Map(), pesan = new Map(), tulisKe = new Map(), pre = "sp" + ++nomor + "-", dep = petaDependensi(spek), byNama = new Map(spek.kolom.map(c => [c.nama, c]));
  const segar = nama => {
    const sasar = nama == null ? spek.kolom.map(c => c.nama) : [...(dep.peta.get(nama) ?? []), ...dep.fungsi];
    for (const n of sasar) { const sembunyi = !tampil(byNama.get(n), isi), w = baris.get(n); if (w.hidden !== sembunyi) w.hidden = sembunyi; }
  };
  const galatKe = (nama, teks) => { pesan.get(nama).textContent = teks || ""; };
  const ubah = (nama, nilai, dariKode) => {
    if (kosongNilai(nilai)) delete isi[nama]; else isi[nama] = nilai;
    if (dariKode) tulisKe.get(nama)(isi[nama]);
    galatKe(nama); segar(nama); onUbah?.({...isi}, nama);
  };
  const blur = nama => { const c = byNama.get(nama), r = periksa({kolom: [c], bebas: true, bersih: spek.bersih}, nama in isi ? {[nama]: isi[nama]} : {}); galatKe(nama, r.galat[0]?.pesan); };
  el.textContent = ""; el.classList.add("sp-form");
  for (const c of spek.kolom) {
    const w = sebarang(d, "div", "sp-baris"), idc = pre + c.nama, nilai = isi[c.nama];
    const lab = sebarang(d, "label", "sp-label", c.label + (c.wajib ? " *" : "")); lab.htmlFor = idc;
    let k;
    if (c.tipe === "pilihan") {
      k = sebarang(d, "select", "sp-kontrol"); k.append(sebarang(d, "option", null, "Pilih")); k.firstChild.value = "";
      for (const p of c.pilihan) { const op = sebarang(d, "option", null, String(p).replaceAll("_", " ")); op.value = String(p); k.append(op); }
      tulisKe.set(c.nama, x => { k.value = x == null ? "" : String(x); });
      k.onchange = () => ubah(c.nama, k.value === "" ? "" : c.pilihan.find(p => String(p) === k.value));
    } else if (c.tipe === "ganda") {
      k = sebarang(d, "div", "sp-ganda"); k.setAttribute("role", "group"); k.setAttribute("aria-labelledby", idc + "-l"); lab.id = idc + "-l"; lab.removeAttribute("for");
      const cbs = c.pilihan.map(p => { const l = sebarang(d, "label", "sp-cek"), cb = sebarang(d, "input"); cb.type = "checkbox";
        cb.onchange = () => ubah(c.nama, c.pilihan.filter((_, n) => cbs[n].checked)); l.append(cb, sebarang(d, "span", null, String(p).replaceAll("_", " "))); k.append(l); return cb; });
      tulisKe.set(c.nama, x => cbs.forEach((cb, n) => { cb.checked = (x || []).includes(c.pilihan[n]); }));
    } else if (c.tipe === "ya") {
      k = sebarang(d, "input"); k.type = "checkbox"; tulisKe.set(c.nama, x => { k.checked = x === true; }); k.onchange = () => ubah(c.nama, k.checked);
    } else {
      const banyak = c.tipe === "panjang"; k = sebarang(d, banyak ? "textarea" : "input", "sp-kontrol");
      if (!banyak) k.type = c.tipe === "tanggal" ? "date" : c.tipe === "jam" ? "time" : "text";
      if (c.tipe === "angka" || c.tipe === "bulat" || c.rupiah) k.inputMode = c.tipe === "bulat" || c.rupiah ? "numeric" : "decimal";
      if (c.tipe === "koordinat") k.placeholder = "lintang, bujur";
      const tulis = x => c.rupiah ? formatRupiah(x) : x == null ? "" : c.tipe === "koordinat" ? `${x.lat}, ${x.lon}` : Array.isArray(x) ? x.join(", ") : String(x);
      tulisKe.set(c.nama, x => { k.value = tulis(x); });
      k.oninput = () => { const t = k.value.trim(); ubah(c.nama, c.rupiah ? uraiRupiah(t) : c.tipe === "angka" || c.tipe === "bulat" ? (t === "" ? "" : Number(t.replace(",", "."))) : c.tipe === "koordinat" ? (t === "" ? "" : (([a, b]) => ({lat: a, lon: b}))(t.split(/[,;\s]+/).map(Number))) : c.tipe === "foto" ? t.split(/[,\s]+/).filter(Boolean) : t); };
      if (c.rupiah) k.addEventListener("blur", () => { k.value = tulis(isi[c.nama]); });
    }
    if (c.tipe !== "ganda") k.id = idc;
    k.addEventListener("focusout", () => blur(c.nama));
    tulisKe.get(c.nama)(nilai);
    k.setAttribute("aria-describedby", (c.bantu ? idc + "-b " : "") + idc + "-g");
    const dalam = sebarang(d, "div", "sp-isi"); dalam.append(k); if (c.satuan) dalam.append(sebarang(d, "span", "sp-satuan", c.satuan));
    const g = sebarang(d, "div", "sp-galat"); g.id = idc + "-g"; g.setAttribute("role", "alert"); pesan.set(c.nama, g);
    w.append(lab, dalam); if (c.bantu) { const b = sebarang(d, "div", "sp-bantu", c.bantu); b.id = idc + "-b"; w.append(b); } w.append(g);
    baris.set(c.nama, w); el.append(w);
  }
  segar(null);
  return {
    isi: () => ({...isi}),
    set: (nama, nilai) => ubah(nama, nilai, true),
    periksa: () => { const r = periksa(spek, isi); for (const n of pesan.keys()) galatKe(n, r.galat.find(x => x.nama === n)?.pesan); return r; },
  };
}
