"use strict";
/* sinyal.js: kartu "Sinyal komunikasi" (menara seluler OpenCelliD + padam internet IODA). Data data/menara.json dan data/internet_padam.json, dibaca apa adanya.
   Tidak ada lapisan peta: kedua data per PROVINSI (tanpa geometri), jadi hanya kartu. Proksi akses komunikasi saat bencana, bukan jumlah menara/listrik sebenarnya.
   Skrip klasik, dimuat sesudah skrip utama (muatJSON, nanti, $ terbaca). Data diambil HANYA saat kotak dinyalakan. */
(() => {
  const nf = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 0}), nf2 = new Intl.NumberFormat("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const n0 = v => Number.isFinite(v) ? nf.format(v) : "–", m2 = v => Number.isFinite(v) ? nf2.format(v) : "–";
  /* lewat toLocaleDateString("id-ID"): i18n.js menambalnya jadi en-GB saat EN, jadi bulan ikut bahasa */
  const tgl = s => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}) : "–"; };
  /* kode BPS -> nama; pemekaran Papua digabung IODA/OpenCelliD ke kode lama (lihat catatan JSON) */
  const PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung", "19": "Bangka Belitung", "21": "Kepulauan Riau",
    "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten", "51": "Bali", "52": "NTB", "53": "NTT", "61": "Kalimantan Barat", "62": "Kalimantan Tengah",
    "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara", "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo", "76": "Sulawesi Barat",
    "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat", "94": "Papua", "95": "Papua"};
  const nama = k => PROV[k] || `Provinsi ${k}`;
  /* menara per provinsi, terbesar dulu; angka dibulatkan kasar (hasil patungan pengguna, bukan sensus) */
  const bulat = v => !Number.isFinite(v) ? NaN : v >= 1000 ? Math.round(v / 100) * 100 : v >= 100 ? Math.round(v / 10) * 10 : v;
  const topMenara = (m, n = 8) => Object.entries(m.menara_per_provinsi || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({k, nama: nama(k), v}));
  /* peristiwa padam terbaru dulu */
  const terbaru = (p, n = 8) => [...(p.peristiwa || [])].sort((a, b) => b.mulai - a.mulai).slice(0, n);
  /* pernyataan model dari JSON, tak diketik tangan */
  /* bahaya_menara bisa berupa teks vonis (menara.py: "MENUNGGU KUNCI ...", "TAK TERUJI (...)"), bukan objek; kartu() yang meng-escape */
  const modelTeks = m => { const b = m.model?.bahaya_menara, pb = m.model?.auc_pembanding_klimatologi; if (!b) return "";
    if (typeof b !== "object") return /^MENUNGGU/.test(b) ? "Uji model menunggu data menara." : `Uji model bahaya padam internet dengan menara: ${String(b).replace(/<\s*/g, "kurang dari ")}.`;
    /* lemah = lolos uji tetapi pembanding klimatologi sendiri di bawah acak (AUC < 0,5), per catatan JSON */
    const lemah = /^LOLOS/.test(b.vonis) && pb < .5;
    return `Menambahkan kepadatan menara ke model bahaya padam internet ${b.vonis} uji (AUC ${m2(b.auc_uji)}; pembanding iklim ${m2(pb)})${lemah ? ": sinyalnya lemah, jangan dibaca sebagai prediksi andal" : ""}.`; };
  const hubTeks = p => { const h = p.hubungan_bahaya_padam; if (!h) return "";
    return `Hubungan antara bahaya karhutla dan padam internet: ${esc(String(h.vonis).toLowerCase())} (p ${h.p_geser < .01 ? "&lt; 0,01" : "= " + m2(h.p_geser)}).`; };
  const sepi = m => Object.values(m.menara_per_provinsi || {}).filter(v => v < 20).length;
  const kartu = (m, p) => { const tm = topMenara(m), ev = terbaru(p), tot = (p.peristiwa || []).length;
    return `<details open class="sy-det"><summary><b>Sinyal komunikasi</b> <small>menara s.d. ${tgl(m.dibuat)}, padam s.d. ${tgl(p.sampai)}</small></summary>
      <div class="sy-isi"><p class="sy-ket">Proksi akses komunikasi saat bencana. Menara: sel seluler yang tercatat OpenCelliD (hasil patungan pengguna), terbanyak per provinsi (dibulatkan):</p>
      <table class="sy-tbl"><thead><tr><th>Provinsi</th><th>sel tercatat</th></tr></thead><tbody>${tm.map(r => `<tr><td>${esc(r.nama)}</td><td>${n0(bulat(r.v))}</td></tr>`).join("")}</tbody></table>
      <p class="sy-ket">Padam internet: ${n0(tot)} peristiwa sejak ${tgl(p.dari)}. Terbaru:</p>
      <table class="sy-tbl"><thead><tr><th>Provinsi</th><th>Tanggal</th><th>Lama (jam)</th><th>Turun hingga (%)</th></tr></thead><tbody>${ev.map(e =>
        `<tr><td>${esc(nama(e.prov))}</td><td>${tgl(e.tanggal)}</td><td>${n0(e.jam)}</td><td>${Number.isFinite(e.turun_maks) ? Math.round(e.turun_maks * 100) : "–"}</td></tr>`).join("")}</tbody></table>
      <p class="sy-cat">${esc(modelTeks(m))} ${hubTeks(p)} Jumlah sel mengukur kepadatan pengamatan, bukan jumlah menara sebenarnya.${sepi(m) ? ` ${sepi(m)} provinsi punya kurang dari 20 sel tercatat.` : ""} Padam = blok jaringan /24 yang tak menjawab ping, bukan bukti listrik atau seluler mati. Sumber: OpenCelliD (CC-BY-SA 4.0), unduhan ${tgl(m.akses_menara?.match(/\d{4}-\d\d-\d\d/)?.[0])}; IODA, Georgia Tech, data s.d. ${tgl(p.sampai)}.</p></div></details>`; };
  window.SinyalKomunikasi = {n0, tgl, nama, bulat, topMenara, terbaru, modelTeks, hubTeks, sepi, kartu};
  if (typeof document === "undefined" || typeof peta === "undefined") return;

  let janji = null, gen = 0;
  const ambil = () => janji ||= Promise.all([muatJSON("data/menara.json"), muatJSON("data/internet_padam.json")]).catch(e => { janji = null; throw e; });
  const wadah = () => $("#sinyalKartu") || $("#dok").insertAdjacentElement("beforeend", Object.assign(document.createElement("div"), {id: "sinyalKartu", className: "box sy-box", hidden: true}));
  const nyala = async on => { const id = ++gen, w = wadah(); w.hidden = !on; if (!on) return;
    try { const [m, p] = await ambil(); if (id === gen) w.innerHTML = kartu(m, p); }
    catch (e) { if (id === gen) w.innerHTML = `<p class="sy-cat">Data sinyal komunikasi belum bisa dimuat.</p>`; } };
  const sisip = () => { const L = $("#lapis"); if (!L || L.querySelector('[data-l="sinyal"]')) return;
    const lahan = [...L.querySelectorAll("details")].find(d => d.querySelector("summary")?.textContent.trim() === "Lahan");
    (lahan || L).insertAdjacentHTML("beforeend", `<label><input type="checkbox" data-l="sinyal"> Sinyal komunikasi (menara, padam internet)</label>`);
    /* stopPropagation supaya penangan #lapis (Lapis.pasang) tak ikut jalan. Kerja ditunda lewat nanti() (INP). */
    L.querySelector('[data-l="sinyal"]').addEventListener("change", e => { e.stopPropagation(); const on = e.target.checked; nanti(() => nyala(on)); }); };
  sisip();
})();
