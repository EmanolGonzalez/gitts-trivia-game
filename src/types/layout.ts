export type LayoutType = 'default' | 'blank'

export interface LayoutConfig {
  name: string
  component: any
  requiresAuth?: boolean
  meta?: Record<string, any>
}
