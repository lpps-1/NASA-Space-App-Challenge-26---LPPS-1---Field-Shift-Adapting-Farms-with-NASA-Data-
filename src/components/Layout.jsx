import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useT } from "@/i18n";
import SiteFooter from "@/components/SiteFooter";
import {
  CalendarDays,
  Database,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Moon,
  Plus,
  Repeat,
  Settings as SettingsIcon,
  Sun,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { useConversations, useEntityMutations, useProfile } from "@/hooks/useKisanData";
import { displayNameOf, FALLBACK_NAME } from "@/lib/profile";
import { useActiveConversation } from "@/lib/chatBus";
import { detectLanguage } from "@/lib/language";
import BrandMark from "@/components/BrandMark";
import Avatar from "@/components/Avatar";
import RotationWelcome from "@/components/RotationWelcome";

// Kisan AI (the chat) comes first and is the home page; the rotation planner is the app's main tool.
const NAV = [
  { to: "/", label: "Kisan AI", icon: MessagesSquare, end: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rotation", label: "Rotation", icon: Repeat },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/tools", label: "Tools", icon: Wrench },
  { to: "/profile", label: "My farm", icon: UserRound },
];
const MORE = [{ to: "/knowledge", label: "Data sources", icon: Database }];

function NavItem({ to, label, icon: Icon, end }) {
  const { t } = useT();
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors focus-ring",
          isActive
            ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--sidebar-border))]"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn("absolute start-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-e-full bg-sidebar-primary transition-opacity", isActive ? "opacity-100" : "opacity-0")}
            aria-hidden="true"
          />
          <Icon className={cn("h-[18px] w-[18px]", isActive && "text-sidebar-primary")} aria-hidden="true" />
          {t(label)}
        </>
      )}
    </NavLink>
  );
}

/** Chat history, in the sidebar on every page (like Claude). Opening one goes to the chat. */
function ChatHistory() {
  const { t } = useT();
  const navigate = useNavigate();
  const { data: conversations } = useConversations();
  const ops = useEntityMutations("Conversation", "conversations");
  const activeId = useActiveConversation();
  const recent = [...(conversations || [])].sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 30);

  const remove = async (c) => {
    await ops.remove.mutateAsync(c.id);
    if (c.id === activeId) navigate(`/?new=${Date.now()}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        onClick={() => navigate(`/?new=${Date.now()}`)}
        className="mx-3 flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sidebar-accent focus-ring"
        data-testid="new-chat"
      >
        <Plus className="h-4 w-4 text-sidebar-primary" aria-hidden="true" /> {t("New chat")}
      </button>
      <p className="kisan-label mb-1 mt-4 px-5 !text-sidebar-foreground/50">{t("Recent chats")}</p>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-2" data-testid="chat-history">
        {recent.length === 0 && <li className="px-2 py-1 text-xs text-sidebar-foreground/50">{t("Your conversations appear here.")}</li>}
        {recent.map((c) => (
          <li key={c.id} className="group flex items-center">
            <button
              onClick={() => navigate(`/?c=${c.id}`)}
              dir="auto"
              title={c.title}
              className={cn(
                "min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-start text-[13px] transition-colors hover:bg-sidebar-accent/60 focus-ring",
                c.id === activeId ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/70",
                detectLanguage(c.title || "").script === "arabic" && "urdu"
              )}
            >
              {c.title}
            </button>
            <button
              onClick={() => remove(c)}
              className="rounded-md p-1.5 text-sidebar-foreground/50 opacity-0 hover:text-alert focus:opacity-100 group-hover:opacity-100 focus-ring"
              aria-label={`${t("Delete conversation")} ${c.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { data: profile } = useProfile();
  const name = displayNameOf(profile);
  const { t } = useT();
  const { pathname } = useLocation();
  const isChat = pathname === "/";

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar: the main sections, then chat history, then the account. It sits on the right in Urdu and Punjabi. */}
      <aside className="fixed inset-y-3 start-3 z-30 hidden w-64 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-sidebar/90 text-sidebar-foreground shadow-[0_8px_30px_rgb(0_0_0/0.25)] backdrop-blur-md lg:flex [background-image:linear-gradient(180deg,hsl(var(--field)/0.28),transparent_45%)]" data-testid="sidebar">
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <BrandMark />
          <div className="leading-tight">
            <p className="font-display text-lg font-extrabold tracking-tight text-white">Kisan AI</p>
            <p className="kisan-label !text-sidebar-primary">{profile?.country === "US" ? t("United States") : t("Pakistan")}</p>
          </div>
        </div>

        <nav className="space-y-0.5 px-3" aria-label={t("Main")}>
          {NAV.map((item) => <NavItem key={item.to} {...item} />)}
          {MORE.map((item) => <NavItem key={item.to} {...item} />)}
        </nav>

        <div className="mx-5 my-3 h-px shrink-0 bg-sidebar-border" />
        <ChatHistory />

        <div className="border-t border-sidebar-border p-3">
          <NavLink to="/settings" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent/60 focus-ring" title={t("Account and settings")}>
            <Avatar profile={profile} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white" dir="auto" data-testid="sidebar-name">{name || FALLBACK_NAME}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60" data-testid="sidebar-email">{user?.email}</p>
            </div>
          </NavLink>
          {/* Account: settings, theme and sign out live together here. */}
          <div className="mt-1 grid grid-cols-3 gap-1">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] hover:bg-sidebar-accent hover:text-white focus-ring",
                  isActive ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/65"
                )
              }
            >
              <SettingsIcon className="h-4 w-4" /> {t("Settings")}
            </NavLink>
            <button
              onClick={toggle}
              className="flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-white focus-ring"
              aria-label={t("Toggle theme")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? t("Light") : t("Dark")}
            </button>
            <button
              onClick={logout}
              className="flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-white focus-ring"
            >
              <LogOut className="h-4 w-4" /> {t("Sign out")}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-2 z-20 mx-2 flex items-center justify-between rounded-2xl border border-white/10 bg-sidebar/90 px-4 py-2.5 text-sidebar-foreground shadow-[0_8px_30px_rgb(0_0_0/0.25)] backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <BrandMark className="h-8 w-8" />
          <span className="font-display text-base text-white">Kisan AI</span>
        </div>
        <div className="flex items-center gap-1">
          <NavLink to="/knowledge" className="rounded-lg p-2 text-sidebar-foreground/70 focus-ring" aria-label={t("Data sources")}>
            <Database className="h-4 w-4" />
          </NavLink>
          <button onClick={toggle} className="rounded-lg p-2 text-sidebar-foreground/70 focus-ring" aria-label={t("Toggle theme")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <NavLink to="/settings" className="rounded-lg p-2 text-sidebar-foreground/70 focus-ring" aria-label={t("Settings")}>
            <SettingsIcon className="h-4 w-4" />
          </NavLink>
          <NavLink to="/settings" className="ms-1 rounded-full focus-ring" aria-label={`${t("Account and settings")}: ${name || FALLBACK_NAME}`}>
            <Avatar profile={profile} className="h-8 w-8 text-[11px]" />
          </NavLink>
        </div>
      </header>

      <main className={cn("lg:ps-[17.5rem]", isChat ? "pb-16 lg:pb-0" : "pb-24 lg:pb-0")}>
        {isChat ? (
          // The chat uses the whole width: conversation | saved plans. History is in the sidebar.
          <div className="px-3 py-3 sm:px-4 lg:px-6 lg:py-4">
            <Outlet />
          </div>
        ) : (
          <>
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
              <Outlet />
            </div>
            <SiteFooter />
          </>
        )}
      </main>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-2 bottom-2 z-30 grid grid-cols-6 rounded-2xl border border-white/10 bg-sidebar/90 pb-[env(safe-area-inset-bottom)] shadow-[0_8px_30px_rgb(0_0_0/0.3)] backdrop-blur-md lg:hidden"
        aria-label={t("Main")}
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn("flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium focus-ring", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60")
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {t(label)}
          </NavLink>
        ))}
      </nav>

      <RotationWelcome />
    </div>
  );
}
