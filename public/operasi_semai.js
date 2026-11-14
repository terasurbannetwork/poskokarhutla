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
  const IK = {awan: '<path d="M7 16a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 7a4.5 4.5 0 0 1-.5 9z"/><path d="M8 19v2M12 19v2M16 19v2"/>', api: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/>',
    asap: '<path d="M4 15a4 4 0 0 1 4-4 5 5 0 0 1 9.6-1A3.5 3.5 0 0 1 18 17H7a3 3 0 0 1-3-2z"/>', angin: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>', base: '<path d="M12 4 21 20H3z"/>', kota: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>',
    zona: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', salin: '<path d="M9 4h6v3H9z"/><path d="M15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', sortie: '<path d="M4 19c4-1 6-5 8-9s5-6 8-6"/><circle cx="4" cy="19" r="1.6"/>', tabel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', satelit: '<path d="m4 14 6 6M3 21l4-4M14 4l6 6M7 11l4 4-3 3-4-4zM13 5l6 6-3 3-6-6z"/>', putar: '<path d="M8 5v14l11-7z"/>', jeda: '<path d="M8 5v14M16 5v14"/>', peringatan: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>', geser: '<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>', cek: '<path d="m5 12 4 4 10-10"/>'};
  const sv = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[k] || ""}</svg>`;
  const lb = (k, t) => `<span class="sm-lbl">${sv(k)}${t}</span>`;
  const CHEV = '<svg class="ops-chev sm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const kartu = (id, ik, nama, isi, o = {}) => `<details class="ex ex-std ops-kartu sm-k${o.lipat ? " sm-lipat" : ""}" id="${id}" open><summary class="ex-hd"><span class="ex-ey ops-ey-ik" title="${esc(nama)}" aria-label="${esc(nama)}" role="img">${sv(ik)}</span><div class="ex-jd"><h3>${nama}</h3>${o.kanan || ""}</div>${o.lipat ? CHEV : ""}</summary><div class="ex-bd">${isi}</div></details>`;

  const st = {data: null, i: 0, zona: 0, kota: -1, peta: null, play: 0, rf: 0, ada: {awan: true, asap: true}, terap: {}, tampak: {api: true, awan: true, asap: true, pengarah: true, anginAsap: true, zona: true, kota: true}, target: {}, ctx: null, mk: {zona: [], base: [], kota: []}, semuaCluster: false, semuaKota: false, luar: false};
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
  const peranSeg = () => `<div class="seg sm-peran" role="group" aria-label="Tampilan peran"><button type="button" aria-pressed="true">${lb("kota", "Pos komando")}</button><button type="button" disabled title="Segera: SA-13">${lb("angin", "Tinjau BMKG")}</button><button type="button" disabled title="Segera: SA-13">${lb("satelit", "Mitra")}</button></div>`;
  function strip() { const d = st.data, zs = d.zona || [], cl = d.cluster || [], as = d.asap, u = M.umurJam(d.dibuat), f = d.sumber?.firms;
    const mw = d.api?.frp_mw ?? cl.reduce((t, c) => t + (+c.frp24 || 0), 0), t = (ik, n, v, c = "", ttl = "") => `<div class="sm-ub ${c}" title="${esc(ttl)}"><i>${sv(ik)}</i><span>${n}</span><b>${v}</b></div>`;
    return `<div class="sm-strip">${t("zona", "Zona", M.fmt(zs.length))}${t("cek", "Skor tertinggi", zs.length ? M.fmt(Math.max(...zs.map(z => z.skor)), 2) : "–")}${t("api", "Cluster besar", M.fmt(d.api?.n_cluster ?? cl.length))}${t("api", "Daya api, MW", M.fmt(mw))}${t("kota", "Kota berasap", as ? M.fmt(as.kota_total ?? (as.kota || []).length) : "–")}${t("asap", "Lintas batas", as?.lintas ? esc(M.namaNegara(as.lintas.negara)) : "–", as?.lintas ? "merah" : "", as ? (as.lintas ? "" : "Asap belum menyeberang ke negara lain 24 jam ke depan") : "Prakiraan asap belum tersedia")}${t("awan", "Putaran", esc(M.putaranTeks(d.putaran)))}${t("jam", "Umur data", u == null ? "–" : u < 1 ? "<1 j" : `${Math.round(u)} j`, u > 6 ? "oranye" : "", f ? `FIRMS ${f.jam ? M.hariJam(f.jam) : ""}` : "")}</div>`; }
  const legenda = () => { const f = st.data.sumber?.firms; return `<div class="sm-leg"><span><i class="sm-d" style="--w:#d7301f"></i>titik api di atas 40 MW</span><span><i class="sm-d" style="--w:#f28c28"></i>di bawahnya</span><span><i class="sm-seg3"></i>base</span><span><i class="sm-d sm-cincin"></i>zona</span>${f ? `<span class="sm-fi${f.jam && Date.now() - Date.parse(f.jam) > 6 * 36e5 ? " sm-basi" : ""}">${sv("satelit")}FIRMS VIIRS ${M.fmt(f.piksel)} piksel, ${f.satelit?.length ?? 0} dari ${(f.satelit?.length ?? 0) + (f.hilang?.length || 0)} satelit${f.hilang?.length ? `, belum masuk ${esc(f.hilang.join(", "))}` : ""}</span>` : `<span class="sm-fi sm-basi">${sv("satelit")}FIRMS belum tersedia</span>`}</div>`; };
  function bangun() {
    const d = st.data;
    const peta = d ? `<div class="sm-peta-bungkus"><div id="smPeta" class="sm-peta" aria-label="Peta peluang semai"></div><div class="sm-alat"><div class="sm-chips" role="group" aria-label="Lapisan dan saringan">${pilAtas()}</div><div class="sm-alat-r">${peranSeg()}<button type="button" class="sm-tombol-garis" data-sm-ringkas>${lb("salin", "Salin ringkasan")}</button></div></div>${kotakLapis()}<div class="sm-dasar">${legenda()}${bilahJam()}${strip()}</div></div>`
      : `<div class="sm-atas"><div class="sm-sumber">${sumber(null)}</div><button type="button" class="sm-tombol-garis" data-sm-ringkas>${lb("salin", "Salin ringkasan")}</button></div><p class="sm-kecil sm-peta-kosong">Peta tersedia setelah prakiraan terbit.</p>`;
    akar.innerHTML = `<span class="sm-toast" id="smToast" role="status" aria-live="polite" hidden></span><div id="smPita">${pitaBasi(d)}</div>${kartu("smKP", "awan", "Peta peluang semai", peta)}
      <div class="sm-baris3">${kartu("smRek", "awan", "Rekomendasi", rekomendasi())}<div class="sm-kanan2">${kartu("smZona", "zona", "Zona usulan 24 jam", `<div class="sm-zdaf" id="smZdaf">${daftarZona()}</div>`)}${kartu("smAsap", "asap", "Peringatan asap", peringatanAsap())}</div></div>
      <div class="sm-bawah">${kartu("smCluster", "tabel", "Cluster aktif", tabelCluster())}<div class="sm-lipatan">${kartu("smCara", "info", "Cara memutuskan", CARA, {lipat: true})}${kartu("smTak", "peringatan", "Yang tidak terlihat satelit dan model", TAK, {lipat: true})}</div></div>`;
    for (const x of akar.querySelectorAll(".sm-lipat")) x.open = false;
  }
  const LAP = [["api", "api", "Titik api", "#d7301f"], ["awan", "awan", "Awan layak semai", "#2b7bd8"], ["asap", "asap", "Prakiraan asap", "#6e5426"], ["pengarah", "angin", "Angin pengarah (850 sampai 700 hPa)", "#8a94a6"], ["anginAsap", "angin", "Angin asap (10 m dan 850 hPa)", "#a88b5a"], ["zona", "zona", "Zona semai", "#a63a26"], ["kota", "base", "Kota dan base", "#0b2545"]];
  const kotakLapis = () => `<div class="sm-lapis${matchMedia("(max-width:900px)").matches ? " sm-tutup" : ""}" role="group" aria-label="Lapisan peta"><b class="sm-lapis-hd" title="Tarik untuk menggeser, klik dua kali untuk mengembalikan">${sv("geser")}Lapisan</b>${LAP.map(([k, ik, t, w]) => `<label class="sm-ls" data-sm-lap="${k}"><input type="checkbox" ${st.tampak[k] ? "checked" : ""}><i style="--w:${w}"></i><span>${t}</span></label>`).join("")}</div>`;
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
      (window.requestIdleCallback || (f => setTimeout(f, 800)))(() => { for (const l of L()) for (const j of ["awan", "asap"]) if (l !== l0 && st.ada[j]) new Image().src = urlR(j, l); });
    });
    for (const j of ["awan", "asap"]) { const im = new Image(); im.onerror = () => { st.ada[j] = false; const cb = $(`[data-sm-lap="${j === "awan" ? "awan" : "asap"}"]`, akar); if (cb) { cb.classList.add("sm-mati"); cb.title = "belum tersedia"; cb.querySelector("input").disabled = true; } if (peta.getLayer("sm-" + j)) peta.setLayoutProperty("sm-" + j, "visibility", "none"); }; im.src = urlR(j, L()[st.i]); }
  }
  const terapMarker = () => { const a = st.tampak; st.mk.zona.forEach((m, i) => { m.getElement().hidden = !a.zona || (st.luar && !M.teramati(st.data.zona[i])); }); for (const m of [...st.mk.base, ...st.mk.kota]) m.getElement().hidden = !a.kota; };
  /* pratinjau rute OMC zona terpilih (ALGORITMA §7c, dihitung semai.py) */
  const ruteFc = z => fc(z?.rute ? [{type: "Feature", properties: {}, geometry: {type: "LineString", coordinates: z.rute.cp.map(c => [c.lon, c.lat])}}] : []);
  const pilihMarker = () => st.mk.zona.forEach((m, i) => m.getElement().classList.toggle("sm-pilih", i === st.zona));
  function gantiRaster() { const l = L()[st.i], p = st.peta; if (!p?.getSource) return;
    for (const j of ["awan", "asap"]) if (st.tampak[j] && st.ada[j] && st.terap[j] !== l && p.getSource("sm-" + j)) { p.getSource("sm-" + j).updateImage({url: urlR(j, l), coordinates: KOOR}); st.terap[j] = l; } }
  function gantiAngin() { const p = st.peta; if (!p?.getSource) return;
    for (const [k, g] of [["pengarah", st.data.angin], ["anginAsap", st.data.angin_asap || st.data.asap?.angin_asap]]) if (st.tampak[k] && p.getSource("sm-" + k) && st.terap["a" + k] !== st.i) { p.getSource("sm-" + k).setData(panah(g, st.i)); st.terap["a" + k] = st.i; } }
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
      if ((t = e.target.closest("[data-sm-zona]"))) { t.setAttribute("aria-current", "true"); return pilihZona(+t.dataset.smZona); }
      if ((t = e.target.closest("[data-sm-kota]"))) return pilihKota(+t.dataset.smKota);
      if ((t = e.target.closest("[data-sm-salin]"))) { navigator.clipboard?.writeText(t.dataset.smSalin).then(() => toast(`Koordinat disalin: ${t.dataset.smSalin}`), () => toast("Salin gagal: izin papan klip ditolak")); return; }
      if (e.target.closest("[data-sm-ringkas]")) { navigator.clipboard?.writeText(M.ringkasan(st.data)).then(() => toast("Ringkasan disalin"), () => toast("Salin gagal: izin papan klip ditolak")); return; }
      if (e.target.closest("[data-sm-putar]")) return putar();
      if (e.target.closest("[data-sm-target]:not(:disabled)")) return bukaTarget();
      if (e.target.closest(".sm-lapis-hd") && matchMedia("(max-width:900px)").matches) { e.target.closest(".sm-lapis").classList.toggle("sm-tutup"); return; }
      if (e.target.closest("[data-sm-semuakota]")) { st.semuaKota = true; $("#smAsap .ex-bd", akar).innerHTML = peringatanAsap(); return; }
      if ((t = e.target.closest("[data-sm-chip]"))) { const k = t.dataset.smChip; if (k === "teramati") { st.luar = !st.luar; t.setAttribute("aria-pressed", String(st.luar)); requestAnimationFrame(terapMarker); } else setLapis(CHIPLAP[k], !st.tampak[CHIPLAP[k]]); return; }
      if (e.target.closest("[data-sm-semua]")) { st.semuaCluster = true; $("#smCluster .ex-bd", akar).innerHTML = tabelCluster(); return; }
      if ((t = e.target.closest("[data-sm-cluster]"))) { const c = (st.data.cluster || []).find(x => String(x.id) === t.dataset.smCluster); if (c?.lat != null) requestAnimationFrame(() => st.peta?.easeTo({center: [c.lon, c.lat], zoom: Math.max(st.peta.getZoom(), 7), duration: 600})); }
    });
    akar.addEventListener("input", e => { if (e.target.id === "smGeser") { if (st.play) putar(); setLangkah(+e.target.value); } });
    akar.addEventListener("change", e => { const lb2 = e.target.closest("[data-sm-lap]"); if (lb2) setLapis(lb2.dataset.smLap, e.target.checked); });
  }

  async function tampil(el, ctx) {
    st.ctx = ctx; if (akar === el && st.mulai) { requestAnimationFrame(() => { st.peta?.resize(); }); return; }
    clearInterval(st.play); st.play = 0; st.peta?.remove(); st.peta = null; st.terap = {}; st.mk = {zona: [], base: [], kota: []}; st.ada = {awan: true, asap: true}; st.kota = -1;
    akar = el; st.mulai = true; el.classList.add("sm"); el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat peluang semai…</div>`;
    const r = await ambil(BAWAH + "semai.json"), ok = r && !r.galat && r.putaran && r.dibuat;
    st.data = ok ? r : null; st.i = 0; st.zona = 0;
    if (ok) { const z = r.zona?.[0]; st.i = z ? idxLangkah(z.langkah) : 0; }
    bangun(); catJam();
    if (r?.galat === 401 || r?.galat === 403) { $("#smRek .ex-bd", akar).innerHTML = `<p class="sm-kosong-judul">hanya untuk akun staf berperan</p><p class="sm-kecil">Masuk dulu untuk melihat peluang semai.</p>`; }
    else if (r?.galat != null && r.galat !== 404 && r.galat !== 0) $("#smPita", akar).innerHTML = `<p class="sm-pita sm-pita-basi" role="status">${lb("peringatan", `Berkas prakiraan gagal dibaca (kode ${r.galat}).`)}</p>`;
    { const kp = $(".sm-lapis", akar); if (kp) geserPanel(kp, kp.querySelector(".sm-lapis-hd"), kp.parentElement); }
    pasangPendengar(); requestAnimationFrame(pasangPeta); muatTarget();
    window.OpsSemaiHit = st.data?.zona?.length ? M.fmt(st.data.zona.length) : "–"; const b = $('[data-seksi="semai"]'); if (b && !b.querySelector("b")) b.insertAdjacentHTML("beforeend", `<b>${window.OpsSemaiHit}</b>`);
  }
  window.OpsSemai = {tampil, hentikan() { if (st.play) putar(); }};
})();
