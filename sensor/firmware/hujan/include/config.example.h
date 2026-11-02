// SALIN ke config.h lalu isi. config.h berisi kunci: JANGAN commit (sensor/.gitignore menahannya).
// Nilai di bawah hanya contoh bentuk; kunci/EUI sungguhan dari provisioning (lihat sensor/README.md bagian Keamanan).
#pragma once
#define ALAT_ID        "HUJAN-CONTOH-01"        // sama persis dengan sensor_alat.id di server
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

// --- Khusus hujan ---
#define PIN_TIPPER 33                    // reed ke GND; harus pin RTC (GPIO 32/33/34..39 tanpa pullup internal untuk 34-39)
#define MM_PER_TIP 0.2f                  // ember jungkit 0,2 mm; ukur dengan gelas ukur (lihat README kalibrasi)
#define DEBOUNCE_MS 150                  // reed bergetar; abaikan jungkitan lebih rapat dari ini
#define INTERVAL_LAPOR_DET 600           // laporan tiap 10 menit
#define RING_TIP 400                     // kapasitas catatan jungkitan 60 menit (hujan 100 mm/jam = 500 tip: naikkan bila perlu)
