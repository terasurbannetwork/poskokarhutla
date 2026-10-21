/* Admin Pengingat (/admin/pengingat): antrean pengingat per jenis, kirim email ringkas (hanya saat ditekan), tandai selesai/abaikan, 🧪/🧹 dummy.
   CSP admin: tanpa skrip/gaya inline; semua teks dari data lewat textContent. Data dari /api/pengingat/admin. */
(() => {
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul"), API = "/api/pengingat", NS = "http://www.w3.org/2000/svg";
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const IKON = {mou_relawan: "M8 4h8l3 3v13H5V4z|M9 12h6|M9 16h4", pks_riset: "M10 3v6L5 19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1l-5-10V3|M9 3h6", logistik_lambat: "M3 7l9-4 9 4-9 4z|M3 7v10l9 4 9-4V7",
    dsp_spj: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z|M12 7v10|M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.3-2.5 1.5", renkon: "M6 3h8l4 4v14H6z|M9 12h6|M9 16h6",
    rehab_macet: "M3 11l9-8 9 8|M5 10v10h14V10|M12 13v3", stok_rendah: "M3 10l9-6 9 6v10H3z|M8 20v-6h8v6", bantuan_terbuka: "M12 3l9 16H3z|M12 10v4|M12 17h.01", semua: "M4 6h16|M4 12h16|M4 18h10"};
  const svg = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "pg-ikon"); s.setAttribute("aria-hidden", "true");
    for (const d of (IKON[n] || IKON.semua).split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const STATUS = {baru: "Baru", dikirim: "Terkirim", selesai: "Selesai", abaikan: "Diabaikan"};
  const angka = n => Number(n ?? 0).toLocaleString("id-ID");
  const waktu = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : "–";
  const {kirim} = Admin, ambil = u => Admin.ambil(u, "Pengingat");
  const pesan = (t, ok) => { const p = document.getElementById("pgPesan"); if (p) { p.textContent = t || ""; p.className = "pg-pesan " + (ok ? "ok" : "galat"); } };
  let D = null, filter = "", pilih = new Set();
  const tombol = (t, data, kls = "") => h("button", {class: "ad-tombol kecil " + kls, type: "button", ...data}, t);

  function gambar() {
    const baris = D.pengingat.filter(r => !filter || r.jenis === filter), buka = D.pengingat.filter(r => r.status === "baru" || r.status === "dikirim").length;
    const kartu = (k, l, n) => h("button", {class: "pg-kartu", type: "button", "data-jenis": k, "aria-pressed": String(filter === k)}, h("b", {teks: angka(n)}), h("span", null, svg(k || "semua"), l));
    const rows = baris.map(r => h("tr", {"data-id": r.id},
      h("td", null, r.status === "baru" || r.status === "dikirim" ? h("input", {type: "checkbox", "data-pilih": "1", "aria-label": "Pilih", checked: pilih.has(r.id)}) : null),
      h("td", null, h("span", {class: "pg-pil baru"}, svg(r.jenis), D.jenis[r.jenis]), r.dummy ? h("span", {class: "pg-pil dummy", teks: "DUMMY"}) : null),
      h("td", null, h("div", {class: "pg-cuplik"}, h("b", {teks: r.judul}), r.rincian ? h("small", {teks: r.rincian}) : null)),
      h("td", {teks: [r.kab, r.prov_nama].filter(Boolean).join(", ") || "–"}),
      h("td", null, h("span", {class: "pg-pil " + r.status, teks: STATUS[r.status]}), r.dikirim_pada ? h("small", {teks: " " + waktu(r.dikirim_pada)}) : null),
      h("td", {class: "w", teks: waktu(r.dibuat)}),
      h("td", {class: "a"}, h("div", {class: "pg-aksi"}, r.status === "selesai" || r.status === "abaikan" ? tombol("Buka lagi", {"data-aksi": "buka"}) : [tombol("Selesai", {"data-aksi": "selesai"}, "utama"), tombol("Abaikan", {"data-aksi": "abaikan"})]))));
    app.replaceChildren(h("p", {id: "pgPesan", class: "pg-pesan", role: "status"}), h("div", {class: "pg-isi"},
      h("div", {class: "pg-jenis"}, kartu("", "Semua jenis", buka), ...Object.entries(D.jenis).map(([k, l]) => kartu(k, l, D.per_jenis[k]))),
      h("div", {class: "pg-bar"}, tombol(`Kirim email ringkas (${angka(pilih.size)})`, {"data-aksi": "kirim", disabled: !pilih.size || !D.email_siap}, "utama"), tombol("Periksa sekarang", {"data-aksi": "periksa"}),
        D.email_siap ? null : h("span", {class: "pg-pil abaikan", teks: "Email belum siap"})),
      h("div", {class: "ad-tabel-wadah"}, h("table", {class: "ad-tabel"}, h("thead", null, h("tr", null, ["", "Jenis", "Pengingat", "Wilayah", "Status", "Terdeteksi", ""].map(k => h("th", {teks: k})))),
        h("tbody", null, rows.length ? rows : h("tr", null, h("td", {colspan: "7", class: "pg-kosong", teks: "Tidak ada pengingat."})))))));
  }
  async function muat() {
    try { D = await ambil(`${API}/admin?dummy=1`); } catch (e) { if (e.message !== "perlu masuk") app.replaceChildren(h("p", {class: "pg-kosong", teks: e.message})); return; }
    pilih = new Set([...pilih].filter(id => D.pengingat.some(r => r.id === id))); gambar();
  }
  app.addEventListener("change", e => { const c = e.target.closest("[data-pilih]"); if (!c) return; const id = c.closest("[data-id]").dataset.id; c.checked ? pilih.add(id) : pilih.delete(id); gambar(); });
  app.addEventListener("click", async e => {
    const k = e.target.closest("[data-jenis]"); if (k) { filter = k.dataset.jenis; gambar(); return; }
    const b = e.target.closest("[data-aksi]"); if (!b || b.disabled) return;
    const a = b.dataset.aksi, id = b.closest("[data-id]")?.dataset.id;
    let r;
    if (a === "kirim") { if (!confirm(`Kirim satu email ringkas berisi ${pilih.size} pengingat ke penerima yang diatur?`)) return; r = await kirim(`${API}/admin/kirim`, {ids: [...pilih]}); if (r.ok) pilih.clear(); }
    else if (a === "periksa") r = await kirim(`${API}/admin/periksa`, {});
    else r = await kirim(`${API}/admin/${id}`, {aksi: a});
    pesan(r.ok ? (a === "kirim" ? `Email terkirim (${r.j.terkirim} pengingat).` : a === "periksa" ? `Diperiksa: ${angka(r.j.dibuat)} baru, ${angka(r.j.dihapus)} basi dibuang.` : "Tersimpan.") : r.j.galat || `Gagal (${r.status})`, r.ok);
    if (r.ok) { const t = document.getElementById("pgPesan").textContent; await muat(); pesan(t, true); }
  });
  aksiJudul.replaceChildren(h("button", {class: "ad-tombol ad-bulat", "data-dummy": "isi", title: "Isi data dummy untuk halaman ini", "aria-label": "Isi data dummy", teks: "🧪"}),
    h("button", {class: "ad-tombol ad-bulat", "data-dummy": "hapus", title: "Hapus semua data dummy", "aria-label": "Hapus data dummy", teks: "🧹"}));
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA pengingat dummy? Pengingat asli tidak tersentuh.")) return;
    const r = await kirim(`${API}/dummy`, {aksi: d.dataset.dummy});
    alert(r.ok ? (d.dataset.dummy === "isi" ? `Dummy dibuat: ${r.j.pengingat} pengingat${r.j.kosong.length ? `; jenis kosong: ${r.j.kosong.join(", ")}` : ""}.` : `Dummy dihapus: ${r.j.pengingat} pengingat.`) : r.j.galat || `Gagal (${r.status})`);
    if (r.ok) location.reload();
  });
  muat();
})();
