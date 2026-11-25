"use strict";
/* Pembaca gerbang tampil, GAGAL-TERTUTUP (KI-12). Berkas: /data/gerbang/<bencana>.json (scripts/umum/gerbang.py).
   Berkas hilang, JSON rusak, entri tak ada, atau boleh_tampil bukan true persis = keluaran berpil "Hipotesis, belum lolos uji".
   Pakai: const peta = await Gerbang.muat("udara"); Gerbang.boleh(peta, "nama"); Gerbang.pil(peta, "nama") -> "" bila lolos. */
const Gerbang = (() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const TEKS = "Hipotesis, belum lolos uji";
  return {
    /* selalu resolve ke peta {nama: entri}; kegagalan apa pun = {} (semua entri dianggap tertutup) */
    muat: (bencana, url) => fetch(url || `/data/gerbang/${bencana}.json`).then(r => r.ok ? r.json() : null)
      .then(j => j && typeof j === "object" && j.keluaran && typeof j.keluaran === "object" ? j.keluaran : {}).catch(() => ({})),
    boleh: (peta, keluaran) => !!peta && typeof peta === "object" && peta[keluaran]?.boleh_tampil === true,
    pil(peta, keluaran) {
      if (this.boleh(peta, keluaran)) return "";
      const alasan = peta && typeof peta === "object" && peta[keluaran]?.alasan || "gerbang tidak terbaca atau tidak punya entri: disembunyikan";
      return `<span class="ex-ey" title="${esc(alasan)}">${TEKS}</span>`;
    },
  };
})();
if (typeof window !== "undefined") window.Gerbang = Gerbang;
