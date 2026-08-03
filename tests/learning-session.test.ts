import { describe, expect, it } from "vitest";
import { migrateLearningSession, shuffleQuizOptions } from "../lib/learning-session";

const profile = {
  attention: "curious" as const,
  understanding: "some" as const,
  hypothesis: "Growth may remain durable",
};

describe("learning-session migration", () => {
  it("moves an unlocked legacy opinion into the new final stage", () => {
    const migrated = migrateLearningSession({
      profile,
      activeStage: 4,
      completedThrough: 5,
      quiz: { 0: 0, 1: 0, 2: 0 },
      opinionUnlocked: true,
    });
    expect(migrated?.activeStage).toBe(6);
    expect(migrated?.completedThrough).toBe(6);
  });

  it("keeps an unfinished legacy debrief at stage six of the visible journey", () => {
    const migrated = migrateLearningSession({
      profile,
      activeStage: 5,
      completedThrough: 5,
      quiz: { 0: 0 },
      opinionUnlocked: false,
    });
    expect(migrated?.activeStage).toBe(5);
    expect(migrated?.completedThrough).toBe(5);
  });

  it("preserves a version-two seven-stage session", () => {
    const migrated = migrateLearningSession({
      version: 2,
      profile,
      activeStage: 6,
      completedThrough: 6,
      quiz: { 0: 0, 1: 0, 2: 0 },
      opinionUnlocked: true,
    });
    expect(migrated).toMatchObject({ version: 2, activeStage: 6, completedThrough: 6, opinionUnlocked: true });
  });

  it("rejects malformed stored state", () => {
    expect(migrateLearningSession({ activeStage: 6 })).toBeNull();
    expect(migrateLearningSession(null)).toBeNull();
  });

  it("shuffles answer positions while preserving the correct answer", () => {
    const items = [
      { question: "One", options: ["Correct one", "Wrong A", "Wrong B"], correct: 0, explanation: "One" },
      { question: "Two", options: ["Correct two", "Wrong C", "Wrong D"], correct: 0, explanation: "Two" },
      { question: "Three", options: ["Correct three", "Wrong E", "Wrong F"], correct: 0, explanation: "Three" },
    ];
    const shuffled = shuffleQuizOptions(items, 7654);
    expect(shuffled.map((item) => item.correct)).not.toEqual([0, 0, 0]);
    expect(shuffled.map((item) => item.options[item.correct])).toEqual(["Correct one", "Correct two", "Correct three"]);
  });

  it("keeps a resumed lesson's answer order stable for the same seed", () => {
    const items = [{ question: "One", options: ["Correct", "Wrong A", "Wrong B"], correct: 0, explanation: "One" }];
    expect(shuffleQuizOptions(items, 2026)).toEqual(shuffleQuizOptions(items, 2026));
  });
});
