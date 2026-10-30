import test from "node:test";
import assert from "node:assert/strict";
import { GOOGLE_JWKS_URL, GoogleDogrulayici, GoogleHatasi, istemciKimlikleri, type GoogleHataKodu } from "../src/google.ts";
import { jsonB64url } from "../src/b64.ts";
import { googleYuku, ISTEMCI, jwtImzala, rsaAnahtari, sahteJwks } from "./yardimci.ts";

const SIMDI = Date.UTC(2026, 10, 5, 10, 0, 0);
const anahtar = await rsaAnahtari("kid-1");
const yabanci = await rsaAnahtari("kid-1"); // aynı kid, farklı anahtar
const bilinmeyen = await rsaAnahtari("kid-yok");

function kur(maxAge = 3600) {
  const jwks = sahteJwks([anahtar], maxAge);
  let saat = SIMDI;
  const d = new GoogleDogrulayici({ fetch: jwks.getir, simdi: () => saat });
  return { d, jwks, ilerlet: (ms: number) => (saat += ms) };
}

const kodla = (kod: GoogleHataKodu) => (e: unknown) => e instanceof GoogleHatasi && e.kod === kod;

test("geçerli belirteç: sub ve ad döner; JWKS önbellekten", async () => {
  const { d, jwks } = kur();
  const t = await jwtImzala(anahtar, googleYuku(SIMDI));
  assert.deepEqual(await d.dogrula(t, [ISTEMCI]), { sub: "110000000000000000001", ad: "Ayşe" });
  const iss = await jwtImzala(anahtar, googleYuku(SIMDI, { iss: "accounts.google.com", given_name: undefined }));
  assert.deepEqual(await d.dogrula(iss, [ISTEMCI]), { sub: "110000000000000000001" });
  assert.deepEqual(jwks.cagrilar, [GOOGLE_JWKS_URL]);
});

test("aud virgüllü istemci listesinden biri olmalı", async () => {
  const { d } = kur();
  const t = await jwtImzala(anahtar, googleYuku(SIMDI));
  assert.deepEqual(istemciKimlikleri(` web-1 ,${ISTEMCI},, `), ["web-1", ISTEMCI]);
  assert.equal((await d.dogrula(t, istemciKimlikleri(`web-1,${ISTEMCI}`))).sub, "110000000000000000001");
  await assert.rejects(d.dogrula(t, ["baska-istemci"]), kodla("aud"));
  const yanlis = await jwtImzala(anahtar, googleYuku(SIMDI, { aud: "baska-istemci" }));
  await assert.rejects(d.dogrula(yanlis, [ISTEMCI]), kodla("aud"));
  await assert.rejects(d.dogrula(t, []), kodla("yapilandirma"));
});

test("yanlış iss", async () => {
  const { d } = kur();
  const t = await jwtImzala(anahtar, googleYuku(SIMDI, { iss: "https://evil.example.com" }));
  await assert.rejects(d.dogrula(t, [ISTEMCI]), kodla("iss"));
});

test("exp ve iat 60 sn payla", async () => {
  const { d } = kur();
  const sn = Math.floor(SIMDI / 1000);
  const dolmus = await jwtImzala(anahtar, googleYuku(SIMDI, { exp: sn - 61 }));
  await assert.rejects(d.dogrula(dolmus, [ISTEMCI]), kodla("sure"));
  const payli = await jwtImzala(anahtar, googleYuku(SIMDI, { exp: sn - 30 }));
  assert.equal((await d.dogrula(payli, [ISTEMCI])).sub, "110000000000000000001");
  const gelecek = await jwtImzala(anahtar, googleYuku(SIMDI, { iat: sn + 120 }));
  await assert.rejects(d.dogrula(gelecek, [ISTEMCI]), kodla("iat"));
  const expYok = await jwtImzala(anahtar, googleYuku(SIMDI, { exp: undefined }));
  await assert.rejects(d.dogrula(expYok, [ISTEMCI]), kodla("sure"));
});

test("bozuk imza, bilinmeyen kid, yanlış alg, bozuk biçim", async () => {
  const { d } = kur();
  const yabanciT = await jwtImzala(yabanci, googleYuku(SIMDI));
  await assert.rejects(d.dogrula(yabanciT, [ISTEMCI]), kodla("imza"));
  const t = await jwtImzala(anahtar, googleYuku(SIMDI));
  const [h, , i] = t.split(".") as [string, string, string];
  const oynanmis = `${h}.${jsonB64url(googleYuku(SIMDI, { sub: "baskasi" }))}.${i}`;
  await assert.rejects(d.dogrula(oynanmis, [ISTEMCI]), kodla("imza"));
  const kidYok = await jwtImzala(bilinmeyen, googleYuku(SIMDI));
  await assert.rejects(d.dogrula(kidYok, [ISTEMCI]), kodla("kid"));
  const hs = await jwtImzala(anahtar, googleYuku(SIMDI), { alg: "HS256" });
  await assert.rejects(d.dogrula(hs, [ISTEMCI]), kodla("alg"));
  const none = `${jsonB64url({ alg: "none", kid: "kid-1" })}.${jsonB64url(googleYuku(SIMDI))}.`;
  await assert.rejects(d.dogrula(none, [ISTEMCI]), kodla("alg"));
  for (const cop of ["", "a.b", "a.b.c", "!!.??.**"]) await assert.rejects(d.dogrula(cop, [ISTEMCI]), kodla("bicim"));
});

test("önbellek max-age dolunca yeniden çeker; erişilemezse jwks hatası", async () => {
  const { d, jwks, ilerlet } = kur(600);
  const t = await jwtImzala(anahtar, googleYuku(SIMDI, { exp: Math.floor(SIMDI / 1000) + 7200 }));
  await d.dogrula(t, [ISTEMCI]);
  ilerlet(599_000);
  await d.dogrula(t, [ISTEMCI]);
  assert.equal(jwks.cagrilar.length, 1);
  ilerlet(2_000);
  await d.dogrula(t, [ISTEMCI]);
  assert.equal(jwks.cagrilar.length, 2);

  const bozuk = sahteJwks([anahtar]);
  bozuk.boz();
  const d2 = new GoogleDogrulayici({ fetch: bozuk.getir, simdi: () => SIMDI });
  await assert.rejects(d2.dogrula(t, [ISTEMCI]), kodla("jwks"));
});
