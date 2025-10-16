"use client";
import React, { useState } from "react";

import {
  Play,
  CheckCircle,
  ArrowRight,
  Star,
  Crown,
  Loader
} from "lucide-react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

export default function PricingPage() {
  const router = useRouter();
  const [loadingPro, setLoadingPro] = useState(false); // Add this line
  const handlePro = async () => {
    setLoadingPro(true); // Set loading to true when starting
    const stripe = await stripePromise;
    const priceId = "price_1Rl7CuFCQ9u4Yd73k25t32iw";
    const { sessionId } = await fetch("/api/checkout/create-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ priceId }), 
    }).then((res) => res.json());

    const result = await stripe?.redirectToCheckout({ sessionId });

    if (result?.error) {
      console.error(result.error);
    }
    setLoadingPro(false); // Set loading to false when done (success or error)
  };
  const testimonials = [
    {
      name: "Sarah M.",
      role: "TikTok Creator",
      content: "Went from 10K to 100K followers using ReelPilot's AI guidance!",
      rating: 5,
    },
    {
      name: "Mike R.",
      role: "Business Coach",
      content: "My client videos look professional now. Game changer!",
      rating: 5,
    },
    {
      name: "Lisa K.",
      role: "Small Business",
      content:
        "Finally confident on camera. Sales videos converting 3x better!",
      rating: 5,
    },
  ];

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
        <div className="hidden md:flex items-center space-x-8">
          <button
            onClick={() => router.push("/")}
            className="text-gray-300 hover:text-white transition-colors"
          >
            Home
          </button>
          <button
            onClick={() => router.push("/#features")}
            className="text-gray-300 hover:text-white transition-colors"
          >
            Features
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 rounded-full px-6 py-3 mb-8">
            <Crown className="w-5 h-5 text-purple-400" />
            <span className="text-purple-200 font-medium">
              Choose Your Plan
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Start Creating
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {" "}
              Today
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Choose the plan that fits your creative journey. All plans include
            our core AI features.
          </p>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="text-4xl font-bold mb-6">
                $0<span className="text-lg text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Limited scripts</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>3 recordings/month</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Basic camera tips</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Standard export quality</span>
                </li>
              </ul>
              <button
                onClick={() => router.push("/signup")}
                className="w-full py-3 rounded-full border border-white/20 hover:bg-white/10 transition-all duration-300"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/50 transform scale-105 hover:scale-110 transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full text-sm font-bold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-6">
                $9.99<span className="text-lg text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Unlimited scripts</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Unlimited recordings</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>AI performance feedback</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Trend-adaptive prompts</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Export tools</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Priority support</span>
                </li>
              </ul>
              <button
                onClick={handlePro}
                disabled={loadingPro}
                className={`w-full py-3 rounded-full font-bold transition-all duration-300 flex items-center justify-center ${
                  loadingPro
                    ? "bg-gradient-to-r from-purple-600/50 to-pink-600/50 cursor-not-allowed border border-purple-500/30"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 hover:from-purple-400 hover:to-pink-400 transform hover:scale-105"
                }`}
              >
                {!loadingPro ? (
                  "Start Pro Trial"
                ) : (
                  <div className="flex items-center space-x-2">
                    <Loader className="w-5 h-5 animate-spin text-purple-200" />
                    <span className="text-purple-100">Processing...</span>
                  </div>
                )}
              </button>
            </div>

            {/* Studio Plan */}
            <div className="p-8 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <h3 className="text-2xl font-bold mb-2">Studio</h3>
              <div className="text-4xl font-bold mb-6">
                Custom<span className="text-lg text-gray-400"> pricing</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Team collaboration</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Batch scripting</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Dedicated account manager</span>
                </li>
              </ul>
              <button
                onClick={() => router.push("/contact")}
                className="w-full py-3 rounded-full border border-white/20 hover:bg-white/10 transition-all duration-300"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="relative z-10 py-20 px-6 bg-gradient-to-r from-purple-900/10 to-pink-900/10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
            Compare
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {" "}
              Features
            </span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse backdrop-blur-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-xl font-bold">Feature</th>
                  <th className="text-center p-4 text-xl font-bold">Free</th>
                  <th className="text-center p-4 text-xl font-bold bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                    Pro
                  </th>
                  <th className="text-center p-4 text-xl font-bold">Studio</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10">
                  <td className="p-4 text-gray-300">AI Script Generation</td>
                  <td className="text-center p-4">Limited</td>
                  <td className="text-center p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                    Unlimited
                  </td>
                  <td className="text-center p-4">Unlimited</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="p-4 text-gray-300">Video Recordings</td>
                  <td className="text-center p-4">3/month</td>
                  <td className="text-center p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                    Unlimited
                  </td>
                  <td className="text-center p-4">Unlimited</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="p-4 text-gray-300">Real-time Camera Tips</td>
                  <td className="text-center p-4">Basic</td>
                  <td className="text-center p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                    Advanced
                  </td>
                  <td className="text-center p-4">Advanced</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="p-4 text-gray-300">Performance Feedback</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                    ✓
                  </td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="p-4 text-gray-300">Team Collaboration</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                    -
                  </td>
                  <td className="text-center p-4">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Trusted by
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                Creators
              </span>
            </h2>
            <p className="text-xl text-gray-300">
              Join thousands who&apos;ve transformed their content creation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 italic">
                  &quot;{testimonial.content}&quot;
                </p>
                <div>
                  <div className="font-bold">{testimonial.name}</div>
                  <div className="text-purple-400 text-sm">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-20 px-6 bg-gradient-to-r from-purple-900/10 to-pink-900/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
            Frequently Asked
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {" "}
              Questions
            </span>
          </h2>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10">
              <h3 className="text-xl font-bold mb-2">
                Can I upgrade or downgrade anytime?
              </h3>
              <p className="text-gray-300">
                Yes, you can change your plan at any time. Changes take effect
                immediately.
              </p>
            </div>
            <div className="p-6 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10">
              <h3 className="text-xl font-bold mb-2">
                What happens if I cancel?
              </h3>
              <p className="text-gray-300">
                You&apos;ll keep access to Pro features until the end of your
                billing cycle.
              </p>
            </div>
            <div className="p-6 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10">
              <h3 className="text-xl font-bold mb-2">Do you offer refunds?</h3>
              <p className="text-gray-300">
                Yes, we offer a 30-day money-back guarantee on all paid plans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-3xl p-12 border border-purple-500/30">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Start
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                Creating?
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of creators who&apos;ve transformed their content
              with ReelPilot.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button
                onClick={() => router.push("/signup")}
                className="group bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
              >
                <span>Start Free Today</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="text-sm text-gray-400">
                No credit card required
              </div>
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
    </div>
  );
}
