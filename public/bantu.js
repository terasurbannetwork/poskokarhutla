/* Halaman organisasi /bantu (TW-09): kontrak data/kajian-bnpb/tiga-w/. Token dari fragmen #t=, dihapus dari URL, hanya di memori
   (tidak disimpan di penyimpanan peramban). Teks tampil lewat textContent; tanpa inline dan tanpa atribut peristiwa (CSP). Hanya daring: antrean luring (inti/antre.js) belum dipasang. */
import {KLASTER_PB} from "./inti/klaster.js";

const RE_TOKEN = /^[A-Za-z0-9_-]{43}$/;
export const ambilToken = h => { const t = /^#t=([^&]*)/.exec(String(h))?.[1] || ""; return RE_TOKEN.test(t) ? t : null; };
export const labelBarang = b => { const s = String(b).replace(/_/g, " "); return s[0].toUpperCase() + s.slice(1); };
export const tglDariMs = ms => ms == null ? "" : new Date(ms + 7 * 36e5).toISOString().slice(0, 10);   // WIB, sama dengan tglMs di server
export const STATUS_BARIS = [["rencana", "Rencana"], ["berjalan", "Berjalan"], ["selesai", "Selesai"]];
export const PIL = {masuk: ["Masuk", ""], dicocokkan: ["Dicocokkan", "kuning"], diterima: ["Diterima", "hijau"], dialihkan: ["Dialihkan", "kuning"], ditolak: ["Ditolak", "merah"]};
/* periksa form tawaran sebelum kirim; server tetap yang memutuskan. Mengembalikan {galat} atau {badan} */
export function siapkanTawaran(f, jenis) {
  const jumlah = Number(f.jumlah);
  if (!f.barang) return {galat: "Pilih barang."};
  if (f.barang === "lainnya" && (f.barang_lain || "").trim().length < 2) return {galat: "Sebutkan nama barangnya."};
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 1e8) return {galat: "Jumlah harus bilangan bulat 1 sampai 100.000.000."};
  if (!(f.satuan || "").trim()) return {galat: "Isi satuan."};
  if (jenis === "ngo_internasional" && (f.mitra_lokal || "").trim().length < 2) return {galat: "Organisasi internasional wajib menyebut mitra lokal."};
  const b = {barang: f.barang, jumlah, satuan: f.satuan.trim()};
  for (const k of ["barang_lain", "syarat", "mitra_lokal"]) if ((f[k] || "").trim()) b[k] = f[k].trim();
  return {badan: b};
}

/* ikon tipis per klaster (jalur SVG 24x24) */
const IKON = {kesehatan: "M12 5v14M5 12h14", sar: "M4 20 12 4l8 16M8 14h8", logistik: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10", pengungsian: "M3 20 12 5l9 15zM10 20v-5h4v5",
  pendidikan: "M3 9l9-4 9 4-9 4zM7 11v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5", sarpras: "M3 20h18M5 20V9h6v11M13 20V5h6v15", ekonomi: "M12 3v18M16 7.5C16 6 14.5 5 12 5S8 6 8 8s2 2.6 4 3 4 1 4 3-1.5 3-4 3-4-1.2-4-2.5", pemulihan: "M4 12a8 8 0 0 1 14-5l2-2v6h-6l2.4-2.4A5.5 5.5 0 0 0 6.5 12"};
const NS = "http://www.w3.org/2000/svg";

function h(tag, atr, ...anak) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(atr || {})) if (v === true) e.setAttribute(k, ""); else if (v !== false && v != null) e.setAttribute(k, v);
  e.append(...anak.flat().filter(x => x != null && x !== false));
  return e;
}
function ikon(kunci) { const s = document.createElementNS(NS, "svg"), p = document.createElementNS(NS, "path"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); p.setAttribute("d", IKON[kunci] || "M5 12h14"); s.append(p); return s; }
const kartu = (kategori, judul, ...isi) => h("section", {class: "ex ex-std"}, h("header", {class: "ex-hd"}, h("span", {class: "ex-ey"}, kategori), h("div", {class: "ex-jd"}, h("h3", null, judul))), h("div", {class: "ex-bd"}, ...isi));
const pilihan = (nama, judul, opsi, awal) => h("fieldset", {class: "bt-pilih"}, h("legend", null, judul), opsi.map(([k, teks, ik], i) => h("label", null, h("input", {type: "radio", name: nama, value: k, required: true, checked: k === awal || (!awal && i === 0 && false)}), ik ? ikon(ik) : null, teks)));
const isian = (judul, el) => h("label", {class: "bn-isian"}, judul, el);
const NAMA_KLASTER = Object.fromEntries(KLASTER_PB.map(k => [k.kunci, k.nama]));

function mulai() {
  const akar = document.getElementById("bt"), pesan = document.getElementById("btPesan");
  const token = ambilToken(location.hash);
  history.replaceState(null, "", location.pathname + location.search);   // token tidak tertinggal di bilah alamat dan riwayat
  const kosong = teks => { pesan.textContent = teks; akar.replaceChildren(pesan); };
  if (!token) return kosong("Buka tautan lengkap dari koordinator, termasuk bagian setelah tanda #.");

  const api = async (metode, jalur, badan) => {
    let r; try { r = await fetch(jalur, {method: metode, headers: {"x-bantu": token, ...(badan ? {"content-type": "application/json"} : {})}, body: badan ? JSON.stringify(badan) : undefined, cache: "no-store", referrerPolicy: "no-referrer"}); }
    catch (e) { return {s: 0, j: {galat: "Tidak ada sambungan. Coba lagi."}}; }
    return {s: r.status, j: await r.json().catch(() => ({}))};
  };
  const muat = async () => {
    const {s, j} = await api("GET", "/api/bantu");
    if (s !== 200) return kosong(s === 401 ? "Tautan ini tidak berlaku lagi. Minta tautan baru ke koordinator." : s === 429 ? "Terlalu banyak percobaan. Coba lagi nanti." : (j.galat || "Gagal memuat. Muat ulang halaman."));
    gambar(j);
  };
  /* kirim, lalu muat ulang bila sukses; kabar kegagalan di <p> kartunya */
  const kirim = async (p, jalur, badan) => {
    p.className = "bn-pesan"; p.textContent = "Menyimpan...";
    const {s, j} = await api("POST", jalur, badan);
    if (s === 200 || s === 201) return muat();
    p.className = "bn-pesan galat"; p.textContent = s === 401 ? "Tautan tidak berlaku lagi." : j.galat || "Gagal menyimpan.";
  };

  function gambar(d) {
    const kab = d.kab.map(k => [k.kab4, k.nama]), klaster = d.klaster.map(k => [k, NAMA_KLASTER[k] || k, k]);
    const baris = d.baris.map(b => {
      const sel = h("select", {"aria-label": "Status " + b.kegiatan}, STATUS_BARIS.map(([k, t]) => h("option", {value: k, selected: k === b.status}, t)));
      const p = h("p", {class: "bn-pesan", role: "status"});
      sel.addEventListener("change", () => kirim(p, "/api/bantu/baris", {id: b.id, klaster: b.klaster, kegiatan: b.kegiatan, status: sel.value, selesai: tglDariMs(b.selesai) || null}));
      return h("li", {class: "bt-butir"}, h("b", null, b.kegiatan), h("span", {class: "bt-sub"}, `${b.kab || b.kab4}, ${NAMA_KLASTER[b.klaster] || b.klaster}`), sel, p);
    });
    const fb = h("form", {class: "bt-form", novalidate: true},
      isian("Kabupaten atau kota", h("select", {name: "kab4", required: true}, h("option", {value: ""}, "Pilih kabupaten atau kota"), kab.map(([k, n]) => h("option", {value: k}, n)))),
      pilihan("klaster", "Klaster", klaster), pilihan("status", "Status", STATUS_BARIS, "berjalan"),
      isian("Kegiatan", h("input", {name: "kegiatan", type: "text", maxlength: "200", minlength: "5", required: true, autocomplete: "off"})),
      isian("Mulai", h("input", {name: "mulai", type: "date"})),
      h("button", {class: "bn-tombol", type: "submit"}, "Tambah kegiatan"), h("p", {class: "bn-pesan", role: "status"}));
    fb.addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(fb), p = fb.querySelector(".bn-pesan");
      if (!f.get("kab4") || String(f.get("kegiatan")).trim().length < 5) { p.className = "bn-pesan galat"; p.textContent = "Pilih kabupaten atau kota dan isi kegiatan (minimal 5 huruf)."; return; }
      kirim(p, "/api/bantu/baris", {kab4: f.get("kab4"), klaster: f.get("klaster"), status: f.get("status"), kegiatan: String(f.get("kegiatan")).trim(), mulai: f.get("mulai") || null});
    });

    const jenis = d.org.jenis, ft = h("form", {class: "bt-form", novalidate: true},
      isian("Barang", h("select", {name: "barang", required: true}, h("option", {value: ""}, "Pilih barang"), d.barang.map(b => h("option", {value: b}, labelBarang(b))))),
      isian("Nama barang lain, bila memilih lainnya", h("input", {name: "barang_lain", type: "text", maxlength: "80", autocomplete: "off"})),
      isian("Jumlah", h("input", {name: "jumlah", type: "number", inputmode: "numeric", min: "1", max: "100000000", step: "1", required: true})),
      isian("Satuan", h("input", {name: "satuan", type: "text", maxlength: "20", placeholder: "paket, dus, unit", required: true})),
      isian("Syarat, bila ada", h("textarea", {name: "syarat", maxlength: "300", rows: "3"})),
      isian(jenis === "ngo_internasional" ? "Mitra lokal (wajib)" : "Mitra lokal, bila ada", h("input", {name: "mitra_lokal", type: "text", maxlength: "120", autocomplete: "off", required: jenis === "ngo_internasional"})),
      h("button", {class: "bn-tombol", type: "submit"}, "Ajukan tawaran"), h("p", {class: "bn-pesan", role: "status"}));
    ft.addEventListener("submit", e => {
      e.preventDefault();
      const p = ft.querySelector(".bn-pesan"), r = siapkanTawaran(Object.fromEntries(new FormData(ft)), jenis);
      if (r.galat) { p.className = "bn-pesan galat"; p.textContent = r.galat; return; }
      kirim(p, "/api/bantu/tawaran", r.badan);
    });

    const tawaran = d.tawaran.map(t => { const [nm, wr] = PIL[t.status] || [t.status, ""];
      return h("li", {class: "bt-butir"}, h("b", null, `${t.barang === "lainnya" ? t.barang_lain || "Lainnya" : labelBarang(t.barang)}, ${t.jumlah} ${t.satuan}`), h("span", {class: "bt-pil " + wr}, nm), t.alasan_organisasi ? h("span", {class: "bt-sub"}, t.alasan_organisasi) : null); });
    akar.replaceChildren(
      h("p", {class: "bt-org"}, d.org.nama + (d.org.singkatan ? ` (${d.org.singkatan})` : "")),
      kartu("3W", "Kegiatan kami", baris.length ? h("ul", {class: "bt-daftar"}, baris) : h("p", {class: "bt-kosong"}, "Belum ada kegiatan tercatat.")),
      kartu("3W", "Tambah kegiatan", d.kab.length ? fb : h("p", {class: "bt-kosong"}, "Belum ada kabupaten atau kota kejadian yang bisa dipilih. Hubungi koordinator.")),
      kartu("Tawaran", "Tawaran bantuan kami", tawaran.length ? h("ul", {class: "bt-daftar"}, tawaran) : h("p", {class: "bt-kosong"}, "Belum ada tawaran.")),
      kartu("Tawaran", "Ajukan tawaran", ft));
  }
  muat();
}
if (typeof document !== "undefined") mulai();
