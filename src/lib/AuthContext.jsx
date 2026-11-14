import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  getSettings,
  getUser,
  handleAuthCallback,
  login as identityLogin,
  logout as identityLogout,
  oauthLogin,
  onAuthChange,
  requestPasswordRecovery,
  signup as identitySignup,
  updateUser as identityUpdateUser,
} from '@netlify/identity';
import { DEMO_USER } from '@/data/fixtures';
import { kisan } from '@/api/kisanClient';
import { queryClientInstance } from '@/lib/query-client';

/**
 * Auth provider.
 *
 * Real accounts use Netlify Identity (`@netlify/identity`): email + password,
 * Google sign-in, email confirmation and password recovery. When Identity
 * isn't reachable (plain `vite`, or Identity not enabled on the site) the app
 * falls back to local accounts stored in this browser, and "Explore the demo
 * farm" always uses a local account.
 *
 * Context shape (kept from the original app): isLoadingAuth,
 * isLoadingPublicSettings, authError, navigateToLogin, user, isAuthenticated,
 * login, register, logout, updateUser — plus loginWithGoogle, enterDemo,
 * requestPasswordReset, setNewPassword, identity and authNotice.
 *
 * The session only holds account identity: { id, email, role, onboarded, provider }.
 * `provider` is "identity" for Netlify Identity accounts and "local" otherwise.
 * The farmer's name lives in their profile (display_name), never derived from the email.
 */
const SESSION_KEY = 'kisan-session';
const ACCOUNTS_KEY = 'kisan-accounts';
const AuthContext = createContext(null);

// Hash fragments Netlify Identity sends back after Google sign-in, email confirmation or password recovery.
const AUTH_HASH = /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token|error)=/;

const normEmail = (e) => String(e || '').trim().toLowerCase();

/** Stable id for a local account ("u_" + FNV-1a hash), so the same login always opens the same account. */
function accountId(email) {
  const e = normEmail(email);
  if (!e || e === DEMO_USER.email) return DEMO_USER.id;
  let h = 0x811c9dc5;
  for (let i = 0; i < e.length; i++) {
    h ^= e.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 'u_' + (h >>> 0).toString(36) + e.length.toString(36);
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const accounts = () => readJson(ACCOUNTS_KEY, {});
function saveAccount(acc) {
  try {
    const all = accounts();
    all[acc.id] = acc;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked */
  }
}

/** Reads the session, upgrading sessions saved before accounts existed. */
function readSession() {
  const s = readJson(SESSION_KEY, null);
  if (!s) return null;
  const provider = s.provider || 'local';
  const email = s.email || DEMO_USER.email;
  const id = provider === 'identity' ? s.id : s.id && s.id !== DEMO_USER.id ? s.id : accountId(email);
  const known = accounts()[id];
  const session = {
    id,
    email,
    role: s.role || known?.role || 'admin',
    onboarded: s.onboarded ?? known?.onboarded ?? true,
    provider,
  };
  kisan.setActiveUser({ id, email });
  if (s.id !== id || 'full_name' in s || !s.provider) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    saveAccount(session);
  }
  return session;
}

/** Admins are users given the "admin" role in Netlify (Identity → user → Roles). */
const roleOf = (u) => ((u?.roles || []).includes('admin') || u?.role === 'admin' ? 'admin' : 'farmer');

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

/** Moves the SPA to a path without reloading (React Router listens for popstate). */
function goTo(path) {
  window.history.replaceState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function hashError() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const err = params.get('error_description') || params.get('error');
  return err ? err.replace(/\+/g, ' ') : null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readSession());
  const userRef = useRef(user);
  userRef.current = user;
  // Block rendering only while a sign-in link from Netlify Identity is being processed.
  const [processing, setProcessing] = useState(() => AUTH_HASH.test(window.location.hash));
  const [identity, setIdentity] = useState({ status: 'checking', providers: {} });
  const [authNotice, setAuthNotice] = useState(null);
  const settingsRef = useRef(null);

  const persist = useCallback((next) => {
    if (next) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      saveAccount(next);
    } else localStorage.removeItem(SESSION_KEY);
    setUser(next);
  }, []);

  /** Opens (or creates) a local account for an email and points storage at it. */
  const openLocal = useCallback((email, { display_name } = {}) => {
    const e = normEmail(email) || DEMO_USER.email;
    const id = accountId(e);
    const known = accounts()[id];
    const next = {
      id,
      email: known?.email || (e === DEMO_USER.email ? DEMO_USER.email : String(email).trim()),
      role: known?.role || DEMO_USER.role,
      // Accounts this device has never seen go through farm setup (except the demo farm).
      onboarded: known ? known.onboarded : id === DEMO_USER.id,
      provider: 'local',
    };
    kisan.setActiveUser({ id, email: next.email, display_name });
    queryClientInstance.clear(); // never show the previous account's cached data
    persist(next);
    return next;
  }, [persist]);

  /** Opens the account of a Netlify Identity user (email/password or Google). */
  const openIdentity = useCallback((u) => {
    const known = accounts()[u.id];
    const next = {
      id: u.id,
      email: u.email || known?.email || '',
      role: roleOf(u),
      onboarded: known ? known.onboarded : false,
      provider: 'identity',
    };
    // A brand-new profile starts with the name from Google (or the sign-up form).
    kisan.setActiveUser({ id: next.id, email: next.email, display_name: u.name || '' });
    queryClientInstance.clear();
    persist(next);
    return next;
  }, [persist]);

  /** Resolves once we know whether Netlify Identity is available on this site. */
  const ensureSettings = useCallback(() => {
    if (!settingsRef.current) {
      settingsRef.current = withTimeout(getSettings(), 5000)
        .then((s) => {
          // Without Identity, the SPA fallback answers /.netlify/identity/settings with index.html,
          // which parses to an empty object. A real Identity server always sends `autoconfirm`.
          if (typeof s?.autoconfirm !== 'boolean') throw new Error('Netlify Identity is not enabled');
          return { status: 'on', providers: s.providers || {}, autoconfirm: s.autoconfirm, disableSignup: s.disableSignup };
        })
        .catch(() => ({ status: 'off', providers: {} }));
    }
    return settingsRef.current;
  }, []);

  useEffect(() => {
    let alive = true;
    const unsubscribe = onAuthChange((event, u) => {
      if (!alive) return;
      if (event === 'logout' && userRef.current?.provider === 'identity') persist(null);
      if (event === 'recovery' && u) {
        openIdentity(u);
        goTo('/reset-password');
      }
    });

    (async () => {
      const settings = await ensureSettings();
      if (!alive) return;
      setIdentity(settings);
      if (settings.status === 'on') {
        // A sign-in link (Google, confirmation, recovery) can only be used once. The library may
        // already have used it, so a failure here is only reported if nobody ends up signed in.
        let callbackProblem = null;
        try {
          if (AUTH_HASH.test(window.location.hash)) {
            const failure = hashError();
            const result = await handleAuthCallback();
            if (failure && !result) callbackProblem = failure;
            if (result?.type === 'recovery') goTo('/reset-password');
          }
        } catch (err) {
          callbackProblem = err?.message || 'please try again';
        }
        const u = await getUser().catch(() => null);
        if (!alive) return;
        if (callbackProblem && !u) setAuthNotice(`Sign-in didn't finish: ${callbackProblem}. Please try again.`);
        if (u) setAuthNotice(null);
        const current = userRef.current;
        if (u && (!current || current.provider === 'identity')) {
          if (!current || current.id !== u.id) openIdentity(u);
          else if (current.role !== roleOf(u)) persist({ ...current, role: roleOf(u) });
        } else if (!u && current?.provider === 'identity') {
          persist(null); // the Identity session ended (expired or signed out in another tab)
        }
      } else if (AUTH_HASH.test(window.location.hash)) {
        setAuthNotice('Netlify Identity is not available here, so this sign-in link cannot be used.');
      }
      if (AUTH_HASH.test(window.location.hash)) window.history.replaceState(null, '', window.location.pathname);
      setProcessing(false);
    })();

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [ensureSettings, openIdentity, persist]);

  /** Email + password sign-in. Uses Netlify Identity when available, a local account otherwise. */
  const login = useCallback(async ({ email, password }) => {
    if (normEmail(email) === DEMO_USER.email) return openLocal(email);
    const settings = await ensureSettings();
    if (settings.status !== 'on') return openLocal(email);
    const u = await identityLogin(normEmail(email), password);
    return openIdentity(u);
  }, [ensureSettings, openIdentity, openLocal]);

  const enterDemo = useCallback(async () => openLocal(DEMO_USER.email), [openLocal]);

  /**
   * Creates an account. Returns { needsConfirmation: true } when Netlify Identity
   * sent a confirmation email (autoconfirm is off), otherwise the session.
   */
  const register = useCallback(async ({ full_name, display_name, email, password }) => {
    const name = String(display_name ?? full_name ?? '').trim();
    const settings = await ensureSettings();
    if (settings.status === 'on') {
      const u = await identitySignup(normEmail(email), password, { full_name: name });
      if (!u.confirmedAt && !settings.autoconfirm) return { needsConfirmation: true, email: normEmail(email) };
      return openIdentity({ ...u, name: u.name || name });
    }
    const next = openLocal(email, { display_name: name });
    if (name) {
      // Only set the name if the farmer hasn't saved one already on this account.
      const current = await kisan.entities.FarmerProfile.get();
      if (!current.display_name) await kisan.entities.FarmerProfile.update({ display_name: name });
    }
    return next;
  }, [ensureSettings, openIdentity, openLocal]);

  /** Sends the farmer to Google. The page navigates away and comes back signed in. */
  const loginWithGoogle = useCallback(async () => {
    const settings = await ensureSettings();
    if (settings.status !== 'on') {
      throw new Error('Google sign-in works on your live Netlify site once Identity is turned on. It can\'t run in a plain local preview.');
    }
    if (!settings.providers?.google) {
      throw new Error('Google sign-in is not turned on yet. In Netlify, open Identity → Registration → External providers and add Google.');
    }
    oauthLogin('google');
  }, [ensureSettings]);

  const requestPasswordReset = useCallback(async (email) => {
    const settings = await ensureSettings();
    if (settings.status === 'on') await requestPasswordRecovery(normEmail(email));
    return { live: settings.status === 'on' };
  }, [ensureSettings]);

  /** Sets a new password after opening a recovery link (the user is signed in by the link). */
  const setNewPassword = useCallback(async (password) => {
    const settings = await ensureSettings();
    if (settings.status !== 'on' || userRef.current?.provider !== 'identity') return { live: false };
    await identityUpdateUser({ password });
    return { live: true };
  }, [ensureSettings]);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      // Identity fields can't be changed through updateUser.
      const { id: _id, email: _email, provider: _provider, ...safe } = patch || {};
      const next = { ...prev, ...safe };
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      saveAccount(next);
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    if (userRef.current?.provider === 'identity') {
      try {
        await identityLogout();
      } catch {
        /* cookies are cleared either way */
      }
    }
    persist(null);
    kisan.setActiveUser(null);
    window.location.assign('/login');
  }, [persist]);

  const navigateToLogin = useCallback(() => {
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    isLoadingAuth: processing,
    isLoadingPublicSettings: false,
    authError: null,
    identity,
    authNotice,
    clearAuthNotice: () => setAuthNotice(null),
    login,
    enterDemo,
    register,
    loginWithGoogle,
    requestPasswordReset,
    setNewPassword,
    logout,
    updateUser,
    navigateToLogin,
  }), [user, processing, identity, authNotice, login, enterDemo, register, loginWithGoogle, requestPasswordReset, setNewPassword, logout, updateUser, navigateToLogin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
