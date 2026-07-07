# User Guide: CI-Workflow (GitHub Actions)

## Überblick

Seit Etappe 0.2 läuft bei jedem Pull Request gegen `main` automatisch ein Qualitäts-Gate («Quality Checks») auf GitHub. Erst wenn dieser Lauf grün ist, wird der Merge-Button aktiviert. Ein direkter `git push origin main` wird von GitHub abgelehnt. Damit ist sichergestellt, dass kein Code auf `main` landet – und damit auf den Docker-Server gezogen werden kann –, der Typecheck, Lint, Tests oder den Build bricht.

## Rollen

| Rolle | Betrifft | Einschränkung |
|---|---|---|
| Repo-Owner (Du) | Vollständig | Auch als Admin kein direkter Push auf `main` mehr möglich |

## Voraussetzungen

- Ein GitHub-Konto mit Zugriff auf `scepbjoern/comp-act-diary`.
- Änderungen müssen auf einem Feature-Branch committed sein, **nicht** direkt auf `main`.

## Schritt-für-Schritt: Änderungen nach `main` bringen

1. Änderungen auf einem Feature-Branch committen und pushen:
   ```bash
   git checkout -b feature/mein-feature
   # … Änderungen …
   git add .
   git commit -m "feat: meine Änderung"
   git push origin feature/mein-feature
   ```
2. Auf GitHub einen Pull Request gegen `main` öffnen (UI oder `gh pr create`).
3. Der «Quality Checks»-Workflow startet automatisch. Du kannst den Fortschritt im **Actions**-Tab des Repos beobachten.
4. Sobald alle Steps grün sind, wird der Merge-Button aktiv. Den PR mergen.
5. Lokal auf `main` wechseln und pullen:
   ```bash
   git checkout main
   git pull origin main
   ```
6. Auf dem Server deployen:
   ```bash
   git pull origin main   # auf dem Server
   docker compose up -d --build
   ```

## Typische Fälle

- **Alle Steps grün → Merge möglich:** Merge-Button erscheint aktiv in der PR-Ansicht.
- **Ein Step schlägt fehl (z. B. Typecheck):** Merge-Button bleibt gesperrt. Fehler im Log lesen, lokal beheben, auf denselben Branch pushen – der Workflow startet automatisch neu.
- **Direkter `git push origin main`:** GitHub antwortet mit `GH013: Changes must be made through a pull request.` – das ist korrekt und erwünscht.
- **CI hängt oder ist dauerhaft rot und blockiert:** Branch Protection Rule kann temporär in den Repo-Settings unter **Settings → Rules → Rulesets** deaktiviert werden. Nach der Behebung wieder aktivieren.

## Hinweise für die Demo

Nicht relevant (rein infrastrukturelles Feature, keine UI-sichtbare Funktion).

## Bekannte Einschränkungen

- Konsolen-Warnungen in den Test-Logs (`act(...)`, `ERR_INVALID_URL`): harmlos, da sie aus fehlenden API-Mocks in UI-Tests stammen und nicht zum Fehlschlagen der Tests führen.
- Der Build-Schritt im CI dauert ~2–4 Minuten extra; bei 20-Minuten-Timeout liegt genug Puffer.
- Prisma 7 ist verfügbar, aber noch nicht Teil dieses Updates (Etappe 2).
