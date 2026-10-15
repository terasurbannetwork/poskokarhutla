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
  const IK = {api: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6 1-8.5z"/>',
    jam: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    daun: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    perisai: '<path d="M12 3 4.5 6v6c0 4.5 3.2 8 7.5 9 4.3-1 7.5-4.5 7.5-9V6z"/>',
    jauh: '<circle cx="12" cy="10" r="2.5"/><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/>',
    asap: '<path d="M4 14h11a3 3 0 1 0-3-3M3 18h14a3 3 0 1 1-3 3M6 10h4"/>',
    awas: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>'};
  const ik = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IK[k]}</svg>`;
  const baris = (p, i) => `<button class="sp-k" data-k="${esc(p.id)}"><i>${i + 1}</i><b translate="no">${esc(p.kab)}</b><span><span translate="no">${esc(p.kec || "")}</span> · ${esc(namaProv(p.prov))}</span>
    <em class="sp-p merah">${p.hari} hari</em>${p.gambut ? `<em class="sp-p gambut">${ik("daun")}Gambut</em>` : "<em></em>"}</button>`;
  const kartu = (k, w, label, isi) => `<div class="sp-c" style="--w:${w}"><span class="sp-ci">${ik(k)}</span><div><span class="sp-ey">${label}</span><p>${isi}</p></div></div>`;
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
    /* asap: PM2.5 maks hari ini di sel 1° tempat kompleks menyala, dikelompokkan per kabupaten */
    const asapKab = new Map();
    if (asap?.grid) { const hi = Math.max(0, asap.hari.indexOf(hariIni())), sel = new Map(asap.grid.map(g => [`${g[0]},${g[1]}`, g[2][hi]]));
      const pusat = v => Math.floor(v) + .5;
      for (const p of nyala) { const pm = sel.get(`${pusat(p.lat)},${pusat(p.lon)}`); if (pm >= ISPU_TS) { const k = `${p.kab}|${p.prov}`; asapKab.set(k, Math.max(asapKab.get(k) || 0, pm)); } } }
    return {ini, kmrn, baru, lama, gambut, nyala, jauh, tanpa, bmkg, asapKab: [...asapKab].sort((a, b) => b[1] - a[1])};
  }

  function html(h) {
    const naik = h.ini - h.kmrn, arah = naik > 0 ? `<b class="naik">▲ ${fmt(naik)}</b> dari kemarin` : naik < 0 ? `<b class="turun">▼ ${fmt(-naik)}</b> dari kemarin` : "sama dengan kemarin";
    const sek = (judul, isi) => `<section class="sp-sek"><h4>${judul}</h4>${isi}</section>`;
    const kab = topKab(h.baru, 5), maks = kab[0]?.n || 1;
    const bar = kab.map(x => `<div class="sp-b"><span translate="no">${esc(x.kab)}</span><i style="--p:${Math.max(4, x.n / maks * 100)}%"><em class="sp-p oranye">${fmt(x.n)}</em></i></div>`).join("");
    const pm = h.asapKab[0]?.[1];
    const awas = [
      h.gambut.length && kartu("daun", "#8a5a3c", "Lahan gambut", `<b>${fmt(h.gambut.length)}</b> dari ${fmt(h.nyala.length)} kompleks menyala di gambut, paling sulit dipadamkan`),
      h.jauh.length && kartu("jauh", "#d9822b", `${DAOPS_JAUH}–${TANPA_DAOPS} km dari Daops`, `<b>${fmt(h.jauh.length)}</b> kompleks siaga jauh dari Daops, terbanyak di ${daftar(topKab(h.jauh, 3))}`),
      h.tanpa.length && kartu("perisai", "#c9503a", "Tanpa Daops", `<b>${fmt(h.tanpa.length)}</b> kompleks siaga tanpa Daops dalam ${TANPA_DAOPS} km, terbanyak di ${daftar(topKab(h.tanpa, 3))}`),
      pm && kartu("asap", "#6d6a66", "Asap tidak sehat", `PM2.5 hingga <b>${fmt(pm)} µg/m³</b> di ${fmt(h.asapKab.length)} kabupaten, antara lain <span translate="no">${h.asapKab.slice(0, 3).map(([k]) => esc(k.split("|")[0])).join(", ")}</span>`),
      ...h.bmkg.slice(0, 2).map(x => kartu("awas", "#1d4e89", "Peringatan BMKG", esc(x.headline || x.event)))].filter(Boolean).join("");
    return `<div class="sp-hd"><div style="flex:1;min-width:0"><span class="sp-eyh">${ik("api")}Situasi karhutla hari ini</span>
        <h3 id="spJudul"><b>${fmt(h.ini)}</b> titik api terdeteksi, ${arah}</h3>
        <div class="sp-chips"><span class="sp-p putih">${ik("api")}${fmt(h.baru.length)} kompleks baru · 24 jam</span><span class="sp-p putih">${ik("jam")}${fmt(h.lama.length)} bertahan &gt; 2 hari</span>
          <span class="sp-wkt">Data ${jamWIB(S.meta.data_terakhir || S.meta.dibuat)}</span></div></div>
        <button class="sp-x" data-tutup aria-label="Tutup">×</button></div>
      <div class="sp-isi">
      ${kab.length ? sek("Kompleks baru terbanyak", `<div class="sp-bs">${bar}</div>`) : ""}
      ${h.lama.length ? sek("Bertahan paling lama", `<div class="sp-ks">${h.lama.slice(0, 4).map(baris).join("")}</div>`) : ""}
      ${awas ? sek("Perlu perhatian", `<div class="sp-cs">${awas}</div>`) : ""}
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
.sp{width:min(600px,calc(100vw - 24px))}
.sp svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.sp-hd{display:flex;gap:12px;align-items:flex-start;padding:20px 22px 18px;background:linear-gradient(135deg,#0b2545,#13315c 60%,#1d4e89);color:#fff;position:sticky;top:0;z-index:2}
.sp-eyh{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#f5a06b}
.sp-hd h3{font:700 21px/1.3 var(--display);letter-spacing:-.01em;margin:8px 0 12px;color:#fff}
.sp-hd h3>b{color:#ff8a5c}.sp-hd h3 .naik{color:#ff8a5c}.sp-hd h3 .turun{color:#7fd6a4}
.sp-chips{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.sp-wkt{font-size:11px;color:rgb(255 255 255 / .6);margin-left:auto}
.sp .sp-x{border:0;background:rgb(255 255 255 / .12);color:#fff;width:34px;height:34px;border-radius:50%;font-size:19px;cursor:pointer;flex:none}
.sp .sp-x:hover{background:rgb(255 255 255 / .22)}
.sp-p{display:inline-flex;align-items:center;gap:5px;font-style:normal;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap;line-height:1.3}
.sp-p.putih{background:rgb(255 255 255 / .12);color:#fff;box-shadow:inset 0 0 0 1px rgb(255 255 255 / .18)}
.sp-p.merah{background:color-mix(in oklch,#c9503a 13%,transparent);color:#b5412c}
.sp-p.gambut{background:color-mix(in oklch,#8a5a3c 14%,transparent);color:#7a4a2c}
.sp-p.oranye{background:#e8743b;color:#fff}
.sp-isi{padding:18px 22px 6px;display:grid;gap:20px}
.sp-sek h4{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--ink2);margin:0 0 10px}
.sp-bs{display:grid;gap:7px}
.sp-b{display:grid;grid-template-columns:110px 1fr;align-items:center;gap:10px;font-size:13px;font-weight:600}
.sp-b span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-b i{display:flex;align-items:center;justify-content:flex-end;width:var(--p);height:22px;border-radius:6px;background:linear-gradient(90deg,color-mix(in oklch,#e8743b 25%,transparent),color-mix(in oklch,#e8743b 55%,transparent));padding-right:3px;box-sizing:border-box;min-width:fit-content}
.sp-ks{display:grid;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.sp-k{display:grid;grid-template-columns:22px auto minmax(0,1fr) auto 76px;align-items:center;gap:10px;text-align:left;border:0;border-top:1px solid var(--line);background:var(--card);color:var(--ink);padding:10px 12px;cursor:pointer;font:inherit;font-size:13.5px}
.sp-k:first-child{border-top:0}.sp-k:hover{background:var(--surface)}
.sp-k i{font-style:normal;font-size:11px;font-weight:800;color:var(--ink2)}
.sp-k span{font-size:12px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-k em:last-child{justify-self:start}
.sp-cs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sp-c{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:12px;background:color-mix(in oklch,var(--w) 7%,var(--card));box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--w) 22%,var(--line))}
.sp-ci{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--w);color:#fff;flex:none}.sp-ci svg{width:15px;height:15px}
.sp-ey{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--w)}
.sp-c p{margin:3px 0 0;font-size:12.8px;line-height:1.45;color:var(--ink)}.sp-c p b{color:#c9503a}
.sp-aksi{padding:16px 22px 20px;display:flex;align-items:center;gap:12px}
.sp-aksi>span{flex:1;font-size:11px;color:var(--ink2)}
.sp-pri{min-height:42px;padding:0 26px;border:0;border-radius:999px;background:#e8743b;color:#fff;font:700 14px var(--font);cursor:pointer;box-shadow:0 6px 16px -6px #e8743b}
.sp-pri:hover{filter:brightness(1.06)}
@media (max-width:560px){.sp-cs{grid-template-columns:1fr}.sp-k{grid-template-columns:18px auto minmax(0,1fr) auto}.sp-k span,.sp-k em:last-child:empty{display:none}.sp-b{grid-template-columns:90px 1fr}.sp-wkt{margin-left:0;width:100%}}
</style>`);

  /* tunggu spanduk persetujuan selesai supaya dua lapisan tidak bertumpuk */
  const mulai = () => document.querySelector(".pv-kartu") ? document.addEventListener("pb-persetujuan", () => setTimeout(tampil, 400), {once: true}) : tampil();
  document.readyState === "complete" ? setTimeout(mulai, 300) : addEventListener("load", () => setTimeout(mulai, 300));
})();
