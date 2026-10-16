/** Native modal focus, background inertness and focus restoration. Components
 * own cancellation so closing also clears their Svelte open state. */
export function modalDialog(dialog: HTMLDialogElement) {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  // A keyboard-opened dialog must be usable while walkthrough has captured the
  // mouse. The viewer's existing unlock handler ends that walkthrough session.
  if (document.pointerLockElement) document.exitPointerLock();
  dialog.showModal();
  function onKeydown(event: KeyboardEvent) {
    // WebKit may interpret Backspace on a button as browser Back. A modal must
    // retain the current document while text fields keep native deletion/undo.
    if (event.key === 'Backspace') {
      const target = event.target;
      const editable = target instanceof HTMLElement && (target.isContentEditable ||
        (target instanceof HTMLTextAreaElement && !target.readOnly && !target.disabled) ||
        (target instanceof HTMLInputElement && !target.readOnly && !target.disabled &&
          !['button', 'checkbox', 'radio', 'submit', 'reset', 'image', 'range', 'color', 'file', 'hidden'].includes(target.type)));
      if (!editable) event.preventDefault();
      return;
    }
    if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return;
    // Safari's keyboard preference may otherwise skip buttons and leave the
    // document. Keep the dialog controls reachable in either direction.
    const controls = [...dialog.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, a[href], [tabindex], [contenteditable="true"]',
    )].filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') && element.getClientRects().length > 0);
    if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
    const index = controls.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey ? (index <= 0 ? controls.length - 1 : index - 1) : (index + 1) % controls.length;
    event.preventDefault(); controls[next].focus();
  }
  dialog.addEventListener('keydown', onKeydown);
  return { destroy: () => {
    dialog.removeEventListener('keydown', onKeydown);
    dialog.close();
    // Conditional blocks may already have detached the dialog during teardown.
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  } };
}

/** Browsers honour preventDefault() on a modal's Escape `cancel` only while the page has
 * user activation, so a second Escape closes even a dialog that refuses to close. Use as
 * the dialog's `close` handler: a dialog the browser closed while it is still in the
 * document is shown again while `keep` holds (a running operation), otherwise the close
 * is reported so its owner's open state follows the page. Closes from unmounting are ignored. */
export function reconcileNativeClose(event: Event, keep: boolean, onclose?: () => void): void {
  const dialog = event.currentTarget as HTMLDialogElement;
  if (!dialog.isConnected || dialog.open) return;
  if (keep) dialog.showModal();
  else onclose?.();
}

/** Inert background elements still have window/document keyboard listeners.
 * Check before handling editor shortcuts, including capture-phase listeners. */
export function hasOpenModal(): boolean {
  return typeof document !== 'undefined' && document.querySelector('dialog[open]') !== null;
}

/** Non-modal popups close themselves on Escape, so editor-wide Escape handlers that run
 * first (window capture) leave the key to them: a menu marked `data-popup="menu"` closes
 * on any Escape while open, any other `data-popup` element when the key comes from inside it. */
export function popupOwnsEscape(target: EventTarget | null): boolean {
  if (typeof document === 'undefined') return false;
  if (document.querySelector('[data-popup="menu"]') !== null) return true;
  return !!(target as Element | null)?.closest?.('[data-popup]');
}
