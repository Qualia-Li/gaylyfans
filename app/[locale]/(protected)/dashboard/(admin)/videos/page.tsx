import { getAdminVideos } from "@/actions/admin/gaylyfans";
import { constructMetadata } from "@/lib/metadata";
import { Loader2 } from "lucide-react";
import { Metadata } from "next";
import { Locale, useTranslations } from "next-intl";
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
  const t = await getTranslations({
    locale,
    namespace: "common",
  });

  return constructMetadata({
    page: "Admin Videos",
    title: "Videos",
    description: "Manage feed videos",
    locale: locale as Locale,
    path: `/dashboard/videos`,
  });
}

const PAGE_SIZE = 20;

async function VideosTable() {
  const result = await getAdminVideos({ pageIndex: 0, pageSize: PAGE_SIZE });
  const videos = result.success ? result.data?.videos || [] : [];
  const totalCount = result.success ? result.data?.totalCount || 0 : 0;

  return (
    <DataTable
      columns={columns}
      initialData={videos}
      initialPageCount={Math.ceil(totalCount / PAGE_SIZE)}
      pageSize={PAGE_SIZE}
    />
  );
}

export default function AdminVideosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Videos</h2>
        <p className="text-muted-foreground">
          Manage feed videos, toggle active status, and add new content.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }
      >
        <VideosTable />
      </Suspense>
    </div>
  );
}
