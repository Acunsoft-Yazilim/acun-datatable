import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createApp, h, nextTick, type App } from 'vue';
import { renderTable } from '@acunsoft/datatable-dom';
import { DataTable } from '@acunsoft/datatable-react';
import { AcunDataTable } from '@acunsoft/datatable-vue';
import type { DataTable as Table } from '@acunsoft/datatable-core';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Attributes that only wire up one renderer (focus return, React and Vue keys), generated ids, and `checked` (Vue also writes the attribute; the state is compared as a property). */
const IGNORED = new Set(['checked', 'id', 'aria-controls', 'aria-labelledby', 'aria-describedby', 'for', 'data-adt-focus', 'data-row', 'data-edit-key', 'data-lock', 'data-adt-edit-host']);

/** One canonical line per element: tag, sorted attributes, sorted class tokens; text trimmed; comments dropped. */
export function canonical(node: Node, depth = 0): string[] {
  if (node.nodeType === 3) {
    const text = node.textContent!.replace(/\s+/g, ' ').trim();
    return text ? [`${'  '.repeat(depth)}"${text}"`] : [];
  }
  if (node.nodeType !== 1) return [];
  const element = node as Element;
  const attributes = [...element.attributes]
    .filter(attribute => !IGNORED.has(attribute.name))
    .map(attribute => attribute.name === 'class' ? `class="${attribute.value.split(/\s+/).filter(Boolean).sort().join(' ')}"` : `${attribute.name}="${attribute.value}"`)
    .sort();
  const props = element instanceof HTMLInputElement ? [`checked=${element.checked}`, `indeterminate=${element.indeterminate}`] : [];
  return [`${'  '.repeat(depth)}<${element.localName}${[...attributes, ...props].map(part => ` ${part}`).join('')}>`, ...[...element.childNodes].flatMap(child => canonical(child, depth + 1))];
}

export type Renderer = 'dom' | 'react' | 'vue';
export interface Rendered { readonly host: HTMLElement; destroy(): void }

/** Render the same table with one renderer; the options are the names they share. */
export async function render(renderer: Renderer, table: Table<any>, options: Record<string, unknown>): Promise<Rendered> {
  const host = document.body.appendChild(document.createElement('div'));
  if (renderer === 'dom') {
    const rendered = renderTable(host, table, options);
    return { host, destroy: () => { rendered.destroy(); host.remove(); } };
  }
  if (renderer === 'react') {
    let root!: Root;
    act(() => { root = createRoot(host); root.render(createElement(DataTable as never, { table, ...options })); });
    return { host, destroy: () => { act(() => root.unmount()); host.remove(); } };
  }
  const app: App = createApp({ render: () => h(AcunDataTable, { table, ...options }) });
  app.mount(host);
  await nextTick();
  return { host, destroy: () => { app.unmount(); host.remove(); } };
}
