/**
 * QuizService — builds multiple-choice questions from a deck's cards.
 *
 * Strategy for distractors (wrong answers):
 *   1. Pull from other cards in the same deck whose `back` is different.
 *   2. Shuffle, take 3.
 *   3. If the deck has fewer than 4 cards, pad with generic plausible-looking
 *      distractors so the question is still valid.
 *
 * Each question shape:
 *   {
 *     cardId:    string,
 *     question:  string,   // card.front
 *     correct:   string,   // card.back
 *     options:   string[], // shuffled [correct, ...3 distractors]
 *     correctIndex: number,
 *   }
 */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class QuizService {
  /**
   * Build a shuffled array of quiz questions from a card list.
   * `cards` should be the full list from DeckService.listCards(deckId).
   * Returns an empty array if there are fewer than 2 cards.
   */
  static buildQuestions(cards) {
    if (!cards || cards.length < 2) return [];

    return shuffle(cards).map((card) => {
      // All other cards are distractor candidates
      const pool = cards
        .filter((c) => c.id !== card.id && c.back?.trim())
        .map((c) => c.back.trim());

      // Pick up to 3 unique distractors
      const distractors = shuffle([...new Set(pool)]).slice(0, 3);

      // Pad if not enough unique options
      const FALLBACKS = [
        'None of the above',
        'All of the above',
        'Cannot be determined',
        'Not covered in this deck',
      ];
      while (distractors.length < 3) {
        const fb = FALLBACKS[distractors.length];
        if (!distractors.includes(fb)) distractors.push(fb);
        else distractors.push(`Option ${distractors.length + 1}`);
      }

      // Insert correct answer at a random position
      const options = shuffle([card.back.trim(), ...distractors]);
      const correctIndex = options.indexOf(card.back.trim());

      return {
        cardId: card.id,
        question: card.front.trim(),
        correct: card.back.trim(),
        options,
        correctIndex,
      };
    });
  }

  /**
   * Score a single answer.
   * Returns { correct: boolean, correctIndex: number }
   */
  static checkAnswer(question, chosenIndex) {
    return {
      correct: chosenIndex === question.correctIndex,
      correctIndex: question.correctIndex,
    };
  }
}

export { QuizService };
export default QuizService;
