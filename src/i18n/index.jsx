import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STRINGS } from "@/i18n/strings";

/**
 * App language: English, Urdu or Punjabi (Shahmukhi, written in Urdu letters).
 *
 * - The farmer picks it on first open (LanguageGate) and can change it in Settings.
 * - It is saved on the device ("kisan-ui-lang"), so it applies before sign-in too.
 * - Urdu and Punjabi switch the page to right-to-left with an Urdu-script font.
 *
 * Usage: const { t, lang } = useT(); t("Dashboard"); t("{n} acres", { n: 12 }).
 * Keys are the English text; translations live in src/i18n/strings.js. A missing
 * translation shows the English text, so nothing ever renders blank.
 */
export const UI_LANGS = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "ur", label: "Urdu", native: "اردو", dir: "rtl" },
  { code: "pa", label: "Punjabi", native: "پنجابی", dir: "rtl" },
];
const KEY = "kisan-ui-lang";

export function storedLang() {
  try {
    const v = localStorage.getItem(KEY);
    return UI_LANGS.some((l) => l.code === v) ? v : null;
  } catch {
    return null;
  }
}

export function applyLang(code) {
  const l = UI_LANGS.find((x) => x.code === code) || UI_LANGS[0];
  const el = document.documentElement;
  el.lang = l.code === "en" ? "en" : l.code === "ur" ? "ur" : "pnb";
  el.dir = l.dir;
  el.classList.toggle("lang-rtl", l.dir === "rtl");
}

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)) : s);

export function translate(lang, key, vars) {
  const row = STRINGS[key];
  // Dev only: collect texts with no translation, to list with `[...__i18nMiss]` in the console.
  if (!row && lang !== "en" && import.meta.env?.DEV && typeof key === "string" && /[a-z]{3}/i.test(key)) (globalThis.__i18nMiss ||= new Set()).add(key);
  const s = lang === "en" || !row ? key : row[lang] || row.ur || key;
  return fill(s, vars);
}

const Ctx = createContext({ lang: "en", chosen: true, t: (k, v) => fill(k, v), setLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => storedLang() || "en");
  const [chosen, setChosen] = useState(() => storedLang() != null);

  useEffect(() => applyLang(lang), [lang]);

  const setLang = useCallback((code) => {
    try {
      localStorage.setItem(KEY, code);
    } catch {
      /* storage blocked: still switch for this visit */
    }
    setLangState(code);
    setChosen(true);
  }, []);

  const value = useMemo(
    () => ({ lang, chosen, setLang, dir: lang === "en" ? "ltr" : "rtl", t: (key, vars) => translate(lang, key, vars) }),
    [lang, chosen, setLang]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
