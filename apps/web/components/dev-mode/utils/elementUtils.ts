// =============================================================================
// LAZI AI - DevMode Element Utilities
// =============================================================================
// Helper functions for DOM element inspection and manipulation
// =============================================================================

import { SelectedElement, ElementSpec, Point } from '../types/devmode.types';

/**
 * Generate a unique ID for specs, annotations, etc.
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a CSS selector for an element
 */
export function generateSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .split(' ')
        .filter((c) => c && !c.startsWith('_') && !c.includes(':'))
        .slice(0, 2);
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }

    // Add nth-child if needed for specificity
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Detect the semantic type of an element
 */
export function detectElementType(
  element: HTMLElement
): ElementSpec['behaviorType'] {
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role');

  if (tag === 'button' || role === 'button') return 'api-call';
  if (tag === 'a') return 'navigate';
  if (tag === 'input' || tag === 'textarea' || tag === 'select')
    return 'form-field';
  if (tag === 'table' || role === 'table' || role === 'grid')
    return 'data-display';
  if (element.classList.contains('card') || role === 'article')
    return 'data-display';

  return 'custom';
}

/**
 * Get the semantic location of an element on the page
 */
export function getElementLocation(element: HTMLElement): string {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  const verticalPosition =
    rect.top < viewportHeight / 3
      ? 'top'
      : rect.top < (viewportHeight * 2) / 3
        ? 'middle'
        : 'bottom';

  const horizontalPosition =
    rect.left < viewportWidth / 3
      ? 'left'
      : rect.left < (viewportWidth * 2) / 3
        ? 'center'
        : 'right';

  // Try to detect semantic location
  const header = element.closest('header, [role="banner"], nav');
  const sidebar = element.closest('aside, [role="complementary"]');
  const main = element.closest('main, [role="main"]');
  const footer = element.closest('footer, [role="contentinfo"]');
  const modal = element.closest('[role="dialog"], .modal');
  const table = element.closest('table, [role="table"]');

  if (header) return 'Header';
  if (sidebar) return 'Sidebar';
  if (modal) return 'Modal';
  if (table) return 'Table';
  if (footer) return 'Footer';
  if (main) return `Main content - ${verticalPosition} ${horizontalPosition}`;

  return `${verticalPosition} ${horizontalPosition}`;
}

/**
 * Get element label for display
 */
export function getElementLabel(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  const type = element.getAttribute('type');
  const text = element.textContent?.trim().slice(0, 30) || '';
  const ariaLabel = element.getAttribute('aria-label');
  const title = element.getAttribute('title');
  const placeholder = element.getAttribute('placeholder');
  const id = element.id;
  const className = element.className?.toString().split(' ')[0];

  let label = tag;

  if (role) label = role;
  if (tag === 'input' && type) label = `input[${type}]`;
  if (tag === 'button') label = 'button';
  if (tag === 'a') label = 'link';

  const identifier =
    ariaLabel || title || placeholder || text || id || className || '';

  if (identifier) {
    label += ` "${identifier.slice(0, 25)}${identifier.length > 25 ? '...' : ''}"`;
  }

  return label;
}

/**
 * Find the most meaningful interactive element from a target
 */
export function findMeaningfulElement(element: HTMLElement): HTMLElement {
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const role = current.getAttribute('role');

    // Interactive elements
    if (
      tag === 'button' ||
      tag === 'a' ||
      tag === 'input' ||
      tag === 'select' ||
      tag === 'textarea' ||
      role === 'button' ||
      role === 'link' ||
      role === 'menuitem' ||
      role === 'tab' ||
      current.onclick ||
      current.hasAttribute('onclick') ||
      current.classList.contains('cursor-pointer')
    ) {
      return current;
    }

    // Container elements that are likely meaningful
    if (
      tag === 'tr' ||
      tag === 'li' ||
      role === 'row' ||
      role === 'listitem' ||
      current.classList.contains('card') ||
      current.hasAttribute('data-clickable')
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return element;
}

/**
 * Extract SelectedElement data from an HTMLElement
 */
export function extractElementInfo(element: HTMLElement): SelectedElement {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

  // Get parent path
  const parentPath: string[] = [];
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    parentPath.unshift(parent.tagName.toLowerCase());
    parent = parent.parentElement;
  }

  // Get all attributes
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    attributes[attr.name] = attr.value;
  }

  return {
    element,
    selector: generateSelector(element),
    tagName: element.tagName.toLowerCase(),
    className: element.className?.toString() || '',
    id: element.id || '',
    textContent: element.textContent?.trim().slice(0, 200) || '',
    boundingRect: rect,
    computedStyles: {
      display: computedStyle.display,
      position: computedStyle.position,
      color: computedStyle.color,
      backgroundColor: computedStyle.backgroundColor,
      fontSize: computedStyle.fontSize,
      fontWeight: computedStyle.fontWeight,
      padding: computedStyle.padding,
      margin: computedStyle.margin,
      border: computedStyle.border,
      borderRadius: computedStyle.borderRadius,
    },
    parentPath,
    attributes,
  };
}

/**
 * Check if an element is part of the DevMode UI
 */
export function isDevModeElement(element: HTMLElement): boolean {
  return !!element.closest('[data-devmode], [data-devmode-panel], [data-dev-mode-overlay]');
}

/**
 * Get elements at a specific point, excluding DevMode UI
 */
export function getElementsAtPoint(
  x: number,
  y: number
): HTMLElement[] {
  const elements = document.elementsFromPoint(x, y);
  return elements.filter(
    (el) =>
      !isDevModeElement(el as HTMLElement) &&
      el !== document.body &&
      el !== document.documentElement
  ) as HTMLElement[];
}

/**
 * Calculate position for a floating element to stay within viewport
 */
export function calculateSafePosition(
  clickPoint: Point,
  elementWidth: number,
  elementHeight: number,
  padding = 10
): Point {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x = clickPoint.x;
  let y = clickPoint.y;

  // Adjust horizontal position
  if (x + elementWidth + padding > viewportWidth) {
    x = viewportWidth - elementWidth - padding;
  }
  if (x < padding) {
    x = padding;
  }

  // Adjust vertical position
  if (y + elementHeight + padding > viewportHeight) {
    y = viewportHeight - elementHeight - padding;
  }
  if (y < padding) {
    y = padding;
  }

  return { x, y };
}
