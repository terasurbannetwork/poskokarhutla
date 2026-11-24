/* Inti murni peringatan dini warga Pantau Bencana (tanpa D1, tanpa fetch; diuji tests/lapor/peringatan.test.mjs).
   Rute dan cron di src/pw_peringatan.js. (paket data/kajian-bnpb/pwa-peringatan, PW-02, PW-06, PW-07, PW-09).
   Warga memilih sampai 3 kecamatan; tingkat prakiraan per kab/kota (Q1) dari /prediksi (angka sama dengan layar, src/lapor_besok.js).
   Notifikasi hanya saat tingkat NAIK ke Waspada atau lebih untuk (kab, jenis, tanggal sasaran) yang sama (ALGORITMA 2); turun tidak dikirim (Q10).
   Teks selalu "Prakiraan Pantau Bencana, bukan peringatan resmi" (Q2) dan tidak pernah menulis kata yang menjanjikan keselamatan.
   Fungsi bagian atas murni (diuji tests/lapor/peringatan.test.mjs); rute dan cron di bawah memakai D1 lewat src/hak.js. */
import {Besok} from "./lapor_besok.js";
import {km} from "./lapor_tampil.js";

export const JENIS_PW = [["BNJ", 1, "Banjir"], ["LSR", 2, "Tanah longsor"], ["ASP", 4, "Asap"], ["CEX", 8, "Angin kencang"]];
export const TINGKAT = ["Normal", "Waspada", "Siaga", "Awas"];
export const SEGAR_JAM = 36, MAKS_KEC = 3, MAKS_LANGGANAN = 5000, PER_MENIT = 40;
// layanan push peramban yang diizinkan (endpoint lain ditolak supaya Worker tidak dipakai menembak alamat sembarang)
export const HOST_PUSH = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)push\.services\.mozilla\.com$/];
export const endpointSah = e => { try { const u = new URL(e); return u.protocol === "https:" && e.length <= 1000 && HOST_PUSH.some(r => r.test(u.hostname)); } catch { return false; } };
const kunciSah = (p256dh, auth) => /^[A-Za-z0-9_-]{80,100}$/.test(p256dh || "") && /^[A-Za-z0-9_-]{20,30}$/.test(auth || "");

/* tanggal WIB YYYY-MM-DD */
export const tglWib = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);
/* jam tenang (Q4): Waspada ditahan 22.00 sampai 05.00 WIB; mengembalikan ms 05.00 WIB berikutnya, atau null */
export function tahanSampai(kini, lv) {
  if (lv >= 2) return null;
  const jam = new Date(kini + 7 * 3600e3).getUTCHours();
  if (jam >= 5 && jam < 22) return null;
  const hari = new Date(kini + 7 * 3600e3); if (jam >= 22) hari.setUTCDate(hari.getUTCDate() + 1);
  hari.setUTCHours(5, 0, 0, 0); return hari.getTime() - 7 * 3600e3;
}

/* ALGORITMA 2: peristiwa naik tingkat dari prediksi.json. tercatat: Map "kab|jenis|tgl" -> level terkirim.
   Mengembalikan {perKab: Map kab -> [{jenis, tanggal, n, lv, teruji}], status: [[kab, jenis, tgl, lv]], nama: Map kab -> nama}. */
export function hitungPeristiwa(P, tercatat, kini) {
  const kosong = {perKab: new Map(), status: [], nama: new Map()};
  if (!P?.kab || !P.kode?.HJN?.hari || !(kini - Date.parse(P.dibuat) <= SEGAR_JAM * 3600e3)) return kosong;   // basi: tidak ada keluaran
  const KOL = Object.fromEntries(Object.entries(P.kode).map(([c, v]) => [c, v.kol])), hari = P.kode.HJN.hari, hariIni = tglWib(kini);
  const teruji = c => Object.values(P.kode[c]?.vonis || {}).some(v => v[0] === "mengalahkan baseline");
  for (const k of P.kab) for (const [c] of JENIS_PW) {
    if (!P.kode[c]) continue;
    for (let n = 1; n <= 3; n++) {
      const tanggal = hari[n - 1]; if (!tanggal || tanggal < hariIni) continue;
      const lv = Besok.levelKode(k, KOL, n, c);
      if (lv == null || lv < 1) continue;   // null tidak pernah dianggap 0; di bawah Waspada tidak ada peristiwa
      const kunci = `${k.id}|${c}|${tanggal}`, lama = tercatat.get(kunci) || 0;
      if (lv <= lama) continue;
      tercatat.set(kunci, lv); kosong.status.push([k.id, c, tanggal, lv]);
      if (!kosong.perKab.has(k.id)) kosong.perKab.set(k.id, []);
      kosong.perKab.get(k.id).push({jenis: c, tanggal, n, lv, teruji: teruji(c)}); kosong.nama.set(k.id, k.nama);
    }
  }
  return kosong;
}

export const NAMA_HARI = t => new Date(`${t}T00:00:00Z`).toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", timeZone: "UTC"});
export const label = c => JENIS_PW.find(j => j[0] === c)?.[2] || c;
/* ALGORITMA 4: teks satu notifikasi per perangkat per kab. daftar = peristiwa yang cocok dengan langganan itu. */
export function teksNotif(namaKab, daftar, kecNama) {
  const urut = [...daftar].sort((a, b) => b.lv - a.lv || JENIS_PW.findIndex(j => j[0] === a.jenis) - JENIS_PW.findIndex(j => j[0] === b.jenis));
  const top = urut[0], kab = String(namaKab || "").replace(/^Kota Administrasi /, "Kota ");
  const judul = (urut.length === 1 ? `${label(top.jenis)} ${TINGKAT[top.lv]} di ${kab}` : `${TINGKAT[top.lv]} di ${kab}`).slice(0, 80);
  const perHari = new Map(); for (const x of urut) perHari.set(x.tanggal, [...(perHari.get(x.tanggal) || []), x]);
  const bagian = [...perHari].map(([t, xs]) => `${NAMA_HARI(t)}: ${xs.map(x => `${label(x.jenis)} ${TINGKAT[x.lv]}${x.teruji ? "" : " (belum teruji)"}`).join(", ")}`);
  const isi = `Prakiraan ${bagian.join(". ")}. ${kecNama ? `Kecamatan ${kecNama}. ` : ""}Buka Pantau Bencana untuk arahan dan titik berkumpul terdekat. Prakiraan Pantau Bencana, bukan peringatan resmi.`;
  return {judul, isi, tag: `pw-${top.tanggal}-${namaKab}`.slice(0, 64), url: "/lapor/?dari=peringatan"};
}

/* ALGORITMA 3: kelompokkan baris langganan per endpoint; tiap endpoint menerima peristiwa yang jenisnya dipilih dan tingkatnya >= ambang */
export function penerima(baris, daftar) {
  const per = new Map();
  for (const r of baris) {
    const cocok = daftar.filter(x => (r.jenis & (JENIS_PW.find(j => j[0] === x.jenis)?.[1] || 0)) && x.lv >= r.ambang);
    if (!cocok.length) continue;
    const ada = per.get(r.endpoint) || {sub: {id: r.id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth}, kec: [], daftar: new Map()};
    ada.kec.push(r.kec_nama); for (const x of cocok) ada.daftar.set(`${x.jenis}|${x.tanggal}`, x); per.set(r.endpoint, ada);
  }
  return [...per.values()].map(v => ({sub: v.sub, kec: [...new Set(v.kec)].join(", "), daftar: [...v.daftar.values()]}));
}

/* ALGORITMA 8: id baris = 16 karakter pertama SHA-256 base64url dari endpoint|kec */
export async function idLangganan(endpoint, kec) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${endpoint}|${kec}`)));
  return btoa(String.fromCharCode(...h)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 16);
}

/* ALGORITMA 7: tiga titik berkumpul terdekat dalam 5 km dari data OSM lokal (berlabel perkiraan; Q8: titik resmi BPBD menyusul) */
const JENIS_TITIK = {titik_kumpul: "Titik kumpul", pemerintahan: "Kantor atau balai", sekolah: "Sekolah"};
export function titikTerdekat(asal, osm, ibadah, n = 3) {
  const semua = [];
  for (const [k, lb] of Object.entries(JENIS_TITIK)) for (const [la, lo, nama] of osm?.[k] || []) if (nama) semua.push({nama, jenis: lb, lat: la, lon: lo});
  for (const [la, lo, nama] of ibadah || []) if (nama) semua.push({nama, jenis: "Rumah ibadah", lat: la, lon: lo});
  return semua.map(x => ({...x, jarakKm: km(asal.lat, asal.lon, x.lat, x.lon)})).filter(x => x.jarakKm <= 5)
    .sort((a, b) => (a.jenis === "Titik kumpul" ? 0 : 1) - (b.jenis === "Titik kumpul" ? 0 : 1) || a.jarakKm - b.jarakKm).slice(0, n)
    .map(x => ({...x, jarakKm: Math.round(x.jarakKm * 10) / 10, sumber: "perkiraan dari OpenStreetMap"}));
}

