import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';

const PROVIDERS = {
  APPLE: 'apple',
  GOOGLE: 'google',
  EMAIL: 'email',
};

let currentSession = null;
const listeners = new Set();

function notify(session) {
  currentSession = session;
  for (const cb of listeners) {
    try {
      cb(session);
    } catch (err) {
      console.error('[AUTH] listener error:', err);
    }
  }
}

class AuthService {
  static PROVIDERS = PROVIDERS;

  static async init() {
    if (!SUPABASE_CONFIGURED) {
      console.warn('[AUTH] Supabase not configured. Auth disabled.');
      return null;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[AUTH] getSession error:', error);
      return null;
    }
    currentSession = data?.session || null;

    if (currentSession?.user?.id) {
      const { error: userError } = await supabase.auth.getUser();
      if (userError && this.isStaleSessionError(userError)) {
        console.warn('[AUTH] Stale session — clearing local auth cache');
        await this.clearLocalAuthSession();
      }
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      notify(session);
    });

    return currentSession;
  }

  static getSession() {
    return currentSession;
  }

  static getUser() {
    return currentSession?.user || null;
  }

  static getUserId() {
    return currentSession?.user?.id || null;
  }

  static isAuthenticated() {
    return Boolean(currentSession?.user?.id);
  }

  static onAuthChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  // -- Email / password --

  static async signUpWithEmail({ email, password }) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    if (data?.session) {
      require('./SyncService').SyncService.resetSyncCache();
      await this.ensureValidSession({ force: true });
    }
    return data;
  }

  static async signInWithEmail({ email, password }) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    require('./SyncService').SyncService.resetSyncCache();
    await this.ensureValidSession({ force: true });
    return data;
  }

  static async sendPasswordReset(email) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase()
    );
    if (error) throw error;
  }

  // -- Apple (iOS only) --

  static isAppleSignInAvailable() {
    return Platform.OS === 'ios';
  }

  static async signInWithApple() {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No identityToken returned from Apple');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;

    // Apple only returns fullName on first sign-in. Capture it for the
    // profile creation step in OnboardingProfileScreen.
    if (credential.fullName && data?.user) {
      const givenName = credential.fullName.givenName || '';
      const familyName = credential.fullName.familyName || '';
      const displayName = `${givenName} ${familyName}`.trim();
      if (displayName) {
        await supabase.auth.updateUser({
          data: { full_name: displayName },
        }).catch(() => {});
      }
    }

    await this.ensureValidSession({ force: true });
    require('./SyncService').SyncService.resetSyncCache();
    return data;
  }

  static isStaleSessionError(error) {
    if (!error?.message) return false;
    const msg = error.message.toLowerCase();
    return (
      msg.includes('sub claim') ||
      msg.includes('user from sub') ||
      (msg.includes('jwt') && msg.includes('does not exist')) ||
      msg.includes('invalid claim') ||
      msg.includes('session not found')
    );
  }

  static isAuthMismatchError(error) {
    if (!error?.message) return false;
    const msg = error.message.toLowerCase();
    return (
      msg.includes('profiles_id_fkey') ||
      msg.includes('foreign key constraint') ||
      error.code === '23503'
    );
  }

  static _sessionValidatedAt = 0;
  static SESSION_VALIDITY_MS = 5 * 60 * 1000;

  /** Verify JWT with Supabase and sync in-memory session. Clears stale sessions. */
  static async ensureValidSession({ force = false } = {}) {
    if (!SUPABASE_CONFIGURED) return null;

    if (
      !force &&
      currentSession?.user?.id &&
      Date.now() - this._sessionValidatedAt < this.SESSION_VALIDITY_MS
    ) {
      return currentSession.user;
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.id) {
      if (error && this.isStaleSessionError(error)) {
        await this.clearLocalAuthSession();
      }
      throw error || new Error('Not signed in');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id === user.id) {
      currentSession = session;
      notify(session);
    }
    this._sessionValidatedAt = Date.now();
    return user;
  }

  /** Drop cached session + device prefs without calling auth server. */
  static async clearLocalAuthSession() {
    const { SyncService } = require('./SyncService');
    const { EntitlementService } = require('./EntitlementService');
    this._sessionValidatedAt = 0;
    SyncService.resetSyncCache();
    await SyncService.clearLocalSessionState();
    await EntitlementService.reset().catch(() => {});
    if (SUPABASE_CONFIGURED) {
      await supabase.auth.signOut({ scope: 'local' });
    }
    currentSession = null;
    notify(null);
  }

  static async signOut() {
    if (!SUPABASE_CONFIGURED) {
      await this.clearLocalAuthSession();
      return;
    }

    const { SyncService } = require('./SyncService');
    const { EntitlementService } = require('./EntitlementService');
    await SyncService.clearLocalSessionState();
    await EntitlementService.reset().catch(() => {});

    const { error } = await supabase.auth.signOut();
    if (error) {
      if (this.isStaleSessionError(error)) {
        await supabase.auth.signOut({ scope: 'local' });
        currentSession = null;
        notify(null);
        return;
      }
      throw error;
    }
    currentSession = null;
    notify(null);
  }

  static async deleteAccount() {
    // Note: full account deletion requires a server-side function with
    // service-role privileges. The client calls a Supabase RPC that
    // soft-deletes the profile and revokes all sessions.
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');

    const { error } = await supabase.rpc('delete_my_account');
    if (error && !this.isStaleSessionError(error)) throw error;

    // Always clear local session — RPC may fail if auth user was already removed.
    await this.signOut();
  }
}

export { AuthService };
export default AuthService;
