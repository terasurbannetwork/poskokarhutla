/* tanggal.js: adaptor kekeringan untuk mesin bersama /inti/pilih_tanggal.js (PB-79a, F-36, D16). Panel kekeringan hanya punya SATU keadaan status (SPI, tanah)
   untuk hari terbaru; riwayat harian yang ADA di repo adalah laporan harian hari tanpa hujan (HTH) 30 hari (data/kekeringan_laporan.json, dimuat sekali di sini).
   Maka tanggal yang ditawarkan hanya tanggal di laporan itu, dan memilih tanggal mengganti daftar panel menjadi daftar HTH hari itu
   (HTH terpanjang, jiwa di HTH 31 hari atau lebih, hujan rerata) per provinsi, atau per kabupaten/kota bila satu provinsi dibuka.
   Peta dan status wilayah TIDAK berubah (tidak ada status per tanggal); layar menyatakannya. Hari ini atau Kemarin tanpa data = tombol mati.
   Tidak ada Real Time/Riwayat (adaptor tanpa `riwayat`). Dimuat sesudah peta.js. Berjalan hanya bila registri menyalakan kemampuan.layar.pilih_tanggal. */
(() => {
if (typeof PilihTanggal === "undefined" || typeof S === "undefined") return;
const panel = document.querySelector("#pilihTanggal");
const HARI = 864e5, BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const panjang = iso => +iso.slice(8) + " " + BLN[+iso.slice(5, 7) - 1] + " " + iso.slice(0, 4);
let lap = null, muat = null;
const ambil = () => muat ||= fetch("../data/kekeringan_laporan.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
  if (!d?.hari?.length || !d.nasional) { muat = null; return null; } lap = d; PilihTanggal.gambar(); return d; });

/* ---------- model murni (diuji di tests/layar/pb_pilih_tanggal_kekeringan.test.mjs) ---------- */
/* tanggal yang punya data: hari di laporan dengan minimal satu angka nasional bukan null */
const tanggalAda = L => !L ? [] : L.hari.filter((t, i) => ["jiwa31", "hth_maks", "hujan", "kab31"].some(k => L.nasional?.[k]?.[i] != null));
const ms = iso => Date.parse(iso + "T12:00:00+07:00");
/* baris panel untuk satu tanggal: provinsi, atau kabupaten/kota dari satu provinsi (kode); tanpa satu pun angka = dibuang */
function barisHari(L, iso, prov) {
  const i = L.hari.indexOf(iso); if (i < 0) return [];
  const nilai = o => ({hth: o.hth_maks?.[i] ?? null, jiwa: o.jiwa31?.[i] ?? null, hujan: o.hujan?.[i] ?? null});
  const sumber = prov ? (L.kab || []).filter(k => k.prov === prov).map(k => ({kunci: k.prov + "|" + k.nama, nama: k.nama, ...nilai(k)}))
    : Object.entries(L.prov || {}).map(([k, p]) => ({kunci: k, nama: p.nama, ...nilai(p)}));
  return sumber.filter(r => r.hth != null || r.jiwa != null || r.hujan != null)
    .sort((a, b) => (b.jiwa ?? -1) - (a.jiwa ?? -1) || (b.hth ?? -1) - (a.hth ?? -1) || a.nama.localeCompare(b.nama));
}

/* ---------- tampilan ---------- */
const bar = () => { const u = window.UnduhTabel?.tombol() || ""; return u ? `<div class="kk-bar">${u}</div>` : ""; };
function html() {
  const iso = S.tanggal; if (!iso || !lap) return null;
  const i = lap.hari.indexOf(iso), j = S.jalur, N = lap.nasional, g = "grid-template-columns:20px minmax(0,1fr) 54px 60px 58px";
  const ringkas = `<div class="ringkas"><div class="lbl">Hari tanpa hujan, ${esc(panjang(iso))}</div><div class="kv">`
    + `<div><b>${N.hth_maks?.[i] != null ? fmt(N.hth_maks[i]) : "–"}</b><span>HTH terpanjang (hari)</span></div>`
    + `<div><b>${N.jiwa31?.[i] != null ? rb(N.jiwa31[i]) : "–"}</b><span>Jiwa HTH 31 hari atau lebih</span></div>`
    + `<div><b>${N.hujan?.[i] != null ? F1(N.hujan[i]) : "–"}</b><span>Hujan rerata (mm/hari)</span></div></div>`
    + `<p class="kk-cat">Peta dan status wilayah tetap keadaan terbaru: status per tanggal tidak tersedia. Angka tanggal ini dari laporan harian.</p></div>`;
  const B = barisHari(lap, iso, j[0] || null);
  const kepala = `<div class="tb kepala" style="${g}"><span></span><span>${j.length ? "Kabupaten / kota" : "Provinsi"}</span><span class="n" title="Hari tanpa hujan terpanjang (hari)">HTH</span><span class="n" title="Jiwa di wilayah dengan hari tanpa hujan 31 hari atau lebih">Jiwa</span><span class="n" title="Hujan rerata (mm per hari)">Hujan</span></div>`;
  const sel = r => `<span class="rk">__</span><span style="font-weight:600" translate="no">${esc(r.nama)}</span><span class="n">${r.hth != null ? fmt(r.hth) : "–"}</span><span class="n">${r.jiwa ? rb(r.jiwa) : "–"}</span><span class="n">${r.hujan != null ? F1(r.hujan) : "–"}</span>`;
  const bukaBisa = r => j.length ? !!S.wil?.kab?.[r.kunci] : !!S.wil?.prov?.[r.kunci];
  const isi = B.map((r, k) => { const x = sel(r).replace("__", k + 1);
    return bukaBisa(r) ? `<button class="tb" data-k="${esc(r.kunci)}" style="${g}">${x}</button>` : `<div class="tb" style="${g}">${x}</div>`; }).join("");
  return ringkas + bar() + kepala + (isi || `<div class="kosong">Tidak ada data hari tanpa hujan pada ${esc(panjang(iso))}.</div>`);
}

/* kalender: angka per tanggal = kabupaten dengan 30% penduduk di HTH 31 hari atau lebih (laporan harian); hanya tanggal di laporan yang bisa dibuka */
const kalender = {satuan: "kabupaten", get awal() { return lap?.hari?.[0]; },
  ket: "Angka = kabupaten dengan 30% penduduk di HTH 31 hari atau lebih (laporan harian). Yang bisa dibuka: tanggal yang ada di laporan.",
  terbanyak: {judul: "Terbanyak", n: 6},
  muat: async () => { const L = await ambil(), j = {}; if (L) for (const t of tanggalAda(L)) j[t] = L.nasional.kab31?.[L.hari.indexOf(t)] ?? 0; return {jumlah: j}; },
  bisa: t => tanggalAda(lap).includes(t) };

let host = panel;
PilihTanggal.pasang({id: "kekeringan", host: () => host, kalender, tanggal: () => tanggalAda(lap).map(ms),
  ubah: iso => { S.tanggal = iso; S.hal = 0; renderDaftar(); }});
ambil();
/* kode BPS 4 digit kabupaten/kota ("prov|nama") dari laporan harian, untuk tombol Profil di dialog wilayah; null bila laporan belum termuat atau kabupaten tak ada */
const kode = kunci => { if (!lap?.kab) return null; const m = kode.m ||= new Map(lap.kab.map(k => [k.prov + "|" + k.nama.toLowerCase(), k.kode])); return m.get(String(kunci).toLowerCase()) || null; };
window.KekTanggal = {html, barisHari, tanggalAda, kalender, kode};
})();
