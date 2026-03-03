/**
 * useUndoDelete.js
 *
 * Drop-in replacement for instant deletes.
 * Shows a 5-second Sonner toast with an "Undo" action.
 * The actual delete only fires after the timer expires.
 * If the user clicks Undo the delete is cancelled entirely.
 *
 * Usage:
 *   const { deleteWithUndo } = useUndoDelete();
 *   // replace: await base44.entities.SavedItem.delete(item.id)
 *   // with:
 *   deleteWithUndo({
 *     label: item.title,
 *     onConfirm: () => base44.entities.SavedItem.delete(item.id),
 *     onUndo:    () => queryClient.invalidateQueries({ queryKey: ["savedItems"] }),
 *   });
 */
import { useRef, useCallback } from "react";
import { toast } from "sonner";

export function useUndoDelete() {
  // Map of toastId → timeout handle so we can cancel on Undo
  const timers = useRef({});

  const deleteWithUndo = useCallback(
    ({ label = "item", onConfirm, onUndo, duration = 5000 } = {}) => {
      const toastId = `undo-delete-${Date.now()}-${Math.random()}`;

      // Schedule the real delete
      const handle = setTimeout(async () => {
        delete timers.current[toastId];
        try {
          await onConfirm?.();
        } catch (err) {
          console.error("[useUndoDelete] Delete failed:", err);
          toast.error(`Could not delete "${label}". Please try again.`);
          onUndo?.(); // Restore optimistic state on failure
        }
      }, duration);

      timers.current[toastId] = handle;

      toast(`"${label?.slice(0, 50)}" deleted`, {
        id: toastId,
        duration,
        action: {
          label: "Undo",
          onClick: () => {
            const t = timers.current[toastId];
            if (t) {
              clearTimeout(t);
              delete timers.current[toastId];
            }
            onUndo?.();
            toast.success("Delete cancelled", { duration: 2000 });
          },
        },
        // Visually distinct delete toast
        style: {
          background: "#1A1D27",
          border: "1px solid #2A2D3A",
          color: "#E8E8ED",
        },
        actionButtonStyle: {
          background: "linear-gradient(135deg, #00BFFF, #9370DB)",
          color: "#fff",
          fontWeight: "700",
          border: "none",
          borderRadius: "6px",
          padding: "4px 12px",
          fontSize: "12px",
          cursor: "pointer",
        },
      });

      return toastId;
    },
    []
  );

  return { deleteWithUndo };
}
