interface QueueCardProps {
  title: string;
  badgeColor: string;
  count: number;
  children?: React.ReactNode;
}

export default function QueueCard({ title, badgeColor, count, children }: QueueCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <span className={`badge ${badgeColor}`}>{count}</span>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-auto scroll-slim">
        {children || <p className="text-sm text-gray-400">No items yet</p>}
      </div>
    </div>
  );
}
