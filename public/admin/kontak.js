/* Buku kontak (/admin/kontak): daftar pemangku kepentingan per wilayah, tambah/ubah/hapus, impor dan unduh CSV. Data: /api/kontak/admin* (src/kontak.js).
   Kab/kota dipilih dari kunci public/banjir/data/pusat_kec.json (ejaan data; tampilan lewat Wilayah.kab). Gaya dari akun.css (ak-*) + kontak.css (kt-*).
   CSP admin: tanpa skrip/gaya inline; teks dari data lewat textContent. */
(() => {
  const app = document.getElementById("app");
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

  const wil = k => k.prov ? (k.kab ? Wilayah.kab(k.kab) + ", " : "") + Wilayah.prov(k.prov) : "Nasional";
  const opsi = (obj, pilih, semua) => [semua != null ? h("option", {value: "", teks: semua}) : null,
    ...Object.entries(obj).map(([k, v]) => h("option", {value: k, selected: k === pilih, teks: v}))];
  const isian = (label, el, kelas) => h("label", {class: kelas}, label, el);

  /* kelengkapan: tiap provinsi (gubernur) dan kab/kota (bupati/wali kota) idealnya punya kontak kepala daerah dan BPBD */
  function kelengkapan() {
    const wilayah = Object.keys(D.provinsi).length + Object.values(KAB).reduce((a, l) => a + l.length, 0);
    const ada = kat => new Set(D.kontak.filter(k => k.status === "aktif" && k.kategori === kat && k.prov).map(k => k.prov + "|" + (k.kab || ""))).size;
    return h("div", {class: "kt-ringkas"}, ...[["Kontak", D.kontak.length, null], ["Kepala daerah", ada("kepala_daerah"), wilayah], ["BPBD", ada("bpbd"), wilayah],
      ["Menunggu persetujuan", D.kontak.filter(k => k.status === "menunggu").length, null],
      ["Menerima notifikasi", D.kontak.filter(k => k.status === "aktif" && k.notif).length, null]].map(([l, n, dari]) =>
      h("div", {class: "kt-angka"}, h("b", {teks: angka(n) + (dari ? " / " + angka(dari) : "")}), h("small", {teks: dari ? `${l}: wilayah terisi` : l}))));
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

  function baris(k) {
    const kontak = [k.wa && h("a", {href: "https://wa.me/" + k.wa, target: "_blank", rel: "noopener noreferrer", teks: "WA " + nomor(k.wa)}),
      k.email && h("a", {href: "mailto:" + k.email, teks: k.email}), k.telepon && h("small", {teks: "Kantor " + k.telepon})];
    const tr = h("tr", {"data-id": k.id},
      h("td", null, h("b", {teks: k.nama}), h("small", {teks: k.jabatan}), k.lembaga ? h("small", {teks: k.lembaga}) : null),
      h("td", null, h("span", {class: "ak-pil akses", teks: D.kategori[k.kategori]}), h("small", {teks: wil(k)})),
      h("td", null, h("div", {class: "kt-kontak"}, ...kontak)),
      h("td", null, k.ajudan || k.ajudan_wa ? [h("span", {teks: k.ajudan || "Ajudan"}), k.ajudan_wa ? h("a", {href: "https://wa.me/" + k.ajudan_wa, target: "_blank", rel: "noopener noreferrer", teks: "WA " + nomor(k.ajudan_wa)}) : null] : h("small", {teks: "–"})),
      h("td", null, k.status === "menunggu" ? h("span", {class: "ak-pil ganti", teks: "Menunggu"}) : null,
        h("span", {class: "ak-pil " + (k.notif ? "aktif" : "dicabut"), teks: k.notif ? AMBANG[k.ambang] : "Tidak"}),
        k.status === "menunggu" ? h("small", {teks: "Registrasi " + tgl(k.dibuat)}) : null,
        h("small", {teks: k.diverifikasi ? "Dicek " + tgl(k.diverifikasi) : "Belum dicek"})),
      h("td", null, h("div", {class: "kt-aksi"}, k.status === "menunggu" ? h("button", {class: "ak-btn utama", type: "button", "data-setujui": "1"}, "Setujui") : null,
        h("button", {class: "ak-btn", type: "button", "data-ubah": "1"}, "Ubah"), h("button", {class: "ak-btn bahaya", type: "button", "data-hapus": "1"}, "Hapus"))));
    return ubah === k.id ? [tr, h("tr", {class: "ak-ubah"}, h("td", {colspan: "6"}, formulir(k)))] : tr;
  }

  function gambarDaftar() {
    const l = D.kontak.filter(cocok), w = app.querySelector("#ktDaftar");
    w.replaceChildren(h("p", {class: "ak-redup", teks: `${angka(l.length)} dari ${angka(D.kontak.length)} kontak`}),
      l.length ? h("div", {class: "ak-tabel-wadah"}, h("table", {class: "ak-tabel kt-tabel"},
        h("thead", null, h("tr", null, ["Nama & jabatan", "Kategori & wilayah", "Kontak", "Ajudan", "Notifikasi", ""].map(t => h("th", {teks: t})))),
        h("tbody", null, l.flatMap(baris)))) : h("p", {class: "ak-kosong", teks: D.kontak.length ? "Tidak ada kontak yang cocok." : "Belum ada kontak. Tambah satu per satu atau impor CSV."}));
  }

  function gambar() {
    const filter = h("div", {class: "kt-filter"},
      h("input", {type: "search", "data-saring": "q", placeholder: "Cari nama, jabatan, nomor…", value: saring.q, "aria-label": "Cari kontak"}),
      h("select", {"data-saring": "prov", "aria-label": "Provinsi"}, ...opsi({nasional: "Nasional", ...D.provinsi}, saring.prov, "Semua wilayah")),
      h("select", {"data-saring": "kat", "aria-label": "Kategori"}, ...opsi(D.kategori, saring.kat, "Semua kategori")),
      h("select", {"data-saring": "status", "aria-label": "Status"}, ...opsi({menunggu: "Menunggu persetujuan", aktif: "Aktif"}, saring.status, "Semua status")));
    app.replaceChildren(kelengkapan(),
      h("p", {class: "ak-redup"}, "Formulir registrasi untuk dibagikan ke pemangku kepentingan: ", h("a", {href: "/daftar-kontak", target: "_blank", rel: "noopener", teks: location.origin + "/daftar-kontak"}),
        ". Registrasi masuk sebagai Menunggu dan baru aktif setelah disetujui."),
      h("details", {class: "ak-panel", open: !D.kontak.length}, h("summary", {teks: "Tambah kontak"}), formulir(null)),
      h("details", {class: "ak-panel", open: !!pesanImpor}, h("summary", {teks: "Impor & unduh CSV"}),
        h("p", {class: "ak-redup", teks: `Kolom: ${KOL.join(", ")}. Kategori pakai kode (${Object.keys(D.kategori).join(", ")}). Provinsi boleh kode BPS atau nama; kosong = nasional. Kab/kota memakai ejaan daftar wilayah. Satu baris salah = tidak ada yang masuk.`}),
        h("div", {class: "kt-aksi"}, h("label", {class: "ak-btn"}, "Pilih berkas CSV", h("input", {type: "file", accept: ".csv,text/csv", "data-impor": "1", class: "kt-sembunyi"})),
          h("button", {class: "ak-btn", type: "button", "data-unduh": "templat"}, "Unduh templat"),
          h("button", {class: "ak-btn", type: "button", "data-unduh": "semua"}, "Unduh semua kontak")),
        pesanImpor ? h("pre", {class: "kt-pesan" + (pesanImpor.ok ? " ok" : ""), teks: pesanImpor.teks}) : null),
      h("section", {class: "ak-panel"}, filter, h("div", {id: "ktDaftar"})));
    gambarDaftar();
  }

  async function muat() {
    const [r, kec] = await Promise.all([fetch("/api/kontak/admin").catch(() => null), fetch("/banjir/data/pusat_kec.json").then(x => x.ok ? x.json() : {}).catch(() => ({}))]);
    if (!r) return app.replaceChildren(h("p", {class: "ak-kosong", teks: "Jaringan putus. Muat ulang halaman."}));
    if (r.status === 403) { location.href = "/admin/masuk"; return; }
    if (r.status === 503) return app.replaceChildren(h("p", {class: "ak-kosong", teks: "Buku kontak belum aktif (migrasi D1 0053_kontak belum diterapkan)."}));
    if (!r.ok) return app.replaceChildren(h("p", {class: "ak-kosong", teks: `Galat ${r.status}. Daftar belum bisa dimuat.`}));
    D = await r.json();
    if (!Object.keys(KAB).length) for (const key of Object.keys(kec)) { const [p, a] = key.split("|"); if (a && a !== "None") (KAB[p] ||= new Set()).add(a); }
    for (const p in KAB) if (KAB[p] instanceof Set) KAB[p] = [...KAB[p]].sort((a, b) => a.localeCompare(b, "id"));
    gambar();
  }

  /* CSV: koma atau titik koma (Excel Indonesia), kutip ganda boleh memuat pemisah dan baris baru */
  function uraiCsv(t) {
    t = t.replace(/^﻿/, "");
    const pisah = (t.split("\n")[0].match(/;/g) || []).length > (t.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
    const out = []; let row = [], sel = "", kutip = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (kutip) { if (c === '"' && t[i + 1] === '"') { sel += '"'; i++; } else if (c === '"') kutip = false; else sel += c; }
      else if (c === '"') kutip = true;
      else if (c === pisah) { row.push(sel); sel = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(sel); out.push(row); row = []; sel = ""; }
      else sel += c;
    }
    if (sel || row.length) { row.push(sel); out.push(row); }
    return out.filter(r => r.some(x => x.trim()));
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

  app.addEventListener("input", e => { const s = e.target.closest("[data-saring]"); if (!s) return; saring[s.dataset.saring] = s.dataset.saring === "q" ? s.value.trim().toLowerCase() : s.value; gambarDaftar(); });
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
