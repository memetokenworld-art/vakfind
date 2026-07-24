// Zamiana adresu tekstowego (miasto/kod pocztowy) na współrzędne
// geograficzne — Google Geocoding API (specyfikacja, punkt 12: darmowy
// limit 10 000 zapytań/miesiąc). Klucz API musi być SERWEROWY (bez
// prefiksu NEXT_PUBLIC_) — inaczej trafiłby do kodu widocznego w
// przeglądarce i każdy mógłby go zużywać.
//
// Ta funkcja jest wołana wyłącznie z Server Actions ("use server"), nigdy
// bezpośrednio z komponentów klienckich.
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey || !address.trim()) {
    return null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  // ", Nederland" doklejone na sztywno — VakFind działa tylko w NL na start
  // (specyfikacja, punkt 1), więc to eliminuje niejednoznaczne trafienia
  // (np. miasta o tej samej nazwie w innych krajach).
  url.searchParams.set("address", `${address}, Nederland`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("region", "nl");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]) {
      return null;
    }

    const location = data.results[0].geometry.location;
    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
}
