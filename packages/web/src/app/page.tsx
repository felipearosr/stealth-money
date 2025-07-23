"use client";

import { TransferCalculator } from "@/components/features/TransferCalculator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import { ArrowRight, Shield, Zap, Globe, CheckCircle, Star } from "lucide-react";
import { Calculator, UserPlus, CreditCard, Rocket } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Stealth Money
              </h1>
            </div>
            <Navigation />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <a href="https://www.circle.com/" target="_blank" rel="noopener noreferrer" className="inline-flex">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  <Zap className="w-4 h-4 mr-2" />
                  Powered by Circle
                </div>
              </a>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Send Money
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Anywhere, Instantly
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                The fastest, most secure way to transfer money globally. No hidden fees,
                real-time exchange rates, and blockchain-powered security.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">$2.1B+</div>
                <div className="text-sm text-gray-600">Transferred</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">150+</div>
                <div className="text-sm text-gray-600">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">45s</div>
                <div className="text-sm text-gray-600">Avg. Time</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Start Transfer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-gray-300">
                Watch Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center space-x-6 pt-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">Bank-level Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-600">Regulated & Licensed</span>
              </div>
            </div>
          </div>

          {/* Right Content - Transfer Calculator */}
          <div className="lg:pl-8">
            <div className="relative">
              {/* Background decoration */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-2xl blur-xl"></div>
              <div className="relative">
                <TransferCalculator />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Why Choose Stealth Money?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built with cutting-edge technology to provide the fastest, most secure money transfers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mx-auto">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Lightning Fast</h3>
                <p className="text-gray-600">
                  Transfers complete in under 45 seconds with our blockchain-powered infrastructure
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Bank-Level Security</h3>
                <p className="text-gray-600">
                  Military-grade encryption and blockchain technology keep your money safe
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mx-auto">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Global Reach</h3>
                <p className="text-gray-600">
                  Send money to 150+ countries with real-time exchange rates
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple, secure, and transparent money transfers in four easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Enter Amount</h3>
              <p className="text-gray-600">
                Enter the amount and select currencies. Get real-time exchange rates instantly.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Recipient Details</h3>
              <p className="text-gray-600">
                Add recipient information and choose how they should receive the money.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Secure Payment</h3>
              <p className="text-gray-600">
                Pay securely with your card. Your payment is protected by bank-level security.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Money Delivered</h3>
              <p className="text-gray-600">
                Funds are released via blockchain and delivered to your recipient instantly.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* How It Works -- UPGRADED SECTION */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Get Started in Minutes
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              From Your Screen to Their Bank in 4 Simple Steps
            </p>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We've redesigned international money transfers to be fast, fair, and incredibly easy. Here’s how your journey looks:
            </p>
          </div>

          <div className="relative">
            {/* Desktop Connector Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gray-300 transform -translate-y-1/2">
              <div className="absolute top-0 left-0 w-full h-full border-t-2 border-dashed border-gray-300"></div>
            </div>

            <div className="relative grid md:grid-cols-4 gap-x-8 gap-y-12">
              {/* Step 1 */}
              <div className="text-center">
                <div className="relative">
                  <div className="relative w-20 h-20 bg-white border-4 border-blue-600 rounded-full flex items-center justify-center mx-auto z-10">
                    <Calculator className="w-10 h-10 text-blue-600" />
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-900">1. Calculate Your Transfer</h3>
                <p className="mt-2 text-gray-600">
                  Tell us how much to send. You’ll instantly see our real-time exchange rate with zero hidden markups.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                 <div className="relative">
                  <div className="relative w-20 h-20 bg-white border-4 border-blue-600 rounded-full flex items-center justify-center mx-auto z-10">
                    <UserPlus className="w-10 h-10 text-blue-600" />
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-900">2. Add Recipient</h3>
                <p className="mt-2 text-gray-600">
                  Provide the recipient’s details. All we need is their name and bank information to ensure the money gets to the right person.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="relative">
                  <div className="relative w-20 h-20 bg-white border-4 border-blue-600 rounded-full flex items-center justify-center mx-auto z-10">
                    <CreditCard className="w-10 h-10 text-blue-600" />
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-900">3. Fund Your Transfer</h3>
                <p className="mt-2 text-gray-600">
                  Pay securely with your card. Your payment is protected by Circle's PCI-compliant infrastructure.
                </p>
              </div>
              
              {/* Step 4 */}
              <div className="text-center">
                 <div className="relative">
                  <div className="relative w-20 h-20 bg-white border-4 border-blue-600 rounded-full flex items-center justify-center mx-auto z-10">
                    <Rocket className="w-10 h-10 text-blue-600" />
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-900">4. Funds Arrive Instantly</h3>
                <p className="mt-2 text-gray-600">
                  Our blockchain rails bypass traditional systems, delivering the funds to your recipient in under a minute.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works -- OPTION 2: Focused Grid */}
      <section id="how-it-works" className="py-24 bg-gradient-to-br from-slate-50 to-blue-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              How It Works
            </h2>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              A Radically Simple Way to Send Money
            </p>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
              Three steps, under a minute. That's all it takes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">

            {/* Step 1 */}
            <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-t-4 border-blue-600">
              <CardContent className="p-8">
                <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-4xl font-extrabold text-blue-600">1</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Calculate & See Rate</h3>
                <p className="mt-2 text-gray-600">
                  Enter an amount and get a guaranteed real-time exchange rate.
                </p>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-t-4 border-blue-600">
              <CardContent className="p-8">
                <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-4xl font-extrabold text-blue-600">2</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Add Recipient & Pay</h3>
                <p className="mt-2 text-gray-600">
                  Provide recipient details and pay securely with your card in seconds.
                </p>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-t-4 border-blue-600">
              <CardContent className="p-8">
                <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-4xl font-extrabold text-blue-600">3</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Money Arrives Instantly</h3>
                <p className="mt-2 text-gray-600">
                  Our blockchain tech delivers funds directly, bypassing slow bank delays.
                </p>
              </CardContent>
            </Card>
            
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Trusted by Thousands
            </h2>
            <div className="flex items-center justify-center space-x-2">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-gray-600">4.9/5 from 2,847 reviews</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 space-y-4">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600">
                  &quot;Fastest money transfer I&apos;ve ever used. My family in Brazil received the money in under a minute!&quot;
                </p>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">MR</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Maria Rodriguez</div>
                    <div className="text-sm text-gray-600">Small Business Owner</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 space-y-4">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600">
                  &quot;The transparency is amazing. I can see exactly where my money is at every step of the process.&quot;
                </p>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">JC</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">James Chen</div>
                    <div className="text-sm text-gray-600">Software Engineer</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 space-y-4">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600">
                  &quot;Finally, a money transfer service that doesn&apos;t have hidden fees. What you see is what you pay.&quot;
                </p>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">SP</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Sarah Patel</div>
                    <div className="text-sm text-gray-600">Freelancer</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to Send Money Globally?
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Join thousands of users who trust Stealth Money for their international transfers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Start Your Transfer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
