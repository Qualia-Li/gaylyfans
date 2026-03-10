"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authClient.signIn.magicLink({ email, callbackURL: "/" });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setEmail("");
      setSent(false);
      setError(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-white">Sign In</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter your email to receive a magic link
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <span className="text-4xl">📧</span>
            <h3 className="text-lg font-bold text-white text-center">Check your inbox!</h3>
            <p className="text-sm text-zinc-400 text-center">
              We sent a magic link to <strong className="text-white">{email}</strong>. Click it to sign in.
            </p>
            <Button
              variant="secondary"
              onClick={() => { setSent(false); setError(null); }}
            >
              Send Again
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Input
              placeholder="your@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" className="text-zinc-400" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={loading || !email}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {loading ? "Sending..." : "Send Magic Link"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
