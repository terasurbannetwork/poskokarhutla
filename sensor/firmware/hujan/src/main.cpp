// Penakar hujan ember jungkit. Tiap jungkitan membangunkan ESP32 (EXT0), dicatat di memori RTC dengan debounce;
// tiap INTERVAL_LAPOR_DET dikirim total 10 menit dan 60 menit. Payload: payload.h packHujan.
// tips = penghitung kumulatif (u16, berputar): server mendeteksi laporan yang hilang dari lompatan tips.
#include <Arduino.h>
#include <sys/time.h>
#include <esp_sleep.h>
#include "config.h"
#include "bnpb_sensor.h"

RTC_DATA_ATTR static uint32_t ring[RING_TIP];     // detik terjadinya jungkitan, melingkar
RTC_DATA_ATTR static uint16_t kepala = 0, isi = 0, tips = 0;
RTC_DATA_ATTR static uint64_t tipMsTerakhir = 0;
RTC_DATA_ATTR static uint32_t laporTerakhir = 0;
RTC_DATA_ATTR static bool sudahMulai = false;

static int hitung(uint32_t now, uint32_t jendela) {
  int c = 0;
  for (uint16_t i = 0; i < isi; i++) if (now - ring[i] <= jendela) c++;
  return c;
}

void setup() {
  bs::mulai();
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  uint64_t ms = (uint64_t)tv.tv_sec * 1000 + tv.tv_usec / 1000;
  uint32_t now = tv.tv_sec;

  if (esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_EXT0 && ms - tipMsTerakhir >= DEBOUNCE_MS) {
    ring[kepala] = now;
    kepala = (kepala + 1) % RING_TIP;
    if (isi < RING_TIP) isi++;
    tips++;
    tipMsTerakhir = ms;
  }
  pinMode(PIN_TIPPER, INPUT_PULLUP);
  uint32_t t0 = millis();
  while (digitalRead(PIN_TIPPER) == LOW && millis() - t0 < 2000) delay(5);   // reed masih menutup: jangan tidur dulu, nanti bangun lagi

  if (!sudahMulai || now - laporTerakhir + 2 >= INTERVAL_LAPOR_DET) {
    float mm10 = hitung(now, 600) * MM_PER_TIP, mm60 = hitung(now, 3600) * MM_PER_TIP;
    float volt = bs::baterai(BAT_PIN, BAT_PEMBAGI);
    bs::W w;
    bs::packHujan(w, bs::seqBerikut(), volt, mm10, mm60, tips);
    char js[80];
    snprintf(js, sizeof js, "{\"mm10\":%.1f,\"mm60\":%.1f,\"tips\":%u}", mm10, mm60, tips);
    bs::kirim(w, js, volt);
    laporTerakhir = bs::detikSekarang();
    sudahMulai = true;
  }
  uint32_t sisa = INTERVAL_LAPOR_DET - (bs::detikSekarang() - laporTerakhir);
  bs::tidurAtauGpio(sisa < 5 ? 5 : sisa, PIN_TIPPER);
}
void loop() {}
