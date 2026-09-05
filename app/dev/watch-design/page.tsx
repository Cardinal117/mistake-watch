import { notFound } from "next/navigation";
import { WatchDesignFixture } from "@/tests/fixtures/watch-design-fixture";

export default function WatchDesignPreview() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.WATCH_DESIGN_QA !== "1"
  )
    notFound();
  return <WatchDesignFixture />;
}
