/* Uji pilot SIPPA Kalteng: layar HP tanpa login (keputusan SIPPA 59, src/uji_pilot.js).
   Token di fragmen (#t=<36 hex>), disimpan di localStorage, dikirim lewat header x-uji. Tampilan: beranda (10 lokasi), lokasi (navigasi,
   peta, info, pasang, tips, laporan), lampiran alat, panduan. Laporan = foto bukti + GPS 3 bacaan + EXIF, pola public/foto.js.
   Data pengguna (laporan) selalu lewat textContent; HTML hanya dari data dossier server (gambar peta, tabel hitung). */
import {TAHAP, PETAK, KEDALAMAN, TITIK, cekIsi, ringkasSuhu} from "./uji_pilot_spek.js";

const $ = s => document.querySelector(s);
const isi = $("#isi"), dlg = $("#lapor");
const SIMPAN = "upTok", PENGIRIM = "upPengirim";
const JAM = 36e5;
let TOK = null, D = null, LAPOR = null, adaLapor = false;

/* ---------------------------------------------------------------- pembantu */
function h(tag, a = {}, ...anak) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(a)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v; else if (k === "html") el.innerHTML = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "text") el.textContent = v; else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of anak.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
/* koordinat: titik desimal tetap (Google Maps dan salinan koordinat), bukan format angka Indonesia */
const dec = (v, n) => Number(v).toLocaleString("en-US", {minimumFractionDigits: n, maximumFractionDigits: n, useGrouping: false});
const ang = (x, n = 0) => x == null ? "–" : Number(x).toLocaleString("id-ID", {minimumFractionDigits: n, maximumFractionDigits: n});
const wib = ms => new Date(ms).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(/\./g, ".") + " WIB";
const gmaps = (p, jalan) => `https://www.google.com/maps/dir/?api=1&destination=${dec(p[0], 5)},${dec(p[1], 5)}&travelmode=${jalan ? "walking" : "driving"}`;
/* rute lengkap: posisi sekarang -> semua titik bernomor sebagai perhentian -> titik terakhir (Google Maps menerima beberapa waypoints dipisah |) */
function gRute(titik) {
  const k = p => `${dec(p[0], 5)},${dec(p[1], 5)}`, akhir = titik.at(-1), antara = titik.slice(0, -1);
  return `https://www.google.com/maps/dir/?api=1&destination=${k(akhir)}${antara.length ? "&waypoints=" + encodeURIComponent(antara.map(k).join("|")) : ""}&travelmode=driving`;
}
const gtitik = p => `https://www.google.com/maps/search/?api=1&query=${dec(p[0], 5)},${dec(p[1], 5)}`;
const tahapDari = id => TAHAP.find(t => t.id === id);
function toast(t, lama = 3500) { const x = $("#toast"); x.textContent = t; x.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { x.hidden = true; }, lama); }
const tunda = f => { let sudah = 0; const jalan = () => { if (!sudah) { sudah = 1; f(); } }; requestAnimationFrame(() => requestAnimationFrame(jalan)); setTimeout(jalan, 120); };   // pola nanti() index.html: cat dulu, kerja kemudian

async function api(jalur, o = {}) {
  const r = await fetch(jalur, {...o, headers: {...(o.headers || {}), "x-uji": TOK}});
  if (!r.ok) { let g = `Galat ${r.status}`; try { g = (await r.json()).galat || g; } catch (e) {} const e = new Error(g); e.status = r.status; throw e; }
  return r;
}

/* ---------------------------------------------------------------- rute (hash) */
function bacaHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  return {t: q.get("t"), l: Number(q.get("l")) || null, v: q.get("v"), s: q.get("s")};
}
function ke(o) {
  const q = new URLSearchParams({t: TOK}); if (o.l) q.set("l", o.l); if (o.v) q.set("v", o.v); if (o.s) q.set("s", o.s);
  location.hash = q.toString();
}
window.addEventListener("hashchange", () => tampil());

/* ---------------------------------------------------------------- awal */
async function mulai() {
  const t = bacaHash().t;
  try { if (t && /^[0-9a-f]{36}$/.test(t)) localStorage.setItem(SIMPAN, t); TOK = t || localStorage.getItem(SIMPAN); } catch (e) { TOK = t; }
  if (!TOK) return kosong("Tautan uji belum lengkap", "Buka halaman ini dari tautan yang dibagikan koordinator. Tautan berisi kode akses setelah tanda #.");
  try { D = await (await api("/api/uji-pilot")).json(); }
  catch (e) {
    if (e.status === 403) { try { localStorage.removeItem(SIMPAN); } catch (er) {} return kosong("Tautan tidak berlaku", "Minta tautan baru ke koordinator uji."); }
    return kosong("Data belum bisa dimuat", navigator.onLine ? e.message : "Ponsel sedang tanpa sinyal. Coba lagi saat ada sinyal.", true);
  }
  if (!bacaHash().t) history.replaceState(null, "", "#" + new URLSearchParams({t: TOK}));
  if (D.admin) { $("#dummy").hidden = false; pasangDummy(); }
  const r = bacaHash(); if (!r.l) tampil();   // lokasi: tunggu laporan dulu supaya bagian laporan tidak dibangun dua kali
  await muatLapor(); if (r.l) tampil();
}
function kosong(judul, teks, ulang) {
  isi.replaceChildren(h("section", {class: "up-kosong"}, h("div", {class: "up-kosong-ikon", "aria-hidden": "true"}, "🔒"), h("h2", {}, judul), h("p", {}, teks),
    ulang ? h("button", {class: "up-tombol utama", type: "button", onclick: () => location.reload()}, "Coba lagi") : null));
}
async function muatLapor() {
  try { const j = await (await api("/api/uji-pilot/lapor")).json(); LAPOR = j.lapor; adaLapor = !j.belum_aktif; }
  catch (e) { LAPOR = LAPOR || []; }
  if (document.querySelector(".up-hero, .up-sambut")) tunda(() => { const r = bacaHash(); if (!r.v) tampil(true); });
}

function tampil(segarSaja) {
  const r = bacaHash();
  const kop = (sup, judul, kembali) => { $("#kopSup").textContent = sup; $("#kopJudul").textContent = judul; const k = $("#kembali"); k.hidden = !kembali; k.onclick = kembali; };
  if (r.v === "lampiran") { kop("LAMPIRAN", "Peralatan", () => ke({})); return segarSaja || layarLampiran(); }
  if (r.v === "panduan") { kop("SEMUA LOKASI", "Panduan uji", () => ke({})); return segarSaja || layarPanduan(); }
  const l = r.l && D.lokasi.find(x => x.no === r.l);
  if (l) { kop(`LOKASI ${l.no} DARI 10`, l.nama, () => ke({})); return layarLokasi(l, segarSaja); }
  kop("BNPB SIPPA", "Uji Pilot Kalteng", null);
  layarBeranda();
}

/* ---------------------------------------------------------------- beranda */
function selesai(l) {
  const ls = (LAPOR || []).filter(x => x.lokasi === l.no);
  const kunci = new Set(ls.map(x => x.tahap + (x.petak || "")));
  const total = TAHAP.reduce((s, t) => s + (t.petak ? PETAK.length : t.id === "kendala" ? 0 : 1), 0);
  const ada = TAHAP.reduce((s, t) => s + (t.petak ? PETAK.filter(p => kunci.has(t.id + p)).length : t.id === "kendala" ? 0 : +kunci.has(t.id)), 0);
  return {ada, total, n: ls.length};
}
function kartuLokasi(l) {
  const s = selesai(l), pct = Math.round(100 * s.ada / s.total);
  const bar = h("div", {class: "up-progres-isi"}); bar.style.width = pct + "%";
  return h("a", {class: `up-lok ${l.bagian}`, href: "#" + new URLSearchParams({t: TOK, l: l.no})},
    h("div", {class: "up-lok-no", "aria-hidden": "true"}, l.no),
    h("div", {class: "up-lok-isi"},
      h("div", {class: "up-lok-nama"}, l.nama),
      h("div", {class: "up-lok-uji"}, l.uji),
      h("div", {class: "up-chips"},
        h("span", {class: `up-chip ${l.ada_api ? "api" : "abu"}`}, l.status),
        h("span", {class: "up-chip"}, `± ${l.menit_total} menit`),
        h("span", {class: "up-chip"}, `selang ${ang(l.selang.m)} m`)),
      h("div", {class: "up-progres", title: `${s.ada} dari ${s.total} bukti`}, bar),
      h("div", {class: "up-lok-lapor"}, LAPOR == null ? "Memuat laporan…" : s.n ? `${s.ada} dari ${s.total} bukti tahap, ${s.n} laporan` : "Belum ada laporan")),
    h("span", {class: "up-panah", "aria-hidden": "true"}, "›"));
}
function layarBeranda() {
  const A = D.lokasi.filter(l => l.bagian === "pendek"), B = D.lokasi.filter(l => l.bagian === "panjang");
  isi.replaceChildren(
    h("section", {class: "up-sambut"},
      h("p", {class: "up-sambut-per"}, `Data per ${D.acuan}`),
      h("h2", {}, "Pilih lokasi uji"),
      h("p", {}, "Tiap lokasi berisi navigasi Google Maps, peta lapangan, cara pasang pompa dan selang, tips, dan tempat melapor bukti foto."),
      h("div", {class: "up-kpi"},
        h("div", {}, h("b", {class: "oranye"}, ang(D.kalteng)), h("span", {}, "titik panas Kalteng 25–26 Okt")),
        h("div", {}, h("b", {}, "10"), h("span", {}, "lokasi, semua di peta gambut")))),
    h("h3", {class: "up-bag"}, h("span", {class: "up-bag-tanda a"}, "A"), "Selang pendek, pompa dekat api"),
    h("div", {class: "up-daftar"}, A.map(kartuLokasi)),
    h("h3", {class: "up-bag"}, h("span", {class: "up-bag-tanda b"}, "B"), "Selang panjang, pompa di tepi jalan"),
    h("div", {class: "up-daftar"}, B.map(kartuLokasi)),
    h("h3", {class: "up-bag"}, "Bahan bersama"),
    h("div", {class: "up-daftar"},
      h("a", {class: "up-lok bahan", href: "#" + new URLSearchParams({t: TOK, v: "lampiran"})}, h("div", {class: "up-lok-no", "aria-hidden": "true"}, "🧰"),
        h("div", {class: "up-lok-isi"}, h("div", {class: "up-lok-nama"}, "Lampiran peralatan"), h("div", {class: "up-lok-uji"}, `${D.alat.length} alat, foto dan spesifikasi`)), h("span", {class: "up-panah", "aria-hidden": "true"}, "›")),
      h("a", {class: "up-lok bahan", href: "#" + new URLSearchParams({t: TOK, v: "panduan"})}, h("div", {class: "up-lok-no", "aria-hidden": "true"}, "📋"),
        h("div", {class: "up-lok-isi"}, h("div", {class: "up-lok-nama"}, "Panduan uji dan keselamatan"), h("div", {class: "up-lok-uji"}, "Cara uji, cek gambut, keselamatan, yang perlu diputuskan")), h("span", {class: "up-panah", "aria-hidden": "true"}, "›")),
      h("button", {class: "up-lok bahan", type: "button", onclick: unduhCsv}, h("div", {class: "up-lok-no", "aria-hidden": "true"}, "⬇️"),
        h("div", {class: "up-lok-isi"}, h("div", {class: "up-lok-nama"}, "Unduh semua laporan (CSV)"), h("div", {class: "up-lok-uji"}, "Untuk analisis hasil uji, tanpa data contoh")), h("span", {class: "up-panah", "aria-hidden": "true"}, "›"))));
}
async function unduhCsv(e) {
  const b = e.currentTarget; b.setAttribute("aria-busy", "true");
  try {
    const blob = await (await api("/api/uji-pilot/lapor.csv")).blob(), u = URL.createObjectURL(blob);
    const a = h("a", {href: u, download: `uji-pilot-kalteng-${new Date().toISOString().slice(0, 10)}.csv`}); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 5000);
  } catch (er) { toast(er.message); } finally { b.removeAttribute("aria-busy"); }
}

/* ---------------------------------------------------------------- lokasi */
const BAGIAN = [["navigasi", "Navigasi"], ["peta", "Peta"], ["info", "Info"], ["pasang", "Pasang"], ["tips", "Tips"], ["laporan", "Laporan"]];
function kepalaBagian(id, judul, sub) { return h("header", {class: "up-kb"}, h("h2", {id: "jd-" + id}, judul), sub ? h("p", {}, sub) : null); }
function kv(baris) { return h("dl", {class: "up-kv"}, baris.filter(Boolean).map(([k, v]) => [h("dt", {}, k), h("dd", {}, v)])); }

function layarLokasi(l, segarSaja) {
  if (segarSaja) { const sec = $("#bg-laporan"); if (sec) sec.replaceWith(bagLaporan(l)); return; }
  const nav = h("nav", {class: "up-tab", "aria-label": "Bagian"}, BAGIAN.map(([id, nm]) => h("a", {href: "#", "data-ke": id, onclick: e => {
    e.preventDefault(); nav.querySelectorAll("a").forEach(a => a.removeAttribute("aria-current")); e.currentTarget.setAttribute("aria-current", "true");
    document.getElementById("bg-" + id)?.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"});
  }}, nm)));
  const parkir = l.parkir;
  isi.replaceChildren(
    h("section", {class: `up-hero ${l.bagian}`},
      h("div", {class: "up-hero-atas"}, h("span", {class: "up-hero-no"}, l.no), h("span", {class: `up-chip ${l.ada_api ? "api" : "abu"}`}, l.status)),
      h("p", {class: "up-hero-untuk"}, h("span", {}, "Untuk"), l.uji),
      h("p", {class: "up-hero-peran"}, l.peran),
      h("div", {class: "up-hero-aksi"},
        h("a", {class: "up-tombol utama besar", href: gmaps(parkir), target: "_blank", rel: "noopener"}, "🧭 Arahkan ke ", l.ujung === "perahu" ? "dermaga" : "titik parkir"),
        h("button", {class: "up-tombol besar", type: "button", onclick: () => bukaLapor(l)}, "📷 Lapor bukti")),
      h("div", {class: "up-hero-angka"},
        h("div", {}, h("b", {}, `± ${l.menit_total}`), h("span", {}, "menit sampai petak")),
        h("div", {}, h("b", {}, ang(l.selang.m)), h("span", {}, `m selang, ${l.selang.gulung} gulung`)),
        h("div", {}, h("b", {}, l.selang.relay || "–"), h("span", {}, "pompa tambahan")))),
    nav,
    h("button", {class: "up-fab", type: "button", onclick: () => bukaLapor(l), "aria-label": "Lapor bukti foto"}, "📷", h("span", {}, "Lapor")));
  window.scrollTo(0, 0);
  const fab = isi.lastChild, antre = [bagNavigasi, bagPeta, bagInfo, bagPasang, bagTips, bagLaporan], giliran = ++layarLokasi.n;
  isi.setAttribute("aria-busy", "true");
  const satu = () => {
    if (giliran !== layarLokasi.n) return;   // pengguna sudah pindah layar
    fab.before(antre.shift()(l));
    if (antre.length) return tunda(satu);
    isi.removeAttribute("aria-busy"); pantauTab(nav);
    const s = bacaHash().s; if (s) document.getElementById("bg-" + s)?.scrollIntoView();
  };
  tunda(satu);
}
layarLokasi.n = 0;
function pantauTab(nav) {
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) {
    nav.querySelectorAll("a").forEach(a => a.toggleAttribute("aria-current", a.dataset.ke === e.target.id.slice(3)));
    nav.querySelector("[aria-current]")?.scrollIntoView({block: "nearest", inline: "center"});
  } }, {rootMargin: "-45% 0px -50% 0px"});
  document.querySelectorAll(".up-bagian").forEach(s => io.observe(s));
}

function bagNavigasi(l) {
  const langkah = l.alur.map(x => h("li", {class: x.titik ? "bertitik" : "", "data-no": x.no},
    h("span", {class: `up-no ${x.titik ? "bg-" + (x.warna || "#334155").slice(1) : "garis"}`, "aria-hidden": "true"}, x.no),
    h("div", {class: "up-langkah"},
      h("b", {}, x.judul), x.ket ? h("span", {}, " " + x.ket) : null,
      x.titik ? h("div", {class: "up-langkah-aksi"},
        h("a", {class: "up-tombol kecil utama", href: gmaps(x.titik, /kaki|petak|pompa/i.test(x.judul)), target: "_blank", rel: "noopener"}, "🧭 Arahkan"),
        h("a", {class: "up-tombol kecil", href: gtitik(x.titik), target: "_blank", rel: "noopener"}, "📍 Lihat titik"),
        h("button", {class: "up-tombol kecil", type: "button", onclick: () => salin(`${dec(x.titik[0], 5)}, ${dec(x.titik[1], 5)}`)}, `${dec(x.titik[0], 4)}, ${dec(x.titik[1], 4)}`)) : null)));
  return h("section", {class: "up-bagian", id: "bg-navigasi", "aria-labelledby": "jd-navigasi"},
    kepalaBagian("navigasi", "Alur perjalanan", `± ${l.menit_total} menit dari ${l.dari} sampai petak. Aktifkan GPS untuk panduan langkah demi langkah.`),
    kartuPandu(l),
    h("a", {class: "up-tombol utama besar penuh", href: gRute(l.alur.filter(x => x.titik).map(x => x.titik)), target: "_blank", rel: "noopener"},
      `🗺️ Buka rute lengkap di Google Maps (${l.alur.filter(x => x.titik).length} titik)`),
    h("p", {class: "up-ket"}, "Google Maps membuka semua titik sebagai perhentian berurutan. Ruas terakhir ke pompa dan petak biasanya jalan kaki; ikuti panduan GPS di bawah."),
    h("ol", {class: "up-alur"}, langkah),
    h("p", {class: "up-catat"}, l.rute_catatan),
    h("figure", {class: "up-peta"}, petaSvg(l.svg.rute), h("figcaption", {html: `<div class="up-legenda">${l.legenda_rute}</div>`})),
    h("details", {class: "up-lipat"}, h("summary", {}, "Naik-turun jalur jalan kaki"), h("div", {class: "up-svg putih", html: l.svg.profil_jalan}),
      h("p", {class: "up-ket"}, "Data ketinggian ikut menghitung tinggi pohon, jadi angka nyata bisa lebih kecil.")));
}
/* peta: ketuk untuk layar penuh, bisa digeser dan diperbesar (gambar dossier terlalu kecil di layar 375 px) */
function besarkan(e) {
  if (e.target.closest("a")) return;
  const asal = e.currentTarget.querySelector("svg"); if (!asal) return;
  const g = h("div", {class: "up-besar-geser"}, h("p", {}, "Memuat peta…"));
  const d = h("dialog", {class: "up-besar"}, h("button", {type: "button", class: "up-tutup", "aria-label": "Tutup", onclick: () => d.close()}, "✕"),
    g, h("p", {}, "Geser untuk melihat, cubit untuk memperbesar. Ketuk penanda untuk Google Maps."));
  d.addEventListener("close", () => d.remove());
  document.body.append(d); d.showModal();
  tunda(() => { g.replaceChildren(asal.cloneNode(true)); g.scrollLeft = (g.scrollWidth - g.clientWidth) / 2; g.scrollTop = (g.scrollHeight - g.clientHeight) / 2; });
}
const petaSvg = (svg, kls = "") => h("div", {class: `up-svg bisa-besar ${kls}`, html: svg, role: "button", tabindex: "0", "aria-label": "Perbesar peta", onclick: besarkan,
  onkeydown: e => { if (e.key === "Enter") besarkan(e); }}, h("span", {class: "up-besar-tanda", "aria-hidden": "true"}, "⤢ Perbesar"));
/* ---------------------------------------------------------------- panduan GPS: watchPosition, tiba di titik = beri tahu lalu langkah berikutnya */
const RADIUS = {Berangkat: 150, Naik: 100, Turun: 100, Parkir: 100, Sampai: 50, Pasang: 50};
const radius = x => RADIUS[x.judul.split(" ")[0]] || 75;
const PANDU = {watch: null, l: null};
const kunciPandu = l => "upPandu" + l.no;
function langkahBerikut(l, sudah) {   // langkah bertitik pertama yang belum dicapai
  return l.alur.find(x => x.titik && !sudah.includes(x.no)) || null;
}
function bacaSudah(l) { try { return JSON.parse(localStorage.getItem(kunciPandu(l)) || "[]"); } catch (e) { return []; } }
function simpanSudah(l, s) { try { localStorage.setItem(kunciPandu(l), JSON.stringify(s)); } catch (e) {} }
const arahTeks = (a, b) => { const r = Math.PI / 180, y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r), x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r);
  return ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"][Math.round(((Math.atan2(y, x) / r + 360) % 360) / 45) % 8]; };
const jarakTeks = m => m >= 1000 ? `${ang(m / 1000, 1)} km` : `${ang(m)} m`;

function kartuPandu(l) {
  const kotak = h("div", {class: "up-pandu", id: "pandu", "aria-live": "polite"});
  gambarPandu(l, kotak, null);
  return kotak;
}
function gambarPandu(l, kotak, pos, tiba) {
  kotak = kotak || document.getElementById("pandu"); if (!kotak) return;
  const sudah = bacaSudah(l), x = langkahBerikut(l, sudah);
  if (!PANDU.watch) {
    kotak.className = "up-pandu mati";
    kotak.replaceChildren(h("div", {class: "up-pandu-ikon", "aria-hidden": "true"}, "📡"),
      h("div", {}, h("b", {}, "Aktifkan GPS dulu"), h("p", {}, "Panduan memberi tahu saat Anda tiba di tiap titik, lalu menunjukkan langkah berikutnya. Layar sebaiknya tetap menyala.")),
      h("button", {type: "button", class: "up-tombol utama besar penuh", onclick: () => mulaiPandu(l)}, "Aktifkan GPS dan mulai panduan"));
    return;
  }
  if (!x) {
    kotak.className = "up-pandu selesai";
    kotak.replaceChildren(h("div", {class: "up-pandu-ikon", "aria-hidden": "true"}, "✅"), h("div", {}, h("b", {}, "Semua titik sudah dicapai"), h("p", {}, "Lanjutkan pemasangan dan lapor bukti foto tiap tahap.")),
      h("div", {class: "up-pandu-aksi"}, h("button", {type: "button", class: "up-tombol", onclick: () => { simpanSudah(l, []); gambarPandu(l, null, PANDU.pos); }}, "Ulang dari awal"),
        h("button", {type: "button", class: "up-tombol", onclick: () => bukaLapor(l)}, "📷 Lapor")));
    return;
  }
  const d = pos ? jarakM(pos.lat, pos.lon, x.titik[0], x.titik[1]) : null;
  const antara = l.alur.filter(y => !y.titik && y.no < x.no && y.no > Math.max(0, ...sudah)).map(y => `${y.judul}${y.ket ? " " + y.ket : ""}`);
  kotak.className = "up-pandu hidup" + (tiba ? " tiba" : "");
  kotak.replaceChildren(h("div", {class: "up-pandu-isi"},
    tiba ? h("div", {class: "up-pandu-tiba"}, `✅ Sudah tiba: ${tiba}`) : null,
    h("div", {class: "up-pandu-atas"}, h("span", {class: `up-no bg-${(x.warna || "#334155").slice(1)}`, "aria-hidden": "true"}, x.no),
      h("div", {}, h("small", {}, "Langkah berikutnya"), h("b", {}, x.judul), x.ket ? h("span", {}, " " + x.ket) : null)),
    antara.length ? h("p", {class: "up-pandu-cara"}, antara.join(". ")) : null,
    h("div", {class: "up-pandu-jarak"}, d == null ? h("span", {}, "Membaca GPS…") : [h("b", {}, jarakTeks(d)), h("span", {}, ` lagi ke arah ${arahTeks([pos.lat, pos.lon], x.titik)}`),
      h("small", {}, `akurasi ±${ang(pos.akurasi)} m${pos.akurasi > 100 ? ", lemah: cari tempat terbuka" : ""}`)]),
    h("div", {class: "up-pandu-aksi"},
      h("a", {class: "up-tombol utama", href: gmaps(x.titik, !/Parkir|Turun|dermaga/i.test(x.judul)), target: "_blank", rel: "noopener"}, "🧭 Arahkan"),
      h("button", {type: "button", class: "up-tombol", onclick: () => tandaiTiba(l, x)}, "Sudah sampai"),
      h("button", {type: "button", class: "up-tombol", onclick: () => hentiPandu(l)}, "Hentikan"))));
  document.querySelectorAll(".up-alur li").forEach(li => li.classList.toggle("aktif", li.dataset.no === String(x.no)));
}
function tandaiTiba(l, x) {
  const sudah = bacaSudah(l); if (!sudah.includes(x.no)) sudah.push(x.no); simpanSudah(l, sudah);
  navigator.vibrate?.([200, 100, 200]);
  const lanjut = langkahBerikut(l, sudah);
  toast(`Sudah tiba di ${x.judul.replace(/^Sampai di /, "")}.${lanjut ? " Berikutnya: " + lanjut.judul : " Semua titik tercapai."}`, 6000);
  gambarPandu(l, null, PANDU.pos, x.judul.replace(/^Sampai di /, ""));
}
function mulaiPandu(l) {
  if (!navigator.geolocation) return toast("Peramban ini tidak bisa membaca GPS");
  hentiPandu(); PANDU.l = l;
  const kotak = document.getElementById("pandu"); if (kotak) { kotak.className = "up-pandu hidup"; kotak.replaceChildren(h("p", {}, "📡 Meminta izin dan membaca GPS…")); }
  PANDU.watch = navigator.geolocation.watchPosition(p => {
    const pos = {lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy}; PANDU.pos = pos;
    if (PANDU.l !== l) return;
    const sudah = bacaSudah(l);
    if (!sudah.length) {   // baru mulai jauh dari titik berangkat (sudah di jalan): lompati langkah berangkat
      const b = l.alur.find(x => x.titik); if (b && jarakM(pos.lat, pos.lon, b.titik[0], b.titik[1]) > 2000) { sudah.push(b.no); simpanSudah(l, sudah); }
    }
    const x = langkahBerikut(l, sudah);
    if (x && jarakM(pos.lat, pos.lon, x.titik[0], x.titik[1]) <= radius(x) + Math.min(pos.akurasi, 50)) return tandaiTiba(l, x);
    gambarPandu(l, null, pos);
  }, e => {
    hentiPandu(); toast(e.code === 1 ? "Izin lokasi ditolak. Buka pengaturan peramban, izinkan lokasi untuk situs ini, lalu coba lagi." : "GPS belum terbaca. Coba di tempat terbuka.", 7000);
  }, {enableHighAccuracy: true, maximumAge: 5000, timeout: 30000});
  gambarPandu(l);
}
function hentiPandu(l) {
  if (PANDU.watch != null) navigator.geolocation.clearWatch(PANDU.watch);
  PANDU.watch = null; if (l) gambarPandu(l);
}
window.addEventListener("hashchange", () => { if (PANDU.l && bacaHash().l !== PANDU.l.no) { hentiPandu(); PANDU.l = null; } });

function salin(t) { (navigator.clipboard?.writeText(t) || Promise.reject()).then(() => toast("Koordinat disalin: " + t), () => toast(t)); }

function bagPeta(l) {
  const warna = h("div", {class: "up-warna"}, D.warna.map(([c, a, b]) => h("span", {}, h("i", {class: "sw bg-" + c.slice(1), "aria-hidden": "true"}), h("b", {}, a), ` ${b}`)));
  return h("section", {class: "up-bagian", id: "bg-peta", "aria-labelledby": "jd-peta"},
    kepalaBagian("peta", "Peta lapangan", `Citra ${l.citra.satelit}, ${l.citra.tgl} pukul ${l.citra.jam} WIB. Ketuk titik panas atau penanda untuk membuka Google Maps.`),
    h("figure", {class: "up-peta"}, petaSvg(l.svg.detail), h("figcaption", {html: `<div class="up-legenda">${l.legenda}</div>`})),
    h("div", {class: "up-kartu"}, h("h3", {}, "Cara baca warna citra"), warna,
      h("p", {class: "up-ket"}, "Garis selang dan jalan kaki hanya menunjukkan arah; di lapangan ikuti tanggul atau setapak.")));
}

function bagInfo(l) {
  const a = l.api, c = l.cuaca, r = l.ramalan;
  const ramal = r ? h("div", {class: "up-ramal", role: "list"}, r.tgl.map((t, i) => h("div", {role: "listitem", class: r.hujan[i] >= 10 ? "basah" : ""},
    h("span", {}, new Date(t + "T00:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", timeZone: "Asia/Jakarta"})),
    h("b", {}, r.hujan[i] >= 5 ? "🌧️" : r.hujan[i] >= 1 ? "🌦️" : "☀️"), h("span", {}, `${ang(r.hujan[i])} mm`), h("small", {}, `${r.peluang[i]}%`)))) : null;
  return h("section", {class: "up-bagian", id: "bg-info", "aria-labelledby": "jd-info"},
    kepalaBagian("info", "Informasi lokasi"),
    h("div", {class: "up-kpi tiga"},
      h("div", {}, h("b", {class: "oranye"}, a.n24), h("span", {}, "titik panas 24 jam (5 km)")),
      h("div", {}, h("b", {}, a.n48), h("span", {}, "titik panas 48 jam")),
      h("div", {}, h("b", {}, ang(a.terdekat_km, 1)), h("span", {}, "km titik panas terdekat"))),
    h("div", {class: "up-kartu"}, h("h3", {}, "Api dan cuaca"), kv([
      a.kebakaran && ["Kebakaran terdekat", `${ang(a.kebakaran.km, 1)} km, Kec. ${a.kebakaran.kec || "–"}, sudah ${a.kebakaran.hari || "–"} hari${a.kebakaran.ha ? `, ± ${ang(a.kebakaran.ha)} ha` : ""}`],
      a.kebakaran?.kawasan && ["Kawasan", a.kebakaran.kawasan],
      c && ["Kekeringan gambut (DC)", `${ang(c.dc)}${c.dc > 350 ? ", sangat kering" : ""}`],
      c && ["Suhu, kelembapan, angin", `${ang(c.t, 1)} °C, ${c.rh}%, ${ang(c.ws, 1)} km/jam`]]),
      r ? h("h4", {}, "Prakiraan hujan 7 hari") : null, ramal),
    h("div", {class: "up-kartu"}, h("h3", {}, "Lahan"), kv([
      ["Gambut", `Ya, di peta gambut resmi. ${l.dalam}`], ["Tahun ada api", `${l.tahun_api} dari 14 tahun (2012–2025)`],
      ["Desa", `${l.desa}, Kec. ${l.kec}, ${l.kab}`], ["Kesatuan hidrologis gambut", l.khg],
      ["Sumber air", `${l.air.nama}, ${ang(l.air.m)} m dari petak`]])));
}

function bagPasang(l) {
  const kerja = h("ol", {class: "up-kerja"}, D.kerja.map(([j, t]) => h("li", {}, h("b", {}, j), h("span", {}, t))));
  const kit = h("ul", {class: "up-kit"}, l.kit.map(([b, j, c]) => h("li", {}, h("div", {}, h("b", {}, b), c ? h("span", {}, c) : null), h("em", {}, j))));
  return h("section", {class: "up-bagian", id: "bg-pasang", "aria-labelledby": "jd-pasang"},
    kepalaBagian("pasang", "Pemasangan"),
    h("figure", {class: "up-peta"}, petaSvg(l.svg.tata),
      h("figcaption", {class: "up-ket"}, "Pompa di tepi air, satu jalur selang, Y-pembagi, lalu 4 petak: L1 dan L2 disuntik lance, K1 dan K2 disemprot biasa. Titik panas satelit bisa meleset sampai ± 375 m; pasang petak di tanah yang berasap.")),
    h("div", {class: "up-kartu sorot", html: l.pompa_html}),
    h("div", {class: "up-kartu"}, h("h3", {}, "Hitungan pompa dan selang"), h("div", {class: "up-geser", html: l.hid_html}),
      h("p", {class: "up-ket"}, "Kalkulator SIPPA untuk pompa 1.000–1.300 liter/menit dan selang 2,5 inci. Layak = lolos batas tekanan; tetap dicek di lapangan.")),
    h("div", {class: "up-kartu"}, h("h3", {}, "Topografi pompa ke petak (head)"), h("div", {class: "up-svg putih", html: l.svg.profil}), h("p", {class: "up-ket", html: l.head}), h("p", {class: "up-ket"}, l.topo)),
    h("div", {class: "up-kartu"}, h("h3", {}, "Urutan kerja"), kerja),
    h("div", {class: "up-kartu"}, h("h3", {}, "Barang yang dibawa"), kit,
      h("a", {class: "up-tombol", href: "#" + new URLSearchParams({t: TOK, v: "lampiran"})}, "🧰 Lihat foto dan spesifikasi alat")));
}

function bagTips(l) {
  const daftar = (judul, xs, kls) => h("div", {class: `up-kartu ${kls}`}, h("h3", {}, judul), h("ul", {class: "up-daftar-teks"}, xs.map(x => h("li", {html: x}))));
  return h("section", {class: "up-bagian", id: "bg-tips", "aria-labelledby": "jd-tips"},
    kepalaBagian("tips", "Tips dan tantangan"),
    daftar("💡 Tips lokasi ini", l.tips, "tips"), daftar("⚠️ Tantangan", l.sulit, "sulit"), daftar("✅ Yang memudahkan", l.mudah, "mudah"));
}

/* ---------------------------------------------------------------- laporan */
function ringkasIsi(x) {
  const t = tahapDari(x.tahap), out = [];
  for (const m of t?.medan || []) {
    const v = x.isi[m.nama]; if (v == null) continue;
    if (m.tipe === "suhu") { const s = ringkasSuhu(v); if (s) out.push(`suhu maks ${ang(s.maks, 1)} °C, ${s.dingin} dari ${s.n} titik < 40 °C`); }
    else if (m.tipe === "pilihan") out.push(`${m.label}: ${(m.pilihan.find(([k]) => String(k) === String(v)) || [, v])[1]}`);
    else out.push(`${m.label}: ${ang(v, Number.isInteger(v) ? 0 : 1)} ${m.satuan}`);
  }
  return out.join("; ");
}
function bagLaporan(l) {
  const ls = (LAPOR || []).filter(x => x.lokasi === l.no);
  const ada = new Set(ls.map(x => x.tahap + (x.petak || "")));
  const cek = h("ul", {class: "up-cek"}, TAHAP.filter(t => t.id !== "kendala").map(t => h("li", {},
    h("button", {type: "button", class: "up-cek-tahap", onclick: () => bukaLapor(l, t.id)},
      h("span", {class: "up-cek-ikon", "aria-hidden": "true"}, t.ikon), h("span", {class: "up-cek-nama"}, t.judul),
      t.petak ? h("span", {class: "up-cek-petak"}, PETAK.map(p => h("i", {class: ada.has(t.id + p) ? "ok" : "", title: `${p}: ${ada.has(t.id + p) ? "sudah" : "belum"}`}, p)))
        : h("span", {class: `up-cek-tanda ${ada.has(t.id) ? "ok" : ""}`}, ada.has(t.id) ? "✓ Sudah" : "Belum")))));
  const daftar = ls.length ? h("ul", {class: "up-laporan"}, ls.map(x => {
    const t = tahapDari(x.tahap), img = h("img", {alt: `Foto ${t?.judul || x.tahap}`, loading: "lazy", decoding: "async"});
    if (x.dummy) img.src = `/pipa/uji_pilot/img/${l.id}_s2.jpg`; else ambilKecil(x.id, img);
    return h("li", {},
      h("button", {type: "button", class: "up-lap-foto", onclick: () => lihatFoto(x), "aria-label": "Perbesar foto"}, img),
      h("div", {class: "up-lap-isi"},
        h("div", {class: "up-lap-judul"}, `${t?.ikon || ""} ${t?.judul || x.tahap}${x.petak ? `, petak ${x.petak}` : ""}`, x.dummy ? h("span", {class: "up-chip abu"}, "Contoh") : null),
        h("div", {class: "up-lap-waktu"}, wib(x.diambil), x.exif_waktu ? " (waktu foto)" : " (waktu kirim)"),
        h("div", {class: "up-lap-gps"}, `📍 ${ang(x.jarak_petak_m)} m dari petak, akurasi ±${ang(x.akurasi)} m`, " ", h("a", {href: gtitik([x.lat, x.lon]), target: "_blank", rel: "noopener"}, "peta")),
        ringkasIsi(x) ? h("div", {class: "up-lap-data"}, ringkasIsi(x)) : null,
        x.catatan ? h("div", {class: "up-lap-catatan"}, x.catatan) : null,
        x.gps_curiga ? h("div", {class: "up-lap-curiga"}, "⚠️ Perlu dicek: " + x.gps_curiga) : null,
        h("div", {class: "up-lap-oleh"}, [x.nama, x.regu].filter(Boolean).join(", ") || "Tanpa nama")));
  })) : h("p", {class: "up-kosong-kecil"}, LAPOR == null ? "Memuat laporan…" : adaLapor ? "Belum ada laporan untuk lokasi ini. Ketuk salah satu tahap di atas untuk mulai." : "Laporan belum aktif di server. Hubungi koordinator.");
  return h("section", {class: "up-bagian", id: "bg-laporan", "aria-labelledby": "jd-laporan"},
    kepalaBagian("laporan", "Laporan bukti", "Tiap tahap dibuktikan dengan foto. Lokasi GPS dan waktu foto dicatat otomatis sebagai verifikasi."),
    h("div", {class: "up-kartu"}, h("h3", {}, "Tahap yang harus dibuktikan"), cek),
    daftar);
}
const KECIL = new Map(), ANTRE_KECIL = []; let kecilJalan = 0;
const pengamat = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { pengamat.unobserve(e.target); ANTRE_KECIL.push(e.target); pompaKecil(); } }), {rootMargin: "300px"}) : null;
function ambilKecil(id, img) {   // blob URL disimpan per id (dipakai ulang tiap render, tidak dicabut); diambil saat mendekati layar, paling banyak 3 serentak
  img.dataset.id = id;
  if (KECIL.has(id)) { img.src = KECIL.get(id); return; }
  if (pengamat) pengamat.observe(img); else { ANTRE_KECIL.push(img); pompaKecil(); }
}
async function pompaKecil() {
  while (kecilJalan < 3 && ANTRE_KECIL.length) {
    const img = ANTRE_KECIL.shift(), id = img.dataset.id; kecilJalan++;
    (async () => {
      try { if (!KECIL.has(id)) KECIL.set(id, URL.createObjectURL(await (await api(`/api/uji-pilot/kecil/${id}`)).blob())); img.src = KECIL.get(id); }
      catch (e) { img.alt = "Foto belum bisa dimuat"; }
      finally { kecilJalan--; pompaKecil(); }
    })();
  }
}
async function lihatFoto(x) {
  const d = h("dialog", {class: "up-foto"}, h("button", {type: "button", class: "up-tutup", "aria-label": "Tutup", onclick: () => d.close()}, "✕"));
  const img = h("img", {alt: "Foto bukti"}); d.append(img, h("p", {}, `${wib(x.diambil)}, ${dec(x.lat, 5)}, ${dec(x.lon, 5)}`));
  d.addEventListener("close", () => { if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src); d.remove(); });
  document.body.append(d); d.showModal();
  if (x.dummy) { img.src = `/pipa/uji_pilot/img/${D.lokasi.find(l => l.no === x.lokasi).id}_s2.jpg`; return; }
  try { img.src = URL.createObjectURL(await (await api(`/api/uji-pilot/foto/${x.id}`)).blob()); } catch (e) { toast(e.message); }
}

/* ---------------------------------------------------------------- form lapor */
function bacaExif(buf) {   // salinan public/foto.js: DateTimeOriginal (+ OffsetTimeOriginal) dan GPS dari JPEG
  const v = new DataView(buf); if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
  let o = 2;
  while (o < v.byteLength - 4) { const m = v.getUint16(o), n = v.getUint16(o + 2);
    if (m === 0xffe1 && v.getUint32(o + 4) === 0x45786966) { const t = o + 10, le = v.getUint16(t) === 0x4949;
      const u16 = p => v.getUint16(t + p, le), u32 = p => v.getUint32(t + p, le), ifd = p => { const out = {}, k = u16(p); for (let i = 0; i < k; i++) { const e = p + 2 + i * 12; out[u16(e)] = {tipe: u16(e + 2), n: u32(e + 4), nilai: e + 8}; } return out; };
      const str = e => { const p = e.n > 4 ? u32(e.nilai) : e.nilai; let s = ""; for (let i = 0; i < e.n - 1; i++) s += String.fromCharCode(v.getUint8(t + p + i)); return s; };
      const rat = e => { const p = u32(e.nilai); return [0, 1, 2].map(i => u32(p + i * 8) / (u32(p + i * 8 + 4) || 1)); };
      try {
        const ifd0 = ifd(u32(4)), hasil = {};
        if (ifd0[0x8769]) { const ex = ifd(u32(ifd0[0x8769].nilai)), dt = ex[0x9003] && str(ex[0x9003]), off = ex[0x9011] && str(ex[0x9011]);
          const m2 = dt && dt.match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
          if (m2) { const w = Date.parse(`${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}` + (off && /^[+-]\d\d:\d\d$/.test(off) ? off : "")); if (Number.isFinite(w)) hasil.waktu = w; } }
        if (ifd0[0x8825]) { const g = ifd(u32(ifd0[0x8825].nilai));
          if (g[2] && g[4]) { const dms = a => a[0] + a[1] / 60 + a[2] / 3600, la = dms(rat(g[2])), lo = dms(rat(g[4]));
            const sLa = g[1] ? String.fromCharCode(v.getUint8(g[1].nilai + t)) : "N", sLo = g[3] ? String.fromCharCode(v.getUint8(g[3].nilai + t)) : "E";
            if (la || lo) { hasil.lat = sLa === "S" ? -la : la; hasil.lon = sLo === "W" ? -lo : lo; } } }
        return hasil;
      } catch (e) { return null; } }
    if (m === 0xffda) break; o += 2 + n; }
  return null;
}
const keBlob = (c, tipe, q) => new Promise(r => c.toBlob(r, tipe, q));
let ADA_WEBP = null;   // Safari mengembalikan PNG untuk toBlob webp: periksa sekali, bukan mengode lalu membuang
const tipeFoto = () => ADA_WEBP ??= (() => { const c = document.createElement("canvas"); c.width = c.height = 1; return c.toDataURL("image/webp").startsWith("data:image/webp"); })() ? "image/webp" : "image/jpeg";
function kanvas(src, sisi) {
  const s = Math.min(1, sisi / Math.max(src.width, src.height)), c = document.createElement("canvas");
  c.width = Math.round(src.width * s); c.height = Math.round(src.height * s); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); return c;
}
async function kompres(src, sisi, q) { return keBlob(kanvas(src, sisi), tipeFoto(), q); }
const bacaGPS = () => new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok,
  e => no(new Error(e.code === 1 ? "Izin lokasi ditolak. Buka pengaturan peramban, izinkan lokasi untuk situs ini, lalu ketuk Coba lagi." : "Lokasi belum terbaca. Coba di tempat terbuka.")),
  {enableHighAccuracy: true, timeout: 20000, maximumAge: 0}));
async function ambilGPS() {   // tiga bacaan berurutan: server memeriksa getarannya (anti lokasi palsu, src/gps.js)
  if (!navigator.geolocation) throw new Error("Peramban ini tidak bisa membaca lokasi");
  const s = [];
  for (let i = 0; i < 3; i++) { if (i) await new Promise(r => setTimeout(r, 1000)); const p = await bacaGPS(); s.push([p.coords.latitude, p.coords.longitude, p.coords.accuracy, Date.now()]); }
  const [lat, lon, akurasi, waktu] = s[2]; return {lat, lon, akurasi, waktu, sampel: s};
}
const jarakM = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371e3; };

function medanInput(m, nilai, ubah) {
  if (m.tipe === "pilihan") {
    const g = h("div", {class: "up-seg", role: "radiogroup", "aria-label": m.label});
    for (const [k, t] of m.pilihan) g.append(h("button", {type: "button", role: "radio", "aria-checked": String(String(nilai[m.nama]) === k), onclick: e => {
      g.querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", "false")); e.currentTarget.setAttribute("aria-checked", "true"); ubah(m.nama, k);
    }}, t));
    return h("fieldset", {class: "up-medan"}, h("legend", {}, m.label, m.wajib ? h("span", {class: "wajib"}, " wajib") : null), g);
  }
  if (m.tipe === "suhu") {
    const kisi = h("div", {class: "up-suhu"}, h("span", {}, "Titik"), KEDALAMAN.map(k => h("span", {}, `${k} cm`)));
    for (let t = 1; t <= TITIK; t++) {
      kisi.append(h("b", {}, t));
      KEDALAMAN.forEach((k, i) => kisi.append(h("input", {type: "text", inputmode: "decimal", "aria-label": `Suhu titik ${t} kedalaman ${k} cm`, placeholder: "°C", oninput: e => {
        const s = nilai.suhu || (nilai.suhu = {}), b = s[t] || (s[t] = [null, null, null, null]); b[i] = e.target.value.trim() === "" ? null : e.target.value.replace(",", ".");
        e.target.classList.toggle("panas", Number(b[i]) >= 40);
      }})));
    }
    return h("fieldset", {class: "up-medan"}, h("legend", {}, "Suhu tanah (°C), 5 titik × 4 kedalaman"), h("p", {class: "up-ket"}, "Titik 1 di tengah petak, titik 2–5 di dekat tiap sudut. Merah = 40 °C atau lebih (belum padam). Boleh diisi sebagian."), kisi);
  }
  return h("label", {class: "up-medan"}, h("span", {}, m.label, m.wajib ? h("span", {class: "wajib"}, " wajib") : null),
    h("div", {class: "up-input-satuan"}, h("input", {type: "text", inputmode: m.tipe === "bulat" ? "numeric" : "decimal", value: nilai[m.nama] ?? "", oninput: e => ubah(m.nama, e.target.value)}), h("em", {}, m.satuan)));
}

function bukaLapor(l, tahapAwal) {
  dlg.replaceChildren(h("div", {class: "up-lapor-form"}, h("div", {class: "up-lapor-kop"}, h("div", {}, h("small", {}, `Lokasi ${l.no}`), h("h2", {id: "laporJudul"}, "Lapor bukti")),
    h("button", {type: "button", class: "up-tutup", "aria-label": "Tutup", onclick: () => dlg.close()}, "✕")), h("div", {class: "up-lapor-isi"}, h("p", {class: "up-ket"}, "Menyiapkan formulir…"))));
  dlg.showModal();
  const st = {tahap: tahapAwal || null, petak: null, isi: {}, foto: null, gps: null, gpsGalat: null};
  let pengirim = {}; try { pengirim = JSON.parse(localStorage.getItem(PENGIRIM) || "{}"); } catch (e) {}
  const galat = h("div", {class: "up-galat", role: "alert", hidden: true});
  const gpsBaris = h("button", {type: "button", class: "up-gps", onclick: () => cariGPS()});
  const fotoKotak = h("div", {class: "up-foto-kotak"});
  const medanBox = h("div", {class: "up-medan-box"});
  const catatan = h("textarea", {rows: 3, maxlength: 1000, placeholder: "Tulis kendala, hal penting, atau penjelasan foto"});
  const nama = h("input", {type: "text", maxlength: 60, value: pengirim.nama || "", autocomplete: "name", placeholder: "Nama Anda"});
  const regu = h("input", {type: "text", maxlength: 80, value: pengirim.regu || "", placeholder: "Contoh: Manggala Agni Daops Palangka Raya"});
  const kirim = h("button", {type: "submit", class: "up-tombol utama besar"}, "Kirim laporan");
  const tahapGrid = h("div", {class: "up-tahap", role: "radiogroup", "aria-label": "Tahap"});
  const pilihTahap = id => {
    st.tahap = id; st.petak = null; st.isi = {};
    tahapGrid.querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", String(b.dataset.id === id)));
    medanBox.replaceChildren(h("p", {class: "up-ket"}, "Memuat isian…"));
    tunda(gambarMedan);
  };
  for (const t of TAHAP) tahapGrid.append(h("button", {type: "button", role: "radio", "data-id": t.id, "aria-checked": String(t.id === st.tahap), onclick: () => pilihTahap(t.id)},
    h("span", {"aria-hidden": "true"}, t.ikon), t.judul));
  function gambarMedan() {
    const t = tahapDari(st.tahap); if (!t) { medanBox.replaceChildren(h("p", {class: "up-ket"}, "Pilih tahap yang dilaporkan.")); return; }
    const petak = t.petak ? h("fieldset", {class: "up-medan"}, h("legend", {}, "Petak ", h("span", {class: "wajib"}, "wajib")),
      h("div", {class: "up-seg", role: "radiogroup", "aria-label": "Petak"}, PETAK.map(p => h("button", {type: "button", role: "radio", "aria-checked": String(st.petak === p), onclick: e => {
        e.currentTarget.parentNode.querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", "false")); e.currentTarget.setAttribute("aria-checked", "true"); st.petak = p;
      }}, p, h("small", {}, p[0] === "L" ? "lance" : "semprot"))))) : null;
    medanBox.replaceChildren(h("p", {class: "up-minta"}, "📸 Foto yang diminta: ", h("b", {}, t.foto)), petak, ...t.medan.map(m => medanInput(m, st.isi, (k, v) => { st.isi[k] = v; })));
    catatan.placeholder = t.catatanWajib ? "Wajib: tulis kendalanya" : "Tulis hal penting atau penjelasan foto (boleh kosong)";
  }
  async function cariGPS() {
    gpsBaris.className = "up-gps mencari"; gpsBaris.textContent = "📡 Mencari lokasi GPS…"; st.gpsGalat = null;
    try { st.gps = await ambilGPS(); } catch (e) { st.gps = null; st.gpsGalat = e.message; }
    if (st.gps) { const d = jarakM(st.gps.lat, st.gps.lon, l.petak[0], l.petak[1]);
      gpsBaris.className = "up-gps ok"; gpsBaris.textContent = `📍 Lokasi terbaca ±${ang(st.gps.akurasi)} m, ${d >= 1000 ? ang(d / 1000, 1) + " km" : ang(d) + " m"} dari petak. Ketuk untuk perbarui.`; }
    else { gpsBaris.className = "up-gps gagal"; gpsBaris.textContent = `⚠️ ${st.gpsGalat} Ketuk untuk coba lagi.`; }
  }
  async function olahFoto(f) {
    if (!f) return;
    fotoKotak.replaceChildren(h("p", {class: "up-ket"}, "Menyiapkan foto…"));
    try {
      const exif = /jpe?g$/i.test(f.type) ? bacaExif(await f.slice(0, 256 * 1024).arrayBuffer()) : null;
      if (exif?.waktu && Date.now() - exif.waktu > 48 * JAM) throw new Error("Foto ini lebih tua dari 48 jam. Ambil foto baru.");
      const bmp = await createImageBitmap(f).catch(() => { throw new Error("Format foto tidak terbaca. Ambil langsung dari kamera."); });
      const besar = kanvas(bmp, 1600); bmp.close?.();
      const foto = await keBlob(besar, tipeFoto(), .82), thumb = await kompres(besar, 480, .72);
      if (st.foto?.prev) URL.revokeObjectURL(st.foto.prev);
      st.foto = {foto, thumb, exif, prev: URL.createObjectURL(foto)};
      fotoKotak.replaceChildren(h("img", {src: st.foto.prev, alt: "Pratinjau foto"}),
        h("p", {class: "up-ket"}, exif?.waktu ? `Waktu foto ${wib(exif.waktu)}` : "Waktu foto tidak terbaca; dipakai waktu kirim.", exif?.lat ? ", lokasi foto terbaca." : ""));
    } catch (e) { st.foto = null; fotoKotak.replaceChildren(h("p", {class: "up-galat-teks"}, e.message)); }
  }
  const kamera = h("input", {type: "file", accept: "image/*", capture: "environment", class: "sr", onchange: e => olahFoto(e.target.files[0])});
  const galeri = h("input", {type: "file", accept: "image/jpeg,image/webp,image/heic,image/png", class: "sr", onchange: e => olahFoto(e.target.files[0])});
  const form = h("form", {class: "up-lapor-form", novalidate: true, onsubmit: async e => {
    e.preventDefault(); galat.hidden = true;
    const t = tahapDari(st.tahap), c = cekIsi(st.tahap, t?.petak ? st.petak : null, Object.fromEntries(Object.entries(st.isi).filter(([, v]) => v !== "" && v != null)), catatan.value);
    const salah = [...(t ? c.galat : ["pilih tahap dulu"])];
    if (!st.foto) salah.push("ambil foto bukti dulu");
    if (!st.gps) salah.push("lokasi GPS belum terbaca");
    if (salah.length) { galat.textContent = "Belum bisa dikirim: " + salah.join("; ") + "."; galat.hidden = false; galat.scrollIntoView({block: "center"}); return; }
    try { localStorage.setItem(PENGIRIM, JSON.stringify({nama: nama.value.trim(), regu: regu.value.trim()})); } catch (er) {}
    kirim.disabled = true; kirim.textContent = "Mengirim…";
    try {
      if (Date.now() - st.gps.waktu > 5 * 60e3) { kirim.textContent = "Memperbarui lokasi…"; st.gps = await ambilGPS(); kirim.textContent = "Mengirim…"; }
      const x = new FormData(), set = (k, v) => v != null && v !== "" && x.append(k, v);
      set("lokasi", l.no); set("tahap", st.tahap); set("petak", t.petak ? st.petak : null); set("isi", JSON.stringify(c.isi)); set("catatan", catatan.value.trim());
      set("nama", nama.value.trim()); set("regu", regu.value.trim());
      set("lat", st.gps.lat); set("lon", st.gps.lon); set("akurasi", st.gps.akurasi); set("waktu_gps", st.gps.waktu); set("sampel", JSON.stringify(st.gps.sampel));
      set("zona", Intl.DateTimeFormat().resolvedOptions().timeZone);
      set("exif_waktu", st.foto.exif?.waktu); set("exif_lat", st.foto.exif?.lat); set("exif_lon", st.foto.exif?.lon);
      x.append("foto", st.foto.foto, "foto." + (st.foto.foto.type === "image/webp" ? "webp" : "jpg"));
      x.append("thumb", st.foto.thumb, "kecil." + (st.foto.thumb.type === "image/webp" ? "webp" : "jpg"));
      const j = await (await api("/api/uji-pilot/lapor", {method: "POST", body: x})).json();
      dlg.close(); toast(`Laporan terkirim. ${ang(j.jarak_petak_m)} m dari petak${j.curiga?.length ? ", ditandai untuk dicek" : ""}.`);
      await muatLapor();
    } catch (er) {
      galat.textContent = navigator.onLine ? er.message : "Tidak ada sinyal. Laporan belum terkirim; isian tetap di layar, coba kirim lagi saat ada sinyal.";
      galat.hidden = false; kirim.disabled = false; kirim.textContent = "Kirim laporan";
    }
  }},
    h("div", {class: "up-lapor-kop"}, h("div", {}, h("small", {}, `Lokasi ${l.no}`), h("h2", {id: "laporJudul"}, "Lapor bukti")),
      h("button", {type: "button", class: "up-tutup", "aria-label": "Tutup", onclick: () => dlg.close()}, "✕")),
    h("div", {class: "up-lapor-isi"},
      h("h3", {}, "1. Tahap yang dilaporkan"), tahapGrid, medanBox,
      h("h3", {}, "2. Foto bukti"),
      h("div", {class: "up-foto-aksi"}, h("label", {class: "up-tombol utama besar"}, kamera, "📷 Ambil foto"), h("label", {class: "up-tombol besar"}, galeri, "🖼️ Dari galeri")),
      fotoKotak, gpsBaris,
      h("h3", {}, "3. Catatan dan pelapor"),
      h("label", {class: "up-medan"}, h("span", {}, "Catatan"), catatan),
      h("label", {class: "up-medan"}, h("span", {}, "Nama pelapor"), nama),
      h("label", {class: "up-medan"}, h("span", {}, "Regu"), regu),
      galat),
    h("div", {class: "up-lapor-kaki"}, kirim));
  dlg.addEventListener("close", () => { if (st.foto?.prev) URL.revokeObjectURL(st.foto.prev); }, {once: true});
  tunda(() => { dlg.replaceChildren(form); gambarMedan(); cariGPS(); });
}

/* ---------------------------------------------------------------- lampiran dan panduan */
function layarLampiran() {
  isi.replaceChildren(h("p", {class: "up-ket atas"}, "Spesifikasi kelas kinerja, atau setara. Foto hanya contoh bentuk, bukan merek yang diwajibkan."),
    h("div", {class: "up-alat"}, D.alat.map(a => h("article", {class: "up-kartu alat"},
      a.foto ? h("img", {src: a.foto, alt: a.nama, loading: "lazy", decoding: "async"}) : h("div", {class: "up-svg putih", html: a.svg}),
      h("h3", {}, a.nama), h("p", {class: "up-alat-fungsi"}, a.fungsi), h("ul", {class: "up-daftar-teks"}, a.spek.map(x => h("li", {}, x))),
      h("p", {class: "up-alat-jml"}, h("b", {}, "Jumlah: "), a.jumlah),
      a.kredit ? h("p", {class: "up-kredit"}, "Foto: ", h("a", {href: a.kredit.halaman, target: "_blank", rel: "noopener"}, a.kredit.artis), `, ${a.kredit.lisensi}, Wikimedia Commons`) : null))));
  window.scrollTo(0, 0);
}
function layarPanduan() {
  const kartu = (j, xs, ol) => h("div", {class: "up-kartu"}, h("h3", {}, j), h(ol ? "ol" : "ul", {class: "up-daftar-teks"}, xs.map(x => h("li", {html: x}))));
  isi.replaceChildren(
    kartu("Cara menguji efektivitas", D.uji, true),
    kartu("Keselamatan", D.selamat),
    h("div", {class: "up-kartu", html: "<h3>Cek gambut</h3>" + D.cek_gambut}),
    kartu("Yang perlu diputuskan", D.putus, true));
  window.scrollTo(0, 0);
}

/* ---------------------------------------------------------------- dummy (admin saja, DUMMY.md) */
function pasangDummy() {
  $("#dmIsi").onclick = async e => {
    const b = e.currentTarget, l = bacaHash().l, daftar = l ? [l] : D.lokasi.map(x => x.no); b.disabled = true;
    try { let n = 0; for (const no of daftar) n += (await (await fetch("/api/uji-pilot/dummy", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({aksi: "isi", lokasi: no})})).json()).dibuat || 0;
      toast(n ? `${n} laporan contoh dibuat` : "Contoh sudah ada untuk halaman ini"); await muatLapor(); }
    catch (er) { toast(er.message); } finally { b.disabled = false; }
  };
  $("#dmHapus").onclick = async e => {
    if (!confirm("Hapus SEMUA laporan contoh di 10 lokasi? Laporan asli tidak terhapus.")) return;
    const b = e.currentTarget; b.disabled = true;
    try { const j = await (await fetch("/api/uji-pilot/dummy", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({aksi: "hapus"})})).json();
      toast(`${j.dihapus || 0} laporan contoh dihapus`); await muatLapor(); }
    catch (er) { toast(er.message); } finally { b.disabled = false; }
  };
}

mulai();
