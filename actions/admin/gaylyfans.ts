'use server';

import type { ActionResult } from '@/lib/action-response';
import { actionResponse } from '@/lib/action-response';
import { isAdmin } from '@/lib/auth/server';
import { db } from '@/lib/db';
import {
  feedVideos,
  scenarios,
  scenarioVariants,
  reports,
  generationJobs,
} from '@/lib/db/schema';
import { eq, desc, sql, count, and, ilike, or } from 'drizzle-orm';

// ============================================================================
// Types
// ============================================================================

export type AdminVideo = typeof feedVideos.$inferSelect;

export type AdminReport = typeof reports.$inferSelect & {
  videoTitle: string | null;
};

export type AdminGeneration = typeof generationJobs.$inferSelect;

export type AdminScenario = typeof scenarios.$inferSelect & {
  variantCount: number;
};

// ============================================================================
// Videos CRUD
// ============================================================================

export async function getAdminVideos({
  pageIndex = 0,
  pageSize = 20,
  filter = '',
}: {
  pageIndex?: number;
  pageSize?: number;
  filter?: string;
}): Promise<
  ActionResult<{ videos: AdminVideo[]; totalCount: number }>
> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin access required');
  }

  try {
    const conditions = filter
      ? or(
          ilike(feedVideos.title, `%${filter}%`),
          ilike(feedVideos.creator, `%${filter}%`)
        )
      : undefined;

    const [videosResult, countResult] = await Promise.all([
      db
        .select()
        .from(feedVideos)
        .where(conditions)
        .orderBy(desc(feedVideos.sortOrder), desc(feedVideos.createdAt))
        .limit(pageSize)
        .offset(pageIndex * pageSize),
      db
        .select({ count: count() })
        .from(feedVideos)
        .where(conditions),
    ]);

    return actionResponse.success({
      videos: videosResult,
      totalCount: countResult[0]?.count || 0,
    });
  } catch (error: any) {
    return actionResponse.error(error.message || 'Failed to fetch videos');
  }
}

export async function updateVideo(
  id: number,
  data: {
    title?: string;
    creator?: string;
    videoUrl?: string;
    isActive?: boolean;
    sortOrder?: number;
    tags?: string[];
  }
): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin access required');
  }

  try {
    const updateData: Record<string, any> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.creator !== undefined) updateData.creator = data.creator;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.tags !== undefined) updateData.tags = data.tags;

    await db.update(feedVideos).set(updateData).where(eq(feedVideos.id, id));
    return actionResponse.success();
  } catch (error: any) {
    return actionResponse.error(error.message || 'Failed to update video');
  }
}

export async function deleteVideo(id: number): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin access required');
  }

  try {
    await db.delete(feedVideos).where(eq(feedVideos.id, id));
    return actionResponse.success();
  } catch (error: any) {
    return actionResponse.error(error.message || 'Failed to delete video');
  }
}

export async function createVideo(data: {
  title: string;
  creator: string;
  videoUrl: string;
  tags?: string[];
}): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin access required');
  }

  try {
    await db.insert(feedVideos).values({
      title: data.title,
      creator: data.creator,
      videoUrl: data.videoUrl,
      tags: data.tags || [],
    });
    return actionResponse.success();
  } catch (error: any) {
    return actionResponse.error(error.message || 'Failed to create video');
  }
}

// ============================================================================
// Reports
// ============================================================================

export async function getAdminReports({
  pageIndex = 0,
  pageSize = 20,
  reviewed,
}: {
  pageIndex?: number;
  pageSize?: number;
  reviewed?: boolean;
}): Promise<
  ActionResult<{ reports: AdminReport[]; totalCount: number }>
> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin access required');
  }

  try {
    const conditions =
      reviewed !== undefined ? eq(reports.reviewed, reviewed) : undefined;

    const [reportsResult, countResult] = await Promise.all([
      db
        .select({
          id: reports.id,
          videoId: reports.videoId,
          reason: reports.reason,
          detail: reports.detail,
          userAgent: reports.userAgent,
          reviewed: reports.reviewed,
          reviewedAt: reports.reviewedAt,
          createdAt: reports.createdAt,
          videoTitle: feedVideos.title,
        })
        .from(reports)
        .leftJoin(feedVideos, eq(reports.videoId, feedVideos.id))
        .where(conditions)
        .orderBy(reports.reviewed, desc(reports.createdAt))
        .limit(pageSize)
        .offset(pageIndex * pageSize),
      db
        .select({ count: count() })
        .from(reports)
        .where(conditions),
    ]);

    return actionResponse.success({
      reports: reportsResult,
      totalCount: countResult[0]?.count || 0,
    });
  } catch (error: any) {
    return actionResponse.error(error.message || 'Failed to fetch reports');
  }
}

export async function markReportReviewed(id: string): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin access required');
  }

  try {
    await db
      .update(reports)
      .set({ reviewed: true, reviewedAt: new Date() })
      .where(eq(reports.id, id));
    return actionResponse.success();
  } catch (error: any) {
    return actionResponse.error(
      error.message || 'Failed to mark report as reviewed'
    );
  }
}

export async function dismissReport(id: string): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin access required');
  }

  try {
    await db.delete(reports).where(eq(reports.id, id));
    return actionResponse.success();
  } catch (error: any) {
    return actionResponse.error(error.message || 'Failed to dismiss report');
  }
}

// ============================================================================
// Generations
// ============================================================================

export async function getAdminGenerations({
  pageIndex = 0,
  pageSize = 20,
  status,
}: {
  pageIndex?: number;
  pageSize?: number;
  status?: string;
}): Promise<
  ActionResult<{ generations: AdminGeneration[]; totalCount: number }>
> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin access required');
  }

  try {
    const conditions = status
      ? eq(generationJobs.status, status as any)
      : undefined;

    const [generationsResult, countResult] = await Promise.all([
      db
        .select()
        .from(generationJobs)
        .where(conditions)
        .orderBy(desc(generationJobs.createdAt))
        .limit(pageSize)
        .offset(pageIndex * pageSize),
      db
        .select({ count: count() })
        .from(generationJobs)
        .where(conditions),
    ]);

    return actionResponse.success({
      generations: generationsResult,
      totalCount: countResult[0]?.count || 0,
    });
  } catch (error: any) {
    return actionResponse.error(
      error.message || 'Failed to fetch generations'
    );
  }
}

// ============================================================================
// Scenarios (read-only list with variant count)
// ============================================================================

export async function getAdminScenarios(): Promise<
  ActionResult<{ scenarios: AdminScenario[] }>
> {
  if (!(await isAdmin())) {
    return actionResponse.forbidden('Admin access required');
  }

  try {
    const scenariosResult = await db
      .select({
        id: scenarios.id,
        name: scenarios.name,
        sourceImageUrl: scenarios.sourceImageUrl,
        isActive: scenarios.isActive,
        sortOrder: scenarios.sortOrder,
        createdAt: scenarios.createdAt,
        variantCount: sql<number>`cast(count(${scenarioVariants.id}) as int)`,
      })
      .from(scenarios)
      .leftJoin(scenarioVariants, eq(scenarios.id, scenarioVariants.scenarioId))
      .groupBy(scenarios.id)
      .orderBy(scenarios.sortOrder, scenarios.name);

    return actionResponse.success({ scenarios: scenariosResult });
  } catch (error: any) {
    return actionResponse.error(
      error.message || 'Failed to fetch scenarios'
    );
  }
}
