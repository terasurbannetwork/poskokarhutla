/* Tab Sumber (PH-12, potensi-hidromet D17, D20): arti empat chip, tanggal data per sumber, cara status dihitung, daftar sumber beratribusi,
   yang sengaja tidak diambil dari InaRISK, tautan /docs. Tanggal dibaca dari berkas data, bukan ditulis tangan. ctx: lihat app.js. */
import { esc, tgl, BELUM, chip, pakaiGaya, bahan } from "/potensi/analisis.js";

const BAG = ["Arti chip", "Tanggal data", "Cara status dihitung", "Daftar sumber", "Yang sengaja tidak diambil", "Metode lengkap"];
const ARTI = [["sumber", "Sumber publik menyebut angka atau pernyataan ini apa adanya."], ["hitung", "Kami menghitungnya dari fakta lain; rumusnya ada di dokumentasi."], ["hipotesis", "Model Centurisk97 yang belum lolos uji balik. Dibaca sebagai dugaan."], ["belum", "Datanya tidak ada atau sudah basi. Tampil kosong, tidak pernah nol."]];
const SUMBER = [
  ["BMKG", "Peringatan dini cuaca dan prakiraan cuaca per desa; menjadi pembanding status.", "https://www.bmkg.go.id/"],
  ["BNPB InaRISK", "Kelas bahaya desa untuk banjir, banjir bandang, longsor, gelombang, karhutla, dan kekeringan.", "https://inarisk.bnpb.go.id/"],
  ["NOAA CPC", "Indeks ONI dan status ENSO.", "https://www.cpc.ncep.noaa.gov/"],
  ["BoM (Bureau of Meteorology)", "Indeks IOD sebagai cadangan.", "http://www.bom.gov.au/"],
  ["Copernicus GloFAS lewat Open-Meteo", "Prakiraan debit sungai, hujan, dan gelombang.", "https://open-meteo.com/"],
  ["NASA", "Titik panas FIRMS dan citra satelit untuk bahaya karhutla.", "https://firms.modaps.eosdis.nasa.gov/"],
  ["Open Buildings, WorldPop, Dukcapil", "Dasar hitungan paparan penduduk dan bangunan; angka paparan hanya untuk petugas, tidak tampil di halaman ini.", ""],
];
const TIDAK = [
  "Status dari satu titik Open-Meteo per kab/kota. Kami memakai prakiraan wilayah, peringatan BMKG, dan kelas bahaya.",
  "Penduduk tanpa pembulatan dari raster penduduk. Angka dibulatkan dan berlabel perkiraan.",
  "Hitungan dampak di peramban. Hitungan dibuat sekali di server dan semua orang melihat angka yang sama.",
  "Umpan laporan kejadian yang memuat nama pelapor. Laporan warga kami ada di Lapor Bencana, tanpa nama di halaman publik.",
  "Notifikasi WhatsApp ke daftar penerima. Kami memakai Web Push untuk yang berlangganan.",
  "Unggah CSV peluang hujan oleh petugas ke server peta. Data prakiraan masuk lewat jalur otomatis yang diperiksa.",
  "Animasi angin, simulasi banjir, dan WebGIS. Peta tiap bencana dan halaman Banjir sudah ada di Centurisk97.",
];

export function pasang(ctx) {
  pakaiGaya();
  const { panel } = ctx;
  panel.innerHTML = '<h2 class="po-sek">Sumber</h2><p class="bc-info" role="status">Memuat sumber</p>';
  bahan().then(({ an, st, ik, kelas, rg }) => {
    const s = an?.sumber || {};
    const tglBaris = [
      ["Status prakiraan per kab/kota", st?.dibuat, "hipotesis"], ["Prakiraan hujan dan gelombang", s.prediksi, "sumber"], ["Kelas bahaya desa BNPB", kelas?.sumber?.tgl_tarik || s.kelas_desa, "sumber"],
      ["Debit sungai", s.debit, "hipotesis"], ["Hari tanpa hujan", s.hth, "hitung"], ["Indeks ONI", ik?.oni_status ? `${ik.oni_status.musim} ${ik.oni_status.tahun}` : null, "sumber"],
      ["Indeks IOD", ik?.iod?.tgl_data, "sumber"], ["Peringatan BMKG aktif", rg?.dibuat, "sumber"], ["Analisis", an?.dibuat, "hitung"],
    ];
    const tb = tglBaris.map(([n, t, j]) => { const d = tgl(t) || (typeof t === "string" && !/^\d{4}-/.test(t) ? `musim ${t}` : null); return `<tr><th scope="row">${esc(n)}</th><td>${d ? esc(d) : BELUM}</td><td>${chip(d ? j : "belum")}</td></tr>`; }).join("");
    const bag = [
      `<dl class="bc-dl">${ARTI.map(([j, t]) => `<div><dt>${chip(j)}</dt><dd>${esc(t)}</dd></div>`).join("")}</dl><p class="bc-cat">Tiap fakta membawa id sumber dan tanggal datanya.</p>`,
      `<div class="ex-tabel bc-lebar"><table><thead><tr><th>Data</th><th>Tanggal</th><th>Sifat</th></tr></thead><tbody>${tb}</tbody></table></div><p class="bc-cat">Tanggal dibaca dari berkas data saat halaman dibuka. Umpan peringatan BMKG: ${esc(st?.sumber?.umpan_bmkg === "basi" ? "basi" : st?.sumber?.umpan_bmkg ? "masuk" : BELUM)}.</p>`,
      `<p>Status tiap kab/kota dan bahaya memadukan prakiraan Centurisk97 dan peringatan BMKG yang berlaku, dengan kelas bahaya kab/kota. Kelas kab/kota diturunkan dari sebaran kelas desa BNPB. Tabel lengkapnya ada di tab Status, tombol <b>Cara membaca status</b>.</p><p>Status Normal hanya tampil bila semua sumber masuk dan segar; selain itu abu dengan tulisan Belum terukur. ${chip("hipotesis")} Status dari model kami berlabel hipotesis sampai lolos uji balik.</p>`,
      `<ul class="bc-ul">${SUMBER.map(([n, t, u]) => `<li><b>${esc(n)}</b>: ${esc(t)}${u ? ` <a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Situs sumber</a>` : ""}</li>`).join("")}</ul>${kelas?.sumber?.nama ? `<p class="bc-cat">Berkas kelas desa: ${esc(kelas.sumber.nama)}, ditarik ${esc(tgl(kelas.sumber.tgl_tarik) || "tanggal tak tercatat")}.</p>` : ""}`,
      `<p>Beberapa fitur dashboard InaRISK tidak kami salin, dengan alasan:</p><ul class="bc-ul">${TIDAK.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`,
      `<p>Metode, rumus, dan ambang ada di <a href="/docs/">dokumentasi Centurisk97</a>. Halaman ini tidak pernah menyatakan suatu wilayah aman, dan tidak meramalkan kejadian.</p>`,
    ];
    panel.innerHTML = `<h2 class="po-sek">Sumber</h2><div class="bc-dua bc-bab"><nav class="bc-daftarbab" aria-label="Daftar bagian"><ol>${BAG.map((n, i) => `<li><button type="button" data-bab="${i}">${esc(n)}</button></li>`).join("")}</ol></nav><div class="bc-isibab">${bag.map((h, i) => `<section class="bc-bb" id="sm-${i}" tabindex="-1" aria-labelledby="sm-j${i}"><h3 id="sm-j${i}">${esc(BAG[i])}</h3>${h}</section>`).join("")}</div></div>`;
    panel.querySelector(".bc-daftarbab").addEventListener("click", (e) => {
      const b = e.target.closest("[data-bab]"); if (!b) return;
      const t = panel.querySelector("#sm-" + b.dataset.bab); t.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" }); t.focus({ preventScroll: true });
    });
  });
}
