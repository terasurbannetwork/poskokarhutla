/* Worker modul untuk ensemble: menerima konteks (kisi angin, sumber, kota, prakiraan, hasil dasar, kunci kandidat) dan melapor kemajuan. */
import {jalankanEnsemble} from "./ensemble.js";
self.onmessage = e => { try { const r = jalankanEnsemble(e.data, (m, n) => self.postMessage({t: "progres", m, n})); self.postMessage({t: "selesai", ...r}); } catch (err) { self.postMessage({t: "galat", pesan: String(err?.message || err)}); } };
