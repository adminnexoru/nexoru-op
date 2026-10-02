import Link from "next/link";
import { notFound } from "next/navigation";
import { ConformancePanel } from "@/components/portfolio/conformance-panel";
import { HistoryCard } from "@/components/portfolio/history-card";
import { ManifestCard } from "@/components/portfolio/manifest-card";
import { ReadErrors } from "@/components/portfolio/read-errors";
import { RoadmapTable } from "@/components/portfolio/roadmap-table";
import { RepositoryCard } from "@/components/portfolio/repository-card";
import { getPortfolio } from "@/lib/portfolio/snapshot";

// T040: detail of one project (US2, contracts/ui.md "GET /projects/[folder]").
// `folder` is only looked up by exact match in the index: it is NEVER used as a filesystem path.

function decode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export default async function ProjectPage({ params }: PageProps<"/projects/[folder]">) {
  const folder = decode((await params).folder);
  const portfolio = await getPortfolio();
  const project = portfolio.projects.find((p) => p.folder === folder);
  if (!project) notFound();

  return (
    <section className="grid gap-6">
      <header className="grid gap-1">
        <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          ← Portafolio
        </Link>
        <h1 className="text-2xl font-semibold">{project.manifest?.nombre ?? project.folder}</h1>
        <p className="font-mono text-sm text-muted-foreground">{project.folder}</p>
      </header>
      <ConformancePanel project={project} />
      <RoadmapTable roadmap={project.roadmap} />
      <div className="grid gap-6 md:grid-cols-2">
        <ManifestCard project={project} />
        <RepositoryCard git={project.git} />
      </div>
      <HistoryCard project={project} />
      <ReadErrors errors={project.readErrors} />
    </section>
  );
}
