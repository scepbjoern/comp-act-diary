declare module '@webscopeio/react-textarea-autocomplete' {
  import { Component, CSSProperties } from 'react'

  export interface TriggerType<T> {
    dataProvider: (token: string) => Promise<T[]> | T[]
    component: React.ComponentType<{ entity: T }>
    output: (item: T, trigger?: string) => string
  }

  export interface ReactTextareaAutocompleteProps<T> {
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    loadingComponent: React.ComponentType
    trigger: Record<string, TriggerType<T>>
    className?: string
    style?: CSSProperties
    placeholder?: string
    containerClassName?: string
    dropdownClassName?: string
    listClassName?: string
    itemClassName?: string
    loaderClassName?: string
    minChar?: number
    movePopupAsYouType?: boolean
    boundariesElement?: string | HTMLElement
    textAreaComponent?: React.ComponentType
    renderToBody?: boolean
  }

  export default class ReactTextareaAutocomplete<T = unknown> extends Component<ReactTextareaAutocompleteProps<T>> {}
}
