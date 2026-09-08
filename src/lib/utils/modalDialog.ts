/** Native modal focus, background inertness and focus restoration. Components
 * own cancellation so closing also clears their Svelte open state. */
export function modalDialog(dialog: HTMLDialogElement) {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  // A keyboard-opened dialog must be usable while walkthrough has captured the
  // mouse. The viewer's existing unlock handler ends that walkthrough session.
  if (document.pointerLockElement) document.exitPointerLock();
  dialog.showModal();
  function onKeydown(event: KeyboardEvent) {
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

/** Inert background elements still have window/document keyboard listeners.
 * Check before handling editor shortcuts, including capture-phase listeners. */
export function hasOpenModal(): boolean {
  return typeof document !== 'undefined' && document.querySelector('dialog[open]') !== null;
}
