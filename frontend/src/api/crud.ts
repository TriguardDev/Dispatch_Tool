export interface Booking {
  id: number;
  customerId: number;
  agentId: number;
  booking_date: string;
  booking_time: string;
  status: string;
}

export async function getBookings(email: string): Promise<Booking[]> {
  const res = await fetch("http://localhost:8000/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  return res.json();
}