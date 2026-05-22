import type { GTMConfig } from "@/types/config";

export type SourceType = "months" | "product" | "channel" | "region";

export interface ValueFieldDef {
  /** The perturbation key sent to backend (e.g. "asp_multiplier") */
  backendKey: string;
  /** UI label */
  label: string;
  /** Validation */
  validation?: {
    min?: number;
    max?: number;
    required?: boolean;
    dynamicMin?: (config: GTMConfig) => number;
  };
  step?: number;
  suffix?: string;
  /** If true, UI shows percentage (45) but sends decimal (0.45) */
  percentToDecimal?: boolean;
}

export interface PairDef {
  /** Label for the dropdown column */
  keyLabel: string;
  /** Where dropdown options come from */
  source: SourceType;
  /** Single value field (legacy simple scenarios) */
  valueLabel?: string;
  valueValidation?: {
    min?: number;
    max?: number;
    required?: boolean;
    dynamicMin?: (config: GTMConfig) => number;
  };
  step?: number;
  suffix?: string;
  /** Multiple value fields per key (e.g. asp_multiplier + win_rate_multiplier) */
  valueFields?: ValueFieldDef[];
}

export interface ScenarioType {
  key: string;
  label: string;
  description: string;
  pairDef: PairDef;
  /** Alternative names from the backend that should match this entry */
  aliases?: string[];
}

export interface ScenarioPair {
  key: string;
  value: number | "";
  /** For multi-value scenarios, store values by backendKey */
  values?: Record<string, number | "">;
}

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const SCENARIO_REGISTRY: ScenarioType[] = [
  {
    key: "attrition_spike",
    label: "Attrition Spike",
    description: "Model sudden headcount loss across selected months",
    pairDef: {
      keyLabel: "Month",
      valueLabel: "HC Change",
      source: "months",
      valueValidation: {
        required: true,
        dynamicMin: (config) => -config.ae_model.starting_hc,
      },
      step: 1,
    },
  },
  {
    key: "product_pricing",
    label: "Pricing Pressure",
    description: "Apply pricing pressure to selected products",
    aliases: ["eor pricing pressure", "eor_pricing_pressure", "product pricing pressure"],
    pairDef: {
      keyLabel: "Product",
      source: "product",
      valueFields: [
        {
          backendKey: "asp_multiplier",
          label: "ASP Multiplier (%)",
          validation: { min: 0, max: 200, required: true },
          step: 1,
          suffix: "%",
          percentToDecimal: true,
        },
        {
          backendKey: "win_rate_multiplier",
          label: "Win Rate Multiplier (%)",
          validation: { min: 0, max: 200, required: true },
          step: 1,
          suffix: "%",
          percentToDecimal: true,
        },
      ],
    },
  },
  {
    key: "channel_budget_cut",
    label: "Channel Budget Cut",
    description: "Reduce budget allocation for selected channels",
    aliases: ["marketing budget cut", "marketing_budget_cut"],
    pairDef: {
      keyLabel: "Channel",
      source: "channel",
      valueFields: [
        {
          backendKey: "channel_share_ceiling",
          label: "Share Ceiling (%)",
          validation: { min: 0, max: 100, required: true },
          step: 1,
          suffix: "%",
          percentToDecimal: true,
        },
        {
          backendKey: "lead_volume_multiplier",
          label: "Lead Volume Multiplier (%)",
          validation: { min: 0, max: 200, required: true },
          step: 1,
          suffix: "%",
          percentToDecimal: true,
        },
      ],
    },
  },
  {
    key: "hiring_freeze",
    label: "Hiring Freeze",
    description: "Freeze all new hiring during selected months",
    pairDef: {
      keyLabel: "Month",
      valueLabel: "HC Delta",
      source: "months",
      valueValidation: { required: false },
      step: 1,
    },
  },
  {
    key: "new_market_entry",
    label: "New Market Entry",
    description: "Model expansion into new geographic regions",
    pairDef: {
      keyLabel: "Region",
      valueLabel: "Expected Revenue ($)",
      source: "region",
      valueValidation: { min: 0, required: true },
      step: 1000,
    },
  },
];

/** Get dropdown options for a given source */
export function getDropdownOptions(
  source: SourceType,
  config: GTMConfig
): { label: string; value: string }[] {
  if (source === "months") {
    return MONTH_LABELS.map((label, i) => ({ label, value: String(i + 1) }));
  }
  const dimMap: Record<string, keyof GTMConfig["dimensions"]> = {
    product: "product",
    channel: "channel",
    region: "region",
  };
  const dim = dimMap[source];
  if (dim && config.dimensions[dim]) {
    return config.dimensions[dim].values.map((v) => ({ label: v, value: v }));
  }
  return [];
}

/** Check if a scenario uses multi-value fields */
export function isMultiValue(entry: ScenarioType): boolean {
  return Array.isArray(entry.pairDef.valueFields) && entry.pairDef.valueFields.length > 0;
}

/** Convert pairs → perturbations Record for backend */
export function buildPerturbations(
  scenarioKey: string,
  pairs: ScenarioPair[]
): Record<string, unknown> {
  const entry = SCENARIO_REGISTRY.find((s) => s.key === scenarioKey);
  if (!entry) return { pairs };

  if (isMultiValue(entry)) {
    // Build backend format: { "asp_multiplier": {"EOR": 0.85}, "win_rate_multiplier": {"EOR": 0.9} }
    const result: Record<string, Record<string, number>> = {};
    for (const field of entry.pairDef.valueFields!) {
      result[field.backendKey] = {};
    }
    for (const pair of pairs) {
      if (!pair.key || !pair.values) continue;
      for (const field of entry.pairDef.valueFields!) {
        const raw = pair.values[field.backendKey];
        if (raw !== "" && raw !== undefined) {
          const val = field.percentToDecimal ? Number(raw) / 100 : Number(raw);
          result[field.backendKey][pair.key] = val;
        }
      }
    }
    return result;
  }

  return { pairs };
}

/** Convert existing perturbations → pairs array */
export function parsePerturbations(
  scenarioKey: string,
  perturbations: Record<string, unknown>
): ScenarioPair[] {
  const entry = SCENARIO_REGISTRY.find((s) => s.key === scenarioKey);

  // New format: pairs array (for simple scenarios)
  if (Array.isArray(perturbations.pairs)) {
    return perturbations.pairs as ScenarioPair[];
  }

  // Multi-value format: { "asp_multiplier": {"EOR": 0.85}, ... }
  if (entry && isMultiValue(entry)) {
    const keySet = new Set<string>();
    for (const field of entry.pairDef.valueFields!) {
      const obj = perturbations[field.backendKey];
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (const k of Object.keys(obj as Record<string, unknown>)) {
          keySet.add(k);
        }
      }
    }
    return Array.from(keySet).map((itemKey) => {
      const values: Record<string, number | ""> = {};
      for (const field of entry.pairDef.valueFields!) {
        const obj = perturbations[field.backendKey] as Record<string, number> | undefined;
        const raw = obj?.[itemKey];
        if (raw !== undefined) {
          values[field.backendKey] = field.percentToDecimal ? Math.round(raw * 100) : raw;
        } else {
          values[field.backendKey] = "";
        }
      }
      return { key: itemKey, value: "", values };
    });
  }

  // Legacy: extract from nested objects
  const pairMap = new Map<string, number>();
  for (const [, val] of Object.entries(perturbations)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      for (const [innerKey, innerVal] of Object.entries(val as Record<string, unknown>)) {
        if (typeof innerVal === "number" && !pairMap.has(innerKey)) {
          pairMap.set(innerKey, innerVal);
        }
      }
    }
  }
  if (pairMap.size > 0) {
    return Array.from(pairMap.entries()).map(([key, value]) => ({ key, value }));
  }
  // Fallback
  const pairs: ScenarioPair[] = [];
  for (const [key, val] of Object.entries(perturbations)) {
    if (key === "pairs") continue;
    if (typeof val === "number") {
      pairs.push({ key, value: val });
    }
  }
  return pairs;
}

/** Validate scenario pairs, returning error messages */
export function validateScenarioParams(
  scenarioKey: string,
  pairs: ScenarioPair[],
  config: GTMConfig
): string[] {
  const entry = SCENARIO_REGISTRY.find((s) => s.key === scenarioKey);
  if (!entry) return [];

  const errors: string[] = [];

  if (pairs.length === 0) {
    errors.push(`${entry.label}: At least one ${entry.pairDef.keyLabel.toLowerCase()} must be added.`);
    return errors;
  }

  if (isMultiValue(entry)) {
    for (const pair of pairs) {
      if (!pair.key) {
        errors.push(`${entry.label}: A ${entry.pairDef.keyLabel.toLowerCase()} must be selected.`);
        continue;
      }
      for (const field of entry.pairDef.valueFields!) {
        const raw = pair.values?.[field.backendKey];
        const num = Number(raw);
        const v = field.validation;
        if (v?.required && (raw === "" || raw === undefined || isNaN(num))) {
          errors.push(`${entry.label}: ${field.label} is required for "${pair.key}".`);
        } else if (raw !== "" && raw !== undefined && !isNaN(num)) {
          if (v?.min !== undefined && num < v.min) {
            errors.push(`${entry.label}: ${field.label} for "${pair.key}" cannot be less than ${v.min}%.`);
          }
          if (v?.max !== undefined && num > v.max) {
            errors.push(`${entry.label}: ${field.label} for "${pair.key}" cannot exceed ${v.max}%.`);
          }
        }
      }
    }
    return errors;
  }

  // Simple single-value validation
  const v = entry.pairDef.valueValidation;
  for (const pair of pairs) {
    if (!pair.key) {
      errors.push(`${entry.label}: A ${entry.pairDef.keyLabel.toLowerCase()} must be selected.`);
      continue;
    }
    const num = Number(pair.value);
    if (v?.required && (pair.value === "" || isNaN(num))) {
      errors.push(`${entry.label}: ${entry.pairDef.valueLabel} is required for "${pair.key}".`);
    } else if (pair.value !== "" && !isNaN(num)) {
      const effectiveMin = v?.dynamicMin ? v.dynamicMin(config) : v?.min;
      if (effectiveMin !== undefined && num < effectiveMin) {
        errors.push(`${entry.label}: ${entry.pairDef.valueLabel} for "${pair.key}" cannot be less than ${effectiveMin}.`);
      }
      if (v?.max !== undefined && num > v.max) {
        errors.push(`${entry.label}: ${entry.pairDef.valueLabel} for "${pair.key}" cannot exceed ${v.max}.`);
      }
    }
  }
  return errors;
}

/** Match a scenario name to a registry key */
export function matchScenarioToRegistry(name: string): ScenarioType | undefined {
  const lower = name.toLowerCase().trim();
  const normalized = lower.replace(/[^a-z]/g, "");
  return SCENARIO_REGISTRY.find((s) => {
    if (s.aliases?.some((a) => lower === a || lower.includes(a))) return true;
    const sLower = s.key.replace(/_/g, "");
    const sLabel = s.label.toLowerCase().replace(/[^a-z]/g, "");
    return normalized.includes(sLower) || normalized.includes(sLabel) || sLower.includes(normalized) || sLabel.includes(normalized);
  });
}
