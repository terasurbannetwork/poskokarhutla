/* KP-18a: paritas cekIsi lama (salinan beku dari HEAD sebelum KP-18) dan cekIsi baru yang memakai public/inti/spek.js. Bandingkan ok dan isi bersih; pesan angka sengaja berubah. */
import test from "node:test";
import assert from "node:assert/strict";
import {TAHAP, TAHAP_ID, PETAK, KEDALAMAN, cekIsi as baru} from "../../public/pipa/uji_pilot_spek.js";

/* -> {ok, isi (bersih, siap JSON), galat:[...]} ; masukan = objek bernilai string (FormData) atau angka */
function lama(tahapId, petak, isi = {}, catatan = "") {
  const t = TAHAP.find(x => x.id === tahapId), galat = [];
  if (!t) return {ok: false, galat: [`tahap harus salah satu dari ${TAHAP_ID.join(", ")}`]};
  if (t.petak && !PETAK.includes(petak)) galat.push(`pilih petak: ${PETAK.join(", ")}`);
  if (!t.petak && petak) galat.push("tahap ini tidak memakai petak");
  if (t.catatanWajib && !String(catatan || "").trim()) galat.push("tulis kendalanya di catatan");
  const bersih = {}, kenal = new Set(t.medan.map(m => m.nama));
  for (const k of Object.keys(isi || {})) if (!kenal.has(k)) galat.push(`isian ${k} tidak dikenal untuk tahap ${t.judul}`);
  for (const m of t.medan) {
    const v = isi?.[m.nama];
    const kosong = v == null || v === "" || (m.tipe === "suhu" && typeof v === "object" && !Object.keys(v).length);
    if (kosong) { if (m.wajib) galat.push(`${m.label} wajib diisi`); continue; }
    if (m.tipe === "pilihan") {
      const s = String(v); if (!m.pilihan.some(([k]) => k === s)) { galat.push(`${m.label}: pilihan tidak dikenal`); continue; }
      bersih[m.nama] = /^\d+$/.test(s) ? Number(s) : s;
    } else if (m.tipe === "suhu") {
      if (typeof v !== "object" || Array.isArray(v)) { galat.push("suhu harus kisi titik × kedalaman"); continue; }
      const kisi = {};
      for (const [titik, baris] of Object.entries(v)) {
        if (!/^[1-5]$/.test(titik) || !Array.isArray(baris) || baris.length !== KEDALAMAN.length) { galat.push(`suhu titik ${titik} tidak sah`); continue; }
        const a = baris.map(x => x == null || x === "" ? null : Number(String(x).replace(",", ".")));
        if (a.some(x => x != null && !(Number.isFinite(x) && x >= -10 && x <= 900))) { galat.push(`suhu titik ${titik} harus -10 sampai 900 °C`); continue; }
        if (a.some(x => x != null)) kisi[titik] = a;
      }
      if (Object.keys(kisi).length) bersih.suhu = kisi;
    } else {
      const x = Number(String(v).replace(",", "."));
      if (!Number.isFinite(x) || x < m.min || x > m.maks || (m.tipe === "bulat" && !Number.isInteger(x))) {
        galat.push(`${m.label} harus ${m.tipe === "bulat" ? "bilangan bulat " : ""}${m.min} sampai ${m.maks} ${m.satuan}`); continue;
      }
      bersih[m.nama] = x;
    }
  }
  return {ok: !galat.length, isi: bersih, galat};
}

const sah = m => m.tipe === "pilihan" ? m.pilihan[0][0] : m.tipe === "suhu" ? {1: [30, 31, 32, 33], 3: ["40,5", "", null, 41]} : String(m.min + 1).replace(".", ",");
const rusak = m => m.tipe === "pilihan" ? "zzz" : m.tipe === "suhu" ? {9: [1, 2, 3, 4]} : [String(m.maks + 1), "abc", "1.5", true, -1][m.tipe === "bulat" ? 2 : 0];
test("cekIsi baru setara yang lama atas contoh dari TAHAP", () => {
  let n = 0, tolak = 0;
  const cocok = (t, pt, isi, cat = "x") => { const a = lama(t, pt, isi, cat), b = baru(t, pt, isi, cat); n++; if (!a.ok) tolak++;
    assert.equal(b.ok, a.ok, `${t} ${JSON.stringify(isi)} lama=${a.galat} baru=${b.galat}`); assert.equal(b.galat.length > 0, a.galat.length > 0);
    if (a.ok) assert.deepEqual(b.isi, a.isi); };
  for (const t of TAHAP) {
    const pt = t.petak ? "L1" : null, dasar = Object.fromEntries(t.medan.map(m => [m.nama, sah(m)]));
    cocok(t.id, pt, {}); cocok(t.id, pt, dasar); cocok(t.id, pt, {...dasar, liar: 1}); cocok(t.id, t.petak ? null : "L1", dasar); cocok(t.id, pt, dasar, "");
    for (const m of t.medan) { cocok(t.id, pt, {...dasar, [m.nama]: rusak(m)}); cocok(t.id, pt, {...dasar, [m.nama]: ""}); cocok(t.id, pt, {...dasar, [m.nama]: null});
      if (m.tipe === "bulat") cocok(t.id, pt, {...dasar, [m.nama]: "2"}); if (m.tipe === "angka") cocok(t.id, pt, {...dasar, [m.nama]: m.maks}), cocok(t.id, pt, {...dasar, [m.nama]: 0}); }
  }
  cocok("tak_ada", null, {}); cocok("tiba", null, {n_orang: 3, jenis: "latihan"}); cocok("petak_sesudah", "K1", {suhu: {1: [1, 2, 3]}});
  assert.ok(n > 80 && tolak > 20, `${n} contoh, ${tolak} menolak`);
});
