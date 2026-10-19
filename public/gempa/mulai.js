"use strict";
/* ================================================================ data */
async function muatData() {
  const [geo, prov, meta, bahaya] = await Promise.all([muatJSON("../geo/provinsi.json"), muatJSON("data/riwayat_prov.json").catch(() => ({nama: {}})),
    muatJSON("data/meta.json").catch(() => ({})), muatJSON("data/bahaya_meta.json").catch(() => ({atribusi: {}}))]);
  S.geo = geo; S.nama = prov.nama || {};
  S.atr = {usgs: meta.atribusi, lempeng: bahaya.atribusi?.["batas_lempeng.geojson"], bahaya: bahaya.atribusi?.["inarisk_gempa.json"]};
  /* gempa hidup dari D1 (cron Worker). Tabel belum ada / sumber mati = keadaan tanpa data, bukan galat. */
  const d = await fetch("/api/gempa/terbaru?jam=168").then(r => r.ok ? r.json() : null).catch(() => null);
  S.tersedia = !!d?.dibuat;
  S.gempa = (d?.gempa || []).map(g => ({...g, t: Date.parse(g.waktu)}));
  S.dibuat = d?.dibuat || null;
  $("#upd").textContent = S.dibuat ? "Data " + jamWIB(S.dibuat) : "Belum ada data";
}

/* ================================================================ cari: provinsi dan lokasi gempa */
$("#cari").addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase(), h = $("#hasil"); if (q.length < 2) { h.hidden = true; return; }
  const prov = Object.entries(S.nama).filter(([, n]) => n.toLowerCase().includes(q)).slice(0, 6).map(([k, n]) => `<button data-k="${esc(k)}">${esc(n)}<br><small>Provinsi</small></button>`),
    gem = S.gempa.filter(g => g.wilayah.toLowerCase().includes(q)).slice(0, 6).map(g => `<button data-g="${esc(g.id)}">${esc(wilayahPendek(g.wilayah))}<br><small>${mTulis(g.m)} · ${esc(waktuGempa(g.waktu))}</small></button>`);
  h.innerHTML = [...prov, ...gem].join("") || `<div class="kosong" style="padding:12px">Tidak ditemukan.</div>`; h.hidden = false; });
$("#hasil").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; $("#hasil").hidden = true; $("#cari").value = "";
  if (b.dataset.k) return turun(b.dataset.k);
  const g = S.gempa.find(x => x.id === b.dataset.g); if (g) Peta.pilih(g); });

addEventListener("bahasa", () => { if (S.gempa) { renderDaftar(); renderPita(); } });   /* teks wilayah mengikuti bahasa (wilayahPendek) */
pasangTip(); /* tooltip [data-tip] bersama (inti/tip.js) */
PilihCantik.pasang();

/* ================================================================ mulai */
(async () => {
  try { await muatData(); } catch (e) { $("#muat").innerHTML = `<div><b>Data belum tersedia.</b><br>${esc(e.message)}</div>`; return; }
  renderRentang(); await Peta.init(); renderCrumb(); renderDaftar(); renderPita(); renderLegenda();
  $("#muat").classList.add("hilang");
  /* /gempa/<tab> bersih; tab tanpa isi jatuh ke Peta */
  const j = location.pathname.replace(/^\/gempa\/?/, "").replace(/\/+$/, "").replace(/^index\.html$/, "");
  const kj = j.match(/^k\/(G\d+)$/);
  if (kj) Kejadian.buka(kj[1], false);
  else if (TABS.some(t => t[0] === j) && halamanAda(j)) bukaTab(j, false);
  else if (j) history.replaceState(null, "", "/gempa/peta");
  /* segarkan tiap 5 menit selama halaman terbuka (cron Worker mengisi D1 tiap menit) */
  setInterval(async () => { if (document.hidden) return; await muatData().catch(() => {}); Peta.segarkan(); renderDaftar(); renderPita(); }, 5 * 60e3);
})();
/* panel kiri & kanan bisa ditarik untuk dilebarkan; lebar diingat per perangkat (pola banjir/mulai.js) */
(() => { const atur = (el, kunci, sisi, min, max) => { if (!el) return; const w0 = bacaLokal(kunci, null); if (w0 && innerWidth > 900) el.style.width = w0 + "px";
  const h = document.createElement("div"); h.className = "tarik"; h.title = "Tarik untuk mengubah lebar"; h.setAttribute("role", "separator"); h.setAttribute("aria-orientation", "vertical"); el.appendChild(h);
  h.addEventListener("pointerdown", e => { e.preventDefault(); h.setPointerCapture(e.pointerId); h.classList.add("aktif"); const x0 = e.clientX, w = el.getBoundingClientRect().width;
    const gerak = ev => { const lebar = Math.max(min, Math.min(max, w + (sisi === "kanan" ? ev.clientX - x0 : x0 - ev.clientX))); el.style.width = lebar + "px"; };
    const lepas = () => { h.classList.remove("aktif"); h.removeEventListener("pointermove", gerak); h.removeEventListener("pointerup", lepas); simpanLokal(kunci, Math.round(el.getBoundingClientRect().width)); if (peta) peta.resize(); };
    h.addEventListener("pointermove", gerak); h.addEventListener("pointerup", lepas); });
  h.addEventListener("dblclick", () => { el.style.width = ""; simpanLokal(kunci, null); }); };
  atur(document.querySelector(".panel"), "lebar-panel", "kanan", 320, Math.min(900, innerWidth * .6));
  atur(document.querySelector(".tools"), "lebar-tools", "kiri", 220, 520); })();
document.addEventListener("click", e => { const d = document.querySelector(".bencana"); if (d && d.open && !e.target.closest(".bencana")) d.open = false; });
