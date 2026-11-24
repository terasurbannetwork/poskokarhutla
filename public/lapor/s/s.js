/* Halaman tautan kabar selamat: baca token dari jalur, panggil GET /api/lapor/s/:token, tampilkan. Teks dari server hanya lewat textContent. */
import {tokenDariJalur, waktuWib, TIDAK_BERLAKU, LABEL_STATUS} from "../selamat_murni.js";

const $ = id => document.getElementById(id);
async function muat() {
  const token = tokenDariJalur(location.pathname, location.search);
  let j = null;
  if (token) { try { const r = await fetch(`/api/lapor/s/${encodeURIComponent(token)}`, {cache: "no-store", referrerPolicy: "no-referrer"}); if (r.ok) j = await r.json(); } catch {} }
  if (!j || !j.nama_panggil) { $("nama").textContent = TIDAK_BERLAKU; $("kartu").classList.add("tidak"); return; }
  document.title = `Kabar selamat dari ${j.nama_panggil}, Pantau Bencana BNPB`;
  $("nama").textContent = j.nama_panggil;
  const st = $("status"); st.hidden = false; st.textContent = j.label || LABEL_STATUS[j.status] || ""; st.classList.toggle("bantuan", j.status === "butuh_bantuan");
  $("meta").textContent = [j.kab_nama || j.kab, waktuWib(j.waktu) && `Ditandai ${waktuWib(j.waktu)}`].filter(Boolean).join(". ");
  $("catat").hidden = false;
}
muat();
