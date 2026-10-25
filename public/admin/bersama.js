/* Helper bersama halaman admin Ruang Koordinasi BNPB (/admin/relawan, alun, riset, meja, pantau, instansi, ...): dimuat SEBELUM skrip halaman oleh halamanBnpb
   (src/admin_halaman.js). Satu salinan supaya perbaikan tidak menyimpang antar halaman (gerbang-inti menolak salinan). */

/* append/prepend/replaceChildren(null) menulis teks "null" ke layar. Satu penyaring di sini untuk SEMUA halaman admin: null, undefined, dan false dibuang. */
for (const P of [Element.prototype, DocumentFragment.prototype]) for (const m of ["append", "prepend", "replaceChildren"]) {
  const asli = P[m];
  P[m] = function (...anak) { return asli.apply(this, anak.filter(x => x != null && x !== false)); };
}

/* Kerangka staf (src/admin_halaman.js menulis data-staf dan data-peran di <body>): admin melihat semua, staf hanya yang diizinkan perannya. */
const BODY = document.body.dataset, PERAN = (BODY.peran || "").split(",").filter(Boolean);
document.addEventListener("click", async e => {
  const k = e.target.closest("[data-staf-keluar]"); if (!k) return;
  k.disabled = true;
  await fetch("/api/staf/keluar", {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: "{}"}).catch(() => null);
  location.href = "/admin/pantau";
});

/* 403 dari API = sesi habis ATAU akun ini tak berhak (mis. akun gerbang situs ke rute moderator). Hanya sesi habis yang dikirim ke halaman masuk:
   GET /admin/masuk dengan sesi sah membalas 303 ke ?ke=, jadi akun yang tak berhak dipantulkan balik ke halaman ini dan halaman memuat ulang tanpa henti. Selalu melempar. */
async function keMasuk() {
  if (BODY.staf === "1") { location.href = "/admin/pantau"; throw new Error("perlu masuk"); }
  const r = await fetch("/admin/masuk", {redirect: "manual", cache: "no-store"}).catch(() => null);
  if (r?.type === "opaqueredirect") throw new Error("akunmu tidak berhak membuka data ini");
  location.href = "/admin/masuk?ke=" + encodeURIComponent(location.pathname);
  throw new Error("perlu masuk");
}

window.Admin = {
  keMasuk,
  esc: s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c])),
  staf: BODY.staf === "1", peran: PERAN,
  /* admin: selalu boleh; staf: bila salah satu perannya ada di daftar */
  boleh: daftar => BODY.staf !== "1" || PERAN.some(p => daftar.includes(p)),
  /* POST JSON -> {ok, status, j}; galat jaringan tidak dilempar ke pemanggil sebagai status palsu. x-pb wajib untuk sesi staf (tidak merugikan admin) */
  async kirim(url, body) {
    const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(body)});
    return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))};
  },
  /* GET JSON; 403 -> keMasuk (sesi habis: halaman masuk; akun tak berhak: galat); 503 = migrasi modul belum dijalankan */
  async ambil(url, nama = "Fitur ini") {
    const r = await fetch(url);
    if (r.status === 403) await keMasuk();
    if (r.status === 503) throw new Error(`${nama} belum diaktifkan (migrasi D1 belum dijalankan)`);
    if (!r.ok) throw new Error(`galat ${r.status}`);
    return r.json();
  },
  /* dua ikon dummy (DUMMY.md) di slot #aksiJudul; hanya Super Admin yang melihatnya */
  pasangDummy(slot, boleh) {
    const t = (aksi, judul, label, ikon) => { const b = document.createElement("button"); b.className = "ad-tombol ad-bulat"; b.dataset.dummy = aksi; b.title = judul; b.setAttribute("aria-label", label); b.textContent = ikon; return b; };
    slot.replaceChildren(...(boleh ? [t("isi", "Isi data dummy untuk halaman ini", "Isi data dummy", "🧪"), t("hapus", "Hapus semua data dummy", "Hapus data dummy", "🧹")] : []));
  },
};
