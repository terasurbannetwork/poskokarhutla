/* Tab Ringkasan (PH-12, potensi-hidromet D15, D16, ALGORITMA 9): enam bab bernomor dari templat kalimat tetap, diisi angka hari itu.
   Tiap angka membawa chip status fakta; tanpa tafsir sebab, tanpa ramalan kejadian, tanpa kata "aman". Ini halaman baca, jadi bab boleh berkalimat. ctx: lihat app.js. */
import { esc, angka, tgl, NAMA, BELUM, chip, pakaiGaya, bahan } from "/potensi/analisis.js";

const BAB = ["Keadaan hari ini", "Bahaya yang paling banyak naik", "Kab/kota yang perlu dipantau", "Iklim", "Yang belum terukur", "Cara halaman ini dibuat"];
const fk = (nilai, jenis, tip) => `<span class="bc-fk"><b>${esc(nilai)}</b>${chip(jenis, tip)}</span>`; // satu angka beserta chip faktanya
const kab = (n) => `${angka(n)} kab/kota`;

export function pasang(ctx) {
  pakaiGaya();
  const { panel } = ctx;
  panel.innerHTML = '<h2 class="po-sek">Ringkasan</h2><p class="bc-info" role="status">Memuat ringkasan</p>';
  bahan().then(({ an, st, ik, kelas }) => {
    const DP = globalThis.DampakPeringatan;
    const nm = (k) => kelas?.kab?.[k]?.nama || k;
    const kodes = st?.kab ? [...new Set(Object.values(st.kab).flatMap((v) => Object.keys(v || {})))].filter((c) => NAMA[c]) : [];
    const sh = (k, c, h) => { const e = DP.entriStatus(st, k, c), s = DP.statusHari(e, h); return s === 0 && e?.sebagian === true ? null : s; };
    const bab = [];

    /* 1. keadaan hari ini */
    if (st?.kab && DP) {
      const r0 = DP.ringkas(st, 0, kodes), r3 = DP.ringkas(st, "ringkas", kodes);
      const baris = (r) => [["Awas", r.awas], ["Siaga", r.siaga], ["Waspada", r.waspada], ["Normal", r.normal]].map(([n, v]) => `${fk(kab(v), "hitung", "Dihitung dari status tiap kab/kota")} berstatus ${n}`).join(", ");
      bab.push(`<p>Pada ${esc(tgl(st.dibuat) || "tanggal yang tidak tercatat")}, hari ini: ${baris(r0)}, dan ${fk(kab(r0.belum), "belum", "Sumber belum masuk atau basi")} belum bisa dinilai.</p>
<p>Jika empat hari ke depan digabung dan diambil yang tertinggi: ${baris(r3)}, dan ${fk(kab(r3.belum), "belum")} belum bisa dinilai.</p>
<p class="bc-cat">${chip("hipotesis", "Status dari model Centurisk97 yang belum lolos uji balik")} Status prakiraan masih hipotesis. Status Normal berarti tidak ada pemicu di atas ambang dalam tiga hari menurut prakiraan dan BMKG, bukan jaminan keselamatan.</p>`);
    } else bab.push(`<p>${BELUM}. Status prakiraan belum bisa dibaca.</p><p>${chip("belum")}</p>`);

    /* 2. bahaya yang paling banyak naik: kab/kota yang status hari ke-3 lebih tinggi dari hari ini */
    if (st?.kab && DP) {
      const naik = kodes.map((c) => [c, Object.keys(st.kab).filter((k) => { const a = sh(k, c, 0), b = sh(k, c, 3); return a != null && b != null && b > a; }).length]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
      bab.push(naik.length ? `<p>Status hari ke-3 lebih tinggi daripada hari ini di paling banyak kab/kota untuk: ${naik.map(([c, n]) => `${esc(NAMA[c].toLowerCase())} ${fk(kab(n), "hitung", "Dihitung: status hari ke-3 dibanding hari ini")}`).join(", ")}.</p><p class="bc-cat">Status dibandingkan hanya bila kedua hari terukur.</p>`
        : `<p>Tidak ada kab/kota yang statusnya hari ke-3 lebih tinggi daripada hari ini, di antara yang terukur ${chip("hitung", "Dihitung: status hari ke-3 dibanding hari ini")}.</p>`);
    } else bab.push(`<p>${BELUM}. Perbandingan hari belum bisa dihitung.</p><p>${chip("belum")}</p>`);

    /* 3. kab yang perlu dipantau: status ringkas tertinggi, seri diputus jumlah bahaya berkelas kab tinggi */
    if (st?.kab && DP) {
      const L = Object.keys(st.kab).map((k) => { const v = kodes.map((c) => [c, sh(k, c, "ringkas")]).filter((x) => x[1] != null); const m = v.length ? Math.max(...v.map((x) => x[1])) : null; return { k, m, c: v.filter((x) => x[1] === m).map((x) => x[0]), t: kodes.filter((c) => kelas?.kab?.[k]?.K?.[c] === "tinggi").length }; })
        .filter((x) => x.m >= 2).sort((a, b) => b.m - a.m || b.t - a.t || nm(a.k).localeCompare(nm(b.k), "id"));
      bab.push(L.length ? `<p>${fk(kab(L.length), "hitung", "Status Siaga atau Awas pada ringkas 3 hari")} berstatus Siaga atau Awas dalam empat hari ke depan. Delapan teratas:</p><ul class="bc-ul">${L.slice(0, 8).map((x) => `<li>${esc(nm(x.k))}: <span class="bc-st bc-st${x.m}">${DP.TINGKAT[x.m]}</span> untuk ${esc(x.c.map((c) => NAMA[c].toLowerCase()).join(", "))}</li>`).join("")}</ul>` : `<p>Tidak ada kab/kota berstatus Siaga atau Awas dalam empat hari ke depan, di antara yang terukur ${chip("hitung")}.</p>`);
    } else bab.push(`<p>${BELUM}. Daftar kab/kota belum bisa disusun.</p><p>${chip("belum")}</p>`);

    /* 4. iklim */
    const on = ik?.oni_status, io = ik?.iod, p4 = [];
    if (on && Number.isFinite(on.nilai)) p4.push(`<p>Indeks ONI musim ${esc(on.musim)} ${esc(on.tahun)} bernilai ${fk(angka(on.nilai, 2), on.basi ? "belum" : "sumber", "NOAA CPC")}, data berumur ${angka(on.umur_hari)} hari${on.basi ? ", sudah basi" : ""}.${ik.cpc_status ? ` Status resmi NOAA CPC: ${esc(ik.cpc_status)}.` : ""}</p>`);
    else p4.push(`<p>ONI: ${BELUM} ${chip("belum")}</p>`);
    if (io && Number.isFinite(io.nilai)) p4.push(`<p>Indeks IOD bernilai ${fk(angka(io.nilai, 2), io.basi ? "belum" : "sumber", io.sumber || "")} (${esc(io.sumber || "sumber tak tercatat")}, ${esc(tgl(io.tgl_data) || "tanggal tak tercatat")})${io.basi ? ", sudah basi" : ""}.</p>`);
    else p4.push(`<p>IOD: ${BELUM} ${chip("belum")}</p>`);
    bab.push(p4.join("") + '<p class="bc-cat">Indeks iklim dilaporkan apa adanya dari sumbernya; halaman ini tidak menafsirkan pengaruhnya pada kejadian tertentu.</p>');

    /* 5. yang belum terukur */
    const bl = [];
    if (!an) bl.push("Berkas analisis tidak bisa dibaca, jadi semua daftar di tab Analisis kosong.");
    else {
      const s = an.sumber || {};
      if (!an.hth) bl.push(`Hari tanpa hujan per kab/kota${tgl(s.hth) ? `: data terakhir ${tgl(s.hth)}` : ": tanggal data tidak tercatat"}.`);
      if (!an.hujan?.length) bl.push("Hujan prakiraan tertinggi.");
      if (!an.gelombang?.length) bl.push("Gelombang tertinggi.");
      if (!an.debit?.daftar?.length) bl.push("Debit sungai tertinggi.");
      if (!an.desa_tinggi?.length) bl.push("Desa dengan bahaya tinggi terbanyak.");
    }
    if (!st) bl.push("Status prakiraan seluruhnya.");
    else {
      if (st.sumber?.umpan_bmkg === "basi" || st.sumber?.umpan_bmkg == null) bl.push("Umpan peringatan BMKG sudah basi atau belum masuk, sehingga status Normal tidak ditampilkan hijau di kab/kota yang bergantung padanya.");
      if (st.sumber?.kelas_kab === false) bl.push("Kelas bahaya kab/kota belum dipakai penuh dalam status.");
      if (st.kab && DP) { const n = Object.keys(st.kab).filter((k) => kodes.every((c) => sh(k, c, "ringkas") == null)).length; if (n) bl.push(`${kab(n)} tanpa satu pun bahaya yang terukur.`); }
    }
    if (ik?.oni_status?.basi) bl.push("Indeks ONI sudah basi.");
    if (ik?.iod?.basi) bl.push("Indeks IOD sudah basi.");
    bab.push(bl.length ? `<ul class="bc-ul">${bl.map((x) => `<li>${esc(x)} ${chip("belum")}</li>`).join("")}</ul><p class="bc-cat">Belum terukur tidak berarti nol atau aman; artinya datanya tidak ada.</p>` : "<p>Semua sumber yang dibutuhkan halaman ini terbaca dan segar pada saat data dibangun.</p>");

    /* 6. cara dibuat (kalimat tetap) */
    bab.push(`<p>Halaman ini ditulis mesin dari data hari itu. Kalimatnya templat tetap; hanya angkanya yang berganti. Setiap angka diberi satu dari empat chip: ${chip("sumber")} sumber publik menyebutnya, ${chip("hitung")} dihitung dari fakta lain, ${chip("hipotesis")} model kita yang belum lolos uji balik, ${chip("belum")} datanya tidak ada.</p>
<p>Status per kab/kota memadukan prakiraan Centurisk97 dan peringatan BMKG dengan kelas bahaya kab/kota. Rincian ada di tab Sumber dan di <a href="/docs/">dokumentasi</a>.</p>`);

    panel.innerHTML = `<h2 class="po-sek">Ringkasan</h2><div class="bc-dua bc-bab"><nav class="bc-daftarbab" aria-label="Daftar bab"><ol>${BAB.map((n, i) => `<li><button type="button" data-bab="${i}">${i + 1}. ${esc(n)}</button></li>`).join("")}</ol></nav><div class="bc-isibab">${bab.map((h, i) => `<section class="bc-bb" id="rk-${i}" tabindex="-1" aria-labelledby="rk-j${i}"><h3 id="rk-j${i}"><span class="bc-no">${i + 1}</span>${esc(BAB[i])}</h3>${h}</section>`).join("")}</div></div>`;
    panel.querySelector(".bc-daftarbab").addEventListener("click", (e) => {
      const b = e.target.closest("[data-bab]"); if (!b) return;
      const s = panel.querySelector("#rk-" + b.dataset.bab); s.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" }); s.focus({ preventScroll: true });
    });
  });
}
