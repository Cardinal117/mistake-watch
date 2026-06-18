import { NextResponse } from "next/server";

import { getAccountSummary } from "@/lib/account/server";
import { getCloudConvertDiagnostics } from "@/lib/media/cloudconvert";

export async function GET() {
  const account = await getAccountSummary();

  if (
    account.status !== "signed-in" ||
    account.role !== "owner" ||
    account.accountStatus !== "active"
  ) {
    return NextResponse.json({ error: "Owner account required." }, { status: 403 });
  }

  try {
    const diagnostics = await getCloudConvertDiagnostics();

    return NextResponse.json({ diagnostics });
  } catch (error) {
    console.error("[cloudconvert:status]", error);

    return NextResponse.json(
      { error: "CloudConvert diagnostics could not be loaded." },
      { status: 500 },
    );
  }
}
