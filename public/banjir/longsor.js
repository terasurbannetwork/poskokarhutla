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
  const muat = () => janji ||= Promise.all([ambil("../longsor/data/nowcast.json"), ambil("../data/logbook_riwayat.json"), ambil("../prediksi/data/kalender_risiko.json"), ambil("../data/label_mutu/longsor.json")])
    .then(([nc, lb, kal, mut]) => D = {nc, lb, kal, mut});
  /* batang vertikal: v = [{n: label sumbu, v: nilai, tip: html}] */
  function batang(v, w = W, tinggi = 190) {
    const Wd = 640, L = 8, B = tinggi - 26, T = 16, m = Math.max(...v.map(x => x.v), 1e-9), gp = (Wd - L * 2) / v.length, bw = Math.min(34, gp * .66);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${tinggi}" width="100%" role="img">${v.map((x, i) => { const h = Math.max(1.5, x.v / m * (B - T)), cx = L + i * gp + gp / 2;
      return `<g><rect class="gy" style="--i:${i}" x="${cx - bw / 2}" y="${B - h}" width="${bw}" height="${h}" rx="3" fill="${w}" data-tip="${x.tip}"/>`
        + `<text x="${cx}" y="${B - h - 4}" text-anchor="middle" font-size="10.5" fill="currentColor">${x.txt ?? ""}</text><text x="${cx}" y="${tinggi - 8}" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".75">${x.n}</text></g>`; }).join("")}</svg>`;
  }
  const IK = d => `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-right:4px">${d}</svg>`;
  const EY = {status: IK('<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18v.01"/>') + "Status", nowcast: IK('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>') + "Nowcast", mutu: IK('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>') + "Mutu label", musim: IK('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>') + "Musim"};
  function status() {
    if (!S.st?.kec) return Kartu.kartu(EY.status, "Status longsor kecamatan", '<p style="margin:0">Memuat status longsor…</p>', "");
    const kec = S.st.kec, n = [0, 0, 0, 0], prov = {}, t = S.st.hari?.[S.hari], kapan = S.hari === 0 ? "hari ini" : (t ? tgl(t) : "hari yang dipilih");
    for (const [k, v] of Object.entries(kec)) { const l = v.l?.[S.hari] || 0; n[l]++; if (l) { const p = k.split("|")[0]; (prov[p] ||= [0, 0, 0, 0])[l]++; } }
    const rows = Object.entries(prov).map(([p, a]) => ({n: namaProv(p), v: a[1] + a[2] + a[3], a})).sort((a, b) => b.v - a.v).slice(0, 10)
      .map(r => ({n: r.n, v: r.v, tip: `<b>${esc(r.n)}</b><br>Waspada: ${fmt(r.a[1])}<br>Siaga: ${fmt(r.a[2])}<br>Awas: ${fmt(r.a[3])}`}));
    const isi = (rows.length ? Kartu.hbar(rows, W) : `<p style="margin:0 0 10px">Tidak ada kecamatan berstatus longsor ${kapan}.</p>`);
    return Kartu.kartu(EY.status, "Status longsor kecamatan", isi + '<p style="margin:10px 0 0"><a href="/banjir/metode#metode-longsor" data-metode-longsor>Metode longsor</a></p>', "");
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
    const isi = vonis + nama + (riw.length ? batang(riw) : "");
    return Kartu.kartu(EY.nowcast, "Nowcast longsor", isi, "");
  }
  const riwayat = () => D.lb ? LogbookTren.kartu(D.lb, "longsor", "longsor", W) : "";
  function musim() {
    const kab = D.kal?.kab; if (!kab) return "";
    const s = Array(12).fill(0), n = Array(12).fill(0);
    for (const k of Object.values(kab)) { const p = k.longsor?.p; if (p) p.forEach((x, i) => { s[i] += x; n[i]++; }); }
    const v = s.map((t, i) => { const r = n[i] ? t / n[i] * 100 : 0; return {n: BULAN[i], v: r, txt: Math.round(r) + "%", tip: `<b>${BULAN[i]}</b><br>Rata-rata peluang ada kejadian longsor: ${f1(r)}% per kabupaten<br>${fmt(D.kal.n_tahun)} tahun penuh`}; });
    return Kartu.kartu(EY.musim, "Musim longsor", `<p style="margin:0 0 6px;font-size:12px;opacity:.75">Logbook Pusdalops BNPB, tahun penuh; rata-rata seluruh kabupaten, bukan prakiraan hari ini.</p>` + batang(v), "");
  }
  /* KI-16: mutu label kejadian per kabupaten (label_mutu/longsor.json); berkas tak ada = kartu tak tampil. Ambang BAWAAN SEMENTARA tertulis di berkas */
  const ALASAN = [[/^cakupan/, "Cakupan sumber di bawah batas bulan"], [/^persistensi/, "Persistensi tidak lebih baik dari kebiasaan kabupaten dan bulan"]];
  const alasan = k => (ALASAN.find(([r]) => r.test(k)) || [])[1] || k.replace(/#/g, "…");
  function mutu() {
    const M = D.mut, r = M?.ringkas; if (!r || r.kab_dinilai == null) return "";
    const th = (t, tip) => `<th title="${esc(tip)}">${t}</th>`, td = (a, b) => `<tr><td>${esc(a)}</td><td>${fmt(b)}</td></tr>`;
    const al = Object.entries(r.alasan_tak_layak || {}).sort((a, b) => b[1] - a[1]);
    const isi = `<table class="ex-tabel"><thead><tr>${th("Ukuran", "Dihitung dari label kejadian longsor (logbook Pusdalops dan DIBI) per kabupaten dan kota")}${th("Jumlah kabupaten dan kota", "Satu kabupaten dihitung sekali; satu kabupaten bisa punya lebih dari satu alasan tidak layak, jadi jumlah alasan bisa melebihi yang tak layak")}</tr></thead><tbody>${td("Dinilai", r.kab_dinilai)}${td("Layak", r.kab_layak)}${al.map(([k, v]) => td("Tidak layak: " + alasan(k), v)).join("")}</tbody></table>`
      + `<p style="margin:8px 0 0;font-size:12px;opacity:.75">Ambang: ${esc(M.ambang?.status || "tanpa keterangan")}.</p>`;
    return Kartu.kartu(EY.mutu, "Mutu label kejadian", isi, "");
  }
  return {
    async render() {
      const el = $("#longsor"); if (!el) return;
      const k = (S.st?.hari?.[0] || "") + "|" + S.hari + "|" + (S.st ? 1 : 0);
      if (k === kunci && el.dataset.siap) return;   /* data dan hari sama: jangan gambar ulang */
      kunci = k; el.dataset.siap = "1";
      el.innerHTML = status() + '<div id="lsNow"><p style="margin:12px 0">Memuat nowcast longsor…</p></div><div id="lsLain"></div>';
      /* tautan ke bagian Metode longsor di tab Metode (tab dirender sekali; ke() menunggu render selesai) */
      el.onclick = e => { const t = e.target.closest("[data-metode-longsor]"); if (!t) return; e.preventDefault(); bukaTab("metode"); Metode.render(); Metode.ke("metode-longsor");
        history.replaceState(null, "", "/banjir/metode#metode-longsor"); };
      await muat();
      if (kunci !== k) return;
      $("#lsLain").innerHTML = riwayat() + musim() + mutu();
      const n = await nowcast(); if (kunci === k) $("#lsNow").innerHTML = n;
    },
  };
})();
