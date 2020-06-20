const i18n = require("i18n"),
  path = require("path");

i18n.configure({
  locales: [
    "en_US",
    "ar_AR",
    "es_ES",
    "ru_RU",
    "fr_FR",
    "pt_BR",
    "de_DE",
    "it_IT",
    "ja_JP",
    "ko_KR",
    "zh_CN"
  ],
  defaultLocale: "en_US",
  directory: path.join(__dirname, "Transaltions"),
  objectNotation: true,
  api: {
    __: "translate",
    __n: "translateN"
  }
});

module.exports = i18n;