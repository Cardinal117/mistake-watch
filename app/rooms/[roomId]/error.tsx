"use client";

import { AppShell } from "@/components/layout";
import { Button, Panel } from "@/components/ui";

export default function RoomLoadError({ retry }: { retry: () => void }) {
  return (
    <AppShell>
      <section className="mx-auto grid min-h-dvh w-full max-w-[920px] place-items-center px-margin-mobile py-20 md:px-margin-desktop">
        <Panel className="w-full space-y-4" role="alert">
          <h1 className="text-headline-md font-semibold text-on-surface">
            We couldn’t load the room
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Please try again. You can stay on this page while the connection
            recovers.
          </p>
          <Button onClick={retry} type="button">
            Try again
          </Button>
        </Panel>
      </section>
    </AppShell>
  );
}
