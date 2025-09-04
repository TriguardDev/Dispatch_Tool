import { useState } from "react";
import { Card, CardContent, Select, MenuItem, FormControl, InputLabel, TextField, Button, Box } from "@mui/material";
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
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <AppointmentCard appt={appt} addressText={appt.customer_address ?? ""} />

        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="disposition-label">Disposition</InputLabel>
            <Select
              labelId="disposition-label"
              label="Disposition"
              defaultValue={appt.disposition_code || ""}
              onChange={(e) => onSave(appt.bookingId, e.target.value, note)}
            >
              <MenuItem value="">Select Disposition</MenuItem>
              <MenuItem value="SOLD_CASH_PIF">Sold – Cash Deal (Paid in Full)</MenuItem>
              <MenuItem value="SOLD_CHECK_COLLECTED">Sold – Check Collected</MenuItem>
              <MenuItem value="SOLD_CARD_ACH_SUBMITTED">Sold – Card/ACH Payment Submitted</MenuItem>
              <MenuItem value="SOLD_DEPOSIT_COLLECTED">Sold – Deposit Collected (Balance Due)</MenuItem>
              <MenuItem value="SOLD_LENDER_SUBMITTED">Sold – Lender Financing Submitted</MenuItem>
              <MenuItem value="SOLD_LENDER_APPROVED_DOCS">Sold – Lender Approved (Docs Signed)</MenuItem>
              <MenuItem value="SOLD_FUNDED">Sold – Funded (Lender Disbursed)</MenuItem>
              <MenuItem value="SOLD_LENDER_DECLINED">Sold – Lender Declined</MenuItem>
              <MenuItem value="SOLD_IN_HOUSE_PLAN">Sold – Payment Plan (In-House)</MenuItem>
              <MenuItem value="SOLD_FINAL_PAYMENT">Sold – Balance Paid (Final Payment)</MenuItem>
              <MenuItem value="SOLD_RESCINDED_REVERSED">Sale Rescinded / Payment Reversed</MenuItem>
            </Select>
          </FormControl>

          <TextField
            multiline
            rows={3}
            placeholder="Add a note (optional)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            variant="outlined"
            fullWidth
            label="Note"
          />

          <Button
            variant="contained"
            fullWidth
            onClick={() => onSave(appt.bookingId, appt.disposition_code || "", note)}
          >
            Save Disposition + Note
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
