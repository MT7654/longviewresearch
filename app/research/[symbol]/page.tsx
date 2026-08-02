import { ResearchWorkspace } from "./workspace";

export default async function ResearchPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <ResearchWorkspace symbol={decodeURIComponent(symbol)} />;
}
