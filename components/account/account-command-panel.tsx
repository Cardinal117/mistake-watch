"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  Check,
  LogIn,
  LogOut,
  Palette,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { Avatar, Badge, buttonClassName } from "@/components/ui";
import {
  useSelectedAvatarKey,
  writeStoredAvatarKey,
} from "@/lib/identity/avatar-selection";
import { avatarCatalog, type AvatarKey } from "@/lib/identity/avatars";
import { cx } from "@/lib/ui";
import type { AccountSummary } from "@/lib/account/types";
import { AccountRoomsSection } from "./account-rooms-section";
import { CloudConvertSection } from "./cloudconvert-section";

type AccountCommandPanelProps = {
  account: AccountSummary;
  className?: string;
  compact?: boolean;
  nextPath: string;
  notice?: "guest-room-attached";
  roomAttached?: boolean;
  roomId?: string;
};

const tabs = [
  { icon: BadgeCheck, id: "overview", label: "Overview" },
  { icon: UserRound, id: "profile", label: "Profile" },
  { icon: Palette, id: "personalization", label: "Personalization" },
  { icon: Users, id: "rooms", label: "Rooms" },
  { icon: Shield, id: "privacy", label: "Privacy" },
  { icon: UserRound, id: "account", label: "Account" },
] as const;

type AccountPanelTab = (typeof tabs)[number]["id"];

export function AccountCommandPanel({
  account,
  className,
  compact = false,
  nextPath,
  notice,
  roomAttached = false,
  roomId,
}: AccountCommandPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AccountPanelTab>("overview");
  const { avatarKey } = useSelectedAvatarKey(
    account.status === "signed-in" ? account.id : "dashboard-host",
  );
  const isSignedIn = account.status === "signed-in";
  const isOwner =
    account.status === "signed-in" &&
    account.role === "owner" &&
    account.accountStatus === "active";
  const displayName = isSignedIn ? account.displayName : "Mistake Guest";
  const avatarUrl =
    account.status === "signed-in" ? account.avatarUrl : undefined;
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/";
  const signInHref = `/auth/sign-in?next=${encodeURIComponent(safeNextPath)}`;
  const signOutHref = `/auth/sign-out?next=${encodeURIComponent(safeNextPath)}`;
  const accountModal = open ? (
    <div
      aria-labelledby="account-command-title"
      aria-modal="true"
      className="fixed inset-0 z-[160] grid place-items-center bg-surface-container-lowest/62 px-4 py-4 backdrop-blur-md sm:px-6"
      role="dialog"
    >
      <section className="grid h-[calc(100dvh-2rem)] min-h-0 w-full max-w-5xl overflow-hidden rounded-lg border border-white/10 bg-surface/78 shadow-screen-glow backdrop-blur-xl md:h-[min(760px,calc(100dvh-2rem))] md:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-surface-container-lowest/45 p-4 md:border-b-0 md:border-r">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                avatarKey={avatarKey}
                className="h-12 w-12"
                name={displayName}
                seed={displayName}
                src={avatarUrl ?? undefined}
                status={isSignedIn ? "online" : undefined}
              />
              <div className="min-w-0">
                <p className="technical-label text-primary-fixed-dim">
                  Account
                </p>
                <h2
                  className="truncate text-body-lg font-semibold text-on-surface"
                  id="account-command-title"
                >
                  {displayName}
                </h2>
              </div>
            </div>
            <button
              aria-label="Close account panel"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface md:hidden"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={isOwner ? "amber" : isSignedIn ? "cyan" : "neutral"}>
              {isOwner ? "Owner" : isSignedIn ? "Member" : "Guest"}
            </Badge>
            <Badge tone="neutral">
              {isSignedIn ? "Google identity" : "Local identity"}
            </Badge>
          </div>

          <nav
            aria-label="Account sections"
            className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-1"
          >
            {tabs.map(({ icon: Icon, id, label }) => (
              <button
                className={cx(
                  "inline-flex h-10 items-center gap-2 rounded-sm border px-3 text-label-sm font-semibold transition",
                  activeTab === id
                    ? "border-primary-fixed-dim/45 bg-primary-fixed-dim/12 text-primary-fixed-dim"
                    : "border-white/10 bg-transparent text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface",
                )}
                key={id}
                onClick={() => setActiveTab(id)}
                type="button"
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
          <header className="hidden items-start justify-between gap-4 border-b border-white/10 bg-surface-container-lowest/35 p-5 md:flex">
            <div>
              <p className="technical-label text-primary-fixed-dim">
                Account Command Panel
              </p>
              <h3 className="mt-1 text-headline-md font-semibold text-on-surface">
                {getTabTitle(activeTab)}
              </h3>
            </div>
            <button
              aria-label="Close account panel"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div className="min-h-0 overflow-y-auto p-5">
            <AccountPanelContent
              account={account}
              activeTab={activeTab}
              avatarKey={avatarKey}
              displayName={displayName}
              notice={notice}
              roomAttached={roomAttached}
              roomId={roomId}
            />
          </div>

          <footer className="flex flex-col gap-3 border-t border-white/10 bg-surface-container-lowest/35 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-label-sm text-on-surface-variant">
              Google sign-in is identity-only here. No YouTube, Drive, playlist,
              history, contacts, calendar, or offline access is requested.
            </p>
            {isSignedIn ? (
              <a
                className={buttonClassName({
                  className: "shrink-0",
                  size: "sm",
                  variant: "ghost",
                })}
                href={signOutHref}
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </a>
            ) : (
              <a
                className={buttonClassName({
                  className: "shrink-0",
                  size: "sm",
                })}
                href={signInHref}
              >
                <LogIn className="h-4 w-4" aria-hidden />
                Continue with Google
              </a>
            )}
          </footer>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        aria-expanded={open}
        aria-label="Open account panel"
        className={cx(
          "inline-flex min-w-0 items-center gap-2 rounded-sm border border-white/10 bg-surface-container-low/70 px-2 py-1.5 text-left transition hover:border-primary-fixed-dim/45 hover:bg-surface-container",
          compact ? "h-10 w-10 justify-center px-0" : "max-w-[12rem]",
          className,
        )}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Avatar
          avatarKey={avatarKey}
          className="h-7 w-7"
          name={displayName}
          seed={displayName}
          src={avatarUrl ?? undefined}
          status={isSignedIn ? "online" : undefined}
        />
        {compact ? null : (
          <span className="min-w-0">
            <span className="block truncate text-label-sm font-semibold text-on-surface">
              {displayName}
            </span>
            <span className="technical-label block truncate text-primary-fixed-dim">
              {isSignedIn ? (isOwner ? "owner" : "member") : "guest"}
            </span>
          </span>
        )}
      </button>

      {accountModal && typeof document !== "undefined"
        ? createPortal(accountModal, document.body)
        : null}
    </>
  );
}

function AccountPanelContent({
  account,
  activeTab,
  avatarKey,
  displayName,
  notice,
  roomAttached,
  roomId,
}: {
  account: AccountSummary;
  activeTab: AccountPanelTab;
  avatarKey: AvatarKey;
  displayName: string;
  notice?: "guest-room-attached";
  roomAttached: boolean;
  roomId?: string;
}) {
  const signedIn = account.status === "signed-in";
  const rows =
    account.status === "signed-in"
      ? [
          ["State", account.accountStatus],
          ["Role", account.role],
          ["Handle", account.handle ?? "Reserved"],
          ["Avatar source", account.avatarSource.replace("_", " ")],
          [
            "Room context",
            roomId
              ? roomAttached
                ? "Attached to account"
                : "Current room available"
              : "Dashboard",
          ],
        ]
      : [
          ["State", "Guest"],
          ["Persistence", "This browser only"],
          ["Room access", "Create, join, queue, chat where allowed"],
          ["Upgrade path", "Optional Google identity"],
        ];

  if (activeTab === "overview") {
    return (
      <div className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="rounded-md border border-white/10 bg-surface-container-lowest/42 p-5">
            <p className="technical-label text-primary-fixed-dim">
              Current Identity
            </p>
            <h4 className="mt-2 text-headline-md font-semibold text-on-surface">
              {signedIn ? account.displayName : "Guest session"}
            </h4>
            <p className="mt-3 text-body-md text-on-surface-variant">
              {signedIn
                ? "Your account can persist profile data and can receive server-side app roles."
                : "Guest mode remains fully usable. Signing in only makes identity and future preferences durable."}
            </p>
          </section>
          <AccountFactList rows={rows} />
        </div>
        {signedIn && roomId ? (
          roomAttached ? (
            <section className="rounded-md border border-primary-fixed-dim/25 bg-primary-fixed-dim/8 p-4">
              <p className="technical-label text-primary-fixed-dim">
                Current room attached
              </p>
              <p className="mt-2 text-body-md text-on-surface-variant">
                {notice === "guest-room-attached"
                  ? "This room is now attached to your Google account."
                  : "This room is already linked to your signed-in account."}
              </p>
            </section>
          ) : (
            <section className="rounded-md border border-secondary-fixed-dim/25 bg-secondary-fixed-dim/8 p-4">
              <p className="technical-label text-secondary-fixed-dim">
                Current guest room
              </p>
              <p className="mt-2 text-body-md text-on-surface-variant">
                Attach this browser&apos;s current guest room session to your
                signed-in account. Host ownership and saved-room attribution
                transfer only when this guest session owns them.
              </p>
              <a
                className={buttonClassName({
                  className: "mt-4 w-fit",
                  size: "sm",
                  variant: "secondary",
                })}
                href={`/account/migrate-guest-room?roomId=${encodeURIComponent(
                  roomId,
                )}&next=${encodeURIComponent(`/rooms/${roomId}`)}`}
                onClick={(event) => {
                  if (
                    !window.confirm(
                      "Attach this current guest room session to your signed-in account?",
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                Attach current room
              </a>
            </section>
          )
        ) : null}
      </div>
    );
  }

  if (activeTab === "profile") {
    return (
      <div className="grid gap-5">
        <AccountFactList
          rows={
            signedIn
              ? [
                  ["Display name", account.displayName],
                  ["Email", account.email ?? "Unavailable"],
                  ["Public handle", account.handle ?? "Not set yet"],
                  [
                    "Google avatar",
                    account.googleAvatarUrl ? "Available" : "None",
                  ],
                ]
              : [
                  ["Display name", "Managed by the guest room join flow"],
                  ["Avatar", "Local hardware avatar picker"],
                  ["Public profile", "Unavailable until sign-in"],
                ]
          }
        />
        <HardwareAvatarSection
          avatarKey={avatarKey}
          displayName={displayName}
          role={signedIn ? "guest" : "host"}
        />
      </div>
    );
  }

  if (activeTab === "rooms") {
    return <AccountRoomsSection signedIn={signedIn} />;
  }

  if (activeTab === "account") {
    return (
      <div className="grid gap-5">
        <section className="rounded-md border border-white/10 bg-surface-container-lowest/42 p-5">
          <p className="technical-label text-primary-fixed-dim">Account</p>
          <h4 className="mt-2 text-headline-md font-semibold text-on-surface">
            {signedIn ? "Google identity active" : "Guest account"}
          </h4>
          <p className="mt-3 max-w-2xl text-body-md text-on-surface-variant">
            {signedIn
              ? "Your Google sign-in is used for identity, ownership, and server-side app roles."
              : "Sign-in remains optional. Guest-first room access works without a Google account."}
          </p>
        </section>
        {account.status === "signed-in" &&
        account.role === "owner" &&
        account.accountStatus === "active" ? (
          <CloudConvertSection />
        ) : null}
      </div>
    );
  }

  return (
    <section className="rounded-md border border-white/10 bg-surface-container-lowest/42 p-5">
      <p className="technical-label text-primary-fixed-dim">
        {getTabTitle(activeTab)}
      </p>
      <h4 className="mt-2 text-headline-md font-semibold text-on-surface">
        Foundation ready
      </h4>
      <p className="mt-3 max-w-2xl text-body-md text-on-surface-variant">
        {getPlaceholderCopy(activeTab, signedIn)}
      </p>
    </section>
  );
}

function HardwareAvatarSection({
  avatarKey,
  displayName,
  role,
}: {
  avatarKey: AvatarKey;
  displayName: string;
  role: "guest" | "host";
}) {
  return (
    <section className="rounded-md border border-white/10 bg-surface-container-lowest/42 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          avatarKey={avatarKey}
          className="h-12 w-12"
          crowned={role === "host"}
          name={displayName}
          seed={displayName}
          status="online"
        />
        <div className="min-w-0">
          <p className="technical-label text-primary-fixed-dim">
            Hardware avatar
          </p>
          <h4 className="mt-1 text-body-lg font-semibold text-on-surface">
            Choose your room identity chip
          </h4>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Saved on this browser for now. Durable avatar preferences come with
            account personalization.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {avatarCatalog.map((avatar) => {
          const selected = avatar.key === avatarKey;

          return (
            <button
              aria-pressed={selected}
              className={cx(
                "grid min-w-0 gap-3 rounded-md border bg-surface-container-low p-3 text-left transition",
                selected
                  ? "border-primary-fixed-dim/55 bg-primary-fixed-dim/10 shadow-[0_0_20px_rgb(0_219_233_/_0.14)]"
                  : "border-white/10 hover:border-primary-fixed-dim/35 hover:bg-surface-container",
              )}
              key={avatar.key}
              onClick={() => writeStoredAvatarKey(avatar.key)}
              type="button"
            >
              <span className="relative inline-flex">
                <Avatar
                  avatarKey={avatar.key}
                  className="h-14 w-14"
                  crowned={role === "host" && selected}
                  name={displayName}
                  seed={displayName}
                />
                {selected ? (
                  <span className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-primary-fixed-dim/40 bg-primary-fixed-dim text-on-primary-fixed">
                    <Check className="h-4 w-4" aria-hidden />
                  </span>
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body-md font-semibold text-on-surface">
                  {avatar.label}
                </span>
                <span className="mt-1 block text-label-sm text-on-surface-variant">
                  {avatar.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AccountFactList({ rows }: { rows: string[][] }) {
  return (
    <dl className="grid gap-2 rounded-md border border-white/10 bg-surface-container-lowest/42 p-4">
      {rows.map(([label, value]) => (
        <div
          className="grid gap-1 rounded-sm border border-white/5 bg-white/[0.025] p-3"
          key={label}
        >
          <dt className="technical-label text-on-surface-variant">{label}</dt>
          <dd className="text-body-md font-semibold text-on-surface">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function getTabTitle(tab: AccountPanelTab) {
  switch (tab) {
    case "account":
      return "Account";
    case "personalization":
      return "Personalization";
    case "privacy":
      return "Privacy";
    case "profile":
      return "Profile";
    case "rooms":
      return "Rooms";
    default:
      return "Overview";
  }
}

function getPlaceholderCopy(tab: AccountPanelTab, signedIn: boolean) {
  if (tab === "personalization") {
    return signedIn
      ? "Durable themes, room preferences, and accessibility comfort settings arrive in TASK-002.10."
      : "Guest personalization stays local until you choose to sign in.";
  }

  if (tab === "privacy") {
    return "Provider tokens stay server-side. This task does not request or store YouTube, Drive, playlist, history, contacts, calendar, or offline access.";
  }

  return signedIn
    ? "Account role, sign-out, and profile status are active. Deeper account settings are staged for later tasks."
    : "Sign-in is optional. Guest-first room access remains available without a Google account.";
}
