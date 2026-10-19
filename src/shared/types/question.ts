export interface SourceRef {
  kind: 'markdown' | 'pdf'
  file: string
  heading?: string
  page?: number
  label: string
}

export interface QuestionOption {
  id: string
  text: string
  correct: boolean
  wrongReason?: string
}

export interface Question {
  id: string
  category: string
  domain: 'frontend' | 'backend' | 'shared'
  stemHtml: string
  stemText: string
  options: QuestionOption[]
  explanationHtml: string
  explanationText: string
  explanationNotice?: string
  source: SourceRef
  contentHash: string
}

export interface HandwrittenItem {
  id: string
  title: string
  category: 'javascript'
  questionHtml: string
  answerHtml: string
  source: SourceRef
  order: number
}

export interface CategoryPayload {
  version: string
  category: string
  questions: Question[]
}

export interface HandwrittenPayload {
  version: string
  items: HandwrittenItem[]
}

