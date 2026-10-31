// Pengemas payload biner LoRa. KEMBARAN sensor/payload.py (jaga sama; uji tests/sensor/test_payload.py
// mengompilasi berkas ini dengan c++ biasa dan membandingkannya dengan Python). Tanpa dependensi Arduino.
//
// Little-endian. Kepala 4 byte: [ver<<4 | jenis][seq u16][baterai u8, satuan 0,02 V]
// Sentinel rusak: NAN di sini = None di Python; lembap/n uint8 255 dikirim apa adanya.
//  tma     (9 B)  tinggi_cm*10 u16, laju_cm_jam*10 i16, n u8
//  hujan   (10 B) mm10*10 u16, mm60*10 u16, tips u16
//  longsor (14 B) geser_mm*10 u16, laju_mm_jam*10 i16, miring_x*100 i16, miring_y*100 i16, lembap u8, sirene u8
//  gambut  (7 B)  muka_air_cm*10 i16 (negatif = di bawah permukaan), lembap u8
//  gas     (10 B) co_ppm*10 u16, pm25*10 u16, pm10*10 u16
#pragma once
#include <stdint.h>
#include <math.h>

namespace bs {

enum Jenis : uint8_t { TMA = 1, HUJAN = 2, LONGSOR = 3, GAMBUT = 4, GAS = 5 };
static const uint8_t VERSI = 1;

struct W {
  uint8_t b[24];
  uint8_t n;
  W() : n(0) {}
  void u8(uint8_t v) { b[n++] = v; }
  void u16(uint16_t v) { u8(v & 255); u8(v >> 8); }
  void i16(int16_t v) { u16((uint16_t)v); }
};

// bulatkan setengah menjauhi nol lalu jepit, sama dengan payload.py
inline long q(float x, float f, long lo, long hi) {
  float v = x * f;
  long r = v < 0 ? -(long)floorf(-v + 0.5f) : (long)floorf(v + 0.5f);
  return r < lo ? lo : (r > hi ? hi : r);
}
// NAN = sensor rusak -> sentinel (u16 0xFFFF, i16 0x7FFF, u8 255); nilai sah dijepit satu di bawahnya
inline void u16q(W& w, float x, float f) { w.u16(isnan(x) ? 0xFFFF : (uint16_t)q(x, f, 0, 65534)); }
inline void i16q(W& w, float x, float f) { w.i16(isnan(x) ? 0x7FFF : (int16_t)q(x, f, -32768, 32766)); }

inline void kepala(W& w, uint8_t jenis, uint16_t seq, float volt) {
  w.u8((VERSI << 4) | jenis);
  w.u16(seq);
  w.u8((uint8_t)q(volt, 50.0f, 0, 254));
}
inline void packTma(W& w, uint16_t seq, float volt, float tinggi_cm, float laju_cm_jam, uint8_t n) {
  kepala(w, TMA, seq, volt); u16q(w, tinggi_cm, 10); i16q(w, laju_cm_jam, 10); w.u8(n);
}
inline void packHujan(W& w, uint16_t seq, float volt, float mm10, float mm60, uint16_t tips) {
  kepala(w, HUJAN, seq, volt); u16q(w, mm10, 10); u16q(w, mm60, 10); w.u16(tips);
}
inline void packLongsor(W& w, uint16_t seq, float volt, float geser_mm, float laju_mm_jam, float mx, float my,
                        uint8_t lembap, uint8_t sirene) {
  kepala(w, LONGSOR, seq, volt); u16q(w, geser_mm, 10); i16q(w, laju_mm_jam, 10);
  i16q(w, mx, 100); i16q(w, my, 100); w.u8(lembap); w.u8(sirene);
}
inline void packGambut(W& w, uint16_t seq, float volt, float muka_air_cm, uint8_t lembap) {
  kepala(w, GAMBUT, seq, volt); i16q(w, muka_air_cm, 10); w.u8(lembap);
}
inline void packGas(W& w, uint16_t seq, float volt, float co_ppm, float pm25, float pm10) {
  kepala(w, GAS, seq, volt); u16q(w, co_ppm, 10); u16q(w, pm25, 10); u16q(w, pm10, 10);
}

}  // namespace bs
