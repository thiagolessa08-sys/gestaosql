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

interface CardCommentedEmailProps {
  recipientName: string
  authorName: string
  cardTitle: string
  commentBody: string
  cardUrl: string
}

export function CardCommentedEmail({
  recipientName,
  authorName,
  cardTitle,
  commentBody,
  cardUrl,
}: CardCommentedEmailProps) {
  const truncated =
    commentBody.length > 200 ? commentBody.slice(0, 200) + "..." : commentBody

  return (
    <Html>
      <Head />
      <Preview>Novo comentário em: {cardTitle}</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
          <Heading style={{ color: "#1a1a2e", fontSize: "24px" }}>
            Novo comentário no card
          </Heading>
          <Text style={{ color: "#444", fontSize: "16px" }}>
            Olá {recipientName}, <strong>{authorName}</strong> comentou no card{" "}
            <strong>{cardTitle}</strong>:
          </Text>
          <Text
            style={{
              color: "#555",
              fontSize: "15px",
              backgroundColor: "#f0f0f5",
              padding: "12px 16px",
              borderRadius: "6px",
              borderLeft: "4px solid #4f46e5",
              margin: "0 0 24px",
            }}
          >
            {truncated}
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
              Ver comentário
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

export default CardCommentedEmail
