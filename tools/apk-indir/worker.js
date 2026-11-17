// APK indirme Worker'ı: Workers varlık sınırı (25 MiB) yüzünden APK parçalara bölünür; bu Worker parçaları
// tek bir indirme olarak sırayla akıtır. Parçalar ve liste.json iş akışında (apk-indir.yml) üretilir.
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname !== "/Kronikler.apk") return env.ASSETS.fetch(req);
    const liste = await (await env.ASSETS.fetch(new URL("/parca/liste.json", url))).json();
    const basliklar = {
      "content-type": "application/vnd.android.package-archive",
      "content-disposition": 'attachment; filename="Kronikler.apk"',
      "content-length": String(liste.boyut),
      "cache-control": "no-store",
    };
    if (req.method === "HEAD") return new Response(null, { headers: basliklar });
    const { readable, writable } = new FixedLengthStream(liste.boyut);
    ctx.waitUntil((async () => {
      for (let i = 0; i < liste.parcalar.length; i++) {
        const r = await env.ASSETS.fetch(new URL("/parca/" + liste.parcalar[i], url));
        await r.body.pipeTo(writable, { preventClose: i < liste.parcalar.length - 1 });
      }
    })());
    return new Response(readable, { headers: basliklar });
  },
};
