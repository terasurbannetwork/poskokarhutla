/* Pustaka Hukum BNPB (publik). Data dari /api/hukum/* dan /data/bnpb/hukum/katalog.json.
   Semua teks dari server masuk lewat textContent; penanda [[ ]] cuplikan diubah jadi <mark> lewat DOM. Tanpa riwayat tanya yang disimpan. */
(() => {
  const $ = id => document.getElementById(id), NS = "http://www.w3.org/2000/svg", PER = 20, TABEL_HAL = 10;
  const IKON = {
    cari: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z|M21 21l-4.3-4.3",
    tanya: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z|M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7|M12 17h.01",
    relasi: "M6 6h.01|M18 6h.01|M12 18h.01|M6 6l6 12|M18 6l-6 12|M6 6h12",
    dokumen: "M7 3h7l5 5v13H7z|M14 3v5h5|M10 13h6|M10 17h6",
    salin: "M9 9h11v11H9z|M5 15V4h11",
    bagikan: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M8.6 13.5l6.8 4|M15.4 6.5l-6.8 4",
    tautan: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1|M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    perisai: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
    centang: "M5 12l5 5 9-10",
    silang: "M6 6l12 12|M18 6L6 18",
    peringatan: "M12 4l9 16H3z|M12 10v4|M12 17h.01",
    kalender: "M5 5h14v15H5z|M5 10h14|M9 3v4|M15 3v4",
    mata: "M3 7V5a2 2 0 0 1 2-2h2|M17 3h2a2 2 0 0 1 2 2v2|M21 17v2a2 2 0 0 1-2 2h-2|M7 21H5a2 2 0 0 1-2-2v-2|M7 12h10",
    kiri: "M19 12H5|M12 5l-7 7 7 7",
    buku: "M4 5a2 2 0 0 1 2-2h13v17H6a2 2 0 0 0-2 2z|M4 5v15",
    daftar: "M8 6h13|M8 12h13|M8 18h13|M3 6h.01|M3 12h.01|M3 18h.01",
  };
  const svg = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak) if (a != null) e.append(a); return e; };
  const angka = n => Number(n || 0).toLocaleString("id-ID");
  const tgl = s => s ? new Date(s + "T00:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"}) : "";
  const pil = (ikon, teks, warna) => h("span", {class: "bn-pil", style: null, "data-w": warna || null}, ikon ? svg(ikon) : null, teks);
  const kapital = s => s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : "";
  const WARNA_STATUS = {BERLAKU: ["centang", "c4"], DICABUT: ["silang", "c1"], DIGANTI: ["peringatan", "c3"], DIUBAH: ["peringatan", "c3"]};
  const warnaPil = e => { const w = e.dataset.w; if (w) e.style.setProperty("--pil", "var(--" + w + ")"); return e; };
  const pilStatus = st => { const [i, w] = WARNA_STATUS[String(st || "").toUpperCase()] || ["dokumen", "ink3"]; return warnaPil(pil(i, kapital(st || "Tidak diketahui"), w)); };
  const pilW = (i, t, w) => warnaPil(pil(i, t, w));
  const tidakResmi = x => !!x && (x.resmi === false || x.resmi === 0 || x.resmi === "0");
  const pilTakResmi = x => pilW("peringatan", "Salinan tidak resmi" + (x.sumber ? " (dari " + x.sumber + ")" : ""), "c1");
  let pKat = null; /* katalog dimuat sekali; null bila belum ada */
  const katalogPeta = () => pKat || (pKat = fetch("/data/bnpb/hukum/katalog.json").then(r => r.ok ? r.json() : null).then(k => new Map(((k && k.dok) || []).map(d => [d.id, d]))).catch(() => new Map()));
  const sebut = d => `${d.singkatan ? kapital(d.singkatan) : "Dokumen"} ${d.nomor}/${d.tahun}`;
  const JENIS = ["UU", "PP", "PERPRES", "PERKA", "PERBAN", "KEPKA", "JUKLAK", "JUKNIS", "SE"];
  const STATUS = ["BERLAKU", "DICABUT", "DIGANTI", "DIUBAH"];
  const CONTOH = ["dana siap pakai", "status keadaan darurat bencana", "tugas dan fungsi BNPB", "relawan penanggulangan bencana", "bantuan logistik"];
  const CONTOH_TANYA = ["Siapa yang menetapkan status keadaan darurat bencana?", "Apa syarat penggunaan dana siap pakai?", "Apa saja tugas BNPB dalam tahap tanggap darurat?"];

  /* ---- keadaan galat yang ramah ---- */
  const pesanGalat = (r, bagian) => r.status === 503 ? "Pustaka hukum belum diaktifkan." : r.status === 429 ? "Terlalu sering. Coba lagi sebentar." : `Gagal memuat ${bagian} (${r.status}).`;
  async function ambil(url, opsi) {
    const r = await fetch(url, opsi);
    if (!r.ok) { const e = new Error(pesanGalat(r, "data")); e.status = r.status; e.retry = +r.headers.get("retry-after") || 0; throw e; }
    return r.json();
  }
  const bersih = id => $(id).replaceChildren();

  /* ---- cuplikan bersorot lewat DOM ---- */
  function bersorot(teks) {
    const f = document.createDocumentFragment(); let i = 0;
    for (const m of String(teks || "").matchAll(/\[\[([\s\S]*?)\]\]/g)) {
      if (m.index > i) f.append(teks.slice(i, m.index));
      f.append(h("mark", {teks: m[1]})); i = m.index + m[0].length;
    }
    if (i < teks.length) f.append(String(teks).slice(i));
    return f;
  }

  /* ---- salin ---- */
  async function salin(tombol, teks, label) {
    const asal = tombol.lastChild.textContent;
    try { await navigator.clipboard.writeText(teks); tombol.lastChild.textContent = "Tersalin"; } catch (e) { tombol.lastChild.textContent = "Salin manual"; }
    setTimeout(() => { tombol.lastChild.textContent = label || asal; }, 1800);
  }
  const tautanDok = (id, pasal) => "#d=" + encodeURIComponent(id) + (pasal ? "&p=" + encodeURIComponent(pasal) : "");

  /* ---- rute berbasis hash ---- */
  const TAB = [["cari", "cari", "Cari"], ["tanya", "tanya", "Tanya"], ["relasi", "relasi", "Relasi"]];
  let tabAktif = "cari", dokDimuat = null;
  const param = () => new URLSearchParams(location.hash.slice(1));
  function bangunTab() {
    $("tab").replaceChildren(...TAB.map(([k, i, l]) => { const b = h("button", {type: "button", "data-t": k, "aria-pressed": "false"}, svg(i), l); return b; }));
    $("tab").addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (b) location.hash = "t=" + b.dataset.t; });
  }
  function rute() {
    const p = param(), d = p.get("d");
    if (d) { tampil("Dok"); bukaDok(d, p.get("p")); return; }
    const t = TAB.some(x => x[0] === p.get("t")) ? p.get("t") : tabAktif;
    tabAktif = t; tampil(t === "cari" ? "Cari" : t === "tanya" ? "Tanya" : "Relasi");
    if (t === "relasi") muatRelasi();
    if (t === "cari" && p.get("q") && p.get("q") !== stCari.q) { $("q").value = p.get("q"); stCari.q = p.get("q"); cari(0); }
  }
  function tampil(nama) {
    for (const n of ["Cari", "Tanya", "Relasi", "Dok"]) $("p" + n).hidden = n !== nama;
    for (const b of $("tab").children) b.setAttribute("aria-pressed", String(nama !== "Dok" && b.dataset.t === tabAktif));
    if (nama !== "Dok") document.title = "Pustaka Hukum BNPB · Pantau Bencana";
  }

  /* =================== CARI =================== */
  const stCari = {q: "", hal: 0, per: PER};
  let batalCari = null;
  function isiFilter() {
    const opsi = (id, semua, daftar, nama) => $(id).replaceChildren(h("option", {value: "", teks: semua}), ...daftar.map(v => h("option", {value: v, teks: nama(v)})));
    opsi("fJenis", "Semua jenis", JENIS, v => v); opsi("fStatus", "Semua status", STATUS, kapital);
    const th = new Date().getFullYear() + 1, ds = []; for (let y = th; y >= 2000; y--) ds.push(String(y));
    $("fTahun").replaceChildren(h("option", {value: "", teks: "Semua tahun"}), ...ds.map(y => h("option", {value: y, teks: y})));
    const kontoh = (id, daftar, aksi) => { $(id).replaceChildren(...daftar.map(c => h("button", {type: "button", teks: c}))); $(id).addEventListener("click", e => { if (e.target.tagName === "BUTTON") aksi(e.target.textContent); }); };
    kontoh("contoh", CONTOH, c => { $("q").value = c; kirimCari(); });
    kontoh("contohTanya", CONTOH_TANYA, c => { $("tanya").value = c; kirimTanya(); });
  }
  function kirimCari() { stCari.q = $("q").value.trim(); if (!stCari.q) { $("q").focus(); return; } cari(0); }
  async function cari(hal) {
    stCari.hal = hal; if (batalCari) batalCari.abort(); batalCari = new AbortController();
    const u = new URLSearchParams({q: stCari.q, hal: String(hal + 1)});
    for (const [k, id] of [["jenis", "fJenis"], ["tahun", "fTahun"], ["status", "fStatus"]]) if ($(id).value) u.set(k, $(id).value);
    history.replaceState(null, "", "#t=cari&q=" + encodeURIComponent(stCari.q));
    $("pesanCari").textContent = ""; $("bCari").disabled = true;
    $("hasil").replaceChildren(h("div", {class: "bn-kartu"}, h("div", {class: "hk-memuat"})), h("div", {class: "bn-kartu"}, h("div", {class: "hk-memuat"})));
    let D;
    try { D = await ambil("/api/hukum/cari?" + u, {signal: batalCari.signal}); }
    catch (e) { if (e.name === "AbortError") return; $("bCari").disabled = false; bersih("hasil"); bersih("ringkasCari"); bersih("halCari");
      $("pesanCari").textContent = e.status === 503 || !e.status ? "Pustaka hukum belum diaktifkan." : e.message; return; }
    $("bCari").disabled = false; stCari.per = D.per_hal || D.per || PER;
    const hasil = D.hasil || [], total = D.total || 0;
    const ring = [h("span", {teks: total ? `Menampilkan ${angka(total)} pasal` : "Tidak ada hasil"})];
    for (const [j, n] of Object.entries(D.per_jenis || {})) ring.push(pilW("dokumen", `${j}: ${angka(n)}`, "c5"));
    $("ringkasCari").replaceChildren(...ring);
    if (!hasil.length) $("hasil").replaceChildren(h("p", {class: "hk-kosong", teks: "Tidak ada pasal yang cocok. Coba kata yang lebih umum, atau longgarkan filter."}));
    else $("hasil").replaceChildren(...hasil.map(kartuHasil));
    const mak = Math.max(0, Math.ceil(total / stCari.per) - 1);
    $("halCari").replaceChildren(...(mak > 0 ? [
      h("button", {type: "button", class: "bn-tombol sekunder", "data-h": "-1", disabled: hal === 0, teks: "Sebelumnya"}),
      h("span", {teks: `Halaman ${angka(hal + 1)} dari ${angka(mak + 1)}`}),
      h("button", {type: "button", class: "bn-tombol sekunder", "data-h": "1", disabled: hal >= mak, teks: "Berikutnya"})] : []));
  }
  function kartuHasil(x) {
    const a = h("a", {class: "bn-kartu hk-hit", href: tautanDok(x.dok, x.label)},
      h("div", {class: "hk-pils"}, pilW("dokumen", `${x.singkatan || ""} ${x.nomor}/${x.tahun}`.trim(), "c5"), pilStatus(x.status), tidakResmi(x) ? pilTakResmi({sumber: null}) : null, pilW("buku", x.label || "", "ink3")),
      h("h3", {teks: x.judul || ""}), x.bab ? h("div", {class: "hk-bab", teks: x.bab}) : null, h("p", {class: "hk-cuplik"}, bersorot(x.cuplikan)));
    return a;
  }
  function pasangCari() {
    $("fCari").addEventListener("submit", e => { e.preventDefault(); kirimCari(); });
    for (const id of ["fJenis", "fTahun", "fStatus"]) $(id).addEventListener("change", () => { if ($("q").value.trim()) kirimCari(); });
    $("halCari").addEventListener("click", e => { const b = e.target.closest("[data-h]"); if (b) { cari(stCari.hal + +b.dataset.h); $("hasil").scrollIntoView({block: "start"}); } });
  }

  /* =================== DOKUMEN =================== */
  const NAMA_RELASI = {mengingat: ["Mengingat (dasar hukum)", "Menjadi dasar hukum bagi"], mencabut: ["Mencabut", "Dicabut oleh"], mengganti: ["Mengganti", "Diganti oleh"], mengubah: ["Mengubah", "Diubah oleh"], merujuk: ["Merujuk", "Dirujuk oleh"]};
  let tokenDok = 0;
  async function bukaDok(id, pasal) {
    if (dokDimuat === id) { sorotPasal(pasal); return; }
    const tk = ++tokenDok; $("pesanDok").textContent = "";
    $("dok").replaceChildren(h("div", {class: "bn-kartu"}, h("div", {class: "hk-memuat"})));
    let D;
    try { D = await ambil("/api/hukum/dok?id=" + encodeURIComponent(id)); }
    catch (e) { if (tk !== tokenDok) return; bersih("dok"); $("pesanDok").textContent = e.status === 404 ? "Dokumen tidak ditemukan." : e.message; return; }
    if (tk !== tokenDok) return;
    dokDimuat = id; gambarDok(D, id, pasal);
  }
  function gambarDok(D, id, pasal) {
    const d = D.dok || D, seg = D.segmen || d.segmen || [], rel = D.relasi || d.relasi || {};
    const keluar = D.keluar || rel.keluar || (Array.isArray(rel) ? rel.filter(r => r.dari === id) : []), masuk = D.masuk || rel.masuk || (Array.isArray(rel) ? rel.filter(r => r.ke === id) : []);
    const nama = `${d.jenis || ""} Nomor ${d.nomor} Tahun ${d.tahun}`.trim();
    document.title = `${sebut(d)} · Pustaka Hukum BNPB`;
    const pdf = Array.isArray(d.pdf) ? d.pdf : d.pdf ? [d.pdf] : [];
    const pils = [pilW("dokumen", nama, "c5"), pilStatus(d.status)];
    if (d.tgl_tetap) pils.push(pilW("kalender", "Ditetapkan " + tgl(d.tgl_tetap), "ink3"));
    if (d.tgl_undang) pils.push(pilW("kalender", "Diundangkan " + tgl(d.tgl_undang), "ink3"));
    if (d.sumber_bn) pils.push(pilW("buku", d.sumber_bn, "ink3"));
    if (tidakResmi(d)) pils.push(pilTakResmi(d)); else if (d.sumber) pils.push(pilW("tautan", d.sumber, "ink3"));
    const seg0 = seg.length && seg.every(x => x.jenis === "judul"), tanpaTeks = !seg.length || seg0 || d.halaman === 0;
    if (tanpaTeks) pils.push(pilW("peringatan", "Teks belum tersedia", "c3"));
    if (d.halaman_ocr > 0) pils.push(pilW("mata", `Dibaca OCR: ${angka(d.halaman_ocr)} dari ${angka(d.halaman)} halaman`, "c3"));
    const kembali = h("button", {type: "button", class: "ad-tombol"}, svg("kiri"), "Kembali");
    kembali.onclick = () => { location.hash = "t=" + tabAktif; };
    const bagi = h("button", {type: "button", class: "ad-tombol"}, svg("bagikan"), "Bagikan");
    bagi.onclick = () => salin(bagi, location.origin + location.pathname + tautanDok(id), "Bagikan");
    const aksi = h("div", {class: "hk-aksi"}, kembali, bagi);
    pdf.forEach((u, i) => aksi.append(h("a", {class: "ad-tombol", href: u, target: "_blank", rel: "noopener noreferrer"}, svg("tautan"), pdf.length > 1 ? `PDF resmi ${i + 1}` : "PDF resmi")));
    if (d.url) aksi.append(h("a", {class: "ad-tombol", href: d.url, target: "_blank", rel: "noopener noreferrer"}, svg("tautan"), "Halaman JDIH"));
    const kepala = h("div", {class: "bn-kartu hk-kepala"}, h("h1", {class: "hk-judul", teks: d.judul || nama}), h("div", {class: "hk-pils"}, ...pils), aksi);

    /* daftar isi */
    const toc = h("ol"), teks = h("div", {class: "hk-teks"}); let babLalu = null;
    seg.forEach((s, i) => {
      if (s.bab && s.bab !== babLalu) toc.append(h("li", {class: "bab", teks: s.bab})); babLalu = s.bab || babLalu;
      toc.append(h("li", null, h("a", {href: tautanDok(id, s.label), "data-i": i, teks: s.label || "Bagian " + (i + 1)})));
    });
    const details = h("details", {class: "bn-kartu hk-toc"}, h("summary", {teks: `Daftar isi (${angka(seg.length)} bagian)`}), toc);
    if (matchMedia("(min-width:901px)").matches) details.open = true;
    toc.addEventListener("click", e => { const a = e.target.closest("a"); if (!a) return; e.preventDefault(); history.replaceState(null, "", a.getAttribute("href")); sorotPasal(seg[+a.dataset.i].label); if (!matchMedia("(min-width:901px)").matches) details.open = false; });

    const kolomRelasi = (daftar, sisi) => {
      const per = {}; for (const r of daftar) (per[r.jenis] = per[r.jenis] || []).push(r);
      return Object.keys(NAMA_RELASI).filter(j => per[j]).map(j => h("div", {class: "hk-relasi"}, h("h3", {teks: NAMA_RELASI[j][sisi]}),
        h("ul", null, ...per[j].map(r => { const lain = r.id ?? (sisi ? r.dari : r.ke), jud = r.judul || (sisi ? r.dari_judul : r.ke_judul) || lain;
          return h("li", null, (sisi || r.terdaftar) ? h("a", {href: tautanDok(lain)}, jud) : h("span", {teks: jud}), (!sisi && !r.terdaftar) ? h("span", {class: "hk-redup", teks: " · belum ada di pustaka ini"}) : null); }))));
    };
    const blokRel = D.relasi_tersedia === false ? [h("p", {class: "hk-redup", teks: "Relasi belum tersedia."})] : [...kolomRelasi(keluar, 0), ...kolomRelasi(masuk, 1)];
    const sisi = h("div", {class: "hk-sisi"}, details);
    $("dok").replaceChildren(kepala, h("div", {class: "hk-isi"}, sisi, teks), ...(blokRel.length ? [h("section", {class: "bn-kartu hk-relasi", "aria-label": "Relasi"}, h("h2", null, svg("relasi"), "Relasi"), ...blokRel)] : []));

    /* segmen bertahap: tidak membekukan layar */
    let n = 0; const LOT = 30;
    const lot = () => {
      const f = document.createDocumentFragment(); let babTampil = n ? seg[n - 1].bab : null;
      for (const end = Math.min(seg.length, n + LOT); n < end; n++) {
        const s = seg[n];
        if (s.bab && s.bab !== babTampil) { f.append(h("div", {class: "hk-seg-bab", teks: s.bab})); babTampil = s.bab; }
        const salinBtn = h("button", {type: "button", class: "ad-tombol kecil", "data-i": n}, svg("salin"), "Salin kutipan");
        f.append(h("article", {class: "bn-kartu hk-seg", id: "s" + n, "data-label": s.label || ""}, h("div", {class: "hk-seg-kepala"}, h("b", {teks: s.label || ""}), s.halaman ? h("span", {class: "hk-redup", teks: "hal. " + angka(s.halaman)}) : null, salinBtn), h("p", {teks: s.teks || ""})));
      }
      teks.append(f);
      if (n < seg.length) setTimeout(lot, 0); else sorotPasal(pasal);
    };
    teks.addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if (b) salin(b, `${seg[+b.dataset.i].label} ${sebut(d)}`, "Salin kutipan"); });
    if (!tanpaTeks) lot(); else { teks.append(h("p", {class: "hk-kosong"}, "Teks dokumen ini belum tersedia di pustaka. Buka ", d.url ? h("a", {href: d.url, target: "_blank", rel: "noopener noreferrer"}, "halaman JDIH") : "PDF resminya", ".")); sorotPasal(null); }
  }
  function sorotPasal(label) {
    for (const e of document.querySelectorAll(".hk-seg.sorot")) e.classList.remove("sorot");
    if (!label) return;
    const t = [...document.querySelectorAll(".hk-seg")].find(e => e.dataset.label.toLowerCase() === label.toLowerCase());
    if (t) { t.classList.add("sorot"); t.scrollIntoView({block: "start"}); }
  }

  /* =================== TANYA =================== */
  let tanyaJalan = false;
  async function kirimTanya() {
    const q = $("tanya").value.trim(); if (!q || tanyaJalan) return;
    tanyaJalan = true; $("bTanya").disabled = true; $("pesanTanya").textContent = "";
    $("jawab").replaceChildren(h("div", {class: "bn-kartu"}, h("p", {class: "hk-catatan", teks: "Mencari pasal dan memeriksa kutipan ke teks asli..."}), h("div", {class: "hk-memuat"})));
    try {
      const D = await ambil("/api/hukum/tanya", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({pertanyaan: q})});
      await gambarJawab(D);
    } catch (e) { bersih("jawab"); $("pesanTanya").textContent = e.status === 503 || !e.status ? "Pustaka hukum belum diaktifkan." : e.status === 429 ? "Batas pertanyaan tercapai." + tungguLagi(e.retry) : e.message; }
    tanyaJalan = false; $("bTanya").disabled = false;
  }
  const tungguLagi = d => !d ? " Coba lagi nanti." : d >= 5400 ? ` Coba lagi sekitar ${angka(Math.ceil(d / 3600))} jam lagi.` : ` Coba lagi sekitar ${angka(Math.max(1, Math.ceil(d / 60)))} menit lagi.`;
  const kartuSegmen = (x, kat) => { const r = x.resmi === undefined ? kat.get(x.dok) : x; return h("a", {class: "bn-kartu hk-hit", href: tautanDok(x.dok, x.label)},
    h("div", {class: "hk-pils"}, pilW("buku", x.label || "Pasal", "ink3"), pilW("dokumen", x.judul || x.dok, "c5"), tidakResmi(r) ? pilTakResmi(r) : null), h("p", {class: "hk-cuplik", teks: x.teks || ""})); };
  async function gambarJawab(D) {
    const perluKat = [...(D.kutipan || []), ...(D.segmen_dipakai || [])].some(k => k.dok && k.resmi === undefined);
    const kat = perluKat ? await katalogPeta() : new Map();
    const kut = D.kutipan || [], bu = D.dibuang || 0, pils = [];
    if (kut.length) pils.push(pilW("perisai", "Terverifikasi ke teks asli", "c4"));
    if (bu > 0) pils.push(pilW("peringatan", `${angka(bu)} kutipan dibuang`, "c3"));
    const segP = D.segmen_dipakai || [], tanpaJawaban = D.jawaban == null;
    const par = String(D.jawaban || "").split(/\n+/).map(t => t.trim()).filter(Boolean);
    const awal = D.ringkasan_model && par.length ? [h("div", {class: "hk-pils"}, pilW("tanya", "Ringkasan model", "c5"))] : [];
    const isi = [h("section", {class: "bn-kartu hk-jawab"}, h("h2", null, svg("tanya"), "Jawaban"), pils.length ? h("div", {class: "hk-pils"}, ...pils) : null, ...awal,
      ...(tanpaJawaban ? [h("p", {teks: segP.length ? (D.model ? "Model tidak menghasilkan kutipan yang lolos verifikasi. Pasal paling relevan:" : "Model sedang tidak tersedia. Pasal paling relevan:") : "Tidak ditemukan di peraturan BNPB."})] : par.map(t => h("p", {teks: t}))),
      h("p", {class: "hk-catatan", teks: "Bukan nasihat hukum. Rujuk dokumen resmi."}))];
    if (tanpaJawaban && segP.length) isi.push(h("div", {class: "hk-hasil"}, ...segP.map(x => kartuSegmen(x, kat))));
    if (kut.length) isi.push(h("h2", {class: "hk-judul", teks: `Kutipan (${angka(kut.length)})`}), h("div", {class: "hk-hasil"}, ...kut.map(k => {
      const ada = k.dok, a = h(ada ? "a" : "div", {class: "bn-kartu hk-hit", href: ada ? tautanDok(k.dok, k.label) : null},
        h("div", {class: "hk-pils"}, pilW("buku", k.label || "Kutipan", "ink3"), k.dok ? pilW("dokumen", k.dok_nama || k.dok, "c5") : null, tidakResmi(k.resmi === undefined ? kat.get(k.dok) : k) ? pilTakResmi(k.resmi === undefined ? kat.get(k.dok) : k) : null), h("p", {class: "hk-cuplik", teks: k.teks || ""}));
      return a; })));
    $("jawab").replaceChildren(...isi);
  }
  function pasangTanya() {
    $("fTanya").addEventListener("submit", e => { e.preventDefault(); kirimTanya(); });
    $("tanya").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); kirimTanya(); } });
  }

  /* =================== RELASI =================== */
  let K = null, katalogMuat = false;
  const peta = new Map(); /* wadah -> {kolom, baris, urut, arah, hal} */
  function tabel(wadah, kolom, baris, awal) {
    let s = peta.get(wadah); if (!s) { s = {urut: awal.urut, arah: awal.arah, hal: 0}; peta.set(wadah, s); }
    s.kolom = kolom; s.baris = baris; s.kosong = awal.kosong; gambarTabel(wadah);
  }
  function gambarTabel(wadah) {
    const s = peta.get(wadah), w = $(wadah), k0 = s.kolom.find(k => k.k === s.urut) || s.kolom[0];
    const b = [...s.baris].sort((a, c) => { const x = k0.v(a), y = k0.v(c); return (x > y ? 1 : x < y ? -1 : 0) * s.arah; });
    if (!b.length) return w.replaceChildren(h("p", {class: "hk-kosong", teks: s.kosong || "Belum ada data."}));
    const mak = Math.max(0, Math.ceil(b.length / TABEL_HAL) - 1); s.hal = Math.min(s.hal, mak);
    const kepala = h("tr", null, ...s.kolom.map(k => h("th", {"aria-sort": k.k === s.urut ? (s.arah > 0 ? "ascending" : "descending") : "none"}, h("button", {type: "button", class: "hk-urut", "data-k": k.k}, k.l, k.k === s.urut ? (s.arah > 0 ? " ▲" : " ▼") : ""))));
    const isi = b.slice(s.hal * TABEL_HAL, (s.hal + 1) * TABEL_HAL).map(r => h("tr", null, ...s.kolom.map(k => h("td", {"data-label": k.l, class: k.n ? "n" : null}, k.f(r)))));
    w.replaceChildren(...[h("div", {class: "ad-tabel-wadah"}, h("table", {class: "ad-tabel"}, h("thead", null, kepala), h("tbody", null, ...isi))),
      mak ? h("div", {class: "hk-hal"}, h("button", {type: "button", class: "bn-tombol sekunder", "data-h": "-1", disabled: s.hal === 0, teks: "Sebelumnya"}),
        h("span", {teks: `Halaman ${angka(s.hal + 1)} dari ${angka(mak + 1)} (${angka(b.length)} baris)`}), h("button", {type: "button", class: "bn-tombol sekunder", "data-h": "1", disabled: s.hal >= mak, teks: "Berikutnya"})) : null].filter(Boolean));
  }
  function pasangRelasi() {
    $("relasi").addEventListener("click", e => {
      const sec = e.target.closest("[data-w]"); if (!sec) return; const s = peta.get(sec.dataset.w), u = e.target.closest(".hk-urut"), p = e.target.closest("[data-h]");
      if (u) { s.arah = s.urut === u.dataset.k ? -s.arah : 1; s.urut = u.dataset.k; s.hal = 0; gambarTabel(sec.dataset.w); }
      else if (p) { s.hal += +p.dataset.h; gambarTabel(sec.dataset.w); }
    });
    $("relasi").addEventListener("input", e => { if (e.target.id === "cariIstilah") { stIstilah = e.target.value.trim().toLowerCase(); isiIstilah(); } });
  }
  let stIstilah = "";
  async function muatRelasi() {
    if (katalogMuat) return; katalogMuat = true; $("pesanRelasi").textContent = "";
    $("relasi").replaceChildren(h("div", {class: "bn-kartu"}, h("div", {class: "hk-memuat"})));
    try { const r = await fetch("/data/bnpb/hukum/katalog.json"); if (!r.ok) throw new Error(r.status); K = await r.json(); }
    catch (e) { K = null; }
    if (!K || !Array.isArray(K.dok)) { katalogMuat = false; bersih("relasi"); $("relasi").append(h("p", {class: "hk-kosong", teks: "Katalog peraturan belum tersedia. Relasi antarperaturan akan muncul di sini setelah pustaka diisi."})); return; }
    const dm = new Map(K.dok.map(d => [d.id, d]));
    const judul = (id, fallback) => { const d = dm.get(id); return d ? sebut(d) : fallback || id; };
    const link = (id, teks, ada) => ada ? h("a", {href: tautanDok(id), teks}) : h("span", {teks});

    /* paling sering dirujuk */
    const hit = new Map(); for (const r of K.relasi || []) { const e = hit.get(r.ke) || {id: r.ke, n: 0, ke_judul: r.ke_judul, terdaftar: r.terdaftar}; e.n++; hit.set(r.ke, e); }
    const A = [...hit.values()];
    /* diganti atau dicabut */
    const B = (K.relasi || []).filter(r => r.jenis === "mengganti" || r.jenis === "mencabut" || r.jenis === "mengubah");
    const kos = {"relA": "Belum ada rujukan antardokumen.", "relB": "Belum ada dokumen yang tercatat diganti atau dicabut."};
    $("relasi").replaceChildren(
      h("section", {class: "hk-tabel-sec", "data-w": "relA"}, h("h2", null, "Paling sering dirujuk"), h("div", {id: "relA"})),
      h("section", {class: "hk-tabel-sec", "data-w": "relB", style: null}, h("h2", null, "Diganti, dicabut, atau diubah"), h("div", {id: "relB"})),
      h("section", {class: "hk-tabel-sec", "data-w": "relC"}, h("h2", null, "Definisi istilah"), h("label", {class: "bn-isian"}, "Cari istilah", h("input", {id: "cariIstilah", type: "search", placeholder: "Contoh: bencana", autocomplete: "off"})), h("div", {id: "relC"})));
    tabel("relA", [
      {k: "ke", l: "Dokumen", v: r => (dm.get(r.id) ? sebut(dm.get(r.id)) : r.ke_judul || r.id).toLowerCase(), f: r => h("span", null, link(r.id, judul(r.id, r.ke_judul), !!dm.get(r.id)), dm.get(r.id) ? h("div", {class: "hk-redup", teks: dm.get(r.id).judul}) : null)},
      {k: "st", l: "Status", v: r => dm.get(r.id)?.status || "", f: r => dm.get(r.id) ? h("span", {class: "hk-pils"}, pilStatus(dm.get(r.id).status), tidakResmi(dm.get(r.id)) ? pilTakResmi(dm.get(r.id)) : null) : h("span", {class: "hk-redup", teks: "Belum ada di pustaka"})},
      {k: "n", l: "Dirujuk oleh", n: true, v: r => r.n, f: r => angka(r.n) + " dokumen"}], A, {urut: "n", arah: -1, kosong: kos.relA});
    const JN = {mengganti: "Diganti oleh", mencabut: "Dicabut oleh", mengubah: "Diubah oleh"};
    tabel("relB", [
      {k: "ke", l: "Dokumen lama", v: r => (r.ke_judul || r.ke).toLowerCase(), f: r => link(r.ke, judul(r.ke, r.ke_judul), r.terdaftar)},
      {k: "jenis", l: "Keterangan", v: r => r.jenis, f: r => pilW("peringatan", JN[r.jenis], r.jenis === "mengubah" ? "c5" : "c3")},
      {k: "dari", l: "Peraturan penggantinya", v: r => r.dari, f: r => link(r.dari, judul(r.dari), !!dm.get(r.dari))}], B, {urut: "ke", arah: 1, kosong: kos.relB});
    isiIstilah();
  }
  function isiIstilah() {
    if (!K) return;
    const dm = new Map(K.dok.map(d => [d.id, d]));
    const D = (K.definisi || []).filter(x => !stIstilah || (x.istilah || "").toLowerCase().includes(stIstilah));
    tabel("relC", [
      {k: "istilah", l: "Istilah", v: r => (r.istilah || "").toLowerCase(), f: r => h("b", {teks: r.istilah})},
      {k: "teks", l: "Definisi", v: r => r.teks || "", f: r => h("span", {teks: (r.teks || "").length > 260 ? r.teks.slice(0, 257) + "..." : r.teks})},
      {k: "dok", l: "Sumber", v: r => r.dok + r.label, f: r => h("a", {href: tautanDok(r.dok, r.label), teks: `${r.label} ${dm.get(r.dok) ? sebut(dm.get(r.dok)) : r.dok}`})}], D, {urut: "istilah", arah: 1, kosong: stIstilah ? "Tidak ada istilah yang cocok." : "Belum ada definisi istilah."});
  }

  /* =================== mulai =================== */
  bangunTab(); isiFilter(); pasangCari(); pasangTanya(); pasangRelasi();
  addEventListener("hashchange", rute); rute();
})();
