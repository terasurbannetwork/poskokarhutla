/* Admin Alun-alun (/admin/alun): antrean moderasi, utas dan balasan petugas, butuh bantuan (status dan teruskan), pengumuman resmi, tombol dummy.
   CSP admin: tanpa skrip/gaya inline; semua teks dari data lewat textContent (helper h). Data dari /api/alun/admin (sesi admin). */
(() => {
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul"), API = "/api/alun", NS = "http://www.w3.org/2000/svg";
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const IKON = {tanya: "M12 21a9 9 0 1 1 9-9 9 9 0 0 1-9 9z|M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8|M12 17h.01", butuh_bantuan: "M12 3l9 16H3z|M12 10v4|M12 17h.01",
    info_lapangan: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z|M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", pengumuman: "M3 11v3a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z|M16 9a4 4 0 0 1 0 6",
    jam: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z|M12 7v5l3 2", centang: "M5 12l5 5 9-10", bendera: "M5 21V4|M5 4h11l-2 4 2 4H5", antrean: "M4 6h16|M4 12h16|M4 18h10"};
  const svg = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "ax-ikon"); s.setAttribute("aria-hidden", "true");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const JENIS = {tanya: "Tanya", butuh_bantuan: "Butuh bantuan", info_lapangan: "Info lapangan", pengumuman: "Pengumuman resmi"};
  const BANTUAN = {terbuka: "Terbuka", ditangani: "Ditangani", selesai: "Selesai"}, MOD = {tampil: "Tampil", dilaporkan: "Dilaporkan", tersembunyi: "Tersembunyi"};
  const ALASAN = {spam: "Spam", kasar: "Kasar", hoaks: "Hoaks", data_pribadi: "Data pribadi", lainnya: "Lainnya"};
  const angka = n => Number(n ?? 0).toLocaleString("id-ID");
  const jam = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : "-";
  const durasi = ms => { if (ms == null) return "belum ada"; const m = Math.round(ms / 60000); if (m < 60) return `${angka(m)} menit`; const j = Math.floor(m / 60); return j < 48 ? `${angka(j)} jam ${angka(m % 60)} menit` : `${angka(Math.round(j / 24))} hari`; };
  const umur = t => Math.floor((Date.now() - t) / 3600e3);
  const TABS = [["antrean", "Antrean moderasi"], ["utas", "Utas"], ["bantuan", "Butuh bantuan"], ["umum", "Pengumuman"]];
  let tab = "antrean", D = null, buka = null;

  async function kirim(url, body) {
    const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
    return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))};
  }
  async function ambil(url) {
    const r = await fetch(url);
    if (r.status === 403) { location.href = "/admin/masuk"; throw new Error("perlu masuk"); }
    if (r.status === 503) throw new Error("Alun-alun belum diaktifkan (migrasi 0024 belum dijalankan)");
    return r.json();
  }
  const pesan = (t, ok) => { const p = document.getElementById("axPesan"); if (p) { p.textContent = t || ""; p.className = "ax-pesan " + (ok ? "ok" : "galat"); } };
  const pil = (kls, t, ik) => h("span", {class: "ax-pil " + kls}, ik ? svg(ik) : null, t);
  const pilJenis = j => pil(j, JENIS[j], j);
  const tabel = (kepala, baris, kosong) => h("div", {class: "ad-tabel-wadah"}, h("table", {class: "ad-tabel"}, h("thead", null, h("tr", null, kepala.map(k => h("th", {teks: k})))),
    h("tbody", null, baris.length ? baris : h("tr", null, h("td", {colspan: String(kepala.length), class: "ax-kosong", teks: kosong})))));
  const tombol = (t, data, kls = "") => h("button", {class: "ad-tombol kecil " + kls, type: "button", ...data}, t);
  const cuplik = (a, b) => h("div", {class: "ax-cuplik"}, h("b", {teks: a}), b ? h("small", {teks: b.length > 160 ? b.slice(0, 160) + "..." : b}) : null);

  /* ---------- tampilan ---------- */
  function kartuStat(s) {
    const k = (ik, n, l, kls) => h("div", {class: "ax-kartu " + (kls || "")}, h("b", {teks: n}), h("span", null, ik ? svg(ik) : null, l));
    return h("div", {class: "ax-stat"}, ...Object.entries(JENIS).map(([j, l]) => k(j, angka(s.per_jenis[j]), l)),
      k("centang", durasi(s.rata_terjawab_ms), `Rata-rata sampai terjawab (${angka(s.terjawab)} utas)`), k("jam", angka(s.bantuan_terbuka_24j), "Butuh bantuan terbuka lebih dari 24 jam", s.bantuan_terbuka_24j ? "peringatan" : ""),
      k("antrean", angka(s.antrean), "Menunggu moderasi", s.antrean ? "peringatan" : ""));
  }
  function barisAntrean(x) {
    return h("tr", {"data-id": x.id},
      h("td", null, h("div", {class: "ax-aksi"}, pil(x.tipe === "utas" ? "tanya" : "info_lapangan", x.tipe === "utas" ? "Utas" : x.petugas ? "Balasan petugas" : "Balasan"), x.dummy ? pil("dummy", "DUMMY") : null)),
      h("td", null, cuplik(x.tipe === "utas" ? x.judul : "Di: " + x.judul, x.teks)),
      h("td", null, h("div", {class: "ax-aksi"}, pil(x.moderasi, MOD[x.moderasi]), h("b", {teks: angka(x.aduan)}), ...Object.entries(x.alasan).map(([a, n]) => pil("dilaporkan", `${ALASAN[a] || a} ${angka(n)}`)))),
      h("td", {class: "w", teks: jam(x.dibuat)}),
      h("td", {class: "a"}, h("div", {class: "ax-aksi"}, x.moderasi !== "tampil" ? tombol("Tampilkan", {"data-aksi": "tampilkan"}, "utama") : null, x.moderasi !== "tersembunyi" ? tombol("Sembunyikan", {"data-aksi": "sembunyikan"}) : null,
        tombol("Hapus", {"data-aksi": "hapus"}, "bahaya"))));
  }
  const tAntrean = () => tabel(["Jenis", "Isi", "Aduan", "Waktu", ""], D.antrean.map(barisAntrean), "Tidak ada konten yang menunggu moderasi.");
  const tUtas = () => h("div", {class: "ax-isi"}, tabel(["Utas", "Jenis", "Status", "Balasan", "Upvote", "Waktu", ""], D.utas.map(u => h("tr", {"data-id": u.id},
    h("td", null, cuplik(u.judul, [u.kab, D.prov[u.prov]].filter(Boolean).join(", ")), u.dummy ? pil("dummy", "DUMMY") : null),
    h("td", null, pilJenis(u.jenis)), h("td", null, h("div", {class: "ax-aksi"}, pil(u.moderasi, MOD[u.moderasi]), u.bantuan ? pil(u.bantuan, BANTUAN[u.bantuan]) : null, u.terjawab ? pil("selesai", "Terjawab", "centang") : null, u.sematan ? pil("pengumuman", "Tersemat") : null)),
    h("td", {class: "n", teks: angka(u.balasan)}), h("td", {class: "n", teks: angka(u.upvote)}), h("td", {class: "w", teks: jam(u.dibuat)}),
    h("td", {class: "a"}, tombol(buka === u.id ? "Tutup" : "Buka", {"data-aksi": "buka"}, "utama")))), "Belum ada utas."), h("div", {id: "axPanel", class: "ax-panel"}));
  function tBantuan() {
    return tabel(["Utas", "Umur", "Status", "Teruskan", "Catatan", ""], D.bantuan.map(u => {
      const sel = h("select", {class: "ax-sel", "data-f": "status"}, ...Object.entries(BANTUAN).map(([k, v]) => h("option", {value: k, teks: v, selected: u.bantuan === k})));
      const ke = h("select", {class: "ax-sel", "data-f": "ke"}, h("option", {value: "", teks: "Tidak diteruskan"}), h("option", {value: "relawan", teks: "Relawan", selected: u.teruskan_ke === "relawan"}), h("option", {value: "logistik", teks: "Logistik", selected: u.teruskan_ke === "logistik"}));
      const cat = h("input", {class: "ax-sel", "data-f": "catatan", maxlength: "300", value: u.teruskan_catatan || "", placeholder: "Catatan untuk tim"});
      return h("tr", {"data-id": u.id, class: u.bantuan === "terbuka" && umur(u.dibuat) >= 24 ? "ax-tua" : ""},
        h("td", null, cuplik(u.judul, [u.kab, D.prov[u.prov]].filter(Boolean).join(", ")), u.dummy ? pil("dummy", "DUMMY") : null), h("td", {class: "n", teks: `${angka(umur(u.dibuat))} jam`}), h("td", null, sel), h("td", null, ke), h("td", null, cat),
        h("td", {class: "a"}, tombol("Simpan", {"data-aksi": "simpan_bantuan"}, "utama")));
    }), "Tidak ada permintaan bantuan yang masih berjalan.");
  }
  function tUmum() {
    const prov = h("select", {name: "prov", required: true}, ...Object.entries(D.prov).map(([k, v]) => h("option", {value: k, teks: v, selected: k === "62"})));
    const ben = h("select", {name: "bencana", required: true}, ...D.bencana.map(b => h("option", {value: b, teks: b})));
    const form = h("form", {id: "axFormUmum", class: "ad-kartu ax-form"}, h("h3", {teks: "Pengumuman resmi"}),
      h("label", null, "Judul", h("input", {name: "judul", maxlength: "120", required: true, minlength: "3"})), h("label", null, "Isi", h("textarea", {name: "teks", maxlength: "1000", required: true})),
      h("div", {class: "ax-baris"}, h("label", null, "Bencana", ben), h("label", null, "Provinsi", prov), h("label", null, "Kabupaten atau kota (opsional)", h("input", {name: "kab", maxlength: "60"}))),
      h("label", {class: "ax-cek"}, h("input", {type: "checkbox", name: "sematan", checked: true}), "Sematkan di atas daftar"), h("div", null, h("button", {class: "ad-tombol utama", type: "submit"}, "Terbitkan")));
    const us = D.utas.filter(u => u.jenis === "pengumuman");
    return h("div", {class: "ax-isi"}, form, tabel(["Pengumuman", "Status", "Balasan", "Waktu", ""], us.map(u => h("tr", {"data-id": u.id}, h("td", null, cuplik(u.judul, D.prov[u.prov]), u.dummy ? pil("dummy", "DUMMY") : null),
      h("td", null, pil(u.sematan ? "pengumuman" : "tampil", u.sematan ? "Tersemat" : "Biasa")), h("td", {class: "n", teks: angka(u.balasan)}), h("td", {class: "w", teks: jam(u.dibuat)}),
      h("td", {class: "a"}, h("div", {class: "ax-aksi"}, tombol(u.sematan ? "Lepas sematan" : "Sematkan", {"data-aksi": u.sematan ? "lepas_sematan" : "sematkan"}, "utama"), tombol("Hapus", {"data-aksi": "hapus"}, "bahaya"))))), "Belum ada pengumuman."));
  }
  const TAMPIL = {antrean: tAntrean, utas: tUtas, bantuan: tBantuan, umum: tUmum};

  function kerangka() {
    app.replaceChildren(h("nav", {class: "ad-tabs", "aria-label": "Alun-alun"}, TABS.map(([k, l]) => h("button", {type: "button", "data-tab": k, "aria-pressed": String(k === tab), teks: l}))),
      h("p", {id: "axPesan", class: "ax-pesan", role: "status"}), h("div", {id: "axIsi", class: "ax-isi"}));
  }
  function gambar() {
    for (const b of app.querySelectorAll("[data-tab]")) b.setAttribute("aria-pressed", String(b.dataset.tab === tab));
    document.getElementById("axIsi").replaceChildren(kartuStat(D.stat), TAMPIL[tab]());
    if (tab === "utas" && buka) tampilRincian(buka);
  }
  async function muat() {
    try { D = await ambil(`${API}/admin?dummy=1`); } catch (e) { if (e.message !== "perlu masuk") document.getElementById("axIsi").replaceChildren(h("p", {class: "ax-kosong", teks: e.message})); return; }
    gambar();
  }
  /* rincian utas (balasan, balas sebagai petugas, tandai terjawab) */
  async function tampilRincian(id) {
    const p = document.getElementById("axPanel"); if (!p) return;
    const u = await ambil(`${API}/${id}?dummy=1`);
    p.replaceChildren(h("div", {class: "ad-kartu ax-panel"}, h("h3", {teks: u.judul}), h("p", {class: "ax-meta"}, pilJenis(u.jenis), u.nama || "Warga", ` ${[u.kab, u.prov_nama].filter(Boolean).join(", ")}`), h("div", {teks: u.teks, class: "ax-cuplik"}),
      ...u.balasan_daftar.map(b => h("div", {class: "ax-balas", "data-id": b.id}, h("div", {class: "ax-meta"}, b.petugas ? pil("petugas", "Petugas") : h("b", {teks: b.nama || "Warga"}), pil(b.moderasi, MOD[b.moderasi]), b.id === u.terjawab_id ? pil("selesai", "Jawaban", "centang") : null, h("span", {teks: jam(b.dibuat)})),
        h("p", {teks: b.teks}), h("div", {class: "ax-aksi"}, u.jenis !== "pengumuman" ? tombol(b.id === u.terjawab_id ? "Cabut terjawab" : "Tandai terjawab", {"data-aksi": "terjawab", "data-bid": b.id === u.terjawab_id ? "" : b.id}) : null,
          b.moderasi !== "tersembunyi" ? tombol("Sembunyikan", {"data-aksi": "sembunyikan"}) : tombol("Tampilkan", {"data-aksi": "tampilkan"}), tombol("Hapus", {"data-aksi": "hapus"}, "bahaya")))),
      h("form", {id: "axFormBalas", class: "ax-form"}, h("label", null, "Balas sebagai Petugas", h("textarea", {name: "teks", maxlength: "280", required: true})), h("div", null, h("button", {class: "ad-tombol utama", type: "submit"}, "Kirim balasan petugas")))));
  }

  /* ---------- aksi ---------- */
  app.addEventListener("click", async e => {
    const t = e.target.closest("[data-tab]");
    if (t) { tab = t.dataset.tab; gambar(); return; }
    const b = e.target.closest("[data-aksi]"); if (!b) return;
    const baris = b.closest("[data-id]"), id = baris?.dataset.id, a = b.dataset.aksi;
    if (a === "buka") { buka = buka === id ? null : id; gambar(); return; }
    let r;
    if (a === "simpan_bantuan") {
      const f = n => baris.querySelector(`[data-f=${n}]`).value;
      r = await kirim(`${API}/admin/${id}`, {aksi: "status", status: f("status")});
      if (r.ok) r = await kirim(`${API}/admin/${id}`, {aksi: "teruskan", ke: f("ke") || null, catatan: f("catatan") || null});
    } else if (a === "terjawab") r = await kirim(`${API}/terjawab/${buka}`, {balasan_id: b.dataset.bid || null});
    else {
      if (a === "hapus" && !confirm("Hapus permanen? Balasan dan suaranya ikut terhapus.")) return;
      r = await kirim(`${API}/admin/${id}`, {aksi: a});
    }
    pesan(r.ok ? "Tersimpan." : r.j.galat || `Gagal (${r.status})`, r.ok);
    if (r.ok) await muat();
  });
  app.addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target;
    if (f.id === "axFormUmum") {
      const d = Object.fromEntries(new FormData(f)), r = await kirim(API, {jenis: "pengumuman", judul: d.judul, teks: d.teks, bencana: d.bencana, prov: d.prov, kab: d.kab || null, sematan: d.sematan === "on"});
      pesan(r.ok ? "Pengumuman terbit." : r.j.galat || `Gagal (${r.status})`, r.ok); if (r.ok) await muat();
    } else if (f.id === "axFormBalas") {
      const r = await kirim(`${API}/balas/${buka}`, {teks: f.teks.value, petugas: true});
      pesan(r.ok ? "Balasan petugas terkirim." : r.j.galat || `Gagal (${r.status})`, r.ok); if (r.ok) await muat();
    }
  });

  /* ---------- dummy (DUMMY.md): isi seluruh halaman, hapus semuanya ---------- */
  aksiJudul.replaceChildren(h("button", {class: "ad-tombol ad-bulat", "data-dummy": "isi", title: "Isi data dummy untuk halaman ini", "aria-label": "Isi data dummy", teks: "🧪"}),
    h("button", {class: "ad-tombol ad-bulat", "data-dummy": "hapus", title: "Hapus semua data dummy", "aria-label": "Hapus data dummy", teks: "🧹"}));
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy Alun-alun? Utas asli tidak tersentuh.")) return;
    const r = await kirim(`${API}/dummy`, {aksi: d.dataset.dummy});
    alert(r.ok ? (d.dataset.dummy === "isi" ? `Dummy dibuat: ${r.j.utas} utas, ${r.j.balasan} balasan, ${r.j.suara} suara.` : `Dummy dihapus: ${r.j.utas} utas, ${r.j.balasan} balasan.`) : r.j.galat || `Gagal (${r.status})`);
    if (r.ok) location.reload();
  });
  kerangka(); muat();
})();
