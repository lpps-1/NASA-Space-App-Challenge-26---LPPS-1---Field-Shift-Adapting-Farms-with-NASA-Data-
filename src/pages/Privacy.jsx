import LegalPage from "@/components/LegalPage";

/**
 * Privacy Policy, describing what Kisan AI actually does. Review it whenever data
 * handling changes (e.g. a server database or online accounts are added).
 */
const UPDATED = "14 November 2026";
const a = "font-medium text-primary underline underline-offset-2 dark:text-harvest";
const list = "list-disc space-y-2.5 ps-5 marker:text-muted-foreground";

const SECTIONS = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <p>
        Kisan AI is built and run by Team LPPS-1, a student team in Lahore, Pakistan. It is run by its members, not by a company. Kisan AI
        started as our entry for the NASA Space Apps Challenge 2026.
      </p>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <p>You don't need to give us anything to look around: the demo farm works without an account.</p>
        <ul className={list}>
          <li>
            <strong>Your farm details.</strong> Your name, language, location, land size, water sources, soil, crops and acres, goals, fields,
            tasks and chats. These are saved <em>in your browser on your own device</em>, not on our servers. Clearing your browser data, or
            Settings → Account and data → Clear my data, deletes them.
          </li>
          <li>
            <strong>Your account.</strong> Your email, name and a scrambled (hashed) password are stored in your browser on this device. We
            don't run an account server.
          </li>
          <li>
            <strong>Your questions.</strong> When you ask Kisan AI something, your question, the recent messages in that chat and your farm
            details are sent to Google Gemini so it can write the answer. We don't keep a copy.
          </li>
          <li>
            <strong>Your voice.</strong> When you speak, the recording is sent to Google Gemini to turn it into text, and replies may be turned
            into Urdu speech by Gemini. Spoken replies are off until you turn them on. We don't store recordings.
          </li>
          <li>
            <strong>Your location.</strong> Your farm's position is used to get the weather, air quality, NASA data and maps for your area.
            "Use my location" uses your device's location only to find the nearest district; we don't store it anywhere else.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "no-tracking",
    title: "No tracking or ads",
    body: (
      <p>Kisan AI uses no analytics, no advertising and no tracking cookies. We don't sell or share your information for marketing.</p>
    ),
  },
  {
    id: "service-providers",
    title: "Hosting and service providers",
    body: (
      <>
        <p>A few services do part of the work. Each one can see your IP address while doing it:</p>
        <ul className={list}>
          <li>
            <strong>Vercel</strong> hosts the website and runs our server functions (the chat, voice, climate and terrain requests). Vercel
            keeps short-lived request logs for running the service.
          </li>
          <li>
            <strong>Google</strong> runs Gemini, which answers questions, turns voice into text and makes Urdu speech. On some Gemini plans
            Google may use what is sent to improve its products, so please don't type personal details such as ID or bank numbers into the
            chat.
          </li>
          <li><strong>NASA</strong> (POWER and GIBS) receives your farm's coordinates or map area to send climate data and satellite maps.</li>
          <li><strong>OpenTopoData</strong> receives your farm's coordinates to send NASA SRTM elevation.</li>
          <li><strong>Open-Meteo</strong> receives your farm's coordinates to send the forecast and air quality.</li>
          <li><strong>CARTO and OpenStreetMap</strong> send the background map tiles.</li>
          <li><strong>USDA</strong> (Soil Data Access) receives the coordinates of US farms to send soil survey data.</li>
        </ul>
      </>
    ),
  },
  {
    id: "your-choices",
    title: "Your choices",
    body: (
      <ul className={list}>
        <li>Change your farm details at any time under My farm, or delete them with Settings → Account and data, or by clearing your browser data.</li>
        <li>
          Ask us what we hold about you, ask for a correction, or ask us to delete anything, by emailing{" "}
          <a className={a} href="mailto:team.lpps1@gmail.com">team.lpps1@gmail.com</a>. No form is needed.
        </li>
      </ul>
    ),
  },
  {
    id: "advice",
    title: "Advice, not a guarantee",
    body: (
      <p>
        Kisan AI gives general farming guidance. Always check pesticide and fertilizer doses on the product label and with your local
        agriculture extension office, and see a vet for sick animals.
      </p>
    ),
  },
  {
    id: "younger-visitors",
    title: "Younger visitors",
    body: <p>If you are under 18, please ask a parent or teacher before creating an account or sending us information.</p>,
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: <p>When this policy changes, we update this page and the date at the top.</p>,
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <div className="rounded-2xl border bg-card p-5 [border-color:var(--card-line)]">
        <p className="font-medium text-foreground">Team LPPS-1</p>
        <p className="text-muted-foreground">Lahore, Pakistan</p>
        <p className="mt-3">Email: <a className={a} href="mailto:team.lpps1@gmail.com">team.lpps1@gmail.com</a></p>
        <p>WhatsApp: <a className={a} href="https://wa.me/923376554652" target="_blank" rel="noreferrer">+92 337 6554652</a></p>
      </div>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated={UPDATED}
      summary="What Kisan AI collects, why, who else can see it, and how you can see, change or delete it. Short and plain on purpose."
      sections={SECTIONS}
      related={[
        ["Terms of Use", "/terms"],
        ["Advice disclaimer", "/terms#advice"],
        ["Data sources", "/knowledge"],
      ]}
    />
  );
}
