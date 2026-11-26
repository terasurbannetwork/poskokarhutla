"use strict";
/* PD-3 Penyusun pesan peringatan berstandar Perban 2/2024 Pasal 20 ayat 2 (tiket RU-052; DESAIN-TEKNIS 5.3; DESIGN-SYSTEM 7.9).
   Staf memilih satu peringatan aktif (GET /api/peringatan/aktif); enam baris disusun pesanStandar() di public/ews_tindakan.js dari peringatan itu
   dan konteks kab: kelas bahaya (risiko_hvc.json H, ambang terpapar.json), jiwa terpapar (terpapar.json h[bahaya][0]), sumber daya (siaga.json).
   Unsur tanpa data tertulis "belum ada data" oleh pesanStandar. Kab dicocokkan menurut nama di provinsi yang sama; nama ganda atau tak ada = tidak
   dicocokkan (konteks kosong), tidak ditebak. Hasil: salin teks pesan (Clipboard, kotak pesan terpilih bila ditolak) dan unduh kartu PNG (canvas).
   TIDAK ADA kirim: hanya permintaan GET; keputusan kirim ke warga di Kepala BNPB atau Kepala Daerah (Perban 4/2022 Pasal 7).
   Fungsi murni diuji tanpa DOM: UnitPd3 {kodeKab, konteks, kelasBahaya, sumberDaya}. Layar: UnitTampil["PD-3"](peringatanAktif) -> [elemen]. */
(() => {
  const BELUM = "belum ada data";
  const NAMA_TINGKAT = {1: "Waspada", 2: "Siaga", 3: "Awas"};   // Perban 2/2024 Pasal 20 ayat 4; API memberi nama, angka dipetakan di sini
  const tingkatNama = t => NAMA_TINGKAT[t] || (typeof t === "string" && t ? t[0].toUpperCase() + t.slice(1) : BELUM);
  const norm = n => String(n || "").toLowerCase().replace(/^kabupaten\s+|^kab\.?\s+/, "").replace(/\s+/g, " ").trim();

  /* kode kab Kemendagri dari nama dan kode provinsi peringatan; tepat satu cocok, selain itu null */
  function kodeKab(p, kab) {
    const nama = norm(p?.kab); if (!nama || !p?.prov) return null;
    const cocok = (kab || []).filter(k => String(k.kode).slice(0, 2) === String(p.prov) && norm(k.nama) === nama);
    return cocok.length === 1 ? cocok[0].kode : null;
  }
  /* rendah di bawah ambang sedang_plus, sedang sampai ambang tinggi, tinggi di atas ambang tinggi (ALGORITMA 10.10) */
  function kelasBahaya(h, ambang) {
    if (typeof h !== "number" || !Number.isFinite(h) || !ambang) return null;
    return h > ambang.tinggi ? "tinggi" : h >= ambang.sedang_plus ? "sedang" : "rendah";
  }
  function sumberDaya(jenis, kode, siaga) {
    const s = siaga?.kab?.[kode], stok = siaga?.stok?.[jenis], bagian = [];
    if (Array.isArray(stok) && stok.length) bagian.push("stok yang disarankan " + stok.map(x => String(x.nama).toLowerCase()).join(", "));
    if (s && Array.isArray(s.desa) && siaga.ada_terisolir) bagian.push(s.desa.length ? `${s.desa.length} desa langganan terisolir tercatat` : "tidak ada desa langganan terisolir tercatat");
    return bagian.length ? bagian.join("; ") + "; stok tersedia belum ada data" : null;
  }
  /* konteks pesanStandar dari data kab; data = {terpapar, siaga, risiko, kab (daftar {kode, nama})}; yang tidak terbaca tetap kosong (null) */
  function konteks(p, data) {
    const kode = kodeKab(p, data?.kab), t = data?.terpapar, bahaya = t?.bahaya || [];
    const h = kode && Object.hasOwn(data?.risiko?.kab?.[kode]?.H || {}, p.jenis) ? data.risiko.kab[kode].H[p.jenis] : null;
    const terpapar = kode && bahaya.includes(p.jenis) ? t.kab?.[kode]?.h?.[p.jenis]?.[0] : null;
    return {kode, turunan: null, kelas_bahaya: kelasBahaya(h, t?.ambang), jiwa_terpapar: typeof terpapar === "number" ? terpapar : null,
      sumber_daya: kode ? sumberDaya(p.jenis, kode, data?.siaga) : null};
  }
  const api = {tingkatNama, kodeKab, konteks, kelasBahaya, sumberDaya, norm, BELUM};
  (typeof window !== "undefined" ? window : globalThis).UnitPd3 = api;
  if (typeof document === "undefined") return;

  /* ---------------- layar ---------------- */
  const R = window.UnitRapor;
  const h = (tag, a, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
  const ikon = k => { const t = document.createElement("template"); t.innerHTML = R.svg(k); return t.content.firstElementChild; };
  const ambil = u => fetch(u, {credentials: "same-origin", signal: AbortSignal.timeout(9000)}).then(r => r.ok ? r.json() : null).catch(() => null);
  let modul = null, data = null;   // ews_tindakan.js dan berkas konteks dimuat sekali, saat peringatan pertama dipilih
  const muatModul = () => modul ||= import("/ews_tindakan.js");
  const muatData = () => data ||= Promise.all(["terpapar", "siaga", "risiko_hvc"].map(n => ambil(`/data/bnpb/${n}.json`))).then(([terpapar, siaga, risiko]) =>
    ({terpapar, siaga, risiko, kab: Object.entries(risiko?.kab || {}).map(([kode, v]) => ({kode, nama: v.nama}))}));

  const salinTeks = async (teks, kotak) => {
    try { await navigator.clipboard.writeText(teks); return true; } catch (e) { kotak.focus(); kotak.select(); return false; }   // ditolak atau konteks tak aman: teks terpilih, tekan salin manual
  };
  /* kartu PNG: kepala berwarna tingkat (Pasal 20 ayat 4), enam baris, catatan; teks dibungkus per kata */
  function gambarPng(baris, judul, M) {
    const W = 1080, P = 48, K = 22, c = document.createElement("canvas"), g = c.getContext("2d");
    const lead = 40, font = `${K}px Inter, system-ui, sans-serif`;
    g.font = font;
    const bungkus = t => { const kata = t.split(" "), out = []; let b = "";
      for (const k of kata) { const u = b ? b + " " + k : k; if (g.measureText(u).width > W - 2 * P && b) { out.push(b); b = k; } else b = u; }
      if (b) out.push(b); return out; };
    const isi = baris.flatMap(b => bungkus(b));
    const tinggi = 120 + isi.length * lead + 90;
    c.width = W; c.height = tinggi; g.font = font;
    const css = getComputedStyle(document.documentElement);
    const warna = (n, cad) => css.getPropertyValue(n).trim() || cad;
    g.fillStyle = M.latar; g.fillRect(0, 0, W, tinggi);
    g.fillStyle = M.warna; g.fillRect(0, 0, W, 88);
    g.fillStyle = "#ffffff"; g.font = `700 30px Inter, system-ui, sans-serif`; g.textBaseline = "middle"; g.fillText(judul, P, 44);
    g.fillStyle = warna("--ink", "#1a1a1a"); g.font = font; g.textBaseline = "alphabetic";
    isi.forEach((t, i) => g.fillText(t, P, 88 + 56 + i * lead));
    g.fillStyle = warna("--ink2", "#555555"); g.font = `18px Inter, system-ui, sans-serif`;
    g.fillText("Disusun dari data Centurisk97; perlu diperiksa staf sebelum diteruskan.", P, tinggi - 36);
    return new Promise(ok => c.toBlob(ok, "image/png"));
  }

  async function tampil(j) {
    const m0 = await muatModul(), jenisNama = k => m0.BENCANA[k]?.nama || k;   // nama bencana dari katalog ews_tindakan.js, bukan kunci mentah
    const daftar = Array.isArray(j?.peringatan) ? j.peringatan : [];
    const skema = {id: "pd3-pesan", sistem: "PD-3", pil: "Pesan peringatan", ikon: "resmi", judul: "Penyusun pesan peringatan", label: ["resmi", "hitungan_kita"],
      sumber: ["peringatan_aktif", "terpapar", "siaga", "risiko_hvc"], aturan: [], asumsi: [],
      rumus: "enam baris menurut Perban 2/2024 Pasal 20 ayat (2); kelas bahaya dari indeks H kab dan ambang terpapar.json; jiwa terpapar = h[bahaya][0] kab (sedang ke atas); sumber daya dari siaga.json",
      angka: [{k: "aktif", label: "Peringatan aktif", nilai: Number.isInteger(j?.total) ? j.total : daftar.length, title: "hitungan sebenarnya semua peringatan aktif"},
        {k: "dipilih", label: "Bisa dipilih di sini", nilai: daftar.length, title: j?.terpotong ? "daftar API dibatasi 50 peringatan terbaru" : "semua peringatan aktif"}],
      kolom: [], baris: []};
    const sec = R.render(skema, null), bd = sec.querySelector(".ex-bd");
    if (!daftar.length) { bd.append(h("p", {class: "ad-kosong", role: "status"}, ikon("kosong"), "Belum ada peringatan aktif untuk disusun.")); return [sec]; }

    const pilih = h("select", {id: "pd3-pilih", class: "un-g-in un-pd3-pilih"}, h("option", {value: "", teks: "Pilih peringatan aktif"}),
      ...daftar.map((p, i) => h("option", {value: String(i), teks: `${tingkatNama(p.tingkat)}, ${jenisNama(p.jenis)}, ${p.kab || "wilayah belum tertulis"}`})));
    const nilai = {}, dd = k => (nilai[k] = h("dd", {teks: BELUM}));
    const masukan = h("dl", {class: "un-ringkas"},
      h("div", null, h("dt", {teks: "Jenis dan tingkat"}), dd("jenis")), h("div", null, h("dt", {teks: "Kab/kota"}), dd("kab")),
      h("div", null, h("dt", {teks: "Jiwa terpapar, sedang ke atas"}), dd("jiwa")), h("div", null, h("dt", {teks: "Kelas bahaya kab"}), dd("kelas")),
      h("div", null, h("dt", {teks: "Sumber daya"}), dd("sd")));
    const kotak = h("textarea", {id: "pd3-teks", class: "un-pd3-teks", readonly: true, rows: "7", "aria-label": "Pesan enam baris", placeholder: "Pesan muncul sesudah peringatan dipilih."});
    const salin = h("button", {type: "button", class: "ad-tombol kecil", disabled: true}, ikon("data"), "Salin pesan WhatsApp");
    const png = h("button", {type: "button", class: "ad-tombol kecil", disabled: true}, ikon("unduh"), "Unduh kartu PNG");
    const status = h("p", {class: "un-g-cat", role: "status"});
    let kini = null;   // {p, baris}
    const putus = x => { const v = x ?? BELUM; return v === "" ? BELUM : v; };

    async function susun() {
      const i = pilih.value; status.textContent = ""; salin.disabled = png.disabled = true;
      if (i === "") { kotak.value = ""; kini = null; for (const x of Object.values(nilai)) x.textContent = BELUM; return; }
      const p = daftar[Number(i)], [m, d] = await Promise.all([muatModul(), muatData()]);
      if (pilih.value !== i) return;   // pilihan sudah berganti selama memuat
      const k = konteks(p, d), pesan = m.pesanStandar(p, {turunan: k.turunan, kelas_bahaya: k.kelas_bahaya, jiwa_terpapar: k.jiwa_terpapar, sumber_daya: k.sumber_daya});
      kotak.value = pesan; kini = {p, baris: pesan.split("\n"), m};
      nilai.jenis.textContent = `${jenisNama(p.jenis)}, ${tingkatNama(p.tingkat)}`; nilai.kab.textContent = putus(p.kab);
      nilai.jiwa.textContent = k.jiwa_terpapar == null ? BELUM : `${k.jiwa_terpapar.toLocaleString("id-ID")} jiwa`; nilai.kelas.textContent = putus(k.kelas_bahaya);
      nilai.sd.textContent = putus(k.sumber_daya);
      if (!k.kode) status.textContent = "Kab/kota tidak bisa dicocokkan dengan daftar kita dari nama, jadi jiwa terpapar, kelas bahaya, dan sumber daya kosong.";
      salin.disabled = png.disabled = false;
    }
    pilih.addEventListener("change", () => { susun(); });
    salin.addEventListener("click", async () => { if (!kini) return;
      status.textContent = await salinTeks(kotak.value, kotak) ? "Pesan disalin." : "Salin otomatis ditolak peramban; teks sudah terpilih, tekan salin sendiri."; });
    png.addEventListener("click", async () => { if (!kini) return;
      const {p, baris, m} = kini, tg = typeof p.tingkat === "number" ? p.tingkat : ({waspada: 1, siaga: 2, awas: 3})[String(p.tingkat).toLowerCase()];
      const blob = await gambarPng(baris, `Peringatan ${tingkatNama(p.tingkat)}: ${jenisNama(p.jenis)}`, m.TINGKAT[tg] || {warna: "#555555", latar: "#f2f2f2"});
      if (!blob) { status.textContent = "Kartu PNG gagal dibuat."; return; }
      const nama = `pesan-${p.jenis}-${norm(p.kab).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "wilayah"}.png`, url = URL.createObjectURL(blob);
      const a = h("a", {href: url, download: nama}); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = "Kartu PNG diunduh."; });

    bd.append(h("p", {class: "un-g-cat", teks: "Pesan disusun di peramban ini. Tidak ada yang dikirim ke warga atau ke server; keputusan kirim ada di Kepala BNPB atau Kepala Daerah."}),
      h("p", null, h("label", {for: "pd3-pilih", teks: "Peringatan "}), pilih),
      h("div", {class: "un-g"}, h("div", {class: "un-g-in-wadah"}, masukan),
        h("div", {class: "un-g-out"}, h("label", {class: "sr", for: "pd3-teks", teks: "Pesan enam baris"}), kotak, h("div", {class: "un-aksi un-pd3-aksi"}, salin, png), status)));
    return [sec];
  }
  (window.UnitTampil ||= {})["PD-3"] = tampil;
})();
