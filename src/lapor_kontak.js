/* Nomor BPBD untuk pelapor (KEPUTUSAN-LAPOR-AI K88, Q64). Fungsi murni: data public/data/bpbd_kontak.json disuntik.
   Urutan: BPBD kab/kota lokasi kejadian, lalu BPBD provinsi, lalu Call Center BNPB 117. Tidak pernah nomor karangan:
   tiap nomor di berkas data sudah diperiksa tertulis di halaman .go.id sumbernya (riset/kontak-bpbd). */
export const BNPB = {nama: "Call Center BNPB", nomor: "117", tingkat: "nasional"};
const kode = k => String(k ?? "").replace(/\D/g, "");
// prioritas jenis: nomor darurat 24 jam lebih dulu dari telepon kantor
const URUT = {call_center: 0, pusdalops: 1, wa: 2, kantor: 3};
// data rusak tidak boleh menggagalkan penyimpanan laporan: yang bukan daftar atau tanpa nomor diabaikan.
// Nomor bertanda lama (daftar BNPB sekitar 2013, halaman sebelum 2021) tidak dipakai: lebih baik BPBD provinsi atau 117 daripada nomor mati.
const pilih = daftar => (Array.isArray(daftar) ? daftar : [])
  .filter(x => typeof x?.nomor === "string" && /\d{6,}/.test(x.nomor.replace(/\D/g, "")) && !x.lama)
  .sort((a, b) => (URUT[a.jenis] ?? 9) - (URUT[b.jenis] ?? 9));

/* data: isi bpbd_kontak.json; w: {kabKode, provKode, kab, prov}. Hasil {nama, nomor, jenis, tingkat, url, lain[]} */
export function kontakBpbd(data, w) {
  const W = data?.wilayah || {}, kab = kode(w?.kabKode), prov = kode(w?.provKode) || kab.slice(0, 2);
  for (const [k, tingkat] of [[kab, "kab"], [prov, "prov"]]) {
    const r = k && W[k], d = pilih(r?.bpbd);
    if (!d.length) continue;
    const nama = tingkat === "kab" ? `BPBD ${w?.kab || r.nama}` : `BPBD Provinsi ${w?.prov || r.nama}`;
    return {nama, nomor: d[0].nomor, jenis: d[0].jenis, tingkat, url: d[0].url, lain: d.slice(1).map(x => x.nomor)};
  }
  return {...BNPB, lain: []};
}

export function kontakDamkar(data, w) {
  const r = data?.wilayah?.[kode(w?.kabKode)], d = pilih(r?.damkar);
  return d.length ? {nama: `Pemadam kebakaran ${w?.kab || r.nama}`, nomor: d[0].nomor, url: d[0].url} : null;
}

// kalimat penutup laporan terkirim (web dan WA memakai teks yang sama)
export const kalimatBpbd = k => k.tingkat === "nasional"
  ? `Untuk tindak lanjut langsung, hubungi *Call Center BNPB 117*. Nomor BPBD daerah Anda belum tercatat di data kami.`
  : `Untuk tindak lanjut langsung, hubungi *${k.nama}*: *${k.nomor}*.`;
