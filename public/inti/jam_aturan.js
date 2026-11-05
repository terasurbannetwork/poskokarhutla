/* MB-2 Jam Aturan: fungsi murni atas jam_aturan.json (ALGORITMA §3, DT §4.2).
   Angka tenggat dan ambang hanya hidup di JSON itu; skrip dan layar membaca lewat kunci.
   Tafsir kita (bukan pasal): "N bulan" = tanggal sama N bulan kemudian, dipangkas ke hari terakhir bulan;
   "N tahun" = 12 x N bulan; "x 24 jam" dari cap waktu; tanggal diturunkan di WIB (UTC+7). */

/* Node dan Worker mengimpor JSON; peramban mengambilnya (top-level await). */
export const ATURAN = typeof document === "undefined"
  ? (await import("./jam_aturan.json", { with: { type: "json" } })).default
  : await (await fetch(new URL("./jam_aturan.json", import.meta.url))).json();

export const SATUAN = ["jam", "hari", "hari_kerja", "hari_kalender", "bulan", "tahun", "tanggal_bulan_berikut",
  "kg_orang_hari", "l_orang_hari", "m2_orang", "orang_per_unit", "kk_per_unit_per_3hari", "kg_orang_bulan", "persen", "jiwa_per_paket", "jp_per_tahun"];

/* Berkas rusak ditolak saat dimuat, bukan saat dipakai. */
export function periksa(daftar) {
  const ada = new Set();
  for (const e of daftar) {
    if (ada.has(e.kunci)) throw new Error(`Jam Aturan: kunci kembar ${e.kunci}`);
    ada.add(e.kunci);
    if (!SATUAN.includes(e.satuan)) throw new Error(`Jam Aturan: satuan "${e.satuan}" di kunci ${e.kunci} tidak sah`);
    if (e.asumsi && !e.catatan) throw new Error(`Jam Aturan: kunci ${e.kunci} asumsi tanpa catatan`);
    if (!e.asumsi && !(e.acuan && e.kutipan)) throw new Error(`Jam Aturan: kunci ${e.kunci} bukan asumsi tapi tanpa acuan/kutipan`);
  }
  return daftar;
}
periksa(ATURAN);

export function aturan(kunci) {
  const e = ATURAN.find((x) => x.kunci === kunci);
  if (!e) throw new Error(`Jam Aturan: kunci tidak dikenal ${kunci}`);
  return e;
}
export const nilai = (kunci) => aturan(kunci).nilai;

const WIB = 7 * 3600e3;
const hariDalamBulan = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m 1..12
const iso = (y, m, d) => `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function tanggalSah(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= hariDalamBulan(y, mo) ? [y, mo, d] : null;
}
const CAP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const capMs = (s) => (typeof s === "string" && CAP.test(s) ? Date.parse(s) : NaN);

/* tanggal WIB [y,m,d] dari tanggal ISO atau cap waktu bersel zona */
function tanggalWib(mulai) {
  if (typeof mulai !== "string") return null;
  const t = tanggalSah(mulai);
  if (t) return t;
  const ms = capMs(mulai);
  if (Number.isNaN(ms)) return null;
  const w = new Date(ms + WIB);
  return [w.getUTCFullYear(), w.getUTCMonth() + 1, w.getUTCDate()];
}

function tambahBulan([y, m, d], n) {
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  return iso(ny, nm, Math.min(d, hariDalamBulan(ny, nm)));
}

const tidak = (alasan) => ({ hasil: null, alasan, asumsi: false });

/* tenggat(kunci, mulai) -> {hasil, alasan, asumsi}
   jam: mulai = cap waktu bersel zona; hasil cap waktu +07:00. Satuan lain: tanggal atau cap waktu; hasil tanggal ISO (WIB).
   Tanggal kosong atau tidak sah memberi hasil null dan alasan, bukan 1970. */
export function tenggat(kunci, mulai) {
  const e = ATURAN.find((x) => x.kunci === kunci);
  if (!e) return tidak(`kunci tidak dikenal: ${kunci}`);
  const ok = (hasil) => ({ hasil, alasan: null, asumsi: !!e.asumsi });
  if (mulai == null || mulai === "") return tidak("tanggal mulai kosong");
  if (e.satuan === "jam") {
    const ms = capMs(mulai);
    if (Number.isNaN(ms)) return tidak("jam butuh cap waktu bersel zona (mis. 2026-11-05T08:00:00+07:00)");
    const w = new Date(ms + e.nilai * 3600e3 + WIB).toISOString(); // jam dinding WIB
    return ok(w.slice(0, 19) + "+07:00");
  }
  const t = tanggalWib(mulai);
  if (!t) return tidak("tanggal mulai tidak sah");
  switch (e.satuan) {
    case "bulan": return ok(tambahBulan(t, e.nilai));
    case "tahun": return ok(tambahBulan(t, 12 * e.nilai));
    case "tanggal_bulan_berikut": { // tanggal ke-nilai bulan sesudah bulan mulai
      const [y, m] = tambahBulan([t[0], t[1], 1], 1).split("-").map(Number);
      return ok(iso(y, m, Math.min(e.nilai, hariDalamBulan(y, m))));
    }
    default: return tidak(`satuan ${e.satuan} belum didukung tenggat() (RU-015)`);
  }
}
