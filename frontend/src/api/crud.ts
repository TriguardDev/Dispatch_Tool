import { authenticatedFetch } from "./login";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface Booking {
  bookingId: number;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM:SS
  customer_address: string | null;
  status: string;
  customer_name: string;
  agent_name: string | null;
  disposition_id: number | null
  disposition_code: string | null
  disposition_description: string | null
  disposition_note: string | null
}

export async function getAllBookings(): Promise<Booking[]> {
  const res = await authenticatedFetch(`${BASE_URL}/booking`);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required");
    }
    throw new Error("Failed to fetch bookings");
  }

  return res.json();
}

export async function getAgentBookings(agentId: number): Promise<Booking[]> {
  const res = await authenticatedFetch(`${BASE_URL}/booking?agentId=${agentId}`);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required");
    }
    throw new Error("Failed to fetch bookings");
  }

  return res.json();
}

export async function updateBookingStatus(bookingId: number, status: string): Promise<void> {
  const res = await authenticatedFetch(`${BASE_URL}/booking`, {
    method: "PUT",
    body: JSON.stringify({ booking_id: bookingId, status }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required");
    }
    if (res.status === 403) {
      throw new Error("Access denied");
    }
    throw new Error("Failed to update booking status");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createBooking(bookingData: any): Promise<any> {
  const res = await authenticatedFetch(`${BASE_URL}/booking`, {
    method: "POST",
    body: JSON.stringify(bookingData),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required");
    }
    if (res.status === 403) {
      throw new Error("Access denied - dispatcher required");
    }
    throw new Error("Failed to create booking");
  }

  return res.json();
}

export async function saveDisposition(
  bookingId: number,
  dispositionType: string,
  note: string = ""
): Promise<void> {
  const res = await authenticatedFetch(`${BASE_URL}/disposition`, {
    method: "POST",
    body: JSON.stringify({
      bookingId,
      dispositionType,
      note,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required");
    }
    throw new Error("Failed to save disposition");
  }
}

export async function searchAgents(params: {
  latitude: string;
  longitude: string;
  booking_date: string;
  booking_time: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<any[]> {
  const queryParams = new URLSearchParams(params);
  const res = await authenticatedFetch(`${BASE_URL}/search?${queryParams.toString()}`);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required");
    }
    throw new Error("Failed to search agents");
  }

  return res.json();
}