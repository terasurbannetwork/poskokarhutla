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
  const batas = () => `Batas konsesi: sawit Kemenhut 2012/2014 (via GFW), HTI Trase 2020–2022, HPH Kemenhut 2014 (via GFW), tambang PPKH Kemenhut Jan 2026; bisa sudah berubah. Titik panas di dalam areal konsesi tidak berarti pemegang izin yang membakar, tetapi pemegang izin wajib mencegah dan memadamkan api di arealnya (Permen LHK P.32/2016 untuk PBPH, Permentan 5/2018 untuk kebun). Pastikan ke KPH/Dinas/ATR sebelum tindakan hukum.`;
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
    else if (!per.length) h = `<p style="margin:0;font-size:12.5px">Semua titik panas kompleks ini berada <b>di luar areal konsesi</b> yang tercatat.</p>`;
    else h = `<div class="lbl">Titik panas berada di dalam areal konsesi</div>
      <table class="tb3 ks-tb"><thead><tr><th>Pemegang izin</th><th>Jenis</th><th class="n">Titik</th></tr></thead><tbody>${per.map(r => `<tr>
        <td><b>${esc(r.nama)}</b>${lencana(r.sanksi)}<small>${r.grup ? "grup " + esc(r.grup) + " · " : ""}${r.izin ? esc(r.izin) + (r.tgl_izin ? ` (${esc(r.tgl_izin)})` : "") : "nomor izin tidak tercatat"}</small>${r.status ? `<small>${esc(r.status)}</small>` : ""}</td>
        <td>${jenis(r.jenis)}<small>peta ${r.tahun_data}</small></td>
        <td class="n num"><b>${pct(r.porsi)}</b><small>${fmt(r.n)} titik · ± ${fmt(r.luas_ha)} ha</small></td></tr>`).join("")}
        <tr><td colspan="2">Di luar areal konsesi</td><td class="n num">${pct(k.luar)}</td></tr></tbody></table>`;
    if (k && (k.gambut || Object.keys(k.kawasan).length)) h += `<p style="margin:4px 0 0;font-size:12px;color:var(--ink2)">${[k.gambut ? `${pct(k.gambut)} titik di gambut` : "", ...Object.entries(k.kawasan).sort((a, b) => b[1] - a[1]).map(([f, v]) => `${pct(v)} di ${KW[f] || f}`)].filter(Boolean).join(" · ")}</p>`;
    sek.querySelector(".isi").insertAdjacentHTML("beforeend", `<div class="ks-laci">${h}<p class="fnd">${per.length ? "Persen = bagian titik panas VIIRS 7 hari kompleks ini yang jatuh di dalam areal itu; luas = piksel 375 m. " : ""}${batas()}</p></div>`);
  }

  /* --- tooltip: kompleks (nama perusahaan) dan poligon konsesi --- */
  function pasangPeta() {
    if (typeof peta === "undefined" || !peta?.getLayer || !peta.getLayer("kl-fill")) return setTimeout(pasangPeta, 1500);
    const tip = $("#tip");
    const taruh = ev => { tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, ev.clientX + 14) + "px"; tip.style.top = Math.max(8, ev.clientY - tip.offsetHeight - 12) + "px"; };
    const kom = e => { const p = e.features[0].properties; muat().then(() => { const per = perDi(p.id);
      tip.innerHTML = `<b>${esc(p.id)}</b>${p.kec ? " · " + esc(p.kec) : ""}<br>${per.length ? `Titik panas di areal konsesi:<br>${per.slice(0, 3).map(r => `${esc(r.nama)} <small>(${(JN[r.jenis] || [r.jenis])[0]}) ${pct(r.porsi)}</small>`).join("<br>")}${per.length > 3 ? "<br>…" : ""}` : KK.gagal ? "" : "di luar areal konsesi"}<br><small>klik untuk rincian</small>`;
      tip.classList.add("on"); taruh(e.originalEvent); }); };
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
  const F = {per: "", hanya: false, mode: "7"};
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
    if (!$("#ks-saring")) { $("#tq")?.insertAdjacentHTML("afterend", `<label class="ks-saring" id="ks-saring"><input type="checkbox"> hanya di areal konsesi</label>`);
      $("#ks-saring input").onchange = e => { F.hanya = e.target.checked; F.per = ""; Tabel.hal = 0; nanti(() => Tabel.render()); }; }
    $("#ks-chip")?.remove();
    if (F.per) { $("#ks-saring").insertAdjacentHTML("afterend", `<button class="ks-chip" id="ks-chip" aria-label="Hapus saringan perusahaan">${esc(F.per)} ✕</button>`);
      $("#ks-chip").onclick = () => { F.per = ""; Tabel.hal = 0; nanti(() => Tabel.render()); }; }
    const th = $("#th tr"); if (th && !th.querySelector(".ks-th")) th.insertAdjacentHTML("beforeend", `<th class="ks-th">Perusahaan (areal konsesi)</th>`);
    $("#tb").querySelectorAll("tr").forEach(tr => { const id = tr.querySelector("[data-id]")?.dataset.id; if (!id || tr.querySelector(".ks-td")) return;
      const per = perDi(id);
      tr.insertAdjacentHTML("beforeend", `<td class="ks-td">${per.length ? per.slice(0, 2).map(r => `${esc(r.nama)} <small>${(JN[r.jenis] || [r.jenis])[0]} · ${pct(r.porsi)}</small>`).join("") + (per.length > 2 ? `<small>+${per.length - 2} lainnya</small>` : "") : `<span style="color:var(--ink2)">–</span>`}</td>`); });
    $("#tf tr")?.insertAdjacentHTML("beforeend", "<td></td>");
    const kos = $("#tb .kosong"); if (kos) kos.colSpan = 12;
    peraga();
  };
  function peraga() {
    let ex = $("#ks-ex");
    if (!ex) { $("#kompleks").insertAdjacentHTML("beforebegin", `<article class="ex ks-ex" id="ks-ex"></article>`); ex = $("#ks-ex");
      ex.addEventListener("click", e => { const m = e.target.closest("[data-mode]"); if (m) { F.mode = m.dataset.mode; return peraga(); }
        const b = e.target.closest("[data-per]"); if (b && !e.target.closest(".ks-sk")) tunjuk(b.dataset.per); }); }
    if (KK.gagal) { ex.innerHTML = `<p class="fnd">Data perusahaan konsesi belum tersedia.</p>`; return; }
    const k = F.mode === "7" ? "n" : "musim", daf = KK.perusahaan.filter(a => a[k] > 0).sort((a, b) => b[k] - a[k]).slice(0, 15);
    const tot = KK.perusahaan.reduce((s, a) => s + a.n, 0);
    ex.innerHTML = `<div class="ks-hd"><div><h3>Kebakaran di konsesi: perusahaan dengan titik panas terbanyak</h3>
        <p class="sub">${F.mode === "7" ? `7 hari terakhir · ${fmt(tot)} titik panas VIIRS berada di dalam areal ${fmt(KK.perusahaan.filter(a => a.n).length)} konsesi` : `musim ${(KK.acuan || "").slice(0, 4)}, tercatat sejak ${esc(KK.musim_sejak || "–")}`}. Klik baris untuk melihat kompleksnya di peta.</p></div>
        <div class="ks-mode">${[["7", "7 hari"], ["musim", "Musim"]].map(([m, n]) => `<button class="btn ${F.mode === m ? "" : "sec"}" data-mode="${m}">${n}</button>`).join("")}</div></div>
      <div class="tw"><table class="tb3"><thead><tr><th>#</th><th>Pemegang izin</th><th>Jenis</th><th class="n">Peta</th><th class="n">Titik panas</th><th class="n">Luas indikatif</th><th class="n">Kompleks aktif</th></tr></thead><tbody>
      ${daf.map((a, i) => `<tr data-per="${esc(a.nama)}" tabindex="0" style="cursor:pointer"><td class="num">${i + 1}</td><td><b>${esc(a.nama)}</b>${lencana(a.sanksi)}${a.grup ? `<small>grup ${esc(a.grup)}</small>` : ""}</td>
        <td>${jenis(a.jenis)}</td><td class="n num">${a.tahun_data || "–"}</td><td class="n num"><b>${fmt(a[k])}</b></td><td class="n num">${a.n ? "± " + fmt(a.luas_ha) + " ha" : "–"}</td><td class="n num">${fmt(a.kompleks.length)}</td></tr>`).join("") || `<tr><td colspan="7">Tidak ada titik panas di areal konsesi.</td></tr>`}</tbody></table></div>
      <p class="fnd">Titik panas berada di dalam areal konsesi X ≠ X yang membakar. Luas = piksel VIIRS 375 m yang terdeteksi 7 hari (indikatif, bukan luas terbakar resmi). ${batas()}</p>`;
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
