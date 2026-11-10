"use strict";
/* Tiga kartu Insight banjir untuk berkas yang tadinya yatim, dibaca apa adanya, tanpa menyentuh insight.js:
   1. charter: aktivasi International Charter untuk Indonesia (data/charter.json, scripts/banjir/charter.py). Indeks, bukan model.
   2. mcdwd: uji balik model peluang banjir MODIS (data/mcdwd_model.json, scripts/banjir/mcdwd_model.py). Vonis GAGAL: tampil sebagai hasil uji, bukan status.
   3. genangan: uji balik model tangki genangan DKI (data/kecamatan_genangan.json, scripts/banjir/genangan/tangki.py). Berlabel hipotesis.
   Bagian murni (Bahan) diuji di tests/banjir/bahan.test.mjs. Berkas hilang atau bentuknya lain = kartu tidak tampil. */
const Bahan = (() => {
  const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const n = (v, d = 0) => v == null || !isFinite(v) ? "–" : Number(v).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
  const hl = t => `<span class="hl">${t}</span>`;
  const kartu = (ey, judul, isi, kaki) => `<article class="ex ex-std"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3></div></header><div class="ex-bd">${isi}${kaki ? `<p class="fnd">${kaki}</p>` : ""}</div></article>`;
  const tabel = (kepala, baris) => `<div class="tw ex-tabel"><table><thead><tr>${kepala.map(k => { const [t, tip] = k.split("|"); return `<th${tip ? ` title="${e(tip)}"` : ""}>${e(t)}</th>`; }).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const tgl = t => t ? new Date(t.slice(0, 10) + "T12:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta"}) : "–";
  const JENIS = {Flood: "Banjir", Landslide: "Longsor", Earthquake: "Gempa bumi", "Volcanic eruption": "Letusan gunung api", Tsunami: "Tsunami", Other: "Lainnya"};
  const jenis = a => (a || []).map(x => JENIS[x] || x).join(", ");

  function charter(d, maks = 8) {
    if (!d?.indonesia?.length) return "";
    const T = [...d.indonesia].sort((a, b) => (b.tgl || "").localeCompare(a.tgl || "")).slice(0, maks);
    const banjir = d.per_jenis_indonesia?.Flood;
    const isi = tabel(["Tanggal", "Peristiwa", "Jenis"], T.map(r => [tgl(r.tgl), `<span translate="no">${e(r.judul)}</span>`, e(jenis(r.jenis))]));
    const lat = d.latensi?.hari ? `Median ${n(d.latensi.hari.median)} hari dari kejadian sampai aktivasi (${n(d.latensi.n)} aktivasi punya padanan DIBI). ` : "";
    return kartu("Citra satelit darurat", `${hl(n(d.total_indonesia) + " aktivasi")} International Charter untuk Indonesia sejak 2001${banjir != null ? `, ${hl(n(banjir))} di antaranya banjir` : ""}`, isi,
      `${lat}Indeks aktivasi, bukan model dan bukan status. Sumber: International Charter Space and Major Disasters, daftar aktivasi publik (disasterscharter.org), dibuat ${tgl(d.dibuat)}`);
  }

  function mcdwd(d) {
    const m = d?.model; if (!m?.auc) return "";
    const nama = {model: "Model regresi (4 fitur)", persistensi: "Persistensi (kemarin banjir, besok banjir)", klimatologi: "Klimatologi kabupaten"};
    const baris = Object.entries(m.auc).map(([k, v]) => [e(nama[k] || k), `<b>${n(v, 3)}</b>`]);
    const kal = d.validasi_aturan_status;
    const isi = tabel(["Pembanding|Penguji tanpa model|", "AUC|Makin mendekati 1 makin baik, 0,5 = tebakan"], baris) +
      (kal ? `<p class="fnd">Aturan status sekarang melawan persistensi: selisih ETS ${n(kal.selisih_ets, 3)} (CI95 ${n(kal.ci95?.[0], 3)} sampai ${n(kal.ci95?.[1], 3)}), vonis ${e(kal.vonis)}, ${n(kal.n_uji)} hari-kabupaten uji.</p>` : "");
    return kartu("Hipotesis, belum lolos uji", `Model peluang banjir MODIS ${hl("vonis " + e(m.vonis || "?"))}: AUC ${hl(n(m.auc.model, 2))} melawan ${n(m.auc[m.pembanding_terkuat] ?? m.auc.klimatologi, 2)} milik ${e(m.pembanding_terkuat || "klimatologi")}`, isi,
      `Tidak menjadi status di peta. Sasaran: ${e(d.sasaran)}. Uji ${n(m.n_uji)} hari-kabupaten, ${n(m.positif_uji)} positif. Sumber: ${e(d.atribusi)}, dibuat ${tgl(d.dibuat)}`);
  }

  function genangan(d) {
    const r = d?.model?.cv?.ringkas; if (!r?.M1) return "";
    const nama = {M1: "Model tangki M1", klimatologi_bulanan: "Klimatologi bulanan", ambang_harian_kota: "Ambang harian kota", m0_beku_dalam_sampel: "M0 beku dalam sampel", m1_tanpa_suku_dasar: "M1 tanpa suku dasar"};
    const f = v => v == null ? "–" : n(v, 3);
    const baris = Object.keys(nama).filter(k => r[k]).map(k => [k === "M1" ? `<b>${nama[k]}</b>` : nama[k], f(r[k].pod), f(r[k].far), f(r[k].csi), f(r[k].ets)]);
    const isi = tabel(["Aturan", "POD|Proporsi genangan terlapor yang terdeteksi", "FAR|Proporsi peringatan yang salah", "CSI|Indeks keberhasilan kritis", "ETS|Keterampilan setelah dikoreksi kebetulan"], baris);
    const up = d.uji_prospektif, kec = Object.keys(d.kec || {}).length;
    return kartu(e(d.label || "Hipotesis, belum lolos uji"), `Model genangan DKI ETS ${hl(f(r.M1.ets))} per kecamatan-hari, setara klimatologi bulanan ${hl(f(r.klimatologi_bulanan?.ets))}`, isi,
      `${n(kec)} kecamatan. Uji prospektif ${e(up?.status || "belum ada")}${up?.jendela ? `, ${e(up.jendela)}` : ""}. Label: laporan PetaBencana, bias pelapor. Tidak menjadi status di peta. Dibuat ${tgl(d.dibuat)}`);
  }
  return {e, n, tgl, jenis, charter, mcdwd, genangan};
})();

if (typeof window !== "undefined" && typeof Insight !== "undefined") {
  Insight.LABEL.charter = "Charter"; Insight.LABEL.mcdwd = "Uji model MODIS"; Insight.LABEL.genangan = "Uji genangan DKI";
  const posisi = Insight.EX.indexOf("ujibalik");
  Insight.EX.splice(posisi < 0 ? Insight.EX.length : posisi + 1, 0, "mcdwd", "genangan", "charter");
  Insight.exCharter = function () { return Bahan.charter(this.BH?.charter); };
  Insight.exMcdwd = function () { return Bahan.mcdwd(this.BH?.mcdwd); };
  Insight.exGenangan = function () { return Bahan.genangan(this.BH?.genangan); };
  let _p = null;
  const muat = () => _p ||= Promise.all(["charter", "mcdwd_model", "kecamatan_genangan"].map(f => muatJSON(`data/${f}.json`).catch(() => null)))
    .then(h => { if (h.every(x => x == null)) _p = null; return h; });
  const pasang = id => {
    const el = document.getElementById("insight"); if (!el) return;
    let b = el.querySelector(`[data-ex="${id}"]`);
    if (!b) {
      b = document.createElement("div"); b.dataset.ex = id;
      const sesudah = Insight.EX.slice(Insight.EX.indexOf(id) + 1).map(k => el.querySelector(`[data-ex="${k}"]`)).find(Boolean);
      el.insertBefore(b, sesudah || null);
    }
    b.innerHTML = Insight.gambar(id);
  };
  const render0 = Insight.render;
  Insight.render = async function () {
    const r = await render0.apply(this, arguments);
    muat().then(([c, m, g]) => { this.BH = {charter: c, mcdwd: m, genangan: g}; ["mcdwd", "genangan", "charter"].forEach(pasang); });
    return r;
  };
}
