import { useMemo, useState } from "react";
import { ShieldAlert, Bug, Activity } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRepositories } from "@/hooks/useRepositories";
import { useMetrics } from "@/hooks/useMetrics";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { capitalize } from "@/utils/format";

export function Metrics() {
  const [repositoryId, setRepositoryId] = useState<string>("all");
  const { repositories } = useRepositories();
  const { metrics, loading, error, refetch } = useMetrics(repositoryId === "all" ? undefined : repositoryId);

  const distributionData = useMemo(
    () => [
      { name: "High", value: metrics?.severityDistribution.high ?? 0, color: "hsl(var(--destructive))" },
      { name: "Medium", value: metrics?.severityDistribution.medium ?? 0, color: "hsl(var(--chart-1))" },
      { name: "Low", value: metrics?.severityDistribution.low ?? 0, color: "hsl(var(--chart-4))" },
    ],
    [metrics],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Metrics & Trends</h1>
        <Select value={repositoryId} onValueChange={setRepositoryId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select repository" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All repositories</SelectItem>
            {repositories.map((repo) => (
              <SelectItem key={repo.id} value={repo.id}>
                {repo.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}

      {loading || !metrics ? <LoadingSkeleton rows={6} /> : (
      <>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total PRs Scanned</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPrsAnalyzed}</div>
            <p className="text-xs text-muted-foreground mt-1">Analyzed pull requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Issues Prevented</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">Total issues detected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Issues / PR</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.mostViolatedRule}</div>
            <p className="text-xs text-muted-foreground mt-1">Most violated rule</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Severity Distribution</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              H:{metrics.severityDistribution.high} / M:{metrics.severityDistribution.medium} / L:{metrics.severityDistribution.low}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current ratio across selected scope</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Issue Frequency Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="high" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="medium" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="low" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Issue Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 mt-2">
                {distributionData.map((entry) => (
                  <div key={entry.name} className="flex items-center text-xs text-muted-foreground">
                    <span className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: entry.color }}></span>
                    {entry.name}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Most Frequently Violated Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Occurrences</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.topRules.map((rule) => (
                <TableRow key={rule.rule}>
                  <TableCell className="font-mono">{rule.rule}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={rule.severity === 'high' ? 'destructive' : 'outline'}
                      className={
                        rule.severity === 'high' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20' :
                        rule.severity === 'medium' ? 'bg-chart-1/10 text-chart-1 border-chart-1/20' :
                        'bg-chart-4/10 text-chart-4 border-chart-4/20'
                      }
                    >
                      {capitalize(rule.severity)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{rule.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
