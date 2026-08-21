import { StageClient } from "@/components/investigation/StageClient";

export default async function InvestigatePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  return <StageClient key={stage} stageId={stage} />;
}
