// İstemci uyum testi adımları (istemci-uyum.test.ts): her çağrı mobil istemcinin GERÇEK HTTP istemcisinden geçer;
// `dene` yanıtı istemci doğrulayıcısının sonucuyla kaydeder. Adımlar iş kuralı hatalarını (yas_kapisi, para_yok...)
// bekler; test yalnız istemcinin yanıtı anlayamadığı (gecersiz_yanit) ya da sunucu kodunu düşürdüğü durumda düşer.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { YerlesimDO } from "../../src/index.ts";
import { oyunAyi } from "../../src/saat.ts";

export interface Baglam {
  I: any; A: any; B: any; c: any; O: any; env: any; fark: { ms: number }; bId?: string;
  dene: (ad: string, p: Promise<any>) => Promise<any>;
  no: () => string;
  ben: (o: any) => void;
  setEvre: (e: string) => void;
  turSet: () => Promise<any>;
}

/** Çocukluk: okumalar, öğrenme günü eylemleri, temel işler, beceri, pazar, han, topluluk, künye; üç ay ilerletme. */
export async function cocukAdimlari(x: Baglam) {
  const { I, A, B, c, dene, no, ben, O, fark, setEvre, turSet } = x;
  const P = I.protokol;
  const y = O.yerlesim;
  const npcler: string[] = y.harita.flatMap((m: any) => m.kisiler.map((k: any) => k.id));
  const npc = npcler[0];
  // İstemci kancalarından gerçek HTTP istemcileri (durum sapı: oturum türü "test").
  const at = I.useAtolyeIstemci(), bar = I.useBarinmaIstemci(), deb = I.useDebdebeIstemci(), eko = I.useEkonomiIstemci();
  const etk = I.useEtkinlikIstemci(), goc = I.useGocIstemci(), han = I.httpHanIstemci(() => undefined, 1), hnd = I.useHanedanIstemci();
  const hiz = I.httpHizmetIstemci(), ker = I.useKervanIstemci(), kun = I.useKunyeIstemci(), mul = I.useMulkIstemci();
  const siy = I.httpSiyasetIstemci(), tez = I.useTezgahIstemci(), ucg = I.useUcgenIstemci();
  const top = c.toplum, bec = c.beceri;

  const okumalar = async () => {
    await dene("kisi", c.kisi(npc, "tr"));
    await dene("beceri.agac(demirci)", bec.agac("demirci"));
    await dene("beceri.gecmis", bec.gecmis());
    await dene("kunye.numaram", kun.numaram());
    await dene("toplum.oyuncu(ben)", top.oyuncu(O.profil?.karakterId ?? y.ben.id, "tr"));
    await dene("toplum.gelen", top.gelen("tr"));
    await dene("toplum.duzenOku", top.duzenOku());
    await dene("toplum.topluluk", top.toplulukOku());
    await dene("eko.pazar", eko.pazar());
    await dene("eko.pazar(odun)", eko.pazar("odun"));
    await dene("eko.ismarlamalar", eko.ismarlamalar());
    await dene("eko.levha", eko.levha());
    await dene("eko.defter", eko.defter());
    await dene("hizmet.yukle", hiz.yukle());
    await dene("han.han", han.han("tr"));
    await dene("han.pano", han.pano());
    await dene("han.masalar(vitrin)", I.ekCagir({ yontem: "GET", yol: "/v1/han/masalar", tekrar: true }, I.masaVitriniMi));
    await dene("barinma.barinma", bar.barinma("tr", 1));
    await dene("barinma.donus", bar.donus("tr"));
    await dene("hanedan.hanedan", hnd.hanedan("tr"));
    await dene("hanedan.kronik", hnd.kronik(0, "tr"));
    await dene("hanedan.devirOnizle", hnd.devirOnizle(null, "tr"));
    await dene("debdebe.oku", deb.oku());
    await dene("debdebe.sezon", deb.sezon());
    await dene("mulk.liste", mul.liste());
    await dene("tezgah.dukkanlar", tez.dukkanlar());
    await dene("atolye.atolyeler", at.atolyeler());
    await dene("siyaset.yukle", siy.yukle());
    await dene("goc.onizle(talas)", goc.onizle("talas"));
    await dene("goc.emanet", goc.emanet());
    await dene("kervan.onizle", ker.onizle());
    await dene("ucgen.oku", ucg.oku({ dil: "tr" }));
    await dene("ucgen.oku(npc)", ucg.oku({ npc, dil: "tr" }));
  };
  await okumalar();

  setEvre("yazma");
  // Öğrenme günü 1: mahalle (sohbet), sonra diğer eylemler
  for (const n of npcler.slice(0, 3)) await dene(`eylem.sohbet(${n})`, c.eylem({ tur: "sohbet", hedef: n, istekNo: no(), dil: "tr" }));
  await dene("tanidik", c.tanidik({ hedef: npc, isaret: P.ISARETLER?.[0] ?? null, dil: "tr" }));
  for (const t of ["yardim", "hediye", "ayakIsi", "cirak", "mektep"]) await dene(`eylem.${t}`, c.eylem({ tur: t, hedef: t === "mektep" ? undefined : npcler[5], istekNo: no(), dil: "tr" }));
  for (const is of P.IS_IDLERI) await dene(`temelIs.${is}`, c.temelIs({ is, istekNo: no() }));
  await dene("sat(odun,1)", c.sat({ mal: "odun", adet: 1, istekNo: no() }));
  await dene("tabanAl(odun,1)", c.tabanAl({ mal: "odun", adet: 1, istekNo: no() }));
  await dene("meslek.sec(demirci)", c.meslek({ islem: "sec", meslek: "demirci", istekNo: no() }));
  const ag = await dene("beceri.agac(demirci)2", bec.agac("demirci"));
  const dugum = ag?.dugumler?.find((d: any) => !d.kilit && !d.neden)?.id ?? ag?.dugumler?.[0]?.id;
  await dene(`beceri.ogren(${dugum})`, bec.ogren({ meslek: "demirci", dugum, istekNo: no() }));
  await dene("beceri.iptal", bec.iptal({ istekNo: no() }));
  await dene(`beceri.ogren2(${dugum})`, bec.ogren({ meslek: "demirci", dugum, istekNo: no() }));
  await dene("beceri.hizlandir(egitim)", bec.hizlandir({ kaynak: "egitim", istekNo: no() }));
  const tarif = (await dene("yerlesim(tarif)", c.yerlesim("tr")))?.ben?.tarifler?.[0]?.id;
  if (tarif) await dene(`tarif(${tarif})`, c.tarif({ tarif, istekNo: no() }));
  const sip = await dene("siparisler2", c.siparisler("tr"));
  const s0 = sip?.acik?.[0]?.id ?? sip?.siparisler?.[0]?.id;
  if (s0) await dene(`siparisTeslim(${s0})`, c.siparisTeslim({ siparis: s0, istekNo: no(), dil: "tr" }));
  await dene("eko.ilan(sat odun)", eko.ilan({ tur: "sat", mal: "odun", adet: 1, fiyat: 3, istekNo: no() }));
  await dene("eko.ilan(al tas)", eko.ilan({ tur: "al", mal: "tas", adet: 1, fiyat: 1, istekNo: no() }));
  const pz = await dene("eko.pazar2", eko.pazar());
  await dene("eko.ismarla(B)", eko.ismarla({ hedef: B.profil?.karakterId ?? "x", mal: "odun", adet: 1, sure: 2, ucret: 1, istekNo: no() }));
  await dene("han.eylem(otur)", han.eylem({ masa: 1, tur: "otur", istekNo: no() }));
  await dene("han.panoAs", han.panoAs({ metin: "Odun satarım, çarşıya uğrayın.", tur: "satis", istekNo: no() }));
  await dene("han.ikram", han.ikram({ masa: 1, hedef: "ben", ikram: "su", istekNo: no() }));
  await dene("barinma.otomatik", bar.otomatik({ mod: "uyar", istekNo: no() }));
  await dene("barinma.kira", bar.kira({ oda: "ahir", sure: 1, han: 1, istekNo: no() }));
  await dene("barinma.emanet", bar.emanet({ istekNo: no() }));
  await dene("toplum.mesrep", top.mesrep({ el: "orta", cesaret: "orta", gurur: "orta", istekNo: no() }));
  await dene("hanedan.vasiyet(null)", hnd.vasiyet({ vasiyet: null, istekNo: no(), dil: "tr" }));
  await dene("kervan.haber", ker.haber({ istekNo: no() }));
  await dene("hizmet.hazirla", hiz.hazirla("dogum", 1));
  await dene("mulk.edin(dukkan)", mul.edin({ tur: "dukkan", istekNo: no() }));
  await dene("debdebe.levhaGorunur", deb.levhaGorunur(true));
  const dk = await dene("debdebe.oku(katalog)", deb.oku());
  const urun = dk?.katalog?.[0]?.id ?? Object.keys(dk?.katalog ?? {})[0];
  await dene(`debdebe.dene(${urun})`, deb.dene(String(urun)));
  const dv = await dene("davetOlustur", c.davetOlustur());
  if (dv?.kod) await dene("davetCoz", c.davetCoz(dv.kod));
  await dene("kisi(B o2)", c.kisi("o2", "tr"));
  // Künye ve arama
  const nm = await dene("kunye.numaram2", kun.numaram());
  ben(B); const nb = await dene("B.kunye.numaram", kun.numaram()); ben(A);
  const bNo = nb?.numara ?? nb;
  if (bNo) { await dene("kunye.numaraAra(B)", kun.numaraAra(String(bNo))); await dene("kunye.sayfa(B)", kun.sayfa(String(bNo), "tr")); }
  await dene("kunye.adAra(Ay)", kun.adAra("Ayse", null));
  const bId = B.profil?.karakterId ?? B.profil?.id;
  x.bId = bId;
  if (bId) {
    await dene("toplum.oyuncu(B)", top.oyuncu(bId, "tr"));
    await dene("toplum.dostluk(iste)", top.dostluk({ hedef: bId, islem: "iste", istekNo: no() }));
    await dene("toplum.teklif(armagan)", top.teklif({ tur: "armagan", hedef: bId, para: 1, istekNo: no() }));
    await dene("toplum.engelle+kaldir", top.engelle({ hedef: bId, islem: "engelle", istekNo: no() }));
    await dene("toplum.engelle kaldir", top.engelle({ hedef: bId, islem: "kaldir", istekNo: no() }));
    await dene("toplum.duzen", top.duzen({ gelen: "herkes", istekNo: no() }));
    ben(B); await dene("B.toplum.gelen", top.gelen("tr")); await dene("B.dostluk(kabul)", top.dostluk({ hedef: O.yerlesim.ben.id, islem: "kabul", istekNo: no() })); ben(A);
  }
  await dene("etkinlik.katil(yok)", etk.katil({ id: "yok", istekNo: no() }));
  await dene("goc.goc(talas)", goc.goc({ hedef: "talas", istekNo: no() }));
  await dene("siyaset.yaz", siy.yaz({ islem: "oy", istekNo: no() }));
  await dene("ucgen.eylem", ucg.eylem({ tur: "kiskirt", npc, hedef: npcler[1], istekNo: no() }));
  await turSet();
  await okumalar();
  for (const [ad, ms] of [["ay+1", 13 * 3600e3], ["ay+3", 24 * 3600e3], ["ay+8", 60 * 3600e3]] as const) {
    fark.ms += ms; setEvre(ad);
    await turSet();
    await okumalar();
    for (const n of npcler.slice(0, 2)) await dene(`eylem.sohbet(${n})`, c.eylem({ tur: "sohbet", hedef: n, istekNo: no(), dil: "tr" }));
    for (const is of P.IS_IDLERI) await dene(`temelIs.${is}`, c.temelIs({ is, istekNo: no() }));
    await dene("eylem.mektep", c.eylem({ tur: "mektep", istekNo: no(), dil: "tr" }));
    await dene("eylem.karar", c.eylem({ tur: "karar", secim: "a", istekNo: no(), dil: "tr" }));
  }
}

/** Yetişkinlik: iki oyuncu 20 yaşına, 5000 akçeye, nam 30'a getirilir (depo düzenlenir, DO yeniden kurulur); sonra
 * meslek, temel iş, beceri, pazar, han, barınma, topluluk, hanedan, mülk/tezgâh/atölye, kervan ve iki ay ilerletme. */
export async function yetiskinAdimlari(x: Baglam) {
  const { I, A, B, c, dene, no, ben, O, fark, setEvre, turSet, env } = x;
    // Yetişkinlik: iki oyuncuyu 20 yaşına, 5000 akçeye, nam 30'a getir (depoyu düzenle, DO'yu yeniden başlat).
  const yId = env.YERLESIM.idFromName("yerlesim:develi");
  const kayit = env.YERLESIM.ornekler.get(yId.toString());
  const ay = oyunAyi(Date.now());
  for (const o of ["o:o1", "o:o2"]) { const k = kayit.depolama.veri.get(o); Object.assign(k, { pa: 5000, nm: [30, 30, 30, 30], d: ay - 12 * 20 }); kayit.depolama.veri.set(o, k); }
  env.YERLESIM.ornekler.set(yId.toString(), { ornek: new YerlesimDO({ id: yId, storage: kayit.depolama }, env, () => Date.now()), depolama: kayit.depolama });
  setEvre("yetiskin");
  const P = I.protokol;
  const at = I.useAtolyeIstemci(), bar = I.useBarinmaIstemci(), deb = I.useDebdebeIstemci(), eko = I.useEkonomiIstemci();
  const etk = I.useEtkinlikIstemci(), goc = I.useGocIstemci(), han = I.httpHanIstemci(() => undefined, 1), hnd = I.useHanedanIstemci();
  const hiz = I.httpHizmetIstemci(), ker = I.useKervanIstemci(), mul = I.useMulkIstemci(), siy = I.httpSiyasetIstemci(), tez = I.useTezgahIstemci(), ucg = I.useUcgenIstemci();
  const top = c.toplum, bec = c.beceri;
  let y = await turSet();
  const npcler: string[] = y.harita.flatMap((m: any) => m.kisiler.map((k: any) => k.id));
  for (const t of ["yardim", "hediye", "ayakIsi", "cirak", "mektep"]) await dene(`eylem.${t}`, c.eylem({ tur: t, hedef: t === "mektep" ? undefined : npcler[6], istekNo: no(), dil: "tr" }));
  await dene("eylem.puan", c.eylem({ tur: "puan", ozellik: "guc", istekNo: no(), dil: "tr" }));
  for (const is of P.IS_IDLERI) await dene(`temelIs.${is}`, c.temelIs({ is, istekNo: no() }));
  await dene("sat(odun,1)", c.sat({ mal: "odun", adet: 1, istekNo: no() }));
  await dene("tabanAl(demir,2)", c.tabanAl({ mal: "demir", adet: 2, istekNo: no() }));
  await dene("tabanAl(odun,3)", c.tabanAl({ mal: "odun", adet: 3, istekNo: no() }));
  await dene("meslek.sec(demirci)", c.meslek({ islem: "sec", meslek: "demirci", istekNo: no() }));
  await dene("meslek.yan(oduncu)", c.meslek({ islem: "yan", meslek: "oduncu", istekNo: no() }));
  for (const is of ["onarim", "koruk", "hamal", "mutfak", "sertOdun"]) await dene(`temelIs.${is}`, c.temelIs({ is, istekNo: no() }));
  const ag = await dene("beceri.agac(demirci)", bec.agac("demirci"));
  const acik = (ag?.dugumler ?? []).filter((d: any) => (d.kilit ?? []).every((k: string) => k === "puan")).map((d: any) => d.id);
  const dugum = acik[0] ?? ag?.dugumler?.[0]?.id;
  await dene(`beceri.ogren(${dugum})`, bec.ogren({ meslek: "demirci", dugum, istekNo: no() }));
  await dene("beceri.agac(sonra)", bec.agac("demirci"));
  await dene("beceri.hizlandir(egitim)", bec.hizlandir({ kaynak: "egitim", istekNo: no() }));
  await dene("beceri.iptal", bec.iptal({ istekNo: no() }));
  await dene(`beceri.ogren2(${dugum})`, bec.ogren({ meslek: "demirci", dugum, istekNo: no() }));
  y = await turSet();
  for (const t of (y?.ben?.tarifler ?? []).slice(0, 4)) await dene(`tarif(${t.id})`, c.tarif({ tarif: t.id, istekNo: no() }));
  const sip = await dene("siparisler", c.siparisler("tr"));
  for (const s of (sip?.siparisler ?? sip?.acik ?? []).slice(0, 2)) await dene(`siparisTeslim(${s.id})`, c.siparisTeslim({ siparis: s.id, istekNo: no(), dil: "tr" }));
  // Pazar: A satar, B alır, A geri çeker
  const il = await dene("eko.ilan(sat odun)", eko.ilan({ tur: "sat", mal: "odun", adet: 2, fiyat: 3, istekNo: no() }));
  await dene("eko.ilan(al tas)", eko.ilan({ tur: "al", mal: "tas", adet: 1, fiyat: 2, istekNo: no() }));
  ben(B);
  const pz = await dene("B.eko.pazar(odun)", eko.pazar("odun"));
  if (il?.ilan?.id) await dene("B.eko.islem", eko.islem({ ilan: il.ilan.id, adet: 1, istekNo: no() }));
  await dene("B.eko.ismarla(A)", eko.ismarla({ hedef: "o1", mal: "odun", adet: 1, sure: 2, ucret: 2, istekNo: no() }));
  ben(A);
  if (il?.ilan?.id) await dene("eko.geri", eko.geri({ ilan: il.ilan.id, istekNo: no() }));
  const ism = await dene("eko.ismarlamalar", eko.ismarlamalar());
  const gi = ism?.gelen?.[0]?.id;
  if (gi) await dene("eko.cevap(kabul)", eko.cevap({ ismarlama: gi, cevap: "kabul", istekNo: no() }));
  await dene("eko.defter", eko.defter());
  await dene("eko.levha", eko.levha());
  // Han
  const h = await dene("han.han", han.han("tr"));
  await dene("han.ikram", han.ikram({ masa: 1, hedef: "o2", ikram: "ekmek", istekNo: no() }));
  await dene("han.panoAs", han.panoAs({ metin: "Odun satarım, çarşıya uğrayın.", tur: "is", istekNo: no() }));
  const pano = await dene("han.pano", han.pano());
  const pid = pano?.ilanlar?.[0]?.id;
  if (pid) { ben(B); await dene("B.han.ilanSikayet", han.ilanSikayet({ ilan: pid, neden: "spam", istekNo: no() })); ben(A); await dene("han.panoSil", han.panoSil({ ilan: pid, istekNo: no() })); }
  await dene("han.eylem(yemin)", han.eylem({ masa: 1, tur: "yemin", istekNo: no() }));
  await dene("han.ziyafet", han.ziyafet({ masa: 1, istekNo: no() }));
  await dene("han.masalar", I.ekCagir({ yontem: "GET", yol: "/v1/han/masalar", tekrar: true }, I.masaVitriniMi));
  // Barınma
  const b = await dene("barinma.barinma", bar.barinma("tr", 1));
  const oda = b?.barinma?.odalar?.[0]?.oda ?? b?.barinma?.odalar?.[0]?.id ?? "yatak";
  await dene(`barinma.kira(${oda})`, bar.kira({ oda, sure: 1, han: 1, istekNo: no() }));
  await dene("barinma.sandik(koy)", bar.sandik({ islem: "koy", mal: "odun", adet: 1, istekNo: no() }));
  await dene("barinma.sandik(al)", bar.sandik({ islem: "al", mal: "odun", adet: 1, istekNo: no() }));
  await dene("barinma.otomatik(oda)", bar.otomatik({ mod: "oda", istekNo: no() }));
  await dene("barinma.tesis", bar.tesis({ istekNo: no() }));
  await dene("barinma.gorusme(davet B)", bar.gorusme({ islem: "davet", hedef: "o2", istekNo: no() }));
  // Topluluk
  await dene("toplum.mesrep", top.mesrep({ el: "comert", cesaret: "orta", gurur: "orta", istekNo: no() }));
  await dene("toplum.topluluk", top.toplulukOku());
  await dene("toplum.hami(teklif B)", top.hami({ islem: "teklif", hedef: "o2", istekNo: no() }));
  await dene("toplum.senlik(hayir)", top.senlik({ katki: "hayir", tutar: 1, istekNo: no() }));
  await dene("toplum.zaviye(kur)", top.zaviye({ islem: "kur", ad: "Ahi Evran", sekil: "kalkan", renk: "al", istekNo: no() }));
  await dene("toplum.teklif(borc)", top.teklif({ tur: "borc", hedef: "o2", para: 5, vade: 2, istekNo: no() }));
  const gelenB = (ben(B), await dene("B.toplum.gelen", top.gelen("tr")));
  const tk = gelenB?.gelen?.[0]?.id;
  if (tk) await dene("B.teklifCevap(kabul)", top.teklifCevap({ teklif: tk, cevap: "kabul", istekNo: no() }));
  await dene("B.toplum.vitrin", top.vitrin({ goster: [], istekNo: no() }));
  await dene("B.toplum.husumet(ilan)", top.husumet({ hedef: "o1", islem: "ilan", istekNo: no() }));
  await dene("B.toplum.oyuncu(A)", top.oyuncu("o1", "tr"));
  ben(A);
  await dene("toplum.sikayet(B)", top.sikayet({ hedef: "o2", neden: "spam", istekNo: no() }));
  await dene("toplum.gelen", top.gelen("tr"));
  // Hanedan
  await dene("hanedan.hanedan", hnd.hanedan("tr"));
  await dene("hanedan.evlilik", hnd.evlilik({ hedef: npcler[3], istekNo: no(), dil: "tr" }));
  await dene("hanedan.devirOnizle", hnd.devirOnizle(null, "tr"));
  // Mülk / tezgâh / atölye
  const m = await dene("mulk.liste", mul.liste());
  for (const tur of ["dukkan", "atolye", "han"]) await dene(`mulk.edin(${tur})`, mul.edin({ tur, istekNo: no() }));
  const m2 = await dene("mulk.liste2", mul.liste());
  const benim: any[] = m2?.benim ?? [];
  for (const i of benim) {
    const id = typeof i === "string" ? i : (i.id ?? i.isletme);
    await dene(`mulk.panel(${id})`, mul.panel(id));
    await dene(`mulk.devir(${id})`, mul.devir(id));
    await dene(`tezgah.tezgah(${id})`, tez.tezgah(id));
    await dene(`tezgah.onizle(${id})`, tez.onizle(id, { mal: "odun", kalite: 0, fiyat: 3, adet: 1 }));
    await dene(`tezgah.depo koy(${id})`, tez.depo(id, { yon: "koy", mal: "odun", adet: 1, istekNo: no() }));
    await dene(`tezgah.raf(${id})`, tez.raf(id, { islem: "koy", mal: "odun", kalite: 0, adet: 1, fiyat: 3, istekNo: no() }));
    await dene(`mulk.komut fiyat(${id})`, mul.komut(id, "fiyat", { carpan: 1, istekNo: no() }));
    await dene(`mulk.komut yatir(${id})`, mul.komut(id, "yatir", { tutar: 10, istekNo: no() }));
    await dene(`atolye.zanaat(${id})`, at.zanaat(id, { meslek: "demirci", istekNo: no() }));
    await dene(`atolye.genislet(${id})`, at.genislet(id, { istekNo: no() }));
    if (id.includes("atolye")) {
      await dene(`atolye.mesai(${id})`, at.mesai(id, { emek: 1, istekNo: no() }));
      for (const tr of ["nal", "civi", "balta", "orak"]) await dene(`atolye.emir(${tr})`, at.emir(id, { islem: "ac", tarif: tr, kez: 1, istekNo: no() }));
      for (const tr of ["nal", "civi"]) await dene(`atolye.uret(${tr})`, at.uret(id, { tarif: tr, istekNo: no() }));
      await dene(`tezgah.tezgah2(${id})`, tez.tezgah(id));
      await dene(`mulk.panel2(${id})`, mul.panel(id));
    }
  }
  await dene("tezgah.dukkanlar", tez.dukkanlar());
  await dene("atolye.atolyeler", at.atolyeler());
  // Göç / kervan / siyaset / ucgen
  await dene("kervan.onizle(karapinar)", ker.onizle("karapinar", { odun: 1 }));
  await dene("kervan.haber", ker.haber({ istekNo: no() }));
  await dene("kervan.yolla", ker.yolla({ hedef: "karapinar", mallar: { odun: 1 }, istekNo: no() }));
  await dene("siyaset.yukle", siy.yukle());
  await dene("ucgen.oku(npc)", ucg.oku({ npc: npcler[2], dil: "tr" }));
  await dene("hizmet.yukle", hiz.yukle());
  await dene("debdebe.oku", deb.oku());
  await dene("goc.onizle(karapinar)", goc.onizle("karapinar"));
  await turSet();
  for (const [ad, ms] of [["yetiskin+1ay", 13 * 3600e3], ["yetiskin+4ay", 36 * 3600e3]] as const) {
    fark.ms += ms; setEvre(ad);
    await turSet();
    await dene("eko.pazar", eko.pazar()); await dene("eko.defter", eko.defter()); await dene("han.han", han.han("tr")); await dene("barinma.barinma", bar.barinma("tr", 1));
    await dene("barinma.donus", bar.donus("tr")); await dene("hanedan.hanedan", hnd.hanedan("tr")); await dene("hanedan.kronik", hnd.kronik(0, "tr"));
    await dene("mulk.liste", mul.liste()); await dene("tezgah.dukkanlar", tez.dukkanlar()); await dene("atolye.atolyeler", at.atolyeler());
    for (const i of benim) { await dene("mulk.panel", mul.panel(typeof i === "string" ? i : i.id)); await dene("tezgah.tezgah", tez.tezgah(typeof i === "string" ? i : i.id)); }
    await dene("kervan.onizle", ker.onizle()); await dene("siyaset.yukle", siy.yukle()); await dene("toplum.gelen", top.gelen("tr")); await dene("eko.ismarlamalar", eko.ismarlamalar());
    await dene("beceri.agac", bec.agac("demirci")); await dene("hizmet.yukle", hiz.yukle()); await dene("goc.emanet", goc.emanet()); await dene("olaylar", c.olaylar(0, "tr"));
  }
  setEvre("goc");
  await dene("goc.goc(karapinar)", goc.goc({ hedef: "karapinar", istekNo: no() }));
  await turSet();
  await dene("goc.emanet", goc.emanet());
}
