/* Kartu kejadian publik (LK-06): satu kartu dari kartuPublik() di src/lapor_kejadian.js.
   Semua teks dari data lewat textContent; tidak ada innerHTML dari data. Tanpa foto, nama, nomor tiket. */
const NS = "http://www.w3.org/2000/svg";
export const IKON = {
  orang: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6"/>',
  centang: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  bagikan: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  cetak: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v6H7z"/>',
  titik: '<path d="M12 21s6-5.6 6-10.5a6 6 0 0 0-12 0C6 15.4 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2"/>',
};
export function ikon(nama, isi = IKON[nama]) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "hi-ik");
  s.innerHTML = isi;   // isi = konstanta di berkas ini atau IKON bencana dari kepala.js, bukan data pengguna
  return s;
}
export function el(tag, kelas, teks) {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks != null) e.textContent = teks;
  return e;
}
const ZONA = {timeZone: "Asia/Jakarta"};
export const jam = ms => new Date(ms).toLocaleTimeString("id-ID", {...ZONA, hour: "2-digit", minute: "2-digit"});   // "14.20"
export const tanggalJam = ms => `${new Date(ms).toLocaleDateString("id-ID", {...ZONA, day: "numeric", month: "short", year: "numeric"})}, ${jam(ms)} WIB`;
const n = v => Number(v).toLocaleString("id-ID");
export const rentang = ({min, max}) => min === max ? n(min) : `${n(min)} sampai ${n(max)}`;
const DAMPAK = [["meninggal", "Meninggal"], ["hilang", "Hilang"], ["luka", "Luka"], ["mengungsi", "Mengungsi"], ["rumah", "Rumah rusak"]];

function tombolIkon(nama, label, aksi) {
  const b = el("button", "hi-ikbtn"); b.type = "button"; b.setAttribute("aria-label", label); b.title = label;
  b.append(ikon(nama), el("span", "hi-sr", label)); b.addEventListener("click", aksi); return b;
}
async function bagikan(k, tombol) {
  const url = `${location.origin}/lapor/hari-ini#k-${k.id}`, judul = `${k.jenis}, ${k.lokasi.kab || k.lokasi.prov || ""}`;
  const info = tombol.querySelector(".hi-sr"), awal = info.textContent;
  try {
    if (navigator.share) { await navigator.share({title: judul, text: "Laporan warga yang sudah diverifikasi BPBD", url}); return; }
    await navigator.clipboard.writeText(url); info.textContent = "Tautan disalin";
  } catch (e) { if (e?.name === "AbortError") return; info.textContent = "Tautan belum bisa disalin"; }
  setTimeout(() => { info.textContent = awal; }, 2500);
}
function cetak(id) {
  document.body.dataset.cetak = id;
  addEventListener("afterprint", () => { delete document.body.dataset.cetak; }, {once: true});
  print();
}
export function kartuPublik(k) {
  const a = el("article", "hi-kartu"); a.id = `k-${k.id}`; a.tabIndex = -1;
  const atas = el("div", "hi-atas"), pil = el("span", "hi-pil", k.jenis); atas.append(pil);
  if (k.subjenis) atas.append(el("span", "hi-pil hi-pil-sub", k.subjenis));
  if (k.waktu) atas.append(el("time", "hi-waktu", tanggalJam(k.waktu)));
  const L = k.lokasi || {}, tempat = [L.desa && `Desa/Kel. ${L.desa}`, L.kec && `Kec. ${L.kec}`, L.kab, L.prov].filter(Boolean).join(", ");
  const kepala = el("header", "hi-hd"); kepala.append(atas, el("h3", "hi-lokasi", tempat || "Lokasi belum didata"));
  const isi = el("div", "hi-bd");
  if (k.nWarga) { const w = el("p", "hi-warga"); w.append(ikon("orang"), `${n(k.nWarga)} warga melapor`); isi.append(w); }
  const v = el("p", "hi-verif"); v.append(ikon("centang"), `Diverifikasi ${k.verifikasi.oleh}, ${jam(k.verifikasi.waktu)} WIB`); isi.append(v);
  const baris = DAMPAK.filter(([x]) => k.dampak?.[x]);
  if (!baris.length) isi.append(el("p", "hi-kecil", "Belum ada angka dampak dari laporan warga"));
  else {
    const t = el("table", "ex-tabel hi-tabel"), cap = el("caption", "hi-sr", "Dampak menurut laporan warga");
    const h = el("tr"); for (const x of ["Isian", "Menurut laporan warga"]) { const th = el("th", null, x); th.scope = "col"; h.append(th); }
    const tb = el("tbody"); for (const [x, label] of baris) { const r = el("tr"); r.append(el("th", null, label), el("td", null, rentang(k.dampak[x]))); r.firstChild.scope = "row"; tb.append(r); }
    const th = el("thead"); th.append(h); t.append(cap, th, tb);
    const gulung = el("div", "hi-gulung"); gulung.append(t); isi.append(gulung, el("p", "hi-kecil", "Menurut laporan warga, tidak dijumlah dan bukan data resmi korban."));
  }
  const aksi = el("div", "hi-aksi"); aksi.setAttribute("role", "group"); aksi.setAttribute("aria-label", "Bagikan atau cetak kartu ini");
  const bg = tombolIkon("bagikan", "Bagikan", () => bagikan(k, bg)); aksi.append(bg, tombolIkon("cetak", "Cetak", () => cetak(k.id)));
  a.append(kepala, isi, aksi); return a;
}
