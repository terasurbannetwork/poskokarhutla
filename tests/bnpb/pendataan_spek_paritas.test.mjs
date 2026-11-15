/* KP-18a: paritas validator lama (salinan beku dari HEAD sebelum KP-18) dan periksaIsian baru yang memakai public/inti/spek.js. Bandingkan ok dan isi bersih; pesan boleh beda teks. */
import test from "node:test";
import assert from "node:assert/strict";
import {KOLOM, LAINNYA, periksaIsian as baru} from "../../public/bnpb/pendataan_spek.js";

/* teks bersih: NFC, tanpa karakter kontrol dan bidi, spasi dirapikan (baris baru dipertahankan di tipe panjang) */
const KONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁩﻿]/g;
const bersih = (v, panjang) => { const s = String(v).normalize("NFC").replace(KONTROL, ""); return (panjang ? s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ")).trim(); };
const kosong = v => v == null || v === "" || (Array.isArray(v) && !v.length);
const maksDari = c => c.maks ?? (c.tipe === "panjang" ? 2000 : 200);

function berlaku(c, o) {
  if (!c.syarat) return true;
  const v = o[c.syarat.k], vs = Array.isArray(v) ? v : kosong(v) ? [] : [v];
  if (!vs.length) return false;
  if (c.syarat.sama) return vs.some(x => c.syarat.sama.includes(x));
  return vs.some(x => !c.syarat.bukan.includes(x));
}

/* murni: (jenis, isian mentah, kirim) -> {isi} bersih atau {galat}. kirim=false (draf): kolom wajib boleh kosong, bentuk tetap diperiksa. */
function lama(jenis, mentah, kirim = false) {
  const kolom = KOLOM[jenis]; if (!kolom) return {galat: "jenis isian tidak dikenal"};
  if (!mentah || typeof mentah !== "object" || Array.isArray(mentah)) return {galat: "isian harus objek"};
  const dikenal = new Set(kolom.flatMap(c => c.opsi ? [c.k, c.k + "_lain"] : [c.k]));
  for (const k of Object.keys(mentah)) if (!dikenal.has(k)) return {galat: `kolom tidak dikenal: ${String(k).slice(0, 40)}`};
  const isi = {};
  for (const c of kolom) {
    let v = mentah[c.k];
    if (typeof v === "string") v = bersih(v, c.tipe === "panjang");
    if (Array.isArray(v)) v = v.map(x => typeof x === "string" ? bersih(x) : x);
    if (kosong(v)) continue;
    if (c.tipe === "teks" || c.tipe === "panjang") {
      if (typeof v !== "string") return {galat: `${c.label} harus teks`};
      if (v.length > maksDari(c)) return {galat: `${c.label} maksimal ${maksDari(c)} huruf`};
    } else if (c.tipe === "pilih") {
      if (typeof v !== "string" || !(c.opsi.includes(v) || v === LAINNYA)) return {galat: `${c.label}: pilihan tidak dikenal`};
    } else if (c.tipe === "banyak") {
      if (!Array.isArray(v) || v.length > c.opsi.length + 1 || new Set(v).size !== v.length || !v.every(x => typeof x === "string" && (c.opsi.includes(x) || x === LAINNYA))) return {galat: `${c.label}: pilihan tidak dikenal`};
    } else if (c.tipe === "angka") {
      if (typeof v === "string" && /^\d{1,6}$/.test(v)) v = Number(v);
      if (!Number.isInteger(v) || v < c.min || v > c.maks) return {galat: `${c.label} harus angka ${c.min} sampai ${c.maks}`};
    } else if (c.tipe === "jam") {
      if (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return {galat: `${c.label} harus jam JJ:MM`};
    } else if (c.tipe === "url") {
      if (typeof v !== "string" || v.length > maksDari(c) || !/^https?:\/\/[^\s<>"]+$/i.test(v) || !URL.canParse(v)) return {galat: `${c.label} harus alamat web yang diawali http:// atau https://`};
    }
    isi[c.k] = v;
    if (c.opsi && (v === LAINNYA || (Array.isArray(v) && v.includes(LAINNYA)))) {
      const l = typeof mentah[c.k + "_lain"] === "string" ? bersih(mentah[c.k + "_lain"]) : "";
      if (l.length > 200) return {galat: `${c.label} (Lainnya) maksimal 200 huruf`};
      if (l) isi[c.k + "_lain"] = l;
    }
  }
  for (const c of kolom) if (!berlaku(c, isi)) { delete isi[c.k]; delete isi[c.k + "_lain"]; }
  if (kirim) for (const c of kolom) {
    if (!berlaku(c, isi)) continue;
    if (c.wajib && kosong(isi[c.k])) return {galat: `${c.label} wajib diisi`};
    const v = isi[c.k];
    if (c.opsi && (v === LAINNYA || (Array.isArray(v) && v.includes(LAINNYA))) && !isi[c.k + "_lain"]) return {galat: `${c.label}: tulis isian Lainnya`};
  }
  return {isi};
}


/* contoh dibangkitkan dari KOLOM: tiap kolom diberi nilai sah, nilai rusak, dan dikosongkan; tiap jenis, draf dan kirim */
const sah = c => ({teks: "Contoh  teks", panjang: "Baris satu\n\n\n\nbaris dua", pilih: c.opsi?.[0], banyak: c.opsi?.slice(0, 2), angka: c.min, jam: "07:30", url: "https://contoh.go.id/x"})[c.tipe];
const rusak = c => ({teks: 5, panjang: "x".repeat(2001), pilih: "tak ada", banyak: ["tak ada"], angka: "12.5", jam: "25:00", url: "ftp://x"})[c.tipe];
const mulaiPenuh = jenis => Object.fromEntries(KOLOM[jenis].map(c => [c.k, sah(c)]));
test("periksaIsian baru setara yang lama atas contoh dari KOLOM", () => {
  let n = 0, tolak = 0;
  const cocok = (jenis, o, kirim) => { const a = lama(jenis, o, kirim), b = baru(jenis, o, kirim); n++; if (a.galat) tolak++;
    assert.equal(!!b.galat, !!a.galat, `${jenis} kirim=${kirim} ${JSON.stringify(o).slice(0, 120)} lama=${a.galat} baru=${b.galat}`); if (!a.galat) assert.deepEqual(b.isi, a.isi); };
  for (const jenis of Object.keys(KOLOM)) for (const kirim of [false, true]) {
    const dasar = mulaiPenuh(jenis);
    cocok(jenis, {}, kirim); cocok(jenis, dasar, kirim); cocok(jenis, {...dasar, kolom_liar: 1}, kirim);
    for (const c of KOLOM[jenis]) {
      cocok(jenis, {...dasar, [c.k]: rusak(c)}, kirim); cocok(jenis, {...dasar, [c.k]: ""}, kirim); cocok(jenis, {...dasar, [c.k]: null}, kirim);
      if (c.opsi) {
        const l = c.tipe === "banyak" ? [LAINNYA] : LAINNYA;
        cocok(jenis, {...dasar, [c.k]: l}, kirim); cocok(jenis, {...dasar, [c.k]: l, [c.k + "_lain"]: "isian manual"}, kirim);
        cocok(jenis, {...dasar, [c.k + "_lain"]: "tanpa Lainnya"}, kirim); cocok(jenis, {...dasar, [c.k]: l, [c.k + "_lain"]: "x".repeat(201)}, kirim);
      }
      if (c.syarat) for (const nilai of [c.syarat.sama?.[0] ?? c.syarat.bukan[0], c.syarat.bukan ? "lain" : "lain"]) cocok(jenis, {...dasar, [c.syarat.k]: nilai === "lain" ? undefined : (KOLOM[jenis].find(x => x.k === c.syarat.k).tipe === "banyak" ? [nilai] : nilai), [c.k]: undefined}, kirim);
    }
  }
  for (const o of ["x", null, [], 5]) cocok("data", o, true);
  cocok("tak_ada", {}, true);
  assert.ok(n > 300 && tolak > 100, `${n} contoh, ${tolak} menolak`);
});
