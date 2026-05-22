import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useMemo, useRef } from "react";
import { MATH_DOC_CONTENT } from "@/data/mathDoc";
import { ARCHITECTURE_DOC_CONTENT } from "@/data/architectureDoc";
import { OPEN_QUESTIONS_DOC_CONTENT } from "@/data/openQuestionsDoc";

const DOCUMENTS = [
  { id: "math", label: "Mathematical Foundation", short: "Mathematics", content: MATH_DOC_CONTENT },
  { id: "arch", label: "Architecture", short: "Architecture", content: ARCHITECTURE_DOC_CONTENT },
  { id: "openq", label: "Open Questions", short: "Open Questions", content: OPEN_QUESTIONS_DOC_CONTENT },
] as const;

export default function DocumentViewer() {
  const [selectedDoc, setSelectedDoc] = useState<string>("math");
  const contentRef = useRef<HTMLDivElement>(null);

  const currentDoc = DOCUMENTS.find((d) => d.id === selectedDoc) ?? DOCUMENTS[0];

  const headings = useMemo(() => {
    const matches = currentDoc.content.matchAll(/^(#{1,3})\s+(.+)$/gm);
    return Array.from(matches).map((m, i) => ({
      level: m[1].length,
      text: m[2],
      id: `heading-${i}`,
    }));
  }, [currentDoc]);

  const scrollToSection = (text: string) => {
    if (!contentRef.current) return;
    const el = contentRef.current.querySelector(`[data-heading="${CSS.escape(text)}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-10 md:gap-12">
      {/* Left: Document selector + TOC */}
      <aside className="md:w-60 md:min-w-[15rem] shrink-0 md:sticky md:top-24 md:self-start space-y-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-3">
            Reference
          </p>
          <ul className="space-y-0.5">
            {DOCUMENTS.map((doc) => {
              const active = doc.id === selectedDoc;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc.id)}
                    className={`block w-full text-left text-sm py-1.5 transition-colors ${
                      active
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {doc.short}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {headings.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-3">
              On this page
            </p>
            <ScrollArea className="max-h-[60vh]">
              <nav className="space-y-0.5 pr-3">
                {headings.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToSection(h.text)}
                    className={`block w-full text-left text-[13px] py-1 leading-snug transition-colors truncate cursor-pointer ${
                      h.level === 1
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={{ paddingLeft: `${(h.level - 1) * 10}px` }}
                    title={h.text}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </div>
        )}
      </aside>

      {/* Right: Document content */}
      <article
        ref={contentRef}
        className="prose-gtm flex-1 min-w-0 max-w-[68ch]"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children, ...props }) => (
              <h1 data-heading={String(children)} {...props}>{children}</h1>
            ),
            h2: ({ children, ...props }) => (
              <h2 data-heading={String(children)} {...props}>{children}</h2>
            ),
            h3: ({ children, ...props }) => (
              <h3 data-heading={String(children)} {...props}>{children}</h3>
            ),
            h4: ({ children, ...props }) => (
              <h4 data-heading={String(children)} {...props}>{children}</h4>
            ),
          }}
        >
          {currentDoc.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
