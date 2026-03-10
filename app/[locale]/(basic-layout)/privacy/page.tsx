import LegalLayout from "@/components/gaylyfans/LegalLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — GaylyFans",
  description: "How GaylyFans collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p><strong>Last updated:</strong> February 22, 2026</p>
      <h2>1. Information We Collect</h2>
      <p>We collect minimal information: browser type, pages visited, device type, and anonymized IP address.</p>
      <h2>2. How We Use Your Information</h2>
      <p>To provide and improve the service, analyze usage, ensure compliance, and prevent abuse.</p>
      <h2>3. Cookies</h2>
      <p>We use essential cookies for age verification and analytics cookies to understand usage. You can disable cookies in your browser.</p>
      <h2>4. Third-Party Services</h2>
      <p>We use Vercel (hosting), analytics services, and content delivery networks with their own privacy policies.</p>
      <h2>5. Data Retention</h2>
      <p>We retain anonymized analytics data for up to 12 months. We do not sell your data.</p>
      <h2>6. Your Rights</h2>
      <p>You may request access to, deletion of, or opt out of tracking your personal data.</p>
      <h2>7. Contact</h2>
      <p>For privacy inquiries, visit our <a href="/contact" className="text-orange-400 hover:text-orange-300">Contact page</a>.</p>
    </LegalLayout>
  );
}
