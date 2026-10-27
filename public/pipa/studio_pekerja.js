/* SIPPA: pekerja Web Worker Monte Carlo Studio (PRD §9.5.1, DS §3.9). Skrip klasik: memuat mesin lewat importScripts dengan ?v= dari URL pekerja,
   lalu menjawab {id, daftar: [{kode, state}]} dengan {id, hasil: [{kode, mc}]} atau {id, galat}. Monte Carlo tetap 800 sampel berbenih dari hash keadaan
   (drawRiskMC mesin pemilik), jadi jawabannya sama dengan hitungan di utas utama. Tanpa jaringan, tanpa data. */
"use strict";
(function () {
  const v = /[?&]v=([\w.-]+)/.exec((self.location && self.location.search) || "");
  importScripts("/pipa/studio_mesin.js?v=" + (v ? v[1] : "1"));
  const MAKS_KOLOM = 12;   // lima preset dan enam skenario tersimpan, satu cadangan
  self.onmessage = e => {
    const d = e && e.data;
    try {
      if (!d || !Array.isArray(d.daftar)) throw new Error("Pekerja Studio: daftar kolom wajib berupa larik");
      if (d.daftar.length > MAKS_KOLOM) throw new Error("Pekerja Studio: paling banyak " + MAKS_KOLOM + " kolom, diterima " + d.daftar.length);
      const M = self.KarhutlaEngine;
      if (!M || typeof M.drawRiskMC !== "function") throw new Error("Pekerja Studio: mesin tidak termuat dari studio_mesin.js");
      self.postMessage({id: d.id, hasil: d.daftar.map(x => ({kode: String(x && x.kode), mc: M.drawRiskMC((x && x.state) || {})}))});
    } catch (err) {
      self.postMessage({id: d ? d.id : null, galat: String((err && err.message) || err)});
    }
  };
})();
