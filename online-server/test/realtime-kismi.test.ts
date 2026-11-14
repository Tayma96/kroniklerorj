// Cloudflare Realtime belgesi (developers.cloudflare.com/realtime/sfu/api, 14 Kasım okundu): iz başına sonuç ayrı
// denetlenir, kısmen başarılı istekte başarılı izler korunur.
import test from "node:test";
import assert from "node:assert/strict";
import { Realtime } from "../src/han/realtime.ts";

const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { "content-type": "application/json" } });

test("Realtime: çekilen izlerden biri hatalıysa başarılı izler korunur", async () => {
  const rt = new Realtime({ appId: "app1", token: "gizli" }, async () => json({
    sessionDescription: { type: "offer", sdp: "v=0 teklif" }, requiresImmediateRenegotiation: true,
    tracks: [{ mid: "3", trackName: "iz-a", sessionId: "S1" }, { trackName: "iz-b", sessionId: "S2", errorCode: "not_found" }],
  }));
  const r = await rt.izCek("S9", [{ oturum: "S1", iz: "iz-a" }, { oturum: "S2", iz: "iz-b" }]);
  assert.ok(r.ok);
  assert.deepEqual(r.deger.izler, [{ mid: "3", iz: "iz-a" }]);
  assert.equal(r.deger.yeniden, true);
});

test("Realtime: tek yayın izi SFU'ca reddedilirse yayın başarısız sayılır; üst düzey hata da başarısızdır", async () => {
  const red = new Realtime({ appId: "app1", token: "gizli" }, async () => json({ sessionDescription: { type: "answer", sdp: "v=0" }, tracks: [{ mid: "0", trackName: "mik", errorCode: "x" }] }));
  assert.deepEqual(await red.izEkle("S1", { type: "offer", sdp: "v=0" }, "0", "mik"), { ok: false, hata: "ses_hatasi" });
  const ust = new Realtime({ appId: "app1", token: "gizli" }, async () => json({ errorCode: "invalid", errorDescription: "x" }, 400));
  assert.deepEqual(await ust.izCek("S1", [{ oturum: "S2", iz: "a" }]), { ok: false, hata: "ses_hatasi" });
  const tamam = new Realtime({ appId: "app1", token: "gizli" }, async () => json({ sessionDescription: { type: "answer", sdp: "v=0 c" }, tracks: [{ mid: "0", trackName: "mik" }] }));
  const t = await tamam.izEkle("S1", { type: "offer", sdp: "v=0" }, "0", "mik");
  assert.ok(t.ok && t.deger.sdp?.type === "answer");
});
