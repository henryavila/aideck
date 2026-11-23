import { ref } from 'vue'

export type Locale = 'en' | 'pt-BR'

const en = {
  'frame.live': 'live',
  'frame.stale': 'stale',
  'frame.retry': '× retry',
  'frame.loadFailed': 'Failed to load.',
  'frame.noData': 'no data',
  'progress.empty': 'no rows to chart',
  'progress.weightedAvg': 'weighted avg',
  'progress.ratio': '{value} of {max} {unit}',
  'progress.defaultUnit': 'items',
  'progress.defaultLabel': 'Progress',
  'rows.one': '1 rows',
  'rows.other': '{count} rows',
  'table.zeroRows': '0 rows',
  'table.sourcePrefix': 'source ·',
  'connection.live': 'live',
  'connection.offline': 'offline',
} as const

export type MessageKey = keyof typeof en

const ptBR: Record<MessageKey, string> = {
  'frame.live': 'ao vivo',
  'frame.stale': 'desatualizado',
  'frame.retry': '× tentar de novo',
  'frame.loadFailed': 'Falha ao carregar.',
  'frame.noData': 'sem dados',
  'progress.empty': 'sem linhas para exibir',
  'progress.weightedAvg': 'média ponderada',
  'progress.ratio': '{value} de {max} {unit}',
  'progress.defaultUnit': 'itens',
  'progress.defaultLabel': 'Progresso',
  'rows.one': '1 linha',
  'rows.other': '{count} linhas',
  'table.zeroRows': '0 linhas',
  'table.sourcePrefix': 'fonte ·',
  'connection.live': 'conectado',
  'connection.offline': 'desconectado',
}

export const messages: Record<Locale, Record<MessageKey, string>> = { en, 'pt-BR': ptBR }

export const activeLocale = ref<Locale>('en')

export type MessageParams = Record<string, string | number>

export function useT(): { t: (key: MessageKey, params?: MessageParams) => string } {
  function t(key: MessageKey, params?: MessageParams): string {
    const template = messages[activeLocale.value][key]
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    )
  }
  return { t }
}
