import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { CommentService } from '../services/CommentService';
import { ModerationService } from '../services/ModerationService';
import { AuthService } from '../services/AuthService';

function relativeTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Expandable comment thread for a feed post.
 * Props:
 *   postId        — UUID of the parent post
 *   commentCount  — current count shown in the collapsed button label
 *   isModerator   — whether the current user can mod-delete comments
 */
export default function CommentThread({ postId, commentCount = 0, isModerator = false }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState('');
  const myUserId = AuthService.getUserId();
  const unsubRef = useRef(null);

  const loadComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    const data = await CommentService.getComments(postId);
    setComments(data);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    if (!expanded) {
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
      return;
    }
    loadComments();
    unsubRef.current = CommentService.subscribeToPostComments(postId, loadComments);
    return () => {
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    };
  }, [expanded, postId, loadComments]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const newComment = await CommentService.addComment(postId, text);
      setComments((prev) => [...prev, newComment]);
      setDraft('');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (commentId) => {
    Alert.alert('Delete comment?', 'This will remove your comment.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await CommentService.deleteComment(commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          } catch (e) {
            Alert.alert('Error', e.message || 'Could not delete comment.');
          }
        },
      },
    ]);
  };

  const handleModDelete = (commentId) => {
    Alert.alert('Remove comment?', 'Remove this comment as moderator?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await CommentService.moderatorDeleteComment(commentId, 'Mod remove');
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          } catch (e) {
            Alert.alert('Error', e.message || 'Could not remove comment.');
          }
        },
      },
    ]);
  };

  const label = commentCount === 0
    ? 'Add a comment'
    : commentCount === 1
      ? '1 comment'
      : `${commentCount} comments`;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleLabel}>
          {expanded ? '▲ Hide comments' : `💬 ${label}`}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.thread}>
          {loading && <ActivityIndicator size="small" color={theme.accent} style={{ marginVertical: 8 }} />}

          {!loading && comments.length === 0 && (
            <Text style={styles.emptyText}>No comments yet — be first!</Text>
          )}

          {comments.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <View style={styles.commentMeta}>
                <Text style={styles.commentAuthor}>{c.authorName}</Text>
                {c.authorYear && <Text style={styles.commentYear}> '{String(c.authorYear).slice(-2)}</Text>}
                <Text style={styles.commentTime}> · {relativeTime(c.createdAt)}</Text>
              </View>
              <Text style={styles.commentText}>{c.text}</Text>

              <View style={styles.commentActions}>
                {CommentService.canDeleteComment(c, myUserId) && (
                  <TouchableOpacity onPress={() => handleDelete(c.id)}>
                    <Text style={styles.deleteBtn}>Delete</Text>
                  </TouchableOpacity>
                )}
                {isModerator && !CommentService.canDeleteComment(c, myUserId) && (
                  <TouchableOpacity onPress={() => handleModDelete(c.id)}>
                    <Text style={styles.modBtn}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Write a comment…"
                placeholderTextColor={theme.textSecondary}
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={1000}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!draft.trim() || submitting) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!draft.trim() || submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.sendBtnText}>Send</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    container: {
      marginTop: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      paddingTop: 6,
    },
    toggleBtn: {
      paddingVertical: 4,
    },
    toggleLabel: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    thread: {
      marginTop: 6,
      gap: 10,
    },
    emptyText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontStyle: 'italic',
      marginBottom: 6,
    },
    commentRow: {
      gap: 2,
    },
    commentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    commentAuthor: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    commentYear: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    commentTime: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    commentText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 19,
    },
    commentActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 2,
    },
    deleteBtn: {
      fontSize: 12,
      color: theme.danger || '#ef4444',
    },
    modBtn: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginTop: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      paddingTop: 8,
    },
    input: {
      flex: 1,
      backgroundColor: theme.surface || theme.card,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 14,
      color: theme.text,
      maxHeight: 80,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    sendBtn: {
      backgroundColor: theme.accent,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 8,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 56,
    },
    sendBtnDisabled: {
      opacity: 0.45,
    },
    sendBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
