import { useEffect, useState } from "react";
import { Upload, FileText, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocumentCard } from "./DocumentCard";
import { UploadModal } from "./UploadModal";
import { fetchDocuments } from "@/lib/api";
import type { Document } from "@/lib/mock-data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchDocuments().then(setDocs);
  }, []);

  const onUploaded = (d: Document) => setDocs((prev) => [d, ...prev]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        title="Documents"
        description="Upload PDFs, docs, and notes for DocPilot to index."
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Upload document
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-8">
        <Tabs defaultValue="grid">
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
          <TabsContent value="grid" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {docs.map((d) => (
                <DocumentCard key={d.id} doc={d} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="table" className="mt-6">
            <div className="rounded-xl border bg-card shadow-[var(--shadow-soft)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Uploaded by</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" /> {d.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.uploadedBy}</TableCell>
                      <TableCell className="text-muted-foreground">{d.uploadedAt}</TableCell>
                      <TableCell className="text-muted-foreground">{d.size}</TableCell>
                      <TableCell>
                        <StatusBadge status={d.status} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <UploadModal open={open} onOpenChange={setOpen} onUploaded={onUploaded} />
    </div>
  );
}

export function StatusBadge({ status }: { status: Document["status"] }) {
  const map = {
    Indexed:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    Processing:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    Failed:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
  } as const;
  return (
    <Badge variant="outline" className={map[status]}>
      {status}
    </Badge>
  );
}
