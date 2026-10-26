/* Halaman admin tidak boleh mengirim balasan 403 langsung ke /admin/masuk?ke=<halaman ini>. GET /admin/masuk dengan sesi sah membalas 303 ke ?ke=,
   jadi akun yang login tapi tak berhak (akun gerbang AKUN_SITUS ke rute moderator) dipantulkan balik dan halaman memuat ulang tanpa henti
   (Layar Pimpinan, 25 Okt 2026). Jalur yang benar: Admin.keMasuk() di public/admin/bersama.js, yang memeriksa sesi dulu.
   Jalankan: node --test tests/warga/admin-403-pantul.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, existsSync} from "node:fs";

test("tidak ada 403 -> /admin/masuk?ke= di luar Admin.keMasuk", () => {
  const dir = new URL("../../public/admin/", import.meta.url), salah = [];
  /* public/pipa/*.js (SIPPA, DESAIN-TEKNIS §1.4 butir 5) dipindai dengan aturan yang sama; folder belum ada = tidak ada yang dipindai */
  const pipa = new URL("../../public/pipa/", import.meta.url), berkasPipa = existsSync(pipa) ? readdirSync(pipa).filter(f => f.endsWith(".js") && !f.includes(" ")).map(f => [`pipa/${f}`, new URL(f, pipa)]) : [];
  const berkas = [...readdirSync(dir).filter(f => f.endsWith(".js") && f !== "bersama.js" && !f.includes(" ")).map(f => [f, new URL(f, dir)]), ...berkasPipa];
  for (const [f, u] of berkas)
    readFileSync(u, "utf8").split("\n").forEach((b, i) => { if (/403/.test(b) && /\/admin\/masuk\?ke=/.test(b)) salah.push(`${f}:${i + 1}`); });
  assert.deepEqual(salah, [], `403 dialihkan ke /admin/masuk?ke= tanpa cek sesi (pantulan tak berujung untuk akun tak berhak): ${salah.join(", ")}`);
  assert.match(readFileSync(new URL("bersama.js", dir), "utf8"), /redirect: "manual"[\s\S]*opaqueredirect/, "Admin.keMasuk harus memeriksa sesi lewat GET /admin/masuk redirect:manual");
});
