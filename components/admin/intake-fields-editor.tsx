"use client";

import { useMemo, useState } from "react";
import { FieldType } from "@/lib/db/types";

type ValidationPreset = "none" | "email" | "phone" | "required_text" | "optional_text";
type Width = "full" | "half";

type FieldDraft = {
  id: string;
  field_name: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  options: string[] | null;
  placeholder: string | null;
  help_text?: string | null;
  default_value?: string | null;
  width?: Width;
  validation_rule?: string | null;
};

export type EditableField = Omit<FieldDraft, "id">;

type PresetDefinition = {
  id: string;
  name: string;
  description: string;
  defaults: Omit<FieldDraft, "id">;
};

const CUSTOM_FIELD_TYPES: Array<{ value: FieldType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" }
];

const COMMON_PRESETS: PresetDefinition[] = [
  preset("first_name", "First name", "First name", "Enter your first name", "text", "required_text"),
  preset("last_name", "Last name", "Last name", "Enter your last name", "text", "required_text"),
  preset("full_name", "Full name", "Full name", "Enter your full name", "text", "required_text"),
  preset("email", "Email", "Work email", "name@company.com", "email", "email"),
  preset("phone", "Phone", "Phone number", "+1 555 123 4567", "phone", "phone"),
  preset("company", "Company", "Company", "Your company", "text", "optional_text"),
  preset("title", "Job title", "Job title", "e.g. Head of Product", "text", "optional_text"),
  preset("telegram", "Telegram", "Telegram handle", "@username", "text", "optional_text")
];

const VALIDATION_LABELS: Record<ValidationPreset, string> = {
  none: "None",
  email: "Email",
  phone: "Phone",
  required_text: "Required text",
  optional_text: "Optional text"
};

function preset(
  field_name: string,
  name: string,
  label: string,
  placeholder: string,
  field_type: FieldType,
  validation: ValidationPreset
): PresetDefinition {
  return {
    id: field_name,
    name,
    description: `Common ${name.toLowerCase()} field`,
    defaults: {
      field_name,
      label,
      field_type,
      is_required: validation === "required_text" || validation === "email" || validation === "phone",
      options: null,
      placeholder,
      help_text: null,
      default_value: null,
      width: "half",
      validation_rule: toValidationRule(validation)
    }
  };
}

function toValidationPreset(field: EditableField): ValidationPreset {
  if (field.validation_rule === "preset:email") return "email";
  if (field.validation_rule === "preset:phone") return "phone";
  if (field.validation_rule === "preset:required_text") return "required_text";
  if (field.validation_rule === "preset:optional_text") return "optional_text";
  return "none";
}

function toValidationRule(presetValue: ValidationPreset): string | null {
  if (presetValue === "none") return null;
  return `preset:${presetValue}`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCustomField(type: FieldType): FieldDraft {
  return {
    id: createId(),
    field_name: "",
    label: "",
    field_type: type,
    is_required: false,
    options: type === "select" ? ["Option 1", "Option 2"] : null,
    placeholder: type === "checkbox" ? null : "",
    help_text: null,
    default_value: null,
    width: "full",
    validation_rule: null
  };
}

export function IntakeFieldsEditor({ initialFields = [] }: { initialFields?: EditableField[] }) {
  const [fields, setFields] = useState<FieldDraft[]>(
    initialFields.map((field) => ({ ...field, id: createId(), width: field.width ?? "full" }))
  );

  const canAddMore = fields.length < 24;
  const usedPresetKeys = useMemo(() => new Set(fields.map((field) => field.field_name)), [fields]);

  function updateField(id: string, updates: Partial<FieldDraft>) {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...updates } : field)));
  }

  function addPreset(definition: PresetDefinition) {
    setFields((prev) => [...prev, { id: createId(), ...definition.defaults }]);
  }

  function move(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Lead capture fields</h3>
        <p className="text-sm text-muted-foreground">Choose a common field to add it instantly, then edit details only when needed.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add common fields</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_PRESETS.map((presetItem) => (
            <button
              key={presetItem.id}
              type="button"
              className="btn-secondary"
              onClick={() => addPreset(presetItem)}
              title={presetItem.description}
              disabled={!canAddMore || usedPresetKeys.has(presetItem.defaults.field_name)}
            >
              + {presetItem.name}
            </button>
          ))}
        </div>

        <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add custom fields</p>
        <div className="flex flex-wrap gap-2">
          {CUSTOM_FIELD_TYPES.map((fieldType) => (
            <button
              key={fieldType.value}
              type="button"
              className="btn-inline"
              onClick={() => setFields((prev) => [...prev, createCustomField(fieldType.value)])}
              disabled={!canAddMore}
            >
              + {fieldType.label}
            </button>
          ))}
        </div>
      </div>

      <input type="hidden" name="field_count" value={fields.length} />

      {!fields.length ? <p className="text-sm text-muted-foreground">No intake fields yet. Add at least one field so visitors can request access.</p> : null}

      {fields.map((field, index) => {
        const validationPreset = toValidationPreset(field);
        return (
          <div key={field.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{field.label || field.field_name || `Field ${index + 1}`}</p>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-inline" onClick={() => move(index, -1)} disabled={index === 0}>Move up</button>
                <button type="button" className="btn-inline" onClick={() => move(index, 1)} disabled={index === fields.length - 1}>Move down</button>
                <button type="button" className="btn-inline" onClick={() => setFields((prev) => prev.filter((item) => item.id !== field.id))}>Remove field</button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Label</label>
                <input name={`field_${index}_label`} value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} className="w-full" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Internal key</label>
                <input name={`field_${index}_name`} value={field.field_name} onChange={(e) => updateField(field.id, { field_name: e.target.value })} className="w-full" placeholder="auto from label" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Field type</label>
                <select
                  name={`field_${index}_type`}
                  value={field.field_type}
                  onChange={(e) => updateField(field.id, { field_type: e.target.value as FieldType, options: e.target.value === "select" ? field.options ?? ["Option 1", "Option 2"] : null })}
                  className="w-full"
                >
                  <option value="text">text</option>
                  <option value="email">email</option>
                  <option value="phone">phone</option>
                  <option value="textarea">textarea</option>
                  <option value="select">select</option>
                  <option value="checkbox">checkbox</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Validation</label>
                <select
                  name={`field_${index}_validation_rule`}
                  value={validationPreset}
                  className="w-full"
                  onChange={(e) => {
                    const presetValue = e.target.value as ValidationPreset;
                    updateField(field.id, {
                      validation_rule: toValidationRule(presetValue),
                      is_required: presetValue === "required_text" || presetValue === "email" || presetValue === "phone" ? true : presetValue === "optional_text" ? false : field.is_required,
                      field_type: presetValue === "email" ? "email" : presetValue === "phone" ? "phone" : field.field_type
                    });
                  }}
                >
                  {Object.entries(VALIDATION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Placeholder</label>
                <input name={`field_${index}_placeholder`} value={field.placeholder ?? ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} className="w-full" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Default value</label>
                <input name={`field_${index}_default_value`} value={field.default_value ?? ""} onChange={(e) => updateField(field.id, { default_value: e.target.value })} className="w-full" />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-muted-foreground">Help text</label>
                <input name={`field_${index}_help_text`} value={field.help_text ?? ""} onChange={(e) => updateField(field.id, { help_text: e.target.value })} className="w-full" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Width</label>
                <select name={`field_${index}_width`} value={field.width ?? "full"} onChange={(e) => updateField(field.id, { width: e.target.value as Width })} className="w-full">
                  <option value="full">full</option>
                  <option value="half">half</option>
                </select>
              </div>

              {field.field_type === "select" ? (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-muted-foreground">Dropdown options (one per line)</label>
                  <textarea
                    name={`field_${index}_options`}
                    rows={3}
                    className="w-full"
                    value={(field.options ?? []).join("\n")}
                    onChange={(e) => updateField(field.id, { options: e.target.value.split("\n") })}
                  />
                </div>
              ) : (
                <input type="hidden" name={`field_${index}_options`} value="" />
              )}
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name={`field_${index}_required`}
                checked={field.is_required}
                onChange={(e) => updateField(field.id, { is_required: e.target.checked })}
              />
              Required
            </label>
          </div>
        );
      })}
    </div>
  );
}
