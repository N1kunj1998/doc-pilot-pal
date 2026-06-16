import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X } from "lucide-react";
import { uploadDocument } from "@/lib/api";
import type { Document } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function UploadModal({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUploaded: (d: Document) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => { setFile(null); setProgress(0); setUploading(false); };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    const tick = setInterval(() => setProgress((p) => Math.min(95, p + 8)), 120);
    const doc = await uploadDocument(file);
    clearInterval(tick);
    setProgress(100);
    setTimeout(() => { onUploaded(doc); reset(); onOpenChange(false); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
          <DialogDescription>
            PDF, DOCX, or TXT up to 25 MB. DocPilot will index it shortly.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer.files?.[0]; if (f) setFile(f);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
            )}
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Drop file here or click to browse</p>
            <p className="text-xs text-muted-foreground">Max 25 MB</p>
            <input
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
            />
          </label>
        ) : (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              {!uploading && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {(uploading || progress > 0) && (
              <div className="mt-3">
                <Progress value={progress} />
                <p className="mt-1 text-xs text-muted-foreground">{progress}%</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
