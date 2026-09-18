"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/admin/crud";
import { Btn } from "@/components/admin/ui";

/**
 * "Are you sure?" for any button that changes something: approve, reject,
 * verify, mark paid, cancel. One click on a row must never do those on its
 * own — a mis-tap in a long table approved a hospital.
 *
 *   const confirm = useConfirm();
 *   onClick={async () => {
 *     if (await confirm({ title: t("approveTitle"), description: …, confirmLabel: t("approve") })) void approve(h);
 *   }}
 *
 * One dialog for the whole app, mounted in Providers, so a page needs no
 * state or JSX of its own for it. `tone: "danger"` for the destructive ones
 * (reject, cancel) — the confirm button turns red.
 */

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  /** The confirm button's words — "Approve", "Reject". Defaults to "Confirm". */
  confirmLabel?: string;
  tone?: "primary" | "danger";
};

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("crud");
  const tc = useTranslations("common");
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  // The promise the open dialog will settle. A ref, not state: settling it is
  // a side effect of closing, not something to render.
  const settle = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback<Ask>(next => {
    // A second ask while one is open answers the first with "no" rather than
    // leaving its caller waiting forever.
    settle.current?.(false);
    setOptions(next);
    return new Promise<boolean>(resolve => { settle.current = resolve; });
  }, []);

  const close = (ok: boolean) => {
    settle.current?.(ok);
    settle.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <Modal
        open={!!options}
        onClose={() => close(false)}
        title={options?.title ?? t("areYouSure")}
        size="sm"
        footer={
          <>
            <Btn variant="outline" onClick={() => close(false)}>{tc("cancel")}</Btn>
            <Btn variant={options?.tone === "danger" ? "danger" : "primary"} onClick={() => close(true)}>
              {options?.confirmLabel ?? t("confirm")}
            </Btn>
          </>
        }
      >
        {options?.description && <div className="text-sm text-muted-foreground">{options.description}</div>}
      </Modal>
    </ConfirmContext.Provider>
  );
};

/** Ask before acting. Resolves true on confirm, false on cancel or close. */
export const useConfirm = (): Ask => {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error("useConfirm must be used inside <ConfirmProvider> (components/providers.tsx).");
  return ask;
};

/**
 * The short form for a row's action button: the button's own label is the
 * question and the confirm button, so no page needs new text for it.
 *
 *   const confirmAction = useConfirmAction();
 *   if (!(await confirmAction(t("markPaid"), { name: invoice.number }))) return;
 *
 * "Mark paid: INV-0042?" with "Mark paid" on the confirm button. `danger` for
 * reject, delete, void and cancel.
 */
export const useConfirmAction = () => {
  const ask = useConfirm();
  const t = useTranslations("common");
  return (action: string, options: { name?: string | null; danger?: boolean; description?: ReactNode } = {}) =>
    ask({
      title: options.name ? t("confirmTitleFor", { action, name: options.name }) : t("confirmTitle", { action }),
      description: options.description ?? t("confirmBody"),
      confirmLabel: action,
      tone: options.danger ? "danger" : "primary",
    });
};
