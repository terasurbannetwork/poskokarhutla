/* Admin Kemitraan Riset (/admin/riset): agenda, mitra (kode), antrean telaah usulan, permintaan data, luaran dan pemanfaatan kebijakan, ekspor CSV, dummy 🧪/🧹.
   CSP admin: tanpa skrip/gaya inline; semua teks data lewat esc(); tautan hanya http/https. Data dari /api/riset/admin (sesi admin). */
(() => {
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul"), API = "/api/riset";
  const {esc, kirim} = Admin;   // public/admin/bersama.js
  const angka = n => Number(n ?? 0).toLocaleString("id-ID");
  const wkt = ms => ms ? new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}) : "–";
  const tgl = s => s ? new Date(s + "T00:00:00+07:00").toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}) : "–";
  const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const IKON = {
    topi: "M2 9l10-5 10 5-10 5z|M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5", jam: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z|M12 7v5l3 2", centang: "M5 12l5 5 9-10", silang: "M6 6l12 12|M18 6L6 18",
    dokumen: "M7 3h7l5 5v13H7z|M14 3v5h5|M10 13h6|M10 17h6", api: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z", bendera: "M5 21V4|M5 4h11l-2 4 2 4H5",
    bidik: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z|M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", kirim: "M4 12l16-8-6 16-3-7z", edit: "M4 20h4L19 9l-4-4L4 16z", gedung: "M4 21V8l8-5 8 5v13|M9 21v-6h6v6",
    unduh: "M12 3v12|M7 11l5 5 5-5|M5 21h14", peringatan: "M12 3l9 16H3z|M12 10v4|M12 17h.01",
  };
  const ikon = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${IKON[n].split("|").map(d => `<path d="${d}"/>`).join("")}</svg>`;
  const pil = (i, t, w) => `<span class="rs-pil ${w || "abu"}">${ikon(i)}${esc(t)}</span>`;
  const lnk = (u, t) => /^https?:\/\//i.test(u || "") ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t || u)}</a>` : esc(t || u || "");
  const dummyPil = r => r.dummy ? " " + pil("peringatan", "DUMMY", "ungu") : "";
  const STATUS = {diajukan: ["kirim", "Diajukan", "abu"], ditelaah: ["jam", "Ditelaah", "biru"], revisi: ["edit", "Revisi", "kuning"], disetujui: ["centang", "Disetujui", "hijau"], ditolak: ["silang", "Ditolak", "merah"],
    berjalan: ["jam", "Berjalan", "biru"], laporan_akhir: ["dokumen", "Laporan akhir", "ungu"], selesai: ["centang", "Selesai", "hijau"]};
  const AKSI_NAMA = {ditelaah: "Mulai telaah", revisi: "Minta revisi", disetujui: "Setujui", ditolak: "Tolak", berjalan: "Mulai berjalan", selesai: "Tutup selesai"};
  const PKS = {berlaku: ["centang", "Berlaku", "hijau"], hampir: ["peringatan", "Hampir habis", "kuning"], kedaluwarsa: ["silang", "Kedaluwarsa", "merah"], tanpa: ["jam", "Belum dicatat", "abu"]};
  const TABS = [["agenda", "🎯 Agenda"], ["mitra", "🏛️ Mitra"], ["usulan", "📥 Usulan"], ["permintaan", "📂 Permintaan data"], ["luaran", "📈 Luaran dan kebijakan"]];
  const JENIS = {artikel: "Artikel", dataset: "Dataset", model: "Model", policy_brief: "Policy brief", prototipe: "Prototipe"};
  let d = null, tab = "usulan", saring = "antre", kodeBaru = null, formAgenda = {}, pksId = null, telaah = null, putus = null, catat = null;

  const pesan = (t, ok) => { const p = document.getElementById("rsPesan"); if (p) { p.textContent = t; p.className = "rs-pesan " + (ok ? "ok" : "galat"); } };
  const tabel = (kepala, baris, kosong) => `<div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr>${kepala.map(k => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${
    baris.length ? baris.join("") : `<tr><td colspan="${kepala.length}" class="rs-kosong-baris">${esc(kosong)}</td></tr>`}</tbody></table></div>`;
  const csv = (t, label) => `<a class="ad-tombol kecil" href="${API}/admin/csv?tabel=${t}" download>${ikon("unduh")}${esc(label || "Ekspor CSV")}</a>`;
  const opsi = (obj, pilih) => Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}"${k === pilih ? " selected" : ""}>${esc(v)}</option>`).join("");
  const isian = (label, el) => `<label>${esc(label)}${el}</label>`;
  const nilai = f => Object.fromEntries([...new FormData(f)].map(([k, v]) => [k, v.trim ? v.trim() : v]));

  async function muat() {
    const r = await fetch(API + "/admin");
    if (r.status === 403) { location.href = "/admin/masuk"; return; }
    if (r.status === 503) { app.innerHTML = '<p class="rs-kosong">Fitur riset belum diaktifkan: terapkan migrasi 0025_riset.sql.</p>'; return; }
    d = await r.json(); gambar();
  }
  function gambar() {
    const k = d.kartu, stat = [["jam", "Antre telaah", k.antre, k.antre ? "kuning" : "abu"], ["gedung", "Mitra aktif", k.mitra_aktif, "biru"], ["jam", "Berjalan", k.berjalan, "biru"], ["centang", "Selesai", k.selesai, "hijau"],
      ["dokumen", "Luaran (menunggu: " + angka(k.luaran_antre) + ")", k.luaran, k.luaran_antre ? "kuning" : "abu"], ["bendera", "Dipakai kebijakan", k.kebijakan, "hijau"], ["kirim", "Permintaan data", k.permintaan_antre, k.permintaan_antre ? "kuning" : "abu"]];
    app.innerHTML = `<div class="rs-statbar">${stat.map(([i, l, n, w]) => `<div class="rs-stat">${pil(i, l, w)}<b>${angka(n)}</b></div>`).join("")}</div>
      <nav class="ad-tabs" aria-label="Riset">${TABS.map(([t, l]) => `<button type="button" data-tab="${t}" aria-pressed="${t === tab}">${l}</button>`).join("")}</nav>
      <p id="rsPesan" class="rs-pesan" role="status"></p><div class="rs-isi">${TAMPIL[tab]()}</div>`;
  }

  /* ================= agenda ================= */
  const TAMPIL = {
    agenda() {
      const f = formAgenda, tema = Object.fromEntries(Object.entries(d.enum.tema)), pri = {1: "1 (tertinggi)", 2: "2", 3: "3"};
      return `<form id="fAgenda" class="rs-form ad-kartu"><h3>${f.id ? "Ubah agenda" : "Tambah agenda riset"}</h3><div class="rs-grid">
        ${isian("Pertanyaan riset (judul)", `<input name="judul" required minlength="5" maxlength="200" value="${esc(f.judul)}">`)}
        ${isian("Bencana", `<select name="bencana">${opsi({...d.enum.bencana}, f.bencana || "karhutla")}</select>`)}${isian("Tema", `<select name="tema">${opsi(tema, f.tema)}</select>`)}
        ${isian("Prioritas", `<select name="prioritas">${opsi(pri, String(f.prioritas || 2))}</select>`)}</div>
        ${isian("Latar singkat", `<textarea name="latar" rows="2" maxlength="800">${esc(f.latar)}</textarea>`)}${isian("Luaran yang diharapkan", `<input name="luaran" maxlength="400" value="${esc(f.luaran)}">`)}
        <div class="rs-aksi"><button class="ad-tombol utama" type="submit">${f.id ? "Simpan agenda" : "Tambah agenda"}</button>${f.id ? '<button class="ad-tombol" type="button" data-aksi="batal-agenda">Batal</button>' : ""}${csv("agenda")}</div></form>
      ${tabel(["Prioritas", "Pertanyaan riset", "Tema", "Bencana", "Usulan", "Status", ""], d.agenda.map(a => `<tr data-id="${esc(a.id)}"><td>${pil("bendera", "P" + a.prioritas, a.prioritas === 1 ? "merah" : a.prioritas === 2 ? "kuning" : "abu")}</td>
        <td><b>${esc(a.judul)}</b>${dummyPil(a)}<br><span class="rs-redup">${esc(a.latar)}</span></td><td>${pil("bidik", d.enum.tema[a.tema], "biru")}</td><td>${esc(d.enum.bencana[a.bencana] || a.bencana)}</td><td>${angka(a.usulan)}</td>
        <td>${a.status === "buka" ? pil("centang", "Buka", "hijau") : pil("silang", "Tutup", "abu")}</td><td class="a"><button class="ad-tombol kecil" data-aksi="ubah-agenda">Ubah</button> <button class="ad-tombol kecil" data-aksi="ganti-agenda" data-ke="${a.status === "buka" ? "tutup" : "buka"}">${a.status === "buka" ? "Tutup" : "Buka lagi"}</button></td></tr>`), "Belum ada agenda.")}`;
    },

    /* ================= mitra ================= */
    mitra() {
      const baru = kodeBaru ? `<div class="rs-kode ad-kartu"><h3>Kode mitra "${esc(kodeBaru.institusi)}": hanya tampil SEKALI</h3><p>Kirim tautan ini ke PIC. Server hanya menyimpan sidik jarinya; hilang berarti buat kode baru (cabut yang lama).</p>
        <input class="rs-isian" id="rsTautan" readonly value="${esc(kodeBaru.tautan)}"><div class="rs-aksi"><button class="ad-tombol utama" data-aksi="salin">Salin tautan</button></div></div>` : "";
      const pks = pksId ? (m => `<form id="fPks" class="rs-form ad-kartu"><h3>Perbarui PKS: ${esc(m.institusi)}</h3><div class="rs-grid">${isian("Nomor PKS", `<input name="pks_nomor" required minlength="3" maxlength="80" value="${esc(m.pks_nomor)}">`)}
        ${isian("Berlaku mulai", `<input type="date" name="pks_mulai" required value="${esc(m.pks_mulai || hariIni())}">`)}${isian("Berlaku sampai", `<input type="date" name="pks_sampai" required value="${esc(m.pks_sampai)}">`)}</div>
        <div class="rs-aksi"><button class="ad-tombol utama" type="submit">Simpan PKS</button><button class="ad-tombol" type="button" data-aksi="batal-pks">Batal</button></div></form>`)(d.mitra.find(x => x.id === pksId) || {}) : "";
      return `${baru}${pks}<form id="fMitra" class="rs-form ad-kartu"><h3>Catat institusi mitra</h3><div class="rs-grid">
        ${isian("Institusi", '<input name="institusi" required minlength="3" maxlength="120" placeholder="mis. Universitas Contoh">')}${isian("Fakultas / pusat studi", '<input name="unit" maxlength="120">')}
        ${isian("Nama PIC", '<input name="pic_nama" required minlength="2" maxlength="100">')}${isian("Email PIC", '<input name="pic_email" type="email" maxlength="254">')}${isian("WhatsApp PIC", '<input name="pic_wa" inputmode="tel" maxlength="20">')}
        ${isian("Nomor PKS / MoU", '<input name="pks_nomor" maxlength="80">')}${isian("PKS berlaku mulai", '<input type="date" name="pks_mulai">')}${isian("PKS berlaku sampai", '<input type="date" name="pks_sampai">')}</div>
        <div class="rs-aksi"><button class="ad-tombol utama" type="submit">Catat dan buat kode</button>${csv("mitra")}</div></form>
      ${tabel(["Institusi", "PIC (hanya admin)", "PKS", "Usulan", "Kode", ""], d.mitra.map(m => { const p = PKS[m.pks.s];
        return `<tr data-id="${esc(m.id)}"${m.dicabut ? ' class="rs-redam"' : ""}><td><b>${esc(m.institusi)}</b>${dummyPil(m)}<br><span class="rs-redup">${esc(m.unit || "")}</span></td>
        <td>${esc(m.pic_nama)}<br><span class="rs-redup">${esc(m.pic_email || "–")} · ${esc(m.pic_wa || "–")}</span></td>
        <td>${esc(m.pks_nomor || "–")}<br>${pil(p[0], p[1] + (m.pks.sisa != null && m.pks.s !== "kedaluwarsa" ? ` (${angka(m.pks.sisa)} hari)` : ""), p[2])}<br><span class="rs-redup">${tgl(m.pks_mulai)}–${tgl(m.pks_sampai)}</span></td>
        <td>${angka(m.usulan)}</td><td>${m.dicabut ? pil("silang", "Dicabut " + wkt(m.dicabut), "abu") : pil("centang", "Aktif", "hijau")}</td>
        <td class="a"><button class="ad-tombol kecil" data-aksi="pks">Perbarui PKS</button>${m.dicabut ? "" : ' <button class="ad-tombol kecil bahaya" data-aksi="cabut">Cabut kode</button>'}</td></tr>`; }), "Belum ada mitra.")}`;
    },

    /* ================= usulan ================= */
    usulan() {
      const ANTRE = ["diajukan", "ditelaah", "laporan_akhir"], cocok = u => saring === "semua" || (saring === "antre" ? ANTRE.includes(u.status) : u.status === saring);
      const chip = (k, l, n) => `<button class="ad-chip" type="button" data-saring="${k}" aria-pressed="${saring === k}">${esc(l)} <b>${angka(n)}</b></button>`;
      const hit = k => d.usulan.filter(u => k === "semua" ? true : k === "antre" ? ANTRE.includes(u.status) : u.status === k).length;
      const panel = telaah ? (u => `<form id="fTelaah" class="rs-form ad-kartu"><h3>${esc(AKSI_NAMA[telaah.ke])}: ${esc(u.judul)}</h3>
        ${telaah.ke === "disetujui" ? isian("Nomor PKS (wajib)", '<input name="nomor_pks" required minlength="3" maxlength="80" placeholder="mis. PKS/BNPB/2026/007">') : ""}
        ${isian("Catatan telaah" + (telaah.ke === "revisi" || telaah.ke === "ditolak" ? " (wajib)" : " (opsional)"), `<textarea name="catatan" rows="3" maxlength="600"${telaah.ke === "revisi" || telaah.ke === "ditolak" ? " required minlength=\"5\"" : ""}></textarea>`)}
        <div class="rs-aksi"><button class="ad-tombol utama" type="submit">Simpan keputusan</button><button class="ad-tombol" type="button" data-aksi="batal-telaah">Batal</button></div></form>`)(d.usulan.find(x => x.id === telaah.id) || {}) : "";
      const baris = d.usulan.filter(cocok).map(u => { const s = STATUS[u.status], jj = d.jejak.filter(j => j.usulan_id === u.id), kk = d.kemajuan.filter(k => k.usulan_id === u.id);
        const aksi = Object.entries(d.enum.alur[u.status]).filter(([, p]) => p === "admin").map(([ke]) => `<button class="ad-tombol kecil ${ke === "disetujui" ? "utama" : ke === "ditolak" ? "bahaya" : ""}" data-aksi="telaah" data-ke="${ke}">${esc(AKSI_NAMA[ke])}</button>`).join(" ");
        return `<tr data-id="${esc(u.id)}"><td><details><summary><b>${esc(u.judul)}</b>${dummyPil(u)}</summary><div class="rs-detail">
          <p><b>Metode:</b> ${esc(u.metode)}</p><p><b>Anggota:</b> ${esc(u.anggota || "–")}</p><p><b>Wilayah:</b> ${esc(u.wilayah)} · <b>Jadwal:</b> ${tgl(u.mulai)}–${tgl(u.selesai)}</p>
          <p><b>Agenda:</b> ${esc(u.agenda || "–")}</p><p><b>Data dibutuhkan:</b> ${esc(u.data_butuh.map(i => (d.enum.katalog.find(k => k.id === i) || {}).nama || i).join(", ") || "–")}</p><p><b>Luaran rencana:</b> ${esc(u.luaran_rencana)}</p>
          ${u.catatan ? `<p><b>Catatan telaah:</b> ${esc(u.catatan)}</p>` : ""}
          ${kk.length ? `<p><b>Laporan:</b></p><ul>${kk.map(k => `<li>${wkt(k.waktu)} ${k.jenis === "akhir" ? "(akhir) " : ""}${esc(k.isi)} ${k.tautan ? lnk(k.tautan, "dokumen") : ""}</li>`).join("")}</ul>` : ""}
          <p><b>Riwayat:</b></p><ul>${jj.map(j => `<li>${wkt(j.waktu)}: ${esc((j.dari || "baru") + " ke " + j.ke)} oleh ${esc(j.oleh.split(":")[0])}${j.catatan ? " - " + esc(j.catatan) : ""}</li>`).join("")}</ul></div></details></td>
          <td>${esc(u.institusi)}<br><span class="rs-redup">${esc(u.ketua)}</span></td><td>${esc(d.enum.bencana[u.bencana] || u.bencana)}</td><td>${pil(s[0], s[1], s[2])}${u.nomor_pks ? `<br><span class="rs-redup">${esc(u.nomor_pks)}</span>` : ""}</td>
          <td>${wkt(u.diubah)}</td><td class="a">${aksi}</td></tr>`; });
      return `<div class="rs-bar">${chip("antre", "Antre telaah", hit("antre"))}${chip("semua", "Semua", hit("semua"))}${Object.keys(STATUS).map(k => chip(k, STATUS[k][1], hit(k))).join("")}<span class="rs-sp">${csv("usulan")}</span></div>${panel}
        ${tabel(["Usulan", "Institusi / ketua", "Bencana", "Status", "Diubah", ""], baris, "Tidak ada usulan di saringan ini.")}`;
    },

    /* ================= permintaan data ================= */
    permintaan() {
      const nama = id => (d.enum.katalog.find(k => k.id === id) || {}).nama || id, S = {diminta: ["jam", "Menunggu", "kuning"], disetujui: ["centang", "Disetujui", "hijau"], ditolak: ["silang", "Ditolak", "merah"]};
      const panel = putus ? (p => `<form id="fPutus" class="rs-form ad-kartu"><h3>${putus.ke === "disetujui" ? "Setujui" : "Tolak"}: ${esc(nama(p.dataset))} untuk ${esc(p.institusi)}</h3>
        ${putus.ke === "disetujui" ? isian("Jalur atau tautan data (wajib)", `<input name="jalur" required maxlength="300" value="${esc((d.enum.katalog.find(k => k.id === p.dataset) || {}).jalur || "")}" placeholder="/data/... atau https://...">`) : ""}
        ${isian("Catatan" + (putus.ke === "ditolak" ? " (wajib)" : " (opsional)"), `<textarea name="catatan" rows="2" maxlength="600"${putus.ke === "ditolak" ? " required" : ""}></textarea>`)}
        <div class="rs-aksi"><button class="ad-tombol utama" type="submit">Simpan</button><button class="ad-tombol" type="button" data-aksi="batal-putus">Batal</button></div></form>`)(d.permintaan.find(x => x.id === putus.id) || {}) : "";
      return `<div class="rs-bar">${csv("permintaan")}</div>${panel}${tabel(["Mitra", "Data", "Tujuan", "Status", "Jalur", "Diminta", ""], d.permintaan.map(p => { const s = S[p.status];
        return `<tr data-id="${esc(p.id)}"><td>${esc(p.institusi)}${dummyPil(p)}</td><td><b>${esc(nama(p.dataset))}</b></td><td>${esc(p.tujuan)}${p.catatan ? `<br><span class="rs-redup">${esc(p.catatan)}</span>` : ""}</td>
          <td>${pil(s[0], s[1], s[2])}</td><td>${p.jalur ? (p.jalur.startsWith("/") ? `<a href="${esc(p.jalur)}" target="_blank" rel="noopener noreferrer">${esc(p.jalur)}</a>` : lnk(p.jalur)) : "–"}</td><td>${wkt(p.dibuat)}</td>
          <td class="a">${p.status === "diminta" ? '<button class="ad-tombol kecil utama" data-aksi="putus" data-ke="disetujui">Setujui</button> <button class="ad-tombol kecil bahaya" data-aksi="putus" data-ke="ditolak">Tolak</button>' : ""}</td></tr>`; }), "Belum ada permintaan data.")}`;
    },

    /* ================= luaran dan kebijakan ================= */
    luaran() {
      const BENTUK = d.enum.bentuk;
      const panel = catat ? (l => `<form id="fKebijakan" class="rs-form ad-kartu"><h3>Catat pemanfaatan kebijakan: ${esc(l.judul)}</h3><div class="rs-grid">
        ${isian("Instansi / unit pengguna", '<input name="instansi" required minlength="2" maxlength="120" placeholder="mis. Direktorat Pusdalops BNPB">')}${isian("Bentuk", `<select name="bentuk">${opsi(BENTUK)}</select>`)}
        ${isian("Tanggal", `<input type="date" name="tanggal" required max="${hariIni()}" value="${hariIni()}">`)}</div>${isian("Catatan", '<textarea name="catatan" rows="2" maxlength="600"></textarea>')}
        <div class="rs-aksi"><button class="ad-tombol utama" type="submit">Simpan pemanfaatan</button><button class="ad-tombol" type="button" data-aksi="batal-catat">Batal</button></div></form>`)(d.luaran.find(x => x.id === catat) || {}) : "";
      return `<div class="rs-bar"><b>Dipakai untuk kebijakan: ${angka(d.kartu.kebijakan)} riset dari ${angka(d.kartu.selesai + d.kartu.berjalan)} yang berjalan atau selesai</b><span class="rs-sp">${csv("luaran", "CSV luaran")} ${csv("kebijakan", "CSV pemanfaatan")}</span></div>${panel}
        ${tabel(["Luaran", "Riset", "Institusi", "Tampil publik", "Dipakai", ""], d.luaran.map(l => `<tr data-id="${esc(l.id)}"><td>${pil("dokumen", JENIS[l.jenis] || l.jenis, "biru")}${dummyPil(l)}<br><b>${esc(l.judul)}</b><br>${l.tautan ? lnk(l.tautan, "tautan") : ""} ${l.doi ? lnk("https://doi.org/" + l.doi, "DOI " + l.doi) : ""}</td>
          <td>${esc(l.usulan)}</td><td>${esc(l.institusi)}</td><td>${l.disetujui ? pil("centang", "Disetujui", "hijau") : pil("jam", "Menunggu", "kuning")}</td><td>${l.kebijakan ? pil("bendera", angka(l.kebijakan) + " pemanfaatan", "hijau") : '<span class="rs-redup">Belum</span>'}</td><td class="a"><button class="ad-tombol kecil" data-aksi="${l.disetujui ? "tolak-luaran" : "setujui-luaran"}">${l.disetujui ? "Cabut persetujuan" : "Setujui"}</button> <button class="ad-tombol kecil" data-aksi="catat">Catat pemanfaatan</button></td></tr>`), "Belum ada luaran.")}
        <h3 class="rs-sub">Pemanfaatan kebijakan</h3>
        ${tabel(["Tanggal", "Instansi / unit", "Bentuk", "Luaran", "Riset", "Catatan", ""], d.kebijakan.map(k => `<tr data-id="${esc(k.id)}"><td>${tgl(k.tanggal)}</td><td>${esc(k.instansi)}${dummyPil(k)}</td><td>${pil("bendera", BENTUK[k.bentuk] || k.bentuk, "hijau")}</td>
          <td>${esc(k.luaran)}</td><td>${esc(k.usulan)}<br><span class="rs-redup">${esc(k.institusi)}</span></td><td>${esc(k.catatan || "")}</td><td class="a"><button class="ad-tombol kecil bahaya" data-aksi="hapus-kebijakan">Hapus</button></td></tr>`), "Belum ada pemanfaatan kebijakan yang dicatat.")}`;
    },
  };

  /* ================= aksi ================= */
  app.addEventListener("click", async e => {
    const t = e.target.closest("button, a"); if (!t || t.tagName === "A") return;
    const tr = t.closest("tr"), id = tr?.dataset.id;
    if (t.dataset.tab) { tab = t.dataset.tab; telaah = putus = catat = pksId = null; return gambar(); }
    if (t.dataset.saring) { saring = t.dataset.saring; return gambar(); }
    const a = t.dataset.aksi; if (!a) return;
    if (a === "ubah-agenda") { formAgenda = d.agenda.find(x => x.id === id); gambar(); return document.getElementById("fAgenda").scrollIntoView({behavior: "smooth"}); }
    if (a === "batal-agenda") { formAgenda = {}; return gambar(); }
    if (a === "ganti-agenda") { const r = await kirim(`${API}/admin/agenda/${id}`, {status: t.dataset.ke}); pesan(r.ok ? "Status agenda diubah." : r.j.galat, r.ok); return r.ok && muat(); }
    if (a === "pks") { pksId = id; gambar(); return document.getElementById("fPks").scrollIntoView({behavior: "smooth"}); }
    if (a === "batal-pks") { pksId = null; return gambar(); }
    if (a === "cabut") { if (!confirm("Cabut kode mitra ini? Mitra tidak bisa lagi masuk atau mengirim apa pun.")) return; const r = await kirim(`${API}/admin/mitra/${id}`, {aksi: "cabut"}); pesan(r.ok ? "Kode dicabut." : r.j.galat, r.ok); return r.ok && muat(); }
    if (a === "salin") { const i = document.getElementById("rsTautan"); i.select(); try { await navigator.clipboard.writeText(i.value); pesan("Tautan disalin.", true); } catch (x) { pesan("Salin manual: tekan Ctrl+C.", false); } return; }
    if (a === "telaah") { telaah = {id, ke: t.dataset.ke}; gambar(); return document.getElementById("fTelaah").scrollIntoView({behavior: "smooth"}); }
    if (a === "batal-telaah") { telaah = null; return gambar(); }
    if (a === "putus") { putus = {id, ke: t.dataset.ke}; gambar(); return document.getElementById("fPutus").scrollIntoView({behavior: "smooth"}); }
    if (a === "batal-putus") { putus = null; return gambar(); }
    if (a === "catat") { catat = id; gambar(); return document.getElementById("fKebijakan").scrollIntoView({behavior: "smooth"}); }
    if (a === "setujui-luaran" || a === "tolak-luaran") { const r = await kirim(`${API}/admin/luaran/${id}`, {aksi: a === "setujui-luaran" ? "setujui" : "tolak"}); pesan(r.ok ? (a === "setujui-luaran" ? "Luaran disetujui dan tampil di halaman publik." : "Persetujuan dicabut.") : r.j.galat, r.ok); return r.ok && muat(); }
    if (a === "batal-catat") { catat = null; return gambar(); }
    if (a === "hapus-kebijakan") { if (!confirm("Hapus catatan pemanfaatan ini?")) return; const r = await kirim(`${API}/admin/kebijakan/${id}`, {aksi: "hapus"}); pesan(r.ok ? "Dihapus." : r.j.galat, r.ok); return r.ok && muat(); }
  });
  app.addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, v = nilai(f), tombol = f.querySelector('button[type="submit"]'); tombol.disabled = true; let r, ok = "Tersimpan.";
    if (f.id === "fAgenda") { const b = {judul: v.judul, latar: v.latar, bencana: v.bencana, tema: v.tema, prioritas: +v.prioritas, luaran: v.luaran}; r = await kirim(formAgenda.id ? `${API}/admin/agenda/${formAgenda.id}` : `${API}/admin/agenda`, b); if (r.ok) formAgenda = {}; ok = "Agenda tersimpan."; }
    else if (f.id === "fMitra") { r = await kirim(`${API}/admin/mitra`, Object.fromEntries(Object.entries(v).filter(([, x]) => x !== ""))); if (r.ok) { kodeBaru = {institusi: r.j.institusi, tautan: r.j.tautan}; ok = "Mitra dicatat. Salin tautan kodenya di atas."; } }
    else if (f.id === "fPks") { r = await kirim(`${API}/admin/mitra/${pksId}`, {aksi: "pks", ...v}); if (r.ok) pksId = null; ok = "PKS diperbarui."; }
    else if (f.id === "fTelaah") { r = await kirim(`${API}/admin/usulan/${telaah.id}`, {ke: telaah.ke, catatan: v.catatan || undefined, nomor_pks: v.nomor_pks || undefined}); if (r.ok) telaah = null; ok = "Keputusan tersimpan dan masuk riwayat."; }
    else if (f.id === "fPutus") { r = await kirim(`${API}/admin/permintaan/${putus.id}`, {ke: putus.ke, jalur: v.jalur || undefined, catatan: v.catatan || undefined}); if (r.ok) putus = null; }
    else if (f.id === "fKebijakan") { r = await kirim(`${API}/admin/kebijakan`, {luaran_id: catat, instansi: v.instansi, bentuk: v.bentuk, tanggal: v.tanggal, catatan: v.catatan || undefined}); if (r.ok) catat = null; ok = "Pemanfaatan kebijakan dicatat."; }
    tombol.disabled = false;
    if (!r.ok) return pesan(r.j.galat || `Gagal (${r.status})`, false);
    await muat(); pesan(ok, true);
  });

  /* ================= dummy (DUMMY.md): 🧪 isi seluruh rantai riset, 🧹 hapus semua dummy ================= */
  aksiJudul.innerHTML = '<button class="ad-tombol ad-bulat" data-dummy="isi" title="Isi data dummy untuk halaman ini" aria-label="Isi data dummy">🧪</button><button class="ad-tombol ad-bulat" data-dummy="hapus" title="Hapus semua data dummy" aria-label="Hapus data dummy">🧹</button>';
  aksiJudul.addEventListener("click", async e => {
    const b = e.target.closest("[data-dummy]"); if (!b) return;
    if (b.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy riset (agenda, mitra, usulan, permintaan, luaran, pemanfaatan)? Data asli tidak tersentuh.")) return;
    b.disabled = true; const r = await kirim(`${API}/dummy`, {aksi: b.dataset.dummy}); b.disabled = false;
    alert(r.ok ? `${b.dataset.dummy === "isi" ? "Dummy dibuat" : "Dummy dihapus"}: ${r.j.agenda} agenda, ${r.j.mitra} mitra, ${r.j.usulan} usulan, ${r.j.kemajuan} laporan, ${r.j.luaran} luaran, ${r.j.permintaan} permintaan data, ${r.j.kebijakan} pemanfaatan kebijakan.` : r.j.galat || `Gagal (${r.status})`);
    if (r.ok) location.reload();
  });

  muat();
})();
