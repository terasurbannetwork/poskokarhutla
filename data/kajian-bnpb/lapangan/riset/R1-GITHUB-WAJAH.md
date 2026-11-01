# R1. GitHub: wajah di peramban, liveness, presensi bergeotag

Riset 1 Nov 2026. Metadata repo diambil dari api.github.com. **[BELUM TERVERIFIKASI]** = belum dicek langsung.

## Temuan utama
1. Tidak ada proyek presensi sumber terbuka yang matang untuk ditiru utuh. Repo "absensi selfie / presensi GPS" di
   GitHub kecil (0 sampai 19 bintang) dan hampir semua tanpa lisensi, jadi kodenya tidak boleh disalin. Yang ditiru
   bagiannya: MediaPipe atau Human untuk wajah, MiniFASNet untuk liveness pasif, skema `Employee Checkin` Frappe HRMS
   (GPL-3.0, hanya ditiru bentuknya).
2. **Cloudflare Workers AI tidak punya model wajah** (https://developers.cloudflare.com/workers-ai/models/). Embedding
   wajah dihitung di peramban; Worker menyimpan templat dan membandingkan.
3. **Bobot InsightFace non-komersial** (https://raw.githubusercontent.com/deepinsight/insightface/master/README.md):
   dihindari.

## Pustaka wajah tanpa build

| Kandidat | Status | Lisensi | Model | Catatan |
|---|---|---|---|---|
| vladmandic/human | 3.367 bintang, 13 Des 2025 | MIT (bobot per model [BELUM TERVERIFIKASI]) | BlazeFace 527 KB, FaceMesh 1,5 MB, FaceRes 6,7 MB (1024 dimensi), antispoof 834 KB, liveness 580 KB | Gestur facing left/right, head up/down, blink. https://github.com/vladmandic/human |
| MediaPipe Face Landmarker (`@mediapipe/tasks-vision`) | aktif | Apache-2.0 (kode) | ~3,7 MB [BELUM TERVERIFIKASI] | Matriks transformasi wajah untuk yaw/pitch, blendshape untuk kedip. Tanpa embedding. https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js |
| OpenCV Zoo SFace | opencv_zoo | Apache-2.0 | `face_recognition_sface_2021dec_int8bq.onnx`, akurasi uji 0,993 | Embedding dengan onnxruntime-web; dimensi 128 dan ambang kosinus 0,363 [BELUM TERVERIFIKASI]. https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_recognition_sface/README.md |
| vladmandic/face-api | 1.081 bintang, 5 Feb 2025 | MIT | 128 dimensi [BELUM TERVERIFIKASI] | Fork terawat face-api.js |
| justadudewhohacks/face-api.js | terakhir 24 Jan 2024 | MIT | | Ditinggalkan, dihindari |
| InsightFace | 30.104 bintang | kode MIT, bobot non-komersial | | Dihindari |

Latensi di HP Android menengah: belum diukur; uji di 2 sampai 3 HP kelas Rp2 jutaan sebelum memutuskan.

## Pendaftaran multi-pose dan liveness
- Tidak ditemukan proyek yang mendokumentasikan pendaftaran 5 pose dengan ambang sudut.
- sssxyd/face-liveness-detector (MIT, 22 Jan 2026, di atas Human + OpenCV.js): aksi blink, mouth_open, nod_down,
  nod_up; urutan acak; batas 15 detik; gerbang mutu rasio wajah 0,5 sampai 0,9, frontal ≥ 0,9, Laplacian ≥ 40;
  15 frame lolos berturut. https://github.com/sssxyd/face-liveness-detector
- Silent-Face-Anti-Spoofing / MiniFASNet (Apache-2.0, tidak dikembangkan sejak Okt 2023): dua model ONNX sekitar 4 MB,
  tahan foto cetak dan layar, tidak tahan deepfake. https://github.com/minivision-ai/Silent-Face-Anti-Spoofing

## Aplikasi presensi bergeotag
- shosst17/presensi-penggajian-app (Laravel 12): Haversine dihitung di server, radius per kantor, swafoto wajib kamera
  langsung (bukan galeri). Tanpa deteksi mock-location.
- p8kaushal/face-attendance (MIT): MediaPipe di klien, antrean luring IndexedDB, geofence meter.
- frappe/hrms Employee Checkin (GPL-3.0): employee, log_type IN/OUT, time, device_id, shift, latitude, longitude.
- Tidak satu pun mendokumentasikan deteksi GPS palsu atau waktu foto palsu. Peramban tidak bisa mendeteksi aplikasi
  fake GPS; pertahanan realistis ada di server (akurasi tak wajar, lompatan mustahil, banyak akun satu perangkat,
  tinjauan sampel). Deteksi mock sejati butuh aplikasi native.

## Pembanding server
CompreFace (Apache-2.0, kurang terawat), deepface (MIT, aktif): Python, tidak jalan di Worker.

## Rekomendasi
- Pose dan kedip: MediaPipe Face Landmarker (`runningMode: "VIDEO"`, `outputFacialTransformationMatrixes`,
  `outputFaceBlendshapes`), versi dipatok.
- Embedding: SFace int8 lewat onnxruntime-web, atau Human FaceRes; pilih sesudah uji wajah Indonesia di HP lapangan.
- Liveness pasif: MiniFASNet atau antispoof Human.
- Model disimpan sendiri di aset statis/R2 dan di-cache Service Worker.
- Pendaftaran: depan, kiri, kanan, atas, bawah; ambang awal depan |yaw|,|pitch| ≤ 8°, kiri/kanan |yaw| 20° sampai 30°,
  atas/bawah |pitch| 12° sampai 15°; tahan ≥ 5 frame; 3 sampai 5 frame terbaik per pose; **satu embedding per pose**,
  verifikasi memakai kemiripan terbaik dari lima.
- Presensi: satu tantangan acak (kedip atau toleh) + skor pasif. Ambang dikalibrasi dari data BNPB sendiri (FAR/FRR).
  Wajah gagal masuk antrean tinjauan manusia, bukan ditolak otomatis.

## Jebakan
Waktu klien dan EXIF bisa dipalsukan (pakai waktu server + nonce sekali pakai); fake GPS tak terdeteksi di web;
kamera dan GPS butuh HTTPS; HP murah di bawah 10 fps (turunkan ke 640x480); antrean luring wajib dan ditandai, bukan
ditolak; embedding wajah tetap data pribadi spesifik; hindari bobot InsightFace dan menyalin kode GPL.
