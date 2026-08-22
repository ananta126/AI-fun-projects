import { StageClient } from "@/components/investigation/StageClient";
import { QUEST_MODULE } from "@/data/module";

export function generateStaticParams() {
  return QUEST_MODULE.stages.map((stage) => ({ stage: stage.id }));
}

export default async function InvestigatePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  return <StageClient key={stage} stageId={stage} />;
}
