/* Form Bahan Laporan Harian (/bnpb/bahan, pemilik 3 Nov 2026: input via web "tinggal pilih", bukan tempel chat WA).
   Isian terstruktur Koordalops (dari Logbook), BMKG, PVMBG, dan Satgas disusun public/bnpb/bahan_spek.js jadi teks WA berformat baku,
   lalu disimpan sebagai baris wa_masuk biasa (dari = 'form', nama = staf pengirim). Jalur lama memakainya tanpa diubah:
   bot scripts/wa/otomatis.mjs (pesan terbaru per jenis), layar /laporan-bnpb, generator data/laporan-bnpb/generator.
   Isian terakhir per jenis disimpan di R2 wa-form/<kunci>.json untuk tombol "Salin isian terakhir" (bukan sumber laporan).
   Semua rute: staf Pusdalops/Koordalops/Pimpinan (atau admin) PERTAMA, sebelum body/D1. */
import {json, gagal, bacaBody} from "./worker.js";
import {stafOK, stafNyata, dariStaf, wilayahStaf} from "./staf.js";
import {laju} from "./bnpb.js";
import {kenali, tanggalIsi} from "./wa_jenis.js";
import {jenisDari, hariWib} from "./wa.js";
import {susun, KUNCI} from "../public/bnpb/bahan_spek.js";

const PERAN = ["pusdalops", "koordalops", "pimpinan"], MAKS_BODY = 65536, MAKS_TEKS = 65536, HARI = 864e5;   // MAKS_TEKS = CHECK teks wa_masuk (0076)
const pintu = async (env, req) => { const o = await stafOK(env, req, PERAN); return o ? String(o).slice(0, 64) : null; };
const DITOLAK = "hanya staf Pusdalops, Koordalops, atau Pimpinan";
/* bahan laporan harian = produk NASIONAL yang dibaca bot laporan Kepala BNPB: staf berwilayah dan akun dummy tidak boleh menulisnya */
const bolehTulis = (req, oleh) => !dariStaf(oleh) || (stafNyata(req) && !wilayahStaf(req).length);

async function kirim(env, req, kini) {
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, DITOLAK);
  if (!bolehTulis(req, oleh)) return gagal(403, "hanya staf nasional (bukan akun dummy atau staf berwilayah) yang boleh mengirim bahan laporan harian");
  const lj = await laju(env, "bf:" + oleh, "bahan_form", [[3600e3, 60]], kini); if (lj) return lj;
  const b = await bacaBody(req, MAKS_BODY); if (b.galat) return gagal(b.status || 400, b.galat);
  const kunci = b.o?.kunci, r = susun(kunci, b.o?.isi); if (r.galat) return gagal(400, r.galat);
  /* penjaga kontrak: teks susunan harus dikenali sebagai jenis yang sama dan bertanggal sama, kalau tidak bot tidak akan memilihnya */
  /* "laporan karhutla" ditolak di mana pun walau kenali() kini hanya membaca judul (b8f58f18): pembaca lama (bot Mac mini sebelum diperbarui) masih mencocokkan frasa itu di tengah teks */
  if (kenali(r.teks, null) !== kunci || tanggalIsi(r.teks, kunci) !== r.tanggal || /laporan karhutla/i.test(r.teks.replace(/[*_]/g, "").replace(/\s+/g, " "))) return gagal(400, "teks bebas memuat frasa judul laporan WA lain (mis. \"laporan karhutla\"); ubah kalimatnya");
  const hari = Date.parse(hariWib(kini)), t = Date.parse(r.tanggal);
  if (t < hari - 14 * HARI || t > hari + HARI) return gagal(400, "tanggal laporan harus dalam 14 hari terakhir sampai besok");
  if (r.teks.length > MAKS_TEKS) return gagal(400, `teks susunan melewati ${MAKS_TEKS} karakter; kurangi kejadian atau kalimat`);
  /* klik kirim dua kali: teks sama dari form dalam 10 menit = baris lama dikembalikan, tidak digandakan
     (kuota form = laju per staf; baris form tidak dihitung di plafon gerbang WA, src/wa.js) */
  const ada = await env.DB.prepare("SELECT id FROM wa_masuk WHERE dari = 'form' AND tanggal = ?1 AND diterima >= ?2 AND teks = ?3 LIMIT 1").bind(r.tanggal, kini - 600e3, r.teks).first();
  if (ada) return json({ok: true, id: ada.id, kunci, tanggal: r.tanggal, teks: r.teks, ulang: true});
  const ins = await env.DB.prepare("INSERT INTO wa_masuk (diterima, tanggal, jenis, dari, nama, teks) VALUES (?1, ?2, ?3, 'form', ?4, ?5)")
    .bind(kini, r.tanggal, jenisDari(r.teks, ""), oleh, r.teks).run();
  if (env.MEDIA) try { await env.MEDIA.put(`wa-form/${kunci}.json`, JSON.stringify({isi: r.isi, waktu: kini}), {httpMetadata: {contentType: "application/json"}}); }
  catch (e) { console.error("wa_form terakhir", String(e?.message || e)); }   // salinan isian hanya kemudahan; pesan sudah tersimpan
  return json({ok: true, id: ins.meta.last_row_id, kunci, tanggal: r.tanggal, teks: r.teks});
}

async function terakhir(env, req, url) {
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, DITOLAK);
  const kunci = url.searchParams.get("kunci"); if (!KUNCI.includes(kunci)) return gagal(400, `kunci harus salah satu: ${KUNCI.join(", ")}`);
  const o = env.MEDIA && await env.MEDIA.get(`wa-form/${kunci}.json`);
  let isi = null; if (o) try { isi = JSON.parse(await o.text()); } catch {}
  return json({isi: isi?.isi ?? null, waktu: isi?.waktu ?? null}, 200, {"cache-control": "no-store"});   // tanpa identitas pengirim
}

export const RUTE_WA_FORM = {
  "POST /api/wa/form": (env, req, url, kini) => kirim(env, req, kini),
  "GET /api/wa/form/terakhir": (env, req, url) => terakhir(env, req, url),
};
