/* ================================================================ bagikan & ekspor
   Gambar siap unggah (IG feed 4:5, story/TikTok 9:16, kotak 1:1), tautan, dan berkas data (xlsx, pdf, pptx).
   Satu berkas untuk dua halaman: Bagikan.init("karhutla") | Bagikan.init("banjir").
   Memakai state & fungsi halaman (S, peta, fmt, esc, jamWIB, namaProv, toast, ...). Pustaka berat dimuat saat diminta. */
"use strict";
const Bagikan = {
  hal: "karhutla", dasar: "", tab: "gambar", tpl: "ringkas", uk: "feed", prov: "", exId: "", pakaiPeta: true,
  UK: {feed: [1080, 1350, "Feed 4:5"], story: [1080, 1920, "Story · TikTok 9:16"], kotak: [1080, 1080, "Kotak 1:1"]},
  TPL: [["ringkas", "Ringkasan hari ini"], ["provinsi", "Provinsi"], ["ex", "Grafik Insight"]],
  C: {navy: "#0b2545", navy2: "#1d4e89", kertas: "#f3f6fa", tinta: "#0b2545", tinta2: "#5b6b82", garis: "#dde4ee", jalur: "#edf1f6", hl: "#ffb37a"},
  LV: ["#5a9e74", "#e3b94e", "#e58a45", "#c9503a"],
  /* SheetJS komunitas tidak bisa menulis gaya sel (header tebal); xlsx-js-style = SheetJS + gaya, API sama */
  LIB: {
    xlsx: ["https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js", () => window.XLSX],
    pdf: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => window.jspdf],
    tabel: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js", () => window.jspdf?.jsPDF?.API?.autoTable],
    pptx: ["https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js", () => window.PptxGenJS],
  },
  get K() {
    return this.hal === "banjir"
      ? {nama: "Posko Banjir, Longsor & Rob", pendek: "Posko Banjir", tema: "banjir, longsor & rob", sumber: "Sumber: Open-Meteo, Copernicus GloFAS, BMKG Maritim, BNPB",
        tagar: ["#banjir", "#longsor", "#rob", "#cuacaekstrem", "#siagabencana"], akhir: "#PoskoBanjir"}
      : {nama: "Posko Karhutla", pendek: "Posko Karhutla", tema: "kebakaran hutan dan lahan", sumber: "Sumber: NASA FIRMS, BMKG/Open-Meteo, BNPB",
        tagar: ["#karhutla", "#kabutasap", "#kebakaranhutan", "#titikpanas"], akhir: "#PoskoKarhutla"};
  },

  /* ---------------------------------------------------------------- pasang */
  init(halaman) {
    this.hal = halaman === "banjir" ? "banjir" : "karhutla";
    const st = document.querySelector("header.top .stat");
    if (!st || document.getElementById("bgBuka")) return;
    if (!document.querySelector("link[data-bagikan]")) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = this.dasar + "bagikan.css"; l.dataset.bagikan = ""; document.head.appendChild(l); }
    const b = document.createElement("button");
    b.className = "iconbtn"; b.id = "bgBuka"; b.type = "button"; b.title = "Bagikan & ekspor";
    b.setAttribute("aria-label", "Bagikan & ekspor"); b.setAttribute("aria-haspopup", "dialog");
    b.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>`;
    st.insertBefore(b, document.getElementById("tema"));
    b.onclick = () => this.buka();
    /* tombol bagikan di tiap grafik Insight (tab dirender ulang sendiri, jadi diamati) */
    const ins = document.getElementById("insight");
    if (ins) { new MutationObserver(() => this.tombolEx()).observe(ins, {childList: true, subtree: true}); this.tombolEx(); }
    document.addEventListener("click", e => { const t = e.target.closest?.(".bg-ex"); if (!t) return; e.stopPropagation();
      const box = t.closest("[data-ex]"), art = t.closest("article.ex");
      this.buka("ex", box ? box.dataset.ex : "b" + [...document.querySelectorAll("#insight article.ex")].indexOf(art)); }, true);
    /* tautan dalam: ?wil=62|Seruyan membuka wilayah itu setelah peta siap */
    const w = new URLSearchParams(location.search).get("wil");
    if (w && /^\d{2}(\|[^|<>"]{1,80}){0,2}$/.test(w)) this.tungguWil(w);
  },
  tombolEx() {
    document.querySelectorAll("#insight article.ex").forEach(a => {
      if (a.querySelector(".bg-ex") || !a.querySelector("svg")) return;
      const b = document.createElement("button"); b.type = "button"; b.className = "bg-ex"; b.setAttribute("aria-label", "Bagikan grafik ini"); b.title = "Bagikan";
      b.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>`;
      b.setAttribute("aria-label", "Bagikan grafik ini sebagai gambar"); a.prepend(b); });
  },
  tungguWil(w) {
    let n = 0; const t = setInterval(() => {
      if (++n > 120) return clearInterval(t);
      if (typeof S === "undefined" || !S.meta || typeof peta === "undefined" || !peta || !peta.isStyleLoaded()) return;
      clearInterval(t); if (S.meta.provinsi?.[w.split("|")[0]]) try { turun(w); } catch (e) { console.warn(e); } }, 300);
  },

  /* ---------------------------------------------------------------- dialog */
  dialog() {
    let d = document.getElementById("bgDlg"); if (d) return d;
    d = document.createElement("dialog"); d.className = "dlg bg"; d.id = "bgDlg"; d.setAttribute("aria-labelledby", "bgJudul");
    const tab = (id, n) => `<button role="tab" type="button" id="bgT-${id}" aria-controls="bgP-${id}" aria-selected="false" tabindex="-1" data-tab="${id}">${n}</button>`;
    d.innerHTML = `<div class="dh"><div><h3 id="bgJudul">Bagikan & ekspor</h3><p>Gambar siap unggah, tautan, dan berkas data</p></div><button type="button" aria-label="Tutup" data-tutup>×</button></div>
      <div class="db">
        <div class="seg penuh bg-tabs" role="tablist" aria-label="Pilihan">${tab("gambar", "Gambar")}${tab("tautan", "Tautan")}${tab("ekspor", "Ekspor")}</div>
        <div role="tabpanel" id="bgP-gambar" aria-labelledby="bgT-gambar" class="bg-panel">
          <div class="lbl">Templat</div>
          <div class="bg-tpl" role="group" aria-label="Templat">${this.TPL.map(([k, n]) => `<button type="button" data-tpl="${k}" aria-pressed="false"><span class="bg-th"><canvas width="90" height="112" aria-hidden="true"></canvas></span><span>${n}</span></button>`).join("")}</div>
          <div class="bg-opsi">
            <div class="seg" role="group" aria-label="Ukuran">${Object.entries(this.UK).map(([k, v]) => `<button type="button" data-uk="${k}" aria-pressed="false">${v[2]}</button>`).join("")}</div>
            <select id="bgProv" aria-label="Provinsi"></select>
            <select id="bgEx" aria-label="Grafik insight"></select>
            <label class="bg-cek"><input type="checkbox" id="bgPeta"> Tangkapan peta langsung</label>
          </div>
          <div class="bg-pra"><img id="bgImg" alt=""><p id="bgStG" role="status" aria-live="polite"></p></div>
          <div class="bg-aksi"><button type="button" class="btn pri" id="bgUnduh">Unduh PNG</button><button type="button" class="btn sec" id="bgBagiG">Bagikan gambar</button></div>
          <label class="lbl" for="bgTeks">Keterangan & tagar</label>
          <textarea id="bgTeks" rows="7" readonly></textarea>
          <div class="bg-aksi"><button type="button" class="btn sec" id="bgSalinTeks">Salin keterangan</button></div>
        </div>
        <div role="tabpanel" id="bgP-tautan" aria-labelledby="bgT-tautan" class="bg-panel" hidden>
          <label class="lbl" for="bgUrl">Tautan ke tampilan ini</label>
          <div class="bg-url"><input id="bgUrl" readonly><button type="button" class="btn sec" id="bgSalinUrl">Salin</button></div>
          <p class="bg-cat">Membuka tab dan wilayah yang sedang dilihat.</p>
          <button type="button" class="btn pri" id="bgBagiU" hidden>Bagikan lewat aplikasi…</button>
          <div class="bg-sos" id="bgSos"></div>
        </div>
        <div role="tabpanel" id="bgP-ekspor" aria-labelledby="bgT-ekspor" class="bg-panel" hidden>
          <div class="bg-eks">
            <button type="button" data-eks="xlsx"><b>Excel (.xlsx)</b><span>${this.hal === "banjir" ? "Status kecamatan, sungai, rob, provinsi, metadata" : "Provinsi, kompleks api, posko & anggaran, peringkat risiko, metadata"}</span></button>
            <button type="button" data-eks="pdf"><b>PDF laporan harian</b><span>A4: sampul & KPI, peta, tabel, grafik insight, rekomendasi, sumber</span></button>
            <button type="button" data-eks="pptx"><b>Slide (.pptx)</b><span>16:9: KPI, peta, tabel provinsi, grafik insight, rekomendasi</span></button>
          </div>
          <p id="bgStE" class="bg-cat" role="status" aria-live="polite">Pustaka ekspor dimuat saat tombol ditekan.</p>
        </div>
      </div>`;
    document.body.appendChild(d);
    const q = s => d.querySelector(s);
    d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-tutup]")) d.close(); });
    const tl = q("[role=tablist]");
    tl.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) this.pilihTab(b.dataset.tab); });
    tl.addEventListener("keydown", e => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return; e.preventDefault();
      const t = [...tl.querySelectorAll("[role=tab]")], i = t.findIndex(x => x.getAttribute("aria-selected") === "true");
      const j = e.key === "Home" ? 0 : e.key === "End" ? t.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + t.length) % t.length;
      this.pilihTab(t[j].dataset.tab); t[j].focus(); });
    q(".bg-tpl").addEventListener("click", e => { const b = e.target.closest("[data-tpl]"); if (b && !b.disabled) { this.tpl = b.dataset.tpl; this.perbarui(); } });
    q("[aria-label=Ukuran]").addEventListener("click", e => { const b = e.target.closest("[data-uk]"); if (b) { this.uk = b.dataset.uk; this.perbarui(); } });
    q("#bgProv").onchange = e => { this.prov = e.target.value; this.perbarui(); };
    q("#bgEx").onchange = e => { this.exId = e.target.value; this.perbarui(); };
    q("#bgPeta").onchange = e => { this.pakaiPeta = e.target.checked; this._th = {}; this.perbarui(); };
    q("#bgUnduh").onclick = () => this.blob && this.simpan(this.blob, this.namaBerkas("png"));
    q("#bgBagiG").onclick = () => this.bagiGambar();
    q("#bgSalinTeks").onclick = () => this.salin(q("#bgTeks").value, "Keterangan disalin");
    q("#bgSalinUrl").onclick = () => this.salin(q("#bgUrl").value, "Tautan disalin");
    q("#bgBagiU").onclick = () => navigator.share({title: document.title, text: this.teksPendek(), url: this.tautan()}).catch(() => {});
    q(".bg-eks").addEventListener("click", e => { const b = e.target.closest("[data-eks]"); if (b) this.ekspor(b.dataset.eks); });
    return d;
  },
  pilihTab(id) {
    this.tab = id; const d = this.dialog();
    d.querySelectorAll("[role=tab]").forEach(t => { const on = t.dataset.tab === id; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
    d.querySelectorAll("[role=tabpanel]").forEach(p => p.hidden = p.id !== "bgP-" + id);
  },
  async buka(tpl, exId) {
    if (typeof S === "undefined" || !S.meta) return this.kabar("Data belum termuat, coba lagi sebentar.");
    this._hari = null; this._snap = undefined; this._ex = null; this._th = {}; this._d = {};
    if (tpl) this.tpl = tpl; if (exId != null) this.exId = exId;
    this.prov = S.jalur?.[0] || (S.meta.provinsi[this.prov] ? this.prov : this.provAwal());
    const d = this.dialog(), q = s => d.querySelector(s);
    q("#bgProv").innerHTML = this.daftarProv().map(k => `<option value="${k}">${esc(namaProv(k))}</option>`).join(""); q("#bgProv").value = this.prov;
    q("#bgPeta").checked = this.pakaiPeta;
    q("#bgBagiU").hidden = !navigator.share;
    q("#bgUrl").value = this.tautan(); this.sosial();
    if (!d.open) d.showModal();
    this.pilihTab(tpl ? "gambar" : this.tab);
    this._exP = this.daftarEx().catch(e => { console.warn(e); return []; });
    this.perbarui();
  },
  kabar(m) { if (typeof toast === "function") toast(m); else alert(m); },
  async salin(t, ok) {
    try { await navigator.clipboard.writeText(t); this.kabar(ok); }
    catch (e) { const a = document.createElement("textarea"); a.value = t; a.style.cssText = "position:fixed;opacity:0"; this.dialog().appendChild(a); a.select(); document.execCommand("copy"); a.remove(); this.kabar(ok); }
  },
  simpan(blob, nama) {
    this.terakhir = {nama, blob};
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
  tanggal() { return S.meta.hari_wib || new Date().toISOString().slice(0, 10); },
  namaBerkas(ext) { return `${this.hal === "banjir" ? "posko-banjir" : "posko-karhutla"}-${this.tpl === "provinsi" ? this.slug(namaProv(this.prov)) + "-" : ""}${this.tanggal()}${ext === "png" ? "-" + this.uk : ""}.${ext}`; },
  slug: s => String(s).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  tglPanjang() { return new Date(this.tanggal() + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"}); },
  situs() { return (location.host + location.pathname).replace(/[^/]*\.html$/, ""); },
  tautan() {
    const u = new URL(location.href); u.search = "";
    if (S.jalur?.length) u.searchParams.set("wil", S.jalur.join("|"));
    return u.toString();
  },
  sosial() {
    const u = encodeURIComponent(this.tautan()), t = encodeURIComponent(this.teksPendek());
    const L = [["WhatsApp", `https://wa.me/?text=${t}%20${u}`], ["Telegram", `https://t.me/share/url?url=${u}&text=${t}`], ["X", `https://x.com/intent/tweet?text=${t}&url=${u}`],
      ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`], ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`]];
    this.dialog().querySelector("#bgSos").innerHTML = L.map(([n, h]) => `<a class="btn sec" href="${h}" target="_blank" rel="noopener noreferrer">${n}</a>`).join("");
  },
  teksPendek() {
    const d = this.data("");
    return this.hal === "banjir" ? `${d.kpi[0].v} kecamatan berstatus banjir hari ini (${d.kpi[0].ket}). Pantau ${this.K.nama}:` : `${d.kpi[0].v} titik panas dan ${d.kpi[2].v} kompleks prioritas pemadaman hari ini. Pantau ${this.K.nama}:`;
  },

  /* ---------------------------------------------------------------- data */
  provAwal() { return this.daftarProv()[0]; },
  daftarProv() {
    const semua = Object.keys(S.meta.provinsi);
    if (this.hal === "banjir") { const ag = agregat("b", 0), n = k => ag[k] ? ag[k].lv * 1e6 + ag[k].n[3] * 1e4 + ag[k].n[2] * 100 + ag[k].n[1] : 0; return semua.sort((a, b) => n(b) - n(a)); }
    const h = this.hariIni(), pr = S.meta.prioritas || [];
    return [...pr, ...semua.filter(k => !pr.includes(k)).sort((a, b) => (h.per[b] || 0) - (h.per[a] || 0))];
  },
  /* titik panas hari kalender WIB per provinsi & kab (sensor utama, semua keyakinan; sama dengan KPI peta saat rentang "Hari ini") */
  hariIni() {
    if (this._hari) return this._hari;
    const per = {}, kab = {}; let tot = 0, tinggi = 0;
    for (const b of S.titik || []) { if (b[7] !== S.hariIni || !S.utama?.has(b[3])) continue; const w = S.wilKunci[b[6]]; if (!w) continue;
      per[w[0]] = (per[w[0]] || 0) + 1; kab[w[1]] = (kab[w[1]] || 0) + 1; tot++; if (b[5] === 2) tinggi++; }
    return this._hari = {per, kab, tot, tinggi};
  },
  polos(html) { return new DOMParser().parseFromString(String(html), "text/html").body.textContent.replace(/\s+/g, " ").trim(); },
  data(k) { return this._d?.[k || "-"] || ((this._d ||= {})[k || "-"] = this.hal === "banjir" ? this.dataBanjir(k) : this.dataApi(k)); },
  dataApi(k) {
    const h = this.hariIni(), kl = k ? klusterDi(k) : S.kluster.features, lvN = [0, 1, 2, 3].map(l => kl.filter(f => f.properties.level === l).length);
    const fw = k ? S.wilayah[k]?.fwi_maks : Math.max(0, ...Object.keys(S.meta.provinsi).map(p => S.wilayah[p]?.fwi_maks || 0)), kf = fw == null ? 0 : kelasFWI(fw);
    const n = k ? h.per[k] || 0 : h.tot, lv = Math.max(0, ...kl.map(f => f.properties.level));
    const kpi = [
      {l: "Titik panas hari ini", s: "Titik panas", v: fmt(n), ket: k ? "hari ini (WIB)" : `hari ini (WIB) · ${fmt(h.tinggi)} keyakinan tinggi`, ks: "hari ini (WIB)", w: this.LV[3]},
      {l: "Kompleks api aktif", s: "Kompleks api", v: fmt(kl.length), ket: "aktif 72 jam terakhir", ks: "aktif 72 jam", w: this.LV[2]},
      {l: "Prioritas pemadaman", s: "Prioritas", v: fmt(lvN[3]), ket: `${fmt(lvN[2])} lain siaga pemadaman`, ks: `+${fmt(lvN[2])} siaga`, w: this.LV[3]},
      {l: "FWI maksimum", s: "FWI maks", v: fmt(fw), ket: fw == null ? "–" : "bahaya cuaca " + FWI_KELAS[kf][0].toLowerCase(), ks: fw == null ? "–" : FWI_KELAS[kf][0].toLowerCase(), w: this.LV[kf]},
    ];
    let rows, jb, jp;
    if (!k) { rows = Object.entries(h.per).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, v]) => ({n: namaProv(p), k: p, v, t: fmt(v), w: this.LV[S.wilayah[p]?.level ?? 0]})); jb = "Titik panas terbanyak hari ini"; jp = "Titik panas hari ini"; }
    else {
      rows = Object.entries(h.kab).filter(([x]) => x.startsWith(k + "|")).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([x, v]) => ({n: x.split("|")[1], v, t: fmt(v), w: this.LV[3]})); jb = "Kabupaten/kota dengan titik panas terbanyak hari ini"; jp = "Titik panas per kabupaten";
      if (!rows.length) { const c = {}; kl.forEach(f => c[f.properties.kab] = (c[f.properties.kab] || 0) + 1);
        rows = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([x, v]) => ({n: x, v, t: fmt(v), w: this.LV[2]})); jb = "Kabupaten/kota dengan kompleks api terbanyak"; jp = "Kompleks api per kabupaten"; }
    }
    let rek = [];
    if (k) { try { rek = rekomendasi(k, this.dRek(k, kl)).map(r => ({lv: r.lv, t: this.polos(r.teks), dasar: r.dasar})); } catch (e) { console.warn("rekomendasi", e); }
      if (!rek.length) rek = [{lv: 0, t: "Pencegahan rutin; tidak ada kompleks berstatus siaga atau prioritas."}]; }
    return {tpl: k ? "provinsi" : "ringkas", prov: k, lv, label: k ? "Ringkasan provinsi" : "Ringkasan harian",
      judul: k ? namaProv(k) : "Situasi karhutla hari ini",
      sub: k ? `Status ${S.meta.status[lv].toLowerCase()} · ${fmt(n)} titik panas · ${fmt(kl.length)} kompleks aktif` : `Indonesia · ${fmt(n)} titik panas · ${fmt(lvN[3])} kompleks prioritas pemadaman`,
      kpi, bar: {judul: jb, pendek: jp, rows}, rek, legenda: [[this.LV[3], "Prioritas"], [this.LV[2], "Siaga"], [this.LV[1], "Patroli"]], petaKet: "Kompleks api aktif"};
  },
  /* sama dengan masukan rekomendasi() di renderPrioritas */
  dRek(k, kl) {
    const G = S.fwi.grid, hari = G[0].hari.map(x => x.tgl), i0 = Math.max(0, hari.indexOf(S.fwi.hari_ini)), hr = hari.slice(i0, i0 + 4), sel = G.filter(g => g.prov === k);
    const per = hr.map(tg => { const cs = sel.map(g => g.hari.find(x => x.tgl === tg)).filter(Boolean); return {fwi: Math.max(0, ...cs.map(c => c.fwi ?? 0)), hujan: cs.reduce((a, c) => a + (c.hujan || 0), 0) / (cs.length || 1)}; });
    let pm = 0; const asap = typeof Lapis !== "undefined" && Lapis.cache?.asap;
    if (asap) for (const c of asap.grid) { let best = null, dd = 1e9; for (const g of sel) { const x = (g.lat - c[0]) ** 2 + (g.lon - c[1]) ** 2; if (x < dd) { dd = x; best = g; } } if (best && dd <= .6) pm = Math.max(pm, ...c[2].map(v => v ?? 0)); }
    const t = new Date(Date.now() + 7 * 36e5), das = t.getUTCMonth() * 3 + Math.min(2, Math.floor((t.getUTCDate() - 1) / 10)), o = Tren.musim?.prov?.[k], pk = (S.posko || []).filter(x => x.prov === k);
    return {kl, fwiH3: Math.max(0, ...per.map(x => x.fwi)), hariSangat: per.filter(x => x.fwi >= 14).length, hujan: per.reduce((a, x) => a + x.hujan, 0), pm,
      musim: o && {p: o.p_semua[das], siaga: Tren.siaga(o.p_semua)},
      posko: {perm: pk.filter(x => x.jenis_posko !== "aju").length, aju: pk.filter(x => x.jenis_posko === "aju").length, biaya: pk.reduce((a, x) => a + anggaran(S.semuaPosko.get(x.id)).total, 0)}};
  },
  dataBanjir(k) {
    const n = [0, 0, 0, 0], nl = [0, 0, 0, 0], kab = {};
    for (const [kk, v] of Object.entries(S.st.kec)) { if (k && !kk.startsWith(k + "|")) continue; const l = v.b?.[0] || 0; n[l]++; nl[v.l?.[0] || 0]++;
      if (l) { const kb = kk.split("|")[1], o = kab[kb] ||= {v: 0, lv: 0}; o.v++; o.lv = Math.max(o.lv, l); } }
    const grid = S.hujan.grid.filter(g => !k || g.prov === k), basah = grid.reduce((a, g) => (g.h3 || 0) > (a?.h3 || 0) ? g : a, null), h3 = basah?.h3 || 0;
    const sgT = (S.sungai?.titik || []).filter(t => !k || t.prov === k), sg = sgT.filter(t => t.kelas).length;
    const iH = S.rob ? Math.max(0, S.rob.hari.indexOf(S.hujan.hari_ini)) : 0;
    const rob = (S.rob?.titik || []).filter(t => (!k || t.prov === namaProv(k) || t.prov === k) && Math.max(0, ...t.lv.slice(iH).map(v => v || 0)) > 0).length;
    const lv = n[3] ? 3 : n[2] ? 2 : n[1] ? 1 : 0;
    let rows, jb, jp;
    const kpi = [
      {l: "Kecamatan berstatus banjir", s: "Kec. berstatus", v: fmt(n[1] + n[2] + n[3]), ket: `${fmt(n[3])} awas · ${fmt(n[2])} siaga · ${fmt(n[1])} waspada`, ks: `${fmt(n[3])} awas · ${fmt(n[2])} siaga`, w: this.LV[lv]},
      {l: "Hujan 3 hari maksimum", s: "Hujan 3 hari", v: fmt(Math.round(h3)) + " mm", ket: basah ? (k ? "kelas " + kelasHujan(h3) : "di " + namaProv(basah.prov)) : "–", ks: kelasHujan(h3), w: "#4f8fc4"},
      {l: "Sungai di atas ambang", s: "Sungai > Q2", v: fmt(sg), ket: `dari ${fmt(sgT.length)} titik GloFAS`, ks: `dari ${fmt(sgT.length)} titik`, w: "#5f6fb0"},
      {l: "Titik pantai rob", s: "Titik rob", v: fmt(rob), ket: "waspada ke atas, 10 hari", ks: "10 hari ke depan", w: "#2b8c86"},
    ];
    if (!k) { const ag = agregat("b", 0); rows = Object.keys(S.meta.provinsi).filter(p => ag[p]).map(p => ({p, a: ag[p]})).sort((a, b) => b.a.lv - a.a.lv || b.a.n[3] - a.a.n[3] || b.a.n[2] - a.a.n[2] || b.a.n[1] - a.a.n[1])
      .slice(0, 5).map(({p, a}) => { const v = a.n[1] + a.n[2] + a.n[3]; return {n: namaProv(p), k: p, v, t: fmt(v) + " kec.", w: this.LV[a.lv]}; }); jb = "Provinsi dengan kecamatan berstatus terbanyak"; jp = "Kecamatan berstatus per provinsi"; }
    else { rows = Object.entries(kab).sort((a, b) => b[1].lv - a[1].lv || b[1].v - a[1].v).slice(0, 5).map(([x, o]) => ({n: x, v: o.v, t: fmt(o.v) + " kec.", w: this.LV[o.lv]})); jb = "Kabupaten/kota dengan kecamatan berstatus terbanyak"; jp = "Kecamatan berstatus per kabupaten"; }
    const rek = [];
    if (k) {
      if (n[1] + n[2] + n[3]) rek.push({lv, t: `${fmt(n[3])} kecamatan awas, ${fmt(n[2])} siaga, dan ${fmt(n[1])} waspada banjir hari ini${rows[0] ? "; terbanyak di " + rows.slice(0, 2).map(r => r.n).join(" dan ") : ""}`});
      AKSI.b[lv].forEach(t => rek.push({lv, t}));
      if (nl[2] + nl[3]) rek.push({lv: 2, t: `${fmt(nl[2] + nl[3])} kecamatan siaga/awas longsor: ${AKSI.l[2][0].toLowerCase()}`});
      if (h3 >= 100) rek.push({lv: 2, t: `Hujan hingga ${fmt(Math.round(h3))} mm dalam 3 hari: periksa saluran, pintu air, dan pompa di dataran rendah`});
      if (sg) rek.push({lv: 2, t: `${fmt(sg)} titik sungai diprakirakan melewati debit banjir 2 tahunan: siagakan warga bantaran`});
      if (rob) rek.push({lv: 1, t: `${fmt(rob)} titik pantai berstatus rob: informasikan jam pasang tertinggi ke warga pesisir`});
    }
    return {tpl: k ? "provinsi" : "ringkas", prov: k, lv, label: k ? "Ringkasan provinsi" : "Ringkasan harian",
      judul: k ? namaProv(k) : "Situasi banjir hari ini",
      sub: k ? `Status ${LEVEL[lv].toLowerCase()} · ${fmt(n[1] + n[2] + n[3])} kecamatan berstatus hari ini` : `Indonesia · ${fmt(n[1] + n[2] + n[3])} kecamatan berstatus waspada ke atas`,
      kpi, bar: {judul: jb, pendek: jp, rows}, rek, legenda: [[this.LV[3], "Awas"], [this.LV[2], "Siaga"], [this.LV[1], "Waspada"]], petaKet: "Status banjir per provinsi"};
  },
  /* grafik insight: karhutla dirender di luar layar dari Insight.gambar(); banjir disalin dari tab Insight */
  wadah() {
    let w = document.getElementById("bgOff");
    if (!w) { w = document.createElement("div"); w.id = "bgOff"; w.setAttribute("aria-hidden", "true"); document.body.appendChild(w); }
    return w;
  },
  async daftarEx() {
    if (this._ex) return this._ex;
    const box = this.wadah(), out = [];
    if (this.hal === "karhutla") {
      if (!Insight.data.mo) await Insight.muat();
      box.innerHTML = Insight.EX.map(id => `<div data-ex="${id}">${Insight.gambar(id)}</div>`).join("");
      box.querySelectorAll("[data-ex]").forEach(d => out.push({id: d.dataset.ex, art: d.querySelector("article.ex")}));
    } else {
      if (!document.querySelector("#insight article.ex")) Insight.render();
      box.innerHTML = "";
      document.querySelectorAll("#insight article.ex").forEach((a, i) => { const c = a.cloneNode(true); c.querySelector(".bg-ex")?.remove(); box.appendChild(c); out.push({id: "b" + i, art: c}); });
    }
    this._ex = out.filter(x => x.art?.querySelector("svg") && x.art.querySelector("h3")).map(x => ({...x, judul: x.art.querySelector("h3").textContent.trim()}));
    const sel = this.dialog().querySelector("#bgEx");
    sel.innerHTML = this._ex.map(e => `<option value="${e.id}">${esc(e.judul.length > 90 ? e.judul.slice(0, 88) + "…" : e.judul)}</option>`).join("");
    if (!this._ex.some(e => e.id === this.exId)) this.exId = this._ex[0]?.id || "";
    sel.value = this.exId;
    return this._ex;
  },
  /* SVG -> kanvas. Gaya dibekukan dalam tema terang (tanpa repaint: tema dipulihkan di tugas yang sama) */
  svgKanvas(svg, skala = 2) {
    const R = document.documentElement, tema = R.dataset.theme; R.dataset.theme = "light";
    let teks, w, h;
    try {
      const vb = svg.viewBox?.baseVal; w = vb?.width || svg.getBoundingClientRect().width || 940; h = vb?.height || svg.getBoundingClientRect().height || 400;
      const P = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "stroke-opacity", "opacity", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "letter-spacing", "visibility", "display"];
      const gaya = el => { const cs = getComputedStyle(el); return P.map(p => `${p}:${cs.getPropertyValue(p)}`).join(";"); };
      const c = svg.cloneNode(true), a = [svg, ...svg.querySelectorAll("*")], b = [c, ...c.querySelectorAll("*")];
      a.forEach((el, i) => { b[i].setAttribute("style", gaya(el)); b[i].removeAttribute("class"); b[i].removeAttribute("data-tip"); });
      c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("width", w); c.setAttribute("height", h);
      if (vb?.width) c.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
      teks = new XMLSerializer().serializeToString(c);
    } finally { if (tema) R.dataset.theme = tema; else delete R.dataset.theme; }
    return new Promise((ok, gagal) => { const img = new Image();
      img.onload = () => { const cv = this.kanvas(Math.round(w * skala), Math.round(h * skala)); cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); ok(cv); };
      img.onerror = () => gagal(new Error("SVG grafik tidak bisa digambar"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(teks); });
  },
  async dataEx(id = this.exId) {
    const L = await this._exP || await this.daftarEx(), e = L.find(z => z.id === id) || L[0];
    if (!e) return {tpl: "ex", label: "Grafik insight", judul: "Grafik insight belum tersedia", kosong: true};
    const h3 = e.art.querySelector("h3"), tx = s => e.art.querySelector(s)?.textContent.replace(/\s+/g, " ").trim() || "";
    e.img ||= await this.svgKanvas(e.art.querySelector("svg"));
    return {tpl: "ex", id: e.id, label: "Grafik insight", judul: e.judul, judulSeg: [...h3.childNodes].map(x => ({t: x.textContent, hl: x.nodeType === 1 && x.classList.contains("hl")})),
      sub: tx(".sub"), unit: tx(".unit"), fn: tx(".fn"), img: e.img};
  },

  /* ---------------------------------------------------------------- peta */
  tangkap() {
    if (this._snap !== undefined) return Promise.resolve(this._snap);
    return new Promise(res => {
      const fin = v => { if (this._snap === undefined) { this._snap = v; res(v); } };
      if (typeof peta === "undefined" || !peta?.getCanvas) return fin(null);
      const cv = peta.getCanvas(); if (!cv.width || !cv.height) return fin(null);
      peta.once("render", () => { try {
        const c = this.kanvas(cv.width, cv.height); c.getContext("2d").drawImage(cv, 0, 0);
        const k = cv.width / (cv.clientWidth || cv.width / devicePixelRatio), p = typeof kiriPad === "function" && cv.clientWidth ? kiriPad() : {top: 0, bottom: 0, left: 0, right: 0};
        const f = [p.left * k, p.top * k, cv.width - p.right * k, cv.height - p.bottom * k];
        fin(this.polosan(c) ? null : {c, f: f[2] - f[0] > cv.width * .2 && f[3] - f[1] > cv.height * .2 ? f : [0, 0, cv.width, cv.height]});
      } catch (e) { fin(null); } });
      peta.triggerRepaint(); setTimeout(() => fin(null), 1500);
    });
  },
  polosan(c) { const s = this.kanvas(12, 12), x = s.getContext("2d"); x.drawImage(c, 0, 0, 12, 12); const d = x.getImageData(0, 0, 12, 12).data; let m = 0, v = 0, n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) m += d[i] + d[i + 1] + d[i + 2]; m /= n; for (let i = 0; i < d.length; i += 4) v += (d[i] + d[i + 1] + d[i + 2] - m) ** 2; return v / n < 30; },
  /* tempel tangkapan peta: potongan terbesar berasio blok, berpusat di area yang tidak tertutup panel (dibatasi tepi kanvas) */
  tempel(x, s, a, b, w, h) {
    const [f0, f1, f2, f3] = s.f, r = w / h;
    let sw = s.c.width, sh = sw / r; if (sh > s.c.height) { sh = s.c.height; sw = sh * r; }
    const sx = Math.max(0, Math.min(s.c.width - sw, (f0 + f2) / 2 - sw / 2)), sy = Math.max(0, Math.min(s.c.height - sh, (f1 + f3) / 2 - sh / 2));
    x.drawImage(s.c, sx, sy, sw, sh, a, b, w, h);
  },
  kotakFitur(f) { const bb = [180, 90, -180, -90]; const jalan = c => typeof c[0] === "number" ? (bb[0] = Math.min(bb[0], c[0]), bb[1] = Math.min(bb[1], c[1]), bb[2] = Math.max(bb[2], c[0]), bb[3] = Math.max(bb[3], c[1])) : c.forEach(jalan); jalan(f.geometry.coordinates); return bb; },
  /* peta sederhana tanpa ubin: batas provinsi + titik data, selalu bisa digambar */
  gambarPeta(x, a, b, w, h, prov) {
    const F = S.geo?.prov?.features || [], fp = prov && F.find(f => f.properties.kode === prov);
    let bb = [94.6, -11.2, 141.2, 6.3];
    if (fp) { bb = this.kotakFitur(fp); const dx = (bb[2] - bb[0]) * .14 + .2, dy = (bb[3] - bb[1]) * .14 + .2; bb = [bb[0] - dx, bb[1] - dy, bb[2] + dx, bb[3] + dy]; }
    const kx = Math.cos((bb[1] + bb[3]) / 2 * Math.PI / 180), s = Math.min(w / ((bb[2] - bb[0]) * kx), h / (bb[3] - bb[1])), mx = (bb[0] + bb[2]) / 2, my = (bb[1] + bb[3]) / 2;
    const P = (lo, la) => [a + w / 2 + (lo - mx) * kx * s, b + h / 2 - (la - my) * s];
    x.save(); x.beginPath(); x.rect(a, b, w, h); x.clip();
    x.fillStyle = "#e4ecf5"; x.fillRect(a, b, w, h);
    const ag = this.hal === "banjir" ? agregat("b", 0) : null;
    for (const f of F) {
      const g = f.geometry, poli = g.type === "Polygon" ? [g.coordinates] : g.coordinates, k = f.properties.kode;
      x.beginPath(); for (const p of poli) for (const ring of p) ring.forEach(([lo, la], i) => { const [px, py] = P(lo, la); i ? x.lineTo(px, py) : x.moveTo(px, py); });
      x.fillStyle = prov && k !== prov ? "#d6dfea" : "#ffffff"; x.fill("evenodd");
      const lv = ag ? ag[k]?.lv || 0 : S.wilayah?.[k]?.level || 0;
      if (lv && (!prov || k === prov)) { x.globalAlpha = prov ? .16 : .3; x.fillStyle = this.LV[lv]; x.fill("evenodd"); x.globalAlpha = 1; }
      x.strokeStyle = "#a9b8ca"; x.lineWidth = Math.max(1, w / 900); x.stroke();
    }
    const z = Math.max(.7, w / 1000) * (fp ? 1.35 : 1), titik = (lo, la, r, c) => { const [px, py] = P(lo, la); x.beginPath(); x.arc(px, py, r * z, 0, 7); x.fillStyle = c; x.fill(); x.lineWidth = 1.2 * z; x.strokeStyle = "rgba(255,255,255,.9)"; x.stroke(); };
    if (this.hal === "banjir") {
      const iH = S.rob ? Math.max(0, S.rob.hari.indexOf(S.hujan.hari_ini)) : 0;
      (S.sungai?.titik || []).filter(t => t.kelas).forEach(t => titik(t.lon, t.lat, 5, "#5f6fb0"));
      (S.rob?.titik || []).forEach(t => { const l = Math.max(0, ...t.lv.slice(iH).map(v => v || 0)); if (l) titik(t.lon, t.lat, 5, "#2b8c86"); });
    } else {
      const L = (fp ? klusterDi(prov) : S.kluster.features.filter(f => f.properties.level >= 1)).map(f => f.properties).sort((p, q) => p.level - q.level);
      for (const p of L) titik(p.lon, p.lat, [2.2, 3.2, 4.6, 6.4][p.level], this.LV[p.level]);
    }
    x.restore();
  },

  /* ---------------------------------------------------------------- kanvas */
  kanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; },
  f(x, w, s, d) { x.font = `${w} ${s}px ${d ? '"Plus Jakarta Sans", "Inter"' : '"Inter"'}, system-ui, -apple-system, "Segoe UI", sans-serif`; },
  pas(x, t, maks, w, s, d, min = 20) { let u = s; this.f(x, w, u, d); while (u > min && x.measureText(t).width > maks) this.f(x, w, u -= 2, d); return u; },
  potong(x, t, maks) { t = String(t); if (x.measureText(t).width <= maks) return t; while (t.length > 1 && x.measureText(t + "…").width > maks) t = t.slice(0, -1); return t.trimEnd() + "…"; },
  baris(x, t, maks) { const out = []; let l = ""; for (const k of String(t).split(/\s+/).filter(Boolean)) { const c = l ? l + " " + k : k; if (l && x.measureText(c).width > maks) { out.push(l); l = k; } else l = c; } if (l) out.push(l); return out; },
  barisKaya(x, seg, maks) {
    const tok = seg.flatMap(s => s.t.split(/(\s+)/).filter(Boolean).map(t => ({t: /^\s+$/.test(t) ? " " : t, hl: s.hl}))), out = [];
    let l = [], lw = 0;
    for (const k of tok) { const kw = x.measureText(k.t).width;
      if (k.t === " ") { if (l.length) { l.push(k); lw += kw; } continue; }
      if (lw + kw > maks && l.length) { while (l.at(-1)?.t === " ") l.pop(); out.push(l); l = []; lw = 0; }
      l.push(k); lw += kw; }
    while (l.at(-1)?.t === " ") l.pop(); if (l.length) out.push(l); return out;
  },
  kartu(x, a, b, w, h, r = 26) { x.save(); x.shadowColor = "rgba(11,37,69,.11)"; x.shadowBlur = 34; x.shadowOffsetY = 10; x.fillStyle = "#fff"; x.beginPath(); x.roundRect(a, b, w, h, r); x.fill(); x.restore(); },
  logo(x, a, b, s, polos) {
    x.save(); x.translate(a, b); x.scale(s / 32, s / 32);
    if (!polos) { x.fillStyle = "rgba(255,255,255,.14)"; x.beginPath(); x.roundRect(0, 0, 32, 32, 9); x.fill(); }
    if (this.hal === "banjir") {
      x.fillStyle = polos ? "#fff" : "#4fb0e6"; x.fill(new Path2D("M16 5c3 4.4 7 8.6 7 13a7 7 0 0 1-14 0c0-4.4 4-8.6 7-13Z"));
      x.strokeStyle = polos ? "#fff" : "#d3e8f6"; x.lineWidth = 2; x.lineCap = "round"; x.stroke(new Path2D("M6 25c2.5 0 2.5-1.6 5-1.6s2.5 1.6 5 1.6 2.5-1.6 5-1.6 2.5 1.6 5 1.6"));
    } else {
      x.fillStyle = polos ? "#fff" : "#f39a4a"; x.fill(new Path2D("M16 5c1.8 4 6 6.4 6 11.5A6 6 0 0 1 10 16.5c0-2.4 1.1-4.2 2.6-5.6.3 2 1.4 3.2 2.6 3.6C14.4 11.2 15 8 16 5Z"));
      x.fillStyle = polos ? "#fff" : "#f2dc80"; x.fill(new Path2D("M16 27a4 4 0 0 1-4-4c0-2.2 2-3.5 4-6.5 2 3 4 4.3 4 6.5a4 4 0 0 1-4 4Z"));
    }
    x.restore();
  },
  async font() {
    try { await Promise.all(['800 60px "Plus Jakarta Sans"', '700 26px "Plus Jakarta Sans"', '500 22px "Inter"', '600 22px "Inter"', '700 22px "Inter"'].map(f => document.fonts.load(f))); await document.fonts.ready; } catch (e) {}
  },
  /* tata letak per templat & ukuran: [blok atau [blok kiri, blok kanan], porsi sisa tinggi] */
  TATA: {
    ringkas: {kotak: [["kpi4"], [["peta", "bar"], 1]], feed: [["kpi4"], ["peta", .55], ["bar", .45]], story: [["kpi22"], ["peta", .46], ["bar", .54]]},
    provinsi: {kotak: [["kpi4"], [["bar", "rek"], 1]], feed: [["kpi4"], ["peta", .4], [["bar", "rek"], .6]], story: [["kpi4"], ["peta", .4], [["bar", "rek"], .6]]},
    ex: {kotak: [["ex", 1]], feed: [["ex", 1]], story: [["ex", 1]]},
  },
  async render(tpl = this.tpl, uk = this.uk) {
    const [W, H] = this.UK[uk], cv = this.kanvas(W, H), x = cv.getContext("2d"), P = 72, story = uk === "story";
    const atas = story ? 250 : 64, bawah = story ? H - 300 : H - 56;
    const d = tpl === "ex" ? await this.dataEx() : this.data(tpl === "provinsi" ? this.prov : "");
    x.fillStyle = this.C.kertas; x.fillRect(0, 0, W, H);
    const y0 = this.kepala(x, W, P, atas, d, uk), y1 = this.kaki(x, W, H, P, bawah, story);
    const G = 24, tata = this.TATA[tpl][uk], tetap = {kpi4: 190, kpi22: 2 * 178 + 20};
    let sisa = y1 - y0 - G * (tata.length - 1);
    tata.forEach(([k]) => { if (tetap[k]) sisa -= tetap[k]; });
    let y = y0;
    for (const [k, porsi] of tata) {
      const h = tetap[k] || Math.floor(sisa * porsi);
      if (Array.isArray(k)) { const w2 = (W - 2 * P - G) / 2; await this.blok(x, k[0], P, y, w2, h, d); await this.blok(x, k[1], P + w2 + G, y, w2, h, d); }
      else await this.blok(x, k, P, y, W - 2 * P, h, d);
      y += h + G;
    }
    cv.d = d; return cv;
  },
  kepala(x, W, P, atas, d, uk) {
    const lebar = W - 2 * P, maksBaris = d.tpl === "ex" ? (uk === "story" ? 5 : 4) : 2, seg = d.judulSeg || [{t: d.judul}];
    let u = d.tpl === "ex" ? 50 : uk === "kotak" ? 58 : 66; this.f(x, 800, u, true);
    let ln = this.barisKaya(x, seg, lebar);
    while (ln.length > maksBaris && u > 32) { u -= 3; this.f(x, 800, u, true); ln = this.barisKaya(x, seg, lebar); }
    if (ln.length > maksBaris) { ln = ln.slice(0, maksBaris); ln.at(-1).push({t: "…"}); }
    const lh = Math.round(u * 1.14), yJ = atas + 76 + 46, ySub = yJ + ln.length * lh + 6, bawah = ySub + (d.sub ? 40 : 0) + 96;
    const g = x.createLinearGradient(0, 0, W * .6, bawah * 1.2); g.addColorStop(0, this.C.navy2); g.addColorStop(1, this.C.navy);
    x.fillStyle = g; x.fillRect(0, 0, W, bawah);
    x.save(); x.globalAlpha = .06; this.logo(x, W - 360, bawah - 400, 460, true); x.restore();
    this.logo(x, P, atas, 76);
    x.textBaseline = "alphabetic"; x.fillStyle = "#fff"; this.f(x, 800, 32, true); x.fillText(this.K.nama, P + 98, atas + 34);
    this.f(x, 500, 23); x.fillStyle = "rgba(255,255,255,.78)"; x.fillText(this.potong(x, d.label + " · " + this.tglPanjang(), lebar - 98), P + 98, atas + 68);
    this.f(x, 800, u, true);
    ln.forEach((l, i) => { let px = P; for (const k of l) { x.fillStyle = k.hl ? this.C.hl : "#fff"; x.fillText(k.t, px, yJ + i * lh + u * .82); px += x.measureText(k.t).width; } });
    if (d.sub) { this.f(x, 500, 26); x.fillStyle = "rgba(255,255,255,.84)"; x.fillText(this.potong(x, d.sub, lebar), P, ySub + 30); }
    return bawah - 56;
  },
  kaki(x, W, H, P, bawah) {
    const y = bawah - 70;
    x.strokeStyle = this.C.garis; x.lineWidth = 2; x.beginPath(); x.moveTo(P, y); x.lineTo(W - P, y); x.stroke();
    this.f(x, 500, 21); x.fillStyle = this.C.tinta2; x.fillText(this.potong(x, this.K.sumber, W - 2 * P), P, y + 34);
    this.f(x, 500, 21); x.textAlign = "right"; const dt = "Data " + jamWIB(S.meta.dibuat); x.fillText(dt, W - P, y + 64); const dw = x.measureText(dt).width; x.textAlign = "left";
    this.f(x, 700, 22); x.fillStyle = this.C.navy2; x.fillText(this.potong(x, this.situs(), W - 2 * P - dw - 24), P, y + 64);
    return y - 26;
  },
  async blok(x, k, a, b, w, h, d) {
    if (k === "kpi4") { const g = 18, cw = (w - 3 * g) / 4; d.kpi.forEach((q, i) => this.kpi(x, a + i * (cw + g), b, cw, h, q, true)); }
    else if (k === "kpi22") { const g = 20, cw = (w - g) / 2, ch = (h - g) / 2; d.kpi.forEach((q, i) => this.kpi(x, a + (i % 2) * (cw + g), b + Math.floor(i / 2) * (ch + g), cw, ch, q, false)); }
    else if (k === "bar") this.bar(x, a, b, w, h, d.bar);
    else if (k === "rek") this.rek(x, a, b, w, h, d.rek);
    else if (k === "peta") await this.petaBlok(x, a, b, w, h, d);
    else if (k === "ex") this.exBlok(x, a, b, w, h, d);
  },
  kpi(x, a, b, w, h, q, pendek) {
    this.kartu(x, a, b, w, h, 24);
    x.fillStyle = q.w; x.beginPath(); x.roundRect(a, b + 26, 7, h - 52, 4); x.fill();
    const pd = pendek ? 26 : 34, lw = w - 2 * pd;
    this.f(x, 700, pendek ? 17 : 19); x.fillStyle = this.C.tinta2; if ("letterSpacing" in x) x.letterSpacing = "1.5px";
    x.fillText(this.potong(x, (pendek ? q.s : q.l).toUpperCase(), lw), a + pd, b + 46); if ("letterSpacing" in x) x.letterSpacing = "0px";
    const u = this.pas(x, q.v, lw, 800, pendek ? 62 : 80, true, 28); x.fillStyle = this.C.tinta; x.fillText(q.v, a + pd, b + 56 + u * .86);
    this.f(x, 500, pendek ? 17 : 20); x.fillStyle = this.C.tinta2; x.fillText(this.potong(x, pendek ? q.ks || q.ket : q.ket, lw), a + pd, b + h - 24);
  },
  judulBlok(x, t, a, b, lw) { this.f(x, 700, 26, true); x.fillStyle = this.C.tinta; x.fillText(this.potong(x, t, lw), a, b); },
  bar(x, a, b, w, h, B) {
    this.kartu(x, a, b, w, h); const pd = 32, lw = w - 2 * pd;
    this.judulBlok(x, w < 600 ? B.pendek || B.judul : B.judul, a + pd, b + pd + 22, lw);
    const sempit = w < 600, ruang = h - pd - 52 - pd + 8, R = B.rows.slice(0, Math.max(1, Math.floor(ruang / (sempit ? 58 : 30)))), y0 = b + pd + 52, rh = Math.min(sempit ? 76 : 66, ruang / Math.max(R.length, 1)), mx = Math.max(1, ...R.map(r => r.v));
    if (!R.length) { this.f(x, 500, 22); x.fillStyle = this.C.tinta2; x.fillText("Belum ada data hari ini.", a + pd, y0 + 34); return; }
    this.f(x, 700, 22); const vw = Math.max(...R.map(r => x.measureText(r.t).width)) + 16;
    R.forEach((r, i) => {
      const y = y0 + i * rh;
      if (sempit) {
        this.f(x, 600, 21); x.fillStyle = this.C.tinta; x.fillText(this.potong(x, r.n, lw - vw), a + pd, y + rh * .42);
        this.f(x, 700, 21); x.textAlign = "right"; x.fillText(r.t, a + w - pd, y + rh * .42); x.textAlign = "left";
        const by = y + rh * .55, bh = Math.max(8, rh * .2);
        x.fillStyle = this.C.jalur; x.beginPath(); x.roundRect(a + pd, by, lw, bh, bh / 2); x.fill();
        x.fillStyle = r.w; x.beginPath(); x.roundRect(a + pd, by, Math.max(bh, lw * r.v / mx), bh, bh / 2); x.fill();
      } else {
        const nw = lw * .34, bx = a + pd + nw + 12, bw = lw - nw - 12 - vw, bh = Math.min(30, rh * .5), by = y + (rh - bh) / 2;
        this.f(x, 600, 22); x.fillStyle = this.C.tinta; x.fillText(this.potong(x, r.n, nw), a + pd, by + bh * .5 + 8);
        x.fillStyle = this.C.jalur; x.beginPath(); x.roundRect(bx, by, bw, bh, 8); x.fill();
        x.fillStyle = r.w; x.beginPath(); x.roundRect(bx, by, Math.max(10, bw * r.v / mx), bh, 8); x.fill();
        this.f(x, 700, 22); x.fillStyle = this.C.tinta; x.textAlign = "right"; x.fillText(r.t, a + w - pd, by + bh * .5 + 8); x.textAlign = "left";
      }
    });
  },
  rek(x, a, b, w, h, R) {
    this.kartu(x, a, b, w, h); const pd = 32, lw = w - 2 * pd - 46;
    this.judulBlok(x, "Rekomendasi", a + pd, b + pd + 22, w - 2 * pd);
    let y = b + pd + 52; const batas = b + h - pd, lh = 29; this.f(x, 500, 21);
    for (let i = 0; i < R.length; i++) {
      let ln = this.baris(x, R[i].t, lw); const muat = Math.floor((batas - y) / lh); if (muat < 1) break;
      if (ln.length > muat) { ln = ln.slice(0, muat); ln[muat - 1] = this.potong(x, ln[muat - 1] + " …", lw); }
      x.fillStyle = this.LV[R[i].lv] || this.LV[0]; x.beginPath(); x.arc(a + pd + 15, y + 15, 15, 0, 7); x.fill();
      this.f(x, 800, 16); x.fillStyle = "#fff"; x.textAlign = "center"; x.fillText(String(i + 1), a + pd + 15, y + 21); x.textAlign = "left";
      this.f(x, 500, 21); x.fillStyle = this.C.tinta; ln.forEach((l, j) => x.fillText(l, a + pd + 46, y + 22 + j * lh));
      y += ln.length * lh + 14;
    }
  },
  async petaBlok(x, a, b, w, h, d) {
    this.kartu(x, a, b, w, h);
    x.save(); x.beginPath(); x.roundRect(a, b, w, h, 26); x.clip();
    const snap = this.pakaiPeta && (!d.prov || S.jalur?.[0] === d.prov) ? await this.tangkap() : null;
    if (snap) this.tempel(x, snap, a, b, w, h); else this.gambarPeta(x, a, b, w, h, d.prov);
    x.restore();
    const isi = snap ? [["", "Tampilan peta saat ini · © OpenFreeMap © OpenStreetMap"]] : [["", d.petaKet + ":"], ...d.legenda];
    this.f(x, 600, 18); let cw = 28; isi.forEach(([c, t]) => cw += x.measureText(t).width + (c ? 30 : 12));
    cw = Math.min(cw, w - 32);
    x.fillStyle = "rgba(11,37,69,.82)"; x.beginPath(); x.roundRect(a + 16, b + h - 56, cw, 40, 20); x.fill();
    let px = a + 30; x.save(); x.beginPath(); x.rect(a + 16, b + h - 56, cw - 8, 40); x.clip();
    isi.forEach(([c, t]) => { if (c) { x.fillStyle = c; x.beginPath(); x.arc(px + 7, b + h - 36, 7, 0, 7); x.fill(); px += 20; } x.fillStyle = "#fff"; x.fillText(t, px, b + h - 30); px += x.measureText(t).width + 12; });
    x.restore();
  },
  exBlok(x, a, b, w, h, d) {
    this.kartu(x, a, b, w, h); const pd = 36, lw = w - 2 * pd;
    if (d.kosong) { this.f(x, 500, 24); x.fillStyle = this.C.tinta2; x.fillText("Buka tab Insight sekali, lalu coba lagi.", a + pd, b + pd + 30); return; }
    let y = b + pd;
    this.f(x, 500, 19); x.fillStyle = this.C.tinta2;
    if (d.unit) { this.baris(x, d.unit, lw).slice(0, 2).forEach(l => { x.fillText(l, a + pd, y + 22); y += 27; }); }
    this.f(x, 500, 17); const fn = d.fn ? this.baris(x, d.fn, lw).slice(0, 3) : [], yF = b + h - pd - fn.length * 24;
    fn.forEach((l, i) => x.fillText(l, a + pd, yF + 18 + i * 24));
    const top = y + 14, ah = yF - 14 - top, s = Math.min(lw / d.img.width, ah / d.img.height), iw = d.img.width * s, ih = d.img.height * s;
    x.drawImage(d.img, a + pd + (lw - iw) / 2, top + (ah - ih) / 2, iw, ih);
  },

  /* ---------------------------------------------------------------- pratinjau */
  async perbarui() {
    const t = this._t = (this._t || 0) + 1, d = this.dialog(), q = s => d.querySelector(s), st = q("#bgStG");
    d.querySelectorAll("[data-tpl]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tpl === this.tpl));
    d.querySelectorAll("[data-uk]").forEach(b => b.setAttribute("aria-pressed", b.dataset.uk === this.uk));
    q("#bgProv").hidden = this.tpl !== "provinsi"; q("#bgEx").hidden = this.tpl !== "ex"; q(".bg-cek").hidden = this.tpl === "ex";
    st.textContent = "Menyiapkan gambar…"; q("#bgImg").classList.add("muat");
    try {
      await this.font();
      if (this.tpl === "ex") await this._exP;
      const cv = this.cv = await this.render(); if (t !== this._t) return;
      const blob = await new Promise(r => cv.toBlob(r, "image/png")); if (t !== this._t) return;
      this.blob = blob; const img = q("#bgImg"); if (img.src) URL.revokeObjectURL(img.src); img.src = URL.createObjectURL(blob);
      img.alt = `Pratinjau ${this.TPL.find(z => z[0] === this.tpl)[1]}, ${this.UK[this.uk][2]}`; img.classList.remove("muat");
      st.textContent = `${this.UK[this.uk][0]} × ${this.UK[this.uk][1]} px · ${Math.round(blob.size / 1024)} KB`;
      q("#bgTeks").value = this.keterangan(cv.d);
      q("#bgBagiG").hidden = !(navigator.canShare && navigator.canShare({files: [new File([blob], "a.png", {type: "image/png"})]}));
      this.thumbs(t);
    } catch (e) { console.error(e); if (t === this._t) st.textContent = "Gagal membuat gambar: " + e.message; }
  },
  async thumbs(t) {
    const uk = this.uk; if (this._th[uk]) return; this._th[uk] = 1;
    const d = this.dialog(), ex = await this._exP;
    d.querySelector('[data-tpl="ex"]').disabled = !ex.length;
    for (const [k] of this.TPL) {
      if (t !== this._t) { this._th[uk] = 0; return; }
      if (k === "ex" && !ex.length) continue;
      const c = d.querySelector(`[data-tpl="${k}"] canvas`), src = k === this.tpl && this.cv?.width === this.UK[uk][0] && this.cv.height === this.UK[uk][1] ? this.cv : await this.render(k, uk), [W, H] = this.UK[uk];
      c.width = 90; c.height = Math.round(90 * H / W);
      const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, c.width, c.height);
    }
  },
  keterangan(d) {
    const tg = this.tglPanjang(), url = this.tautan(), tag = s => "#" + String(s).normalize("NFD").replace(/[^A-Za-z0-9]/g, "");
    const prov = d.tpl === "provinsi" ? [d.judul] : (d.bar?.rows || []).slice(0, 3).map(r => r.n);
    const tagar = [...this.K.tagar, ...prov.map(tag), this.K.akhir].join(" ");
    if (d.tpl === "ex") return `${d.judul}\n\n${[d.sub, d.fn].filter(Boolean).join(". ")}\n\nSelengkapnya di ${this.K.nama}: ${url}\n\n${tagar}`;
    const K = d.kpi.map(q => q.v), top = (d.bar?.rows || []).slice(0, 3).map(r => `${r.n} (${r.t})`).join(", ");
    let isi;
    if (this.hal === "banjir") isi = `${d.tpl === "provinsi" ? d.judul : "Situasi banjir, longsor, dan rob"}, ${tg}: ${K[0]} kecamatan berstatus banjir (${d.kpi[0].ket}). Hujan 3 hari terlebat ${K[1]}, ${K[2]} titik sungai di atas ambang banjir 2 tahunan, ${K[3]} titik pantai berstatus rob.`;
    else isi = `${d.tpl === "provinsi" ? "Karhutla " + d.judul : "Situasi kebakaran hutan dan lahan"}, ${tg}: ${K[0]} titik panas terdeteksi hari ini (WIB), ${K[1]} kompleks api aktif, ${K[2]} berstatus prioritas pemadaman. FWI tertinggi ${K[3]} (${d.kpi[3].ket}).`;
    const rek = d.tpl === "provinsi" && d.rek[0] ? `\n\nLangkah utama: ${d.rek[0].t}.` : "";
    return `${isi}${top ? `\n\nTerbanyak: ${top}.` : ""}${rek}\n\nPantau peta langsung: ${url}\n\n${tagar}`;
  },
  async bagiGambar() {
    if (!this.blob) return;
    const f = new File([this.blob], this.namaBerkas("png"), {type: "image/png"}), teks = this.dialog().querySelector("#bgTeks").value;
    try { await navigator.share({files: [f], title: document.title, text: teks}); }
    catch (e) { if (e.name !== "AbortError") { this.simpan(this.blob, f.name); this.kabar("Berbagi berkas tidak didukung; gambar diunduh."); } }
  },

  /* ---------------------------------------------------------------- ekspor */
  muatLib(k) {
    const [url, ada] = this.LIB[k]; if (ada()) return Promise.resolve();
    return (this._lib ||= {})[k] ||= new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = url; s.crossOrigin = "anonymous"; s.async = true;
      s.onload = () => ada() ? ok() : gagal(new Error("Pustaka tidak lengkap: " + url)); s.onerror = () => { delete this._lib[k]; gagal(new Error("Gagal memuat " + url)); }; document.head.appendChild(s); });
  },
  async ekspor(jenis) {
    const d = this.dialog(), st = d.querySelector("#bgStE"), tb = [...d.querySelectorAll("[data-eks]")];
    if (tb.some(b => b.disabled)) return;
    tb.forEach(b => b.disabled = true); st.textContent = "Memuat pustaka…";
    try {
      await this.muatLib(jenis === "xlsx" ? "xlsx" : jenis);
      if (jenis === "pdf") await this.muatLib("tabel");
      st.textContent = "Menyusun berkas…"; await new Promise(r => setTimeout(r, 30));
      const r = await this[{xlsx: "keExcel", pdf: "kePdf", pptx: "kePptx"}[jenis]]();
      this.simpan(r.blob, r.nama); st.textContent = `${r.nama} · ${Math.round(r.blob.size / 1024)} KB · ${r.info}`;
    } catch (e) { console.error(e); st.textContent = "Ekspor gagal: " + e.message; }
    finally { tb.forEach(b => b.disabled = false); }
  },
  namaEkspor(ext) { return `${this.hal === "banjir" ? "posko-banjir" : "posko-karhutla"}-${this.tanggal()}.${ext}`; },
  /* tabel provinsi ringkas untuk PDF & slide */
  tabelProv() {
    if (this.hal === "banjir") {
      const ag = agregat("b", 0), agL = agregat("l", 0), iH = S.rob ? Math.max(0, S.rob.hari.indexOf(S.hujan.hari_ini)) : 0;
      const R = Object.keys(S.meta.provinsi).map(k => { const a = ag[k] || {lv: 0, n: [0, 0, 0, 0]}, h3 = Math.max(0, ...S.hujan.grid.filter(g => g.prov === k).map(g => g.h3 || 0));
        const sg = (S.sungai?.titik || []).filter(t => t.prov === k && t.kelas).length, rob = (S.rob?.titik || []).filter(t => (t.prov === namaProv(k) || t.prov === k) && Math.max(0, ...t.lv.slice(iH).map(v => v || 0)) > 0).length;
        return {k, lv: a.lv, n: a.n, l: (agL[k]?.n[2] || 0) + (agL[k]?.n[3] || 0), h3, sg, rob}; })
        .sort((a, b) => b.lv - a.lv || b.n[3] - a.n[3] || b.n[2] - a.n[2] || b.n[1] - a.n[1] || b.h3 - a.h3);
      return {kepala: ["Provinsi", "Status", "Awas", "Siaga", "Waspada", "Longsor siaga+", "Hujan 3h (mm)", "Sungai > Q2", "Rob"], angka: [2, 3, 4, 5, 6, 7, 8],
        baris: R.map(r => [namaProv(r.k), LEVEL[r.lv], r.n[3], r.n[2], r.n[1], r.l, Math.round(r.h3), r.sg, r.rob]), aktif: R.filter(r => r.lv || r.h3 >= 50).length};
    }
    const h = this.hariIni(), R = Object.keys(S.meta.provinsi).map(k => { const kl = klusterDi(k); return {k, n: h.per[k] || 0, kl: kl.length, p: kl.filter(f => f.properties.level === 3).length, s: kl.filter(f => f.properties.level === 2).length, w: S.wilayah[k] || {}}; })
      .sort((a, b) => b.n - a.n || b.kl - a.kl);
    return {kepala: ["Provinsi", "Status", "Titik hari ini", "Kompleks aktif", "Prioritas", "Siaga", "FWI maks"], angka: [2, 3, 4, 5, 6],
      baris: R.map(r => [namaProv(r.k), S.meta.status[r.w.level ?? 0], r.n, r.kl, r.p, r.s, r.w.fwi_maks ?? null]), aktif: R.filter(r => r.n || r.kl).length};
  },
  /* kompleks prioritas (karhutla) / kecamatan siaga-awas (banjir) */
  tabelUtama(n) {
    if (this.hal === "banjir") {
      const R = Object.entries(S.st.kec).map(([k, v]) => ({k, l: v.b?.[0] || 0, m: Math.max(0, ...(v.b || [0])), h3: v.h3, a7: v.a7})).filter(r => r.l >= 2 || r.m >= 3)
        .sort((a, b) => b.l - a.l || b.m - a.m || (b.h3 || 0) - (a.h3 || 0)).slice(0, n);
      return {judul: "Kecamatan siaga & awas banjir", kepala: ["Kecamatan", "Kab/Kota", "Provinsi", "Hari ini", "Maks 4 hari", "Hujan 3h (mm)", "Hujan 7h lalu (mm)"], angka: [5, 6],
        baris: R.map(r => { const [p, kb, kc] = r.k.split("|"); return [kc, kb, namaProv(p), LEVEL[r.l], LEVEL[r.m], Math.round(r.h3 ?? 0), Math.round(r.a7 ?? 0)]; })};
    }
    const R = S.kluster.features.map(f => f.properties).filter(p => p.level === 3).sort((a, b) => a.peringkat - b.peringkat).slice(0, n);
    return {judul: "Kompleks prioritas pemadaman", kepala: ["Kode", "Provinsi", "Kab/Kota", "Kecamatan", "Piksel 24 j", "Hari", "Luas maks (ha)", "FWI", "DC", "Gambut", "Daops terdekat"], angka: [4, 5, 6, 7, 8, 10],
      baris: R.map(p => [p.id, namaProv(p.prov), p.kab, p.kec, p.px24, p.hari, Math.round(p.luas), p.fwi, Math.round(p.dc), p.gambut ? "ya" : "–", p.daops ? `${p.daops} (${fmt(p.jarak_daops)} km)` : "–"])};
  },
  rekProv() {
    if (this.hal === "banjir") { const ag = agregat("b", 0); return Object.keys(S.meta.provinsi).filter(k => (ag[k]?.lv || 0) >= 2).sort((a, b) => ag[b].lv - ag[a].lv || ag[b].n[3] - ag[a].n[3] || ag[b].n[2] - ag[a].n[2]).slice(0, 8)
      .map(k => { const d = this.data(k); return {k, nama: namaProv(k), status: LEVEL[d.lv], lv: d.lv, ket: d.sub, rek: d.rek}; }); }
    return (S.meta.prioritas || []).map(k => { const d = this.data(k); return {k, nama: namaProv(k), status: S.meta.status[d.lv], lv: d.lv, ket: d.sub, rek: d.rek}; });
  },
  catatanMetode() {
    if (this.hal === "banjir") return [
      ...Object.entries(S.meta.sumber || {}).map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${v}.`),
      "Status kecamatan Normal, Waspada, Siaga, Awas dihitung dari prakiraan hujan, debit sungai, dan bahaya InaRISK; aturan lengkap di tab Metode.",
      "Sungai: ambang Q2/Q5/Q20 dari debit maksimum tahunan 1997–2025 (distribusi Gumbel), Copernicus GloFAS lewat Open-Meteo.",
      "Rob: muka laut maksimum harian Open-Meteo Marine terhadap ambang persentil 95/99 titik itu sejak 2022; peringatan resmi dari BMKG Maritim.",
      "Riwayat kejadian: DIBI BNPB. Fitur banjir masih uji coba; cek peringatan resmi BMKG dan BPBD sebelum bertindak."];
    const db = S.meta.dbscan || {};
    return [
      "Titik panas: NASA FIRMS (MODIS, VIIRS S-NPP, NOAA-20), semua tingkat keyakinan, dihitung per hari kalender WIB.",
      `Kompleks api: titik dikelompokkan (DBSCAN radius ${fmt(db.eps_km)} km, jendela ${fmt(db.jendela_hari)} hari); aktif ${fmt(db.aktif_jam)} jam, di gambut ${fmt(db.aktif_gambut_jam)} jam.`,
      `Status kompleks: ${S.meta.status.join(", ")}; dari ukuran front aktif, bahaya cuaca, kekeringan gambut (DC), dan risiko wilayah.`,
      "Bahaya cuaca: Fire Weather Index sistem Kanada dari prakiraan BMKG/Open-Meteo; kelas rendah 0–1, sedang 2–6, tinggi 7–13, sangat tinggi di atas 13.",
      "Laporan harian provinsi pantauan: BNPB. Riwayat risiko: arsip MODIS 2002–sekarang.",
      "Posko dan anggaran adalah rekomendasi otomatis; harga satuan 2026 indikatif, periksa e-Katalog/SSH daerah sebelum dipakai.",
      "Penjelasan lengkap ada di tab Metode di situs."];
  },
  async petaDok(w, h) {
    const c = this.kanvas(w, h), x = c.getContext("2d"), s = this.pakaiPeta ? await this.tangkap() : null;
    if (s) this.tempel(x, s, 0, 0, w, h); else this.gambarPeta(x, 0, 0, w, h, "");
    return {url: c.toDataURL("image/jpeg", .88), snap: !!s};
  },
  async grafikDok(maks = 99) {
    const L = (await (this._exP || this.daftarEx())).slice(0, maks), out = [];
    for (const e of L) { try { const d = await this.dataEx(e.id), pd = 40, c = this.kanvas(d.img.width + 2 * pd, d.img.height + 2 * pd), x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(d.img, pd, pd); out.push({...d, url: c.toDataURL("image/png"), w: c.width, h: c.height}); } catch (er) { console.warn(er); } }
    return out;
  },
  logoUrl() { const c = this.kanvas(128, 128), x = c.getContext("2d"); x.fillStyle = this.C.navy2; x.beginPath(); x.roundRect(0, 0, 128, 128, 30); x.fill(); this.logo(x, 0, 0, 128); return c.toDataURL("image/png"); },

  async keExcel() {
    const X = window.XLSX, wb = X.utils.book_new(), info = [];
    const tambah = (nama, kepala, baris) => {
      const ws = X.utils.aoa_to_sheet([kepala, ...baris.map(r => r.map(v => v == null || (typeof v === "number" && !isFinite(v)) ? "" : v))]);
      kepala.forEach((_, c) => { const a = ws[X.utils.encode_cell({r: 0, c})]; if (a) a.s = {font: {bold: true, color: {rgb: "FFFFFFFF"}}, fill: {fgColor: {rgb: "0B2545"}}, alignment: {vertical: "center", wrapText: true}}; });
      baris.forEach((r, i) => r.forEach((v, c) => { if (typeof v === "number" && Math.abs(v) >= 1000 && Number.isInteger(v)) { const a = ws[X.utils.encode_cell({r: i + 1, c})]; if (a) a.z = "#,##0"; } }));
      ws["!cols"] = kepala.map((k, c) => ({wch: Math.min(48, Math.max(String(k).length + 2, ...baris.slice(0, 400).map(r => String(r[c] ?? "").length + 2)))}));
      if (baris.length) ws["!autofilter"] = {ref: ws["!ref"]};
      X.utils.book_append_sheet(wb, ws, nama); info.push(`${nama} ${fmt(baris.length)}`);
    };
    const meta = [["Judul", `${this.K.nama} · ekspor data`], ["Dibuat", new Date().toLocaleString("id-ID", {timeZone: "Asia/Jakarta"}) + " WIB"], ["Data diperbarui", jamWIB(S.meta.dibuat)], ["Hari data (WIB)", S.meta.hari_wib], ["Tautan", this.tautan()]];
    if (this.hal === "banjir") {
      const hr = S.st.hari, K = Object.entries(S.st.kec);
      tambah("Status kecamatan", ["Provinsi", "Kode prov", "Kab/Kota", "Kecamatan", ...hr.map(t => "Banjir " + t), "Banjir maks (0-3)", ...hr.map(t => "Longsor " + t), "Longsor maks (0-3)", "Hujan 3 hari (mm)", "Hujan 7 hari lalu (mm)", "Bahaya banjir InaRISK"],
        K.map(([k, v]) => { const [p, kb, kc] = k.split("|"), b = hr.map((_, i) => v.b?.[i] || 0), l = hr.map((_, i) => v.l?.[i] || 0);
          return [namaProv(p), p, kb, kc, ...b.map(x => LEVEL[x]), Math.max(...b), ...l.map(x => LEVEL[x]), Math.max(...l), v.h3 ?? null, v.a7 ?? null, S.bahaya?.[k]?.banjir ?? null]; })
          .sort((a, b) => b[4 + hr.length] - a[4 + hr.length] || (b[b.length - 3] || 0) - (a[a.length - 3] || 0)));
      const sh = S.sungai?.hari || [];
      tambah("Sungai", ["Provinsi", "Kab/Kota", "Kecamatan", "Lintang", "Bujur", "Puncak 7 hari (m3/s)", "Q2", "Q5", "Q20", "Puncak / Q2", "Status", ...sh.map(t => "Debit " + t)],
        (S.sungai?.titik || []).map(t => [namaProv(t.prov), t.kab, t.kec, t.lat, t.lon, t.puncak, t.q2, t.q5, t.q20, t.q2 ? Math.round(t.puncak / t.q2 * 100) / 100 : null, LEVEL[t.kelas || 0], ...sh.map((_, i) => t.q?.[i] ?? null)]).sort((a, b) => (b[9] || 0) - (a[9] || 0)));
      const rh = S.rob?.hari || [], iH = Math.max(0, rh.indexOf(S.hujan.hari_ini));
      tambah("Rob", ["Provinsi", "Kab/Kota", "Kecamatan", "Lintang", "Bujur", "Status puncak (hari ini dst.)", "Persentil 95 (m)", "Persentil 99 (m)", "Tertinggi tercatat (m)", "Stasiun IOC", ...rh.map(t => "Muka laut maks " + t + " (m)"), ...rh.map(t => "Status " + t)],
        (S.rob?.titik || []).map(t => [t.prov, t.kab, t.kec, t.lat, t.lon, LEVEL[Math.max(0, ...t.lv.slice(iH).map(v => v || 0))], t.p95, t.p99, t.amax, t.ioc?.stasiun ?? null, ...rh.map((_, i) => t.h?.[i] ?? null), ...rh.map((_, i) => LEVEL[t.lv?.[i] || 0])]));
      const tp = this.tabelProv();
      tambah("Provinsi", tp.kepala, tp.baris);
      meta.push(...Object.entries(S.meta.sumber || {}).map(([k, v]) => ["Sumber " + k, v]), ["Status", (S.meta.status || LEVEL).join(", ")], ["Jumlah kecamatan dinilai", S.meta.jumlah_kec], ["Catatan", "Fitur banjir masih uji coba; cek peringatan resmi BMKG dan BPBD."]);
    } else {
      const h = this.hariIni(), hr = Object.keys(S.wilayah[Object.keys(S.wilayah)[0]]?.harian || {}).sort(), pk = new Map(), ang = new Map();
      for (const x of S.posko || []) { pk.set(x.prov, (pk.get(x.prov) || 0) + 1); ang.set(x.prov, (ang.get(x.prov) || 0) + anggaran(S.semuaPosko.get(x.id)).total); }
      const tg = {}; for (const b of S.titik) if (b[7] === S.hariIni && S.utama.has(b[3]) && b[5] === 2) { const p = S.wilKunci[b[6]]?.[0]; tg[p] = (tg[p] || 0) + 1; }
      tambah("Provinsi", ["Kode", "Provinsi", "Status", "Titik panas hari ini (WIB)", "Keyakinan tinggi hari ini", ...hr.map(t => "Titik " + t), "Kompleks aktif", "Prioritas pemadaman", "Siaga pemadaman", "Patroli terpadu", "FWI maks", "FWI rata-rata", "DC maks", "FFMC maks", "Posko lapangan", "Anggaran posko (Rp)", "Pantauan harian BNPB"],
        Object.keys(S.meta.provinsi).map(k => { const w = S.wilayah[k] || {}, kl = klusterDi(k), n = l => kl.filter(f => f.properties.level === l).length;
          return [k, namaProv(k), S.meta.status[w.level ?? 0], h.per[k] || 0, tg[k] || 0, ...hr.map(t => w.harian?.[t] ?? 0), kl.length, n(3), n(2), n(1), w.fwi_maks ?? null, w.fwi_rata ?? null, w.dc_maks ?? null, w.ffmc_maks ?? null, pk.get(k) || 0, Math.round(ang.get(k) || 0), S.meta.bnpb?.[k] ? "ya" : "tidak"]; })
          .sort((a, b) => b[3] - a[3] || b[5 + hr.length] - a[5 + hr.length]));
      const F = S.kluster.features, kol = [];
      for (const f of F.slice(0, 50)) for (const [k, v] of Object.entries(f.properties)) if (!kol.includes(k) && (v == null || typeof v !== "object" || k === "tanggung")) kol.push(k);
      tambah("Kompleks", ["status", "provinsi", ...kol], F.map(f => { const p = f.properties; return [S.meta.status[p.level], namaProv(p.prov), ...kol.map(k => Array.isArray(p[k]) ? p[k].join("; ") : typeof p[k] === "boolean" ? (p[k] ? "ya" : "tidak") : p[k])]; })
        .sort((a, b) => (a[2 + kol.indexOf("peringkat")] || 1e9) - (b[2 + kol.indexOf("peringkat")] || 1e9)));
      const TK = ["Pusat (provinsi)", "Menengah (kabupaten)", "Lapangan"];
      tambah("Posko", ["ID", "Tingkat", "Jenis", "Provinsi", "Kab/Kota", "Nama / lokasi", "Lintang", "Bujur", "Kompleks dilayani", "Kompleks prioritas", "Regu", "Personel", "Biaya harian (Rp)", "Hari", "Operasional (Rp)", "Alat (Rp)", "Dana siap pakai (Rp)", "Total (Rp)", "Induk"],
        [...S.semuaPosko.values()].map(x => { const a = anggaran(x); return [x.id, TK[x.tingkat], x.jenis_posko || x.jenis || "", namaProv(x.prov), x.kab || "", x.nama || "", x.lat ?? null, x.lon ?? null, x.kompleks?.length ?? null, x.prioritas ?? null, a.regu || null, a.org || null, Math.round(a.harian), a.hari, Math.round(a.op), Math.round(a.alat?.t || 0), Math.round(a.dsp || 0), Math.round(a.total), x.induk || ""]; }));
      try {
        await Riwayat.muat(); const th = Riwayat.th, J = {prov: "Provinsi", kab: "Kabupaten/kota", kec: "Kecamatan"};
        tambah("Peringkat risiko", ["Tingkat", "Provinsi", "Kab/Kota", "Nama", "Skor risiko (0-100)", "Kelas", "Tahun terbakar", "Total titik MODIS", "Tahun puncak", "Tren (rasio)", ...th.map(t => "Titik " + t)],
          Object.values(S.riw).sort((a, b) => ["prov", "kab", "kec"].indexOf(a.jenis) - ["prov", "kab", "kec"].indexOf(b.jenis) || b.skor - a.skor)
            .map(r => [J[r.jenis], namaProv(r.prov), r.jenis === "prov" ? "" : r.kab, r.nama, r.skor, r.kelas, r.tahun, r.total, r.puncak, r.tren, ...r.v]));
      } catch (e) { console.warn("riwayat", e); info.push("peringkat risiko gagal dimuat"); }
      meta.push(["Data satelit terakhir", S.meta.data_terakhir], ["Jumlah titik (arsip 7 hari)", S.meta.jumlah_titik], ["Jumlah kompleks", S.meta.jumlah_kluster],
        ["Sumber titik panas", "NASA FIRMS: MODIS, VIIRS S-NPP, NOAA-20"], ["Sumber cuaca & FWI", "BMKG / Open-Meteo"], ["Laporan harian", "BNPB"], ["Riwayat", "Arsip NASA FIRMS MODIS 2002–sekarang"],
        ["Status kompleks", S.meta.status.join(", ")], ["Catatan", "Luas dan anggaran indikatif; harga satuan 2026 perlu dicek ke e-Katalog/SSH daerah."]);
    }
    meta.push(...this.catatanMetode().map((t, i) => ["Metode " + (i + 1), t]));
    tambah("Metadata", ["Kunci", "Nilai"], meta);
    const ab = X.write(wb, {bookType: "xlsx", type: "array", compression: true});
    return {blob: new Blob([ab], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), nama: this.namaEkspor("xlsx"), info: info.join(" · ")};
  },

  async kePdf() {
    const {jsPDF} = window.jspdf, doc = new jsPDF({unit: "mm", format: "a4", compress: true}), W = 210, M = 15, LW = W - 2 * M;
    const T = s => String(s ?? "").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/[–—−]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/→/g, "->").replace(/[^\x00-\xFF]/g, "");
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), NAVY = rgb(this.C.navy), NAVY2 = rgb(this.C.navy2), ABU = rgb(this.C.tinta2);
    const d = this.data(""), tg = this.tglPanjang(), judulLap = this.hal === "banjir" ? "Banjir, longsor & rob" : "Kebakaran hutan dan lahan";
    const kepala = j => { doc.setFillColor(...NAVY); doc.rect(0, 0, W, 17, "F"); doc.setFillColor(229, 138, 69); doc.rect(0, 17, W, .8, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(12.5); doc.text(T(j), M, 11);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text(T(`${this.K.nama} · ${tg}`), W - M, 11, {align: "right"}); doc.setTextColor(...NAVY); return 27; };
    const tabel = (j, t, startY, opsi = {}) => doc.autoTable({head: [t.kepala.map(T)], body: t.baris.map(r => r.map(v => T(typeof v === "number" ? fmt(v) : v))), startY, margin: {top: 26, left: M, right: M, bottom: 18},
      styles: {font: "helvetica", fontSize: 8, cellPadding: 1.6, textColor: NAVY, lineColor: [221, 228, 238], lineWidth: .1}, headStyles: {fillColor: NAVY, textColor: 255, fontStyle: "bold"},
      alternateRowStyles: {fillColor: [243, 246, 250]}, columnStyles: Object.fromEntries(t.angka.map(i => [i, {halign: "right"}])),
      didDrawPage: z => { if (z.pageNumber > 1) kepala(j); }, ...opsi});
    /* sampul */
    for (let i = 0; i < 60; i++) { const t = i / 59; doc.setFillColor(...NAVY2.map((v, j) => Math.round(v + (NAVY[j] - v) * t))); doc.rect(0, i * 1.6, W, 1.7, "F"); }
    doc.addImage(this.logoUrl(), "PNG", M, 16, 14, 14);
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(T(this.K.nama), M + 18, 22);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(210, 222, 238); doc.text(T("Laporan harian · " + tg), M + 18, 27.5);
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.text("Laporan harian", M, 52); doc.setFontSize(18); doc.text(T(judulLap), M, 62);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(210, 222, 238); doc.text(T(`Data diperbarui ${jamWIB(S.meta.dibuat)} · ${this.situs()}`), M, 71);
    const kw = (LW - 3 * 4) / 4;
    d.kpi.forEach((q, i) => { const x = M + i * (kw + 4), y = 80; doc.setFillColor(255); doc.setDrawColor(221, 228, 238); doc.roundedRect(x, y, kw, 30, 2.5, 2.5, "FD");
      doc.setFillColor(...rgb(q.w)); doc.rect(x, y + 4, 1.2, 22, "F");
      doc.setTextColor(...ABU); doc.setFont("helvetica", "bold"); doc.setFontSize(6.6); doc.text(T(q.l.toUpperCase()), x + 4, y + 7, {maxWidth: kw - 6});
      doc.setTextColor(...NAVY); doc.setFontSize(18); doc.text(T(q.v), x + 4, y + 19);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...ABU); doc.text(doc.splitTextToSize(T(q.ket), kw - 6)[0] || "", x + 4, y + 26); });
    const pt = await this.petaDok(1780, 1000);
    doc.addImage(pt.url, "JPEG", M, 118, LW, LW * 1000 / 1780);
    const yP = 118 + LW * 1000 / 1780; doc.setFontSize(7.5); doc.setTextColor(...ABU);
    doc.text(T(pt.snap ? "Tampilan peta saat ini. Peta dasar © OpenFreeMap © OpenStreetMap." : `${d.petaKet}: ${d.legenda.map(l => l[1]).join(", ")}.`), M, yP + 4.5);
    doc.setFontSize(10); doc.setTextColor(...NAVY); const rk = this.keterangan(d).split("\n\n").slice(0, 2).join(" ");
    doc.text(doc.splitTextToSize(T(rk), LW), M, yP + 13);
    /* tabel */
    doc.addPage(); let y = kepala("Ringkasan per provinsi");
    const tp = this.tabelProv(); tabel("Ringkasan per provinsi", {...tp, baris: tp.baris.slice(0, Math.max(10, tp.aktif))}, y);
    doc.addPage(); y = kepala(this.tabelUtama(0).judul); const tu = this.tabelUtama(this.hal === "banjir" ? 60 : 40);
    if (tu.baris.length) tabel(tu.judul, tu, y, {styles: {font: "helvetica", fontSize: 7.4, cellPadding: 1.4, textColor: NAVY, lineColor: [221, 228, 238], lineWidth: .1}});
    else { doc.setFontSize(10); doc.text("Tidak ada baris berstatus hari ini.", M, y + 4); }
    /* grafik insight */
    const gr = await this.grafikDok();
    if (gr.length) { doc.addPage(); y = kepala("Grafik insight");
      for (const g of gr) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); const jl = doc.splitTextToSize(T(g.judul), LW);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); const fl = doc.splitTextToSize(T(g.fn), LW).slice(0, 3);
        let iw = LW, ih = iw * g.h / g.w; if (ih > 110) { ih = 110; iw = ih * g.w / g.h; }
        const perlu = jl.length * 5 + 6 + ih + fl.length * 3.6 + 10;
        if (y + perlu > 282) { doc.addPage(); y = kepala("Grafik insight"); }
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY); doc.text(jl, M, y + 4); y += jl.length * 5;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...ABU); doc.text(doc.splitTextToSize(T(g.sub), LW)[0] || "", M, y + 3.5); y += 6;
        doc.addImage(g.url, "PNG", M + (LW - iw) / 2, y, iw, ih); y += ih + 2;
        doc.setFontSize(7.5); doc.text(fl, M, y + 3); y += fl.length * 3.6 + 9;
      } }
    /* rekomendasi */
    const rp = this.rekProv();
    if (rp.length) { doc.addPage(); y = kepala("Rekomendasi per provinsi");
      for (const r of rp) {
        const isi = r.rek.map((z, i) => { doc.setFontSize(9); const t = doc.splitTextToSize(T(`${i + 1}. ${z.t}`), LW - 6); doc.setFontSize(7.5); return {t, d: z.dasar ? doc.splitTextToSize(T("Dasar: " + z.dasar), LW - 10) : []}; });
        const tinggi = 10 + isi.reduce((a, z) => a + z.t.length * 4.2 + z.d.length * 3.6 + 2, 0);
        if (y + Math.min(tinggi, 60) > 282) { doc.addPage(); y = kepala("Rekomendasi per provinsi"); }
        doc.setFillColor(...rgb(this.LV[r.lv] || this.LV[0])); doc.rect(M, y, 1.4, 6, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...NAVY); doc.text(T(r.nama), M + 4, y + 4.8);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...ABU); doc.text(T(r.ket), M + 4, y + 9.5); y += 14;
        for (const z of isi) { if (y + z.t.length * 4.2 > 284) { doc.addPage(); y = kepala("Rekomendasi per provinsi"); }
          doc.setFontSize(9); doc.setTextColor(...NAVY); doc.text(z.t, M + 4, y); y += z.t.length * 4.2;
          if (z.d.length) { doc.setFontSize(7.5); doc.setTextColor(...ABU); doc.text(z.d, M + 8, y - .6); y += z.d.length * 3.6; } y += 1.6; }
        y += 5;
      } }
    /* sumber & metode */
    doc.addPage(); y = kepala("Sumber & metode"); doc.setFontSize(9.5); doc.setTextColor(...NAVY);
    for (const t of [this.K.sumber + ".", ...this.catatanMetode()]) { const l = doc.splitTextToSize(T("• " + t), LW); doc.text(l, M, y); y += l.length * 4.6 + 2.5; }
    doc.setFontSize(8.5); doc.setTextColor(...ABU); doc.text(doc.splitTextToSize(T(`Dibuat otomatis dari ${this.tautan()} pada ${new Date().toLocaleString("id-ID", {timeZone: "Asia/Jakarta"})} WIB. Angka mengikuti data saat laporan dibuat.`), LW), M, y + 4);
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...ABU);
      doc.text(T(`${this.K.sumber} · ${this.situs()}`), M, 291); doc.text(`Halaman ${i} dari ${n}`, W - M, 291, {align: "right"}); }
    return {blob: doc.output("blob"), nama: this.namaEkspor("pdf"), info: `${n} halaman`, halaman: n};
  },

  async kePptx() {
    const p = new window.PptxGenJS(), d = this.data(""), tg = this.tglPanjang(), FONT = "Arial", N = "0B2545", ABU = "5B6B82", hx = h => h.replace("#", "").toUpperCase();
    p.layout = "LAYOUT_WIDE"; p.author = this.K.nama; p.title = `${this.K.nama} · laporan harian ${this.tanggal()}`;
    p.defineSlideMaster({title: "ISI", background: {color: "FFFFFF"}, objects: [
      {rect: {x: 0, y: 0, w: 13.333, h: .82, fill: {color: N}}}, {rect: {x: 0, y: .82, w: 13.333, h: .05, fill: {color: "E58A45"}}},
      {text: {text: `${this.K.sumber} · ${this.situs()} · data ${jamWIB(S.meta.dibuat)}`, options: {x: .5, y: 7.06, w: 11, h: .3, fontFace: FONT, fontSize: 9, color: ABU}}}],
      slideNumber: {x: 12.35, y: 7.06, w: .6, h: .3, fontFace: FONT, fontSize: 9, color: ABU}});
    const isi = j => { const s = p.addSlide({masterName: "ISI"}); s.addText(j, {x: .5, y: .1, w: 12.3, h: .62, fontFace: FONT, fontSize: 22, bold: true, color: "FFFFFF", fit: "shrink"}); return s; };
    /* judul */
    const s0 = p.addSlide(); s0.background = {color: N};
    s0.addShape(p.ShapeType.rect, {x: 0, y: 6.9, w: 13.333, h: .6, fill: {color: "1D4E89"}});
    s0.addImage({data: this.logoUrl(), x: .8, y: .8, w: .85, h: .85});
    s0.addText(this.K.nama, {x: 1.85, y: .85, w: 9, h: .4, fontFace: FONT, fontSize: 16, bold: true, color: "FFFFFF"});
    s0.addText("Laporan harian · " + tg, {x: 1.85, y: 1.25, w: 9, h: .35, fontFace: FONT, fontSize: 12, color: "C9D6E8"});
    s0.addText(this.hal === "banjir" ? "Situasi banjir, longsor & rob" : "Situasi kebakaran hutan dan lahan", {x: .8, y: 2.6, w: 11.5, h: 1.4, fontFace: FONT, fontSize: 40, bold: true, color: "FFFFFF"});
    s0.addText(d.sub, {x: .8, y: 4.0, w: 11.5, h: .5, fontFace: FONT, fontSize: 18, color: "FFB37A"});
    s0.addText(`Data diperbarui ${jamWIB(S.meta.dibuat)} · ${this.K.sumber}`, {x: .8, y: 6.95, w: 11.7, h: .5, fontFace: FONT, fontSize: 11, color: "DDE6F2"});
    /* KPI + grafik batang native (bisa disunting) */
    const s1 = isi("Situasi hari ini · " + tg);
    d.kpi.forEach((q, i) => { const x = .5 + i * 3.1;
      s1.addShape(p.ShapeType.roundRect, {x, y: 1.2, w: 2.9, h: 2.0, fill: {color: "F3F6FA"}, line: {color: "DDE4EE", width: .75}, rectRadius: .12});
      s1.addShape(p.ShapeType.rect, {x, y: 1.4, w: .07, h: 1.6, fill: {color: hx(q.w)}, line: {color: hx(q.w), width: 0}});
      s1.addText(q.l.toUpperCase(), {x: x + .2, y: 1.3, w: 2.6, h: .4, fontFace: FONT, fontSize: 10, bold: true, color: ABU, charSpacing: 1});
      s1.addText(q.v, {x: x + .2, y: 1.7, w: 2.6, h: .85, fontFace: FONT, fontSize: 34, bold: true, color: N, fit: "shrink"});
      s1.addText(q.ket, {x: x + .2, y: 2.6, w: 2.6, h: .45, fontFace: FONT, fontSize: 10.5, color: ABU, fit: "shrink"}); });
    const R = d.bar.rows;
    s1.addText(d.bar.judul, {x: .5, y: 3.45, w: 12.3, h: .4, fontFace: FONT, fontSize: 15, bold: true, color: N});
    if (R.length) s1.addChart(p.ChartType.bar, [{name: d.bar.judul, labels: R.map(r => r.n), values: R.map(r => r.v)}], {x: .5, y: 3.85, w: 12.3, h: 3.1, barDir: "bar", catAxisOrientation: "maxMin",
      chartColors: [hx(this.hal === "banjir" ? "#4f8fc4" : "#c9503a")], showValue: true, dataLabelFormatCode: "#,##0", dataLabelFontSize: 11, dataLabelFontFace: FONT, dataLabelColor: N,
      catAxisLabelFontFace: FONT, catAxisLabelFontSize: 12, catAxisLabelColor: N, valAxisHidden: true, valGridLine: {style: "none"}, catAxisLineShow: false, showLegend: false, barGapWidthPct: 60});
    /* peta */
    const pt = await this.petaDok(1716, 800), s2 = isi(this.hal === "banjir" ? "Peta status hari ini" : "Peta kompleks api aktif");
    s2.addImage({data: pt.url, x: .5, y: 1.05, w: 12.33, h: 5.75});
    s2.addText(pt.snap ? "Tampilan peta saat ini · peta dasar © OpenFreeMap © OpenStreetMap" : `${d.petaKet}: ${d.legenda.map(l => l[1]).join(", ")}`, {x: .5, y: 6.78, w: 12.3, h: .28, fontFace: FONT, fontSize: 9, color: ABU});
    /* tabel provinsi */
    const tp = this.tabelProv(), s3 = isi("Ringkasan per provinsi"), nb = 14;
    s3.addTable([tp.kepala.map(t => ({text: t, options: {bold: true, color: "FFFFFF", fill: {color: N}}})), ...tp.baris.slice(0, nb).map((r, i) => r.map((v, j) => ({text: typeof v === "number" ? fmt(v) : String(v ?? "–"), options: {align: tp.angka.includes(j) ? "right" : "left", fill: {color: i % 2 ? "F3F6FA" : "FFFFFF"}}})))],
      {x: .5, y: 1.1, w: 12.33, fontFace: FONT, fontSize: 11, color: N, border: {type: "solid", pt: .5, color: "DDE4EE"}, rowH: .36, valign: "middle", autoPage: false});
    if (tp.baris.length > nb) s3.addText(`${nb} provinsi teratas dari ${tp.baris.length}; tabel lengkap ada di ekspor Excel.`, {x: .5, y: 6.75, w: 12, h: .3, fontFace: FONT, fontSize: 9, color: ABU});
    /* grafik insight */
    for (const g of await this.grafikDok(6)) {
      const s = isi("Insight");
      s.addText(g.judul, {x: .5, y: 1.0, w: 12.33, h: .8, fontFace: FONT, fontSize: 17, bold: true, color: N, fit: "shrink", valign: "top"});
      s.addText(g.sub, {x: .5, y: 1.78, w: 12.33, h: .32, fontFace: FONT, fontSize: 11, color: ABU});
      let iw = 12.33, ih = iw * g.h / g.w; if (ih > 4.55) { ih = 4.55; iw = ih * g.w / g.h; }
      s.addImage({data: g.url, x: .5 + (12.33 - iw) / 2, y: 2.15, w: iw, h: ih});
      if (g.fn) s.addText(g.fn, {x: .5, y: 6.72, w: 12.33, h: .32, fontFace: FONT, fontSize: 8.5, color: ABU, fit: "shrink"});
    }
    /* rekomendasi: dua provinsi per slide */
    const rp = this.rekProv();
    for (let i = 0; i < rp.length; i += 2) {
      const s = isi("Rekomendasi per provinsi");
      rp.slice(i, i + 2).forEach((r, j) => { const x = .5 + j * 6.3;
        s.addShape(p.ShapeType.rect, {x, y: 1.15, w: .08, h: .7, fill: {color: hx(this.LV[r.lv] || this.LV[0])}, line: {color: hx(this.LV[r.lv] || this.LV[0]), width: 0}});
        s.addText(r.nama, {x: x + .2, y: 1.1, w: 5.8, h: .45, fontFace: FONT, fontSize: 18, bold: true, color: N});
        s.addText(r.ket, {x: x + .2, y: 1.52, w: 5.8, h: .35, fontFace: FONT, fontSize: 11, color: ABU, fit: "shrink"});
        s.addText(r.rek.slice(0, 6).map(z => ({text: z.t, options: {bullet: {type: "number"}, breakLine: true, paraSpaceAfter: 6}})),
          {x: x + .1, y: 2.05, w: 5.9, h: 4.8, fontFace: FONT, fontSize: 12, color: N, valign: "top", fit: "shrink"}); });
    }
    /* sumber */
    const s9 = isi("Sumber & metode");
    s9.addText([this.K.sumber + ".", ...this.catatanMetode()].map(t => ({text: t, options: {bullet: true, breakLine: true, paraSpaceAfter: 6}})), {x: .5, y: 1.1, w: 12.3, h: 5.6, fontFace: FONT, fontSize: 13, color: N, valign: "top", fit: "shrink"});
    s9.addText(`Tautan: ${this.tautan()}`, {x: .5, y: 6.7, w: 12.3, h: .3, fontFace: FONT, fontSize: 10, color: "1D4E89", hyperlink: {url: this.tautan()}});
    const blob = await p.write({outputType: "blob"}), n = p.slides?.length ?? p._slides?.length;
    return {blob, nama: this.namaEkspor("pptx"), info: `${n} slide`, slide: n};
  },
};
Bagikan.dasar = (document.currentScript?.src || "").replace(/[^/]*$/, "");
if (document.currentScript?.dataset.halaman) Bagikan.init(document.currentScript.dataset.halaman);
