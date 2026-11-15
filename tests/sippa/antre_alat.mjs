/* Alat uji antrean SIPPA (KP-12): antre.js memakai PbAntre dari public/inti/antre.js; penyimpanan diganti PbAntre.memori() supaya tanpa IndexedDB.
   Satu tempat untuk antre.test.mjs dan lapangan_fase2.test.mjs. */
import "../../public/inti/antre.js";

export const KODE = "0123456789abcdef0123456789";
let nomor = 0;

export function simpananPalsu() {
  const m = new Map();
  return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i] ?? null, get length() { return m.size; }, m};
}

/* balas(rec, n) -> {status, json}. simpan: null = pakai penyimpanan bawaan PbAntre (IndexedDB lalu localStorage "pb_antre2"). */
export async function siapAntre({balas, simpan = globalThis.PbAntre.memori()} = {}) {
  globalThis.PbAntre._registri.clear();   // saluran uji sebelumnya tidak boleh ikut dihitung menungguSemua
  globalThis.localStorage = simpananPalsu();
  globalThis.localStorage.setItem("sippa.kode", KODE);
  const panggilan = [];
  globalThis.fetch = async (url, init = {}) => {
    const rec = {url, metode: init.method, kode: init.headers?.["x-kode"], badan: typeof init.body === "string" ? JSON.parse(init.body) : init.body};
    panggilan.push(rec);
    const j = await balas(rec, panggilan.length);
    return {ok: j.status >= 200 && j.status < 300, status: j.status, json: async () => j.json ?? {}};
  };
  const A = await import(`../../public/pipa/antre.js?uji=${++nomor}`);
  A.atur(simpan ? {simpan} : {});
  return {A, simpan, panggilan};
}
/* isi satu saluran tugas langsung dari penyimpanan */
export const isiButir = (simpan, t = "T1") => simpan.semua(`sippa:${t}`);
export const isiFoto = (simpan, t = "T1") => simpan.semua(`sippa-foto:${t}`);
