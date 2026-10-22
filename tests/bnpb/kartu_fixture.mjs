/* Fixture Kartu Api (kontrak docs/bnpb/RANCANGAN-API-PADAM.md bagian 7) dan pemuat modul tanpa DOM, dipakai uji teks murni dan uji layar. */
import {readFileSync} from "node:fs";
import vm from "node:vm";
export const muatKartu = () => { const w = {}; vm.runInNewContext(readFileSync(new URL("../../public/instansi_kartu.js", import.meta.url), "utf8"), {window: w, document: {}}); return w.KartuApi; };
export const TUGAS = {id: "t1", lat: -2.5, lon: 113.9, rekomendasi: {jenis: "gambut", fwi: 31.4, kebutuhan: {target_hari: 3, total: {regu: [2, 3, 5], personel: [20, 36, 60], air_l_hari: [18000, 25000, 40000], heli: 1, selang_m: 1200, pompa: [{kelas: "tekanan_tinggi", hp: 13, unit: 4}]}}}};
export const KARTU = {insiden: "62-261022-007", front: {lat: -2.51234, lon: 113.91234, waktu: "2026-10-22T01:00:00Z", sensor: "VIIRS", radius_m: 375},
  masuk: {lat: -2.5, lon: 113.9, jarak_km: 2.34, jenis: "jalan"}, radius_m: 375, luas_aktif: {ha: 40, min: 30, maks: 60},
  luas_koreksi: {ha: 12.34, min: 8.1, maks: 20.7, faktor: 0.3, dasar: "rekonsiliasi BNPB"}, tren: {n24: 14, n24_kemarin: 9, arah: "tumbuh"},
  konsesi: [{jenis: "hti", nama: "PT Contoh Lestari", pemegang: "Grup Contoh"}], syarat: ["permukiman", "tumbuh"]};
