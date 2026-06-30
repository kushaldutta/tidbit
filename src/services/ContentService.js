import { StorageService } from './StorageService';
import { SpacedRepetitionService } from './SpacedRepetitionService';
import { ClassService } from './ClassService';
import API_CONFIG from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AP_CATEGORY_BY_ID, AP_CATEGORY_IDS } from '../config/courseCatalog';

/**
 * Generate a stable hash-based ID for a tidbit
 * Same content (text + category) will always produce the same ID
 */
function generateTidbitId(text, category) {
  // Create a simple hash from the content
  const content = `${text}|${category}`;
  let hash = 0;
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive hex string
  const hashStr = Math.abs(hash).toString(16);
  return `tidbit_${hashStr}`;
}

// Fallback tidbits (used if JSON file fails to load)
const FALLBACK_TIDBITS = {
  'math-54': [],
  'cs161': [],
  'cs61c': [],
  'cs-61a': [],
  'cs61b': [],
  'cs188': [],
  'math51': [],
  'math52': [],
  'math53': [],
  'math55': [],
  'cs70': [],
  'nuc150': [],
  'nuc155': [],
  'data100': [],
  'data-8': [],
  'stat134': [],
  'econ-1': [],
  'econ100a': [],
  'econ100b': [],
  'psych1': [],
  'mcb102': [],
  'phys7a': [],
  'phys7b': [],
  'agrs28': [],
  'math128a': [],
  'physics137a': [],
  'bio1a': [],
  'bio1b': [],
  'chem1a': [],
  'chem1b': [],
  'eecs16a': [],
  'eecs16b': [],
  history: [
    "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid of Giza.",
    "Oxford University is older than the Aztec Empire—teaching began there in 1096.",
    "Napoleon was actually average height for his time—the 'short' myth came from British propaganda.",
    "The shortest war in history lasted 38-45 minutes: Britain vs. Zanzibar in 1896.",
    "Julius Caesar was kidnapped by pirates and joked that he'd have them executed—which he later did.",
  ],
  science: [
    "Lightning strikes the Earth about 100 times per second.",
    "There are more possible games of chess than atoms in the observable universe.",
    "A day on Venus is longer than its year—Venus rotates slower than it orbits the sun.",
    "Dolphins have names for each other—they use signature whistles.",
    "The human nose can detect over 1 trillion different scents.",
  ],
  miscellaneous: [
    "The first computer bug was an actual bug—a moth found in Harvard's Mark II computer in 1947.",
    "A single Google search uses about 0.3 watt-hours of energy, equivalent to turning on a 60W light bulb for 17 seconds.",
    "The word 'robot' comes from the Czech word 'robota', meaning forced labor or work.",
    "The first email was sent in 1971 by Ray Tomlinson, who also chose the @ symbol for email addresses.",
    "Your smartphone has more computing power than the computers that sent humans to the moon.",
    "The 'Dunning-Kruger effect' describes how people with low ability overestimate their competence.",
    "It takes about 66 days on average to form a new habit, not the commonly cited 21 days.",
    "Your brain uses about 20% of your body's total energy, despite being only 2% of your body weight.",
    "The 'mere exposure effect' means you tend to prefer things you've seen before, even if you don't remember seeing them.",
    "Multitasking is a myth—your brain actually switches rapidly between tasks, reducing efficiency by up to 40%.",
    "Compound interest is called the 'eighth wonder of the world'—money invested at 7% doubles every 10 years.",
    "The term 'bull market' comes from how bulls attack—thrusting upward with their horns.",
    "Warren Buffett reads 80% of his day, believing knowledge builds up like compound interest.",
    "The first credit card was introduced in 1950 by Diners Club, made of cardboard.",
    "Inflation means your money loses about 2-3% of its purchasing power each year on average.",
    "Octopuses have three hearts and blue blood.",
    "A group of flamingos is called a 'flamboyance'.",
    "Bananas are berries, but strawberries aren't.",
    "Honey never spoils—archaeologists have found 3000-year-old honey that's still edible.",
    "Wombat poop is cube-shaped to prevent it from rolling away.",
    "Laughing for 15 minutes burns about 40 calories.",
    "Your body produces about 1.5 liters of saliva per day.",
    "The human heart beats about 100,000 times per day.",
    "You're taller in the morning—your spine compresses throughout the day.",
    "Exercise boosts brain function by increasing blood flow and oxygen to the brain.",
  ],
};

// Tidbits loaded from server or cache (will be populated in init())
let TIDBITS = FALLBACK_TIDBITS;
let CONTENT_VERSION = null;
let LAST_VERSION_CHECK = null;

// Cache keys
const CACHE_KEYS = {
  TIDBITS: 'cached_tidbits',
  VERSION: 'cached_content_version',
  LAST_FETCH: 'content_last_fetch',
  LAST_VERSION_CHECK: 'content_last_version_check',
};

class ContentService {
  /**
   * Fetch tidbits from server
   */
  static async fetchFromServer() {
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TIDBITS}`;
      console.log('[CONTENT_SERVICE] Fetching tidbits from server:', url);
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });
      
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        timeoutPromise,
      ]);

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.tidbits) {
        // Cache the tidbits
        await AsyncStorage.setItem(CACHE_KEYS.TIDBITS, JSON.stringify(data.tidbits));
        await AsyncStorage.setItem(CACHE_KEYS.VERSION, data.version || '');
        await AsyncStorage.setItem(CACHE_KEYS.LAST_FETCH, new Date().toISOString());
        
        TIDBITS = data.tidbits;
        CONTENT_VERSION = data.version;
        
        console.log('[CONTENT_SERVICE] Successfully fetched tidbits from server (version:', data.version, ')');
        return true;
      } else {
        throw new Error('Invalid server response format');
      }
    } catch (error) {
      console.warn('[CONTENT_SERVICE] Failed to fetch from server:', error.message);
      return false;
    }
  }

  /**
   * Load tidbits from cache
   */
  static async loadFromCache() {
    try {
      const cachedTidbits = await AsyncStorage.getItem(CACHE_KEYS.TIDBITS);
      const cachedVersion = await AsyncStorage.getItem(CACHE_KEYS.VERSION);
      
      if (cachedTidbits) {
        const tidbitsData = JSON.parse(cachedTidbits);
        if (tidbitsData && typeof tidbitsData === 'object') {
          TIDBITS = tidbitsData;
          CONTENT_VERSION = cachedVersion;
          console.log('[CONTENT_SERVICE] Loaded tidbits from cache (version:', cachedVersion, ')');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('[CONTENT_SERVICE] Failed to load from cache:', error.message);
      return false;
    }
  }

  /**
   * Check if cached content is still valid
   */
  static async isCacheValid() {
    try {
      const lastFetch = await AsyncStorage.getItem(CACHE_KEYS.LAST_FETCH);
      if (!lastFetch) return false;
      
      const lastFetchTime = new Date(lastFetch).getTime();
      const now = Date.now();
      const age = now - lastFetchTime;
      
      // Cache is valid if less than CACHE_DURATION old
      return age < API_CONFIG.CACHE_DURATION;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if content version has changed on server
   */
  static async checkVersion() {
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VERSION}`;
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000);
      });
      
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url),
        timeoutPromise,
      ]);
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (data.success && data.version) {
        const cachedVersion = await AsyncStorage.getItem(CACHE_KEYS.VERSION);
        
        if (cachedVersion !== data.version) {
          console.log('[CONTENT_SERVICE] New content version available:', data.version);
          return true; // New version available
        }
      }
      return false;
    } catch (error) {
      console.warn('[CONTENT_SERVICE] Failed to check version:', error.message);
      return false;
    }
  }

  /**
   * Try to load from local JSON file (fallback)
   */
  static async loadFromLocalFile() {
    try {
      const tidbitsData = require('../../content/tidbits.json');
      if (tidbitsData && typeof tidbitsData === 'object') {
        TIDBITS = tidbitsData;
        console.log('[CONTENT_SERVICE] Loaded tidbits from local JSON file');
        return true;
      }
      return false;
    } catch (error) {
      console.warn('[CONTENT_SERVICE] Failed to load local JSON:', error.message);
      return false;
    }
  }

  /**
   * Initialize content service
   * Priority: Server > Cache > Local File > Fallback
   */
  static async init() {
    console.log('[CONTENT_SERVICE] Initializing content service...');
    
    // First, try to load from cache (fastest)
    const cacheLoaded = await this.loadFromCache();
    const cacheValid = await this.isCacheValid();
    
    if (cacheLoaded && cacheValid) {
      console.log('[CONTENT_SERVICE] Using cached content');
      
      // Check for updates in background (non-blocking)
      this.checkVersion().then(hasUpdate => {
        if (hasUpdate) {
          console.log('[CONTENT_SERVICE] New version detected! Auto-refreshing content...');
          // Auto-refresh when new version is detected
          this.fetchFromServer().then(success => {
            if (success) {
              console.log('[CONTENT_SERVICE] Content auto-refreshed successfully');
            } else {
              console.warn('[CONTENT_SERVICE] Auto-refresh failed, will retry later');
            }
          });
        }
      });
      
      return;
    }

    // Cache invalid or missing, try to fetch from server
    const serverFetched = await this.fetchFromServer();
    
    if (serverFetched) {
      console.log('[CONTENT_SERVICE] Content loaded from server');
      return;
    }

    // Server failed, try local file
    const localLoaded = await this.loadFromLocalFile();
    
    if (localLoaded) {
      console.log('[CONTENT_SERVICE] Content loaded from local file (server unavailable)');
      return;
    }

    // All else failed, use fallback
    console.warn('[CONTENT_SERVICE] All loading methods failed, using fallback tidbits');
    TIDBITS = FALLBACK_TIDBITS;
  }

  /**
   * Force refresh content from server
   */
  static async refresh() {
    console.log('[CONTENT_SERVICE] Force refreshing content from server...');
    const success = await this.fetchFromServer();
    return success;
  }

  /**
   * Clear all cached content (forces fresh fetch on next init)
   */
  static async clearCache() {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.TIDBITS);
      await AsyncStorage.removeItem(CACHE_KEYS.VERSION);
      await AsyncStorage.removeItem(CACHE_KEYS.LAST_FETCH);
      await AsyncStorage.removeItem(CACHE_KEYS.LAST_VERSION_CHECK);
      TIDBITS = FALLBACK_TIDBITS;
      CONTENT_VERSION = null;
      console.log('[CONTENT_SERVICE] Cache cleared');
      return true;
    } catch (error) {
      console.error('[CONTENT_SERVICE] Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Get all tidbits for a specific category
   * @param {string} category - Category ID
   * @returns {string[]} Array of tidbit texts
   */
  static getTidbitsByCategory(category) {
    return TIDBITS[category] || [];
  }

  static CATEGORY_DECK_PREFIX = 'category:';

  static categoryDeckId(categoryId) {
    return `${this.CATEGORY_DECK_PREFIX}${categoryId}`;
  }

  static parseCategoryDeckId(deckId) {
    if (!deckId || !String(deckId).startsWith(this.CATEGORY_DECK_PREFIX)) return null;
    return String(deckId).slice(this.CATEGORY_DECK_PREFIX.length);
  }

  /** Flashcard rows for Quiz / Recall / Match from bundled tidbit content. */
  static getStudyCardsForCategory(categoryId) {
    const items = this.getTidbitsByCategory(categoryId);
    return items.map((item) => {
      const text = typeof item === 'string' ? item : item?.text;
      const term = typeof item === 'string' ? null : (item?.term || null);
      if (!text?.trim()) return null;
      const id = this.generateTidbitId(text, categoryId);
      const deckId = this.categoryDeckId(categoryId);
      if (term?.trim()) {
        return { id, front: term.trim(), back: text.trim(), deck_id: deckId };
      }
      const trimmed = text.trim();
      return { id, front: trimmed, back: trimmed, deck_id: deckId };
    }).filter(Boolean);
  }

  /** Preset DB decks plus virtual decks when tidbits exist but no preset row. */
  static buildClassStudyDecks(categoryIds, matchedPresets = []) {
    const presetSlugs = new Set(matchedPresets.map((p) => p.slug).filter(Boolean));
    const decks = [...matchedPresets];
    for (const catId of categoryIds) {
      if (presetSlugs.has(catId)) continue;
      const count = this.getTidbitsByCategory(catId).length;
      if (count === 0) continue;
      decks.push({
        id: this.categoryDeckId(catId),
        title: this.formatCategoryName(catId),
        card_count: count,
        cover_emoji: '📚',
      });
    }
    return decks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  /** Enrolled class slugs first; fall back to legacy selectedCategories. */
  static async resolveActiveCategories() {
    await ClassService.ensureCategoriesSyncedToEnrollments();
    const enrolled = await ClassService.getEnrollmentCategoryIds();
    if (enrolled.length > 0) return enrolled;
    return StorageService.getSelectedCategories();
  }

  static async getPresetDeckIdForSlug(categorySlug) {
    if (!categorySlug) return null;
    try {
      const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
      if (!SUPABASE_CONFIGURED) return null;
      const { data } = await supabase
        .from('decks')
        .select('id')
        .eq('slug', categorySlug)
        .is('owner_id', null)
        .maybeSingle();
      return data?.id || null;
    } catch {
      return null;
    }
  }

  static async getCardAsTidbit(cardId) {
    if (!cardId) return null;
    try {
      const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
      if (!SUPABASE_CONFIGURED) return null;
      const { data: card, error } = await supabase
        .from('cards')
        .select('id, deck_id, front, back')
        .eq('id', cardId)
        .maybeSingle();
      if (error || !card) return null;

      const { data: deck } = await supabase
        .from('decks')
        .select('slug')
        .eq('id', card.deck_id)
        .maybeSingle();

      const category = deck?.slug || card.deck_id;
      const term = card.front !== card.back ? card.front : null;
      return {
        id: card.id,
        text: card.back,
        term,
        category,
        deckId: card.deck_id,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('[CONTENT_SERVICE] getCardAsTidbit failed:', err.message);
      return null;
    }
  }

  static async getRandomCardFromCategorySlug(categorySlug) {
    const deckId = await this.getPresetDeckIdForSlug(categorySlug);
    if (!deckId) return null;
    return this.getRandomCardFromDecks([deckId], categorySlug);
  }

  static async getRandomTidbit() {
    const categories = await this.resolveActiveCategories();
    if (categories.length === 0) return null;

    const shuffled = [...categories].sort(() => Math.random() - 0.5);
    for (const category of shuffled) {
      const deckTidbit = await this.getRandomCardFromCategorySlug(category);
      if (deckTidbit) return deckTidbit;

      const categoryTidbits = TIDBITS[category] || [];
      if (categoryTidbits.length > 0) {
        const randomTidbit = categoryTidbits[Math.floor(Math.random() * categoryTidbits.length)];
        const text = typeof randomTidbit === 'string' ? randomTidbit : randomTidbit.text;
        const term = typeof randomTidbit === 'string' ? null : (randomTidbit.term || null);
        const id = generateTidbitId(text, category);
        return {
          id,
          text,
          term,
          category,
          timestamp: new Date().toISOString(),
        };
      }
    }

    return null;
  }

  /**
   * Generate or retrieve tidbit ID from content
   * Useful for backward compatibility or when you only have text/category
   */
  static generateTidbitId(text, category) {
    return generateTidbitId(text, category);
  }

  /**
   * Ensure a tidbit has an ID (for backward compatibility)
   * If tidbit already has an ID, return as-is
   * Otherwise, generate one from text and category
   */
  static ensureTidbitHasId(tidbit) {
    if (!tidbit) return null;
    
    // If tidbit already has an ID, return as-is
    if (tidbit.id) {
      return tidbit;
    }
    
    // Generate ID from content (backward compatibility)
    return {
      ...tidbit,
      id: generateTidbitId(tidbit.text, tidbit.category),
    };
  }

  /**
   * Get a tidbit by its ID
   * Searches through all tidbits to find one matching the given ID
   * Also checks if the tidbit is in a selected category
   * @param {string} tidbitId - The tidbit ID to find
   * @param {boolean} requireSelectedCategory - If true, only return tidbits from selected categories (default: true)
   * @returns {Promise<Object|null>} The tidbit object or null if not found
   */
  static async getTidbitById(tidbitId, requireSelectedCategory = true) {
    if (!tidbitId) return null;

    const activeCategories = requireSelectedCategory
      ? await this.resolveActiveCategories()
      : null;
    const categoriesToSearch = activeCategories ?? Object.keys(TIDBITS);

    for (const category of categoriesToSearch) {
      const categoryTidbits = TIDBITS[category] || [];

      for (const tidbitItem of categoryTidbits) {
        const text = typeof tidbitItem === 'string' ? tidbitItem : tidbitItem.text;
        const term = typeof tidbitItem === 'string' ? null : (tidbitItem.term || null);
        const id = generateTidbitId(text, category);
        if (id === tidbitId) {
          return {
            id,
            text,
            term,
            category,
            timestamp: new Date().toISOString(),
          };
        }
      }
    }

    const cardTidbit = await this.getCardAsTidbit(tidbitId);
    if (!cardTidbit) return null;
    if (activeCategories && !activeCategories.includes(cardTidbit.category)) {
      return null;
    }
    return cardTidbit;
  }

  /**
   * Discovery tidbit for "Get Tidbit Now" — excludes due/review cards, prefers unseen.
   */
  static async getDiscoveryTidbit() {
    const categories = await this.resolveActiveCategories();
    if (!categories.length) return null;

    const { QueueService } = require('./QueueService');
    const { CardLearningService } = require('./CardLearningService');
    const eligible = await QueueService.loadEligibleCards(categories);
    const unseen = [];
    const seenNotDue = [];

    for (const card of eligible) {
      const state = await CardLearningService.getEffectiveState(card, card.categoryId);
      // Skip anything awaiting or ready for review (including 1h post-"I knew it" window)
      if (state?.stage === 'introduced') continue;
      if (state && CardLearningService.isReviewQueueEligible(state)) continue;

      const tidbit = {
        id: card.id,
        text: card.back,
        term: card.front !== card.back ? card.front : null,
        category: card.categoryId,
        deckId: card.deck_id || card.deckId,
        timestamp: new Date().toISOString(),
      };

      if (!state || state.stage === 'new') unseen.push(tidbit);
      else seenNotDue.push(tidbit);
    }

    const pool = unseen.length > 0 ? unseen : seenNotDue;
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Get a smart tidbit with 50/50 chance between due tidbits and random selection
   * This encourages both learning new content and reviewing previously seen tidbits
   * @returns {Promise<Object|null>} A tidbit object or null
   */
  static async getSmartTidbit() {
    try {
      const activeCategories = await this.resolveActiveCategories();

      if (activeCategories.length === 0) {
        console.log('[SMART_TIDBIT] No enrolled classes or categories');
        return null;
      }

      // 50% chance to show due tidbit (if available), 50% chance to show random
      const shouldShowDueTidbit = Math.random() < 0.5;

      const { QueueService } = require('./QueueService');
      const queue = await QueueService.buildQueue({
        categoryIds: activeCategories,
        limit: 20,
        includeNew: false,
      });
      const filteredDueTidbits = queue.due;
      const { isUuid } = require('./CardLearningService');
      const uuidDue = filteredDueTidbits.filter((t) => isUuid(t.id));
      const duePool = uuidDue.length > 0 ? uuidDue : filteredDueTidbits;

      if (shouldShowDueTidbit && duePool.length > 0) {
        const randomDueTidbit = duePool[Math.floor(Math.random() * duePool.length)];
        console.log(`[SMART_TIDBIT] 50/50 selected: Due tidbit (${duePool.length} due in active categories)`);
        return randomDueTidbit;
      }

      if (shouldShowDueTidbit && duePool.length === 0) {
        console.log(`[SMART_TIDBIT] 50/50 selected: Due tidbit, but none available in selected categories, showing random instead`);
      } else {
        console.log('[SMART_TIDBIT] 50/50 selected: Random tidbit (new learning)');
      }
      return await this.getRandomTidbit();
    } catch (error) {
      console.error('[SMART_TIDBIT] Error in getSmartTidbit, falling back to random:', error);
      // Fall back to random on error
      return await this.getRandomTidbit();
    }
  }

  static getAvailableCategories() {
    const ids = new Set([...Object.keys(TIDBITS), ...AP_CATEGORY_IDS]);
    return [...ids].map((key) => ({
      id: key,
      name: this.formatCategoryName(key),
      description: this.getCategoryDescription(key),
    }));
  }

  static formatCategoryName(categoryId) {
    const apMeta = AP_CATEGORY_BY_ID[categoryId];
    if (apMeta) return apMeta.name;

    const names = {
      'math-54': 'MATH 54',
      'cs-61a': 'CS 61A',
      'cs61b': 'CS 61B',
      'cs161': 'CS 161',
      'cs61c': 'CS 61C',
      'cs188': 'CS 188',
      'math51': 'MATH 51',
      'math52': 'MATH 52',
      'math53': 'MATH 53',
      'math55': 'MATH 55',
      'cs70': 'CS 70',
      'nuc150': 'NUCENG 150',
      'nuc155': 'NUCENG 155',
      'data-8': 'Data 8',
      'data100': 'DATA 100',
      'stat134': 'STAT 134',
      'econ-1': 'ECON 1',
      'econ100a': 'ECON 100A',
      'econ100b': 'ECON 100B',
      'psych1': 'PSYCH 1',
      'mcb102': 'MCB 102',
      'phys7a': 'PHYS 7A',
      'phys7b': 'PHYS 7B',
      'agrs28': 'AGRS 28',
      'math128a': 'MATH 128A',
      'physics137a': 'PHYSICS 137A',
      'bio1a': 'BIO 1A',
      'bio1b': 'BIO 1B',
      'chem1a': 'CHEM 1A',
      'chem1b': 'CHEM 1B',
      'eecs16a': 'EECS 16A',
      'eecs16b': 'EECS 16B',
      history: 'History',
      science: 'Science',
      'berkeley-fun-facts': 'Berkeley Fun Facts',
      miscellaneous: 'Miscellaneous',
    };
    return names[categoryId] || categoryId;
  }

  /**
   * NEW (W3): Load cards from a Supabase deck and return them in the same
   * `{ id, text, category }` shape the rest of the app expects. This lets
   * us migrate the notification + study flows over to the decks/cards model
   * without rewriting the world.
   *
   * Lazy import of supabase to avoid pulling auth dependencies into the
   * pre-login surface area.
   */
  static async getDeckCards(deckId) {
    if (!deckId) return [];
    try {
      const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
      if (!SUPABASE_CONFIGURED) return [];
      const { data, error } = await supabase
        .from('cards')
        .select('id, deck_id, front, back, meta')
        .eq('deck_id', deckId);
      if (error) {
        console.warn('[CONTENT_SERVICE] getDeckCards error:', error.message);
        return [];
      }
      return (data || []).map((c) => ({
        id: c.id,
        text: c.back,
        prompt: c.front,
        category: c.deck_id,
        deckId: c.deck_id,
      }));
    } catch (err) {
      console.warn('[CONTENT_SERVICE] getDeckCards failed:', err.message);
      return [];
    }
  }

  /**
   * NEW (W3): Pick a random card from a set of deck IDs. Mirrors the
   * shape of getRandomTidbit() so HomeScreen and friends can swap in.
   */
  static async getRandomCardFromDecks(deckIds, categorySlug = null) {
    if (!deckIds?.length) return null;
    try {
      const { supabase, SUPABASE_CONFIGURED } = require('../config/supabase');
      if (!SUPABASE_CONFIGURED) return null;
      const { data, error } = await supabase
        .from('cards')
        .select('id, deck_id, front, back')
        .in('deck_id', deckIds)
        .limit(500); // soft cap; spaced repetition handles per-user pruning
      if (error || !data?.length) return null;
      const card = data[Math.floor(Math.random() * data.length)];
      return {
        id: card.id,
        text: card.back,
        term: card.front !== card.back ? card.front : null,
        category: categorySlug || card.deck_id,
        deckId: card.deck_id,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('[CONTENT_SERVICE] getRandomCardFromDecks failed:', err.message);
      return null;
    }
  }

  static getCategoryDescription(categoryId) {
    const apMeta = AP_CATEGORY_BY_ID[categoryId];
    if (apMeta) return apMeta.description;

    const descriptions = {
      'math-54': 'Linear algebra and differential equations',
      'cs-61a': 'Structure and Interpretation of Computer Programs',
      'cs61b': 'Data Structures and Algorithms',
      'cs161': 'Computer Security',
      'cs61c': 'Great Ideas in Computer Architecture (Machine Structures)',
      'cs188': 'Introduction to Artificial Intelligence',
      'math51': 'Calculus I',
      'math52': 'Calculus II',
      'math53': 'Multivariable Calculus',
      'math55': 'Discrete Mathematics',
      'cs70': 'Discrete Mathematics and Probability Theory',
      'nuc150': 'Introduction to Nuclear Reactor Theory',
      'nuc155': 'Introduction to Numerical Simulations in Radiation Transport',
      'data-8': 'Foundations of Data Science',
      'data100': 'Principles and Techniques of Data Science',
      'stat134': 'Concepts of Probability',
      'econ-1': 'Introduction to Economics',
      'econ100a': 'Microeconomics',
      'econ100b': 'Macroeconomics',
      'psych1': 'General Psychology',
      'mcb102': 'Biochemistry and Molecular Biology',
      'phys7a': 'Physics for Scientists and Engineers I',
      'phys7b': 'Physics for Scientists and Engineers II',
      'agrs28': 'Greek and Roman Myths',
      'math128a': 'Numerical Analysis',
      'physics137a': 'Quantum Mechanics',
      'bio1a': 'General Biology — cells, genetics, and physiology',
      'bio1b': 'General Biology — evolution, ecology, and organismal biology',
      'chem1a': 'General Chemistry — atoms, bonding, gases, and thermochemistry',
      'chem1b': 'General Chemistry — kinetics, equilibrium, acids/bases, and electrochemistry',
      'eecs16a': 'Designing Information Devices and Systems I',
      'eecs16b': 'Designing Information Devices and Systems II',
      history: 'Fascinating historical moments',
      science: 'Scientific discoveries and phenomena',
      'berkeley-fun-facts': 'Interesting facts about UC Berkeley',
      miscellaneous: 'Tech, psychology, finance, fun facts, and health',
    };
    return descriptions[categoryId] || '';
  }
}

export { ContentService };

