/* Kemitraan Kampus, tampilan Daerah (KM-B06): saring + grid kartu .km-daerah (paginasi 24) + lembar profil .ak-sheet bab 1-7 dan 9.
   Data: ringkas.json di awal (514 baris, 1 kali), daerah/<kab4>.json saat lembar dibuka (memo). Semua teks dari data lewat esc() sebelum innerHTML.
   Kartu dirender 24 per halaman, cari didebounce 250 ms, tab bab dirender sekali per klik: klik tidak membangun ulang 514 kartu. */
(() => {
  "use strict";
  const KM = window.KM, IK = KM.IK, {$, esc, fmt, ikon, tabelHtml, navHal, kosongHtml, htmlPilih, pasangPilih, grafik, urlOk, LUAR} = KM;
  const PER = 24, TIDAK = "Tidak ada data untuk wilayah ini";
  const slug = k => String(k ?? "").toLowerCase().replace(/\s+/g, "-");
  /* angka tampil lewat KM.hitung.idn (setengah-genap, sama dengan Python); maks m desimal, nol di ujung dibuang */
  const nf = (n, m = 1) => { const s = KM.hitung.idn(n, m); return s.includes(",") ? s.replace(/,?0+$/, "") : s; };
  /* bahaya IRBI -> [label, rumpun untuk ikon dan warna] (konst.py RUMPUN_BAHAYA, tampilan saja) */
  const BH = {banjir: ["Banjir", "banjir"], longsor: ["Tanah longsor", "longsor"], gempa: ["Gempa bumi", "gempa"], tsunami: ["Tsunami", "tsunami"], gunungapi: ["Gunung api", "gunung api"],
    kekeringan: ["Kekeringan", "kekeringan"], karhutla: ["Karhutla", "karhutla"], cuaca_ekstrem: ["Cuaca ekstrem", "hidrometeorologi"], abrasi_rob: ["Abrasi dan rob", "pesisir"], udara: ["Udara", "udara"], multi: ["Multi bahaya", "multi"]};
  const bh = k => Object.hasOwn(BH, k) ? BH[k] : null;   // k bisa datang dari URL atau data: jangan baca prototipe (constructor, __proto__)
  const bl = k => k == null ? "–" : (bh(k) || [String(k).replace(/_/g, " ")])[0];
  const ikB = k => { const rk = (bh(k) || [])[1], p = ((KM.RUMPUN[rk] || KM.EXTRA[rk]) || [])[1] || ""; return p ? ikon(p, rk) : ""; };
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = v => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? "")); return m ? `${+m[3]} ${BLN[+m[2] - 1]} ${m[1]}` : String(v ?? "–"); };   // 2026-10-28 -> 28 Okt 2026
  const IK_PIN = IK.daerah;

  let R = null, PROV = {}, ST = {q: "", prov: "", i: null, b: "", p1: false, hal: 1};
  const memo = new Map();
  const muat = k => { if (!/^\d{4}$/.test(String(k))) return Promise.resolve(null); if (!memo.has(k)) memo.set(k, fetch(`/data/kemitraan/daerah/${k}.json`, {credentials: "same-origin"}).then(r => r.ok ? r.json() : null).catch(() => null).then(d => { if (!d) memo.delete(k); return d; })); return memo.get(k); };
  const baris = k => R?.find(r => r.k === k);

  /* pita 4 angka: dua yang ada di data; tervalidasi dan kunjungan menunggu API (null = en dash, bukan nol) */
  const dinilai = () => R ? R.filter(r => r.m) : [];   // m null = tak dinilai (bukan 0)
  const angka = () => [[IK.daerah, R ? R.length : null, "Kab/kota berprofil"], [IK.masalah, dinilai().length ? dinilai().reduce((a, r) => a + r.m[0], 0) : null, `Masalah P1 otomatis, belum divalidasi (${dinilai().length} kab dinilai)`], [IK.cek, null, "Tervalidasi"], [IK.waktu, null, "Kunjungan bulan ini"]];

  /* ---------- sorot grafik (tooltip), disalin dari akademisi.js:234 karena IIFE-nya tak bisa diimpor; sekali untuk semua tampilan ---------- */
  if (!KM.sorotGrafik) {
    KM.sorotGrafik = e => {
      const r = e.target.closest?.(".ak-gr-hit"), fig = e.target.closest?.(".ak-grafik");
      if (!fig) return;
      const tip = fig.querySelector(".ak-gr-tip");
      if (!r) { fig._i = null; fig.classList.remove("aktif"); tip.hidden = true; return; }
      const i = +r.dataset.i; if (fig._i === i) return;   // bar sama: tanpa kerja ulang
      fig._i = i;
      const seri = fig._seri || (fig._seri = JSON.parse(fig.dataset.seri)), [th, v, x, y] = seri[i];
      const svg = fig.querySelector("svg").getBoundingClientRect(), fb = fig.getBoundingClientRect(), k = svg.width / +fig.dataset.w;   // baca layout dulu
      const bantu = fig.querySelector(".ak-gr-bantu"), sorot = fig.querySelector(".ak-gr-sorot");
      bantu.setAttribute("x1", x); bantu.setAttribute("x2", x); sorot.setAttribute("cx", x); sorot.setAttribute("cy", y);
      tip.innerHTML = `<b>${esc(th)}</b><span>${esc(nf(v))}</span>`; tip.hidden = false; fig.classList.add("aktif");
      requestAnimationFrame(() => { if (fig._i !== i) return; const tw = tip.offsetWidth, tt = tip.offsetHeight; tip.style.left = Math.min(Math.max(svg.left - fb.left + x * k - tw / 2, 6), fb.width - tw - 6) + "px"; tip.style.top = (svg.top - fb.top + y * k - tt - 14) + "px"; });
    };
    /* tooltip peta/atribut data-tt (#kmTip, teks lewat textContent) */
    KM.tipData = e => {
      const tip = $("kmTip"), el = e.target.closest?.("[data-tt]");
      if (!el) { if (tip._dt) { tip._dt = null; tip.hidden = true; } return; }
      if (tip._dt !== el) { tip._dt = el; tip.textContent = el.dataset.tt; tip.hidden = false; }
      tip.style.left = Math.max(6, Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 6)) + "px"; tip.style.top = Math.max(6, e.clientY - tip.offsetHeight - 12) + "px";
    };
    /* satu pendengar pointermove untuk semua tampilan, dibatasi satu kali kerja per bingkai (INP) */
    let pe = null, pr = 0;
    document.addEventListener("pointermove", e => { pe = e; if (pr) return; pr = requestAnimationFrame(() => { pr = 0; if (pe.target.closest?.(".ak-grafik")) KM.sorotGrafik(pe); KM.tipData(pe); }); });
    document.addEventListener("pointerout", e => { const f = e.target.closest?.(".ak-grafik"); if (f && !f.contains(e.relatedTarget)) KM.sorotGrafik({target: f}); });
  }

  /* ---------- kartu ---------- */
  const irbi = r => r.i === 1 ? '<em class="km-l-irbi t1">IRBI 2025 Tinggi</em>' : r.i === 0 ? '<em class="km-l-irbi t0">IRBI 2025 Sedang</em>' : '<em class="km-l-irbi tx">IRBI tanpa data</em>';
  const metrik = a => `<div class="ak-metrik">${a.map(([l, d, v, t, kecil]) => `<div title="${esc(t || l)}"><span class="ak-mlabel">${ikon(d, "")}${esc(l)}</span><b>${esc(v)}</b>${kecil ? `<small class="km-oto">${esc(kecil)}</small>` : ""}</div>`).join("")}</div>`;
  const metrikR = r => metrik([["Masalah P1", IK.masalah, r.m ? nf(r.m[0], 0) : "–", "Masalah otomatis kelas P1, belum divalidasi BPBD; – = belum dinilai", "otomatis, belum divalidasi"], ["Kejadian 2015–2024", IK.waktu, nf(r.j, 0), "Jumlah kejadian semua jenis 2015–2024; – = tidak tercatat"], ["Kapasitas", IK.cek, r.c == null ? "–" : r.c + "/5", "Butir kapasitas tercatat dari 5"]]);
  const kartu = r => `<div class="ak-orang km-daerah" role="button" tabindex="0" data-kab="${esc(r.k)}" aria-label="Buka profil ${esc(r.n)}"><span class="ak-atas"><span class="ak-nama"><h3>${esc(r.n)}</h3><span class="ak-lencana" title="${r.y === "estimasi-model" ? "Skor kemungkinan nilai provinsi" : ""}">${irbi(r)}</span></span><a class="km-ik" href="/kemitraan/buku?kab=${encodeURIComponent(r.k)}" data-buku="${esc(r.k)}" aria-label="Buku profil ${esc(r.n)}" title="Buku profil">${ikon(IK.buku, "")}</a></span>
    <span class="ak-kartu-label"><span class="ak-prodi">${esc(PROV[r.p] || r.p)}</span></span>
    <span class="ak-pil">${(r.b || []).map(([k]) => `<button type="button" class="ak-r utama${(bh(k) ? " km-w-" + slug(bh(k)[1]) : "")}" data-fk="b" data-v="${esc(k)}">${ikB(k)}${esc(bl(k))}</button>`).join("")}</span>${metrikR(r)}</div>`;

  /* ---------- saring ---------- */
  const lolos = r => (!ST.q || r.n.toLowerCase().includes(ST.q)) && (!ST.prov || r.p === ST.prov) && (ST.i == null || r.i === ST.i) && (!ST.b || (r.b || []).some(x => x[0] === ST.b)) && (!ST.p1 || (r.m && r.m[0] > 0));
  const chipHtml = (fk, v, label, n, ik, ditekan) => `<button type="button" data-fk="${fk}" data-v="${esc(v)}" aria-pressed="${ditekan}">${ik || ""}${esc(label)}<span>${esc(fmt(n))}</span></button>`;
  const urlSinkron = () => { const u = new URL(location.href); for (const [k, v] of [["q", ST.q], ["prov", ST.prov], ["b", ST.b]]) v ? u.searchParams.set(k, v) : u.searchParams.delete(k); history.replaceState(null, "", u); };
  /* INP: status tombol (aria) dan judul berubah seketika; kartu, navigasi halaman, dan URL digambar di bingkai berikutnya, klik beruntun hanya menggambar yang terakhir */
  let tkS = 0;
  function segar() {
    const hasil = R.filter(lolos), nHal = Math.max(1, Math.ceil(hasil.length / PER)), tk = ++tkS; ST.hal = Math.min(Math.max(1, ST.hal), nHal);
    document.querySelectorAll("#kmv-daerah .ak-chip button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.fk === "i" ? String(ST.i ?? "") === b.dataset.v : (ST.b || "") === b.dataset.v)));
    $("kmDP1").setAttribute("aria-pressed", String(ST.p1));
    document.querySelectorAll("#kmDHal button[data-h]:not(.ak-hal-arah)").forEach(b => +b.dataset.h === ST.hal ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    $("kmDJudul").innerHTML = `<b>${esc(fmt(hasil.length))}</b> dari ${esc(fmt(R.length))} kab/kota${ST.p1 ? ", punya masalah P1" : ""}${ST.b ? ", bahaya " + esc(bl(ST.b).toLowerCase()) : ""}`;
    KM.nanti(() => {
      if (tk !== tkS) return;
      $("kmDList").innerHTML = hasil.length ? hasil.slice((ST.hal - 1) * PER, ST.hal * PER).map(kartu).join("") : kosongHtml("Tidak ada kab/kota yang cocok", "Ubah kata cari atau lepas satu saringan.");
      $("kmDHal").innerHTML = navHal(ST.hal, hasil.length, PER, "kab/kota"); urlSinkron();
    });
  }

  function bangunSaring(el) {
    const cnt = f => R.filter(f).length, bhs = {}; for (const r of R) for (const [k] of r.b || []) bhs[k] = (bhs[k] || 0) + 1;
    const nP1 = cnt(r => r.m && r.m[0] > 0), semuaIk = '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
    const provHtml = htmlPilih("kmDProv", IK_PIN, "Cari provinsi");
    const kelasHtml = chipHtml("i", "", "Semua kelas", R.length, ikon(semuaIk, ""), true) + chipHtml("i", "1", "IRBI 2025 Tinggi", cnt(r => r.i === 1), ikon(IK.masalah, "p1"), false) + chipHtml("i", "0", "IRBI 2025 Sedang", cnt(r => r.i === 0), ikon(IK.cek, "p3"), false);
    const bahayaHtml = chipHtml("b", "", "Semua bahaya", R.length, ikon(semuaIk, ""), true) + Object.entries(bhs).sort((a, b) => b[1] - a[1]).map(([k, n]) => chipHtml("b", k, bl(k), n, ikB(k), false)).join("");
    el.innerHTML = `<div class="ak-saring"><div class="ak-alat"><label class="ak-cari"><span class="sr">Cari kab/kota</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="kmDQ" type="search" autocomplete="off" placeholder="Cari kab/kota" value="${esc(ST.q)}"></label></div>
      <div class="ak-baris">${provHtml}<button type="button" class="ak-tog km-tog" id="kmDP1" aria-pressed="false">${ikon(IK.masalah, "")}Ada masalah P1<small>${esc(fmt(nP1))}</small></button></div>
      <div class="ak-chip km-chip3" role="group" aria-label="Kelas IRBI">${kelasHtml}</div>
      <div class="ak-chip" role="group" aria-label="Bahaya teratas">${bahayaHtml}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="kmDJudul"></h2><div class="ak-daftar" id="kmDList"></div><nav class="ak-hal" id="kmDHal" aria-label="Halaman daftar daerah" aria-live="polite"></nav></div>`;
    const provN = {}; for (const r of R) provN[r.p] = (provN[r.p] || 0) + 1;
    pasangPilih("kmDProv", {opsi: () => Object.keys(provN).map(p => [p, PROV[p] || p, provN[p]]).sort((a, b) => a[1].localeCompare(b[1], "id")), nilai: () => ST.prov, semua: "Semua provinsi", pilih: v => { ST.prov = v; ST.hal = 1; segar(); }});
    let t = 0; $("kmDQ").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => { ST.q = e.target.value.trim().toLowerCase(); ST.hal = 1; segar(); }, 250); });
    el.addEventListener("click", e => {
      const lst = e.target.closest("#kmDList"), hal = e.target.closest("#kmDHal button[data-h]"), c = e.target.closest(".ak-chip button, .ak-orang button[data-fk]"), tg = e.target.closest("#kmDP1");
      if (hal) { ST.hal = +hal.dataset.h; segar(); requestAnimationFrame(() => $("kmDJudul").scrollIntoView({block: "start"})); return; }
      if (tg) { ST.p1 = !ST.p1; ST.hal = 1; segar(); return; }
      if (c) { if (c.dataset.fk === "i") ST.i = c.dataset.v === "" ? null : +c.dataset.v; else ST.b = c.dataset.v; ST.hal = 1; segar(); return; }
      const k = e.target.closest(".km-daerah");
      if (lst && k && !e.target.closest("a")) buka(k.dataset.kab);
    });
    el.addEventListener("keydown", e => { const k = e.target.closest?.(".km-daerah"); if (k && e.target === k && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); buka(k.dataset.kab); } });
  }

  /* ---------- lembar profil ---------- */
  const E = (n, m) => esc(typeof n === "number" || /^-?\d/.test(String(n ?? "")) ? nf(n, m) : (n ?? "–"));
  const TA = {"snapshot-repo": "salinan repo, bukan tanggal terbit sumber", "akhir-tahun-data": "akhir tahun data"};
  const tip = b => b ? `Sumber: ${b.sumber || "–"}, per ${b.tanggal ? tgl(b.tanggal) : "–"}${b.tanggal_arti ? " (" + (TA[b.tanggal_arti] || b.tanggal_arti) + ")" : ""}, keyakinan ${b.yakin || "–"}` : "";
  const YK = {"estimasi-model": "Estimasi model", "asumsi-kebijakan": "Asumsi kebijakan"};
  const pilY = b => b && YK[b.yakin] ? `<em class="ak-pl">${YK[b.yakin]}</em>` : "";
  const pilB = (yb, k) => pilY({yakin: yb?.[k]});   // keyakinan per baris (yakin_bagian): hanya yang estimasi atau asumsi berpil
  /* judul bagian = kalimat temuan; sumber dan tanggal di title (tanpa kaki sumber) */
  const bag = (judul, isi, b) => `<section class="ak-dbagian"><div class="ak-disi"><h3 class="km-t" title="${esc(tip(b))}">${esc(judul)}${pilY(b)}</h3>${isi}</div></section>`;
  const tanpa = n => bag(`Data ${n} belum tersedia`, `<p class="km-kosong">${TIDAK}</p>`);
  const kv = rows => `<dl class="km-kv">${rows.map(([a, v]) => `<div><dt>${esc(a)}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
  const bar = (label, v, mx, rk, txt) => `<div class="ak-br${bh(rk) ? " km-w-" + slug(bh(rk)[1]) : ""}" tabindex="0"><span class="ak-bl">${esc(label)}</span><span class="ak-bt"><i data-w="${mx > 0 ? Math.max(3, Math.round(v / mx * 100)) : 0}"></i></span><span class="ak-bv"><b>${esc(txt)}</b></span></div>`;
  const th = n => nf(n, 0);
  /* skor 0-1 dua desimal; dalam 0,005 dari ambang kelas (P1/P2) atau ambang pembuatan masalah tampil tiga desimal supaya "0,50" tidak tampak lolos ambang 0,5. Satu aturan untuk lembar dan buku */
  const sk = v => { const K = window.KM_KONST, t = K ? [K.KELAS.P1_S, K.KELAS.P2_S, K.MASALAH.S_MIN] : []; return v != null && t.some(a => Math.abs(v - a) < 0.005 && v !== a) ? nf(v, 3) : nf(v, 2); };
  const jd = (ok, judul, tak) => ok ? judul : tak;   // judul temuan hanya bila angkanya ada
  /* pil uji balik dari vonis model.uji (global, sama untuk semua kab): "Uji balik nasional: gagal"; tanpa vonis = Belum diuji */
  /* satu sumber vonis: KM.hitung.statusModel + UJI_BAHAYA (hitung.js); bahaya tanpa uji balik = null, tidak ditampilkan */
  const ujiTeks = (uji, b) => { const s = KM.hitung.statusModel({model: {uji}}, b); return s ? s.replace(" uji balik nasional", "") : null; };
  const ujiPil = (uji, b) => { const v = ujiTeks(uji, b); return v ? `<em class="ak-pl" title="Vonis uji balik model nasional, bukan hasil per kab">Uji balik nasional: ${esc(v)}</em>` : ""; };
  const TREN = {naik: "naik", turun: "turun", datar: "datar", jarang: "jarang (kurang dari 3 tahun berkejadian)"};
  const JK = {banjir: "Banjir", cuaca: "Cuaca ekstrem", gelombang: "Gelombang ekstrem", kering: "Kekeringan", longsor: "Tanah longsor", rob: "Rob", semua: "Semua jenis"};
  const seriKj = (kj, j) => (kj?.tahunan?.[j] || []).filter(([t]) => t >= 2015 && t <= 2025 && !(t === 2024 && j !== "semua"));   // 2024 jenis DIBI = nol buatan (tahunan_arti)

  /* nilai bukti tampil bila belum tertulis di teks (mis. "mengungsi: 3.326"); nilai teks (vonis) tidak diulang */
  const buktiNilai = x => typeof x.nilai === "number" && Number.isFinite(x.nilai) && !String(x.teks ?? "").includes(nf(x.nilai)) ? `: ${esc(nf(x.nilai))}` : "";
  const BAB = {
    1(d, r) {
      const w = d.wilayah, p = d.penduduk, s = d.sosek;
      return bag(`Letak ${d.nama} di ${PROV[d.prov] || "provinsinya"}`, '<div id="kmPeta" class="km-peta"><div class="ak-hantu"></div></div><p class="km-peta-ket"><span><i class="l3"></i>IRBI 2025 Tinggi</span><span><i class="l1"></i>IRBI 2025 Sedang</span><span><i class="l0"></i>Tanpa data IRBI</span><span>Garis biru tebal: kab/kota ini</span></p>')
        + (w ? bag(jd(w.luas_km2 != null, `Luas ${nf(w.luas_km2)} km², ${th(w.n_kec)} kecamatan, ${th(w.n_desa)} desa dan kelurahan`, "Data luas wilayah belum tersedia"), kv([["Luas (km²)", E(w.luas_km2)], ["Kecamatan", E(w.n_kec)], ["Desa dan kelurahan", E(w.n_desa)], ["Kecamatan pesisir", E(w.pesisir_kec)], ["Wilayah di elevasi 5 m atau lebih rendah (%)", E(w.pct_le5m)], ["Wilayah di elevasi 10 m atau lebih rendah (%)", E(w.pct_le10m)], ["Jarak ke pantai (km)", E(w.jarak_pantai_200m_km)]]), w) : tanpa("luas dan pembagian wilayah"))
        + (p ? bag(jd(p.total != null, `${th(p.total)} penduduk, ${nf(p.per_km2, 0)} jiwa per km²`, "Data jumlah penduduk belum tersedia"), kv([["Penduduk", E(p.total)], ["Balita (0–5 tahun)", E(p.balita)], ["Lansia (60 tahun ke atas)", E(p.lansia)], ["Perempuan", E(p.wanita)], ["Kepadatan (jiwa per km²)", E(p.per_km2)]]), p) : tanpa("penduduk"))
        + (s ? bag(jd(s.p0 != null && s.ipm != null, `Penduduk miskin ${nf(s.p0)} persen, IPM ${nf(s.ipm, 2)}`, "Data kemiskinan dan IPM belum lengkap"), kv([["Penduduk miskin (%)", E(s.p0)], ["Penduduk miskin (ribu jiwa)", E(s.miskin_ribu)], ["IPM", E(s.ipm, 2)], ["Rumah tangga air layak (%)", E(s.air_layak)], ["Sanitasi layak (%)", E(s.sanitasi_layak)], ["Hunian layak (%)", E(s.hunian_layak)]]) + grafik(s.tren_p0 || [], "Persentase penduduk miskin per tahun", "", {satuan: "persen"}), s) : tanpa("kemiskinan dan kesejahteraan"));
    },
    2(d, r) {
      const ir = d.irbi; if (!ir || !ir.seri?.length) return tanpa("indeks risiko bencana (IRBI)");
      const [t, skor, kls, amb] = ir.seri[ir.seri.length - 1], bh = Object.entries(ir.bahaya || {}).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]), mx = bh.length ? bh[0][1] : 0;
      /* skala IRBI berubah di 2025 (ambang Tinggi 144 -> 176): dua grafik, bukan satu garis menerus */
      const lama = ir.seri.filter(x => x[3] !== amb), baru = ir.seri.filter(x => x[3] === amb), gr = (s, j) => grafik(s.map(x => [x[0], x[1]]), j, "", {satuan: "skor"});
      const grafs = lama.length ? gr(lama, `Skor IRBI ${lama[0][0]}–${lama[lama.length - 1][0]}, skala lama (ambang Tinggi ${nf(lama[0][3], 0)})`) + (baru.length ? gr(baru, `Skor IRBI ${baru[0][0] === t ? t : baru[0][0] + "–" + t}, skala baru (ambang Tinggi ${nf(amb, 0)})`) : "") : gr(baru, `Skor IRBI ${baru[0][0]}–${t}, ambang Tinggi ${nf(amb, 0)}`);
      return bag(jd(skor != null, `Skor IRBI ${t} ${nf(skor)}${lama.length ? " (skala baru)" : ""}, ${kls === 1 ? "masuk kelas Tinggi" : "di bawah kelas Tinggi"} (ambang ${nf(amb, 0)})`, "Skor IRBI terbaru belum tersedia"), grafs + `<p>${esc(ir.skala || "")}</p>${r?.y === "estimasi-model" ? '<p class="km-kosong">Skor kab ini sama dengan beberapa kab lain di provinsinya, jadi mungkin nilai provinsi.</p>' : ""}`, ir)
        + (bh.length ? bag(`Bahaya tertinggi: ${bl(bh[0][0]).toLowerCase()}, skor ${nf(bh[0][1])}`, `<div class="ak-bars">${bh.map(([k, v]) => bar(bl(k), v, mx, k, nf(v) + " skor")).join("")}</div>`, ir) : tanpa("skor per bahaya"));
    },
    3(d) {
      const ms = d.masalah_skor || {}, ik = d.inarisk_kec || {}, kj = d.kejadian || {}, uji = d.model?.uji || {};
      const IKK = {banjir: "banjir", longsor: "longsor", gempa: "gempa", gunungapi: "gunungapi", kekeringan: "kekeringan", karhutla: "karhutla", cuaca_ekstrem: "cuaca", abrasi_rob: "gelombang"};
      const KJK = {banjir: "banjir", longsor: "longsor", cuaca_ekstrem: "cuaca", abrasi_rob: "rob", kekeringan: "kering"};
      const lis = Object.entries(ms).filter(([, v]) => v && v.skor != null).sort((a, b) => b[1].skor - a[1].skor).map(([k]) => k); if (d.udara) lis.push("udara");
      if (!lis.length) return tanpa("skor bahaya");
      return lis.map((k, n) => {
        const m = ms[k], i = ik[IKK[k]], kk = KJK[k], rows = [];
        if (m) rows.push(["Skor masalah (0–1)", `${esc(sk(m.skor))}, kelas ${esc(m.kelas || "–")}`]);
        if (i) rows.push(["Kecamatan InaRISK tinggi, sedang", `${E(i.tinggi, 0)}, ${E(i.sedang, 0)}`]);
        if (kk) rows.push(["Kejadian 2015–2025, tanpa 2024", E(kj.total_2015_2025?.[kk], 0)], ["Tren kejadian", esc(TREN[kj.tren?.[kk]] || "–")]);
        if (ujiTeks(uji, k)) rows.push(["Uji balik nasional", esc(ujiTeks(uji, k))]);
        const g = d.gempa, kr = d.karhutla, ke = d.kekeringan, ga = d.gunungapi, ps = d.pesisir, ud = d.udara;
        const tp = kr?.titik_tahun_parsial || {}, vi = (kr?.titik_tahun || []).filter(([t]) => t !== tp.tahun_belum_lengkap && t !== tp.viirs_tahun_sebagian), pk = vi.length ? vi.reduce((a, b) => b[1] > a[1] ? b : a) : null;   // seri sama dengan grafik: tahun sebagian dan belum lengkap dibuang
        if (k === "gempa" && g) { const yb = g.yakin_bagian; rows.push(["Gempa M5 atau lebih sejak 1900", E(g.n_m5_1900, 0) + pilB(yb, "katalog")], ["Magnitudo terbesar", E(g.m_maks) + pilB(yb, "katalog")], ["Kelas risiko", esc(g.risiko_kelas || "–") + pilB(yb, "risiko")]); }
        if (k === "karhutla" && kr) { const yb = kr.yakin_bagian; rows.push(["Gambut (ha, dibulatkan ke 1.000 ha)", E(kr.gambut_ha, 0) + pilB(yb, "gambut")], ["Titik panas El Nino dibanding tahun biasa (kali; 1 = normal)", E(kr.rasio_elnino)], ["Puncak titik panas VIIRS", (pk ? `${esc(pk[0])}, ${E(pk[1], 0)} titik` : "–") + pilB(yb, "titik_panas")]); }
        if (k === "kekeringan" && ke) rows.push(["Tingkat kini", esc(ke.level_label || "–")], ["SPI 3 bulan", E(ke.spi3, 2)], ["Bulan siaga atau lebih", E(ke.riwayat?.bulan_siaga, 0)]);
        if (k === "abrasi_rob" && ps) rows.push(["Abrasi (m per tahun)", E(ps.abrasi_m_th)], ["Transek", E(ps.transek_n, 0)]);
        if (k === "udara" && ud) rows.push([`PM2,5 provinsi, rerata ${nf(ud.n_hari, 0)} hari (µg/m³)`, E(ud.pm25_rerata) + '<em class="ak-pl">Estimasi model</em>'], ["Hari PM2,5 provinsi di atas 55,4 µg/m³ (hari)", E(ud.hari_rerata_di_atas_55_4, 0) + pilY(ud)]);
        const musim = kj.musim?.[kk], mm = musim ? Math.max(...musim) : 0;
        const tanpaTh = [tp.viirs_tahun_sebagian, tp.tahun_belum_lengkap].filter(Boolean).join(" dan "), tab = k === "karhutla" && kr ? grafik(vi, `Titik panas VIIRS per tahun${tanpaTh ? ", tanpa " + tanpaTh + " (tahun belum penuh)" : ""}`, "karhutla", {satuan: "titik"}) : kk ? grafik(seriKj(kj, kk), "Kejadian per tahun, tanpa 2024 (DIBI 2024 tak lengkap)", bh(k)?.[1] || k, {satuan: "kejadian"}) : "";
        const kec = i?.teratas?.length ? tabelHtml([["Kecamatan"], ["Indeks", "r"]], i.teratas.map(([a, v]) => [esc(a), nf(v, 2)])) : "";
        const jw = /(\d{4}-\d{2}-\d{2}) s\.d\. (\d{4}-\d{2}-\d{2})/.exec(kj.musim_arti || ""), mus = mm > 0 ? `<p class="km-ket">Kejadian per bulan kalender${jw ? ", " + esc(tgl(jw[1])) + " sampai " + esc(tgl(jw[2])) : ""}</p><div class="ak-bars">${musim.map((v, j) => bar(BLN[j], v, mm, k, nf(v, 0))).join("")}</div>` : "";
        const gunung = k === "gunungapi" && ga?.daftar?.length ? tabelHtml([["Gunung"], ["Jarak (km)", "r"], ["Jiwa di KRB III", "r"]], ga.daftar.map(x => [esc(x.gunung), nf(x.jarak_km), nf(x.krb3_jiwa_gunung ?? x.krb3_jiwa, 0)])) : "";
        return `<details class="ak-dbagian km-bahaya"${n === 0 ? " open" : ""}><summary>${ikB(k)}<h3>${esc(bl(k))}</h3>${m?.kelas ? `<em class="km-kelas km-w-${esc(m.kelas.toLowerCase())}">${esc(m.kelas)}</em>` : ""}</summary><div class="ak-disi">${rows.length ? kv(rows) : `<p class="km-kosong">${TIDAK}</p>`}${tab}${mus}${kec}${gunung}</div></details>`;
      }).join("");
    },
    4(d) {
      const kj = d.kejadian; if (!kj) return tanpa("riwayat kejadian");
      const tot = kj.total_2015_2025 || {}, dm = kj.dampak_12bln;
      const rs = kj.tren_rentang?.semua, lbl = rs ? `${rs[0]}–${rs[1]}` : "2015–2025";   // rentang 'semua' dari data (seri CKAN berakhir 2024, lihat total_arti)
      const jenis = tabelHtml([["Jenis"], ["Rentang tahun"], ["Kejadian", "r"], ["Tren"]], Object.keys(JK).filter(j => tot[j] != null).map(j => [esc(JK[j]), j === "semua" ? esc(lbl) : "2015–2025, tanpa 2024", nf(tot[j], 0), esc(TREN[kj.tren?.[j]] || "–")]));
      return bag(jd(tot.semua != null, `${th(tot.semua)} kejadian tercatat ${lbl}`, "Jumlah kejadian belum tersedia"), grafik(seriKj(kj, "semua"), "Kejadian semua jenis per tahun", "", {satuan: "kejadian"}) + jenis, kj)
        + (dm ? bag(jd(dm.n_kejadian != null, `${th(dm.n_kejadian)} kejadian dalam 12 bulan terakhir, ${th(dm.meninggal)} meninggal, ${th(dm.mengungsi)} mengungsi`, "Data dampak 12 bulan terakhir belum lengkap"), kv([["Periode", `${esc(tgl(dm.dari))} sampai ${esc(tgl(dm.sampai))}`], ["Kejadian", E(dm.n_kejadian, 0)], ["Meninggal", E(dm.meninggal, 0)], ["Mengungsi", E(dm.mengungsi, 0)], ["Rumah rusak berat", E(dm.rr_berat, 0)], ["Rumah rusak sedang", E(dm.rr_sedang, 0)], ["Rumah rusak ringan", E(dm.rr_ringan, 0)]])) : tanpa("dampak 12 bulan terakhir"))
        + bag(kj.besar?.length ? `${th(kj.besar.length)} kejadian besar tercatat` : "Belum ada kejadian besar di sumber", kj.besar?.length ? tabelHtml([["Tanggal"], ["Jenis"], ["Meninggal", "r"], ["Sumber"]], kj.besar.map(x => [esc(tgl(x.tgl)), esc(x.jenis), nf(x.meninggal, 0), esc(x.sumber || "–")])) : "")
        + (d.riwayat_luar?.length ? bag(`${th(d.riwayat_luar.length)} kejadian dari GDACS dan CEMS`, `<ul class="ak-lsumber">${d.riwayat_luar.map(x => `<li>${urlOk(x.tautan) ? `<a href="${esc(urlOk(x.tautan))}" ${LUAR}>${esc(x.judul || x.jenis_label)}</a>` : esc(x.judul || x.jenis_label)} <small class="ak-lper">${esc([x.tgl && tgl(x.tgl), x.sumber].filter(Boolean).join(", "))}</small></li>`).join("")}</ul>`) : "");
    },
    5(d) {
      const f = d.fasilitas, p = d.penduduk, ga = d.gunungapi; if (!f && !p) return tanpa("paparan dan fasilitas");
      const c = f?.cakupan || {}, sk = (c.sekolah_siswa_prov || []).includes(d.prov), fk = (c.faskes_rs_prov || []).includes(d.prov), v = (ok, n) => ok ? E(n, 0) : "–";
      return (f ? bag(sk && fk && f.sekolah != null ? `${th(f.sekolah)} sekolah, ${th(f.siswa)} siswa, ${th(f.faskes)} faskes, ${th(f.rs)} rumah sakit` : sk && fk ? "Data sekolah dan fasilitas kesehatan belum lengkap" : "Data fasilitas di provinsi ini belum mencakup semua butir", kv([["Sekolah", v(sk, f.sekolah)], ["Siswa", v(sk, f.siswa)], ["Fasilitas kesehatan", v(fk, f.faskes)], ["Rumah sakit", v(fk, f.rs)], ["Jarak ke gudang BNPB (km)", E(f.gudang_bnpb_km)]]) + (sk && fk ? "" : `<p class="km-kosong">Data sekolah baru mencakup ${nf((c.sekolah_siswa_prov || []).length, 0)} provinsi dan fasilitas kesehatan ${nf((c.faskes_rs_prov || []).length, 0)} provinsi. Tanda – berarti belum tercatat di sumber, bukan berarti tidak ada.</p>`), f) : tanpa("sekolah dan fasilitas kesehatan"))
        + (p ? bag(jd(p.balita != null && p.lansia != null, `${th(p.balita)} balita dan ${th(p.lansia)} lansia termasuk kelompok rentan`, "Data kelompok rentan belum lengkap"), kv([["Balita", E(p.balita, 0)], ["Lansia", E(p.lansia, 0)], ["Bangunan (unit)", E(p.bangunan?.n, 0) + pilY(p.bangunan)]]), p) : "")
        + (ga ? bag(ga.daftar?.length ? `${th(ga.daftar.length)} gunung api dalam radius ${th(ga.radius_km)} km` : `Tidak ada gunung api dalam radius ${th(ga.radius_km)} km`, ga.daftar?.length ? tabelHtml([["Gunung"], ["Jarak (km)", "r"], ["Jiwa di KRB III", "r"]], ga.daftar.map(x => [esc(x.gunung), nf(x.jarak_km), nf(x.krb3_jiwa_gunung ?? x.krb3_jiwa, 0)])) : "", ga) : "");
    },
    6(d, r) {
      const k = d.kapasitas; if (!k) return tanpa("kapasitas penanggulangan bencana");
      const ada = (v, y, t) => v === true ? `${ikon(IK.cek, "")}<span>${y}</span>` : v === false ? `<span>${t || "Tidak tercatat di basis regulasi"}</span>` : "<span>Tidak diketahui</span>";
      const b = k.bpbd, lis = (a, f) => a?.length ? a.map(f).join(", ") : "–";
      return bag(r?.c == null ? "Kapasitas daerah belum bisa dihitung penuh" : `${r.c} dari 5 butir kapasitas tercatat`, `<ul class="km-cek">${[["Perda penanggulangan bencana", k.perda_pb], ["Perda BPBD", k.perda_bpbd], ["Rencana penanggulangan bencana (RPB)", k.rpb], ["Rencana kontinjensi (renkon)", k.renkon], ["BPBD terbentuk", b ? b.status === "Terbentuk" : null]].map(([a, v]) => `<li class="${v === true ? "ya" : ""}"><b>${esc(a)}</b>${ada(v, "Tercatat")}</li>`).join("")}</ul>`, k)
        + bag("Kontak dan sumber daya", kv([["Status BPBD", esc(b?.status === "Terbentuk" || !k.false_arti ? (b?.status || "–") : "Tidak tercatat di basis regulasi")], ["Alamat BPBD", esc(b?.alamat || "–")], ["Telepon BPBD", esc(b?.telp || "–")], ["Status darurat terakhir", esc(k.status_darurat_terakhir || "–")], ["Indeks kapasitas daerah", E(k.ikd)], ["Relawan aktif", E(k.relawan_aktif, 0)], ["Kampus terdekat", esc(lis(k.kampus_terdekat, x => `${x.nama} (${nf(x.km, 0)} km)`))], ["Kampus pendamping", esc(lis(k.kampus_pendamping, x => x.nama || x))], ["Desa binaan", E(k.desa_binaan_n, 0)]]), k);
    },
    7(d) {
      const ms = d.masalah || [], uji = d.model?.uji; if (!ms.length) return tanpa("masalah prioritas");
      const n = c => ms.filter(m => m.kelas === c).length;
      return bag(`${n("P1")} masalah P1, ${n("P2")} P2, ${n("P3")} P3`, '<p><em class="ak-pl">Otomatis, belum divalidasi</em> Prioritas dihitung otomatis dari data dan menunggu pengesahan BPBD.</p>')
        + ms.map((m, i) => `<details class="ak-dbagian km-masalah"${i === 0 ? " open" : ""}><summary><em class="km-kelas km-w-${esc(String(m.kelas || "p3").toLowerCase())}">${esc(m.kelas || "–")}</em><h3>${esc(m.judul)}</h3><small>${esc(bl(m.B))}, skor ${sk(m.skor)} dari 1</small>${ujiPil(uji, m.B)}</summary><div class="ak-disi"><ul class="km-bukti">${(m.bukti || []).map(x => `<li title="${esc(tip(x))}">${esc(x.teks)}${buktiNilai(x)}${pilY(x)}</li>`).join("")}</ul></div></details>`).join("");
    },
    9(d, r, bank) {
      if (!bank || !KM.hitung) return kosongHtml("Panduan pendataan belum tersedia", "Daftar pertanyaan belum bisa dimuat. Muat ulang halaman atau coba lagi nanti.");
      let h; try { h = KM.hitung.panduan(bank, d, null, null, {prov_nama: PROV[d.prov] ?? null}); } catch (e) { console.warn("kemitraan panduan", e); return kosongHtml("Panduan gagal disusun", "Data profil daerah ini tidak bisa diolah menjadi pertanyaan."); }
      const ms = d.masalah || [], u = k => `/kemitraan/panduan?kab=${encodeURIComponent(d.kode)}${k ? "&masalah=" + encodeURIComponent(k) : ""}`;
      const n = Object.values(h.narasumber).reduce((a, g) => a + Object.values(g).reduce((b, x) => b + x.length, 0), 0);
      const isi = `<p><em class="ak-pl">Otomatis, belum divalidasi</em> Pertanyaan disusun dari data profil ${esc(d.nama)}; butir yang datanya kosong tidak ditampilkan.</p><p><a class="ak-tbl" href="${esc(u(""))}">Cetak panduan daerah</a></p>`
        + (ms.length ? `<ul class="ak-lsumber">${ms.map(m => `<li><a href="${esc(u(m.auto_id))}">${esc(m.judul)}</a> <small class="ak-lper">${esc(m.kelas || "–")}, panduan dan pertanyaan riset khusus masalah ini</small></li>`).join("")}</ul>` : "");
      return bag(`${th(n)} pertanyaan untuk ${th(Object.keys(h.narasumber).length)} narasumber`, isi) + KM.hitung.panduanHtml(h, esc);
    },
  };
  const TAB = [["1", "Wilayah", '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/>'], ["2", "Risiko", IK.dasbor], ["3", "Bahaya", IK.masalah], ["4", "Riwayat", IK.waktu], ["5", "Paparan", IK.kampus], ["6", "Kapasitas", IK.satgas], ["7", "Masalah", IK.riset], ["9", "Panduan", IK.tanya]];

  /* ---------- peta letak kab dalam provinsinya (KM.peta, lazy: hanya saat bab Wilayah dibuka) ---------- */
  const memoJson = new Map();
  const ambilJson = u => { if (!memoJson.has(u)) memoJson.set(u, fetch(u, {credentials: "same-origin"}).then(r => r.ok ? r.json() : null).catch(() => null).then(j => { if (!j) memoJson.delete(u); return j; })); return memoJson.get(u); };
  const muatBank = () => ambilJson("/data/kemitraan/pertanyaan.json");
  /* nama di geo/kabupaten dan kode.json beda ejaan pada beberapa kab (Kep./Kepulauan, Tanjung Balai/Tanjungbalai): samakan sebelum mencocokkan */
  const nz = s => String(s).toLowerCase().replace(/\bkep\b\.?/g, "kepulauan").replace(/\bdan\b/g, "").replace(/[^a-z]/g, "");
  const petaCache = new Map();   // kab -> HTML peta jadi; buka ulang tanpa hitung proyeksi lagi
  /* menggambar peta provinsi p ke el; r = baris ringkas kab yang disorot (atau null: peta provinsi tanpa sorotan); geo = fitur provinsi, kode = kode.json. Dipakai lembar dan buku */
  function isiPeta(el, p, r, geo, kode) {
    if (!geo?.features?.length || !kode || !KM.peta) { el.innerHTML = '<p class="km-kosong">Peta provinsi belum tersedia.</p>'; return; }
    const nm = k => nz(((kode[k]?.kunci_nama || "").split("|")[1]) || ""), baris_ = R.filter(x => x.p === p), ada = new Map(baris_.map(x => [nm(x.k), x]));
    const kelas = Object.create(null); for (const [n, x] of ada) if (x.i != null) kelas[n] = x.i === 1 ? 3 : 1;
    const svg = KM.peta(el, {geo: geo.features, kelas, kunci: f => nz(f.properties.kab), sorot: r ? nm(r.k) : null, judul: `Peta ${PROV[p] || "provinsi"}${r ? ", " + r.n + " disorot" : ""}`,
      label: f => { const x = ada.get(nz(f.properties.kab)); return x ? `${x.n}: ${x.i === 1 ? "IRBI 2025 Tinggi" : x.i === 0 ? "IRBI 2025 Sedang" : "tanpa data IRBI"}` : String(f.properties.kab); }});
    const pilih = svg?.querySelector("path.pilih"); if (pilih) pilih.parentNode.appendChild(pilih);   // garis tebal tidak tertimpa tetangga
    if (r && !el.querySelector("path.pilih") && svg) el.insertAdjacentHTML("beforeend", `<p class="km-ket">${esc(r.n)} tidak punya batas di peta provinsi ini.</p>`);
  }
  async function petaKab(mine, tk) {
    const r = baris(mine.kab); if (!r || !/^\d{2}$/.test(r.p)) return;
    if (petaCache.has(mine.kab)) { const e = $("kmPeta"); if (e) e.innerHTML = petaCache.get(mine.kab); return; }
    const [geo, kode] = await Promise.all([ambilJson(`/geo/kabupaten/${r.p}.json`), ambilJson("/data/kemitraan/kode.json")]);
    const el = $("kmPeta"); if (!el || kini !== mine || tk !== mine.tk) return;
    isiPeta(el, r.p, r, geo, kode);
    petaCache.set(mine.kab, el.innerHTML);
  }

  /* ---------- buka lembar ---------- */
  let kini = null;
  /* aria-pressed seketika; render bab ditunda KM.nanti dengan token (klik cepat berturut-turut: hanya yang terakhir), HTML bab di-cache per lembar */
  function tampilBab(b) {
    if (!kini) return; kini.bab = b;
    document.querySelectorAll("#kmSTubuh .km-bab button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.bab === b)));
    const mine = kini, tk = ++mine.tk; if (!mine.d) return;
    const s0 = $("kmBabIsi"); if (mine.tampil === b && s0 && !s0.querySelector(".ak-hantu")) return;   // bab yang sama sudah tampil
    const gambar = () => {
      const s = $("kmBabIsi"); if (kini !== mine || tk !== mine.tk || !s) return;
      const pasang = html => { s.innerHTML = html; mine.tampil = b; s.querySelectorAll("i[data-w]").forEach(i => i.style.setProperty("width", i.dataset.w + "%")); if (b === "1") petaKab(mine, tk); };   // CSSOM, bukan atribut gaya (CSP)
      if (b === "9" && !mine.cache[b]) {   // panduan butuh pertanyaan.json: kerangka dulu; gagal muat = tidak di-cache, buka berikutnya mencoba lagi
        s.innerHTML = '<div class="ak-hantu"></div>';
        muatBank().then(bank => { if (kini !== mine || tk !== mine.tk) return; const h = BAB[9](mine.d, baris(mine.kab), bank); if (bank) mine.cache[b] = h; pasang(h); });
        return;
      }
      pasang(mine.cache[b] ??= BAB[b](mine.d, baris(mine.kab)));
    };
    KM.nanti(gambar);   // cache atau bukan, kerja render tidak di dalam handler klik
  }
  /* dipanggil di dua tempat: setelah data tiba, dan setelah kerangka lembar terpasang. Yang datang belakangan yang menggambar (kab yang sama dibuka kedua kali: memo selesai lebih dulu dari KM.nanti) */
  function isiLembar() {
    const s = $("kmBabIsi"); if (!kini || !s) return;
    if (kini.gagal) s.innerHTML = kosongHtml("Profil gagal dimuat", "Muat ulang halaman atau coba lagi nanti.");
    else if (kini.d) tampilBab(kini.bab);
  }
  function buka(kab) {
    const r = baris(kab); if (!r) return;
    const u = new URL(location.href); u.searchParams.set("kab", kab); history.replaceState(null, "", u);
    const mine = kini = {kab, d: null, gagal: false, bab: "1", tk: 0, cache: {}};
    const kepala = `<div class="ak-dkepala km-kepala"><div class="ak-dk-atas"><div class="ak-nama"><h2 id="kmSJudul">${esc(r.n)}</h2><p>${esc(PROV[r.p] || r.p)}</p><span class="ak-lencana">${irbi(r)}</span></div>${metrikR(r)}</div><div class="ak-pil"><a class="km-ik" href="/kemitraan/buku?kab=${encodeURIComponent(kab)}" aria-label="Buka buku profil" title="Buka buku profil">${ikon(IK.buku, "")}</a></div></div>`;
    KM.bukaSheet("daerah", kepala, () => { queueMicrotask(isiLembar); return `<nav class="ak-seg km-bab" role="group" aria-label="Bab profil">${TAB.map(([b, l, d], i) => `<button type="button" data-bab="${b}" aria-pressed="${i === 0}">${ikon(d, "")}${b} ${esc(l)}</button>`).join("")}</nav><div id="kmBabIsi" class="km-babisi"><div class="ak-hantu"></div></div>`; });
    $("kmSheet").dataset.kab = kab;
    muat(kab).then(d => { if (kini !== mine) return; if (d) mine.d = d; else mine.gagal = true; isiLembar(); });
  }
  if (!KM._daerahSheet) {
    KM._daerahSheet = true;
    document.addEventListener("click", e => { const b = e.target.closest("#kmSheet[data-mode=daerah] .km-bab button[data-bab]"); if (b) tampilBab(b.dataset.bab); });
    const t0 = KM.tutupSheet;
    KM.tutupSheet = () => { t0(); kini = null; const u = new URL(location.href); if (u.searchParams.has("kab")) { u.searchParams.delete("kab"); history.replaceState(null, "", u); } };
  }

  /* dipakai halaman cetak buku (buku.js): bab yang sama dengan lembar, tanpa menyalin logikanya */
  KM.daerahBuku = {BAB, atur: (rk, prov) => { R = rk; PROV = prov || {}; }, peta: async (el, p, kab) => { const [geo, kode] = await Promise.all([ambilJson(`/geo/kabupaten/${p}.json`), ambilJson("/data/kemitraan/kode.json")]); isiPeta(el, p, kab ? baris(kab) : null, geo, kode); },
    nf, tgl, bl, ikB, irbi, bag, kv, tip, E, th, sk, TIDAK, YK};

  KM.tampilan.daerah = {
    bangun(el) {
      const p = new URLSearchParams(location.search), kabQ = /^\d{4}$/.test(p.get("kab") || "") ? p.get("kab") : (KM.kab4 || "");
      ST.q = (p.get("q") || "").toLowerCase(); ST.prov = p.get("prov") || ""; ST.b = Object.hasOwn(BH, p.get("b") || "") ? p.get("b") : "";
      el.innerHTML = '<div class="ak-daftar"><div class="ak-hantu"></div><div class="ak-hantu"></div><div class="ak-hantu"></div></div>';
      Promise.all([fetch("/data/kemitraan/ringkas.json").then(r => r.ok ? r.json() : null), fetch("/data/meta.json").then(r => r.ok ? r.json() : null).catch(() => null)]).catch(() => [null]).then(([rk, meta]) => {
        if (!rk?.baris?.length) { el.innerHTML = kosongHtml("Daftar daerah gagal dimuat", "Muat ulang halaman atau coba lagi nanti."); return; }
        R = rk.baris; PROV = meta?.provinsi || {};
        if (KM.peran === "BP") {   // petugas BPBD: hanya kabnya, lembar langsung; daerah/*.json adalah aset statis publik; membatasi BP ke kabnya di klien hanya tampilan, bukan kontrol akses
          el.innerHTML = kosongHtml("Profil daerah BPBD", kabQ ? "Profil daerahmu dibuka di lembar." : "Buka profil daerahmu lewat tautan dari BNPB.");
          if (kabQ) buka(kabQ); KM.segarPita(); return;
        }
        bangunSaring(el); segar(); KM.segarPita();
        if (kabQ) buka(kabQ);
      });
    },
    angka,
  };
})();
