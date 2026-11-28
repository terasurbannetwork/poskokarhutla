"use strict";
/* MT-1 Penyusun usulan Dana Bersama prabencana (tiket RU-094; DESAIN-TEKNIS 6.10; DESIGN-SYSTEM 7.9; ALGORITMA 10.14). Bentuk G: dikerjakan di peramban,
   TIDAK ADA permintaan tulis ke server (tanpa tabel usulan, DT 2.2); isian hilang bila halaman ditutup, yang disimpan hanya unduhan PDF atau Excel.
   Bahan dari unit/dana_bersama_katalog.json (scripts/bnpb/unit/mt1.py: 11 kode 02.01.xx, klasifikasi risiko lingkungan dan sosial, komponen Juklak 2/2026).
   Skor pra-telaah 0 sampai 3 = butir sesuai RPB atau RKPD (dicentang pemohon dengan tautan; terisi dulu dari status RPBD PSPB-1 bila ada), kab di kuartil atas
   skor MT-2 (hipotesis, bukan IRBI resmi), dan kegiatan termasuk subkegiatan SPM (dicentang pemohon). Butir yang belum bisa dinilai tidak dihitung 0:
   skor ditulis "n dari m butir". RAB = kuantitas x volume x harga satuan yang diisi pemohon (Juklak 2/2026 tidak memuat harga satuan). "Di atas batas"
   hanya untuk batas tertulis Maksimal N di kolom Catatan yang satuannya jelas (kuantitas atau volume). Satu usulan satu kode dan satu keluaran (Juklak 4/2025 Bab III C).
   Fungsi murni diuji tanpa DOM: UnitMt1 {periksaUsulan, lampau, skor, baris, total, rupiah}. Layar: UnitTampil["MT-1"](berkas) -> [elemen]. */
(() => {
  const KODE = /^02\.01\.(0[1-9]|1[01])$/;
  const sahAngka = v => typeof v === "number" && Number.isFinite(v) && v >= 0;
  const rupiah = v => sahAngka(v) ? "Rp" + Math.round(v).toLocaleString("id-ID") : null;
  /* angka gaya Indonesia: titik hanya ribuan (1.250), koma desimal (1.250,5); "2.5" ditolak (null), tidak diam-diam jadi 25 */
  const angkaId = s => { const t = String(s ?? "").trim(); if (!/^\d+(,\d+)?$/.test(t) && !/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return null; return Number(t.replace(/\./g, "").replace(",", ".")); };

  /* sama dengan mt1.py periksa_usulan: [alasan tolak], kosong = lolos */
  function periksaUsulan(kegiatan, keluaran) {
    const alasan = [], kode = typeof kegiatan === "string" ? [kegiatan] : [...(kegiatan || [])], kel = (keluaran || []).filter(x => String(x).trim());
    if (new Set(kode).size !== 1 || !KODE.test(String(kode[0] ?? ""))) alasan.push("usulan harus memilih tepat satu kode kegiatan 02.01.01 sampai 02.01.11");
    if (kel.length !== 1) alasan.push(kel.length ? "usulan hanya untuk satu keluaran (Juklak 4/2025 Bab III huruf C)" : "usulan belum menyebut keluarannya");
    return alasan;
  }
  /* sama dengan mt1.py tandai: batas tertulis yang dilampaui; peran tak jelas atau jumlah kosong tidak menandai */
  function lampau(komponen, kuantitas, volume) {
    const n = {kuantitas, volume};
    return (komponen?.batas || []).filter(b => { const v = n[b.peran]; return sahAngka(v) && v > b.nilai; }).map(b => b.teks);
  }
  /* skor pra-telaah: butir null = belum bisa dinilai (tidak dihitung 0). {nilai, dari, belum:[nama butir]} */
  function skor({rpbd, kuartil, spm}) {
    const b = [["sesuai RPB atau RKPD", rpbd], ["kab di kuartil atas risiko", kuartil], ["subkegiatan SPM", spm]];
    const ada = b.filter(([, v]) => v === true || v === false);
    return {nilai: ada.filter(([, v]) => v).length, dari: ada.length, belum: b.filter(([, v]) => v == null).map(([n]) => n)};
  }
  /* satu baris RAB: sub = kuantitas x volume x harga hanya bila ketiganya terisi (kosong bukan 0); wajib = komponen Pokok belum lengkap */
  function baris(komponen, isi) {
    const q = isi?.kuantitas, v = isi?.volume, h = isi?.harga, penuh = sahAngka(q) && sahAngka(v) && sahAngka(h);
    return {sub: penuh ? q * v * h : null, terisi: penuh, kurang_pokok: komponen.sifat === "Pokok" && !penuh, di_atas: lampau(komponen, q, v)};
  }
  const total = rows => ({jumlah: rows.filter(r => r.terisi).reduce((a, r) => a + r.sub, 0), terisi: rows.filter(r => r.terisi).length, dari: rows.length,
    kurang_pokok: rows.filter(r => r.kurang_pokok).length, di_atas: rows.filter(r => r.di_atas.length).length});

  const api = {periksaUsulan, lampau, skor, baris, total, rupiah, angkaId};
  (typeof window !== "undefined" ? window : globalThis).UnitMt1 = api;
  if (typeof window === "undefined" || !window.UnitRapor) return;

  const R = window.UnitRapor;
  const h = (tag, a, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
  const ikon = k => { const t = document.createElement("template"); t.innerHTML = R.svg(k); return t.content.firstElementChild; };
  const ambilJson = async u => { try { const r = await fetch(u, {credentials: "same-origin", signal: AbortSignal.timeout(9000)}); return r.ok ? await r.json() : null; } catch (e) { return null; } };
  const _lib = {};
  const skrip = src => _lib[src] ||= new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => { delete _lib[src]; no(new Error("Gagal memuat " + src)); }; document.head.append(s); });
  const unduh = (blob, nama) => { const a = h("a", {href: URL.createObjectURL(blob), download: nama}); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };

  function tampil(berkas) {
    const d = berkas.data, kat = d?.katalog || [];
    const skema = {id: "mt1-penyusun", sistem: "MT-1", pil: "Dana Bersama prabencana", ikon: "timbang", judul: "Penyusun usulan", label: ["hitungan_kita"], sumber: ["Juklak BNPB 4/2025 Lampiran I", "Juklak BNPB 2/2026 Lampiran II", "Urutan skor mitigasi"], aturan: [], asumsi: ["Asumsi: skor butir risiko belum diuji balik"],
      rumus: "skor pra-telaah = butir sesuai rencana penanggulangan bencana (RPB) atau rencana kerja pemerintah daerah (RKPD), kab di kuartil atas skor risiko kita, subkegiatan standar pelayanan minimal (SPM); rencana anggaran biaya (RAB) = kuantitas x volume x harga satuan isian pemohon",
      angka: [{k: "kegiatan", label: "Kegiatan mitigasi 02.01.xx", nilai: kat.length}], kolom: [], baris: []};
    const sec = R.render(skema, berkas), bd = sec.querySelector(".ex-bd");
    if (!kat.length) { bd.append(h("p", {class: "ad-kosong", role: "status"}, ikon("kosong"), "Katalog kegiatan belum terbaca.")); return [sec]; }

    const pilihPem = h("select", {id: "mt1-pem", class: "un-g-in un-pd3-pilih"}, ...Object.entries(d.pemohon).map(([k, t]) => h("option", {value: k, teks: t})));
    const pilihKeg = h("select", {id: "mt1-keg", class: "un-g-in un-pd3-pilih"}, h("option", {value: "", teks: "Pilih kegiatan"}), ...kat.map(k => h("option", {value: k.kode, teks: `${k.kode} ${k.nama}`})));
    const pilihKab = h("select", {id: "mt1-kab", class: "un-g-in un-pd3-pilih"}, h("option", {value: "", teks: "Pilih kab/kota (untuk skor risiko)"}));
    const esms = h("p", {class: "un-g-cat", role: "status", teks: "Risiko lingkungan dan sosial (sistem pengelolaan lingkungan dan sosial, ESMS): pilih kegiatan dulu."});
    const keluaranWadah = h("div", {class: "un-mt1-kel"}), tambahKel = h("button", {type: "button", class: "ad-tombol kecil", "data-mt1": "kel"}, ikon("data"), "Tambah keluaran");
    const tolak = h("p", {class: "bn-pesan galat", role: "status", hidden: true});
    const cbRpb = h("input", {type: "checkbox", id: "mt1-rpb"}), tautRpb = h("input", {type: "url", id: "mt1-taut", class: "un-g-in", placeholder: "https://tautan dokumen RPB atau RKPD", autocomplete: "off"});
    const cbSpm = h("input", {type: "checkbox", id: "mt1-spm"});
    const skorEl = h("p", {class: "un-g-cat", role: "status"}), rabWadah = h("div", {class: "un-mt1-rab"}), totalEl = h("p", {class: "un-g-cat", role: "status"});
    const exX = h("button", {type: "button", class: "ad-tombol kecil", "data-mt1": "xlsx", disabled: true}, ikon("unduh"), "Unduh Excel");
    const exP = h("button", {type: "button", class: "ad-tombol kecil", "data-mt1": "pdf", disabled: true}, ikon("unduh"), "Unduh PDF");
    const info = h("p", {class: "un-g-cat", role: "status"}), pesanAngka = h("p", {class: "bn-pesan galat", role: "status"});
    let kab = null, risiko = null, rpbd = null, wilayah = null, isi = [], rows = [];

    const keluaran = () => [...keluaranWadah.querySelectorAll("input")].map(i => i.value);
    const komponen = () => (d.standar?.[pilihKeg.value]?.[pilihPem.value]) || [];
    const kuartil = () => (kab && risiko ? !!risiko.find(x => x.kab === kab)?.kuartil_atas : null);
    const rpbdStatus = () => { const r = kab && rpbd?.find(x => x.kode === kab); return r ? r : null; };

    function hitung() {
      const komps = komponen(), alasan = periksaUsulan(pilihKeg.value || [], keluaran());
      const adaKeg = !!pilihKeg.value, k = kat.find(x => x.kode === pilihKeg.value);
      esms.textContent = k ? `Risiko lingkungan dan sosial (sistem pengelolaan lingkungan dan sosial, ESMS): ${k.klasifikasi}${k.rentang ? ", rentang tertulis; kelas pasti ditentukan telaah" : ""}.` : "Risiko lingkungan dan sosial (sistem pengelolaan lingkungan dan sosial, ESMS): pilih kegiatan dulu.";
      const bukti = cbRpb.checked && /^https?:\/\/\S+$/i.test(tautRpb.value.trim());
      const s = skor({rpbd: bukti, kuartil: kuartil(), spm: cbSpm.checked});
      skorEl.textContent = `Skor pra-telaah ${s.nilai} dari ${s.dari} butir yang bisa dinilai (maksimal 3)` + (s.belum.length ? `; belum bisa dinilai: ${s.belum.join(", ")}` : "")
        + (cbRpb.checked && !bukti ? "; butir RPB atau RKPD belum dihitung karena tautan dokumen kosong atau bukan alamat web" : "") + ". Alat bantu, bukan penilaian tim telaah. Butir risiko memakai skor kita, bukan Indeks Risiko Bencana Indonesia (IRBI) resmi.";
      rows = komps.map((c, i) => baris(c, isi[i]));
      const t = total(rows);
      totalEl.textContent = adaKeg ? `Rencana anggaran biaya (RAB) terisi ${t.terisi} dari ${t.dari} komponen: ${t.terisi ? rupiah(t.jumlah) : "belum ada"}; komponen pokok belum lengkap ${t.kurang_pokok}; di atas batas tertulis ${t.di_atas}.` : "";
      tolak.hidden = !(adaKeg && alasan.length); tolak.textContent = alasan.length ? "Usulan ditolak alat bantu: " + alasan.join("; ") + "." : "";
      rabWadah.querySelectorAll("[data-sub]").forEach(el => { const r = rows[Number(el.dataset.sub)]; el.textContent = r?.terisi ? rupiah(r.sub) : "belum lengkap"; });
      rabWadah.querySelectorAll("[data-atas]").forEach(el => { const r = rows[Number(el.dataset.atas)]; el.hidden = !r?.di_atas.length; el.textContent = r?.di_atas.length ? "Di atas batas tertulis: " + r.di_atas.join("; ") : ""; });
      exX.disabled = exP.disabled = !adaKeg || !!alasan.length || !t.terisi;
    }
    const susunRab = () => {
      isi = []; const komps = komponen();
      if (!pilihKeg.value) { rabWadah.replaceChildren(); return hitung(); }
      if (!komps.length) { rabWadah.replaceChildren(h("p", {class: "ad-kosong", role: "status"}, ikon("kosong"), "Komponen biaya untuk pemohon ini belum ada di Juklak 2/2026 atau belum terbaca.")); return hitung(); }
      const masukan = (i, k, label) => h("input", {class: "un-g-in", inputmode: "decimal", autocomplete: "off", "aria-label": label, "data-i": i, "data-k": k});
      rabWadah.replaceChildren(h("table", {class: "ex-tabel un-mt1-tabel"}, h("thead", null, h("tr", null, ...["Komponen", "Sifat", "Kuantitas", "Volume", "Harga satuan (Rp)", "Subtotal"].map(t => h("th", {scope: "col", teks: t})))),
        h("tbody", null, ...komps.map((c, i) => h("tr", null,
          h("td", {title: `${c.rumus || ""}${c.catatan ? " | Catatan: " + c.catatan : ""}`.trim()}, h("b", {teks: c.variabel}), h("div", {class: "un-g-cat", teks: `${c.uraian}; ${c.kuantitas}; ${c.volume} (Juklak 2/2026 hal. ${c.halaman})`}),
            c.batas.length ? h("div", {class: "un-g-cat", teks: c.batas.map(b => b.teks).join("; ")}) : null, h("div", {class: "bn-pesan galat", "data-atas": i, hidden: true})),
          h("td", {teks: c.sifat}), h("td", null, masukan(i, "kuantitas", "Kuantitas " + c.variabel)), h("td", null, masukan(i, "volume", "Volume " + c.variabel)), h("td", null, masukan(i, "harga", "Harga satuan " + c.variabel)),
          h("td", {"data-sub": i, teks: "belum lengkap"}))))));
      hitung();
    };
    keluaranWadah.append(h("input", {class: "un-g-in", "aria-label": "Keluaran kegiatan", placeholder: "Satu keluaran, misal 1 dokumen kajian", maxlength: "200", autocomplete: "off"}));

    pilihPem.addEventListener("change", susunRab); pilihKeg.addEventListener("change", susunRab);
    tambahKel.addEventListener("click", () => { keluaranWadah.append(h("input", {class: "un-g-in", "aria-label": "Keluaran kegiatan lain", maxlength: "200", autocomplete: "off"})); hitung(); });
    keluaranWadah.addEventListener("input", hitung); cbRpb.addEventListener("change", hitung); tautRpb.addEventListener("input", hitung); cbSpm.addEventListener("change", hitung);
    rabWadah.addEventListener("input", e => { const el = e.target.closest("[data-i]"); if (!el) return;
      const v = angkaId(el.value), salah = el.value.trim() !== "" && v === null;
      el.setAttribute("aria-invalid", String(salah)); (isi[Number(el.dataset.i)] ||= {})[el.dataset.k] = v;
      pesanAngka.textContent = salah ? "Angka tidak terbaca: pakai koma untuk desimal dan titik hanya untuk ribuan, misalnya 1.250,5." : ""; hitung(); });
    pilihKab.addEventListener("change", async () => {
      kab = pilihKab.value || null; info.textContent = "";
      if (kab && risiko === null) { const j = await ambilJson("/api/unit/data/mitigasi_prioritas"); risiko = j?.data?.kab || []; if (!j) info.textContent = "Skor risiko kab belum tersedia: butir kuartil atas tidak dihitung."; }
      if (kab && rpbd === null) { const j = await ambilJson("/api/unit/data/rpbd"); rpbd = j?.data?.pemda || []; }
      const r = rpbdStatus();
      if (r && /^(berlaku|sesuai_3_2026)$/.test(r.status) && r.url) { cbRpb.checked = true; tautRpb.value = r.url; info.textContent += (info.textContent ? " " : "") + `Terisi dari register RPBD (PSPB-1, status ${r.status.replace(/_/g, " ")}); periksa tautannya.`; }
      hitung();
    });
    ambilJson("/data/bnpb/wilayah.json").then(j => { wilayah = j?.kab || []; for (const w of [...wilayah].sort((a, b) => String(a.kode).localeCompare(String(b.kode)))) pilihKab.append(h("option", {value: w.kode, teks: `${w.nama} (${w.kode})`})); });

    const data = () => {
      const k = kat.find(x => x.kode === pilihKeg.value), komps = komponen(), pem = d.pemohon[pilihPem.value], s = skor({rpbd: cbRpb.checked && /^https?:\/\/\S+$/i.test(tautRpb.value.trim()), kuartil: kuartil(), spm: cbSpm.checked}), t = total(rows);
      const kepala = ["Komponen", "Uraian", "Sifat", "Kuantitas", "Volume", "Harga satuan (Rp)", "Subtotal (Rp)", "Catatan batas"];
      const br = komps.map((c, i) => { const r = rows[i], x = isi[i] || {}; return [c.variabel, c.uraian, c.sifat, x.kuantitas ?? "", x.volume ?? "", x.harga ?? "", r.terisi ? Math.round(r.sub) : "belum lengkap", r.di_atas.join("; ")]; });
      return {k, pem, s, t, kepala, br, keluaran: keluaran().filter(x => x.trim())[0], kab: kab && wilayah?.find(w => w.kode === kab)?.nama};
    };
    /* tombol ekspor: mati dan aria-busy seketika, dipulihkan di finally (hitung() menentukan lagi boleh tidaknya) */
    const sibuk = async (b, kerja) => { b.disabled = true; b.setAttribute("aria-busy", "true");
      try { await kerja(); info.textContent = ""; } catch (e) { info.textContent = "Unduhan gagal: " + e.message; } finally { b.removeAttribute("aria-busy"); hitung(); } };
    exX.addEventListener("click", () => sibuk(exX, async () => {
      await skrip("/bnpb/dalops_hitung.js"); const D = data();
      unduh(new Blob([window.DalopsHitung.xlsx([{nama: "Usulan " + D.k.kode, kepala: D.kepala, baris: D.br}])], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), `usulan-dana-bersama-${D.k.kode}.xlsx`);
    }));
    exP.addEventListener("click", () => sibuk(exP, async () => {
      await skrip("/vendor/jspdf/jspdf.umd.min.js"); const D = data(), doc = new window.jspdf.jsPDF({orientation: "landscape", unit: "mm", format: "a4"});
      let y = 16; const tulis = (t, z = 9, b = false) => { doc.setFont("helvetica", b ? "bold" : "normal"); doc.setFontSize(z); for (const l of doc.splitTextToSize(String(t), 270)) { if (y > 195) { doc.addPage(); y = 16; } doc.text(l, 14, y); y += z * 0.5; } y += 1.5; };
      tulis("Draf usulan Dana Bersama prabencana (alat bantu, bukan kanal pengajuan)", 13, true);
      tulis(`Kegiatan ${D.k.kode} ${D.k.nama}. Pemohon: ${D.pem}${D.kab ? ", " + D.kab : ""}. Risiko lingkungan dan sosial (sistem pengelolaan lingkungan dan sosial, ESMS): ${D.k.klasifikasi}.`);
      tulis(`Keluaran: ${D.keluaran || "belum diisi"}. Skor pra-telaah ${D.s.nilai} dari ${D.s.dari} butir yang bisa dinilai; butir risiko memakai skor kita, bukan Indeks Risiko Bencana Indonesia (IRBI) resmi.`);
      tulis(`Rencana anggaran biaya (RAB) terisi ${D.t.terisi} dari ${D.t.dari} komponen: ${D.t.terisi ? rupiah(D.t.jumlah) : "belum ada"}. Harga satuan diisi pemohon; Juklak 2/2026 tidak memuat harga satuan.`, 9, true); y += 2;
      for (const r of D.br) tulis(`${r[0]} (${r[2]}): kuantitas ${r[3] === "" ? "-" : r[3]}, volume ${r[4] === "" ? "-" : r[4]}, harga ${r[5] === "" ? "-" : r[5]}, subtotal ${r[6] === "belum lengkap" ? r[6] : rupiah(r[6])}${r[7] ? ". Di atas batas tertulis: " + r[7] : ""}`, 8);
      doc.save(`usulan-dana-bersama-${D.k.kode}.pdf`);
    }));

    bd.append(h("p", {class: "un-g-cat", teks: "Isian dikerjakan di peramban ini dan tidak dikirim atau disimpan di server. Hasilnya hanya lewat unduhan. Ini alat bantu menyusun, bukan kanal pengajuan; yang menelaah tetap tim telaah BNPB."}),
      h("div", {class: "un-g"},
        h("div", {class: "un-g-in-wadah"}, h("p", null, h("label", {for: "mt1-pem", teks: "Pemohon "}), pilihPem), h("p", null, h("label", {for: "mt1-keg", teks: "Kegiatan "}), pilihKeg), esms,
          h("p", null, h("label", {for: "mt1-kab", teks: "Kab/kota "}), pilihKab), info,
          h("p", {class: "un-g-cat", teks: "Keluaran kegiatan (hanya satu)"}), keluaranWadah, tambahKel, tolak,
          h("p", null, h("label", null, cbRpb, " Kegiatan sesuai rencana penanggulangan bencana (RPB) atau rencana kerja pemerintah daerah (RKPD), dengan tautan dokumen")), tautRpb, h("p", null, h("label", null, cbSpm, " Kegiatan termasuk subkegiatan standar pelayanan minimal (SPM)"))),
        h("div", {class: "un-g-out"}, skorEl, totalEl, h("div", {class: "un-aksi un-pd3-aksi"}, exX, exP))),
      pesanAngka, rabWadah);
    hitung();
    return [sec];
  }
  (window.UnitTampil ||= {})["MT-1"] = tampil;
})();
