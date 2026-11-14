import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import SiteFooter from "@/components/SiteFooter";

/**
 * Privacy Policy. Follows the structure of the Team LPPS – 1 website's policy
 * (who we are, what we collect, no tracking, who else sees data, your choices,
 * younger visitors, changes, contact), describing what Kisan AI actually does.
 * Review it whenever data handling changes (e.g. a server database is added).
 */
const UPDATED = "12 November 2026";

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-foreground/90">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card [border-color:hsl(var(--edge))]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <span className="font-display text-lg">Kisan AI</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Kisan AI
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {UPDATED}</p>
        <p className="mt-6 text-[15px] leading-7">
          This page explains what Kisan AI collects, why, who else can see it, and how you can see, change or delete it. We
          keep it short and plain on purpose.
        </p>

        <Section title="Who we are">
          <p>
            Kisan AI is built and run by Team LPPS – 1, a student team in Lahore, Pakistan. It is run by its members, not by a
            company. Kisan AI started as our entry for the NASA Space Apps Challenge.
          </p>
        </Section>

        <Section title="What we collect">
          <p>You don't need to give us anything to look around: the demo farm works without an account.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Your farm details.</strong> Your name, language, district, land size, water sources, soil, crops, goals,
              fields, tasks and chats. These are saved <em>in your browser on your own device</em>, not on our servers.
              Clearing your browser data, or Settings → Reset, deletes them.
            </li>
            <li>
              <strong>Your account.</strong> If you sign up, your email, your name and a scrambled (hashed) password are stored by
              Netlify Identity. If you sign in with Google, Google shares your name, email and profile picture with Netlify
              Identity. We never see your Google password.
            </li>
            <li>
              <strong>Your questions.</strong> When you ask Kisan AI something, your question, the recent messages in that chat
              and your farm details are sent to Google Gemini so it can write the answer. We do not keep a copy on a server.
            </li>
            <li>
              <strong>Your voice.</strong> When you speak, the recording is sent to Google Gemini to turn it into text, and replies
              may be turned into Urdu speech by Gemini. We do not store recordings.
            </li>
            <li>
              <strong>Your location.</strong> We use your district's position to get the weather, air quality and NASA data for
              your area. "Use my location" uses your device's location only to find the nearest district; we do not store it.
            </li>
          </ul>
        </Section>

        <Section title="No tracking or ads">
          <p>
            Kisan AI uses no analytics, no advertising and no tracking cookies. We do not sell or share your information for
            marketing.
          </p>
        </Section>

        <Section title="Who else sees data">
          <p>A few services do part of the work. Each one can see your IP address as part of doing it:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Netlify</strong> hosts the site, runs our server functions and stores accounts (Netlify Identity).</li>
            <li>
              <strong>Google</strong> runs Gemini, which answers questions, turns voice into text and makes Urdu speech, and
              handles Google sign-in if you choose it. On Gemini's free tier, Google may use what is sent to improve its
              products, so please don't type personal details such as ID or bank numbers into the chat.
            </li>
            <li><strong>Open-Meteo</strong> receives your district's coordinates to send the forecast and air quality.</li>
            <li><strong>NASA POWER</strong> receives your district's coordinates to send rainfall, temperature, sunlight and soil-moisture data.</li>
          </ul>
        </Section>

        <Section title="Your choices">
          <ul className="list-disc space-y-2 pl-5">
            <li>Change your farm details at any time under My farm, or delete them with Settings → Reset or by clearing your browser data.</li>
            <li>
              Ask us what we hold about you, ask for a correction, or ask us to delete your account, by emailing{" "}
              <a className="text-primary underline underline-offset-2" href="mailto:team.lpps1@gmail.com">team.lpps1@gmail.com</a>.
              No form is needed.
            </li>
          </ul>
        </Section>

        <Section title="Advice, not a guarantee">
          <p>
            Kisan AI gives general farming guidance. Always check pesticide and fertilizer doses on the product label and with
            your local agriculture extension office, and see a vet for sick animals.
          </p>
        </Section>

        <Section title="Younger visitors">
          <p>
            If you are under 18, please ask a parent or teacher before creating an account or sending us information.
          </p>
        </Section>

        <Section title="Changes">
          <p>When this policy changes, we will update this page and the date at the top.</p>
        </Section>

        <Section title="Contact">
          <ul className="space-y-1">
            <li>Email: <a className="text-primary underline underline-offset-2" href="mailto:team.lpps1@gmail.com">team.lpps1@gmail.com</a></li>
            <li>WhatsApp: <a className="text-primary underline underline-offset-2" href="https://wa.me/923376554652" target="_blank" rel="noreferrer">+92 337 6554652</a></li>
            <li>Team LPPS – 1, Lahore, Pakistan</li>
          </ul>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
