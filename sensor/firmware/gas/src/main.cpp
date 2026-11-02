// Deteksi dini asap/bara: CO (elektrokimia ZE07-CO UART, atau MQ-7 analog yang kasar) + PM2.5/PM10 (PMS5003).
// Kipas PMS5003 dimatikan antar ukur (SET=LOW). Median N bacaan. Payload: packGas.
// BATAS: alat ini mengukur udara di titik pasangnya, bukan melihat api. Lihat sensor/README.md (perbandingan Dryad Silvanet).
#include <Arduino.h>
#include "config.h"
#include "bnpb_sensor.h"

// PMS5003: 32 byte 42 4D len(2) 13 kata data check(2). PM2.5 atmosferik = kata ke-6 (byte 12-13), PM10 = byte 14-15.
static bool bacaPms(float& pm25, float& pm10) {
  uint8_t f[32];
  uint32_t t0 = millis();
  while (millis() - t0 < 2500) {
    if (Serial2.available() >= 32 && Serial2.peek() == 0x42) {
      Serial2.readBytes(f, 32);
      uint16_t sum = 0;
      for (int i = 0; i < 30; i++) sum += f[i];
      if (f[1] == 0x4D && sum == (uint16_t)((f[30] << 8) | f[31])) {
        pm25 = (f[12] << 8) | f[13];
        pm10 = (f[14] << 8) | f[15];
        return true;
      }
    } else if (Serial2.available()) Serial2.read();
    delay(2);
  }
  return false;
}

static float bacaCo() {                                  // ppm; NAN bila gagal
#if defined(CO_ZE07)
  // Mode unggah aktif 9 byte: FF 04 03 00 hi lo rangeHi rangeLo cks. cks = (~(b1..b7))+1.
  // Konsentrasi = (hi*256+lo)*0,1 ppm. PERIKSA lembar data versi modul yang dibeli.
  uint8_t f[9];
  uint32_t t0 = millis();
  while (millis() - t0 < 2500) {
    if (Serial1.available() >= 9 && Serial1.peek() == 0xFF) {
      Serial1.readBytes(f, 9);
      uint8_t s = 0;
      for (int i = 1; i < 8; i++) s += f[i];
      if ((uint8_t)(~s + 1) == f[8]) return ((f[4] << 8) | f[5]) * 0.1f;
    } else if (Serial1.available()) Serial1.read();
    delay(2);
  }
  return NAN;
#else
  // MQ-7 modul AO (divider 2:1 ke ADC 3,3 V), RL 10 k, heater 5 V terus-menerus: hanya indikasi kasar.
  float vo = analogReadMilliVolts(PIN_MQ7) * 2.0f / 1000.0f;
  if (vo < 0.05f) return NAN;
  float rs = 10.0f * (5.0f - vo) / vo;
  return 99.042f * powf(rs / MQ7_R0_KOHM, -1.518f);
#endif
}

void setup() {
  bs::mulai();
  pinMode(PIN_PMS_SET, OUTPUT);
  digitalWrite(PIN_PMS_SET, HIGH);
  Serial2.begin(9600, SERIAL_8N1, PMS_RX, PMS_TX);
#if defined(CO_ZE07)
  Serial1.begin(9600, SERIAL_8N1, CO_RX, CO_TX);
#endif
  for (int i = 0; i < PMS_PEMANASAN_DET; i++) { delay(1000); bs::umpan(); }   // kipas perlu stabil sebelum angka sah
  while (Serial2.available()) Serial2.read();

  float p25[N_SAMPEL], p10[N_SAMPEL], co[N_SAMPEL];
  int np = 0, nc = 0;
  for (int i = 0; i < N_SAMPEL; i++) {
    float a, b;
    if (bacaPms(a, b)) { p25[np] = a; p10[np] = b; np++; }
    float c = bacaCo();
    if (!isnan(c) && c >= 0) co[nc++] = c;
    delay(1000);
    bs::umpan();
  }
  digitalWrite(PIN_PMS_SET, LOW);
  // NAN = sensor gagal -> sentinel di payload dan null di JSON (server tidak menganggapnya asap)
  float pm25 = np >= 2 ? bs::median(p25, np) : NAN, pm10 = np >= 2 ? bs::median(p10, np) : NAN;
  float cop = nc >= 2 ? bs::median(co, nc) : NAN;
  float volt = bs::baterai(BAT_PIN, BAT_PEMBAGI);
  bs::W w;
  bs::packGas(w, bs::seqBerikut(), volt, cop, pm25, pm10);
  String js = "{\"co_ppm\":" + bs::jn(cop) + ",\"pm25\":" + bs::jn(pm25) + ",\"pm10\":" + bs::jn(pm10) + "}";
  bs::kirim(w, js.c_str(), volt);
  bs::tidur(INTERVAL_DET);
}
void loop() {}
