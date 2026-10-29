import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const src = readFileSync(new URL("../../public/inti/peta/konteks.js", import.meta.url), "utf8");
const jalan = src.slice(src.indexOf("async jalan("), src.indexOf("const legenda"));

test("Jalan & sungai memakai sumber vektor basemap (seluruh Indonesia)", () => {
  for (const s of ['"transportation"', '"waterway"', "motorway", "tertiary", '"river"', '"canal"', '"stream"'])
    assert.ok(jalan.includes(s), s);
  assert.match(jalan, /type === "symbol"/, "di bawah label");
});

test("fallback ke jalan.geojson hanya bila sumber vektor tak ada", () => {
  assert.match(jalan, /if \(sJalan && sSungai\) \{[\s\S]*?return;\s*\}[\s\S]*jalan\.geojson/);
});

test("id lapisan konteks tidak bentrok dengan alir-* (pos_air.js)", () => {
  assert.doesNotMatch(jalan, /id: "alir-/);
  assert.match(jalan, /id: "kt-sungai"/);
  assert.match(jalan, /id: "kt-jalan"/);
});
