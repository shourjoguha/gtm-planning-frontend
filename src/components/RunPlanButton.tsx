import { Button } from "@/components/ui/button";
import { Loader2, ArrowUpRight } from "lucide-react";

interface RunPlanButtonProps {
  loading: boolean;
  onClick: () => void;
  elapsed?: number;
  status?: string;
}

export default function RunPlanButton({ loading, onClick, elapsed, status }: RunPlanButtonProps) {
  const label = (() => {
    if (!loading) return null;
    if (status === "queued") return "Queued";
    if (status === "running") return `Running${elapsed ? ` · ${Math.floor(elapsed / 1000)}s` : ""}`;
    return `Running${elapsed ? ` · ${Math.floor(elapsed / 1000)}s` : ""}`;
  })();

  return (
    <Button
      onClick={onClick}
      disabled={loading}
      className="h-9 px-5 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all min-w-[140px] text-xs tracking-wide"
    >
      {loading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
          <span className="tabular-nums">{label}</span>
        </>
      ) : (
        <>
          Run Plan
          <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
        </>
      )}
    </Button>
  );
}
