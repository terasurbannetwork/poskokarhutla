/* sapa.js — pop-up "Situasi hari ini" saat halaman karhutla dibuka. Sekali per hari WIB per peramban (localStorage "pb_sapa"),
   muncul setelah spanduk persetujuan ditutup, dilewati bila halaman dibuka lewat tautan khusus (?… atau /k/…).
   Skrip klasik, dimuat SETELAH skrip utama. Global: S, muatJSON, esc, fmt, namaProv, jamWIB, Laci, bukaTab, $.
   Semua angka dari kluster.json (kompleks aktif), peringatan.json (BMKG), asap.json (CAMS), sama dengan tab lain. */
(() => {
  const JAM = 36e5, ISPU_TS = 55.4, ISPU_PM10 = 150, {hariIni, sudah, ik, kartu} = SapaInti;
  /* muncul di halaman depan dan /peta (pemilik, 15 Okt 2026); tautan khusus (?wil=…, /k/…) tetap dilewati */
  /* gerbang ini hanya untuk tampil otomatis; tombol "!" di header tetap membuka pop-up */
  const otomatis = !(sudah() || /[?&](wil|k|kl|f)=/.test(location.search) || !["", "/peta"].includes(location.pathname.replace(/\/+$/, "")));

  const R_API = /angin|asap|kabut|kebakaran|kering|panas|debu|jarak pandang/i;
  const topKab = (xs, n = 4) => { const m = new Map(); for (const p of xs) { const k = `${p.kab}|${p.prov}`; m.set(k, (m.get(k) || 0) + 1); }
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => { const [kab, prov] = k.split("|"); return {kab, prov, n: v}; }); };
  const lblProv = k => `<em class="sp-p prov">${esc(namaProv(k))}</em>`;
  /* baris kepala tabel; kanan = kolom angka rata kanan, hp = kolom yang disembunyikan di layar ponsel */
  const th = (v, cols, kanan = [], hp = []) => `<div class="sp-th ${v}">${cols.map((c, i) => `<span class="${kanan.includes(i) ? "sp-ka" : ""}${hp.includes(i) ? " sp-mh" : ""}">${c}</span>`).join("")}</div>`;
  const tgl = s => new Date(s).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"});
  const arahD = d => d ? `<small class="${d > 0 ? "naik" : "turun"}">${d > 0 ? "▲" : "▼"}${fmt(Math.abs(d))}</small>` : "";
  /* satu format baris kompleks (Bertahan paling lama, rincian provinsi, rincian gambut); kecN = kompleks menyala per kab|kec */
  let kecN = new Map();
  const kepalaK = () => th("k", ["#", "Kabupaten, kecamatan", "Provinsi", "Sejak", "Titik 7 hari", "Hari ini", "Cluster di kec.", "Menyala", "Gambut"], [4, 5, 6], [2, 3, 4, 6, 8]);
  const baris = (p, i) => `<button class="sp-k" data-k="${esc(p.id)}"><i>${i + 1}</i><span class="sp-nm1" translate="no"><b>${esc(p.kab)}</b>${p.kec ? `<span> · ${esc(p.kec)}</span>` : ""}</span>
    <em class="sp-p prov sp-mh">${esc(namaProv(p.prov))}</em><span class="sp-mh">${tgl(p.awal)}</span><b class="sp-ka sp-mh">${fmt(p.n)}</b><b class="sp-ka">${fmt(p.ini || 0)} ${arahD((p.ini || 0) - (p.kmrn || 0))}</b>
    <b class="sp-ka sp-mh">${fmt(kecN.get(`${p.kab}|${p.kec}`) || 1)}</b><em class="sp-p merah">${fmt(p.hari)} hari</em>${p.gambut ? `<em class="sp-p gambut sp-mh">${ik("daun")}Gambut</em>` : `<em class="sp-mh"></em>`}</button>`;
  const tabelK = (xs, N = 8) => `<div class="sp-ks rata">${kepalaK()}${xs.slice(0, N).map(baris).join("")}</div>${xs.length > N ? `<p>Dan ${fmt(xs.length - N)} cluster lain, semuanya tampil di peta.</p>` : ""}`;
  /* rincian provinsi: kategori pil -> [warna, ikon, kalimat] */
  const KAT = {api: ["oranye", "api", "cluster dengan titik panas hari ini"], baru: ["prov", "", "cluster baru muncul dalam 24 jam terakhir"],
    lama: ["merah", "jam", "cluster menyala lebih dari 2 hari"], gambut: ["gambut", "daun", "cluster menyala di lahan gambut"]};
  const pilPv = (o, kat, isi) => `<button class="sp-p ${KAT[kat][0]}" data-sppv="${esc(o.k)}" data-kat="${kat}" aria-expanded="false">${KAT[kat][1] ? ik(KAT[kat][1]) : ""}${isi}</button>`;
  const selPv = (o, kat) => o[kat].length ? pilPv(o, kat, fmt(o[kat].length)) : `<span class="sp-nol">–</span>`;
  const KLIK = "Klik baris untuk menutup pop-up, menuju cluster itu di peta, dan membuka rinciannya.";
  const rinci = (o, kat) => `<p><b>${fmt(o[kat].length)}</b> ${KAT[kat][2]} di ${esc(namaProv(o.k))}. ${KLIK}</p>${tabelK(o[kat])}`;
  /* rincian kartu "Perlu perhatian" */
  const ISU = {
    gambut: h => `<p><b>${fmt(h.gambut.length)}</b> cluster menyala di lahan gambut, urut titik panas hari ini. ${KLIK}</p>${tabelK(h.gambut)}`,
    asap: h => { const m = new Map(); for (const [k, v] of h.asapKab) m.set(k, [v]); for (const [k, v] of h.pm10Kab) (m.get(k) || m.set(k, []).get(k))[1] = v;
      const xs = [...m].sort((a, b) => (b[1][0] || 0) - (a[1][0] || 0) || (b[1][1] || 0) - (a[1][1] || 0)), N = 10, ug = v => v ? `<b class="sp-ka">${fmt(v)}</b>` : `<span class="sp-ka sp-nol">–</span>`;
      return `<p><b>${fmt(xs.length)}</b> kabupaten dengan cluster menyala di bawah asap tidak sehat hari ini (ISPU: PM2.5 ≥ 55,4, PM10 ≥ 150 µg/m³), puncak harian sel 1° Copernicus CAMS.</p>
        <div class="sp-ks sp-as">${th("a", ["Kabupaten", "Provinsi", "PM2.5 <i class=\"sat\">µg/m³</i>", "PM10 <i class=\"sat\">µg/m³</i>"], [2, 3])}${xs.slice(0, N).map(([k, [a, b]]) => { const [kab, pv] = k.split("|");
          return `<div class="sp-ar"><b translate="no">${esc(kab)}</b><em class="sp-p prov">${esc(namaProv(pv))}</em>${ug(a)}${ug(b)}</div>`; }).join("")}</div>${xs.length > N ? `<p>Dan ${fmt(xs.length - N)} kabupaten lain.</p>` : ""}`; },
    bmkg: (h, i) => { const x = h.bmkg[i];
      return `<p>${esc(x.deskripsi || x.headline || x.event)}</p><div class="sp-ks sp-as">${th("a", ["Peringatan", "Wilayah", "Mulai", "Berakhir"])}
        <div class="sp-ar"><b>${esc(x.event)}</b><span>${esc(x.wilayah || "–")}</span><span>${jamWIB(x.mulai)}</span><span>${jamWIB(x.selesai)}</span></div></div>`; }};
  /* kartu bersama SapaInti.kartu dijadikan tombol yang membuka rinciannya di bawah */
  const kartuIsu = (isu, html) => html.replace(/^<div/, `<button type="button" data-isu="${isu}" aria-expanded="false"`).replace(/<\/div>$/, "</button>") + `<div class="sp-pd" hidden></div>`;

  async function siap() { for (let i = 0; i < 400 && !(S.meta && S.kluster); i++) await new Promise(r => setTimeout(r, 150)); return !!S.kluster; }

  function hitung(per, asap) {
    const acuan = new Date(S.meta.data_terakhir || S.meta.dibuat).getTime();
    const aktif = S.kluster.features.map(f => f.properties).filter(p => p.awal);
    const nyala = aktif.filter(p => p.jam_sejak <= 24);
    const baru = aktif.filter(p => acuan - new Date(p.awal) <= 24 * JAM);
    /* pembanding: kompleks yang muncul 24-48 jam lalu (kluster.json memuat 7 hari, jadi tidak ada yang hilang) */
    const baruKmrn = aktif.filter(p => { const t = acuan - new Date(p.awal); return t > 24 * JAM && t <= 48 * JAM; });
    const lama = nyala.filter(p => p.hari > 2).sort((a, b) => b.hari - a.hari || b.n - a.n);
    const ini = aktif.reduce((s, p) => s + (p.ini || 0), 0), kmrn = aktif.reduce((s, p) => s + (p.kmrn || 0), 0);
    const gambut = nyala.filter(p => p.gambut).sort((a, b) => (b.ini || 0) - (a.ini || 0) || b.n - a.n);
    kecN = new Map(); for (const p of nyala) { const k = `${p.kab}|${p.kec}`; kecN.set(k, (kecN.get(k) || 0) + 1); }
    const bmkg = (per?.nowcast || []).filter(x => x.selesai && new Date(x.selesai) > Date.now() && R_API.test(x.event + " " + (x.headline || "")));
    /* asap: PM2.5 dan PM10 (kolom 2 dan 7) maks hari ini di sel 1° tempat kompleks menyala, dikelompokkan per kabupaten */
    const asapKab = new Map(), pm10Kab = new Map();
    if (asap?.grid) { const hi = Math.max(0, asap.hari.indexOf(hariIni())), sel = new Map(asap.grid.map(g => [`${g[0]},${g[1]}`, g]));
      const pusat = v => Math.floor(v) + .5;
      for (const p of nyala) { const g = sel.get(`${pusat(p.lat)},${pusat(p.lon)}`); if (!g) continue; const k = `${p.kab}|${p.prov}`, pm = g[2][hi], p10 = g[7]?.[hi];
        if (pm >= ISPU_TS) asapKab.set(k, Math.max(asapKab.get(k) || 0, pm));
        if (p10 >= ISPU_PM10) pm10Kab.set(k, Math.max(pm10Kab.get(k) || 0, p10)); } }
    /* per provinsi: titik hari ini, kompleks baru 24 jam, bertahan > 2 hari, menyala di gambut */
    const prov = new Map(), q = k => prov.get(k) || prov.set(k, {k, ini: 0, kmrn: 0, api: [], baru: [], lama: [], gambut: []}).get(k);
    for (const p of aktif) { const o = q(p.prov); o.ini += p.ini || 0; o.kmrn += p.kmrn || 0; if (p.ini) o.api.push(p); }
    for (const p of baru) q(p.prov).baru.push(p);
    for (const p of lama) q(p.prov).lama.push(p);
    for (const p of gambut) q(p.prov).gambut.push(p);
    const provAwas = [...prov.values()].filter(o => o.ini > 0).sort((a, b) => b.ini - a.ini).slice(0, 5);
    const urutIni = (a, b) => (b.ini || 0) - (a.ini || 0) || b.n - a.n;
    for (const o of provAwas) { o.api.sort(urutIni); o.baru.sort(urutIni); o.gambut.sort(urutIni); }
    return {baruKmrn, pm10Kab: [...pm10Kab].sort((a, b) => b[1] - a[1]), ini, kmrn, baru, provAwas, lama, gambut, nyala, bmkg, asapKab: [...asapKab].sort((a, b) => b[1] - a[1])};
  }

  function html(h) {
    const naik = h.ini - h.kmrn, arah = naik > 0 ? `<b class="naik">▲ ${fmt(naik)}</b> dari kemarin` : naik < 0 ? `<b class="turun">▼ ${fmt(-naik)}</b> dari kemarin` : "sama dengan kemarin";
    const sek = (judul, isi) => `<section class="sp-sek"><h4>${judul}</h4>${isi}</section>`;
    const kab = topKab(h.baru, 5), maks = kab[0]?.n || 1, kmrnKab = new Map();
    for (const p of h.baruKmrn) { const k = `${p.kab}|${p.prov}`; kmrnKab.set(k, (kmrnKab.get(k) || 0) + 1); }
    const bar = kab.map(x => `<div class="sp-b"><span><b translate="no">${esc(x.kab)}</b></span>${lblProv(x.prov)}<i><u style="--p:${Math.max(3, x.n / maks * 100)}%"></u></i><b class="sp-km">${fmt(kmrnKab.get(`${x.kab}|${x.prov}`) || 0)}</b><b>${fmt(x.n)}</b></div>`).join("");
    const pm = h.asapKab[0]?.[1], p10 = h.pm10Kab[0]?.[1];
    const kabAsap = xs => `<span translate="no">${xs.slice(0, 3).map(([k]) => esc(k.split("|")[0])).join(", ")}</span>`;
    const awas = [
      h.gambut.length && kartuIsu("gambut", kartu("daun", "#8a5a3c", "Lahan gambut", `<b>${fmt(h.gambut.length)}</b> dari ${fmt(h.nyala.length)} cluster menyala di gambut, paling sulit dipadamkan`)),
      (pm || p10) && kartuIsu("asap", kartu("asap", "#6d6a66", "Asap tidak sehat", [pm && `PM2.5 hingga <b>${fmt(pm)} µg/m³</b> di ${fmt(h.asapKab.length)} kabupaten, antara lain ${kabAsap(h.asapKab)}`,
        p10 && `PM10 hingga <b>${fmt(p10)} µg/m³</b> di ${fmt(h.pm10Kab.length)} kabupaten, antara lain ${kabAsap(h.pm10Kab)}`].filter(Boolean).join("<br>"))),
      ...h.bmkg.slice(0, 2).map((x, i) => kartuIsu(`bmkg${i}`, kartu("awas", "#1d4e89", "Peringatan BMKG", esc(x.headline || x.event))))].filter(Boolean).join("");
    return `<div class="sp-hd"><div style="flex:1;min-width:0"><span class="sp-eyh">${ik("api")}Situasi karhutla hari ini</span>
        <h3 id="spJudul"><b>${fmt(h.ini)}</b> titik panas terdeteksi, ${arah}</h3>
        <div class="sp-chips"><span class="sp-p putih">${ik("api")}${fmt(h.baru.length)} cluster baru, 24 jam</span><span class="sp-p putih">${ik("jam")}${fmt(h.lama.length)} bertahan &gt; 2 hari</span></div>
</div>
        <button class="sp-x" data-tutup aria-label="Tutup">×</button></div>
      <div class="sp-isi">
      ${h.provAwas.length ? sek("Provinsi perlu perhatian", `<div class="sp-pt sp-panel">${th("p", ["Provinsi", "Titik panas (vs kemarin)", "Cluster baru 24 jam", "Bertahan &gt; 2 hari", "Di gambut"])}${h.provAwas.map(o => { const d = o.ini - o.kmrn;
        return `<div class="sp-pr"><button class="sp-pn" data-sppv="${esc(o.k)}" data-kat="api">${esc(namaProv(o.k))}</button>${pilPv(o, "api", `${fmt(o.ini)}${d ? ` · ${d > 0 ? "▲" : "▼"} ${fmt(Math.abs(d))}` : ""}`)}${selPv(o, "baru")}${selPv(o, "lama")}${selPv(o, "gambut")}</div><div class="sp-pd" hidden></div>`; }).join("")}</div>`) : ""}
      ${kab.length ? sek("Cluster baru terbanyak", `<div class="sp-bs sp-panel rata">${th("b", ["Kabupaten", "Provinsi", "", "Kemarin", "Hari ini"], [3, 4])}${bar}</div>`) : ""}
      ${h.lama.length ? sek("Bertahan paling lama", `<div class="sp-ks sp-panel rata">${kepalaK()}${h.lama.slice(0, 4).map(baris).join("")}</div>`) : ""}
      ${awas ? sek("Perlu perhatian", `<div class="sp-cs sp-panel rata">${th("c", ["Isu", "Rincian"])}${awas}</div>`) : ""}
      </div>
      <div class="sp-aksi"><span>Sumber: NASA FIRMS, Copernicus CAMS, BMKG</span><button class="sp-pri" data-tutup>Lihat peta</button></div>`;
  }

  async function tampil(paksa) {
    if (!(await siap()) || (!paksa && sudah())) return;
    const [per, asap] = await Promise.all([muatJSON("data/peringatan.json").catch(() => null), muatJSON("data/asap.json").catch(() => null)]);
    const h = hitung(per, asap);
    SapaInti.dialog(html(h), (e, d) => {
      const k = e.target.closest("[data-k]"); if (k) { d.close(); Laci.buka(k.dataset.k); return true; }
      /* pil provinsi: buka/tutup rincian kompleks kategori itu di bawah barisnya (satu terbuka sekaligus) */
      /* pil provinsi / kartu isu: buka-tutup rincian di bawahnya, satu terbuka sekaligus */
      const b = e.target.closest("[data-sppv],[data-isu]"); if (!b) return;
      const isu = b.dataset.isu, pr = isu ? b : b.closest(".sp-pr"), det = pr.nextElementSibling, kunci = isu || `${b.dataset.sppv}|${b.dataset.kat}`;
      const tutup = !det.hidden && det.dataset.kunci === kunci;
      d.querySelectorAll(".sp-pd").forEach(x => { x.hidden = true; });
      d.querySelectorAll("[aria-expanded]").forEach(x => x.setAttribute("aria-expanded", "false"));
      if (!tutup) { det.innerHTML = isu ? (isu.startsWith("bmkg") ? ISU.bmkg(h, +isu.slice(4)) : ISU[isu](h)) : rinci(h.provAwas.find(o => o.k === b.dataset.sppv), b.dataset.kat);
        det.dataset.kunci = kunci; det.hidden = false; (isu ? b : pr.querySelector(`button.sp-p[data-kat="${b.dataset.kat}"]`)).setAttribute("aria-expanded", "true"); }
      return true;
    });
  }

  SapaInti.css();

  if (otomatis) SapaInti.mulai(() => tampil());
  let muat = 0;
  /* tombol "!" di header membuka pop-up ini kapan saja, tanpa kunci sekali-per-hari */
  document.getElementById("sapaBuka")?.addEventListener("click", async () => { if (muat || document.querySelector("dialog.sp[open]")) return; muat = 1; try { await tampil(true); } finally { muat = 0; } });
})();
