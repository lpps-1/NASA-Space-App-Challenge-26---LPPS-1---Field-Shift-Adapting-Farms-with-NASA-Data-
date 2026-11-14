import { Link } from "react-router-dom";
import { useT } from "@/i18n";

/**
 * Site footer, the same on every page: the Kisan AI name and one line about it,
 * links into the app, the policy pages, and "Made by Team LPPS-1".
 * No social or contact links here on purpose.
 */
const VERSION = "v1.3";

const EXPLORE = [
  ["Kisan AI chat", "/"],
  ["Dashboard", "/dashboard"],
  ["Rotation planner", "/rotation"],
  ["Calendar", "/calendar"],
  ["Tools", "/tools"],
  ["My farm", "/profile"],
];

const POLICIES = [
  ["Privacy Policy", "/privacy"],
  ["Terms of Use", "/terms"],
  ["Data sources", "/knowledge"],
  ["Advice disclaimer", "/terms#advice"],
];

const linkCls = "text-muted-foreground transition-colors hover:text-foreground";

function Column({ title, items }) {
  const { t } = useT();
  return (
    <div>
      <h2 className="text-xs font-semibold text-foreground">{t(title)}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className={linkCls}>{t(label)}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  const { t } = useT();
  // A real footer: full width, attached to the bottom of the page with a top border. No card, no logo
  // (the logo is already at the top of the sidebar). Not shown on the chat page.
  return (
    <footer className="mt-16 border-t bg-card/40 [border-color:var(--card-line)]" data-testid="site-footer">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr] lg:px-10">
        <div>
          <p className="text-sm font-semibold">Kisan AI</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t("Compare crop rotations with NASA climate data, your soil and your water, and ask for advice in Urdu, Punjabi or English.")}
          </p>
        </div>
        <Column title="Explore" items={EXPLORE} />
        <Column title="Policies" items={POLICIES} />
      </div>
      <div className="border-t [border-color:var(--card-line)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <p>© {new Date().getFullYear()} Kisan AI · {t("Made by Team LPPS-1")} · {VERSION}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/privacy" className={linkCls}>{t("Privacy Policy")}</Link>
            <Link to="/terms" className={linkCls}>{t("Terms of Use")}</Link>
            <Link to="/knowledge" className={linkCls}>{t("Data sources")}</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
