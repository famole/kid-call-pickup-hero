import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface PasswordResetEmailProps {
  otpCode: string;
  email: string;
}

export const PasswordResetEmail = ({
  otpCode,
  email,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Your password reset code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Password Reset Code</Heading>
        <Text style={text}>
          Hello,
        </Text>
        <Text style={text}>
          We received a request to reset the password for your account ({email}).
        </Text>
        <Text style={text}>
          Use the following code to reset your password:
        </Text>
        <div style={codeContainer}>
          <Text style={code}>{otpCode}</Text>
        </div>
        <Text
          style={{
            ...text,
            color: '#ababab',
            marginTop: '14px',
            marginBottom: '16px',
          }}
        >
          This code will expire in 15 minutes. If you didn&apos;t request a password reset, 
          you can safely ignore this email.
        </Text>
        <Text style={footer}>
          Upsy - School Pickup Management System
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PasswordResetEmail;

const main = {
  backgroundColor: '#ffffff',
};

const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
};

const h1 = {
  color: '#333',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const link = {
  color: '#2754C5',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  textDecoration: 'underline',
};

const text = {
  color: '#333',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  margin: '24px 0',
};

const footer = {
  color: '#898989',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '12px',
  marginBottom: '24px',
};

const codeContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const code = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#2754C5',
  letterSpacing: '8px',
  fontFamily: 'monospace',
};
