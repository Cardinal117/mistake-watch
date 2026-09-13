import { notFound } from "next/navigation";
import { RoomLoadingFixture } from "@/tests/fixtures/room-loading-fixture";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { RoomLoadingFallback } from "@/components/ui/room-loading/fallback";
export default async function Page({searchParams}:{searchParams:Promise<{surface?:string}>}) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.WATCH_DESIGN_QA !== "1"
  )
    notFound();
  const {surface}=await searchParams;
  if(surface==="dashboard")return <DashboardNav account={{status:"guest"}}/>;
  if(surface==="loading")return <RoomLoadingFallback/>;
  return <RoomLoadingFixture />;
}
