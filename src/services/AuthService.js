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
    return data;
  }

  static async signInWithEmail({ email, password }) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
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
        });
      }
    }

    return data;
  }

  static async signOut() {
    if (!SUPABASE_CONFIGURED) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    currentSession = null;
  }

  static async deleteAccount() {
    // Note: full account deletion requires a server-side function with
    // service-role privileges. The client calls a Supabase RPC that
    // soft-deletes the profile and revokes all sessions.
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
    await this.signOut();
  }
}

export { AuthService };
export default AuthService;
