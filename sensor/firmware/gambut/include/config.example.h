// SALIN ke config.h lalu isi. config.h berisi kunci: JANGAN commit (sensor/.gitignore menahannya).
// Nilai di bawah hanya contoh bentuk; kunci/EUI sungguhan dari provisioning (lihat sensor/README.md bagian Keamanan).
#pragma once
#define ALAT_ID        "GAMBUT-CONTOH-01"        // sama persis dengan sensor_alat.id di server
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

// --- Khusus gambut ---
#define PIN_SDA 21
#define PIN_SCL 22
#define PIN_DAYA_SENSOR 25               // MOSFET menyalakan boost 12 V loop 4-20 mA hanya saat mengukur
#define SHUNT_OHM 150.0f                 // resistor shunt loop; 4 mA = 0,6 V, 20 mA = 3,0 V
#define TRANSDUCER_RENTANG_CM 500.0f     // rentang penuh transduser (0-5 mH2O) pada 20 mA
#define TRANSDUCER_DALAM_SUMUR_CM 150.0f // jarak permukaan gambut ke posisi transduser di dasar sumur pantau
#define OFFSET_NOL_MA 4.0f               // kalibrasi nol: arus saat transduser di udara (vented!)
#define LEMBAP_ADC_KERING 20000          // hitungan ADS1115 kanal 1 di udara
#define LEMBAP_ADC_JENUH 9000            // di air
#define INTERVAL_DET 10800               // 3 jam; muka air gambut berubah lambat
