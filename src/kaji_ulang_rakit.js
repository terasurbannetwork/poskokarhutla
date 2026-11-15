/* Perakit draf kaji ulang (KU-03; data/kajian-bnpb/kaji-ulang/ALGORITMA.md bagian 2 sampai 5). MURNI: tanpa D1, tanpa jam, tanpa nama orang.
   Masukan = hasil kuMuatDraf (src/hak.js). Aturan tunggal: data yang tidak ada ditulis "tidak ada data", tabel yang belum ada "belum diaktifkan", tidak pernah angka 0.
   Durasi tugas dari durasiTahap/ringkasTahap (src/sla.js), bukan hitungan kedua. Angka antarsumber (tugas, 3W, Lifeline) tidak dijumlah. */
import {waktuTahap, ringkasTahap} from "./sla.js";
import {labelBencana} from "./tugas_bencana.js";
import {LAYANAN} from "./lifeline_usulan.js";

export const KU_STATUS_DATA = {ada: "ada", kosong: "tidak ada data", belum: "belum diaktifkan"};
export const KU_MAKS_POTRET = 100000;
export const KU_TAHAP = ["deteksi", "tugas", "konfirmasi", "respons", "padam", "fase", "layanan", "koordinasi", "pulih"];
const MENIT = 6e4, PULIH = new Set(["pemulihan", "selesai"]);
const ukuran = menit => menit == null || !Number.isFinite(menit) || menit < 0 ? {menit: null, ket: KU_STATUS_DATA.kosong} : {menit: Math.round(menit / MENIT)};   // urutan terbalik = tidak ada data, bukan negatif

export function rakitKajiUlang(d, {maksPotret = KU_MAKS_POTRET} = {}) {
  const {kejadian: kj, jejak = [], tugas = [], muncul, pelajaran, layanan, baris3w, tawaran} = d, ev = [], celah = [];
  const tambah = (waktu, tahap, sumber, ket, ref = null, tambahan = {}) => { if (waktu != null) ev.push({waktu, tahap, sumber, ket, ref, ...tambahan}); };

  tambah(kj.dibuat, "deteksi", "sk_kejadian", "Kejadian tercatat");
  for (const t of tugas) {
    const b = labelBencana(t.bencana), {perkiraan, w} = waktuTahap(t);
    tambah(w.deteksi, "deteksi", "tugas_api", `Deteksi ${b.sebut.toLowerCase()}`, t.id, perkiraan ? {perkiraan: true} : {});
    tambah(t.dibuat, "tugas", "tugas_api", "Tugas dibuka", t.id);
    tambah(t.konfirmasi_pada, "konfirmasi", "tugas_api", "Konfirmasi lapangan", t.id);
    tambah(t.kabar, "respons", "tugas_isian", "Kabar tindakan", t.id);
    tambah(t.tiba, "respons", "penugasan", "Regu tiba", t.id);
    tambah(t.padam_pada, "padam", "tugas_api", `Dilaporkan ${b.kata}`, t.id);
    tambah(w.terverifikasi, "padam", "tugas_api", `${b.kata[0].toUpperCase()}${b.kata.slice(1)} terverifikasi`, t.id);
  }
  for (const m of muncul ?? []) tambah(m.waktu, "padam", "tugas_muncul", "Muncul lagi", m.tugas_id);
  for (const j of jejak) tambah(j.waktu, PULIH.has(j.ke) ? "pulih" : "fase", "sk_jejak", `Fase menjadi ${j.ke}`);
  if (!jejak.length && kj.fase !== "terdeteksi") tambah(kj.fase_diubah, PULIH.has(kj.fase) ? "pulih" : "fase", "sk_kejadian", `Fase terakhir: ${kj.fase}`);
  for (const l of layanan ?? []) tambah(l.dibuat, "layanan", "lf_riwayat", `${l.layanan} ${l.warna}`, l.kab4);
  for (const r of baris3w ?? []) tambah(r.mulai, "koordinasi", "tw_baris", `Kegiatan ${r.klaster} dimulai`, r.kab4);
  for (const t of tawaran ?? []) tambah(t.dibuat, "koordinasi", "tw_tawaran", "Tawaran bantuan masuk");
  const urutTahap = Object.fromEntries(KU_TAHAP.map((t, i) => [t, i]));
  ev.sort((a, b) => a.waktu - b.waktu || urutTahap[a.tahap] - urutTahap[b.tahap]);

  /* potret <= maksPotret: peristiwa terlama dipangkas, jumlahnya dicatat (tidak diam) */
  let linimasa = ev, dipangkas = 0, panjang = JSON.stringify(ev).length;
  if (panjang > maksPotret - 200) {   // 200 = sisa untuk penanda pangkas dan bagian lain
    let i = 0; while (i < ev.length && panjang > maksPotret - 200) panjang -= JSON.stringify(ev[i++]).length + 1;
    linimasa = ev.slice(i); dipangkas = i;
  }

  /* durasi */
  const tugasDurasi = !tugas.length ? {status: KU_STATUS_DATA.kosong} : {status: KU_STATUS_DATA.ada, n_tugas: tugas.length, tahap: ringkasTahap(tugas).map(r => r.n === 0
    ? {...r, p50_menit: null, p90_menit: null, ket: KU_STATUS_DATA.kosong}
    : r.n === 1 ? {...r, nilai_menit: r.p50_menit, p50_menit: null, p90_menit: null, ket: "n = 1"} : r)};
  const fase1 = k => jejak.find(j => j.ke === k)?.waktu ?? null, tanggap = fase1("tanggap"), pulihW = fase1("pemulihan");
  const terakhir = new Map(), pertama = new Map();   // (kab, layanan) -> merah pertama / hijau pertama sesudahnya
  for (const l of [...(layanan ?? [])].sort((a, b) => a.dibuat - b.dibuat)) {
    const k = `${l.kab4}|${l.layanan}`; terakhir.set(k, l);
    if (l.warna === "merah" && !pertama.has(k)) pertama.set(k, {kab4: l.kab4, layanan: l.layanan, merah: l.dibuat, hijau: null});
    else if (l.warna === "hijau" && pertama.get(k)?.hijau == null && pertama.has(k)) pertama.get(k).hijau = l.dibuat;
  }
  const merahHijau = [...pertama.values()].map(({kab4, layanan: ly, merah, hijau}) => ({kab4, layanan: ly, ...ukuran(hijau == null ? null : hijau - merah)}));
  const durasiKejadian = {
    deteksi_ke_tanggap: ukuran(tanggap == null ? null : tanggap - kj.dibuat),
    tanggap_ke_pulih: ukuran(tanggap == null || pulihW == null ? null : pulihW - tanggap),
    layanan_merah_ke_hijau: layanan == null ? {status: KU_STATUS_DATA.belum} : merahHijau.length ? {status: KU_STATUS_DATA.ada, sel: merahHijau} : {status: KU_STATUS_DATA.kosong},
  };

  /* bagian pendamping (kartu terpisah, tanpa total gabungan) */
  const tugasN = d.tautan ?? 0, dimuat = tugas.length, tanpaTugas = Math.max(0, Math.min(tugasN, 200) - dimuat);
  const bagian = {
    tugas: {status: tugasN ? KU_STATUS_DATA.ada : KU_STATUS_DATA.kosong, ...(tugasN ? {terhubung: tugasN, dimuat, tidak_dimuat: Math.max(0, tugasN - 200), tanpa_tugas: tanpaTugas} : {})},
    layanan: layanan == null ? {status: KU_STATUS_DATA.belum} : !layanan.length ? {status: KU_STATUS_DATA.kosong}
      : {status: KU_STATUS_DATA.ada, sel: [...terakhir.values()].map(({kab4, layanan: ly, warna, dibuat}) => ({kab4, layanan: ly, warna, dibuat}))},
    koordinasi: baris3w == null && tawaran == null ? {status: KU_STATUS_DATA.belum} : !(baris3w?.length || tawaran?.length) ? {status: KU_STATUS_DATA.kosong}
      : {status: KU_STATUS_DATA.ada, per_klaster: [...(baris3w ?? []).reduce((m, r) => m.set(r.klaster, (m.get(r.klaster) ?? 0) + 1), new Map())].map(([klaster, kegiatan]) => ({klaster, kegiatan})).sort((a, b) => a.klaster < b.klaster ? -1 : 1),
        ...(tawaran?.length ? {tawaran: tawaran.length} : {})},
    catatan_lapangan: pelajaran == null ? {status: KU_STATUS_DATA.belum} : !pelajaran.length ? {status: KU_STATUS_DATA.kosong}
      : {status: KU_STATUS_DATA.ada, butir: [...pelajaran].sort((a, b) => a.dibuat - b.dibuat || (a.id < b.id ? -1 : 1)).map(p => ({id: p.id, tugas: p.tugas_id, catatan: p.catatan, waktu: p.dibuat}))},   // tanpa `oleh`
  };

  /* celah: tahap tanpa peristiwa, tugas tanpa konfirmasi, layanan tanpa riwayat, sumber belum ada */
  const sumberBelum = {layanan: layanan == null, koordinasi: baris3w == null && tawaran == null};
  for (const t of KU_TAHAP) if (!linimasa.some(e => e.tahap === t) && !dipangkas) celah.push({jenis: "tahap", tahap: t, ket: sumberBelum[t] ? KU_STATUS_DATA.belum : KU_STATUS_DATA.kosong});
  const tanpaKonf = tugas.filter(t => t.konfirmasi_pada == null).length;
  if (tanpaKonf) celah.push({jenis: "tugas_tanpa_konfirmasi", n: tanpaKonf, ket: "tugas tanpa konfirmasi lapangan"});
  if (tanpaTugas) celah.push({jenis: "tautan_tanpa_tugas", n: tanpaTugas, ket: "tautan ke tugas yang datanya tidak ditemukan"});
  if (bagian.tugas.tidak_dimuat) celah.push({jenis: "tugas_tidak_dimuat", n: bagian.tugas.tidak_dimuat, ket: `${bagian.tugas.tidak_dimuat} tugas tidak dimuat (batas 200)`});
  const tanpaMulai = (baris3w ?? []).filter(r => r.mulai == null).length;
  if (tanpaMulai) celah.push({jenis: "kegiatan_tanpa_waktu", n: tanpaMulai, ket: "kegiatan koordinasi tanpa waktu mulai"});
  if (layanan?.length) {
    const ada = new Set(layanan.map(l => `${l.kab4}|${l.layanan}`));
    for (const kab4 of d.kab) { const hilang = LAYANAN.filter(ly => !ada.has(`${kab4}|${ly}`)); if (hilang.length) celah.push({jenis: "layanan_tanpa_riwayat", kab4, layanan: hilang, ket: KU_STATUS_DATA.kosong}); }
  }
  for (const [k, v] of Object.entries({layanan: sumberBelum.layanan, tiga_w: sumberBelum.koordinasi, tugas_muncul: muncul == null, catatan_lapangan: pelajaran == null})) if (v) celah.push({jenis: "sumber_belum_aktif", sumber: k, ket: KU_STATUS_DATA.belum});

  return {kejadian: {id: kj.id, jenis: kj.jenis, nama: kj.nama, fase: kj.fase, kab: d.kab.length ? d.kab : null}, linimasa, tidak_dimuat: dipangkas,
    ...(dipangkas ? {catatan_pangkas: `${dipangkas} peristiwa tidak dimuat`} : {}), durasi: {tugas: tugasDurasi, kejadian: durasiKejadian}, ...bagian, celah};
}
