// Pustaka bersama firmware sensor BNPB: watchdog, baterai, median, tidur dalam, kirim (LoRaWAN / seluler / Meshtastic).
// Mode dipilih lewat build_flags platformio.ini: -DMODE_LORAWAN | -DMODE_SELULER | -DMODE_MESHTASTIC.
// Seluruh parameter (ID, kunci, pin, APN, URL) dari include/config.h milik proyek; config.h TIDAK masuk git.
#pragma once
#include <Arduino.h>
#include "payload.h"

namespace bs {

inline String jn(float v, int d = 1) { return isnan(v) ? String("null") : String(v, d); }   // untuk JSON seluler

void mulai();                                   // Serial, watchdog (WDT_DETIK), sekali di awal setup()
void umpan();                                   // reset watchdog; panggil di tiap loop panjang
float baterai(int pin, float pembagi);          // volt, rata-rata 16 sampel
float median(const float* a, int n);            // n kecil (<= 32)
uint16_t seqBerikut();                          // penghitung di memori RTC, bertahan lewat deep sleep
uint32_t detikSekarang();                       // detik sejak nyala; jam RTC bertahan lewat deep sleep
[[noreturn]] void tidur(uint32_t detik);        // deep sleep berbasis timer
[[noreturn]] void tidurAtauGpio(uint32_t detik, int gpio);   // bangun juga bila gpio (RTC) turun ke LOW

// Kirim satu bacaan. w = payload biner (LoRaWAN/Meshtastic), nilaiJson = {"k":v,...} (seluler). true bila terkirim.
bool kirim(const W& w, const char* nilaiJson, float volt);

}  // namespace bs
