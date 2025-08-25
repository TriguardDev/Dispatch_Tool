export interface Booking {
  bookingId: number;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM:SS
  status: string;
  customer_name: string;
  agent_name: string | null; // agent can be null
}

export async function getAllBookings(): Promise<Booking[]> {
  const res = await fetch("http://localhost:8000/booking", {
    method: "GET", // your API is now GET
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch bookings");
  }

  return res.json();
}
