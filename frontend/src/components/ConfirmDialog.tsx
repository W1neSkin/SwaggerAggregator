/**
 * Reusable confirmation dialog component.
 * Renders a modal overlay with title, message, and Cancel/Confirm buttons.
 * Use instead of browser's native confirm() for consistent styling.
 */

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  /** If true, the confirm button is styled red (for delete actions) */
  isDestructive?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  isDestructive = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Dialog card */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{message}</p>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              isDestructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
