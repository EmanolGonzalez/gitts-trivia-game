declare module 'vue3-roulette' {
  import { DefineComponent } from 'vue'

  export interface RouletteItem {
    id: number
    name: string
    htmlContent: string
    textColor: string
    background: string
  }

  export interface RouletteIndexObject {
    value: number | null
  }

  export interface RouletteProps {
    items: RouletteItem[]
    duration?: number
    firstItemIndex?: RouletteIndexObject
    wheelResultIndex?: RouletteIndexObject
    centeredIndicator?: boolean
    indicatorPosition?: 'top' | 'bottom' | 'left' | 'right'
    size?: number
    displayShadow?: boolean
    displayBorder?: boolean
    easing?: string
    counterClockwise?: boolean
  }

  const Roulette: DefineComponent<RouletteProps>

  export default Roulette
}