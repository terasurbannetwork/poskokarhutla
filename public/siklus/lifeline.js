/* Kartu "Status layanan" di halaman kejadian (LF-06; data/kajian-bnpb/lifeline/DESIGN-SYSTEM.md, ALUR A3 A4).
   Rute: GET /api/siklus/kejadian/:id/lifeline, GET .../lifeline/sel, POST .../lifeline (src/lifeline.js). 503 = migrasi belum diterapkan: catatan tenang, bukan galat.
   Klik sel membuka laci seketika; isyarat dan riwayat dimuat sesudahnya lewat nanti() (INP). Status resmi ditetapkan staf; usulan hanya saran. */
import {h, api, kartu, kead, kosongkan, tombol, toast, namaKab, namaProv, wib, angka, tgl, peran} from "./inti.js";

const G = globalThis;
export const LAYANAN = [["listrik", "Listrik"], ["sinyal", "Sinyal"], ["air", "Air"], ["jalan", "Jalan"], ["bbm", "BBM"], ["faskes", "Faskes"], ["pangan", "Pangan"], ["pengungsian", "Pengungsian"]];
/* warna server -> token tema dan huruf (huruf menjaga buta warna dan pembaca layar) */
export const WARNA = {hijau: ["ok", "B", "Baik"], kuning: ["warn", "T", "Terganggu"], merah: ["bad", "L", "Lumpuh"], abu: ["line", "?", "Belum diketahui"]};
const IKON = {
  listrik: "M13 2L4 14h7l-1 8 9-12h-7z", sinyal: "M2 8a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01", air: "M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z",
  jalan: "M8 3L5 21M16 3l3 18M12 4v3M12 11v3M12 18v3", bbm: "M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M4 21h12M15 9h2a2 2 0 0 1 2 2v6a1 1 0 0 0 2 0V9l-3-3M7 8h6", faskes: "M4 4h16v16H4zM12 8v8M8 12h8",
  pangan: "M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1-3 4-3 8h3", pengungsian: "M3 20L12 4l9 16zM10 20v-5h4v5", jam: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2", lampu: "M12 3a6 6 0 0 0-3 11v3h6v-3a6 6 0 0 0-3-11zM9 21h6",
};
function ikon(n, u = 14) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({viewBox: "0 0 24 24", width: u, height: u, fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true"})) s.setAttribute(k, v);
  for (const d of IKON[n].split(/(?=M)/)) { const p = document.createElementNS(s.namespaceURI, "path"); p.setAttribute("d", d); s.append(p); }
  return s;
}

/* ---------- model murni (diuji tanpa DOM) ---------- */
/* satu sel kisi -> {w: token, huruf, nama, basi, beda, label}; warna tak dikenal jatuh ke abu */
export function modelSel(s, kab = "", layanan = "") {
  const warna = WARNA[s?.warna] ? s.warna : "abu", [w, huruf, nama] = WARNA[warna], u = s?.usulan?.warna;
  const basi = s?.basi === true, beda = u != null && u !== warna;
  return {warna, w, huruf, nama, basi, beda, label: `${kab} ${layanan}: ${nama}${basi ? ", belum diperbarui lebih dari 24 jam" : ""}${beda ? `, usulan mesin ${WARNA[u]?.[2] ?? u}` : ""}`.trim()};
}
/* bukti terpilih -> badan POST; hanya kunci yang diminta server */
export const buktiDipilih = (isyarat, centang) => (isyarat ?? []).filter((_, i) => centang.has(i)).map(({sumber, kode, jumlah, waktu}) => ({sumber, kode, jumlah, waktu}));
const NAMA_SUMBER = {lapor_warga: "Lapor warga", logbook: "Logbook Pusdalops", meja_dampak: "Meja dampak", meja_pengungsi: "Meja pengungsi"};
export const teksIsyarat = b => `${NAMA_SUMBER[b.sumber] ?? b.sumber}, ${String(b.kode).replaceAll("_", " ").replaceAll(":", " ")}${b.jumlah != null ? `, ${angka(b.jumlah)}` : ""}${b.waktu != null ? `, ${wib(b.waktu) ?? ""}` : ""}${b.label ? ` (${b.label})` : ""}`;

/* konteks provinsi IODA (LF-08, D6): per provinsi, tidak pernah menjadi warna kab dan tidak pernah usulan. Sumber public/data/internet_padam.json (dibaca apa adanya); tanpa berkas atau provinsi tak tercantum = "tidak ada data". */
export function konteksIoda(d, provs) {
  return [...new Set(provs)].sort().map(p => {
    const e = d?.per_provinsi?.[p];
    if (!e) return {prov: p, ada: false};
    const ev = (d.peristiwa ?? []).filter(x => x.prov === p).map(x => x.tanggal).sort();
    return {prov: p, ada: true, peristiwa: e.peristiwa ?? null, jam: e.jam_total ?? null, terbaru: ev.length ? ev[ev.length - 1] : null, dari: d.dari ?? null, sampai: d.sampai ?? null};
  });
}
export const teksIoda = (k, nama) => !k.ada ? `${nama}: tidak ada data` : `${nama}: ${k.peristiwa == null ? "tidak ada data" : angka(k.peristiwa)} peristiwa penurunan sinyal internet${k.jam != null ? `, total ${angka(k.jam)} jam` : ""}, ${k.terbaru ? `terbaru ${tgl(k.terbaru) ?? k.terbaru}` : "belum ada peristiwa terbaru tercatat"}, periode ${tgl(k.dari) ?? "tidak ada data"} sampai ${tgl(k.sampai) ?? "tidak ada data"}`;
let iodaJanji = null;
const muatIoda = () => iodaJanji ||= fetch("/data/internet_padam.json").then(r => r.ok ? r.json() : null).catch(() => null);

/* ---------- tampilan ---------- */
const muatCss = () => { if (typeof document === "undefined" || document.querySelector('link[href="/siklus/lifeline.css"]')) return; document.head.append(h("link", {rel: "stylesheet", href: "/siklus/lifeline.css"})); };

function sel(m, kab4, l, buka) {
  const b = h("button", {type: "button", class: "lf-sel", "data-w": m.w, "aria-label": m.label, title: m.label}, h("span", {class: "lf-h"}, m.huruf), m.basi ? h("span", {class: "lf-jam", title: "Belum diperbarui lebih dari 24 jam"}, ikon("jam", 12)) : null,
    m.beda ? h("span", {class: "lf-beda", title: "Usulan mesin berbeda dari status resmi"}) : null);
  b.addEventListener("click", () => buka(kab4, l)); return b;
}
function tabel(g, buka) {
  const th = h("tr", {}, h("th", {}, "Kabupaten atau kota"), LAYANAN.map(([l, n]) => h("th", {title: n, class: "t"}, h("span", {class: "lf-kol"}, ikon(l), h("span", {}, n)))));
  return h("div", {class: "tw kecil ex-tabel"}, h("table", {class: "lf-tab"}, h("thead", {}, th), h("tbody", {}, g.kab.map(k => h("tr", {}, h("td", {}, namaKab(k.kab4)),
    LAYANAN.map(([l, n]) => h("td", {class: "t"}, sel(modelSel(k.layanan?.[l], namaKab(k.kab4), n), k.kab4, l, buka))))))));
}

export function kartuLifeline(id, P = {}) {
  muatCss();
  const isi = h("div", {}, kead("memuat")), dasar = `/api/siklus/kejadian/${id}/lifeline`;
  const k = kartu({ey: [ikon("lampu", 12), "Layanan"], id: "k-lifeline", judul: [ikon("listrik", 16), " Status layanan"], isi: [isi]});
  const bisaTulis = !!(P.pd || P.ko || P.sa);
  async function muat() {
    const r = await api(dasar);
    if (r.status === 503 || r.status === 404) return isi.replaceChildren(kead("kosong", {teks: r.status === 503 ? "Status layanan belum diaktifkan." : "Belum ada kabupaten atau kota terpasang pada kejadian ini."}));
    if (!r.ok) return isi.replaceChildren(r.status === 401 ? kead("sesi") : kead("galat", {teks: r.status === 403 ? (r.j?.galat || "Peran kamu belum berhak membuka bagian ini") : undefined, ulang: muat}));
    const g = r.j; if (!g?.kab?.length) return isi.replaceChildren(kead("kosong", {teks: "Belum ada kabupaten atau kota terpasang pada kejadian ini."}));
    const ioda = h("div", {class: "lf-ioda"}, h("h4", {}, "Konteks provinsi, padam internet IODA"), kead("memuat"));
    isi.replaceChildren(tabel(g, laci), h("p", {class: "lf-ket"}, "B baik, T terganggu, L lumpuh, ? belum diketahui. Titik kecil: usulan mesin berbeda dari status resmi."), ioda);
    G.nanti(async () => {
      const d = await muatIoda(), ks = konteksIoda(d, g.kab.map(k => String(k.kab4).slice(0, 2)));
      ioda.replaceChildren(h("h4", {}, "Konteks provinsi, padam internet IODA"), h("ul", {class: "lf-isy"}, ks.map(k => h("li", {}, teksIoda(k, namaProv(k.prov))))),
        h("p", {class: "lf-ket"}, "Per provinsi dan per periode data, bukan khusus kejadian ini; tidak menjadi warna sel dan bukan bukti listrik atau seluler padam."));
    });
  }
  function laci(kab4, l) {
    const nama = LAYANAN.find(x => x[0] === l)[1], d = h("dialog", {class: "dlg lf-laci"}), badan = h("div", {class: "lf-isi"}, kead("memuat"));
    const tutup = tombol("Tutup", "biasa", () => d.close(), "silang");
    d.append(h("div", {class: "dh"}, h("div", {}, h("h3", {}, `${namaKab(kab4)}, ${nama}`))), badan, h("div", {class: "sk-aksi"}, tutup));
    d.addEventListener("close", () => d.remove()); document.body.append(d); d.showModal();   // buka dulu
    G.nanti(async () => {   // fetch sesudahnya
      const r = await api(`${dasar}/sel?kab4=${encodeURIComponent(kab4)}&layanan=${encodeURIComponent(l)}`);
      if (!r.ok) return badan.replaceChildren(kead(r.status === 503 ? "kosong" : "galat", {teks: r.status === 503 ? "Status layanan belum diaktifkan." : (r.j?.galat ?? undefined)}));
      isiLaci(badan, r.j, kab4, l, d);
    });
  }
  function isiLaci(badan, s, kab4, l, d) {
    const st = s.status ?? {}, m = modelSel(st), u = s.usulan, centang = new Set(), kol = [];
    const resmi = h("section", {class: "lf-bag"}, h("h4", {}, "Status resmi"), h("p", {}, h("span", {class: "lf-pil", "data-w": m.w}, `${m.huruf} ${m.nama}`), st.diubah != null ? ` diubah ${wib(st.diubah)}` : " belum pernah ditetapkan", st.oleh ? `, oleh ${st.oleh}` : ""), st.catatan ? h("p", {}, st.catatan) : null, m.basi ? h("p", {}, ikon("jam", 12), " Belum diperbarui lebih dari 24 jam.") : null);
    const us = h("section", {class: "lf-bag"}, h("h4", {}, "Usulan mesin"), u ? [h("p", {}, h("span", {class: "lf-pil", "data-w": WARNA[u.warna]?.[0] ?? "line"}, `${WARNA[u.warna]?.[1] ?? "?"} ${WARNA[u.warna]?.[2] ?? u.warna}`), ` ${u.alasan ?? ""}`),
      u.isyarat?.length ? h("ul", {class: "lf-isy"}, u.isyarat.map((b, i) => h("li", {}, bisaTulis ? h("label", {}, h("input", {type: "checkbox", "data-i": i}), " ", teksIsyarat(b)) : teksIsyarat(b)))) : h("p", {}, "Tidak ada isyarat.")] : h("p", {}, "Belum ada usulan."));
    kol.push(resmi, us);
    if (bisaTulis) {
      const pilih = h("select", {"aria-label": "Warna status"}, Object.entries(WARNA).map(([v, [, hh, n]]) => h("option", {value: v, selected: v === (u?.warna ?? "abu")}, `${hh} ${n}`)));
      const cat = h("textarea", {rows: 3, maxlength: 300, "aria-label": "Catatan, 20 sampai 300 karakter", placeholder: "Catatan, 20 sampai 300 karakter"}), simpan = h("button", {type: "submit", "data-aksi": "utama"}, "Tetapkan");
      const f = h("form", {class: "lf-bag"}, h("h4", {}, "Tetapkan status"), h("label", {class: "fld"}, h("span", {}, "Warna"), pilih), h("label", {class: "fld"}, h("span", {}, "Catatan"), cat), h("div", {class: "sk-aksi"}, simpan));
      us.addEventListener("change", e => { const i = Number(e.target.dataset?.i); if (e.target.checked) centang.add(i); else centang.delete(i); });
      f.addEventListener("submit", async e => {
        e.preventDefault(); simpan.disabled = true;
        const r = await api(dasar, {metode: "POST", badan: {kab4, layanan: l, warna: pilih.value, bukti: buktiDipilih(u?.isyarat, centang), catatan: cat.value.trim() || null}});
        simpan.disabled = false;
        if (!r.ok) return toast(r.status === 403 ? (r.j?.galat || "Peran kamu belum berhak menetapkan status") : (r.j?.galat || "Status belum bisa disimpan"));
        toast("Status ditetapkan"); d.close(); G.nanti(muat);
      });
      kol.push(f);
    }
    const rw = s.riwayat ?? [];
    kol.push(h("section", {class: "lf-bag"}, h("h4", {}, "Riwayat"), rw.length ? h("ul", {class: "lf-isy"}, rw.map(r => h("li", {}, h("span", {class: "lf-pil", "data-w": WARNA[r.warna]?.[0] ?? "line"}, WARNA[r.warna]?.[1] ?? "?"), ` ${wib(r.dibuat) ?? ""}`, r.oleh ? `, ${r.oleh}` : "", r.catatan ? `, ${r.catatan}` : ""))) : h("p", {}, "Belum ada riwayat.")));
    kosongkan(badan).append(...kol);
  }
  G.nanti ? G.nanti(muat) : muat();
  return k;
}
