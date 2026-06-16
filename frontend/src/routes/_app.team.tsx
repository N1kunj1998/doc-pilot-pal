import { createFileRoute, Navigate } from "@tanstack/react-router";
import { TeamPage } from "@/components/team/TeamPage";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/team")({
  component: () => {
    const { user } = useAuth();
    if (user?.role !== "Admin") return <Navigate to="/chat" />;
    return <TeamPage />;
  },
});
