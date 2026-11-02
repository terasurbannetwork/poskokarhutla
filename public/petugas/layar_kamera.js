/* L3 Daftar wajah dan L4 Absen. Kamera depan, kerja wajah di wajah.js (requestAnimationFrame). Tombol langsung berubah keadaan; pekerjaan berat sesudah dua frame (nanti).
   Vektor wajah hanya di memori sampai terkirim (absen luring: di antrean IndexedDB sampai server menjawab); tidak pernah ditampilkan. */
import {$, esc, kirimForm, ambilKonst, nanti} from "./umum.js";
import {pesanGalat, hasilAbsen, keMs, pilihTugas} from "./murni.js";
import {TEKS_ARAH, badanWajah} from "./wajah_murni.js";
import {muatAntispoofBatas} from "./antispoof.js";
import {muatHuman, bukaKamera, daftarArah, pindaiAbsen, salinFoto, VERSI_MODEL} from "./wajah.js";
import {barisStempel, fotoBerstempel, keJpeg, teksJam} from "./stempel.js";
import {sampelGps} from "./gps.js";
import {mintaNonce, nonceLuring, selisihTerakhir, simpanAbsen, bentukForm, kirimTertunda, hitungAntre} from "./luring.js";
import {ik} from "./ikon.js";

const offsetMenit = () => -new Date().getTimezoneOffset();
const acakId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const kamera = (judul, bawah = "") => `<section class="lp-kartu lp-kamera-kartu"><h2>${esc(judul)}</h2>
  <div class="lp-kamera" data-arah="depan" id="lpKamera"><video id="lpVideo" playsinline muted autoplay></video>
    <div class="lp-pemandu" id="lpPemandu"></div><span class="lp-panah" id="lpPanah" aria-hidden="true">${ik("panah", 44)}</span>
    <p class="lp-perintah" id="lpPerintah">Menyiapkan kamera...</p></div>
  ${bawah}</section>`;

/* tulis hanya bila berubah: ratusan frame per detik tidak boleh memicu tata letak ulang */
const tulis = (el, teks) => { if (el && el.textContent !== teks) el.textContent = teks; };

/* ================================================================ L3 Daftar wajah */
const URUT_NAMA = {depan: "Depan", kiri: "Kiri", kanan: "Kanan", atas: "Atas", bawah: "Bawah"};

export function layarDaftar(ctx) {
  const {tampil, kode} = ctx;
  const sinyal = {}; let cam = null, mati = false;
  ctx.pasangBersih(() => { mati = true; sinyal.henti?.(); cam?.henti(); });
  tampil(`${ctx.infoHtml()}${kamera("Daftar wajah", `<ol class="lp-progres-arah" id="lpProgres" aria-label="Lima arah wajah">${["depan", "kiri", "kanan", "atas", "bawah"].map(a => `<li data-a="${a}"><span class="lp-titik">${ik("centang", 16)}</span>${URUT_NAMA[a]}</li>`).join("")}</ol>
    <p class="lp-kecil" id="lpStatus" role="status">Lepas kacamata dan topi bila ada. Cari tempat yang terang.</p>
    <button class="lp-tautan" id="lpBatal" type="button">Batal</button>`)}`);
  $("lpBatal").addEventListener("click", () => ctx.pindah("setuju"));
  const ulangi = () => ctx.pindah("daftar");
  const galat = (teks) => { cam?.henti(); $("lpKamera").classList.add("galat"); tulis($("lpPerintah"), teks); $("lpStatus").insertAdjacentHTML("afterend", `<button class="lp-tbl utama" id="lpUlangi" type="button">Ulangi</button>`); $("lpUlangi").addEventListener("click", ulangi); };

  nanti(async () => {
    try {
      const konst = await ambilKonst(), video = $("lpVideo");
      cam = await bukaKamera(video, {depan: true});
      if (mati) { cam.henti(); return; }
      tulis($("lpPerintah"), "Memuat model wajah (sekali saja, sekitar 10 MB)...");
      await muatHuman();
      if (mati) return;
      const hasil = {}; let foto = null, arahDiminta = [...konst.arah];
      for (;;) {
        for (const arah of arahDiminta) {
          const kam = $("lpKamera"); if (!kam) return;
          kam.dataset.arah = arah; kam.classList.remove("ok");
          tulis($("lpPerintah"), TEKS_ARAH[arah]);
          const li = document.querySelector(`#lpProgres [data-a="${arah}"]`); li?.classList.remove("selesai"); li?.setAttribute("aria-current", "step");
          const r = await daftarArah({video, konst, arah, sinyal, onInfo: i => {
            tulis($("lpPerintah"), i.mutuOk && !i.sudutOk ? TEKS_ARAH[arah] : i.teks);
            $("lpKamera")?.classList.toggle("ok", i.mutuOk && i.sudutOk);
            const st = $("lpStatus"); if (st) tulis(st, i.ulang ? "Waktunya habis, ulangi arah ini pelan-pelan." : `Arah ${URUT_NAMA[arah].toLowerCase()}: ${i.jumlah} dari ${i.perlu}`);
          }});
          hasil[arah] = r;
          if (arah === "depan") foto = await keJpeg(salinFoto(video));
          li?.classList.add("selesai"); li?.removeAttribute("aria-current");
          $("lpKamera")?.classList.add("ok");
        }
        tulis($("lpPerintah"), "Mengirim..."); tulis($("lpStatus"), "Jangan tutup halaman ini.");
        cam.henti();
        const f = new FormData(); f.append("data", JSON.stringify(badanWajah(konst, VERSI_MODEL, hasil))); f.append("foto", foto, "acuan.jpg");
        const r = await kirimForm("/api/petugas/wajah", f, {kode});
        if (mati) return;
        if (r.status === 422 && Array.isArray(r.data.arah) && r.data.arah.length) {
          /* server minta arah tertentu diulang: kamera dibuka lagi, arah lain dipertahankan di memori */
          arahDiminta = r.data.arah.filter(a => konst.arah.includes(a)); if (!arahDiminta.length) return galat(r.data.galat || "Pendaftaran belum lolos. Ulangi.");
          tulis($("lpStatus"), `Perlu diulang: ${arahDiminta.map(a => URUT_NAMA[a].toLowerCase()).join(", ")}.`);
          cam = await bukaKamera(video, {depan: true}); if (mati) { cam.henti(); return; } continue;
        }
        if (!r.ok) return galat(r.data?.galat || pesanGalat(r.status));
        ctx.saya.orang.wajah_status = "terdaftar";
        ctx.pindah("beranda", "Wajahmu sudah terdaftar. Sekarang kamu bisa absen.");
        return;
      }
    } catch (e) { if (!e.batal && !mati) galat(e.kamera ? e.message : "Pendaftaran terhenti. Muat ulang halaman lalu ulangi."); }
  });
}

/* ================================================================ L4 Absen */
export function layarAbsen(ctx, jenis) {
  const {tampil, kode, saya} = ctx, tugas = pilihTugas(saya.tugas, ctx.tugasId);
  const sinyal = {}; let cam = null, mati = false, fotoUrl = null;
  ctx.pasangBersih(() => { mati = true; sinyal.henti?.(); cam?.henti(); if (fotoUrl) URL.revokeObjectURL(fotoUrl); });
  const j = jenis === "pulang" ? "pulang" : "masuk";
  if (!tugas) return ctx.pindah("beranda", "Belum ada tugas hari ini.");
  tampil(`${ctx.infoHtml()}<div id="lpAbsen">${kamera(`Absen ${j}`, `<div class="lp-gps" id="lpGps" role="status"><span class="lp-gps-titik"></span><span class="lp-gps-titik"></span><span class="lp-gps-titik"></span><span id="lpGpsTeks" class="lp-kecil">Lokasi dicari saat pindai wajah</span></div>
    <button class="lp-tautan" id="lpBatal" type="button">Batal</button>`)}</div>`);
  $("lpBatal").addEventListener("click", () => ctx.pindah("beranda"));
  const akar = $("lpAbsen");
  const galat = (teks, mintaUlang = true) => { cam?.henti(); akar.innerHTML = `<section class="lp-kartu lp-kosong"><h2>Absen belum terkirim</h2><p>${esc(teks)}</p>${mintaUlang ? `<button class="lp-tbl utama" id="lpUlangi" type="button">Ulangi</button>` : ""}<button class="lp-tautan" id="lpKembali" type="button">Kembali ke beranda</button></section>`; $("lpUlangi")?.addEventListener("click", () => ctx.pindah(j === "pulang" ? "pulang" : "masuk")); $("lpKembali").addEventListener("click", () => ctx.pindah("beranda")); };

  nanti(async () => {
    try {
      const konst = await ambilKonst(), video = $("lpVideo");
      cam = await bukaKamera(video, {depan: true});
      if (mati) { cam.henti(); return; }
      /* nonce: daring = satu nonce baru; tanpa sinyal = satu dari simpanan 6 nonce luring */
      let luring = !navigator.onLine, nonce = null, selisih = 0;
      if (!luring) {
        const n = await mintaNonce(kode);
        if (n.ok) { nonce = n.nonce; selisih = n.selisih; }
        else if (n.status === 0) luring = true;
        else return galat(n.galat || pesanGalat(n.status));
      }
      if (luring) {
        nonce = await nonceLuring(); selisih = await selisihTerakhir();
        if (!nonce) return galat("Belum ada sesi absen tanpa sinyal di HP ini. Hubungkan ke internet sekali, buka halaman ini, lalu coba lagi.", false);
      }
      tulis($("lpPerintah"), "Memuat model wajah...");
      await muatHuman();
      if (mati) return;
      tulis($("lpPerintah"), "Menyiapkan pemeriksaan keaslian...");
      await muatAntispoofBatas().catch(() => {});   // gagal/lambat: skor 0, server menandai tinjau
      if (mati) return;
      const titik = [...document.querySelectorAll(".lp-gps-titik")], teksGps = $("lpGpsTeks");
      const gpsP = sampelGps(konst, n => { titik.forEach((el, i) => el.classList.toggle("isi", i < n)); tulis(teksGps, `Mencari lokasi (${n} dari ${konst.gps.sampel})`); });
      gpsP.catch(() => {});   // galat ditangani di await di bawah; cegah peringatan "unhandled" bila pindai lebih dulu selesai
      tulis(teksGps, `Mencari lokasi (0 dari ${konst.gps.sampel})`);
      const scan = await pindaiAbsen({video, konst, tantangan: nonce.tantangan, sinyal, onInfo: i => {
        tulis($("lpPerintah"), i.teks);
        $("lpKamera")?.classList.toggle("ok", i.tahap !== "depan" || !!i.mutuOk);
      }});
      cam.henti();
      tulis($("lpPerintah"), "Menyiapkan foto...");
      let sampel; try { sampel = await gpsP; } catch (e) { return galat(e.message); }
      const waktuHp = Date.now();
      const baris = barisStempel({waktuMs: waktuHp, selisihMs: selisih, offsetMenit: offsetMenit(), gps: sampel.at(-1), wilayah: tugas?.wilayah_teks, nama: saya.orang.nama, tugas: tugas?.judul});
      const foto = await fotoBerstempel(scan.foto, baris);
      if (mati) return;
      const data = {nonce: nonce.nonce, jenis: j, tugas_id: tugas.id, vektor: scan.vektor, versi_model: scan.versi_model, tantangan_lolos: scan.tantangan_lolos, skor_hidup: scan.skor_hidup,
        sampel: sampel.map(s => ({lat: s.lat, lon: s.lon, akurasi: s.akurasi, waktu: s.waktu})), zona: Intl.DateTimeFormat().resolvedOptions().timeZone || "", waktu_hp: waktuHp, luring};
      pratinjau(akar, ctx, {foto, data, j, luring, selisih, nonce, mati: () => mati, setUrl: u => { fotoUrl = u; }});
    } catch (e) { if (!e.batal && !mati) galat(e.kamera || e.habis ? e.message : "Pindai wajah terhenti. Muat ulang halaman lalu ulangi."); }
  });
}

/* pratinjau foto berstempel, lalu kirim. Gagal jaringan: simpan di antrean (vektor ikut sampai terkirim) */
function pratinjau(akar, ctx, {foto, data, j, luring, mati, setUrl}) {
  const url = URL.createObjectURL(foto); setUrl(url);
  akar.innerHTML = `<section class="lp-kartu"><h2>Periksa fotomu</h2><img class="lp-foto" src="${url}" alt="Foto absen berstempel waktu dan lokasi">
    <div class="lp-dua"><button class="lp-tbl utama" id="lpKirim" type="button">${luring ? "Simpan di HP" : "Kirim absen"}</button><button class="lp-tbl" id="lpUlang" type="button">Ulangi pindai</button></div>
    ${luring ? `<p class="lp-kecil">Tanpa sinyal. Absen disimpan di HP dan terkirim otomatis saat ada sinyal.</p>` : ""}</section>`;
  $("lpUlang").addEventListener("click", () => ctx.pindah(j === "pulang" ? "pulang" : "masuk"));
  $("lpKirim").addEventListener("click", () => {
    const b = $("lpKirim"); b.disabled = true; $("lpUlang").disabled = true; b.classList.add("kerja"); b.textContent = luring ? "Menyimpan..." : "Mengirim...";
    nanti(async () => {
      let mode = luring ? "simpan" : "kirim", d = data;
      if (mode === "kirim") {
        const r = await kirimForm("/api/petugas/absen", bentukForm(d, foto), {kode: ctx.kode});
        if (mati()) return;
        if (r.ok) return tampilHasil(akar, ctx, r.data, j);
        if (r.status !== 0) { akar.innerHTML = ""; return ctx.pindah("beranda", r.data?.galat || pesanGalat(r.status)); }
        mode = "simpan";   // jaringan putus saat kirim: jatuh ke antrean, pakai nonce luring bila ada (nonce daring cuma 5 menit)
        const n = await nonceLuring(); if (n) d = {...d, nonce: n.nonce};
      }
      try { await simpanAbsen({id: acakId(), dibuat: Date.now(), data: {...d, luring: true}, foto}); }
      catch (e) { akar.innerHTML = `<section class="lp-kartu lp-kosong"><h2>Tidak bisa disimpan</h2><p>Penyimpanan HP penuh atau dimatikan. Ulangi saat ada sinyal.</p><button class="lp-tbl utama" id="lpKembali" type="button">Kembali ke beranda</button></section>`; $("lpKembali").addEventListener("click", () => ctx.pindah("beranda")); return; }
      const n = await hitungAntre();
      akar.innerHTML = `<section class="lp-kartu lp-hasil kuning" role="status">${ik("sinyal", 36)}<h2>Tersimpan di HP</h2><p>Terkirim otomatis saat ada sinyal. ${n} absen menunggu.</p><button class="lp-tbl utama" id="lpKembali" type="button">Kembali ke beranda</button></section>`;
      $("lpKembali").addEventListener("click", () => ctx.pindah("beranda"));
    });
  });
}

function tampilHasil(akar, ctx, r, j) {
  const jam = Number.isFinite(keMs(r.waktu)) ? teksJam(keMs(r.waktu), offsetMenit()) : "";
  const h = hasilAbsen(r, j, jam);
  akar.innerHTML = `<section class="lp-kartu lp-hasil ${h.kelas}" role="status">${ik(h.kelas === "hijau" ? "cek" : h.kelas === "merah" ? "silang" : "tanda", 36)}<h2>${esc(h.judul)}</h2>
    ${h.kelas === "kuning" ? `<p class="lp-kecil">Peninjau akan memeriksanya. Kamu tidak perlu mengulang.</p>` : h.kelas === "merah" ? `<p class="lp-kecil">Ulangi dari awal bila ini keliru.</p>` : ""}
    <button class="lp-tbl utama" id="lpKembali" type="button">Kembali ke beranda</button></section>`;
  $("lpKembali").addEventListener("click", () => ctx.pindah("beranda"));
}
