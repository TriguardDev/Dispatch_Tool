export interface Appointment {
  id: string;
  name: string;
  address: string;
  date: string;
  time: string;
  type?: string;
  notes?: string;
  status: "Scheduled" | "En Route" | "On Site" | "Completed";
}

export const appointments: Appointment[] = [
  {
    id: "1",
    name: "Ruben Resendez",
    address: "3141 Huntington Ct, Brownsville, TX",
    date: "2025-08-22",
    time: "09:00",
    type: "Roof Replacement",
    notes: "Finance discussion",
    status: "Scheduled",
  },
  {
    id: "2",
    name: "Lisa Nguyen",
    address: "1102 Sunset Blvd, McAllen, TX",
    date: "2025-08-22",
    time: "14:30",
    type: "Insurance Claim",
    notes: "Follow-up visit",
    status: "En Route",
  },
  {
    id: "3",
    name: "Mark Davis",
    address: "2205 Oak St, Harlingen, TX",
    date: "2025-08-22",
    time: "16:00",
    type: "Repair",
    notes: "Retail estimate completed",
    status: "Completed",
  },
];
