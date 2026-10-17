"use strict";
/* laporan.js: halaman /laporan (Laporan Harian Karhutla). Membaca /data/laporan.json apa adanya (skema: pipa-data, scripts/data/laporan.py);
   tidak menghitung ulang angka pipeline, hanya selisih/persentase tampilan. Butuh inti/format.js, kartu.js, pilih.js, tip.js, tabel.js. */
const LEVEL = ["Pencegahan rutin", "Patroli terpadu", "Siaga pemadaman awal", "Prioritas pemadaman"];
const PER = 20;
const st = {hari: null, manual: false, rentang: 14, cari: "", provK: "", provM: "", cetak: false,
  p: {urut: "t", turun: true, hal: 0}, k: {urut: "t", turun: true, hal: 0}};
let D = null;

/* kerja berat ditunda: kontrol diperbarui dulu (urgent), render sesudah satu frame */
/* klik beruntun pada kontrol yang sama digabung: fn yang sudah antre tidak diantre lagi (st sudah mutakhir saat fn jalan) */
const antre = new Set();
const nanti = fn => { if (antre.has(fn)) return; antre.add(fn); let ok = false; const go = () => { if (!ok) { ok = true; antre.delete(fn); fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const tt = s => String(s ?? "").replace(/\s*[—–]\s*/g, ", ");
const tgl = s => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "UTC"});
const tglPanjang = s => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
const sum = (a, n) => a.slice(0, n + 1).reduce((x, y) => x + (y || 0), 0);
const IK_CETAK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3.5h10V9M7 17H4.5v-7h15v7H17M7 14h10v6.5H7z"/></svg>';
const IK_NAIK = '<path d="M6 14l4-4 3 3 5-6"/>';

/* perubahan: ▲ merah (naik = lebih buruk) / ▼ hijau; tanpa pembanding atau sama-sama nol = "–" */
function ubah(n, p) {
  if (p == null || n == null) return "–";
  if (!p) return n ? '<span class="naik">▲ baru</span>' : "–";
  const v = Math.round((n - p) / p * 100);
  return v > 0 ? `<span class="naik">▲ ${fmt(v)}%</span>` : v < 0 ? `<span class="turun">▼ ${fmt(-v)}%</span>` : "0%";
}
const ubahTeks = (n, p) => { if (!p) return ""; const v = Math.round((n - p) / p * 100); return v > 0 ? `<span class="naik">▲ ${fmt(v)}%</span>` : v < 0 ? `<span class="turun">▼ ${fmt(-v)}%</span>` : "tetap"; };

const idx = () => D.hari.indexOf(st.hari);
const sementara = () => st.hari === D.hari_berjalan;
const pilLv = l => `<span class="lp-lv lv${l}">${LEVEL[l] || "–"}</span>`;

/* ---------- baris data ---------- */
function barisDari(o, i, w) {
  const tp = i > 0 ? o.titik[i - 1] : null, lp = i > 0 ? o.luas[i - 1] : null, t = o.titik[i], l = o.luas[i];
  const b = iB();
  return {t, tp, tb: b > 0 && i === b - 1 ? o.titik[b] : null, db: b > 0 && i === b - 1 ? o.titik[b] - t : null, dt: tp == null ? null : t - tp, l, lp, dl: lp == null ? null : l - lp, kum: sum(o.baru, i),
    kompleks: o.kompleks ?? null, lk: o.luas_kompleks ?? null, level: o.level ?? null, ada: sum(o.titik.slice(Math.max(0, i - w + 1)), w) + sum(o.luas.slice(Math.max(0, i - w + 1)), w) };
}
const jendela = () => Math.min(st.rentang, 30);
function barisProv(i = idx()) {
  const w = jendela();
  return Object.entries(D.prov).map(([kode, o]) => ({kode, nama: o.nama, ...barisDari(o, i, w), sip: o.sipongi_ha ?? null, pad: o.padam_ha ?? null}))
    .filter(r => r.ada > 0);
}
function barisKab(i = idx()) {
  const w = jendela();
  return D.kab.map(o => ({kode: o.prov, prov: D.prov[o.prov]?.nama || "", nama: o.nama, ...barisDari(o, i, w), fwi: o.fwi_maks ?? null}))
    .filter(r => r.ada > 0);
}
function urut(a, s) {
  const k = s.urut, teks = k === "nama" || k === "prov";
  return a.slice().sort((x, y) => {
    const c = teks ? String(x[k]).localeCompare(String(y[k]), "id") : (x[k] ?? -Infinity) - (y[k] ?? -Infinity);
    return (s.turun ? -c : c) || String(x.nama).localeCompare(String(y.nama), "id");
  });
}

/* ---------- grafik SVG ---------- */
const WARNA_TOT = "#33507a", WARNA_SEL = "#c9503a";
function batang(hari, vals, sel, satuan) {
  const W = 900, H = 290, pb = 30, pt = 62, n = hari.length, slot = W / n, bw = Math.min(46, slot * .62), mx = Math.max(...vals, 1), gy = v => pt + (H - pt - pb) * (1 - v / mx);
  let s = `<line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}" style="stroke:var(--line)" stroke-width="1.5"/>`;
  hari.forEach((h, i) => {
    const v = vals[i] ?? 0, cx = slot * i + slot / 2, y = gy(v), on = h === sel, sm = h === D.hari_berjalan, ix = D.hari.indexOf(h);
    const p = ix > 0 ? ubahTeks(v, satuan.arr[ix - 1]) : "";
    const tip = `<b>${tgl(h)}${sm ? " (sementara)" : ""}</b><br>${satuan.nama}: ${fmt(v)} ${satuan.u}${p ? `<br>Perubahan: ${p}` : ""}`.replace(/"/g, "&quot;");
    s += `<g data-tip="${tip}"><rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${Math.max(2, H - pb - y)}" rx="5" style="fill:${on ? WARNA_SEL : WARNA_TOT}" opacity="${sm ? .55 : 1}"/>`
      + Kartu.pil(cx - (String(fmt(v)).length * 6.6 + 16) / 2, y - 25, fmt(v), on ? WARNA_SEL : "#0b2545", "#fff", 11)[0]
      + pilPersen(cx, y - 49, v, ix > 0 ? satuan.arr[ix - 1] : null)
      + `<text class="lp-sb${on ? " on" : ""}" x="${cx}" y="${H - 8}" text-anchor="middle">${tgl(h)}</text></g>`;
  });
  return `<div class="lp-gr"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(satuan.nama)} per hari">${s}</svg></div>`;
}
/* sm = panel hari berjalan (batang pudar seperti batang belum final di grafik harian); mx dipakai bersama supaya dua panel sebanding */
function batangMendatar(rows, W = 1300, sm = false, mx = Math.max(...rows.map(r => r.v), 1)) {
  const bh = 26, g = 8, H = rows.length * (bh + g) + 6, x0 = W > 900 ? 250 : 200;
  let s = "";
  rows.forEach((r, i) => {
    const y = i * (bh + g) + 3, w = Math.max(4, (W - x0 - 110) * r.v / mx), nm = r.nama.length > 30 ? r.nama.slice(0, 29) + "…" : r.nama;
    s += `<g data-tip="${esc(`<b>${r.nama}</b><br>Provinsi: ${r.prov}<br>Titik: ${fmt(r.t)}<br>Sebelumnya: ${fmt(r.tp)}<br>Perubahan: ▲ ${fmt(r.v)} titik`)}">`
      + `<text x="${x0 - 10}" y="${y + bh / 2 + 4}" text-anchor="end" font-size="12.5" font-weight="600">${esc(nm)}</text>`
      + `<rect x="${x0}" y="${y}" width="${w}" height="${bh}" rx="6" style="fill:${WARNA_TOT}"${sm ? ' opacity=".55"' : ""}/>`
      + Kartu.pil(x0 + w + 8, y + 3, "▲ " + fmt(r.v), WARNA_SEL, "#fff", 12)[0] + "</g>";
  });
  return `<div class="lp-gr${W > 900 ? " lp-gr-h" : ""}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kenaikan titik terbesar">${s}</svg></div>`;
}

/* pil perubahan harian di atas batang: ▲ merah naik, ▼ hijau turun, abu tetap; tanpa pembanding tidak digambar */
function pilPersen(cx, y, v, p) {
  if (p == null) return "";
  const n = !p ? null : Math.round((v - p) / p * 100), t = n == null ? (v ? "▲ baru" : "0%") : n > 0 ? `▲ ${fmt(n)}%` : n < 0 ? `▼ ${fmt(-n)}%` : "0%";
  const bg = n > 0 || (n == null && v) ? "#fbe3de" : n < 0 ? "#dcefed" : "var(--surface)", fg = n > 0 || (n == null && v) ? "#b8392b" : n < 0 ? "#1f6f6a" : "currentColor";
  return Kartu.pil(cx - (t.length * 6 + 16) / 2, y, t, bg, fg, 10)[0];
}
/* batang per provinsi hari terpilih: titik (batang), luas, perubahan harian; rincian lengkap di tooltip */
function batangProv(rows, W = 1300, mxG = 0) {
  const bh = 28, g = 8, H = rows.length * (bh + g) + 6, x0 = 230, mx = mxG || Math.max(...rows.map(r => r.t), 1), i = idx();
  const kem = i > 0 ? tgl(D.hari[i - 1]) : "";
  return `<div class="lp-gr lp-gr-h"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Titik panas per provinsi">${rows.map((r, j) => {
    const y = j * (bh + g) + 3, w = Math.max(3, (W - x0 - 330) * r.t / mx), ub = (n, q) => q == null ? "–" : !q ? (n ? "▲ baru" : "–") : (v => v > 0 ? `▲ ${fmt(v)}%` : v < 0 ? `▼ ${fmt(-v)}%` : "0%")(Math.round((n - q) / q * 100));
    const tip = `<b>${r.nama}</b> · ${tgl(st.hari)}<br>Titik panas: ${fmt(r.t)}${kem ? `<br>Titik ${kem}: ${fmt(r.tp)}<br>Perubahan titik: ${ub(r.t, r.tp)}` : ""}<br>Luas indikasi: ${fmt(r.l)} ha${kem ? `<br>Perubahan luas: ${ub(r.l, r.lp)}` : ""}<br>Kumulatif: ${fmt(r.kum)} ha<br>Kejadian api: ${fmt(r.kompleks)}<br>Status: ${LEVEL[r.level] || "–"}`;
    let x = x0 + w + 8, o = `<g data-tip="${esc(tip)}"><text x="${x0 - 10}" y="${y + bh / 2 + 4}" text-anchor="end" font-size="12.5" font-weight="600">${esc(r.nama)}</text>`
      + `<rect x="${x0}" y="${y}" width="${w}" height="${bh}" rx="6" style="fill:${WARNA_TOT}"/>`;
    const [a, wa] = Kartu.pil(x, y + 4, fmt(r.t) + " titik", "#0b2545", "#fff", 11.5); o += a; x += wa + 6;
    o += pilPersen(x + (ub(r.t, r.tp).length * 6 + 16) / 2, y + 4, r.t, r.tp); x += ub(r.t, r.tp).length * 6 + 22;
    const [b] = Kartu.pil(x, y + 4, fmt(r.l) + " ha", "var(--surface)", "currentColor", 11); o += b;
    return o + "</g>"; }).join("")}</svg></div>`;
}
function kartuProvGrafik() {
  const P = Kartu.provDipilih("provM", st), semuaRows = barisProv(), rows = semuaRows.filter(r => !P.length || P.includes(r.kode)).sort((a, b) => b.t - a.t);
  const kode = semuaRows.map(r => r.kode).sort((a, b) => D.prov[a].nama.localeCompare(D.prov[b].nama, "id"));
  const naik = rows.filter(r => r.tp != null && r.t > r.tp).length;
  const j = rows.length ? poinBerjalan(`Titik panas naik di ${Kartu.hl(fmt(naik) + " dari " + fmt(rows.length))} provinsi pada ${tgl(st.hari)}${idx() > 0 ? ` dibanding ${tgl(D.hari[idx() - 1])}` : ""}`, b => {
    const rb = barisProv(b).filter(r => !P.length || P.includes(r.kode));
    return `Titik panas naik di ${Kartu.hl(fmt(rb.filter(r => r.tp != null && r.t > r.tp).length) + " dari " + fmt(rb.length))} provinsi pada ${tgl(D.hari[b])} dibanding ${tgl(D.hari[b - 1])}`; }) : "Tidak ada provinsi yang cocok";
  /* kertas: dua kolom selebar setengah halaman supaya huruf tetap terbaca (satu kolom 38 baris menyusut sampai tak terbaca) */
  const h2 = Math.ceil(rows.length / 2), cetak = `<div class="lp-prt">${batangProv(rows.slice(0, h2), 760, rows[0].t || 1)}${rows.length > 1 ? batangProv(rows.slice(h2), 760, rows[0].t || 1) : ""}</div>`;
  return Kartu.kartu("Per provinsi", j, rows.length ? `<div class="lp-scr">${batangProv(rows)}</div>` + cetak : '<div class="kosong">Pilih minimal satu provinsi</div>', tt([D.sumber.titik, D.sumber.luas].join("; ")),
    Kartu.selProvMulti("provM", kode, k => D.prov[k].nama, st));
}

/* tabel harian di bawah grafik: hari terbaru di atas, hari terpilih ditandai; kol = [[judul, (i) => isi sel, angka?]] */
function tabelHarian(kol) {
  const hs = hariGrafik().slice().reverse();
  return `<div class="tw lp-th"><table class="lp-tb"><thead><tr><th>Tanggal</th>${kol.map(k => `<th${k[2] ? ' class="n"' : ""}>${k[0]}</th>`).join("")}</tr></thead><tbody>${hs.map(h => {
    const i = D.hari.indexOf(h);
    return `<tr class="${h === st.hari ? "lp-on" : ""}${h === D.hari_berjalan ? " lp-sm" : ""}"><td>${tglPanjang(h)}${h === D.hari_berjalan ? ' <span class="lp-bf">Belum final</span>' : ""}</td>${kol.map(k => `<td${k[2] ? ' class="n"' : ""}>${k[1](i)}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div>`;
}

/* ---------- kartu ---------- */
/* pilihan rentang baru muncul bila arsip sudah lebih dari 7 hari (sebelumnya 7 dan 14 hari tampil sama) */
const segRentang = () => D.hari.length > 7 ? Kartu.seg("rentang", [[7, "7 hari"], [14, "14 hari"]], st) : "";
const hariGrafik = () => D.hari.slice(-st.rentang);

/* hari terpilih = hari tertutup terakhir: hari berjalan (belum final) ikut tampil sebagai poin kedua */
/* tiap poin diawali label harinya, jadi "pada <tanggal>" di kalimat dibuang (sudah tertulis di label) */
const tglHari = s => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});
const iB = () => { const b = D.hari.indexOf(D.hari_berjalan); return b > 0 && D.hari[b - 1] === st.hari ? b : -1; };
function poinBerjalan(j, teks) {
  const b = iB();
  if (b < 0) return j;
  const poin = (h, t) => `<span class="lp-pt"><span class="lp-pt-h">${tglHari(h)}:</span> ${t.split(` pada ${tgl(h)}`).join("")}`;
  return `${poin(st.hari, j)}</span>${poin(D.hari[b], teks(b))} <span class="lp-bf">Data belum final</span></span>`;
}
function kartuRingkasan() {
  const i = idx(), n = D.nasional, h = st.hari, tp = i > 0 ? n.titik[i - 1] : null, lp = i > 0 ? n.luas[i - 1] : null;
  const bdg = i > 0 ? ` dibanding ${tgl(D.hari[i - 1])}` : "";
  const j = poinBerjalan(`${Kartu.hl(fmt(n.titik[i]))} titik panas di ${Kartu.hl(fmt(n.kab[i]))} kab/kota pada ${tgl(h)}${sementara() ? " (sementara)" : ""}${tp != null ? `, ${ubah(n.titik[i], tp)}${bdg} (${fmt(tp)} titik)` : ""}`,
    b => `${Kartu.hl(fmt(n.titik[b]))} titik panas di ${Kartu.hl(fmt(n.kab[b]))} kab/kota pada ${tgl(D.hari[b])}, ${ubah(n.titik[b], n.titik[b - 1])} dibanding ${tgl(D.hari[b - 1])}`);
  const hs = hariGrafik();
  return Kartu.kartu("Ringkasan", j, batang(hs, hs.map(x => n.titik[D.hari.indexOf(x)]), h, {nama: "Titik panas", u: "titik", arr: n.titik}) + tabelHarian([["Titik panas", i => fmt(n.titik[i]), 1], ["Perubahan titik", i => i > 0 ? ubah(n.titik[i], n.titik[i - 1]) : "–", 1],
    ["Kab/kota memiliki hotspot", i => fmt(n.kab[i]), 1], ["Provinsi memiliki hotspot", i => fmt(Object.values(D.prov).filter(o => o.titik[i] > 0).length), 1]]), tt(D.sumber.titik), segRentang());
}
function kartuLuas() {
  const i = idx(), n = D.nasional, kum = sum(n.baru, i), hs = hariGrafik();
  const j = `Luas indikasi terbakar ${Kartu.hl(fmt(n.luas[i]))} ha pada ${tgl(st.hari)}${i > 0 ? ` (${tgl(D.hari[i - 1])}: ${fmt(n.luas[i - 1])} ha)` : ""}, ${Kartu.hl(fmt(n.baru[i]))} ha di antaranya baru; kumulatif ${Kartu.hl(fmt(kum))} ha sejak ${tgl(D.awal_arsip)}`;
  const j2 = poinBerjalan(j, b => `Luas indikasi ${Kartu.hl(fmt(n.luas[b]))} ha pada ${tgl(D.hari[b])}, ${ubah(n.luas[b], n.luas[b - 1])} dibanding ${tgl(D.hari[b - 1])}; ${Kartu.hl(fmt(n.baru[b]))} ha baru`);
  return Kartu.kartu("Luas terdampak", j2, batang(hs, hs.map(x => n.luas[D.hari.indexOf(x)]), st.hari, {nama: "Luas indikasi", u: "ha", arr: n.luas}) + tabelHarian([["Luas indikasi (ha)", i => fmt(n.luas[i]), 1], ["Perubahan luas", i => i > 0 ? ubah(n.luas[i], n.luas[i - 1]) : "–", 1],
    ["Luas baru (ha)", i => fmt(n.baru[i]), 1], ["Kumulatif (ha)", i => fmt(sum(n.baru, i)), 1]]), tt(D.sumber.luas), segRentang());
}

/* teks kepala juga disalin ke span cetak: Chrome tidak menggambar tombol di kepala tabel yang diulang tiap halaman kertas */
const thB = () => { const b = iB(); return b < 0 ? "" : TH("tb", `Titik ${tgl(D.hari[b])} (belum final)`, 1).replace("<th", '<th data-sm'); };
const tdB = v => iB() < 0 ? "" : `<td class="n lp-smc">${fmt(v)}</td>`;
const TH = (k, t, n) => `<th${n ? ' class="n"' : ""}><button type="button" data-k="${k}">${t}<i></i></button><span class="lp-cth">${t}</span></th>`;
function tabelProv() {
  const i = idx(), h = tgl(st.hari), kem = i > 0 ? tgl(D.hari[i - 1]) : "sebelumnya", rows = urut(barisProv(), st.p), n = D.nasional;
  const sd = Object.values(D.prov).find(o => o.sipongi_sd)?.sipongi_sd, sdT = sd ? new Date(sd + "-01T00:00:00Z").toLocaleDateString("id-ID", {month: "short", timeZone: "UTC"}) : "";
  const kol = [TH("nama", "Provinsi"), thB(), TH("t", `Titik ${h}`, 1), TH("tp", `Titik ${kem}`, 1), TH("dt", "Perubahan titik", 1), TH("l", `Luas ${h} (ha)`, 1), TH("dl", "Perubahan luas", 1), TH("kum", "Kumulatif (ha)", 1),
    TH("kompleks", "Kejadian api", 1), TH("lk", "Luas kejadian api (ha)", 1), TH("level", "Status"), TH("sip", `SiPongi 2026 (ha${sdT ? ", s.d. " + sdT : ""})`, 1), TH("pad", `BNPB dipadamkan (ha${D.bnpb_sd ? ", s.d. " + tgl(D.bnpb_sd) : ""})`, 1)].join("");
  const td = r => `<tr><td>${esc(r.nama)}</td>${tdB(r.tb)}<td class="n">${fmt(r.t)}</td><td class="n">${fmt(r.tp)}</td><td class="n">${ubah(r.t, r.tp)}</td><td class="n">${fmt(r.l)}</td><td class="n">${ubah(r.l, r.lp)}</td><td class="n">${fmt(r.kum)}</td>`
    + `<td class="n">${fmt(r.kompleks)}</td><td class="n">${fmt(r.lk)}</td><td>${r.level == null ? "–" : pilLv(r.level)}</td><td class="n">${fmt(r.sip)}</td><td class="n">${fmt(r.pad)}</td></tr>`;
  const tot = `<tr><td>Indonesia</td>${tdB(iB() > 0 ? n.titik[iB()] : null)}<td class="n">${fmt(n.titik[i])}</td><td class="n">${fmt(i > 0 ? n.titik[i - 1] : null)}</td><td class="n">${ubah(n.titik[i], i > 0 ? n.titik[i - 1] : null)}</td><td class="n">${fmt(n.luas[i])}</td><td class="n">${ubah(n.luas[i], i > 0 ? n.luas[i - 1] : null)}</td><td class="n">${fmt(sum(n.baru, i))}</td>`
    + `<td class="n">${fmt(rows.reduce((a, r) => a + (r.kompleks || 0), 0))}</td><td class="n">${fmt(rows.reduce((a, r) => a + (r.lk || 0), 0))}</td><td></td><td class="n">${fmt(rows.reduce((a, r) => a + (r.sip || 0), 0))}</td><td class="n">${fmt(rows.reduce((a, r) => a + (r.pad || 0), 0))}</td></tr>`;
  return `<div class="tw"><table class="lp-tb"><thead><tr>${kol}</tr></thead><tbody>${rows.map(td).join("") || '<tr><td colspan="13" class="kosong">Tidak ada titik panas pada rentang ini</td></tr>'}</tbody><tfoot>${tot}</tfoot></table></div>`;
}
function kartuProv() {
  const i = idx(), rows = barisProv().sort((a, b) => b.t - a.t), top = rows[0], tot = D.nasional.titik[i];
  const j = top && top.t ? poinBerjalan(`${Kartu.hl(esc(top.nama))} mencatat titik panas terbanyak pada ${tgl(st.hari)}: ${Kartu.hl(fmt(top.t))} dari ${Kartu.hl(fmt(tot))} titik di seluruh Indonesia (${fmt(Math.round(top.t / tot * 100))}%)`, b => {
    const t2 = barisProv(b).sort((a, c) => c.t - a.t)[0];
    return t2 ? `${Kartu.hl(esc(t2.nama))} terbanyak pada ${tgl(D.hari[b])}: ${Kartu.hl(fmt(t2.t))} titik, ${ubah(t2.t, t2.tp)}` : `Tidak ada titik panas tercatat pada ${tgl(D.hari[b])}`; }) : `Tidak ada titik panas tercatat pada ${tgl(st.hari)}`;
  return Kartu.kartu("Tabel provinsi", j, '<div id="lpProv"></div>', tt([D.sumber.titik, D.sumber.luas, D.sumber.kompleks, D.sumber.sipongi, D.sumber.bnpb].filter(Boolean).join("; ")));
}
/* kab/kota dikelompokkan per provinsi: provinsi diurut titik hari terpilih (terbanyak dulu), kab/kota di dalamnya mengikuti urutan kolom.
   Baris kepala provinsi muncul di awal tiap kelompok dan di awal tiap halaman paginasi. Cetak: hanya kab/kota yang punya titik/luas hari itu atau kemarin. */
function tabelKab() {
  const i = idx(), h = tgl(st.hari), kem = i > 0 ? tgl(D.hari[i - 1]) : "sebelumnya", q = st.cari.trim().toLowerCase();
  const pv = k => D.prov[k]?.titik[i] || 0;
  const rows = urut(barisKab().filter(r => (!st.provK || r.kode === st.provK) && (!q || r.nama.toLowerCase().includes(q)) && (!st.cetak || r.t || r.tp || r.l || r.lp)), st.k)
    .sort((a, b) => a.kode === b.kode ? 0 : pv(b.kode) - pv(a.kode) || a.prov.localeCompare(b.prov, "id"));
  const hal = st.cetak ? 0 : Math.min(st.k.hal, Math.max(0, Math.ceil(rows.length / PER) - 1)); if (!st.cetak) st.k.hal = hal;
  const vis = st.cetak ? rows : rows.slice(hal * PER, hal * PER + PER);
  const kol = [TH("nama", "Kab/kota"), thB(), TH("t", `Titik ${h}`, 1), TH("tp", `Titik ${kem}`, 1), TH("dt", "Perubahan titik", 1), TH("l", `Luas ${h} (ha)`, 1), TH("dl", "Perubahan luas", 1), TH("kum", "Kumulatif (ha)", 1),
    TH("kompleks", "Kejadian api", 1), TH("lk", "Luas kejadian api (ha)", 1), TH("level", "Status"), TH("fwi", "FWI tertinggi", 1)].join("");
  const grp = {}; rows.forEach(r => { const g = grp[r.kode] ||= {n: 0, t: 0, tp: 0, l: 0, lp: 0}; g.n++; g.t += r.t; g.tp += r.tp || 0; g.l += r.l; g.lp += r.lp || 0; });
  const kepala = (k, lanjut) => { const g = grp[k], p = D.prov[k];
    return `<tr class="lp-grp"><td>${esc(p?.nama || k)}${lanjut ? " (lanjutan)" : ""}</td>${tdB(iB() > 0 ? p?.titik[iB()] : null)}<td class="n">${fmt(p?.titik[i])}</td><td class="n">${fmt(i > 0 ? p?.titik[i - 1] : null)}</td><td class="n">${ubah(p?.titik[i], i > 0 ? p?.titik[i - 1] : null)}</td>`
      + `<td class="n">${fmt(p?.luas[i])}</td><td class="n">${ubah(p?.luas[i], i > 0 ? p?.luas[i - 1] : null)}</td><td class="n">${fmt(p ? sum(p.baru, i) : null)}</td><td class="n">${fmt(p?.kompleks)}</td><td class="n">${fmt(p?.luas_kompleks)}</td><td>${p ? pilLv(p.level) : ""}</td><td class="n">${fmt(g.n)} kab/kota</td></tr>`; };
  const td = r => `<tr><td class="lp-kab">${esc(r.nama)}</td>${tdB(r.tb)}<td class="n">${fmt(r.t)}</td><td class="n">${fmt(r.tp)}</td><td class="n">${ubah(r.t, r.tp)}</td><td class="n">${fmt(r.l)}</td><td class="n">${ubah(r.l, r.lp)}</td><td class="n">${fmt(r.kum)}</td>`
    + `<td class="n">${fmt(r.kompleks)}</td><td class="n">${fmt(r.lk)}</td><td>${r.level == null ? "–" : pilLv(r.level)}</td><td class="n">${fmt(r.fwi)}</td></tr>`;
  const badan = vis.map((r, j) => (j === 0 || vis[j - 1].kode !== r.kode ? kepala(r.kode, j === 0 && hal > 0 && rows[hal * PER - 1]?.kode === r.kode) : "") + td(r)).join("");
  const pg = st.cetak ? `<p class="lp-cetak-n">${fmt(rows.length)} kab/kota dengan titik panas atau luas indikasi pada ${h} atau ${kem}</p>` : paginasi(hal, rows.length, PER, "kab/kota");
  return `<div class="tw"><table class="lp-tb"><thead><tr>${kol}</tr></thead><tbody>${badan || '<tr><td colspan="12" class="kosong">Tidak ada kab/kota yang cocok</td></tr>'}</tbody></table></div>${pg}`;
}
function kartuKab() {
  const i = idx(), rows = barisKab().sort((a, b) => b.t - a.t), top = rows[0], aktif = rows.filter(r => r.t > 0).length;
  const j = top && top.t ? poinBerjalan(`${Kartu.hl(fmt(aktif))} kab/kota mencatat titik panas pada ${tgl(st.hari)}, terbanyak ${Kartu.hl(esc(top.nama))} (${Kartu.hl(fmt(top.t))} titik)`, b => {
    const rb = barisKab(b).sort((a, c) => c.t - a.t);
    return rb[0]?.t ? `${Kartu.hl(fmt(rb.filter(r => r.t > 0).length))} kab/kota pada ${tgl(D.hari[b])}, terbanyak ${Kartu.hl(esc(rb[0].nama))} (${Kartu.hl(fmt(rb[0].t))} titik)` : `Tidak ada titik panas tercatat pada ${tgl(D.hari[b])}`; }) : `Tidak ada titik panas tercatat pada ${tgl(st.hari)}`;
  const kodeAda = [...new Set(rows.map(r => r.kode))].sort((a, b) => D.prov[a].nama.localeCompare(D.prov[b].nama, "id"));
  const ctl = Kartu.selProv("provK", "Semua provinsi", kodeAda, k => D.prov[k].nama, st)
    + `<input class="lp-cari" id="lpCari" type="search" placeholder="Cari nama kab/kota" autocomplete="off" aria-label="Cari nama kab/kota" value="${esc(st.cari)}">`;
  return Kartu.kartu("Per kab/kota", j, '<div id="lpKab"></div>', tt([D.sumber.titik, D.sumber.luas, D.sumber.kompleks, D.sumber.fwi, D.sumber.wilayah].filter(Boolean).join("; ")), ctl);
}
function kartuNaik() {
  const i = idx();
  if (i < 1) return Kartu.kartu("Kenaikan terbesar", "Belum ada hari pembanding", '<div class="kosong">Laporan baru punya satu hari</div>', tt(D.sumber.titik));
  const rows = barisKab().filter(r => r.dt > 0).sort((a, b) => b.dt - a.dt).slice(0, 10).map(r => ({...r, v: r.dt}));
  const j = poinBerjalan(rows.length ? `${Kartu.hl(esc(rows[0].nama))} naik paling tajam: <span class="naik">▲ ${fmt(rows[0].dt)}</span> titik panas pada ${tgl(st.hari)} dibanding ${tgl(D.hari[i - 1])}` : `Tidak ada kab/kota yang naik pada ${tgl(st.hari)} dibanding ${tgl(D.hari[i - 1])}`, b => {
    const t2 = barisKab(b).filter(r => r.dt > 0).sort((a, c) => c.dt - a.dt)[0];
    return t2 ? `${Kartu.hl(esc(t2.nama))} naik paling tajam pada ${tgl(D.hari[b])}: <span class="naik">▲ ${fmt(t2.dt)}</span> titik panas` : `Tidak ada kab/kota yang naik pada ${tgl(D.hari[b])}`; });
  /* hari berjalan tersedia: dua panel berdampingan, kiri hari terpilih, kanan hari berjalan (belum final) */
  const b = iB(), rb = b < 0 ? [] : barisKab().filter(r => r.db > 0).sort((a, c) => c.db - a.db).slice(0, 10).map(r => ({...r, t: r.tb, tp: r.t, v: r.db}));
  const kosong = '<div class="kosong">Semua kab/kota tetap atau turun</div>';
  if (b < 0) return Kartu.kartu("Kenaikan terbesar", j, rows.length ? batangMendatar(rows) : kosong, tt(D.sumber.titik));
  const mx = Math.max(1, ...rows.map(r => r.v), ...rb.map(r => r.v));
  const panel = (h, rs, sm) => `<div class="lp-pn"><div class="lp-pn-h">${tglHari(h)}${sm ? ' <span class="lp-bf">Data belum final</span>' : ""}</div>${rs.length ? batangMendatar(rs, 640, sm, mx) : kosong}</div>`;
  return Kartu.kartu("Kenaikan terbesar", j, `<div class="lp-pns">${panel(st.hari, rows, false)}${panel(D.hari[b], rb, true)}</div>`, tt(D.sumber.titik));
}
function kartuSumber() {
  const s = D.sumber, c = D.cutoff, sm = sementara();
  /* teks sumber dari pipeline diawali nama sumbernya; nama itu pindah ke pil sumber, sisanya jadi rincian */
  const rinci = t => tt(t).replace(/^(NASA FIRMS NRT|Kejadian api):\s*/, "").replace(/^(Badan Informasi Geospasial \(BIG\)|KLHK SiPongi),\s*/, "");
  /* kompartemen 1: alur waktu laporan, dari arsip sampai penutupan */
  const tutup = new Date(`${st.hari}T${(D.jadwal.tutup.match(/\d{1,2}[.:]\d{2}/) || ["21.20"])[0].replace(".", ":").padStart(5, "0")}:00+07:00`);
  const waktu = [[new Date(c), "Cut-off data", jamWIB(c)], [new Date(D.dibuat), "Dihitung", jamWIB(D.dibuat)],
    [tutup, sm ? "Ditutup nanti" : "Ditutup", `${tgl(st.hari)} ${D.jadwal.tutup}`, "tt"]].sort((a, b) => a[0] - b[0]);
  const alur = `<div class="lp-km"><div class="lp-km-h"><span>Waktu laporan</span><span class="lp-bf${sm ? "" : " ok"}">${sm ? "Data belum final" : "Final"}</span></div>`
    + `<ol class="lp-alur">${waktu.map(w => `<li${w[3] ? ' class="tt"' : ""}><i></i><b>${esc(w[2])}</b><span>${w[1]}</span></li>`).join("")}</ol></div>`;
  /* kompartemen 2: ubin sumber, satu per data */
  const IK = {titik: '<path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z"/>', luas: '<path d="M4 4h16v16H4zM4 12h16M12 4v16"/>',
    kum: '<path d="M4 17l8 4 8-4M4 12l8 4 8-4M12 3l8 4-8 4-8-4z"/>', kej: '<circle cx="7" cy="8" r="2.5"/><circle cx="16" cy="7" r="2.5"/><circle cx="11" cy="16" r="2.5"/>',
    fwi: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>', wil: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
    res: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/>', ops: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'};
  const baris = [
    ["titik", "Titik panas", "NASA FIRMS", s.titik && rinci(s.titik) + ", per hari WIB"],
    ["luas", "Luas indikasi", "NASA FIRMS", s.luas && rinci(s.luas) + ", 1 piksel 375 m = 14,06 ha"],
    ["kum", "Kumulatif", "Centurisk97", "Jumlah luas baru harian, piksel tanpa deteksi 7 hari sebelumnya"],
    ["kej", "Kejadian api", "Centurisk97", s.kompleks && rinci(s.kompleks)], ["fwi", "FWI", "Open-Meteo", s.fwi && tt(s.fwi)],
    ["wil", "Wilayah", "BIG", s.wilayah && rinci(s.wilayah)], ["res", "Luas resmi", "KLHK SiPongi", s.sipongi && rinci(s.sipongi)],
    ["ops", "Operasi", "BNPB", s.bnpb && tt(s.bnpb)]].filter(r => r[3]);
  const ubin = baris.map(r => `<div class="lp-ub"><div class="lp-ub-h"><svg viewBox="0 0 24 24" aria-hidden="true">${IK[r[0]]}</svg><b>${r[1]}</b><span class="lp-src">${esc(r[2])}</span></div><p>${esc(r[3])}</p></div>`).join("");
  const j = `Data satelit masuk sampai ${Kartu.hl(jamWIB(c))}, laporan ${Kartu.hl(tgl(st.hari))} ${sm ? "masih sementara" : "sudah ditutup"}`;
  return Kartu.kartu("Cut-off dan sumber data", j, `<div class="lp-kms">${alur}<div class="lp-km"><div class="lp-km-h"><span>Sumber data</span></div><div class="lp-ubs">${ubin}</div></div></div>`,
    "NASA FIRMS, BIG, KLHK SiPongi, BNPB, olahan Centurisk97");
}

function kepala() {
  const hs = D.hari.slice(-7), sm = sementara();
  const opsi = hs.map(h => [h, tgl(h) + (h === D.hari_berjalan ? " (sementara)" : "")]);
  $("#lpKepala").innerHTML = `<div class="lp-jd"><h1>Laporan Harian Karhutla</h1>
    <div class="lp-pils"><span class="lp-pil">${tglPanjang(st.hari)}</span>${sm ? `<span class="lp-pil">Data s.d. ${jamWIB(D.cutoff)}</span><span class="lp-pil sm">Belum final</span>` : `<span class="lp-pil ok">Final, ditutup ${tgl(st.hari)} ${esc(D.jadwal.tutup)}</span>`}</div></div>
    <div class="lp-aksi"><button class="lp-cetak" type="button" id="lpCetak" aria-label="Cetak atau unduh PDF" title="Cetak atau unduh PDF">${IK_CETAK}</button>${Kartu.seg("hari", opsi, st)}</div>`;
}

/* ---------- render ---------- */
const isi = (k, h) => { $(`[data-ex="${k}"]`).innerHTML = h; };
function renderProv() { const e = $("#lpProv"); if (e) { e.innerHTML = tabelProv(); tandai(e, st.p); pengurutKepala(st.p, e.querySelector("thead"), () => nanti(renderProv)); } }
function renderKab() { const e = $("#lpKab"); if (e) { e.innerHTML = tabelKab(); tandai(e, st.k); pengurutKepala(st.k, e.querySelector("thead"), () => nanti(renderKab)); } }
function tandai(e, s) { const b = e.querySelector(`thead [data-k="${s.urut}"] i`); if (b) b.textContent = s.turun ? "↓" : "↑"; }
function semua() {
  kepala(); isi("ring", kartuRingkasan()); isi("luas", kartuLuas()); isi("provg", kartuProvGrafik()); isi("prov", kartuProv()); isi("kab", kartuKab()); isi("naik", kartuNaik()); isi("sumber", kartuSumber());
  renderProv(); renderKab();
  document.querySelectorAll(".lp-gr,.lp-kep .seg").forEach(e => { e.scrollLeft = e.scrollWidth; });   /* hari terpilih ada di ujung kanan */
  $("#upd").textContent = "Data s.d. " + jamWIB(D.cutoff);
  /* angka pokok untuk kertas cetak (gaya lembar ekspor pangantara: kotak navy 4 lajur, label kecil di atas, nilai besar) */
  { const i = idx(), n = D.nasional, pv = Object.values(D.prov).filter(o => o.titik[i] > 0).length, ub = (a, b) => i > 0 && b ? (v => (v > 0 ? "▲ " : v < 0 ? "▼ " : "") + fmt(Math.abs(v)) + "%")(Math.round((a - b) / b * 100)) : "–";
    $("#lpPokok").innerHTML = [["Titik panas", fmt(n.titik[i]), ub(n.titik[i], n.titik[i - 1]) + (i > 0 ? " dari " + fmt(n.titik[i - 1]) + " (" + tgl(D.hari[i - 1]) + ")" : "")], ["Kab/kota memiliki hotspot", fmt(n.kab[i]), "di " + fmt(pv) + " provinsi"],
      ["Luas indikasi terbakar", fmt(n.luas[i]) + " ha", ub(n.luas[i], n.luas[i - 1]) + (i > 0 ? " dari " + fmt(n.luas[i - 1]) + " ha (" + tgl(D.hari[i - 1]) + ")" : "")], ["Kumulatif", fmt(sum(n.baru, i)) + " ha", "sejak " + tgl(D.awal_arsip)]]
      .map(([l, v, k]) => `<div><span>${l}</span><b>${v}</b><small>${k}</small></div>`).join(""); }
  /* kepala dan kaki kertas cetak: kotak margin @page (menggantikan tanggal/URL bawaan browser), isinya mengikuti hari terpilih */
  const en = window.BAHASA === "en" && typeof window.T === "function", T = t => en ? window.T(t) : t;
  const css = t => '"' + String(T(t)).replace(/["\\]/g, "") + '"', f = "font:600 8.5px Inter,system-ui,sans-serif;color:#5b6b82";
  /* laporan bertanggal hari dicetak (WIB); hari data dan status finalnya ada di kanan */
  const cetak = tglPanjang(new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10));
  const kanan = sementara() ? `Data ${tgl(st.hari)} s.d. ${jamWIB(D.cutoff)}, belum final` : `Data ${tgl(st.hari)} final, ditutup ${D.jadwal.tutup}`;
  $("#lpKopTgl").textContent = cetak + "  ·  " + kanan;
  $("#lpHalaman").textContent = `@page{size:A4 landscape;margin:20mm 10mm 14mm;
    @top-left{content:${css("Centurisk97  ·  Laporan Harian Karhutla  ·  " + cetak)};font:800 9px Inter,system-ui,sans-serif;color:#0b2545;border-bottom:1.5px solid #0b2545;vertical-align:bottom;padding-bottom:3mm;margin-bottom:6mm}
    @top-right{content:${css(kanan)};${f};border-bottom:1.5px solid #0b2545;vertical-align:bottom;padding-bottom:3mm;margin-bottom:6mm}
    @bottom-left{content:${css("Sumber: NASA FIRMS, BIG, KLHK SiPongi, BNPB; olahan Centurisk97")};${f};border-top:1px solid #c9d3e0;vertical-align:top;padding-top:3mm}
    @bottom-right{content:"${en ? "Page" : "Halaman"} " counter(page) " ${en ? "of" : "dari"} " counter(pages);${f};border-top:1px solid #c9d3e0;vertical-align:top;padding-top:3mm}}
    @page :first{@top-left{content:"";border:0}@top-right{content:"";border:0}}`;
}
const awal = () => D.hari_lengkap || D.hari[D.hari.length - 1];

/* ---------- interaksi ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-set]");
  if (b && b.tagName === "BUTTON") {
    const k = b.dataset.set, v = b.dataset.v;
    b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));   /* chrome urgent */
    st[k] = k === "rentang" ? +v : v; if (k === "hari") st.manual = true;
    st.p.hal = st.k.hal = 0; nanti(semua); return;
  }
  const p = e.target.closest("#lpKab .pgn-b[data-h]");
  if (p && !p.disabled) { if (/^\d+$/.test(p.textContent)) p.parentElement.querySelectorAll(".pgn-b").forEach(x => x.classList.toggle("on", x === p)); st.k.hal = +p.dataset.h; nanti(renderKab); return; }
  if (e.target.closest("#lpCetak")) print();
});
document.addEventListener("change", e => {
  const m = e.target.closest("input[data-multi]");
  if (m) { const box = m.closest(".pm-menu"); if (!m.value) box.querySelectorAll("input[value]:not([value=''])").forEach(x => x.checked = false); else box.querySelector("input[value='']").checked = false;
    st[m.dataset.multi] = [...box.querySelectorAll("input:checked")].map(x => x.value).filter(Boolean).join(","); Kartu._bukaMulti = m.dataset.multi; nanti(renderProvGrafik); return; } });
const renderProvGrafik = () => isi("provg", kartuProvGrafik());
document.addEventListener("change", e => { const s = e.target.closest('select[data-set="provK"]'); if (s) { st.provK = s.value; st.k.hal = 0; nanti(renderKab); } });
let tunda;
document.addEventListener("input", e => { if (e.target.id !== "lpCari") return; st.cari = e.target.value; st.k.hal = 0; clearTimeout(tunda); tunda = setTimeout(() => nanti(renderKab), 120); });
addEventListener("beforeprint", () => { st.cetak = true; renderKab(); });
addEventListener("afterprint", () => { st.cetak = false; renderKab(); });
const gelapSkrg = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
$("#tema").onclick = () => { const t = gelapSkrg() ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {} };

/* ---------- muat ---------- */
async function muat(ulang) {
  const r = await fetch("/data/laporan.json?t=" + Math.floor(Date.now() / 60000), {cache: "no-cache"});
  if (!r.ok) throw new Error(r.status);
  const d = await r.json();
  if (ulang && D && d.dibuat === D.dibuat && d.cutoff === D.cutoff) return;
  D = d;
  if (!st.manual || !D.hari.includes(st.hari)) st.hari = awal();
  ulang ? nanti(semua) : semua();
}
pasangTip(); PilihCantik.pasang();
muat(false).catch(() => { $("#lpKepala").innerHTML = '<div class="kosong">Laporan belum tersedia. Coba muat ulang beberapa menit lagi.</div>'; $("#upd").textContent = "Data belum tersedia"; });
/* muat ulang dilewati selama kamu mengetik di kotak cari (render ulang akan membuang fokusnya) */
setInterval(() => { if (document.activeElement?.id !== "lpCari") muat(true).catch(() => {}); }, 600000);
