import type {
  Annotation,
  ErrorResponse,
  Highlight,
  IsoTimestamp
} from '../../schemas/common.js'

export interface BaseEvent {
  id: number
  emittedAt: IsoTimestamp
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
  projectId?: string
  payload: {
    file: string
    /** Path within a consumer's `data/` dir (consumer-watcher). */
    dataSourceHint?: string
    /** The manifest dataSource id whose glob the changed file matched
     *  (project-tree watcher). */
    dataSourceId?: string
  }
}

export interface ConsumerManifestChangedEvent extends BaseEvent {
  kind: 'consumer_manifest_changed'
  consumer: string
  changeType: 'add' | 'change' | 'unlink'
}

export type RuntimeEvent =
  | AnnotationAddedEvent
  | HighlightAddedEvent
  | ParseErrorEvent
  | HealthTickEvent
  | DataChangedEvent
  | ConsumerManifestChangedEvent

export type RuntimeEventKind = RuntimeEvent['kind']
