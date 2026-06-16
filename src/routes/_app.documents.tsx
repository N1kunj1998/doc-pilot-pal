import { createFileRoute } from "@tanstack/react-router";
import { DocumentsPage } from "@/components/documents/DocumentsPage";

export const Route = createFileRoute("/_app/documents")({ component: DocumentsPage });
