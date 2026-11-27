/* /lapor/hilang: daftar profil orang hilang yang sudah diperiksa petugas (orang-hilang-publik OH-09, D30).
   Dua saringan (kab/kota, umur) dikirim ke GET /api/lapor/hilang; 20 profil per muat, kursor dari server. Tanpa rute "semua".
   API 404 (bendera OH_PUBLIK mati) = "Belum ada profil yang ditampilkan", bukan galat. Teks data lewat textContent. */
import {el, kartuProfil, nanti} from "/lapor/hilang_kartu.js?v=1";

const $ = id => document.getElementById(id);
let kursor = null, urutan = 0, kabKode = "", kabPeta = null;

function kosong(judul, teks) { const k = el("div", "oh-kosong"); k.append(el("b", null, judul), el("span", null, teks)); $("daftar").replaceChildren(k); $("lagi").hidden = true; }
const parameter = () => { const q = new URLSearchParams(); if (kabKode) q.set("kab", kabKode); const u = $("qUmur").value.trim(); if (/^\d{1,3}$/.test(u) && +u <= 120) q.set("umur", u); if (kursor) q.set("kursor", kursor); return q; };

async function muat(tambah) {
  const saya = ++urutan; $("daftar").setAttribute("aria-busy", "true"); $("lagi").disabled = true;
  if (!tambah) kursor = null;
  try {
    const r = await fetch(`/api/lapor/hilang?${parameter()}`, {headers: {accept: "application/json"}, credentials: "same-origin", signal: AbortSignal.timeout(20000)});
    if (saya !== urutan) return;
    if (r.status === 404) { kosong("Belum ada profil yang ditampilkan", "Halaman ini belum dibuka atau belum ada profil yang sudah diperiksa petugas."); $("status").textContent = "Belum ada profil yang ditampilkan."; return; }
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json(), profil = Array.isArray(d.profil) ? d.profil : [];
    kursor = d.kursor || null;
    if (!tambah && !profil.length) { kosong("Belum ada profil yang ditampilkan", "Belum ada profil yang cocok dengan saringan ini. Ini tidak berarti tidak ada yang dicari."); $("status").textContent = "Belum ada profil yang ditampilkan."; return; }
    const kartu = profil.map(p => kartuProfil(p, {tautan: true, aksi: true}));
    if (tambah) $("daftar").append(...kartu); else $("daftar").replaceChildren(...kartu);
    $("lagi").hidden = !kursor; $("status").textContent = `${$("daftar").children.length} profil ditampilkan.`;
  } catch {
    if (saya === urutan) { kosong("Data belum bisa dimuat", "Periksa sambungan, lalu coba lagi."); $("status").textContent = "Data belum bisa dimuat."; }
  } finally { if (saya === urutan) { $("daftar").setAttribute("aria-busy", "false"); $("lagi").disabled = false; } }
}

/* daftar kab/kota dimuat hanya saat kolomnya dipakai (berkas 3 MB), lalu dipasang ke <datalist> bawaan */
let kabJanji = null;
function muatKab() {
  return kabJanji ??= fetch("/data/desa_cari.json", {signal: AbortSignal.timeout(30000)}).then(r => r.json()).then(d => {
    const dl = $("dKab"), fr = document.createDocumentFragment(); kabPeta = new Map();
    for (const [k, n] of Object.entries(d.kab || {})) { kabPeta.set(n.toLowerCase(), k); fr.append(Object.assign(el("option"), {value: n})); }
    dl.append(fr);
  }).catch(() => { kabJanji = null; });
}
async function pilihKab() {
  await muatKab();
  const nama = $("qKab").value.trim().toLowerCase(), k = kabPeta?.get(nama) || "";
  if (k !== kabKode && (k || !nama)) { kabKode = k; muat(false); }
}
(window.requestIdleCallback || setTimeout)(muatKab);   // prefetch saat idle, bukan saat fokus
$("qKab").addEventListener("input", () => nanti(pilihKab));
let tunda = 0;
$("qUmur").addEventListener("input", () => { clearTimeout(tunda); tunda = setTimeout(() => muat(false), 500); });
$("saring").addEventListener("submit", e => { e.preventDefault(); muat(false); });
$("lagi").addEventListener("click", () => { $("lagi").disabled = true; muat(true); });
muat(false);
