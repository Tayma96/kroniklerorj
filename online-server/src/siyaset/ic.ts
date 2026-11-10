// Siyaset iç çağrıları: HesapDO → BolgeDO (bölge başına bir örnek), BolgeDO → SultanlikDO (tek, düşük frekanslı).

import type { Env, Sonuc } from "../tipler.ts";
import type { BolgeIleti, SultanlikIleti } from "./tipler.ts";

export const SULTANLIK_ADI = "sultanlik";

async function cagir<T>(stub: DurableObjectStub, ileti: unknown): Promise<Sonuc<T>> {
  const yanit = await stub.fetch("https://ic/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ileti),
  });
  return (await yanit.json()) as Sonuc<T>;
}

export function bolgeCagir<T>(env: Env, ileti: BolgeIleti): Promise<Sonuc<T>> {
  return cagir<T>(env.BOLGE.get(env.BOLGE.idFromName(`bolge:${ileti.bolge}`)), ileti);
}

export function sultanlikCagir<T>(env: Env, ileti: SultanlikIleti): Promise<Sonuc<T>> {
  return cagir<T>(env.SULTANLIK.get(env.SULTANLIK.idFromName(SULTANLIK_ADI)), ileti);
}
