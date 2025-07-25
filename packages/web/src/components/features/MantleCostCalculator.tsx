"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator, TrendingDown } from "lucide-react";

interface CostBreakdown {
  amount: number;
  traditionalFee: number;
  mantleFee: number;
  savings: number;
  savingsPercentage: number;
}

export function MantleCostCalculator() {
  const [amount, setAmount] = useState<string>("100");
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);

  const calculateCosts = (transferAmount: number): CostBreakdown => {
    // Traditional Circle fees: 1.5% + $2 base fee
    const traditionalFee = Math.max(transferAmount * 0.015 + 2, 2);
    
    // Mantle L2 fees: ~$0.02 gas cost (fixed)
    const mantleFee = 0.02;
    
    const savings = traditionalFee - mantleFee;
    const savingsPercentage = (savings / traditionalFee) * 100;

    return {
      amount: transferAmount,
      traditionalFee,
      mantleFee,
      savings,
      savingsPercentage
    };
  };

  useEffect(() => {
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      setBreakdown(calculateCosts(numericAmount));
    } else {
      setBreakdown(null);
    }
  }, [amount]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getRecommendation = (amount: number) => {
    if (amount < 1000) {
      return {
        method: "Mantle L2",
        reason: "Massive savings on smaller amounts",
        color: "green"
      };
    } else {
      return {
        method: "Traditional",
        reason: "Better for regulatory compliance",
        color: "blue"
      };
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-green-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full border border-green-200 mb-4">
            <Calculator className="w-5 h-5 mr-2 text-green-600" />
            <span className="text-green-800 font-semibold">Interactive Cost Calculator</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            See How Much You'll Save with Mantle L2
          </h3>
          <p className="text-gray-600 mt-2">
            Enter any amount to compare traditional vs blockchain transfer costs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="transfer-amount" className="text-base font-semibold text-gray-900">
                Transfer Amount
              </Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
                <Input
                  id="transfer-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg h-12 border-2 border-gray-200 focus:border-green-500"
                  placeholder="100"
                  min="1"
                  max="10000"
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Quick Amounts
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000].map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(quickAmount.toString())}
                    className={`${
                      amount === quickAmount.toString()
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    ${quickAmount}
                  </Button>
                ))}
              </div>
            </div>

            {breakdown && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingDown className="w-5 h-5 mr-2 text-green-600" />
                  Recommendation
                </h4>
                {(() => {
                  const rec = getRecommendation(breakdown.amount);
                  return (
                    <div className={`p-4 rounded-lg border-2 ${
                      rec.color === 'green' 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-blue-200 bg-blue-50'
                    }`}>
                      <div className={`font-bold text-lg ${
                        rec.color === 'green' ? 'text-green-800' : 'text-blue-800'
                      }`}>
                        Use {rec.method}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {rec.reason}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {breakdown ? (
              <>
                <div className="space-y-4">
                  {/* Traditional Cost */}
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Traditional Fee</span>
                      <span className="text-xl font-bold text-red-600">
                        {formatCurrency(breakdown.traditionalFee)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      1.5% + $2 base fee
                    </div>
                  </div>

                  {/* Mantle Cost */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Mantle L2 Fee</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(breakdown.mantleFee)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Fixed gas cost
                    </div>
                  </div>

                  {/* Savings */}
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-xl p-6">
                    <div className="text-center">
                      <div className="text-sm text-green-700 font-medium mb-1">
                        Total Savings
                      </div>
                      <div className="text-3xl font-bold text-green-800">
                        {formatCurrency(breakdown.savings)}
                      </div>
                      <div className="text-lg font-semibold text-green-700">
                        ({breakdown.savingsPercentage.toFixed(1)}% less)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Annual Savings Projection */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <h5 className="font-semibold text-gray-900 mb-2">
                    If you transfer this amount monthly:
                  </h5>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(breakdown.savings * 12)}
                    </div>
                    <div className="text-sm text-gray-600">saved per year</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Enter an amount to see cost comparison</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {breakdown && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 mb-4">
              * Calculations based on current network conditions and typical transfer fees
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Start {breakdown.amount < 1000 ? 'Mantle L2' : 'Traditional'} Transfer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}