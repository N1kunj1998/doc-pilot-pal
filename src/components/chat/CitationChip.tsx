import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText } from "lucide-react";
import type { Citation } from "@/lib/mock-data";

export function CitationChip({ citation, index }: { citation: Citation; index: number }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <span className="font-semibold text-primary">[{index}]</span>
          <span className="truncate max-w-[180px]">{citation.docName}</span>
          <span>· p.{citation.page}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-80 p-0">
        <div className="border-b px-3 py-2 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium truncate">{citation.docName}</span>
          <span className="ml-auto text-xs text-muted-foreground">p.{citation.page}</span>
        </div>
        <div className="p-3 text-sm leading-relaxed text-foreground/90 bg-muted/30">
          "{citation.snippet}"
        </div>
      </PopoverContent>
    </Popover>
  );
}
