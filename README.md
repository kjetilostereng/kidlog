# Kidlog

En mobilapp (PWA) for å logge barnets dag: søvn, våken tid, måltider, amming, bleie, tur og egne aktiviteter.
Ett trykk registrerer en hendelse, og hovedskjermen viser hvor lenge det er siden sist og hvor lenge noe har pågått.

Plan, datamodell og beslutninger: [docs/PLAN.md](docs/PLAN.md).

## Kjøre lokalt

```bash
npm install
npm run dev        # utviklingsserver, åpne adressen som vises
npm test           # enhetstester (Vitest)
npm run typecheck  # TypeScript
npm run build      # produksjonsbygg til dist/
npm run preview    # forhåndsvis produksjonsbygget
```

For å teste på telefonen: kjør `npm run dev -- --host` og åpne PC-ens IP-adresse på telefonen i samme nettverk.
Bygget i `dist/` kan legges på en hvilken som helst statisk hosting (Vercel, Netlify, GitHub Pages).
Når siden er åpnet på telefonen kan den legges til på hjemskjermen som app.

## Struktur

| Mappe | Innhold |
|---|---|
| `src/domain/` | Datamodell, standardaktiviteter, tidsfunksjoner og all utledningslogikk (timere, våken-tid, tidslinje). Ren TypeScript uten UI, med tester. |
| `src/storage/` | `Repository`-grensesnittet og den lokale IndexedDB-implementasjonen (Dexie). Skylagring kan legges til her senere. |
| `src/i18n/` | Tekster (norsk og engelsk) og formatering av tid, varighet og alder. |
| `src/ui/` | React-skjermer: hovedskjerm, tidslinje, hurtigbokser, redigering, barn, aktiviteter, innstillinger. |
| `src/hooks/` | React-hooks for lagring, klokke og langtrykk. |
