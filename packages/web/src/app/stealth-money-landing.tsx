"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Lock, Unlock, ArrowRight, Shield, Clock, Globe, CheckCircle } from "lucide-react"

const currencies = [
  { code: "USD", flag: "🇺🇸", name: "US Dollar" },
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
  { code: "GBP", flag: "🇬🇧", name: "British Pound" },
  { code: "BRL", flag: "🇧🇷", name: "Brazilian Real" },
  { code: "CAD", flag: "🇨🇦", name: "Canadian Dollar" },
  { code: "AUD", flag: "🇦🇺", name: "Australian Dollar" },
  { code: "JPY", flag: "🇯🇵", name: "Japanese Yen" },
  { code: "INR", flag: "🇮🇳", name: "Indian Rupee" },
]

const exchangeRates = {
  "USD-BRL": 5.15,
  "USD-EUR": 0.85,
  "USD-GBP": 0.73,
  "EUR-USD": 1.18,
  "GBP-USD": 1.37,
  "BRL-USD": 0.19,
}

export default function StealthMoneyLanding() {
  const [sendAmount, setSendAmount] = useState("")
  const [receiveAmount, setReceiveAmount] = useState("")
  const [sendCurrency, setSendCurrency] = useState("USD")
  const [receiveCurrency, setReceiveCurrency] = useState("BRL")
  const [lockedField, setLockedField] = useState<"send" | "receive">("receive")

  const getExchangeRate = (from: string, to: string) => {
    const key = `${from}-${to}`
    return exchangeRates[key as keyof typeof exchangeRates] || 1
  }

  const calculateAmount = useCallback((amount: string, isFromSend: boolean) => {
    if (!amount || isNaN(Number.parseFloat(amount))) return ""

    const rate = getExchangeRate(
      isFromSend ? sendCurrency : receiveCurrency,
      isFromSend ? receiveCurrency : sendCurrency,
    )

    const result = Number.parseFloat(amount) * rate
    return result.toFixed(2)
  }, [sendCurrency, receiveCurrency])

  useEffect(() => {
    if (lockedField === "send" && sendAmount) {
      setReceiveAmount(calculateAmount(sendAmount, true))
    } else if (lockedField === "receive" && receiveAmount) {
      setSendAmount(calculateAmount(receiveAmount, false))
    }
  }, [sendAmount, receiveAmount, lockedField, calculateAmount])

  const handleSendAmountChange = (value: string) => {
    setSendAmount(value)
    if (lockedField === "send") {
      setReceiveAmount(calculateAmount(value, true))
    } else {
      setLockedField("send")
    }
  }

  const handleReceiveAmountChange = (value: string) => {
    setReceiveAmount(value)
    if (lockedField === "receive") {
      setSendAmount(calculateAmount(value, false))
    } else {
      setLockedField("receive")
    }
  }

  const toggleLock = (field: "send" | "receive") => {
    setLockedField(field)
    if (field === "send" && sendAmount) {
      setReceiveAmount(calculateAmount(sendAmount, true))
    } else if (field === "receive" && receiveAmount) {
      setSendAmount(calculateAmount(receiveAmount, false))
    }
  }

  const fee = sendAmount ? (Number.parseFloat(sendAmount) * 0.007).toFixed(2) : "0.00"
  const rate = getExchangeRate(sendCurrency, receiveCurrency)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-slate-800">Stealth Money</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium">
                How It Works
              </a>
              <a href="#fees" className="text-gray-600 hover:text-gray-900 font-medium">
                Fees
              </a>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Sign Up</Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-800 mb-6">Global Money Transfers. Solved.</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The fastest and most affordable way to send money worldwide. No hidden fees, no complexity.
          </p>
        </div>

        {/* Transfer Calculator Card */}
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl border-0 bg-white">
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* You Send */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">You Send</label>
                    <button onClick={() => toggleLock("send")} className="p-1 hover:bg-gray-100 rounded">
                      {lockedField === "send" ? (
                        <Lock className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Unlock className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={sendAmount}
                        onChange={(e) => handleSendAmountChange(e.target.value)}
                        className="text-2xl font-semibold h-14 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        disabled={lockedField === "receive" && receiveAmount !== ""}
                      />
                    </div>
                    <Select value={sendCurrency} onValueChange={setSendCurrency}>
                      <SelectTrigger className="w-32 h-14 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            <div className="flex items-center space-x-2">
                              <span>{currency.flag}</span>
                              <span>{currency.code}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="bg-gray-100 rounded-full p-3">
                    <ArrowRight className="h-5 w-5 text-gray-600" />
                  </div>
                </div>

                {/* They Receive */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">They Receive</label>
                    <button onClick={() => toggleLock("receive")} className="p-1 hover:bg-gray-100 rounded">
                      {lockedField === "receive" ? (
                        <Lock className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Unlock className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={receiveAmount}
                        onChange={(e) => handleReceiveAmountChange(e.target.value)}
                        className="text-2xl font-semibold h-14 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                        disabled={lockedField === "send" && sendAmount !== ""}
                      />
                    </div>
                    <Select value={receiveCurrency} onValueChange={setReceiveCurrency}>
                      <SelectTrigger className="w-32 h-14 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            <div className="flex items-center space-x-2">
                              <span>{currency.flag}</span>
                              <span>{currency.code}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Rate & Fee Breakdown */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Fee (0.7%)</span>
                    <span>
                      {sendCurrency} {fee}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Rate</span>
                    <span>
                      1 {sendCurrency} ~ {rate.toFixed(4)} {receiveCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Should arrive</span>
                    <span>In minutes</span>
                  </div>
                </div>

                {/* CTA Button */}
                <Button className="w-full h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700">
                  Send Money Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust & Credibility */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center space-x-12 text-gray-500">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">SSL Secured</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span className="text-sm font-medium">Encrypted Transfers</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Regulated Partners</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Enter Amount</h3>
              <p className="text-gray-600">Tell us how much you want to send or how much they should receive.</p>
            </div>
            <div className="text-center">
              <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Add Recipient</h3>
              <p className="text-gray-600">Provide recipient details and choose how they&apos;ll receive the money.</p>
            </div>
            <div className="text-center">
              <div className="bg-emerald-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Send Securely</h3>
              <p className="text-gray-600">Confirm your transfer and your money is on its way in minutes.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
