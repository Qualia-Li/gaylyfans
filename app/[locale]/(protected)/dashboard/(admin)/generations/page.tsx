import { getAdminGenerations } from "@/actions/admin/gaylyfans";
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
    page: "Admin Generations",
    title: "Generations",
    description: "Monitor AI video generation jobs",
    locale: locale as Locale,
    path: `/dashboard/generations`,
  });
}

const PAGE_SIZE = 20;

async function GenerationsTable() {
  const result = await getAdminGenerations({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const generations = result.success ? result.data?.generations || [] : [];
  const totalCount = result.success ? result.data?.totalCount || 0 : 0;

  return (
    <DataTable
      columns={columns}
      initialData={generations}
      initialPageCount={Math.ceil(totalCount / PAGE_SIZE)}
      pageSize={PAGE_SIZE}
    />
  );
}

export default function AdminGenerationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Generations</h2>
        <p className="text-muted-foreground">
          Monitor AI video generation jobs, statuses, and credit usage.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }
      >
        <GenerationsTable />
      </Suspense>
    </div>
  );
}
