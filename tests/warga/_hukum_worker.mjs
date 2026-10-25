/* Pembungkus uji Pustaka Hukum: worker.js utuh + RUTE_HUKUM dipasang di depan (sampai sesi induk memasangnya di worker.js) + stub env.AI.
   Stub (layanan eksternal, bukan DB) dipilih lewat header x-ai: bebas (kutipan asli, klaim bebas), ok (1 kutipan sah + 1 karangan + 1 ke segmen yang tidak dikirim), palsu (semua karangan),
   rusak (melempar), teks (JSON terbungkus kalimat). */
import w from "../../src/worker.js";
import {RUTE_HUKUM} from "../../src/hukum.js";

const pertama = p => { const m = /\[SEGMEN (\d+)\][^\n]*\n([^\n]+)/.exec(p); return {id: Number(m[1]), teks: m[2]}; };
const stub = mode => ({run: async (model, a) => {
  if (mode === "rusak") throw new Error("model mati");
  const {id, teks} = pertama(a.messages.at(-1).content);
  const asli = teks.slice(0, 60), sah = {pernyataan: asli, kutipan: {segmen: id, teks: asli.toUpperCase().replace(/ /g, "  ")}};   // beda huruf besar dan spasi ganda
  const palsu = {pernyataan: "Denda sepuluh miliar.", kutipan: {segmen: id, teks: "Setiap orang wajib membayar denda sepuluh miliar rupiah kepada negara"}};
  const luar = {pernyataan: "Klaim ke segmen lain.", kutipan: {segmen: 999999, teks: teks.slice(0, 60)}};
  if (mode === "bebas") return {response: {klaim: [{pernyataan: "Denda sepuluh miliar rupiah dikenakan kepada pelanggar.", kutipan: {segmen: id, teks: asli}}]}};   // kutipan asli tapi generik, klaim tak bersandar
  if (mode === "palsu") return {response: {klaim: [palsu, luar]}};
  if (mode === "teks") return {response: "Ini jawabannya: " + JSON.stringify({klaim: [sah]}) + " selesai"};
  return {response: {klaim: [sah, palsu, luar]}};
}});
export default {
  fetch(req, env, ctx) {
    const url = new URL(req.url), mode = req.headers.get("x-ai"), e = mode ? Object.assign(Object.create(env), {AI: stub(mode)}) : env, h = RUTE_HUKUM[`${req.method} ${url.pathname}`];
    return h ? h(e, req, url, Date.now(), ctx) : w.fetch(req, e, ctx);
  },
};
