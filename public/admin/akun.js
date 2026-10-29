/* Akun (/admin/akun): buat akun staf BNPB, daftar semua akun beserta halaman yang dibukanya, ubah peran/wilayah, reset sandi, cabut. Pola: tab Pengguna pangantara.
   Data: GET /api/staf/admin/daftar (Super Admin; tiap staf membawa `akses` = halaman admin yang dibuka perannya, sama dengan HALAMAN_STAF di src/admin_halaman.js),
   ringkasan akun instansi dari GET /api/instansi/admin/akun (moderator). Aksi: POST /api/staf/admin/buat dan /api/staf/admin/:id {aksi: ubah|reset|cabut}.
   CSP admin: tanpa skrip/gaya inline; teks dari data lewat textContent. INP: chip dan cari berubah seketika, tabel digambar sesudah satu frame. */
(() => {
  const app = document.getElementById("app"), wil = window.Wilayah;
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const angka = n => Number(n ?? 0).toLocaleString("id-ID");
  const tgl = t => t ? new Date(t).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}) : "";
  const tombol = (t, data, kls = "") => h("button", {class: "ak-btn " + kls, type: "button", ...data}, t);
  const pil = (t, kls = "") => h("span", {class: "ak-pil " + kls, teks: t});
  const STATUS = {aktif: "Aktif", ganti: "Belum ganti sandi", dicabut: "Dicabut"};
  const ST_INSTANSI = {belum_klaim: "Belum diklaim", menunggu: "Menunggu verifikasi", aktif: "Aktif", ditolak: "Ditolak", dicabut: "Dicabut"};
  let D = null, P = null, pmUbah = null, F = {status: "", q: ""}, ubahId = null, rahasia = null, jadwal = 0;
  /* pesan siap kirim untuk wa.me (penerima dipilih di WhatsApp); sandi ikut tersimpan di chat penerima, jadi pesan menyarankan menggantinya */
  const pesanWA = r => r.pemirsa
    ? `Akun Centurisk97 untuk ${r.nama}\nMasuk: ${location.origin}/admin/masuk\nUsername: ${r.username}\nSandi: ${r.sandi}\n\nJangan bagikan sandi ini ke orang lain.`
    : `Akun Centurisk97 untuk ${r.nama}\nMasuk: ${location.origin}/admin/pantau\nUsername: ${r.username}\nSandi: ${r.sandi}\n\nSaat masuk pertama Anda wajib membuat sandi baru.`;
  const statusDari = s => s.status === "dicabut" ? "dicabut" : s.wajib_ganti ? "ganti" : "aktif";

  /* ---------- ringkasan dan kontrol (berubah seketika) ---------- */
  function gambar(instansi) {
    const n = k => D.staf.filter(s => statusDari(s) === k).length;
    const kartu = (k, l, v, kls = "") => h("button", {class: "ak-kartu " + kls, type: "button", "data-status": k, "aria-pressed": String(F.status === k)}, h("b", {teks: angka(v)}), h("span", {teks: l}));
    app.replaceChildren(
      rahasia ? h("div", {class: "ak-rahasia-kotak", role: "status"}, h("p", {teks: `Akun untuk ${rahasia.nama}. Tampil sekali, salin dan serahkan langsung ke orangnya:`}),
        h("code", {class: "ak-rahasia", teks: `Username: ${rahasia.username}\nSandi: ${rahasia.sandi}`}),
        h("a", {class: "ak-btn utama ak-wa", href: "https://wa.me/?text=" + encodeURIComponent(pesanWA(rahasia)), target: "_blank", rel: "noopener noreferrer", teks: "Kirim ke WA"}),
        h("small", {teks: "Staf: masuk di /admin/pantau lalu wajib membuat sandi baru. Pemirsa: masuk di halaman login situs."})) : null,
      h("div", {class: "ak-ringkas"}, kartu("", "Akun staf", D.staf.length), kartu("aktif", "Aktif", n("aktif")), kartu("ganti", "Belum ganti sandi", n("ganti"), n("ganti") ? "kuning" : ""), kartu("dicabut", "Dicabut", n("dicabut"))),
      panelBuat(),
      h("section", {class: "ak-panel"},
        h("div", {class: "ak-kepala"}, h("h2", {teks: "Daftar akun staf"}),
          h("input", {class: "ak-cari", type: "search", placeholder: "Cari nama, username, unit, NIP", "aria-label": "Cari akun", value: F.q, "data-cari": "1"})),
        h("div", {id: "akDaftar"}, h("p", {class: "ak-redup", teks: "Menggambar daftar…"}))),
      panelPemirsa(),
      panelInstansi(instansi),
      panelMatriks());
    tunda();
  }
  function tunda() { cancelAnimationFrame(jadwal); jadwal = requestAnimationFrame(() => setTimeout(gambarDaftar, 0)); }

  /* ---------- buat akun ---------- */
  function cekPeran(nama, pilih = []) {
    return h("fieldset", {class: "ak-peran"}, h("legend", {teks: "Peran (boleh lebih dari satu)"}),
      ...Object.entries(D.peran).map(([k, l]) => h("label", {class: "ak-cek"}, h("input", {type: "checkbox", name: nama, value: k, checked: pilih.includes(k)}), h("span", null, h("b", {teks: l}), h("small", {teks: aksesTeks(D.akses[k])})))));
  }
  function cekWilayah(nama, pilih = []) {
    return h("details", {class: "ak-wilayah"}, h("summary", {teks: pilih.length ? `Wilayah kerja: ${pilih.map(wil.prov).join(", ")}` : "Wilayah kerja: Nasional (buka untuk membatasi ke provinsi)"}),
      h("div", {class: "ak-wilayah-isi"}, ...Object.entries(wil.PROV).map(([k, n]) => h("label", {class: "ak-cek"}, h("input", {type: "checkbox", name: nama, value: k, checked: pilih.includes(k)}), n))));
  }
  function panelBuat() {
    const f = h("form", {class: "ak-form", id: "akBuat"},
      h("div", {class: "ak-grid"}, ...[["nama", "Nama lengkap", "Budi Santoso"], ["nip", "NIP", "1987…"], ["unit", "Unit kerja", "Pusdalops BNPB"], ["email", "Email dinas", "nama@bnpb.go.id"], ["wa", "WhatsApp", "0812…"]]
        .map(([k, l, c]) => h("label", null, l, h("input", {name: k, required: true, placeholder: c, autocomplete: "off", ...(k === "email" ? {type: "email"} : k === "wa" ? {inputmode: "tel"} : {})})))),
      cekPeran("peran"), cekWilayah("wilayah"),
      h("p", {class: "ak-galat", id: "akBuatGalat", role: "alert"}), tombol("Buat akun", {type: "submit"}, "utama"));
    f.addEventListener("submit", async e => {
      e.preventDefault(); const fd = new FormData(f), o = Object.fromEntries(["nama", "nip", "unit", "email", "wa"].map(k => [k, fd.get(k)]));
      o.peran = fd.getAll("peran"); o.wilayah = fd.getAll("wilayah");
      const b = f.querySelector("[type=submit]"); b.disabled = true; const x = await Admin.kirim("/api/staf/admin/buat", o).catch(() => ({ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}})); b.disabled = false;
      if (!x.ok) { document.getElementById("akBuatGalat").textContent = x.j.galat || `Gagal (${x.status})`; return; }
      rahasia = {nama: x.j.staf.nama, username: x.j.username, sandi: x.j.sandi}; muat();
    });
    return h("details", {class: "ak-panel ak-buat"}, h("summary", null, h("span", {class: "ak-plus", "aria-hidden": "true", teks: "+"}), "Buat akun baru"),
      h("p", {class: "ak-redup", teks: "Username dan sandi acak dibuat otomatis dan tampil sekali. Akses halaman mengikuti peran yang dicentang."}), f);
  }

  /* ---------- daftar (berat: sesudah satu frame) ---------- */
  const aksesTeks = a => a?.length ? a.map(x => x.label).join(", ") : "Meja Pantau saja";
  const aksesPil = a => h("div", {class: "ak-akses"}, ...(a || []).map(x => h("a", {class: "ak-pil akses", href: "/admin/" + x.k, teks: `${x.ikon} ${x.label}`})));
  function gambarDaftar() {
    const wadah = document.getElementById("akDaftar"); if (!wadah) return;
    const q = F.q.trim().toLowerCase();
    const xs = D.staf.filter(s => (!F.status || statusDari(s) === F.status) && (!q || [s.nama, s.username, s.unit, s.nip, s.email].some(v => String(v).toLowerCase().includes(q))));
    if (!xs.length) { wadah.replaceChildren(h("p", {class: "ak-kosong", teks: D.staf.length ? "Tidak ada akun yang cocok dengan saringan." : "Belum ada akun staf. Buat yang pertama lewat tombol Buat akun baru."})); return; }
    wadah.replaceChildren(h("div", {class: "ak-tabel-wadah"}, h("table", {class: "ak-tabel"},
      h("thead", null, h("tr", null, ["Nama", "Kontak", "Peran", "Wilayah", "Akses halaman", "Status", ""].map(k => h("th", {teks: k})))),
      h("tbody", null, xs.flatMap(s => [baris(s), ubahId === s.id ? barisUbah(s) : null])))));
  }
  function baris(s) {
    const st = statusDari(s), hidup = s.status === "aktif";
    return h("tr", {"data-staf": s.id, class: hidup ? "" : "redup"},
      h("td", null, h("b", {teks: s.nama}), h("small", {teks: `@${s.username}`}), h("small", {teks: `${s.unit}, NIP ${s.nip}`})),
      h("td", null, h("small", {teks: s.email}), h("small", {teks: "+" + s.wa})),
      h("td", null, h("div", {class: "ak-akses"}, ...s.peran.map(p => pil(D.peran[p] || p, "peran")))),
      h("td", {teks: s.wilayah.length ? s.wilayah.map(wil.prov).join(", ") : "Nasional"}),
      h("td", null, aksesPil(s.akses)),
      h("td", null, pil(STATUS[st], st), s.dummy ? pil("DUMMY", "dummy") : null, h("small", {teks: "Dibuat " + tgl(s.dibuat)})),
      h("td", null, hidup && !s.dummy ? h("div", {class: "ak-aksi"}, tombol(ubahId === s.id ? "Tutup" : "Ubah akses", {"data-aksi": "ubah-buka"}), tombol("Reset sandi", {"data-aksi": "reset"}), tombol("Cabut", {"data-aksi": "cabut"}, "bahaya")) : null));
  }
  function barisUbah(s) {
    const f = h("form", {class: "ak-form", "data-ubah": s.id}, cekPeran("peran", s.peran), cekWilayah("wilayah", s.wilayah),
      h("p", {class: "ak-galat", role: "alert"}), h("div", {class: "ak-aksi"}, tombol("Simpan akses", {type: "submit"}, "utama"), tombol("Batal", {"data-aksi": "ubah-buka"})));
    return h("tr", {class: "ak-ubah", "data-staf": s.id}, h("td", {colspan: "7"}, f));
  }

  /* ---------- akun pemirsa: hanya melihat tab tertentu situs (src/pemirsa.js); data JSON tetap terbuka, jadi ini pembatas tampilan ---------- */
  const cekTab = (pilih = []) => h("fieldset", {class: "ak-peran ak-tab"}, h("legend", {teks: "Tab yang boleh dilihat"}),
    ...Object.entries(P.tab).map(([k, l]) => h("label", {class: "ak-cek"}, h("input", {type: "checkbox", name: "tab", value: k, checked: pilih.includes(k)}), l)));
  function panelPemirsa() {
    if (!P) return h("section", {class: "ak-panel"}, h("h2", {teks: "Akun pemirsa"}), h("p", {class: "ak-redup", teks: "Akun pemirsa belum diaktifkan (migrasi D1 0036_pemirsa belum diterapkan)."}));
    const f = h("form", {class: "ak-form", "data-pm-buat": "1"}, h("div", {class: "ak-grid"}, h("label", null, "Nama", h("input", {name: "nama", required: true, placeholder: "Nama orang atau lembaga", autocomplete: "off"})),
      h("label", null, "Sandi awal (opsional)", h("input", {name: "sandi", type: "text", minlength: "8", maxlength: "64", placeholder: "Kosongkan untuk sandi acak", autocomplete: "new-password", spellcheck: "false"}))),
      cekTab(["berita"]), h("p", {class: "ak-galat", role: "alert"}), tombol("Buat akun pemirsa", {type: "submit"}, "utama"));
    const xs = P.pemirsa, rows = xs.flatMap(p => { const hidup = p.status === "aktif";
      return [h("tr", {"data-pm": p.id, class: hidup ? "" : "redup"},
        h("td", null, h("b", {teks: p.nama}), h("small", {teks: "@" + p.username})),
        h("td", null, h("div", {class: "ak-akses"}, ...p.tab.map(t => pil(P.tab_label[t] || t, "akses")))),
        h("td", null, pil(hidup ? "Aktif" : "Dicabut", hidup ? "aktif" : "dicabut"), h("small", {teks: "Dibuat " + tgl(p.dibuat)})),
        h("td", null, hidup ? h("div", {class: "ak-aksi"}, tombol(pmUbah === p.id ? "Tutup" : "Ubah tab", {"data-pm-aksi": "ubah-buka"}), tombol("Reset sandi", {"data-pm-aksi": "reset"}), tombol("Cabut", {"data-pm-aksi": "cabut"}, "bahaya")) : null)),
        pmUbah === p.id ? h("tr", {class: "ak-ubah", "data-pm": p.id}, h("td", {colspan: "4"}, h("form", {class: "ak-form", "data-pm-ubah": p.id}, cekTab(p.tab), h("p", {class: "ak-galat", role: "alert"}),
          h("div", {class: "ak-aksi"}, tombol("Simpan tab", {type: "submit"}, "utama"), tombol("Batal", {"data-pm-aksi": "ubah-buka"}))))) : null]; });
    return h("section", {class: "ak-panel", id: "akPemirsa"}, h("div", {class: "ak-kepala"}, h("h2", {teks: `Akun pemirsa (${angka(xs.length)})`})),
      h("p", {class: "ak-redup", teks: "Hanya bisa melihat tab yang dicentang di situs. Tab lain disembunyikan dan alamatnya dialihkan. Masuk lewat halaman login yang sama."}),
      h("details", {class: "ak-buat-pm"}, h("summary", null, h("span", {class: "ak-plus", "aria-hidden": "true", teks: "+"}), "Buat akun pemirsa"), f),
      xs.length ? h("div", {class: "ak-tabel-wadah"}, h("table", {class: "ak-tabel ak-tabel-pm"}, h("thead", null, h("tr", null, ["Nama", "Tab yang boleh dilihat", "Status", ""].map(k => h("th", {teks: k})))), h("tbody", null, rows)))
        : h("p", {class: "ak-kosong", teks: "Belum ada akun pemirsa."}));
  }
  const gagalJaringan = {ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}};
  function gambarPemirsa() { document.getElementById("akPemirsa")?.replaceWith(panelPemirsa()); }

  /* ---------- akun instansi (ringkas; kelola di /admin/instansi) dan matriks peran ---------- */
  function panelInstansi(r) {
    if (!r) return null;
    return h("section", {class: "ak-panel"}, h("div", {class: "ak-kepala"}, h("h2", {teks: `Akun instansi (${angka(r.total)})`}), h("a", {class: "ak-btn", href: "/admin/instansi", teks: "Kelola di Akun Instansi"})),
      h("p", {class: "ak-redup", teks: "Pemprov, pemkab/pemkot, Polda, Polres, Kodam, Kodim. Dibuat massal, diklaim instansinya dengan NIP/NRP dan surat tugas, lalu diverifikasi. Akses: layar /instansi untuk wilayahnya sendiri."}),
      h("div", {class: "ak-akses"}, ...Object.entries(ST_INSTANSI).map(([k, l]) => pil(`${l}: ${angka(r.jumlah?.[k])}`, k === "menunggu" && r.jumlah?.[k] ? "ganti" : ""))));
  }
  function panelMatriks() {
    const hal = [...new Map(Object.values(D.akses).flat().map(x => [x.k, x])).values()];
    return h("details", {class: "ak-panel"}, h("summary", {teks: "Peran dan halaman yang dibukanya"}),
      h("p", {class: "ak-redup", teks: "Super Admin dan moderator membuka semua halaman admin. Staf hanya membuka halaman sesuai perannya; wilayah membatasi data yang bisa diubah."}),
      h("div", {class: "ak-tabel-wadah"}, h("table", {class: "ak-tabel ak-matriks"},
        h("thead", null, h("tr", null, h("th", {teks: "Peran"}), ...hal.map(x => h("th", {teks: `${x.ikon} ${x.label}`})))),
        h("tbody", null, Object.entries(D.peran).map(([p, l]) => h("tr", null, h("td", null, h("b", {teks: l})), ...hal.map(x => h("td", {class: "ak-tanda", teks: D.akses[p].some(y => y.k === x.k) ? "✓" : ""}))))))));
  }

  /* ---------- muat dan aksi ---------- */
  async function muat() {
    const r = await fetch("/api/staf/admin/daftar").catch(() => null);
    if (!r) { app.replaceChildren(h("p", {class: "ak-kosong", teks: "Jaringan putus. Muat ulang halaman."})); return; }
    if (r.status === 403) { app.replaceChildren(h("p", {class: "ak-kosong", teks: "Halaman Akun hanya untuk Super Admin."})); return; }
    if (r.status === 503) { app.replaceChildren(h("p", {class: "ak-kosong", teks: "Akun staf belum diaktifkan (migrasi D1 0030_staf belum diterapkan)."})); return; }
    if (!r.ok) { app.replaceChildren(h("p", {class: "ak-kosong", teks: `Galat ${r.status}. Daftar akun belum bisa dimuat.`})); return; }
    const [d, ins, pm] = await Promise.all([r.json(), fetch("/api/instansi/admin/akun").then(x => x.ok ? x.json() : null).catch(() => null),
      fetch("/api/pemirsa/admin/daftar").then(x => x.ok ? x.json() : null).catch(() => null)]);
    D = d; P = pm && {...pm, tab_label: pm.tab}; gambar(ins);
  }
  app.addEventListener("input", e => { if (e.target.matches("[data-cari]")) { F.q = e.target.value; tunda(); } });
  app.addEventListener("submit", async e => {
    const pf = e.target.closest("[data-pm-buat], [data-pm-ubah]");
    if (pf) { e.preventDefault(); const fd = new FormData(pf), b = pf.querySelector("[type=submit]"), baru = pf.dataset.pmBuat; b.disabled = true;
      const x = await Admin.kirim(baru ? "/api/pemirsa/admin/buat" : "/api/pemirsa/admin/" + pf.dataset.pmUbah, baru ? {nama: fd.get("nama"), tab: fd.getAll("tab"), sandi: fd.get("sandi") || undefined} : {aksi: "ubah", tab: fd.getAll("tab")}).catch(() => gagalJaringan); b.disabled = false;
      if (!x.ok) { pf.querySelector(".ak-galat").textContent = x.j.galat || `Gagal (${x.status})`; return; }
      rahasia = baru ? {nama: x.j.pemirsa.nama, username: x.j.username, sandi: x.j.sandi, pemirsa: true} : null; pmUbah = null; return muat(); }
    const f = e.target.closest("[data-ubah]"); if (!f) return;
    e.preventDefault(); const fd = new FormData(f), b = f.querySelector("[type=submit]"); b.disabled = true;
    const x = await Admin.kirim("/api/staf/admin/" + f.dataset.ubah, {aksi: "ubah", peran: fd.getAll("peran"), wilayah: fd.getAll("wilayah")}).catch(() => ({ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}})); b.disabled = false;
    if (!x.ok) { f.querySelector(".ak-galat").textContent = x.j.galat || `Gagal (${x.status})`; return; }
    ubahId = null; rahasia = null; muat();
  });
  app.addEventListener("click", async e => {
    const k = e.target.closest("[data-status]");
    if (k) { F.status = F.status === k.dataset.status ? "" : k.dataset.status; for (const x of app.querySelectorAll("[data-status]")) x.setAttribute("aria-pressed", String(x.dataset.status === F.status)); tunda(); return; }
    const pb = e.target.closest("[data-pm-aksi]");
    if (pb) { const id = pb.closest("[data-pm]").dataset.pm, p = P.pemirsa.find(x => x.id === id), a = pb.dataset.pmAksi;
      if (a === "ubah-buka") { pmUbah = pmUbah === id ? null : id; gambarPemirsa(); return; }
      let sandi;
      if (a === "cabut") { if (!confirm(`Cabut akun pemirsa ${p.nama}? Ia langsung keluar dan tidak bisa masuk lagi.`)) return; }
      else { sandi = prompt(`Reset sandi ${p.nama}. Sandi lama langsung tidak berlaku.\nKetik sandi baru (8 sampai 64 karakter), atau kosongkan untuk sandi acak:`, ""); if (sandi === null) return; }
      pb.disabled = true; const x = await Admin.kirim("/api/pemirsa/admin/" + id, {aksi: a, sandi: sandi || undefined}).catch(() => gagalJaringan); pb.disabled = false;
      if (!x.ok) { alert(x.j.galat || `Gagal (${x.status})`); return; }
      rahasia = a === "reset" ? {nama: p.nama, username: p.username, sandi: x.j.sandi, pemirsa: true} : null; return muat(); }
    const b = e.target.closest("[data-aksi]"); if (!b) return;
    const id = b.closest("[data-staf]").dataset.staf, s = D.staf.find(x => x.id === id), a = b.dataset.aksi;
    if (a === "ubah-buka") { ubahId = ubahId === id ? null : id; tunda(); return; }
    if (a === "cabut" && !confirm(`Cabut akun ${s.nama}? Sesinya langsung berakhir dan akun tidak bisa dipakai lagi.`)) return;
    if (a === "reset" && !confirm(`Reset sandi ${s.nama}? Sandi lama langsung tidak berlaku.`)) return;
    b.disabled = true; const x = await Admin.kirim("/api/staf/admin/" + id, {aksi: a}).catch(() => ({ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}})); b.disabled = false;
    if (!x.ok) { alert(x.j.galat || `Gagal (${x.status})`); return; }
    rahasia = a === "reset" ? {nama: s.nama, username: s.username, sandi: x.j.sandi} : null; muat();
  });
  muat();
})();
