import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Footer from '../components/common/Footer';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-blue-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">Track all your</span>
                  <span className="block text-blue-600">assets effortlessly</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg md:mt-5 md:text-xl">
                  VealthX helps you manage all your financial assets in one place. Connect your Google Drive documents and we'll automatically detect your bank accounts and insurance policies.
                </p>
                <div className="mt-8">
                  <div className="rounded-md shadow">
                    <Button onClick={handleGetStarted}>
                      Get Started with Google
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-12 lg:mt-0">
                <div className="bg-white rounded-lg overflow-hidden shadow-xl h-96 flex items-center justify-center">
                  <img 
                    src="/api/placeholder/600/400" 
                    alt="Dashboard Preview" 
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Features that make asset management simple
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Our intelligent platform saves you time and helps you stay organized.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="rounded-full bg-blue-100 w-12 h-12 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Google Drive Integration</h3>
                <p className="mt-2 text-gray-500">
                  Connect your Google Drive to automatically scan and detect financial documents.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="rounded-full bg-blue-100 w-12 h-12 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Automatic Asset Detection</h3>
                <p className="mt-2 text-gray-500">
                  Our intelligent system extracts key details from your bank statements and insurance policies.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="rounded-full bg-blue-100 w-12 h-12 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Manual Asset Addition</h3>
                <p className="mt-2 text-gray-500">
                  Easily add missing assets and keep your financial portfolio complete and up-to-date.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;