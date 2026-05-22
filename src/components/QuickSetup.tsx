import type { GTMConfig, HiringTranche } from "@/types/config";
import { Surface, Stat } from "@/components/ui/surface";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuickSetupProps {
  config: GTMConfig;
  onChange: (config: GTMConfig) => void;
}

function formatM(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  return `$${(n / 1_000_000).toFixed(0)}M`;
}

export default function QuickSetup({ config, onChange }: QuickSetupProps) {
  const totalHires = (config.ae_model.hiring_plan as HiringTranche[]).reduce(
    (sum, t) => sum + (t.count || 0),
    0,
  );
  const tranches = config.ae_model.hiring_plan.length;

  const update = <K extends keyof GTMConfig>(section: K, value: Partial<GTMConfig[K]>) => {
    onChange({ ...config, [section]: { ...config[section], ...value } });
  };

  return (
    <Surface className="overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
        {/* Annual target */}
        <div className="p-5 space-y-3">
          <Stat
            label="Annual Target"
            value={formatM(config.targets.annual_target)}
            hint={config.targets.target_source === "growth" ? "from prior × growth" : "fixed"}
          />
          <Input
            type="number"
            value={config.targets.annual_target}
            className="h-8 text-xs tabular-nums"
            onChange={(e) => {
              const v = Number(e.target.value);
              if (config.targets.target_source === "growth") {
                update("targets", { target_source: "fixed", annual_target: v });
              } else {
                update("targets", { annual_target: v });
              }
            }}
          />
        </div>

        {/* Optimizer mode */}
        <div className="p-5 space-y-3">
          <Stat
            label="Optimizer"
            value={
              <span className="capitalize">{config.allocation.optimizer_mode}</span>
            }
            hint={config.allocation.optimizer_mode === "solver" ? "scipy SLSQP" : "greedy walk"}
          />
          <Select
            value={config.allocation.optimizer_mode}
            onValueChange={(v) => {
              onChange({
                ...config,
                allocation: { ...config.allocation, optimizer_mode: v as "greedy" | "solver" },
              });
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="greedy">Greedy (fast)</SelectItem>
              <SelectItem value="solver">Solver (precise)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Starting HC */}
        <div className="p-5 space-y-3">
          <Stat
            label="Starting AEs"
            value={config.ae_model.starting_hc}
            hint={`${config.ae_model.productivity_per_ae} SAOs/AE`}
          />
          <Input
            type="number"
            value={config.ae_model.starting_hc}
            className="h-8 text-xs tabular-nums"
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({
                ...config,
                ae_model: { ...config.ae_model, starting_hc: v },
              });
            }}
          />
        </div>

        {/* Hiring plan summary */}
        <div className="p-5 space-y-3">
          <Stat
            label="Hires Planned"
            value={`+${totalHires}`}
            hint={`${tranches} ${tranches === 1 ? "tranche" : "tranches"}`}
          />
          <p className="text-[11px] text-muted-foreground/80 leading-snug">
            Edit individual tranches in the <span className="text-foreground">AE Model</span> section below.
          </p>
        </div>
      </div>
    </Surface>
  );
}
