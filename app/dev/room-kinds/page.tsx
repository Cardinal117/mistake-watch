import { notFound } from "next/navigation";
import { LegacyRoomsQaFixture } from "@/tests/fixtures/legacy-rooms-qa-fixture";

export default function Page() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.WATCH_DESIGN_QA !== "1"
  )
    notFound();
  return <LegacyRoomsQaFixture />;
}
