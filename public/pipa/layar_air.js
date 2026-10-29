/* SIPPA: layar Air tanah pascabencana /pipa/air (PRD §9.4.10, DS §4.16, keputusan 56, SP-095). Kontrak router: pasang(akar, konteks) dan lepas().
   Daftar sumur dari GET /api/sippa/aset?kelas=sumur_bor, CAT dari GET /api/sippa/data/cat (berkas turunan Badan Geologi; belum diterima = keadaan Kosong, tabel sumur tetap tampil).
   Aturan Q10 (sumur di zona kritis atau rusak wajib rekomendasi Badan Geologi) dijaga pelihara.cekAset di form, rute 400, dan CHECK D1. Peta = sebaran titik sumur tanpa peta dasar
   (poligon CAT belum diterima, tidak ada geometri tebakan); tombol Daftar menampilkan semua titik sebagai teks. Logika murni di atas, DOM di bawah. Butuh global: fmt, esc, jamWIB, paginasi, nanti. */
import {peranKlien, tutupDialog} from "./layar_kit.js";
import {ID16, koord, tglId, pilYakin, td, namaProv, NAMA_KELAS_ASET, TEKS_ZONA, ZONA_KONSERVASI, statusMutu, pilMutuHtml, TEKS_STATUS_ASET, pergi, muatGaya, bukaFormKirim, sesuaikanForm,
  formSumurHtml, formMutuHtml, cekFormAset, cekFormMutu} from "./layar_aset.js";
import {memuat, galat} from "./keadaan.js";

export const PER_HAL = 25;
export const PESAN_CAT_BELUM = "Data cekungan air tanah belum diterima dari Badan Geologi.";
/* kawasan penurunan muka tanah pesisir utara Jawa (rehab prinsip 6): provinsi, bukan poligon; peringatan kehati-hatian, bukan batas */
export const PROV_PENURUNAN = ["31", "32", "33", "35"];
export const PESAN_PENURUNAN = "Utamakan air permukaan dan perpipaan: pesisir utara Jawa rawan penurunan muka tanah, sumur dalam bisa memperparahnya.";

/* ---------- logika murni ---------- */
const nilai = (a, k) => a.atribut && typeof a.atribut === "object" && a.atribut[k] != null ? a.atribut[k] : null;
/* satu baris sumur: atribut dipakai bila server menyertakannya di daftar (kalau tidak, strip dan rincian dibuka dari GET /api/sippa/aset/:id) */
export function barisSumur(a) {
  return {id: a.id, kode: a.kode, nama: a.nama, pelaksana: a.pemilik_aset, kejadian: a.kejadian ?? null, kedalaman: nilai(a, "kedalaman_m"), debit: nilai(a, "debit_lps"), cat: nilai(a, "cat_kode"), zona: nilai(a, "zona_konservasi") ?? null,
    rekomendasi: nilai(a, "rekomendasi_bg"), mutu: a.mutu_terakhir ?? null, serah: nilai(a, "serah_terima"), pengelola: nilai(a, "pengelola"), status: a.status, lat: typeof a.lat === "number" ? a.lat : null, lon: typeof a.lon === "number" ? a.lon : null,
    kab: a.kab ?? null, prov: a.prov, dummy: a.dummy === 1 || a.dummy === true, atributAda: a.atribut != null};
}
export const adaCat = cat => !!cat && (cat.n_cat?.nilai != null || (Array.isArray(cat.baris) && cat.baris.length > 0));
export function ringkasAir(rows, cat) {
  const belumUji = rows.filter(r => statusMutu(r.mutu).kelas === "belum").length, gagal = rows.filter(r => statusMutu(r.mutu).kelas === "gagal").length;
  return {n: rows.length, belumUji, tidakLaik: gagal, nCat: cat?.n_cat?.nilai ?? null, adaCat: adaCat(cat), keyakinanCat: cat?.n_cat?.keyakinan ?? cat?.keyakinan ?? "resmi"};
}
export function kalimatAir(r) {
  const sumur = `${fmt(r.n)} sumur darurat tercatat, ${fmt(r.belumUji)} belum diuji mutu`;
  return r.nCat != null ? `${fmt(r.nCat)} CAT ditetapkan; ${sumur}` : `${sumur}; jumlah CAT menunggu Badan Geologi`;
}
export function ringkasZona(rows) {
  const h = Object.fromEntries(ZONA_KONSERVASI.map(([k]) => [k, 0]));
  for (const r of rows) h[Object.hasOwn(h, r.zona) ? r.zona : "belum"]++;
  return h;
}
export const perluHatiPenurunan = prov => PROV_PENURUNAN.includes(String(prov));

/* proyeksi titik ke kotak SVG: bujur dikoreksi cos(lintang tengah) supaya bentuk tidak menggepeng; satu titik atau garis lurus diberi bantalan */
export function proyeksi(titik, W = 640, H = 340, p = 28) {
  if (!titik.length) return [];
  const lat0 = titik.reduce((s, t) => s + t.lat, 0) / titik.length, k = Math.cos(lat0 * Math.PI / 180);
  const xs = titik.map(t => t.lon * k), ys = titik.map(t => -t.lat);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const dx = Math.max(maxx - minx, 0.02), dy = Math.max(maxy - miny, 0.02), s = Math.min((W - 2 * p) / dx, (H - 2 * p) / dy);
  const ox = (W - dx * s) / 2, oy = (H - dy * s) / 2;
  return titik.map((t, i) => ({...t, x: Math.round((ox + (xs[i] - minx) * s) * 10) / 10, y: Math.round((oy + (ys[i] - miny) * s) * 10) / 10}));
}

/* ---------- HTML ---------- */
const POLA = {titik: "bintik", polos: "polos", garis: "garis", silang: "silang", padat: "padat"};
const kelasZona = z => Object.hasOwn(TEKS_ZONA, z) ? z : "belum";
export function kartuAirHtml(r, per) {
  const catPil = r.adaCat ? pilYakin("resmi", "resmi", "Daftar CAT dari Badan Geologi") : pilYakin("menunggu Badan Geologi", "menunggu", "Daftar CAT dan zona konservasi belum diterima");
  const gagal = r.tidakLaik ? `<span class="sp-mutu gagal">${esc(fmt(r.tidakLaik))} sumur tidak laik minum</span>` : "";
  return `<article class="ex"><header class="ex-hd"><span class="ex-ey">Air tanah</span><div class="ex-jd"><h3>${esc(kalimatAir(r))}</h3></div></header><div class="ex-bd"><div class="sp-pil-baris">${catPil}${gagal}</div></div>`
    + `<footer class="ex-ft"><em>Sumber: SIPPA D1 (sippa_aset, sippa_inspeksi)${r.adaCat ? "; CAT Badan Geologi" : ""}, per ${per == null ? "–" : esc(jamWIB(per))}</em></footer></article>`;
}
function simbol(r, x, y, pilih) {
  const m = statusMutu(r.mutu), z = kelasZona(r.zona), judul = `${r.kode} ${r.nama}, zona ${TEKS_ZONA[z].toLowerCase()}, ${m.teks}`;
  const bentuk = m.kelas === "gagal" ? `<path class="sp-sym gagal" d="M${x - 6} ${y - 6}L${x + 6} ${y + 6}M${x + 6} ${y - 6}L${x - 6} ${y + 6}"/>`
    : m.kelas === "belum" ? `<path class="sp-sym belum" d="M${x} ${y - 7}L${x + 7} ${y}L${x} ${y + 7}L${x - 7} ${y}Z"/>` : `<circle class="sp-sym lolos" cx="${x}" cy="${y}" r="6"/>`;
  return `<g class="sp-titik-sumur zona-${z}${pilih ? " pilih" : ""}" tabindex="0" role="button" data-sumur="${esc(r.id)}" aria-label="${esc(judul)}"><title>${esc(judul)}</title><circle class="sp-cincin" cx="${x}" cy="${y}" r="11"/>${bentuk}</g>`;
}
export function petaTitikHtml(rows, pilihId = null) {
  const titik = rows.filter(r => r.lat != null && r.lon != null);
  if (!titik.length) return `<p class="ad-kosong">Belum ada sumur dengan koordinat. Titik muncul setelah sumur dicatat dengan latitude dan longitude.</p>`;
  const p = proyeksi(titik);
  return `<svg class="sp-peta-air" viewBox="0 0 640 340" role="group" aria-label="Sebaran ${esc(fmt(titik.length))} sumur menurut status uji mutu; zona konservasi pada cincin berpola">`
    + `<rect class="sp-peta-latar" width="640" height="340" rx="12"/>${p.map(t => simbol(t, t.x, t.y, t.id === pilihId)).join("")}</svg>${legendaHtml()}`
    + `<p class="ad-catat">Titik tanpa peta dasar karena poligon CAT belum diterima dari Badan Geologi; posisi relatif, bukan batas wilayah.</p>`;
}
export function legendaHtml() {
  const zona = ZONA_KONSERVASI.map(([k, n, pola]) => `<li><span class="sp-pola ${POLA[pola]}" aria-hidden="true"></span>${esc(n)} <span class="sp-sub">pola ${esc(POLA[pola])}</span></li>`).join("");
  return `<div class="sp-legenda"><ul aria-label="Status uji mutu"><li><span class="sp-sym-ket lolos" aria-hidden="true"></span>Lolos uji E. coli</li><li><span class="sp-sym-ket gagal" aria-hidden="true"></span>Tidak laik minum</li><li><span class="sp-sym-ket belum" aria-hidden="true"></span>Belum diuji mutu</li></ul>`
    + `<ul aria-label="Zona konservasi">${zona}</ul></div>`;
}
/* alternatif teks peta: SEMUA titik, tanpa paginasi */
export function daftarTitikHtml(rows) {
  if (!rows.length) return `<p class="ad-kosong">Belum ada sumur tercatat.</p>`;
  return `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Semua titik sumur</caption><thead><tr>${["Kode", "Nama", "Kabupaten", "Zona", "Uji mutu", "Koordinat"].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>`
    + rows.map(r => `<tr>${td("Kode", `<a class="sp-kit-kode" data-aset href="/pipa/aset/${esc(r.id)}">${esc(r.kode)}</a>`)}${td("Nama", esc(r.nama))}${td("Kabupaten", esc(r.kab ?? "–"))}${td("Zona", esc(TEKS_ZONA[kelasZona(r.zona)]))}${td("Uji mutu", pilMutuHtml(r.mutu))}`
      + `${td("Koordinat", r.lat == null ? "–" : `${esc(koord(r.lat))}, ${esc(koord(r.lon))}`, "n")}</tr>`).join("") + `</tbody></table></div>`;
}
const strip = v => v == null ? `<span class="sp-sub">–</span>` : esc(v);
export function tabelSumurHtml(rows, {peran = "B", per = null, hal = 0} = {}) {
  if (!rows.length) return `<p class="ad-kosong">Belum ada sumur tercatat. ${peran === "W" || peran === "M" ? "Catat sumur lewat tombol Catat sumur." : "Perencana yang mencatat sumur."}</p>`;
  const kepala = ["Kode", "Pelaksana", "Kejadian", "Kedalaman", "Debit", "CAT", "Zona", "Rekomendasi Badan Geologi", "Uji mutu", "Serah terima", "Pengelola"];
  const baris = rows.slice(hal * PER_HAL, (hal + 1) * PER_HAL).map(r => `<tr>${td("Kode", `<a class="sp-kit-kode" data-aset href="/pipa/aset/${esc(r.id)}">${esc(r.kode)}</a><span class="sp-sub">${esc(r.nama)}</span>${r.dummy ? `<span class="sp-sub">dummy</span>` : ""}`)}`
    + `${td("Pelaksana", esc(r.pelaksana))}${td("Kejadian", strip(r.kejadian))}${td("Kedalaman", r.kedalaman == null ? "–" : `${esc(fmt(r.kedalaman))} m`, "n")}${td("Debit", r.debit == null ? "–" : `${esc(fmt(r.debit))} L/dtk`, "n")}`
    + `${td("CAT", strip(r.cat))}${td("Zona", esc(TEKS_ZONA[kelasZona(r.zona)]))}${td("Rekomendasi Badan Geologi", strip(r.rekomendasi))}${td("Uji mutu", pilMutuHtml(r.mutu))}${td("Serah terima", strip(r.serah))}${td("Pengelola", strip(r.pengelola))}</tr>`).join("");
  return `<div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-air"><caption class="sr">Sumur darurat dan produksi</caption><thead><tr>${kepala.map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${baris}</tbody></table></div>`
    + (rows.length > PER_HAL ? paginasi(hal, rows.length, PER_HAL, "sumur") : "") + `<p class="ad-catat sp-sumber">Sumber: SIPPA D1 (sippa_aset, sippa_inspeksi), per ${per == null ? "–" : esc(jamWIB(per))}${rows.some(r => !r.atributAda) ? "; atribut sumur dibuka dari rincian" : ""}</p>`;
}
export function rincianSumurHtml(r, peran) {
  if (!r) return `<p class="ad-kosong">Pilih satu titik atau baris untuk melihat rincian sumur.</p>`;
  const lokasi = [r.kab, namaProv(r.prov)].filter(Boolean).join(", "), tulis = peran === "W" || peran === "M";
  return `<h3 class="sp-sub-judul">Rincian sumur ${esc(r.kode)}</h3><p class="ad-catat">${esc(r.nama)}, ${esc(NAMA_KELAS_ASET.sumur_bor.toLowerCase())}, ${esc(TEKS_STATUS_ASET[r.status] ?? r.status)}. ${esc(lokasi)}.</p>`
    + `<dl class="sp-dl"><dt>Kedalaman</dt><dd>${r.kedalaman == null ? "–" : `${esc(fmt(r.kedalaman))} m`}</dd><dt>Debit</dt><dd>${r.debit == null ? "–" : `${esc(fmt(r.debit))} L per detik`}</dd><dt>CAT</dt><dd>${strip(r.cat)}</dd>`
    + `<dt>Zona konservasi</dt><dd>${esc(TEKS_ZONA[kelasZona(r.zona)])}</dd><dt>Rekomendasi Badan Geologi</dt><dd>${strip(r.rekomendasi)}</dd><dt>Uji mutu terakhir</dt><dd>${pilMutuHtml(r.mutu)}${r.mutu?.waktu ? ` <span class="sp-sub">${esc(tglId(r.mutu.waktu))}</span>` : ""}</dd>`
    + `<dt>Serah terima</dt><dd>${strip(r.serah)}</dd></dl><div class="sp-aksi">${tulis ? `<button type="button" class="ad-tombol" data-mutu="${esc(r.id)}">Catat uji mutu</button>` : ""}<a class="ad-tombol" data-aset href="/pipa/aset/${esc(r.id)}">Buka rincian</a></div>`;
}
/* rincian dari GET /api/sippa/aset/:id melengkapi baris daftar yang belum membawa atribut */
export const lengkapi = (baris, aset) => ({...baris, ...barisSumur({...aset, mutu_terakhir: baris.mutu}), mutu: baris.mutu});

/* ---------- DOM dan jaringan ---------- */
let ctrl = null;
export function lepas() { ctrl?.abort(); ctrl = null; tutupDialog(); }

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, peran = peranKlien(document.body?.dataset), tulis = peran === "W" || peran === "M";
  await muatGaya();
  const st = {rows: [], cat: null, per: null, hal: 0, pilih: null, daftar: false};
  akar.innerHTML = `<header class="sp-kepala"><h1 class="sp-judul">Air tanah pascabencana</h1><div class="sp-aksi-kepala">${tulis ? `<button type="button" class="ad-tombol" data-uji>Catat uji mutu</button><button type="button" class="ad-tombol utama" data-sumur-baru>Catat sumur</button>` : ""}</div></header><div id="sp-air-isi"></div>`;
  const isi = akar.querySelector("#sp-air-isi");

  const gambarPeta = () => { const p = isi.querySelector("#sp-air-peta"); if (p) p.innerHTML = st.daftar ? daftarTitikHtml(st.rows) : petaTitikHtml(st.rows, st.pilih); };
  const gambarRincian = () => { const p = isi.querySelector("#sp-air-rincian"); if (p) p.innerHTML = rincianSumurHtml(st.rows.find(r => r.id === st.pilih) ?? null, peran); };
  const gambarTabel = () => { const p = isi.querySelector("#sp-air-tabel"); if (p) p.innerHTML = tabelSumurHtml(st.rows, {peran, per: st.per, hal: st.hal}); };
  const gambar = () => {
    if (sinyal.aborted) return;
    const r = ringkasAir(st.rows, st.cat), z = ringkasZona(st.rows);
    konteks.setPer?.(st.per);
    isi.innerHTML = (perluHatiPenurunan(konteks.prov) ? `<p class="ad-spanduk sp-hati" role="note">${esc(PESAN_PENURUNAN)}</p>` : "")
      + (r.adaCat ? "" : `<p class="ad-kosong sp-cat-kosong">${esc(PESAN_CAT_BELUM)}</p>`);
    /* belum ada sumur: kartu ringkasan + satu kondisi kosong, bukan peta, rincian, dan tabel yang masing-masing kosong (pemilik A18) */
    if (!st.rows.length) { isi.innerHTML += `${kartuAirHtml(r, st.per)}<div><p class="ad-kosong">Belum ada sumur tercatat. Catat sumur lewat tombol Catat sumur.</p></div>`; return; }
    isi.innerHTML += `<div class="sp-kisi sp-air-atas"><section class="sp-panel-pel" aria-labelledby="sp-air-ph"><div class="sp-panel-kepala"><h2 class="sp-sub-judul" id="sp-air-ph">Sebaran sumur</h2><button type="button" class="ad-chip" data-daftar aria-pressed="${st.daftar}">Daftar</button></div><div id="sp-air-peta"></div>`
      + `<p class="ad-catat">Zona konservasi tercatat: ${ZONA_KONSERVASI.map(([k, n]) => `${esc(n)} ${esc(fmt(z[k]))}`).join(", ")}.</p></section>`
      + `<div class="sp-air-samping">${kartuAirHtml(r, st.per)}<section class="sp-panel-pel" id="sp-air-rincian" aria-live="polite"></section></div></div><section class="sp-panel-pel" aria-labelledby="sp-air-th"><h2 class="sp-sub-judul" id="sp-air-th">Sumur tercatat</h2><div id="sp-air-tabel"></div></section>`;
    gambarPeta(); gambarRincian(); gambarTabel();
  };
  let terjadwal = false;
  const jadwalkan = f => { if (terjadwal) return; terjadwal = true; nanti(() => { terjadwal = false; f(); }); };

  let acMuat = null;
  const muat = async (senyap = false) => {
    acMuat?.abort(); const ac = acMuat = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});
    if (!senyap) isi.replaceChildren(memuat());
    try {
      const [a, cat] = await Promise.all([konteks.ambil(`/api/sippa/aset?kelas=sumur_bor&prov=${encodeURIComponent(konteks.prov)}`, ac.signal),
        konteks.ambil("/api/sippa/data/cat", ac.signal).catch(e => { if (e.name === "AbortError") throw e; if (e.status === 404 || e.status === 503) return null; throw e; })]);
      if (ac.signal.aborted) return;
      st.rows = (a.aset || []).map(barisSumur); st.cat = cat; st.per = Date.now(); st.hal = 0; if (!st.rows.some(r => r.id === st.pilih)) st.pilih = null; gambar();
    } catch (e) { if (ac.signal.aborted) return; if (e.status == null) console.error(e); isi.replaceChildren(galat(e.status ?? 0, e.status == null ? "Layar tidak bisa ditampilkan. Coba lagi." : e.status ? e.message : "Tidak bisa terhubung ke server.", () => muat())); }
  };
  /* memilih sumur: titik menyala seketika (kelas di handler), rincian dilengkapi dari server bila atribut belum ada */
  const pilihSumur = id => {
    st.pilih = id; akar.querySelectorAll("[data-sumur]").forEach(g => g.classList.toggle("pilih", g.dataset.sumur === id));
    jadwalkan(gambarRincian);
    const r = st.rows.find(x => x.id === id);
    if (r && !r.atributAda && ID16.test(id)) konteks.ambil(`/api/sippa/aset/${id}`, sinyal).then(d => { const i = st.rows.findIndex(x => x.id === id); if (i >= 0 && !sinyal.aborted) { st.rows[i] = lengkapi(st.rows[i], d.aset); if (st.pilih === id) jadwalkan(gambarRincian); } }).catch(() => {});
  };
  const dialogSumur = () => bukaFormKirim({html: formSumurHtml(), judul: "Catat sumur", url: "/api/sippa/aset", konteks, selesai: "Sumur tersimpan.", sesudah: () => muat(true), sesuaikan: sesuaikanForm, cek: n => cekFormAset("sumur_bor", n, konteks.prov)});
  const dialogMutu = id => { if (!st.rows.length) { konteks.pesan?.("Belum ada sumur untuk diuji. Catat sumur dulu."); return; }
    const d = bukaFormKirim({html: formMutuHtml(st.rows.map(r => ({id: r.id, kode: r.kode, nama: r.nama, kelas: "sumur_bor"}))), judul: "Catat uji mutu", url: "/api/sippa/inspeksi", konteks, selesai: "Uji mutu tersimpan.", sesudah: () => muat(true),
      cek: n => cekFormMutu(st.rows.map(r => ({id: r.id, kode: r.kode, nama: r.nama, kelas: "sumur_bor"})), n)});
    if (id) { const s = d.querySelector("select[name=sasaran_id]"); if (s) s.value = id; } };

  akar.addEventListener("click", e => {
    const t = e.target;
    if (t.closest("[data-daftar]")) { st.daftar = !st.daftar; t.closest("[data-daftar]").setAttribute("aria-pressed", String(st.daftar)); jadwalkan(gambarPeta); return; }
    const a = t.closest("a[data-aset]"); if (a && !e.button && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); pergi(a.pathname); return; }
    const s = t.closest("[data-sumur]"); if (s) { pilihSumur(s.dataset.sumur); return; }
    const p = t.closest(".pgn-b[data-h]"); if (p && !p.disabled) { p.parentElement.querySelectorAll(".pgn-b").forEach(x => x.removeAttribute("aria-current")); p.setAttribute("aria-current", "page"); st.hal = +p.dataset.h; jadwalkan(gambarTabel); return; }
    if (t.closest("[data-sumur-baru]")) { dialogSumur(); return; }
    const u = t.closest("[data-uji]"); if (u) { dialogMutu(null); return; }
    const m = t.closest("[data-mutu]"); if (m) dialogMutu(m.dataset.mutu);
  }, {signal: sinyal});
  akar.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-sumur]")) { e.preventDefault(); pilihSumur(e.target.dataset.sumur); } }, {signal: sinyal});
  await muat();
}
