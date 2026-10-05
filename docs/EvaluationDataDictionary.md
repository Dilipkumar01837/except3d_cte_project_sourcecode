# Evaluation Data Dictionary

All research exports must use a study ID or salted pseudonymous ID. Do not export email, username, IP address, source code, or raw authentication data.

## Required CSVs

### participants.csv

| Column                   | Type         | Meaning                                  |
| ------------------------ | ------------ | ---------------------------------------- |
| `study_id`               | string       | Random research identifier               |
| `condition`              | string       | `control` or `treatment`                 |
| `prior_experience_years` | numeric      | Prespecified baseline experience measure |
| `consented_at`           | ISO datetime | Consent timestamp                        |
| `completed_study`        | boolean      | Meets the preregistered completion rule  |

### assessment_attempts.csv

| Column            | Type         | Meaning                          |
| ----------------- | ------------ | -------------------------------- |
| `study_id`        | string       | Pseudonymous participant key     |
| `assessment_id`   | string       | Assessment identifier            |
| `world_id`        | string       | World identifier                 |
| `assessment_type` | string       | `PRE`, `POST`, or `DELAYED_POST` |
| `score`           | numeric      | Points earned                    |
| `max_score`       | numeric      | Maximum points                   |
| `time_taken_ms`   | numeric      | Assessment duration              |
| `completed_at`    | ISO datetime | Completion timestamp             |

The current application stores `PRE` and `POST` in `AssessmentAttempt`; add `DELAYED_POST` through the study export or create a separate delayed assessment definition without changing the production enum.

### surveys.csv

| Column       | Type    | Meaning                                 |
| ------------ | ------- | --------------------------------------- |
| `study_id`   | string  | Pseudonymous participant key            |
| `instrument` | string  | IMI/IMMS/SUS/UEQ identifier and version |
| `timepoint`  | string  | `PRE`, `POST`, or `DELAYED_POST`        |
| `score`      | numeric | Scored total/subscale value             |
| `subscale`   | string  | Subscale name                           |

Do not copy copyrighted instrument item text into the repository. Store item responses under approved research storage and export only scored values where permitted.

### user_events.csv

| Column          | Type         | Meaning                               |
| --------------- | ------------ | ------------------------------------- |
| `study_id`      | string       | Pseudonymous participant key          |
| `event_type`    | string       | Existing allow-listed telemetry event |
| `created_at`    | ISO datetime | Event time                            |
| `metadata_json` | JSON string  | Approved, minimized metadata          |

Expected event types include `code_run`, `test_case_result`, `hint_request`, `hint_acceptance`, `challenge_time_spent`, `submission_attempt`, `execution_error`, `duel_participation`, `assessment_score`, `level_complete`, and `session_start`.

### experiment_assignments.csv

| Column           | Type         | Meaning                      |
| ---------------- | ------------ | ---------------------------- |
| `study_id`       | string       | Pseudonymous participant key |
| `experiment_key` | string       | Experiment identifier        |
| `variant`        | string       | Sticky assigned variant      |
| `assigned_at`    | ISO datetime | Assignment time              |

## Export checks

Before analysis, verify one stable condition per participant, no duplicate assignment, valid assessment ranges, no timestamps outside the study window, and that missingness is reported by condition. The existing admin CSV export is event-only; combine it with approved assessment, survey, participant, and assignment exports using the salted study ID.
