import { Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';

interface CookathonMetrics {
  totalSavings: number;
  mantleAdoption: number;
  activeUsers: number;
  totalUsers: number;
  satisfactionScore: number;
  avgSavings: number;
  networkStats: {
    gasPrice: number;
    blockTime: number;
    utilization: number;
    totalTransfers: number;
    avgCost: number;
    uptime: number;
  };
  recentTransactions: Array<{
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
  }>;
  historicalData: Array<{
    date: string;
    mantleCost: number;
    traditionalCost: number;
    savings: number;
    volume: number;
  }>;
}

export class CookathonController {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Get comprehensive cookathon metrics for dashboard
   */
  async getCookathonMetrics(req: Request, res: Response): Promise<void> {
    try {
      const timeframe = req.query.timeframe as string || '24h';
      
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate = new Date();
      
      switch (timeframe) {
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        default:
          startDate.setHours(now.getHours() - 24);
      }

      // Get transfer statistics
      const transferStats = await this.getTransferStatistics(startDate, now);
      
      // Get user metrics
      const userMetrics = await this.getUserMetrics();
      
      // Get network statistics (mock data for demo)
      const networkStats = this.getMockNetworkStats();
      
      // Get recent transactions (mock data for demo)
      const recentTransactions = this.getMockRecentTransactions();
      
      // Get historical data
      const historicalData = this.getHistoricalData(timeframe);

      const metrics: CookathonMetrics = {
        totalSavings: transferStats.totalSavings,
        mantleAdoption: transferStats.mantleAdoption,
        activeUsers: userMetrics.activeUsers,
        totalUsers: userMetrics.totalUsers,
        satisfactionScore: 4.8, // Mock satisfaction score
        avgSavings: transferStats.avgSavings,
        networkStats,
        recentTransactions,
        historicalData
      };

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching cookathon metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cookathon metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get live network statistics
   */
  async getNetworkStats(req: Request, res: Response): Promise<void> {
    try {
      const networkStats = this.getMockNetworkStats();
      
      res.json({
        success: true,
        data: networkStats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching network stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch network statistics'
      });
    }
  }

  /**
   * Get recent transactions for live feed
   */
  async getRecentTransactions(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const recentTransactions = this.getMockRecentTransactions(limit);
      
      res.json({
        success: true,
        data: recentTransactions,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent transactions'
      });
    }
  }

  /**
   * Calculate cost savings for a given amount
   */
  async calculateSavings(req: Request, res: Response): Promise<void> {
    try {
      const amount = parseFloat(req.query.amount as string) || 100;
      
      // Traditional Circle fees: 1.5% + $2 base fee
      const traditionalFee = Math.max(amount * 0.015 + 2, 2);
      
      // Mantle L2 fees: ~$0.02 gas cost (fixed)
      const mantleFee = 0.02;
      
      const savings = traditionalFee - mantleFee;
      const savingsPercentage = (savings / traditionalFee) * 100;

      const calculation = {
        amount,
        traditionalFee,
        mantleFee,
        savings,
        savingsPercentage,
        recommendation: amount < 1000 ? 'mantle' : 'traditional',
        estimatedTime: {
          mantle: '~2 minutes',
          traditional: '30-60 seconds'
        }
      };

      res.json({
        success: true,
        data: calculation,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error calculating savings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate savings'
      });
    }
  }

  private async getTransferStatistics(startDate: Date, endDate: Date) {
    try {
      // Get actual transfer data from database
      const transfers = await this.databaseService.getTransfersByDateRange(startDate, endDate);
      
      const mantleTransfers = transfers.filter(t => t.transferMethod === 'mantle');
      const totalTransfers = transfers.length;
      
      const totalSavings = mantleTransfers.reduce((sum, transfer) => {
        const traditionalFee = Math.max(transfer.amount * 0.015 + 2, 2);
        const mantleFee = transfer.networkFeeUsd || 0.02;
        return sum + (traditionalFee - mantleFee);
      }, 0);

      const mantleAdoption = totalTransfers > 0 ? (mantleTransfers.length / totalTransfers) * 100 : 67.3;
      const avgSavings = mantleTransfers.length > 0 ? totalSavings / mantleTransfers.length : 23.45;

      return {
        totalSavings: totalSavings || 156789, // Fallback to mock data
        mantleAdoption: mantleAdoption || 67.3,
        avgSavings: avgSavings || 23.45
      };
    } catch (error) {
      console.error('Error getting transfer statistics:', error);
      // Return mock data as fallback
      return {
        totalSavings: 156789,
        mantleAdoption: 67.3,
        avgSavings: 23.45
      };
    }
  }

  private async getUserMetrics() {
    try {
      // Get actual user data from database
      const totalUsers = await this.databaseService.getTotalUserCount();
      const activeUsers = await this.databaseService.getActiveUserCount();

      return {
        totalUsers: totalUsers || 2847,
        activeUsers: activeUsers || 1523
      };
    } catch (error) {
      console.error('Error getting user metrics:', error);
      // Return mock data as fallback
      return {
        totalUsers: 2847,
        activeUsers: 1523
      };
    }
  }

  private getMockNetworkStats() {
    // Simulate real-time network statistics
    return {
      gasPrice: 0.001 + Math.random() * 0.002, // 0.001-0.003 Gwei
      blockTime: 2.0 + Math.random() * 0.5, // 2.0-2.5 seconds
      utilization: Math.max(10, Math.min(90, 23 + (Math.random() - 0.5) * 20)), // 10-90%
      totalTransfers: 1247 + Math.floor(Math.random() * 100),
      avgCost: 0.02 + Math.random() * 0.03, // $0.02-$0.05
      uptime: 99.9
    };
  }

  private getMockRecentTransactions(limit: number = 10) {
    const transactions = [];
    const amounts = [50, 100, 250, 500, 1000, 1500];
    const currencies = ['USD', 'EUR', 'GBP', 'CLP'];
    const statuses: ('confirmed' | 'pending')[] = ['confirmed', 'confirmed', 'confirmed', 'pending'];
    
    for (let i = 0; i < limit; i++) {
      const timestamp = new Date();
      timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 60));
      
      transactions.push({
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        hash: `0x${Math.random().toString(16).substr(2, 40)}`,
        amount: amounts[Math.floor(Math.random() * amounts.length)],
        currency: currencies[Math.floor(Math.random() * currencies.length)],
        timestamp,
        gasUsed: Math.floor(Math.random() * 50000) + 21000,
        gasCost: Math.random() * 0.05 + 0.01,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        fromAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        toAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000
      });
    }
    
    return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private getHistoricalData(timeframe: string) {
    const days = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30;
    const data = [];
    
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
  }
}

export const cookathonController = new CookathonController();