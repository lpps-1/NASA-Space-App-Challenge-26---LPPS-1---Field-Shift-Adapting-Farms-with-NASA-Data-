import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import * as LangMenu from "@radix-ui/react-dropdown-menu";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  ArrowRight,
  AudioLines,
  Check,
  ChevronDown,
  ClipboardList,
  PanelRight,
  CloudSun,
  Satellite,
  Languages,
  Loader2,
  Mic,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { kisan } from "@/api/kisanClient";
import { SUGGESTED_PROMPTS_BY_LANG } from "@/data/fixtures";
import {
  useConversations,
  useEntityMutations,
  useFields,
  useKnowledge,
  useClimate,
  useNasa,
  useProfile,
  useSettings,
  useSoilSurvey,
  useSatellite,
  useSlopeGrid,
  useTerrain,
  useUpdateSettings,
} from "@/hooks/useKisanData";
import { buildSiteData } from "@/lib/siteData";
import {
  createSpeaker,
  micErrorMessage,
  micSupport,
  speakableText,
  speechCapabilities,
  onVoicesChanged,
  startRecording,
  takeSentences,
  toWavParts,
  ttsSupported,
  unlockSpeech,
} from "@/lib/voice";
import { cn } from "@/lib/utils";
import { detectLanguage } from "@/lib/language";
import BrandMark from "@/components/BrandMark";
import { greetingName } from "@/lib/profile";
import PlansPanel from "@/components/chat/PlansPanel";
import { setActiveConversation } from "@/lib/chatBus";
import { useT } from "@/i18n";

// Right-to-left when the text is mostly Urdu/Punjabi script (an English reply with one Urdu word stays LTR).
const isRtl = (text) => !!text && detectLanguage(text).script === "arabic";
const MAX_UPLOAD = 3.9 * 1024 * 1024;

/**
 * How long a pause ends the farmer's turn. "manual" never cuts them off: the
 * microphone keeps listening until they tap it, however long the voice note.
 */
const LISTEN_MODES = {
  auto: { endSilenceMs: 1800, label: "Quick" },
  patient: { endSilenceMs: 3200, label: "Patient" },
  manual: { endSilenceMs: 0, label: "Until I tap stop" },
};

/** Language the microphone listens for. "auto" lets speech recognition detect it. */
const VOICE_LANGS = [
  { value: "auto", label: "Auto", native: "خودکار" },
  { value: "ur-PK", label: "Urdu", native: "اردو" },
  { value: "pa-PK", label: "Punjabi", native: "پنجابی" },
  { value: "en-PK", label: "English", native: "English" },
];
const langName = (v) => VOICE_LANGS.find((l) => l.value === v || (v?.startsWith("pa") && l.value === "pa-PK"))?.label;

const mdComponents = {
  table: (props) => (
    <div className="kisan-table">
      <table {...props} />
    </div>
  ),
};

function TypingDots() {
  return (
    <span className="typing-dots inline-flex items-center gap-1 text-primary" aria-label="Kisan AI is typing">
      <span />
      <span />
      <span />
    </span>
  );
}

function Message({ msg, speaking, saved, onSpeak, onStopSpeaking, onRetry, onContinue, onSavePlan }) {
  const { t } = useT();
  const mine = msg.role === "user";
  const rtl = isRtl(msg.content);
  return (
    <div className={cn("flex", mine ? "justify-end" : "items-start gap-3")} data-role={msg.role}>
      {!mine && <BrandMark className="mt-1 h-7 w-7 shrink-0" />}
      <div className={cn("flex min-w-0 flex-col", mine ? "max-w-[85%] items-end" : "flex-1 items-start")}>
        <div
          dir={rtl ? "rtl" : "ltr"}
          className={cn(
            "text-[15px] leading-7",
            mine ? "rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-foreground" : "w-full rounded-lg py-0.5 text-foreground",
            !mine && speaking && "-mx-3 bg-accent/10 px-3",
            rtl && "urdu text-[16px]"
          )}
          data-testid={mine ? "user-message" : "assistant-message"}
        >
          {mine && msg.voice && (
            <span className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground" dir="ltr">
              <Mic className="h-3 w-3" aria-hidden="true" /> {t("Spoken")}
            </span>
          )}
          {msg.content && (
            <div className="prose-kisan">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {msg.content}
              </ReactMarkdown>
            </div>
          )}
          {msg.streaming && !msg.content && (
            <span className="mt-0.5 flex h-7 items-center gap-2 text-muted-foreground" dir="ltr">
              {msg.status === "weather" ? (
                <span className="soft-pulse inline-flex items-center gap-1.5">
                  <CloudSun className="h-4 w-4" /> {t("Checking live weather…")}
                </span>
              ) : msg.status === "farm" ? (
                <span className="soft-pulse inline-flex items-center gap-1.5">
                  <Satellite className="h-4 w-4" /> {t("Reading your farm's NASA data…")}
                </span>
              ) : (
                <TypingDots />
              )}
            </span>
          )}
          {msg.streaming && msg.content && msg.status === "weather" && (
            <span className="soft-pulse mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground" dir="ltr">
              <CloudSun className="h-3.5 w-3.5" /> {t("Checking live weather…")}
            </span>
          )}
          {msg.error && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-alert" dir="ltr">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{msg.error}</span>
              <button onClick={onRetry} className="kisan-btn-ghost px-2 py-1 text-xs text-foreground focus-ring">
                <RotateCcw className="h-3 w-3" /> {t("Try again")}
              </button>
            </div>
          )}
        </div>
        {!mine && !msg.streaming && msg.content && (
          <div className="mt-1 flex flex-wrap items-center gap-1 -ms-2" dir="ltr">
            {ttsSupported() &&
              (speaking ? (
                <button
                  onClick={onStopSpeaking}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-alert hover:bg-alert/10 focus-ring"
                >
                  <Square className="h-3 w-3 fill-current" /> {t("Stop speaking")}
                </button>
              ) : (
                <button
                  onClick={onSpeak}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-ring"
                  data-testid="replay"
                >
                  <RotateCcw className="h-3 w-3" /> {t("Replay")}
                </button>
              ))}
            {msg.truncated && (
              <button onClick={onContinue} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 focus-ring">
                {t("Continue answer")}
              </button>
            )}
            <button
              onClick={onSavePlan}
              disabled={saved}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:text-primary focus-ring"
              data-testid="save-plan"
            >
              <ClipboardList className="h-3 w-3" /> {saved ? t("Saved to plans") : t("Save as plan")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LevelBars({ level }) {
  return (
    <span className="flex h-5 items-end gap-[3px]" aria-hidden="true">
      {[0.5, 0.8, 1, 0.8, 0.5].map((k, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-accent transition-[height] duration-75"
          style={{ height: `${Math.max(15, Math.min(100, level * k * 160))}%` }}
        />
      ))}
    </span>
  );
}

function useSpeechCaps(voiceURI) {
  const [, setTick] = useState(0);
  useEffect(() => onVoicesChanged(() => setTick((t) => t + 1)), []);
  return speechCapabilities(voiceURI);
}

export default function Assistant() {
  const { t, lang: uiLang } = useT();
  const tRef = useRef(t);
  tRef.current = t;
  tRef.uiLang = uiLang;
  const qc = useQueryClient();
  const [plansOpen, setPlansOpen] = useState(false);
  // Wide screens: the plans panel can be hidden, like a closable side panel. Remembered on this device.
  const [plansCollapsed, setPlansCollapsed] = useState(() => {
    try {
      return localStorage.getItem("kisan-plans-collapsed") !== "0"; // closed unless the farmer opened it
    } catch {
      return true;
    }
  });
  const togglePlansCollapsed = () =>
    setPlansCollapsed((c) => {
      try {
        localStorage.setItem("kisan-plans-collapsed", c ? "0" : "1");
      } catch {
        /* storage blocked */
      }
      return !c;
    });
  const [savedPlans, setSavedPlans] = useState({}); // message index → saved (this conversation)
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: profile } = useProfile();
  const { data: fields } = useFields();
  const { data: knowledge } = useKnowledge();
  const { data: conversations } = useConversations();
  const convoMutations = useEntityMutations("Conversation", "conversations");
  const [params, setParams] = useSearchParams();

  const [messages, setMessages] = useState([]);
  const [convoId, setConvoId] = useState(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  // idle | recording | transcribing | thinking | speaking
  const [phase, setPhase] = useState("idle");
  const [level, setLevel] = useState(0);
  const [voiceError, setVoiceError] = useState(null);
  // { kind: "missing" | "blocked", lang, idx }
  const [voiceNotice, setVoiceNotice] = useState(null);
  const [speakingIdx, setSpeakingIdx] = useState(null);

  const newConversationRef = useRef(null);
  const endRef = useRef(null);
  const recRef = useRef(null);
  const abortRef = useRef(null);
  const messagesRef = useRef(messages);
  const convoIdRef = useRef(convoId);
  const handsFreeRef = useRef(handsFree);
  const voiceOnRef = useRef(voiceOn);
  const voiceTurnRef = useRef(false);
  const startListeningRef = useRef(null);
  const startBargeInRef = useRef(null);
  const finishRef = useRef(null);
  const sendRef = useRef(null);
  const speakingIdxRef = useRef(null);
  const voiceLangRef = useRef("auto");
  const listenRef = useRef({ mode: "patient", bargeIn: true });
  const bargeRef = useRef(null); // mic monitor while Kisan AI speaks (interrupt by talking)
  messagesRef.current = messages;
  convoIdRef.current = convoId;
  handsFreeRef.current = handsFree;
  voiceOnRef.current = voiceOn;
  speakingIdxRef.current = speakingIdx;

  const voiceLang = settings?.voice_language || "auto";
  tRef.voiceLang = voiceLang;
  voiceLangRef.current = voiceLang;
  const listenMode = LISTEN_MODES[settings?.listen_mode] ? settings.listen_mode : "patient";
  listenRef.current = { mode: listenMode, bargeIn: settings?.barge_in !== false };
  const ttsOptionsRef = useRef({});
  ttsOptionsRef.current = { voiceURI: settings?.tts_voice || "", rate: settings?.speech_rate || 1, cloudVoice: settings?.online_urdu_voice !== false };
  const caps = useSpeechCaps(settings?.tts_voice || "");

  const speaker = useMemo(
    () =>
      createSpeaker({
        onStart: () => {
          setPhase((p) => (p === "recording" || p === "transcribing" ? p : "speaking"));
          if (voiceTurnRef.current && handsFreeRef.current) startBargeInRef.current?.();
        },
        onEnd: (result) => {
          // The farmer interrupted by speaking: that monitor is now the live recording.
          if (bargeRef.current?.taken) {
            bargeRef.current = null;
            setSpeakingIdx(null);
            voiceTurnRef.current = false;
            return;
          }
          if (bargeRef.current) {
            bargeRef.current.dead = true;
            bargeRef.current.handle?.cancel();
            bargeRef.current = null;
          }
          const idx = speakingIdxRef.current;
          setSpeakingIdx(null);
          setPhase((p) => (p === "speaking" || p === "thinking" ? "idle" : p));
          if (result.blocked) {
            // The browser refused to play without a tap: offer a one-tap replay.
            voiceTurnRef.current = false;
            setVoiceNotice({ kind: "blocked", idx });
            return;
          }
          if (result.missing && !result.spoken) setVoiceNotice({ kind: "missing", lang: result.missing, idx });
          if (voiceTurnRef.current && handsFreeRef.current && !result.stopped) {
            voiceTurnRef.current = false;
            setTimeout(() => startListeningRef.current?.(), 350);
          }
          voiceTurnRef.current = false;
        },
        onBlocked: () => {},
        prepare: (text, target) => kisan.services.speechText(text, target),
        synthesize: (text) => kisan.services.speechAudio(text),
        onCloudError: (reason) => {
          if (reason === "partial" || reason === "quota-partial") {
            toast.info(tRef.current("The rest of this answer is shown as text"), {
              description:
                reason === "quota-partial"
                  ? tRef.current("Today's free Urdu voice limit ran out partway through. Kisan AI stopped instead of switching to a Hindi-accented voice.")
                  : tRef.current("The Urdu voice stopped answering partway through. Kisan AI stopped instead of switching to a Hindi-accented voice."),
            });
            return;
          }
          const why =
            reason === "quota"
              ? tRef.current("today's free voice limit is used up")
              : reason === "key"
                ? tRef.current("the AI key on the site is missing or wrong")
                : tRef.current("the voice service didn't answer");
          toast.error(tRef.current("Urdu voice isn't available right now"), {
            description: tRef.current("The answer is shown as text because {why}.", { why }),
          });
        },
        getOptions: () => ttsOptionsRef.current,
        onMissingVoice: () => {}, // a Hindi voice is never used; without an Urdu voice the answer stays as text
      }),
    []
  );

  useEffect(() => {
    if (settings) setVoiceOn(settings.voice_replies);
  }, [settings]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);
  useEffect(
    () => () => {
      recRef.current?.cancel();
      abortRef.current?.abort();
      speaker.stop();
    },
    [speaker]
  );

  // The farm figures the website shows, for the get_farm_data tool (read only when a question needs them).
  const { data: climate } = useClimate();
  const { data: nasa } = useNasa();
  const { data: terrain } = useTerrain();
  const { data: usda } = useSoilSurvey();
  const { data: sat } = useSatellite();
  const { data: slopeGrid } = useSlopeGrid();
  const siteData = useMemo(() => buildSiteData({ profile, climate, nasa, terrain, usda, sat, slopeGrid }), [profile, climate, nasa, terrain, usda, sat, slopeGrid]);

  const context = useMemo(() => {
    // Identity fields (email, account id) never go to the AI; the display name does.
    const { email: _e, user_id: _u, ...rest } = profile || {};
    return {
      profile: profile ? rest : null,
      fields: fields || [],
      knowledge: (knowledge || []).filter((k) => k.status === "published"),
      siteData,
    };
  }, [profile, fields, knowledge, siteData]);

  const saveConversation = useCallback(
    async (msgs) => {
      const clean = msgs.filter((m) => m.content && !m.error).map(({ role, content, voice }) => ({ role, content, voice }));
      if (!clean.length) return;
      const firstUser = clean.find((m) => m.role === "user")?.content || "Conversation";
      const title = firstUser.length > 60 ? firstUser.slice(0, 57) + "…" : firstUser;
      try {
        if (convoIdRef.current) {
          await convoMutations.update.mutateAsync({ id: convoIdRef.current, messages: clean, updated: Date.now() });
        } else {
          const row = await convoMutations.create.mutateAsync({ title, messages: clean, updated: Date.now() });
          convoIdRef.current = row.id;
          setConvoId(row.id);
        }
      } catch {
        /* saving history is best-effort */
      }
    },
    [convoMutations.create, convoMutations.update]
  );

  /** Sends a user turn, streams the reply onto the screen and speaks it sentence by sentence. */
  const send = useCallback(
    async (text, { fromVoice = false, history } = {}) => {
      const content = (text ?? "").trim();
      if (!content) return;
      voiceTurnRef.current = false;
      abortRef.current?.abort();
      speaker.stop();
      setVoiceNotice(null);

      const base = (history ?? messagesRef.current)
        .filter((m) => !m.streaming || m.content)
        .map((m) => (m.streaming ? { ...m, streaming: false, status: null } : m));
      const userMsg = { role: "user", content, voice: fromVoice };
      const convo = [...base, userMsg];
      const apiMessages = convo.filter((m) => m.content && !m.error).map(({ role, content }) => ({ role, content }));
      const idx = convo.length;
      setMessages([...convo, { role: "assistant", content: "", streaming: true }]);
      setInput("");
      setBusy(true);
      setPhase("thinking");
      voiceTurnRef.current = fromVoice;

      // Read the latest toggle (not a stale closure) so a voice turn is never left silent.
      const speakIt = voiceOnRef.current && ttsSupported();
      // The reply language from /api/assistant, so every sentence of an Urdu reply
      // goes to an Urdu-capable voice (an English voice is never used for Urdu).
      let replyLang = detectLanguage(content).code;
      let pending = "";
      let enqueued = false;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const patch = (p) => setMessages((ms) => ms.map((m, i) => (i === idx ? { ...m, ...p } : m)));
      const speak = (t) => {
        if (!t.trim()) return;
        if (!enqueued) {
          enqueued = true;
          setSpeakingIdx(idx);
        }
        speaker.enqueue(t, { lang: replyLang });
      };

      try {
        const reply = await kisan.services.askAssistant({
          messages: apiMessages,
          ...context,
          voice: fromVoice,
          // Punjabi picked as the app language or as the language the farmer speaks: reply in Punjabi.
          appLang: String(tRef.voiceLang).startsWith("pa") ? "pa" : tRef.uiLang,
          signal: ctrl.signal,
          onLanguage: (code) => {
            if (code) replyLang = code;
          },
          onStatus: (status) => patch({ status }),
          onText: (delta, full) => {
            patch({ content: full, status: null });
            if (speakIt) {
              const [sentences, rest] = takeSentences(pending + delta);
              pending = rest;
              if (sentences.length) speak(sentences.join(" "));
            }
          },
        });
        // Speak whatever is left, e.g. a one-line reply with no final punctuation ("وعلیکم السلام").
        if (speakIt) {
          speak(pending);
          pending = "";
          speaker.close();
        }
        const final = { role: "assistant", content: reply.content, truncated: reply.stop === "max_tokens", lang: replyLang };
        const next = [...convo, final];
        setMessages(next);
        saveConversation(next);
        if (!speakIt || !enqueued || !speakableText(reply.content)) {
          setPhase("idle");
          if (fromVoice && handsFreeRef.current) setTimeout(() => startListeningRef.current?.(), 350);
          voiceTurnRef.current = false;
        }
      } catch (err) {
        if (ctrl.signal.aborted) {
          // Interrupted by the user: keep whatever had arrived. (If a newer request replaced
          // this one, that request already rebuilt the message list.)
          if (abortRef.current === ctrl) {
            const kept = messagesRef.current
              .map((m, i) => (i === idx ? { ...m, streaming: false, status: null } : m))
              .filter((m) => m.content || m.role === "user");
            setMessages(kept);
            saveConversation(kept);
          }
        } else {
          speaker.stop();
          patch({ streaming: false, content: err.partial || "", error: err.message || "Something went wrong." });
          setPhase("idle");
        }
      } finally {
        if (abortRef.current === ctrl) {
          abortRef.current = null;
          setBusy(false);
        }
      }
    },
    [context, saveConversation, speaker]
  );
  sendRef.current = send;

  const retry = (assistantIdx) => {
    const userIdx = assistantIdx - 1;
    const user = messagesRef.current[userIdx];
    if (!user) return;
    send(user.content, { fromVoice: false, history: messagesRef.current.slice(0, userIdx) });
  };

  const continueAnswer = (assistantIdx) => {
    const prev = messagesRef.current[assistantIdx]?.content || "";
    const code = detectLanguage(prev).code;
    send(
      code === "ur" || code === "pa"
        ? "براہ کرم جواب وہیں سے جاری رکھیں۔"
        : code === "ur-Latn" || code === "pa-Latn"
          ? "Meherbani karke jawab wahin se jari rakhein."
          : "Please continue from where you stopped."
    );
  };

  /* --------------------------- voice --------------------------- */

  const cancelBargeIn = useCallback(() => {
    const b = bargeRef.current;
    bargeRef.current = null;
    if (!b) return;
    b.dead = true;
    if (!b.taken) b.handle?.cancel();
  }, []);

  const stopEverything = useCallback(() => {
    cancelBargeIn();
    recRef.current?.cancel();
    recRef.current = null;
    voiceTurnRef.current = false;
    abortRef.current?.abort();
    speaker.stop();
    setSpeakingIdx(null);
    setLevel(0);
    setPhase("idle");
  }, [speaker, cancelBargeIn]);

  const finishRecording = useCallback(async () => {
    const handle = recRef.current;
    if (!handle) return;
    recRef.current = null;
    setPhase("transcribing");
    try {
      const { blob, heardSpeech, durationMs, speechStartMs } = await handle.stop();
      if (!heardSpeech || durationMs < 500 || blob.size < 1000) {
        setPhase("idle");
        setVoiceError("I didn't hear anything. Tap the microphone and speak a little louder.");
        setHandsFree(false);
        return;
      }
      // A long voice note is cut at pauses into parts of under a minute and transcribed in full.
      const parts = await toWavParts(blob, { trimStartMs: speechStartMs || 0 });
      if (parts.some((p) => p.size > MAX_UPLOAD)) throw new Error("That recording could not be prepared for upload. Please try again.");
      const lang = voiceLangRef.current === "auto" ? "" : voiceLangRef.current;
      const results = await Promise.all(
        parts.map((p) =>
          kisan.services.transcribe(p, lang).catch((err) => {
            if (parts.length === 1) throw err;
            return { text: "" };
          })
        )
      );
      const text = results
        .map((r) => (r.text || "").trim())
        .filter(Boolean)
        .join(" ");
      if (!text) {
        setPhase("idle");
        setVoiceError("I couldn't make out any words. Please try again.");
        return;
      }
      sendRef.current(text, { fromVoice: true });
    } catch (err) {
      setPhase("idle");
      setVoiceError(err.message || "Speech recognition failed. Please try again.");
    }
  }, []);
  finishRef.current = finishRecording;

  const startListening = useCallback(async () => {
    if (recRef.current) return;
    cancelBargeIn();
    // Interrupt: stop the answer that is streaming or being spoken.
    voiceTurnRef.current = false;
    abortRef.current?.abort();
    speaker.stop();
    setSpeakingIdx(null);
    setVoiceError(null);
    setVoiceNotice(null);
    unlockSpeech(); // inside the tap, so the spoken reply is allowed to play later
    const support = micSupport();
    if (!support.ok) {
      setVoiceError(micErrorMessage(support.reason));
      setHandsFree(false);
      return;
    }
    setPhase("recording");
    try {
      recRef.current = await startRecording({
        onLevel: setLevel,
        endSilenceMs: LISTEN_MODES[listenRef.current.mode].endSilenceMs,
        // Hands-free mode waits longer for the farmer to start; a tap means they're ready.
        noSpeechMs: handsFreeRef.current ? 15000 : 10000,
        onSilence: () => finishRef.current?.(),
        onNoSpeech: () => {
          recRef.current?.cancel();
          recRef.current = null;
          setPhase("idle");
          setLevel(0);
          setHandsFree(false);
          setVoiceError("I didn't hear anything. Tap the microphone when you're ready to speak.");
        },
      });
    } catch (err) {
      recRef.current = null;
      setPhase("idle");
      setHandsFree(false);
      setVoiceError(micErrorMessage(err));
    }
  }, [speaker, cancelBargeIn]);
  startListeningRef.current = startListening;

  /**
   * Conversation mode: while Kisan AI speaks, the microphone keeps listening.
   * When the farmer starts talking, speech stops at once and the same recording
   * becomes their next turn (like interrupting a person), so no words are lost.
   */
  const startBargeIn = useCallback(async () => {
    if (!listenRef.current.bargeIn || bargeRef.current || recRef.current || !micSupport().ok) return;
    const entry = { handle: null, taken: false, dead: false };
    bargeRef.current = entry;
    try {
      const handle = await startRecording({
        bargeIn: true,
        endSilenceMs: LISTEN_MODES[listenRef.current.mode].endSilenceMs || 0,
        onLevel: (l) => entry.taken && setLevel(l),
        onSpeechStart: () => {
          if (entry.dead || bargeRef.current !== entry) return;
          entry.taken = true;
          recRef.current = handle;
          abortRef.current?.abort();
          speaker.stop();
          setSpeakingIdx(null);
          setVoiceNotice(null);
          setPhase("recording");
        },
        onSilence: () => entry.taken && recRef.current === handle && finishRef.current?.(),
      });
      entry.handle = handle;
      if (entry.dead || bargeRef.current !== entry) handle.cancel();
    } catch {
      if (bargeRef.current === entry) bargeRef.current = null;
    }
  }, [speaker]);
  startBargeInRef.current = startBargeIn;

  const onMic = () => {
    if (phase === "recording") finishRef.current?.();
    else if (phase === "transcribing") return;
    else startListening();
  };

  const toggleHandsFree = () => {
    if (handsFree) {
      setHandsFree(false);
      stopEverything();
    } else {
      setHandsFree(true);
      handsFreeRef.current = true;
      if (phase === "idle") startListening();
    }
  };

  const speakMessage = (i) => {
    const msg = messagesRef.current[i];
    if (!msg?.content) return;
    unlockSpeech();
    voiceTurnRef.current = false;
    speaker.stop();
    setVoiceNotice(null);
    setSpeakingIdx(i);
    speaker.enqueue(msg.content, { lang: msg.lang || detectLanguage(msg.content).code });
    speaker.close();
  };

  const stopSpeaking = () => {
    cancelBargeIn();
    voiceTurnRef.current = false;
    speaker.stop();
    setSpeakingIdx(null);
  };

  const newConversation = () => {
    stopEverything();
    setHandsFree(false);
    setMessages([]);
    setConvoId(null);
    setSavedPlans({});
    setVoiceError(null);
    setVoiceNotice(null);
  };

  const openConversation = useCallback(
    (c) => {
      stopEverything();
      setHandsFree(false);
      setMessages(c.messages || []);
      setConvoId(c.id);
      setVoiceError(null);
      setVoiceNotice(null);
    },
    [stopEverything]
  );

  /** Keeps an answer in the Plans panel, titled with the question that led to it. */
  const savePlan = async (i) => {
    const answer = messages[i];
    if (!answer?.content) return;
    const question = [...messages.slice(0, i)].reverse().find((m) => m.role === "user")?.content || t("Plan");
    const title = question.replace(/\s+/g, " ").trim().slice(0, 70) + (question.length > 70 ? "…" : "");
    await kisan.entities.Plan.create({ title, content: answer.content, created: new Date().toISOString(), convoId });
    qc.invalidateQueries({ queryKey: ["plans"] });
    setSavedPlans((s2) => ({ ...s2, [i]: true }));
    toast.success(t("Saved to plans"));
  };

  newConversationRef.current = newConversation;

  const setVoiceLanguage = (value) => updateSettings.mutate({ voice_language: value });

  // Deep links from the dashboard: ?q=<question>, ?voice=1 (start listening), ?c=<conversation id>.
  // The sidebar's history and "New chat" use the same links (?c=, ?new=), so they are handled every time, not once.
  const handledParams = useRef("");
  useEffect(() => {
    if (!settings || !profile) return;
    const key = params.toString();
    if (!key) {
      handledParams.current = "";
      return;
    }
    if (handledParams.current === key) return;
    const q = params.get("q");
    const c = params.get("c");
    const v = params.get("voice");
    const fresh = params.get("new");
    if (!q && !c && !v && !fresh) return;
    if (c && !conversations) return;
    handledParams.current = key;
    setParams({}, { replace: true });
    if (c) {
      const found = conversations.find((x) => x.id === c);
      if (found) openConversation(found);
    } else if (q) {
      newConversationRef.current?.();
      convoIdRef.current = null;
      send(q, { history: [] });
    } else if (fresh) newConversationRef.current?.();
    else if (v) startListening();
  }, [params, setParams, settings, profile, conversations, openConversation, send, startListening]);

  // Tell the sidebar which conversation is open.
  useEffect(() => {
    setActiveConversation(convoId);
    return () => setActiveConversation(null);
  }, [convoId]);

  const live = phase !== "idle" || busy;

  // Nothing to scroll on an empty chat: keep the page still.
  const empty = messages.length === 0;
  useEffect(() => {
    if (!empty) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [empty]);

  const heard = langName(voiceLang);
  const statusLine = {
    recording:
      listenMode === "manual"
        ? t("Listening{lang}… take your time. Tap the microphone when you've finished.", { lang: voiceLang !== "auto" && heard ? ` (${t(heard)})` : "" })
        : t("Listening{lang}… speak naturally, I'll answer when you stop.", { lang: voiceLang !== "auto" && heard ? ` (${t(heard)})` : "" }),
    transcribing: t("Recognising your speech…"),
    speaking:
      handsFree && listenRef.current.bargeIn
        ? t("Speaking… just start talking to interrupt.")
        : t("Speaking… tap the microphone to interrupt and ask again."),
  }[phase];

  const urduVoiceLabel = !caps.supported
    ? t("Speech not supported in this browser")
    : caps.urdu.mode === "native"
      ? `${t("Urdu voice")}: ${caps.urdu.voice.name.replace(/^Microsoft |^Google /, "").replace(/ - .*$/, "")}`
      : t("Urdu voice: online Pakistani Urdu");
  const suggestions = SUGGESTED_PROMPTS_BY_LANG[uiLang] || SUGGESTED_PROMPTS_BY_LANG.en;
  const planCount = qc.getQueryData(["plans"])?.length || 0;

  return (
    <div className={cn("grid gap-5", !plansCollapsed && "xl:grid-cols-[minmax(0,1fr)_300px]")}>
      <section
        className={cn(
          "flex min-w-0 flex-col",
          messages.length === 0 ? "h-[calc(100dvh-4.5rem)] overflow-hidden lg:h-[calc(100dvh-2rem)]" : "min-h-[calc(100dvh-4.5rem)] lg:min-h-[calc(100dvh-2rem)]"
        )}
      >
        {/* Sleek top: no title or description, just a button to show or hide the plans panel. */}
        <div className="flex justify-end">
          <button
            onClick={() => (window.matchMedia("(min-width: 1280px)").matches ? togglePlansCollapsed() : setPlansOpen(true))}
            className="inline-flex items-center gap-1.5 rounded-lg p-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground focus-ring"
            aria-label={plansCollapsed ? t("Show your plans") : t("Hide your plans")}
            title={plansCollapsed ? t("Show your plans") : t("Hide your plans")}
            data-testid="plans-toggle"
          >
            <PanelRight className="h-4 w-4 rtl:-scale-x-100" />
            {planCount > 0 && <span className="tabular-nums">{planCount}</span>}
          </button>
        </div>

        <div className={cn("mx-auto w-full max-w-4xl flex-1", messages.length === 0 ? "flex flex-col justify-center pb-6" : "space-y-7 py-8")} aria-live="polite">
          {messages.length === 0 && (
            <div className="px-1" data-testid="chat-welcome">
              <h1 className="kisan-greeting font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl" dir="auto">
                {t("Hi, {name}", { name: greetingName(profile) })}
              </h1>
              <p className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight text-muted-foreground/70 sm:text-4xl">
                {t("How can I help on your farm today?")}
              </p>
              <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
                {suggestions.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      unlockSpeech();
                      send(p);
                    }}
                    dir={isRtl(p) ? "rtl" : "ltr"}
                    className={cn(
                      "rounded-2xl border bg-card/60 px-4 py-3 text-start text-sm text-foreground/85 transition-colors hover:bg-secondary hover:text-foreground focus-ring [border-color:hsl(var(--edge))]",
                      isRtl(p) && "urdu text-[14px]"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <Message
              key={i}
              msg={m}
              saved={!!savedPlans[i]}
              onSavePlan={() => savePlan(i)}
              speaking={speakingIdx === i && phase === "speaking"}
              onSpeak={() => speakMessage(i)}
              onStopSpeaking={stopSpeaking}
              onRetry={() => retry(i)}
              onContinue={() => continueAnswer(i)}
            />
          ))}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 mx-auto w-full max-w-4xl bg-background pb-4 pt-2 lg:pb-6">
          {voiceNotice && !voiceError && (
            <div
              role="alert"
              className="mb-2 flex flex-wrap items-center gap-3 rounded-xl border border-accent/50 bg-accent/10 px-3 py-2 text-xs"
              data-testid="voice-notice"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-highlight" aria-hidden="true" />
              {voiceNotice.kind === "blocked" ? (
                <span className="flex-1">{t("The browser blocked automatic speech. Tap play to hear the answer. It will play by itself after that.")}</span>
              ) : (
                <span className="flex-1">{t("This device has no Urdu voice. Open Kisan AI in Microsoft Edge for a natural Urdu voice, or turn on the online Urdu voice in Settings → Voice assistant.")}</span>
              )}
              {voiceNotice.kind === "blocked" && voiceNotice.idx != null && (
                <button onClick={() => speakMessage(voiceNotice.idx)} className="kisan-btn-gold px-3 py-1.5 text-xs focus-ring">
                  <Volume2 className="h-3.5 w-3.5" /> {t("Play answer")}
                </button>
              )}
              <button onClick={() => setVoiceNotice(null)} className="text-muted-foreground hover:text-foreground" aria-label={t("Dismiss")}>
                ✕
              </button>
            </div>
          )}
          {(statusLine || voiceError) && (
            <div
              role="status"
              className={cn(
                "kisan-glass mb-2 flex items-center gap-3 rounded-xl px-3 py-2 text-xs",
                voiceError ? "border-alert/50 text-alert" : "text-muted-foreground"
              )}
              data-testid="voice-status"
              data-phase={phase}
            >
              {voiceError ? (
                <>
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{voiceError}</span>
                  <button
                    onClick={() => {
                      setVoiceError(null);
                      startListening();
                    }}
                    className="kisan-btn-ghost px-2 py-1 text-xs text-foreground focus-ring"
                  >
                    <RotateCcw className="h-3 w-3" /> {t("Try again")}
                  </button>
                </>
              ) : (
                <>
                  {phase === "recording" ? (
                    <LevelBars level={level} />
                  ) : phase === "speaking" ? (
                    <Volume2 className="h-4 w-4 shrink-0 text-highlight soft-pulse" aria-hidden="true" />
                  ) : (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
                  )}
                  <span className="flex-1">{statusLine}</span>
                  {phase === "speaking" ? (
                    <button onClick={stopSpeaking} className="kisan-btn-ghost px-2 py-1 text-xs text-alert focus-ring" data-testid="stop-speaking">
                      <Square className="h-3 w-3 fill-current" /> {t("Stop speaking")}
                    </button>
                  ) : (
                    live && (
                      <button onClick={stopEverything} className="kisan-btn-ghost px-2 py-1 text-xs text-foreground focus-ring">
                        <Square className="h-3 w-3" /> {t("Stop")}
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              unlockSpeech();
              send(input);
            }}
            className="rounded-2xl border bg-card p-2 shadow-sm transition-colors focus-within:border-foreground/25 [border-color:hsl(var(--edge))]"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  unlockSpeech();
                  send(input);
                }
              }}
              rows={1}
              dir="auto"
              placeholder={phase === "recording" ? t("Listening…") : t("Ask Kisan AI about your farm…")}
              className={cn(
                "block max-h-48 min-h-[52px] w-full resize-none bg-transparent px-2 pt-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground/70",
                isRtl(input) && "urdu text-[16px]"
              )}
              aria-label={t("Message")}
              data-testid="composer"
            />
            <div className="mt-1 flex items-center gap-1 px-1">
            {/* Voice controls sit under the message box, like Claude's composer. */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
                {/* Styled menu (the native <select> showed white text on a white list in dark mode). */}
                <LangMenu.Root>
                  <LangMenu.Trigger
                    className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-foreground outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("Language you speak")}
                    data-testid="language-select"
                  >
                    <Languages className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {(() => {
                      const cur = VOICE_LANGS.find((l) => l.value === voiceLang) || VOICE_LANGS.find((l) => voiceLang.startsWith("pa") && l.value === "pa-PK") || VOICE_LANGS[0];
                      return cur.native === cur.label ? cur.label : `${cur.native} · ${cur.label}`;
                    })()}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </LangMenu.Trigger>
                  <LangMenu.Portal>
                    <LangMenu.Content side="top" align="start" sideOffset={6} className="kisan-menu z-50 min-w-[10rem] rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
                      <p className="px-2.5 py-1.5 text-[11px] text-muted-foreground">{t("Language you speak")}</p>
                      {VOICE_LANGS.map((l) => (
                        <LangMenu.Item
                          key={l.value}
                          onSelect={() => setVoiceLanguage(l.value)}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-secondary"
                        >
                          <span className="flex items-baseline gap-2">
                            <span>{l.native}</span>
                            {l.native !== l.label && <span className="text-xs text-muted-foreground">{l.label}</span>}
                          </span>
                          {l.value === voiceLang && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
                        </LangMenu.Item>
                      ))}
                    </LangMenu.Content>
                  </LangMenu.Portal>
                </LangMenu.Root>
                <button
                  onClick={toggleHandsFree}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium focus-ring",
                    handsFree ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  aria-pressed={handsFree}
                  title={t("Conversation mode: Kisan AI listens again after each spoken answer")}
                >
                  <AudioLines className="h-4 w-4" />
                  <span className="hidden sm:inline">{handsFree ? t("Conversation on") : t("Conversation mode")}</span>
                </button>
                <button
                  onClick={() => {
                    const next = !voiceOn;
                    setVoiceOn(next);
                    voiceOnRef.current = next;
                    if (!next) stopSpeaking();
                    else unlockSpeech();
                    updateSettings.mutate({ voice_replies: next });
                  }}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium focus-ring",
                    voiceOn ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  aria-pressed={voiceOn}
                  aria-label={voiceOn ? t("Turn off spoken replies") : t("Turn on spoken replies")}
                  title={`${voiceOn ? t("Spoken replies on") : t("Spoken replies off")} · ${urduVoiceLabel}`}
                  data-testid="speaker-toggle"
                >
                  {voiceOn ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
                  <span className="hidden sm:inline">{t("Speak aloud")}</span>
                </button>
            </div>
            <button
              type="button"
              onClick={onMic}
              disabled={phase === "transcribing"}
              className={cn(
                "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors focus-ring disabled:opacity-60",
                phase === "recording"
                  ? "border-alert bg-alert text-white"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              )}
              aria-label={phase === "recording" ? t("Stop recording and send") : phase === "speaking" ? t("Interrupt and speak") : t("Speak your question")}
              title={phase === "recording" ? t("Stop recording and send") : t("Speak your question")}
              data-testid="mic"
            >
              {phase === "recording" && <span className="mic-ring bg-alert/50" aria-hidden="true" />}
              {phase === "recording" ? (
                <Square className="relative h-4 w-4 fill-current" />
              ) : phase === "transcribing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
            {busy ? (
              <button
                type="button"
                onClick={stopEverything}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/85 focus-ring"
                aria-label={t("Stop answer")}
                title={t("Stop answer")}
                data-testid="stop-answer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                disabled={!input.trim() || busy}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground focus-ring"
                aria-label={t("Send")}
              >
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            )}
            </div>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {t("Kisan AI can make mistakes. Confirm pesticide doses on the label and check with your local agriculture office.")}
          </p>
        </div>
      </section>

      {/* Right: plans and the farm at a glance */}
      {!plansCollapsed && <PlansPanel className="kisan-fade hidden xl:sticky xl:top-4 xl:flex xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto" onClose={togglePlansCollapsed} />}
      {plansOpen && (
        <div className="fixed inset-0 z-40 xl:hidden" role="dialog" aria-modal="true" aria-label={t("Your plans")}>
          <button className="absolute inset-0 bg-black/40" onClick={() => setPlansOpen(false)} aria-label={t("Close")} />
          <div className="absolute inset-y-0 end-0 w-[min(360px,90vw)] overflow-y-auto bg-background p-4 shadow-xl">
            <PlansPanel onClose={() => setPlansOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
