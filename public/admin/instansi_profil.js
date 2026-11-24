/* Blok admin profil PIC akun BPBD (/admin/instansi; data/kajian-bnpb/profil-bpbd/DESIGN-SYSTEM L7): daftar profil per akun, setuju, cabut, atur ulang PIN, buka kunci, log profil.
   Dipanggil admin/instansi.js lewat window.AdminProfil. Data dari /api/instansi/admin/profil/* dan /admin/log. NIP, email, dan HP tersamar sampai tombol Tampilkan.
   PIN sementara hanya tampil sekali di kotak salin; tidak ditulis ke DOM, atribut, atau URL. CSP admin: tanpa gaya inline; semua teks data lewat esc(). */
(() => {
  const {esc, kirim, ambil} = window.Admin, DB = Admin.dasbor, API = "/api/instansi/admin";
  const ikS = (ik, label, data, kls) => DB.ikon(ik, label, data, kls).outerHTML;
  const samarNomor = w => w && w.length > 6 ? w.slice(0, 4) + "••••••" + w.slice(-2) : "••••";
  const samarEmail = e => { const [a, d] = String(e || "").split("@"); return d ? a.slice(0, 2) + "•••@" + d : "•••"; };
  const samarNip = n => String(n || "").length > 6 ? String(n).slice(0, 4) + "••••••" + String(n).slice(-2) : "••••";
  const jam = ms => ms ? new Date(ms).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}).replace(",", "") : "-";
  const STATUS = {draf: ["draf", ""], menunggu: ["menunggu", "kuning"], aktif: ["aktif", "hijau"], dicabut: ["dicabut", "merah"]};
  const LABEL = {masuk: "masuk akun", pin_ok: "masuk profil", pin_salah: "PIN salah", terkunci: "terkunci sementara", terkunci_admin: "dikunci admin", ganti_profil: "ganti profil", keluar: "keluar", profil_buat: "PIC didaftarkan", profil_ubah: "data diubah", foto: "foto diunggah", pin_atur: "PIN diatur", pin_ganti: "PIN diganti", kirim: "dikirim", setuju: "disetujui", tolak: "ditolak", cabut: "dicabut", reset_pin: "PIN diatur ulang", buka_kunci: "kunci dibuka", kerja: "tindakan kerja", meja: "tindakan di meja"};
  const pil = (t, k = "") => `<span class="ai-pil ${k}">${esc(t)}</span>`;

  function baris(p) {
    const [st, kls] = STATUS[p.status] || [p.status, ""];
    const foto = p.foto ? `<img class="ai-pic-foto" src="${API}/profil/foto/${esc(p.id)}" alt="" width="40" height="40" loading="lazy">` : `<span class="ai-pic-foto" aria-hidden="true">${esc(String(p.nama).trim().slice(0, 1))}</span>`;
    return `<tr data-pic="${esc(p.id)}"><td>${foto}</td><td><b>${esc(p.nama)}</b><br><span class="ai-meta">${esc(p.jabatan)}</span></td>
      <td><span data-samar="nip" data-asli="${esc(p.nip)}">${esc(samarNip(p.nip))}</span><br><span data-samar="email" data-asli="${esc(p.email)}">${esc(samarEmail(p.email))}</span><br><span data-samar="wa" data-asli="${esc(p.wa)}">${esc(samarNomor(p.wa))}</span></td>
      <td>${pil(st, kls)}${p.terkunci ? " " + pil("terkunci", "merah") : ""}${p.pin_wajib_ganti ? " " + pil("wajib ganti PIN", "kuning") : ""}${p.status === "draf" && p.kurang?.length ? `<br><span class="ai-meta">kurang ${esc(p.kurang.join(" dan "))}</span>` : ""}</td>
      <td><div class="db-aksi">${ikS("lihat", "Tampilkan data " + p.nama, {"data-pf": "tampil"})}${p.status === "menunggu" ? ikS("cek", "Setujui profil " + p.nama, {"data-pf": "setuju"}) : ""}${p.status === "aktif" ? ikS("kunci", "Atur ulang PIN " + p.nama, {"data-pf": "reset_pin"}) : ""}${p.terkunci ? ikS("aktif", "Buka kunci " + p.nama, {"data-pf": "buka_kunci"}) : ""}${p.status !== "dicabut" ? ikS("cabut", "Cabut profil " + p.nama, {"data-pf": "cabut"}, "bahaya") : ""}</div></td></tr>`;
  }
  /* wadah: elemen [data-profil-akun="<id akun>"]; menggambar tabel profil dan memuat log akun itu bila diminta */
  const cache = new Map();   // id akun -> janji hasil; satu panggilan per akun walau kartu digambar ulang, dibuang sesudah aksi admin
  async function isi(wadah, denganLog = false) {
    const akunId = wadah.dataset.profilAkun; wadah.innerHTML = `<p class="ad-redup">Memuat profil PIC…</p>`;
    if (!cache.has(akunId)) cache.set(akunId, ambil(`${API}/profil/${akunId}`, "Profil PIC"));
    let d; try { d = await cache.get(akunId); } catch (e) { cache.delete(akunId); wadah.innerHTML = `<p class="ai-kosong">Gagal memuat: ${esc(e.message)}</p>`; return; }
    const lengkap = d.profil.filter(p => p.lengkap).length, ada = d.profil.filter(p => p.status !== "dicabut").length;
    wadah.innerHTML = `<h3>Profil PIC</h3><p class="ai-meta">${ada} dari ${d.maks} profil, ${lengkap} lengkap. Diperlukan paling sedikit ${d.wajib} sebelum akun disetujui.</p>`
      + (d.profil.length ? `<div class="db-tabel-wadah"><table class="ex-tabel db-tabel ai-tabel"><thead><tr><th></th><th>PIC</th><th>NIP, email, HP</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${d.profil.map(baris).join("")}</tbody></table></div>` : `<p class="ai-kosong">Belum ada PIC yang didaftarkan.</p>`)
      + (denganLog ? `<div data-profil-log="${esc(akunId)}"></div>` : "");
    if (denganLog) log(wadah.querySelector("[data-profil-log]"));
  }
  async function log(w, sebelum, sudah = "") {
    if (!sebelum) w.innerHTML = `<h3>Log profil</h3><p class="ad-redup">Memuat…</p>`;
    let d; try { d = await ambil(`${API}/log?akun=${encodeURIComponent(w.dataset.profilLog)}${sebelum ? "&sebelum=" + sebelum : ""}`, "Log profil"); } catch (e) { w.innerHTML = `<p class="ai-kosong">Gagal memuat log: ${esc(e.message)}</p>`; return; }
    const rows = sudah + d.log.map(x => `<tr><td>${esc(jam(x.waktu))}</td><td>${esc(x.profil_id ? x.profil_id.slice(0, 6) : "-")}</td><td>${esc(LABEL[x.jenis] || x.jenis)}${x.rute ? ` <span class="ai-meta">${esc(x.rute)}</span>` : ""}</td><td>${esc(x.oleh || "")}</td></tr>`).join("");
    w.innerHTML = `<h3>Log profil</h3><div class="db-tabel-wadah"><table class="ex-tabel db-tabel ai-tabel"><thead><tr><th>Waktu</th><th>Profil</th><th>Tindakan</th><th>Oleh</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Belum ada catatan.</td></tr>'}</tbody></table></div>`
      + (d.berikut ? `<div class="ai-aksi"><button type="button" class="ad-tombol kecil" data-pf="lagi" data-sebelum="${esc(d.berikut)}">Muat lebih lama</button></div>` : "");
    w._rows = rows;
  }
  /* kembalian true bila klik ini milik blok profil (admin/instansi.js berhenti); pesan(teks, ok) menulis ke baris pesan halaman */
  async function klik(t, pesan) {
    const aksi = t.dataset.pf; if (!aksi) return false;
    const tr = t.closest("[data-pic]"), wadah = t.closest("[data-profil-akun]");
    if (aksi === "tampil") { for (const s of tr.querySelectorAll("[data-samar]")) s.textContent = s.textContent === s.dataset.asli ? ({nip: samarNip, email: samarEmail, wa: samarNomor}[s.dataset.samar])(s.dataset.asli) : s.dataset.asli; return true; }
    if (aksi === "lagi") { const w = t.closest("[data-profil-log]"); log(w, t.dataset.sebelum, w._rows); return true; }
    if (!tr) return true; const id = tr.dataset.pic, nama = tr.querySelector("b")?.textContent || "profil ini";
    if (aksi === "cabut" && !confirm(`Cabut profil ${nama}? Sesi profil itu langsung berakhir, walau sandi lembaga masih benar.`)) return true;
    if (aksi === "reset_pin" && !confirm(`Atur ulang PIN ${nama}? PIN lama tidak berlaku dan profil wajib membuat PIN baru saat masuk.`)) return true;
    t.disabled = true; const r = await kirim(`${API}/profil/${id}`, {aksi}); t.disabled = false;
    if (!r.ok) { pesan(r.j.galat || `Gagal (${r.status})`, false); return true; }
    if (aksi === "reset_pin") { prompt(`PIN sementara untuk ${nama} (tampil sekali, salin sekarang dan sampaikan lewat jalur resmi):`, r.j.pin_sementara); pesan("PIN diatur ulang. Profil wajib membuat PIN baru saat masuk.", true); }
    else pesan({setuju: "Profil disetujui.", cabut: "Profil dicabut.", buka_kunci: "Kunci profil dibuka."}[aksi], true);
    if (wadah) { cache.delete(wadah.dataset.profilAkun); isi(wadah, !!wadah.querySelector("[data-profil-log]")); } return true;
  }
  window.AdminProfil = {isi, klik, jenisPemda: j => ["pemprov", "pemkab", "pemkot"].includes(j)};
})();
