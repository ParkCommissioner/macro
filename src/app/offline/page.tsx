'use client';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-6">
        <svg className="h-20 w-20 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-zinc-100">You&apos;re offline</h1>
      <p className="mb-6 text-zinc-500">Check your connection and try again.</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-emerald-500 px-6 py-3 font-medium text-zinc-900 transition-colors hover:bg-emerald-400"
      >
        Retry
      </button>
    </div>
  );
}
