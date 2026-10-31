#include "bnpb_sensor.h"
#include "config.h"
#include <esp_task_wdt.h>
#include <esp_sleep.h>
#include <driver/rtc_io.h>
#include <time.h>

#if defined(MODE_LORAWAN)
#include <RadioLib.h>
#include <Preferences.h>
#elif defined(MODE_SELULER)
#include "bnpb_seluler.h"
#endif

namespace bs {

RTC_DATA_ATTR static uint16_t rtcSeq = 0;

void mulai() {
  Serial.begin(115200);
  esp_task_wdt_init(WDT_DETIK, true);           // arduino-esp32 2.x; reset otomatis bila macet
  esp_task_wdt_add(NULL);
}
void umpan() { esp_task_wdt_reset(); }

float baterai(int pin, float pembagi) {
  uint32_t mv = 0;
  for (int i = 0; i < 16; i++) mv += analogReadMilliVolts(pin);
  return (mv / 16.0f) * pembagi / 1000.0f;      // pembagi = (R1+R2)/R2, kalibrasi dengan multimeter
}

float median(const float* a, int n) {
  float t[32];
  if (n > 32) n = 32;
  for (int i = 0; i < n; i++) {
    int j = i;
    while (j > 0 && t[j - 1] > a[i]) { t[j] = t[j - 1]; j--; }
    t[j] = a[i];
  }
  return n % 2 ? t[n / 2] : (t[n / 2 - 1] + t[n / 2]) / 2;
}

uint16_t seqBerikut() { return rtcSeq++; }
uint32_t detikSekarang() { return (uint32_t)time(nullptr); }

void tidur(uint32_t detik) {
  esp_sleep_enable_timer_wakeup((uint64_t)detik * 1000000ULL);
  esp_deep_sleep_start();
}
void tidurAtauGpio(uint32_t detik, int gpio) {
  rtc_gpio_pullup_en((gpio_num_t)gpio);
  rtc_gpio_pulldown_dis((gpio_num_t)gpio);
  esp_sleep_enable_ext0_wakeup((gpio_num_t)gpio, 0);
  tidur(detik);
}

#if defined(MODE_LORAWAN)
// ---- LoRaWAN OTAA (RadioLib 6.6, region AS923 untuk Indonesia). Sesi disimpan di RTC (tiap uplink), nonce di NVS (saat join).
#ifdef RADIO_SX1262
static SX1262 radio = new Module(LORA_NSS, LORA_IRQ, LORA_RST, LORA_BUSY);
#else
static SX1276 radio = new Module(LORA_NSS, LORA_IRQ, LORA_RST, LORA_DIO1);
#endif
static LoRaWANNode node(&radio, &AS923);
RTC_DATA_ATTR static uint8_t rtcSesi[RADIOLIB_LORAWAN_SESSION_BUF_SIZE];
RTC_DATA_ATTR static bool rtcAda = false;

bool kirim(const W& w, const char*, float) {
  static const uint64_t joinEui = LORAWAN_JOIN_EUI, devEui = LORAWAN_DEV_EUI;
  static uint8_t nwkKey[] = LORAWAN_NWK_KEY, appKey[] = LORAWAN_APP_KEY;
  if (radio.begin() != RADIOLIB_ERR_NONE) return false;
  node.beginOTAA(joinEui, devEui, nwkKey, appKey);
  Preferences pref;
  pref.begin("lw", false);
  uint8_t nonces[RADIOLIB_LORAWAN_NONCES_BUF_SIZE];
  if (pref.getBytesLength("nonces") == sizeof(nonces)) {
    pref.getBytes("nonces", nonces, sizeof(nonces));
    node.setBufferNonces(nonces);
  }
  if (rtcAda) node.setBufferSession(rtcSesi);
  int16_t st = RADIOLIB_ERR_UNKNOWN;
  for (int i = 0; i < 3 && st != RADIOLIB_LORAWAN_NEW_SESSION && st != RADIOLIB_LORAWAN_SESSION_RESTORED; i++) {
    st = node.activateOTAA();
    umpan();
    if (st == RADIOLIB_LORAWAN_NEW_SESSION) pref.putBytes("nonces", node.getBufferNonces(), sizeof(nonces));
    else if (st != RADIOLIB_LORAWAN_SESSION_RESTORED) delay(5000);
  }
  pref.end();
  if (st != RADIOLIB_LORAWAN_NEW_SESSION && st != RADIOLIB_LORAWAN_SESSION_RESTORED) { rtcAda = false; return false; }
  node.setADR(false);
  node.setDatarate(LORAWAN_DR);
  uint8_t buf[24];
  memcpy(buf, w.b, w.n);
  int16_t r = node.sendReceive(buf, w.n, 1);
  memcpy(rtcSesi, node.getBufferSession(), sizeof(rtcSesi));
  rtcAda = true;
  radio.sleep();
  return r >= RADIOLIB_ERR_NONE;                // >=0: terkirim (nilai >0 = ada downlink)
}

#elif defined(MODE_SELULER)
bool kirim(const W&, const char* nilaiJson, float volt) { return selulerKirim(nilaiJson, volt); }

#elif defined(MODE_MESHTASTIC)
// Node Meshtastic memakai Serial Module mode TEXTMSG: baris yang kita cetak disiarkan ke mesh sebagai teks.
bool kirim(const W& w, const char*, float) {
  Serial2.begin(MESH_BAUD, SERIAL_8N1, MESH_RX, MESH_TX);
  Serial2.print("SENSOR " ALAT_ID " ");
  for (int i = 0; i < w.n; i++) Serial2.printf("%02x", w.b[i]);
  Serial2.print("\n");
  Serial2.flush();
  delay(3000);
  return true;                                  // siaran mesh tanpa konfirmasi
}
#else
#error "Pilih -DMODE_LORAWAN, -DMODE_SELULER, atau -DMODE_MESHTASTIC di platformio.ini"
#endif

}  // namespace bs
