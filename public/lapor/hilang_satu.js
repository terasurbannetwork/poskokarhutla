/* /lapor/h/<token>: satu profil orang hilang yang tayang (orang-hilang-publik OH-09). Token dari alamat; GET /api/lapor/hilang/<token>.
   Tidak ada, belum tayang, turun, atau lewat masa menjawab sama (404): "Profil ini tidak tampil". Tanpa gambar pratinjau berfoto (meta noindex di HTML). */
import {el, kartuProfil} from "/lapor/hilang_kartu.js?v=1";

const wadah = document.getElementById("satu"), token = (/^\/lapor\/h\/([0-9a-f]{32})\/?$/.exec(location.pathname) || [])[1] || "";
function kosong() { const k = el("div", "oh-kosong"); k.append(el("b", null, "Profil ini tidak tampil"), el("span", null, "Profil sudah diturunkan, masa tayangnya berakhir, atau tautannya salah. Lihat daftar orang hilang untuk profil yang masih tampil.")); wadah.replaceChildren(k); }
(async () => {
  try {
    const r = token ? await fetch(`/api/lapor/hilang/${token}`, {headers: {accept: "application/json"}, credentials: "same-origin", signal: AbortSignal.timeout(20000)}) : null;
    if (!r || r.status === 404) return kosong();
    if (!r.ok) throw new Error(String(r.status));
    const {profil} = await r.json(); document.title = `${profil.panggilan || profil.nama || "Profil"}, orang hilang, Centurisk97`;
    wadah.replaceChildren(kartuProfil(profil, {aksi: true}));
  } catch { const k = el("div", "oh-kosong"); k.append(el("b", null, "Data belum bisa dimuat"), el("span", null, "Periksa sambungan, lalu muat ulang halaman.")); wadah.replaceChildren(k); }
  finally { wadah.setAttribute("aria-busy", "false"); }
})();
