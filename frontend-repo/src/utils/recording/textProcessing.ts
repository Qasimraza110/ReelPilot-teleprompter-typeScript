// utils/textProcessing.ts

const commonReplacements: { [key: string]: string[] } = {
  which: ["witch"],
  whine: ["wine"],
  white: ["wight"],
  whole: ["hole"],
  why: ["wi"],
  widely: ["wide", "widly", "wildly", "wildlife"],
  will: ["wil", "we'll"],
  wind: ["wend"],
  window: ["windo"],
  wine: ["whine"],
  with: ["whith", "wit", "wiff"],
  woman: ["women"],
  women: ["woman"],
  wood: ["would"],
  wore: ["war"],
  work: ["wirk"],
  world: ["wurld"],
  write: ["right", "rite", "wright", "wrote", "writing", "writes"],
  wrote: ["write", "writing", "writes"],
  would: ["wood"],
  year: ["yer"],
  yes: ["yess"],
  yesterday: ["yesturday"],
  yoke: ["yolk"],
  "you're": ["your", "yore"],
  young: ["yung"],
  your: ["you're", "yore"],
  over: ["our"],
};

// Function to calculate Levenshtein distance (for similarity)
export const calculateLevenshteinDistance = (a: string, b: string): number => {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];

  for (let i = 0; i <= an; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= bn; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[an][bn];
};

export const calculateSimilarity = (word1: string, word2: string): number => {
  const distance = calculateLevenshteinDistance(word1, word2);
  const maxLength = Math.max(word1.length, word2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
};

// Basic contraction expansion
export const expandContractions = (text: string): string => {
  return text
    .replace(/won't/g, "will not")
    .replace(/can't/g, "can not")
    .replace(/n't/g, " not")
    .replace(/'re/g, " are")
    .replace(/'s/g, " is") // This might need refinement for possessives
    .replace(/'d/g, " would")
    .replace(/'ll/g, " will")
    .replace(/'t/g, " not")
    .replace(/'ve/g, " have")
    .replace(/'m/g, " am");
};

export const fuzzyWordMatch = (
  scriptWord: string,
  spokenWord: string,
  threshold: number
): boolean => {
  // 1. Exact match (case-insensitive after normalization)
  if (scriptWord === spokenWord) {
    return true;
  }

  // 2. Common replacements (homophones, common misspellings)
  if (commonReplacements[scriptWord]?.includes(spokenWord)) {
    return true;
  }
  for (const [key, alternatives] of Object.entries(commonReplacements)) {
    if (alternatives.includes(scriptWord) && key === spokenWord) {
      return true;
    }
  }

  // Define a lower threshold for very common short words like "a", "the", "and", "in", "of", "to"
  const commonShortWords = new Set([
    "a",
    "the",
    "and",
    "in",
    "of",
    "to",
    "it",
    "is",
    "from",
  ]);
  let currentThreshold = threshold;

  if (
    scriptWord.length <= 3 &&
    spokenWord.length <= 3 &&
    (commonShortWords.has(scriptWord) || commonShortWords.has(spokenWord))
  ) {
    currentThreshold = 0.5;
  } else if (scriptWord.length > 5 || spokenWord.length > 5) {
    currentThreshold = 0.75;
  } else {
    currentThreshold = 0.6;
  }

  // 3. Levenshtein similarity
  const similarity = calculateSimilarity(scriptWord, spokenWord);
  return similarity >= currentThreshold;
};

export const enhancedNormalizeText = (text: string): string => {
  let normalized = expandContractions(text).toLowerCase();

  const speechPatterns: { [key: string]: string } = {
    im: "i am",
    youre: "you are",
    theyre: "they are",
    were: "we are",
    hes: "he is",
    shes: "she is",
    its: "it is",
    weve: "we have",
    theyve: "they have",
    ive: "i have",
    youve: "you have",
    dont: "do not",
    cant: "can not",
    wont: "will not",
    shouldnt: "should not",
    wouldnt: "would not",
    couldnt: "could not",
    hasnt: "has not",
    havent: "have not",
    isnt: "is not",
    arent: "are not",
    wasnt: "was not",
    werent: "were not",
  };
  for (const [pattern, replacement] of Object.entries(speechPatterns)) {
    const regex = new RegExp(`\\b${pattern}\\b`, "g");
    normalized = normalized.replace(regex, replacement);
  }

  const numberWordMap: { [key: string]: string } = {
    "0": "zero",
    "1": "one",
    "2": "two",
    "3": "three",
    "4": "four",
    "5": "five",
    "6": "six",
    "7": "seven",
    "8": "eight",
    "9": "nine",
    "10": "ten",
    "11": "eleven",
    "12": "twelve",
    "13": "thirteen",
    "14": "fourteen",
    "15": "fifteen",
    "16": "sixteen",
    "17": "seventeen",
    "18": "eighteen",
    "19": "nineteen",
    "20": "twenty",
    "30": "thirty",
    "40": "forty",
    "50": "fifty",
    "60": "sixty",
    "70": "seventy",
    "80": "eighty",
    "90": "ninety",
    "100": "hundred",
    "1000": "thousand",
    "1000000": "million",
  };
  normalized = normalized.replace(/\b(\d+)\b/g, (match) => {
    return numberWordMap[match] || match;
  });

  normalized = normalized.replace(/-/g, " ");
  normalized = normalized.replace(/[^\w\s']/g, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();

  const truncationPatterns: { [key: string]: string } = {
    vibran: "vibrant",
    abundan: "abundant",
    refreshin: "refreshing",
    interestin: "interesting",
    beautifu: "beautiful",
    wonderfu: "wonderful",
    powerfu: "powerful",
    successfu: "successful",
    colorfu: "colorful",
    deliciou: "delicious",
  };
  const words = normalized.split(" ");
  for (let i = 0; i < words.length; i++) {
    if (truncationPatterns[words[i]]) {
      words[i] = truncationPatterns[words[i]];
    }
  }
  normalized = words.join(" ");

  return normalized;
};

// MODIFIED: fuzzyWordMatch to be more forgiving for common words
export const enhancedSpeechMatching = (
  scriptLine: string,
  spokenTranscript: string,
  similarityThreshold: number = 0.75
): number => {
  const scriptWords = enhancedNormalizeText(scriptLine)
    .split(" ")
    .filter(Boolean);
  const spokenWords = enhancedNormalizeText(spokenTranscript)
    .split(" ")
    .filter(Boolean);

  let matchedCount = 0;
  let scriptIdx = 0;
  let spokenIdx = 0;

  const SCRIPT_SKIP_PENALTY = 0.1;
  const SPOKEN_EXTRA_PENALTY = 0.05;

  while (scriptIdx < scriptWords.length && spokenIdx < spokenWords.length) {
    const currentScriptWord = scriptWords[scriptIdx];
    const currentSpokenWord = spokenWords[spokenIdx];

    if (
      fuzzyWordMatch(currentScriptWord, currentSpokenWord, similarityThreshold)
    ) {
      matchedCount++;
      scriptIdx++;
      spokenIdx++;
    } else {
      let bestScore = -1;
      let bestNextScriptIdx = scriptIdx;
      let bestNextSpokenIdx = spokenIdx;
      let matchedThisTurn = false;

      // Option 1: Current script word skipped
      if (scriptIdx + 1 < scriptWords.length) {
        const nextScriptWord = scriptWords[scriptIdx + 1];
        if (
          fuzzyWordMatch(nextScriptWord, currentSpokenWord, similarityThreshold)
        ) {
          const score = 1 - SCRIPT_SKIP_PENALTY;
          if (score > bestScore) {
            bestScore = score;
            bestNextScriptIdx = scriptIdx + 2;
            bestNextSpokenIdx = spokenIdx + 1;
            matchedThisTurn = true;
          }
        }
      }

      // Option 2: Current spoken word is an extra word
      if (spokenIdx + 1 < spokenWords.length) {
        const nextSpokenWord = spokenWords[spokenIdx + 1];
        if (
          fuzzyWordMatch(currentScriptWord, nextSpokenWord, similarityThreshold)
        ) {
          const score = 1 - SPOKEN_EXTRA_PENALTY;
          if (score > bestScore) {
            bestScore = score;
            bestNextScriptIdx = scriptIdx + 1;
            bestNextSpokenIdx = spokenIdx + 2;
            matchedThisTurn = true;
          }
        }
      }

      if (matchedThisTurn) {
        matchedCount++;
        scriptIdx = bestNextScriptIdx;
        spokenIdx = bestNextSpokenIdx;
      } else {
        spokenIdx++;
      }
    }
  }
  return matchedCount;
};
