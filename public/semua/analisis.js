"use strict";
/* Kartu Insight di bawah kartu situasi /semua: Laporan kejadian, Outlook iklim, Bahaya 12 bulan, Bencana berantai.
   Data: /data/iklim_outlook.json (scripts/umum/iklim_outlook.py) dan /banjir/data/outlook12.json (scripts/umum/outlook12.py).
   Kartu yang datanya gagal dimuat dibuang diam-diam. Segmen urgent (aria-pressed), isi grafik menyusul lewat nanti(). */
const BL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"], BP = BL.map(b => b.slice(0, 3).replace("Mei", "Mei").replace("Agu", "Agu"));
const ang = (v, d = 0) => Number(v).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d}).replace("-", "−");
const bln = b => { const [y, m] = b.split("-"); return {y: +y, m: +m - 1}; };
const tglID = t => { const d = new Date(t + "T12:00:00Z"); return `${d.getUTCDate()} ${BP[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const getJson = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const MERAH = "#c9503a", BIRU = "#4f8fc4", ABU = "#9aa5b4";

/* ---------- 1. Outlook iklim: batang anomali hujan per wilayah, segmen = musim */
const NAMA_MUSIM = m => { const b = m.label.split(" - "); return b.map(s => s.split(" ")[0]); };
const rentang = p => { const [a, z] = p.label.split(" - ").map(s => s.split(" ")), th = a[1] === z[1] ? ` ${z[1]}` : ""; return `${a[0]}${th ? "" : " " + a[1]}–${z[0]} ${z[1]}`.replace(/\s+/g, " "); };
const legIklim = (I, p) => { const a = Object.keys(p.wilayah).map(w => lulus(I, p, w) ? p.wilayah[w].anom_pct : null);
  return [a.some(v => v != null && v < 0) && [MERAH, "Lebih kering dari normal"], a.some(v => v != null && v >= 0) && [BIRU, "Lebih basah dari normal"], a.includes(null) && [ABU, "Tidak teruji"]].filter(Boolean); };
/* tampil: fit lolos uji balik (f.lulus, skill LOO > 0,1) DAN rentang prakiraan lebih sempit dari iklim biasa (wilayah.tampil) */
const lulus = (I, p, w) => { const f = I.fit?.[p.musim]?.[w]; return !!f && (f.lulus ?? f.skill_loo > 0.1) && p.wilayah?.[w]?.tampil !== false; };

function iklimIsi(I, p) {
  const ws = Object.keys(p.wilayah).sort((a, b) => (a === "nasional") - (b === "nasional") || p.wilayah[a].anom_pct - p.wilayah[b].anom_pct);
  const nama = w => w === "nasional" ? "Indonesia" : I.wilayah[w].nama;
  const M = innerWidth < 640, lr = M ? 112 : 150, W = M ? 380 : 940, L = lr + 14, R = M ? 10 : 20, h = 30, T = 14, H = T + ws.length * h + 8;
  const oks = ws.filter(w => lulus(I, p, w)).map(w => p.wilayah[w]), lo = Math.min(-10, ...oks.map(a => a.p10)) - 22, hi = Math.max(10, ...oks.map(a => a.p90)) + 22;
  const sk = (W - L - R) / (hi - lo), mid = L - lo * sk;
  const X = v => mid + v * sk;
  const g = ws.map((w, i) => { const a = p.wilayah[w], y = T + i * h, ok = lulus(I, p, w), f = I.fit[p.musim][w];
    const tip = `<b>${esc(nama(w))}</b><br>Anomali hujan: ${ok ? (a.anom_pct > 0 ? "+" : "−") + ang(Math.abs(a.anom_pct)) + "%" : "tidak teruji"}<br>Rentang 10 sampai 90%: ${ok ? ang(a.p10) + "% sampai " + ang(a.p90) + "%" : "tidak ditampilkan"}<br>Skill uji balik: ${ang(f.skill_loo, 2)}`;
    const lab = `<text x="${lr}" y="${y + 19}" text-anchor="end" font-size="${M ? 11 : 12.5}" font-weight="${w === "nasional" ? 800 : 600}" fill="currentColor">${esc(nama(w))}</text>`;
    if (!ok) return `<g data-tip="${esc(tip)}">${lab}<text x="${X(0) + 8}" y="${y + 19}" font-size="12" font-style="italic" fill="${ABU}">tidak teruji</text><rect x="${L}" y="${y}" width="${W - L}" height="${h}" fill="transparent"/></g>`;
    const x0 = X(Math.min(0, a.anom_pct)), bw = Math.abs(X(a.anom_pct) - X(0)), neg = a.anom_pct < 0, tx = neg ? X(a.p10) - 6 : X(a.p90) + 6;
    return `<g class="gy" style="--i:${i}" data-tip="${esc(tip)}">${lab}<rect x="${x0}" y="${y + 5}" width="${Math.max(2, bw)}" height="${h - 12}" rx="4" fill="${neg ? MERAH : BIRU}" opacity="${w === "nasional" ? 1 : .8}"/>
      <line x1="${X(a.p10)}" x2="${X(a.p90)}" y1="${y + h / 2 - 1}" y2="${y + h / 2 - 1}" stroke="currentColor" stroke-width="1.6" opacity=".55"/>
      <text x="${tx}" y="${y + 19}" text-anchor="${neg ? "end" : "start"}" font-size="12" font-weight="800" fill="currentColor" pointer-events="none">${a.anom_pct > 0 ? "+" : "−"}${ang(Math.abs(a.anom_pct))}%</text>
      <rect x="${L}" y="${y}" width="${W - L}" height="${h}" fill="transparent"/></g>`; }).join("");
  return `<div class="tw"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Anomali hujan ${esc(rentang(p))} per wilayah"><line x1="${X(0)}" x2="${X(0)}" y1="${T - 4}" y2="${H - 4}" stroke="currentColor" opacity=".35"/>${g}</svg></div>`;
}

function kartuIklim(I, st) {
  const P = I.prakiraan.filter(p => p.horizon_bulan <= 2 && lulus(I, p, "nasional")); if (!P.length) return "";
  const p = P.find(x => x.musim === st.musim) || P[0], n = p.wilayah.nasional.anom_pct, mirip = p.pembanding.slice(0, 3).map(x => x.tahun);
  const jd = `Hujan ${esc(rentang(p))} di Indonesia diperkirakan ${Kartu.hl(ang(Math.abs(n)) + "%")} ${n < 0 ? "di bawah" : "di atas"} normal, mirip ${mirip.length > 1 ? mirip.slice(0, -1).join(", ") + ", dan " + mirip.at(-1) : mirip[0]}`;
  const seg = P.length > 1 ? Kartu.seg("musim", P.map(x => [x.musim, NAMA_MUSIM(x).join("–")]), {musim: p.musim}) : "";
  return Kartu.kartu("Outlook iklim", jd, `<div id="ob-iklim">${iklimIsi(I, p)}</div>`, "CHIRPS, NOAA RONI dan DMI", seg, legIklim(I, p));
}

/* ---------- 2. Bahaya 12 bulan: heatmap bahaya x bulan */
const TK = {"tidak ada": ["Tidak ada", "", "var(--surface)", "var(--ink2)"], rendah: ["Rendah", "Rendah", "#cfe5d6", "#1e4d33"], sedang: ["Sedang", "Sedang", "#f3dc8e", "#5a4300"], parah: ["Parah", "Parah", "#e58a45", "#3b1b00"], ekstrem: ["Ekstrem", "Ekstrem", "#c9503a", "#fff"]};
const RANK = ["tidak ada", "rendah", "sedang", "parah", "ekstrem"];
const NAMA_B = {banjir: "Banjir", longsor: "Tanah longsor", karhutla: "Karhutla", gempa: "Gempa M6+"};

function rentangBulan(bs) { const a = bln(bs[0]), z = bln(bs.at(-1)); return a.y === z.y ? `${BL[a.m]}${bs.length > 1 ? " sampai " + BL[z.m] : ""} ${z.y}` : `${BL[a.m]} ${a.y} sampai ${BL[z.m]} ${z.y}`; }
function judulBahaya(O) {
  const bagian = O.tabel.filter(t => t.bulan.some(b => RANK.indexOf(b.tingkat) >= 3)).map(t => {
    const top = Math.max(...t.bulan.map(b => RANK.indexOf(b.tingkat))), runs = []; let cur = [];
    t.bulan.forEach(b => { if (RANK.indexOf(b.tingkat) === top) cur.push(b.b); else if (cur.length) { runs.push(cur); cur = []; } }); if (cur.length) runs.push(cur);
    runs.sort((a, b) => b.length - a.length); return {top, nama: NAMA_B[t.bahaya] || t.nama, kata: RANK[top], r: runs[0]}; }).sort((a, b) => b.top - a.top).slice(0, 2);
  if (!bagian.length) return "";
  return bagian.map((x, i) => `${i ? x.nama.toLowerCase() : x.nama} ${i ? "" : "diperkirakan "}${x.kata} ${Kartu.hl(rentangBulan(x.r))}`).join("; ").replace(/\s{2,}/g, " ");
}

function kartuBahaya(O, LJ) {
  const T = O.tabel.filter(t => t.bulan?.length && (t.dasar !== "laju_tetap" || LJ?.nasional?.m6 && LJ.nasional.m7)), B = O.bulan; if (!T.length || !B?.length) return "";
  const jd = judulBahaya(O) || "Belum ada bahaya berstatus parah dalam 12 bulan ke depan";
  const kepala = `<tr><th scope="col">Bahaya</th>${B.map(b => { const x = bln(b); return `<th scope="col">${BP[x.m]}<small>${x.y}</small></th>`; }).join("")}</tr>`;
  const tipSel = (t, b) => { const x = bln(b.b), tk = TK[b.tingkat]; let o = `<b>${esc(NAMA_B[t.bahaya] || t.nama)}, ${BL[x.m]} ${x.y}</b>`;
    o += `<br>Tingkat: ${tk[0]}<br>Indeks E: ${ang(b.E, 2)}`;
    if (b.E_analog != null) o += `<br>Analog: ${ang(b.E_analog, 2)} dari ${b.tahun.length} tahun`;
    o += `<br>Dasar: ${t.dasar === "analog" ? "tahun pembanding" : "klimatologi"}`; if (t.tahun_data) o += `<br>Data: ${t.tahun_data[0]} sampai ${t.tahun_data[1]}`;
    if (b.ekstrapolasi) o += `<br>Catatan: lebih dari 3 bulan, kurang pasti`; return o; };
  const baris = T.map(t => {
    if (t.dasar === "laju_tetap") { const m6 = LJ.nasional.m6, m7 = LJ.nasional.m7, p6 = 1 - Math.exp(-m6.per_tahun / 12), p7 = 1 - Math.exp(-m7.per_tahun / 12),
        tip = `<b>${esc(t.nama.replace(" dangkal", ""))}</b><br>Laju tetap: ${ang(m6.per_tahun, 1)} kejadian M6+ per tahun<br>Laju M7+: ${ang(m7.per_tahun, 2)} per tahun<br>Kejadian: ${ang(m6.n)} M6+ dan ${ang(m7.n)} M7+<br>Data: USGS ${esc(LJ.periode)}, semua kedalaman`;
      return `<tr><th scope="row">Gempa M6+</th><td colspan="${B.length}" class="hm-tetap" data-tip="${esc(tip)}">Laju tetap sepanjang tahun: peluang sedikitnya satu gempa M6+ ${Kartu.hl(ang(p6 * 100) + "%")} dan M7+ ${Kartu.hl(ang(p7 * 100) + "%")} tiap bulan</td></tr>`; }
    return `<tr><th scope="row">${esc(NAMA_B[t.bahaya] || t.nama)}</th>${B.map(k => { const b = t.bulan.find(x => x.b === k); if (!b) return "<td></td>"; const tk = TK[b.tingkat] || TK["tidak ada"];
      return b.tingkat === "tidak ada" ? `<td class="hm-n" data-tip="${esc(tipSel(t, b))}"></td>` : `<td class="hm-c${b.ekstrapolasi ? " ek" : ""}" style="background:${tk[2]};color:${tk[3]}" data-tip="${esc(tipSel(t, b))}">${tk[1]}</td>`; }).join("")}</tr>`; }).join("");
  const PT = O.pasang_tertinggi?.per_bulan, pasang = PT ? `<tr><th scope="row">Pasang tertinggi</th>${B.map(k => { const w = (PT[k] || []).slice().sort((a, b) => b.indeks - a.indeks)[0]; if (!w) return "<td></td>";
    const tip = (PT[k] || []).map(x => `${x.profil === "pantura" ? "Pantura" : "Pesisir lain"}: ${tglID(x.awal)} sampai ${tglID(x.akhir)}`).join("<br>");
    return `<td class="hm-p" data-tip="${esc(`<b>Pasang tertinggi, ${BL[bln(k).m]} ${bln(k).y}</b><br>Puncak: ${tglID(w.puncak)}<br>${tip}<br>Indeks puncak: ${ang(w.indeks, 2)} (ambang ${ang(w.ambang, 2)})<br>Indeks gaya astronomis, bukan tinggi air`)}"><span>${+w.puncak.slice(8)} ${BP[bln(k).m]}</span></td>`; }).join("")}</tr>` : "";
  const tabel = `<div class="hm-w"><table class="hm"><thead>${kepala}</thead><tbody>${baris}${pasang}</tbody></table></div>`;
  return Kartu.kartu("Bahaya 12 bulan", jd, tabel, "DIBI BNPB, titik panas MODIS, USGS, tahun pembanding RONI dan DMI", "", RANK.filter(k => T.some(t => t.dasar !== "laju_tetap" && t.bulan.some(b => b.tingkat === k))).map(k => [TK[k][2], TK[k][0]]));
}

/* ---------- 3. Bencana berantai: persentase B menyusul A, penanda = peluang kebetulan */
const NAMA_K = {banjir: "Banjir", longsor: "Tanah longsor", cuaca: "Cuaca ekstrem", kering: "Kekeringan", gelombang: "Gelombang pasang", bandang: "Banjir bandang", rob: "Rob", karhutla: "Karhutla", gempa: "Gempa"};
function kartuBerantai(O) {
  const P = O.berantai?.pasangan; if (!P?.length) return "";
  const k = x => NAMA_K[x] || x, a = P[0], pr = a.preseden, d = pr.tanggal_a.slice(0, 7), x = bln(d);
  const jd = `${k(a.b)} menyusul ${Kartu.hl(ang(a.frac * 100) + "%")} kejadian ${k(a.a).toLowerCase()} dalam 30 hari, ${Kartu.hl(ang(a.lift, 1) + " kali")} lebih sering dari kebetulan; terbesar di ${esc(pr.prov)}, ${BL[x.m]} ${x.y} (${ang(pr.meninggal_a + pr.meninggal_b)} meninggal)`;
  const M = innerWidth < 640, W = M ? 380 : 940, L = M ? 176 : 230, R = M ? 62 : 200, h = 38, T = 8, H = T + P.length * h + 4, X = f => L + f * (W - L - R);
  const g = P.map((p, i) => { const y = T + i * h, q = p.preseden, tip = `<b>${esc(k(p.a))} lalu ${esc(k(p.b).toLowerCase())}</b><br>Menyusul dalam 30 hari: ${ang(p.frac * 100, 1)}%<br>Peluang kebetulan: ${ang(p.peluang_acak * 100, 1)}%<br>Lift: ${ang(p.lift, 2)} kali<br>Pasangan: ${ang(p.n_lalu_b)} dari ${ang(p.n_a)} kejadian<br>Preseden: ${esc(q.prov)}, ${tglID(q.tanggal_a)}, ${q.kab_a.slice(0, 3).map(esc).join(", ")}, ${ang(q.meninggal_a)} meninggal<br>Disusul ${esc(k(p.b).toLowerCase())}: ${tglID(q.tanggal_b[0])}${q.tanggal_b.length > 1 ? " sampai " + tglID(q.tanggal_b.at(-1)) : ""}, ${q.kab_b.slice(0, 3).map(esc).join(", ")}, ${ang(q.meninggal_b)} meninggal`;
    return `<g class="gy" style="--i:${i}" data-tip="${esc(tip)}"><text x="${L - 12}" y="${y + 23}" text-anchor="end" font-size="${M ? 10.5 : 12.5}" font-weight="600" fill="currentColor">${esc(k(p.a))} → ${esc(k(p.b))}</text>
      <rect x="${L}" y="${y + 7}" width="${X(p.frac) - L}" height="${h - 16}" rx="4" fill="${i ? "#4f8fc4" : MERAH}" opacity="${i ? .8 : 1}"/>
      <line x1="${X(p.peluang_acak)}" x2="${X(p.peluang_acak)}" y1="${y + 3}" y2="${y + h - 5}" stroke="currentColor" stroke-width="2" opacity=".7"/>
      <text x="${X(p.frac) + 8}" y="${y + 23}" font-size="${M ? 10.5 : 12}" font-weight="800" fill="currentColor" pointer-events="none">${ang(p.frac * 100)}% · ${ang(p.lift, 1)}${M ? "×" : " kali"}</text>
      <rect x="0" y="${y}" width="${W}" height="${h}" fill="transparent"/></g>`; }).join("");
  const svg = `<div class="tw"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pasangan bencana berantai"><line x1="${L}" x2="${L}" y1="${T}" y2="${H - 4}" stroke="currentColor" opacity=".3"/>${g}</svg></div>`;
  return Kartu.kartu("Bencana berantai", jd, svg, "DIBI BNPB tiga tahun terakhir", "", [[MERAH, "Disusul bencana kedua dalam 30 hari"], ["currentColor", "Peluang kebetulan"]]);
}

/* ---------- 3b. Laporan kejadian otomatis: kab/kota yang menembus Siaga (scripts/umum/laporan_kejadian.py, index kejadian/1 per modul).
   Segmen saring per bencana + paginasi 10 baris (paginasi dari inti/tabel.js); kontrol urgent, isi kartu menyusul lewat nanti() */
const MODUL_KJ = {banjir: "Banjir dan longsor", cuaca: "Cuaca ekstrem", udara: "Kualitas udara", kekeringan: "Kekeringan"};
const WARNA_B = {banjir: "#4f9be0", cuaca: "#7d8ca3", udara: "#4a9d9c", kekeringan: "#c8892b"}, PER_KJ = 10;
const tglP = t => { const d = new Date(t + "T12:00:00Z"); return `${d.getUTCDate()} ${BP[d.getUTCMonth()]}`; };
const pilStatus = e => !e.aktif ? `<span class="pl" style="--w:${ABU}">Selesai</span>` : e.tingkat === "awas" ? `<span class="pl" style="--w:#8f2d1f">Awas</span>` : `<span class="pl" style="--w:${MERAH}">Siaga</span>`;
function kartuKejadian(L, st) {
  if (!L.length) return "";
  const ada = Object.keys(MODUL_KJ).filter(m => L.some(e => e.modul === m)), F = st.b && ada.includes(st.b) ? L.filter(e => e.modul === st.b) : L;
  const a = F.filter(e => e.aktif), arsip = F.length - a.length, hal = Math.min(st.hal, Math.max(0, Math.ceil(F.length / PER_KJ) - 1));
  /* kolom pembeda (bencana, status) di depan: tetap terlihat di layar sempit, provinsi di ujung */
  const baris = F.slice(hal * PER_KJ, hal * PER_KJ + PER_KJ).map(e => `<tr><td><a href="${esc(e.url)}" translate="no">${esc(e.kab)}</a></td>
    <td><span class="pl" style="--w:${WARNA_B[e.modul] || ABU}">${esc(MODUL_KJ[e.modul] || e.modul)}</span></td><td>${pilStatus(e)}</td>
    <td class="n">${e.mulai ? esc(tglP(e.mulai)) : "–"}</td><td class="n">${esc(tglP(e.terakhir))}</td><td>${esc(e.nilai)}</td><td>${esc(e.prov_nama || "")}</td></tr>`).join("");
  const nb = st.b && ada.includes(st.b) ? ` ${esc(MODUL_KJ[st.b].toLowerCase())}` : "";
  const jd = a.length ? `${Kartu.hl(ang(a.length) + " kab/kota")} sedang Siaga${nb} dan punya laporan kejadian otomatis${arsip ? `, ${ang(arsip)} laporan lain sudah selesai` : ""}`
    : `Tidak ada kab/kota Siaga${nb} hari ini; ${ang(arsip)} laporan kejadian terakhir masih bisa dibuka`;
  const seg = ada.length > 1 ? Kartu.seg("kjb", [["", `Semua (${ang(L.length)})`], ...ada.map(m => [m, `${MODUL_KJ[m]} (${ang(L.filter(e => e.modul === m).length)})`])], {kjb: st.b}) : "";
  return Kartu.kartu("Laporan kejadian", jd, `<div class="tw kj-tw"><table class="kj-tb"><thead><tr><th>Kab/kota</th><th>Bencana</th><th>Status</th><th class="n">Mulai</th><th class="n">Terakhir</th><th>Pemicu</th><th>Provinsi</th></tr></thead><tbody>${baris}</tbody></table></div>${typeof paginasi === "function" ? paginasi(hal, F.length, PER_KJ, "laporan") : ""}`,
    "laporan harian modul Pantau Bencana (banjir, cuaca, kualitas udara, kekeringan)", seg);
}

/* ---------- 4. Cara hitung dan batasan: satu blok terlipat */
const daftar = a => `<ul class="mt-ul">${(a || []).map(s => `<li>${esc(s)}</li>`).join("")}</ul>`;
function cara(I, O) {
  const bag = [];
  if (I) bag.push(`<span class="mt-lbl">Outlook iklim</span>${daftar([`Hujan musiman dihubungkan dengan RONI (Pasifik) dan DMI (Samudra Hindia) lewat regresi ${I.tahun_fit[0]} sampai ${I.tahun_fit[1]}; anomali terhadap rerata ${I.basis_klimatologi[0]} sampai ${I.basis_klimatologi[1]}.`, "Wilayah dengan skill uji balik nol atau negatif ditandai tidak teruji dan tidak diprakirakan.", `Mirip dengan tahun pembanding: lima tahun terdekat di ruang RONI dan DMI pada musim yang sama.`])}${daftar(I.batasan)}`);
  if (O) bag.push(`<span class="mt-lbl">Bahaya 12 bulan</span>${daftar([O.definisi_tingkat?.indeks, ...Object.entries(O.definisi_tingkat?.batas || {}).map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${v}`), O.definisi_tingkat?.analog_dipakai_bila && `Tahun pembanding dipakai bila ${O.definisi_tingkat.analog_dipakai_bila}.`, O.definisi_tingkat?.catatan].filter(Boolean))}${daftar(O.dasar?.dilewati?.length ? ["Bahaya yang dilewati karena data belum ada: " + O.dasar.dilewati.map(s => s.split(":")[0]).join(", ") + "."] : [])}
    <span class="mt-lbl">Bencana berantai</span>${daftar([O.berantai?.aturan])}${daftar(O.batasan)}`);
  return bag.length ? `<details class="mt-sek cara"><summary><span class="mt-jd"><b>Cara hitung dan batasan</b></span></summary><div class="mt-isi">${bag.join("")}</div></details>` : "";
}

/* ---------- pasang */
export async function pasangAnalisis(el) {
  const [I, O, LJ, KB, KC, KU, KK] = await Promise.all([getJson("/data/iklim_outlook.json"), getJson("/banjir/data/outlook12.json"), getJson("/gempa/data/laju.json"),
    getJson("/banjir/data/kejadian/index-banjir.json"), getJson("/banjir/data/kejadian/index-cuaca.json"), getJson("/udara/data/kejadian/index-udara.json"),
    getJson("/data/kejadian/index-kekeringan.json")]);
  const KJ = [KB, KC, KU, KK].filter(k => k?.versi === "kejadian/1").flatMap(k => k.laporan).sort((x, y) => (y.aktif - x.aktif) || ((y.tingkat === "awas") - (x.tingkat === "awas")) || (y.terakhir > x.terakhir) - (y.terakhir < x.terakhir) || x.kab.localeCompare(y.kab, "id"));
  const iOk = I?.versi?.startsWith("iklim_outlook/") && I.prakiraan?.length, oOk = O?.versi?.startsWith("outlook12/") && O.tabel?.length;
  const st = {musim: ""}, kj = {b: "", hal: 0};
  const isi = [KJ.length ? `<div id="kj-kartu">${kartuKejadian(KJ, kj)}</div>` : "", iOk ? kartuIklim(I, st) : "", oOk ? kartuBahaya(O, LJ) : "", oOk ? kartuBerantai(O) : ""].join("");
  if (!isi.trim()) return;
  el.innerHTML = isi + cara(iOk ? I : null, oOk ? O : null);
  if (typeof pasangTip === "function") pasangTip();
  el.addEventListener("click", e => {
    const k = e.target.closest("#kj-kartu [data-set='kjb'], #kj-kartu .pgn-b[data-h]");
    if (k) { if (k.disabled) return;
      if (k.dataset.set) { k.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === k))); kj.b = k.dataset.v; kj.hal = 0; }   /* chrome urgent */
      else kj.hal = +k.dataset.h;
      return nanti(() => { $("#kj-kartu").innerHTML = kartuKejadian(KJ, kj); }); }                                                                   /* isi menyusul */
    const b = e.target.closest("[data-set='musim']"); if (!b || !iOk) return;
    b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));       /* chrome urgent */
    st.musim = b.dataset.v;
    nanti(() => { const p = I.prakiraan.find(x => x.musim === st.musim); if (!p) return;                            /* isi menyusul */
      $("#ob-iklim").innerHTML = iklimIsi(I, p);
      const kI = $("#ob-iklim").closest(".ex");
      kI.querySelector(".ex-leg").innerHTML = legIklim(I, p).map(([w, n]) => `<span><i style="background:${w}"></i>${n}</span>`).join("");
      const n = p.wilayah.nasional.anom_pct, mirip = p.pembanding.slice(0, 3).map(x => x.tahun);
      kI.querySelector("h3").innerHTML = `Hujan ${esc(rentang(p))} di Indonesia diperkirakan ${Kartu.hl(ang(Math.abs(n)) + "%")} ${n < 0 ? "di bawah" : "di atas"} normal, mirip ${mirip.slice(0, -1).join(", ")}, dan ${mirip.at(-1)}`; }); });
}
