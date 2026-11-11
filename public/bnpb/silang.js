"use strict";
/* Kajian silang sumber (/bnpb/silang). Data statis: /data/bnpb/rekonsiliasi_dalops_dibi.json (scripts/bnpb/rekonsiliasi_dalops_dibi.py) dan
   /data/bnpb/inarisk_vs_kejadian.json (scripts/bnpb/inarisk_vs_kejadian.py). Layar hanya menampilkan angka pipeline; tidak menghitung ulang.
   Butuh /inti/format.js (esc, $) dan /inti/tip.js (pasangTip, #tip). Empat kartu .ex-std (beda sumber hari ini di atas); grafik SVG dengan tooltip [data-tip].
   Tanpa gaya/skrip inline (CSP): semua teks data lewat esc(). INP: pilihan jenis dan normalisasi hanya mengganti satu isi kartu. */
(() => {
  const IKON = {data: "M4 6h16M4 12h16M4 18h10", beda: "M7 4v16M17 4v16M4 8l3-3 3 3M14 16l3 3 3-3", bahaya: "M12 3l9 16H3z|M12 10v4|M12 17v.5", info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M12 8v.5|M12 11v5"};
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IKON[k].split("|").map(d => `<path d="${d}"/>`).join("")}</svg>`;
  const n = (v, d = 0) => v == null ? "–" : Number(v).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
  const pct = (v, d = 1) => v == null ? "–" : n(v, d) + "%";
  /* persen dengan pembanding kecil: n < 10 tampil tanda strip dan n, bukan persen */
  const pn = (v, dari) => v == null ? "–" : dari < 10 ? `– (n=${n(dari)})` : pct(v);
  const KECIL = "kurang dari 5";
  const hl = t => `<span class="hl">${esc(t)}</span>`;
  const pil = (t, k, kls = "") => `<span class="bn-pil ${kls}">${svg(k)}${esc(t)}</span>`;
  const JN = {banjir: "Banjir", longsor: "Longsor", cuaca: "Cuaca ekstrem", kekeringan: "Kekeringan", karhutla: "Karhutla", gempa: "Gempa bumi", gunungapi: "Gunung api",
    gelombang: "Gelombang pasang dan abrasi", abrasi: "Abrasi", tsunami: "Tsunami", kebakaran_permukiman: "Kebakaran permukiman"};
  const jn = k => JN[k] || k;
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tglIndo = iso => { const m = /(\d{4})-(\d\d)-(\d\d)/.exec(String(iso)); return m ? `${+m[3]} ${BLN[+m[2] - 1]} ${m[1]}` : "–"; };
  const tglPendek = iso => { const m = /(\d{4})-(\d\d)-(\d\d)/.exec(String(iso)); return m ? `${+m[3]} ${BLN[+m[2] - 1].slice(0, 3)}` : "–"; };
  const rentang = ys => { const o = []; for (const y of ys) { const l = o[o.length - 1]; l && l[1] === y - 1 ? l[1] = y : o.push([y, y]); } return o.map(([a, b]) => a === b ? String(a) : `${a} sampai ${b}`).join(", "); };
  /* tooltip: baris pertama judul, sisanya "label: nilai"; tiap bagian di-escape lalu seluruh string di-escape sekali lagi untuk atribut */
  const tip = (judul, ...baris) => ` data-tip="${esc(`<b>${esc(judul)}</b><br>${baris.map(b => esc(b)).join("<br>")}`)}"`;
  const kartu = (id, ik, ey, judul, ...isi) => `<section class="ex ex-std" id="${id}"><header class="ex-hd"><span class="ex-ey">${svg(ik)}${esc(ey)}</span><div class="ex-jd"><h3 id="${id}-j">${judul}</h3></div></header><div class="ex-bd">${isi.join("")}</div></section>`;
  /* kepala kolom: teks, atau [teks, definisi] (definisi jadi title) */
  const tabel = (kepala, baris) => `<div class="ad-tabel-wadah ex-tabel sg-tabel"><table class="ad-tabel"><thead><tr>${kepala.map(k => Array.isArray(k) ? `<th title="${esc(k[1])}">${esc(k[0])}</th>` : `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${baris.map(b =>
    `<tr>${b.map((c, i) => `<td${i ? ' class="n"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const leg = items => `<div class="sg-leg">${items.map(([k, t]) => `<span><i class="${k}"></i>${esc(t)}</span>`).join("")}</div>`;
  const segmen = (aksi, daftar, aktif) => `<div class="sg-seg" role="group" data-aksi="${aksi}">${daftar.map(([k, t]) => `<button type="button" data-k="${esc(k)}" aria-pressed="${k === aktif}">${esc(t)}</button>`).join("")}</div>`;
  const asal = (teks, dibuat) => `<p class="sg-p">${esc(teks)} Dibuat ${esc(tglIndo(dibuat))}.</p>`;
  const SATUAN = "satu kombinasi hari, kabupaten, dan jenis";

  /* ---------- kartu 1: tercatat satu sumber saja ---------- */
  let SEBAGIAN = [], AKHIR = "";
  const thn = y => SEBAGIAN.includes(+y) ? `${y} (sampai ${tglPendek(AKHIR)})` : String(y);
  function grafikTahun(R) {
    const ths = Object.keys(R.nasional_tahun).sort(), W = 640, H = 270, L = 56, Rr = 14, T = 14, B = 44, lk = (W - L - Rr) / ths.length;
    const mx = Math.max(...ths.map(t => R.nasional_tahun[t].n_dalops + R.nasional_tahun[t].hanya_dibi)), langkah = mx > 10000 ? 4000 : 2000, yMax = Math.ceil(mx / langkah) * langkah, Y = v => T + (H - T - B) * (1 - v / yMax);
    let s = `<svg class="sg-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Jumlah kejadian per tahun menurut ada di kedua sumber, hanya Dalops, atau hanya DIBI">`;
    for (let v = 0; v <= yMax; v += langkah) s += `<line class="sg-grid" x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${esc(n(v))}</text>`;
    s += `<line class="sg-sumbu" x1="${L}" x2="${W - Rr}" y1="${H - B}" y2="${H - B}"/>`;
    ths.forEach((t, i) => {
      const d = R.nasional_tahun[t], x = L + lk * i + lk * 0.18, w = lk * 0.64, sb = SEBAGIAN.includes(+t); let acc = 0;
      s += `<text x="${x + w / 2}" y="${H - 26}" text-anchor="middle">${esc(t)}</text>${sb ? `<text x="${x + w / 2}" y="${H - 13}" text-anchor="middle">sampai ${esc(tglPendek(AKHIR))}</text>` : ""}`;
      [["a", d.pasangan, "Ada di kedua sumber"], ["b", d.hanya_dalops, "Hanya di Dalops"], ["c", d.hanya_dibi, "Hanya di DIBI"]].forEach(([k, v, nm]) => {
        if (v > 0) s += `<rect class="sg-bt sg-${k}" x="${x}" y="${Y(acc + v)}" width="${w}" height="${Math.max(0, Y(acc) - Y(acc + v))}" tabindex="0"${tip(`${nm}, ${thn(t)}`, `Jumlah kejadian: ${n(v)}`, `Dalops ada di DIBI: ${pct(d.persen_dalops_ada_di_dibi)}`, `DIBI ada di Dalops: ${pct(d.persen_dibi_ada_di_dalops)}`, ...(sb ? [`Tahun belum penuh: sampai ${tglIndo(AKHIR)}`] : []))} aria-label="${esc(`${nm} ${thn(t)}: ${n(v)}`)}"/>`;
        acc += v;
      });
    });
    return s + "</svg>";
  }
  const KEPALA1 = [["Kejadian Dalops", `Jumlah kejadian Dalops; satu kejadian adalah ${SATUAN}`], ["Kejadian DIBI", `Jumlah kejadian DIBI; satu kejadian adalah ${SATUAN}`],
    ["Ada di keduanya", "Kejadian yang dipasangkan satu-satu (jenis dan kabupaten sama, tanggal berselisih paling banyak 3 hari)"], ["Hanya Dalops", "Kejadian Dalops tanpa pasangan di DIBI"],
    ["Hanya DIBI", "Kejadian DIBI tanpa pasangan di Dalops, hanya pada hari yang punya logbook"], ["Dalops ada di DIBI", "Ada di keduanya dibagi kejadian Dalops"], ["DIBI ada di Dalops", "Ada di keduanya dibagi kejadian DIBI"],
    ["DIBI di hari tanpa logbook", "Kejadian DIBI tanpa pasangan pada hari yang tidak punya logbook Dalops; tidak dihitung sebagai hanya DIBI"]];
  const sel1 = d => d.kurang_dari_5 ? Array(8).fill(KECIL) : [n(d.n_dalops), n(d.n_dibi), n(d.pasangan), n(d.hanya_dalops), n(d.hanya_dibi), pct(d.persen_dalops_ada_di_dibi), pct(d.persen_dibi_ada_di_dalops), n(d.hanya_dibi_tanpa_logbook)];
  function tabelProv(R, jenis) {
    const sumber = jenis === "semua" ? R.provinsi_semua : R.provinsi_jenis;
    const tot = d => d.kurang_dari_5 ? -1 : d.n_dalops + d.hanya_dibi;
    const baris = Object.entries(sumber).filter(([k]) => jenis === "semua" || k.endsWith("|" + jenis)).map(([k, d]) => [R.prov_nama[k.split("|")[0]] || k, d]).sort((a, b) => tot(b[1]) - tot(a[1]));
    if (!baris.length) return `<p class="sg-kosong">Tidak ada kejadian jenis ini yang dapat dibandingkan.</p>`;
    return tabel(["Provinsi", ...KEPALA1], baris.map(([p, d]) => [p, ...sel1(d)]));
  }
  function kartu1(R) {
    const t = R.nasional_tahun_penuh, c = R.cakupan, lewat = c.tahun_dilewati.map(x => `${x.tahun} (${x.alasan})`).join(", "), td = R.tidak_dibandingkan;
    const judul = `Pada tahun penuh yang dimiliki kedua sumber, ${hl(pct(t.persen_dalops_ada_di_dibi))} kejadian Dalops ada di DIBI dan ${hl(pct(t.persen_dibi_ada_di_dalops))} kejadian DIBI ada di Dalops`;
    const jenisTerurut = Object.keys(R.nasional_jenis).sort((a, b) => R.nasional_jenis[b].n_dalops + R.nasional_jenis[b].hanya_dibi - R.nasional_jenis[a].n_dalops - R.nasional_jenis[a].hanya_dibi);
    const opsi = [["semua", "Semua jenis"], ...jenisTerurut.map(k => [k, jn(k)])];
    const sb = c.tahun_sebagian.length ? ` Tahun ${c.tahun_sebagian.join(", ")} baru berjalan sampai ${tglIndo(c.tanggal_akhir)}: ia ada di grafik dan tabel, tetapi tidak di angka judul.` : "";
    return kartu("k-tercatat", "data", "Dalops lawan DIBI", judul,
      `<div class="sg-pilpil">${pil("Perbandingan dua sumber, bukan penilaian", "info", "sg-pil-info")}${pil("Penyebab selisih masih hipotesis", "bahaya", "sg-pil-hip")}</div>`,
      asal("Data: logbook Pusdalops BNPB (Dalops) dan DIBI BNPB.", R.dibuat),
      `<p class="sg-p">Satu kejadian di sini adalah ${SATUAN}; catatan kembar pada hari yang sama digabung. Dua catatan dipasangkan satu-satu bila jenis dan kabupatennya sama dan tanggalnya berselisih paling banyak ${n(R.jendela_hari)} hari. Tahun dibandingkan: ${esc(rentang(c.tahun_dibandingkan))}.${esc(sb)} Dilewati karena salah satu sumber tidak punya data cukup: ${esc(lewat)}. Kejadian DIBI pada hari tanpa logbook Dalops (${n(c.hanya_dibi_tanpa_logbook)} kejadian) tidak dihitung sebagai hanya DIBI. Tidak ikut dibandingkan: ${n(td.dalops_tanpa_kabupaten)} catatan Dalops tanpa kabupaten dan ${n(td.dalops_jenis_lain)} dengan jenis yang tidak ada di DIBI. Baris DIBI yang kabupatennya tidak terpetakan: ${n(td.dibi_baris_tak_terpetakan)} dari ${n(td.dibi_baris_total)} baris.</p>`,
      grafikTahun(R), leg([["a", "Ada di keduanya"], ["b", "Hanya di Dalops"], ["c", "Hanya di DIBI"]]),
      tabel(["Jenis", ...KEPALA1], jenisTerurut.map(k => [jn(k), ...sel1(R.nasional_jenis[k])])),
      `<div class="sg-kontrol"><label class="bn-isian">Provinsi menurut jenis<select id="pilih-jenis">${opsi.map(([k, t]) => `<option value="${esc(k)}">${esc(t)}</option>`).join("")}</select></label></div>`,
      `<div id="tabel-prov">${tabelProv(R, "semua")}</div>`);
  }

  /* ---------- kartu 2: selisih korban dan rumah, jeda ---------- */
  function kartu2(R) {
    const t = R.nasional_tahun_penuh;
    const judul = `Korban sama pada ${hl(pct(t.korban_sama_persen))} pasangan dan rumah sama pada ${hl(pct(t.rumah_sama_persen))}; angka Dalops lebih besar pada ${hl(n(t.korban_dalops_lebih))} pasangan untuk korban, angka DIBI pada ${hl(n(t.korban_dibi_lebih))} pasangan`;
    const urut = Object.keys(R.nasional_jenis).filter(k => R.nasional_jenis[k].pasangan > 0).sort((a, b) => R.nasional_jenis[b].pasangan - R.nasional_jenis[a].pasangan);
    const b = k => { const d = R.nasional_jenis[k]; return [jn(k), n(d.pasangan), n(d.korban_banding), pn(d.korban_sama_persen, d.korban_banding), n(d.korban_dalops_lebih), n(d.korban_dibi_lebih), n(d.korban_selisih_median, 1),
      n(d.rumah_banding), pn(d.rumah_sama_persen, d.rumah_banding), n(d.rumah_dalops_lebih), n(d.rumah_dibi_lebih), n(d.rumah_selisih_median, 1), n(d.jeda_catat_median, 1), n(d.selisih_tgl_median, 1)]; };
    const th = Object.keys(R.nasional_tahun).sort().map(y => { const d = R.nasional_tahun[y]; return [thn(y), n(d.pasangan), pct(d.persen_dalops_ada_di_dibi), pct(d.persen_dibi_ada_di_dalops), pn(d.korban_sama_persen, d.korban_banding), pn(d.rumah_sama_persen, d.rumah_banding), n(d.jeda_catat_median, 1)]; });
    return kartu("k-selisih", "beda", "Selisih pasangan", judul,
      `<div class="sg-pilpil">${pil("Perbandingan dua sumber, bukan penilaian", "info", "sg-pil-info")}${pil("Penyebab selisih masih hipotesis", "bahaya", "sg-pil-hip")}</div>`,
      asal("Data: logbook Pusdalops BNPB (Dalops) dan DIBI BNPB, pasangan dari kartu di atas.", R.dibuat),
      `<p class="sg-p">Hanya pasangan yang Dalops-nya menyebut angka yang dibandingkan; kejadian lintas kabupaten tidak, karena dampaknya tidak bisa dibagi. Korban adalah meninggal ditambah hilang, rumah adalah rusak berat, sedang, dan ringan. Dalops membaca angka dari teks laporan piket, DIBI memuat angka dari BPBD, jadi selisih tidak menunjukkan sumber mana yang benar. Median selisih dihitung hanya pada pasangan yang angkanya berbeda dan dikosongkan bila pasangan yang dibandingkan kurang dari 5. Persen dengan pembanding kurang dari 10 ditulis dengan tanda strip dan n. Angka judul tidak memuat tahun yang belum penuh.</p>`,
      tabel(["Jenis", ["Pasangan", "Kejadian yang ada di kedua sumber"], ["Korban dibanding", "Pasangan yang Dalops-nya menyebut korban"], ["Korban sama", "Persen pasangan dengan korban sama persis"],
        ["Korban Dalops lebih", "Pasangan yang korban Dalops lebih besar dari DIBI"], ["Korban DIBI lebih", "Pasangan yang korban DIBI lebih besar dari Dalops"], ["Median selisih korban (orang)", "Median selisih mutlak pada pasangan yang korbannya berbeda"],
        ["Rumah dibanding", "Pasangan yang Dalops-nya menyebut rumah rusak"], ["Rumah sama", "Persen pasangan dengan rumah sama persis"], ["Rumah Dalops lebih", "Pasangan yang rumah Dalops lebih besar"], ["Rumah DIBI lebih", "Pasangan yang rumah DIBI lebih besar"],
        ["Median selisih rumah (rumah)", "Median selisih mutlak pada pasangan yang rumahnya berbeda"], ["Median jeda catat (hari)", "Hari antara kejadian dan catatan pertama di Dalops"], ["Median selisih tanggal (hari)", "Selisih tanggal Dalops dan DIBI pada pasangan"]], urut.map(b)),
      tabel(["Tahun", "Pasangan", "Dalops ada di DIBI", "DIBI ada di Dalops", "Korban sama", "Rumah sama", ["Median jeda catat (hari)", "Hari antara kejadian dan catatan pertama di Dalops"]], th),
      `<p class="sg-p">Kepekaan terhadap jendela tanggal: ${R.sensitivitas_jendela.map(s => `jendela ${n(s.jendela_hari)} hari memberi ${n(s.pasangan)} pasangan, ${n(s.hanya_dalops)} hanya Dalops, ${n(s.hanya_dibi)} hanya DIBI`).map(esc).join("; ")}.</p>`,
      `<ul class="sg-daftar">${R.hipotesis.map(h => `<li>${esc(h)}</li>`).join("")}</ul>`);
  }

  /* ---------- kartu 3: InaRISK lawan kejadian ---------- */
  function grafikIna(I, nm) {
    const js = Object.keys(I.jenis), W = 760, H = 290, L = 44, Rr = 14, T = 30, B = 44, lk = (W - L - Rr) / js.length, Y = v => T + (H - T - B) * (1 - v / 100);
    let s = `<svg class="sg-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Persen kabupaten berbahaya rendah yang sering kena dan berbahaya tinggi yang jarang kena, per jenis, dengan garis dasar">`;
    for (let v = 0; v <= 100; v += 25) s += `<line class="sg-grid" x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${v}%</text>`;
    s += `<line class="sg-sumbu" x1="${L}" x2="${W - Rr}" y1="${H - B}" y2="${H - B}"/>`;
    js.forEach((j, i) => {
      const r = I.jenis[j], d = r[nm], x0 = L + lk * i, w = lk * 0.36, ok = !r.tak_bermakna;
      s += `<text x="${x0 + lk / 2}" y="${H - 26}" text-anchor="middle">${esc(jn(j).split(" ")[0])}</text>${ok ? "" : `<text x="${x0 + lk / 2}" y="${H - 12}" text-anchor="middle">tak bermakna</text>`}`;
      if (!ok) return;
      [["e", d.rendah_sering, "Bahaya rendah, sering kena", d.base_sering, null], ["d", d.tinggi_jarang, "Bahaya tinggi, jarang kena", d.base_jarang, d.jarang_tak_bermakna]].forEach(([k, g, nama, dasar, tak], q) => {
        const x = x0 + lk * 0.12 + (w + 6) * q;
        if (tak) { s += `<text x="${x + w / 2}" y="${H - B - 6}" text-anchor="middle"${tip(`${jn(j)}: ${nama}`, `Tak bermakna: ${tak}`)}>–</text>`; return; }
        if (g.persen == null || g.dari < 10) { s += `<text x="${x + w / 2}" y="${H - B - 6}" text-anchor="middle"${tip(`${jn(j)}: ${nama}`, `Kabupaten di kelas: ${n(g.dari)}`, "Kurang dari 10, tidak dibandingkan")}>–</text>`; return; }
        s += `<rect class="sg-bt sg-${k}" x="${x}" y="${Y(g.persen)}" width="${w}" height="${Math.max(0, Y(0) - Y(g.persen))}" rx="3" tabindex="0"${tip(`${jn(j)}: ${nama}`, `Kabupaten: ${n(g.n)} dari ${n(g.dari)}`, `Persen: ${pct(g.persen)}`, `Dasar jika tak ada hubungan: ${pct(dasar)}`)} aria-label="${esc(`${jn(j)} ${nama}: ${pct(g.persen)}, ${n(g.n)} dari ${n(g.dari)}`)}"/>`
          + `<text class="sg-tebal" x="${x + w / 2}" y="${Y(g.persen) - 16}" text-anchor="middle">${esc(pct(g.persen))}</text><text class="sg-n" x="${x + w / 2}" y="${Y(g.persen) - 5}" text-anchor="middle">${esc(`${n(g.n)}/${n(g.dari)}`)}</text>`
          + `<line class="sg-harap" x1="${x - 2}" x2="${x + w + 2}" y1="${Y(dasar)}" y2="${Y(dasar)}"${tip(`${jn(j)}: dasar`, `Persen seluruh kabupaten di ekor ini: ${pct(dasar)}`)}/>`;
      });
    });
    return s + "</svg>";
  }
  const NORMA = [["per_penduduk", "Per penduduk"], ["per_luas", "Per luas wilayah"]];
  const KET_NORMA = {per_penduduk: "kejadian per tahun per 100 ribu penduduk", per_luas: "kejadian per tahun per 1.000 km²"};
  function judulIna(I) {
    const b = I.jenis.banjir, a = b.per_penduduk.rendah_sering, l = b.per_luas.rendah_sering;
    return b.sejalan.rendah_sering === false || b.sejalan.rendah_sering == null
      ? `Pada banjir, kedua cara normalisasi tidak sejalan: kabupaten berbahaya rendah yang sering kena ${hl(pct(a.persen))} per penduduk dan ${hl(pct(l.persen))} per luas wilayah, dasarnya sekitar ${esc(pct(b.per_penduduk.base_sering, 0))}`
      : `Pada banjir, kedua cara normalisasi sejalan: kabupaten berbahaya rendah yang sering kena ${hl(pct(a.persen))} per penduduk dan ${hl(pct(l.persen))} per luas wilayah, dasarnya sekitar ${esc(pct(b.per_penduduk.base_sering, 0))}`;
  }
  const sj = v => v == null ? "tak bisa dinilai" : v ? "sejalan" : "tidak sejalan";
  function tabelIna(I, nm) {
    return tabel(["Jenis", "Kabupaten", ["Bahaya rendah", "Kabupaten dengan indeks bahaya di bawah 0,33"], ["Rendah tapi sering kena", "Kabupaten bahaya rendah yang laju kejadiannya di seperempat teratas dan minimal 3 kejadian; persen terhadap kabupaten bahaya rendah, dan dasar (persen seluruh kabupaten yang sering kena)"],
      ["Bahaya tinggi", "Kabupaten dengan indeks bahaya 0,67 ke atas"], ["Tinggi tapi jarang kena", "Kabupaten bahaya tinggi yang laju kejadiannya di seperempat terbawah; persen terhadap kabupaten bahaya tinggi, dan dasar (persen seluruh kabupaten yang jarang kena)"],
      ["Korelasi peringkat", "Spearman antara indeks bahaya dan laju kejadian"], ["Dua cara normalisasi", "Apakah per penduduk dan per luas sampai pada kesimpulan yang sama terhadap dasar, pada dua kolom persen"]],
      Object.keys(I.jenis).map(j => { const r = I.jenis[j], d = r[nm], t = "tak bermakna";
        if (!d) return [jn(j), n(r.n_kab), n(r.n_rendah), t, n(r.n_tinggi), t, "–", "–"];
        const rs = d.rendah_sering, tj = d.tinggi_jarang;
        return [jn(j), n(r.n_kab), n(r.n_rendah), r.tak_bermakna ? t : rs.dari < 10 ? pn(rs.persen, rs.dari) : `${n(rs.n)} (${pct(rs.persen)}, dasar ${pct(d.base_sering)})`, n(r.n_tinggi),
          r.tak_bermakna || d.jarang_tak_bermakna ? `${t} (${d.jarang_tak_bermakna ? "p25 laju = 0" : "kelas kecil"})` : tj.dari < 10 ? pn(tj.persen, tj.dari) : `${n(tj.n)} (${pct(tj.persen)}, dasar ${pct(d.base_jarang)})`,
          n(d.rho_spearman, 2), `rendah ${sj(r.sejalan.rendah_sering)}; tinggi ${sj(r.sejalan.tinggi_jarang)}`]; }));
  }
  function contoh(I, nm, j) {
    const d = I.jenis[j][nm];
    if (I.jenis[j].tak_bermakna || !d) return `<p class="sg-kosong">${esc(I.jenis[j].tak_bermakna || "Tidak ada data.")}</p>`;
    const sat = d.satuan, t = (judul, daftar, tak) => `<div><h4>${esc(judul)}</h4>${tak ? `<p class="sg-kosong">Tak bermakna: ${esc(tak)}</p>` : daftar.length ? tabel(["Kabupaten", "Provinsi", "Bahaya", "Jumlah kejadian", [`Laju (${sat})`, `Laju kejadian: ${sat}`]], daftar.map(x => [x.kab, x.prov, n(x.H, 2), n(x.kejadian), n(x.laju, 1)])) : '<p class="sg-kosong">Tidak ada.</p>'}</div>`;
    return `<div class="sg-dua">${t("Bahaya rendah, sering kena", d.rendah_sering.contoh)}${t("Bahaya tinggi, jarang kena", d.tinggi_jarang.contoh, d.jarang_tak_bermakna)}</div>`;
  }
  function kartu3(I) {
    return kartu("k-inarisk", "bahaya", "InaRISK lawan kejadian", judulIna(I),
      `<div class="sg-pilpil">${pil("Hipotesis, belum diuji sebab", "bahaya", "sg-pil-hip")}${pil("Hanya DIBI yang dipakai di tingkat kabupaten", "info", "sg-pil-info")}</div>`,
      asal("Data: indeks bahaya InaRISK BNPB, kejadian DIBI BNPB, penduduk Dukcapil Kemendagri.", I.dibuat),
      `<p class="sg-p">Kelas bahaya InaRISK dibaca dari indeks bahaya rata-rata kecamatan di tiap kabupaten: di bawah 0,33 rendah, 0,67 ke atas tinggi. Satuan laju adalah kejadian DIBI per tahun, ${esc(String(I.tahun[0]))} sampai ${esc(String(I.tahun[1]))}, dibagi per 100 ribu penduduk atau per 1.000 km². Sering kena berarti laju di seperempat teratas seluruh kabupaten dan minimal 3 kejadian; jarang kena berarti di seperempat terbawah. Garis putus di tiap batang adalah dasar: persen seluruh kabupaten yang jatuh di ekor itu; bahaya yang tidak berhubungan dengan kejadian akan jatuh di dasar. Dua normalisasi ditampilkan berdampingan dan kesimpulan hanya dipegang bila keduanya sejalan. Bila banyak kabupaten tanpa kejadian (persentil 25 sama dengan 0 dan lebih dari separuh kabupaten), ekor jarang tidak bermakna. Persen dengan kelas kurang dari 10 kabupaten ditulis dengan tanda strip dan n.</p>`,
      segmen("norma", NORMA, "per_penduduk"), `<div id="grafik-ina">${grafikIna(I, "per_penduduk")}</div>`, leg([["e", "Bahaya rendah, sering kena"], ["d", "Bahaya tinggi, jarang kena"]]), `<p class="sg-p">Angka di atas batang: persen, lalu kabupaten dari kelasnya. Tanda strip berarti tak bermakna atau kelas kurang dari 10 kabupaten.</p>`,
      `<div id="tabel-ina">${tabelIna(I, "per_penduduk")}</div>`,
      `<div class="sg-kontrol"><label class="bn-isian">Kabupaten contoh menurut jenis<select id="pilih-ina">${Object.keys(I.jenis).map(j => `<option value="${esc(j)}">${esc(jn(j))}</option>`).join("")}</select></label></div>`,
      `<div id="contoh-ina">${contoh(I, "per_penduduk", "banjir")}</div>`,
      `<ul class="sg-daftar">${I.hipotesis.map(h => `<li>${esc(h)}</li>`).join("")}</ul>`);
  }

  /* ---------- kartu 0: beda sumber hari ini (scripts/bnpb/silang/beda_sumber.py; ALGORITMA bagian 3) ---------- */
  const BH = {hujan: "Hujan", gelombang: "Gelombang laut"};
  const NB_MAKS = 200;
  const nilaiB = x => `${x.nilai_teks ? x.nilai_teks + " " + x.satuan + " (tidak tertulis)" : Number(x.nilai).toLocaleString("id-ID", {maximumFractionDigits: 1}) + " " + x.satuan}, peringkat ${n(x.peringkat)}`;
  function tabelBeda(B, bahaya) {
    const r = B.baris.filter(x => bahaya === "semua" || x.bahaya === bahaya);
    if (!r.length) return `<p class="sg-kosong">Tidak ada perbandingan yang perlu dicek pada pilihan ini.</p>`;
    const t = tabel(["Bahaya", "Tempat", "Hari", ["Sumber resmi", "Nilai dan peringkat 0 sampai 3 dari lembaga resmi"], ["Sumber model", "Nilai dan peringkat 0 sampai 3 dari model; yang tidak tertulis berarti di bawah ambang catatnya"], "Alasan tanda"],
      r.slice(0, NB_MAKS).map(x => [BH[x.bahaya] || x.bahaya, x.tempat.nama, tglPendek(x.hari), `${x.a.lembaga}: ${nilaiB(x.a)}`, `${x.b.lembaga}: ${nilaiB(x.b)}`, x.alasan]));
    return t + (r.length > NB_MAKS ? `<p class="sg-p">Menampilkan ${n(NB_MAKS)} dari ${n(r.length)} perbandingan, urut dari selisih peringkat terbesar.</p>` : "");
  }
  function kartuBeda(B) {
    if (!B) return kartu("k-beda", "beda", "Beda sumber hari ini", "Data beda sumber hari ini belum tersedia", `<p class="sg-kosong">Berkas beda_sumber.json belum bisa dibaca.</p>`);
    const r = B.ringkas, pb = r.per_bahaya, tdk = Object.values(pb).reduce((a, h) => a + h.tidak_dibandingkan, 0);
    const judul = `${hl(n(r.n_perlu_dicek))} dari ${hl(n(r.n_dibandingkan))} perbandingan sumber resmi lawan model perlu dicek, dan ${hl(n(tdk))} lokasi-hari tidak bisa dibandingkan karena salah satu sumber tidak ada`;
    const ring = Object.keys(pb).map(k => `${BH[k] || k}: ${n(pb[k].perlu_dicek)} perlu dicek, ${n(pb[k].selaras)} selaras, ${n(pb[k].tidak_dibandingkan)} tidak dibandingkan`).join("; ");
    return kartu("k-beda", "beda", "Beda sumber hari ini", judul,
      `<div class="sg-pilpil">${pil("Deteksi Centurisk97, belum teruji balik", "bahaya", "sg-pil-hip")}${pil("Perbandingan dua sumber, bukan vonis", "info", "sg-pil-info")}${pil(`Ambang awal: ${n(B.ambang.peringkat)} peringkat atau ${n(B.ambang.rasio)} kali`, "bahaya", "sg-pil-hip")}</div>`,
      asal("Data: prakiraan BMKG dan model Open-Meteo yang diarsipkan sebelum hari targetnya.", B.dibuat),
      `<p class="sg-p">${esc(ring)}. Tanda perlu dicek berarti kedua nilai berbeda lewat ambang awal; layar tidak menyatakan sumber mana yang benar. Tanda dihitung ulang tiap hari.</p>`,
      segmen("bahaya-beda", [["semua", "Semua"], ...Object.keys(pb).map(k => [k, BH[k] || k])], "semua"), `<div id="tabel-beda">${tabelBeda(B, "semua")}</div>`,
      `<ul class="sg-daftar">${B.catatan.map(c => `<li>${esc(c)}</li>`).join("")}</ul>`);
  }

  /* ---------- pasang ---------- */
  window.DasborA?.pasang({nama: "Silang sumber", sub: "Rapor sumber, beda sumber, kajian kejadian"});   // model A (sistem desain dashboard)
  async function mulai() {
    const isi = $("#isi"), pesan = $("#pesan");
    try {
      const [R, I, B] = await Promise.all([...["rekonsiliasi_dalops_dibi", "inarisk_vs_kejadian"].map(f => fetch(`/data/bnpb/${f}.json`).then(r => { if (!r.ok) throw new Error(f + " " + r.status); return r.json(); })),
        fetch("/data/bnpb/beda_sumber.json").then(r => r.ok ? r.json() : null).catch(() => null)]);   // beda sumber gagal = kartunya saja yang kosong
      SEBAGIAN = R.cakupan.tahun_sebagian; AKHIR = R.cakupan.tanggal_akhir;
      isi.innerHTML = kartuBeda(B) + kartu1(R) + kartu2(R) + kartu3(I);
      isi.hidden = false; pesan.hidden = true; pasangTip();
      if (B) isi.querySelector('[data-aksi="bahaya-beda"]').addEventListener("click", e => {
        const b = e.target.closest("button[data-k]"); if (!b || b.getAttribute("aria-pressed") === "true") return;
        e.currentTarget.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        $("#tabel-beda").innerHTML = tabelBeda(B, b.dataset.k);
      });
      let norma = "per_penduduk";
      $("#pilih-jenis").addEventListener("change", e => { $("#tabel-prov").innerHTML = tabelProv(R, e.target.value); });
      $("#pilih-ina").addEventListener("change", e => { $("#contoh-ina").innerHTML = contoh(I, norma, e.target.value); });
      isi.querySelector('[data-aksi="norma"]').addEventListener("click", e => {
        const b = e.target.closest("button[data-k]"); if (!b || b.dataset.k === norma) return;
        norma = b.dataset.k;
        e.currentTarget.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        $("#grafik-ina").innerHTML = grafikIna(I, norma); $("#tabel-ina").innerHTML = tabelIna(I, norma); $("#contoh-ina").innerHTML = contoh(I, norma, $("#pilih-ina").value);
      });
    } catch (e) { pesan.className = "bn-pesan galat"; pesan.textContent = "Data kajian belum tersedia: " + e.message; }
  }
  mulai();
})();
