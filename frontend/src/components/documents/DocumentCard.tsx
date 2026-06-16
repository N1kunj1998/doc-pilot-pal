import { FileText, MoreVertical } from "lucide-react";
import type { Document } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./DocumentsPage";

export function DocumentCard({ doc }: { doc: Document }) {
  return (
    <div className="group rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-4 font-medium text-sm truncate">{doc.name}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {doc.uploadedBy} · {doc.uploadedAt}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{doc.size}</span>
        <StatusBadge status={doc.status} />
      </div>
    </div>
  );
}
