import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-4">
          Error · 404
        </p>
        <h1 className="font-display text-6xl tracking-tight leading-none mb-4">
          Not found.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          The page you're looking for doesn't exist or has moved.
        </p>
        <a
          href="/"
          className="inline-flex items-center text-sm font-medium text-foreground border-b border-foreground/30 hover:border-foreground transition-colors"
        >
          Return home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
