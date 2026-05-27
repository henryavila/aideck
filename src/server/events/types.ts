import type {
  Annotation,
  ErrorResponse,
  Highlight,
  IsoTimestamp
} from '../../schemas/common.js'
import type { Initiative, Plan } from '../../schemas/project-status.js'

export type EntityKind = 'plan' | 'initiative' | 'discover-run'
export type ChangeType = 'add' | 'change' | 'unlink'

export interface BaseEvent {
  id: number
  emittedAt: IsoTimestamp
}

export interface StateChangeEvent extends BaseEvent {
  kind: 'state-change'
  consumer: string
  slug: string
  entityKind: EntityKind
  changeType: ChangeType
  entity?: Plan | Initiative
  projectId?: string
}

export interface AnnotationAddedEvent extends BaseEvent {
  kind: 'annotation-added'
  consumer: string
  annotation: Annotation
  projectId?: string
}

export interface HighlightAddedEvent extends BaseEvent {
  kind: 'highlight-added'
  consumer: string
  highlight: Highlight
  projectId?: string
}

export interface ParseErrorEvent extends BaseEvent {
  kind: 'error'
  consumer?: string
  path: string
  code: ErrorResponse['code']
  message: string
  suggestion?: string
  projectId?: string
}

export interface HealthTickEvent extends BaseEvent {
  kind: 'health-tick'
  uptimeMs: number
}

export interface DataChangedEvent extends BaseEvent {
  kind: 'data_changed'
  consumer: string
  payload: {
    file: string
    dataSourceHint: string
  }
}

export interface ConsumerManifestChangedEvent extends BaseEvent {
  kind: 'consumer_manifest_changed'
  consumer: string
  changeType: 'add' | 'change' | 'unlink'
}

export type RuntimeEvent =
  | StateChangeEvent
  | AnnotationAddedEvent
  | HighlightAddedEvent
  | ParseErrorEvent
  | HealthTickEvent
  | DataChangedEvent
  | ConsumerManifestChangedEvent

export type RuntimeEventKind = RuntimeEvent['kind']
