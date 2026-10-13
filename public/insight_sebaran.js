/* insight_sebaran.js — empat exhibit Insight dari riset sebaran (scripts/sebaran/RISET-SEBARAN.md):
     sebMusim  "Musim 2026: kapan dan dari mana mulai"      (musim_awal.json)
     sebDorong "Apa yang membuat api membesar"               (sebaran_pendorong.json: lahan/konsesi + cuaca, rasio & selang 95%)
     sebUji    "Uji model pada kejadian lalu"                (sebaran_kasus.json; baris -> dialog ramalan vs teramati)
     sebModel  "Kalau ada titik di X"                        (model_sebaran.json; tombol ke Simulasi / cerita bab 5)
   Gaya sama dengan exhibit lain: Insight.ex(judul, sub, unit, isi, catatan, kontrol), this.seg, data-tip, dialog #dlg.
   Data dimuat malas; exhibit menggambar ulang dirinya setelah data tiba. Butuh: Insight, $, esc, fmt, bukaTab, namaProv. */
(() => {
if (typeof Insight === "undefined" || !Array.isArray(Insight.EX)) return;
const SEB = {d: null, janji: null};
const ambil = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
SEB.muat = () => SEB.janji ||= Promise.all(["data/musim_awal.json", "data/sebaran_pendorong.json", "data/sebaran_kasus.json", "data/model_sebaran.json", "data/sebaran_galat.json"].map(ambil))
  .then(([musim, dorong, kasus, model, galat]) => { SEB.d = {musim, dorong, kasus, model, galat}; document.querySelectorAll('[data-ex^="seb"]').forEach(b => { b.innerHTML = Insight.gambar(b.dataset.ex); }); });
const tunggu = judul => { SEB.muat(); return `<article class="ex"><h3>${esc(judul)}</h3><p class="unit">Memuat data…</p></article>`; };
const pc = (v, d = 0) => v == null ? "–" : fmt(Math.round(v * 100 * 10 ** d) / 10 ** d) + "%";
const kali = v => v == null ? "–" : fmt(Math.round(v * 100) / 100) + "×";
const ci = r => r ? `${kali(r[0])} (95%: ${kali(r[1])}–${kali(r[2])})` : "–";
const hari = d => new Date(Date.UTC(2026, 0, 1) + d * 864e5).toLocaleDateString("id-ID", {day: "numeric", month: "short"});
Object.assign(Insight.st, {sebDorong: "lahan", sebUjiKelas: "", sebGalat: "prov"});

/* ---------- Musim 2026 ---------- */
Insight.exSebMusim = function () {
  const M = SEB.d?.musim; if (!SEB.d) return tunggu("Musim 2026: kapan dan dari mana mulai"); if (!M) return "";
  const ur = M.urutan.map(k => ({k, ...M.prov[k]})), iso = s => Math.round((Date.parse(s) - Date.UTC(2026, 0, 1)) / 864e5);
  const W = 720, H = 26 * ur.length + 30, x0 = 170, x1 = 700, d0 = 150, d1 = 290, X = d => x0 + (x1 - x0) * (d - d0) / (d1 - d0);
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Awal musim 2026 per provinsi">
    ${[152, 182, 213, 244, 274].map(d => `<line x1="${X(d)}" x2="${X(d)}" y1="0" y2="${H - 22}" stroke="currentColor" opacity=".1"/><text x="${X(d)}" y="${H - 6}" font-size="11" text-anchor="middle" opacity=".7">${hari(d)}</text>`).join("")}
    ${ur.map((o, i) => { const a = iso(o.awal_2026_iso), m = o.selisih_hari != null ? a - o.selisih_hari : null, y = 16 + i * 26, w = WARNA_PROV[o.k] || "var(--bad)";
      const p1 = (o.pertama || [])[0];
      return `<text x="${x0 - 8}" y="${y + 4}" font-size="12" text-anchor="end">${esc(o.nama)}</text>
        ${m != null ? `<line x1="${X(m)}" x2="${X(a)}" y1="${y}" y2="${y}" stroke="currentColor" opacity=".3"/><circle cx="${X(m)}" cy="${y}" r="5" fill="none" stroke="currentColor" opacity=".55" data-tip="Median awal 2015–2025: ${hari(m)}"/>` : ""}
        <circle cx="${X(a)}" cy="${y}" r="7" fill="${w}" data-tip="${esc(o.nama)} 2026: mulai ${esc(o.awal_2026)}${o.selisih_hari != null ? `, ${Math.abs(o.selisih_hari)} hari ${o.selisih_hari < 0 ? "lebih awal" : "lebih lambat"} dari biasa` : ""}${p1 ? `<br>Kompleks besar pertama: ${esc(p1.kab || "")}, ${new Date(p1.t0).toLocaleDateString("id-ID", {day: "numeric", month: "short"})} (${fmt(p1.ha)} ha)` : ""}<br>Klik untuk rincian" data-sebprov="${o.k}"/>`; }).join("")}</svg>`;
  const cepat = ur.filter(o => o.selisih_hari != null).sort((a, b) => a.selisih_hari - b.selisih_hari)[0];
  return this.ex(`Musim 2026 mulai di ${this.hl(esc(ur[0].nama))} pada ${esc(ur[0].awal_2026)}; ${esc(cepat.nama)} ${this.hl(Math.abs(cepat.selisih_hari) + " hari")} lebih awal dari biasanya`,
    "Hari pertama jumlah titik 7 hari bertahan di atas 2× median 2015–2025 selama ≥ 14 hari", "bulat = 2026, lingkaran kosong = median 2015–2025 · klik untuk kompleks besar pertama", svg,
    `${esc(M.narasi)} Sumber: NASA FIRMS VIIRS S-NPP 2015–2026; celah data 8 Mei–1 Jun 2026. Skrip: scripts/sebaran/musim_awal.py.`);
};

/* ---------- Pendorong ---------- */
Insight.exSebDorong = function () {
  const P = SEB.d?.dorong; if (!SEB.d) return tunggu("Apa yang membuat api membesar"); if (!P) return "";
  const mode = this.st.sebDorong;
  let baris;
  if (mode === "lahan") baris = (P.banding_lahan || []).filter(b => b.rasio_lolos).map(b => ({l: b.banding, v: b.rasio_lolos[0], ci: b.rasio_lolos,
    tip: `${esc(b.banding)}<br>Peluang membesar ${pc(b.lolos, 1)} vs ${pc(b.lolos_acuan, 1)} (n ${fmt(b.n)} / ${fmt(b.n_acuan)})<br>Rasio ${ci(b.rasio_lolos)}<br>Luas baru per hari ${fmt(b.ha_hari)} vs ${fmt(b.ha_hari_acuan)} ha${b.rasio_ha_hari ? ` (${ci(b.rasio_ha_hari)})` : ""}<br>Pergeseran median ${fmt(b.geser_km)} vs ${fmt(b.geser_km_acuan)} km/hari`}));
  else {
    const K = P.kelas || {}, ambilK = (f, i, l) => { const t = K[f]?.tabel; const r = t?.[i < 0 ? t.length + i : i]; return r?.rasio != null ? {l, v: r.rasio, tip: `${esc(l)}<br>${pc(r.laju, 1)} lolos (n ${fmt(r.n)}) vs acuan ${pc(t[0].laju, 1)}`} : null; };
    baris = [ambilK("hujan24", 2, "Hujan 5–20 mm 24 jam ke depan (vs 0)"), ambilK("rh_min", -1, "RH minimum ≥ 60% (vs < 40%)"), ambilK("vpd_maks", -1, "VPD ≥ 3,5 kPa (vs < 1,5)"),
      ambilK("dc", -1, "DC tertinggi (vs < 100)"), ambilK("ffmc", -1, "FFMC ≥ 90 (vs < 80)"), ambilK("ws", -1, "Angin ≥ 20 km/jam (vs < 10)"), ambilK("hari_kering", -1, "≥ 21 hari tanpa hujan (vs 0–2)"),
      ambilK("sm0", 0, "Lengas tanah 0–7 cm < 0,30 (acuan)") && ambilK("sm0", -1, "Lengas tanah ≥ 0,50 (vs < 0,30)"), ambilK("blh", -1, "Lapisan batas ≥ 2 km (vs < 1 km)"),
      ambilK("awan", -1, "Awan ≥ 75% (vs < 25%)"), ambilK("oni", -1, "El Niño ≥ 1 (vs La Niña)"), ambilK("malam", 1, "Pertama terlihat malam (vs siang)"), ambilK("frp0", -1, "FRP awal ≥ 50 MW (vs < 5)")].filter(Boolean);
  }
  baris.sort((a, b) => b.v - a.v);
  const W = 720, rh = 24, H = baris.length * rh + 20, ml = 330, mx = Math.max(2, ...baris.map(b => b.ci ? b.ci[2] : b.v)) * 1.05;
  const X = v => ml + (W - ml - 60) * Math.log(Math.max(v, .05) / .05) / Math.log(mx / .05), x1 = X(1);
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Rasio peluang membesar"><line x1="${x1}" x2="${x1}" y1="0" y2="${H - 14}" stroke="currentColor" stroke-dasharray="3 3" opacity=".5"/>
    ${baris.map((b, i) => { const y = i * rh + 4, a = Math.min(X(b.v), x1), z = Math.max(X(b.v), x1);
      return `<text x="${ml - 8}" y="${y + 13}" font-size="11.5" text-anchor="end">${esc(b.l)}</text><rect x="${a}" y="${y}" width="${Math.max(1, z - a)}" height="${rh - 8}" fill="${b.v >= 1 ? "var(--bad)" : "var(--ok)"}" data-tip="${b.tip}"/>
        ${b.ci ? `<line x1="${X(b.ci[1])}" x2="${X(b.ci[2])}" y1="${y + 8}" y2="${y + 8}" stroke="currentColor" stroke-width="1.4"/>` : ""}<text x="${z + 5}" y="${y + 13}" font-size="11">${kali(b.v)}</text>`; }).join("")}
    <text x="${x1}" y="${H - 2}" font-size="10" text-anchor="middle" opacity=".7">1× = sama</text></svg>`;
  const top = baris[0], imp = (P.gbdt?.permutasi || []).slice(0, 4).map(x => x.nama).join(", ");
  return this.ex(mode === "lahan" ? `Titik api di ${this.hl(esc(top?.l.split(" vs ")[0].toLowerCase() || ""))} ${this.hl(kali(top?.v))} lebih mungkin membesar` : `Cuaca: ${this.hl(esc(top?.l || ""))} menaikkan peluang membesar ${this.hl(kali(top?.v))}`,
    `Dari ${fmt(P.n_peristiwa)} titik api baru (9 provinsi, Jul–Nov), ${pc(P.laju_dasar, 1)} membesar menjadi ${esc(P.definisi_lolos)}`,
    "rasio peluang membesar, skala log · garis = selang 95% bootstrap · arahkan kursor untuk luas & jarak menjalar per hari", svg,
    `Variabel terpenting di model boosting (penurunan AUC bila diacak): ${esc(imp)}. Rasio dari tabel silang: variabel saling terkait (sawit di gambut juga jauh dari jalan), jadi ini hubungan, bukan sebab. Sanksi dihitung hanya bila sudah dijatuhkan pada tahun api. Sumber: scripts/sebaran/pendorong.py.`,
    this.seg("sebDorong", [["lahan", "Lahan & konsesi"], ["cuaca", "Cuaca & api"]]));
};

/* ---------- Uji pada kejadian lalu ---------- */
Insight.exSebUji = function () {
  const K = SEB.d?.kasus; if (!SEB.d) return tunggu("Uji model pada kejadian lalu"); if (!K) return "";
  const R = K.ringkasan, kel = this.st.sebUjiKelas, daf = K.kasus.map((x, i) => ({...x, i})).filter(x => !kel || x.kelas === kel);
  const c = v => v ? `${fmt(Math.round(v[0] * 100) / 100)} <small>(${fmt(Math.round(v[1] * 100) / 100)}–${fmt(Math.round(v[2] * 100) / 100)})</small>` : "–";
  const pemb = Object.entries(R.model_lain || {}).filter(([nm]) => !nm.endsWith("_mentah")).sort((a, b) => (b[1].f1_24?.[0] || 0) - (a[1].f1_24?.[0] || 0));
  const NM = {hibrida: "Sim FBP terkalibrasi", sim: "Sim FBP situs (tanpa kalibrasi)", sim_kal: "Sim FBP + kalibrasi kompleks", rothermel: "Rothermel/BehavePlus (AS)", mcarthur: "McArthur Mk5 (Australia)",
    csiro_vesta: "CSIRO rumput + Vesta (Australia)", elips_angin: "Elips angin saja"};
  const tabel = `<div class="tw" style="max-height:340px"><table><thead><tr><th>Th</th><th>Provinsi</th><th>Kelas</th><th>Gambut</th><th class="n">Teramati 72 j (ha)</th><th class="n">Ramalan (P10–P90)</th><th class="n">IoU 24/72</th><th class="n">P(membesar)</th><th>Benar</th></tr></thead><tbody>
    ${daf.map(x => `<tr class="klik" tabindex="0" data-sebkasus="${x.i}"><td>${x.th}</td><td>${esc(x.nama_prov)}</td><td>${x.kelas}</td><td>${x.gambut ? "ya" : "–"}</td><td class="n num">${fmt(x.obs_ha[2])}</td>
      <td class="n num">${fmt(x.pred_ha[2][1])} (${fmt(x.pred_ha[2][0])}–${fmt(x.pred_ha[2][2])})</td><td class="n num">${fmt(Math.round(x.iou[0] * 100) / 100)} / ${fmt(Math.round(x.iou[2] * 100) / 100)}</td><td class="n num">${pc(x.p_lepas)}</td><td>${x.lepas_benar ? "✓" : "✗"}</td></tr>`).join("")}</tbody></table></div>
    <div class="tw" style="margin-top:12px"><table><thead><tr><th>Model (kasus sama)</th><th class="n">F1 sel baru 24 j</th><th class="n">IoU 72 j</th><th class="n">Salah arah</th></tr></thead><tbody>
      <tr><td><b>Model data (boosting)</b></td><td class="n num">${c(R.f1_24)}</td><td class="n num">${c(R.iou_72)}</td><td class="n num">${R.arah_err ? fmt(Math.round(R.arah_err[0])) + "°" : "–"}</td></tr>
      ${pemb.map(([nm, v]) => `<tr><td>${esc(NM[nm] || nm)}</td><td class="n num">${c(v.f1_24)}</td><td class="n num">${c(v.iou_72)}</td><td class="n num">${v.arah ? fmt(Math.round(v.arah[0])) + "°" : "–"}</td></tr>`).join("")}</tbody></table></div>`;
  return this.ex(`Diuji pada ${this.hl(R.n + " kejadian lalu")}: tebakan "akan membesar atau padam" benar ${this.hl(pc(R.lepas_akurasi?.[0]))}`,
    "Tiap kasus mulai dari deteksi pertama saja, cuaca hari itu, model yang tidak pernah melihat tahun kasus", "klik baris untuk melihat ramalan vs yang dilihat satelit", tabel,
    `IoU = irisan/gabungan sel terbakar (termasuk sel awal); F1 = ketepatan sel baru saja. Luas 72 jam jatuh di rentang P10–P90 pada ${pc(R.cakupan_72)} kasus (ideal 80%). Cuaca = reanalisis ERA5 (seolah prakiraan sempurna). Sumber: scripts/sebaran/kasus.py.`,
    this.seg("sebUjiKelas", [["", "Semua"], ["besar", "Besar"], ["sedang", "Sedang"], ["kecil", "Tetap kecil"]]));
};
/* dialog kasus: dua kanvas sel (teramati per hari vs peluang ramalan) */
function dialogKasus(i) {
  const x = SEB.d.kasus.kasus[i], s = x.sel, NX = 14300, D = .003375;
  const semua = [...s.awal, ...s.obs.flat(), ...Object.keys(s.frek).map(Number)], ij = k => [k % NX, Math.floor(k / NX)];
  const I = semua.map(k => ij(k)[0]), J = semua.map(k => ij(k)[1]), i0 = Math.min(...I) - 2, i1 = Math.max(...I) + 2, j0 = Math.min(...J) - 2, j1 = Math.max(...J) + 2;
  const n = Math.max(i1 - i0, j1 - j0) + 1, px = Math.max(2, Math.floor(300 / n));
  const kanvas = (isi) => { const c = document.createElement("canvas"); c.width = c.height = n * px; const g = c.getContext("2d"); g.fillStyle = "#eef1f6"; g.fillRect(0, 0, c.width, c.height);
    isi((k, w) => { const [a, b] = ij(k); g.fillStyle = w; g.fillRect((a - i0) * px, (j1 - b) * px, px, px); }); return c.toDataURL(); };
  const HARI = ["#1d1d1d", "#f6c56a", "#e0663a", "#8f1d2c"];
  const obs = kanvas(f => { s.awal.forEach(k => f(k, HARI[0])); s.obs.forEach((xs, d) => xs.forEach(k => f(k, HARI[d + 1]))); });
  const pred = kanvas(f => { Object.entries(s.frek).forEach(([k, v]) => { const p = v[2] / 40; f(+k, `rgba(198,59,47,${Math.min(1, .15 + p)})`); }); s.awal.forEach(k => f(k, HARI[0])); });
  const d = $("#dlg");
  d.innerHTML = `<div class="dh"><div><h3 id="dlgJudul">${x.th} · ${esc(x.nama_prov)} · ${x.kelas}</h3><p>Mulai ${new Date(x.t0).toLocaleString("id-ID", {dateStyle: "medium", timeStyle: "short"})} UTC · ${x.gambut ? "gambut" : "tanah mineral"} · model ${x.model === "lipat" ? "tanpa tahun ini (lipatan)" : "2015–2022"}</p></div><button aria-label="Tutup" data-tutup>×</button></div>
    <div class="db"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><figure style="margin:0"><img src="${obs}" alt="Sel teramati" style="width:100%;image-rendering:pixelated;border-radius:8px"><figcaption class="fnd">Teramati VIIRS: hitam = awal, kuning/oranye/merah = hari 1/2/3</figcaption></figure>
      <figure style="margin:0"><img src="${pred}" alt="Peluang ramalan" style="width:100%;image-rendering:pixelated;border-radius:8px"><figcaption class="fnd">Ramalan: makin merah = makin mungkin terbakar dalam 72 jam (40 kemungkinan)</figcaption></figure></div>
      <p>Teramati 24/48/72 jam: <b>${x.obs_ha.map(fmt).join(" / ")} ha</b>; ramalan median ${x.pred_ha.map(v => fmt(v[1])).join(" / ")} ha (P10–P90 72 j: ${fmt(x.pred_ha[2][0])}–${fmt(x.pred_ha[2][2])}). IoU ${x.iou.map(v => fmt(Math.round(v * 100) / 100)).join(" / ")}, F1 ${x.f1.map(v => fmt(Math.round(v * 100) / 100)).join(" / ")}${x.arah_err != null ? `, salah arah ${fmt(Math.round(x.arah_err))}°` : ""}.
      Peluang membesar ${pc(x.p_lepas)} → ${x.lepas ? "memang membesar" : "memang tetap kecil"} (${x.lepas_benar ? "benar" : "salah"}).</p>
      <p class="fnd">Cuaca hari itu: angin ${fmt(x.cuaca.ws)} km/jam, RH min ${x.cuaca.rh_min}%, FFMC ${fmt(x.cuaca.ffmc)}, DC ${fmt(x.cuaca.dc)}, ${x.cuaca.hari_kering} hari tanpa hujan.</p></div>`;
  d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = e => { if (e.target === d) d.close(); }; d.showModal();
}

/* ---------- Di mana model masih keliru ---------- */
Insight.exSebGalat = function () {
  const G = SEB.d?.galat; if (!SEB.d) return tunggu("Di mana model masih keliru"); if (!G?.val) return "";
  const v = this.st.sebGalat, NAMA = {prov: "Provinsi", gambut: "Gambut (1) / mineral (0)", celah: "Lintasan tanpa deteksi (awan/asap)", lompat: "Porsi sel baru > 1,9 km (loncat)",
    awal: "Sel saat pertama terlihat", dc: "DC", ws: "Angin (km/jam)", hujan24: "Hujan 24 jam (mm)", konsesi: "Di konsesi (1)", bulan: "Bulan"};
  const tab = (src) => (src?.pecah?.[v] || []).map(r => `<tr><td>${esc(String(r.kelas))}</td><td class="n num">${fmt(r.n)}</td>
      <td class="n num" style="color:${r.bias_log_luas72 > .3 ? "var(--bad)" : r.bias_log_luas72 < -.3 ? "var(--info)" : "inherit"}">${r.bias_log_luas72 > 0 ? "+" : ""}${fmt(Math.round((Math.exp(r.bias_log_luas72) - 1) * 100))}%</td>
      <td class="n num">${fmt(Math.round(r.f1_mikro_24 * 100) / 100)}</td><td class="n num">${r.lolos_terlewat}</td><td class="n num">${r.lolos_palsu}</td></tr>`).join("");
  const th = `<thead><tr><th>${esc(NAMA[v] || v)}</th><th class="n">Titik awal</th><th class="n">Luas 72 j ramalan vs teramati</th><th class="n">F1 24 j</th><th class="n">Lolos terlewat</th><th class="n">Lolos palsu</th></tr></thead>`;
  const isi = `<div class="ex2"><div><p class="sub">Validasi 2023 (dipakai memperbaiki)</p><div class="tw"><table>${th}<tbody>${tab(G.val)}</tbody></table></div></div>
    ${G.uji ? `<div><p class="sub">Uji 2024–2026 (hanya dilaporkan)</p><div class="tw"><table>${th}<tbody>${tab(G.uji)}</tbody></table></div></div>` : ""}</div>
    <p class="sub" style="margin-top:12px">Kasus terburuk dan dugaan penyebabnya (validasi)</p><ul class="fnd" style="margin:4px 0;padding-left:18px">${G.val.terburuk.slice(0, 8).map(b => `<li>${esc(PROV_N(b.prov))}${b.gambut ? " (gambut)" : ""}: teramati ${fmt(b.obs72)} sel baru, ramalan ${fmt(b.pred72)} — ${esc(b.sebab.join("; "))}</li>`).join("")}</ul>`;
  const r = G.val.ringkas;
  return this.ex(`Model ${r.bias_rata > 0 ? "cenderung melebihkan" : "cenderung mengurangi"} luas 72 jam; titik yang tertutup awan/asap dan api yang 'meloncat' paling sering terlewat`,
    `${fmt(G.val.n)} titik awal validasi; ${pc(r.porsi_celah_2, 1)} kehilangan ≥ 2 lintasan VIIRS, ${pc(r.porsi_lompat_20, 1)} tumbuh lewat loncatan > 1,9 km`,
    "merah = ramalan terlalu besar, biru = terlalu kecil · pilih variabel", isi,
    "Perbaikan yang diterapkan dari analisis ini: pergeseran logit per strata (gambut/mineral/sabana) agar bias luas validasi ≈ 0, dan pemilihan model per strata (sabana memakai McArthur bila lebih baik di validasi). Yang belum bisa diperbaiki dengan data ini: pemadaman (tidak ada data operasi), awan/asap (butuh Himawari), api yang dinyalakan baru di dekatnya. Sumber: scripts/sebaran/galat.py.",
    this.seg("sebGalat", [["prov", "Provinsi"], ["gambut", "Gambut"], ["konsesi", "Konsesi"], ["celah", "Awan/asap"], ["lompat", "Loncat"], ["awal", "Ukuran awal"], ["dc", "DC"], ["ws", "Angin"], ["hujan24", "Hujan"]]));
};
const PROV_N = n => typeof n === "string" && /^\d+$/.test(n) ? namaProv(n) : n;

/* ---------- Kalau ada titik di X ---------- */
Insight.exSebModel = function () {
  const M = SEB.d?.model; if (!SEB.d) return tunggu("Kalau ada titik di X"); if (!M) return "";
  const K = M.kinerja_uji || {};
  const isi = `<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-sebke="sim">Buka Simulasi</button>${typeof Cerita !== "undefined" ? `<button class="btn" data-sebke="cerita">Coba di peta (cerita bab 5)</button>` : ""}</div>`;
  return this.ex(`Kalau besok ada titik api di X: model data memberi ${this.hl("peta peluang 72 jam")}, luas dengan rentang, dan desa/gambut yang terkena`,
    `Dilatih dari 12 musim VIIRS; uji 2024–2026: F1 sel baru 24 jam ${K.f1_24 ? fmt(Math.round(K.f1_24[0] * 100) / 100) : "–"}, AUC membesar ${K.lepas_auc != null ? fmt(Math.round(K.lepas_auc * 100) / 100) : "–"}`,
    "pilih kompleks di Simulasi lalu centang 'Model data (dilatih)', atau klik sembarang titik di cerita bab 5", isi,
    `${M.pohon.length} pohon keputusan, ${M.fitur.length} variabel (cuaca per jam, FWI, lahan, konsesi, kanal, jalan, desa). Peluang per jam = pembagian luas harian menurut ISI per jam (VIIRS hanya melihat ±2 kali sehari).`);
};

Insight.EX.splice(1, 0, "sebMusim", "sebDorong", "sebUji", "sebGalat", "sebModel");
/* klik: provinsi musim -> dialog kompleks pertama; baris kasus -> dialog; tombol ke Simulasi/cerita */
document.addEventListener("click", e => {
  const k = e.target.closest?.("[data-sebkasus]"); if (k) return dialogKasus(+k.dataset.sebkasus);
  const p = e.target.closest?.("[data-sebprov]"); if (p && SEB.d?.musim) { const o = SEB.d.musim.prov[p.dataset.sebprov], d = $("#dlg");
    d.innerHTML = `<div class="dh"><div><h3 id="dlgJudul">${esc(o.nama)}: musim 2026</h3><p>Mulai ${esc(o.awal_2026 || "–")} · puncak ${esc(o.puncak_2026 || "–")} · ${fmt(o.titik_2026)} titik VIIRS</p></div><button aria-label="Tutup" data-tutup>×</button></div>
      <div class="db"><div class="tw"><table><thead><tr><th>Kompleks besar</th><th>Mulai</th><th class="n">ha</th><th class="n">hari aktif</th></tr></thead><tbody>
      ${[...(o.pertama || []).map(x => ({...x, jenis: "pertama"})), ...(o.terbesar || []).map(x => ({...x, jenis: "terbesar"}))].map(x => `<tr><td>${esc(x.kab || "")}, ${esc(x.kec || "")} <small>(${x.jenis})</small></td><td>${new Date(x.t0).toLocaleDateString("id-ID", {day: "numeric", month: "short"})}</td><td class="n num">${fmt(x.ha)}</td><td class="n num">${x.hari}</td></tr>`).join("")}</tbody></table></div>
      <p class="fnd">Awal musim per tahun: ${Object.entries(o.per_tahun || {}).map(([y, v]) => `${y} ${v.awal || "–"}`).join(" · ")}</p></div>`;
    d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = ev => { if (ev.target === d) d.close(); }; return d.showModal(); }
  const b = e.target.closest?.("[data-sebke]"); if (b) { if (b.dataset.sebke === "sim") return bukaTab("sim");
    const box = document.querySelector('[data-ex="cerita"]') || document.querySelector('[data-ex="sebModel"]'); Cerita.buka(box).then(() => document.getElementById("ct-model")?.scrollIntoView()); }
});
document.addEventListener("keydown", e => { if (e.key === "Enter") { const k = e.target.closest?.("[data-sebkasus]"); if (k) dialogKasus(+k.dataset.sebkasus); } });
})();
