import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh bookings after saving
}

interface Agent {
  agentId: string;
  name: string;
}

export default function NewAppointmentModal({ isOpen, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    street_number: "",
    street_name: "",
    postal_code: "",
    date: "",
    time: "",
    rep: "",
    type: "Roof Replacement",
  });

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // ensure HH:MM:SS
  const formatTime = (time: string) => {
    if (!time) return "";
    return time.length === 5 ? `${time}:00` : time; // if "HH:MM", add ":00"
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    const key = id.replace("f-", "");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Transform flat form into backend format
    const payload = {
      customer: {
        name: form.name,
        email: form.email,
        phone: form.phone,
      },
      location: {
        latitude: 14.22,
        longitude: 66.44,
        postal_code: form.postal_code,
        street_name: form.street_name,
        street_number: form.street_number,
      },
      booking: {
        agentId: Number(form.rep),
        booking_date: form.date,
        booking_time: formatTime(form.time),
      },
    };
    
    console.log(JSON.stringify(payload))

    try {
      const res = await fetch("http://localhost:5001/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to save appointment: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("✅ Appointment saved:", data);

      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error("❌ Error saving appointment:", err);
      alert("Error saving appointment. Please try again.");
    }
  };

  const handleSearchAgents = async () => {
    setLoadingAgents(true);
    console.log("Searching...")
    try {
      const res = await fetch(
        `http://localhost:5000/search?postal_code=${form.postal_code}&booking_date=${form.date}&booking_time=${form.time}`
      );
      const data = await res.json();
      setAgents(data);
    } catch (err) {
      console.error("Error fetching agents:", err);
    } finally {
      setLoadingAgents(false);
    }
  };

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
          {/* Customer Fields */}
          <div>
            <div className="label">Customer Name</div>
            <input
              id="f-name"
              className="input"
              required
              placeholder="Bob"
              value={form.name}
              onChange={handleChange}
            />
          </div>
          <div>
            <div className="label">Customer Email</div>
            <input
              id="f-email"
              className="input"
              type="email"
              required
              placeholder="Bob@example.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <div className="label">Phone</div>
            <input
              id="f-phone"
              className="input"
              type="tel"
              pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
              placeholder="(###) ###-####"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          {/* Address */}
          <div>
            <div className="label">Street Number</div>
            <input
              id="f-street_number"
              className="input"
              placeholder="5580"
              value={form.street_number}
              onChange={handleChange}
            />
          </div>
          <div>
            <div className="label">Street Name</div>
            <input
              id="f-street_name"
              className="input"
              placeholder="Lacklon Lane"
              value={form.street_name}
              onChange={handleChange}
            />
          </div>
          <div className="md:col-span-2">
            <div className="label">Postal Code</div>
            <input
              id="f-postal_code"
              className="input"
              placeholder="BA4 3J7"
              value={form.postal_code}
              onChange={handleChange}
            />
          </div>

          {/* Date + Time */}
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

          {/* Rep (Dropdown + Search Button) */}
          <div className="md:col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <div className="label">Assign Rep</div>
              <select
                id="f-rep"
                className="select w-full"
                value={form.rep}
                onChange={handleChange}
                disabled={loadingAgents || agents.length === 0}
              >
                <option value="">
                  {loadingAgents
                    ? "Searching..."
                    : agents.length > 0
                    ? "Select an agent"
                    : "No agents found"}
                </option>
                {agents.map((agent) => {
                  return (
                    <option key={agent.agentId} value={agent.agentId}>
                      {agent.name}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSearchAgents}
              disabled={!form.postal_code || !form.date || !form.time}
            >
              Search
            </button>
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
