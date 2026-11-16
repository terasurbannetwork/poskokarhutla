"use strict";
/* Tab Operasi gempa (PB-77, F-40). Tersembunyi untuk tamu; muncul hanya bila registri gempa menyalakan kemampuan.operasi dan kemampuan.layar.tab_operasi
   DAN rute operasi yang sama dengan komponen inti (GET /api/pb/titik) boleh dibaca sesi ini. Isi = komponen inti yang sudah ada (public/inti/pb_titik.js, renlap.js),
   tanpa rute atau tabel baru (D16); data operasi tidak pernah ditulis ke public/ (D8). Pola: public/operasi_peta.js (menu Operasi tersembunyi sampai rute boleh dibaca).
   Skrip klasik tanpa inline (CSP); global GempaOperasi; juga dimuat node untuk uji (tests/layar/pb_tab_operasi.test.mjs). Tangga tindakan gempa menyusul PB-44. */
(g => {
  /* keputusan murni: registri menyala DAN rute boleh dibaca. 403 "di luar wilayah" = sesi sah tetapi bukan untuk provinsi yang dicoba: tab tetap tampil (provinsi dipilih di dalam tab). */
  function tampil({entri, status, galat} = {}) {
    if (!entri || entri.kemampuan?.operasi !== true || entri.kemampuan?.layar?.tab_operasi !== true) return false;
    if (status === 200) return true;
    return status === 403 && typeof galat === "string" && galat.includes("di luar wilayah");
  }
  const JALUR_PROBE = prov => "/api/pb/titik?bencana=gempa&prov=" + prov;
  const nanti = fn => g.requestAnimationFrame ? g.requestAnimationFrame(() => setTimeout(fn, 0)) : setTimeout(fn, 0);

  /* ---- sisi browser ---- */
  const ST = {entri: null, pasang: false, host: null, aktif: null, aktifR: null, muat: null};
  const muatSkrip = src => new Promise(ok => { const s = document.createElement("script"); s.src = src; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.append(s); });
  const muatCss = href => { if (!document.querySelector(`link[href^="${href.split("?")[0]}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.append(l); } };
  const muatInti = () => ST.muat ||= (() => { muatCss("/inti/pb_titik.css?v=1"); muatCss("/inti/renlap.css?v=1");
    return Promise.all([g.PbTitik ? true : muatSkrip("/inti/pb_titik.js?v=1"), g.PbRenlap ? true : muatSkrip("/inti/renlap.js?v=1")]).then(() => { if (!g.PbTitik) ST.muat = null; }); })();
  const provDaftar = () => (typeof S !== "undefined" && S?.nama) || {};   /* S = keadaan layar gempa (dasar.js), lexical global */

  function render() {
    const host = ST.host; if (!host || host.dataset.siap) return; host.dataset.siap = "1";
    muatInti().then(() => { if (!g.PbTitik) { host.dataset.siap = ""; return; }
      const isi = document.createElement("div"), isi2 = document.createElement("div"); isi.className = isi2.className = "pb-titik"; host.replaceChildren(isi, isi2);
      const pd = Object.entries(provDaftar());
      nanti(() => { ST.aktif = g.PbTitik.pasang(isi, {bencana: "gempa", sarana: ST.entri?.kemampuan?.renlap?.sarana || [], ...(pd.length ? {provDaftar: pd} : {})});
        ST.aktifR = g.PbRenlap ? g.PbRenlap.pasang(isi2, {bencana: "gempa", ...(pd.length ? {provDaftar: pd} : {})}) : null; }); });
  }
  function bukaTombol() {
    const tabs = document.querySelector("#tabs"); if (!tabs || tabs.querySelector('[data-t="operasi"]')) return;
    const b = document.createElement("button"); b.dataset.t = "operasi"; b.setAttribute("aria-current", "false");
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/></svg>Operasi';
    tabs.append(b);
    if (!document.querySelector("#p-operasi")) { const sec = document.createElement("section"); sec.className = "page scroll"; sec.id = "p-operasi"; sec.hidden = true; sec.setAttribute("aria-label", "Operasi gempa");
      const w = document.createElement("div"); w.className = "wrap"; w.id = "operasi"; sec.append(w); (document.querySelector("#p-foto") || document.body).after(sec); }
    ST.host = document.querySelector("#operasi");
  }
  /* dipanggil sekali dari tab.js sesudah nav terpasang; tamu: satu probe, tanpa efek tampak */
  async function pasang(ambil = g.fetch && g.fetch.bind(g)) {
    if (ST.pasang || !ambil) return false; ST.pasang = true;
    try { const j = await ambil("/bencana.json").then(r => r.ok ? r.json() : null);
      ST.entri = (j?.bencana || []).find(b => b.id === "gempa") || null;
      if (!ST.entri || ST.entri.kemampuan?.operasi !== true || ST.entri.kemampuan?.layar?.tab_operasi !== true) return false;   // registri mati: tidak ada probe
      const r = await ambil(JALUR_PROBE(Object.keys(provDaftar())[0] || "31"), {credentials: "same-origin"}); let jr = null; try { jr = await r.json(); } catch (e) {}
      if (!tampil({entri: ST.entri, status: r.status, galat: jr?.galat})) return false;
      bukaTombol(); return true;
    } catch (e) { return false; }
  }
  g.GempaOperasi = {tampil, pasang, render, JALUR_PROBE};
})(typeof window !== "undefined" ? window : globalThis);
