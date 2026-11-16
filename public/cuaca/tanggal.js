/* tanggal.js: adaptor cuaca ekstrem untuk mesin bersama /inti/pilih_tanggal.js (PB-79c, F-36, D16).
   Data cuaca hanya menyimpan peringatan yang MASIH BERLAKU, jadi tanggal yang ditawarkan hanya tanggal WIB yang dilintasi masa berlaku
   peringatan nowcast atau gelombang yang sudah dimuat halaman (tanggal tanpa peringatan = tombol mati, tidak ada di kalender). Kemarin dan
   tanggal lampau tidak pernah ditawarkan: tidak ada arsip peringatan. Memilih tanggal menyaring daftar panel dan lapisan peta ke peringatan yang
   berlaku pada tanggal itu (S.tanggal); bukan prakiraan model. Prakiraan hari (Hari ini, Besok) tetap di garis waktu sendiri.
   Dimuat sesudah peta.js. Berjalan hanya bila registri menyalakan kemampuan.layar.pilih_tanggal. */
(() => {
if (typeof PilihTanggal === "undefined" || typeof S === "undefined") return;
const HARI = 864e5, wib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10), awal = iso => Date.parse(iso + "T00:00:00+07:00");
const ofs = o => (typeof OFS !== "undefined" && OFS[o.zona]) || "+07:00";
const rentangNc = a => [Date.parse(a.mulai), Date.parse(a.selesai)];
const rentangGl = o => [Date.parse(o.dari + ofs(o)), Date.parse(o.sampai + ofs(o))];
const sah = r => Number.isFinite(r[0]) && Number.isFinite(r[1]) && r[1] > r[0];
const berlaku = (r, iso) => !iso || (sah(r) && r[0] < awal(iso) + HARI && r[1] > awal(iso));
const nc = a => berlaku(rentangNc(a), S.tanggal), gl = o => berlaku(rentangGl(o), S.tanggal);

/* jumlah peringatan (nowcast + provinsi bergelombang) per tanggal WIB yang dilintasi masa berlakunya */
function jumlahPerTanggal() {
  const j = {}, tambah = r => { if (!sah(r)) return; const a = r[0], b = r[1] - 1;
    for (let t = awal(wib(a)), n = 0; t <= b && n < 40; t += HARI, n++) { const k = wib(t + 12 * 36e5); j[k] = (j[k] || 0) + 1; } };
  (S.nc || []).forEach(a => tambah(rentangNc(a))); (S.gl || []).forEach(o => tambah(rentangGl(o))); return j; }
/* ms (tengah hari WIB) tiap tanggal berdata: bahan daftar tanggal mesin */
const tanggalBerdata = () => Object.keys(jumlahPerTanggal()).map(t => awal(t) + 12 * 36e5);

/* penyaring lapisan peta: nowcast per indeks S.nc, gelombang per kode provinsi; tanpa tanggal = penyaring awal peta.js */
function terapkanPeta() {
  if (typeof peta === "undefined" || !peta || !peta.getLayer?.("bmkg-fill")) return;
  try {
    const ids = (S.nc || []).flatMap((a, i) => nc(a) ? [i] : []), kode = (S.gl || []).filter(gl).map(o => o.prov);
    const fNc = S.tanggal ? ["in", ["get", "i"], ["literal", ids]] : null, fGl = S.tanggal ? ["all", [">", ["get", "lv"], 0], ["in", ["get", "kode"], ["literal", kode]]] : [">", ["get", "lv"], 0];
    peta.setFilter("bmkg-fill", fNc); peta.setFilter("bmkg-line", fNc); peta.setFilter("gelombang", fGl);
  } catch (e) { console.warn("tanggal cuaca", e); } }

const panel = document.querySelector("#panelMode");
let host = document.getElementById("pilihTanggal");
if (!host && panel) { host = document.createElement("div"); host.id = "pilihTanggal"; host.style.cssText = "width:100%;margin-bottom:8px"; panel.after(host); }
const kalender = {satuan: "peringatan", ket: "Angka = jumlah peringatan BMKG yang berlaku pada hari itu. Yang bisa dibuka: hari yang dilintasi peringatan aktif.",
  terbanyak: {judul: "Terbanyak", n: 3}, muat: async () => ({jumlah: jumlahPerTanggal()}), bisa: t => t in jumlahPerTanggal()};

PilihTanggal.pasang({id: "cuaca", host: () => host, kalender, tanggal: tanggalBerdata,
  ubah: iso => { S.tanggal = iso; if (iso && typeof Laci !== "undefined") Laci.tutup?.(); terapkanPeta(); if (typeof renderPanel === "function") renderPanel(); }});
/* tombol Hari ini/Kemarin dihitung dari data yang sudah dimuat: gambar ulang tiap panel digambar (data nowcast dan gelombang datang belakangan), bukan hanya tiap menit */
if (typeof renderPanel === "function") { const asli = renderPanel; window.renderPanel = function (...a) { const r = asli.apply(this, a); PilihTanggal.gambar(); return r; }; }
setInterval(() => { if (!document.hidden) PilihTanggal.gambar(); }, 60e3);
window.TanggalCuaca = {nc, gl, jumlahPerTanggal, tanggalBerdata, terapkanPeta, berlaku};
})();
