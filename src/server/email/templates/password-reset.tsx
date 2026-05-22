import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
  Section,
} from "@react-email/components"

interface PasswordResetEmailProps {
  userName: string
  resetUrl: string
}

export function PasswordResetEmail({ userName, resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Redefinição de senha — SQLTech Gestão</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
          <Heading style={{ color: "#1a1a2e", fontSize: "24px" }}>
            SQLTech Gestão
          </Heading>
          <Text style={{ color: "#444", fontSize: "16px" }}>
            Olá, <strong>{userName}</strong>! Recebemos uma solicitação para
            redefinir a senha da sua conta.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button
              href={resetUrl}
              style={{
                backgroundColor: "#4f46e5",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "16px",
              }}
            >
              Redefinir senha
            </Button>
          </Section>
          <Text style={{ color: "#888", fontSize: "14px" }}>
            Este link expira em 1 hora. Se você não solicitou a redefinição,
            pode ignorar este email — sua senha não será alterada.
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

export default PasswordResetEmail
