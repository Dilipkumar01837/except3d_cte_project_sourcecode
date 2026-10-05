# Code to Escape: Revised Project Synopsis

## Title

**Code to Escape: A Web-Based Gamified Programming Learning Platform with Responsive Design**

## Abstract

Code to Escape is a web-based gamified programming learning platform with responsive design.
It combines structured coding challenges with escape-room progression, real-time competitive
duels, adaptive AI hints, 3D web environments, social interaction, web push notifications,
and learning measurement tools. The platform is designed to support motivation, repeated
problem-solving practice, and retention through immediate feedback, progression systems,
and personalized assistance. A formal user evaluation is planned or underway; verified
statistical findings are not asserted in this synopsis until the anonymized study export has
been analyzed according to the preregistered protocol.

## Background and Problem Statement

Traditional programming practice often separates problem solving from motivation, feedback,
and sustained engagement. Learners may receive limited guidance when they are stuck and may
not have a clear view of their progress. Code to Escape addresses these challenges by placing
programming tasks in a structured web experience with visible progression, immediate judging,
adaptive hints, optional competition, and learning analytics.

## Aim

The aim is to design and implement a responsive web platform that supports programming
practice through gamified challenges, escape-room progression, real-time interaction,
personalized hints, and evidence-oriented learning measurement.

## Proposed System

The proposed system provides:

1. **Gamified learning:** worlds, levels, XP, coins, achievements, streaks, rankings, and
   escape-room gates connected to published coding challenges.
2. **Programming practice:** multi-language coding challenges evaluated by an isolated Docker
   runner with visible and hidden test cases, scoring, attempts, and execution diagnostics.
3. **Adaptive assistance:** context-aware Groq hints using the current challenge and code,
   enhanced by a persistent learning profile, hint history, selectable hint types, feedback,
   quota controls, and a local fallback when the AI provider is unavailable.
4. **Real-time engagement:** authenticated Socket.IO duel rooms, matchmaking, spectators,
   synchronized progress, chat, and server-authoritative results.
5. **Immersive web environments:** React Three Fiber and Three.js escape-room scenes with a
   responsive 2D fallback when WebGL is unavailable.
6. **Social and notification features:** friends, presence, direct messages, blocking,
   matchmaking, and opt-in Firebase Cloud Messaging notifications for web users.
7. **Learning measurement:** pre/post assessments, sticky experiment assignments, delayed
   post-test support in the research data model, consent-gated telemetry, anonymized export,
   and an administrative learning analytics dashboard.

## Objectives

- Implement a responsive web interface for programming challenges and progression.
- Provide secure, isolated, multi-language code execution and feedback.
- Use gamification and escape-room progression to support continued practice.
- Provide context-aware and adaptive AI hints with effectiveness feedback and privacy controls.
- Support real-time duels and social learning interactions.
- Provide web-based 3D environments with an accessible 2D fallback.
- Provide opt-in notifications and consent-gated learning measurement.
- Provide administrative tools for challenge management, experiments, and learning analytics.

## Evaluation Plan and Evidence Status

The evaluation protocol addresses five research questions: motivation, problem-solving speed,
retention, hint effectiveness, and duel engagement. It uses a randomized between-subjects
comparison between traditional coding exercises and Code to Escape, with pre-test, post-test,
delayed post-test, motivation surveys, and anonymized opt-in telemetry. The minimum pilot
target is 30 participants per condition; a larger sample is recommended for confirmatory power.

At the time of this revision, no verified study results are available in the repository.
Accordingly, the evidence-safe conclusion is:

> Code to Escape is designed to support motivation, problem-solving practice, and retention
> through gamified web learning, adaptive AI hints, real-time duels, and progress measurement.

The wording may be changed to **“Pilot results suggest…”** only after a completed preliminary
study has been quality-checked and analyzed. **“Results show…”** requires preregistered,
sufficiently powered evidence with reported uncertainty and effect sizes.

## Scope Limitation

This project is web-only and uses responsive design. Mobile applications are outside the
scope of this synopsis.

## Conclusion

Code to Escape implements an integrated web platform for programming practice, game-based
progression, personalized assistance, social interaction, and learning measurement. Its
effectiveness claims remain evaluation hypotheses until real participant data are analyzed.
