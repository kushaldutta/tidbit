import { StorageService } from './StorageService';
import { SpacedRepetitionService } from './SpacedRepetitionService';
import API_CONFIG from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
          console.log('[CONTENT_SERVICE] New version available, will fetch on next check');
          // Could trigger a background refresh here if needed
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

  static async getRandomTidbit() {
    const selectedCategories = await StorageService.getSelectedCategories();
    
    if (selectedCategories.length === 0) {
      return null;
    }

    // Pick a random category from user's selections
    const randomCategory = selectedCategories[Math.floor(Math.random() * selectedCategories.length)];
    const categoryTidbits = TIDBITS[randomCategory] || [];

    if (categoryTidbits.length === 0) {
      return null;
    }

    // Pick a random tidbit from that category
    const randomTidbit = categoryTidbits[Math.floor(Math.random() * categoryTidbits.length)];

    // Generate stable ID based on content
    const id = generateTidbitId(randomTidbit, randomCategory);

    return {
      id,
      text: randomTidbit,
      category: randomCategory,
      timestamp: new Date().toISOString(),
    };
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

    const selectedCategories = requireSelectedCategory 
      ? await StorageService.getSelectedCategories()
      : Object.keys(TIDBITS);
    
    // Search through categories (selected or all)
    for (const category of selectedCategories) {
      const categoryTidbits = TIDBITS[category] || [];
      
      for (const tidbitText of categoryTidbits) {
        const id = generateTidbitId(tidbitText, category);
        if (id === tidbitId) {
          return {
            id,
            text: tidbitText,
            category,
            timestamp: new Date().toISOString(),
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Get a smart tidbit that prioritizes due tidbits for spaced repetition
   * First checks for due tidbits (filtered by user's selected categories),
   * then falls back to random selection
   * @returns {Promise<Object|null>} A tidbit object or null
   */
  static async getSmartTidbit() {
    try {
      const selectedCategories = await StorageService.getSelectedCategories();
      
      if (selectedCategories.length === 0) {
        console.log('[SMART_TIDBIT] No categories selected');
        return null;
      }

      // First, check for due tidbits
      const dueTidbitIds = await SpacedRepetitionService.getDueTidbits();
      
      if (dueTidbitIds.length > 0) {
        // Filter due tidbits by user's selected categories
        // First, try to find tidbits (searching all categories to find by ID)
        // Then filter by selected categories
        const filteredDueTidbits = [];
        
        for (const tidbitId of dueTidbitIds) {
          // Search all categories to find the tidbit by ID
          const tidbit = await this.getTidbitById(tidbitId, false);
          // Then check if it's in a selected category
          if (tidbit && selectedCategories.includes(tidbit.category)) {
            filteredDueTidbits.push(tidbit);
          }
        }
        
        if (filteredDueTidbits.length > 0) {
          // Pick a random due tidbit from filtered list
          const randomDueTidbit = filteredDueTidbits[Math.floor(Math.random() * filteredDueTidbits.length)];
          console.log(`[SMART_TIDBIT] Selected due tidbit: ${randomDueTidbit.id} (${filteredDueTidbits.length}/${dueTidbitIds.length} due in selected categories)`);
          return randomDueTidbit;
        } else {
          console.log(`[SMART_TIDBIT] ${dueTidbitIds.length} due tidbits, but none in selected categories`);
        }
      }
      
      // No due tidbits in selected categories, fall back to random selection
      console.log('[SMART_TIDBIT] No due tidbits in selected categories, selecting random');
      return await this.getRandomTidbit();
    } catch (error) {
      console.error('[SMART_TIDBIT] Error in getSmartTidbit, falling back to random:', error);
      // Fall back to random on error
      return await this.getRandomTidbit();
    }
  }

  static getAvailableCategories() {
    return Object.keys(TIDBITS).map(key => ({
      id: key,
      name: this.formatCategoryName(key),
      description: this.getCategoryDescription(key),
    }));
  }

  static formatCategoryName(categoryId) {
    const names = {
      'math-54': 'MATH 54',
      history: 'History',
      science: 'Science',
      'berkeley-fun-facts': 'Berkeley Fun Facts',
      miscellaneous: 'Miscellaneous',
    };
    return names[categoryId] || categoryId;
  }

  static getCategoryDescription(categoryId) {
    const descriptions = {
      'math-54': 'Linear algebra and differential equations',
      history: 'Fascinating historical moments',
      science: 'Scientific discoveries and phenomena',
      'berkeley-fun-facts': 'Interesting facts about UC Berkeley',
      miscellaneous: 'Tech, psychology, finance, fun facts, and health',
    };
    return descriptions[categoryId] || '';
  }
}

export { ContentService };

