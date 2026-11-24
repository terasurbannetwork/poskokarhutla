/* pembanding.js — tiket PKH-24, 28, 29, 30, 16 dan pop-up insiden (PKH-08, 09, 10, 11) dari TIKET pembanding pantaukarhutla.
   1. Laci cluster: bagian "Insiden api" (nama desa + kab, kota terdekat, riwayat petak, tingkat bukti, laju muncul lagi, skala galat garis asap).
   2. Ringkasan (kartu Titik panas 24 jam): tiga angka setara (kita, setara SiPongi, tinggi saja, angka resmi SiPongi).
   3. Insight: kartu Asia Tenggara, Petak api per tahun, Prospek musim.
   Angka dibaca apa adanya dari public/data (dihitung pipeline); berkas hilang atau gagal = "tidak ada data", bukan 0.
   Skrip klasik dimuat SETELAH skrip utama dan citra.js. Global halaman: S, Laci, Insight, $, esc, fmt, rb, muatJSON. */
(() => {
  "use strict";
  const TIDAK = "Tidak ada data";
  const V = {}, P = {};   /* V = isi berkas (null = gagal), P = janji unduhan; satu unduhan per berkas */
  const ambil = u => fetch(u, {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null);
  const mulai = u => P[u] ||= ambil(u).then(d => { if (d == null) delete P[u]; else V[u] = d; return d; });   /* gagal: tidak disimpan, dicoba lagi pada pemakaian berikut */
  /* true bila semua berkas sudah tiba; kalau belum, kartu menggambar ulang dirinya setelah tiba */
  const MENUNGGU = new Set();   /* satu penggambaran ulang per kartu */
  const siap = (id, urls) => {
    if (urls.every(u => u in V)) return true;
    if (MENUNGGU.has(id)) return false;
    MENUNGGU.add(id);
    Promise.all(urls.map(mulai)).then(() => { MENUNGGU.delete(id); nanti(() => document.querySelectorAll(`[data-ex="${id}"]`).forEach(b => { b.innerHTML = Insight.gambar(id); })); });
    return false;
  };
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = s => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return d ? `${d} ${BLN[m - 1]} ${y}` : TIDAK.toLowerCase(); };
  const dec = (v, d = 2, tanda = false) => v == null || isNaN(v) ? "–" : (tanda && v > 0 ? "+" : "") + Number(v).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
  const pct = v => v == null ? "–" : Math.round(v * 100) + "%";

  /* ============================================================ 1. laci cluster: insiden */
  const IK_INSIDEN = '<path d="M12 3c1.5 3.3 5 5.3 5 9.6a5 5 0 0 1-10 0c0-2 .9-3.5 2.2-4.7.2 1.7 1.2 2.7 2.2 3C10.6 8.3 11.2 5.6 12 3Z"/>';
  const DEF_BUKTI = "Kuat bila dua lintasan atau lebih (dari dua satelit berbeda atau berselang 6 jam ke atas), dua piksel atau lebih dalam satu lintasan, ada deteksi malam, atau ada piksel keyakinan tinggi. Selain itu tunggal. Kuat tidak turun lagi.";
  const baris = (k, v, tip = "") => `<tr><td${tip ? ` title="${esc(tip)}"` : ""}>${k}</td><td class="n">${v}</td></tr>`;

  function lencana(b) {
    const t = b?.tingkat;
    if (!t) return `<span class="pk-bukti" title="${esc(DEF_BUKTI)}">Bukti: ${TIDAK.toLowerCase()}</span>`;
    const rinci = `${fmt(b.lintasan)} lintasan, ${fmt(b.piksel_maks)} piksel terbanyak per lintasan, deteksi malam ${b.malam ? "ada" : "tidak ada"}. ${DEF_BUKTI}`;
    return `<span class="pk-bukti pk-${t}" title="${esc(rinci)}">Bukti ${t}</span>`;
  }
  function pernah(r) {
    const a = r.riwayat_api; if (!a) return TIDAK;
    const th = Object.entries(a.tahun || {}).sort((x, y) => y[1] - x[1])[0];
    return `${fmt(a.pernah_pct)}% dari ${fmt(a.n_petak)} petak${th ? `, tahun terbanyak ${esc(th[0])} (${fmt(th[1])}%)` : ""}`;
  }
  function munculLagi(r, d) {
    const ml = d.muncul_lagi, g = ml?.laju_pct?.gambut?.["3_7"], b = ml?.laju_pct?.bukan_gambut?.["3_7"];
    if (g == null || b == null) return `<p class="fnd">Laju muncul lagi: ${TIDAK.toLowerCase()}.</p>`;
    const tip = `${ml.definisi} Data ${ml.data}; ${fmt(ml.n.gambut["3_7"])} pengamatan di gambut, ${fmt(ml.n.bukan_gambut["3_7"])} bukan gambut.`;
    return `<p class="pk-lagi" title="${esc(tip)}"><b>Tak terlihat belum tentu padam.</b> Tiga hari tanpa deteksi, lalu api muncul lagi dalam tujuh hari pada ${r.gambut ? `<b>${fmt(g)}%</b>` : fmt(g) + "%"} pengamatan di gambut dan ${r.gambut ? fmt(b) + "%" : `<b>${fmt(b)}%</b>`} di lahan bukan gambut (data ${esc(ml.data.replace(/\d{4}-\d\d-\d\d/g, tgl))}). Cluster ini di ${r.gambut ? "gambut" : "lahan bukan gambut"}.</p>`;
  }
  /* PKH-16: skala galat garis asap, hanya bila uji menyatakan prakiraan lebih baik dari angin tetap; berlabel skala hasil uji */
  function galatAsap(id, uji, lin) {
    if (!uji || uji.hasil?.vonis !== "prakiraan_lebih_baik_dari_angin_tetap" || !(lin?.kompleks || []).some(k => k.id === id)) return "";
    const h = uji.hasil, a = h.prakiraan?.galat_24j_km?.median, b = h.angin_tetap?.galat_24j_km?.median;
    if (a == null) return "";
    const tip = `Uji ${tgl(uji.periode_jalan?.[0])} sampai ${tgl(uji.periode_jalan?.[1])}, ${fmt(h.n)} garis dari ${fmt(h.n_hari_jalan)} hari, kebenaran ${uji.kebenaran}. ${uji.catatan || ""}`;
    return `<p class="pk-galat" title="${esc(tip)}">Garis asap cluster ini ada di halaman udara. Skala hasil uji, bukan galat jalur ini: median ${fmt(a)} km di ujung 24 jam${b == null ? "" : `, angin dianggap tetap ${fmt(b)} km`}.</p>`;
  }
  function insidenIsi(id, r, d, uji, lin) {
    const kota = r.kota_terdekat ? `${esc(r.kota_terdekat.nama)}, ${fmt(r.kota_terdekat.jarak_km)} km` : TIDAK;
    const tak = r.status === "tak_terdeteksi";
    return `<div class="pk-kepala"><b translate="no">${esc(r.nama || TIDAK)}</b>${lencana(r.bukti)}</div>
      <table class="tb2"><tbody>${baris("Kota terdekat", kota, "Pusat kabupaten atau kota terdekat dari pusat insiden")}
      ${baris("Pernah ada api terdeteksi", pernah(r), "Persen petak 375 m titik panas 48 jam yang pernah punya deteksi api VIIRS S-NPP 2012 sampai 2025 (keyakinan nominal atau tinggi, vegetasi). Hitungan piksel, bukan luas terbakar; batas bawah.")}
      ${baris("Status", tak ? `Tak terlihat sejak ${esc(tgl(r.tak_terdeteksi))}` : r.status === "aktif" ? "Terlihat satelit" : esc(r.status || TIDAK))}</tbody></table>
      ${tak ? munculLagi(r, d) : ""}${galatAsap(id, uji, lin)}`;
  }
  /* peta kompleksId -> insiden, dibangun sekali per berkas insiden.json */
  let PETA = null, DARI = null;
  const petaInsiden = d => {
    if (PETA && DARI === d) return PETA;
    PETA = new Map(); DARI = d;
    for (const r of Object.values(d?.insiden || {})) for (const k of r.kompleks || []) { const l = PETA.get(k); if (!l || (r.status === "aktif" && l.status !== "aktif")) PETA.set(k, r); }
    return PETA;
  };
  const insidenHtml = (id, r, d, uji, lin) => r ? insidenIsi(id, r, d, uji, lin) : `<p class="fnd">${TIDAK} insiden untuk cluster ini (hanya cluster tingkat 2 ke atas didaftar sebagai insiden).</p>`;
  nanti(() => mulai("data/insiden.json"));   /* unduh senyap sesudah halaman tenang, supaya klik cluster pertama tidak menunggu */
  const _buka = Laci.buka.bind(Laci);
  Laci.buka = function (id) { _buka(id); tambahLaci(id); };
  async function tambahLaci(id) {
    const d = await mulai("data/insiden.json"), r = petaInsiden(d).get(id);
    const [uji, lin] = r ? await Promise.all([mulai("/udara/data/uji_lintasan.json"), mulai("/udara/data/lintasan.json")]) : [];
    if (S.pilihK !== id || $("#laci .pk-laci")) return;
    const html = `<details class="lipat pk-laci" open><summary>Insiden api</summary><div class="isi">${insidenHtml(id, r, d, uji, lin)}</div></details>`;
    nanti(() => {
      if (S.pilihK !== id || $("#laci .pk-laci")) return;
      const api = [...document.querySelectorAll("#laci details.lipat")].find(x => x.querySelector("summary")?.textContent.startsWith("Api saat ini"));
      api ? api.insertAdjacentHTML("afterend", html) : $("#laci .bd")?.insertAdjacentHTML("afterbegin", html);
    });
  }

  /* ============================================================ 2. PKH-24: titik panas 24 jam setara (kartu "Titik panas 24 jam" di Ringkasan; ringkasan.js memanggil PKH.setara()) */
  const setaraIsi = t => {
    if (!t) return `<span>${TIDAK}</span>`;
    const sp = t.sipongi_resmi, sel = (v, l, tp) => `<div title="${esc(tp)}"><b>${v == null ? "–" : fmt(v)}</b><small>${l}</small></div>`;
    return `<div class="pk-tiga" title="${esc(t.keterangan || "")}">${sel(t.kita, "hitungan kita", "Lokasi unik 375 m, semua satelit dan keyakinan, sumber panas tetap dibuang")}${sel(t.setara_sipongi, "setara SiPongi", "Hitungan kita memakai aturan SiPongi")}${sel(t.tinggi_saja, "keyakinan tinggi", "Hanya titik berkeyakinan tinggi")}</div>
      <span title="${esc(t.keterangan || "")}">${sp ? `SiPongi resmi 24 jam: ${fmt(sp.semua)} titik, ${fmt(sp.tinggi)} berkeyakinan tinggi` : `SiPongi resmi 24 jam: ${TIDAK.toLowerCase()}`}</span>`;
  };
  window.PKH = {
    setara() {
      const u = "data/titik_setara.json";
      if (u in V) return `<div class="pk-setara">${setaraIsi(V[u])}</div>`;
      mulai(u).then(t => document.querySelectorAll("[data-pk-setara]").forEach(e => { e.innerHTML = setaraIsi(t); }));
      return `<div class="pk-setara" data-pk-setara></div>`;
    },
  };

  /* ============================================================ 3. kartu Insight */
  if (typeof Insight === "undefined" || !Array.isArray(Insight.EX)) return;
  const IK = {
    asean: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    petak: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    musim: '<path d="M7 18a4 4 0 1 1 .9-7.9A5.5 5.5 0 0 1 18.5 11 3.5 3.5 0 0 1 18 18H7Z"/>',
  };
  const kartu = (nama, ikon, isi, tip = "") => `<article class="ex ex-std pk-kartu"><header class="ex-hd"><span class="ex-ey"></span><div class="ex-jd"><h3${tip ? ` title="${esc(tip)}"` : ""}><svg class="pk-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ikon}</svg>${nama}</h3></div></header><div class="ex-bd">${isi}</div></article>`;
  const kosong = (nama, ikon) => kartu(nama, ikon, `<p class="fnd">${TIDAK}.</p>`);
  const memuat = (nama, ikon) => kartu(nama, ikon, `<p class="fnd">Memuat data…</p>`);
  const th = (t, tip = "") => `<th${tip ? ` title="${esc(tip)}"` : ""}>${t}</th>`;
  Object.assign(Insight.st, {pkhA: "tahun", pkhATh: "", pkhP: "", pkhM: ""});
  Object.assign(Insight.LABEL, {pkhAsean: "Asia Tenggara", pkhPetak: "Petak api", pkhMusim: "Prospek musim"});
  const i0 = Insight.EX.indexOf("paparan");
  Insight.EX.splice(i0 < 0 ? Insight.EX.length : i0, 0, "pkhAsean", "pkhPetak", "pkhMusim");

  /* ---- PKH-28: Indonesia dan Asia Tenggara ---- */
  Insight.exPkhAsean = function () {
    const U = "data/asean_titik.json", NAMA = "Indonesia dan Asia Tenggara";
    if (!siap("pkhAsean", [U])) return memuat(NAMA, IK.asean);
    const A = V[U]; if (!A?.negara?.length) return kosong(NAMA, IK.asean);
    const mode = this.st.pkhA, tahun = A.tahun.map(String), y = tahun.includes(String(this.st.pkhATh)) ? String(this.st.pkhATh) : tahun[tahun.length - 1];
    const tujuh = mode === "tujuh", per = mode === "per1000";
    const nilai = n => {
      if (tujuh) return n.tujuh_hari ?? null;
      const t = n.tahunan?.[y]?.titik; if (t == null) return null;
      return per ? (n.luas_km2 ? t / n.luas_km2 * 1000 : null) : t;
    };
    const ada = A.negara.map(n => ({n, v: nilai(n)}));
    const urut = [...ada.filter(x => x.n.peringkat && x.v != null).sort((a, b) => b.v - a.v), ...ada.filter(x => !x.n.peringkat && x.v != null), ...ada.filter(x => x.v == null)];
    const mx = Math.max(1, ...urut.map(x => x.v || 0));
    const ctl = `<div class="pk-ctl">${this.seg("pkhA", [["tahun", "Per tahun"], ["per1000", "Per 1.000 km²"], ["tujuh", "7 hari"]])}${tujuh ? "" : `<select data-set="pkhATh" aria-label="Tahun">${[...tahun].reverse().map(t => `<option value="${t}"${t === y ? " selected" : ""}>${t}</option>`).join("")}</select>`}</div>`;
    const tip = [per ? A.metode?.per1000 : tujuh ? A.metode?.tujuh_hari : A.metode?.riwayat, A.metode?.catatan].filter(Boolean).join(". ");
    if (tujuh && !A.tujuh_hari_tersedia) return kartu(NAMA, IK.asean, `${ctl}<p class="fnd" title="${esc(A.tujuh_hari_catatan || "")}">${TIDAK}: data tujuh hari belum tersedia.</p>`, tip);
    const j = A.tujuh_hari_jendela, ak = Array.isArray(j) ? j[j.length - 1] : j, akhir = tujuh && ak ? (/^\d{4}-\d\d-\d\d/.test(ak) ? tgl(ak) : esc(String(ak))) : "";
    let no = 0;
    const tr = urut.map(({n, v}) => { const rank = n.peringkat && v != null ? ++no : "–", s = n.tahunan?.[y]?.sel;
      const tp = v == null ? `<b>${esc(n.nama)}</b><br>${TIDAK}` : `<b>${esc(n.nama)}</b><br>${fmt(v)}${per ? " titik per 1.000 km²" : " titik"}${!tujuh && s != null ? `<br>${fmt(s)} sel unik 375 m` : ""}${n.peringkat ? "" : "<br>tidak diperingkat"}`;
      return `<tr class="${n.iso3 === "IDN" ? "pk-idn" : ""}"><td class="n">${rank}</td><td translate="no">${esc(n.nama)}${n.peringkat ? "" : ' <small>(tidak diperingkat)</small>'}</td><td class="n">${v == null ? TIDAK.toLowerCase() : per ? dec(v, 1) : fmt(Math.round(v))}</td><td><span class="pk-bar" data-tip="${esc(tp)}" tabindex="0"><i style="width:${v == null ? 0 : (v / mx * 100).toFixed(1)}%"></i></span></td></tr>`; }).join("");
    return kartu(NAMA, IK.asean, `${ctl}<div class="tw ex-tabel pk-tabel"><table><thead><tr>${th("Peringkat")}${th("Negara")}${th(per ? "Titik per 1.000 km²" : tujuh ? `7 hari${akhir ? " s.d. " + akhir : ""}` : "Titik panas", tip)}${th("")}</tr></thead><tbody>${tr}</tbody></table></div>`, tip);
  };

  /* ---- PKH-29: petak api per tahun ---- */
  Insight.exPkhPetak = function () {
    const U = "data/petak_tahun.json", NAMA = "Petak api per tahun";
    if (!siap("pkhPetak", [U])) return memuat(NAMA, IK.petak);
    const p = V[U]; if (!p?.nasional) return kosong(NAMA, IK.petak);
    const pil = this.st.pkhP || "", [jenis, kunci] = pil.split(":");
    const seri = jenis === "g" && p.gugus?.[kunci] ? p.gugus[kunci] : jenis === "p" && p.prov?.[kunci] ? p.prov[kunci] : null;
    const data = seri ? seri.tahun : p.nasional, bagian = jenis === "p" && seri ? seri.bagian_persen : null;
    const nm = seri ? (jenis === "p" ? seri.nama : kunci) : "Indonesia";
    const ys = p.tahun.map(String), W = 940, H = 250, L = 8, T = 30, B = 26, bw = (W - L * 2) / ys.length, mx = Math.max(1, ...ys.map(t => data[t] || 0));
    const bar = ys.map((t, j) => { const v = data[t], ini = +t === p.tahun_berjalan, x = L + j * bw, h = v == null ? 0 : Math.max(1, v / mx * (H - T - B)), y0 = H - B - h;
      const tp = v == null ? `<b>${t}</b><br>${TIDAK}` : `<b>${t}</b>${ini ? ` (sampai ${tgl(p.sd)})` : ""}<br>${fmt(v)} petak 375 m per tahun${bagian?.[t] != null ? `<br>${fmt(bagian[t])}% dari petak nasional` : ""}`;
      return `<g data-tip="${esc(tp)}"><rect x="${x.toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="${H - B}" class="pk-hit"/>${v == null ? "" : `<rect class="pk-b${ini ? " ini" : ""}" x="${(x + bw * .14).toFixed(1)}" y="${y0.toFixed(1)}" width="${(bw * .72).toFixed(1)}" height="${h.toFixed(1)}" rx="3"/><text class="pk-v" x="${(x + bw / 2).toFixed(1)}" y="${(y0 - 5).toFixed(1)}" text-anchor="middle">${rb(v)}</text>`}<text class="pk-t${ini ? " ini" : ""}" x="${(x + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${t}</text></g>`; }).join("");
    const opsi = `<option value="">Indonesia</option><optgroup label="Gugus pulau">${Object.keys(p.gugus || {}).map(g => `<option value="g:${esc(g)}"${pil === "g:" + g ? " selected" : ""}>${esc(g)}</option>`).join("")}</optgroup><optgroup label="Provinsi">${Object.entries(p.prov || {}).sort((a, b) => a[1].nama.localeCompare(b[1].nama)).map(([k, o]) => `<option value="p:${k}"${pil === "p:" + k ? " selected" : ""}>${esc(o.nama)}</option>`).join("")}</optgroup>`;
    return kartu(NAMA, IK.petak, `<div class="pk-ctl"><select data-set="pkhP" aria-label="Wilayah">${opsi}</select></div><svg class="pk-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Petak api per tahun (petak 375 m), ${esc(nm)}">${bar}</svg>`, `${p.definisi} ${p.sumber}`);
  };

  /* ---- PKH-30: prospek musim ---- */
  Insight.exPkhMusim = function () {
    const U = "data/prospek_musim.json", NAMA = "Prospek musim";
    if (!siap("pkhMusim", [U])) return memuat(NAMA, IK.musim);
    const m = V[U]; if (!m?.titik?.length) return kosong(NAMA, IK.musim);
    const e = m.enso || {}, oni = (e.oni || []).at(-1), n34 = (e.nino34_mingguan || []).at(-1), iod = (e.iod_mingguan || []).at(-1);
    const kv = (b, s, tp) => `<div title="${esc(tp)}"><b>${b}</b><span>${s}</span></div>`;
    const kvs = `<div class="kv">${kv(oni ? dec(oni.nilai, 2, true) : "–", oni ? `ONI ${oni.musim} ${oni.tahun}${e.fase_oni ? `, ${esc(e.fase_oni)}` : ""}` : `ONI, ${TIDAK.toLowerCase()}`, m.sumber?.oni || "")}${kv(n34 ? dec(n34.nino34, 1, true) : "–", n34 ? `Niño 3.4, minggu ${tgl(n34.minggu)}` : `Niño 3.4, ${TIDAK.toLowerCase()}`, m.sumber?.nino34 || "")}${kv(iod ? dec(iod.iod, 2, true) : "–", iod ? `IOD, sampai ${tgl(iod.akhir_minggu)}` : `IOD, ${TIDAK.toLowerCase()}`, m.sumber?.iod || "")}</div>`;
    const tip = `Peluang rata-rata hujan di bawah ${fmt(m.ambang_mm_hari)} mm per hari, dari ${fmt(m.titik[0].anggota)} anggota ansambel musiman (${m.sumber?.ansambel || ""}). Uji aturan ${m.uji?.periode?.[0]} sampai ${m.uji?.periode?.[1]}: ${m.uji?.metode || ""} ${m.uji?.batas || ""}`;
    const lemah = m.uji?.aturan_lemah || "";
    const tr = m.titik.map(t => { const u = t.uji;
      return `<tr><td translate="no">${esc(t.provinsi)}</td><td class="n">${pct(t.kering30)}</td><td class="n">${pct(t.kering60)}</td><td class="n" title="Peluang jendela besar saat kering lawan peluang dasarnya, uji ${esc(String(m.uji?.periode?.[0]))} sampai ${esc(String(m.uji?.periode?.[1]))}">${u ? `${pct(u.peluang_besar_saat_kering)} lawan ${pct(u.peluang_besar_dasar)}` : TIDAK.toLowerCase()}</td><td class="n">${t.aturan_lemah ? `<span class="pk-lemah" title="${esc(lemah)}${u ? ` Lift ${dec(u.lift, 2)}.` : ""}">aturan lemah di sini</span>` : ""}</td></tr>`; }).join("");
    return kartu(NAMA, IK.musim, `${kvs}<div class="tw ex-tabel pk-tabel"><table><thead><tr>${th("Titik")}${th("Kering 30 hari", `Peluang hujan rata-rata di bawah ${fmt(m.ambang_mm_hari)} mm per hari selama 30 hari`)}${th("Kering 60 hari", `Peluang hujan rata-rata di bawah ${fmt(m.ambang_mm_hari)} mm per hari selama 60 hari`)}${th("Uji aturan", "Peluang jendela deteksi besar (10 persen teratas) saat kering, lawan peluang dasarnya")}${th("")}</tr></thead><tbody>${tr}</tbody></table></div><p class="pk-cat">${esc(m.catatan || "")}</p>`, tip);
  };
})();
