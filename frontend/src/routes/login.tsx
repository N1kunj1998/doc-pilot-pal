import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("sarah@acme.com");
  const [pw, setPw] = useState("password");

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your DocPilot workspace.">
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); login(email, pw); nav({ to: "/chat" }); }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full">Sign in</Button>
        <p className="text-center text-sm text-muted-foreground">
          New to DocPilot? <Link to="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
