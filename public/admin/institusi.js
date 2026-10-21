/* Tab Institusi bersama /admin/relawan dan /admin/riset (C7): SATU daftar institusi (kampus atau organisasi) dari /api/relawan/admin/institusi.
   Kolom Relawan = MoU relawan + kode koordinator; kolom Riset = PKS riset + kode mitra. Dua halaman memanggil pasang() yang sama, tidak ada salinan.
   CSP admin: tanpa skrip/gaya inline; semua teks data lewat esc(). Modul ES: const {pasang} = await import("/admin/institusi.js"). */
const {esc, kirim, ambil} = window.Admin, API = "/api/relawan/admin/institusi", UKURAN = 12;
const angka = n => Number(n ?? 0).toLocaleString("id-ID", {maximumFractionDigits: 1});
const tgl = s => s ? new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}) : "–";
const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const geser = h => new Date(Date.now() + 7 * 3600e3 + h * 864e5).toISOString().slice(0, 10);
const IKON = {centang: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', x: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
  kunci: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', kosong: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>', gedung: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6"/>'};
const pil = (warna, ikon, teks) => `<span class="in-pil in-${warna}"><svg viewBox="0 0 24 24" aria-hidden="true">${IKON[ikon]}</svg>${esc(teks)}</span>`;
const STATUS = {aktif: ["hijau", "centang", "Berlaku"], segera_habis: ["oranye", "jam", "Segera habis"], habis: ["merah", "x", "Habis"], belum: ["kuning", "jam", "Belum berlaku"]};
const JENIS = {ptn: "PTN", pts: "PTS", organisasi: "Organisasi"}, PERJANJIAN = {mou_relawan: "MoU relawan", pks_riset: "PKS riset"};
const opsi = (obj, pilih, semua) => (semua ? `<option value="">${esc(semua)}</option>` : "") + Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}"${k === pilih ? " selected" : ""}>${esc(v)}</option>`).join("");
const isian = (label, el) => `<label>${esc(label)}${el}</label>`;

/* satu perjanjian terpilih (mou atau pks) sebagai pil + nomor + masa berlaku */
const ringkasPj = (p, ekstra = "") => p ? `${pil(...STATUS[p.status])}<br>${esc(p.nomor)}<br><span class="in-redup">${tgl(p.mulai)} sampai ${tgl(p.berakhir)}${ekstra}</span>` : pil("abu", "kosong", "Belum ada");

export async function pasang(el) {
  if (!document.getElementById("inCss")) { const l = document.createElement("link"); l.id = "inCss"; l.rel = "stylesheet"; l.href = "/admin/institusi.css?v=1"; document.head.appendChild(l); }
  el.classList.add("in-tab");
  let d = null, form = null, kode = null, q = "", urut = "nama", arah = 1, hal = 0, pesan = ["", true];
  const provinsi = () => Object.fromEntries(Object.entries(d.provinsi).sort((a, b) => a[1].localeCompare(b[1], "id")));
  const muat = async () => { try { d = await ambil(API, "Fitur relawan"); gambar(); } catch (e) { if (e.message !== "perlu masuk") el.innerHTML = `<p class="in-kosong">${esc(e.message)}</p>`; } };
  const catat = (t, ok = true) => { pesan = [t, ok]; const p = el.querySelector(".in-pesan"); if (p) { p.textContent = t; p.className = "in-pesan " + (ok ? "ok" : "galat"); } };

  const NILAI = {nama: i => i.nama.toLowerCase(), jenis: i => i.jenis, relawan: i => i.mou?.berakhir || "", riset: i => i.pks?.berakhir || "", pic: i => i.pic_nama.toLowerCase()};
  function formulir() {
    if (!form) return "";
    if (form.pj) {   // perjanjian: baru, atau ubah (perpanjangan) yang sudah ada
      const i = d.institusi.find(x => x.id === form.pj), p = form.pilih ? i.perjanjian.find(x => x.id === form.pilih) : null, jenis = p?.jenis_perjanjian || form.jenis || "mou_relawan";
      return `<form id="inForm" class="in-form ad-kartu"><h3>Perjanjian ${esc(i.nama)}</h3><div class="in-grid">
        ${isian("Perjanjian", `<select name="perjanjian_id" data-pilih="1"><option value="">Perjanjian baru</option>${i.perjanjian.map(x => `<option value="${esc(x.id)}"${x.id === form.pilih ? " selected" : ""}>${esc(PERJANJIAN[x.jenis_perjanjian])} ${esc(x.nomor)}</option>`).join("")}</select>`)}
        ${isian("Jenis", `<select name="jenis_perjanjian" data-pilih="1"${p ? " disabled" : ""}>${opsi(PERJANJIAN, jenis)}</select>`)}
        ${isian("Nomor", `<input name="nomor" required minlength="3" maxlength="80" value="${esc(p?.nomor || "")}">`)}
        ${isian("Berlaku mulai", `<input name="mulai" type="date" required value="${esc(p?.mulai || hariIni())}">`)}${isian("Berlaku sampai", `<input name="berakhir" type="date" required value="${esc(p?.berakhir || geser(365))}">`)}
        ${jenis === "mou_relawan" ? isian("Kuota relawan", `<input name="kuota" type="number" min="1" max="100000" required value="${esc(p?.kuota ?? 50)}">`) : ""}</div>
        <div class="in-aksi"><button class="ad-tombol utama" type="submit">${p ? "Simpan perpanjangan" : "Tambah perjanjian"}</button><button class="ad-tombol" type="button" data-batal="1">Batal</button></div></form>`;
    }
    const f = form.i || {}, baru = !form.i;
    return `<form id="inForm" class="in-form ad-kartu"><h3>${baru ? "Catat institusi" : "Ubah " + esc(f.nama)}</h3><div class="in-grid">
      ${isian("Nama", `<input name="nama" required minlength="3" maxlength="120" value="${esc(f.nama || "")}">`)}${isian("Singkatan", `<input name="singkatan" maxlength="20" value="${esc(f.singkatan || "")}">`)}
      ${isian("Jenis", `<select name="jenis">${opsi(JENIS, f.jenis || "pts")}</select>`)}${isian("Provinsi", `<select name="prov">${opsi(provinsi(), f.prov || "", "Belum diisi")}</select>`)}
      ${isian("Nama PIC", `<input name="pic_nama" required minlength="2" maxlength="100" value="${esc(f.pic_nama || "")}">`)}${isian("Jabatan PIC", `<input name="pic_jabatan" maxlength="80" value="${esc(f.pic_jabatan || "")}">`)}
      ${isian("Email PIC", `<input name="pic_email" type="email" maxlength="254" value="${esc(f.pic_email || "")}">`)}${isian("WhatsApp PIC", `<input name="pic_wa" inputmode="tel" maxlength="20" value="${esc(f.pic_wa || "")}">`)}
      ${isian("Catatan", `<input name="catatan" maxlength="500" value="${esc(f.catatan || "")}">`)}</div>
      ${baru ? `<fieldset class="in-pj"><legend>Perjanjian pertama (boleh dikosongkan, tambah nanti)</legend><div class="in-grid">
        ${isian("Jenis", `<select name="jenis_perjanjian">${opsi(PERJANJIAN, "mou_relawan", "Tanpa perjanjian")}</select>`)}${isian("Nomor", '<input name="nomor" maxlength="80">')}
        ${isian("Berlaku mulai", `<input name="mulai" type="date" value="${hariIni()}">`)}${isian("Berlaku sampai", `<input name="berakhir" type="date" value="${geser(365)}">`)}${isian("Kuota relawan (MoU)", '<input name="kuota" type="number" min="1" max="100000" value="50">')}</div></fieldset>` : ""}
      <div class="in-aksi"><button class="ad-tombol utama" type="submit">${baru ? "Catat institusi" : "Simpan"}</button>${baru ? "" : '<button class="ad-tombol" type="button" data-batal="1">Batal</button>'}</div></form>`;
  }
  function gambar() {
    const cocok = d.institusi.filter(i => !q || (i.nama + " " + (i.singkatan || "")).toLowerCase().includes(q.toLowerCase()));
    cocok.sort((a, b) => arah * (NILAI[urut](a) < NILAI[urut](b) ? -1 : NILAI[urut](a) > NILAI[urut](b) ? 1 : 0));
    const total = Math.max(1, Math.ceil(cocok.length / UKURAN)); hal = Math.min(hal, total - 1);
    const kolom = [["nama", "Institusi"], ["pic", "PIC (hanya admin)"], ["relawan", "Relawan"], ["riset", "Riset"], [null, "Aksi"]];
    const baris = cocok.slice(hal * UKURAN, (hal + 1) * UKURAN).map(i => `<tr data-id="${esc(i.id)}"><td><b>${esc(i.nama)}</b>${i.dummy ? ' <span class="in-pil in-ungu">Dummy</span>' : ""}<br><span class="in-redup">${esc([i.singkatan, JENIS[i.jenis], d.provinsi[i.prov]].filter(Boolean).join(" · "))}</span></td>
      <td>${esc(i.pic_nama)}<br><span class="in-redup">${esc(i.pic_jabatan || "")}</span><br><span class="in-redup">${esc(i.pic_email || "–")} ${esc(i.pic_wa || "")}</span></td>
      <td>${ringkasPj(i.mou, i.mou ? `<br>${angka(i.terisi)} / ${angka(i.mou.kuota)} relawan, ${angka(i.antre)} antre` : "")}<br>${i.kode_aktif ? pil("hijau", "kunci", "Kode koordinator aktif") : pil("abu", "x", "Tanpa kode koordinator")}</td>
      <td>${ringkasPj(i.pks)}<br>${i.kode_riset ? pil("hijau", "kunci", `${angka(i.kode_riset)} kode mitra aktif`) : pil("abu", "x", "Tanpa kode mitra")}<br><span class="in-redup">${angka(i.usulan)} usulan</span></td>
      <td><div class="in-aksi"><button class="ad-tombol kecil" data-ubah="1">Ubah</button><button class="ad-tombol kecil" data-pj="1">Perjanjian</button><button class="ad-tombol kecil" data-kode="kode_baru">Kode koordinator baru</button>${i.kode_aktif ? '<button class="ad-tombol kecil bahaya" data-kode="cabut_kode">Cabut kode</button>' : ""}</div></td></tr>`);
    el.innerHTML = `${kode ? `<div class="in-kode ad-kartu"><h3>Kode koordinator "${esc(kode.nama)}": tampil SEKALI</h3><p class="in-redup">Kirim tautan ini ke PIC. Server hanya menyimpan sidik jarinya; hilang berarti buat kode baru.</p>
        <input class="in-isian" id="inTautan" readonly value="${esc(kode.tautan)}"><div class="in-aksi"><button class="ad-tombol utama" data-salin="1">Salin tautan</button></div></div>` : ""}
      <p class="in-pesan ${pesan[0] ? (pesan[1] ? "ok" : "galat") : ""}" role="status">${esc(pesan[0])}</p>${formulir()}
      <div class="in-bar"><label>Cari institusi<input id="inCari" maxlength="60" value="${esc(q)}"></label><button class="ad-tombol" data-baru="1">Catat institusi</button><span class="in-redup">${angka(cocok.length)} institusi. Satu institusi, dua peran: kode koordinator relawan dan kode mitra riset.</span></div>
      <div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr>${kolom.map(([k, l]) => `<th aria-sort="${k && urut === k ? (arah > 0 ? "ascending" : "descending") : "none"}">${k ? `<button type="button" class="in-urut" data-urut="${k}">${esc(l)}${urut === k ? (arah > 0 ? " ▲" : " ▼") : ""}</button>` : esc(l)}</th>`).join("")}</tr></thead>
      <tbody>${baris.length ? baris.join("") : `<tr><td colspan="5" class="in-kosong-baris">Belum ada institusi. Catat yang pertama di atas.</td></tr>`}</tbody></table></div>${
      total > 1 ? `<div class="in-hal"><button class="ad-tombol kecil" data-hal="-1"${hal === 0 ? " disabled" : ""}>Sebelumnya</button><span>Halaman ${hal + 1} dari ${total}</span><button class="ad-tombol kecil" data-hal="1"${hal >= total - 1 ? " disabled" : ""}>Berikutnya</button></div>` : ""}`;
  }

  /* stopPropagation: penangan klik/submit halaman induk (relawan.js, riset.js) memakai atribut data-* yang bisa bertabrakan */
  el.addEventListener("click", async e => {
    e.stopPropagation(); const t = e.target.closest("button"); if (!t) return;
    const id = t.closest("tr")?.dataset.id, i = id && d.institusi.find(x => x.id === id);
    if (t.dataset.urut) { arah = urut === t.dataset.urut ? -arah : 1; urut = t.dataset.urut; hal = 0; return gambar(); }
    if (t.dataset.hal) { hal += +t.dataset.hal; return gambar(); }
    if (t.dataset.baru) { form = {}; kode = null; gambar(); return el.querySelector("#inForm").scrollIntoView({behavior: "smooth", block: "nearest"}); }
    if (t.dataset.batal) { form = null; return gambar(); }
    if (t.dataset.ubah) { form = {i}; gambar(); return el.querySelector("#inForm").scrollIntoView({behavior: "smooth", block: "nearest"}); }
    if (t.dataset.pj) { form = {pj: id}; gambar(); return el.querySelector("#inForm").scrollIntoView({behavior: "smooth", block: "nearest"}); }
    if (t.dataset.salin) { const x = el.querySelector("#inTautan"); x.select(); try { await navigator.clipboard.writeText(x.value); catat("Tautan disalin."); } catch (er) { catat("Salin manual dengan Ctrl+C.", false); } return; }
    if (t.dataset.kode) {
      const cabut = t.dataset.kode === "cabut_kode";
      if (!confirm(cabut ? "Cabut kode koordinator? Koordinator tidak bisa masuk lagi (kode mitra riset tidak terpengaruh)." : "Buat kode koordinator baru? Kode lama langsung mati.")) return;
      const r = await kirim(`${API}/${id}`, {aksi: t.dataset.kode}); if (!r.ok) return catat(r.j.galat || `Gagal (${r.status})`, false);
      kode = cabut ? null : {nama: i.nama, tautan: r.j.tautan}; await muat(); catat(cabut ? "Kode dicabut." : "Kode baru dibuat. Salin tautannya di atas.");
    }
  });
  el.addEventListener("change", e => {   // pilihan perjanjian / jenis mengubah isian formulir
    if (!e.target.dataset.pilih) return;
    const f = e.target.form; form = {pj: form.pj, pilih: f.perjanjian_id.value || null, jenis: f.jenis_perjanjian.value}; gambar();
  });
  el.addEventListener("input", e => { if (e.target.id === "inCari") { q = e.target.value; hal = 0; const p = e.target.selectionStart; gambar(); const c = el.querySelector("#inCari"); c.focus(); c.setSelectionRange(p, p); } });
  el.addEventListener("submit", async e => {
    e.preventDefault(); e.stopPropagation(); const f = e.target, v = Object.fromEntries([...new FormData(f)].filter(([, x]) => x !== "")), tb = f.querySelector('button[type="submit"]'); tb.disabled = true;
    const num = x => x === undefined ? undefined : Number(x);
    let r, ok = "Tersimpan.";
    if (form.pj) { r = await kirim(`${API}/${form.pj}`, {aksi: "perjanjian", ...v, jenis_perjanjian: v.jenis_perjanjian || form.jenis || "mou_relawan", kuota: num(v.kuota)}); ok = "Perjanjian tersimpan."; }
    else if (form.i) { r = await kirim(`${API}/${form.i.id}`, {aksi: "ubah", ...v}); ok = "Institusi diperbarui."; }
    else {
      const {jenis_perjanjian, nomor, mulai, berakhir, kuota, ...inst} = v;
      r = await kirim(API, {...inst, ...(jenis_perjanjian ? {perjanjian: {jenis_perjanjian, nomor, mulai, berakhir, kuota: jenis_perjanjian === "mou_relawan" ? num(kuota) : undefined}} : {})});
      if (r.ok && r.j.kode) kode = {nama: inst.nama, tautan: r.j.tautan}; ok = "Institusi dicatat.";
    }
    tb.disabled = false;
    if (!r.ok) return catat(r.j.galat || `Gagal (${r.status})`, false);
    form = null; await muat(); catat(ok);
  });
  await muat();
}
