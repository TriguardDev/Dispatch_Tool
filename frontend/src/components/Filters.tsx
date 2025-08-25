interface FiltersProps {
  onNewAppt: () => void;
}

export default function Filters({ onNewAppt }: FiltersProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 flex-1">
        <input type="date" className="input" />
        <select className="select">
          <option value="">All Statuses</option>
          <option>Scheduled</option>
          <option>En Route</option>
          <option>On Site</option>
          <option>Completed</option>
          <option>Canceled</option>
          <option>No Show</option>
        </select>
        <select className="select" />
        <input className="input" placeholder="Search name, address, notes" />
        <select className="select">
          <option value="start">Sort by Start</option>
          <option value="status">Sort by Status</option>
          <option value="rep">Sort by Rep</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={onNewAppt}>+ New Appt</button>
      </div>
    </div>
  );
}
