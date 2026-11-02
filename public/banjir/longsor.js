"use strict";
/* Tab Longsor: kartu bergaya Insight (Kartu.kartu, inti/kartu.js), tanpa mesin baru.
   Data: status longsor kecamatan (S.st, hari aktif), ../longsor/data/nowcast.json + kerentanan.json (nama kecamatan, lazy),
   ../data/logbook_riwayat.json (jenis longsor, per 100 hari tercatat), ../prediksi/data/kalender_risiko.json (musim, peluang bulanan).
   Nowcast longsor belum lulus uji balik (vonis ada di nowcast.json): kartunya menyebut itu terang-terangan. Grafik: data-tip = tooltip bersama. */
const Longsor = (() => {
  const W = "#9c5a2f", BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const f1 = n => Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1}), f2 = n => Number(n).toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  let D = null, janji = null, kerj = null, kunci = null;
  const ambil = u => muatJSON(u).catch(() => null);
  const kerentanan = () => kerj ||= ambil("../longsor/data/kerentanan.json");
  const tgl = t => { const [, m, d] = String(t).split("-"); return `${+d} ${BULAN[+m - 1]}`; };
  const muat = () => janji ||= Promise.all([ambil("../longsor/data/nowcast.json"), ambil("../data/logbook_riwayat.json"), ambil("../prediksi/data/kalender_risiko.json")])
    .then(([nc, lb, kal]) => D = {nc, lb, kal});
  /* batang vertikal: v = [{n: label sumbu, v: nilai, tip: html}] */
  function batang(v, w = W, tinggi = 190) {
    const Wd = 640, L = 8, B = tinggi - 26, T = 16, m = Math.max(...v.map(x => x.v), 1e-9), gp = (Wd - L * 2) / v.length, bw = Math.min(34, gp * .66);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${tinggi}" width="100%" role="img">${v.map((x, i) => { const h = Math.max(1.5, x.v / m * (B - T)), cx = L + i * gp + gp / 2;
      return `<g><rect class="gy" style="--i:${i}" x="${cx - bw / 2}" y="${B - h}" width="${bw}" height="${h}" rx="3" fill="${w}" data-tip="${x.tip}"/>`
        + `<text x="${cx}" y="${B - h - 4}" text-anchor="middle" font-size="10.5" fill="currentColor">${x.txt ?? ""}</text><text x="${cx}" y="${tinggi - 8}" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".75">${x.n}</text></g>`; }).join("")}</svg>`;
  }
  function status() {
    if (!S.st?.kec) return Kartu.kartu("Status", "Status longsor kecamatan", '<p style="margin:0">Memuat status longsor…</p>', "Open-Meteo dan InaRISK");
    const kec = S.st.kec, n = [0, 0, 0, 0], prov = {}, t = S.st.hari?.[S.hari], kapan = S.hari === 0 ? "hari ini" : (t ? tgl(t) : "hari yang dipilih");
    for (const [k, v] of Object.entries(kec)) { const l = v.l?.[S.hari] || 0; n[l]++; if (l) { const p = k.split("|")[0]; (prov[p] ||= [0, 0, 0, 0])[l]++; } }
    const rows = Object.entries(prov).map(([p, a]) => ({n: namaProv(p), v: a[1] + a[2] + a[3], a})).sort((a, b) => b.v - a.v).slice(0, 10)
      .map(r => ({n: r.n, v: r.v, tip: `<b>${esc(r.n)}</b><br>Waspada: ${fmt(r.a[1])}<br>Siaga: ${fmt(r.a[2])}<br>Awas: ${fmt(r.a[3])}`}));
    const ring = n[1] + n[2] + n[3], data = S.st.hari?.[0] ? ` Data sampai ${tgl(S.st.hari[0])}.` : "";
    const isi = `<p style="margin:0 0 10px;line-height:1.5;text-align:justify">${ring ? `${fmt(n[3])} Awas, ${fmt(n[2])} Siaga, ${fmt(n[1])} Waspada.` : `Tidak ada kecamatan berstatus longsor ${kapan}.`}${data}</p>`
      + (rows.length ? Kartu.hbar(rows, W) : "");
    return Kartu.kartu("Status", ring ? `${Kartu.hl(fmt(ring))} kecamatan berstatus longsor ${kapan}` : `Status longsor kecamatan ${kapan}`, isi, "prakiraan hujan Open-Meteo dan indeks bahaya InaRISK BNPB");
  }
  async function nowcast() {
    const nc = D.nc; if (!nc) return "";
    const uj = nc.uji_balik || {}, a = uj.auc || {}, r = nc.ringkas || {};
    const riw = (nc.riwayat || []).slice(-12).map(x => ({n: tgl(x.tgl), v: x.tinggi, txt: fmt(x.tinggi), tip: `<b>${tgl(x.tgl)}</b><br>Tinggi: ${fmt(x.tinggi)} kecamatan<br>Sedang: ${fmt(x.sedang)} kecamatan`}));
    let nama = "";
    const kr = await kerentanan();
    if (kr?.kec) nama = `<ol style="margin:0 0 10px;padding-left:20px;line-height:1.5">${(nc.tinggi || []).slice(0, 8).map(([i, sk, t]) => `<li>${esc((kr.kec[i] || "").split("|").reverse().join(", "))}: hujan 7 hari ${f1(t)} kali batas ekstrem (P95), kerentanan ${f1(sk)} dari 1</li>`).join("")}</ol>`;
    /* kalimat uji balik diturunkan dari angka: pembanding terbaik di antara hujan saja dan klimatologi */
    const ok = uj.vonis && a.model != null && a.klim != null, kalah = ok && a.model < a.klim;
    const vonis = ok ? `<p style="margin:0 0 10px;line-height:1.5;text-align:justify"><b>Uji balik: ${esc(uj.vonis)}.</b> AUC model ${f2(a.model)}, hujan saja ${f2(a.hujan)}, klimatologi musiman ${f2(a.klim)}. `
      + (kalah ? "Model belum mengalahkan pola musim, jadi pakai sebagai petunjuk awal, bukan peringatan." : "Model mengungguli pola musim pada uji balik.") + "</p>" : "";
    const isi = `<p style="margin:0 0 10px;line-height:1.5;text-align:justify">Hujan 7 hari sampai ${tgl(nc.jendela_akhir)}: ${fmt(r.tinggi)} kecamatan berbahaya tinggi dan ${fmt(r.sedang)} sedang dari ${fmt(r.kec)}.</p>`
      + vonis + nama + (riw.length ? batang(riw) : "");
    return Kartu.kartu("Nowcast", `${Kartu.hl(fmt(r.tinggi))} kecamatan berbahaya tinggi menurut nowcast longsor`, isi, "Open-Meteo, ERA5, DEM Terrarium, GEM Active Faults, SoilGrids");
  }
  const riwayat = () => D.lb ? LogbookTren.kartu(D.lb, "longsor", "longsor", W) : "";
  function musim() {
    const kab = D.kal?.kab; if (!kab) return "";
    const s = Array(12).fill(0), n = Array(12).fill(0);
    for (const k of Object.values(kab)) { const p = k.longsor?.p; if (p) p.forEach((x, i) => { s[i] += x; n[i]++; }); }
    const v = s.map((t, i) => { const r = n[i] ? t / n[i] * 100 : 0; return {n: BULAN[i], v: r, txt: Math.round(r) + "%", tip: `<b>${BULAN[i]}</b><br>Rata-rata peluang ada kejadian longsor: ${f1(r)}% per kabupaten<br>${fmt(D.kal.n_tahun)} tahun penuh`}; });
    return Kartu.kartu("Musim", `Puncak musim longsor ${Kartu.hl(BULAN[v.indexOf(v.reduce((a, b) => b.v > a.v ? b : a))])}: peluang kejadian per bulan`, batang(v), "Logbook harian Pusdalops BNPB, tahun penuh; rata-rata seluruh kabupaten, bukan prakiraan hari ini");
  }
  return {
    async render() {
      const el = $("#longsor"); if (!el) return;
      const k = (S.st?.hari?.[0] || "") + "|" + S.hari + "|" + (S.st ? 1 : 0);
      if (k === kunci && el.dataset.siap) return;   /* data dan hari sama: jangan gambar ulang */
      kunci = k; el.dataset.siap = "1";
      el.innerHTML = status() + '<div id="lsNow"><p style="margin:12px 0">Memuat nowcast longsor…</p></div><div id="lsLain"></div>';
      await muat();
      if (kunci !== k) return;
      $("#lsLain").innerHTML = riwayat() + musim();
      const n = await nowcast(); if (kunci === k) $("#lsNow").innerHTML = n;
    },
  };
})();
