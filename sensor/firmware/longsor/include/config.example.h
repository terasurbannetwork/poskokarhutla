// SALIN ke config.h lalu isi. config.h berisi kunci: JANGAN commit (sensor/.gitignore menahannya).
// Nilai di bawah hanya contoh bentuk; kunci/EUI sungguhan dari provisioning (lihat sensor/README.md bagian Keamanan).
#pragma once
#define ALAT_ID        "LONGSOR-CONTOH-01"        // sama persis dengan sensor_alat.id di server
#define WDT_DETIK      90            // watchdog; harus > waktu kerja terlama satu siklus
#define BAT_PIN        35            // ADC1, pembagi tegangan dari baterai
#define BAT_PEMBAGI    2.0f          // (R1+R2)/R2, ukur ulang dengan multimeter

// --- LoRaWAN (MODE_LORAWAN), region AS923 ---
#define LORA_NSS 5
#define LORA_IRQ 26                  // DIO0 (SX1276) / DIO1 (SX1262)
#define LORA_RST 14
#define LORA_DIO1 27                 // SX1276
#define LORA_BUSY 27                 // SX1262
// #define RADIO_SX1262              // aktifkan bila modulnya SX1262
#define LORAWAN_DR 3                 // AS923 DR3 = SF9/125 kHz; turunkan ke 2/1 untuk jarak jauh
#define LORAWAN_JOIN_EUI 0x0000000000000000ULL
#define LORAWAN_DEV_EUI  0x0000000000000000ULL
#define LORAWAN_NWK_KEY  { 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0 }
#define LORAWAN_APP_KEY  { 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0 }

// --- Seluler (MODE_SELULER), SIM7600 / A7670 ---
#define MODEM_RX 16
#define MODEM_TX 17
#define MODEM_PWRKEY 4
#define APN "internet"
#define APN_USER ""
#define APN_SANDI ""
#define SERVER_HOST "centurisk97.id"
#define SERVER_PORT 443
#define SERVER_TLS
#define SERVER_PATH "/api/sensor/baca"
#define KUNCI_HMAC "GANTI-DENGAN-KUNCI-ALAT-DARI-PROVISIONING"

// --- Meshtastic (MODE_MESHTASTIC): UART ke Serial Module node Meshtastic ---
#define MESH_RX 16
#define MESH_TX 17
#define MESH_BAUD 38400

// --- Khusus longsor ---
#define PIN_EXTENSO 34                   // potensiometer kawat (ADC1)
#define EXTENSO_RENTANG_MM 500.0f        // panjang tarikan kawat penuh = ADC 4095
#define PIN_SIRENE 13                    // relay sirene (HIGH = nyala), ditahan lewat deep sleep
#define PIN_LEMBAP 36                    // sensor kelembapan kapasitif
#define LEMBAP_ADC_KERING 3100           // bacaan di udara; kalibrasi lapangan
#define LEMBAP_ADC_JENUH 1400            // bacaan di air; kalibrasi lapangan
#define TILT_MPU6050                     // atau TILT_ADXL345
#define PIN_SDA 21
#define PIN_SCL 22
#define INTERVAL_CEK_DET 60              // bangun tiap menit untuk menilai sirene (offline)
#define INTERVAL_LAPOR_DET 900           // lapor tiap 15 menit; 120 detik bila waspada
#define SIRENE_LAJU_MM_JAM 10.0          // HARUS sama dgn ambang.json jenis.longsor.sirene_lokal.nilai (diuji)
#define SIRENE_KONFIRMASI 2              // sampel berturut-turut (sama dgn ...konfirmasi)
#define SIRENE_TAHAN_MENIT 10            // sirene menyala minimal sekian menit
#define LAJU_WASPADA_MM_JAM 2.0f         // mempercepat pelaporan
