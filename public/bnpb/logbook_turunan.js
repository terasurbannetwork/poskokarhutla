/* Turunan logbook di /bnpb/logbook: jam rawan, pihak terlibat, desa langganan (data publik /data/bnpb/*), rapor BPBD dan rekomendasi berulang (rute staf /api/logbook/turunan/:nama).
   Kontrak: docs/superpowers/specs/2026-11-01-logbook-turunan.md. Angka pipeline tidak dihitung ulang kecuali penjumlahan tampilan. Teks data lewat textContent (CSP).
   Kontrol pilihan bereaksi seketika; isi berat digambar lewat nanti() (/inti/nanti.js). */
(() => {
  "use strict";
  const {PROV, ikon, h, F, label, namaJenis, urutJenis, BLN, muat, kunciKab, tutup} = window.Wilayah;
  const lanjutNanti = fn => (window.nanti || (f => setTimeout(f, 0)))(fn);
  const cache = new Map();
  const ambil = u => cache.get(u) || cache.set(u, fetch(u).then(async r => r.ok ? {ok: true, j: await r.json()} : {ok: false, s: r.status}).catch(() => ({ok: false, s: 0}))
    .then(x => { if (!x.ok) cache.delete(u); return x; })).get(u);
  /* replaceChildren bawaan menulis 'null' dan '[object ...]' untuk null/larik */
  const put = (el, ...a) => el.replaceChildren(...a.flat().filter(x => x != null && x !== false));
  const kosong = (ik, teks) => h("div", {class: "lb-kosong"}, ikon(ik), h("span", {teks}));
  const pil = (teks, ton, ik) => h("span", {class: "bn-pil lb-t-" + ton}, ikon(ik), teks);
  const kaki = t => h("p", {class: "lb-p lb-kaki", teks: t});
  const pct = (a, b) => b ? `${F(Math.round(1000 * a / b) / 10)}%` : "–";
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const tip = (judul, ...baris) => `<b>${esc(judul)}</b><br>${baris.map(esc).join("<br>")}`;
  const NS = "http://www.w3.org/2000/svg";
  const nJ = namaJenis;
  const TOPIK = {normalisasi_sungai: "Normalisasi sungai", tanggul: "Tanggul dan penahan", relokasi: "Relokasi dan hunian", jalur_evakuasi: "Jalur evakuasi", peringatan_dini: "Peringatan dini", sosialisasi: "Sosialisasi dan edukasi", alat_berat: "Alat berat",
    drainase: "Drainase", imbauan_kewaspadaan: "Imbauan kewaspadaan", logistik: "Logistik", patroli_karhutla: "Patroli karhutla", perbaikan_jalan_jembatan: "Perbaikan jalan dan jembatan", reboisasi_konservasi: "Reboisasi dan konservasi", sekat_kanal_embung: "Sekat kanal dan embung", status_darurat: "Status darurat"};
  const thRingkas = (a = []) => { const t = a.map(Number).sort((x, y) => x - y), o = []; for (let i = 0; i < t.length;) { let j = i; while (t[j + 1] === t[j] + 1) j++; o.push(j > i ? `${t[i]}–${t[j]}` : `${t[i]}`); i = j + 1; } return o.length < 3 ? o.join(" dan ") : `${o.slice(0, -1).join(", ")}, dan ${o.at(-1)}`; };
  const namaKab = k => { const [p, n] = String(k).split("|"); return `${n}, ${PROV[p] || p}`; };

  /* deretan pilihan ujung ke ujung, berikon: pilihan [[nilai, teks, ikon]] */
  function deretan(nama, judul, pilihan, awal, saat) {
    const w = h("div", {class: "lb-seg", role: "radiogroup", "aria-label": judul});
    for (const [v, t, ik] of pilihan) { const i = h("input", {type: "radio", name: nama, value: v, checked: String(v) === String(awal)}); i.addEventListener("change", () => saat(v)); w.append(h("label", null, i, ikon(ik), t)); }
    return w;
  }
  const pilihan = (judul, opsi, awal, saat) => { const s = h("select", {"aria-label": judul}, opsi.map(([v, t]) => h("option", {value: v, teks: t}))); s.value = awal; s.addEventListener("change", () => saat(s.value)); return s; };
  const bungkus = (judul, el) => h("label", {class: "bn-isian"}, judul, el);

  /* provinsi + kab/kota; "" = seluruh Indonesia atau seluruh provinsi. saat({prov, kab}) */
  async function wilayah(saat, {semuaTeks = "Seluruh Indonesia", wajibProv = false, awalProv = ""} = {}) {
    const W = await muat(), st = {prov: awalProv, kab: ""};
    const sP = h("select", {"aria-label": "Provinsi"}), sK = h("select", {"aria-label": "Kabupaten/kota"});
    const isiP = () => sP.replaceChildren(...(wajibProv ? [] : [h("option", {value: "", teks: semuaTeks})]), ...[...new Set(W.kab.map(k => k.prov))].sort().map(p => h("option", {value: p, teks: PROV[p] || p})));
    const isiK = () => sK.replaceChildren(h("option", {value: "", teks: st.prov ? "Seluruh provinsi" : "Pilih provinsi dulu"}), ...W.kab.filter(k => k.prov === st.prov).sort((a, b) => a.nama.localeCompare(b.nama, "id")).map(k => h("option", {value: kunciKab(k), teks: tutup(k.nama)})));
    isiP(); sP.value = st.prov; isiK(); sK.disabled = !st.prov;
    sP.addEventListener("change", () => { st.prov = sP.value; st.kab = ""; isiK(); sK.disabled = !st.prov; saat({...st}); });
    sK.addEventListener("change", () => { st.kab = sK.value; saat({...st}); });
    return {st, node: h("div", {class: "bn-baris"}, bungkus("Provinsi", sP), bungkus("Kabupaten/kota", sK))};
  }
  /* kunci kab dalam provinsi, untuk menjumlah per provinsi */
  const kabDiProv = (obj, p) => Object.keys(obj || {}).filter(k => k.startsWith(p + "|"));

  const panel = {};

  /* ---------- jam rawan ---------- */
  panel.jam = async (kotak) => {
    const r = await ambil("/data/bnpb/logbook_jam.json");
    if (!r.ok) return put(kotak, kosong("peringatan", "Data jam kejadian belum terbit (logbook_jam.json)."));
    const D = r.j, js = Object.keys(D.jenis).filter(j => (D.jenis[j].terbuang?.terpakai || 0) > 0).sort(urutJenis);
    let jenis = js.includes("banjir") ? "banjir" : js[0], prov = "";
    const isi = h("div"), gambar = () => {
      const d = D.jenis[jenis], a = prov ? d.prov?.[prov] : d.nasional, tot = (a || []).reduce((x, y) => x + y, 0);
      if (!a || !tot) return put(isi, kosong("tunggu", `Belum ada kejadian ${nJ(jenis).toLowerCase()} berjam di ${prov ? PROV[prov] : "Indonesia"}.`));
      const mx = Math.max(...a), urut = [...a.keys()].sort((x, y) => a[y] - a[x]), top = new Set(urut.slice(0, 3)), W = 24 * 40, svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} 150`); svg.setAttribute("class", "lb-svg"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", `Kejadian ${nJ(jenis)} menurut jam`);
      const ln = document.createElementNS(NS, "line"); ln.setAttribute("class", "dasar"); ln.setAttribute("x1", 0); ln.setAttribute("x2", W); ln.setAttribute("y1", 120); ln.setAttribute("y2", 120); svg.append(ln);
      a.forEach((n, i) => {
        const g = document.createElementNS(NS, "g"), hh = Math.max(n ? 3 : 0, 108 * n / mx), r = document.createElementNS(NS, "rect"), t = document.createElementNS(NS, "text"), z = String(i).padStart(2, "0");
        g.setAttribute("data-tip", tip(`Jam ${z}.00 sampai ${z}.59`, `Kejadian: ${F(n)}`, `Bagian: ${pct(n, tot)} dari ${F(tot)}`, i % 6 === 0 ? "Jam bulat, kadang isian bawaan petugas" : ""));
        r.setAttribute("class", "bat" + (top.has(i) ? " musim" : "")); r.setAttribute("x", i * 40 + 5); r.setAttribute("width", 30); r.setAttribute("y", 120 - hh); r.setAttribute("height", hh); r.setAttribute("rx", 3);
        const tc = document.createElementNS(NS, "rect"); tc.setAttribute("class", "tangkap"); tc.setAttribute("x", i * 40); tc.setAttribute("width", 40); tc.setAttribute("y", 0); tc.setAttribute("height", 140);
        t.setAttribute("x", i * 40 + 20); t.setAttribute("y", 138); t.textContent = z; g.append(tc, r, t); svg.append(g);
      });
      const tb = d.terbuang;
      put(isi, h("div", {class: "lb-ringkas"}, pil(`Puncak jam ${urut.slice(0, 3).sort((x, y) => x - y).map(x => String(x).padStart(2, "0")).join(", ")}`, "bahaya", "tunggu"), pil(`${F(tot)} kejadian berjam`, "info", "daftar"),
        pil(`${pct(urut.slice(0, 3).reduce((x, i) => x + a[i], 0), tot)} jatuh di tiga jam teratas`, "tunggu", "peringatan")), svg,
        kaki(`Jam menurut waktu setempat sesuai laporan, semua tahun arsip. ${F(tb.kosong)} kejadian tanpa jam dan ${F(tb.tak_terbaca)} dengan jam tak terbaca dibuang dari ${F(tb.n_kejadian)} kejadian ${nJ(jenis).toLowerCase()}. Batang merah = tiga jam teratas. Jam bulat (00, 12) bisa isian bawaan petugas, baca puncaknya dengan hati-hati. Ini jam laporan Pusdalops, bukan semua kejadian.`));
    };
    const sP = pilihan("Cakupan", [["", "Seluruh Indonesia"], ...Object.entries(PROV).filter(([p]) => Object.values(D.jenis).some(d => d.prov?.[p])).map(([p, t]) => [p, t])], "", v => { prov = v; lanjutNanti(gambar); });
    put(kotak, deretan("lbjenis", "Jenis kejadian", js.map(j => [j, nJ(j), j]), jenis, v => { jenis = v; lanjutNanti(gambar); }), bungkus("Cakupan", sP), isi);
    gambar();
  };

  /* ---------- pihak terlibat ---------- */
  panel.terlibat = async (kotak) => {
    const r = await ambil("/data/bnpb/logbook_terlibat.json");
    if (!r.ok) return put(kotak, kosong("peringatan", "Data pihak terlibat belum terbit (logbook_terlibat.json)."));
    const D = r.j, js = Object.keys(D.jenis).filter(j => D.jenis[j].n_kejadian_berisi > 0).sort(urutJenis);
    let jenis = js.includes("banjir") ? "banjir" : js[0], w = {prov: "", kab: ""};
    const isi = h("div"), MIN = 5;
    const gambar = () => {
      const d = D.jenis[jenis]; let n, k;
      if (w.kab) { const e = d.kab[w.kab]; n = e?.n || 0; k = e?.k || {}; }
      else if (w.prov) { n = 0; k = {}; for (const kk of kabDiProv(d.kab, w.prov)) { n += d.kab[kk].n; for (const [p, v] of Object.entries(d.kab[kk].k)) k[p] = (k[p] || 0) + v; } }
      else { n = d.n_kejadian_berisi; k = d.nasional; }
      const lingkup = w.kab ? namaKab(w.kab) : w.prov ? PROV[w.prov] : "Indonesia";
      if (n < MIN) return put(isi, kosong("tunggu", `Hanya ${F(n)} kejadian ${nJ(jenis).toLowerCase()} berpihak tercatat di ${lingkup}, kurang dari ${MIN}, jadi persentasenya tidak ditampilkan.`));
      const rows = Object.entries(k).filter(([p]) => p !== "BPBD").sort((a, b) => b[1] - a[1]), tb = h("tbody");
      for (const [p, v] of rows) tb.append(h("tr", null, h("td", {teks: p}), h("td", {class: "n", teks: F(v)}), h("td", {class: "n"}, h("meter", {min: 0, max: 100, value: 100 * v / n, title: pct(v, n)}), " ", pct(v, n))));
      put(isi, h("div", {class: "lb-ringkas"}, pil(`${F(n)} kejadian ${nJ(jenis).toLowerCase()} di ${lingkup}`, "info", "daftar"), rows[0] ? pil(`Terbanyak selain BPBD: ${rows[0][0]}, ${pct(rows[0][1], n)}`, "tunggu", "personel") : null),
        rows.length ? h("div", {class: "lb-tabel-bungkus"}, h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, ["Pihak lain yang terlibat", "Kejadian", "Bagian dari kejadian"].map(t => h("th", {teks: t})))), tb)) : kosong("tunggu", "Tidak ada pihak lain yang tercatat."),
        kaki(`BPBD tidak ditampilkan sebagai temuan: hampir semua kejadian dilaporkan oleh BPBD (${F(k.BPBD || 0)} dari ${F(n)} di cakupan ini), jadi itu mencerminkan jalur pelaporan, bukan peran. Satu kejadian bisa melibatkan banyak pihak, jadi bagian tidak berjumlah 100%. ${w.prov && !w.kab ? "Angka provinsi = jumlah per kab/kota; kejadian lintas kab dihitung di tiap kab. " : ""}Pihak dari kolom terlibat, bila kosong dari sumber laporan; ${F(d.n_kejadian_berisi)} dari ${F(d.n_kejadian)} kejadian ${nJ(jenis).toLowerCase()} berisi. Sumber: logbook Pusdalops BNPB, tahun dasar ${thRingkas(D.tahun_dasar)}.`));
    };
    const wl = await wilayah(v => { w = v; lanjutNanti(gambar); });
    put(kotak, deretan("lbjenis", "Jenis kejadian", js.map(j => [j, nJ(j), j]), jenis, v => { jenis = v; lanjutNanti(gambar); }), wl.node, isi);
    gambar();
  };

  /* ---------- desa langganan ---------- */
  panel.desa = async (kotak) => {
    let prov = "33", ambang = 6, jenis = "", maks = 30, berkas = null;
    const isi = h("div"), baris = [];
    const gambar = () => {
      if (!berkas) return;
      if (!berkas.ok) return put(isi, kosong("pin", berkas.s === 404 ? `Belum ada desa langganan untuk ${PROV[prov]}: tidak ada desa dengan kejadian berulang cukup di arsip.` : "Berkas desa langganan belum bisa dimuat. Coba lagi."));
      const N = berkas.j.tahun_dasar.length, rows = [];
      for (const e of berkas.j.desa) for (const [j, x] of Object.entries(e.jenis)) if (x.t >= ambang && (!jenis || jenis === j)) rows.push({e, j, x});
      rows.sort((a, b) => b.x.t - a.x.t || b.x.n - a.x.n || a.e.desa.localeCompare(b.e.desa, "id"));
      if (!rows.length) return put(isi, kosong("pin", `Tidak ada desa dengan kejadian di ${F(ambang)} tahun atau lebih dari ${F(N)} tahun dasar di ${PROV[prov]}. Turunkan ambang.`));
      const tb = h("tbody");
      for (const {e, j, x} of rows.slice(0, maks)) tb.append(h("tr", null, h("td", {teks: e.desa}), h("td", {teks: e.kec || "–"}), h("td", {teks: namaKab(e.kab).split(",")[0]}), h("td", null, pil(nJ(j), "info", j)),
        h("td", {class: "n", teks: `${F(x.t)} dari ${F(N)}`}), h("td", {class: "n", teks: F(x.n)}), h("td", {teks: x.b.map((c, i) => c ? BLN[i].slice(0, 3) : "").filter(Boolean).join(", ") || "–"})));
      const lagi = rows.length > maks ? h("button", {class: "bn-tombol sekunder", type: "button"}, ikon("tambah"), `Tampilkan ${F(Math.min(30, rows.length - maks))} lagi`) : null;
      lagi?.addEventListener("click", () => { maks += 30; gambar(); });
      put(isi, h("div", {class: "lb-ringkas"}, pil(`${F(rows.length)} desa dan jenis kejadian di ${PROV[prov]}`, "info", "pin"), pil(`ada kejadian di ${F(ambang)} tahun atau lebih dari ${F(N)}`, "tunggu", "kalender")),
        h("div", {class: "lb-tabel-bungkus"}, h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, ["Desa/kelurahan", "Kecamatan", "Kab/kota", "Jenis", "Tahun ada kejadian", "Kejadian", "Bulan rawan"].map(t => h("th", {teks: t})))), tb)),
        h("p", {class: "lb-draf", teks: `${F(Math.min(maks, rows.length))} dari ${F(rows.length)}`}), lagi,
        kaki(`Satuan = kejadian di logbook Pusdalops, bukan semua kejadian: yang tak dilaporkan tidak ada. Ambang bawaan 6 dari 9 tahun dasar karena 9 dari 9 hampir tidak ada. Bulan rawan = bulan yang pernah ada kejadian di tahun dasar. Kecamatan kosong bila nama desa ambigu. Sumber: logbook Pusdalops BNPB, tahun dasar ${thRingkas(berkas.j.tahun_dasar)}.`));
    };
    const muatProv = async () => { put(isi, kosong("tunggu", "Memuat desa…")); berkas = null; const p = prov; const b = await ambil(`/data/bnpb/desa_langganan/${p}.json`); if (p !== prov) return; berkas = b; gambar(); };
    const sP = pilihan("Provinsi", Object.entries(PROV).map(([p, t]) => [p, t]), prov, v => { prov = v; maks = 30; lanjutNanti(muatProv); });
    const ang = deretan("lbambang", "Ambang tahun", [4, 5, 6, 7, 8, 9].map(a => [a, `${a} dari 9 tahun`, "kalender"]), ambang, v => { ambang = +v; maks = 30; lanjutNanti(gambar); });
    const sj = deretan("lbdesajenis", "Jenis kejadian", [["", "Semua jenis", "daftar"], ...["banjir", "longsor", "gelombang_pasang", "cuaca", "kekeringan", "karhutla", "kebakaran_permukiman"].map(j => [j, nJ(j), j])], jenis, v => { jenis = v; maks = 30; lanjutNanti(gambar); });
    put(kotak, bungkus("Provinsi", sP), ang, sj, isi);
    muatProv();
  };

  /* ---------- internal (rute staf) ---------- */
  const gagalStaf = (s) => kosong("akses", s === 401 || s === 403 ? "Bagian ini hanya untuk staf Pusdalops, Koordinator Pusdalops, dan Pimpinan. Masuk dengan akun staf." : s === 404 ? "Berkas turunan belum diunggah ke penyimpanan. Minta tim data mengunggahnya." : s === 503 ? "Penyimpanan belum tersambung." : "Belum bisa dimuat. Coba lagi.");

  panel.rapor = async (kotak) => {
    const r = await ambil("/api/logbook/turunan/rapor_bpbd");
    if (!r.ok) return put(kotak, gagalStaf(r.s));
    const D = r.j, MIN = D.min_n || 10, PER = [["dasar", `Tahun dasar (${(D.periode?.dasar || []).length} tahun)`], ...(D.periode?.terpisah || ["2024", "2025", "2026"]).map(p => [p, p])];
    const KOL = [["n", "Kejadian", s => s.n], ["jeda", "Jeda median (hari)", s => s.jeda_hari?.median], ["p75", "Jeda persentil 75 (hari)", s => s.jeda_hari?.p75], ["pantau", "Lama dipantau median (hari)", s => s.lama_pantau_hari?.median],
      ["sekali", "Dilaporkan sekali saja (%)", s => s.sekali_pct], ["kec", "Kecamatan terisi (%)", s => s.lengkap_pct?.kecamatan], ["desa", "Desa terisi (%)", s => s.lengkap_pct?.desa], ["kondisi", "Kondisi terisi (%)", s => s.lengkap_pct?.kondisi],
      ["upaya", "Upaya terisi (%)", s => s.lengkap_pct?.upaya], ["keb", "Kebutuhan terisi (%)", s => s.lengkap_pct?.kebutuhan], ["kend", "Kendala terisi (%)", s => s.lengkap_pct?.kendala]];
    let skala = "kab", per = "dasar", urut = "n", naik = false, prov = "", maks = 25;
    const isi = h("div");
    const gambar = () => {
      const sumber = D[skala] || {}, rows = []; let sembunyi = 0;
      for (const [k, per_] of Object.entries(sumber)) { const s = per_[per]; if (!s) continue; if (skala === "kab" && prov && !k.startsWith(prov + "|")) continue; if (!(s.n >= MIN)) { sembunyi++; continue; } rows.push({k, s}); }
      const nm = k => skala === "kab" ? namaKab(k) : (D.nama_prov?.[k] || PROV[k] || k), ko = KOL.find(x => x[0] === urut);
      rows.sort((a, b) => { if (urut === "nama") return nm(a.k).localeCompare(nm(b.k), "id") * (naik ? -1 : 1); const x = ko[2](a.s), y = ko[2](b.s); return ((x ?? -1) - (y ?? -1)) * (naik ? 1 : -1) || nm(a.k).localeCompare(nm(b.k), "id"); });
      const tb = h("tbody");
      for (const {k, s} of rows.slice(0, maks)) tb.append(h("tr", null, h("td", {teks: nm(k)}), KOL.map(([, , f]) => h("td", {class: "n", teks: F(f(s))}))));
      const lagi = rows.length > maks ? h("button", {class: "bn-tombol sekunder", type: "button"}, ikon("tambah"), `Tampilkan ${F(Math.min(25, rows.length - maks))} lagi`) : null;
      lagi?.addEventListener("click", () => { maks += 25; gambar(); });
      put(isi, h("div", {class: "lb-ringkas"}, pil(`${F(rows.length)} ${skala === "kab" ? "kab/kota" : "provinsi"} tampil`, "info", "daftar"), sembunyi ? pil(`${F(sembunyi)} disembunyikan, kejadian kurang dari ${F(MIN)}`, "tunggu", "senyap") : null),
        rows.length ? [h("div", {class: "lb-tabel-bungkus"}, h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, ["Wilayah", ...KOL.map(x => x[1])].map(t => h("th", {teks: t})))), tb)), h("p", {class: "lb-draf", teks: `${F(Math.min(maks, rows.length))} dari ${F(rows.length)}`}), lagi] : kosong("tunggu", "Tidak ada wilayah dengan kejadian cukup di periode ini."));
    };
    const ulang = () => { maks = 25; lanjutNanti(gambar); };
    const nas = D.nasional?.[per];
    const sk = deretan("lbskala", "Tingkat wilayah", [["kab", "Kabupaten/kota", "pin"], ["prov", "Provinsi", "daftar"]], skala, v => { skala = v; sP.parentNode.hidden = v !== "kab"; ulang(); });
    const sPer = deretan("lbper", "Periode", PER.map(([v, t]) => [v, t, "kalender"]), per, v => { per = v; ulang(); });
    const sU = pilihan("Urut menurut", [["n", "Urut: kejadian"], ["nama", "Urut: nama"], ...KOL.slice(1).map(([v, t]) => [v, `Urut: ${t}`])], urut, v => { urut = v; ulang(); });
    const sA = pilihan("Arah urut", [["turun", "Terbesar dulu"], ["naik", "Terkecil dulu"]], "turun", v => { naik = v === "naik"; ulang(); });
    const sP = pilihan("Provinsi", [["", "Semua provinsi"], ...Object.entries(PROV).map(([p, t]) => [p, t])], prov, v => { prov = v; ulang(); });
    put(kotak, h("div", {class: "lb-peringatan"}, h("span", {teks: "Baca dengan hati-hati"}), h("ul", null, (D.catatan || []).map(c => h("li", {teks: c})))),
      sk, sPer, h("div", {class: "bn-baris"}, bungkus("Urut menurut", sU), bungkus("Arah", sA), bungkus("Provinsi", sP)),
      nas ? h("div", {class: "lb-ringkas"}, pil(`Nasional: ${F(nas.n)} kejadian, jeda median ${F(nas.jeda_hari?.median)} hari`, "info", "daftar"), pil(`${F(nas.sekali_pct)}% dilaporkan sekali saja`, "tunggu", "ok")) : null, isi,
      h("details", {class: "lb-p"}, h("summary", {teks: "Definisi kolom"}), h("ul", null, Object.entries(D.definisi || {}).map(([k, v]) => h("li", {teks: `${label(k)}: ${v}`})))));
    gambar();
  };

  panel.rekom = async (kotak) => {
    const r = await ambil("/api/logbook/turunan/rekomendasi");
    if (!r.ok) return put(kotak, gagalStaf(r.s));
    const D = r.j, MIN = D.berulang_bila_tahun_ge || 3;
    let w = {prov: "", kab: ""}, imbauan = false, hanyaBerulang = false;
    const isi = h("div");
    const gambar = () => {
      let t; // topik -> {tahun, n_kejadian, jenis, berulang}
      if (w.kab) t = D.kab[w.kab] || {};
      else if (w.prov) { t = {}; for (const kk of kabDiProv(D.kab, w.prov)) for (const [p, e] of Object.entries(D.kab[kk])) { const a = t[p] ||= {tahun: [], n_kejadian: 0, jenis: {}}; a.tahun = [...new Set([...a.tahun, ...e.tahun])].sort(); a.n_kejadian += e.n_kejadian; for (const [j, c] of Object.entries(e.jenis)) a.jenis[j] = (a.jenis[j] || 0) + c; a.berulang = a.tahun.length >= MIN; } }
      else t = D.nasional;
      const rows = Object.entries(t).filter(([p, e]) => (imbauan || p !== "imbauan_kewaspadaan") && (!hanyaBerulang || e.berulang)).sort((a, b) => (b[1].berulang - a[1].berulang) || b[1].n_kejadian - a[1].n_kejadian);
      const lingkup = w.kab ? namaKab(w.kab) : w.prov ? PROV[w.prov] : "Indonesia", tb = h("tbody");
      for (const [p, e] of rows) tb.append(h("tr", null, h("td", null, TOPIK[p] || label(p)), h("td", {class: "n"}, e.berulang ? pil("berulang", "bahaya", "peringatan") : pil("sekali atau dua tahun", "ok", "ok")), h("td", {class: "n", teks: F(e.n_kejadian)}),
        h("td", {class: "n", teks: `${F(e.tahun.length)} tahun: ${thRingkas(e.tahun)}`}), h("td", {teks: Object.entries(e.jenis).slice(0, 3).map(([j, c]) => `${nJ(j)} ${F(c)}`).join(", ")})));
      put(isi, h("div", {class: "lb-ringkas"}, pil(`${F(rows.filter(x => x[1].berulang).length)} topik berulang di ${lingkup}`, "bahaya", "peringatan"), pil(`${F(rows.length)} topik tampil`, "info", "daftar")),
        rows.length ? h("div", {class: "lb-tabel-bungkus"}, h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, ["Topik rekomendasi", "Status", "Kejadian", "Muncul di tahun", "Jenis terbanyak"].map(x => h("th", {teks: x})))), tb)) : kosong("tunggu", `Belum ada topik rekomendasi tercatat untuk ${lingkup}.`),
        kaki(`Berulang = muncul di ${F(MIN)} tahun berbeda atau lebih. ${w.prov && !w.kab ? "Angka provinsi = jumlah per kab/kota; kejadian lintas kab dihitung di tiap kab. " : ""}Topik dari kata kunci kasar, bukan makna; tanpa teks asli.`));
    };
    const ulang = () => lanjutNanti(gambar);
    const wl = await wilayah(v => { w = v; ulang(); });
    const mk = (nama, teks, ik, f) => { const i = h("input", {type: "checkbox", name: nama}); i.addEventListener("change", () => { f(i.checked); ulang(); }); return h("label", null, i, ikon(ik), teks); };
    put(kotak, h("div", {class: "lb-peringatan"}, h("span", {teks: "Baca dengan hati-hati"}), h("ul", null, (D.catatan || []).map(c => h("li", {teks: c})))), wl.node,
      h("div", {class: "lb-seg", role: "group", "aria-label": "Saring topik"}, mk("lbimb", "Tampilkan imbauan kewaspadaan", "peringatan", v => { imbauan = v; }), mk("lbber", "Hanya topik berulang", "kalender", v => { hanyaBerulang = v; })), isi);
    gambar();
  };


  /* ---------- kejadian serupa (rute staf serupa_<kodeprov2>) ---------- */
  const tglId = t => t ? new Date(t + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}) : "–";
  const chips = (judul, ik, a) => a?.length ? h("div", {class: "lb-chipbaris"}, h("b", {teks: judul}), a.map(x => pil(label(x), "info", ik))) : null;
  panel.serupa = async (kotak) => {
    const isi = h("div"), MAKS0 = 10;
    let w = {prov: "33", kab: ""}, jenis = "banjir", maks = MAKS0, berkas = null, jenisSeg = h("div");
    const gambar = () => {
      if (!berkas) return;
      if (!berkas.ok) return put(isi, berkas.s === 404 ? kosong("pin", `Belum ada berkas kejadian serupa untuk ${PROV[w.prov]}.`) : gagalStaf(berkas.s));
      if (!w.kab) return put(isi, kosong("pin", "Pilih kabupaten/kota untuk melihat kejadian lampaunya."));
      const e = berkas.j.kab?.[w.kab]?.[jenis], nm = namaKab(w.kab);
      if (!e?.kejadian?.length) return put(isi, kosong("tunggu", `Tidak ada kejadian ${nJ(jenis).toLowerCase()} tercatat di ${nm}.`));
      const rows = e.kejadian, sel = rows.filter(x => x.hari_selesai != null).length, ul = h("div", {class: "lb-riwayat"});
      for (const x of rows.slice(0, maks)) ul.append(h("article", {class: "lb-kartu"},
        h("div", {class: "lb-ringkas"}, pil(tglId(x.mulai), "info", "kalender"), pil(`dilaporkan ${F(x.hari_dilaporkan)} hari`, "tunggu", "daftar"),
          x.hari_selesai != null ? pil(`selesai dicatat hari ke-${F(x.hari_selesai)}`, "ok", "ok") : pil("tidak ada catatan selesai", "tunggu", "senyap"), x.dasar ? null : pil("di luar tahun dasar", "bahaya", "peringatan")),
        chips("Kebutuhan", "logistik", x.kebutuhan), chips("Bantuan", "ok", x.bantuan), chips("Alat", "alat_berat", x.alat), chips("Pihak", "personel", x.pihak),
        x.kronologi ? h("p", {class: "lb-p"}, h("b", {teks: "Kronologi: "}), x.kronologi) : null, x.upaya ? h("p", {class: "lb-p"}, h("b", {teks: "Upaya: "}), x.upaya) : null, x.kondisi_terakhir ? h("p", {class: "lb-p"}, h("b", {teks: "Kondisi terakhir: "}), x.kondisi_terakhir) : null));
      const lagi = rows.length > maks ? h("button", {class: "bn-tombol sekunder", type: "button"}, ikon("tambah"), `Tampilkan ${F(Math.min(MAKS0, rows.length - maks))} lagi`) : null;
      lagi?.addEventListener("click", () => { maks += MAKS0; gambar(); });
      put(isi, h("div", {class: "lb-ringkas"}, pil(`${F(e.n_total)} kejadian ${nJ(jenis).toLowerCase()} di ${nm}`, "info", "daftar"), pil(`${F(sel)} dari ${F(rows.length)} yang tampil punya catatan selesai`, "tunggu", "ok")), ul,
        h("p", {class: "lb-draf", teks: `${F(Math.min(maks, rows.length))} dari ${F(rows.length)} tampil${e.n_total > rows.length ? `, ${F(e.n_total)} tercatat` : ""}`}), lagi,
        kaki(`Terbaru dulu, paling banyak 40 per kabupaten/kota dan jenis. Teks dipotong dan disamarkan; hanya untuk staf. Kategori dari kata kunci, bisa kurang atau lebih. Tanda "di luar tahun dasar" = kejadian di luar tahun yang dipakai angka rapor. Hari selesai hanya ada bila petugas menulisnya di kolom kondisi. Sumber: logbook Pusdalops BNPB, tahun dasar ${thRingkas(berkas.j.tahun_dasar)}.`));
    };
    const muatProv = async () => { put(isi, kosong("tunggu", "Memuat kejadian…")); berkas = null; const p = w.prov, b = await ambil(`/api/logbook/turunan/serupa_${p}`); if (p !== w.prov) return; berkas = b;
      if (b.ok) { const ada = new Set(); for (const o of Object.values(b.j.kab || {})) Object.keys(o).forEach(j => ada.add(j)); const js = [...ada].sort(urutJenis); if (js.length && !js.includes(jenis)) jenis = js[0];
        jenisSeg.replaceWith(jenisSeg = deretan("lbserupa", "Jenis kejadian", js.map(j => [j, nJ(j), j]), jenis, v => { jenis = v; maks = MAKS0; lanjutNanti(gambar); })); }
      gambar(); };
    const wl = await wilayah(v => { const baru = v.prov !== w.prov; w = v; maks = MAKS0; lanjutNanti(baru ? muatProv : gambar); }, {wajibProv: true, awalProv: "33"});
    put(kotak, wl.node, jenisSeg, isi);
    muatProv();
  };

  /* ---------- lama penanganan (rute staf penanganan) ---------- */
  panel.lama = async (kotak) => {
    const r = await ambil("/api/logbook/turunan/penanganan");
    if (!r.ok) return put(kotak, gagalStaf(r.s));
    const D = r.j, JL = ["banjir", "karhutla"], isi = h("div");
    let jenis = "banjir", w = {prov: "", kab: ""}, maks = 15;
    const sel = c => c ? `${F(c.n_selesai)} dari ${F(c.n)}` : "–";
    const MED = "median dari kejadian yang dilaporkan selesai";
    const gambar = () => {
      const bolehMed = x => jenis === "banjir" && x?.layak_median === true;   // karhutla: keputusan pemilik, median 1 hari bukan lama penanganan
      const nas = D.nasional?.[jenis], pv = w.prov ? D.prov?.[w.prov]?.[jenis] : null, kb = w.kab ? D.kab?.[w.kab]?.[jenis] : null, lingkup0 = w.kab ? namaKab(w.kab) : w.prov ? PROV[w.prov] : "Indonesia";
      const c = kb || pv || nas, lingkup = kb ? lingkup0 : pv ? PROV[w.prov] : "Indonesia", bar = [["Nasional", nas], w.prov ? [PROV[w.prov], pv] : null, w.kab ? [namaKab(w.kab).split(",")[0], kb] : null].filter(x => x && bolehMed(x[1]));
      let svg = null;
      if (bar.length) {
        const mx = Math.max(...bar.map(([, x]) => x.p75_dilaporkan), 1), H = bar.length * 44 + 8; svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", `0 0 1380 ${H}`); svg.setAttribute("class", "lb-svg"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", `Lama sampai dilaporkan selesai, ${nJ(jenis)}`);
        bar.forEach(([nm, x], i) => {
          const g = document.createElementNS(NS, "g"), y = 6 + i * 44, mk = (cls, x0, w0, yy, hh) => { const e = document.createElementNS(NS, "rect"); e.setAttribute("class", cls); e.setAttribute("x", x0); e.setAttribute("width", Math.max(2, w0)); e.setAttribute("y", yy); e.setAttribute("height", hh); e.setAttribute("rx", 3); return e; };
          const tx = document.createElementNS(NS, "text"); tx.setAttribute("x", 0); tx.setAttribute("y", y + 22); tx.setAttribute("class", "kiri"); tx.textContent = nm.length > 18 ? nm.slice(0, 17) + "…" : nm;
          const tn = document.createElementNS(NS, "text"); tn.setAttribute("x", 1376); tn.setAttribute("y", y + 22); tn.setAttribute("class", "kanan"); tn.textContent = `median ${F(x.median_dilaporkan)}, p75 ${F(x.p75_dilaporkan)} hari`;
          g.setAttribute("data-tip", tip(nm, `Median dilaporkan selesai: ${F(x.median_dilaporkan)} hari, persentil 75: ${F(x.p75_dilaporkan)} hari`, `Dilaporkan selesai: ${sel(x)}`, `Tak dilaporkan selesai: ${F(x.tak_selesai_pct)}%`, "Batas bawah yang bias, bukan lama sebenarnya"));
          g.append(mk("tangkap", 0, 1380, y, 40), mk("bat", 220, 700 * x.p75_dilaporkan / mx, y + 4, 14), mk("bat musim", 220, 700 * x.median_dilaporkan / mx, y + 4, 14), tx, tn); svg.append(g);
        });
      }
      let rank = null;
      if (jenis === "banjir" && !w.kab) { // peringkat kab: hanya sel layak_median
        const rows = Object.entries(D.kab || {}).filter(([k, o]) => (!w.prov || k.startsWith(w.prov + "|")) && bolehMed(o[jenis])).map(([k, o]) => [k, o[jenis]]).sort((a, b) => b[1].median_dilaporkan - a[1].median_dilaporkan || b[1].p75_dilaporkan - a[1].p75_dilaporkan || a[0].localeCompare(b[0], "id"));
        const tb = h("tbody");
        for (const [k, x] of rows.slice(0, maks)) tb.append(h("tr", null, h("td", {teks: namaKab(k)}), h("td", {class: "n", teks: F(x.median_dilaporkan)}), h("td", {class: "n", teks: F(x.p75_dilaporkan)}), h("td", {class: "n", teks: sel(x)}), h("td", {class: "n", teks: `${F(x.tak_selesai_pct)}%`}),
          h("td", {class: "n"}, bolehMed(nas) ? pil(x.median_dilaporkan > nas.median_dilaporkan ? "lebih lama dari nasional" : x.median_dilaporkan < nas.median_dilaporkan ? "lebih cepat dari nasional" : "sama dengan nasional", x.median_dilaporkan > nas.median_dilaporkan ? "tunggu" : "ok", "kalender") : null)));
        const lagi = rows.length > maks ? h("button", {class: "bn-tombol sekunder", type: "button"}, ikon("tambah"), `Tampilkan ${F(Math.min(15, rows.length - maks))} lagi`) : null;
        lagi?.addEventListener("click", () => { maks += 15; gambar(); });
        rank = rows.length ? [h("h3", {class: "lb-sub", teks: `Kab/kota yang cukup datanya, menurut median terlama, ${w.prov ? PROV[w.prov] : "Indonesia"}`}), h("div", {class: "lb-tabel-bungkus"}, h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, ["Kab/kota", "Median (hari)", "Persentil 75 (hari)", "Dilaporkan selesai", "Tak dilaporkan selesai", "Dibanding nasional"].map(t => h("th", {teks: t})))), tb)),
          h("p", {class: "lb-draf", teks: `${F(Math.min(maks, rows.length))} dari ${F(rows.length)} kab/kota`}), lagi] : kosong("tunggu", `Tidak ada kab/kota di ${lingkup} yang cukup datanya untuk median (minimal 30 kejadian dilaporkan selesai). Yang ditampilkan angka ${lingkup}.`);
      }
      const ring = !c ? null : bolehMed(c)
        ? h("div", {class: "lb-ringkas"}, pil(`Median ${F(c.median_dilaporkan)} hari di ${lingkup}`, "bahaya", "kalender"), pil(`persentil 75: ${F(c.p75_dilaporkan)} hari`, "tunggu", "kalender"), pil(`${sel(c)} kejadian dilaporkan selesai`, "info", "daftar"), pil(`${F(c.tak_selesai_pct)}% tak dilaporkan selesai`, "tunggu", "senyap"))
        : h("div", {class: "lb-ringkas"}, pil(`${F(c.n)} kejadian di ${lingkup}`, "info", "daftar"), pil(`${sel(c)} dilaporkan selesai`, "info", "ok"), pil(`${F(c.tak_selesai_pct)}% tak dilaporkan selesai`, "tunggu", "senyap"));
      put(isi, ring, c ? svg : kosong("tunggu", `Belum ada ${nJ(jenis).toLowerCase()} dengan 5 kejadian atau lebih di ${lingkup0}. Pilih cakupan lebih luas.`), rank,
        c && jenis === "banjir" && !bolehMed(c) ? kaki(`Median tidak ditampilkan di ${lingkup}: kejadian yang dilaporkan selesai kurang dari 30 atau lebih dari 90% tidak pernah dilaporkan selesai.`) : null,
        jenis === "karhutla" ? kaki("Karhutla: hanya jumlah kejadian dan persen yang tak dilaporkan selesai. Median 1 hari dari catatan Pusdalops tidak bisa dibaca sebagai lama penanganan, jadi tidak ditampilkan.") : null,
        w.kab && !kb ? kaki(`${namaKab(w.kab)} kurang dari 5 kejadian ${nJ(jenis).toLowerCase()}; yang ditampilkan angka ${lingkup}.`) : null,
        jenis === "banjir" ? kaki(`Angka ini ${MED}, yaitu kejadian yang catatan kondisinya menyebut padam, surut, atau tertangani tanpa penyangkal. Kejadian yang tak pernah dilaporkan selesai tidak ikut, jadi ini batas bawah yang bias, bukan lama penanganan sebenarnya: lama sebenarnya hampir pasti lebih panjang. Persen tak dilaporkan selesai campuran antara belum selesai dan berhenti dilaporkan. Bar merah = median, bar abu = persentil 75. Median hanya untuk banjir dengan minimal 30 kejadian dilaporkan selesai dan tidak lebih dari 90% tak dilaporkan selesai. Sumber: logbook Pusdalops BNPB, tahun dasar ${thRingkas(D.tahun_dasar)}.`) : kaki(`Persen tak dilaporkan selesai campuran antara belum selesai dan berhenti dilaporkan. Sumber: logbook Pusdalops BNPB, tahun dasar ${thRingkas(D.tahun_dasar)}.`));
    };
    const wl = await wilayah(v => { w = v; maks = 15; lanjutNanti(gambar); });
    put(kotak, deretan("lblama", "Jenis kejadian", JL.map(j => [j, nJ(j), j]), jenis, v => { jenis = v; maks = 15; lanjutNanti(gambar); }), wl.node, isi);
    gambar();
  };

  /* ---------- rangka: deretan bagian + panel; mengembalikan simpul untuk disisipkan di halaman ---------- */
  const BAGIAN = [["catat", "Catat", "daftar"], ["jam", "Jam rawan", "tunggu"], ["terlibat", "Pihak terlibat", "personel"], ["desa", "Desa langganan", "pin"], ["rapor", "Rapor BPBD", "ok"], ["rekom", "Rekomendasi berulang", "peringatan"], ["serupa", "Kejadian serupa", "daftar"], ["lama", "Lama penanganan", "kalender"]];
  function pasang(kolom) {
    const kotak = h("section", {class: "bn-blok lb-turunan", hidden: true}, h("div"));
    const pilih = async (b) => {
      kolom.hidden = b !== "catat"; kotak.hidden = b === "catat";   // seketika
      if (b === "catat") return;
      const isi = h("div", {class: "lb-isi"}, kosong("tunggu", "Memuat…")), judul = BAGIAN.find(x => x[0] === b);
      put(kotak, h("h2", {class: "lb-judul-blok"}, ikon(judul[2]), judul[1]), isi);
      lanjutNanti(async () => { try { await panel[b](isi); } catch (e) { put(isi, kosong("peringatan", "Bagian ini belum bisa digambar. Muat ulang halaman.")); } });
    };
    if (typeof pasangTip === "function") pasangTip();   // tooltip grafik jam (/inti/tip.js)
    const seg = deretan("lbtab", "Bagian halaman", BAGIAN, "catat", pilih);
    seg.classList.add("lb-tab");
    return [seg, kotak];
  }
  window.LogbookTurunan = {pasang};
})();
