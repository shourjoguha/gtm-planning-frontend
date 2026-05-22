import type { GTMConfig } from "@/types/config";
import { matchScenarioToRegistry } from "@/lib/scenarioRegistry";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2 } from "lucide-react";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DOLLAR_KEYS = new Set([
  "Annual Target", "Prior Year Actuals", "Productivity Per AE",
  "Supersized Deal Threshold",
]);
const RATE_KEYS = /^(Growth Rate|Share Floor|Share Ceiling|Pipeline To Bookings Ratio|High Threshold|Medium Threshold|Default Fallback Multiplier|Overhead Pct Per New Hire|Annual Rate|Pto Pct|Admin Pct|Enablement Base Pct|Enablement Max Pct|Floor Multiplier|Rate|Tolerance|Revenue Tolerance|Confidence Risk.*Pct|Stretch Threshold)$/;

function fmtVal(key: string, raw: unknown): string {
  if (raw === null || raw === undefined) return "—";
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (Array.isArray(raw)) {
    if (raw.length === 0) return "—";
    if (typeof raw[0] === "object") return raw.map((t, i) => `#${i + 1}: ${JSON.stringify(t)}`).join("; ");
    return raw.join(", ");
  }
  if (typeof raw === "object") return JSON.stringify(raw);
  const num = Number(raw);
  if (isNaN(num) || typeof raw === "string") return String(raw);
  if (DOLLAR_KEYS.has(key)) {
    if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    return `$${num.toLocaleString()}`;
  }
  if (RATE_KEYS.test(key)) return `${(num * 100).toFixed(1)}%`;
  if (Number.isInteger(num) && Math.abs(num) >= 1000) return num.toLocaleString();
  if (!Number.isInteger(num)) return num.toFixed(2);
  return String(num);
}

function humanKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildConfigDisplay(config: GTMConfig): Record<string, Record<string, string>> {
  const sections: Record<string, Record<string, string>> = {};

  const add = (section: string, key: string, value: unknown) => {
    if (!sections[section]) sections[section] = {};
    sections[section][key] = fmtVal(key, value);
  };

  // Targets
  const t = config.targets;
  add("Targets", "Annual Target", t.annual_target);
  add("Targets", "Growth Rate", t.growth_rate);
  add("Targets", "Prior Year Actuals", t.prior_year_actuals);
  add("Targets", "Target Source", t.target_source);
  add("Targets", "Planning Mode", t.planning_mode);
  add("Targets", "Period Type", t.period_type);
  if (t.locked_months?.length) add("Targets", "Locked Months", t.locked_months.map(m => MONTH_NAMES[m - 1] || m).join(", "));
  // Seasonality as compact string
  const swEntries = Object.entries(t.seasonality_weights);
  if (swEntries.length > 0) {
    const sw = swEntries.map(([k, v]) => `${MONTH_NAMES[Number(k) - 1] || k}: ${v}`).join(", ");
    add("Targets", "Seasonality", sw);
  }

  // Dimensions
  const d = config.dimensions;
  for (const [dim, val] of Object.entries(d)) {
    const status = val.enabled ? "✓" : "✗";
    add("Dimensions", `${status} ${humanKey(dim)}`, val.values?.join(", ") || "—");
  }

  // Allocation
  const a = config.allocation;
  add("Allocation", "Optimizer Mode", a.optimizer_mode);
  add("Allocation", "Share Floor", a.constraints.share_floor);
  add("Allocation", "Share Ceiling", a.constraints.share_ceiling);
  add("Allocation", "Objective Metric", a.objective.metric);
  add("Allocation", "Direction", a.objective.direction);
  add("Allocation", "Pipeline To Bookings Ratio", a.objective.pipeline_to_bookings_ratio);

  // Economics (compact)
  const e = config.economics;
  add("Economics", "ASP Decay Fn", e.default_decay.asp.function);
  add("Economics", "ASP Decay Rate", e.default_decay.asp.rate);
  add("Economics", "Win Rate Decay Fn", e.default_decay.win_rate.function);
  add("Economics", "Win Rate Decay Rate", e.default_decay.win_rate.rate);
  add("Economics", "Baseline Source", e.baseline.source);
  add("Economics", "Calibration", e.use_calibration);
  add("Economics", "Cash Cycle", e.cash_cycle.enabled);
  add("Economics", "High Threshold", e.confidence.high_threshold);
  add("Economics", "Medium Threshold", e.confidence.medium_threshold);

  // AE Model
  const ae = config.ae_model;
  add("AE Model", "Starting HC", ae.starting_hc);
  add("AE Model", "Productivity Per AE", ae.productivity_per_ae);
  add("AE Model", "Ramp Duration (days)", ae.ramp.duration_days);
  add("AE Model", "Ramp Velocity", ae.ramp.velocity);
  add("AE Model", "Attrition Rate", ae.attrition.annual_rate);
  add("AE Model", "Backfill Delay (mo)", ae.attrition.backfill_delay_months);
  add("AE Model", "Stretch Threshold", ae.stretch_threshold);
  if (ae.hiring_plan?.length) {
    add("AE Model", "Hiring Tranches", ae.hiring_plan.map((h, i) => `#${i + 1}: ${h.count} @ M${h.start_month}`).join("; "));
  }

  // What-If Scenarios
  if (config.what_if_scenarios?.length) {
    for (const scenario of config.what_if_scenarios) {
      if (!scenario.enabled) continue;
      const entry = matchScenarioToRegistry(scenario.name);
      const label = entry?.label ?? scenario.name;
      const params = Object.entries(scenario.perturbations)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("; ");
      add("What-If Scenarios", label, params || "Enabled");
    }
  }
  // System
  const s = config.system;
  add("System", "Log Level", s.log_level);
  add("System", "Tolerance", s.tolerance);
  add("System", "Revenue Tolerance", s.revenue_tolerance);
  add("System", "Solver Method", s.solver.method);
  add("System", "Max Iterations", s.solver.max_iterations);
  add("System", "Output Dir", s.output_dir);
  add("System", "Results Format", s.results_format);

  return sections;
}

interface ConfirmRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: GTMConfig;
  onConfirm: () => void;
}

export default function ConfirmRunDialog({ open, onOpenChange, config, onConfirm }: ConfirmRunDialogProps) {
  const display = buildConfigDisplay(config);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[80vw] w-[80vw] max-h-[80vh] p-0 flex flex-col overflow-hidden">
        <AlertDialogHeader className="px-6 pt-6 pb-2">
          <AlertDialogTitle className="flex items-center gap-2 font-display text-xl tracking-tight">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Confirm Run Plan
          </AlertDialogTitle>
          <AlertDialogDescription>
            Review your configuration before running the plan.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="px-6 pb-4 overflow-y-auto flex-1" style={{ maxHeight: "calc(80vh - 140px)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
            {Object.entries(display).map(([section, values]) => (
              <Card key={section} className="bg-muted/40 border-border/40">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground">{section}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <dl className="space-y-1.5">
                    {Object.entries(values).map(([key, val]) => (
                      <div key={key} className="flex justify-between gap-2 text-xs">
                        <dt className="text-muted-foreground shrink-0">{key}</dt>
                        <dd className="font-medium text-right truncate max-w-[60%]">{val}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <AlertDialogFooter className="px-6 pb-6 pt-2 border-t">
          <AlertDialogCancel>Go Back</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm &amp; Run</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
