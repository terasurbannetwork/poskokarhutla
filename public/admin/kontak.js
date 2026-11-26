/* Buku kontak (/admin/kontak): daftar pemangku kepentingan per wilayah, tambah/ubah/hapus, impor dan unduh CSV. Data: /api/kontak/admin* (src/kontak.js).
   Kab/kota dipilih dari kunci public/banjir/data/pusat_kec.json (ejaan data; tampilan lewat Wilayah.kab). Gaya dari akun.css (ak-*), kit dashboard (Admin.dasbor) + kontak.css (kt-*).
   CSP admin: tanpa skrip/gaya inline; teks dari data lewat textContent. */
(() => {
  const app = Admin.dasbor.tumpuk(document.getElementById("app")), DB = Admin.dasbor;
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const nomor = w => "+62 " + w.slice(2).replace(/^(\d{3})(\d{4})(\d+)$/, "$1-$2-$3");   // 6281234567890 -> +62 812-3456-7890
  const angka = n => Number(n ?? 0).toLocaleString("id-ID");
  const tgl = t => t ? new Date(t).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}) : null;
  const KOL = ["nama", "jabatan", "lembaga", "kategori", "prov", "kab", "wa", "email", "telepon", "ajudan", "ajudan_wa", "notif", "ambang", "catatan"];
  const AMBANG = {semua: "Semua kejadian", siaga: "Siaga ke atas", awas: "Awas saja"};
  const gagalJaringan = {ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}};
  let D = null, KAB = {}, ubah = null, saring = {q: "", prov: "", kat: "", status: ""}, pesanImpor = null;

  const opsi = (obj, pilih, semua) => [semua != null ? h("option", {value: "", teks: semua}) : null,
    ...Object.entries(obj).map(([k, v]) => h("option", {value: k, selected: k === pilih, teks: v}))];
  const isian = (label, el, kelas) => h("label", {class: kelas}, label, el);

  /* kelengkapan: tiap provinsi (gubernur) dan kab/kota (bupati/wali kota) idealnya punya kontak kepala daerah dan BPBD */
  function kelengkapan() {
    const wilayah = Object.keys(D.provinsi).length + Object.values(KAB).reduce((a, l) => a + l.length, 0);
    const ada = kat => new Set(D.kontak.filter(k => k.status === "aktif" && k.kategori === kat && k.prov).map(k => k.prov + "|" + (k.kab || ""))).size;
    const tunggu = D.kontak.filter(k => k.status === "menunggu").length;
    return DB.ubinGrid(
      DB.ubin({ikon: "telepon", label: "Kontak", nilai: angka(D.kontak.length), ket: "semua pemangku kepentingan"}),
      DB.ubin({ikon: "staf", label: "Kepala daerah", nilai: `${angka(ada("kepala_daerah"))} / ${angka(wilayah)}`, ket: "wilayah terisi"}),
      DB.ubin({ikon: "gedung", label: "BPBD", nilai: `${angka(ada("bpbd"))} / ${angka(wilayah)}`, ket: "wilayah terisi"}),
      DB.ubin({ikon: "jam", label: "Menunggu persetujuan", nilai: angka(tunggu), ket: "saring daftar", warna: tunggu ? "oranye" : "", saring: "menunggu", aktif: saring.status === "menunggu"}),
      DB.ubin({ikon: "lonceng", label: "Menerima notifikasi", nilai: angka(D.kontak.filter(k => k.status === "aktif" && k.notif).length), ket: "aktif dan setuju"}));
  }

  function formulir(k) {
    k = k || {kategori: "kepala_daerah", notif: 1, ambang: "siaga"};
    const prov = h("select", {name: "prov"}, ...opsi(D.provinsi, k.prov || "", "Nasional (tanpa provinsi)"));
    const kab = h("select", {name: "kab"});
    const isiKab = () => kab.replaceChildren(h("option", {value: "", teks: prov.value ? "Tingkat provinsi" : "–"}),
      ...(KAB[prov.value] || []).map(a => h("option", {value: a, selected: a === k.kab, teks: Wilayah.kab(a)})));
    prov.addEventListener("change", isiKab); isiKab();
    const masuk = (name, v, att = {}) => h("input", {name, value: v ?? "", autocomplete: "off", ...att});
    return h("form", {class: "ak-form", "data-simpan": k.id || "baru"},
      h("div", {class: "ak-grid"},
        isian("Nama lengkap", masuk("nama", k.nama, {required: true, minlength: "2", maxlength: "100"})),
        isian("Jabatan", masuk("jabatan", k.jabatan, {required: true, minlength: "2", maxlength: "100", placeholder: "Bupati, Kalaksa BPBD, Kapolda, Danrem…"})),
        isian("Lembaga / satuan", masuk("lembaga", k.lembaga, {maxlength: "120", placeholder: "Pemkab Pulang Pisau, Polda Kalteng…"})),
        isian("Kategori", h("select", {name: "kategori"}, ...opsi(D.kategori, k.kategori))),
        isian("Provinsi", prov), isian("Kabupaten/kota", kab),
        isian("Nomor WA", masuk("wa", k.wa, {inputmode: "tel", placeholder: "0812…"})),
        isian("Email", masuk("email", k.email, {type: "email", maxlength: "254"})),
        isian("Telepon kantor", masuk("telepon", k.telepon, {inputmode: "tel", maxlength: "20"})),
        isian("Nama ajudan / sespri", masuk("ajudan", k.ajudan, {maxlength: "100"})),
        isian("WA ajudan", masuk("ajudan_wa", k.ajudan_wa, {inputmode: "tel"})),
        isian("Kirim notifikasi untuk", h("select", {name: "ambang"}, ...opsi(AMBANG, k.ambang)))),
      isian("Catatan", h("textarea", {name: "catatan", rows: "2", maxlength: "500", teks: k.catatan || ""})),
      h("div", {class: "kt-cek"},
        h("label", {class: "ak-cek"}, h("input", {type: "checkbox", name: "notif", checked: !!k.notif}), "Setuju menerima notifikasi kejadian"),
        h("label", {class: "ak-cek"}, h("input", {type: "checkbox", name: "cek"}), k.diverifikasi ? `Nomor dicek ulang hari ini (terakhir ${tgl(k.diverifikasi)})` : "Nomor sudah dicek hari ini")),
      h("p", {class: "ak-galat", role: "alert"}),
      h("div", {class: "kt-aksi"}, h("button", {class: "ak-btn utama", type: "submit"}, k.id ? "Simpan perubahan" : "Tambah kontak"),
        k.id ? h("button", {class: "ak-btn", type: "button", "data-batal": "1"}, "Batal") : null));
  }

  const cocok = k => (!saring.status || k.status === saring.status) && (!saring.prov || (saring.prov === "nasional" ? !k.prov : k.prov === saring.prov)) && (!saring.kat || k.kategori === saring.kat)
    && (!saring.q || [k.nama, k.jabatan, k.lembaga, k.kab, k.wa, k.email, k.ajudan].some(v => v && v.toLowerCase().includes(saring.q)));

  /* satu baris kontak: provinsi dan kab/kota berkolom sendiri; WA dan surel jadi ikon di kolom Aksi (pemilik 26 Nov 2026) */
  const KOLOM = ["Nama dan jabatan", "Kategori", "Provinsi", "Kab/kota", "Ajudan", "Notifikasi", "Aksi"];
  const kosong = () => h("span", {class: "db-ik kt-kosong", "aria-hidden": "true"});   // slot ikon tetap supaya kolom Aksi sejajar antarbaris
  function baris(k) {
    const wa = (n, siapa) => DB.tautanIkon("wa", `WhatsApp ${siapa} ${nomor(n)}`, "https://wa.me/" + n, "kt-wa");
    const tr = h("tr", {"data-id": k.id},
      h("td", null, h("b", {teks: k.nama}), h("small", {teks: k.jabatan}), k.lembaga ? h("small", {teks: k.lembaga}) : null, k.telepon ? h("small", {teks: "Kantor " + k.telepon}) : null),
      h("td", null, h("span", {class: "ak-pil akses", teks: D.kategori[k.kategori]})),
      h("td", null, h("span", {teks: k.prov ? Wilayah.prov(k.prov) : "Nasional"})),
      h("td", null, h("span", {teks: k.kab ? Wilayah.kab(k.kab) : "–"})),
      h("td", null, k.ajudan || k.ajudan_wa ? h("div", {class: "kt-ajudan"}, h("span", {teks: k.ajudan || "Ajudan"}), k.ajudan_wa ? wa(k.ajudan_wa, "ajudan") : null) : h("small", {teks: "–"})),
      h("td", null, k.status === "menunggu" ? h("span", {class: "ak-pil ganti", teks: "Menunggu"}) : null,
        h("span", {class: "ak-pil " + (k.notif ? "aktif" : "dicabut"), teks: k.notif ? AMBANG[k.ambang] : "Tidak"}),
        k.status === "menunggu" ? h("small", {teks: "Registrasi " + tgl(k.dibuat)}) : null,
        h("small", {teks: k.diverifikasi ? "Dicek " + tgl(k.diverifikasi) : "Belum dicek"})),
      h("td", null, DB.aksi(k.wa ? wa(k.wa, k.nama) : kosong(), k.email ? DB.tautanIkon("surel", "Email " + k.email, "mailto:" + k.email, "kt-surel") : kosong(),
        k.status === "menunggu" ? DB.ikon("cek", "Setujui " + k.nama, {"data-setujui": "1"}) : null,
        DB.ikon("ubah", "Ubah " + k.nama, {"data-ubah": "1"}), DB.ikon("hapus", "Hapus " + k.nama, {"data-hapus": "1"}, "bahaya"))));
    return ubah === k.id ? [tr, h("tr", {class: "ak-ubah"}, h("td", {colspan: String(KOLOM.length)}, formulir(k)))] : tr;
  }

  /* daftar dilipat per provinsi (pemilik 26 Nov 2026): satu tbody per provinsi, kepalanya tombol buka-tutup. Tertutup bawaan;
     terbuka semua saat mencari atau menyaring satu provinsi. Provinsi yang dibuka pengguna diingat selama halaman terbuka. */
  const buka = new Set();
  function gambarDaftar() {
    const l = D.kontak.filter(cocok), w = app.querySelector("#ktDaftar");
    app.querySelector("#ktHitung").textContent = `${angka(l.length)} dari ${angka(D.kontak.length)} kontak`;
    if (!l.length) return void w.replaceChildren(h("p", {class: "ak-kosong", teks: D.kontak.length ? "Tidak ada kontak yang cocok." : "Belum ada kontak. Tambah satu per satu atau impor CSV."}));
    const grup = new Map();
    for (const k of l) { const g = k.prov || ""; if (!grup.has(g)) grup.set(g, []); grup.get(g).push(k); }
    const nama = g => g ? Wilayah.prov(g) : "Nasional", semuaBuka = !!(saring.q || saring.prov);
    const urut = [...grup.keys()].sort((a, b) => (a === "") - (b === "") || nama(a).localeCompare(nama(b), "id"));
    const wadah = DB.tabel(KOLOM, [], "kt-tabel"), tabel = wadah.querySelector("table");
    tabel.querySelector("tbody").remove();
    for (const g of urut) {
      const isi = grup.get(g), terbuka = semuaBuka || buka.has(g) || isi.some(k => k.id === ubah);
      const tombol = h("button", {type: "button", class: "kt-prov-b", "data-prov-lipat": g, "aria-expanded": String(terbuka)}, h("span", {teks: nama(g)}), h("small", {teks: `${angka(isi.length)} kontak`}));
      tabel.append(h("tbody", {class: "kt-prov" + (terbuka ? " buka" : "")}, h("tr", {class: "kt-prov-kepala"}, h("th", {colspan: String(KOLOM.length), scope: "rowgroup"}, tombol)),
        ...(terbuka ? isi.flatMap(baris) : [])));
    }
    w.replaceChildren(wadah);
  }

  /* PF-09 (profil-bpbd K13): PIC BPBD yang sudah disetujui admin, nomor tersamar; nomor penuh hanya lewat meja BNPB (tercatat). */
  function kartuPic() {
    const hasil = h("div", {class: "ak-redup", "aria-live": "polite"}), prov = h("select", {"aria-label": "Provinsi PIC"}, ...opsi(D.provinsi, "", "Pilih provinsi"));
    const kab = h("input", {class: "ak-cari", type: "search", placeholder: "Kab/kota (kosong = BPBD provinsi)", "aria-label": "Kabupaten atau kota", maxlength: "60"}), cari = h("button", {class: "ak-btn", type: "button", teks: "Tampilkan PIC"});
    cari.addEventListener("click", async () => {
      if (!prov.value) return void hasil.replaceChildren("Pilih provinsi dulu.");
      cari.disabled = true; hasil.replaceChildren("Memuat...");
      try {
        const r = await fetch(`/api/kontak/admin/pic?prov=${encodeURIComponent(prov.value)}&kab=${encodeURIComponent(kab.value.trim())}`, {signal: AbortSignal.timeout(15000)});
        if (!r.ok) return void hasil.replaceChildren("PIC belum bisa dimuat.");
        const d = await r.json();
        hasil.replaceChildren(d.pic.length ? h("ul", null, d.pic.map(p => h("li", {teks: `${p.nama}, ${p.jabatan}, ${p.bpbd}, ${p.wa_samar}`}))) : "Belum ada PIC aktif di BPBD ini; Pusdalops memakai kontak situs resmi.");
      } catch (e) { hasil.replaceChildren("PIC belum bisa dimuat."); } finally { cari.disabled = false; }
    });
    return DB.kartu({ikon: "orang", judul: "PIC BPBD terdaftar", ey: "Profil"}, h("p", {class: "ak-redup", teks: "PIC yang disetujui admin dan sedang aktif. Nomor tersamar; nomor penuh dibuka lewat meja laporan dan tercatat."}), h("div", {class: "kt-aksi"}, prov, kab, cari), hasil);
  }
  function gambar() {
    const filter = h("div", {class: "kt-filter"},
      h("select", {"data-saring": "prov", "aria-label": "Provinsi"}, ...opsi({nasional: "Nasional", ...D.provinsi}, saring.prov, "Semua wilayah")),
      h("select", {"data-saring": "kat", "aria-label": "Kategori"}, ...opsi(D.kategori, saring.kat, "Semua kategori")),
      h("select", {"data-saring": "status", "aria-label": "Status"}, ...opsi({menunggu: "Menunggu persetujuan", aktif: "Aktif"}, saring.status, "Semua status")));
    app.replaceChildren(kelengkapan(), kartuPic(),
      DB.kartu({ikon: "tambah", judul: "Tambah dan impor", ey: "Kontak"},
        h("p", {class: "ak-redup"}, "Formulir registrasi untuk dibagikan ke pemangku kepentingan: ", h("a", {href: "/daftar-kontak", target: "_blank", rel: "noopener", teks: location.origin + "/daftar-kontak"}),
          ". Registrasi masuk sebagai Menunggu dan baru aktif setelah disetujui."),
        h("details", {class: "ak-buat-pm", open: !D.kontak.length}, h("summary", null, h("span", {class: "ak-plus", "aria-hidden": "true", teks: "+"}), "Tambah kontak"), formulir(null)),
        h("details", {class: "ak-buat-pm", open: !!pesanImpor}, h("summary", null, h("span", {class: "ak-plus", "aria-hidden": "true", teks: "+"}), "Impor dan unduh CSV"),
          h("p", {class: "ak-redup", teks: `Kolom: ${KOL.join(", ")}. Kategori pakai kode (${Object.keys(D.kategori).join(", ")}). Provinsi boleh kode BPS atau nama; kosong = nasional. Kab/kota memakai ejaan daftar wilayah. Satu baris salah = tidak ada yang masuk.`}),
          h("div", {class: "kt-aksi"}, h("label", {class: "ak-btn"}, "Pilih berkas CSV", h("input", {type: "file", accept: ".csv,text/csv", "data-impor": "1", class: "kt-sembunyi"})),
            h("button", {class: "ak-btn", type: "button", "data-unduh": "templat"}, "Unduh templat"),
            h("button", {class: "ak-btn", type: "button", "data-unduh": "semua"}, "Unduh semua kontak")),
          pesanImpor ? h("pre", {class: "kt-pesan" + (pesanImpor.ok ? " ok" : ""), teks: pesanImpor.teks}) : null)),
      DB.kartu({ikon: "telepon", judul: "Daftar kontak", ey: "Pemangku kepentingan",
        kanan: h("span", {class: "ak-kanan"}, h("input", {class: "ak-cari", type: "search", "data-saring": "q", placeholder: "Cari nama, jabatan, nomor", value: saring.q, "aria-label": "Cari kontak"}), h("span", {class: "ak-hitung", id: "ktHitung"}))},
        filter, h("div", {id: "ktDaftar"})));
    gambarDaftar();
  }

  async function muat() {
    const [r, kec] = await Promise.all([fetch("/api/kontak/admin").catch(() => null), fetch("/banjir/data/pusat_kec.json").then(x => x.ok ? x.json() : {}).catch(() => ({}))]);
    if (!r) return app.replaceChildren(h("p", {class: "ak-kosong", teks: "Jaringan putus. Muat ulang halaman."}));
    if (r.status === 403) return Admin.keMasuk().catch(e => app.replaceChildren(h("p", {class: "ak-kosong", teks: e.message})));
    if (r.status === 503) return app.replaceChildren(h("p", {class: "ak-kosong", teks: "Buku kontak belum aktif (migrasi D1 0053_kontak belum diterapkan)."}));
    if (!r.ok) return app.replaceChildren(h("p", {class: "ak-kosong", teks: `Galat ${r.status}. Daftar belum bisa dimuat.`}));
    D = await r.json();
    if (!Object.keys(KAB).length) for (const key of Object.keys(kec)) { const [p, a] = key.split("|"); if (a && a !== "None") (KAB[p] ||= new Set()).add(a); }
    for (const p in KAB) if (KAB[p] instanceof Set) KAB[p] = [...KAB[p]].sort((a, b) => a.localeCompare(b, "id"));
    gambar();
  }

  /* awalan rumus (= + - @) dinetralkan dengan ' hanya di kolom teks bebas; kolom nomor dijaga server (digit saja), jadi tidak dirusak */
  const BEBAS = new Set(["nama", "jabatan", "lembaga", "ajudan", "catatan", "kab"]);
  const selCsv = (v, c) => { v = v == null ? "" : String(v); const rumus = BEBAS.has(c) && /^[=+\-@]/.test(v); return rumus || /[",;\n\r]/.test(v) ? '"' + (rumus ? "'" : "") + v.replace(/"/g, '""') + '"' : v; };
  function unduh(semua) {
    const isi = semua ? D.kontak.map(k => KOL.map(c => selCsv(k[c], c)).join(",")) : [["Nama Lengkap", "Bupati", "Pemkab Contoh", "kepala_daerah", "62", "Pulang Pisau", "081234567890", "", "", "", "", "1", "siaga", ""].join(",")];
    const a = h("a", {href: URL.createObjectURL(new Blob(["﻿" + [KOL.join(","), ...isi].join("\r\n")], {type: "text/csv"})), download: semua ? "kontak-pemangku-kepentingan.csv" : "templat-kontak.csv"});
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  async function impor(berkas) {
    const {uraiCsv} = await import("/inti/impor.js");   // pengurai CSV bersama (FITUR §7.5)
    const sel = uraiCsv(await berkas.text()), kepala = (sel.shift() || []).map(x => x.trim().toLowerCase());
    const hilang = ["nama", "jabatan", "kategori"].filter(c => !kepala.includes(c));
    if (hilang.length) { pesanImpor = {teks: "Judul kolom tidak ada: " + hilang.join(", ")}; return gambar(); }
    const namaProv = Object.fromEntries(Object.entries(D.provinsi).map(([k, v]) => [v.toLowerCase(), k]));
    const baris = sel.map(r => { const o = {}; kepala.forEach((c, i) => { if (KOL.includes(c)) o[c] = (r[i] || "").trim(); });
      if (o.prov && !D.provinsi[o.prov]) o.prov = namaProv[o.prov.toLowerCase()] || o.prov;
      if (o.notif === "") delete o.notif; return o; });
    if (!confirm(`Impor ${angka(baris.length)} kontak dari ${berkas.name}?`)) return;
    const x = await Admin.kirim("/api/kontak/admin/impor", {baris}).catch(() => gagalJaringan);
    pesanImpor = x.ok ? {ok: true, teks: `${angka(x.j.masuk)} kontak masuk.`} : {teks: [x.j.galat || `Gagal (${x.status})`, ...(x.j.rincian || [])].join("\n")};
    if (x.ok) muat(); else gambar();
  }

  app.addEventListener("input", e => { const s = e.target.closest("[data-saring]"); if (!s) return; saring[s.dataset.saring] = s.dataset.saring === "q" ? s.value.trim().toLowerCase() : s.value;
    if (s.dataset.saring === "status") app.querySelector(".db-saring")?.setAttribute("aria-pressed", String(saring.status === "menunggu")); cancelAnimationFrame(jadwalCari); jadwalCari = requestAnimationFrame(() => setTimeout(gambarDaftar, 0)); });
  let jadwalCari = 0;
  app.addEventListener("change", e => { const f = e.target.closest("[data-impor]"); if (f?.files[0]) { impor(f.files[0]); f.value = ""; } });
  app.addEventListener("submit", async e => {
    const f = e.target.closest("[data-simpan]"); if (!f) return;
    e.preventDefault(); const fd = new FormData(f), id = f.dataset.simpan, lama = D.kontak.find(k => k.id === id);
    const b = Object.fromEntries(KOL.filter(c => c !== "notif").map(c => [c, String(fd.get(c) ?? "").trim()]));
    b.notif = fd.get("notif") ? 1 : 0;
    b.diverifikasi = fd.get("cek") ? Date.now() : lama?.diverifikasi ?? null;
    const t = f.querySelector("[type=submit]"); t.disabled = true;
    const x = await Admin.kirim(id === "baru" ? "/api/kontak/admin" : "/api/kontak/admin/" + id, b).catch(() => gagalJaringan); t.disabled = false;
    if (!x.ok) { f.querySelector(".ak-galat").textContent = x.j.galat || `Gagal (${x.status})`; return; }
    ubah = null; muat();
  });
  app.addEventListener("click", async e => {
    const ub = e.target.closest(".db-saring");
    if (ub) {   // chrome urgent (aria-pressed, pilihan status), tabel menyusul sesudah satu frame
      saring.status = saring.status === ub.dataset.saring ? "" : ub.dataset.saring; ub.setAttribute("aria-pressed", String(saring.status === "menunggu"));
      const sel = app.querySelector("select[data-saring=status]"); if (sel) sel.value = saring.status;
      return void requestAnimationFrame(() => setTimeout(gambarDaftar, 0));
    }
    const lp = e.target.closest("[data-prov-lipat]");
    if (lp) { const g = lp.dataset.provLipat, tb = lp.closest("tbody"), bukaKini = lp.getAttribute("aria-expanded") !== "true";
      lp.setAttribute("aria-expanded", String(bukaKini)); bukaKini ? buka.add(g) : buka.delete(g);   // chrome urgent; baris digambar sesudah satu frame (INP)
      return void requestAnimationFrame(() => setTimeout(() => { tb.classList.toggle("buka", bukaKini); const kp = tb.firstElementChild;
        tb.replaceChildren(kp, ...(bukaKini ? D.kontak.filter(cocok).filter(k => (k.prov || "") === g).flatMap(baris) : [])); }, 0)); }
    const u = e.target.closest("[data-unduh]"); if (u) return unduh(u.dataset.unduh === "semua");
    if (e.target.closest("[data-batal]")) { ubah = null; return gambarDaftar(); }
    const tr = e.target.closest("tr[data-id]"); if (!tr) return;
    const id = tr.dataset.id, k = D.kontak.find(x => x.id === id);
    if (e.target.closest("[data-ubah]")) { ubah = ubah === id ? null : id; return gambarDaftar(); }
    const st = e.target.closest("[data-setujui]");
    if (st) { st.disabled = true; const x = await Admin.kirim("/api/kontak/admin/setujui/" + id, {}).catch(() => gagalJaringan); st.disabled = false;
      return x.ok ? muat() : alert(x.j.galat || `Gagal (${x.status})`); }
    const d = e.target.closest("[data-hapus]"); if (!d || !confirm(`Hapus kontak ${k.nama} (${k.jabatan})? Tidak bisa dipulihkan.`)) return;
    d.disabled = true; const x = await Admin.kirim("/api/kontak/admin/hapus/" + id, {}).catch(() => gagalJaringan); d.disabled = false;
    if (!x.ok) return alert(x.j.galat || `Gagal (${x.status})`);
    muat();
  });
  muat();
})();
