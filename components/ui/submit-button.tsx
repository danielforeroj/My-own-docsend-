"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  className?: string;
  idleLabel: string;
  pendingLabel?: string;
};

function Spinner() {
  return <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

export function SubmitButton({ className = "btn-primary", idleLabel, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? "Saving..."}
        </>
      ) : (
        idleLabel
      )}
    </button>
  );
}
