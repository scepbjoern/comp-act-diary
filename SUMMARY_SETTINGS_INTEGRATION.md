# Summary Settings Integration Guide

## In `app/settings/page.tsx`

### 1. Add state variables (around line 70):
```typescript
const [summaryModel, setSummaryModel] = useState('gpt-oss-120b')
const [summaryPrompt, setSummaryPrompt] = useState('Erstelle eine Zusammenfassung aller unten stehender Tagebucheinträge mit Bullet Points in der Form "**Schlüsselbegriff**: Erläuterung in 1-3 Sätzen"')
```

### 2. Update load() function to include summary settings:
```typescript
setSummaryModel(u.settings?.summaryModel || 'gpt-oss-120b')
setSummaryPrompt(u.settings?.summaryPrompt || 'Erstelle eine Zusammenfassung aller unten stehender Tagebucheinträge mit Bullet Points in der Form "**Schlüsselbegriff**: Erläuterung in 1-3 Sätzen"')
```

### 3. Update saveSettings() function to include summary fields:
```typescript
async function saveSettings() {
  startSaving()
  try {
    await fetch('/api/user/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme,
        autosaveEnabled,
        autosaveIntervalSec,
        summaryModel,         // Add this
        summaryPrompt         // Add this
      }),
      credentials: 'same-origin',
    })
    // ... rest of function
  }
}
```

### 4. Add UI section (insert after autosave section, around line 600):
```tsx
{/* Summary AI Settings */}
<div className="card p-4 space-y-3">
  <h3 className="font-medium flex items-center gap-2">
    <Icon name="summarize" />
    KI-Zusammenfassung
  </h3>
  
  <div className="space-y-2">
    <label className="block text-sm">
      <span className="text-gray-400 mb-1 block">Modell</span>
      <select
        value={summaryModel}
        onChange={(e) => setSummaryModel(e.target.value)}
        className="w-full bg-base-100 border border-base-300 rounded px-3 py-2 text-sm"
      >
        <option value="gpt-oss-120b">gpt-oss-120b (Standard)</option>
        <option value="gpt-4o-mini">gpt-4o-mini</option>
        <option value="gpt-4o">gpt-4o</option>
        <option value="openai/gpt-oss-20b">openai/gpt-oss-20b</option>
      </select>
    </label>
    
    <label className="block text-sm">
      <span className="text-gray-400 mb-1 block">System-Prompt</span>
      <textarea
        value={summaryPrompt}
        onChange={(e) => setSummaryPrompt(e.target.value)}
        rows={4}
        className="w-full bg-base-100 border border-base-300 rounded px-3 py-2 text-sm font-mono"
        placeholder="System-Prompt für die Zusammenfassung..."
      />
    </label>
    
    <p className="text-xs text-gray-500">
      Der Prompt definiert, wie die KI Zusammenfassungen erstellt. 
      Die Tagebucheinträge werden automatisch als Kontext mitgegeben.
    </p>
  </div>
</div>
```

## In `app/api/user/settings/route.ts`

Add `summaryModel` and `summaryPrompt` to the update object:
```typescript
await prisma.userSettings.update({
  where: { userId: user.id },
  data: {
    theme,
    autosaveEnabled,
    autosaveIntervalSec,
    summaryModel,      // Add this
    summaryPrompt      // Add this
  }
})
```
