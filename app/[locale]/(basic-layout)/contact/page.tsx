import LegalLayout from "@/components/gaylyfans/LegalLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — GaylyFans",
  description: "Contact GaylyFans for support, takedowns, or creator inquiries.",
};

export default function ContactPage() {
  return (
    <LegalLayout title="Contact Us">
      <p>We&apos;re here to help. Please reach out using the appropriate channel below.</p>
      <h2>General Inquiries</h2>
      <p>Email: <a href="mailto:hello@gaylyfans.com" className="text-orange-400 hover:text-orange-300">hello@gaylyfans.com</a></p>
      <h2>Content Takedown / DMCA Requests</h2>
      <p>Email: <a href="mailto:takedown@gaylyfans.com" className="text-orange-400 hover:text-orange-300">takedown@gaylyfans.com</a></p>
      <h2>Creator Inquiries</h2>
      <p>Email: <a href="mailto:creators@gaylyfans.com" className="text-orange-400 hover:text-orange-300">creators@gaylyfans.com</a></p>
      <h2>Report Abuse</h2>
      <p>Email: <a href="mailto:abuse@gaylyfans.com" className="text-orange-400 hover:text-orange-300">abuse@gaylyfans.com</a></p>
    </LegalLayout>
  );
}
