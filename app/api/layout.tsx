/** Admin API routes must never serve stale list/detail data from the Next.js data cache. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ApiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
