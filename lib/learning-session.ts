import type { HypothesisProfile } from "./domain";

export type StoredLearningSession = {
  version: 2;
  profile: HypothesisProfile;
  activeStage: number;
  completedThrough: number;
  quiz: Record<number, number>;
  quizSeed: number;
  opinionUnlocked: boolean;
};

export type ShufflableQuizItem = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

function nextRandom(state: number) {
  const next = (state * 1664525 + 1013904223) >>> 0;
  return { state: next, value: next / 0x100000000 };
}

export function shuffleQuizOptions<T extends ShufflableQuizItem>(items: T[], seed: number): T[] {
  let state = seed >>> 0 || 1;
  const shuffled = items.map((item) => {
    const options = item.options.map((option, index) => ({ option, wasCorrect: index === item.correct }));
    for (let index = options.length - 1; index > 0; index--) {
      const random = nextRandom(state);
      state = random.state;
      const swapIndex = Math.floor(random.value * (index + 1));
      [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
    }
    return {
      ...item,
      options: options.map(({ option }) => option),
      correct: options.findIndex(({ wasCorrect }) => wasCorrect),
    };
  });

  if (shuffled.length > 1 && shuffled.every((item) => item.correct === 0)) {
    const first = shuffled[0];
    const options = [...first.options.slice(1), first.options[0]];
    shuffled[0] = { ...first, options, correct: options.length - 1 };
  }
  return shuffled;
}

export function migrateLearningSession(value: unknown): StoredLearningSession | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<StoredLearningSession> & { version?: number };
  if (!input.profile || !input.quiz || typeof input.opinionUnlocked !== "boolean") return null;

  const legacyStage = Math.min(5, Math.max(0, Number(input.activeStage) || 0));
  const legacyCompleted = Math.min(5, Math.max(0, Number(input.completedThrough) || 0));
  const unlockedLegacyOpinion = input.version !== 2 && input.opinionUnlocked && legacyStage === 4;
  const migratedActiveStage = input.version === 2
    ? Math.min(6, Math.max(0, Number(input.activeStage) || 0))
    : unlockedLegacyOpinion ? 6 : legacyStage;
  const migratedCompletedThrough = input.version === 2
    ? Math.min(6, Math.max(0, Number(input.completedThrough) || 0))
    : input.opinionUnlocked ? 6 : legacyCompleted;
  const activeStage = !input.opinionUnlocked && migratedActiveStage === 6 ? 5 : migratedActiveStage;
  const completedThrough = !input.opinionUnlocked && migratedCompletedThrough === 6 ? 5 : migratedCompletedThrough;

  return {
    version: 2,
    profile: input.profile,
    activeStage,
    completedThrough,
    quiz: input.quiz,
    quizSeed: Number.isFinite(input.quizSeed) ? Number(input.quizSeed) : 1,
    opinionUnlocked: input.opinionUnlocked,
  };
}
