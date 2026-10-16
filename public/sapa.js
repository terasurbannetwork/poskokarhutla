/* sapa.js — pop-up "Situasi hari ini" saat halaman karhutla dibuka. Sekali per hari WIB per peramban (localStorage "pb_sapa"),
   muncul setelah spanduk persetujuan ditutup, dilewati bila halaman dibuka lewat tautan khusus (?… atau /k/…).
   Skrip klasik, dimuat SETELAH skrip utama. Global: S, muatJSON, esc, fmt, namaProv, jamWIB, Laci, bukaTab, $.
   Semua angka dari kluster.json (kompleks aktif), peringatan.json (BMKG), asap.json (CAMS), sama dengan tab lain. */
(() => {
  const JAM = 36e5, ISPU_TS = 55.4, ISPU_PM10 = 150, {hariIni, sudah, ik, kartu} = SapaInti;
  /* muncul di halaman depan dan /peta (pemilik, 15 Okt 2026); tautan khusus (?wil=…, /k/…) tetap dilewati */
  if (sudah() || /[?&](wil|k|kl|f)=/.test(location.search) || !["", "/peta"].includes(location.pathname.replace(/\/+$/, ""))) return;

  const R_API = /angin|asap|kabut|kebakaran|kering|panas|debu|jarak pandang/i;
  const topKab = (xs, n = 4) => { const m = new Map(); for (const p of xs) { const k = `${p.kab}|${p.prov}`; m.set(k, (m.get(k) || 0) + 1); }
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => { const [kab, prov] = k.split("|"); return {kab, prov, n: v}; }); };
  const lblProv = k => `<em class="sp-p prov">${esc(namaProv(k))}</em>`;
  const baris = (p, i) => `<button class="sp-k" data-k="${esc(p.id)}"><i>${i + 1}</i><span class="sp-nm"><b translate="no">${esc(p.kab)}</b><span translate="no">${esc(p.kec || "")}</span></span>${lblProv(p.prov)}
    <em class="sp-p merah">${p.hari} hari</em>${p.gambut ? `<em class="sp-p gambut">${ik("daun")}Gambut</em>` : "<em></em>"}</button>`;

  async function siap() { for (let i = 0; i < 400 && !(S.meta && S.kluster); i++) await new Promise(r => setTimeout(r, 150)); return !!S.kluster; }

  function hitung(per, asap) {
    const acuan = new Date(S.meta.data_terakhir || S.meta.dibuat).getTime();
    const aktif = S.kluster.features.map(f => f.properties).filter(p => p.awal);
    const nyala = aktif.filter(p => p.jam_sejak <= 24);
    const baru = aktif.filter(p => acuan - new Date(p.awal) <= 24 * JAM);
    const lama = nyala.filter(p => p.hari > 2).sort((a, b) => b.hari - a.hari || b.n - a.n);
    const ini = aktif.reduce((s, p) => s + (p.ini || 0), 0), kmrn = aktif.reduce((s, p) => s + (p.kmrn || 0), 0);
    const gambut = nyala.filter(p => p.gambut);
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
    return {pm10Kab: [...pm10Kab].sort((a, b) => b[1] - a[1]), ini, kmrn, baru, provAwas, lama, gambut, nyala, bmkg, asapKab: [...asapKab].sort((a, b) => b[1] - a[1])};
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
      (pm || p10) && kartu("asap", "#6d6a66", "Asap tidak sehat", [pm && `PM2.5 hingga <b>${fmt(pm)} µg/m³</b> di ${fmt(h.asapKab.length)} kabupaten, antara lain ${kabAsap(h.asapKab)}`,
        p10 && `PM10 hingga <b>${fmt(p10)} µg/m³</b> di ${fmt(h.pm10Kab.length)} kabupaten, antara lain ${kabAsap(h.pm10Kab)}`].filter(Boolean).join("<br>")),
      ...h.bmkg.slice(0, 2).map(x => kartu("awas", "#1d4e89", "Peringatan BMKG", esc(x.headline || x.event)))].filter(Boolean).join("");
    return `<div class="sp-hd"><div style="flex:1;min-width:0"><span class="sp-eyh">${ik("api")}Situasi karhutla hari ini</span>
        <h3 id="spJudul"><b>${fmt(h.ini)}</b> titik panas terdeteksi, ${arah}</h3>
        <div class="sp-chips"><span class="sp-p putih">${ik("api")}${fmt(h.baru.length)} kompleks baru · 24 jam</span><span class="sp-p putih">${ik("jam")}${fmt(h.lama.length)} bertahan &gt; 2 hari</span></div>
</div>
        <button class="sp-x" data-tutup aria-label="Tutup">×</button></div>
      <div class="sp-isi">
      ${h.provAwas.length ? sek("Provinsi perlu perhatian", `<div class="sp-ps sp-panel">${h.provAwas.map(o => { const d = o.ini - o.kmrn;
        return `<div class="sp-pv"><b>${esc(namaProv(o.k))}</b><div class="sp-chips"><em class="sp-p oranye">${ik("api")}${fmt(o.ini)} titik panas${d ? ` · ${d > 0 ? "▲" : "▼"} ${fmt(Math.abs(d))}` : ""}</em>${o.baru ? `<em class="sp-p prov">${fmt(o.baru)} kompleks baru</em>` : ""}${o.lama ? `<em class="sp-p merah">${ik("jam")}${fmt(o.lama)} bertahan &gt; 2 hari</em>` : ""}${o.gambut ? `<em class="sp-p gambut">${ik("daun")}${fmt(o.gambut)} di gambut</em>` : ""}</div></div>`; }).join("")}</div>`) : ""}
      ${kab.length ? sek("Kompleks baru terbanyak", `<div class="sp-bs sp-panel">${bar}</div>`) : ""}
      ${h.lama.length ? sek("Bertahan paling lama", `<div class="sp-ks sp-panel">${h.lama.slice(0, 4).map(baris).join("")}</div>`) : ""}
      ${awas ? sek("Perlu perhatian", `<div class="sp-cs sp-panel">${awas}</div>`) : ""}
      </div>
      <div class="sp-aksi"><span>Sumber: NASA FIRMS, Copernicus CAMS, BMKG</span><button class="sp-pri" data-tutup>Lihat peta</button></div>`;
  }

  async function tampil() {
    if (!(await siap()) || sudah()) return;
    const [per, asap] = await Promise.all([muatJSON("data/peringatan.json").catch(() => null), muatJSON("data/asap.json").catch(() => null)]);
    SapaInti.dialog(html(hitung(per, asap)), (e, d) => { const k = e.target.closest("[data-k]"); if (k) { d.close(); Laci.buka(k.dataset.k); return true; } });
  }

  SapaInti.css();

  SapaInti.mulai(tampil);
})();
