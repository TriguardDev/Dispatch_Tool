import { useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface Agent {
  id: string;
  name: string;
}

export default function NewAppointmentModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState({
    name: "",
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    const key = id.replace("f-", "");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving new appointment:", form);
    onClose();
  };

  // 🔍 Auto-search agents whenever postal_code, date, and time are filled
  useEffect(() => {
    const fetchAgents = async () => {
      if (!form.postal_code || !form.date || !form.time) return;

      setLoadingAgents(true);
      try {
        const res = await fetch(
          `http://localhost:5000/search?postal_code=${form.postal_code}&booking_date=${form.date}&booking_time=${form.time}`
        );
        const data = await res.json();
        setAgents(data);
      } catch (err) {
        console.error("Error fetching agents:", err);
        setAgents([]);
      } finally {
        setLoadingAgents(false);
      }
    };

    fetchAgents();
  }, [form.postal_code, form.date, form.time]);

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
            <div className="label">Phone</div>
            <input
              id="f-phone"
              className="input"
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

          {/* Rep Dropdown (auto-populated) */}
          <div className="md:col-span-2">
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
                  : "No agents available"}
              </option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
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
