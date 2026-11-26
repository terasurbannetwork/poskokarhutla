"use strict";
/* RRP-3 Kalkulator Jitupasna permukiman (tiket RU-054; DESAIN-TEKNIS 5.9; DESIGN-SYSTEM 7.9). Rumus Perka 15/2011 hlm. 40, 41, 47:
   kerusakan = jumlah unit_t x harga_t; kebutuhan = jumlah unit_t x satuan_t x IKK / 100, t di RB, RS, RR; tanda ganda bila
   huntap + stimulan RB > RB terverifikasi. Hitung di peramban saja: tidak ada yang dikirim ke server, tidak ada simpan.
   IKK dan tarif dari unit/ikk.json (ikk.py); IKK kab kosong memakai IKK provinsi berlabel, keduanya kosong: kebutuhan berindeks null.
   Fungsi murni: globalThis.UnitRrp3 {kerusakan, kebutuhan, periksaGanda, barisFormulir}. Layar: UnitTampil["RRP-3"](berkas). */
(() => {
  const T = ["RB", "RS", "RR"];
  const NAMA_T = {RB: "Rusak berat", RS: "Rusak sedang", RR: "Rusak ringan"};

  function unitSah(u, nama = "unit") {
    for (const t of T) { const x = u?.[t]; if (!Number.isInteger(x) || x < 0) throw new RangeError(`${nama} ${t} harus bilangan bulat 0 atau lebih`); }
    return u;
  }
  function biayaSah(h, nama) {
    for (const t of T) { const x = h?.[t]; if (typeof x !== "number" || !Number.isFinite(x) || x < 0) throw new RangeError(`${nama} ${t} harus angka 0 atau lebih`); }
    return h;
  }
  const jumlah = (u, h) => T.reduce((s, t) => s + u[t] * h[t], 0);

  /* harga per unit dalam juta rupiah -> juta rupiah */
  function kerusakan(unit, harga) { return jumlah(unitSah(unit), biayaSah(harga, "harga kerusakan")); }

  /* ikk = {kab, prov}: angka atau null. Hasil juta rupiah. */
  function kebutuhan(unit, satuan, ikk) {
    const dasar = jumlah(unitSah(unit), biayaSah(satuan, "satuan biaya"));
    const ok = x => typeof x === "number" && Number.isFinite(x) && x > 0;
    const pakai = ok(ikk?.kab) ? {nilai: ikk.kab, sumber: "IKK kab/kota"} : ok(ikk?.prov) ? {nilai: ikk.prov, sumber: "IKK provinsi"} : null;
    return {dasar, berindeks: pakai ? dasar * pakai.nilai / 100 : null, ikk: pakai?.nilai ?? null, sumber_ikk: pakai?.sumber ?? null,
      alasan: pakai ? null : "IKK kab/kota dan provinsi belum ada data"};
  }

  /* Perka 15/2011 hlm. 41: rumah yang masuk huntap tidak boleh juga menerima stimulan RB */
  function periksaGanda(huntap, stimulan_rb, rb_terverifikasi) {
    const x = {huntap, stimulan_rb, rb_terverifikasi};
    if (Object.values(x).some(v => v == null)) return {ganda: null, jumlah: null, batas: rb_terverifikasi ?? null, alasan: "belum ada data"};
    for (const [k, v] of Object.entries(x)) if (!Number.isInteger(v) || v < 0) throw new RangeError(`${k} harus bilangan bulat 0 atau lebih`);
    const n = huntap + stimulan_rb;
    return {ganda: n > rb_terverifikasi, jumlah: n, batas: rb_terverifikasi, alasan: null};
  }

  /* Baris CSV kolom Formulir 08 (disebut lampiran 7 di hlm. 34); rupiah penuh; kerugian tidak dihitung alat ini (kosong) */
  function barisFormulir(kolom, lokasi, unit, harga, kb) {
    const rp = x => x == null ? null : Math.round(x * 1e6);
    const rusak = Object.fromEntries(T.map(t => [t, unit[t] * harga[t]]));
    const isi = ["1", "Perumahan", "Rumah", lokasi, ...T.map(t => unit[t]), ...T.map(t => rp(harga[t])), ...T.map(t => rp(rusak[t])), null, null, rp(kb.berindeks)];
    const total = ["", "Jumlah Total", "", "", ...T.map(t => unit[t]), null, null, null, ...T.map(t => rp(rusak[t])), null, null, rp(kb.berindeks)];
    const obj = r => Object.fromEntries(kolom.map((k, i) => ["c" + i, r[i]]));
    return {kolom: kolom.map((label, i) => ({k: "c" + i, label})), baris: [obj(isi), obj(total)]};
  }

  globalThis.UnitRrp3 = {kerusakan, kebutuhan, periksaGanda, barisFormulir, T};
  if (typeof document === "undefined") return;

  /* ---------------- layar ---------------- */
  const R = window.UnitRapor;
  const h = (tag, a, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
  const ikon = k => { const t = document.createElement("template"); t.innerHTML = R.svg(k); return t.content.firstElementChild; };
  const juta = x => x == null ? "belum ada data" : "Rp" + x.toLocaleString("id-ID", {maximumFractionDigits: 2}) + " juta";

  function kalkulator(b) {
    const d = b?.data || {}, tarif = d.tarif_juta || {}, kab = d.kab || {}, prov = d.prov || {}, nama = d.nama_kab || {};
    const pilih = h("select", {id: "rrp3-kab", class: "un-g-in"}, h("option", {value: "", teks: "Pilih kab/kota"}),
      ...Object.keys(nama).sort((a, c) => nama[a].localeCompare(nama[c], "id")).map(k => h("option", {value: k, teks: nama[k]})));
    const isian = (id, nilai, step) => h("input", {type: "number", id, class: "un-g-in", min: "0", step, inputmode: step === "1" ? "numeric" : "decimal", value: nilai ?? ""});
    const sel = {};
    const baris = T.map(t => { sel[t] = {u: isian("rrp3-u-" + t, "", "1"), h: isian("rrp3-h-" + t, "", "any"), s: isian("rrp3-s-" + t, tarif[t], "any")};
      return h("tr", null, h("th", {scope: "row", "data-label": "Tingkat", teks: NAMA_T[t]}), h("td", {"data-label": "Unit rumah"}, sel[t].u),
        h("td", {"data-label": "Harga kerusakan, juta Rp per unit"}, sel[t].h), h("td", {"data-label": "Satuan biaya, juta Rp per unit"}, sel[t].s)); });
    const g = {huntap: isian("rrp3-huntap", "", "1"), stim: isian("rrp3-stim", "", "1"), rb: isian("rrp3-rb", "", "1")};
    const lbl = (f, t) => h("label", {for: f.id, teks: t});
    const pesan = h("p", {class: "bn-pesan", role: "status", hidden: true});
    const nilai = {}, dd = k => (nilai[k] = h("dd", {teks: "belum ada data"}));
    const hasil = h("dl", {class: "un-ringkas", "aria-live": "polite"},
      h("div", null, h("dt", {teks: "Nilai kerusakan"}), dd("rusak")), h("div", null, h("dt", {teks: "Kebutuhan dasar, tanpa indeks"}), dd("dasar")),
      h("div", null, h("dt", {teks: "Kebutuhan berindeks"}), dd("indeks")), h("div", null, h("dt", {teks: "Indeks biaya dipakai"}), dd("ikk")),
      h("div", null, h("dt", {teks: "Huntap tambah stimulan RB"}), dd("ganda")));
    const csv = h("button", {type: "button", class: "ad-tombol kecil", disabled: true}, ikon("unduh"), "Unduh CSV");
    let terakhir = null;
    const angka = el => el.value === "" ? null : Number(el.value);   // kosong tetap kosong, tidak jadi 0
    const kosongkan = () => { for (const x of Object.values(nilai)) x.textContent = "belum ada data"; };
    function hitung() {
      terakhir = null; csv.disabled = true; pesan.hidden = true;
      try {
        const unit = {}, harga = {}, satuan = {};
        for (const t of T) { unit[t] = angka(sel[t].u); harga[t] = angka(sel[t].h); satuan[t] = angka(sel[t].s); }
        if (T.some(t => unit[t] == null || harga[t] == null || satuan[t] == null)) { kosongkan(); pesan.textContent = "Isi unit, harga, dan satuan biaya ketiga tingkat; ketik 0 bila tidak ada."; pesan.className = "bn-pesan"; pesan.hidden = false; return; }
        pesan.className = "bn-pesan galat";
        const k = pilih.value, rusak = UnitRrp3.kerusakan(unit, harga), kb = UnitRrp3.kebutuhan(unit, satuan, {kab: kab[k], prov: prov[k.slice(0, 2)]});
        const gd = UnitRrp3.periksaGanda(angka(g.huntap), angka(g.stim), angka(g.rb));
        nilai.rusak.textContent = juta(rusak); nilai.dasar.textContent = juta(kb.dasar);
        nilai.indeks.textContent = k ? juta(kb.berindeks) : "pilih kab/kota dulu";
        nilai.ikk.textContent = !k ? "pilih kab/kota dulu" : kb.ikk == null ? kb.alasan : `${kb.ikk.toLocaleString("id-ID", {maximumFractionDigits: 2})} (${kb.sumber_ikk})`;
        nilai.ganda.textContent = gd.ganda == null ? "belum ada data" : gd.ganda ? `periksa hitung ganda: ${gd.jumlah.toLocaleString("id-ID")} melebihi ${gd.batas.toLocaleString("id-ID")} RB terverifikasi` : `${gd.jumlah.toLocaleString("id-ID")} dari ${gd.batas.toLocaleString("id-ID")} RB terverifikasi`;
        nilai.ganda.classList.toggle("un-st-kurang", gd.ganda === true);
        if (k) { terakhir = UnitRrp3.barisFormulir(d.kolom_formulir || [], nama[k], unit, harga, kb); csv.disabled = false; }
      } catch (e) {
        pesan.className = "bn-pesan galat"; pesan.textContent = e.message; pesan.hidden = false; kosongkan();
      }
    }
    const wadah = h("div", {class: "un-g"},
      h("div", {class: "un-g-in-wadah"},
        h("p", null, lbl(pilih, "Kab/kota"), " ", pilih),
        h("div", {class: "ad-tabel-wadah ex-tabel", role: "region", tabindex: "0", "aria-label": "Masukan rumah rusak"},
          h("table", {class: "ad-tabel"}, h("caption", {class: "sr", teks: "Masukan rumah rusak per tingkat"}),
            h("thead", null, h("tr", null, h("th", {scope: "col", teks: "Tingkat"}), h("th", {scope: "col", teks: "Unit rumah", title: "jumlah rumah rusak per tingkat, bilangan bulat"}),
              h("th", {scope: "col", teks: "Harga kerusakan", title: "juta rupiah per unit, harga satuan pemda atau tim"}),
              h("th", {scope: "col", teks: "Satuan biaya", title: "juta rupiah per unit; bawaan tarif stimulan Jam Aturan (asumsi, rilis 2023-2024)"}))),
            h("tbody", null, ...baris))),
        h("div", {class: "un-g-ganda"}, h("p", null, lbl(g.huntap, "Huntap"), " ", g.huntap), h("p", null, lbl(g.stim, "Stimulan RB"), " ", g.stim),
          h("p", null, lbl(g.rb, "RB terverifikasi"), " ", g.rb))),
      h("div", {class: "un-g-out"}, pesan, hasil));
    wadah.addEventListener("input", hitung);
    pilih.addEventListener("change", hitung);
    csv.addEventListener("click", () => { if (terakhir) R.unduh({unduh: "jitupasna_permukiman.csv", ...terakhir}); });
    hitung();
    return h("section", {class: "ex ex-std", id: "rrp3-alat", "aria-labelledby": "rrp3-alat-j"},
      h("header", {class: "ex-hd"}, h("div", {class: "ex-pl"}, h("span", {class: "ex-ey", teks: "Jitupasna permukiman"}),
        h("span", {class: "bn-pil un-lbl un-hitungan"}, ikon("hitung"), "Hitungan kita"),
        h("span", {class: "bn-pil un-lbl un-asumsi", title: "tarif_stimulan_juta Jam Aturan: rilis 2023-2024, bukan pasal"}, ikon("tanya"), "Asumsi: tarif stimulan")),
        h("div", {class: "ex-jd"}, h("h3", {id: "rrp3-alat-j"}, ikon("hitung"), "Kalkulator kerusakan dan kebutuhan"), h("div", {class: "un-aksi"}, csv))),
      h("div", {class: "ex-bd"}, h("p", {class: "un-g-cat", teks: "Dihitung di peramban ini saja. Isian tidak dikirim dan tidak disimpan."}), wadah));
  }

  (window.UnitTampil ||= {})["RRP-3"] = b => [kalkulator(b), ...(b.kartu || []).map(k => R.render(k, b))];
})();
