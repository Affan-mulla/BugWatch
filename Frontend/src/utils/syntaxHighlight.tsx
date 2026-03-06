import { Fragment } from "react";

const KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "if",
  "else",
  "return",
  "function",
  "export",
  "import",
  "async",
  "await",
  "new",
  "class",
  "try",
  "catch",
]);

export function highlightCodeLine(line: string) {
  const parts = line.split(/(\s+|[(){}\[\].,;:+\-*/=<>!]+)/g).filter((part) => part.length > 0);

  return parts.map((part, index) => {
    if (part.startsWith("//")) {
      return (
        <span key={`${part}-${index}`} className="text-muted-foreground">
          {part}
        </span>
      );
    }

    if (KEYWORDS.has(part)) {
      return (
        <span key={`${part}-${index}`} className="text-primary">
          {part}
        </span>
      );
    }

    if (/^['"`].*['"`]$/.test(part)) {
      return (
        <span key={`${part}-${index}`} className="text-chart-2">
          {part}
        </span>
      );
    }

    if (/^[0-9]+$/.test(part)) {
      return (
        <span key={`${part}-${index}`} className="text-chart-3">
          {part}
        </span>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}
