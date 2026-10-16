"use strict";
/* Pop-up "Situasi banjir hari ini": pola dan gaya sama dengan public/sapa.js (karhutla), mesin bersama di public/inti/sapa.js.
   Sekali per hari WIB per peramban (kunci localStorage "pb_sapa" dipakai bersama karhutla); muncul di /banjir dan /banjir/peta.
   Angka dari status.json (S.st), sungai.json, rob.json, peringatan.json; kejadian_aktif_awal.json belum ada, jadi tidak dimuat.
   Skrip klasik, dimuat SETELAH peta.js. Global: S, muatJSON, esc, fmt, namaProv, LEVEL, WARNA_LV, Peta, Analisa, bukaTab, $. */
(() => {
  const {sudah, ik, kartu, IK} = SapaInti;
  if (sudah() || /[?&](wil|k)=/.test(location.search) || !["/banjir", "/banjir/peta"].includes(location.pathname.replace(/\/+$/, ""))) return;
  Object.assign(IK, {
    hujan: '<path d="M7 14a4 4 0 0 1-.5-8A6 6 0 0 1 18 5a4 4 0 0 1-1 9"/><path d="M8 17v3M12 16v4M16 17v3"/>',
    sungai: '<path d="M3 8c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 14c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 20c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/>',
    tetes: '<path d="M12 2.5s-6 6.7-6 11a6 6 0 0 0 12 0c0-4.3-6-11-6-11Z"/>',
    awas: IK.awas});
  const lblProv = k => `<em class="sp-p prov">${esc(namaProv(k))}</em>`;

  async function siap() { for (let i = 0; i < 400 && !(S.meta && S.st && S.sungai); i++) await new Promise(r => setTimeout(r, 150)); return !!(S.st && S.sungai); }

  function hitung(per) {
    const n = [[0, 0, 0, 0], [0, 0, 0, 0]], kec = [], prov = new Map();
    for (const [k, v] of Object.entries(S.st.kec)) { const l = v.b?.[0] || 0, b = v.b?.[1] || 0; n[0][l]++; n[1][b]++;
      if (l < 1) continue; const p = k.split("|"), o = prov.get(p[0]) || prov.set(p[0], {k: p[0], n: [0, 0, 0, 0], h3: 0}).get(p[0]);
      o.n[l]++; o.h3 = Math.max(o.h3, v.h3 || 0); kec.push({k, prov: p[0], kab: p[1], kec: p[2], l, h3: v.h3 || 0}); }
    const sdh = (a, b) => b.l - a.l || b.h3 - a.h3;
    const lg = [0, 0, 0, 0]; for (const v of Object.values(S.st.kec)) lg[v.l?.[0] || 0]++;
    const provTop = [...prov.values()].sort((a, b) => b.n[3] - a.n[3] || b.n[2] - a.n[2] || b.n[1] - a.n[1]).slice(0, 5);
    const sungai = S.sungai.titik.filter(t => t.kelas >= 2), j = S.rob ? S.rob.hari.indexOf(S.st.hari[0]) : -1, rob = j < 0 ? [] : S.rob.titik.filter(t => (t.lv[j] || 0) >= 2);
    const bmkg = (per?.nowcast || []).filter(x => x.selesai && new Date(x.selesai) > Date.now());
    return {n, lg, kec: kec.sort(sdh), provTop, sungai, rob, bmkg, total: n[0][1] + n[0][2] + n[0][3]};
  }

  const baris = (p, i) => `<button class="sp-k" data-k="${esc(p.k)}"><i>${i + 1}</i><span class="sp-nm"><b translate="no">${esc(p.kec)}</b><span translate="no">${esc(p.kab)}</span></span>${lblProv(p.prov)}
    <em class="sp-p ${p.l === 3 ? "merah" : p.l === 2 ? "oranye" : "prov"}">${LEVEL[p.l]}</em><em class="sp-p prov">${fmt(Math.round(p.h3))} mm</em></button>`;

  function html(h) {
    const besok = h.n[1][1] + h.n[1][2] + h.n[1][3], selisih = besok - h.total, arah = selisih > 0 ? `<b class="naik">▲ ${fmt(selisih)}</b> besok` : selisih < 0 ? `<b class="turun">▼ ${fmt(-selisih)}</b> besok` : "sama besok";
    const sek = (judul, isi) => `<section class="sp-sek"><h4>${judul}</h4>${isi}</section>`;
    const awas = [
      h.sungai.length && kartu("sungai", "#1d4e89", "Debit sungai tinggi", `<b>${fmt(h.sungai.length)}</b> titik sungai melewati debit banjir 5 tahunan atau lebih`),
      h.rob.length && kartu("hujan", "#2b8c86", "Pasang laut tinggi", `<b>${fmt(h.rob.length)}</b> titik pantai di atas persentil 99 muka laut`),
      ...h.bmkg.slice(0, 2).map(x => kartu("awas", "#1d4e89", "Peringatan BMKG", esc(x.headline || x.event)))].filter(Boolean).join("");
    return `<div class="sp-hd"><div style="flex:1;min-width:0"><span class="sp-eyh">${ik("tetes")}Situasi banjir hari ini</span>
        <h3 id="spJudul"><b>${fmt(h.total)}</b> kecamatan berstatus banjir, ${arah}</h3>
        <div class="sp-chips"><span class="sp-p putih">${ik("awas")}${fmt(h.n[0][3])} awas · ${fmt(h.n[0][2])} siaga</span><span class="sp-p putih">${ik("hujan")}${fmt(h.lg[1] + h.lg[2] + h.lg[3])} berstatus longsor</span></div>
</div>
        <button class="sp-x" data-tutup aria-label="Tutup">×</button></div>
      <div class="sp-isi">
      ${h.provTop.length ? sek("Provinsi perlu perhatian", `<div class="sp-ps sp-panel">${h.provTop.map(o =>
        `<div class="sp-pv"><b>${esc(namaProv(o.k))}</b><div class="sp-chips">${o.n[3] ? `<em class="sp-p merah">${ik("awas")}${fmt(o.n[3])} awas</em>` : ""}${o.n[2] ? `<em class="sp-p oranye">${fmt(o.n[2])} siaga</em>` : ""}<em class="sp-p prov">${fmt(o.n[1])} waspada</em><em class="sp-p prov">${ik("hujan")}hingga ${fmt(Math.round(o.h3))} mm</em></div></div>`).join("")}</div>`) : ""}
      ${h.kec.length ? sek("Kecamatan status tertinggi", `<div class="sp-ks sp-panel">${h.kec.slice(0, 4).map(baris).join("")}</div>`) : ""}
      ${awas ? sek("Perlu perhatian", `<div class="sp-cs sp-panel">${awas}</div>`) : ""}
      </div>
      <div class="sp-aksi"><span>Sumber: Open-Meteo, GloFAS, InaRISK, BMKG</span><button class="sp-pri" data-tutup>Lihat peta</button></div>`;
  }

  async function tampil() {
    if (!(await siap()) || sudah()) return;
    const per = await muatJSON("data/peringatan.json").catch(() => null);
    SapaInti.dialog(html(hitung(per)), (e, d) => { const b = e.target.closest("[data-k]"); if (!b) return;
      d.close(); const p = b.dataset.k.split("|"); S.jalur = p.slice(0, 2); bukaTab("peta"); Peta.aturWilayah().then(() => Analisa.wilayah(b.dataset.k)); return true; });
  }

  SapaInti.css();
  SapaInti.mulai(tampil);
})();
