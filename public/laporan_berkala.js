/* laporan_berkala.js: Laporan Berkala di /laporan-bnpb?jenis=berkala&periode=bulanan&kode=2026-10 (LB-05 halaman cetak A4, LB-06 layar isian).
   Membaca berkas angka hitung.py apa adanya (kontrak tests/berkala/kontrak.test.mjs) dan isian staf, lalu menyusun kertas A4 per halaman:
   sampul, daftar isi dan "Tentang laporan ini", Ringkasan Eksekutif, Bab 1 sampai 7, Lampiran. Blok dialirkan ke kertas berikutnya bila
   kertas penuh (diukur di DOM), jadi tidak ada isi yang terpotong dan nomor daftar isi sama dengan nomor halaman cetak.
   Draf (versi 0) bertanda air. Kolom staf kosong tampil "belum diisi"; mesin tidak mengarang isinya (D2). Tanpa localStorage (L12).
   Halaman ini di balik sesi staf (/laporan-bnpb, HALAMAN_PUSDALOPS di src/gerbang_halaman.js); tidak ada versi publik (Q22). */
import * as H from "./laporan_berkala_hitung.js";

const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const n = v => H.angka(v), tgl = H.tanggal;
const JENIS = ["karhutla", "banjir", "longsor", "cuaca_ekstrem", "kekeringan", "gelombang", "gempa", "erupsi"];
const NONALAM = ["kebakaran_permukiman", "konflik_sosial", "gagal_teknologi", "kecelakaan_industri", "epidemi", "lainnya"];
const WARNA = {karhutla: "--lb-oranye", kekeringan: "--lb-oranye", banjir: "--lb-biru", longsor: "--lb-biru", cuaca_ekstrem: "--lb-emas", gelombang: "--lb-biru", gempa: "--lb-coklat", erupsi: "--lb-coklat",
  kering: "--lb-oranye", basah: "--lb-biru", geologi: "--lb-coklat", data: "--lb-navy", iklim: "--lb-emas", prediksi: "--lb-navy", vulkanologi: "--lb-coklat"};
const w = k => `--w:var(${WARNA[k] || "--lb-navy"})`;
const SURUT = {sudah: "Sudah surut", belum: "Belum surut", belum_dilaporkan: "Belum dilaporkan"};
const ALAMAT = "Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120";
const NAMA_SUMBER = {dibi: "DIBI BNPB", dibi_tahun_lalu: "DIBI tahun lalu (lapis Siklus)", karhutla: "Sistem karhutla Centurisk97", dalops_banjir: "Laporan banjir harian Pusdalops",
  gunungapi: "MAGMA Indonesia (PVMBG)", gempa: "Katalog gempa BMKG", prakiraan_hujan: "Model statistik GIS BNPB", peluang: "Logbook Pusdalops"};
const MUTU = {hipotesis: "hipotesis", uji_balik_lulus: "lulus uji balik"};
const KEADAAN = {ok: "lengkap", sebagian: "sebagian", belum_ada: "belum ada", gagal: "gagal ditarik"};

const kosong = (t = "belum diisi") => `<span class="lbk-kosong">${esc(t)}</span>`;
const isi = v => typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : v != null;
const paragraf = v => String(v).split(/\n+/).filter(s => s.trim()).map(s => `<p>${esc(s.trim())}</p>`).join("");
const teksStaf = (v, label) => isi(v) ? paragraf(v) : `<p>${kosong(label)}</p>`;
/* "2026-11-25T03:10:00Z" -> "25 November 2026 10.10 WIB" */
function waktu(s) {
  const d = new Date(s); if (isNaN(d)) return "";
  const x = new Date(d.getTime() + 7 * 36e5), p = v => String(v).padStart(2, "0");
  return `${x.getUTCDate()} ${H.BULAN[x.getUTCMonth()]} ${x.getUTCFullYear()} ${p(x.getUTCHours())}.${p(x.getUTCMinutes())} WIB`;
}
const kodeBulanLalu = k => `${+k.slice(0, 4) - 1}${k.slice(4)}`;

/* ---------------------------------------------------------------- blok */
function Penomor() { let t = 0, g = 0; return {tabel: () => ++t, gambar: () => ++g}; }

function tabel(no, judul, kepala, baris, {jumlah, sumber} = {}) {
  const sel = c => {
    const o = c && typeof c === "object" ? c : {v: c};
    const angkaSel = typeof o.v === "number" || o.n;
    const kelas = [angkaSel ? "n" : "", o.cls || ""].filter(Boolean).join(" ");
    const v = typeof o.v === "number" ? n(o.v) : o.html ?? esc(o.v ?? "");
    return `<td${kelas ? ` class="${kelas}"` : ""}>${v}</td>`;
  };
  return `<div class="lbk-tb"><div class="lbk-cap">${no ? `<em>Tabel ${no}.</em> ` : ""}${esc(judul)}</div>
  <table class="lbk-t"><thead><tr>${kepala.map(k => `<th scope="col">${esc(k)}</th>`).join("")}</tr></thead>
  <tbody>${baris.map(r => `<tr>${r.map(sel).join("")}</tr>`).join("")}${jumlah ? `<tr class="jml">${jumlah.map(sel).join("")}</tr>` : ""}</tbody></table>
  ${sumber ? `<div class="lbk-sumber">Sumber: ${esc(sumber)}</div>` : ""}</div>`;
}
function gambar(no, judul, svg, {sumber, legenda} = {}) {
  return `<figure class="lbk-gb"><figcaption><em>Gambar ${no}.</em> ${esc(judul)}</figcaption>${svg}${legenda ? `<div class="lbk-lg">${legenda}</div>` : ""}
  ${sumber ? `<div class="lbk-sumber">Sumber: ${esc(sumber)}</div>` : ""}</figure>`;
}
const kartu = daftar => `<div class="lbk-kartu-g">${daftar.map(k => `<div class="lbk-kartu" style="${w(k.w)}"><b>${k.v}</b><span>${esc(k.ket)}</span></div>`).join("")}</div>`;
const pembukaBab = (no, judul, warna) => `<div class="lbk-bab" style="${w(warna)}">${no ? `<small>Bab ${no}</small>` : ""}<h2>${esc(judul)}</h2></div>`;
const sub = t => `<h3>${esc(t)}</h3>`;
function actionPlan(I, bab) {
  const ap = I.action?.[bab] || {}, kol = [["sudah", "Sudah dilakukan"], ["sedang", "Sedang berjalan"], ["akan", "Akan dilakukan"]];
  return `<div class="lbk-ap">${kol.map(([k, j]) => `<section><h4>${j}</h4><div>${teksStaf(ap[k])}</div></section>`).join("")}</div>`;
}
const catatanStaf = (I, bab) => isi(I.catatan?.[bab]) ? `<div class="lbk-catat">${paragraf(I.catatan[bab])}</div>` : "";
function dokumentasi(I, ctx, bab) {
  const foto = (I.foto || []).filter(f => f?.bab === bab && /^[0-9a-f]{64}$/.test(f.id || ""));
  if (!foto.length) return `<p>${kosong("belum ada foto dipilih")}</p>`;
  return `<div class="lbk-dok">${foto.map(f => `<figure class="lbk-gb"><img alt="${esc(f.ket)}" src="/api/laporan-berkala/foto?periode=${ctx.periode}&kode=${ctx.kode}&id=${f.id}" style="aspect-ratio:4/3;width:100%;object-fit:cover">
    <div class="lbk-sumber">${esc(f.ket)}${f.kredit ? `, foto: ${esc(f.kredit)}` : ""}</div></figure>`).join("")}</div>`;
}
function temuan(daftar, usulan) {
  if (!daftar.length) return `<p>${kosong("belum ada temuan")}</p>`;
  return `${usulan ? `<p>${kosong("usulan mesin, belum dipilih staf")}</p>` : ""}<ol class="lbk-temuan">${daftar.map((t, i) => `<li style="${w(t.pil)}"><b>${i + 1}</b><div>
    <strong><span class="lbk-tg">${esc(t.pil || "temuan")}</span>${esc(t.judul || "")}</strong><p>${esc(t.kalimat || "")}</p>${t.sumber ? `<small>Sumber: ${esc(t.sumber)}</small>` : ""}</div></li>`).join("")}</ol>`;
}

/* ---------------------------------------------------------------- grafik SVG (tangan, tanpa pustaka) */
function batang(data, {warna = "--lb-navy", label = "semua", tinggi = 130} = {}) {
  const W = 460, Hh = tinggi, kiri = 4, bawah = 18, atas = 14, lebar = (W - kiri * 2) / Math.max(data.length, 1);
  const maks = Math.max(1, ...data.map(d => typeof d.v === "number" ? d.v : 0)), sk = (Hh - bawah - atas) / maks;
  const isiB = data.map((d, i) => {
    const x = kiri + i * lebar, cx = x + lebar / 2, bw = Math.max(lebar * .68, 2);
    const lb = `<text x="${cx}" y="${Hh - 5}" text-anchor="middle" font-size="9.5">${esc(d.x)}</text>`;
    if (typeof d.v !== "number") return `<g><title>${esc(d.judul || d.x)}: ${esc(d.kosong || "tanpa data")}</title>${lb}
      <text class="tk" x="${cx}" y="${Hh - bawah - 4}" text-anchor="middle" font-size="8">${esc(d.kosong || "tanpa data")}</text></g>`;
    const h = Math.max(d.v * sk, d.v > 0 ? 1 : 0), y = Hh - bawah - h;
    const tulis = label === "semua" || d.tonjol ? `<text x="${cx}" y="${y - 3}" text-anchor="middle" font-size="10" font-weight="700">${n(d.v)}</text>` : "";
    return `<g><title>${esc(d.judul || d.x)}: ${n(d.v)}</title><rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${h}" rx="1.5" style="fill:var(${d.warna || warna})"/>${tulis}${lb}</g>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="grafik batang"><line class="sumbu" x1="0" x2="${W}" y1="${Hh - bawah}" y2="${Hh - bawah}"/>${isiB}</svg>`;
}

/* peta provinsi: proyeksi lon/lat sederhana untuk Indonesia, kelas hotspot dari hitung.py (bab2.prov[].kelas) */
const BATAS_PETA = {x0: 94.6, x1: 141.4, y0: 6.4, y1: -11.2};
function peta(geo, A) {
  if (!geo?.features?.length) return `<p>${kosong("peta provinsi tidak termuat")}</p>`;
  const W = 600, k = W / (BATAS_PETA.x1 - BATAS_PETA.x0), Hh = Math.round((BATAS_PETA.y0 - BATAS_PETA.y1) * k);
  const X = lon => ((lon - BATAS_PETA.x0) * k).toFixed(1), Y = lat => ((BATAS_PETA.y0 - lat) * k).toFixed(1);
  const kelas = new Map((A.bab2.prov || []).map(p => [p.kode, p]));
  const NADA = [14, 32, 52, 76, 100];
  const isiK = c => `color-mix(in oklab,var(--lb-oranye) ${NADA[c] ?? 14}%,var(--lb-kertas))`;
  const poligon = g => g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  let label = "";
  const jalur = geo.features.map(f => {
    const kd = String(f.properties?.kode || ""), p = kelas.get(kd), pol = poligon(f.geometry);
    const d = pol.map(cs => cs.map(r => "M" + r.map(([lo, la]) => X(lo) + "," + Y(la)).join("L") + "Z").join("")).join("");
    if (p && (A.bab2.label || []).includes(kd)) {
      const besar = pol.map(cs => cs[0]).sort((a, b) => b.length - a.length)[0] || [];
      const xs = besar.map(c => c[0]), ys = besar.map(c => c[1]);
      const cx = +X((Math.min(...xs) + Math.max(...xs)) / 2), cy = +Y((Math.min(...ys) + Math.max(...ys)) / 2);
      const t = `${p.nama} ${n(p.hot)}`, lw = t.length * 4.3 + 8;
      label += `<g><rect x="${(cx - lw / 2).toFixed(1)}" y="${(cy - 7).toFixed(1)}" width="${lw.toFixed(1)}" height="12" rx="6" style="fill:var(--lb-kertas);stroke:var(--lb-navy);stroke-width:.6"/>
        <text x="${cx}" y="${(cy + 2).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700">${esc(t)}</text></g>`;
    }
    return `<path class="prov" d="${d}" style="fill:${p ? isiK(p.kelas) : "var(--lb-abu)"}"><title>${esc(p ? `${p.nama}: ${n(p.hot)} hotspot` : "tanpa data hotspot")}</title></path>`;
  }).join("");
  const s100 = (100 / 111.32) * k;   // 100 km di khatulistiwa
  const arah = `<g transform="translate(${W - 24},18)"><path d="M0,-12L6,6L0,2L-6,6Z" style="fill:var(--lb-navy)"/><text y="18" text-anchor="middle" font-size="8" font-weight="700">U</text></g>
    <g transform="translate(14,${Hh - 12})"><rect width="${s100.toFixed(1)}" height="3" style="fill:var(--lb-navy)"/><text y="-3" font-size="7.5">100 km</text></g>`;
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="peta hotspot per provinsi">${jalur}${label}${arah}</svg>`;
}
function legendaKelas(A) {
  const b = A.bab2.kelas_batas || [], NADA = [14, 32, 52, 76, 100];
  const teks = [`di bawah ${n(b[0])}`, ...b.slice(0, -1).map((x, i) => `${n(x)} sampai ${n(b[i + 1])}`), `di atas ${n(b[b.length - 1])}`];
  return teks.map((t, i) => `<span><i style="--w:color-mix(in oklab,var(--lb-oranye) ${NADA[i]}%,var(--lb-kertas))"></i>${esc(t)}</span>`).join("") +
    `<span><i style="--w:var(--lb-abu)"></i>tanpa data</span>`;
}

/* ---------------------------------------------------------------- isi laporan bulanan */
function namaProv(A) {
  const m = new Map();
  for (const l of [A.bab1?.prov, A.lampiran?.prov_jenis, A.bab2?.prov]) for (const p of l || []) if (p?.kode && p.nama) m.set(p.kode, p.nama);
  return k => m.get(k) || `Provinsi ${k}`;
}
const dampakSel = d => [d?.meninggal_hilang, d?.luka, d?.terdampak_mengungsi, d?.rumah_rusak];

function blokBulanan(A, I, ctx) {
  const No = Penomor(), b1 = A.bab1, b2 = A.bab2, b3 = A.bab3, b4 = A.bab4, b5 = A.bab5, L = A.label_jenis || {};
  const bulan = A.nama || tgl(A.kode), lalu = tgl(kodeBulanLalu(A.kode)), sebelum = tgl(b1.sebelumnya?.kode), prov = namaProv(A);
  const s = A.sumber || {}, tarik = k => s[k]?.tarik ? `, tarik ${tgl(s[k].tarik)}` : "";
  const SDIBI = `DIBI BNPB${tarik("dibi")}`, SKAR = `Sistem karhutla Centurisk97${tarik("karhutla")}`;
  const alam = b1.alam, resmi = b1.resmi?.alam, ambang = b1.di_bawah_ambang;
  const bab = [];   // [{bab: [no, judul, warna] | null, blok: [html]}]
  const B = (no, judul, warna) => { const x = {bab: [no, judul, warna], blok: []}; bab.push(x); return h => x.blok.push(h); };

  /* kalimat dua angka Q28: semua laporan dan resmi, keduanya berlabel */
  const duaAngka = `Angka ${n(alam.kejadian)} memuat semua laporan DIBI, termasuk ${n(ambang?.alam)} laporan di bawah ambang bencana. ` +
    `Angka resmi DIBI tanpa laporan itu ${n(resmi?.kejadian)} kejadian.`;
  const teratasJenis = JENIS.map(j => [j, b1.jenis[j]?.kejadian]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([j, v]) => `${(L[j] || j).toLowerCase()} ${n(v)}`).join(", ");
  const tl = b1.tahun_lalu?.banding?.kejadian;

  /* Ringkasan Eksekutif */
  let t = B(null, "Ringkasan Eksekutif", "data");
  t(teksStaf(I.pembuka, "belum diisi: kalimat pembuka"));
  t(kartu([{w: "data", v: n(alam.kejadian), ket: "kejadian bencana alam, semua laporan DIBI termasuk di bawah ambang"},
    {w: "data", v: n(resmi?.kejadian), ket: "kejadian resmi DIBI, tanpa laporan di bawah ambang"},
    {w: "erupsi", v: n(alam.dampak?.meninggal_hilang), ket: "orang meninggal dan hilang"},
    {w: "banjir", v: n(alam.dampak?.terdampak_mengungsi), ket: "orang terdampak dan mengungsi"},
    {w: "gempa", v: n(alam.dampak?.rumah_rusak), ket: "rumah rusak"}]));
  t(`<p>Selama ${esc(bulan)} tercatat <b>${n(alam.kejadian)}</b> kejadian bencana alam di <b>${n(alam.prov)}</b> provinsi dan <b>${n(alam.kab)}</b> kabupaten/kota. ${esc(duaAngka)}
    ${teratasJenis ? `Kejadian terbanyak: ${esc(teratasJenis)}.` : ""} ${tl ? `Pada ${esc(lalu)} tercatat ${n(tl.lalu)} kejadian, jadi angka bulan ini ${esc(H.banding(tl))}.` : ""}
    ${typeof b2.hot === "number" ? `Sistem karhutla mencatat <b>${n(b2.hot)}</b> <i>hotspot</i>, dengan puncak harian ${n(b2.puncak?.hot)} pada ${esc(tgl(b2.puncak?.tanggal))}.` : ""}</p>`);
  t(sub("Temuan utama"));
  const pilihR = Array.isArray(I.temuan_ringkas) && I.temuan_ringkas.length ? I.temuan_ringkas : null;
  t(temuan((pilihR || A.usulan_temuan || []).slice(0, 4), !pilihR));
  t(sub("Dukungan yang dimohon"));
  t(isi(I.dukungan) ? `<ul>${I.dukungan.map(d => `<li>${esc(d.langkah)}</li>`).join("")}</ul>` : `<p>${kosong()}</p>`);

  /* Bab 1 */
  t = B(1, "Gambaran umum", "data");
  t(sub("1.1 Kejadian bencana alam"));
  const kel = b1.kelompok;
  t(`<p>Dari ${n(alam.kejadian)} kejadian bencana alam, ${n(kel.kering.kejadian)} termasuk kelompok kering (karhutla dan kekeringan), ${n(kel.basah.kejadian)} kelompok basah (banjir, longsor, cuaca ekstrem, gelombang pasang), dan ${n(kel.geologi.kejadian)} kelompok geologi (gempa dan erupsi).
    Pada ${esc(sebelum)} tercatat ${n(b1.sebelumnya?.kejadian?.alam)} kejadian. Di luar bencana alam ada ${n(NONALAM.reduce((x, j) => x + (b1.bukan_alam.jenis[j]?.kejadian || 0), 0))} kejadian non-alam dan sosial (Bab 1.4) yang tidak dijumlah ke angka bencana alam.</p>`);
  t(kartu([{w: "kering", v: n(kel.kering.kejadian), ket: `kelompok kering di ${n(kel.kering.prov)} provinsi`},
    {w: "basah", v: n(kel.basah.kejadian), ket: `kelompok basah di ${n(kel.basah.prov)} provinsi`},
    {w: "geologi", v: n(kel.geologi.kejadian), ket: `kelompok geologi di ${n(kel.geologi.prov)} provinsi`}]));
  t(tabel(No.tabel(), `Kejadian bencana alam per jenis, ${bulan}`, ["Jenis", "Semua laporan", "Resmi DIBI", "Di bawah ambang", "Provinsi", "Kab/kota"],
    JENIS.map(j => [L[j] || j, b1.jenis[j]?.kejadian, b1.resmi?.jenis?.[j] ?? {v: "tidak diketahui", cls: "tk"}, ambang?.jenis?.[j] ?? {v: "tidak diketahui", cls: "tk"}, b1.jenis[j]?.prov, b1.jenis[j]?.kab]),
    {jumlah: ["Jumlah", alam.kejadian, resmi?.kejadian ?? "tidak diketahui", ambang?.alam ?? "tidak diketahui", alam.prov, alam.kab],
      sumber: `${SDIBI}. Semua laporan: ${b1.label_angka?.alam || ""}. Resmi DIBI: ${b1.label_angka?.resmi || ""}`}));
  t(gambar(No.gambar(), `Kejadian bencana alam per bulan, 11 bulan terakhir`,
    batang((b1.riwayat || []).map(r => ({x: (H.BULAN[+r.kode.slice(5) - 1] || "").slice(0, 3) + " " + r.kode.slice(2, 4), judul: tgl(r.kode), v: r.kejadian?.alam ?? null, kosong: "tanpa data",
      warna: r.kode === A.kode ? "--lb-oranye" : "--lb-navy"}))), {sumber: `${SDIBI}, semua laporan termasuk di bawah ambang`}));
  const tp = (b1.prov_teratas || []).slice(0, 10).map(k => b1.prov.find(p => p.kode === k)).filter(Boolean);
  const maks = Math.max(1, ...tp.map(p => p.kejadian)), panas = v => ({v, cls: v > 0 ? "p" + Math.min(4, Math.ceil(v / maks * 4)) : ""});
  t(tabel(No.tabel(), `Sepuluh provinsi dengan kejadian bencana alam terbanyak, ${bulan}`, ["Provinsi", "Kering", "Basah", "Geologi", "Jumlah"],
    tp.map(p => [p.nama, panas(p.kelompok.kering), panas(p.kelompok.basah), panas(p.kelompok.geologi), p.kejadian]), {sumber: SDIBI}));
  t(sub("1.2 Dampak"));
  const d = alam.dampak || {};
  t(`<p>Bencana alam selama ${esc(bulan)} menyebabkan <b>${n(d.meninggal_hilang)}</b> orang meninggal dan hilang, <b>${n(d.luka)}</b> orang luka, <b>${n(d.terdampak_mengungsi)}</b> orang terdampak dan mengungsi, serta <b>${n(d.rumah_rusak)}</b> rumah rusak.</p>`);
  t(kartu([{w: "erupsi", v: n(d.rr_berat), ket: "rumah rusak berat"}, {w: "karhutla", v: n(d.rr_sedang), ket: "rumah rusak sedang"},
    {w: "gempa", v: n(d.rr_ringan), ket: "rumah rusak ringan"}, {w: "data", v: n(d.fasum_rusak), ket: "fasilitas umum rusak"}]));
  t(tabel(No.tabel(), `Dampak bencana alam per jenis, ${bulan}`, ["Jenis", "Meninggal dan hilang", "Luka", "Terdampak dan mengungsi", "Rumah rusak", "Fasilitas umum rusak", "Jembatan rusak"],
    JENIS.map(j => { const x = b1.jenis[j]?.dampak; return [L[j] || j, ...dampakSel(x), x?.fasum_rusak, x?.jembatan]; }),
    {jumlah: ["Jumlah", ...dampakSel(d), d.fasum_rusak, d.jembatan], sumber: SDIBI}));
  const bd = b1.tahun_lalu?.banding || {}, UK = [["kejadian", "Kejadian, semua laporan"], ["kejadian_resmi", "Kejadian, resmi DIBI"], ["meninggal_hilang", "Meninggal dan hilang"],
    ["luka", "Luka"], ["terdampak_mengungsi", "Terdampak dan mengungsi"], ["rumah_rusak", "Rumah rusak"]];
  const bandingBaris = (lbl, x) => [lbl, x?.lalu ?? {v: "tidak diketahui", cls: "tk"}, x?.kini ?? {v: "tidak diketahui", cls: "tk"}, {v: H.banding(x)}];
  t(tabel(No.tabel(), `${bulan} dibanding ${lalu}`, ["Ukuran", lalu, bulan, "Perubahan"],
    [...UK.map(([k, l]) => bandingBaris(l, bd[k])), ...JENIS.map(j => bandingBaris(L[j] || j, bd.jenis?.[j]))],
    {sumber: `${SDIBI}; ${lalu} dari ${NAMA_SUMBER.dibi_tahun_lalu}${tarik("dibi_tahun_lalu")}. Lapis Siklus tidak membawa tanda ambang, jadi angka resmi tahun lalu bisa tidak diketahui`}));
  t(sub("1.3 Action plan"));
  t(actionPlan(I, "bab1")); t(catatanStaf(I, "bab1"));
  t(sub("1.4 Kejadian non-alam dan sosial"));
  const ba = b1.bukan_alam;
  t(tabel(No.tabel(), `Kejadian non-alam dan sosial per jenis, ${bulan}`, ["Jenis", "Kejadian", "Provinsi", "Kab/kota", "Meninggal dan hilang", "Luka", "Terdampak dan mengungsi", "Rumah rusak", lalu, "Perubahan"],
    NONALAM.map(j => { const x = ba.jenis[j] || {}, y = ba.tahun_lalu?.[j]; return [L[j] || j, x.kejadian, x.prov, x.kab, ...dampakSel(x.dampak), y?.lalu ?? {v: "tidak diketahui", cls: "tk"}, {v: H.banding(y)}]; }),
    {sumber: `${SDIBI}. ${ba.catatan_lainnya || ""}`}));
  if ((ba.kab_teratas || []).length) t(tabel(No.tabel(), `Kabupaten/kota dengan kejadian non-alam dan sosial terbanyak, ${bulan}`, ["Kab/kota", "Provinsi", "Jenis", "Kejadian"],
    ba.kab_teratas.slice(0, 10).map(k => [k.nama, k.prov, L[k.jenis] || k.jenis, k.kejadian]), {sumber: SDIBI}));

  /* Bab 2 */
  t = B(2, "Kebakaran hutan dan lahan", "karhutla");
  t(sub("2.1 Hotspot"));
  const tidakPenuh = x => x?.hari < x?.hari_rentang ? ` (data ${n(x.hari)} dari ${n(x.hari_rentang)} hari)` : "";
  t(kartu([{w: "karhutla", v: n(b2.hot), ket: `hotspot selama ${bulan}`}, {w: "karhutla", v: n(b2.puncak?.hot), ket: `puncak harian, ${tgl(b2.puncak?.tanggal)}`},
    {w: "data", v: n(b2.akhir?.hot), ket: `hotspot hari terakhir, ${tgl(b2.akhir?.tanggal)}`}, {w: "kering", v: H.persen(b2.turun_dari_puncak), ket: "turun dari puncak ke hari terakhir"}]));
  const sb = b2.sebelumnya;
  t(`<p>Sistem karhutla mencatat <b>${n(b2.hot)}</b> <i>hotspot</i> selama ${esc(bulan)}${esc(tidakPenuh(b2.cakupan))}. Pada ${esc(tgl(sb?.kode))} tercatat ${n(sb?.hot, 0)} <i>hotspot</i>${esc(tidakPenuh(sb))}, jadi angka bulan ini ${esc(H.banding(sb?.banding))}.
    ${n(b2.teratas?.n)} provinsi teratas memuat ${esc(H.persen(b2.teratas?.persen))} <i>hotspot</i> nasional.</p>`);
  t(gambar(No.gambar(), `Hotspot harian, ${bulan}`, batang((b2.harian || []).map(h => ({x: +h.tanggal.slice(8) % 5 === 1 || h.tanggal === b2.puncak?.tanggal ? String(+h.tanggal.slice(8)) : "", judul: tgl(h.tanggal), v: h.hot ?? null,
    tonjol: h.tanggal === b2.puncak?.tanggal || h.tanggal === b2.akhir?.tanggal, warna: h.tanggal === b2.puncak?.tanggal ? "--lb-merah" : "--lb-oranye", kosong: "-"})), {label: "tonjol"}), {sumber: SKAR}));
  t(gambar(No.gambar(), `Sebaran hotspot per provinsi, ${bulan}`, peta(ctx.geo, A), {legenda: legendaKelas(A), sumber: SKAR}));
  t(tabel(No.tabel(), `Hotspot, luas terbakar perkiraan, dan belum padam per provinsi, ${bulan}`, ["Provinsi", "Hotspot", "Luas terbakar perkiraan (ha)", "Belum padam akhir bulan (ha)"],
    (b2.prov || []).map(p => [p.nama, p.hot, {v: H.luas(p.luas), n: true}, {v: H.luas(p.belum), n: true}]),
    {jumlah: ["Jumlah", b2.hot, {v: H.luas(b2.luas), n: true}, {v: H.luas(b2.belum), n: true}], sumber: `${SKAR}. Luas adalah perkiraan sistem, bukan luas resmi`}));
  t(gambar(No.gambar(), `Hotspot per bulan sejak Januari`, batang((b2.per_bulan || []).map(p => ({x: (H.BULAN[+p.kode.slice(5) - 1] || "").slice(0, 3), judul: tgl(p.kode), v: p.hot ?? null,
    kosong: `${n(p.hari)}/${n(p.hari_rentang)} hari`, warna: p.kode === A.kode ? "--lb-merah" : "--lb-oranye"}))),
    {sumber: `${SKAR}. Bulan yang datanya tidak penuh ditulis banyak hari yang ada, tanpa angka`}));
  t(sub("2.2 Luas terbakar dan belum padam"));
  t(kartu([{w: "karhutla", v: H.luas(b2.luas) + " ha", ket: "luas terbakar perkiraan sistem"}, {w: "erupsi", v: H.luas(b2.belum) + " ha", ket: `belum padam pada ${tgl(b2.akhir?.tanggal)}`}]));
  t(sub("2.3 Laporan daerah dan satelit"));
  t(tabel(No.tabel(), `Hotspot dan laporan karhutla DIBI di provinsi dengan hotspot terbanyak, ${bulan}`, ["Provinsi", "Hotspot", "Laporan karhutla DIBI"],
    (b2.satelit_lawan_dibi || []).map(p => [p.nama, p.hot, p.dibi_karhutla]), {sumber: `${SKAR}; ${SDIBI}. Dua sumber berdampingan, tidak dijumlah`}));
  t(sub("2.4 Action plan"));
  t(actionPlan(I, "bab2"));
  t(`<div class="lbk-catat"><p><b>Angka operasi</b></p>${teksStaf(I.operasi)}</div>`); t(catatanStaf(I, "bab2"));
  t(sub("2.5 Dokumentasi")); t(dokumentasi(I, ctx, "bab2"));

  /* Bab 3 */
  t = B(3, "Banjir dan tanah longsor", "banjir");
  const bj = b3.banjir, st = bj.status || {}, dl = s.dalops_banjir;
  t(sub("3.1 Sebaran dan status surut"));
  t(kartu([{w: "banjir", v: n(bj.ringkas?.kejadian), ket: `kejadian banjir di ${n(bj.kab_n)} kabupaten/kota`}, {w: "banjir", v: n(st.sudah), ket: "kabupaten/kota sudah surut"},
    {w: "erupsi", v: n(st.belum), ket: "kabupaten/kota belum surut"}, {w: "data", v: n(st.belum_dilaporkan), ket: "kabupaten/kota belum dilaporkan"}]));
  t(`<p>Banjir tercatat <b>${n(bj.ringkas?.kejadian)}</b> kali di ${n(bj.kab_n)} kabupaten/kota di ${n(bj.ringkas?.prov)} provinsi. Pada ${esc(tgl(A.rentang?.[1]))}, ${n(st.sudah)} kabupaten/kota sudah surut, ${n(st.belum)} belum surut, dan ${n(st.belum_dilaporkan)} belum dilaporkan.
    ${bj.gabung_banjir_longsor ? `Sebanyak ${n(bj.gabung_banjir_longsor)} kejadian tercatat sebagai banjir dan tanah longsor dan dihitung sebagai banjir.` : ""}</p>`);
  if (dl && dl.status !== "ok") t(`<div class="lbk-catat"><p>Laporan surut harian Pusdalops ${dl.hari != null ? `baru tersedia ${n(dl.hari)} dari ${n(dl.hari_rentang)} hari` : "belum tersedia"}, jadi status surut belum menggambarkan sebulan penuh.</p></div>`);
  const kabB = new Map((bj.kab || []).map(k => [k.kode, k]));
  t(tabel(No.tabel(), `Kabupaten/kota terdampak banjir, ${bulan}`, ["Provinsi", "Kab/kota", "Kejadian", "Meninggal dan hilang", "Terdampak dan mengungsi", "Rumah rusak", "Status surut"],
    (bj.tabel || []).slice(0, 14).map(c => kabB.get(c)).filter(Boolean).map(k => [k.prov, k.nama, k.kejadian, k.dampak?.meninggal_hilang, k.dampak?.terdampak_mengungsi, k.dampak?.rumah_rusak, SURUT[k.surut] || "tidak diketahui"]),
    {sumber: `${SDIBI}; status surut dari ${NAMA_SUMBER.dalops_banjir}${tarik("dalops_banjir")}`}));
  t(sub("3.2 Pembanding dan tanah longsor"));
  const lg = b3.longsor;
  t(`<p>Pada ${esc(sebelum)} banjir tercatat ${n(b3.sebelumnya?.banjir?.lalu)} kali, jadi bulan ini ${esc(H.banding(b3.sebelumnya?.banjir))}. Tanah longsor tercatat <b>${n(lg.ringkas?.kejadian)}</b> kali di ${n(lg.ringkas?.kab)} kabupaten/kota, ${esc(H.banding(b3.sebelumnya?.longsor))} dibanding ${esc(sebelum)}, dengan ${n(lg.ringkas?.dampak?.meninggal_hilang)} orang meninggal dan hilang.</p>`);
  if ((lg.kab || []).length) t(tabel(No.tabel(), `Kabupaten/kota terdampak tanah longsor, ${bulan}`, ["Provinsi", "Kab/kota", "Kejadian", "Meninggal dan hilang", "Rumah rusak"],
    lg.kab.slice(0, 14).map(k => [k.prov, k.nama, k.kejadian, k.dampak?.meninggal_hilang, k.dampak?.rumah_rusak]), {sumber: SDIBI}));
  t(sub("3.3 Action plan")); t(actionPlan(I, "bab3")); t(catatanStaf(I, "bab3"));
  t(sub("3.4 Dokumentasi")); t(dokumentasi(I, ctx, "bab3"));

  /* Bab 4 */
  t = B(4, "Cuaca ekstrem dan kekeringan", "cuaca_ekstrem");
  t(sub("4.1 Sebaran dan dampak"));
  const ce = b4.cuaca_ekstrem, kk = b4.kekeringan;
  t(kartu([{w: "cuaca_ekstrem", v: n(ce.ringkas?.kejadian), ket: `kejadian cuaca ekstrem di ${n(ce.ringkas?.kab)} kabupaten/kota`},
    {w: "kekeringan", v: n(kk.ringkas?.kejadian), ket: `kejadian kekeringan di ${n(kk.ringkas?.kab)} kabupaten/kota`},
    {w: "data", v: n(ce.ringkas?.dampak?.rumah_rusak), ket: "rumah rusak akibat cuaca ekstrem"}, {w: "kekeringan", v: n(kk.ringkas?.dampak?.terdampak_mengungsi), ket: "orang terdampak kekeringan"}]));
  t(`<p>Cuaca ekstrem tercatat <b>${n(ce.ringkas?.kejadian)}</b> kali, ${esc(H.banding(b4.sebelumnya?.cuaca_ekstrem))} dibanding ${esc(sebelum)}. Kekeringan tercatat <b>${n(kk.ringkas?.kejadian)}</b> kali, ${esc(H.banding(b4.sebelumnya?.kekeringan))} dibanding ${esc(sebelum)}.</p>`);
  const kab4 = new Map([...(ce.kab || []), ...(kk.kab || [])].map(k => [k.jenis + "|" + k.kode, k]));
  t(tabel(No.tabel(), `Kabupaten/kota dengan dampak cuaca ekstrem dan kekeringan terbesar, ${bulan}`, ["Jenis", "Provinsi", "Kab/kota", "Kejadian", "Terdampak dan mengungsi", "Rumah rusak"],
    (b4.tabel || []).slice(0, 12).map(r => kab4.get(r.jenis + "|" + r.kode)).filter(Boolean).map(k => [L[k.jenis] || k.jenis, k.prov, k.nama, k.kejadian, k.dampak?.terdampak_mengungsi, k.dampak?.rumah_rusak]),
    {sumber: SDIBI}));
  t(sub("4.2 Action plan")); t(actionPlan(I, "bab4")); t(catatanStaf(I, "bab4"));
  t(sub("4.3 Dokumentasi")); t(dokumentasi(I, ctx, "bab4"));
  t(sub("4.4 Hujan tiga bulan ke depan"));
  const hj = b4.hujan;
  if (hj?.status === "ok" && (hj.wilayah || []).length) {
    t(`<p>Prakiraan anomali hujan musim ${esc(hj.label || hj.musim || "")} dibanding rata-rata. Nilai negatif berarti lebih kering dari biasa. ${esc(hj.catatan || "")}</p>`);
    t(tabel(No.tabel(), `Anomali hujan tiga bulan ke depan per wilayah, ${hj.label || ""}`, ["Wilayah", "Anomali hujan", "Rentang 10 sampai 90 persen", "Mutu model"],
      hj.wilayah.map(x => [x.nama, {v: H.persen(x.anom_pct), n: true}, {v: `${H.persen(x.p10)} sampai ${H.persen(x.p90)}`, n: true}, MUTU[x.mutu] || x.mutu || ""]),
      {sumber: `${hj.sumber || NAMA_SUMBER.prakiraan_hujan}, dibuat ${tgl(hj.dibuat)}${(hj.tidak_tampil || []).length ? `. ${hj.tidak_tampil.length} wilayah tidak ditampilkan karena belum lolos uji` : ""}`}));
    if (hj.ekstrapolasi || hj.di_luar_rentang) t(`<div class="lbk-catat"><p>Masukan model berada di luar rentang data latihnya, jadi prakiraan ini kurang pasti.</p></div>`);
  } else t(`<p>${kosong("prakiraan hujan belum ada di berkas angka")}</p>`);

  /* Bab 5 */
  t = B(5, "Geologi dan vulkanologi", "gempa");
  t(sub("5.1 Gempa bumi dan erupsi"));
  const ga = b5.gunungapi || {}, pl = ga.per_level || {};
  t(kartu([{w: "gempa", v: n(b5.peristiwa?.gempa), ket: `peristiwa gempa dari ${n(b5.laporan?.gempa)} laporan kabupaten/kota`},
    {w: "erupsi", v: n(b5.peristiwa?.erupsi), ket: `peristiwa erupsi dari ${n(b5.laporan?.erupsi)} laporan kabupaten/kota`},
    {w: "karhutla", v: n(pl["3"]), ket: "gunung api Level III (Siaga)"}, {w: "erupsi", v: n(pl["4"]), ket: "gunung api Level IV (Awas)"}]));
  t(`<p>Bab 1 menghitung laporan per kabupaten/kota, bab ini menghitung peristiwa. Satu gempa yang dirasakan di beberapa kabupaten/kota menjadi beberapa laporan:
    ${n(b5.laporan?.gempa)} laporan gempa berasal dari ${n(b5.peristiwa?.gempa)} peristiwa (selisih ${n(b5.selisih?.gempa)}), dan ${n(b5.laporan?.erupsi)} laporan erupsi dari ${n(b5.peristiwa?.erupsi)} peristiwa.</p>`);
  if ((b5.gempa || []).length) t(tabel(No.tabel(), `Peristiwa gempa bumi, ${bulan}`, ["Tanggal", "Magnitudo", "Provinsi", "Laporan kab/kota", "Luka", "Rumah rusak"],
    b5.gempa.map(g => [tgl(g.tanggal), {v: H.angka(g.mag, 1), n: true}, prov(g.prov_kode), g.laporan, g.dampak?.luka, g.dampak?.rumah_rusak]), {sumber: `${NAMA_SUMBER.gempa}${tarik("gempa")}; ${SDIBI}`}));
  if ((b5.erupsi || []).length) t(tabel(No.tabel(), `Peristiwa erupsi gunung api, ${bulan}`, ["Tanggal", "Gunung", "Provinsi", "Laporan kab/kota", "Terdampak dan mengungsi"],
    b5.erupsi.map(g => [tgl(g.tanggal), g.gunung || "", prov(g.prov_kode), g.laporan, g.dampak?.terdampak_mengungsi]), {sumber: `${NAMA_SUMBER.gunungapi}; ${SDIBI}`}));
  t(tabel(No.tabel(), `Status gunung api per ${tgl(ga.tanggal)}`, ["Level", "Jumlah gunung", "Nama gunung"],
    [["Level IV (Awas)", pl["4"], (ga.level_4 || []).join(", ")], ["Level III (Siaga)", pl["3"], (ga.level_3 || []).join(", ")], ["Level II (Waspada)", pl["2"], ""], ["Level I (Normal)", pl["1"], ""]],
    {sumber: `${NAMA_SUMBER.gunungapi}${tarik("gunungapi")}`}));
  t(sub("5.2 Action plan")); t(actionPlan(I, "bab5")); t(catatanStaf(I, "bab5"));
  t(sub("5.3 Dokumentasi")); t(dokumentasi(I, ctx, "bab5"));

  /* Bab 6 */
  t = B(6, "Program kerja", "data");
  t(`<p>Kegiatan dipilih staf dari siaran pers BNPB bulan ini.</p>`);
  t(isi(I.kegiatan) ? tabel(No.tabel(), `Kegiatan BNPB, ${bulan}`, ["Tanggal", "Kegiatan", "Lokasi", "Pelaksana"], I.kegiatan.map(k => [tgl(k.tanggal) || k.tanggal || "", k.kegiatan || "", k.lokasi || "", k.pelaksana || ""]))
    : `<p>${kosong("belum ada kegiatan dipilih")}</p>`);
  t(`<p>Laporan situasi harian yang terbit bulan ini: ${typeof I.laporan_situasi === "number" ? `<b>${n(I.laporan_situasi)}</b>` : kosong()}</p>`);
  t(sub("Dokumentasi")); t(dokumentasi(I, ctx, "bab6"));

  /* Bab 7 */
  t = B(7, "Prediksi dan dukungan", "prediksi");
  t(sub("7.1 Prediksi dua bulan berikutnya"));
  const b7 = A.bab7 || {}, en = b7.enso, pg = b7.peluang;
  if (en?.status === "ok") t(`<p>Indeks Pasifik (RONI) musim ${esc(en.musim)} ${esc(en.tahun)} bernilai <b>${H.angka(en.nilai, 2)}</b>, ${esc(en.golongan || "")} (ambang ${H.angka(en.ambang, 1)}).</p>`);
  if (pg?.status === "ok" && (pg.bulan || []).length) {
    t(`<p>Kabupaten/kota berpeluang tinggi: ${esc(pg.aturan || "")}.${pg.mutu === "hipotesis" ? ` ${kosong("hipotesis")}` : ""}</p>`);
    for (const bl of pg.bulan) {
      const baris = ["banjir", "longsor"].flatMap(j => (bl[j]?.kab || []).map(k => [L[j] || j, k.nama, prov(k.prov_kode), {v: `${n(k.tahun)} dari ${n((pg.tahun_penuh || []).length)} tahun`, n: true}]));
      t(tabel(No.tabel(), `Kabupaten/kota berpeluang tinggi banjir dan longsor, ${tgl(bl.bulan)}`, ["Jenis", "Kab/kota", "Provinsi", "Tahun tercatat"],
        baris.length ? baris : [[{v: "tidak ada kabupaten/kota yang memenuhi aturan", cls: "tk"}, "", "", ""]], {sumber: `${NAMA_SUMBER.peluang}, tahun penuh ${(pg.tahun_penuh || []).join(", ")}`}));
    }
  }
  if (en?.status !== "ok" && pg?.status !== "ok") t(`<p>${kosong("prediksi belum ada di berkas angka")}</p>`);
  else t(`<div class="lbk-catat"><p>${esc(b7.catatan || "Angka ini bukan prakiraan resmi BMKG.")}</p></div>`);
  t(sub("7.2 Dukungan yang dimohon"));
  t(isi(I.dukungan) ? tabel(No.tabel(), "Dukungan yang dimohon", ["Langkah", "Rincian", "Penanggung jawab", "Waktu"], I.dukungan.map(x => [x.langkah || "", x.rincian || "", x.pj || "", x.waktu || ""])) : `<p>${kosong()}</p>`);
  t(sub("7.3 Temuan utama untuk musim berikutnya"));
  const pilih7 = Array.isArray(I.temuan_bab7) && I.temuan_bab7.length ? I.temuan_bab7 : null;
  t(temuan((pilih7 || A.usulan_temuan || []).slice(0, 8), !pilih7));
  t(`<div class="lbk-arahan"><b>Arahan yang dimohon</b>${isi(I.arahan) ? paragraf(I.arahan) : `<p>${kosong()}</p>`}</div>`);
  t(teksStaf(I.penutup, "belum diisi: penutup"));
  t(`<div class="lbk-ttd"><p>${isi(I.kota) ? esc(I.kota) : kosong("kota")}, ${isi(I.tanggal) ? esc(tgl(I.tanggal) || I.tanggal) : kosong("tanggal")}</p>
    <p>Kepala Badan Nasional Penanggulangan Bencana</p><div class="ruang"></div><p><b class="lbk-kepala">${esc(H.KEPALA_BNPB)}</b></p></div>`);

  /* Lampiran */
  t = B(null, "Lampiran", "data");
  t(tabel(No.tabel(), `Kejadian bencana alam per provinsi dan jenis, ${bulan}`, ["Provinsi", ...JENIS.map(j => ({karhutla: "Karhutla", cuaca_ekstrem: "Cuaca ekstrem", gelombang: "Gelombang pasang", erupsi: "Erupsi"}[j] || L[j] || j)), "Jumlah"],
    (A.lampiran.prov_jenis || []).map(p => [p.nama, ...JENIS.map(j => p.jenis?.[j] ?? ""), p.kejadian]),
    {jumlah: ["Jumlah", ...JENIS.map(j => b1.jenis[j]?.kejadian), alam.kejadian], sumber: `${SDIBI}. Sel kosong: tidak ada laporan jenis itu`}));
  const m = A.lampiran.metode || {};
  t(sub("Catatan metode"));
  t(`<div class="lbk-catat">${(m.catatan || []).map(c => `<p>${esc(c)}</p>`).join("")}
    <p>Baris yang mencatat dampak sama di beberapa kabupaten/kota dihitung sekali: ${n(m.duplikat_dampak)} baris.</p>
    <p>Kejadian berjenis banjir dan tanah longsor dihitung sebagai banjir: ${n(m.gabung_banjir_longsor)} kejadian.</p></div>`);
  const dba = m.di_bawah_ambang || ambang || {};
  t(tabel(No.tabel(), `Laporan di bawah ambang bencana per jenis, ${bulan}`, ["Jenis", "Laporan di bawah ambang"],
    [...JENIS, ...NONALAM].map(j => [L[j] || j, dba.jenis?.[j] ?? {v: "tidak diketahui", cls: "tk"}]),
    {jumlah: ["Bencana alam, non-alam dan sosial", {v: `${n(dba.alam)} dan ${n(dba.bukan_alam)}`, n: true}], sumber: `${SDIBI}. Ambang bencana DIBI menurut Juklak BNPB 7/2023`}));
  t(sub("Daftar kegiatan dan tautan sumber"));
  t(isi(I.kegiatan) ? `<ul>${I.kegiatan.map(k => `<li>${esc(k.kegiatan || "")}${k.tautan ? `, ${esc(k.tautan)}` : ""}</li>`).join("")}</ul>` : `<p>${kosong("belum ada kegiatan dipilih")}</p>`);
  return bab;
}

/* ---------------------------------------------------------------- kertas dan pengaliran */
function kertas(ctx, {sampul = false} = {}) {
  const k = document.createElement("section");
  k.className = "lbk-kertas" + (sampul ? " lbk-sampul" : "");
  k.setAttribute("aria-label", "halaman laporan");
  const logo = `<div class="lbk-logo"><img src="/img/logo-kris.png" alt="KRIS" width="155" height="36"><img src="/lapor/lambang-bnpb.png" alt="BNPB" width="36" height="36"></div>`;
  k.innerHTML = (sampul ? "" : `<header class="lbk-kp"><div><b>Laporan Bencana ${esc(ctx.nama)}</b><span>Badan Nasional Penanggulangan Bencana</span></div>${logo}</header>`) +
    `<div class="lbk-badan"></div><footer class="lbk-kaki"><span>${ALAMAT}</span><span class="lbk-hal"></span></footer>` +
    (ctx.versi > 0 ? "" : `<div class="lbk-air" aria-hidden="true"><span>Draf, belum dibekukan</span></div>`);
  ctx.akar.append(k);
  return k.querySelector(".lbk-badan");
}
const penuh = badan => badan.scrollHeight > badan.clientHeight + 1;
function taruh(ctx, html) {
  if (!html) return;
  const t = document.createElement("template"); t.innerHTML = html.trim();
  if (!t.content.firstElementChild) return;
  const simpul = [...t.content.children];
  ctx.badan.append(...simpul);
  if (!penuh(ctx.badan)) return;
  if (simpul.length === 1 && simpul[0].classList.contains("lbk-tb")) return pecahTabel(ctx, simpul[0]);
  if (ctx.badan.children.length > simpul.length) pindah(ctx, simpul);
}
/* blok pindah ke kertas baru; subjudul yang tertinggal di dasar kertas ikut pindah */
function pindah(ctx, simpul) {
  const lama = ctx.badan, ekor = simpul[0].previousElementSibling, ikut = ekor?.tagName === "H3" && lama.children.length > simpul.length + 1 ? [ekor] : [];
  [...ikut, ...simpul].forEach(s => s.remove());
  ctx.badan = kertas(ctx); ctx.badan.append(...ikut, ...simpul);
}
/* tabel lebih panjang dari sisa kertas: baris dipecah ke kertas berikutnya dengan kepala kolom diulang dan judul "(lanjutan)";
   baris sumber hanya di potongan terakhir. Kurang dari 3 baris muat: seluruh tabel pindah ke kertas baru. */
function pecahTabel(ctx, el) {
  while (penuh(ctx.badan)) {
    const tb = el.querySelector("tbody"), sisa = [];
    while (penuh(ctx.badan) && tb.rows.length > 3) { const r = tb.lastElementChild; r.remove(); sisa.unshift(r); }
    if (penuh(ctx.badan)) {
      tb.append(...sisa);
      if (ctx.badan.children.length === 1) return;   // sudah sendirian di kertas: tidak bisa lebih kecil (uji luapan menangkapnya)
      pindah(ctx, [el]); continue;
    }
    if (!sisa.length) return;
    const lanjut = el.cloneNode(true);
    lanjut.querySelector("tbody").replaceChildren(...sisa);
    lanjut.querySelector(".lbk-cap").append(" (lanjutan)");
    el.querySelector(".lbk-sumber")?.remove();
    ctx.badan = kertas(ctx); ctx.badan.append(lanjut); el = lanjut;
  }
}

export async function susun(akar, A, I = {}, {versi = 0, periode = "bulanan", kode = A?.kode, geo = null} = {}) {
  const ctx = {akar, versi, periode, kode, geo, nama: A.nama || tgl(A.kode), badan: null};
  akar.textContent = "";
  /* sampul */
  const s = kertas(ctx, {sampul: true}), fotoS = (I.foto || []).find(f => f?.bab === "sampul" && /^[0-9a-f]{64}$/.test(f.id || ""));
  s.innerHTML = `<div style="display:flex;flex-direction:column;gap:4mm"><div class="lbk-logo"><img src="/img/logo-kris.png" alt="KRIS" width="220" height="51"><img src="/lapor/lambang-bnpb.png" alt="BNPB" width="51" height="51"></div>
    <span class="lbk-pil">Laporan bulanan Kepala BNPB</span><h1>Laporan Bencana ${esc(ctx.nama)}</h1><div class="lbk-sub">Kepada Presiden Republik Indonesia</div></div>
    <div class="lbk-foto-sampul">${fotoS ? `<img alt="${esc(fotoS.ket)}" src="/api/laporan-berkala/foto?periode=${periode}&kode=${kode}&id=${fotoS.id}" style="width:100%;height:100%;object-fit:cover;border-radius:2mm">` : kosong("foto sampul belum dipilih")}</div>
    <dl class="lbk-dl"><dt>Kepada</dt><dd>Presiden Republik Indonesia</dd><dt>Dari</dt><dd>Kepala Badan Nasional Penanggulangan Bencana,<br><span class="lbk-kepala">${esc(H.KEPALA_BNPB)}</span></dd>
    <dt>Tempat dan tanggal</dt><dd>${isi(I.kota) ? esc(I.kota) : kosong("kota")}, ${isi(I.tanggal) ? esc(tgl(I.tanggal) || I.tanggal) : kosong("tanggal")}</dd>
    <dt>Versi</dt><dd>${versi > 0 ? `Versi ${n(versi)}, dibekukan` : "Draf, belum dibekukan"}</dd></dl>`;
  /* daftar isi dan tentang laporan */
  ctx.badan = kertas(ctx);
  const src = A.sumber || {};
  taruh(ctx, `<h2>Daftar isi</h2>`);
  taruh(ctx, `<ol class="lbk-di" id="lbDi"></ol>`);
  taruh(ctx, `<h2 style="margin-top:4mm">Tentang laporan ini</h2>`);
  taruh(ctx, `<p>Angka di laporan ini dihitung mesin dari sumber di tabel berikut, dirakit ${esc(waktu(A.dirakit))}. Kalimat pembuka, <i>action plan</i>, dukungan, arahan, kegiatan, dan foto ditulis atau dipilih staf BNPB.
    ${versi > 0 ? `Ini versi ${n(versi)} yang sudah dibekukan.` : "Ini draf yang belum dibekukan; angkanya masih bisa berubah bila sumber diperbarui."}</p>`);
  taruh(ctx, tabel(null, "Sumber data dan tanggal tarik", ["Sumber", "Tanggal tarik", "Keadaan"], Object.entries(src).map(([k, v]) => [NAMA_SUMBER[k] || k, tgl(v.tarik) || {v: "tidak diketahui", cls: "tk"},
    (KEADAAN[v.status] || v.status || "") + (v.status === "sebagian" && v.hari != null ? `, ${n(v.hari)} dari ${n(v.hari_rentang)} hari` : "")])));
  /* bab */
  const toc = [];
  for (const b of blokBulanan(A, I, ctx)) {
    ctx.badan = kertas(ctx);
    const [no, judul, warna] = b.bab;
    toc.push([no ? `Bab ${no} ${judul}` : judul, akar.children.length]);
    taruh(ctx, pembukaBab(no, judul, warna));
    for (const h of b.blok) taruh(ctx, h);
  }
  const hal = [...akar.querySelectorAll(".lbk-kertas")];
  hal.forEach((k, i) => { k.querySelector(".lbk-hal").textContent = `Halaman ${i + 1} dari ${hal.length}`; });
  akar.querySelector("#lbDi").innerHTML = toc.map(([j, h]) => `<li><span>${esc(j)}</span><b>${h}</b></li>`).join("");
  return hal.length;
}

/* ---------------------------------------------------------------- layar isian (LB-06)
   Kiri: kartu per bab berisi angka mesin (baca saja) dan kolom staf. Kanan: pratinjau A4. Ketik langsung mengubah isian di memori;
   pratinjau digambar ulang tertunda (jadwal) supaya ketik dan klik tidak tertahan. Isian TIDAK pernah ditulis ke localStorage
   (KEAMANAN-PRIVASI 4, L12): sampai rute LB-07 ada, isian hanya di memori halaman, ditandai "Belum tersimpan di server", dan
   staf diingatkan sebelum meninggalkan halaman. */
async function ambil(url) { try { const r = await fetch(url, {credentials: "same-origin", cache: "no-store"}); return r.ok ? await r.json() : null; } catch (e) { return null; } }
const kiniWib = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
const IK = {hari: "M4 5h16v15H4zM4 10h16M9 3v4M15 3v4M11 14h2v2h-2z", minggu: "M4 5h16v15H4zM4 10h16M9 3v4M15 3v4M7 14h10", bulan: "M4 5h16v15H4zM4 10h16M9 3v4M15 3v4M7 14h3M14 14h3M7 17h3",
  tahun: "M4 7h16v13H4zM7 4h10M9 11h6M9 15h6", ringkas: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5", umum: "M4 20V10M10 20V4M16 20v-7M22 20H2", api: "M12 3c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-5 1-8z",
  air: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z", awan: "M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11 2 3 3 0 0 0 1 6z", gunung: "M3 20l6-10 4 6 2-3 6 7z", program: "M9 4h6v3H9zM6 5h3M15 5h3v16H6V5M9 12h6M9 16h4",
  prediksi: "M3 17l5-5 4 4 8-8M15 8h5v5", sampul: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4", tambah: "M12 5v14M5 12h14", hapus: "M6 6l12 12M18 6L6 18"};
const ikon = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const PERIODE = [["harian", "Harian", IK.hari], ["mingguan", "Mingguan", IK.minggu], ["bulanan", "Bulanan", IK.bulan], ["tahunan", "Tahunan", IK.tahun]];
const MASUKAN = {harian: {label: "Tanggal", type: "date", pola: "\\d{4}-\\d{2}-\\d{2}", contoh: "2026-11-11"}, mingguan: {label: "Minggu", type: "week", pola: "\\d{4}-W\\d{2}", contoh: "2026-W46"},
  bulanan: {label: "Bulan", type: "month", pola: "\\d{4}-\\d{2}", contoh: "2026-10"}, tahunan: {label: "Tahun", type: "text", pola: "\\d{4}", contoh: "2025"}};
const didukung = t => { const i = document.createElement("input"); i.type = t; return i.type === t; };   // week dan month belum ada di Firefox dan Safari desktop: jatuh ke teks berpola
const PIL = ["karhutla", "data", "banjir", "iklim", "prediksi", "vulkanologi"];
const PELAKSANA = ["Kepala BNPB", "Pusdatinkom", "Satgas operasi"];
const DAFTAR = {
  dukungan: {maks: 30, baru: "Tambah dukungan", kolom: [["langkah", "Langkah", "a"], ["rincian", "Rincian", "a"], ["pj", "Penanggung jawab"], ["waktu", "Waktu"]]},
  kegiatan: {maks: 200, baru: "Tambah kegiatan", kolom: [["tanggal", "Tanggal", "date"], ["kegiatan", "Kegiatan", "a"], ["lokasi", "Lokasi"], ["pelaksana", "Pelaksana", "pilih"], ["tautan", "Tautan sumber", "url"]]}};

/* jalur "action.bab1.sudah", "dukungan.0.langkah" */
const dapat = (o, p) => p.split(".").reduce((x, k) => x == null ? undefined : x[k], o);
function tulis(o, p, v) {
  const k = p.split("."), akhir = k.pop();
  const wadah = k.reduce((x, s, i) => x[s] ??= (/^\d+$/.test(k[i + 1] ?? akhir) ? [] : {}), o);
  if (v === undefined) delete wadah[akhir]; else wadah[akhir] = v;
}
const nid = p => "lbkf-" + p.replace(/[^a-z0-9]+/gi, "-");
function teks(I, p, label, {baris = 3, bantu = "", jenis = "a", wajibIsi = true} = {}) {
  const id = nid(p), v = dapat(I, p) ?? "", h = bantu ? ` aria-describedby="${id}-h"` : "";
  const pil = wajibIsi ? `<span class="lbk-kosong">belum diisi</span>` : "";
  let ctl;
  if (jenis === "a") ctl = `<textarea id="${id}" data-p="${p}" rows="${baris}" maxlength="2000" placeholder=" "${h}>${esc(v)}</textarea>`;
  else if (jenis === "pilih") ctl = `<select id="${id}" data-p="${p}"${h}><option value="">pilih</option>${PELAKSANA.map(x => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>`;
  else if (jenis === "pil") ctl = `<select id="${id}" data-p="${p}"${h}>${PIL.map(x => `<option${x === v ? " selected" : ""}>${x}</option>`).join("")}</select>`;
  else ctl = `<input id="${id}" data-p="${p}" type="${jenis === "angka" ? "number" : jenis}"${jenis === "angka" ? ' min="0" step="1" inputmode="numeric"' : ""}${jenis === "date" ? " required" : ""} maxlength="2000" placeholder=" " value="${esc(v)}"${h}>`;
  return `<div class="lbk-f"><label for="${id}">${esc(label)}${pil}</label>${ctl}${bantu ? `<small id="${id}-h" class="lbk-h">${esc(bantu)}</small>` : ""}</div>`;
}
const mesin = daftar => `<dl class="lbk-mesin" aria-label="Angka dari mesin, baca saja">${daftar.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
const apIsian = (I, bab) => `<fieldset class="lbk-ap3"><legend>Action plan</legend>${[["sudah", "Sudah dilakukan"], ["sedang", "Sedang berjalan"], ["akan", "Akan dilakukan"]]
  .map(([k, l]) => teks(I, `action.${bab}.${k}`, l, {baris: 4})).join("")}</fieldset>`;
const catatanIsian = (I, bab) => teks(I, `catatan.${bab}`, "Catatan bab (pilihan)", {baris: 2, wajibIsi: false, bantu: "Tampil sebagai kotak catatan di bab ini. Boleh dikosongkan."});

function daftarIsian(I, nama) {
  const D = DAFTAR[nama], xs = Array.isArray(I[nama]) ? I[nama] : [];
  return `<div class="lbk-daftar" data-daftar="${nama}">${xs.map((_, i) => `<div class="lbk-baris"><div class="lbk-baris-k"><b>Baris ${i + 1}</b>
    <button type="button" class="lbk-ik" data-hapus="${nama}.${i}" aria-label="Hapus baris ${i + 1}" title="Hapus baris">${ikon(IK.hapus)}</button></div>
    <div class="lbk-baris-g">${D.kolom.map(([k, l, j]) => teks(I, `${nama}.${i}.${k}`, l, {jenis: j || "text", baris: 2})).join("")}</div></div>`).join("")}
    <button type="button" class="lbk-tambah" data-tambah="${nama}"${xs.length >= D.maks ? " disabled" : ""}>${ikon(IK.tambah)}${D.baru}</button></div>`;
}
function temuanIsian(A, I, nama) {
  const maks = H.MAKS_TEMUAN[nama], xs = Array.isArray(I[nama]) ? I[nama] : [], usul = A.usulan_temuan || [], penuhT = xs.length >= maks;
  const dipilih = new Set(xs.map(t => t?.kode).filter(Boolean));
  return `<div class="lbk-daftar" data-daftar="${nama}"><p class="lbk-h">Pilih paling banyak ${maks}. Usulan mesin memakai angka dari berkas angka; kalimatnya boleh disunting. Temuan yang ditulis sendiri wajib berangka dan bersumber.</p>
    <fieldset class="lbk-usul"><legend>Usulan mesin</legend>${usul.length ? usul.map(u => { const on = dipilih.has(u.kode);
      return `<label class="lbk-u"><input type="checkbox" data-usul="${nama}" value="${esc(u.kode)}"${on ? " checked" : ""}${penuhT && !on ? " disabled" : ""}>
        <span><span class="lbk-tg" style="${w(u.pil)}">${esc(u.pil || "temuan")}</span>${esc(u.kalimat || "")}</span><small>Sumber: ${esc(u.sumber || "tidak diketahui")}</small></label>`; }).join("")
      : `<p class="lbk-h">Berkas angka ini tidak memuat usulan temuan.</p>`}</fieldset>
    <p class="lbk-lbl">Dipilih: ${xs.length} dari ${maks}</p>
    ${xs.map((t, i) => `<div class="lbk-baris"><div class="lbk-baris-k"><b>Temuan ${i + 1}</b><span>${t?.kode ? `usulan mesin ${esc(t.kode)}` : "ditulis staf"}</span>
      <button type="button" class="lbk-ik" data-hapus="${nama}.${i}" aria-label="Hapus temuan ${i + 1}" title="Hapus temuan">${ikon(IK.hapus)}</button></div>
      <div class="lbk-baris-g">${teks(I, `${nama}.${i}.pil`, "Pil", {jenis: "pil", wajibIsi: false})}${teks(I, `${nama}.${i}.judul`, "Judul", {jenis: "text", wajibIsi: false})}</div>
      ${teks(I, `${nama}.${i}.kalimat`, "Kalimat berangka", {baris: 3})}${teks(I, `${nama}.${i}.sumber`, "Sumber", {jenis: "text"})}</div>`).join("")}
    <button type="button" class="lbk-tambah" data-tambah="${nama}"${penuhT ? " disabled" : ""}>${ikon(IK.tambah)}Tambah temuan sendiri</button></div>`;
}

function kartuIsian(A, I) {
  const b1 = A.bab1 || {}, b2 = A.bab2 || {}, b3 = A.bab3 || {}, b4 = A.bab4 || {}, b5 = A.bab5 || {}, en = A.bab7?.enso, d = b1.alam?.dampak || {};
  const st = b3.banjir?.status || {}, pl = b5.gunungapi?.per_level || {}, kel = b1.kelompok || {};
  const K = (ik, ey, judul, isi, buka = false) => `<details class="ex ex-std lbk-k"${buka ? " open" : ""}><summary class="ex-hd"><span class="ex-ey">${ikon(ik)}${esc(ey)}</span>
    <div class="ex-jd"><h3>${esc(judul)}</h3></div></summary><div class="ex-bd">${isi}</div></details>`;
  return [
    K(IK.ringkas, "Ringkasan", "Ringkasan Eksekutif", mesin([["Kejadian, semua laporan", n(b1.alam?.kejadian)], ["Kejadian, resmi DIBI", n(b1.resmi?.alam?.kejadian)],
      ["Meninggal dan hilang", n(d.meninggal_hilang)], ["Terdampak dan mengungsi", n(d.terdampak_mengungsi)], ["Rumah rusak", n(d.rumah_rusak)]]) +
      teks(I, "pembuka", "Kalimat pembuka", {baris: 4, bantu: "Ditulis staf. Angka tidak perlu diketik ulang; paragraf fakta berangka sudah disusun mesin."}) +
      `<p class="lbk-lbl">Temuan utama</p>` + temuanIsian(A, I, "temuan_ringkas"), true),
    K(IK.umum, "Bab 1", "Gambaran umum", mesin([["Kelompok kering", n(kel.kering?.kejadian)], ["Kelompok basah", n(kel.basah?.kejadian)], ["Kelompok geologi", n(kel.geologi?.kejadian)],
      ["Provinsi", n(b1.alam?.prov)], ["Kab/kota", n(b1.alam?.kab)]]) + apIsian(I, "bab1") + catatanIsian(I, "bab1")),
    K(IK.api, "Bab 2", "Karhutla", mesin([["Hotspot", n(b2.hot)], ["Puncak harian", n(b2.puncak?.hot)], ["Luas terbakar perkiraan (ha)", H.luas(b2.luas)], ["Belum padam (ha)", H.luas(b2.belum)]]) +
      teks(I, "operasi", "Angka operasi", {baris: 3, bantu: "Personel darat, armada udara, sorti OMC, garam, dan lainnya, masing-masing dengan sumbernya. Hotspot dan luas tidak diketik; angkanya dari sistem."}) +
      apIsian(I, "bab2") + catatanIsian(I, "bab2")),
    K(IK.air, "Bab 3", "Banjir dan tanah longsor", mesin([["Kejadian banjir", n(b3.banjir?.ringkas?.kejadian)], ["Kab/kota sudah surut", n(st.sudah)], ["Kab/kota belum surut", n(st.belum)],
      ["Kab/kota belum dilaporkan", n(st.belum_dilaporkan)], ["Kejadian tanah longsor", n(b3.longsor?.ringkas?.kejadian)]]) + apIsian(I, "bab3") + catatanIsian(I, "bab3")),
    K(IK.awan, "Bab 4", "Cuaca ekstrem dan kekeringan", mesin([["Kejadian cuaca ekstrem", n(b4.cuaca_ekstrem?.ringkas?.kejadian)], ["Kejadian kekeringan", n(b4.kekeringan?.ringkas?.kejadian)]]) +
      apIsian(I, "bab4") + catatanIsian(I, "bab4")),
    K(IK.gunung, "Bab 5", "Geologi dan vulkanologi", mesin([["Peristiwa gempa", n(b5.peristiwa?.gempa)], ["Peristiwa erupsi", n(b5.peristiwa?.erupsi)], ["Gunung api Level III", n(pl["3"])], ["Gunung api Level IV", n(pl["4"])]]) +
      apIsian(I, "bab5") + catatanIsian(I, "bab5")),
    K(IK.program, "Bab 6", "Program kerja", `<p class="lbk-h">Daftar calon dari siaran pers belum tersedia, jadi kegiatan ditulis staf. Tautan sumber tampil di Lampiran sebagai teks.</p>` +
      daftarIsian(I, "kegiatan") + teks(I, "laporan_situasi", "Laporan situasi harian yang terbit", {jenis: "angka", bantu: "Banyaknya laporan situasi harian pada periode ini. Kosong tetap tertulis belum diisi, bukan 0."})),
    K(IK.prediksi, "Bab 7", "Prediksi dan dukungan", mesin([["Indeks RONI", en?.status === "ok" ? H.angka(en.nilai, 2) : "tidak diketahui"], ["Usulan temuan mesin", n((A.usulan_temuan || []).length)]]) +
      `<p class="lbk-lbl">Dukungan yang dimohon</p>` + daftarIsian(I, "dukungan") +
      `<p class="lbk-lbl">Temuan untuk musim berikutnya</p>` + temuanIsian(A, I, "temuan_bab7") +
      teks(I, "arahan", "Arahan yang dimohon", {baris: 3}) + teks(I, "penutup", "Penutup", {baris: 3})),
    K(IK.sampul, "Sampul", "Sampul dan tanda tangan", teks(I, "kota", "Kota", {jenis: "text"}) + teks(I, "tanggal", "Tanggal surat", {jenis: "date"}) +
      `<p class="lbk-h">Nama dan gelar Kepala BNPB diisi mesin. Foto sampul dan dokumentasi menyusul bersama unggah foto.</p>`),
  ].join("");
}

async function mulai() {
  const q = new URLSearchParams(location.search), hariIni = kiniWib();
  const periode = H.NAMA_PERIODE[q.get("periode")] ? q.get("periode") : "bulanan";
  let kode = q.get("kode") || "";
  if (!kode) { kode = H.kodeTerakhir(periode, hariIni); history.replaceState(null, "", `${location.pathname}?jenis=berkala&periode=${periode}&kode=${kode}`); }
  const link = document.createElement("link"); link.rel = "stylesheet"; link.href = "/laporan_berkala_cetak.css"; document.head.append(link);
  const wadah = document.querySelector("#p-paparan"), lama = wadah?.querySelector(".pp");
  if (!wadah) return;
  if (lama) lama.hidden = true;
  const sek = document.createElement("div"); sek.className = "pp lbk";
  sek.innerHTML = `<section class="pp-kep lbk-alat"><div class="pp-jd"><h1>Laporan BNPB</h1><p id="lbkJudul"></p></div>
    <form class="lbk-pilih" id="lbkPilih" novalidate aria-label="Pilih periode laporan">
      <fieldset class="lbk-seg"><legend class="lbk-sr">Periode</legend>${PERIODE.map(([v, l, ik]) => `<label><input type="radio" name="periode" value="${v}"${v === periode ? " checked" : ""}>${ikon(ik)}<span>${l}</span></label>`).join("")}</fieldset>
      <div class="lbk-kode"><label for="lbkKode" id="lbkKodeL"></label><div class="lbk-kode-b"><input id="lbkKode" name="kode" required autocomplete="off" spellcheck="false" aria-describedby="lbkKodeH">
        <button type="submit" class="pp-btn">Buka</button></div><small id="lbkKodeH" class="lbk-h"></small></div>
    </form>
    <div class="pp-ctl"><button type="button" class="pp-btn ke2" id="lbkSimpan" hidden>Simpan draf</button><button type="button" class="pp-btn" id="lbkBekukan" hidden>Bekukan</button>
      <button type="button" class="pp-btn" id="lbkVersi" hidden>Buat versi baru</button><button type="button" class="pp-btn" id="lbkCetak" disabled>Cetak PDF</button>
      <label class="pp-btn ke2 lbk-buka">Buka berkas angka<input type="file" id="lbkBerkas" accept="application/json,.json" hidden></label>
      <span class="lbk-pil-st" id="lbkServer" hidden title="Isian hanya ada di halaman ini sampai tersimpan di server. Isian tidak disimpan di peramban.">Belum tersimpan di server</span></div>
    <div class="pp-st" id="lbkSt" role="status" aria-live="polite">Memuat berkas angka…</div>
    <div class="lbk-kurang-w" id="lbkKurangW" tabindex="-1" hidden><b>Yang masih kurang sebelum Bekukan</b><ul class="lbk-kurang" id="lbkKurang"></ul></div></section>
    <div class="lbk-tata"><aside class="pp-atur lbk-isian" aria-label="Isian staf" hidden><form id="lbkIsian" novalidate><fieldset class="lbk-fs" id="lbkIsianFs"><legend class="lbk-sr">Isian staf</legend></fieldset></form></aside>
    <div class="lbk-w" tabindex="0" role="region" aria-label="Pratinjau cetak A4"><div id="lbkKertas"></div></div></div>`;
  const jenis = lama?.querySelector("#lbJenis")?.cloneNode(true);   // deretan jenis yang sama dengan dua jenis lain, ikon ikut
  if (jenis) {
    jenis.removeAttribute("id");
    jenis.querySelectorAll("button").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.j === "berkala"));
      b.onclick = () => { if (b.dataset.j !== "berkala") location.href = b.dataset.j === "presiden" ? "/laporan-bnpb?jenis=presiden" : "/laporan-bnpb"; }; });
    sek.querySelector(".pp-jd").after(jenis);
  }
  wadah.append(sek);
  const $ = s => sek.querySelector(s), st = t => { $("#lbkSt").textContent = t; };
  const upd = document.querySelector("#upd"); if (upd) upd.textContent = "Laporan Berkala";

  /* pemilih periode dan kode: chrome langsung, buka = muat ulang halaman (beforeunload menjaga isian yang belum tersimpan) */
  const inp = $("#lbkKode");
  const aturKode = (p, nilai) => {
    const m = MASUKAN[p], asli = m.type !== "text" && didukung(m.type), maks = H.kodeTerakhir(p, hariIni);
    inp.type = asli ? m.type : "text";
    if (asli) { inp.max = maks; inp.removeAttribute("pattern"); inp.removeAttribute("inputmode"); }
    else { inp.removeAttribute("max"); inp.pattern = m.pola; if (p === "tahunan") inp.inputMode = "numeric"; else inp.removeAttribute("inputmode"); }
    inp.value = H.kodeSah(p, nilai) ? nilai : maks;
    inp.setCustomValidity(""); inp.removeAttribute("aria-invalid");
    $("#lbkKodeL").textContent = m.label;
    $("#lbkKodeH").textContent = `${asli ? "" : `Tulis dengan bentuk ${m.contoh}. `}Paling akhir ${maks}; periode yang masih berjalan belum bisa dipilih.`;
  };
  aturKode(periode, kode);
  $("#lbkPilih").addEventListener("change", e => { if (e.target.name === "periode") aturKode(e.target.value, ""); });
  inp.addEventListener("input", () => { inp.setCustomValidity(""); inp.removeAttribute("aria-invalid"); });
  $("#lbkPilih").addEventListener("submit", e => {
    e.preventDefault();
    const p = new FormData(e.target).get("periode"), k = inp.value.trim(), m = MASUKAN[p];
    const pesan = !H.kodeSah(p, k) ? `${m.label} belum sah. Tulis dengan bentuk ${m.contoh}.` : !H.selesai(p, k, hariIni) ? "Periode ini belum selesai. Pilih periode yang sudah lewat." : "";
    if (pesan) { inp.setCustomValidity(pesan); inp.setAttribute("aria-invalid", "true"); inp.reportValidity(); st(pesan); return; }
    if (S.kotor && !confirm("Isian belum tersimpan di server dan akan hilang. Tetap buka periode lain?")) return;
    S.kotor = false; location.search = `?jenis=berkala&periode=${p}&kode=${encodeURIComponent(k)}`;
  });

  const judul = H.judulPeriode(periode, kode);
  $("#lbkJudul").textContent = judul || "Periode belum dipilih";
  const S = {A: null, I: {}, versi: 0, versiBeku: 0, diubah: null, tarik: "terbaru", kotor: false};
  if (!H.kodeSah(periode, kode)) { st(`Kode periode tidak sah. Pilih periode lalu tekan Buka.`); return; }
  if (!H.selesai(periode, kode, hariIni)) { st("Periode ini belum selesai. Pilih periode yang sudah lewat."); return; }
  if (periode !== "bulanan") { st("Isian dan halaman cetak laporan harian, mingguan, dan tahunan menyusul. Saat ini baru laporan bulanan."); return; }

  const geoJanji = ambil("/geo/provinsi.json"), fs = $("#lbkIsianFs"), form = $("#lbkIsian");
  const tandaServer = () => { $("#lbkServer").hidden = !(S.kotor && S.versi === 0); };
  const daftarKurang = () => {
    if (!S.A) return ["Berkas angka belum ada"];
    const k = H.kelengkapan(S.A, S.I, periode), ukuran = JSON.stringify(S.I).length;
    if (ukuran > 98304) k.push(`Isian ${n(Math.ceil(ukuran / 1024))} KB, paling besar 96 KB`);   // MAKS_ISI src/laporan_bnpb.js
    return k;
  };
  const tampilKurang = k => { $("#lbkKurangW").hidden = !k.length || S.versi > 0; $("#lbkKurang").replaceChildren(...k.map(x => Object.assign(document.createElement("li"), {textContent: x}))); };
  const aturMode = () => {
    const beku = S.versi > 0;
    fs.disabled = beku; $("#lbkSimpan").hidden = beku; $("#lbkBekukan").hidden = beku; $("#lbkVersi").hidden = !beku;
    tandaServer();
  };
  const hariSejak = () => { const t = S.A?.sumber?.dibi?.tarik, a = S.A?.rentang?.[1]; return t && a ? Math.round((Date.parse(t) - Date.parse(a)) / 864e5) : null; };
  let sedang = false, lagi = false, tunda = 0;
  const gambarUlang = async () => {
    const A = S.A; if (!A) return;
    if (sedang) { lagi = true; return; }
    sedang = true;
    try {
      $("#lbkCetak").disabled = true;
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));   // chrome tampil dulu, kerja berat sesudahnya
      await document.fonts?.ready;
      const jml = await susun($("#lbkKertas"), A, S.I, {versi: S.versi, periode, kode, geo: await geoJanji});
      const kurang = daftarKurang(), hs = hariSejak();
      tampilKurang(kurang);
      st(`${S.versi > 0 ? `Beku versi ${S.versi}` : "Draf"}, angka DIBI tarik ${tgl(A.sumber?.dibi?.tarik) || "tidak diketahui"}${hs != null ? ` (${n(hs)} hari sesudah akhir bulan)` : ""}, dirakit ${waktu(A.dirakit)}. ${jml} halaman A4.` +
        (S.versi === 0 && hs != null && hs < 7 ? " DIBI ditarik kurang dari 7 hari sesudah akhir bulan, jadi angkanya masih bisa bertambah." : ""));
      $("#lbkCetak").disabled = false;
    } finally { sedang = false; if (lagi) { lagi = false; gambarUlang(); } }
  };
  const jadwal = () => { clearTimeout(tunda); tunda = setTimeout(gambarUlang, 700); };
  const ubah = () => { S.kotor = true; tandaServer(); jadwal(); };
  const gambarIsian = () => { fs.querySelectorAll(":scope > :not(legend)").forEach(x => x.remove()); fs.insertAdjacentHTML("beforeend", kartuIsian(S.A, S.I)); $(".lbk-isian").hidden = false; aturMode(); };
  const gambarDaftar = nama => {
    const lamaEl = fs.querySelector(`[data-daftar="${nama}"]`); if (!lamaEl) return;
    const t = document.createElement("template"); t.innerHTML = nama.startsWith("temuan") ? temuanIsian(S.A, S.I, nama) : daftarIsian(S.I, nama);
    const baru = t.content.firstElementChild; lamaEl.replaceWith(baru); return baru;
  };

  /* isian: satu pendengar per jenis peristiwa (delegasi); hanya mengubah memori dan bagian kecil, pratinjau lewat jadwal() */
  form.addEventListener("input", e => {
    const el = e.target, p = el.dataset?.p; if (!p) return;
    tulis(S.I, p, el.type === "number" ? (el.value === "" || !Number.isFinite(+el.value) ? undefined : +el.value) : el.value);
    ubah();
  });
  form.addEventListener("change", e => {
    const el = e.target, nama = el.dataset?.usul; if (!nama) return;
    const u = (S.A.usulan_temuan || []).find(x => x.kode === el.value); if (!u) return;
    const xs = Array.isArray(S.I[nama]) ? S.I[nama] : (S.I[nama] = []);
    if (el.checked) { if (xs.length < H.MAKS_TEMUAN[nama]) xs.push({kode: u.kode, pil: u.pil || "data", judul: "", kalimat: u.kalimat || "", sumber: u.sumber || ""}); }
    else S.I[nama] = xs.filter(t => t?.kode !== u.kode);
    gambarDaftar(nama)?.querySelector(`[data-usul][value="${CSS.escape(u.kode)}"]`)?.focus();
    ubah();
  });
  form.addEventListener("click", e => {
    const b = e.target.closest("button[data-tambah],button[data-hapus]"); if (!b) return;
    if (b.dataset.tambah) {
      const nama = b.dataset.tambah, xs = Array.isArray(S.I[nama]) ? S.I[nama] : (S.I[nama] = []);
      xs.push(nama.startsWith("temuan") ? {pil: "data", judul: "", kalimat: "", sumber: ""} : {});
      const el = gambarDaftar(nama), baris = el?.querySelectorAll(".lbk-baris");
      baris?.[baris.length - 1]?.querySelector("input:not([type=checkbox]),textarea,select")?.focus();
    } else {
      const [nama, i] = b.dataset.hapus.split(".");
      S.I[nama] = (S.I[nama] || []).filter((_, j) => j !== +i);
      gambarDaftar(nama)?.querySelector(".lbk-tambah")?.focus();
    }
    ubah();
  });

  const kirim = (url, isi) => fetch(url, {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json"}, body: JSON.stringify(isi)})
    .then(async r => ({r, j: await r.json().catch(() => ({}))}));
  const belumAda = r => r.status === 404 || r.status === 405;
  async function simpan() {
    const b = $("#lbkSimpan"); b.disabled = true; st("Menyimpan draf…");
    try {
      const {r, j} = await kirim("/api/laporan-berkala", {periode, kode, isian: S.I, tarik: S.tarik, diubah: S.diubah});
      if (r.ok) { S.diubah = j.diubah ?? S.diubah; S.kotor = false; tandaServer(); st("Draf tersimpan di server."); return true; }
      st(belumAda(r) ? "Penyimpanan draf di server belum tersedia. Isian hanya ada di halaman ini dan hilang bila halaman ditutup."
        : r.status === 403 ? "Simpan draf dan Bekukan hanya untuk admin."
        : r.status === 409 ? "Draf ini baru diubah orang lain. Isian di halaman ini belum tersimpan; salin dulu isian yang penting, lalu muat ulang halaman."
        : `Draf belum tersimpan: ${j.galat || "galat " + r.status}.`);
    } catch (x) { st("Draf belum tersimpan: koneksi ke server gagal."); }
    finally { b.disabled = false; }
    return false;
  }
  async function bekukan() {
    const kurang = daftarKurang(); tampilKurang(kurang);
    if (kurang.length) { st(`Belum bisa dibekukan, ${kurang.length} bagian masih kurang.`); $("#lbkKurangW").focus(); return; }
    const v = S.versiBeku + 1;
    if (!confirm(`Bekukan ${judul} (${kode}) sebagai versi ${v}? Versi beku tidak bisa diubah lagi.`)) return;
    if (S.kotor && !await simpan()) return;
    const b = $("#lbkBekukan"); b.disabled = true; st("Membekukan…");
    try {
      const {r, j} = await kirim("/api/laporan-berkala/bekukan", {periode, kode, diubah: S.diubah});
      if (r.ok) { S.versi = S.versiBeku = Number.isInteger(j.versi) ? j.versi : v; S.kotor = false; aturMode(); await gambarUlang(); return; }
      if (r.status === 422 && Array.isArray(j.kurang)) { tampilKurang(j.kurang.map(String)); st("Server menolak Bekukan karena isian belum lengkap."); return; }
      st(belumAda(r) ? "Bekukan di server belum tersedia, jadi belum ada versi yang dibekukan." : r.status === 403 ? "Bekukan hanya untuk admin." : `Belum dibekukan: ${j.galat || "galat " + r.status}.`);
    } catch (x) { st("Belum dibekukan: koneksi ke server gagal."); }
    finally { b.disabled = false; }
  }
  $("#lbkSimpan").onclick = simpan;
  $("#lbkBekukan").onclick = bekukan;
  $("#lbkVersi").onclick = () => { S.versi = 0; S.kotor = true; aturMode(); st("Draf baru dari versi beku. Isian dan angka disalin; versi beku tetap utuh."); jadwal(); };
  $("#lbkCetak").onclick = () => window.print();
  window.addEventListener("beforeunload", e => { if (S.kotor) e.preventDefault(); });
  $("#lbkBerkas").onchange = async e => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    st("Membaca berkas…");
    try {
      const A = JSON.parse(await f.text());
      if (A?.periode !== periode || A?.kode !== kode || !A.bab1) { st(`Berkas ini bukan berkas angka ${periode} ${kode}. Pilih berkas hasil rakit.py untuk periode yang sama.`); return; }
      S.A = A; gambarIsian(); await gambarUlang();
    } catch (x) { st("Berkas tidak bisa dibaca sebagai JSON. Pilih berkas angka hasil rakit.py."); }
  };
  const [A, baris] = await Promise.all([ambil(`/api/laporan-berkala/angka?periode=${periode}&kode=${kode}`), ambil(`/api/laporan-berkala?periode=${periode}&kode=${kode}`)]);
  if (baris) {
    S.I = baris.isian && typeof baris.isian === "object" && !Array.isArray(baris.isian) ? baris.isian : {};
    S.versi = Number.isInteger(baris.versi) ? baris.versi : 0; S.versiBeku = Number.isInteger(baris.versi_beku) ? baris.versi_beku : S.versi;
    S.diubah = Number.isSafeInteger(baris.diubah) ? baris.diubah : null; if (typeof baris.tarik === "string") S.tarik = baris.tarik;
  }
  if (!A) { st("Berkas angka untuk periode ini belum tersedia di server. Untuk meninjau, buka berkas angka hasil rakit.py lewat tombol Buka berkas angka."); return; }
  S.A = A; gambarIsian(); await gambarUlang();
  window.__lbk = S;   // uji layar membaca keadaan memori
}

window.LaporanBerkala = {susun, mulai};
if (new URLSearchParams(location.search).get("jenis") === "berkala") mulai();
