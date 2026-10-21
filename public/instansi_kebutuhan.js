/* Tampilan kebutuhan pemadaman dari rekomendasi.kebutuhan (pipeline) berdampingan dengan yang ada di lapangan. SATU modul untuk /instansi dan /admin/instansi.
   Memakai /inti/format.js (fmt, esc, jamWIB) yang dimuat lebih dulu. Angka tunggal atau [rendah, tengah, tinggi]; nilai bukan angka tidak pernah dicetak sebagai NaN,
   objek tak dikenal diratakan satu tingkat dengan label dari kunci. Utama = per_ha x luas terkonfirmasi (dihitung Worker); hitungan satelit = sekunder. */
(() => {
  "use strict";
  const PER_HA = {regu_hari: "Regu-hari", personel_hari: "Personel-hari", air_l: "Air (liter)", bbm_l: "BBM (liter)", pompa_unit_hari: "Pompa (unit-hari)"};
  const TOTAL = {regu: "Regu", personel: "Personel", selang_m: "Selang (m)", bor: "Bor", heli: "Helikopter", air_l_hari: "Air (liter per hari)", jet_shooter: "Jet shooter", lance_cm: "Lance (cm)", tangki_fleksibel: "Tangki fleksibel", mobil_tangki: "Mobil tangki"};
  const KELAS = {tekanan_tinggi: "Tekanan tinggi", debit_besar: "Debit besar", jinjing_ringan: "Jinjing ringan", portabel_besar: "Portabel besar"};
  const UNTUK = {celup: "pompa celup sumur bor", logistik: "logistik (isi daya drone termal dan HT, penerangan malam)"};
  const num = v => typeof v === "number" && Number.isFinite(v);
  const label = (peta, k) => peta[k] || String(k).replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
  /* angka: tunggal apa adanya; tiga angka "rendah–tinggi, tengah N"; selain itu "–" (tidak pernah NaN) */
  function rentang(v) {
    if (num(v)) return fmt(v);
    if (Array.isArray(v) && v.length && v.every(num)) return v.length === 3 ? `${fmt(v[0])}–${fmt(v[2])}, tengah ${fmt(v[1])}` : v.map(fmt).join("–");
    return "–";
  }
  /* boolean dan null tidak pernah dicetak sebagai "Ya/Tidak" (maknanya hanya ada di kunci tertentu, lihat energi di bawah) */
  const nilai = v => rentang(v);
  /* baris daftar berlabel; yang bukan angka dibuang, bukan dicetak mentah */
  const baris = (peta, o, satuan = "") => Object.entries(o && typeof o === "object" ? o : {}).map(([k, v]) => [k, nilai(v), v]).filter(([, t]) => t !== "–")
    .map(([k, t, v]) => `<li>${esc(label(peta, k))}: ${t}${num(v) || Array.isArray(v) ? satuan : ""}</li>`).join("");
  const pompa = p => !Array.isArray(p) ? "" : p.filter(x => x && typeof x === "object" && rentang(x.unit) !== "–").map(x => `<li>${esc(KELAS[x.kelas] || x.kelas || "Pompa")}${num(x.hp) ? ` (${fmt(x.hp)} HP)` : ""}: ${rentang(x.unit)} unit</li>`).join("");
  /* energi (bentuk scripts/data/taktik.py): bbm_l_hari [3]|null, bbm_lengkap, genset = larik {untuk, unit[3], kva_hitung, kva_komersial, celup?}|null (null = tanpa beban listrik nyata),
     jaringan_pln = null (BELUM ADA DATA jaringan; bukan "tidak ada"). Boolean lama dibaca bermakna: genset diperlukan atau tidak, jaringan tersedia atau tidak. */
  function energi(en) {
    const o = [];
    if ("bbm_l_hari" in en) o.push(rentang(en.bbm_l_hari) !== "–" ? `<li>BBM (liter per hari): ${rentang(en.bbm_l_hari)}${en.bbm_lengkap === false ? " (sebagian kelas pompa belum diketahui konsumsinya)" : ""}</li>` : `<li>BBM: konsumsi belum diketahui</li>`);
    const g = en.genset;
    if (Array.isArray(g)) for (const x of g.filter(y => y && typeof y === "object")) {
      const kva = num(x.kva_komersial) ? `, masing-masing ${fmt(x.kva_komersial)} kVA${num(x.kva_hitung) ? ` (hitungan ${fmt(x.kva_hitung)} kVA)` : ""}` : "";
      o.push(`<li>Genset untuk ${esc(UNTUK[x.untuk] || x.untuk || "beban listrik")}: ${rentang(x.unit)} unit${kva}${rentang(x.celup) !== "–" ? `, melayani ${rentang(x.celup)} pompa celup` : ""}</li>`);
    } else if (g === null || typeof g === "boolean") o.push(`<li>Genset: ${g === true ? "diperlukan" : "tidak diperlukan, tanpa beban listrik yang dihitung"}</li>`);
    if ("jaringan_pln" in en) o.push(`<li>Jaringan PLN: ${en.jaringan_pln === true ? "tersedia" : en.jaringan_pln === false ? "tidak tersedia" : "belum ada data jaringan"}</li>`);
    return o.join("");
  }
  /* t = tugas dari Worker (rekomendasi, kebutuhan_konf, luas_terkonfirmasi, kurang). tanpaPil = pil "Perkiraan, belum divalidasi lapangan" sudah tampil di rincian yang sama (cukup sekali). */
  function html(t, tanpaPil) {
    const k = t?.rekomendasi?.kebutuhan; if (!k || typeof k !== "object") return "";
    const konf = t.kebutuhan_konf, luasSat = k.dasar?.luas_ha, tot = k.total && typeof k.total === "object" ? k.total : null;
    const {pompa: _p, ...totalLain} = tot || {};
    const hari = k.hari_provinsi, melampaui = k.melampaui_rujukan_lapangan, en = k.energi && typeof k.energi === "object" ? k.energi : null;
    return `<div class="kb-rek">${tanpaPil ? "" : `<div><span class="kb-pil kuning">Perkiraan, belum divalidasi lapangan</span></div>`}
      ${konf ? `<h3>Kebutuhan untuk ${fmt(konf.luas_ha)} ha terkonfirmasi</h3><ul>${baris(PER_HA, konf.per_ha_x_luas)}</ul>` : `<p class="kb-redup">Belum ada luas terbakar dari lokasi. Isi luas saat konfirmasi atau kabar supaya kebutuhan dihitung untuk luas sebenarnya.</p>`}
      ${tot ? `<h3>${konf ? "Dari hitungan satelit" : "Kebutuhan dari hitungan satelit"}${rentang(luasSat) !== "–" ? ` (luas ${rentang(luasSat)} ha)` : ""}</h3><ul>${baris(TOTAL, totalLain)}${pompa(tot.pompa)}</ul>` : ""}
      ${rentang(hari) !== "–" ? `<p>Setara ${rentang(hari)} hari kerja satu provinsi.</p>` : ""}
      ${melampaui ? `<p><span class="kb-pil kuning">Melampaui rujukan lapangan</span> ${typeof melampaui === "string" ? esc(melampaui) : ""}</p>` : ""}
      ${en ? `<h3>Energi</h3><ul>${energi(en)}</ul>` : ""}
      ${t.kurang?.length ? `<p>${t.kurang.map(x => `<span class="kb-pil merah">${esc(x.teks)}</span>`).join(" ")}</p>` : ""}</div>`;
  }
  /* Gudang terdekat dengan alat siap (gudang_terdekat dari Worker): jarak garis lurus, pemilik, alat siap per kategori; kelas pompa yang direkomendasikan pipeline disorot.
     gt = {gudang: [{nama, jarak_km, kab, pemilik: {nama}, milik_saya, alat: [{label, kategori, kelas_pompa, hp, jumlah}]}], pompa: [{kelas, label, perlu, total_siap, tersedia}]} atau null (inventaris belum aktif). */
  function gudang(gt) {
    if (gt == null) return "";
    const G = Array.isArray(gt.gudang) ? gt.gudang : [], P = Array.isArray(gt.pompa) ? gt.pompa : [], rek = new Set(P.map(p => p.kelas).filter(Boolean));
    const kelasTeks = k => label(KELAS, k).toLowerCase();
    const alat = a => { const sorot = a.kategori === "pompa" && rek.has(a.kelas_pompa), nama = a.kategori === "pompa" && a.kelas_pompa ? `Pompa ${kelasTeks(a.kelas_pompa)}${num(a.hp) ? ` ${fmt(a.hp)} HP` : ""}` : a.label || label({}, a.kategori);
      return `<li${sorot ? ' class="kb-sorot"' : ""}>${esc(nama)}: <b>${fmt(a.jumlah)}</b> siap${sorot ? ` <span class="kb-pil hijau">Sesuai rekomendasi</span>` : ""}</li>`; };
    const pompaTeks = p => { const nama = p.kelas ? `Pompa ${kelasTeks(p.kelas)}` : `Pompa ${esc(p.label || "")}`.trim(), perlu = num(p.perlu) ? `perlu ${fmt(p.perlu)} unit` : "jumlah belum dihitung";
      if (!p.tersedia?.length) return `<li>${nama}${num(p.hp) ? ` (${fmt(p.hp)} HP)` : ""}: ${perlu}, <b>belum ada yang siap</b> di gudang terdekat</li>`;
      const t = p.tersedia[0]; return `<li>${nama}${num(p.hp) ? ` (${fmt(p.hp)} HP)` : ""}: ${perlu}, siap <b>${fmt(p.total_siap)}</b> unit, terdekat di ${esc(t.nama)} (${fmt(t.jarak_km)} km)</li>`; };
    return `<div class="kb-rek kb-gudang"><h3>Gudang terdekat dengan alat siap</h3>
      ${P.length ? `<p><b>Pompa yang direkomendasikan</b></p><ul>${P.map(pompaTeks).join("")}</ul>` : ""}
      ${G.length ? `<ul class="kb-gudang-daftar">${G.map(g => `<li><div class="kb-g-kepala"><b>${esc(g.nama)}</b><span class="kb-pil">${fmt(g.jarak_km)} km</span>${g.milik_saya ? `<span class="kb-pil hijau">Milik kita</span>` : ""}</div>
        <p class="kb-redup">${esc((window.Wilayah?.teks ?? String)([g.pemilik?.nama, g.kab].filter(Boolean).join(", ")))}</p><ul>${(g.alat || []).map(alat).join("") || "<li>Tidak ada alat siap</li>"}</ul></li>`).join("")}</ul>`
        : `<p class="kb-redup">Belum ada gudang dengan alat siap dalam radius sekitar 300 km dari titik ini.</p>`}</div>`;
  }
  window.Kebutuhan = {html, rentang, gudang};
})();
