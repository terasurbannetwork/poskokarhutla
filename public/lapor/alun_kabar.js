/* Kabar Alun-alun (data/kajian-bnpb/kabar-alun, KA-05): fungsi murni tanpa DOM. gabung() menempelkan klaster laporan warga ke kejadian resmi
   (ALGORITMA 4); saring() memilih yang tampil; teksKartu() menyusun isi empat pita. Angka antarsumber tidak pernah dijumlah (D3). */

export const JENIS_LABEL = {banjir: "Banjir", longsor: "Tanah longsor", cuaca: "Cuaca ekstrem", gempa: "Gempa bumi", karhutla: "Karhutla", erupsi: "Erupsi", abrasi: "Abrasi",
  kekeringan: "Kekeringan", kebakaran_gedung: "Kebakaran gedung", lainnya: "Kejadian lain"};
const STATUS_LABEL = {berjalan: "Berjalan", belum: "Belum", selesai: "Selesai", tanpa: "Belum ada laporan resmi"};
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const JAM48 = 48 * 3600e3;

const norm = s => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const hariMs = iso => Date.parse(`${iso}T00:00:00Z`);
const tglIso = ms => new Date(ms).toISOString().slice(0, 10);
export const tglPendek = iso => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || ""); return m ? `${+m[3]} ${BLN[+m[2] - 1]} ${m[1]}` : ""; };
// jam dinding WIB dari stempel ber-offset (cut-off ditulis apa adanya, jam tidak diketik tangan: D12)
export function jamWib(iso) {
  const t = Date.parse(iso); if (Number.isNaN(t)) return "";
  const d = new Date(t + 7 * 3600e3), p = n => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${BLN[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}.${p(d.getUTCMinutes())} WIB`;
}
const angkaID = n => Number(n).toLocaleString("id-ID");

/* kabar: isi kabar.json atau null; barisAlun: baris /api/lapor/alun; sekarang tidak dipakai di sini (kesegaran dihitung teksKartu). */
export function gabung(kabar, barisAlun = [], sekarang = Date.now()) {
  const kej = kabar?.kejadian || [], hari = kabar?.hari || null;
  const item = kej.map(k => ({id: k.id, jenis: k.jenis, jenisLabel: JENIS_LABEL[k.jenis] || "Kejadian", kab: k.kab, prov: k.prov, kabKode: k.kab_kode, titik: k.titik || null,
    titikKet: k.titik ? null : (k.titik_ket || "lokasi belum terpetakan"), status: k.status in STATUS_LABEL ? k.status : "tanpa", statusLabel: STATUS_LABEL[k.status] || k.status,
    lama: !!k.selesai_lama, resmi: k, warga: [], berita: k.berita || [], nBerita: k.n_berita ?? (k.berita || []).length, catatan: k.catatan || null, medsos: k.medsos || {status: "belum_tersambung"}}));
  const sisa = [];
  for (const g of barisAlun) {
    const kode = norm(`${g.lokasi?.provKode ?? ""}|${g.lokasi?.kab ?? ""}`), tgl = /^(\d{4}-\d\d-\d\d)/.exec(g.waktu || "")?.[1];
    let pilih = null;
    if (tgl && hari) {
      const t = hariMs(tgl);
      for (const it of item) {
        if (it.jenis !== g.jenisId || !it.kabKode || norm(it.kabKode) !== kode) continue;
        const mulai = hariMs(it.resmi.mulai);
        if (t < mulai - 864e5 || t > hariMs(hari)) continue;
        if (!pilih || Math.abs(t - mulai) < Math.abs(t - hariMs(pilih.resmi.mulai)) || (Math.abs(t - mulai) === Math.abs(t - hariMs(pilih.resmi.mulai)) && mulai > hariMs(pilih.resmi.mulai))) pilih = it;
      }
    }
    if (pilih) pilih.warga.push(g); else sisa.push(g);
  }
  item.sort((a, b) => (b.resmi.lap_terakhir || "").localeCompare(a.resmi.lap_terakhir || "") || (b.resmi.mulai || "").localeCompare(a.resmi.mulai || ""));
  for (const g of sisa.sort((a, b) => (b.ms || 0) - (a.ms || 0))) item.push({id: `warga|${g.id}`, jenis: g.jenisId, jenisLabel: JENIS_LABEL[g.jenisId] || g.jenis || "Kejadian", kab: g.lokasi?.kab || "",
    prov: g.lokasi?.provKode || "", kabKode: null, titik: g.titik || null, titikKet: g.titik ? null : "lokasi belum terpetakan", status: "tanpa", statusLabel: STATUS_LABEL.tanpa,
    lama: false, resmi: null, warga: [g], berita: [], nBerita: 0, catatan: null, medsos: {status: "belum_tersambung"}});
  for (const it of item) it.selesai = it.status === "selesai" || (!it.resmi && it.warga.some(w => w.status === "selesai"));
  return item;
}

/* selesai: saringan status Selesai (memuat juga selesai_lama); bawaan menyembunyikan selesai_lama (N12). medsos belum punya data: saringannya kosong. */
export function saring(item, {jenis = "", sumber = "", selesai = false} = {}) {
  const ada = {resmi: x => !!x.resmi, warga: x => x.warga.length > 0, berita: x => x.berita.length > 0, medsos: () => false};
  return item.filter(x => (selesai ? x.selesai : !x.lama) && (!jenis || x.jenis === jenis) && (!sumber || ada[sumber]?.(x)));
}

const urlOk = u => /^https?:\/\//i.test(u || "") ? u : null;
const gambarOk = g => /^\/data\/alun\/thumb\/[0-9a-f]{8,64}\.(?:webp|jpe?g|png)$/.test(g || "") ? g : null;   // thumbnail berita hanya dari folder kita (K6), bukan hotlink media
const logoOk = g => /^\/data\/alun\/logo\/[0-9a-f]{8,64}\.(?:webp|jpe?g|png)$/.test(g || "") ? g : null;   // logo media, juga dari folder kita
const DAMPAK_WARGA = [["meninggal", "meninggal"], ["hilang", "hilang"], ["luka", "luka"], ["mengungsi", "mengungsi"], ["rumah", "rumah rusak"], ["terendam", "rumah terendam"]];

export function teksKartu(x, sekarang = Date.now()) {
  const judul = [x.jenisLabel, x.kab].filter(Boolean).join(", ");
  let resmi = {ada: false, kosong: "Belum ada laporan resmi"};
  if (x.resmi) {
    const k = x.resmi, a = k.angka || {}, usang = Number.isFinite(Date.parse(k.cutoff_terakhir)) && sekarang - Date.parse(k.cutoff_terakhir) > JAM48;
    resmi = {ada: true, status: x.statusLabel, baru: !!k.baru, usang,
      angka: [["kk", "KK terdampak"], ["mengungsi", "mengungsi"], ["rumah_dampak", "rumah terdampak"]].map(([c, label]) => ({label, nilai: a[c] == null ? null : angkaID(a[c]), teks: a[c] == null ? "belum ada data" : angkaID(a[c])})),
      kesegaran: usang ? `Laporan resmi terakhir ${tglPendek(k.lap_terakhir)}` : `Laporan harian BNPB, cut-off ${jamWib(k.cutoff_terakhir)}`};
  }
  const warga = {baris: x.warga.map(g => {
    const angka = DAMPAK_WARGA.filter(([c]) => g.dampak?.[c] > 0).map(([c, label]) => ({label, teks: angkaID(g.dampak[c])}));
    return {id: g.id, status: g.status, statusLabel: g.statusLabel, waktu: g.waktu || "waktu belum didata", tempat: [g.lokasi?.desa && `Desa ${g.lokasi.desa}`, g.lokasi?.kec && `Kec. ${g.lokasi.kec}`].filter(Boolean).join(", "),
      nWarga: g.nWarga > 0 ? `${angkaID(g.nWarga)} warga melapor` : null, angka, kosongAngka: angka.length ? null : "Belum ada angka dampak"};
  }), kosong: "Belum ada laporan warga"};
  const berita = {baris: x.berita.slice(0, 5).map(b => ({judul: b.judul, media: b.media, tgl: tglPendek(b.tgl), url: urlOk(b.url), gambar: gambarOk(b.gambar), logo: logoOk(b.logo)})),
    lebih: Math.max(0, (x.nBerita || 0) - Math.min(5, x.berita.length)), kosong: x.catatan === "berita tidak terjangkau" ? "Berita belum bisa dimuat" : "Belum ada berita yang cocok"};
  const medsos = {teks: "Belum tersambung", ket: "Pantauan media sosial belum dihubungkan, jadi belum ada unggahan atau jumlah yang ditampilkan."};
  return {judul, resmi, warga, berita, medsos};
}
