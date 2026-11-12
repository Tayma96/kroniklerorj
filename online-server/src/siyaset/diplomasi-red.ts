// Giden diplomasi kutusunda (BolgeDO.diplomasiGiden) alıcının kalıcı reddettiği iletinin kaynakta bıraktığı
// bekleyen durumu kapatır. Geçici hata (5xx) yeniden denenir; kalıcı ret (4xx) kuyruğun başında takılıp
// sonraki iletileri engellemesin ve kaynak "bekliyor" durumunda sonsuza dek kalmasın diye burada sonuçlanır.

import { BEYLIKLER } from "../dunya-veri.ts";
import type { BolgeDurumu, DiplomasiGiden } from "./tipler.ts";

export function diplomasiReddedildi(d: BolgeDurumu, ileti: DiplomasiGiden): void {
  const s = d.devlet;
  if (!s) return;
  const hedefAd = BEYLIKLER.find((x) => x.id === ileti.hedef)?.ad ?? ileti.hedef;
  switch (ileti.tur) {
    case "taninmaIstek":
      // Yalnız bu isteğin bekleyen durumu kapanır; eski ya da başka istek kimliğine dokunulmaz.
      if (s.taninma === "talepEdildi" && s.taninmaIstekId === ileti.istekId) {
        s.taninma = "taninmadi";
        s.taninmaSonuc = "ret";
        s.taninmaCevap = { kaynak: ileti.hedef, karar: "ret", ay: d.ay, ad: hedefAd, istekId: ileti.istekId };
        delete s.taninmaTalepAy;
      }
      return;
    case "ittifakIstek":
      if (s.ittifakTalep?.istekId === ileti.istekId) {
        (s.ittifakYanits ??= {})[ileti.hedef] = { karar: "ret", ay: d.ay, ad: hedefAd, istekId: ileti.istekId };
        (s.ittifaklar ??= {})[ileti.hedef] = { durum: "ret", baslangicAy: ileti.ay, sonAy: d.ay, ad: hedefAd, istekId: ileti.istekId };
        delete s.ittifakTalep;
      }
      return;
    case "ittifakYanit": {
      // Kabul ettiğimiz ittifakın kaynak teyidi hiç gelmeyecekse "kabulBekliyor" 12 ay asılı kalmasın.
      const k = s.ittifaklar?.[ileti.hedef];
      if (ileti.karar === "kabul" && k?.istekId === ileti.istekId && k.durum === "kabulBekliyor") {
        k.durum = "suresiDoldu";
        k.sonAy = d.ay;
      }
      return;
    }
    case "ittifakOnay": {
      // Hedef son teyidi reddettiyse bizde "aktif" görünen ittifak tek taraflı kalmasın.
      const k = s.ittifaklar?.[ileti.hedef];
      if (k?.istekId === ileti.istekId && (k.durum === "aktif" || k.durum === "kabulBekliyor")) {
        k.durum = "suresiDoldu";
        k.sonAy = d.ay;
      }
      return;
    }
    case "taninmaYanit":
      // Verdiğimiz yanıt zaten kayıtlı (yanitlandi); karşı taraf kabul etmediyse yapılacak bir şey yok.
      return;
  }
}
