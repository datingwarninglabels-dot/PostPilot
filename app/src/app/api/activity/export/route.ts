import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  activityToCsv,
  listActivityForExport,
  type ActivityFilters,
} from "@/lib/activity";
import { getAccountScope } from "@/lib/platform-connections";

/** CSV export of the activity log, honouring the same filters as the /activity page. */
export async function GET(request: NextRequest) {
  await requireAdmin();

  const sp = request.nextUrl.searchParams;
  const platform = sp.get("platform");
  const status = sp.get("status");
  const entity = sp.get("entity");
  const event = sp.get("event");
  const q = sp.get("q");

  const filters: ActivityFilters = {
    platform:
      platform === "facebook" || platform === "instagram" || platform === "tiktok"
        ? platform
        : undefined,
    status:
      status === "success" || status === "failure" || status === "info" ? status : undefined,
    entityType:
      entity === "post" ||
      entity === "reply" ||
      entity === "comment" ||
      entity === "connection" ||
      entity === "settings"
        ? entity
        : undefined,
    eventType: (event as ActivityFilters["eventType"]) || undefined,
    q: q?.trim() || undefined,
  };

  const scope = await getAccountScope(sp.get("account"));
  if (scope) {
    filters.accountName = scope.account_name;
    filters.platform = filters.platform ?? scope.platform;
  }

  const entries = await listActivityForExport(filters);
  const csv = activityToCsv(entries);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="postpilot-activity-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
