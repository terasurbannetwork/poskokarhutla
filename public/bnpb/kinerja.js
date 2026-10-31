"use strict";
/* Kinerja BNPB (halaman publik). Data: /data/bnpb/iku.json (scripts/bnpb/iku.py). Layar hanya menampilkan angka pipeline.
   Butuh /inti/format.js (fmt, esc, $), tip.js (pasangTip, #tip), tabel.js (paginasi), nanti.js. Grafik SVG sendiri, tooltip lewat [data-tip]. */
(() => {
  const el = id => document.getElementById(id);
  const IKON = {resmi: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4", hitung: "M5 4h14v16H5z|M8 8h8|M8 12h2|M14 12h2|M8 16h2|M14 16h2",
    raster: "M3 3h18v18H3z|M3 9h18|M3 15h18|M9 3v18|M15 3v18", batas: "M12 3l9 16H3z|M12 10v4|M12 17v.5", waktu: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M12 7v5l3 2"};
  const svgIkon = k => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IKON[k].split("|").map(d => `<path d="${d}"/>`).join("")}</svg>`;
  const pil = (teks, k, kls = "") => `<span class="bn-pil ${kls}">${svgIkon(k)}${esc(teks)}</span>`;
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = (iso, jam) => { const m = /(\d{4})-(\d\d)-(\d\d)(?:T(\d\d):(\d\d))?/.exec(String(iso)); return m ? `${+m[3]} ${BLN[+m[2] - 1]} ${m[1]}${jam && m[4] ? `, ${m[4]}.${m[5]} WIB` : ""}` : "–"; };
  const n = (v, d = 0) => v == null ? "–" : Number(v).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
  const pct = (v, d = 1) => n(v, d) + "%";
  /* tooltip: baris pertama judul, sisanya "label: nilai"; setiap bagian di-escape lalu seluruh string di-escape sekali lagi untuk atribut */
  const tip = (judul, ...baris) => ` data-tip="${esc(`<b>${esc(judul)}</b><br>${baris.map(b => esc(b)).join("<br>")}`)}"`;
  const kartu = (pilpil, judul, isi, sumber, lebar) => `<article class="bn-kartu kj-kartu${lebar ? " kj-lebar" : ""}"><div class="kj-pilpil">${pilpil.join("")}</div><h3>${esc(judul)}</h3>${isi}<div class="kj-sumber">Sumber: ${esc(sumber)}</div></article>`;
  const bab = (j, t) => `<h2 class="kj-bab">${esc(j)}</h2>${t ? `<p class="kj-p">${esc(t)}</p>` : ""}`;
  const leg = items => `<div class="kj-leg">${items.map(([k, t]) => `<span><i class="${k}"></i>${esc(t)}</span>`).join("")}</div>`;

  /* ---------- grafik garis: seri = [{nama, kls, putus, pts:[{x,y,tip}]}] ---------- */
  function garis({seri, yMin, yMax, yFmt, langkah, aria, satuanX = ""}) {
    const W = 640, H = 250, L = 54, R = 18, T = 14, B = 32, xs = [...new Set(seri.flatMap(s => s.pts.map(p => p.x)))].sort((a, b) => a - b);
    const X = x => xs.length === 1 ? (L + W - R) / 2 : L + (W - L - R) * xs.indexOf(x) / (xs.length - 1), Y = y => T + (H - T - B) * (1 - (y - yMin) / (yMax - yMin));
    let s = `<svg class="kj-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">`;
    for (let v = yMin; v <= yMax + 1e-9; v += langkah) s += `<line class="kj-grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${esc(yFmt(v))}</text>`;
    s += `<line class="kj-sumbu" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>`;
    for (const x of xs) s += `<text x="${X(x)}" y="${H - 10}" text-anchor="middle">${x}${satuanX}</text>`;
    for (const q of seri) {
      const pts = [...q.pts].sort((a, b) => a.x - b.x);
      if (pts.length > 1) s += `<polyline class="kj-garis ${q.kls}${q.putus ? " kj-putus" : ""}" points="${pts.map(p => `${X(p.x)},${Y(p.y)}`).join(" ")}"/>`;
      for (const p of pts) s += `<g${p.tip}><circle class="kj-kena" cx="${X(p.x)}" cy="${Y(p.y)}" r="12" tabindex="0" aria-label="${esc(p.aria || "")}"/><circle class="kj-titik ${q.kls}" cx="${X(p.x)}" cy="${Y(p.y)}" r="${q.putus ? 3.6 : 5}"/></g>`;
    }
    return s + "</svg>";
  }

  /* ---------- grafik batang: kat = [{lab, v:[{v, kls, tip, ket}]}]; tumpuk = ditumpuk, selain itu berdampingan ---------- */
  function batang({kat, tumpuk, yMax, yFmt, langkah, aria}) {
    const W = 640, H = 250, L = 54, R = 18, T = 14, B = 32, lebarK = (W - L - R) / kat.length, Y = y => T + (H - T - B) * (1 - y / yMax);
    let s = `<svg class="kj-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">`;
    for (let v = 0; v <= yMax + 1e-9; v += langkah) s += `<line class="kj-grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${esc(yFmt(v))}</text>`;
    s += `<line class="kj-sumbu" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>`;
    kat.forEach((k, i) => {
      const x0 = L + lebarK * i, isi = lebarK * 0.62, mulai = x0 + (lebarK - isi) / 2; let acc = 0;
      s += `<text x="${x0 + lebarK / 2}" y="${H - 10}" text-anchor="middle">${esc(k.lab)}</text>`;
      k.v.forEach((b, j) => {
        const w = tumpuk ? isi : isi / k.v.length, x = tumpuk ? mulai : mulai + w * j, y0 = tumpuk ? acc : 0, y1 = y0 + b.v; acc = y1;
        if (b.v > 0) s += `<rect class="kj-batang ${b.kls}" x="${x}" y="${Y(y1)}" width="${w - (tumpuk ? 0 : 3)}" height="${Math.max(0, Y(y0) - Y(y1))}" rx="3" tabindex="0"${b.tip} aria-label="${esc(b.ket || "")}"/>`;
        if (!tumpuk) s += `<text class="kj-tebal" x="${x + (w - 3) / 2}" y="${Y(b.v) - 5}" text-anchor="middle">${esc(yFmt(b.v))}</text>`;
        else if (b.v > 0 && Y(y0) - Y(y1) > 14) s += `<text x="${x + w / 2}" y="${(Y(y0) + Y(y1)) / 2 + 4}" text-anchor="middle" fill="#fff">${n(b.v)}</text>`;
      });
    });
    return s + "</svg>";
  }

  const sumberId = (d, id) => d.sumber.find(s => s.id === id);

  /* ---------- (a) kapasitas ---------- */
  function bagianKapasitas(d) {
    const K = d.kapasitas, r = K.resmi, rs = K.raster, kab = r.kab, p25 = r.prov["2025"], p24 = r.prov["2024"];
    const tarLin = r.target_lintasan;
    const grafTarget = garis({aria: "Target persen daerah berkapasitas minimal sedang 2025 sampai 2029 dan capaian 2025", yMin: 40, yMax: 90, langkah: 10, yFmt: v => v + "%",
      seri: [{nama: "Target", kls: "kj-s0", putus: true, pts: tarLin.map(t => ({x: t.tahun, y: t.v, tip: tip("Target " + t.tahun, "Daerah berkapasitas minimal sedang: " + pct(t.v, 0)), aria: `Target ${t.tahun}: ${t.v} persen`}))},
             {nama: "Capaian", kls: "kj-s1", pts: [{x: r.tahun, y: r.persen_min_sedang, tip: tip("Capaian " + r.tahun, "Provinsi minimal sedang: " + pct(r.persen_min_sedang, 0), "Target tahun itu: " + pct(r.target, 0), "Kekurangan: " + n(r.target - r.persen_min_sedang) + " poin"), aria: `Capaian ${r.tahun}: ${r.persen_min_sedang} persen`}]}]});
    const A = kartu([pil("Angka resmi", "resmi", "kj-pil-resmi")], `Baru ${pct(r.persen_min_sedang, 0)} provinsi berkapasitas minimal sedang pada ${esc(r.tahun)}, target ${pct(r.target, 0)}`,
      `<div class="kj-angka-baris"><div><span class="bn-angka">${pct(r.persen_min_sedang, 0)}</span><span class="bn-label">capaian ${esc(r.tahun)}</span></div><div><span class="bn-angka">${pct(r.target, 0)}</span><span class="bn-label">target ${esc(r.tahun)}</span></div><div><span class="bn-angka">${pct(tarLin[tarLin.length - 1].v, 0)}</span><span class="bn-label">target ${esc(tarLin[tarLin.length - 1].tahun)}</span></div></div>${grafTarget}${leg([["lt", "Target Renstra"], ["lc", "Capaian"]])}
       <p class="kj-p">Capaian ${r.persen_min_sedang} persen dihitung atas ${n(p25.rendah + p25.sedang + p25.tinggi)} provinsi: ${n(p25.sedang)} provinsi minimal sedang dan ${n(p25.rendah)} rendah. Kelas sedang berarti nilai Indeks Ketahanan Daerah 0,4 sampai 0,8 (LAKIP hal. 20).</p>`,
      r.sumber);
    const riw = r.prov_riwayat;
    const grafProv = batang({tumpuk: true, yMax: 40, langkah: 10, yFmt: v => n(v), aria: "Jumlah provinsi per kelas kapasitas 2021 sampai 2025",
      kat: Object.keys(riw).map(t => ({lab: t, v: [["Rendah", "kj-b0"], ["Sedang", "kj-b1"], ["Tinggi", "kj-b2"]].map(([nm, kls], i) => ({v: riw[t][i], kls, ket: `${t} ${nm}: ${esc(riw[t][i])} provinsi`, tip: tip(`Provinsi ${t}`, `Kelas ${nm.toLowerCase()}: ${n(riw[t][i])} provinsi`, `Dari ${n(riw[t].reduce((a, b) => a + b, 0))} provinsi`)}))}))});
    const B = kartu([pil("Angka resmi", "resmi", "kj-pil-resmi")], `Provinsi kelas rendah naik dari ${p24.rendah} pada 2024 menjadi ${p25.rendah} pada 2025`,
      `${grafProv}${leg([["l0", "Rendah"], ["l1", "Sedang"], ["l2", "Tinggi"]])}<p class="kj-p">Nilai provinsi adalah rata-rata IKD kabupaten/kota di dalamnya. Provinsi dengan kontribusi penilaian IKD minim: Sulawesi Utara, Papua Barat, Papua Tengah, Papua Pegunungan. Anggaran penilaian di sejumlah daerah terdampak refocusing (LAKIP hal. 20).</p>`,
      "LAKIP BNPB 2025 hal. 20 (Tabel 3.3)");
    const tot = kab.total;
    const grafKab = batang({yMax: 300, langkah: 100, yFmt: v => n(v), aria: "Jumlah kabupaten dan kota per kelas kapasitas, IKD resmi 2025",
      kat: [["Rendah", "kj-b0", kab.rendah], ["Sedang", "kj-b1", kab.sedang], ["Tinggi", "kj-b2", kab.tinggi]].map(([lab, kls, v]) => ({lab, v: [{v, kls, ket: `${lab}: ${v}`, tip: tip(`Kelas ${lab.toLowerCase()}`, `Kabupaten/kota: ${n(v)}`, `Porsi: ${pct(v / tot * 100)} dari ${n(tot)}`)}]}))});
    const C = kartu([pil("Angka resmi", "resmi", "kj-pil-resmi")], `${n(kab.rendah)} dari ${n(tot)} kabupaten/kota berkapasitas rendah, lebih banyak dari 2024`,
      `${grafKab}<p class="kj-p">${n(kab.menilai)} kabupaten/kota melakukan penilaian IKD 2025; ${n(tot - kab.menilai)} lainnya memakai hasil tahun terakhir, dan yang belum pernah menghitung diberi nilai level 1 (0,2). Hitungan kita dari angka itu: ${n(kab.sedang + kab.tinggi)} dari ${n(tot)} kabupaten/kota (${pct((kab.sedang + kab.tinggi) / tot * 100)}) minimal sedang. Ini bukan angka IKU, karena IKU dihitung atas provinsi.</p>`,
      "LAKIP BNPB 2025 hal. 22");
    return bab("Kapasitas daerah (IKU 1.2)") + `<div class="kj-baris">${A}${B}${C}</div>` + `<div id="daftarKerja"></div>`;
  }

  /* ---------- daftar kerja kab kapasitas rendah (raster) ---------- */
  function daftarKerja(d) {
    const rs = d.kapasitas.raster, host = el("daftarKerja"), PER = 15, semuaProv = [...new Set(rs.kab_rendah.map(x => x.prov))].sort((a, b) => a.localeCompare(b, "id"));
    host.innerHTML = `<article class="bn-kartu kj-kartu"><div class="kj-pilpil">${pil("Raster InaRISK, bukan IKD resmi", "raster", "kj-pil-raster")}${pil("Urut dari kapasitas terendah", "hitung", "")}</div>
      <h3>${n(rs.kab.rendah)} kabupaten/kota berkapasitas rendah menurut raster InaRISK, mulai dari yang terendah</h3>
      <p class="kj-p">${esc(rs.catatan)} Menurut raster, ${pct(rs.persen_min_sedang)} dari ${n(rs.kab.total)} kabupaten/kota minimal sedang. Kabupaten/kota tanpa nilai raster: ${n(rs.kab_tanpa_nilai.length)}. Daerah tanpa nilai tidak dibaca sebagai kapasitas nol.</p>
      <div class="kj-kontrol"><label class="bn-isian">Provinsi<select id="fProv"><option value="">Semua provinsi (${n(rs.kab_rendah.length)})</option>${semuaProv.map(p => `<option>${esc(p)}</option>`).join("")}</select></label>
        <label class="bn-isian">Cari kabupaten/kota<input id="fCari" type="search" autocomplete="off" placeholder="Ketik nama"></label></div>
      <div class="kj-tabel"><div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr><th>Urutan</th><th>Kabupaten/kota</th><th>Provinsi</th><th>Kapasitas raster (0 sampai 0,79)</th></tr></thead><tbody id="isiKerja"></tbody></table></div></div>
      <div id="halKerja"></div><div class="kj-sumber">Sumber: ${esc(sumberId(d, "ikd_raster").dokumen)}; ambang kelas rendah di bawah ${n(rs.ambang?.rendah_di_bawah, 2)}</div></article>`;
    const semua = rs.kab_rendah.map((x, i) => ({...x, no: i + 1}));
    let hal = 0, daftar = semua;
    /* gambar hanya mengiris daftar terfilter; penyaringan (berat) hanya di ulang() */
    const gambar = () => {
      hal = Math.min(hal, Math.max(0, Math.ceil(daftar.length / PER) - 1));
      el("isiKerja").innerHTML = daftar.length ? daftar.slice(hal * PER, (hal + 1) * PER).map(x => `<tr><td class="n" data-label="Urutan">${n(x.no)}</td><td data-label="Kabupaten/kota">${esc(x.nama)}</td><td data-label="Provinsi">${esc(x.prov)}</td><td class="n" data-label="Kapasitas raster">${n(x.c, 2)}</td></tr>`).join("") : `<tr><td colspan="4" class="kj-kosong">Tidak ada kabupaten/kota yang cocok.</td></tr>`;
      el("halKerja").innerHTML = paginasi(hal, daftar.length, PER, "kabupaten/kota");
    };
    const ulang = () => window.nanti(() => {
      const p = el("fProv").value, q = el("fCari").value.trim().toLowerCase();
      daftar = semua.filter(x => (!p || x.prov === p) && (!q || x.nama.toLowerCase().includes(q))); hal = 0; gambar();
    });
    el("fProv").addEventListener("change", ulang);
    el("fCari").addEventListener("input", ulang);
    /* chrome paginasi (.on, aria-current) berubah seketika, isi tabel menyusul sesudah frame tercat (pola tabel.js) */
    el("halKerja").addEventListener("click", e => { const b = e.target.closest(".pgn-b[data-h]"); if (!b || b.disabled) return;
      el("halKerja").querySelectorAll(".pgn-b.on").forEach(x => { x.classList.remove("on"); x.removeAttribute("aria-current"); });
      if (/^\d+$/.test(b.textContent.trim())) { b.classList.add("on"); b.setAttribute("aria-current", "page"); }
      hal = +b.dataset.h; window.nanti(gambar); });
    gambar();
  }

  /* ---------- (b) IRB ---------- */
  function bagianIRB(d) {
    const I = d.irb, [lama, krb, seb] = I.deret, T = I.target;
    const gLama = garis({aria: "IRB metode lama 2019 sampai 2024, capaian dan target", yMin: 120, yMax: 150, langkah: 10, yFmt: v => n(v),
      seri: [{kls: "kj-s0", putus: true, pts: lama.target.map(t => ({x: t.tahun, y: t.v, tip: tip("Target " + t.tahun, "IRB: " + n(t.v, 2)), aria: `Target ${t.tahun}: ${t.v}`}))},
             {kls: "kj-s1", pts: lama.nilai.map(t => ({x: t.tahun, y: t.v, tip: tip("Capaian " + t.tahun, "IRB (metode lama): " + n(t.v, 2)), aria: `Capaian ${t.tahun}: ${t.v}`}))}]});
    const gKrb = garis({aria: "IRB bahaya dan kerentanan KRB 2021, 2024 dan 2025", yMin: 160, yMax: 180, langkah: 10, yFmt: v => n(v),
      seri: [{kls: "kj-s1", pts: krb.nilai.map(t => ({x: t.tahun, y: t.v, tip: tip("IRB " + t.tahun, "Deret KRB 2021: " + n(t.v, 2), t.tahun === 2025 ? "Turun " + pct(krb.turun_persen, 2) + " dari 2024" : "Tahun pembanding"), aria: `${t.tahun}: ${t.v}`}))}]});
    const gSeb = garis({aria: "Baseline IRB 147,95 pada 2025 dan lintasan target turun 1,2 persen per tahun sampai 2029", yMin: 135, yMax: 150, langkah: 5, yFmt: v => n(v),
      seri: [{kls: "kj-s0", putus: true, pts: [{x: 2025, y: T.baseline, tip: tip("Baseline 2025", "IRB (SEB): " + n(T.baseline, 2), "Dasar lintasan 2026 sampai 2029"), aria: `Baseline 2025: ${T.baseline}`}, ...T.lintasan.map(t => ({x: t.tahun, y: t.v, tip: tip("Target " + t.tahun, "IRB: " + n(t.v, 2), "Turun " + n(T.turun_persen_per_tahun, 1) + "% per tahun dari baseline", "Hitungan kita, bukan angka dokumen"), aria: `Target ${t.tahun}: ${t.v}`}))]}]});
    const kartuIrb = (ket, judul, graf, legenda, p, sumber) => kartu([pil("Angka resmi", "resmi", "kj-pil-resmi"), pil(ket, "batas", "kj-pil-batas")], judul, graf + legenda + `<p class="kj-p">${esc(p)}</p>`, sumber);
    const A = kartuIrb("Deret 1 dari 3", `Metode lama: IRB turun dari ${n(lama.nilai[0].v, 2)} pada 2019 ke ${n(lama.nilai[5].v, 2)} pada 2024, turun ${pct(lama.turun_persen, 2)}`, gLama, leg([["lt", "Target"], ["lc", "Capaian"]]),
      "Target lama (turun 10 persen) tercapai pada 2023 dan 2024, belum pada 2020 sampai 2022. Deret ini berhenti di 2024.", lama.sumber);
    const B = kartuIrb("Deret 2 dari 3", `Bahaya dan kerentanan KRB 2021: IRB ${n(krb.nilai[0].v, 2)} ke ${n(krb.nilai[1].v, 2)}, turun ${pct(krb.turun_persen, 2)}, di bawah target 1,2% (hitungan LAKIP memakai 170,19)`, gKrb, "",
      krb.catatan, krb.sumber);
    const C = kartuIrb("Deret 3 dari 3", `Baseline baru ${n(T.baseline, 2)} pada 2025; lintasan turun ${n(T.turun_persen_per_tahun, 1)}% per tahun menjadi ${n(T.lintasan[T.lintasan.length - 1].v, 2)} pada 2029 (hitungan kita, bukan angka dokumen)`, gSeb, leg([["lt", "Baseline dan lintasan (hitungan kita, bukan angka dokumen)"]]),
      T.rumus + ".", T.sumber);
    const cp = I.capaian_turun_persen;
    const lamaCp = cp.filter(c => c.tahun < 2025), c25 = cp.find(c => c.tahun === 2025);
    const gLamaCp = batang({yMax: 3.5, langkah: 1, yFmt: v => n(v, 1), aria: "Penurunan IRB per tahun 2021 sampai 2024, metode lama, dibaca dari grafik LAKIP",
      kat: lamaCp.map(c => ({lab: String(c.tahun), v: [{v: c.capaian, kls: "kj-bc", ket: `Capaian ${c.tahun}: ${c.capaian}`, tip: tip("Capaian " + c.tahun, "Penurunan IRB: " + pct(c.capaian, 2), "Metode lama, dibaca dari grafik LAKIP", "Tanpa target persen resmi")}]}))});
    const g25 = batang({yMax: 1.5, langkah: 0.5, yFmt: v => n(v, 1), aria: "Penurunan IRB 2025 dengan KRB 2021, target 1,2 persen dan capaian 1,03 persen",
      kat: [{lab: "2025", v: [{v: c25.target, kls: "kj-bt", ket: `Target 2025: ${c25.target}`, tip: tip("Target 2025", "Penurunan IRB: " + pct(c25.target, 1), "IRB KRB 2021")}, {v: c25.capaian, kls: "kj-bc", ket: `Capaian 2025: ${c25.capaian}`, tip: tip("Capaian 2025", "Penurunan IRB: " + pct(c25.capaian, 2), "Di bawah target, selisih " + n(c25.target - c25.capaian, 2) + " poin", "IRB KRB 2021")}]}]});
    const D1 = kartu([pil("Angka resmi", "resmi", "kj-pil-resmi"), pil("Metode lama, dibaca dari grafik LAKIP", "batas", "kj-pil-batas")], "Metode lama: IRB turun 2,01% sampai 2,81% per tahun pada 2021 sampai 2024",
      gLamaCp + leg([["lc", "Capaian"]]) + `<p class="kj-p">Nilai dibaca dari Gambar 3.1 LAKIP. Tidak ada target persen resmi untuk 2021 sampai 2024; target tahunan Renstra lama berupa nilai IRB mutlak dan ada di grafik deret 1.</p>`, "LAKIP BNPB 2025 hal. 19 (Gambar 3.1); Renstra BNPB 2025-2029 hal. 53");
    const D2 = kartu([pil("Angka resmi", "resmi", "kj-pil-resmi"), pil("IRB KRB 2021", "batas", "kj-pil-batas")], "Penurunan IRB 2025: 1,03% dari target 1,2% (IRB KRB 2021)",
      g25 + leg([["lt", "Target"], ["lc", "Capaian"]]) + `<p class="kj-p">Target 1,2% tidak tercapai. Pemutakhiran data bahaya dan kerentanan membuat IRB 2025 tidak sebanding dengan tahun sebelumnya, sehingga penurunan dihitung dengan kerentanan 2021.</p>`, "LAKIP BNPB 2025 hal. 19");
    const W = kartu([pil("Batas perbandingan", "batas", "kj-pil-batas")], "Tiga deret IRB tidak boleh dibandingkan satu sama lain", `<p class="kj-p">${esc(I.catatan)}</p>`, "LAKIP BNPB 2025 hal. 18-19");
    return bab("Indeks Risiko Bencana (IKU 1.1)") + W + `<div class="kj-baris">${A}${B}${C}</div><div class="kj-baris">${D1}${D2}</div>`;
  }

  /* ---------- (c) kerugian terhadap PDB ---------- */
  function bagianPDB(d) {
    const P = d.kerugian_pdb, r = P.realisasi[0], t0 = P.target[0];
    const g = garis({aria: "Kerugian ekonomi langsung terhadap PDB: target 2025 sampai 2029 dan realisasi 2025", yMin: 0.12, yMax: 0.24, langkah: 0.03, yFmt: v => n(v, 2) + "%",
      seri: [{kls: "kj-s0", putus: true, pts: P.target.map(t => ({x: t.tahun, y: t.v, tip: tip("Target " + t.tahun, "Kerugian terhadap PDB: " + n(t.v, 4) + "%"), aria: `Target ${t.tahun}: ${t.v} persen`}))},
             {kls: "kj-s1", pts: [{x: r.tahun, y: r.v, tip: tip("Realisasi " + r.tahun, "Kerugian terhadap PDB: " + n(r.v, 3) + "%", "Kerugian langsung: Rp" + n(r.kerugian_rp_t, 1) + " triliun", "PDB: Rp" + n(r.pdb_rp_t, 1) + " triliun", "Siklon Senyar belum dihitung"), aria: `Realisasi ${r.tahun}: ${r.v} persen`}]}]});
    const k = kartu([pil("Angka resmi", "resmi", "kj-pil-resmi"), pil("Belum termasuk Siklon Senyar", "batas", "kj-pil-batas")], `Kerugian ekonomi 2025 mencapai ${n(r.v, 3)}% PDB, sekitar ${n(r.v / t0.v, 1)} kali target ${n(t0.v, 3)}%`,
      `<div class="kj-angka-baris"><div><span class="bn-angka">${n(r.v, 3)}%</span><span class="bn-label">realisasi ${esc(r.tahun)}</span></div><div><span class="bn-angka">Rp${n(r.kerugian_rp_t, 1)} triliun</span><span class="bn-label">kerugian ekonomi langsung</span></div><div><span class="bn-angka">${n(t0.v, 3)}%</span><span class="bn-label">target ${esc(t0.tahun)}</span></div></div>${g}${leg([["lt", "Target RPJMN"], ["lc", "Realisasi"]])}
       <p class="kj-p">Rp${n(r.kerugian_rp_t, 1)} triliun dibagi PDB Rp${n(r.pdb_rp_t, 1)} triliun. Angka ini belum memasukkan dampak Siklon Tropis Senyar (November 2025) di Aceh, Sumatera Utara, dan Sumatera Barat; rencana rehabilitasi dan rekonstruksinya masih disusun saat laporan selesai, sehingga realisasi 2025 bisa naik. Target turun dari ${n(t0.v, 4)}% menjadi ${n(P.target[4].v, 4)}% pada 2029. Target dirumuskan Bappenas dengan metode BAU dikurangi investasi PB, jadi rasio ini indikatif (Renstra hal. 85).</p>`, P.sumber, true);
    return bab("Kerugian ekonomi terhadap PDB") + k;
  }

  /* ---------- (d) peringatan dini ---------- */
  const NAMA = {gempa: "Gempa bumi", tsunami: "Tsunami", cuaca: "Cuaca ekstrem", karhutla: "Kebakaran hutan dan lahan", banjir: "Banjir"};
  function bagianPeringatan(d) {
    const P = d.peringatan, S = P.sistem_kita, rc = P.renstra_cakupan_persen;
    const g = garis({aria: "Target cakupan layanan peringatan dini 2025 sampai 2029", yMin: 6, yMax: 6.4, langkah: 0.1, yFmt: v => n(v, 1) + "%",
      seri: [{kls: "kj-s0", pts: rc.map(t => ({x: t.tahun, y: t.v, tip: tip(String(t.tahun), "Cakupan layanan peringatan dini: " + pct(t.v, 2), t.tahun === 2025 ? "Realisasi 2025 sama dengan target" : "Target Renstra"), aria: `${t.tahun}: ${t.v} persen`}))}]});
    const A = kartu([pil("Angka resmi", "resmi", "kj-pil-resmi"), pil("Sumbu dipotong, mulai 6%", "batas", "kj-pil-batas")], `Cakupan layanan peringatan dini ${pct(rc[0].v, 2)} pada 2025, target Renstra hanya ${pct(rc[4].v, 2)} pada 2029`,
      `${g}<p class="kj-p">Naik ${n(rc[4].v - rc[0].v, 2)} poin dalam lima tahun. RPJMN mencatat keterpenuhan layanan peringatan dini sekitar ${n(P.rpjmn_keterpenuhan_persen)} persen (Renstra hal. 71). NDPBA mencatat: ${esc(P.ndpba)} (hal. 108-110).</p>`, P.renstra_sumber);
    const lk = P.lakip_cakupan;
    const gl = batang({yMax: 15, langkah: 5, yFmt: v => n(v, 2) + "%", aria: "Cakupan peringatan dini tsunami dan banjir 2025",
      kat: lk.map(x => ({lab: NAMA[x.jenis], v: [{v: x.persen, kls: "kj-bc", ket: `${x.jenis}: ${x.persen} persen`, tip: tip(NAMA[x.jenis], "Cakupan: " + pct(x.persen, 2), "Terpapar: " + n(x.terpapar) + " jiwa", "Tercakup: " + n(x.tercakup) + " jiwa")}]}))});
    const B = kartu([pil("Angka resmi", "resmi", "kj-pil-resmi")], `Cakupan tsunami ${pct(lk[0].persen, 2)}, banjir ${pct(lk[1].persen, 2)} dari penduduk terpapar`,
      `${gl}<p class="kj-p">Rata-rata dua jenis ini ${pct(P.renstra_cakupan_persen[0].v, 2)}, angka yang dilaporkan sebagai cakupan layanan peringatan dini. Banjir: ${n(lk[1].tercakup)} dari ${n(lk[1].terpapar)} jiwa terpapar.</p>`, P.lakip_sumber);
    const baris = S.per_bahaya.map(x => `<tr><td data-label="Bahaya">${esc(NAMA[x.jenis])}</td><td data-label="Pemicu otomatis">${x.pemicu_otomatis ? "Ada: " : "Tidak ada: "}${esc(x.pemicu)}</td><td class="n" data-label="Penduduk terpapar (jiwa)">${x.penduduk_terpapar == null ? "belum ada data" : n(x.penduduk_terpapar) + (x.jenis === "tsunami" ? " (angka resmi LAKIP)" : "")}</td><td class="n" data-label="Porsi penduduk">${x.persen_penduduk == null ? "–" : pct(x.persen_penduduk)}</td><td data-label="Sumber paparan">${esc(x.sumber_paparan || "tidak ada")}</td></tr>`).join("");
    const C = `<article class="bn-kartu kj-kartu"><div class="kj-pilpil">${pil("Ukuran sistem kita", "hitung", "kj-pil-hitung")}${pil("Jangkauan penerima belum terukur", "batas", "kj-pil-batas")}</div>
      <h3>Lima bahaya punya pemicu peringatan otomatis; berapa orang yang menerimanya belum terukur</h3>
      <p class="kj-p">${esc(S.jangkauan_penerima)} Tabel di bawah menghitung sisi pemicu dan penduduk yang berada di zona bahaya sedang ke atas, bukan penduduk yang menerima peringatan, sehingga tidak sebanding dengan angka cakupan Renstra. Total penduduk dalam hitungan: ${n(S.penduduk_total)} jiwa.</p>
      <div class="kj-tabel"><div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr><th>Bahaya</th><th>Pemicu otomatis</th><th>Penduduk terpapar (jiwa)</th><th>Porsi penduduk</th><th>Sumber paparan</th></tr></thead><tbody>${baris}</tbody></table></div></div>
      <div class="kj-sumber">Sumber: aturan pemicu ${esc(S.sumber_aturan)}; paparan ${esc(sumberId(d, "terpapar").dokumen)}, diukur ${esc(tgl(S.diukur, true))}</div></article>`;
    return bab("Peringatan dini") + `<div class="kj-baris">${A}${B}</div>` + C;
  }

  async function mulai() {
    try {
      const r = await fetch("/data/bnpb/iku.json"); if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      el("pilSumber").innerHTML = svgIkon("resmi") + "Angka resmi dari LAKIP, Renstra, NDPBA";
      el("pilHari").innerHTML = svgIkon("waktu") + "Dihitung " + esc(tgl(d.dibuat));
      el("kapasitas").innerHTML = bagianKapasitas(d);
      el("irb").innerHTML = bagianIRB(d);
      el("pdb").innerHTML = bagianPDB(d);
      el("peringatan").innerHTML = bagianPeringatan(d);
      daftarKerja(d);
      el("pesan").hidden = true; el("isi").hidden = false;
      pasangTip();
    } catch (e) {
      el("pesan").textContent = "Data kinerja belum bisa dimuat. Coba muat ulang halaman.";
      el("pesan").classList.add("galat");
    }
  }
  mulai();
})();
