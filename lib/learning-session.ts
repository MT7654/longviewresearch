import type { HypothesisProfile } from "./domain";

export type StoredLearningSession = {
  version: 2;
  profile: HypothesisProfile;
  activeStage: number;
  completedThrough: number;
  quiz: Record<number, number>;
  opinionUnlocked: boolean;
};

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
    opinionUnlocked: input.opinionUnlocked,
  };
}
