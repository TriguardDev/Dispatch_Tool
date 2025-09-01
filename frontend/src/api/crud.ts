import { BASE_URL } from "../utils/constants";

export interface Booking {
  bookingId: number;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM:SS
  status: string;
  customer_name: string;
  agent_name: string | null; // agent can be null
  disposition_id: number | null
  disposition_code: string | null
  disposition_description: string | null
  disposition_note: string | null
}

export async function getAllBookings(): Promise<Booking[]> {
  const res = await fetch(`${BASE_URL}:8000/booking`, {
    method: "GET", // your API is now GET
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch bookings");
  }

  return res.json();
}
