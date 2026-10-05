# Code to Escape User Evaluation Protocol

## Status

This is a preregistration-ready protocol and execution plan. No participant data or study results are included in this repository. The synopsis must not say that the claims are supported until the study is completed and the analysis script produces results.

## Research Questions

- **RQ1:** Does gamified escape-room learning improve motivation compared with traditional coding exercises?
- **RQ2:** Does it lead to faster problem-solving?
- **RQ3:** Does it improve knowledge retention?
- **RQ4:** How effective are AI hints in supporting learning?
- **RQ5:** Does real-time duel mode increase engagement?

## Design

Use a randomized, parallel, between-subjects study with a delayed post-test and a mixed-methods supplement.

- **Control:** matched traditional coding exercises with the same learning objectives, challenge order, time limits, and assessment content, without escape-room game mechanics.
- **Treatment:** Code to Escape with worlds, escape-room presentation, XP/rewards, hints, and the assigned duel condition.
- **Randomization:** create one active experiment with variants `control` and `treatment`. Assign once at first study-world entry using the existing sticky `ExperimentAssignment` record. Do not reassign participants.
- **Duration:** 8 weeks total: protocol/recruitment week 1, pilot week 2, intervention weeks 3-6, analysis week 7, reporting week 8. The delayed post-test occurs 2-4 weeks after each participant's post-test.
- **Unit of analysis:** participant for motivation, normalized assessment gain, retention, and engagement. Challenge-level models are secondary and must cluster or use participant as a random effect.

### Sample Size

The primary confirmatory comparison is normalized post-test gain between two independent groups. For a two-sided alpha of .05, 80% power, and a medium standardized effect of Cohen's d = 0.50, a conventional independent-samples calculation requires approximately 64 analyzable participants per group, or 128 total. Recruit approximately 152 to allow for 15-20% attrition. A completed sample of 30-60 is acceptable only as a pilot and results must be labeled exploratory; it is underpowered for the planned medium-effect confirmatory claim. A smaller confirmatory target requires a justified repeated-measures/ANCOVA power analysis using a prespecified within-person correlation and a smaller minimum meaningful effect.

The checked-in analysis script includes the power calculation. Before recruitment, replace the assumed effect with the smallest educationally meaningful effect agreed by the research team.

### Inclusion and Exclusion

Include adults or approved minors covered by the institution's consent process who are beginner/intermediate programmers, can read the study language, have a desktop/laptop browser, and can complete the pre-test. Exclude participants with extensive professional programming experience if the target population is beginners, duplicate accounts, failed consent, and participants who do not complete the pre-test. Report all exclusions and do not exclude participants based on outcomes.

## Measures

### Primary Outcomes

1. **Motivation:** pre/post change in a licensed or institution-approved validated instrument such as the Intrinsic Motivation Inventory interest/enjoyment and perceived competence subscales, or IMMS if the instructional-material framing is preferred. Store item responses and scoring version, not copied instrument text, unless permission permits it.
2. **Learning:** normalized post-test score and delayed-test score using matched, objective-aligned assessment forms.
3. **Problem-solving speed:** median time-to-first-correct-solution per participant on preregistered target challenges, with attempts and error categories as secondary outcomes.

### Secondary Outcomes

- Login days, time-on-task, levels completed, completion rate, hint requests and accepted hints, duel participation, duel completion, and return at 7/14/28 days.
- AI hint effectiveness: change in next-attempt correctness and time after a hint, compared descriptively and with a mixed model only when exposure is sufficient. This is observational unless hint availability is randomized.
- User experience: SUS or UEQ after the intervention, plus optional semi-structured interview.

## Procedure

1. Screen, explain risks/data use, obtain informed consent, and create a study ID separate from the platform username.
2. Collect demographics needed for analysis only: age band, prior programming exposure, and self-rated proficiency. Do not collect unnecessary identity data in the research dataset.
3. Administer the pre-test and baseline motivation survey.
4. Randomly assign the participant to control or treatment. Within treatment, preregister a second factorial experiment only if sample size supports it: `hints_on`/`hints_off` and `duels_on`/`duels_off`. Do not claim causal effects for factors that are not randomized.
5. Run four weeks of matched learning sessions. Ask participants to complete at least three sessions per week, with a target of 120 minutes per week. Record exposure and deviations.
6. Administer the post-test, post motivation survey, and SUS/UEQ.
7. Administer the delayed post-test and a short motivation/retention survey 2-4 weeks later.
8. Invite a purposive subsample balanced by condition and completion level to a 20-30 minute interview.

## Analysis

The confirmatory alpha is .05, two-sided, with 95% confidence intervals. Report exact p-values, effect sizes, and sample sizes; do not report only whether p < .05.

- Inspect distributions and missingness before testing.
- Within-group pre/post: paired t-test if difference scores are reasonably normal, otherwise Wilcoxon signed-rank.
- Between-group gain and retention: independent t-test or Mann-Whitney U as appropriate; report Cohen's d or rank-biserial effect size.
- Motivation and repeated challenge speed: linear mixed-effects model with condition, time, and condition-by-time interaction, participant random intercept, and baseline score as a covariate where prespecified.
- More than two variants: one-way ANOVA with planned contrasts or Kruskal-Wallis followed by corrected pairwise tests.
- Retention: delayed score as the outcome and post-test score as a covariate; optionally report return-rate curves with Kaplan-Meier-style retention only if visit timestamps are complete.
- AI hints and duels: report exposure-adjusted descriptive summaries. Use causal language only for randomized hint/duel variants.
- Correct multiple secondary comparisons with Holm or false-discovery-rate control and label the correction.
- Report intention-to-treat as primary; per-protocol analysis is sensitivity only.

The reproducible script is `scripts/analyze_learning_study.py`. It accepts anonymized CSVs described in `docs/EvaluationDataDictionary.md` and writes tables, test statistics, and charts. It exits with an explicit "no results" message when required data are absent.

## Ethics, Privacy, and Data Governance

Obtain institutional approval or an IRB determination before recruitment where applicable. Consent must cover participation, assessment/survey responses, opt-in telemetry, experiment assignment, delayed follow-up, interviews/recording if applicable, risks, compensation, withdrawal, and contact details. Participation must not affect course grades or account access.

Use the study ID as the join key. Store the mapping from study ID to account separately with restricted access. Export only salted/pseudonymous IDs, never email, username, IP address, source code, or service credentials. Encrypt access-controlled storage, retain raw research data only for the approved retention period, then delete it. Participants can withdraw without penalty and request deletion where legally applicable.

## Claim Decision Rule

- If the preregistered primary comparison is statistically significant and the confidence interval excludes the null in the prespecified direction, report **"Results show..."** with effect size and uncertainty.
- If the study is completed but underpowered, pilot, or has wide uncertainty, report **"Pilot results suggest..."** and state limitations.
- Before the study is completed, report **"Code to Escape is designed to improve..."** only. Never use the original "Results show" wording.
