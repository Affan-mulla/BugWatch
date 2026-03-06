import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Save, AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";
import type { RepositorySettings } from "@/types/domain";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { useAppStore } from "@/store/appStore";

export function Settings() {
  const { id } = useParams<{ id: string }>();
  const selectedRepositoryId = useAppStore((state) => state.selectedRepositoryId);
  const repositoryId = id ?? selectedRepositoryId;

  if (!repositoryId) {
    return <ErrorState message="No repository selected. Choose a repository from Dashboard first." />;
  }

  const { settings, loading, error, saveSettings, refetch } = useSettings(repositoryId);
  const [draft, setDraft] = useState<RepositorySettings | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setDraft(settings);
    }
  }, [settings]);

  if (loading && !draft) {
    return <LoadingSkeleton rows={5} />;
  }

  if (error && !draft) {
    return <ErrorState message={error} onRetry={() => void refetch()} />;
  }

  if (!draft) {
    return null;
  }

  const handleSave = async () => {
    await saveSettings(draft);
    setSaveMessage("Settings saved successfully.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Repository Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure analysis rules and AI behavior for this repository.
        </p>
        {saveMessage ? <p className="mt-2 text-sm text-chart-4">{saveMessage}</p> : null}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="border-b border-border bg-muted/50">
            <CardTitle className="text-base">Analysis Rules</CardTitle>
            <CardDescription>Select which categories of rules to run during PR analysis.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            <div className="flex items-center justify-between p-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-foreground">Security Rules</label>
                <p className="text-xs text-muted-foreground">Detect vulnerabilities like SQL injection, XSS, and hardcoded secrets.</p>
              </div>
              <Switch 
                checked={draft.enableSecurityRules}
                onCheckedChange={(checked) => setDraft((prev) => prev ? ({ ...prev, enableSecurityRules: checked }) : prev)}
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-foreground">Logic Rules</label>
                <p className="text-xs text-muted-foreground">Identify bugs, unhandled errors, and resource leaks.</p>
              </div>
              <Switch 
                checked={draft.enableLogicRules}
                onCheckedChange={(checked) => setDraft((prev) => prev ? ({ ...prev, enableLogicRules: checked }) : prev)}
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-foreground">Pattern Rules</label>
                <p className="text-xs text-muted-foreground">Enforce coding standards and detect code smells.</p>
              </div>
              <Switch 
                checked={draft.enablePatternRules}
                onCheckedChange={(checked) => setDraft((prev) => prev ? ({ ...prev, enablePatternRules: checked }) : prev)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border bg-muted/50">
            <CardTitle className="text-base">AI Configuration</CardTitle>
            <CardDescription>Manage how AI is used to explain deterministic findings.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-foreground">Enable AI Explanations</label>
                <p className="text-xs text-muted-foreground">Use LLM to generate human-readable explanations and fix suggestions.</p>
              </div>
              <Switch 
                checked={draft.enableAiExplanations}
                onCheckedChange={(checked) => setDraft((prev) => prev ? ({ ...prev, enableAiExplanations: checked }) : prev)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Severity Threshold</label>
              <p className="text-xs text-muted-foreground mb-2">Only report issues with this severity or higher.</p>
              <Select 
                value={draft.severityThreshold}
                onValueChange={(value: "high" | "medium" | "low") =>
                  setDraft((prev) => (prev ? { ...prev, severityThreshold: value } : prev))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select severity threshold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Report everything)</SelectItem>
                  <SelectItem value="medium">Medium (Ignore code smells)</SelectItem>
                  <SelectItem value="high">High (Only critical issues)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => void handleSave()} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <Card className="border-destructive/30 mt-12">
          <CardHeader className="border-b border-destructive/30 bg-destructive/5">
            <CardTitle className="text-base text-destructive flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium text-foreground">Clear Review History</h3>
              <p className="text-xs text-muted-foreground">Permanently delete all stored review data and metrics for this repository.</p>
            </div>
            <Button variant="destructive" className="bg-transparent border border-destructive/50 text-destructive hover:bg-destructive/10" disabled>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear History
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
