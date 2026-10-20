const STYLE_ID = 'pointing-bubble-styles'

const CSS = `:where(.pointing-bubble__inner) {
  box-sizing: border-box;
  width: var(--pb-width, max-content);
  max-width: var(--pb-max-width, none);
  padding: var(--pb-padding);
  background: white;
  border: 2px solid gray;
  border-radius: 8px;
}`

export const SHADOW = 'drop-shadow(0 6px 8px rgba(0, 0, 0, 0.25))'

/** Inject default zero-specificity box styles once per document. */
export function injectBubbleStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return
  const style = doc.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  doc.head.prepend(style)
}
