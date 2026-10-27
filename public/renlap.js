/* Renlap SIPPA di ponsel, tanpa login (keputusan SIPPA 61, pola uji_pilot.js). Token di fragmen (#t=<token>&id=<id>), disimpan di localStorage,
   dikirim lewat header x-renlap-token ke GET /api/renlap/data?id=. Semua teks data lewat textContent (tanpa HTML mentah). CSP ketat: tanpa gaya sebaris.
   Bentuk jawaban yang dipakai (dibaca longgar, bidang yang tidak ada dilewati): {renlap:{id, waktu, prov}, kompleks:[{id, kab, lat, lon, zona, air_km, jalan_km, saran, catatan}]}. */
import {bacaFragmen, tautanKoordinat, teksKoordinat} from "/pipa/renlap.js";

const $ = s => document.querySelector(s), isi = $("#isi");
const SIMPAN = "rlTok", SIMPAN_ID = "rlId";
const ang = (x, n = 1) => x == null || Number.isNaN(Number(x)) ? "–" : Number(x).toLocaleString("id-ID", {minimumFractionDigits: 0, maximumFractionDigits: n});
const wib = ms => new Date(ms).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}) + " WIB";
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
const baris = (label, nilai) => nilai == null || nilai === "" ? null : h("div", {class: "rl-baris"}, h("span", {}, label), h("span", {}, nilai));

function kartu(k) {
  const aksi = [];
  if (Number.isFinite(Number(k.lat)) && Number.isFinite(Number(k.lon))) {
    aksi.push(h("a", {class: "up-tombol", href: tautanKoordinat(k.lat, k.lon), target: "_blank", rel: "noopener noreferrer"}, "Buka di peta"));
    aksi.push(h("button", {class: "up-tombol", type: "button", onclick: async () => { try { await navigator.clipboard.writeText(teksKoordinat(k.lat, k.lon)); toast("Koordinat disalin."); } catch { toast("Koordinat: " + teksKoordinat(k.lat, k.lon)); } }}, "Salin koordinat"));
  }
  return h("article", {class: "rl-kartu"}, h("h2", {}, `Kompleks ${k.id ?? "–"}`),
    baris("Kabupaten", k.kab), baris("Zona", k.zona), baris("Jarak air", k.air_km == null ? null : `${ang(k.air_km)} km`), baris("Jarak jalan", k.jalan_km == null ? null : `${ang(k.jalan_km)} km`),
    baris("Koordinat", Number.isFinite(Number(k.lat)) && Number.isFinite(Number(k.lon)) ? teksKoordinat(k.lat, k.lon) : null), baris("Saran sarana", k.saran), k.catatan ? h("p", {class: "rl-catat"}, k.catatan) : null,
    aksi.length ? h("div", {class: "rl-aksi"}, aksi) : null);
}

async function mulai() {
  const f = bacaFragmen(location.hash);
  let token = f.token, id = f.id;
  try { if (token) localStorage.setItem(SIMPAN, token); else token = localStorage.getItem(SIMPAN); if (id) localStorage.setItem(SIMPAN_ID, id); else id = localStorage.getItem(SIMPAN_ID); } catch { /* penyimpanan dimatikan: pakai fragmen saja */ }
  if (!token || !id) return kosong("Tautan belum lengkap", "Buka halaman ini dari tautan renlap yang dibagikan. Tautan berisi kode akses setelah tanda #.");
  let d;
  try {
    const r = await fetch(`/api/renlap/data?id=${encodeURIComponent(id)}`, {headers: {"x-renlap-token": token}});
    if (!r.ok) { if (r.status === 403 || r.status === 401) { try { localStorage.removeItem(SIMPAN); } catch { /* abaikan */ } return kosong("Tautan tidak berlaku", "Minta tautan baru ke petugas yang membuat renlap."); } if (r.status === 404) return kosong("Renlap tidak ditemukan", "Renlap ini sudah dihapus atau tautannya salah."); if (r.status === 409) return kosong("Renlap sedang dibuat", "Coba lagi beberapa saat lagi.", true); if (r.status === 429) return kosong("Terlalu banyak percobaan", "Tunggu beberapa menit lalu buka lagi dari tautan yang benar."); throw new Error(`Galat ${r.status}`); }
    d = await r.json();
  } catch (e) { return kosong("Data belum bisa dimuat", navigator.onLine ? "Server belum menjawab. Coba lagi sebentar lagi." : "Ponsel sedang tanpa sinyal. Coba lagi saat ada sinyal.", true); }
  if (!location.hash) history.replaceState(null, "", "#" + new URLSearchParams({t: token, id}));
  const ks = Array.isArray(d.kompleks) ? d.kompleks : [];
  $("#kopJudul").textContent = d.renlap?.id ? "Renlap SIPPA" : "Renlap";
  isi.replaceChildren(
    h("p", {class: "rl-catat"}, `${ks.length} kompleks${d.renlap?.waktu ? `, dibuat ${wib(d.renlap.waktu)}` : ""}${d.renlap?.prov ? `, provinsi ${d.renlap.prov}` : ""}. Jarak adalah estimasi model dari data satelit dan OSM; ukur ulang di lapangan.`),
    ...(ks.length ? ks.map(kartu) : [h("p", {class: "up-kosong"}, "Renlap ini belum memuat kompleks.")]));
}
mulai();
