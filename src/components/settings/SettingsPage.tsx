import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export function SettingsPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState(user?.orgName ?? "");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader title="Settings" description="Configure your workspace." />
      <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-2xl">
        <section className="rounded-xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="text-sm font-semibold">Organization</h3>
          <p className="text-xs text-muted-foreground">This name appears in your workspace and on invitations.</p>
          <div className="mt-4 space-y-2">
            <Label htmlFor="org">Organization name</Label>
            <Input id="org" value={org} onChange={(e) => setOrg(e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => toast.success("Organization name saved")}>Save changes</Button>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-[var(--shadow-soft)] space-y-5">
          <div>
            <h3 className="text-sm font-semibold">Usage & limits</h3>
            <p className="text-xs text-muted-foreground">Current plan: Team (placeholder data).</p>
          </div>

          <Limit label="Documents indexed" used={42} max={500} />
          <Limit label="Queries this month" used={1284} max={10000} />
          <Limit label="Seats" used={5} max={25} />
        </section>
      </div>
    </div>
  );
}

function Limit({ label, used, max }: { label: string; used: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{used.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <Progress className="mt-2" value={(used / max) * 100} />
    </div>
  );
}
