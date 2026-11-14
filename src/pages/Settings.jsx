import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import { inputClass } from "@/components/FormField";
import { kisan } from "@/api/kisanClient";
import { useIsDemo, useProfile, useSettings, useUpdateSettings } from "@/hooks/useKisanData";
import { Link } from "react-router-dom";
import { Languages, Palette, Ruler, UserRound, Volume2 } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { usePageZoom, ZOOM_STEPS } from "@/hooks/usePageZoom";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { onVoicesChanged, speakSample, ttsSupported, unlockSpeech, urduCapableVoices, urduVoicePlan } from "@/lib/voice";
import { useEffect, useState } from "react";
import { UI_LANGS, useT } from "@/i18n";

const URDU_SAMPLE = "وعلیکم السلام! جی بتائیں، میں آپ کی کھیتی باڑی میں کیا مدد کر سکتا ہوں؟ گندم کی بوائی کے لیے 10 سے 25 نومبر کا وقت بہترین ہے۔";
const ENGLISH_SAMPLE = "Wa alaikum assalam! I am Kisan AI. Irrigate wheat about 20 to 25 days after sowing.";

function useVoiceList() {
  const [, setTick] = useState(0);
  useEffect(() => onVoicesChanged(() => setTick((t) => t + 1)), []);
  return ttsSupported() ? urduCapableVoices() : [];
}

function VoiceSettings({ s, set }) {
  const { t } = useT();
  const list = useVoiceList();
  const plan = ttsSupported() ? urduVoicePlan(s.tts_voice) : { mode: "none", voice: null };
  const rate = s.speech_rate || 1;
  const test = (text, lang) => {
    unlockSpeech();
    speakSample(text, {
      lang,
      prepare: (t, target) => kisan.services.speechText(t, target),
      synthesize: (t) => kisan.services.speechAudio(t),
      getOptions: () => ({ voiceURI: s.tts_voice, rate }),
      onBlocked: () => toast.error(t("The browser blocked speech. Tap the button again.")),
      onCloudError: () => toast.warning(t("Urdu voice isn't available right now"), { description: t("The online Urdu voice didn't answer. Try again in a minute.") }),
      onEnd: (r) => {
        if (r.missing && !r.spoken) toast.warning(t("No voice on this device can pronounce Urdu"), { description: t("An English voice is never used for Urdu. Use Microsoft Edge, or install Urdu voice data on Android.") });
        else if (r.failed && !r.spoken) toast.error(t("The speech engine failed to play. Try another voice."));
      },
    });
  };
  return (
    <>
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("Urdu reply voice")}</p>
          <p className="text-xs text-muted-foreground">
            {plan.mode === "native" && t("Using {name}, a native Urdu voice.", { name: plan.voice.name })}
            {plan.mode !== "native" && !s.tts_voice && t("Kisan AI speaks Urdu with an online Pakistani Urdu voice. It never switches to a Hindi voice.")}
            {plan.mode === "hindi" && s.tts_voice &&
              t("Using {name}: a Hindi voice reading the Urdu words. Choose \"Automatic\" for the online Pakistani Urdu voice.", { name: plan.voice.name })}
          </p>
        </div>
        <select
          className={cn(inputClass, "w-full sm:w-56")}
          value={s.tts_voice || ""}
          onChange={(e) => set("tts_voice")(e.target.value)}
          aria-label={t("Urdu reply voice")}
          disabled={!list.length}
        >
          <option value="">{t("Automatic (Pakistani Urdu voice)")}</option>
          {list.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-sm font-medium">{t("Speaking speed")}</p>
          <p className="text-xs text-muted-foreground">{t("Slower speech is easier to follow outdoors.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={cn(inputClass, "w-32")}
            value={String(rate)}
            onChange={(e) => set("speech_rate")(Number(e.target.value))}
            aria-label={t("Speaking speed")}
          >
            <option value="0.8">{t("Slow")}</option>
            <option value="0.9">{t("A little slow")}</option>
            <option value="1">{t("Normal")}</option>
            <option value="1.15">{t("Fast")}</option>
          </select>
          <button type="button" onClick={() => test(URDU_SAMPLE, "ur")} disabled={!ttsSupported()} className="kisan-btn-ghost px-3 py-2 focus-ring">
            {t("Test Urdu")}
          </button>
          <button type="button" onClick={() => test(ENGLISH_SAMPLE, "en")} disabled={!ttsSupported()} className="kisan-btn-ghost px-3 py-2 focus-ring">
            {t("Test English")}
          </button>
        </div>
      </div>
    </>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 overflow-hidden rounded-full border transition-colors focus-ring", checked ? "border-primary bg-primary" : "border-border bg-muted")}
      >
        <span aria-hidden="true" dir="ltr" className={cn("absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

function Section({ id, icon: Icon, title, hint, children }) {
  return (
    <section id={id} className="kisan-card scroll-mt-6 px-4 py-2 sm:px-6">
      <div className="flex items-center gap-3 pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        <div>
          <h2 className="font-display text-lg leading-tight">{title}</h2>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="mt-2 divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, description, children }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="inline-flex shrink-0 rounded-xl border p-0.5 [border-color:var(--card-line)]" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          data-testid={o.testid}
          className={cn("rounded-[10px] px-3.5 py-1.5 text-sm transition-colors focus-ring", value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const SECTIONS = [
  { id: "language", label: "Language", icon: Languages },
  { id: "voice", label: "Voice assistant", icon: Volume2 },
  { id: "units", label: "Units and region", icon: Ruler },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "account", label: "Account and data", icon: UserRound },
];

export default function Settings() {
  const { t, lang, setLang } = useT();
  const { data: s } = useSettings();
  const { data: profile } = useProfile();
  const update = useUpdateSettings();
  const { theme, setTheme } = useTheme();
  const { zoom, setZoom } = usePageZoom();
  const { user, logout } = useAuth();
  const demo = useIsDemo();
  const qc = useQueryClient();
  if (!s) return <div className="kisan-card h-96 animate-pulse" />;
  const set = (k) => (v) => update.mutate({ [k]: v });
  const ownPrices = Object.values(s.input_prices || {}).filter((v) => Number(v) > 0).length;

  return (
    <div>
      <PageHeader eyebrow={t("Settings")} title={t("Preferences")} description={t("Changes save as you make them.")} />
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="hidden lg:block" aria-label={t("Settings")}>
          <ul className="sticky top-6 space-y-1">
            {SECTIONS.map((x) => (
              <li key={x.id}>
                <a href={`#${x.id}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring">
                  <x.icon className="h-4 w-4" aria-hidden="true" /> {t(x.label)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-3xl space-y-5">
          <Section id="language" icon={Languages} title={t("Language")} hint={t("The language you chose stays the same on every page.")}>
            <Row label={t("App language")} description={t("The whole app, and Kisan AI's replies, switch to this language.")}>
              <Segmented label={t("App language")} value={lang} onChange={setLang} options={UI_LANGS.map((l) => ({ value: l.code, label: l.native, testid: `settings-lang-${l.code}` }))} />
            </Row>
          </Section>

          <Section id="voice" icon={Volume2} title={t("Voice assistant")} hint={t("How Kisan AI speaks and listens.")}>
            <Toggle
              label={t("Speak replies out loud")}
              description={s.voice_replies ? t("On: Kisan AI reads every answer to you. The same switch is at the top of the chat.") : t("Off: Kisan AI stays silent and only shows text. You can still tap Listen on any answer.")}
              checked={s.voice_replies}
              onChange={set("voice_replies")}
            />
            {s.voice_replies && <VoiceSettings s={s} set={set} />}
            <Row label={t("Voice input language")} description={t("Language the microphone listens for. Automatic recognises Urdu, Punjabi and English, and Kisan AI replies in the language you spoke.")}>
              <select className={cn(inputClass, "w-full sm:w-56")} value={s.voice_language === "pa-IN" ? "pa-PK" : s.voice_language || "auto"} onChange={(e) => set("voice_language")(e.target.value)} aria-label={t("Voice input language")}>
                <option value="auto">{t("Automatic (detect)")}</option>
                <option value="ur-PK">{t("Urdu")}</option>
                <option value="pa-PK">{t("Punjabi")}</option>
                <option value="en-PK">{t("English")}</option>
              </select>
            </Row>
            <Row label={t("When to stop listening")} description={t("Patient waits through short pauses while you think. \"Until I tap stop\" listens to a whole voice note, however long, until you tap the microphone.")}>
              <select className={cn(inputClass, "w-full sm:w-56")} value={s.listen_mode || "patient"} onChange={(e) => set("listen_mode")(e.target.value)} aria-label={t("When to stop listening")}>
                <option value="auto">{t("Quick (short pause)")}</option>
                <option value="patient">{t("Patient (longer pause)")}</option>
                <option value="manual">{t("Until I tap stop")}</option>
              </select>
            </Row>
            <Toggle
              label={t("Interrupt by speaking")}
              description={t("In conversation mode, start talking while Kisan AI is speaking and it stops to listen to you. Works best with headphones.")}
              checked={s.barge_in !== false}
              onChange={set("barge_in")}
            />
          </Section>

          <Section id="units" icon={Ruler} title={t("Units and region")} hint={t("How numbers are shown.")}>
            <Row label={t("Temperature")} description={t("Used on the dashboard weather card.")}>
              <Segmented label={t("Temperature")} value={s.temp_unit === "f" ? "f" : "c"} onChange={set("temp_unit")} options={[{ value: "c", label: "°C" }, { value: "f", label: "°F" }]} />
            </Row>
            <Row label={t("Country")} description={t("Sets the crops, seasons, soil survey and schemes the app uses.")}>
              <Link to="/profile" className="kisan-btn-ghost px-3 py-1.5 text-sm focus-ring">{profile?.country === "US" ? t("United States") : t("Pakistan")} · {t("Change")}</Link>
            </Row>
            <Row label={t("Your fertilizer prices")} description={ownPrices ? t("{n} of your own prices are saved and used in the calculators.", { n: ownPrices }) : t("The calculators use average dealer prices until you enter your own in Tools.")}>
              {ownPrices > 0 ? (
                <button onClick={() => { set("input_prices")({}); toast.success(t("Back to average prices")); }} className="kisan-btn-ghost px-3 py-1.5 text-sm focus-ring">{t("Use average prices")}</button>
              ) : (
                <Link to="/tools" className="kisan-btn-ghost px-3 py-1.5 text-sm focus-ring">{t("Open Tools")}</Link>
              )}
            </Row>
            <Toggle label={t("Rain and weather predictions")} description={t("Chance of rain, frost and heat for your district on the dashboard.")} checked={s.weather_alerts} onChange={set("weather_alerts")} />
          </Section>

          <Section id="appearance" icon={Palette} title={t("Appearance")}>
            <Row label={t("Theme")} description={t("Dark is easier on the eyes at night; light is clearer in bright sun.")}>
              <Segmented label={t("Theme")} value={theme} onChange={setTheme} options={[{ value: "dark", label: t("Dark") }, { value: "light", label: t("Light") }]} />
            </Row>
            <Row label={t("Page size")} description={t("How big the whole app looks. 90% is the default.")}>
              <Segmented label={t("Page size")} value={zoom} onChange={setZoom} options={ZOOM_STEPS.map((v) => ({ value: v, label: `${v}%`, testid: `zoom-${v}` }))} />
            </Row>
          </Section>

          <Section id="account" icon={UserRound} title={t("Account and data")} hint={user?.email}>
            <Row label={t("Where your data lives")} description={t("Your farm, fields, jobs and chats are saved in this browser, not on a server.")}>
              <Link to="/privacy" className="kisan-btn-ghost px-3 py-1.5 text-sm focus-ring">{t("Privacy Policy")}</Link>
            </Row>
            <Row
              label={demo ? t("Reset demo data") : t("Clear my data")}
              description={demo ? t("Puts the sample fields, jobs and chats back.") : t("Removes your fields, jobs, chats and settings from this browser. Your name is kept, and farm setup starts again.")}
            >
              <button
                onClick={() => {
                  if (!demo && !window.confirm(t("Clear your fields, jobs, chats and settings from this browser?"))) return;
                  kisan.reset();
                  qc.invalidateQueries();
                  toast.success(demo ? t("Demo data reset. Your name and email were kept.") : t("Your data was cleared."));
                }}
                className="shrink-0 rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary focus-ring"
              >
                {demo ? t("Reset demo data") : t("Clear my data")}
              </button>
            </Row>
            <Row label={t("Sign out")} description={t("Your data stays in this browser for next time.")}>
              <button onClick={logout} className="shrink-0 rounded-xl border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 focus-ring">
                {t("Sign out")}
              </button>
            </Row>
          </Section>
        </div>
      </div>
    </div>
  );
}
