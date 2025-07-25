"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Zap, 
  DollarSign, 
  Users, 
  Activity, 
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Star,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Globe
} from "lucide-react";

interface TransactionData {
  id: string;
  hash: string;
  amount: number;
  currency: string;
  timestamp: Date;
  gasUsed: number;
  gasCost: number;
  status: 'confirmed' | 'pending' | 'failed';
  fromAddress: string;
  toAddress: string;
  blockNumber?: number;
}

interface NetworkStats {
  gasPrice: number;
  blockTime: number;
  utilization: number;
  totalTransfers: number;
  avgCost: number;
  uptime: number;
}

interface HistoricalData {
  date: string;
  mantleCost: number;
  traditionalCost: number;
  savings: number;
  volume: number;
}

interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  mantleAdoption: number;
  satisfactionScore: number;
  avgSavings: number;
  totalSaved: number;
}

export function CookathonDashboard() {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    gasPrice: 0.001,
    blockTime: 2.1,
    utilization: 23,
    totalTransfers: 1247,
    avgCost: 0.02,
    uptime: 99.9
  });
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetrics>({
    totalUsers: 2847,
    activeUsers: 1523,
    mantleAdoption: 67.3,
    satisfactionScore: 4.8,
    avgSavings: 23.45,
    totalSaved: 156789
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('24h');

  // Mock real-time transaction data
  const generateMockTransaction = (): TransactionData => {
    const amounts = [50, 100, 250, 500, 1000, 1500];
    const currencies = ['USD', 'EUR', 'GBP', 'CLP'];
    const statuses: ('confirmed' | 'pending')[] = ['confirmed', 'confirmed', 'confirmed', 'pending'];
    
    return {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      hash: `0x${Math.random().toString(16).substr(2, 40)}`,
      amount: amounts[Math.floor(Math.random() * amounts.length)],
      currency: currencies[Math.floor(Math.random() * currencies.length)],
      timestamp: new Date(),
      gasUsed: Math.floor(Math.random() * 50000) + 21000,
      gasCost: Math.random() * 0.05 + 0.01,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      fromAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      toAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000
    };
  };

  // Generate historical data
  const generateHistoricalData = (days: number): HistoricalData[] => {
    const data: HistoricalData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const baseAmount = 100;
      const mantleCost = 0.02 + Math.random() * 0.03;
      const traditionalCost = baseAmount * 0.015 + 2 + Math.random() * 1;
      
      data.push({
        date: date.toISOString().split('T')[0],
        mantleCost,
        traditionalCost,
        savings: traditionalCost - mantleCost,
        volume: Math.floor(Math.random() * 50) + 20
      });
    }
    return data;
  };

  // Initialize data
  useEffect(() => {
    // Generate initial transactions
    const initialTransactions = Array.from({ length: 10 }, generateMockTransaction);
    setTransactions(initialTransactions);

    // Generate historical data based on timeframe
    const days = selectedTimeframe === '24h' ? 1 : selectedTimeframe === '7d' ? 7 : 30;
    setHistoricalData(generateHistoricalData(days));

    // Set up real-time updates
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of new transaction
        const newTransaction = generateMockTransaction();
        setTransactions(prev => [newTransaction, ...prev.slice(0, 9)]);
        
        // Update network stats
        setNetworkStats(prev => ({
          ...prev,
          totalTransfers: prev.totalTransfers + 1,
          gasPrice: 0.001 + Math.random() * 0.002,
          utilization: Math.max(10, Math.min(90, prev.utilization + (Math.random() - 0.5) * 10))
        }));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update all metrics
    setUserMetrics(prev => ({
      ...prev,
      totalUsers: prev.totalUsers + Math.floor(Math.random() * 10),
      activeUsers: prev.activeUsers + Math.floor(Math.random() * 5),
      mantleAdoption: Math.min(100, prev.mantleAdoption + Math.random() * 2),
      totalSaved: prev.totalSaved + Math.random() * 1000
    }));
    
    setIsRefreshing(false);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  };

  const totalSavings = historicalData.reduce((sum, day) => sum + day.savings * day.volume, 0);
  const avgDailySavings = totalSavings / Math.max(historicalData.length, 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            Cookathon Demo Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Real-time Mantle L2 integration metrics and live transaction monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['24h', '7d', '30d'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedTimeframe === timeframe
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Savings</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrency(userMetrics.totalSaved)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  +{formatCurrency(avgDailySavings)}/day avg
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Mantle Adoption</p>
                <p className="text-2xl font-bold text-blue-800">
                  {userMetrics.mantleAdoption.toFixed(1)}%
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {userMetrics.activeUsers} active users
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Avg Gas Cost</p>
                <p className="text-2xl font-bold text-purple-800">
                  {formatCurrency(networkStats.avgCost)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  vs {formatCurrency(3.50)} traditional
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Satisfaction</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-orange-800">
                    {userMetrics.satisfactionScore}
                  </p>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= userMetrics.satisfactionScore
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  Based on {userMetrics.totalUsers} users
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Transaction Explorer and Network Stats */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Live Transaction Explorer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Live Mantle Transactions
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">Live</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.slice(0, 8).map((tx) => (
                <div
                  key={tx.id}
                  className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                    tx.status === 'confirmed'
                      ? 'bg-green-50 border-green-200'
                      : tx.status === 'pending'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        tx.status === 'confirmed' ? 'bg-green-500' :
                        tx.status === 'pending' ? 'bg-yellow-500 animate-pulse' :
                        'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-600">
                            {formatAddress(tx.hash)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {tx.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatAddress(tx.fromAddress)} → {formatAddress(tx.toAddress)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Gas: {formatCurrency(tx.gasCost)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {getTimeAgo(tx.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open('https://explorer.mantle.xyz', '_blank')}
              >
                View on Mantle Explorer
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Network Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Network Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Gas Price</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {networkStats.gasPrice.toFixed(3)} Gwei
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    vs 25+ Gwei on Ethereum
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Block Time</div>
                  <div className="text-2xl font-bold text-green-800">
                    {networkStats.blockTime}s
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    vs 12s on Ethereum
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Network Utilization</span>
                  <span className="text-sm font-bold text-gray-900">{networkStats.utilization}%</span>
                </div>
                <Progress value={networkStats.utilization} className="h-2" />
                <div className="text-xs text-gray-500 mt-1">
                  Optimal range: 20-80%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Total Transfers Today</div>
                  <div className="text-xl font-bold text-gray-900">
                    {networkStats.totalTransfers.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Network Uptime</div>
                  <div className="text-xl font-bold text-green-600">
                    {networkStats.uptime}%
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-800 mb-2">
                  Speed Comparison
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Mantle L2</span>
                    <span className="font-semibold text-green-600">~2 minutes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Traditional Wire</span>
                    <span className="font-semibold text-gray-600">3-5 days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">SWIFT Transfer</span>
                    <span className="font-semibold text-gray-600">1-2 days</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Cost Savings Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-purple-600" />
            Historical Cost Savings Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-sm text-green-600 font-medium">Total Period Savings</div>
                <div className="text-2xl font-bold text-green-800">
                  {formatCurrency(totalSavings)}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Across {historicalData.reduce((sum, day) => sum + day.volume, 0)} transfers
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-600 font-medium">Avg Daily Savings</div>
                <div className="text-2xl font-bold text-blue-800">
                  {formatCurrency(avgDailySavings)}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Per day average
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-sm text-purple-600 font-medium">Cost Reduction</div>
                <div className="text-2xl font-bold text-purple-800">
                  94.3%
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  vs traditional methods
                </div>
              </div>
            </div>

            {/* Simple Chart Visualization */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Daily Cost Comparison</h4>
              <div className="space-y-3">
                {historicalData.slice(-7).map((day) => (
                  <div key={day.date} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {new Date(day.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span className="font-medium text-gray-900">
                        {day.volume} transfers
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
                        <span className="text-xs text-gray-600">Traditional:</span>
                        <span className="text-xs font-medium">
                          {formatCurrency(day.traditionalCost * day.volume)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                        <span className="text-xs text-gray-600">Mantle L2:</span>
                        <span className="text-xs font-medium">
                          {formatCurrency(day.mantleCost * day.volume)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
                        <span className="text-xs text-gray-600">Saved:</span>
                        <span className="text-xs font-bold text-green-600">
                          {formatCurrency(day.savings * day.volume)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Adoption and Satisfaction Metrics */}
      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600" />
              User Adoption Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-indigo-600 mb-2">
                  {userMetrics.mantleAdoption.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  Users choosing Mantle L2 over traditional methods
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Mantle L2 Users</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {Math.floor(userMetrics.activeUsers * userMetrics.mantleAdoption / 100)}
                    </span>
                  </div>
                  <Progress value={userMetrics.mantleAdoption} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Traditional Users</span>
                    <span className="text-sm font-bold text-gray-600">
                      {Math.floor(userMetrics.activeUsers * (100 - userMetrics.mantleAdoption) / 100)}
                    </span>
                  </div>
                  <Progress value={100 - userMetrics.mantleAdoption} className="h-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {userMetrics.totalUsers.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {userMetrics.activeUsers.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Active Users</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-pink-600" />
              Satisfaction & Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="text-4xl font-bold text-pink-600">
                    {userMetrics.satisfactionScore}
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-6 h-6 ${
                          star <= userMetrics.satisfactionScore
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Average user satisfaction score
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-sm text-green-600 font-medium mb-1">
                    Average Savings per User
                  </div>
                  <div className="text-2xl font-bold text-green-800">
                    {formatCurrency(userMetrics.avgSavings)}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Per transfer using Mantle L2
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">98.7%</div>
                    <div className="text-xs text-gray-600">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">1.8min</div>
                    <div className="text-xs text-gray-600">Avg Settlement</div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium mb-2">
                    User Feedback Highlights
                  </div>
                  <div className="space-y-1 text-xs text-blue-700">
                    <div>• &quot;Incredibly fast and cheap transfers&quot;</div>
                    <div>• &quot;Love the transparency of blockchain&quot;</div>
                    <div>• &quot;Saved hundreds on international transfers&quot;</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Experience Mantle L2 Transfers?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Join thousands of users who are already saving money and time with our Mantle L2 integration. 
            Experience the future of international transfers today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              Start Your First Transfer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.open('/mvp-demo', '_blank')}
            >
              Try Interactive Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}