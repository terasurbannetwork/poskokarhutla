/* Admin Relawan (/admin/relawan): antrean verifikasi, relawan, permintaan + pencocokan, kampus dan MoU, pelatihan, asuransi, jam kerja, penilaian + daftar hitam,
   ekspor CSV, dan tombol dummy. CSP admin: tanpa skrip/gaya inline; semua teks dari data lewat esc(). Data dari /api/relawan/admin/* (sesi admin). */
(() => {
  "use strict";
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul"), API = "/api/relawan/admin";
  const {esc, kirim} = Admin, ambil = u => Admin.ambil(u, "Fitur relawan");
  const angka = n => Number(n ?? 0).toLocaleString("id-ID", {maximumFractionDigits: 1});
  const wkt = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : "–";
  const tgl = s => s ? new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}) : "–";
  const jamF = m => m == null ? "–" : `${angka(m / 60)} jam`;
  const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const geser = h => new Date(Date.now() + 7 * 3600e3 + h * 864e5).toISOString().slice(0, 10);
  const I = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IKON = {jam: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), centang: I('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'), bolt: I('<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>'), pin: I('<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    bendera: I('<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>'), x: I('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>'), jeda: I('<circle cx="12" cy="12" r="9"/><path d="M10 9v6m4-6v6"/>'), larang: I('<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>'),
    api: I('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>'), tabung: I('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>')};
  const pil = (k, i, t) => `<span class="bn-pil ${k}">${IKON[i] || ""}${esc(t)}</span>`;
  const STATUS = {terdaftar: ["p-kuning", "jam", "Terdaftar"], diverifikasi: ["p-biru", "centang", "Diverifikasi"], siap_tugas: ["p-hijau", "bolt", "Siap tugas"], ditugaskan: ["p-ungu", "pin", "Ditugaskan"], bertugas: ["p-hijau", "api", "Bertugas"],
    selesai: ["p-hijau", "bendera", "Selesai"], ditolak: ["p-merah", "x", "Ditolak"], nonaktif: ["p-abu", "jeda", "Nonaktif"], daftar_hitam: ["p-merah", "larang", "Daftar hitam"]};
  const PENUGASAN = {ditawarkan: ["p-kuning", "jam", "Ditawarkan"], diterima: ["p-biru", "centang", "Diterima"], ditolak: ["p-abu", "x", "Ditolak"], bertugas: ["p-hijau", "api", "Bertugas"], selesai: ["p-hijau", "bendera", "Selesai"], dibatalkan: ["p-abu", "x", "Dibatalkan"]};
  const MOU = {aktif: ["p-hijau", "centang", "Aktif"], segera_habis: ["p-oranye", "jam", "Segera habis"], habis: ["p-merah", "x", "Habis"], belum: ["p-kuning", "jam", "Belum berlaku"]};
  const SAH = {0: ["p-kuning", "jam", "Menunggu"], 1: ["p-hijau", "centang", "Sah"], 2: ["p-merah", "x", "Ditolak"]};
  const ps = ([k, i, t]) => pil(k, i, t), dummyPil = d => d ? ' <span class="bn-pil p-ungu">Dummy</span>' : "";
  const ASURANSI = {belum: "Belum diurus", diajukan: "Diajukan", aktif: "Aktif", tidak_perlu: "Tidak perlu"};
  const BENCANA = ["karhutla", "banjir", "gempa", "cuaca", "udara", "gunungapi", "kekeringan"];
  const TABS = [["antrean", "Antrean verifikasi"], ["relawan", "Relawan"], ["permintaan", "Permintaan"], ["kampus", "Kampus dan MoU"], ["pelatihan", "Pelatihan"], ["asuransi", "Asuransi"], ["jam", "Jam kerja"], ["penilaian", "Penilaian dan daftar hitam"]];
  let tab = "antrean", konfig = null, saring = {}, terpilih = null, kodeBaru = null, formKampus = {};

  const catat = (t, ok) => { const p = document.getElementById("rwPesan"); if (p) { p.textContent = t || ""; p.className = "rw-pesan " + (t ? (ok ? "ok" : "galat") : ""); } };
  const kosong = t => `<p class="rw-kosong">${esc(t)}</p>`;

  /* tabel standar: kepala gelap, urut per kolom, berhalaman */
  function Tabel(el, kolom, rows, kosongT, ukuran = 15) {
    let urut = -1, arah = 1, hal = 0;
    const nil = (b, k) => k.v ? k.v(b) : b[k.k];
    const gambar = () => {
      const x = rows.slice();
      if (urut >= 0) { const k = kolom[urut]; x.sort((a, b) => { const p = nil(a, k), q = nil(b, k); return arah * (typeof p === "number" && typeof q === "number" ? p - q : String(p ?? "").localeCompare(String(q ?? ""), "id")); }); }
      const total = Math.max(1, Math.ceil(x.length / ukuran)); hal = Math.min(hal, total - 1);
      const isi = x.slice(hal * ukuran, (hal + 1) * ukuran);
      el.innerHTML = `<div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr>${kolom.map((k, i) => `<th aria-sort="${urut === i ? (arah > 0 ? "ascending" : "descending") : "none"}">${k.u === false ? esc(k.l) : `<button type="button" class="rw-urut" data-u="${i}">${esc(k.l)}${urut === i ? (arah > 0 ? " ▲" : " ▼") : ""}</button>`}</th>`).join("")}</tr></thead><tbody>${
        isi.length ? isi.map(b => `<tr data-id="${esc(b.id)}">${kolom.map(k => `<td>${k.h ? k.h(b) : esc(nil(b, k))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${kolom.length}" class="rw-kosong-baris">${esc(kosongT)}</td></tr>`}</tbody></table></div>${
        total > 1 ? `<div class="rw-hal"><button type="button" class="ad-tombol kecil" data-h="-1" ${hal === 0 ? "disabled" : ""}>Sebelumnya</button><span>Halaman ${hal + 1} dari ${total} (${angka(x.length)} baris)</span><button type="button" class="ad-tombol kecil" data-h="1" ${hal >= total - 1 ? "disabled" : ""}>Berikutnya</button></div>` : ""}`;
    };
    el.onclick = e => { const u = e.target.closest("[data-u]"), h = e.target.closest("[data-h]"); if (u) { const i = +u.dataset.u; arah = urut === i ? -arah : 1; urut = i; hal = 0; gambar(); } else if (h && !h.disabled) { hal += +h.dataset.h; gambar(); } };
    gambar();
  }
  const wadah = id => `<div id="${id}" class="rw-tabel"></div>`;
  const opsi = (obj, pilih, semua) => (semua ? `<option value="">${esc(semua)}</option>` : "") + Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}" ${pilih === k ? "selected" : ""}>${esc(v)}</option>`).join("");
  const urutProv = () => Object.fromEntries(Object.entries(konfig.provinsi).sort((a, b) => a[1].localeCompare(b[1], "id")));
  const pilKeahlian = a => (a || []).map(k => `<span class="bn-pil p-abu">${esc(konfig.keahlian[k] || k)}</span>`).join(" ");

  /* ================= kerangka ================= */
  function kerangka(hitung = {}) {
    app.innerHTML = `<nav class="ad-tabs" aria-label="Relawan">${TABS.map(([k, l]) => `<button data-tab="${k}" aria-pressed="${k === tab}">${l}${k === "antrean" && hitung.terdaftar ? ` <b>${angka(hitung.terdaftar)}</b>` : ""}</button>`).join("")}</nav>
      <p id="rwPesan" class="rw-pesan" role="status"></p><div id="rwIsi" class="rw-isi"><p class="ad-redup">Memuat...</p></div>`;
  }
  async function muat() {
    const isi = document.getElementById("rwIsi");
    try { if (!konfig) konfig = (await ambil("/api/relawan/ringkas")).konfig; await TAMPIL[tab](isi); }
    catch (e) { if (e.message !== "perlu masuk") isi.innerHTML = kosong(/belum diaktifkan/.test(e.message) ? "Fitur relawan belum diaktifkan: migrasi 0023 belum diterapkan di database ini." : "Gagal memuat: " + e.message); }
  }
  const pindah = k => { tab = k; terpilih = null; kerangka(); return muat(); };

  /* ================= relawan + antrean ================= */
  function aksiRelawan(r) {   // satu tombol utama + menu "⋯" (aksi lain; berbahaya merah). Alur prompt/confirm tetap di penangan klik.
    const b = (a, l, k = "", m = "") => `<button type="button" class="ad-tombol kecil ${k}" ${m} data-r="${a}" data-id="${esc(r.id)}">${l}</button>`;
    const utama = {terdaftar: ["verifikasi", "Verifikasi"], diverifikasi: ["siap", "Tandai siap"], selesai: ["siap", "Tandai siap"], nonaktif: ["aktifkan", "Aktifkan"], daftar_hitam: ["pulihkan", "Pulihkan"]}[r.status];
    const lain = [];
    if (["terdaftar", "diverifikasi"].includes(r.status)) lain.push(b("tolak", "Tolak", "rw-bhy", 'role="menuitem"'));
    if (["siap_tugas", "selesai", "diverifikasi", "terdaftar"].includes(r.status)) lain.push(b("nonaktifkan", "Nonaktifkan", "", 'role="menuitem"'));
    if (r.status !== "daftar_hitam") lain.push(b("daftar_hitam", "Daftar hitam", "rw-bhy", 'role="menuitem"'));
    lain.push(b("kode_baru", "Kode baru", "", 'role="menuitem"'));
    return `<div class="rw-aksi">${utama ? b(utama[0], utama[1], "utama") : ""}<span class="rw-menu-bungkus"><button type="button" class="ad-tombol kecil" data-menu="1" aria-haspopup="menu" aria-expanded="false" aria-label="Aksi lain untuk ${esc(r.nama)}" title="Aksi lain">⋯</button><div class="rw-menu" role="menu" hidden>${lain.join("")}</div></span></div>`;
  }
  /* popover aksi: absolut di bawah tombol; wadah tabel diberi ruang saat terbuka (CSS :has); tutup saat klik di luar, Esc, ubah ukuran */
  const tutupMenu = balik => { document.querySelectorAll(".rw-menu:not([hidden])").forEach(m => { m.hidden = true; const t = m.previousElementSibling; t.setAttribute("aria-expanded", "false"); if (balik) t.focus(); }); };
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-menu]"), m = t && t.nextElementSibling, buka = t && m.hidden;
    tutupMenu(); if (!buka) return;
    m.hidden = false; t.setAttribute("aria-expanded", "true");
    m.querySelector("button").focus();
  });
  document.addEventListener("keydown", e => {
    const m = document.querySelector(".rw-menu:not([hidden])"); if (!m) return;
    if (e.key === "Escape") { e.preventDefault(); return tutupMenu(true); }
    const x = [...m.querySelectorAll("button")], i = x.indexOf(document.activeElement), d = {ArrowDown: 1, ArrowUp: -1}[e.key];
    if (d) { e.preventDefault(); x[(i + d + x.length) % x.length].focus(); } else if (e.key === "Tab") tutupMenu();
  });
  addEventListener("resize", () => tutupMenu());
  const kolomRelawan = () => [
    {l: "Nama", k: "nama", h: r => `<b>${esc(r.nama)}</b>${dummyPil(r.dummy)}<br><span class="rw-redup">${esc(r.gol_darah || "")}</span>`},
    {l: "Kontak", u: false, h: r => `<span title="Kontak darurat: ${esc(r.darurat_nama || "–")} ${esc(r.darurat_wa || "")}">${esc(r.wa || "–")}<br><span class="rw-redup">${esc(r.email || "–")}</span></span>`},
    {l: "Wilayah", v: r => r.prov + r.kab, h: r => `${esc(r.kab)}<br><span class="rw-redup">${esc(konfig.provinsi[r.prov] || r.prov)}</span>`},
    {l: "Jalur", k: "jalur", h: r => `${esc(r.jalur)}${r.kampus ? `<br><span class="rw-redup">${esc(r.kampus)}</span>` : ""}${r.organisasi ? `<br><span class="rw-redup">${esc(r.organisasi)}</span>` : ""}`},
    {l: "Keahlian", v: r => r.keahlian.join(","), h: r => pilKeahlian(r.keahlian) + (r.sertifikat ? `<br><span class="rw-redup">${esc(r.sertifikat)}</span>` : "")},
    {l: "Siap", v: r => r.maks_hari, h: r => `${r.hari_per_minggu} hari/minggu, sampai ${r.maks_hari} hari${r.luar_provinsi ? ", luar provinsi" : ""}`},
    {l: "Status", v: r => r.status, h: r => ps(STATUS[r.status]) + (r.alasan ? `<br><span class="rw-redup">${esc(r.alasan)}</span>` : "")},
    {l: "Jam sah", k: "jam_sah_menit", h: r => jamF(r.jam_sah_menit)},
    {l: "Terdaftar", k: "dibuat", h: r => wkt(r.dibuat)},
    {l: "Aksi", u: false, h: aksiRelawan}];
  async function tampilAntrean(isi) {
    const d = await ambil(`${API}/relawan?status=terdaftar`);
    kerangka(d.hitung);
    const el = document.getElementById("rwIsi");
    el.innerHTML = `<div class="rw-bar"><span class="rw-redup">${angka(d.relawan.length)} menunggu verifikasi. Relawan jalur kampus bisa juga diverifikasi koordinator kampusnya.</span></div>${wadah("tAntre")}`;
    Tabel(document.getElementById("tAntre"), kolomRelawan(), d.relawan, "Antrean kosong. Semua pendaftar sudah diputuskan.");
  }
  async function tampilRelawan(isi) {
    const q = new URLSearchParams(Object.entries(saring).filter(([, v]) => v)).toString();
    const d = await ambil(`${API}/relawan${q ? "?" + q : ""}`);
    isi.innerHTML = `<form id="rwSaring" class="rw-bar"><label>Provinsi<select name="prov">${opsi(urutProv(), saring.prov, "Semua")}</select></label><label>Keahlian<select name="keahlian">${opsi(konfig.keahlian, saring.keahlian, "Semua")}</select></label>
      <label>Status<select name="status">${opsi(Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v[2]])), saring.status, "Semua")}</select></label>
      <label>Jalur<select name="jalur">${opsi({umum: "Umum", kampus: "Kampus", organisasi: "Organisasi"}, saring.jalur, "Semua")}</select></label>
      <label>Nama<input name="q" maxlength="60" value="${esc(saring.q || "")}"></label><button class="ad-tombol utama" type="submit">Terapkan</button><button class="ad-tombol" type="button" data-csv="1">Ekspor CSV</button>
      <span class="rw-redup">${angka(d.relawan.length)} relawan. Data pribadi hanya tampil di sini.</span></form>
      <div class="rw-ringkas">${Object.entries(d.hitung).map(([s, n]) => `<span>${ps(STATUS[s])} <b>${angka(n)}</b></span>`).join("")}</div>${wadah("tRel")}`;
    Tabel(document.getElementById("tRel"), kolomRelawan(), d.relawan, "Tidak ada relawan yang cocok dengan saringan ini.");
  }

  /* ================= permintaan + pencocokan ================= */
  async function tampilPermintaan(isi) {
    const d = await ambil(`${API}/permintaan`);
    isi.innerHTML = `<form id="rwFormPermintaan" class="rw-form ad-kartu"><h3>Permintaan relawan baru</h3><div class="rw-grid">
      <label>Judul<input name="judul" required maxlength="120" placeholder="mis. Dapur umum pengungsian"></label><label>Bencana<select name="bencana">${opsi(Object.fromEntries(BENCANA.map(b => [b, b])))}</select></label>
      <label>Provinsi<select name="prov" required>${opsi(urutProv(), "62")}</select></label><label>Kabupaten atau kota<input name="kab" required maxlength="60"></label>
      <label>Lintang (opsional)<input name="lat" inputmode="decimal" placeholder="-2,2"></label><label>Bujur (opsional)<input name="lon" inputmode="decimal" placeholder="114,0"></label>
      <label>Mulai<input name="mulai" type="date" required value="${hariIni()}"></label><label>Selesai<input name="selesai" type="date" required value="${geser(14)}"></label></div>
      <fieldset class="rw-butuh"><legend>Keahlian yang dibutuhkan (isi jumlah orang; 0 = tidak dibutuhkan)</legend>${Object.entries(konfig.keahlian).map(([k, l]) => `<label>${esc(l)}<input type="number" min="0" max="1000" value="0" data-butuh="${k}"></label>`).join("")}</fieldset>
      <label>Catatan<input name="catatan" maxlength="500"></label><div><button class="ad-tombol utama" type="submit">Buat permintaan</button></div></form>
      ${wadah("tPerm")}<div id="rwCocok"></div>`;
    Tabel(document.getElementById("tPerm"), [
      {l: "Permintaan", k: "judul", h: p => `<b>${esc(p.judul)}</b>${dummyPil(p.dummy)}<br><span class="rw-redup">${esc(p.bencana)}</span>`}, {l: "Lokasi", v: p => p.kab, h: p => `${esc(p.kab)}<br><span class="rw-redup">${esc(konfig.provinsi[p.prov] || p.prov)}</span>`},
      {l: "Tanggal", k: "mulai", h: p => `${tgl(p.mulai)} sampai ${tgl(p.selesai)}`}, {l: "Kebutuhan", u: false, h: p => p.butuh.map(b => `<span class="bn-pil p-abu">${esc(konfig.keahlian[b.keahlian] || b.keahlian)} ${angka(b.jumlah)}</span>`).join(" ")},
      {l: "Terpenuhi", v: p => p.ditugaskan, h: p => `${angka(p.ditugaskan)} / ${angka(p.dibutuhkan)}`}, {l: "Status", k: "status", h: p => pil(p.status === "buka" ? "p-hijau" : "p-abu", p.status === "buka" ? "bolt" : "jeda", p.status === "buka" ? "Buka" : "Ditutup")},
      {l: "Aksi", u: false, h: p => `<div class="rw-aksi"><button class="ad-tombol kecil utama" data-cocok="${esc(p.id)}">Cocokkan</button><button class="ad-tombol kecil" data-tutup="${p.status === "buka" ? "tutup" : "buka"}" data-id="${esc(p.id)}">${p.status === "buka" ? "Tutup" : "Buka lagi"}</button></div>`}], d.permintaan, "Belum ada permintaan.", 10);
    if (terpilih) cocok(terpilih);
  }
  async function cocok(id) {
    terpilih = id; const el = document.getElementById("rwCocok");
    const d = await ambil(`${API}/permintaan/${id}`), p = d.permintaan;
    el.innerHTML = `<section class="rw-panel ad-kartu"><h3>Pencocokan: ${esc(p.judul)}</h3><p class="rw-redup">Skor: keahlian cocok, kedekatan wilayah (prov sama lebih dulu, lalu yang bersedia keluar provinsi), kecukupan durasi, dikurangi beban tugas 90 hari terakhir. Hanya relawan siap tugas.</p>
      <div class="rw-ringkas">${p.butuh.map(b => `<span class="bn-pil p-abu">${esc(konfig.keahlian[b.keahlian] || b.keahlian)} ${angka(b.jumlah)}</span>`).join(" ")}</div>${wadah("tKand")}<h3>Penugasan</h3>${wadah("tTugas")}</section>`;
    Tabel(document.getElementById("tKand"), [{l: "Relawan", k: "nama", h: r => `<b>${esc(r.nama)}</b><br><span class="rw-redup">${esc(r.jalur)}</span>`}, {l: "Skor", k: "skor"},
      {l: "Keahlian cocok", v: r => r.cocok.join(","), h: r => pilKeahlian(r.cocok)}, {l: "Wilayah", v: r => r.wilayah, h: r => `${esc(r.kab)} (${esc(konfig.provinsi[r.prov] || r.prov)})<br>${pil(r.wilayah === "luar" ? "p-oranye" : "p-hijau", "pin", {sama_kab: "Satu kabupaten", sama_prov: "Satu provinsi", luar: "Luar provinsi"}[r.wilayah])}`},
      {l: "Durasi", k: "maks_hari", h: r => `${angka(r.maks_hari)} hari ${r.cukup_waktu ? pil("p-hijau", "centang", "Cukup") : pil("p-oranye", "jam", "Kurang")}`}, {l: "Beban", k: "beban"},
      {l: "Aksi", u: false, h: r => `<button class="ad-tombol kecil utama" data-tugaskan="${esc(r.id)}" data-perm="${esc(id)}">Tugaskan</button>`}], d.kandidat, "Belum ada relawan siap tugas yang cocok.", 8);
    Tabel(document.getElementById("tTugas"), [{l: "Relawan", k: "nama"}, {l: "Status", v: t => t.status, h: t => ps(PENUGASAN[t.status])}, {l: "Asuransi", v: t => t.asuransi, h: t => esc(ASURANSI[t.asuransi])}, {l: "Nilai", v: t => t.nilai ?? 0, h: t => t.nilai ?? "–"},
      {l: "Aksi", u: false, h: t => ["ditawarkan", "diterima"].includes(t.status) ? `<button class="ad-tombol kecil bahaya" data-batal="${esc(t.id)}">Batalkan</button>` : ""}], d.penugasan, "Belum ada yang ditugaskan.", 8);
    el.scrollIntoView({behavior: "smooth", block: "nearest"});
  }

  /* ================= kampus + MoU ================= */
  async function tampilKampus(isi) {
    const d = await ambil(`${API}/kampus`), f = formKampus;
    isi.innerHTML = `${kodeBaru ? `<div class="rw-kode ad-kartu"><h3>Kode koordinator "${esc(kodeBaru.nama)}" tampil SEKALI</h3><p class="rw-redup">Kirim tautan ini ke PIC kampus. Server hanya menyimpan sidik jarinya, jadi tidak bisa ditampilkan lagi; hilang = buat kode baru.</p>
        <input class="rw-isian" id="rwTautan" readonly value="${esc(kodeBaru.tautan)}"><div class="rw-aksi"><button class="ad-tombol utama" data-salin="1">Salin tautan</button></div></div>` : ""}
      <form id="rwFormKampus" class="rw-form ad-kartu"><h3>${f.id ? "Ubah kampus mitra" : "Catat kampus mitra dan MoU"}</h3><div class="rw-grid">
        <label>Nama kampus<input name="nama" required maxlength="120" value="${esc(f.nama || "")}"></label><label>Singkatan<input name="singkatan" maxlength="20" value="${esc(f.singkatan || "")}"></label>
        <label>Provinsi<select name="prov">${opsi(urutProv(), f.prov || "62")}</select></label><label>Nomor MoU<input name="no_mou" required maxlength="80" value="${esc(f.no_mou || "")}"></label>
        <label>Tanggal mulai<input name="mulai" type="date" required value="${esc(f.mulai || hariIni())}"></label><label>Tanggal berakhir<input name="berakhir" type="date" required value="${esc(f.berakhir || geser(365))}"></label>
        <label>PIC nama<input name="pic_nama" required maxlength="80" value="${esc(f.pic_nama || "")}"></label><label>PIC jabatan<input name="pic_jabatan" maxlength="80" value="${esc(f.pic_jabatan || "")}"></label>
        <label>PIC email<input name="pic_email" type="email" maxlength="254" value="${esc(f.pic_email || "")}"></label><label>PIC WhatsApp<input name="pic_wa" inputmode="tel" maxlength="20" value="${esc(f.pic_wa || "")}"></label>
        <label>Kuota relawan<input name="kuota" type="number" min="1" max="100000" required value="${esc(f.kuota ?? 50)}"></label><label>Catatan<input name="catatan" maxlength="500" value="${esc(f.catatan || "")}"></label></div>
        <div class="rw-aksi"><button class="ad-tombol utama" type="submit">${f.id ? "Simpan perubahan" : "Catat kampus dan buat kode"}</button>${f.id ? '<button class="ad-tombol" type="button" data-batal-ubah="1">Batal</button>' : ""}</div></form>
      ${wadah("tKampus")}`;
    Tabel(document.getElementById("tKampus"), [
      {l: "Kampus", k: "nama", h: k => `<b>${esc(k.nama)}</b>${dummyPil(k.dummy)}<br><span class="rw-redup">${esc(k.singkatan || "")} · ${esc(konfig.provinsi[k.prov] || k.prov)}</span>`}, {l: "MoU", k: "no_mou", h: k => `${esc(k.no_mou)}<br><span class="rw-redup">${tgl(k.mulai)} sampai ${tgl(k.berakhir)}</span>`},
      {l: "Status", v: k => k.sisa_hari, h: k => `${ps(MOU[k.status])}<br><span class="rw-redup">${k.status === "habis" ? `habis ${angka(-k.sisa_hari)} hari lalu` : `${angka(k.sisa_hari)} hari lagi`}</span>`},
      {l: "Kuota", v: k => k.terisi, h: k => `${angka(k.terisi)} / ${angka(k.kuota)}<br><span class="rw-redup">${angka(k.antre)} antre verifikasi</span>`}, {l: "Jam sah", k: "jam_sah_menit", h: k => jamF(k.jam_sah_menit)},
      {l: "PIC", u: false, h: k => `${esc(k.pic_nama)}<br><span class="rw-redup">${esc(k.pic_jabatan || "")}</span><br><span class="rw-redup">${esc(k.pic_email || "")} ${esc(k.pic_wa || "")}</span>`},
      {l: "Kode", v: k => k.kode_aktif ? 1 : 0, h: k => k.kode_aktif ? pil("p-hijau", "centang", "Aktif") : pil("p-abu", "x", "Dicabut")},
      {l: "Aksi", u: false, h: k => `<div class="rw-aksi"><button class="ad-tombol kecil" data-ubah-kampus="${esc(JSON.stringify(k))}">Ubah</button><button class="ad-tombol kecil" data-kode-kampus="kode_baru" data-id="${esc(k.id)}" data-nama="${esc(k.nama)}">Kode baru</button>${k.kode_aktif ? `<button class="ad-tombol kecil bahaya" data-kode-kampus="cabut_kode" data-id="${esc(k.id)}">Cabut kode</button>` : ""}</div>`}],
      d.kampus, "Belum ada kampus mitra.", 10);
  }

  /* ================= pelatihan ================= */
  async function tampilPelatihan(isi) {
    const [d, r] = await Promise.all([ambil(`${API}/pelatihan`), ambil(`${API}/relawan`)]);
    isi.innerHTML = `<form id="rwFormLatih" class="rw-form ad-kartu"><h3>Catat pelatihan atau sertifikasi</h3><div class="rw-grid"><label>Relawan<select name="relawan_id" required><option value="">Pilih relawan</option>${r.relawan.filter(x => x.status !== "daftar_hitam").map(x => `<option value="${esc(x.id)}">${esc(x.nama)} (${esc(x.kab)})</option>`).join("")}</select></label>
      <label>Nama pelatihan<input name="nama" required maxlength="120"></label><label>Penyelenggara<input name="penyelenggara" maxlength="120"></label><label>Tanggal<input name="tgl" type="date" required value="${hariIni()}"></label>
      <label>Berlaku sampai (opsional)<input name="berlaku_sampai" type="date"></label></div><div><button class="ad-tombol utama" type="submit">Simpan</button></div></form>${wadah("tLatih")}`;
    Tabel(document.getElementById("tLatih"), [{l: "Relawan", k: "relawan", h: p => esc(p.relawan) + dummyPil(p.dummy)}, {l: "Pelatihan", k: "nama"}, {l: "Penyelenggara", v: p => p.penyelenggara || ""}, {l: "Tanggal", k: "tgl", h: p => tgl(p.tgl)},
      {l: "Berlaku sampai", v: p => p.berlaku_sampai || "9999", h: p => p.berlaku_sampai ? `${tgl(p.berlaku_sampai)} ${p.kedaluwarsa ? pil("p-merah", "x", "Kedaluwarsa") : pil("p-hijau", "centang", "Berlaku")}` : "Tanpa batas"},
      {l: "Aksi", u: false, h: p => `<button class="ad-tombol kecil bahaya" data-hapus-latih="${esc(p.id)}">Hapus</button>`}], d.pelatihan, "Belum ada pelatihan tercatat.");
  }

  /* ================= asuransi, jam kerja, penilaian ================= */
  async function tampilAsuransi(isi) {
    const d = await ambil(`${API}/penugasan`), rows = d.penugasan.filter(p => !["ditolak", "dibatalkan"].includes(p.status));
    isi.innerHTML = `<div class="rw-bar"><span class="rw-redup">Status asuransi per penugasan. Ubah lalu tekan Simpan di barisnya.</span></div>${wadah("tAsur")}`;
    Tabel(document.getElementById("tAsur"), [{l: "Relawan", k: "nama", h: p => esc(p.nama) + dummyPil(p.dummy)}, {l: "Permintaan", k: "judul", h: p => `${esc(p.judul)}<br><span class="rw-redup">${tgl(p.mulai)} sampai ${tgl(p.selesai)}</span>`},
      {l: "Penugasan", v: p => p.status, h: p => ps(PENUGASAN[p.status])}, {l: "Asuransi", v: p => p.asuransi, h: p => `<select class="rw-isian" data-f="asuransi">${opsi(ASURANSI, p.asuransi)}</select>`},
      {l: "Nomor polis", u: false, h: p => `<input class="rw-isian" data-f="polis" maxlength="60" value="${esc(p.polis || "")}">`}, {l: "Aksi", u: false, h: p => `<button class="ad-tombol kecil utama" data-simpan-asuransi="${esc(p.id)}">Simpan</button>`}], rows, "Belum ada penugasan.");
  }
  async function tampilJam(isi) {
    const d = await ambil(`${API}/penugasan`);
    isi.innerHTML = `<div class="rw-bar"><span class="rw-redup">Sesi check-in dan check-out relawan. Jam yang disahkan masuk angka publik dan rekap kampus.</span></div>${wadah("tJam")}`;
    Tabel(document.getElementById("tJam"), [{l: "Relawan", k: "nama"}, {l: "Masuk", k: "masuk", h: j => wkt(j.masuk)}, {l: "Keluar", k: "keluar", h: j => j.keluar ? wkt(j.keluar) : pil("p-hijau", "api", "Berjalan")}, {l: "Durasi", k: "menit", h: j => jamF(j.menit)},
      {l: "Lokasi", u: false, h: j => j.lat == null ? "–" : `<a href="https://www.google.com/maps?q=${+j.lat},${+j.lon}" target="_blank" rel="noopener noreferrer">${(+j.lat).toLocaleString("id-ID", {maximumFractionDigits: 3})}, ${(+j.lon).toLocaleString("id-ID", {maximumFractionDigits: 3})}</a>`},
      {l: "Validasi", v: j => j.sah, h: j => ps(SAH[j.sah])}, {l: "Aksi", u: false, h: j => j.keluar == null ? "" : `<div class="rw-aksi"><button class="ad-tombol kecil utama" data-jam="sah" data-id="${esc(j.id)}">Sahkan</button><button class="ad-tombol kecil bahaya" data-jam="tolak" data-id="${esc(j.id)}">Tolak</button></div>`}], d.jam, "Belum ada sesi jam kerja.");
  }
  async function tampilPenilaian(isi) {
    const [d, h] = await Promise.all([ambil(`${API}/penugasan`), ambil(`${API}/relawan?status=daftar_hitam`)]);
    isi.innerHTML = `<h3>Purna tugas dan penilaian</h3>${wadah("tNilai")}<h3>Daftar hitam</h3>${wadah("tHitam")}`;
    Tabel(document.getElementById("tNilai"), [{l: "Relawan", k: "nama", h: p => esc(p.nama) + dummyPil(p.dummy)}, {l: "Permintaan", k: "judul"}, {l: "Penugasan", v: p => p.status, h: p => ps(PENUGASAN[p.status])}, {l: "Jam sah", k: "jam_sah_menit", h: p => jamF(p.jam_sah_menit)},
      {l: "Nilai (1-5)", v: p => p.nilai ?? 0, h: p => p.status === "selesai" ? `<select class="rw-isian" data-f="nilai"><option value="">Belum</option>${[1, 2, 3, 4, 5].map(n => `<option ${p.nilai === n ? "selected" : ""}>${n}</option>`).join("")}</select>` : "–"},
      {l: "Catatan", u: false, h: p => p.status === "selesai" ? `<input class="rw-isian" data-f="catatan" maxlength="300" value="${esc(p.nilai_catatan || "")}">` : ""},
      {l: "Aksi", u: false, h: p => `<div class="rw-aksi">${p.status === "selesai" ? `<button class="ad-tombol kecil utama" data-simpan-nilai="${esc(p.id)}">Simpan nilai</button>` : ""}${["bertugas", "diterima"].includes(p.status) ? `<button class="ad-tombol kecil utama" data-selesai="${esc(p.id)}">Tandai selesai</button>` : ""}</div>`}],
      d.penugasan.filter(p => ["diterima", "bertugas", "selesai"].includes(p.status)), "Belum ada penugasan yang berjalan atau selesai.");
    Tabel(document.getElementById("tHitam"), [{l: "Nama", k: "nama", h: r => esc(r.nama) + dummyPil(r.dummy)}, {l: "Kontak", u: false, h: r => `${esc(r.wa || "–")}<br><span class="rw-redup">${esc(r.email || "–")}</span>`}, {l: "Alasan", v: r => r.alasan || "", h: r => esc(r.alasan || "–")},
      {l: "Aksi", u: false, h: r => `<button class="ad-tombol kecil" data-r="pulihkan" data-id="${esc(r.id)}">Pulihkan</button>`}], h.relawan, "Tidak ada relawan dalam daftar hitam.");
  }
  const TAMPIL = {antrean: tampilAntrean, relawan: tampilRelawan, permintaan: tampilPermintaan, kampus: tampilKampus, pelatihan: tampilPelatihan, asuransi: tampilAsuransi, jam: tampilJam, penilaian: tampilPenilaian};

  /* ================= dummy (DUMMY.md) ================= */
  aksiJudul.innerHTML = '<button class="ad-tombol ad-bulat" data-dummy="isi" title="Isi data dummy untuk halaman ini" aria-label="Isi data dummy">🧪</button><button class="ad-tombol ad-bulat" data-dummy="hapus" title="Hapus semua data dummy" aria-label="Hapus data dummy">🧹</button>';
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy relawan (kampus, relawan, permintaan, penugasan, jam kerja, pelatihan)? Data asli tidak tersentuh.")) return;
    d.disabled = true;
    const r = await kirim("/api/relawan/dummy", {aksi: d.dataset.dummy}), j = r.j;
    alert(r.ok ? `${d.dataset.dummy === "isi" ? "Dummy dibuat" : "Dummy dihapus"}: ${j.kampus} kampus, ${j.relawan} relawan, ${j.permintaan} permintaan, ${j.penugasan} penugasan, ${j.jam} sesi jam, ${j.pelatihan} pelatihan.` : j.galat || `Gagal (${r.status})`);
    location.reload();   // muat ulang penuh (DUMMY.md syarat 6)
  });

  /* ================= peristiwa ================= */
  const muatLagi = async (t, ok) => { await muat(); catat(t, ok); };
  async function unduhCsv() {
    const q = new URLSearchParams(Object.entries(saring).filter(([, v]) => v)).toString(), r = await fetch(`${API}/csv${q ? "?" + q : ""}`);
    if (!r.ok) return catat("Ekspor gagal.", false);
    const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob()); a.download = (r.headers.get("content-disposition") || "").match(/filename="([^"]+)"/)?.[1] || "relawan.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  app.addEventListener("click", async e => {
    const t = e.target.closest("button, a"); if (!t) return;
    if (t.dataset.tab) return pindah(t.dataset.tab);
    if (t.dataset.csv) return unduhCsv();
    if (t.dataset.r) {   // aksi status relawan
      const aksi = t.dataset.r, butuhAlasan = ["daftar_hitam", "pulihkan"].includes(aksi); let alasan;
      if (butuhAlasan || aksi === "tolak") { alasan = prompt(butuhAlasan ? "Alasan (wajib, minimal 3 huruf):" : "Alasan menolak (boleh dikosongkan):"); if (alasan === null) return; }
      if (aksi === "nonaktifkan" && !confirm("Nonaktifkan relawan ini?")) return;
      t.disabled = true; const r = await kirim(`${API}/relawan/${t.dataset.id}`, {aksi, ...(alasan ? {alasan} : {})});
      if (r.ok && aksi === "kode_baru") { prompt("Tautan pribadi baru (salin sekarang, tampil sekali):", `${location.origin}/relawan/saya#k=${r.j.kode}`); }
      if (!r.ok) { t.disabled = false; return catat(r.j.galat || `Gagal (${r.status})`, false); }
      return muatLagi("Tersimpan.", true);
    }
    if (t.dataset.cocok) return cocok(t.dataset.cocok);
    if (t.dataset.tutup) { const r = await kirim(`${API}/permintaan/${t.dataset.id}`, {aksi: t.dataset.tutup}); return r.ok ? muatLagi("Tersimpan.", true) : catat(r.j.galat, false); }
    if (t.dataset.tugaskan) { t.disabled = true; const r = await kirim(`${API}/permintaan/${t.dataset.perm}`, {aksi: "tugaskan", relawan_id: t.dataset.tugaskan}); if (!r.ok) { t.disabled = false; return catat(r.j.galat || "Gagal menugaskan.", false); } terpilih = t.dataset.perm; return muatLagi("Penawaran tugas dikirim. Relawan melihatnya di halaman pribadinya.", true); }
    if (t.dataset.batal) { const r = await kirim(`${API}/penugasan/${t.dataset.batal}`, {aksi: "batalkan"}); return r.ok ? muatLagi("Penugasan dibatalkan.", true) : catat(r.j.galat, false); }
    if (t.dataset.salin) { const i = document.getElementById("rwTautan"); i.select(); try { await navigator.clipboard.writeText(i.value); catat("Tautan disalin.", true); } catch (x) { catat("Salin manual dengan Ctrl+C.", false); } return; }
    if (t.dataset.ubahKampus) { formKampus = JSON.parse(t.dataset.ubahKampus); await muat(); return document.getElementById("rwFormKampus").scrollIntoView({behavior: "smooth"}); }
    if (t.dataset.batalUbah) { formKampus = {}; return muat(); }
    if (t.dataset.kodeKampus) {
      const aksi = t.dataset.kodeKampus;
      if (!confirm(aksi === "cabut_kode" ? "Cabut kode koordinator? Koordinator tidak bisa masuk lagi." : "Buat kode baru? Kode lama langsung mati.")) return;
      const r = await kirim(`${API}/kampus/${t.dataset.id}`, {aksi}); if (!r.ok) return catat(r.j.galat, false);
      if (aksi === "kode_baru") kodeBaru = {nama: t.dataset.nama, tautan: r.j.tautan};
      return muatLagi(aksi === "kode_baru" ? "Kode baru dibuat. Salin tautannya di atas." : "Kode dicabut.", true);
    }
    if (t.dataset.hapusLatih) { if (!confirm("Hapus catatan pelatihan ini?")) return; const r = await kirim(`${API}/pelatihan/${t.dataset.hapusLatih}`, {aksi: "hapus"}); return r.ok ? muatLagi("Dihapus.", true) : catat(r.j.galat, false); }
    if (t.dataset.simpanAsuransi) {
      const tr = t.closest("tr"), r = await kirim(`${API}/penugasan/${t.dataset.simpanAsuransi}`, {aksi: "asuransi", asuransi: tr.querySelector('[data-f="asuransi"]').value, polis: tr.querySelector('[data-f="polis"]').value || undefined});
      return catat(r.ok ? "Asuransi tersimpan." : r.j.galat, r.ok);
    }
    if (t.dataset.jam) { const r = await kirim(`${API}/jam/${t.dataset.id}`, {aksi: t.dataset.jam}); return r.ok ? muatLagi("Tersimpan.", true) : catat(r.j.galat, false); }
    if (t.dataset.simpanNilai) {
      const tr = t.closest("tr"), n = tr.querySelector('[data-f="nilai"]').value; if (!n) return catat("Pilih nilai 1 sampai 5 dulu.", false);
      const r = await kirim(`${API}/penugasan/${t.dataset.simpanNilai}`, {aksi: "nilai", nilai: Number(n), catatan: tr.querySelector('[data-f="catatan"]').value || undefined});
      return catat(r.ok ? "Penilaian tersimpan." : r.j.galat, r.ok);
    }
    if (t.dataset.selesai) { if (!confirm("Tandai penugasan ini selesai (purna tugas)?")) return; const r = await kirim(`${API}/penugasan/${t.dataset.selesai}`, {aksi: "selesai"}); return r.ok ? muatLagi("Penugasan selesai. Kamu bisa menilainya.", true) : catat(r.j.galat, false); }
  });
  app.addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, v = Object.fromEntries(new FormData(f)), tb = f.querySelector('button[type="submit"]'); if (tb) tb.disabled = true;
    const kosongNull = o => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== ""));
    let r, pesanOk = "Tersimpan.";
    if (f.id === "rwSaring") { saring = kosongNull(v); return muat(); }
    if (f.id === "rwFormPermintaan") {
      const butuh = [...f.querySelectorAll("[data-butuh]")].map(i => ({keahlian: i.dataset.butuh, jumlah: Number(i.value)})).filter(b => b.jumlah > 0), num = x => x === "" ? undefined : Number(String(x).replace(",", "."));
      r = await kirim(`${API}/permintaan`, {...kosongNull(v), lat: num(v.lat), lon: num(v.lon), butuh}); pesanOk = "Permintaan dibuat. Tekan Cocokkan untuk melihat kandidat.";
    } else if (f.id === "rwFormKampus") {
      const b = {...kosongNull(v), kuota: Number(v.kuota)};
      if (formKampus.id) r = await kirim(`${API}/kampus/${formKampus.id}`, {aksi: "ubah", ...b}); else { r = await kirim(`${API}/kampus`, b); if (r.ok) kodeBaru = {nama: v.nama, tautan: r.j.tautan}; }
      if (r.ok) formKampus = {}; pesanOk = "Kampus tersimpan.";
    } else if (f.id === "rwFormLatih") r = await kirim(`${API}/pelatihan`, kosongNull(v));
    if (tb) tb.disabled = false;
    if (!r.ok) return catat(r.j.galat || `Gagal (${r.status})`, false);
    muatLagi(pesanOk, true);
  });

  kerangka(); muat();
})();
