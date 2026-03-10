"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/ui/submit-button";

export type ActionFormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export function FormFieldError({ state, name }: { state: ActionFormState; name: string }) {
  const messages = state.fieldErrors?.[name] ?? [];
  if (!messages.length) return null;

  return <p className="text-xs text-red-600 dark:text-red-300">{messages[0]}</p>;
}

export function ServerActionForm({
  action,
  className,
  children,
  idleLabel,
  pendingLabel,
  submitClassName = "btn-primary"
}: {
  action: (prevState: ActionFormState, formData: FormData) => Promise<ActionFormState>;
  className?: string;
  children: React.ReactNode;
  idleLabel: string;
  pendingLabel: string;
  submitClassName?: string;
}) {
  const [state, formAction] = useFormState(action, { ok: false });

  return (
    <form action={formAction} className={className}>
      {children}
      {state.message ? (
        <p className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border border-red-400/30 bg-red-500/10 text-red-300"}`}>
          {state.message}
        </p>
      ) : null}
      <SubmitButton className={submitClassName} idleLabel={idleLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
