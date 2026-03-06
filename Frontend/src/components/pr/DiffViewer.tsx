import { memo, useMemo, useRef, useState } from "react";
import { FileCode2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { highlightCodeLine } from "@/utils/syntaxHighlight";
import type { DiffFile, PullRequestIssue } from "@/types/domain";

interface DiffViewerProps {
  files: DiffFile[];
  issues: PullRequestIssue[];
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string) => void;
}

interface IssueByLine {
  [lineKey: string]: PullRequestIssue;
}

function lineKey(path: string, lineNumber: number | null): string {
  return `${path}:${lineNumber ?? -1}`;
}

const DiffRows = memo(function DiffRows({
  file,
  issueByLine,
  selectedIssueId,
  onSelectIssue,
}: {
  file: DiffFile;
  issueByLine: IssueByLine;
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string) => void;
}) {
  return (
    <div className="min-w-0 font-mono text-sm">
      {file.lines.map((line, index) => {
        const issue = issueByLine[lineKey(file.path, line.newLineNumber)] ?? issueByLine[lineKey(file.path, line.oldLineNumber)];
        const isActiveIssue = issue?.id === selectedIssueId;

        return (
          <div key={`${file.path}-${index}`} className="flex flex-col">
            <button
              type="button"
              className={cn(
                "grid w-full grid-cols-[56px_56px_20px_1fr] items-start border-b border-border/30 text-left transition-colors",
                line.type === "added" && "bg-chart-4/10",
                line.type === "removed" && "bg-destructive/10",
                issue && "hover:bg-muted/40",
                isActiveIssue && "bg-destructive/5",
              )}
              onClick={() => issue && onSelectIssue(issue.id)}
            >
              <span className="border-r border-border/50 px-2 py-0.5 text-right text-xs text-muted-foreground">
                {line.oldLineNumber ?? ""}
              </span>
              <span className="border-r border-border/50 px-2 py-0.5 text-right text-xs text-muted-foreground">
                {line.newLineNumber ?? ""}
              </span>
              <span className="flex items-center justify-center px-1 py-0.5">
                {issue ? <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> : null}
              </span>
              <span className="overflow-x-auto px-2 py-0.5 whitespace-pre">
                <span className="mr-1 inline-block w-3 text-muted-foreground">
                  {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                </span>
                {highlightCodeLine(line.content)}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
});

export const DiffViewer = memo(function DiffViewer({ files, issues, selectedIssueId, onSelectIssue }: DiffViewerProps) {
  const [selectedFilePath, setSelectedFilePath] = useState<string>(files[0]?.path ?? "");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollByFile = useRef<Record<string, number>>({});

  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedFilePath) ?? files[0] ?? null,
    [files, selectedFilePath],
  );

  const issueByLine = useMemo(() => {
    return issues.reduce<IssueByLine>((acc, issue) => {
      acc[lineKey(issue.filePath, issue.lineNumber)] = issue;
      return acc;
    }, {});
  }, [issues]);

  if (!selectedFile) {
    return <Card className="p-4 text-sm text-muted-foreground">No diff data available.</Card>;
  }

  const handleFileSwitch = (path: string) => {
    if (scrollRef.current && selectedFilePath) {
      scrollByFile.current[selectedFilePath] = scrollRef.current.scrollTop;
    }

    setSelectedFilePath(path);
    requestAnimationFrame(() => {
      const target = scrollByFile.current[path] ?? 0;
      if (scrollRef.current) {
        scrollRef.current.scrollTop = target;
      }
    });
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr] gap-4">
      <Card className="min-h-0 overflow-hidden">
        <div className="border-b border-border px-3 py-2 text-sm font-medium">Changed Files</div>
        <ScrollArea className="h-[calc(100vh-16rem)] p-2">
          <div className="space-y-1">
            {files.map((file) => {
              const fileIssueCount = issues.filter((issue) => issue.filePath === file.path).length;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => handleFileSwitch(file.path)}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors",
                    selectedFile.path === file.path ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileCode2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{file.path}</span>
                  </span>
                  {fileIssueCount > 0 ? <Badge variant="destructive">{fileIssueCount}</Badge> : null}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      <Card className="min-h-0 overflow-hidden">
        <div className="border-b border-border px-3 py-2 text-sm font-medium">{selectedFile.path}</div>
        <div
          ref={scrollRef}
          className="h-[calc(100vh-16rem)] overflow-auto"
          onScroll={(event) => {
            scrollByFile.current[selectedFile.path] = event.currentTarget.scrollTop;
          }}
        >
          <DiffRows
            key={selectedFile.path}
            file={selectedFile}
            issueByLine={issueByLine}
            selectedIssueId={selectedIssueId}
            onSelectIssue={onSelectIssue}
          />
        </div>
      </Card>
    </div>
  );
});
