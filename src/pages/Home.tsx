import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Check,
  Home as HomeIcon,
  BarChart3,
  Settings,
  BookOpen,
  Zap,
  TrendingUp,
  Users,
  GitBranch,
  LineChart,
  Eye,
  HelpCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

import screenshotResults from "@/assets/screenshot-results.png";
import screenshotConfig from "@/assets/screenshot-config.png";
import screenshotDocs from "@/assets/screenshot-docs.png";

const displayFont = "font-display";

const TABS = [
  { key: "results", label: "Results", icon: BarChart3, img: screenshotResults },
  { key: "config", label: "Configure", icon: Settings, img: screenshotConfig },
  { key: "docs", label: "Docs", icon: BookOpen, img: screenshotDocs },
] as const;

const BEFORE_ITEMS = ["Manual spreadsheet allocation", "Gut-feel territory splits", "No visibility into trade-offs"];

const AFTER_ITEMS = [
  "Constrained optimization across all dimensions",
  "Data-driven allocation with decay curves",
  "Full transparency into every lever",
];

const STEPS = [
  {
    num: 1,
    title: "Configure",
    subtitle: " ",
    desc: "Set targets, dimensions, constraints and economics parameters to define the planning problem.",
  },
  {
    num: 2,
    title: "Model",
    subtitle: " ",
    desc: "Define AE workforce, hiring tranches, ramp curves, mentoring drag, and attrition assumptions.",
  },
  {
    num: 3,
    title: "Optimize",
    subtitle: " ",
    desc: "Run the constrained allocation engine across all segments, channels, and regions simultaneously.",
  },
  {
    num: 4,
    title: "Analyze",
    subtitle: " ",
    desc: "Review results, waterfall charts, lever recommendations, and allocation breakdowns.",
  },
  {
    num: 5,
    title: "Iterate",
    subtitle: " ",
    desc: "Run what-if scenarios, toggle constraints, and refine until your plan is airtight and defensible.",
  },
];

const CAPABILITIES = [
  {
    icon: Zap,
    title: "Constrained Optimization",
    desc: "Allocate bookings across channels, products, regions, and segments under real-world constraints.",
  },
  {
    icon: TrendingUp,
    title: "Seasonality Modeling",
    desc: "Monthly weights that shape pipeline generation and bookings timing throughout the fiscal year.",
  },
  {
    icon: Users,
    title: "AE Workforce Planning",
    desc: "Model hiring tranches, ramp curves, mentoring drag, attrition, and per-AE productivity.",
  },
  {
    icon: GitBranch,
    title: "What-If Scenarios",
    desc: "Toggle scenarios like budget cuts, hiring freezes, or market expansion to stress-test your plan.",
  },
  {
    icon: LineChart,
    title: "Decay Curves",
    desc: "ASP and win-rate decay functions that model diminishing returns as you scale each segment.",
  },
  {
    icon: Eye,
    title: "Full Transparency",
    desc: "Every allocation decision is traceable — see exactly why each segment got its share.",
  },
];

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
    q: "Can I Use this for my own data and business?",
    a: "Absolutely! Drop us a message and we can start building you your own tailored solution.",
  },
  {
    q: "I need something something similar but not for GTM testing, can you help?",
    a: "Absolutely! this is one of many use cases. As long as you know your requirements, you can count on us for the build!",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const activeTabData = TABS.find((t) => t.key === activeTab) ?? null;
  const activeStepData = activeStep !== null ? (STEPS.find((s) => s.num === activeStep) ?? null) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <h1 className={`text-lg font-normal tracking-tight ${displayFont}`}>GTM Planning Engine</h1>
          </button>
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground mr-2">
              <button onClick={() => scrollTo("product")} className="hover:text-foreground transition-colors">
                Product
              </button>
              <button onClick={() => scrollTo("how-it-works")} className="hover:text-foreground transition-colors">
                How It Works
              </button>
              <button onClick={() => scrollTo("capabilities")} className="hover:text-foreground transition-colors">
                Features
              </button>
              <button onClick={() => scrollTo("faq")} className="hover:text-foreground transition-colors">
                FAQ
              </button>
            </nav>
            <Link to="/engine">
              <Button size="sm" className="rounded-md bg-foreground text-background hover:bg-foreground/90 px-5">
                Launch Engine
              </Button>
            </Link>
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
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm bg-foreground text-background font-medium"
            >
              <HomeIcon className="h-4 w-4" />
              Home
            </Link>
            <button
              onClick={() => {
                setMenuOpen(false);
                scrollTo("product");
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm hover:bg-muted text-foreground transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Product
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                scrollTo("how-it-works");
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm hover:bg-muted text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              How It Works
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                scrollTo("capabilities");
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm hover:bg-muted text-foreground transition-colors"
            >
              <Zap className="h-4 w-4" />
              Features
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                scrollTo("faq");
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm hover:bg-muted text-foreground transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              FAQ
            </button>
            <Link
              to="/engine"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm hover:bg-muted text-foreground transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Launch Engine
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center">
        <h2
          className={`text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-foreground leading-none ${displayFont}`}
        >
          Stop guessing your
          <br />
          <span className="italic text-accent">GTM allocation.</span>
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
          Math-driven GTM allocation. Not guesswork.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/engine">
            <Button
              size="lg"
              className="text-base px-8 py-3 rounded-md bg-foreground text-background hover:bg-foreground/90"
            >
              Get Started
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="text-base px-8 py-3 rounded-md border-foreground/20"
            onClick={() => scrollTo("how-it-works")}
          >
            How It Works
          </Button>
        </div>

        {/* Consolidated comparison strip */}
        <div className="mt-10 max-w-2xl mx-auto">
          <Card className="bg-card backdrop-blur border rounded-xl">
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-5 text-left flex flex-col h-full">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
                    Before
                  </p>
                  <ul className="space-y-2 flex-1 flex flex-col justify-center">
                    {BEFORE_ITEMS.map((item) => (
                      <li key={item} className="text-sm text-muted-foreground/50 line-through">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-5 text-left flex flex-col h-full bg-muted/30">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">After</p>
                  <ul className="space-y-2 flex-1 flex flex-col justify-center">
                    {AFTER_ITEMS.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-foreground font-medium">
                        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Collapse overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setExpanded(false);
            setActiveTab(null);
          }}
        />
      )}

      {/* Inside the Engine — animated tabs */}
      <section id="product" className="bg-muted/50 py-16 relative z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className={`text-3xl md:text-4xl font-normal text-center mb-2 ${displayFont}`}>Inside the Engine</h2>
          <div className="flex gap-0 mb-6">
            {TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const isFirst = idx === 0;
              const isLast = idx === TABS.length - 1;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    if (isActive) {
                      setActiveTab(null);
                      setExpanded(false);
                    } else {
                      setActiveTab(tab.key);
                      setExpanded(true);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 py-6 px-4 text-sm font-medium transition-all duration-300 ease-in-out border border-border ${
                    isActive
                      ? "flex-[2] bg-foreground text-background shadow-md"
                      : "flex-[1] bg-card text-foreground hover:bg-accent/10"
                  } ${isFirst ? "rounded-l-lg" : "border-l-0"} ${isLast ? "rounded-r-lg" : ""} ${!isFirst && !isLast ? "rounded-none" : ""}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span
                    className={`transition-opacity duration-300 text-2xl ${displayFont} ${isActive ? "opacity-100" : "opacity-100"}`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
          {expanded && activeTabData && (
            <div className="border-2 border-dashed border-foreground/30 rounded-lg overflow-hidden relative">
              <img src={activeTabData.img} alt={activeTabData.label} className="w-full h-auto" />
              <div className="absolute inset-0 bg-white/14 backdrop-blur-[1.5px] flex items-center justify-center">
                <span className={`text-[12rem] font-bold text-foreground/20 select-none ${displayFont}`}>Preview</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How It Works — chevron stepper */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className={`text-3xl md:text-4xl font-normal text-center mb-2 ${displayFont}`}>How It Works</h2>

        {/* Chevron stepper bar */}
        <div className="flex w-full gap-0 mb-8">
          {STEPS.map((step, idx) => {
            const isActive = activeStep !== null && activeStep === step.num;
            const isFirst = idx === 0;
            const isLast = idx === STEPS.length - 1;

            const clipPath = isFirst
              ? "polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%)"
              : isLast
                ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10% 50%)"
                : "polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%, 10% 50%)";

            return (
              <button
                key={step.num}
                onClick={() => {
                  if (activeStep === step.num) {
                    setActiveStep(null);
                  } else {
                    setActiveStep(step.num);
                  }
                }}
                style={{ clipPath }}
                className={`relative transition-all duration-300 ease-in-out py-6 flex items-center justify-center gap-2 text-sm font-semibold ${
                  isActive
                    ? "flex-[2] bg-foreground text-background"
                    : "flex-[1] bg-muted text-foreground hover:bg-muted/80"
                } ${!isFirst ? "-ml-[2px]" : ""}`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isActive ? "bg-primary-foreground text-primary" : "bg-background text-foreground"
                  }`}
                >
                  {step.num}
                </span>
                <span className={`hidden sm:inline text-2xl ${displayFont}`}>{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active step detail */}
        {activeStepData && (
          <div className="transition-all duration-300 ease-in-out">
            <Card className="h-full">
              <CardContent className="p-6 md:p-8 h-full flex items-center">
                <div className="flex items-start gap-4 w-full">
                  <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center text-lg font-bold shrink-0">
                    {activeStepData.num}
                  </div>
                  <div>
                    <h4 className={`text-4xl font-normal ${displayFont}`}>{activeStepData.title}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">{activeStepData.subtitle}</p>
                    <p className="text-sm text-foreground/80 mt-2">{activeStepData.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="bg-muted/50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className={`text-3xl md:text-4xl font-normal text-center mb-2 ${displayFont}`}>Capabilities</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <Card
                  key={cap.title}
                  className="transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:border-primary/30 cursor-default h-full"
                >
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className={`font-normal text-2xl ${displayFont}`}>{cap.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground flex-1 flex items-center">{cap.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h2 className={`text-3xl md:text-4xl font-normal text-center mb-2 ${displayFont}`}>
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`}>
              <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="bg-foreground text-background py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className={`text-3xl md:text-4xl font-normal mb-3 ${displayFont}`}>Ready to optimize your GTM plan?</h2>
          <p className="text-background/70 mb-6">
            Configure your parameters, run the engine, and get a defensible allocation in minutes.
          </p>
          <Link to="/engine">
            <Button size="lg" variant="secondary" className="text-base px-8 py-3 rounded-md">
              Launch Planning Engine
            </Button>
          </Link>
        </div>
      </section>

      {/* Terms of Use */}
      <footer className="bg-muted/30 border-t py-4 text-center">
        <p className="text-xs text-muted-foreground max-w-3xl mx-auto px-4">
          This application is for illustration and planning purposes only. Nothing herein constitutes a binding
          commitment, guarantee, or contractual obligation of any kind.
        </p>
      </footer>
    </div>
  );
}
