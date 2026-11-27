/* Tab Analisis (PH-12, potensi-hidromet D13, D21; Q8, Q9). Membaca /api/potensi/analisis apa adanya; tidak menghitung ulang.
   Blok null = "Belum terukur" dengan tanggal sumber, tidak pernah daftar kosong. Modul ini juga jadi bahan bersama tab baca
   (lapisan, ringkasan, sumber): export bahan(), chip(), tgl(), esc(), angka(), pakaiGaya(). ctx: lihat app.js. */

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const angka = (n, d = 0) => (n == null || !Number.isFinite(+n) ? null : (+n).toLocaleString("id-ID", { maximumFractionDigits: d, minimumFractionDigits: d }));
export const ambil = (u) => fetch(u, { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
export const BELUM = "Belum terukur";
const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
/** "2026-11-27" atau ISO penuh -> "27 November 2026"; tak terbaca -> null */
export const tgl = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(s || "")); return m ? `${+m[3]} ${BLN[+m[2] - 1]} ${m[1]}` : null; };
export const NAMA = { BNJ: "Banjir", BDG: "Banjir bandang", LSR: "Longsor", GEL: "Gelombang tinggi", KHT: "Karhutla", KEK: "Kekeringan", CEX: "Cuaca ekstrem" };
export const IKON = { // jalur ikon 24x24, sama dengan tab Status
  BNJ: '<path d="M3 9c2 0 2-2 4.5-2S10 9 12 9s2.5-2 4.5-2S19 9 21 9M3 15c2 0 2-2 4.5-2S10 15 12 15s2.5-2 4.5-2S19 15 21 15"/>',
  BDG: '<path d="M12 3v8m0 0-3-3m3 3 3-3M3 18c2 0 2-2 4.5-2S10 18 12 18s2.5-2 4.5-2S19 18 21 18"/>',
  LSR: '<path d="M3 20 10 6l3 5 2-3 6 12z"/>', GEL: '<path d="M3 14c3-6 8-6 10-2s5 2 8-3M3 19h18"/>',
  KHT: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 0-6 1-9z"/>', KEK: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  CEX: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
};
export const ikon = (k, u = 16) => `<svg viewBox="0 0 24 24" width="${u}" height="${u}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[k] || ""}</svg>`;
export const PROV = { 11: "Aceh", 12: "Sumatera Utara", 13: "Sumatera Barat", 14: "Riau", 15: "Jambi", 16: "Sumatera Selatan", 17: "Bengkulu", 18: "Lampung", 19: "Bangka Belitung", 21: "Kepulauan Riau", 31: "DKI Jakarta", 32: "Jawa Barat", 33: "Jawa Tengah", 34: "DI Yogyakarta", 35: "Jawa Timur", 36: "Banten", 51: "Bali", 52: "Nusa Tenggara Barat", 53: "Nusa Tenggara Timur", 61: "Kalimantan Barat", 62: "Kalimantan Tengah", 63: "Kalimantan Selatan", 64: "Kalimantan Timur", 65: "Kalimantan Utara", 71: "Sulawesi Utara", 72: "Sulawesi Tengah", 73: "Sulawesi Selatan", 74: "Sulawesi Tenggara", 75: "Gorontalo", 76: "Sulawesi Barat", 81: "Maluku", 82: "Maluku Utara", 91: "Papua Barat", 92: "Papua Barat Daya", 93: "Papua Selatan", 94: "Papua Tengah", 95: "Papua Pegunungan", 96: "Papua" };
const URUT6 = ["BNJ", "BDG", "LSR", "GEL", "KHT", "KEK"]; // urutan digit string kelas desa BNPB

/** Gaya tab baca; berkas CSS ini idealnya dipasang <link> di index.html, di sini disuntik bila belum ada. */
export function pakaiGaya() {
  if (document.querySelector('link[href^="/potensi/baca.css"]')) return;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/potensi/baca.css"; document.head.append(l);
}
const muatDP = () => globalThis.DampakPeringatan ? Promise.resolve() : new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = "/inti/dampak_peringatan.js"; s.onload = ok; s.onerror = gagal; setTimeout(gagal, 20000); document.head.append(s); });
/** Chip status fakta D16 (Bersumber, Dihitung, Hipotesis, Belum terukur), label dan kelas dari fungsi murni inti. */
export function chip(jenis, tip) { const c = globalThis.DampakPeringatan?.chipFakta(jenis) || { label: BELUM, kelas: "chip-belum" }; return `<span class="bc-chip ${c.kelas}"${tip ? ` title="${esc(tip)}"` : ""}>${esc(c.label)}</span>`; }

let _bahan = null;
/** Semua berkas yang dibaca tab baca, sekali ambil. Yang gagal = null (tidak pernah dianggap nol). */
export function bahan() {
  return (_bahan ??= (async () => {
    const [, an, st, ik, kelas, rg] = await Promise.all([muatDP().catch(() => {}), ambil("/api/potensi/analisis"), ambil("/api/dampak-peringatan/status"), ambil("/data/iklim.json"), ambil("/data/kelas_desa_bnpb.json"), ambil("/api/dampak-peringatan/ringkas")]);
    if (!an && !st && !ik && !kelas && !rg) _bahan = null;   // semua gagal: tab berikutnya mencoba lagi, bukan memakai hasil kosong selamanya
    return { an, st, ik, kelas, rg };
  })());
}

/* ---------- tampilan ---------- */
/** tip = tanggal data dan catatan, di title kepala kartu (tanpa kaki Sumber, AGENTS.md 3.5) */
const kartu = (ey, judul, isi, tip) => `<section class="ex ex-std bc-kartu"><header class="ex-hd"><span class="ex-ey">${esc(ey)}</span><div class="ex-jd"><h3${tip ? ` title="${esc(tip)}"` : ""}>${esc(judul)}</h3></div></header><div class="ex-bd">${isi}</div></section>`;
const tabel = (kep, br, kls = "") => `<div class="ex-tabel ${kls}"><table><thead><tr>${kep.map((c) => `<th${c[1] ? ` title="${esc(c[1])}"` : ""}>${esc(c[0])}</th>`).join("")}</tr></thead><tbody>${br.join("")}</tbody></table></div>`;
/** chip status fakta di atas isi kartu; tanggal data masuk title kepala kartu */
const atas = (jenis, tip) => `<p class="bc-cat">${chip(jenis, tip)}</p>`;
const per = (d) => (d ? `Data per ${d}` : undefined);
const belumBlok = (judul, ey, tglSumber, sebab) => kartu(ey, judul, `<p class="bc-kosong">${BELUM}. ${esc(sebab)}${tgl(tglSumber) ? ` Data terakhir tercatat ${esc(tgl(tglSumber))}.` : " Tanggal data belum tercatat."}</p><p class="bc-cat">${chip("belum")}</p>`);

/** Batang mendatar bertooltip. baris: [{nama, nilai, teks, tip}] */
function batang(baris, satuan) {
  const mak = Math.max(...baris.map((b) => b.nilai), 1e-9);
  return `<ol class="bc-bar">${baris.map((b) => `<li title="${esc(b.tip)}" tabindex="0"><span class="bc-bn">${esc(b.nama)}</span><span class="bc-bt" aria-hidden="true"><i style="width:${Math.max(2, (b.nilai / mak) * 100).toFixed(1)}%"></i></span><b>${esc(b.teks)}${satuan ? ` <small>${esc(satuan)}</small>` : ""}</b></li>`).join("")}</ol>`;
}

const SEG = [["awas", "Awas", "--dp-3"], ["siaga", "Siaga", "--dp-2"], ["waspada", "Waspada", "--dp-1"], ["normal", "Normal", "--dp-0"], ["belum", BELUM, "--dp-belum"]];
function sebaran(st) {
  const tot = SEG.reduce((a, [k]) => a + (st?.[k] || 0), 0);
  if (!tot) return `<span class="bc-kosong">${BELUM}</span>`;
  const ring = SEG.filter(([k]) => st[k]).map(([k, n]) => `${n} ${SEG.find((s) => s[0] === k)[1].toLowerCase()}`).join(", ");
  return `<span class="bc-stk" role="img" aria-label="Sebaran status: ${esc(ring)}">${SEG.filter(([k]) => st[k]).map(([k, n, v]) => `<i style="flex:${st[k]};background:var(${v})" title="${esc(SEG.find((s) => s[0] === k)[1] + ": " + angka(st[k]) + " kab/kota")}"></i>`).join("")}</span>`;
}
const legenda = `<ul class="bc-leg" aria-label="Warna sebaran status">${SEG.map(([, n, v]) => `<li><i style="background:var(${v})"></i>${esc(n)}</li>`).join("")}</ul>`;

function seksiMatriks(A) {
  const m = A.matriks;
  if (!m || !Object.keys(m).length) return belumBlok("Bahaya kali status", "Matriks", A.sumber?.status, "Matriks belum dibangun dari sumbernya.");
  const br = Object.entries(m).map(([k, v]) => `<tr><th scope="row">${ikon(k)} ${esc(NAMA[k] || k)}</th><td class="bc-n">${angka(v.kab_tinggi) ?? BELUM}</td><td class="bc-n">${angka(v.desa_tinggi) ?? BELUM}</td><td>${sebaran(v.status)}</td></tr>`);
  return kartu("Matriks", "Bahaya kali status", `<p class="bc-cat">${chip("sumber", "BNPB InaRISK, kelas bahaya desa")} <span>Kelas desa dari BNPB</span> ${chip("hipotesis", "Status dari model Centurisk97 yang belum lolos uji balik")} <span>Status prakiraan</span> ${chip("hitung", "Hitungan dari status per kab dan kelas desa BNPB")}</p>` + tabel([["Bahaya"], ["Kab/kota kelas tinggi", "Jumlah kab/kota berkelas bahaya tinggi (aturan kelas kab dari sebaran desa)"], ["Desa kelas tinggi", "Desa berkelas bahaya tinggi pada baseline BNPB"], ["Sebaran status, ringkas 3 hari", "Jumlah kab/kota per status; ringkas 3 hari = tingkat tertinggi empat hari"]], br, "bc-lebar") + legenda, per(tgl(A.sumber?.status)));
}
function seksiHujan(A) {
  if (!A.hujan?.length) return belumBlok("Hujan prakiraan tertinggi", "Hujan", A.sumber?.prediksi, "Prakiraan hujan belum tersedia.");
  return kartu("Hujan", "Hujan prakiraan tertinggi", atas("sumber", "Prakiraan cuaca numerik; bukan peringatan") + batang(A.hujan.map((h) => ({ nama: h.nama, nilai: h.mm, teks: angka(h.mm), tip: `${h.nama}: ${angka(h.mm)} mm pada ${tgl(h.hari) || "hari tak tercatat"}` })), "mm") + `<p class="bc-cat">Hujan harian tertinggi per kab/kota, tiga hari ke depan.</p>`, per(tgl(A.sumber?.prediksi)));
}
function seksiHth(A) {
  if (!A.hth?.length) return belumBlok("Hari tanpa hujan terpanjang", "Kekeringan", A.sumber?.hth, "Daftar hari tanpa hujan tidak ada atau sudah basi.");
  return kartu("Kekeringan", "Hari tanpa hujan terpanjang", atas("hitung", "Hitungan dari data hujan harian") + batang(A.hth.map((h) => ({ nama: h.nama, nilai: h.maks, teks: angka(h.maks), tip: `${h.nama}: ${angka(h.maks)} hari berturut-turut tanpa hujan` })), "hari"), per(tgl(A.sumber?.hth)));
}
function seksiGelombang(A) {
  if (!A.gelombang?.length) return belumBlok("Gelombang tertinggi", "Pesisir", A.sumber?.prediksi, "Prakiraan gelombang belum tersedia.");
  return kartu("Pesisir", "Gelombang tertinggi", atas("sumber", "Prakiraan gelombang; bukan peringatan") + batang(A.gelombang.map((g) => ({ nama: g.nama, nilai: g.m, teks: angka(g.m, 1), tip: `${g.nama}: gelombang ${angka(g.m, 1)} m pada ${tgl(g.hari) || "hari tak tercatat"}` })), "m"), per(tgl(A.sumber?.prediksi)));
}
function seksiDebit(A) {
  const d = A.debit?.daftar;
  if (!d?.length) return belumBlok("Debit sungai tertinggi", "Sungai", A.sumber?.debit, "Prakiraan debit belum tersedia.");
  const tipD = [per(tgl(A.sumber?.debit)), A.debit?.catatan_dasar, A.debit?.dasar && !A.debit?.catatan_dasar ? "Dasar: " + A.debit.dasar : null, "Puncak debit per kab/kota. Tidak berarti banjir; banding dengan debit rata-rata sungai itu."].filter(Boolean).join(". ");
  return kartu("Sungai", "Debit sungai tertinggi", atas("hipotesis", "Model aliran global belum diuji balik di Indonesia") + batang(d.map((x) => ({ nama: x.nama, nilai: x.puncak_m3s, teks: angka(x.puncak_m3s), tip: `${x.nama}: puncak ${angka(x.puncak_m3s)} m³/detik pada ${tgl(x.hari) || "hari tak tercatat"}` })), "m³/detik"), tipD);
}
function seksiDesa(A, nmKab) {
  const dt = A.desa_tinggi;
  if (!dt?.length) return belumBlok("Desa dengan bahaya tinggi terbanyak", "Desa", A.sumber?.kelas_desa, "Kelas bahaya desa belum tersedia.");
  const ikons = (s, p) => URUT6.map((k, i) => (s[i] === "3" ? `<span class="bc-ik" title="${esc(NAMA[k] + ": kelas tinggi" + (p ? " (proyeksi)" : ""))}">${ikon(k, 15)}</span>` : "")).join("") || '<span class="bc-kosong">-</span>';
  const br = dt.map((d) => `<tr><th scope="row">${esc(d.nama)}</th><td>${esc(d.kecamatan)}</td><td>${esc(nmKab(d.kab4))}</td><td>${ikons(String(d.baseline6 || ""))}</td><td class="bc-n">${angka(d.jumlah_kelas3) ?? BELUM}</td><td>${ikons(String(d.proyeksi6 || ""), 1)}</td></tr>`);
  return kartu("Desa", "Desa dengan bahaya tinggi terbanyak", `<p class="bc-cat">${chip("sumber", "BNPB InaRISK, kelas bahaya desa")} ${chip("hipotesis", "Kolom proyeksi: tahun dan skenario tidak tercantum di sumber")} <span>Kolom kelas proyeksi</span></p>` + tabel([["Desa"], ["Kecamatan"], ["Kab/kota"], ["Bahaya kelas tinggi", "Kelas baseline BNPB"], ["Jumlah"], ["Kelas proyeksi", "Proyeksi dari BNPB; tahun dan skenario tidak tercantum di sumber. Hanya pembanding, tidak dipakai untuk status."]], br, "bc-lebar") +
    `<p class="bc-cat">Hanya kelas bahaya dan nama wilayah. Keterpaparan penduduk per desa tidak dibuka untuk publik.</p>`, per(tgl(A.sumber?.kelas_desa)));
}

export function pasang(ctx) {
  pakaiGaya();
  const { panel } = ctx;
  panel.innerHTML = '<h2 class="po-sek">Analisis</h2><p class="bc-info" role="status">Memuat analisis</p>';
  bahan().then(({ an, kelas }) => {
    if (!an) { panel.innerHTML = `<h2 class="po-sek">Analisis</h2>${kartu("Analisis", "Analisis belum tersedia", `<p class="bc-kosong">${BELUM}. Berkas analisis belum bisa dibaca. Coba muat ulang halaman nanti.</p><p class="bc-cat">${chip("belum")}</p>`)}`; return; }
    const nmKab = (k) => kelas?.kab?.[k]?.nama || k;
    const dibuat = tgl(an.dibuat);
    panel.innerHTML = `<h2 class="po-sek">Analisis</h2>${dibuat ? `<p class="bc-cat">Dibangun ${esc(dibuat)}.</p>` : ""}<div class="bc-kolom">${[seksiMatriks(an), seksiHujan(an), seksiHth(an), seksiGelombang(an), seksiDebit(an), seksiDesa(an, nmKab)].join("")}</div>`;
  });
}
