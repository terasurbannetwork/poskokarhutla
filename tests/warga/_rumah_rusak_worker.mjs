/* Pintu masuk uji untuk Rumah Rusak: worker.js apa adanya + rute RUTE_RUMAH_RUSAK dipasang di depannya, supaya handler teruji (workerd + D1 sungguhan)
   sebelum/tanpa kabel di src/worker.js. Meniru pagar rute() worker.js (CSRF origin, IP_SALT). Kabel aslinya dijaga uji "kabel worker.js" di rumah_rusak.test.mjs. */
import worker from "../../src/worker.js";
import {RUTE_RUMAH_RUSAK} from "../../src/rumah_rusak.js";
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), jalur = url.pathname.replace(/\/+$/, "") || "/", id = jalur.match(/\/([0-9a-f]{16})$/)?.[1];
    const f = RUTE_RUMAH_RUSAK[req.method + " " + (id ? jalur.slice(0, -16) + ":id" : jalur)];
    if (!f) return worker.fetch(req, env, ctx);
    if (req.method === "POST") {
      const o = req.headers.get("origin");
      if (o && o !== "null" && (!URL.canParse(o) || new URL(o).host !== url.host)) return Response.json({galat: "origin lain ditolak"}, {status: 403});
      if (!env.IP_SALT) return Response.json({galat: "IP_SALT"}, {status: 503});
    }
    try { return await f(env, req, url, Date.now(), ctx, id); } catch (e) { console.error("rute", e); return Response.json({galat: "galat server"}, {status: 500}); }
  },
  scheduled: (...a) => worker.scheduled(...a),
};
