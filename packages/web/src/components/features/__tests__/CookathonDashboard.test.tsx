import { render, screen } from '@testing-library/react';
import { CookathonDashboard } from '../CookathonDashboard';

// Mock the lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Target: () => <div data-testid="target-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  PieChart: () => <div data-testid="pie-chart-icon" />,
  LineChart: () => <div data-testid="line-chart-icon" />,
  Globe: () => <div data-testid="globe-icon" />
}));

describe('CookathonDashboard', () => {
  it('renders the dashboard title', () => {
    render(<CookathonDashboard />);
    
    expect(screen.getByText('Cookathon Demo Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Real-time Mantle L2 integration metrics and live transaction monitoring')).toBeInTheDocument();
  });

  it('renders key metrics cards', () => {
    render(<CookathonDashboard />);
    
    expect(screen.getByText('Total Savings')).toBeInTheDocument();
    expect(screen.getByText('Mantle Adoption')).toBeInTheDocument();
    expect(screen.getByText('Avg Gas Cost')).toBeInTheDocument();
    expect(screen.getByText('Satisfaction')).toBeInTheDocument();
  });

  it('renders live transaction explorer', () => {
    render(<CookathonDashboard />);
    
    expect(screen.getByText('Live Mantle Transactions')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders network statistics', () => {
    render(<CookathonDashboard />);
    
    expect(screen.getByText('Network Statistics')).toBeInTheDocument();
    expect(screen.getByText('Gas Price')).toBeInTheDocument();
    expect(screen.getByText('Block Time')).toBeInTheDocument();
  });

  it('renders historical cost savings analysis', () => {
    render(<CookathonDashboard />);
    
    expect(screen.getByText('Historical Cost Savings Analysis')).toBeInTheDocument();
    expect(screen.getByText('Total Period Savings')).toBeInTheDocument();
    expect(screen.getByText('Avg Daily Savings')).toBeInTheDocument();
  });

  it('renders user adoption metrics', () => {
    render(<CookathonDashboard />);
    
    expect(screen.getByText('User Adoption Metrics')).toBeInTheDocument();
    expect(screen.getByText('Users choosing Mantle L2 over traditional methods')).toBeInTheDocument();
  });

  it('renders satisfaction and performance metrics', () => {
    render(<CookathonDashboard />);
    
    expect(screen.getByText('Satisfaction & Performance')).toBeInTheDocument();
    expect(screen.getByText('Average user satisfaction score')).toBeInTheDocument();
  });

  it('renders call to action section', () => {
    render(<CookathonDashboard />);
    
    expect(screen.getByText('Ready to Experience Mantle L2 Transfers?')).toBeInTheDocument();
    expect(screen.getByText('Start Your First Transfer')).toBeInTheDocument();
    expect(screen.getByText('Try Interactive Demo')).toBeInTheDocument();
  });

  it('renders timeframe selector', () => {
    render(<CookathonDashboard />);
    
    expect(screen.getByText('24h')).toBeInTheDocument();
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    render(<CookathonDashboard />);
    
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });
});