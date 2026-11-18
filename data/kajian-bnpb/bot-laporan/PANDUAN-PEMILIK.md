# Panduan pemilik: tiga langkah yang hanya bisa dikerjakan pemilik (BL-13)

Tiga langkah ini memakai akun dan kunci rahasia, jadi tidak dikerjakan agent. Urutannya bebas, kecuali langkah 3 yang baru bisa sesudah migrasi BL-01 dibuat. Semua perintah dijalankan di **mesin bot** (komputer tempat `scripts/wa/gateway` jalan; menurut `scripts/wa/README.md` itu Mac mini), dari folder repo.

Jangan pernah menempel kunci, token, atau kode rahasia ke chat Claude, ke WA, atau ke berkas yang di-commit.

---

## Langkah 1: kunci Claude API (sekitar 10 menit)

1. Buka claude.ai, masuk akun yang berpaket Ultra, buka **Pengaturan**, cari bagian **Kredit API**, klik **Tautkan organisasi**. Ikuti langkahnya sampai organisasi API tersambung dan kredit $200 per bulan tampil.
2. Buka **platform.claude.com** (Console) dengan akun yang sama, pilih organisasi tadi.
3. Masuk menu **API Keys**, klik **Create Key**, beri nama `bot-laporan-wa`. Salin kuncinya (diawali `sk-ant-`). Kunci hanya tampil sekali.
4. Di Console, cari pengaturan batas belanja (**Limits** atau **Spend limit**) dan pasang batas bulanan, misalnya $200. Cek juga apa yang terjadi saat kredit habis: berhenti atau ditagih ke kartu. Catat jawabannya untuk Q5.
5. Di mesin bot, buka `scripts/wa/.env` dengan editor teks dan tambahkan satu baris:

   ```
   ANTHROPIC_API_KEY=sk-ant-...kunci-lu...
   ```

   Simpan. Di Mac, pastikan berkas hanya bisa dibaca lu:

   ```bash
   chmod 600 scripts/wa/.env
   ```

6. Uji kuncinya (hanya membaca daftar model, tidak memakai kredit berarti):

   ```bash
   set -a; . scripts/wa/.env; set +a; curl -s https://api.anthropic.com/v1/models -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" | head -c 300
   ```

   Berhasil bila keluar teks berisi `claude-`. Keluar `authentication_error` berarti kunci salah salin.

Selesai bila uji di langkah 6 berhasil. Bilang ke Claude "kunci API sudah dipasang" (tanpa menyebut kuncinya).

---

## Langkah 2: izin Drive akun tim IT (sekitar 10 menit)

**Penting sebelum mulai.** Izin Drive bot sekarang tersambung ke akun pribadi lu dan dipakai juga oleh fitur lama: salin bahan WA ke Drive, perintah `cari`, dan unggah laporan terjadwal. Kalau izinnya diganti ke akun tim IT, fitur lama ikut pindah ke Drive tim IT, dan folder di `DRIVE_ROOT` serta `DRIVE_LAPORAN` (folder di Drive pribadi lu) tidak bisa dibuka lagi. Karena itu langkah 2b wajib.

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
