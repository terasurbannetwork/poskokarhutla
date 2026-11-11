/* Siklus Bencana F7: registri sumber data (DS 3.1, PD, KO, PM, SA). Rute: /api/siklus/registri (siklus/saji/registri.json di R2: id, status_uji, diambil, byte, lisensi)
   digabung dengan /siklus/data/atribusi.json (nama, atribusi, dipakai di). Sumber yang belum pernah diambil tampil "menunggu", bukan nol byte. Lisensi dan atribusi lengkap ada di title. */
import {h, ik, api, kartu, hl, kead, kead_dari, kosongkan, pil, tip, angka, tgl} from "./inti.js";

const STATUS = {hidup: ["Hidup", "centang", "Lolos uji, berjalan terjadwal"], bersyarat: ["Bersyarat", "timbangan", "Dipakai dengan syarat lisensi atau akses"], gagal: ["Gagal", "silang", "Gagal uji, tidak diambil"]};
export const ukuran = n => typeof n !== "number" || !Number.isFinite(n) || n < 0 ? null : n >= 1048576 ? `${angka(Math.round(n / 104857.6) / 10)} MB` : n >= 1024 ? `${angka(Math.round(n / 102.4) / 10)} KB` : `${angka(n)} byte`;
/* gabung registri R2 dengan atribusi publik; urut: yang belum diambil di bawah */
export function gabung(reg, atr) {
  const peta = new Map((atr?.sumber ?? []).map(x => [x.id, x]));
  return (reg?.sumber ?? []).map(r => ({...r, nama: peta.get(r.id)?.nama ?? r.id, atribusi: peta.get(r.id)?.atribusi ?? null, dipakai_di: peta.get(r.id)?.dipakai_di ?? []}))
    .sort((a, b) => (a.diambil == null) - (b.diambil == null) || String(a.nama).localeCompare(String(b.nama)));
}

export async function buka(isi, sk) {
  sk.periode = () => null;
  const hasil = h("div", {}), kart = kartu({ey: [ik("tiga", 12), "Registri sumber"], judul: ["Registri sumber ", hl("menunggu"), " data"], isi: hasil, id: "registri"}), judul = kart.querySelector("h3");
  async function muat() {
    kosongkan(hasil).append(kead("memuat"));
    const [r, a] = await Promise.all([api("/api/siklus/registri"), api("/siklus/data/atribusi.json")]);
    if (!r.ok) return kosongkan(hasil).append(kead_dari(r, muat, "Registri sumber belum dibangun"));
    const baris = gabung(r.j, a.ok ? a.j : null), ambil = baris.filter(x => x.diambil != null);
    judul.replaceChildren(...(baris.length ? [hl(angka(ambil.length)), " dari ", hl(angka(baris.length)), " sumber sudah pernah diambil"] : ["Registri sumber ", hl("kosong")]));
    if (!baris.length) return kosongkan(hasil).append(kead("kosong", {teks: "Belum ada sumber di registri"}));
    const t = h("tbody", {});
    for (const x of baris) {
      const s = STATUS[x.status_uji] ?? [String(x.status_uji ?? "tidak tertulis"), "tanya", ""];
      t.append(h("tr", {"data-tip": tip(x.nama, ["Lisensi", x.lisensi ?? "belum tertulis"], ["Atribusi", x.atribusi ?? "belum tertulis"], ["Dipakai di", x.dipakai_di.join(", ") || "belum tertulis"])},
        h("td", {}, x.nama), h("td", {class: "t"}, h("span", {class: "sk-fase", "data-f": x.status_uji, title: s[2]}, ik(s[1], 14), s[0])),
        h("td", {class: "t"}, x.diambil ? [tgl(x.diambil) ?? x.diambil] : [h("span", {}, "belum pernah diambil"), " ", pil("menunggu")]),
        h("td", {class: "num"}, ukuran(x.byte) ?? "menunggu"), h("td", {}, x.dipakai_di.join(", ") || "belum tertulis")));
    }
    const th = (a, d) => h("th", {title: d}, a);
    kosongkan(hasil).append(h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Sumber", "Nama sumber data publik"), th("Status uji", "Hasil uji sumber: hidup, bersyarat, atau gagal"), th("Terakhir diambil", "Tanggal berkas terbaru di gudang mentah"),
      th("Ukuran", "Jumlah byte semua berkas sumber ini di gudang mentah"), th("Dipakai di", "Fitur Siklus yang memakai sumber ini"))), t)));
  }
  isi.replaceChildren(kart); muat();
}
