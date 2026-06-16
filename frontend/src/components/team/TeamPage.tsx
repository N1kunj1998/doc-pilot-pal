import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { UserPlus } from "lucide-react";
import { fetchOrgUsers, inviteMember } from "@/lib/api";
import type { Member, Role } from "@/lib/mock-data";
import { InviteMemberModal } from "./InviteMemberModal";
import { toast } from "sonner";

export function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { fetchOrgUsers().then(setMembers); }, []);

  const handleInvite = async (email: string, role: Role) => {
    const m = await inviteMember(email, role);
    setMembers((prev) => [...prev, m]);
    toast.success(`Invitation sent to ${email}`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        title="Team"
        description="Manage who has access to your DocPilot workspace."
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Invite member
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="rounded-xl border bg-card shadow-[var(--shadow-soft)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {m.name[0]?.toUpperCase()}
                    </div>
                    {m.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "Admin" ? "default" : "outline"}>{m.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.joinedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <InviteMemberModal open={open} onOpenChange={setOpen} onInvite={handleInvite} />
    </div>
  );
}
