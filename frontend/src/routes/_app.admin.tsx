import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin/AdminPage";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/admin")({
  component: () => {
    const { user } = useAuth();
    if (user?.role !== "Admin") return <Navigate to="/chat" />;
    return <AdminPage />;
  },
});
