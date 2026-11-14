/* operasi_semai_murni.js: fungsi murni seksi Peluang semai (format, DMS, jam setempat, urutan kota, kalimat kosong, ringkasan teks).
   Tanpa DOM, tanpa fetch, tanpa Intl (uji node tidak bergantung ICU). Membaca semai.json apa adanya; tidak menghitung ulang skor atau zona
   (itu kerja scripts/operasi/semai.py). Kontrak: data/kajian-bnpb/semai-awan/DESAIN-TEKNIS.md §3, ALGORITMA.md §7, §9, §11.
   Dimuat klasik (window.OpsSemaiMurni) oleh operasi_semai.js dan sebagai modul CommonJS oleh tests/operasi/semai_layar.test.mjs. */
(function (akar) {
  "use strict";
  const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"], BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const OFFSET = {WIB: 7, WITA: 8, WIT: 9};
  const NEGARA = {MY: "Malaysia", SG: "Singapura", BN: "Brunei", TL: "Timor-Leste", PG: "Papua Nugini", PNG: "Papua Nugini", ID: "Indonesia"};
  const TINGKAT = {tinggi: 3, sedang: 2, rendah: 1};
  const ARAH8 = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];

  /* angka Indonesia: titik ribuan, koma desimal */
  const fmt = (x, d = 0) => { if (x == null || !Number.isFinite(+x)) return "–"; const [a, b] = Math.abs(+x).toFixed(d).split(".");
    return (+x < 0 && +x.toFixed(d) !== 0 ? "-" : "") + a.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (b ? "," + b : ""); };

  const dms = (lat, lon) => { const satu = (x, p, n) => { const d = Math.round(Math.abs(x) * 3600); return `${Math.floor(d / 3600)}°${String(Math.floor(d % 3600 / 60)).padStart(2, "0")}'${String(d % 60).padStart(2, "0")}" ${x >= 0 ? p : n}`; };
    return `${satu(lat, "LU", "LS")} ${satu(lon, "BT", "BB")}`; };
  const desimal = (lat, lon) => `${fmt(lat, 3)}, ${fmt(lon, 3)}`;
  const salinKoordinat = (lat, lon) => `${(+lat).toFixed(3)}, ${(+lon).toFixed(3)}`;   // format tempel ke peta/WA: titik desimal, tanpa pemisah ribuan

  /* jam setempat dari ISO UTC; zona "WIB" bawaan */
  const lokal = (iso, zona) => new Date(Date.parse(iso) + (OFFSET[zona] ?? 7) * 36e5);
  const jam = (iso, zona) => { const d = lokal(iso, zona); return `${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`; };
  const hariJam = (iso, zona = "WIB") => { const d = lokal(iso, zona); return `${HARI[d.getUTCDay()]} ${d.getUTCDate()} ${BLN[d.getUTCMonth()]}, ${jam(iso, zona)} ${zona}`; };
  const jendela = z => z?.jendela_teks || (z?.jendela?.length === 2 ? `${jam(z.jendela[0], z.zona_waktu)} sampai ${jam(z.jendela[1], z.zona_waktu)} ${z.zona_waktu || "WIB"}` : "");
  const putaranTeks = p => { if (!p?.init) return ""; const d = new Date(p.init); return `${d.getUTCDate()} ${BLN[d.getUTCMonth()]} ${String(d.getUTCHours()).padStart(2, "0")}z`; };
  /* waktu langkah (jam sesudah init putaran) dan "+N j" dari saat berkas dibuat */
  const waktuLangkah = (data, l) => new Date(Date.parse(data.putaran.init) + l * 36e5).toISOString();
  const plusJam = (data, l) => Math.round((Date.parse(waktuLangkah(data, l)) - Date.parse(data.dibuat)) / 36e5);
  const umurJam = (dibuat, kini = Date.now()) => dibuat ? Math.max(0, (kini - Date.parse(dibuat)) / 36e5) : null;
  const umurTeks = h => h == null ? "umur tidak diketahui" : h < 1 ? "kurang dari 1 jam" : `${Math.round(h)} jam`;

  /* kalimat kosong per ALGORITMA §7 */
  const kalimatKosong = (alasan, data) => {
    if (alasan === "tidak_ada_api_besar") return `Tidak ada cluster api di atas ${data?.ambang_mw != null ? fmt(data.ambang_mw) + " MW" : "ambang daya api"}, belum perlu semai.`;
    if (alasan === "tanpa_prakiraan") return `Prakiraan belum tersedia. Putaran terakhir: ${putaranTeks(data?.putaran) || "belum ada"}.`;
    return "Tidak ada awan layak semai yang hanyut ke api dalam 24 jam ke depan.";   // tidak_ada_awan dan alasan tak dikenal
  };
  const judulKosong = alasan => alasan === "tidak_ada_api_besar" ? "belum ada api besar" : alasan === "tanpa_prakiraan" ? "prakiraan belum tersedia" : "tidak ada awan layak semai";

  /* kota di bawah asap: tiba +N jam dulu (urut jam tiba), lalu sudah berasap (urut tingkat); paling banyak maks baris */
  const sudahBerasap = k => k.status ? /sudah/i.test(k.status) : !(k.tiba_jam > 0);
  function urutKota(daftar, maks = 8) {
    const a = (daftar || []).slice();
    const tiba = a.filter(k => !sudahBerasap(k)).sort((x, y) => x.tiba_jam - y.tiba_jam || (TINGKAT[y.tingkat] || 0) - (TINGKAT[x.tingkat] || 0));
    const sudah = a.filter(sudahBerasap).sort((x, y) => (TINGKAT[y.tingkat] || 0) - (TINGKAT[x.tingkat] || 0) || String(x.nama).localeCompare(String(y.nama)));
    const t = tiba.slice(0, maks), s = sudah.slice(0, Math.max(0, maks - t.length));
    return {tiba: t, sudah: s, sisa: a.length - t.length - s.length};   // sisa dari daftar; asap.kota_lain (pipeline) ditambahkan layar
  }
  const arahKata = a => { if (a == null) return ""; if (typeof a === "number") return ARAH8[Math.floor(((a % 360) + 360) % 360 / 45 + .5) % 8]; return String(a).replace(/^dari\s+/i, ""); };
  /* baris kedua kota: "dari cluster #13 Kupang, 42 km di tenggara, angin 18 km/j, 7 jam berasap" */
  function barisAsal(k) {
    const as = k.asal, bag = [];
    if (as) { const id = as.id ?? as.cluster, nama = [id != null ? `cluster #${parseInt(String(id).replace(/\D/g, ""), 10) || id}` : "cluster", as.kab || as.nama || ""].filter(Boolean).join(" ");
      bag.push(`dari ${nama}${as.km != null ? `, ${fmt(as.km)} km` : ""}${k.arah ? ` di ${arahKata(k.arah)}` : ""}`); }
    else if (k.arah) bag.push(`dari arah ${arahKata(k.arah)}`);
    const kmj = k.angin_kmj ?? k.angin?.kmj, lama = k.lama ?? k.lama_jam;
    if (kmj != null) bag.push(`angin ${fmt(kmj)} km/j`);
    if (lama != null) bag.push(`${fmt(lama)} jam berasap`);
    return bag.join(", ");
  }

  /* alasan C, F, T, B: kalimat pendek dari masukan zona (angka apa adanya) */
  function alasan(z) {
    const m = z.masukan || {}, b = z.base || {};
    const p = (k, t) => m[k] != null ? t : "";
    return [
      ["C", "Awan", [p("lcc", `awan rendah ${fmt(m.lcc * 100)}%`), p("mucape", `CAPE ${fmt(m.mucape)} J/kg`), p("tclw", `air awan ${fmt(m.tclw, 2)} kg/m²`), p("hangat_m", `lapisan hangat ${fmt(m.hangat_m)} m`)].filter(Boolean).join(", ")],
      ["F", "Hanyut ke api", [z.cluster ? `cluster ${z.cluster}` : "", p("frp_25km", `${fmt(m.frp_25km)} MW dalam 25 km titik hujan`), p("angin_kmj", `angin ${fmt(m.angin_kmj)} km/j${m.angin_dari ? ` dari ${m.angin_dari}` : ""}`)].filter(Boolean).join(", ")],
      ["T", "Jarak ke kota", z.kota ? `${z.kota}${z.T != null ? `, faktor ${fmt(z.T, 2)}` : ""}` : ""],
      ["B", "Base", b.nama ? `${b.nama}${b.icao ? ` (${b.icao})` : ""}${b.km != null ? `, ${fmt(b.km)} km` : ""}${b.menit != null ? `, sekitar ${fmt(b.menit)} menit terbang` : ""}` : ""]];
  }
  const ketinggianTeks = z => { const k = z.ketinggian; if (k?.teks) return k.teks; const n = z.ketinggian_kaki ?? k?.kaki ?? (typeof k === "number" ? k : null);
    return n != null ? `sekitar ${fmt(n)} kaki (dasar awan perkiraan)` : "dasar awan tidak terbaca model"; };
  const bahanTeks = z => { const b = z.bahan; if (!b) return "belum tersedia"; if (typeof b === "string") return b;
    const u = b.inversi ? "dry ice dulu, lalu NaCl" : (b.usul || "belum tersedia"); return b.catatan ? `${u} (${b.catatan})` : u; };
  const jumlahTeks = z => { const j = z.jumlah; if (j == null) return "belum tersedia"; if (typeof j === "string") return j;
    return [j.sortie != null ? `${fmt(j.sortie)} sortie` : "", j.muatan || j.teks || (j.kg != null ? `${fmt(j.kg)} kg` : "")].filter(Boolean).join(", ") || "belum tersedia"; };
  const teramati = z => (z.tanda || []).some(x => /teramati/i.test(x));

  /* teks lintas batas */
  const namaNegara = k => NEGARA[k] || k || "negara lain";
  function asapKalimat(data) {
    if (!data?.asap) return "prakiraan asap belum tersedia";
    const l = data.asap.lintas;
    if (!l) return "belum menyeberang ke negara lain 24 jam ke depan";
    const h = l.tiba_jam ?? Math.max(0, Math.round((Date.parse(l.jam) - Date.parse(data.dibuat)) / 36e5));
    return `menyeberang ke ${namaNegara(l.negara)} sekitar ${fmt(h)} jam lagi`;
  }

  /* ringkasan teks Pos komando (ALGORITMA §11); selalu ditutup kalimat batas */
  function ringkasan(data) {
    if (!data) return "Peluang semai: prakiraan belum tersedia.\nUsulan mesin, bukan prakiraan resmi. Konfirmasi tiap operasi dengan BMKG.";
    const cl = data.cluster || [], mw = data.api?.frp_mw ?? cl.reduce((t, c) => t + (+c.frp24 || 0), 0), zs = data.zona || [];
    const out = [`Peluang semai, ${hariJam(data.dibuat)} (ECMWF ${String(new Date(data.putaran.init).getUTCHours()).padStart(2, "0")}z)`,
      `Api: ${fmt(data.api?.n_cluster ?? cl.length)} cluster besar, ${fmt(mw)} MW`];
    if (data.asap) { const kt = urutKota(data.asap.kota).tiba.slice(0, 3).filter(k => k.tiba_jam > 0);
      out.push(`Asap: ${asapKalimat(data)}${kt.length ? `; tiba ${kt.map(k => `+${k.tiba_jam} jam di ${k.nama}`).join(", ")}` : ""}`); }
    if (zs.length) { out.push("Zona usulan:");
      for (const z of zs) out.push(`- ${z.huruf} ${z.prov}, ${fmt(z.lat, 3)} ${fmt(z.lon, 3)}, ${jendela(z)}, skor ${fmt(z.skor, 2)}${z.base?.nama ? `, dari ${z.base.nama}${z.base.icao || z.base.id ? ` (${z.base.icao || z.base.id})` : ""}${z.base.menit != null ? ` sekitar ${fmt(z.base.menit)} menit` : ""}` : ""}`); }
    else out.push(kalimatKosong(data.alasan_kosong, data));
    out.push("Usulan mesin, bukan prakiraan resmi. Konfirmasi tiap operasi dengan BMKG.");
    return out.join("\n");
  }

  const api = {teramati, fmt, dms, desimal, salinKoordinat, jam, hariJam, jendela, putaranTeks, waktuLangkah, plusJam, umurJam, umurTeks, kalimatKosong, judulKosong, urutKota, sudahBerasap, barisAsal, alasan, ketinggianTeks, bahanTeks, jumlahTeks, asapKalimat, ringkasan, namaNegara, arahKata};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else akar.OpsSemaiMurni = api;
})(typeof window !== "undefined" ? window : globalThis);
