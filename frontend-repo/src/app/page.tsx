"use client"
import React, { useState, useEffect } from "react";
import {
  Play,
  Camera,
  Zap,
  Users,
  Star,
  ArrowRight,
  CheckCircle,
  Sparkles,
  TrendingUp,
  Eye,
  Mic,
  Timer,
  Award,
  Loader
} from "lucide-react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");


export default function ReelPilotHomepage() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
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
  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Mic className="w-6 h-6" />,
      text: "Script Teleprompter",
      color: "from-purple-500 to-pink-500",
      description:
        "Upload or generate a script, and AI adjusts the scroll speed based on speech, keeping users on track without rushing or experiencing long pauses.",
    },
    {
      icon: <Camera className="w-6 h-6" />,
      text: "Scene-by-Scene Filming",
      color: "from-blue-500 to-cyan-500",
      description:
        "Break scripts into segments and guides you through each part so you don't get overwhelmed or forget lines.",
    },
    {
      icon: <Eye className="w-6 h-6" />,
      text: "Real-Time Camera Tips",
      color: "from-green-500 to-emerald-500",
      description:
        "Uses front camera + AI to give real-time tips like “center yourself more,” “lighting is too harsh,” or “raise camera angle.”",
    },
    {
      icon: <Award className="w-6 h-6" />,
      text: "Performance Feedback",
      color: "from-orange-500 to-red-500",
      description:
        "After each take, we provide basic feedback like filler word usage, tone consistency, or excessive pauses.",
    },
    {
      icon: <Timer className="w-6 h-6" />,
      text: "Instant Clip Review",
      color: "from-indigo-500 to-purple-500",
      description:
        "After filming, you can keep the best takes, automatically label clips, and prepare them for editing apps.",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      text: "Trend-Adaptive Prompts",
      color: "from-pink-500 to-rose-500",
      description:
        "Pulls from TikTok/Instagram trends to auto-generate hooks or outlines for specific niches.",
    },
  ];

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
          <a
            href="#features"
            className="text-gray-300 hover:text-white transition-colors cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("features")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-gray-300 hover:text-white transition-colors cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("pricing")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Pricing
          </a>
          <button
            onClick={() => router.push("/signup")}
            className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
          >
            Get Started
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
            <div className="mt-4 inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 rounded-full px-6 py-3 mb-8">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-purple-200 font-medium">
                AI-Powered Video Creation
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
              Create Viral
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                Content
              </span>
              <br />
              Like a Pro
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              AI-powered assistant that helps creators record high-quality,
              on-camera videos with real-time guidance, performance feedback,
              and trending insights.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
              <button
                onClick={() => router.push("/signup")}
                className="group bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
              >
                <span>Start Creating Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="group border border-white/20 backdrop-blur-sm px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all duration-300 flex items-center space-x-2">
                <Play className="w-5 h-5" />
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  10K+
                </div>
                <div className="text-gray-400">Creators</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  1M+
                </div>
                <div className="text-gray-400">Videos Created</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  95%
                </div>
                <div className="text-gray-400">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Features Showcase */}
      <section id="features" className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              AI That Actually
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                Helps
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Stop guessing. Start creating with AI guidance that adapts to your
              style and goals.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-2xl backdrop-blur-sm border transition-all duration-500 cursor-pointer transform hover:scale-105 ${
                    currentFeature === index
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 shadow-lg shadow-purple-500/25"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                  onClick={() => setCurrentFeature(index)}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-3 rounded-full bg-gradient-to-r ${feature.color}`}
                    >
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {feature.text}
                      </h3>
                      <p className="text-gray-400">
                        {index === 0 &&
                          "Upload scripts or let AI generate them, synced to your voice"}
                        {index === 1 &&
                          "Break content into manageable segments for perfect takes"}
                        {index === 2 &&
                          "AI detects framing, lighting, and positioning issues live"}
                        {index === 3 &&
                          "Get feedback on filler words, tone, and pacing"}
                        {index === 4 &&
                          "Review, save, and label your best takes instantly"}
                        {index === 5 &&
                          "Access trending scripts and hooks for viral content"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-3xl p-8 border border-purple-500/30">
                <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl flex items-center justify-center mb-6">
                  <div className="text-center">
                    <div
                      className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${features[currentFeature].color} flex items-center justify-center`}
                    >
                      {features[currentFeature].icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">
                      {features[currentFeature].text}
                    </h3>
                    <p className="text-gray-400">
                      {features[currentFeature].description}
                    </p>
                  </div>
                </div>
                <div className="flex justify-center space-x-2">
                  {features.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        currentFeature === index
                          ? "bg-purple-500"
                          : "bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="relative z-10 py-20 px-6 bg-gradient-to-r from-purple-900/10 to-pink-900/10">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-12">
            Perfect for
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {" "}
              Every Creator
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: "Social Media Stars",
                desc: "TikTok, Instagram Reels, YouTube Shorts creators",
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Coaches & Influencers",
                desc: "Build authority with professional-looking content",
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Business Owners",
                desc: "Create marketing videos that convert customers",
              },
              {
                icon: <Camera className="w-8 h-8" />,
                title: "New YouTubers",
                desc: "Start your channel with confidence and quality",
              },
            ].map((audience, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
              >
                <div className="text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                  {audience.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{audience.title}</h3>
                <p className="text-gray-400">{audience.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Creators Love
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                ReelPilot
              </span>
            </h2>
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

      {/* Pricing */}
      <section
        id="pricing"
        className="relative z-10 py-20 px-6 bg-gradient-to-r from-purple-900/10 to-pink-900/10"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Start Creating
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                Today
              </span>
            </h2>
            <p className="text-xl text-gray-300">
              Choose the plan that fits your creative journey
            </p>
          </div>

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
                  <span>Priority support</span>
                </li>
              </ul>
              <button className="w-full py-3 rounded-full border border-white/20 hover:bg-white/10 transition-all duration-300">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-3xl p-12 border border-purple-500/30">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to Create
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                Viral Content?
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of creators who&apos;ve transformed their content
              game with AI-powered video assistance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button   onClick={() => router.push("/signup")} className="group bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2">
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
