/**
 * Discover-run schema — types for the `project-plan discover` pipeline output.
 *
 * A discover-run is a single JSON file produced by the skill after scanning a
 * repo for in-flight work. It contains candidate Plans/Initiatives for the
 * user to approve or reject via the dashboard.
 */

export interface DiscoverEvidence {
  sourceType: string
  sourceId: string
  topicHint: string
  evidenceQuote: string
  candidateCompletion: string
  lastActivity: string
}

export interface ActivityPoint {
  date: string
  count: number
  types: string[]
}

export interface DiscoverCandidate {
  slug: string
  slugAlternatives: string[]
  title: string
  goal: string
  kind: 'plan' | 'initiative'
  bucket: 'strong' | 'worth-reviewing' | 'historical'
  confidence: number
  confidenceBreakdown: Record<string, number>
  started: string
  lastUpdated: string
  activityTimeline: ActivityPoint[]
  branch: string | null
  nextAction: string | null
  rationale: string
  scopePaths: string[]
  signalIds: string[]
  evidence: DiscoverEvidence[]
  contextMarkdown: string
  evidenceExcerpts: string
  previewYaml: string
  draftPath: string
  approved: boolean
  historicalReason?: string
  completionSummary?: string
}

export interface OrphanSignal {
  id: string
  sourceType: string
  sourceId: string
  topicHint: string
  evidenceQuote: string
  lastActivity: string
}

export interface DiscoverRelationship {
  fromSlug: string
  toSlug: string
  kind: 'plan-phase' | 'shared-paths' | 'shared-branch' | 'subtopic'
  sharedIdentifiers: string[]
  strength: number
}

export interface SourceSummary {
  layer: string
  label: string
  signalCount: number
}

export interface DiscoverCounts {
  strong: number
  worthReviewing: number
  historical: number
  alreadyTracked: number
}

export interface DiscoverScanConfig {
  scope: string[]
  repoPath: string
}

export interface DiscoverRun {
  runId: string
  generatedAt: string
  scanConfig: DiscoverScanConfig
  sourcesSummary: SourceSummary[]
  counts: DiscoverCounts
  candidates: DiscoverCandidate[]
  alreadyTracked: string[]
  orphanSignals: OrphanSignal[]
  relationships: DiscoverRelationship[]
}
