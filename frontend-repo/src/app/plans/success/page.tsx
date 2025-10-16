// app/components/SessionStatusChecker.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import {
  Play,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Mail,
  Camera,
  Users,
  Download,
  Loader2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SessionStatusCheckerProps {
  onSessionId: (sessionId: string) => void;
}

function SessionStatusChecker({ onSessionId }: SessionStatusCheckerProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      onSessionId(sessionId);
    }
  }, [sessionId, onSessionId]);

  return null; // This component doesn't render anything visible
}

// Type definition for BeforeInstallPromptEvent (not available as a module)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function SuccessPage() {
  const [status, setStatus] = useState("loading");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  interface CheckoutSession {
    id: string;
    object: string;
    adaptive_pricing: unknown;
    after_expiration: unknown;
    allow_promotion_codes: unknown;
    amount_subtotal: number;
    amount_total: number;
    automatic_tax: {
      enabled: boolean;
      liability: unknown;
      provider: unknown;
      status: unknown;
    };
    billing_address_collection: unknown;
    cancel_url: string;
    client_reference_id: unknown;
    client_secret: unknown;
    collected_information: {
      shipping_details: unknown;
    };
    consent: unknown;
    consent_collection: unknown;
    created: number;
    currency: string;
    currency_conversion: unknown;
    custom_fields: unknown[];
    custom_text: {
      after_submit: unknown;
      shipping_address: unknown;
      submit: unknown;
      terms_of_service_acceptance: unknown;
    };
    customer: string;
    customer_creation: string;
    customer_details: {
      address: {
        city: string | null;
        country: string | null;
        line1: string | null;
        line2: string | null;
        postal_code: string | null;
        state: string | null;
      };
      email: string;
      name: string;
      phone: string | null;
      tax_exempt: string;
      tax_ids: unknown[];
    };
    customer_email: string | null;
    discounts: unknown[];
    expires_at: number;
    invoice: string;
    invoice_creation: unknown;
    livemode: boolean;
    locale: unknown;
    metadata: Record<string, unknown>;
    mode: string;
    origin_context: unknown;
    payment_intent: unknown;
    payment_link: unknown;
    payment_method_collection: string;
    payment_method_configuration_details: unknown;
    payment_method_options: {
      card: {
        request_three_d_secure: string;
      };
    };
    payment_method_types: string[];
    payment_status: string;
    permissions: unknown;
    phone_number_collection: {
      enabled: boolean;
    };
    recovered_from: unknown;
    saved_payment_method_options: {
      allow_redisplay_filters: string[];
      payment_method_remove: string;
      payment_method_save: unknown;
    };
    setup_intent: unknown;
    shipping_address_collection: unknown;
    shipping_cost: unknown;
    shipping_options: unknown[];
    status: string;
    submit_type: unknown;
    subscription: string;
    success_url: string;
    total_details: {
      amount_discount: number;
      amount_shipping: number;
      amount_tax: number;
    };
    ui_mode: string;
    url: unknown;
    wallet_options: unknown;
  }

  // Use useCallback to memoize fetchSessionStatus to avoid unnecessary re-renders
  const fetchSessionStatus = useCallback(async (sessionId: string) => {
    const response = await fetch(
      "/api/checkout/check-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      }
    );

    const {
      session,
      error,
    }: { session: CheckoutSession; error: { message: string } } =
      await response.json();

    if (error) {
      setStatus("failed");
      console.error(error);
      return;
    }
    console.log(session);
    setStatus(session.status);
    setCustomerEmail(session.customer_details.email);
    if (session.status === "complete") {
      // send a req to backend to send email
      try {
        fetch(
          "/api/checkout/send-email",
          {
            method: "POST",
            body: JSON.stringify({
              email: session.customer_details.email,
              customerId: session.customer,
            }),
          }
        );
      } catch (error) {
        console.error("Error sending email:", error);
      }
    }
  }, []); // Empty dependency array means it's created once

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Add this useEffect to listen for the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Add this function to handle the install
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers that don't support PWA installation
      alert(
        'To install this app, please use the browser menu or look for an "Install" option in your browser\'s address bar.'
      );
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear the deferredPrompt so it can be garbage collected
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const nextSteps = [
    {
      icon: <Download className="w-6 h-6" />,
      title: "Download the App",
      description: "Get ReelPilot on your mobile device to start creating",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: <Camera className="w-6 h-6" />,
      title: "Create Your First Video",
      description:
        "Use our AI-powered tools to record your first viral content",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Join the Community",
      description: "Connect with other creators and share your success stories",
      color: "from-green-500 to-emerald-500",
    },
  ];

  const proFeatures = [
    "Unlimited script generation",
    "Real-time AI feedback",
    "Trend-adaptive prompts",
    "Advanced camera tips",
    "Performance analytics",
    "Export tools",
  ];

  // Loading State
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        {/* Animated Background */}
        <div className="fixed inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
        </div>

        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center mb-6">
            <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Processing Your Subscription
          </h1>
          <p className="text-gray-400">
            Please wait while we confirm your payment...
          </p>
        </div>
        <Suspense fallback={null}>
          <SessionStatusChecker onSessionId={fetchSessionStatus} />
        </Suspense>
      </div>
    );
  }

  // Failed State
  if (status === "failed") {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Animated Background */}
        <div className="fixed inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pink-500 to-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
        </div>

        {/* Navigation */}
        <nav className="relative z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/20 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ReelPilot
            </span>
          </div>
        </nav>

        <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-gradient-to-br from-red-900/50 to-pink-900/50 backdrop-blur-sm rounded-3xl p-12 border border-red-500/30">
              <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8">
                <XCircle className="w-12 h-12 text-white" />
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Payment
                <span className="bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                  {" "}
                  Failed
                </span>
              </h1>

              <p className="text-xl text-gray-300 mb-8">
                We couldn&apos;t process your subscription. Please try again or
                contact support if the issue persists.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                <button
                  onClick={() => router.push("/plans")}
                  className="group bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                >
                  <span>Try Again</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => router.push("/support")}
                  className="group border border-white/20 backdrop-blur-sm px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all duration-300 flex items-center space-x-2"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span>Contact Support</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Still include the Suspense boundary here to ensure consistency if the user navigates directly to this failed state */}
        <Suspense fallback={null}>
          <SessionStatusChecker onSessionId={fetchSessionStatus} />
        </Suspense>
      </div>
    );
  }

  // Success State
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/20 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            ReelPilot
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/login")}
            className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
          >
            Go to Dashboard
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div
            className={`transform transition-all duration-1000 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            {/* Success Icon & Badge (aligned) */}
            <div className="flex flex-col items-center mb-8 mt-4">
              <div className="flex items-center space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                {/* Badge */}
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-500/30 rounded-full px-6 py-3">
                  <Sparkles className="w-5 h-5 text-green-400" />
                  <span className="text-green-200 font-medium">
                    Subscription Activated
                  </span>
                </div>
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Welcome to
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                ReelPilot Pro!
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Your subscription is now active. Time to create viral content like
              never before!
            </p>

            {/* Email Confirmation */}
            <div className="flex items-center justify-center space-x-3 mb-12 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20 rounded-full px-8 py-4 max-w-md mx-auto">
              <Mail className="w-5 h-5 text-purple-400" />
              <span className="text-gray-300">
                Account Details sent to{" "}
                <span className="text-purple-400 font-semibold ">
                  {customerEmail}
                </span>
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
              <button
                onClick={() => router.push("/login")}
                className="group bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
              >
                <span>Start Creating</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={handleInstallClick}
                className="group border border-white/20 backdrop-blur-sm px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all duration-300 flex items-center space-x-2"
                disabled={!isInstallable}
              >
                <Download className="w-5 h-5" />
                <span>
                  {isInstallable ? "Install App" : "App Available in Browser"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pro Features Section */}
      <section className="relative z-10 py-20 px-6 bg-gradient-to-r from-purple-900/10 to-pink-900/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              You Now Have Access To
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                Everything
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Your Pro subscription unlocks all the tools you need to create
              viral content
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {proFeatures.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl backdrop-blur-sm bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium">{feature}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Next Steps Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              What&apos;s
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                Next?
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Get started with these simple steps to maximize your ReelPilot
              experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {nextSteps.map((step, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
              >
                <div className="text-center">
                  <div
                    className={`w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="relative z-10 py-20 px-6 bg-gradient-to-r from-purple-900/10 to-pink-900/10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-3xl p-12 border border-purple-500/30">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Need Help Getting Started?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Our support team is here to help you make the most of your
              ReelPilot Pro subscription.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button
                onClick={() => router.push("/support")}
                className="group bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
              >
                <span>Contact Support</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => router.push("/docs")}
                className="group border border-white/20 backdrop-blur-sm px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all duration-300 flex items-center space-x-2"
              >
                <span>View Documentation</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-6 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                ReelPilot
              </span>
            </div>
            <div className="flex items-center space-x-8 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Support
              </a>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400">
            <p>
              &copy; 2025 ReelPilot. All rights reserved. Create. Share. Go
              Viral.
            </p>
          </div>
        </div>
      </footer>
      {/* The Suspense boundary around SessionStatusChecker ensures that the rest of the page can render
      while the searchParams are being resolved on the client side. */}
      <Suspense fallback={null}>
        <SessionStatusChecker onSessionId={fetchSessionStatus} />
      </Suspense>
    </div>
  );
}
