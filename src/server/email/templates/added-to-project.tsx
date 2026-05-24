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

interface AddedToProjectEmailProps {
  recipientName: string
  projectName: string
  role: string
  projectUrl: string
}

export function AddedToProjectEmail({
  recipientName,
  projectName,
  role,
  projectUrl,
}: AddedToProjectEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Você foi adicionado ao projeto: {projectName}</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
          <Heading style={{ color: "#1a1a2e", fontSize: "24px" }}>
            Bem-vindo ao projeto
          </Heading>
          <Text style={{ color: "#444", fontSize: "16px" }}>
            Olá {recipientName}, você foi adicionado ao projeto{" "}
            <strong>{projectName}</strong> como <strong>{role}</strong>.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button
              href={projectUrl}
              style={{
                backgroundColor: "#4f46e5",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "16px",
              }}
            >
              Ver projeto
            </Button>
          </Section>
          <Hr style={{ borderColor: "#e0e0e0" }} />
          <Text style={{ color: "#aaa", fontSize: "12px" }}>
            SQLTech Gestão — Sistema de Gerenciamento de Sprints
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default AddedToProjectEmail
