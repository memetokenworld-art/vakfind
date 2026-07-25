// Vaste doładowaniebedragen — gedeeld tussen de server action (validatie)
// en de client UI (knoppen), buiten het "use server"-bestand omdat dat
// alleen async functies mag exporteren.
export const ALLOWED_TOPUP_AMOUNTS = [5, 10, 25, 50, 100] as const;
