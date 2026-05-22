import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useMemo, useRef } from "react";
import { MATH_DOC_CONTENT } from "@/data/mathDoc";
import { ARCHITECTURE_DOC_CONTENT } from "@/data/architectureDoc";
import { OPEN_QUESTIONS_DOC_CONTENT } from "@/data/openQuestionsDoc";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DOCUMENTS = [
  { id: "math", label: "Mathematical Foundation", content: MATH_DOC_CONTENT },
  { id: "arch", label: "Architecture", content: ARCHITECTURE_DOC_CONTENT },
  { id: "openq", label: "Common Questions & Upstream Engines", content: OPEN_QUESTIONS_DOC_CONTENT },
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
    <div className="flex flex-col md:flex-row gap-4">
      {/* Left: Selector + TOC */}
      <div className="md:w-64 md:min-w-[16rem] shrink-0 md:sticky md:top-20 md:self-start space-y-3">
        <Card>
          <CardContent className="p-3">
            <Select value={selectedDoc} onValueChange={setSelectedDoc}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENTS.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contents</p>
            <ScrollArea className="max-h-[60vh]">
              <nav className="space-y-0.5">
                {headings.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToSection(h.text)}
                    className="block w-full text-left text-sm py-1 hover:text-primary transition-colors truncate cursor-pointer"
                    style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                    title={h.text}
                  >
                    <span
                      className={
                        h.level === 1
                          ? "font-bold"
                          : h.level === 2
                          ? "font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {h.text}
                    </span>
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right: Document Content */}
      <Card className="flex-1 min-w-0">
        <CardContent className="p-6 md:p-8" ref={contentRef}>
          <div className="prose-gtm">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
