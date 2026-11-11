/* prioritas.js — ikon "Prioritas provinsi" di kepala halaman: status daftar prioritas hotspot per provinsi.
   Aturan: data/kajian-bnpb/ambang-hotspot (keputusan pemilik 11 Nov 2026). Skrip klasik, dimuat SETELAH sapa.js (memakai SapaInti.dialog/css).
   Data: data/harian_panjang.json = hotspot lokasi unik per hari WIB, semua satelit = satuan laporan BNPB. Diambil malas saat ikon diklik. */
(() => {
  /* Garis dalam satuan laporan = garis dasar VIIRS (masuk 50, keluar 25) x rasio satelit. Rasio 3,0 untuk jendela berakhir s.d. 7 Nov 2026, 2,4 mulai 8 Nov 2026. */
  const ATURAN = [{sampai: "2026-11-07", rasio: 3.0, masuk: 150, keluar: 75}, {sampai: "9999-12-31", rasio: 2.4, masuk: 120, keluar: 60}];
  const HARI_KELUAR = 7, JENDELA = 7;
  const garisPada = tgl => ATURAN.find(a => tgl <= a.sampai);

  /* Histeresis hari demi hari. hari = ["YYYY-MM-DD"...] urut naik, v = angka harian sejajar, hariIni = hari WIB berjalan (belum selesai, dibuang).
     Mengembalikan jejak per hari lengkap (jendela 7 hari lengkap): {tgl, h7, masuk, keluar, st: "prioritas"|"bertahan"|"luar", bawah, sejak}. */
  function jalan(hari, v, hariIni) {
    const n = hari.length - (hari[hari.length - 1] === hariIni ? 1 : 0), out = [];
    let dalam = false, bawah = 0, sejak = null;
    for (let i = JENDELA - 1; i < n; i++) {
      let s = 0; for (let j = i - JENDELA + 1; j <= i; j++) s += v[j] || 0;
      const h7 = s / JENDELA, g = garisPada(hari[i]);
      if (h7 >= g.masuk) { if (!dalam) sejak = hari[i]; dalam = true; bawah = 0; }
      else if (dalam) { bawah = h7 < g.keluar ? bawah + 1 : 0; if (bawah >= HARI_KELUAR) { dalam = false; bawah = 0; sejak = null; } }
      out.push({tgl: hari[i], h7, masuk: g.masuk, keluar: g.keluar, st: h7 >= g.masuk ? "prioritas" : dalam ? "bertahan" : "luar", bawah, sejak});
    }
    return out;
  }
  /* Satu baris per provinsi dari hari terakhir yang lengkap, terurut: prioritas, bertahan, luar; dalam kelompok h7 turun. */
  function hitung(data, hariIni) {
    const RANK = {prioritas: 0, bertahan: 1, luar: 2}, baris = [];
    for (const [kode, v] of Object.entries(data.prov)) {
      const j = jalan(data.hari, v, hariIni); if (!j.length) continue;
      const z = j[j.length - 1], i = data.hari.indexOf(z.tgl);
      baris.push({kode, ...z, kemarin: v[i] || 0, tujuh: data.hari.slice(i - JENDELA + 1, i + 1).map((t, k) => [t, v[i - JENDELA + 1 + k] || 0])});
    }
    return baris.sort((a, b) => RANK[a.st] - RANK[b.st] || b.h7 - a.h7);
  }
  globalThis.Prioritas = {ATURAN, garisPada, jalan, hitung};
  if (typeof document === "undefined") return;

  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const f = (x, d = 1) => x.toLocaleString("id-ID", {maximumFractionDigits: d});
  const tglP = s => new Date(s + "T00:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta"});
  const tglK = s => new Date(s + "T00:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"});
  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const ST = {prioritas: ["Prioritas", "merah"], bertahan: ["Bertahan", "oranye"], luar: ["Di luar daftar", "prov"]};
  let cache = null;

  const css = `<style>
dialog.pr .sp-eyh,dialog.pr .sp-sek h4{text-transform:none;letter-spacing:0}
dialog.pr .sp-eyh{font-size:15px}
.pr-t{width:100%;border-collapse:collapse;font-size:13.5px;font-variant-numeric:tabular-nums}
.pr-t th{background:#0b2545;color:#fff;text-transform:none;letter-spacing:0;font-weight:700;font-size:12px;padding:9px 12px;text-align:center;white-space:nowrap}
.pr-t td{padding:9px 12px;border-top:1px solid var(--line);text-align:right;white-space:nowrap}
.pr-t td:first-child,.pr-t td.pr-ka{text-align:left}.pr-t td:nth-child(2),.pr-t td.pr-sp{text-align:center}.pr-t td:nth-child(6){text-align:left}
.pr-bt{position:relative;display:inline-flex;align-items:flex-end;gap:2px;height:26px;width:70px;vertical-align:middle}
.pr-bt i{flex:1;background:#e8833a;border-radius:2px 2px 0 0;cursor:default}.pr-bt i:hover{background:#0b2545}
.pr-bt b{position:absolute;left:-2px;right:-2px;border-top:1.5px dashed #0b2545;pointer-events:none}
.pr-w{overflow:auto;border:1px solid var(--line);border-radius:16px}
.pr-sek{display:grid;gap:20px}
.pr-ul{margin:0;padding-left:18px;display:grid;gap:6px;font-size:13.5px;line-height:1.5}
.pr-d summary{cursor:pointer;font-weight:700;font-size:13.5px;padding:12px 16px}
.pr-d[open] summary{border-bottom:1px solid var(--line)}
.pr-d .pr-w{border:0;border-radius:0}
</style>`;

  const kepala = (judul, chips) => `<div class="sp-hd"><div style="flex:1;min-width:0"><span class="sp-eyh">Prioritas provinsi</span>
    <h3 id="spJudul">${judul}</h3><div class="sp-chips">${chips}</div></div><button class="sp-x" data-tutup aria-label="Tutup">×</button></div>`;
  const aksi = `<div class="sp-aksi"><span></span><button class="sp-pri" data-tutup>Tutup</button></div>`;

  const hit = r => {
    if (r.st === "prioritas") return `${f(r.h7)} ≥ ${f(r.masuk)}`;
    if (r.st === "bertahan") return r.h7 < r.keluar ? `${f(r.h7)} < ${f(r.keluar)}, hari ke-${r.bawah} dari ${HARI_KELUAR}` : `${f(r.keluar)} ≤ ${f(r.h7)} < ${f(r.masuk)}, belum di bawah garis keluar`;
    return `${f(r.h7)} < ${f(r.masuk)}`;
  };
  /* 7 batang harian, tinggi relatif ke hari terbesar baris itu; garis putus = garis masuk bila masih dalam skala */
  const batang = r => { const m = Math.max(r.masuk, ...r.tujuh.map(x => x[1])) || 1, g = 100 - r.masuk / m * 100;
    return `<span class="pr-bt">${r.tujuh.map(([t, n]) => `<i style="height:${Math.max(4, n / m * 100)}%" title="${tglK(t)}: ${f(n, 0)} hotspot"></i>`).join("")}<b style="top:${g}%"></b></span>`; };
  const tabel = (xs, nama, hariK) => `<div class="pr-w ex-tabel"><table class="pr-t"><thead><tr><th>Provinsi</th><th>Status</th><th title="Hotspot harian 7 hari yang dirata-rata; arahkan kursor ke batang untuk angkanya">7 hari</th><th title="Rata-rata hotspot harian 7 hari lengkap terakhir">H7</th><th title="Hotspot pada hari WIB terakhir yang lengkap">${tglK(hariK)}</th><th title="H7 dibandingkan garis masuk atau garis keluar">Hitungan</th><th title="Hari pertama H7 menembus garis masuk pada episode ini">Sejak</th></tr></thead><tbody>${xs.map(r =>
    `<tr><td translate="no">${esc(nama(r.kode))}</td><td><em class="sp-p ${ST[r.st][1]}">${ST[r.st][0]}</em></td><td class="pr-sp">${batang(r)}</td><td><b>${f(r.h7)}</b></td><td>${f(r.kemarin, 0)}</td><td>${hit(r)}</td><td>${r.sejak ? tglP(r.sejak) : "–"}</td></tr>`).join("")}</tbody></table></div>`;

  function isi(rows, nama) {
    const z = rows[0], hariK = z.tgl, g = garisPada(hariK), bln = +hariK.slice(5, 7);
    const dlm = rows.filter(r => r.st !== "luar"), luar = rows.filter(r => r.st === "luar" && r.h7 > 0);
    const np = rows.filter(r => r.st === "prioritas").length, nb = rows.filter(r => r.st === "bertahan").length;
    const kali = bln === 10 ? 1.5 : bln === 11 ? 2 : 0;   // kajian: ambang naik ~1,5x pada Oktober, ~2x pada November
    const musim = kali ? `akhir musim, menurut kajian ambang situasional sekitar ${f(kali)} kali garis masuk, yaitu sekitar ${f(g.masuk * kali, 0)}` : "bukan akhir musim";
    const chips = `<span class="sp-p putih">Garis masuk ${f(g.masuk, 0)}</span><span class="sp-p putih">Garis keluar ${f(g.keluar, 0)}</span><span class="sp-p putih">${f(np, 0)} Prioritas</span><span class="sp-p putih">${f(nb, 0)} Bertahan</span>`;
    return kepala(`Data terakhir ${tglP(hariK)}`, chips) + `<div class="sp-isi pr-sek">
      <section class="sp-sek"><h4>Daftar provinsi</h4>${dlm.length ? tabel(dlm, nama, hariK) : `<p>Tidak ada provinsi berstatus Prioritas atau Bertahan.</p>`}</section>
      ${luar.length ? `<details class="pr-d sp-panel"><summary>Di luar daftar (${f(luar.length, 0)} provinsi dengan hotspot)</summary>${tabel(luar, nama, hariK)}</details>` : ""}
      <section class="sp-sek"><h4>Kondisi</h4><ul class="pr-ul"><li>${BULAN[bln - 1]} ${hariK.slice(0, 4)}: ${musim}. Garis masuk tetap ${f(g.masuk, 0)}.</li>
        <li>Rasio satelit yang dipakai ${f(g.rasio)} (garis dasar VIIRS 50 masuk dan 25 keluar dikali rasio).</li>
        <li>Saat La Niña ambang situasional lebih tinggi.</li>
        <li>Aturan berlaku sementara dan ditinjau tiap Senin.</li></ul></section>
      <section class="sp-sek"><h4>Cara hitung</h4><ul class="pr-ul"><li>H7 adalah rata-rata hotspot harian 7 hari lengkap terakhir per provinsi; hari berjalan belum dihitung.</li>
        <li>Masuk daftar saat H7 mencapai garis masuk (${f(g.masuk, 0)}).</li>
        <li>Keluar bila H7 di bawah garis keluar (${f(g.keluar, 0)}) selama ${HARI_KELUAR} hari berturut-turut.</li>
        <li>Data: hotspot lokasi unik per hari WIB dari semua satelit (satuan laporan BNPB), tanpa batas jumlah provinsi.</li></ul></section></div>` + aksi;
  }

  async function buka() {
    if (document.querySelector("dialog.sp[open]")) return;
    if (!document.getElementById("prCss")) document.head.insertAdjacentHTML("beforeend", css.replace("<style>", '<style id="prCss">'));
    const d = SapaInti.dialog(kepala("Menghitung…", "") + `<div class="sp-isi"><p>Menghitung…</p></div>` + aksi, null, "pb_prioritas");
    d.classList.add("pr");
    try {
      cache ||= await muatJSON("data/harian_panjang.json");
      await new Promise(r => setTimeout(r, 0));   /* beri napas sebelum hitungan */
      const rows = hitung(cache, SapaInti.hariIni());
      if (!d.isConnected) return;
      if (!rows.length) throw 0;
      d.innerHTML = isi(rows, k => (typeof namaProv === "function" ? namaProv(k) : k));
    } catch (e) { if (d.isConnected) d.querySelector(".sp-isi").innerHTML = "<p>Data belum bisa dimuat.</p>"; }
  }
  document.getElementById("prioritasBuka")?.addEventListener("click", buka);
})();
