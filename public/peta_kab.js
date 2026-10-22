"use strict";
/* peta_kab.js: overlay "Luas terbakar" dan "Belum padam" per kabupaten di peta utama (index.html).
   Dimuat SESUDAH peta_karhutla.js dan SEBELUM lapisan5.js (skrip klasik: peta, Peta, S, muatJSON, renderLegenda, tampilTip, kartuTip, $, esc, fmt terbaca dari skrip utama).
   Data data/peta_karhutla_kab.json (membawa hari dan celahnya sendiri) serta geometri geo/kabupaten/<prov>.json dimuat SATU KALI saat overlay pertama dinyalakan.
   Penjumlahan periode, batas kelas, dan keadaan kontrol = fungsi murni di peta_karhutla.js (diuji tests/agen/peta-kab.test.mjs); di sini hanya peta, kartu periode, legenda. */
(() => {
  const R = window.PetaKarhutla; if (!R) return;
  const KUNCI = {kabluas: "luas", kabbelum: "belum"};
  /* warna sasaran = deck BNPB: luas menuju biru baja, belum padam menuju oranye */
  const INFO = {
    luas: {warna: "#3F5F80", judul: "Luas terbakar (perkiraan satelit)", jumlah: "Jumlah luas harian (perkiraan satelit)", lbl: "Luas terbakar (ha)", tip: "luas terbakar (perkiraan satelit)", tipJml: "jumlah luas harian (perkiraan satelit)"},
    belum: {warna: "#D9600B", judul: "Belum padam (perkiraan satelit)", lbl: "Belum padam (ha)", tip: "belum padam (perkiraan satelit)"}};
  let D = null, janji = null;           /* D = {P, KB, fc}: data siap pakai */
  let st = {metrik: null, mode: "hari", ref: "", a: "", b: ""}, hit = {}, kls = {b: [], w: []}, fokus = null, hov = null, pop = null, gen = 0;
  const wil = (kw, lw) => `<span>${kw}</span> <span>${lw}</span>`;   /* kata depan dan tanggal di simpulnya sendiri: kalimat tetap terjemahan tetap, tanggal ikut locale */

  /* ---------- data: satu JSON + geometri kabupaten, hanya provinsi yang punya data ---------- */
  const ambil = () => janji ||= (async () => {
    const jk = await muatJSON("data/peta_karhutla_kab.json"), salah = R.cekKab(jk); if (salah) throw new Error("peta_karhutla_kab.json: " + salah);
    const P = R.siapkanKab(jk);
    const prov = [...new Set(Object.keys(jk.kab).map(k => k.split("|")[0]))];
    const fcs = await Promise.all(prov.map(async p => S.geo.kab[p] ||= await muatJSON(`geo/kabupaten/${p}.json`)));   /* cache sama dengan aturWilayah() */
    const features = prov.flatMap((p, i) => fcs[i].features.map(f => ({type: "Feature", geometry: f.geometry, properties: {kunci: p + "|" + f.properties.kab, nama: f.properties.kab, prov: p}})));
    /* hanya kabupaten yang punya bentuk di layar ikut dihitung: skala legenda tidak boleh memuat nilai yang tidak tergambar ("<prov>|" tanpa nama) */
    const punya = new Set(features.map(f => f.properties.kunci));
    return D = {P, KB: Object.fromEntries(Object.entries(jk.kab).filter(([k]) => punya.has(k))), fc: {type: "FeatureCollection", features}};
  })().catch(e => { janji = null; throw e; });

  /* ---------- peta ---------- */
  const ada = () => !!(peta && peta.getLayer("kab-fill"));
  const tampil = on => ["kab-fill", "kab-line"].forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none"));
  /* di bawah label peta dasar, di atas warna wilayah: nama tempat tetap terbaca di atas pilihan warna */
  function pasang() {
    if (!D || !peta || peta.getSource("kab")) return;
    const bawah = Peta.lapisAwal();
    hov = null; peta.addSource("kab", {type: "geojson", data: D.fc, promoteId: "kunci"});
    /* warna kelas dititipkan di feature-state "c" oleh gambar(): ekspresi paint TETAP, jadi ganti periode tidak memuat ulang ubin sumber */
    peta.addLayer({id: "kab-fill", type: "fill", source: "kab", paint: {"fill-color": ["to-color", ["coalesce", ["feature-state", "c"], "rgba(0,0,0,0)"]], "fill-opacity": .85}}, bawah);
    peta.addLayer({id: "kab-line", type: "line", source: "kab", paint: {"line-color": "#8fa0b5", "line-opacity": .85, "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.2, .6]}}, bawah);
    ikat();
  }
  function periode() { const P = D.P, ref = st.ref || P.hari[P.n - 1]; return {ref, ...(R.rentang(P, st.mode, ref, st.a, st.b) || {i0: P.n - 1, i1: P.n - 1})}; }
  /* nilai per kabupaten -> warna kelasnya di feature-state "c" (R.kelasKab = aturan step legenda); nol = transparan */
  function gambar() {
    const m = st.metrik; if (!m || !D || !ada()) return;
    pop?.remove();   /* popup lama memuat periode/ukuran lama */
    const {i0, i1} = periode(), maks = Math.max(0, ...Object.values(hit = R.agregatKab(D.KB, m, i0, i1))), b = R.batasKab(maks), w = R.warnaKab(INFO[m].warna, b.length + 1);
    kls = {b, w, i0, i1, maks};
    for (const f of D.fc.features) { const k = f.properties.kunci; peta.setFeatureState({source: "kab", id: k}, {c: hit[k] ? w[R.kelasKab(b, hit[k])] : "rgba(0,0,0,0)"}); }
    kartu(); renderLegenda();
  }

  /* ---------- kartu periode (di atas legenda) ---------- */
  function kartuEl() {
    let k = $("#kabKartu"); if (k) return k;
    k = document.createElement("div"); k.id = "kabKartu"; k.className = "card"; k.hidden = true; k.setAttribute("aria-label", "Periode peta kabupaten");
    k.innerHTML = `<span class="lbl" id="kabJudul"></span><div id="kabKontrol"></div>`;
    $("#dok").prepend(k);
    k.addEventListener("click", e => { const b = e.target.closest("button[data-pk]"); if (!b || !D || b.disabled) return;
      if (b.dataset.pk !== "geser") b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));   /* chrome urgent */
      aturPK(b.dataset.pk, b.dataset.v); });
    /* input tanggal memicu change di tiap segmen sah ("10" lewat "1" melompat ke Januari): komit sesudah jeda, nilai dibaca saat jeda habis */
    k.addEventListener("change", e => { const c = e.target.closest("select[data-pk],input[data-pk]"); if (!c || !D) return;
      if (c.type === "date") { clearTimeout(tunda); tunda = setTimeout(() => aturPK(c.dataset.pk, c.value), 600); return; }
      aturPK(c.dataset.pk, c.value); });
    return k;
  }
  function aturPK(k, v) {
    const o = R.atur(D.P, st, k, v); if (!o) return;
    st = o; fokus = [k, k === "mode" || k === "geser" || (k === "ref" && st.mode === "tahun") ? v : null];
    nanti(gambar);
  }
  function kartu() {
    const m = st.metrik, I = INFO[m], {ref, i0, i1} = periode();
    $("#kabJudul").textContent = m === "luas" && i0 !== i1 ? I.jumlah : I.judul;
    $("#kabKontrol").innerHTML = R.kontrol(D.P, st, ref, true);
    if (!fokus) return; const [k, v] = fokus; fokus = null;
    requestAnimationFrame(() => { const e = $("#kabKartu").querySelector(`[data-pk="${k}"]${v != null ? `[data-v="${v}"]` : ""}`), t = e && !e.disabled ? e : $('#kabKartu [data-pk="ref"]');
      (t?.closest(".pc")?.querySelector(".pc-btn") || t)?.focus({preventScroll: true}); });
  }

  /* ---------- tooltip dan popup ---------- */
  const kata = () => R.waktuBagian(D.P, st.mode, kls.i0, kls.i1, st.metrik);
  const nilai = k => hit[k] ? `${fmt(hit[k])} ha` : "Tanpa deteksi";
  function isiTip(p) {
    const I = INFO[st.metrik], [kw, lw] = kata();
    return kartuTip({judul: esc(p.nama), sub: `<small class="tp-sub">${esc(namaProv(p.prov))}</small>`,
      stat: [["api", nilai(p.kunci), st.metrik === "luas" && kls.i0 !== kls.i1 ? I.tipJml : I.tip, I.warna, false]], kaki: wil(kw, lw)});
  }
  /* dipasang ulang tiap kali sumber dibuat (ganti peta dasar): Peta.pasang() mendaftarkan ulang penangan hover wilayah di tiap style.load,
     dan penangan yang didaftarkan terakhir menimpa kartunya, jadi milik kita harus tetap paling akhir */
  let ev = null;
  function ikat() {
    const tip = $("#tip");
    if (ev) { peta.off("mousemove", "kab-fill", ev.m); peta.off("mouseleave", "kab-fill", ev.l); }
    ev = {
      m: e => {
        if (!st.metrik) return;
        const f = e.features[0];
        if (hov !== f.id) { if (hov !== null) peta.setFeatureState({source: "kab", id: hov}, {hover: false}); hov = f.id; peta.setFeatureState({source: "kab", id: hov}, {hover: true}); }
        /* tooltip kompleks prioritas, Himawari, pangkalan udara, METAR, dan bahaya gambut didahulukan: penangannya didaftarkan lebih awal dan sudah menandai kartunya */
        if (tip._kl != null || tip._pf || peta._tipHw || peta._tipUdara) return;
        if (pop && pop._k === f.id) { tip.classList.remove("on"); return; }   /* popup kabupaten ini terbuka: jangan tumpuk (tooltip wilayah di bawahnya ikut disembunyikan); kabupaten lain tetap bertooltip */
        peta.getCanvas().style.cursor = "pointer"; tampilTip(isiTip(f.properties), e.originalEvent); },
      l: () => { if (hov !== null) peta.setFeatureState({source: "kab", id: hov}, {hover: false}); hov = null; peta.getCanvas().style.cursor = ""; tip.classList.remove("on"); }};
    peta.on("mousemove", "kab-fill", ev.m); peta.on("mouseleave", "kab-fill", ev.l);
  }
  /* dipanggil penangan klik peta utama sesudah semua penanda didahulukan: true = klik dipakai (popup kabupaten), jangan turun ke provinsi/kecamatan */
  function klik(e) {
    if (!st.metrik || !D || !ada() || peta.getLayoutProperty("kab-fill", "visibility") === "none") return false;
    if (e._pk) return true;   /* penangan klik peta utama terdaftar ganda setelah ganti peta dasar: satu popup per klik */
    const f = peta.queryRenderedFeatures(e.point, {layers: ["kab-fill"]})[0]; if (!f) return false;
    const p = f.properties, I = INFO[st.metrik], [kw, lw] = kata(), kb = (k, v) => `<div class="kb penuh"><span>${k}</span><b>${v}</b></div>`;
    e._pk = 1; $("#tip").classList.remove("on");
    pop = new maplibregl.Popup({closeButton: false, maxWidth: "300px"}).setLngLat(e.lngLat).setHTML(`<div class="kartu"><div class="kp putih" style="--aksen:${I.warna}"><div><small>${esc(namaProv(p.prov))}</small><b>${esc(p.nama)}</b></div></div>
      <div class="kg">${kb(st.metrik === "luas" && kls.i0 !== kls.i1 ? I.jumlah : I.judul, nilai(p.kunci))}${kb("Periode", wil(kw, lw))}</div>
      <div class="kk">Perkiraan satelit, bukan luas resmi.</div></div>`).addTo(peta);
    const p0 = pop; p0._k = p.kunci; p0.on("close", () => { if (pop === p0) pop = null; });
    return true;
  }

  /* ---------- legenda: kelas, satuan, periode (ditempel di akhir legenda bawaan) ---------- */
  const _leg = renderLegenda;
  renderLegenda = function () { _leg(); const box = document.querySelector("#legDet > div"), m = st.metrik; if (!box || !m || !D || !kls.w.length || !ada()) return;
    const {b, w} = kls, I = INFO[m], [kw, lw] = kata(), pecah = (x, k) => k === 0 ? (b[0] === 1 ? "1" : `1–${fmt(b[0])}`) : k === b.length ? `> ${fmt(b[k - 1])}` : b[k - 1] + 1 === x ? fmt(x) : `${fmt(b[k - 1] + 1)}–${fmt(x)}`;
    const baris = w.map((c, k) => `<span><i class="sw" style="background:${c}"></i>${b.length ? pecah(b[k], k) : fmt(kls.maks)}</span>`);
    box.insertAdjacentHTML("beforeend", `<div class="lg-g"><div class="lbl">${I.lbl}</div><div class="leg">${kls.maks ? baris.join("") : ""}`
      + `<span><i class="sw" style="background:none;border:1px solid var(--line)"></i>${kls.maks ? "Tanpa deteksi" : "Tanpa deteksi pada periode ini"}</span>`
      + `<span class="kab-wkt"><span>Perkiraan satelit</span> · ${wil(kw, lw)}</span></div></div>`); };

  /* ---------- kotak centang: kunci kabluas / kabbelum (bukan milik penangan lama; saling eksklusif) ---------- */
  async function terapkan() {
    const m = st.metrik, id = ++gen, kt = kartuEl();
    kt.hidden = !m;
    if (!m) { pop?.remove(); if (ada()) tampil(false); renderLegenda(); return; }
    if (!D) { $("#kabJudul").textContent = INFO[m].judul; $("#kabKontrol").textContent = "Memuat…"; }
    try { await ambil(); } catch (e) { console.warn("peta kabupaten", e); if (id !== gen) return;
      toast("Peta kabupaten gagal dimuat"); document.querySelectorAll('#lapis input[data-l^="kab"]').forEach(x => x.checked = false); st.metrik = null; kt.hidden = true; return; }
    if (id !== gen) return;   /* diganti pengguna selama memuat: panggilan terbaru yang menggambar */
    pasang(); tampil(true); gambar();
  }
  function hubungkan() {
    const L = $("#lapis"); if (!L) return;
    /* fase tangkap: penangan bawaan halaman tidak mengenal kunci ini (map[k] undefined) */
    L.addEventListener("change", e => { const i = e.target.closest("input"), m = i && KUNCI[i.dataset.l]; if (!m) return;
      e.stopImmediatePropagation();
      if (i.checked) L.querySelectorAll('input[data-l^="kab"]').forEach(x => { if (x !== i) x.checked = false; });   /* dua pilihan warna di satu peta tidak terbaca */
      st.metrik = i.checked ? m : null; nanti(terapkan); }, true);
    /* ganti peta dasar = setStyle(diff:false): semua lapisan hilang, pasang ulang yang menyala */
    const tunggu = () => { if (!peta) return setTimeout(tunggu, 300);
      peta.on("style.load", () => setTimeout(() => { if (st.metrik && D) { pasang(); tampil(true); gambar(); } }, 60)); };
    tunggu();
  }
  window.PetaKab = {klik};
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", hubungkan) : hubungkan();
})();
