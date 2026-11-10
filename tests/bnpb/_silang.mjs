/* Bantu uji Silang Sumber: menjalankan modul Python SUNGGUHAN (python3 -I, stdlib) dan mengembalikan JSON. Tanpa mock. */
import {spawnSync} from "node:child_process";
export const AKAR = new URL("../..", import.meta.url).pathname;
/** py(awalan_jalur_modul, kode) -> objek JSON dari print(json.dumps(...)) di `kode`. Modul diimpor lewat sys.path. */
export function py(dir, kode) {
  const p = spawnSync("python3", ["-I", "-c", `import sys, json\nsys.path.insert(0, ${JSON.stringify(AKAR + dir)})\n${kode}`], {encoding: "utf8", timeout: 20000});
  if (p.status !== 0) throw new Error(`python gagal (${dir}): ${p.stderr}`);
  return JSON.parse(p.stdout);
}
export function uji_mandiri(skrip) {
  const p = spawnSync("python3", ["-I", AKAR + skrip, "uji"], {encoding: "utf8", timeout: 30000});
  return {status: p.status, err: p.stderr};
}
