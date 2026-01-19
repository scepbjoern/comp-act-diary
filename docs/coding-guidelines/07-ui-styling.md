# UI & Styling

Tailwind CSS mit daisyUI für konsistentes Design.

---

## Stack

| Library | Zweck |
|---------|-------|
| **Tailwind CSS** | Utility-first CSS |
| **daisyUI** | Komponenten (Buttons, Cards, etc.) |
| **@tabler/icons-react** | Icons |

---

## daisyUI Komponenten

### Buttons

```tsx
<button className="btn">Default</button>
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="btn btn-accent">Accent</button>
<button className="btn btn-ghost">Ghost</button>
<button className="btn btn-outline">Outline</button>

{/* Grössen */}
<button className="btn btn-xs">Tiny</button>
<button className="btn btn-sm">Small</button>
<button className="btn btn-md">Normal</button>
<button className="btn btn-lg">Large</button>

{/* Mit Icon */}
<button className="btn btn-primary">
  <IconPlus className="w-4 h-4" />
  Hinzufügen
</button>
```

### Inputs

```tsx
<input className="input input-bordered" placeholder="Text" />
<input className="input input-bordered input-primary" />
<input className="input input-bordered input-error" />

<textarea className="textarea textarea-bordered" />

<select className="select select-bordered">
  <option>Option 1</option>
</select>
```

### Cards

```tsx
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Titel</h2>
    <p>Inhalt</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Action</button>
    </div>
  </div>
</div>
```

### Modals

```tsx
<dialog id="my_modal" className="modal">
  <div className="modal-box">
    <h3 className="font-bold text-lg">Titel</h3>
    <p className="py-4">Inhalt</p>
    <div className="modal-action">
      <form method="dialog">
        <button className="btn">Schliessen</button>
      </form>
    </div>
  </div>
  <form method="dialog" className="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
```

### Loading States

```tsx
{/* Spinner */}
<span className="loading loading-spinner loading-md" />

{/* Skeleton */}
<div className="skeleton h-4 w-full" />
<div className="skeleton h-32 w-full" />
```

---

## Tailwind Utilities

### Layout

```tsx
{/* Flexbox */}
<div className="flex items-center justify-between gap-4">

{/* Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

{/* Container */}
<div className="container mx-auto px-4">
```

### Spacing

```tsx
{/* Padding */}
<div className="p-4">      {/* All sides */}
<div className="px-4 py-2"> {/* Horizontal, Vertical */}

{/* Margin */}
<div className="mt-4 mb-2">
<div className="space-y-4"> {/* Gap between children */}
```

### Responsive

```tsx
{/* Mobile-first */}
<div className="w-full md:w-1/2 lg:w-1/3">

{/* Hide/Show */}
<div className="hidden md:block">  {/* Hide on mobile */}
<div className="block md:hidden">  {/* Show only on mobile */}
```

---

## Icons (Tabler)

```tsx
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconX,
  IconSearch,
  IconSettings,
  IconUser,
} from '@tabler/icons-react'

// Standard Grösse
<IconPlus className="w-5 h-5" />

// In Button
<button className="btn btn-ghost btn-sm">
  <IconSettings className="w-4 h-4" />
</button>

// Mit Text
<span className="flex items-center gap-2">
  <IconUser className="w-4 h-4" />
  Profil
</span>
```

---

## UI-Sprache

Die Benutzeroberfläche ist auf **Deutsch**:

```tsx
// ✅ Korrekt
<button>Speichern</button>
<button>Abbrechen</button>
<span>Keine Einträge gefunden</span>
<span>Wird geladen...</span>

// ❌ Vermeiden
<button>Save</button>
<button>Cancel</button>
```

---

## Formulare: Fehler am Feld

```tsx
<div className="form-control">
  <label className="label">
    <span className="label-text">E-Mail</span>
  </label>
  <input
    type="email"
    className={`input input-bordered ${error ? 'input-error' : ''}`}
    {...register('email')}
  />
  {error && (
    <label className="label">
      <span className="label-text-alt text-error">{error.message}</span>
    </label>
  )}
</div>
```

---

## Dark Mode

daisyUI unterstützt Themes automatisch. Konfiguriert in `tailwind.config.ts`:

```typescript
daisyui: {
  themes: ['light', 'dark'],
}
```

Nutze semantische Farben statt feste Werte:

```tsx
{/* ✅ Semantisch (passt sich Theme an) */}
<div className="bg-base-100 text-base-content">
<div className="bg-primary text-primary-content">
<div className="text-error">

{/* ❌ Vermeiden (funktioniert nicht mit Dark Mode) */}
<div className="bg-white text-black">
```
