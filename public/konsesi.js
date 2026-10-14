/* konsesi.js — status lahan titik panas di lokasi kompleks api: areal konsesi sawit / HTI (kayu pulp) / HPH (hutan alam) /
   izin tambang, gambut, kawasan lindung. TANPA nama perusahaan, grup, nomor izin, atau kasus sanksi (keputusan pemilik 14 Okt 2026).
   Data: data/kompleks_konsesi.json (scripts/data/konsesi_kompleks.py, harian; porsi titik per jenis konsesi).
   Menambah: bagian "Status lahan titik panas" di laci "Lahan & penanggung jawab"; jenis areal di tooltip kompleks dan lapisan
   konsesi; kolom "Areal konsesi" + saringan di tab Kompleks api; peraga "Kebakaran di konsesi" (agregat per jenis & provinsi).
   Skrip klasik dimuat SETELAH skrip utama dan databaru.js. Memakai global halaman: S, Laci, Tabel, peta, $, esc, fmt, muatJSON,
   bukaTab, nanti, namaProv, kiriPad. Bahasa netral: "titik panas berada di dalam areal konsesi", bukan tuduhan pembakar. */
(() => {
  if (typeof Laci === "undefined" || typeof Tabel === "undefined") return;
  let KK = null, janji = null;
  const muat = () => janji ||= muatJSON("data/kompleks_konsesi.json").then(a => { KK = a; })
    .catch(() => { KK = {kompleks: {}, jenis: [], total: {n: 0, konsesi: 0}, gagal: true}; });
  /* [label, warna, label panjang, tahun peta batas] */
  const JN = {sawit: ["Sawit", "#c98a3c", "Konsesi sawit", "± 2014"], hti: ["HTI", "#6b8e3a", "Konsesi HTI (kayu pulp)", "2020–2022"],
    hph: ["HPH", "#2f6f8f", "Konsesi HPH (hutan alam)", "± 2014"], tambang: ["Tambang", "#7a5c99", "Izin tambang (PPKH)", "2026"]};
  const URUT = ["sawit", "hti", "hph", "tambang"];
  const LINDUNG = ["HK", "HL", "THR", "KSA", "KPA"];
  const BATAS = "batas konsesi: sawit/HPH ± 2014, HTI 2020–2022, tambang 2026";
  const pct = p => (p < .005 && p > 0 ? "< 1" : Math.round(p * 100)) + "%";
  const jn = j => JN[j] || [j, "#888", j, ""];
  const jenisDi = id => KK?.kompleks[id]?.jenis || {};
  const bar = (n, v, w) => `<div class="ks-bar"><span>${n}</span><i><b style="width:${Math.min(100, v * 100)}%;background:${w}"></b></i><em class="num">${pct(v)}</em></div>`;

  /* --- laci: status lahan titik panas di "Lahan & penanggung jawab" --- */
  const _buka = Laci.buka.bind(Laci);
  Laci.buka = function (id) { _buka(id); muat().then(() => tambahLaci(id)); };
  function tambahLaci(id) {
    if (S.pilihK !== id || $("#laci .ks-laci")) return;
    const sek = [...document.querySelectorAll("#laci details.lipat")].find(d => { const t = d.querySelector("summary")?.textContent || ""; return t.startsWith("Lahan & penanggung jawab") || (window.T && t.startsWith(window.T("Lahan & penanggung jawab"))); });
    if (!sek) return;
    const k = KK.kompleks[id];
    let h;
    if (KK.gagal) h = `<p class="fnd">Data status lahan belum tersedia.</p>`;
    else if (!k) h = `<p style="margin:0;font-size:12.5px">Semua titik panas kompleks ini berada <b>di luar areal konsesi</b>, gambut, dan kawasan hutan yang tercatat.</p>`;
    else {
      const lind = LINDUNG.reduce((a, f) => a + (k.kawasan[f] || 0), 0);
      h = `<div class="lbl">Status lahan titik panas</div>
        ${URUT.map(j => bar(jn(j)[2], k.jenis[j]?.porsi || 0, jn(j)[1])).join("")}
        ${bar("Di luar areal konsesi", k.luar, "#2b8c86")}
        <div class="ks-bar-sep"></div>
        ${bar("Di lahan gambut", k.gambut, "#4a3426")}${bar("Di kawasan lindung/konservasi", lind, "#1f7a3a")}`;
    }
    sek.querySelector(".isi").insertAdjacentHTML("beforeend", `<div class="ks-laci">${h}</div>`);
  }

  /* --- tooltip: kompleks (jenis areal) dan poligon konsesi --- */
  function pasangPeta() {
    if (typeof peta === "undefined" || !peta?.getLayer || !peta.getLayer("kl-fill")) return setTimeout(pasangPeta, 1500);
    const tip = $("#tip");
    const taruh = ev => { tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, ev.clientX + 14) + "px"; tip.style.top = Math.max(8, ev.clientY - tip.offsetHeight - 12) + "px"; };
    const lbl = (t, w) => `<span class="ks-lb"${w ? ` style="--w:${w}"` : ""}>${t}</span>`;
    const kom = e => { const p = e.features[0].properties; muat().then(() => { const k = KK.kompleks[p.id], js = Object.entries(jenisDi(p.id));
      const isi = js.length ? `<div class="tp-bd ks-tp"><div class="ks-tp-l">${js.map(([j, r]) => lbl(`${esc(jn(j)[2])} ${pct(r.porsi)}`, jn(j)[1])).join("")}${lbl("di luar " + pct(k.luar), "#2b8c86")}</div></div>` : "";
      tip.innerHTML = kartuTip({judul: esc(p.id), kepala: ikon("api", "#c9503a"), sub: p.kec ? `<small class="tp-sub">${esc(p.kec)}</small>` : "",
        kaki: js.length ? "Porsi titik panas di areal konsesi" : KK.gagal ? "" : "Di luar areal konsesi"})
        .replace('<div class="tp-ft">', `${isi}<div class="tp-ft">`);
      tip.classList.add("on", "kartu"); taruh(e.originalEvent); }); };
    ["kl-fill", "kl-pt", "kl-pt3"].forEach(l => { peta.on("mousemove", l, kom); peta.on("mouseleave", l, () => tip.classList.remove("on")); });
    /* lapisan konsesi: warna per jenis + jenis & tahun peta saat disorot (berkas publik tidak memuat nama) */
    const warnai = () => { if (!peta.getLayer("konsesi")) return;
      const w = ["match", ["get", "jenis"], ...Object.entries(JN).flatMap(([k, v]) => [k, v[1]]), "#888"];
      peta.setPaintProperty("konsesi", "fill-color", w); peta.setPaintProperty("konsesi-line", "line-color", w);
      if (peta._ksTip) return; peta._ksTip = 1;
      peta.on("mousemove", "konsesi", e => { if (peta.queryRenderedFeatures(e.point, {layers: ["kl-fill", "kl-pt", "kl-pt3"].filter(l => peta.getLayer(l))}).length) return;
        const p = e.features[0].properties; tip.innerHTML = `<div class="tp2-h tp2-only"><div class="tp2-hr"><b><i class="ks-tip-sw" style="background:${jn(p.jenis)[1]}"></i>Areal ${esc(jn(p.jenis)[2].replace(/^Konsesi/, "konsesi"))}</b></div><small>${p.kab ? esc(p.kab) + " · " : ""}peta batas ${esc(p.tahun_data || "–")}</small></div>`;
        tip.classList.add("on"); taruh(e.originalEvent); });
      peta.on("mouseleave", "konsesi", () => tip.classList.remove("on")); };
    warnai(); peta.on("styledata", () => nanti(warnai));
  }
  pasangPeta();

  /* --- tab Kompleks api: kolom Areal konsesi, saringan, peraga --- */
  const F = window.KonsesiF = {jenis: "", hanya: false, gambut: false};
  const _baris = Tabel.baris.bind(Tabel), _render = Tabel.render.bind(Tabel);
  Tabel.baris = function () {
    const q = this.q; this.q = ""; let r = _baris(); this.q = q;
    const ql = q.toLowerCase();
    if (ql) r = r.filter(p => `${p.id} ${p.kec} ${p.kab} ${namaProv(p.prov)} ${Object.keys(jenisDi(p.id)).map(j => jn(j)[2]).join(" ")}`.toLowerCase().includes(ql));
    if (F.jenis) r = r.filter(p => jenisDi(p.id)[F.jenis]);
    else if (F.hanya) r = r.filter(p => Object.keys(jenisDi(p.id)).length);
    if (F.gambut) r = r.filter(p => p.gambut || (KK?.kompleks?.[p.id]?.gambut || 0) >= .5); /* kompleks di lahan gambut */
    return r;
  };
  Tabel.render = function () {
    if (!KK) { muat().then(() => Tabel.render()); return _render(); }
    _render(); const el = $("#kompleks"); if (!el || !S.kluster) return;
    if (!$("#ks-saring")) { $("#tq")?.insertAdjacentHTML("afterend", `<label class="ks-saring" id="ks-saring"><input type="checkbox"><span class="ks-sw">hanya di areal konsesi</span></label>`);
      $("#ks-saring input").onchange = e => { F.hanya = e.target.checked; F.jenis = ""; Tabel.hal = 0; nanti(() => Tabel.render()); };
      $("#ks-saring").insertAdjacentHTML("afterend", `<label class="ks-saring" id="ks-gambut"><input type="checkbox"><span class="ks-sw">hanya di gambut</span></label>`);
      $("#ks-gambut input").onchange = e => { F.gambut = e.target.checked; Tabel.hal = 0; nanti(() => Tabel.render()); }; }
    $("#ks-chip")?.remove();
    if (F.jenis) { $("#ks-saring").insertAdjacentHTML("afterend", `<button class="ks-chip" id="ks-chip" aria-label="Hapus saringan areal konsesi"><span>Areal ${esc(jn(F.jenis)[2].toLowerCase())}</span><i aria-hidden="true">✕</i></button>`);
      $("#ks-chip").onclick = () => { F.jenis = ""; Tabel.hal = 0; nanti(() => Tabel.render()); }; }
    const th = $("#th tr"); if (th && !th.querySelector(".ks-th")) th.insertAdjacentHTML("beforeend", `<th class="ks-th">Areal konsesi</th>`);
    $("#tb").querySelectorAll("tr").forEach(tr => { const id = tr.querySelector("[data-id]")?.dataset.id; if (!id || tr.querySelector(".ks-td")) return;
      const js = Object.entries(jenisDi(id));
      tr.insertAdjacentHTML("beforeend", `<td class="ks-td">${js.length ? js.map(([j, r]) => `<span class="ks-ell"><span class="ks-j" style="--w:${jn(j)[1]}">${esc(jn(j)[0])} ${pct(r.porsi)}</span></span>`).join("") : `<span class="ks-mt">–</span>`}</td>`); });
    $("#tf tr")?.insertAdjacentHTML("beforeend", "<td></td>");
    const kos = $("#tb .kosong"); if (kos) kos.colSpan = 12;
    peraga();
  };
  function peraga() {
    let ex = $("#ks-ex");
    if (!ex) { $("#kompleks").insertAdjacentHTML("beforebegin", `<article class="ex ks-ex" id="ks-ex"></article>`); ex = $("#ks-ex");
      ex.addEventListener("click", e => { const b = e.target.closest("[data-jn]"); if (b) tunjuk(b.dataset.jn); });
      ex.addEventListener("keydown", e => { const b = e.target.closest("[data-jn]"); if (b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); tunjuk(b.dataset.jn); } }); }
    if (KK.gagal) { ex.innerHTML = `<p class="fnd">Data status lahan belum tersedia.</p>`; return; }
    const T = KK.total || {n: 0, konsesi: 0}, R = Object.fromEntries((KK.jenis || []).map(a => [a.jenis, a]));
    const daf = URUT.filter(j => R[j]);
    const sel = (v, b) => `<td class="n num">${v ? (b ? "<b>" + fmt(v) + "</b>" : fmt(v)) : "–"}</td>`;
    /* per provinsi: hanya provinsi dengan titik di areal konsesi, terbanyak dulu */
    const pv = {}; for (const j of daf) for (const [k, n] of Object.entries(R[j].prov || {})) (pv[k] ||= {})[j] = n;
    const pvs = Object.entries(pv).map(([k, o]) => [k, o, Object.values(o).reduce((a, b) => a + b, 0)]).sort((a, b) => b[2] - a[2]).slice(0, 10);
    /* porsi per provinsi: titik VIIRS 7 hari di kompleks api provinsi itu = penyebut (sama dengan T.n di tingkat nasional) */
    const nPv = {}; S.kluster.features.forEach(f => nPv[f.properties.prov] = (nPv[f.properties.prov] || 0) + (f.properties.n || 0));
    /* satu baris: persen saja, jumlah titik di tooltip */
    const por = (v, n) => v && n ? `<td class="n num" data-tip="${fmt(v)} titik">${pct(v / n)}</td>` : `<td class="n num">–</td>`;
    ex.innerHTML = `<div class="ks-hd"><div><h3>Kebakaran di konsesi: titik panas menurut status lahan</h3>
        <p class="sub">7 hari terakhir · ${fmt(T.konsesi)} dari ${fmt(T.n)} titik panas VIIRS di kompleks api (${pct(T.n ? T.konsesi / T.n : 0)}) berada di dalam areal konsesi.</p></div></div>
      ${""/* tabel status lahan disembunyikan (pemilik, 14 Okt 2026) */}
      ${pvs.length ? (() => { /* grafik batang 100% per provinsi: sawit, HTI, HPH, tambang, di luar konsesi (pemilik, 14 Okt 2026) */
        const segs = [...daf.map(j => [jn(j)[0], jn(j)[1], o => o[j] || 0]), ["Di luar konsesi", "#cfd8e3", (o, n, t) => t - n]];
        const W = 940, L = 210, R = 70, rh = 34, T = 8, H = T + pvs.length * rh + 6, bw = W - L - R;
        let g = "";
        pvs.forEach(([k, o, n], i) => { const t = Math.max(nPv[k] || 0, n), y = T + i * rh; let x0 = L;
          g += `<text x="${L - 12}" y="${y + 21}" text-anchor="end" font-size="13" font-weight="600">${esc(namaProv(k))}</text>`;
          segs.forEach(([nm, w, f]) => { const v = f(o, n, t), lw = t ? v / t * bw : 0; if (lw <= 0) return;
            g += `<rect x="${x0}" y="${y + 7}" width="${lw}" height="${rh - 14}" fill="${w}" data-tip="<b>${esc(namaProv(k))}</b><br>${nm}: ${pct(v / t)} (${fmt(v)} titik)"/>${lw >= 34 ? `<text x="${x0 + lw / 2}" y="${y + 21.5}" text-anchor="middle" font-size="10.5" font-weight="700" class="${w === "#cfd8e3" ? "ks-td" : "ks-tl"}" pointer-events="none">${pct(v / t)}</text>` : ""}`; x0 += lw; });
          g += `<text x="${W - R + 10}" y="${y + 21}" font-size="12" font-weight="800">${pct(n / (t || 1))}</text>`; });
        return `<div class="ks-ch"><b>Titik panas di areal konsesi per provinsi</b><span>% di konsesi</span></div><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Porsi titik panas di areal konsesi per provinsi">${g}</svg>
          <div class="ex-leg" style="justify-content:center;font-size:11.5px;margin-top:4px">${segs.map(([nm, w]) => `<span><i style="background:${w}"></i>${nm}</span>`).join("")}</div>`; })() : ""}
      ${(() => { /* versi gambut: porsi titik panas di lahan gambut vs tanah mineral per provinsi */
        const g0 = {}; S.kluster.features.forEach(f => { const k = KK.kompleks?.[f.properties.id]; if (!k) return; const o = g0[f.properties.prov] ||= {n: 0, g: 0}; o.n += k.n || 0; o.g += (k.gambut || 0) * (k.n || 0); });
        const rows = Object.entries(g0).filter(([, o]) => o.n >= 50).sort((a, b) => b[1].n - a[1].n).slice(0, 10); if (!rows.length) return "";
        const W = 940, L = 210, R = 70, rh = 34, T = 8, H = T + rows.length * rh + 6, bw = W - L - R; let g = "";
        rows.forEach(([k, o], i) => { const y = T + i * rh, gp = o.g / o.n, segs = [["Gambut", "#6b4a2b", gp], ["Tanah mineral", "#d9c7a8", 1 - gp]]; let x0 = L;
          g += `<text x="${L - 12}" y="${y + 21}" text-anchor="end" font-size="13" font-weight="600">${esc(namaProv(k))}</text>`;
          segs.forEach(([nm, w, v]) => { const lw = v * bw; if (lw <= 0) return; g += `<rect x="${x0}" y="${y + 7}" width="${lw}" height="${rh - 14}" fill="${w}" data-tip="<b>${esc(namaProv(k))}</b><br>${nm}: ${pct(v)} (${fmt(Math.round(v * o.n))} titik)"/>${lw >= 34 ? `<text x="${x0 + lw / 2}" y="${y + 21.5}" text-anchor="middle" font-size="10.5" font-weight="700" class="${w === "#6b4a2b" ? "ks-tl" : "ks-td"}" pointer-events="none">${pct(v)}</text>` : ""}`; x0 += lw; });
          g += `<text x="${W - R + 10}" y="${y + 21}" font-size="12" font-weight="800">${pct(gp)}</text>`; });
        return `<div class="ks-ch ks-ch2"><b>Titik panas di lahan gambut per provinsi</b><span>% di gambut</span></div><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Porsi titik panas di lahan gambut per provinsi">${g}</svg>
          <div class="ex-leg" style="justify-content:center;font-size:11.5px;margin-top:4px"><span><i style="background:#6b4a2b"></i>Gambut</span><span><i style="background:#d9c7a8"></i>Tanah mineral</span></div>`; })()}
      <footer class="ex-ft ks-ft"><span></span><em>Sumber: NASA FIRMS VIIRS 375 m (7 hari); ${BATAS} (Kemenhut via Global Forest Watch, Trase, Kemenhut PPKH). Satu titik bisa jatuh di dua areal yang tumpang tindih. Titik di areal konsesi bukan bukti siapa yang membakar. Klik baris untuk menandai kompleksnya.</em></footer>`;
  }
  function tunjuk(j) {
    const ids = S.kluster.features.filter(f => jenisDi(f.properties.id)[j]).map(f => f.properties.id);
    F.jenis = j; Tabel.hal = 0; nanti(() => Tabel.render());
    if (!ids.length) return;
    const b = new maplibregl.LngLatBounds();
    S.kluster.features.filter(f => ids.includes(f.properties.id)).forEach(f => b.extend([f.properties.lon, f.properties.lat]));
    bukaTab("peta");
    nanti(() => { peta.fitBounds(b, {padding: kiriPad(), maxZoom: 10, duration: 900});
      peta.setPaintProperty("kl-line", "line-width", ["case", ["in", ["get", "id"], ["literal", ids]], 3.6, 1.8]);
      if (typeof toast === "function") toast(`${ids.length} kompleks dengan titik panas di areal ${jn(j)[2].toLowerCase()} ditandai garis tebal`); });
  }
  muat();
})();
