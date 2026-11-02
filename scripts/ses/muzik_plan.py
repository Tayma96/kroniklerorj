#!/usr/bin/env python3
"""Oyun içi 21 müzik parçasının besteleme planları (ElevenLabs music_v1 composition_plan).
Her parça ~54 sn, üç bölüm (A–B–A'), sonu başıyla aynı doku ve perdede biter: oyunda dikişsiz döngü olur.
Kullanım: python3 -I scripts/ses/muzik_plan.py <çıktı_dizini>  → <id>.json dosyaları
"""
import json, os, sys

ORTAK_POZ = ["instrumental game soundtrack loop", "13th-century Seljuk Anatolia", "authentic Turkish makam modal music",
             "natural acoustic instruments, warm room reverb", "seamless loop: ends with the same texture, key and tempo it began with, no ending cadence, no fade out"]
ORTAK_NEG = ["vocals", "choir", "lyrics", "humming", "electronic", "synth", "modern drum kit", "electric guitar", "acoustic guitar",
             "piano", "brass", "western orchestra", "trap", "hip hop", "fade out ending", "final cadence"]

# id: (sahne, makam ve karakter, çalgılar, tempo, A, B, A')
P = {
 "ana_tema": ("main title theme of the game, menus and chronicle", "Huseyni makam, majestic yet warm, heroic longing",
              "ney lead melody, kanun arpeggios, yayli tanbur bowed drone, bendir, distant kos", "70 bpm",
              "ney states a noble main theme over kanun arpeggios and soft drone", "kanun and yayli tanbur answer the theme, bendir joins, emotion rises", "ney returns to the main theme, calmer, settling back to the opening texture"),
 "cocukluk": ("childhood years, village life of a small child", "Ussak makam, playful, innocent, gentle wonder",
              "plucked baglama and kopuz, light def frame drum, soft kaval", "92 bpm",
              "light plucked baglama motif, playful and curious", "kaval joins with a skipping melody, def keeps a gentle 2/4 dance", "baglama motif returns, gentle and innocent"),
 "genclik": ("youth years 13-17, ambition and first adventures", "Rast makam, hopeful, energetic, adventurous",
             "baglama lead, kaval, def and darbuka, kopuz rhythm", "104 bpm",
             "bright baglama melody with driving kopuz strums", "kaval soars, def and darbuka push the rhythm forward", "baglama melody returns with energy, back to the opening groove"),
 "ciraklik": ("apprenticeship, learning a craft in a workshop", "Nihavend makam, diligent, focused, steady",
              "tanbur, ud, soft bendir in duyek usul, subtle wooden percussion like work rhythm", "84 bpm",
              "steady tanbur pattern like patient work", "ud takes a thoughtful melody over the duyek rhythm", "tanbur pattern returns, steady and focused"),
 "ustalik": ("mastery, adulthood at the peak of craft and family", "Rast makam, confident, proud, rich",
             "kanun, ud, ney, bendir, kudum", "88 bpm",
             "kanun and ud play a confident theme together", "ney rises with a proud melody, kudum adds weight", "kanun and ud theme returns, confident and full"),
 "olgunluk": ("middle age 40-59, responsibility and dignity", "Huzzam makam, reflective, warm melancholy, dignified",
              "kemence, kanun, soft bendir, low drone", "72 bpm",
              "kemence sings a warm reflective line over kanun", "kanun takes a gentle variation, bendir breathes slowly", "kemence returns, dignified and calm"),
 "yaslilik": ("old age 60+, memories and legacy", "Saba makam, wistful, tender, slow",
              "solo ney, tanbur, very soft bendir", "60 bpm",
              "breathy ney phrase full of memory", "tanbur answers softly, sparse and tender", "ney returns, wistful, ending on the opening breath"),
 "gunluk": ("everyday life, fields, harvest, river, property", "Ussak makam, pastoral, peaceful village morning",
            "kaval, baglama, soft def, light tambourine-like zil sparingly", "80 bpm",
            "pastoral kaval melody over gentle baglama", "baglama and def create a calm walking rhythm", "kaval returns, peaceful and sunny"),
 "carsi": ("bazaar and city streets, trade and haggling", "Hicaz makam, lively, bustling, colorful",
           "darbuka, def, kanun, ud, clapping-free", "112 bpm",
           "darbuka groove with a lively kanun hook", "ud and kanun trade quick phrases like haggling merchants", "kanun hook returns over the busy groove"),
 "dugun": ("village wedding celebration", "Hicaz makam, festive, joyful, outdoor",
           "davul and zurna wedding ensemble, def", "120 bpm",
           "zurna plays a festive wedding melody over davul", "davul and zurna build excitement for the halay dance", "festive zurna melody returns, joyful"),
 "senlik": ("folk festival, harvest celebration", "Rast makam, joyous, communal",
            "baglama ensemble, def, kaval, kasik spoons", "116 bpm",
            "baglama ensemble plays a joyful folk dance tune", "kaval and def lead a call-and-response", "folk dance tune returns, joyous"),
 "dogum": ("birth of a child, tender family moment", "Ussak makam, tender, lullaby-like, hopeful",
           "rebab, soft kanun, very soft bendir heartbeat", "64 bpm",
           "rebab sings a lullaby-like melody", "kanun answers with soft twinkling notes", "rebab lullaby returns, warm and hopeful"),
 "cenaze": ("death and mourning, funeral", "Saba makam, mournful, grief, solemn",
            "duduk-like double reed mey, ney, low drone, single slow bendir strokes", "54 bpm",
            "mey plays a mournful elegy over a low drone", "ney joins with grief, slow bendir like a heartbeat", "mey elegy returns, solemn and quiet"),
 "gerilim": ("tension, danger, battle preparation, crime", "Hicaz makam, tense, suspenseful, dark",
             "yayli tanbur tremolo, low kos drum pulses, kemence harmonics, low drone", "76 bpm",
             "low drone and tense yayli tanbur tremolo", "kos pulses grow, kemence harmonics heighten the suspense", "back to the tense tremolo and drone"),
 "divan": ("court of justice, the kadi's divan, formal hearing", "Segah makam, stately, formal, grave",
           "kanun, tanbur, kudum in a slow ceremonial usul", "66 bpm",
           "stately kanun theme with measured kudum", "tanbur develops a grave, judicial melody", "kanun theme returns, formal and composed"),
 "akin": ("Mongol raid, war, battle", "Kurdi makam, urgent, violent, epic",
          "large kos war drums, zurna, nakkare, low horn-free drones", "132 bpm",
          "pounding kos war drums with urgent nakkare", "zurna cries a battle melody over the drums", "war drums return, relentless"),
 "kitlik": ("famine, hard winter, scarcity", "Saba makam, bleak, cold, sorrowful",
            "bass kemence, sparse ney, cold wind-like drone", "58 bpm",
            "bass kemence plays a bleak slow line", "sparse ney phrases over a cold drone", "bass kemence returns, bleak and hollow"),
 "yolculuk": ("travel on the roads, caravans, the map", "Rast makam, adventurous, wide horizon, steady journey",
              "ud, kaval, camel-gait bendir and def rhythm", "90 bpm",
              "camel-gait rhythm with an ud travelling melody", "kaval opens the horizon with a soaring line", "ud travelling melody returns on the camel-gait rhythm"),
 "zafer": ("victory and triumph", "Rast makam, triumphant, proud, celebratory",
           "davul, zurna, nakkare, kos", "120 bpm",
           "triumphant zurna fanfare-like melody over davul and kos", "nakkare drives a proud victory march", "zurna triumph melody returns"),
 "miras": ("legacy, dynasty, generations, the chronicle book", "Huseyni makam, nostalgic, timeless, reverent",
           "ud, ney, kanun, soft bendir", "68 bpm",
           "ud plays a nostalgic chronicle theme", "ney and kanun weave memories of generations", "ud chronicle theme returns, timeless"),
 "tekke": ("sufi lodge, mosque courtyard, prayer and contemplation", "Huseyni makam, meditative, spiritual, serene",
           "ney taksim, bendir zikr pulse, soft kudum", "62 bpm",
           "ney taksim over a soft bendir pulse", "bendir zikr pulse deepens, ney rises in devotion", "serene ney returns over the gentle pulse"),
}
SURE = {"dugun": 48000, "senlik": 48000, "zafer": 42000, "akin": 48000, "dogum": 45000, "cenaze": 48000}

def plan(i):
    sahne, makam, calgi, tempo, a, b, a2 = P[i]
    toplam = SURE.get(i, 54000); x = toplam // 3
    poz = ORTAK_POZ + [f"for: {sahne}", makam, calgi, tempo]
    return {"positive_global_styles": poz, "negative_global_styles": ORTAK_NEG,
            "sections": [
              {"section_name": "A", "positive_local_styles": [a], "negative_local_styles": ["intro silence", "fade in"], "duration_ms": x, "lines": []},
              {"section_name": "B", "positive_local_styles": [b], "negative_local_styles": [], "duration_ms": x, "lines": []},
              {"section_name": "A2", "positive_local_styles": [a2, "end exactly as the piece began so it can loop"], "negative_local_styles": ["ending", "fade out", "ritardando"], "duration_ms": toplam - 2 * x, "lines": []}]}

if __name__ == "__main__":
    d = sys.argv[1]; os.makedirs(d, exist_ok=True)
    for i in P:
        json.dump(plan(i), open(os.path.join(d, i + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(P), "plan; toplam sn:", sum(SURE.get(i, 54000) for i in P) / 1000)
