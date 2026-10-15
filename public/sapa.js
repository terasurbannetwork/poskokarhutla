/* sapa.js — pop-up "Situasi hari ini" saat halaman karhutla dibuka. Sekali per hari WIB per peramban (localStorage "pb_sapa"),
   muncul setelah spanduk persetujuan ditutup, dilewati bila halaman dibuka lewat tautan khusus (?… atau /k/…).
   Skrip klasik, dimuat SETELAH skrip utama. Global: S, muatJSON, esc, fmt, namaProv, jamWIB, Laci, bukaTab, $.
   Semua angka dari kluster.json (kompleks aktif), peringatan.json (BMKG), asap.json (CAMS), sama dengan tab lain. */
(() => {
  const KUNCI = "pb_sapa", JAM = 36e5, DAOPS_JAUH = 50, TANPA_DAOPS = 300, ISPU_TS = 55.4, ISPU_PM10 = 150;   // > 300 km = wilayah tanpa Daops (Papua, NTT, Sulawesi)
  const hariIni = () => new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"});
  const sudah = () => { try { return localStorage.getItem(KUNCI) === hariIni(); } catch (e) { return false; } };
  const tandai = () => { try { localStorage.setItem(KUNCI, hariIni()); } catch (e) {} };
  /* muncul di halaman depan dan /peta (pemilik, 15 Okt 2026); tautan khusus (?wil=…, /k/…) tetap dilewati */
  if (sudah() || /[?&](wil|k|kl|f)=/.test(location.search) || !["", "/peta"].includes(location.pathname.replace(/\/+$/, ""))) return;

  const R_API = /angin|asap|kabut|kebakaran|kering|panas|debu|jarak pandang/i;
  const topKab = (xs, n = 4) => { const m = new Map(); for (const p of xs) { const k = `${p.kab}|${p.prov}`; m.set(k, (m.get(k) || 0) + 1); }
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => { const [kab, prov] = k.split("|"); return {kab, prov, n: v}; }); };
  const IK = {api: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6 1-8.5z"/>',
    jam: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    daun: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    perisai: '<path d="M12 3 4.5 6v6c0 4.5 3.2 8 7.5 9 4.3-1 7.5-4.5 7.5-9V6z"/>',
    jauh: '<circle cx="12" cy="10" r="2.5"/><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/>',
    asap: '<path d="M4 14h11a3 3 0 1 0-3-3M3 18h14a3 3 0 1 1-3 3M6 10h4"/>',
    awas: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>'};
  const ik = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IK[k]}</svg>`;
  const lblProv = k => `<em class="sp-p prov">${esc(namaProv(k))}</em>`;
  const baris = (p, i) => `<button class="sp-k" data-k="${esc(p.id)}"><i>${i + 1}</i><span class="sp-nm"><b translate="no">${esc(p.kab)}</b><span translate="no">${esc(p.kec || "")}</span></span>${lblProv(p.prov)}
    <em class="sp-p merah">${p.hari} hari</em>${p.gambut ? `<em class="sp-p gambut">${ik("daun")}Gambut</em>` : "<em></em>"}</button>`;
  const kartu = (k, w, label, isi) => `<div class="sp-c" style="--w:${w}"><span class="sp-ci">${ik(k)}</span><div><b class="sp-ey">${label}</b><p>${isi}</p></div></div>`;
  const daftar = xs => `<span translate="no">${xs.map(x => esc(x.kab)).join(", ")}</span>`;

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
    /* asap: PM2.5 dan PM10 (kolom 2 dan 7) maks hari ini di sel 1° tempat kompleks menyala, dikelompokkan per kabupaten */
    const asapKab = new Map(), pm10Kab = new Map();
    if (asap?.grid) { const hi = Math.max(0, asap.hari.indexOf(hariIni())), sel = new Map(asap.grid.map(g => [`${g[0]},${g[1]}`, g]));
      const pusat = v => Math.floor(v) + .5;
      for (const p of nyala) { const g = sel.get(`${pusat(p.lat)},${pusat(p.lon)}`); if (!g) continue; const k = `${p.kab}|${p.prov}`, pm = g[2][hi], p10 = g[7]?.[hi];
        if (pm >= ISPU_TS) asapKab.set(k, Math.max(asapKab.get(k) || 0, pm));
        if (p10 >= ISPU_PM10) pm10Kab.set(k, Math.max(pm10Kab.get(k) || 0, p10)); } }
    /* per provinsi: titik hari ini, kompleks baru 24 jam, bertahan > 2 hari, menyala di gambut */
    const prov = new Map(), q = k => prov.get(k) || prov.set(k, {k, ini: 0, kmrn: 0, baru: 0, lama: 0, gambut: 0}).get(k);
    for (const p of aktif) { const o = q(p.prov); o.ini += p.ini || 0; o.kmrn += p.kmrn || 0; }
    for (const p of baru) q(p.prov).baru++;
    for (const p of lama) q(p.prov).lama++;
    for (const p of gambut) q(p.prov).gambut++;
    const provAwas = [...prov.values()].filter(o => o.ini > 0).sort((a, b) => b.ini - a.ini).slice(0, 5);
    return {pm10Kab: [...pm10Kab].sort((a, b) => b[1] - a[1]), ini, kmrn, baru, provAwas, lama, gambut, nyala, jauh, tanpa, bmkg, asapKab: [...asapKab].sort((a, b) => b[1] - a[1])};
  }

  function html(h) {
    const naik = h.ini - h.kmrn, arah = naik > 0 ? `<b class="naik">▲ ${fmt(naik)}</b> dari kemarin` : naik < 0 ? `<b class="turun">▼ ${fmt(-naik)}</b> dari kemarin` : "sama dengan kemarin";
    const sek = (judul, isi) => `<section class="sp-sek"><h4>${judul}</h4>${isi}</section>`;
    const kab = topKab(h.baru, 5), maks = kab[0]?.n || 1;
    const bar = kab.map(x => `<div class="sp-b"><span><b translate="no">${esc(x.kab)}</b>${lblProv(x.prov)}</span><i><u style="--p:${Math.max(3, x.n / maks * 100)}%"></u></i><b>${fmt(x.n)}</b></div>`).join("");
    const pm = h.asapKab[0]?.[1], p10 = h.pm10Kab[0]?.[1];
    const kabAsap = xs => `<span translate="no">${xs.slice(0, 3).map(([k]) => esc(k.split("|")[0])).join(", ")}</span>`;
    const awas = [
      h.gambut.length && kartu("daun", "#8a5a3c", "Lahan gambut", `<b>${fmt(h.gambut.length)}</b> dari ${fmt(h.nyala.length)} kompleks menyala di gambut, paling sulit dipadamkan`),
      h.jauh.length && kartu("jauh", "#d9822b", `${DAOPS_JAUH}–${TANPA_DAOPS} km dari Daops`, `<b>${fmt(h.jauh.length)}</b> kompleks siaga jauh dari Daops, terbanyak di ${daftar(topKab(h.jauh, 3))}`),
      h.tanpa.length && kartu("perisai", "#c9503a", "Tanpa Daops", `<b>${fmt(h.tanpa.length)}</b> kompleks siaga tanpa Daops dalam ${TANPA_DAOPS} km, terbanyak di ${daftar(topKab(h.tanpa, 3))}`),
      (pm || p10) && kartu("asap", "#6d6a66", "Asap tidak sehat", [pm && `PM2.5 hingga <b>${fmt(pm)} µg/m³</b> di ${fmt(h.asapKab.length)} kabupaten, antara lain ${kabAsap(h.asapKab)}`,
        p10 && `PM10 hingga <b>${fmt(p10)} µg/m³</b> di ${fmt(h.pm10Kab.length)} kabupaten, antara lain ${kabAsap(h.pm10Kab)}`].filter(Boolean).join("<br>")),
      ...h.bmkg.slice(0, 2).map(x => kartu("awas", "#1d4e89", "Peringatan BMKG", esc(x.headline || x.event)))].filter(Boolean).join("");
    return `<div class="sp-hd"><div style="flex:1;min-width:0"><span class="sp-eyh">${ik("api")}Situasi karhutla hari ini</span>
        <h3 id="spJudul"><b>${fmt(h.ini)}</b> titik api terdeteksi, ${arah}</h3>
        <div class="sp-chips"><span class="sp-p putih">${ik("api")}${fmt(h.baru.length)} kompleks baru · 24 jam</span><span class="sp-p putih">${ik("jam")}${fmt(h.lama.length)} bertahan &gt; 2 hari</span></div>
</div>
        <button class="sp-x" data-tutup aria-label="Tutup">×</button></div>
      <div class="sp-isi">
      ${h.provAwas.length ? sek("Provinsi perlu perhatian", `<div class="sp-ps sp-panel">${h.provAwas.map(o => { const d = o.ini - o.kmrn;
        return `<div class="sp-pv"><b>${esc(namaProv(o.k))}</b><div class="sp-chips"><em class="sp-p oranye">${ik("api")}${fmt(o.ini)} titik api${d ? ` · ${d > 0 ? "▲" : "▼"} ${fmt(Math.abs(d))}` : ""}</em>${o.baru ? `<em class="sp-p prov">${fmt(o.baru)} kompleks baru</em>` : ""}${o.lama ? `<em class="sp-p merah">${ik("jam")}${fmt(o.lama)} bertahan &gt; 2 hari</em>` : ""}${o.gambut ? `<em class="sp-p gambut">${ik("daun")}${fmt(o.gambut)} di gambut</em>` : ""}</div></div>`; }).join("")}</div>`) : ""}
      ${kab.length ? sek("Kompleks baru terbanyak", `<div class="sp-bs sp-panel">${bar}</div>`) : ""}
      ${h.lama.length ? sek("Bertahan paling lama", `<div class="sp-ks sp-panel">${h.lama.slice(0, 4).map(baris).join("")}</div>`) : ""}
      ${awas ? sek("Perlu perhatian", `<div class="sp-cs sp-panel">${awas}</div>`) : ""}
      </div>
      <div class="sp-aksi"><span>Sumber: NASA FIRMS, Copernicus CAMS, BMKG</span><button class="sp-pri" data-tutup>Lihat peta</button></div>`;
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
/* satu kolom: kepala tetap, isi digulir, tombol menempel di bawah (tidak pernah terpotong) */
dialog.sp{width:min(560px,calc(100vw - 24px));max-height:min(760px,calc(100dvh - 32px));overflow:hidden;padding:0;border:0;border-radius:22px}
dialog.sp[open]{display:flex;flex-direction:column}
.sp svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.sp-hd{flex:none;display:flex;gap:12px;align-items:flex-start;padding:20px 22px 18px;background:linear-gradient(135deg,#0b2545,#163a66);color:#fff}
.sp-eyh{display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#f5a06b}
.sp-hd h3{font:700 20px/1.3 var(--display);letter-spacing:-.01em;margin:8px 0 12px;color:#fff}
.sp-hd h3>b{color:#ff9a6b}.sp-hd h3 .naik{color:#ff9a6b}.sp-hd h3 .turun{color:#7fd6a4}
.sp-chips{display:flex;flex-wrap:wrap;gap:6px}
.sp-eyh svg{width:18px;height:18px}
.sp .sp-x{border:0;background:rgb(255 255 255 / .14);color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;line-height:1;cursor:pointer;flex:none}
.sp .sp-x:hover{background:rgb(255 255 255 / .24)}
.sp-p{display:inline-flex;align-items:center;gap:5px;font-style:normal;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap;line-height:1.3}
.sp-p.putih{background:rgb(255 255 255 / .12);color:#fff}
.sp-p.merah{background:color-mix(in oklch,#c9503a 12%,var(--card));color:#b5412c}
.sp-p.prov{background:color-mix(in oklch,#1d4e89 10%,var(--card));color:#1d4e89}
.sp-p.oranye{background:color-mix(in oklch,#e8743b 14%,var(--card));color:#b8521f}
.sp-p.gambut{background:color-mix(in oklch,#8a5a3c 12%,var(--card));color:#7a4a2c}
.sp-isi{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:20px 22px 8px;display:grid;gap:20px;align-content:start}
.sp-sek h4{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ink2);margin:0 0 8px}
.sp-panel{border:1px solid var(--line);border-radius:16px}
.sp-bs{display:grid;gap:10px;padding:14px 16px}
.sp-b{display:grid;grid-template-columns:minmax(0,1.25fr) 1fr 40px;align-items:center;gap:12px;font-size:13.5px}
.sp-b>span{display:flex;align-items:center;gap:8px;min-width:0}.sp-b>span>b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-ps{display:grid;padding:2px 0}
.sp-pv{display:grid;gap:7px;padding:12px 16px;border-top:1px solid var(--line);font-size:14px}.sp-pv:first-child{border-top:0}
.sp-b i{display:block;height:8px;border-radius:4px;background:color-mix(in oklch,var(--ink) 8%,transparent);overflow:hidden}
.sp-b u{display:block;height:100%;width:var(--p);border-radius:4px;background:#e8743b}
.sp-b>b{text-align:right;font-variant-numeric:tabular-nums}
.sp-ks{display:grid;padding:2px 0}
.sp-k{display:grid;grid-template-columns:20px minmax(0,1fr) auto auto 84px;align-items:center;gap:10px;text-align:left;border:0;border-top:1px solid var(--line);background:none;color:var(--ink);padding:11px 16px;cursor:pointer;font:inherit;font-size:13.5px}
.sp-k:first-child{border-top:0}.sp-k:hover{background:color-mix(in oklch,var(--ink) 4%,transparent)}
.sp-k:focus-visible{outline:3px solid #e3b94e;outline-offset:-3px}
.sp-k i{font-style:normal;font-size:11.5px;font-weight:800;color:var(--ink2)}
.sp-nm{display:grid;min-width:0}.sp-nm span{font-size:12px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-k em:last-child{justify-self:start}
.sp-cs{display:grid;padding:2px 0}
.sp-c{display:flex;gap:12px;align-items:flex-start;padding:13px 16px;border-top:1px solid var(--line)}.sp-c:first-child{border-top:0}
.sp-ci{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:color-mix(in oklch,var(--w) 15%,var(--card));color:var(--w);flex:none}.sp-ci svg{width:16px;height:16px}
.sp-ey{display:block;font-size:13.5px;font-weight:700;color:var(--ink)}
.sp-c p{margin:2px 0 0;font-size:13px;line-height:1.45;color:var(--ink2)}.sp-c p b{color:var(--ink)}
.sp-aksi{flex:none;padding:14px 22px 18px;display:flex;align-items:center;gap:12px;border-top:1px solid var(--line);background:var(--card)}
.sp-aksi>span{flex:1;font-size:11.5px;color:var(--ink2)}
.sp-pri{min-height:44px;padding:0 28px;border:0;border-radius:999px;background:#0b2545;color:#fff;font:700 14px var(--font);cursor:pointer}
.sp-pri:hover{background:#163a66}.sp-pri:focus-visible,.sp .sp-x:focus-visible{outline:3px solid #e3b94e;outline-offset:2px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .sp-pri{background:#e8743b}}
:root[data-theme="dark"] .sp-pri{background:#e8743b}
@media (max-width:560px){.sp-hd{padding:18px 16px 16px}.sp-isi{padding:16px 16px 8px}.sp-aksi{padding:12px 16px 16px}.sp-aksi>span{display:none}.sp-pri{flex:1}
  .sp-k{grid-template-columns:18px minmax(0,1fr) auto auto}.sp-nm span,.sp-k em:last-child{display:none}
  .sp-b{grid-template-columns:minmax(0,1.3fr) 1fr 34px}.sp-b>span{flex-direction:column;align-items:flex-start;gap:3px}}
</style>`);

  /* tunggu spanduk persetujuan selesai supaya dua lapisan tidak bertumpuk */
  const mulai = () => document.querySelector(".pv-kartu") ? document.addEventListener("pb-persetujuan", () => setTimeout(tampil, 400), {once: true}) : tampil();
  document.readyState === "complete" ? setTimeout(mulai, 300) : addEventListener("load", () => setTimeout(mulai, 300));
})();
