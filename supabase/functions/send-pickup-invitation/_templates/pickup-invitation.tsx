import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PickupInvitationEmailProps {
  invitedName: string
  inviterName: string
  studentNames: string
  startDate: string
  endDate: string
  role: string
  acceptUrl: string
  expiresAt: string
}

export const PickupInvitationEmail = ({
  invitedName,
  inviterName,
  studentNames,
  startDate,
  endDate,
  role,
  acceptUrl,
  expiresAt,
}: PickupInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>Invitación para autorización de recogida de estudiantes</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header with Logo */}
        <Section style={header}>
          <Img
            src="https://164bb4c6-3e1e-44df-b3a2-7094f661598c.sandbox.lovable.dev/assets/upsy_logo.png"
            width="80"
            height="80"
            alt="Upsy Logo"
            style={logo}
          />
          <Heading style={h1}>Upsy</Heading>
          <Text style={tagline}>Gestión escolar simplificada</Text>
        </Section>
        
        {/* Main Content */}
        <Section style={content}>
          <Heading style={h2}>Invitación de Autorización de Recogida</Heading>
          
          <Text style={greeting}>Hola <strong>{invitedName}</strong>,</Text>
          
          <Text style={text}>
            <strong>{inviterName}</strong> te ha invitado a autorizar la recogida de{' '}
            {studentNames || 'sus hijos'} en el colegio.
          </Text>
          
          {/* Details Card */}
          <Section style={detailsCard}>
            <Heading style={cardTitle}>Detalles de la Autorización</Heading>
            <Text style={detailItem}><strong>Estudiantes:</strong> {studentNames}</Text>
            <Text style={detailItem}><strong>Fecha de inicio:</strong> {startDate}</Text>
            <Text style={detailItem}><strong>Fecha de fin:</strong> {endDate}</Text>
            <Text style={detailItem}><strong>Rol:</strong> {role === 'family' ? 'Familiar' : 'Otro'}</Text>
          </Section>
          
          <Text style={text}>
            Para aceptar esta invitación y poder recoger a los estudiantes, 
            haz clic en el siguiente botón:
          </Text>
          
          {/* CTA Section */}
          <Section style={buttonContainer}>
            <Link href={acceptUrl} style={button}>
              Aceptar Invitación
            </Link>
          </Section>
          
          <Text style={linkText}>
            Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:
          </Text>
          <Text style={urlText}>
            <Link href={acceptUrl} style={link}>{acceptUrl}</Link>
          </Text>
          
          <Text style={expiryText}>
            Esta invitación expirará el {expiresAt}.
          </Text>
        </Section>
        
        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            <strong>Upsy</strong> - Gestión escolar simplificada<br />
            Este mensaje fue enviado por el sistema de gestión escolar.<br />
            Si no esperabas recibir este correo, puedes ignorarlo de forma segura.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default PickupInvitationEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
}

const header = {
  padding: '32px 24px 24px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e5e7eb',
}

const logo = {
  margin: '0 auto 16px',
  borderRadius: '50%',
}

const h1 = {
  color: '#2563eb',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const tagline = {
  color: '#6b7280',
  fontSize: '16px',
  margin: '0',
  textAlign: 'center' as const,
}

const content = {
  padding: '32px 24px',
}

const h2 = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

const greeting = {
  color: '#111827',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
}

const detailsCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const cardTitle = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px',
}

const detailItem = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 8px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1)',
}

const linkText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '24px 0 8px',
}

const urlText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 24px',
  wordBreak: 'break-all' as const,
}

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
}

const expiryText = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '24px 0 0',
  textAlign: 'center' as const,
}

const footer = {
  borderTop: '1px solid #e5e7eb',
  padding: '24px',
  backgroundColor: '#f9fafb',
}

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '0',
}