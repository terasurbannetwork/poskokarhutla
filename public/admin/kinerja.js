/* Kinerja pemantauan (/admin/kinerja): tiga tab. Data (kesegaran sumber, tren, Himawari), Proses (corong, waktu tahap, macet, per wilayah), Lapangan (evaluasi isian, verifikasi, alarm palsu, luas, taktik, per instansi).
   Semua angka dihitung server (src/sla.js, GET /api/sla); layar ini hanya menyajikan, tidak menghitung ulang. Kontrak: docs/bnpb/RENCANA-LANJUT.md §1.3.
   Satu fetch per filter; pindah tab tidak mengambil ulang. INP: pil filter dan kepala kolom diubah dulu (urgent), isi beratnya menyusul lewat nanti() sesudah satu frame. CSP admin: tanpa gaya/skrip inline, teks lewat esc(). */
(() => {
  const {esc} = Admin;   // public/admin/bersama.js
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul");
  const N0 = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 0}), N1 = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 1}), N1T = new Intl.NumberFormat("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
  const nanti = fn => window.nanti ? window.nanti(fn) : fn();
  const HARI = [7, 30, 90];
  const TAHAP = {deteksi: "Deteksi", tugas: "Tugas dibuat", konfirmasi: "Konfirmasi", tiba: "Regu tiba", padam: "Padam", terverifikasi: "Terverifikasi"};

  /* ---------- format: tanpa presisi palsu, menit kecil tetap menit, besar jadi jam/hari ---------- */
  const NA = "belum ada data", jam = m => m == null || !isFinite(m) ? NA : N1T.format(m / 60) + " jam";   // jam: satu satuan per kolom tabel
  const angka = v => v == null ? NA : N0.format(v);
  const pct = v => v == null ? "–" : N1.format(v) + "%";
  const dur = m => { if (m == null || !isFinite(m)) return "–"; if (m < 90) return N0.format(Math.round(m)) + " menit"; if (m < 2880) return N1.format(Math.round(m / 6) / 10) + " jam"; return N1.format(Math.round(m / 144) / 10) + " hari"; };
  const tgl = s => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "UTC"});
  const wib = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false}).replace(".", ":") + " WIB";

  /* ---------- keadaan di URL ---------- */
  const TABS = [["data", "Data"], ["proses", "Proses"], ["lapangan", "Lapangan"]];
  const baca = () => { const p = new URLSearchParams(location.search), h = +p.get("hari"), kol = (t, d) => TBL[t].kolom.some(k => k[0] === p.get(d)) ? p.get(d) : TBL[t].urut0;
    return {tab: TABS.some(t => t[0] === p.get("tab")) ? p.get("tab") : "data", hari: HARI.includes(h) ? h : 30, prov: p.get("prov") || "", kab: p.get("kab") || "",
      urut: kol("w", "urut"), arah: p.get("arah") === "naik" ? "naik" : "turun", urutr: kol("r", "urutr"), arahr: p.get("arahr") === "naik" ? "naik" : "turun"}; };
  let S, DATA = null, no = 0;
  const tulis = (dorong = true) => { const p = new URLSearchParams(); if (S.tab !== "data") p.set("tab", S.tab); if (S.hari !== 30) p.set("hari", S.hari); if (S.prov) p.set("prov", S.prov); if (S.kab) p.set("kab", S.kab);
    if (S.urut !== "n" || S.arah !== "turun") { p.set("urut", S.urut); p.set("arah", S.arah); } if (S.urutr !== "n" || S.arahr !== "turun") { p.set("urutr", S.urutr); p.set("arahr", S.arahr); }
    const u = location.pathname + (p.size ? "?" + p : ""); history[dorong ? "pushState" : "replaceState"](null, "", u); };
  const NAMA = (() => { try { return JSON.parse(sessionStorage.getItem("kinerja_prov") || "{}"); } catch (e) { return {}; } })();   // kode provinsi -> nama, supaya kepingan wilayah punya nama saat drill

  /* ---------- potongan tampilan ---------- */
  const pil = (t, ton) => `<span class="kj-pil t-${ton || "info"}">${esc(t)}</span>`;
  const ukur = (nilai, label, ton) => nilai === "–" ? `<div class="kj-ukur"><b class="kj-na">belum ada data</b><span>${esc(label)}</span></div>` : `<div class="kj-ukur${ton ? " t-" + ton : ""}"><b>${esc(nilai)}</b><span>${esc(label)}</span></div>`;
  const kosong = t => `<p class="kj-kosong">${esc(t)}</p>`;
  const seksi = (judul, isi, ket) => `<section class="kj-k"><h2>${esc(judul)}</h2>${ket ? `<p class="kj-ket">${esc(ket)}</p>` : ""}${isi}</section>`;
  const rangka = () => `<div class="kj-sk" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="kj-sk lebar" aria-hidden="true"><i></i></div><div class="kj-sk lebar" aria-hidden="true"><i></i></div>`;

  const garis = (judul, titik, kunci, fmt, nol) => {
    const W = 320, H = 110, L = 34, R = 8, T = 8, B = 20, ada = titik.filter(t => t[kunci] != null);
    if (ada.length < 2) return `<div class="kj-grafik"><h3>${esc(judul)}</h3>${kosong("Belum cukup hari berdata untuk digambar.")}</div>`;
    let lo = nol ? 0 : Math.min(...ada.map(t => t[kunci])), hi = Math.max(...ada.map(t => t[kunci])); if (lo === hi) { lo -= 1; hi += 1; }
    const x = i => L + i * (W - L - R) / (titik.length - 1), y = v => T + (hi - v) * (H - T - B) / (hi - lo);
    let d = "", pen = false; titik.forEach((t, i) => { if (t[kunci] == null) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(t[kunci]).toFixed(1)}`; pen = true; });
    const dot = titik.map((t, i) => t[kunci] == null ? "" : `<circle class="kj-dot" cx="${x(i).toFixed(1)}" cy="${y(t[kunci]).toFixed(1)}" r="2.2"><title>${esc(tgl(t.tanggal))}: ${esc(fmt(t[kunci]))}</title></circle>`).join("");
    return `<div class="kj-grafik"><h3>${esc(judul)}</h3><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(judul)}, dari ${esc(fmt(ada[0][kunci]))} sampai ${esc(fmt(ada.at(-1)[kunci]))}">
      <line class="kj-sb" x1="${L}" x2="${W - R}" y1="${T}" y2="${T}"/><line class="kj-sb" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>
      <text class="kj-tk" x="${L - 4}" y="${T + 3}" text-anchor="end">${esc(fmt(hi))}</text><text class="kj-tk" x="${L - 4}" y="${H - B + 3}" text-anchor="end">${esc(fmt(lo))}</text>
      <text class="kj-tk" x="${L}" y="${H - 5}">${esc(tgl(titik[0].tanggal))}</text><text class="kj-tk" x="${W - R}" y="${H - 5}" text-anchor="end">${esc(tgl(titik.at(-1).tanggal))}</text>
      <path class="kj-gr" d="${d}"/>${dot}</svg></div>`;
  };

  /* ---------- bagian-bagian ---------- */
  function sumberHtml(d) {
    if (!d.sumber?.length) return seksi("Kesegaran data per sumber", kosong("Belum ada data kesegaran. Riwayat terisi per jam sesudah migrasi aktif."));
    const t1 = d.kini, t0 = t1 - d.hari * 864e5;
    return seksi("Kesegaran data per sumber", `<div class="kj-sumber">${d.sumber.map(s => {
      const lolos = s.segar_pct != null && s.segar_pct >= s.slo_target_pct, gg = s.gangguan || [], tot = gg.reduce((a, g) => a + (g.menit || 0), 0);
      const strip = gg.map(g => `<rect class="kj-gg" x="${Math.max(0, (g.mulai - t0) / (t1 - t0) * 100).toFixed(2)}" y="0" width="${Math.max(.5, (g.selesai - g.mulai) / (t1 - t0) * 100).toFixed(2)}" height="8"><title>${esc(wib(g.mulai))}, ${esc(dur(g.menit))}</title></rect>`).join("");
      return `<article class="kj-s"><header><h3>${esc(s.nama)}</h3>${s.segar_pct == null ? pil("belum terukur", "tunggu") : pil(lolos ? "memenuhi target" : "di bawah target", lolos ? "ok" : "bahaya")}</header>
        <div class="kj-ukurbaris">${ukur(pct(s.segar_pct), `segar, target ${pct(s.slo_target_pct)}`, s.segar_pct == null ? "" : lolos ? "ok" : "bahaya")}${ukur(dur(s.umur_p50), "umur data tengah (p50)")}${ukur(dur(s.umur_p95), "umur data terburuk (p95)")}</div>
        <svg class="kj-strip" viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label="Gangguan ${esc(s.nama)} ${d.hari} hari terakhir"><rect class="kj-lat" x="0" y="0" width="100" height="8"/>${strip}</svg>
        <p class="kj-ket">${gg.length ? `${N0.format(gg.length)} gangguan, total ${esc(dur(tot))}, di atas batas segar ${esc(dur(s.batas_menit))}.` : `Tidak ada gangguan dalam ${d.hari} hari, batas segar ${esc(dur(s.batas_menit))}.`}</p></article>`;
    }).join("")}</div>`, `Bagian waktu dalam ${d.hari} hari terakhir saat umur data masih di bawah batas segarnya.`);
  }
  function tahapHtml(d) {
    const ada = (d.tahap || []).some(t => t.n > 0);
    if (!ada) return seksi("Waktu per tahap penanganan", kosong("Belum ada tugas yang menyelesaikan tahap mana pun dalam periode ini."));
    const baris = d.tahap.map(t => {
      const tgt = t.target_menit == null ? `<span class="kj-redup">target belum ditetapkan</span>` : t.dalam_target_pct == null ? NA : `<b class="${t.dalam_target_pct >= 80 ? "ok" : "bahaya"}">${pct(t.dalam_target_pct)}</b> <small>dari target ${esc(dur(t.target_menit))}</small>`;
      return `<tr><td data-label="Tahap"><b>${esc(TAHAP[t.dari] || t.dari)}</b> ke <b>${esc(TAHAP[t.ke] || t.ke)}</b></td><td class="n" data-label="Tugas">${N0.format(t.n)}</td><td class="n" data-label="Tengah (p50)">${esc(t.n ? jam(t.p50_menit) : NA)}</td><td class="n" data-label="90% selesai dalam (p90)">${esc(t.n ? jam(t.p90_menit) : NA)}</td><td data-label="Dalam target">${t.n ? tgt : NA}</td></tr>`;
    }).join("");
    return seksi("Waktu per tahap penanganan", `<div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr><th>Tahap</th><th>Tugas</th><th>Tengah (p50)</th><th>90% dalam (p90)</th><th>Dalam target</th></tr></thead><tbody>${baris}</tbody></table></div>`,
      "Tahap deteksi yang tanpa catatan awal dihitung dari saat tugas dibuat, ditandai perkiraan di catatan.");
  }
  const na = v => v === "–" ? "belum ada data" : v;   // instansi: null berarti belum ada data, bukan nol
  /* ---------- tabel urut (wilayah dan instansi): satu mesin, dua definisi ---------- */
  const TBL = {
    w: {id: "W", urut0: "n", kolom: [["nama", "Wilayah"], ["n", "Tugas"], ["p50", "Deteksi ke tugas, tengah"], ["p90", "Deteksi ke tugas, 90%"], ["terlambat_buka", "Terlambat dibuka"]],
      baris: () => DATA.wilayah, nilai: (w, k) => k === "nama" ? w.nama : k === "n" ? w.n : k === "terlambat_buka" ? w.terlambat_buka : w.tahap?.deteksi_tugas?.[k],
      sel: w => `<td data-label="Wilayah">${S.prov ? esc(w.nama) : `<a class="kj-drill" href="?prov=${encodeURIComponent(w.kode)}" data-prov="${esc(w.kode)}">${esc(w.nama)}</a>`}</td><td class="n" data-label="Tugas">${angka(w.n)}</td>
        <td class="n" data-label="Deteksi ke tugas, tengah">${esc(jam(w.tahap?.deteksi_tugas?.p50))}</td><td class="n" data-label="Deteksi ke tugas, 90%">${esc(jam(w.tahap?.deteksi_tugas?.p90))}</td>
        <td class="n" data-label="Terlambat dibuka">${w.terlambat_buka == null ? NA : w.terlambat_buka ? `<b class="bahaya">${N0.format(w.terlambat_buka)}</b>` : "0"}</td>`},
    r: {id: "R", urut0: "n", kolom: [["nama", "Instansi"], ["n", "Tugas"], ["tiba_p50_menit", "Regu tiba, tengah"], ["padam_p50_jam", "Padam, tengah"], ["isian_lengkap_pct", "Isian lengkap"], ["kabar_tepat_pct", "Kabar tepat"]],
      baris: () => DATA.lapangan?.regu || [], nilai: (r, k) => r[k],
      sel: r => `<td data-label="Instansi">${esc(r.nama)}</td><td class="n" data-label="Tugas">${N0.format(r.n)}</td><td class="n" data-label="Regu tiba, tengah">${esc(na(r.tiba_p50_menit == null ? "–" : N1T.format(r.tiba_p50_menit / 60) + " jam"))}</td>
        <td class="n" data-label="Padam, tengah">${r.padam_p50_jam == null ? "belum ada data" : esc(N1T.format(r.padam_p50_jam) + " jam")}</td><td class="n" data-label="Isian lengkap">${esc(na(pct(r.isian_lengkap_pct)))}</td><td class="n" data-label="Kabar tepat">${esc(na(pct(r.kabar_tepat_pct)))}</td>`},
  };
  const arahDari = t => S[t === "w" ? "arah" : "arahr"] === "naik" ? 1 : -1, urutDari = t => S[t === "w" ? "urut" : "urutr"];
  function badan(t) {
    const T = TBL[t], a = arahDari(t), k = urutDari(t);
    return [...T.baris()].sort((p, q) => { const x = T.nilai(p, k), y = T.nilai(q, k); return x == null ? 1 : y == null ? -1 : (typeof x === "string" ? x.localeCompare(y, "id") : x - y) * a || p.nama.localeCompare(q.nama, "id"); }).map(r => `<tr>${T.sel(r)}</tr>`).join("");
  }
  const kepala = t => TBL[t].kolom.map(([k, l]) => `<th aria-sort="${urutDari(t) === k ? (arahDari(t) === 1 ? "ascending" : "descending") : "none"}"><button type="button" class="kj-urut" data-t="${t}" data-urut="${k}">${esc(l)}<i aria-hidden="true">${urutDari(t) === k ? (arahDari(t) === 1 ? "▲" : "▼") : ""}</i></button></th>`).join("");
  const tabelUrut = t => `<div class="ad-tabel-wadah"><table class="ad-tabel kj-t${t}"><thead><tr id="kjKepala${TBL[t].id}">${kepala(t)}</tr></thead><tbody id="kjIsi${TBL[t].id}">${badan(t)}</tbody></table></div>`;

  /* ---------- tab Proses ---------- */
  const TAHAP_URUT = ["deteksi", "tugas", "konfirmasi", "tiba", "padam", "terverifikasi"];
  function corongHtml(d) {
    const p = d.proses || [], by = Object.fromEntries(p.map(x => [x.tahap, x.n])), dasar = by.deteksi;
    if (!p.length || !TAHAP_URUT.some(k => by[k] > 0)) return seksi("Corong penanganan", kosong("Belum ada tugas pada periode ini."));
    const baris = TAHAP_URUT.map(k => { const n = by[k]; if (n == null) return ""; const w = dasar ? Math.min(100, n / dasar * 100) : 0;
      return `<li><span class="kj-cn">${esc(TAHAP[k])}</span><svg class="kj-cb" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect class="kj-lat" x="0" y="0" width="100" height="8"/><rect class="kj-isi" x="0" y="0" width="${w.toFixed(1)}" height="8"/></svg><b>${N0.format(n)}</b><small>${dasar ? esc(pct(n / dasar * 100)) + " dari deteksi" : ""}</small></li>`; }).join("");
    const ml = by.muncul_lagi;
    return seksi("Corong penanganan", `<ol class="kj-corong">${baris}</ol>${ml == null ? "" : `<p class="kj-lagi">${pil("muncul lagi", ml ? "bahaya" : "ok")} <b>${N0.format(ml)}</b> tugas yang apinya menyala lagi sesudah dinyatakan padam${by.padam ? `, dari ${N0.format(by.padam)} yang padam` : ""}.</p>`}`,
      "Tiap batang dibandingkan dengan jumlah deteksi pada periode yang sama.");
  }
  function macetHtml(d) {
    const m = d.macet; if (!m) return seksi("Macet", kosong("Belum ada data."));
    const sebagian = m.some(x => x.n_menunggu == null), tot = m.reduce((a, x) => a + (x.n_menunggu || 0), 0), lewat = m.reduce((a, x) => a + (x.n_lewat_target || 0), 0);
    return seksi("Tugas yang macet", m.length ? `<div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr><th>Menunggu tahap</th><th>Menunggu</th><th>Lewat target</th><th>Daftar</th></tr></thead><tbody>${m.map(x => `<tr><td data-label="Menunggu tahap"><b>${esc(TAHAP[x.tahap] || x.tahap)}</b></td><td class="n" data-label="Menunggu">${x.n_menunggu == null ? "belum ada data" : N0.format(x.n_menunggu)}</td>
      <td class="n" data-label="Lewat target">${x.n_lewat_target == null ? "belum ada data" : x.n_lewat_target ? `<b class="bahaya">${N0.format(x.n_lewat_target)}</b>` : "0"}</td><td class="n" data-label="Daftar">${x.n_menunggu ? `<a class="kj-drill" href="/admin/instansi#pantau">Buka tugasnya</a>` : "–"}</td></tr>`).join("")}</tbody></table></div>` : kosong("Tidak ada tugas yang menunggu."),
      m.length ? (sebagian ? "Sebagian tahap belum ada data, jadi jumlah total belum bisa dihitung." : `${N0.format(tot)} tugas menunggu, ${N0.format(lewat)} di antaranya lewat target. Target yang belum ditetapkan tidak dihitung lewat.`) : "");
  }
  const wilayahHtml = d => seksi(S.prov ? `Per kabupaten, ${NAMA[S.prov] || "provinsi " + S.prov}` : "Per provinsi", d.wilayah?.length ? tabelUrut("w") : kosong("Belum ada tugas di wilayah ini pada periode ini."),
    "Terlambat dibuka: tugas yang dibuat melewati batas waktu sejak titik terdeteksi." + (S.prov ? "" : " Klik nama provinsi untuk melihat kabupatennya."));

  /* ---------- tab Lapangan: tiap rasio membawa n-nya; null = "belum ada data", bukan 0 ---------- */
  const nTugas = d => (d.proses || []).find(x => x.tahap === "tugas")?.n;
  function lapanganHtml(d) {
    const L = d.lapangan; if (!L) return seksi("Evaluasi lapangan", kosong("Belum ada data lapangan."));
    const N = L.n || {}, dari = (n, satuan) => n ? `dari ${N0.format(n)} ${satuan}` : "";   // tiap rasio memakai penyebutnya sendiri (lapangan.n)
    const R = (nilai, label, ton, ket) => nilai == null ? `<div class="kj-ukur"><b class="kj-na">belum ada data</b><span>${esc(label)}</span></div>` : `<div class="kj-ukur${ton ? " t-" + ton : ""}"><b>${esc(pct(nilai))}</b><span>${esc(label)}</span><small>${esc(ket)}</small></div>`;
    /* tanpa warna baik/buruk: kontrak belum punya target untuk rasio lapangan, jadi angkanya netral */
    const gps = L.gps_curiga_n, tugas = dari(N.konfirmasi, "tugas terkonfirmasi"), foto = dari(N.foto, "foto"), padam = dari(N.padam, "tugas padam");
    const kartu = `<div class="kj-ukurbaris">${R(L.isian_lengkap_pct, "isian lengkap", "", tugas)}${R(L.foto_gps_sah_pct, "foto GPS sah", "", foto)}
      ${gps == null ? `<div class="kj-ukur"><b class="kj-na">belum ada data</b><span>foto GPS curiga</span></div>` : `<div class="kj-ukur"><b>${N0.format(gps)}</b><span>foto GPS curiga</span><small>${esc(foto)}</small></div>`}
      ${R(L.kabar_tepat_pct, "kabar tepat (tiap 24 jam)", "", dari(N.kabar, "tugas berjalan"))}${R(L.padam_terverifikasi_pct, "padam terverifikasi", "", padam)}
      ${R(L.muncul_lagi_pct, "muncul lagi sesudah padam", "", padam)}${R(L.bukan_api_pct, "bukan api (alarm palsu satelit)", "", dari(N.konfirmasi, "tugas terkonfirmasi"))}</div>`;
    const rasio =v => v == null ? "belum ada data" : N1T.format(v) + " kali";
    const luas = L.luas, tak = L.taktik;
    const blok = (judul, o, a, b, ketA, ketB) => `<div class="kj-s"><h3>${esc(judul)}</h3>${!o || !o.n ? kosong("Belum ada tugas yang punya kedua angka.") : `<div class="kj-ukurbaris"><div class="kj-ukur"><b>${esc(rasio(o[a]))}</b><span>${esc(ketA)}</span><small>dari ${N0.format(o.n)} tugas</small></div>${b ? `<div class="kj-ukur"><b>${esc(rasio(o[b]))}</b><span>${esc(ketB)}</span><small>dari ${N0.format(o.n_garis ?? o.n)} tugas</small></div>` : ""}</div>`}</div>`;
    return seksi("Evaluasi isian dan verifikasi", kartu, "Isian lengkap: konfirmasi, penanggung jawab, foto ber-GPS, dan status api. Kabar tepat: selang kabar tidak lebih dari 24 jam selama api belum padam. Bukan api: hasil isian regu, ukuran alarm palsu satelit.")
      + seksi("Luas dan taktik regu", `<div class="kj-sumber">${blok("Luas lapangan dibanding satelit", luas, "rasio_lapangan_satelit_p50", "rasio_garis_satelit_p50", "luas lapangan per luas satelit (tengah)", "luas garis api per luas satelit (tengah)")}${blok("Regu nyata dibanding saran", tak, "regu_nyata_per_saran_p50", "personel_nyata_per_saran_p50", "regu nyata per saran (tengah)", "personel nyata per saran (tengah)")}</div>`,
        "Rasio satu berarti sama dengan satelit atau saran; hanya tugas yang punya kedua angka yang dihitung.")
      + seksi("Per instansi", L.regu?.length ? tabelUrut("r") : kosong("Belum ada instansi yang menangani tugas pada periode ini."), "Hanya nama instansi, tidak pernah nama orang.");
  }

  /* ---------- tab Data ---------- */
  const dataHtml = d => sumberHtml(d) + trenHtml(d) + himawariHtml(d) + catatanHtml(d);
  const prosesHtml = d => corongHtml(d) + tahapHtml(d) + macetHtml(d) + wilayahHtml(d);
  const ISI = {data: dataHtml, proses: prosesHtml, lapangan: lapanganHtml};
  const trenHtml = d => seksi("Tren harian", d.tren?.length ? `<div class="kj-grafiks">${garis("Kesegaran data (%)", d.tren, "segar_pct", pct)}${garis("Deteksi ke tugas, tengah", d.tren, "deteksi_tugas_p50", dur, true)}</div>` : kosong("Belum ada riwayat harian."));
  function himawariHtml(d) {
    const h = d.himawari; if (!h) return seksi("Himawari", kosong("Belum ada data Himawari."));
    const semua0 = h.alarm === 0 && h.terkunci === 0 && h.hilang === 0, n = v => v == null ? "–" : N0.format(v);
    return seksi("Himawari", `<div class="kj-ukurbaris">${ukur(n(h.alarm), "alarm dini")}${ukur(n(h.terkunci), "terkunci jadi tugas", h.terkunci ? "ok" : "")}${ukur(n(h.hilang), "hilang sebelum terkunci")}${ukur(dur(h.selisih_viirs_p50_menit), "selisih ke VIIRS (tengah)")}</div>`
      + (semua0 ? kosong("Belum ada alarm Himawari pada periode ini.") : ""), "Terkunci: alarm yang terkonfirmasi satelit lain atau pindai berikutnya sehingga jadi tugas. Hilang: alarm yang padam sebelum terkunci.");
  }
  const catatanHtml = d => d.catatan?.length ? seksi("Catatan metode", `<ul class="kj-catat">${d.catatan.map(c => `<li>${esc(c)}</li>`).join("")}</ul>`) : "";

  /* ---------- kerangka: kontrol urgent, isi deferred ---------- */
  const tabHtml = () => `<nav class="ad-tabs kj-tab" aria-label="Kinerja pemantauan">${TABS.map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${S.tab === k}">${l}</button>`).join("")}</nav>`;
  function kontrol() {
    return `${tabHtml()}<div class="kj-bar"><div class="kj-seg" role="group" aria-label="Periode">${HARI.map(h => `<button type="button" data-hari="${h}" aria-pressed="${S.hari === h}">${h} hari</button>`).join("")}</div>
      ${S.prov ? `<span class="kj-chip" id="kjChip">${esc(NAMA[S.prov] || "Provinsi " + S.prov)}<button type="button" data-semua aria-label="Tampilkan semua provinsi">Semua provinsi</button></span>` : `<span class="kj-chip muda">Semua provinsi</span>`}
      <span class="kj-redup" id="kjWaktu"></span><span class="kj-pesan" id="kjPesan" role="status"></span></div><div id="kjIsi"></div>`;
  }
  const pasang = html => { document.getElementById("kjIsi").innerHTML = html; };
  const galat = (status, pesan) => `<div class="kj-galat" role="alert"><b>${status === 503 ? "Belum aktif" : "Gagal memuat"}</b><p>${esc(pesan)}</p>${status === 503 ? "" : `<button type="button" class="ad-tombol" data-ulang>Coba lagi</button>`}</div>`;
  const kosongSemua = j => !j.sumber?.length && !(j.tahap || []).some(t => t.n) && !j.wilayah?.length && !j.himawari?.alarm && !(j.proses || []).some(x => x.n) && !j.lapangan?.regu?.length;
  function gambar() {
    if (!DATA) return;
    if (kosongSemua(DATA)) return pasang(`<div class="kj-kosong-besar"><b>Belum ada data</b><p>Belum ada riwayat kesegaran, tugas api, maupun alarm Himawari pada periode ini. Layar terisi begitu data pertama masuk.</p></div>`);
    pasang(ISI[S.tab](DATA));
  }
  async function muat() {
    const n = ++no; DATA = null; pasang(rangka());
    const q = new URLSearchParams({hari: S.hari}); if (S.prov) q.set("prov", S.prov); if (S.kab) q.set("kab", S.kab);
    if (!Admin.staf) q.set("dummy", "1");   // server hanya menghormatinya untuk Super Admin; pembaca lain selalu tanpa dummy
    let r, j;
    try { r = await fetch("/api/sla?" + q); } catch (e) { if (n === no) pasang(galat(0, "Jaringan terputus atau server tidak menjawab.")); return; }
    if (n !== no) return;   // jawaban basi: filter sudah berganti
    if (r.status === 403) { location.href = Admin.staf ? "/admin/pantau" : "/admin/masuk?ke=" + encodeURIComponent(location.pathname); return; }
    j = await r.json().catch(() => ({}));
    if (r.status === 503) return pasang(galat(503, "Kinerja pemantauan belum aktif: migrasi 0042 dan 0043 belum diterapkan di D1. Layar ini terisi sendiri setelah migrasinya jalan."));
    if (!r.ok) return pasang(galat(r.status, `Server menjawab galat ${r.status}.`));
    DATA = j; if (j.prov_nama && S.prov) NAMA[S.prov] = j.prov_nama;
    if (!S.prov && j.wilayah?.length) { j.wilayah.forEach(w => { NAMA[w.kode] = w.nama; }); try { sessionStorage.setItem("kinerja_prov", JSON.stringify(NAMA)); } catch (e) {} }
    const chip = document.getElementById("kjChip"); if (chip && NAMA[S.prov]) chip.firstChild.textContent = NAMA[S.prov];
    document.getElementById("kjWaktu").textContent = "Dihitung " + wib(j.kini) + (j.dummy ? ", termasuk data dummy" : "");
    gambar();
  }
  const ulangKerangka = () => { app.innerHTML = kontrol(); nanti(muat); };

  /* ---------- interaksi ---------- */
  app.addEventListener("click", e => {
    const h = e.target.closest("[data-hari]"), sm = e.target.closest("[data-semua]"), dr = e.target.closest("[data-prov]"), u = e.target.closest("[data-urut]"), ul = e.target.closest("[data-ulang]"), tb = e.target.closest("[data-tab]");
    if (tb) { S.tab = tb.dataset.tab; tulis(); document.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-pressed", String(b === tb))); nanti(gambar); }
    else if (h) { S.hari = +h.dataset.hari; document.querySelectorAll("[data-hari]").forEach(b => b.setAttribute("aria-pressed", String(b === h))); tulis(); nanti(muat); }
    else if (sm) { S.prov = ""; S.kab = ""; tulis(); ulangKerangka(); }
    else if (dr) { e.preventDefault(); S.prov = dr.dataset.prov; S.kab = ""; tulis(); ulangKerangka(); }
    else if (u) {
      const t = u.dataset.t, k = u.dataset.urut, sk = t === "w" ? ["urut", "arah"] : ["urutr", "arahr"];
      S[sk[1]] = S[sk[0]] === k ? (S[sk[1]] === "turun" ? "naik" : "turun") : (k === "nama" ? "naik" : "turun"); S[sk[0]] = k; tulis(false);
      document.getElementById("kjKepala" + TBL[t].id).innerHTML = kepala(t);   // panah dan aria-sort langsung, barisnya menyusul
      nanti(() => { const b = document.getElementById("kjIsi" + TBL[t].id); if (b && DATA) b.innerHTML = badan(t); });
    } else if (ul) nanti(muat);
  });
  window.addEventListener("popstate", () => { S = baca(); ulangKerangka(); });

  /* dummy (DUMMY.md): dua ikon, Super Admin saja; isi dummy dihitung server dari satu sumber mentah (kesegaran, tugas, alarm) supaya semua widget konsisten */
  Admin.pasangDummy(aksiJudul, !Admin.staf);
  aksiJudul.addEventListener("click", async e => {
    const b = e.target.closest("[data-dummy]"); if (!b) return;
    const aksi = b.dataset.dummy, ps = document.getElementById("kjPesan");
    if (aksi === "hapus" && !confirm("Hapus semua data dummy kinerja (riwayat kesegaran, tugas dan alarm dummy)? Data asli tidak tersentuh.")) return;
    aksiJudul.querySelectorAll("button").forEach(x => { x.disabled = true; });
    ps.textContent = aksi === "isi" ? "Mengisi dummy…" : "Menghapus dummy…"; ps.className = "kj-pesan";
    try {
      const r = await Admin.kirim("/api/sla/dummy", {aksi});
      if (!r.ok && !(aksi === "isi" && r.status === 409)) { ps.textContent = r.status === 404 ? "Dummy kinerja belum tersedia di server." : r.status === 503 ? "Belum aktif: migrasi 0042 dan 0043 belum diterapkan." : "Gagal: " + (r.j.galat || r.status); ps.className = "kj-pesan galat"; }
      else { ps.textContent = ""; await muat(); }
    } catch (er) { ps.textContent = "Gagal: " + er.message; ps.className = "kj-pesan galat"; }
    aksiJudul.querySelectorAll("button").forEach(x => { x.disabled = false; });
  });

  app.className = "ad-isi kj";
  S = baca();
  app.innerHTML = kontrol();
  nanti(muat);
})();
