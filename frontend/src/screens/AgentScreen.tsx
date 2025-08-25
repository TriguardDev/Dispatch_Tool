import TopBar from "../components/TopBar";
import Filters from "../components/Filters";
import QueueCard from "../components/QueueCard";

export default function AgentScreen() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Filters />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <QueueCard title="Queue — Scheduled" badgeColor="bg-blue-50 text-blue-700" count={0} />
          <QueueCard title="En Route / On Site" badgeColor="bg-yellow-50 text-yellow-700" count={0} />
          <QueueCard title="Completed Today" badgeColor="bg-emerald-50 text-emerald-700" count={0} />
        </div>
      </main>
    </div>
  );
}
