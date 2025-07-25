"use client";

import { PublicTransferCalculator } from "@/components/features/PublicTransferCalculator";
import { MantleCostCalculator } from "@/components/features/MantleCostCalculator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import { VideoModal } from "@/components/ui/video-modal";
import { ArrowRight, Shield, Zap, Globe, CheckCircle, Star } from "lucide-react";
import { Calculator, UserPlus, CreditCard, Rocket } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Stealth Money
              </h1>
            </Link>
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
              <div className="flex flex-wrap gap-2">
                <a href="https://www.circle.com/" target="_blank" rel="noopener noreferrer" className="inline-flex group">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200 group-hover:bg-blue-200 transition-colors duration-200">
                    <Zap className="w-4 h-4 mr-2 animate-pulse" />
                    Powered by Circle
                  </div>
                </a>
                <a href="https://www.mantle.xyz/" target="_blank" rel="noopener noreferrer" className="inline-flex group">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 group-hover:from-green-200 group-hover:to-emerald-200 transition-all duration-200">
                    <div className="w-4 h-4 mr-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full animate-pulse"></div>
                    Powered by Mantle L2
                  </div>
                </a>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Send Money
                <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent animate-gradient bg-300">
                  Anywhere, Instantly
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Skip the banks. Send money directly to anyone, anywhere in seconds. 
                <span className="block mt-2 text-lg">Real exchange rates. No markups. No BS.</span>
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="group cursor-default">
                <div className="text-2xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-200">$47M</div>
                <div className="text-sm text-gray-600">This Month</div>
              </div>
              <div className="group cursor-default">
                <div className="text-2xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-200">127</div>
                <div className="text-sm text-gray-600">Countries</div>
              </div>
              <div className="group cursor-default">
                <div className="text-2xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-200">~32s</div>
                <div className="text-sm text-gray-600">Avg. Speed</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                onClick={() => {
                  // Scroll to calculator or navigate directly to transfer process
                  const calculator = document.querySelector('#calculator');
                  if (calculator) {
                    calculator.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.location.href = '/transfer/process';
                  }
                }}
              >
                Start Transfer
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-gray-300 hover:border-gray-400 hover:bg-gray-50 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                onClick={() => setIsVideoModalOpen(true)}
              >
                Watch Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 rounded-full">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">SOC 2 Certified</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 rounded-full">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">FDIC Insured</span>
              </div>
              <div className="text-sm text-gray-500 flex items-center">
                <span className="mr-1">🇺🇸</span>
                Licensed in 48 states
              </div>
            </div>
          </div>

          {/* Right Content - Transfer Calculator */}
          <div className="lg:pl-8" id="calculator">
            <div className="relative group">
              {/* Background decoration */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="absolute -top-3 -right-3 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full transform rotate-12 shadow-sm">
                  Live Rates
                </div>
                <PublicTransferCalculator />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mantle L2 Hero Section */}
      <section className="py-20 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full border border-green-200">
              <div className="w-6 h-6 mr-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full animate-pulse"></div>
              <span className="text-green-800 font-semibold text-lg">Powered by Mantle L2 Technology</span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Lightning-Fast Transfers with
              <span className="block bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                90% Lower Fees
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose your transfer method: reliable Circle for traditional banking or ultra-fast Mantle L2 for blockchain innovation. 
              <span className="block mt-2 font-semibold text-green-700">
                2-minute settlements. 90% cheaper gas fees. The future of money movement.
              </span>
            </p>

            {/* Live Network Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-100">
                <div className="text-3xl font-bold text-green-600">~2min</div>
                <div className="text-sm text-gray-600 mt-1">Settlement Time</div>
                <div className="text-xs text-green-500 mt-2 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                  Live Network
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-100">
                <div className="text-3xl font-bold text-green-600">90%</div>
                <div className="text-sm text-gray-600 mt-1">Lower Gas Fees</div>
                <div className="text-xs text-green-500 mt-2">vs Ethereum L1</div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-100">
                <div className="text-3xl font-bold text-green-600">$0.02</div>
                <div className="text-sm text-gray-600 mt-1">Avg Gas Cost</div>
                <div className="text-xs text-green-500 mt-2">Per Transaction</div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-100">
                <div className="text-3xl font-bold text-green-600">99.9%</div>
                <div className="text-sm text-gray-600 mt-1">Uptime</div>
                <div className="text-xs text-green-500 mt-2">Last 30 days</div>
              </div>
            </div>

            {/* Transfer Method Comparison */}
            <div className="max-w-5xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Choose Your Transfer Method</h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Traditional Circle Method */}
                <Card className="border-2 border-blue-200 bg-white/90 backdrop-blur-sm shadow-xl">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Shield className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-gray-900">Traditional (Circle)</h4>
                          <p className="text-sm text-gray-600">Reliable & Regulated</p>
                        </div>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                        Recommended for $1000+
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Processing Time</span>
                        <span className="font-semibold text-gray-900">30-60 seconds</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Transfer Fee</span>
                        <span className="font-semibold text-gray-900">1.5% + $2</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Regulatory</span>
                        <span className="font-semibold text-green-600">✓ FDIC Insured</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Best For</span>
                        <span className="font-semibold text-gray-900">Large amounts</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mantle L2 Method */}
                <Card className="border-2 border-green-200 bg-gradient-to-br from-white to-green-50/50 backdrop-blur-sm shadow-xl relative">
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-full transform rotate-12">
                    90% Cheaper!
                  </div>
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                          <Zap className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-gray-900">Blockchain (Mantle L2)</h4>
                          <p className="text-sm text-gray-600">Ultra-Fast & Cheap</p>
                        </div>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                        Recommended for $100-
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Processing Time</span>
                        <span className="font-semibold text-green-600">~2 minutes</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Gas Fee</span>
                        <span className="font-semibold text-green-600">~$0.02</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Network</span>
                        <span className="font-semibold text-green-600">✓ Mantle L2</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Best For</span>
                        <span className="font-semibold text-gray-900">Small-medium amounts</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Interactive Cost Savings Calculator */}
            <MantleCostCalculator />

            {/* Transaction Explorer Integration */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-green-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Live Mantle Network Activity
                </h3>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Transfers</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-mono text-gray-600">0x1a2b...3c4d</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">$247.50</div>
                          <div className="text-xs text-green-600">2 min ago</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-mono text-gray-600">0x5e6f...7g8h</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">$89.25</div>
                          <div className="text-xs text-green-600">3 min ago</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-mono text-gray-600">0x9i0j...1k2l</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">$156.75</div>
                          <div className="text-xs text-green-600">5 min ago</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Network Stats</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Current Gas Price</span>
                        <span className="font-semibold text-green-600">0.001 Gwei</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Block Time</span>
                        <span className="font-semibold text-green-600">2.1 seconds</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Network Utilization</span>
                        <span className="font-semibold text-green-600">23%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Transfers Today</span>
                        <span className="font-semibold text-green-600">1,247</span>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <a 
                        href="https://explorer.mantle.xyz" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-green-600 hover:text-green-700 font-medium text-sm group"
                      >
                        View on Mantle Explorer
                        <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center space-y-4 mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Why we're different
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              We Actually Give a Sh*t About Your Money
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              While banks charge you $45 for a wire transfer, we're using stablecoins to move money for pennies
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-blue-50/30">
              <CardContent className="p-8 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    32 sec avg
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Actually Instant</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Not "3-5 business days instant". Not "same day instant". Actually f*cking instant. Your money moves at internet speed.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-green-50/30">
              <CardContent className="p-8 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    0 hacks
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Circle's Infrastructure</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We don't store your money. Circle does. They're the $9B company behind USDC. Your funds are safer than in most banks.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50/30">
              <CardContent className="p-8 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Globe className="h-6 w-6 text-purple-600" />
                  </div>
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                    No BS fees
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Real Exchange Rates</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We show you the exact rate. No hidden 3% markup. No "processing fees". What you see is literally what you get.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gray-50 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 via-transparent to-purple-50/50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Dead simple process
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Your Grandma Could Do This
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
              Seriously. It's easier than ordering pizza online.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="group">
              <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-5xl font-black text-gray-200 group-hover:text-blue-100 transition-colors">01</span>
                  <Calculator className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Type Amount</h3>
                <p className="text-sm text-gray-600">
                  Enter $100. See they get €92.47. No calculator needed. We do the math.
                </p>
                <div className="mt-4 text-xs text-blue-600 font-semibold">
                  ~10 seconds
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group">
              <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-5xl font-black text-gray-200 group-hover:text-green-100 transition-colors">02</span>
                  <UserPlus className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Add Person</h3>
                <p className="text-sm text-gray-600">
                  Name + bank details. Or pick from your saved contacts. Done.
                </p>
                <div className="mt-4 text-xs text-green-600 font-semibold">
                  ~15 seconds
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group">
              <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-5xl font-black text-gray-200 group-hover:text-purple-100 transition-colors">03</span>
                  <CreditCard className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Pay</h3>
                <p className="text-sm text-gray-600">
                  Same as buying anything online. Apple Pay, card, whatever.
                </p>
                <div className="mt-4 text-xs text-purple-600 font-semibold">
                  ~5 seconds
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="group">
              <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full border-2 border-dashed border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-5xl font-black text-gray-200 group-hover:text-orange-100 transition-colors">🎉</span>
                  <Rocket className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">They Get Paid</h3>
                <p className="text-sm text-gray-600">
                  Money hits their account. They get a notification. You're done.
                </p>
                <div className="mt-4 text-xs text-orange-600 font-semibold">
                  ~32 seconds total
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              Average time from start to finish: <span className="font-bold text-gray-700">32 seconds</span>
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-50 rounded-full opacity-50"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-50 rounded-full opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center space-y-4 mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Real people, real transfers
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Actual Humans Love This Sh*t
            </h2>
            <div className="flex items-center justify-center space-x-2">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-gray-600 font-medium">4.8/5 on Trustpilot</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative group">
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Verified
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">2 days ago</span>
                </div>
                <p className="text-gray-700 italic">
                  "Sent $3,400 to my contractor in Mexico. Cost me $12. Bank wanted $85 + their sh*tty exchange rate. Never going back."
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img 
                      src="https://i.pravatar.cc/150?img=1" 
                      alt="Avatar" 
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">Marcus R.</div>
                      <div className="text-sm text-gray-600">Austin, TX → Mexico City</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative group">
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Verified
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">1 week ago</span>
                </div>
                <p className="text-gray-700 italic">
                  "I pay my dev team in India every month. Used to take 3-5 days. Now it's literally 30 seconds. This is the future."
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img 
                      src="https://i.pravatar.cc/150?img=5" 
                      alt="Avatar" 
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">Jessica Chen</div>
                      <div className="text-sm text-gray-600">SF → Bangalore ($47K/mo)</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative group">
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Verified
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex space-x-0.5">
                    {[...Array(4)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <Star className="h-4 w-4 fill-gray-200 text-gray-200" />
                  </div>
                  <span className="text-xs text-gray-500">3 weeks ago</span>
                </div>
                <p className="text-gray-700 italic">
                  "Only 4 stars because I'm mad I didn't find this sooner. Could've saved thousands on transfer fees. FML."
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img 
                      src="https://i.pravatar.cc/150?img=8" 
                      alt="Avatar" 
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">Ahmed K.</div>
                      <div className="text-sm text-gray-600">London → Cairo</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center group">
              Read 2,847 more reviews on Trustpilot
              <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-black relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative">
          <div className="inline-flex items-center px-4 py-2 bg-blue-600/20 backdrop-blur-sm rounded-full text-blue-300 text-sm font-medium mb-4">
            <Zap className="w-4 h-4 mr-2" />
            Average transfer time: 32 seconds
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-bold text-white">
            Stop Letting Banks Rob You
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Every international transfer you make the old way is money left on the table. 
            <span className="block mt-2 text-gray-400">
              Join 47,000+ people who've already made the switch.
            </span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="bg-white text-black hover:bg-gray-100 font-semibold shadow-2xl hover:shadow-white/20 transform hover:scale-105 transition-all duration-200"
            >
              Send Money Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-gray-600 text-white hover:bg-white/10 hover:border-white/50"
            >
              Calculate Savings
            </Button>
          </div>
          
          <div className="pt-8 flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              No account needed
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              First transfer free
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoId="dQw4w9WgXcQ" // Replace with your actual YouTube video ID
      />
    </div>
  );
}
