/* Sortie OMC (/admin/omc): catat sortie, daftar per operasi, dan hasil evaluasi dampak.
   Data: GET /api/omc/admin (admin modOK atau sesi staf tmc/koordalops/pimpinan) dan aset /udara/data/omc_hasil.json (dibuat pipeline cuaca-udara, scripts/omc/nilai.py).
   Kesimpulan evaluasi selalu KESESUAIAN, bukan sebab-akibat; kalimat dan kategori datang dari pipeline, halaman ini hanya menampilkan.
   CSP admin: tanpa skrip/gaya inline, semua teks data lewat textContent. Peta sasaran = SVG titik kecamatan digambar di sini (tanpa pustaka luar).
   INP: kontrol (pil bahan, kartu, tombol) berubah SEKETIKA; daftar, peta, dan kartu hasil digambar sesudah satu frame dan dipotong. Dummy: Super Admin saja (🧪 isi, 🧹 hapus). */
(() => {
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul"), NS = "http://www.w3.org/2000/svg";
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const sv = (tag, att, ...anak) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(att || {})) e.setAttribute(k, v); for (const a of anak.flat()) if (a != null) e.append(typeof a === "string" ? document.createTextNode(a) : a); return e; };
  const HARI = 864e5, POTONG = 12, POTONG_EP = 4, MAKS_TITIK = 60;
  /* daftar tetap: sama dengan BAHAN di src/omc.js (dijaga omc.test.mjs); nama provinsi dari satu tabel (/instansi_wilayah.js) */
  const BAHAN = {nacl: "NaCl", dry_ice: "Dry ice"};
  const PROV = window.Wilayah.PROV;
  const METRIK = {pm25: ["💨", "PM2,5", "µg/m³", 1, "BMKG"], jarak_pandang: ["👁️", "Jarak pandang", "m", 1, "METAR via IEM"], hujan: ["🌧️", "Frekuensi jam hujan", "%", 100, "METAR via IEM"]};
  const KAT = {sejalan: ["Sejalan dengan dugaan efek", "sejalan"], tak_terbedakan: ["Tidak bisa dibedakan dari pola alami", "tak"], berlawanan: ["Berlawanan arah", "lawan"], data_kurang: ["Data tidak cukup", "kurang"]};
  const BENDERA = {sensor_jenuh: "Sensor PM2,5 jenuh", hujan_alami_di_kontrol: "Hujan alami di stasiun kontrol", titik_panas_berubah: "Titik panas berubah tajam", radius_diperluas: "Stasiun sasaran dicari lebih jauh",
    plasebo_belum_terkalibrasi: "Ambang belum lolos uji plasebo", angin_berbalik: "Arah angin berbalik", hujan_di_sasaran: "Hujan di sasaran"};
  const FOOTER = "Kesesuaian waktu dan lokasi perubahan dengan sortie belum membuktikan sebab-akibat.";
  const tgl = t => new Date(Date.parse(t + "T00:00:00+07:00")).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"});
  const hariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const kirim = async (url, body) => { try { const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(body || {})}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}}; } };
  const namaKab = k => window.Wilayah.kab(k.split("|")[1]);
  /* hasil evaluasi dari pipeline: dimuat SEKALI per halaman (muat() dipanggil lagi sesudah tiap aksi). Belum ada berkas (404) = state "belum tersedia", bukan galat. */
  let hasilP = null;
  const muatHasil = () => hasilP ||= fetch("/udara/data/omc_hasil.json").then(x => x.ok ? x.json() : null).catch(() => null);
  let D = null, HASIL = null, WIL = null, jadwal = 0, pesanTeks = "", pesanOk = true;
  let F = {form: null, op: false, semua: new Set(), episodeSemua: false};   // form: null | {id|null, ...isian}
  const pesan = (t, ok = true) => { pesanTeks = t || ""; pesanOk = ok; const p = document.getElementById("omPesan"); if (p) { p.textContent = pesanTeks; p.className = "om-pesan " + (ok ? "ok" : "galat"); } };
  const kosong = (teks, ...tombol) => app.replaceChildren(h("div", {class: "om-kosong"}, h("p", {teks}), ...tombol));
  const pil = (teks, kls = "") => h("span", {class: "om-pil " + kls, teks});
  /* angka di kalimat berwarna merah (selera pemilik: angka kunci menonjol) */
  const kalimat = t => h("p", {class: "om-kalimat"}, ...String(t).split(/(\d[\d.,]*)/).map((s, i) => i % 2 ? h("b", {class: "om-angka", teks: s}) : s));

  /* ---------- contoh episode dummy: lahir dari deret contoh, bukan angka ketikan (DUMMY.md syarat 3) ---------- */
  const persen = (a, p) => { const s = [...a].sort((x, y) => x - y), i = (s.length - 1) * p, l = Math.floor(i); return s[l] + (s[Math.min(l + 1, s.length - 1)] - s[l]) * (i - l); };
  const rata = a => a.reduce((x, y) => x + y, 0) / a.length;
  const HARI_TANPA = [-.08, .02, -.15, .06, -.03, -.11, .09, -.05, -.18, .01, -.07, .04, -.12, -.02];   // perubahan log pada jam yang sama di 14 hari tanpa OMC
  function metrikContoh(nama, tgtPra, tgtPas, ctlPra, ctlPas, bendera = [], kurang = false) {
    if (kurang) return {nama, stasiun_sasaran: ["Stasiun contoh"], stasiun_kontrol: ["Kontrol contoh"], sebelum: null, sesudah: null, kontrol_sebelum: null, kontrol_sesudah: null, pita_diurnal: null, kategori: "data_kurang",
      kalimat: `${METRIK[nama][1]} belum bisa dinilai: stasiun kontrol layak kurang dari 2.`, bendera};
    const log = nama !== "hujan", a = rata(tgtPra), b = rata(tgtPas), c = rata(ctlPra), d = rata(ctlPas);
    const D1 = log ? Math.log(b / a) : b - a, Dk = log ? Math.log(d / c) : d - c, band = [persen(HARI_TANPA, .1), persen(HARI_TANPA, .5), persen(HARI_TANPA, .9)].map(v => log ? v : v / 2);
    const did = D1 - Dk, arah = nama === "pm25" ? -1 : 1, ambang = log ? .25 : .3, kuat = Math.abs(did) >= ambang;
    const luar = did < band[0] || did > band[2], kat = !kuat ? "tak_terbedakan" : (Math.sign(did) === arah ? (luar && !bendera.length ? "sejalan" : "tak_terbedakan") : "berlawanan");
    const ub = x => log ? `${x >= 0 ? "naik" : "turun"} ${fmt(Math.abs(Math.exp(x) - 1) * 100)} persen` : `${x >= 0 ? "naik" : "turun"} ${fmt(Math.abs(x) * 100)} poin persen`;
    const pita = log ? `${fmt((Math.exp(band[0]) - 1) * 100)} sampai ${fmt((Math.exp(band[2]) - 1) * 100)} persen` : `${fmt(band[0] * 100)} sampai ${fmt(band[2] * 100)} poin persen`;
    const dasar = `${METRIK[nama][1]} di sasaran ${ub(D1)} dalam 3 jam sesudah sortie; stasiun kontrol ${ub(Dk)}; pada jam yang sama di hari tanpa OMC, 80 persen perubahan berada di ${pita}`;
    const akhir = {sejalan: ". Perubahan ini searah dugaan dan keluar dari pita itu. Ini kesesuaian, bukan bukti sebab-akibat.", berlawanan: ". Perubahan berlawanan arah dengan dugaan.", tak_terbedakan: ". Perubahan ini masih dalam kisaran pola alami atau tidak melewati ambang."}[kat];
    return {nama, stasiun_sasaran: ["Stasiun contoh"], stasiun_kontrol: ["Kontrol contoh 1", "Kontrol contoh 2"], sebelum: a, sesudah: b, kontrol_sebelum: c, kontrol_sesudah: d, pita_diurnal: band, kategori: kat, kalimat: dasar + akhir, bendera};
  }
  const R = (n, f) => Array.from({length: n}, (_, i) => f(i));
  /* tiap ember status terisi (DUMMY.md syarat 4): empat kategori, final dan sementara, sortie tanpa episode (jam tidak diketahui, menunggu hasil) */
  function episodeContoh(S) {
    const dum = S.filter(s => s.dummy), ids = f => { const x = dum.filter(f).map(s => s.id); return x.length ? x : null; }, ep = [];
    const casa = ids(s => s.pesawat.startsWith("CASA A-2107")), snl = ids(s => s.pesawat === "PK-SNL" && s.bahan === "dry_ice"), kb = ids(s => s.bahan === "nacl" && s.prov.includes("61"));
    if (casa) ep.push({id: "ep-contoh-1", sortie_ids: casa, bahan: "dry_ice", mulai: null, status: "final", dummy: true, metrik: [
      metrikContoh("pm25", R(6, i => 190 - i * 2), [140, 112, 96], R(6, () => 150), [147, 141, 138]), metrikContoh("jarak_pandang", R(6, () => 900), R(3, i => 1000 + i * 100), R(6, () => 1200), [1180, 1220, 1200], ["titik_panas_berubah"])]});
    if (snl) ep.push({id: "ep-contoh-2", sortie_ids: snl, bahan: "dry_ice", mulai: null, status: "sementara", dummy: true, metrik: [
      metrikContoh("pm25", R(6, () => 120), [118, 114, 111], R(6, () => 110), [108, 105, 103]), metrikContoh("jarak_pandang", null, null, null, null, [], true)]});
    if (kb) ep.push({id: "ep-contoh-3", sortie_ids: kb, bahan: "nacl", mulai: null, status: "final", dummy: true, metrik: [metrikContoh("hujan", [.4, .2, .4, .2, .4, .2], [0, 0, 0], R(6, () => .2), [.2, .2, .4], ["radius_diperluas"])]});
    return ep;
  }
  let EP = null;   // dihitung sekali per muat (daftar ribuan baris memanggilnya per baris)
  const episodeSemua = () => EP ||= [...(HASIL?.episode || []), ...(D ? episodeContoh(D.sortie).filter(e => !(HASIL?.episode || []).some(x => x.sortie_ids?.some(i => e.sortie_ids.includes(i)))) : [])];
  const episodeDari = id => episodeSemua().find(e => e.sortie_ids?.includes(id));

  /* ---------- kartu Insight per metrik ---------- */
  function grafik(m) {
    if (!METRIK[m.nama]) return null;   // metrik tak dikenal: kartu tanpa grafik, tetap menampilkan kalimat
    const [, , satuan, skala] = METRIK[m.nama] || [], log = m.nama !== "hujan", p = m.pita_diurnal;
    const lo = p ? (log ? m.sebelum * Math.exp(p[0]) : m.sebelum + p[0]) : null, tg = p ? (log ? m.sebelum * Math.exp(p[1]) : m.sebelum + p[1]) : null, hi = p ? (log ? m.sebelum * Math.exp(p[2]) : m.sebelum + p[2]) : null;
    const v = [m.sebelum, m.sesudah, m.kontrol_sebelum, m.kontrol_sesudah, lo, hi].filter(x => x != null), a = Math.min(...v), b = Math.max(...v), pad = (b - a || Math.abs(b) || 1) * .18;
    const W = 340, T = 170, y = x => 18 + (T - 54) * (1 - (x - (a - pad)) / ((b + pad) - (a - pad))), X1 = 90, X2 = 250, f = x => fmt(x * skala);
    const svg = sv("svg", {viewBox: `0 0 ${W} ${T}`, class: "om-grafik", role: "img", "aria-label": `${METRIK[m.nama][1]}: sasaran ${f(m.sebelum)} ke ${f(m.sesudah)} ${satuan}, kontrol ${f(m.kontrol_sebelum)} ke ${f(m.kontrol_sesudah)} ${satuan}`});
    if (p) svg.append(sv("rect", {x: X2 - 14, y: y(hi), width: 28, height: Math.max(2, y(lo) - y(hi)), rx: 6, class: "om-pita"}), sv("line", {x1: X2 - 14, x2: X2 + 14, y1: y(tg), y2: y(tg), class: "om-pita-tengah"}));
    const garis = (kls, p1, p2, e1, e2) => [sv("line", {x1: X1, y1: y(p1), x2: X2, y2: y(p2), class: "om-garis " + kls}), sv("circle", {cx: X1, cy: y(p1), r: 4.5, class: "om-titik " + kls}), sv("circle", {cx: X2, cy: y(p2), r: 4.5, class: "om-titik " + kls}),
      sv("text", {x: X1 - 10, y: y(p1) + 4, "text-anchor": "end", class: "om-nilai " + kls}, e1), sv("text", {x: X2 + 18, y: y(p2) + 4, class: "om-nilai " + kls}, e2)];
    svg.append(...garis("kontrol", m.kontrol_sebelum, m.kontrol_sesudah, f(m.kontrol_sebelum), f(m.kontrol_sesudah)), ...garis("sasaran", m.sebelum, m.sesudah, f(m.sebelum), f(m.sesudah)),
      sv("text", {x: X1, y: T - 8, "text-anchor": "middle", class: "om-sumbu"}, "Sebelum"), sv("text", {x: X2, y: T - 8, "text-anchor": "middle", class: "om-sumbu"}, "Sesudah"));
    return h("div", {class: "om-grafik-wadah"}, svg, h("p", {class: "om-legenda"}, pil("Sasaran", "sasaran"), pil("Kontrol", "kontrol"), p ? pil("Pita hari tanpa OMC", "pita") : null, h("span", {class: "om-satuan", teks: satuan})));
  }
  function kartuMetrik(m, dummy, label) {
    const [ikon, nama, , , sumber] = METRIK[m.nama] || ["", m.nama, "", 1, ""], [labelKat, kls] = KAT[m.kategori] || KAT.data_kurang;
    return h("article", {class: "om-kartu " + kls},
      h("div", {class: "om-eyebrow"}, pil(`${ikon} ${nama}`, "metrik"), pil(labelKat, kls), dummy ? pil("DUMMY", "dummy") : null),
      m.kalimat ? kalimat(m.kalimat) : null,
      m.sebelum != null && m.sesudah != null && m.kontrol_sebelum != null && m.kontrol_sesudah != null ? grafik(m) : null,
      m.bendera?.length ? h("div", {class: "om-bendera"}, ...m.bendera.map(b => pil("⚑ " + (BENDERA[b] || b.replaceAll("_", " ")), "bendera"))) : null,
      h("p", {class: "om-sumber", teks: `Sumber: ${(label || {})[m.nama] || sumber}, diolah Pantau Bencana`}),
      h("p", {class: "om-footer", teks: FOOTER}));
  }
  function panelHasil() {
    const E = [...episodeSemua()].sort((x, y) => String(y.mulai || "").localeCompare(String(x.mulai || ""))), w = h("section", {class: "om-bagian", id: "omHasil"}, h("h2", {teks: "Hasil evaluasi"}));
    if (!E.length) { w.append(h("div", {class: "om-kosong"}, h("p", {teks: "Evaluasi belum tersedia, arsip pembanding sedang dikumpulkan."}))); return w; }
    const tampil = F.episodeSemua ? E : E.slice(0, POTONG_EP);
    for (const [bahan, r] of Object.entries(HASIL?.ringkas || {})) if (r?.kalimat) w.append(kalimat(r.kalimat));
    for (const e of tampil) {
      const S = e.sortie_ids.map(i => D.sortie.find(s => s.id === i)).filter(Boolean), tgls = [...new Set(S.map(s => s.tanggal))].map(tgl).join(", ");
      w.append(h("div", {class: "om-episode", id: "ep-" + e.id}, h("div", {class: "om-baris"}, h("b", {teks: `${BAHAN[e.bahan] || e.bahan}, ${tgls || "tanggal tidak diketahui"}`}), pil(`${e.sortie_ids.length} sortie`),
        pil(e.status === "final" ? "Final" : "Sementara", e.status === "final" ? "final" : "sementara"), e.dummy ? pil("DUMMY", "dummy") : null),
        h("div", {class: "om-kartu-grid"}, ...e.metrik.map(m => kartuMetrik(m, e.dummy, HASIL?.label)))));
    }
    if (E.length > tampil.length) w.append(h("button", {class: "om-btn", type: "button", "data-episode-semua": "1", teks: `Lihat semua ${fmt(E.length)} episode`}));
    return w;
  }

  /* ---------- daftar per operasi ---------- */
  function statusSortie(s) {
    const e = episodeDari(s.id);
    if (e) return h("a", {class: "om-pil " + (e.status === "final" ? "final" : "sementara"), href: "#ep-" + e.id, teks: e.status === "final" ? "Hasil final" : "Hasil sementara"});
    if (!s.mulai) return pil("Jam tidak diketahui", "kurang");
    return pil(Date.parse(s.mulai) > Date.now() ? "Terjadwal" : "Menunggu hasil", Date.parse(s.mulai) > Date.now() ? "tak" : "menunggu");
  }
  const sasaranTeks = s => [s.sasaran_kab.map(namaKab).join(", "), s.sasaran_poligon ? "poligon gambar" : ""].filter(Boolean).join(" dan ");
  function barisSortie(s) {
    const td = (teks, kls) => h("td", {class: kls, teks, title: kls === "sasaran" ? teks : null});
    return h("tr", {"data-id": s.id}, td(tgl(s.tanggal)), td(s.jam_mulai ? `${s.jam_mulai}${s.jam_selesai ? " sampai " + s.jam_selesai : ""}` : "tidak diketahui", s.jam_mulai ? "" : "redup"),
      h("td", null, h("b", {teks: s.pesawat}), s.dummy ? pil("DUMMY", "dummy") : null), h("td", null, pil(BAHAN[s.bahan], s.bahan)), td(fmt(s.kg), "angka"), td(s.ketinggian_kaki != null ? fmt(s.ketinggian_kaki) : "–", "angka"), td(sasaranTeks(s), "sasaran"),
      h("td", null, statusSortie(s)),
      h("td", {class: "aksi"}, D.boleh_tulis ? [h("button", {class: "om-btn kecil", type: "button", "data-ubah": s.id, teks: "Ubah"}), h("button", {class: "om-btn kecil bahaya", type: "button", "data-hapus": s.id, teks: "Hapus"})] : null));
  }
  function grup(nama, op, S) {
    const kg = Object.entries(BAHAN).map(([k, l]) => [l, S.filter(s => s.bahan === k).reduce((t, s) => t + s.kg, 0)]).filter(x => x[1] > 0).map(([l, t]) => `${l} ${fmt(t)} kg`).join(", ");
    const tampil = F.semua.has(op?.id ?? "-") ? S : S.slice(0, POTONG);
    return h("section", {class: "om-grup"}, h("div", {class: "om-baris"}, h("h3", {teks: nama}), op?.dummy ? pil("DUMMY", "dummy") : null, h("span", {class: "om-meta", teks: [`${fmt(S.length)} sortie`, kg, op?.provinsi ? PROV[op.provinsi] : null,
      op?.mulai ? `${tgl(op.mulai)}${op.selesai && op.selesai !== op.mulai ? " sampai " + tgl(op.selesai) : ""}` : null].filter(Boolean).join(", ")})),
      h("div", {class: "om-tabel-wadah"}, h("table", {class: "om-tabel"}, h("thead", null, h("tr", null, ["Tanggal", "Jam WIB", "Pesawat", "Bahan", "Kg", "Kaki", "Sasaran", "Status", ""].map(k => h("th", {teks: k})))), h("tbody", null, tampil.map(barisSortie)))),
      S.length > tampil.length ? h("button", {class: "om-btn", type: "button", "data-grup-semua": op?.id ?? "-", teks: `Lihat semua ${fmt(S.length)} sortie`}) : null);
  }
  function panelDaftar() {
    const w = h("section", {class: "om-bagian", id: "omDaftar"}, h("h2", {teks: "Sortie per operasi"}));
    if (!D.sortie.length) { w.append(h("div", {class: "om-kosong"}, h("p", {teks: D.boleh_tulis ? "Belum ada sortie tercatat. Catat sortie pertama dengan tombol di atas." : "Belum ada sortie tercatat."}))); return w; }
    const per = new Map(D.operasi.map(o => [o.id, []])); per.set(null, []);
    for (const s of D.sortie) (per.get(s.operasi_id) || per.get(null)).push(s);
    for (const o of D.operasi) if (per.get(o.id).length) w.append(grup(o.nama, o, per.get(o.id)));
    if (per.get(null).length) w.append(grup("Tanpa operasi", null, per.get(null)));
    return w;
  }

  /* ---------- formulir sortie + peta sasaran ---------- */
  async function muatWilayah() {
    if (WIL) return WIL;
    const j = await fetch("/banjir/data/pusat_kec.json").then(r => r.ok ? r.json() : null).catch(() => null), kab = new Map(), kec = [];
    if (j) for (const [k, [lat, lon]] of Object.entries(j)) { const [p, a] = k.split("|"); if (!PROV[p] || !a || a === "None") continue; (kab.get(p) || kab.set(p, new Set()).get(p)).add(a); kec.push([p, a, lat, lon]); }
    return WIL = {kab: new Map([...kab].map(([p, s]) => [p, [...s].sort((x, y) => x.localeCompare(y))])), kec, galat: !j};
  }
  const baruForm = () => ({id: null, tanggal: hariIni(), pesawat: "", jam_mulai: "", jam_selesai: "", bahan: "dry_ice", kg: "", ketinggian_kaki: "", operasi_id: "", catatan: "", kab: new Set(), titik: [], provAktif: "62", cari: ""});
  const dariSortie = s => ({...baruForm(), id: s.id, tanggal: s.tanggal, pesawat: s.pesawat, jam_mulai: s.jam_mulai || "", jam_selesai: s.jam_selesai || "", bahan: s.bahan, kg: String(s.kg), ketinggian_kaki: s.ketinggian_kaki ?? "",
    operasi_id: s.operasi_id || "", catatan: s.catatan || "", kab: new Set(s.sasaran_kab), titik: (s.sasaran_poligon?.coordinates?.[0] || []).slice(0, -1).map(([x, y]) => [x, y]), provAktif: s.prov[0] || "62"});
  const bidang = (label, ...isi) => h("label", {class: "om-bidang"}, h("span", {teks: label}), ...isi);
  function gambarPeta() {
    const w = document.getElementById("omPeta"), f = F.form; if (!w || !f) return;
    if (!WIL || WIL.galat) { w.replaceChildren(h("p", {class: "om-redup", teks: "Peta kecamatan tidak bisa dimuat; poligon tetap bisa dipilih lewat kab/kota saja."})); return; }
    const K = WIL.kec.filter(k => k[0] === f.provAktif);
    if (!K.length) { w.replaceChildren(h("p", {class: "om-redup", teks: "Pilih provinsi yang punya data kecamatan."})); return; }
    const pad = .25, lat = K.map(k => k[2]).concat(f.titik.map(t => t[1])), lon = K.map(k => k[3]).concat(f.titik.map(t => t[0])), a = Math.min(...lat) - pad, b = Math.max(...lat) + pad, c = Math.min(...lon) - pad, d = Math.max(...lon) + pad;
    const W = 1000, T = Math.max(260, Math.min(620, W * (b - a) / ((d - c) * Math.cos((a + b) / 2 * Math.PI / 180)))), x = o => (o - c) / (d - c) * W, y = o => (b - o) / (b - a) * T;
    const svg = sv("svg", {viewBox: `0 0 ${W} ${T}`, class: "om-svg", role: "img", "aria-label": `Peta sasaran ${PROV[f.provAktif]}; ketuk untuk menambah titik poligon`, "data-peta": JSON.stringify([a, b, c, d])});
    for (const k of K) svg.append(sv("circle", {cx: x(k[3]), cy: y(k[2]), r: f.kab.has(k[0] + "|" + k[1]) ? 5 : 2.6, class: "om-kec" + (f.kab.has(k[0] + "|" + k[1]) ? " dipilih" : "")}));
    if (f.titik.length > 1) svg.append(sv(f.titik.length > 2 ? "polygon" : "polyline", {points: f.titik.map(t => `${x(t[0])},${y(t[1])}`).join(" "), class: "om-poligon"}));
    f.titik.forEach((t, i) => svg.append(sv("circle", {cx: x(t[0]), cy: y(t[1]), r: 7, class: "om-simpul"}), sv("text", {x: x(t[0]) + 10, y: y(t[1]) - 8, class: "om-nomor"}, String(i + 1))));
    w.replaceChildren(svg, h("p", {class: "om-redup", teks: f.titik.length ? `${f.titik.length} titik poligon (maksimal ${MAKS_TITIK}). Titik oranye kecil = kecamatan di kab/kota terpilih.` : "Opsional: ketuk peta untuk menggambar poligon sasaran, minimal 3 titik. Titik oranye kecil = kecamatan di kab/kota terpilih."}));
  }
  function gambarKab() {
    const f = F.form, w = document.getElementById("omKab"); if (!w || !f) return;
    const daftar = (WIL?.kab.get(f.provAktif) || []).filter(a => !f.cari || a.toLowerCase().includes(f.cari.toLowerCase())).slice(0, 40);
    w.replaceChildren(h("div", {class: "om-pilihan"}, ...[...f.kab].map(k => h("button", {class: "om-pil sasaran", type: "button", "data-lepas": k, title: "Hapus dari sasaran", teks: `${namaKab(k)}, ${PROV[k.slice(0, 2)]} ✕`}))),
      h("ul", {class: "om-kablist"}, ...daftar.map(a => { const k = f.provAktif + "|" + a; return h("li", null, h("label", null, h("input", {type: "checkbox", "data-kab": k, checked: f.kab.has(k)}), " " + a)); })),
      !daftar.length ? h("p", {class: "om-redup", teks: WIL?.galat ? "Daftar kab/kota tidak bisa dimuat. Muat ulang halaman." : "Tidak ada kab/kota yang cocok."}) : null);
  }
  function bacaForm() {
    const f = F.form, v = n => document.getElementById(n)?.value ?? "";
    Object.assign(f, {tanggal: v("omTanggal"), pesawat: v("omPesawat").trim(), jam_mulai: v("omMulai"), jam_selesai: v("omSelesai"), kg: v("omKg"), ketinggian_kaki: v("omKaki"), operasi_id: v("omOperasi"), catatan: v("omCatatan").trim()});
  }
  async function simpan() {
    const f = F.form; bacaForm();
    if (f.titik.length && f.titik.length < 3) return pesan("Poligon butuh minimal 3 titik. Tambah titik atau kosongkan poligon.", false);
    const provs = [...new Set([...f.kab].map(k => k.slice(0, 2)))], ring = f.titik.length ? [...f.titik, f.titik[0]] : null;
    const body = {tanggal: f.tanggal, pesawat: f.pesawat, jam_mulai: f.jam_mulai || null, jam_selesai: f.jam_selesai || null, bahan: f.bahan, kg: f.kg === "" ? null : Number(f.kg), ketinggian_kaki: f.ketinggian_kaki === "" ? null : Number(f.ketinggian_kaki),
      operasi_id: f.operasi_id || null, catatan: f.catatan || null, sasaran_kab: [...f.kab], sasaran_poligon: ring ? {type: "Polygon", coordinates: [ring]} : null, prov: provs.length ? provs : [f.provAktif]};
    const tbl = document.getElementById("omSimpan"); if (tbl) tbl.disabled = true;
    const r = await kirim(f.id ? "/api/omc/sortie/" + f.id : "/api/omc/sortie", f.id ? {...body, aksi: "ubah"} : body);
    if (tbl) tbl.disabled = false;
    if (!r.ok) return pesan(r.j.galat || `Gagal menyimpan (${r.status})`, false);
    F.form = null; await muat(); pesan(f.id ? "Sortie diperbarui." : "Sortie tercatat.");
  }
  function bukaForm(f) { F.form = f; F.op = false; gambarKontrol(); muatWilayah().then(() => { gambarKab(); gambarPeta(); }); document.getElementById("omForm")?.scrollIntoView({block: "start"}); }
  function panelForm() {
    const f = F.form, o = D.operasi;
    if (!D.boleh_tulis) return h("p", {class: "om-redup", teks: "Akun ini hanya membaca. Mencatat sortie untuk staf TMC/OMC dan moderator."});
    const aksi = h("div", {class: "om-aksi"}, h("button", {class: "om-btn utama", type: "button", "data-baru": "1", teks: "Catat sortie"}), h("button", {class: "om-btn", type: "button", "data-op": "1", "aria-expanded": String(F.op), teks: "Tambah operasi"}));
    const op = F.op ? h("div", {class: "om-form", id: "omOp"}, bidang("Nama operasi", h("input", {id: "omOpNama", maxlength: 100, placeholder: "OMC Kalimantan Tengah Okt 2026"})),
      bidang("Provinsi", h("select", {id: "omOpProv"}, h("option", {value: "", teks: "Beberapa provinsi"}), ...Object.entries(PROV).map(([k, n]) => h("option", {value: k, teks: n})))),
      bidang("Mulai", h("input", {id: "omOpMulai", type: "date"})), bidang("Selesai", h("input", {id: "omOpSelesai", type: "date"})), h("div", {class: "om-aksi"}, h("button", {class: "om-btn utama", type: "button", "data-op-simpan": "1", teks: "Simpan operasi"}))) : null;
    if (!f) return h("div", {class: "om-bagian"}, aksi, op);
    const field = (id, att) => h("input", {id, ...att});
    const form = h("div", {class: "om-form", id: "omForm"}, h("h3", {teks: f.id ? "Ubah sortie" : "Catat sortie"}),
      bidang("Operasi", h("select", {id: "omOperasi"}, h("option", {value: "", teks: "Tanpa operasi"}), ...o.map(x => h("option", {value: x.id, teks: x.nama, selected: f.operasi_id === x.id})))),
      bidang("Tanggal (WIB)", field("omTanggal", {type: "date", value: f.tanggal})), bidang("Pesawat (registrasi)", field("omPesawat", {value: f.pesawat, maxlength: 40, placeholder: "PK-SNL"})),
      bidang("Jam mulai WIB, kosong bila tidak diketahui", field("omMulai", {type: "time", value: f.jam_mulai})), bidang("Jam selesai WIB", field("omSelesai", {type: "time", value: f.jam_selesai})),
      h("div", {class: "om-bidang"}, h("span", {teks: "Bahan"}), h("div", {class: "om-chip-baris", role: "group", "aria-label": "Bahan"}, ...Object.entries(BAHAN).map(([k, l]) => h("button", {class: "om-chip", type: "button", "data-bahan": k, "aria-pressed": String(f.bahan === k), teks: l})))),
      bidang("Bahan (kg)", field("omKg", {type: "number", inputmode: "decimal", min: 0.1, max: 20000, step: "any", value: f.kg})), bidang("Ketinggian (kaki), kosong bila tidak diketahui", field("omKaki", {type: "number", inputmode: "numeric", min: 0, max: 60000, value: f.ketinggian_kaki})),
      h("div", {class: "om-bidang lebar"}, h("span", {teks: "Sasaran kab/kota"}), h("div", {class: "om-baris"}, h("select", {id: "omProv", "aria-label": "Provinsi"}, ...Object.entries(PROV).map(([k, n]) => h("option", {value: k, teks: n, selected: f.provAktif === k}))),
        h("input", {id: "omCari", type: "search", placeholder: "Cari kab/kota", value: f.cari, "aria-label": "Cari kab/kota"})), h("div", {id: "omKab"}, h("p", {class: "om-redup", teks: "Memuat daftar kab/kota…"}))),
      h("div", {class: "om-bidang lebar"}, h("span", {teks: "Poligon sasaran (opsional)"}), h("div", {id: "omPeta"}, h("p", {class: "om-redup", teks: "Memuat peta…"})),
        h("div", {class: "om-aksi"}, h("button", {class: "om-btn kecil", type: "button", "data-urung": "1", teks: "Urungkan titik"}), h("button", {class: "om-btn kecil", type: "button", "data-kosongkan": "1", teks: "Kosongkan poligon"}))),
      h("label", {class: "om-bidang lebar"}, h("span", {teks: "Catatan internal (tidak tampil di data publik)"}), h("textarea", {id: "omCatatan", maxlength: 500, rows: 2, teks: f.catatan})),
      h("div", {class: "om-aksi"}, h("button", {class: "om-btn utama", id: "omSimpan", type: "button", "data-simpan": "1", teks: f.id ? "Simpan perubahan" : "Simpan sortie"}), h("button", {class: "om-btn", type: "button", "data-batal": "1", teks: "Batal"})));
    return h("div", {class: "om-bagian"}, aksi, op, form);
  }

  /* ---------- kerangka ---------- */
  const tunda = () => { cancelAnimationFrame(jadwal); jadwal = requestAnimationFrame(() => setTimeout(() => { const d = document.getElementById("omDaftar"), p = document.getElementById("omHasil"); d?.replaceWith(panelDaftar()); p?.replaceWith(panelHasil()); }, 0)); };
  function gambarKontrol() {
    const S = D.sortie, kg = S.reduce((t, s) => t + s.kg, 0), tunggu = S.filter(s => !episodeDari(s.id)).length, kt = (l, n, kls = "") => h("div", {class: "om-ringkas-kartu " + kls}, h("b", {teks: fmt(n)}), h("span", {teks: l}));
    app.replaceChildren(h("p", {id: "omPesan", class: "om-pesan " + (pesanOk ? "ok" : "galat"), role: "status", teks: pesanTeks}),
      h("div", {class: "om-ringkas"}, kt("Sortie tercatat", S.length), kt("Bahan disemai (kg)", kg), kt("Belum ada hasil", tunggu, tunggu ? "merah" : "")),
      panelForm(), h("section", {class: "om-bagian", id: "omDaftar"}), h("section", {class: "om-bagian", id: "omHasil"}));
    pasangDummy(); tunda();
    if (F.form) { gambarKab(); gambarPeta(); }
  }
  async function muat() {
    const [r, hasil] = await Promise.all([fetch("/api/omc/admin").catch(() => null), muatHasil()]);
    if (!r) return kosong("Jaringan putus. Periksa sinyal lalu coba lagi.", h("button", {class: "om-btn utama", type: "button", "data-ulang": "1", teks: "Coba lagi"}));
    if (r.status === 401 || r.status === 403) return kosong("Akun ini belum bisa membuka sortie OMC. Peran yang boleh: staf TMC/OMC, koordinator, pimpinan, atau admin moderator.",
      ...(document.body.dataset.masuk === "1" ? [h("a", {class: "om-btn utama", href: "/admin/pantau", teks: "Kembali ke Meja Pantau"})]   // staf yang sudah masuk: tidak dilempar ke login admin
        : [h("a", {class: "om-btn utama", href: "/admin/pantau", teks: "Masuk sebagai staf"}), h("a", {class: "om-btn", href: "/admin/masuk?ke=%2Fadmin%2Fomc", teks: "Masuk sebagai admin"})]));
    if (r.status === 503) return kosong("Sortie OMC belum diaktifkan: migrasi D1 0033_omc belum diterapkan.");
    if (!r.ok) return kosong(`Galat ${r.status}.`, h("button", {class: "om-btn utama", type: "button", "data-ulang": "1", teks: "Coba lagi"}));
    D = await r.json(); EP = null; HASIL = hasil && Array.isArray(hasil.episode) ? hasil : null;
    gambarKontrol();
  }

  app.addEventListener("click", async e => {
    const t = e.target, q = s => t.closest(s);
    if (q("[data-ulang]")) return muat();
    if (q("[data-baru]")) return bukaForm(baruForm());
    if (q("[data-op]")) { F.op = !F.op; return gambarKontrol(); }
    if (q("[data-batal]")) { F.form = null; return gambarKontrol(); }
    const ub = q("[data-ubah]"); if (ub) return bukaForm(dariSortie(D.sortie.find(s => s.id === ub.dataset.ubah)));
    const hp = q("[data-hapus]");
    if (hp) { const s = D.sortie.find(x => x.id === hp.dataset.hapus); if (!confirm(`Hapus sortie ${s.pesawat} tanggal ${tgl(s.tanggal)}? Baris ditandai terhapus dan tidak masuk data publik; riwayatnya tetap tersimpan.`)) return;
      hp.disabled = true; const r = await kirim("/api/omc/sortie/" + s.id, {aksi: "hapus"}); hp.disabled = false; if (!r.ok) return pesan(r.j.galat || `Gagal menghapus (${r.status})`, false); await muat(); return pesan("Sortie dihapus."); }
    if (q("[data-simpan]")) return simpan();
    if (q("[data-op-simpan]")) {
      const v = n => document.getElementById(n).value, r = await kirim("/api/omc/operasi", {nama: v("omOpNama"), provinsi: v("omOpProv") || null, mulai: v("omOpMulai") || null, selesai: v("omOpSelesai") || null});
      if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false); F.op = false; await muat(); return pesan("Operasi dibuat. Pilih di formulir sortie."); }
    const bh = q("[data-bahan]"); if (bh) { F.form.bahan = bh.dataset.bahan; for (const c of app.querySelectorAll("[data-bahan]")) c.setAttribute("aria-pressed", String(c.dataset.bahan === F.form.bahan)); return; }
    const lp = q("[data-lepas]"); if (lp) { F.form.kab.delete(lp.dataset.lepas); gambarKab(); return gambarPeta(); }
    if (q("[data-urung]")) { F.form.titik.pop(); return gambarPeta(); }
    if (q("[data-kosongkan]")) { F.form.titik = []; return gambarPeta(); }
    const gs = q("[data-grup-semua]"); if (gs) { F.semua.add(gs.dataset.grupSemua); return tunda(); }
    if (q("[data-episode-semua]")) { F.episodeSemua = true; return tunda(); }
    const pt = q("[data-peta]");
    if (pt && F.form) {   // ketuk peta = tambah satu simpul poligon
      if (F.form.titik.length >= MAKS_TITIK) return pesan(`Poligon maksimal ${MAKS_TITIK} titik.`, false);
      const [a, b, c, d] = JSON.parse(pt.dataset.peta), r = pt.getBoundingClientRect();
      F.form.titik.push([Math.round((c + (e.clientX - r.left) / r.width * (d - c)) * 1e5) / 1e5, Math.round((b - (e.clientY - r.top) / r.height * (b - a)) * 1e5) / 1e5]); gambarPeta();
    }
  });
  app.addEventListener("change", e => {
    const t = e.target;
    if (t.id === "omProv") { F.form.provAktif = t.value; F.form.cari = ""; document.getElementById("omCari").value = ""; gambarKab(); gambarPeta(); }
    if (t.dataset?.kab) { t.checked ? F.form.kab.add(t.dataset.kab) : F.form.kab.delete(t.dataset.kab); gambarKab(); gambarPeta(); }
  });
  app.addEventListener("input", e => { if (e.target.id === "omCari") { F.form.cari = e.target.value; gambarKab(); } });

  /* dummy: Super Admin saja, dua ikon (DUMMY.md); layar dimuat ulang penuh sesudah isi dan hapus */
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy sortie OMC? Data asli tidak tersentuh.")) return;
    d.disabled = true; const r = await kirim("/api/omc/dummy", {aksi: d.dataset.dummy}); d.disabled = false;
    if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false);
    const t0 = d.dataset.dummy === "isi" ? `Dummy dibuat: ${r.j.sortie} sortie dalam ${r.j.operasi} operasi, lengkap dengan contoh hasil evaluasi berlabel DUMMY.` : `Dummy dihapus: ${r.j.sortie} sortie, ${r.j.operasi} operasi.`;
    F = {form: null, op: false, semua: new Set(), episodeSemua: false}; await muat(); pesan(t0, true);
  });
  function pasangDummy() { Admin.pasangDummy(aksiJudul, !!D?.super); }
  muat();
})();
