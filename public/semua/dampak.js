"use strict";
/* Panel dampak (fase Pasca-bencana) di /semua. Data: /data/dibi_kejadian.json (scripts/umum/dibi_kejadian.py, DIBI BNPB).
   Hanya kunci yang ada di "kolom" sumber yang tampil: kolom yang tak ada bukan 0. Periode dihitung mundur dari tanggal data terakhir (sampai), bukan hari ini.
   Butuh format.js, kartu.js, tabel.js (pasangTabel), nanti.js. */
import {tglID} from "/semua/darurat.js";

const LABEL = {meninggal: "Meninggal dunia", hilang: "Hilang", luka: "Luka-luka", terdampak: "Terdampak", mengungsi: "Mengungsi",
  rr_berat: "Rusak berat", rr_sedang: "Rusak sedang", rr_ringan: "Rusak ringan", terendam: "Rumah terendam",
  f_pendidikan: "Sekolah", f_ibadah: "Tempat ibadah", f_kesehatan: "Fasilitas kesehatan", f_kantor: "Perkantoran", f_umum: "Fasilitas umum", jembatan: "Jembatan"};
const GRUP = [["Korban", "#c9503a", ["meninggal", "hilang", "luka", "terdampak", "mengungsi"]],
  ["Rumah", "#e58a45", ["rr_berat", "rr_sedang", "rr_ringan", "terendam"]],
  ["Fasilitas rusak", "#4f8fc4", ["f_pendidikan", "f_ibadah", "f_kesehatan", "f_kantor", "f_umum", "jembatan"]]];
const PERIODE = [7, 30, 365];
const jml = (L, k) => L.reduce((s, r) => s + (+r[k] || 0), 0), cacah = r => +r.kejadian || 1;
const geser = (t, n) => new Date(new Date(t + "T12:00:00Z").getTime() - n * 864e5).toISOString().slice(0, 10);

export async function pasangDampak(el) {
  let D = null; try { const r = await fetch("/data/dibi_kejadian.json", {cache: "no-cache"}); if (r.ok) D = await r.json(); } catch (e) {}
  const SEMUA = Array.isArray(D?.kejadian) ? D.kejadian : [];
  if (!SEMUA.length) { el.innerHTML = Kartu.kartu("Dampak bencana", "Data dampak belum tersedia", `<p class="kosong">Data dampak kejadian BNPB (DIBI) belum tersedia, jadi panel ini kosong. Angka tidak ditebak.</p>`, "DIBI BNPB"); return; }
  const kol = new Set(D.kolom || []), ada = k => kol.has(k), st = {hari: 30, jenis: ""}, sampai = D.sampai || SEMUA.reduce((m, r) => r.tanggal > m ? r.tanggal : m, "");
  const jenisAda = [...new Set(SEMUA.map(r => r.jenis))].sort((a, b) => a.localeCompare(b, "id"));
  const sumber = `${esc(D.sumber || "DIBI BNPB")}, data sampai ${tglID(sampai)}`;
  const lihat = () => SEMUA.filter(r => r.tanggal > geser(sampai, st.hari) && r.tanggal <= sampai && (!st.jenis || r.jenis === st.jenis));
  const ctl = `<div class="seg" role="group" aria-label="Periode">${PERIODE.map(n => `<button type="button" data-p="${n}" aria-pressed="${n === st.hari}">${n} hari</button>`).join("")}</div>
    <div class="chips" role="group" aria-label="Jenis bencana"><button type="button" data-j="" aria-pressed="true">Semua jenis</button>${jenisAda.map(j => `<button type="button" data-j="${esc(j)}" aria-pressed="false">${esc(j)}</button>`).join("")}</div>`;
  el.innerHTML = Kartu.kartu("Dampak bencana", "", `<div id="dmIsi"></div>`, sumber, ctl);
  const det = () => el.querySelector("#dmRinci");

  const rinci = r => { const d = det(); if (!d) return;
    const baris = GRUP.flatMap(([, w, ks]) => ks.filter(k => ada(k) && +r[k] > 0).map(k => `<span class="pl" style="--w:${w}">${LABEL[k]} ${fmt(+r[k])}</span>`));
    d.innerHTML = `<b translate="no">${esc(r.kab)}, ${esc(r.prov)}</b>, ${esc(r.jenis)}, ${tglID(r.tanggal)}${cacah(r) > 1 ? `, ${fmt(cacah(r))} kejadian` : ""}<div class="pls">${baris.join("") || "Tidak ada dampak tercatat pada kejadian ini."}</div>`; d.hidden = false; };

  const tabel = { t: null };
  const isi = () => {
    const L = lihat(), n = L.reduce((s, r) => s + cacah(r), 0), b = el.querySelector("#dmIsi");
    el.querySelector("h3").innerHTML = L.length ? `${Kartu.hl(fmt(n) + " kejadian")}${ada("meninggal") ? `, ${Kartu.hl(fmt(jml(L, "meninggal")) + " korban meninggal")}` : ""} dalam ${st.hari} hari terakhir${st.jenis ? ` (${esc(st.jenis)})` : ""}` : `Tidak ada kejadian tercatat dalam ${st.hari} hari terakhir`;
    if (!L.length) { b.innerHTML = `<p class="kosong">Tidak ada kejadian tercatat pada ${tglID(geser(sampai, st.hari - 1))} sampai ${tglID(sampai)}${st.jenis ? ` untuk ${esc(st.jenis)}` : ""}. Data DIBI memang tertinggal dari kejadian terbaru.</p>`; return; }
    const perJenis = Object.entries(L.reduce((m, r) => (m[r.jenis] = (m[r.jenis] || 0) + cacah(r), m), {})).sort((a, b) => b[1] - a[1]);
    const grup = GRUP.map(([t, w, ks]) => { const k = ks.filter(ada); return k.length ? `<div class="dm-g"><span class="lbl">${t}</span><div class="pls">${k.map(x => `<span class="pl" style="--w:${w}">${LABEL[x]} ${fmt(jml(L, x))}</span>`).join("")}</div></div>` : ""; }).join("");
    const ukuran = ada("terdampak") ? "terdampak" : "", pv = Object.entries(L.reduce((m, r) => (m[r.prov] = (m[r.prov] || 0) + (ukuran ? +r[ukuran] || 0 : cacah(r)), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 10), mx = pv[0]?.[1] || 1;
    b.innerHTML = `<div class="dm-g"><span class="lbl">Kejadian per jenis</span><div class="pls">${perJenis.map(([j, c]) => `<span class="pl" style="--w:#2f6f9f">${esc(j)} ${fmt(c)}</span>`).join("")}</div></div>${grup}
      <div class="dm-g"><span class="lbl">${ukuran ? "Terdampak per provinsi" : "Kejadian per provinsi"}</span>${pv.some(p => p[1]) ? `<div class="dm-bar">${pv.map(([p, v]) => `<div><span translate="no">${esc(p)}</span><i style="width:${Math.max(2, v / mx * 100)}%"></i><b>${fmt(v)}</b></div>`).join("")}</div>` : `<p class="kosong">Tidak ada angka terdampak pada periode ini.</p>`}</div>
      <div class="dm-g"><span class="lbl">Kejadian terbaru, klik baris untuk rincian dampak</span><div id="dmRinci" class="dm-rinci" role="status" hidden></div><div id="dmTabel"></div></div>`;
    const kolT = [["tanggal", "Tanggal"], ["kab", "Kabupaten/kota"], ["prov", "Provinsi"], ["jenis", "Jenis"], ...["meninggal", "terdampak"].filter(ada).map(k => [k, LABEL[k], 1])];
    tabel.t = pasangTabel(b.querySelector("#dmTabel"), {kolom: kolT, per: 10, satuan: "kejadian", urut: "tanggal", turun: true, pilih: rinci,
      nilai: (r, k) => ["meninggal", "terdampak"].includes(k) ? +r[k] || 0 : r[k] || "",
      sel: (r, k) => k === "tanggal" ? tglID(r.tanggal) : ["meninggal", "terdampak"].includes(k) ? fmt(+r[k] || 0) : `<span${k === "jenis" ? "" : ' translate="no"'}>${esc(r[k])}</span>`});
    tabel.t.set(L);
  };
  isi();
  el.addEventListener("click", e => { const b = e.target.closest("[data-p],[data-j]"); if (!b) return;
    b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));   /* chrome urgent */
    if (b.dataset.p) st.hari = +b.dataset.p; else st.jenis = b.dataset.j;
    nanti(isi); });
}
