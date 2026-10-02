<!--
Abschnitt für github.com/bks-technologies (Repo bks-technologies/bks-technologies, lokal ~/BKS/github-portfolio).
Einfügen vor der letzten Zeile „Sie möchten so etwas …“, davor eine Zeile mit --- als Trenner.
Bilder aus docs/screenshots/ (uebersicht, konflikt, lauf, handy) nach assets/abgleich/ kopieren.
Erst veröffentlichen, wenn die Demo unter der Adresse erreichbar ist, sonst zeigt der Link ins Leere.
Anleitung: VEROEFFENTLICHEN.md, Schritt 5.
-->

### Abgleich: Shop, Warenwirtschaft, CRM und Buchhaltung im Gleichtakt

*Demo-Projekt, Oktober 2026*

Eine Bestellung kommt im Shop an und muss in die Warenwirtschaft, ein Kontakt ändert sich im CRM und muss ins zweite CRM, eine Zahlung muss in die Buchhaltung. Abgleich zeigt, welche Daten gerade zwischen welchen Systemen fließen, was hängt und wo beide Seiten denselben Datensatz unterschiedlich geändert haben. Diese Konflikte entscheidet ein Mensch mit einem Klick.

**[→ Demo ausprobieren](https://abgleich.bkstechnologies.de)**: erfundene Firmen mit Beispieldaten, ohne Anmeldung.

| Übersicht | Konflikt lösen |
|:---:|:---:|
| <img src="./assets/abgleich/uebersicht.png" width="400" alt="Übersicht: Kennzahlen, vier Pipelines zwischen Shop, ERP, CRM und Buchhaltung, offene Konflikte"> | <img src="./assets/abgleich/konflikt.png" width="400" alt="Konfliktlöser: System A und System B Feld für Feld nebeneinander, Ergebnis-Vorschau"> |
| **Lauf** | **Handy** |
| <img src="./assets/abgleich/lauf.png" width="400" alt="Laufende Synchronisation in vier Stufen, neue Datensätze im Verlauf"> | <img src="./assets/abgleich/handy.png" width="180" alt="Übersicht auf dem Handy"> |

**Was die Demo zeigt**

- Pipelines zwischen zwei Systemen mit Zustand, Zahlen der letzten 24 Stunden und Verlauf je Stunde. Pausieren, fortsetzen, von Hand anstoßen.
- Ein Lauf in vier Stufen: Daten holen, umwandeln, abgleichen, schreiben. Jeder Datensatz erscheint sofort im Verlauf und bekommt am Ende sein Ergebnis.
- Verlauf aller Datensätze mit Filter und Suche. Fehlgeschlagene lassen sich erneut senden; liegt die Ursache in den Daten, sagt die Demo das, statt es endlos zu wiederholen.
- Konflikte Feld für Feld: Was steht in System A, was in System B, wer hat zuletzt geändert. Eine Seite behalten oder je Feld das Richtige zusammenführen.

**Ehrlich gesagt:** Die Demo hat kein Backend und spricht kein echtes System an. Läufe, Fehler und Konflikte sind simuliert. Sie zeigt Oberfläche und Abläufe, so wie wir sie für ein echtes Projekt bauen würden.

**Technik:** Next.js, TypeScript, Tailwind CSS, Zustand. Gehostet in Frankfurt (Vercel).
