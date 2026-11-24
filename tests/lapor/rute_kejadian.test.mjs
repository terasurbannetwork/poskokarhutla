/* LK-05 (paket data/kajian-bnpb/lapor-kejadian/, RENCANA-UJI U5 bagian hari-ini): saklar LAPOR_HARI_INI mati = 404 tanpa membaca data.
   Skenario hidup (Valid BPBD, daftar putih, versi baru, saringan, laju) ada di tests/lapor/rute.test.mjs karena memakai laporan dan akun lembaga di sana.
   Jalan: node --test tests/lapor/rute_kejadian.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai} from "../warga/_bnpb.mjs";
import "../../src/worker.js";

const uji = berantai();
const {api} = await siapkan("uji-lapor-hari-ini-mati");

uji("hari ini: saklar mati menjawab 404 JSON, juga dengan saringan", async () => {
  for (const q of ["", "?prov=32", "?jenis=banjir"]) { const r = await api("GET", "/api/lapor/hari-ini" + q); assert.equal(r.s, 404, q); assert.ok(r.j?.galat, r.t.slice(0, 100)); }
});
