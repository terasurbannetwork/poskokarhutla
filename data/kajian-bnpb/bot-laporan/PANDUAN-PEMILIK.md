# Panduan pemilik: tiga langkah yang hanya bisa dikerjakan pemilik (BL-13)

Tiga langkah ini memakai akun dan kunci rahasia, jadi tidak dikerjakan agent. Urutannya bebas, kecuali langkah 3 yang baru bisa sesudah migrasi BL-01 dibuat. Semua perintah dijalankan di **mesin bot** (komputer tempat `scripts/wa/gateway` jalan; menurut `scripts/wa/README.md` itu Mac mini), dari folder repo.

Jangan pernah menempel kunci, token, atau kode rahasia ke chat Claude, ke WA, atau ke berkas yang di-commit.

---

## Langkah 1: kunci Claude API (sekitar 10 menit)

1. Buka claude.ai, masuk akun yang berpaket Ultra, buka **Pengaturan**, cari bagian **Kredit API**, klik **Tautkan organisasi**. Ikuti langkahnya sampai organisasi API tersambung dan kredit $200 per bulan tampil.
2. Buka **platform.claude.com** (Console) dengan akun yang sama, pilih organisasi tadi.
3. Masuk menu **API Keys**, klik **Create Key**, beri nama `bot-laporan-wa`. Salin kuncinya (diawali `sk-ant-`). Kunci hanya tampil sekali.
4. Di Console, cari pengaturan batas belanja (**Limits** atau **Spend limit**) dan pasang batas bulanan, misalnya $200. Cek juga apa yang terjadi saat kredit habis: berhenti atau ditagih ke kartu. Catat jawabannya untuk Q5.
### 1A. Uji kunci di PC Windows (tanpa menyimpan ke berkas)

Kunci bisa diuji dari komputer mana saja. Ujinya dua: (1) kunci dikenali, (2) kunci benar-benar bisa memakai kredit.

1. Buka **PowerShell** (tekan tombol Windows, ketik `PowerShell`, Enter).
2. Tempel kunci ke variabel sementara. Kunci hanya hidup di jendela ini dan hilang saat jendela ditutup:

   ```powershell
   $k = Read-Host "Tempel kunci API lalu Enter"
   ```

3. Uji 1, kunci dikenali (gratis):

   ```powershell
   (Invoke-RestMethod -Uri "https://api.anthropic.com/v1/models" -Headers @{ "x-api-key" = $k; "anthropic-version" = "2023-06-01" }).data.id
   ```

   Berhasil: keluar daftar nama model seperti `claude-opus-5-5`. Gagal dengan `401` atau `authentication_error`: kunci salah salin (biasanya kurang satu huruf di ujung); salin ulang dari Console.

4. Uji 2, kredit bisa dipakai (biayanya di bawah Rp500):

   ```powershell
   $body = @{ model = "claude-opus-5-5"; max_tokens = 1000; messages = @(@{ role = "user"; content = "Balas satu kalimat: kunci berfungsi." }) } | ConvertTo-Json -Depth 5
   $r = Invoke-RestMethod -Method Post -Uri "https://api.anthropic.com/v1/messages" -Headers @{ "x-api-key" = $k; "anthropic-version" = "2023-06-01"; "content-type" = "application/json" } -Body $body
   ($r.content | Where-Object type -eq "text").text
   ```

   Berhasil: keluar kalimat balasan Claude. Gagal dengan `400` dan pesan soal `credit balance` atau `billing`: organisasi belum tersambung ke kredit Ultra, ulangi langkah 1. Gagal dengan `429`: tunggu satu menit lalu ulangi.

5. Tutup jendela PowerShell supaya kunci hilang dari memori.

### 1B. Simpan kunci di mesin bot

Berkasnya `scripts/wa/.env` di dalam folder repo **di mesin bot** (Mac mini). Di PC Windows berkas ini memang tidak ada, karena bot tidak jalan di sini. Berkas ini sudah diabaikan git (`scripts/wa/.gitignore`), jadi tidak akan ikut ter-commit.

1. Di Mac mini, buka **Terminal**, masuk ke folder repo:

   ```bash
   cd ~/Developer/poskokarhutla
   ```

   (Kalau repo ada di folder lain, ganti alamatnya. Cari dengan `ls ~/Developer ~/Documents/GitHub`.)

2. Pastikan berkasnya ada:

   ```bash
   ls -l scripts/wa/.env
   ```

   Kalau keluar "No such file", bot belum pernah dipasang di mesin ini; ikuti `scripts/wa/README.md` bagian Pasang dulu.

3. Buka berkasnya di TextEdit:

   ```bash
   open -e scripts/wa/.env
   ```

4. Di baris paling bawah, tambahkan satu baris (tanpa spasi di sekitar `=`, tanpa tanda kutip):

   ```
   ANTHROPIC_API_KEY=sk-ant-...kunci-lu...
   ```

   Simpan (Cmd+S) lalu tutup TextEdit.

5. Kunci berkas supaya hanya akun lu yang bisa membaca:

   ```bash
   chmod 600 scripts/wa/.env
   ```

6. Uji dari mesin bot, membaca kunci langsung dari berkas (gratis):

   ```bash
   K=$(grep '^ANTHROPIC_API_KEY=' scripts/wa/.env | cut -d= -f2-); curl -s https://api.anthropic.com/v1/models -H "x-api-key: $K" -H "anthropic-version: 2023-06-01" | grep -o 'claude-[a-z0-9-]*' | head -3; unset K
   ```

   Berhasil: keluar tiga nama model `claude-...`. Tidak keluar apa-apa: baris di `.env` salah tulis (cek ejaan `ANTHROPIC_API_KEY` dan tidak ada spasi).

Bot belum memakai kunci ini sampai tiket BL-04 selesai, jadi gateway tidak perlu dinyalakan ulang.

Selesai bila 1A dan 1B berhasil. Bilang ke Claude "kunci API sudah dipasang" (tanpa menyebut kuncinya).

---

## Langkah 2: izin Drive akun tim IT (cek 1 menit; ganti hanya bila perlu)

Menurut pemilik (18 Nov 2026), bot WA yang sekarang sudah mengunggah lewat akun tim IT BNPB. Kalau begitu langkah ini cukup dicek, tidak perlu login ulang. Komentar lama di `scripts/wa/drive.cjs` masih menyebut "akun pribadi pemilik"; komentar itu yang usang.

### Cek akun yang tersambung

Di Terminal Mac mini, dari folder repo (hanya membaca email akun, tidak mengubah apa pun):

```bash
node -e "require('./scripts/wa/umum.cjs').muatEnv(); const d=require('./scripts/wa/drive.cjs').buat({env:process.env}); d.token().then(t=>fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',{headers:{Authorization:'Bearer '+t}})).then(r=>r.json()).then(j=>console.log(j.user?j.user.emailAddress:j)).catch(e=>console.log('gagal:',e.message))"
```

- Keluar email akun tim IT: **langkah 2 selesai**, lewati 2a sampai 2c.
- Keluar email lain atau `gagal`: kerjakan 2a sampai 2c di bawah. Izin Drive juga dipakai fitur lama (salin bahan WA ke Drive, perintah `cari`, unggah laporan terjadwal), jadi folder di `DRIVE_ROOT` dan `DRIVE_LAPORAN` harus diganti ke folder di Drive tim IT (2b).

### 2a. Pastikan akun tim IT boleh login ke aplikasi OAuth

1. Buka console.cloud.google.com dengan akun yang membuat `DRIVE_CLIENT_ID` (kemungkinan akun pribadi lu).
2. Pilih proyeknya, buka **APIs & Services**, lalu **OAuth consent screen**.
3. Kalau status aplikasinya **Testing**, tambahkan email akun tim IT BNPB di **Test users**. Tanpa ini, login akun tim IT ditolak.

### 2b. Siapkan folder di Drive tim IT

1. Buka Drive akun tim IT. Buat atau pilih folder untuk bahan WA dan folder untuk laporan (misalnya di `TIm IT BNPB/1. Laporan Harian`).
2. Buka tiap folder, salin ID-nya dari alamat browser (bagian sesudah `/folders/`).
3. Di `scripts/wa/.env`, ganti nilai `DRIVE_ROOT` dan `DRIVE_LAPORAN` dengan ID folder baru. Simpan nilai lama di catatan lu, kalau suatu saat mau kembali.

### 2c. Login ulang

1. Hentikan gateway dulu supaya tidak mengunggah di tengah pergantian (di Mac: `launchctl unload ~/Library/LaunchAgents/id.centurisk97.wa-gateway.plist`).
2. Jalankan:

   ```bash
   node scripts/wa/drive-masuk.mjs
   ```

3. Skrip mencetak satu alamat. Buka alamat itu di browser, **pilih akun tim IT BNPB, bukan akun pribadi**, lalu izinkan.
4. Browser menampilkan halaman selesai dan terminal menulis `Tersimpan di ...drive.json`.
5. Nyalakan lagi gateway: `launchctl load ~/Library/LaunchAgents/id.centurisk97.wa-gateway.plist`.
6. Uji: kirim `cari laporan` ke bot dari nomor lu. Bot harus membalas daftar dari Drive tim IT.

Selesai bila uji di 2c.6 menampilkan isi Drive tim IT.

---

## Langkah 3: terapkan migrasi `bl_*` di D1 produksi (sesudah BL-01 selesai, sekitar 2 menit)

Tunggu sampai Claude bilang migrasi BL-01 sudah ada di repo dan sudah di-push.

1. Dari folder repo di komputer yang sudah login Cloudflare (`npx wrangler whoami` menampilkan akun lu):

   ```bash
   npx wrangler d1 migrations apply poskowarga --remote -c wrangler.jsonc
   ```

2. Wrangler menampilkan daftar migrasi yang akan diterapkan. Pastikan isinya hanya migrasi baru `..._bl_proyek.sql` (dan migrasi lain yang memang sudah lu tunggu), lalu jawab `y`.
3. Berhasil bila tiap baris berstatus berhasil (tanda centang).

Bilang ke Claude "migrasi bl sudah diterapkan" supaya tiket berikutnya bisa diuji ke produksi.

## Langkah 4: nyalakan bot V2 (agen Claude Code, sekitar 10 menit)

V2 (KEPUTUSAN K22-K24) menjalankan Claude Code di Mac mini untuk tiap laporan dan revisi. Hanya nomor di `BL_V2_NOMOR` (bawaan: nomor PEMILIK) yang memakai V2; nomor lain tetap V1.

1. Di Mac mini: `cd ~/Developer/poskokarhutla && git pull origin main`, lalu `cd scripts/wa/gateway && npm ci` (memasang `@anthropic-ai/claude-agent-sdk`, termasuk program Claude Code untuk macOS).
2. Dianjurkan (Q17): buat workspace baru di Console Anthropic khusus bot V2, pasang batas belanja bulanan, buat kunci API di workspace itu.
3. Tambahkan ke `scripts/wa/.env`: `BL_VERSI=2`, `BL_AGEN_KUNCI=<kunci workspace V2>` (boleh kosong, jatuh ke `ANTHROPIC_API_KEY`), dan naikkan `BL_BATAS_USD=25`.
4. Cek: `node scripts/wa/proyek.mjs --kering` harus menampilkan `agen_sdk: true` dan `agen_nomor: true`.
5. Nyalakan ulang gateway: `launchctl kickstart -k gui/$(id -u)/id.centurisk97.wa-gateway`.
6. Uji dari WA: `buat harian`, kirim bahan, `lanjut`. Draf V2 butuh 2 sampai 6 menit.
7. Kembali ke V1 kapan saja: hapus baris `BL_VERSI=2`, lalu nyalakan ulang gateway. Proyek yang sudah dibuat V2 tetap direvisi V2 sampai final atau batal.
