export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

export type AnalyticsEventName =
  | "onboarding_started"
  | "onboarding_step_viewed"
  | "onboarding_step_completed"
  | "onboarding_step_validation_failed"
  | "onboarding_completed"
  | "onboarding_updated"
  | "onboarding_skipped"
  | "onboarding_diagnostic_requested"
  | "onboarding_save_failed"
  | "study_plan_generated"
  | "ingestion_started"
  | "ingestion_finished"
  | "ingestion_failed"
  | "content_qa_started"
  | "content_qa_finished"
  | "content_qa_failed"
  | "content_qa_reviewed"
  | "curriculum_seeded"
  | "lesson_engine_seeded"
  | "lesson_interaction"
  | "quick_grasp_seeded"
  | "quick_grasp_answer"
  | "story_mode_seeded"
  | "story_mode_continue"
  | "story_mode_answer"
  | "timeline_seeded"
  | "timeline_mode"
  | "timeline_quiz"
  | "timeline_reorder"
  | "connection_map_seeded"
  | "connection_map_mode"
  | "connection_map_fill"
  | "flashcards_seeded"
  | "flashcard_session_started"
  | "flashcard_graded"
  | "flashcard_session_completed"
  | "active_recall_seeded"
  | "active_recall_submit"
  | "question_engine_seeded"
  | "question_attempt"
  | "kdo_jsem_seeded"
  | "kdo_jsem_guess"
  | "match_arena_seeded"
  | "match_arena_session_started"
  | "match_arena_match"
  | "match_arena_session_completed"
  | "story_reconstruction_seeded"
  | "story_reconstruction_attempt"
  | "story_reconstruction_completed"
  | "najdi_nesmysl_seeded"
  | "najdi_nesmysl_attempt"
  | "speed_round_seeded"
  | "speed_round_started"
  | "speed_round_answer"
  | "speed_round_completed"
  | "spaced_repetition_seeded"
  | "spaced_review_started"
  | "spaced_review_grade"
  | "error_memory_seeded"
  | "error_memory_recorded"
  | "error_memory_demo_loaded"
  | "mistake_practice_started"
  | "mistake_practice_grade"
  | "teach_it_back_seeded"
  | "teach_it_back_submit"
  | "readiness_seeded"
  | "readiness_demo_loaded"
  | "daily_mission_step_done"
  | "daily_mission_completed"
  | "deadline_plan_viewed"
  | "dynamic_study_plan_viewed"
  | "school_exam_profile_updated"
  | "school_exam_document_uploaded"
  | "school_exam_document_deleted"
  | "literature_book_added"
  | "literature_book_drawn"
  | "literature_imported_exam_profile"
  | "literature_imported_materials"
  | "oral_simulation_started"
  | "oral_simulation_graded"
  | "cermat_session_started"
  | "cermat_item_answered"
  | "beta_admin_dashboard_viewed"
  | "beta_telemetry_recorded"
  | "beta_learning_path_generated"
  | "zachran_me_plan_generated"
  | "literary_works_seeded"
  | "literary_work_opened"
  | "kytice_experience_seeded"
  | "kytice_experience_opened"
  | "maj_exam_prep_seeded"
  | "maj_exam_prep_opened"
  | "babicka_experience_seeded"
  | "babicka_experience_opened"
  | "mock_exam_seeded"
  | "mock_exam_opened"
  | "progress_motivation_viewed"
  | "mock_exam_recorded_for_progress"
  | "content_studio_catalog_viewed"
  | "content_studio_saved"
  | "content_studio_exercise_created"
  | "content_studio_bulk"
  | "learning_analytics_dashboard_viewed"
  | "learning_analytics_export"
  | "beta_feedback_submitted"
  | "diagnostic_baseline_completed"
  | "billing_checkout_started"
  | "billing_portal_opened"
  | "product_analytics_dashboard_viewed"
  | "product_analytics_export"
  | "feature_flag_updated"
  | "experiment_upserted";

type AnalyticsSink = (
  event: AnalyticsEventName,
  props?: AnalyticsProps,
) => void;

const sinks: AnalyticsSink[] = [];

/** Register a sink (tests, future vendor). Default = structured console in non-production. */
export function registerAnalyticsSink(sink: AnalyticsSink): void {
  sinks.push(sink);
}

function defaultSink(event: AnalyticsEventName, props?: AnalyticsProps) {
  if (process.env.NODE_ENV === "test") return;
  const payload = {
    event,
    ts: new Date().toISOString(),
    ...props,
  };
  // Abstraction — no PII beyond what's already in product events by design
  console.info("[analytics]", JSON.stringify(payload));
}

export function track(
  event: AnalyticsEventName,
  props?: AnalyticsProps,
): void {
  if (sinks.length === 0) {
    defaultSink(event, props);
    return;
  }
  for (const sink of sinks) {
    sink(event, props);
  }
}
