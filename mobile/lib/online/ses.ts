// Faz 16 handa sesli sohbet (WePlay tarzı): masaya oturan mikrofonunu açar, masadakiler duyar.
// Ses Cloudflare Realtime SFU'dan geçer; sunucu (MasaDO) yetki kapısıdır ve Realtime'a vekildir: uygulama anahtarı
// istemciye hiç gelmez, Realtime oturum kimlikleri de gelmez. Ses kaydedilmez, saklanmaz; bu dosya hiçbir yere yazmaz.
// Yerel modül (`react-native-webrtc`) yalnız yeni APK'da vardır: Expo Go'da/eski sürümde düğme gizlenir ve neden yazılır.
// Önizleme (sahte han) yerel modül olmadan durumu taklit eder; ekran kırılmaz.
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, NativeModules, PermissionsAndroid, Platform } from "react-native";
import type * as Webrtc from "react-native-webrtc";
import type { EkHata } from "./ek-istemci";
import type { HanIstemci, IceSunucusu, IstemciIletisi, SdpYaniti, SesDurumu } from "./han-veri";

/** [PARAMETRE] Konuşma eşiği (0–1 ses düzeyi), ölçüm aralığı ve susunca bekleme (ms). */
const KONUSMA_ESIGI = 0.035;
const OLCUM_MS = 400;
const SUSMA_MS = 900;

type Rn = typeof Webrtc;
let yuklu: Rn | null | undefined;
/** Yerel WebRTC modülü: Expo Go'da ve modülsüz eski APK'da null (require hiç denenmez). */
function webrtc(): Rn | null {
  if (yuklu !== undefined) return yuklu;
  if (Platform.OS === "web" || !(NativeModules as Record<string, unknown>).WebRTCModule) return (yuklu = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    yuklu = require("react-native-webrtc") as Rn;
  } catch {
    yuklu = null;
  }
  return yuklu;
}
export const yerelSesVar = (): boolean => webrtc() !== null;

const sdpMi = (v: unknown): v is SdpYaniti =>
  typeof v === "object" && v !== null && ((v as SdpYaniti).type === "offer" || (v as SdpYaniti).type === "answer") && typeof (v as SdpYaniti).sdp === "string";

class SesHatasi extends Error {
  constructor(readonly kod: EkHata | "izin") { super(kod); }
}

/** WebRTC bağlantısı: tek RTCPeerConnection; yayın (sendonly) ve çekilen izler (recvonly) aynı bağlantıda. */
class SesMotoru {
  #pc: Webrtc.RTCPeerConnection | null = null;
  #akis: Webrtc.MediaStream | null = null;
  #verici: Webrtc.RTCRtpTransceiver | null = null;
  /** iz adı → { mid, hesap } */
  readonly cekilen = new Map<string, { mid: string; hesap: string }>();
  /** mid → gelen ses izi */
  readonly #gelen = new Map<string, Webrtc.MediaStreamTrack>();
  #sessiz: string[] = [];
  #sira: Promise<unknown> = Promise.resolve();
  #kapandi = false;

  constructor(readonly rn: Rn, readonly istemci: HanIstemci, readonly no: number) {}

  /** İşlemler sırayla yürür (SDP alışverişi iç içe geçmesin). */
  sirala<T>(is: () => Promise<T>): Promise<T> {
    const p = this.#sira.then(is, is);
    this.#sira = p.catch(() => undefined);
    return p;
  }

  async #cagir(alt: "oturum" | "yayin" | "dinle" | "anlas" | "kapat", govde: Record<string, unknown>): Promise<Record<string, unknown>> {
    const r = await this.istemci.ses(this.no, alt, govde);
    if (!r.ok) throw new SesHatasi(r.hata);
    return r.deger;
  }

  async #hazirla(): Promise<Webrtc.RTCPeerConnection> {
    if (this.#kapandi) throw new SesHatasi("ses_oturumu_yok");
    if (this.#pc) return this.#pc;
    const r = await this.#cagir("oturum", {});
    const ice = Array.isArray(r.ice) ? (r.ice as IceSunucusu[]) : [];
    const pc = new this.rn.RTCPeerConnection({ iceServers: ice, bundlePolicy: "max-bundle" } as never);
    type IzOlayi = { transceiver?: { mid: string | null }; track: Webrtc.MediaStreamTrack | null };
    (pc as unknown as { addEventListener(t: "track", f: (e: IzOlayi) => void): void }).addEventListener("track", (e) => {
      const mid = e.transceiver?.mid;
      if (!mid || !e.track) return;
      this.#gelen.set(mid, e.track);
      this.#sessizUygula();
    });
    this.#pc = pc;
    return pc;
  }

  async #izinAl(): Promise<void> {
    if (Platform.OS !== "android") return;
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (r !== PermissionsAndroid.RESULTS.GRANTED) throw new SesHatasi("izin");
  }

  /** Mikrofonu yayına açar. */
  mikAc(): Promise<void> {
    return this.sirala(async () => {
      if (this.#verici) return;
      await this.#izinAl();
      const pc = await this.#hazirla();
      const akis = await this.rn.mediaDevices.getUserMedia({ audio: true, video: false });
      const iz = akis.getAudioTracks()[0];
      if (!iz) throw new SesHatasi("ses_hatasi");
      this.#akis = akis;
      const verici = pc.addTransceiver(iz, { direction: "sendonly" });
      this.#verici = verici;
      try {
        const teklif = await pc.createOffer({});
        await pc.setLocalDescription(teklif);
        const r = await this.#cagir("yayin", { sdp: pc.localDescription?.sdp ?? teklif.sdp, mid: verici.mid });
        if (sdpMi(r.sdp)) await pc.setRemoteDescription(new this.rn.RTCSessionDescription(r.sdp));
      } catch (e) {
        this.#yerelMikKapat();
        throw e;
      }
    });
  }

  #yerelMikKapat(): string | null {
    const mid = this.#verici?.mid ?? null;
    this.#akis?.getTracks().forEach((t) => t.stop());
    this.#akis?.release?.();
    this.#akis = null;
    try { this.#verici?.stop(); } catch { /* yut */ }
    this.#verici = null;
    return mid;
  }

  /** Mikrofonu kapatır. `sunucu` false ise yalnız yerelde (sunucu zaten kapattı: susturma, ses kesme, kalkma). */
  mikKapat(sunucu = true): Promise<void> {
    return this.sirala(async () => {
      const pc = this.#pc;
      const mid = this.#yerelMikKapat();
      if (!sunucu || !mid || !pc) return;
      try {
        const teklif = await pc.createOffer({});
        await pc.setLocalDescription(teklif);
        const r = await this.#cagir("kapat", { sdp: pc.localDescription?.sdp ?? teklif.sdp });
        if (sdpMi(r.sdp)) await pc.setRemoteDescription(new this.rn.RTCSessionDescription(r.sdp));
      } catch {
        // SDP uyuşmazsa sunucu yine zorla kapatır
        await this.istemci.ses(this.no, "kapat", {}).catch(() => undefined);
      }
    });
  }

  get mikAcik(): boolean {
    return this.#verici !== null;
  }

  /** Yeni yayınları çeker. */
  dinle(izler: { iz: string; hesap: string }[]): Promise<void> {
    return this.sirala(async () => {
      const yeni = izler.filter((i) => !this.cekilen.has(i.iz));
      if (!yeni.length) return;
      const pc = await this.#hazirla();
      const r = await this.#cagir("dinle", { izler: yeni.map((i) => i.iz) });
      const gelen = Array.isArray(r.izler) ? (r.izler as { mid: string; iz: string; hesap: string }[]) : [];
      for (const g of gelen) this.cekilen.set(g.iz, { mid: g.mid, hesap: g.hesap });
      if (!sdpMi(r.sdp)) return;
      await pc.setRemoteDescription(new this.rn.RTCSessionDescription(r.sdp));
      const cevap = await pc.createAnswer();
      await pc.setLocalDescription(cevap);
      await this.#cagir("anlas", { sdp: pc.localDescription?.sdp ?? cevap.sdp });
    });
  }

  /** Yayından düşenleri bırakır (en iyi çaba). */
  birak(izler: string[]): Promise<void> {
    return this.sirala(async () => {
      const mids: string[] = [];
      for (const iz of izler) {
        const c = this.cekilen.get(iz);
        if (!c) continue;
        this.cekilen.delete(iz);
        this.#gelen.delete(c.mid);
        mids.push(c.mid);
      }
      if (mids.length) await this.istemci.ses(this.no, "kapat", { mids }).catch(() => undefined);
    });
  }

  /** Yerel sessize alınanların sesi bu cihazda çalmaz (sunucuya bir şey gitmez). */
  sessiz(liste: string[]): void {
    this.#sessiz = liste;
    this.#sessizUygula();
  }

  #sessizUygula(): void {
    for (const c of this.cekilen.values()) {
      const iz = this.#gelen.get(c.mid);
      if (iz) iz.enabled = !this.#sessiz.includes(c.hesap);
    }
  }

  /** Kendi mikrofonumun ses düzeyi (0–1); ölçülemezse undefined. */
  async seviye(): Promise<number | undefined> {
    const pc = this.#pc;
    if (!pc || !this.#verici) return undefined;
    try {
      const rapor = (await pc.getStats()) as Map<string, Record<string, unknown>>;
      let enYuksek: number | undefined;
      rapor.forEach((r) => {
        if ((r.type === "media-source" || r.type === "track") && typeof r.audioLevel === "number") enYuksek = Math.max(enYuksek ?? 0, r.audioLevel);
      });
      return enYuksek;
    } catch {
      return undefined;
    }
  }

  /** Bağlantıyı tümden bırakır (ekrandan çıkış, masa değişimi). */
  kapat(): void {
    if (this.#kapandi) return;
    this.#kapandi = true;
    const vardi = this.#pc !== null;
    this.#yerelMikKapat();
    try { this.#pc?.close(); } catch { /* yut */ }
    this.#pc = null;
    this.cekilen.clear();
    this.#gelen.clear();
    if (vardi) void this.istemci.ses(this.no, "kapat", { tum: true }).catch(() => undefined);
  }
}

export interface SesGirdisi {
  no: number;
  istemci: HanIstemci;
  ses: SesDurumu | null;
  ben: string | null;
  oturuyor: boolean;
  /** Masa soketi açık mı. */
  bagli: boolean;
  /** Yerel sessize alınanlar (sohbetle ortak liste). */
  sessiz: string[];
  gonder: (i: IstemciIletisi) => boolean;
}

export interface SesKancasi {
  /** Mikrofon düğmesi ve söz iste görünsün mü. */
  gorunur: boolean;
  /** Görünmüyorsa neden (i18n anahtarı); durum henüz gelmediyse null. */
  neden: string | null;
  mik: boolean;
  bekliyor: boolean;
  hata: EkHata | "izin" | null;
  hataTemizle: () => void;
  mikDegistir: () => void;
  konusuyor: (hesap: string) => boolean;
  mikAcik: (hesap: string) => boolean;
  kesik: (hesap: string) => boolean;
  sozIstedi: (hesap: string) => boolean;
}

export function useSes(g: SesGirdisi): SesKancasi {
  const { no, istemci, ses, ben, oturuyor, bagli, sessiz, gonder } = g;
  const sahte = istemci.sahte === true;
  const rn = sahte ? null : webrtc();
  const [mik, setMik] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<EkHata | "izin" | null>(null);
  const motor = useRef<SesMotoru | null>(null);
  const konusma = useRef(false);
  const gonderRef = useRef(gonder);
  gonderRef.current = gonder;
  const uygun = !!ses?.acik && bagli && (sahte || rn !== null);

  // Bağlantı ömrü: masa ya da uygunluk değişince motor yenilenir; ekrandan çıkınca bırakılır.
  useEffect(() => {
    if (!uygun || sahte || !rn) return;
    const m = new SesMotoru(rn, istemci, no);
    motor.current = m;
    return () => {
      m.kapat();
      if (motor.current === m) motor.current = null;
      setMik(false);
    };
  }, [uygun, sahte, rn, istemci, no]);

  // Masadaki yayınları dinle (kendim hariç); düşenleri bırak.
  const yayin = ses?.yayin;
  useEffect(() => {
    const m = motor.current;
    if (!m || !yayin) return;
    const istenen = yayin.filter((y) => y.hesap !== ben);
    const dusen = [...m.cekilen.keys()].filter((iz) => !istenen.some((y) => y.iz === iz));
    if (dusen.length) void m.birak(dusen);
    if (istenen.length) void m.dinle(istenen).catch(() => undefined);
  }, [yayin, ben, uygun]);

  useEffect(() => { motor.current?.sessiz(sessiz); }, [sessiz, yayin]);

  const kapatYerel = useCallback((sunucu: boolean) => {
    if (konusma.current) { konusma.current = false; gonderRef.current({ t: "konus", acik: false }); }
    setMik(false);
    if (sahte) { if (sunucu) void istemci.ses(no, "kapat", {}); return; }
    void motor.current?.mikKapat(sunucu);
  }, [sahte, istemci, no]);

  // Sunucu yayınımı kapattıysa (kalktım, masa başı sesimi kesti, susturuldum) yerel mikrofon da kapanır.
  // Yayın yanıtı sesDurum'dan önce gelebilir: önce kendimi yayında görmüş olmak gerekir.
  const yayindayim = !!ben && !!ses?.yayin.some((y) => y.hesap === ben);
  const goruldu = useRef(false);
  useEffect(() => {
    if (!mik) { goruldu.current = false; return; }
    if (yayindayim) goruldu.current = true;
    else if (goruldu.current && !bekliyor) kapatYerel(false);
  }, [mik, bekliyor, yayindayim, kapatYerel]);
  useEffect(() => { if (mik && !oturuyor) kapatYerel(false); }, [mik, oturuyor, kapatYerel]);

  // Uygulama arka plana geçince mikrofon kapanır.
  useEffect(() => {
    if (!mik) return;
    const a = AppState.addEventListener("change", (s) => { if (s !== "active") kapatYerel(true); });
    return () => a.remove();
  }, [mik, kapatYerel]);

  // Konuşma göstergesi: kendi ses düzeyim eşiği aşınca "konuşuyor"; yalnız değişince bildirilir.
  useEffect(() => {
    if (!mik) return;
    let son = 0;
    let sahteAdim = 0;
    const z = setInterval(() => {
      void (async () => {
        let acik: boolean;
        if (sahte) acik = (sahteAdim++ % 4) < 2;
        else {
          const lv = await motor.current?.seviye();
          if (lv !== undefined && lv > KONUSMA_ESIGI) son = Date.now();
          acik = Date.now() - son < SUSMA_MS;
        }
        if (acik !== konusma.current) { konusma.current = acik; gonderRef.current({ t: "konus", acik }); }
      })();
    }, sahte ? 1600 : OLCUM_MS);
    return () => clearInterval(z);
  }, [mik, sahte]);

  const mikDegistir = useCallback(() => {
    if (bekliyor || !uygun) return;
    if (mik) { kapatYerel(true); return; }
    setHata(null);
    setBekliyor(true);
    const is = sahte
      ? istemci.ses(no, "yayin", {}).then((r) => { if (!r.ok) throw new SesHatasi(r.hata); })
      : motor.current ? motor.current.mikAc() : Promise.reject(new SesHatasi("ses_kapali"));
    void is.then(() => setMik(true), (e: unknown) => setHata(e instanceof SesHatasi ? e.kod : "ses_hatasi")).finally(() => setBekliyor(false));
  }, [bekliyor, uygun, mik, kapatYerel, sahte, istemci, no]);

  const neden = !ses ? null
    : !ses.acik ? (ses.neden === "masa_sessiz" ? "onl.ses.neden.masa" : "onl.ses.neden.sunucu")
    : !sahte && !rn ? "onl.ses.neden.surum"
    : null;
  return {
    gorunur: !!ses && neden === null,
    neden,
    mik,
    bekliyor,
    hata,
    hataTemizle: () => setHata(null),
    mikDegistir,
    konusuyor: (h) => !!ses?.konusan.includes(h),
    mikAcik: (h) => !!ses?.yayin.some((y) => y.hesap === h),
    kesik: (h) => !!ses?.kapali.includes(h),
    sozIstedi: (h) => !!ses?.soz.some((p) => p.hesap === h),
  };
}
