import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)] text-center px-4">
      <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 animate-bounce">
        <span className="text-white font-bold text-3xl">!</span>
      </div>
      <h1 className="text-6xl md:text-8xl font-bold text-gray-800 dark:text-white mb-2">
        404
      </h1>
      <h2 className="text-2xl md:text-3xl font-semibold text-gray-600 dark:text-gray-300 mb-6">
        Page Not Found
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
        Sorry, the page you are looking for does not exist or has been moved.
      </p>
      
      {/* Ensure your Link component looks exactly like this */}
      <Link 
        href="/"
        className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-300"
      >
        Return to Homepage
      </Link>
    </div>
  );
}