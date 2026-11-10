// İstenmeyen izinleri kaldırır: ekran-üstü (SYSTEM_ALERT_WINDOW), eski depolama izinleri, kamera.
// Ses çalma için gerekenler (MODIFY_AUDIO_SETTINGS, FOREGROUND_SERVICE*) ve INTERNET/VIBRATE bırakılır.
// RECORD_AUDIO artık kaldırılmaz: çevrimiçi handa sesli sohbet (Faz 16, react-native-webrtc) mikrofon ister;
// izin yalnız oyuncu masada mikrofonu açınca sorulur, ses kaydedilmez. Dosya adı geriye uyum için korunur.
const { withAndroidManifest } = require("@expo/config-plugins");
const STRIP = [
  "android.permission.CAMERA",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];
const bare = STRIP.map((p) => p.replace("android.permission.", ""));

module.exports = function withoutUnneededPermissions(config) {
  if (config.android && Array.isArray(config.android.permissions)) {
    config.android.permissions = config.android.permissions.filter(
      (p) => !STRIP.includes(p) && !bare.includes(p)
    );
  }
  return withAndroidManifest(config, (cfg) => {
    const m = cfg.modResults;
    if (m.manifest && Array.isArray(m.manifest["uses-permission"])) {
      m.manifest["uses-permission"] = m.manifest["uses-permission"].filter(
        (p) => !(p && p.$ && STRIP.includes(p.$["android:name"]))
      );
    }
    return cfg;
  });
};
