# Denetim 5 — NPC, sosyal, aile, kancalar (17 Kasım)
- Kisi (nufus.ts:16-33) hafif; hafıza npc-mind.ts 34 anı türü, kanıt düzeyi, personalityWeight (115-128). npcLifeTick (game.ts:950) YILLIK; npcTeklifTiki (1406) %2–4/ay. yakinCember (10943) CEMBER_MAX 15 (dost/hasım dolabilir kusuru).
- Huy ayrışması var: soylentiEtkisi (1380), helalSansi (7150), tohum (1811), kan davası (10729, kanMiras 9295). gossipTick (2352) gerçek yayılım; gossipAbout (7128) söylenti ÜRETMİYOR.
- Evlilik proposeMarriage (6929); ihmal sistemi (1080-1099). Vâris heirPreview (9134)/continueAsHeir (9179) çok şey aktarıyor; ama childNature addan türüyor (431, 9159), huy/meslek mirası yok. Sıfırlananlar 9301.
- Kopuk: savaş→NPC ölümü yok; diplomasi yalnız taçlı (5337); divan bağımsız (divan.ts:1-4); suç→aile/vâris yok; NPC-NPC husumet oyuncuya kanca vermiyor; lonca etkisi tek ±6 görüş (1323); savaş→vâris (wars sıfırlanır); mülk→komşu tepkisi yok.
