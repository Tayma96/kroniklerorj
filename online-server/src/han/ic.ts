// MasaDO iç çağrıları: JSON iletisi ve WebSocket yükseltmesinin bilet başlığıyla iletilmesi.

import type { Env, Sonuc } from "../tipler.ts";
import type { MasaBileti, MasaIleti } from "./tipler.ts";

/** Worker → MasaDO yükseltme isteğinde biletin taşındığı iç başlık. Worker istemcinin başlıklarını taşımaz,
 *  isteği sıfırdan kurar; bu yüzden istemci bu başlığı kendisi koyamaz. Başlık ByteString olmalıdır: JSON,
 *  ad gibi ASCII dışı karakterler için URI-kodlu taşınır. */
export const BILET_BASLIGI = "x-kronikler-masa-bileti";

function masaKoku(env: Env, ad: string): DurableObjectStub {
  return env.MASA.get(env.MASA.idFromName(ad));
}

export async function masaCagir<T>(env: Env, ad: string, ileti: MasaIleti): Promise<Sonuc<T>> {
  const yanit = await masaKoku(env, ad).fetch("https://ic/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ileti),
  });
  return (await yanit.json()) as Sonuc<T>;
}

/** Doğrulanmış bileti MasaDO'ya iletir; yanıt (101 ya da hata JSON'u) olduğu gibi istemciye döner. */
export function masayaYukselt(env: Env, bilet: MasaBileti): Promise<Response> {
  return masaKoku(env, bilet.masa).fetch(
    new Request("https://ic/baglan", {
      method: "GET",
      headers: { upgrade: "websocket", [BILET_BASLIGI]: encodeURIComponent(JSON.stringify(bilet)) },
    }),
  );
}
