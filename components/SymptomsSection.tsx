import { Icon } from '@/components/Icon'
import { NumberPills } from '@/components/NumberPills'
import { Sparkline } from '@/components/Sparkline'
import { SYMPTOM_LABELS } from '@/lib/constants'
import type { Day, InlineData } from '@/types/day'

interface SymptomsSectionProps {
  day: Day
  symptomIcons: Record<string, string | null>
  draftSymptoms: Record<string, number | undefined>
  draftUserSymptoms: Record<string, number | undefined>
  clearedSymptoms: Set<string>
  clearedUserSymptoms: Set<string>
  inlineData: InlineData | null
  onSetDraftSymptom: (type: string, score: number) => void
  onSetDraftUserSymptom: (id: string, score: number) => void
  onClearDraftSymptom: (type: string) => void
  onClearDraftUserSymptom: (id: string) => void
}

export function SymptomsSection({
  day,
  symptomIcons,
  draftSymptoms,
  draftUserSymptoms,
  clearedSymptoms,
  clearedUserSymptoms,
  inlineData,
  onSetDraftSymptom,
  onSetDraftUserSymptom,
  onClearDraftSymptom,
  onClearDraftUserSymptom,
}: SymptomsSectionProps) {
  const symptoms = Object.keys(SYMPTOM_LABELS)
  const sortedUserSymptoms = day.userSymptoms 
    ? [...day.userSymptoms].sort((a, b) => 
        new Intl.Collator('de-DE', { sensitivity: 'base' }).compare(a.title, b.title)
      )
    : []

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm">
        <span className="inline-flex items-center gap-1">
          <Icon name="stethoscope" />
          <span>Symptome</span>
        </span>
      </h3>
      <div className="space-y-0">
        {symptoms.map(type => {
          const series = inlineData?.symptoms?.[type]
          const prev = inlineData?.yesterday?.standard?.[type] ?? null
          return (
            <div key={type} className="space-y-1 !mb-[30px]">
              <div className="text-sm text-gray-400">
                <span className="inline-flex items-center gap-2">
                  {symptomIcons?.[type] ? <Icon name={symptomIcons[type]} /> : null}
                  <span>{SYMPTOM_LABELS[type]}</span>
                  {series && (
                    <span className="inline-flex items-center gap-2 ml-2">
                      <Sparkline data={series} width={72} height={24} colorByValue midValue={5} />
                    </span>
                  )}
                </span>
              </div>
              <NumberPills
                min={1}
                max={10}
                value={clearedSymptoms.has(type) ? undefined : (draftSymptoms[type] ?? day.symptoms?.[type])}
                onChange={n => onSetDraftSymptom(type, n)}
                onClear={() => onClearDraftSymptom(type)}
                ariaLabel={SYMPTOM_LABELS[type]}
                unsaved={draftSymptoms[type] !== undefined || clearedSymptoms.has(type)}
                previousValue={typeof prev === 'number' ? prev : null}
              />
            </div>
          )
        })}
      </div>
      
      {(day.userSymptoms && day.userSymptoms.length > 0) && (
        <>
          <div className="border-t border-slate-700/60 my-1" />
          <div className="text-sm text-gray-400">Eigene Symptome</div>
        </>
      )}
      
      <div className="space-y-0">
        {sortedUserSymptoms.length > 0 ? (
          sortedUserSymptoms.map(us => {
            const series = inlineData?.customSymptoms?.series?.[us.id]
            const prev = inlineData?.yesterday?.custom?.[us.id] ?? null
            return (
              <div key={us.id} className="space-y-1 !mb-[30px]">
                <div className="text-sm text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    {us.icon ? <Icon name={us.icon} /> : null}
                    <span>{us.title}</span>
                    {series && (
                      <span className="inline-flex items-center gap-2 ml-2">
                        <Sparkline data={series} width={72} height={24} colorByValue midValue={5} />
                      </span>
                    )}
                  </span>
                </div>
                <NumberPills
                  min={1}
                  max={10}
                  value={clearedUserSymptoms.has(us.id) ? undefined : (draftUserSymptoms[us.id] ?? us.score)}
                  onChange={n => onSetDraftUserSymptom(us.id, n)}
                  onClear={() => onClearDraftUserSymptom(us.id)}
                  ariaLabel={us.title}
                  unsaved={draftUserSymptoms[us.id] !== undefined || clearedUserSymptoms.has(us.id)}
                  previousValue={typeof prev === 'number' ? prev : null}
                />
              </div>
            )
          })
        ) : (
          <div className="text-sm text-gray-500">Noch keine eigenen Symptome. Lege welche in den Einstellungen an.</div>
        )}
      </div>
    </div>
  )
}
