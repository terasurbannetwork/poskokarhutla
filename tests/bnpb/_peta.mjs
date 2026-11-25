/* Jawaban GET /api/peta-situs untuk server stub uji layar (menu_pusdalops.js memintanya sekali per halaman; 404 = galat konsol).
   Dihitung dari registri asli lewat menuUntuk, bentuknya sama dengan petaSitus() di src/worker.js. */
import "../../src/worker.js";   // memasang tabel rute gerbang_halaman sebelum menuUntuk dipanggil
import {menuUntuk} from "../../src/peta_situs.js";
import {bolehStaf} from "../../src/admin_halaman.js";
export const petaSitus = (sesi = {jenis: "admin", peran: []}) => menuUntuk(sesi, bolehStaf, true).map(p => ({pintu: p.pintu, nama: p.nama, beranda: p.beranda,
  grup: p.grup.map(g => ({id: g.id, nama: g.nama, butir: g.butir.map(({rute, nama, ikon, grup, induk}) => ({rute, nama, ikon, grup, induk}))}))}));
