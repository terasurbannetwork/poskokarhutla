/* Pendataan Satu Data BNPB, Fase 1 (/pendataan). Rancangan: docs/bnpb/PENDATAAN.md. Form dirender SELURUHNYA dari KOLOM (pendataan_spek.js).
   Data dari API hanya lewat textContent/createElement. CSP: tanpa skrip/gaya inline. */
import {KOLOM, UNIT, LAINNYA, JENIS, JUDUL_JENIS, BERKAS, periksaIsian, judulIsian, teksKolom} from "/bnpb/pendataan_spek.js";

const app = document.getElementById("app");
const S = {akun: null, isian: [], rekan: [], tab: "data", auth: "masuk"};
const PX = {"x-pb": "1"};

/* ---------- pembantu ---------- */
const IK = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', gedung: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 21v-4h4v4"/>',
  keluar: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>', kunci: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>', tambah: '<path d="M12 5v14M5 12h14"/>',
  ubah: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', sampah: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', berkas: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  centang: '<path d="M5 12l5 5 9-10"/>', jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', kirim: '<path d="M4 12l16-8-6 16-3-7z"/>', simpan: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  tutup: '<path d="M6 6l12 12M18 6L6 18"/>', unduh: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', mata: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  unggah: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
};
const ikon = n => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor");
  s.setAttribute("stroke-width", "2"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true"); s.innerHTML = IK[n] || ""; return s; };   // innerHTML hanya dari konstanta IK
function h(tag, a = {}, ...anak) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a)) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else if (k === "on") for (const [n, f] of Object.entries(v)) e.addEventListener(n, f); else if (v === true) e.setAttribute(k, ""); else e.setAttribute(k, v); }
  for (const x of anak.flat()) if (x != null && x !== false) e.append(x);
  return e;
}
const pil = (kelas, ik, t) => h("span", {class: "bn-pil " + kelas}, ik && ikon(ik), t);
const tombol = (t, ik, kelas, on, a = {}) => h("button", {type: "button", class: "ad-tombol " + (kelas || ""), on: {click: on}, ...a}, ik && ikon(ik), t);
const NF = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 1});
const tgl = ms => ms ? new Date(ms).toLocaleString("id-ID", {day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}) : "";
const ukuran = b => b >= 1048576 ? NF.format(b / 1048576) + " MB" : NF.format(Math.max(1, b / 1024)) + " KB";
const kosong = v => v == null || v === "" || (Array.isArray(v) && !v.length);

async function api(metode, url, body) {
  let r;
  try { r = await fetch(url, {method: metode, headers: metode === "POST" ? {...PX, ...(body !== undefined ? {"content-type": "application/json"} : {})} : {}, body: body !== undefined ? JSON.stringify(body) : undefined}); }
  catch (e) { return {ok: false, status: 0, j: {galat: "Tidak ada sambungan. Coba lagi saat online."}}; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok && !j.galat) j.galat = r.status === 503 ? "Layanan pendataan belum siap. Coba lagi nanti." : `Permintaan gagal (${r.status}).`;
  return {ok: r.ok, status: r.status, j};
}
function pesanEl() { return h("p", {class: "bn-pesan", role: "status", "aria-live": "polite"}); }
const setPesan = (el, t, ok) => { el.textContent = t || ""; el.className = "bn-pesan" + (t ? (ok ? " ok" : " galat") : ""); };

/* ---------- pop-up ---------- */
function dialog(judul, isi, kaki, {kecil, sebelumTutup, kunci} = {}) {
  const d = h("dialog", {class: "pd-dlg" + (kecil ? " pd-kecil" : ""), "aria-label": judul});
  const tutup = async () => { if (sebelumTutup && !(await sebelumTutup())) return; d.close(); d.remove(); };
  d.append(h("div", {class: "pd-dlg-kepala"}, h("h2", {teks: judul}), h("button", {type: "button", "aria-label": "Tutup", on: {click: tutup}}, ikon("tutup"))),
    h("div", {class: "pd-dlg-isi"}, isi), ...(kaki ? [h("div", {class: "pd-dlg-kaki"}, kaki)] : []));
  d.addEventListener("cancel", e => { e.preventDefault(); if (!kunci) tutup(); });
  document.body.append(d); d.showModal();
  return {d, tutup};
}
function tanya(teks, ya = "Ya") {
  return new Promise(selesai => {
    let hasil = false;
    const dl = dialog("Konfirmasi", h("p", {teks}), [tombol("Batal", null, "", () => dl.tutup()), tombol(ya, "centang", "utama", () => { hasil = true; dl.tutup(); })], {kecil: true});
    dl.d.addEventListener("close", () => selesai(hasil));
  });
}

/* ---------- tabel standar: kepala gelap, urut, berhalaman ---------- */
function tabel(rows, kolom, kosongT) {
  const el = h("div"); let urut = -1, arah = 1, hal = 0; const per = 10;
  const gambar = () => {
    const x = rows.slice();
    if (urut >= 0) { const k = kolom[urut]; x.sort((a, b) => { const p = k.v(a), q = k.v(b); return arah * (typeof p === "number" && typeof q === "number" ? p - q : String(p ?? "").localeCompare(String(q ?? ""), "id")); }); }
    const total = Math.max(1, Math.ceil(x.length / per)); hal = Math.min(hal, total - 1);
    const isi = x.slice(hal * per, (hal + 1) * per);
    const th = kolom.map((k, i) => h("th", {"aria-sort": k.aksi ? null : urut === i ? (arah > 0 ? "ascending" : "descending") : "none"},
      k.aksi ? k.l : h("button", {type: "button", class: "pd-urut", on: {click: () => { arah = urut === i ? -arah : 1; urut = i; hal = 0; gambar(); }}}, k.l, urut === i ? (arah > 0 ? " ▲" : " ▼") : "")));
    const tr = isi.length ? isi.map(r => h("tr", {}, kolom.map(k => h("td", {class: k.aksi ? "pd-aksi a" : k.kelas || "", "data-label": k.aksi ? null : k.l}, k.r(r))))) : [h("tr", {}, h("td", {colspan: kolom.length, class: "pd-kosong", teks: kosongT}))];
    el.replaceChildren(h("div", {class: "ad-tabel-wadah"}, h("table", {class: "ad-tabel"}, h("thead", {}, h("tr", {}, th)), h("tbody", {}, tr))),
      ...(total > 1 ? [h("div", {class: "pd-hal"}, tombol("Sebelumnya", null, "kecil", () => { hal--; gambar(); }, {disabled: hal === 0}), h("span", {teks: `Halaman ${NF.format(hal + 1)} dari ${NF.format(total)}`}),
        tombol("Berikutnya", null, "kecil", () => { hal++; gambar(); }, {disabled: hal >= total - 1}))] : []));
  };
  gambar(); return el;
}

/* ---------- form dari KOLOM ---------- */
const BERLAKU = (c, nilai) => {
  if (!c.syarat) return true;
  const v = nilai[c.syarat.k], vs = Array.isArray(v) ? v : kosong(v) ? [] : [v];
  if (!vs.length) return false;
  return c.syarat.sama ? vs.some(x => c.syarat.sama.includes(x)) : vs.some(x => !c.syarat.bukan.includes(x));
};
const EKSTENSI = {"application/pdf": ".pdf", "text/csv": ".csv", "application/vnd.ms-excel": ".xls", "application/msword": ".doc", "image/png": ".png", "image/jpeg": ".jpg,.jpeg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx", "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx"};

/* bentuk: {el, ambil(), segar(), tandai(c), snapshot()}; perubahan dilaporkan lewat onUbah */
function bentukForm(jenis, isian, {onUbah} = {}) {
  const kol = KOLOM[jenis], awal = isian?.isi || {}, peta = new Map();
  const grid = h("div", {class: "pd-form"});
  const ambil = (tampil = false) => {
    const o = {};
    for (const c of kol) {
      const w = peta.get(c.k); if (tampil && w.hidden) continue;
      if (c.tipe === "pilih") { const r = w.querySelector("input:checked"); if (r) o[c.k] = r.value; }
      else if (c.tipe === "banyak") { const a = [...w.querySelectorAll("input[type=checkbox]:checked")].map(i => i.value); if (a.length) o[c.k] = a; }
      else { const i = w.querySelector("input,textarea"); if (i.value.trim() !== "") o[c.k] = i.value; }
      const l = w.querySelector(".pd-lain input"); if (l && !w.querySelector(".pd-lain").hidden && l.value.trim() !== "") o[c.k + "_lain"] = l.value;
    }
    return o;
  };
  const segar = () => {
    const nilai = ambil();
    for (const c of kol) {
      const w = peta.get(c.k); w.hidden = !BERLAKU(c, nilai);
      const lain = w.querySelector(".pd-lain");
      if (lain) { const v = nilai[c.k]; lain.hidden = !(v === LAINNYA || (Array.isArray(v) && v.includes(LAINNYA))); }
    }
  };
  for (const c of kol) {
    const id = `pd-${jenis}-${c.k}`, tanda = c.wajib ? h("span", {class: "pd-wajib", "aria-hidden": "true", teks: "*"}) : null;
    let w;
    if (c.opsi) {
      const banyak = c.tipe === "banyak", nama = id, v = awal[c.k];
      const pilih = x => banyak ? Array.isArray(v) && v.includes(x) : v === x;
      const pilihan = h("div", {class: "bn-pilihan", role: banyak ? "group" : "radiogroup"}, [...c.opsi, LAINNYA].map(x =>
        h("label", {}, h("input", {type: banyak ? "checkbox" : "radio", name: nama, value: x, checked: pilih(x)}), x)));
      w = h("fieldset", {class: "pd-kolom lebar"}, h("legend", {}, c.label, tanda), pilihan,
        h("div", {class: "pd-lain", hidden: true}, h("input", {type: "text", maxlength: 200, "aria-label": c.label + ", isian Lainnya", placeholder: "Tulis isian Lainnya", value: awal[c.k + "_lain"] || ""})));
    } else {
      const v = awal[c.k] ?? "", maks = c.maks ?? (c.tipe === "panjang" ? 2000 : 200);
      const input = c.tipe === "panjang" ? h("textarea", {id, maxlength: maks, placeholder: c.bantu, rows: 3}) : c.tipe === "angka" ? h("input", {id, type: "number", inputmode: "numeric", min: c.min, max: c.maks, placeholder: c.bantu, value: v})
        : h("input", {id, type: c.tipe === "jam" ? "time" : c.tipe === "url" ? "url" : "text", maxlength: c.tipe === "jam" ? null : maks, placeholder: c.tipe === "url" ? "https://" : c.bantu, value: v});
      if (c.tipe === "panjang") input.value = v;
      w = h("div", {class: "pd-kolom" + (c.tipe === "panjang" ? " lebar" : "")}, h("label", {for: id}, c.label, tanda), input);
    }
    w.dataset.k = c.k; peta.set(c.k, w); grid.append(w);
  }
  let berkasEl = null;
  grid.addEventListener("input", () => { segar(); onUbah?.(); });
  grid.addEventListener("change", () => { segar(); onUbah?.(); });
  segar();
  return {el: grid, ambil, segar, snapshot: () => JSON.stringify(ambil(true)), lekatBerkas: e => { berkasEl?.remove(); berkasEl = e; grid.append(e); },
    tandai(c) { for (const w of peta.values()) w.classList.remove("galat"); const w = c && peta.get(c.k); if (w) { w.classList.add("galat"); w.scrollIntoView({block: "center"}); (w.querySelector("input,textarea"))?.focus({preventScroll: true}); } }};
}
const kolomDariGalat = (jenis, g) => KOLOM[jenis].find(c => g.startsWith(c.label));

/* .csv dari Windows ber-Excel sering dilaporkan application/vnd.ms-excel, padahal server mencocokkan magic bytes: ekstensi .csv menang */
const mimeDari = x => /\.csv$/i.test(x.name) ? "text/csv" : x.type;

/* satu penyunting: dialog (data/aplikasi) atau inline (umum). Mengelola simpan, kirim, berkas. */
function penyunting(jenis, isianAwal, {inline, tutup, selesai} = {}) {
  let rec = isianAwal ? {...isianAwal, berkas: [...(isianAwal.berkas || [])]} : null, potret = "";
  const f = bentukForm(jenis, rec, {});
  const pesan = pesanEl();
  const tdraf = tombol("Simpan draf", "simpan", "", () => simpan(false)), tkirim = tombol("Kirim", "kirim", "utama", () => simpan(true));
  const kunci = b => { tdraf.disabled = tkirim.disabled = b; };
  potret = f.snapshot();
  const kotor = () => f.snapshot() !== potret;

  async function simpan(kirim, senyap) {
    f.tandai(null); setPesan(pesan, "");
    const p = periksaIsian(jenis, f.ambil(), kirim);
    if (p.galat) { setPesan(pesan, p.galat); f.tandai(kolomDariGalat(jenis, p.galat)); return false; }
    kunci(true);
    const r = await api("POST", "/api/pendataan/isian", {...(rec ? {id: rec.id} : {}), jenis, isi: p.isi, kirim});
    kunci(false);
    if (!r.ok) { setPesan(pesan, r.j.galat); f.tandai(kolomDariGalat(jenis, r.j.galat || "")); return false; }
    rec = {...r.j.isian, berkas: r.j.isian.berkas || rec?.berkas || []};
    const i = S.isian.findIndex(x => x.id === rec.id); if (i >= 0) S.isian[i] = rec; else S.isian.push(rec);
    potret = f.snapshot();
    if (!senyap) setPesan(pesan, kirim ? "Terkirim." : "Draf tersimpan.", true);
    selesai?.(rec, kirim); if (!inline) segarBerkas();
    if (kirim && !inline) tutup?.();
    return true;
  }

  /* berkas contoh (hanya data dan aplikasi) */
  let daftar = null;
  const segarBerkas = () => {
    if (!daftar) return;
    daftar.replaceChildren(...(rec?.berkas || []).map(b => h("li", {}, ikon("berkas"), h("a", {href: `/api/pendataan/berkas/${b.id}`, download: b.nama, teks: b.nama}), h("span", {teks: ukuran(b.ukuran)}),
      tombol("Hapus", "sampah", "kecil bahaya", async () => {
        if (!(await tanya(`Hapus berkas ${b.nama}?`, "Hapus"))) return;
        const r = await api("POST", `/api/pendataan/berkas-hapus/${b.id}`, undefined);
        if (!r.ok) return setPesan(pesan, r.j.galat);
        rec.berkas = rec.berkas.filter(x => x.id !== b.id); segarBerkas(); selesai?.(rec, false);
      }))));
  };
  async function unggah(files) {
    setPesan(pesan, "");
    const ada = (rec?.berkas || []).length;
    if (ada + files.length > BERKAS.per_isian) return setPesan(pesan, `Maksimal ${BERKAS.per_isian} berkas per isian.`);
    for (const x of files) {
      const mime = mimeDari(x);
      if (!BERKAS.tipe[mime]) return setPesan(pesan, `${x.name}: jenis berkas tidak diterima (${[...new Set(Object.values(BERKAS.tipe))].join(", ")}).`);
      if (x.size > BERKAS.maks) return setPesan(pesan, `${x.name}: maksimal ${ukuran(BERKAS.maks)}.`);
    }
    if (!rec && !(await simpan(false, true))) return;
    kunci(true);
    for (const x of files) {
      const mime = mimeDari(x);
      let r; try { r = await fetch(`/api/pendataan/berkas/${rec.id}`, {method: "POST", headers: {"content-type": mime, "x-nama": encodeURIComponent(x.name), ...PX}, body: x}); } catch (e) { r = null; }
      const j = r ? await r.json().catch(() => ({})) : {galat: "Tidak ada sambungan."};
      if (!r?.ok) { setPesan(pesan, `${x.name}: ${j.galat || "gagal diunggah"}`); break; }
      rec.berkas.push(j.berkas);
    }
    kunci(false); segarBerkas(); selesai?.(rec, false);
  }
  if (jenis !== "umum") {
    daftar = h("ul");
    const input = h("input", {type: "file", multiple: true, accept: Object.keys(BERKAS.tipe).map(m => EKSTENSI[m]).filter(Boolean).join(","), on: {change: e => { const fs = [...e.target.files]; e.target.value = ""; if (fs.length) unggah(fs); }}});
    f.lekatBerkas(h("div", {class: "pd-berkas"}, h("h3", {}, ikon("berkas"), "Berkas contoh"), h("label", {class: "ad-tombol"}, ikon("unggah"), "Pilih berkas", input), daftar));
    segarBerkas();
  }
  const kaki = [pesan, tdraf, tkirim];
  return {f, kaki, pesan, kotor, sebelumTutup: async () => !kotor() || tanya("Ada perubahan yang belum tersimpan. Tutup tanpa menyimpan?", "Tutup"), rec: () => rec};
}

/* ---------- layar: belum masuk ---------- */
function layarAuth() {
  const tab = (k, t) => h("button", {type: "button", "aria-pressed": S.auth === k ? "true" : "false", on: {click: () => { S.auth = k; render(); }}}, t);
  app.replaceChildren(h("div", {class: "pd-auth"}, h("div", {class: "ad-tabs pd-tab"}, tab("masuk", "Masuk"), tab("daftar", "Daftar akun")), S.auth === "masuk" ? formMasuk() : formDaftar()));
}
function isianTeks(label, nama, a = {}) { return h("label", {class: "bn-isian"}, label, h("input", {name: nama, type: "text", ...a})); }
function formMasuk() {
  const pesan = pesanEl(), t = h("button", {type: "submit", class: "bn-tombol"}, "Masuk");
  const f = h("form", {class: "bn-blok", novalidate: true, on: {submit: async e => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(f)); setPesan(pesan, "");
    if (!v.username || !v.sandi) return setPesan(pesan, "Isi nama pengguna dan sandi.");
    t.disabled = true; const r = await api("POST", "/api/pendataan/masuk", {username: v.username.trim().toLowerCase(), sandi: v.sandi}); t.disabled = false;
    if (!r.ok) return setPesan(pesan, r.j.galat);
    await muatSaya();
  }}}, isianTeks("Nama pengguna", "username", {autocomplete: "username", autocapitalize: "none"}), h("label", {class: "bn-isian"}, "Sandi", h("input", {name: "sandi", type: "password", autocomplete: "current-password"})), pesan, t);
  return f;
}
function formDaftar() {
  const pesan = pesanEl(), t = h("button", {type: "submit", class: "bn-tombol"}, "Daftar");
  const unit = h("select", {name: "unit"}, h("option", {value: "", teks: "Pilih unit"}), Object.entries(UNIT).map(([k, v]) => h("option", {value: k, teks: v})));
  const lain = h("label", {class: "bn-isian", hidden: true}, "Nama unit", h("input", {name: "unit_lain", type: "text", maxlength: 200}));
  unit.addEventListener("change", () => { lain.hidden = unit.value !== "lainnya"; });
  const f = h("form", {class: "bn-blok", novalidate: true, autocomplete: "off", on: {submit: async e => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(f)); setPesan(pesan, "");
    for (const k of ["nama", "jabatan", "unit", "email", "wa", "username", "sandi"]) if (!String(v[k] || "").trim()) return setPesan(pesan, "Lengkapi semua kolom bertanda wajib.");
    if (v.unit === "lainnya" && !String(v.unit_lain || "").trim()) return setPesan(pesan, "Tulis nama unitmu.");
    if (!/^[a-z0-9]{5,30}$/.test(v.username.trim())) return setPesan(pesan, "Nama pengguna 5 sampai 30 karakter, hanya huruf kecil dan angka.");
    if (v.sandi.length < 10) return setPesan(pesan, "Sandi minimal 10 karakter.");
    t.disabled = true;
    const ts = window.tokenTurnstile ? await window.tokenTurnstile().catch(() => null) : null;
    const b = {nama: v.nama.trim(), nip: (v.nip || "").trim(), jabatan: v.jabatan.trim(), unit: v.unit, email: v.email.trim(), wa: v.wa.trim(), username: v.username.trim(), sandi: v.sandi, turnstile: ts || undefined};
    if (v.unit === "lainnya") b.unit_lain = v.unit_lain.trim();
    const r = await api("POST", "/api/pendataan/daftar", b); t.disabled = false;
    if (!r.ok) return setPesan(pesan, r.status === 409 ? (r.j.galat || "Nama pengguna atau email sudah dipakai.") : r.j.galat);
    app.replaceChildren(h("div", {class: "pd-auth"}, h("section", {class: "bn-blok", "aria-live": "polite"}, h("h2", {}, pil("pd-menunggu", "jam", "Menunggu persetujuan")),
      h("p", {teks: "Akunmu sudah masuk. Super Admin akan memeriksanya dulu. Setelah disetujui, kamu bisa masuk dan mengisi."}), tombol("Ke halaman masuk", "user", "", () => { S.auth = "masuk"; render(); }))));
  }}},
    h("div", {class: "bn-baris"}, isianTeks("Nama lengkap *", "nama", {maxlength: 100, autocomplete: "off"}), isianTeks("NIP (kalau ada)", "nip", {maxlength: 30, inputmode: "numeric"}), isianTeks("Jabatan *", "jabatan", {maxlength: 120})),
    h("div", {class: "bn-baris"}, h("label", {class: "bn-isian"}, "Unit *", unit), lain),
    h("div", {class: "bn-baris"}, isianTeks("Email *", "email", {maxlength: 120, inputmode: "email", autocapitalize: "none"}), isianTeks("Nomor WhatsApp *", "wa", {maxlength: 20, inputmode: "tel"})),
    h("div", {class: "bn-baris"}, isianTeks("Nama pengguna *", "username", {maxlength: 30, autocapitalize: "none", placeholder: "huruf kecil dan angka, 5 sampai 30"}),
      h("label", {class: "bn-isian"}, "Sandi *", h("input", {name: "sandi", type: "password", autocomplete: "new-password", placeholder: "minimal 10 karakter"}))), pesan, t);
  return f;
}

/* ---------- layar: sudah masuk ---------- */
function dialogGantiSandi(wajib) {
  const pesan = pesanEl();
  const lama = h("input", {type: "password", autocomplete: "current-password", id: "pd-lama"}), baru = h("input", {type: "password", autocomplete: "new-password", id: "pd-baru", placeholder: "minimal 10 karakter"});
  const simpan = tombol("Simpan sandi", "kunci", "utama", async () => {
    setPesan(pesan, ""); if (!lama.value) return setPesan(pesan, "Isi sandi lama."); if (baru.value.length < 10) return setPesan(pesan, "Sandi baru minimal 10 karakter.");
    simpan.disabled = true; const r = await api("POST", "/api/pendataan/gantisandi", {sandi_lama: lama.value, sandi: baru.value}); simpan.disabled = false;
    if (!r.ok) return setPesan(pesan, r.j.galat);
    dl.tutup(); await muatSaya();   // selama wajib_ganti /saya mengirim isian kosong: muat ulang supaya datanya tampil
  });
  const dl = dialog("Ganti sandi", [h("label", {class: "bn-isian", for: "pd-lama"}, "Sandi lama"), lama, h("label", {class: "bn-isian", for: "pd-baru"}, "Sandi baru"), baru],
    [pesan, wajib ? tombol("Keluar", "keluar", "", keluar) : tombol("Batal", null, "", () => dl.tutup()), simpan], {kecil: true, kunci: wajib});
  if (wajib) dl.d.querySelector(".pd-dlg-kepala button").hidden = true;
  return dl;
}
async function keluar() { await api("POST", "/api/pendataan/keluar", undefined); S.akun = null; S.isian = []; S.rekan = []; S.auth = "masuk"; document.querySelectorAll("dialog").forEach(d => d.remove()); render(); }

function lihat(r) {
  const kol = KOLOM[r.jenis] || [], baris = kol.map(c => [c, teksKolom(c, r.isi)]).filter(([, t]) => t);
  dialog(judulIsian(r.jenis, r.isi), [h("dl", {class: "pd-lihat"}, baris.map(([c, t]) => h("div", {}, h("dt", {teks: c.label}), h("dd", {teks: t})))),
    (r.berkas || []).length > 0 && h("ul", {class: "pd-berkas"}, r.berkas.map(b => h("li", {}, ikon("berkas"), h("a", {href: `/api/pendataan/berkas/${b.id}`, download: b.nama, teks: b.nama}), h("span", {teks: ukuran(b.ukuran)}), ikon("unduh"))))]);
}
function formPopup(jenis, rec) {
  let dl;
  /* penyunting memegang salinan rekaman; tiap simpan/unggah/hapus berkas menaruhnya kembali ke S.isian supaya tabel dan buka ulang tidak basi */
  const p = penyunting(jenis, rec, {tutup: () => dl.tutup(), selesai: r => { const i = S.isian.findIndex(x => x.id === r.id); if (i >= 0) S.isian[i] = r; render(true); }});
  dl = dialog(rec ? `Ubah ${JUDUL_JENIS[jenis].toLowerCase()}` : `Tambah ${JUDUL_JENIS[jenis].toLowerCase()}`, p.f.el, p.kaki, {sebelumTutup: p.sebelumTutup});
}

function tabIsi() {
  const jenis = S.tab, mine = S.isian.filter(x => x.jenis === jenis);
  if (jenis === "umum") {
    const p = penyunting("umum", mine[0] || null, {inline: true, selesai: () => hitung()});
    return h("div", {class: "pd-inline"}, p.f.el, h("div", {class: "pd-dlg-kaki"}, p.kaki));
  }
  const saya = tabel(mine, [
    {l: "Judul", v: r => judulIsian(r.jenis, r.isi), r: r => h("button", {type: "button", class: "pd-judul", on: {click: () => formPopup(jenis, r)}, teks: judulIsian(r.jenis, r.isi)})},
    {l: "Status", v: r => r.status, r: r => r.status === "terkirim" ? pil("pd-terkirim", "centang", "Terkirim") : pil("pd-draf", "jam", "Draf")},
    {l: "Diubah", v: r => r.diubah || 0, r: r => tgl(r.diubah), kelas: "w"},
    {l: "Berkas", v: r => (r.berkas || []).length, r: r => NF.format((r.berkas || []).length), kelas: "n"},
    {l: "Aksi", aksi: true, r: r => [tombol("Ubah", "ubah", "kecil", () => formPopup(jenis, r)), tombol("Hapus", "sampah", "kecil bahaya", async () => {
      if (!(await tanya(`Hapus isian "${judulIsian(r.jenis, r.isi)}" beserta berkasnya?`, "Hapus"))) return;
      const x = await api("POST", `/api/pendataan/hapus/${r.id}`, undefined);
      if (!x.ok) return alertGalat(x.j.galat);
      S.isian = S.isian.filter(i => i.id !== r.id); render(true);
    })]},
  ], "Belum ada isian.");
  const rekan = S.rekan.filter(x => x.jenis === jenis);
  const tr = tabel(rekan, [
    {l: "Judul", v: r => judulIsian(r.jenis, r.isi), r: r => h("button", {type: "button", class: "pd-judul", on: {click: () => lihat(r)}, teks: judulIsian(r.jenis, r.isi)})},
    {l: "Pengisi", v: r => r.pengisi || "", r: r => r.pengisi || ""},
    {l: "Dikirim", v: r => r.dikirim || 0, r: r => tgl(r.dikirim), kelas: "w"},
    {l: "Berkas", v: r => (r.berkas || []).length, r: r => NF.format((r.berkas || []).length), kelas: "n"},
    {l: "Aksi", aksi: true, r: r => tombol("Lihat", "mata", "kecil", () => lihat(r))},
  ], "Belum ada isian terkirim dari rekan.");
  return h("div", {}, h("div", {class: "pd-bagian"}, tombol("Tambah", "tambah", "utama", () => formPopup(jenis, null)), saya),
    h("div", {class: "pd-bagian"}, h("h2", {}, ikon("user"), "Isian rekan satu unit"), tr));
}
function alertGalat(t) { dialog("Gagal", h("p", {teks: t}), null, {kecil: true}); }

let tabsEl = null;
function hitung() { if (tabsEl) tabsEl.querySelectorAll("b").forEach((b, i) => { b.textContent = NF.format(S.isian.filter(x => x.jenis === JENIS[i]).length); }); }
function render(tetap) {
  if (!S.akun) return layarAuth();
  const a = S.akun, unitNama = a.unit === "lainnya" ? (a.unit_lain || LAINNYA) : UNIT[a.unit] || a.unit;
  tabsEl = h("div", {class: "ad-tabs pd-tab"}, JENIS.map(j => h("button", {type: "button", "aria-pressed": S.tab === j ? "true" : "false", on: {click: () => { S.tab = j; render(); }}},
    JUDUL_JENIS[j], h("b", {teks: NF.format(S.isian.filter(x => x.jenis === j).length)}))));
  const isi = h("div", {class: "pd-isi"}, tabIsi());
  app.replaceChildren(h("div", {class: "pd-kepala"}, h("h1", {teks: a.nama}), pil("pd-unit", "gedung", unitNama), h("div", {class: "bn-aksi"},
    tombol("Ganti sandi", "kunci", "", () => dialogGantiSandi(false)), tombol("Keluar", "keluar", "", keluar))), tabsEl, isi);
  if (a.wajib_ganti && !tetap) dialogGantiSandi(true);
}

async function muatSaya() {
  const r = await api("GET", "/api/pendataan/saya");
  if (!r.ok) { S.akun = null; return render(); }
  S.akun = r.j.akun; S.isian = r.j.isian || []; S.rekan = r.j.rekan || [];
  render();
}
muatSaya();
