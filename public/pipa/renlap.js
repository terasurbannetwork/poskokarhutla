/* SIPPA: Renlap Generator sisi layar (keputusan 61, SP-140 butir 11). Fungsi murni tanpa DOM, dipakai layar Peta, layar Laporan, dan halaman HP /renlap.
   Kontrak server: POST /api/sippa/renlap {kompleks_ids}, GET /api/sippa/renlap, GET /api/sippa/renlap/:id/pdf, GET /api/renlap/data?id= dengan header x-renlap-token.
   Tidak ada data di berkas ini. Pesan galat server (mis. mesin belum disambungkan) ditampilkan apa adanya. */
const h = s => typeof esc === "function" ? esc(s) : String(s);
const tampil = n => typeof fmt === "function" ? fmt(n) : n == null || Number.isNaN(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
export const MAKS_RENLAP = 10;
const ID_KOMPLEKS = /^K[0-9]+$/, ID16 = /^[0-9a-f]{16}$/, TOKEN = /^[0-9a-f]{24,64}$/;

export function cekRenlap(ids) {
  const g = [], u = [...new Set((ids || []).map(String))];
  if (!u.length) g.push({medan: "kompleks_ids", alasan: "Pilih sedikitnya satu kompleks."});
  if (u.length > MAKS_RENLAP) g.push({medan: "kompleks_ids", alasan: `Paling banyak ${tampil(MAKS_RENLAP)} kompleks per renlap. Kurangi pilihan.`});
  if (u.some(i => !ID_KOMPLEKS.test(i))) g.push({medan: "kompleks_ids", alasan: "Kode kompleks diawali K lalu angka, misalnya K123."});
  return g;
}
export const badanRenlap = ids => ({kompleks_ids: [...new Set((ids || []).map(String))]});

/* pilih banyak di Daftar: kembali set baru; tombol penuh menolak yang ke-11 tanpa membuang pilihan */
export function ubahPilihan(set, id, nyala) {
  const s = new Set(set);
  if (!nyala) { s.delete(id); return {set: s, penuh: false}; }
  if (s.size >= MAKS_RENLAP && !s.has(id)) return {set: s, penuh: true};
  s.add(id); return {set: s, penuh: false};
}

export const KATA_RENLAP = {antre: "Antre", jalan: "Sedang dibuat", siap: "Siap", gagal: "Gagal"};
export const jalurPdfRenlap = id => { if (!ID16.test(String(id))) throw new Error("id renlap tidak sah"); return `/api/sippa/renlap/${id}/pdf`; };
/* tautan versi HP dari server: hanya milik sendiri, jalur /renlap dengan fragmen; selain itu dibuang (bukan tautan keluar) */
export function tautanHp(r, origin = "") {
  const t = r?.hp ?? r?.tautan_hp;
  if (typeof t !== "string" || !/^(\/|https:\/\/[^/\s]+\/)renlap(\.html)?#[A-Za-z0-9=&_.-]+$/.test(t)) return null;
  return t.startsWith("/") ? origin + t : t;
}
/* fragmen halaman HP: #t=<token>&id=<id> */
export function bacaFragmen(hash) {
  const q = new URLSearchParams(String(hash ?? "").replace(/^#/, "")), t = q.get("t"), id = q.get("id");
  return {token: t && TOKEN.test(t) ? t : null, id: id && ID16.test(id) ? id : null};
}

const tgl = ms => ms == null ? "–" : (typeof jamWIB === "function" ? jamWIB(ms) : new Date(ms).toISOString());
export function daftarRenlapHtml(daftar, {origin = ""} = {}) {
  if (!daftar?.length) return `<p class="ad-kosong">Belum ada renlap. Buat dari layar Peta atau Daftar kompleks.</p>`;
  const baris = daftar.map(r => {
    const hp = tautanHp(r, origin), ada = ID16.test(String(r.id));
    const aksi = (r.status === "siap" && ada ? `<a class="ad-tombol" href="${h(jalurPdfRenlap(r.id))}" download>Unduh PDF</a>` : "")
      + (r.status === "siap" && hp ? ` <button type="button" class="ad-tombol" data-salin-renlap="${h(hp)}">Salin tautan HP</button>` : "");
    return `<tr><td data-label="Waktu">${h(tgl(r.waktu))}</td><td data-label="Kompleks">${h((r.kompleks_ids || []).join(", "))}${r.prov ? `, provinsi ${h(r.prov)}` : ""}</td>`
      + `<td data-label="Status"><span class="sp-status ${r.status === "siap" ? "gelar" : r.status === "gagal" ? "hilang" : "servis"}">${h(KATA_RENLAP[r.status] ?? r.status ?? "–")}</span>${r.galat ? `<br><small>${h(r.galat)}</small>` : ""}</td>`
      + `<td data-label="Dibuat oleh">${h(r.oleh ?? "–")}</td><td data-label="Aksi">${aksi}</td></tr>`;
  }).join("");
  return `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Daftar renlap</caption><thead><tr>${["Waktu", "Kompleks", "Status", "Dibuat oleh", ""].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${baris}</tbody></table></div>`
    + `<p class="ad-catat sp-sumber">Sumber: SIPPA D1 (renlap). Status antre bisa berarti mesin pembuat belum tersambung; pesannya tampil apa adanya.</p>`;
}

/* tautan peta untuk koordinat di halaman HP: titik desimal tetap (en-US tanpa pemisah ribuan), bukan format angka Indonesia */
const dec = v => Number(v).toLocaleString("en-US", {minimumFractionDigits: 5, maximumFractionDigits: 5, useGrouping: false});
export const tautanKoordinat = (lat, lon) => `https://www.google.com/maps/search/?api=1&query=${dec(lat)},${dec(lon)}`;
export const teksKoordinat = (lat, lon) => `${dec(lat)}, ${dec(lon)}`;

/* balasan buat (201): token dan tautan HP hanya muncul sekali, jadi layar menampilkannya seketika dengan peringatan simpan */
export function hasilBuatHtml(j, origin = "") {
  const hp = tautanHp(j, origin);
  return `<div class="ad-spanduk" role="status"><b>Renlap dibuat, status ${h(KATA_RENLAP[j?.renlap?.status] ?? j?.renlap?.status ?? "–")}.</b>${j?.pesan || j?.renlap?.galat ? ` ${h(j.pesan || j.renlap.galat)}` : ""}</div>`
    + (hp ? `<label>Tautan versi HP<input readonly value="${h(hp)}" data-tautan-hp></label><div class="sp-aksi"><button type="button" class="ad-tombol" data-salin-renlap="${h(hp)}">Salin tautan HP</button></div>`
      + `<p class="ad-galat" role="alert">Simpan sekarang. Tautan ini tidak bisa dilihat lagi setelah jendela ini ditutup.</p>` : `<p class="ad-catat">Server tidak mengirim tautan HP.</p>`);
}
