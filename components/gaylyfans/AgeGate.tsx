"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAgeGate } from "@/stores/ageGateStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

const bgImages = ["/bg-anime-1.png", "/bg-real-1.png", "/bg-anime-2.png", "/bg-real-2.png"];

export default function AgeGate() {
  const setVerified = useAgeGate((s) => s.setVerified);
  const router = useRouter();
  const [birthYear, setBirthYear] = useState("2000");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  const currentYear = new Date().getFullYear();
  const isOldEnough = birthYear !== "" && currentYear - parseInt(birthYear) >= 18;
  const canEnter = isOldEnough && agreedTerms;

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((i) => (i + 1) % bgImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const years: string[] = [];
  for (let y = currentYear - 18; y >= 1930; y--) {
    years.push(String(y));
  }

  return (
    <main className="fixed inset-0 z-50 overflow-y-auto bg-black">
      {bgImages.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${src})`,
            opacity: i === bgIndex ? 0.3 : 0,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
      <div className="relative flex min-h-dvh flex-col items-center justify-center py-8">
        <Card className="mx-4 max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <img src="/logo-gooey.png" alt="GaylyFans" className="h-24 w-auto" />
            <h1 className="text-xl font-bold text-white text-center">Welcome</h1>
            <p className="text-sm text-zinc-400 text-center">
              Before entering, please confirm the following:
            </p>

            <div className="w-full space-y-3">
              <Card className="bg-zinc-800 border-zinc-700">
                <CardContent className="flex gap-3 p-4">
                  <span className="text-2xl mt-0.5">🔞</span>
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-sm text-white">I am 18 years or older</p>
                    <p className="text-xs text-zinc-400">
                      This site contains adult-oriented content intended for mature audiences only.
                    </p>
                    <Select value={birthYear} onValueChange={setBirthYear}>
                      <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white">
                        <SelectValue placeholder="Select your birth year" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                        {years.map((y) => (
                          <SelectItem key={y} value={y} className="text-white hover:bg-zinc-700">
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {birthYear && !isOldEnough && (
                      <p className="text-xs text-red-400">You must be at least 18 years old.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-800 border-zinc-700">
                <CardContent className="flex gap-3 p-4">
                  <span className="text-2xl mt-0.5">🏳️‍🌈</span>
                  <div>
                    <p className="font-medium text-sm text-white">I want to view gay NSFW content</p>
                    <p className="text-xs text-zinc-400">
                      This site features NSFW adult content created for and by gay men.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-800 border-zinc-700">
                <CardContent className="flex gap-3 p-4">
                  <span className="text-2xl mt-0.5">🌍</span>
                  <div>
                    <p className="font-medium text-sm text-white">My location allows me to view this content</p>
                    <p className="text-xs text-zinc-400">
                      You are responsible for ensuring that accessing this content is legal in your jurisdiction.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2 items-start w-full">
              <Checkbox
                checked={agreedTerms}
                onCheckedChange={(v) => setAgreedTerms(v === true)}
                className="mt-0.5 cursor-pointer border-zinc-500"
              />
              <p className="text-xs text-zinc-400">
                I agree to the{" "}
                <Link href="/terms" className="text-orange-400 hover:text-orange-300 underline" target="_blank">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-orange-400 hover:text-orange-300 underline" target="_blank">
                  Privacy Policy
                </Link>
              </p>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-orange-500 via-purple-500 to-blue-500 hover:opacity-90 text-white font-semibold"
              size="lg"
              disabled={!canEnter}
              onClick={() => {
                if (canEnter) {
                  setVerified(true);
                  router.push("/");
                }
              }}
            >
              I Confirm All of the Above — Enter
            </Button>

            <a
              href="https://google.com"
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              No, take me away
            </a>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-center gap-3 mt-6 text-xs text-zinc-500">
          <Link href="/about" className="hover:text-zinc-300">About</Link>
          <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-300">Terms</Link>
          <Link href="/content-policy" className="hover:text-zinc-300">Content Policy</Link>
          <Link href="/contact" className="hover:text-zinc-300">Contact</Link>
        </div>
      </div>
    </main>
  );
}
