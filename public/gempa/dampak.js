"use strict";
/* ================================================================ dampak gempa */
/* Tab Dampak gempa: penduduk yang tinggal di kecamatan berindeks bahaya gempa tinggi (InaRISK x WorldPop), data/dampak.json (scripts/gempa/dampak.py).
   Ini paparan bahaya jangka panjang, BUKAN perkiraan guncangan satu gempa: model guncangan (guncangan.js) belum dipakai karena koefisiennya belum diverifikasi.
   Bagian yang datanya tidak ada dibuang (A18): sekolah, fasilitas kesehatan, jalan, kelas PAGER, korban historis (DIBI gempa) belum punya data gempa. Rupiah tidak ditampilkan. */
const Dampak = (() => {
  const W = "#b07a3c", KELAS_W = {rendah: "#d8c9a8", sedang: "#d4902f", tinggi: "#c9503a"}, NAMA_KELAS = {rendah: "rendah", sedang: "sedang", tinggi: "tinggi"};
  const IKON = "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8";
  let D = null; const st = {kelas: "tinggi", ukuran: "jiwa"};
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const bag = (judul, isi, sumber, ctl = "", leg = null) => { if (leg) Kartu.leg(leg);
    return Kartu.ex(judul, "", "", isi, "Sumber: " + sumber, ctl).replace('<span class="ex-ey"></span>', '<span class="ex-ey">Penduduk terpapar</span>')
      .replace("</h3>", `</h3><button type="button" class="bg-ex" data-bagi title="Bagikan" aria-label="Bagikan kartu ini">${KG.IKON_BAGI}</button>`); };
  const SUMBER = "InaRISK BNPB (indeks bahaya gempa), WorldPop 2026 (penduduk)";
  function nasional() {
    const N = D.nasional, tot = N.rendah + N.sedang + N.tinggi; if (!tot) return "";
    const rows = ["tinggi", "sedang", "rendah"].map(k => ({nama: `Bahaya ${NAMA_KELAS[k]}`, v: N[k], teks: rb(N[k]), warna: KELAS_W[k], pil: [[Math.round(N[k] / tot * 100) + "%", KELAS_W[k], k === "rendah" ? "#3b3320" : "#fff"]],
      tip: `<b>Bahaya ${NAMA_KELAS[k]}</b><br>Penduduk: ${fmt(N[k])} jiwa<br>Bagian: ${Math.round(N[k] / tot * 100)}%`}));
    return bag(`${Kartu.hl(jt(N.tinggi) + " jiwa")} (${Kartu.hl(Math.round(N.tinggi / tot * 100) + "%")}) penduduk Indonesia tinggal di kecamatan berbahaya gempa tinggi`,
      KG.mendatar(rows, {akhir: 130}), SUMBER); }
  function provinsi() {
    const gab = st.kelas === "sedang", jiwa = st.ukuran === "jiwa", pv = D.prov;
    const val = o => (o.tinggi + (gab ? o.sedang : 0)), tot = o => o.rendah + o.sedang + o.tinggi;
    const R = Object.entries(pv).filter(([, o]) => tot(o) > 0).map(([k, o]) => ({k, o, v: val(o), p: val(o) / tot(o)})).sort((a, b) => (jiwa ? b.v - a.v : b.p - a.p)).slice(0, 12);
    if (!R.length || !R[0].v) return "";
    const nm = gab ? "sedang dan tinggi" : "tinggi", U = innerWidth < 640;
    const rows = R.map(r => ({nama: esc(U ? KG.pendek(namaProv(r.k)) : namaProv(r.k)), v: jiwa ? r.v : Math.round(r.p * 1000) / 10, teks: jiwa ? rb(r.v) : fmt(Math.round(r.p * 1000) / 10) + "%", warna: gab ? KELAS_W.sedang : KELAS_W.tinggi,
      pil: [[jiwa ? Math.round(r.p * 100) + "%" : rb(r.v) + " jiwa", W]],
      tip: `<b>${esc(namaProv(r.k))}</b><br>Penduduk di bahaya ${nm}: ${fmt(r.v)} jiwa<br>Bagian penduduk provinsi: ${fmt(Math.round(r.p * 1000) / 10)}%<br>Kecamatan bahaya tinggi: ${fmt(r.o.kec_tinggi)}`}));
    const judul = `${Kartu.hl(esc(namaProv(R[0].k)))} ${jiwa ? "terbanyak" : "tertinggi"}: ${Kartu.hl(jiwa ? jt(R[0].v) + " jiwa" : fmt(Math.round(R[0].p * 100)) + "%")} penduduknya tinggal di kecamatan berbahaya gempa ${nm}`;
    const ctl = Kartu.seg("kelas", [["tinggi", "Bahaya tinggi"], ["sedang", "Sedang dan tinggi"]], st) + Kartu.seg("ukuran", [["jiwa", "Jumlah jiwa"], ["persen", "Persen penduduk"]], st);
    return bag(judul, KG.mendatar(rows, {akhir: 130}), SUMBER, ctl); }
  const gambar = () => `<section class="dk-bag" id="dk-pend"><header class="dk-sh" style="--w:${W}"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON}"/></svg><h2>Penduduk terpapar</h2></header><div class="dk-kartu">${[nasional(), provinsi()].join("")}</div></section>`;
  async function render() {
    const el = $("#dampak"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1;
      el.addEventListener("click", e => { const s = e.target.closest("[data-set]"); if (!s) return; st[s.dataset.set] = s.dataset.v; nanti(() => { el.innerHTML = D ? gambar() : ""; }); }); }
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak gempa…</div>`;
      try { D = await muatJSON("data/dampak.json"); } catch (e) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; } }
    el.innerHTML = gambar(); }
  return {render};
})();
