/* Pemberitahuan melayang mode Peringatan /lapor (K8c): peringatan BMKG yang baru sejak kunjungan lalu, tumpukan kartu kecil di kanan atas peta.
   Hanya id peringatan publik disimpan di peramban. Data sama dengan tab Dampak: GET /api/dampak-peringatan/ringkas. */
import { ambil, bbox } from "/potensi/umum.js";
const LIHAT = "lp-kabar-lihat", TUTUP = "lp-kabar-tutup", MAKS = 3;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const baca = (k) => { try { return new Set(JSON.parse(localStorage.getItem(k)) || []); } catch { return new Set(); } };
const tulis = (k, s) => { try { localStorage.setItem(k, JSON.stringify([...s].slice(-300))); } catch { /* penyimpanan penuh atau dimatikan: kartu tetap jalan */ } };
let cache = null, cacheAt = 0;
/** Satu pengambilan peringatan aktif dipakai bersama menu lapisan (poligon BMKG). */
export const ambilPeringatan = () => (cache && Date.now() - cacheAt < 300000 ? cache : (cacheAt = Date.now(), cache = ambil("/api/dampak-peringatan/ringkas")));
const waktu = (iso) => { const t = new Date(iso); return Number.isNaN(+t) ? "" : t.toLocaleString("id-ID", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB"; };

let wadah = null, daftar = null, DP = null; // daftar: null = belum dihitung pada muatan halaman ini
const ditutup = baca(TUTUP);

function gambar(ctx) {
  const sisa = daftar.filter((p) => !ditutup.has(p.id));
  wadah.hidden = !sisa.length;
  const tampil = sisa.slice(0, MAKS), lain = sisa.length - tampil.length;
  const judulKec = (s) => { const n = String(s).split(/,\s*/).map((x) => x.toLocaleLowerCase("id-ID").replace(/(^|[\s(\-])(\p{L})/gu, (_, a, c) => a + c.toLocaleUpperCase("id-ID"))); return n.length > 3 ? n.slice(0, 3).join(", ") + ` dan ${n.length - 3} lainnya` : n.join(", "); };   // nama kecamatan huruf judul, dipotong 3 (sama dengan kartu tab Dampak)
  wadah.innerHTML = tampil.map((p) => {
    const nama = DP?.namaTingkat?.(p.tingkat_bmkg) || "", tok = DP?.token?.(p.tingkat_bmkg);
    return `<article class="lp-kb-k" data-id="${esc(p.id)}"${tok ? ` style="--kb-w:var(${tok})"` : ""}><div class="lp-kb-a"><b>${esc(nama ? "Peringatan BMKG, " + nama : "Peringatan BMKG")}</b><button type="button" class="lp-kb-x" data-tutup aria-label="Tutup pemberitahuan">&times;</button></div><p>${esc(p.event || "Peringatan cuaca")}${p.wilayah ? ", " + esc(judulKec(p.wilayah)) : ""}</p>${p.berlaku_sampai ? `<small>Berlaku sampai ${esc(waktu(p.berlaku_sampai))}</small>` : ""}<div class="lp-kb-t"><button type="button" data-peta${p.poligon?.length ? "" : " disabled"}>Lihat di peta</button></div></article>`;
  }).join("") + (sisa.length ? `<div class="lp-kb-f">${lain > 0 ? `<span>${lain} peringatan baru lainnya</span>` : ""}<button type="button" data-semua>Lihat semua</button></div>` : "");
  wadah.onclick = (e) => {
    const k = e.target.closest(".lp-kb-k"), id = k?.dataset.id;
    if (e.target.closest("[data-semua]")) return ctx.keDampak();
    if (!id) return;
    if (e.target.closest("[data-tutup]")) { ditutup.add(id); tulis(TUTUP, ditutup); gambar(ctx); }
    else if (e.target.closest("[data-peta]")) { const p = daftar.find((x) => x.id === id); if (p?.poligon?.length) ctx.peta().fitBounds(bbox(p.poligon), { padding: ctx.pad(), maxZoom: 10, duration: 600 }); }
  };
}

/** ctx: { arena, peta(), pad(), keDampak() }. Aman dipanggil berulang. */
export async function buka(ctx) {
  if (!wadah) {
    wadah = Object.assign(document.createElement("div"), { className: "lp-kb", hidden: true });
    wadah.setAttribute("role", "region"); wadah.setAttribute("aria-label", "Peringatan BMKG baru"); wadah.setAttribute("aria-live", "polite");
    ctx.arena.append(wadah);
  }
  if (!daftar) {
    const R = await ambilPeringatan();
    if (!R || !Array.isArray(R.peringatan)) return;   // data belum terukur: tidak ada kartu, tidak ada angka
    const lihat = baca(LIHAT);
    daftar = R.peringatan.filter((p) => p.id && !lihat.has(p.id));
    tulis(LIHAT, new Set([...lihat, ...R.peringatan.map((p) => p.id).filter(Boolean)]));
    if (daftar.length) { try { await import("/potensi/dampak.js").then((m) => m.muatDP()); DP = globalThis.DampakPeringatan; } catch { /* label tingkat dilewati */ } }
  }
  gambar(ctx);
}
export function tutup() { if (wadah) wadah.hidden = true; }
