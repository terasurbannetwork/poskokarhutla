"use strict";
/* Tab Dampak pesisir (PB-84): paparan dari data yang SUDAH ada, tanpa data baru dan tanpa rute baru (D16).
   1) kab/kota yang titik robnya Waspada atau lebih dalam data (rob.json, model, bukan peringatan resmi) dengan penduduk seluruh kab/kota (paparan_kab.json, WorldPop);
   2) dampak tercatat Banjir Rob di DIBI per kab/kota (rob.json kejadian);
   3) transek abrasi per situs (abrasi.json, Landsat).
   Yang TIDAK ada datanya tidak dikarang: zona genangan rob, bangunan dan fasilitas di zona itu, penduduk di sekitar transek abrasi, kejadian pesisir (kode P) sebagai kejadian terdeteksi.
   Kartu standar .ex-std (AGENTS.md 3.5): kepala = nama seksi, tanpa kalimat temuan, tanpa kaki sumber (sumber di title kepala tabel). */
const Dampak = (() => {
  const W = "#2f7fb8", HIP = "#e58a45";
  const IK = {rob: '<path d="M12 3s-6 6.7-6 11a6 6 0 0 0 12 0c0-4.3-6-11-6-11Z"/>', riwayat: '<path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/>', pelabuhan: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M6 12H4a8 8 0 0 0 16 0h-2M8 10h8"/>', abrasi: '<path d="M2 18c3-3 5-3 8 0s5 3 8 0M3 8l5 3 4-6 4 8 5-3"/>'};
  const svg = (k, u = 15) => `<svg viewBox="0 0 24 24" width="${u}" height="${u}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[k]}</svg>`;
  const pita = (id, nama, ik, isi) => `<section class="dk-bag" id="dk-${id}"><header class="dk-sh" style="--w:${W}"><span class="dk-sn"></span>${svg(ik, 18)}<h2>${nama}</h2></header><div class="dk-kartu">${isi}</div></section>`;
  /* cat = catatan batas data, di DALAM kartu di bawah tabel (bukan paragraf lepas di antara kartu) */
  const kartu = (ey, nama, isi, cat = "") => `<article class="ex ex-std"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${nama}</h3></div></header><div class="ex-bd">${isi}${cat ? `<p class="gp-cat dp-cat">${cat}</p>` : ""}</div></article>`;
  const tabel = (kepala, baris) => `<div class="tw ex-tabel dp-t"><table><thead><tr>${kepala.map(k => { const [t, tip] = k.split("|"); return `<th${tip ? ` title="${esc(tip)}"` : ""}>${t}</th>`; }).join("")}</tr></thead><tbody>${baris.join("")}</tbody></table></div>`;
  const pil = (t, w) => `<span class="pl" style="--w:${w}">${t}</span>`;
  const jt = v => v >= 1e6 ? fmt(Math.round(v / 1e5) / 10) + " juta" : v >= 1e3 ? fmt(Math.round(v / 100) / 10) + " ribu" : fmt(v);
  const nm = (a, b) => `<td translate="no">${esc(a)}<small class="dk-s">${esc(b)}</small></td>`;
  let PK = null, PEL = null;

  function kartuRob() {
    const SUMBER = "Status: muka laut model Open-Meteo Marine (SMOC) terhadap ambang persentil 95 dan 99 tiap titik, olahan Centurisk97, belum lolos uji balik. Penduduk: WorldPop 2026 dijumlah per kab/kota (paparan_kab.json), seluruh kab/kota, bukan area genangan.";
    const ey = svg("rob", 12) + "Rob " + pil("Hipotesis", HIP);
    if (!S.rob) return kartu(ey, "Kab/kota berstatus rob", `<p class="kosong">Data rob tidak terbaca.</p>`);
    const kode = {}; Object.entries(S.meta?.prov || {}).forEach(([k, n]) => kode[n] = k);
    const D = Pesisir.dampakRob(S.rob, PK, HARI_INI(), kode);
    if (!D) return kartu(ey, "Kab/kota berstatus rob", `<p class="kosong">Data rob terakhir dibuat ${esc(jamWIB(S.rob.dibuat))} dan tidak mencakup ${tglSgk(HARI_INI())}, jadi status tidak ditampilkan.</p>`);
    if (!D.daftar.length) return kartu(ey, "Kab/kota berstatus rob", `<p class="kosong">Tidak ada kab/kota dengan titik berstatus Waspada atau lebih dalam data model sampai ${tglSgk(D.sampai)}. Ini hasil model dan bukan pernyataan bahwa pesisir bebas rob.</p>`);
    const baris = D.daftar.map(x => `<tr>${nm(x.kab, x.prov)}<td class="c">${pilT(x.lv)}</td><td class="c">${tglSgk(x.hari)}</td><td class="n">${fmt(x.titik)}</td><td class="n">${x.jiwa == null ? "–" : fmt(x.jiwa)}</td></tr>`);
    return kartu(ey, "Kab/kota berstatus rob", tabel(["Kab/kota|" + SUMBER, "Status tertinggi|Waspada: muka laut maks harian di atas persentil 95 titik; Siaga: di atas persentil 99; Awas: di atas yang tertinggi teramati.", "Hari puncak|Hari dengan status tertinggi dalam data model, mulai hari ini.", "Titik|Titik pesisir model di kab/kota itu yang berstatus Waspada atau lebih.", "Penduduk kab/kota|WorldPop 2026 seluruh kab/kota; bukan penduduk di area genangan. Tanda – = nama tidak terpasang ke data penduduk."], baris), `Zona genangan rob per bangunan belum ada di data Centurisk97, jadi bangunan dan fasilitas yang terdampak tidak dihitung. ${D.jiwa ? `Penduduk seluruh kab/kota di atas berjumlah ${jt(D.jiwa)} jiwa; ini batas atas keterpaparan, bukan perkiraan yang tergenang.` : ""}${D.tanpaJiwa ? ` ${fmt(D.tanpaJiwa)} kab/kota tanpa pasangan data penduduk.` : ""}`); }

  function kartuRiwayat() {
    const R = Pesisir.dampakRiwayat(S.rob).slice(0, 15), ey = svg("riwayat", 12) + "Riwayat DIBI";
    if (!R.length) return "";
    const SUMBER = "DIBI BNPB, jenis kejadian Banjir Rob, diambil lewat arsip rob Centurisk97 (rob.json). Hanya yang dilaporkan dan dimasukkan ke DIBI. Urut dari terdampak terbanyak.";
    const baris = R.map(x => `<tr>${nm(x.kab, x.prov)}<td class="n">${fmt(x.n)}</td><td class="n">${fmt(x.terdampak)}</td><td class="n">${fmt(x.mengungsi)}</td><td class="n">${fmt(x.rumah)}</td><td class="n">${fmt(x.rusak)}</td><td class="n">${fmt(x.meninggal)}</td><td class="c">${tglTahun(x.akhir)}</td></tr>`);
    return kartu(ey, "Dampak rob tercatat per kab/kota", tabel(["Kab/kota|" + SUMBER, "Kejadian|Jumlah kejadian Banjir Rob yang tercatat di DIBI (Data dan Informasi Bencana Indonesia) untuk kab/kota itu.", "Terdampak (jiwa)|Jumlah jiwa terdampak, dijumlah dari semua kejadian tercatat.", "Mengungsi (jiwa)|Jumlah jiwa mengungsi, dijumlah dari semua kejadian tercatat.", "Rumah terendam|Jumlah rumah terendam, dijumlah dari semua kejadian tercatat.", "Rumah rusak|Jumlah rumah rusak menurut DIBI, dijumlah dari semua kejadian tercatat.", "Meninggal (jiwa)|Jumlah korban meninggal, dijumlah dari semua kejadian tercatat.", "Terakhir|Tanggal kejadian tercatat terakhir."], baris), `Angka tercatat, bukan perkiraan model. Kab/kota tanpa baris belum tentu tanpa rob: hanya yang dilaporkan.`); }

  function kartuPelabuhan() {
    const ey = svg("pelabuhan", 12) + "Pelabuhan " + pil("Hipotesis", HIP), JUDUL = "Pelabuhan di zona rob dan gelombang";
    if (!PEL?.pelabuhan?.length) return kartu(ey, JUDUL, `<p class="kosong">Data pelabuhan belum tersedia.</p>`);
    const kode = {}; Object.entries(S.meta?.prov || {}).forEach(([k, n]) => kode[n] = k);
    const D = S.rob ? Pesisir.dampakRob(S.rob, null, HARI_INI(), kode) : null, G = S.gel && Pesisir.gelHari(S.gel, HARI_INI()).length ? S.gel : null;
    const L = Pesisir.pelabuhanZona(PEL, D, G, HARI_INI());
    const tak = [D ? "" : "status rob", G ? "" : "gelombang"].filter(Boolean).join(" dan ");
    if (!L.length) return kartu(ey, JUDUL, `<p class="kosong">${tak ? `Data ${tak} belum tersedia untuk ${tglSgk(HARI_INI())}.` : `Tidak ada pelabuhan di kab/kota berstatus rob Waspada atau lebih, atau di titik gelombang kelas Tinggi atau lebih, pada ${tglSgk(HARI_INI())}.`} Ini hasil model, bukan penilaian kelayakan pelabuhan; status pelabuhan dari syahbandar.</p>`);
    const baris = L.map(x => `<tr>${nm(x.nama, x.kab + ", " + x.prov)}<td class="c">${x.lv ? pilT(x.lv) : "–"}</td><td class="n">${x.hs == null ? "belum tersedia" : fmt(Math.round(x.hs * 10) / 10) + " m"}</td><td class="c">${x.kelas ? pilGel(x.hs) : "–"}</td></tr>`);
    return kartu(ey, JUDUL, tabel(["Pelabuhan|Pelabuhan OpenStreetMap yang dipasang ke titik rob terdekat dalam 25 km (pelabuhan_kab.json). Hanya pelabuhan yang punya titik rob dalam jarak itu.", "Status rob kab/kota|Status tertinggi titik rob di kab/kota itu dari hari ini sampai akhir data model (Waspada, Siaga, Awas). – = tidak Waspada atau data tak mencakup hari ini.", "Gelombang model|Tinggi gelombang signifikan tertinggi hari ini di titik model pelabuhan itu (Open-Meteo Marine). belum tersedia = pelabuhan tanpa titik model.", "Kelas gelombang|Ambang BMKG: Tinggi 2,5 m, Sangat tinggi 4 m, Ekstrem 6 m."], baris))
      + `<p class="gp-cat">Rob dan gelombang adalah keluaran model, belum lolos uji balik. Status rob berlaku untuk kab/kota, bukan untuk dermaga tertentu.${tak ? ` Data ${tak} belum tersedia hari ini.` : ""}</p>`; }

  function kartuAbrasi() {
    if (!S.abr) return "";
    const D = Pesisir.seriSitus(S.abr).filter(s => s.arah), ey = svg("abrasi", 12) + "Abrasi " + pil("Perkiraan satelit", HIP);
    if (!D.length) return "";
    const SUMBER = "Garis pantai dari citra Landsat 4-9 (USGS lewat Microsoft Planetary Computer), olahan Centurisk97; belum dikoreksi pasang surut dan belum dicek lapangan. Posisi dibanding median " + Pesisir.BASE[0] + " sampai " + Pesisir.BASE[1] + " tiap transek.";
    const baris = D.map(s => { const r = s.arah, so = S.abr.situs.find(x => x.id === s.id), sg = x => (x < 0 ? "-" : "+") + fmt(Math.round(Math.abs(x) / 10) * 10);
      return `<tr>${nm(s.nama, (so?.kab || "") + ", " + (so?.prov || ""))}<td class="n">${fmt(r.M)}</td><td class="n">${fmt(r.mundur100)}</td><td class="n">${sg(r.med)} (${sg(r.q1)} sampai ${sg(r.q3)})</td><td class="c">${r.yAkhir}</td></tr>`; });
    return kartu(ey, "Garis pantai mundur per situs", tabel(["Situs|" + SUMBER, "Transek|Transek yang punya data di tahun akhir.", "Mundur lebih dari 100 m|Cacah transek yang garis pantainya mundur lebih dari 100 m ke darat dari posisi dasar.", "Median perubahan (m)|Median, dengan rentang antarkuartil di kurung, dibulatkan 10 m; negatif = mundur. Sebagian transek bertanda tinjau (lompatan citra): arah kokoh, besar tidak pasti.", "Tahun akhir"], baris), `Penduduk dan bangunan di sekitar transek belum dihitung: tidak ada data jarak permukiman ke garis pantai.`); }

  function render() {
    const el = $("#dampak"); if (!el || el._ok) return; el._ok = 1;
    el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak pesisir…</div>`;
    Promise.all([opsi("../banjir/data/paparan_kab.json"), opsi("data/pelabuhan_kab.json")]).then(([pk, pel]) => { PK = pk?.kab ? pk : null; PEL = pel;
      const aman = f => { try { return f() || ""; } catch (e) { console.error(e); return ""; } };
      const h = [pita("rob", "Rob dan penduduk", "rob", aman(kartuRob) + aman(kartuRiwayat) + aman(kartuPelabuhan)), pita("abrasi", "Abrasi pantai", "abrasi", aman(kartuAbrasi))].filter(x => x.includes("ex-std"));
      el.innerHTML = h.length ? h.join("") : `<p class="kosong">Data dampak pesisir belum tersedia.</p>`;
      unduh(); sinyal(el); }); }
  /* tombol unduh tabel (F-34): hanya bila registri menyalakan kemampuan.layar.unduh_tabel; digambar ulang saat registri selesai terbaca */
  function unduh() { const el = $("#dampak"), t = window.UnduhTabel?.tombol() || ""; if (!el || !el.querySelector(".ex-std")) return;
    let b = el.querySelector("#dkUnduh"); if (!t) { b?.remove(); return; }
    if (!b) { b = document.createElement("div"); b.id = "dkUnduh"; b.style.cssText = "display:flex;justify-content:flex-end;padding:0 2px 6px"; el.prepend(b); }
    b.innerHTML = t; }
  window.DampakUnduh = unduh;
  /* kartu Sinyal komunikasi (F-41, PB-81.2): hanya konteks provinsi, awal di provinsi kab/kota berstatus rob teratas; digerbangi kemampuan.layar.sinyal */
  function sinyal(el) { if (typeof SinyalInti === "undefined") return;
    const kode = {}; Object.entries(S.meta?.prov || {}).forEach(([k, n]) => kode[n] = k);
    SinyalInti.pasang(el, {id: "pesisir", prov: () => { const D = S.rob ? Pesisir.dampakRob(S.rob, null, HARI_INI(), kode) : null; return D?.daftar[0] ? kode[D.daftar[0].prov] : null; }}); }
  return {render};
})();
