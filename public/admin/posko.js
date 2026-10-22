/* Admin Ruang Posko (/admin/posko): antrean & panggilan perusahaan, neraca harian, laporan regu, regu berkode, kontak PT, templat paparan,
   dan tombol dummy 🧪/🧹. CSP admin: tanpa skrip/gaya inline; semua teks dari data lewat esc() atau textContent. Data dari /api/posko/* (sesi admin). */
(() => {
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul"), API = "/api/posko";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const jam = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : "–";
  const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const num = v => Number(v ?? 0).toLocaleString("id-ID", {maximumFractionDigits: 2});
  const KENDALA = {air_jauh: "Air jauh", akses_sulit_rawa: "Akses sulit di rawa", roda_empat_sulit: "Roda empat sulit masuk", air_tidak_cukup: "Air tidak cukup", asap_tebal: "Asap tebal", angin_kencang: "Angin kencang"};
  const UNSUR = ["BPBD", "Manggala Agni", "TNI", "Polri", "MPA", "Damkar", "Perusahaan", "Relawan", "Lainnya"];
  const STATUS_LAP = {menyala: "Menyala", bara: "Bara", padam: "Padam", tidak_ditemukan: "Tidak ditemukan"};
  const STATUS_P = {baru: "Baru", dipanggil: "Dipanggil", direspons: "Direspons", dicek: "Dicek lapangan", tindak_lanjut: "Tindak lanjut", selesai: "Selesai", abaikan: "Diabaikan"};
  /* staf analis_konsesi hanya membuka antrean panggilan dan Kontak PT (hak API-nya); tab lain tidak dirender. Admin: semua. */
  const TABS = [["antrean", "📞 Antrean & Panggilan"], ["neraca", "📊 Neraca harian"], ["laporan", "📝 Laporan regu"], ["regu", "👥 Regu"], ["kontak", "☎️ Kontak PT"], ["templat", "🖥️ Templat paparan"]].filter(([k]) => !window.Admin.staf || k === "antrean" || k === "kontak");
  let tab = "antrean", semua = false, tglNeraca = hariIni(), tglLaporan = hariIni(), timer = null, antrean = null;

  async function kirim(url, body) {
    const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(body)});   // x-pb wajib untuk sesi staf
    return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))};
  }
  async function ambil(url) {
    const r = await fetch(url);
    if (r.status === 403) { location.href = window.Admin.staf ? "/admin/pantau" : "/admin/masuk"; throw new Error("perlu masuk"); }
    return r.json();
  }
  const pil = (kelas, t) => `<span class="pk-pil ${esc(kelas)}">${esc(t)}</span>`;
  const kosong = t => `<p class="pk-kosong">${esc(t)}</p>`;
  const catatPesan = (t, ok) => { const p = document.getElementById("pkPesan"); if (p) { p.textContent = t; p.className = "pk-pesan " + (ok ? "ok" : "galat"); } };
  const tabel = (kepala, baris, kosongT) => `<div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr>${kepala.map(k => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${
    baris.length ? baris.join("") : `<tr><td colspan="${kepala.length}" class="pk-kosong-baris">${esc(kosongT)}</td></tr>`}</tbody></table></div>`;
  const formatMundur = ms => { const s = Math.floor(Math.abs(ms) / 1000), p = n => String(n).padStart(2, "0"); return `${p(Math.floor(s / 3600))}:${p(Math.floor(s % 3600 / 60))}:${p(s % 60)}`; };

  /* ================= kerangka & tab ================= */
  function kerangka() {
    app.innerHTML = `<nav class="ad-tabs" aria-label="Ruang Posko">${TABS.map(([k, l]) => `<button data-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join("")}</nav>
      <p id="pkPesan" class="pk-pesan" role="status"></p><div id="pkIsi" class="pk-isi"><p class="ad-redup">Memuat…</p></div>`;
  }
  async function muat() {
    clearInterval(timer); timer = null;
    const isi = document.getElementById("pkIsi");
    try { isi.innerHTML = await TAMPIL[tab](); } catch (e) { if (e.message !== "perlu masuk") isi.innerHTML = kosong("Gagal memuat: " + e.message); return; }
    if (tab === "antrean") { mundur(); timer = setInterval(mundur, 1000); }
  }
  function mundur() {
    for (const el of document.querySelectorAll(".pk-mundur")) {
      const sisa = +el.dataset.batas - Date.now(), lewat = sisa < 0;
      el.textContent = lewat ? `LEWAT BATAS ${formatMundur(sisa)}` : `Sisa ${formatMundur(sisa)}`; el.classList.toggle("lewat", lewat);
    }
  }

  /* ================= antrean & panggilan ================= */
  const AKSI_BARIS = {
    baru: [["email", "✉️ Kirim email", "utama"], ["wa", "💬 Buka WhatsApp", "utama"], ["telepon", "📞 Sudah ditelepon", ""], ["abaikan", "🚫 Abaikan", "bahaya"]],
    dipanggil: [["direspons", "✅ Sudah direspons", "utama"], ["email", "✉️ Kirim ulang", ""], ["wa", "💬 WhatsApp lagi", ""], ["tarik", "↩️ Tarik", ""], ["abaikan", "🚫 Abaikan", "bahaya"]],
    direspons: [["dicek", "🔎 Sudah dicek lapangan", "utama"], ["wa", "💬 WhatsApp", ""], ["abaikan", "🚫 Abaikan", "bahaya"]],
    dicek: [["tindak_lanjut", "📌 Tindak lanjut (rapor / Gakkum)", "utama"], ["abaikan", "🚫 Abaikan", "bahaya"]],
    tindak_lanjut: [["selesai", "🏁 Selesai", "utama"]],
    selesai: [], abaikan: [["buka", "↩️ Buka lagi", ""]],
  };
  const kartuPanggilan = (p, d) => {
    const tombol = AKSI_BARIS[p.status].map(([a, l, k]) => {
      const mati = (a === "email" && (!p.ada_email || !d.email_siap)) || (a === "wa" && !p.ada_wa);
      const sebab = a === "email" ? (!p.ada_email ? "Belum ada email di Kontak PT" : !d.email_siap ? "EMAIL_API_KEY / EMAIL_FROM belum diset" : "") : a === "wa" && !p.ada_wa ? "Belum ada nomor WhatsApp di Kontak PT" : "";
      return `<button class="ad-tombol kecil ${k}" data-aksi="${a}" ${mati ? `disabled title="${esc(sebab)}"` : ""}>${l}</button>`;
    }).join("");
    const batas = p.status === "dipanggil" && p.batas ? `<b class="pk-mundur ${p.terlambat ? "lewat" : ""}" data-batas="${p.batas}"></b>` : p.batas && !["selesai", "abaikan"].includes(p.status) ? `<span class="pk-redup">batas ${jam(p.batas)}</span>` : "";
    return `<article class="pk-kartu ${p.terlambat ? "terlambat" : ""}" data-id="${esc(p.id)}">
      <div class="pk-kepala"><b>${esc(p.nama_pt)}</b>${pil("s-" + p.status, STATUS_P[p.status])}${p.dummy ? pil("dummy", "DUMMY") : ""}${batas}</div>
      <p class="pk-meta">${esc(p.kab)} · prov ${esc(p.prov)} · ${esc(p.tanggal)} · <b>${p.titik_n}</b> titik panas · terdeteksi ${jam(p.terdeteksi)}${p.lat != null ? ` · <a href="https://www.google.com/maps?q=${p.lat},${p.lon}" target="_blank" rel="noopener noreferrer">peta</a>` : ""}</p>
      <p class="pk-meta">${p.dipanggil_pada ? `Dipanggil ${jam(p.dipanggil_pada)} lewat ${esc(p.saluran)}` : "Belum dipanggil"}${p.direspons_pada ? ` · direspons ${jam(p.direspons_pada)}` : ""}${p.dicek_pada ? ` · dicek ${jam(p.dicek_pada)}` : ""}
        · ${p.lapangan_n} laporan regu di kabupaten ini hari itu${!p.ada_email && !p.ada_wa && !p.ada_telepon ? ' · <b class="pk-lewat">belum ada kontak (tab Kontak PT)</b>' : ""}</p>
      ${p.hasil ? `<p class="pk-meta">Hasil: ${esc(p.hasil)}</p>` : ""}${p.catatan ? `<p class="pk-meta">Catatan: ${esc(p.catatan)}</p>` : ""}
      ${p.status === "selesai" ? "" : `<div class="pk-baris"><input class="pk-isian" data-f="hasil" maxlength="300" placeholder="Hasil / jawaban perusahaan (opsional)" value="${esc(p.hasil || "")}"><input class="pk-isian" data-f="pesan" maxlength="300" placeholder="Tambahan pesan untuk email / WhatsApp (opsional)"></div>`}
      <div class="pk-aksi">${tombol}</div></article>`;
  };
  async function tampilAntrean() {
    antrean = await ambil(`${API}/panggilan${semua ? "?semua=1" : ""}`);
    const d = antrean, terlambat = d.panggilan.filter(p => p.terlambat).length, baru = d.panggilan.filter(p => p.status === "baru").length;
    return `<div class="pk-bar"><label class="pk-cek"><input type="checkbox" id="pkSemua" ${semua ? "checked" : ""}> tampilkan selesai & diabaikan</label>
      <span class="pk-redup">${baru} baru · ${terlambat ? `<b class="pk-lewat">${terlambat} lewat batas</b>` : "tidak ada yang lewat batas"} · email ${d.email_siap ? "siap (Resend)" : "belum siap"} · tidak ada kiriman otomatis: Anda yang menekan kirim</span></div>
      <div class="pk-daftar">${d.panggilan.length ? d.panggilan.map(p => kartuPanggilan(p, d)).join("") : kosong("Antrean kosong. Titik api di dalam konsesi masuk otomatis tiap 3 jam.")}</div>`;
  }

  /* ================= neraca ================= */
  let formNeraca = {};
  async function tampilNeraca() {
    const d = await ambil(`${API}/neraca?tgl=${tglNeraca}`);
    const rakor = new Set(d.baris.filter(r => r.sumber === "rakor").map(r => r.prov + "|" + r.kab));
    const dipakai = r => r.sumber === "rakor" || !rakor.has(r.prov + "|" + r.kab);
    const f = formNeraca, kab = [...new Set(d.baris.map(r => r.kab))];
    return `<div class="pk-bar"><label>Tanggal <input type="date" id="pkTglN" value="${esc(tglNeraca)}"></label><span class="pk-redup">Isian Rakor menang atas agregat regu. Agregat regu dihitung otomatis dari laporan.</span></div>
      ${tabel(["Prov", "Kabupaten", "Sumber", "FS", "Luas (ha)", "Padam (ha)", "Sisa (ha)", "Personel", "Kendala", "Dipakai", ""], d.baris.map(r => `<tr class="${dipakai(r) ? "" : "pk-redam"}" data-prov="${esc(r.prov)}" data-kab="${esc(r.kab)}">
        <td>${esc(r.prov)}</td><td>${esc(r.kab)}${r.dummy ? " " + pil("dummy", "DUMMY") : ""}</td><td>${pil(r.sumber === "rakor" ? "s-selesai" : "s-baru", r.sumber)}</td><td>${r.fs}</td><td>${num(r.luas_ha)}</td><td>${num(r.padam_ha)}</td><td>${num(r.sisa_ha)}</td><td>${r.personel}</td>
        <td>${esc(r.kendala.map(k => KENDALA[k] || k).join(", ")) || "–"}</td><td>${dipakai(r) ? "✔" : ""}</td>
        <td><button class="ad-tombol kecil" data-salin="${esc(JSON.stringify({prov: r.prov, kab: r.kab, fs: r.fs, luas_ha: r.luas_ha, padam_ha: r.padam_ha, personel: r.personel, kendala: r.kendala}))}">Salin ke form</button>
          ${r.sumber === "rakor" ? `<button class="ad-tombol kecil bahaya" data-hapus-rakor="1">Hapus</button>` : ""}</td></tr>`), "Belum ada angka untuk tanggal ini.")}
      <form id="pkFormNeraca" class="pk-form ad-kartu"><h3>Isian Rakor</h3>
        <div class="pk-grid"><label>Prov (kode 2 digit)<input name="prov" maxlength="2" inputmode="numeric" required value="${esc(f.prov || "62")}"></label>
          <label>Kabupaten / kota<input name="kab" maxlength="60" required list="pkKab" value="${esc(f.kab || "")}"></label><datalist id="pkKab">${kab.map(k => `<option value="${esc(k)}">`).join("")}</datalist>
          <label>FS (titik api)<input name="fs" inputmode="numeric" value="${esc(f.fs ?? "")}"></label><label>Luas (ha)<input name="luas_ha" inputmode="decimal" value="${esc(f.luas_ha ?? "")}"></label>
          <label>Dipadamkan (ha)<input name="padam_ha" inputmode="decimal" value="${esc(f.padam_ha ?? "")}"></label><label>Sisa (ha, kosong = luas − padam)<input name="sisa_ha" inputmode="decimal"></label>
          <label>Personel<input name="personel" inputmode="numeric" value="${esc(f.personel ?? "")}"></label></div>
        <div class="pk-centang">${Object.entries(KENDALA).map(([k, l]) => `<label class="pk-cek"><input type="checkbox" name="kendala" value="${k}" ${(f.kendala || []).includes(k) ? "checked" : ""}>${l}</label>`).join("")}</div>
        <label>Catatan<textarea name="catatan" maxlength="500" rows="2"></textarea></label><div><button class="ad-tombol utama" type="submit">💾 Simpan isian Rakor</button></div></form>`;
  }

  /* ================= laporan regu ================= */
  async function tampilLaporan() {
    const d = await ambil(`${API}/lapangan?tgl=${tglLaporan}`);
    return `<div class="pk-bar"><label>Tanggal <input type="date" id="pkTglL" value="${esc(tglLaporan)}"></label><span class="pk-redup">${d.laporan.length} laporan</span></div>
      ${tabel(["Waktu", "Regu", "Wilayah", "Kondisi", "Luas / padam", "Personel", "Kendala", "Air", "Catatan", "Foto", "Lokasi"], d.laporan.map(l => `<tr data-id="${esc(l.id)}">
        <td>${jam(l.waktu)}</td><td>${esc(l.regu)}<br><span class="pk-redup">${esc(l.unsur)}</span>${l.dummy ? " " + pil("dummy", "DUMMY") : ""}</td><td>${esc(l.kab)}${l.kompleks_id ? `<br><span class="pk-redup">${esc(l.kompleks_id)}</span>` : ""}</td>
        <td>${pil("l-" + l.status, STATUS_LAP[l.status])}</td><td>${l.luas_ha == null ? "–" : num(l.luas_ha)} / ${l.padam_ha == null ? "–" : num(l.padam_ha)}${l.putusan === "tahan" ? `<br>${pil("l-menyala", "DITAHAN")} <span class="pk-redup">${esc(l.alasan_tahan)}</span><br><button class="ad-tombol kecil utama" data-putus="setuju">Setujui</button>` : l.putusan === "setuju" ? `<br>${pil("l-padam", "disetujui")} <button class="ad-tombol kecil" data-putus="tahan">Tahan</button>` : ""}</td><td>${l.personel ?? "–"}</td>
        <td>${esc(l.kendala.map(k => KENDALA[k] || k).join(", ")) || "–"}</td><td>${esc(l.sumber_air || "–")}</td><td>${esc(l.catatan || "")}${l.gps_curiga ? `<br><b class="pk-lewat">Curiga GPS: ${esc(l.gps_curiga)}</b>` : ""}</td>
        <td>${l.foto ? `<a href="${API}/foto/${esc(l.id)}" target="_blank" rel="noopener">Lihat</a>` : "–"}</td>
        <td><a href="https://www.google.com/maps?q=${l.lat},${l.lon}" target="_blank" rel="noopener noreferrer">${(+l.lat).toFixed(4)}, ${(+l.lon).toFixed(4)}</a> ±${Math.round(l.akurasi ?? 0)} m</td></tr>`), "Belum ada laporan regu untuk tanggal ini.")}`;
  }

  /* ================= regu ================= */
  let kodeBaru = null;
  async function tampilRegu() {
    const d = await ambil(`${API}/regu`);
    return `${kodeBaru ? `<div class="pk-kode ad-kartu"><h3>Kode regu "${esc(kodeBaru.nama)}" — hanya tampil SEKALI</h3><p>Kirim tautan ini ke ketua regu (WhatsApp). Server hanya menyimpan sidik jarinya, jadi tidak bisa ditampilkan lagi; hilang = buat regu baru.</p>
        <input class="pk-isian" id="pkTautan" readonly value="${esc(kodeBaru.tautan)}"><div class="pk-aksi"><button class="ad-tombol utama" data-salin-tautan="1">📋 Salin tautan</button>
        <a class="ad-tombol" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent("Tautan lapor lapangan regu " + kodeBaru.nama + ": " + kodeBaru.tautan)}">💬 Bagikan lewat WhatsApp</a></div></div>` : ""}
      <form id="pkFormRegu" class="pk-form ad-kartu"><h3>Buat regu</h3><div class="pk-grid"><label>Nama regu<input name="nama" required minlength="2" maxlength="80" placeholder="mis. Daops Manggala Agni Pulang Pisau"></label>
        <label>Unsur<select name="unsur">${UNSUR.map(u => `<option>${u}</option>`).join("")}</select></label><label>Prov (kode 2 digit)<input name="prov" maxlength="2" inputmode="numeric" required value="62"></label>
        <label>Kabupaten / kota<input name="kab" required minlength="2" maxlength="60"></label><label>ID perusahaan (opsional, untuk regu perusahaan)<input name="perusahaan_id" maxlength="80" placeholder="mis. sawit-gfw-537"></label></div>
        <div><button class="ad-tombol utama" type="submit">➕ Buat regu & kode</button></div></form>
      ${tabel(["Regu", "Unsur", "Wilayah", "Laporan", "Terakhir", "Status", ""], d.regu.map(r => `<tr data-id="${esc(r.id)}"><td>${esc(r.nama)}${r.dummy ? " " + pil("dummy", "DUMMY") : ""}${r.perusahaan_id ? `<br><span class="pk-redup">${esc(r.perusahaan_id)}</span>` : ""}</td>
        <td>${esc(r.unsur)}</td><td>${esc(r.kab)} (${esc(r.prov)})</td><td>${r.laporan}</td><td>${jam(r.terakhir)}</td><td>${r.dicabut ? pil("s-abaikan", "Dicabut " + jam(r.dicabut)) : pil("s-selesai", "Aktif")}</td>
        <td>${r.dicabut ? "" : `<button class="ad-tombol kecil bahaya" data-cabut="1">Cabut kode</button>`}</td></tr>`), "Belum ada regu.")}`;
  }

  /* ================= kontak PT ================= */
  let formKontak = {};
  async function tampilKontak() {
    const [d, p] = await Promise.all([ambil(`${API}/kontak`), ambil(`${API}/panggilan?semua=1`)]);
    const ada = new Set(d.kontak.map(k => k.perusahaan_id)), tanpa = new Map(p.panggilan.filter(x => !ada.has(x.perusahaan_id)).map(x => [x.perusahaan_id, x.nama_pt]));
    const f = formKontak;
    return `${tanpa.size ? `<div class="ad-spanduk"><b>${tanpa.size} perusahaan di antrean belum punya kontak:</b> ${[...tanpa].map(([id, n]) => `<button class="ad-tombol kecil" data-isi-kontak="${esc(id)}" data-nama="${esc(n)}">${esc(n)}</button>`).join(" ")}</div>` : ""}
      <form id="pkFormKontak" class="pk-form ad-kartu"><h3>Kontak perusahaan (hanya admin yang melihat; tidak pernah tampil di halaman publik)</h3><div class="pk-grid">
        <label>ID perusahaan (dari konsesi2026)<input name="perusahaan_id" required maxlength="80" value="${esc(f.perusahaan_id || "")}"></label><label>Nama perusahaan<input name="nama_pt" required maxlength="120" value="${esc(f.nama_pt || "")}"></label>
        <label>Nama kontak (PIC)<input name="kontak" maxlength="80" value="${esc(f.kontak || "")}"></label><label>Email<input name="email" type="email" maxlength="254" value="${esc(f.email || "")}"></label>
        <label>WhatsApp (0812…)<input name="wa" inputmode="tel" maxlength="30" value="${esc(f.wa || "")}"></label><label>Telepon<input name="telepon" inputmode="tel" maxlength="20" value="${esc(f.telepon || "")}"></label>
        <label>Catatan<input name="catatan" maxlength="300" value="${esc(f.catatan || "")}"></label></div><div><button class="ad-tombol utama" type="submit">💾 Simpan kontak</button></div></form>
      ${tabel(["Perusahaan", "PIC", "Email", "WhatsApp", "Telepon", ""], d.kontak.map(k => `<tr data-id="${esc(k.id)}"><td>${esc(k.nama_pt)}${k.dummy ? " " + pil("dummy", "DUMMY") : ""}<br><span class="pk-redup">${esc(k.perusahaan_id)}</span></td><td>${esc(k.kontak || "–")}</td><td>${esc(k.email || "–")}</td><td>${esc(k.wa || "–")}</td><td>${esc(k.telepon || "–")}</td>
        <td><button class="ad-tombol kecil" data-ubah-kontak="${esc(JSON.stringify(k))}">Ubah</button> <button class="ad-tombol kecil bahaya" data-hapus-kontak="1">Hapus</button></td></tr>`), "Belum ada kontak.")}
      <form id="pkFormCsv" class="pk-form ad-kartu"><h3>Impor CSV</h3><p class="pk-redup">Baris pertama = kepala kolom: <code>perusahaan_id,nama_pt,kontak,email,wa,telepon,catatan</code> (wajib perusahaan_id dan nama_pt; pemisah koma atau titik koma). Satu baris salah = tidak ada yang diimpor.</p>
        <input type="file" id="pkCsvBerkas" accept=".csv,text/csv,text/plain"><textarea name="csv" rows="5" maxlength="65536" placeholder="perusahaan_id,nama_pt,email,wa"></textarea><div><button class="ad-tombol utama" type="submit">⬆️ Impor</button></div></form>`;
  }

  /* ================= templat paparan ================= */
  const CONTOH = {versi: 1, slide: [{id: "pembuka", aktif: true, urutan: 1}], tambahan: [{id: "arahan", judul: "Arahan pimpinan rakor", sub: "19 Oktober 2026", isi: ["Butir pertama", "Butir kedua"], setelah: "pembuka"}]};
  function cekCepat(o) {   // pemeriksaan ringan di klien; server (src/posko.js cekTemplat) yang memutuskan
    if (!o || typeof o !== "object" || Array.isArray(o)) return "templat harus objek JSON";
    if (o.versi !== 1) return "versi harus 1";
    if (!Array.isArray(o.slide ?? []) || !Array.isArray(o.tambahan ?? [])) return "slide dan tambahan harus larik";
    return /[<>]/.test(JSON.stringify(o)) ? "tanda < dan > tidak boleh dipakai" : "";
  }
  async function tampilTemplat() {
    const d = await ambil(`${API}/templat`);
    return `<form id="pkFormTemplat" class="pk-form ad-kartu"><h3>Templat halaman /paparan</h3><p class="pk-redup">Skema: <code>{versi:1, slide:[{id,aktif,urutan}], tambahan:[{id,judul,sub,isi[],gambar_url?,setelah}]}</code>. Terakhir diubah: ${jam(d.diubah)}. Teks tanpa tanda &lt; &gt;.</p>
      <textarea name="isi" class="pk-kode-json" rows="18" spellcheck="false">${esc(JSON.stringify(d.templat, null, 2))}</textarea>
      <div class="pk-aksi"><button class="ad-tombol" type="button" data-templat="validasi">🔍 Validasi</button><button class="ad-tombol" type="button" data-templat="contoh">📄 Isi contoh</button><button class="ad-tombol utama" type="submit">💾 Simpan</button></div></form>`;
  }
  const TAMPIL = {antrean: tampilAntrean, neraca: tampilNeraca, laporan: tampilLaporan, regu: tampilRegu, kontak: tampilKontak, templat: tampilTemplat};

  /* ================= dummy (DUMMY.md): 🧪 isi seluruh rantai Ruang Posko, 🧹 hapus semua dummy ================= */
  if (!window.Admin.staf) aksiJudul.innerHTML = '<button class="ad-tombol ad-bulat" data-dummy="isi" title="Isi data dummy untuk halaman ini" aria-label="Isi data dummy">🧪</button><button class="ad-tombol ad-bulat" data-dummy="hapus" title="Hapus semua data dummy" aria-label="Hapus data dummy">🧹</button>';
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy Ruang Posko (regu, laporan, neraca, panggilan, kontak contoh)? Data asli tidak tersentuh.")) return;
    d.disabled = true;
    const r = await kirim(`${API}/dummy`, {aksi: d.dataset.dummy, ...(d.dataset.dummy === "isi" && tab === "neraca" ? {tgl: tglNeraca} : d.dataset.dummy === "isi" && tab === "laporan" ? {tgl: tglLaporan} : {})});   // periode yang terpampang
    alert(r.ok ? (d.dataset.dummy === "isi" ? `Dummy dibuat: ${r.j.regu} regu, ${r.j.lapangan} laporan regu, ${r.j.neraca} baris neraca, ${r.j.panggilan} panggilan, ${r.j.kontak} kontak.` : `Dummy dihapus: ${r.j.regu} regu, ${r.j.lapangan} laporan, ${r.j.neraca} neraca, ${r.j.panggilan} panggilan, ${r.j.kontak} kontak.`) : r.j.galat || `Gagal (${r.status})`);
    location.reload();   // muat ulang penuh (DUMMY.md syarat 6)
  });

  /* ================= peristiwa ================= */
  const nilaiForm = f => Object.fromEntries([...new FormData(f)].filter(([k]) => k !== "kendala"));
  const angkaAtauNull = v => (v === "" || v == null) ? undefined : Number(String(v).replace(",", "."));
  app.addEventListener("click", async e => {
    const t = e.target.closest("button, a"); if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; kerangka(); return muat(); }
    const kartu = t.closest("[data-id]");
    if (t.dataset.aksi && kartu) {
      const id = kartu.dataset.id, aksi = t.dataset.aksi, hasil = kartu.querySelector('[data-f="hasil"]')?.value.trim(), pesan = kartu.querySelector('[data-f="pesan"]')?.value.trim();
      const body = {aksi, ...(hasil ? {hasil} : {}), ...(pesan ? {pesan} : {})};
      let w = null; if (aksi === "wa") w = window.open("about:blank", "_blank");   // dibuka dulu, sinkron dengan klik, supaya tidak diblokir
      t.disabled = true; const r = await kirim(`${API}/panggilan/${id}`, body);
      if (!r.ok) { w?.close(); t.disabled = false; return catatPesan(r.j.galat || `Gagal (${r.status})`, false); }
      if (aksi === "wa") { if (w) { w.opener = null; w.location = r.j.tautan; } else catatPesan("Popup diblokir peramban: " + r.j.tautan, false); }
      catatPesan(aksi === "email" ? "Email terkirim. Hitung mundur 2 jam dimulai." : aksi === "wa" ? "WhatsApp dibuka. Hitung mundur 2 jam dimulai." : "Tersimpan.", true);
      return muat();
    }
    if (t.dataset.putus && kartu) { const r = await kirim(`${API}/lapangan/${kartu.dataset.id}`, {aksi: t.dataset.putus}); catatPesan(r.ok ? (t.dataset.putus === "setuju" ? "Laporan disetujui; masuk neraca." : "Laporan ditahan; keluar dari neraca.") : r.j.galat, r.ok); return muat(); }
    if (t.dataset.salin) { formNeraca = JSON.parse(t.dataset.salin); return muat(); }
    if (t.dataset.hapusRakor) {
      const tr = t.closest("tr"); if (!confirm("Hapus isian Rakor ini? Angka agregat regu dipakai lagi.")) return;
      const r = await kirim(`${API}/neraca/hapus`, {tgl: tglNeraca, prov: tr.dataset.prov, kab: tr.dataset.kab}); catatPesan(r.ok ? "Isian Rakor dihapus." : r.j.galat, r.ok); return muat();
    }
    if (t.dataset.cabut && kartu) {
      if (!confirm("Cabut kode regu ini? Regu tidak bisa lagi mengirim laporan.")) return;
      const r = await kirim(`${API}/regu/${kartu.dataset.id}`, {aksi: "cabut"}); catatPesan(r.ok ? "Kode dicabut." : r.j.galat, r.ok); return muat();
    }
    if (t.dataset.salinTautan) { const i = document.getElementById("pkTautan"); i.select(); try { await navigator.clipboard.writeText(i.value); catatPesan("Tautan disalin.", true); } catch (x) { catatPesan("Salin manual: tekan Ctrl+C.", false); } return; }
    if (t.dataset.isiKontak) { formKontak = {perusahaan_id: t.dataset.isiKontak, nama_pt: t.dataset.nama}; await muat(); return document.getElementById("pkFormKontak").scrollIntoView({behavior: "smooth"}); }
    if (t.dataset.ubahKontak) { formKontak = JSON.parse(t.dataset.ubahKontak); await muat(); return document.getElementById("pkFormKontak").scrollIntoView({behavior: "smooth"}); }
    if (t.dataset.hapusKontak && kartu) {
      if (!confirm("Hapus kontak perusahaan ini?")) return;
      const r = await kirim(`${API}/kontak/${kartu.dataset.id}`, {aksi: "hapus"}); catatPesan(r.ok ? "Kontak dihapus." : r.j.galat, r.ok); return muat();
    }
    if (t.dataset.templat) {
      const ta = app.querySelector('[name="isi"]');
      if (t.dataset.templat === "contoh") { ta.value = JSON.stringify(CONTOH, null, 2); return catatPesan("Contoh dimasukkan; tekan Simpan bila cocok.", true); }
      try { const g = cekCepat(JSON.parse(ta.value)); catatPesan(g || "JSON sah (pemeriksaan penuh dilakukan saat Simpan).", !g); } catch (x) { catatPesan("JSON tidak sah: " + x.message, false); }
    }
  });
  app.addEventListener("change", e => {
    if (e.target.id === "pkSemua") { semua = e.target.checked; muat(); }
    else if (e.target.id === "pkTglN") { tglNeraca = e.target.value || hariIni(); formNeraca = {}; muat(); }
    else if (e.target.id === "pkTglL") { tglLaporan = e.target.value || hariIni(); muat(); }
    else if (e.target.id === "pkCsvBerkas" && e.target.files[0]) e.target.files[0].text().then(t => { app.querySelector('[name="csv"]').value = t; });
  });
  app.addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, v = nilaiForm(f), tombol = f.querySelector('button[type="submit"]'); tombol.disabled = true;
    let r;
    if (f.id === "pkFormNeraca") {
      const b = {tgl: tglNeraca, prov: v.prov, kab: v.kab, fs: angkaAtauNull(v.fs), luas_ha: angkaAtauNull(v.luas_ha), padam_ha: angkaAtauNull(v.padam_ha), sisa_ha: angkaAtauNull(v.sisa_ha), personel: angkaAtauNull(v.personel),
        kendala: [...f.querySelectorAll('[name="kendala"]:checked')].map(i => i.value), catatan: v.catatan || undefined};
      r = await kirim(`${API}/neraca`, b); if (r.ok) formNeraca = {};
    } else if (f.id === "pkFormRegu") {
      r = await kirim(`${API}/regu`, {nama: v.nama, unsur: v.unsur, prov: v.prov, kab: v.kab, ...(v.perusahaan_id ? {perusahaan_id: v.perusahaan_id} : {})});
      if (r.ok) kodeBaru = {nama: r.j.regu.nama, tautan: r.j.tautan};
    } else if (f.id === "pkFormKontak") { r = await kirim(`${API}/kontak`, Object.fromEntries(Object.entries(v).filter(([, x]) => x !== ""))); if (r.ok) formKontak = {}; }
    else if (f.id === "pkFormCsv") { r = await kirim(`${API}/kontak/impor`, {csv: v.csv}); if (!r.ok && r.j.rincian) r.j.galat += ": " + r.j.rincian.join("; "); }
    else if (f.id === "pkFormTemplat") { try { r = await kirim(`${API}/templat`, JSON.parse(v.isi)); } catch (x) { r = {ok: false, j: {galat: "JSON tidak sah: " + x.message}}; } }
    tombol.disabled = false;
    catatPesan(r.ok ? (f.id === "pkFormCsv" ? `${r.j.diimpor} kontak diimpor.` : f.id === "pkFormRegu" ? "Regu dibuat. Salin tautan kodenya di bawah." : "Tersimpan.") : (r.j.galat || `Gagal (${r.status})`), r.ok);
    if (r.ok) muat();
  });

  kerangka(); muat();
})();
