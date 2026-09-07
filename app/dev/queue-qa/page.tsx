import { notFound } from "next/navigation";
import { QueueQaFixture } from "@/tests/fixtures/queue-qa-fixture";
export default function Page() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.WATCH_DESIGN_QA !== "1"
  )
    notFound();
  return <QueueQaFixture />;
}
