"use strict";
/* ================================================================ foto */
/* Tab Foto banjir: galeri foto lapangan warga, rupa sama dengan tab Foto karhutla (kartu fg-k, urutan, saring provinsi dan kategori, paginasi 24; gaya dari public/foto.css).
   Hanya baca: GET /api/foto?bencana=banjir (server menyaring; migrasi 0012 belum dijalankan = daftar kosong, bukan galat).
   Pengiriman foto belum dipasang di sini: tombolnya baru ada setelah server menerima kategori banjir (A18). */
const Foto = (() => {
  const API = "/api/foto", PER = 24;
  const KAT = {genangan: ["Genangan", "#3f7fb8"], arus: ["Arus", "#2b8c86"], longsor: ["Longsor", "#9a7448"], rob: ["Rob", "#5f6fb0"], evakuasi: ["Evakuasi", "#e58a45"], lainnya: ["Lainnya", "#3d9461"]};
  const IKAT = {genangan: '<path d="M2 16c2 0 2-1.5 4-1.5S8 16 10 16s2-1.5 4-1.5S16 16 18 16s2-1.5 4-1.5M2 20c2 0 2-1.5 4-1.5S8 20 10 20s2-1.5 4-1.5S16 20 18 20s2-1.5 4-1.5M12 3c2 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2-5 4-8z"/>',
    arus: '<path d="M3 8h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 18h7"/>', longsor: '<path d="M3 20 9 8l4 6 3-4 5 10zM14 4l2 2"/>', rob: '<path d="M2 15c2 0 2-1.5 4-1.5S8 15 10 15s2-1.5 4-1.5S16 15 18 15s2-1.5 4-1.5M2 19c2 0 2-1.5 4-1.5S8 19 10 19s2-1.5 4-1.5S16 19 18 19M12 3v6M9 6l3-3 3 3"/>',
    evakuasi: '<circle cx="12" cy="5" r="2"/><path d="M12 8v6l-3 5M12 14l3 5M8 11h8"/>', lainnya: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>'};
  const ikat = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKAT[k] || IKAT.lainnya}</svg>`;
  const IK = {kamera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    jam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    naik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 4 4 13h5v7h6v-7h5z"/></svg>',
    kom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    mata: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'};
  const URUT = [["baru", "Terbaru", "jam"], ["suka", "Paling banyak dukungan", "naik"], ["komentar", "Paling dikomentari", "kom"], ["dilihat", "Paling dilihat", "mata"]];
  const G = {urut: "baru", prov: [], kat: "", h: 0};
  let semua = null;
  const lalu = t => { const m = Math.max(0, (Date.now() - t) / 6e4); return m < 1 ? "baru saja" : m < 60 ? `${Math.floor(m)} mnt lalu` : m < 1440 ? `${Math.floor(m / 60)} jam lalu` : `${Math.floor(m / 1440)} hari lalu`; };
  async function muat() {
    if (semua) return semua;
    try { const r = await fetch(API + "?bencana=banjir", {credentials: "same-origin"}); semua = r.ok ? (await r.json()).foto || [] : []; } catch (e) { semua = []; }
    return semua; }
  const stat = (ik, n) => `<span>${ik}${fmt(n || 0)}</span>`;
  const kartu = f => { const [k, w] = KAT[f.kategori] || KAT.lainnya;
    return `<button type="button" class="fg-k" data-fid="${esc(f.id)}" aria-label="${esc(`${k} di ${f.kec}, ${f.kab}`)}"><span class="fg-g"><img loading="lazy" decoding="async" alt="" src="${API}/thumb/${encodeURIComponent(f.id)}" onerror="this.style.visibility='hidden'">${f.contoh ? '<span class="fl-contoh">contoh</span>' : ""}
      <span class="fg-kat" style="--k:${w}">${ikat(f.kategori)}${k}</span>
      <span class="fg-bawah"><span class="fg-t"><b>Kec. ${esc(f.kec)}</b><small>${esc(f.kab)} · ${esc(namaProv(f.prov))} · ${lalu(f.diambil || f.dibuat)}</small></span>
      <span class="fg-st">${stat(IK.naik, f.suka)}${stat(IK.kom, f.komentar)}${stat(IK.mata, f.dilihat)}</span></span></span></button>`; };
  const tersaring = () => semua.filter(f => (!G.prov.length || G.prov.includes(f.prov)) && (!G.kat || f.kategori === G.kat));
  function isi() {
    const el = $("#flIsi"); if (!el) return;
    const kunci = {baru: f => f.diambil || f.dibuat, suka: f => f.suka || 0, komentar: f => f.komentar || 0, dilihat: f => f.dilihat || 0}[G.urut];
    const xs = tersaring().sort((a, b) => kunci(b) - kunci(a) || b.dibuat - a.dibuat), nH = Math.max(1, Math.ceil(xs.length / PER)); G.h = Math.min(G.h, nH - 1);
    el.innerHTML = xs.length ? `<div class="fg-grid">${xs.slice(G.h * PER, (G.h + 1) * PER).map(kartu).join("")}</div>` : `<div class="fl-kosong">${IK.kamera}<b>Tidak ada foto untuk saringan ini</b></div>`;
    const ke = (i, t, lbl) => `<button data-h="${i}"${i < 0 || i >= nH ? " disabled" : ""} aria-label="${lbl}">${t}</button>`;
    $("#fgPg").innerHTML = nH > 1 ? `<span class="fg-pg-info">${fmt(G.h * PER + 1)}–${fmt(Math.min((G.h + 1) * PER, xs.length))} dari ${fmt(xs.length)}</span><nav class="fg-pg-nav" aria-label="Halaman">${ke(G.h - 1, "‹<span> Sebelumnya</span>", "Halaman sebelumnya")}${Array.from({length: nH}, (_, i) => `<button data-h="${i}" aria-pressed="${i === G.h}">${i + 1}</button>`).join("")}${ke(G.h + 1, "<span>Berikutnya </span>›", "Halaman berikutnya")}</nav>` : ""; }
  function rinci(id) {
    const f = semua.find(x => x.id === id); if (!f) return; const [k] = KAT[f.kategori] || KAT.lainnya, d = $("#dlg");
    d.innerHTML = `<div class="dh"><div><h3 id="dlgJudul">${esc(k)} di Kec. ${esc(f.kec)}</h3><p>${esc(f.kab)}, ${esc(namaProv(f.prov))} · ${jamWIB(f.diambil || f.dibuat)}</p></div><button aria-label="Tutup" data-tutup>×</button></div>
      <div class="db"><img alt="${esc(f.keterangan || k)}" style="width:100%;border-radius:12px" src="${API}/media/${encodeURIComponent(f.id)}">${f.keterangan ? `<p>${esc(f.keterangan)}</p>` : ""}</div>`;
    d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = ev => { if (ev.target === d) d.close(); }; d.showModal(); }
  async function render() {
    const el = $("#foto"); if (!el) return;
    if (!el.dataset.siap) {
      el.dataset.siap = 1;
      el.innerHTML = `<div class="fl-wrap"><div class="fg-panel" id="fgSaring"></div><div class="fg-panel fg-isi"><div id="flIsi" class="fl-isi"><div class="fl-skel"></div><div class="fl-skel"></div><div class="fl-skel"></div></div><div class="fg-pg" id="fgPg"></div></div></div>`;
      el.addEventListener("click", e => {
        const u = e.target.closest("[data-u]"); if (u) { G.urut = u.dataset.u; G.h = 0; el.querySelectorAll("[data-u]").forEach(b => b.setAttribute("aria-pressed", b === u)); return nanti(isi); }
        const k = e.target.closest("[data-k]"); if (k) { G.kat = G.kat === k.dataset.k ? "" : k.dataset.k; G.h = 0; el.querySelectorAll("[data-k]").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === G.kat)); return nanti(isi); }
        const h = e.target.closest("[data-h]"); if (h && !h.disabled) { G.h = +h.dataset.h; return nanti(() => { isi(); el.scrollIntoView({block: "start"}); }); }
        const c = e.target.closest("[data-fid]"); if (c) rinci(c.dataset.fid); });
      el.addEventListener("change", e => { const m = e.target.closest("input[data-fp]"); if (!m) return; const box = m.closest(".pm-menu");
        if (!m.value) box.querySelectorAll("input[value]:not([value=''])").forEach(x => x.checked = false); else box.querySelector("input[value='']").checked = false;
        G.prov = [...box.querySelectorAll("input:checked")].map(x => x.value).filter(Boolean); if (!G.prov.length) box.querySelector("input[value='']").checked = true;
        box.closest("details").querySelector("summary").textContent = !G.prov.length ? "Semua provinsi" : G.prov.length === 1 ? namaProv(G.prov[0]) : G.prov.length + " provinsi"; G.h = 0; nanti(isi); }); }
    await muat();
    if (!semua.length) { $("#flIsi").innerHTML = `<div class="fl-ajak" style="cursor:default"><span class="fl-bingkai"><span class="fl-lensa">${IK.kamera}</span></span><b>Belum ada foto banjir</b><small>Foto lapangan dari warga muncul di sini setelah disetujui admin.</small></div>`; $("#fgSaring")?.remove(); return; }
    const pv = [...new Set(semua.map(f => f.prov))].sort((a, b) => namaProv(a).localeCompare(namaProv(b)));
    $("#fgSaring").innerHTML = `<div class="fg-atas"><div class="fl-seg" role="group" aria-label="Urutkan">${URUT.map(([k, n, i]) => `<button data-u="${k}" aria-pressed="${k === G.urut}">${IK[i]}${n}</button>`).join("")}</div></div>
      <div class="fg-saring">${pv.length > 1 ? `<div id="fgProv"><details class="pmulti"><summary>Semua provinsi</summary><div class="pm-menu"><label><input type="checkbox" data-fp value="" checked><span>Semua provinsi (${pv.length})</span></label>${pv.map(k => `<label><input type="checkbox" data-fp value="${k}"><span>${esc(namaProv(k))}</span></label>`).join("")}</div></details></div>` : ""}
        <div class="fl-chip" role="group" aria-label="Kategori">${Object.entries(KAT).map(([k, [n, w]]) => `<button data-k="${k}" style="--k:${w}" aria-pressed="false">${ikat(k)}${n}</button>`).join("")}</div></div>`;
    isi(); }
  return {render};
})();
