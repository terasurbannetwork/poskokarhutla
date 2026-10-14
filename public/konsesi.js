/* konsesi.js — perusahaan pemegang areal konsesi di lokasi kompleks api.
   Data: data/kompleks_konsesi.json (scripts/data/konsesi_kompleks.py, harian) + data/lahan/sanksi_karhutla.json (tangan, bersumber).
   Menambah: tabel perusahaan + riwayat kasus di laci bagian "Lahan & penanggung jawab"; nama perusahaan di tooltip kompleks
   dan lapisan konsesi; kolom "Perusahaan" + saringan di tab Kompleks api; peraga "Kebakaran di konsesi".
   Skrip klasik dimuat SETELAH skrip utama dan databaru.js. Memakai global halaman: S, Laci, Tabel, peta, $, esc, fmt, muatJSON,
   bukaTab, nanti, namaProv, kiriPad. Bahasa netral: "titik panas berada di dalam areal konsesi", bukan tuduhan pembakar. */
(() => {
  if (typeof Laci === "undefined" || typeof Tabel === "undefined") return;
  let KK = null, SK = {}, SKM = null, janji = null;
  const muat = () => janji ||= Promise.all([muatJSON("data/kompleks_konsesi.json"), muatJSON("data/lahan/sanksi_karhutla.json").catch(() => ({kasus: []}))])
    .then(([a, b]) => { KK = a; SKM = b; SK = Object.fromEntries(b.kasus.map(k => [k.id, k])); })
    .catch(() => { KK = {kompleks: {}, perusahaan: [], gagal: true}; });
  const JN = {sawit: ["Sawit", "#c98a3c"], hti: ["HTI kayu pulp", "#6b8e3a"], hph: ["HPH hutan alam", "#2f6f8f"], tambang: ["Tambang (PPKH)", "#7a5c99"]};
  const KW = {HK: "kawasan konservasi", HL: "hutan lindung", THR: "tahura", HP: "hutan produksi", HPT: "hutan produksi terbatas", HPK: "hutan produksi konversi"};
  const JK = {perdata: "Gugatan perdata", pidana: "Pidana", administratif: "Sanksi administratif", penyegelan: "Penyegelan areal"};
  const pct = p => (p < .005 && p > 0 ? "< 1" : Math.round(p * 100)) + "%";
  const rp = v => v >= 1e12 ? `Rp${(v / 1e12).toFixed(2).replace(".", ",")} triliun` : `Rp${fmt(Math.round(v / 1e8) / 10)} miliar`;
  const jenis = j => `<span class="ks-j" style="--w:${(JN[j] || ["", "#888"])[1]}">${esc((JN[j] || [j])[0])}</span>`;
  const lencana = ids => ids?.length ? `<button class="ks-sk${ids.some(i => /perdata|pidana/.test(SK[i]?.jenis) && /tetap|putusan/.test(SK[i]?.status)) ? " berat" : ""}" data-sk="${esc(ids.join(","))}" aria-label="Riwayat kasus karhutla">${ids.length} kasus</button>` : "";
  const perDi = id => KK?.kompleks[id]?.perusahaan || [];
  const namaPer = id => perDi(id).map(r => r.nama + " " + (r.grup || "")).join(" ");

  /* --- popup riwayat kasus (dialog halaman) --- */
  function bukaSanksi(ids) {
    const ks = ids.map(i => SK[i]).filter(Boolean); if (!ks.length) return;
    const d = $("#dlg");
    d.innerHTML = `<div class="dh"><div><h3 id="dlgJudul">Riwayat kasus karhutla: ${esc(ks[0].nama)}</h3><p>Hanya kasus dengan sumber publik. Status per tanggal sumber.</p></div><button aria-label="Tutup" data-tutup>×</button></div>
      <div class="db"><table class="tb3"><thead><tr><th>Kasus</th><th>Status</th><th class="n">Nilai</th></tr></thead><tbody>${ks.map(k => `<tr>
        <td><b>${esc(JK[k.jenis] || k.jenis)}</b><small>${[k.kab, namaProv(k.prov)].filter(Boolean).map(esc).join(", ")}${k.tahun_kebakaran ? ` · kebakaran ${k.tahun_kebakaran}` : ""}${k.perkara ? ` · ${esc(k.perkara)}` : ""}</small></td>
        <td style="white-space:normal">${esc(k.status)}<small>${k.sumber.map(s => `<a href="${escUrl(s.url)}" target="_blank" rel="noopener">${esc(s.penerbit)}${s.tanggal ? ", " + esc(s.tanggal) : ""}</a>`).join(" · ")}</small></td>
        <td class="n num">${k.nilai_rp ? rp(k.nilai_rp) : k.nilai_gugatan_rp ? `<small>gugatan</small>${rp(k.nilai_gugatan_rp)}` : "–"}</td></tr>`).join("")}</tbody></table>
        <p class="fnd">${esc(SKM?.catatan || "")}</p></div>`;
    d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = ev => { if (ev.target === d) d.close(); }; d.showModal();
  }
  document.addEventListener("click", e => { const b = e.target.closest(".ks-sk"); if (b) { e.stopPropagation(); bukaSanksi(b.dataset.sk.split(",")); } });

  /* --- laci: tabel perusahaan di "Lahan & penanggung jawab" --- */
  const _buka = Laci.buka.bind(Laci);
  Laci.buka = function (id) { _buka(id); muat().then(() => tambahLaci(id)); };
  function tambahLaci(id) {
    if (S.pilihK !== id || $("#laci .ks-laci")) return;
    const sek = [...document.querySelectorAll("#laci details.lipat")].find(d => d.querySelector("summary")?.textContent.startsWith("Lahan & penanggung jawab"));
    if (!sek) return;
    const k = KK.kompleks[id], per = k?.perusahaan || [];
    let h = "";
    if (KK.gagal) h = `<p class="fnd">Data perusahaan konsesi belum tersedia.</p>`;
    /* daftar berlabel (bukan tabel lebar yang terpotong di laci); nomor izin tidak ditampilkan */
    else if (per.length) { const lb = (t, w) => `<span class="ks-lb"${w ? ` style="--w:${w}"` : ""}>${t}</span>`;
      h = `<div class="lbl">Titik panas berada di dalam areal konsesi</div><div class="ks-tp ks-laci-l">${per.map(r => { const g = r.grup || GRUP?.[r.nama]?.grup, ng = GRUP?.[r.nama]?.negara_induk, jn = JN[r.jenis] || [r.jenis, "#888"];
        return `<div class="ks-tp-r"><b>${esc(r.nama)}</b>${lencana(r.sanksi)}<div class="ks-tp-l">${lb(esc(jn[0]), jn[1])}${lb(pct(r.porsi) + " titik panas", "#c9503a")}${lb(fmt(r.n) + " titik · ± " + fmt(r.luas_ha) + " ha", "#5b6782")}${g ? lb("Grup " + esc(g), "#1d4e89") : lb("Grup tidak tercatat")}${ng ? lb("Induk " + esc(ng), "#5f6fb0") : ""}</div></div>`; }).join("")}
        <div class="ks-tp-r"><b>Di luar areal konsesi</b><div class="ks-tp-l">${lb(pct(k.luar) + " titik panas", "#2b8c86")}</div></div></div>`; }
    /* sebaran titik (konsesi, gambut, kawasan) jadi baris tabel lahan yang sudah ada, bukan kalimat lepas */
    const brs = [!KK.gagal && !per.length ? ["Di dalam konsesi", "tidak ada"] : null, k?.gambut ? ["Titik di gambut", pct(k.gambut)] : null,
      ...Object.entries(k?.kawasan || {}).sort((a, b) => b[1] - a[1]).map(([f, v]) => ["Titik di " + (KW[f] || f), pct(v)])].filter(Boolean)
      .map(([a, b]) => `<tr><td>${a}</td><td class="n">${b}</td></tr>`).join("");
    const tb = sek.querySelector(".isi .tb2 tbody");
    if (tb) tb.insertAdjacentHTML("beforeend", brs); else if (brs) h += `<table class="tb2"><tbody>${brs}</tbody></table>`;
    sek.querySelector(".isi").insertAdjacentHTML("beforeend", `<div class="ks-laci">${h}</div>`);
    const fn = sek.querySelector(".isi > .fnd"); if (fn) sek.querySelector(".isi").append(fn);
  }

  /* --- tooltip: kompleks (nama perusahaan) dan poligon konsesi --- */
  /* profil grup perusahaan (data/grup_perusahaan.json, opsional): nama pemegang izin -> {grup, negara_induk, sektor} */
  let GRUP = null; fetch("data/grup_perusahaan.json").then(r => r.ok ? r.json() : null).then(d => { GRUP = d?.perusahaan || null; }).catch(() => {});
  function pasangPeta() {
    if (typeof peta === "undefined" || !peta?.getLayer || !peta.getLayer("kl-fill")) return setTimeout(pasangPeta, 1500);
    const tip = $("#tip");
    const taruh = ev => { tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, ev.clientX + 14) + "px"; tip.style.top = Math.max(8, ev.clientY - tip.offsetHeight - 12) + "px"; };
    const kom = e => { const p = e.features[0].properties; muat().then(() => { const per = perDi(p.id);
      /* kartu seragam dengan tooltip peta lain: kepala ikon api + kompleks, daftar pemegang izin (jenis · porsi titik) */
      /* tiap pemegang izin: nama, lalu label jenis (warna jenis), porsi titik, grup & negara induk (data/grup_perusahaan.json) */
      const lbl = (t, w) => `<span class="ks-lb"${w ? ` style="--w:${w}"` : ""}>${t}</span>`;
      const baris = per.slice(0, 3).map(r => { const g = GRUP?.[r.nama], jn = JN[r.jenis] || [r.jenis, "#888"];
        return `<div class="ks-tp-r"><b>${esc(r.nama)}</b><div class="ks-tp-l">${lbl(esc(jn[0]), jn[1])}${lbl(pct(r.porsi) + " titik panas", "#c9503a")}${g?.grup ? lbl("Grup " + esc(g.grup), "#1d4e89") : lbl("Grup tidak tercatat")}${g?.negara_induk ? lbl("Induk " + esc(g.negara_induk), "#5f6fb0") : ""}</div></div>`; }).join("");
      tip.innerHTML = kartuTip({judul: esc(p.id), kepala: ikon("api", "#c9503a"), sub: p.kec ? `<small class="tp-sub">${esc(p.kec)}</small>` : "",
        kaki: per.length ? (per.length > 3 ? `+${per.length - 3} pemegang izin lain` : "Titik panas di areal konsesi") : KK.gagal ? "" : "Di luar areal konsesi"})
        .replace('<div class="tp-ft">', `${baris ? `<div class="tp-bd ks-tp">${baris}</div>` : ""}<div class="tp-ft">`);
      tip.classList.add("on", "kartu"); taruh(e.originalEvent); }); };
    ["kl-fill", "kl-pt", "kl-pt3"].forEach(l => { peta.on("mousemove", l, kom); peta.on("mouseleave", l, () => tip.classList.remove("on")); });
    /* lapisan konsesi: warna untuk jenis baru + nama pemegang saat disorot */
    const warnai = () => { if (!peta.getLayer("konsesi")) return;
      const w = ["match", ["get", "jenis"], ...Object.entries(JN).flatMap(([k, v]) => [k, v[1]]), "#888"];
      peta.setPaintProperty("konsesi", "fill-color", w); peta.setPaintProperty("konsesi-line", "line-color", w);
      if (peta._ksTip) return; peta._ksTip = 1;
      peta.on("mousemove", "konsesi", e => { if (peta.queryRenderedFeatures(e.point, {layers: ["kl-fill", "kl-pt", "kl-pt3"].filter(l => peta.getLayer(l))}).length) return;
        const p = e.features[0].properties; tip.innerHTML = `<b>${esc(p.nama)}</b>${p.grup ? `<br>grup ${esc(p.grup)}` : ""}<br>${(JN[p.jenis] || [p.jenis])[0]}${p.izin ? " · " + esc(p.izin) : ""}<br><small>peta ${p.tahun_data} · ${esc(p.status || "")}</small>`;
        tip.classList.add("on"); taruh(e.originalEvent); });
      peta.on("mouseleave", "konsesi", () => tip.classList.remove("on")); };
    warnai(); peta.on("styledata", () => nanti(warnai));
  }
  pasangPeta();

  /* --- tab Kompleks api: kolom Perusahaan, saringan, peraga --- */
  const F = {per: "", hanya: false, u: "n", d: -1};
  const _baris = Tabel.baris.bind(Tabel), _render = Tabel.render.bind(Tabel);
  Tabel.baris = function () {
    const q = this.q; this.q = ""; let r = _baris(); this.q = q;
    const ql = q.toLowerCase();
    if (ql) r = r.filter(p => `${p.id} ${p.kec} ${p.kab} ${namaProv(p.prov)} ${namaPer(p.id)}`.toLowerCase().includes(ql));
    if (F.per) r = r.filter(p => perDi(p.id).some(x => x.nama === F.per));
    else if (F.hanya) r = r.filter(p => perDi(p.id).length);
    return r;
  };
  Tabel.render = function () {
    if (!KK) { muat().then(() => Tabel.render()); return _render(); }
    _render(); const el = $("#kompleks"); if (!el || !S.kluster) return;
    if (!$("#ks-saring")) { $("#tq")?.insertAdjacentHTML("afterend", `<label class="ks-saring" id="ks-saring"><input type="checkbox"><span class="ks-sw">hanya di areal konsesi</span></label>`);
      $("#ks-saring input").onchange = e => { F.hanya = e.target.checked; F.per = ""; Tabel.hal = 0; nanti(() => Tabel.render()); }; }
    $("#ks-chip")?.remove();
    if (F.per) { $("#ks-saring").insertAdjacentHTML("afterend", `<button class="ks-chip" id="ks-chip" aria-label="Hapus saringan perusahaan"><span>${esc(F.per)}</span><i aria-hidden="true">✕</i></button>`);
      $("#ks-chip").onclick = () => { F.per = ""; Tabel.hal = 0; nanti(() => Tabel.render()); }; }
    const th = $("#th tr"); if (th && !th.querySelector(".ks-th")) th.insertAdjacentHTML("beforeend", `<th class="ks-th">Perusahaan</th><th class="ks-th2">Jenis · porsi</th>`);
    $("#tb").querySelectorAll("tr").forEach(tr => { const id = tr.querySelector("[data-id]")?.dataset.id; if (!id || tr.querySelector(".ks-td")) return;
      const per = perDi(id);
      const p0 = per[0];
      const jl = p0 ? `${(JN[p0.jenis] || [p0.jenis])[0]} · ${pct(p0.porsi)}` : "";
      /* semua pemegang izin ditampilkan, satu per baris di sel yang sama (nama | jenis · porsi sejajar) */
      tr.insertAdjacentHTML("beforeend", `<td class="ks-td">${per.length ? per.map(x => `<span class="ks-ell" title="${esc(x.nama)}">${esc(x.nama)}</span>`).join("") : `<span class="ks-mt">–</span>`}</td><td class="ks-td2">${per.length ? per.map(x => `<span class="ks-ell">${esc((JN[x.jenis] || [x.jenis])[0])} · ${pct(x.porsi)}</span>`).join("") : `<span class="ks-mt">–</span>`}</td>`); });
    $("#tf tr")?.insertAdjacentHTML("beforeend", "<td></td><td></td>");
    const kos = $("#tb .kosong"); if (kos) kos.colSpan = 13;
    peraga();
  };
  function peraga() {
    let ex = $("#ks-ex");
    if (!ex) { $("#kompleks").insertAdjacentHTML("beforebegin", `<article class="ex ks-ex" id="ks-ex"></article>`); ex = $("#ks-ex");
      ex.addEventListener("click", e => { const u = e.target.closest("[data-u]"); if (u) { F.d = F.u === u.dataset.u ? -F.d : (u.dataset.u === "nama" || u.dataset.u === "grup" || u.dataset.u === "jenis" ? 1 : -1); F.u = u.dataset.u; return peraga(); }
        const b = e.target.closest("[data-per]"); if (b && !e.target.closest(".ks-sk")) tunjuk(b.dataset.per); }); }
    if (KK.gagal) { ex.innerHTML = `<p class="fnd">Data perusahaan konsesi belum tersedia.</p>`; return; }
    const grupDari = a => a.grup || GRUP?.[a.nama]?.grup || "";
    const dasar = KK.perusahaan.filter(a => a.n > 0).sort((a, b) => b.n - a.n).slice(0, 15);
    const tot = KK.perusahaan.reduce((s, a) => s + a.n, 0);
    const nilai = {nama: a => a.nama, grup: grupDari, jenis: a => (JN[a.jenis] || [a.jenis])[0], tahun_data: a => a.tahun_data || 0, n: a => a.n, luas_ha: a => a.luas_ha || 0, kompleks: a => a.kompleks.length}[F.u];
    const daf = dasar.slice().sort((a, b) => { const x = nilai(a), y = nilai(b); return (typeof x === "string" ? x.localeCompare(y, "id") : x - y) * F.d || b.n - a.n; });
    const th = (u, t, n) => `<th${n ? ' class="n"' : ""} data-u="${u}" tabindex="0" role="columnheader" aria-sort="${F.u === u ? (F.d > 0 ? "ascending" : "descending") : "none"}" style="cursor:pointer">${t}<i class="ks-ar">${F.u === u ? (F.d > 0 ? "▲" : "▼") : ""}</i></th>`;
    ex.innerHTML = `<div class="ks-hd"><div><h3>Kebakaran di konsesi: perusahaan dengan titik panas terbanyak</h3>
        <p class="sub">7 hari terakhir · ${fmt(tot)} titik panas VIIRS berada di dalam areal ${fmt(KK.perusahaan.filter(a => a.n).length)} konsesi. Klik baris untuk melihat kompleksnya di peta; klik judul kolom untuk mengurutkan.</p></div></div>
      <div class="tw"><table class="tb3 ks-tb"><thead><tr><th>#</th>${th("nama", "Pemegang izin")}${th("grup", "Grup")}${th("jenis", "Jenis")}${th("tahun_data", "Peta", 1)}${th("n", "Titik panas", 1)}${th("luas_ha", "Luas indikatif", 1)}${th("kompleks", "Kompleks aktif", 1)}</tr></thead><tbody>
      ${daf.map((a, i) => `<tr data-per="${esc(a.nama)}" tabindex="0" style="cursor:pointer"><td class="num">${i + 1}</td><td><b>${esc(a.nama)}</b>${lencana(a.sanksi)}</td>
        <td class="ks-grup">${grupDari(a) ? esc(grupDari(a)) : `<span class="ks-mt">–</span>`}</td>
        <td>${jenis(a.jenis)}</td><td class="n num">${a.tahun_data || "–"}</td><td class="n num"><b>${fmt(a.n)}</b></td><td class="n num">${a.n ? "± " + fmt(a.luas_ha) + " ha" : "–"}</td><td class="n num">${fmt(a.kompleks.length)}</td></tr>`).join("") || `<tr><td colspan="8">Tidak ada titik panas di areal konsesi.</td></tr>`}</tbody></table></div>
      <footer class="ex-ft ks-ft"><span></span><em>Sumber: NASA FIRMS VIIRS 375 m (7 hari); batas konsesi Kemenhut, Global Forest Watch, Trase</em></footer>`;
  }
  function tunjuk(nama) {
    const ids = (KK.perusahaan.find(a => a.nama === nama)?.kompleks || []).filter(id => S.kluster.features.some(f => f.properties.id === id));
    F.per = nama; Tabel.hal = 0; nanti(() => Tabel.render());
    if (!ids.length) return;
    const fs = S.kluster.features.filter(f => ids.includes(f.properties.id)), b = new maplibregl.LngLatBounds();
    fs.forEach(f => b.extend([f.properties.lon, f.properties.lat]));
    bukaTab("peta");
    nanti(() => { peta.fitBounds(b, {padding: kiriPad(), maxZoom: 10, duration: 900});
      peta.setPaintProperty("kl-line", "line-width", ["case", ["in", ["get", "id"], ["literal", ids]], 3.6, 1.8]);
      if (typeof toast === "function") toast(`${ids.length} kompleks dengan titik panas di areal ${nama} ditandai garis tebal`); });
  }
  muat();
})();
