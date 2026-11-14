/* Tren kejadian per jenis bencana di Pantau Dalops (/bnpb/dalops), meniru kartu tren titik panas karhutla di layar peta
   (pemilik 13 Nov 2026 "yang kaya gini tolong dibuat untuk banjir longsor dan bencana lainnya, jadi bisa lihat trennya").
   Dua grafik, keduanya dari logbook Pusdalops (bukan DIBI):
   - per tahun: /data/logbook_riwayat.json (nasional, atau jumlah kab/kota satu provinsi). Tahun dengan liputan logbook tidak penuh
     dipudarkan dan tidak ikut rata-rata; tahun berjalan dibandingkan per hari tercatat, supaya tahun yang belum habis tidak terbaca turun.
   - per periode (1 minggu sampai 1 tahun): /data/logbook_kejadian.json, kejadian baru dihitung pada hari laporan pertamanya.
   Teks data lewat esc() ke data-tip; svg hanya angka dan label sendiri. Tanpa gaya inline (CSP). */
(() => {
  "use strict";
  const {h, F, PROV} = window.Wilayah;
  /* kunci jenis Dalops -> kunci jenis di logbook_riwayat.json dan di logbook_kejadian.json */
  const JR = {banjir: "banjir", longsor: "longsor", gempa: "gempabumi", cuaca: "cuaca", kekeringan: "kekeringan", gelombang: "gelombang_pasang", permukiman: "kebakaran_permukiman", gunungapi: "gunungapi", karhutla: "karhutla"};
  const JK = {banjir: ["banjir", "banjir_bandang", "banjir_longsor", "rob"], longsor: ["longsor", "banjir_longsor"], gempa: ["gempa"], cuaca: ["cuaca"], kekeringan: ["kekeringan"],
    gelombang: ["gelombang"], gunungapi: ["erupsi"], karhutla: ["karhutla"], permukiman: []};
  const RENTANG = [["7h", "1 mg", "1 minggu", 7, "h"], ["14h", "2 mg", "2 minggu", 14, "h"], ["21h", "3 mg", "3 minggu", 21, "h"], ["4m", "1 bln", "1 bulan", 4, "m"], ["8m", "2 bln", "2 bulan", 8, "m"],
    ["12m", "3 bln", "3 bulan", 12, "m"], ["16m", "4 bln", "4 bulan", 16, "m"], ["20m", "5 bln", "5 bulan", 20, "m"], ["24m", "6 bln", "6 bulan", 24, "m"], ["12b", "1 thn", "1 tahun", 12, "b"]];
  const MERAH = "#c9503a", BIRU = "#1d4e89", MUDA = "#9db6d6", HIJAU = "#2b8c86";
  let RIW = null, KEJ = null;
  const muat = (u) => fetch(u, {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null);
  const muatSemua = () => Promise.all([RIW ||= muat("/data/logbook_riwayat.json"), KEJ ||= muat("/data/logbook_kejadian.json")]);

  const geser = (t, n) => new Date(Date.parse(t + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const tglP = t => new Date(t + "T12:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "UTC"});
  const pendek = v => v >= 1e3 ? (v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(".", ",").replace(",0", "") + "rb" : String(v);
  const persen = (kini, lalu) => kini == null || !lalu ? null : Math.round((kini - lalu) / lalu * 100);
  const lblPersen = d => `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d).toLocaleString("id-ID")}%`;
  const tipPersen = (d, satuan) => d == null ? "" : `<br>${d > 0 ? "naik" : d < 0 ? "turun" : "sama dengan"}${d ? " " + Math.abs(d).toLocaleString("id-ID") + "% dari" : ""} ${satuan} sebelumnya`;
  const teksPersen = (d, x, y) => d == null ? "" : `<text x="${x}" y="${y}" text-anchor="middle" font-size="7" font-weight="700" fill="${d > 0 ? MERAH : d < 0 ? HIJAU : "currentColor"}">${lblPersen(d)}</text>`;
  const svgDari = s => { const w = document.createElement("div"); w.innerHTML = s; return w.firstElementChild; };

  /* ---------- per tahun ---------- */
  function perTahun(R, jenis, prov) {
    const jr = JR[jenis]; if (!R || !jr) return null;
    const ht = R.hari_tercatat || {}, penuh = new Set((R.tahun_penuh || []).map(String));
    const th = Object.keys(R.nasional).filter(y => (ht[y] || 0) >= 250).sort(), ini = th.at(-1);
    const nilai = y => prov ? Object.entries(R.kab).reduce((a, [k, x]) => a + (k.split("|")[0] === prov ? x.tahun?.[y]?.[jr] || 0 : 0), 0) : R.nasional[y]?.[jr] || 0;
    const v = th.map(nilai);
    if (!v.some(Boolean)) return null;
    const dasar = th.filter(y => penuh.has(y) && y !== ini), laju = y => nilai(y) / (ht[y] || 1);
    const rata = dasar.length ? dasar.reduce((a, y) => a + nilai(y), 0) / dasar.length : null, rLaju = dasar.length ? dasar.reduce((a, y) => a + laju(y), 0) / dasar.length : null;
    const kali = rLaju ? laju(ini) / rLaju : null, urut = [...dasar, ini].sort((a, b) => laju(b) - laju(a)), rank = urut.indexOf(ini) + 1;
    const n = th.length, W = 360, H = 104, B = 76, m = Math.max(1, ...v), bw = W / n, Y = x => B - x / m * 58;
    const berjalan = ini === String(new Date().getFullYear());
    const g = th.map((y, i) => { const x = v[i], hh = Math.max(x ? 1.5 : 0, x / m * 58), kini = y === ini, pen = penuh.has(y) || kini, atas = rata != null && x > rata;
      const d = i && pen && penuh.has(th[i - 1]) && !(kini && berjalan && x < v[i - 1]) ? persen(x, v[i - 1]) : null;   // tahun berjalan: persen hanya bila sudah melewati tahun lalu
      const tip = `<b>${y}</b>${kini && berjalan ? " (berjalan)" : pen ? "" : " (liputan logbook tidak penuh)"}<br>${F(x)} kejadian<br>${F(ht[y] || 0)} hari tercatat${rata && pen ? `<br>${(x / rata).toFixed(1).replace(".", ",")}× rata-rata` : ""}${tipPersen(d, "tahun")}`;
      return `<g class="dl-tren-b" data-tip="${esc(tip)}"><rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/>
        <rect x="${i * bw + 2}" y="${B - hh}" width="${bw - 4}" height="${hh}" rx="2.5" fill="${kini ? MERAH : atas ? BIRU : MUDA}" opacity="${pen ? 1 : .35}"/>
        ${(kini || atas) && x ? `<text x="${i * bw + bw / 2}" y="${B - hh - 3}" text-anchor="middle" font-size="8.5" font-weight="700" fill="currentColor">${pendek(x)}</text>` : ""}
        ${teksPersen(d, i * bw + bw / 2, B + 10)}
        <text x="${i * bw + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="8" fill="currentColor" opacity="${pen ? .6 : .35}">'${y.slice(2)}</text></g>`; }).join("");
    const garis = rata != null ? `<line x1="0" x2="${W}" y1="${Y(rata)}" y2="${Y(rata)}" stroke="${BIRU}" stroke-width="1.3" stroke-dasharray="4 3" opacity=".8"/>` : "";
    const w = h("div", {class: "dl-tren-k"}, h("b", {class: "dl-tren-j", teks: `Kejadian per tahun ${th[0]}–${ini}`}),
      svgDari(`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Kejadian per tahun">${g}${garis}</svg>`));
    if (rata != null) w.append(h("div", {class: "dl-tren-leg"}, h("i", {class: "dl-tren-garis"}), "rata-rata tahun dasar ", h("b", {teks: F(Math.round(rata))}),
      h("i", {class: "dl-tren-pudar"}), "liputan logbook tidak penuh"));
    if (kali != null) { const naik = kali >= 1;
      w.append(h("div", {class: "dl-tren-ring" + (naik ? " naik" : " turun")},
        h("div", {class: "dl-tren-ring-k"}, h("span", {teks: ini}), h("b", {teks: `${F(Math.round(kali * 10) / 10)}× rata-rata`})),
        h("div", {class: "dl-tren-ring-r"}, h("span", null, h("b", {teks: F(nilai(ini))}), ` kejadian dalam ${F(ht[ini] || 0)} hari tercatat, peringkat ${rank} dari ${urut.length} tahun`),
          h("span", null, "Rata-rata tahun dasar: ", h("b", {teks: F(Math.round(rata))}), " kejadian"))));
    }
    return w;
  }

  /* ---------- per periode ---------- */
  function hitungHarian(K, jenis, prov) {
    const set = new Set(JK[jenis] || []), m = new Map();
    for (const x of K?.kejadian || []) {
      if (!set.has(x.jenis)) continue;
      if (prov && String(x.kab_kode || "").slice(0, 2) !== prov) continue;
      const t = x.terlihat?.[0] || x.mulai; if (t) m.set(t, (m.get(t) || 0) + 1);
    }
    return m;
  }
  function batang(m, dari, akhir, r) {
    const nilai = t => t < dari || t > akhir ? null : m.get(t) || 0;
    const jml = (a, n) => { let s = 0, ada = false; for (let i = 0; i < n; i++) { const v = nilai(geser(a, i)); if (v != null) { s += v; ada = true; } } return ada ? s : null; };
    const out = [], N = r[3];
    if (r[4] === "b") { const y0 = +akhir.slice(0, 4), m0 = +akhir.slice(5, 7) - 1;
      for (let i = N - 1; i >= 0; i--) { const d = new Date(Date.UTC(y0, m0 - i, 1)), a = d.toISOString().slice(0, 10), b = new Date(Date.UTC(y0, m0 - i + 1, 1)),
          hb = Math.min(Math.round((b - d) / 864e5), Math.round((Date.parse(akhir + "T00:00:00Z") - d) / 864e5) + 1);
        out.push({x: d.toLocaleDateString("id-ID", {month: "short", timeZone: "UTC"}), tip: d.toLocaleDateString("id-ID", {month: "long", year: "numeric", timeZone: "UTC"}) + (i ? "" : ` (sampai ${tglP(akhir)})`),
          n: hb > 0 ? jml(a, hb) : null}); }
      return {out, jml}; }
    const lebar = r[4] === "h" ? 1 : 7;
    for (let i = N - 1; i >= 0; i--) { const z = geser(akhir, -i * lebar), a = geser(z, 1 - lebar);
      out.push({x: tglP(lebar === 1 ? z : a), tip: lebar === 1 ? new Date(z + "T12:00:00Z").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", timeZone: "UTC"}) : `${tglP(a)} sampai ${tglP(z)}`, n: jml(a, lebar)}); }
    return {out, jml};
  }
  function grafikPeriode(K, jenis, prov, v) {
    const r = RENTANG.find(x => x[0] === v), akhir = K.sampai, dari = K.dari, m = hitungHarian(K, jenis, prov);
    const {out: b, jml} = batang(m, dari, akhir, r), satuan = r[4] === "h" ? "hari" : r[4] === "m" ? "minggu" : "bulan";
    if (b.every(x => x.n == null)) return [h("p", {class: "dl-tren-pesan", teks: "Data rentang ini belum tersedia."})];
    const n = b.length, nl = b.map(x => x.n || 0), tot = nl.reduce((a, c) => a + c, 0), mx = Math.max(1, ...nl), W = 360, H = n > 14 ? 116 : 106, B = 78, bw = W / n, iP = nl.indexOf(Math.max(...nl));
    const tiap = n <= 12 ? 1 : n <= 16 ? 2 : n <= 21 ? 3 : 4;
    const g = b.map((x, i) => { const hh = x.n ? Math.max(1.5, x.n / mx * 60) : 0, puncak = i === iP && x.n > 0, ang = n <= 14 || puncak, d = persen(x.n, b[i - 1]?.n), cx = Math.min(W - 12, Math.max(12, i * bw + bw / 2));
      return `<g class="dl-tren-b" data-tip="${esc(`<b>${x.tip}</b><br>${x.n == null ? "belum ada data" : F(x.n) + " kejadian baru"}${tipPersen(d, satuan)}`)}"><rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/>
        <rect x="${i * bw + Math.min(2, bw * .12)}" y="${B - hh}" width="${bw - 2 * Math.min(2, bw * .12)}" height="${hh}" rx="2" fill="${puncak ? MERAH : BIRU}"/>
        ${ang && x.n ? `<text x="${cx}" y="${B - hh - 3}" text-anchor="middle" font-size="8.5" font-weight="700" fill="currentColor">${F(x.n)}</text>` : ""}
        ${teksPersen(d, cx, B + 10 + (n > 14 && (n - 1 - i) % 2 ? 9 : 0))}
        ${(n - 1 - i) % tiap === 0 ? `<text x="${Math.min(W - 14, Math.max(14, i * bw + bw / 2))}" y="${H - 6}" text-anchor="middle" font-size="8" fill="currentColor" opacity=".55">${x.x}</text>` : ""}</g>`; }).join("");
    /* banding dengan rentang sepanjang ini tepat sebelumnya, sampai 2 bulan; lebih panjang membandingkan musim yang berbeda */
    const p = h("p", {class: "dl-tren-pesan"}, h("b", {teks: F(tot)}), ` kejadian baru, ${r[2]} sampai ${tglP(akhir)}, per ${satuan}.`);
    if (r[4] === "h" || (r[4] === "m" && r[3] <= 8)) { const hari = r[3] * (r[4] === "h" ? 1 : 7), a = geser(akhir, 1 - 2 * hari), lalu = a >= dari ? jml(a, hari) : null;
      if (lalu) { const d = Math.round((tot - lalu) / lalu * 100); p.append(" ", h("span", {class: d > 0 ? "naik" : d < 0 ? "turun" : "", teks: `${d > 0 ? "naik" : d < 0 ? "turun" : "sama dengan"} ${d ? F(Math.abs(d)) + "% dari" : ""} ${r[2]} sebelumnya`})); } }
    return [svgDari(`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Kejadian baru ${r[2]} terakhir, per ${satuan}">${g}</svg>`), p];
  }

  let pilihan = "7h", provPilih = "";   // bertahan antartab jenis
  /* isi(wadah, jenis, hiasPilih): wadah diisi pemilih provinsi + dua kartu grafik; jenis tanpa data dua-duanya = seksi dibuang */
  async function isi(wadah, jenis, hiasPilih) {
    const [R, K] = await muatSemua();
    if (!R && !K) { wadah.closest("section")?.remove(); return; }
    const adaHarian = K && (JK[jenis] || []).length && K.kejadian?.some(x => JK[jenis].includes(x.jenis));
    const sProv = h("select", {"aria-label": "Provinsi"}, h("option", {value: "", teks: "Nasional"}),
      ...Object.entries(PROV).sort((a, b) => a[1].localeCompare(b[1])).map(([k, n]) => h("option", {value: k, teks: n})));
    sProv.value = provPilih;
    const kTahun = h("div", {class: "dl-tren-slot"}), isiPer = h("div"), kPer = h("div", {class: "dl-tren-k"});
    const seg = h("div", {class: "dl-tren-seg", role: "group", "aria-label": "Rentang tren"}, ...RENTANG.map(([v, n, p]) => h("button", {type: "button", "data-tren": v, title: p, "aria-label": p, "aria-pressed": String(v === pilihan), teks: n})));
    if (adaHarian) kPer.append(h("b", {class: "dl-tren-j", teks: "Tren kejadian baru"}), seg, isiPer);
    const segarPer = () => adaHarian && isiPer.replaceChildren(...grafikPeriode(K, jenis, provPilih, pilihan));
    const segarTahun = () => { const t = perTahun(R, jenis, provPilih); kTahun.replaceChildren(t || h("p", {class: "dl-tren-pesan", teks: "Belum ada kejadian tercatat di logbook untuk pilihan ini."})); };
    seg.addEventListener("click", e => { const b = e.target.closest("[data-tren]"); if (!b || b.dataset.tren === pilihan) return; pilihan = b.dataset.tren;
      seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));   // tombol berganti dulu, grafik sesudah satu frame (INP)
      requestAnimationFrame(() => setTimeout(segarPer, 0)); });
    sProv.addEventListener("change", () => { provPilih = sProv.value; requestAnimationFrame(() => setTimeout(() => { segarTahun(); segarPer(); }, 0)); });
    segarTahun(); segarPer();
    wadah.replaceChildren(h("div", {class: "dl-bilah-saring"}, h("div", {class: "dl-pilih"}, h("span", {class: "dl-pilih-t", teks: "Wilayah"}), hiasPilih(sProv))),
      h("div", {class: "dl-tren-grid" + (adaHarian ? "" : " satu")}, kTahun, adaHarian ? kPer : null));
  }
  window.DalopsTren = {isi};
})();
