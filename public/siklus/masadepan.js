/* Siklus Bencana F6: Risiko Masa Depan (DS 3.12). Rute: /api/siklus/masadepan (staf: berkas provinsi dari R2, ?jenis=tumbuh untuk pertumbuhan bangunan, ?contoh=1 Super Admin; tamu: masa_depan_ringkas.json).
   SEMUA angka berpil `hipotesis`: sinyal perubahan terhadap dasar model 1995-2014, bukan ramalan kejadian. Tanpa angka tunggal: median selalu bersama rentang p17 sampai p83 dan jumlah model.
   Muka laut tanpa penurunan muka tanah pesisir. RTRW tidak punya sumber otomatis. Berkas provinsi dibaca sekali dan disimpan selama halaman terbuka. Peta pertumbuhan paparan belum dibuat (menunggu tiket peta). */
import {h, ik, api, kartu, hl, wadah, para, kead, kead_dari, kosongkan, seg, pilihan, pil, tip, K, namaProv, namaKab, wilayah, angka, peran, penjaga} from "./inti.js";

const MENUNGGU = "menunggu";
export const INDEKS = [["rx1day", "Hujan harian maksimum (Rx1day)"], ["rx5day", "Hujan maksimum 5 hari (Rx5day)"], ["cdd", "Hari kering beruntun (CDD)"]];
const SSP = {ssp245: "SSP2-4.5 (sedang)", ssp585: "SSP5-8.5 (tinggi)"};
const bilangan = x => typeof x === "number" && Number.isFinite(x);
const ang = (n, d = 0) => bilangan(n) ? fmt(Math.round(n * 10 ** d) / 10 ** d) : MENUNGGU;
const namaIndeks = i => INDEKS.find(x => x[0] === i)?.[1] ?? i;

/* ---------- fungsi murni (diuji tanpa peramban) ---------- */
export const arah = x => !bilangan(x) ? null : x > 0 ? "naik" : x < 0 ? "turun" : "tetap";
/* sel indeks: median, rentang p17 sampai p83 harus dua-duanya ada; tanpa itu menunggu, bukan 0 */
export const rentangSel = c => bilangan(c?.p17) && bilangan(c?.p83) ? [c.p17, c.p83] : null;
export const sel = (kab, hor, ssp, idx) => kab?.[hor]?.[ssp]?.[idx] ?? null;
export const kalimatJudul = (cel, hor, nama) => bilangan(cel?.relatif_median)
  ? [`Sinyal curah hujan maksimum 5 hari ${arah(cel.relatif_median)} `, hl(`${ang(Math.abs(cel.relatif_median), 1)} persen`), ` pada ${hor} di ${nama}, hipotesis dan bukan ramalan kejadian`] : ["Sinyal curah hujan maksimum 5 hari di ", nama, " ", hl("menunggu"), " perhitungan model iklim"];
export const babTumbuh = t => t?.cagr_persen ? Object.entries(t.cagr_persen).map(([p, v]) => ({periode: p, nilai: v.nilai, basis: v.basis})) : [];

/* bilah rentang yang boleh melewati nol (selisih bisa negatif): skala lo..hi, label dua ujung nilai sebenarnya; gaya lewat CSSOM karena CSP melarang atribut style */
function bilahRentang(lo, hi, a, b, label, satuan) {
  const u = h("u"), i = h("i", {"aria-hidden": "true"}, u), skala = Math.max(hi - lo, 1e-9);
  u.style.left = ((a - lo) / skala * 100) + "%"; u.style.width = Math.max(1, (b - a) / skala * 100) + "%";
  return h("div", {class: "sk-rentang", role: "img", "aria-label": `${label}: ${ang(a, 1)} sampai ${ang(b, 1)} ${satuan}`}, i, h("span", {}, h("span", {}, ang(a, 1)), h("span", {}, ang(b, 1))));
}

export async function buka(isi, sk) {
  let prov0 = null; try { prov0 = localStorage.getItem("sk-prov-md"); } catch (e) { /* penyimpanan diblokir */ }
  const S = {prov: new URLSearchParams(location.search).get("prov") || prov0 || "", kab4: "", hor: "2050", ssp: "ssp245", idx: [], ring: null, data: null, tumbuh: null, contoh: false, sa: false}, pj = penjaga(), simpan = new Map();
  sk.periode = () => ({kab4: S.kab4 || null});
  const hasil = h("div", {}), ctl = h("div", {class: "sk-ctl"});
  const kart = kartu({ey: [ik("jampasir", 12), "Masa depan", " ", pil("hipotesis")], judul: ["Risiko masa depan ", hl("menunggu"), " data"], isi: [ctl, hasil], id: "masadepan"}), judul = kart.querySelector("h3");
  const kabDari = prov => Object.keys(K.kab ?? {}).filter(k => k.startsWith(prov)).sort();

  function kontrol() {
    const optProv = [["", "Ringkasan semua provinsi"], ...Object.entries(K.provinsi ?? {}).sort((a, b) => a[0].localeCompare(b[0])), ...(S.sa ? [["99", "Contoh (dummy)"]] : [])];
    const optKab = Object.keys(S.data?.kab ?? {}).sort().map(k => [k, S.contoh ? `Kabupaten contoh ${k}` : namaKab(k)]);
    kosongkan(ctl).append(seg([["2030", "2030", "jampasir"], ["2050", "2050", "jampasir"]], S.hor, v => { S.hor = v; gambar(); }, "Horizon"),
      seg(Object.entries(SSP).map(([v, t]) => [v, t, "gelombang"]), S.ssp, v => { S.ssp = v; gambar(); }, "Skenario SSP"),
      h("div", {class: "sk-baris"}, pilihan(optProv, S.prov, v => { S.prov = v; S.kab4 = ""; try { localStorage.setItem("sk-prov-md", v); } catch (e) { /* abaikan */ } muat(); }, "Provinsi"),
        ...(S.prov ? [pilihan(optKab, S.kab4, v => { S.kab4 = v; gambar(); }, "Kabupaten atau kota")] : []),
        ...(S.data ? [pilihan(INDEKS, S.idx, v => { S.idx = v; gambar(); }, "Indeks iklim (kosong = semua)", true)] : [])));
  }
  function gambarRingkas() {
    const r = S.ring;
    if (!r || r.status === MENUNGGU || !r.prov) { judul.replaceChildren("Risiko masa depan ", hl(MENUNGGU), " hitungan model iklim"); return kosongkan(hasil).append(wadah("Ringkasan publik", kead("kosong", {teks: "Menunggu hitungan indeks iklim dari NEX-GDDP-CMIP6. Belum ada angka yang boleh ditampilkan."}), pil("menunggu", {ditunggu: "hitungan NEX-GDDP-CMIP6"}))); }
    const t = h("tbody", {}); let n = 0;
    for (const [p, hs] of Object.entries(r.prov).sort()) {
      const v = hs?.[S.hor]?.[S.ssp] ?? {}; n++;
      t.append(h("tr", {}, h("td", {}, namaProv(p)), ...INDEKS.map(([i]) => h("td", {class: "num"}, bilangan(v[i]) ? [ang(v[i], 1), " ", pil("hipotesis")] : [MENUNGGU, " ", pil("menunggu")]))));
    }
    judul.replaceChildren(hl(angka(n)), " provinsi punya sinyal perubahan iklim hipotesis, bukan ramalan kejadian");
    const th = (a, d) => h("th", {title: d}, a);
    kosongkan(hasil).append(wadah(`Selisih median terhadap dasar, ${S.hor}, ${SSP[S.ssp]}`, para("Median antar kabupaten terhadap dasar model sendiri 1995-2014. Sinyal perubahan, bukan ramalan kejadian."),
      h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Provinsi", "Provinsi dengan berkas hitungan"), ...INDEKS.map(([i, nm]) => th(nm, "Median selisih terhadap dasar, satuan mm untuk hujan dan hari untuk CDD; hipotesis")))), t))));
  }
  function gambar() {
    if (!S.prov) return gambarRingkas();
    const d = S.data; if (!d) return;
    const kab = d.kab?.[S.kab4], nama = S.contoh ? `kabupaten contoh ${S.kab4}` : wilayah(S.kab4) ?? namaProv(S.prov);
    judul.replaceChildren(...kalimatJudul(sel(kab, S.hor, S.ssp, "rx5day"), S.hor, nama).flat());
    if (!kab) return kosongkan(hasil).append(kead("kosong", {teks: "Kabupaten ini belum ada di berkas hitungan provinsi", aksi: undefined}));
    const pakai = S.idx.length ? INDEKS.filter(([i]) => S.idx.includes(i)) : INDEKS, th = (a, dd) => h("th", {title: dd}, a), t = h("tbody", {});
    const rs = pakai.map(([i]) => rentangSel(sel(kab, S.hor, S.ssp, i))).filter(Boolean);
    for (const [i, nm] of pakai) {
      const c = sel(kab, S.hor, S.ssp, i), rg = rentangSel(c), lo = Math.min(0, ...rs.map(x => x[0])), hi = Math.max(0, ...rs.map(x => x[1]));
      t.append(h("tr", {"data-tip": tip(nm, ["Jumlah model", bilangan(c?.n_model) ? `${c.n_model}, naik ${c.n_model_positif ?? 0}` : MENUNGGU], ["Dasar", bilangan(c?.dasar_median) ? `${ang(c.dasar_median, 1)} ${c.satuan}` : MENUNGGU])},
        h("td", {}, nm), h("td", {class: "num"}, bilangan(c?.selisih_dasar) ? `${ang(c.selisih_dasar, 1)} ${c.satuan}` : MENUNGGU), h("td", {}, rg ? bilahRentang(lo, hi, rg[0], rg[1], nm, c.satuan) : MENUNGGU),
        h("td", {class: "num"}, bilangan(c?.relatif_median) ? `${ang(c.relatif_median, 1)} persen` : MENUNGGU), h("td", {class: "num"}, bilangan(c?.n_model) && c.n_model > 0 ? ang(c.n_model) : MENUNGGU),
        h("td", {class: "t"}, c && c.status !== MENUNGGU ? pil("hipotesis") : pil("menunggu", {ditunggu: "hitungan model"}))));
    }
    const ml = d.muka_laut?.[S.hor]?.[S.ssp], mlOk = bilangan(ml?.median) && Array.isArray(ml?.rentang);
    const blok = [wadah(`Selisih terhadap dasar ${d.dasar?.periode ?? "1995-2014"}, rentang antar model`, para("Median bersama rentang p17 sampai p83 antar model. Sinyal perubahan terhadap dasar, bukan ramalan kejadian."),
        h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Indeks", "Indeks ETCCDI dari NEX-GDDP-CMIP6"), th("Median", "Selisih median antar model terhadap dasar model sendiri"), th("Rentang p17 sampai p83", "Rentang antar model, konvensi AR6"), th("Relatif", "Selisih relatif terhadap dasar, persen"), th("Model", "Jumlah model yang dipakai"), th("Keyakinan", "Semua hipotesis"))), t)),
        para(`${d.catatan ?? ""} ${d.keterbatasan ?? ""}`.trim())),
      wadah("Muka laut (AR6)", mlOk ? [h("p", {class: "sk-para"}, `Median ${ang(ml.median * 100)} cm terhadap ${ml.dasar ?? "1995-2014"}, rentang 17 sampai 83 persen: ${ang(ml.rentang[0] * 100)} sampai ${ang(ml.rentang[1] * 100)} cm. `, pil("hipotesis")),
        bilahRentang(0, Math.max(ml.rentang[1], ml.median) * 100, ml.rentang[0] * 100, ml.rentang[1] * 100, "Muka laut", "cm"), para(ml.catatan ?? "Penurunan muka tanah pesisir tidak dihitung.")]
        : [kead("kosong", {teks: ml?.alasan ?? "Muka laut menunggu rekaman AR6"}), pil("menunggu", {ditunggu: "rekaman AR6 Zenodo"})])];
    const tb = S.tumbuh?.kab?.[S.kab4];
    if (tb) {
      const tr = h("tbody", {}); const nilaiPeriode = babTumbuh(tb);
      for (const [zn, z] of Object.entries(tb.zona ?? {})) for (const [per, v] of Object.entries(z.pasangan ?? {}))
        tr.append(h("tr", {}, h("td", {}, zn), h("td", {class: "t"}, per.replace("-", " sampai ")), h("td", {class: "num"}, bilangan(v.cagr_persen) ? `${ang(v.cagr_persen, 1)} persen per tahun` : MENUNGGU),
          h("td", {class: "num"}, bilangan(v.indeks_konsentrasi) ? ang(v.indeks_konsentrasi, 1) : MENUNGGU), h("td", {class: "t"}, v.basis === "model" ? "model GHSL" : "pengamatan"), h("td", {class: "t"}, bilangan(v.cagr_persen) ? pil("hipotesis") : pil("menunggu", {ditunggu: "data GHSL"}))));
      blok.push(wadah("Bangunan tumbuh di zona bahaya", para(`Pertumbuhan tahunan terbangun seluruh kabupaten: ${nilaiPeriode.map(x => `${x.periode.replace("-", " sampai ")} ${bilangan(x.nilai) ? ang(x.nilai, 1) + " persen" : MENUNGGU}`).join(", ")}. Epoch 2025 dan 2030 hasil model GHSL. Indikasi, bukan ramalan kejadian.`),
        tr.children.length ? h("div", {class: "tw kecil ex-tabel"}, h("table", {}, h("thead", {}, h("tr", {}, th("Zona", "Zona bahaya F2"), th("Periode", "Pasangan epoch"), th("Pertumbuhan", "Pertumbuhan majemuk tahunan bangunan di zona"), th("Konsentrasi", "Lebih dari 1: pertumbuhan terkonsentrasi di zona melebihi porsi luasnya"), th("Dasar", "Pengamatan atau model"), th("Keyakinan", "Hipotesis"))), tr)) : kead("kosong", {teks: "Zona bahaya menunggu"})));
      const trg = tb.tata_ruang ?? {};
      blok.push(wadah("Tata ruang", para(`PIPPIB ${bilangan(trg.pippib_ha) ? ang(trg.pippib_ha) + " ha" : MENUNGGU}, konsesi ${bilangan(trg.konsesi_ha) ? ang(trg.konsesi_ha) + " ha" : MENUNGGU}. RTRW: tidak ada sumber otomatis.`), pil(bilangan(trg.pippib_ha) || bilangan(trg.konsesi_ha) ? "hipotesis" : "menunggu", {ditunggu: "sumber tata ruang"})));
    }   // tanpa GHSL: kartu tidak tampil (DS 3.12)
    kosongkan(hasil).append(...blok);
  }
  async function ambil(prov, jenis) {
    const kunci = `${jenis}|${prov}`; if (simpan.has(kunci)) return simpan.get(kunci);
    // ponytail: akun instansi wajib kab4 di wilayahnya; tanpa pemilih wilayah BP, kabupaten pertama provinsi dicoba
    const q = new URLSearchParams({prov, ...(S.kab4 || kabDari(prov)[0] ? {kab4: S.kab4 || kabDari(prov)[0]} : {}), ...(jenis === "tumbuh" ? {jenis} : {}), ...(prov === "99" ? {contoh: "1"} : {})});
    const r = await api("/api/siklus/masadepan?" + q); if (r.ok && r.j?.kab) simpan.set(kunci, r);
    return r;
  }
  async function muat() {
    const n = pj.baru(); kosongkan(hasil).append(kead("memuat"));
    S.contoh = S.prov === "99"; S.data = S.tumbuh = null;
    if (!S.prov) {
      if (!S.ring) { const r = await api("/api/siklus/masadepan"); if (!pj.terbaru(n)) return; S.ring = r.ok ? r.j : r.status === 404 ? {status: MENUNGGU} : null; if (!r.ok && r.status !== 404) return kosongkan(hasil).append(kead_dari(r, muat)); }
      kontrol(); return gambar();
    }
    const [r, tb] = await Promise.all([ambil(S.prov, "iklim"), ambil(S.prov, "tumbuh")]);
    if (!pj.terbaru(n)) return;
    if (!r.ok || !r.j?.kab) {   // tamu atau sesi tanpa hak mendapat ringkasan, bukan berkas provinsi
      judul.replaceChildren("Rincian ", hl(namaProv(S.prov)), " ", hl(MENUNGGU));
      kontrol(); return kosongkan(hasil).append(r.ok ? kead("kosong", {teks: "Rincian kabupaten hanya untuk staf. Buka ringkasan semua provinsi."}) : kead_dari(r, muat, `Berkas masa depan ${namaProv(S.prov)} belum dibangun (menunggu hitungan model iklim)`));
    }
    S.data = r.j; S.tumbuh = tb.ok && tb.j?.kab ? tb.j : null; S.kab4 = Object.keys(S.data.kab).sort()[0] ?? ""; kontrol(); gambar();
  }
  isi.replaceChildren(kart);
  const p = await peran(); S.sa = p.sa; kontrol(); await muat();
}
