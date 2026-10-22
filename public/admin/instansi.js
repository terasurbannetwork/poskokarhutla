/* Admin Akun Instansi (/admin/instansi): Validasi, Akun (buat massal bertahap + CSV), Pantau (per provinsi, per akun, terlambat + tagih wa.me), Kontak konsesi.
   Data dari /api/instansi/admin/* (moderator ke atas). Sandi baru tampil SEKALI: CSV dibuat di peramban dan tidak pernah dikirim balik ke server.
   INP: tombol tab menandai chrome (aria-pressed) dulu, isi digambar sesudah satu frame. CSP admin: tanpa skrip/gaya inline; semua teks data lewat esc(). */
(() => {
  const {esc, kirim, ambil} = window.Admin, app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul"), API = "/api/instansi/admin";
  const IKON = {validasi: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', akun: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.5 3.5-5.5 7-5.5s6.2 2 7 5.5"/>', pantau: '<path d="M3 12h4l3-7 4 14 3-7h4"/>', kontak: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1z"/>'};
  const ik = k => `<svg class="ai-ik" viewBox="0 0 24 24" aria-hidden="true">${IKON[k]}</svg>`;
  /* tab per peran: admin melihat semua; staf hanya tab yang diizinkan perannya (yang lain TIDAK dirender, bukan dinonaktifkan). Sama dengan hak API (P_VALIDASI, P_KONSESI di src/staf.js). */
  const TAB_PERAN = {validasi: ["verifikator", "pusdalops"], akun: [], pantau: ["pusdalops"], kontak: ["analis_konsesi"]};
  const TABS = [["validasi", ik("validasi") + "Validasi"], ["akun", ik("akun") + "Akun"], ["pantau", ik("pantau") + "Pantau"], ["kontak", ik("kontak") + "Kontak konsesi"]].filter(([k]) => !window.Admin.staf || window.Admin.boleh(TAB_PERAN[k]));
  const JENIS = {pemprov: "Pemprov", pemkab: "Pemkab", pemkot: "Pemkot", polda: "Polda", polres: "Polres", kodam: "Kodam", kodim: "Kodim"};
  const STATUS = {belum_klaim: "Belum diklaim", menunggu: "Menunggu", aktif: "Aktif", ditolak: "Ditolak", dicabut: "Dicabut"};
  const WARNA = {aktif: "hijau", menunggu: "kuning", ditolak: "merah", dicabut: "merah", belum_klaim: ""};
  const HASIL = {api_ada: "Api ada", bukan_api: "Bukan api", sudah_padam: "Sudah padam"}, STATUS_API = {menyala: "Menyala", bara: "Bara", padam: "Padam"};
  const KENDALA = {air_jauh: "Air jauh", akses_sulit_rawa: "Akses sulit di rawa", roda_empat_sulit: "Roda empat sulit masuk", air_tidak_cukup: "Air tidak cukup", asap_tebal: "Asap tebal", angin_kencang: "Angin kencang"};
  const BANTUAN = {personel: "Personel", air_pompa: "Air dan pompa", alat_berat: "Alat berat", heli_water_bombing: "Helikopter water bombing", logistik: "Logistik", medis: "Medis", lainnya: "Lainnya"};
  const PROV = window.Wilayah.PROV, kab = window.Wilayah.kab;   // satu tabel nama wilayah (/instansi_wilayah.js)
  const jam = t => t ? jamWIB(t) : "-";   // formatter repo (/inti/format.js)
  const num = v => fmt(v ?? 0);
  const pil = (t, k = "") => `<span class="ai-pil ${k}">${esc(t)}</span>`;
  const dum = x => x.dummy ? " " + pil("DUMMY", "dummy") : "";
  const kosong = t => `<p class="ai-kosong">${esc(t)}</p>`;
  const sesudahCat = fn => { let jalan = false; const f = () => { if (!jalan) { jalan = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(f)); setTimeout(f, 120); };
  const pesanTeks = (t, ok) => { pesanAkhir = t ? [t, ok] : null; const p = document.getElementById("aiPesan"); if (p) { p.textContent = t; p.className = "ai-pesan " + (ok ? "ok" : "galat"); } };
  /* sorot butir yang dituju deep link: kartu ber-data-id sama; pada tab Pantau rinciannya langsung dibuka */
  function sorot(id) {
    const k = [...document.querySelectorAll("#aiIsi [data-id]")].find(x => x.dataset.id === id);
    if (!k) return pesanTeks("Butir yang dituju sudah tidak ada di daftar ini. Mungkin sudah selesai ditangani.", true);
    k.classList.add("sorot"); k.scrollIntoView({block: "center"}); if (tab === "pantau") k.querySelector("[data-rincian]")?.click();
  }
  const tabel = (kepala, baris, k) => `<div class="ad-tabel-wadah"><table class="ad-tabel ai-tabel"><thead><tr>${kepala.map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${
    baris.length ? baris.map(r => { let i = 0; return r.replace(/<td(?=[ >])/g, () => `<td data-label="${esc(kepala[i++] || "")}"`); }).join("") : `<tr><td colspan="${kepala.length}">${esc(k)}</td></tr>`}</tbody></table></div>`;
  /* deep link dari Meja Pantau: #<tab> atau #<tab>/<id butir>; tab yang tidak diizinkan jatuh ke tab pertama yang boleh */
  /* filter jenis bencana tab Pantau (?bencana=banjir dst, divalidasi terhadap kamus bersama instansi_kartu.js; selain itu semua) */
  const bcAwal = new URLSearchParams(location.search).get("bencana");
  let bcPantau = bcAwal && window.KartuApi?.KAMUS?.[bcAwal] ? bcAwal : "";
  const [tabHash, sorotHash] = location.hash.slice(1).split("/");
  let tab = TABS.some(([k]) => k === tabHash) ? tabHash : TABS[0][0], sorotId = TABS.some(([k]) => k === tabHash) ? sorotHash : null, filter = {jenis: "", prov: "", status: "", hal: 0}, hasilBuat = [], pesanAkhir = null;

  function kerangka() {
    app.innerHTML = `<nav class="ad-tabs" aria-label="Akun Instansi">${TABS.map(([k, l]) => `<button data-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join("")}</nav>
      <p id="aiPesan" class="ai-pesan" role="status"></p><div id="aiIsi" class="ai-isi"><p class="ad-redup">Memuat…</p></div>`;
    if (pesanAkhir) pesanTeks(...pesanAkhir);
  }
  async function muat() {
    const isi = document.getElementById("aiIsi");
    try { const h = await TAMPIL[tab](); if (typeof h === "string") isi.innerHTML = h; isi.removeAttribute("aria-busy"); if (sorotId) { const id = sorotId; sorotId = null; sorot(id); } } catch (e) { isi.removeAttribute("aria-busy"); if (e.message !== "perlu masuk") isi.innerHTML = kosong("Gagal memuat: " + e.message); }
  }

  /* ---- Validasi ---- */
  const kartuVerif = a => { const v = a.verifikasi;
    return `<article class="ai-kartu" data-id="${esc(a.id)}" data-dikirim="${esc(a.dikirim)}"><div class="ai-kepala"><b>${esc(a.wilayah)}</b>${pil(JENIS[a.jenis])}${dum(a)}${a.email_resmi === false ? pil("Email bukan .go.id atau .mil.id", "merah") : ""}</div>
      <p class="ai-meta">Username ${esc(a.username)}, dikirim ${jam(a.dikirim)}</p>
      <dl class="ai-data"><div><dt>Nama</dt><dd>${esc(v.nama)}</dd></div><div><dt>Pangkat</dt><dd>${esc(v.pangkat || "tanpa pangkat")}</dd></div><div><dt>NIP atau NRP</dt><dd>${esc(v.nip)}</dd></div><div><dt>Jabatan</dt><dd>${esc(v.jabatan)}</dd></div>
        <div><dt>Unit</dt><dd>${esc(v.unit)}</dd></div><div><dt>Email</dt><dd>${esc(v.email)}</dd></div><div><dt>WhatsApp</dt><dd>${esc(v.wa)}</dd></div>${v.telepon_kantor ? `<div><dt>Telepon kantor</dt><dd>${esc(v.telepon_kantor)}</dd></div>` : ""}</dl>
      <div class="ai-doks"><a class="ad-tombol kecil" href="${API}/surat/${esc(a.id)}" target="_blank" rel="noopener">Buka surat tugas atau SK</a><a href="${API}/kartu/${esc(a.id)}" target="_blank" rel="noopener"><img src="${API}/kartu/${esc(a.id)}" alt="Kartu pegawai ${esc(v.nama)}" loading="lazy"></a></div>
      <div class="ai-aksi"><button class="ad-tombol utama" data-akun="setuju">Setujui</button><button class="ad-tombol bahaya" data-akun="tolak">Tolak dengan alasan</button><button class="ad-tombol" data-akun="cabut">Cabut</button></div></article>`; };
  async function tampilValidasi() {
    const d = await ambil(`${API}/antrean`, "Akun instansi");
    return d.akun.length ? `<div class="ai-daftar">${d.akun.map(kartuVerif).join("")}</div>` : kosong("Tidak ada akun yang menunggu validasi.");
  }

  /* ---- Akun ---- */
  const opsi = (o, pilih, semua) => `<option value="">${semua}</option>` + Object.entries(o).map(([k, v]) => `<option value="${esc(k)}" ${String(pilih) === String(k) ? "selected" : ""}>${esc(v)}</option>`).join("");
  /* tab Akun: kerangka (buat massal, filter) digambar SEKALI; paginasi dan filter hanya mengganti #aiTabel, dengan chrome urgent lebih dulu */
  async function tampilAkun() {
    document.getElementById("aiIsi").innerHTML = `<div class="ai-kartu"><h3>Buat akun massal</h3><p class="ai-meta">Membuat semua akun yang belum ada (pemprov, polda, kodam, pemkab atau pemkot, polres, kodim) bertahap 100 per permintaan. Akun yang sudah ada dilewati,
      jadi aman diulang. Sandi hanya tampil sekali dan masuk ke berkas CSV yang diunduh di peramban ini, jangan menutup halaman sebelum selesai. Sandi di CSV hanya sandi AWAL: wakil WAJIB membuat sandi baru yang tidak diketahui admin saat pertama masuk sesudah akunnya aktif.</p>
      <div class="ai-aksi"><button class="ad-tombol utama" id="aiBuat">Buat akun yang belum ada</button><button class="ad-tombol" id="aiCsv" ${hasilBuat.length ? "" : "disabled"}>Unduh CSV (${num(hasilBuat.length)} akun)</button></div><p id="aiProgres" class="ai-meta"></p></div>
      <div class="ai-bar"><label>Jenis<select id="aiFJenis">${opsi(JENIS, filter.jenis, "Semua")}</select></label><label>Provinsi<select id="aiFProv">${opsi(PROV, filter.prov, "Semua")}</select></label>
      <label>Status<select id="aiFStatus">${opsi(STATUS, filter.status, "Semua")}</select></label><span id="aiJumlah"></span></div><div id="aiTabel" aria-live="polite"></div>`;
    return muatAkun(true);
  }
  async function muatAkun(awal) {
    const w = document.getElementById("aiTabel"); if (!w) return;
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v !== "" && v !== 0)), d = await ambil(`${API}/akun?${q}`, "Akun instansi");
    document.getElementById("aiJumlah").textContent = Object.entries(d.jumlah).map(([k, n]) => `${STATUS[k]} ${num(n)}`).join(", ");
    const baris = d.akun.map(a => `<tr data-id="${esc(a.id)}"><td><b>${esc(a.username)}</b>${dum(a)}</td><td>${esc(JENIS[a.jenis])}</td><td>${esc(a.wilayah)}</td><td>${pil(STATUS[a.status], WARNA[a.status])}${a.wajib_ganti && a.status === "aktif" ? " " + pil("Belum ganti sandi", "kuning") : ""}</td>
      <td>${esc(a.verifikasi.nama || "-")}</td><td class="a"><button class="ad-tombol kecil" data-rincianakun="1">Rincian</button> ${a.status === "dicabut" ? "" : `<button class="ad-tombol kecil bahaya" data-akun="cabut">Cabut</button> `}<button class="ad-tombol kecil" data-akun="reset">Reset sandi</button></td></tr>`);
    w.innerHTML = `${tabel(["Username", "Jenis", "Wilayah", "Status", "Wakil", ""], baris, "Belum ada akun. Tekan Buat akun yang belum ada.")}
      <div class="ai-aksi"><button class="ad-tombol kecil" data-hal="-1" ${filter.hal ? "" : "disabled"}>Sebelumnya</button><span class="ai-meta">Halaman ${filter.hal + 1}, ${num(d.total)} akun</span><button class="ad-tombol kecil" data-hal="1" ${(filter.hal + 1) * 50 < d.total ? "" : "disabled"}>Berikutnya</button></div><div id="aiRincianAkun"></div>`;
    w.removeAttribute("aria-busy");
  }
  /* chrome urgent (nonaktif, aria-busy, "Memuat…"), lalu muat sesudah satu frame tercat */
  function sibukAkun() {
    const w = document.getElementById("aiTabel"); if (!w) return;
    w.setAttribute("aria-busy", "true"); for (const b of w.querySelectorAll("button")) b.disabled = true;
    const m = w.querySelector(".ai-aksi .ai-meta"); if (m) m.textContent = "Memuat…";
    sesudahCat(() => muatAkun().catch(e => { if (e.message !== "perlu masuk") w.innerHTML = kosong("Gagal memuat: " + e.message); }));
  }
  async function rincianAkunAdmin(id) {
    const w = document.getElementById("aiRincianAkun"); if (!w) return;
    w.innerHTML = `<p class="ad-redup">Memuat…</p>`;
    const d = await ambil(`${API}/akun/${id}`), v = d.akun.verifikasi, AKSI = {setuju: "Disetujui", tolak: "Ditolak", cabut: "Dicabut", reset: "Sandi direset", ganti_sandi: "Sandi diganti pengguna", buat_massal: "Dibuat massal", terima_usulan: "Usulan kontak diterima", tolak_usulan: "Usulan kontak ditolak"};
    w.innerHTML = `<div class="ai-kartu"><div class="ai-kepala"><b>${esc(d.akun.username)}</b>${pil(STATUS[d.akun.status], WARNA[d.akun.status])}</div>
      <p class="ai-meta">${esc(d.akun.wilayah)}${v.nama ? `<br>${esc(v.nama)}, NIP/NRP ${esc(v.nip)}, ${esc(v.jabatan)}, ${esc(v.unit)}<br>${esc(v.email)}, WhatsApp ${esc(v.wa)}` : "<br>Belum mengisi verifikasi"}</p>
      <h3>Jejak audit</h3>${d.jejak.length ? `<ul>${d.jejak.map(x => `<li>${jam(x.waktu)}: ${esc(AKSI[x.aksi] || x.aksi)} oleh ${esc(x.oleh)}${x.alasan ? `, ${esc(x.alasan)}` : ""}</li>`).join("")}</ul>` : `<p class="ai-meta">Belum ada aksi.</p>`}</div>`;
  }
  const csv = rows => "﻿username,jenis,wilayah,sandi\n" + rows.map(r => [r.username, r.jenis, r.wilayah, r.sandi].map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n") + "\n";
  function unduhCsv() {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(hasilBuat)], {type: "text/csv;charset=utf-8"}));
    a.download = `akun-instansi-${new Date().toISOString().slice(0, 10)}.csv`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }
  const segarkanCsv = () => { const b = document.getElementById("aiCsv"); if (b) { b.disabled = !hasilBuat.length; b.textContent = `Unduh CSV (${num(hasilBuat.length)} akun)`; } };
  async function buatMassal(t) {
    if (!confirm("Buat semua akun instansi yang belum ada? Sandi hanya tampil sekali, simpan CSV yang diunduh.")) return;
    t.disabled = true; let mulai = 0, dilewati = 0; const p = document.getElementById("aiProgres");
    while (mulai != null) {
      const r = await kirim(`${API}/buat`, {mulai, batas: 100});
      if (!r.ok) { p.textContent = `Berhenti di urutan ${num(mulai)}: ${r.j.galat || r.status}. Unduh CSV bagian yang sudah jadi, lalu ulangi (akun yang ada dilewati).`; break; }
      hasilBuat.push(...r.j.dibuat); dilewati += r.j.dilewati; mulai = r.j.berikut;
      p.textContent = `Dibuat ${num(hasilBuat.length)}, dilewati ${num(dilewati)}, dari ${num(r.j.total)} definisi akun.${mulai == null ? " Selesai." : ""}`;
      segarkanCsv();
    }
    t.disabled = false; segarkanCsv();
    if (hasilBuat.length) unduhCsv();
    await muatAkun().catch(() => null);   // tabel, ringkasan jumlah, dan paginasi mengikuti akun yang baru dibuat, tanpa muat ulang halaman
  }

  /* ---- Pantau ---- */
  const rekBlok = r => !r ? "" : `<div class="ai-rek">${pil("Perkiraan, belum divalidasi lapangan", "kuning")}${Array.isArray(r.cara) && r.cara.length ? `<b>Cara pemadaman</b><ol>${r.cara.map(c => `<li>${esc(c.metode)}${c.alasan ? `: ${esc(c.alasan)}` : ""}</li>`).join("")}</ol>` : ""}
    ${Array.isArray(r.alat) && r.alat.length ? `<b>Alat</b><ul>${r.alat.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${Array.isArray(r.bara_cm) && r.bara_cm.length === 3 ? `<p>Perkiraan kedalaman bara ${r.bara_cm.map(x => num(x)).join(", ")} cm (rendah, tengah, tinggi)</p>` : ""}${r.catatan ? `<p>${esc(r.catatan)}</p>` : ""}</div>`;
  async function tampilPantau() {
    const d = await ambil(`${API}/pantau${bcPantau ? "?bencana=" + encodeURIComponent(bcPantau) : ""}`, "Akun instansi");
    const chip = (id, nama, n) => `<button type="button" class="ad-tombol kecil" data-bcf="${esc(id)}" aria-pressed="${bcPantau === id}">${esc(nama)} <b>${num(n)}</b></button>`;
    const chips = d.bencana.length > 1 ? `<div class="ai-aksi" role="group" aria-label="Jenis bencana">${chip("", "Semua", d.bencana.reduce((a, b) => a + b.n, 0))}${d.bencana.map(b => chip(b.id, b.nama, b.n)).join("")}</div>` : "";
    const prov = d.provinsi.map(p => `<article class="ai-prov${p.terlambat ? " telat" : ""}"><div class="ai-kepala"><b>${esc(p.nama)}</b>${p.terlambat ? pil(num(p.terlambat) + " terlambat", "merah") : pil("Tepat waktu", "hijau")}</div>
      <div class="ai-angka"><b>${num(p.aktif)}</b><span>tugas aktif</span></div>
      <div class="ai-hal"><span>Terkonfirmasi <b>${num(p.terkonfirmasi)}</b></span><span>Padam <b>${num(p.padam)}</b></span><span>Bukan api <b>${num(p.bukan_api)}</b></span></div>
      <p class="ai-meta">Median waktu konfirmasi ${p.median_konfirmasi_menit == null ? "belum ada" : fmt.durasi(p.median_konfirmasi_menit * 60e3)}</p></article>`);
    const akun = d.akun.map(a => `<tr><td><b>${esc(a.username)}</b>${dum(a)}</td><td>${esc(JENIS[a.jenis])}</td><td>${esc(kab(a.wilayah))}</td><td class="n">${num(a.isian)}</td><td class="n">${num(a.konfirmasi)}</td><td class="n">${num(a.kabar)}</td><td class="w">${jam(a.terakhir)}</td></tr>`);
    const lambat = d.terlambat.map(t => `<article class="ai-kartu ai-telat" data-id="${esc(t.id)}"><div class="ai-kepala"><b>${esc(kab(t.kab))}</b>${t.kec ? `<span class="ai-meta">Kec. ${esc(t.kec)}</span>` : ""}${d.bencana.length > 1 || t.bencana !== "karhutla" ? pil(t.bencana_nama) : ""}${pil(t.langkah === "konfirmasi" ? "Konfirmasi terlambat" : "Kabar terlambat", "merah")}${dum(t)}</div>
      <div class="ai-angka merah"><b>${fmt.durasi(Date.now() - t.tenggat)}</b><span>melewati batas</span></div>
      <p class="ai-meta">${esc(t.ciri || "")}</p>${t.padam && window.Tugaskan ? `<p class="ai-meta">${window.Tugaskan.padamPil({padam: t.padam})} ${esc(t.padam.label)}</p>` : ""}
      <p class="ai-meta">Tugas dibuat ${jam(t.dibuat)}, batas ${jam(t.tenggat)}</p>
      <div class="ai-tagih">${t.dummy ? `<span class="ai-meta">Data contoh: tidak ada tautan tagih.</span>` : t.tagih.length ? t.tagih.map(x => `<a class="ad-tombol utama" href="${esc(x.tautan)}" target="_blank" rel="noopener" title="${esc(x.untuk)}"><b>${ik("kontak")}${x.jenis === "wakil" ? "Tagih wakil" : "Tagih PIC"}</b><small>${esc(x.nama ?? x.untuk)}</small></a>`).join("") : `<span class="ai-meta">Belum ada nomor WhatsApp yang bisa ditagih.</span>`}
      <button class="ad-tombol" data-rincian="1">Rincian</button></div><div class="ai-rincian"></div></article>`);   // tab Pantau hanya tampil untuk admin dan staf pusdalops; rincian terbuka untuk P_VALIDASI (keputusan pemilik 21 Okt 2026)
    return `${chips}<h3 class="ai-judul">Per provinsi</h3>${prov.length ? `<div class="ai-prov-grid">${prov.join("")}</div>` : kosong(bcPantau ? "Belum ada tugas untuk jenis bencana ini." : "Belum ada tugas.")}
      <h3 class="ai-judul">Tugas terlambat</h3>${lambat.length ? `<div class="ai-daftar">${lambat.join("")}</div>` : kosong("Tidak ada tugas terlambat.")}
      <h3 class="ai-judul">Per akun aktif</h3>${tabel(["Username", "Jenis", "Wilayah", "Isian", "Konfirmasi", "Kabar", "Terakhir"], akun, "Belum ada akun aktif.")}`;
  }
  const SUMBER = {exif: "waktu EXIF foto", gps: "waktu GPS perangkat", unggah: "waktu unggah"};
  const NAMA_ALAT = {pompa: "pompa", selang_m: "selang (m)", jet_shooter: "jet shooter", heli_wb: "helikopter water bombing", alat_berat: "alat berat", drone_termal: "drone termal", pembasah_l: "bahan pembasah (liter konsentrat)"};
  /* "di lapangan sekarang" (kabar terakhir), selisih terhadap perkiraan kebutuhan, dan waktu terdokumentasi */
  function sekarang(t) {
    const s = t.sekarang, d = t.dokumentasi || {};
    if (!s && d.mulai == null) return "";
    return `<div class="ai-rek"><b>Di lapangan sekarang</b>${s ? `<p>${esc(STATUS_API[s.status_api] || "-")}, ${s.personel_efektif != null ? num(s.personel_efektif) + " personel" : "personel belum diisi"}${s.personel_terlihat != null ? `, minimal ${num(s.personel_terlihat)} orang terlihat di foto (hitungan mesin, bisa kurang karena asap atau di luar bingkai)` : ""}, ${s.regu != null ? num(s.regu) + " regu" : "regu belum diisi"}.${s.alat && Object.keys(s.alat).length ? ` Alat: ${esc(Object.entries(s.alat).map(([a, n]) => `${NAMA_ALAT[a] || a} ${num(n)}`).join(", "))}.` : ""}</p>` : "<p>Belum ada kabar tindakan.</p>"}
      ${d.mulai != null ? `<p>Pemadaman terdokumentasi mulai ${jam(d.mulai)}${d.padam != null ? `, padam terdokumentasi ${jam(d.padam)}${d.durasi_ms != null ? `, selang ${fmt.durasi(d.durasi_ms)}` : ""}` : ""}. Ini waktu foto atau video, bukan jam mulai atau padam yang sebenarnya.${d.mulai_manual ? ` Koreksi manual: mulai ${jam(d.mulai_manual)}.` : ""}</p>` : ""}</div>`;
  }
  const galeri = media => !media.length ? "" : `<div class="ai-galeri">${media.map(m => `<figure class="ai-media"><a href="${API}/media/${esc(m.id)}" target="_blank" rel="noopener"><img src="${API}/thumb/${esc(m.id)}" alt="${m.jenis === "video" ? "Video" : "Foto"} lapangan" loading="lazy"></a>
    <figcaption>${m.jenis === "video" ? `Video ${num(m.durasi)} detik<br>` : ""}${jam(m.waktu_ambil)}, ${esc(SUMBER[m.sumber_waktu])}<br>${m.orang_terdeteksi != null ? `minimal ${num(m.orang_terdeteksi)} orang terlihat (mesin, ${m.orang_sumber === "bingkai_klien" ? "dari bingkai video kiriman peramban, tak bisa diperiksa server" : "dari thumbnail tersimpan"})${m.orang_bingkai && m.orang_bingkai.length > 1 ? `, per bingkai ${esc(m.orang_bingkai.join(", "))}` : ""}` : "orang tidak dihitung"}${window.Tugaskan ? `<br>${window.Tugaskan.exifInfo(m)}` : m.exif_jarak != null ? `<br>EXIF ${num(m.exif_jarak)} m dari GPS` : ""}${m.gps_curiga ? `<br>${pil("GPS curiga", "merah")} ${esc(m.gps_curiga)}` : ""}${m.jauh ? `<br>${pil("Jauh dari cluster", "merah")}` : ""}${dum(m)}</figcaption></figure>`).join("")}</div>`;
  async function rincian(id, wadah) {
    if (wadah.innerHTML) { wadah.innerHTML = ""; return; }
    wadah.textContent = "Memuat…";
    const d = await ambil(`${API}/tugas/${id}`);
    const T = window.Tugaskan, aksesH = window.AksesKartu ? window.AksesKartu.html(d.tugas.akses) : "";
    wadah.innerHTML = (T ? T.padamBlok(d.tugas) : "") + `<div class="kp-wadah"></div>` + aksesH + `<div class="tg-adm"></div>` + rekBlok(d.tugas.rekomendasi) + window.Kebutuhan.html(d.tugas, !!d.tugas.rekomendasi) + window.Kebutuhan.gudang(d.gudang_terdekat) + sekarang(d.tugas) + (d.isian.length ? d.isian.map(i => `<p class="ai-meta"><b>${i.langkah === "konfirmasi" ? "Konfirmasi" : "Kabar"}</b> ${jam(i.dibuat)} oleh ${esc(i.oleh.username)} (${esc(i.oleh.wilayah)}).
      ${i.langkah === "konfirmasi" ? `${esc(HASIL[i.hasil])}. PIC ${esc(i.pic_nama)}, ${esc(i.pic_jabatan)}, WhatsApp ${esc(i.pic_wa)}.` : `${esc(i.tindakan)} Status ${esc(STATUS_API[i.status_api])}. Kendala ${esc(i.kendala.map(k => KENDALA[k]).concat(i.kendala_lain ? [i.kendala_lain] : []).join(", ") || "tidak ada")}.
      Bantuan ${esc(i.bantuan.map(k => BANTUAN[k]).concat(i.bantuan_lain ? [i.bantuan_lain] : []).join(", ") || "tidak ada")}. Luas ${i.luas_ha == null ? "-" : num(i.luas_ha)} ha, padam ${i.padam_ha == null ? "-" : num(i.padam_ha)} ha.`}
      Personel ${i.personel == null ? "-" : num(i.personel) + " (manual)"}${i.personel_terlihat != null ? `, mesin melihat minimal ${num(i.personel_terlihat)}` : ""}${i.personel_unsur ? `, per unsur ${esc(Object.entries(i.personel_unsur).map(([k, n]) => `${k} ${num(n)}`).join(", "))}` : ""}${i.regu != null ? `, ${num(i.regu)} regu` : ""}${i.alat_dipakai ? `. Alat ${esc(Object.entries(i.alat_dipakai).map(([a, n]) => `${NAMA_ALAT[a] || a} ${num(n)}`).join(", "))}` : ""}.
      ${i.kedalaman_bara_cm != null ? ` Kedalaman bara terukur ${num(i.kedalaman_bara_cm)} cm.` : ""}${i.lahan_teramati ? ` Lahan ${esc(i.lahan_teramati)}.` : ""}
      ${i.jarak_km != null ? ` Jarak ke pusat cluster ${num(i.jarak_km)} km${i.jauh ? " (jauh, lebih dari 5 km)" : ""}.` : ""}${i.gps_curiga ? ` ${pil("GPS curiga", "merah")} ${esc(i.gps_curiga)}` : ""}</p>`).join("") : `<p class="ai-meta">Belum ada isian.</p>`)
      + galeri(d.media) + (d.usulan.length ? `<p class="ai-meta">Usulan kontak PT: ${d.usulan.map(u => `${esc(u.nama_pt)} (${esc(u.status)})`).join(", ")}</p>` : "");
    if (d.tugas.status === "buka" && d.tugas.bencana && d.tugas.bencana !== "karhutla") wadah.insertAdjacentHTML("beforeend", `<div class="ai-aksi"><button class="ad-tombol bahaya" data-selesai="${esc(d.tugas.id)}">Tutup tugas ${esc(d.tugas.bencana_nama.toLowerCase())} ini</button></div>`);   // karhutla ditutup lewat laporan padam + satelit
    if (window.KartuApi) window.KartuApi.pasang(wadah.querySelector(".kp-wadah"), d.tugas, d.kartu ?? d.tugas.kartu ?? null);
    if (T) T.pasangAdmin(d.tugas, wadah.querySelector(".tg-adm"));   // posisi terakhir dan jejak, baca saja
  }

  /* ---- Kontak konsesi ---- */
  const barisKontak = k => `${esc(k.kontak || "tanpa nama PIC")}, ${esc([k.wa && "WhatsApp " + k.wa, k.email, k.telepon].filter(Boolean).join(", ") || "tanpa kontak")}${k.catatan ? `<br>${esc(k.catatan)}` : ""}`;
  async function tampilKontak() {
    const d = await ambil(`${API}/usulan?semua=1`, "Akun instansi");
    return d.usulan.length ? `<div class="ai-daftar">${d.usulan.map(u => `<article class="ai-kartu" data-id="${esc(u.id)}"><div class="ai-kepala"><b>${esc(u.nama_pt)}</b>${pil(u.status, u.status === "diterima" ? "hijau" : u.status === "ditolak" ? "merah" : "kuning")}${dum(u)}</div>
      <p class="ai-meta">Diusulkan ${esc(u.username)} (${esc(u.wilayah)}), ${jam(u.dibuat)}</p>
      <div class="ai-banding"><div><b>Usulan baru</b><p class="ai-meta">${barisKontak(u)}</p></div>${u.kontak_lama ? `<div><b>Kontak lama di Kontak PT</b><p class="ai-meta">${esc(u.kontak_lama.nama_pt)}<br>${barisKontak(u.kontak_lama)}</p></div>` : ""}</div>
      ${u.alasan ? `<p class="ai-meta">${esc(u.alasan)}</p>` : ""}${u.status === "menunggu" ? `${u.kontak_lama ? `<label class="ai-meta"><input type="checkbox" data-timpa="1"> Timpa kontak lama dengan usulan ini</label>` : ""}<div class="ai-aksi"><button class="ad-tombol kecil utama" data-usulan="terima">Terima ke Kontak PT</button><button class="ad-tombol kecil bahaya" data-usulan="tolak">Tolak</button></div>` : ""}</article>`).join("")}</div>`
      : kosong("Belum ada usulan kontak dari instansi.");
  }
  const TAMPIL = {validasi: tampilValidasi, akun: tampilAkun, pantau: tampilPantau, kontak: tampilKontak};

  /* ---- dummy (DUMMY.md): 🧪 isi seluruh rantai halaman ini, 🧹 hapus semua dummy ---- */
  if (!window.Admin.staf) aksiJudul.innerHTML = '<button class="ad-tombol ad-bulat" data-dummy="isi" title="Isi data dummy untuk halaman ini" aria-label="Isi data dummy">🧪</button><button class="ad-tombol ad-bulat" data-dummy="hapus" title="Hapus semua data dummy" aria-label="Hapus data dummy">🧹</button>';
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy instansi (akun, tugas, isian, usulan contoh)? Data asli tidak tersentuh.")) return;
    d.disabled = true;
    const r = await kirim(`${API}/dummy`, {aksi: d.dataset.dummy});
    const teks = r.ok ? (d.dataset.dummy === "isi" ? `Dummy dibuat: ${r.j.akun} akun, ${r.j.tugas} tugas, ${r.j.isian} isian, ${r.j.usulan} usulan kontak.` : `Dummy dihapus: ${r.j.akun} akun, ${r.j.tugas} tugas, ${r.j.isian} isian, ${r.j.usulan} usulan.`) : (r.j.galat || `Gagal (${r.status})`);
    d.disabled = false;
    if (r.ok) { hasilBuat = []; filter = {jenis: "", prov: "", status: "", hal: 0}; kerangka(); await muat(); }   // semua tab digambar ulang dari data baru (DUMMY.md syarat 6), pesan tetap tampil inline
    pesanTeks(teks, r.ok);
  });

  app.addEventListener("click", async e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.tab) {   // chrome urgent (tombol aktif, aria-busy, "Memuat…"), isi tab menyusul sesudah satu frame; hanya #aiIsi yang diganti
      tab = t.dataset.tab; history.replaceState(null, "", "#" + tab); for (const b of app.querySelectorAll("[data-tab]")) b.setAttribute("aria-pressed", String(b.dataset.tab === tab)); document.getElementById("aiPesan").textContent = "";
      const isi = document.getElementById("aiIsi"); isi.setAttribute("aria-busy", "true"); isi.innerHTML = `<p class="ad-redup">Memuat…</p>`; return sesudahCat(muat);
    }
    if (t.dataset.bcf !== undefined) {   // chip jenis bencana: tanda aktif seketika (urgent), daftar menyusul sesudah satu frame
      bcPantau = t.dataset.bcf; for (const b of t.parentNode.children) b.setAttribute("aria-pressed", String(b === t));
      const isi = document.getElementById("aiIsi"); isi.setAttribute("aria-busy", "true"); return sesudahCat(muat);
    }
    if (t.dataset.selesai) {
      if (!confirm("Tutup tugas ini? Statusnya menjadi selesai (menunggu verifikasi). Tindakan ini tidak bisa dibatalkan dari halaman ini.")) return;
      t.disabled = true; const r = await kirim(`${API}/selesai/${t.dataset.selesai}`, {}); t.disabled = false;
      pesanTeks(r.ok ? "Tugas ditutup." : (r.j.galat || `Gagal (${r.status})`), r.ok); return r.ok || r.status === 409 ? muat() : undefined;
    }
    if (t.id === "aiBuat") return buatMassal(t);
    if (t.id === "aiCsv") return unduhCsv();
    if (t.dataset.hal) { filter.hal = Math.max(0, filter.hal + Number(t.dataset.hal)); return sibukAkun(); }
    if (t.dataset.rincianakun) return rincianAkunAdmin(t.closest("[data-id]").dataset.id).catch(x => pesanTeks(x.message, false));
    const kartu = t.closest("[data-id]");
    if (t.dataset.rincian && kartu) return rincian(kartu.dataset.id, kartu.querySelector(".ai-rincian"));
    if (t.dataset.akun && kartu) {
      const aksi = t.dataset.akun; let alasan;
      if (aksi === "tolak") { alasan = prompt("Alasan penolakan (dibaca wakil instansi):"); if (!alasan) return; }
      if (aksi === "cabut") { if (!confirm("Cabut akun ini? Sesi aktifnya langsung berakhir.")) return; alasan = prompt("Alasan (boleh kosong):") || undefined; }
      if (aksi === "reset" && !confirm("Reset sandi akun ini? Sandi lama dan semua sesi langsung tidak berlaku.")) return;
      const dikirim = kartu.dataset.dikirim ? Number(kartu.dataset.dikirim) : undefined;   // setuju dan tolak membawa waktu kirim yang sedang diperiksa (409 bila wakil mengirim ulang)
      t.disabled = true; const r = await kirim(`${API}/akun/${kartu.dataset.id}`, {aksi, ...(alasan ? {alasan} : {}), ...(aksi === "setuju" || aksi === "tolak" ? {dikirim} : {})}); t.disabled = false;
      if (!r.ok) { pesanTeks(r.j.galat || `Gagal (${r.status})`, false); return r.status === 409 && muat(); }
      if (aksi === "reset") { prompt("Sandi sementara (tampil sekali, salin sekarang). Wakil WAJIB membuat sandi baru saat masuk:", r.j.sandi); pesanTeks("Sandi direset. Berikan ke wakil lewat jalur resmi; ia harus membuat sandi baru.", true); }
      else pesanTeks({setuju: "Akun disetujui.", tolak: "Akun ditolak; wakil bisa memperbaiki.", cabut: "Akun dicabut."}[aksi], true);
      return document.getElementById("aiTabel") ? sibukAkun() : muat();
    }
    if (t.dataset.usulan && kartu) {
      let alasan; if (t.dataset.usulan === "tolak") { alasan = prompt("Alasan penolakan:"); if (!alasan) return; }
      const timpa = !!kartu.querySelector("[data-timpa]")?.checked;
      if (t.dataset.usulan === "terima" && kartu.querySelector("[data-timpa]") && !timpa) return pesanTeks("Perusahaan ini sudah punya kontak. Bandingkan dengan kontak lama, lalu centang Timpa kontak lama untuk menerima.", false);
      t.disabled = true; const r = await kirim(`${API}/usulan/${kartu.dataset.id}`, {aksi: t.dataset.usulan, ...(alasan ? {alasan} : {}), ...(timpa ? {timpa: true} : {})}); t.disabled = false;
      pesanTeks(r.ok ? (t.dataset.usulan === "terima" ? "Usulan diterima dan masuk Kontak PT." : "Usulan ditolak.") : (r.j.galat || `Gagal (${r.status})`), r.ok); return muat();
    }
  });
  app.addEventListener("change", e => {
    const peta = {aiFJenis: "jenis", aiFProv: "prov", aiFStatus: "status"};
    if (peta[e.target.id]) { filter[peta[e.target.id]] = e.target.value; filter.hal = 0; sibukAkun(); }
  });
  kerangka(); muat();
})();
