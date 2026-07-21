import type { ExperimentMethod } from "@/domain/learning/beta-experiment";

/** Map product surfaces → experiment method taxonomy. */
export function mapToExperimentMethod(
  surface:
    | "question_engine"
    | "flashcards"
    | "active_recall"
    | "spaced_review"
    | "quick_grasp"
    | "lesson"
    | "teach_it_back"
    | "story_mode"
    | "timeline"
    | "match_arena"
    | "mock_exam"
    | "simulation"
    | "mixed_review",
): ExperimentMethod {
  switch (surface) {
    case "flashcards":
      return "flashcards";
    case "active_recall":
      return "active_recall";
    case "match_arena":
      return "matching";
    case "story_mode":
      return "story_mode";
    case "timeline":
      return "timeline";
    case "teach_it_back":
      return "teach_back";
    case "mock_exam":
    case "simulation":
      return "oral_simulation";
    case "question_engine":
    case "spaced_review":
    case "mixed_review":
      return "mixed_test";
    case "quick_grasp":
    case "lesson":
    default:
      return "microlearning";
  }
}
