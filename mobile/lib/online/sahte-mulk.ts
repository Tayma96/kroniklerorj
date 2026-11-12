// Geliştirici/önizleme için sahte mülk ve işletme (Faz 12–13) istemcisi. Senaryo: kasabanın hanı oyuncunun; bir
// dükkân Zeynep'in (oyuncuya devir teklifiyle), bir atölye Usta Kerem'in (oyuncuya iş teklifiyle), diğer yuvalar boş.
// Panel, kasa, gelir dökümü ve devir önizlemesi sunucu biçiminde hazır gelir; istemci hesap yapmaz.
import { ekBasarili, ekBasarisiz } from "./ek-istemci";
import type { DevirOnizleme, EdinimSarti, IsletmePaneli, MulkIstemci, MulkListesi, MulkTuru, PanelYaniti, Rol, SozlesmeGorunumu, TezyinGrubu, Yetki } from "./mulk-veri";

const AY = 40;
const bekle = () => new Promise<void>((r) => setTimeout(r, 60));
const FIYAT: Record<MulkTuru, number> = { han: 250, dukkan: 120, atolye: 150 };
const TEZ_FIYAT: Record<string, number> = { selcuklu: 40, ahsap: 20, tas: 60, sakin: 10, hareketli: 15, luks: 50, mutevazi: 5, kandil: 5, samdan: 15, avize: 45, yok: 0, misafirOdasi: 35, toplantiOdasi: 35 };
const ROL_YETKI: Record<Rol, Yetki[]> = { hanci: ["musteri", "fiyat"], garson: ["musteri"], asci: [], ozan: ["masa"], yonetici: ["kasa", "musteri", "fiyat", "personel", "masa"] };

export function sahteMulkIstemci(baslangicPara: number, yer: string): MulkIstemci {
  const id = (tur: MulkTuru, no: number) => `${yer}.${tur}.${no}`;
  const HAN = id("han", 1);
  const s = { para: Math.max(140, baslangicPara), benim: [HAN] as string[], sn: 3 };
  const soz = (no: number, ad: string, cid: string, tur: "oyuncu" | "npc", rol: Rol, maas: number, kd: number): SozlesmeGorunumu => ({
    no, calisan: { tur, id: cid, ad }, rol, yetkiler: [...ROL_YETKI[rol]], maas, baslangic: AY - 5, bitis: null, odenenAy: 5, kademe: kd, durum: "etkin", vekaletBitis: null,
  });
  const han: IsletmePaneli = {
    id: HAN, tur: "han", ad: "Kervan Konağı", durum: "acik", sahip: { id: "o1", ad: "Elif Nur" },
    seviye: { ad: "gelisen", sira: 1, puan: 48, dokum: { itibar: 26, faaliyet: 14, gelir: 8 }, sonrakiEsik: 65 }, itibar: 26, kapasite: 5,
    tezyin: { mimari: "ahsap", aydinlatma: "kandil" }, fiyatCarpani: 100, kapi: true,
    kasa: 86, emanet: 30, borc: 0, borcAy: 0,
    defter: [[AY, "npcMusteri", 12], [AY, "kira", 8, "o4"], [AY, "ikram", 3, "o9"], [AY, "bakim", -6], [AY, "maas", -9, "1"], [AY - 1, "npcMusteri", 11], [AY - 1, "tezyin", -5, "aydinlatma:kandil"], [AY - 1, "cek", -20, "o1"]],
    maasYuku: 15, kalite: { toplam: 3, dokum: [{ rol: "hanci", kademe: 1, kaynak: "sahip" }, { rol: "asci", kademe: 1, kaynak: "personel" }, { rol: "ozan", kademe: 1, kaynak: "personel" }] },
    npcGeliri: { tutar: 12, taban: 6, itibarYuzde: 26, kaliteYuzde: 15, teveccuhYuzde: 5, tavan: 16 }, bakim: 6,
    personel: [soz(1, "Fadime Ana", "n14", "npc", "asci", 9, 1), soz(2, "Zeynep", "o4", "oyuncu", "ozan", 6, 1)],
    teklifler: [{ n: 3, hedef: { o: "o9", ad: "Hasan Bey" }, r: "garson", m: 5, ay: AY }], oneriler: [], sicil: 0,
    cekim: { bugun: 0, tavan: 200 }, tezyinKalan: 22, adUcretsizKalan: 1,
  };
  const vitrin = (isletme: string, tur: MulkTuru, ad: string, sahip: [string, string]): PanelYaniti => ({
    isletme: { id: isletme, tur, ad, durum: "acik", sahip: { id: sahip[0], ad: sahip[1] }, seviye: { ad: "mutevazi", sira: 0, puan: 22, dokum: { itibar: 14, faaliyet: 6, gelir: 2 }, sonrakiEsik: 35 },
      itibar: 14, kapasite: tur === "han" ? 3 : 1, tezyin: {}, fiyatCarpani: 100, kapi: true },
    konum: null, yetkiler: [],
  });
  const sart = (tur: MulkTuru): EdinimSarti => {
    const eksik = s.para < FIYAT[tur] ? ["akce"] : [];
    return { fiyat: FIYAT[tur], akce: s.para, nam: 44, namEsigi: 60, loncaKademe: 1, loncaEsigi: 1, yas: 19, yasEsigi: 16, uygun: eksik.length === 0, eksik };
  };
  const liste = (): MulkListesi => ({
    yuvalar: [
      { isletme: HAN, tur: "han", no: 1, durum: "sahipli", sahip: { id: "o1", ad: "Elif Nur" }, ad: han.ad, seviye: 1 },
      { isletme: id("dukkan", 1), tur: "dukkan", no: 1, durum: "sahipli", sahip: { id: "o4", ad: "Zeynep" }, ad: "Zeynep'in Kumaş Dükkânı", seviye: 0, devirTeklifi: { fiyat: 90 } },
      s.benim.includes(id("dukkan", 2)) ? { isletme: id("dukkan", 2), tur: "dukkan", no: 2, durum: "sahipli", sahip: { id: "o1", ad: "Elif Nur" }, ad: "", seviye: 0 }
        : { isletme: id("dukkan", 2), tur: "dukkan", no: 2, durum: "bos", fiyat: FIYAT.dukkan },
      s.benim.includes(id("atolye", 1)) ? { isletme: id("atolye", 1), tur: "atolye", no: 1, durum: "sahipli", sahip: { id: "o1", ad: "Elif Nur" }, ad: "", seviye: 0 }
        : { isletme: id("atolye", 1), tur: "atolye", no: 1, durum: "bos", fiyat: FIYAT.atolye },
      { isletme: id("atolye", 2), tur: "atolye", no: 2, durum: "sahipli", sahip: { id: "o7", ad: "Usta Kerem" }, ad: "Kerem Ocağı", seviye: 2 },
    ],
    benim: [...s.benim], calistigim: [], teklifler: [id("atolye", 2)], sinir: { enCok: 2, sahip: s.benim.length },
    edinimSarti: { han: sart("han"), dukkan: sart("dukkan"), atolye: sart("atolye") }, bekleyen: [],
  });
  const panel = (isletme: string): PanelYaniti | null => {
    if (isletme === HAN) return { isletme: han, konum: "sahip", yetkiler: ["kasa", "musteri", "fiyat", "personel", "vekalet", "masa"] };
    if (isletme === id("dukkan", 1)) return vitrin(isletme, "dukkan", "Zeynep'in Kumaş Dükkânı", ["o4", "Zeynep"]);
    if (isletme === id("atolye", 2)) return vitrin(isletme, "atolye", "Kerem Ocağı", ["o7", "Usta Kerem"]);
    return null;
  };
  const yeniSoz = (rol: Rol, maas: number, ad: string, cid: string, tur: "oyuncu" | "npc") => { const x = soz(++s.sn, ad, cid, tur, rol, maas, 1); x.baslangic = AY; x.odenenAy = 0; han.personel!.push(x); return x; };
  return {
    async liste() { await bekle(); return ekBasarili(liste()); },
    async edin(g) {
      await bekle();
      if (s.benim.length >= 2) return ekBasarisiz("mulk_siniri");
      const no = g.tur === "dukkan" ? 2 : g.tur === "atolye" ? 1 : 0;
      if (!no || s.benim.includes(id(g.tur, no))) return ekBasarisiz("mulk_dolu");
      const sa = sart(g.tur);
      if (!sa.uygun) return ekBasarisiz("para_yok");
      s.para -= sa.fiyat;
      s.benim.push(id(g.tur, no));
      return ekBasarili({ edinim: { isletme: id(g.tur, no), tur: g.tur, no, fiyat: sa.fiyat, batak: sa.fiyat, sart: sa, islem: "sahte" }, transferDurumu: "kesin" });
    },
    async panel(isletme) { await bekle(); const p = panel(isletme); return p ? ekBasarili(p) : ekBasarisiz("isletme_yok"); },
    async devir(isletme) {
      await bekle();
      const p = panel(isletme);
      if (!p) return ekBasarisiz("isletme_yok");
      const d: DevirOnizleme = isletme === HAN
        ? { surum: "s1", isletme, sahip: p.isletme.sahip, kasa: han.kasa!, emanet: han.emanet!, borc: 0, borcAy: 0, iflasEsigi: 3, maasYuku: 15, sozlesmeler: han.personel!, sicil: 0, itibar: han.itibar, seviye: han.seviye.ad, bekleyenTransfer: 0 }
        : { surum: "s2", isletme, sahip: p.isletme.sahip, kasa: 34, emanet: 0, borc: 4, borcAy: 1, iflasEsigi: 3, maasYuku: 0, sozlesmeler: [], sicil: 1, itibar: 14, seviye: "mutevazi", bekleyenTransfer: 0 };
      return ekBasarili(d);
    },
    async komut(isletme, k, g) {
      await bekle();
      if (k === "devir" && g.islem === "kabul") {
        if (s.benim.length >= 2) return ekBasarisiz("mulk_siniri");
        if (s.para < 90) return ekBasarisiz("para_yok");
        s.para -= 90; s.benim.push(isletme);
        return ekBasarili({ devir: { isletme, fiyat: 90 }, transferDurumu: "kesin", para: s.para });
      }
      if (k === "personel" && (g.islem === "kabul" || g.islem === "red")) return ekBasarili({ kabul: g.islem === "kabul", para: s.para });
      if (isletme !== HAN) return ekBasarisiz("yetki_yok");
      const tutar = typeof g.tutar === "number" ? g.tutar : 0;
      switch (k) {
        case "yatir": if (s.para < tutar) return ekBasarisiz("para_yok"); s.para -= tutar; han.kasa! += tutar; han.defter!.unshift([AY, "yatir", tutar, "o1"]); break;
        case "cek": if (han.kasa! < tutar) return ekBasarisiz("kasa_yetersiz"); if (han.cekim!.bugun + tutar > 200) return ekBasarisiz("cekim_tavani");
          han.kasa! -= tutar; han.cekim!.bugun += tutar; s.para += tutar; han.defter!.unshift([AY, "cek", -tutar, "o1"]); break;
        case "emanet": if (g.yon === "koy") { if (han.kasa! < tutar) return ekBasarisiz("kasa_yetersiz"); han.kasa! -= tutar; han.emanet! += tutar; }
          else { if (han.emanet! - han.maasYuku! < tutar) return ekBasarisiz("emanet_yetersiz"); han.emanet! -= tutar; han.kasa! += tutar; } break;
        case "ad": if (han.adUcretsizKalan! <= 0) return ekBasarisiz("ad_jetonu_yok"); if (typeof g.ad !== "string" || g.ad.trim().length < 3) return ekBasarisiz("ad_karakter"); han.ad = g.ad.trim(); han.adUcretsizKalan = 0; break;
        case "tezyin": { const f = TEZ_FIYAT[String(g.secim)] ?? 0; if (han.kasa! < f) return ekBasarisiz("kasa_yetersiz"); han.kasa! -= f; han.tezyin[g.grup as TezyinGrubu] = String(g.secim); han.tezyinKalan! -= 1; break; }
        case "fiyat": han.fiyatCarpani = Number(g.carpan); break;
        case "kapi": han.kapi = g.acik === true; if (han.npcGeliri) han.npcGeliri.tutar = han.kapi ? 12 : 0; break;
        case "personel": {
          const sz = han.personel!.find((x) => x.no === g.sozlesme);
          if (g.islem === "npc" || g.islem === "teklif") {
            if (han.personel!.length >= 8) return ekBasarisiz("personel_dolu");
            const rol = g.rol as Rol; const maas = Number(g.maas);
            if (g.islem === "npc") yeniSoz(rol, maas, "Ali Usta", String(g.hedef), "npc");
            else han.teklifler!.push({ n: ++s.sn, hedef: { o: String(g.hedef), ad: String(g.hedef) }, r: rol, m: maas, ay: AY });
          } else if (!sz) return ekBasarisiz("sozlesme_yok");
          else if (g.islem === "cikar") { if (han.emanet! < sz.maas) return ekBasarisiz("emanet_yetersiz"); han.emanet! -= sz.maas; han.personel = han.personel!.filter((x) => x !== sz); }
          else if (g.islem === "maas") { const m = Number(g.maas); if (sz.calisan.tur === "oyuncu" && m < sz.maas) return ekBasarisiz("maas_kesinti"); sz.maas = m; }
          else if (g.islem === "yetki") { const y = g.yetki as Yetki; sz.yetkiler = g.ver ? [...new Set([...sz.yetkiler, y])] : sz.yetkiler.filter((x) => x !== y); if (y === "vekalet") sz.vekaletBitis = g.ver ? AY + Number(g.sure ?? 1) - 1 : null; }
          han.maasYuku = han.personel!.reduce((t, x) => t + x.maas, 0);
          break;
        }
        case "devir": break;
      }
      return ekBasarili({ kasa: han.kasa, para: s.para });
    },
  };
}
