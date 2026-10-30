// Worker ile Durable Object'ler arasındaki iç çağrılar ve JSON yanıt yardımcıları.

import { hata, type DunyaIleti, type Env, type HesapIleti, type Sonuc, type YerlesimIleti } from "./tipler.ts";

/** Tek dünya örneğinin adı. */
export const DUNYA_ADI = "dunya";

export function jsonYanit(veri: unknown, durum = 200): Response {
  return new Response(JSON.stringify(veri), {
    status: durum,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function iletiOku<T>(istek: Request): Promise<T | undefined> {
  try {
    const v = await istek.json();
    return typeof v === "object" && v !== null && "islem" in v ? (v as T) : undefined;
  } catch {
    return undefined;
  }
}

async function icCagri<T>(stub: DurableObjectStub, ileti: HesapIleti | DunyaIleti | YerlesimIleti): Promise<Sonuc<T>> {
  const yanit = await stub.fetch("https://ic/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ileti),
  });
  return (await yanit.json()) as Sonuc<T>;
}

export function dunyaCagir<T>(env: Env, ileti: DunyaIleti): Promise<Sonuc<T>> {
  return icCagri<T>(env.DUNYA.get(env.DUNYA.idFromName(DUNYA_ADI)), ileti);
}

/** Yerleşim DO'su: yerleşim başına bir örnek. */
export function yerlesimCagir<T>(env: Env, ileti: YerlesimIleti): Promise<Sonuc<T>> {
  return icCagri<T>(env.YERLESIM.get(env.YERLESIM.idFromName(`yerlesim:${ileti.yerlesim}`)), ileti);
}

/** Google `sub`'ından hesap kimliği: HesapDO'nun kimliği (opak, `sub`'ı göstermez). */
export function hesapKimligi(env: Env, sub: string): string {
  return env.HESAP.idFromName(`google:${sub}`).toString();
}

export async function hesapCagir<T>(env: Env, hesapId: string, ileti: HesapIleti): Promise<Sonuc<T>> {
  let id: DurableObjectId;
  try {
    id = env.HESAP.idFromString(hesapId);
  } catch {
    return hata("oturum_gecersiz");
  }
  return icCagri<T>(env.HESAP.get(id), ileti);
}
