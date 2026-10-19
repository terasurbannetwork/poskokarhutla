/* Level gunung api MAGMA Indonesia (PVMBG) hampir-waktu-nyata. MAGMA tak punya API; yang ada halaman HTML publik
   /v1/gunung-api/tingkat-aktivitas (daftar gunung per level I-IV). Cron "* * * * *" memanggil perbaruiGunungapi tiap 30 menit
   (menit % 30 == 7): SATU permintaan per putaran, timeout 8 dtk. Port minimal urai_tingkat() dari scripts/gunungapi/magma.py.
   D1 (migrations/0021): gunungapi_level (level terkini), gunungapi_ubah (peristiwa; naik=1 untuk kenaikan level, dibaca src/ews.js nanti
   lewat kenaikanGunungapi), cuaca_sumber kunci 'gunungapi' (tarikan sehat terakhir). Gagal ambil / halaman berubah bentuk = data lama utuh,
   API menandai umur (umur_menit, basi). Tulis hanya baris yang berubah: ~48 tulis/hari bila level tetap. */
import {json, gagal, cacheTepi} from "./worker.js";
import {bersih, bacaBatas} from "./nowcast.js";

const MENIT = 60e3, URL_MAGMA = "https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas", TIMEOUT_MS = 8000, MAKS_BYTE = 2e6;
const MAKS_NAIK = 10, MIN_GUNUNG = 40, BASI_MENIT = 90, RIWAYAT_HARI = 90;   // magma.py menolak < 40 gunung (halaman berubah bentuk); 3 putaran gagal = basi
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const LEVEL = {IV: 4, III: 3, II: 2, I: 1};

/* HTML tingkat aktivitas -> [{nama, prov, level, laporan}]. Tiap kelompok dibuka judul 'Level IV (Awas)'; baris: 'Nama - Provinsi <a href=laporan>'. */
export function uraiTingkat(h) {
  const out = [];
  for (const b of String(h).split('<a href="" class="tx-inverse tx-14 tx-medium d-block">Level ').slice(1)) {
    const lv = LEVEL[b.split(" ", 1)[0]]; if (!lv) continue;
    for (const m of b.matchAll(/<td>([^<]{1,300})<a href="([^"]{1,300})"/g)) {
      const [nama, ...sisa] = bersih(m[1], 200).split(" - "), prov = sisa.join(" - "), lap = m[2].replace(/&amp;/g, "&").split("?")[0];
      if (!nama || nama.length > 60) continue;
      out.push({nama, prov: prov.slice(0, 120), level: lv, laporan: /^https:\/\/magma\.esdm\.go\.id\/v1\/gunung-api\/laporan\/\d{1,12}$/.test(lap) ? lap : null});
    }
  }
  return out.slice(0, 200);
}

async function unduh() {
  const r = await fetch(URL_MAGMA, {headers: {"user-agent": UA, "accept-language": "id", accept: "text/html"}, signal: AbortSignal.timeout(TIMEOUT_MS)});
  if (!r.ok) { r.body?.cancel(); throw new Error(`HTTP ${r.status}`); }
  return bacaBatas(r, MAKS_BYTE);
}

const SUMBER = "INSERT INTO cuaca_sumber (kunci, isi, dibuat) VALUES (?, ?, ?) ON CONFLICT(kunci) DO UPDATE SET isi = excluded.isi, dibuat = excluded.dibuat";

/* satu putaran cron. Gagal = data lama utuh, stempel sehat TIDAK maju (yang dicatat hanya 'gunungapi_galat'). Level pertama kali terlihat bukan peristiwa. */
export async function perbaruiGunungapi(env, kini = Date.now()) {
  let daftar;
  try {
    daftar = uraiTingkat(await unduh());
    if (daftar.length < MIN_GUNUNG) throw new Error(`hanya ${daftar.length} gunung terurai`);
  } catch (e) {
    try { await env.DB.prepare(SUMBER).bind("gunungapi_galat", JSON.stringify({pesan: String(e.message).slice(0, 200)}), kini).run(); } catch (e2) { /* tabel belum ada */ }
    return {galat: e.message};
  }
  const lama = new Map((await env.DB.prepare("SELECT nama, prov, level, laporan FROM gunungapi_level LIMIT 400").all()).results.map(r => [r.nama, r]));
  const unik = [...new Map(daftar.map(x => [x.nama, x])).values()];
  const naikN = unik.filter(g => lama.get(g.nama) && g.level > lama.get(g.nama).level).length;
  if (naikN > MAKS_NAIK) {   // halaman salah baca (urutan kelompok bergeser) jangan jadi banjir peristiwa saat EWS tersambung
    const pesan = `${naikN} kenaikan sekaligus (> ${MAKS_NAIK}): tidak ditulis`;
    await env.DB.prepare(SUMBER).bind("gunungapi_galat", JSON.stringify({pesan}), kini).run();
    return {galat: pesan};
  }
  const tulis = []; let naik = 0, turun = 0;
  for (const g of unik) {
    const a = lama.get(g.nama);
    if (a && a.level === g.level && a.prov === g.prov && a.laporan === g.laporan) continue;
    const berubah = a && a.level !== g.level;
    tulis.push(env.DB.prepare(`INSERT INTO gunungapi_level (nama, prov, level, laporan, diubah) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(nama) DO UPDATE SET prov = excluded.prov, level = excluded.level, laporan = excluded.laporan, diubah = CASE WHEN ? THEN excluded.diubah ELSE diubah END`)
      .bind(g.nama, g.prov, g.level, g.laporan, kini, berubah ? 1 : 0));
    if (berubah) {
      g.level > a.level ? naik++ : turun++;
      tulis.push(env.DB.prepare("INSERT INTO gunungapi_ubah (nama, dari, ke, naik, waktu) VALUES (?, ?, ?, ?, ?)").bind(g.nama, a.level, g.level, g.level > a.level ? 1 : 0, kini));
    }
  }
  await env.DB.batch([...tulis, env.DB.prepare("DELETE FROM gunungapi_ubah WHERE waktu < ?").bind(kini - RIWAYAT_HARI * 86400e3),
    env.DB.prepare(SUMBER).bind("gunungapi", JSON.stringify({gunung: daftar.length, naik, turun}), kini)]);
  return {gunung: daftar.length, naik, turun};
}

/* untuk src/ews.js nanti: kenaikan level sejak `sejak` (ms), terbaru dulu */
export async function kenaikanGunungapi(env, sejak) {
  return (await env.DB.prepare("SELECT nama, dari, ke, waktu FROM gunungapi_ubah WHERE naik = 1 AND waktu > ? ORDER BY waktu DESC, id DESC LIMIT 100").bind(sejak).all()).results;
}

async function terbaru(env) {
  const kini = Date.now(), s = await env.DB.prepare("SELECT dibuat FROM cuaca_sumber WHERE kunci = 'gunungapi'").first();
  const g = (await env.DB.prepare("SELECT nama, prov, level, laporan, diubah FROM gunungapi_level ORDER BY level DESC, nama LIMIT 400").all()).results;
  const u = (await env.DB.prepare("SELECT nama, dari, ke, naik, waktu FROM gunungapi_ubah ORDER BY waktu DESC, id DESC LIMIT 50").all()).results;
  const iso = t => new Date(t).toISOString(), umur = s ? Math.round((kini - s.dibuat) / MENIT) : null;
  return json({dibuat: s ? iso(s.dibuat) : null, umur_menit: umur, basi: umur == null || umur > BASI_MENIT,
    gunung: g.map(r => ({...r, diubah: iso(r.diubah)})), perubahan: u.map(r => ({nama: r.nama, dari: r.dari, ke: r.ke, naik: !!r.naik, waktu: iso(r.waktu)}))});
}

/* GET/HEAD /api/gunungapi/terbaru, cache tepi 60 dtk; tabel belum ada (migrasi 0021) = 503 */
export async function layaniGunungapi(req, env, ctx, url) {
  if (url.pathname.replace(/\/+$/, "") !== "/api/gunungapi/terbaru") return null;
  if (req.method !== "GET" && req.method !== "HEAD") return gagal(405, "hanya GET dan HEAD", {allow: "GET, HEAD"});
  const r = await cacheTepi(new Request(url.origin + "/api/gunungapi/terbaru"), ctx, 60, async () => {
    try { return await terbaru(env); } catch (e) { console.error("gunungapi api", e?.message); return gagal(503, "data gunung api belum siap"); }
  });
  return req.method === "HEAD" ? new Response(null, {status: r.status, headers: r.headers}) : r;
}
