/* peringatan.js — halaman /peringatan: status per lokasi, langganan email, panduan tindakan.
   API (src/ews*.js): GET /api/ews/cek?lat&lon, GET /api/ews/konfig, POST /api/ews/langganan.
   Katalog bencana & tindakan = /ews_tindakan.js (satu sumber dengan worker). Tanpa pustaka; semua gagal-aman bila API belum ada. */
import {TINGKAT, HARI, BENCANA, tindakanUntuk} from "/ews_tindakan.js";

const API = "/api/ews";
const URUT = ["karhutla", "banjir", "longsor", "cuaca", "rob", "gempa", "tsunami"];
const LEBAR = new Set(["karhutla", "gempa", "tsunami"]);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
/* nama provinsi: kode 2 digit -> nama dari data/meta.json (sama dengan namaProv di index.html); kode mentah tidak pernah tampil */
let PROV = {};
const provP = fetch("/data/meta.json").then(r => r.json()).then(m => { PROV = m.provinsi || {}; }).catch(() => {});
const namaProv = k => PROV[k] || (/^\d+$/.test(String(k ?? "")) ? "" : k) || "";
const namaWil = w => w ? [w.kec && `Kec. ${w.kec}`, w.kab, namaProv(w.prov)].filter(Boolean).join(", ") : "";
/* privasi: koordinat dibulatkan 2 desimal (~1 km) sebelum keluar dari peramban */
const r2 = n => Math.round(n * 100) / 100;
const bulat = l => ({...l, lat: r2(l.lat), lon: r2(l.lon)});
const pecah = n => Math.abs(n).toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const koord = (lat, lon) => `${pecah(lat)}° ${lat < 0 ? "LS" : "LU"} · ${pecah(lon)}° ${lon < 0 ? "BB" : "BT"}`;
const BATAS_AKURASI = 5000;
const pesanAkurasi = a => `Lokasi kurang tepat (±${Math.round(a).toLocaleString("id-ID")} m). Pindah ke tempat terbuka lalu coba lagi, atau isi koordinat sendiri.`;
const NAMA_SUMBER = {fwi: "Karhutla", banjir: "Banjir", longsor: "Longsor", cuaca: "Cuaca", rob: "Rob", gempa: "Gempa", tsunami: "Tsunami", firms: "Titik panas", titik: "Titik panas", jejak: "simulasi penjalaran api"};
/* peringatan dari simulasi penjalaran api: kalimat jadi dari backend (item.kalimat), dipecah per " · " supaya tiap potong bisa diterjemahkan */
const barisSim = p => { if (p.sumber_jenis !== "simulasi") return "";
  const bagian = String(p.kalimat || "").split(" · ").filter(Boolean).slice(1).map(x => `<span>${esc(x)}</span>`).join(" · ");   // potongan pertama = judul, sudah tampil
  return `<p class="st-sim">${bagian}${p.kompleks ? `${bagian ? " · " : ""}<a href="/sim/${encodeURIComponent(p.kompleks)}">Lihat simulasi</a>` : ""}</p>`; };
const lst = a => a.map(x => `<span>${esc(x)}</span>`).join(", ");
const waktuUpd = v => { const d = new Date(v); if (isNaN(d)) return ""; return /T/.test(v) ? d.toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}) : d.toLocaleDateString("id-ID", {day: "numeric", month: "short"}); };
const IK = {
  cek: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21z"/><circle cx="12" cy="10" r="2.2"/></svg>',
};

/* ---------------------------------------------------------------- piktogram (garis sederhana, warna mengikuti --w) */
const S = (isi, vb = "0 0 80 64") => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${isi}</svg>`;
const PIKTO = {
  gempa: [
    {n: "Merunduk", k: "Turun ke lantai", s: S('<path d="M6 58h68"/><circle cx="30" cy="26" r="6"/><path d="M33 33l12 10M45 43h13v15M45 43l-6 15"/><path d="M62 14l-4 6 6 4-4 6" stroke-width="2.6"/>')},
    {n: "Berlindung", k: "Di bawah meja kokoh", s: S('<path d="M6 58h68M10 28h60M14 28v30M66 28v30"/><circle cx="40" cy="42" r="5"/><path d="M40 47v11"/>')},
    {n: "Berpegangan", k: "Sampai guncangan berhenti", s: S('<path d="M6 58h68M52 8v50"/><rect x="34" y="28" width="22" height="14" rx="7" fill="currentColor" fill-opacity=".18"/><path d="M14 22q-4 4 0 8M20 18q-5 8 0 16M70 22q4 4 0 8" stroke-width="2.6"/>')},
  ],
  tsunami: [
    {n: "Jauhi pantai", k: "Jangan menunggu sirene atau air surut", s: S('<path d="M4 46q6-9 12 0t12 0t12 0M4 56q6-9 12 0t12 0t12 0"/><path d="M50 26h24M66 18l8 8-8 8"/>')},
    {n: "Cari tempat tinggi", k: "Minimal 3 km ke darat atau lantai 3 ke atas", s: S('<path d="M6 58l26-34 14 18 8-10 20 26z"/><path d="M32 4v12M26 10l6-6 6 6"/>')},
  ],
};
const piktos = k => PIKTO[k] ? `<div class="piktos${PIKTO[k].length === 2 ? " dua" : ""}">${PIKTO[k].map(p => `<div class="pikto">${p.s}<b>${p.n}</b><small>${p.k}</small></div>`).join("")}</div>` : "";

/* ---------------------------------------------------------------- spanduk & tautan email */
const PESAN = {aktif: ["ok", "Langganan aktif. Peringatan untuk lokasimu akan dikirim ke email ini."], berhenti: ["info", "Langganan dihentikan. Email ini tidak akan menerima peringatan lagi."],
  "tautan-salah": ["salah", "Tautan tidak berlaku atau sudah kedaluwarsa. Coba berlangganan lagi, atau minta tautan baru."]};
function spanduk(kunci) { const T = PESAN[kunci]; if (!T) return; const el = $("#spanduk"); el.className = T[0]; el.textContent = T[1]; el.hidden = false; }
spanduk(new URLSearchParams(location.search).get("status"));

/* GET tautan email tidak mengubah apa pun: halaman memuat rincian, pengguna menekan satu tombol (POST) */
async function aksiEmail(aksi, t) {
  const el = $("#aksi"), tutup = st => { const u = new URL(location.href); u.searchParams.delete("aksi"); u.searchParams.delete("t"); if (st) u.searchParams.set("status", st); history.replaceState(null, "", u); };
  const rusak = () => { el.hidden = true; tutup("tautan-salah"); spanduk("tautan-salah"); };
  el.hidden = false; el.innerHTML = '<div class="st-muat"></div>';
  let j; try { const r = await fetch(`${API}/rincian?t=${encodeURIComponent(t)}`); j = r.ok ? await r.json().catch(() => null) : null; } catch (e) { j = null; }
  if (!j) return rusak(); await provP;
  const konf = aksi === "konfirmasi", c = j.calon, wil = c?.wilayah || j.wilayah, bc = (c?.bencana || j.bencana || []).filter(x => BENCANA[x]);
  const mungkin = j.aksi_mungkin === undefined ? true : j.aksi_mungkin === true || j.aksi_mungkin === aksi || (Array.isArray(j.aksi_mungkin) && j.aksi_mungkin.includes(aksi));
  const chips = bc.map(x => `<span class="chip baca" style="--w:${BENCANA[x].warna}"><img loading="lazy" alt="" src="/img/${BENCANA[x].gambar}"><span>${esc(BENCANA[x].pendek)}</span></span>`).join("");
  const sudah = konf ? j.status === "aktif" : j.status === "berhenti";
  el.innerHTML = `<div class="aksi-kartu"><h2><span>${konf ? "Konfirmasi langganan untuk" : "Berhenti berlangganan untuk"}</span> <span>${esc(namaWil(wil) || "lokasimu")}</span></h2>
    ${c && j.wilayah && namaWil(j.wilayah) !== namaWil(c.wilayah) ? `<p class="aksi-ubah"><span>Lokasi berubah dari</span> <b>${esc(namaWil(j.wilayah))}</b> <span>ke</span> <b>${esc(namaWil(c.wilayah))}</b></p>` : ""}
    ${chips ? `<div class="aksi-chips">${chips}</div>` : ""}
    ${sudah || !mungkin ? `<p class="aksi-info">${sudah ? (konf ? "Langganan ini sudah aktif." : "Langganan ini sudah dihentikan.") : "Tautan ini tidak bisa dipakai lagi. Coba berlangganan lagi, atau minta tautan baru."}</p>`
      : `<p class="galat" role="alert" hidden></p><button type="button" class="tbl pri besar" data-aksi>${konf ? "Aktifkan langganan" : "Berhenti berlangganan"}</button>`}</div>`;
  const b = $("[data-aksi]", el); if (!b) return tutup();
  b.onclick = async () => {
    b.disabled = true; const g = $(".galat", el); g.hidden = true;
    let h = {}, ok = false; try { const r = await fetch(`/ews/${konf ? "konfirmasi" : "berhenti"}?t=${encodeURIComponent(t)}`, {method: "POST"}); h = await r.json().catch(() => ({})); ok = r.ok && h.ok !== false; } catch (e) {}
    if (!ok) { b.disabled = false; g.textContent = h.galat || "Belum berhasil. Coba lagi sebentar lagi."; g.hidden = false; return; }
    el.hidden = true; const st = konf ? "aktif" : "berhenti"; tutup(st); spanduk(st); $("#spanduk").scrollIntoView({block: "center"});
  };
}
{ const q = new URLSearchParams(location.search), a = q.get("aksi"), t = q.get("t"); if ((a === "konfirmasi" || a === "berhenti") && t) aksiEmail(a, t); else if (a || t) { const u = new URL(location.href); u.searchParams.delete("aksi"); u.searchParams.delete("t"); history.replaceState(null, "", u); spanduk("tautan-salah"); } }

/* ---------------------------------------------------------------- lokasi & cek */
function ambilGPS() {
  return new Promise((ok, no) => {
    if (!navigator.geolocation) return no(new Error("Peramban ini tidak bisa membaca lokasi. Isi koordinat sendiri."));
    navigator.geolocation.getCurrentPosition(p => ok({lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy}),
      e => no(new Error(e.code === 1 ? "Izin lokasi ditolak. Izinkan akses lokasi lalu coba lagi, atau isi koordinat sendiri." : "Lokasi belum terbaca. Coba di tempat terbuka, atau isi koordinat sendiri.")),
      {enableHighAccuracy: true, timeout: 20000, maximumAge: 0});
  });
}
/* hasil: {ok, j} | {ok:false, status, galat}; status 0 = jaringan, 404 = layanan belum ada */
async function cek(lat, lon) {
  try {
    const r = await fetch(`${API}/cek?lat=${r2(lat)}&lon=${r2(lon)}`, {credentials: "same-origin"});
    const j = await r.json().catch(() => ({})); await provP;
    return r.ok ? {ok: true, j} : {ok: false, status: r.status, galat: j.galat};
  } catch (e) { return {ok: false, status: 0}; }
}
const galatCek = h => h.status === 404 || h.status === 0 || h.status >= 500 ? "Layanan peringatan belum bisa dihubungi. Coba lagi sebentar lagi." : (h.galat || "Lokasi tidak bisa diperiksa.");

const tglHari = iso => { const d = new Date(iso + "T12:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short"}); };
function renderStatus(j, loc) {
  const el = $("#statusIsi"), w = j.wilayah, P = Array.isArray(j.peringatan) ? j.peringatan : [], hari = j.hari || [];
  const kepala = `<div class="st-wil">${IK.pin}<span>${w ? esc(namaWil(w)) : "Lokasi di luar wilayah yang dipantau"}</span>${loc?.akurasi ? `<small>±${Math.round(loc.akurasi).toLocaleString("id-ID")} m</small>` : ""}</div>`
    + (loc?.akurasi > BATAS_AKURASI ? `<div class="kosong basi"><p>${esc(pesanAkurasi(loc.akurasi))}</p></div>` : "");
  const basi = !!j.basi, nm = x => NAMA_SUMBER[x] || x;
  const catBasi = `<div class="kosong basi"><b>Data prakiraan belum diperbarui</b><p>${j.basi_sumber?.length ? `<span>Sumber yang tertunda:</span> ${lst(j.basi_sumber.map(nm))}. ` : ""}<span>Hasil di bawah bisa belum mencerminkan keadaan terbaru.</span></p></div>`;
  const sm = j.simulasi, catSim = sm && Number.isFinite(+sm.n_aktif) ? `<p class="st-upd">Simulasi penjalaran api mencakup ${(+sm.n_diramal || 0).toLocaleString("id-ID")} dari ${(+sm.n_aktif).toLocaleString("id-ID")} kompleks aktif hari ini. Tidak ada peringatan simulasi bukan berarti aman.</p>` : "";
  const upd = j.diperbarui && Object.keys(j.diperbarui).length ? `<p class="st-upd"><span>Diperbarui:</span> ${Object.entries(j.diperbarui).map(([k, v]) => `<span>${esc(nm(k))}</span> <span>${esc(waktuUpd(v))}</span>`).join(" · ")}</p>` : "";
  if (!w) { el.innerHTML = kepala + `<div class="kosong"><b>Lokasi belum dikenali</b><p>Titik ini tidak masuk wilayah kecamatan yang kami pantau. Periksa koordinatnya.</p></div>`; return; }
  if (!P.length && basi) { el.innerHTML = kepala + catBasi + upd; return; }
  if (!P.length) { el.innerHTML = kepala + `<div class="kosong aman">${IK.cek}<b>Tidak ada peringatan untuk lokasimu</b><p>Untuk tiga hari ke depan tidak ada peringatan di lokasimu. Kami memperbarui tiap hari.</p><button class="tbl pri" type="button" data-langganan>Langganan lewat email</button></div>` + catSim + upd; return; }
  const per = new Map();
  for (const p of P) (per.get(p.bencana) || per.set(p.bencana, []).get(p.bencana)).push(p);
  const kartu = URUT.filter(k => per.has(k)).concat([...per.keys()].filter(k => !URUT.includes(k))).map(k => {
    const B = BENCANA[k], xs = per.get(k), sel = h => { const t = Math.max(0, ...xs.filter(p => p.hari === h).map(p => p.tingkat));
      return `<div><span>${HARI[h]}<small>${esc(tglHari(hari[h]))}</small></span>${t ? `<b class="pil t${t}">${TINGKAT[t]?.nama || ""}</b>` : `<b class="pil" title="Tidak ada peringatan">–</b>`}</div>`; };
    return `<article class="st-kartu" style="--w:${B?.warna || "#6b7489"}"><div class="st-kepala"><i></i>${esc(B?.nama || k)}</div>
      <div class="st-hari">${[0, 1, 2].map(sel).join("")}</div>
      <ul class="st-rinci">${xs.sort((a, b) => a.hari - b.hari || b.tingkat - a.tingkat).map(p => `<li><b><span class="pil t${p.tingkat}">${TINGKAT[p.tingkat]?.nama || ""}</span><span>${HARI[p.hari] || ""}:</span><span>${esc(p.judul)}</span></b>${p.rincian && p.sumber_jenis !== "simulasi" ? `<p>${esc(p.rincian)}</p>` : ""}${barisSim(p)}${p.sumber ? `<small><span>Sumber:</span> <span>${esc(p.sumber)}</span></small>` : ""}</li>`).join("")}</ul></article>`;
  }).join("");
  el.innerHTML = kepala + (basi ? catBasi : "") + kartu + catSim + upd;
}
async function cekLokasi(loc, buka = true) {
  const el = $("#statusIsi"); el.innerHTML = '<div class="st-muat"></div>';
  if (buka) $("#status").scrollIntoView({block: "start"});
  const h = await cek(loc.lat, loc.lon);
  if (!h.ok) { el.innerHTML = `<div class="kosong"><b>Belum bisa memeriksa</b><p>${esc(galatCek(h))}</p><button class="tbl pri" type="button" data-cek>Coba lagi</button></div>`; return h; }
  renderStatus(h.j, loc); return h;
}
async function cekGPS(tombol) {
  const el = $("#statusIsi"); if (tombol) tombol.disabled = true;
  el.innerHTML = '<div class="st-muat"></div>'; $("#status").scrollIntoView({block: "start"});
  try { await cekLokasi(bulat(await ambilGPS()), false); }
  catch (e) { el.innerHTML = `<div class="kosong"><b>Lokasi belum terbaca</b><p>${esc(e.message)}</p><button class="tbl pri" type="button" data-cek>Coba lagi</button></div>`; }
  if (tombol) tombol.disabled = false;
}
const baca = v => { const n = parseFloat(String(v).trim().replace(",", ".")); return Number.isFinite(n) ? n : null; };
function bacaManual(fm) {
  const lat = baca(fm.lat.value), lon = baca(fm.lon.value);
  return lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180 ? null : {lat: r2(lat), lon: r2(lon), akurasi: null};
}
$("#fmManual").addEventListener("submit", e => { e.preventDefault(); const l = bacaManual(e.target);
  if (!l) return $("#statusIsi").innerHTML = '<div class="kosong"><b>Koordinat belum benar</b><p>Isi lintang dan bujur dengan angka, mis. -2,21 dan 113,92.</p></div>';
  cekLokasi(l); });

/* ---------------------------------------------------------------- kartu tindakan */
function kartuTindakan(k) {
  const B = BENCANA[k], tk = Object.keys(B.tindakan).map(Number).sort((a, b) => a - b), awal = tk.includes(2) ? 2 : tk[0];
  return `<article class="kartu${LEBAR.has(k) ? " lebar" : ""}" data-k="${k}" style="--w:${B.warna}">
    <div class="k-foto"><img loading="lazy" decoding="async" alt="" src="/img/${B.gambar}"><h3>${esc(B.nama)}</h3></div><div class="k-pita"></div>
    <div class="k-badan">${piktos(k)}${k === "karhutla" ? '<p class="k-cat">Sebagian peringatan karhutla berasal dari simulasi penjalaran api 72 jam. Itu perkiraan model, paling lemah untuk kebakaran gambut dan kompleks besar.</p>' : ""}
      <div class="seg" role="group" aria-label="Tingkat peringatan ${esc(B.pendek)}">${tk.map(t => `<button type="button" data-t="${t}" style="--tc:${TINGKAT[t].warna}" aria-pressed="${t === awal}"><i></i>${TINGKAT[t].nama}</button>`).join("")}</div>
      <div class="k-isi" aria-live="polite"></div></div></article>`;
}
function isiTingkat(art, t) {
  const k = art.dataset.k, T = TINGKAT[t];
  const isi = $(".k-isi", art), arti = `<p class="k-arti" style="--tc:${T.warna};--tl:${T.latar}">${esc(T.arti)}</p>`;
  isi.innerHTML = arti + `<ol class="k-daftar">${tindakanUntuk(k, t).map(x => `<li>${esc(x)}</li>`).join("")}</ol>`;
}
$("#kartu").innerHTML = URUT.map(kartuTindakan).join("");
$$("#kartu .kartu").forEach(a => isiTingkat(a, +$('.seg [aria-pressed="true"]', a).dataset.t));
$("#kartu").addEventListener("click", e => {
  const b = e.target.closest(".seg button"); if (!b) return;
  $$("button", b.parentNode).forEach(x => x.setAttribute("aria-pressed", x === b));
  isiTingkat(b.closest(".kartu"), +b.dataset.t);
});

/* ---------------------------------------------------------------- lembar langganan (pola foto.js) */
const Lang = {
  k: null, loc: null, wil: null, ts: null,
  async konfig() { return this.k ||= fetch(`${API}/konfig`).then(r => r.ok ? r.json() : null).catch(() => null); },
  async buka() {
    const k = await this.konfig();
    let d = $("#dlgLang");
    if (!d) { d = document.createElement("dialog"); d.id = "dlgLang"; d.className = "sheet"; d.setAttribute("aria-labelledby", "dlgLangJ"); document.body.appendChild(d);
      d.addEventListener("click", e => this.klik(e, d)); d.addEventListener("input", () => this.siap()); d.addEventListener("change", () => this.siap()); d.addEventListener("submit", e => this.kirim(e, d)); }
    this.d = d; this.loc = null; this.wil = null; this.ts = null;
    const ada = k ? (Array.isArray(k.bencana) && k.bencana.length ? URUT.filter(x => k.bencana.includes(x)) : URUT) : [];
    d.innerHTML = `<div class="pegang"></div><header><h2 id="dlgLangJ">Langganan peringatan dini</h2><button type="button" class="x" data-tutup aria-label="Tutup">×</button></header>
      ${!k ? `<div class="kosong"><b>Langganan belum dibuka</b><p>Layanan peringatan sedang disiapkan. Coba lagi nanti.</p><button type="button" class="tbl sek" data-tutup>Tutup</button></div>` : `<form novalidate>
      <button type="button" class="tbl sek gps-btn" data-gps>${IK.pin}Pakai lokasi saya sekarang</button>
      <div class="panel"><div><span>Lokasi</span><b data-lok>Belum dipilih</b></div><div><span>Wilayah</span><b data-wil>–</b></div></div>
      <details class="manual"><summary>Isi koordinat sendiri</summary><div class="fm"><label>Lintang<input name="lat" inputmode="decimal" placeholder="-2,21" autocomplete="off"></label><label>Bujur<input name="lon" inputmode="decimal" placeholder="113,92" autocomplete="off"></label><button type="button" class="tbl sek" data-pakai>Pakai koordinat ini</button></div></details>
      <label class="f">Email<input type="email" name="email" maxlength="254" autocomplete="email" inputmode="email" placeholder="nama@contoh.id" required></label>
      <fieldset><legend>Peringatan yang ingin diterima</legend><div class="chips">${ada.map(x => { const B = BENCANA[x]; return `<label class="chip" style="--w:${B.warna}"><input type="checkbox" name="bencana" value="${x}" checked><img loading="lazy" alt="" src="/img/${B.gambar}"><span>${esc(B.pendek)}${x === "tsunami" ? "<small>penting bila tinggal di pesisir</small>" : ""}</span></label>`; }).join("")}</div></fieldset>
      <label class="tog"><input type="checkbox" name="waspada" value="1"><span><b>Kirim juga tingkat Waspada</b><small>Bawaannya hanya Siaga dan Awas. Gempa dan tsunami selalu dikirim.</small></span></label>
      <label class="tog"><input type="checkbox" name="setuju" value="1" required><span><b>Saya setuju lokasi dan email ini dipakai untuk peringatan</b><small>Lokasi hanya untuk mencocokkan peringatan dan bisa berhenti kapan saja lewat tautan di setiap email. Selengkapnya di <a href="/privasi" target="_blank" rel="noopener">halaman privasi</a>.</small></span></label>
      <div data-ts></div><p class="galat" role="alert" hidden></p>
      <button type="submit" class="tbl pri besar" disabled>Langganan</button></form>`}`;
    if (!d.open) d.showModal();
    if (k) { this.turnstile(d); if (this.dariUrl) { this.pilih(this.dariUrl); } else this.gps(); }
  },
  galat(t) { const p = this.d.querySelector(".galat"); if (!p) return; p.hidden = !t; p.textContent = t || ""; },
  async gps() {
    const el = this.d.querySelector("[data-lok]"); el.textContent = "Membaca GPS…";
    try { await this.pilih(bulat(await ambilGPS())); } catch (e) { el.textContent = "Belum dipilih"; this.galat(e.message); this.siap(); }
  },
  async pilih(loc) {
    this.loc = loc; this.wil = null; const d = this.d, l = d.querySelector("[data-lok]"), w = d.querySelector("[data-wil]");
    l.textContent = `${loc.akurasi ? `±${Math.round(loc.akurasi).toLocaleString("id-ID")} m · ` : ""}${koord(loc.lat, loc.lon)}`; if (loc.akurasi > BATAS_AKURASI) { this.loc = null; w.textContent = "–"; this.galat(pesanAkurasi(loc.akurasi)); this.siap(); return; }
    w.textContent = "Memeriksa…"; this.galat(""); this.siap();
    const h = await cek(loc.lat, loc.lon); if (this.loc !== loc) return;
    if (!h.ok) { if (h.status >= 400 && h.status < 500 && h.status !== 404) { this.loc = null; w.textContent = "–"; this.galat(h.galat || "Lokasi tidak bisa dipakai."); } else w.textContent = "Dikonfirmasi saat dikirim"; }
    else if (!h.j.wilayah) { this.loc = null; w.textContent = "–"; this.galat("Titik ini di luar wilayah yang dipantau. Periksa lokasinya."); }
    else { this.wil = h.j.wilayah; w.textContent = namaWil(this.wil); }
    this.siap();
  },
  siap() {
    const f = this.d?.querySelector("form"); if (!f) return;
    const ok = this.loc && f.email.value && f.email.checkValidity() && f.setuju.checked && f.querySelector('[name="bencana"]:checked');
    f.querySelector("button.besar").disabled = !ok;
  },
  turnstile(d) {
    const kunci = this.k?.turnstile; if (!kunci) return;
    const pasang = () => { this.ts = window.turnstile.render(d.querySelector("[data-ts]"), {sitekey: kunci, size: "flexible"}); };
    if (window.turnstile) return pasang();
    const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.onload = pasang; document.head.appendChild(s);
  },
  klik(e, d) {
    if (e.target === d || e.target.closest("[data-tutup]")) return d.close();
    if (e.target.closest("[data-gps]")) return this.gps();
    if (e.target.closest("[data-pakai]")) { const f = d.querySelector("form"), l = bacaManual({lat: f.querySelector('.fm [name="lat"]'), lon: f.querySelector('.fm [name="lon"]')}); return l ? this.pilih(l) : this.galat("Isi lintang dan bujur dengan angka, mis. -2,21 dan 113,92."); }
  },
  async kirim(e, d) {
    e.preventDefault(); const f = e.target, btn = f.querySelector("button.besar");
    if (!this.loc) return this.galat("Pilih lokasimu dulu.");
    btn.disabled = true; btn.textContent = "Mengirim…"; this.galat("");
    const body = {email: f.email.value.trim(), lat: this.loc.lat, lon: this.loc.lon, akurasi: this.loc.akurasi, bencana: $$('[name="bencana"]:checked', f).map(x => x.value), waspada: f.waspada.checked,
      turnstile: this.ts != null ? window.turnstile.getResponse(this.ts) : undefined};
    let r, j = {};
    try { r = await fetch(`${API}/langganan`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}); j = await r.json().catch(() => ({})); } catch (er) { r = {status: 0}; }
    btn.textContent = "Langganan";
    if (r.status !== 202 && r.status !== 200) { this.siap(); if (this.ts != null) window.turnstile.reset(this.ts);
      return this.galat(j.galat || (r.status === 0 ? "Koneksi terputus. Coba lagi." : `Gagal mengirim (${r.status}). Coba lagi.`)); }
    const w = j.wilayah || this.wil;
    d.innerHTML = `<div class="pegang"></div><div class="selesai">${IK.cek}<h2>Cek email untuk konfirmasi</h2>
      <p>${j.email_aktif === false ? "Permintaanmu sudah tercatat. Email konfirmasi akan dikirim setelah layanan email aktif; belum ada peringatan yang dikirim sebelum itu." : `<span>Kami mengirim tautan konfirmasi ke</span> <b>${esc(body.email)}</b>. <span>Langganan baru aktif setelah tautannya dibuka.</span>`}${w ? ` <span>Lokasi:</span> <b>${esc(namaWil(w))}</b>` : ""}</p>
      <button type="button" class="tbl pri besar" data-tutup>Selesai</button></div>`;
  },
};
document.addEventListener("click", e => {
  if (e.target.closest("[data-langganan]")) return Lang.buka();
  const c = e.target.closest("[data-cek]"); if (c) cekGPS(c);
});

/* ---------------------------------------------------------------- tema, kredit, parameter URL */
const gelap = () => document.documentElement.dataset.theme === "dark" || (document.documentElement.dataset.theme !== "light" && matchMedia("(prefers-color-scheme:dark)").matches);
$("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {} };

fetch("/img/kredit.json").then(r => r.json()).then(K => {
  const pakai = new Set(["bencana-cuaca.jpg", ...Object.values(BENCANA).map(b => b.gambar)]);
  $("#kreditIsi").innerHTML = K.filter(x => pakai.has(x.file)).map(x => `<li>${esc(x.judul)}: ${esc(x.penulis)}, ${esc(x.lisensi)} (<a href="${esc(x.sumber)}" target="_blank" rel="noopener">sumber</a>)</li>`).join("");
}).catch(() => { $(".kredit").hidden = true; });

{
  const q = new URLSearchParams(location.search), lat = baca(q.get("lat") ?? ""), lon = baca(q.get("lon") ?? "");
  if (lat != null && lon != null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) { Lang.dariUrl = {lat: r2(lat), lon: r2(lon), akurasi: null}; cekLokasi(Lang.dariUrl, false); }
  if (location.hash === "#langganan") Lang.buka();
}
