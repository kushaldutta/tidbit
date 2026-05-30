/**
 * EntitlementService — single source of truth for Premium status.
 *
 * Wraps react-native-purchases so the rest of the app never imports
 * it directly. If RevenueCat is unavailable (simulator, bad network)
 * we fail open (returns false) so the app still works.
 *
 * Entitlement identifier in RevenueCat dashboard: "premium"
 */
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import { AuthService } from './AuthService';

const IOS_KEY     = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY     || '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

const ENTITLEMENT_ID = 'Tidbit - Never Cram Again! Premium';

class EntitlementService {
  static _initialized = false;
  static _premiumCache = false;
  static _listeners = new Set();

  /** Notify all usePremium hooks of an update */
  static _notify(value) {
    this._premiumCache = value;
    this._listeners.forEach((fn) => fn(value));
  }

  /** Subscribe to premium status changes. Returns an unsubscribe function. */
  static subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** Call once from App.js after auth is resolved. */
  static async init() {
    try {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
      if (!apiKey || apiKey.startsWith('appl_...') || apiKey.startsWith('goog_...')) {
        console.warn('[EntitlementService] RevenueCat API key not configured — purchases disabled');
        return;
      }

      Purchases.configure({ apiKey });
      this._initialized = true;
      console.log('[EntitlementService] Initialized');

      // React to any subscription change in real time (purchase, renewal, cancellation)
      Purchases.addCustomerInfoUpdateListener((info) => {
        const active = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
        console.log('[EntitlementService] CustomerInfo update — premium:', active);
        this._notify(active);
      });

      // Tie purchase history to the logged-in Supabase user
      const userId = AuthService.getUserId();
      if (userId) await this.identifyUser(userId);
    } catch (err) {
      console.warn('[EntitlementService] init error:', err.message);
    }
  }

  /** Call after sign-in so RevenueCat links purchases to the user. */
  static async identifyUser(userId) {
    if (!this._initialized) return;
    try {
      await Purchases.logIn(userId);
    } catch (err) {
      console.warn('[EntitlementService] identifyUser error:', err.message);
    }
  }

  /** Call on sign-out. */
  static async reset() {
    if (!this._initialized) return;
    try {
      await Purchases.logOut();
    } catch (err) {
      console.warn('[EntitlementService] reset error:', err.message);
    }
  }

  /**
   * Returns true if the current user has an active Premium entitlement.
   * Always returns false if RevenueCat isn't initialized.
   */
  static async isPremium() {
    if (!this._initialized) return false;
    try {
      const info = await Purchases.getCustomerInfo();
      const active = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
      this._notify(active);
      return active;
    } catch (err) {
      console.warn('[EntitlementService] isPremium error:', err.message);
      return this._premiumCache; // return last known value on error
    }
  }

  /**
   * Fetch available offerings from RevenueCat.
   * Returns the current offering or null.
   */
  static async getOffering() {
    if (!this._initialized) return null;
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current ?? null;
    } catch (err) {
      console.warn('[EntitlementService] getOffering error:', err.message);
      return null;
    }
  }

  /**
   * Purchase a package. Throws on failure (caller should catch and show error).
   * Returns updated CustomerInfo on success.
   */
  static async purchasePackage(pkg) {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  }

  /**
   * Restore previous purchases (required by App Store guidelines).
   * Returns true if premium was restored.
   */
  static async restorePurchases() {
    if (!this._initialized) return false;
    try {
      const info = await Purchases.restorePurchases();
      return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (err) {
      console.warn('[EntitlementService] restorePurchases error:', err.message);
      return false;
    }
  }
}

export { EntitlementService };
export default EntitlementService;
