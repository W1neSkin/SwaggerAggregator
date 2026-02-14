/**
 * Reusable error message component.
 * Shows a red alert box with optional retry button.
 */

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 px-3 py-1 text-sm text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
