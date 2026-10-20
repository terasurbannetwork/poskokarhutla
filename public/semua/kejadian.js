"use strict";
/* Kejadian aktif lintas bencana di /semua: satu tabel standar (inti/tabel.js), baris menaut ke /<bencana>/k/<kode> (karhutla /k/K....).
   Tiap bencana punya pembaca sendiri yang mengembalikan [{kode, nama, tingkat, rank, mulai}] atau null; berkas tak ada atau basi (> BASI_HARI) = dilewati (A18).
   Kejadian cuaca/udara/gunungapi/kekeringan dibaca generik dari banjir/data/kejadian_<id>_awal.json (scripts/umum/kejadian.py). */
const BASI_HARI = 3, PER = 10, TGL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const ambil = async u => { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u); return r.json(); };
const segar = t => t && Date.now() - new Date(t.length === 10 ? t + "T23:59:59+07:00" : t).getTime() < BASI_HARI * 864e5;
const tglP = t => { const d = new Date(String(t).slice(0, 10) + "T12:00:00Z"); return isNaN(d) ? "–" : `${d.getUTCDate()} ${TGL[d.getUTCMonth()]}`; };
const prov = s => String(s).split("|").pop();

const PEMBACA = {
  async banjir() {
    const d = await ambil("/banjir/data/kejadian_aktif_awal.json");
    if (!segar(d.dibuat)) return null;
    return d.kejadian.map(k => ({kode: k.kode, nama: `${prov(k.kec[0].split("|").slice(0, 2).join("|"))}${k.n_kec > 1 ? ` +${k.n_kec - 1} kec.` : ""}`,
      tingkat: k.level_tertinggi >= 3 ? "Awas" : "Siaga", rank: k.level_tertinggi >= 3 ? 3 : 2, mulai: k.sejak}));
  },
  async gempa() {
    const d = await ambil("/api/gempa/kejadian");
    return (d.kejadian || []).filter(k => k.aktif).map(k => ({kode: k.kode, nama: k.nama, tingkat: `M ${fmt(k.m)}`, rank: k.m >= 7 ? 3 : k.m >= 6 ? 2 : 1, mulai: k.mulai}));
  },
};
const umum = (id, u = `/banjir/data/kejadian_${id}_awal.json`) => async () => {
  const d = await ambil(u);
  if (!segar(d.dibuat)) return null;
  return d.kejadian.filter(k => k.aktif).map(k => ({kode: k.kode, nama: k.nama || k.tempat, tingkat: k.besaran?.ket || "–", rank: Math.max(1, Math.min(3, (k.besaran?.nilai || 1) - (id === "gunungapi" ? 1 : 0))), mulai: k.mulai}));
};
PEMBACA.karhutla = umum("karhutla", "/data/kejadian_karhutla_awal.json");   /* berkas ringkas dari pipeline; tanpanya karhutla dilewati, kluster_awal.json (5,8 MB) tidak dipakai */
["cuaca", "udara", "gunungapi", "kekeringan"].forEach(id => PEMBACA[id] = umum(id));

const KOL = [["kode", "Kode"], ["nama", "Nama"], ["bencana", "Bencana"], ["rank", "Tingkat"], ["mulai", "Mulai", 1]];
export async function pasangKejadian(el, reg) {
  const hasil = await Promise.all(reg.filter(b => PEMBACA[b.id]).map(b => PEMBACA[b.id]().then(L => (L || []).map(k => ({...k, b})), () => [])));
  const SEMUA = hasil.flat().sort((x, y) => y.rank - x.rank || (x.mulai < y.mulai) - (x.mulai > y.mulai));
  if (!SEMUA.length) return;
  const st = {urut: "rank", turun: true, hal: 0}, sembunyi = new Set();
  const nilai = (k, c) => c === "bencana" ? k.b.nama : k[c];
  const gambar = () => {
    const F = SEMUA.filter(k => !sembunyi.has(k.b.id)).sort((x, y) => { const a = nilai(x, st.urut), b = nilai(y, st.urut); return (a < b ? -1 : a > b ? 1 : 0) * (st.turun ? -1 : 1); });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(F.length / PER) - 1));
    const n = new Set(F.map(k => k.b.id)).size, bar = F.slice(st.hal * PER, (st.hal + 1) * PER).map(k => `<tr><td><a href="${esc(k.b.rute.replace(/\/$/, ""))}/k/${esc(k.kode)}">${esc(k.kode)}</a></td><td translate="no">${esc(k.nama)}</td>
      <td><span class="pl" style="--w:${k.b.warna}">${esc(k.b.nama)}</span></td><td><span class="pl" style="--w:${k.rank >= 3 ? "#c9503a" : k.rank === 2 ? "#e58a45" : "#e3b94e"}">${esc(k.tingkat)}</span></td><td class="n">${tglP(k.mulai)}</td></tr>`).join("");
    el.innerHTML = Kartu.kartu("Kejadian aktif", F.length ? `${Kartu.hl(fmt(F.length) + " kejadian")} aktif di ${Kartu.hl(fmt(n) + " bencana")}` : "Tidak ada kejadian aktif pada bencana yang dipilih",
      `<div class="tw kj-tw"><table class="kj-tb"><thead><tr>${KOL.map(([c, t, r]) => `<th${r ? ' class="n"' : ""}><button data-k="${c}">${t}<i>${st.urut === c ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead><tbody>${bar}</tbody></table></div>${paginasi(st.hal, F.length, PER, "kejadian")}`, [...new Set(F.map(k => k.b.bagikan?.sumber).filter(Boolean))].join("; "));   /* Kartu.kartu menambah "Sumber: " sendiri; isinya lembaga asal tiap bencana yang tampil */
    pengurutKepala(st, el.querySelector("thead"), () => nanti(gambar));
  };
  el.addEventListener("click", e => { const b = e.target.closest(".pgn-b[data-h]"); if (b && !b.disabled) { st.hal = +b.dataset.h; nanti(gambar); } });
  gambar();
  return {saring(dipilih) { sembunyi.clear(); reg.forEach(b => dipilih.has(b.id) || sembunyi.add(b.id)); nanti(gambar); }};
}
