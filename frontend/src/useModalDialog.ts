import { useEffect, useRef } from "react";

/**
 * Shows a native `<dialog>` as a modal while the component is mounted.
 *
 * - `showModal()` traps focus and makes the page behind inert (falls back to the `open` attribute where
 *   `showModal` is missing, e.g. jsdom).
 * - Focus moves to the element marked `data-autofocus` (else the first focusable one) on open and back
 *   to the opener on close.
 * - Escape calls `onClose` instead of letting the browser close the dialog behind React's back.
 */
export function useModalDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    const first =
      dialog.querySelector<HTMLElement>("[data-autofocus]") ??
      dialog.querySelector<HTMLElement>("input, select, textarea, button");
    first?.focus();

    function handleCancel(event: Event) {
      event.preventDefault();
      onCloseRef.current();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    }
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("keydown", handleKeyDown);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("keydown", handleKeyDown);
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      else dialog.removeAttribute("open");
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return ref;
}
