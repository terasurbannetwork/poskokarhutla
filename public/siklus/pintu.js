/* Siklus Bencana F7: pintu /siklus (DS 3.1). Rute: /api/siklus/pintu (peran, kartu menurut prioritas, peringatan PDNA) dan /api/siklus/kejadian (kartu wilayah).
   Empat fase dipilih lewat segmen; kartu ke layar yang belum hidup sudah dibuang server. Kartu wilayah membuka ProfilWilayah.buka(kab4) dari /inti/profil_wilayah.js bila termuat, bila tidak kartunya tidak dibuat. */
import {h, ik, api, kartu, hl, wadah, kead, kead_dari, kosongkan, seg, tombol, pil, tip, namaJenis, wilayah, angka, tgl, tglWib, geser} from "./inti.js";

const G = globalThis;
export const FASE_PINTU = [["sebelum", "Sebelum", "peta"], ["siaga", "Siaga", "jampasir"], ["tanggap", "Tanggap", "sirene"], ["pulih", "Pulih", "palu"]];
const PERAN = {WG: "Tamu", BP: "Akun instansi", PD: "Pusdalops", KO: "Koordalops", PM: "Pimpinan", SA: "Super Admin", STAF: "Staf"};
const TUTUP = ["selesai", "dibatalkan", "digabung"];
/* kartu dari server -> fase pintu (DS 3.1: Sebelum paparan dan masa depan, Siaga renkon dan gladi, Tanggap kejadian dan kaji, Pulih pulih) */
export function fasePintu(k) {
  if (k.kode === "pemulihan" || k.layar === "pulih") return "pulih";
  if (k.layar === "renkon" || k.layar === "gladi") return "siaga";
  if (k.layar === "kejadian" || k.layar === "kaji" || k.layar === "publik") return "tanggap";
  return "sebelum";
}
export const faseAwal = kartu => kartu.some(k => k.kode === "kejadian" || k.kode === "pdna" || k.kode === "kejadian_publik") ? "tanggap" : "sebelum";
export const profilTermuat = () => typeof ProfilWilayah !== "undefined" && typeof ProfilWilayah.buka === "function";
export function hitungStrip(d) {
  const K = d.kartu ?? [], n = c => K.filter(c).length;
  return {aktif: n(k => k.kode === "kejadian" || k.kode === "pemulihan"), tanggap: n(k => k.kode === "kejadian"), pdna: (d.peringatan ?? []).length, pemulihan: n(k => k.kode === "pemulihan" || k.kode === "r3p"), kedaluwarsa: n(k => k.kode === "renkon" && /^Renkon kedaluwarsa/.test(k.nama))};
}

export async function buka(isi, sk) {
  sk.periode = () => null;
  const hasil = h("div", {}), ctl = h("div", {class: "sk-ctl"}), S = {fase: null, d: null, kej: []};
  const kart = kartu({ey: [ik("semua", 12), "Siklus"], judul: ["Siklus bencana ", hl("menunggu"), " data"], isi: [ctl, hasil], id: "pintu"}), judul = kart.querySelector("h3"), ey = kart.querySelector(".ex-ey");
  const kejKart = h("div", {}), ingat = h("div", {});

  function gambar() {
    const d = S.d, K = (d.kartu ?? []).filter(k => fasePintu(k) === S.fase), st = hitungStrip(d);
    judul.replaceChildren(hl(angka(st.aktif)), " kejadian aktif, ", hl(angka(st.tanggap)), " sedang tanggap, ", hl(angka(st.pdna)), " menunggu PDNA");
    ey.replaceChildren(ik("semua", 12), "Siklus", " ", h("span", {class: "sk-contoh", title: "Peran yang terbaca dari sesi kamu"}, PERAN[d.peran] ?? d.peran));
    const t = h("div", {class: "sk-pintu"});
    for (const k of K) t.append(h("a", {href: k.href, "data-kode": k.kode, "data-tip": tip(k.nama, ["Layar", k.layar])}, h("span", {}, k.nama),
      k.hari_ke != null ? h("small", {}, `Hari ke ${angka(k.hari_ke)}`) : null, k.yakin ? pil(k.yakin) : null));
    kosongkan(hasil).append(wadah("Tujuan fase ini", K.length ? t : kead("kosong", {teks: "Belum ada layar yang hidup untuk fase ini pada peranmu"})));
  }
  function kartuKejadian() {
    const aktif = S.kej.filter(k => !TUTUP.includes(k.fase)).slice(0, 8), t = h("tbody", {});
    for (const k of aktif) t.append(h("tr", {}, h("td", {}, h("a", {href: `/siklus/kejadian/${k.id}`}, k.id)), h("td", {}, namaJenis(k.jenis)), h("td", {}, wilayah(k.kab4) ?? "wilayah belum terpetakan"),
      h("td", {class: "t"}, k.kab4 && profilTermuat() ? tombol("Profil", "biasa", () => G.nanti(() => ProfilWilayah.buka(k.kab4)), "peta", `Profil wilayah ${wilayah(k.kab4)}`) : null)));
    kosongkan(kejKart).append(kartu({ey: [ik("sirene", 12), "Kejadian aktif"], judul: aktif.length ? [hl(angka(aktif.length)), " kejadian aktif terbaru"] : ["Tidak ada ", hl("kejadian aktif")],
      kanan: tombol("Buka semua", "biasa", () => { location.href = "/siklus/kejadian"; }, "panah"),
      isi: aktif.length ? h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, h("th", {title: "Nomor kejadian Buku Besar"}, "KJ"), h("th", {title: "Jenis bencana"}, "Jenis"), h("th", {title: "Kabupaten atau kota"}, "Wilayah"), h("th", {title: "Buka profil wilayah dari kepala situs bersama"}, "Profil"))), t))
        : kead("kosong", {teks: "Tidak ada kejadian aktif", aksi: {label: "Buka kejadian arsip", fn: () => { location.href = "/siklus/kejadian"; }}})}));
  }
  function kartuIngat() {
    const baris = [];
    for (const p of S.d.peringatan ?? []) baris.push(h("li", {}, h("a", {href: `/siklus/kejadian/${p.kejadian_id}`}, "Batas PDNA "), tgl(p.batas_pdna) ?? "tanggal belum tertulis", `, darurat berakhir ${tgl(p.akhir_darurat) ?? "belum tertulis"}, sisa ${angka(p.sisa_hari)} hari `, pil("asumsi-kebijakan")));
    for (const k of (S.d.kartu ?? []).filter(x => x.kode === "renkon" && x.urgensi != null)) baris.push(h("li", {}, h("a", {href: k.href}, k.nama), " ", h("span", {class: "sk-sisa", "data-s": k.status ?? ""}, k.urgensi < 0 ? `lewat ${angka(-k.urgensi)} hari` : `sisa ${angka(k.urgensi)} hari`)));
    kosongkan(ingat).append(kartu({ey: [ik("sirene", 12), "Pengingat"], judul: baris.length ? [hl(angka(baris.length)), " pengingat menunggu tindakan"] : ["Tidak ada ", hl("pengingat"), " saat ini"],
      isi: baris.length ? h("ul", {class: "sk-garis"}, baris) : kead("kosong", {teks: "Tidak ada batas PDNA atau renkon yang mendekati batas"})}));
  }
  async function muat() {
    kosongkan(hasil).append(kead("memuat"));
    const r = await api("/api/siklus/pintu"); if (!r.ok) return kosongkan(hasil).append(kead_dari(r, muat));
    S.d = r.j ?? {}; S.fase ??= faseAwal(S.d.kartu ?? []);
    kosongkan(ctl).append(seg(FASE_PINTU, S.fase, v => { S.fase = v; gambar(); }, "Fase siklus"));
    gambar(); kartuIngat();
    if (S.d.peran !== "WG") {
      const sampai = tglWib(), k = await api("/api/siklus/kejadian?" + new URLSearchParams({dari: geser(sampai, -90), sampai, batas: 50}));
      S.kej = k.ok ? k.j?.baris ?? [] : []; kartuKejadian();
    }
  }
  isi.replaceChildren(kart, kejKart, ingat); muat();
}
