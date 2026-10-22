/* Alarm Himawari (docs/bnpb/RENCANA-LANJUT.md §1.1, §1.5): api yang Himawari-9 lihat sebelum VIIRS menjadi baris alarm_himawari (siaga, radius 2 km, PERKIRAAN lokasi,
   bukan titik api) dan dikabari ke Posko pusat saja. Cron menit memeriksa etag R2 data/himawari.json (murah) dan hanya bila berubah menjalankan tandaiBaru (src/himawari.js,
   aturan yang sama dengan peta dan email EWS). Siaga menjadi terkunci saat tugas api dari VIIRS dibuat dalam 4 km (jam Himawari masuk ke tugas_api.himawari_awal), dan hilang
   bila 6 jam tanpa pindaian baru. Migrasi 0043/0041 belum ada, atau R2/MEDIA tak terpasang = dilewati rapi.
   ponytail: satu alarm per piksel ~2 km (pindaian berikutnya dalam 2 km menyatu); tanpa pengelompokan lintas piksel. */
import {muatHimawari, tandaiBaru, saringIndonesia} from "./himawari.js";
import {km, wilayah, cariWilayah} from "./titik.js";
import {kabarkan, penerimaPosko} from "./kabar.js";
import {acak} from "./worker.js";

const MENIT = 60e3, JAM = 60 * MENIT, RADIUS_KM = 2, KUNCI_KM = 4, HILANG_JAM = 6, META = "himawari_etag", MAKS_DAFTAR = 5;
const tanpa = e => /no such (table|column)/i.test(String(e?.message || e));

export async function alarmHimawari(env, kini = Date.now()) {
  if (!env.MEDIA || !env.DB) return {lewat: "R2 MEDIA tidak terpasang"};
  try {
    const hilang = await env.DB.prepare("UPDATE alarm_himawari SET status = 'hilang' WHERE status = 'siaga' AND terakhir < ?").bind(kini - HILANG_JAM * JAM).run();
    const kepala = await env.MEDIA.head("data/himawari.json");
    if (!kepala) return {lewat: "himawari.json belum ada", hilang: hilang.meta.changes};
    const tanda = String(kepala.etag || kepala.uploaded?.getTime?.() || ""), lama = (await env.DB.prepare("SELECT nilai FROM tugas_meta WHERE kunci = ?").bind(META).first())?.nilai;
    if (lama === tanda) return {lewat: "berkas sama", hilang: hilang.meta.changes};
    const hw = await muatHimawari(env); if (!hw?.acuan) return {lewat: "himawari.json tidak terbaca"};
    let firms = null; try { const r = await env.DB.prepare("SELECT isi FROM titik_terbaru ORDER BY id DESC LIMIT 1").first(); firms = r && JSON.parse(r.isi); } catch (e) {}
    const acuan = Date.parse(hw.acuan), baru = tandaiBaru(hw, firms, kini, await saringIndonesia(env)).filter(r => r[9]);
    const ada = (await env.DB.prepare("SELECT id, lat, lon, status, terakhir, n_pindai, frp FROM alarm_himawari WHERE status != 'hilang' ORDER BY terakhir DESC LIMIT 500").all()).results;
    const st = [], dibuat = []; let sama = 0;
    for (const [lat, lon, u, frp, , , , n, u0] of baru) {
      const terakhir = Math.round(acuan - u * MENIT), pertama = Math.round(acuan - (u0 ?? u) * MENIT), dekat = ada.find(a => km(lat, lon, a.lat, a.lon) <= RADIUS_KM);
      if (dekat) { sama++; dekat.terakhir = Math.max(dekat.terakhir, terakhir);
        st.push(env.DB.prepare("UPDATE alarm_himawari SET terakhir = max(terakhir, ?1), n_pindai = max(n_pindai, ?2), frp = max(coalesce(frp, 0), ?3) WHERE id = ?4").bind(terakhir, n ?? 1, frp, dekat.id)); continue; }
      const id = acak(8), a = {id, lat, lon, status: "siaga", terakhir, pertama, frp};
      ada.push(a); dibuat.push(a);
      st.push(env.DB.prepare("INSERT INTO alarm_himawari (id, lat, lon, radius_m, pertama, terakhir, n_pindai, frp, status) VALUES (?, ?, ?, 2000, ?, ?, ?, ?, 'siaga')").bind(id, lat, lon, pertama, terakhir, n ?? 1, frp));
    }
    for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
    await env.DB.prepare("INSERT INTO tugas_meta (kunci, nilai) VALUES (?1, ?2) ON CONFLICT(kunci) DO UPDATE SET nilai = ?2").bind(META, tanda.slice(0, 100)).run();   // sesudah alarm tersimpan: gagal di tengah = diulang menit berikutnya
    const kabar = dibuat.length ? await kabarkanBaru(env, dibuat, kini) : null;
    return {baru: dibuat.length, diperbarui: sama, hilang: hilang.meta.changes, ...(kabar ? {kabar} : {})};
  } catch (e) { if (tanpa(e)) return {lewat: "migrasi 0041/0043 belum diterapkan"}; throw e; }
}

/* satu kabar ringkas per putaran ke Posko pusat; dikabarkan_pada diklaim dulu (kunci idempoten per alarm pertama) */
async function kabarkanBaru(env, alarm, kini) {
  const klaim = await env.DB.batch(alarm.map(a => env.DB.prepare("UPDATE alarm_himawari SET dikabarkan_pada = ? WHERE id = ? AND dikabarkan_pada IS NULL").bind(kini, a.id)));
  const baru = alarm.filter((a, i) => klaim[i].meta.changes); if (!baru.length) return null;
  let W = null; try { W = await wilayah(env); } catch (e) {}
  const nama = a => { const k = W && cariWilayah(W, a.lat, a.lon); return k ? k.split("|")[1] : `${a.lat.toFixed(2)}, ${a.lon.toFixed(2)}`; };
  const daftar = baru.slice(0, MAKS_DAFTAR).map(nama).join(", ") + (baru.length > MAKS_DAFTAR ? ` dan ${baru.length - MAKS_DAFTAR} lainnya` : "");
  return kabarkan(env, `himawari:${baru[0].id}`, await penerimaPosko(env), {judul: `${baru.length} alarm Himawari baru`,
    isi: `Satelit Himawari melihat api di ${daftar} sebelum NASA FIRMS. Ini perkiraan lokasi dalam radius 2 km, bukan titik api; tunggu VIIRS atau konfirmasi lapangan.`, url: "/admin/sla"}, kini);
}

/* jam deteksi pertama per tugas + kunci alarm. daftar = [{id, lat, lon, awal (ms atau null), baru}], dipanggil sesudah tugasnya ada di D1.
   Kolom 0043 belum ada = tidak melakukan apa-apa (tugas tetap jadi). */
export async function catatAwalTugas(env, daftar, kini = Date.now()) {
  if (!daftar.length) return {};
  try {
    const st = [], kunci = [];
    let siaga = [];
    if (daftar.some(t => t.baru)) try { siaga = (await env.DB.prepare("SELECT id, lat, lon, pertama FROM alarm_himawari WHERE status = 'siaga' LIMIT 500").all()).results; } catch (e) { if (!tanpa(e)) throw e; }
    for (const t of daftar) {
      const a = t.baru ? siaga.map(x => [km(t.lat, t.lon, x.lat, x.lon), x]).filter(([d]) => d <= KUNCI_KM).sort((p, q) => p[0] - q[0])[0]?.[1] : null;
      if (a) { siaga = siaga.filter(x => x !== a); kunci.push(t.id);
        st.push(env.DB.prepare("UPDATE alarm_himawari SET status = 'terkunci', tugas_id = ?1, terkunci_pada = ?2 WHERE id = ?3 AND status = 'siaga'").bind(t.id, kini, a.id),
          env.DB.prepare("UPDATE tugas_api SET himawari_awal = ?1, sumber_awal = 'himawari' WHERE id = ?2").bind(a.pertama, t.id)); }
      if (t.awal != null) st.push(env.DB.prepare("UPDATE tugas_api SET terdeteksi_awal = coalesce(terdeteksi_awal, ?1), sumber_awal = coalesce(sumber_awal, 'viirs') WHERE id = ?2").bind(t.awal, t.id));
    }
    for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
    return {terkunci: kunci.length};
  } catch (e) { if (tanpa(e)) return {lewat: "migrasi 0043 belum diterapkan"}; throw e; }
}

export async function bersihkanAlarm(env, kini = Date.now()) {
  try { return (await env.DB.prepare("DELETE FROM alarm_himawari WHERE terakhir <= ?").bind(kini - 30 * 24 * JAM).run()).meta.changes; }
  catch (e) { if (tanpa(e)) return {lewat: "migrasi 0043 belum diterapkan"}; throw e; }
}
