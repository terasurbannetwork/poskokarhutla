/* SIPPA SP-140: pemetaan murni data.json Renlap -> model tampilan halaman HP /renlap, tanpa DOM dan tanpa data.
   Bentuk data.json SAMA dengan DATA uji pilot (src/uji_pilot_data.js, dibangkitkan ekspor_web.py) ditambah ringkas.{judul,wilayah}.
   Pemetaan tautan arah mengikuti gmaps/gRute di public/pipa/uji_pilot.js (SALINAN, bertanda asal; uji_pilot.js tidak bisa diimpor karena jalan sendiri saat dimuat). */
const NAMA_GAMBAR = /^[A-Za-z0-9._-]{1,80}\.(jpe?g|png|svg|webp)$/i, ID16 = /^[0-9a-f]{16}$/;
const dec = v => Number(v).toLocaleString("en-US", {minimumFractionDigits: 5, maximumFractionDigits: 5, useGrouping: false});
const titikSah = p => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null && p[0] !== "" && p[1] !== "" && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]));

/* "img/<nama>" (relatif ke data.json) -> nama berkas; selain itu null (tautan luar, naik folder, nama aneh) */
export function namaGambar(src) {
  const m = String(src ?? "").match(/^(?:\.\/)?img\/([^/?#]+)$/);
  return m && NAMA_GAMBAR.test(m[1]) && !m[1].includes("..") ? m[1] : null;
}
/* alamat gambar data -> jalur API bertoken (header x-renlap-token dipasang pemanggil, <img> tidak bisa mengirimnya) */
export function jalurGambar(id, src) {
  const f = namaGambar(src);
  if (!ID16.test(String(id)) || !f) return null;
  return `/api/renlap/img?id=${id}&f=${encodeURIComponent(f)}`;
}

/* salinan gmaps/gRute uji_pilot.js */
export const tautanArah = (p, jalanKaki) => titikSah(p) ? `https://www.google.com/maps/dir/?api=1&destination=${dec(p[0])},${dec(p[1])}&travelmode=${jalanKaki ? "walking" : "driving"}` : null;
export function tautanRute(titik) {
  const ada = (titik || []).filter(titikSah);
  if (!ada.length) return null;
  const k = p => `${dec(p[0])},${dec(p[1])}`, antara = ada.slice(0, -1);
  return `https://www.google.com/maps/dir/?api=1&destination=${k(ada.at(-1))}${antara.length ? "&waypoints=" + encodeURIComponent(antara.map(k).join("|")) : ""}&travelmode=driving`;
}
const jalanKaki = judul => /kaki|petak|pompa/i.test(judul || "");

/* data.json -> model tampilan; bidang yang tidak ada dilewati (bentuk lama tidak membuat layar mati) */
export function modelRenlap(d, id) {
  if (!d || !Array.isArray(d.lokasi)) return null;
  const lokasi = d.lokasi.map(l => {
    const alur = (l.alur || []).map(x => ({no: x.no, judul: x.judul, ket: x.ket || "", titik: titikSah(x.titik) ? x.titik : null, warna: x.warna || null,
      arah: titikSah(x.titik) ? tautanArah(x.titik, jalanKaki(x.judul)) : null}));
    return {no: l.no, id: l.id, nama: l.nama, bagian: l.bagian === "panjang" ? "panjang" : "pendek", uji: l.uji, status: l.status, peran: l.peran,
      menit: l.menit_total, selang: l.selang || null, kab: l.kab, kec: l.kec, desa: l.desa, parkir: l.parkir, arahParkir: tautanArah(l.parkir, false), ujung: l.ujung, dari: l.dari, citra: l.citra || null,
      alur, rute: tautanRute(alur.filter(x => x.titik).map(x => x.titik)), svg: l.svg || {}, legenda: l.legenda, legenda_rute: l.legenda_rute,
      api: l.api || null, cuaca: l.cuaca || null, air: l.air || null, tips: l.tips || [], sulit: l.sulit || [], mudah: l.mudah || [], kit: l.kit || [],
      pompa_html: l.pompa_html, hid_html: l.hid_html, head: l.head, topo: l.topo, rute_catatan: l.rute_catatan};
  });
  const alat = (d.alat || []).map(a => ({...a, fotoJalur: a.foto ? jalurGambar(id, a.foto) : null}));
  const w = d.ringkas?.wilayah;
  return {judul: d.ringkas?.judul || "Renlap SIPPA", wilayah: typeof w === "string" ? w : Array.isArray(w) ? w.join(", ") : null, acuan: d.acuan || null,
    lokasi, alat, warna: d.warna || [], kerja: d.kerja || [], panduan: {uji: d.uji || [], selamat: d.selamat || [], putus: d.putus || [], cek_gambut: d.cek_gambut || ""}};
}

/* atribut URL dari HTML data.json: daftar izin (https, http, img/, #) sesudah karakter kontrol dan spasi dibuang, sehingga java&#9;script: dan sejenisnya ditolak */
export const urlBoleh = v => { const u = String(v ?? "").replace(/[\u0000-\u0020\u007f-\u009f]/g, "").toLowerCase(); return /^(https?:|img\/|#)/.test(u); };
