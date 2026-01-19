# Formulare & Validierung

React Hook Form mit Zod für type-safe Formulare.

---

## Stack

| Library | Zweck |
|---------|-------|
| **React Hook Form** | Formular-State, Performance |
| **@hookform/resolvers/zod** | Zod-Integration |
| **Zod** | Schema-Definition, Validierung |

---

## Grundstruktur

```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// 1. Schema definieren
const contactSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  phone: z.string().optional(),
})

// 2. Type ableiten
type ContactFormData = z.infer<typeof contactSchema>

// 3. Form Component
export function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
    }
  })

  const onSubmit = async (data: ContactFormData) => {
    const response = await fetch('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    // ...
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Fields */}
    </form>
  )
}
```

---

## Fehleranzeige

Fehler **direkt am Feld** anzeigen, nicht gesammelt am Ende:

```tsx
<div className="form-control">
  <label className="label">
    <span className="label-text">Name</span>
  </label>
  <input
    {...register('name')}
    className={`input input-bordered ${errors.name ? 'input-error' : ''}`}
  />
  {errors.name && (
    <label className="label">
      <span className="label-text-alt text-error">
        {errors.name.message}
      </span>
    </label>
  )}
</div>
```

---

## Fehlermeldungen

**Benutzerfreundlich** formulieren, kein Code-Jargon:

```typescript
// ❌ Schlecht
z.string().min(1) // "String must contain at least 1 character(s)"

// ✅ Gut
z.string().min(1, 'Name ist erforderlich')
z.string().email('Bitte gib eine gültige E-Mail-Adresse ein')
z.number().min(0, 'Wert muss positiv sein')
z.date().max(new Date(), 'Datum darf nicht in der Zukunft liegen')
```

---

## Validierung auf Server UND Client

Schema wiederverwenden:

```typescript
// lib/validators/contact.ts
export const contactSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  email: z.string().email('Ungültige E-Mail'),
})

export type ContactInput = z.infer<typeof contactSchema>
```

```typescript
// Client: Form
import { contactSchema } from '@/lib/validators/contact'

const { register } = useForm({
  resolver: zodResolver(contactSchema)
})
```

```typescript
// Server: API Route
import { contactSchema } from '@/lib/validators/contact'

export async function POST(req: Request) {
  const body = await req.json()
  const result = contactSchema.safeParse(body)
  
  if (!result.success) {
    return Response.json(
      { error: result.error.flatten() },
      { status: 400 }
    )
  }
  
  // result.data ist typisiert
}
```

---

## Komplexere Patterns

### Conditional Fields

```typescript
const schema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('person'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  }),
  z.object({
    type: z.literal('company'),
    companyName: z.string().min(1),
  }),
])
```

### Refinements

```typescript
const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  data => data.endDate >= data.startDate,
  { message: 'Enddatum muss nach Startdatum liegen', path: ['endDate'] }
)
```

### Transform

```typescript
const schema = z.object({
  email: z.string()
    .email()
    .transform(val => val.toLowerCase().trim()),
})
```

---

## Submit-Status

```tsx
<button
  type="submit"
  disabled={isSubmitting}
  className="btn btn-primary"
>
  {isSubmitting ? (
    <>
      <span className="loading loading-spinner loading-sm" />
      Speichern...
    </>
  ) : (
    'Speichern'
  )}
</button>
```
