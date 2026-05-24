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

interface CardAssignedEmailProps {
  recipientName: string
  cardTitle: string
  projectName: string
  cardUrl: string
}

export function CardAssignedEmail({
  recipientName,
  cardTitle,
  projectName,
  cardUrl,
}: CardAssignedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Card atribuído: {cardTitle}</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
          <Heading style={{ color: "#1a1a2e", fontSize: "24px" }}>
            Card atribuído a você
          </Heading>
          <Text style={{ color: "#444", fontSize: "16px" }}>
            Olá {recipientName}, o card <strong>{cardTitle}</strong> no projeto{" "}
            <strong>{projectName}</strong> foi atribuído a você.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button
              href={cardUrl}
              style={{
                backgroundColor: "#4f46e5",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "16px",
              }}
            >
              Ver card
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

export default CardAssignedEmail
