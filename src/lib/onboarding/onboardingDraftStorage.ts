/**
 * Single versioned local draft for the onboarding wizard.
 * Migrates legacy per-key storage on first read, then removes old keys.
 */

export const ONBOARDING_DRAFT_STORAGE_VERSION = 2 as const;

const V2_KEY = "memospark_onboarding_draft_v2";

const LEGACY_KEYS = [
  "onboardingName",
  "onboardingEmail",
  "onboardingYearOfStudy",
  "onboardingBirthDate",
  "onboardingInterests",
  "onboardingLearningStyle",
  "onboardingSubjects",
  "onboardingAiDifficulty",
  "onboardingAiExplanationStyle",
  "onboardingAiInteractionFrequency",
  "onboardingStep",
] as const;

export interface OnboardingDraftV2 {
  version: typeof ONBOARDING_DRAFT_STORAGE_VERSION;
  name: string;
  email: string;
  yearOfStudy: string;
  birthDate: string | null;
  interests: string[];
  learningStyle: string;
  subjects: string[];
  aiPreferences: {
    difficulty: number;
    explanationStyle: string;
    interactionFrequency: string;
  };
  step: number;
}

function defaultDraft(): OnboardingDraftV2 {
  return {
    version: ONBOARDING_DRAFT_STORAGE_VERSION,
    name: "",
    email: "",
    yearOfStudy: "Freshman",
    birthDate: null,
    interests: [],
    learningStyle: "Unspecified",
    subjects: [],
    aiPreferences: {
      difficulty: 5,
      explanationStyle: "balanced",
      interactionFrequency: "moderate",
    },
    step: 1,
  };
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readLegacyDraft(): OnboardingDraftV2 | null {
  if (typeof window === "undefined") return null;

  const hasAnyLegacy = LEGACY_KEYS.some(
    (k) => localStorage.getItem(k) !== null,
  );
  if (!hasAnyLegacy) return null;

  const name = parseJson(localStorage.getItem("onboardingName"), "") as string;
  const email = parseJson(
    localStorage.getItem("onboardingEmail"),
    "",
  ) as string;
  const yearOfStudy = parseJson(
    localStorage.getItem("onboardingYearOfStudy"),
    "Freshman",
  ) as string;
  const birthDate = parseJson<string | null>(
    localStorage.getItem("onboardingBirthDate"),
    null,
  );
  const interests = parseJson(
    localStorage.getItem("onboardingInterests"),
    [],
  ) as string[] | unknown;
  const learningStyle = parseJson(
    localStorage.getItem("onboardingLearningStyle"),
    "Unspecified",
  ) as string;
  const subjects = parseJson(localStorage.getItem("onboardingSubjects"), []) as
    | string[]
    | unknown;

  const difficulty = parseJson(
    localStorage.getItem("onboardingAiDifficulty"),
    5,
  ) as number;
  const explanationStyle = parseJson(
    localStorage.getItem("onboardingAiExplanationStyle"),
    "balanced",
  ) as string;
  const interactionFrequency = parseJson(
    localStorage.getItem("onboardingAiInteractionFrequency"),
    "moderate",
  ) as string;
  const step = parseJson(localStorage.getItem("onboardingStep"), 1) as number;

  return {
    version: ONBOARDING_DRAFT_STORAGE_VERSION,
    name: typeof name === "string" ? name : "",
    email: typeof email === "string" ? email : "",
    yearOfStudy: typeof yearOfStudy === "string" ? yearOfStudy : "Freshman",
    birthDate,
    interests: Array.isArray(interests)
      ? interests.filter((i): i is string => typeof i === "string")
      : [],
    learningStyle:
      typeof learningStyle === "string" ? learningStyle : "Unspecified",
    subjects: Array.isArray(subjects)
      ? subjects.filter((s): s is string => typeof s === "string")
      : [],
    aiPreferences: {
      difficulty: typeof difficulty === "number" ? difficulty : 5,
      explanationStyle:
        typeof explanationStyle === "string" ? explanationStyle : "balanced",
      interactionFrequency:
        typeof interactionFrequency === "string"
          ? interactionFrequency
          : "moderate",
    },
    step: typeof step === "number" && step >= 1 ? Math.min(5, step) : 1,
  };
}

function removeLegacyKeys(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Load draft from v2 storage, or migrate legacy keys once and persist v2.
 */
export function readOnboardingDraft(): OnboardingDraftV2 {
  if (typeof window === "undefined") {
    return defaultDraft();
  }

  const raw = localStorage.getItem(V2_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<OnboardingDraftV2>;
      if (parsed?.version === ONBOARDING_DRAFT_STORAGE_VERSION) {
        const base = defaultDraft();
        const stepRaw = parsed.step;
        const step =
          typeof stepRaw === "number"
            ? Math.min(5, Math.max(1, stepRaw))
            : base.step;
        return {
          ...base,
          ...parsed,
          step,
          aiPreferences: {
            ...base.aiPreferences,
            ...parsed.aiPreferences,
          },
        };
      }
    } catch {
      /* fall through to legacy / default */
    }
  }

  const migrated = readLegacyDraft();
  if (migrated) {
    try {
      localStorage.setItem(V2_KEY, JSON.stringify(migrated));
    } catch {
      /* ignore */
    }
    removeLegacyKeys();
    return migrated;
  }

  return defaultDraft();
}

export function writeOnboardingDraft(draft: OnboardingDraftV2): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      V2_KEY,
      JSON.stringify({ ...draft, version: ONBOARDING_DRAFT_STORAGE_VERSION }),
    );
  } catch {
    /* ignore quota */
  }
}

export function clearOnboardingDraftStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(V2_KEY);
  } catch {
    /* ignore */
  }
  removeLegacyKeys();
}
