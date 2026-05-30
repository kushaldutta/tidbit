/**
 * RecallService — grades free-text recall answers.
 *
 * Grading levels:
 *   'exact'   — answer matches after normalization (full marks)
 *   'close'   — Levenshtein ratio ≥ 0.75  (minor typos, accepted)
 *   'partial' — Levenshtein ratio ≥ 0.5   (ballpark, shown as "close")
 *   'wrong'   — ratio < 0.5
 *
 * Normalization: lowercase, collapse whitespace, strip punctuation.
 */

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')   // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein distance */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Similarity ratio 0–1 */
function ratio(a, b) {
  if (a.length === 0 && b.length === 0) return 1;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

class RecallService {
  /**
   * Grade a user's answer against the correct answer.
   *
   * Returns {
   *   grade: 'exact' | 'close' | 'partial' | 'wrong',
   *   isCorrect: boolean,   // exact or close
   *   similarity: number,   // 0–1
   * }
   */
  static grade(userAnswer, correctAnswer) {
    const normUser = normalize(userAnswer);
    const normCorrect = normalize(correctAnswer);

    if (normUser === normCorrect) {
      return { grade: 'exact', isCorrect: true, similarity: 1 };
    }

    // Also check if the correct answer is contained in or contains the user answer
    if (normCorrect.includes(normUser) && normUser.length >= 3) {
      return { grade: 'close', isCorrect: true, similarity: 0.9 };
    }

    const sim = ratio(normUser, normCorrect);

    if (sim >= 0.75) return { grade: 'close', isCorrect: true, similarity: sim };
    if (sim >= 0.50) return { grade: 'partial', isCorrect: false, similarity: sim };
    return { grade: 'wrong', isCorrect: false, similarity: sim };
  }

  /**
   * Produce a character-level diff for highlighting in the UI.
   * Returns an array of { char, type: 'match'|'insert'|'delete' }.
   *
   * Uses a simple LCS-based approach for short strings only.
   * Falls back to whole-string diff for long answers (> 80 chars).
   */
  static diff(userAnswer, correctAnswer) {
    const a = normalize(userAnswer);
    const b = normalize(correctAnswer);

    if (a.length > 80 || b.length > 80) {
      // Whole-string: just mark everything correct or wrong
      return b.split('').map((ch) => ({
        char: ch,
        type: a === b ? 'match' : 'replace',
      }));
    }

    // Build LCS table
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    // Traceback
    const result = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        result.unshift({ char: b[j - 1], type: 'match' });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ char: b[j - 1], type: 'insert' });
        j--;
      } else {
        result.unshift({ char: a[i - 1], type: 'delete' });
        i--;
      }
    }
    return result;
  }
}

export { RecallService };
export default RecallService;
