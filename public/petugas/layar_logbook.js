/* L5 Logbook dan L6 Riwayat. Foto logbook selalu dari kamera langsung (kamera belakang), tanpa pilihan galeri, berstempel waktu server + lokasi.
   Foto dari kanvas tidak membawa EXIF, jadi metadata lokasi/waktu dikirim terpisah di foto_meta (bacaExif tidak dipakai). */
import {$, esc, api, kirimForm, nanti, ambilKonst} from "./umum.js";
import {pesanGalat, teksAlasan, barisRiwayat} from "./murni.js";
import {kitTugas, rapikanKit} from "./panggil_murni.js";
import {KEGIATAN, KENDALA, KEBUTUHAN, kondisiUntuk, BATAS, rapikanLogbook, sudahTerkunci, metaFoto} from "./logbook_murni.js";
import {pilihTugas} from "./murni.js";
import {bukaKamera, salinFoto} from "./wajah.js";
import {barisStempel, fotoBerstempel, tanggalLokal, teksJam, teksWaktu} from "./stempel.js";
import {satuTitik} from "./gps.js";
import {selisihTerakhir} from "./luring.js";
import {ik} from "./ikon.js";

const offsetMenit = () => -new Date().getTimezoneOffset();

/* deret pilihan penuh lebar, terbagi rata, berikon. jenis: radio (satu) atau checkbox (banyak) */
const deret = (nama, label, opsi, jenis, wajib = false) => `<fieldset class="lp-chips" data-nama="${nama}"><legend>${esc(label)}${wajib ? ` <span class="lp-wajib">wajib</span>` : ""}</legend>
  ${opsi.map(o => `<label class="lp-chip"><input type="${jenis}" name="${nama}" value="${esc(o.k)}"><span>${ik(o.ikon || "tambah", 20)}${esc(o.label)}</span></label>`).join("")}<p class="lp-galat" data-galat="${nama}" role="alert" hidden></p></fieldset>`;

const ambilPilihan = (akar, nama) => [...akar.querySelectorAll(`input[name="${nama}"]:checked`)].map(x => x.value);

export async function layarLogbook(ctx) {
  const {tampil, saya} = ctx, tugas = pilihTugas(saya.tugas, ctx.tugasId);
  if (!tugas) return ctx.pindah("beranda", "Belum ada tugas hari ini.");
  const hi = saya.hari_ini?.logbook;
  const fotos = []; let cam = null, mati = false, membuka = false;
  ctx.pasangBersih(() => { mati = true; cam?.henti(); fotos.forEach(f => URL.revokeObjectURL(f.url)); });
  if (hi?.terkunci) {
    tampil(`${ctx.infoHtml()}<section class="lp-kartu lp-kosong"><h2>Logbook hari ini terkunci</h2><p>Logbook hanya bisa disunting sampai 23.59 di hari yang sama.</p><button class="lp-tbl utama" id="lpKembali" type="button">Kembali ke beranda</button></section>`);
    $("lpKembali").addEventListener("click", () => ctx.pindah("beranda")); return;
  }
  const WIB = 420, tanggal = tanggalLokal(Date.now() + await selisihTerakhir(), WIB), konst = await ambilKonst(), kondisi = kondisiUntuk(tugas.bencana, konst), kit = kitTugas(saya);
  tampil(`${ctx.infoHtml()}<form class="lp-kartu lp-form" id="lpForm" novalidate>
    <h2>Logbook ${esc(tugas.judul || "")}</h2>
    <p class="lp-kecil">${esc(teksWaktu(Date.now(), offsetMenit()).slice(0, 16))}. ${hi ? "Logbook hari ini sudah ada. Mengirim lagi memperbaruinya, isi ulang semua bagian." : "Bisa disunting sampai 23.59 hari ini."}</p>
    ${deret("kegiatan", "Jenis kegiatan", KEGIATAN(konst), "radio", true)}
    <label class="lp-bidang" for="lpUraian">Uraian kegiatan <span class="lp-wajib">wajib</span></label>
    <textarea id="lpUraian" maxlength="${BATAS.uraianMaks}" rows="5" placeholder="Apa yang kamu kerjakan, di mana, bersama siapa"></textarea><p class="lp-galat" data-galat="uraian" role="alert" hidden></p>
    <label class="lp-bidang" for="lpHasil">Hasil</label>
    <textarea id="lpHasil" maxlength="${BATAS.hasilMaks}" rows="3" placeholder="Hasil yang dicapai hari ini"></textarea>
    ${deret("kendala", "Kendala", KENDALA(konst), "checkbox")}
    ${deret("kebutuhan", "Kebutuhan", KEBUTUHAN(konst), "checkbox")}
    ${kit.length ? `<fieldset class="lp-kit" data-nama="kit"><legend>Alat yang dibawa regu</legend>${kit.map(k => `<div class="lp-kit-baris"><label class="lp-chip"><input type="checkbox" name="kit" value="${esc(k.id)}"><span>${ik("alat", 20)}${esc(k.nama)}</span></label><input class="lp-kit-jumlah" data-kit-jumlah="${esc(k.id)}" inputmode="numeric" autocomplete="off" value="1" aria-label="Jumlah ${esc(k.nama)}" disabled></div>`).join("")}<p class="lp-galat" data-galat="kit" role="alert" hidden></p></fieldset>` : ""}
    ${kondisi.length ? `<h3>Kondisi lapangan</h3>${kondisi.map(f => f.jenis === "pilih" ? deret(f.k, f.label, f.opsi, "radio", !!f.wajib)
      : `<label class="lp-bidang" for="lpK_${f.k}">${esc(f.label)}${f.wajib ? ` <span class="lp-wajib">wajib</span>` : ""}</label><input id="lpK_${f.k}" data-kondisi="${f.k}" inputmode="numeric" autocomplete="off" placeholder="${f.min} sampai ${f.maks}"><p class="lp-galat" data-galat="${f.k}" role="alert" hidden></p>`).join("")}` : ""}
    <h3>Foto berstempel <span class="lp-wajib">${BATAS.fotoMin} sampai ${BATAS.fotoMaks}</span></h3>
    <div id="lpFotoKotak"></div>
    <p class="lp-galat" data-galat="foto" role="alert" hidden></p>
    <button class="lp-tbl utama besar" id="lpSimpan" type="submit">Simpan logbook</button>
  </form>`);
  const form = $("lpForm");
  form.addEventListener("change", e => { const c = e.target.closest('input[name="kit"]'); if (c) form.querySelector(`[data-kit-jumlah="${CSS.escape(c.value)}"]`).disabled = !c.checked; });

  /* ---------- foto ---------- */
  const gambarFoto = () => {
    const kotak = $("lpFotoKotak"); if (!kotak) return;
    kotak.innerHTML = `${fotos.length ? `<ul class="lp-foto-daftar">${fotos.map((f, i) => `<li><img src="${f.url}" alt="Foto ${i + 1}"><button class="lp-hapus" type="button" data-hapus="${i}" aria-label="Hapus foto ${i + 1}">${ik("hapus", 20)}</button></li>`).join("")}</ul>` : ""}
      <div id="lpFotoKamera" hidden><div class="lp-kamera foto"><video id="lpVideo" playsinline muted autoplay></video></div><p class="lp-kecil" id="lpFotoStatus" role="status"></p>
        <div class="lp-dua"><button class="lp-tbl utama" id="lpJepret" type="button">${ik("kamera")}Ambil foto</button><button class="lp-tbl" id="lpTutupKamera" type="button">Tutup kamera</button></div></div>
      <button class="lp-tbl besar" id="lpBukaKamera" type="button" ${fotos.length >= BATAS.fotoMaks ? "disabled" : ""}>${ik("kamera")}${fotos.length ? "Tambah foto" : "Buka kamera"}</button>`;
  };
  gambarFoto();
  const tutupKamera = () => { cam?.henti(); cam = null; const k = $("lpFotoKamera"); if (k) k.hidden = true; const b = $("lpBukaKamera"); if (b) b.hidden = false; };

  form.addEventListener("click", e => {
    const hapus = e.target.closest("[data-hapus]");
    if (hapus) { const [f] = fotos.splice(Number(hapus.dataset.hapus), 1); URL.revokeObjectURL(f.url); const bukaLagi = !!cam; cam?.henti(); cam = null; gambarFoto(); if (bukaLagi) bukaKameraFoto(); return; }
    if (e.target.closest("#lpBukaKamera")) return bukaKameraFoto();
    if (e.target.closest("#lpTutupKamera")) return tutupKamera();
    if (e.target.closest("#lpJepret")) return jepret();
  });

  function bukaKameraFoto() {
    if (membuka || fotos.length >= BATAS.fotoMaks) return;
    membuka = true; const b = $("lpBukaKamera"); b.disabled = true; b.textContent = "Membuka kamera...";
    nanti(async () => {
      try {
        $("lpFotoKamera").hidden = false; b.hidden = true;
        cam = await bukaKamera($("lpVideo"), {depan: false});
        if (mati) { cam.henti(); cam = null; return; }
      } catch (e) { tutupKamera(); const bb = $("lpBukaKamera"); if (bb) { bb.disabled = false; bb.innerHTML = `${ik("kamera")}Buka kamera`; } mati || tampilGalat("foto", e.kamera ? e.message : "Kamera tidak bisa dibuka."); }
      finally { membuka = false; }
    });
  }

  function jepret() {
    const tombol = $("lpJepret"), st = $("lpFotoStatus"), video = $("lpVideo");
    if (!cam || tombol.disabled || !video.videoWidth) return;
    tombol.disabled = true; st.textContent = "Mencari lokasi...";
    nanti(async () => {
     try {
      const kanvas = salinFoto(video), waktuHp = Date.now();   // bingkai diambil SEKARANG (sesudah dua frame, di luar handler klik); lokasi menyusul
      let gps = null; try { gps = await satuTitik({batasMs: 8000}); } catch (e) {}
      const selisih = await selisihTerakhir();
      const baris = barisStempel({waktuMs: waktuHp, selisihMs: selisih, offsetMenit: offsetMenit(), gps, wilayah: tugas.wilayah_teks, nama: saya.orang.nama, tugas: tugas.judul});
      const blob = await fotoBerstempel(kanvas, baris);
      if (mati) return;
      fotos.push({blob, url: URL.createObjectURL(blob), meta: metaFoto(gps, waktuHp + selisih)});
      cam?.henti(); cam = null; gambarFoto(); tampilGalat("foto", "");
     } catch (e) { if (mati) return; const t = $("lpJepret"); if (t) t.disabled = false; st.textContent = ""; tampilGalat("foto", "Foto gagal, ulangi."); }
    });
  }

  /* ---------- kirim ---------- */
  function tampilGalat(nama, teks) {
    const el = form.querySelector(`[data-galat="${nama}"]`); if (!el) return;
    el.textContent = teks; el.hidden = !teks;
  }
  form.addEventListener("submit", e => {
    e.preventDefault();
    const b = $("lpSimpan"); if (b.disabled) return;
    const kond = {};
    for (const f of kondisi) kond[f.k] = f.jenis === "pilih" ? (ambilPilihan(form, f.k)[0] ?? "") : form.querySelector(`[data-kondisi="${f.k}"]`).value.trim();
    const r = rapikanLogbook({tugas_id: tugas.id, tanggal, kegiatan: ambilPilihan(form, "kegiatan")[0], uraian: $("lpUraian").value, hasil: $("lpHasil").value,
      kendala: ambilPilihan(form, "kendala"), kebutuhan: ambilPilihan(form, "kebutuhan"), kondisi: kond, nFoto: fotos.length}, tugas.bencana, konst);
    form.querySelectorAll("[data-galat]").forEach(el => { el.hidden = true; el.textContent = ""; });
    if (!r.ok) {
      for (const [k, t] of Object.entries(r.galat)) tampilGalat(k, t);
      form.querySelector("[data-galat]:not([hidden])")?.scrollIntoView({block: "center"});
      return;
    }
    const isiKit = {}; for (const c of form.querySelectorAll('input[name="kit"]:checked')) isiKit[c.value] = form.querySelector(`[data-kit-jumlah="${CSS.escape(c.value)}"]`).value;
    const rk = rapikanKit(isiKit, saya);
    if (!rk.ok) { tampilGalat("kit", rk.galat.kit); form.querySelector('[data-galat="kit"]').scrollIntoView({block: "center"}); return; }
    b.disabled = true; b.classList.add("kerja"); b.textContent = "Menyimpan...";
    nanti(async () => {
      tutupKamera();
      const fd = new FormData();
      fd.append("data", JSON.stringify({...r.data, ...(kit.length ? {kit: rk.kit} : {}), foto_meta: fotos.map(f => f.meta)}));
      fotos.forEach((f, i) => fd.append("foto", f.blob, `logbook${i + 1}.jpg`));
      const hasil = await kirimForm("/api/petugas/logbook", fd, {kode: ctx.kode});
      if (mati) return;
      if (!hasil.ok) { b.disabled = false; b.classList.remove("kerja"); b.textContent = "Simpan logbook"; tampilGalat("foto", hasil.data?.galat || pesanGalat(hasil.status)); form.querySelector('[data-galat="foto"]').scrollIntoView({block: "center"}); return; }
      ctx.saya.hari_ini = {...(ctx.saya.hari_ini || {}), logbook: {id: hasil.data?.id ?? hi?.id ?? null, terkunci: false}};
      ctx.pindah("beranda", "Logbook tersimpan. Kamu bisa memperbaruinya sampai 23.59.");
    });
  });
}

/* ================================================================ L6 Riwayat */
export function layarRiwayat(ctx) {
  ctx.tampil(`<section class="lp-kartu"><h2>Riwayat 14 hari</h2><div class="lp-rangka" aria-busy="true"><i></i><i></i><i></i></div></section>`);
  nanti(async () => {
    const r = await api("/api/petugas/riwayat", {kode: ctx.kode});
    const kartu = document.querySelector(".lp-kartu"); if (!kartu || !kartu.isConnected) return;
    if (!r.ok) { kartu.innerHTML = `<h2>Riwayat 14 hari</h2><p>${esc(pesanGalat(r.status))}</p><button class="lp-tbl" id="lpUlang" type="button">Ulangi</button><button class="lp-tautan" id="lpKembali" type="button">Kembali ke beranda</button>`; $("lpUlang").addEventListener("click", () => ctx.pindah("riwayat")); $("lpKembali").addEventListener("click", () => ctx.pindah("beranda")); return; }
    const baris = barisRiwayat(r.data), off = offsetMenit();
    kartu.innerHTML = `<h2>Riwayat 14 hari</h2>${baris.length ? `<ul class="lp-riwayat">${baris.map(x => `<li><div><b>${esc(x.judul)}</b><span class="lp-kecil">${esc(tanggalLokal(x.waktu, off))}, ${esc(teksJam(x.waktu, off))}${x.tugas ? `, ${esc(x.tugas)}` : ""}</span>${x.alasan?.length ? `<span class="lp-kecil">${esc(x.alasan.map(a => teksAlasan(a, x.jarak_m)).join(", "))}</span>` : ""}</div>${x.label ? `<span class="lp-pil ${x.kelas}">${esc(x.label)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="lp-kecil">Belum ada absen atau logbook dalam 14 hari terakhir.</p>`}
      <button class="lp-tbl" id="lpKembali" type="button">Kembali ke beranda</button>`;
    $("lpKembali").addEventListener("click", () => ctx.pindah("beranda"));
  });
}
