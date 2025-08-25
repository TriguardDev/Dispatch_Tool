import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewAppointmentModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    date: "",
    time: "",
    rep: "1001",
    type: "Roof Replacement",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id.replace("f-", "")]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving new appointment:", form); // later hook into backend
    onClose();
  };

  // ✅ Move conditional rendering AFTER hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSave}
        className="card bg-white w-[min(680px,95vw)] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold">New Appointment</h3>
          <button
            type="button"
            className="btn btn-ghost text-gray-600"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        {/* Form Body */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="label">Customer Name</div>
            <input
              id="f-name"
              className="input"
              required
              value={form.name}
              onChange={handleChange}
            />
          </div>
          <div>
            <div className="label">Phone</div>
            <input
              id="f-phone"
              className="input"
              placeholder="(###) ###-####"
              value={form.phone}
              onChange={handleChange}
            />
          </div>
          <div className="md:col-span-2">
            <div className="label">Address</div>
            <input
              id="f-address"
              className="input"
              placeholder="123 Main St, City, ST"
              value={form.address}
              onChange={handleChange}
            />
          </div>
          <div>
            <div className="label">Date</div>
            <input
              id="f-date"
              type="date"
              className="input"
              required
              value={form.date}
              onChange={handleChange}
            />
          </div>
          <div>
            <div className="label">Time (local)</div>
            <input
              id="f-time"
              type="time"
              className="input"
              required
              value={form.time}
              onChange={handleChange}
            />
          </div>
          <div>
            <div className="label">Assign Rep</div>
            <select
              id="f-rep"
              className="select"
              value={form.rep}
              onChange={handleChange}
            >
              <option value="1001">Alex Johnson</option>
              <option value="1002">Maria Lopez</option>
              <option value="1003">Chris Patel</option>
            </select>
          </div>
          <div>
            <div className="label">Type</div>
            <select
              id="f-type"
              className="select"
              value={form.type}
              onChange={handleChange}
            >
              <option>Roof Replacement</option>
              <option>Inspection</option>
              <option>Insurance Claim</option>
              <option>Repair</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <div className="label">Notes</div>
            <textarea
              id="f-notes"
              className="input"
              rows={3}
              placeholder="Financing, pets, gate code, etc."
              value={form.notes}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </footer>
      </form>
    </div>
  );
}
