// Sırlı zar tohumu (denetim 17 Kasım): HMAC-SHA256 doğruluğu (RFC 4231), sır değişince zar değişir, aynı sırla
// deterministik; sır yoksa yedekle çalışır.

import test from "node:test";
import assert from "node:assert/strict";
import { hmacSha256, sha256, sirliTohum, sirliZar, zarSirriAyarla } from "../src/yerlesim/zar-sirri.ts";
import { efsaneviZari } from "../src/yerlesim/esya.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
const enc = (s: string) => new TextEncoder().encode(s);

test("SHA-256 ve HMAC-SHA256 bilinen vektörlerle (FIPS 180-2, RFC 4231)", () => {
  assert.equal(hex(sha256(enc("abc"))), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(hex(sha256(enc(""))), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(hex(sha256(enc("a".repeat(1000)))), "41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3");
  assert.equal(hex(hmacSha256(enc("Jefe"), enc("what do ya want for nothing?"))), "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
  assert.equal(hex(hmacSha256(new Uint8Array(131).fill(0xaa), enc("Test Using Larger Than Block-Size Key - Hash Key First"))), "60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54");
});

test("sırlı zar: aynı sır + parçalar aynı; sır değişince değişir; mal zara katılır; kısa sır yok sayılır", () => {
  try {
    const c = { o: "o1", h: "h1" } as Karakter;
    zarSirriAyarla(undefined, true);
    const yedek = sirliTohum("efsanevi", "h1", "o1", 30, "kilic");
    assert.equal(sirliTohum("efsanevi", "h1", "o1", 30, "kilic"), yedek);
    assert.notEqual(efsaneviZari(c, 30, "kilic")(), efsaneviZari(c, 30, "alet")(), "mal zara katılır");
    zarSirriAyarla("kisa", true);
    assert.equal(sirliTohum("efsanevi", "h1", "o1", 30, "kilic"), yedek, "kısa sır yedeğe düşer (yedek izinliyken)");
    zarSirriAyarla("bu-bir-deneme-sirridir-0123456789");
    const sirli = sirliTohum("efsanevi", "h1", "o1", 30, "kilic");
    assert.notEqual(sirli, yedek, "sır zarı değiştirir (istemci önceden hesaplayamaz)");
    assert.equal(sirliZar("a", 1)(), sirliZar("a", 1)());
  } finally {
    zarSirriAyarla(undefined, true);
  }
});

test("S1: ZAR_SIRRI yok/kısa ve yedek izni yoksa zar kapalıdır (yapilandirma_eksik); sır gelince açılır", async () => {
  const { ZarYapilandirmaHatasi, zarHazir } = await import("../src/yerlesim/zar-sirri.ts");
  try {
    zarSirriAyarla(undefined);
    assert.equal(zarHazir(), false);
    assert.throws(() => sirliTohum("a"), ZarYapilandirmaHatasi);
    zarSirriAyarla("kisa");
    assert.throws(() => sirliZar("a"), ZarYapilandirmaHatasi);
    zarSirriAyarla("bu-bir-deneme-sirridir-0123456789");
    assert.equal(zarHazir(), true);
    assert.ok(Number.isInteger(sirliTohum("a")));
  } finally {
    zarSirriAyarla(undefined, true);
  }
});
