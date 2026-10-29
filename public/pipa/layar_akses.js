/* SIPPA: layar Akses pascabencana /pipa/akses (PRD §9.4.11, DS §4.17, keputusan 56, SP-095). Kontrak router: pasang(akar, konteks) dan lepas().
   Data: GET /api/sippa/data/jembatan_dibi (DIBI BNPB, resmi), /data/program_jembatan (rilis resmi, hanya baris berrujukan), GET /api/sippa/aset (jembatan darurat dan permanen).
   Aturan: "Jembatan Merah Putih" selalu bersama pemiliknya (Presisi, Polri); tidak ada nama program tanpa sumber; angka sekunder (media) tidak tampil (rehab Q16);
   tanggal berupa tanggal rilis sumber, bukan "per" waktu data. Peta bulatan per provinsi menunggu titik tengah provinsi; sementara batang per provinsi dengan angka.
   Logika murni di atas, DOM di bawah. Butuh global: fmt, esc, jamWIB, paginasi, nanti. */
import {peranKlien, tutupDialog} from "./layar_kit.js";
import {tglKalender, waktuTag, pilYakin, td, namaProv, NAMA_KELAS_ASET, TEKS_STATUS_ASET, pergi, muatGaya, bukaFormKirim, sesuaikanForm, formJembatanHtml, cekFormAset} from "./layar_aset.js";
import {memuat, galat} from "./keadaan.js";

export const PER_HAL = 25;
export const PEMILIK_PROGRAM = {tniad: "TNI AD", polri: "Polri", pu: "Kementerian PU", bnpb_dsp: "BNPB (DSP)"};
export const PESAN_TANPA_JADWAL = "tanpa jadwal ganti";
const KATA_PEMILIK = {tniad: /TNI/i, polri: /Polri|Presisi/i, pu: /\bPU\b|Bina Marga/i, bnpb_dsp: /BNPB|DSP/i};

/* ---------- logika murni ---------- */
/* nama program bersama pemiliknya dalam satu kalimat; "Jembatan Merah Putih" tanpa Presisi atau Polri selalu ditambah "Presisi Polri" */
export function labelProgram(program, pemilik) {
  let nama = String(program ?? "").trim();
  if (/Jembatan Merah Putih/i.test(nama) && !/Presisi|Polri/i.test(nama)) nama = `${nama} Presisi Polri`;
  const kata = KATA_PEMILIK[pemilik], teks = PEMILIK_PROGRAM[pemilik];
  return teks && kata && !kata.test(nama) ? `${nama} (${teks})` : nama;
}
/* "id-rujukan: Kementerian Sekretariat Negara, 13 Agustus 2026 (angka.json ...)" -> "Kementerian Sekretariat Negara, 13 Agustus 2026"; tanpa pola = teks apa adanya dipotong */
export function sumberRingkas(rujukan) {
  const t = String(rujukan ?? "").trim(); if (!t) return null;
  const m = /^[^:]*:\s*(.+?)(?:\s*\(.*)?$/.exec(t), isi = (m ? m[1] : t).trim();
  return isi.length > 160 ? isi.slice(0, 157) + "..." : isi;
}
/* baris program: wajib punya rujukan (K4); selain itu disembunyikan dan dihitung; angka media (keyakinan di luar resmi, terverifikasi) tidak tampil */
export function saringProgram(program) {
  const baris = Array.isArray(program?.baris) ? program.baris : [];
  const sah = baris.filter(b => typeof b.rujukan === "string" && b.rujukan.trim() && (b.keyakinan == null || ["resmi", "terverifikasi"].includes(b.keyakinan)));
  return {baris: [...sah].sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)) || String(a.program).localeCompare(String(b.program))), disembunyi: baris.length - sah.length};
}
export function ringkasDibi(dibi) {
  const r = dibi?.ringkas;
  if (!r || typeof r.total_2018_2025 !== "number") return null;
  const tahun = Object.entries(r.per_tahun || {}).map(([t, n]) => ({t: Number(t), n})).sort((a, b) => a.t - b.t), prov = new Map();
  for (const b of dibi.baris || []) if (typeof b.jembatan_rusak === "number") prov.set(b.prov, (prov.get(b.prov) ?? 0) + b.jembatan_rusak);
  const a = dibi.ambang || {}, rentang = a.tahun_awal && a.tahun_akhir ? `${a.tahun_awal} sampai ${a.tahun_akhir}` : "2018 sampai 2025", akhir = a.tahun_akhir ?? tahun.at(-1)?.t;
  return {total: r.total_2018_2025, totalAkhir: r.total_2025, tahunAkhir: akhir, porsiBanjir: r.porsi_banjir_persen ?? null, rentang, tahun, perProv: [...prov].map(([kode, n]) => ({kode, n})).sort((x, y) => y.n - x.n), tarik: dibi.sumber?.[0]?.tarik ?? null};
}
export function kalimatDibi(r) { return `${fmt(r.total)} jembatan rusak ${r.rentang}, ${fmt(r.totalAkhir)} pada ${r.tahunAkhir}`; }
export const jembatanBukan = a => a.kelas === "jembatan_darurat" || a.kelas === "jembatan_permanen";
/* jembatan darurat yang masih berdiri (bukan diganti permanen atau nonaktif) tanpa rencana ganti */
export const tanpaJadwalGanti = a => a.kelas === "jembatan_darurat" && a.rencana_ganti == null && !["diganti_permanen", "nonaktif"].includes(a.status);
export const FILTER_JEMBATAN = [["darurat", "Darurat"], ["permanen", "Permanen dipantau"], ["tanpa", "Tanpa jadwal ganti"]];
export function hitungChip(aset) { return {darurat: aset.filter(a => a.kelas === "jembatan_darurat").length, permanen: aset.filter(a => a.kelas === "jembatan_permanen").length, tanpa: aset.filter(tanpaJadwalGanti).length}; }
export function saringJembatan(aset, aktif) {
  return aset.filter(a => jembatanBukan(a) && ((a.kelas === "jembatan_darurat" && aktif.has("darurat")) || (a.kelas === "jembatan_permanen" && aktif.has("permanen"))) && (!aktif.has("tanpa") || tanpaJadwalGanti(a)));
}

/* ---------- HTML ---------- */
export function kartuDibiHtml(r) {
  return `<article class="ex"><header class="ex-hd"><span class="ex-ey">Akses</span><div class="ex-jd"><h3>${esc(kalimatDibi(r))}</h3></div></header><div class="ex-bd"><div class="sp-pil-baris">${pilYakin("resmi", "resmi", "DIBI BNPB")}`
    + `${r.porsiBanjir != null ? `<span class="sp-sub">${esc(fmt(r.porsiBanjir))}% di antaranya akibat banjir</span>` : ""}</div>${grafikTahunHtml(r.tahun)}</div>`
    + `<footer class="ex-ft"><em>Sumber: DIBI BNPB, olahan Pantau Bencana, tahun ${esc(r.rentang)}${r.tarik ? `, ditarik ${esc(tglKalender(r.tarik))}` : ""}</em></footer></article>`;
}
export function grafikTahunHtml(tahun) {
  if (!tahun.length) return `<p class="ad-kosong">Belum ada angka per tahun.</p>`;
  const W = 520, H = 190, L = 40, R = 10, T = 14, B = 28, maks = Math.max(...tahun.map(x => x.n), 1), lebar = (W - L - R) / tahun.length, bw = Math.min(34, lebar - 8), Y = n => T + (H - T - B) * (1 - n / maks);
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Jembatan rusak per tahun menurut DIBI">`;
  for (const f of [0, .5, 1]) s += `<line class="sp-sumbu" x1="${L}" x2="${W - R}" y1="${Y(maks * f)}" y2="${Y(maks * f)}"/><text class="sp-teks" x="${L - 6}" y="${Y(maks * f) + 4}" text-anchor="end">${fmt(Math.round(maks * f))}</text>`;
  tahun.forEach((x, i) => { const cx = L + i * lebar + lebar / 2; s += `<rect class="sp-batang h0" x="${cx - bw / 2}" y="${Y(x.n)}" width="${bw}" height="${Math.max(1, Y(0) - Y(x.n))}"><title>${esc(x.t)}: ${esc(fmt(x.n))} jembatan rusak</title></rect><text class="sp-teks" x="${cx}" y="${H - 10}" text-anchor="middle">${esc(x.t)}</text>`; });
  return s + "</svg>";
}
/* per provinsi: batang dengan angka di sebelahnya, 10 teratas */
export function provinsiHtml(perProv, rentang, n = 10) {
  const atas = perProv.slice(0, n), maks = Math.max(...atas.map(x => x.n), 1);
  if (!atas.length) return "";
  return `<section class="sp-panel-pel" aria-labelledby="sp-akses-prov"><h2 class="sp-sub-judul" id="sp-akses-prov">Jembatan rusak per provinsi, ${esc(rentang)}</h2><ol class="sp-bar-prov">`
    + atas.map(x => `<li><span class="sp-bar-nama">${esc(namaProv(x.kode))}</span><span class="sp-bar-isi" role="presentation"><i data-lebar="${esc(Math.round(x.n / maks * 100))}"></i></span><b class="num">${esc(fmt(x.n))}</b></li>`).join("")
    + `</ol><p class="ad-catat">${perProv.length > n ? `${esc(fmt(perProv.length - n))} provinsi lain tidak ditampilkan. ` : ""}Rekap provinsi; per kabupaten menunggu tarikan DIBI per kabupaten.</p></section>`;
}
export function tabelProgramHtml(program) {
  const {baris, disembunyi} = saringProgram(program);
  if (!baris.length) return `<p class="ad-kosong">Belum ada program jembatan berrujukan. Program muncul dari berkas turunan program_jembatan.</p>`;
  const kepala = ["Pemilik", "Program", "Titik", "Selesai", "Di wilayah bencana", "Biaya satuan", "Sumber dan tanggal rilis"];
  const isi = baris.map(b => `<tr>${td("Pemilik", esc(PEMILIK_PROGRAM[b.pemilik] ?? b.pemilik))}${td("Program", `<b>${esc(labelProgram(b.program, b.pemilik))}</b>${b.catatan ? `<span class="sp-sub">${esc(b.catatan)}</span>` : ""}`)}`
    + `${td("Titik", b.titik == null ? "–" : esc(fmt(b.titik)), "n")}${td("Selesai", b.selesai == null ? "–" : esc(fmt(b.selesai)), "n")}${td("Di wilayah bencana", b.wilayah_bencana == null ? "–" : esc(fmt(b.wilayah_bencana)), "n")}`
    + `${td("Biaya satuan", b.biaya_satuan_rp == null ? `<span class="sp-sub">–, tidak diumumkan</span>` : esc(`Rp${fmt(b.biaya_satuan_rp)}`), "n")}${td("Sumber dan tanggal rilis", `${esc(sumberRingkas(b.rujukan))}<span class="sp-sub">rilis ${esc(tglKalender(b.tanggal))}</span>`)}</tr>`).join("");
  return `<div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-program"><caption class="sr">Program jembatan menurut pemilik</caption><thead><tr>${kepala.map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${isi}</tbody></table></div>`
    + `<p class="ad-catat">Hanya rilis resmi dengan rujukan; angka media tidak ditampilkan.${disembunyi ? ` ${esc(fmt(disembunyi))} baris tanpa rujukan disembunyikan.` : ""}</p>`;
}
export function chipHtml(hit, aktif) {
  return `<div class="sp-chips" role="group" aria-label="Penyaring jembatan">${FILTER_JEMBATAN.map(([k, n]) => `<button type="button" class="ad-chip" data-saring="${k}" aria-pressed="${aktif.has(k)}">${esc(n)} <span class="num jml">${esc(fmt(hit[k]))}</span></button>`).join("")}</div>`;
}
export function tabelJembatanHtml(aset, {peran = "B", hal = 0} = {}) {
  if (!aset.length) return `<p class="ad-kosong">Tidak ada jembatan yang cocok dengan penyaring. ${peran === "W" || peran === "M" ? "Catat jembatan lewat tombol Catat jembatan." : ""}</p>`;
  const kepala = ["Kode", "Nama", "Program", "Pemilik aset", "Status", "Rencana ganti", "Inspeksi terakhir"];
  const isi = aset.slice(hal * PER_HAL, (hal + 1) * PER_HAL).map(a => `<tr>${td("Kode", `<a class="sp-kit-kode" data-aset href="/pipa/aset/${esc(a.id)}">${esc(a.kode)}</a>`)}${td("Nama", `${esc(a.nama)}<span class="sp-sub">${esc(NAMA_KELAS_ASET[a.kelas] ?? a.kelas)}${a.dummy ? ", dummy" : ""}</span>`)}`
    + `${td("Program", a.atribut?.program ? esc(labelProgram(a.atribut.program, programPemilik(a))) : `<span class="sp-sub">–</span>`)}${td("Pemilik aset", esc(a.pemilik_aset))}${td("Status", `<span class="sp-status ${esc(a.status)}">${esc(TEKS_STATUS_ASET[a.status] ?? a.status)}</span>`)}`
    + `${td("Rencana ganti", a.rencana_ganti != null ? waktuTag(a.rencana_ganti) : tanpaJadwalGanti(a) ? `<span class="sp-laik">${PESAN_TANPA_JADWAL}</span>` : a.kelas === "jembatan_permanen" ? `<span class="sp-sub">tidak berlaku</span>` : "–")}${td("Inspeksi terakhir", a.inspeksi_terakhir ? waktuTag(a.inspeksi_terakhir.waktu) : "–")}</tr>`).join("");
  return `<div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-jembatan"><caption class="sr">Jembatan tercatat</caption><thead><tr>${kepala.map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${isi}</tbody></table></div>`
    + (aset.length > PER_HAL ? paginasi(hal, aset.length, PER_HAL, "jembatan") : "");
}
/* sumber program aset ke kode pemilik program untuk label; sumber tidak dikenal = tanpa kode (label memakai nama saja) */
const SUMBER_KE_PEMILIK = {tniad: "tniad", polri: "polri", pu_bina_marga: "pu", pu_cipta_karya: "pu", pu_sda: "pu", bnpb_dsp: "bnpb_dsp"};
export const programPemilik = a => SUMBER_KE_PEMILIK[a.sumber] ?? null;

/* ---------- DOM dan jaringan ---------- */
let ctrl = null;
export function lepas() { ctrl?.abort(); ctrl = null; tutupDialog(); }

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, peran = peranKlien(document.body?.dataset), tulis = peran === "W" || peran === "M";
  await muatGaya();
  const st = {aset: [], dibi: null, program: null, aktif: new Set(["darurat", "permanen"]), hal: 0, per: null};
  akar.innerHTML = `<header class="sp-kepala"><h1 class="sp-judul">Akses pascabencana</h1><div class="sp-aksi-kepala">${tulis ? `<button type="button" class="ad-tombol utama" data-baru>Catat jembatan</button>` : ""}</div></header><div id="sp-akses-isi"></div>`;
  const isi = akar.querySelector("#sp-akses-isi");

  const gambarTabel = () => {
    const p = isi.querySelector("#sp-akses-tabel"); if (!p || sinyal.aborted) return;
    const hit = hitungChip(st.aset), baris = saringJembatan(st.aset, st.aktif), hal = Math.min(st.hal, Math.max(0, Math.ceil(baris.length / PER_HAL) - 1));
    isi.querySelectorAll("[data-saring] .jml").forEach(s => { s.textContent = fmt(hit[s.parentElement.dataset.saring]); });
    p.innerHTML = tabelJembatanHtml(baris, {peran, hal});
  };
  const gambar = () => {
    if (sinyal.aborted) return;
    const r = ringkasDibi(st.dibi), prog = tabelProgramHtml(st.program);
    konteks.setPer?.(st.per);
    isi.innerHTML = (r ? `<div class="sp-dua">${kartuDibiHtml(r)}${provinsiHtml(r.perProv, r.rentang)}</div>` : `<p class="ad-kosong">Data jembatan rusak DIBI belum diterima.</p>`)
      + `<section class="sp-panel-pel" aria-labelledby="sp-akses-ph"><h2 class="sp-sub-judul" id="sp-akses-ph">Program jembatan menurut pemilik</h2>${prog}</section>`
      + `<section class="sp-panel-pel" aria-labelledby="sp-akses-jh"><h2 class="sp-sub-judul" id="sp-akses-jh">Jembatan tercatat di SIPPA</h2>${chipHtml(hitungChip(st.aset), st.aktif)}<div id="sp-akses-tabel"></div>`
      + `<p class="ad-catat sp-sumber">Sumber: SIPPA D1 (sippa_aset, sippa_inspeksi), per ${st.per == null ? "–" : esc(jamWIB(st.per))}</p></section>`;
    isi.querySelectorAll("[data-lebar]").forEach(i => { i.style.width = `${i.dataset.lebar}%`; });   // CSSOM, bukan atribut style (CSP)
    gambarTabel();
  };
  let terjadwal = false;
  const jadwalkan = () => { if (terjadwal) return; terjadwal = true; nanti(() => { terjadwal = false; gambarTabel(); }); };

  let acMuat = null;
  const muat = async (senyap = false) => {
    acMuat?.abort(); const ac = acMuat = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});
    if (!senyap) isi.replaceChildren(memuat());
    const data = nama => konteks.ambil(`/api/sippa/data/${nama}`, ac.signal).catch(e => { if (e.name === "AbortError") throw e; if (e.status === 404 || e.status === 503) return null; throw e; });
    try {
      const [a, dibi, program] = await Promise.all([konteks.ambil(`/api/sippa/aset?prov=${encodeURIComponent(konteks.prov)}`, ac.signal), data("jembatan_dibi"), data("program_jembatan")]);
      if (ac.signal.aborted) return;
      st.aset = (a.aset || []).filter(jembatanBukan); st.dibi = dibi; st.program = program; st.per = Date.now(); st.hal = 0; gambar();
    } catch (e) { if (ac.signal.aborted) return; if (e.status == null) console.error(e); isi.replaceChildren(galat(e.status ?? 0, e.status == null ? "Layar tidak bisa ditampilkan. Coba lagi." : e.status ? e.message : "Tidak bisa terhubung ke server.", () => muat())); }
  };
  akar.addEventListener("click", e => {
    const t = e.target, c = t.closest("[data-saring]");
    if (c) { const on = c.getAttribute("aria-pressed") !== "true"; c.setAttribute("aria-pressed", String(on)); st.aktif[on ? "add" : "delete"](c.dataset.saring); st.hal = 0; jadwalkan(); return; }
    const a = t.closest("a[data-aset]"); if (a && !e.button && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); pergi(a.pathname); return; }
    const p = t.closest(".pgn-b[data-h]"); if (p && !p.disabled) { p.parentElement.querySelectorAll(".pgn-b").forEach(x => x.removeAttribute("aria-current")); p.setAttribute("aria-current", "page"); st.hal = +p.dataset.h; jadwalkan(); return; }
    if (t.closest("[data-baru]")) bukaFormKirim({html: formJembatanHtml(), judul: "Catat jembatan", url: "/api/sippa/aset", konteks, selesai: "Jembatan tersimpan.", sesudah: () => muat(true), sesuaikan: sesuaikanForm, cek: n => cekFormAset(n.kelas, n, konteks.prov)});
  }, {signal: sinyal});
  await muat();
}
