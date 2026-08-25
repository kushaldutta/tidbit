/**
 * AnalyticsService — product event logging into public.app_events.
 *
 * Deliberately small. This exists to answer a fixed set of launch questions
 * (see the views in server/migrations/049-app-events.sql), not to record
 * everything. Adding an event should mean a question you intend to act on.
 *
 * Guarantees and non-guarantees:
 *   * Fire-and-forget. `track()` never throws and never blocks a UI path.
 *   * Buffered and batched — events flush on a size threshold, a timer, or
 *     backgrounding, so a study session is one insert rather than forty.
 *   * Durable across a cold kill: the buffer is mirrored to AsyncStorage.
 *   * NOT exactly-once. A crash mid-flush can duplicate a batch. Every metric
 *     here is a rate or a trend, so a rare duplicate is acceptable; do not use
 *     this table for anything that must reconcile (coins, entitlements).
 *
 * PRIVACY — the rule that matters:
 *   props carry identifiers and enums only. Never card text, deck titles,
 *   emails, display names, or anything a student typed. `sanitizeProps` drops
 *   long strings as a backstop, but the real guard is the call site.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase, SUPABASE_CONFIGURED } from '../config/supabase';
import { AuthService } from './AuthService';

const QUEUE_KEY = '@tidbit:analytics_queue';

/** Flush when the buffer reaches this many events. */
const FLUSH_AT = 10;
/** Or after this long, whichever comes first. */
const FLUSH_INTERVAL_MS = 20000;
/** Hard cap so a long offline stretch cannot grow without bound. */
const MAX_QUEUE = 300;
/** Longer than this and a prop is almost certainly free text, not an enum. */
const MAX_PROP_CHARS = 64;

/** A new session after this much time backgrounded. Matches common convention. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

let queue = [];
let flushTimer = null;
let flushing = false;
let hydrated = false;

let sessionId = null;
let lastActivityAt = 0;

const APP_VERSION = Constants.expoConfig?.version ?? null;
const BUILD =
  Constants.expoConfig?.ios?.buildNumber
  ?? Constants.expoConfig?.android?.versionCode?.toString()
  ?? null;

/** Random enough to group one run's events; not a security token. */
function newSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Session id for the current run, rotating after SESSION_TIMEOUT_MS of
 * inactivity so "sessions" in the views mean what people expect.
 */
function currentSessionId() {
  const now = Date.now();
  if (!sessionId || now - lastActivityAt > SESSION_TIMEOUT_MS) {
    sessionId = newSessionId();
  }
  lastActivityAt = now;
  return sessionId;
}

/** Identifiers and enums only — see the privacy note above. */
function sanitizeProps(props) {
  if (!props || typeof props !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (typeof value === 'string') {
      if (value.length <= MAX_PROP_CHARS) out[key] = value;
      // Longer strings are dropped rather than truncated: a truncated card
      // front is still card content.
    }
  }
  return out;
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length) {
      queue = parsed.slice(-MAX_QUEUE).concat(queue);
    }
  } catch {
    /* a corrupt queue is not worth failing over */
  }
}

async function persist() {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    /* best effort */
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    AnalyticsService.flush().catch(() => {});
  }, FLUSH_INTERVAL_MS);
}

class AnalyticsService {
  /**
   * Record one event. Safe to call from render paths — it does no network work
   * inline and swallows every error.
   *
   * @param {string} event  snake_case name; must match a name the views know
   * @param {object} [props] identifiers and enums only
   */
  static track(event, props = {}) {
    if (!event) return;
    try {
      queue.push({
        session_id: currentSessionId(),
        event,
        props: sanitizeProps(props),
        app_version: APP_VERSION,
        build: BUILD,
        platform: Platform.OS,
        occurred_at: new Date().toISOString(),
      });
      if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);

      persist().catch(() => {});
      if (queue.length >= FLUSH_AT) this.flush().catch(() => {});
      else scheduleFlush();
    } catch {
      /* analytics must never break a user flow */
    }
  }

  /**
   * Record an event at most once per install. For milestones where the first
   * occurrence is the signal — `first_study_started` closes the onboarding
   * funnel, and counting every later session there would make the funnel lie.
   */
  static async trackOnce(event, props = {}) {
    if (!event) return;
    const key = `@tidbit:analytics_once:${event}`;
    try {
      if (await AsyncStorage.getItem(key)) return;
      await AsyncStorage.setItem(key, '1');
      this.track(event, props);
    } catch {
      /* if the flag cannot be read, skip rather than risk double-counting */
    }
  }

  /**
   * Send everything buffered. Called on the size threshold, the timer, and
   * whenever the app backgrounds.
   */
  static async flush() {
    if (flushing) return;
    await hydrate();
    if (!SUPABASE_CONFIGURED || queue.length === 0) return;

    flushing = true;
    const batch = queue;
    queue = [];

    try {
      // Resolved at flush time, not track time: events buffered before sign-in
      // still belong to the session that produced them, and attributing them to
      // whoever later logs in on this device would be wrong.
      const userId = AuthService.getUserId() || null;
      const rows = batch.map((e) => ({ ...e, user_id: e.user_id ?? userId }));

      const { error } = await supabase.from('app_events').insert(rows);
      if (error) throw error;
      await persist();
    } catch (err) {
      // Put them back — most likely offline. Newest events win if we overflow.
      queue = batch.concat(queue).slice(-MAX_QUEUE);
      await persist();
      if (__DEV__) console.warn('[Analytics] flush failed:', err.message);
    } finally {
      flushing = false;
    }
  }

  /**
   * Stamp the events buffered before sign-in with the user who just signed in.
   * Only rows still lacking a user_id are touched, so a shared device does not
   * retroactively attribute a previous person's session.
   */
  static attributeQueuedTo(userId) {
    if (!userId) return;
    queue = queue.map((e) => (e.user_id ? e : { ...e, user_id: userId }));
    persist().catch(() => {});
  }

  /** True when enough time has passed that this counts as a new session. */
  static isNewSession() {
    return !sessionId || Date.now() - lastActivityAt > SESSION_TIMEOUT_MS;
  }

  /** Test/debug helper — not used in app code. */
  static pendingCount() {
    return queue.length;
  }
}

export { AnalyticsService };
export default AnalyticsService;
