/* Biaya Claude Bot Laporan BNPB (/admin/biaya-bot, admin saja; K25, K31, K38 di data/kajian-bnpb/bot-laporan/KEPUTUSAN-BOT-LAPORAN.md).
   Data: GET /api/wa/biaya/ringkas -> {hari_ini, dari, harian: [{tanggal, usd_mikro}] dari D1 bl_biaya (90 hari), rinci: ringkasan mesin bot atau null}.
   Harian D1 = sumber lengkap; per kegiatan dan per laporan dari catatan mesin bot (mulai 19 Nov 2026), selisihnya tampil sebagai "Belum terpilah".
   Tanpa sisa saldo (K31). Kit dashboard Admin.dasbor; CSP admin: tanpa skrip/gaya inline, teks dari data lewat textContent. */
(() => {
  const DB = Admin.dasbor, app = DB.tumpuk(document.getElementById("app"));
  const NS = "http://www.w3.org/2000/svg";
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak.flat()) if (a != null) e.append(a); return e; };
  const s = (tag, att) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(att || {})) e.setAttribute(k, v); return e; };
  const dolar = u => "$" + Number(u || 0).toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tglPendek = t => `${Number(t.slice(8, 10))} ${BULAN[Number(t.slice(5, 7)) - 1]}`;
  const KEG = {laporan: "Membuat dan merevisi laporan", tinjau: "Tinjau visual draf", tanya: "Tanya isi draf", rapikan: "Rapikan bahan WA", percakapan: "Kalimat bebas dan obrolan"};
  const tglProyek = id => { const m = /^P-(\d{2})(\d{2})(\d{2})-/.exec(id); return m ? `${Number(m[1])} ${BULAN[Number(m[2]) - 1]} 20${m[3]}` : ""; };
  const kosong = teks => h("p", {class: "bb-kosong", teks});

  /* deret harian lengkap (hari tanpa pemakaian = 0, karena D1 hanya menyimpan hari yang terpakai) */
  function deret(dari, sampai, baris) {
    const peta = new Map(baris.map(r => [r.tanggal, r.usd_mikro / 1e6])), out = [];
    for (let t = Date.parse(dari + "T00:00:00Z"); t <= Date.parse(sampai + "T00:00:00Z"); t += 864e5) { const k = new Date(t).toISOString().slice(0, 10); out.push({t: k, usd: peta.get(k) || 0}); }
    return out;
  }

  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  /* batang harian: SVG + tooltip .ad-tip (admin.css, sama dengan grafik Statistik). Sorot atau fokus batang = tanggal, biaya, porsi bulan;
     batang berisi diberi angka di atasnya supaya terbaca tanpa disorot. Tiap batang bisa difokus keyboard (aria-label = isi tooltip). */
  function grafik(hari, bulanIni, totalBulan) {
    const W = 900, H = 220, kiri = 44, bawah = 24, atas = 22, maks = Math.max(...hari.map(d => d.usd), 0.01);
    const langkah = [0.5, 1, 2, 5, 10, 20, 25, 50, 100].find(x => maks / x <= 5) || 200, puncak = Math.ceil(maks / langkah) * langkah;
    const lebar = (W - kiri) / hari.length, y = v => atas + (H - atas - bawah) * (1 - v / puncak);
    const g = s("svg", {viewBox: `0 0 ${W} ${H}`, class: "bb-grafik", role: "group", "aria-label": `Pemakaian harian ${hari.length} hari terakhir, tertinggi ${dolar(maks)}`});
    const tip = h("div", {class: "ad-tip bb-tip", hidden: true, "aria-hidden": "true"}), wadah = h("div", {class: "bb-grafik-wadah"}, g, tip);
    for (let v = 0; v <= puncak + 1e-9; v += langkah) {
      g.append(s("line", {x1: kiri, x2: W, y1: y(v), y2: y(v), class: "bb-kisi"}));
      const t = s("text", {x: kiri - 6, y: y(v) + 4, class: "bb-sumbu", "text-anchor": "end"}); t.textContent = dolar(v).replace(",00", ""); g.append(t);
    }
    const tampil = (b, d) => {
      const tgl = new Date(d.t + "T00:00:00Z"), porsi = d.t.startsWith(bulanIni) && totalBulan > 0 ? Math.round(d.usd / totalBulan * 100) : null;
      tip.replaceChildren(h("span", {teks: `${HARI[tgl.getUTCDay()]}, ${tglPendek(d.t)}`}), h("b", {teks: dolar(d.usd)}), porsi != null && d.usd > 0 ? h("span", {teks: `${porsi < 1 ? "<1" : porsi}% dari bulan ini`}) : null);
      tip.hidden = false;
      const kotak = g.getBoundingClientRect(), wk = wadah.getBoundingClientRect(), vb = g.viewBox.baseVal, isi = b.querySelector(".bb-isi");
      const x = kotak.left - wk.left + (Number(isi.getAttribute("x")) + Number(isi.getAttribute("width")) / 2) / vb.width * kotak.width + wadah.scrollLeft;
      const yy = kotak.top - wk.top + (Math.min(Number(isi.getAttribute("y")), H - bawah - 2) - (b.querySelector(".bb-nilai") ? 18 : 0)) / vb.height * kotak.height;
      tip.style.left = Math.min(wadah.scrollWidth - tip.offsetWidth / 2 - 4, Math.max(tip.offsetWidth / 2 + 4, x)) + "px"; tip.style.top = yy + "px";
      g.querySelectorAll(".bb-batang.aktif").forEach(z => z.classList.remove("aktif")); b.classList.add("aktif");
    };
    const sembunyi = () => { tip.hidden = true; g.querySelectorAll(".bb-batang.aktif").forEach(z => z.classList.remove("aktif")); };
    hari.forEach((d, i) => {
      const x = kiri + i * lebar, tinggi = Math.max(H - bawah - y(d.usd), d.usd > 0 ? 2 : 0);
      const b = s("g", {class: "bb-batang", tabindex: "0", role: "img", "aria-label": `${tglPendek(d.t)}: ${dolar(d.usd)}`});
      b.append(s("rect", {x, y: atas - 18, width: lebar, height: H - bawah - atas + 18, class: "bb-sasaran"}), s("rect", {x: x + lebar * 0.18, y: H - bawah - tinggi, width: lebar * 0.64, height: tinggi, rx: 4, class: "bb-isi"}));
      if (d.usd >= 0.005 && lebar >= 28) { const t = s("text", {x: x + lebar / 2, y: H - bawah - tinggi - 6, class: "bb-nilai", "text-anchor": "middle"}); t.textContent = dolar(d.usd); b.append(t); }
      b.addEventListener("pointerenter", () => tampil(b, d)); b.addEventListener("focus", () => tampil(b, d));
      b.addEventListener("pointerdown", () => tampil(b, d)); b.addEventListener("blur", sembunyi);
      g.append(b);
      if (d.t.endsWith("-01") || i === 0 || i === hari.length - 1 || (hari.length <= 21 && i % 7 === 0)) { const t = s("text", {x: i === hari.length - 1 ? W : i === 0 ? x : x + lebar / 2, y: H - 6, class: "bb-sumbu", "text-anchor": i === hari.length - 1 ? "end" : i === 0 ? "start" : "middle"}); t.textContent = tglPendek(d.t); g.append(t); }
    });
    g.addEventListener("pointerleave", sembunyi);
    return wadah;
  }

  const batangSel = (usd, maks) => { const i = h("i"); i.style.setProperty("--p", `${maks > 0 ? Math.max(1, usd / maks * 100) : 0}%`); return h("span", {class: "bb-bar"}, i); };

  function gambar(D) {
    const kini = D.hari_ini, bulanIni = kini.slice(0, 7);
    const hari = deret(D.dari, kini, D.harian || []);
    /* grafik mulai sehari sebelum pemakaian pertama (paling sedikit 14 hari, paling banyak 60) supaya batang tidak menumpuk di ujung */
    const awal = hari.findIndex(d => d.usd > 0), nGrafik = Math.min(60, Math.max(14, awal < 0 ? 14 : hari.length - awal + 1)), enam = hari.slice(-nGrafik);
    const jml = xs => xs.reduce((a, d) => a + d.usd, 0);
    const hariBulan = hari.filter(d => d.t.startsWith(bulanIni)), bulan = jml(hariBulan);
    const mulaiBulan = hariBulan.findIndex(d => d.usd > 0), nHariBulan = mulaiBulan < 0 ? 1 : hariBulan.length - mulaiBulan;   // sejak hari pertama terpakai bulan ini
    const prBulan = Object.entries(D.rinci?.proyek || {}).filter(([, v]) => new Date(v.waktu + 7 * 36e5).toISOString().startsWith(bulanIni));
    const nPr = prBulan.length, jmlPr = prBulan.reduce((a, [, v]) => a + v.usd, 0);
    const ubin = DB.ubinGrid(
      DB.ubin({ikon: "jam", label: "Hari ini", nilai: dolar(hari.at(-1)?.usd), ket: tglPendek(kini)}),
      DB.ubin({ikon: "grafik", label: "Bulan ini", nilai: dolar(bulan), ket: `${BULAN[Number(bulanIni.slice(5)) - 1]} ${bulanIni.slice(0, 4)}`}),
      DB.ubin({ikon: "grafik", label: "Rata-rata per hari", nilai: dolar(bulan / nHariBulan), ket: mulaiBulan < 0 ? "bulan ini" : `sejak ${tglPendek(hariBulan[mulaiBulan].t)}`}),
      DB.ubin({ikon: "berkas", label: "Rata-rata per laporan", nilai: nPr ? dolar(jmlPr / nPr) : "–", ket: nPr ? `${nPr.toLocaleString("id-ID")} laporan` : "belum ada rincian"}));

    const R = D.rinci, keg = Object.entries(R?.kegiatan?.[bulanIni] || {}).map(([k, usd]) => ({k, label: KEG[k] || k, usd})).filter(x => x.usd > 0).sort((a, b) => b.usd - a.usd);
    const sisa = bulan - keg.reduce((a, x) => a + x.usd, 0);
    if (R && sisa >= 0.005) keg.push({k: "_", label: "Belum terpilah (sebelum catatan per kegiatan dimulai)", usd: sisa});
    keg.splice(0, keg.length, ...keg.filter(x => x.usd >= 0.005));   // di bawah satu sen tidak ditampilkan (tetap terhitung di total)
    const maksKeg = Math.max(0, ...keg.map(x => x.usd));
    const kartuKeg = DB.kartu({ikon: "kisi", judul: "Per kegiatan", ey: "Bulan ini"},
      !R ? kosong("Mesin bot belum mengirim rincian. Rincian muncul paling lama 10 menit sesudah bot berjalan dengan versi terbaru.")
        : keg.length ? DB.tabel(["Kegiatan", ["Biaya", "USD bulan ini"], ["Porsi", "Porsi dari pemakaian bulan ini menurut D1"]],
          keg.map(x => h("tr", {class: x.k === "_" ? "bb-redup" : ""}, h("td", {teks: x.label}), h("td", {class: "bb-angka", teks: dolar(x.usd)}),
            h("td", null, h("div", {class: "bb-porsi"}, batangSel(x.usd, maksKeg), h("span", {teks: bulan > 0 ? (x.usd / bulan < 0.01 ? "<1%" : Math.round(x.usd / bulan * 100).toLocaleString("id-ID") + "%") : "–"})))))) : kosong("Belum ada pemakaian bulan ini."));

    const pr = Object.entries(R?.proyek || {}).map(([id, v]) => ({id, ...v})).sort((a, b) => b.waktu - a.waktu);
    const maksPr = Math.max(0, ...pr.map(x => x.usd));
    const kartuPr = DB.kartu({ikon: "berkas", judul: "Per laporan", ey: "Bot Laporan BNPB", kanan: pr.length ? h("span", {class: "bb-hitung", teks: `${pr.length.toLocaleString("id-ID")} laporan`}) : null},
      !R ? kosong("Mesin bot belum mengirim rincian.")
        : pr.length ? DB.tabel([["Laporan", "Nomor proyek P-hhbbtt-NN"], "Tanggal", ["Biaya", "Total USD laporan ini termasuk revisi"], ""],
          pr.map(x => h("tr", null, h("td", null, h("b", {teks: x.id})), h("td", {teks: tglProyek(x.id)}), h("td", {class: "bb-angka", teks: dolar(x.usd)}), h("td", null, batangSel(x.usd, maksPr))))) : kosong("Belum ada laporan tercatat."));

    const diperbarui = R?.diperbarui ? new Date(R.diperbarui).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}) : null;
    app.replaceChildren(
      ubin,
      DB.kartu({ikon: "grafik", judul: "Pemakaian harian", ey: `${enam.length.toLocaleString("id-ID")} hari`, kanan: diperbarui ? h("span", {class: "bb-hitung", teks: `Rincian mesin ${diperbarui} WIB`}) : null}, grafik(enam, bulanIni, bulan)),
      kartuKeg, kartuPr);   // susun satu kolom: kolom berdampingan beda panjang meninggalkan ruang kosong
  }

  fetch("/api/wa/biaya/ringkas", {credentials: "same-origin"}).then(async r => {
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = "/admin/masuk?ke=/admin/biaya-bot"; return; }
    if (!r.ok) throw new Error(j.galat || "HTTP " + r.status);
    gambar(j);
  }).catch(e => app.replaceChildren(DB.kartu({ikon: "waspada", judul: "Biaya bot"}, kosong("Gagal memuat: " + e.message))));
})();
