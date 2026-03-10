import LegalLayout from "@/components/gaylyfans/LegalLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — GaylyFans",
  description: "Learn about GaylyFans — a safe gay adult video platform.",
};

export default function AboutPage() {
  return (
    <LegalLayout title="About GaylyFans">
      <h2>What is GaylyFans?</h2>
      <p>
        GaylyFans is a TikTok-style vertical video feed designed specifically for gay men.
        We provide a seamless, mobile-first browsing experience for curated adult content
        from verified creators.
      </p>
      <h2>Our Mission</h2>
      <p>
        We believe in creating a safe, legal, and respectful space for gay adult content.
        Every video on GaylyFans comes from verified creators who have given explicit consent.
      </p>
      <h2>How It Works</h2>
      <ul>
        <li><strong>Swipe to discover:</strong> Browse our vertical feed just like TikTok</li>
        <li><strong>Rate & compare:</strong> Rate AI-generated video variants and earn credits</li>
        <li><strong>Generate:</strong> Create your own AI videos using credits</li>
        <li><strong>Verified creators:</strong> Every creator goes through identity verification</li>
      </ul>
      <h2>Safety First</h2>
      <p>
        GaylyFans implements age verification, strict content moderation, and creator
        verification to ensure a safe experience.
      </p>
      <h2>Contact</h2>
      <p>
        Questions? Visit our{" "}
        <a href="/contact" className="text-orange-400 hover:text-orange-300">Contact page</a>.
      </p>
    </LegalLayout>
  );
}
