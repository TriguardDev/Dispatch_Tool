import { useState } from "react";
import type { Booking } from "../api/crud";
import AppointmentCard from "./AppointmentCard";

export function CompletedAppointmentCard({
  appt,
  onSave,
}: {
  appt: Booking;
  onSave: (bookingId: number, dispositionType: string, note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <div className="mb-4 p-2 border rounded-lg bg-gray-900  shadow-sm">
      <AppointmentCard appt={appt} />

      {/* Disposition select */}
      <select
        className="select mt-2 w-full"
        defaultValue={appt.disposition_code || ""}
        onChange={(e) => onSave(appt.bookingId, e.target.value, note)}
      >
        <option value="">Select Disposition</option>
        <option value="SOLD_CASH_PIF">Sold – Cash Deal (Paid in Full)</option>
        <option value="SOLD_CHECK_COLLECTED">Sold – Check Collected</option>
        <option value="SOLD_CARD_ACH_SUBMITTED">Sold – Card/ACH Payment Submitted</option>
        <option value="SOLD_DEPOSIT_COLLECTED">Sold – Deposit Collected (Balance Due)</option>
        <option value="SOLD_LENDER_SUBMITTED">Sold – Lender Financing Submitted</option>
        <option value="SOLD_LENDER_APPROVED_DOCS">Sold – Lender Approved (Docs Signed)</option>
        <option value="SOLD_FUNDED">Sold – Funded (Lender Disbursed)</option>
        <option value="SOLD_LENDER_DECLINED">Sold – Lender Declined</option>
        <option value="SOLD_IN_HOUSE_PLAN">Sold – Payment Plan (In-House)</option>
        <option value="SOLD_FINAL_PAYMENT">Sold – Balance Paid (Final Payment)</option>
        <option value="SOLD_RESCINDED_REVERSED">Sale Rescinded / Payment Reversed</option>
      </select>

      {/* Note input */}
      <textarea
        className="textarea mt-2 w-full border rounded-md p-2"
        placeholder="Add a note (optional)..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button
        className="btn btn-primary mt-2 w-full"
        onClick={() => onSave(appt.bookingId, appt.disposition_code || "", note)}
      >
        Save Disposition + Note
      </button>
    </div>
  );
}
