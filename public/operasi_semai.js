/* operasi_semai.js: seksi "Peluang semai" di Operasi Udara (hash #semai). SA-11 (kerangka, peta, bilah jam) + SA-12 (kolom kanan Pos komando).
   Dimuat malas oleh operasi_laporan.js saat seksi dibuka pertama kali; memakai window.OpsSemaiMurni (operasi_semai_murni.js) dan maplibregl.
   Data: GET /api/operasi/semai/berkas/semai.json, awan_<langkah>.png, asap_<langkah>.png (DESAIN-TEKNIS §3, §5); GET/POST /api/operasi/semai/target.
   Layar membaca JSON apa adanya: tidak menghitung ulang skor, zona, atau beban asap. Bagian yang belum ada di berkas tampil "belum tersedia", tanpa data karangan.
   Medan di luar contoh DESAIN-TEKNIS §3 yang dibaca (semua opsional): api.{n_cluster,frp_mw}, ambang_mw, angin.{step,lat0,lon0,u,v} (u,v 2D atau per langkah) dan
   angin_asap (bentuk sama), zona[].{kab,ketinggian_kaki,bahan,jumlah,tanda[],status}, asap.kota[].{lat,lon,status,asal{id,kab,km},arah,angin_kmj,lama},
   asap.lintas.{tiba_jam,lat,lon}, cluster[].{id,lat,lon,frp24,piksel,kota,prov,akhir,zona}.
   INP (DESIGN-SYSTEM §10): kontrol dicat dulu; raster, panah, dan kartu Rekomendasi menyusul di frame berikutnya; geser jam tidak merender ulang daftar. */
(() => {
  "use strict";
  const M = window.OpsSemaiMurni, BAWAH = "/api/operasi/semai/berkas/", BBOX = [94, -12, 142, 7];
  const KOOR = [[BBOX[0], BBOX[3]], [BBOX[2], BBOX[3]], [BBOX[2], BBOX[1]], [BBOX[0], BBOX[1]]];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const ambil = async u => { try { const r = await fetch(u, {credentials: "same-origin"}); return r.ok ? await r.json() : {galat: r.status}; } catch (e) { return {galat: 0}; } };
  const IK = {banjir: '<path d="M12 3c3 4 5 6.5 5 9.5a5 5 0 0 1-10 0C7 9.5 9 7 12 3z"/><path d="M4 20c2-1.5 3.5-1.5 5.5 0s3.5 1.5 5.5 0 3.5-1.5 5 0"/>', awan: '<path d="M7 16a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 7a4.5 4.5 0 0 1-.5 9z"/><path d="M8 19v2M12 19v2M16 19v2"/>', api: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/>',
    asap: '<path d="M4 15a4 4 0 0 1 4-4 5 5 0 0 1 9.6-1A3.5 3.5 0 0 1 18 17H7a3 3 0 0 1-3-2z"/>', angin: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>', base: '<path d="M12 4 21 20H3z"/>', kota: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>',
    zona: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', salin: '<path d="M9 4h6v3H9z"/><path d="M15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', sortie: '<path d="M4 19c4-1 6-5 8-9s5-6 8-6"/><circle cx="4" cy="19" r="1.6"/>', tabel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', satelit: '<path d="m4 14 6 6M3 21l4-4M14 4l6 6M7 11l4 4-3 3-4-4zM13 5l6 6-3 3-6-6z"/>', putar: '<path d="M8 5v14l11-7z"/>', jeda: '<path d="M8 5v14M16 5v14"/>', peringatan: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>', geser: '<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>', cek: '<path d="m5 12 4 4 10-10"/>'};
  const sv = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[k] || ""}</svg>`;
  const lb = (k, t) => `<span class="sm-lbl">${sv(k)}${t}</span>`;
  const CHEV = '<svg class="ops-chev sm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const kartu = (id, ik, nama, isi, o = {}) => `<details class="ex ex-std ops-kartu sm-k${o.lipat ? " sm-lipat" : ""}" id="${id}" open><summary class="ex-hd"><span class="ex-ey ops-ey-ik" title="${esc(nama)}" aria-label="${esc(nama)}" role="img">${sv(ik)}</span><div class="ex-jd"><h3>${nama}</h3>${o.kanan || ""}</div>${o.lipat ? CHEV : ""}</summary><div class="ex-bd">${isi}</div></details>`;

  const st = {data: null, i: 0, zona: 0, kota: -1, peta: null, play: 0, rf: 0, ada: {awan: true, asap: true}, terap: {}, tampak: {api: true, awan: true, asap: true, pengarah: true, anginAsap: true, zona: true, kota: true}, target: {}, ctx: null, mk: {zona: [], base: [], kota: []}, semuaCluster: false, semuaKota: false, luar: false, tujuan: M.tujuanDariHash(location.hash), banjir: null, mkB: [], zB: 0, bobotB: M.BOBOT_B.slice(), manualB: [], namaKab: null};
  const muatBanjir = M.malas(() => ambil(BAWAH + "semai_banjir.json"));   // SB-08: sekali per muatan halaman
  const muatRapor = M.malas(() => ambil(BAWAH + "rapor_banjir.json"));   // SB-15: staf saja, sekali per muatan halaman
  const namaKabMuat = M.malas(async () => { const j = await ambil("/banjir/data/cuaca_peluang.json"); return Object.fromEntries(Object.entries(j?.wilayah || {}).map(([k, v]) => [k, v.nama])); });
  let akar = null;
  const zonaTerpilih = () => st.data?.zona?.[st.zona] || null;
  const L = () => st.data?.langkah || [];
  const idxLangkah = l => Math.max(0, L().indexOf(l));
  const idxJam = tiba => { const a = L().map((l, i) => [Math.abs(M.plusJam(st.data, l) - tiba), i]).sort((x, y) => x[0] - y[0]); return a.length ? a[0][1] : 0; };

  /* ---------------- bilah sumber ---------------- */
  function sumber(d) {
    if (!d) return `<span class="sm-pil sm-kosong">${lb("info", "Prakiraan belum tersedia")}</span>`;
    const f = d.sumber?.firms, p = d.putaran, u = M.umurJam(d.dibuat), pil = (k, t, c = "") => `<span class="sm-pil ${c}">${lb(k, t)}</span>`;
    const apBasi = f?.jam && Date.now() - Date.parse(f.jam) > 6 * 36e5;
    const nSat = f ? (f.satelit?.length ?? 0) : null, tot = f ? nSat + (f.hilang?.length || 0) : 0;
    return (f ? pil("satelit", `FIRMS VIIRS ${M.fmt(f.piksel)} piksel, ${nSat} dari ${tot} satelit${f.hilang?.length ? `, belum masuk ${esc(f.hilang.map(x => x.replace(/^NOAA(\d+)$/, "NOAA-$1")).join(", "))}` : ""}`, apBasi ? "sm-basi" : "") : pil("satelit", "FIRMS VIIRS belum tersedia", "sm-kosong"))
      + (p ? pil("awan", `${esc(p.model)} ${p.res != null ? M.fmt(p.res, 1) + "°" : ""}, putaran ${esc(M.putaranTeks(p))}${p.lisensi ? `, ${esc(p.lisensi)}` : ""}`) : "")
      + pil("jam", `umur ${M.umurTeks(u)}`, u > 6 ? "sm-basi" : "");
  }
  function pitaBasi(d) {
    if (!d) return "";
    const u = M.umurJam(d.dibuat), f = d.sumber?.firms?.jam ? (Date.now() - Date.parse(d.sumber.firms.jam)) / 36e5 : null, t = [];
    if (f != null && f > 6) t.push(`Data titik api berumur ${M.umurTeks(f)}.`);
    if (u != null && u > 13) t.push(`Berkas prakiraan berumur ${M.umurTeks(u)}; putaran yang lebih baru mungkin sudah terbit.`);
    return t.length ? `<p class="sm-pita sm-pita-basi" role="status">${lb("peringatan", esc(t.join(" ")))}</p>` : "";
  }

  /* ---------------- kolom kanan ---------------- */
  const pilTanda = z => { const t = z.tanda || [], s = [];
    if (st.target[z.id] || z.status === "target") s.push('<small class="sm-t sm-ungu">sudah target</small>');
    if (t.some(x => /hati|bahaya|mucape/i.test(x))) s.push('<small class="sm-t sm-bata">hati-hati</small>');
    return s.join(""); };
  function rekomendasi() {
    const d = st.data, z = zonaTerpilih();
    if (!d || !z) { const a = d ? d.alasan_kosong : "tanpa_prakiraan";
      return `<p class="sm-kosong-judul">${esc(M.judulKosong(a))}</p><p class="sm-kecil">${esc(M.kalimatKosong(a, d || {}))}</p>`; }
    const alasan = M.alasan(z).filter(x => x[2]).map(([h, n, t]) => `<li><b class="sm-h sm-h${h}" aria-hidden="true">${h}</b><span><em>${n}</em>${esc(t)}${h === "B" && z.base?.terdaftar === false ? ' <small class="sm-t sm-oranye">bandara, bukan base terdaftar</small>' : ""}</span></li>`).join("");
    const cl = (d.cluster || []).find(c => c.id === z.cluster);
    const daerah = [z.kab || z.kota, cl ? `cluster ${cl.kota || cl.kab || cl.id}` : ""].filter(Boolean).join(", ");
    const renlap = [["target", "Target daerah", daerah || "belum tersedia"], ["awan", "Ketinggian", M.ketinggianTeks(z)], ["angin", "Bahan", M.bahanTeks(z)], ["sortie", "Perkiraan jumlah", M.jumlahTeks(z)]]
      .map(([k, n, t]) => `<div>${lb(k, n)}<span>${esc(t)}</span></div>`).join("");
    const sdh = st.target[z.id] || z.status === "target";
    return `<small class="sm-lab">Rekomendasi</small><h4 class="sm-judul">Zona ${esc(z.huruf)}</h4><p class="sm-prov">${esc(z.prov || "")}${z.kota ? `, dekat ${esc(z.kota)}` : ""}</p>
      <div class="sm-skor"><b>${M.fmt(z.skor, 2)}</b><span class="sm-pil sm-hijau">${lb("jam", `terbang ${esc(M.jendela(z))}`)}</span>${pilTanda(z)}</div>
      <button type="button" class="sm-koor" data-sm-salin="${esc(M.salinKoordinat(z.lat, z.lon))}" title="Klik untuk menyalin koordinat"><span>${esc(M.dms(z.lat, z.lon))}</span><span>${esc(M.desimal(z.lat, z.lon))}</span></button>
      ${alasan ? `<h5 class="sm-sub">Alasan</h5><ul class="sm-alasan">${alasan}</ul>` : ""}
      <h5 class="sm-sub">Untuk renlap</h5><div class="sm-renlap">${renlap}</div>
      <div class="sm-aksi"><button type="button" class="sm-tombol" data-sm-target ${sdh ? "disabled" : ""}>${sdh ? "Sudah jadi target renlap" : "Jadikan target renlap"}</button>${z.rute ? `<a class="sm-tombol-garis" href="/renlap-omc?zona=${encodeURIComponent(z.id)}" target="_blank" rel="noopener" title="Renlap OMC zona ini: rute terbang, ketinggian, bahan, PDF, KML, GPX">${lb("unduh", "Renlap OMC")}</a>` : ""}</div>`;
  }
  const daftarZona = () => { const zs = st.data?.zona || [];
    return zs.length ? zs.map((z, i) => `<button type="button" class="sm-zr" data-sm-zona="${i}" aria-current="${i === st.zona}"><b class="sm-zl">${esc(z.huruf)}</b><span><strong>${esc(z.prov || "")}</strong><small>terbang ${esc(M.jendela(z).replace(/ (WIB|WITA|WIT)$/, ""))}${z.kota ? `, dekat ${esc(z.kota)}` : ""}</small>${z.base?.nama ? `<small>dari ${esc(z.base.nama)}${z.base.icao ? ` (${esc(z.base.icao)})` : ""}${z.base.menit != null ? `, sekitar ${M.fmt(z.base.menit)} menit` : ""}</small>` : ""}${z.ketinggian?.teks ? `<small>${esc(z.ketinggian.teks.replace(/ \(dasar awan perkiraan\)/, ""))}</small>` : ""}${pilTanda(z) ? `<span class="sm-tt">${pilTanda(z)}</span>` : ""}</span><code>${M.fmt(z.skor, 2)}</code></button>`).join("")
      : `<p class="sm-kecil">${esc(M.kalimatKosong(st.data ? st.data.alasan_kosong : "tanpa_prakiraan", st.data || {}))}</p>`; };
  function barisKota(k, i) { const sd = M.sudahBerasap(k), as = M.barisAsal(k);
    return `<button type="button" class="sm-kr" data-sm-kota="${i}" aria-current="${i === st.kota}"><span class="sm-k1"><strong>${esc(k.nama)}</strong><small>${esc(M.namaNegara(k.negara))}</small><code>${sd ? "sekarang" : `tiba +${M.fmt(k.tiba_jam)} j`}</code><small class="sm-t sm-tg-${esc(k.tingkat || "rendah")}">${esc(k.tingkat || "rendah")}</small></span>${as ? `<span class="sm-k2">${sv("angin")}${esc(as)}</span>` : ""}</button>`; }
  function peringatanAsap() {
    const a = st.data?.asap; if (!a) return `<p class="sm-kecil">Prakiraan asap belum tersedia untuk putaran ini.</p>`;
    const l = a.lintas, u = M.urutKota(a.kota), semua = [...u.tiba, ...u.sudah], idx = k => (a.kota || []).indexOf(k);
    const kepala = l ? `<div class="sm-asap sm-asap-merah"><small class="sm-lab">Peringatan asap</small><h4>Asap ${esc(M.asapKalimat(st.data))}</h4><p class="sm-kecil">${[l.jam ? `mulai ${esc(M.hariJam(l.jam))}` : "", l.kota ? `kota terdekat ${esc(l.kota)}` : "", l.cluster ? `asal cluster ${esc(l.cluster)}` : ""].filter(Boolean).join(", ")}</p></div>`
      : `<div class="sm-asap sm-asap-hijau"><h4>Asap belum menyeberang ke negara lain 24 jam ke depan</h4></div>`;
    const grup = (j, arr) => arr.length ? `<h5 class="sm-sub">${j}</h5><div class="sm-kdaf">${arr.map(k => barisKota(k, idx(k))).join("")}</div>` : "";
    return `${kepala}${grup("Akan kena asap", u.tiba)}${grup("Sudah berasap", u.sudah)}${u.sisa > 0 ? `<button type="button" class="sm-lain" data-sm-semuakota>+${M.fmt(u.sisa + (a.kota_lain || 0))} kota lain</button>` : (a.kota_lain || 0) > 0 ? `<p class="sm-kecil">+${M.fmt(a.kota_lain)} kota lain</p>` : ""}${semua.length ? "" : `<p class="sm-kecil">Tidak ada kota di bawah asap pada putaran ini.</p>`}
      <p class="sm-kaki">Beban asap relatif dari model lintasan, bukan PM2.5 terukur.</p>`;
  }
  function tabelCluster() {
    const cs = (st.data?.cluster || []).slice().sort((x, y) => (y.frp24 || 0) - (x.frp24 || 0)); if (!cs.length) return `<p class="sm-kecil">Tidak ada cluster api besar pada putaran ini.</p>`;
    const tampil = st.semuaCluster ? cs : cs.slice(0, 12), nomor = c => parseInt(String(c.id).replace(/\D/g, ""), 10) || c.id;
    const baris = tampil.map(c => `<tr data-sm-cluster="${esc(c.id)}"><td>#${esc(nomor(c))}${c.kota || c.kab ? ` dekat ${esc(c.kota || c.kab)}` : ""}</td><td>${esc(c.prov || "–")}</td><td class="n">${M.fmt(c.piksel)}</td><td class="n">${M.fmt(c.frp24)}</td><td>${c.akhir ? esc(M.hariJam(c.akhir)) : "–"}</td><td>${c.zona ? `<b class="sm-zl">${esc(c.zona)}</b>` : "–"}</td></tr>`).join("");
    return `<div class="tw sm-tw ex-tabel"><table class="sm-tabel"><thead><tr><th>Cluster</th><th>Provinsi</th><th class="n" title="Piksel titik panas 24 jam">Piksel</th><th class="n" title="Daya api cluster 24 jam, megawatt">Daya api (MW)</th><th>Terakhir terlihat</th><th title="Zona semai terbaik untuk cluster ini">Zona terbaik</th></tr></thead><tbody>${baris}</tbody></table></div>
      ${cs.length > 12 && !st.semuaCluster ? `<button type="button" class="sm-lain" data-sm-semua>+${M.fmt(cs.length - 12)} cluster lain</button>` : ""}`;
  }
  const CARA = `<ol class="sm-cara"><li>Hanya sel awan yang lolos sembilan gerbang yang dinilai: tutupan awan rendah, MUCAPE, cairan awan, geseran angin, kelembapan 850 hPa, hujan prakiraan, suhu dasar awan, kedalaman awan hangat, dan jam siang setempat (07.00 sampai 16.00).</li>
    <li>Kandidat hanya sel dalam 60 km dari cluster api besar (daya api 24 jam di atas ambang putaran itu).</li>
    <li>Tiga faktor: Q kualitas awan, D hanyut ke api (titik hujan jatuh dekat cluster setelah 30 menit terbawa angin pengarah), T jarak titik hujan ke kota.</li>
    <li>Skor adalah rerata geometris berbobot Q, D, T (0,45, 0,40, 0,15). Satu faktor nol berarti skor nol.</li>
    <li>Zona diambil dari sel berskor terbaik; sel lain dalam 40 km dibuang; paling banyak lima zona dengan skor di atas 0,35.</li>
    <li>Jendela terbang adalah blok jam siang berurutan yang skornya paling sedikit 85% dari puncak, dalam jam setempat provinsi.</li>
    <li>Semua ambang dan bobot berstatus hipotesis dan tertulis di satu berkas; skor menampilkan masukannya supaya bisa diperiksa peninjau BMKG.</li></ol>`;
  const TAK = `<ul class="sm-cara"><li>Satelit melihat api dua kali sehari saja; asap dan awan menutupi api; gambut membara lemah tidak selalu terbaca.</li>
    <li>Tidak semua titik panas adalah kebakaran hutan dan lahan.</li>
    <li>Model berkisi sekitar 11 km dengan konveksi diparameterisasi: awan tunggal tidak terlihat dan updraf diperkirakan kasar.</li>
    <li>Pengaruh aerosol asap pada awan tidak dihitung.</li>
    <li>Beban asap bersifat relatif, bukan PM2.5.</li>
    <li>Semai bukan jaminan hujan; usulan ini tidak menyatakan hujan atau padamnya api.</li></ul>`;

  /* ---------------- kerangka ---------------- */
  const pilAtas = () => { const d = st.data, zs = d.zona || [], as = d.asap;
    return [["zona", "zona", "Zona usulan", zs.length], ["teramati", "awan", "Awan teramati", zs.filter(M.teramati).length], ["api", "api", "Cluster besar", d.api?.n_cluster ?? (d.cluster || []).length], ["kota", "kota", "Kota berasap", as ? (as.kota_total ?? (as.kota || []).length) : "–"], ["lintas", "asap", "Lintas batas", as?.lintas ? 1 : "–"]]
      .map(([k, ik, t, n]) => `<button type="button" class="sm-chip" data-sm-chip="${k}" aria-pressed="${k === "teramati" ? st.luar : st.tampak[CHIPLAP[k]]}" title="Klik untuk ${k === "teramati" ? "menyaring zona dengan awan dingin teramati Himawari" : "menampilkan atau menyembunyikan lapisan"}">${sv(ik)}${t} <b>${typeof n === "number" ? M.fmt(n) : n}</b></button>`).join(""); };
  const CHIPLAP = {zona: "zona", api: "api", kota: "kota", lintas: "asap"};
  const tujuanSeg = () => `<div class="sm-tujuan" role="group" aria-label="Tujuan semai"><button type="button" data-sm-tujuan="karhutla" aria-pressed="${st.tujuan !== "banjir"}">${lb("api", "Karhutla")}</button><button type="button" data-sm-tujuan="banjir" aria-pressed="${st.tujuan === "banjir"}">${lb("banjir", "Banjir")}</button></div>`;
  const peranSeg = () => `<div class="seg sm-peran" role="group" aria-label="Tampilan peran"><button type="button" aria-pressed="true">${lb("kota", "Pos komando")}</button><button type="button" disabled title="Segera: SA-13">${lb("angin", "Tinjau BMKG")}</button><button type="button" disabled title="Segera: SA-13">${lb("satelit", "Mitra")}</button></div>`;
  function strip() { const d = st.data, zs = d.zona || [], cl = d.cluster || [], as = d.asap, u = M.umurJam(d.dibuat), f = d.sumber?.firms;
    const mw = d.api?.frp_mw ?? cl.reduce((t, c) => t + (+c.frp24 || 0), 0), t = (ik, n, v, c = "", ttl = "") => `<div class="sm-ub ${c}" title="${esc(ttl)}"><i>${sv(ik)}</i><span>${n}</span><b>${v}</b></div>`;
    return `<div class="sm-strip">${t("zona", "Zona", M.fmt(zs.length))}${t("cek", "Skor tertinggi", zs.length ? M.fmt(Math.max(...zs.map(z => z.skor)), 2) : "–")}${t("api", "Cluster besar", M.fmt(d.api?.n_cluster ?? cl.length))}${t("api", "Daya api, MW", M.fmt(mw))}${t("kota", "Kota berasap", as ? M.fmt(as.kota_total ?? (as.kota || []).length) : "–")}${t("asap", "Lintas batas", as?.lintas ? esc(M.namaNegara(as.lintas.negara)) : "–", as?.lintas ? "merah" : "", as ? (as.lintas ? "" : "Asap belum menyeberang ke negara lain 24 jam ke depan") : "Prakiraan asap belum tersedia")}${t("awan", "Putaran", esc(M.putaranTeks(d.putaran)))}${t("jam", "Umur data", u == null ? "–" : u < 1 ? "<1 j" : `${Math.round(u)} j`, u > 6 ? "oranye" : "", f ? `FIRMS ${f.jam ? M.hariJam(f.jam) : ""}` : "")}</div>`; }
  const legenda = () => { const f = st.data.sumber?.firms; return `<div class="sm-leg"><span><i class="sm-d" style="--w:#d7301f"></i>titik api di atas 40 MW</span><span><i class="sm-d" style="--w:#f28c28"></i>di bawahnya</span><span><i class="sm-seg3"></i>base</span><span><i class="sm-d sm-cincin"></i>zona</span>${f ? `<span class="sm-fi${f.jam && Date.now() - Date.parse(f.jam) > 6 * 36e5 ? " sm-basi" : ""}">${sv("satelit")}FIRMS VIIRS ${M.fmt(f.piksel)} piksel, ${f.satelit?.length ?? 0} dari ${(f.satelit?.length ?? 0) + (f.hilang?.length || 0)} satelit${f.hilang?.length ? `, belum masuk ${esc(f.hilang.join(", "))}` : ""}</span>` : `<span class="sm-fi sm-basi">${sv("satelit")}FIRMS belum tersedia</span>`}</div>`; };
  function bangun() {
    const d = st.data;
    const peta = d ? `${tujuanSeg()}<div class="sm-peta-bungkus"><div id="smPeta" class="sm-peta" aria-label="Peta peluang semai"></div><div class="sm-alat"><div class="sm-chips" role="group" aria-label="Lapisan dan saringan">${pilAtas()}</div><div class="sm-alat-r">${peranSeg()}<button type="button" class="sm-tombol-garis" data-sm-ringkas>${lb("salin", "Salin ringkasan")}</button></div></div>${kotakLapis()}<div class="sm-dasar">${legenda()}${bilahJam()}${strip()}</div></div>`
      : `${tujuanSeg()}<div class="sm-atas"><div class="sm-sumber">${sumber(null)}</div><button type="button" class="sm-tombol-garis" data-sm-ringkas>${lb("salin", "Salin ringkasan")}</button></div><p class="sm-kecil sm-peta-kosong">Peta tersedia setelah prakiraan terbit.</p>`;
    akar.innerHTML = `<span class="sm-toast" id="smToast" role="status" aria-live="polite" hidden></span><div id="smPita">${pitaBasi(d)}</div>${kartu("smKP", "awan", "Peta peluang semai", peta)}
      <div class="sm-baris3" id="smK">${kartu("smRek", "awan", "Rekomendasi", rekomendasi())}<div class="sm-kanan2">${kartu("smZona", "zona", "Zona usulan 24 jam", `<div class="sm-zdaf" id="smZdaf">${daftarZona()}</div>`)}${kartu("smAsap", "asap", "Peringatan asap", peringatanAsap())}</div></div>
      <div class="sm-baris3 sm-banjir" id="smB" hidden></div>
      <div class="sm-bawah">${kartu("smCluster", "tabel", "Cluster aktif", tabelCluster())}<div class="sm-lipatan">${kartu("smCara", "info", "Cara memutuskan", CARA, {lipat: true})}${kartu("smTak", "peringatan", "Yang tidak terlihat satelit dan model", TAK, {lipat: true})}</div></div>`;
    for (const x of akar.querySelectorAll(".sm-lipat")) x.open = false;
  }
  const LAP = [["api", "api", "Titik api", "#d7301f"], ["awan", "awan", "Awan layak semai", "#2b7bd8"], ["asap", "asap", "Prakiraan asap", "#6e5426"], ["pengarah", "angin", "Angin pengarah (850 sampai 700 hPa)", "#8a94a6"], ["anginAsap", "angin", "Angin asap (10 m dan 850 hPa)", "#a88b5a"], ["zona", "zona", "Zona semai", "#a63a26"], ["kota", "base", "Kota dan base", "#0b2545"]];
  const kotakLapis = () => `<div class="sm-lapis${matchMedia("(max-width:900px)").matches ? " sm-tutup" : ""}" role="group" aria-label="Lapisan peta"><b class="sm-lapis-hd" title="Tarik untuk menggeser, klik dua kali untuk mengembalikan">${sv("geser")}Lapisan</b>${LAP.map(([k, ik, t, w]) => `<label class="sm-ls" data-sm-lap="${k}"${st.tujuan === "banjir" && ["api", "asap", "anginAsap"].includes(k) ? " hidden" : ""}><input type="checkbox" ${st.tampak[k] ? "checked" : ""}><i style="--w:${w}"></i><span>${t}</span></label>`).join("")}</div>`;
  const bilahJam = () => { const d = st.data, n = L().length; if (!n) return "";
    return `<div class="sm-jam"><button type="button" class="sm-putar" data-sm-putar aria-label="Putar bilah jam">${sv("putar")}</button><div class="sm-jt"><b id="smJamT"></b><small id="smJamK"></small></div><input type="range" id="smGeser" min="0" max="${n - 1}" step="1" value="${st.i}" aria-label="Jam prakiraan"></div>`; };
  function catJam() { const d = st.data, l = L()[st.i]; if (l == null) return;
    const t = $("#smJamT", akar), k = $("#smJamK", akar), z = zonaTerpilih(), zw = z?.zona_waktu || "WIB";
    if (t) t.textContent = M.hariJam(M.waktuLangkah(d, l), zw); if (k) k.textContent = `+${M.plusJam(d, l)} j, ${d.putaran?.model === "ECMWF IFS" ? "ECMWF" : d.putaran?.model || ""} ${String(new Date(d.putaran.init).getUTCHours()).padStart(2, "0")}z`;
    const g = $("#smGeser", akar); if (g && +g.value !== st.i) g.value = st.i; }
  const toast = t => { const e = $("#smToast", akar); if (!e) return; e.textContent = t; e.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { e.hidden = true; }, 3500); };

  /* ---------------- peta ---------------- */
  const urlR = (j, l) => `${BAWAH}${j}_${l}.png`;
  function panah(g, i) {
    const f = []; if (!g?.u) return {type: "FeatureCollection", features: f};
    const k3 = Array.isArray(g.u[0]?.[0]), ik = k3 ? Math.max(0, Math.min(g.u.length - 1, g.langkah ? g.langkah.indexOf(L()[i]) : i)) : 0, U = k3 ? g.u[ik] : g.u, V = k3 ? g.v[ik] : g.v, s = g.step || 1, lon0 = g.lon0 ?? BBOX[0], lat0 = g.lat0 ?? BBOX[3], ar = g.lat0 != null ? 1 : -1;   // lat0 ada = baris pertama di lintang itu, naik ke utara; tanpa lat0 = dari tepi utara ke selatan
    for (let r = 0; r < U.length; r++) for (let c = 0; c < U[r].length; c++) { const u = U[r][c], v = V?.[r]?.[c]; if (u == null || v == null) continue;
      const sp = Math.hypot(u, v); if (sp < .3) continue; const k = Math.min(.85, .06 * sp) / sp, dx = u * k, dy = v * k, cx = lon0 + c * s, cy = lat0 + ar * r * s;
      const x0 = cx - dx / 2, y0 = cy - dy / 2, x1 = cx + dx / 2, y1 = cy + dy / 2, a = Math.atan2(dy, dx), h = .3 * Math.hypot(dx, dy), p = o => [x1 - h * Math.cos(a + o), y1 - h * Math.sin(a + o)];
      f.push({type: "Feature", properties: {}, geometry: {type: "MultiLineString", coordinates: [[[x0, y0], [x1, y1]], [p(.5), [x1, y1], p(-.5)]]}}); }
    return {type: "FeatureCollection", features: f};
  }
  const fc = f => ({type: "FeatureCollection", features: f});
  const tekanMarker = (cls, html, lon, lat, judul, klik) => { const e = document.createElement(klik ? "button" : "span"); if (klik) e.type = "button"; e.className = cls; e.innerHTML = html; if (judul) e.title = judul; if (klik) e.addEventListener("click", ev => { ev.stopPropagation(); klik(); });
    return new maplibregl.Marker({element: e, anchor: "center"}).setLngLat([lon, lat]).addTo(st.peta); };
  function pasangPeta() {
    const el = $("#smPeta", akar), d = st.data; if (!el || !d || !window.maplibregl) return;
    if (st.peta) { st.peta.resize(); return; }
    const D = st.ctx?.D?.() || {}, bs = (D.peta?.base || []).filter(b => b.lat != null), omc = new Set((D.peta?.armada || []).filter(a => a.peran === "omc").map(a => a.base_id));
    const peta = st.peta = new maplibregl.Map({container: el, style: "https://tiles.openfreemap.org/styles/positron", bounds: [[BBOX[0], BBOX[1]], [BBOX[2], BBOX[3]]], fitBoundsOptions: {padding: 6}, minZoom: 3, maxZoom: 11, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right"); peta.touchZoomRotate.disableRotation(); peta.on("error", () => {});
    new ResizeObserver(() => { if (!st.rs) st.rs = requestAnimationFrame(() => { st.rs = 0; peta.resize(); }); }).observe(el);
    peta.on("load", () => {
      const l0 = L()[st.i], garis = (id, w, c, dash) => peta.addLayer({id, type: "line", source: id, paint: {"line-color": c, "line-width": w, ...(dash ? {"line-dasharray": dash} : {})}});
      for (const j of ["awan", "asap"]) { peta.addSource("sm-" + j, {type: "image", url: urlR(j, l0), coordinates: KOOR}); peta.addLayer({id: "sm-" + j, type: "raster", source: "sm-" + j, layout: {visibility: st.tampak[j] ? "visible" : "none"}, paint: {"raster-opacity": 1, "raster-resampling": "linear", "raster-fade-duration": 0}}); st.terap[j] = l0; }
      peta.addSource("sm-pengarah", {type: "geojson", data: fc([])}); garis("sm-pengarah", 1, "#8a94a6"); peta.addSource("sm-anginAsap", {type: "geojson", data: fc([])}); garis("sm-anginAsap", 1, "#a88b5a");
      peta.addSource("sm-hujan", {type: "geojson", data: fc((d.zona || []).filter(z => z.hujan).map(z => ({type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: [[z.lon, z.lat], [z.hujan.lon, z.hujan.lat]]}})))}); garis("sm-hujan", 1.5, "#a63a26", [3, 2]);
      peta.addSource("sm-asal", {type: "geojson", data: fc([])}); garis("sm-asal", 1.5, "#6e5426", [2, 2]);
      peta.addSource("sm-rute", {type: "geojson", data: ruteFc(zonaTerpilih())}); garis("sm-rute", 2, "#f97316", [3, 2]);
      peta.addSource("sm-api", {type: "geojson", data: fc((d.cluster || []).filter(c => c.lat != null).map(c => ({type: "Feature", properties: {mw: c.frp24 || 0}, geometry: {type: "Point", coordinates: [c.lon, c.lat]}})))});
      peta.addLayer({id: "sm-api", type: "circle", source: "sm-api", paint: {"circle-radius": ["case", [">", ["get", "mw"], 40], 6, 3], "circle-color": ["case", [">", ["get", "mw"], 40], "#d7301f", "#f28c28"], "circle-stroke-color": "#fff", "circle-stroke-width": 1, "circle-opacity": .9}});
      for (const [k, id] of [["api", "sm-api"], ["pengarah", "sm-pengarah"], ["anginAsap", "sm-anginAsap"]]) peta.setLayoutProperty(id, "visibility", st.tampak[k] ? "visible" : "none");
      /* penanda DOM: sedikit jumlahnya (zona <= 5, base, kota di bawah asap) */
      (d.zona || []).forEach((z, i) => { st.mk.zona.push(tekanMarker("sm-zm", `<i></i><span>${esc(z.huruf)} ${M.fmt(z.skor, 2)}</span>`, z.lon, z.lat, `Zona ${z.huruf}, skor ${M.fmt(z.skor, 2)}, terbang ${M.jendela(z)}`, () => pilihZona(i))); });
      for (const b of bs) st.mk.base.push(tekanMarker(`sm-bs${omc.has(b.id) ? " sm-omc" : ""}`, "", b.lon, b.lat, `${b.nama}${omc.has(b.id) ? ", armada OMC" : ""}`));
      (d.asap?.kota || []).forEach(k => { if (k.lat != null) st.mk.kota.push(tekanMarker("sm-kt", `<i></i><span>${esc(k.nama)}</span>`, k.lon, k.lat, k.nama)); });
      terapMarker(); pilihMarker(); gantiAngin(); catJam();
      if (st.tujuan === "banjir") muatBanjir().then(b => { st.banjir = b; pasangBanjir(); terapTujuan(); });
      (window.requestIdleCallback || (f => setTimeout(f, 800)))(() => { for (const l of L()) for (const j of ["awan", "asap"]) if (l !== l0 && st.ada[j]) new Image().src = urlR(j, l); });
    });
    for (const j of ["awan", "asap"]) { const im = new Image(); im.onerror = () => { st.ada[j] = false; const cb = $(`[data-sm-lap="${j === "awan" ? "awan" : "asap"}"]`, akar); if (cb) { cb.classList.add("sm-mati"); cb.title = "belum tersedia"; cb.querySelector("input").disabled = true; } if (peta.getLayer("sm-" + j)) peta.setLayoutProperty("sm-" + j, "visibility", "none"); }; im.src = urlR(j, L()[st.i]); }
  }
  const terapMarker = () => { const a = st.tampak; st.mk.zona.forEach((m, i) => { m.getElement().hidden = !a.zona || st.tujuan === "banjir" || (st.luar && !M.teramati(st.data.zona[i])); }); for (const m of st.mk.base) m.getElement().hidden = !a.kota; for (const m of st.mk.kota) m.getElement().hidden = !a.kota || st.tujuan === "banjir"; for (const m of st.mkB) m.getElement().hidden = st.tujuan !== "banjir" || !a.zona; };
  /* pratinjau rute OMC zona terpilih (ALGORITMA §7c, dihitung semai.py) */
  const ruteFc = z => fc(z?.rute ? [{type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: z.rute.cp.map(c => [c.lon, c.lat])}}] : []);
  const pilihMarker = () => st.mk.zona.forEach((m, i) => m.getElement().classList.toggle("sm-pilih", i === st.zona));
  /* SB-08: tujuan banjir. Lapisan sasaran dan zona cegat dari semai_banjir.json (diambil malas); titik api dan asap disembunyikan. */
  const warna = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const nrm = n => String(n || "").toLowerCase().replace(/^(kota administrasi|kabupaten|kota|kab\.?)\s+/, "").replace(/[^a-z0-9]/g, "");
  const sasaranFc = (b, ada = new Set()) => fc((b?.zona || []).flatMap(z => (z.cegat || []).filter(c => c.masuk && !ada.has(c.kab)).map(c => { const s = (b.sasaran || []).find(x => x.kab === c.kab); return {type: "Feature", properties: {nama: s?.nama || c.kab, tg: s?.tenggang > 1 ? 1 : 0}, geometry: {type: "Point", coordinates: [c.masuk.lon, c.masuk.lat]}}; })));
  function pasangBanjir() { const p = st.peta, b = st.banjir; if (!p?.getSource || !b || b.galat || p.getSource("sm-sasaran")) return;
    const w = warna("--sm-sasaran");
    p.addSource("sm-sasaran", {type: "geojson", data: sasaranFc(b)});
    p.addSource("sm-sasaran-poly", {type: "geojson", data: fc([])});
    p.addLayer({id: "sm-sasaran-poly", type: "fill", source: "sm-sasaran-poly", paint: {"fill-color": w, "fill-opacity": .12}});
    p.addLayer({id: "sm-sasaran-garis", type: "line", source: "sm-sasaran-poly", filter: ["==", ["get", "tg"], 0], paint: {"line-color": w, "line-width": 2}});
    p.addLayer({id: "sm-sasaran-garis2", type: "line", source: "sm-sasaran-poly", filter: ["==", ["get", "tg"], 1], paint: {"line-color": w, "line-width": 2, "line-dasharray": [3, 2]}});
    p.addLayer({id: "sm-sasaran", type: "circle", source: "sm-sasaran", paint: {"circle-radius": 9, "circle-color": w, "circle-opacity": .12, "circle-stroke-color": w, "circle-stroke-width": 2}});
    p.addLayer({id: "sm-sasaran-tg", type: "circle", source: "sm-sasaran", filter: ["==", ["get", "tg"], 1], paint: {"circle-radius": 13, "circle-color": w, "circle-opacity": 0, "circle-stroke-color": w, "circle-stroke-width": 1}});
    p.addSource("sm-cegat", {type: "geojson", data: fc((b.zona || []).flatMap(z => (z.cegat || []).filter(c => c.masuk && z.hujan).map(c => ({type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: [[z.hujan.lon, z.hujan.lat], [c.masuk.lon, c.masuk.lat]]}}))))});
    p.addLayer({id: "sm-cegat", type: "line", source: "sm-cegat", paint: {"line-color": warna("--sm-garis"), "line-width": 1.5, "line-dasharray": [3, 2]}});
    setTimeout(() => poligonSasaran(b), 0);   // poligon kab menyusul; cincin tetap dipakai selama memuat atau bila tak ada
    (b.zona || []).forEach((z, i) => st.mkB.push(tekanMarker("sm-zm sm-zb", `<i></i><span>B${esc(z.huruf)} ${M.fmt(z.skor, 2)}</span>`, z.lon, z.lat, `Zona cegat ${z.huruf}, skor ${M.fmt(z.skor, 2)}`, () => pilihZonaB(i))));
  }
  async function poligonSasaran(b) { const p = st.peta, ss = b.sasaran || [], ada = new Set(), fs = [];
    for (const pv of new Set(ss.map(x => x.prov).filter(Boolean))) { const g = await ambil(`/geo/kabupaten/${pv}.json`); if (!g?.features) continue;
      for (const s of ss.filter(x => x.prov === pv)) { const f = g.features.find(f => nrm(f.properties.kab) === nrm(s.nama)); if (f) { ada.add(s.kab); fs.push({type: "Feature", properties: {tg: s.tenggang > 1 ? 1 : 0}, geometry: f.geometry}); } } }
    if (!p?.getSource || !fs.length || !p.getSource("sm-sasaran-poly")) return;
    p.getSource("sm-sasaran-poly").setData(fc(fs)); p.getSource("sm-sasaran").setData(sasaranFc(b, ada)); }
  function terapTujuan() { const p = st.peta, v = M.tampakLapis(st.tujuan, st.tampak), ban = st.tujuan === "banjir";
    if (p?.getLayer) { const set = (id, on) => p.getLayer(id) && p.setLayoutProperty(id, "visibility", on ? "visible" : "none");
      set("sm-api", v.api); set("sm-asap", v.asap && st.ada.asap); set("sm-anginAsap", v.anginAsap); for (const id of ["sm-sasaran", "sm-sasaran-tg", "sm-sasaran-poly", "sm-sasaran-garis", "sm-sasaran-garis2", "sm-cegat"]) set(id, v.sasaran); }
    for (const k of ["api", "asap", "anginAsap"]) { const e = $(`[data-sm-lap="${k}"]`, akar); if (e) e.hidden = ban; }
    for (const k of ["api", "kota", "lintas"]) { const e = $(`[data-sm-chip="${k}"]`, akar); if (e) e.hidden = ban && k !== "kota"; }
    for (const [id, tampak] of [["#smK", !ban], ["#smCluster", !ban], ["#smB", ban]]) { const e = $(id, akar); if (e) e.hidden = !tampak; }
    if (ban) isiBanjir();
    terapMarker(); if (!ban) { gantiRaster(); gantiAngin(); } }
  async function setTujuan(t) { if (st.tujuan === t) return; st.tujuan = t;
    akar.querySelectorAll("[data-sm-tujuan]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.smTujuan === t)));
    try { history.replaceState(null, "", M.hashTujuan(t)); } catch (e) {}
    requestAnimationFrame(terapTujuan);
    if (t === "banjir" && !st.banjir) { st.banjir = await muatBanjir(); if (st.banjir.galat) toast(st.banjir.galat === 404 ? "Prakiraan banjir belum tersedia" : `Prakiraan banjir gagal dibaca (kode ${st.banjir.galat})`); requestAnimationFrame(() => { pasangBanjir(); terapTujuan(); }); } }
  function gantiRaster() { const l = L()[st.i], p = st.peta; if (!p?.getSource) return;
    for (const j of ["awan", "asap"]) if (st.tampak[j] && st.ada[j] && !(j === "asap" && st.tujuan === "banjir") && st.terap[j] !== l && p.getSource("sm-" + j)) { p.getSource("sm-" + j).updateImage({url: urlR(j, l), coordinates: KOOR}); st.terap[j] = l; } }
  function gantiAngin() { const p = st.peta; if (!p?.getSource) return;
    for (const [k, g] of [["pengarah", st.data.angin], ["anginAsap", st.data.angin_asap || st.data.asap?.angin_asap]]) if (st.tampak[k] && !(k === "anginAsap" && st.tujuan === "banjir") && p.getSource("sm-" + k) && st.terap["a" + k] !== st.i) { p.getSource("sm-" + k).setData(panah(g, st.i)); st.terap["a" + k] = st.i; } }
  function setLangkah(i) { st.i = Math.max(0, Math.min(L().length - 1, i)); catJam(); if (!st.rf) st.rf = requestAnimationFrame(() => { st.rf = 0; gantiRaster(); gantiAngin(); }); }
  function pilihZona(i) { if (!st.data?.zona?.[i]) return; st.zona = i;
    akar.querySelectorAll("[data-sm-zona]").forEach(b => b.setAttribute("aria-current", String(+b.dataset.smZona === i))); pilihMarker();
    requestAnimationFrame(() => { const z = zonaTerpilih(), rek = $("#smRek .ex-bd", akar); if (rek) rek.innerHTML = rekomendasi(); st.peta?.getSource("sm-rute")?.setData(ruteFc(z)); setLangkah(idxLangkah(z.langkah)); st.peta?.easeTo({center: [z.lon, z.lat], zoom: Math.max(st.peta.getZoom(), 6.5), duration: 600}); }); }
  function pilihKota(i) { const k = st.data?.asap?.kota?.[i]; if (!k) return; st.kota = i;
    akar.querySelectorAll("[data-sm-kota]").forEach(b => b.setAttribute("aria-current", String(+b.dataset.smKota === i)));
    if (!st.tampak.asap && st.ada.asap) setLapis("asap", true);
    requestAnimationFrame(() => { if (!M.sudahBerasap(k)) setLangkah(idxJam(k.tiba_jam)); const as = k.asal && (st.data.cluster || []).find(c => String(c.id) === String(k.asal.id)), s = st.peta?.getSource("sm-asal");
      if (s) s.setData(as && k.lat != null ? fc([{type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: [[as.lon, as.lat], [k.lon, k.lat]]}}]) : fc([]));
      if (k.lat != null) st.peta?.easeTo({center: [k.lon, k.lat], zoom: Math.max(st.peta.getZoom(), 6), duration: 600}); }); }
  function setLapis(k, on) { st.tampak[k] = on; const cb = $(`[data-sm-lap="${k}"] input`, akar); if (cb) cb.checked = on;
    for (const [c, l] of Object.entries(CHIPLAP)) if (l === k) $(`[data-sm-chip="${c}"]`, akar)?.setAttribute("aria-pressed", String(on));
    requestAnimationFrame(() => { const p = st.peta; if (!p?.getLayer) return;
      const id = {api: "sm-api", awan: "sm-awan", asap: "sm-asap", pengarah: "sm-pengarah", anginAsap: "sm-anginAsap"}[k]; if (id && p.getLayer(id)) p.setLayoutProperty(id, "visibility", on ? "visible" : "none");
      if (k === "zona" || k === "kota") terapMarker(); if (on) { gantiRaster(); gantiAngin(); } }); }
  /* panel di atas peta bisa digeser lewat kepalanya (aturan panel geser); posisi dalam wadah peta, klik dua kali mengembalikan */
  function geserPanel(p, hd, wadah) { let x0 = 0, y0 = 0, l0 = 0, t0 = 0, f = 0, ke = null; hd.style.touchAction = "none";
    hd.addEventListener("pointerdown", e => { if (e.button) return; x0 = e.clientX; y0 = e.clientY; l0 = p.offsetLeft; t0 = p.offsetTop; hd.setPointerCapture(e.pointerId); hd.dataset.tarik = "1"; });
    hd.addEventListener("pointermove", e => { if (!hd.dataset.tarik) return; ke = [Math.max(0, Math.min(wadah.clientWidth - p.offsetWidth, l0 + e.clientX - x0)), Math.max(0, Math.min(wadah.clientHeight - 40, t0 + e.clientY - y0))];
      if (!f) f = requestAnimationFrame(() => { f = 0; p.style.left = ke[0] + "px"; p.style.top = ke[1] + "px"; }); });
    hd.addEventListener("pointerup", () => { delete hd.dataset.tarik; });
    hd.addEventListener("dblclick", () => { p.style.left = ""; p.style.top = ""; }); }
  function putar() { const b = $("[data-sm-putar]", akar); if (!b) return;
    if (st.play) { clearInterval(st.play); st.play = 0; b.innerHTML = sv("putar"); return; }
    b.innerHTML = sv("jeda"); if (st.i >= L().length - 1) setLangkah(0);
    st.play = setInterval(() => { if (document.hidden || st.i >= L().length - 1) { putar(); return; } setLangkah(st.i + 1); }, 1200); }


  /* ---------------- SB-09: kolom kanan tujuan banjir ---------------- */
  const wib = n => new Date(Date.now() + 7 * 36e5 + n * 864e5).toISOString().slice(0, 10);
  const hariRel = t => ["hari ini", "besok", "lusa"][Math.round((Date.parse(t) - Date.parse(wib(0))) / 864e5)] || M.hariJam(t + "T00:00:00Z").replace(/,.*/, "");
  const geser1 = (t, n) => new Date(Date.parse(t) + n * 864e5).toISOString().slice(0, 10);
  const manualBaru = () => st.manualB.filter(m => !(st.banjir?.sasaran || []).some(s => s.kab === m.kab));
  const namaB = kab => (st.banjir?.sasaran || []).find(s => s.kab === kab)?.nama || st.namaKab?.[kab] || `kab ${kab}`;
  const barisSasaran = (nama, asal, ket, tg, o = {}) => `<li class="sm-sb"><span class="sm-sb1"><strong>${esc(nama)}</strong>${asal.map(a => `<small class="sm-t sm-as-${esc(a)}">${esc(M.asalTeks(a))}</small>`).join("")}${o.belum ? '<small class="sm-t">belum teruji</small>' : ""}</span><span class="sm-sb2"><span>${esc(tg)}</span>${ket ? `<code>${esc(ket)}</code>` : ""}${o.cat ? `<span title="${esc(o.cat)}">${esc(o.cat.slice(0, 60))}</span>` : ""}</span></li>`;
  function sasaranHtml() { const b = st.banjir, tombol = `<button type="button" class="sm-tombol-garis" data-sm-tambah>${lb("target", "Tambah sasaran")}</button>`;
    if (!b || b.galat) return `<p class="sm-kosong-judul">prakiraan banjir belum tersedia</p><p class="sm-kecil">${esc(b?.galat === 401 || b?.galat === 403 ? "Masuk dulu dengan akun staf berperan." : "Berkas prakiraan banjir belum terbit untuk putaran ini.")}</p>${tombol}`;
    const t0 = b.hari_sasaran || wib(1), ss = (b.sasaran || []).map(s => { const tg = s.tenggang ?? (s.pantau ? 2 : 1), ket = [s.bnj_lv != null ? `level ${s.bnj_lv}` : "", s.hjn_p50 != null ? M.fmt(s.hjn_p50, 2) : ""].filter(Boolean).join(", ");
        return barisSasaran(s.nama || s.kab, s.asal || [], ket, `${hariRel(geser1(t0, tg - 1))}${M.pantau(s) ? ", pantau" : ""}`, {belum: s.belum_teruji}); }),
      mn = manualBaru().map(m => barisSasaran(namaB(m.kab), ["manual"], "", `${hariRel(m.tanggal)}, dihitung di putaran berikutnya`, {cat: m.catatan}));
    return ss.length || mn.length ? `<ul class="sm-sblist">${ss.join("")}${mn.join("")}</ul>${tombol}` : `<p class="sm-kosong-judul">${esc(M.judulKosongB(b.alasan_kosong))}</p><p class="sm-kecil">${esc(b.kalimat_kosong || M.kalimatKosongB(b.alasan_kosong, b.hari_sasaran))}</p>${tombol}`; }
  const zonaBTerpilih = () => st.banjir?.zona?.[st.zB] || null;
  function rekB() { const b = st.banjir, z = zonaBTerpilih();
    if (!b || b.galat || !z) { const a = b && !b.galat ? b.alasan_kosong : "tanpa_prakiraan"; return `<p class="sm-kosong-judul">${esc(M.judulKosongB(a))}</p><p class="sm-kecil">${esc((b && b.kalimat_kosong) || M.kalimatKosongB(a, b?.hari_sasaran))}</p>`; }
    const alasan = M.alasanB(z).filter(x => x[2]).map(([h, n, t]) => `<li><b class="sm-h sm-h${h}" aria-hidden="true">${h}</b><span><em>${n}</em>${esc(t)}${h === "B" && z.base?.terdaftar === false ? ' <small class="sm-t sm-oranye">bandara, bukan base terdaftar</small>' : ""}</span></li>`).join("");
    const lindung = (z.alasan?.sasaran || (z.cegat || []).map(c => c.kab)).map(namaB).join(", ");
    const renlap = [["awan", "Ketinggian", M.ketinggianTeks(z)], ["angin", "Bahan", "bahan dari BMKG"], ["target", "Sasaran", lindung || "belum tersedia"]].map(([k, n, t]) => `<div>${lb(k, n)}<span>${esc(t)}</span></div>`).join("");
    return `<small class="sm-lab">Rekomendasi</small><h4 class="sm-judul">Zona B${esc(z.huruf)}</h4><p class="sm-prov">${esc(z.prov || "")}${z.kota ? `, ${esc(z.kota)}` : ""}</p>
      <p class="sm-prov">Melindungi: ${esc(lindung || "belum tersedia")}</p>
      <div class="sm-skor"><b>${M.fmt(z.skor, 2)}</b><span class="sm-pil sm-hijau">${lb("jam", `terbang ${esc(M.jendela(z))}`)}</span><small class="sm-t">${z.laut ? "laut" : "darat"}</small>${z.belum_teruji ? '<small class="sm-t">belum teruji</small>' : ""}</div>
      <button type="button" class="sm-koor" data-sm-salin="${esc(M.salinKoordinat(z.lat, z.lon))}" title="Klik untuk menyalin koordinat"><span>${esc(M.dms(z.lat, z.lon))}</span><span>${esc(M.desimal(z.lat, z.lon))}</span></button>
      ${alasan ? `<h5 class="sm-sub">Alasan</h5><ul class="sm-alasan">${alasan}</ul>` : ""}<h5 class="sm-sub">Untuk renlap</h5><div class="sm-renlap">${renlap}</div>
      <div class="sm-aksi"><a class="sm-tombol-garis" href="/renlap-omc?zona=${encodeURIComponent(z.id)}" target="_blank" rel="noopener" title="Renlap OMC zona ini: rute terbang, ketinggian, PDF, KML, GPX">${lb("salin", "Renlap OMC")}</a></div>`; }
  const daftarZonaB = () => { const zs = st.banjir?.zona || [];
    return zs.length ? zs.map((z, i) => `<button type="button" class="sm-zr" data-sm-zonab="${i}" aria-current="${i === st.zB}"><b class="sm-zl sm-zlb">B${esc(z.huruf)}</b><span><strong>${esc(z.prov || "")}</strong><small>terbang ${esc(M.jendela(z).replace(/ (WIB|WITA|WIT)$/, ""))}, ${z.laut ? "laut" : "darat"}</small>${z.base?.nama ? `<small>dari ${esc(z.base.nama)}${z.base.menit != null ? `, sekitar ${M.fmt(z.base.menit)} menit` : ""}</small>` : ""}</span><code>${M.fmt(z.skor, 2)}</code></button>`).join("")
      : `<p class="sm-kecil">${esc((st.banjir && st.banjir.kalimat_kosong) || M.kalimatKosongB(st.banjir?.alasan_kosong, st.banjir?.hari_sasaran))}</p>`; };
  /* Tinjau: bobot Q H P digeser, skor dihitung ulang di peramban dari faktor yang sama (ALGORITMA §8) */
  const NAMA_BOBOT = [["Q", "Kualitas awan"], ["H", "Lepas sebelum sasaran"], ["P", "Paparan zona"]];
  const bobotNorm = () => M.normBobot(st.bobotB);
  function baruTinjau() { const b = st.banjir, w = bobotNorm(), zs = b?.zona || [], baru = M.hitungUlangBanjir(b, w);
    return {w, baru, baris: zs.map(z => ({id: `B${z.huruf}`, Q: z.Q, H: z.H, P: z.P, file: z.skor, baru: M.skorBanjir(z.Q, z.H, z.P, w)}))}; }
  function tinjauHtml() { const b = st.banjir; if (!b || b.galat) return `<p class="sm-kecil">Tersedia setelah prakiraan banjir terbit.</p>`;
    const sl = NAMA_BOBOT.map(([k, n], i) => `<label class="sm-sl"><span><b class="sm-h sm-h${k}" aria-hidden="true">${k}</b>${n}</span><input type="range" min="0" max="1" step="0.05" value="${st.bobotB[i]}" data-sm-bobot="${i}" aria-label="Bobot ${n}"><code id="smBw${i}"></code></label>`).join("");
    return `<div class="sm-sls">${sl}</div><p class="sm-kecil" id="smTj"></p><div class="tw sm-tw ex-tabel" id="smTt"></div><div class="sm-aksi"><button type="button" class="sm-tombol-garis" data-sm-csv>${lb("tabel", "Salin CSV")}</button></div>`; }
  function isiTinjau() { const t = baruTinjau(), w = t.w;
    NAMA_BOBOT.forEach((_, i) => { const e = $(`#smBw${i}`, akar); if (e) e.textContent = `${M.fmt(w[i] * 100)}%`; });
    const tj = $("#smTj", akar), tt = $("#smTt", akar); if (!tj || !tt) return;
    tj.textContent = `Dengan bobot ini zona dari kandidat: ${t.baru.length ? t.baru.map(z => `${M.fmt(z.skor, 2)} di ${M.desimal(z.lat, z.lon)}`).join("; ") : "tidak ada yang mencapai 0,35"}.`;
    tt.innerHTML = `<table class="sm-tabel"><thead><tr><th>Zona</th><th class="n" title="Kualitas awan">Q</th><th class="n" title="Lepas sebelum sasaran">H</th><th class="n" title="Paparan zona">P</th><th class="n" title="Skor di berkas">Skor berkas</th><th class="n" title="Skor dengan bobot di atas">Skor bobot ini</th></tr></thead><tbody>${t.baris.map(r => `<tr><td>${r.id}</td><td class="n">${M.fmt(r.Q, 2)}</td><td class="n">${M.fmt(r.H, 2)}</td><td class="n">${M.fmt(r.P, 2)}</td><td class="n">${M.fmt(r.file, 2)}</td><td class="n">${M.fmt(r.baru, 2)}</td></tr>`).join("")}</tbody></table>`; }
  const csvTinjau = () => { const t = baruTinjau(); return M.csv([["zona", "Q", "H", "P", "skor_berkas", `skor_bobot_${t.w.map(x => x.toFixed(2)).join("_")}`], ...t.baris.map(r => [r.id, r.Q, r.H, r.P, r.file, r.baru.toFixed(3)])]); };
  function geserBobot(el) { st.bobotB[+el.dataset.smBobot] = +el.value; NAMA_BOBOT.forEach((_, i) => { const e = $(`#smBw${i}`, akar); if (e) e.textContent = `${M.fmt(bobotNorm()[i] * 100)}%`; });
    cancelAnimationFrame(geserBobot.r); geserBobot.r = requestAnimationFrame(isiTinjau); }
  function isiBanjir() { const b = st.banjir, el = $("#smB", akar); if (!el || !b) return;
    if (el.dataset.siap !== (b.galat ? "g" : b.dibuat)) { el.dataset.siap = b.galat ? "g" : b.dibuat; st.zB = 0;
      el.innerHTML = `<div class="sm-kol">${kartu("smSas", "target", "Sasaran hari ini", sasaranHtml())}${kartu("smRekB", "banjir", "Rekomendasi", rekB())}</div><div class="sm-kol">${kartu("smZonaB", "zona", "Zona usulan 24 jam", `<div class="sm-zdaf" id="smZdafB">${daftarZonaB()}</div>`)}${kartu("smTinjau", "tabel", "Tinjau", tinjauHtml(), {lipat: true})}${kartu("smRapor", "tabel", "Rapor uji", `<p class="sm-kecil">memuat</p>`, {lipat: true})}</div>`;
      const rp = $("#smRapor", akar); if (rp) { rp.open = false; muatRapor().then(r => { const bd = $("#smRapor .ex-bd", akar); if (bd) bd.innerHTML = M.raporHtml(r); }); }
      const tj = $("#smTinjau", akar); if (tj) tj.open = false; (window.requestIdleCallback || (f => setTimeout(f, 200)))(isiTinjau);
      muatManualB(); namaKabMuat().then(n => { st.namaKab = n; const bd = $("#smSas .ex-bd", akar); if (bd) bd.innerHTML = sasaranHtml(); }); }
    pilihMarkerB(); }
  const pilihMarkerB = () => st.mkB.forEach((m, i) => m.getElement().classList.toggle("sm-pilih", i === st.zB));
  function pilihZonaB(i) { const z = st.banjir?.zona?.[i]; if (!z) return; st.zB = i;
    akar.querySelectorAll("[data-sm-zonab]").forEach(b => b.setAttribute("aria-current", String(+b.dataset.smZonab === i))); pilihMarkerB();
    requestAnimationFrame(() => { const rek = $("#smRekB .ex-bd", akar); if (rek) rek.innerHTML = rekB(); setLangkah(idxLangkah(z.langkah)); st.peta?.easeTo({center: [z.lon, z.lat], zoom: Math.max(st.peta.getZoom(), 6.5), duration: 600}); }); }
  async function muatManualB() { const a = [];
    for (const t of [wib(0), wib(1)]) { const r = await ambil(`/api/operasi/semai/sasaran?tanggal=${t}`); if (Array.isArray(r)) a.push(...r); }
    st.manualB = a; const bd = $("#smSas .ex-bd", akar); if (bd && a.length) bd.innerHTML = sasaranHtml(); }
  /* dialog Tambah sasaran: pencari kab/kota (datalist), tanggal hari ini atau besok, catatan <= 300 huruf */
  async function bukaSasaran() {
    let dlg = $("#smDlgS"); if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "smDlgS"; dlg.className = "ops-dlg sm-dlg"; ($("#opsLaporan") || document.body).append(dlg);
      dlg.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-sm-batal]")) dlg.close(); if (e.target.closest("[data-sm-simpans]")) simpanSasaran(dlg); }); }
    dlg.innerHTML = `<div class="ops-dlg-isi"><article class="ex ex-std sm-dk"><header class="ex-hd"><span class="ex-ey ops-ey-ik" role="img" aria-label="Sasaran">${sv("target")}</span><div class="ex-jd"><h3>Tambah sasaran banjir</h3><small class="sm-sj">Untuk akun pusdalops dan tmc</small></div></header><div class="ex-bd sm-form">
      <label>${lb("kota", "Kab/kota")}<input id="smKab" list="smKabL" autocomplete="off" placeholder="Ketik nama kab/kota" maxlength="80"><datalist id="smKabL"></datalist></label>
      <label>${lb("jam", "Tanggal")}<select id="smTglS"><option value="${wib(0)}">hari ini, ${wib(0)}</option><option value="${wib(1)}" selected>besok, ${wib(1)}</option></select></label>
      <label>${lb("tabel", "Catatan, boleh kosong")}<textarea id="smCatS" maxlength="300" rows="2"></textarea></label><p class="sm-galat" id="smGalatS" role="alert" hidden></p>
      <div class="sm-aksi"><button type="button" class="sm-tombol" data-sm-simpans>Simpan sasaran</button><button type="button" class="sm-tombol-garis" data-sm-batal>Batal</button></div></div></article></div>`;
    dlg.showModal();   // terbuka seketika; daftar kab menyusul
    st.namaKab = st.namaKab || await namaKabMuat(); const l = $("#smKabL", dlg); if (l && dlg.open) l.innerHTML = Object.values(st.namaKab).map(n => `<option value="${esc(n)}"></option>`).join(""); }
  async function simpanSasaran(dlg) { const g = $("#smGalatS", dlg), salah = t => { g.textContent = t; g.hidden = false; }, v = $("#smKab", dlg).value.trim().toLowerCase(), cat = $("#smCatS", dlg).value.trim(), tanggal = $("#smTglS", dlg).value;
    const kab = Object.entries(st.namaKab || {}).find(([k, n]) => n.toLowerCase() === v || k === v)?.[0]; if (!kab) return salah("Pilih kab/kota dari daftar yang muncul.");
    let r; try { r = await fetch("/api/operasi/semai/sasaran", {method: "POST", credentials: "same-origin", headers: {"Content-Type": "application/json"}, body: JSON.stringify({kab, tanggal, ...(cat ? {catatan: cat} : {})})}); } catch (e) { return salah("Tidak tersambung ke server. Coba lagi."); }
    if (!r.ok) { const j = await r.json().catch(() => ({})), t = {401: "Masuk dulu untuk menambah sasaran.", 403: "Akun ini tidak punya hak menambah sasaran.", 409: "Kab/kota itu sudah jadi sasaran untuk tanggal itu.", 429: "Batas sasaran hari ini sudah tercapai.", 503: "Fitur sasaran belum diaktifkan di server."}[r.status];
      return salah((typeof j.galat === "string" && j.galat) || t || j.error || `Tidak tersimpan (kode ${r.status}).`); }
    const j = await r.json().catch(() => ({})); st.manualB.push({id: j.id, kab, tanggal, catatan: cat}); dlg.close();
    toast((st.banjir?.sasaran || []).some(s => s.kab === kab) ? "Sasaran dicatat sebagai Pusdalops; kab itu sudah ada di daftar." : "Sasaran disimpan, dihitung di putaran berikutnya.");
    requestAnimationFrame(() => { const bd = $("#smSas .ex-bd", akar); if (bd) bd.innerHTML = sasaranHtml(); (window.requestIdleCallback || (f => setTimeout(f, 200)))(isiTinjau); }); }

  /* ---------------- dialog Jadikan target ---------------- */
  function bukaTarget() {
    const z = zonaTerpilih(); if (!z) return; const D = st.ctx?.D?.() || {}, bs = (D.peta?.base || []).filter(b => b.lat != null), omc = new Set((D.peta?.armada || []).filter(a => a.peran === "omc").map(a => a.base_id));
    const km = b => Math.hypot((b.lat - z.lat) * 111, (b.lon - z.lon) * 111 * Math.cos(z.lat * Math.PI / 180)), urut = (z.base?.id && !bs.some(b => b.id === z.base.id) ? [{id: z.base.id, nama: z.base.nama, icao: z.base.icao, lat: z.lat, lon: z.lon}] : []).concat(bs).sort((a, b) => (omc.has(b.id) - omc.has(a.id)) || km(a) - km(b)), bawaan = (z.base?.id && urut.find(b => b.id === z.base.id)) ? z.base.id : urut[0]?.id;
    const tgl = new Date(Date.parse(z.jendela?.[0] || st.data.dibuat) + 7 * 36e5).toISOString().slice(0, 10);
    let dlg = $("#smDlg"); if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "smDlg"; dlg.className = "ops-dlg sm-dlg"; ($("#opsLaporan") || document.body).append(dlg);
      dlg.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-sm-batal]")) dlg.close(); if (e.target.closest("[data-sm-simpan]")) simpan(dlg); }); }
    const alasan = `zona semai ${z.huruf}, skor ${M.fmt(z.skor, 2)}, putaran ${M.putaranTeks(st.data.putaran)}`;
    dlg.dataset.zona = z.id; dlg.innerHTML = `<div class="ops-dlg-isi"><article class="ex ex-std sm-dk"><header class="ex-hd"><span class="ex-ey ops-ey-ik" role="img" aria-label="Target">${sv("target")}</span><div class="ex-jd"><h3>Jadikan Zona ${esc(z.huruf)} target renlap OMC</h3><small class="sm-sj">${esc(z.prov || "")}, skor ${M.fmt(z.skor, 2)}</small></div></header><div class="ex-bd sm-form">
      <label>${lb("base", "Base")}<select id="smBase">${urut.map(b => `<option value="${esc(b.id)}" ${b.id === bawaan ? "selected" : ""}>${esc(b.nama)}${b.icao || (b.id === z.base?.id && z.base.icao) ? ` (${esc(b.icao || z.base.icao)})` : ""}${omc.has(b.id) ? ", armada OMC" : ""}</option>`).join("")}</select></label>
      <label>${lb("jam", "Tanggal renlap")}<input type="date" id="smTgl" value="${tgl}"></label>
      <div>${lb("jam", "Jendela terbang")}<span>${esc(M.jendela(z))}</span></div><div>${lb("kota", "Koordinat")}<span>${esc(M.desimal(z.lat, z.lon))}</span></div><div>${lb("info", "Alasan otomatis")}<span>${esc(alasan)}</span></div>
      <label>${lb("tabel", "Catatan, boleh kosong")}<textarea id="smCat" maxlength="500" rows="2"></textarea></label><p class="sm-galat" id="smGalat" role="alert" hidden></p>
      <div class="sm-aksi"><button type="button" class="sm-tombol" data-sm-simpan>Simpan target</button><button type="button" class="sm-tombol-garis" data-sm-batal>Batal</button></div></div></article></div>`;
    dlg.showModal();
  }
  async function simpan(dlg) {
    const z = (st.data.zona || []).find(x => x.id === dlg.dataset.zona), g = $("#smGalat", dlg), b = $("#smBase", dlg).value; if (!z) return;
    const salah = t => { g.textContent = t; g.hidden = false; };
    let r; try { r = await fetch("/api/operasi/semai/target", {method: "POST", credentials: "same-origin", headers: {"Content-Type": "application/json"}, body: JSON.stringify({zona_id: z.id, putaran: z.id.slice(0, 10), base_id: b, tanggal: $("#smTgl", dlg).value, ...($("#smCat", dlg).value.trim() ? {catatan: $("#smCat", dlg).value.trim()} : {})})}); } catch (e) { return salah("Tidak tersambung ke server. Coba lagi."); }
    if (!r.ok) { const j = await r.json().catch(() => ({})), t = {401: "Masuk dulu untuk menambah target.", 403: "Akun ini tidak punya hak menambah target renlap.", 404: "Simpan target belum bisa: rute target belum terbit di server. Tersedia sesudah deploy dan migrasi 0129.", 409: "Zona ini sudah jadi target di base itu.", 429: "Batas target hari ini sudah tercapai."}[r.status];
      return salah((typeof j.galat === "string" && j.galat) || t || j.error || `Gagal menyimpan (kode ${r.status}).`); }
    st.target[z.id] = true; dlg.close(); const bn = ((st.ctx?.D?.().peta?.base) || []).find(x => x.id === b)?.nama || b;
    if (zonaTerpilih() === z) $("#smRek .ex-bd", akar).innerHTML = rekomendasi(); const zd = $("#smZdaf", akar); if (zd) zd.innerHTML = daftarZona(); toast(`Target ditambahkan ke renlap ${bn} ${$("#smTgl", dlg).value}`);
  }
  async function muatTarget() { const h = new Date(Date.now() + 7 * 36e5), t = n => new Date(h.getTime() + n * 864e5).toISOString().slice(0, 10);
    for (const tg of [t(0), t(1)]) { const r = await ambil(`/api/operasi/semai/target?tanggal=${tg}`), a = Array.isArray(r) ? r : r?.target || r?.rows || []; for (const x of a) if (x.zona_id) st.target[x.zona_id] = true; }
    if (st.data) { const zd = $("#smZdaf", akar); if (zd) zd.innerHTML = daftarZona(); const rek = $("#smRek .ex-bd", akar); if (rek) rek.innerHTML = rekomendasi(); } }

  /* ---------------- pemasangan ---------------- */
  function pasangPendengar() {
    akar.addEventListener("click", e => {
      const sm = e.target.closest(".sm-lipat>summary"); if (sm) { e.stopPropagation(); return; }   // lipat sungguhan: pengendali kartu utama menahan klik kepala kartu
      let t;
      if ((t = e.target.closest("[data-sm-tujuan]"))) return setTujuan(t.dataset.smTujuan);
      if ((t = e.target.closest("[data-sm-zonab]"))) { t.setAttribute("aria-current", "true"); return pilihZonaB(+t.dataset.smZonab); }
      if (e.target.closest("[data-sm-tambah]")) return bukaSasaran();
      if (e.target.closest("[data-sm-csv]")) { navigator.clipboard?.writeText(csvTinjau()).then(() => toast("Tabel faktor disalin sebagai CSV"), () => toast("Salin tidak berhasil: izin papan klip ditolak")); return; }
      if ((t = e.target.closest("[data-sm-zona]"))) { t.setAttribute("aria-current", "true"); return pilihZona(+t.dataset.smZona); }
      if ((t = e.target.closest("[data-sm-kota]"))) return pilihKota(+t.dataset.smKota);
      if ((t = e.target.closest("[data-sm-salin]"))) { navigator.clipboard?.writeText(t.dataset.smSalin).then(() => toast(`Koordinat disalin: ${t.dataset.smSalin}`), () => toast("Salin gagal: izin papan klip ditolak")); return; }
      if (e.target.closest("[data-sm-ringkas]")) { navigator.clipboard?.writeText(st.tujuan === "banjir" ? M.ringkasanBanjir(st.banjir, manualBaru()) : M.ringkasan(st.data)).then(() => toast("Ringkasan disalin"), () => toast("Salin gagal: izin papan klip ditolak")); return; }
      if (e.target.closest("[data-sm-putar]")) return putar();
      if (e.target.closest("[data-sm-target]:not(:disabled)")) return bukaTarget();
      if (e.target.closest(".sm-lapis-hd") && matchMedia("(max-width:900px)").matches) { e.target.closest(".sm-lapis").classList.toggle("sm-tutup"); return; }
      if (e.target.closest("[data-sm-semuakota]")) { st.semuaKota = true; $("#smAsap .ex-bd", akar).innerHTML = peringatanAsap(); return; }
      if ((t = e.target.closest("[data-sm-chip]"))) { const k = t.dataset.smChip; if (k === "teramati") { st.luar = !st.luar; t.setAttribute("aria-pressed", String(st.luar)); requestAnimationFrame(terapMarker); } else setLapis(CHIPLAP[k], !st.tampak[CHIPLAP[k]]); return; }
      if (e.target.closest("[data-sm-semua]")) { st.semuaCluster = true; $("#smCluster .ex-bd", akar).innerHTML = tabelCluster(); return; }
      if ((t = e.target.closest("[data-sm-cluster]"))) { const c = (st.data.cluster || []).find(x => String(x.id) === t.dataset.smCluster); if (c?.lat != null) requestAnimationFrame(() => st.peta?.easeTo({center: [c.lon, c.lat], zoom: Math.max(st.peta.getZoom(), 7), duration: 600})); }
    });
    akar.addEventListener("input", e => { if (e.target.dataset.smBobot != null) return geserBobot(e.target); if (e.target.id === "smGeser") { if (st.play) putar(); setLangkah(+e.target.value); } });
    akar.addEventListener("change", e => { const lb2 = e.target.closest("[data-sm-lap]"); if (lb2) setLapis(lb2.dataset.smLap, e.target.checked); });
  }

  async function tampil(el, ctx) {
    st.ctx = ctx; if (akar === el && st.mulai) { requestAnimationFrame(() => { st.peta?.resize(); }); return; }
    clearInterval(st.play); st.play = 0; st.peta?.remove(); st.peta = null; st.terap = {}; st.mk = {zona: [], base: [], kota: []}; st.ada = {awan: true, asap: true}; st.kota = -1; st.mkB = []; st.zB = 0; st.manualB = [];
    akar = el; st.mulai = true; el.classList.add("sm"); el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat peluang semai…</div>`;
    const r = await ambil(BAWAH + "semai.json"), ok = r && !r.galat && r.putaran && r.dibuat;
    st.data = ok ? r : null; st.i = 0; st.zona = 0;
    if (ok) { const z = r.zona?.[0]; st.i = z ? idxLangkah(z.langkah) : 0; }
    bangun(); catJam();
    if (r?.galat === 401 || r?.galat === 403) { $("#smRek .ex-bd", akar).innerHTML = `<p class="sm-kosong-judul">hanya untuk akun staf berperan</p><p class="sm-kecil">Masuk dulu untuk melihat peluang semai.</p>`; }
    else if (r?.galat != null && r.galat !== 404 && r.galat !== 0) $("#smPita", akar).innerHTML = `<p class="sm-pita sm-pita-basi" role="status">${lb("peringatan", `Berkas prakiraan gagal dibaca (kode ${r.galat}).`)}</p>`;
    { const kp = $(".sm-lapis", akar); if (kp) geserPanel(kp, kp.querySelector(".sm-lapis-hd"), kp.parentElement); }
    pasangPendengar(); requestAnimationFrame(pasangPeta); muatTarget();
    if (st.tujuan === "banjir" && !st.data) muatBanjir().then(b => { st.banjir = b; terapTujuan(); });
    window.OpsSemaiHit = st.data?.zona?.length ? M.fmt(st.data.zona.length) : "–"; const b = $('[data-seksi="semai"]'); if (b && !b.querySelector("b")) b.insertAdjacentHTML("beforeend", `<b>${window.OpsSemaiHit}</b>`);
  }
  window.OpsSemai = {tampil, hentikan() { if (st.play) putar(); }};
})();
