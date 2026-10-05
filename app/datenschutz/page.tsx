import { LegalPage } from "@/components/legal-page";
import { company as c } from "@/lib/legal";

export const metadata = { title: "Datenschutz" };

/**
 * ENTWURF, von Sami zu prüfen. Die Demo hat kein Backend: keine Konten, keine Cookies, keine Eingaben an einen Server.
 * Einziger Anbieter ist das Hosting (Vercel, Region Frankfurt).
 */
export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutz">
      <p className="rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">Entwurf, noch nicht rechtlich geprüft.</p>

      <h2>1. Verantwortlicher</h2>
      <p>{c.legalName}, {c.street}, {c.zip} {c.city}, vertreten durch {c.representative}. E-Mail: <a href={`mailto:${c.email}`}>{c.email}</a>, Telefon: {c.phone}.</p>

      <h2>2. Was diese Anwendung ist</h2>
      <p>Abgleich ist ein Vorführstück von BKS Technologies. Es enthält ausschließlich erfundene Firmen, Personen und Daten. Es gibt keine Anmeldung, keine Konten und keine Verbindung zu den genannten Systemen; alle Abgleiche werden im Browser simuliert.</p>

      <h2>3. Hosting</h2>
      <p>Die Anwendung läuft bei Vercel Inc. in der Region Frankfurt am Main. Beim Aufruf verarbeitet der Anbieter technisch notwendige Verbindungsdaten (IP-Adresse, Zeitpunkt, aufgerufene Adresse) zur Auslieferung und Absicherung der Seite (Art. 6 Abs. 1 lit. f DSGVO). Vercel Inc. hat seinen Sitz in den USA; dabei können Verbindungsdaten auch in die USA übertragen werden.</p>

      <h2>4. Speicherung im Browser, keine Cookies</h2>
      <p>Damit Ihre Klicks in der Demo erhalten bleiben (angestoßene Läufe, gelöste Konflikte), speichert die Anwendung den Stand im lokalen Speicher Ihres Browsers (localStorage). Diese Daten werden nicht übertragen und lassen sich jederzeit über „Zurücksetzen“ oder durch Löschen der Websitedaten im Browser entfernen (§ 25 Abs. 2 Nr. 2 TDDDG). Die Anwendung setzt keine Cookies, nutzt keine Analyse- oder Werbedienste und lädt keine Inhalte von fremden Servern.</p>

      <h2>5. Rechte der Betroffenen</h2>
      <p>Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch nach Art. 15 bis 21 DSGVO. Anfragen an <a href={`mailto:${c.email}`}>{c.email}</a>. Beschwerden nimmt die zuständige Aufsichtsbehörde entgegen: {c.authority.name}, {c.authority.street}, {c.authority.city}, <a href={c.authority.url}>{c.authority.url}</a>.</p>
    </LegalPage>
  );
}
