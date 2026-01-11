import { StorageService } from './StorageService';

// Sample tidbits organized by category
const TIDBITS = {
  tech: [
    "The first computer bug was an actual bug—a moth found in Harvard's Mark II computer in 1947.",
    "A single Google search uses about 0.3 watt-hours of energy, equivalent to turning on a 60W light bulb for 17 seconds.",
    "The word 'robot' comes from the Czech word 'robota', meaning forced labor or work.",
    "The first email was sent in 1971 by Ray Tomlinson, who also chose the @ symbol for email addresses.",
    "Your smartphone has more computing power than the computers that sent humans to the moon.",
  ],
  psychology: [
    "The 'Dunning-Kruger effect' describes how people with low ability overestimate their competence.",
    "It takes about 66 days on average to form a new habit, not the commonly cited 21 days.",
    "Your brain uses about 20% of your body's total energy, despite being only 2% of your body weight.",
    "The 'mere exposure effect' means you tend to prefer things you've seen before, even if you don't remember seeing them.",
    "Multitasking is a myth—your brain actually switches rapidly between tasks, reducing efficiency by up to 40%.",
  ],
  finance: [
    "Compound interest is called the 'eighth wonder of the world'—money invested at 7% doubles every 10 years.",
    "The term 'bull market' comes from how bulls attack—thrusting upward with their horns.",
    "Warren Buffett reads 80% of his day, believing knowledge builds up like compound interest.",
    "The first credit card was introduced in 1950 by Diners Club, made of cardboard.",
    "Inflation means your money loses about 2-3% of its purchasing power each year on average.",
  ],
  history: [
    "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid of Giza.",
    "Oxford University is older than the Aztec Empire—teaching began there in 1096.",
    "Napoleon was actually average height for his time—the 'short' myth came from British propaganda.",
    "The shortest war in history lasted 38-45 minutes: Britain vs. Zanzibar in 1896.",
    "Julius Caesar was kidnapped by pirates and joked that he'd have them executed—which he later did.",
  ],
  'fun-facts': [
    "Octopuses have three hearts and blue blood.",
    "A group of flamingos is called a 'flamboyance'.",
    "Bananas are berries, but strawberries aren't.",
    "Honey never spoils—archaeologists have found 3000-year-old honey that's still edible.",
    "Wombat poop is cube-shaped to prevent it from rolling away.",
  ],
  science: [
    "Lightning strikes the Earth about 100 times per second.",
    "There are more possible games of chess than atoms in the observable universe.",
    "A day on Venus is longer than its year—Venus rotates slower than it orbits the sun.",
    "Dolphins have names for each other—they use signature whistles.",
    "The human nose can detect over 1 trillion different scents.",
  ],
  health: [
    "Laughing for 15 minutes burns about 40 calories.",
    "Your body produces about 1.5 liters of saliva per day.",
    "The human heart beats about 100,000 times per day.",
    "You're taller in the morning—your spine compresses throughout the day.",
    "Exercise boosts brain function by increasing blood flow and oxygen to the brain.",
  ],
};

class ContentService {
  static async init() {
    // Service initialized
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

    return {
      text: randomTidbit,
      category: randomCategory,
      timestamp: new Date().toISOString(),
    };
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
      tech: 'Technology',
      psychology: 'Psychology',
      finance: 'Finance',
      history: 'History',
      'fun-facts': 'Fun Facts',
      science: 'Science',
      health: 'Health',
    };
    return names[categoryId] || categoryId;
  }

  static getCategoryDescription(categoryId) {
    const descriptions = {
      tech: 'Tech innovations and computer history',
      psychology: 'Human behavior and mind insights',
      finance: 'Money, investing, and economics',
      history: 'Fascinating historical moments',
      'fun-facts': 'Random interesting facts',
      science: 'Scientific discoveries and phenomena',
      health: 'Health and wellness tips',
    };
    return descriptions[categoryId] || '';
  }
}

export { ContentService };

