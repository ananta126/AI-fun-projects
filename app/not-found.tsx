import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">404</p>
        <h1 className="mt-2 font-serif text-3xl">File not on this desk</h1>
        <Link href="/" className="mt-4 inline-block text-sm text-teal">
          Return to QuestBank
        </Link>
      </div>
    </div>
  );
}
