import type { GTMConfig } from "@/types/config";
import { SCENARIO_REGISTRY, matchScenarioToRegistry, parsePerturbations, validateScenarioParams } from "@/lib/scenarioRegistry";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateConfig(config: GTMConfig): ValidationResult {
  const errors: string[] = [];

  // --- Required fields ---
  if (!config.targets.annual_target || config.targets.annual_target <= 0) {
    errors.push("Annual target must be greater than 0.");
  }
  if (!config.targets.prior_year_actuals || config.targets.prior_year_actuals <= 0) {
    errors.push("Prior year actuals must be greater than 0.");
  }

  const dims = config.dimensions;
  const anyDimEnabled = Object.values(dims).some((d) => d.enabled);
  if (!anyDimEnabled) {
    errors.push("At least one dimension must be enabled.");
  }

  if (!config.ae_model.starting_hc || config.ae_model.starting_hc <= 0) {
    errors.push("Starting headcount must be greater than 0.");
  }
  if (!config.ae_model.productivity_per_ae || config.ae_model.productivity_per_ae <= 0) {
    errors.push("Productivity per AE must be greater than 0.");
  }

  // --- Range checks ---
  const gr = config.targets.growth_rate;
  if (gr < 0 || gr > 5) {
    errors.push("Growth rate must be between 0 and 5 (0–500%).");
  }

  const { share_floor, share_ceiling } = config.allocation.constraints;
  if (share_floor < 0 || share_floor > 1) {
    errors.push("Share floor must be between 0 and 1.");
  }
  if (share_ceiling < 0 || share_ceiling > 1) {
    errors.push("Share ceiling must be between 0 and 1.");
  }
  if (share_floor >= share_ceiling) {
    errors.push("Share floor must be less than share ceiling.");
  }

  if (config.allocation.objective.pipeline_to_bookings_ratio <= 0) {
    errors.push("Pipeline-to-bookings ratio must be greater than 0.");
  }

  // Seasonality weights sum ≈ 1.0
  const weights = Object.values(config.targets.seasonality_weights);
  if (weights.length > 0) {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      errors.push(`Seasonality weights must sum to 1.0 (current: ${sum.toFixed(4)}).`);
    }
  }

  // Decay rates
  const { asp, win_rate } = config.economics.default_decay;
  if (asp.function !== "none" && asp.function !== "step" && asp.rate <= 0) {
    errors.push("ASP decay rate must be > 0 for the selected function.");
  }
  if (asp.floor_multiplier < 0 || asp.floor_multiplier > 1) {
    errors.push("ASP floor multiplier must be between 0 and 1.");
  }
  if (win_rate.function !== "none" && win_rate.function !== "step" && win_rate.rate <= 0) {
    errors.push("Win-rate decay rate must be > 0 for the selected function.");
  }
  if (win_rate.floor_multiplier < 0 || win_rate.floor_multiplier > 1) {
    errors.push("Win-rate floor multiplier must be between 0 and 1.");
  }

  // AE model
  if (config.ae_model.ramp.duration_days <= 0) {
    errors.push("Ramp duration must be greater than 0 days.");
  }
  if (config.ae_model.attrition.annual_rate < 0 || config.ae_model.attrition.annual_rate > 1) {
    errors.push("Attrition rate must be between 0 and 1.");
  }
  if (config.ae_model.stretch_threshold <= 0) {
    errors.push("Stretch threshold must be greater than 0.");
  }

  // System
  if (config.system.tolerance <= 0) {
    errors.push("System tolerance must be greater than 0.");
  }
  if (config.system.revenue_tolerance <= 0) {
    errors.push("Revenue tolerance must be greater than 0.");
  }

  // What-If Scenarios validation
  if (config.what_if_scenarios) {
    for (const scenario of config.what_if_scenarios) {
      if (!scenario.enabled) continue;
      const entry = matchScenarioToRegistry(scenario.name);
      if (!entry) continue;
      const pairs = parsePerturbations(entry.key, scenario.perturbations);
      const scenarioErrors = validateScenarioParams(entry.key, pairs, config);
      errors.push(...scenarioErrors);
    }
  }

  return { valid: errors.length === 0, errors };
}
