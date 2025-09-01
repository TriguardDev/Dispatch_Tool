export interface Location {
  street_number: string;
  street_name: string;
  postal_code: string;
}

export async function findLatLong(location: Location): Promise<{ lat: number | null, lon: number | null }> {
  try {
    const params = new URLSearchParams({
      street: `${location.street_number} ${location.street_name}`,
      postalcode: location.postal_code,
      format: "json"
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "User-Agent": "BookingApp/1.0 (saher.ziauddin@gmail.com)" // required by Nominatim
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }

    return { lat: null, lon: null };
  } catch (error) {
    console.error("Error fetching lat/long:", error);
    return { lat: null, lon: null };
  }
}
