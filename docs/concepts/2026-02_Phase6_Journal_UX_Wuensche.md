# Phase 6: Journal-Seite UX-Wünsche

> Gesammelt aus manuellem Testing (MT-Serie), Februar 2026.
> Status: **Umgesetzt** – alle W1–W8 implementiert (Februar 2026).

---

## Übersicht

Diese Wünsche betreffen die Journal-Seite (`/journal`) und zielen darauf ab,
Features der Startseite (DiarySection) auch im Journal verfügbar zu machen
und die UX weiter zu verbessern.

---

## W1: RichTextEditor in Journal-Einträgen

**Beschreibung**: Der RichTextEditor (Markdown-Toolbar) soll auch im
DynamicJournalForm für Textfelder verfügbar sein – analog zur DiarySection
auf der Startseite.

**Aufwand**: Mittel – FieldRenderer muss RichTextEditor als Option unterstützen.
**Status**: ✅ Umgesetzt – FieldRenderer und DynamicJournalForm nutzen jetzt RichTextEditor für textarea-Felder.

---

## W2: Zeitstempel beim Erstellen setzen

**Beschreibung**: Beim Erstellen eines neuen Journal-Eintrags soll der
Zeitpunkt (`occurredAt` / `capturedAt`) direkt im Formular gesetzt werden
können, nicht nur nachträglich via TimestampModal.

**Aufwand**: Klein – Datum/Zeit-Felder in DynamicJournalForm integrieren.
**Status**: ✅ Umgesetzt – occurredAt Datum+Zeit Felder im Formular, durchgereicht an POST/PATCH.

---

## W3: Generieren-Button (KI-Pipeline) im Formular

**Beschreibung**: Nach dem Speichern eines Eintrags soll ein
"Generieren"-Button angezeigt werden, der die KI-Pipeline direkt auslöst
(Zusammenfassung, Analyse etc.). Alternativ als Post-Save-Action.

**Aufwand**: Klein – Button nach erfolgreichem Save anzeigen, `runPipeline` aufrufen.
**Status**: ✅ Umgesetzt – Save+Pipeline Button (Floppy+Sparkles) im Formular, verdrahtet in Create+Edit+Detail.

---

## W4: Audio-Speicher-Toggle im Journal

**Beschreibung**: Die Option "Audio behalten / nicht behalten" (keepAudio)
soll auch im Journal-Formular verfügbar sein – analog zur Startseite.

**Aufwand**: Klein – Prop `keepAudio` in DynamicJournalForm durchreichen.
**Status**: ✅ Umgesetzt – keepAudio Toggle (database/database-off Icon) im Media-Toolbar.

---

## W5: KI-Pipeline-Button in JournalEntryCard

**Beschreibung**: Der KI-Pipeline-Button soll prominenter platziert werden.
Aktuell ist er als Icon vorhanden (IconSparkles). Wunsch: wie bei der Startseite implementieren, wo es drei Buttons gibt: siehe components/features/DiarySection.tsx#L446-490.

**Aufwand**: Klein bis mittel.
**Status**: ✅ Umgesetzt – Save+Pipeline Button im Formular analog zur Startseite.

---

## W6: Bildgenerierung in Journal

**Beschreibung**: Die DALL-E Bildgenerierung soll auch für Journal-Einträge
verfügbar sein – analog zur Startseite, wo ein Bild zum Tageseintrag
generiert werden kann. Siehe components/features/journal/JournalEntryImage.tsx#L95-105 .

**Aufwand**: Mittel – Bestehende Bildgenerierung an Journal-Kontext anpassen.
**Status**: ✅ Umgesetzt – JournalEntryImage in JournalEntryCard integriert.

---

## W7: Eintrag zusammenklappen per Header-Klick

**Beschreibung**: In der Journal-Liste soll ein Klick auf den Header-Bereich
(Typ-Badge, Titel) den Eintrag ein-/ausklappen. Aktuell funktioniert dies
nur über den Chevron-Button.

**Aufwand**: Klein – `onClick` auf Header-Container statt nur Chevron.
**Status**: ✅ Umgesetzt – Header-Klick toggled expand+collapse in compact mode.


## W8: Alle Schaltlfächen sollen nur ein Symbol haben und keinen Text. Das heisst, noch anzupassen sind:
- "Foto": hier einfach den Text (siehe DynamicJournalForm.tsx#L709) weglassen, da bereits ein gutes Symbol da ist
- "Kamera": Den Text (siehe DynamicJournalForm.tsx#L723) durch ein passendes Tabler Icon ersetzen
- "Abbrechen": Den jetzigen Text (siehe DynamicJournalForm.tsx#L771) durch ein rotes "cancel" icon ersetzen
- "Speichern": Den jetzigen Text (siehe DynamicJournalForm.tsx#L782) durch ein grünes "device-floppy" icon ersetzen
- "Speichern + AI-Pipeline ausführen": Durch ein blaues device-floppy-icon ergänzt um ein sparkles-Icon

---

## Abhängigkeiten

- W1 hängt von der RichTextEditor-Komponente ab (bereits in DiarySection vorhanden)
- W3 benötigt `runPipeline` Zugriff im Post-Save-Context
- W6 benötigt die DALL-E Integration (bereits in `/api/ai/generate-image` vorhanden)

---

*Ende des Dokuments*
