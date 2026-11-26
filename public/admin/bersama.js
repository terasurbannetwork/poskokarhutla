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
   GET /admin/masuk dengan sesi sah membalas 303 ke ?ke=, jadi akun yang tak berhak dipantulkan balik ke halaman ini dan halaman memuat ulang tanpa henti. Selalu melempar.
   Sejak K21 tamu pun dialihkan (ke /masuk), jadi pembedanya alamat akhir: berakhir di /masuk = belum masuk, alamat lain = sesi sah tapi tak berhak. */
async function keMasuk() {
  if (BODY.staf === "1") { location.href = "/admin/pantau"; throw new Error("perlu masuk"); }
  const r = await fetch("/admin/masuk", {cache: "no-store"}).catch(() => null);
  r?.body?.cancel();
  if (r && new URL(r.url).pathname !== "/masuk") throw new Error("akunmu tidak berhak membuka data ini");
  location.href = "/masuk?ke=" + encodeURIComponent(location.pathname);
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
    return;   // tombol dummy 🧪/🧹 disembunyikan atas permintaan pemilik 11 Nov 2026 (semua proyek); pulihkan: hapus baris return ini
    const t = (aksi, judul, label, ikon) => { const b = document.createElement("button"); b.className = "ad-tombol ad-bulat"; b.dataset.dummy = aksi; b.title = judul; b.setAttribute("aria-label", label); b.textContent = ikon; return b; };
    slot.replaceChildren(...(boleh ? [t("isi", "Isi data dummy untuk halaman ini", "Isi data dummy", "🧪"), t("hapus", "Hapus semua data dummy", "Hapus data dummy", "🧹")] : []));
  },
};

/* Kit dashboard admin (sistem desain public/inti/dasbor.css, rujukan /operasi dan /admin/akun; pemilik 17 Nov 2026 "gas semua").
   Satu salinan untuk semua layar admin: ubin angka, kartu seksi .ex-std, tombol ikon polos, lipatan pil, tabel berkepala navy.
   DOM murni (CSP admin: tanpa gaya inline). Gaya: .db-tumpuk, .db-ubin, .db-ik, .db-lipat, .db-tabel di dasbor.css; kartu dasar .ex-std di inti/kartu.css. */
Admin.dasbor = (() => {
  const NS = "http://www.w3.org/2000/svg";
  /* ikon garis 24x24; layar boleh memberi path sendiri ke svg(d) */
  const IK = {
    staf: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    orang: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    aktif: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3", cek: "M20 6 9 17l-5-5",
    kunci: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
    cabut: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM4.93 4.93l14.14 14.14", lihat: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    gedung: "M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1", kisi: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    ubah: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z", tutup: "M18 6 6 18M6 6l12 12", tambah: "M12 5v14M5 12h14",
    hapus: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6", unduh: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
    jam: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2", waspada: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
    kotak: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12",
    berkas: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    grafik: "M3 3v18h18M7 14l4-4 4 4 5-5", peta: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16",
    pesawat: "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",
    api: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z",
    wa: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
    surel: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
    telepon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
    lonceng: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0", cari: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  };
  /* nama ikon yang lazim dipakai layar; nama tak dikenal jatuh ke kisi, bukan kotak kosong */
  const ALIAS = {akun: "staf", pengguna: "orang", instansi: "gedung", pemirsa: "lihat", matriks: "kisi", tolak: "cabut", setujui: "cek", rincian: "lihat", tugas: "berkas", laporan: "berkas", kontak: "telepon", pengingat: "lonceng", jadwal: "jam", stok: "kotak", alat: "kotak", sortie: "pesawat", karhutla: "api", wilayah: "peta"};
  const el = (tag, kls, ...anak) => { const e = document.createElement(tag); if (kls) e.className = kls; e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
  const svg = d => { const e = document.createElementNS(NS, "svg"), p = document.createElementNS(NS, "path");
    e.setAttribute("viewBox", "0 0 24 24"); e.setAttribute("aria-hidden", "true"); p.setAttribute("d", IK[d] || IK[ALIAS[d]] || (/^[a-z_]+$/.test(d) ? IK.kisi : d)); e.append(p); return e; };
  const atur = (e, data) => { for (const [k, v] of Object.entries(data || {})) if (v != null && v !== false) e.setAttribute(k, v === true ? "" : v); return e; };
  return {
    IK, svg,
    /* kartu seksi: kepala = ikon navy + nama seksi (bukan kalimat temuan) + pil kategori; kanan = kontrol (cari, tombol, hitungan) */
    kartu({ikon, judul, ey = "", kanan = null, id = null, kls = ""}, ...isi) {
      const k = el("section", "ex ex-std db-std " + kls,
        el("header", "ex-hd", el("div", "ex-jd", el("h3", null, svg(ikon || "kisi"), judul), kanan), ey ? el("span", "ex-ey", ey) : null),
        el("div", "ex-bd", ...isi));
      k.setAttribute("aria-label", judul); if (id) k.id = id; return k;
    },
    /* ubin angka; dengan saring = tombol penyaring (aria-pressed), tanpa = kotak diam. warna: "", "oranye", "merah" */
    ubin({ikon, label, nilai, ket = "", warna = "", saring = null, aktif = false}) {
      const isi = [el("header", null, el("i", null, svg(ikon || "kisi")), label), el("b", null, typeof nilai === "number" ? nilai.toLocaleString("id-ID") : String(nilai ?? "–")), ket ? el("small", null, ket) : null];
      if (saring == null) return el("div", "db-ubin " + warna, ...isi);
      return atur(el("button", "db-ubin db-saring " + warna, ...isi), {type: "button", "data-saring": saring, "aria-pressed": String(aktif), title: "Saring: " + label});
    },
    ubinGrid: (...ubin) => el("div", "db-ubin-grid db-ubin-baris" + (ubin.flat().length === 4 ? " k4" : ""), ...ubin),
    /* tombol ikon polos (tanpa garis/kotak, memori ikon-tanpa-garis-luar); label wajib = title + aria-label */
    ikon: (ik, label, data = {}, kls = "") => atur(el("button", "db-ik " + kls, svg(ik)), {type: "button", title: label, "aria-label": label, ...data}),
    /* tautan berikon polos (WA, surel): sama dengan tombol ikon, tetapi <a> supaya bisa dibuka di tab baru */
    tautanIkon: (ik, label, href, kls = "") => atur(el("a", "db-ik " + kls, svg(ik)), {href, title: label, "aria-label": label, ...(/^https?:/.test(href) ? {target: "_blank", rel: "noopener noreferrer"} : {})}),
    aksi: (...tombol) => el("div", "db-aksi", ...tombol),
    /* daftar panjang (pil akses, tab) dilipat jadi satu pil hitungan */
    lipat: (ringkas, ...isi) => el("details", "db-lipat", el("summary", null, ringkas), el("div", "db-lipat-isi", ...isi)),
    /* tabel berkepala navy menempel penuh di kartu; kepala = daftar teks atau [teks, title] */
    tabel(kepala, baris, kls = "") {
      const tr = el("tr", null, ...kepala.map(k => { const th = atur(el("th"), {scope: "col"}); const [t, j] = Array.isArray(k) ? k : [k]; th.textContent = t; if (j) th.title = j; return th; }));
      return el("div", "db-tabel-wadah", el("table", "ex-tabel db-tabel " + kls, el("thead", null, tr), el("tbody", null, ...baris)));
    },
    /* wadah halaman: kartu berjarak 20 px, tidak menempel */
    tumpuk: (wadah) => { wadah.classList.add("db-tumpuk"); return wadah; },
  };
})();
