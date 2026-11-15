/* Kartu "Titik pengungsian" di meja pengungsi (KP-20; data/kajian-bnpb/keterpaduan/ALUR.md A3, KEPUTUSAN K11 dan K12).
   Fungsi murni + pembangun HTML, tanpa DOM saat dimuat (diuji node: tests/bnpb/titik_pengungsian.test.mjs). Rute: src/pengungsian_titik.js.
   Pemakai: public/bnpb/meja.js. Teks dari data selalu lewat esc() yang diberikan pemanggil. */
export const BASI_HARI = 3;   // K12: titik tanpa putaran lebih dari 3 hari ditandai basi (sama dengan server)
export const JENIS = ["terkonsentrasi", "tidak_terkonsentrasi"];
const UMUR = ["bayi", "balita", "anak", "remaja", "dewasa", "lansia"];

export const hariWib = (ms = Date.now()) => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
export const selisihHari = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
/* sama dengan server (daftar di src/pengungsian_titik.js): ditutup tidak pernah basi; tanpa putaran = basi */
export const basi = (t, hi) => !t.tutup && (!t.putaran_terakhir || selisihHari(t.putaran_terakhir, hi) > BASI_HARI);
export const jiwaDari = d => UMUR.reduce((a, u) => a + (+d?.[u + "_l"] || 0) + (+d?.[u + "_p"] || 0), 0);
/* jiwa dari putaran (catatan) terbaru titik ini; null bila belum ada putaran di daftar yang dimuat */
export function jiwaTerakhir(id, catatan) {
  let p = null;
  for (const c of catatan || []) { const d = c.data; if (d?.titik_id === id && d.tgl_data && (!p || d.tgl_data > p.data.tgl_data)) p = c; }
  return p ? {tgl: p.data.tgl_data, jiwa: jiwaDari(p.data)} : null;
}
/* titik yang boleh dipilih di formulir: yang masih buka, ditambah titik catatan yang sedang diubah */
export const pilihanTitik = (titik, saatIni) => (titik || []).filter(t => !t.tutup || t.id === saatIni).map(t => t.id);
/* tanggapan POST /api/pengungsian/titik: 201 jadi, 409 + dekat minta konfirmasi (kirim ulang paksa:true), lainnya galat */
export function tanggapBuat(r) {
  if (r.ok) return {jenis: "ok", titik: r.j.titik};
  if (r.s === 409 && Array.isArray(r.j.dekat) && r.j.dekat.length) return {jenis: "dekat", dekat: r.j.dekat};
  return {jenis: "galat", pesan: r.j.galat || `Gagal menyimpan titik (${r.s})`};
}
/* isian formulir tambah -> badan POST; angka koordinat gaya Indonesia (koma) diterima; mengembalikan {galat} bila tidak sah */
export function badanBuat(v, paksa = false) {
  const nama = (v.nama || "").trim().replace(/\s+/g, " "), num = s => (s || "").trim() === "" ? null : Number(String(s).trim().replace(",", "."));
  if (nama.length < 2) return {galat: "Nama titik minimal 2 huruf."};
  if (!JENIS.includes(v.jenis_tempat)) return {galat: "Pilih jenis tempat."};
  const lat = num(v.lat), lon = num(v.lon);
  if ((lat == null) !== (lon == null)) return {galat: "Isi lintang dan bujur berpasangan, atau kosongkan keduanya."};
  if (lat != null && !(Number.isFinite(lat) && Number.isFinite(lon))) return {galat: "Koordinat harus angka."};
  const o = {nama, jenis_tempat: v.jenis_tempat};
  if (lat != null) { o.lat = lat; o.lon = lon; }
  if ((v.kejadian_id || "").trim()) o.kejadian_id = v.kejadian_id.trim();
  if (v.buka) o.buka = v.buka;
  if (paksa) o.paksa = true;
  return {badan: o};
}

/* ---------- HTML ---------- */
const label = s => { const t = String(s).replace(/_/g, " "); return t[0].toUpperCase() + t.slice(1); };
export function kartuHtml({titik, catatan, hi, esc, IK, tglF, ID, pil, status, bukaForm, dekat, tutupId, nilai = {}, muatan}) {
  const baris = (titik || []).map(t => {
    const j = jiwaTerakhir(t.id, catatan), b = basi(t, hi);
    const st = t.tutup ? pil("pasif", "Tutup " + tglF(t.tutup)) : b ? pil("segera_habis", t.putaran_terakhir ? "Basi" : "Belum ada putaran") : pil("aktif", "Berjalan");
    const aksi = t.tutup ? "" : tutupId === t.id
      ? `<input type="date" data-tp-tgl max="${esc(hi)}" min="${esc(t.buka || "")}" value="${esc(hi)}" aria-label="Tanggal tutup"><button class="mj-btn kecil utama" data-tp-tutup-ok="${esc(t.id)}">${IK.ok}Simpan</button><button class="mj-btn kecil" data-tp-tutup-batal="1">${IK.tutup}Batal</button>`
      : `<button class="mj-btn kecil" data-tp-tutup="${esc(t.id)}">${IK.tutup}Tutup titik</button>`;
    return `<tr><td><b>${esc(t.nama)}</b><br><small class="mj-redup">${esc(t.id)}${t.desa || t.kec ? ", " + esc([t.desa, t.kec].filter(Boolean).join(", ")) : ""}</small></td><td>${esc(label(t.jenis_tempat))}</td>
      <td>${t.putaran_terakhir ? esc(tglF(t.putaran_terakhir)) : "–"}</td><td class="mj-angka">${j ? ID.format(j.jiwa) : "–"}</td><td>${st}</td><td><div class="mj-aksi">${aksi}</div></td></tr>`;
  }).join("");
  const sebaris = (nm, l, isi) => `<label class="bn-isian">${l}${isi}</label>`;
  const f = bukaForm ? `<div class="mj-tp-form" id="tpForm">
      <div class="bn-baris">${sebaris("nama", "Nama titik *", `<input name="nama" maxlength="120" autocomplete="off" value="${esc(nilai.nama || "")}">`)}
        ${sebaris("jenis", "Jenis tempat *", `<select name="jenis_tempat"><option value="">Pilih…</option>${JENIS.map(j => `<option value="${j}" ${nilai.jenis_tempat === j ? "selected" : ""}>${esc(label(j))}</option>`).join("")}</select>`)}</div>
      <div class="bn-baris">${sebaris("lat", "Lintang", `<input name="lat" inputmode="decimal" autocomplete="off" placeholder="-6,597998" value="${esc(nilai.lat || "")}">`)}
        ${sebaris("lon", "Bujur", `<input name="lon" inputmode="decimal" autocomplete="off" placeholder="106,797429" value="${esc(nilai.lon || "")}">`)}
        <button class="mj-btn kecil" type="button" data-tp-gps="1">${IK.kab}Pakai lokasiku</button></div>
      <div class="bn-baris">${sebaris("buka", "Tanggal buka", `<input type="date" name="buka" max="${esc(hi)}" value="${esc(nilai.buka || hi)}">`)}
        ${sebaris("kejadian_id", "Kode kejadian (opsional)", `<input name="kejadian_id" maxlength="20" autocomplete="off" placeholder="KJ-2026-xxxxxxxx" value="${esc(nilai.kejadian_id || "")}">`)}</div>
      ${dekat ? `<div class="mj-pesan galat" role="alert">Ada titik kurang dari 200 m dari sini: ${dekat.map(d => `${esc(d.nama)} (${ID.format(d.jarak_m)} m)`).join(", ")}. Tetap buat titik baru?
        <div class="mj-aksi"><button class="mj-btn kecil utama" data-tp-paksa="1">${IK.ok}Ya, tetap buat</button><button class="mj-btn kecil" data-tp-batal-paksa="1">${IK.tutup}Pakai titik yang ada</button></div></div>` : ""}
      <div class="mj-aksi"><button class="mj-btn utama" type="button" data-tp-simpan="1">${IK.ok}Simpan titik</button><button class="mj-btn" type="button" data-tp-tutup-form="1">${IK.tutup}Batal</button></div></div>` : "";
  return `<section class="ex ex-std mj-tp"><header class="ex-hd"><div class="ex-jd"><h3>${IK.kab} Titik pengungsian</h3>
      <button class="mj-btn kecil" data-tp-tambah="1" ${bukaForm ? "disabled" : ""}>${IK.tambah}Tambah titik</button></div></header>
    <div class="ex-bd">${f}${muatan ? `<p class="mj-redup" aria-busy="true">Memuat titik…</p>` : status ? `<p class="mj-redup">${esc(status)}</p>` : ""}
      ${(titik || []).length ? `<div class="mj-wadah ex-tabel"><table class="mj-tabel"><thead><tr><th>Titik</th><th>Jenis</th><th>Putaran terakhir</th><th>Jiwa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${baris}</tbody></table></div>` : muatan || status ? "" : `<p class="mj-redup">Belum ada titik di kabupatenmu. Tambah titik dulu, lalu isi putaran per hari.</p>`}</div></section>`;
}
