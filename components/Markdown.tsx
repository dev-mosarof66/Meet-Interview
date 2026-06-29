import React from "react";

// Minimal, dependency-free markdown for AI-generated text:
// fenced ```code``` blocks, inline `code`, and **bold**. Enough for the
// coding/prep prompts, rubrics, and interviewer chat — no library needed.

type InlineOpts = { codeClass?: string; strongClass?: string };

const DEFAULT_STRONG = "font-semibold text-ink";
const DEFAULT_CODE =
  "rounded bg-brand-100 px-1 py-0.5 font-mono text-[0.85em] text-brand-700";

/** Render inline `code` and **bold** within a single line/segment. */
export function renderInline(
  text: string,
  opts: InlineOpts = {}
): React.ReactNode[] {
  const strongClass = opts.strongClass ?? DEFAULT_STRONG;
  const codeClass = opts.codeClass ?? DEFAULT_CODE;
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      nodes.push(
        <strong key={key++} className={strongClass}>
          {tok.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(
        <code key={key++} className={codeClass}>
          {tok.slice(1, -1)}
        </code>
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Inline-only markdown (for list items, chips, one-liners). */
export function InlineMarkdown({
  text,
  ...opts
}: { text: string } & InlineOpts) {
  return <>{renderInline(text, opts)}</>;
}

/** Block markdown: paragraphs + fenced code blocks. */
export function Markdown({
  text,
  className = "",
  ...opts
}: { text: string; className?: string } & InlineOpts) {
  const parts = text.split(/```/); // odd indices are code fences
  return (
    <div className={"space-y-3 " + className}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          // Drop an optional leading language tag (```ts, ```js, …).
          const body = part
            .replace(/^[a-zA-Z0-9]*\n/, "")
            .replace(/^\n+|\n+$/g, "");
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg bg-brand-900 p-3.5 font-mono text-[13px] leading-relaxed text-red-100"
            >
              <code>{body}</code>
            </pre>
          );
        }
        return part
          .split(/\n{2,}/)
          .filter((s) => s.trim())
          .map((para, j) => (
            <p key={`${i}-${j}`} className="whitespace-pre-wrap leading-relaxed">
              {renderInline(para, opts)}
            </p>
          ));
      })}
    </div>
  );
}
