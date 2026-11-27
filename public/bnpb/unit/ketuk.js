"use strict";
/* MB-7 antrean setuju (tiket RU-034; DESAIN-TEKNIS 4.7, 4.9; DESIGN-SYSTEM 7.7). Usulan baris dari unit/usulan_<berkas>.json (GET /api/unit/data/...)
   digabung dengan keputusan staf (GET /api/unit/ketuk?berkas=); tombol Benar, Tolak, Koreksi menulis lewat POST /api/unit/ketuk.
   Baris langsung disembunyikan di klien (INP), dikembalikan bila penulisan gagal. Aturan gabung sama dengan scripts/bnpb/unit/terima.py gabung():
   koreksi menimpa hanya medan yang dikoreksi dan sudah ada; usulan ditolak tidak masuk hitungan; layar tidak menghitung angka pipeline.
   Peran tanpa hak menulis (pemirsa) tetap melihat antrean; server menjawab 403 dan baris kembali. Teks data lewat textContent saja.
   Pakai: UnitKetuk.antre(usulan, keputusan) -> {menunggu, diputuskan}; UnitKetuk.punya(sistem); UnitKetuk.tampil(sistem) -> Promise<elemen|null>. */
(() => {
  const BERKAS = {rpbd: "usulan_rpbd", dokumen_siaga: "usulan_dokumen_siaga", usulan_pemulihan: "usulan_pemulihan"};   // berkas induk -> usulan; sama dengan DATA_UNIT src/unit.js
  const MEDAN_KOREKSI = {usulan_rpbd: ["status", "periode", "url"], usulan_dokumen_siaga: []};   // sama dengan src/unit.js MEDAN_KOREKSI (dijaga uji)
  const MEDAN = {kab: "Kab/kota", medan: "Jenis angka", nilai: "Angka disebut berita", basis: "Dasar angka", kutipan: "Kutipan berita", tgl_tampil: "Tanggal berita", status_angka: "Status ekstraksi", kode: "Kode wilayah", status: "Status", periode: "Periode", url: "Alamat dokumen", jenis: "Jenis dokumen", bahaya: "Bahaya", tgl_tetap: "Tanggal ditetapkan"};
  const NILAI = {sesuai_3_2026: "berlaku, sesuai Perban 3/2026", berlaku: "berlaku", habis: "habis", belum_mulai: "belum mulai", multi: "lebih dari satu bahaya"};
  const KEYAKINAN = {pola_tetap: "diurai dengan pola tetap", pola_longgar: "diurai dengan pola longgar, perlu dicek"};
  const LABEL = {resmi: "Resmi", sekunder: "Sekunder", hitungan_kita: "Hitungan kita", proksi: "Proksi"};
  const STATUS = {terima: "diterima", tolak: "ditolak", koreksi: "dikoreksi"};
  const nilai = v => v == null || v === "" ? "belum ada data" : NILAI[v] || String(v).replace(/_/g, " ");
  const angkaSatuan = (v, satuan) => { const t = v.toLocaleString("id-ID"); return satuan === "rupiah" ? "Rp" + t : satuan === "unit" ? t + " unit" : t; };
  const aman = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch (e) { return null; } };

  function antre(usulan, keputusan) {
    const t = new Map((keputusan || []).filter(k => STATUS[k?.keputusan]).map(k => [k.usulan_id, k]));
    const menunggu = [], diputuskan = [];
    for (const b of Array.isArray(usulan?.baris) ? usulan.baris : []) {
      const k = t.get(b.id);
      if (!k) { menunggu.push(b); continue; }
      const isi = {...b.isi};
      if (k.keputusan === "koreksi" && k.koreksi && typeof k.koreksi === "object") for (const m of Object.keys(k.koreksi)) if (m in isi) isi[m] = k.koreksi[m];
      diputuskan.push({...b, isi, status: STATUS[k.keputusan], waktu: k.waktu});
    }
    return {menunggu, diputuskan};
  }
  const punya = s => !!BERKAS[s?.berkas];

  const h = (tag, a, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
  const ambil = u => fetch(u, {credentials: "same-origin", signal: AbortSignal.timeout(9000)});
  const json = async u => { try { const r = await ambil(u); return r.ok ? await r.json() : null; } catch (e) { return null; } };

  function barisUsulan(b, berkas) {
    const isi = Object.entries(b.isi || {}).filter(([m]) => !["url", "terima", "tgl", "satuan"].includes(m));
    const tautan = aman(b.isi?.url || b.sumber?.url);
    const li = h("li", {class: "un-antre", "data-usulan": b.id});
    const pesan = h("p", {class: "un-antre-cat", role: "status"});
    const kirim = async (keputusan, koreksi) => {
      li.hidden = true;   // tanpa menunggu jawaban: chrome bereaksi seketika
      const badan = {berkas, usulan_id: b.id, keputusan, ...(koreksi ? {koreksi} : {})};
      let r; try { r = await fetch("/api/unit/ketuk", {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(badan), signal: AbortSignal.timeout(9000)}); } catch (e) { r = null; }
      if (r && r.ok && keputusan === "terima" && b.isi?.terima) {   // RRP-2: baris diterima diteruskan ke pelacak pemulihan (src/pemulihan.js); 409 = sudah pernah diteruskan
        let f; try { f = await fetch("/api/pusdalops/pemulihan/terima", {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify({usulan_id: b.id, url: b.isi.url || b.sumber?.url, ...b.isi.terima}), signal: AbortSignal.timeout(9000)}); } catch (e) { f = null; }
        if (!f || !(f.ok || f.status === 409)) { li.hidden = false; pesan.textContent = f?.status === 403 ? "Keputusan tersimpan, tetapi perananmu belum boleh menambah ke pelacak pemulihan." : "Keputusan tersimpan, tetapi belum diteruskan ke pelacak pemulihan; coba Benar lagi."; return; }
      }
      if (r && r.ok) { li.remove(); return; }
      li.hidden = false;
      pesan.textContent = r?.status === 403 ? "Perananmu belum boleh memutuskan usulan; baris dikembalikan." : r?.status === 401 ? "Sesimu habis; masuk lagi lalu coba lagi." : "Keputusan belum tersimpan; baris dikembalikan, coba lagi.";
    };
    const tombol = (teks, keputusan) => h("button", {type: "button", class: "ad-tombol kecil", "data-keputusan": keputusan, teks});
    const aksi = h("div", {class: "un-antre-aksi"}, tombol("Benar", "terima"), tombol("Tolak", "tolak"));
    aksi.addEventListener("click", e => { const x = e.target.closest("[data-keputusan]"); if (x) kirim(x.dataset.keputusan); });
    const medan = MEDAN_KOREKSI[berkas] || [];
    if (medan.length) {
      const f = h("form", {class: "un-antre-koreksi"}, ...medan.map(m => h("label", null, h("span", {teks: MEDAN[m] || m}),
        h("input", {class: "un-g-in", name: m, maxlength: "200", value: b.isi?.[m] == null ? "" : String(b.isi[m])}))), h("button", {type: "submit", class: "ad-tombol kecil", teks: "Simpan koreksi"}));
      f.addEventListener("submit", e => { e.preventDefault();
        const k = {}; for (const m of medan) { const v = f.elements[m].value.trim(); if (v && v !== String(b.isi?.[m] ?? "")) k[m] = v; }
        if (!Object.keys(k).length) { pesan.textContent = "Belum ada medan yang diubah."; return; }
        kirim("koreksi", k); });
      aksi.append(h("details", {class: "un-antre-kor"}, h("summary", {teks: "Koreksi"}), f));
    }
    li.append(h("p", {class: "un-antre-judul", teks: b.sumber?.nama || "Dokumen tanpa judul"}),
      h("p", {class: "un-antre-meta", teks: `${LABEL[b.label] || "Sekunder"}, ${KEYAKINAN[b.keyakinan] || "diurai mesin"}`}),
      h("dl", {class: "un-antre-isi"}, ...isi.map(([m, v]) => h("div", null, h("dt", {teks: MEDAN[m] || m.replace(/_/g, " ")}), h("dd", {teks: m === "nilai" && typeof v === "number" ? angkaSatuan(v, b.isi?.satuan) : nilai(v)})))),
      tautan ? h("a", {href: tautan, target: "_blank", rel: "noopener noreferrer", teks: "Buka dokumen"}) : null, aksi, pesan);
    return li;
  }

  async function tampil(s) {
    const berkas = BERKAS[s?.berkas]; if (!berkas) return null;
    const [u, k] = await Promise.all([json("/api/unit/data/" + berkas), json("/api/unit/ketuk?berkas=" + berkas)]);
    if (!u || !k) return null;   // 401, 404, atau galat: antrean tidak dipasang, kartu data tetap tampil
    const {menunggu, diputuskan} = antre(u, k.keputusan);
    const daftar = menunggu.length ? h("ul", {class: "un-antre-daftar"}, ...menunggu.map(b => barisUsulan(b, berkas)))
      : h("p", {class: "ad-kosong", role: "status"}, "Tidak ada usulan yang menunggu diperiksa.");
    const sudah = diputuskan.length ? h("details", {class: "un-antre-sudah"}, h("summary", {teks: `Sudah diputuskan (${diputuskan.length})`}),
      h("ul", {class: "un-antre-daftar"}, ...diputuskan.map(b => h("li", {class: "un-antre"}, h("p", {class: "un-antre-judul", teks: b.sumber?.nama || "Dokumen tanpa judul"}),
        h("p", {class: "un-antre-meta", teks: b.status[0].toUpperCase() + b.status.slice(1)}))))) : null;
    const R = window.UnitRapor;
    const sec = R.render({id: "ketuk-" + s.id.toLowerCase(), sistem: s.id, pil: "Antrean setuju", ikon: "data", judul: "Usulan menunggu diperiksa", label: ["sekunder"],
      sumber: [berkas], rumus: null, aturan: [], asumsi: [], kolom: [], baris: [],
      angka: [{k: "menunggu", label: "Menunggu diperiksa", nilai: menunggu.length, title: "usulan tanpa keputusan staf; angka sistem belum memakainya kecuali bertanda belum dikonfirmasi"},
        {k: "diputuskan", label: "Sudah diputuskan", nilai: diputuskan.length}]}, null);
    sec.querySelector(".ex-bd").append(daftar, ...(sudah ? [sudah] : []));
    return sec;
  }

  const api = {antre, punya, tampil, BERKAS, MEDAN_KOREKSI, NILAI, MEDAN};
  (typeof window !== "undefined" ? window : globalThis).UnitKetuk = api;
})();
