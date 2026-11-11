"use strict";
/* Rapor sumber prakiraan (/bnpb/rapor-sumber). Data statis /data/bnpb/rapor_sumber.json (scripts/bnpb/silang/rapor_sumber.py).
   Layar hanya menampilkan angka pipeline; tidak menghitung ulang. Butuh /inti/format.js (esc, $). Kartu .ex-std.
   Sel dengan hari dinilai kurang dari 30 tampil "data belum cukup" tanpa angka; a + c kurang dari 30 tampil a, b, c, d, n tanpa persen.
   Tanpa gaya/skrip inline (CSP): semua teks data lewat esc(). INP: pemilih kejadian hanya mengganti isi satu tabel. */
(() => {
  const IKON = {data: "M4 6h16M4 12h16M4 18h10", hujan: "M7 14a4 4 0 1 1 1-7.9A5 5 0 0 1 18 8a3.5 3.5 0 0 1 0 7|M8 18l-1 3|M12 18l-1 3|M16 18l-1 3", angin: "M3 8h11a3 3 0 1 0-3-3|M3 12h16a3 3 0 1 1-3 3|M3 16h8",
    buku: "M6 3h12v18H6z|M9 8h6|M9 12h6|M9 16h3", info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M12 8v.5|M12 11v5", bahaya: "M12 3l9 16H3z|M12 10v4|M12 17v.5"};
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IKON[k].split("|").map(d => `<path d="${d}"/>`).join("")}</svg>`;
  const n = (v, d = 0) => v == null ? "–" : Number(v).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
  const pct = v => v == null ? "–" : n(v * 100, 1) + "%";
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tglIndo = iso => { const m = /(\d{4})-(\d\d)-(\d\d)/.exec(String(iso)); return m ? `${+m[3]} ${BLN[+m[2] - 1]} ${m[1]}` : "–"; };
  const hl = t => `<span class="hl">${esc(t)}</span>`;
  const pil = (t, k, kls = "") => `<span class="bn-pil ${kls}">${svg(k)}${esc(t)}</span>`;
  const BAHAYA = {hujan: "Hujan lebat", angin: "Angin kencang"};
  const KEJ = [["DIBI", "DIBI"], ["Logbook", "Logbook Pusdalops"]];
  const kartu = (id, ik, ey, judul, ...isi) => `<section class="ex ex-std" id="${id}"><header class="ex-hd"><span class="ex-ey">${svg(ik)}${esc(ey)}</span><div class="ex-jd"><h3 id="${id}-j">${judul}</h3></div></header><div class="ex-bd">${isi.join("")}</div></section>`;
  /* kepala kolom: teks, atau [teks, definisi] (jadi title); sel: teks (di-escape) atau {h: html yang sudah di-escape} */
  const tabel = (kepala, baris) => `<div class="ad-tabel-wadah ex-tabel rs-tabel"><table class="ad-tabel"><thead><tr>${kepala.map(k => Array.isArray(k) ? `<th title="${esc(k[1])}">${esc(k[0])}</th>` : `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${baris.map(b =>
    `<tr>${b.map((c, i) => `<td${i > 2 ? ' class="n"' : ""}>${c && c.h != null ? c.h : esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const segmen = (aksi, daftar, aktif) => `<div class="rs-seg" role="group" data-aksi="${aksi}">${daftar.map(([k, t]) => `<button type="button" data-k="${esc(k)}" aria-pressed="${k === aktif}">${svg("buku")}${esc(t)}</button>`).join("")}</div>`;
  const KEPALA = ["Sumber", "Lembaga", ["Tenggang (hari)", "Selisih hari antara prakiraan dibekukan dan hari target"], ["Hari dinilai", "Hari target yang sudah beku dan sudah bisa dinilai; paling sedikit 30 untuk tampil angka"], "Status",
    ["a", "Menyala dan terjadi"], ["b", "Menyala dan tidak terjadi"], ["c", "Tidak menyala tetapi terjadi"], ["d", "Tidak menyala dan tidak terjadi"], ["n kejadian", "a ditambah c; di bawah 30 tanpa persen"],
    ["POD", "Peluang terdeteksi: a / (a + c), dengan selang Wilson 95%"], ["FAR", "Rasio alarm palsu: b / (a + b), dengan selang Wilson 95%"], ["CSI", "a / (a + b + c)"], ["ETS", "CSI yang dikoreksi hit kebetulan"],
    ["CSI persistensi", "Pembanding: kejadian pada hari beku dianggap berlaku di hari target"]];
  const STATUS = {belum_cukup: ["data belum cukup", "bahaya", "rs-pil-hip"], n_kurang: ["n kurang dari 30, tanpa persen", "info", "rs-pil-info"], angka: ["angka", "data", "rs-pil-info"]};
  const ci = (v, c) => v == null ? "–" : c ? `${pct(v)} (${pct(c[0])} sampai ${pct(c[1])})` : pct(v);
  const baris = x => {
    const p = x.pembanding && x.pembanding.persistensi, st = STATUS[x.status];
    /* di bawah 30 kejadian efektif atau a + c < 30: hanya a b c d n, apa pun kata status JSON */
    const tanpaPersen = x.status !== "angka" || (x.n_efektif ?? 0) < 30 || (x.n_kejadian ?? 0) < 30;
    const sk = (v, c) => tanpaPersen ? "–" : ci(v, c), s2 = v => tanpaPersen || v == null ? "–" : n(v, 2);
    return [x.sumber, x.lembaga, n(x.tenggang), n(x.hari_dinilai), {h: pil(st[0], st[1], st[2])}, n(x.a), n(x.b), n(x.c), n(x.d), n(x.n_kejadian), sk(x.pod, x.pod_ci), sk(x.far, x.far_ci), s2(x.csi), s2(x.ets), tanpaPersen ? "–" : s2(p && p.csi)];
  };
  const nasional = (R, b, k) => R.sel.filter(x => x.daerah.tingkat === "nas" && x.bahaya === b && x.kejadian === k).sort((p, q) => p.sumber.localeCompare(q.sumber) || p.tenggang - q.tenggang);
  function isiTabel(R, b, k) {
    const r = nasional(R, b, k);
    return r.length ? tabel(KEPALA, r.map(baris)) : `<p class="rs-kosong">Belum ada prakiraan beku untuk bahaya ini.</p>`;
  }
  function kartuBahaya(R, b) {
    const semua = R.sel.filter(x => x.daerah.tingkat === "nas" && x.bahaya === b), belum = semua.filter(x => x.status === "belum_cukup").length, maks = Math.max(0, ...semua.map(x => x.hari_dinilai));
    const judul = `${BAHAYA[b]}: ${hl(n(belum))} dari ${hl(n(semua.length))} penilaian nasional masih data belum cukup, paling banyak ${hl(n(maks))} hari bisa dinilai dari ${esc(n(R.hari_min))} yang disyaratkan`;
    return kartu("k-" + b, b, "Rapor " + BAHAYA[b].toLowerCase(), judul,
      `<div class="rs-pilpil">${pil("Pemetaan kejadian masih awal", "bahaya", "rs-pil-hip")}${pil("Perbandingan sumber, bukan vonis", "info", "rs-pil-info")}</div>`,
      segmen("kej-" + b, KEJ, "DIBI"), `<div id="tb-${b}">${isiTabel(R, b, "DIBI")}</div>`);
  }
  function kartuRingkas(R) {
    const sk = Object.entries(R.hari_arsip).map(([s, h]) => `${s} ${n(h)} hari target`).join(", "), tg = R.dinilai_sampai_per_kejadian || {};
    const judul = `Skor sumber baru tampil angka setelah ${hl(n(R.hari_min))} hari dinilai dan ${hl(n(R.n_min))} kejadian; sampai ${hl(tglIndo(R.dinilai_sampai))} baru ${hl(n(Math.max(0, ...R.sel.map(x => x.hari_dinilai))))} hari yang bisa dinilai`;
    return kartu("k-ringkas", "data", "Ringkasan rapor", judul,
      `<div class="rs-pilpil">${pil("Dibuat " + tglIndo(R.dibuat), "info", "rs-pil-info")}${pil("Prakiraan beku sebelum hari target", "buku", "rs-pil-info")}</div>`,
      `<p class="rs-p">Arsip prakiraan yang dibaca: ${esc(sk)}. Kejadian DIBI dinilai sampai ${esc(tglIndo(tg.DIBI))} dan Logbook Pusdalops sampai ${esc(tglIndo(tg.Logbook))}, karena DIBI melapor telat dan hanya memuat yang dilaporkan: alarm palsu (b) tampak terlalu besar dan meleset (c) terlalu kecil. Prakiraan yang dibekukan pada hari target itu sendiri dibuang (${esc(n(R.dibuang))} baris).</p>`,
      `<ul class="rs-daftar">${R.catatan.map(c => `<li>${esc(c)}</li>`).join("")}</ul>`);
  }
  function kartuLewat(R) {
    return kartu("k-lewat", "info", "Sumber tak dinilai", `${hl(n(R.dilewati.length))} sumber belum dinilai, masing-masing dengan alasannya`,
      tabel(["Sumber", "Alasan"], R.dilewati.map(x => [x.sumber, x.alasan])));
  }
  async function mulai() {
    /* rapor digabung ke layar Silang sumber (sistem desain dashboard I3, pemilik 11 Nov 2026): /bnpb/rapor-sumber pindah ke /bnpb/silang */
    if (!$("#isi-rapor")) { location.replace("/bnpb/silang#k-ringkas"); return; }
    const isi = $("#isi-rapor"), pesan = $("#pesan-rapor");
    try {
      const R = await fetch("/data/bnpb/rapor_sumber.json").then(r => { if (!r.ok) throw new Error("rapor_sumber " + r.status); return r.json(); });
      isi.innerHTML = kartuRingkas(R) + Object.keys(BAHAYA).map(b => kartuBahaya(R, b)).join("") + kartuLewat(R);
      isi.hidden = false; pesan.hidden = true;
      window.DasborA?.kaki([["#2e8b57", "Rapor dibuat", tglIndo(R.dibuat).replace(/ \d{4}$/, "")], ["#2f6fd6", "Dinilai sampai", tglIndo(R.dinilai_sampai).replace(/ \d{4}$/, "")]]);
      for (const b of Object.keys(BAHAYA)) isi.querySelector(`[data-aksi="kej-${b}"]`).addEventListener("click", e => {
        const t = e.target.closest("button[data-k]"); if (!t || t.getAttribute("aria-pressed") === "true") return;
        e.currentTarget.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === t)));
        $("#tb-" + b).innerHTML = isiTabel(R, b, t.dataset.k);
      });
    } catch (e) { pesan.className = "bn-pesan galat"; pesan.textContent = "Rapor sumber belum tersedia: " + e.message; }
  }
  mulai();
})();
