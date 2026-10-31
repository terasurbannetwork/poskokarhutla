"use strict";
/* riwayat_daerah.js: (1) kartu "Riwayat bencana di daerahmu" saat kabupaten/kota dipilih lewat pencarian atau diklik di peta,
   (2) lapisan "Musim berjalan" (jenis dominan per kabupaten untuk bulan terpilih), (3) lapisan "Langganan bencana" (banjir/longsor 7 dari 7 tahun).
   Data: data/logbook_riwayat.json (Logbook Pusdalops BNPB), dibaca apa adanya; hanya 2014-2020 (tahun_penuh). Angka korban logbook TIDAK dipakai.
   Pola sama dengan kebakaran_permukiman.js: kontrol urgent, gambar berat lewat nanti(). Dimuat sesudah kebakaran_permukiman.js. */
(() => {
  const TH = [2014, 2015, 2016, 2017, 2018, 2019, 2020], N = TH.length;
  const JN = [["banjir", "Banjir", "#2f6fb0"], ["longsor", "Longsor", "#8a5a2b"], ["cuaca", "Cuaca ekstrem", "#7b5cc0"], ["karhutla", "Karhutla", "#d9600b"], ["kebakaran_permukiman", "Kebakaran permukiman", "#c9503a"]];
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"], SB = BLN.map(b => b.slice(0, 3));
  const CATATAN = "Logbook mencatat kejadian yang dilaporkan. Papua hanya 0,3–1 kejadian per kab/kota per tahun, jauh di bawah Jawa, karena pelaporan tidak merata.";
  const MODE = {"rd-musim": "musim", "rd-langgan": "langgan"};
  let jData = null, janji = null, J = null, D = null, genBln = 0, mode = null, bulan = new Date().getMonth(), gen = 0, hov = null, ev = null, cache = {}, kartuK = null;
  const ada = (v, j) => TH.filter(y => v.tahun?.[y]?.[j] > 0).length;
  const rgba = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
  const dari = n => `${fmt(n)} dari ${N} tahun`;

  const ambilData = () => jData ||= muatJSON("data/logbook_riwayat.json").then(j => J = j.kab).catch(e => { jData = null; throw e; });
  const ambil = () => janji ||= (async () => {
    await ambilData(); const kab = J;
    const prov = [...new Set(Object.keys(kab).map(k => k.split("|")[0]))];
    const fcs = await Promise.all(prov.map(async p => S.geo.kab[p] ||= await muatJSON(`geo/kabupaten/${p}.json`)));
    const features = prov.flatMap((p, i) => fcs[i].features.map(f => ({type: "Feature", geometry: f.geometry, properties: {kunci: p + "|" + f.properties.kab, nama: f.properties.kab, prov: p}})))
      .filter(f => kab[f.properties.kunci]);
    return D = {kab, fc: {type: "FeatureCollection", features}};
  })().catch(e => { janji = null; throw e; });

  /* ---------- kartu riwayat ---------- */
  const css = document.createElement("style");
  css.textContent = `#rdKartu{position:fixed;top:76px;right:12px;width:min(360px,calc(100vw - 24px));max-height:calc(100vh - 100px);overflow:auto;z-index:40;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);padding:12px 14px;font-size:12.5px;color:var(--ink)}
#rdKartu[hidden]{display:none}#rdKartu .rd-hd{display:flex;align-items:flex-start;gap:8px}#rdKartu .rd-hd>div{flex:1}#rdKartu .rd-hd b{font-size:15px}#rdKartu .rd-hd small{display:block;color:var(--ink2)}
#rdKartu .rd-x{border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:var(--ink2)}
#rdKartu .rd-j{border-top:1px solid var(--line);padding:8px 0}#rdKartu .rd-j .pill{color:#fff}#rdKartu .rd-j .rd-n{float:right;font-weight:700}
#rdKartu .rd-b{display:grid;grid-template-columns:repeat(12,1fr);gap:2px;align-items:end;height:38px;margin:8px 0 2px}
#rdKartu .rd-b i{display:block;border-radius:2px 2px 0 0;min-height:2px}#rdKartu .rd-m{display:grid;grid-template-columns:repeat(12,1fr);gap:1px;text-align:center;font-size:9px;color:var(--ink2)}
#rdKartu p{text-align:justify;margin:6px 0 0}#rdKartu .rd-s{color:var(--ink2);font-size:11px;border-top:1px solid var(--line);padding-top:6px;margin-top:6px}
#rdBln{display:grid!important;grid-template-columns:repeat(12,1fr);width:100%;margin:4px 0 0}#rdBln button{padding:4px 0!important;font-size:10px!important;min-width:0}`;
  document.head.appendChild(css);

  const gabung = a => a.length < 3 ? a.join(" dan ") : a.slice(0, -1).join(", ") + ", dan " + a.at(-1);
  function bulanTerbanyak(c) {
    const g = new Map(); c.forEach((n, i) => n > 0 && (g.get(n) || g.set(n, []).get(n)).push(BLN[i]));
    const bag = [...g].sort((a, b) => b[0] - a[0]).slice(0, 2).map(([n, m]) => m.length > 1 ? `${gabung(m)} masing-masing ${fmt(n)} kejadian` : `${m[0]} (${fmt(n)} kejadian)`);
    return bag.length ? `Bulan terbanyak: ${bag.join("; ")}, 2014–2020.` : "";
  }
  function isiKartu(k, nama) {
    const v = J[k], rows = JN.map(([j, lb, w]) => {
      const b = v.tahun_ada?.[j] || [], y = ada(v, j); if (!y && !b.some(x => x)) return null;
      return {j, lb, w, y, b, top: bulanTerbanyak(v.bulan_penuh?.[j] || [])};
    }).filter(Boolean).sort((a, c) => c.y - a.y);
    const kepala = `<div class="rd-hd"><div><b>${esc(nama)}</b></div><button class="rd-x" aria-label="Tutup">×</button></div>`;
    const cov = `Menampilkan 5 jenis: banjir, longsor, cuaca ekstrem, karhutla, kebakaran permukiman.`;
    if (!rows.length) return kepala + `<p>Tidak ada kejadian lima jenis ini yang tercatat di logbook 2014–2020.</p><div class="rd-s">${cov} ${CATATAN}</div>`;
    const t = rows[0];
    return kepala + `<p><b>${t.lb} tercatat di ${dari(t.y)}.</b> Ini jenis yang tercatat di lebih banyak tahun di ${esc(nama)}.</p>`
      + rows.map(r => `<div class="rd-j"><span class="pill" style="background:${r.w}">${r.lb}</span><span class="rd-n">${dari(r.y)}</span>
        <div class="rd-b">${r.b.map((n, i) => `<i data-tip="<b>${BLN[i]}</b>${dari(n)}" style="height:${Math.round(n / N * 38)}px;background:${r.w}"></i>`).join("")}</div>
        <div class="rd-m">${SB.map(b => `<span>${b}</span>`).join("")}</div>${r.top ? `<p>${r.top}</p>` : ""}</div>`).join("")
      + `<div class="rd-s">Sumber: logbook Pusdalops BNPB 2014–2020, kejadian yang dilaporkan. ${cov} ${CATATAN}</div>`;
  }
  let kartu = null;
  async function buka(k, nama) {
    kartu ||= (() => { const a = document.createElement("aside"); a.id = "rdKartu"; a.hidden = true; a.setAttribute("aria-live", "polite");
      a.addEventListener("click", e => { if (e.target.closest(".rd-x")) { a.hidden = true; kartuK = null; } }); document.body.appendChild(a); return a; })();
    nama ||= k.split("|")[1]; kartuK = k; kartu.innerHTML = `<div class="rd-hd"><div><b>${esc(nama)}</b></div><button class="rd-x" aria-label="Tutup">×</button></div><p>Memuat…</p>`; kartu.hidden = false;
    try { await ambilData(); } catch (e) { console.warn("riwayat daerah", e); kartu.hidden = true; return; }
    if (kartuK !== k) return;
    nanti(() => { if (kartuK === k && J[k]) kartu.innerHTML = isiKartu(k, nama); else if (kartuK === k) kartu.hidden = true; });
  }

  /* ---------- lapisan ---------- */
  const lapis = () => !!(peta && peta.getLayer("rd-fill"));
  const tampil = v => ["rd-fill", "rd-line"].forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", v ? "visible" : "none"));
  function pasang() {
    if (!D || !peta || peta.getSource("rd")) return;
    const bawah = Peta.lapisAwal(); hov = null;
    peta.addSource("rd", {type: "geojson", data: D.fc, promoteId: "kunci"});
    peta.addLayer({id: "rd-fill", type: "fill", source: "rd", paint: {"fill-color": ["to-color", ["coalesce", ["feature-state", "c"], "rgba(0,0,0,0)"]], "fill-opacity": .9}}, bawah);
    peta.addLayer({id: "rd-line", type: "line", source: "rd", paint: {"line-color": "#8fa0b5", "line-opacity": .85, "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.2, .6]}}, bawah);
    ikat();
  }
  /* jenis dominan bulan ini: tahun_ada terbesar; seri = urutan JN. Langganan: banjir/longsor ada di 7 dari 7 tahun. */
  const dominan = v => { let b = null; for (const [j, lb, w] of JN) { const n = v.tahun_ada?.[j]?.[bulan] || 0; if (n > 0 && (!b || n > b.n)) b = {n, lb: [lb], w}; else if (n > 0 && n === b.n) b.lb.push(lb); } return b; };
  const SERI = "rgba(90,100,120,";
  const langgan = v => JN.slice(0, 2).filter(([j]) => ada(v, j) === N);
  function gambar() {
    if (!mode || !D || !lapis()) return;
    cache = {}; $("#tip")._rdk = null;
    for (const [k, v] of Object.entries(D.kab)) {
      let c;
      if (mode === "musim") { const d = dominan(v); c = d ? (d.lb.length > 1 ? SERI + (.2 + .7 * d.n / N) + ")" : rgba(d.w, .2 + .7 * d.n / N)) : "rgba(0,0,0,0)"; }
      else { const l = langgan(v); c = l.length === 2 ? "rgba(90,70,160,.85)" : l.length ? rgba(l[0][2], .85) : "rgba(0,0,0,0)"; }
      peta.setFeatureState({source: "rd", id: k}, {c});
    }
    if (!$("#rdBln")) renderLegenda();
  }
  function isiTip(p) {
    const v = D.kab[p.kunci], sub = "";
    if (mode === "musim") { const d = dominan(v);
      return kartuTip({judul: esc(p.nama), sub, daftar: d ? [[d.lb.length > 1 ? `${gabung(d.lb)} sama-sama ${dari(d.n)}` : d.lb[0], d.lb.length > 1 ? BLN[bulan] : dari(d.n) + ", " + BLN[bulan]]] : [["Tidak ada kejadian tercatat", BLN[bulan]]], kaki: "Logbook Pusdalops BNPB 2014–2020"}); }
    const l = langgan(v);
    return kartuTip({judul: esc(p.nama), sub, daftar: l.map(([, lb]) => [lb, `ada di ${dari(N)}`]), kaki: "Logbook Pusdalops BNPB 2014–2020"});
  }
  function ikat() {
    const tip = $("#tip"); let ukr = [0, 0];
    if (ev) { peta.off("mousemove", "rd-fill", ev.m); peta.off("mouseleave", "rd-fill", ev.l); }
    ev = {
      m: e => { const f = e.features[0];
        if (hov !== f.id) { if (hov !== null) peta.setFeatureState({source: "rd", id: hov}, {hover: false}); hov = f.id; peta.setFeatureState({source: "rd", id: hov}, {hover: true}); }
        if (tip._kl != null || tip._pf || peta._tipHw || peta._tipUdara) return;
        peta.getCanvas().style.cursor = "pointer";
        if (tip._rdk === f.id && tip.classList.contains("on")) { tip.style.left = Math.min(innerWidth - ukr[0] - 8, e.originalEvent.clientX + 14) + "px"; tip.style.top = Math.max(8, e.originalEvent.clientY - ukr[1] - 12) + "px"; }
        else { tampilTip(cache[f.id] ||= isiTip(f.properties), e.originalEvent); tip._rdk = f.id; ukr = [tip.offsetWidth, tip.offsetHeight]; } },
      l: () => { if (hov !== null) peta.setFeatureState({source: "rd", id: hov}, {hover: false}); hov = null; tip._rdk = null; peta.getCanvas().style.cursor = ""; tip.classList.remove("on"); }};
    peta.on("mousemove", "rd-fill", ev.m); peta.on("mouseleave", "rd-fill", ev.l);
  }
  function klik(e) {
    if (!mode || !D || !lapis() || peta.getLayoutProperty("rd-fill", "visibility") === "none") return false;
    if (e._rd) return true;
    const f = peta.queryRenderedFeatures(e.point, {layers: ["rd-fill"]})[0]; if (!f) return false;
    e._rd = 1; $("#tip").classList.remove("on"); buka(f.properties.kunci, f.properties.nama); return true;
  }

  const _leg = renderLegenda;
  renderLegenda = function () { _leg(); const box = document.querySelector("#legDet > div"); if (!box || !mode || !D || !lapis()) return;
    const tengah = `<span class="kab-wkt"><span>${CATATAN} Sumber: logbook Pusdalops BNPB 2014–2020.</span></span>`;
    box.insertAdjacentHTML("beforeend", mode === "musim"
      ? `<div class="lg-g"><div class="lbl">Musim berjalan: jenis dominan, <span id="rdBlnLbl">${BLN[bulan]}</span></div><div class="seg" id="rdBln">${SB.map((b, i) => `<button data-b="${i}" title="${BLN[i]}" aria-pressed="${i === bulan}">${b}</button>`).join("")}</div>
        <div class="leg">${JN.map(([, lb, w]) => `<span><i class="sw" style="background:${w}"></i>${lb}</span>`).join("")}<span>Makin pekat warna, makin banyak tahun (dari ${N}) yang mencatat jenis itu di bulan ini.</span><span><i class="sw" style="background:${SERI}.7)"></i>Seri: dua jenis atau lebih sama banyak</span>${tengah}</div></div>`
      : `<div class="lg-g"><div class="lbl">Langganan bencana (ada di ${N} dari ${N} tahun)</div><div class="leg"><span><i class="sw" style="background:${rgba(JN[0][2], .85)}"></i>Banjir</span><span><i class="sw" style="background:${rgba(JN[1][2], .85)}"></i>Longsor</span><span><i class="sw" style="background:rgba(90,70,160,.85)"></i>Banjir dan longsor</span>${tengah}</div></div>`); };

  async function terapkan() {
    const id = ++gen;
    if (!mode) { if (lapis()) tampil(false); renderLegenda(); return; }
    try { await ambil(); } catch (e) { console.warn("riwayat daerah", e); if (id !== gen) return;
      toast("Peta riwayat bencana gagal dimuat"); $$off(); return; }
    if (id !== gen) return;
    await new Promise(nanti); if (id !== gen) return;
    pasang(); nanti(() => { if (id === gen) { tampil(true); gambar(); } });
  }
  function $$off() { mode = null; document.querySelectorAll('#lapis input[data-l^="rd-"]').forEach(i => i.checked = false); }
  function hubungkan() {
    const L = $("#lapis"); if (!L) return;
    L.addEventListener("change", e => { const i = e.target.closest("input"); if (!i) return; const l = i.dataset.l;
      if (MODE[l]) { e.stopImmediatePropagation();
        if (i.checked) { L.querySelectorAll('input[data-l^="rd-"]:checked,input[data-l^="kab"]:checked,input[data-l="permukiman"]:checked').forEach(x => { if (x !== i) { x.checked = false; nanti(() => x.dispatchEvent(new Event("change", {bubbles: true}))); } }); }
        mode = i.checked ? MODE[l] : null; nanti(terapkan); return; }
      if (mode && i.checked && (l === "permukiman" || l?.startsWith("kab"))) { $$off(); nanti(terapkan); } }, true);
    $("#legenda")?.addEventListener("click", e => { const b = e.target.closest("#rdBln button"); if (!b) return;
      bulan = +b.dataset.b; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); const l = $("#rdBlnLbl"); if (l) l.textContent = BLN[bulan]; const t = ++genBln; nanti(() => t === genBln && gambar()); });
    $("#hasil")?.addEventListener("click", e => { const b = e.target.closest("button[data-k]"); if (!b || b.dataset.kl) return;
      const k = b.dataset.k.split("|").slice(0, 2).join("|"); if (!k.includes("|")) return; const nm = b.dataset.k.split("|").length === 2 ? b.querySelector("b")?.textContent : k.split("|")[1];
      nanti(() => buka(k, nm)); });
    const tunggu = () => { if (!peta) return setTimeout(tunggu, 300); peta.on("style.load", () => setTimeout(() => { if (mode && D) { pasang(); tampil(true); gambar(); } }, 60)); };
    tunggu();
  }
  window.RiwayatDaerah = {klik, buka};
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", hubungkan) : hubungkan();
})();
