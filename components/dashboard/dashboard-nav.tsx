"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Bell, Search, Settings } from "lucide-react";
import { AvatarPicker } from "@/components/account";
import { Avatar, IconButton } from "@/components/ui";
import { useSelectedAvatarKey } from "@/lib/identity/avatar-selection";

const navItems = ["Watch", "Listen", "Browse"];

export function DashboardNav() {
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const { avatarKey } = useSelectedAvatarKey("dashboard-host");

  return (
    <>
      <header className="dashboard-chrome-surface fixed inset-x-0 top-0 z-50 border-b border-white/10">
        <div className="relative flex h-16 w-full items-center justify-between gap-3 px-margin-mobile md:gap-4 md:px-margin-desktop">
          <div className="flex min-w-0 items-center gap-7">
            <Link
              aria-label="Mistake Watch dashboard"
              className="relative flex h-14 w-[11.5rem] shrink-0 items-center overflow-hidden rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-primary-fixed-dim/55 sm:w-[13.75rem]"
              href="/"
            >
              <Image
                alt="Mistake Watch"
                className="object-contain object-left"
                fill
                priority
                sizes="(min-width: 640px) 220px, 184px"
                src="/brand/navbar-logo-mistake-watch-signal-aperture-transparent.png"
              />
            </Link>
            <nav
              className="hidden items-center gap-6 md:flex"
              aria-label="Modes"
            >
              {navItems.map((item) => (
                <a
                  className="text-label-md font-semibold text-on-surface-variant transition hover:text-primary-fixed-dim"
                  href="#"
                  key={item}
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          <div className="absolute left-1/2 hidden w-[min(22rem,28vw)] -translate-x-1/2 items-center gap-2 rounded-md border border-white/10 bg-surface-container px-3 py-2 transition focus-within:border-primary-fixed-dim/60 lg:flex">
            <Search className="h-4 w-4 text-on-surface-variant" aria-hidden />
            <input
              aria-label="Search rooms, codes, and saved sources"
              className="min-w-0 flex-1 bg-transparent text-label-md text-on-surface outline-none placeholder:text-on-surface-variant/55"
              placeholder="Search rooms or codes..."
              type="search"
            />
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <IconButton
              className="hidden sm:inline-flex"
              label="Notifications"
              variant="ghost"
            >
              <Bell className="h-5 w-5" aria-hidden />
            </IconButton>
            <IconButton
              label="Settings"
              onClick={() => setAvatarPickerOpen(true)}
              variant="ghost"
            >
              <Settings className="h-5 w-5" aria-hidden />
            </IconButton>
            <button
              aria-label="Choose account avatar"
              className="rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-primary-fixed-dim/55"
              onClick={() => setAvatarPickerOpen(true)}
              type="button"
            >
              <Avatar
                avatarKey={avatarKey}
                name="Mistake Host"
                seed="dashboard-host"
                status="online"
              />
            </button>
          </div>
        </div>
      </header>
      <AvatarPicker
        name="Mistake Host"
        onClose={() => setAvatarPickerOpen(false)}
        open={avatarPickerOpen}
        role="host"
        seed="dashboard-host"
      />
    </>
  );
}
