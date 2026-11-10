"use strict";
/* ================================================================ iklim BMKG dan kantor BMKG (dua kartu Insight)
   Data: ../banjir/data/iklim_bmkg.json dan bmkg_upt.json (scripts/cuaca/iklim_bmkg.py, sumber BMKG www.bmkg.go.id). Dimuat saat Insight dibuka; berkas hilang = kartu dibuang (A18).
   Isi BMKG apa adanya, berlabel lembaga dan tanggal terbit. Bukan peringatan dini. Kantor: kontak lembaga saja, tanpa nama pejabat. */
const Iklim = {
  I: null, U: null,
  async muat() { [this.I, this.U] = await Promise.all(["iklim_bmkg", "bmkg_upt"].map(n => muatJSON("../banjir/data/" + n + ".json").catch(() => null))); },
  tgl: t => t ? new Date(t.replace(" ", "T") + "+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric"}) : "–",
  ik: p => `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`,
  pil: t => `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#0b2545;color:#fff;font-size:11px;font-weight:700">${t}</span>`,
  tab: (kol, baris) => `<div class="tw" style="max-height:340px"><table><thead><tr>${kol.map(c => `<th>${c.n}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${kol.map(c => `<td>${c.h(r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
  /* A: prakiraan hujan bulanan (persen kabupaten/kota per kategori, dibaca dari narasi BMKG) + terbitan terbaru tiap hub */
  exIklim() {
    const D = this.I, N = D?.narasi; if (!N) return "";
    const k = ["pch_bln", "psh_bln"].some(x => x === Insight.st.iklP) ? Insight.st.iklP : "pch_bln";
    const R = Object.values(N).filter(n => n.produk === k && n.persen), WR = {"Sangat Tinggi": "#1d4ed8", "Tinggi": "#3b82f6", "Menengah": "#93c5fd", "Rendah": "#fcd34d", "Jauh di Atas Normal": "#1d4ed8", "Atas Normal": "#3b82f6", "Normal": "#93c5fd", "Bawah Normal": "#fcd34d"};
    if (!R.length) return "";
    const tg = (D.hub_artikel?.["prediksi-musim"] || [])[0], nm = k === "pch_bln" ? "curah hujan" : "sifat hujan", pertama = R[0], teratas = Object.entries(pertama.persen).sort((a, b) => b[1] - a[1])[0];
    const bar = R.map(n => `<div style="display:flex;align-items:center;gap:10px;margin:7px 0"><span style="flex:0 0 120px;font-size:12px;font-weight:600">${esc(n.periode.replace(/^bulan /, ""))}</span><div style="display:flex;flex:1;height:22px;border-radius:5px;overflow:hidden">${
      Object.entries(n.persen).map(([c, v]) => `<i style="width:${v}%;background:${WR[c] || "#9ca3af"}" data-tip="<b>${esc(n.periode)}</b><br>${esc(c)}: ${String(v).replace(".", ",")}% dari ${n.n_kab} kabupaten/kota"></i>`).join("")}</div></div>`).join("");
    const leg = Object.keys(R[0].persen).map(c => `<span style="margin-right:12px;font-size:11.5px"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${WR[c] || "#9ca3af"};margin-right:4px"></i>${esc(c)}</span>`).join("");
    const HUB = [["prediksi-musim", "Prakiraan musim"], ["dinamika-atmosfer", "Dinamika atmosfer"], ["anomali-suhu-udara", "Anomali suhu udara"], ["analisis-hujan", "Analisis hujan"], ["buletin-iklim", "Buletin iklim"]];
    const baris = HUB.map(([h, n]) => ({n, a: (D.hub_artikel?.[h] || [])[0]})).filter(x => x.a);
    const isi = `<div style="margin:0 0 6px">${this.pil("data BMKG apa adanya, bukan deteksi Centurisk97")}</div><div>${bar}<div style="margin:6px 0 14px">${leg}</div></div>` + this.tab([{n: "Topik", h: r => esc(r.n)}, {n: "Terbitan terbaru BMKG", h: r => `<a href="https://www.bmkg.go.id/iklim/${encodeURIComponent(r.a.slug)}" target="_blank" rel="noopener">${esc(r.a.judul)}</a>`}, {n: "Terbit", h: r => this.tgl(r.a.tanggal)}], baris);
    return Kartu.ex(`BMKG: ${nm} kategori ${Kartu.hl(teratas[0].toLowerCase())} paling dominan, ${Kartu.hl(String(teratas[1]).replace(".", ",") + "%")} kabupaten/kota pada ${esc(pertama.periode.replace(/^bulan /, ""))}`, "", "", isi,
      `Persen kabupaten/kota per kategori seperti narasi BMKG, bukan peringatan dini${tg ? `; prakiraan musim terbit ${this.tgl(tg.tanggal)}` : ""}. Sumber: BMKG iklim, diambil ${esc((D.dibuat || "").slice(0, 10))}`,
      Kartu.seg("iklP", [["pch_bln", "Curah hujan"], ["psh_bln", "Sifat hujan"]], {iklP: k}))
      .replace('<span class="ex-ey"></span>', `<span class="ex-ey">${this.ik('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>')}Iklim BMKG</span>`); },
  /* B: kontak kantor BMKG per provinsi, tanpa nama pejabat */
  exKantor() {
    const U = this.U, K = U?.kantor; if (!K?.length) return "";
    const provs = [...new Set(K.map(x => x.provinsi))].sort(), p = provs.includes(Insight.st.kantorP) ? Insight.st.kantorP : "", R = K.filter(x => !p || x.provinsi === p).sort((a, b) => a.provinsi.localeCompare(b.provinsi) || a.satker.localeCompare(b.satker));
    const sel = `<select data-set="kantorP" aria-label="Provinsi"><option value="">Semua provinsi</option>${provs.map(v => `<option value="${esc(v)}" ${v === p ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`;
    const isi = `<div style="margin:0 0 6px">${this.pil("kontak resmi BMKG, bukan Centurisk97")}</div>` + this.tab([{n: "Kantor", h: r => `<b translate="no">${esc(r.satker)}</b>`}, {n: "Provinsi", h: r => `<span translate="no">${esc(r.provinsi)}</span>`}, {n: "Telepon", h: r => r.telepon?.length ? esc(r.telepon.join(", ")) : "–"}, {n: "Surel", h: r => r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : "–"}], R);
    return Kartu.ex(`Kontak ${Kartu.hl(fmt(R.length) + " kantor")} BMKG${p ? ` di ${esc(p)}` : ` di ${Kartu.hl(provs.length + " provinsi")}`} untuk koordinasi cuaca dan iklim`, "", "", isi, `Kontak lembaga, tanpa nama pejabat. Sumber: BMKG profil balai dan UPT, diambil ${esc((U.dibuat || "").slice(0, 10))}`, sel)
      .replace('<span class="ex-ey"></span>', `<span class="ex-ey">${this.ik('<path d="M3 20h18M5 20V10l7-6 7 6v10M10 20v-6h4v6"/>')}Kantor BMKG</span>`); },
};
Object.assign(IK, {iklim: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', kantor: '<path d="M3 20h18M5 20V10l7-6 7 6v10M10 20v-6h4v6"/>'});
Object.assign(Insight.LABEL, {iklim: "Iklim BMKG", kantor: "Kantor BMKG"});
Insight.exIklim = () => Iklim.exIklim(); Insight.exKantor = () => Iklim.exKantor();
Insight.EX.splice(Insight.EX.indexOf("provinsi"), 0, "iklim", "kantor");
