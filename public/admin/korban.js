/* Laporan korban jiwa (/admin/korban): daftar, verifikasi, koreksi, peta titik, rekap per provinsi, dan form lapor untuk Pusdalops dan moderator.
   Data dari GET /api/korban (admin modOK atau sesi staf pusdalops, verifikator, koordalops, pimpinan; staf berwilayah hanya provinsinya). Aksi ke POST /api/korban/:id (verifikasi, koreksi) dan POST /api/korban/lapor.
   PRIVASI: nama korban dan foto dokumen hanya datang dari server bila pelihat moderator atau staf pusdalops (D.boleh.nama); selain itu hanya penanda "nama tercatat".
   CSP admin: tanpa skrip/gaya inline, semua teks data lewat textContent. Peta = SVG titik (tanpa pustaka luar). INP: chip dan kartu berubah SEKETIKA, peta/rekap/daftar digambar sesudah satu frame dan daftar dipotong.
   Dummy: Super Admin saja (🧪 isi, 🧹 hapus). */
(() => {
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul"), NS = "http://www.w3.org/2000/svg";
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else if (k === "value") e.value = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const sv = (tag, att, ...anak) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(att || {})) e.setAttribute(k, v); for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  /* daftar tetap sama dengan src/korban.js (label asli dari D.kamus; ini hanya urutan tombol) */
  const BENCANA = ["karhutla", "banjir", "gempa", "cuaca", "udara", "gunungapi", "kekeringan", "lainnya"], KATEGORI = ["warga", "petugas_pemadam", "relawan", "lainnya"], PENYEBAB = ["terbakar", "asap_ispa", "tenggelam", "kecelakaan_tugas", "lainnya"], SUMBER = ["laporan_langsung", "rs", "kepolisian"];
  const STATUS = {dilaporkan: "Dilaporkan", terverifikasi: "Terverifikasi", dikoreksi: "Dikoreksi"}, POTONG = 15, MAKS_FOTO = 1.4 * 1048576;
  const waktu = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  const nowWib = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 16);
  const kirim = async (url, body) => { try { const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(body || {})}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}}; } };
  const kirimBlob = async (url, blob) => { try { const r = await fetch(url, {method: "POST", headers: {"x-pb": "1"}, body: blob}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; } catch (e) { return {ok: false, status: 0, j: {galat: "jaringan putus; coba lagi"}}; } };
  let D = null, F = {status: "", prov: "", belum: false, semua: false}, buka = new Set(), jadwal = 0, pesanTeks = "", pesanOk = true, formLapor = false;
  const pesan = (t, ok = true) => { pesanTeks = t || ""; pesanOk = ok; const p = document.getElementById("kxPesan"); if (p) { p.textContent = pesanTeks; p.className = "kx-pesan " + (ok ? "ok" : "galat"); } };
  const kosong = (teks, ...tombol) => app.replaceChildren(h("div", {class: "kx-kosong"}, h("p", {teks}), ...tombol));
  const nilai = (kamus, k) => kamus?.[k] ?? k;
  const ringkas = k => [[k.meninggal, "meninggal"], [k.luka_berat, "luka berat"], [k.hilang, "hilang"]].filter(([n]) => n > 0).map(([n, l]) => `${fmt(n)} ${l}`).join(", ");
  const lihat = () => D.korban.filter(k => (!F.belum || k.status !== "terverifikasi"));

  /* ---------- peta titik ---------- */
  function gambarPeta() {
    const G = lihat().filter(k => k.lat != null), w = document.getElementById("kxPeta"); if (!w) return;
    if (!G.length) { w.replaceChildren(h("p", {class: "kx-redup", teks: "Belum ada laporan berkoordinat untuk ditampilkan di peta."})); return; }
    const lat = G.map(g => g.lat), lon = G.map(g => g.lon), pad = 1.2, a = Math.min(...lat) - pad, b = Math.max(...lat) + pad, c = Math.min(...lon) - pad, d = Math.max(...lon) + pad;
    const W = 1000, T = Math.max(220, Math.min(480, W * (b - a) / (d - c))), x = o => (o - c) / (d - c) * W, y = o => (b - o) / (b - a) * T, svg = sv("svg", {viewBox: `0 0 ${W} ${T}`, role: "img", "aria-label": `Peta ${G.length} laporan korban`, class: "kx-svg"});
    for (let o = Math.ceil(c); o <= d; o++) svg.append(sv("line", {x1: x(o), y1: 0, x2: x(o), y2: T, class: "kx-gr"}));
    for (let o = Math.ceil(a); o <= b; o++) svg.append(sv("line", {x1: 0, y1: y(o), x2: W, y2: y(o), class: "kx-gr"}));
    for (const g of G) svg.append(sv("circle", {cx: x(g.lon), cy: y(g.lat), r: 7 + Math.min(14, Math.sqrt(g.meninggal + g.luka_berat + g.hilang) * 4), class: "kx-titik " + (g.status === "terverifikasi" ? "ok" : "belum"), "data-korban": g.id, tabindex: "0", role: "button", "aria-label": ringkas(g)},
      sv("title", {}, document.createTextNode(`${ringkas(g)}, ${g.kab ? g.kab + ", " : ""}${g.prov_nama}`))));
    w.replaceChildren(svg, h("p", {class: "kx-legenda"}, h("span", {class: "kx-pil belum", teks: "Belum diverifikasi"}), h("span", {class: "kx-pil ok", teks: "Terverifikasi"}), h("span", {class: "kx-redup", teks: "Ukuran titik = jumlah korban"})));
  }

  /* ---------- rekap per provinsi ---------- */
  function gambarRekap() {
    const w = document.getElementById("kxRekap"); if (!w) return;
    if (!D.rekap.length) { w.replaceChildren(h("p", {class: "kx-redup", teks: "Belum ada laporan korban."})); return; }
    w.replaceChildren(h("div", {class: "kx-tabel-wadah"}, h("table", {class: "kx-tabel"}, h("thead", null, h("tr", null, ["Provinsi", "Laporan", "Meninggal", "Luka berat", "Hilang", "Belum diverifikasi"].map(k => h("th", {teks: k})))),
      h("tbody", null, ...D.rekap.map(p => h("tr", null, h("td", {teks: p.nama}), ...[p.laporan, p.meninggal, p.luka_berat, p.hilang].map(n => h("td", {teks: fmt(n)})), h("td", {class: p.belum_diverifikasi ? "merah" : "", teks: fmt(p.belum_diverifikasi)}))),
        h("tr", {class: "kx-jumlah"}, h("td", {teks: "Jumlah"}), ...[D.total.laporan, D.total.meninggal, D.total.luka_berat, D.total.hilang, D.total.belum_diverifikasi].map(n => h("td", {teks: fmt(n)})))))));
  }

  /* ---------- daftar ---------- */
  function kartu(k) {
    const terbuka = buka.has(k.id), belum = k.status !== "terverifikasi";
    return h("li", {class: "kx-kartu " + (belum ? "belum" : "ok"), id: "k" + k.id, "data-id": k.id},
      h("div", {class: "kx-baris"}, h("b", {teks: ringkas(k)}), h("span", {class: "kx-pil " + (belum ? "belum" : "ok"), teks: STATUS[k.status]}), k.dummy ? h("span", {class: "kx-pil dummy", teks: "DUMMY"}) : null),
      h("p", {class: "kx-meta", teks: `${waktu(k.waktu_kejadian)}, ${k.kab ? window.Wilayah.kab(k.kab) + ", " : ""}${k.prov_nama}. ${nilai(D.kamus.bencana, k.bencana)}.`}),
      h("p", {class: "kx-meta", teks: `${nilai(D.kamus.kategori, k.kategori)}, ${nilai(D.kamus.penyebab, k.penyebab).toLowerCase()}. Sumber: ${nilai(D.kamus.sumber, k.sumber).toLowerCase()}. Pelapor: ${k.pelapor}.`}),
      k.kronologi ? h("p", {class: "kx-meta", teks: k.kronologi}) : null,
      k.ada_nama ? h("p", {class: "kx-meta", teks: D.boleh.nama ? `Nama korban: ${k.nama_korban}` : "Nama korban tercatat, hanya terlihat moderator dan Pusdalops."}) : null,
      h("div", {class: "kx-aksi"}, D.boleh.periksa && k.status !== "terverifikasi" ? h("button", {class: "kx-btn utama", type: "button", "data-verif": k.id, teks: "Verifikasi"}) : null,
        D.boleh.periksa ? h("button", {class: "kx-btn", type: "button", "data-koreksi": k.id, teks: "Koreksi"}) : null, h("button", {class: "kx-btn", type: "button", "data-riwayat": k.id, "aria-expanded": String(terbuka), teks: terbuka ? "Tutup riwayat" : "Riwayat"}),
        k.foto && D.boleh.moderator ? h("button", {class: "kx-btn", type: "button", "data-hapus-foto": k.id, teks: "Hapus foto"}) : null,
        k.foto && D.boleh.nama ? h("a", {class: "kx-btn", href: "/api/korban/foto/" + k.id, target: "_blank", rel: "noopener noreferrer", teks: "Foto dokumen"}) : null,
        k.lat != null ? h("a", {class: "kx-btn", href: `https://www.google.com/maps?q=${k.lat},${k.lon}`, target: "_blank", rel: "noopener noreferrer", teks: "Buka peta"}) : null),
      h("div", {class: "kx-sisip", "data-sisip": k.id}), terbuka ? h("div", {class: "kx-riwayat", "data-riwayat-isi": k.id}, h("p", {class: "kx-redup", teks: "Memuat riwayat…"})) : null);
  }
  function daftar() {
    const G = lihat(), w = document.getElementById("kxDaftar"); if (!w) return; const tampil = F.semua ? G : G.slice(0, POTONG);
    w.replaceChildren(...(G.length ? [h("ul", {class: "kx-daftar"}, tampil.map(kartu)), G.length > tampil.length ? h("button", {class: "kx-btn", type: "button", "data-semua": "1", teks: `Lihat semua ${fmt(G.length)} laporan`}) : null] : [h("p", {class: "kx-redup", teks: "Tidak ada laporan yang cocok dengan penyaring."})]));
    for (const e of w.querySelectorAll("[data-riwayat-isi]")) muatRiwayat(e.dataset.riwayatIsi);
  }
  async function muatRiwayat(id) {
    const e = document.querySelector(`[data-riwayat-isi="${CSS.escape(id)}"]`); if (!e) return;
    const r = await fetch("/api/korban/jejak/" + id).then(x => x.ok ? x.json() : null).catch(() => null);
    if (!r) return e.replaceChildren(h("p", {class: "kx-pesan galat", teks: "Riwayat gagal dimuat."}));
    e.replaceChildren(r.jejak.length ? h("ol", {class: "kx-jejak"}, ...r.jejak.map(j => h("li", {teks: `${waktu(j.waktu)}, ${j.oleh}: ${j.aksi}${j.alasan ? `, alasan: ${j.alasan}` : ""}${j.aksi === "koreksi" ? `, dari ${j.dari} ke ${j.ke}` : ""}`}))) : h("p", {class: "kx-redup", teks: "Belum ada riwayat."}));
  }

  /* ---------- form koreksi (di bawah kartu) dan form lapor ---------- */
  const lab = (t, isi) => h("label", null, t, isi);
  const tombolSeg = (nama, daftarK, kamus, awal) => h("div", {class: "kx-seg", role: "group", "aria-label": nama, "data-seg": nama}, daftarK.map(k => h("button", {type: "button", "data-pilih": k, "data-seg": nama, "aria-pressed": String(k === awal)}, nilai(kamus, k))));
  const angka = (nama, judul, v) => lab(judul, h("input", {name: nama, inputmode: "numeric", value: String(v), autocomplete: "off"}));
  function formKoreksi(k) {
    const f = h("form", {class: "kx-form", novalidate: true, "data-id": k.id}); f.dataset.kategori = k.kategori; f.dataset.penyebab = k.penyebab; f.dataset.sumber = k.sumber;
    f.append(h("h4", {teks: "Koreksi laporan"}), h("p", {class: "kx-redup", teks: "Nilai sebelumnya tersimpan di riwayat. Alasan wajib."}),
      h("div", {class: "kx-tiga"}, angka("meninggal", "Meninggal", k.meninggal), angka("luka_berat", "Luka berat", k.luka_berat), angka("hilang", "Hilang", k.hilang)),
      tombolSeg("kategori", KATEGORI, D.kamus.kategori, k.kategori), tombolSeg("penyebab", PENYEBAB, D.kamus.penyebab, k.penyebab), tombolSeg("sumber", SUMBER, D.kamus.sumber, k.sumber),
      lab("Kronologi", h("textarea", {name: "kronologi", rows: "3", maxlength: "600", value: k.kronologi ?? ""})), D.boleh.nama ? lab("Nama korban (boleh kosong)", h("input", {name: "nama_korban", maxlength: "300", value: k.nama_korban ?? "", autocomplete: "off"})) : null,
      lab("Alasan koreksi", h("input", {name: "alasan", maxlength: "300", autocomplete: "off"})), h("p", {class: "kx-pesan galat", role: "alert", "data-galat": "1"}),
      h("div", {class: "kx-aksi"}, h("button", {type: "submit", class: "kx-btn utama", teks: "Simpan koreksi"}), h("button", {type: "button", class: "kx-btn", "data-batal-sisip": k.id, teks: "Batal"})));
    f.addEventListener("submit", async e => { e.preventDefault(); const q = n => f.elements[n]?.value, b = f.querySelector("[type=submit]"); b.disabled = true;
      const o = {aksi: "koreksi", meninggal: Number(q("meninggal") || 0), luka_berat: Number(q("luka_berat") || 0), hilang: Number(q("hilang") || 0), kategori: f.dataset.kategori, penyebab: f.dataset.penyebab, sumber: f.dataset.sumber, kronologi: q("kronologi"), alasan: q("alasan")};
      if (f.elements.nama_korban) o.nama_korban = q("nama_korban");
      const r = await kirim("/api/korban/" + k.id, o); if (!r.ok) { b.disabled = false; f.querySelector("[data-galat]").textContent = r.j.galat || `Gagal (${r.status})`; return; }
      pesan("Koreksi tersimpan, laporan menunggu verifikasi ulang.", true); await muat(); });
    return f;
  }
  const kecil = f => window.fotoKecil(f, MAKS_FOTO);

  function formBaru() {
    const f = h("form", {class: "kx-form", novalidate: true, id: "kxFormLapor"}); f.dataset.kategori = ""; f.dataset.penyebab = ""; f.dataset.sumber = "laporan_langsung"; f.dataset.sumber_lokasi = "manual"; f.dataset.klien = "k" + crypto.randomUUID().replace(/-/g, "");   // satu per form sampai sukses
    const prov = h("select", {name: "prov"}, ...Object.entries(D.provinsi).map(([k, n]) => h("option", {value: k, teks: n}))), bencana = h("select", {name: "bencana"}, ...BENCANA.map(k => h("option", {value: k, teks: nilai(D.kamus.bencana, k)})));
    f.append(h("h3", {teks: "Lapor korban jiwa"}), h("p", {class: "kx-redup", teks: "Laporan masuk dengan status Dilaporkan dan menjadi butir Meja Pantau prioritas tertinggi sampai diverifikasi."}),
      lab("Waktu kejadian (WIB)", h("input", {name: "waktu", type: "datetime-local", value: nowWib(), max: nowWib()})), lab("Provinsi", prov), lab("Kabupaten atau kota (boleh kosong)", h("input", {name: "kab", maxlength: "60", autocomplete: "off"})),
      h("div", {class: "kx-aksi"}, h("button", {type: "button", class: "kx-btn", "data-gps": "1", teks: "Pakai GPS perangkat"}), h("span", {class: "kx-redup", "data-gps-info": "1", teks: "GPS opsional."})), h("input", {type: "hidden", name: "lat"}), h("input", {type: "hidden", name: "lon"}),
      lab("Jenis bencana", bencana), h("div", {class: "kx-tiga"}, angka("meninggal", "Meninggal", 0), angka("luka_berat", "Luka berat", 0), angka("hilang", "Hilang", 0)),
      tombolSeg("kategori", KATEGORI, D.kamus.kategori, ""), tombolSeg("penyebab", PENYEBAB, D.kamus.penyebab, ""), tombolSeg("sumber", SUMBER, D.kamus.sumber, "laporan_langsung"),
      lab("Kronologi singkat (jangan tulis nama korban di sini)", h("textarea", {name: "kronologi", rows: "3", maxlength: "600"})), lab("Nama korban (boleh kosong, hanya terlihat moderator dan Pusdalops)", h("input", {name: "nama_korban", maxlength: "300", autocomplete: "off"})),
      lab("Foto dokumen (boleh kosong)", h("input", {name: "foto", type: "file", accept: "image/jpeg,image/webp,image/*"})), h("p", {class: "kx-pesan galat", role: "alert", "data-galat": "1"}),
      h("div", {class: "kx-aksi"}, h("button", {type: "submit", class: "kx-btn utama", teks: "Kirim laporan"}), h("button", {type: "button", class: "kx-btn", "data-batal-lapor": "1", teks: "Batal"})));
    f.addEventListener("submit", async e => { e.preventDefault(); const q = n => f.elements[n]?.value, galat = t => { f.querySelector("[data-galat]").textContent = t; }, b = f.querySelector("[type=submit]");
      const md = Number(q("meninggal") || 0), lb = Number(q("luka_berat") || 0), hl = Number(q("hilang") || 0), w = Date.parse(q("waktu") + ":00+07:00");
      if (!f.dataset.kategori || !f.dataset.penyebab) return galat("Pilih kategori korban dan penyebab."); if (md + lb + hl < 1) return galat("Isi minimal satu korban."); if (!Number.isFinite(w)) return galat("Isi waktu kejadian.");
      b.disabled = true; galat("");
      const o = {klien_id: f.dataset.klien, waktu_kejadian: w, prov: q("prov"), kab: q("kab"), bencana: q("bencana"), meninggal: md, luka_berat: lb, hilang: hl, kategori: f.dataset.kategori, penyebab: f.dataset.penyebab, sumber: f.dataset.sumber, kronologi: q("kronologi"), nama_korban: q("nama_korban")};
      if (q("lat")) { o.lat = q("lat"); o.lon = q("lon"); o.sumber_lokasi = f.dataset.sumber_lokasi; }
      const r = await kirim("/api/korban/lapor", o); if (!r.ok) { b.disabled = false; return galat(r.j.galat || `Gagal (${r.status})`); }
      let foto = ""; const berkas = f.elements.foto.files[0]; if (berkas && !r.j.duplikat) { const k = await kecil(berkas); if (!k) foto = " Foto tidak terbaca atau terlalu besar, laporan tersimpan tanpa foto."; else { const u = await kirimBlob("/api/korban/foto/" + r.j.id, k); if (!u.ok) foto = " Foto belum terunggah: " + (u.j.galat || u.status); } }
      formLapor = false; await muat(); pesan((r.j.duplikat ? "Laporan yang sama sudah ada." : "Laporan korban tersimpan.") + foto, !foto); });
    return f;
  }

  /* ---------- kerangka ---------- */
  const tunda = () => { cancelAnimationFrame(jadwal); jadwal = requestAnimationFrame(() => setTimeout(() => { gambarPeta(); gambarRekap(); daftar(); }, 0)); };
  function gambarKontrol() {
    const T = D.total, kt = (l, n, kls = "", data = {}) => h("button", {class: "kx-kartu-ringkas " + kls, type: "button", ...data}, h("b", {teks: fmt(n)}), h("span", {teks: l}));
    const provs = [...new Map(D.rekap.map(p => [p.prov, p.nama])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
    app.replaceChildren(T.belum_diverifikasi ? h("div", {class: "kx-banner", role: "alert", teks: `${fmt(T.belum_diverifikasi)} laporan korban belum diverifikasi. Cocokkan dengan rumah sakit atau kepolisian, lalu verifikasi atau koreksi.`}) : null,
      h("p", {id: "kxPesan", class: "kx-pesan " + (pesanOk ? "ok" : "galat"), role: "status", teks: pesanTeks}),
      h("div", {class: "kx-ringkas"}, kt("Laporan", T.laporan), kt("Meninggal", T.meninggal, "merah"), kt("Luka berat", T.luka_berat), kt("Hilang", T.hilang), kt("Belum diverifikasi", T.belum_diverifikasi, T.belum_diverifikasi ? "merah" : "", {"data-belum": "1", "aria-pressed": String(F.belum)})),
      h("div", {class: "kx-saring"}, h("div", {class: "kx-chip-baris", role: "group", "aria-label": "Status"}, h("button", {class: "kx-chip", type: "button", "data-status": "", "aria-pressed": String(!F.status), teks: "Semua status"}),
        ...Object.entries(STATUS).map(([k, l]) => h("button", {class: "kx-chip", type: "button", "data-status": k, "aria-pressed": String(F.status === k), teks: l}))),
        h("select", {id: "kxProv", "aria-label": "Provinsi"}, h("option", {value: "", teks: "Semua provinsi"}), ...provs.map(([k, n]) => h("option", {value: k, teks: n, selected: F.prov === k}))),
        D.boleh.lapor ? h("button", {class: "kx-btn utama", type: "button", "data-lapor": "1", teks: "Lapor korban"}) : null),
      formLapor ? formBaru() : null,
      h("section", {class: "kx-bagian"}, h("h2", {teks: "Peta laporan"}), h("div", {id: "kxPeta"})), h("section", {class: "kx-bagian"}, h("h2", {teks: "Rekap per provinsi"}), h("div", {id: "kxRekap"})),
      h("section", {class: "kx-bagian"}, h("h2", {teks: "Laporan"}), h("div", {id: "kxDaftar"})));
    tunda();
  }
  async function muat() {
    const q = new URLSearchParams(); if (F.status) q.set("status", F.status); if (F.prov) q.set("prov", F.prov);
    const r = await fetch("/api/korban" + (q.size ? "?" + q : "")).catch(() => null);
    if (!r) return kosong("Jaringan putus. Periksa sinyal lalu coba lagi.", h("button", {class: "kx-btn utama", type: "button", "data-ulang": "1", teks: "Coba lagi"}));
    if (r.status === 401 || r.status === 403) return kosong(r.status === 401 ? "Masuk dulu untuk melihat laporan korban." : "Akun ini tidak punya akses ke laporan korban. Peran yang boleh: admin moderator, Pusdalops, verifikator, koordinator, pimpinan.",
      ...(document.body.dataset.masuk === "1" ? [h("a", {class: "kx-btn utama", href: "/admin/pantau", teks: "Kembali ke Meja Pantau"})] : [h("a", {class: "kx-btn utama", href: "/admin/pantau", teks: "Masuk sebagai staf"}), h("a", {class: "kx-btn", href: "/admin/masuk?ke=%2Fadmin%2Fkorban", teks: "Masuk sebagai admin"})]));
    if (r.status === 503) return kosong("Laporan korban belum diaktifkan: migrasi D1 0034_korban_p3k belum diterapkan.");
    if (!r.ok) return kosong(`Galat ${r.status}.`, h("button", {class: "kx-btn utama", type: "button", "data-ulang": "1", teks: "Coba lagi"}));
    D = await r.json(); gambarKontrol(); Admin.pasangDummy(aksiJudul, !!D.super);
  }
  app.addEventListener("click", async e => {
    const t = e.target;
    if (t.closest("[data-ulang]")) return muat();
    const st = t.closest("[data-status]"); if (st) { F.status = st.dataset.status; return muat(); }
    if (t.closest("[data-belum]")) { F.belum = !F.belum; t.closest("[data-belum]").setAttribute("aria-pressed", String(F.belum)); return tunda(); }
    if (t.closest("[data-semua]")) { F.semua = true; return tunda(); }
    if (t.closest("[data-lapor]")) { formLapor = true; gambarKontrol(); return document.getElementById("kxFormLapor")?.scrollIntoView({behavior: "smooth", block: "start"}); }
    if (t.closest("[data-batal-lapor]")) { formLapor = false; return gambarKontrol(); }
    const sg = t.closest("[data-pilih]"); if (sg) { const f = sg.closest("form"); f.dataset[sg.dataset.seg] = sg.dataset.pilih; for (const b of f.querySelectorAll(`[data-seg=${sg.dataset.seg}] button`)) b.setAttribute("aria-pressed", String(b === sg)); return; }
    if (t.closest("[data-gps]")) { const f = t.closest("form"), info = f.querySelector("[data-gps-info]"); if (!navigator.geolocation) { info.textContent = "Perangkat tanpa GPS."; return; } info.textContent = "Mencari lokasi…";
      navigator.geolocation.getCurrentPosition(p => { f.elements.lat.value = p.coords.latitude.toFixed(5); f.elements.lon.value = p.coords.longitude.toFixed(5); f.dataset.sumber_lokasi = "gps"; info.textContent = `GPS terisi (akurasi sekitar ${Math.round(p.coords.accuracy)} m).`; }, () => { info.textContent = "Lokasi tidak terbaca."; }, {enableHighAccuracy: true, timeout: 15000}); return; }
    const vf = t.closest("[data-verif]"); if (vf) { vf.disabled = true; const r = await kirim("/api/korban/" + vf.dataset.verif, {aksi: "verifikasi"}); if (!r.ok) { vf.disabled = false; return pesan(r.j.galat || `Gagal (${r.status})`, false); } await muat(); return pesan("Laporan diverifikasi.", true); }
    const kr = t.closest("[data-koreksi]"); if (kr) { const k = D.korban.find(x => x.id === kr.dataset.koreksi), s = document.querySelector(`[data-sisip="${CSS.escape(k.id)}"]`); s.replaceChildren(formKoreksi(k)); return s.scrollIntoView({behavior: "smooth", block: "nearest"}); }
    const hf = t.closest("[data-hapus-foto]"); if (hf) { const alasan = prompt("Alasan menghapus foto dokumen (wajib):"); if (!alasan) return; hf.disabled = true; const r = await kirim("/api/korban/" + hf.dataset.hapusFoto, {aksi: "hapus_foto", alasan}); if (!r.ok) { hf.disabled = false; return pesan(r.j.galat || `Gagal (${r.status})`, false); } await muat(); return pesan("Foto dokumen dihapus, jejaknya tetap.", true); }
    const bs = t.closest("[data-batal-sisip]"); if (bs) return document.querySelector(`[data-sisip="${CSS.escape(bs.dataset.batalSisip)}"]`).replaceChildren();
    const ri = t.closest("[data-riwayat]"); if (ri) { const id = ri.dataset.riwayat; buka.has(id) ? buka.delete(id) : buka.add(id); const li = document.getElementById("k" + id); li.replaceWith(kartu(D.korban.find(x => x.id === id))); if (buka.has(id)) muatRiwayat(id); return; }
    const ti = t.closest("[data-korban]"); if (ti) { const id = ti.dataset.korban; if (!lihat().slice(0, F.semua ? 1e9 : POTONG).some(k => k.id === id)) { F.semua = true; daftar(); } document.getElementById("k" + id)?.scrollIntoView({behavior: "smooth", block: "center"}); }
  });
  app.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-korban]")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", {bubbles: true})); } });
  app.addEventListener("change", e => { if (e.target.id === "kxProv") { F.prov = e.target.value; muat(); } });
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy korban (dan dummy instansi yang jadi hulunya)? Data asli tidak tersentuh.")) return;
    d.disabled = true; const r = await kirim("/api/korban/dummy", {aksi: d.dataset.dummy}); d.disabled = false;
    if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false);
    const t0 = d.dataset.dummy === "isi" ? `Dummy dibuat: ${r.j.korban} laporan korban contoh, ${r.j.butir} menjadi butir Meja Pantau.` : `Dummy dihapus: ${r.j.korban} laporan.`;
    F = {status: "", prov: "", belum: false, semua: false}; buka.clear(); formLapor = false; await muat(); pesan(t0, true);
  });
  muat();
})();
