import { useState, useEffect, useMemo, useCallback } from "react";
import type { PlanVersion, PlanSummary, PlanResult, AECapacityRow } from "@/types/config";
import { fetchVersions, fetchVersionSummary, fetchVersionResults, fetchVersionFiles, fetchVersionFile, fetchVersionRecommendations } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AlertCircle, CheckCircle2, TrendingUp, DollarSign, Users, Target, Settings2, Lightbulb, Database, LineChart, BarChart3, ScatterChart, AreaChart, Plus, Trash2, FileText, FileJson } from "lucide-react";
import Plot from "@/components/PlotlyChart";

const COLORS = [
  "hsl(234, 62%, 52%)", "hsl(262, 52%, 55%)", "hsl(152, 56%, 40%)",
  "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(190, 60%, 45%)",
  "hsl(320, 50%, 50%)", "hsl(60, 60%, 45%)", "hsl(28, 75%, 50%)",
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const METRIC_OPTIONS = [
  { key: "bookings", label: "Bookings", color: "hsl(152, 56%, 40%)" },
  { key: "pipeline", label: "Pipeline", color: "hsl(234, 62%, 52%)" },
  { key: "in_window", label: "In-Window", color: "hsl(262, 52%, 55%)" },
  { key: "deferred", label: "Deferred", color: "hsl(38, 92%, 50%)" },
] as const;

const AE_METRIC_OPTIONS = [
  { key: "hc_tenured", label: "Tenured HC", color: "hsl(152, 56%, 40%)" },
  { key: "hc_ramping", label: "Ramping HC", color: "hsl(262, 52%, 55%)" },
  { key: "hc_total", label: "Total HC", color: "hsl(234, 62%, 52%)" },
  { key: "effective_capacity_saos", label: "Capacity (SAOs)", color: "hsl(38, 92%, 50%)" },
] as const;

const PLAN_RESULT_OPTIONS = [
  { key: "month", label: "Month", source: "plan" as const },
  { key: "segment_key", label: "Segment", source: "plan" as const },
  { key: "required_saos", label: "Required SAOs", source: "plan" as const },
  { key: "share", label: "Share", source: "plan" as const },
  { key: "effective_asp", label: "Effective ASP", source: "plan" as const },
  { key: "effective_cw_rate", label: "Effective CW Rate", source: "plan" as const },
  { key: "projected_pipeline", label: "Projected Pipeline", source: "plan" as const },
  { key: "projected_bookings", label: "Projected Bookings", source: "plan" as const },
  { key: "in_window_bookings", label: "In-Window Bookings", source: "plan" as const },
  { key: "deferred_bookings", label: "Deferred Bookings", source: "plan" as const },
  { key: "capacity_flag", label: "Capacity Flag", source: "plan" as const },
];

const WATERFALL_OPTIONS = [
  { key: "target_revenue", label: "Target Revenue", source: "waterfall" as const },
  { key: "hc_tenured", label: "HC Tenured (WF)", source: "waterfall" as const },
  { key: "hc_ramping", label: "HC Ramping (WF)", source: "waterfall" as const },
  { key: "hc_total", label: "HC Total (WF)", source: "waterfall" as const },
  { key: "mentoring_tax", label: "Mentoring Tax", source: "waterfall" as const },
  { key: "shrinkage_rate", label: "Shrinkage Rate", source: "waterfall" as const },
  { key: "effective_capacity_saos", label: "Effective Capacity SAOs (WF)", source: "waterfall" as const },
  { key: "total_required_saos", label: "Total Required SAOs", source: "waterfall" as const },
  { key: "total_pipeline", label: "Total Pipeline", source: "waterfall" as const },
  { key: "total_bookings", label: "Total Bookings", source: "waterfall" as const },
  { key: "capacity_gap", label: "Capacity Gap", source: "waterfall" as const },
  { key: "bookings_vs_target", label: "Bookings vs Target", source: "waterfall" as const },
  { key: "cumulative_target", label: "Cumulative Target", source: "waterfall" as const },
  { key: "cumulative_bookings", label: "Cumulative Bookings", source: "waterfall" as const },
  { key: "cumulative_gap", label: "Cumulative Gap", source: "waterfall" as const },
];

const ALL_AXIS_OPTIONS = [...PLAN_RESULT_OPTIONS, ...WATERFALL_OPTIONS];

const DOLLAR_COLUMNS = new Set([
  "target_revenue", "total_pipeline", "total_bookings", "capacity_gap",
  "bookings_vs_target", "cumulative_target", "cumulative_bookings", "cumulative_gap",
  "projected_pipeline", "projected_bookings", "in_window_bookings", "deferred_bookings", "effective_asp",
]);

const HC_COLUMNS = new Set([
  "hc_tenured", "hc_ramping", "hc_total", "effective_capacity_saos",
  "total_required_saos", "required_saos", "capacity_flag",
]);

const RATE_TAX_PATTERN = /(?:tax|rate|pct)$/i;

function formatCellValue(header: string, raw: string): string {
  const trimmedHeader = header.trim().toLowerCase();
  const num = Number(raw);
  if (isNaN(num) || raw.trim() === "") return raw;

  if (RATE_TAX_PATTERN.test(trimmedHeader)) {
    return `${(num * 100).toFixed(1)}%`;
  }
  if (DOLLAR_COLUMNS.has(trimmedHeader)) {
    if (Math.abs(num) >= 1_000_000) return `$${Math.round(num / 1_000_000).toLocaleString()}M`;
    if (Math.abs(num) >= 1_000) return `$${Math.round(num).toLocaleString()}`;
    return `$${Math.round(num).toLocaleString()}`;
  }
  if (HC_COLUMNS.has(trimmedHeader)) {
    return Math.round(num).toLocaleString();
  }
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

type ChartType = "line" | "area" | "bar" | "scatter";

const CHART_TYPE_OPTIONS: { type: ChartType; label: string; icon: React.ElementType }[] = [
  { type: "line", label: "Line", icon: LineChart },
  { type: "area", label: "Area", icon: AreaChart },
  { type: "bar", label: "Bar", icon: BarChart3 },
  { type: "scatter", label: "Scatter", icon: ScatterChart },
];

const PLOTLY_LAYOUT_BASE = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "hsl(0, 0%, 70%)", size: 11, family: "Inter" },
  margin: { l: 60, r: 20, t: 10, b: 40 },
  legend: { orientation: "h" as const, y: -0.15, x: 0.5, xanchor: "center" as const },
  xaxis: { gridcolor: "rgba(255,255,255,0.08)" },
  yaxis: { gridcolor: "rgba(255,255,255,0.08)" },
  hovermode: "x unified" as const,
  hoverlabel: {
    bgcolor: "rgba(30,30,30,0.92)",
    bordercolor: "transparent",
    font: { family: "Inter", size: 12, color: "#fff" },
  },
};

const PLOTLY_CONFIG = {
  displayModeBar: true,
  modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d"] as any,
  displaylogo: false,
  responsive: true,
};

const CSV_PAGE_SIZE = 25;

function MetricCard({ title, value, icon: Icon, subtitle }: { title: string; value: string; icon: React.ElementType; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function parseRecommendations(text: string) {
  const sections: { type: "header" | "gap" | "lever" | "negligible" | "note"; content: string }[] = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length && (lines[i].startsWith("===") || lines[i].trim() === "")) i++;
  if (i < lines.length && lines[i].includes("LEVER ANALYSIS")) {
    sections.push({ type: "header", content: lines[i].trim() });
    i++;
  }
  while (i < lines.length && (lines[i].startsWith("===") || lines[i].trim() === "")) i++;
  let summaryBlock = "";
  while (i < lines.length && !lines[i].startsWith("GAP DECOMPOSITION")) {
    summaryBlock += lines[i] + "\n";
    i++;
  }
  if (summaryBlock.trim()) sections.push({ type: "header", content: summaryBlock.trim() });
  let gapBlock = "";
  while (i < lines.length && !lines[i].startsWith("RECOMMENDED LEVERS")) {
    gapBlock += lines[i] + "\n";
    i++;
  }
  if (gapBlock.trim()) sections.push({ type: "gap", content: gapBlock.trim() });
  let leverBlock = "";
  while (i < lines.length && !lines[i].startsWith("NEGLIGIBLE")) {
    leverBlock += lines[i] + "\n";
    i++;
  }
  if (leverBlock.trim()) sections.push({ type: "lever", content: leverBlock.trim() });
  let rest = "";
  while (i < lines.length) {
    rest += lines[i] + "\n";
    i++;
  }
  if (rest.trim()) sections.push({ type: "negligible", content: rest.trim() });
  return sections;
}

function parseCSV(csv: string): { headers: string[]; rows: string[][] } {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",");
  const rows = lines.slice(1).map((l) => l.split(","));
  return { headers, rows };
}

function parseAECapacityCSV(csv: string): AECapacityRow[] {
  const { headers, rows } = parseCSV(csv);
  return rows.map((row) => {
    const obj: Record<string, number> = {};
    headers.forEach((h, i) => { obj[h.trim()] = Number(row[i]) || 0; });
    return {
      month: obj.month,
      hc_tenured: obj.hc_tenured,
      hc_ramping: obj.hc_ramping,
      hc_total: obj.hc_total,
      effective_capacity_saos: obj.effective_capacity_saos,
    };
  });
}

function parseWaterfallCSV(csv: string): Record<string, number>[] {
  const { headers, rows } = parseCSV(csv);
  return rows.map((row) => {
    const obj: Record<string, number> = {};
    headers.forEach((h, i) => { obj[h.trim()] = Number(row[i]) || 0; });
    return obj;
  });
}

const DOLLAR_KEYS = new Set([
  "annual_target", "prior_year_actuals", "productivity_per_ae",
  "supersized_deal_threshold",
]);
const RATE_KEYS = /(_pct|_rate|share_floor|share_ceiling|growth_rate|floor_multiplier|pipeline_to_bookings_ratio|high_threshold|medium_threshold|default_fallback_multiplier|overhead_pct_per_new_hire|annual_rate|tolerance|revenue_tolerance|confidence_risk_low_max_pct|confidence_risk_medium_max_pct)$/;

function formatConfigVal(key: string, raw: string): string {
  const num = Number(raw);
  if (isNaN(num) || raw.trim() === "" || raw === "true" || raw === "false") return raw;
  const k = key.toLowerCase().replace(/\s/g, "_");
  if (DOLLAR_KEYS.has(k)) {
    if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    return `$${num.toLocaleString()}`;
  }
  if (RATE_KEYS.test(k)) {
    return `${(num * 100).toFixed(1)}%`;
  }
  if (Number.isInteger(num) && Math.abs(num) >= 1000) return num.toLocaleString();
  if (!Number.isInteger(num)) return num.toFixed(2);
  return raw;
}

interface ConfigSection {
  entries: Array<{ key: string; value: string }>;
}

/** Smart YAML parser that groups into named sections with formatted values */
function parseYamlToSections(yaml: string): Record<string, ConfigSection> {
  const sections: Record<string, ConfigSection> = {};
  const lines = yaml.split("\n");

  const addEntry = (section: string, key: string, value: string) => {
    if (!sections[section]) sections[section] = { entries: [] };
    sections[section].entries.push({ key, value: formatConfigVal(key, value) });
  };

  // Track nesting via indent-based path
  const path: string[] = [];
  const indents: number[] = [];
  let listContext = "";

  for (const line of lines) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const indent = line.search(/\S/);

    // Pop path stack to current indent level
    while (indents.length > 0 && indent <= indents[indents.length - 1]) {
      path.pop();
      indents.pop();
    }

    // List item
    const listMatch = line.match(/^(\s*)-\s+(.+)$/);
    if (listMatch) {
      const val = listMatch[2].trim();
      // For list items, append to the current context
      if (listContext && sections[listContext]) {
        const last = sections[listContext].entries[sections[listContext].entries.length - 1];
        if (last) {
          // Check if it looks like a hiring tranche object
          if (val.startsWith("count:") || val.startsWith("start_month:")) {
            // Will be handled by inline object parsing below
          } else {
            last.value = last.value ? last.value + ", " + val : val;
          }
        }
      }
      continue;
    }

    // Key-only line (section header)
    const headerMatch = line.match(/^(\s*)([\w_]+):\s*$/);
    if (headerMatch) {
      path.push(headerMatch[2]);
      indents.push(indent);
      listContext = "";
      continue;
    }

    // Key-value line
    const kvMatch = line.match(/^(\s*)([\w_.\-]+):\s+(.+)$/);
    if (kvMatch) {
      const rawKey = kvMatch[2];
      const rawVal = kvMatch[3].trim();

      // Determine section name from path context
      const sectionName = getSectionName(path, rawKey);
      const displayKey = rawKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

      addEntry(sectionName, displayKey, rawVal);
      listContext = sectionName;

      // Track this key in path for sub-keys
      // Don't push leaf key-values
    }
  }

  // Post-process: merge dimension values and hiring tranches
  postProcessSections(sections);

  // Only keep known config sections — filter out recommendations, notes, etc.
  const VALID_SECTIONS = new Set([
    "Targets", "Dimensions", "Allocation", "ASP Decay", "Win Rate Decay",
    "Baseline", "Calibration", "Cash Cycle", "Confidence", "Economics",
    "AE Model", "What-If Scenarios", "System", "General",
  ]);
  for (const key of Object.keys(sections)) {
    if (sections[key].entries.length === 0 || !VALID_SECTIONS.has(key)) delete sections[key];
  }
  return sections;
}

function getSectionName(path: string[], key: string): string {
  const full = [...path, key].join(".");
  
  // Map paths to clean section names
  if (full.startsWith("targets")) return "Targets";
  if (full.startsWith("dimensions.channel")) return "Dimensions";
  if (full.startsWith("dimensions.product")) return "Dimensions";
  if (full.startsWith("dimensions.region")) return "Dimensions";
  if (full.startsWith("dimensions.segment")) return "Dimensions";
  if (full.startsWith("dimensions.deal_type")) return "Dimensions";
  if (full.startsWith("dimensions")) return "Dimensions";
  if (full.startsWith("allocation.constraints")) return "Allocation";
  if (full.startsWith("allocation.objective")) return "Allocation";
  if (full.startsWith("allocation")) return "Allocation";
  if (full.startsWith("economics.default_decay.asp")) return "ASP Decay";
  if (full.startsWith("economics.default_decay.win_rate")) return "Win Rate Decay";
  if (full.startsWith("economics.baseline")) return "Baseline";
  if (full.startsWith("economics.calibration")) return "Calibration";
  if (full.startsWith("economics.cash_cycle")) return "Cash Cycle";
  if (full.startsWith("economics.confidence")) return "Confidence";
  if (full.startsWith("economics")) return "Economics";
  if (full.startsWith("ae_model.ramp")) return "AE Model";
  if (full.startsWith("ae_model.mentoring")) return "AE Model";
  if (full.startsWith("ae_model.shrinkage")) return "AE Model";
  if (full.startsWith("ae_model.attrition")) return "AE Model";
  if (full.startsWith("ae_model.hiring_plan")) return "AE Model";
  if (full.startsWith("ae_model")) return "AE Model";
  if (full.startsWith("what_if_scenarios")) return "What-If Scenarios";
  if (full.startsWith("system.solver")) return "System";
  if (full.startsWith("system")) return "System";
  
  return path.length > 0 ? path[0].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "General";
}

function postProcessSections(sections: Record<string, ConfigSection>) {
  // For Dimensions section: collapse enabled + values into readable lines
  if (sections["Dimensions"]) {
    const entries = sections["Dimensions"].entries;
    const dimGroups: Record<string, { enabled?: string; values?: string }> = {};
    const nonDim: Array<{ key: string; value: string }> = [];
    
    let currentDim = "";
    for (const e of entries) {
      const k = e.key.toLowerCase();
      if (k === "enabled") {
        dimGroups[currentDim] = dimGroups[currentDim] || {};
        dimGroups[currentDim].enabled = e.value;
      } else if (k === "values") {
        dimGroups[currentDim] = dimGroups[currentDim] || {};
        dimGroups[currentDim].values = e.value;
      } else {
        // This is a dimension name header
        currentDim = e.key;
        if (!dimGroups[currentDim]) dimGroups[currentDim] = {};
      }
    }

    const newEntries: Array<{ key: string; value: string }> = [];
    for (const [dim, data] of Object.entries(dimGroups)) {
      if (dim) {
        const status = data.enabled === "true" ? "✓" : "✗";
        newEntries.push({ key: `${status} ${dim}`, value: data.values || "" });
      }
    }
    if (newEntries.length > 0) {
      sections["Dimensions"].entries = newEntries;
    }
  }

  // Seasonality: rename numbered keys
  if (sections["Targets"]) {
    sections["Targets"].entries = sections["Targets"].entries.map(e => {
      const numMatch = e.key.match(/^(\d+)$/);
      if (numMatch) {
        const idx = parseInt(numMatch[1]);
        return { key: MONTH_NAMES[idx - 1] || `M${idx}`, value: e.value };
      }
      return e;
    });
  }
}

interface ViewInputsDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  configDisplay: Record<string, Record<string, string>>;
  versionId: string;
}

function ViewInputsDialog({ open, onOpenChange, configDisplay, versionId }: ViewInputsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] w-[85vw] max-h-[80vh] bg-background/90 backdrop-blur-sm border p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Configuration Inputs — {versionId}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: "calc(80vh - 80px)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
            {Object.entries(configDisplay).map(([section, values]) => (
              <Card key={section} className="bg-muted/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold text-primary">{section}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <dl className="space-y-1.5">
                    {Object.entries(values).map(([key, val]) => (
                      <div key={key} className="flex justify-between gap-2 text-xs">
                        <dt className="text-muted-foreground shrink-0">{key}</dt>
                        <dd className="font-medium text-right">{val}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RecommendationsDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recommendations: string;
  versionId: string;
}

function RecommendationsDialog({ open, onOpenChange, recommendations, versionId }: RecommendationsDialogProps) {
  const sections = useMemo(() => parseRecommendations(recommendations), [recommendations]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] w-[85vw] max-h-[80vh] bg-background/90 backdrop-blur-sm border p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Lever Recommendations — {versionId}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: "calc(80vh - 80px)" }}>
          <div className="space-y-4 pr-4">
            {sections.map((s, i) => {
              if (s.type === "header") {
                return (
                  <div key={i} className="text-sm">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{s.content}</pre>
                  </div>
                );
              }
              if (s.type === "gap") {
                return (
                  <Card key={i} className="bg-muted/30">
                    <CardContent className="p-4">
                      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{s.content}</pre>
                    </CardContent>
                  </Card>
                );
              }
              if (s.type === "lever") {
                const leverText = s.content;
                const leverBlocks = leverText.split(/(?=\n\s+\d+\.\s)/).filter(Boolean);
                const headerLine = leverBlocks[0]?.includes("RECOMMENDED LEVERS") ? leverBlocks.shift() : null;
                return (
                  <div key={i} className="space-y-3">
                    {headerLine && (
                      <h3 className="font-semibold text-sm text-foreground">{headerLine.split("\n")[0].replace(/-/g, "").trim()}</h3>
                    )}
                    {leverBlocks.map((block, j) => {
                      const gapClosed = block.includes(">>> Gap closed");
                      return (
                        <Card key={j} className={`${gapClosed ? "border-green-500/50 bg-green-500/5" : "bg-muted/30"}`}>
                          <CardContent className="p-4">
                            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{block.trim()}</pre>
                            {gapClosed && (
                              <Badge className="mt-2 bg-green-500/20 text-green-700 border-green-500/30">✓ Gap closed at this point</Badge>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              }
              return (
                <Card key={i} className="bg-muted/20">
                  <CardContent className="p-4">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">{s.content}</pre>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ViewDataDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  csvFiles: Record<string, string>;
  versionId: string;
}

function ViewDataDialog({ open, onOpenChange, csvFiles, versionId }: ViewDataDialogProps) {
  const csvFileNames = Object.keys(csvFiles);
  const [selectedFile, setSelectedFile] = useState(csvFileNames[0] ?? "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const names = Object.keys(csvFiles);
    if (names.length > 0 && !names.includes(selectedFile)) {
      setSelectedFile(names[0]);
      setPage(1);
    }
  }, [csvFiles, selectedFile]);

  const parsed = useMemo(() => {
    if (!selectedFile || !csvFiles[selectedFile]) return { headers: [], rows: [] as string[][] };
    return parseCSV(csvFiles[selectedFile]);
  }, [selectedFile, csvFiles]);

  const totalPages = Math.ceil(parsed.rows.length / pageSize);
  const pageRows = parsed.rows.slice((page - 1) * pageSize, page * pageSize);

  const handleFileChange = (f: string) => {
    setSelectedFile(f);
    setPage(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[90vw] max-h-[85vh] bg-background/90 backdrop-blur-sm border p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-1 pr-12">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Database className="h-5 w-5 text-primary" />
              View Data — {versionId}
            </DialogTitle>
            <Select value={selectedFile} onValueChange={handleFileChange}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {csvFileNames.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: "calc(85vh - 140px)" }}>
          <div className="px-6 pb-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-0">
                  <TableHead className="whitespace-nowrap text-xl font-bold text-white bg-[hsl(220,20%,22%)] border-r border-white/10 last:border-r-0 py-3">
                    #
                  </TableHead>
                  {parsed.headers.map((h, i) => (
                    <TableHead
                      key={i}
                      className="whitespace-nowrap text-xl font-bold text-white bg-[hsl(220,20%,22%)] border-r border-white/10 last:border-r-0 py-3"
                    >
                      {h.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row, ri) => {
                  const isNumericCol = (ci: number) => {
                    const val = Number(row[ci]);
                    return !isNaN(val) && row[ci].trim() !== "";
                  };
                  return (
                    <TableRow
                      key={ri}
                      className={ri % 2 === 0 ? "bg-muted/50" : "bg-transparent"}
                    >
                      <TableCell className="whitespace-nowrap text-sm py-1.5 border-r border-border/20 text-muted-foreground font-mono">
                        {(page - 1) * pageSize + ri + 1}
                      </TableCell>
                      {row.map((cell, ci) => (
                        <TableCell
                          key={ci}
                          className={`whitespace-nowrap text-sm py-1.5 border-r border-border/20 last:border-r-0 ${isNumericCol(ci) ? "text-right" : ""}`}
                        >
                          {formatCellValue(parsed.headers[ci], cell)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="px-6 py-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, parsed.rows.length)} of {parsed.rows.length} rows
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Show:</span>
                {[20, 50, 100].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={pageSize === s ? "default" : "ghost"}
                    className="h-6 px-2 text-xs"
                    onClick={() => { setPageSize(s); setPage(1); }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            {totalPages > 1 && <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        isActive={pageNum === page}
                        onClick={() => setPage(pageNum)}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>}
          </div>
      </DialogContent>
    </Dialog>
  );
}

function computeChartDataFor(
  xSel: string,
  ySel: string,
  results: PlanResult[],
  waterfallRows: Record<string, number>[] | null
): { x: (string | number)[]; y: number[]; noData: boolean } {
  const xIsWaterfall = xSel.startsWith("wf:");
  const yIsWaterfall = ySel.startsWith("wf:");
  const xKey = xIsWaterfall ? xSel.slice(3) : xSel;
  const yKey = yIsWaterfall ? ySel.slice(3) : ySel;

  if (xIsWaterfall || yIsWaterfall) {
    if (!waterfallRows || waterfallRows.length === 0) {
      return { x: [], y: [], noData: true };
    }
    if (xIsWaterfall && yIsWaterfall) {
      return { x: waterfallRows.map(r => r[xKey] ?? 0), y: waterfallRows.map(r => r[yKey] ?? 0), noData: false };
    }
    if (yIsWaterfall && !xIsWaterfall) {
      if (xKey === "month") {
        return { x: waterfallRows.map((_, i) => MONTH_NAMES[i] || `M${i + 1}`), y: waterfallRows.map(r => r[yKey] ?? 0), noData: false };
      }
      return { x: waterfallRows.map((_, i) => i + 1), y: waterfallRows.map(r => r[yKey] ?? 0), noData: false };
    }
    if (xIsWaterfall && !yIsWaterfall) {
      if (yKey === "segment_key" || !results.length) {
        return { x: waterfallRows.map(r => r[xKey] ?? 0), y: waterfallRows.map(() => 0), noData: false };
      }
      const planYKey = yKey as keyof PlanResult;
      const agg: Record<number, number> = {};
      for (const r of results) { agg[r.month] = (agg[r.month] || 0) + (Number(r[planYKey]) || 0); }
      return { x: waterfallRows.map(r => r[xKey] ?? 0), y: waterfallRows.map((_, i) => agg[i + 1] ?? 0), noData: false };
    }
  }

  if (!results.length) return { x: [], y: [], noData: false };
  const planYKey = yKey as keyof PlanResult;

  if (xKey === "month") {
    const agg: Record<number, number> = {};
    for (const r of results) { agg[r.month] = (agg[r.month] || 0) + (Number(r[planYKey]) || 0); }
    const sorted = Object.entries(agg).sort(([a], [b]) => Number(a) - Number(b));
    return { x: sorted.map(([m]) => MONTH_NAMES[Number(m) - 1] || `M${m}`), y: sorted.map(([, v]) => v), noData: false };
  } else if (xKey === "segment_key") {
    const agg: Record<string, number> = {};
    for (const r of results) { agg[r.segment_key] = (agg[r.segment_key] || 0) + (Number(r[planYKey]) || 0); }
    const sorted = Object.entries(agg).sort(([, a], [, b]) => b - a);
    return { x: sorted.map(([k]) => k), y: sorted.map(([, v]) => v), noData: false };
  } else {
    const planXKey = xKey as keyof PlanResult;
    return { x: results.map(r => Number(r[planXKey]) || 0), y: results.map(r => Number(r[planYKey]) || 0), noData: false };
  }
}

function getTracePropsForType(chartType: ChartType) {
  switch (chartType) {
    case "line": return { type: "scatter" as const, mode: "lines" as const, fill: undefined, line: { shape: "spline" as const, smoothing: 1.3 } };
    case "area": return { type: "scatter" as const, mode: "lines" as const, fill: "tozeroy" as const, line: { shape: "spline" as const, smoothing: 1.3 } };
    case "bar": return { type: "bar" as const, mode: undefined, fill: undefined, line: undefined };
    case "scatter": return { type: "scatter" as const, mode: "markers" as const, fill: undefined, line: undefined };
  }
}

export default function ResultsDashboard() {
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [summary, setSummary] = useState<PlanSummary | null>(null);
  const [results, setResults] = useState<PlanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputsOpen, setInputsOpen] = useState(false);
  const [recsOpen, setRecsOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [configYamlOpen, setConfigYamlOpen] = useState(false);
  const [leverSummaryOpen, setLeverSummaryOpen] = useState(false);
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set(["bookings", "pipeline"]));
  const [activeAEMetrics, setActiveAEMetrics] = useState<Set<string>>(new Set(["hc_total", "effective_capacity_saos"]));
  const [customX, setCustomX] = useState("month");
  const [customY, setCustomY] = useState("required_saos");
  const [customChartType, setCustomChartType] = useState<ChartType>("line");
  const [extraCharts, setExtraCharts] = useState<{ id: string; x: string; y: string; type: ChartType }[]>([]);

  const [csvFiles, setCsvFiles] = useState<Record<string, string>>({});
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [aeCapacity, setAeCapacity] = useState<AECapacityRow[]>([]);
  const [configDisplay, setConfigDisplay] = useState<Record<string, Record<string, string>> | null>(null);
  const [configYaml, setConfigYaml] = useState<string | null>(null);
  const [leverSummary, setLeverSummary] = useState<string | null>(null);
  const [leverRecsText, setLeverRecsText] = useState<string | null>(null);
  const [leverRecsOpen, setLeverRecsOpen] = useState(false);
  const [requirementsTxt, setRequirementsTxt] = useState<string | null>(null);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [artifactsLoading, setArtifactsLoading] = useState(false);

  const toggleMetric = (key: string) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const toggleAEMetric = (key: string) => {
    setActiveAEMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const loadArtifacts = useCallback(async (versionId: string) => {
    setArtifactsLoading(true);
    try {
      const fileList = await fetchVersionFiles(versionId);
      const csvFileNames = fileList.filter((f) => f.endsWith(".csv"));

      const [recsText, ...csvContents] = await Promise.all([
        fetchVersionRecommendations(versionId),
        ...csvFileNames.map((f) => fetchVersionFile(versionId, f).catch(() => null)),
      ]);

      const newCsvFiles: Record<string, string> = {};
      csvFileNames.forEach((name, i) => {
        if (csvContents[i]) newCsvFiles[name] = csvContents[i]!;
      });
      setCsvFiles(newCsvFiles);
      setRecommendations(recsText);

      if (newCsvFiles["ae_capacity.csv"]) {
        setAeCapacity(parseAECapacityCSV(newCsvFiles["ae_capacity.csv"]));
      } else {
        setAeCapacity([]);
      }

      if (fileList.includes("config_snapshot.json")) {
        try {
          const configText = await fetchVersionFile(versionId, "config_snapshot.json");
          const configJson = JSON.parse(configText);
          const display: Record<string, Record<string, string>> = {};
          for (const [key, value] of Object.entries(configJson)) {
            if (typeof value === "object" && value !== null && !Array.isArray(value)) {
              display[key] = Object.fromEntries(
                Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)])
              );
            } else {
              if (!display["General"]) display["General"] = {};
              display["General"][key] = String(value);
            }
          }
          setConfigDisplay(Object.keys(display).length > 0 ? display : null);
        } catch {
          setConfigDisplay(null);
        }
      } else {
        setConfigDisplay(null);
      }

      // Fetch config.yaml
      if (fileList.includes("config.yaml")) {
        try {
          const yamlText = await fetchVersionFile(versionId, "config.yaml");
          setConfigYaml(yamlText);
        } catch {
          setConfigYaml(null);
        }
      } else {
        setConfigYaml(null);
      }

      // Fetch lever_summary.json
      const leverFile = fileList.find(f => f === "lever_summary.json");
      if (leverFile) {
        try {
          const leverText = await fetchVersionFile(versionId, leverFile);
          setLeverSummary(leverText);
        } catch {
          setLeverSummary(null);
        }
      } else {
        setLeverSummary(null);
      }

      // Fetch lever_recommendations.txt (fallback if /recommendations endpoint fails)
      if (fileList.includes("lever_recommendations.txt")) {
        try {
          const recsFileText = await fetchVersionFile(versionId, "lever_recommendations.txt");
          setLeverRecsText(recsFileText);
        } catch {
          setLeverRecsText(null);
        }
      } else {
        setLeverRecsText(null);
      }

      // Fetch recommendations.txt
      if (fileList.includes("recommendations.txt")) {
        try {
          const reqText = await fetchVersionFile(versionId, "recommendations.txt");
          setRequirementsTxt(reqText);
        } catch {
          setRequirementsTxt(null);
        }
      } else {
        setRequirementsTxt(null);
      }
    } catch {
      setCsvFiles({});
      setRecommendations(null);
      setAeCapacity([]);
      setConfigDisplay(null);
      setConfigYaml(null);
      setLeverSummary(null);
      setLeverRecsText(null);
      setRequirementsTxt(null);
    } finally {
      setArtifactsLoading(false);
    }
  }, []);

  const loadVersionData = useCallback(async (versionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, resultData] = await Promise.all([
        fetchVersionSummary(versionId),
        fetchVersionResults(versionId),
      ]);
      setSummary(summaryData);
      setResults(resultData);
      void loadArtifacts(versionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setCsvFiles({});
      setRecommendations(null);
      setAeCapacity([]);
      setConfigDisplay(null);
    } finally {
      setLoading(false);
    }
  }, [loadArtifacts]);

  const loadVersions = useCallback(async () => {
    try {
      const versionList = await fetchVersions();
      setVersions(versionList);
      if (versionList.length > 0) {
        const sorted = [...versionList].sort((a, b) => {
          const numA = parseInt(a.version_id.replace(/\D/g, ""), 10) || 0;
          const numB = parseInt(b.version_id.replace(/\D/g, ""), 10) || 0;
          return numB - numA;
        });
        const latest = sorted[0].version_id;
        setSelectedVersion(latest);
        void loadVersionData(latest);
      }
    } catch { }
  }, [loadVersionData]);

  useEffect(() => { void loadVersions(); }, [loadVersions]);

  const handleVersionChange = (versionId: string) => {
    setSelectedVersion(versionId);
    void loadVersionData(versionId);
  };

  const waterfallRows = useMemo(() => {
    if (!csvFiles["monthly_waterfall.csv"]) return null;
    return parseWaterfallCSV(csvFiles["monthly_waterfall.csv"]);
  }, [csvFiles]);

  const monthlyData = useMemo(() => {
    if (!results.length) return [];
    const months: Record<number, { month: number; bookings: number; saos: number; pipeline: number; in_window: number; deferred: number }> = {};
    for (const r of results) {
      if (!months[r.month]) months[r.month] = { month: r.month, bookings: 0, saos: 0, pipeline: 0, in_window: 0, deferred: 0 };
      months[r.month].bookings += r.projected_bookings;
      months[r.month].saos += r.required_saos;
      months[r.month].pipeline += r.projected_pipeline;
      months[r.month].in_window += r.in_window_bookings;
      months[r.month].deferred += r.deferred_bookings;
    }
    return Object.values(months).sort((a, b) => a.month - b.month);
  }, [results]);

  const customChartData = useMemo(() => {
    const xIsWaterfall = customX.startsWith("wf:");
    const yIsWaterfall = customY.startsWith("wf:");
    const xKey = xIsWaterfall ? customX.slice(3) : customX;
    const yKey = yIsWaterfall ? customY.slice(3) : customY;

    if (xIsWaterfall || yIsWaterfall) {
      if (!waterfallRows || waterfallRows.length === 0) {
        return { x: [] as (string | number)[], y: [] as number[], noData: true };
      }

      if (xIsWaterfall && yIsWaterfall) {
        return {
          x: waterfallRows.map(r => r[xKey] ?? 0),
          y: waterfallRows.map(r => r[yKey] ?? 0),
          noData: false,
        };
      }

      if (yIsWaterfall && !xIsWaterfall) {
        if (xKey === "month") {
          return {
            x: waterfallRows.map((_, i) => MONTH_NAMES[i] || `M${i + 1}`),
            y: waterfallRows.map(r => r[yKey] ?? 0),
            noData: false,
          };
        }
        return {
          x: waterfallRows.map((_, i) => i + 1),
          y: waterfallRows.map(r => r[yKey] ?? 0),
          noData: false,
        };
      }

      if (xIsWaterfall && !yIsWaterfall) {
        if (yKey === "segment_key" || !results.length) {
          return { x: waterfallRows.map(r => r[xKey] ?? 0), y: waterfallRows.map(() => 0), noData: false };
        }
        const planYKey = yKey as keyof PlanResult;
        const agg: Record<number, number> = {};
        for (const r of results) {
          agg[r.month] = (agg[r.month] || 0) + (Number(r[planYKey]) || 0);
        }
        return {
          x: waterfallRows.map(r => r[xKey] ?? 0),
          y: waterfallRows.map((_, i) => agg[i + 1] ?? 0),
          noData: false,
        };
      }
    }

    if (!results.length) return { x: [] as (string | number)[], y: [] as number[], noData: false };
    const planYKey = yKey as keyof PlanResult;

    if (xKey === "month") {
      const agg: Record<number, number> = {};
      for (const r of results) {
        agg[r.month] = (agg[r.month] || 0) + (Number(r[planYKey]) || 0);
      }
      const sorted = Object.entries(agg).sort(([a], [b]) => Number(a) - Number(b));
      return {
        x: sorted.map(([m]) => MONTH_NAMES[Number(m) - 1] || `M${m}`),
        y: sorted.map(([, v]) => v),
        noData: false,
      };
    } else if (xKey === "segment_key") {
      const agg: Record<string, number> = {};
      for (const r of results) {
        agg[r.segment_key] = (agg[r.segment_key] || 0) + (Number(r[planYKey]) || 0);
      }
      const sorted = Object.entries(agg).sort(([, a], [, b]) => b - a);
      return {
        x: sorted.map(([k]) => k),
        y: sorted.map(([, v]) => v),
        noData: false,
      };
    } else {
      const planXKey = xKey as keyof PlanResult;
      return {
        x: results.map(r => Number(r[planXKey]) || 0),
        y: results.map(r => Number(r[planYKey]) || 0),
        noData: false,
      };
    }
  }, [results, customX, customY, waterfallRows]);

  if (loading && !summary) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div className="space-y-3">
            <div>
              <p className="font-medium">Failed to load results</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            {selectedVersion && (
              <Button variant="outline" size="sm" onClick={() => void loadVersionData(selectedVersion)}>
                Retry loading results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  const allVersionOptions = versions.map(v => ({
    version_id: v.version_id,
    label: `${v.version_id} — ${new Date(v.timestamp).toLocaleDateString()}`,
  }));

  const monthLabels = monthlyData.map((d) => MONTH_NAMES[d.month - 1] || `M${d.month}`);
  const monthlyTraces = METRIC_OPTIONS
    .filter((m) => activeMetrics.has(m.key))
    .map((m) => ({
      x: monthLabels,
      y: monthlyData.map((d) => d[m.key as keyof typeof d] as number),
      type: "scatter" as const,
      mode: "lines" as const,
      fill: "tozeroy" as const,
      name: m.label,
      line: { color: m.color, width: 2, shape: "spline" as const, smoothing: 1.3 },
      fillcolor: m.color.replace(")", ", 0.1)").replace("hsl(", "hsla("),
      hovertemplate: `${m.label}: %{y:$,.0f}<extra></extra>`,
    }));

  const aeMonthLabels = aeCapacity.map((d) => MONTH_NAMES[d.month - 1]);
  const aeTraces = AE_METRIC_OPTIONS
    .filter((m) => activeAEMetrics.has(m.key))
    .map((m) => ({
      x: aeMonthLabels,
      y: aeCapacity.map((d) => d[m.key as keyof typeof d] as number),
      type: "scatter" as const,
      mode: "lines" as const,
      name: m.label,
      line: { color: m.color, width: 2, shape: "spline" as const, smoothing: 1.3 },
      yaxis: m.key === "effective_capacity_saos" ? "y2" : "y",
      hovertemplate: `${m.label}: %{y:,.0f}<extra></extra>`,
    }));

  const customTraceProps = (() => {
    switch (customChartType) {
      case "line": return { type: "scatter" as const, mode: "lines" as const, fill: undefined, line: { shape: "spline" as const, smoothing: 1.3 } };
      case "area": return { type: "scatter" as const, mode: "lines" as const, fill: "tozeroy" as const, line: { shape: "spline" as const, smoothing: 1.3 } };
      case "bar": return { type: "bar" as const, mode: undefined, fill: undefined, line: undefined };
      case "scatter": return { type: "scatter" as const, mode: "markers" as const, fill: undefined, line: undefined };
    }
  })();

  const customXLabel = ALL_AXIS_OPTIONS.find(o => o.key === customX.replace("wf:", ""))?.label || customX;
  const customYLabel = ALL_AXIS_OPTIONS.find(o => o.key === customY.replace("wf:", ""))?.label || customY;
  const needsDollarX = DOLLAR_COLUMNS.has(customX.replace("wf:", ""));
  const needsDollarY = DOLLAR_COLUMNS.has(customY.replace("wf:", ""));
  const yRawKey = customY.replace("wf:", "");
  const xRawKey = customX.replace("wf:", "");
  const yIsRate = RATE_TAX_PATTERN.test(yRawKey);
  const yHoverFmt = needsDollarY ? "$,.0f" : yIsRate ? ",.1%" : ",.0f";
  const xHoverFmt = needsDollarX ? "$,.0f" : RATE_TAX_PATTERN.test(xRawKey) ? ",.1%" : ",.0f";

  const customTrace = [{
    x: customChartData.x,
    y: yIsRate ? customChartData.y.map(v => v) : customChartData.y,
    type: customTraceProps.type,
    mode: customTraceProps.mode,
    fill: customTraceProps.fill,
    marker: { color: "hsl(234, 62%, 52%)" },
    line: customTraceProps.line ? { ...customTraceProps.line, color: "hsl(234, 62%, 52%)", width: 2 } : { color: "hsl(234, 62%, 52%)", width: 2 },
    hovertemplate: `${customYLabel}: %{y:${yHoverFmt}}<extra></extra>`,
  }];

  const hasCsvFiles = Object.keys(csvFiles).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedVersion} onValueChange={handleVersionChange}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select version" />
          </SelectTrigger>
          <SelectContent>
            {allVersionOptions.map((v) => (
              <SelectItem key={v.version_id} value={v.version_id}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(loading || artifactsLoading) && <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>}

        <div className="flex items-center gap-2 ml-auto">
          {configDisplay && (
            <Button variant="outline" size="sm" onClick={() => setInputsOpen(true)} className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> View Inputs
            </Button>
          )}
          {(recommendations || leverRecsText) && (
            <Button variant="outline" size="sm" onClick={() => recommendations ? setRecsOpen(true) : setLeverRecsOpen(true)} className="gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" /> Recommendations
            </Button>
          )}
          {hasCsvFiles && (
            <Button variant="outline" size="sm" onClick={() => setDataOpen(true)} className="gap-1.5">
              <Database className="h-3.5 w-3.5" /> View Data
            </Button>
          )}
          {configYaml && (
            <Button variant="outline" size="sm" onClick={() => setConfigYamlOpen(true)} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Config YAML
            </Button>
          )}
          {leverSummary && (
            <Button variant="outline" size="sm" onClick={() => setLeverSummaryOpen(true)} className="gap-1.5">
              <FileJson className="h-3.5 w-3.5" /> Lever Summary
            </Button>
          )}
          {selectedVersion && (
            <Button variant="outline" size="sm" onClick={async () => {
              if (requirementsTxt) {
                setRequirementsOpen(true);
              } else {
                try {
                  const txt = await fetchVersionFile(selectedVersion, "recommendations.txt");
                  if (txt) {
                    setRequirementsTxt(txt);
                    setRequirementsOpen(true);
                  }
                } catch {
                  // Try the recommendations endpoint as fallback
                  const recsText = await fetchVersionRecommendations(selectedVersion);
                  if (recsText) {
                    setRequirementsTxt(recsText);
                    setRequirementsOpen(true);
                  }
                }
              }
            }} className="gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" /> Recommendations
            </Button>
          )}
        </div>
      </div>

      {configDisplay && (
        <ViewInputsDialog open={inputsOpen} onOpenChange={setInputsOpen} configDisplay={configDisplay} versionId={selectedVersion} />
      )}
      {recommendations && (
        <RecommendationsDialog open={recsOpen} onOpenChange={setRecsOpen} recommendations={recommendations} versionId={selectedVersion} />
      )}
      {hasCsvFiles && (
        <ViewDataDialog open={dataOpen} onOpenChange={setDataOpen} csvFiles={csvFiles} versionId={selectedVersion} />
      )}
      {configYaml && (
        <Dialog open={configYamlOpen} onOpenChange={setConfigYamlOpen}>
          <DialogContent className="max-w-[90vw] w-[90vw] max-h-[85vh] bg-background/90 backdrop-blur-sm border p-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 pt-5 pb-2 pr-12">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Configuration — {selectedVersion}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 70px)" }}>
              <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
                {Object.entries(parseYamlToSections(configYaml)).map(([section, { entries }]) => (
                  <Card key={section} className="bg-muted/30 break-inside-avoid mb-3">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-sm font-semibold text-primary">{section}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2 pt-0">
                      <dl className="space-y-0.5">
                        {entries.map((e, i) => (
                          <div key={i} className="flex justify-between gap-1 text-xs">
                            <dt className="text-muted-foreground shrink-0 truncate">{e.key}</dt>
                            <dd className="font-medium text-right truncate max-w-[160px]" title={e.value}>{e.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {leverSummary && (
        <Dialog open={leverSummaryOpen} onOpenChange={setLeverSummaryOpen}>
          <DialogContent className="max-w-[75vw] w-[75vw] max-h-[80vh] bg-background/90 backdrop-blur-sm border p-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-2 pr-12">
              <DialogTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" />
                lever_summary.json — {selectedVersion}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: "calc(80vh - 80px)" }}>
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground bg-muted/30 rounded-lg p-4">{(() => {
                try { return JSON.stringify(JSON.parse(leverSummary), null, 2); } catch { return leverSummary; }
              })()}</pre>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {leverRecsText && (
        <RecommendationsDialog open={leverRecsOpen} onOpenChange={setLeverRecsOpen} recommendations={leverRecsText} versionId={selectedVersion} />
      )}
      <Dialog open={requirementsOpen} onOpenChange={setRequirementsOpen}>
        <DialogContent className="max-w-[85vw] w-[85vw] max-h-[80vh] bg-background/90 backdrop-blur-sm border p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 pr-12">
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Recommendations — {selectedVersion}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto flex-1" style={{ maxHeight: "calc(80vh - 80px)" }}>
            {requirementsTxt ? (
              <div className="space-y-4 pr-2">
                {parseRecommendations(requirementsTxt).map((s, i) => {
                  if (s.type === "header") {
                    return (
                      <div key={i} className="text-sm">
                        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{s.content}</pre>
                      </div>
                    );
                  }
                  if (s.type === "gap") {
                    return (
                      <Card key={i} className="bg-muted/30">
                        <CardContent className="p-4">
                          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{s.content}</pre>
                        </CardContent>
                      </Card>
                    );
                  }
                  if (s.type === "lever") {
                    const leverBlocks = s.content.split(/(?=\n\s+\d+\.\s)/).filter(Boolean);
                    const headerLine = leverBlocks[0]?.includes("RECOMMENDED LEVERS") ? leverBlocks.shift() : null;
                    return (
                      <div key={i} className="space-y-3">
                        {headerLine && (
                          <h3 className="font-semibold text-sm text-foreground">{headerLine.split("\n")[0].replace(/-/g, "").trim()}</h3>
                        )}
                        {leverBlocks.map((block, j) => {
                          const gapClosed = block.includes(">>> Gap closed");
                          return (
                            <Card key={j} className={`${gapClosed ? "border-green-500/50 bg-green-500/5" : "bg-muted/30"}`}>
                              <CardContent className="p-4">
                                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{block.trim()}</pre>
                                {gapClosed && (
                                  <Badge className="mt-2 bg-green-500/20 text-green-700 border-green-500/30">✓ Gap closed at this point</Badge>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    );
                  }
                  return (
                    <Card key={i} className="bg-muted/20">
                      <CardContent className="p-4">
                        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">{s.content}</pre>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recommendations available for this version.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard title="Annual Bookings" value={fmt(summary.total_annual_bookings)} icon={DollarSign} />
            <MetricCard title="Total SAOs" value={summary.total_annual_saos.toLocaleString()} icon={Users} />
            <MetricCard title="Avg ROI/SAO" value={fmt(summary.average_weighted_roi)} icon={TrendingUp} />
            <MetricCard title="Capacity-Capped Months" value={String(summary.capacity_constrained_months)} icon={AlertCircle}
              subtitle={summary.capacity_constrained_months > 0 ? "Target may be missed" : "All clear"}
            />
          </div>

          {summary.validation && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {summary.validation.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  Validation {summary.validation.passed ? "Passed" : "Failed"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="flex flex-wrap gap-2">
                  {summary.validation.checks.map((c, i) => (
                    <Badge key={i} variant={c.passed ? "secondary" : "destructive"} className="text-xs">{c.name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm">Monthly Bookings & Pipeline</CardTitle>
                <div className="flex gap-1.5">
                  {METRIC_OPTIONS.map((m) => (
                    <Button
                      key={m.key}
                      variant={activeMetrics.has(m.key) ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => toggleMetric(m.key)}
                      style={activeMetrics.has(m.key) ? { backgroundColor: m.color, borderColor: m.color } : undefined}
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Plot
                data={monthlyTraces}
                layout={{ ...PLOTLY_LAYOUT_BASE, height: 320, yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, tickprefix: "$", tickformat: ",.0s" } }}
                config={PLOTLY_CONFIG}
                useResizeHandler
                style={{ width: "100%", height: 320 }}
              />
            </CardContent>
          </Card>

          {aeCapacity.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm">AE Capacity Stats</CardTitle>
                  <div className="flex gap-1.5">
                    {AE_METRIC_OPTIONS.map((m) => (
                      <Button
                        key={m.key}
                        variant={activeAEMetrics.has(m.key) ? "default" : "outline"}
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => toggleAEMetric(m.key)}
                        style={activeAEMetrics.has(m.key) ? { backgroundColor: m.color, borderColor: m.color } : undefined}
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Plot
                  data={aeTraces}
                  layout={{
                    ...PLOTLY_LAYOUT_BASE,
                    height: 320,
                    margin: { l: 70, r: 70, t: 10, b: 40 },
                    legend: { ...PLOTLY_LAYOUT_BASE.legend, y: -0.2 },
                    yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, title: { text: "Headcount", standoff: 10, font: { size: 10, color: "hsl(0,0%,60%)" } } },
                    yaxis2: {
                      ...PLOTLY_LAYOUT_BASE.yaxis,
                      title: { text: "SAOs", standoff: 10, font: { size: 10, color: "hsl(0,0%,60%)" } },
                      overlaying: "y" as const,
                      side: "right" as const,
                    },
                  }}
                  config={PLOTLY_CONFIG}
                  useResizeHandler
                  style={{ width: "100%", height: 340 }}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm">Custom Chart</CardTitle>
                  <div className="flex gap-0.5 border rounded-md p-0.5">
                    {CHART_TYPE_OPTIONS.map((ct) => (
                      <Button
                        key={ct.type}
                        variant={customChartType === ct.type ? "default" : "ghost"}
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setCustomChartType(ct.type)}
                        title={ct.label}
                      >
                        <ct.icon className="h-3.5 w-3.5" />
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">X:</span>
                  <Select value={customX} onValueChange={setCustomX}>
                    <SelectTrigger className="h-7 w-44 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Plan Results</SelectLabel>
                        {PLAN_RESULT_OPTIONS.map((o) => (
                          <SelectItem key={`plan-${o.key}`} value={o.key}>{o.label}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Waterfall</SelectLabel>
                        {WATERFALL_OPTIONS.map((o) => (
                          <SelectItem key={`wf-${o.key}`} value={`wf:${o.key}`}>{o.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">Y:</span>
                  <Select value={customY} onValueChange={setCustomY}>
                    <SelectTrigger className="h-7 w-44 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Plan Results</SelectLabel>
                        {PLAN_RESULT_OPTIONS.map((o) => (
                          <SelectItem key={`plan-${o.key}`} value={o.key}>{o.label}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Waterfall</SelectLabel>
                        {WATERFALL_OPTIONS.map((o) => (
                          <SelectItem key={`wf-${o.key}`} value={`wf:${o.key}`}>{o.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {customChartData.noData ? (
                <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                  No waterfall data available for this version
                </div>
              ) : (
                <Plot
                  data={customTrace}
                  layout={{
                    ...PLOTLY_LAYOUT_BASE,
                    height: 300,
                    xaxis: {
                      ...PLOTLY_LAYOUT_BASE.xaxis,
                      automargin: true,
                      title: { text: customXLabel, font: { size: 10, color: "hsl(0,0%,60%)" } },
                      ...(needsDollarX ? { tickprefix: "$", tickformat: ",.0s" } : RATE_TAX_PATTERN.test(xRawKey) ? { tickformat: ",.0%" } : {}),
                    },
                    yaxis: {
                      ...PLOTLY_LAYOUT_BASE.yaxis,
                      title: { text: customYLabel, font: { size: 10, color: "hsl(0,0%,60%)" } },
                      ...(needsDollarY ? { tickprefix: "$", tickformat: ",.0s" } : yIsRate ? { tickformat: ",.0%" } : {}),
                    },
                    showlegend: false,
                  }}
                  config={PLOTLY_CONFIG}
                  useResizeHandler
                  style={{ width: "100%", height: 300 }}
                />
              )}
            </CardContent>
          </Card>

          {/* Extra custom charts */}
          {extraCharts.map((ec) => {
            const ecData = computeChartDataFor(ec.x, ec.y, results, waterfallRows);
            const ecTraceProps = getTracePropsForType(ec.type);
            const ecXLabel = ALL_AXIS_OPTIONS.find(o => o.key === ec.x.replace("wf:", ""))?.label || ec.x;
            const ecYLabel = ALL_AXIS_OPTIONS.find(o => o.key === ec.y.replace("wf:", ""))?.label || ec.y;
            const ecNeedsDollarX = DOLLAR_COLUMNS.has(ec.x.replace("wf:", ""));
            const ecNeedsDollarY = DOLLAR_COLUMNS.has(ec.y.replace("wf:", ""));
            const ecYRawKey = ec.y.replace("wf:", "");
            const ecXRawKey = ec.x.replace("wf:", "");
            const ecYIsRate = RATE_TAX_PATTERN.test(ecYRawKey);
            const ecYHoverFmt = ecNeedsDollarY ? "$,.0f" : ecYIsRate ? ",.1%" : ",.0f";
            const ecTrace = [{
              x: ecData.x,
              y: ecData.y,
              type: ecTraceProps.type,
              mode: ecTraceProps.mode,
              fill: ecTraceProps.fill,
              marker: { color: COLORS[extraCharts.indexOf(ec) % COLORS.length] },
              line: ecTraceProps.line ? { ...ecTraceProps.line, color: COLORS[extraCharts.indexOf(ec) % COLORS.length], width: 2 } : { color: COLORS[extraCharts.indexOf(ec) % COLORS.length], width: 2 },
              hovertemplate: `${ecYLabel}: %{y:${ecYHoverFmt}}<extra></extra>`,
            }];

            return (
              <Card key={ec.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-sm">Custom Chart</CardTitle>
                      <div className="flex gap-0.5 border rounded-md p-0.5">
                        {CHART_TYPE_OPTIONS.map((ct) => (
                          <Button
                            key={ct.type}
                            variant={ec.type === ct.type ? "default" : "ghost"}
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setExtraCharts(prev => prev.map(c => c.id === ec.id ? { ...c, type: ct.type } : c))}
                            title={ct.label}
                          >
                            <ct.icon className="h-3.5 w-3.5" />
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">X:</span>
                      <Select value={ec.x} onValueChange={(v) => setExtraCharts(prev => prev.map(c => c.id === ec.id ? { ...c, x: v } : c))}>
                        <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup><SelectLabel>Plan Results</SelectLabel>{PLAN_RESULT_OPTIONS.map((o) => <SelectItem key={`plan-${o.key}`} value={o.key}>{o.label}</SelectItem>)}</SelectGroup>
                          <SelectGroup><SelectLabel>Waterfall</SelectLabel>{WATERFALL_OPTIONS.map((o) => <SelectItem key={`wf-${o.key}`} value={`wf:${o.key}`}>{o.label}</SelectItem>)}</SelectGroup>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">Y:</span>
                      <Select value={ec.y} onValueChange={(v) => setExtraCharts(prev => prev.map(c => c.id === ec.id ? { ...c, y: v } : c))}>
                        <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup><SelectLabel>Plan Results</SelectLabel>{PLAN_RESULT_OPTIONS.map((o) => <SelectItem key={`plan-${o.key}`} value={o.key}>{o.label}</SelectItem>)}</SelectGroup>
                          <SelectGroup><SelectLabel>Waterfall</SelectLabel>{WATERFALL_OPTIONS.map((o) => <SelectItem key={`wf-${o.key}`} value={`wf:${o.key}`}>{o.label}</SelectItem>)}</SelectGroup>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setExtraCharts(prev => prev.filter(c => c.id !== ec.id))}
                        title="Remove chart"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {ecData.noData ? (
                    <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                      No waterfall data available for this version
                    </div>
                  ) : (
                    <Plot
                      data={ecTrace}
                      layout={{
                        ...PLOTLY_LAYOUT_BASE,
                        height: 300,
                        xaxis: {
                          ...PLOTLY_LAYOUT_BASE.xaxis,
                          automargin: true,
                          title: { text: ecXLabel, font: { size: 10, color: "hsl(0,0%,60%)" } },
                          ...(ecNeedsDollarX ? { tickprefix: "$", tickformat: ",.0s" } : RATE_TAX_PATTERN.test(ecXRawKey) ? { tickformat: ",.0%" } : {}),
                        },
                        yaxis: {
                          ...PLOTLY_LAYOUT_BASE.yaxis,
                          title: { text: ecYLabel, font: { size: 10, color: "hsl(0,0%,60%)" } },
                          ...(ecNeedsDollarY ? { tickprefix: "$", tickformat: ",.0s" } : ecYIsRate ? { tickformat: ",.0%" } : {}),
                        },
                        showlegend: false,
                      }}
                      config={PLOTLY_CONFIG}
                      useResizeHandler
                      style={{ width: "100%", height: 300 }}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Button
            variant="outline"
            className="w-full border-dashed gap-2"
            onClick={() => setExtraCharts(prev => [...prev, { id: crypto.randomUUID(), x: "month", y: "required_saos", type: "line" }])}
          >
            <Plus className="h-4 w-4" /> Add Chart
          </Button>
        </>
      )}
    </div>
  );
}
