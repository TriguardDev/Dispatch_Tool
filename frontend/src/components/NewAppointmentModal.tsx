import { useState } from "react";
import { findLatLong } from "../api/location_conversion";
import AgentSelector from "./AgentSelector";
import { BASE_URL } from "../utils/constants";
import PhoneInput from "./PhoneInput";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh bookings after saving
}

interface Agent {
  distance: string;
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
    city: "",
    state_province: "",
    country: "",    
    date: "",
    time: "",
    rep: "",
    type: "Roof Replacement",
  });

  const [latLon, setLatLon] = useState<{ lat: number | null, lon: number | null }>({ lat: null, lon: null });

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [phoneValid, setPhoneValid] = useState(false)

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

    // Validate phone if provided
    if (form.phone && !phoneValid) {
      alert("Please enter a valid phone number");
      return;
    }
    // Transform flat form into backend format
    const payload = {
      customer: {
        name: form.name,
        email: form.email,
        phone: form.phone,
      },
      location: {
        latitude: latLon.lat,
        longitude: latLon.lon,
        postal_code: form.postal_code,
        street_name: form.street_name,
        street_number: form.street_number,
        city: form.city,
        state_province: form.state_province,
        country: form.country,
      },
      booking: {
        agentId: Number(form.rep),
        booking_date: form.date,
        booking_time: formatTime(form.time),
      },
    };
    
    console.log(JSON.stringify(payload))

    try {
      const res = await fetch(`${BASE_URL}/booking`, {
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
      // First get lat/long
      const { lat, lon } = await findLatLong({street_number: form.street_number, street_name: form.street_name, postal_code: form.postal_code })

      if (lat === null || lon === null){
        console.error("Could not find lat/lon for address.")
        setLatLon({ lat: null, lon: null });
        setAgents([])
      } else{
        setLatLon({ lat, lon });
        const queryParams = new URLSearchParams({
          latitude: lat.toString(),
          longitude: lon.toString(),
          booking_date: form.date,
          booking_time: formatTime(form.time),
        })

        const res = await fetch(`${BASE_URL}/search?${queryParams.toString()}`);
        const data = await res.json();
        setAgents(data);
      }      
    } catch (err) {
      console.error("Error fetching agents:", err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handlePhoneChange = (phoneValue: string) => {
    setForm((prev) => ({ ...prev, phone: phoneValue }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSave}
        className="card bg-gray-900  w-[min(680px,95vw)] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold">New Appointment</h3>
          <button
            type="button"
            className="btn btn-ghost text-gray-300 "
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
            <PhoneInput
              value={form.phone}
              onChange={handlePhoneChange}
              onValidityChange={setPhoneValid}
              placeholder="(123) 456-7890"
              id="f-phone"
              name="phone"
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
          <div>
            <div className="label">City</div>
            <input
              id="f-city"
              className="input"
              placeholder="Bedford"
              value={form.city}
              onChange={handleChange}
            />
          </div>
          <div>
            <div className="label">Province</div>
            <input
              id="f-state_province"
              className="input"
              placeholder="NS"
              value={form.state_province}
              onChange={handleChange}
            />
          </div>
          <div>
            <div className="label">Country</div>
            <input
              id="f-country"
              className="input"
              placeholder="Canada"
              value={form.country}
              onChange={handleChange}
            />
          </div>
          <div>
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
              <AgentSelector
                agents={agents}
                selectedRep={form.rep}
                loading={loadingAgents}
                onChange={(agentId: string) => setForm(prev => ({ ...prev, rep: agentId }))}
                onSearch={handleSearchAgents}
                disabledSearch={!form.postal_code || !form.date || !form.time}
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
