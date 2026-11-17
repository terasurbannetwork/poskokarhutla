/* Kunci API mitra (/admin/kunci-api): terbitkan kunci bercakupan, salin SEKALI, lihat daftar, cabut. Data: /api/kunci-api/admin/{buat,daftar,cabut/:id} (src/api_v1.js).
   Gaya dari akun.css (ak-*) + kit dashboard (Admin.dasbor). CSP admin: tanpa skrip/gaya inline; teks dari data lewat textContent. */
(() => {
  const app = Admin.dasbor.tumpuk(document.getElementById("app"));
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const angka = n => Number(n ?? 0).toLocaleString("id-ID");
  const tgl = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}) : "belum pernah";
  const LABEL = {rumah_rusak: "Rumah rusak", bangunan: "Bangunan (Open Buildings)", laporan_bnpb: "Laporan BNPB", konsesi: "Konsesi perusahaan"};
  const gagalJaringan = {ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}};
  let D = null, baru = null;

  const DB = Admin.dasbor;
  function gambar() {
    const aktif = D.kunci.filter(k => !k.dicabut).length;
    const f = !D.bisa_buat ? h("p", {class: "ak-redup", teks: "Menerbitkan kunci butuh akun Super Admin: akun Anda harus tercantum di secret SUPER_ADMIN (awalan hash token, dipisah koma) pada worker. Daftar dan pencabutan tetap bisa dari akun ini."})
      : h("form", {class: "ak-form", "data-buat": "1"},
      h("div", {class: "ak-grid"}, h("label", null, "Nama pemegang", h("input", {name: "nama", required: true, minlength: "3", maxlength: "80", placeholder: "Nama lembaga atau aplikasi", autocomplete: "off"}))),
      h("fieldset", {class: "ak-peran"}, h("legend", {teks: "Data yang boleh dibaca"}),
        ...D.cakupan.map(k => h("label", {class: "ak-cek"}, h("input", {type: "checkbox", name: "cakupan", value: k}), LABEL[k] || k))),
      h("p", {class: "ak-galat", role: "alert"}), h("button", {class: "ak-btn utama", type: "submit"}, "Terbitkan kunci"));
    const baris = D.kunci.map(k => { const hidup = !k.dicabut; return h("tr", {"data-id": k.id, class: hidup ? "" : "redup"},
      h("td", null, h("b", {teks: k.nama}), h("small", {teks: k.id})),
      h("td", null, DB.lipat(`${angka(k.cakupan.length)} data`, ...k.cakupan.map(c => h("span", {class: "ak-pil akses", teks: LABEL[c] || c})))),
      h("td", null, h("span", {class: "ak-pil " + (hidup ? "aktif" : "dicabut"), teks: hidup ? "Aktif" : "Dicabut"}), k.dicabut_oleh ? h("small", {teks: "Dicabut oleh " + k.dicabut_oleh}) : null, h("small", {teks: "Dibuat " + tgl(k.dibuat)}), h("small", {teks: "Terakhir dipakai: " + tgl(k.terakhir)})),
      h("td", null, hidup ? DB.aksi(DB.ikon("cabut", "Cabut kunci " + k.nama, {"data-cabut": "1"}, "bahaya")) : null)); });
    app.replaceChildren(
      baru ? h("div", {class: "ak-rahasia-kotak", role: "status"}, h("p", {teks: `Kunci untuk ${baru.nama}. Tampil sekali; salin dan serahkan langsung. Setelah halaman ini ditutup, kunci tidak bisa dilihat lagi.`}),
        h("code", {class: "ak-rahasia", teks: baru.kunci}), h("div", {class: "ak-aksi"}, h("button", {class: "ak-btn", type: "button", "data-salin": "1"}, "Salin kunci"))) : null,
      DB.ubinGrid(DB.ubin({ikon: "kunci", label: "Kunci terbit", nilai: angka(D.kunci.length), ket: "semua kunci"}), DB.ubin({ikon: "aktif", label: "Aktif", nilai: angka(aktif), ket: "bisa dipakai"}),
        DB.ubin({ikon: "cabut", label: "Dicabut", nilai: angka(D.kunci.length - aktif), ket: "tidak berlaku"})),
      DB.kartu({ikon: "kunci", judul: "Terbitkan kunci", ey: "Kunci API"},
        h("p", {class: "ak-redup", teks: "Kunci hanya membaca (GET) di /api/v1/*, dengan header X-API-Key. Tidak membuka halaman atau rute lain. Data publik tidak butuh kunci."}),
        h("details", {class: "ak-buat-pm", open: !D.kunci.length}, h("summary", null, h("span", {class: "ak-plus", "aria-hidden": "true", teks: "+"}), "Kunci baru"), f)),
      DB.kartu({ikon: "api", judul: "Kunci terbit", ey: "Daftar", kanan: h("a", {class: "ak-btn", href: "/api", teks: "Dokumentasi"})},
        D.kunci.length ? DB.tabel(["Pemegang", "Cakupan", "Status", "Aksi"], baris) : h("p", {class: "ak-kosong", teks: "Belum ada kunci."})));
  }
  async function muat() {
    const r = await fetch("/api/kunci-api/admin/daftar").catch(() => null);
    if (!r) return app.replaceChildren(h("p", {class: "ak-kosong", teks: "Jaringan putus. Muat ulang halaman."}));
    if (r.status === 403) return app.replaceChildren(h("p", {class: "ak-kosong", teks: "Halaman Kunci API hanya untuk moderator ke atas, bukan akun gerbang situs. Masuk dengan akun admin."}));
    if (r.status === 503) return app.replaceChildren(h("p", {class: "ak-kosong", teks: "Kunci API belum diaktifkan (migrasi D1 0040_kunci_api belum diterapkan)."}));
    if (!r.ok) return app.replaceChildren(h("p", {class: "ak-kosong", teks: `Galat ${r.status}. Daftar belum bisa dimuat.`}));
    D = await r.json(); gambar();
  }
  app.addEventListener("submit", async e => {
    const f = e.target.closest("[data-buat]"); if (!f) return;
    e.preventDefault(); const fd = new FormData(f), b = f.querySelector("[type=submit]"); b.disabled = true;
    const x = await Admin.kirim("/api/kunci-api/admin/buat", {nama: fd.get("nama"), cakupan: fd.getAll("cakupan")}).catch(() => gagalJaringan); b.disabled = false;
    if (!x.ok) { f.querySelector(".ak-galat").textContent = x.j.galat || `Gagal (${x.status})`; return; }
    baru = x.j; muat();
  });
  app.addEventListener("click", async e => {
    const s = e.target.closest("[data-salin]");
    if (s) { try { await navigator.clipboard.writeText(baru.kunci); s.textContent = "Tersalin"; } catch (x) { s.textContent = "Salin manual dari kotak"; } return; }
    const c = e.target.closest("[data-cabut]"); if (!c) return;
    const id = c.closest("[data-id]").dataset.id, k = D.kunci.find(x => x.id === id);
    if (!confirm(`Cabut kunci ${k.nama}? Langsung tidak berlaku dan tidak bisa dipulihkan.`)) return;
    c.disabled = true; const x = await Admin.kirim("/api/kunci-api/admin/cabut/" + id, {}).catch(() => gagalJaringan); c.disabled = false;
    if (!x.ok) { alert(x.j.galat || `Gagal (${x.status})`); return; }
    baru = null; muat();
  });
  muat();
})();
