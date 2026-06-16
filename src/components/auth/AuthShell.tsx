import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">DocPilot</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent to-background border-l p-12">
        <div className="max-w-md">
          <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-primary" /> DocPilot · live answer
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              "Our PTO policy allows up to 5 unused days to carry over into the next year, with manager approval."
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                People Handbook.pdf · p.14
              </span>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Upload your team's docs. Get answers with citations. Stop searching, start shipping.
          </p>
        </div>
      </div>
    </div>
  );
}
