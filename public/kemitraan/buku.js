/* Kemitraan Kampus, buku profil daerah /kemitraan/buku?kab=<kode4> atau ?prov=<NN> (KM-B08, PRD F-M2, PROFIL-DAERAH §3 dan §4).
   Bab 1-7 dan 9 dirender oleh KM.daerahBuku.BAB (daerah.js), kembaran lembar profil; di sini hanya kerangka buku: sampul, ringkasan, bab 8 (pakar), lampiran, kaki sumber.
   Semua teks dari data masuk lewat esc() atau builder *Html; tanpa logo BNPB (izin belum ada, TIKET blocker P4). */
(() => {
  "use strict";
  const KM = window.KM, D = KM.daerahBuku, {$, esc, kosongHtml, tabelHtml, urlOk, LUAR, IK} = KM;
  const {BAB, nf, tgl, bl, irbi, bag, E, th, TIDAK, YK} = D;
  document.documentElement.dataset.theme = "light";   // buku selalu terang: A4 putih
  const get = (u, opsi) => fetch(u, {credentials: "same-origin", ...opsi}).then(r => r.ok ? r.json() : null).catch(() => null);
  const TA = {"snapshot-repo": "salinan repo, bukan tanggal terbit sumber", "akhir-tahun-data": "akhir tahun data", "akhir-cakupan": "akhir cakupan data", "hari-data": "tanggal data", terbit: "tanggal terbit"};
  const FR = {"snapshot-repo": "salinan repo", "akhir-tahun-data": "akhir tahun data", "akhir-cakupan": "akhir cakupan data", "hari-data": "tanggal data", terbit: "terbit"};
  const kunciArti = a => /^[a-z0-9-]+$/.test(String(a));   // kunci mesin tidak boleh tampil mentah
  const artiTeks = a => !a ? "–" : TA[a] || (kunciArti(a) ? "tanggal data" : a);
  /* frasa tanggal menurut arti: "salinan repo 28 Okt 2026", bukan "data per" untuk salinan */
  const frase = (t, a) => { const w = t ? tgl(t) : null; if (!w) return "tanggal data tidak tercatat"; if (!a) return `data per ${w}`; if (FR[a]) return `${FR[a]} ${w}`; return kunciArti(a) ? `tanggal data ${w}` : `data per ${w} (${a})`; };
  const pil = b => b && YK[b.yakin] ? ` <em class="ak-pl">${esc(YK[b.yakin])}</em>` : "";
  const OTO = '<em class="ak-pl">Otomatis, belum divalidasi</em>';
  const KELAS = {1: "Tinggi", 0: "Sedang"};

  /* kaki per bab: sumber dan tanggal blok yang dipakai bab itu. Blok dengan sumber[] berobjek {nama, tanggal, tanggal_arti} dicetak per sumber */
  const kakiHtml = (blok, catatan) => {
    const baris = blok.filter(Boolean).flatMap(b => Array.isArray(b.sumber) ? b.sumber.filter(x => x && x.nama).map(x => `${x.nama}, ${frase(x.tanggal ?? b.tanggal, x.tanggal_arti ?? b.tanggal_arti)}`) : b.sumber ? [`${b.sumber}, ${frase(b.tanggal, b.tanggal_arti)}`] : []);
    const uniq = [...new Set(baris)], teks = [uniq.length ? "Sumber: " + uniq.join("; ") + "." : "", catatan || ""].filter(Boolean).join(" ");
    return teks ? `<footer class="km-kaki">${esc(teks)}${uniq.length ? " Daftar sumber lengkap ada di Lampiran." : ""}</footer>` : "";
  };
  const babHtml = (id, judul, isiHtml, kaki) => `<section class="km-bukubab" id="${esc(id)}"><h1>${esc(judul)}</h1><div class="km-babisi">${isiHtml}</div>${kaki}</section>`;
  const kosong = (t, pesan) => { $("bkIsi").innerHTML = kosongHtml(t, pesan); };
  const pasangAkhir = root => {   // gaya lewat CSSOM (CSP), semua bagian terbuka agar tercetak
    root.querySelectorAll("i[data-w]").forEach(i => i.style.setProperty("width", i.dataset.w + "%"));
    root.querySelectorAll("details").forEach(x => { x.open = true; });
  };

  /* ---------- ringkasan satu halaman ---------- */
  function ringkasanKab(d, r) {
    const p = d.penduduk, ir = d.irbi, kj = d.kejadian, dm = kj?.dampak_12bln, ms = d.masalah_skor || {};
    const last = ir?.seri?.length ? ir.seri[ir.seri.length - 1] : null, rs = kj?.tren_rentang?.semua, tot = kj?.total_2015_2025?.semua;
    const kartu = [
      ["Penduduk", E(p?.total, 0), p ? "jiwa" : TIDAK],
      [`IRBI ${last ? last[0] : "2025"}`, last ? E(last[1]) : "–", r?.i != null ? `kelas ${KELAS[r.i] || "–"}${r.y === "estimasi-model" ? ", mungkin nilai provinsi" : ""}` : TIDAK],
      [`Kejadian ${rs ? rs[0] + "–" + rs[1] : "2015–2025"}`, E(tot, 0), tot != null ? "semua jenis" : TIDAK],
      ["Kejadian 12 bulan terakhir", E(dm?.n_kejadian, 0), dm ? `${nf(dm.meninggal, 0)} meninggal, ${nf(dm.mengungsi, 0)} mengungsi` : TIDAK],
      ["Kapasitas", r?.c == null ? "–" : `${r.c}/5`, r?.c == null ? TIDAK : "butir tercatat"],
    ];
    const angkaHtml = `<div class="km-bk-angka">${kartu.map(([l, v, s]) => `<div><span>${esc(l)}</span><b>${v}</b><small>${esc(s)}</small></div>`).join("")}</div>`;
    const masalah = [...(d.masalah || [])].sort((a, b) => (b.skor ?? -1) - (a.skor ?? -1)).slice(0, 5);
    const masalahHtml = masalah.length ? `<p>${OTO} Prioritas dihitung otomatis dari data dan menunggu pengesahan BPBD.</p><ul class="km-bk-daftar">${masalah.map(m => `<li><em class="km-kelas km-w-${esc(String(m.kelas || "p3").toLowerCase())}">${esc(m.kelas || "–")}</em><b>${esc(m.judul)}</b><small>${esc(bl(m.B))}, skor ${D.sk(m.skor)} dari 1</small></li>`).join("")}</ul>` : `<p class="km-kosong">${TIDAK}</p>`;
    const bahaya = Object.entries(ms).filter(([, v]) => v && v.skor != null).sort((a, b) => b[1].skor - a[1].skor).slice(0, 3);
    const bahayaHtml = bahaya.length ? `<ul class="km-bk-daftar">${bahaya.map(([k, v]) => `<li><b>${esc(bl(k))}</b><small>skor masalah ${D.sk(v.skor)} dari 1, kelas ${esc(v.kelas || "–")}</small></li>`).join("")}</ul>` : `<p class="km-kosong">${TIDAK}</p>`;
    return angkaHtml + `<h2>Lima masalah teratas</h2>` + masalahHtml + `<h2>Tiga bahaya teratas</h2>` + bahayaHtml;
  }

  /* ---------- bab 8: pakar dan solusi (hanya bila API menjawab 200; edisi publik membuangnya) ---------- */
  function pakarHtml(res) {
    const daftar = Array.isArray(res) ? res : (res?.masalah || res?.daftar || []);
    const blok = daftar.filter(m => m && Array.isArray(m.pakar) && m.pakar.length && /^P[12]$/.test(String(m.kelas || "P1")));
    if (!blok.length) return null;
    const satu = pk => {
      const paper = (pk.paper || []).find(x => x && (x.kutipan?.length || typeof x.kutipan === "string")) || (pk.paper || [])[0];
      const kut = paper ? (Array.isArray(paper.kutipan) ? paper.kutipan[0] : paper.kutipan) : null, doi = paper?.doi ? String(paper.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") : "";
      const tautan = doi && /^10\.\S+$/.test(doi) ? urlOk("https://doi.org/" + doi) : "";
      const cite = paper ? `<cite>${esc(paper.judul || "")}${paper.tahun ? ", " + esc(paper.tahun) : ""}${tautan ? `, <a href="${esc(tautan)}" ${LUAR}>DOI ${esc(doi)}</a>` : ""}</cite>` : "";
      return `<div class="km-pakar"><h3>${esc(pk.nama || "–")}</h3><small>${esc(pk.kampus || "")}</small>${kut ? `<blockquote class="km-kutip"><small>Kutipan abstrak, bukan rekomendasi BNPB</small>“${esc(kut)}”${cite}</blockquote>` : (paper ? `<p class="km-kosong">${esc(paper.catatan || "Tidak ada kalimat solusi yang jelas di abstrak")}</p>` : "")}</div>`;
    };
    return `<p>${OTO} Pakar dicocokkan otomatis dari karya ilmiah terbuka dan belum diuji relevansinya.</p>` + blok.map(m => `<section class="ak-dbagian"><div class="ak-disi"><h3 class="km-t">${esc(m.judul || m.auto_id || "Masalah")}</h3>${m.pakar.slice(0, 5).map(satu).join("")}</div></section>`).join("");
  }

  /* catatan cakupan bab 5: sekolah dan faskes hanya ada di sebagian provinsi */
  const cakupan5 = d => { const c = d.fasilitas?.cakupan; if (!c) return ""; const s = (c.sekolah_siswa_prov || []), f = (c.faskes_rs_prov || []); return s.includes(d.prov) || f.includes(d.prov) ? `Data sekolah baru mencakup ${nf(s.length, 0)} provinsi dan fasilitas kesehatan ${nf(f.length, 0)} provinsi.` : ""; };

  /* ---------- lampiran ---------- */
  function lampiranHtml(d) {
    const sm = d.sumber || [], K = window.KM_KONST, b = K?.BOBOT?.auto, kl = K?.KELAS;
    const tabel = sm.length ? tabelHtml([["Sumber"], ["Data per"], ["Arti tanggal"], ["Lisensi"]], sm.map(s => [esc(s.nama), esc(tgl(s.tanggal)), esc(artiTeks(s.tanggal_arti)), esc(s.lisensi || "–")])) : `<p class="km-kosong">${TIDAK}</p>`;
    const metode = b && kl ? `<p>Skor masalah otomatis = ${Object.entries(b).map(([k, v]) => `${nf(v, 2)}×${k}`).join(" + ")}; tiap komponen berupa persentil nasional 0–1 (H bahaya IRBI, F frekuensi kejadian per 100 ribu penduduk, T tren Theil–Sen, D dampak 12 bulan, P paparan penduduk rentan, K celah kapasitas). Komponen yang datanya kosong dikeluarkan dan bobot sisanya dinormalkan ulang; bila kurang dari ${K.MASALAH.KOMP_MIN} komponen tersedia, masalah tidak dibuat. Kelas P1 bila skor ${nf(kl.P1_S, 2)} atau lebih, atau bahaya ${nf(kl.P1_H, 2)} atau lebih dengan celah kapasitas ${nf(kl.P1_K, 2)} atau lebih; P2 bila skor ${nf(kl.P2_S, 2)} atau lebih; selebihnya P3. Masalah dibuat bila skor minimal ${nf(K.MASALAH.S_MIN, 2)}; di bawahnya hanya tampil di profil bahaya. Bobot dan ambang adalah asumsi kebijakan, belum dikalibrasi.</p>` : `<p class="km-kosong">${TIDAK}</p>`;
    const yakin = '<ul class="km-bukti"><li>Tanpa label: data resmi atau terverifikasi, yaitu angka langsung dari sumber pemerintah atau hasil hitung geometri atasnya.</li><li><em class="ak-pl">Estimasi model</em>: angka hasil model atau penaksir, bukan pengukuran.</li><li><em class="ak-pl">Asumsi kebijakan</em>: bobot dan ambang yang ditetapkan, belum dikalibrasi.</li><li><em class="ak-pl">Otomatis, belum divalidasi</em>: dibuat mesin dan menunggu pengesahan BPBD.</li></ul>';
    return bag("Sumber dan tanggal semua blok", tabel) + bag("Metode skor masalah", metode) + bag("Label keyakinan", yakin);
  }

  /* ---------- buku kab ---------- */
  async function bukuKab(kab) {
    const [rk, meta, d, bank, pakar] = await Promise.all([get("/data/kemitraan/ringkas.json"), get("/data/meta.json"), get(`/data/kemitraan/daerah/${kab}.json`), get("/data/kemitraan/pertanyaan.json"), get(`/api/kemitraan/daerah/${kab}/pakar`, {headers: {accept: "application/json"}})]);
    if (!d) return kosong("Profil daerah tidak ditemukan", "Kode daerah itu tidak punya profil. Buka buku dari lembar profil di halaman Kemitraan Kampus.");
    if (!rk?.baris?.length) return kosong("Buku gagal dimuat", "Muat ulang halaman atau coba lagi nanti.");
    const prov = meta?.provinsi || {};
    D.atur(rk.baris, prov);
    const r = rk.baris.find(x => x.k === kab) || null;
    document.title = `Buku profil ${d.nama} | Centurisk97`;
    const bab = (n, judul, kunci, catatan) => {
      let isi; try { isi = n === 9 ? BAB[9](d, r, bank) : BAB[n](d, r); } catch (e) { console.warn("kemitraan buku bab", n, e); isi = kosongHtml("Bab gagal disusun", "Data bab ini tidak bisa diolah."); }
      return babHtml("bab-" + n, `${n}. ${judul}`, isi, kakiHtml(kunci.map(k => d[k]), catatan));
    };
    const bukti = (d.masalah || []).flatMap(m => m.bukti || []), tanggalBukti = bukti.map(x => x.tanggal).filter(Boolean).sort().pop();
    const sampulHtml = `<section class="km-sampul" id="sampul"><p class="km-sampul-kop">Buku profil daerah</p><h1>${esc(d.nama)}</h1><p>${esc(prov[d.prov] || "")}</p><p>${r ? irbi(r) : ""}</p><div id="bkPeta" class="km-peta"></div><p class="km-ket">Dibangun ${esc(tgl(d.dibangun))}. Angka bersumber dari data resmi dan terbuka, sebagian berupa estimasi model; IRBI bukan data terbuka. Masalah dan pakar dihitung otomatis dan belum divalidasi BPBD.</p><p class="km-merek">Centurisk97</p></section>`;
    const p8 = pakar ? pakarHtml(pakar) : null;
    const html = sampulHtml
      + babHtml("ringkasan", "Ringkasan", ringkasanKab(d, r), kakiHtml([d.penduduk, d.irbi, d.kejadian, d.kapasitas, {sumber: "Masalah otomatis (ALGORITMA §3)", tanggal: tanggalBukti}]))
      + bab(1, "Gambaran wilayah", ["wilayah", "penduduk", "sosek"])
      + bab(2, "Indeks risiko", ["irbi"])
      + bab(3, "Profil per bahaya", ["inarisk_kec", "kejadian", "gempa", "karhutla", "kekeringan", "gunungapi", "pesisir", "udara", "model"], "Tahun 2024 jenis DIBI dikecualikan (data tidak lengkap); tahun yang belum penuh ditandai di grafiknya.")
      + bab(4, "Riwayat kejadian", ["kejadian"], "Jumlah semua jenis sudah termasuk 2024 (seri CKAN); jenis DIBI tanpa 2024 karena datanya tidak lengkap.")
      + bab(5, "Paparan dan fasilitas", ["fasilitas", "penduduk", "gunungapi"], cakupan5(d))
      + bab(6, "Kapasitas", ["kapasitas"])
      + babHtml("bab-7", "7. Masalah prioritas", (() => { try { return BAB[7](d); } catch (e) { return kosongHtml("Bab gagal disusun", "Data bab ini tidak bisa diolah."); } })(), kakiHtml([{sumber: "Masalah otomatis (ALGORITMA §3) dengan bukti per butir", tanggal: tanggalBukti}, d.model]))
      + (p8 ? babHtml("bab-8", "8. Pakar dan solusi", p8, kakiHtml([{sumber: "OpenAlex (abstrak karya ilmiah terbuka)", tanggal: pakar?.tanggal || pakar?.dibangun, tanggal_arti: "hari-data"}], "Kutipan diambil dari abstrak, bukan rekomendasi BNPB.")) : "")
      + babHtml("bab-9", `${p8 ? 9 : 8}. Panduan pendataan`, BAB[9](d, r, bank), kakiHtml([d.penduduk, d.irbi, d.kejadian], "Pertanyaan disusun otomatis dari data profil itu dan belum divalidasi; kotak kosong untuk diisi tulisan tangan."))
      + babHtml("lampiran", "Lampiran", lampiranHtml(d), `<footer class="km-kaki">${esc(`Dicetak ${new Date().toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"})}.`)}</footer>`);
    $("bkIsi").innerHTML = html;
    pasangAkhir($("bkIsi"));
    $("bab-9")?.querySelectorAll("a.ak-tbl, ul.ak-lsumber").forEach(x => (x.tagName === "A" ? x.parentElement : x).remove());   // kontrol layar tak berguna di kertas
    document.querySelectorAll("#bkIsi .km-kv dd").forEach(x => { if (!x.children.length && x.textContent.trim() === "–") x.textContent = "Tidak ada data"; });
    D.peta($("bkPeta"), d.prov, kab).then(() => { const k = $("bab-1")?.querySelector("#kmPeta"); if (k) D.peta(k, d.prov, kab); }).catch(() => {});
  }

  /* ---------- buku prov (PD §4): ringkasan, tabel kab, masalah P1 lintas kab ---------- */
  async function bukuProv(nn) {
    const [pv, rk, meta] = await Promise.all([get(`/data/kemitraan/prov/${nn}.json`), get("/data/kemitraan/ringkas.json"), get("/data/meta.json")]);
    if (!pv || !rk?.baris?.length) return kosong("Profil provinsi tidak ditemukan", "Kode provinsi itu tidak punya profil. Buka buku dari halaman Kemitraan Kampus.");
    D.atur(rk.baris, meta?.provinsi || {});
    document.title = `Buku profil ${pv.nama} | Centurisk97`;
    const ir = pv.irbi || {}, mn = pv.masalah_n || {}, kab = pv.kab || [];
    const kaki = teks => kakiHtml([pv], teks);
    const kartu = [["Kabupaten/kota", E(pv.n_kab, 0), "berprofil"], ["Penduduk", E(pv.penduduk?.total, 0), pv.penduduk ? `jiwa, ${nf(pv.penduduk.n_ikut, 0)} kab ikut` : TIDAK], ["IRBI rerata tertimbang", E(ir.rerata_tertimbang), ir.n_estimasi ? `${nf(ir.n_estimasi, 0)} kab berskor estimasi` : "penduduk sebagai bobot"], ["Kab kelas Tinggi", E(ir.tinggi_n, 0), `Sedang ${nf(ir.sedang_n, 0)}, tanpa data ${nf(ir.tanpa_data_n, 0)}`], ["Masalah P1", E(mn.P1, 0), `P2 ${nf(mn.P2, 0)}, P3 ${nf(mn.P3, 0)}`]];
    const angkaHtml = `<div class="km-bk-angka">${kartu.map(([l, v, s]) => `<div><span>${esc(l)}</span><b>${v}</b><small>${esc(s)}</small></div>`).join("")}</div><p>${OTO} Masalah dihitung otomatis dari data tiap kab/kota dan menunggu pengesahan BPBD.</p>`;
    const tabelKab = tabelHtml([["Kabupaten/kota"], ["IRBI", "r"], ["Kelas"], ["Penduduk", "r"], ["P1", "r"], ["P2", "r"], ["P3", "r"]], kab.map(x => [esc(x.n), E(x.i), esc(KELAS[x.c] || "–") + (x.y === "estimasi-model" ? ' <em class="ak-pl">Estimasi model</em>' : ""), E(x.pd, 0), E(x.m?.[0], 0), E(x.m?.[1], 0), E(x.m?.[2], 0)]));
    const p1 = kab.flatMap(x => (x.p1 || []).map(m => [x.n, m])).sort((a, b) => (b[1].s ?? 0) - (a[1].s ?? 0));
    const p1Html = p1.length ? tabelHtml([["Kabupaten/kota"], ["Masalah"], ["Skor", "r"]], p1.map(([n, m]) => [esc(n), esc(m.j), D.sk(m.s)])) : `<p class="km-kosong">Tidak ada masalah P1 di provinsi ini.</p>`;
    const html = `<section class="km-sampul" id="sampul"><p class="km-sampul-kop">Buku profil provinsi</p><h1>${esc(pv.nama)}</h1><p class="km-ket">Kab/kota diwarnai menurut kelas IRBI 2025.</p><div id="bkPeta" class="km-peta"></div><p class="km-merek">Centurisk97</p></section>`
      + babHtml("ringkasan", "Ringkasan", angkaHtml, kaki())
      + babHtml("bab-1", "1. Kabupaten/kota menurut IRBI", tabelKab, kaki("Urut skor IRBI 2025 menurun; kab tanpa data di akhir."))
      + babHtml("bab-2", "2. Masalah P1 lintas kabupaten/kota", p1Html, kaki("Skor 0–1 adalah rata-rata berbobot persentil nasional; bobot asumsi kebijakan."));
    $("bkIsi").innerHTML = html;
    pasangAkhir($("bkIsi"));
    D.peta($("bkPeta"), nn, null).catch(() => {});
  }

  function mulai() {
    const q = new URLSearchParams(location.search), kab = q.get("kab") || "", prov = q.get("prov") || "";
    if (/^\d{4}$/.test(kab)) return bukuKab(kab);
    if (/^\d{2}$/.test(prov)) return bukuProv(prov);
    kosong("Pilih daerah dulu", "Buka buku dari lembar profil daerah di halaman Kemitraan Kampus.");
  }
  $("bkCetak").addEventListener("click", () => window.print());
  mulai();
})();
