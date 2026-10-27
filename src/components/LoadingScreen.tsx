export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-[2px] bg-accent animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-[2px] bg-accent animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-[2px] bg-accent animate-bounce" />
      </div>
    </div>
  );
}

export function LoadFailure() {
  return <main className="min-h-screen bg-paper text-ink flex items-center justify-center px-5">
    <div className="max-w-sm space-y-4"><p role="alert">We could not load this page. Check your connection and try again.</p>
      <button className="border border-rule rounded px-4 py-2" onClick={()=>window.location.reload()}>Reload ASHI</button>
    </div>
  </main>;
}
