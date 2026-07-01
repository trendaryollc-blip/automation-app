import { Link } from "wouter";

/**
 * Privacy Policy.
 *
 * Generic SaaS privacy template.  Have it reviewed by a lawyer
 * before publishing in any jurisdiction.  Update the company name,
 * address, contact email, and effective date to match your business.
 */
export default function Privacy() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto rounded-lg border border-border bg-card p-8">
        <Link href="/login" className="text-sm text-primary hover:underline">
          ← Back
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Effective date: 2026-01-01
        </p>

        <Section title="1. What we collect">
          We collect account information (email, name), data you submit through
          the Service (products, orders, suppliers, etc.), and basic technical
          data (IP address, user agent) for security and abuse prevention.
        </Section>

        <Section title="2. How we use it">
          We use this information to provide and improve the Service, to
          authenticate you, to prevent abuse, and to communicate with you about
          your account.
        </Section>

        <Section title="3. Sharing">
          We do not sell your data. We share it only with: (a) service providers
          who help us operate the Service (hosting, email, error monitoring),
          (b) legal authorities when required, or (c) a buyer in a merger or
          acquisition (with notice).
        </Section>

        <Section title="4. Cookies">
          We use a single first-party HTTP-only cookie for session
          authentication. We do not use third-party advertising cookies.
        </Section>

        <Section title="5. Data retention">
          We keep your data for as long as your account is active. You can
          delete your account at any time from Settings, and we will erase your
          data within 30 days (subject to legal retention obligations).
        </Section>

        <Section title="6. Your rights (GDPR / CCPA)">
          You have the right to access, correct, port, and delete your data. Use
          Settings → Account to export or delete your data, or email
          privacy@dropflow.com.
        </Section>

        <Section title="7. Security">
          We use industry-standard safeguards including TLS in transit,
          bcrypt-hashed passwords, hashed password-reset tokens, and
          rate-limited authentication endpoints. No system is 100% secure;
          please use a strong, unique password.
        </Section>

        <Section title="8. International transfers">
          Data may be processed in the United States or the European Union
          depending on the hosting region you select. By using the Service you
          understand your data may be transferred to and processed in these
          locations.
        </Section>

        <Section title="9. Children">
          The Service is not intended for children under 16. We do not knowingly
          collect data from children.
        </Section>

        <Section title="10. Changes">
          We will notify you of material changes by email or in-app banner.
          Continued use after the effective date constitutes acceptance.
        </Section>

        <Section title="11. Contact">
          Questions? Contact us at privacy@dropflow.com.
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground leading-6">{children}</p>
    </section>
  );
}
