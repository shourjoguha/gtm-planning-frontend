import { useState, useEffect, useCallback } from "react";
import { checkHealth } from "@/lib/api";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "checking" | "connected" | "disconnected";

export default function ConnectionStatus() {
  const [status, setStatus] = useState<Status>("checking");

  const check = useCallback(async () => {
    setStatus("checking");
    try {
      await checkHealth();
      setStatus("connected");
    } catch {
      setStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    void check();
    const interval = setInterval(() => void check(), 30_000);
    return () => clearInterval(interval);
  }, [check]);

  const icon = {
    checking: <Loader2 className="h-3 w-3 animate-spin" />,
    connected: <Wifi className="h-3 w-3" />,
    disconnected: <WifiOff className="h-3 w-3" />,
  }[status];

  const label = {
    checking: "Checking…",
    connected: "Backend connected",
    disconnected: "Backend offline",
  }[status];

  return (
    <button
      onClick={() => void check()}
      className={cn(
        "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
        status === "connected" && "text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950",
        status === "disconnected" && "text-destructive border-destructive/30 bg-destructive/5",
        status === "checking" && "text-muted-foreground border-border bg-muted/50"
      )}
      title="Click to re-check backend connection"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
