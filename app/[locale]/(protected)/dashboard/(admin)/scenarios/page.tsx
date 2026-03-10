import { getAdminScenarios } from "@/actions/admin/gaylyfans";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { constructMetadata } from "@/lib/metadata";
import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import { Metadata } from "next";
import { Locale } from "next-intl";
import { Suspense } from "react";

type Params = Promise<{ locale: string }>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;

  return constructMetadata({
    page: "Admin Scenarios",
    title: "Scenarios",
    description: "View scenarios and variants",
    locale: locale as Locale,
    path: `/dashboard/scenarios`,
  });
}

async function ScenariosTable() {
  const result = await getAdminScenarios();
  const scenariosList = result.success ? result.data?.scenarios || [] : [];

  if (scenariosList.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No scenarios found.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Source Image</TableHead>
            <TableHead>Variants</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Sort Order</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scenariosList.map((scenario) => (
            <TableRow key={scenario.id}>
              <TableCell className="text-sm text-muted-foreground font-mono">
                {scenario.id}
              </TableCell>
              <TableCell className="text-sm font-medium">
                {scenario.name}
              </TableCell>
              <TableCell>
                {scenario.sourceImageUrl ? (
                  <a
                    href={scenario.sourceImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline max-w-[200px] truncate block"
                  >
                    View Image
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{scenario.variantCount}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={scenario.isActive ? "default" : "secondary"}
                >
                  {scenario.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {scenario.sortOrder}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {dayjs(scenario.createdAt).format("YYYY-MM-DD HH:mm")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdminScenariosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Scenarios</h2>
        <p className="text-muted-foreground">
          View all scenarios and their variant counts.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }
      >
        <ScenariosTable />
      </Suspense>
    </div>
  );
}
