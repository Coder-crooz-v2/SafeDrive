import { motion } from 'framer-motion';
import { ArrowRight, Shield, Eye, Zap, Bell, MapPin, BarChart2, Users, Clock, CheckCircle, ThumbsUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';

const LearnMore = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">Advanced Road Safety System</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Using AI, real-time monitoring, and immediate response systems to revolutionize road safety and reduce accidents.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/sign-up">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Key Features Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div 
              className="p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              whileHover={{ y: -5 }}
            >
              <div className="rounded-full bg-blue-100 w-12 h-12 flex items-center justify-center mb-4">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI-Powered Drowsiness Detection</h3>
              <p className="text-gray-600">
                Real-time facial analysis monitors eye movements and blink patterns to detect driver drowsiness before accidents happen.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              className="p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              whileHover={{ y: -5 }}
            >
              <div className="rounded-full bg-green-100 w-12 h-12 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Accelerometer-Based Crash Detection</h3>
              <p className="text-gray-600">
                Sophisticated jerk detection algorithms can identify potential accidents using your device's built-in sensors.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              className="p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              whileHover={{ y: -5 }}
            >
              <div className="rounded-full bg-red-100 w-12 h-12 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Emergency Response</h3>
              <p className="text-gray-600">
                Automatic SMS alerts with GPS location are sent to emergency contacts within seconds of detecting an accident.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div 
              className="p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              whileHover={{ y: -5 }}
            >
              <div className="rounded-full bg-purple-100 w-12 h-12 flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">GPS-Enabled Tracking</h3>
              <p className="text-gray-600">
                Precise location tracking ensures help arrives exactly where it's needed, even in remote areas.
              </p>
            </motion.div>

            {/* Feature 5 */}
            <motion.div 
              className="p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              whileHover={{ y: -5 }}
            >
              <div className="rounded-full bg-amber-100 w-12 h-12 flex items-center justify-center mb-4">
                <BarChart2 className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Advanced Analytics Dashboard</h3>
              <p className="text-gray-600">
                Fleet managers and companies gain valuable insights into driving patterns and safety metrics through comprehensive analytics.
              </p>
            </motion.div>

            {/* Feature 6 */}
            <motion.div 
              className="p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              whileHover={{ y: -5 }}
            >
              <div className="rounded-full bg-cyan-100 w-12 h-12 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Multi-Tiered User System</h3>
              <p className="text-gray-600">
                Dedicated interfaces for drivers and fleet managers with appropriate permissions and features for each role.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-10">
          <h2 className="text-4xl font-bold text-start mb-12 text-gray-900">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <ol className="space-y-6">
                <motion.li 
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-shrink-0 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Driver Activates System</h3>
                    <p className="text-gray-600">The driver toggles to driving mode in the app, which activates all safety monitoring systems.</p>
                  </div>
                </motion.li>
                
                <motion.li 
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-shrink-0 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Real-Time Monitoring</h3>
                    <p className="text-gray-600">The system continuously monitors the driver's face for signs of drowsiness and the vehicle's motion for unusual patterns.</p>
                  </div>
                </motion.li>
                
                <motion.li 
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-shrink-0 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Incident Detection</h3>
                    <p className="text-gray-600">If drowsiness or a sudden jerk (potential accident) is detected, the system immediately triggers the alert protocol.</p>
                  </div>
                </motion.li>
                
                <motion.li 
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-shrink-0 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Emergency Response</h3>
                    <p className="text-gray-600">SMS alerts with location details are sent to emergency contacts, and an alert appears on the driver's device.</p>
                  </div>
                </motion.li>
                
                <motion.li 
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-shrink-0 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">5</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Data Analysis</h3>
                    <p className="text-gray-600">All incidents are recorded for later analysis in the admin dashboard, helping identify patterns and improve safety.</p>
                  </div>
                </motion.li>
              </ol>
            </div>
            
            <div className="rounded-lg overflow-hidden shadow-xl">
              <img 
                src="/images/system-illustration.png" 
                alt="System workflow illustration" 
                className="w-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://via.placeholder.com/600x400?text=System+Workflow";
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why Our Solution Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Our Solution Is Better</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div 
              className="bg-blue-700 p-6 rounded-lg"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Clock className="h-8 w-8 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Real-Time Response</h3>
              <p className="text-blue-100">
                Unlike traditional systems that only react after accidents, our solution predicts and prevents accidents before they happen.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-blue-700 p-6 rounded-lg"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Shield className="h-8 w-8 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Dual-Layer Protection</h3>
              <p className="text-blue-100">
                Combines drowsiness prevention with accident detection for comprehensive protection that other solutions don't provide.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-blue-700 p-6 rounded-lg"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <CheckCircle className="h-8 w-8 mb-4" />
              <h3 className="text-xl font-semibold mb-3">No Additional Hardware</h3>
              <p className="text-blue-100">
                Uses existing smartphone sensors and camera, eliminating the need for expensive specialized equipment other solutions require.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-blue-700 p-6 rounded-lg"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Zap className="h-8 w-8 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Faster Emergency Response</h3>
              <p className="text-blue-100">
                Direct SMS alerts with precise location data ensure help arrives up to 50% faster than traditional emergency services.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-blue-700 p-6 rounded-lg"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <BarChart2 className="h-8 w-8 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Data-Driven Insights</h3>
              <p className="text-blue-100">
                Provides detailed analytics that help identify risk patterns and improve driver safety over time.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-blue-700 p-6 rounded-lg"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <ThumbsUp className="h-8 w-8 mb-4" />
              <h3 className="text-xl font-semibold mb-3">Easy Adoption</h3>
              <p className="text-blue-100">
                Simple interface with automated monitoring requires minimal driver interaction, increasing adoption rates.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Impact Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Real-World Impact</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">94%</div>
              <p className="text-gray-600">of road accidents are caused by human error, which our system directly addresses</p>
            </div>
            
            <div className="p-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">60%</div>
              <p className="text-gray-600">reduction in drowsy driving incidents among early adopters of our technology</p>
            </div>
            
            <div className="p-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">15min</div>
              <p className="text-gray-600">average reduction in emergency response time when using our automatic alert system</p>
            </div>
          </div>
          
          <div className="mt-12 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 text-center">Our Vision</h3>
            <p className="text-gray-600 text-center max-w-3xl mx-auto">
              We envision a future where preventable road accidents are eliminated through intelligent, proactive safety systems. Our mission is to make roads safer for everyone by combining cutting-edge technology with human-centered design.
            </p>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Experience Safer Driving?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of drivers and fleet managers who have already enhanced their safety with our system.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              <Link to="/sign-up">Get Started Today</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-blue-700">
              <Link to="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white text-lg font-semibold mb-4">Road Safety System</h3>
              <p className="text-sm">Innovative technology for safer roads and drivers.</p>
            </div>
            
            <div>
              <h3 className="text-white text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-white">Home</Link></li>
                <li><Link to="/features" className="hover:text-white">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link to="/login" className="hover:text-white">Login</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link to="/support" className="hover:text-white">Support</Link></li>
                <li><Link to="/documentation" className="hover:text-white">Documentation</Link></li>
                <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm">
                <li>Email: info@roadsafety.com</li>
                <li>Phone: +1 (555) 123-4567</li>
                <li>Address: 123 Safety Street, Tech City</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-sm text-center">
            <p>&copy; {new Date().getFullYear()} Road Safety System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LearnMore;