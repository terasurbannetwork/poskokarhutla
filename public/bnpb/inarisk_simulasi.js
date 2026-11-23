"use strict";
/* Tab IRBI tambahan (PRD F-12, F-13; KEPUTUSAN D11-D13): simulasi kapasitas daerah dan risiko besok.
   Dipanggil inarisk.js sesudah tiap gambar() lewat Ir.tambahanIrbi(filter, irbi). */
(() => {
  const {H} = Ir;
  const NAMA_P = ["Kebijakan dan kelembagaan", "Pengkajian risiko", "Sistem informasi, diklat, logistik", "Kawasan rawan bencana",
    "Pencegahan dan mitigasi", "Kesiapsiagaan dan darurat", "Pemulihan"];
  const ATURAN = {banjir: "Banjir", longsor: "Tanah longsor", karhutla: "Kebakaran hutan dan lahan", asap: "Asap", melaut: "Gelombang tinggi", angin: "Angin kencang"};
  let prediksi = null;
  const muatPrediksi = () => prediksi ??= fetch("/prediksi/data/prediksi.json", {cache: "no-cache"}).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const kecil = v => v > 0 && v < 0.005 ? "<0,01" : H.angka2(v);   // selisih nyaris nol tidak tampil 0,00
  const nama = (d, p) => esc(d.kab[p]?.[0] || p);
  const tombol = (p, nm) => `<button type="button" class="ir-ikon" data-kab="${esc(p)}" aria-label="Lihat detail ${nm}">›</button>`;

  /* analisa IKD terbaru per kab (kunci "pcode/tahun") */
  function analisaPerKab(ikd) {
    const m = new Map();
    for (const [k, a] of Object.entries(ikd.analisa)) {
      const [p, t] = k.split("/");
      if (p.length !== 4 || !a.nilai) continue;
      if (!m.has(p) || m.get(p).tahun < +t) m.set(p, {tahun: +t, ...a});
    }
    return m;
  }

  function simulasi(f, d, ikd) {
    const tahun = d.tahun[d.tahun.length - 1];   // simulasi selalu pada IRBI terbaru (dasar HV 2021)
    const skorKini = H.urut(d, tahun, "total");
    const baris = [];
    for (const [p, a] of analisaPerKab(ikd)) {
      if (f.prov && !p.startsWith(f.prov)) continue;
      const indeks = a.indeks ?? H.ikdDariP(a.nilai), r = H.rencanaKapasitas(a.nilai, indeks), s = H.skor(d, p, tahun);
      if (!r || s === null || r.cBaru === r.cLama) continue;
      const baru = s * r.cLama / r.cBaru;
      baris.push({p, a, indeks, r, s, baru, rk: skorKini.findIndex(x => x.pcode === p) + 1, rkBaru: 1 + skorKini.filter(x => x.pcode !== p && x.skor > baru).length});
    }
    baris.sort((x, y) => x.r.selisih - y.r.selisih || (y.s - y.baru) - (x.s - x.baru));
    $("#irSimKet").textContent = baris.length
      ? `IKD = 0,06 P1 + 0,06 P2 + 0,075 P3 + 0,105 P4 + 0,21 P5 + 0,35 P6 + 0,14 P7 (diukur dari ${H.angka0(Object.keys(ikd.analisa).length)} analisa InaRISK). Naik satu kelas kapasitas membagi skor risiko tiap bahaya: kelas 1 ke 2 separuh, kelas 2 ke 3 dua pertiga. IRBI ${tahun}.`
      : "Belum ada analisa IKD untuk wilayah ini.";
    $("#irSimBaris").innerHTML = baris.slice(0, 60).map(x => {
      const nm = nama(d, x.p);
      const rencana = x.r.langkah.map(l => `<li data-tip="<b>P${l.p}</b> ${esc(NAMA_P[l.p - 1])}<br>Dari: ${H.angka2(l.dari)}<br>Ke: ${H.angka2(l.ke)}<br>Bobot: ${H.angka2(H.BOBOT_IKD[l.p - 1] * 100)}%">P${l.p} naik ${kecil(l.ke - l.dari)}</li>`).join("");
      return `<tr><td class="ir-lbl">${nm}<small>${esc(d.prov[x.p.slice(0, 2)] || "")}, IKD ${x.a.tahun}</small></td><td class="n">${H.angka2(x.indeks)}</td>` +
        `<td class="n">${kecil(x.r.selisih)}<small>ke ${H.angka2(x.r.ambang)}</small></td><td><ul class="ir-rencana">${rencana}</ul></td>` +
        `<td class="n">${H.angka2(x.s)} ${Ir.pil(H.kelas(x.s))}</td><td class="n">${H.angka2(x.baru)} ${Ir.pil(H.kelas(x.baru))}</td>` +
        `<td class="n">${H.angka0(x.rk)} ke ${H.angka0(x.rkBaru)}</td></tr>`;
    }).join("") || `<tr><td colspan="7" class="ir-p">Tidak ada kabupaten/kota yang bisa naik kelas kapasitas.</td></tr>`;
  }

  function besok(f, d, pr) {
    const daftar = H.risikoBesok(pr.waspada, d).filter(x => !f.prov || x.pcode.startsWith(f.prov));
    const h1 = Object.values(pr.kode || {}).find(k => k.hari?.length)?.hari[0];   // tanggal tenggang 1 dari data, bukan dihitung dari jam
    const hari = h1 ? Ir.tanggal(h1) : "hari pertama prakiraan";
    $("#irBskKet").textContent = `Prakiraan Centurisk97 untuk ${hari}, belum teruji`;
    $("#irBskBaris").innerHTML = daftar.map(x => {
      const nm = nama(d, x.pcode);
      return `<tr><td class="ir-lbl">${nm}<small>${esc(d.prov[x.pcode.slice(0, 2)] || "")}</small></td><td>${Ir.pil(x.kelas)}</td><td class="n">${H.angka2(x.skor)}</td>` +
        `<td><ul class="ir-rencana">${x.aturan.map(a => `<li title="${esc(a.maka || "")}">${esc(ATURAN[a.aturan] || a.aturan)}</li>`).join("")}</ul></td>` +
        `<td class="n">${H.angka2(x.skorBahaya)}</td><td class="n">${H.angka0(x.jiwa)}</td><td>${tombol(x.pcode, nm)}</td></tr>`;
    }).join("") || `<tr><td colspan="7" class="ir-p">Tidak ada waspada prakiraan untuk besok${f.prov ? " di provinsi ini" : ""}. Lihat rincian di <a href="/prediksi">/prediksi</a>.</td></tr>`;
  }

  Ir.tambahanIrbi = (f, d) => {
    Ir.muat("ikd.json").then(ikd => simulasi(f, d, ikd)).catch(() => { $("#irSimBaris").innerHTML = `<tr><td colspan="7" class="ir-p">Data IKD belum tersedia.</td></tr>`; });
    muatPrediksi().then(pr => besok(f, d, pr)).catch(() => { prediksi = null; $("#irBskBaris").innerHTML = `<tr><td colspan="7" class="ir-p">Prakiraan besok belum bisa dimuat.</td></tr>`; });
  };
})();
