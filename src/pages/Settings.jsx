import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { inputClass } from "@/components/FormField";
import { kisan } from "@/api/kisanClient";
import { useIsDemo, useProfile, useSettings, useUpdateProfile, useUpdateSettings } from "@/hooks/useKisanData";
import { Link } from "react-router-dom";
import { Languages, Palette, Ruler, UserRound, Volume2, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { closeSettings, setSettingsSection, useSettingsDialog } from "@/lib/settingsDialog";
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
      getOptions: () => ({ voiceURI: s.tts_voice, rate, cloudVoice: s.cloud_urdu_voice === true }),
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
            {plan.mode !== "native" && !s.tts_voice && (s.cloud_urdu_voice
              ? t("Kisan AI speaks Urdu with the online Gemini voice, and with this device's voice when that isn't available.")
              : plan.mode === "hindi"
                ? t("This device has no Urdu voice, so a Hindi voice reads the Urdu words. Microsoft Edge has natural Pakistani Urdu voices built in.")
                : t("This device has no Urdu or Hindi voice. Use Microsoft Edge, or switch on the online Urdu voice below."))}
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
          <option value="">{t("Automatic (best voice on this device)")}</option>
          {list.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>
      <Toggle
        label={t("Online Urdu voice (Gemini)")}
        description={t("A more natural Pakistani Urdu voice on computers without one. The free Gemini plan allows only a few answers a day, and every clip is checked before it plays, so answers start a few seconds later.")}
        checked={s.cloud_urdu_voice === true}
        onChange={set("cloud_urdu_voice")}
      />
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

function Section({ id, title, hint, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-base font-semibold">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-2 divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, description, children }) {
  return (
    <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 justify-start sm:justify-end [&_a]:whitespace-nowrap [&_button]:whitespace-nowrap">{children}</div>
    </div>
  );
}

/** A text field that saves when you leave it (Enter also saves). */
function AccountInput({ value, onSave, label, ...rest }) {
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);
  return (
    <input
      className={cn(inputClass, "w-full sm:w-64")}
      value={v}
      aria-label={label}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() !== String(value || "") && onSave(v.trim().replace(/\s+/g, " "))}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      {...rest}
    />
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
  { id: "general", label: "Language", icon: Languages },
  { id: "voice", label: "Voice assistant", icon: Volume2 },
  { id: "units", label: "Unit & Region", icon: Ruler },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "account", label: "Account & Data", icon: UserRound },
];

export default function SettingsDialog() {
  const { open, section } = useSettingsDialog();
  const [closing, setClosing] = useState(false);
  const { t, lang, setLang } = useT();
  const { data: s } = useSettings();
  const { data: profile } = useProfile();
  const update = useUpdateSettings();
  const saveProfile = useUpdateProfile();
  const { theme, setTheme } = useTheme();
  const { zoom, setZoom } = usePageZoom();
  const { user, logout } = useAuth();
  const demo = useIsDemo();
  const qc = useQueryClient();

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      closeSettings();
      setClosing(false);
    }, 150);
  };
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);
  if (!open) return null;
  const set = (k) => (v) => update.mutate({ [k]: v });
  const ownPrices = Object.values(s?.input_prices || {}).filter((v) => Number(v) > 0).length;
  const active = SECTIONS.some((x) => x.id === section) ? section : "general";

  const content = !s ? (
    <div className="h-64 animate-pulse rounded-xl bg-secondary" />
  ) : active === "general" ? (
      <Section id="general" icon={Languages} title={t("Language")} hint={t("The language you chose stays the same on every page.")}>
        <Row label={t("App language")} description={t("The whole app, and Kisan AI's replies, switch to this language.")}>
          <Segmented label={t("App language")} value={lang} onChange={setLang} options={UI_LANGS.map((l) => ({ value: l.code, label: l.native, testid: `settings-lang-${l.code}` }))} />
        </Row>
      </Section>
  ) : active === "voice" ? (
      <Section id="voice" icon={Volume2} title={t("Voice assistant")} hint={t("How Kisan AI speaks and listens.")}>
        <Toggle
          label={t("Speak replies out loud")}
          description={s.voice_replies ? t("On: Kisan AI reads every answer to you. The same switch is under the message box in the chat.") : t("Off: Kisan AI stays silent and only shows text. You can still tap Listen on any answer.")}
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
  ) : active === "units" ? (
      <Section id="units" icon={Ruler} title={t("Unit & Region")} hint={t("How numbers are shown.")}>
        <Row label={t("Temperature")} description={t("Used on the dashboard weather card.")}>
          <Segmented label={t("Temperature")} value={s.temp_unit === "f" ? "f" : "c"} onChange={set("temp_unit")} options={[{ value: "c", label: "°C" }, { value: "f", label: "°F" }]} />
        </Row>
        <Row label={t("Harvest weight")} description={t("Automatic shows maunds in Urdu and Punjabi, kilograms in English (pounds for US farms).")}>
          <Segmented label={t("Harvest weight")} value={s.yield_unit || "auto"} onChange={set("yield_unit")} options={[{ value: "auto", label: t("Auto") }, { value: "maund", label: t("Maund") }, { value: "kg", label: "kg" }, { value: "lb", label: "lb" }]} />
        </Row>
        <Row label={t("Country")} description={t("Sets the crops, seasons, soil survey and schemes the app uses.")}>
          <Link to="/profile" onClick={closeSettings} className="inline-flex items-center rounded-xl border px-4 py-2 text-sm hover:bg-secondary focus-ring [border-color:var(--card-line)]">{profile?.country === "US" ? t("United States") : t("Pakistan")} · {t("Change")}</Link>
        </Row>
        <Row label={t("Your fertilizer prices")} description={ownPrices ? t("{n} of your own prices are saved and used in the calculators.", { n: ownPrices }) : t("The calculators use average dealer prices until you enter your own in Tools.")}>
          {ownPrices > 0 ? (
            <button onClick={() => { set("input_prices")({}); toast.success(t("Back to average prices")); }} className="inline-flex items-center rounded-xl border px-4 py-2 text-sm hover:bg-secondary focus-ring [border-color:var(--card-line)]">{t("Use average prices")}</button>
          ) : (
            <Link to="/tools" onClick={closeSettings} className="inline-flex items-center rounded-xl border px-4 py-2 text-sm hover:bg-secondary focus-ring [border-color:var(--card-line)]">{t("Open Tools")}</Link>
          )}
        </Row>
        <Toggle label={t("Rain and weather predictions")} description={t("Chance of rain, frost and heat for your district on the dashboard.")} checked={s.weather_alerts} onChange={set("weather_alerts")} />
      </Section>
  ) : active === "appearance" ? (
      <Section id="appearance" icon={Palette} title={t("Appearance")}>
        <Row label={t("Theme")} description={t("Dark is easier on the eyes at night; light is clearer in bright sun.")}>
          <Segmented label={t("Theme")} value={theme} onChange={setTheme} options={[{ value: "dark", label: t("Dark") }, { value: "light", label: t("Light") }]} />
        </Row>
        <Row label={t("Page size")} description={t("How big the whole app looks. 90% is the default.")}>
          <Segmented label={t("Page size")} value={zoom} onChange={setZoom} options={ZOOM_STEPS.map((v) => ({ value: v, label: `${v}%`, testid: `zoom-${v}` }))} />
        </Row>
      </Section>
  ) : (
      <Section id="account" icon={UserRound} title={t("Account & Data")} hint={user?.email}>
        <Row label={t("Display name")} description={t("Shown on your dashboard and used by Kisan AI.")}>
                <AccountInput label={t("Display name")} value={profile?.display_name} maxLength={60} dir="auto" data-testid="settings-name" onSave={(v) => v && saveProfile.mutate({ display_name: v }, { onSuccess: () => toast.success(t("Saved")) })} />
              </Row>
              <Row label={t("Email (sign-in)")} description={t("Your account identifier. Changing your name never changes it.")}>
                <p className="w-full truncate rounded-xl bg-secondary/60 px-3 py-2 text-sm text-muted-foreground sm:w-64" dir="ltr">{user?.email || profile?.email}</p>
              </Row>
              <Row label={t("Phone")} description={t("Optional. Only kept in this browser.")}>
                <AccountInput label={t("Phone")} value={profile?.phone} inputMode="tel" maxLength={20} dir="ltr" onSave={(v) => saveProfile.mutate({ phone: v }, { onSuccess: () => toast.success(t("Saved")) })} />
              </Row>
              <Row label={t("Where your data lives")} description={t("Your farm, fields, jobs and chats are saved in this browser, not on a server.")}>
          <Link to="/privacy" onClick={closeSettings} className="inline-flex items-center rounded-xl border px-4 py-2 text-sm hover:bg-secondary focus-ring [border-color:var(--card-line)]">{t("Privacy Policy")}</Link>
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
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="settings-title" data-testid="settings-dialog">
      <div className="kisan-overlay absolute inset-0 bg-black/50" data-closing={closing || undefined} onClick={close} />
      <div
        className="kisan-dialog relative flex h-[min(640px,92vh)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border bg-card text-card-foreground shadow-2xl sm:rounded-2xl [border-color:var(--card-line)]"
        data-closing={closing || undefined}
      >
        <div className="flex items-center justify-between border-b px-5 py-3.5 [border-color:var(--card-line)]">
          <h2 id="settings-title" className="text-lg font-semibold">{t("Settings")}</h2>
          <button onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-ring" aria-label={t("Close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav className="shrink-0 overflow-x-auto border-b p-2 sm:w-52 sm:border-b-0 sm:border-e [border-color:var(--card-line)]" aria-label={t("Settings")}>
            <ul className="flex gap-1 sm:flex-col">
              {SECTIONS.map((x) => (
                <li key={x.id}>
                  <button
                    onClick={() => setSettingsSection(x.id)}
                    aria-current={active === x.id ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-start text-sm transition-colors focus-ring",
                      active === x.id ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                    data-testid={`settings-tab-${x.id}`}
                  >
                    <x.icon className="h-4 w-4" aria-hidden="true" /> {t(x.label)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" key={active}>
            <div className="rise-in">{content}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
