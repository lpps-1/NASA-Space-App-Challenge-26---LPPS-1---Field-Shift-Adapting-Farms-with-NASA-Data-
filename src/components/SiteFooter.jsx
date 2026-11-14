import { Link } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import { useT } from "@/i18n";

/**
 * Site footer, the same on every page: the Kisan AI name and one line about it,
 * links into the app, the policy pages, and "Made by Team LPPS-1".
 * No social or contact links here on purpose.
 */
const VERSION = "V1.2";

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
      <h2 className="kisan-label">{t(title)}</h2>
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
  return (
    <footer className="mt-14 px-3 pb-3 lg:px-6 lg:pb-6" data-testid="site-footer">
      <div className="kisan-card overflow-hidden p-0">
        <div className="grid gap-10 px-6 py-10 sm:px-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3" aria-label="Kisan AI">
              <BrandMark className="h-11 w-11" />
              <span className="font-display text-3xl font-extrabold tracking-tight">Kisan&nbsp;AI</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("Compare crop rotations with NASA climate data, your soil and your water, and ask for advice in Urdu, Punjabi or English.")}
            </p>
            <p className="kisan-label mt-5">{t("Made by Team LPPS-1")}</p>
          </div>
          <Column title="Explore" items={EXPLORE} />
          <Column title="Policies" items={POLICIES} />
        </div>

        <div className="flex flex-col gap-2 border-t px-6 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-10 [border-color:var(--card-line)]">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link to="/privacy" className={linkCls}>{t("Privacy Policy")}</Link>
            <span aria-hidden="true">|</span>
            <Link to="/terms" className={linkCls}>{t("Terms of Use")}</Link>
            <span aria-hidden="true">|</span>
            <Link to="/knowledge" className={linkCls}>{t("Data sources")}</Link>
          </p>
          <p>© {new Date().getFullYear()} Kisan AI. {t("Made by Team LPPS-1")}. {VERSION}</p>
        </div>
      </div>
    </footer>
  );
}
