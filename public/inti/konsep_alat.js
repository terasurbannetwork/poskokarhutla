"use strict";
try { const t = JSON.parse(localStorage.getItem("pk-tema")); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
/* Konsep Panel EWS (data/kajian-bnpb/ews). Data asli saja: pos SIHKA lewat /api/banjir/sungai-ukur, gunung api dari MAGMA PVMBG.
   Teks dari data selalu lewat textContent. Pos basi tidak pernah tampil 0 (KEPUTUSAN D4); status resmi ditulis apa adanya (D3, Q7). */
(() => {
  const $ = id => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const angka = (v, d = 0) => v == null || Number.isNaN(v) ? null : v.toLocaleString("id-ID", {maximumFractionDigits: Number.isInteger(v) ? 0 : d, minimumFractionDigits: Number.isInteger(v) ? 0 : d});
  /* nama huruf kapital semua dari sumber dirapikan; singkatan pendek (PU, DKI, AWLR) dibiarkan */
  const rapi = t => t === t.toUpperCase() ? t.toLowerCase().replace(/(^|[\s(\-./])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(Pu|Dki|Awlr|Arr|Bd|Sg|Rw|Pa)\b/g, x => x.toUpperCase()) : t;
  const teksAmbang = (a, sat) => a && typeof a === "object" ? ["siaga3", "siaga2", "siaga1"].filter(k => a[k] != null).map(k => `${k.replace("siaga", "Siaga ")}: ${angka(a[k], 2)} ${sat}`).join(", ") || "tidak ada data" : "tidak ada data";
  const umur = ms => { const m = Math.round((Date.now() - ms) / 6e4); if (m < 60) return `${m} menit lalu`; const j = Math.round(m / 60); return j < 48 ? `${j} jam lalu` : `${Math.round(j / 24)} hari lalu`; };
  const jamWib = ms => new Date(ms).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}) + " WIB";
  const cache = {}, ambil = async u => cache[u] ??= fetch(u, {cache: "no-cache"}).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

  /* ---------- murni: tingkat pos SIHKA ---------- */
  const BASI_SIHKA = new Set(["lama", "macet", "data_bolong"]);
  const URUT = {"Siaga 1": 0, "Siaga 2": 1, "Siaga 3": 2, tertinggi: 3, naik_di_atas_biasa: 4, Normal: 5};
  const KELAS_RESMI = {"Siaga 1": "awas", "Siaga 2": "siaga", "Siaga 3": "waspada", "Normal": "normal"};
  const NAMA_PERSENTIL = {tertinggi: "Tertinggi dalam riwayat pos", naik_di_atas_biasa: "Naik di atas biasa"};
  function posBanjir(p) {
    const basi = BASI_SIHKA.has(p.status);
    const resmi = !basi && p.status_resmi ? p.status_resmi : null;
    return {id: p.id, nama: rapi(p.nama.replace(/^POS DUGA AIR\s*/i, "").trim() || p.nama), nilai: basi && p.v === 0 ? null : p.v, satuan: p.satuan || "",
      waktu: p.t ? p.t * 1000 : null, basi, pil: basi ? ["tanpa", "Tidak ada data terkini"] : resmi ? [KELAS_RESMI[resmi] || "normal", `${resmi} (pengelola)`] : NAMA_PERSENTIL[p.status] ? ["info", NAMA_PERSENTIL[p.status]] : null,
      urut: basi ? 8 : resmi ? URUT[resmi] : URUT[p.status] ?? 6, rinci: [["Pengelola", (p.pengelola || "Kementerian PU").replace(/,.*$/, "")], ["Ambang resmi", teksAmbang(p.ambang, p.satuan || "")]], sumber: "SIHKA"};
  }
  /* ---------- murni: gunung api ---------- */
  const LEVEL = {1: ["normal", "Level I Normal"], 2: ["waspada", "Level II Waspada"], 3: ["siaga", "Level III Siaga"], 4: ["awas", "Level IV Awas"]};
  function posGunung(g, gempa, jenis) {
    const hari = gempa?.hari || {}, tgl = Object.keys(hari).sort(), akhir = tgl.at(-1), isi = akhir ? hari[akhir] : null;
    const total = isi ? isi.reduce((a, b) => a + b, 0) : null;
    const teratas = isi ? isi.map((n, i) => [n, jenis[i]?.n]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 2) : [];
    return {id: g.kode || g.nama, nama: g.nama, nilai: total, satuan: total == null ? "" : `gempa vulkanik ${akhir ? new Date(akhir).toLocaleDateString("id-ID", {day: "numeric", month: "short"}) : ""}`,
      waktu: akhir ? Date.parse(akhir + "T23:59:00+07:00") : null, basi: false, pil: LEVEL[g.level] || null, urut: 4 - (g.level || 0),
      rinci: [["Provinsi", g.prov || "tidak ada data"], ["Radius rekomendasi", g.radius_km ? `${angka(g.radius_km, 1)} km` : "tidak ada data"], ["Jenis terbanyak", teratas.length ? teratas.map(([n, j]) => `${j} ${n}`).join(", ") : "tidak ada data"]],
      seri: tgl.slice(-30).map(t => [Date.parse(t + "T12:00:00+07:00"), hari[t].reduce((a, b) => a + b, 0)]), sumber: "MAGMA PVMBG", tautan: g.laporan};
  }

  /* ---------- layar ---------- */
  let tab = "banjir", daftar = [], dipilih = null;
  function kartu(p) {
    const k = el("button", "al-kartu" + (p.basi ? " basi" : "")); k.type = "button"; k.dataset.id = p.id;
    k.setAttribute("aria-pressed", String(dipilih === p.id));
    const kp = el("span", "al-kartu-kepala"); kp.append(el("b", null, p.nama), el("small", null, p.sumber)); k.append(kp);
    const ang = el("span", "al-angka");
    if (p.nilai == null) ang.append(el("strong", "kosong", "tidak ada data"));
    else ang.append(el("strong", null, angka(p.nilai, Math.abs(p.nilai) < 10 ? 2 : 0)), el("small", null, p.satuan));
    if (p.basi && p.waktu) ang.append(el("small", "al-umur", `terakhir ${umur(p.waktu)}`));
    k.append(ang);
    if (p.pil) k.append(el("span", `al-pil ${p.pil[0]}`, p.pil[1]));
    const t = el("dl", "al-rinci");
    for (const [a, b] of [...p.rinci, ["Waktu", p.waktu ? jamWib(p.waktu) : "tidak ada data"]]) t.append(el("dt", null, a), el("dd", null, b));
    k.append(t);
    k.addEventListener("click", () => pilih(p));
    return k;
  }
  function gambarKisi() {
    const q = $("alCari").value.trim().toLowerCase(), kisi = $("alKisi");
    const isi = daftar.filter(p => !q || p.nama.toLowerCase().includes(q)).sort((a, b) => a.urut - b.urut || a.nama.localeCompare(b.nama, "id")).slice(0, 24);
    kisi.replaceChildren(...isi.map(kartu));
    if (!isi.length) kisi.append(el("p", "al-kosong", "Tidak ada pos yang cocok."));
  }
  function ringkas(isi) { const r = $("alRingkas"); r.replaceChildren(...isi.map(([n, l, kls]) => { const s = el("span", "al-ring " + (kls || "")); s.append(el("b", null, n), el("small", null, l)); return s; })); }
  function putus(daftarBasi, kata) {
    const b = $("alPutus"); b.hidden = !daftarBasi.length; if (!daftarBasi.length) return;
    b.replaceChildren(el("b", null, `${angka(daftarBasi.length)} ${kata} tanpa data terkini`), el("span", null, daftarBasi.slice(0, 4).map(p => p.nama).join(", ") + (daftarBasi.length > 4 ? `, dan ${angka(daftarBasi.length - 4)} lainnya` : "")));
    const tutup = el("button", "al-tutup"); tutup.type = "button"; tutup.setAttribute("aria-label", "Tutup pemberitahuan"); tutup.textContent = "×"; tutup.addEventListener("click", () => { b.hidden = true; }); b.append(tutup);
  }

  async function muatBanjir() {
    const d = await ambil("/api/banjir/sungai-ukur");
    daftar = d.pos.map(posBanjir);
    const basi = daftar.filter(p => p.basi), resmi = d.pos.filter(p => /^Siaga/.test(p.status_resmi || "") && !BASI_SIHKA.has(p.status));
    ringkas([[angka(daftar.length), "pos tinggi air"], [angka(resmi.length), "berstatus siaga dari pengelola", resmi.length ? "siaga" : ""], [angka(basi.length), "tanpa data terkini", "tanpa"], ["belum ada", "sensor milik sendiri"]]);
    putus(basi, "pos");
  }
  async function muatGunung() {
    const [s, k] = await Promise.all([ambil("/banjir/data/gunungapi_status.json"), ambil("/gunungapi/data/kegempaan.json")]);
    daftar = s.gunung.map(g => posGunung(g, k.gunung[g.nama], k.jenis));
    const naik = s.gunung.filter(g => g.level >= 2).length;
    ringkas([[angka(daftar.length), "gunung api dipantau PVMBG"], [angka(naik), "di atas Level I", naik ? "waspada" : ""], ["belum ada", "geofon dan lidar milik sendiri"]]);
    putus([], "");
  }
  function cctv() {
    daftar = []; ringkas([["belum ada", "kamera berizin"]]); putus([], "");
    const p = el("div", "al-cctv-kosong");
    p.append(el("b", null, "Kamera belum tersambung"), el("span", null, "Aliran CCTV dasbor EWS Banda Aceh, geodashboard, dan MHEWS Gunung Ibu baru ditanam sesudah ada izin tertulis dari pengelolanya (paket EWS, pertanyaan Q1)."));
    $("alKisi").replaceChildren(p);
  }

  /* grafik garis SVG interaktif: putus pada celah lebih dari 2x interval median */
  function grafik(judul, titik, satuan) {
    const w = $("alGrafik"); w.hidden = false; w.replaceChildren(el("h3", null, judul));
    if (titik.length < 2) { w.append(el("p", "al-kosong", titik.length ? `Pos ini baru punya 1 bacaan dalam rentang ini (${angka(titik[0][1], 2)} ${satuan}, ${jamWib(titik[0][0])}); grafik butuh paling sedikit 2.` : "Belum ada bacaan dalam rentang ini.")); return; }
    const W = 720, H = 200, P = 36, xs = titik.map(t => t[0]), ys = titik.map(t => t[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys) || 1, rentang = y1 - y0 || 1;
    const X = x => P + (x - x0) / (x1 - x0) * (W - P * 1.5), Y = y => H - P + 6 - (y - y0) / rentang * (H - P * 1.6);
    const sela = xs.slice(1).map((x, i) => x - xs[i]).sort((a, b) => a - b), median = sela[sela.length >> 1];
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", judul);
    for (const v of [y0, (y0 + y1) / 2, y1]) { const g = document.createElementNS(NS, "line"); g.setAttribute("x1", P); g.setAttribute("x2", W - P / 2); g.setAttribute("y1", Y(v)); g.setAttribute("y2", Y(v)); g.setAttribute("class", "al-g-garis"); svg.append(g);
      const t = document.createElementNS(NS, "text"); t.setAttribute("x", P - 6); t.setAttribute("y", Y(v) + 4); t.setAttribute("class", "al-g-sumbu"); t.textContent = angka(v, Math.abs(v) < 10 ? 1 : 0); svg.append(t); }
    let ruas = [[titik[0]]];
    for (let i = 1; i < titik.length; i++) { if (titik[i][0] - titik[i - 1][0] > 2 * median) ruas.push([]); ruas.at(-1).push(titik[i]); }
    for (const r of ruas) { const pl = document.createElementNS(NS, "polyline"); pl.setAttribute("points", r.map(([a, b]) => `${X(a).toFixed(1)},${Y(b).toFixed(1)}`).join(" ")); pl.setAttribute("class", "al-g-seri"); svg.append(pl); }
    const tanda = document.createElementNS(NS, "circle"); tanda.setAttribute("r", 4); tanda.setAttribute("class", "al-g-tanda"); tanda.style.display = "none"; svg.append(tanda);
    const tip = el("div", "al-g-tip"); tip.hidden = true;
    svg.addEventListener("pointermove", e => {
      const b = svg.getBoundingClientRect(), mx = (e.clientX - b.left) / b.width * W;
      let i = 0, best = Infinity; titik.forEach(([a], k) => { const d = Math.abs(X(a) - mx); if (d < best) { best = d; i = k; } });
      const [a, v] = titik[i]; tanda.setAttribute("cx", X(a)); tanda.setAttribute("cy", Y(v)); tanda.style.display = "";
      tip.hidden = false; tip.textContent = `${angka(v, Math.abs(v) < 10 ? 2 : 0)} ${satuan}, ${jamWib(a)}`; tip.style.left = `${(X(a) / W) * 100}%`;
    });
    svg.addEventListener("pointerleave", () => { tanda.style.display = "none"; tip.hidden = true; });
    const bungkus = el("div", "al-g-bungkus"); bungkus.append(svg, tip); w.append(bungkus);
  }
  async function pilih(p) {
    dipilih = p.id; for (const k of document.querySelectorAll(".al-kartu")) k.setAttribute("aria-pressed", String(k.dataset.id === p.id));
    if (tab === "gunungapi") return grafik(`Gempa vulkanik per hari, 30 hari terakhir: ${p.nama}`, p.seri, "gempa");
    $("alGrafik").hidden = false; $("alGrafik").replaceChildren(el("p", "al-kosong", "Memuat seri waktu..."));
    try {
      const s = await ambil("/api/banjir/sungai-ukur/pos/" + encodeURIComponent(p.id));
      grafik(`Tinggi air 24 jam terakhir: ${p.nama}`, s.t.map((t, i) => [t * 1000, s.v[i]]).filter(x => x[1] != null), s.satuan || p.satuan);
    } catch { $("alGrafik").replaceChildren(el("p", "al-kosong", "Seri waktu pos ini gagal dimuat.")); }
  }
  async function ganti(baru) {
    tab = baru; dipilih = null; $("alGrafik").hidden = true; $("alCari").value = "";
    for (const b of document.querySelectorAll("[data-tab]")) b.setAttribute("aria-selected", String(b.dataset.tab === tab));
    $("alCariWadah").hidden = tab === "cctv";
    $("alKisi").replaceChildren(el("p", "al-kosong", "Memuat data..."));
    try { if (tab === "banjir") await muatBanjir(); else if (tab === "gunungapi") await muatGunung(); else return cctv(); gambarKisi(); }
    catch (e) { $("alKisi").replaceChildren(el("p", "al-kosong", `Sumber ${tab === "banjir" ? "SIHKA" : "PVMBG"} gagal dimuat.`)); }
  }
  for (const b of document.querySelectorAll("[data-tab]")) b.addEventListener("click", () => ganti(b.dataset.tab));
  let jeda; $("alCari").addEventListener("input", () => { clearTimeout(jeda); jeda = setTimeout(gambarKisi, 120); });
  ganti("banjir");
})();
