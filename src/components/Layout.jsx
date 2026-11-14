import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { useT } from "@/i18n";
import SiteFooter from "@/components/SiteFooter";
import {
  CalendarDays,
  ChevronsUpDown,
  Database,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  MessagesSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Repeat,
  Settings as SettingsIcon,
  Sun,
  Trash2,
  UserRound,
  Wrench,
  X,
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
import SettingsDialog from "@/pages/Settings";
import { openSettings } from "@/lib/settingsDialog";

// Kisan AI (the chat) comes first and is the home page; the rotation planner is the app's main tool.
const NAV = [
  { to: "/chat", label: "Kisan AI", icon: MessagesSquare },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rotation", label: "Rotation", icon: Repeat },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/tools", label: "Tools", icon: Wrench },
  { to: "/profile", label: "My farm", icon: UserRound },
  { to: "/knowledge", label: "Data sources", icon: Database },
];

const COLLAPSE_KEY = "kisan-sidebar-collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

/** One row in the sidebar. Collapsed, it shows only the icon (the name is the tooltip). */
function NavItem({ to, label, icon: Icon, end, collapsed }) {
  const { t } = useT();
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? t(label) : undefined}
      className={({ isActive }) =>
        cn(
          "flex h-9 items-center gap-3 rounded-lg text-sm transition-colors focus-ring",
          collapsed ? "w-9 justify-center" : "px-2.5",
          isActive ? "bg-sidebar-accent font-medium text-white" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-white"
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{t(label)}</span>}
    </NavLink>
  );
}

/** Chat history, under the main sections (like Claude's "Recents"). Opening one goes to the chat. */
function ChatHistory() {
  const { t } = useT();
  const navigate = useNavigate();
  const { data: conversations } = useConversations();
  const ops = useEntityMutations("Conversation", "conversations");
  const activeId = useActiveConversation();
  const recent = [...(conversations || [])].sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 30);

  const remove = async (c) => {
    await ops.remove.mutateAsync(c.id);
    if (c.id === activeId) navigate(`/chat?new=${Date.now()}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="px-4 pb-1 pt-4 text-[11px] font-medium text-sidebar-foreground/50">{t("Recent chats")}</p>
      <ul className="min-h-0 flex-1 space-y-px overflow-y-auto px-2 pb-2" data-testid="chat-history">
        {recent.length === 0 && <li className="px-2.5 py-1 text-xs text-sidebar-foreground/50">{t("Your conversations appear here.")}</li>}
        {recent.map((c) => (
          <li key={c.id} className="group flex items-center rounded-lg hover:bg-sidebar-accent/60">
            <button
              onClick={() => navigate(`/chat?c=${c.id}`)}
              dir="auto"
              title={c.title}
              className={cn(
                "min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-start text-[13px] focus-ring",
                c.id === activeId ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/75",
                detectLanguage(c.title || "").script === "arabic" && "urdu"
              )}
            >
              {c.title}
            </button>
            <button
              onClick={() => remove(c)}
              className="me-1 rounded-md p-1 text-sidebar-foreground/50 opacity-0 hover:text-alert focus:opacity-100 group-hover:opacity-100 focus-ring"
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

/** The account row at the bottom. It opens a small menu: settings, theme, sign out. */
function AccountMenu({ collapsed }) {
  const { t } = useT();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { data: profile } = useProfile();
  const name = displayNameOf(profile) || FALLBACK_NAME;
  const item = "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-secondary";
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn("flex w-full items-center gap-2.5 rounded-lg p-1.5 text-start hover:bg-sidebar-accent/60 focus-ring", collapsed && "justify-center")}
        aria-label={`${t("Account and settings")}: ${name}`}
      >
        <Avatar profile={profile} className="h-8 w-8 shrink-0 text-[11px]" />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white" dir="auto" data-testid="sidebar-name">{name}</span>
              <span className="block truncate text-[11px] text-sidebar-foreground/55" data-testid="sidebar-email">{user?.email}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/50" aria-hidden="true" />
          </>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content side="top" align="start" sideOffset={6} className="kisan-menu z-50 w-60 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
          <p className="truncate px-2.5 py-2 text-xs text-muted-foreground">{user?.email}</p>
          <Menu.Separator className="my-1 h-px bg-border" />
          <Menu.Item className={item} onSelect={() => openSettings()}>
            <SettingsIcon className="h-4 w-4" aria-hidden="true" /> {t("Settings")}
          </Menu.Item>
          <Menu.Item
            className={item}
            onSelect={(e) => {
              e.preventDefault();
              toggle();
            }}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            {theme === "dark" ? t("Light") : t("Dark")}
          </Menu.Item>
          <Menu.Separator className="my-1 h-px bg-border" />
          <Menu.Item className={item} onSelect={logout}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> {t("Sign out")}
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** Everything inside the sidebar: brand and toggle, new chat, the sections, chat history, account. */
function SidebarContent({ collapsed, onToggle, onClose }) {
  const { t } = useT();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const iconBtn = "rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white focus-ring";
  return (
    <>
      <div className={cn("flex h-14 shrink-0 items-center gap-2", collapsed ? "justify-center px-2" : "px-3")}>
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <BrandMark className="h-7 w-7 shrink-0" />
            <span className="truncate font-display text-[15px] font-bold text-white">Kisan AI</span>
            <span className="truncate text-[11px] text-sidebar-foreground/50">{profile?.country === "US" ? t("United States") : t("Pakistan")}</span>
          </div>
        )}
        {onToggle && (
          <button onClick={onToggle} className={iconBtn} aria-label={collapsed ? t("Open sidebar") : t("Close sidebar")} title={collapsed ? t("Open sidebar") : t("Close sidebar")} data-testid="sidebar-toggle">
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px] rtl:-scale-x-100" /> : <PanelLeftClose className="h-[18px] w-[18px] rtl:-scale-x-100" />}
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className={iconBtn} aria-label={t("Close")}>
            <X className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      <div className={cn("shrink-0 px-2", collapsed && "flex flex-col items-center")}>
        <button
          onClick={() => navigate(`/chat?new=${Date.now()}`)}
          title={collapsed ? t("New chat") : undefined}
          className={cn("mb-1 flex h-9 items-center gap-3 rounded-lg text-sm font-medium text-white hover:bg-sidebar-accent/60 focus-ring", collapsed ? "w-9 justify-center" : "w-full px-2")}
          data-testid="new-chat"
        >
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          {!collapsed && t("New chat")}
        </button>
        <nav className={cn("space-y-px", collapsed && "flex flex-col items-center")} aria-label={t("Main")}>
          {NAV.map((item) => <NavItem key={item.to} {...item} collapsed={collapsed} />)}
        </nav>
      </div>

      {collapsed ? <div className="flex-1" /> : <ChatHistory />}

      <div className="shrink-0 border-t border-sidebar-border p-2">
        <AccountMenu collapsed={collapsed} />
      </div>
    </>
  );
}

export default function Layout() {
  const { t } = useT();
  const { pathname } = useLocation();
  const isChat = pathname === "/chat";
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* storage blocked */
      }
      return !c;
    });
  };

  // Close the phone menu whenever the page changes.
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const esc = (e) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [drawer]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar: fixed, full height, edge to edge. Closes to a slim icon rail. Right side in Urdu and Punjabi. */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-30 hidden flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[3.25rem]" : "w-64"
        )}
        data-testid="sidebar"
      >
        <SidebarContent collapsed={collapsed} onToggle={toggle} />
      </aside>

      {/* Phone: a flat top bar with a menu button that opens the same sidebar as a drawer. */}
      <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-sidebar-border bg-sidebar px-2 text-sidebar-foreground lg:hidden">
        <button onClick={() => setDrawer(true)} className="rounded-lg p-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 focus-ring" aria-label={t("Open menu")} data-testid="menu-open">
          <MenuIcon className="h-5 w-5" />
        </button>
        <BrandMark className="h-6 w-6" />
        <span className="font-display text-[15px] font-bold text-white">Kisan AI</span>
      </header>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("Menu")}>
          <div className="kisan-fade absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <aside className="kisan-drawer absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground">
            <SidebarContent collapsed={false} onClose={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <main className={cn("transition-[padding] duration-200 ease-out", collapsed ? "lg:ps-[3.25rem]" : "lg:ps-64")}>
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

      <RotationWelcome />
      <SettingsDialog />
    </div>
  );
}
