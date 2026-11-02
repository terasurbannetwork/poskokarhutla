# Ilmu sensor

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/sensor.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca sensor`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus sensor "..."`.

## Peta berkas & tabel


| Berkas | Peran |
| --- | --- |
| `sensor/payload.py` + `sensor/firmware/lib/bnpb_sensor/payload.h` | kodek biner KEMBAR (kepala 4 B + SKEMA per jenis); sentinel rusak = u16 0xFFFF / i16 0x7FFF / u8 255 (kecuali `tips`) |
| `sensor/ambang.json`, `sensor/ambang.py` | ambang per jenis + `dasar`; `tingkat()` melewati nilai None/null |
| `sensor/firmware/{tma,hujan,longsor,gambut,gas}/` | proyek PlatformIO (`src/main.cpp`, `include/config.example.h`, env lorawan/seluler/meshtastic) |
| `sensor/firmware/lib/bnpb_sensor/` | `bnpb_sensor.cpp` (watchdog, baterai, median, deep sleep, kirim per MODE_*), `bnpb_seluler.h` (TinyGSM + HMAC mbedtls) |
| `sensor/gateway/penanda.py` | `tanda()` HMAC, `Pengirim` antrean disk; `lorawan_webhook.py`; `meshtastic_mqtt.py` (paho opsional) |
| `sensor/sim/simulasi.py` | 10 skenario, nilai lewat kodek biner, kirim bertanda |
| `tests/sensor/test_*.py`, `payload_emas.cpp` | uji tanpa perangkat keras; jalankan `python3 -m unittest discover -s tests/sensor -p 'test_*.py'` |
| Tabel D1 `sensor_alat`, `sensor_baca` | milik `warga-api` (`src/sensor.js`, migrasi 0089); kontrak di spec logbook-pusdalops-design bagian Sensor |


## Aturan & invarian


- Kontrak ke worker: badan JSON ringkas, `X-Sensor-Tanda` = HMAC-SHA256 hex huruf kecil atas BYTE badan; kunci = string kunci apa adanya; waktu UTC `...Z`, selisih > 10 menit ditolak.
- Python 3.9 (mesin ini): tanpa `match`, tanpa `X | Y` tipe. Gateway hanya stdlib; satu-satunya dependensi opsional `paho-mqtt` (diimpor di `__main__`).
- Ubah `payload.py` = ubah `payload.h` di giliran yang sama; uji `test_firmware_payload_h_sama_dengan_python` mengompilasi C++ dan membandingkan hex.
- Pembulatan payload setengah menjauhi nol (bukan `round()` Python) agar sama dengan C++.
- Sirene lokal longsor dinilai SEBELUM radio/seluler; nilainya (`SIRENE_LAJU_MM_JAM`, `SIRENE_KONFIRMASI`) disalin dari `ambang.json` `sirene_lokal` dan dijaga uji konsistensi.
- Antrean tidak menyimpan tanda tangan: badan dibangun dan ditandai ulang saat kirim; bacaan > 540 detik dikirim `waktu`=kini + `waktu_asli`; > 24 jam dibuang ke ditolak/.
- Rahasia (`config.h`, `gateway.json`, `kunci*.json`, `antrean/`) di `sensor/.gitignore`; contoh `*.example.*` tak boleh memuat 32+ heks.
- Sensor rusak dikirim sentinel/null, jangan nilai ekstrem (nilai ekstrem memicu alarm palsu).


## Ranjau yang pernah meledak


- Firmware dikompilasi 1 Nov (15 build hijau) tapi belum diuji di perangkat. TinyGSM SIM7600 TIDAK punya `TinyGsmClientSecure`: HTTPS lewat AT+HTTP* (`bnpb_seluler.h`). Nama bidang telemetri Meshtastic belum diverifikasi. Registri PlatformIO lambat dari mesin ini (~7 KB/s): build memakai paket GitHub lokal di scratchpad (lihat kasus).
- Kunci alat = HMAC-SHA256(SENSOR_KUNCI_INDUK, alat_id) heks (`gateway/kunci_alat.py`); `waktu` = waktu kirim, `waktu_asli` sampai 24 jam; LAPOR ke /api/sensor/lapor {alat,waktu,pengirim_node,teks} bertanda kunci alat gateway.
- Pin: SPI VSPI ESP32 = 18/19/23; pin sensor contoh menghindarinya (siren 13, PMS 32/25/13). Reed hujan wajib pin RTC (GPIO33).
- BSD sed (macOS) butuh `sed -i ''`.
- Waktu miring: LoRa tak punya jam; gateway memberi waktu terima. Seluler memakai jam jaringan modem (tolak tahun < 2025).
- `kunci_hash` di spec ambigu dengan HMAC (butuh rahasia asli); lihat Pertanyaan terbuka di `sensor/README.md`.


- Teks Meshtastic `SENSOR` wajib: node terdaftar (`nodes`), MAC 8 byte HMAC(kunci_alat,payload), seq tidak berulang; broker pribadi + PSK. Webhook: loopback, compare_digest, tolak GANTI. Antrean 0700/0600. Firmware meshtastic berubah, PERLU KOMPILASI ULANG.

## Gerbang yang menghakimi


- `python3 -m unittest discover -s tests/sensor -p 'test_*.py'` (30 uji): kodek bolak-balik + emas + cocok-C++, HMAC (RFC 4231 + vektor openssl), simulator melewati ambang di tingkat yang diharapkan, simpan-lalu-teruskan lawan worker palsu, webhook ChirpStack/TTN, Meshtastic SENSOR/LAPOR, konsistensi sirene firmware vs ambang.json dan rahasia tak terlacak.
- Belum ada skrip `uji:sensor` di package.json (milik `mekanik-mesin`).


## Kasus
- 2026-11-01 · Sensor rusak harus dikirim sebagai sentinel/null, bukan angka ekstrem: -3276 cm gambut atau 6553 ug/m3 gas akan memicu awas palsu. Tahu salah bila ambang.tingkat memberi >0 pada nilai None (uji test_sensor_rusak_bukan_alarm).
- 2026-11-01 · Antrean store-and-forward tak boleh menyimpan tanda tangan: worker menolak waktu >10 menit, jadi bacaan lama ditandai ulang dengan waktu=kini + waktu_asli. Tahu salah bila test_bacaan_usang_dikirim_dengan_waktu_baru_dan_waktu_asli gagal.
- 2026-11-01 · Build firmware offline-lambat: pio registry ~7 KB/s dari mesin ini, GitHub ~1 MB/s. Cara: platform=git URL v6.9.0, platform_packages=file:// ke toolchain crosstool-NG macos-arm64, arduino-esp32 2.0.17 zip (+package.json name/version PIO), esptool v4.5.1; lib_deps file:// zip GitHub; skrip di scratchpad. Pin ini repo tetap versi registri.
