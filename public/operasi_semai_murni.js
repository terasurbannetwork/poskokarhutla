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

  /* SB-08: tujuan Karhutla | Banjir. Hash #semai (karhutla, bawaan) atau #semai/banjir. */
  const tujuanDariHash = h => /^#semai\/banjir\/?$/.test(h || "") ? "banjir" : "karhutla";
  const hashTujuan = t => t === "banjir" ? "#semai/banjir" : "#semai";
  /* lapisan yang tampak per tujuan: tujuan banjir menyembunyikan titik api, asap, angin asap, dan kota berasap (DESIGN-SYSTEM semai-banjir §2) */
  const tampakLapis = (t, tampak) => { const b = t === "banjir"; return {api: !b && !!tampak.api, asap: !b && !!tampak.asap, anginAsap: !b && !!tampak.anginAsap, kotaAsap: !b, zonaKarhutla: !b && !!tampak.zona, sasaran: b && tampak.zona !== false, awan: !!tampak.awan, pengarah: !!tampak.pengarah}; };
  /* ambil sekali lalu simpan janjinya; panggilan berikut memakai hasil yang sama (muat malas semai_banjir.json) */
  const malas = f => { let j = null; return () => (j ||= f()); };

  /* SB-09: tujuan banjir. Port JS fungsi murni semai_murni.py (faktor_h, skor, zona_nms); diuji silang tests/operasi/semai_banjir_silang.test.mjs.
     Peramban hanya menghitung ulang zona dari kandidat_sasaran saat bobot Q H P digeser (ALGORITMA semai-banjir §8); angka lain dibaca apa adanya. */
  const R_BUMI_KM = 6371.0088, BOBOT_B = [0.45, 0.4, 0.15], ZONA_B = {jarak: 40, maks: 5, ambang: 0.35};
  const haversine = (a1, o1, a2, o2) => { const r = Math.PI / 180, p1 = a1 * r, p2 = a2 * r, a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((o2 - o1) * r / 2) ** 2; return 2 * R_BUMI_KM * Math.asin(Math.sqrt(a)); };
  const faktorH = (tiba, lo = 1, pen = 3, mks = 4) => tiba == null || tiba < lo || tiba >= mks ? 0 : tiba <= pen ? 1 : mks - tiba;
  const normBobot = w => { const j = w.reduce((a, b) => a + b, 0); return j > 0 ? w.map(x => x / j) : BOBOT_B; };
  const skorBanjir = (Q, H, P, w = BOBOT_B) => (Q <= 0 || H <= 0 || P <= 0) ? 0 : Q ** w[0] * H ** w[1] * P ** w[2];
  function zonaNms(cells, minKm = ZONA_B.jarak, maks = ZONA_B.maks, ambang = ZONA_B.ambang) { const pilih = [];
    for (const c of cells.slice().sort((a, b) => b.skor - a.skor)) { if (pilih.length >= maks || c.skor < ambang) break; if (pilih.every(z => haversine(c.lat, c.lon, z.lat, z.lon) > minKm)) pilih.push(c); }
    return pilih; }
  /* K5/K6 (ALGORITMA §6), port zona_kuota di semai_murni.py: sel membawa provs (prov sasaran yang dilayani) dan kej (melayani asal kejadian). Provinsi ber-OMC dapat
     sampai kuotaMaks zona (kuota = kode prov), lalu maks zona nasional dari sisa; pada skor tampil sama (2 desimal) sel kejadian dulu. */
  const urutZona = (a, b) => (Math.round(b.skor * 100) - Math.round(a.skor * 100)) || ((b.kej ? 1 : 0) - (a.kej ? 1 : 0)) || (b.skor - a.skor);
  function zonaKuota(cells, prov = [], minKm = ZONA_B.jarak, maks = ZONA_B.maks, ambang = ZONA_B.ambang, kuotaMaks = 3) { const pilih = [], urut = cells.slice().sort(urutZona),
      jauh = c => pilih.every(z => haversine(c.lat, c.lon, z.lat, z.lon) > minKm);
    for (const p of [...prov].sort()) { let n = 0; for (const c of urut) { if (n >= kuotaMaks) break; if (c.skor >= ambang && (c.provs || []).includes(p) && jauh(c)) { pilih.push({...c, kuota: p}); n++; } } }
    let n = 0; for (const c of urut) { if (n >= maks) break; if (c.skor >= ambang && jauh(c)) { pilih.push(c); n++; } }
    return pilih.sort(urutZona); }
  /* zona dari kandidat_sasaran: skor tertinggi per sel (lat, lon), NMS 40 km, paling banyak 5, skor >= 0,35 (ALGORITMA §6); kuota provinsi ber-OMC dari d.sumber.omc_prov.
     Prov dan asal sel dari d.sasaran[sasaran_idx] atas baris kandidat yang terbawa (<= 40 per sasaran): tepi kasus bisa beda dari mesin. */
  function hitungUlangBanjir(d, w = BOBOT_B) { const k = Object.fromEntries((d?.kandidat_kolom || []).map((n, i) => [n, i])), ww = normBobot(w), sel = new Map(), ss = d?.sasaran || [];
    for (const r of d?.kandidat_sasaran || []) { const sk = skorBanjir(r[k.Q], r[k.H], r[k.P], ww), key = r[k.lat] + "," + r[k.lon], s = ss[r[k.sasaran_idx]];
      let b = sel.get(key); if (!b) sel.set(key, b = {lat: r[k.lat], lon: r[k.lon], skor: -1, provs: [], kej: false});
      if (s?.prov && !b.provs.includes(String(s.prov))) b.provs.push(String(s.prov)); if ((s?.asal || []).includes("kejadian")) b.kej = true;
      if (sk > b.skor) Object.assign(b, {skor: sk, langkah: r[k.langkah], sasaran_idx: r[k.sasaran_idx], laut: !!r[k.laut], Q: r[k.Q], H: r[k.H], P: r[k.P]}); }
    return zonaKuota([...sel.values()], d?.sumber?.omc_prov || []); }
  /* SA-23 Mulai dari target (ALGORITMA §7b): zona dari kandidat_target.target[kunci].baris, tanpa memanggil server. Port skor bawaan semai_murni.py
     (rerata geometris Q D T; gerbang g=1; baris tanda hati-hati bhy=1 dibuang) lalu NMS. Bobot dan ambang HANYA dari kandidat_target.param_skor, tanpa cadangan. */
  const targetDaftar = d => Object.entries(d?.kandidat_target?.target || {}).map(([kunci, t]) => ({kunci, nama: t.nama, prov: t.prov, nCluster: t.n_cluster, frp24: t.frp24, nBaris: (t.baris || []).length}))
    .sort((a, b) => (b.frp24 || 0) - (a.frp24 || 0) || String(a.nama).localeCompare(String(b.nama)));
  function zonaTarget(d, kunci) { const kt = d?.kandidat_target, t = kt?.target?.[kunci];
    if (!t) return {zona: [], alasan: "target_tak_ada"};
    const ps = kt.param_skor, bw = ps?.bobot; if (!bw || ![bw.q, bw.d, bw.t, ps.zona_skor_min, ps.zona_jarak_min_km, ps.zona_maks].every(Number.isFinite)) return {zona: [], alasan: "tanpa_param"};
    if (!(t.baris || []).length) return {zona: [], alasan: "tanpa_baris"};
    const k = Object.fromEntries((kt.kolom || []).map((n, i) => [n, i])), sel = new Map();
    for (const r of t.baris) { if (r[k.g] !== 1 || r[k.bhy] === 1) continue; const Q = r[k.Q], D = r[k.D], T = r[k.T];
      const sk = (Q > 0 && D > 0 && T > 0) ? Q ** bw.q * D ** bw.d * T ** bw.t : 0, key = r[k.lat] + "," + r[k.lon], b = sel.get(key);
      if (sk > 0 && (!b || sk > b.skor)) sel.set(key, {lat: r[k.lat], lon: r[k.lon], skor: sk, langkah: r[k.langkah], Q, D, T}); }
    const zona = zonaNms([...sel.values()], ps.zona_jarak_min_km, ps.zona_maks, ps.zona_skor_min).map((z, i) => ({...z, huruf: "T" + (i + 1)}));
    return {zona, alasan: zona.length ? null : "tanpa_zona"}; }
  const KOSONG_T = {tanpa_param: "Parameter skor belum tersedia di data putaran ini.", target_tak_ada: "Target ini tidak ada di putaran ini.", tanpa_baris: "Belum ada sel awan yang bisa dinilai di sekitar target ini pada putaran ini.", tanpa_zona: "Tidak ada sel awan yang mencapai skor 0,35 untuk target ini pada putaran ini."};
  const kosongTarget = a => KOSONG_T[a] || KOSONG_T.tanpa_zona;
  const ASAL = {prakiraan: "prakiraan kita", bmkg: "BMKG", tetap: "daftar tetap", manual: "Pusdalops", kejadian: "kejadian berjalan"};
  const asalTeks = a => ASAL[a] || a;
  const pantau = s => !!s.pantau || s.tenggang > 1;
  const KOSONG_B = {tidak_ada_sasaran: "Tidak ada sasaran banjir untuk {d} dari prakiraan kita, BMKG, daftar tetap, atau Pusdalops.", angin_lemah: "Angin pengarah di sasaran terlalu lemah untuk mencegat awan dari hulu.",
    tidak_ada_awan_hulu: "Tidak ada awan layak semai di hulu sasaran dalam 24 jam ke depan. Hujan sasaran bisa tumbuh di tempat.", tanpa_prakiraan: "Prakiraan belum tersedia.",
    semua_pantau: "Semua sasaran banjir untuk {d} baru jatuh di hari yang belum tercakup putaran ini; zona menyusul di putaran berikutnya.", di_luar_kisi: "Sasaran berada di luar kisi angin putaran ini, jadi lintasan hulu tidak bisa dihitung."};
  const kalimatKosongB = (a, d) => (KOSONG_B[a] || KOSONG_B.tidak_ada_awan_hulu).replace("{d}", d || "hari itu");
  const judulKosongB = a => ({tidak_ada_sasaran: "tidak ada sasaran banjir", angin_lemah: "angin pengarah lemah", tanpa_prakiraan: "prakiraan belum tersedia", semua_pantau: "semua sasaran masih pantau", di_luar_kisi: "sasaran di luar kisi angin"})[a] || "tidak ada awan layak semai di hulu";
  /* alasan C, H, P, B zona banjir: teks sudah disusun mesin di zona.alasan (ALGORITMA §5) */
  const alasanB = z => [["C", "Awan", z.alasan?.C], ["H", "Lepas sebelum sasaran", z.alasan?.H], ["P", "Paparan", z.alasan?.P], ["B", "Base", z.alasan?.B]];
  /* ringkasan teks Pos komando tujuan banjir (DESIGN-SYSTEM semai-banjir §5), ditutup kalimat batas */
  function ringkasanBanjir(data, manual = []) {
    if (!data || data.galat) return "Peluang semai (banjir): prakiraan belum tersedia.\nUsulan mesin, bukan prakiraan resmi. Konfirmasi tiap operasi dengan BMKG.";
    const ss = (data.sasaran || []).map(s => `${String(s.nama || s.kab).replace(/^(Kota Administrasi|Kabupaten|Kota|Kab\.)\s+/, "")} (${(s.asal || []).map(asalTeks).join(", ")})`), zs = data.zona || [];
    const out = [`Peluang semai (banjir), ${hariJam(data.dibuat)} (ECMWF ${String(new Date(data.putaran.init).getUTCHours()).padStart(2, "0")}z)`, `Sasaran: ${ss.length ? ss.join(", ") : "belum ada"}${manual.length ? `; Pusdalops menambah ${manual.length}, dihitung di putaran berikutnya` : ""}`];
    if (zs.length) for (const z of zs) { const t = z.cegat?.[0]?.tiba_jam, b = z.base;
      out.push(`- B${z.huruf} ${z.kota || z.prov}, ${jendela(z)}, skor ${fmt(z.skor, 2)}${t != null ? `, tiba di sasaran sekitar ${fmt(t, 1)} jam` : ""}${b?.nama ? `, dari ${b.nama}${b.icao ? ` (${b.icao})` : ""}${b.menit != null ? ` sekitar ${fmt(b.menit)} menit` : ""}` : ""}`); }
    else out.push(data.kalimat_kosong || kalimatKosongB(data.alasan_kosong, data.hari_sasaran));
    out.push("Usulan mesin, bukan prakiraan resmi. Konfirmasi tiap operasi dengan BMKG.");
    return out.join("\n"); }
  /* SB-15: kartu Rapor uji. Berkas rapor_banjir.json dibaca apa adanya; kosong tidak pernah jadi 0 persen. */
  const VONIS = {sejalan: "sejalan", tak_terbedakan: "tak terbedakan", berlawanan: "berlawanan", data_kurang: "data kurang"};
  function baris(nama, l) { const v = VONIS[l?.vonis] ? l.vonis : "data_kurang", ada = v !== "data_kurang" && l && l.n > 0 && l.efek != null && Number.isFinite(+l.efek);
    if (!ada) return `<div class="sm-rp"><b>${nama}</b><span class="sm-pv sm-pv-data_kurang">data kurang</span><span class="sm-kecil">data kurang (n = ${fmt(l?.n || 0)} dari sekitar ${fmt(l?.n_perlu || 250)})</span></div>`;
    const ci = Array.isArray(l.ci95) && l.ci95.length === 2 ? `, selang 95% ${fmt(l.ci95[0], 1)} sampai ${fmt(l.ci95[1], 1)}%` : "", md = l.mde != null && Number.isFinite(+l.mde) ? `, MDE ${fmt(l.mde, 0)}%` : "";
    return `<div class="sm-rp"><b>${nama}</b><span class="sm-pv sm-pv-${v}">${VONIS[v]}</span><span>n = ${fmt(l.n)}, efek ${fmt(l.efek, 1)}%${ci}${md}</span></div>`; }
  const raporHtml = r => { const o = r && !r.galat ? r : null;
    return baris("Lapis A", o?.lapis_a) + baris("Lapis B", o?.lapis_b) + `<p class="sm-kecil">kesesuaian, bukan sebab-akibat</p>`; };
  /* tabel faktor Tinjau sebagai CSV: tanda kutip dikutip ganda, pemisah koma */
  const csv = baris => baris.map(r => r.map(x => { const t = String(x ?? ""); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }).join(",")).join("\n");
  const api = {targetDaftar, zonaTarget, kosongTarget, raporHtml, faktorH, skorBanjir, zonaNms, zonaKuota, hitungUlangBanjir, normBobot, BOBOT_B, asalTeks, pantau, kalimatKosongB, judulKosongB, alasanB, ringkasanBanjir, csv, tujuanDariHash, hashTujuan, tampakLapis, malas, teramati, fmt, dms, desimal, salinKoordinat, jam, hariJam, jendela, putaranTeks, waktuLangkah, plusJam, umurJam, umurTeks, kalimatKosong, judulKosong, urutKota, sudahBerasap, barisAsal, alasan, ketinggianTeks, bahanTeks, jumlahTeks, asapKalimat, ringkasan, namaNegara, arahKata};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else akar.OpsSemaiMurni = api;
})(typeof window !== "undefined" ? window : globalThis);
