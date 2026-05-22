import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";

interface RunPlanButtonProps {
  loading: boolean;
  onClick: () => void;
  elapsed?: number;
  status?: string;
}

export default function RunPlanButton({ loading, onClick, elapsed, status }: RunPlanButtonProps) {
  const label = (() => {
    if (!loading) return null;
    if (status === "queued") return "Queued...";
    if (status === "running") return `Running${elapsed ? ` (${Math.floor(elapsed / 1000)}s)` : "..."}`;
    return `Running${elapsed ? ` (${Math.floor(elapsed / 1000)}s)` : "..."}`;
  })();

  return (
    <Button
      size="lg"
      onClick={onClick}
      disabled={loading}
      className="min-w-[160px]"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {label}
        </>
      ) : (
        <>
          <Play className="h-4 w-4 mr-2" />
          Run Plan
        </>
      )}
    </Button>
  );
}
