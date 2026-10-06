import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import "./Notice.css";

export type NoticeKind = "info" | "success" | "error";
export type Notify = (message: string, kind?: NoticeKind) => void;

interface Notice {
  id: number;
  message: string;
  kind: NoticeKind;
}

/** How long a notice stays before it dismisses itself. */
export const NOTICE_TIMEOUT_MS = 6000;

const NotifyContext = createContext<Notify | null>(null);

/** Shows notices (toasts) raised anywhere below it with `useNotify()`. */
export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setNotices((list) => list.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback<Notify>(
    (message, kind = "info") => {
      const id = nextId.current++;
      setNotices((list) => [...list, { id, message, kind }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), NOTICE_TIMEOUT_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <div className="notices" aria-live="polite">
        {notices.map((n) => (
          <div key={n.id} className={`notice notice--${n.kind}`} role={n.kind === "error" ? "alert" : "status"}>
            <span className="notice__message">{n.message}</span>
            <button
              type="button"
              className="notice__close"
              aria-label="Dismiss notice"
              onClick={() => dismiss(n.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotifyContext.Provider>
  );
}

/** `notify(message, kind)` shows a notice; kind defaults to "info". Needs a `NoticeProvider` above. */
export function useNotify(): Notify {
  const notify = useContext(NotifyContext);
  if (!notify) throw new Error("useNotify must be used inside <NoticeProvider>");
  return notify;
}
