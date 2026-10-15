/* sapa.js — pop-up "Situasi hari ini" saat halaman karhutla dibuka. Sekali per hari WIB per peramban (localStorage "pb_sapa"),
   muncul setelah spanduk persetujuan ditutup, dilewati bila halaman dibuka lewat tautan khusus (?… atau /k/…).
   Skrip klasik, dimuat SETELAH skrip utama. Global: S, muatJSON, esc, fmt, namaProv, jamWIB, Laci, bukaTab, $.
   Semua angka dari kluster.json (kompleks aktif), peringatan.json (BMKG), asap.json (CAMS), sama dengan tab lain. */
(() => {
  const KUNCI = "pb_sapa", JAM = 36e5, DAOPS_JAUH = 50, TANPA_DAOPS = 300, ISPU_TS = 55.4;   // > 300 km = wilayah tanpa Daops (Papua, NTT, Sulawesi)
  const hariIni = () => new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"});
  const sudah = () => { try { return localStorage.getItem(KUNCI) === hariIni(); } catch (e) { return false; } };
  const tandai = () => { try { localStorage.setItem(KUNCI, hariIni()); } catch (e) {} };
  if (sudah() || location.search || location.pathname.replace(/\/+$/, "") !== "") return;

  const R_API = /angin|asap|kabut|kebakaran|kering|panas|debu|jarak pandang/i;
  const topKab = (xs, n = 4) => { const m = new Map(); for (const p of xs) { const k = `${p.kab}|${p.prov}`; m.set(k, (m.get(k) || 0) + 1); }
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => { const [kab, prov] = k.split("|"); return {kab, prov, n: v}; }); };
  const pil = (t, w) => `<span class="sp-pil" style="--w:${w}">${t}</span>`;
  const baris = p => `<button class="sp-k" data-k="${esc(p.id)}"><b>${esc(p.kab)}</b><span>${esc(p.kec || "")} · ${esc(namaProv(p.prov))}</span>
    <em>${p.hari} hari${p.gambut ? " · gambut" : ""}</em></button>`;

  async function siap() { for (let i = 0; i < 400 && !(S.meta && S.kluster); i++) await new Promise(r => setTimeout(r, 150)); return !!S.kluster; }

  function hitung(per, asap) {
    const acuan = new Date(S.meta.data_terakhir || S.meta.dibuat).getTime();
    const aktif = S.kluster.features.map(f => f.properties).filter(p => p.awal);
    const nyala = aktif.filter(p => p.jam_sejak <= 24);
    const baru = aktif.filter(p => acuan - new Date(p.awal) <= 24 * JAM);
    const lama = nyala.filter(p => p.hari > 2).sort((a, b) => b.hari - a.hari || b.n - a.n);
    const ini = aktif.reduce((s, p) => s + (p.ini || 0), 0), kmrn = aktif.reduce((s, p) => s + (p.kmrn || 0), 0);
    const gambut = nyala.filter(p => p.gambut);
    const siaga = nyala.filter(p => p.level >= 2), jauh = siaga.filter(p => p.jarak_daops > DAOPS_JAUH && p.jarak_daops <= TANPA_DAOPS), tanpa = siaga.filter(p => p.jarak_daops > TANPA_DAOPS);
    const bmkg = (per?.nowcast || []).filter(x => x.selesai && new Date(x.selesai) > Date.now() && R_API.test(x.event + " " + (x.headline || "")));
    /* asap: PM2.5 maks hari ini di sel 1° tempat kompleks menyala, dikelompokkan per kabupaten */
    const asapKab = new Map();
    if (asap?.grid) { const hi = Math.max(0, asap.hari.indexOf(hariIni())), sel = new Map(asap.grid.map(g => [`${g[0]},${g[1]}`, g[2][hi]]));
      const pusat = v => Math.floor(v) + .5;
      for (const p of nyala) { const pm = sel.get(`${pusat(p.lat)},${pusat(p.lon)}`); if (pm >= ISPU_TS) { const k = `${p.kab}|${p.prov}`; asapKab.set(k, Math.max(asapKab.get(k) || 0, pm)); } } }
    return {ini, kmrn, baru, lama, gambut, nyala, jauh, tanpa, bmkg, asapKab: [...asapKab].sort((a, b) => b[1] - a[1])};
  }

  function html(h) {
    const naik = h.ini - h.kmrn, arah = naik > 0 ? `naik ${fmt(naik)}` : naik < 0 ? `turun ${fmt(-naik)}` : "sama";
    const sek = (judul, isi) => `<section class="sp-sek"><h4>${judul}</h4>${isi}</section>`;
    const kab = topKab(h.baru).map(x => pil(`${esc(x.kab)} <b>${x.n}</b>`, "#e58a45")).join("");
    return `<div class="dh"><div style="flex:1"><h3 id="spJudul">Situasi karhutla hari ini</h3>
        <div class="dh-cs"><span class="dh-c">Data ${jamWIB(S.meta.data_terakhir || S.meta.dibuat)}</span></div></div>
        <button class="sp-x" data-tutup aria-label="Tutup">×</button></div>
      <div class="sp-isi">
      <div class="sp-angka"><div><b>${fmt(h.ini)}</b><span>titik api hari ini<br><small>${arah} dari kemarin</small></span></div>
        <div><b>${fmt(h.baru.length)}</b><span>kompleks api baru<br><small>muncul 24 jam terakhir</small></span></div>
        <div><b>${fmt(h.lama.length)}</b><span>kompleks bertahan<br><small>lebih dari 2 hari, masih menyala</small></span></div></div>
      ${h.baru.length ? sek("Kompleks baru terbanyak di", `<div class="sp-pils">${kab}</div>`) : ""}
      ${h.lama.length ? sek("Bertahan paling lama", `<div class="sp-ks">${h.lama.slice(0, 4).map(baris).join("")}</div>`) : ""}
      ${sek("Perlu perhatian", `<ul class="sp-ul">
        <li><b>${fmt(h.gambut.length)}</b> dari ${fmt(h.nyala.length)} kompleks yang menyala ada di <b>lahan gambut</b>, paling sulit dipadamkan.</li>
        ${h.jauh.length ? `<li><b>${fmt(h.jauh.length)}</b> kompleks siaga/prioritas berjarak <b>${DAOPS_JAUH}–${TANPA_DAOPS} km</b> dari Daops terdekat, terbanyak di ${topKab(h.jauh, 3).map(x => esc(x.kab)).join(", ")}.</li>` : ""}
        ${h.tanpa.length ? `<li><b>${fmt(h.tanpa.length)}</b> kompleks siaga/prioritas ada di wilayah <b>tanpa Daops</b> (terdekat lebih dari ${TANPA_DAOPS} km), terbanyak di ${topKab(h.tanpa, 3).map(x => esc(x.kab)).join(", ")}.</li>` : ""}
        ${h.asapKab.length ? `<li><b>Asap tidak sehat</b> (perkiraan PM2.5 ≥ ${fmt(ISPU_TS)} µg/m³, model CAMS) di ${h.asapKab.slice(0, 4).map(([k, v]) => `${esc(k.split("|")[0])} (${fmt(v)})`).join(", ")}${h.asapKab.length > 4 ? ` dan ${h.asapKab.length - 4} kabupaten lain` : ""}.</li>` : ""}
        ${h.bmkg.length ? h.bmkg.slice(0, 2).map(x => `<li><b>BMKG:</b> ${esc(x.headline || x.event)}.</li>`).join("") : ""}</ul>`)}
      </div>
      <div class="sp-aksi"><button class="sp-pri" data-tutup>Lihat peta</button></div>`;
  }

  async function tampil() {
    if (!(await siap()) || sudah()) return;
    const [per, asap] = await Promise.all([muatJSON("data/peringatan.json").catch(() => null), muatJSON("data/asap.json").catch(() => null)]);
    const d = document.createElement("dialog"); d.className = "dlg sp"; d.setAttribute("aria-labelledby", "spJudul");
    d.innerHTML = html(hitung(per, asap)); document.body.appendChild(d);
    d.addEventListener("click", e => {
      const k = e.target.closest("[data-k]"); if (k) { d.close(); return Laci.buka(k.dataset.k); }
      if (e.target.closest("[data-tutup]") || e.target === d) d.close(); });
    d.addEventListener("close", () => { tandai(); d.remove(); });
    d.showModal();
  }

  document.head.insertAdjacentHTML("beforeend", `<style>
.sp{width:min(560px,calc(100vw - 24px))}
.sp .sp-x{border:0;background:var(--surface);color:var(--ink);width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer}
.sp-isi{padding:16px 20px;display:grid;gap:16px}
.sp-angka{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sp-angka>div{background:var(--surface);border-radius:14px;padding:12px;display:grid;gap:4px}
.sp-angka b{font:800 26px/1 var(--display);color:var(--brand2)}
.sp-angka span{font-size:12.5px;font-weight:600;line-height:1.3}.sp-angka small{font-weight:400;color:var(--ink2)}
.sp-sek h4{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink2);margin:0 0 8px}
.sp-pils{display:flex;flex-wrap:wrap;gap:6px}
.sp-pil{font-size:12.5px;padding:4px 10px;border-radius:999px;background:color-mix(in oklch,var(--w) 16%,transparent);color:var(--ink)}
.sp-ks{display:grid;gap:6px}
.sp-k{display:grid;grid-template-columns:1fr auto;gap:2px 10px;text-align:left;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:12px;padding:9px 12px;cursor:pointer;font:inherit}
.sp-k:hover{background:var(--surface)}.sp-k span{font-size:12px;color:var(--ink2)}.sp-k em{grid-row:1/3;grid-column:2;align-self:center;font-style:normal;font-weight:700;font-size:12.5px;color:#c9503a}
.sp-ul{margin:0;padding-left:18px;display:grid;gap:6px;font-size:13.5px;line-height:1.45}
.sp-aksi{padding:0 20px 18px;display:flex}
.sp-pri{flex:1;min-height:44px;border:0;border-radius:12px;background:var(--brand2);color:#fff;font:700 14px var(--font);cursor:pointer}
@media (max-width:520px){.sp-angka{grid-template-columns:1fr}.sp-angka>div{grid-template-columns:auto 1fr;align-items:center;gap:12px}}
</style>`);

  /* tunggu spanduk persetujuan selesai supaya dua lapisan tidak bertumpuk */
  const mulai = () => document.querySelector(".pv-kartu") ? document.addEventListener("pb-persetujuan", () => setTimeout(tampil, 400), {once: true}) : tampil();
  document.readyState === "complete" ? setTimeout(mulai, 300) : addEventListener("load", () => setTimeout(mulai, 300));
})();
