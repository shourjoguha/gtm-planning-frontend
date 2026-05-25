import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowUpRight, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import Reveal from "@/components/Reveal";

import screenshotResults from "@/assets/screenshot-results.png";
import screenshotConfig from "@/assets/screenshot-config.png";
import screenshotDocs from "@/assets/screenshot-docs.png";

const CREAM = "#fcfbf9";
const INK = "#171717";

const NAV = [
  { label: "Product", id: "product" },
  { label: "Workflow", id: "workflow" },
  { label: "Capabilities", id: "capabilities" },
  { label: "FAQ", id: "faq" },
] as const;

const WORK_ITEMS = [
  {
    img: screenshotResults,
    title: "Results & Analytics",
    category: "Dashboard",
    tint: "#e0e7ff",
    orb: "#a5b4fc",
  },
  {
    img: screenshotConfig,
    title: "Configuration",
    category: "Setup",
    tint: "#ede9fe",
    orb: "#c4b5fd",
  },
  {
    img: screenshotDocs,
    title: "Definitions & Docs",
    category: "Reference",
    tint: "#e0e7ff",
    orb: "#818cf8",
  },
] as const;

const STEPS = [
  {
    num: "01",
    title: "Configure",
    desc: "Set targets, dimensions, constraints, and economics parameters to define the planning problem.",
  },
  {
    num: "02",
    title: "Model",
    desc: "Define AE workforce, hiring tranches, ramp curves, mentoring drag, and attrition assumptions.",
  },
  {
    num: "03",
    title: "Optimize",
    desc: "Run the constrained allocation engine across all segments, channels, and regions simultaneously.",
  },
  {
    num: "04",
    title: "Analyze",
    desc: "Review results, waterfall charts, lever recommendations, and allocation breakdowns.",
  },
  {
    num: "05",
    title: "Iterate",
    desc: "Run what-if scenarios, toggle constraints, and refine until your plan is airtight and defensible.",
  },
] as const;

const CAPABILITIES = [
  {
    title: "Constrained Optimization",
    desc: "Allocate bookings across channels, products, regions, and segments under real-world constraints.",
    tags: ["Channels", "Products", "Regions", "Segments"],
  },
  {
    title: "Seasonality Modeling",
    desc: "Monthly weights that shape pipeline generation and bookings timing throughout the fiscal year.",
    tags: ["Monthly Weights", "Pipeline Timing"],
  },
  {
    title: "AE Workforce Planning",
    desc: "Model hiring tranches, ramp curves, mentoring drag, attrition, and per-AE productivity.",
    tags: ["Hiring Tranches", "Ramp Curves", "Attrition"],
  },
  {
    title: "What-If Scenarios",
    desc: "Toggle scenarios like budget cuts, hiring freezes, or market expansion to stress-test your plan.",
    tags: ["Budget Cuts", "Hiring Freeze", "Expansion"],
  },
  {
    title: "Decay Curves",
    desc: "ASP and win-rate decay functions that model diminishing returns as you scale each segment.",
    tags: ["ASP Decay", "Win-Rate Decay"],
  },
  {
    title: "Full Transparency",
    desc: "Every allocation decision is traceable — see exactly why each segment got its share.",
    tags: ["Traceable", "Auditable"],
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "Where can I find documentation for the math or how this app works?",
    a: "Head to the Definitions & Documents tab inside the engine. It contains detailed explanations of the optimization math, decay curves, AE modeling, and all allocation logic.",
  },
  {
    q: "Can I view results from previous runs?",
    a: "Yes! On the Results tab, use the version dropdown at the top to select any previous run. You can also click the Config and Recommendations buttons to view the exact configuration and lever recommendations from that run.",
  },
  {
    q: "How do I get started?",
    a: "Navigate to the engine, configure your parameters in the Configuration tab, then press Run Plan. Once complete, your results will appear on the Results tab with charts, tables, and recommendations.",
  },
  {
    q: "Can I create custom charts?",
    a: "Absolutely. On the Results page, scroll down past the default charts to find the custom chart builder. You can select your own dimensions, metrics, and chart types to visualize the data however you like.",
  },
  {
    q: "Can I use this for my own data and business?",
    a: "Absolutely! Drop us a message and we can start building you your own tailored solution.",
  },
  {
    q: "I need something similar but not for GTM testing, can you help?",
    a: "Absolutely! This is one of many use cases. As long as you know your requirements, you can count on us for the build!",
  },
];

/** A hairline that draws itself in (scaleX) the first time it scrolls into view. */
function DrawLine({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setShown(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "h-px w-full origin-left bg-[#e5e5e5] transition-transform [transition-duration:1100ms] ease-premium",
        shown ? "scale-x-100" : "scale-x-0",
        className,
      )}
    />
  );
}

/** Monospace eyebrow label. */
function MonoLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[11px] uppercase tracking-[0.35em]", className)}>{children}</span>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#171717] antialiased">
      {/* ───────────────────────── Header ───────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 h-20">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 sm:px-10">
          {/* Logo + nav blend against whatever is behind them */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="font-playfair text-2xl italic text-white mix-blend-difference"
          >
            GTM&nbsp;Planning
          </button>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="group relative font-mono text-[11px] uppercase tracking-[0.3em] text-white mix-blend-difference"
              >
                {item.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-current transition-[width] duration-500 ease-premium group-hover:w-full" />
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/engine"
              className="group inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-[#171717] py-2 pl-3.5 pr-4 text-white shadow-lg shadow-indigo-500/10 transition-transform duration-500 ease-premium hover:scale-[1.03]"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-status-ping rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em]">System Online</span>
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="text-white mix-blend-difference md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-72 border-l-[#e5e5e5] bg-[#fcfbf9]">
          <SheetHeader>
            <SheetTitle className="font-playfair text-2xl italic">GTM Planning</SheetTitle>
            <SheetDescription className="font-mono text-[10px] uppercase tracking-[0.3em]">
              Navigate
            </SheetDescription>
          </SheetHeader>
          <nav className="mt-8 flex flex-col gap-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setMenuOpen(false);
                  scrollTo(item.id);
                }}
                className="rounded-md px-3 py-3 text-left font-mono text-xs uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:bg-black/5 hover:text-[#171717]"
              >
                {item.label}
              </button>
            ))}
            <Link
              to="/engine"
              onClick={() => setMenuOpen(false)}
              className="mt-4 rounded-md bg-[#171717] px-3 py-3 text-center font-mono text-xs uppercase tracking-[0.25em] text-white"
            >
              Launch Engine
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#171717]">
        {/* Drifting blur mesh */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[130vmax] w-[130vmax] -translate-x-1/2 -translate-y-1/2 animate-mesh-drift">
            <div className="absolute left-[8%] top-[12%] h-[45vmax] w-[45vmax] rounded-full bg-indigo-600/40 blur-[130px]" />
            <div className="absolute right-[6%] top-[8%] h-[40vmax] w-[40vmax] rounded-full bg-purple-600/30 blur-[140px]" />
            <div className="absolute bottom-[6%] left-[28%] h-[42vmax] w-[42vmax] rounded-full bg-indigo-400/25 blur-[130px]" />
            <div className="absolute bottom-[14%] right-[20%] h-[34vmax] w-[34vmax] rounded-full bg-fuchsia-500/20 blur-[140px]" />
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 -mt-10 px-6 text-center">
          <Reveal y={20} duration={900}>
            <MonoLabel className="text-white/50">Math-Driven GTM Planning</MonoLabel>
          </Reveal>
          <Reveal y={40} duration={1000} delay={120}>
            <h1 className="mt-8 font-playfair font-normal leading-[0.85] tracking-tight text-[#fcfbf9]">
              <span className="block text-[clamp(2.75rem,11vw,10rem)]">Stop guessing your</span>
              <span className="block text-[clamp(2.75rem,11vw,10rem)] italic">GTM allocation.</span>
            </h1>
          </Reveal>
          <Reveal y={30} duration={1000} delay={260}>
            <p className="mx-auto mt-8 max-w-md text-base leading-relaxed text-white/60 sm:text-lg">
              Capacity, ROI, and lever recommendations from a single configuration — a constrained
              optimization engine for sales planners.
            </p>
          </Reveal>
        </div>

        {/* Wave container — concave curve filled with the next section's cream */}
        <div
          className="pointer-events-none absolute -bottom-px left-1/2 h-[120px] w-[120%] -translate-x-1/2 rounded-t-[50%]"
          style={{ background: CREAM }}
        />
        {/* Primary action button at the crest of the wave */}
        <Link
          to="/engine"
          className="absolute bottom-[72px] left-1/2 z-20 -translate-x-1/2 animate-pulse-glow rounded-full bg-[#4338ca] px-8 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-white"
        >
          Launch the Engine
        </Link>
      </section>

      {/* ───────────────────── Work / Product grid ───────────────────── */}
      <section id="product" className="mx-auto max-w-7xl px-6 pb-28 pt-28 sm:px-10">
        <Reveal y={30} duration={900} className="mb-20 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <MonoLabel className="text-[#4338ca]">Inside the Engine</MonoLabel>
            <h2 className="mt-5 max-w-xl font-playfair text-5xl leading-[0.95] tracking-tight md:text-7xl">
              A workspace built for clarity.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-neutral-500">
            Three connected surfaces — configure the problem, run the optimizer, and read the result.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-2">
          {WORK_ITEMS.map((item, i) => (
            <Reveal
              key={item.title}
              y={40}
              duration={1000}
              delay={i * 90}
              className={cn(i % 2 === 1 && "md:mt-28")}
            >
              <Link to="/engine" className="group block">
                {/* Card */}
                <div
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl transition-all duration-700 ease-premium group-hover:-translate-y-4 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-indigo-500/10"
                  style={{ background: item.tint }}
                >
                  {/* Blurred color orb */}
                  <div
                    className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-transform duration-700 ease-premium group-hover:scale-125"
                    style={{ background: item.orb }}
                  />
                  {/* Screenshot */}
                  <img
                    src={item.img}
                    alt={item.title}
                    className="absolute inset-x-6 bottom-0 top-10 rounded-t-lg border border-black/5 object-cover object-top shadow-xl"
                  />
                  {/* View pill */}
                  <div className="absolute bottom-5 right-5 flex translate-y-3 items-center gap-1.5 rounded-full bg-[#171717] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white opacity-0 transition-all duration-500 ease-premium group-hover:translate-y-0 group-hover:opacity-100">
                    View <ArrowUpRight className="h-3 w-3" />
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-6">
                  <DrawLine className="mb-4" />
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-playfair text-2xl tracking-tight md:text-3xl">{item.title}</h3>
                    <MonoLabel className="text-neutral-400">{item.category}</MonoLabel>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────────────────── Workflow ───────────────────────── */}
      <section id="workflow" className="border-y border-[#e5e5e5] bg-white/40 py-28">
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Reveal y={30} duration={900}>
            <MonoLabel className="text-[#4338ca]">Workflow</MonoLabel>
            <h2 className="mt-5 max-w-2xl font-playfair text-5xl leading-[0.95] tracking-tight md:text-7xl">
              Five steps to a defensible plan.
            </h2>
          </Reveal>

          <div className="mt-20 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#e5e5e5] sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, i) => (
              <Reveal
                key={step.num}
                y={30}
                duration={900}
                delay={i * 80}
                className="group flex h-full flex-col bg-[#fcfbf9] p-8 transition-colors duration-500 ease-premium hover:bg-white"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#4338ca]">{step.num}</span>
                <h3 className="mt-6 font-playfair text-3xl tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">{step.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── Capabilities — service accordion ──────────────── */}
      <section id="capabilities" className="mx-auto max-w-7xl px-6 py-28 sm:px-10">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Sticky left header */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal y={30} duration={900}>
              <MonoLabel className="text-[#4338ca]">What it does</MonoLabel>
              <h2 className="mt-5 font-playfair text-5xl leading-[0.95] tracking-tight md:text-6xl">
                Core
                <br />
                <span className="italic">Capabilities</span>
              </h2>
              <Link
                to="/engine"
                className="group mt-10 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#171717]"
              >
                Launch the engine
                <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-premium group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
            </Reveal>
          </div>

          {/* Right accordion */}
          <Reveal y={40} duration={1000}>
            <Accordion type="single" collapsible className="w-full border-t border-[#e5e5e5]">
              {CAPABILITIES.map((cap, i) => (
                <AccordionItem key={cap.title} value={`cap-${i}`} className="border-b border-[#e5e5e5]">
                  <AccordionTrigger className="py-7 text-left text-neutral-400 transition-colors duration-500 ease-premium hover:text-[#171717] hover:no-underline data-[state=open]:text-[#171717] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-neutral-400">
                    <span className="font-playfair text-3xl tracking-tight md:text-4xl">{cap.title}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-8">
                    <p className="max-w-xl text-base leading-relaxed text-neutral-500">{cap.desc}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {cap.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#4338ca]"
                        >
                          [{tag}]
                        </span>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── FAQ ───────────────────────── */}
      <section id="faq" className="border-t border-[#e5e5e5] bg-white/40 py-28">
        <div className="mx-auto max-w-3xl px-6 sm:px-10">
          <Reveal y={30} duration={900} className="mb-14 text-center">
            <MonoLabel className="text-[#4338ca]">Questions</MonoLabel>
            <h2 className="mt-5 font-playfair text-5xl tracking-tight md:text-6xl">Frequently asked.</h2>
          </Reveal>
          <Reveal y={30} duration={900}>
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((item, idx) => (
                <AccordionItem key={idx} value={`faq-${idx}`} className="border-[#e5e5e5]">
                  <AccordionTrigger className="py-6 text-left text-base font-medium hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-base leading-relaxed text-neutral-500">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="relative -mt-1 overflow-hidden rounded-t-[5rem] bg-[#171717] text-[#fcfbf9]">
        {/* Radial indigo glow from top-center */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
          style={{
            background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(67,56,202,0.45), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6 py-28 sm:px-10">
          <Reveal y={40} duration={1000}>
            <MonoLabel className="text-white/40">Ready to plan?</MonoLabel>
            <p className="mt-8 max-w-4xl font-playfair text-4xl leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Configure your parameters, run the engine, and get a{" "}
              <span className="italic text-indigo-300">defensible allocation</span> in minutes.
            </p>
            <Link
              to="/engine"
              className="group mt-12 inline-flex items-center gap-2.5 rounded-full bg-[#fcfbf9] px-8 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[#171717] transition-transform duration-500 ease-premium hover:scale-[1.03]"
            >
              Launch Planning Engine
              <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-premium group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
          </Reveal>

          {/* 3-column grid */}
          <div className="mt-28 grid grid-cols-1 gap-12 border-t border-white/10 pt-16 sm:grid-cols-3">
            <div>
              <MonoLabel className="text-white/40">Location</MonoLabel>
              <p className="mt-5 text-lg leading-relaxed text-white/80">
                Built remotely.
                <br />
                Available worldwide.
              </p>
            </div>
            <div>
              <MonoLabel className="text-white/40">Contact</MonoLabel>
              <a
                href="mailto:guha.shourjo@gmail.com"
                className="mt-5 block text-lg text-white/80 transition-colors hover:text-white"
              >
                guha.shourjo@gmail.com
              </a>
            </div>
            <div>
              <MonoLabel className="text-white/40">Explore</MonoLabel>
              <div className="mt-5 flex flex-col gap-2">
                <Link to="/engine" className="text-lg text-white/80 transition-colors hover:text-white">
                  Launch Engine
                </Link>
                <button
                  onClick={() => scrollTo("capabilities")}
                  className="text-left text-lg text-white/80 transition-colors hover:text-white"
                >
                  Capabilities
                </button>
                <button
                  onClick={() => scrollTo("faq")}
                  className="text-left text-lg text-white/80 transition-colors hover:text-white"
                >
                  FAQ
                </button>
              </div>
            </div>
          </div>

          {/* Copyright + disclaimer */}
          <div className="mt-20 flex flex-col gap-6 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
              © {new Date().getFullYear()} GTM Planning Engine
            </p>
            <p className="max-w-xl font-mono text-[10px] leading-relaxed tracking-[0.1em] text-white/30">
              For illustration and planning purposes only. Nothing herein constitutes a binding commitment,
              guarantee, or contractual obligation of any kind.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
