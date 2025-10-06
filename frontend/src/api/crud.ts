import { authenticatedFetch } from "./login";

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

export interface Booking {
  bookingId: number;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM:SS
  customer_address: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;
  status: string;
  customer_name: string;
  agent_name: string | null;
  dispatcher_name?: string | null;
  assigned_to?: string | null; // Combined field showing who it's assigned to
  agentId?: number | null;
  dispatcherId?: number | null;
  disposition_id: number | null
  disposition_code: string | null
  disposition_description: string | null
  disposition_note: string | null
  regionId?: number;
  region_name?: string;
  region_is_global?: boolean;
  call_center_agent_name?: string | null;
  call_center_agent_email?: string | null;
}

export async function getAllBookings(regionId?: number): Promise<Booking[]> {
  const url = regionId ? `${BASE_URL}/bookings?region_id=${regionId}` : `${BASE_URL}/bookings`;
  const res = await authenticatedFetch(url);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required");
    }
    throw new Error("Failed to fetch bookings");
  }

  const result = await res.json();
  return result.success ? result.data : [];
}

export async function getAgentBookings(agentId: number): Promise<Booking[]> {
  const res = await authenticatedFetch(`${BASE_URL}/agents/${agentId}/bookings`);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required");
    }
    if (res.status === 403) {
      throw new Error("Access denied");
    }
    if (res.status === 404) {
      throw new Error("Agent not found");
    }
    throw new Error("Failed to fetch bookings");
  }

  const result = await res.json();
  return result.success ? result.data : [];
}

export async function getDispatcherBookings(dispatcherId: number): Promise<Booking[]> {
  const res = await authenticatedFetch(`${BASE_URL}/dispatchers/${dispatcherId}/bookings`);

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required");
    }
    if (res.status === 403) {
      throw new Error("Access denied");
    }
    if (res.status === 404) {
      throw new Error("Dispatcher not found");
    }
    throw new Error("Failed to fetch dispatcher bookings");
  }

  const result = await res.json();
  return result.success ? result.data : [];
}

export async function updateBooking(bookingId: number, updates: { 
  agentId?: number | null; 
  dispatcherId?: number | null;
  assign_to_self?: boolean;
  booking_date?: string; 
  booking_time?: string; 
  status?: string; 
}): Promise<void> {
  const res = await authenticatedFetch(`${BASE_URL}/bookings/${bookingId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required");
    }
    if (res.status === 403) {
      throw new Error("Access denied");
    }
    if (res.status === 404) {
      throw new Error("Booking not found");
    }
    throw new Error("Failed to update booking");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createBooking(bookingData: any): Promise<any> {
  const res = await authenticatedFetch(`${BASE_URL}/bookings`, {
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

  const result = await res.json();
  return result.success ? result.data : result;
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

  const result = await res.json();
  // The search endpoint returns agents array directly, not wrapped in success/data
  return Array.isArray(result) ? result : (result.success ? result.data : []);
}

export async function deleteBooking(bookingId: number): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await authenticatedFetch(`${BASE_URL}/bookings/${bookingId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Authentication required");
    }
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to delete booking");
  }

  return await res.json();
}