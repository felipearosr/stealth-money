"use client";

import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/ui/navigation";
import {
  CheckCircle,
  ArrowRight,
  Shield,
  XCircle,
  Minus,
  Zap,
  Globe,
  Star,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

// Centralized data for the comparison table for easy updates
const comparisonData = [
  {
    feature: "Transfer Fee",
    stealth: { text: "Zero hidden fees", icon: <CheckCircle className="w-5 h-5 text-green-600" /> },
    wise: { text: "Low, from 0.43%", icon: <CheckCircle className="w-5 h-5 text-gray-500" /> },
    revolut: { text: "Varies by plan", icon: <Minus className="w-5 h-5 text-gray-500" /> },
    paypal: { text: "High, up to 5%", icon: <XCircle className="w-5 h-5 text-red-500" /> },
  },
  {
    feature: "Exchange Rate",
    stealth: { text: "Real-time rate, no markups", icon: <CheckCircle className="w-5 h-5 text-green-600" /> },
    wise: { text: "Mid-market rate", icon: <CheckCircle className="w-5 h-5 text-green-600" /> },
    revolut: { text: "Markup on weekends", icon: <Minus className="w-5 h-5 text-gray-500" /> },
    paypal: { text: "3-4% markup", icon: <XCircle className="w-5 h-5 text-red-500" /> },
  },
  {
    feature: "Transfer Speed",
    stealth: { text: "Under 45 seconds", icon: <CheckCircle className="w-5 h-5 text-green-600" /> },
    wise: { text: "Seconds to 2 days", icon: <Minus className="w-5 h-5 text-gray-500" /> },
    revolut: { text: "Seconds to days", icon: <Minus className="w-5 h-5 text-gray-500" /> },
    paypal: { text: "Instant to minutes", icon: <Minus className="w-5 h-5 text-gray-500" /> },
  },
   {
    feature: "Best For",
    stealth: { text: "Speed & Transparency", icon: <Star className="w-5 h-5 text-blue-500" /> },
    wise: { text: "Large Bank Transfers", icon: <CheckCircle className="w-5 h-5 text-gray-500" /> },
    revolut: { text: "All-in-one Banking", icon: <CheckCircle className="w-5 h-5 text-gray-500" /> },
    paypal: { text: "Online Purchases", icon: <CheckCircle className="w-5 h-5 text-gray-500" /> },
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-slate-50">
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

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="text-center pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100/60">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
            Fair Prices. Faster Transfers.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
            Join the future of finance with transparent pricing. We're built to save you time and money on every single international transfer.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
              Create Your Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Comparison Table Section */}
        <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center tracking-tight">
              A Modern Alternative for Global Payments
            </h2>
            <p className="mt-4 text-lg text-gray-600 text-center max-w-3xl mx-auto">
              Traditional services have high fees and slow systems. We leverage new technology to deliver a faster, more transparent experience.
            </p>

            {/* Desktop Table */}
            <div className="hidden md:block mt-12">
                 <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-lg font-semibold text-gray-800 p-6 w-1/4"></th>
                        <th className="text-center text-lg font-semibold text-white p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">Stealth Money</th>
                        <th className="text-center text-lg font-semibold text-gray-500 p-6">Wise</th>
                        <th className="text-center text-lg font-semibold text-gray-500 p-6">Revolut</th>
                        <th className="text-center text-lg font-semibold text-gray-500 p-6">PayPal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="p-6 font-medium text-gray-800">{item.feature}</td>
                          <td className="text-center p-6 bg-blue-50">
                            <div className="flex items-center justify-center space-x-2 text-gray-800 font-semibold">
                              {item.stealth.icon} <span>{item.stealth.text}</span>
                            </div>
                          </td>
                          <td className="text-center p-6">
                            <div className="flex items-center justify-center space-x-2 text-gray-600">
                              {item.wise.icon} <span>{item.wise.text}</span>
                            </div>
                          </td>
                          <td className="text-center p-6">
                            <div className="flex items-center justify-center space-x-2 text-gray-600">
                              {item.revolut.icon} <span>{item.revolut.text}</span>
                            </div>
                          </td>
                          <td className="text-center p-6">
                            <div className="flex items-center justify-center space-x-2 text-gray-600">
                              {item.paypal.icon} <span>{item.paypal.text}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden mt-8 space-y-6">
              {comparisonData.map((item) => (
                <Card key={item.feature} className="shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{item.feature}</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 rounded-lg bg-blue-100 border border-blue-200">
                        <span className="font-bold text-blue-800">Stealth Money</span>
                        <div className="flex items-center space-x-2 text-blue-800 text-sm text-right">
                          {item.stealth.icon} <span>{item.stealth.text}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1">
                        <span className="font-medium text-gray-600">Wise</span>
                        <div className="flex items-center space-x-2 text-gray-700 text-sm">{item.wise.icon}<span>{item.wise.text}</span></div>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1">
                        <span className="font-medium text-gray-600">Revolut</span>
                        <div className="flex items-center space-x-2 text-gray-700 text-sm">{item.revolut.icon}<span>{item.revolut.text}</span></div>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1">
                        <span className="font-medium text-gray-600">PayPal</span>
                         <div className="flex items-center space-x-2 text-gray-700 text-sm">{item.paypal.icon}<span>{item.paypal.text}</span></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        {/* Final CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="max-w-4xl mx-auto">
                <div className="relative text-center p-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-2xl overflow-hidden">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                        Ready to Experience the Future of Transfers?
                    </h2>
                    <p className="mt-4 max-w-xl mx-auto text-lg text-blue-100">
                        Open your free account in minutes and send your first transfer today.
                    </p>
                    <div className="mt-8">
                        <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-200 text-base font-bold py-3 px-8 shadow-lg">
                           Start Sending & Saving
                           <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </section>
      </main>
    </div>
  );
}