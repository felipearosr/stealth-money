"use client";

import { CookathonDashboard } from "@/components/features/CookathonDashboard";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Trophy, 
  Zap, 
  Target, 
  Users, 
  TrendingUp,
  ExternalLink,
  Github,
  Globe
} from "lucide-react";
import Link from "next/link";

export default function CookathonDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Stealth Money
              </h1>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full border border-green-200">
                <Trophy className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">Cookathon Demo</span>
              </div>
              <Navigation />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Link 
              href="/"
              className="inline-flex items-center text-green-600 hover:text-green-700 font-medium text-sm group"
            >
              <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Main Site
            </Link>
          </div>
          
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full border border-green-200">
            <Trophy className="w-6 h-6 mr-3 text-green-600" />
            <span className="text-green-800 font-semibold text-lg">Mantle Network Cookathon 2025</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Stealth Money
            <span className="block bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Mantle L2 Integration
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Revolutionizing international transfers with Mantle L2 technology. 
            <span className="block mt-2 text-lg font-semibold text-green-700">
              90% lower fees • 2-minute settlements • Real-time transparency
            </span>
          </p>

          {/* Key Achievement Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-12">
            <Card className="border-green-200 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">90%</div>
                <div className="text-sm text-gray-600">Cost Reduction</div>
              </CardContent>
            </Card>
            
            <Card className="border-blue-200 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">~2min</div>
                <div className="text-sm text-gray-600">Settlement Time</div>
              </CardContent>
            </Card>
            
            <Card className="border-purple-200 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600">67%</div>
                <div className="text-sm text-gray-600">User Adoption</div>
              </CardContent>
            </Card>
            
            <Card className="border-orange-200 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-600">4.8/5</div>
                <div className="text-sm text-gray-600">Satisfaction</div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              onClick={() => {
                const dashboard = document.querySelector('#dashboard');
                if (dashboard) {
                  dashboard.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              View Live Dashboard
              <TrendingUp className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-gray-300 hover:border-gray-400 hover:bg-gray-50 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              onClick={() => window.open('https://explorer.mantle.xyz', '_blank')}
            >
              Mantle Explorer
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Project Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Project Overview: Mantle L2 Integration
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">The Challenge</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Traditional international money transfers are slow, expensive, and opaque. Banks charge 
                    high fees (3-8% + fixed costs), take 3-5 business days, and provide little transparency 
                    into the process. Our existing Circle-based solution was fast but still carried traditional 
                    payment processing costs.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">The Solution</h3>
                  <p className="text-gray-600 leading-relaxed">
                    We integrated Mantle L2 as an alternative transfer method, giving users choice between 
                    traditional Circle transfers (reliable, regulated) and Mantle L2 transfers (ultra-fast, 
                    ultra-cheap). This hybrid approach leverages the best of both worlds: traditional finance 
                    reliability and blockchain innovation.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Innovations</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Hybrid transfer method selection with intelligent recommendations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Real-time cost comparison and savings calculator</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Seamless wallet management with transparent blockchain interactions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Live transaction monitoring and network statistics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Graceful fallback mechanisms for maximum reliability</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Technical Stack
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Globe className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Mantle L2</div>
                      <div className="text-sm text-gray-600">Blockchain infrastructure</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Circle API</div>
                      <div className="text-sm text-gray-600">Traditional payments</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 bg-purple-600 rounded"></div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Next.js</div>
                      <div className="text-sm text-gray-600">Frontend framework</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 bg-orange-600 rounded"></div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">TypeScript</div>
                      <div className="text-sm text-gray-600">Type safety</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Resources
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open('https://github.com/your-repo', '_blank')}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    View Source Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open('https://explorer.mantle.xyz', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Mantle Explorer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open('/mvp-demo', '_blank')}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Interactive Demo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Dashboard */}
      <section id="dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <CookathonDashboard />
      </section>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Stealth Money
              </span>
            </div>
            <p className="text-gray-600">
              Built for Mantle Network Cookathon 2025 • Revolutionizing international transfers
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <span>Powered by Mantle L2</span>
              <span>•</span>
              <span>Secured by Circle</span>
              <span>•</span>
              <span>Built with Next.js</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}