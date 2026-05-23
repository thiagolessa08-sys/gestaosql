import { notFound, redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import { findProjectBySlug } from "@/server/repositories/projects"
import { ConfiguracoesForm } from "@/components/projects/ConfiguracoesForm"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ConfiguracoesPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug } = await params
  const project = await findProjectBySlug(slug)
  if (!project) notFound()

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Configurações do projeto</h1>
      <ConfiguracoesForm project={project} />
    </div>
  )
}
