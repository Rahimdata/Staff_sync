import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible dialog: Esc and backdrop click close it, page scroll is locked while open,
 * and focus returns to whatever opened it. Children are unmounted when closed, so any
 * form state inside resets automatically.
 *
 * @param {{ open: boolean, title: string, onClose: () => void, width?: number, children: import('react').ReactNode }} props
 */
export default function Modal({ open, title, onClose, width = 480, children }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose; // always call the latest handler without re-running the effect

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) dialogRef.current.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      if (opener && opener.focus) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={dialogRef}
        style={{ maxWidth: width }}
      >
        <header className="modal__head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}