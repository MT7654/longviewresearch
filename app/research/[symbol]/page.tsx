import { ResearchWorkspace } from "./workspace";

export default async function ResearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ fresh?: string }>;
}) {
  const { symbol } = await params;
  const { fresh = "" } = await searchParams;
  return <ResearchWorkspace symbol={decodeURIComponent(symbol)} freshSession={fresh} />;
}
