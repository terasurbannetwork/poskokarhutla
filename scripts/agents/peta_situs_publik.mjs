/* Generator D3 (paket peta-situs): bagian registri src/peta_situs.js yang aman untuk publik -> public/inti/peta_situs_publik.json.
   Hanya pintu publik dan kampus; tanpa butir token, admin, hak, peran, akses. Jalankan: npm run peta:build */
import {writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {HALAMAN, PINTU, GRUP} from "../../src/peta_situs.js";

const PINTU_PUBLIK = ["publik", "kampus"];
const JSON_KELUAR = fileURLToPath(new URL("../../public/inti/peta_situs_publik.json", import.meta.url));

export function bangun() {
  const halaman = HALAMAN
    .filter(e => PINTU_PUBLIK.includes(e.pintu) && e.akses !== "token" && !e.token && !e.admin)
    .map(({rute, nama, ikon, pintu, grup, induk}) => ({rute, nama, ikon, pintu, grup, induk: induk ?? null}));
  const pick = o => Object.fromEntries(PINTU_PUBLIK.map(k => [k, o[k]]));
  return {pintu: pick(PINTU), grup: pick(GRUP), halaman};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const h = bangun();
  writeFileSync(JSON_KELUAR, JSON.stringify(h, null, 1) + "\n");
  console.log(`peta_situs_publik.json: ${h.halaman.length} halaman`);
}
