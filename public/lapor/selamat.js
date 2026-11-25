/* Kabar selamat dan laporan orang belum ditemukan di /lapor (KEPUTUSAN-LAPOR-AI K91, D126-D130; TIKET LA-81).
   Satu <dialog> bawaan peramban, dibuat saat pertama dibuka. Nomor dibuktikan lewat kode sekali pakai WhatsApp (/api/masuk/kode, /api/masuk/periksa),
   nomor hanya di variabel, kode tidak disimpan. Kata larangan D126 tidak dipakai. Klik: tombol berganti keadaan seketika, jaringan menyusul (INP). */
import {daerahTersimpan, ajakanDari, LABEL_STATUS, nomorSah, nomor62, namaPanggilSah, namaDicariSah, badanKabar, badanCari, teksGalat, waktuWib, tautanUtuh, tautanWa} from "./selamat_murni.js";

const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x != null) e.textContent = x; return e; };
const NS = "http://www.w3.org/2000/svg";
const ikon = id => { const s = document.createElementNS(NS, "svg"), u = document.createElementNS(NS, "use"); u.setAttribute("href", `#${id}`); s.setAttribute("aria-hidden", "true"); s.append(u); return s; };
const LOKAL = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const waLokal = () => LOKAL ? new URLSearchParams(location.search).get("wa") : null;   // hanya server tinjau lokal; produksi memakai sesi /masuk

async function api(metode, jalur, badan) {
  const wa = waLokal(); let u = jalur;
  if (wa) u += (u.includes("?") ? "&" : "?") + "wa=" + encodeURIComponent(wa);
  if (navigator.onLine === false) return {s: 0, j: {}, tunggu: 0};
  try {
    const r = await fetch(u, {method: metode, credentials: "same-origin", cache: "no-store", headers: metode === "GET" ? undefined : {"content-type": "application/json", "x-pb": "1"},
      body: badan ? JSON.stringify(wa ? {...badan, wa} : badan) : undefined});
    return {s: r.status, j: await r.json().catch(() => ({})), tunggu: Number(r.headers.get("retry-after")) || 0};
  } catch { return {s: 0, j: {}, tunggu: 0}; }
}
const sibuk = (b, ya, teks) => { if (ya) { b.dataset.teks = b.textContent; b.textContent = teks; } else if (b.dataset.teks) b.textContent = b.dataset.teks; b.disabled = ya; };

let dlg = null, isi = null, sesiOk = false, tanda = null, tutupDlg = () => {};

function bangun() {
  dlg = el("dialog", "sl-dlg"); dlg.setAttribute("aria-labelledby", "slJudul"); dlg.setAttribute("closedby", "any");
  const kep = el("header", "sl-kepala"), h = el("h2", null, "Kabar selamat"), x = el("button", "sl-x"); h.id = "slJudul"; x.type = "button"; x.setAttribute("aria-label", "Tutup"); x.append(ikon("i-tutup"));
  x.addEventListener("click", () => dlg.close()); kep.append(h, x);
  isi = el("div", "sl-isi"); dlg.append(kep, isi); document.body.append(dlg);
  tutupDlg = () => dlg.close();
}
const judul = t => { document.getElementById("slJudul").textContent = t; };
const tampil = (t, ...anak) => { judul(t); isi.replaceChildren(...anak); (isi.querySelector("input,select,textarea,button.sl-pilih") || isi).focus?.({preventScroll: true}); };
const pesanEl = () => { const p = el("p", "sl-pesan"); p.setAttribute("role", "status"); return p; };
const set = (p, t, ok) => { p.textContent = t || ""; p.className = "sl-pesan" + (t ? (ok ? " ok" : " galat") : ""); };
const kolom = (label, kontrol, bantu) => { const l = el("label", "sl-kolom"); l.append(el("span", null, label), kontrol); if (bantu) l.append(el("small", null, bantu)); return l; };
const tombol = (teks, kelas = "sl-utama", ik) => { const b = el("button", kelas); b.type = "button"; if (ik) b.append(ikon(ik)); b.append(teks); return b; };

/* ---------- pintu: dua pilihan ---------- */
function pilih(catatan) {
  const a = tombol("", "sl-pilih sl-selamat"), c = tombol("", "sl-pilih");
  a.append(ikon("i-centang"), el("span", null, "Saya selamat"), el("small", null, "Buat tautan kabar untuk keluarga. Bisa dicabut kapan saja."));
  c.append(ikon("i-cari"), el("span", null, "Laporkan orang yang belum ditemukan"), el("small", null, "Hanya dilihat petugas BNPB dan BPBD. Tidak tampil di publik."));
  a.addEventListener("click", () => lewatSesi(formKabar, a)); c.addEventListener("click", () => lewatSesi(formCari, c));
  const p = pesanEl(); if (catatan) set(p, catatan, true);
  tampil("Kabar selamat", el("p", "sl-lead", "Sesudah kejadian, kabari keluarga bahwa Anda selamat, atau laporkan orang yang belum Anda temukan. Nomor WhatsApp Anda dibuktikan dengan kode sekali pakai supaya tidak ada yang menandai atas nama orang lain."), a, c, p);
}

/* ---------- bukti nomor ---------- */
async function lewatSesi(lanjut, pemicu) {
  if (sesiOk) return lanjut();
  const teks = pemicu?.textContent; if (pemicu) pemicu.disabled = true;
  const r = await api("GET", "/api/lapor/selamat/saya");
  if (pemicu) { pemicu.disabled = false; }
  if (r.s === 200) { sesiOk = true; tanda = r.j.tanda || null; return lanjut(); }
  if (r.s === 401) return viewNomor(lanjut);
  const p = isi.querySelector(".sl-pesan"); if (p) set(p, teksGalat(r.s, r.j.galat, r.tunggu));
}
function viewNomor(lanjut) {
  const f = el("form", "sl-form"), i = el("input"), b = el("button", "sl-utama", "Kirim kode lewat WhatsApp"), p = pesanEl();
  // awalan +62 tetap di depan, sama dengan kartu identitas chat (pemilik 25 Nov 2026: "harusnya kan ada +62 nya"); 0 atau 62 yang diketik dibuang
  i.type = "tel"; i.inputMode = "numeric"; i.autocomplete = "tel-national"; i.maxLength = 13; i.placeholder = "812 3456 7890"; i.required = true; b.type = "submit";
  i.addEventListener("input", () => { let v = i.value.replace(/\D/g, ""); if (v.startsWith("62")) v = v.slice(2); if (v.startsWith("0")) v = v.slice(1); i.value = v.slice(0, 13); });
  const wadah = el("span", "sl-nomor"); wadah.append(el("span", "sl-awalan", "+62"), i);
  f.append(kolom("Nomor WhatsApp Anda", wadah, "Kode enam angka dikirim ke nomor ini. Nomor tidak ditampilkan ke siapa pun."), b, p);
  f.addEventListener("submit", async e => {
    e.preventDefault(); const wa = "62" + i.value.replace(/\D/g, "");
    if (!nomorSah(wa)) return set(p, "Nomor WhatsApp tidak sah. Contoh +62 812 3456 7890.");
    sibuk(b, true, "Mengirim..."); set(p, "");
    const t = await window.tokenTurnstile?.(), r = await api("POST", "/api/masuk/kode", {wa: nomor62(wa), turnstile: t || undefined});
    sibuk(b, false);
    if (r.s === 200) return viewKode(nomor62(wa), lanjut);
    set(p, teksGalat(r.s, r.j.galat, r.tunggu));
  });
  tampil("Buktikan nomor Anda", f);
}
function viewKode(nomor, lanjut) {
  const f = el("form", "sl-form"), i = el("input"), b = el("button", "sl-utama", "Periksa kode"), u = tombol("Kirim ulang kode", "sl-kedua"), p = pesanEl();
  i.type = "text"; i.inputMode = "numeric"; i.autocomplete = "one-time-code"; i.maxLength = 6; i.pattern = "[0-9]{6}"; i.required = true; b.type = "submit";
  f.append(kolom("Kode enam angka", i, `Dikirim ke WhatsApp ${"*".repeat(Math.max(0, nomor.length - 4))}${nomor.slice(-4)}. Berlaku beberapa menit.`), b, u, p);
  let jalan = false;
  const periksa = async () => {
    if (jalan) return; if (!/^[0-9]{6}$/.test(i.value)) return set(p, "Kode terdiri dari enam angka.");
    jalan = true; sibuk(b, true, "Memeriksa..."); set(p, "");
    const r = await api("POST", "/api/masuk/periksa", {wa: nomor, kode: i.value});
    jalan = false; sibuk(b, false);
    if (r.s !== 200) { i.select(); return set(p, teksGalat(r.s, r.j.galat, r.tunggu)); }
    sesiOk = true; i.value = "";
    const s = await api("GET", "/api/lapor/selamat/saya"); tanda = s.j?.tanda || null; lanjut();
  };
  f.addEventListener("submit", e => { e.preventDefault(); periksa(); });
  i.addEventListener("input", () => { const v = i.value.replace(/\D/g, "").slice(0, 6); if (v !== i.value) i.value = v; if (v.length === 6) periksa(); });
  u.addEventListener("click", async () => { sibuk(u, true, "Mengirim..."); const t = await window.tokenTurnstile?.(), r = await api("POST", "/api/masuk/kode", {wa: nomor, turnstile: t || undefined}); sibuk(u, false); set(p, r.s === 200 ? "Kode baru dikirim." : teksGalat(r.s, r.j.galat, r.tunggu), r.s === 200); });
  tampil("Masukkan kode", f);
}

/* ---------- pilih kab/kota: lokasi saya atau cari nama ---------- */
function pemilihKab() {
  let kode = "", nama = "";
  const w = el("div", "sl-kab"), cur = el("p", "sl-kab-pilih", "Belum dipilih"), gps = tombol("Pakai lokasi saya", "sl-kedua", "i-lokasi"), cari = el("input"), hasil = el("ul", "sl-kab-hasil"), p = pesanEl();
  cari.type = "search"; cari.placeholder = "Cari nama kabupaten atau kota"; cari.setAttribute("aria-label", "Cari kabupaten atau kota");
  const pasang = (k, n) => { kode = k; nama = n; cur.textContent = `Kab/kota: ${n}`; cur.classList.add("ada"); hasil.replaceChildren(); cari.value = ""; set(p, ""); };
  gps.addEventListener("click", () => {
    if (!("geolocation" in navigator)) return set(p, "Peramban ini tidak bisa membaca lokasi. Cari nama kabupaten atau kota.");
    sibuk(gps, true, "Membaca lokasi..."); set(p, "");
    navigator.geolocation.getCurrentPosition(async pos => {
      const r = await api("GET", `/api/lapor/daerah?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`); sibuk(gps, false);
      const k = r.j?.wilayah?.kabKode; if (r.s === 200 && k) pasang(k, r.j.wilayah.kab || k); else set(p, "Lokasi belum terbaca sebagai kabupaten atau kota. Cari namanya.");
    }, () => { sibuk(gps, false); set(p, "Lokasi tidak bisa dibaca. Cari nama kabupaten atau kota."); }, {enableHighAccuracy: false, maximumAge: 300000, timeout: 15000});
  });
  let tunda = 0, no = 0;
  cari.addEventListener("input", () => { clearTimeout(tunda); const q = cari.value.trim(), n = ++no; if (q.length < 3) return hasil.replaceChildren();
    tunda = setTimeout(async () => { const r = await api("GET", `/api/lapor/cari?q=${encodeURIComponent(q)}&dalam=`); if (n !== no) return;
      const xs = (r.j.hasil || []).filter(d => d.tingkat === "kab").slice(0, 8);
      hasil.replaceChildren(...(xs.length ? xs.map(d => { const li = el("li"), b = el("button", "sl-kab-baris"); b.type = "button"; b.append(el("b", null, d.judul), el("small", null, String(d.sub || "").split(", ").pop()));
        b.addEventListener("click", () => pasang(d.kode, d.judul)); li.append(b); return li; }) : [el("li", "sl-kab-kosong", "Tidak ada kabupaten atau kota dengan nama itu.")])); }, 250); });
  w.append(cur, gps, cari, hasil, p);
  return {el: w, nilai: () => kode, nama: () => nama, galat: t => set(p, t)};
}

/* ---------- Saya selamat ---------- */
function formKabar() {
  const f = el("form", "sl-form"), nm = el("input"), kab = pemilihKab(), b = el("button", "sl-utama", "Buat tautan kabar"), p = pesanEl();
  nm.type = "text"; nm.maxLength = 40; nm.required = true; nm.autocomplete = "nickname"; nm.placeholder = "Misalnya Budi";
  const grup = el("fieldset", "sl-status"), lg = el("legend", null, "Keadaan Anda");
  grup.append(lg, ...Object.entries(LABEL_STATUS).map(([k, t], n) => { const l = el("label", "sl-radio"), r = el("input"); r.type = "radio"; r.name = "slStatus"; r.value = k; r.checked = n === 0;
    l.append(r, el("span", null, t), el("small", null, k === "selamat" ? "Saya baik-baik saja." : "Saya selamat, tetapi masih butuh pertolongan. Percakapan lapor akan dibuka.")); return l; }));
  if (tanda) f.append(blokTandaLama(tanda));
  f.append(kolom("Nama panggilan", nm, "Yang dibaca keluarga di tautan. Tanpa nomor telepon."), grup, el("p", "sl-label", "Kabupaten atau kota Anda"), kab.el, b, p);
  b.type = "submit";
  const kembali = tombol("Kembali", "sl-teks", "i-kembali"); kembali.addEventListener("click", () => pilih());
  f.addEventListener("submit", async e => {
    e.preventDefault();
    if (!namaPanggilSah(nm.value)) return set(p, "Isi nama panggilan singkat, tanpa nomor telepon.");
    if (!kab.nilai()) return set(p, "Pilih kabupaten atau kota Anda dulu.");
    sibuk(b, true, "Membuat tautan..."); set(p, "");
    const status = f.elements.slStatus.value, r = await api("POST", "/api/lapor/selamat", badanKabar({nama: nm.value, status, kab: kab.nilai()}));
    sibuk(b, false);
    if (r.s === 401) { sesiOk = false; return viewNomor(formKabar); }
    if (r.s !== 200) return set(p, teksGalat(r.s, r.j.galat, r.tunggu));
    tanda = {nama_panggil: r.j.nama_panggil, status: r.j.status, label: r.j.label, kab: r.j.kab, kab_nama: r.j.kab_nama, waktu: Date.now(), kedaluwarsa: r.j.kedaluwarsa};
    hasil(r.j);
  });
  tampil("Saya selamat", kembali, f);
}
function blokTandaLama(t) {
  const k = el("div", "sl-lama"), c = tombol("Cabut tanda lama", "sl-bahaya"), p = pesanEl();
  k.append(el("b", null, "Tanda Anda yang berlaku"), el("p", null, `${t.nama_panggil}, ${t.label || LABEL_STATUS[t.status]}, ${t.kab_nama || t.kab}. Dibuat ${waktuWib(t.waktu)}. Tanda baru menggantikan yang ini.`), c, p);
  c.addEventListener("click", async () => { sibuk(c, true, "Mencabut..."); const r = await api("DELETE", "/api/lapor/selamat"); sibuk(c, false); if (r.s === 200) { tanda = null; k.remove(); } else set(p, teksGalat(r.s, r.j.galat, r.tunggu)); });
  return k;
}
function hasil(j) {
  const url = tautanUtuh(location.origin, j.tautan), nama = j.nama_panggil;
  const kartu = el("div", "sl-hasil"), judulK = el("b", null, nama), st = el("span", "sl-pil" + (j.status === "butuh_bantuan" ? " bantuan" : ""), j.label || LABEL_STATUS[j.status]);
  kartu.append(el("p", "sl-hasil-nama", ""), el("small", null, `${j.kab_nama || j.kab}`)); kartu.firstChild.append(judulK, st);
  const kolomUrl = el("input", "sl-url"); kolomUrl.readOnly = true; kolomUrl.value = url; kolomUrl.setAttribute("aria-label", "Tautan kabar untuk keluarga"); kolomUrl.addEventListener("focus", () => kolomUrl.select());
  const wa = el("a", "sl-utama"); wa.href = tautanWa(location.origin, j.tautan, nama, j.status); wa.target = "_blank"; wa.rel = "noopener"; wa.append(ikon("i-kirim"), "Bagikan ke WA");
  const salin = tombol("Salin tautan", "sl-kedua", "i-salin"), cabut = tombol("Cabut tanda", "sl-bahaya"), p = pesanEl();
  salin.addEventListener("click", async () => { try { await navigator.clipboard.writeText(url); set(p, "Tautan disalin.", true); } catch { kolomUrl.select(); set(p, "Tekan lama pada tautan lalu pilih Salin."); } });
  cabut.addEventListener("click", async () => {
    sibuk(cabut, true, "Mencabut..."); const r = await api("DELETE", "/api/lapor/selamat"); sibuk(cabut, false);
    if (r.s === 200) { tanda = null; pilih("Tanda dicabut. Tautan tadi tidak bisa dibuka lagi."); } else set(p, teksGalat(r.s, r.j.galat, r.tunggu));
  });
  const anak = [kartu, kolomUrl, el("p", "sl-catat", `Tautan berlaku sampai ${waktuWib(j.kedaluwarsa)}. Simpan atau bagikan sekarang; tautan tidak bisa ditampilkan lagi nanti.`), wa, salin];
  if (j.status === "butuh_bantuan") {
    const lapor = tombol("Laporkan kejadiannya sekarang", "sl-utama sl-lapor", "i-sirene");
    lapor.addEventListener("click", () => { tutupDlg(); document.getElementById("bLaporBaru")?.click(); });   // alur lapor biasa; lokasi dan jenis ditanya di sana
    anak.unshift(el("p", "sl-lead", "Karena Anda masih butuh bantuan, laporkan kejadiannya agar petugas bisa menindaklanjuti.")); anak.push(lapor);
  }
  anak.push(cabut, p);
  tampil("Tautan siap dibagikan", ...anak);
}

/* ---------- orang belum ditemukan ---------- */
function formCari() {
  const f = el("form", "sl-form"), kab = pemilihKab(), b = el("button", "sl-utama", "Kirim ke petugas"), p = pesanEl();
  const nm = el("input"), ciri = el("textarea"), lok = el("input"), wkt = el("input"), nomor = el("input"), hub = el("input"), dl = el("datalist");
  nm.type = "text"; nm.maxLength = 80; nm.required = true; nm.placeholder = "Nama lengkap atau panggilan";
  ciri.rows = 3; ciri.maxLength = 300; ciri.placeholder = "Usia, pakaian, tanda khusus"; lok.type = "text"; lok.maxLength = 200; lok.placeholder = "Tempat terakhir terlihat";
  wkt.type = "datetime-local"; nomor.type = "tel"; nomor.inputMode = "tel"; nomor.placeholder = "Boleh dikosongkan";
  hub.type = "text"; hub.maxLength = 40; hub.setAttribute("list", "slHub"); dl.id = "slHub"; dl.append(...["Keluarga", "Teman", "Tetangga", "Rekan kerja"].map(v => Object.assign(el("option"), {value: v})));
  b.type = "submit";
  f.append(el("p", "sl-lead", "Laporan ini hanya dilihat petugas BNPB dan BPBD wilayahnya. Tidak tampil di halaman publik dan tidak menambah angka resmi."),
    kolom("Nama orang yang dicari", nm), kolom("Ciri-ciri", ciri), kolom("Lokasi terakhir terlihat", lok), kolom("Waktu terakhir terlihat", wkt),
    kolom("Nomor WhatsApp orang itu", nomor, "Bila ada. Petugas memakainya untuk mencocokkan dengan kabar selamat. Tidak pernah dicocokkan lewat nama."),
    kolom("Hubungan Anda dengannya", hub), dl, el("p", "sl-label", "Kabupaten atau kota tempat ia terakhir berada"), kab.el, b, p);
  const kembali = tombol("Kembali", "sl-teks", "i-kembali"); kembali.addEventListener("click", () => pilih());
  f.addEventListener("submit", async e => {
    e.preventDefault();
    if (!namaDicariSah(nm.value)) return set(p, "Isi nama orang yang dicari.");
    if (!kab.nilai()) return set(p, "Pilih kabupaten atau kota dulu.");
    if (nomor.value.trim() && !nomorSah(nomor.value)) return set(p, "Nomor WhatsApp orang itu tidak sah. Kosongkan bila tidak ada.");
    sibuk(b, true, "Mengirim..."); set(p, "");
    const r = await api("POST", "/api/lapor/cari", badanCari({nama: nm.value, ciri: ciri.value, lokasi: lok.value, waktu: wkt.value, nomorDicari: nomor.value, hubungan: hub.value, kab: kab.nilai()}));
    sibuk(b, false);
    if (r.s === 401) { sesiOk = false; return viewNomor(formCari); }
    if (r.s !== 200) return set(p, teksGalat(r.s, r.j.galat, r.tunggu));
    const ok = tombol("Selesai", "sl-utama"); ok.addEventListener("click", () => dlg.close());
    tampil("Laporan terkirim", el("p", "sl-lead", r.j.pesan || "Laporan diterima petugas. Laporan ini tidak tampil di publik."), el("p", "sl-catat", "Petugas akan menghubungi Anda lewat WhatsApp bila ada kabar. Bila orang itu dalam bahaya sekarang, telepon 117."), ok);
  });
  tampil("Orang belum ditemukan", kembali, f);
}

export function bukaKabarSelamat(langsung) {   // langsung "cari": tombol hero Lapor orang hilang membuka formulir orang dicari (pemilik 25 Nov 2026)
  if (!dlg) bangun();
  pilih(); if (!dlg.open) dlg.showModal();
  if (langsung === "cari") lewatSesi(formCari);
}
for (const b of document.querySelectorAll("[data-buka-selamat]")) b.addEventListener("click", () => bukaKabarSelamat(b.dataset.bukaSelamat));

/* ---------- kartu ajakan (Q68): hanya bila lokasi sudah diketahui dan kab itu punya status darurat berlaku; tidak meminta izin lokasi baru ---------- */
async function ajak() {
  const pita = document.querySelector(".sl-pita"), q = daerahTersimpan(Object.entries(localStorage));
  if (!pita || !q) return;
  const r = await api("GET", `/api/lapor/rapor?${new URLSearchParams(q)}`), a = r.s === 200 ? ajakanDari(r.j, sessionStorage.getItem("sl-ajak-tutup") || "") : null;
  if (!a) return;
  const k = el("div", "sl-ajak"), b = tombol("Saya selamat", "sl-utama", "i-centang"), x = el("button", "sl-x"); x.type = "button"; x.setAttribute("aria-label", "Tutup ajakan"); x.append(ikon("i-tutup"));
  k.setAttribute("role", "status"); k.append(el("p", null, a.teks), b, x);
  b.addEventListener("click", bukaKabarSelamat);
  x.addEventListener("click", () => { k.remove(); try { sessionStorage.setItem("sl-ajak-tutup", a.kab); } catch { /* tanpa simpanan */ } });
  pita.before(k);
}
(window.requestIdleCallback || (f => setTimeout(f, 1500)))(() => ajak().catch(() => {}));
