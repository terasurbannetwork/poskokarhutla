"use strict";
/* Dialog detail IRBI per kab/kota dan dialog analisa IKD (PRD F-2, F-3, F-4). Grafik SVG sendiri, tanpa pustaka.
   Data: irbi.json, jiwa.json, ikd.json lewat Ir.muat. Ringkasan PDF = cetak peramban (gaya @media print di inarisk.css). */
(() => {
  const {H} = Ir;
  const tgl = s => Ir.tanggal(s);

  /* ---- grafik ---- */
  function jarum(v, ambang = {rendah: 0.4, tinggi: 0.8}) {
    const R = 80, cx = 100, cy = 96, titik = t => { const a = Math.PI * (1 - t); return [cx + R * Math.cos(a), cy - R * Math.sin(a)]; };
    const busur = (a, b, cls) => { const [x1, y1] = titik(a), [x2, y2] = titik(b); return `<path class="${cls}" d="M${x1.toFixed(1)} ${y1.toFixed(1)}A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`; };
    const ada = typeof v === "number" && Number.isFinite(v), t = ada ? Math.min(1, Math.max(0, v)) : 0, a = Math.PI * (1 - t), jx = cx + R * 0.55 * Math.cos(a), jy = cy - R * 0.55 * Math.sin(a);
    const tk = H.tingkatIkd(v, ambang);
    return `<figure class="ir-jarum"><svg viewBox="0 0 200 132" role="img" aria-label="Indeks kapasitas ${ada ? H.angka2(v) : "tidak ada"}, ${tk || "tanpa tingkat"}">` +
      busur(0, ambang.rendah, "j-rendah") + busur(ambang.rendah, ambang.tinggi, "j-sedang") + busur(ambang.tinggi, 1, "j-tinggi") +
      (ada ? `<line class="j-jarum" x1="${cx}" y1="${cy}" x2="${jx.toFixed(1)}" y2="${jy.toFixed(1)}"/><circle class="j-pusat" cx="${cx}" cy="${cy}" r="4"/>` : "") +
      `<text x="${cx}" y="${cy + 30}" class="j-angka" text-anchor="middle">${ada ? H.angka2(v) : "–"}</text></svg>` +
      `<figcaption><i class="ir-titik ${tk ? "t-" + tk.toLowerCase() : ""}"></i>${esc(tk || "Belum dinilai")}</figcaption></figure>`;
  }
  function radar(nilai, nama) {
    const n = nilai.length, R = 78, c = 100, sudut = i => -Math.PI / 2 - i * 2 * Math.PI / n;   // P2 di kiri seperti InaRISK
    const pt = (i, r) => [c + r * Math.cos(sudut(i)), c + r * Math.sin(sudut(i))];
    const poli = r => nilai.map((_, i) => pt(i, r).map(x => x.toFixed(1)).join(",")).join(" ");
    const ada = v => typeof v === "number" && Number.isFinite(v);   // prioritas tanpa nilai tidak digambar sebagai nol
    const data = nilai.map((v, i) => ada(v) ? pt(i, R * Math.max(0, Math.min(1, v))) : null);
    return `<svg class="ir-radar" viewBox="-12 -8 224 216" role="img" aria-label="Indeks per prioritas: ${nilai.map((v, i) => `P${i + 1} ${H.angka2(v)}`).join(", ")}">` +
      [0.25, 0.5, 0.75, 1].map(f => `<polygon class="r-kisi" points="${poli(R * f)}"/>`).join("") +
      nilai.map((_, i) => { const [x, y] = pt(i, R); return `<line class="r-kisi" x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join("") +
      `<polygon class="r-isi" points="${data.filter(Boolean).map(p => p.map(x => x.toFixed(1)).join(",")).join(" ")}"/>` +
      data.map((p, i) => !p ? "" : `<circle class="r-titik" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5" data-tip="<b>P${i + 1}</b> ${esc(nama[i] || "")}<br>Indeks: ${H.angka2(nilai[i])}"/>`).join("") +
      nilai.map((_, i) => { const [x, y] = pt(i, R + 14); return `<text class="r-label" x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle">P${i + 1}</text>`; }).join("") + `</svg>`;
  }
  function trenSvg(grup, kolom) {
    const titik = grup.flatMap(g => g.titik.map(t => ({...t, baru: g.baru})));
    const maks = Math.max(1, ...titik.map(t => t.skor || 0)) * 1.15, W = 300, T = 130, lb = W / titik.length;
    let garis = "";
    const batang = titik.map((t, i) => {
      if (i && t.baru !== titik[i - 1].baru) garis = `<line class="t-pisah" x1="${(i * lb).toFixed(1)}" y1="0" x2="${(i * lb).toFixed(1)}" y2="${T + 18}"/>`;
      const h = t.skor ? (t.skor / maks) * T : 0, x = i * lb + lb * 0.22, w = lb * 0.56;
      return (t.skor ? `<rect class="${t.baru ? "t-baru" : "t-lama"}" x="${x.toFixed(1)}" y="${(T - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="4" data-tip="<b>${t.tahun}</b> ${t.baru ? "HV 2021" : "HV 2015"}<br>Skor: ${H.angka2(t.skor)}<br>Kelas: ${esc(H.kelas(t.skor, kolom, t.tahun) || "–")}"/>` +
        `<text class="t-nilai" x="${(x + w / 2).toFixed(1)}" y="${(T - h - 5).toFixed(1)}" text-anchor="middle">${H.angka2(t.skor)}</text>` : `<text class="t-kosong" x="${(x + w / 2).toFixed(1)}" y="${T - 4}" text-anchor="middle">belum ada</text>`) +
        `<text class="t-tahun" x="${(x + w / 2).toFixed(1)}" y="${T + 16}" text-anchor="middle">${t.tahun}</text>`;
    }).join("");
    return `<svg class="ir-tren" viewBox="0 0 ${W} ${T + 22}" role="img" aria-label="Tren skor ${titik.map(t => `${t.tahun} ${H.angka2(t.skor)}`).join(", ")}"><line class="t-dasar" x1="0" y1="${T}" x2="${W}" y2="${T}"/>${batang}${garis}</svg>` +
      `<ul class="ir-tren-leg">${grup.some(g => !g.baru) ? `<li><i class="t-lama"></i>HV 2015, 9 jenis bencana</li>` : ""}${grup.some(g => g.baru) ? `<li><i class="t-baru"></i>HV 2021, 11 jenis bencana</li>` : ""}</ul>`;
  }
  function jiwaSvg(baris) {
    return `<ul class="ir-jiwa">${baris.map(b => b.persen === null ? `<li><span>${esc(b.nama)}</span><i class="ir-jiwa-bt ir-jiwa-kosong">tidak ada data</i></li>` : `<li data-tip="<b>${esc(b.nama)}</b><br>Terpapar: ${H.angka0(b.terpapar)} jiwa<br>Persen: ${H.persen1(b.persen)}">` +
      `<span>${esc(b.nama)}</span><i class="ir-jiwa-bt"><s class="j-ya" data-w="${b.persen.toFixed(2)}">${b.persen >= 8 ? H.persen1(b.persen) : ""}</s><s class="j-tidak" data-w="${b.sisa.toFixed(2)}">${b.sisa >= 8 ? H.persen1(b.sisa) : ""}</s></i></li>`).join("")}</ul>` +
      `<ul class="ir-tren-leg"><li><i class="j-ya"></i>Jiwa terpapar</li><li><i class="j-tidak"></i>Jiwa tidak terpapar</li></ul>`;
  }
  const lebarkan = akar => { for (const s of akar.querySelectorAll("[data-w]")) s.style.setProperty("inline-size", s.dataset.w + "%"); };

  /* rekomendasi dikelompokkan per prioritas; denganIndikator = tampilan analisa IKD */
  function rekomendasi(ikd, a, denganIndikator) {
    if (!a?.rek?.length) return `<p class="ir-p">Rekomendasi kebijakan belum tersedia untuk wilayah ini.</p>`;
    const per = new Map();
    for (const [p, ii, ai] of a.rek) { if (!per.has(p)) per.set(p, []); per.get(p).push([ikd.indikator[ii], ikd.aksi[ai]]); }
    return [...per.keys()].sort((x, y) => x - y).map(p => `<section class="ir-rek"><h4><span class="ir-rek-p">Prioritas ${p}</span>${esc(ikd.prioritas[p - 1] || "")}</h4><ul>` +
      per.get(p).map(([ind, aksi]) => denganIndikator ? `<li><b>${esc(ind)}</b><span>${esc(aksi)}</span></li>` : `<li>${esc(aksi)}</li>`).join("") + `</ul></section>`).join("");
  }
  /* analisa IKD terbaru (<= tahun bila diberikan) untuk satu wilayah */
  function analisaTerbaru(ikd, pcode, tahun = 9999) {
    let best = null;
    for (const k of Object.keys(ikd.analisa)) { const [p, t] = k.split("/"); if (p === pcode && +t <= tahun && (!best || +t > best.tahun)) best = {tahun: +t, ...ikd.analisa[k]}; }
    return best;
  }
  const kepala = (id, nama, sub, kanan) => `<header class="ir-dlg-hd"><span class="ir-avatar" aria-hidden="true">${esc((nama || "?").charAt(0))}</span>` +
    `<div><h2 id="${id}">${esc(nama)}</h2><p>${esc(sub)}</p></div><div class="ir-dlg-kanan">${kanan}</div><button type="button" class="ir-tutup" data-tutup aria-label="Tutup">×</button></header>`;
  const kotak = (judul, isi, cls = "") => `<section class="ir-k ${cls}"><h3>${judul}</h3>${isi}</section>`;

  Ir.bukaDetail = async (pcode, f) => {
    const dlg = $("#dlgIrbi"), isi = $("#dlgIrbiIsi");
    const d = await Ir.muat("irbi.json");
    const {tahun, kolom, prov} = f, nama = d.kab[pcode]?.[0] || pcode, namaProv = d.prov[pcode.slice(0, 2)] || "";
    const s = H.skor(d, pcode, tahun, kolom), k = H.kelas(s, kolom, tahun);
    const p1 = H.peringkat(d, tahun, kolom, prov), p0 = H.peringkat(d, tahun - 1, kolom, prov);
    const rk = p1.get(pcode), rk0 = p0.get(pcode), total = p1.size;
    const bahaya = kolom === "total" ? "" : ` ${Ir.NAMA_BAHAYA[kolom].toLowerCase()}`;
    isi.innerHTML = kepala("dlgIrbiJ", nama, namaProv, `<small>Data ditarik</small><b>${esc(tgl(d.dibuat))}</b>`) +
      `<div class="ir-dlg-g1">` +
      kotak("Total penduduk", `<p class="ir-k-n" id="dtPend">…</p><p class="ir-k-k">jiwa, dari data jiwa terpapar InaRISK</p>`) +
      kotak(`Indeks risiko bencana${bahaya}`, `<p class="ir-k-n">${H.angka2(s)}</p>${Ir.pil(k)}<p class="ir-k-k">${rk ? `Peringkat ${H.angka0(rk)} dari ${H.angka0(total)} kabupaten/kota${prov ? " di provinsi ini" : ""}` : "Belum ada skor"}</p>`) +
      kotak("Kelas risiko", `<p class="ir-k-kelas ${Ir.kelasCss(k)}"><i></i>${esc(k || "Tanpa skor")}</p><p class="ir-k-k">${kolom === "total" ? (tahun >= H.TAHUN_HV2021 ? "Tinggi di atas 176" : "Tinggi di atas 144") : "per jenis bahaya"}</p>`) +
      kotak("Tren 5 tahun terakhir", trenSvg(H.tren(d, pcode, tahun, kolom), kolom), "ir-k-tren") +
      kotak("Perubahan peringkat", rk && rk0 ? `<p class="ir-k-n">${rk0 - rk > 0 ? "+" : ""}${H.angka0(rk0 - rk)}</p><p class="ir-k-k">dari ${H.angka0(rk0)} ke ${H.angka0(rk)}${tahun === H.TAHUN_HV2021 ? "; dasar kajian berbeda" : ""}</p>` : `<p class="ir-k-k">Peringkat ${tahun - 1} tidak ada.</p>`) +
      `</div><div class="ir-dlg-g2">` +
      kotak("Jiwa terpapar per jenis bencana", `<div id="dtJiwa"><p class="ir-p">Memuat…</p></div>`, "ir-k-jiwa") +
      kotak("Tingkat kapasitas daerah", `<div id="dtJarum"><p class="ir-p">Memuat…</p></div>`) +
      kotak(`Kategori prioritas <small id="dtIkdTh"></small>`, `<div id="dtRadar"></div>`) +
      `</div>` + kotak("Sekolah aman bencana (SPAB)", `<div id="dtSpab"><p class="ir-p">Memuat…</p></div>`, "ir-k-spab") +
      kotak("Rekomendasi kebijakan prioritas", `<div id="dtRek"><p class="ir-p">Memuat…</p></div>`, "ir-k-rek") +
      `<footer class="ir-dlg-ft"><p><b>Catatan</b>Data ditampilkan pada skala kabupaten/kota. Hasil analisis bisa berbeda pada tingkat wilayah lain.</p><p><b>Sumber</b>InaRISK BNPB: IRBI, jiwa terpapar, IKD, SPAB.</p>` +
      `<div class="ir-dlg-aksi"><button type="button" class="ir-tombol2" id="dtCetak">Unduh ringkasan PDF</button><button type="button" class="bn-tombol" data-tutup>Tutup</button></div></footer>`;
    lebarkan(isi);
    if (!dlg.open) dlg.showModal();
    isi.scrollTop = 0;
    $("#dtCetak").addEventListener("click", () => { document.body.classList.add("ir-cetak"); print(); document.body.classList.remove("ir-cetak"); });

    Ir.muat("jiwa.json").then(j => {
      const baris = H.jiwaPersen(j.kab[pcode], j.bencana);
      $("#dtPend").textContent = H.angka0(j.kab[pcode]?.penduduk ?? null);
      $("#dtJiwa").innerHTML = baris.length ? jiwaSvg(baris) : `<p class="ir-p">Data jiwa terpapar wilayah ini belum tersedia.</p>`;
      lebarkan($("#dtJiwa"));
    }).catch(() => { $("#dtPend").textContent = "–"; $("#dtJiwa").innerHTML = `<p class="ir-p">Data jiwa terpapar belum ditarik.</p>`; });
    Ir.muat("spab.json").then(sp => {
      const v = sp.kab[pcode];
      $("#dtSpab").innerHTML = v ? `<p class="ir-k-n">${H.persen1(v[4] * 100)}</p><p class="ir-k-k">capaian SPAB rerata ${H.angka0(v[0])} sekolah melapor; pilar 1 ${H.persen1(v[1] * 100)}, pilar 2 ${H.persen1(v[2] * 100)}, pilar 3 ${H.persen1(v[3] * 100)}; optimal ${H.angka0(v[5])}, belum optimal ${H.angka0(v[6])}, tidak ${H.angka0(v[7])}</p>`
        : `<p class="ir-p">Belum ada data SPAB untuk wilayah ini.</p>`;
    }).catch(() => { $("#dtSpab").innerHTML = `<p class="ir-p">Data SPAB belum ditarik.</p>`; });
    Ir.muat("ikd.json").then(ikd => {
      const a = analisaTerbaru(ikd, pcode);
      $("#dtIkdTh").textContent = a ? `IKD ${a.tahun}` : "";
      $("#dtJarum").innerHTML = jarum(a?.indeks ?? null);
      $("#dtRadar").innerHTML = a?.nilai ? radar(a.nilai, ikd.prioritas) : `<p class="ir-p">Analisa IKD belum tersedia.</p>`;
      $("#dtRek").innerHTML = rekomendasi(ikd, a, false);
    }).catch(() => { for (const id of ["#dtJarum", "#dtRek"]) $(id).innerHTML = `<p class="ir-p">Data IKD belum ditarik.</p>`; });
  };

  Ir.bukaIkd = async (pcode, tahun) => {
    const dlg = $("#dlgIkd"), isi = $("#dlgIkdIsi"), ikd = await Ir.muat("ikd.json");
    const baris = ikd.daftar.find(r => r[0] === pcode && r[3] === tahun), a = ikd.analisa[`${pcode}/${tahun}`];
    const nama = baris?.[1] || pcode, tk = H.tingkatIkd(baris?.[4] ?? null);
    isi.innerHTML = kepala("dlgIkdJ", nama, baris?.[2] || "Tingkat provinsi", `<small>Indeks kapasitas</small><b>${H.angka2(baris?.[4] ?? null)}</b><small>Tingkat kapasitas</small><b><i class="ir-titik ${tk ? "t-" + tk.toLowerCase() : ""}"></i>${esc(tk || "–")}</b>`) +
      `<p class="ir-dlg-sub">Hasil analisa IKD tahun ${tahun}</p>` +
      (a ? `<div class="ir-dlg-g2 ir-dlg-g2b">${kotak("Tingkat kapasitas daerah", jarum(a.indeks))}${kotak("Indeks per prioritas", radar(a.nilai, ikd.prioritas))}</div>` +
        `<ul class="ir-prio">${a.nilai.map((v, i) => `<li><i>P${i + 1}</i><span>${esc(ikd.prioritas[i])}</span><b class="ir-prio-bt">${typeof v === "number" ? `<s data-w="${(Math.max(0, Math.min(1, v)) * 100).toFixed(1)}"></s>` : ""}</b><em>${H.angka2(v)}</em></li>`).join("")}</ul>` +
        kotak("Rekomendasi kebijakan", rekomendasi(ikd, a, true), "ir-k-rek")
        : `<p class="ir-p">Analisa IKD tahun ${tahun} belum tersedia untuk wilayah ini.</p>`) +
      `<footer class="ir-dlg-ft"><p><b>Sumber</b>InaRISK BNPB, IKD final.</p><div class="ir-dlg-aksi"><button type="button" class="bn-tombol" data-tutup>Tutup</button></div></footer>`;
    lebarkan(isi);
    if (!dlg.open) dlg.showModal();
    isi.scrollTop = 0;
  };
})();
