"""Analyze an anonymized Code to Escape evaluation export.

This script never fabricates results. It requires real CSVs and writes tables plus
an analysis summary. Example:

  python scripts/analyze_learning_study.py --input-dir study_export --output-dir results

Required files: participants.csv, assessment_attempts.csv, surveys.csv.
Optional: user_events.csv, experiment_assignments.csv.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.power import TTestIndPower


def read_required(folder: Path, name: str) -> pd.DataFrame:
    path = folder / name
    if not path.exists():
        raise FileNotFoundError(f"Missing required study export: {path}")
    return pd.read_csv(path)


def cohen_d(left: pd.Series, right: pd.Series) -> float:
    a = left.dropna().to_numpy(dtype=float)
    b = right.dropna().to_numpy(dtype=float)
    pooled = np.sqrt(((len(a) - 1) * np.var(a, ddof=1) + (len(b) - 1) * np.var(b, ddof=1)) / (len(a) + len(b) - 2))
    return float((np.mean(a) - np.mean(b)) / pooled) if pooled > 0 else 0.0


def summarize(values: pd.Series) -> dict[str, float | int]:
    clean = values.dropna().astype(float)
    return {"n": int(clean.size), "mean": float(clean.mean()) if len(clean) else 0.0, "median": float(clean.median()) if len(clean) else 0.0, "sd": float(clean.std(ddof=1)) if len(clean) > 1 else 0.0}


def compare(left: pd.Series, right: pd.Series) -> dict[str, object]:
    a = left.dropna().astype(float)
    b = right.dropna().astype(float)
    result: dict[str, object] = {"left": summarize(a), "right": summarize(b), "cohen_d_left_minus_right": cohen_d(a, b)}
    if len(a) >= 2 and len(b) >= 2:
        result["welch_t"] = {"statistic": float(stats.ttest_ind(a, b, equal_var=False).statistic), "p_value": float(stats.ttest_ind(a, b, equal_var=False).pvalue)}
        result["mann_whitney_u"] = {"statistic": float(stats.mannwhitneyu(a, b, alternative="two-sided").statistic), "p_value": float(stats.mannwhitneyu(a, b, alternative="two-sided").pvalue)}
    else:
        result["warning"] = "Fewer than two observations in one group; inferential tests omitted."
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    participants = read_required(args.input_dir, "participants.csv")
    attempts = read_required(args.input_dir, "assessment_attempts.csv")
    surveys = read_required(args.input_dir, "surveys.csv")
    events_path = args.input_dir / "user_events.csv"
    assignments_path = args.input_dir / "experiment_assignments.csv"
    events = pd.read_csv(events_path) if events_path.exists() else pd.DataFrame()
    assignments = pd.read_csv(assignments_path) if assignments_path.exists() else pd.DataFrame()

    required_participant_columns = {"study_id", "condition"}
    missing = required_participant_columns - set(participants.columns)
    if missing:
        raise ValueError(f"participants.csv missing columns: {sorted(missing)}")
    participants = participants.drop_duplicates("study_id")
    attempts = attempts.merge(participants[["study_id", "condition"]], on="study_id", how="inner")
    attempts["percent"] = attempts["score"] / attempts["max_score"].replace(0, np.nan) * 100

    pre = attempts[attempts["assessment_type"].eq("PRE")].sort_values("completed_at").drop_duplicates(["study_id", "world_id"])
    post = attempts[attempts["assessment_type"].eq("POST")].sort_values("completed_at").drop_duplicates(["study_id", "world_id"])
    delayed = attempts[attempts["assessment_type"].isin(["DELAYED_POST", "DELAYED"])].sort_values("completed_at").drop_duplicates(["study_id", "world_id"])
    paired = pre[["study_id", "world_id", "percent"]].rename(columns={"percent": "pre_percent"}).merge(post[["study_id", "world_id", "percent"]].rename(columns={"percent": "post_percent"}), on=["study_id", "world_id"], how="inner")
    paired["gain"] = paired["post_percent"] - paired["pre_percent"]
    paired = paired.merge(participants[["study_id", "condition"]], on="study_id", how="left")
    paired.to_csv(args.output_dir / "paired_gains.csv", index=False)

    summary: dict[str, object] = {"status": "completed", "sample": participants.groupby("condition").size().to_dict(), "power_reference": {"effect_d": 0.5, "alpha": 0.05, "power": 0.8, "required_per_group_approx": int(np.ceil(TTestIndPower().solve_power(effect_size=0.5, alpha=0.05, power=0.8, ratio=1, alternative="two-sided"))), "required_total_approx": int(np.ceil(TTestIndPower().solve_power(effect_size=0.5, alpha=0.05, power=0.8, ratio=1, alternative="two-sided") * 2))}, "outcomes": {}, "motivation": {}}
    for condition, group in paired.groupby("condition"):
        summary["outcomes"][f"gain_{condition}"] = summarize(group["gain"])
    control = paired.loc[paired["condition"].eq("control"), "gain"]
    treatment = paired.loc[paired["condition"].eq("treatment"), "gain"]
    summary["outcomes"]["gain_between_groups"] = compare(treatment, control)

    for timepoint in ["PRE", "POST", "DELAYED_POST", "DELAYED"]:
        values = attempts[attempts["assessment_type"].eq(timepoint)]
        for condition, group in values.groupby("condition"):
            summary["outcomes"][f"assessment_{timepoint.lower()}_{condition}"] = summarize(group["percent"])
    if not delayed.empty:
        retention = post[["study_id", "world_id", "percent"]].rename(columns={"percent": "post_percent"}).merge(delayed[["study_id", "world_id", "percent"]].rename(columns={"percent": "delayed_percent"}), on=["study_id", "world_id"], how="inner")
        retention["retention_change"] = retention["delayed_percent"] - retention["post_percent"]
        retention.to_csv(args.output_dir / "retention.csv", index=False)
        summary["outcomes"]["retention_change"] = summarize(retention["retention_change"])

    for instrument, group in surveys.groupby("instrument"):
        for timepoint, point in group.groupby("timepoint"):
            summary["motivation"][f"{instrument}_{timepoint}"] = summarize(point["score"])
    if not events.empty:
        event_counts = events.groupby(["study_id", "event_type"]).size().unstack(fill_value=0)
        event_counts.to_csv(args.output_dir / "engagement_by_participant.csv")
        summary["engagement_event_totals"] = events["event_type"].value_counts().to_dict()
    if not assignments.empty:
        assignments.to_csv(args.output_dir / "assignments_checked.csv", index=False)
        summary["assignment_counts"] = assignments.groupby(["experiment_key", "variant"]).size().to_dict()

    with (args.output_dir / "analysis_summary.json").open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2, default=str)
    print(f"Wrote analysis results to {args.output_dir}. These results are based only on supplied CSV data.")


if __name__ == "__main__":
    main()
