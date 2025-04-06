import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate("/sign-up");
  };

  const handleLearnMore = () => {
    navigate("/learn-more");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-teal-700 text-white">
      {/* Navigation Header */}
      <header className="container mx-auto pt-6 px-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">SafeDrive</h1>
          <nav className="hidden md:flex md:justify-center md:items-center space-x-6">
            <a href="#features" className="hover:text-green-300 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-green-300 transition-colors">How It Works</a>
            <Button variant="outline" className="border-white text-blue-900 hover:bg-blue-200" onClick={handleSignUp}>
              Sign Up
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-24 flex flex-col items-center text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Drive Safer. Pay Smarter.
          </h2>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl">
            Real-time vehicle monitoring that prevents accidents and lowers your premium.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              className="bg-green-400 hover:bg-green-500 text-blue-900 font-bold px-8 py-6 text-lg"
              onClick={handleSignUp}
            >
              Sign Up
            </Button>
            <Button 
              variant="outline" 
              className="text-blue-900 hover:bg-blue-200 hover:text-blue-900 px-8 py-6 text-lg"
              onClick={handleLearnMore}
            >
              Learn More
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-white text-blue-900 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-16">Key Features</h2>
            <div className="grid md:grid-cols-3 gap-12">
              {/* Feature 1 */}
              <div className="bg-blue-50 p-8 rounded-lg text-center">
                <div className="bg-blue-900 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4">Early Risk Detection</h3>
                <p>Our AI technology detects potential hazards before they become accidents, alerting you in real-time.</p>
              </div>

              {/* Feature 2 */}
              <div className="bg-blue-50 p-8 rounded-lg text-center">
                <div className="bg-blue-900 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4">Lower Premiums</h3>
                <p>Safe driving habits translate to immediate insurance savings. Pay only for the risk you actually present.</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-blue-50 p-8 rounded-lg text-center">
                <div className="bg-blue-900 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-4">24/7 Protection</h3>
                <p>Continuous monitoring means continuous protection, with instant alerts and emergency response.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="bg-blue-800 text-white py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-12">
              {/* Steps */}
              <div className="text-center">
                <div className="bg-white text-blue-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">1</div>
                <h3 className="text-xl font-semibold mb-4">Connect</h3>
                <p>Simply login and start driving</p>
              </div>
              <div className="text-center">
                <div className="bg-white text-blue-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">2</div>
                <h3 className="text-xl font-semibold mb-4">Protect</h3>
                <p>Receive real-time alerts about potential risks</p>
              </div>
              <div className="text-center">
                <div className="bg-white text-blue-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">3</div>
                <h3 className="text-xl font-semibold mb-4">Save</h3>
                <p>Enjoy lower premiums based on your actual driving data</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-900 to-teal-700 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Drive Safer?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">Join thousands of drivers who are saving money and staying safer on the road with SafeDrive.</p>
            <Button 
              className="bg-green-400 hover:bg-green-500 text-blue-900 font-bold px-8 py-6 text-lg"
              onClick={handleSignUp}
            >
              Get Started Today
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-blue-950 text-white py-12">
        <div className="container mx-auto px-10">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">SafeDrive</h3>
              <p>Making roads safer and insurance smarter since 2023.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-green-300">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-green-300">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-green-300">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-green-300">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2">
                <li>support@safedrive.com</li>
                <li>1-800-SAFE-DRV</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-800 mt-8 pt-8 text-center">
            <p>&copy; 2025 SafeDrive. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;