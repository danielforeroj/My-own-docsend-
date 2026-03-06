import { FieldType } from "@/lib/db/types";

const FIELD_TYPES: FieldType[] = ["text", "email", "phone", "textarea", "select", "checkbox"];

export type EditableField = {
  field_name: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  options: string[] | null;
  placeholder: string | null;
};

export function IntakeFieldsEditor({ initialFields = [] }: { initialFields?: EditableField[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Configure up to 6 fields. Leave name/label blank to skip a row.</p>
      {Array.from({ length: 6 }, (_, index) => {
        const existing = initialFields[index];

        return (
          <div key={index} className="grid gap-2 rounded border border-slate-200 p-3 md:grid-cols-6">
            <input name={`field_${index}_name`} placeholder="field_name" defaultValue={existing?.field_name ?? ""} />
            <input name={`field_${index}_label`} placeholder="Label" defaultValue={existing?.label ?? ""} />
            <select name={`field_${index}_type`} defaultValue={existing?.field_type ?? "text"}>
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              name={`field_${index}_placeholder`}
              placeholder="Placeholder"
              defaultValue={existing?.placeholder ?? ""}
            />
            <input
              name={`field_${index}_options`}
              placeholder="select options: a,b,c"
              defaultValue={existing?.options?.join(",") ?? ""}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={`field_${index}_required`} defaultChecked={existing?.is_required ?? false} /> Required
            </label>
          </div>
        );
      })}
    </div>
  );
}
