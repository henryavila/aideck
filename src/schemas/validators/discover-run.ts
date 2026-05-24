import { z } from 'zod'

export const discoverEvidenceSchema = z
  .object({
    sourceType: z.string(),
    sourceId: z.string(),
    topicHint: z.string(),
    evidenceQuote: z.string(),
    candidateCompletion: z.string(),
    lastActivity: z.string()
  })
  .strict()

export const activityPointSchema = z
  .object({
    date: z.string(),
    count: z.number().int().nonnegative(),
    types: z.array(z.string())
  })
  .strict()

export const discoverCandidateSchema = z
  .object({
    slug: z.string(),
    slugAlternatives: z.array(z.string()),
    title: z.string(),
    goal: z.string(),
    kind: z.enum(['plan', 'initiative']),
    bucket: z.enum(['strong', 'worth-reviewing', 'historical']),
    confidence: z.number().min(0).max(1),
    confidenceBreakdown: z.record(z.string(), z.number()),
    started: z.string(),
    lastUpdated: z.string(),
    activityTimeline: z.array(activityPointSchema),
    branch: z.string().nullable(),
    nextAction: z.string().nullable(),
    rationale: z.string(),
    scopePaths: z.array(z.string()),
    signalIds: z.array(z.string()),
    evidence: z.array(discoverEvidenceSchema),
    contextMarkdown: z.string(),
    evidenceExcerpts: z.string(),
    previewYaml: z.string(),
    draftPath: z.string(),
    approved: z.boolean(),
    historicalReason: z.string().optional(),
    completionSummary: z.string().optional()
  })
  .strict()

export const orphanSignalSchema = z
  .object({
    id: z.string(),
    sourceType: z.string(),
    sourceId: z.string(),
    topicHint: z.string(),
    evidenceQuote: z.string(),
    lastActivity: z.string()
  })
  .strict()

export const discoverRelationshipSchema = z
  .object({
    fromSlug: z.string(),
    toSlug: z.string(),
    kind: z.enum(['plan-phase', 'shared-paths', 'shared-branch', 'subtopic']),
    sharedIdentifiers: z.array(z.string()),
    strength: z.number().min(0).max(1)
  })
  .strict()

export const sourceSummarySchema = z
  .object({
    layer: z.string(),
    label: z.string(),
    signalCount: z.number().int().nonnegative()
  })
  .strict()

export const discoverCountsSchema = z
  .object({
    strong: z.number().int().nonnegative(),
    worthReviewing: z.number().int().nonnegative(),
    historical: z.number().int().nonnegative(),
    alreadyTracked: z.number().int().nonnegative()
  })
  .strict()

export const discoverScanConfigSchema = z
  .object({
    scope: z.array(z.string()),
    repoPath: z.string()
  })
  .strict()

export const discoverRunSchema = z
  .object({
    runId: z.string(),
    generatedAt: z.string(),
    scanConfig: discoverScanConfigSchema,
    sourcesSummary: z.array(sourceSummarySchema),
    counts: discoverCountsSchema,
    candidates: z.array(discoverCandidateSchema),
    alreadyTracked: z.array(z.string()),
    orphanSignals: z.array(orphanSignalSchema),
    relationships: z.array(discoverRelationshipSchema)
  })
  .strict()
