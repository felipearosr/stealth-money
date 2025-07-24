'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const isClerkConfigured = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder');

function AuthenticatedNavigation() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center space-x-4">
        <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex items-center space-x-4">
        <UserButton 
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8',
              userButtonPopoverCard: 'shadow-lg border',
              userButtonPopoverActionButton: 'hover:bg-gray-50',
            },
          }}
          afterSignOutUrl="/"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <Link href="/auth/sign-in">
        <Button variant="outline" className="border-gray-300">
          Sign In
        </Button>
      </Link>
      <Link href="/auth/sign-up">
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          Get Started
        </Button>
      </Link>
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const isHomepage = pathname === '/';

  return (
    <nav className="hidden md:flex items-center space-x-8">
      <Link 
        href={isHomepage ? "#features" : "/#features"} 
        className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
      >
        Features
      </Link>
      <Link 
        href={isHomepage ? "#how-it-works" : "/#how-it-works"} 
        className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
      >
        How It Works
      </Link>
      <Link 
        href="/pricing" 
        className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
      >
        Pricing
      </Link>
      
      {/* Authentication-based navigation */}
      {isClerkConfigured ? (
        <AuthenticatedNavigation />
      ) : (
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          Get Started
        </Button>
      )}
    </nav>
  );
}