import { FieldType } from "@/lib/db/types";

const FIELD_TYPES: FieldType[] = ["text", "email", "phone", "textarea", "select", "checkbox"];

export type EditableField = {
  field_name: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  options: string[] | null;
  placeholder: string | null;
  help_text?: string | null;
  default_value?: string | null;
  width?: "full" | "half";
  validation_rule?: string | null;
};

export function IntakeFieldsEditor({ initialFields = [] }: { initialFields?: EditableField[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Lead capture fields</h3>
        <p className="text-sm text-muted-foreground">
          Configure up to 6 fields. Leave both key and label empty to skip a row. Row order controls display order.
        </p>
      </div>

      {Array.from({ length: 6 }, (_, index) => {
        const existing = initialFields[index];

        return (
          <div key={index} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Field {index + 1}</p>
              <span className="text-xs text-muted-foreground">display order: {index + 1}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Internal key</label>
                <input
                  name={`field_${index}_name`}
                  placeholder="first_name"
                  defaultValue={existing?.field_name ?? ""}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Label</label>
                <input name={`field_${index}_label`} placeholder="First name" defaultValue={existing?.label ?? ""} className="w-full" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Field type</label>
                <select name={`field_${index}_type`} defaultValue={existing?.field_type ?? "text"} className="w-full">
                  {FIELD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Width</label>
                <select name={`field_${index}_width`} defaultValue={existing?.width ?? "full"} className="w-full">
                  <option value="full">full</option>
                  <option value="half">half</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Placeholder</label>
                <input
                  name={`field_${index}_placeholder`}
                  placeholder="Enter value"
                  defaultValue={existing?.placeholder ?? ""}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Default value</label>
                <input
                  name={`field_${index}_default_value`}
                  placeholder="Optional default"
                  defaultValue={existing?.default_value ?? ""}
                  className="w-full"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-muted-foreground">Help text</label>
                <input
                  name={`field_${index}_help_text`}
                  placeholder="Why we ask this"
                  defaultValue={existing?.help_text ?? ""}
                  className="w-full"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-muted-foreground">Select options (comma-separated)</label>
                <input
                  name={`field_${index}_options`}
                  placeholder="Option A,Option B"
                  defaultValue={existing?.options?.join(",") ?? ""}
                  className="w-full"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-muted-foreground">Validation rule (regex, optional)</label>
                <input
                  name={`field_${index}_validation_rule`}
                  placeholder="^[A-Za-z]+$"
                  defaultValue={existing?.validation_rule ?? ""}
                  className="w-full"
                />
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name={`field_${index}_required`} defaultChecked={existing?.is_required ?? false} /> Required
            </label>
          </div>
        );
      })}
    </div>
  );
}
