"use strict";
/* ================================================================ dampak gempa */
/* Tab Dampak gempa: penduduk yang tinggal di kecamatan berindeks bahaya gempa tinggi (InaRISK x WorldPop), ../banjir/data/dampak_gempa.json (scripts/gempa/dampak.py, harian lewat scripts/banjir/posko.py).
   Ini paparan bahaya jangka panjang, BUKAN perkiraan guncangan satu gempa: model guncangan (guncangan.js) belum dipakai karena koefisiennya belum diverifikasi.
   Bagian yang datanya tidak ada dibuang (A18): sekolah, fasilitas kesehatan, jalan, kelas PAGER, korban historis (DIBI gempa) belum punya data gempa. Rupiah tidak ditampilkan. */
const Dampak = (() => {
  const W = "#b07a3c", KELAS_W = {rendah: "#d8c9a8", sedang: "#d4902f", tinggi: "#c9503a"}, NAMA_KELAS = {rendah: "rendah", sedang: "sedang", tinggi: "tinggi"};
  const IKON = "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8";
  let D = null; const st = {kelas: "tinggi", ukuran: "jiwa"};
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const bag = (judul, isi, sumber, ctl = "", leg = null) => Kartu.kartu("Penduduk terpapar", judul, isi, sumber, ctl, leg);
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
    const rows = R.map(r => ({nama: esc(U ? KG.pendek(namaProv(r.k)) : namaProv(r.k)), v: jiwa ? r.v : Math.round(r.p * 100), teks: jiwa ? rb(r.v) : fmt(Math.round(r.p * 100)) + "%", warna: gab ? KELAS_W.sedang : KELAS_W.tinggi,
      pil: [[jiwa ? Math.round(r.p * 100) + "%" : rb(r.v) + " jiwa", W]],
      tip: `<b>${esc(namaProv(r.k))}</b><br>Penduduk di bahaya ${nm}: ${fmt(r.v)} jiwa<br>Bagian penduduk provinsi: ${fmt(Math.round(r.p * 100))}%<br>Kecamatan bahaya tinggi: ${fmt(r.o.kec_tinggi)}`}));
    const judul = `${Kartu.hl(esc(namaProv(R[0].k)))} ${jiwa ? "terbanyak" : "tertinggi"}: ${Kartu.hl(jiwa ? jt(R[0].v) + " jiwa" : fmt(Math.round(R[0].p * 100)) + "%")} penduduknya tinggal di kecamatan berbahaya gempa ${nm}`;
    const ctl = Kartu.seg("kelas", [["tinggi", "Bahaya tinggi"], ["sedang", "Sedang dan tinggi"]], st) + Kartu.seg("ukuran", [["jiwa", "Jumlah jiwa"], ["persen", "Persen penduduk"]], st);
    return bag(judul, KG.mendatar(rows, {akhir: 130}), SUMBER, ctl); }
  const pendKartu = () => [nasional(), provinsi()].join("");
  const gambar = () => `<section class="dk-bag" id="dk-pend"><header class="dk-sh" style="--w:${W}"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON}"/></svg><h2>Penduduk terpapar</h2></header><div class="dk-kartu">${pendKartu()}</div></section>`;
  /* bagian tambahan (async, dibuang bila datanya tidak ada): paparan guncangan gempa terbesar 7 hari (model, bukan pengukuran) dan fasilitas rawan */
  const pita = (id, nama, ikon, isi) => `<section class="dk-bag" id="dk-${id}"><header class="dk-sh" style="--w:${W}"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ikon}"/></svg><h2>${nama}</h2></header><div class="dk-kartu">${isi}</div></section>`;
  async function paparan() {
    const A = (S.gempa || []).filter(g => g.m >= 5 && g.t >= Date.now() - 7 * 864e5).sort((a, b) => b.m - a.m || b.t - a.t), g = A[0]; if (!g || typeof GempaGuncangan === "undefined") return "";
    const P = (await Guncang.hitung(g)).P; if (!P?.total) return "";
    const ks = Object.keys(P.per).map(Number).filter(k => k >= 3).sort((a, b) => b - a); if (!ks.length) return "";
    const rows = ks.map(k => ({nama: "MMI " + ROMAWI[k], v: P.per[k], teks: rb(P.per[k]), warna: MMI_WARNA[k], pil: [[Math.round(P.per[k] / P.total * 100) + "%", W]], tip: `<b>MMI ${ROMAWI[k]}</b><br>Perkiraan penduduk: ${fmt(P.per[k])} jiwa`}));
    const tinggi = ks.filter(k => k >= 6).reduce((a, k) => a + P.per[k], 0);
    const judul = tinggi ? `${Kartu.hl(jt(tinggi) + " jiwa")} diperkirakan terguncang MMI VI atau lebih oleh gempa ${Kartu.hl(mTulis(g.m))} <span translate="no">${esc(wilayahPendek(g.wilayah))}</span>` : `Gempa ${Kartu.hl(mTulis(g.m))} <span translate="no">${esc(wilayahPendek(g.wilayah))}</span> diperkirakan paling kuat terasa MMI ${Kartu.hl(ROMAWI[ks[0]])} di permukiman`;
    return pita("paparan", "Paparan guncangan", IKON, Kartu.kartu("Gempa terbesar 7 hari", judul, KG.mendatar(rows, {akhir: 110}), "model guncangan GMPE (BSSA14, Zhao 2006), WorldPop 2026; perkiraan, bukan pengukuran")); }
  async function fasilitas() {
    const k = (await Promise.all(Bukti.IDS.map(i => Bukti.kartu(i)))).filter(Boolean), t = await Bukti.tabel(); if (!k.length && !t) return "";
    return pita("fasilitas", "Fasilitas rawan", "M22 10 12 5 2 10l10 5 10-5ZM6 12v5c3 3 9 3 12 0v-5", k.join("") + `<div data-bukti-tabel>${t}</div>`); }
  async function tambahan(el) {
    const [a, b] = await Promise.all([paparan().catch(() => ""), fasilitas().catch(() => "")]); if (!el.isConnected || !(a || b)) return;
    el.querySelectorAll("[data-tambah]").forEach(x => x.remove()); const d = document.createElement("div"); d.dataset.tambah = 1; d.innerHTML = a + b; el.appendChild(d);
    const box = d.querySelector("[data-bukti-tabel]"); if (box) { const ulang = () => nanti(async () => { box.innerHTML = await Bukti.tabel(); Bukti.hubung(box, ulang); }); Bukti.hubung(box, ulang); } }
  async function render() {
    const el = $("#dampak"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1;
      el.addEventListener("click", e => { const s = e.target.closest("[data-set]"); if (!s) return; st[s.dataset.set] = s.dataset.v; s.parentElement.querySelectorAll("[data-set]").forEach(b => b.setAttribute("aria-pressed", b === s));
        nanti(() => { const k = D && el.querySelector("#dk-pend .dk-kartu"); if (k) k.innerHTML = pendKartu(); }); }); }
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak gempa…</div>`;
      try { D = await muatJSON("../banjir/data/dampak_gempa.json"); } catch (e) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; } }
    el.innerHTML = gambar(); tambahan(el); }
  return {render};
})();
