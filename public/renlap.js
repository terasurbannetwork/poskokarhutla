/* Renlap SIPPA di ponsel, tanpa login (keputusan SIPPA 61). Token di fragmen (#t=<token>&id=<id>), disimpan di localStorage, dikirim lewat header
   x-renlap-token ke GET /api/renlap/data?id=. Bentuk data.json = DATA uji pilot (+ ringkas.judul, wilayah); tampilan mengikuti /pipa/uji_pilot.js
   (kelas up-*; fungsi tampilnya SALINAN ringkas karena uji_pilot.js jalan sendiri saat dimuat), pemetaan murni di /pipa/renlap_tampil.js.
   Gambar: <img> tidak bisa mengirim header, jadi fetch -> blob URL, dilepas saat halaman ditutup. Teks data lewat textContent; HTML dari dossier
   server lewat sisip() yang membuang skrip dan atribut on*. CSP ketat: tanpa gaya sebaris. */
import {bacaFragmen, tautanKoordinat, teksKoordinat} from "/pipa/renlap.js";
import {modelRenlap, jalurGambar, namaGambar, urlBoleh} from "/pipa/renlap_tampil.js";

const $ = s => document.querySelector(s), isi = $("#isi");
const SIMPAN = "rlTok", SIMPAN_ID = "rlId";
let TOK = null, ID = null, M = null;
const ang = (x, n = 0) => x == null || Number.isNaN(Number(x)) ? "–" : Number(x).toLocaleString("id-ID", {minimumFractionDigits: n, maximumFractionDigits: n});
function h(tag, a = {}, ...anak) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(a)) { if (v == null || v === false) continue; if (k === "class") el.className = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? "" : v); }
  for (const c of anak.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
function toast(t) { const x = $("#toast"); x.textContent = t; x.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { x.hidden = true; }, 3500); }
function kosong(judul, teks, ulang) {
  isi.replaceChildren(h("section", {class: "up-kosong"}, h("h2", {}, judul), h("p", {}, teks), ulang ? h("button", {class: "up-tombol utama", type: "button", onclick: () => location.reload()}, "Coba lagi") : null));
}

/* ---------------------------------------------------------------- HTML dossier dan gambar bertoken */
const BUANG = "script,iframe,object,embed,link,meta,base,form,foreignObject,style,template,noscript,portal,animate,set,animateMotion,animateTransform";
/* atribut URL: daftar izin (https, http, img/, #), dinilai sesudah karakter kontrol dan spasi dibuang (java&#9;script: dsb.) */
const ATR_URL = new Set(["href", "xlink:href", "src", "action", "formaction", "srcset", "poster", "data"]);
const blobGambar = new Map(), antreGambar = []; let gambarJalan = 0;
async function pompaGambar() {
  while (gambarJalan < 3 && antreGambar.length) {
    const {nama, pasang, galat} = antreGambar.shift(); gambarJalan++;
    (async () => {
      try {
        if (!blobGambar.has(nama)) { const r = await fetch(jalurGambar(ID, "img/" + nama), {headers: {"x-renlap-token": TOK}}); if (!r.ok) throw new Error(String(r.status)); blobGambar.set(nama, URL.createObjectURL(await r.blob())); }
        pasang(blobGambar.get(nama));
      } catch { galat(); } finally { gambarJalan--; pompaGambar(); }
    })();
  }
}
const mintaGambar = (nama, pasang, galat) => { if (blobGambar.has(nama)) return pasang(blobGambar.get(nama)); antreGambar.push({nama, pasang, galat}); pompaGambar(); };
addEventListener("pagehide", () => { for (const u of blobGambar.values()) URL.revokeObjectURL(u); blobGambar.clear(); });

/* gambar img/<nama> di dalam HTML/SVG data: alamat relatif dicabut seketika (supaya tidak meminta /img/... ke server), diisi blob setelah terambil */
function pasangGambarDi(akar) {
  for (const el of akar.querySelectorAll('[href^="img/"],[src^="img/"],[href^="./img/"],[src^="./img/"]')) {
    const atr = el.hasAttribute("src") ? "src" : "href", nama = namaGambar(el.getAttribute(atr));
    el.removeAttribute(atr); el.classList.add("rl-muat");
    if (!nama) continue;
    mintaGambar(nama, u => { el.setAttribute(atr, u); el.classList.remove("rl-muat"); }, () => el.classList.add("rl-gagal"));
  }
}
function sisip(wadah, html) {
  const dok = new DOMParser().parseFromString(String(html ?? ""), "text/html");
  dok.querySelectorAll(BUANG).forEach(e => e.remove());
  for (const e of dok.body.querySelectorAll("*")) {
    for (const a of [...e.attributes]) { const n = a.name.toLowerCase(); if (n.startsWith("on") || n === "style" || n === "srcdoc" || (ATR_URL.has(n) && !urlBoleh(a.value))) e.removeAttribute(a.name); }
    if (e.localName === "a") { e.setAttribute("rel", "noopener noreferrer"); e.setAttribute("target", "_blank"); }
  }
  pasangGambarDi(dok.body);
  wadah.append(...dok.body.childNodes); return wadah;
}
const htmlDiv = (kls, html) => sisip(h("div", {class: kls}), html);
function gambarBertoken(src, alt) {
  const img = h("img", {alt: alt + " (memuat)", class: "rl-muat", decoding: "async"}), nama = namaGambar(src);
  if (nama) mintaGambar(nama, u => { img.src = u; img.alt = alt; img.classList.remove("rl-muat"); }, () => { img.alt = alt + " (foto belum bisa dimuat)"; img.classList.add("rl-gagal"); });
  return img;
}

/* ---------------------------------------------------------------- rute (riwayat peramban, fragmen dibiarkan utuh) */
const ke = v => { history.pushState({v}, ""); tampil(); };
addEventListener("popstate", () => tampil());
const keadaan = () => history.state?.v || {};

function tampil() {
  const v = keadaan(), kop = (sup, judul, kembali) => { $("#kopSup").textContent = sup; $("#kopJudul").textContent = judul; const k = $("#kembali"); k.hidden = !kembali; k.onclick = kembali; };
  const balik = () => history.back();
  if (v.v === "lampiran") { kop("LAMPIRAN", "Peralatan", balik); return layarLampiran(); }
  if (v.v === "panduan") { kop("SEMUA LOKASI", "Panduan", balik); return layarPanduan(); }
  const l = v.l && M.lokasi.find(x => x.no === v.l);
  if (l) { kop(`LOKASI ${l.no} DARI ${M.lokasi.length}`, l.nama, balik); return layarLokasi(l); }
  kop(M.wilayah || "BNPB SIPPA", M.judul, null); layarBeranda();
}

/* ---------------------------------------------------------------- beranda */
function kartuLokasi(l) {
  return h("a", {class: `up-lok ${l.bagian}`, href: "#", onclick: e => { e.preventDefault(); ke({l: l.no}); }},
    h("div", {class: "up-lok-no", "aria-hidden": "true"}, l.no),
    h("div", {class: "up-lok-isi"}, h("div", {class: "up-lok-nama"}, l.nama), h("div", {class: "up-lok-uji"}, l.uji),
      h("div", {class: "up-chips"}, h("span", {class: "up-chip"}, `± ${ang(l.menit)} menit`), l.selang ? h("span", {class: "up-chip"}, `selang ${ang(l.selang.m)} m`) : null)),
    h("span", {class: "up-panah", "aria-hidden": "true"}, "›"));
}
const tautBahan = (ikon, judul, ket, v) => h("a", {class: "up-lok bahan", href: "#", onclick: e => { e.preventDefault(); ke({v}); }}, h("div", {class: "up-lok-no", "aria-hidden": "true"}, ikon),
  h("div", {class: "up-lok-isi"}, h("div", {class: "up-lok-nama"}, judul), h("div", {class: "up-lok-uji"}, ket)), h("span", {class: "up-panah", "aria-hidden": "true"}, "›"));
function layarBeranda() {
  const A = M.lokasi.filter(l => l.bagian === "pendek"), B = M.lokasi.filter(l => l.bagian === "panjang");
  const bag = (tanda, judul, xs) => xs.length ? [h("h3", {class: "up-bag"}, h("span", {class: `up-bag-tanda ${tanda.toLowerCase()}`}, tanda), judul), h("div", {class: "up-daftar"}, xs.map(kartuLokasi))] : [];
  isi.replaceChildren(
    h("section", {class: "up-sambut"}, M.acuan ? h("p", {class: "up-sambut-per"}, `Data per ${M.acuan}`) : null, h("h2", {}, "Pilih lokasi"),
      h("p", {}, "Tiap lokasi berisi alur perjalanan dengan navigasi Google Maps, peta lapangan, cara pasang pompa dan selang, serta tips. Jarak dan waktu adalah estimasi model dari data satelit dan OSM; ukur ulang di lapangan.")),
    bag("A", "Selang pendek, pompa dekat api", A), bag("B", "Selang panjang, pompa di tepi jalan", B),
    h("h3", {class: "up-bag"}, "Bahan bersama"),
    h("div", {class: "up-daftar"}, tautBahan("🧰", "Lampiran peralatan", `${M.alat.length} alat, foto dan spesifikasi`, "lampiran"), tautBahan("📋", "Panduan dan keselamatan", "Cara uji, cek gambut, keselamatan", "panduan")));
  window.scrollTo(0, 0);
}

/* ---------------------------------------------------------------- lokasi */
const kepala = (judul, sub) => h("header", {class: "up-kb"}, h("h2", {}, judul), sub ? h("p", {}, sub) : null);
const kv = baris => h("dl", {class: "up-kv"}, baris.filter(Boolean).map(([k, v]) => [h("dt", {}, k), h("dd", {}, v)]));
const daftarTeksHtml = xs => h("ul", {class: "up-daftar-teks"}, xs.map(x => sisip(h("li"), x)));
function salin(t) { (navigator.clipboard?.writeText(t) || Promise.reject()).then(() => toast("Koordinat disalin: " + t), () => toast(t)); }
const peta = (svg, kls = "") => sisip(h("div", {class: `up-svg ${kls}`}), svg);

function layarLokasi(l) {
  const langkah = l.alur.map(x => h("li", {class: x.titik ? "bertitik" : "", "data-no": x.no},
    h("span", {class: `up-no ${x.titik ? "bg-" + String(x.warna || "#334155").slice(1) : "garis"}`, "aria-hidden": "true"}, x.no),
    h("div", {class: "up-langkah"}, h("b", {}, x.judul), x.ket ? h("span", {}, " " + x.ket) : null,
      x.titik ? h("div", {class: "up-langkah-aksi"},
        h("a", {class: "up-tombol kecil utama", href: x.arah, target: "_blank", rel: "noopener noreferrer"}, "🧭 Arahkan"),
        h("a", {class: "up-tombol kecil", href: tautanKoordinat(x.titik[0], x.titik[1]), target: "_blank", rel: "noopener noreferrer"}, "📍 Lihat titik"),
        h("button", {class: "up-tombol kecil", type: "button", onclick: () => salin(teksKoordinat(x.titik[0], x.titik[1]))}, teksKoordinat(x.titik[0], x.titik[1]))) : null)));
  const navigasi = h("section", {class: "up-bagian"}, kepala("Alur perjalanan", `± ${ang(l.menit)} menit${l.dari ? ` dari ${l.dari}` : ""} sampai petak.`),
    l.rute ? h("a", {class: "up-tombol utama besar penuh", href: l.rute, target: "_blank", rel: "noopener noreferrer"}, `🗺️ Buka rute lengkap di Google Maps (${l.alur.filter(x => x.titik).length} titik)`) : null,
    h("p", {class: "up-ket"}, "Google Maps membuka semua titik sebagai perhentian berurutan. Ruas terakhir ke pompa dan petak biasanya jalan kaki."),
    h("ol", {class: "up-alur"}, langkah), l.rute_catatan ? sisip(h("p", {class: "up-catat"}), l.rute_catatan) : null,
    l.svg.rute ? h("figure", {class: "up-peta"}, peta(l.svg.rute), l.legenda_rute ? h("figcaption", {}, htmlDiv("up-legenda", l.legenda_rute)) : null) : null,
    l.svg.profil_jalan ? h("details", {class: "up-lipat"}, h("summary", {}, "Naik-turun jalur jalan kaki"), peta(l.svg.profil_jalan, "putih")) : null);
  const petaB = h("section", {class: "up-bagian"}, kepala("Peta lapangan", l.citra ? `Citra ${l.citra.satelit}${l.citra.tgl ? ", " + l.citra.tgl : ""}${l.citra.jam ? " pukul " + l.citra.jam + " WIB" : ""}.` : null),
    l.svg.detail ? h("figure", {class: "up-peta"}, peta(l.svg.detail), l.legenda ? h("figcaption", {}, htmlDiv("up-legenda", l.legenda)) : null) : null,
    M.warna.length ? h("div", {class: "up-kartu"}, h("h3", {}, "Cara baca warna citra"), h("div", {class: "up-warna"}, M.warna.map(([c, a, b]) => h("span", {}, h("i", {class: "sw bg-" + String(c).slice(1), "aria-hidden": "true"}, ""), h("b", {}, a), ` ${b}`)))) : null);
  const a = l.api, c = l.cuaca;
  const info = h("section", {class: "up-bagian"}, kepala("Informasi lokasi"),
    a ? h("div", {class: "up-kpi tiga"}, h("div", {}, h("b", {class: "oranye"}, ang(a.n24)), h("span", {}, "titik panas 24 jam (5 km)")), h("div", {}, h("b", {}, ang(a.n48)), h("span", {}, "titik panas 48 jam")),
      h("div", {}, h("b", {}, ang(a.terdekat_km, 1)), h("span", {}, "km titik panas terdekat"))) : null,
    h("div", {class: "up-kartu"}, h("h3", {}, "Lahan dan sekitar"), kv([
      l.desa && ["Desa", `${l.desa}, Kec. ${l.kec}, ${l.kab}`], l.air && ["Sumber air", `${l.air.nama}, ${ang(l.air.m)} m dari petak`],
      c && ["Suhu, kelembapan, angin", `${ang(c.t, 1)} °C, ${c.rh}%, ${ang(c.ws, 1)} km/jam`], a?.kebakaran && ["Kebakaran terdekat", `${ang(a.kebakaran.km, 1)} km, Kec. ${a.kebakaran.kec || "–"}`]])));
  const pasang = h("section", {class: "up-bagian"}, kepala("Pemasangan"),
    l.svg.tata ? h("figure", {class: "up-peta"}, peta(l.svg.tata)) : null,
    l.pompa_html ? htmlDiv("up-kartu sorot", l.pompa_html) : null,
    l.hid_html ? h("div", {class: "up-kartu"}, h("h3", {}, "Hitungan pompa dan selang"), htmlDiv("up-geser", l.hid_html)) : null,
    l.svg.profil ? h("div", {class: "up-kartu"}, h("h3", {}, "Topografi pompa ke petak (head)"), peta(l.svg.profil, "putih"), l.head ? sisip(h("p", {class: "up-ket"}), l.head) : null, l.topo ? h("p", {class: "up-ket"}, l.topo) : null) : null,
    M.kerja.length ? h("div", {class: "up-kartu"}, h("h3", {}, "Urutan kerja"), h("ol", {class: "up-kerja"}, M.kerja.map(([j, t]) => h("li", {}, h("b", {}, j), h("span", {}, t))))) : null,
    l.kit.length ? h("div", {class: "up-kartu"}, h("h3", {}, "Barang yang dibawa"), h("ul", {class: "up-kit"}, l.kit.map(([b, j, c2]) => h("li", {}, h("div", {}, h("b", {}, b), c2 ? h("span", {}, c2) : null), h("em", {}, j))))) : null);
  const dft = (judul, xs, kls) => xs.length ? h("div", {class: `up-kartu ${kls}`}, h("h3", {}, judul), daftarTeksHtml(xs)) : null;
  const tips = h("section", {class: "up-bagian"}, kepala("Tips dan tantangan"), dft("💡 Tips lokasi ini", l.tips, "tips"), dft("⚠️ Tantangan", l.sulit, "sulit"), dft("✅ Yang memudahkan", l.mudah, "mudah"));
  isi.replaceChildren(h("section", {class: `up-hero ${l.bagian}`}, h("div", {class: "up-hero-atas"}, h("span", {class: "up-hero-no"}, l.no), l.status ? h("span", {class: "up-chip abu"}, l.status) : null),
    h("p", {class: "up-hero-untuk"}, h("span", {}, "Untuk"), l.uji), l.peran ? h("p", {class: "up-hero-peran"}, l.peran) : null,
    l.arahParkir ? h("div", {class: "up-hero-aksi"}, h("a", {class: "up-tombol utama besar", href: l.arahParkir, target: "_blank", rel: "noopener noreferrer"}, "🧭 Arahkan ke ", l.ujung === "perahu" ? "dermaga" : "titik parkir")) : null),
    navigasi, petaB, info, pasang, tips);
  window.scrollTo(0, 0);
}

function layarLampiran() {
  isi.replaceChildren(h("p", {class: "up-ket atas"}, "Spesifikasi kelas kinerja, atau setara. Foto hanya contoh bentuk, bukan merek yang diwajibkan."),
    h("div", {class: "up-alat"}, M.alat.map(a => h("article", {class: "up-kartu alat"}, a.foto ? gambarBertoken(a.foto, a.nama) : a.svg ? htmlDiv("up-svg putih", a.svg) : null,
      h("h3", {}, a.nama), h("p", {class: "up-alat-fungsi"}, a.fungsi), h("ul", {class: "up-daftar-teks"}, (a.spek || []).map(x => h("li", {}, x))), h("p", {class: "up-alat-jml"}, h("b", {}, "Jumlah: "), a.jumlah),
      a.kredit ? h("p", {class: "up-kredit"}, "Foto: ", h("a", {href: a.kredit.halaman, target: "_blank", rel: "noopener noreferrer"}, a.kredit.artis), `, ${a.kredit.lisensi}, Wikimedia Commons`) : null))));
  window.scrollTo(0, 0);
}
function layarPanduan() {
  const P = M.panduan, kartu = (j, xs, ol) => xs.length ? h("div", {class: "up-kartu"}, h("h3", {}, j), h(ol ? "ol" : "ul", {class: "up-daftar-teks"}, xs.map(x => sisip(h("li"), x)))) : null;
  isi.replaceChildren(kartu("Cara menguji efektivitas", P.uji, true), kartu("Keselamatan", P.selamat), P.cek_gambut ? sisip(h("div", {class: "up-kartu"}, h("h3", {}, "Cek gambut")), P.cek_gambut) : null, kartu("Yang perlu diputuskan", P.putus, true));
  window.scrollTo(0, 0);
}

/* ---------------------------------------------------------------- awal */
async function mulai() {
  const f = bacaFragmen(location.hash);
  TOK = f.token; ID = f.id;
  try { if (TOK) localStorage.setItem(SIMPAN, TOK); else TOK = localStorage.getItem(SIMPAN); if (ID) localStorage.setItem(SIMPAN_ID, ID); else ID = localStorage.getItem(SIMPAN_ID); } catch { /* penyimpanan dimatikan: pakai fragmen saja */ }
  if (!TOK || !ID) return kosong("Tautan belum lengkap", "Buka halaman ini dari tautan renlap yang dibagikan. Tautan berisi kode akses setelah tanda #.");
  let d;
  try {
    const r = await fetch(`/api/renlap/data?id=${encodeURIComponent(ID)}`, {headers: {"x-renlap-token": TOK}});
    if (!r.ok) { if (r.status === 403 || r.status === 401) { try { localStorage.removeItem(SIMPAN); } catch { /* abaikan */ } return kosong("Tautan tidak berlaku", "Minta tautan baru ke petugas yang membuat renlap."); } if (r.status === 404) return kosong("Renlap tidak ditemukan", "Renlap ini sudah dihapus atau tautannya salah."); if (r.status === 409) return kosong("Renlap sedang dibuat", "Buka lagi beberapa menit.", true); if (r.status === 429) return kosong("Terlalu banyak percobaan", "Tunggu beberapa menit lalu buka lagi dari tautan yang benar."); throw new Error(`Galat ${r.status}`); }
    d = await r.json();
  } catch { return kosong("Data belum bisa dimuat", navigator.onLine ? "Server belum menjawab. Coba lagi sebentar lagi." : "Ponsel sedang tanpa sinyal. Coba lagi saat ada sinyal.", true); }
  M = modelRenlap(d, ID);
  if (!M) return kosong("Isi renlap belum bisa dibaca", "Bentuk data tidak dikenali. Minta petugas membuat ulang renlap.");
  if (!location.hash) history.replaceState(null, "", "#" + new URLSearchParams({t: TOK, id: ID}));
  tampil();
}
mulai();
