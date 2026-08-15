/**
 * What the library puts on the drag, and the canvas reads back off the drop.
 *
 * A custom type rather than `text/plain`: dragging text from anywhere else on
 * the page then cannot be mistaken for a library item.
 */
export const LIBRARY_ITEM_MIME = 'application/x-csocflow-item'
