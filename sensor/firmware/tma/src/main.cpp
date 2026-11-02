// Tinggi muka air sungai. Ultrasonik (A02YYUW / JSN-SR04T) atau radar RS485 Modbus. Median N bacaan, laju naik cm/jam.
// Siklus: bangun -> ukur -> hitung laju -> kirim -> deep sleep (cepat bila naik/di atas waspada).
// Payload: lib/bnpb_sensor/payload.h packTma. n = jumlah bacaan sah (0 = sensor rusak/tertutup; tinggi dikirim 0).
#include <Arduino.h>
#include "config.h"
#include "bnpb_sensor.h"

RTC_DATA_ATTR static float prevCm = NAN;
RTC_DATA_ATTR static uint32_t prevDet = 0;

#if defined(SENSOR_RADAR_RS485)
static uint16_t crc16(const uint8_t* d, int n) {
  uint16_t c = 0xFFFF;
  for (int i = 0; i < n; i++) { c ^= d[i]; for (int b = 0; b < 8; b++) c = (c & 1) ? (c >> 1) ^ 0xA001 : c >> 1; }
  return c;
}
#endif

// jarak sensor ke permukaan air, cm; NAN bila gagal
static float bacaJarakCm() {
#if defined(SENSOR_A02YYUW)
  Serial2.begin(9600, SERIAL_8N1, SENSOR_RX, SENSOR_TX);      // frame 4 byte: FF H L SUM, jarak mm
  uint32_t t0 = millis();
  while (millis() - t0 < 700) {
    if (Serial2.available() >= 4 && Serial2.peek() == 0xFF) {
      uint8_t f[4];
      Serial2.readBytes(f, 4);
      if (((f[0] + f[1] + f[2]) & 0xFF) == f[3]) return ((f[1] << 8) | f[2]) / 10.0f;
    } else if (Serial2.available()) Serial2.read();
  }
  return NAN;
#elif defined(SENSOR_JSN)
  pinMode(SENSOR_TX, OUTPUT); pinMode(SENSOR_RX, INPUT);      // TRIG, ECHO
  digitalWrite(SENSOR_TX, LOW); delayMicroseconds(5);
  digitalWrite(SENSOR_TX, HIGH); delayMicroseconds(12); digitalWrite(SENSOR_TX, LOW);
  unsigned long us = pulseIn(SENSOR_RX, HIGH, 40000);
  return us ? us * 0.0343f / 2.0f : NAN;                      // 343 m/s pada 20 C; suhu tak dikompensasi (~0,17%/C)
#elif defined(SENSOR_RADAR_RS485)
  Serial2.begin(9600, SERIAL_8N1, RS485_RX, RS485_TX);        // Modbus RTU fungsi 03, 1 register = jarak mm
  uint8_t q[8] = {RADAR_ALAMAT, 0x03, RADAR_REG_JARAK >> 8, RADAR_REG_JARAK & 255, 0, 1, 0, 0};
  uint16_t c = crc16(q, 6); q[6] = c & 255; q[7] = c >> 8;
  while (Serial2.available()) Serial2.read();
  Serial2.write(q, 8); Serial2.flush();
  uint8_t r[7]; uint32_t t0 = millis(); int n = 0;
  while (n < 7 && millis() - t0 < 800) if (Serial2.available()) r[n++] = Serial2.read();
  if (n < 7 || r[0] != RADAR_ALAMAT || r[1] != 3) return NAN;
  c = crc16(r, 5);
  if (r[5] != (c & 255) || r[6] != (c >> 8)) return NAN;
  return ((r[3] << 8) | r[4]) / 10.0f;
#else
#error "Pilih SENSOR_A02YYUW, SENSOR_JSN, atau SENSOR_RADAR_RS485 di config.h"
#endif
}

void setup() {
  bs::mulai();
  float s[N_SAMPEL];
  int n = 0;
  for (int i = 0; i < N_SAMPEL; i++) {
    float j = bacaJarakCm();
    if (!isnan(j) && j > 20 && j < TINGGI_PASANG_CM) s[n++] = j;   // < 20 cm = di luar zona buta sensor
    delay(250);
    bs::umpan();
  }
  float tinggi = 0, laju = 0;
  uint32_t now = bs::detikSekarang();
  if (n >= 3) {
    tinggi = TINGGI_PASANG_CM - bs::median(s, n);
    if (!isnan(prevCm) && now > prevDet + 60) laju = (tinggi - prevCm) / ((now - prevDet) / 3600.0f);
    prevCm = tinggi; prevDet = now;
  } else n = 0;

  float volt = bs::baterai(BAT_PIN, BAT_PEMBAGI);
  bs::W w;
  bs::packTma(w, bs::seqBerikut(), volt, tinggi, laju, n);
  char js[96];
  snprintf(js, sizeof js, "{\"tinggi_cm\":%.1f,\"laju_cm_jam\":%.1f,\"n\":%d}", tinggi, laju, n);
  bs::kirim(w, js, volt);

  bool waspada = laju >= LAJU_SIAGA_CM_JAM || tinggi >= TINGGI_WASPADA_CM;
  bs::tidur(waspada ? INTERVAL_SIAGA_DET : INTERVAL_NORMAL_DET);
}
void loop() {}
