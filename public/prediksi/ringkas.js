"use strict";
/* /prediksi/ringkas (KEPUTUSAN-BESOK K18): satu halaman untuk staf Pusdalops dan BPBD, tanpa tab. Membaca data/prediksi.json yang
   sama dengan /prediksi dan fungsi murni besok_inti.js (window.Besok); tidak menghitung prakiraan sendiri.
   Bencana yang vonisnya bukan "mengalahkan baseline" (K17) tampil pucat berlabel "uji coba". Tidak pernah menulis "aman". */
(() => {
  const B = window.Besok;
  const S = {d: null, KOL: {}, hari: 1, pil: "ALL", n: 50, baris: [], jadwal: false};
  const NAMA = {HJN: "Hujan", BNJ: "Banjir", LSR: "Longsor", API: "Titik panas", ASP: "Asap", GEL: "Gelombang", ROB: "Rob", CEX: "Angin"};
  const LEVEL = ["Normal", "Waspada", "Siaga", "Awas"];
  const LEVEL_GEL = ["Rendah", "Sedang", "Tinggi", "Awas"];   // K12
  const ISPU = ["baik atau sedang", "tidak sehat", "sangat tidak sehat", "berbahaya"];
  const VONIS_KOL = {HJN: "p20", API: "p", BNJ: "ps", LSR: "ps"};   // sama dengan prediksi.js
  const PIL_URUT = ["HJN", "BNJ", "LSR", "API", "ASP", "LAUT", "CEX"];
  const WIB_ = {timeZone: "Asia/Jakarta"};

  const ribu = v => rb(v).replace(/ rb$/, " ribu").replace(/ jt$/, " juta");
  /* tanpa pembulatan ke 5%: p 0,48 harus terbaca di bawah ambang Siaga 50%, bukan "sekitar 50%" */
  const persen = p => p == null ? "–" : p < 0.01 ? "kurang dari 1%" : p > 0.99 ? "lebih dari 99%" : `${Math.floor(p * 100)}%`;
  const tgl = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {...WIB_, weekday: "long", day: "numeric", month: "long"});
  const tglPendek = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {...WIB_, day: "numeric", month: "short"});
  const kol = (kode, r, c) => r && S.KOL[kode] ? r[S.KOL[kode].indexOf(c)] : null;
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d.split("|").map(x => `<path d="${x}"/>`).join("")}</svg>`;
  const IKON = {
    HJN: "M7 16a4 4 0 0 1-.5-7.9A5.5 5.5 0 0 1 17 7a4.5 4.5 0 0 1 .5 9|M8 19l1-2|M12 19l1-2|M16 19l1-2",
    BNJ: "M3 15c2 0 2-1.5 4.5-1.5S10 15 12 15s2.5-1.5 4.5-1.5S19 15 21 15|M3 19c2 0 2-1.5 4.5-1.5S10 19 12 19s2.5-1.5 4.5-1.5S19 19 21 19|M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z",
    LSR: "M3 20h18|M5 20l5-9 3 5 2-3 4 7|M9 7l2-3 2 3", API: "M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
    ASP: "M6 17a4 4 0 0 1-.5-7.9A5.5 5.5 0 0 1 16 8a4.5 4.5 0 0 1 2 8.5|M5 20h10|M9 17h10",
    LAUT: "M3 12c2 0 2-2 4.5-2S10 12 12 12s2.5-2 4.5-2S19 12 21 12|M3 17c2 0 2-2 4.5-2S10 17 12 17s2.5-2 4.5-2S19 17 21 17|M3 7c2 0 2-2 4.5-2S10 7 12 7s2.5-2 4.5-2S19 7 21 7",
    CEX: "M3 8h11a3 3 0 1 0-3-3|M3 12h16a3 3 0 1 1-3 3|M3 16h8"
  };
  IKON.GEL = IKON.ROB = IKON.LAUT;
  const PIL_NAMA = {...B.PIL_NAMA, LAUT: "Gelombang dan rob", ASP: "Asap"};

  /* teruji hanya bila vonis grup kolom itu "mengalahkan baseline" (K17); selain itu, termasuk kode tanpa pengamatan, "uji coba" */
  const teruji = (kode, n) => { const v = VONIS_KOL[kode] && S.d.kode[kode]?.vonis?.[`${VONIS_KOL[kode]}|${n}`]; return !!v && v[0] === "mengalahkan baseline"; };
  const pilTeruji = (pil, n) => B.PIL[pil].some(k => S.d.kode[k] && teruji(k, n));

  /* nama tingkat dan kalimat bahasa biasa per bencana; r = baris hari n */
  function tingkat(kode, lv, r) {
    if (!lv) return kode === "ROB" ? "pasang biasa" : "di bawah Waspada";   // tingkat 0 bukan vonis "tidak ada bahaya"
    if (kode === "GEL") return `gelombang ${LEVEL_GEL[lv].toLowerCase()}`;
    if (kode === "ROB") return kol("ROB", r, "lewat") ? "pasang tinggi" : "pasang biasa";
    return LEVEL[lv];
  }
  function kalimat(kode, r) {
    const c = x => kol(kode, r, x);
    switch (kode) {
      case "HJN": { const tot = c("tot"), mulai = c("mulai"), lama = c("lama");
        return tot == null ? "" : tot < 1 ? "Hampir tidak ada hujan." : `Hujan sekitar ${fmt(Math.round(tot))} mm sehari` + (mulai == null ? "." : `, mulai sekitar pukul ${String(mulai).padStart(2, "0")}.00 WIB selama sekitar ${fmt(lama)} jam.`); }
      case "API": return `Peluang ada titik panas ${persen(c("p"))}.`;
      /* tingkat dari aturan hujan dan kerawanan wilayah; peluang "ps" dari model lain sengaja tidak ditulis di sini (bisa tampak
         bertentangan dengan tingkatnya, mis. "Siaga, peluang Siaga kurang dari 5%"); angkanya tetap ada di /prediksi */
      case "BNJ": case "LSR": return c("lv") ? `Tingkat ${LEVEL[c("lv")]} menurut aturan hujan dan kerawanan wilayah.` : "Belum ada tanda menurut aturan hujan dan kerawanan wilayah.";
      case "ASP": return c("pm") == null ? "" : `Udara diperkirakan ${ISPU[c("kat")] ?? "–"} (PM2,5 sekitar ${fmt(Math.round(c("pm")))} µg/m³).`;
      case "GEL": return c("hs") == null ? "" : `Gelombang tertinggi sekitar ${fmt(c("hs"))} m.`;
      case "ROB": return c("lewat") ? "Muka laut diperkirakan melewati batas pasang tinggi setempat." : "Muka laut di bawah batas pasang tinggi setempat.";
      case "CEX": return c("emb") == null ? "" : `Embusan angin terkuat sekitar ${fmt(Math.round(c("emb")))} km/jam.`;
    }
    return "";
  }

  const daftarKab = () => {
    const q = $("#cari").value.trim().toLowerCase(), p = $("#prov").value;
    return S.d.kab.filter(k => (!p || k.prov === p) && (!q || k.nama.toLowerCase().includes(q)));
  };

  /* ---- kepala: jam data dan tema ---- */
  function jamData_(d) {
    const t = new Date(d); if (isNaN(t)) return "";
    const hari = t.toLocaleDateString("id-ID", {...WIB_, weekday: "short"}), tg = t.toLocaleDateString("id-ID", {...WIB_, day: "numeric", month: "short"}), jm = t.toLocaleTimeString("id-ID", {...WIB_, hour: "2-digit", minute: "2-digit"});
    return `<span class="pr-upd-l">Data</span><b>${esc(hari)}, ${esc(tg)}</b><span class="pr-upd-j">${esc(jm)} WIB</span>`;
  }
  $("#tema").addEventListener("click", () => {
    const a = document.documentElement, gelap = a.dataset.theme ? a.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches, t = gelap ? "light" : "dark";
    a.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {}
  });

  /* ---- ringkasan per bencana (tombol saring) ---- */
  /* ada data = sedikitnya satu sel kab bernilai untuk pil itu; tanpa data tampil "–", tidak pernah 0 */
  const adaData = (dk, n, pil) => B.PIL[pil].some(c => S.d.kode[c] && dk.some(k => B.levelKode(k, S.KOL, n, c) != null));
  function gambarRing(dk, n) {
    const sebagianUji = PIL_URUT.some(p => !pilTeruji(p, n) && adaData(dk, n, p) && B.angkaPil(dk, S.KOL, n, p) > 0);
    $("#ring").innerHTML = ["ALL", ...PIL_URUT].map(p => {
      const ada = adaData(dk, n, p), uji = ada && (p === "ALL" ? sebagianUji : !pilTeruji(p, n));
      const tanda = !ada ? '<i class="rk-tanda rk-tanda-uji">belum ada data</i>' : uji ? `<i class="rk-tanda rk-tanda-uji">${p === "ALL" ? "termasuk uji coba" : "uji coba"}</i>` : "";
      const judul = !ada ? "Belum ada data untuk hari ini" : p === "ALL" ? (uji ? "Semua bencana, termasuk yang masih uji coba" : "Semua bencana") : uji ? "Uji coba: prakiraan belum terbukti tepat" : "Prakiraan sudah teruji";
      return `<button type="button" data-pil="${p}" aria-pressed="${p === S.pil}" class="${uji || !ada ? "rk-uji" : ""}" title="${judul}">
        ${svg(p === "ALL" ? "M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z" : IKON[p])}<span>${esc(PIL_NAMA[p])}</span><b>${ada ? fmt(B.angkaPil(dk, S.KOL, n, p)) : "–"}</b>${tanda}</button>`;
    }).join("");
  }

  /* ---- Perlu tindakan ---- */
  function gambarWaspada(dk, n) {
    const ids = new Set(dk.map(k => k.id)), kb = Object.fromEntries(S.d.kab.map(k => [k.id, k])), atr = Object.fromEntries((S.d.aturan || []).map(a => [a.id, a]));
    if (!Array.isArray(S.d.waspada) || !Array.isArray(S.d.aturan)) {
      $("#waspada").innerHTML = `<section class="ex ex-std"><header class="ex-hd"><div class="ex-jd"><h3 class="pr-h">${svg("M12 3l9 16H3z|M12 10v4|M12 17v.5")}Perlu tindakan</h3></div></header><div class="ex-bd"><p class="pr-kosong">Data aturan tindakan belum tersedia.</p></div></section>`;
      return;
    }
    const per = {};
    for (const x of S.d.waspada.filter(x => x.tenggang === n && ids.has(x.kab))) { x.dampak ||= {}; (per[x.aturan] ||= []).push(x); }
    const isi = Object.entries(per).map(([id, xs]) => {
      const a = atr[id] || {maka: id}, ada = xs.some(x => x.dampak.jiwa != null), jiwa = xs.reduce((s, x) => s + (x.dampak.jiwa || 0), 0);
      const ungsi = xs.reduce((s, x) => s + (x.dampak.kebutuhan?.mengungsi || 0), 0);
      xs.sort((p, q) => (q.dampak.jiwa || 0) - (p.dampak.jiwa || 0));
      const rinci = xs.slice(0, 30).map(x => { const d = x.dampak;
        return `<tr><td>${esc(kb[x.kab]?.nama)}<small>${esc(kb[x.kab]?.pn)}</small></td><td class="n">${d.jiwa != null ? ribu(d.jiwa) : "–"}</td><td class="n">${d.sekolah != null ? fmt(d.sekolah) : "–"}</td><td class="n">${d.faskes != null ? fmt(d.faskes) : "–"}</td><td class="n">${d.kebutuhan ? ribu(d.kebutuhan.mengungsi) : "–"}</td></tr>`; }).join("");
      return `<details class="pr-w rk-w"><summary><b>${esc(a.maka)}</b><span>${fmt(xs.length)} kab/kota${ada ? `, ${ribu(jiwa)} jiwa tinggal di wilayah yang terpapar` : ""}${ungsi ? `, perkiraan ${ribu(ungsi)} orang mengungsi` : ""}</span></summary>
        <div class="tw ex-tabel"><table><thead><tr><th>Kab/kota</th><th title="Penduduk di wilayah yang terpapar (perkiraan)">Jiwa terpapar</th><th>Sekolah</th><th title="Fasilitas kesehatan">Faskes</th><th title="Perkiraan">Mengungsi</th></tr></thead><tbody>${rinci}</tbody></table></div>
        ${xs.length > 30 ? `<p class="pr-kecil rk-sisa">dan ${fmt(xs.length - 30)} kab/kota lain. Persempit dengan pilihan provinsi.</p>` : ""}</details>`;
    }).join("");
    $("#waspada").innerHTML = `<section class="ex ex-std"><header class="ex-hd"><div class="ex-jd"><h3 class="pr-h">${svg("M12 3l9 16H3z|M12 10v4|M12 17v.5")}Perlu tindakan</h3><span class="pr-jml">semua angka perkiraan</span></div></header>
      <div class="ex-bd">${isi || '<p class="pr-kosong">Tidak ada aturan tindakan yang terpicu untuk hari ini dan pilihan ini.</p>'}</div></section>`;
  }

  /* ---- daftar kab/kota level Waspada ke atas ---- */
  function chip(kode, k, n) {
    const r = k[kode]?.[n - 1], lv = B.levelSel(kode, S.KOL, r);
    if (!lv) return null;
    const uji = !teruji(kode, n);
    return {lv, html: `<span class="rk-chip rk-l${lv}${uji ? " rk-uji" : ""}" title="${esc(kalimat(kode, r))}${uji ? " Uji coba: belum terbukti tepat." : ""}">${svg(IKON[kode])}${esc(NAMA[kode])} <b>${esc(tingkat(kode, lv, r))}</b></span>`};
  }
  const barisHtml = (daftar, n) => daftar.map(k => {
    const cs = B.PIL[S.pil].map(c => chip(c, k, n)).filter(Boolean).sort((a, b) => b.lv - a.lv);
    return `<tr tabindex="0" data-id="${esc(k.id)}" title="Buka rincian ${esc(k.nama)}"><td class="rk-nm"><b>${esc(k.nama)}</b><small>${esc(k.pn)}</small></td><td class="n">${ribu(k.jiwa)}</td><td><div class="rk-chips">${cs.map(c => c.html).join("")}</div></td></tr>`;
  }).join("");
  function gambarDaftar(dk, n) {
    const baris = S.baris = B.urutBawaan(dk, S.KOL, n, S.pil).filter(k => B.levelPil(k, S.KOL, n, S.pil) >= 1);
    $("#jml").textContent = `${fmt(baris.length)} dari ${fmt(dk.length)} kab/kota`;
    $("#daftar").innerHTML = baris.length
      ? `<div class="tw ex-tabel"><table class="rk-tb"><thead><tr><th>Kab/kota</th><th title="Jumlah penduduk kab/kota">Penduduk</th><th>Yang perlu diwaspadai</th></tr></thead><tbody>${barisHtml(baris.slice(0, S.n), n)}</tbody></table></div>`
      : adaData(dk, n, S.pil) ? `<p class="pr-kosong">Tidak ada kab/kota pada tingkat Waspada ke atas untuk pilihan ini. Tetap ikuti informasi resmi BMKG.</p>`
      : `<p class="pr-kosong">Belum ada data prakiraan untuk pilihan dan hari ini.</p>`;
    $("#lagi").hidden = baris.length <= S.n;
    $("#lagi").textContent = `Tampilkan lagi (${fmt(baris.length - S.n)} tersisa)`;
  }

  /* ---- rincian satu kab ---- */
  function bukaRincian(id) {
    const k = S.d.kab.find(x => x.id === id), n = S.hari;
    if (!k) return;
    const hari = (S.d.kode.HJN || Object.values(S.d.kode)[0])?.hari?.[n - 1];
    const baris = B.KOLOM.map(kode => {
      const r = k[kode]?.[n - 1], lv = B.levelSel(kode, S.KOL, r);
      if (lv == null) return "";
      const uji = !teruji(kode, n);
      return `<li class="rk-rb${lv ? "" : " rk-rb0"}"><span class="rk-chip rk-l${lv}${uji ? " rk-uji" : ""}">${svg(IKON[kode])}${esc(NAMA[kode])} <b>${esc(tingkat(kode, lv, r))}</b></span>
        <span>${esc(kalimat(kode, r))}${uji ? ' <i class="rk-tanda rk-tanda-uji">uji coba</i>' : ""}</span></li>`;
    }).join("");
    const atr = Object.fromEntries((S.d.aturan || []).map(x => [x.id, x]));
    const tindakan = (S.d.waspada || []).filter(x => x.kab === id && x.tenggang === n).map(x => { const d = x.dampak || {};
      return `<li><b>${esc(atr[x.aturan]?.maka || x.aturan)}</b>${d.jiwa != null ? `: sekitar ${ribu(d.jiwa)} jiwa terpapar` : ""}${d.kebutuhan ? `, perkiraan ${ribu(d.kebutuhan.mengungsi)} mengungsi` : ""}</li>`; }).join("");
    const dlg = $("#rincian");
    dlg.innerHTML = `<article class="ex ex-std"><header class="ex-hd"><div class="ex-jd"><h3>${esc(k.nama)} <small>${esc(k.pn)}, ${ribu(k.jiwa)} jiwa${hari ? `, ${esc(tgl(hari))}` : ""}</small></h3>
      <button type="button" class="pr-tutup" aria-label="Tutup" data-tutup>${svg("M6 6l12 12|M18 6L6 18")}</button></div></header>
      <div class="ex-bd rk-rinci">
        ${baris ? `<ul class="rk-rl">${baris}</ul>` : `<p class="pr-kecil">Belum ada prakiraan untuk hari yang dipilih.</p>`}
        ${tindakan ? `<h4>Perlu tindakan</h4><ul class="rk-tl">${tindakan}</ul>` : ""}
        <div class="rk-lanjut">
          <a href="/prediksi#dampak/${encodeURIComponent(k.prov)}">${svg("M12 3l9 16H3z|M12 10v4|M12 17v.5")}Paparan dampak provinsi</a>
          <a href="/prediksi#laporan/${encodeURIComponent(k.prov)}">${svg("M6 3h9l4 4v14H6z|M9 12h6|M9 16h6")}Laporan provinsi siap cetak</a>
        </div>
      </div></article>`;
    S.dari = id;   // id, bukan simpul: baris bisa digambar ulang selama dialog terbuka
    if (!dlg.open) dlg.showModal();
    dlg.querySelector("[data-tutup]").focus({preventScroll: true});
  }
  $("#rincian").addEventListener("click", e => { if (e.target.closest("[data-tutup]") || e.target === e.currentTarget) e.currentTarget.close(); });
  $("#rincian").addEventListener("close", () => document.querySelector(`#daftar tr[data-id="${CSS.escape(S.dari || "")}"]`)?.focus({preventScroll: true}));

  /* ---- satu jadwal render (klik beruntun digabung, render sesudah frame tercat) ---- */
  function gambar() {
    $("#hariSeg").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.n === S.hari)));
    $("#ring").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pil === S.pil)));
    if (S.jadwal) return;
    S.jadwal = true;
    $("#daftar").setAttribute("aria-busy", "true");
    (window.nanti || (f => f()))(() => {
      S.jadwal = false;
      const n = S.hari, dk = daftarKab();
      gambarRing(dk, n); gambarWaspada(dk, n); gambarDaftar(dk, n);
      $("#daftar").removeAttribute("aria-busy");
    });
  }

  async function mulai() {
    try { const r = await fetch("data/prediksi.json", {cache: "no-cache"}); S.d = r.ok ? await r.json() : null; } catch { S.d = null; }
    if (!S.d) { $("#daftar").innerHTML = '<p class="kosong">Data prakiraan belum tersedia.</p>'; $("#upd").textContent = "Data belum ada"; return; }
    S.KOL = Object.fromEntries(Object.entries(S.d.kode).map(([kd, v]) => [kd, v.kol]));
    $("#upd").innerHTML = jamData_(S.d.dibuat);
    const hj = S.d.kode.HJN || Object.values(S.d.kode)[0], nm = ["Besok", "Lusa", "H+3"];
    $("#hariSeg").innerHTML = hj.hari.map((h, i) => `<button type="button" data-n="${i + 1}" aria-pressed="${i === 0}" title="${esc(tgl(h))}">${nm[i] || "H+" + (i + 1)} <small>${esc(tglPendek(h))}</small></button>`).join("");
    const prov = [...new Map(S.d.kab.map(k => [k.prov, k.pn])).entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
    $("#prov").insertAdjacentHTML("beforeend", prov.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join(""));
    if (typeof PilihCantik !== "undefined") { PilihCantik.hias($("#prov")); PilihCantik.pasang(); }
    $("#hariSeg").addEventListener("click", e => { const b = e.target.closest("button[data-n]"); if (b) { S.hari = +b.dataset.n; S.n = 50; gambar(); } });
    $("#ring").addEventListener("click", e => { const b = e.target.closest("button[data-pil]"); if (b) { S.pil = b.dataset.pil === S.pil ? "ALL" : b.dataset.pil; S.n = 50; gambar(); } });
    $("#prov").addEventListener("change", () => { S.n = 50; gambar(); });
    let t; $("#cari").addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { S.n = 50; gambar(); }, 200); });
    $("#lagi").addEventListener("click", () => { if (S.jadwal) return;   // render tertunda: S.baris masih milik pilihan lama
      const n = S.hari, mulaiI = S.n; S.n += 50;
      $("#daftar tbody").insertAdjacentHTML("beforeend", barisHtml(S.baris.slice(mulaiI, S.n), n));
      $("#lagi").hidden = S.baris.length <= S.n; $("#lagi").textContent = `Tampilkan lagi (${fmt(S.baris.length - S.n)} tersisa)`; });
    $("#daftar").addEventListener("click", e => { const tr = e.target.closest("tr[data-id]"); if (tr) bukaRincian(tr.dataset.id); });
    $("#daftar").addEventListener("keydown", e => { const tr = e.target.closest("tr[data-id]"); if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); bukaRincian(tr.dataset.id); } });
    gambar();
  }
  mulai();
})();
