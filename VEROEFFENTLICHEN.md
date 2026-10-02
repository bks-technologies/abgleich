# Abgleich veröffentlichen – Schritt für Schritt

Für Sami. Dauer etwa 20 Minuten plus Wartezeit auf das DNS. Du brauchst: Terminal, GitHub (`bks-technologies`),
Vercel (mit GitHub angemeldet), IONOS. Alles ist vorbereitet, du musst nichts am Code ändern.

Ergebnis am Ende: Demo unter **https://abgleich.bkstechnologies.de** und ein Abschnitt im GitHub-Profil.

---

## 1. Kurz prüfen, ob alles sauber ist

Im Terminal:

```bash
cd ~/BKS/abgleich
git status          # muss "nothing to commit, working tree clean" sagen
npm test            # muss "8 passed" zeigen
npm run build       # muss ohne Fehler durchlaufen
```

## 2. Repo auf GitHub anlegen

1. https://github.com/new öffnen (angemeldet als `bks-technologies`).
2. **Repository name:** `abgleich`
3. **Private** oder **Public**: deine Entscheidung. Website und Stunden sind privat; die Demo funktioniert in
   beiden Fällen. Public heißt: jeder kann den Code lesen (gut als Arbeitsprobe, aber auch für die Konkurrenz).
4. **Nichts** ankreuzen (kein README, kein .gitignore, keine Lizenz), sonst gibt es beim Hochladen einen Konflikt.
5. **Create repository**.

Dann im Terminal:

```bash
cd ~/BKS/abgleich
git remote add origin git@github.com:bks-technologies/abgleich.git
git push -u origin main
```

Fragt das Terminal einmal „Are you sure you want to continue connecting?“: `yes` eintippen.

## 3. Vercel-Projekt anlegen

1. https://vercel.com/new öffnen.
2. Bei **Import Git Repository** `abgleich` auswählen → **Import**.
   (Taucht es nicht auf: „Adjust GitHub App Permissions“ und dem Repo Zugriff geben.)
3. Framework erkennt Vercel selbst (Next.js). **Keine** Umgebungsvariablen nötig. Die Region Frankfurt steht schon
   in `vercel.json`.
4. **Deploy**. Nach etwa einer Minute gibt es eine Adresse wie `abgleich-xyz.vercel.app`. Öffnen und kurz
   durchklicken.

## 4. Eigene Adresse einrichten

**In Vercel:** Projekt `abgleich` → **Settings** → **Domains** → `abgleich.bkstechnologies.de` eintragen → **Add**.
Vercel zeigt dann einen **CNAME-Wert** an (eine lange Adresse, endet auf `vercel-dns…com`). Diesen Wert kopieren.

**Bei IONOS:** Domains & SSL → `bkstechnologies.de` → **DNS** → **Eintrag hinzufügen** → **CNAME**

| Feld | Wert |
|---|---|
| Hostname | `abgleich` |
| Zeigt auf | der kopierte Wert von Vercel |
| TTL | Standard lassen |

Speichern. **Die MX-Einträge nicht anfassen**, sonst kommt keine Mail mehr an.

Nach 5 bis 30 Minuten zeigt Vercel bei der Domain „Valid Configuration“ und stellt das Zertifikat selbst aus.
Dann https://abgleich.bkstechnologies.de öffnen und prüfen:

- [ ] Seite lädt, oben steht „Demo · erfundene Daten“
- [ ] „Sync anstoßen“ läuft durch, unten rechts kommt eine Meldung
- [ ] „Alle lösen“ öffnet den Konfliktlöser, „Zusammenführen“ funktioniert
- [ ] Unten Impressum und Datenschutz öffnen sich
- [ ] Auf dem Handy aufrufen: nichts läuft seitlich über

## 5. Abschnitt ins GitHub-Profil

Erst, wenn Schritt 4 klappt (sonst zeigt der Link ins Leere).

```bash
cd ~/BKS/github-portfolio
git status                     # sollte sauber sein; stehen dort fremde Änderungen, erst klären, nicht mit hochladen
mkdir -p assets/abgleich
cp ~/BKS/abgleich/docs/screenshots/{uebersicht,konflikt,lauf,handy}.png assets/abgleich/
```

Dann `README.md` im Ordner `github-portfolio` öffnen und den Text aus
`~/BKS/abgleich/docs/portfolio-abschnitt.md` (ab `### Abgleich`, ohne den Kommentar oben) **vor** der letzten Zeile
„Sie möchten so etwas für Ihren Betrieb? …“ einfügen. Davor eine Zeile mit `---` als Trenner, wie bei den anderen
Projekten.

```bash
git add README.md assets/abgleich
git commit -m "Abgleich ins Portfolio aufgenommen"
git push
```

Auf https://github.com/bks-technologies nachsehen, ob Bilder und Link stimmen.

---

## Falls etwas hakt

- **`git push` sagt „Permission denied (publickey)“:** Der SSH-Schlüssel ist nicht geladen. `ssh -T git@github.com`
  ausführen; es muss „Hi bks-technologies!“ kommen.
- **`git push` sagt „rejected … fetch first“:** Beim Anlegen des Repos wurde doch ein README angekreuzt. Repo auf
  GitHub löschen (Settings → ganz unten) und Schritt 2 ohne Häkchen wiederholen.
- **Vercel zeigt „Invalid Configuration“ auch nach einer Stunde:** Bei IONOS prüfen, dass der Hostname nur
  `abgleich` heißt (nicht `abgleich.bkstechnologies.de`) und kein alter A-Eintrag für `abgleich` existiert.
- **Hinweis zu Vercel Hobby:** Der kostenlose Plan ist laut Vercel für nicht-kommerzielle Nutzung gedacht. Für ein
  paar Demos ist das in der Praxis unkritisch, aber sobald Kundenprojekte dort laufen, ist Pro (20 $/Monat) fällig.

Jeder spätere `git push` auf `main` geht automatisch live.
