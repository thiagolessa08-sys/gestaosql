import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface InviteEmailProps {
  invitedByName: string
  projectName: string
  role: string
  inviteUrl: string
}

export function InviteEmail({
  invitedByName,
  projectName,
  role,
  inviteUrl,
}: InviteEmailProps) {
  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador",
    SCRUM_MASTER: "Scrum Master",
    MEMBER: "Membro",
  }

  return (
    <Html>
      <Head />
      <Preview>Você foi convidado para o projeto {projectName}</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
          <Heading style={{ color: "#1a1a2e", fontSize: "24px" }}>
            SQLTech Gestão
          </Heading>
          <Text style={{ color: "#444", fontSize: "16px" }}>
            Olá! <strong>{invitedByName}</strong> convidou você para participar
            do projeto <strong>{projectName}</strong> como{" "}
            <strong>{roleLabels[role] ?? role}</strong>.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button
              href={inviteUrl}
              style={{
                backgroundColor: "#4f46e5",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "16px",
              }}
            >
              Aceitar convite
            </Button>
          </Section>
          <Text style={{ color: "#888", fontSize: "14px" }}>
            Este link expira em 7 dias. Se você não esperava este convite, pode
            ignorar este email.
          </Text>
          <Hr style={{ borderColor: "#e0e0e0" }} />
          <Text style={{ color: "#aaa", fontSize: "12px" }}>
            SQLTech Gestão — Sistema de Gerenciamento de Sprints
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InviteEmail
