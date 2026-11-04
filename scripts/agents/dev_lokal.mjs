/* Worker lokal untuk pratinjau: `node scripts/agents/dev_lokal.mjs [port]`.
   `wrangler dev` mengawasi tiap berkas public/ (>11 rb) dengan fs.watch; di macOS fd lalu melewati 10240 (OPEN_MAX)
   dan setiap spawn (esbuild, workerd) gagal EBADF. API wrangler bisa mematikan pengawas itu; ubah kode = jalankan ulang. */
import {unstable_startWorker} from "wrangler";

const port = +(process.argv[2] || process.env.PORT || 8788);
const w = await unstable_startWorker({config: "wrangler.jsonc", dev: {watch: false, remote: false, server: {port}}});
console.log("siap di " + (await w.url));
