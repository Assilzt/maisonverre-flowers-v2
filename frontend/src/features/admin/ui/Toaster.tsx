import { CheckCircle2, Info, XCircle } from "lucide-react";
import { dismissToast, useUi } from "./store";

/** iOS-style floating messages, with "تراجع" when an action can be undone. */
export function Toaster() {
  const { toasts } = useUi();
  if (!toasts.length) return null;
  return (
    <div className="ops-toasts" role="status" aria-live="polite">
      {toasts.map(item => (
        <div key={item.id} className={"ops-toast " + item.tone}>
          {item.tone === "error" ? (
            <XCircle size={18} />
          ) : item.tone === "info" ? (
            <Info size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{item.text}</span>
          {item.undo && (
            <button
              type="button"
              onClick={() => {
                item.undo?.();
                dismissToast(item.id);
              }}
            >
              تراجع
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
