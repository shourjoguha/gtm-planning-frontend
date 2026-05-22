import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { GTMConfig } from "@/types/config";
import { fetchConfigSchema, runPlan } from "@/lib/api";
import { validateConfig } from "@/lib/validateConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import ConfigForm from "@/components/ConfigForm";
import ResultsDashboard from "@/components/ResultsDashboard";
import DocumentViewer from "@/components/DocumentViewer";
import RunPlanButton from "@/components/RunPlanButton";
import ConfirmRunDialog from "@/components/ConfirmRunDialog";
import { Settings, BarChart3, BookOpen, RotateCcw, Menu, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ConnectionStatus from "@/components/ConnectionStatus";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { value: "config", label: "Setup Scenarios", icon: Settings },
  { value: "results", label: "Visualize Impacts", icon: BarChart3 },
  { value: "docs", label: "Detailed Fine Print", icon: BookOpen },
] as const;

export default function Index() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<GTMConfig | null>(null);
  const [defaultConfig, setDefaultConfig] = useState<GTMConfig | null>(null);
  const [activeTab, setActiveTab] = useState("results");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const loadConfigSchema = useCallback(async () => {
    setLoadingSchema(true);
    try {
      const schema = await fetchConfigSchema();
      setConfig(schema);
      setDefaultConfig(schema);
    } catch (err) {
      setConfig(null);
      toast({
        title: "Connection Error",
        description: `Could not connect to backend: ${err instanceof Error ? err.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setLoadingSchema(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigSchema();
  }, [loadConfigSchema]);

  const handleRequestRun = useCallback(() => {
    if (!config) return;
    const result = validateConfig(config);
    if (!result.valid) {
      toast({
        title: "Validation Errors",
        description: result.errors.join(" • "),
        variant: "destructive",
      });
      return;
    }
    setConfirmOpen(true);
  }, [config]);

  const handleRunPlan = useCallback(async () => {
    if (!config) return;
    setConfirmOpen(false);
    setRunning(true);
    setJobStatus("queued");
    setElapsed(0);
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - start), 1000);
    try {
      const result = await runPlan(config, {
        onStatus: (s) => setJobStatus(s.status),
      });
      toast({
        title: "Plan Complete",
        description: `Version ${result.version_id} generated successfully.`,
      });
      setActiveTab("results");
    } catch (err) {
      toast({
        title: "Plan Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
      setJobStatus("");
      clearInterval(timerRef.current);
    }
  }, [config]);

  const handleReset = () => {
    if (defaultConfig) {
      setConfig(JSON.parse(JSON.stringify(defaultConfig)));
      toast({ title: "Config Reset", description: "All settings restored to defaults." });
    }
  };

  const navigateTo = (tab: string) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <h1 className="text-lg font-bold tracking-tight">GTM Planning Engine</h1>
              <p className="text-xs text-muted-foreground">Constrained Allocation Optimizer</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <ConnectionStatus />
          </div>
        </div>
      </header>

      {/* Navigation Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Switch between sections</SheetDescription>
          </SheetHeader>
          <nav className="mt-6 space-y-1">
            <button
              onClick={() => { navigate("/"); setMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm hover:bg-muted text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              Home
            </button>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => navigateTo(item.value)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="config" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Setup Scenarios
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Visualize Impacts
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Detailed Fine Print
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            {loadingSchema ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : config ? (
              <div>
                <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={running || !config}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset
                  </Button>
                  <RunPlanButton loading={running} onClick={handleRequestRun} elapsed={elapsed} status={jobStatus} />
                </div>
                <ConfigForm config={config} onChange={setConfig} />
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground space-y-4">
                <div>
                  <p className="font-medium">Unable to load configuration schema</p>
                  <p className="text-sm mt-1">The connection failed earlier. Try reloading the schema now.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void loadConfigSchema()}>
                  Retry loading configuration
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results">
            <ResultsDashboard />
          </TabsContent>

          <TabsContent value="docs">
            <DocumentViewer />
          </TabsContent>
        </Tabs>

        {config && (
          <ConfirmRunDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            config={config}
            onConfirm={handleRunPlan}
          />
        )}
      </main>
    </div>
  );
}
