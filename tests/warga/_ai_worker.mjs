/* Pembungkus uji Asisten AI (src/ai.js): worker.js utuh + stub env.AI (layanan eksternal, bukan DB), dipilih lewat header x-ai.
   Mode: teks (jawaban biasa), alat (putaran 1 minta daftar_wilayah, putaran 2 menjawab), loop (selalu minta alat), asing (minta alat di luar izin), rusak (melempar).
   Tanpa header x-ai: tanpa binding AI. Semua panggilan tercatat; GET /__ai_log membacanya, DELETE /__ai_log menghapusnya. */
import w from "../../src/worker.js";

const log = [];
const stub = mode => ({run: async (model, a) => {
  log.push({model, pesan: a.messages, alat: (a.tools || []).map(t => t.name), suhu: a.temperature});
  if (mode === "rusak") throw new Error("model mati");
  const sudahAlat = a.messages.some(m => m.role === "tool");
  if (a.tools?.length && (mode === "loop" || (mode === "alat" && !sudahAlat))) return {response: "", tool_calls: [{name: "daftar_wilayah", arguments: {}}]};
  if (a.tools?.length && mode === "asing") return {response: "", tool_calls: [{name: "rumah_rusak", arguments: {}}]};
  if (mode === "alat") return {response: "Ada 38 provinsi (sumber daftar_wilayah)."};
  return {response: "Jawaban uji."};
}});
export default {
  fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === "/__ai_log") { const j = JSON.stringify(log); if (req.method === "DELETE") log.length = 0; return new Response(j); }
    const mode = req.headers.get("x-ai");
    return w.fetch(req, mode ? Object.assign(Object.create(env), {AI: stub(mode)}) : env, ctx);
  },
};
