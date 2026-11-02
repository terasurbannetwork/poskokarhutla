// Gerakan tanah: ekstensometer kawat (potensiometer), kemiringan (MPU6050 / ADXL345), kelembapan tanah kapasitif.
// KRITIS: sirene lokal dinilai di perangkat SEBELUM menyentuh radio/seluler. Tanpa jaringan sirene tetap menyala.
// Bangun tiap INTERVAL_CEK_DET. Sirene = laju >= SIRENE_LAJU_MM_JAM pada SIRENE_KONFIRMASI sampel berturut-turut,
// ditahan >= SIRENE_TAHAN_MENIT lewat gpio_hold (tetap menyala saat deep sleep). Payload: packLongsor.
// Nol (geser=0, miring=0) disimpan di NVS saat nyala pertama; tahan tombol BOOT 3 detik saat reset untuk nol baru.
#include <Arduino.h>
#include <Wire.h>
#include <Preferences.h>
#include <driver/gpio.h>
#include "config.h"
#include "bnpb_sensor.h"

#ifndef PIN_TOMBOL_NOL
#define PIN_TOMBOL_NOL 0
#endif
#define JENDELA_DET 600
#define RING 12

RTC_DATA_ATTR static uint32_t rt[RING];
RTC_DATA_ATTR static float rg[RING];
RTC_DATA_ATTR static uint8_t rn = 0, hit = 0;
RTC_DATA_ATTR static uint32_t sireneSampai = 0, laporTerakhir = 0;
RTC_DATA_ATTR static bool sudahMulai = false;

static float bacaExtensoMm() {
  uint32_t s = 0;
  for (int i = 0; i < 32; i++) s += analogRead(PIN_EXTENSO);
  return (s / 32.0f) / 4095.0f * EXTENSO_RENTANG_MM;
}
static bool bacaMiring(float& x, float& y) {            // derajat absolut; x = roll, y = pitch
  Wire.begin(PIN_SDA, PIN_SCL);
  int16_t a[3];
  uint8_t buf[6];
#if defined(TILT_MPU6050)
  Wire.beginTransmission(0x68); Wire.write(0x6B); Wire.write(0); if (Wire.endTransmission()) return false;
  delay(50);
  Wire.beginTransmission(0x68); Wire.write(0x3B); Wire.endTransmission(false);
  if (Wire.requestFrom(0x68, 6) != 6) return false;
  for (int i = 0; i < 6; i++) buf[i] = Wire.read();
  for (int i = 0; i < 3; i++) a[i] = (int16_t)((buf[2 * i] << 8) | buf[2 * i + 1]);   // big-endian, 16384 LSB/g
#else
  Wire.beginTransmission(0x53); Wire.write(0x2D); Wire.write(0x08); if (Wire.endTransmission()) return false;
  Wire.beginTransmission(0x53); Wire.write(0x31); Wire.write(0x08); Wire.endTransmission();   // full-res +-2 g, 256 LSB/g
  delay(50);
  Wire.beginTransmission(0x53); Wire.write(0x32); Wire.endTransmission(false);
  if (Wire.requestFrom(0x53, 6) != 6) return false;
  for (int i = 0; i < 6; i++) buf[i] = Wire.read();
  for (int i = 0; i < 3; i++) a[i] = (int16_t)(buf[2 * i] | (buf[2 * i + 1] << 8));       // little-endian
#endif
  x = atan2f(a[1], a[2]) * 57.29578f;
  y = atan2f(-a[0], sqrtf((float)a[1] * a[1] + (float)a[2] * a[2])) * 57.29578f;
  return true;
}
static void sirene(bool on) {
  gpio_hold_dis((gpio_num_t)PIN_SIRENE);
  pinMode(PIN_SIRENE, OUTPUT);
  digitalWrite(PIN_SIRENE, on ? HIGH : LOW);
  gpio_hold_en((gpio_num_t)PIN_SIRENE);
  gpio_deep_sleep_hold_en();
}

void setup() {
  bs::mulai();
  uint32_t now = bs::detikSekarang();
  Preferences pref;
  pref.begin("nol", false);
  pinMode(PIN_TOMBOL_NOL, INPUT_PULLUP);
  float exMm = bacaExtensoMm(), mx = 0, my = 0;
  bool tiltOk = bacaMiring(mx, my);
  uint32_t t0 = millis();
  while (digitalRead(PIN_TOMBOL_NOL) == LOW && millis() - t0 < 3100) delay(20);
  if (isnan(pref.getFloat("ex", NAN)) || millis() - t0 >= 3000) {   // nyala pertama atau tombol ditahan: pasang nol baru
    pref.putFloat("ex", exMm); pref.putFloat("mx", tiltOk ? mx : 0); pref.putFloat("my", tiltOk ? my : 0);
  }
  float geser = fabsf(exMm - pref.getFloat("ex", exMm));
  float miringX = tiltOk ? mx - pref.getFloat("mx", 0) : 0, miringY = tiltOk ? my - pref.getFloat("my", 0) : 0;
  pref.end();

  int adc = analogRead(PIN_LEMBAP);
  int lembap = constrain((int)(100.0f * (LEMBAP_ADC_KERING - adc) / (LEMBAP_ADC_KERING - LEMBAP_ADC_JENUH)), 0, 100);

  // laju dari jendela 10 menit; sebelum jendela terisi laju = 0 (tak ada alarm palsu saat baru nyala)
  if (rn == RING) { memmove(rt, rt + 1, sizeof(rt) - sizeof(rt[0])); memmove(rg, rg + 1, sizeof(rg) - sizeof(rg[0])); rn--; }
  rt[rn] = now; rg[rn] = geser; rn++;
  float laju = 0;
  for (uint8_t i = 0; i < rn - 1; i++)
    if (now - rt[i] <= JENDELA_DET + 60 && now - rt[i] >= JENDELA_DET - 120) { laju = (geser - rg[i]) / ((now - rt[i]) / 3600.0f); break; }

  // ---- SIRENE: lokal, sebelum jaringan ----
  bool baru = false;
  hit = (laju >= SIRENE_LAJU_MM_JAM) ? hit + 1 : 0;
  if (hit >= SIRENE_KONFIRMASI) { baru = now >= sireneSampai; sireneSampai = now + SIRENE_TAHAN_MENIT * 60; }
  bool on = now < sireneSampai;
  sirene(on);

  bool waspada = laju >= LAJU_WASPADA_MM_JAM;
  if (baru || !sudahMulai || now - laporTerakhir + 2 >= (waspada || on ? 120 : INTERVAL_LAPOR_DET)) {
    float volt = bs::baterai(BAT_PIN, BAT_PEMBAGI);
    bs::W w;
    bs::packLongsor(w, bs::seqBerikut(), volt, geser, laju, miringX, miringY, lembap, on);
    char js[160];
    snprintf(js, sizeof js, "{\"geser_mm\":%.1f,\"laju_mm_jam\":%.1f,\"miring_x\":%.2f,\"miring_y\":%.2f,\"lembap\":%d,\"sirene\":%d}",
             geser, laju, miringX, miringY, lembap, on);
    bs::kirim(w, js, volt);
    laporTerakhir = bs::detikSekarang();
    sudahMulai = true;
  }
  bs::tidur(INTERVAL_CEK_DET);
}
void loop() {}
