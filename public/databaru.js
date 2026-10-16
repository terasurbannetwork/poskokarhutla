/* databaru.js — data yang sudah dihasilkan pipeline tetapi belum tampil. Satu berkas untuk dua halaman (data-halaman):
   karhutla: fwi_ansambel.json (peluang FWI 51 anggota ECMWF), tanah.json (kelembapan tanah vs iklim 2015–2025),
             asap.json kolom co_maks & aod_maks, peringatan.json (BMKG) -> bagian laci "Peluang & kondisi", kartu Prioritas,
             lapisan + legenda peringatan BMKG, pita peringatan aktif.
   banjir:   peringatan.json (lapisan + pita), hujan_ansambel.json (bagian di popup Analisa wilayah),
             angin bergerak dari hujan.json ws/wd (kanvas di atas peta, mati bawaan).
   Skrip klasik dimuat SETELAH skrip utama (dan lapisan5.js): memakai global halaman peta, S, Peta, Laci, Analisa, renderLegenda,
   renderPrioritas, muatJSON, esc, fmt, gelap, $, toast. Tidak mengubah index.html selain tag (lihat DATABARU.md). */
(() => {
  const HAL = document.currentScript?.dataset.halaman || (location.pathname.includes("/banjir") ? "banjir" : "karhutla");
  const W = {merah: "#c9503a", oranye: "#e58a45", kuning: "#e3b94e", hijau: "#5a9e74", biru: "#4f8fc4", ungu: "#5f6fb0", biru2: "#3f7fb8", toska: "#2b8c86", tua: "#7a2b2b"};
  const C = {}, muat = (k, u) => C[k] ||= muatJSON(u).catch(e => { delete C[k]; throw e; });
  const PER = () => muat("peringatan", "data/peringatan.json");
  const hr = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric"});
  const jam = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  const pct = p => p == null ? "–" : Math.round(p * 100) + "%";
  const lipat = (j, isi, buka = true, kls = "") => `<details class="lipat ${kls}" ${buka ? "open" : ""}><summary>${j}</summary><div class="isi">${isi}</div></details>`;
  const nyala = k => !!document.querySelector(`#lapis input[data-l="${k}"]:checked`);
  const dekat = (gs, lat, lon, maks) => { let b = null, d = maks * maks; for (const g of gs) { const x = (g.lat - lat) ** 2 + (g.lon - lon) ** 2; if (x <= d) { d = x; b = g; } } return b; };
  /* sel peluang: warna ikut besar peluang; jingga untuk api, biru untuk hujan */
  const SK_API = [[.8, W.merah], [.5, W.oranye], [.2, W.kuning], [0, ""]], SK_AIR = [[.8, W.ungu], [.5, W.biru2], [.2, W.biru], [0, ""]];
  const sel = (p, sk, tip) => { const c = p == null ? "" : sk.find(([a]) => p >= a)[1];
    return `<span class="db-p${c ? "" : " nol"}" style="${c ? `background:${c};color:${c === W.kuning ? "#2a2a2a" : "#fff"}` : ""}" data-tip="${esc(tip)}">${pct(p)}</span>`; };
  const pita = (hari, baris) => `<div class="db-pita" style="--n:${hari.length}"><span></span>${hari.map(t => `<b>${hr(t).replace(/,? /, "<br>")}</b>`).join("")}
    ${baris.map(([nama, info, isi]) => `<span class="db-nm" data-tip="${esc(info)}">${nama}</span>${isi}`).join("")}</div>`;

  /* ================================================================ peringatan BMKG (dua halaman) */
  const SEV = {Extreme: [W.tua, "Ekstrem"], Severe: [W.merah, "Parah"], Moderate: [W.oranye, "Sedang"], Minor: [W.kuning, "Ringan"]};
  const aktif = x => !!x.selesai && new Date(x.selesai) > Date.now();
  /* halaman karhutla: hanya peringatan yang mengubah perilaku api/asap; hujan hanya bila jatuh di provinsi yang punya kompleks prioritas
     (kabar baik untuk pemadaman); gelombang tinggi tidak relevan */
  const R_API = /angin|asap|kabut|kebakaran|kering|panas|debu|jarak pandang/i;
  const provApi = () => new Set((S.kluster?.features || []).filter(f => f.properties.level === 3).map(f => f.properties.prov));
  const diProvApi = x => { const t = (x.headline || "") + " " + (x.wilayah || ""), P = provApi(); return [...P].some(k => t.includes(namaProv(k))); };
  const relevan = x => HAL !== "karhutla" || R_API.test(x.event + " " + (x.headline || "")) || (/hujan/i.test(x.event) && diProvApi(x));
  const hujanBaik = x => HAL === "karhutla" && /hujan/i.test(x.event) && !R_API.test(x.event);
  const GEL = [["ekstrem", "ekstrem (> 6 m)", W.tua], ["sangat_tinggi", "sangat tinggi (4–6 m)", W.merah], ["tinggi", "tinggi (2,5–4 m)", W.oranye]];
  const geoBMKG = d => ({type: "FeatureCollection", features: d.nowcast.filter(x => x.polygon && relevan(x)).flatMap(x => x.polygon.map(r => ({type: "Feature",
    geometry: {type: "Polygon", coordinates: [r]}, properties: {id: x.id, a: aktif(x) ? 1 : 0, w: (SEV[x.severity] || SEV.Minor)[0]}})))});
  async function pasangBMKG() {
    const d = await PER(); if (peta.getSource("db-bmkg")) return;
    peta.addSource("db-bmkg", {type: "geojson", data: geoBMKG(d), attribution: "Peringatan dini © BMKG"});
    peta.addLayer({id: "db-bmkg-fill", type: "fill", source: "db-bmkg", paint: {"fill-color": ["get", "w"], "fill-opacity": ["case", ["==", ["get", "a"], 1], .35, .08]}});
    peta.addLayer({id: "db-bmkg-line", type: "line", source: "db-bmkg", filter: ["==", ["get", "a"], 1], paint: {"line-color": ["get", "w"], "line-width": 2}});
    peta.addLayer({id: "db-bmkg-lama", type: "line", source: "db-bmkg", filter: ["==", ["get", "a"], 0], paint: {"line-color": ["get", "w"], "line-width": 1, "line-dasharray": [2, 2]}});
    if (C.hover) return; C.hover = 1;
    const pop = new maplibregl.Popup({closeButton: false, closeOnClick: false, maxWidth: "280px"});
    peta.on("mousemove", "db-bmkg-fill", async e => { const d = await PER(), x = d.nowcast.find(n => n.id === e.features[0].properties.id); if (!x) return;
      pop.setLngLat(e.lngLat).setHTML(kartuBMKG(x)).addTo(peta); });
    peta.on("mouseleave", "db-bmkg-fill", () => pop.remove());
  }
  const kartuBMKG = x => `<b>${esc(x.headline || x.event)}</b><br>${esc(x.wilayah)}<br><small>${aktif(x) ? "Berlaku sampai " + jam(x.selesai) : "Sudah berakhir " + jam(x.selesai)} · tingkat ${(SEV[x.severity] || ["", x.severity])[1].toLowerCase()}</small>`;
  /* pita kecil di kolom alat peta: hanya muncul bila ada yang berlaku */
  async function pitaBMKG() {
    const d = await PER().catch(() => null); if (!d || $(".db-bmkg")) return;
    const now = d.nowcast.filter(x => aktif(x) && relevan(x)), gel = HAL === "karhutla" ? [] : d.gelombang.flatMap(g => GEL.filter(([k]) => g[k]?.length && new Date(g.sampai + ({WITA: "+08:00", WIT: "+09:00"}[g.zona] || "+07:00")) > Date.now() - 864e5).map(([k, n, w]) => ({g, n, w, xs: g[k]})));
    if (!now.length && !gel.length) return;
    const el = document.createElement("details"); el.className = "db-bmkg";
    el.innerHTML = `<summary><i></i>BMKG: ${[now.length && `${now.length} peringatan ${HAL === "karhutla" ? "terkait api" : "cuaca"}`, gel.length && `${gel.length} gelombang tinggi`].filter(Boolean).join(" · ")}</summary>
      <div>${now.map(x => `<p><b style="color:${hujanBaik(x) ? W.biru : (SEV[x.severity] || SEV.Minor)[0]}">${esc(x.event)}${hujanBaik(x) ? " (membantu pemadaman)" : ""}</b> ${esc((x.headline || "").replace(x.event, "").trim())}<br>${esc(x.wilayah)}<br><small>sampai ${jam(x.selesai)}${x.web ? ` · <a href="${esc(x.web)}" target="_blank" rel="noopener">BMKG</a>` : ""}</small></p>`).join("")}
      ${gel.map(({g, n, w, xs}) => `<p><b style="color:${w}">Gelombang ${n}</b> ${esc(g.wilayah)}<br><small>${esc(xs.slice(0, 4).join(", "))}${xs.length > 4 ? ` +${xs.length - 4} lagi` : ""}</small></p>`).join("")}
      <small class="db-cat">Peringatan dini cuaca BMKG biasanya berlaku 2–3 jam. Data ${jam(d.dibuat)}; cek <a href="https://www.bmkg.go.id/peringatan-dini/nowcast" target="_blank" rel="noopener">bmkg.go.id</a> untuk yang terbaru.</small></div>`;
    $("#lapisBtn")?.after(el);
  }
  const legBMKG = () => nyala("bmkg") ? `<div class="lbl" style="margin-top:8px">Peringatan dini cuaca BMKG</div><div class="leg" style="margin-top:4px">${Object.values(SEV).slice(1, 4).map(([w, n]) => `<span><i class="sw" style="background:${w}"></i>${n}</span>`).join("")}
    <span><i class="sw" style="background:transparent;border:1px dashed var(--ink2)"></i>Sudah berakhir</span><span>Arahkan kursor ke poligon untuk rinciannya</span></div>` : "";

  /* ================================================================ kerangka lapisan (sama dengan lapisan5.js) */
  const LAYER = {bmkg: ["db-bmkg-fill", "db-bmkg-line", "db-bmkg-lama"]}, PASANG = {bmkg: pasangBMKG};
  async function lihat(k, on) {
    if (k === "angin") { on ? Angin.mulai() : Angin.henti(); return renderLegenda(); }
    if (on && !peta.getLayer(LAYER[k][0])) { try { await PASANG[k](); } catch (e) { console.warn(k, e); toast("Lapisan " + k + " gagal dimuat"); } }
    LAYER[k].forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none")); renderLegenda(); }
  function kotakLapis(grup, kunci) {
    const L = $("#lapis"); if (!L || L.querySelector('[data-l="bmkg"]')) return;
    const d = [...L.querySelectorAll("details")].find(d => d.querySelector("summary")?.textContent.trim() === grup || d.querySelector("summary")?.textContent.trim() === window.T?.(grup));
    const h = kunci.map(([k, n]) => `<label><input type="checkbox" data-l="${k}"> ${n}</label>`).join("");
    d ? d.insertAdjacentHTML("beforeend", h) : L.insertAdjacentHTML("beforeend", `<details open><summary>${grup}</summary>${h}</details>`);
    const K = new Set(kunci.map(x => x[0]));
    /* fase tangkap: penangan bawaan halaman tidak mengenal kunci ini (map[k] undefined) */
    L.addEventListener("change", e => { const i = e.target.closest("input"); if (!i || !K.has(i.dataset.l)) return; e.stopImmediatePropagation(); if (peta) lihat(i.dataset.l, i.checked); }, true);
    tungguPeta(() => peta.on("style.load", () => setTimeout(() => nyala("bmkg") && lihat("bmkg", true), 60)));
  }
  const tungguPeta = fn => (typeof peta !== "undefined" && peta) ? fn() : setTimeout(() => tungguPeta(fn), 300);
  const _leg = renderLegenda;
  renderLegenda = function () { _leg(); const box = document.querySelector("#legDet > div"); if (!box) return;
    const h = legBMKG() + (nyala("angin") && HAL === "banjir" ? `<div class="lbl" style="margin-top:8px">Angin siang (bergerak)</div><div class="leg" style="margin-top:4px"><span>Garis mengalir searah angin 10 m jam 12 WIB pada hari terpilih; makin pekat makin kencang. Hanya di darat.</span>${Angin.diam ? "<span>Gerak dimatikan (pengaturan kurangi gerakan): garis diam.</span>" : ""}</div>` : "");
    if (h) box.insertAdjacentHTML("beforeend", h); };

  /* ================================================================ karhutla */
  function karhutla() {
    /* karhutla: peringatan dini BMKG tidak ditampilkan sebagai lapisan (permintaan pemilik) */
    pitaBMKG();
    const ANS = () => muat("ans", "data/fwi_ansambel.json"), TNH = () => muat("tanah", "data/tanah.json");
    const ASAP = () => Lapis.cache.asap ? Promise.resolve(Lapis.cache.asap) : muat("asap", "data/asap.json").then(d => Lapis.cache.asap ||= d);
    const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], das = i => BLN[Math.floor(i / 3)] + " " + ["awal", "tengah", "akhir"][i % 3];
    const kataTanah = p => p <= 10 ? "jauh lebih kering dari biasa" : p <= 30 ? "lebih kering dari biasa" : p < 70 ? "sekitar normal" : p < 90 ? "lebih basah dari biasa" : "jauh lebih basah dari biasa";
    const warnaTanah = p => p <= 10 ? W.merah : p <= 30 ? W.oranye : p < 70 ? "var(--ink2)" : W.biru2;
    const pitaAns = (a, g) => pita(a.hari, [
      ["≥ sangat tinggi", "Peluang FWI ≥ 14: cuaca membuat api sangat mudah menyala dan menjalar cepat", g.ps.map((p, j) => sel(p, SK_API, `${hr(a.hari[j])}: ${pct(p)} skenario FWI ≥ 14 (sangat tinggi). FWI tengah ${fmt(g.med[j])}, rentang wajar ${fmt(g.p10[j])}–${fmt(g.p90[j])}`)).join("")],
      ["≥ tinggi", "Peluang FWI ≥ 7: api mudah menyala", g.pt.map((p, j) => sel(p, SK_API, `${hr(a.hari[j])}: ${pct(p)} skenario FWI ≥ 7 (tinggi)`)).join("")],
      ["hujan ≥ 5 mm", "Peluang hujan 24 jam minimal 5 mm, cukup untuk menurunkan bahaya serasah sementara", (g.ph || []).map((p, j) => sel(p, SK_AIR, `${hr(a.hari[j])}: ${pct(p)} skenario hujan ≥ 5 mm`)).join("")]]);
    /* cara baca ansambel: satu contoh kotak + skala warna, bukan paragraf */
    const catatanAns = a => { const n = a.anggota, mdl = a.model === "ecmwf_ifs025" ? "ECMWF" : "GFS", c = (p, w) => `<span class="db-cb" style="background:${w || "var(--surface)"};color:${w ? "#fff" : "var(--ink)"}">${Math.round(p * 100)}%</span>`;
      return `<div class="db-cara"><div>${c(.8, W.merah)}<span>= <b>${Math.round(n * .8)} dari ${n}</b> skenario cuaca ${mdl} memperkirakan kondisi itu terjadi.</span></div>
        <div class="db-sk"><span>Peluang api</span>${[[.1, ""], [.3, W.kuning], [.6, W.oranye], [.9, W.merah]].map(([p, w]) => c(p, w)).join("")}</div>
        <div class="db-sk"><span>Peluang hujan</span>${[[.3, W.biru], [.6, W.biru2], [.9, W.ungu]].map(([p, w]) => c(p, w)).join("")}</div></div>`; };

    /* --- laci kompleks: bagian "Peluang & kondisi" setelah "Cuaca di lokasi" --- */
    const _buka = Laci.buka.bind(Laci);
    Laci.buka = function (id) { _buka(id); tambahLaci(id); };
    async function tambahLaci(id) {
      const p = S.kluster.features.find(f => f.properties.id === id)?.properties; if (!p) return;
      const [a, t, s, b] = await Promise.all([ANS(), TNH(), ASAP(), PER()].map(x => x.catch(() => null)));
      if (S.pilihK !== id || $("#laci .db-laci")) return;
      const g = a && dekat(a.grid, p.lat, p.lon, .5), tn = t && dekat(t.grid, p.lat, p.lon, .5);
      const as = s?.grid.find(r => r[0] === Math.floor(p.lat) + .5 && r[1] === Math.floor(p.lon) + .5);
      let h = "";
      h += g ? `<div class="lbl">Peluang bahaya cuaca 7 hari</div>${pitaAns(a, g)}${catatanAns(a)}`
        : `<p class="fnd">Peluang ansambel hanya dihitung untuk ${a ? "provinsi yang sering mengalami karhutla" : "data yang sudah tersedia"}; kompleks ini di luar cakupan.</p>`;
      if (tn && (tn.sm0 != null || tn.sm1 != null)) h += `<div class="lbl" style="margin-top:6px">Kelembapan tanah hari ini</div><table class="tb2"><tbody>
        ${[0, 1].map(j => `<tr><td>${t.lapisan[j]}</td><td class="n">${tn["pct" + j] != null ? `<b style="color:${warnaTanah(tn["pct" + j])}" data-tip="Persentil ${tn["pct" + j]}: lebih ${tn["pct" + j] < 50 ? "kering" : "basah"} dari ${tn["pct" + j] < 50 ? 100 - tn["pct" + j] : tn["pct" + j]}% hari pada ${das(t.dasarian)} tahun 2015–2025">${kataTanah(tn["pct" + j])}</b> · p${tn["pct" + j]} · ` : ""}${fmt(Math.round(tn["sm" + j] * 100))}% vol.</td></tr>`).join("")}</tbody></table>
        <p class="fnd">${tn.pct0 == null && tn.pct1 == null ? "" : `Dibanding hari-hari ${das(t.dasarian)} 2015–2025. p10 = lebih kering dari 90% hari itu. `}% vol. = bagian tanah yang berisi air. Ini model tanah mineral, bukan gambut: pakai sebagai pendukung DC, bukan pengganti tinggi muka air gambut.</p>`;
      if (as) { const ada = as[4] || as[5], tg = s.hari;
        if (ada) h += `<div class="lbl" style="margin-top:6px">Asap: karbon monoksida & kekeruhan udara (CAMS)</div><table class="tb3"><thead><tr><th>Hari</th><th class="n">CO maks µg/m³</th><th class="n">AOD maks</th></tr></thead><tbody>
          ${tg.map((d, j) => `<tr><td>${hr(d)}</td><td class="n num" style="${(as[4]?.[j] || 0) >= 4000 ? `color:${W.merah};font-weight:800` : ""}">${fmt(as[4]?.[j])}</td><td class="n num" style="${(as[5]?.[j] || 0) > 1 ? `color:${W.merah};font-weight:800` : ""}">${as[5]?.[j] == null ? "–" : String(as[5][j]).replace(".", ",")}</td></tr>`).join("")}</tbody></table>
          ${[["CO (gas beracun dari pembakaran)", [[W.hijau, "± 100–200 bersih"], [W.oranye, "di atas normal"], [W.merah, "≥ 4.000 lewat pedoman WHO 24 jam"]]],
            ["AOD (kekeruhan udara dilihat dari atas)", [[W.hijau, "< 0,3 jernih"], [W.oranye, "0,3–1 berasap"], [W.merah, "> 1 asap tebal"]]]].map(([j, xs]) => `<div class="lbl" style="margin-top:6px">${j}</div><div class="leg" style="flex-direction:row;flex-wrap:wrap;gap:4px 14px">${xs.map(([w, n]) => `<span><i class="sw" style="background:${w}"></i>${n}</span>`).join("")}</div>`).join("")}
          <p class="fnd">Prakiraan per kotak ± 110 km, jadi asap dekat api bisa jauh lebih pekat.</p>`; }
      const w = b?.nowcast.filter(x => aktif(x) && x.prov.includes(p.prov)) || [];
      if (w.length) h += `<div class="lbl" style="margin-top:6px">Peringatan BMKG berlaku di provinsi ini</div>${w.map(x => `<p style="margin:0;font-size:12.5px">${kartuBMKG(x)}</p>`).join("")}`;
      const sesudah = [...document.querySelectorAll("#laci details.lipat")].find(d => d.querySelector("summary")?.textContent.startsWith("Cuaca di lokasi"));
      const html = lipat("Peluang & kondisi", h, true, "db-laci");
      sesudah ? sesudah.insertAdjacentHTML("afterend", html) : $("#laci .bd")?.insertAdjacentHTML("afterbegin", html);
    }

    /* --- kartu Prioritas: ringkasan provinsi --- */
    if (typeof renderPrioritas === "function") { const _rp = renderPrioritas;
      renderPrioritas = async function () { await _rp(); const [a, t, b] = await Promise.all([ANS(), TNH(), PER()].map(x => x.catch(() => null)));
        document.querySelectorAll("#prioritas article button[data-k]").forEach(btn => { const k = btn.dataset.k, art = btn.closest("article"); if (art.querySelector(".db-prio")) return;
          let h = ""; const gs = a?.grid.filter(g => g.prov === k) || [];
          if (gs.length) { const maks = a.hari.map((_, j) => Math.max(...gs.map(g => g.ps[j] ?? 0)));
            h += pita(a.hari, [["sangat tinggi", "Peluang tertinggi FWI ≥ 14 di sel mana pun di provinsi ini", maks.map((p, j) => sel(p, SK_API, `${hr(a.hari[j])}: di sel terburuk, ${pct(p)} skenario FWI ≥ 14`)).join("")]])
              + `<p class="fnd">Peluang tertinggi di provinsi dari ${a.anggota} skenario ECMWF.</p>`; }
          const ts = t?.grid.filter(g => g.prov === k && g.pct1 != null) || [];
          if (ts.length) { const n = ts.filter(g => g.pct1 <= 10).length; h += `<p style="margin:0;font-size:12.5px"><b>${fmt(n)} dari ${fmt(ts.length)}</b> sel tanah (7–28 cm) jauh lebih kering dari biasa untuk ${das(t.dasarian)}.</p>`; }
          const w = b?.nowcast.filter(x => aktif(x) && x.prov.includes(k)) || [];
          if (w.length) h += `<p style="margin:0;font-size:12.5px;color:${W.oranye}"><b>${w.length} peringatan BMKG berlaku:</b> ${w.map(x => esc(x.event)).join(", ")}</p>`;
          if (h) btn.insertAdjacentHTML("beforebegin", lipat("Peluang 7 hari & kondisi", h, true, "db-prio")); }); };
      if (document.querySelector("#prioritas article")) renderPrioritas(); }
  }

  /* ================================================================ banjir */
  /* angin bergerak dari hujan.json (sel 0,25 derajat, darat saja): pola Angin karhutla, dibatasi 2.500 partikel */
  const Angin = {
    cv: null, ctx: null, p: [], jalan: false, gerak: false, medan: null, raf: 0, diam: matchMedia("(prefers-reduced-motion: reduce)").matches,
    bangun() { const H = S.hujan, s = H.sel, j = Math.max(0, H.hari.indexOf(S.st.hari[S.hari] ?? H.hari_ini)), m = new Map();
      for (const g of H.grid) { const ws = g.ws?.[j], wd = g.wd?.[j]; if (ws == null || wd == null) continue; const r = wd * Math.PI / 180;
        m.set(Math.floor(g.lat / s) + "," + Math.floor(g.lon / s), [-ws * Math.sin(r), -ws * Math.cos(r)]); }
      this.medan = m; },
    di(lon, lat) { const s = S.hujan.sel, fy = lat / s - .5, fx = lon / s - .5, i = Math.floor(fy), k = Math.floor(fx), ty = fy - i, tx = fx - k;
      let u = 0, v = 0, w = 0;
      for (const [a, b, bb] of [[i, k, (1 - ty) * (1 - tx)], [i + 1, k, ty * (1 - tx)], [i, k + 1, (1 - ty) * tx], [i + 1, k + 1, ty * tx]]) {
        const x = this.medan.get(a + "," + b); if (!x) continue; u += x[0] * bb; v += x[1] * bb; w += bb; }
      return w > .1 ? [u / w, v / w] : null; },
    baru() { const b = peta.getBounds(); return {lon: b.getWest() + Math.random() * (b.getEast() - b.getWest()), lat: b.getSouth() + Math.random() * (b.getNorth() - b.getSouth()), umur: Math.random() * 90 | 0}; },
    mulai() {
      if (!this.cv) { this.cv = document.createElement("canvas"); this.cv.className = "db-angin"; $("#peta").appendChild(this.cv); this.ctx = this.cv.getContext("2d");
        peta.on("movestart", () => { this.gerak = true; this.ctx.clearRect(0, 0, this.cv.width, this.cv.height); });
        peta.on("moveend", () => { this.gerak = false; this.p = this.p.map(() => this.baru()); if (this.diam && this.jalan) this.statis(); });
        peta.on("resize", () => this.ukur());
        document.addEventListener("visibilitychange", () => { if (!document.hidden && this.jalan && !this.diam) this.putar(); });
        $("#hariSeg")?.addEventListener("click", () => requestAnimationFrame(() => { if (!this.jalan) return; this.bangun(); if (this.diam) this.statis(); })); }
      this.ukur(); this.bangun(); this.p = Array.from({length: innerWidth > 900 ? 2500 : 1000}, () => this.baru());
      this.cv.style.display = "block"; this.jalan = true; this.diam ? this.statis() : this.putar(); },
    henti() { this.jalan = false; cancelAnimationFrame(this.raf); if (this.cv) { this.cv.style.display = "none"; this.ctx.clearRect(0, 0, this.cv.width, this.cv.height); } },
    ukur() { const r = devicePixelRatio || 1, c = peta.getCanvas(); this.cv.width = c.clientWidth * r; this.cv.height = c.clientHeight * r;
      this.cv.style.width = c.clientWidth + "px"; this.cv.style.height = c.clientHeight + "px"; this.ctx.setTransform(r, 0, 0, r, 0, 0); },
    putar() { cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(() => this.loop()); },
    langkah() { const c = this.ctx, dpp = 360 / (512 * 2 ** peta.getZoom()), gk = gelap() || Peta.lihat("satelit");
      c.lineWidth = 1.1;
      for (const q of this.p) {
        const w = this.di(q.lon, q.lat);
        if (!w || ++q.umur > 110) { Object.assign(q, this.baru(), {umur: 0}); continue; }
        const a = peta.project([q.lon, q.lat]), k = .045 * dpp, sp = Math.hypot(w[0], w[1]);
        q.lon += w[0] * k / Math.cos(q.lat * Math.PI / 180); q.lat += w[1] * k;
        const b = peta.project([q.lon, q.lat]);
        c.strokeStyle = gk ? `rgba(255,255,255,${Math.min(.85, .25 + sp / 30)})` : `rgba(31,63,110,${Math.min(.8, .2 + sp / 30)})`;
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } },
    loop() {
      if (!this.jalan || document.hidden) return; /* tab tersembunyi: berhenti; visibilitychange menyalakan lagi */
      const c = this.ctx, Wd = this.cv.width, Hd = this.cv.height;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "destination-in"; c.fillStyle = "rgba(0,0,0,.93)"; c.fillRect(0, 0, Wd, Hd); c.restore();
      c.globalCompositeOperation = "source-over";
      if (!this.gerak && this.medan) this.langkah();
      this.raf = requestAnimationFrame(() => this.loop()); },
    /* kurangi gerakan: garis arus diam, digambar sekali tiap peta berhenti bergerak */
    statis() { const c = this.ctx; c.clearRect(0, 0, this.cv.width, this.cv.height); this.p.forEach(q => q.umur = 0); for (let i = 0; i < 18; i++) this.langkah(); },
  };

  function banjir() {
    kotakLapis("Cuaca", [["bmkg", "Peringatan dini cuaca BMKG"], ["angin", "Angin (bergerak)"]]);
    pitaBMKG();
    const ENS = () => muat("ens", "data/hujan_ansambel.json");
    const _w = Analisa.wilayah.bind(Analisa);
    Analisa.wilayah = function (kunci) { _w(kunci); tambah(kunci); };
    async function tambah(kunci) {
      const [e, b] = await Promise.all([ENS(), PER()].map(x => x.catch(() => null)));
      const d = $("#dlg"); if (!d?.open || d.querySelector(".db-ens") || !$("#dlgJudul")) return;
      const p = kunci.split("|"); let h = "";
      if (e) { let g;
        if (p.length === 1) { const gs = e.grid.filter(x => x.prov === p[0]); if (gs.length) g = {p50: [], p100: [], p3: []}, ["p50", "p100", "p3"].forEach(k => g[k] = e.hari.map((_, j) => Math.max(...gs.map(x => x[k][j] ?? 0)))); }
        else { let [lat, lon] = pusat(kunci);
          if (!lat && !lon) { /* dibuka dari daftar, wilayah tidak sedang di peta: titik tengah kecamatan dari pusat_kec.json */
            const pk = await muat("pusat", "data/pusat_kec.json").catch(() => ({})), xs = Object.entries(pk).filter(([k]) => k === kunci || k.startsWith(kunci + "|")).map(x => x[1]);
            if (xs.length) [lat, lon] = [xs.reduce((a, x) => a + x[0], 0) / xs.length, xs.reduce((a, x) => a + x[1], 0) / xs.length]; }
          g = (lat || lon) && dekat(e.grid, lat, lon, 1); }
        if (g) h += pita(e.hari, [
          ["3 hari ≥ 100 mm", "Peluang hujan total 3 hari mulai hari itu minimal 100 mm: jalur yang dipakai status Siaga", g.p3.map((x, j) => sel(x, SK_AIR, `${hr(e.hari[j])}–${hr(e.hari[Math.min(j + 2, e.hari.length - 1)])}: ${pct(x)} skenario hujan 3 hari ≥ 100 mm`)).join("")],
          ["harian ≥ 50 mm", "Peluang hujan lebat (≥ 50 mm sehari, skala BMKG)", g.p50.map((x, j) => sel(x, SK_AIR, `${hr(e.hari[j])}: ${pct(x)} skenario hujan ≥ 50 mm`)).join("")],
          ["harian ≥ 100 mm", "Peluang hujan sangat lebat (≥ 100 mm sehari)", g.p100.map((x, j) => sel(x, SK_AIR, `${hr(e.hari[j])}: ${pct(x)} skenario hujan ≥ 100 mm`)).join("")]])
          + `<p class="fnd">Dari ${e.anggota} skenario cuaca ${e.model === "ecmwf_ifs025" ? "ECMWF" : "GFS"}, berapa persen yang membawa hujan sebanyak itu. 50% = setengah skenario: peluang, bukan kepastian. ${p.length === 1 ? "Angka = titik terburuk di provinsi." : "Satu titik mewakili kotak ± 110 km, jadi hujan lokal bisa berbeda."} Peluang 3 hari ≥ 50% menaikkan status ke Siaga di kecamatan dengan bahaya banjir InaRISK sedang atau tinggi.</p>`;
        else h += `<p class="fnd">Tidak ada titik ansambel dalam 1° dari wilayah ini.</p>`; }
      const w = b?.nowcast.filter(x => aktif(x) && x.prov.includes(p[0])) || [];
      if (w.length) h += `<div class="lbl" style="margin-top:6px">Peringatan BMKG berlaku di provinsi ini</div>${w.map(x => `<p style="margin:0;font-size:12.5px">${kartuBMKG(x)}</p>`).join("")}`;
      if (!h) return;
      const html = lipat("Peluang hujan lebat 8 hari (ansambel)", h, true, "db-ens"), sesudah = [...d.querySelectorAll("details.lipat")].find(x => x.querySelector("summary")?.textContent.startsWith("Hujan 10 hari"));
      sesudah ? sesudah.insertAdjacentHTML("afterend", html) : d.querySelector(".db .grid")?.insertAdjacentHTML("afterend", html);
    }
  }

  const mulai = () => HAL === "banjir" ? banjir() : karhutla();
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", mulai) : mulai();
})();
