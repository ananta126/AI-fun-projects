import { generateBoardParams } from "@/lib/static-params";
import BoardPageClient from "./BoardPageClient";

export function generateStaticParams() {
  return generateBoardParams();
}

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <BoardPageClient params={params} />;
}
