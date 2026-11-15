/* Kartu "Siapa di mana" (3W) dan "Tawaran bantuan" di halaman kejadian (TW-08; data/kajian-bnpb/tiga-w/DESIGN-SYSTEM.md, ALUR A1-A3).
   Rute: /api/siklus/kejadian/:id/tiga-w, /tiga-w/token, /tiga-w/token/cabut, /tawaran, /tawaran/:sid/keputusan, /api/siklus/org (src/tiga_w.js). 503 = migrasi belum diterapkan: catatan tenang.
   Q3: tidak publik; tombol tulis hanya untuk pusdalops, koordalops, super admin (server tetap menegakkan). Ambang tumpang tindih Q4 = hipotesis. Mesin tidak memutuskan tawaran: staf memilih.
   Token tampil sekali di dialog dan hilang bersama dialognya. Klik membuka dialog seketika; kandidat dan riwayat dimuat sesudahnya lewat nanti() (INP). */
import {h, ik, api, kartu, kead, kosongkan, tombol, toast, namaKab, wib, angka, pil, seg} from "./inti.js";
import {KLASTER_PB} from "../inti/klaster.js";

const G = globalThis, nanti = f => (G.nanti ? G.nanti(f) : f());
export const NAMA_KLASTER = Object.fromEntries(KLASTER_PB.map(k => [k.kunci, k.nama]));
export const STATUS_TAWARAN = {masuk: "Masuk", dicocokkan: "Dicocokkan", diterima: "Diterima", dialihkan: "Dialihkan", ditolak: "Ditolak"};
export const JENIS_ORG = {kl: "Kementerian atau lembaga", tni: "TNI", polri: "Polri", ngo_nasional: "NGO nasional", ngo_internasional: "NGO internasional", dunia_usaha: "Dunia usaha", kampus: "Kampus", pmi: "PMI", pbb_regional: "PBB atau regional", lainnya: "Lainnya"};

/* ---------- model murni (diuji tanpa DOM) ---------- */
/* GET tiga-w -> baris kisi kab x klaster; tanda: celah (0 organisasi berjalan di klaster relevan), tumpang (melewati ambang hipotesis), ok, atau kosong (0 tetapi belum dianggap celah, mis. pendidikan hari awal) */
export function modelPeta(d) {
  const ur = d?.klaster?.length ? d.klaster : KLASTER_PB.map(k => k.kunci);
  return {klaster: ur, ambang: d?.ambang_tumpang ?? null, kab: (d?.celah_tumpang ?? []).map(r => ({kab4: r.kab4, sel: ur.map(c => {
    const n = r.per_klaster?.[c] ?? 0, tanda = r.tumpang?.includes(c) ? "tumpang" : r.celah?.includes(c) ? "celah" : n > 0 ? "ok" : "kosong";
    return {klaster: c, n, tanda, label: `${namaKab(r.kab4)}, ${NAMA_KLASTER[c] ?? c}: ${n} organisasi berjalan${tanda === "celah" ? ", celah" : tanda === "tumpang" ? ", tumpang tindih (hipotesis)" : ""}`};
  })}))};
}
export const barisSel = (baris, kab4, klaster) => (baris ?? []).filter(b => b.kab4 === kab4 && b.klaster === klaster);
/* keputusan tawaran -> {galat} atau {badan}; alasan untuk organisasi wajib 5 karakter bagi dialihkan dan ditolak (sama dengan server) */
export function badanKeputusan({status, alasanOrg = "", alasanInternal = "", kebutuhan = []}) {
  if (!["diterima", "dialihkan", "ditolak"].includes(status)) return {galat: "Pilih keputusan"};
  const ao = String(alasanOrg).trim(), ai = String(alasanInternal).trim();
  if (status !== "diterima" && ao.length < 5) return {galat: "Alasan untuk organisasi wajib, paling sedikit 5 karakter"};
  return {badan: {status, alasan_organisasi: ao || null, alasan_internal: ai || null, kebutuhan: kebutuhan.length ? kebutuhan.map(({sumber, id}) => ({sumber, id})) : null}};
}
export const bisaPutus = t => t?.status === "masuk" || t?.status === "dicocokkan";
export const namaOrg = (peta, id) => peta?.get?.(id) ?? "tidak ada data";

/* ---------- tampilan ---------- */
const muatCss = () => { if (typeof document === "undefined" || document.querySelector('link[href="/siklus/tiga_w.css"]')) return; document.head.append(h("link", {rel: "stylesheet", href: "/siklus/tiga_w.css"})); };
const catatTenang = (r, aktif, ulang) => r.status === 503 ? kead("kosong", {teks: aktif}) : r.status === 404 ? kead("kosong", {teks: "Kejadian ini belum punya kabupaten atau kota terpasang."})
  : r.status === 401 ? kead("sesi") : kead("galat", {teks: r.status === 403 ? (r.j?.galat || "Peran kamu belum berhak membuka bagian ini") : undefined, ulang});
function dialog(judul, badan, ...aksi) {
  const d = h("dialog", {class: "dlg tw-laci"}), tutup = tombol("Tutup", "biasa", () => d.close(), "silang");
  d.append(h("div", {class: "dh"}, h("div", {}, h("h3", {}, judul))), badan, h("div", {class: "sk-aksi"}, ...aksi, tutup));
  d.addEventListener("close", () => d.remove()); document.body.append(d); d.showModal(); return d;
}
const tglJam = ms => wib(ms) ?? "tidak ada data";
const dasarOrg = async () => { const r = await api("/api/siklus/org"); return r.ok ? new Map((r.j?.org ?? []).map(o => [o.id, o.nama])) : new Map(); };

export function kartuTigaW(id, P = {}) {
  muatCss();
  const bisaTulis = !!(P.pd || P.ko || P.sa), dasar = `/api/siklus/kejadian/${id}`;
  const isi1 = h("div", {}, kead("memuat")), isi2 = h("div", {}, kead("memuat"));
  const k1 = kartu({ey: [ik("peta", 12), "3W"], id: "k-tiga-w", judul: [ik("jiwa", 16), " Siapa di mana"], isi: [isi1],
    kanan: bisaTulis ? tombol("Buat tautan organisasi", "biasa", () => dialogToken(), "tautan") : null});
  const k2 = kartu({ey: [ik("tautan", 12), "Bantuan"], id: "k-tawaran", judul: [ik("gabung", 16), " Tawaran bantuan"], isi: [isi2]});
  let petaTawaran = new Map();

  async function muatPeta() {
    const r = await api(`${dasar}/tiga-w`);
    if (!r.ok) return isi1.replaceChildren(catatTenang(r, "3W belum diaktifkan.", muatPeta));
    const m = modelPeta(r.j), baris = r.j.baris ?? [];
    if (!m.kab.length) return isi1.replaceChildren(kead("kosong", {teks: "Belum ada kabupaten atau kota terpasang pada kejadian ini."}));
    const kep = h("tr", {}, h("th", {}, "Kabupaten atau kota"), m.klaster.map(c => h("th", {class: "t", title: NAMA_KLASTER[c] ?? c}, NAMA_KLASTER[c] ?? c)));
    const tb = m.kab.map(k => h("tr", {}, h("td", {}, namaKab(k.kab4)), k.sel.map(s => {
      const b = h("button", {type: "button", class: "tw-sel", "data-t": s.tanda, "aria-label": s.label, title: s.label}, s.tanda === "celah" ? "0" : String(s.n));
      b.addEventListener("click", () => laciSel(k.kab4, s.klaster, barisSel(baris, k.kab4, s.klaster)));
      return h("td", {class: "t"}, b);
    })));
    isi1.replaceChildren(h("div", {class: "tw kecil ex-tabel"}, h("table", {class: "tw-tab"}, h("thead", {}, kep), h("tbody", {}, tb))),
      h("p", {class: "tw-ket"}, `Angka: organisasi berjalan di kabupaten atau kota dan klaster itu. Bergaris putus: celah, belum ada organisasi berjalan. Berlatar peringatan: tumpang tindih, lebih dari ${m.ambang ?? "?"} organisasi berjalan `, pil("hipotesis"), "."));
  }
  function laciSel(kab4, c, rs) {
    const badan = rs.length ? h("ul", {class: "tw-dft"}, rs.map(b => h("li", {}, h("b", {}, b.org_nama), ` (${JENIS_ORG[b.org_jenis] ?? b.org_jenis}), ${b.status}`, h("br"), b.kegiatan, h("br"), h("small", {}, `diubah ${tglJam(b.diubah)}`)))) : h("p", {}, "Belum ada organisasi tercatat di sini.");
    dialog(`${namaKab(kab4)}, ${NAMA_KLASTER[c] ?? c}`, badan);
  }
  async function dialogToken() {
    const [daftar] = await Promise.all([api("/api/siklus/org")]);
    const orgs = daftar.ok ? daftar.j?.org ?? [] : [];
    const pilih = h("select", {"aria-label": "Organisasi"}, orgs.length ? orgs.map(o => h("option", {value: o.id}, o.nama)) : [h("option", {value: ""}, "Belum ada organisasi terdaftar")]);
    const hasil = h("div", {class: "tw-hasil"}), badan = h("div", {class: "tw-isi"}, h("label", {class: "fld"}, h("span", {}, "Organisasi"), pilih), hasil);
    const buat = tombol("Buat tautan", "utama", async () => {
      if (!pilih.value) return toast("Pilih organisasi dulu");
      const r = await api(`${dasar}/tiga-w/token`, {metode: "POST", badan: {org_id: pilih.value}});
      if (!r.ok) return toast(r.status === 403 ? (r.j?.galat || "Peran kamu belum berhak membuat tautan") : (r.j?.galat || "Tautan belum bisa dibuat"));
      const url = `${location.origin}/bantu#t=${r.j.token}`, kolom = h("input", {type: "text", readonly: true, value: url, "aria-label": "Tautan organisasi"});
      hasil.replaceChildren(h("p", {}, "Tautan ditampilkan sekali ini saja. Salin dan kirim sendiri ke organisasi; tautan lama organisasi ini otomatis tidak berlaku."), kolom); kolom.select();
    }, "tautan"), cabut = tombol("Cabut tautan", "bahaya", async () => {
      if (!pilih.value) return toast("Pilih organisasi dulu");
      const r = await api(`${dasar}/tiga-w/token/cabut`, {metode: "POST", badan: {org_id: pilih.value}});
      if (r.status === 404) return toast("Organisasi ini tidak punya tautan aktif");
      if (!r.ok) return toast(r.j?.galat || "Tautan belum bisa dicabut");
      hasil.replaceChildren(h("p", {}, "Tautan dicabut.")); toast("Tautan dicabut");
    }, "silang");
    dialog("Tautan organisasi", badan, cabut, buat);
  }

  async function muatTawaran(saring = "semua") {
    const [r, peta] = await Promise.all([api(`${dasar}/tawaran`), dasarOrg()]); petaTawaran = peta;
    if (!r.ok) return isi2.replaceChildren(catatTenang(r, "Tawaran belum diaktifkan.", muatTawaran));
    const semua = r.j?.tawaran ?? [];
    if (!semua.length) return isi2.replaceChildren(kead("kosong", {teks: "Belum ada tawaran bantuan untuk kejadian ini."}));
    const daftar = saring === "semua" ? semua : semua.filter(t => t.status === saring);
    const kontrol = seg([["semua", "Semua"], ...Object.entries(STATUS_TAWARAN)], saring, v => muatTawaran(v), "Saring status tawaran");
    const kep = h("tr", {}, ["Organisasi", "Barang", "Jumlah", "Status", "Diperbarui"].map(x => h("th", {}, x)));
    const tb = daftar.map(t => { const tr = h("tr", {class: "tw-baris", tabindex: 0, "data-id": t.id}, h("td", {}, namaOrg(petaTawaran, t.org_id)), h("td", {}, t.barang === "lainnya" ? (t.barang_lain || "lainnya") : t.barang.replaceAll("_", " ")),
      h("td", {class: "num"}, `${angka(t.jumlah) ?? "tidak ada data"} ${t.satuan ?? ""}`.trim()), h("td", {}, h("span", {class: "tw-pil", "data-s": t.status}, STATUS_TAWARAN[t.status] ?? t.status)), h("td", {}, tglJam(t.diubah)));
      const buka = () => laciTawaran(t); tr.addEventListener("click", buka); tr.addEventListener("keydown", e => { if (e.key === "Enter") buka(); }); return tr; });
    isi2.replaceChildren(kontrol, daftar.length ? h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, kep), h("tbody", {}, tb))) : kead("kosong", {teks: "Tidak ada tawaran dengan status ini."}));
  }
  function laciTawaran(t) {
    const badan = h("div", {class: "tw-isi"}, h("section", {class: "tw-bag"}, h("h4", {}, "Rincian"),
      h("p", {}, `${namaOrg(petaTawaran, t.org_id)}: ${t.barang === "lainnya" ? (t.barang_lain || "lainnya") : t.barang.replaceAll("_", " ")}, ${angka(t.jumlah) ?? "tidak ada data"} ${t.satuan ?? ""}`),
      h("p", {}, `Syarat: ${t.syarat || "tidak ada"}`), h("p", {}, `Mitra lokal: ${t.mitra_lokal_org_id ? namaOrg(petaTawaran, t.mitra_lokal_org_id) : "tidak ada data"}`),
      t.alasan_organisasi ? h("p", {}, `Alasan untuk organisasi: ${t.alasan_organisasi}`) : null, t.alasan_internal ? h("p", {}, `Alasan internal: ${t.alasan_internal}`) : null), kead("memuat"));
    dialog("Tawaran bantuan", badan);
    nanti(async () => {
      const r = await api(`${dasar}/tawaran?id=${encodeURIComponent(t.id)}`);
      badan.lastElementChild.remove();
      if (!r.ok) return badan.append(kead("galat", {teks: r.j?.galat ?? undefined}));
      isiTawaran(badan, t, r.j);
    });
  }
  function isiTawaran(badan, t, j) {
    const pilihan = new Set(), kand = j.kandidat ?? [], rw = j.riwayat ?? [];
    const kb = h("section", {class: "tw-bag"}, h("h4", {}, "Kebutuhan yang cocok, urut paling lama menunggu"),
      kand.length ? h("ul", {class: "tw-dft"}, kand.map((k, i) => h("li", {}, bisaPutus(t) && bisaTulis ? h("label", {}, h("input", {type: "checkbox", "data-i": i}), " ", teksKand(k)) : teksKand(k)))) : h("p", {}, "Tidak ada kebutuhan cocok."),
      j.tak_terpetakan ? h("p", {class: "tw-ket"}, `${angka(j.tak_terpetakan)} permintaan tidak bisa dipetakan ke kabupaten atau kota kejadian dan tidak ditampilkan.`) : null);
    kb.addEventListener("change", e => { const i = Number(e.target.dataset?.i); if (e.target.checked) pilihan.add(i); else pilihan.delete(i); });
    const out = [kb];
    if (bisaTulis && bisaPutus(t)) {
      const st = h("select", {"aria-label": "Keputusan"}, [["diterima", "Terima"], ["dialihkan", "Alihkan"], ["ditolak", "Tolak"]].map(([v, n]) => h("option", {value: v}, n)));
      const ao = h("textarea", {rows: 3, maxlength: 300, "aria-label": "Alasan untuk organisasi"}), ai = h("textarea", {rows: 2, maxlength: 300, "aria-label": "Catatan internal"}), simpan = h("button", {type: "submit", "data-aksi": "utama"}, "Putuskan");
      const f = h("form", {class: "tw-bag"}, h("h4", {}, "Keputusan staf"), h("label", {class: "fld"}, h("span", {}, "Keputusan"), st),
        h("label", {class: "fld"}, h("span", {}, "Alasan untuk organisasi (wajib bila dialihkan atau ditolak)"), ao), h("label", {class: "fld"}, h("span", {}, "Catatan internal, tidak tampil ke organisasi"), ai), h("div", {class: "sk-aksi"}, simpan));
      f.addEventListener("submit", async e => {
        e.preventDefault();
        const x = badanKeputusan({status: st.value, alasanOrg: ao.value, alasanInternal: ai.value, kebutuhan: kand.filter((_, i) => pilihan.has(i))});
        if (x.galat) return toast(x.galat);
        simpan.disabled = true; const r = await api(`${dasar}/tawaran/${encodeURIComponent(t.id)}/keputusan`, {metode: "POST", badan: x.badan}); simpan.disabled = false;
        if (!r.ok) return toast(r.status === 409 ? "Tawaran sudah diputuskan; muat ulang" : r.status === 403 ? (r.j?.galat || "Peran kamu belum berhak memutuskan") : (r.j?.galat || "Keputusan belum bisa disimpan"));
        toast("Keputusan tercatat"); f.closest("dialog").close(); nanti(() => muatTawaran());
      });
      out.push(f);
    }
    out.push(h("section", {class: "tw-bag"}, h("h4", {}, "Riwayat"), rw.length ? h("ul", {class: "tw-dft"}, rw.map(r => h("li", {}, `${tglJam(r.dibuat)}, ${STATUS_TAWARAN[r.status] ?? r.status}`, r.oleh ? `, ${r.oleh}` : "", r.alasan_organisasi ? `, untuk organisasi: ${r.alasan_organisasi}` : "", r.alasan_internal ? `, internal: ${r.alasan_internal}` : ""))) : h("p", {}, "Belum ada riwayat.")));
    badan.append(...out);
  }
  const teksKand = k => `${k.sumber === "meja" ? "Meja logistik" : "Permintaan LogPal"}, ${namaKab(k.kab4)}${k.posko ? `, ${k.posko}` : ""}, ${k.status}, sisa ${angka(k.sisa) ?? "tidak ada data"}, sejak ${tglJam(k.dibuat)}`;

  nanti(muatPeta); nanti(() => muatTawaran());
  return [k1, k2];
}
