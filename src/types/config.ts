export interface HiringTranche {
  count: number;
  start_month: number;
}

export interface GTMConfig {
  targets: {
    annual_target: number;
    growth_rate: number;
    prior_year_actuals: number;
    target_source: "fixed" | "growth";
    planning_mode: "full_year" | "rolling_forward" | "manual_lock";
    locked_months: number[];
    seasonality_weights: Record<string, number>;
    actuals_file: string | null;
    period_type: string;
  };
  dimensions: {
    channel: { enabled: boolean; values: string[] };
    product: { enabled: boolean; values: string[] };
    region: { enabled: boolean; values: string[] };
    segment: { enabled: boolean; values: string[] };
    deal_type: { enabled: boolean; values: string[] };
  };
  allocation: {
    optimizer_mode: "greedy" | "solver";
    constraints: {
      share_floor: number;
      share_ceiling: number;
    };
    objective: {
      metric: string;
      direction: string;
      pipeline_to_bookings_ratio: number;
    };
  };
  economics: {
    default_decay: {
      asp: {
        function: string;
        rate: number;
        threshold: number;
        floor_multiplier: number;
      };
      win_rate: {
        function: string;
        rate: number;
        threshold: number;
        floor_multiplier: number;
      };
    };
    baseline: {
      aggregation: string;
      grain: string;
      source: string;
    };
    calibration: {
      use_calibration?: boolean;
      deal_data_file: string;
      fit_function: string;
      min_deals_for_fit: number;
    };
    use_calibration: boolean;
    cash_cycle: {
      enabled: boolean;
      grain: string;
      planning_horizon_months: number;
      default_distribution: Record<string, number>;
      product_overrides: Record<string, Record<string, number>>;
    };
    confidence: {
      high_threshold: number;
      medium_threshold: number;
      default_fallback_multiplier: number;
      fallback_hierarchy: string[];
    };
  };
  ae_model: {
    starting_hc: number;
    productivity_per_ae: number;
    hiring_plan: HiringTranche[];
    ramp: {
      duration_days: number;
      velocity: string;
    };
    mentoring: {
      overhead_pct_per_new_hire: number;
      max_mentees_per_ae: number;
      warning_threshold: number;
    };
    shrinkage: {
      pto_pct: number;
      admin_pct: number;
      enablement_base_pct: number;
      enablement_max_pct: number;
      enablement_scaling: string;
    };
    attrition: {
      annual_rate: number;
      backfill_delay_months: number;
    };
    stretch_threshold: number;
  };
  what_if_scenarios: WhatIfScenario[];
  system: {
    log_level: string;
    tolerance: number;
    revenue_tolerance: number;
    solver: {
      method: string;
      max_iterations: number;
      convergence_tolerance: string;
    };
    supersized_deal_threshold: number;
    low_confidence_threshold: number;
    output_dir: string;
    results_format: string;
    confidence_risk_low_max_pct: number;
    confidence_risk_medium_max_pct: number;
  };
}

export interface WhatIfScenario {
  name: string;
  description: string;
  enabled: boolean;
  perturbations: Record<string, unknown>;
}

export interface PlanVersion {
  version_id: string;
  timestamp: string;
  config_hash: string;
}

export interface AECapacityRow {
  month: number;
  hc_tenured: number;
  hc_ramping: number;
  hc_total: number;
  mentoring_tax?: number;
  shrinkage_rate?: number;
  effective_capacity_saos: number;
}

export interface PlanSummary {
  total_annual_bookings: number;
  total_annual_saos: number;
  total_in_window_bookings: number;
  total_deferred_bookings: number;
  average_weighted_roi: number;
  capacity_constrained_months: number;
  segment_summary: Record<string, {
    total_bookings: number;
    total_saos: number;
    avg_share: number;
    avg_asp: number;
    avg_cw_rate: number;
  }>;
  validation: {
    passed: boolean;
    checks: Array<{
      name: string;
      passed: boolean;
      detail: string;
    }>;
  };
}

export interface PlanResult {
  month: number;
  segment_key: string;
  share: number;
  required_saos: number;
  effective_asp: number;
  effective_cw_rate: number;
  projected_pipeline: number;
  projected_bookings: number;
  in_window_bookings: number;
  deferred_bookings: number;
  capacity_flag: number;
}
