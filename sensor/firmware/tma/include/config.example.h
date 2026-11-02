// SALIN ke config.h lalu isi. config.h berisi kunci: JANGAN commit (sensor/.gitignore menahannya).
// Nilai di bawah hanya contoh bentuk; kunci/EUI sungguhan dari provisioning (lihat sensor/README.md bagian Keamanan).
#pragma once
#define ALAT_ID        "TMA-CONTOH-01"        // sama persis dengan sensor_alat.id di server
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

// --- Khusus tma ---
#define SENSOR_A02YYUW                 // pilih satu: SENSOR_A02YYUW | SENSOR_JSN | SENSOR_RADAR_RS485
#define SENSOR_RX 25                     // A02YYUW TX -> ESP32 RX; JSN: TRIG=SENSOR_TX, ECHO=SENSOR_RX
#define SENSOR_TX 32
#define RS485_RX 25                      // radar RS485 (modul RS485-TTL auto-direction)
#define RS485_TX 32
#define RADAR_ALAMAT 1                   // alamat Modbus radar
#define RADAR_REG_JARAK 0x0000           // PERIKSA lembar data radar: register jarak (mm), bisa beda per merek
#define TINGGI_PASANG_CM 600.0f          // jarak sensor ke dasar sungai/nol papan duga
#define N_SAMPEL 9                       // median dari N bacaan (ganjil)
#define INTERVAL_NORMAL_DET 900          // 15 menit
#define INTERVAL_SIAGA_DET 300           // 5 menit saat naik cepat atau di atas waspada
#define LAJU_SIAGA_CM_JAM 10.0f          // sama dengan ambang waspada laju di ambang.json
#define TINGGI_WASPADA_CM 99999.0f       // isi dari papan duga setempat; 99999 = tak dipakai
