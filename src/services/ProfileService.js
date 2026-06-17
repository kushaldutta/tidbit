import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

class ProfileService {
  static async getMyProfile() {
    if (!SUPABASE_CONFIGURED) return null;
    const userId = AuthService.getUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[PROFILE] getMyProfile error:', error);
      return null;
    }
    return data || null;
  }

  static async upsertProfile(updates) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const user = await AuthService.ensureValidSession();
    if (!user?.id) throw new Error('Not signed in');

    const row = {
      id: user.id,
      email: user.email,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(row)
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (error) {
      if (
        AuthService.isAuthMismatchError(error) ||
        AuthService.isStaleSessionError(error)
      ) {
        await AuthService.clearLocalAuthSession();
        throw new Error('Your session expired. Please sign in again.');
      }
      throw error;
    }

    if (data) return data;

    // Profile row missing (trigger may not have run) — update only works if row exists.
    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert(row)
      .select()
      .single();

    if (insertError) {
      if (
        AuthService.isAuthMismatchError(insertError) ||
        AuthService.isStaleSessionError(insertError)
      ) {
        await AuthService.clearLocalAuthSession();
        throw new Error('Your session expired. Please sign in again.');
      }
      throw insertError;
    }
    return inserted;
  }

  static async hasCompletedProfile() {
    const profile = await this.getMyProfile();
    return Boolean(profile?.display_name && profile?.school_id);
  }

  static async hasJoinedAtLeastOneClass() {
    if (!SUPABASE_CONFIGURED) return false;
    const userId = AuthService.getUserId();
    if (!userId) return false;
    const { count, error } = await supabase
      .from('class_memberships')
      .select('class_id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) {
      // Table may not exist yet during W1; treat as "no" silently.
      return false;
    }
    return (count || 0) > 0;
  }
}

export { ProfileService };
export default ProfileService;
