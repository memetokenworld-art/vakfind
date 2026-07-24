import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProfileSetupForm } from "@/components/ProfileSetupForm";

export default function ProfileSetupPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="px-6 py-14">
        <Suspense fallback={<p className="text-center text-sm text-gray-400">Laden…</p>}>
          <ProfileSetupForm />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
