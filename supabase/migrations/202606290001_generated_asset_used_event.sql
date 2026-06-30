alter table public.app_events
drop constraint if exists app_events_event_name_check;

alter table public.app_events
add constraint app_events_event_name_check
check (
  event_name in (
    'page_view',
    'demo_started',
    'signup_started',
    'signup_completed',
    'onboarding_started',
    'onboarding_completed',
    'exam_track_selected',
    'feature_opened',
    'quiz_started',
    'question_answered',
    'confidence_selected',
    'rationale_opened',
    'quiz_completed',
    'weak_area_opened',
    'study_plan_opened',
    'flashcard_reviewed',
    'material_upload_started',
    'material_upload_completed',
    'material_upload_failed',
    'generated_asset_used',
    'note_created',
    'feedback_opened',
    'feedback_submitted',
    'pricing_viewed',
    'external_cta_clicked'
  )
);
