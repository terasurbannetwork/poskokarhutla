/* Pemasang panel pemantauan alat (EW-05) tanpa skrip inline (gerbang-csp-inline):
   <script type="module" src="../inti/pantau_alat_pasang.js" data-bencana="banjir" data-sebelum="#insight"></script> */
import {pasang} from "./pantau_alat.js";
const s = document.querySelector('script[src*="pantau_alat_pasang.js"][data-bencana]');
if (s) pasang(s.dataset.sebelum || "#insight", s.dataset.bencana);
