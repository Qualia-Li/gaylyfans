import { getAdminReports } from "@/actions/admin/gaylyfans";
import { constructMetadata } from "@/lib/metadata";
import { Loader2 } from "lucide-react";
import { Metadata } from "next";
import { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { columns } from "./Columns";
import { DataTable } from "./DataTable";

type Params = Promise<{ locale: string }>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;

  return constructMetadata({
    page: "Admin Reports",
    title: "Reports",
    description: "Review and manage content reports",
    locale: locale as Locale,
    path: `/dashboard/reports`,
  });
}

const PAGE_SIZE = 20;

async function ReportsTable() {
  const result = await getAdminReports({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
    reviewed: false,
  });
  const reports = result.success ? result.data?.reports || [] : [];
  const totalCount = result.success ? result.data?.totalCount || 0 : 0;

  return (
    <DataTable
      columns={columns}
      initialData={reports}
      initialPageCount={Math.ceil(totalCount / PAGE_SIZE)}
      pageSize={PAGE_SIZE}
    />
  );
}

export default function AdminReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">
          Review content reports and take action on flagged videos.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }
      >
        <ReportsTable />
      </Suspense>
    </div>
  );
}
