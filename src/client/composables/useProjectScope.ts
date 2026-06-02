import type { InjectionKey, Ref } from 'vue'

/**
 * The currently-selected projectId for a consumer that has `root: 'project'`
 * dataSources. ConsumerPage provides it; WidgetRenderer injects it and passes
 * it to fetchDataSource so widgets read the project-scoped endpoint. Undefined
 * means "no project selected yet" (or a consumer-dir-only consumer).
 */
export const PROJECT_ID_KEY: InjectionKey<Ref<string | undefined>> = Symbol('aideck:projectId')
