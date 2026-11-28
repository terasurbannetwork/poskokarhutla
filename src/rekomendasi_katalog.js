/* Katalog rekomendasi per pihak (PH-07; data/kajian-bnpb/potensi-hidromet/KEPUTUSAN-POTENSI.md D11, Q3).
   Empat pihak (pusat, prov, kab, masy) kali tiga fase (respon = status 2 dan 3, siaga = status 1, mitigasi = status 0) kali bahaya.
   Tiap butir {teks, rujukan, generik}. generik = butir berlaku untuk semua bahaya (tugas lembaga), bukan tindakan khusus satu bahaya.
   Pusat, prov, kab: HANYA butir yang bisa dirujuk ke teks peraturan di repo (data/hukum/teks/perban-nomor-{2-tahun-2024,4-tahun-2022,2-tahun-2023});
   butir tanpa rujukan tidak ditulis, pihak tanpa butir = []. Masy: butir public/ews_tindakan.js yang sudah bersumber (rujukan paralel). Bukan instruksi resmi. */
import {BENCANA} from "../public/ews_tindakan.js";

export const BAHAYA = ["BNJ", "BDG", "LSR", "GEL", "KHT", "KEK", "CEX"];
/* kode bahaya -> kunci BENCANA di ews_tindakan.js. BDG memakai butir banjir (butir banjir bandang khusus belum ada di sumber itu). */
const EWS = {BNJ: "banjir", BDG: "banjir", LSR: "longsor", GEL: "pesisir", KHT: "karhutla", KEK: "kekeringan", CEX: "cuaca"};
const faseDari = s => s >= 2 ? "respon" : s === 1 ? "siaga" : "mitigasi";

const P24 = "Perban BNPB 2/2024 tentang Sistem Peringatan Dini Bencana", P22 = "Perban BNPB 4/2022 tentang Pelaksanaan Peringatan Dini Bencana pada BNPB dan BPBD", P23 = "Perban BNPB 2/2023 tentang Penyusunan Rencana Kontingensi Bencana";
const b = (teks, rujukan) => ({teks, rujukan, generik: true});

/* butir Kepala Daerah / BPBD / Pemda: teks peraturan sama untuk provinsi dan kabupaten/kota (tidak ada pembedaan di sumber), jadi satu daftar dipakai keduanya */
const DAERAH = {
  respon: [
    b("Kepala Daerah memutuskan penyebarluasan informasi peringatan bencana dan arahan tindakan oleh masyarakat; keputusan memuat upaya kesiapsiagaan, upaya kedaruratan atau perintah evakuasi, dan wilayah yang diperkirakan terpapar.", `${P24}, Pasal 17 ayat (1) huruf b dan ayat (2); ${P22}, Pasal 7`),
    b("BPBD menyusun rekomendasi aksi yang bersifat teknis.", `${P24}, Pasal 15`),
    b("Pemerintah daerah memanfaatkan informasi peringatan dini untuk keputusan perencanaan penanganan darurat, mobilisasi sumber daya, peningkatan kesiapsiagaan dan aksi merespon peringatan dini, serta penyebarluasan informasi dengan memperhatikan kelompok rentan.", `${P24}, Pasal 21`),
    b("Arahan tindakan oleh masyarakat dikoordinasikan BNPB dan/atau BPBD.", `${P24}, Pasal 18 ayat (1); ${P22}, Pasal 9 ayat (2)`),
    b("BPBD memberi umpan balik lewat Platform: gejala bencana teramati, serta persiapan, aksi merespon peringatan dini, dan mobilisasi sumber daya yang dilakukan.", `${P24}, Pasal 23`),
  ],
  siaga: [
    b("Keputusan Kepala Daerah memuat upaya kesiapsiagaan.", `${P22}, Pasal 7 ayat (1) huruf b dan ayat (2) huruf a`),
    b("Pemerintah daerah memanfaatkan informasi peringatan dini untuk meningkatkan kesiapsiagaan dan melakukan aksi merespon peringatan dini.", `${P24}, Pasal 21 huruf c`),
    b("Pemerintah Daerah menetapkan rencana kontingensi bencana sesuai kewenangannya; penyusunannya dikoordinasikan BPBD dan dapat berubah menjadi rencana operasi darurat bila terjadi keadaan darurat.", `${P23}, Pasal 2 ayat (2) dan Pasal 3 ayat (1) dan (3)`),
  ],
  mitigasi: [
    b("BPBD di tingkat daerah melaksanakan penguatan kelembagaan peringatan dini: peningkatan pengetahuan risiko bencana, kemampuan pemantauan dan pengelolaan data peringatan dini, komunikasi dan diseminasi, serta kemampuan respon tindakan kesiapsiagaan, lewat bimbingan teknis dan pelatihan atau latihan.", `${P22}, Pasal 11 ayat (1) huruf b, ayat (3), ayat (4), dan ayat (7) huruf b`),
    b("BPBD dapat melakukan pemantauan langsung untuk mendukung pengamatan gejala bencana dan analisa data.", `${P22}, Pasal 4 ayat (2)`),
  ],
};

export const KATALOG = {
  pusat: {
    respon: [
      b("Kepala BNPB memutuskan penyebarluasan informasi peringatan bencana dan arahan tindakan oleh masyarakat; keputusan berupa perintah Kepala BNPB yang memuat upaya kesiapsiagaan, upaya kedaruratan atau perintah evakuasi, dan wilayah yang diperkirakan terpapar.", `${P24}, Pasal 17 ayat (1) huruf a dan ayat (2); ${P22}, Pasal 7`),
      b("Direktorat Kesiapsiagaan menyediakan informasi sumber daya dan penguatan ketahanan masyarakat serta perencanaan penyelamatan dan evakuasi.", `${P24}, Pasal 14 ayat (3) huruf a dan ayat (4)`),
      b("Pusat Pengendalian Operasi mendampingi penyusunan rencana operasi penanganan darurat.", `${P24}, Pasal 14 ayat (5)`),
      b("Direktorat Fasilitasi Penanganan Korban dan Pengungsi mendampingi koordinasi fasilitasi penyelamatan dan evakuasi.", `${P24}, Pasal 14 ayat (6)`),
      b("Arahan tindakan oleh masyarakat dikoordinasikan BNPB dan/atau BPBD.", `${P24}, Pasal 18 ayat (1); ${P22}, Pasal 9 ayat (2)`),
      b("Peringatan yang disebarluaskan memuat jenis potensi bencana, tingkatan, daya rusak, potensi jiwa terpapar, prakiraan waktu kejadian, dan sumber daya; tingkatan memakai warna baku hijau, kuning, oranye, merah.", `${P24}, Pasal 20 ayat (2) dan (4)`),
    ],
    siaga: [
      b("Keputusan Kepala BNPB memuat upaya kesiapsiagaan.", `${P22}, Pasal 7 ayat (1) huruf a dan ayat (2) huruf a`),
      b("Pemerintah menetapkan rencana kontingensi bencana sesuai kewenangannya; penyusunannya dikoordinasikan BNPB dan dapat berubah menjadi rencana operasi darurat bila terjadi keadaan darurat.", `${P23}, Pasal 2 ayat (2) dan Pasal 3 ayat (1) dan (3)`),
    ],
    mitigasi: [
      b("BNPB di tingkat pusat melaksanakan penguatan kelembagaan peringatan dini: penetapan norma, standar, prosedur, dan kriteria; peningkatan kapasitas sumber daya manusia, sarana, dan prasarana; serta koordinasi dan integrasi data antar kementerian dan lembaga.", `${P22}, Pasal 11 ayat (1), ayat (2), dan ayat (7) huruf a`),
    ],
  },
  prov: DAERAH,
  kab: DAERAH,
};

/* rekomendasi(bahaya, status) -> {fase, pihak: {pusat, prov, kab, masy}}; bahaya tidak dikenal atau status di luar 0..3 -> null */
export function rekomendasi(bahaya, status) {
  if (!BAHAYA.includes(bahaya) || !Number.isInteger(status) || status < 0 || status > 3) return null;
  const fase = faseDari(status), e = BENCANA[EWS[bahaya]];
  /* masy: butir tingkat tepat (1 Waspada, 2 Siaga, 3 Awas); status 0 (Normal) tidak punya butir masyarakat di sumber */
  const t = status ? e?.tindakan?.[status] || [] : [], r = status ? e?.rujukan?.[status] || [] : [];
  const masy = t.map((teks, i) => ({teks, rujukan: r[i], generik: false})).filter(x => x.rujukan);
  return {fase, pihak: {pusat: KATALOG.pusat[fase], prov: KATALOG.prov[fase], kab: KATALOG.kab[fase], masy}};
}
