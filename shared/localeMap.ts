//NOTE: Don't modify the structure of this file without updating the locale:check script.

//Statically requiring languages because of the builders
import lang_de from "@locale/de.json";
import lang_en from "@locale/en.json";

export type LocaleType = typeof lang_en;
export type LocaleMapType = {
    [key: string]: LocaleType;
}

const localeMap: LocaleMapType = {
    de: lang_de,
    en: lang_en,
};

export default localeMap;
