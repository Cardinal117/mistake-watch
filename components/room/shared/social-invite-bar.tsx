"use client";
import { useId, useState } from "react";
import { ChevronDown, UserPlus } from "lucide-react";
import { InviteActions } from "../invite-actions";
import "./social-invite-bar.css";
export function SocialInviteBar({
  roomCode,
  inviteUrl,
}: {
  roomCode: string;
  inviteUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!roomCode) return null;

  return (
    <section className="social-invite-bar" data-open={open}>
      <button
        className="social-invite-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <UserPlus aria-hidden />
        <span>Invite people</span>
        <ChevronDown aria-hidden />
      </button>
      <div
        className="social-invite-reveal"
        id={id}
        inert={!open}
        aria-hidden={!open}
      >
        <div>
          <div className="social-invite-actions">
            <InviteActions compact roomCode={roomCode} inviteUrl={inviteUrl} />
          </div>
        </div>
      </div>
    </section>
  );
}
