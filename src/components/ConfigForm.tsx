import { useState } from "react";
import type { GTMConfig, WhatIfScenario, HiringTranche } from "@/types/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Target, Layers, Sliders, TrendingDown, Users, Shuffle, Settings, Plus, Trash2, AlertTriangle } from "lucide-react";
import {
  SCENARIO_REGISTRY,
  getDropdownOptions,
  buildPerturbations,
  parsePerturbations,
  matchScenarioToRegistry,
  validateScenarioParams,
  isMultiValue,
  type ScenarioType,
  type ScenarioPair,
} from "@/lib/scenarioRegistry";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ConfigFormProps {
  config: GTMConfig;
  onChange: (config: GTMConfig) => void;
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center w-4 h-4 ml-1.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold cursor-help hover:bg-primary hover:text-primary-foreground transition-colors">?</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">{text}</TooltipContent>
    </Tooltip>
  );
}

function Section({ title, icon: Icon, defaultOpen = false, children, badge }: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Icon className="h-4 w-4 text-primary" />
                {title}
              </span>
              {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-5 space-y-4">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function Field({ label, tip, children, className }: { label: string; tip?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-sm font-medium flex items-center mb-1.5">
        {label}
        {tip && <InfoTip text={tip} />}
      </Label>
      {children}
    </div>
  );
}

/** Input that displays a decimal (0.15) as a percentage (15) with a % suffix */
function PercentInput({ value, onChange, step = 1, className }: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  className?: string;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        step={step}
        value={Math.round(value * 10000) / 100}
        className={className}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
      <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
    </div>
  );
}

/** Decay rate input with color-coded warnings based on decay function type */
function DecayRateInput({ value, onChange, decayFunction, floor }: {
  value: number;
  onChange: (v: number) => void;
  decayFunction: string;
  floor: number;
}) {
  const getWarning = (): { level: "ok" | "yellow" | "red"; message: string } => {
    if (decayFunction === "none" || decayFunction === "step") return { level: "ok", message: "" };

    if (decayFunction === "exponential") {
      // Ideal: 0.005–0.02. Yellow: 0.001–0.05. Red: outside that.
      // Red high: rate > -ln(floor)/1 ≈ hits floor in one step above threshold
      const hitsFloorOneStep = floor > 0 ? -Math.log(floor) : 5;
      if (value <= 0) return { level: "red", message: "Rate must be positive — no decay will occur" };
      if (value >= hitsFloorOneStep) return { level: "red", message: `Rate too high — ASP hits floor in ~1 step (max useful ≈ ${hitsFloorOneStep.toFixed(3)})` };
      if (value < 0.001) return { level: "red", message: "Rate too low — decay is negligible, effectively no impact" };
      if (value < 0.005 || value > 0.05) return { level: "yellow", message: `Outside ideal range (0.005–0.02). Current: ${value}` };
      return { level: "ok", message: "" };
    }

    if (decayFunction === "linear") {
      // Ideal: 0.05–0.2. Yellow: 0.01–0.5. Red: outside that.
      // Red high: rate × 1 > (1 - floor) ≈ hits floor in one step
      const hitsFloorOneStep = floor > 0 ? (1 - floor) : 1;
      if (value <= 0) return { level: "red", message: "Rate must be positive — no decay will occur" };
      if (value >= hitsFloorOneStep) return { level: "red", message: `Rate too high — hits floor in ~1 step (max useful ≈ ${hitsFloorOneStep.toFixed(3)})` };
      if (value < 0.01) return { level: "red", message: "Rate too low — decay is negligible after many iterations" };
      if (value < 0.05 || value > 0.5) return { level: "yellow", message: `Outside ideal range (0.05–0.2). Current: ${value}` };
      return { level: "ok", message: "" };
    }

    return { level: "ok", message: "" };
  };

  const warning = getWarning();
  const borderClass = warning.level === "red"
    ? "border-destructive focus-visible:ring-destructive"
    : warning.level === "yellow"
      ? "border-yellow-500 focus-visible:ring-yellow-500"
      : "";

  const tipText = decayFunction === "exponential"
    ? "Exponential decay: ideal range 0.005–0.02. Lower = slower decay, higher = faster. Formula: base × exp(-rate × excess_volume)"
    : decayFunction === "linear"
      ? "Linear decay: ideal range 0.05–0.2. Lower = slower decay, higher = faster. Formula: base - rate × excess_volume"
      : "Rate controls how quickly the value decays with excess volume";

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          type="number"
          step={0.001}
          value={value}
          className={borderClass}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      {warning.level !== "ok" && (
        <div className={`flex items-start gap-1 text-xs ${warning.level === "red" ? "text-destructive" : "text-yellow-600 dark:text-yellow-400"}`}>
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{warning.message}</span>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">{tipText}</p>
    </div>
  );
}


/** Interactive editor for a single scenario's key-value pairs */
function ScenarioParamEditor({ entry, pairs, config, errors, onChange }: {
  entry: ScenarioType;
  pairs: ScenarioPair[];
  config: GTMConfig;
  errors: string[];
  onChange: (pairs: ScenarioPair[]) => void;
}) {
  const options = getDropdownOptions(entry.pairDef.source, config);
  const usedKeys = new Set(pairs.map((p) => p.key));
  const pairDef = entry.pairDef;
  const multiValue = isMultiValue(entry);
  const valueFields = pairDef.valueFields ?? [];

  const effectiveMin = pairDef.valueValidation?.dynamicMin
    ? pairDef.valueValidation.dynamicMin(config)
    : pairDef.valueValidation?.min;

  const colTemplate = multiValue
    ? `1fr ${valueFields.map(() => "120px").join(" ")} 32px`
    : "1fr 120px 32px";

  return (
    <div className="mt-2 space-y-3">
      {/* Header */}
      <div className="grid gap-2 text-xs font-medium text-muted-foreground" style={{ gridTemplateColumns: colTemplate }}>
        <span>{pairDef.keyLabel}</span>
        {multiValue
          ? valueFields.map((f) => <span key={f.backendKey}>{f.label}</span>)
          : <span>{pairDef.valueLabel}</span>
        }
        <span />
      </div>

      {/* Scrollable pairs list */}
      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
        {pairs.map((pair, idx) => (
          <div key={idx} className="grid gap-2 items-center" style={{ gridTemplateColumns: colTemplate }}>
            <Select
              value={pair.key}
              onValueChange={(v) => {
                const next = [...pairs];
                next[idx] = { ...next[idx], key: v };
                onChange(next);
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={`Select ${pairDef.keyLabel.toLowerCase()}...`} />
              </SelectTrigger>
              <SelectContent>
                <div className="max-h-48 overflow-y-auto">
                  {options.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      disabled={usedKeys.has(opt.value) && pair.key !== opt.value}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>

            {multiValue ? (
              valueFields.map((field) => (
                <div key={field.backendKey} className="relative">
                  <Input
                    type="number"
                    step={field.step ?? 1}
                    min={field.validation?.min}
                    max={field.validation?.max}
                    value={pair.values?.[field.backendKey] ?? ""}
                    className="h-8 text-sm"
                    onChange={(e) => {
                      const next = [...pairs];
                      const newValues = { ...(next[idx].values ?? {}) };
                      newValues[field.backendKey] = e.target.value === "" ? "" : Number(e.target.value);
                      next[idx] = { ...next[idx], values: newValues };
                      onChange(next);
                    }}
                  />
                  {field.suffix && (
                    <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                      {field.suffix}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="relative">
                <Input
                  type="number"
                  step={pairDef.step ?? 1}
                  min={effectiveMin}
                  max={pairDef.valueValidation?.max}
                  value={pair.value}
                  className="h-8 text-sm"
                  onChange={(e) => {
                    const next = [...pairs];
                    next[idx] = {
                      ...next[idx],
                      value: e.target.value === "" ? "" : Number(e.target.value),
                    };
                    onChange(next);
                  }}
                />
                {pairDef.suffix && (
                  <span className="absolute right-7 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                    {pairDef.suffix}
                  </span>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onChange(pairs.filter((_, j) => j !== idx))}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add pair button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          const newPair: ScenarioPair = { key: "", value: "" };
          if (multiValue) {
            const values: Record<string, number | ""> = {};
            for (const f of valueFields) values[f.backendKey] = "";
            newPair.values = values;
          }
          onChange([...pairs, newPair]);
        }}
      >
        <Plus className="h-3 w-3 mr-1" /> Add {pairDef.keyLabel}
      </Button>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, idx) => (
            <div key={idx} className="flex items-start gap-1 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConfigForm({ config, onChange }: ConfigFormProps) {
  const update = <K extends keyof GTMConfig>(section: K, value: Partial<GTMConfig[K]>) => {
    onChange({ ...config, [section]: { ...config[section], ...value } });
  };

  const updateNested = (path: string, value: unknown) => {
    const keys = path.split(".");
    const newConfig = JSON.parse(JSON.stringify(config));
    let obj = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    onChange(newConfig);
  };

  const formatCurrency = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

  return (
    <div className="space-y-3">
      {/* TARGETS */}
      <Section title="Targets" icon={Target} defaultOpen badge={formatCurrency(config.targets.annual_target)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Target Source" tip="'growth' derives from prior year × growth rate; 'fixed' uses the annual target directly">
            <Select value={config.targets.target_source} onValueChange={(v) => {
              const src = v as "fixed" | "growth";
              if (src === "growth") {
                const computed = config.targets.prior_year_actuals * (1 + config.targets.growth_rate);
                update("targets", { target_source: src, annual_target: Math.round(computed) });
              } else {
                update("targets", { target_source: src });
              }
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Target</SelectItem>
                <SelectItem value="growth">Growth-Based</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Annual Target ($)" tip={config.targets.target_source === "growth" ? "Auto-calculated from prior year × (1 + growth rate)" : "Used when target source is 'fixed'"}>
            <Input type="number" value={config.targets.annual_target} disabled={config.targets.target_source === "growth"} onChange={(e) => update("targets", { annual_target: Number(e.target.value) })} className={config.targets.target_source === "growth" ? "opacity-70" : ""} />
          </Field>
          <Field label="Prior Year Actuals ($)" tip="Base for growth-derived target">
            <Input type="number" value={config.targets.prior_year_actuals} onChange={(e) => {
              const prior = Number(e.target.value);
              if (config.targets.target_source === "growth") {
                update("targets", { prior_year_actuals: prior, annual_target: Math.round(prior * (1 + config.targets.growth_rate)) });
              } else {
                update("targets", { prior_year_actuals: prior });
              }
            }} />
          </Field>
          <Field label="Growth Rate (%)" tip="Multiplied by prior year actuals: target = prior × (1 + rate)">
            <PercentInput value={config.targets.growth_rate} onChange={(v) => {
              if (config.targets.target_source === "growth") {
                update("targets", { growth_rate: v, annual_target: Math.round(config.targets.prior_year_actuals * (1 + v)) });
              } else {
                update("targets", { growth_rate: v });
              }
            }} step={0.5} />
          </Field>
          <Field label="Planning Mode" tip="full_year optimizes all 12 months; rolling_forward locks actuals">
            <Select value={config.targets.planning_mode} onValueChange={(v) => update("targets", { planning_mode: v as GTMConfig["targets"]["planning_mode"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_year">Full Year</SelectItem>
                <SelectItem value="rolling_forward">Rolling Forward</SelectItem>
                <SelectItem value="manual_lock">Manual Lock</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Seasonality Weights (%) <InfoTip text="Monthly weights as percentages. Must sum to 100%. Controls how the annual target is distributed." /></Label>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {Array.from({ length: 12 }, (_, i) => `month_${i + 1}`).map((key) => {
              const val = config.targets.seasonality_weights[key] ?? 0;
              return (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">{key.replace("month_", "M")}</Label>
                  <PercentInput
                    value={val}
                    step={0.5}
                    className="text-xs h-8"
                    onChange={(v) => {
                      const newWeights = { ...config.targets.seasonality_weights, [key]: v };
                      update("targets", { seasonality_weights: newWeights });
                    }}
                  />
                </div>
              );
            })}
          </div>
          {(() => {
            const sum = Object.values(config.targets.seasonality_weights).reduce((a, b) => a + b, 0);
            const isValid = Math.abs(sum - 1.0) < 0.001;
            return (
              <p className={`text-xs mt-1 ${isValid ? "text-muted-foreground" : "text-destructive font-medium"}`}>
                Sum: {(sum * 100).toFixed(2)}% {!isValid && "(must equal 100%)"}
              </p>
            );
          })()}
        </div>
      </Section>

      {/* DIMENSIONS */}
      <Section title="Dimensions" icon={Layers}>
        <p className="text-sm text-muted-foreground mb-3">Toggle which dimensions are active in the optimization. Active dimensions multiply the segment count.</p>
        <div className="space-y-3">
          {(Object.keys(config.dimensions) as Array<keyof GTMConfig["dimensions"]>).map((dim) => (
            <div key={dim} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <span className="font-medium capitalize">{dim.replace("_", " ")}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  [{config.dimensions[dim].values.join(", ")}]
                </span>
              </div>
              <Switch
                checked={config.dimensions[dim].enabled}
                onCheckedChange={(checked) => {
                  updateNested(`dimensions.${dim}.enabled`, checked);
                }}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ALLOCATION */}
      <Section title="Allocation" icon={Sliders}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Optimizer Mode" tip="Greedy: fastest, uses a deterministic 1% step heuristic — good for quick iterations. Solver (SLSQP): precise continuous optimization, fast convergence, best for most production runs. Solver (Trust-constr): most robust for highly constrained problems but slowest — use when SLSQP fails to converge.">
            <Select
              value={
                config.allocation.optimizer_mode === "greedy"
                  ? "greedy"
                  : `solver:${config.system.solver.method}`
              }
              onValueChange={(v) => {
                if (v === "greedy") {
                  update("allocation", { optimizer_mode: "greedy" });
                } else {
                  const method = v.split(":")[1];
                  const newConfig = JSON.parse(JSON.stringify(config));
                  newConfig.allocation.optimizer_mode = "solver";
                  newConfig.system.solver.method = method;
                  onChange(newConfig);
                }
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="greedy">Greedy (fastest)</SelectItem>
                <SelectItem value="solver:SLSQP">Solver — SLSQP (recommended)</SelectItem>
                <SelectItem value="solver:trust-constr">Solver — Trust-constr (most robust)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Objective Metric" tip="What the optimizer maximizes">
            <Input value={config.allocation.objective.metric} readOnly className="bg-muted" />
          </Field>
          <Field label="Share Floor (%)" tip="Minimum share per segment per month (hard constraint)">
            <PercentInput value={config.allocation.constraints.share_floor} onChange={(v) => updateNested("allocation.constraints.share_floor", v)} step={0.5} />
          </Field>
          <Field label="Share Ceiling (%)" tip="Maximum share per segment per month (hard constraint)">
            <PercentInput value={config.allocation.constraints.share_ceiling} onChange={(v) => updateNested("allocation.constraints.share_ceiling", v)} step={0.5} />
          </Field>
          <Field label="Pipeline-to-Bookings Ratio">
            <Input type="number" step="0.01" value={config.allocation.objective.pipeline_to_bookings_ratio} onChange={(e) => updateNested("allocation.objective.pipeline_to_bookings_ratio", Number(e.target.value))} />
          </Field>
        </div>
      </Section>

      {/* ECONOMICS */}
      <Section title="Economics" icon={TrendingDown}>
        <div>
          <h4 className="text-sm font-semibold mb-3">ASP Decay</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Function">
              <Select value={config.economics.default_decay.asp.function} onValueChange={(v) => updateNested("economics.default_decay.asp.function", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exponential">Exponential</SelectItem>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="step">Step</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Rate">
              <DecayRateInput
                value={config.economics.default_decay.asp.rate}
                onChange={(v) => updateNested("economics.default_decay.asp.rate", v)}
                decayFunction={config.economics.default_decay.asp.function}
                floor={config.economics.default_decay.asp.floor_multiplier}
              />
            </Field>
            <Field label="Threshold" tip="Volume below which no decay applies">
              <Input type="number" value={config.economics.default_decay.asp.threshold} onChange={(e) => updateNested("economics.default_decay.asp.threshold", Number(e.target.value))} />
            </Field>
            <Field label="Floor Multiplier" tip="ASP never drops below this × base">
              <Input type="number" step="0.01" value={config.economics.default_decay.asp.floor_multiplier} onChange={(e) => updateNested("economics.default_decay.asp.floor_multiplier", Number(e.target.value))} />
            </Field>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Win Rate Decay</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Function">
              <Select value={config.economics.default_decay.win_rate.function} onValueChange={(v) => updateNested("economics.default_decay.win_rate.function", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="exponential">Exponential</SelectItem>
                  <SelectItem value="step">Step</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Rate">
              <DecayRateInput
                value={config.economics.default_decay.win_rate.rate}
                onChange={(v) => updateNested("economics.default_decay.win_rate.rate", v)}
                decayFunction={config.economics.default_decay.win_rate.function}
                floor={config.economics.default_decay.win_rate.floor_multiplier}
              />
            </Field>
            <Field label="Threshold">
              <Input type="number" value={config.economics.default_decay.win_rate.threshold} onChange={(e) => updateNested("economics.default_decay.win_rate.threshold", Number(e.target.value))} />
            </Field>
            <Field label="Floor Multiplier">
              <Input type="number" step="0.01" value={config.economics.default_decay.win_rate.floor_multiplier} onChange={(e) => updateNested("economics.default_decay.win_rate.floor_multiplier", Number(e.target.value))} />
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Baseline Aggregation">
            <Select value={config.economics.baseline.aggregation} onValueChange={(v) => updateNested("economics.baseline.aggregation", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="median">Median</SelectItem>
                <SelectItem value="mean">Mean</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Use Calibration" tip="Fit decay curves from deal-level data using curve_fit">
            <div className="pt-2">
              <Switch checked={config.economics.use_calibration} onCheckedChange={(v) => update("economics", { use_calibration: v })} />
            </div>
          </Field>
          <Field label="Cash Cycle" tip="When enabled, SAOs don't convert to bookings instantly">
            <div className="pt-2">
              <Switch checked={config.economics.cash_cycle.enabled} onCheckedChange={(v) => updateNested("economics.cash_cycle.enabled", v)} />
            </div>
          </Field>
        </div>
      </Section>

      {/* AE MODEL */}
      <Section title="AE Model" icon={Users} badge={`${config.ae_model.starting_hc} AEs`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Starting Headcount" tip="Initial tenured AEs at month 1">
            <Input type="number" value={config.ae_model.starting_hc} onChange={(e) => updateNested("ae_model.starting_hc", Number(e.target.value))} />
          </Field>
          <Field label="Productivity/AE" tip="SAOs per fully-ramped AE per month">
            <Input type="number" value={config.ae_model.productivity_per_ae} onChange={(e) => updateNested("ae_model.productivity_per_ae", Number(e.target.value))} />
          </Field>
          <Field label="Ramp Duration (days)" tip="Days for new hires to reach full productivity">
            <Input type="number" value={config.ae_model.ramp.duration_days} onChange={(e) => updateNested("ae_model.ramp.duration_days", Number(e.target.value))} />
          </Field>
          <Field label="Annual Attrition Rate (%)">
            <PercentInput value={config.ae_model.attrition.annual_rate} onChange={(v) => updateNested("ae_model.attrition.annual_rate", v)} step={0.5} />
          </Field>
          <Field label="Backfill Delay (months)">
            <Input type="number" value={config.ae_model.attrition.backfill_delay_months} onChange={(e) => updateNested("ae_model.attrition.backfill_delay_months", Number(e.target.value))} />
          </Field>
          <Field label="Stretch Threshold" tip="Recovery engine flags quarters requiring above this × original target">
            <Input type="number" step="0.01" value={config.ae_model.stretch_threshold} onChange={(e) => updateNested("ae_model.stretch_threshold", Number(e.target.value))} />
          </Field>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Shrinkage</h4>
          <div className="grid grid-cols-3 gap-3">
            <Field label="PTO (%)">
              <PercentInput value={config.ae_model.shrinkage.pto_pct} onChange={(v) => updateNested("ae_model.shrinkage.pto_pct", v)} step={0.5} />
            </Field>
            <Field label="Admin (%)">
              <PercentInput value={config.ae_model.shrinkage.admin_pct} onChange={(v) => updateNested("ae_model.shrinkage.admin_pct", v)} step={0.5} />
            </Field>
            <Field label="Enablement (%)">
              <PercentInput value={config.ae_model.shrinkage.enablement_base_pct} onChange={(v) => updateNested("ae_model.shrinkage.enablement_base_pct", v)} step={0.5} />
            </Field>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Mentoring</h4>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Overhead/Hire (%)" tip="% of tenured AE time per mentee">
              <PercentInput value={config.ae_model.mentoring.overhead_pct_per_new_hire} onChange={(v) => updateNested("ae_model.mentoring.overhead_pct_per_new_hire", v)} step={0.5} />
            </Field>
            <Field label="Max Mentees/AE">
              <Input type="number" value={config.ae_model.mentoring.max_mentees_per_ae} onChange={(e) => updateNested("ae_model.mentoring.max_mentees_per_ae", Number(e.target.value))} />
            </Field>
            <Field label="Warning Threshold (%)" tip="Alert when mentoring overhead exceeds this % of AE capacity">
              <PercentInput value={config.ae_model.mentoring.warning_threshold} onChange={(v) => updateNested("ae_model.mentoring.warning_threshold", v)} step={0.5} />
            </Field>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Hiring Plan</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const plan = [...config.ae_model.hiring_plan, { count: 5, start_month: config.ae_model.hiring_plan.length + 1 }];
                updateNested("ae_model.hiring_plan", plan);
              }}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Tranche
            </Button>
          </div>
          <div className="space-y-2">
            {config.ae_model.hiring_plan.map((tranche: HiringTranche, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground w-16">Tranche {i + 1}</span>
                <Field label="Count" className="flex-1">
                  <Input type="number" value={tranche.count} className="h-8" onChange={(e) => {
                    const plan = [...config.ae_model.hiring_plan];
                    plan[i] = { ...plan[i], count: Number(e.target.value) };
                    updateNested("ae_model.hiring_plan", plan);
                  }} />
                </Field>
                <Field label="Start Month" className="flex-1">
                  <Input type="number" min={1} max={12} value={tranche.start_month} className="h-8" onChange={(e) => {
                    const plan = [...config.ae_model.hiring_plan];
                    plan[i] = { ...plan[i], start_month: Number(e.target.value) };
                    updateNested("ae_model.hiring_plan", plan);
                  }} />
                </Field>
                <Button variant="ghost" size="sm" className="mt-5" onClick={() => {
                  const plan = config.ae_model.hiring_plan.filter((_: HiringTranche, idx: number) => idx !== i);
                  updateNested("ae_model.hiring_plan", plan);
                }}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* WHAT-IF SCENARIOS */}
      <Section title="What-If Scenarios" icon={Shuffle} badge={`${config.what_if_scenarios.filter((s: WhatIfScenario) => s.enabled).length} active`}>
        <div className="space-y-3">
          {config.what_if_scenarios.map((scenario: WhatIfScenario, i: number) => {
            const registryEntry = matchScenarioToRegistry(scenario.name);
            const pairs = registryEntry
              ? parsePerturbations(registryEntry.key, scenario.perturbations)
              : [];
            const errors = registryEntry && scenario.enabled
              ? validateScenarioParams(registryEntry.key, pairs, config)
              : [];

            return (
              <Collapsible key={i} open={scenario.enabled}>
                <div className="rounded-lg bg-muted/50 overflow-hidden">
                  <div className="flex items-start gap-3 p-3">
                    <Switch
                      checked={scenario.enabled}
                      className="mt-0.5"
                      onCheckedChange={(checked) => {
                        const scenarios = [...config.what_if_scenarios];
                        scenarios[i] = { ...scenarios[i], enabled: checked };
                        onChange({ ...config, what_if_scenarios: scenarios });
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{registryEntry?.label ?? scenario.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{registryEntry?.description ?? scenario.description}</p>
                    </div>
                    {scenario.enabled && (
                      <Badge variant="outline" className="text-xs shrink-0">Active</Badge>
                    )}
                  </div>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t border-border/50">
                      {registryEntry ? (
                        <ScenarioParamEditor
                          entry={registryEntry}
                          pairs={pairs}
                          config={config}
                          errors={errors}
                          onChange={(newPairs) => {
                            const scenarios = [...config.what_if_scenarios];
                            scenarios[i] = {
                              ...scenarios[i],
                              name: registryEntry.label,
                              description: registryEntry.description,
                              perturbations: buildPerturbations(registryEntry.key, newPairs),
                            };
                            onChange({ ...config, what_if_scenarios: scenarios });
                          }}
                        />
                      ) : (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Perturbations</p>
                          {Object.keys(scenario.perturbations).length > 0 ? (
                            <div className="space-y-1">
                              {Object.entries(scenario.perturbations).map(([key, val]) => (
                                <div key={key} className="flex justify-between text-xs py-1 px-2 rounded bg-background/50">
                                  <span className="font-mono text-muted-foreground">{key}</span>
                                  <span className="font-medium">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No perturbations defined</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </Section>

      {/* SYSTEM */}
      <Section title="System" icon={Settings}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Log Level">
            <Select value={config.system.log_level} onValueChange={(v) => updateNested("system.log_level", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tolerance (%)" tip="Share sum validation tolerance">
            <PercentInput value={config.system.tolerance} onChange={(v) => updateNested("system.tolerance", v)} step={0.1} />
          </Field>
          <Field label="Revenue Tolerance (%)" tip="Revenue identity check tolerance">
            <PercentInput value={config.system.revenue_tolerance} onChange={(v) => updateNested("system.revenue_tolerance", v)} step={0.1} />
          </Field>
          <Field label="Max Iterations">
            <Input type="number" value={config.system.solver.max_iterations} onChange={(e) => updateNested("system.solver.max_iterations", Number(e.target.value))} />
          </Field>
          <Field label="Supersized Threshold" tip="Flag deals with revenue > threshold × expected">
            <Input type="number" step="0.1" value={config.system.supersized_deal_threshold} onChange={(e) => updateNested("system.supersized_deal_threshold", Number(e.target.value))} />
          </Field>
        </div>
      </Section>
    </div>
  );
}
