export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 grid place-items-center text-white font-extrabold">
            TG
          </div>
          <div>
            <h1 className="text-lg font-bold leading-5">Triguard Dispatch</h1>
            <p className="text-xs text-gray-500 -mt-0.5">Prototype UI</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button className="tab-btn" aria-selected="true" onClick={() => {console.log("Dispatcher btn clicked")}}>Dispatcher</button>
            <button className="tab-btn" aria-selected="false">Rep</button>
            <button className="tab-btn" aria-selected="false">Reporting</button>
          </div>
        </div>
      </div>
    </header>
  );
}
