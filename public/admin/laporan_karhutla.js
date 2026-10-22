/* Laporan Karhutla (/admin/laporan-karhutla): kelengkapan per sumber, tagih WA ke PIC provinsi, form udara/OMC/koordalops untuk staf berperan, verifikasi dengan cek, kunci (dengan "lanjut tanpa X" beralasan),
   ralat, salin teks WA, dan unduh snapshot JSON. Docs: docs/laporan-karhutla/SOP.md. API: /api/laporan-karhutla/*. Spek yang sama dengan Worker: /laporan_karhutla_spek.js (cek merah/kuning langsung).
   Modul ES (type=module) supaya spek bisa diimpor. CSP admin: tanpa skrip/gaya inline, teks data lewat textContent. INP: kontrol berubah seketika, daftar berat digambar sesudah satu frame.
   Tombol dummy (Super Admin, dua ikon) mengisi satu hari penuh dari laporan 21 Okt 2026 lewat POST /api/laporan-karhutla/dummy. */
import * as S from "/laporan_karhutla_spek.js";
import * as SBM from "/laporan_bencana_spek.js";
import {teksWA} from "/laporan_karhutla_wa.js";

/* angka gaya format.js (id-ID, "–" bila kosong) tetapi 2 desimal: luasan laporan bernilai 74,77 ha, fmt() dari format.js membulatkan ke 1 desimal */
const fmt2 = n => (n == null || isNaN(n)) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 2});
/* ?bencana=<bahaya>: kosong = karhutla (tabel lk_*, tak berubah). Bahaya lain memakai spek adaptor (SP) dan rute yang sama dengan ?bencana= (src/laporan_bencana.js, tabel lkb_*).
   Operator provinsi mengisi dari /instansi; halaman ini untuk verifikator dan admin: kelengkapan, isi kiriman, verifikasi, kunci, ralat, snapshot, teks WA, paparan. */
const BNC = new URLSearchParams(location.search).get("bencana") || "karhutla", HZ = BNC !== "karhutla", SP = SBM.spek(BNC), META = S.BENCANA[BNC];
const API = j => HZ && j.startsWith("/api/laporan-karhutla/") ? j + (j.includes("?") ? "&" : "?") + "bencana=" + encodeURIComponent(BNC) : j;
const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul");
const h = (tag, att, ...anak) => { const e = document.createElement(tag);
  for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else if (k === "value") e.value = v; else e.setAttribute(k, v === true ? "" : v); }
  for (const a of anak.flat()) if (a != null) e.append(a); return e; };
const ganti = (n, ...a) => n.replaceChildren(...a.flat().filter(x => x != null && x !== false));   // replaceChildren(null) menulis teks "null"
const kirim = async (url, body) => { try { const r = await fetch(API(url), {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(body || {})}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
  catch (e) { return {ok: false, status: 0, j: {galat: "Jaringan putus; coba lagi."}}; } };
const ambil = async url => { try { const r = await fetch(API(url)); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; } catch (e) { return {ok: false, status: 0, j: {galat: "Jaringan putus."}}; } };
const wibHariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
const klienBaru = () => "k" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
const waktu = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : "";
const STATUS_HARI = {belum_lengkap: "Belum lengkap", lengkap: "Lengkap, menunggu verifikasi", dikunci: "Dikunci", dikunci_pengecualian: "Dikunci dengan pengecualian"};
const STATUS_K = {belum: "Belum ada", draf: "Draf", terkirim: "Terkirim", dikembalikan: "Dikembalikan", disetujui: "Disetujui"};
const tampil = v => v == null || v === "" ? "" : typeof v === "number" ? String(v).replace(".", ",") : String(v);

let RL = null;   // editor ralat: {sumber, isi} (isi sumber yang dikoreksi, memakai form yang sama dengan kiriman)
let T = wibHariIni(), H = null, sel = null, K = null, ed = null, hasil = null, pesanTeks = "", pesanOk = true, lanjut = {}, tabWA = HZ ? "laporan" : "laporan_karhutla", DAFTAR = null, snapshotTampil = null, jadwal = 0;
const pesan = (t, ok = true) => { pesanTeks = t || ""; pesanOk = ok; const p = document.getElementById("lkPesan"); if (p) { p.textContent = pesanTeks; p.className = "lka-pesan " + (ok ? "ok" : "galat"); } };

/* ---------- masuk ---------- */
async function layarMasuk(galat) {
  const u = h("input", {id: "lkUser", name: "username", autocomplete: "username", autocapitalize: "none", spellcheck: "false", required: true}), p = h("input", {id: "lkSandi", name: "sandi", type: "password", autocomplete: "current-password", required: true});
  const f = h("form", {class: "lka-form"}, h("label", {for: "lkUser", teks: "Username staf"}), u, h("label", {for: "lkSandi", teks: "Kata sandi"}), p, h("p", {id: "lkGalat", class: "lka-pesan galat", role: "alert", teks: galat || ""}), h("button", {type: "submit", class: "lka-btn utama", teks: "Masuk"}));
  f.addEventListener("submit", async e => { e.preventDefault(); const r = await kirim("/api/staf/masuk", {username: u.value, sandi: p.value}); if (r.ok) return muat(); document.getElementById("lkGalat").textContent = r.j.galat || `Gagal (${r.status})`; });
  ganti(app, h("div", {class: "lka-masuk"}, h("h2", {teks: "Masuk staf BNPB"}), h("p", {class: "lka-redup", teks: "Admin yang sudah punya akun admin masuk lewat halaman admin."}), f, h("a", {class: "lka-btn", href: "/admin/masuk?ke=%2Fadmin%2Flaporan-karhutla", teks: "Masuk sebagai admin"})));
}

/* ---------- muat ---------- */
async function muat(senyap) {
  if (!SP) return ganti(app, h("p", {class: "lka-kosong", teks: `Bencana tidak dikenal. Pilih salah satu dari ${S.DAFTAR_BENCANA.join(", ")}.`}));
  const r = await ambil("/api/laporan-karhutla/hari?tanggal=" + T);
  if (r.status === 401 || r.status === 403) return layarMasuk();
  if (r.status === 503) return ganti(app, h("p", {class: "lka-kosong", teks: HZ ? `Laporan harian ${META.nama.toLowerCase()} belum diaktifkan (migrasi D1 0048_laporan_bencana belum diterapkan).` : "Laporan Karhutla belum diaktifkan (migrasi D1 0032_laporan_karhutla belum diterapkan)."}));
  if (!r.ok) return ganti(app, h("p", {class: "lka-kosong", teks: r.j.galat || `Galat ${r.status}. Muat ulang halaman.`}));
  H = r.j; const dh = await ambil("/api/laporan-karhutla/hari"); DAFTAR = dh.ok ? dh.j.hari : null;   // daftar laporan bahaya ini (40 terbaru)
  if (H.status === "dikunci" || H.status === "dikunci_pengecualian") { const s = await ambil("/api/laporan-karhutla/snapshot/" + T); snapshotTampil = s.ok ? s.j : null; } else snapshotTampil = null;
  if (sel && !H.kiriman.some(k => k.sumber === sel)) sel = null;
  gambar(); pasangDummy(); if (sel) await bukaKiriman(sel, true);
}
async function bukaKiriman(sumber, tanpaScroll) {
  sel = sumber; const r = await ambil(`/api/laporan-karhutla/kiriman?tanggal=${T}&sumber=${encodeURIComponent(sumber)}`);
  if (!r.ok) { K = null; return pesan(r.j.galat || `Gagal membuka kiriman (${r.status})`, false); }
  K = r.j; ed = JSON.parse(JSON.stringify(K.isi)); hitung(); gambarDetail(); if (!tanpaScroll) document.getElementById("lkDetail")?.scrollIntoView({behavior: "smooth", block: "start"});
}
const salinEd = () => JSON.parse(JSON.stringify(ed));
function hitung() {
  if (!K) return; const n = SP.normalisasi(K.sumber, salinEd(), T, false);
  hasil = {isi: n.isi, galat: n.galat, cek: n.galat.length ? [] : SP.cek(K.sumber, n.isi, S.kodeDariSumber(K.sumber) ? (K.kemarin ? {...K.kemarin, fs: K.kemarin.fs} : null) : null)};
}

/* ---------- tampilan utama ---------- */
const NS = "http://www.w3.org/2000/svg";
const svg = d => { const s = document.createElementNS(NS, "svg"), p = document.createElementNS(NS, "path"); for (const [k, v] of [["viewBox", "0 0 24 24"], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", "2"], ["stroke-linecap", "round"], ["stroke-linejoin", "round"], ["aria-hidden", "true"]]) s.setAttribute(k, v); p.setAttribute("d", d); s.append(p); return s; };
const IK = {berkas: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6", unduh: "M12 3v12m0 0l-4-4m4 4l4-4M5 21h14", mata: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", kunci: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z",
  cek: "M5 12l5 5L20 7", awas: "M12 9v4m0 4h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z", teks: "M4 6h16M4 12h16M4 18h10", api: "M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"};
const judulKartu = (ik, teks, ...lain) => h("div", {class: "lka-judul-kartu"}, svg(IK[ik]), h("h3", {teks}), ...lain);

/* ---------- tampilan utama ---------- */
let deckBuka = false, deckGen = 0, deckMuat = null;
/* satu halaman, tujuh bahaya: tautan biasa (muat ulang halaman), jadi tiap bahaya punya URL sendiri yang bisa dibagikan */
const panelBencana = () => h("nav", {class: "lka-chip-baris", "aria-label": "Bencana"}, S.DAFTAR_BENCANA.map(b => h("a", {class: "lka-chip", href: b === "karhutla" ? "/admin/laporan-karhutla" : `/admin/laporan-karhutla?bencana=${b}`, "aria-current": b === BNC ? "page" : null, "aria-pressed": String(b === BNC), teks: S.BENCANA[b].nama})));
/* laporan bahaya ini yang pernah dibuat: klik membuka tanggalnya */
const panelDaftar = () => DAFTAR?.length ? h("details", {class: "lka-kartu lka-prioritas"}, h("summary", {teks: `Laporan ${META.nama.toLowerCase()} terbaru (${DAFTAR.length})`}),
  h("div", {class: "lka-chip-baris", role: "group", "aria-label": "Daftar laporan"}, DAFTAR.map(d => h("button", {type: "button", class: "lka-chip", "data-a": "buka-hari", "data-tgl": d.tanggal_laporan, "aria-pressed": String(d.tanggal_laporan === T),
    teks: `${d.tanggal_laporan}, ${d.status === "terbuka" ? "terbuka" : d.ralat ? "Ralat-" + d.ralat : "dikunci"}${d.dummy ? ", dummy" : ""}`})))) : null;
function gambar() {
  const terkunci = H.status === "dikunci" || H.status === "dikunci_pengecualian", b = H.kiriman;
  const wajibBelum = b.filter(k => k.wajib && k.status !== "disetujui");
  ganti(app,
    panelBencana(),
    h("p", {id: "lkPesan", class: "lka-pesan " + (pesanOk ? "ok" : "galat"), role: "status", teks: pesanTeks}),
    h("div", {class: "lka-kepala"}, h("label", {class: "lka-kol", for: "lkTgl"}, h("span", {teks: "Tanggal laporan"}), h("input", {type: "date", id: "lkTgl", value: T, "aria-label": "Tanggal laporan"})),
      h("div", {class: "lka-kepala-isi"}, h("div", {class: "lka-aksi"}, h("span", {class: "lka-pil hari-" + H.status, teks: STATUS_HARI[H.status]}), H.dummy ? h("span", {class: "lka-pil dummy", teks: "DUMMY"}) : null),
        h("p", {class: "lka-redup", teks: `Data pantauan ${H.tanggal_data}, cut-off 07.00 WIB. Batas daerah 09.00 WIB${H.lewat_batas ? " (sudah lewat)" : ""}.`})),
      h("button", {type: "button", class: "lka-btn", "data-a": "muat-ulang", teks: "Segarkan"})),
    ringkasAtas(terkunci, b),
    panelDaftar(),
    h("section", {class: "lka-bag", "aria-label": "Kelengkapan"}, judulKartu("berkas", "Kelengkapan per sumber"), h("div", {class: "lka-sumber-grid"}, ...b.map(kartuSumber)),
      !terkunci && H.wajib.length ? h("p", {class: "lka-redup", teks: wajibBelum.length ? `${wajibBelum.length} sumber wajib belum disetujui.` : "Semua sumber wajib sudah disetujui."}) : null),
    terkunci ? panelSnapshot() : (H.boleh.verifikasi ? panelKunci(wajibBelum) : null),
    panelPaparan(terkunci),
    H.boleh.verifikasi && !terkunci ? panelPrioritas() : null,
    h("section", {id: "lkDetail", class: "lka-kartu", hidden: !sel}));
  if (sel && K) gambarDetail();
  if (RL) gambarRalat();   // panel ralat ikut digambar ulang bersama snapshot (isi koreksi yang sedang diketik tidak hilang)
  if (deckBuka) requestAnimationFrame(() => setTimeout(renderDeck, 0));
}
/* deret angka ringkas gaya /bnpb: sebelum kunci progres verifikasi, sesudah kunci angka snapshot */
function ringkasAtas(terkunci, b) {
  const kartu = (angka, label, o = {}) => h("div", {class: "lka-kpi" + (o.kelas ? " " + o.kelas : "")}, h("b", {teks: angka}), h("span", {teks: label}), o.isi ?? null);
  const wajib = b.filter(k => k.wajib), ok = wajib.filter(k => k.status === "disetujui").length;
  if (terkunci && snapshotTampil && HZ) { const m = snapshotTampil.snapshot.nasional;
    return m ? h("div", {class: "lka-ringkas-atas", "aria-label": "Angka snapshot"}, m.slice(0, 5).map(x => kartu(fmt2(x.nilai), `${x.satuan} ${x.label.toLowerCase()}`, {kelas: x.utama ? "awas" : ""}))) : h("p", {class: "lka-redup", teks: "Pantauan otomatis tidak mencakup tanggal data; snapshot memuat laporan provinsi saja."}); }
  if (terkunci && snapshotTampil) { const n = snapshotTampil.snapshot.nasional, f = n.fs_ha, v = x => x == null ? "NA" : fmt2(x);
    return h("div", {class: "lka-ringkas-atas", "aria-label": "Angka snapshot"}, kartu(v(f.fs), "titik api (FS)"), kartu(v(f.target_ha), "ha target"), kartu(v(f.padam_ha), "ha padam"), kartu(v(f.sisa_ha), "ha belum padam", {kelas: "awas"}), kartu(v(n.hotspot?.total), "hotspot (GIS)"), kartu(v(n.personel.total), "personel")); }
  const bar = h("div", {class: "lka-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(wajib.length), "aria-valuenow": String(ok), "aria-label": "Sumber wajib disetujui"}, h("i")); bar.firstChild.style.width = (wajib.length ? Math.round(ok / wajib.length * 100) : 0) + "%";
  const merah = b.reduce((a, k) => a + (k.cek?.merah || 0), 0), kuning = b.reduce((a, k) => a + (k.cek?.kuning_belum_dijelaskan || 0), 0);
  return h("div", {class: "lka-ringkas-atas", "aria-label": "Progres verifikasi"}, kartu(`${ok} dari ${wajib.length}`, "sumber wajib disetujui", {kelas: "lebar", isi: bar}), kartu(String(b.filter(k => k.status === "terkirim").length), "menunggu verifikasi"), kartu(String(b.filter(k => k.status === "dikembalikan").length), "dikembalikan"),
    kartu(String(merah), "cek merah", {kelas: merah ? "awas" : ""}), kartu(String(kuning), "kuning belum dijelaskan"));
}
function kartuSumber(k) {
  const cek = k.status === "belum" ? null : [k.cek.merah ? h("span", {class: "lka-pil merah", teks: `${k.cek.merah} merah`}) : null, k.cek.kuning ? h("span", {class: "lka-pil kuning", teks: `${k.cek.kuning} kuning`}) : null, !k.cek.merah && !k.cek.kuning ? h("span", {class: "lka-redup", teks: "cek bersih"}) : null];
  return h("article", {class: "lka-sumber st-" + k.status + (k.sumber === sel ? " dipilih" : ""), "data-sumber": k.sumber},
    h("div", {class: "lka-sumber-kepala"}, h("b", {teks: k.label}), h("span", {class: "lka-pil st-" + k.status, teks: STATUS_K[k.status]})),
    h("p", {class: "lka-redup", teks: [k.wajib ? "wajib" : "tidak wajib", k.versi ? `versi ${k.versi}` : null, k.diubah ? waktu(k.dikirim || k.diubah) : null].filter(Boolean).join(", ")}),
    cek ? h("div", {class: "lka-aksi"}, cek) : null,
    h("div", {class: "lka-aksi"}, h("button", {type: "button", class: "lka-btn kecil", "data-a": "buka", "data-sumber": k.sumber, teks: H.boleh.tulis.includes(k.sumber) ? "Isi" : "Lihat"}),
      ...(H.tagih || []).filter(x => x.sumber === k.sumber).map(x => h("a", {class: "lka-btn kecil wa", href: x.tautan, target: "_blank", rel: "noopener noreferrer", teks: "Tagih WA"}))));
}

/* ---------- paparan PPTX/PDF dari snapshot ---------- */
const muatDeckSkrip = () => deckMuat ||= new Promise((ok, no) => { const s = document.createElement("script"); s.src = "/laporan_karhutla_deck.js"; s.onload = ok; s.onerror = () => { deckMuat = null; no(new Error("Gagal memuat modul paparan")); }; document.head.append(s); });
/* sebelum kunci: snapshot DRAF dari kiriman saat ini lewat agregasi yang sama dengan Worker (tanpa riwayat hari lain), hanya untuk pratinjau berwatermark */
async function snapshotDraf() {
  const kiriman = {};
  await Promise.all(H.kiriman.filter(k => k.status !== "belum").map(async k => { const r = await ambil(`/api/laporan-karhutla/kiriman?tanggal=${T}&sumber=${encodeURIComponent(k.sumber)}`); if (r.ok && r.j.ada) kiriman[k.sumber] = {isi: SP.normalisasi(k.sumber, r.j.isi, T, false).isi, data_terakhir: null}; }));
  const laporan = HZ ? (await ambil(META.url)).j : null;   // berkas laporan.json v1 bahaya ini (pembangun yang sama dengan Worker)
  return SP.agregasi({tanggal_laporan: T, prioritas: H.prioritas, pengecualian: [], kiriman, sebelumnya: [], satelit: null, laporan: laporan && laporan.v === 1 ? laporan : null, ralat: 0});
}
const setDeckStatus = tx => { const e = document.getElementById("lkDeckStatus"); if (e) e.textContent = tx; };
async function renderDeck() {
  const w = document.getElementById("lkDeck"); if (!w || !deckBuka) return; const id = ++deckGen, terkunci = H.status === "dikunci" || H.status === "dikunci_pengecualian";
  setDeckStatus("Menyusun pratinjau…");
  try {
    await muatDeckSkrip(); const s = terkunci && snapshotTampil ? snapshotTampil.snapshot : await snapshotDraf(); if (id !== deckGen) return;
    const d = await window.LaporanKarhutlaDeck.pratinjau(w, s, {draf: !terkunci, hash: snapshotTampil?.hash, gen: () => id === deckGen}); if (id !== deckGen) return;
    setDeckStatus(`${d.slide.length} slide${terkunci ? "" : ", DRAF belum dikunci"}${d.dilewati.length ? `, ${d.dilewati.length} lampiran dilewati karena belum ada data (alasan di daftar lampiran)` : ""}.`);
  } catch (e) { setDeckStatus("Pratinjau gagal: " + (e.message || e)); }
}
function panelPaparan(terkunci) {
  const ok = terkunci && !!snapshotTampil?.utuh;
  const tombol = (jenis, label) => h("button", {type: "button", class: "lka-btn utama", "data-a": "unduh-deck", "data-jenis": jenis, disabled: !ok, title: ok ? null : "Aktif setelah hari dikunci"}, svg(IK.unduh), label);
  return h("section", {class: "lka-kartu lka-paparan", "aria-label": "Paparan"}, judulKartu("berkas", HZ ? `Paparan Laporan Harian ${META.nama}` : "Paparan Penanganan dan Pengendalian Karhutla"),
    h("p", {class: "lka-redup", teks: ok && HZ ? "Dibuat dari snapshot terkunci: ringkasan nasional, tiga hari terakhir, provinsi, laporan provinsi, perlu perhatian, prakiraan, dan metode. Bagian yang belum ada datanya dilewati dan dicatat di slide metode." : ok ? "Dibuat dari snapshot terkunci: slide 1 sampai 3, daftar lampiran, A1 sampai A11, dan B1 sampai B5. Lampiran yang belum ada datanya dilewati dan dicatat di daftar lampiran." : terkunci ? "Snapshot tidak utuh (hash tidak cocok dengan isi), unduhan dimatikan." : "Unduhan aktif setelah hari dikunci. Sebelum itu hanya pratinjau berwatermark DRAF dari kiriman saat ini."}),
    h("div", {class: "lka-aksi"}, tombol("pptx", "Unduh PPTX"), tombol("pdf", "Unduh PDF"),
      h("button", {type: "button", class: "lka-btn", "data-a": "pratinjau-deck", "aria-expanded": String(deckBuka)}, svg(IK.mata), deckBuka ? "Tutup pratinjau" : terkunci ? "Pratinjau slide" : "Pratinjau DRAF")),
    h("p", {id: "lkDeckStatus", class: "lka-redup", role: "status"}), h("div", {id: "lkDeck", class: "lka-deck", hidden: !deckBuka}));
}

/* ---------- detail satu kiriman ---------- */
const FORM = {
  udara: [["armada", "Armada udara per provinsi", [["prov", "Provinsi (kode, mis. 62)", "t"], ["pemilik", "Pemilik", "p", Object.fromEntries(S.PEMILIK_ARMADA.map(x => [x, x]))], ["jenis", "Jenis", "p", {heli: "Helikopter", pesawat: "Pesawat"}], ["registrasi", "Registrasi", "t"],
      ["status", "Status", "p", {siap: "Siap", operasi: "Operasi", tidak_terbang: "Tidak terbang"}], ["alasan", "Alasan tidak terbang", "p", S.ALASAN_TIDAK_TERBANG], ["keterangan", "Keterangan", "t"]]],
    ["sortie", "Sortie water bombing dan patroli", [["jenis", "Jenis", "p", {wb: "Water bombing", patroli: "Patroli"}], ["registrasi", "Registrasi", "t"], ["jam_mulai", "Jam mulai (HH:MM)", "t"], ["provs", "Provinsi (kode, pisah koma)", "l"], ["lintas", "Lintas provinsi", "c"],
      ["bom", "Jumlah bom", "n"], ["liter", "Liter", "n"], ["padam_ha", "Padam (ha)", "n"], ["durasi_menit", "Durasi (menit)", "n"], ["lokasi", "Lokasi", "t"], ["temuan_fs", "Temuan FS", "n"], ["temuan_ha", "Temuan (ha)", "n"]]]],
  omc: [["sortie", "Sortie OMC", [["registrasi", "Pesawat (registrasi)", "t"], ["jam_mulai", "Jam mulai (HH:MM)", "t"], ["bahan", "Bahan", "p", S.BAHAN_OMC], ["kg", "Jumlah (kg)", "n"], ["sasaran", "Sasaran kab/kota, pisah koma", "l"], ["provs", "Provinsi (kode, pisah koma)", "l"], ["lintas", "Lintas provinsi", "c"], ["ketinggian_ft", "Ketinggian (ft)", "n"]]],
    ["hasil", "Hasil pemantauan hujan pasca-OMC (isi bersama BMKG)", [["sasaran", "Sasaran", "t"], ["hujan", "Hujan", "p", {ya: "Ya", tidak: "Tidak", tidak_diketahui: "Belum diketahui"}], ["curah_mm", "Curah hujan (mm)", "n"], ["pm25_sebelum", "PM2,5 sebelum", "n"], ["pm25_sesudah", "PM2,5 sesudah", "n"],
      ["jarak_pandang_sebelum_m", "Jarak pandang sebelum (m)", "n"], ["jarak_pandang_sesudah_m", "Jarak pandang sesudah (m)", "n"]]]],
  koordalops: [["kejadian", "Kejadian karhutla di luar provinsi prioritas", [["prov", "Provinsi", "t"], ["kab", "Kabupaten/kota", "t"], ["jenis", "Jenis", "t"], ["luas_ha", "Luas (ha)", "n"], ["keterangan", "Keterangan", "t"]]]],
};
const nilaiKol = (x, tipe) => tipe === "l" ? (Array.isArray(x) ? x.join(", ") : "") : tampil(x);
/* Form provinsi untuk ralat (kolom inti yang dipakai agregasi; kolom lain dari kiriman tetap dibawa apa adanya). mode "satu" = satu objek, bukan daftar baris. */
const FORM_PROV = [
  ["total", "Total provinsi (bila tidak dihitung dari baris FS)", [["fs", "Jumlah FS", "n"], ["fs_padam", "FS padam", "n"], ["target_ha", "Luas target (ha)", "n"], ["padam_ha", "Luas padam (ha)", "n"]], "satu"],
  ["fs", "Fire spot", [["kab", "Kabupaten/kota", "t"], ["kec", "Kecamatan", "t"], ["target_ha", "Luas target (ha)", "n"], ["padam_darat_ha", "Padam darat (ha)", "n"], ["padam_udara_ha", "Padam udara (ha)", "n"],
    ["status", "Status", "p", {menyala: "Menyala", bara: "Bara", padam: "Padam"}], ["alasan", "Alasan", "t"]]],
  ["personel", "Personel", [["total", "Total personel", "n"]], "satu"],
  ["hotspot", "Hotspot (GIS)", [["total", "Total", "n"], ["tinggi", "Tinggi", "n"], ["sedang", "Sedang", "n"]], "satu"],
];
/* st = {isi, mati, attr, pre, aksi}: isi yang diedit, atribut data penanda kolom, awalan id, awalan aksi tombol baris. SATU komponen untuk kiriman sumber DAN ralat. */
function kolForm(st, daftar, i, [k, label, tipe, opsi]) {
  const jalur = i == null ? `${daftar}.${k}` : `${daftar}.${i}.${k}`, v = (i == null ? st.isi[daftar] : st.isi[daftar]?.[i])?.[k], id = `${st.pre}_${jalur.replace(/\./g, "_")}`, att = {id, [st.attr]: jalur, "data-tipe": tipe, disabled: st.mati};
  const inp = tipe === "p" ? h("select", att, h("option", {value: "", teks: "pilih"}), ...Object.entries(opsi).map(([a, l]) => h("option", {value: a, teks: l, selected: v === a})))
    : h("input", {...att, type: tipe === "c" ? "checkbox" : null, inputmode: tipe === "n" ? "decimal" : null, checked: tipe === "c" ? !!v : null, value: tipe === "c" ? null : nilaiKol(v, tipe), autocomplete: "off"});
  return h("label", {class: "lka-kol" + (tipe === "c" ? " cek" : ""), for: id}, tipe === "c" ? null : h("span", {teks: label}), inp, tipe === "c" ? h("span", {teks: label}) : null);
}
/* form ralat bahaya lain: dampak jiwa + teks (bentuk isian generik, public/laporan_bencana_spek.js) */
const formBencana = st => [h("div", {class: "lka-blok"}, h("h4", {teks: "Dampak (jiwa)"}), h("div", {class: "lka-grid"}, Object.entries(SBM.DAMPAK).map(([k, l]) => kolForm(st, "dampak", null, [k, l.charAt(0).toUpperCase() + l.slice(1), "n"])))),
  ...[["ringkasan", "Ringkasan situasi"], ["upaya", "Upaya"], ["hambatan", "Hambatan"], ["catatan", "Catatan"]].map(([k, l]) => h("label", {class: "lka-kol"}, h("span", {teks: l}), h("input", {[st.attr]: k, "data-tipe": "t", value: st.isi[k] ?? "", maxlength: "500", disabled: st.mati})))];
function formSkema(sumber, st) {
  if (HZ) return formBencana(st);
  const skema = S.kodeDariSumber(sumber) ? FORM_PROV : FORM[sumber], daftar = (d, judul, kols) => h("div", {class: "lka-blok"}, h("h4", {teks: judul}),
    h("ul", {class: "lka-daftar"}, (st.isi[d] || []).map((_, i) => h("li", {class: "lka-baris-isi"}, h("div", {class: "lka-grid"}, kols.map(kol => kolForm(st, d, i, kol))), !st.mati ? h("button", {type: "button", class: "lka-btn kecil bahaya", "data-a": st.aksi + "hapus-baris", "data-d": d, "data-i": i, teks: "Hapus baris"}) : null))),
    !st.mati ? h("button", {type: "button", class: "lka-btn kecil", "data-a": st.aksi + "tambah-baris", "data-d": d, teks: "Tambah baris"}) : null);
  const kol = skema.map(([d, j, kols, mode]) => mode === "satu" ? h("div", {class: "lka-blok"}, h("h4", {teks: j}), h("div", {class: "lka-grid"}, kols.map(x => kolForm(st, d, null, x)))) : daftar(d, j, kols));
  if (S.kodeDariSumber(sumber)) return kol;
  kol.push(h("label", {class: "lka-kol"}, h("span", {teks: "Alasan bila tidak ada isian (wajib bila daftar kosong)"}), h("input", {[st.attr]: "alasan_kosong", "data-tipe": "t", value: st.isi.alasan_kosong ?? "", maxlength: "200", disabled: st.mati})),
    h("label", {class: "lka-kol"}, h("span", {teks: "Catatan"}), h("input", {[st.attr]: "catatan", "data-tipe": "t", value: st.isi.catatan ?? "", maxlength: "500", disabled: st.mati})));
  if (sumber === "koordalops") kol.push(h("div", {class: "lka-blok"}, h("h4", {teks: "Hotspot nasional (GIS Pusat), rincian keyakinan"}), h("div", {class: "lka-grid"}, [["total", "Total"], ["tinggi", "Tinggi"], ["sedang", "Sedang"]].map(([k, l]) => kolForm(st, "hotspot_nasional", null, [k, l, "n"])))));
  return kol;
}
const stKiriman = () => ({isi: ed, mati: !K.boleh_tulis, attr: "data-j", pre: "lka", aksi: ""});
const stRalat = () => ({isi: RL.isi, mati: false, attr: "data-rj", pre: "lkr", aksi: "r-"});
const formPusat = () => formSkema(K.sumber, stKiriman());
const ringkasProv = isi => {
  const T2 = isi.total, f = x => x == null ? "kosong" : fmt2(x), baris2 = [];
  if (T2) baris2.push(`Total: ${f(T2.fs)} FS (${f(T2.fs_padam)} padam, ${f(T2.fs_sisa)} sisa), target ${f(T2.target_ha)} ha, padam ${f(T2.padam_ha)} ha, sisa ${f(T2.sisa_ha)} ha`);
  for (const b of isi.blok || []) baris2.push(`${b.kawasan}: ${f(b.fs)} FS, target ${f(b.target_ha)} ha, padam ${f(b.padam_ha)} ha, sisa ${f(b.sisa_ha)} ha`);
  if (isi.hotspot?.total != null) baris2.push(`Hotspot (GIS/satelit): ${f(isi.hotspot.total)}`);
  baris2.push(`Personel: ${f(isi.personel?.total)}${isi.personel?.shift ? " (" + isi.personel.shift + ")" : ""}${isi.personel?.keterangan ? ", " + isi.personel.keterangan : ""}`);
  if (isi.kumulatif_ha?.ha != null) baris2.push(`Luasan kumulatif ${f(isi.kumulatif_ha.ha)} ha (tidak dijumlahkan)`);
  if (isi.darurat?.jenis && isi.darurat.jenis !== "tidak") baris2.push(`Kedaruratan: ${S.DARURAT[isi.darurat.jenis]}, TMT ${isi.darurat.tmt ?? "?"}${isi.darurat.sd ? " s.d. " + isi.darurat.sd : ""}`);
  if (isi.hambatan?.pilihan?.length || isi.hambatan?.teks) baris2.push("Hambatan: " + [...isi.hambatan.pilihan.map(k => S.HAMBATAN[k]), isi.hambatan.teks].filter(Boolean).join(", "));
  if (isi.upaya?.pilihan?.length || isi.upaya?.teks) baris2.push("Upaya: " + [...isi.upaya.pilihan.map(k => S.UPAYA[k]), isi.upaya.teks].filter(Boolean).join(", "));
  if (isi.peralatan?.length) baris2.push("Peralatan: " + isi.peralatan.map(a => `${S.labelAlat(a.kategori)}: ${f(a.stok + a.tambahan)}`).join(", "));
  if (isi.kondisi?.length) baris2.push(`Kondisi wilayah: ${isi.kondisi.length} kabupaten/kota`);
  if (isi.catatan) baris2.push("Catatan: " + isi.catatan);
  return h("div", null, h("ul", {class: "lka-ringkas"}, baris2.map(t => h("li", {teks: t}))),
    isi.fs?.length ? h("div", {class: "lka-tabel-wadah"}, h("table", {class: "lka-tabel"}, h("thead", null, h("tr", null, ["FS", "Lokasi", "Target (ha)", "Padam (ha)", "Sisa (ha)", "Status"].map(x => h("th", {teks: x})))),
      h("tbody", null, isi.fs.map(x => h("tr", null, h("td", {teks: x.fs_id}), h("td", {teks: window.Wilayah.teks([x.kec, x.kab, x.kawasan].filter(Boolean).join(", "))}), h("td", {teks: fmt2(x.target_ha)}), h("td", {teks: fmt2((x.padam_darat_ha ?? 0) + (x.padam_udara_ha ?? 0))}), h("td", {teks: fmt2(x.sisa_ha)}), h("td", {teks: x.kumulatif ? "kumulatif" : x.status})))))) : null);
};
/* ringkasan kiriman provinsi untuk bahaya lain: angka otomatis (bersumber) dipisah dari isian provinsi */
function ringkasBencana(isi, oto) {
  const b2 = [];
  if (oto?.metrik?.length) b2.push(`Pantauan otomatis ${oto.tanggal_data}: ${oto.metrik.map(m => `${fmt2(m.nilai)} ${m.satuan} (${m.label})`).join("; ")}. Sumber: ${oto.sumber.join(", ")}`);
  if (isi.ringkasan) b2.push("Situasi: " + isi.ringkasan);
  const dm = Object.entries(SBM.DAMPAK).filter(([k]) => isi.dampak?.[k] != null).map(([k, l]) => `${fmt2(isi.dampak[k])} ${l}`); if (dm.length) b2.push("Dampak: " + dm.join(", "));
  for (const [k, l] of [["upaya", "Upaya"], ["hambatan", "Hambatan"], ["catatan", "Catatan"]]) if (isi[k]) b2.push(`${l}: ${isi[k]}`);
  return h("ul", {class: "lka-ringkas"}, (b2.length ? b2 : ["Belum ada isian dari provinsi."]).map(t => h("li", {teks: t})));
}
function gambarDetail() {
  const w = document.getElementById("lkDetail"); if (!w || !K) return; w.hidden = false;
  const prov = !!S.kodeDariSumber(K.sumber), tulis = K.boleh_tulis;
  ganti(w, h("div", {class: "lka-detail-kepala"}, h("h3", {teks: K.label}), h("span", {class: "lka-pil st-" + K.status, teks: STATUS_K[K.status]}), K.versi ? h("span", {class: "lka-redup", teks: `versi ${K.versi}`}) : null, K.terkunci ? h("span", {class: "lka-pil", teks: "dikunci"}) : null),
    K.catatan ? h("p", {class: "lka-banner kuning", teks: "Catatan: " + K.catatan}) : null,
    !K.ada ? h("p", {class: "lka-redup", teks: "Belum ada kiriman. Isi di bawah adalah draf otomatis dari data yang ada."}) : null,
    prov ? (HZ ? ringkasBencana(hasil?.isi ?? K.isi, K.otomatis) : ringkasProv(hasil?.isi ?? K.isi)) : h("div", {id: "lkForm", class: "lka-form-pusat"}, formPusat()),
    h("div", {id: "lkCek"}, isiCek()),
    h("div", {class: "lka-aksi"}, !prov && tulis ? [h("button", {type: "button", class: "lka-btn", "data-a": "simpan-draf", teks: "Simpan draf"}), h("button", {type: "button", class: "lka-btn utama", "data-a": "kirim-kiriman", teks: K.status === "terkirim" || K.status === "disetujui" ? "Kirim ulang" : "Kirim"})] : null),
    K.boleh_verifikasi && K.status === "terkirim" && !K.terkunci ? h("div", {class: "lka-verif"}, h("h4", {teks: "Verifikasi"}), h("label", {class: "lka-kol"}, h("span", {teks: "Catatan (wajib bila dikembalikan)"}), h("input", {id: "lkCatatan", maxlength: "500", autocomplete: "off"})),
      h("div", {class: "lka-aksi"}, h("button", {type: "button", class: "lka-btn utama", "data-a": "setujui", disabled: hasil?.cek.some(c => c.t === "merah"), teks: "Setujui"}), h("button", {type: "button", class: "lka-btn bahaya", "data-a": "kembalikan", teks: "Kembalikan ke pengirim"}))) : null,
    K.riwayat?.length ? h("details", {class: "lka-riwayat"}, h("summary", {teks: `Riwayat (${K.riwayat.length})`}), h("ol", null, K.riwayat.map(r => h("li", {teks: `${waktu(r.waktu)}, ${r.oleh}: ${r.aksi.replace(/_/g, " ")}, versi ${r.versi}${r.catatan ? ", " + r.catatan : ""}`})))) : null);
}
/* isi kotak cek: galat bentuk (bahasa manusia), "Isi minimal" bila isian wajib masih kosong, lalu cek merah/kuning; "Tidak ada pelanggaran." HANYA bila benar-benar bersih dan lengkap */
function isiCek(h0 = hasil, kurangDari = K && !K.terkunci ? SP.kurangMinimal(K.sumber, salinEd(), T) : []) {
  const g = h0?.galat ?? [], x = h0?.cek ?? [], kurang = g.length ? [] : kurangDari;
  const grup = [["merah", "Wajib dibetulkan"], ["kuning", "Perlu dibaca verifikator"]].map(([t, l]) => { const z = x.filter(q => q.t === t); return z.length ? h("div", {class: "lka-cek-kel " + t}, h("h4", {teks: `${l} (${z.length})`}), h("ul", null, z.map(q => h("li", {class: q.dijelaskan ? "ok" : "", teks: (q.dijelaskan ? "Dijelaskan: " : "") + q.p})))) : null; });
  const semua = [g.length ? h("div", {class: "lka-banner galat"}, h("p", {teks: "Isian belum terbaca:"}), h("ul", null, g.slice(0, 6).map(y => h("li", {teks: SP.galatManusia(y)})))) : null,
    kurang.length ? h("p", {class: "lka-banner kuning", teks: "Isi minimal: " + kurang.slice(0, 4).join("; ") + (kurang.length > 4 ? `; dan ${kurang.length - 4} lagi` : "") + "."}) : null, ...grup].filter(Boolean);
  return semua.length ? semua : [h("p", {class: "lka-banner ok", teks: "Tidak ada pelanggaran."})];
}
/* hanya bagian cek yang digambar ulang sesudah ketikan: kolom isian tidak disentuh, jadi fokus dan kursor tetap */
function gambarCek() {
  if (!K) return; hitung();
  const c = document.getElementById("lkCek"); if (c) ganti(c, ...isiCek());
}
/* ---------- ralat: isi sumber dimuat ke form berbasis spek ---------- */
let jadwalRalat = 0;
function gambarRalat() { const w = document.getElementById("lkRalatForm"); if (!w || !RL) return; const sel2 = document.getElementById("lkRalatSumber"); if (sel2) sel2.value = RL.sumber; ganti(w, ...formSkema(RL.sumber, stRalat())); cekRalat(); }
function cekRalat() {
  const c = document.getElementById("lkRalatCek"); if (!c || !RL) return;
  const n = SP.normalisasi(RL.sumber, JSON.parse(JSON.stringify(RL.isi)), T, false);
  ganti(c, ...isiCek({galat: n.galat, cek: n.galat.length ? [] : SP.cek(RL.sumber, n.isi, null)}, SP.kurangMinimal(RL.sumber, JSON.parse(JSON.stringify(RL.isi)), T)));
}
const cekRalatTunda = () => { cancelAnimationFrame(jadwalRalat); jadwalRalat = requestAnimationFrame(() => setTimeout(cekRalat, 0)); };
async function muatRalat(sumber) {
  const w = document.getElementById("lkRalatForm"); if (w) ganti(w, h("p", {class: "lka-redup", teks: "Memuat isi sumber…"}));
  const r = await ambil(`/api/laporan-karhutla/kiriman?tanggal=${T}&sumber=${encodeURIComponent(sumber)}`);
  if (!r.ok) { RL = null; return w && ganti(w, h("p", {class: "lka-pesan galat", teks: r.j.galat || `Isi sumber gagal dimuat (${r.status})`})); }
  RL = {sumber, isi: JSON.parse(JSON.stringify(r.j.isi))}; gambarRalat();
}
app.addEventListener("toggle", e => { const d = e.target; if (d.classList?.contains("lka-ralat") && d.open && !RL) muatRalat(document.getElementById("lkRalatSumber").value); }, true);
const tunda = () => { cancelAnimationFrame(jadwal); jadwal = requestAnimationFrame(() => setTimeout(gambarCek, 0)); };

/* ---------- kunci, ralat, snapshot ---------- */
function panelKunci(belum) {
  const adaBelum = belum.length > 0;
  return h("section", {class: "lka-kartu", "aria-label": "Kunci laporan"}, judulKartu("kunci", "Kunci laporan"),
    h("p", {class: "lka-redup", teks: "Kunci menghasilkan snapshot beku (dengan hash) yang dipakai slide, teks WA, dan dashboard. Sumber wajib yang belum disetujui menahan kunci, kecuali dinyatakan lanjut tanpa dengan alasan; pernyataan itu tercetak di laporan."}),
    adaBelum ? h("ul", {class: "lka-lanjut"}, belum.map(k => h("li", null, h("label", {class: "lka-kol cek"}, h("input", {type: "checkbox", "data-lanjut": k.sumber, checked: !!lanjut[k.sumber]?.on}), h("span", {teks: `Lanjut tanpa ${k.label} (${STATUS_K[k.status].toLowerCase()})`})),
      lanjut[k.sumber]?.on ? h("input", {class: "lka-alasan", "data-alasan": k.sumber, placeholder: "Alasan (minimal 10 huruf), tercetak di laporan", maxlength: "300", value: lanjut[k.sumber].alasan ?? "", "aria-label": "Alasan lanjut tanpa " + k.label}) : null))) : null,
    h("div", {class: "lka-aksi"}, h("button", {type: "button", class: "lka-btn utama", "data-a": "kunci"}, svg(IK.kunci), adaBelum ? "Kunci dengan pengecualian" : "Kunci laporan")));
}
function panelPrioritas() {
  return h("details", {class: "lka-kartu lka-prioritas"}, h("summary", {teks: `Provinsi prioritas hari ini (${H.prioritas.length})`}),
    h("p", {class: "lka-redup", teks: HZ ? "Sumber wajib = provinsi prioritas (penyumbang terbesar angka utama pada berkas otomatis). Provinsi lain boleh mengirim. Perubahan berlaku sampai hari dikunci." : "Sumber wajib = provinsi prioritas, Operasi udara, dan OMC. Perubahan berlaku sampai hari dikunci."}),
    h("div", {class: "lka-pilihan"}, Object.entries(HZ ? H.nama_prov : S.NAMA_PROV).map(([k, n]) => h("label", {class: "lka-kol cek"}, h("input", {type: "checkbox", "data-prio": k, checked: H.prioritas.includes(k)}), h("span", {teks: n})))),
    h("button", {type: "button", class: "lka-btn", "data-a": "simpan-prioritas", teks: "Simpan prioritas"}));
}
function panelSnapshot() {
  const s = snapshotTampil; if (!s) return h("section", {class: "lka-kartu"}, h("p", {class: "lka-redup", teks: "Snapshot belum bisa dimuat."}));
  const sn = s.snapshot, wa = s.teks_wa;
  const salinBtn = (k, l) => h("button", {type: "button", class: "lka-chip", "data-tabwa": k, "aria-pressed": String(tabWA === k), teks: l});
  return h("section", {class: "lka-kartu", "aria-label": "Snapshot"}, judulKartu("kunci", `Snapshot terkunci, ${sn.ralat ? "Ralat-" + sn.ralat : "kunci pertama"}`, h("span", {class: "lka-pil " + (s.utuh ? "st-disetujui" : "merah"), teks: s.utuh ? "utuh" : "hash tidak cocok"})),
    h("p", {class: "lka-redup", teks: `Dikunci ${waktu(s.dikunci_pada)}. Hash ${s.hash.slice(0, 16)}…${s.utuh ? "" : " TIDAK COCOK dengan isi (jangan dipakai)"}.`}),
    sn.pengecualian.length ? h("div", {class: "lka-banner kuning"}, sn.pengecualian.map(p => h("p", {teks: `${p.label}: data terakhir ${p.data_terakhir ?? "tidak ada"}. Alasan: ${p.alasan}`}))) : null,
    h("ul", {class: "lka-ringkas"}, sn.kesimpulan.map(t => h("li", {teks: t}))),
    h("div", {class: "lka-judul-kartu"}, svg(IK.teks), h("h3", {teks: "Teks WA siap salin"})),
    h("div", {class: "lka-chip-baris", role: "group", "aria-label": "Teks WA"}, ...(HZ ? [salinBtn("laporan", "Laporan harian")] : [salinBtn("laporan_karhutla", "Laporan Karhutla"), salinBtn("gelar_pesawat", "Gelar pesawat dan heli"), salinBtn("rekap_dry_ice", "Rekap dry ice OMC"), salinBtn("hasil_hujan_omc", "Hasil hujan pasca-OMC")])),
    h("textarea", {id: "lkWA", class: "lka-wa", readonly: true, rows: "12", "aria-label": "Teks WA", value: wa[tabWA]}),
    h("div", {class: "lka-aksi"}, h("button", {type: "button", class: "lka-btn utama", "data-a": "salin-wa", teks: "Salin teks WA"}), h("button", {type: "button", class: "lka-btn", "data-a": "unduh", teks: "Unduh snapshot JSON"}),
      h("a", {class: "lka-btn", href: API(`/api/laporan-karhutla/snapshot/${T}`), target: "_blank", rel: "noopener", teks: "Buka JSON"})),
    s.ralat_tersedia.length > 1 ? h("p", {class: "lka-redup", teks: "Versi tersedia: " + s.ralat_tersedia.map(r => r.ralat ? `Ralat-${r.ralat} (${r.berubah} angka berubah)` : "kunci pertama").join(", ")}) : null,
    H.boleh.verifikasi ? h("details", {class: "lka-ralat"}, h("summary", {teks: "Buat ralat (koreksi sesudah kunci)"}), h("p", {class: "lka-redup", teks: "Ralat membuat snapshot baru lengkap dengan daftar angka berubah. Snapshot lama tetap utuh dan bisa dibuka. Pilih sumber, koreksi isiannya di form yang sama dengan kiriman, lalu terbitkan."}),
      h("label", {class: "lka-kol"}, h("span", {teks: "Sumber"}), h("select", {id: "lkRalatSumber"}, ...H.kiriman.map(k => h("option", {value: k.sumber, teks: k.label})))),
      h("div", {id: "lkRalatForm", class: "lka-form-pusat"}, h("p", {class: "lka-redup", teks: "Memuat isi sumber…"})), h("div", {id: "lkRalatCek"}),
      h("label", {class: "lka-kol"}, h("span", {teks: "Alasan ralat (10 huruf atau lebih)"}), h("input", {id: "lkRalatAlasan", maxlength: "500", autocomplete: "off"})),
      h("div", {class: "lka-aksi"}, h("button", {type: "button", class: "lka-btn utama", "data-a": "kirim-ralat", teks: "Terbitkan ralat"}))) : null);
}

/* ---------- aksi ---------- */
const atur = (jalur, nilai, akar = ed) => { const p = jalur.split("."); let o = akar; for (let i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = /^\d+$/.test(p[i + 1]) ? [] : {}; o = o[p[i]]; } o[p[p.length - 1]] = nilai; };
const urai = (v, tipe) => tipe === "l" ? String(v).split(",").map(x => x.trim()).filter(Boolean) : v;
app.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.rj && RL) { atur(t.dataset.rj, t.type === "checkbox" ? t.checked : urai(t.value, t.dataset.tipe), RL.isi); cekRalatTunda(); }
  else if (t.dataset.j && K) { atur(t.dataset.j, t.type === "checkbox" ? t.checked : urai(t.value, t.dataset.tipe)); tunda(); }
  else if (t.dataset.alasan) lanjut[t.dataset.alasan].alasan = t.value;
});
app.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "lkTgl") { T = t.value || wibHariIni(); sel = K = null; RL = null; return muat(); }
  if (t.id === "lkRalatSumber") return muatRalat(t.value);
  if (t.dataset.lanjut) { lanjut[t.dataset.lanjut] = {...lanjut[t.dataset.lanjut], on: t.checked}; return gambar(); }
});
const barisBaru = {udara: {armada: {status: "siap", provs: []}, sortie: {jenis: "wb", provs: []}}, omc: {sortie: {provs: [], sasaran: []}, hasil: {}}, koordalops: {kejadian: {jenis: "karhutla"}}};
app.addEventListener("click", async e => {
  const t = e.target.closest("[data-a],[data-tabwa]"); if (!t || t.disabled) return;
  if (t.dataset.tabwa) { tabWA = t.dataset.tabwa; for (const c of app.querySelectorAll("[data-tabwa]")) c.setAttribute("aria-pressed", String(c.dataset.tabwa === tabWA)); document.getElementById("lkWA").value = snapshotTampil.teks_wa[tabWA]; return; }
  const a = t.dataset.a;
  if (a === "muat-ulang") return muat();
  if (a === "buka-hari") { T = t.dataset.tgl; sel = K = null; RL = null; return muat(); }
  if (a === "pratinjau-deck") {   // chrome kontrol seketika, penyusunan slide ditunda satu frame
    deckBuka = !deckBuka; t.setAttribute("aria-expanded", String(deckBuka)); const w = document.getElementById("lkDeck"); if (w) w.hidden = !deckBuka;
    const terkunci = H.status === "dikunci" || H.status === "dikunci_pengecualian"; t.replaceChildren(svg(IK.mata), deckBuka ? "Tutup pratinjau" : terkunci ? "Pratinjau slide" : "Pratinjau DRAF");
    if (deckBuka) requestAnimationFrame(() => setTimeout(renderDeck, 0)); else { deckGen++; setDeckStatus(""); }
    return;
  }
  if (a === "unduh-deck") {
    const semua = [...app.querySelectorAll('[data-a="unduh-deck"]')], jenis = t.dataset.jenis; semua.forEach(x => { x.disabled = true; }); setDeckStatus("Menyiapkan…");
    requestAnimationFrame(() => setTimeout(async () => {
      try {
        await muatDeckSkrip(); const D = window.LaporanKarhutlaDeck, r = await D.buat(jenis, snapshotTampil.snapshot, {hash: snapshotTampil.hash, status: setDeckStatus});
        D.simpan(r.blob, r.nama); window.__lkDeckTerakhir = {jenis, slide: r.slide, bytes: r.blob.size, nama: r.nama, dilewati: r.dilewati.map(x => x.id)};
        setDeckStatus(`${r.nama}: ${r.slide} slide, ${r.ukuran}${r.dilewati.length ? `. ${r.dilewati.length} lampiran dilewati karena belum ada data` : ""}.`);
      } catch (e) { console.error(e); setDeckStatus("Gagal menyusun berkas: " + (e.message || e)); }
      finally { semua.forEach(x => { x.disabled = false; }); }
    }, 0)); return;
  }
  if (a === "buka") return bukaKiriman(t.dataset.sumber);
  if (a === "tambah-baris") { (ed[t.dataset.d] ||= []).push(JSON.parse(JSON.stringify(barisBaru[K.sumber]?.[t.dataset.d] ?? {}))); hitung(); return gambarDetail(); }
  if (a === "r-tambah-baris") { (RL.isi[t.dataset.d] ||= []).push(JSON.parse(JSON.stringify(S.kodeDariSumber(RL.sumber) ? {status: "menyala", kumulatif: false} : (barisBaru[RL.sumber]?.[t.dataset.d] ?? {})))); return gambarRalat(); }
  if (a === "r-hapus-baris") { RL.isi[t.dataset.d].splice(Number(t.dataset.i), 1); return gambarRalat(); }
  if (a === "hapus-baris") { ed[t.dataset.d].splice(Number(t.dataset.i), 1); hitung(); return gambarDetail(); }
  if (a === "simpan-draf" || a === "kirim-kiriman") {
    const kirimIni = a === "kirim-kiriman"; if (kirimIni) { const n = SP.normalisasi(K.sumber, salinEd(), T, true); if (n.galat.length) { hasil = {isi: n.isi, galat: n.galat, cek: []}; gambarCek(); return; } }
    t.disabled = true; const r = await kirim("/api/laporan-karhutla/" + (kirimIni ? "kirim" : "draf"), {tanggal: T, sumber: K.sumber, isi: salinEd(), versi_dasar: K.versi, klien_id: klienBaru()}); t.disabled = false;
    if (!r.ok) { pesan(r.j.galat || `Gagal (${r.status})`, false); if (r.status === 409) await bukaKiriman(K.sumber, true); return; }
    pesan(kirimIni ? "Terkirim. Menunggu verifikasi." : "Draf tersimpan."); const p0 = pesanTeks; await muat(); pesan(p0, true); return;
  }
  if (a === "setujui" || a === "kembalikan") {
    const catatan = document.getElementById("lkCatatan")?.value ?? ""; if (a === "kembalikan" && catatan.trim().length < 3) return pesan("Isi catatan pengembalian (minimal 3 huruf).", false);
    t.disabled = true; const r = await kirim("/api/laporan-karhutla/verifikasi", {tanggal: T, sumber: K.sumber, aksi: a, versi: K.versi, catatan}); t.disabled = false;
    if (!r.ok) { pesan(r.j.galat || `Gagal (${r.status})`, false); if (r.status === 409 || r.status === 422) await bukaKiriman(K.sumber, true); return; }
    pesan(a === "setujui" ? "Disetujui." : "Dikembalikan ke pengirim."); const p0 = pesanTeks; await muat(); pesan(p0, true); return;
  }
  if (a === "simpan-prioritas") { const daftar = [...app.querySelectorAll("[data-prio]")].filter(c => c.checked).map(c => c.dataset.prio); const r = await kirim("/api/laporan-karhutla/prioritas", {tanggal: T, provinsi: daftar}); if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false); pesan("Prioritas tersimpan."); const p0 = pesanTeks; await muat(); pesan(p0, true); return; }
  if (a === "kunci") {
    const lt = Object.entries(lanjut).filter(([, v]) => v.on).map(([sumber, v]) => ({sumber, alasan: (v.alasan ?? "").trim()}));
    if (lt.some(x => x.alasan.length < 10)) return pesan("Tiap pernyataan lanjut tanpa wajib beralasan, minimal 10 huruf.", false);
    if (!confirm(lt.length ? `Kunci dengan pengecualian (${lt.length} sumber)? Pernyataannya tercetak di laporan.` : "Kunci laporan? Setelah ini koreksi hanya lewat ralat.")) return;
    t.disabled = true; const r = await kirim("/api/laporan-karhutla/kunci", {tanggal: T, lanjut_tanpa: lt}); t.disabled = false;
    if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false); lanjut = {}; pesan("Laporan dikunci. Snapshot dan teks WA siap."); const p0 = pesanTeks; await muat(); pesan(p0, true); return;
  }
  if (a === "salin-wa") { const v = document.getElementById("lkWA").value; try { await navigator.clipboard.writeText(v); pesan("Teks WA disalin. Tempel dan kirim sendiri; tidak ada kiriman otomatis."); } catch (e2) { document.getElementById("lkWA").select(); pesan("Pilih semua teks, lalu salin manual.", false); } return; }
  if (a === "unduh") { const blob = new Blob([JSON.stringify(snapshotTampil.snapshot, null, 2)], {type: "application/json"}), u = URL.createObjectURL(blob), l = h("a", {href: u, download: `laporan-${BNC}-${T}${snapshotTampil.ralat ? "-ralat" + snapshotTampil.ralat : ""}.json`}); document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); return; }
  if (a === "kirim-ralat") {
    const alasan = document.getElementById("lkRalatAlasan").value; if (!RL) return pesan("Isi sumber belum dimuat.", false);
    const r = await kirim("/api/laporan-karhutla/ralat", {tanggal: T, alasan, ganti: {[RL.sumber]: RL.isi}}); if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false);
    RL = null; pesan(`Ralat-${r.j.ralat} terbit, ${r.j.perubahan.length} angka berubah.`); const p0 = pesanTeks; await muat(); pesan(p0, true);
  }
});

/* ---------- dummy: Super Admin saja, dua ikon (DUMMY.md) ---------- */
aksiJudul.addEventListener("click", async e => {
  const d = e.target.closest("[data-dummy]"); if (!d) return;
  if (d.dataset.dummy === "hapus" && !confirm(HZ ? `Hapus SEMUA data dummy laporan ${META.nama.toLowerCase()} (hari contoh 21 Okt 2026 beserta snapshotnya)? Data asli tidak tersentuh.` : "Hapus SEMUA data dummy Laporan Karhutla (hari contoh 21 Okt 2026 beserta snapshotnya)? Data asli tidak tersentuh.")) return;
  const r = await kirim("/api/laporan-karhutla/dummy", {aksi: d.dataset.dummy}); if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false);
  if (d.dataset.dummy === "isi") { T = r.j.tanggal; pesan(HZ ? `Dummy dibuat: laporan ${META.nama.toLowerCase()} ${r.j.tanggal} dengan ${r.j.kiriman} kiriman contoh berlabel DUMMY.` : `Dummy dibuat: laporan ${r.j.tanggal} dengan ${r.j.kiriman} kiriman dari data laporan 21 Okt 2026.`); } else pesan(`Dummy dihapus: ${r.j.hari} hari, ${r.j.kiriman} kiriman, ${r.j.snapshot} snapshot.`);
  const p0 = pesanTeks; sel = K = null; await muat(); pesan(p0, true);
});
function pasangDummy() { Admin.pasangDummy(aksiJudul, !!H?.boleh.super); }
muat();
let skalaJadwal = 0; window.addEventListener("resize", () => { cancelAnimationFrame(skalaJadwal); skalaJadwal = requestAnimationFrame(() => { const w = document.getElementById("lkDeck"); if (w && !w.hidden && window.LaporanKarhutlaDeck) window.LaporanKarhutlaDeck.skalaUlang(w); }); });
