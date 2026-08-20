import { generateOutfitParams } from "@/lib/static-params";
import FitAnalysisClient from "./FitAnalysisClient";

export function generateStaticParams() {
  return generateOutfitParams().map(({ id }) => ({ outfitId: id }));
}

export default function FitAnalysisPage({
  params,
}: {
  params: Promise<{ outfitId: string }>;
}) {
  return <FitAnalysisClient params={params} />;
}
