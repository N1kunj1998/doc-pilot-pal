import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role } from "@/lib/mock-data";

export function InviteMemberModal({
  open, onOpenChange, onInvite,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInvite: (email: string, role: Role) => void | Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Member");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>They'll receive an email invitation to join your workspace.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!email) return;
            await onInvite(email, role);
            setEmail(""); setRole("Member"); onOpenChange(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" placeholder="teammate@acme.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Member">Member</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Send invite</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
