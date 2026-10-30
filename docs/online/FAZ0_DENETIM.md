# Kronikler Online — Faz 0 denetimi (30 Ekim 2026)

Hedef: `KRONIKLER_ONLINE_GDD.md`. Salt okunur denetim; canlı sunucuya bağlanılmadı, sır okunmadı.

## Karar kaydı (Berkay, 30 Ekim 2026)
- D-13: çok oyunculu giriş "Yakında" ekranına çevrildi (`ONLINE_ACIK=false`, `lib/mp/config.ts`); beş
  `/cok-oyunculu` rotası `lib/online-yakinda.tsx`i gösterir, `joinRealm` de kilitli. Canlı Worker'ı kapatmak
  Berkay'ın işidir.
- D-05: önce küçük kasaba dünyaları (~50–200 oyuncu), sonra bölgeler arası bağlantı.
- D-06: Google ile giriş; sunucu Google kimlik belirtecini doğrular.
- D-01: ücretsiz katmanda başlanır; sınıra yaklaşınca maliyet raporu.

## Bulgular
- **Kimlik yok:** eski sunucu `join`da istemcinin `player.id`'sini aynen kabul ediyor
  (`server/src/realm.ts:145-146`); id'ler herkese görünür, başkasının yedeği okunup ezilebilir
  (`realm.ts:162-164,190`). Durum istemci otoriteli (`realm.ts:180`), bedeller istemcide kesiliyor.
- **SP teması:** eski mod SP motorunu ve kayıt yuvasını paylaşıyor (`lib/store.tsx:220-235` `enterMp/exitMp`,
  `game.ts` ~45 `mpRealm` dalı, `RealmSession.tsx` SP `advance()`). GDD §0 madde 4-5'e aykırı; yeni mod bunu
  yeniden kullanmaz.
- **Dağıtım riski:** `.github/workflows/deploy-mp-server.yml:8-10` — `apk`'ye `server/**` değiştiren her push
  canlı Worker'ı otomatik dağıtır. Yeni çevrimiçi sunucu `server/` dışında, ayrı adla ve elle dağıtılır.
- **Yeniden kullanılabilir desenler:** diyar başına Durable Object (`idFromName`), WebSocket hibernation,
  alarm, `TickEvent{k,p}` i18n biçimi, bekleyen olay kuyruğu, sohbet hız sınırı, istemci yeniden bağlanma.
- **Eksikler:** WorldEvent defteri, sıra/cursor, `requestId` ile tekrar güvenliği, protokol sürüm denetimi.

## Faz 1 — en küçük dilim (öneri)
- `online-server/` (yeni, ayrı Worker adı, otomatik dağıtım yok): Google ID token doğrulama (JWKS; iss, aud,
  exp, sub), `AccountDO` içinde `OnlineAccount/OnlineProfile`, `hello{protocol,idToken}` → `needsProfile`,
  `createProfile{displayName,requestId}` idempotent, ad filtresi ve dünya içi benzersizlik; sahte JWKS'li birim test.
- `mobile/lib/online/` + `mobile/app/online/`: giriş ve görünen ad ekranı; anahtarlar `kronikler_online_*`,
  belirteç güvenli depoda; `../game`, `../store`, `../mp` içe aktarılmaz.
- Çıkış ölçütü: online dizinlerinde SP içe aktarması 0; doğrulayıcı testi geçer; SP dosyaları değişmez.

## Berkay'dan gerekenler
1. Google Cloud'da ücretsiz OAuth istemcileri (Android: paket adı + imza SHA-1; Web istemci kimliği).
2. Eski `kronikler-mp` Worker'ını kapatma ve `deploy-mp-server.yml`'i elle tetiklemeye çevirme kararı.
3. Yeni Worker'ın ilk dağıtımı Berkay'ın Cloudflare hesabıyla yapılır (anahtar sohbete yazılmaz).
