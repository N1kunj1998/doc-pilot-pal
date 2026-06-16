import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FileText, MessageSquare, Users } from "lucide-react";
import { fetchAdminStats } from "@/lib/api";
import { UsageChart } from "./UsageChart";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export function AdminPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchAdminStats>> | null>(null);
  useEffect(() => { fetchAdminStats().then(setStats); }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader title="Admin dashboard" description="Workspace activity at a glance." />
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={FileText} label="Documents indexed" value={stats?.totalDocs ?? "—"} />
          <Stat icon={MessageSquare} label="Queries this month" value={stats?.monthlyQueries?.toLocaleString() ?? "—"} />
          <Stat icon={Users} label="Active members" value={stats?.activeMembers ?? "—"} />
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Query volume</h3>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
          {stats && <UsageChart data={stats.queryVolume} />}
        </div>

        <div className="rounded-xl border bg-card shadow-[var(--shadow-soft)]">
          <div className="px-6 py-4 border-b">
            <h3 className="text-sm font-semibold">Recent activity</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Query</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.activity.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.user}</TableCell>
                  <TableCell className="text-muted-foreground">{a.query}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{a.at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
