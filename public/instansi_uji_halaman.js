/* Halaman /uji-lapangan, bagian Hasil: menggambar GET /api/uji-lapangan (agregat: tanpa nama, WhatsApp, atau koordinat). Ambang dan metrik dibaca dari jawaban API
   (src/uji_lapangan.js PRAREGISTRASI = satu-satunya sumber), bukan diketik ulang di sini. DOM dibangun dengan textContent: teks dari jawaban API tidak pernah ditafsirkan sebagai HTML. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const angka = (x, d = 2) => x == null || !Number.isFinite(x) ? "—" : Number(x).toLocaleString("id-ID", {maximumFractionDigits: d});
  const persen = x => x == null ? "—" : `${angka(x * 100, 1)}%`;
  const selang = (s, f) => s ? `${f(s[0])} sampai ${f(s[1])}` : "—";
  const VONIS = {belum_cukup_data: ["Belum cukup data", "belum"], lolos: ["Lolos", "lolos"], gagal: ["Gagal", "gagal"]};
  const WIB = ms => new Date(ms + 7 * 36e5).toISOString().replace("T", " ").slice(0, 16) + " WIB";
  /* cara menampilkan nilai/selang/ambang per pertanyaan */
  const FORMAT = {
    Q1: {nilai: persen, selang: s => selang(s, persen), ambang: a => `presisi level ≥ ${a.level_min} ≥ ${persen(a.presisi_min)}, n ≥ ${a.n_min}`},
    Q2: {nilai: persen, selang: s => selang(s, persen), ambang: a => `deskriptif (belum ada ambang); n ≥ ${a.n_min} untuk dilaporkan`},
    Q3: {nilai: x => angka(x, 3), selang: s => selang(s, x => angka(x, 3)), ambang: a => `BSS > ${a.bss_min}, n ≥ ${a.n_min} pasangan`},
    Q4: {nilai: x => angka(x, 2), selang: s => selang(s, x => angka(x, 2)), ambang: a => `median rasio ${angka(a.rasio_min, 1)} sampai ${angka(a.rasio_maks, 1)}, n ≥ ${a.n_min}`},
    Q5: {nilai: persen, selang: s => selang(s, persen), ambang: a => `porsi benar ≥ ${persen(a.porsi_min)}, n ≥ ${a.n_min}`},
  };
  const NILAI_NAMA = {Q1: "presisi (level ≥ 2)", Q2: "porsi terlewat", Q3: "BSS", Q4: "median rasio lapangan / platform", Q5: "porsi padam benar"};
  function pilVonis(q) {
    if (q.vonis == null) return el("span", "uj-vonis deskriptif", "Deskriptif");
    const [t, k] = VONIS[q.vonis] || [q.vonis, ""]; return el("span", "uj-vonis " + k, t);
  }
  function baris(q, waktu) {
    const f = FORMAT[q.id], tr = el("tr"), td = (t, k) => { const c = el("td", k || "", t); tr.append(c); return c; };
    const a = td(""); a.append(el("b", "", `${q.id}. ${q.judul}`), el("div", "uj-rinci", q.metrik));
    td(`${angka(q.n, 0)} / ${angka(q.n_min, 0)}`, "angka");
    const n = td("", "angka"); n.append(document.createTextNode(f.nilai(q.nilai)), el("div", "uj-rinci", NILAI_NAMA[q.id]));
    td(f.selang(q.selang), "angka"); td(f.ambang(q.ambang));
    td("").append(pilVonis(q));
    td(waktu, "angka");
    return tr;
  }
  function tabelKecil(judul, kolom, data) {
    const w = el("div", "uj-kartu"); w.append(el("b", "", judul));
    const bungkus = el("div", "uj-tabel-bungkus"), t = el("table", "uj-tabel"), th = el("tr");
    for (const k of kolom) th.append(el("th", "", k[0]));
    const kepala = el("thead"); kepala.append(th); t.append(kepala);
    const tb = el("tbody");
    for (const r of data) { const tr = el("tr"); kolom.forEach((k, i) => tr.append(el("td", "angka", r.ditahan && i > 0 ? "<5" : k[1](r)))); tb.append(tr); }   // sel kecil (< 5) ditahan server
    t.append(tb); bungkus.append(t); w.append(bungkus); return w;
  }
  function rincian(qs) {
    const w = $("ujRincian"); w.replaceChildren();
    const q1 = qs.find(q => q.id === "Q1");
    if (q1?.rincian) {
      w.append(tabelKecil("Q1 per level platform (ditimbang)", [["Level", r => String(r.level)], ["Kunjungan", r => angka(r.n, 0)], ["Api ditemukan", r => angka(r.ya, 0)], ["Presisi", r => persen(r.nilai)], ["Selang 95%", r => selang(r.selang, persen)], ["n efektif", r => angka(r.n_efektif, 1)]], q1.rincian.per_level),
        tabelKecil("Q1 per kelas firespot (ditimbang)", [["Kelas", r => r.firespot], ["Kunjungan", r => angka(r.n, 0)], ["Api ditemukan", r => angka(r.ya, 0)], ["Presisi", r => persen(r.nilai)], ["Selang 95%", r => selang(r.selang, persen)]], q1.rincian.per_firespot),
        tabelKecil("Q1 per strata sampel (tanpa bobot)", [["Strata", r => r.sampel === "kontrol" ? "kontrol (acak)" : "tugas otomatis"], ["Kunjungan", r => angka(r.n, 0)], ["Api ditemukan", r => angka(r.ya, 0)], ["Presisi mentah", r => persen(r.presisi_mentah)]], q1.rincian.per_sampel));
    }
    const q2 = qs.find(q => q.id === "Q2"), q4 = qs.find(q => q.id === "Q4");
    const k = el("div", "uj-kartu");
    if (q2) k.append(el("p", "", q2.ditahan ? `Q2: ${angka(q2.n, 0)} laporan api regu dinilai; rincian terdeteksi/terlewat ditahan (<5).` : `Q2: dari ${angka(q2.n, 0)} laporan api regu yang dinilai, ${angka(q2.terdeteksi, 0)} punya tugas atau titik satelit dalam 2 km (POD ${persen(q2.pod)}) dan ${angka(q2.terlewat, 0)} terlewat.`));
    if (q4?.rincian) k.append(el("p", "", `Q4: MAPE ${q4.mape == null ? "<5 kejadian, ditahan" : persen(q4.mape)}${q4.mape == null ? "" : ` (n ${angka(q4.n_mape, 0)})`}; ${q4.rincian.taksiran_tidak_dihitung == null ? "<5" : angka(q4.rincian.taksiran_tidak_dihitung, 0)} isian luas taksiran mata tidak dihitung.`));
    if (k.childNodes.length) w.append(k);
  }
  async function muat() {
    const st = $("ujStatus");
    let r; try { r = await fetch("/api/uji-lapangan", {headers: {accept: "application/json"}}); } catch (e) { st.className = "uj-galat"; st.textContent = "Tidak ada sambungan. Coba lagi sebentar lagi."; return; }
    if (r.status === 403 || r.status === 401) { st.className = "uj-galat"; st.textContent = "Hasil uji hanya untuk admin dan akun pemirsa yang sudah masuk."; return; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { st.className = "uj-galat"; st.textContent = j.galat || `Hasil belum bisa dimuat (${r.status}).`; return; }
    const w = $("ujHasil"), waktu = WIB(j.diperbarui), t = el("table", "uj-tabel"), th = el("tr");
    for (const k of ["Pertanyaan", "n / minimum", "Nilai", "Selang 95%", "Ambang lolos", "Vonis", "Diperbarui"]) th.append(el("th", "", k));
    const kepala = el("thead"); kepala.append(th); t.append(kepala);
    const tb = el("tbody"); for (const q of j.pertanyaan) tb.append(baris(q, waktu));
    t.append(tb); w.replaceChildren(t); w.hidden = false;
    const k = j.kontrol || {};
    st.className = "uj-redup"; st.textContent = `Pra-registrasi ${j.praregistrasi.versi}, dibekukan ${j.praregistrasi.dibekukan}. Sampel kontrol: ${angka(k.dipilih ?? 0, 0)} dipilih, ${angka(k.dikunjungi ?? 0, 0)} dikunjungi, ${angka(k.tak_dikunjungi ?? 0, 0)} tak sempat dikunjungi. Diperbarui ${waktu}.`;
    rincian(j.pertanyaan);
    const c = $("ujCatatan"); for (const teks of j.catatan || []) if (!Array.from(c.children).some(li => li.textContent === teks)) c.append(el("li", "", teks));
  }
  /* uji banjir: GET /api/uji-lapangan/banjir (agregat; sel < 5 datang null = ditahan) */
  async function muatBanjir() {
    let r; try { r = await fetch("/api/uji-lapangan/banjir", {headers: {accept: "application/json"}}); } catch (e) { return; }
    if (!r.ok) return;
    const j = await r.json().catch(() => null); if (!j?.genangan) return;
    const k = el("div", "uj-kartu"), tahan = x => x == null ? "<5" : angka(x, 0);
    k.append(el("b", "", "Uji lapangan banjir"));
    k.append(el("p", "", `Genangan ditemukan petugas: ${tahan(j.genangan.n)}${j.genangan.tinggi_median_cm == null ? "" : `, tinggi tengah ${angka(j.genangan.tinggi_median_cm, 0)} cm`}. Lokasi Aman yang dicek tanpa genangan (kontrol): ${tahan(j.kontrol.n)}.`));
    k.append(el("p", "", "Status peta saat pengamatan: " + j.genangan.per_status.map(x => `${x.status} ${tahan(x.n)}`).join(", ") + ". Genangan di lokasi berstatus Aman berarti banjir yang terlewat peta."));
    $("ujRincian").append(k);
  }
  muat().then(muatBanjir);
})();
