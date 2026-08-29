"use client";

import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  // "danger" (default) for anything destructive/irreversible-ish (delete,
  // deactivate, hide) — the muted-red Button variant, deliberately never
  // the bright brand accent, so it reads as a warning. A normal confirm
  // that isn't destructive (e.g. "send this push now") should pass
  // "primary" instead — styling a non-destructive action as "danger" reads
  // as alarming/confusing (2026-08-29 report on the push-send dialog).
  confirmVariant?: "danger" | "primary";
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmVariant = "danger",
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {body && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{body}</p>}
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" fullWidth onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} fullWidth onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
