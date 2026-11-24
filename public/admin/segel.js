/* Segel dokumen (/admin/segel, paket data/kajian-bnpb/segel-dokumen/, SG-10; DESIGN-SYSTEM 4). Data: GET /api/segel?status=, POST /api/segel/cabut (src/segel.js).
   Daftar 100 segel terbaru; status di sini dari cabut dan waktu saja, pemeriksaan sidik lengkap lewat tautan Periksa (/verifikasi/<kode>).
   Cabut hanya moderator dan staf pimpinan (KEPUTUSAN K4, Q5): dialog menampilkan sampul dokumen dulu, alasan wajib 5 sampai 500 huruf, hanya terlihat staf.
   Gaya dari akun.css (ak-*) + kit dashboard (Admin.dasbor). CSP admin: tanpa skrip/gaya inline; teks dari data lewat textContent. */
(() => {
  const app = Admin.dasbor.tumpuk(document.getElementById("app")), DB = Admin.dasbor;
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const tgl = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}) + " WIB";
  const tampil = k => `${k.slice(0, 5)}-${k.slice(5)}`;
  const JENIS = {lk: "Laporan harian karhutla", lkb: "Laporan harian bencana", pb: "Dokumen PB", lj: "Data lanjutan BPBD"};
  const bisaCabut = !Admin.staf || Admin.peran.includes("pimpinan");   // API tetap menjaga; tombol hanya disembunyikan untuk yang tak berhak
  const gagalJaringan = {ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}};
  let D = [], saring = "";

  const dialog = h("dialog", {class: "ak-dialog", "aria-labelledby": "sgJudul"});
  document.body.append(dialog);

  function gambar() {
    const dicabut = D.filter(x => x.dicabut).length;
    const pilih = h("div", {class: "ak-aksi", role: "group", "aria-label": "Saring status"},
      ...[["", "Semua"], ["berlaku", "Belum dicabut"], ["dicabut", "Dicabut"]].map(([v, l]) => h("button", {type: "button", class: "ak-btn", "data-saring": v, "aria-pressed": String(saring === v)}, l)));
    const baris = D.map(x => h("tr", {"data-kode": x.kode, class: x.dicabut ? "redup" : ""},
      h("td", null, h("code", {teks: tampil(x.kode)}), h("small", {teks: JENIS[x.jenis] || x.jenis})),
      h("td", null, h("b", {teks: x.judul}), h("small", {teks: [x.wilayah, x.periode, x.jenis === "pb" ? `versi ${x.versi}` : x.versi ? `ralat ${x.versi}` : "terbitan awal"].filter(Boolean).join(", ")})),
      h("td", null, tgl(x.terbit)),
      h("td", null, h("span", {class: "ak-pil " + (x.dicabut ? "dicabut" : "aktif"), teks: x.dicabut ? "Dicabut" : "Belum dicabut"}),
        x.dicabut ? h("small", {teks: `${tgl(x.dicabut)}, ${x.alasan}`}) : null),
      h("td", null, DB.aksi(h("a", {class: "ak-btn", href: "/verifikasi/" + x.kode, target: "_blank", rel: "noopener", teks: "Periksa"}),
        !x.dicabut && bisaCabut ? DB.ikon("cabut", "Cabut segel " + tampil(x.kode), {"data-cabut": "1"}, "bahaya") : null))));
    app.replaceChildren(
      DB.ubinGrid(DB.ubin({ikon: "kunci", label: "Segel tampil", nilai: String(D.length), ket: "100 terbaru"}),
        DB.ubin({ikon: "cabut", label: "Dicabut", nilai: String(dicabut), ket: "dari yang tampil"})),
      DB.kartu({ikon: "api", judul: "Segel dokumen", ey: "Daftar", kanan: pilih},
        D.length ? DB.tabel(["Kode", "Dokumen", "Terbit", "Status", "Aksi"], baris) : h("p", {class: "ak-kosong", teks: "Belum ada segel untuk pilihan ini."})));
  }

  async function muat() {
    const r = await fetch("/api/segel" + (saring ? "?status=" + saring : "")).catch(() => null);
    if (!r) return app.replaceChildren(h("p", {class: "ak-kosong", teks: "Jaringan putus. Muat ulang halaman."}));
    if (r.status === 403) return app.replaceChildren(h("p", {class: "ak-kosong", teks: "Halaman ini untuk moderator, staf pimpinan, dan pusdalops."}));
    if (!r.ok) return app.replaceChildren(h("p", {class: "ak-kosong", teks: `Daftar belum bisa dimuat (galat ${r.status}).`}));
    const j = await r.json();
    if (!j.tersedia) return app.replaceChildren(h("p", {class: "ak-kosong", teks: "Segel belum aktif: migrasi D1 0171 dan 0172 belum diterapkan."}));
    D = j.segel; gambar();
  }

  /* vonis cabut hanya sesudah melihat sampul dokumennya (DESIGN-SYSTEM 4) */
  function bukaCabut(x) {
    const galat = h("p", {class: "ak-galat", role: "alert"}), alasan = h("textarea", {name: "alasan", rows: "3", minlength: "5", maxlength: "500", required: true});
    const form = h("form", {method: "dialog", class: "ak-form"},
      h("h2", {id: "sgJudul", teks: "Cabut segel " + tampil(x.kode)}),
      h("dl", {class: "ak-dl"}, ...[["Dokumen", x.judul], ["Wilayah", x.wilayah || "tidak ada"], ["Periode", x.periode], ["Terbit", tgl(x.terbit)], ["Penerbit", x.penerbit]].flatMap(([k, v]) => [h("dt", {teks: k}), h("dd", {teks: v})])),
      h("p", {class: "ak-redup", teks: "Sesudah dicabut, halaman verifikasi menampilkan Dicabut beserta tanggalnya. Pencabutan tidak bisa dibatalkan. Alasan hanya terlihat oleh staf."}),
      h("label", null, "Alasan pencabutan", alasan), galat,
      h("div", {class: "ak-aksi"}, h("button", {class: "ak-btn", type: "button", "data-tutup": "1"}, "Batal"), h("button", {class: "ak-btn bahaya", type: "submit", value: "cabut"}, "Cabut segel")));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const a = alasan.value.trim(); if (a.length < 5) { galat.textContent = "Tulis alasan paling sedikit 5 huruf."; alasan.focus(); return; }
      const b = form.querySelector("[type=submit]"); b.disabled = true;
      const r = await Admin.kirim("/api/segel/cabut", {kode: x.kode, alasan: a}).catch(() => gagalJaringan); b.disabled = false;
      if (!r.ok) { galat.textContent = r.j.galat || `Gagal (${r.status})`; return; }
      dialog.close(); muat();
    });
    form.querySelector("[data-tutup]").addEventListener("click", () => dialog.close());
    dialog.replaceChildren(form); dialog.showModal(); alasan.focus();
  }

  app.addEventListener("click", e => {
    const s = e.target.closest("[data-saring]");
    if (s) { saring = s.dataset.saring; for (const b of app.querySelectorAll("[data-saring]")) b.setAttribute("aria-pressed", String(b === s)); muat(); return; }
    const c = e.target.closest("[data-cabut]"); if (!c) return;
    const x = D.find(y => y.kode === c.closest("[data-kode]").dataset.kode); if (x) bukaCabut(x);
  });
  muat();
})();
