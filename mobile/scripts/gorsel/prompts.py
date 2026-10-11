# Birleşik sanat yönü: fotogerçekçi, sinematik, 1247 Selçuklu Anadolusu.
FOTO = ("photorealistic cinematic photograph, natural skin texture, 85mm lens, shallow depth of field, "
        "film grain, muted earthy color palette, warm amber and umber tones, historically accurate 13th century Seljuk Anatolia")
PORTRE = ("head and shoulders portrait, centered, facing camera, eyes at upper third, "
          "soft warm side light from a single window on the left, Rembrandt lighting, "
          "plain dark warm brown plastered mud-brick wall background, no window visible, " + FOTO)
SAHNE = ("wide establishing shot, " + FOTO + ", Seljuk era Anatolian architecture: flat earthen roofs, mud-brick and cut-stone houses, "
         "no chimneys, no pitched tiled roofs, no churches, no modern objects, no people in focus")
NEG = " , no text, no watermark, no signature, no frame, no border"

E = "Anatolian Turkmen"
PORTRELER = {
 "e_cocuk":   f"a 9 year old {E} village boy, boyish face, short cropped dark hair, small brown felt skullcap, plain undyed linen shirt, sun-tanned skin, curious eyes",
 "e_ergen":   f"a 15 year old {E} boy, apprentice, small white cotton turban wrapped around a felt cap, plain wool tunic, first faint moustache",
 "e_genc":    f"a 21 year old {E} young man, white cotton turban, simple belted wool kaftan with crossed front, short dark beard beginning",
 "e_yetiskin":f"a 28 year old {E} man, white cotton turban, wool kaftan with crossed front, neat short dark beard",
 "e_olgun":   f"a 40 year old {E} man, large white turban, dark wool kaftan with woven trim, full dark beard with first grey hairs",
 "e_yasli":   f"a 52 year old {E} man, large white turban, brown wool robe, greying beard, weathered sun-lined face",
 "e_ihtiyar": f"a 70 year old {E} elder, large white turban, long white beard, deep wrinkles, wise tired eyes, brown wool cloak",
 "k_cocuk":   f"a 9 year old {E} village girl child, small red kerchief tied at the back of the head, two long dark braids, plain red linen dress, innocent child face",
 "k_ergen":   f"a 15 year old {E} girl, light cream cotton headscarf over hair, embroidered headband, plain wool dress, shy calm face",
 "k_genc":    f"a 21 year old {E} young woman, cream cotton headscarf draped over a small embroidered cap, red wool dress, calm face",
 "k_yetiskin":f"a 30 year old adult {E} woman, mature confident face, sun-tanned skin, faint lines, cream linen headscarf loosely draped over an embroidered cap, dark red wool dress with woven trim",
 "k_olgun":   f"a 45 year old weathered {E} peasant mother, sun-tanned skin, tired mature face, wrinkles around the eyes, nasolabial folds, brown wool headscarf loosely draped, dark blue wool dress",
 "k_yasli":   f"an aging 58 year old {E} woman, wrinkled weathered face, grey hair at the temples, sagging skin, white linen veil loosely draped, brown wool dress",
 "k_ihtiyar": f"an 80 year old {E} peasant grandmother, sun-tanned very wrinkled leathery skin, hollow cheeks, white hair strands, white linen headscarf loosely draped, dark wool shawl",
}
MEVSIM = {
 "ilkbahar": "spring, blossoming almond and apricot trees, fresh green grass, soft morning light",
 "yaz": "summer, golden wheat fields, warm late afternoon sun, dry heat haze",
 "sonbahar": "autumn, poplar trees with golden leaves, harvest, low amber sun",
 "kis": "winter, snow on flat earthen roofs, cold blue dusk, thin smoke from roof holes",
}
KUSAK = {
 "cocuk": "a small Anatolian village of flat-roofed mud-brick houses, a courtyard with a well and a tandir oven, poplar trees",
 "genc": "a dirt caravan road leading to a stone Seljuk caravanserai with a carved portal on the steppe, hills behind",
 "orta": "a walled Seljuk Anatolian town seen from a hill, stone city walls, a brick minaret and a conical stone tomb tower, flat roofs",
 "yasli": "a dry treeless Central Anatolian steppe hillside, an old conical cut-stone Seljuk tomb tower kumbet in the foreground, a small flat-roofed mud-brick village below, a single snow-capped volcano far away, brown arid land",
}
DIGER = {
 # arma — 384 kare; Selçuklu tamgası / kabartma madalyon (Avrupa kalkanı değil)
 "arma/kurt": "close-up product photograph of an antique round bronze medallion with an embossed grey wolf head, Seljuk Turkic tamga style, on dark red felt cloth",
 "arma/tac": "close-up macro photograph of gold thread embroidery of a simple crown emblem on dark brown wool felt, medieval Turkic textile, oil lamp light",
 "arma/hancer": "close-up macro photograph of silver thread embroidery of a curved dagger emblem on dark purple wool felt, medieval Turkic textile, oil lamp light",
 "arma/hilal": "close-up macro photograph of gold thread embroidery of a crescent moon emblem on dark green wool felt, medieval Turkic textile, oil lamp light",
 "arma/kilic": "close-up product photograph of an antique round steel and bronze medallion embossed with two crossed curved swords, on dark felt cloth",
 "arma/bugday": "close-up macro photograph of gold thread embroidery of a sheaf of wheat ears emblem on dark olive wool felt, medieval Turkic textile, oil lamp light",
 # mülk — 512 kare
 "mulk/tarla": "a wheat field on the Anatolian plateau with a small mud-brick field hut, golden hour",
 "mulk/ev": "a single flat-roofed Anatolian mud-brick and stone village house with a wooden door and a small courtyard wall",
 "mulk/dukkan": "inside a small medieval Anatolian bazaar shop, copper pots, woven bags and spices on wooden shelves, arched stone opening, warm oil lamp light",
 "mulk/han": "the carved stone entrance portal of a Seljuk caravanserai, muqarnas niche, heavy wooden doors, camels resting outside",
 "mulk/degirmen": "an old stone watermill with a wooden water wheel beside a rocky stream in Anatolia",
 "mulk/bos": "an empty fallow plot of dry land on the Anatolian plateau marked with a few stones, distant hills, overcast",
 # mektep — 256 kare
 "mektep/din": "still life photograph of a handwritten Quran manuscript open on a carved wooden lectern rahle, prayer beads, oil lamp light",
 "mektep/matematik": "still life photograph of a brass astrolabe, compass dividers and parchment with geometric drawings, oil lamp light",
 "mektep/edebiyat": "still life photograph of a reed pen, a brass inkwell and paper with flowing Persian calligraphy, oil lamp light",
 "mektep/beden": "still life photograph of two wooden training swords and a small round wooden shield leaning against a stone wall, oil lamp light",
}
WIDE = {
 "mulk/mulk_hero": (1024,576,"panoramic view of Anatolian farmland, a cluster of flat-roofed mud-brick village houses in the middle ground, poplar trees, wheat fields and an orchard, a stone caravanserai on the horizon, golden hour"),
 "mektep/mektep_hero": (640,384,"interior of a Seljuk madrasa: stone arcade courtyard, students sitting on carpets with books before a bearded teacher, warm light"),
 "yeni_oyun_bg": (852,1846,"tiny distant silhouette of a small boy seen from behind standing on a dirt road in the lower part of the frame, looking at a smouldering burnt Anatolian village of flat-roofed mud-brick houses at dusk, smoke and ash in the air, huge dramatic overcast sky, vertical composition"),
}
