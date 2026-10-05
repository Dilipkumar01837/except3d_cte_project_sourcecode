# Code to Escape: Final Project Report

## Evidence Status

This report documents the implemented web platform and the reproducible evaluation plan. No participant dataset, verified user-study results, load-test measurements, or WCAG audit output is present in the repository. Numerical findings are therefore intentionally not reported.

## Abstract

Code to Escape is a responsive web-based gamified programming learning platform. It combines coding challenges, escape-room progression, isolated execution, adaptive AI hints, real-time duels, 3D web scenes with fallback, social features, web push notifications, and learning measurement. The implementation is designed to support motivation, repeated problem solving, and retention. These outcomes remain evaluation hypotheses until the approved study is conducted and analyzed.

## Introduction and Problem Statement

Programming learners benefit from timely feedback and sustained practice, but conventional exercises may provide limited progression, personalization, and social engagement. Code to Escape addresses this problem through game progression, immediate judging, adaptive guidance, and optional real-time interaction.

## Aim and Objectives

The aim is to implement a responsive web platform for motivating programming practice and measurable learning. Objectives are to provide secure code execution, gamified progression, adaptive hints, duels, 3D web environments, social and notification features, and consent-gated learning analytics.

## Proposed System and Requirements

The system consists of React web clients, an Express and Socket.IO server, PostgreSQL through Prisma, Redis for live state and queues, a Docker code runner, Groq hint generation, Firebase Cloud Messaging, and React Three Fiber scenes. Authentication, authorization, rate limiting, privacy controls, and hidden-test protection are implemented.

## Implementation Evidence

- Challenge execution and worker flow: `apps/server/src/modules/challenges/` and `apps/code-runner/`.
- Adaptive hint engine and fallback: `apps/server/src/modules/challenges/ai-hint.service.ts`.
- Hint API, privacy preferences, and history: `apps/server/src/modules/hints/`.
- Learning profile and hint persistence: `database/prisma/schema.prisma` and migration `20261005160000_adaptive_hints`.
- Learning assessments and experiments: `apps/server/src/modules/learning/`.
- 3D scenes: `apps/game-client/src/features/escape-room/` and scene modules.
- Admin analytics: `apps/admin-dashboard/src/features/analytics/`.

## User Evaluation Study

The preregistered design compares traditional coding exercises with Code to Escape using pre-test, intervention, post-test, and delayed post-test measures. Research questions address motivation, speed, retention, hint effectiveness, and duel engagement. The target is at least 30 participants per condition, with consent-gated telemetry and pseudonymous exports. The analysis script is `scripts/analyze_learning_study.py`.

**Current result:** no verified study results are available. The synopsis claim must remain “designed to support” until real data are collected, quality-checked, and analyzed.

## Discussion and Limitations

The implementation demonstrates feature readiness, not educational effectiveness. External threats include recruitment bias, attrition, novelty effects, contamination, assessment practice effects, unequal exposure, missing data, and privacy-consent selection effects. Hint and duel associations are observational unless those factors are randomized.

## Conclusion and Future Work

The web platform is technically implemented across its core product areas. Future work requiring external execution includes ethics review, participant recruitment, study completion, statistical analysis, representative performance testing, WCAG auditing, production monitoring, and evidence-based claim revision.

## References and Appendices

See `docs/EvaluationStudyProtocol.md`, `docs/EvaluationDataDictionary.md`, `docs/ConsentFormTemplate.md`, `docs/StudyResultsTemplate.md`, `docs/Architecture.md`, and `docs/API.md`.
