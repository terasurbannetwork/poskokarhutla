/* Pintu masuk uji Bangunan: worker.js apa adanya + RUTE_BANGUNAN dipasang di depannya, supaya handler teruji (workerd + R2 sungguhan)
   sebelum kabel di src/worker.js ada. Kabel aslinya dijaga uji "kabel worker.js" di bangunan.test.mjs. */
import worker from "../../src/worker.js";
import {RUTE_BANGUNAN} from "../../src/bangunan.js";
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), f = RUTE_BANGUNAN[req.method + " " + url.pathname];
    if (!f) return worker.fetch(req, env, ctx);
    try { return await f(env, req, url, Date.now(), ctx); } catch (e) { console.error("rute", e); return Response.json({galat: "galat server"}, {status: 500}); }
  },
  scheduled: (...a) => worker.scheduled(...a),
};
