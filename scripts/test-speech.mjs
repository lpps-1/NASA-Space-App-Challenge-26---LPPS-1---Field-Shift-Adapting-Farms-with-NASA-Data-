// Run: node scripts/test-speech.mjs
// Exercises the browser speech queue (src/lib/voice.js) against a simulated
// speechSynthesis, covering the failure modes that used to leave voice replies
// silent: lost `onend` events, voices that load late, devices without an Urdu
// voice, autoplay blocking, and back-to-back replies.
import assert from "node:assert/strict";

const VOICE_SETS = {
  edge: [
    { name: "Microsoft Uzma Online (Natural) - Urdu (Pakistan)", lang: "ur-PK", voiceURI: "uzma", localService: false },
    { name: "Microsoft Aria Online (Natural) - English (United States)", lang: "en-US", voiceURI: "aria", localService: false },
  ],
  chrome: [
    { name: "Google हिन्दी", lang: "hi-IN", voiceURI: "ghi", localService: false },
    { name: "Google US English", lang: "en-US", voiceURI: "gen", localService: false },
  ],
  englishOnly: [{ name: "Microsoft David", lang: "en-US", voiceURI: "david", localService: true }],
};

/** Minimal speechSynthesis. `behaviour` controls how utterances end. */
function installSynth({ voices, behaviour = "normal", lateVoices = false }) {
  const spoken = [];
  const listeners = {};
  let list = lateVoices ? [] : voices;
  let current = null;
  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => list,
    addEventListener: (ev, fn) => ((listeners[ev] ||= []).push(fn)),
    resume() {
      this.paused = false;
    },
    cancel() {
      if (current) {
        const u = current;
        current = null;
        synth.speaking = false;
        setTimeout(() => u.onerror?.({ error: "interrupted" }), 0);
      }
    },
    speak(u) {
      if (!u.text.trim()) return; // the silent unlock utterance
      if (behaviour === "blocked") return setTimeout(() => u.onerror?.({ error: "not-allowed" }), 5);
      current = u;
      synth.speaking = true;
      spoken.push({ text: u.text, voice: u.voice?.name || null, lang: u.lang });
      setTimeout(() => u.onstart?.(), 2);
      if (behaviour === "lost-onend") {
        // Chrome's GC bug: the speech finishes but onend never fires.
        setTimeout(() => {
          if (current === u) {
            current = null;
            synth.speaking = false;
          }
        }, 20);
        return;
      }
      setTimeout(() => {
        if (current !== u) return;
        current = null;
        synth.speaking = false;
        u.onend?.();
      }, 20);
    },
  };
  globalThis.window = {
    speechSynthesis: synth,
    SpeechSynthesisUtterance: class {
      constructor(text) {
        this.text = text;
      }
    },
  };
  globalThis.SpeechSynthesisUtterance = globalThis.window.SpeechSynthesisUtterance;
  if (lateVoices) {
    setTimeout(() => {
      list = voices;
      (listeners.voiceschanged || []).forEach((fn) => fn());
    }, 30); // well inside voicesReady()'s wait (2 s, scaled to 50 ms here)
  }
  return spoken;
}

// Speed up the watchdog timers so the "lost onend" case doesn't take 12 s.
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, ms > 1000 ? ms / 40 : ms, ...a);

async function fresh() {
  // Re-import voice.js for each scenario so its voice cache starts empty.
  return import(`../src/lib/voice.js?x=${Math.random()}`);
}

function runReply(voice, chunks, { lang, prepare, onMissingVoice } = {}) {
  return new Promise((resolve) => {
    let started = false;
    const speaker = voice.createSpeaker({
      onStart: () => (started = true),
      onEnd: (result) => resolve({ ...result, started }),
      onMissingVoice,
      prepare,
      getOptions: () => ({ rate: 1 }),
    });
    for (const c of chunks) speaker.enqueue(c, { lang });
    speaker.close();
  });
}

let failures = 0;
async function scenario(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failures++;
    console.log(`✗ ${name}\n   ${err.message}`);
  }
}

const GREETING = "وعلیکم السلام! جی بتائیں، میں آپ کی کھیتی باڑی میں کیا مدد کر سکتا ہوں؟";

await scenario("Urdu greeting is spoken by the native Urdu voice (Edge)", async () => {
  const spoken = installSynth({ voices: VOICE_SETS.edge });
  const v = await fresh();
  const r = await runReply(v, [GREETING], { lang: "ur" });
  // Short sentences are joined into one utterance (no long pause after every full stop).
  assert.equal(r.spoken, 1, `expected 1 joined utterance, got ${r.spoken}`);
  assert.ok(spoken.every((s) => s.voice.includes("Urdu")), "Urdu reply used a non-Urdu voice");
  assert.ok(spoken.every((s) => s.lang === "ur-PK"));
});

await scenario("Voices that load late are waited for (no English fallback)", async () => {
  const spoken = installSynth({ voices: VOICE_SETS.edge, lateVoices: true });
  const v = await fresh();
  const r = await runReply(v, ["وعلیکم السلام"], { lang: "ur" });
  assert.equal(r.spoken, 1);
  assert.match(spoken[0].voice, /Urdu/);
});

await scenario("Hindi-only device: Urdu is never read by the Hindi voice", async () => {
  const spoken = installSynth({ voices: VOICE_SETS.chrome });
  const v = await fresh();
  const r = await runReply(v, [GREETING], { lang: "ur", prepare: async () => "जी", onMissingVoice: () => {} });
  assert.equal(spoken.length, 0, `Hindi voice spoke: ${spoken.map((x) => x.text).join(" | ")}`);
  assert.equal(r.missing, "ur");
  assert.equal(v.urduCapableVoices().length, 0, "Hindi voice offered in Settings");
});

await scenario("No Urdu or Hindi voice: Urdu is NOT read by the English voice, and the UI is told", async () => {
  const spoken = installSynth({ voices: VOICE_SETS.englishOnly });
  const v = await fresh();
  const missing = [];
  const r = await runReply(v, [GREETING], { lang: "ur", onMissingVoice: (l, m) => missing.push(m) });
  assert.equal(spoken.length, 0, "Urdu was handed to an English voice");
  assert.equal(r.missing, "ur");
  assert.deepEqual(missing, ["none"]);
});

await scenario("English reply uses an English voice", async () => {
  const spoken = installSynth({ voices: VOICE_SETS.edge });
  const v = await fresh();
  const r = await runReply(v, ["Irrigate wheat 20–25 days after sowing. Then every 3 weeks."], { lang: "en" });
  assert.equal(r.spoken, 1); // both short sentences in one utterance
  assert.match(spoken[0].text, /Then every 3 weeks/);
  assert.ok(spoken.every((s) => s.voice.includes("English")));
  assert.match(spoken[0].text, /20 to 25/);
});

await scenario("Latin words inside an Urdu reply stay with the Urdu voice", async () => {
  const spoken = installSynth({ voices: VOICE_SETS.edge });
  const v = await fresh();
  await runReply(v, ["ایک بوری DAP فی ایکڑ ڈالیں۔\nDAP 50 kg"], { lang: "ur" });
  assert.ok(spoken.every((s) => s.voice.includes("Urdu")), JSON.stringify(spoken));
});

await scenario("A lost onend (Chrome GC bug) does not freeze later replies", async () => {
  const spoken = installSynth({ voices: VOICE_SETS.edge, behaviour: "lost-onend" });
  const v = await fresh();
  const r1 = await runReply(v, ["پہلا جواب۔"], { lang: "ur" });
  const r2 = await runReply(v, ["دوسرا جواب۔"], { lang: "ur" });
  assert.equal(r1.spoken + r2.spoken, 2);
  assert.equal(spoken.length, 2);
});

await scenario("Autoplay block is reported, not swallowed", async () => {
  installSynth({ voices: VOICE_SETS.edge, behaviour: "blocked" });
  const v = await fresh();
  let blocked = false;
  const r = await new Promise((resolve) => {
    const s = v.createSpeaker({ onBlocked: () => (blocked = true), onEnd: resolve });
    s.enqueue("وعلیکم السلام", { lang: "ur" });
    s.close();
  });
  assert.ok(blocked && r.blocked);
});

await scenario("Interrupting: stop() then a new reply — no overlap, no duplicates", async () => {
  const spoken = installSynth({ voices: VOICE_SETS.edge });
  const v = await fresh();
  const ends = [];
  const s = v.createSpeaker({ onEnd: (r) => ends.push(r) });
  s.enqueue("پہلا جملہ۔ دوسرا جملہ۔ تیسرا جملہ۔", { lang: "ur" });
  s.close();
  await new Promise((r) => realSetTimeout(r, 10));
  s.stop();
  s.enqueue("نیا جواب۔", { lang: "ur" });
  s.close();
  await new Promise((r) => realSetTimeout(r, 400));
  assert.equal(ends.length, 2);
  assert.ok(ends[0].stopped);
  assert.equal(ends[1].spoken, 1);
  const texts = spoken.map((x) => x.text);
  assert.equal(new Set(texts).size, texts.length, "a sentence was spoken twice");
  assert.ok(!texts.includes("دوسرا جملہ۔"), "old reply kept talking after stop()");
});

// ---- One voice per reply (online Pakistani Urdu voice vs the device's Hindi voice).
class FakeAudio {
  play() {
    setTimeout(() => this.onended?.(), 5);
    return Promise.resolve();
  }
  pause() {}
}
function cloudReply(v, chunks, synthesize) {
  return new Promise((resolve) => {
    const errors = [];
    const s = v.createSpeaker({
      onEnd: (r) => resolve({ ...r, errors }),
      onCloudError: (reason) => errors.push(reason),
      onMissingVoice: () => {},
      synthesize,
      prepare: async () => "जी बिल्कुल",
      getOptions: () => ({ rate: 1, cloudVoice: true }),
    });
    for (const c of chunks) s.enqueue(c, { lang: "ur" });
    s.close();
  });
}
const LONG = [
  "جی بالکل! میں اردو اور پنجابی اچھی طرح سمجھتا ہوں اور بول سکتا ہوں۔",
  "آپ اپنے کھیت، فصل، پانی یا مویشیوں کے بارے میں کوئی بھی سوال پوچھ سکتے ہیں۔ ".repeat(4),
  "آپ کی کون سی فصل ہے یا آپ کو کس چیز میں مدد چاہیے؟",
];

await scenario("Online voice fails partway: the reply stops, it never switches to the Hindi voice", async () => {
  const spoken = installSynth({ voices: VOICE_SETS.chrome });
  globalThis.Audio = FakeAudio;
  const v = await fresh();
  let calls = 0;
  const synthesize = async () => {
    calls++;
    if (calls === 1) return new Blob(["x"], { type: "audio/wav" });
    throw Object.assign(new Error("quota"), { status: 429 });
  };
  const r = await cloudReply(v, LONG, synthesize);
  assert.equal(spoken.length, 0, `Hindi voice spoke: ${spoken.map((x) => x.text).join(" | ")}`);
  assert.ok(r.cut, "reply should be marked as cut");
  assert.deepEqual(r.errors, ["quota-partial"]);
});

await scenario("Online voice fails at the start on a Hindi-only device: text only, no Hindi voice", async () => {
  const spoken = installSynth({ voices: VOICE_SETS.chrome });
  globalThis.Audio = FakeAudio;
  const v = await fresh();
  let calls = 0;
  const synthesize = async () => {
    calls++;
    throw Object.assign(new Error("down"), { status: 503 });
  };
  const r = await cloudReply(v, LONG, synthesize);
  assert.equal(spoken.length, 0, "Hindi voice spoke");
  assert.ok(r.errors.length >= 1, "page was not told why the answer is text");
  assert.ok(calls <= 2, `online voice retried on later chunks (${calls} calls)`);
});

await scenario("Five consecutive voice turns all speak", async () => {
  const spoken = installSynth({ voices: VOICE_SETS.edge });
  const v = await fresh();
  const s = v.createSpeaker({});
  let total = 0;
  for (let i = 0; i < 5; i++) {
    const r = await new Promise((resolve) => {
      const sp = v.createSpeaker({ onEnd: resolve });
      sp.enqueue(`جواب نمبر ${i + 1}۔`, { lang: "ur" });
      sp.close();
    });
    total += r.spoken;
  }
  s.stop();
  assert.equal(total, 5);
  assert.equal(spoken.length, 5);
});

await scenario("A 3-minute voice note is split at pauses into parts under a minute, nothing dropped", async () => {
  installSynth({ voices: VOICE_SETS.edge });
  const v = await fresh();
  const rate = 16000;
  const len = rate * 180;
  const samples = new Float32Array(len);
  // "Speech" everywhere except a short pause every 10 s.
  for (let i = 0; i < len; i++) samples[i] = (i / rate) % 10 < 9.5 ? Math.sin(i / 7) * 0.3 : 0;
  const bounds = v.chunkBounds(len, samples, { rate, chunkSec: 55 });
  assert.ok(bounds.length >= 4, `expected at least 4 parts, got ${bounds.length}`);
  assert.equal(bounds[0][0], 0);
  assert.equal(bounds[bounds.length - 1][1], len);
  for (let i = 0; i < bounds.length; i++) {
    const [a, b] = bounds[i];
    assert.ok(b - a <= rate * 55, "part longer than the limit");
    if (i) assert.equal(a, bounds[i - 1][1], "gap between parts");
    if (i < bounds.length - 1) assert.equal(samples[b], 0, "cut inside speech instead of a pause");
  }
  assert.deepEqual(v.chunkBounds(rate * 30, null, { rate }), [[0, rate * 30]]);
});

if (failures) {
  console.log(`\n${failures} speech scenario(s) failed`);
  process.exit(1);
}
console.log("\nAll speech scenarios passed");
process.exit(0);
