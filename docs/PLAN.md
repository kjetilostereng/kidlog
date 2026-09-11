# Kidlog – plan og datamodell (utkast v0.1)

Status: **utkast til avklaring**. Spørsmålene i kapittel 7 må besvares før implementasjon starter.
Der det står «Anbefaling» er det forslaget som brukes hvis ikke annet bestemmes.

---

## 1. Formål

Kidlog skal gjøre det raskt å registrere små og trivielle hendelser i et barns dag
(søvn, våken, mat, bleie, tur, …), slik at man i etterkant enkelt kan se hvordan dagen
har forløpt og hvor lenge det er siden sist noe skjedde.

Suksesskriterier:

- Å logge en hendelse skal ta **ett trykk** og under to sekunder.
- Appen skal alltid vise «hvor lenge siden» / «hvor lenge pågått» korrekt, også etter at
  appen har vært lukket.
- Man skal kunne rette feil (feil klokkeslett, glemt registrering) uten friksjon.
- Alt skal fungere uten nett.

---

## 2. Kjernebegreper

| Begrep | Forklaring |
|---|---|
| **Barn** | Personen det logges for. Navn, fødselsdato. Modellen støtter flere barn. |
| **Aktivitetstype** | En kategori man kan logge, f.eks. «Søvn», «Måltid», «Bleie». Har et *slag* (se under), ikon, farge og eventuelle ekstra felt. Standardsett følger med, brukeren kan lage egne. |
| **Loggpunkt (Entry)** | Én registrering av en aktivitetstype for ett barn, med tidspunkt. |
| **Slag (kind)** | `point` = øyeblikk (måltid kl. 14:20). `duration` = pågår over tid, har start og slutt (søvn 13:00–14:30). |
| **Åpen entry** | Et `duration`-loggpunkt uten sluttid. Det er dette som «timeren» på hovedskjermen viser. |
| **Hovedskjerm** | Hurtigknapper («bokser») for de aktivitetstypene brukeren har valgt, pluss tidslinjen. |

### 2.1 Søvn og våken – den viktigste logikken

Søvn modelleres som **én** aktivitetstype av slaget `duration`. «Våken» lagres ikke som
egen entry, men **utledes** som tiden mellom to søvnperioder:

```
 sovnet 13:00 ───── søvn 1t 30m ───── våknet 14:30 ───── våken 2t 05m ───── sovnet 16:35 …
```

Søvn-boksen på hovedskjermen har derfor to tilstander:

| Tilstand | Boksen viser | Trykk gjør |
|---|---|---|
| Ingen åpen søvn (barnet er våkent) | «Våken i 2t 05m» + knapp **Sovnet** | Oppretter ny åpen søvn-entry med `startedAt = nå` |
| Åpen søvn (barnet sover) | «Sover i 45m» + knapp **Våknet** | Setter `endedAt = nå` på den åpne entryen |

Fordeler: ingen risiko for «våknet uten å ha sovnet», timerne beregnes alltid fra lagrede
tidspunkt (ikke en løpende teller), og oppsummering av total søvn/våken per dag blir
enkel. Samme mønster brukes for «Tur» og andre `duration`-typer.

### 2.2 «Hvor lenge siden» for øyeblikkshendelser

For `point`-typer (måltid, bleie …) viser boksen sist registrerte tidspunkt og tid siden:
«Måltid – sist 14:20 (1t 10m siden)». I tidslinjen vises avstanden mellom to påfølgende
entries av samme type, slik at man ser intervallet mellom måltider ved å scrolle.

---

## 3. Datamodell

Alle id-er er UUID, alle tidspunkt lagres som epoch-millisekunder (UTC) og vises i lokal
tid. `createdAt/updatedAt/deletedAt` finnes på alt slik at synkronisering mellom enheter
kan legges til senere uten å endre modellen (soft delete, sist-skrevet-vinner).

```ts
type Kind = 'point' | 'duration';

interface Child {
  id: string;
  name: string;
  birthDate: string;        // 'YYYY-MM-DD'
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

interface FieldDef {          // ekstra felt på en aktivitetstype (valgfritt)
  key: string;               // 'amountMl', 'side', 'diaper'
  label: string;             // 'Mengde', 'Side', 'Innhold'
  type: 'number' | 'choice' | 'text';
  unit?: string;             // 'ml'
  options?: string[];        // for 'choice': ['Venstre', 'Høyre'] / ['Tiss', 'Bæsj', 'Begge']
}

interface ActivityType {
  id: string;
  name: string;              // 'Søvn'
  emoji: string;             // '😴'
  color: string;             // '#7C9CF5'
  kind: Kind;
  fields: FieldDef[];        // tom liste for de fleste
  isBuiltin: boolean;        // standardtyper kan skjules, ikke slettes
  showOnHome: boolean;       // vises som boks på hovedskjermen
  sortOrder: number;         // rekkefølge på hovedskjermen
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Entry {
  id: string;
  childId: string;
  typeId: string;
  startedAt: number;         // for 'point': selve tidspunktet
  endedAt?: number;          // kun for 'duration'; undefined = pågår
  note?: string;
  values: Record<string, string | number>;  // verdier for FieldDef-ene
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

interface Settings {
  activeChildId?: string;
  dayStartsAt: string;       // '00:00' (se spørsmål)
}
```

### 3.1 Regler (invarianter)

1. Per barn og per `duration`-type finnes **maks én** åpen entry.
2. `endedAt >= startedAt`.
3. Trykk på en `duration`-boks: åpen entry finnes → lukk den; ellers → opprett ny åpen.
4. Trykk på en `point`-boks: opprett entry med `startedAt = nå` (ev. spør om ekstra felt).
5. Alle tidspunkt kan redigeres i ettertid; entries kan slettes og legges inn bakdatert.
6. Overlappende søvnperioder tillates ikke uten bekreftelse (typisk tegn på glemt «våknet»).
7. Utledede verdier (våken-tid, tid siden sist, dagsummer) lagres aldri – de beregnes fra entries.

### 3.2 Standard aktivitetstyper (forslag)

| Navn | Slag | Ekstra felt | Boks på hovedskjerm |
|---|---|---|---|
| Søvn | duration | – | ja |
| Måltid | point *(se spørsmål)* | mengde (ml), side (V/H), type (bryst/flaske/fast) | ja |
| Bleie | point | innhold: tiss / bæsj / begge | ja |
| Tur | duration | – | ja |
| Bad | point | – | nei |
| Medisin | point | navn/dose (tekst) | nei |
| Notat | point | fritekst | ja |

---

## 4. Skjermer

### 4.1 Hovedskjerm

```
┌──────────────────────────────┐
│ Emma · 4 mnd 2 uker      ⚙  │  ← barnets navn og alder
├──────────────────────────────┤
│ Tidslinje (scroll)           │
│  ── Tirsdag 10. sep ──       │
│  07:10  🍼 Måltid 120 ml     │
│         ↕ 2t 40m             │  ← intervall mellom måltider
│  09:50  🍼 Måltid 90 ml      │
│  10:05  😴 Søvn 10:05–11:20 (1t 15m) │
│         Våken 2t 05m         │  ← utledet
│  13:25  😴 Søvn pågår (45m)  │
│  ...                         │
├──────────────────────────────┤
│ [😴 Sover 45m]  [🍼 1t 10m]  │  ← hurtigbokser, brukervalgt utvalg
│   Våknet          Måltid     │     og rekkefølge
│ [🧷 3t 20m]     [🚶 Tur]     │
└──────────────────────────────┘
```

- Hurtigbokser nederst (innen tommelens rekkevidde), tidslinjen over. *(se spørsmål 5)*
- Etter et trykk vises en kort «Angre»-snackbar.
- Langt trykk på en boks åpner logging med valgbart klokkeslett og ekstra felt.

### 4.2 Andre skjermer

- **Rediger loggpunkt**: tidspunkt(er), felt, notat, slett.
- **Barn**: legg til / rediger navn og fødselsdato, velg aktivt barn.
- **Aktivitetstyper**: slå av/på standardtyper, lag egne (navn, emoji, farge, slag, felt), rekkefølge på hovedskjermen.
- **Dagsoppsummering** (fase 2): total søvn, antall måltider, lengste våkenperiode.
- **Innstillinger**: eksport/backup, språk.

---

## 5. Teknologi (anbefaling – se spørsmål 1)

| Lag | Valg | Begrunnelse |
|---|---|---|
| App | **React + TypeScript + Vite som PWA** | Installeres på hjemskjerm på iPhone og Android uten App Store. Raskest vei til noe man kan teste på egen telefon. Kan senere pakkes med Capacitor til «ekte» app i butikkene uten å skrive om. |
| Lagring | IndexedDB via Dexie | Lokal, offline, rask. Modellen er klar for sync senere. |
| Deploy | Vercel / GitHub Pages | Én URL, automatisk ved push. |
| Test | Vitest for logikk (timere, utledning av våken-tid, dagsummer) | Kjernelogikken er der feilene ville gjort mest skade. |

Alternativ: React Native med Expo hvis native app i App Store / Google Play er et krav fra
dag én. Det gir mer friksjon (utviklerkontoer, byggetjeneste) men er fullt mulig.

---

## 6. Faser

1. **Avklaring** – dette dokumentet + svar på spørsmålene under.
2. **Fundament** – prosjektoppsett, datamodell, lagring, standardtyper, enhetstester for
   utledningslogikk (våken-tid, tid siden sist).
3. **Hovedskjerm** – hurtigbokser med timere, tidslinje med intervaller, angre.
4. **Oppsett** – barn (navn, fødselsdato, alder), aktivitetstyper (egne + standard), velge bokser.
5. **Retting** – rediger/slett/bakdater loggpunkt, håndtering av glemt «våknet».
6. **Nytte** – dagsoppsummering, eksport/backup, PWA-installasjon.
7. **Senere** – deling mellom to foreldre (sync), påminnelser, app-butikk via Capacitor.

---

## 7. Åpne spørsmål

Se svar/beslutninger som fylles inn her etter hvert.

| # | Spørsmål | Anbefaling | Beslutning |
|---|---|---|---|
| 1 | PWA (nettapp på hjemskjerm) eller native app i App Store/Play fra start? | PWA først, Capacitor senere | |
| 2 | Skal to personer (f.eks. begge foreldre) kunne logge på samme barn fra hver sin telefon i v1? | Nei i v1, men modellen forberedes | |
| 3 | Flere barn (tvillinger/søsken) i v1? | Modell: ja. UI: enkel barn-velger | |
| 4 | Måltid: øyeblikk eller varighet? Hvilke felt (ml, side, bryst/flaske/fast)? | Øyeblikk, med valgfrie felt | |
| 5 | Tidslinje: nyeste nederst (chat-stil, knapper nederst) eller nyeste øverst? | Nyeste nederst, knapper nederst | |
| 6 | Hva er «en dag»? Midnatt, eller starter dagen ved morgenvekking? | Midnatt, sammenhengende tidslinje | |
| 7 | Bleie som standardtype? Andre standarder som mangler? | Ja: Søvn, Måltid, Bleie, Tur, Bad, Medisin, Notat | |
| 8 | Dagsoppsummering/statistikk i v1 eller senere? | Fase 6 (etter kjernen fungerer) | |
| 9 | Eksport/backup (JSON/CSV) i v1? | Ja, enkel JSON-eksport | |
| 10 | Påminnelser («3 timer siden mat»)? | Senere | |
| 11 | Språk: kun norsk, eller forberedt for flere? | Norsk UI, tekster samlet i én fil | |
| 12 | Hvordan håndtere glemt «våknet» når man trykker «sovnet» igjen? | Spør: «Barnet er registrert sovende siden 13:00 – når våknet det?» | |
