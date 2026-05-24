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

interface SprintStartedEmailProps {
  recipientName: string
  sprintName: string
  projectName: string
  boardUrl: string
}

export function SprintStartedEmail({
  recipientName,
  sprintName,
  projectName,
  boardUrl,
}: SprintStartedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sprint iniciada: {sprintName}</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
          <Heading style={{ color: "#1a1a2e", fontSize: "24px" }}>
            Sprint iniciada
          </Heading>
          <Text style={{ color: "#444", fontSize: "16px" }}>
            Olá {recipientName}, a sprint <strong>{sprintName}</strong> do projeto{" "}
            <strong>{projectName}</strong> foi iniciada.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button
              href={boardUrl}
              style={{
                backgroundColor: "#4f46e5",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "16px",
              }}
            >
              Ver board
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

export default SprintStartedEmail
