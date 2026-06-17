import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';
import { ModerationService } from './ModerationService';

const REPORT_CATEGORIES = [
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'off_topic', label: 'Off-topic' },
  { id: 'other', label: 'Other' },
];

class ReportService {
  static REPORT_CATEGORIES = REPORT_CATEGORIES;

  static canReportPost(post, myUserId) {
    return Boolean(post?.authorId && myUserId && post.authorId !== myUserId);
  }

  static canReportDeck(deck, myUserId) {
    return Boolean(deck?.ownerId && myUserId && deck.ownerId !== myUserId);
  }

  static async submitReport({ targetType, targetId, groupId, category, details }) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');

    const { data, error } = await supabase.rpc('submit_content_report', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_group_id: groupId || null,
      p_category: category,
      p_details: details?.trim() || null,
    });
    if (error) throw error;
    return data;
  }

  static async submitPostReport(post, { category, details }) {
    return this.submitReport({
      targetType: 'feed_post',
      targetId: post.id,
      groupId: post.groupId,
      category,
      details,
    });
  }

  static async submitDeckReport(deck, groupId, { category, details }) {
    return this.submitReport({
      targetType: 'deck',
      targetId: deck.id,
      groupId,
      category,
      details,
    });
  }

  static mapReportRow(row) {
    const meta = row.metadata || {};
    return {
      id: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      groupId: row.group_id || meta.group_id,
      category: row.category,
      details: row.details,
      status: row.status,
      metadata: meta,
      preview: meta.preview || meta.deck_title || 'Content report',
      groupCode: meta.group_code || '',
      reporterName: row.profiles?.display_name || 'User',
      createdAt: row.created_at,
    };
  }

  static async getPendingReports() {
    if (!SUPABASE_CONFIGURED) return [];
    const isMod = await ModerationService.isModerator();
    if (!isMod) return [];

    const { data, error } = await supabase
      .from('content_reports')
      .select(`
        id, target_type, target_id, group_id, category, details,
        status, metadata, created_at,
        profiles!reporter_id(display_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data || []).map((row) => this.mapReportRow(row));
  }

  static async getPendingReportCount() {
    if (!SUPABASE_CONFIGURED) return 0;
    const isMod = await ModerationService.isModerator();
    if (!isMod) return 0;

    const { count, error } = await supabase
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) return 0;
    return count || 0;
  }

  static async updateReportStatus(reportId, status) {
    if (!SUPABASE_CONFIGURED) throw new Error('Supabase not configured');
    const { error } = await supabase.rpc('moderator_update_report_status', {
      p_report_id: reportId,
      p_status: status,
    });
    if (error) throw error;
  }
}

export { ReportService };
export default ReportService;
