"use client";

import { useFormState } from "react-dom";
import {
  createEmployeeUserActionState,
  createSpaceActionState,
  updateDocumentLandingActionState,
  updateDocumentVisibilityActionState,
  updateSpaceActionState,
  updateSpaceLandingActionState,
  updateSpaceVisibilityActionState
} from "@/app/admin/actions";
import { SlugField } from "@/components/admin/slug-field";
import { FormFieldError, type ActionFormState } from "@/components/ui/server-action-form";
import { SubmitButton } from "@/components/ui/submit-button";

function ActionStateMessage({ state }: { state: ActionFormState }) {
  if (!state.message) return null;
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border border-red-400/30 bg-red-500/10 text-red-300"}`}>
      {state.message}
    </p>
  );
}

type LandingConfig = {
  page_title?: string | null;
  short_description?: string | null;
  eyebrow?: string | null;
  hero_image_url?: string | null;
  logo_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  sidebar_info?: string | null;
  disclaimer?: string | null;
  highlights?: string[];
  about?: string | null;
  footer_text?: string | null;
  layout_variant?: string;
  show_disclaimer?: boolean;
  show_sidebar?: boolean;
  show_about?: boolean;
  show_highlights?: boolean;
  viewer_mode?: "deck" | "document";
  viewer_page_count?: number;
};

function LandingFields({ landing }: { landing: LandingConfig }) {
  return (
    <>
      <div className="space-y-1 md:col-span-2"><label className="label">Page title</label><input name="landing_page_title" defaultValue={landing.page_title ?? ""} className="w-full" /></div>
      <div className="space-y-1 md:col-span-2"><label className="label">Short description</label><textarea name="landing_short_description" rows={3} defaultValue={landing.short_description ?? ""} className="w-full" /></div>
      <div className="space-y-1"><label className="label">Eyebrow</label><input name="landing_eyebrow" defaultValue={landing.eyebrow ?? ""} className="w-full" /></div>
      <div className="space-y-1"><label className="label">Layout variant</label><select name="landing_layout_variant" defaultValue={landing.layout_variant ?? "centered_hero"} className="w-full"><option value="centered_hero">centered hero</option><option value="split_hero">split hero</option><option value="minimal_header">minimal header</option><option value="content_first">content first</option><option value="sidebar_layout">sidebar layout</option></select></div>
      <div className="space-y-1"><label className="label">Hero image URL</label><input name="landing_hero_image" defaultValue={landing.hero_image_url ?? ""} className="w-full" /></div>
      <div className="space-y-1"><label className="label">Logo URL</label><input name="landing_logo" defaultValue={landing.logo_url ?? ""} className="w-full" /></div>
      <div className="space-y-1"><label className="label">CTA label</label><input name="landing_cta_label" defaultValue={landing.cta_label ?? ""} className="w-full" /></div>
      <div className="space-y-1"><label className="label">CTA URL</label><input name="landing_cta_url" defaultValue={landing.cta_url ?? ""} className="w-full" /></div>
      <div className="space-y-1 md:col-span-2"><label className="label">Sidebar info</label><textarea name="landing_sidebar_info" rows={2} defaultValue={landing.sidebar_info ?? ""} className="w-full" /></div>
      <div className="space-y-1 md:col-span-2"><label className="label">Disclaimer</label><textarea name="landing_disclaimer" rows={2} defaultValue={landing.disclaimer ?? ""} className="w-full" /></div>
      <div className="space-y-1 md:col-span-2"><label className="label">Highlights (one per line)</label><textarea name="landing_highlights" rows={3} defaultValue={(landing.highlights ?? []).join("\n")} className="w-full" /></div>
      <div className="space-y-1 md:col-span-2"><label className="label">About section</label><textarea name="landing_about" rows={3} defaultValue={landing.about ?? ""} className="w-full" /></div>
      <div className="space-y-1 md:col-span-2"><label className="label">Footer text</label><input name="landing_footer_text" defaultValue={landing.footer_text ?? ""} className="w-full" /></div>

      <div className="flex flex-wrap gap-4 md:col-span-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="landing_show_disclaimer" defaultChecked={landing.show_disclaimer ?? false} /> Show disclaimer</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="landing_show_sidebar" defaultChecked={landing.show_sidebar ?? false} /> Show sidebar</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="landing_show_about" defaultChecked={landing.show_about ?? false} /> Show about</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="landing_show_highlights" defaultChecked={landing.show_highlights ?? false} /> Show highlights</label>
      </div>
    </>
  );
}

export function CreateEmployeeUserForm() {
  const [state, formAction] = useFormState(createEmployeeUserActionState, { ok: false });

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1 md:col-span-2">
        <label className="label">Full name</label>
        <input name="full_name" type="text" className="w-full" required />
        <FormFieldError state={state} name="full_name" />
      </div>
      <div className="space-y-1">
        <label className="label">Email</label>
        <input name="email" type="email" className="w-full" required />
        <FormFieldError state={state} name="email" />
      </div>
      <div className="space-y-1">
        <label className="label">Temporary password</label>
        <input name="password" type="password" minLength={8} className="w-full" required />
        <FormFieldError state={state} name="password" />
      </div>
      <div className="space-y-1 md:col-span-2">
        <label className="label">Role</label>
        <select name="role" defaultValue="admin" className="w-full">
          <option value="admin">Admin</option>
          <option value="super_admin">Super admin</option>
        </select>
      </div>
      <ActionStateMessage state={state} />
      <SubmitButton className="btn-primary md:col-span-2" idleLabel="Create user" pendingLabel="Creating user..." />
    </form>
  );
}

export function CreateSpaceForm({ documents, documentsError }: { documents: Array<{ id: string; title: string }>; documentsError: string | null }) {
  const [state, formAction] = useFormState(createSpaceActionState, { ok: false });

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <SlugField sourceName="name" sourceLabel="Name" slugName="public_slug" slugLabel="Public URL slug" routePrefix="/sp" namespace="space" />
      <FormFieldError state={state} name="name" />
      <FormFieldError state={state} name="public_slug" />

      <div className="space-y-2">
        <label className="block text-sm font-medium">Description</label>
        <textarea name="description" className="w-full" rows={4} />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Documents in this space</label>
        <div className="space-y-2">
          {documents.map((document) => (
            <label key={document.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="document_ids" value={document.id} /> {document.title}
            </label>
          ))}
          {documentsError ? <p className="text-sm text-red-300">Could not load documents: {documentsError}</p> : null}
          {!documents.length && !documentsError ? <p className="text-sm text-muted-foreground">No documents uploaded yet.</p> : null}
        </div>
      </div>
      <FormFieldError state={state} name="document_ids" />
      <ActionStateMessage state={state} />
      <SubmitButton className="btn-primary" idleLabel="Create space" pendingLabel="Creating space..." />
    </form>
  );
}

export function EditSpaceForm({
  space,
  documents,
  selectedDocumentIds
}: {
  space: { id: string; name: string; description: string | null; is_active: boolean; public_slug: string | null };
  documents: Array<{ id: string; title: string }>;
  selectedDocumentIds: string[];
}) {
  const action = updateSpaceActionState.bind(null, space.id);
  const [state, formAction] = useFormState(action, { ok: false });
  const selectedIds = new Set(selectedDocumentIds);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <SlugField
        sourceName="name"
        sourceLabel="Name"
        sourceInitial={space.name}
        slugName="public_slug"
        slugInitial={space.public_slug ?? ""}
        slugLabel="Public URL slug"
        routePrefix="/sp"
        namespace="space"
        excludeId={space.id}
      />
      <FormFieldError state={state} name="name" />
      <FormFieldError state={state} name="public_slug" />

      <div className="space-y-2">
        <label className="block text-sm font-medium">Description</label>
        <textarea name="description" defaultValue={space.description ?? ""} className="w-full" rows={4} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={space.is_active} /> Active
      </label>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Documents in this space</label>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents found. Upload documents first from the documents library.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((document) => (
              <label key={document.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="document_ids" value={document.id} defaultChecked={selectedIds.has(document.id)} />
                {document.title}
              </label>
            ))}
          </div>
        )}
      </div>
      <FormFieldError state={state} name="document_ids" />
      <ActionStateMessage state={state} />
      <SubmitButton className="btn-primary" idleLabel="Save changes" pendingLabel="Saving changes..." />
    </form>
  );
}

export function DocumentVisibilityForm({
  document,
  landing
}: {
  document: { id: string; title: string; visibility: string; public_slug: string | null; show_in_catalog: boolean; is_featured: boolean };
  landing: LandingConfig;
}) {
  const action = updateDocumentVisibilityActionState.bind(null, document.id);
  const [state, formAction] = useFormState(action, { ok: false });

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1">
        <label className="label">Visibility</label>
        <select name="visibility" defaultValue={document.visibility} className="w-full">
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      </div>
      <div className="space-y-1">
        <SlugField slugName="public_slug" slugInitial={document.public_slug ?? ""} sourceInitial={document.title} slugLabel="Public URL slug" routePrefix="/d" namespace="document" excludeId={document.id} />
      </div>
      <div className="space-y-1">
        <label className="label">Viewer mode</label>
        <select name="viewer_mode" defaultValue={landing.viewer_mode ?? "document"} className="w-full">
          <option value="document">Document (scroll)</option>
          <option value="deck">Deck (slide-by-slide)</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="label">Viewer page count (for deck mode)</label>
        <input type="number" min={1} max={300} name="viewer_page_count" defaultValue={landing.viewer_page_count ?? 12} className="w-full" />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_in_catalog" defaultChecked={document.show_in_catalog} /> Show in homepage public catalog</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={document.is_featured} /> Featured</label>
      <FormFieldError state={state} name="public_slug" />
      <ActionStateMessage state={state} />
      <SubmitButton className="btn-primary md:col-span-2" idleLabel="Update visibility" pendingLabel="Updating visibility..." />
    </form>
  );
}

export function DocumentLandingForm({ documentId, landing }: { documentId: string; landing: LandingConfig }) {
  const action = updateDocumentLandingActionState.bind(null, documentId);
  const [state, formAction] = useFormState(action, { ok: false });

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <LandingFields landing={landing} />
      <ActionStateMessage state={state} />
      <SubmitButton className="btn-primary md:col-span-2" idleLabel="Update landing page" pendingLabel="Updating landing page..." />
    </form>
  );
}

export function SpaceVisibilityForm({
  space
}: {
  space: { id: string; name: string; visibility: string; public_slug: string | null; show_in_catalog: boolean; is_featured: boolean };
}) {
  const action = updateSpaceVisibilityActionState.bind(null, space.id);
  const [state, formAction] = useFormState(action, { ok: false });

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1">
        <label className="label">Visibility</label>
        <select name="visibility" defaultValue={space.visibility} className="w-full">
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      </div>
      <div className="space-y-1">
        <SlugField slugName="public_slug" slugInitial={space.public_slug ?? ""} sourceInitial={space.name} slugLabel="Public URL slug" routePrefix="/sp" namespace="space" excludeId={space.id} />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_in_catalog" defaultChecked={space.show_in_catalog} /> Show in homepage public catalog</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_featured" defaultChecked={space.is_featured} /> Featured</label>
      <FormFieldError state={state} name="public_slug" />
      <ActionStateMessage state={state} />
      <SubmitButton className="btn-primary md:col-span-2" idleLabel="Update visibility" pendingLabel="Updating visibility..." />
    </form>
  );
}

export function SpaceLandingForm({ spaceId, landing }: { spaceId: string; landing: LandingConfig }) {
  const action = updateSpaceLandingActionState.bind(null, spaceId);
  const [state, formAction] = useFormState(action, { ok: false });

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <LandingFields landing={landing} />
      <ActionStateMessage state={state} />
      <SubmitButton className="btn-primary md:col-span-2" idleLabel="Update landing page" pendingLabel="Updating landing page..." />
    </form>
  );
}
