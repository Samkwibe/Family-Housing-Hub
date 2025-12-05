// LANDING PAGE - ULTIMATE PROFESSIONAL DESIGN - $100M STARTUP LEVEL
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  Building2,
  Users,
  Shield,
  Star,
  CheckCircle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Heart,
  Calendar,
  MessageCircle,
  FileText,
  Wallet,
  ShoppingCart,
  Award,
  Zap,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  Play
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Landing() {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Building2,
      title: 'Property Management',
      description: 'Manage properties, tenants, and rent collection with professional-grade tools.',
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop'
    },
    {
      icon: Users,
      title: 'Family Dashboard',
      description: 'Connect your family with shared calendars, tasks, and real-time messaging.',
      image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=600&fit=crop'
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Never miss rent payments, maintenance dates, or family events again.',
      image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&h=600&fit=crop'
    },
    {
      icon: FileText,
      title: 'Document Storage',
      description: 'Securely store leases, receipts, and important housing documents in the cloud.',
      image: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&h=600&fit=crop'
    },
    {
      icon: Wallet,
      title: 'Budget Tracking',
      description: 'Track expenses, manage budgets, and achieve your family financial goals.',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop'
    },
    {
      icon: MessageCircle,
      title: 'Instant Communication',
      description: 'Stay connected with landlords, tenants, and family members instantly.',
      image: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=800&h=600&fit=crop'
    }
  ];

  const stats = [
    { number: '50K+', label: 'Happy Families', icon: Users },
    { number: '12K+', label: 'Properties Managed', icon: Building2 },
    { number: '1M+', label: 'Messages Sent', icon: MessageCircle },
    { number: '4.9★', label: 'Average Rating', icon: Star }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Property Owner',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      text: 'This platform transformed how I manage my rental properties. Everything is organized and efficient!',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Family of 4',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      text: 'Finally, a central place for our family to manage housing, budget, and stay organized together.',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Renter & Parent',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
      text: 'The children management features are amazing! My kids love earning rewards for completing chores.',
      rating: 5
    }
  ];

  const faqs = [
    {
      question: 'How do I get started?',
      answer: 'Simply sign up for free, choose your role (Owner, Renter, or Child), and complete the quick onboarding process. You\'ll be up and running in minutes!'
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely! We use bank-level encryption (SSL/TLS), secure cloud storage, and follow industry best practices to keep your family data safe and private.'
    },
    {
      question: 'What features are included?',
      answer: 'All accounts include property management, family dashboards, document storage, budget tracking, messaging, calendars, children management, and much more!'
    },
    {
      question: 'Can I access it on mobile?',
      answer: 'Yes! Our platform is fully responsive and works beautifully on all devices - phones, tablets, and desktops.'
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes! Start with our free tier that includes all essential features. Upgrade anytime for advanced features and unlimited storage.'
    }
  ];

  const handleContactSubmit = (e) => {
    e.preventDefault();
    toast.success('Thank you! We\'ll get back to you within 24 hours.');
    setContactForm({ name: '', email: '', message: '' });
  };

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                <Home className="h-6 w-6 text-white" />
              </div>
              <span className={`text-2xl font-black transition-colors ${
                isScrolled ? 'text-gray-900' : 'text-white'
              }`}>
                FamilyHub
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className={`font-semibold transition-colors hover:text-blue-600 ${
                isScrolled ? 'text-gray-700' : 'text-white'
              }`}>Features</a>
              <a href="#testimonials" className={`font-semibold transition-colors hover:text-blue-600 ${
                isScrolled ? 'text-gray-700' : 'text-white'
              }`}>Testimonials</a>
              <a href="#contact" className={`font-semibold transition-colors hover:text-blue-600 ${
                isScrolled ? 'text-gray-700' : 'text-white'
              }`}>Contact</a>
              <Link
                to="/login"
                className={`font-semibold transition-colors ${
                  isScrolled ? 'text-gray-700 hover:text-blue-600' : 'text-white hover:text-blue-200'
                }`}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Link
              to="/register"
              className="md:hidden bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-bold"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 min-h-screen flex items-center">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/2 -right-10 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-cyan-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob animation-delay-4000"></div>
          
          {/* Floating Particles */}
          <div className="absolute inset-0">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full animate-float-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${5 + Math.random() * 5}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-8 border border-white/20">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-semibold">Trusted by 50,000+ Families</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
              <span className="block text-white drop-shadow-lg">Your Family's</span>
              <span className="block text-white drop-shadow-lg">Complete</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 drop-shadow-lg">
                Housing Hub
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Manage properties, organize family life, track budgets, and create lasting memories - all in one beautiful platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
              <Link
                to="/register?role=owner"
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-5 rounded-2xl font-black text-lg transition-all shadow-2xl hover:shadow-indigo-500/50 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Building2 className="w-6 h-6" />
                <span>I'm a Property Owner</span>
              </Link>
              <Link
                to="/register?role=renter"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-8 py-5 rounded-2xl font-black text-lg transition-all border-2 border-white/20 hover:border-white/40 flex items-center justify-center space-x-2"
              >
                <Users className="w-6 h-6" />
                <span>I'm a Renter</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center lg:justify-start space-x-6">
              <div className="flex items-center space-x-2 text-white/70">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-sm font-semibold">SSL Secured</span>
              </div>
              <div className="flex items-center space-x-2 text-white/70">
                <Award className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-semibold">Top Rated</span>
              </div>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 transform hover:scale-105 transition-transform duration-500">
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop"
                alt="Happy family in beautiful home"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              
              {/* Floating Stats Cards */}
              <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl animate-float">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500 rounded-full p-2">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900">50K+</p>
                    <p className="text-sm text-gray-600">Active Users</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl animate-float-delayed">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500 rounded-full p-2">
                    <Star className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900">4.9/5</p>
                    <p className="text-sm text-gray-600">User Rating</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-50"></div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-4xl font-black text-gray-900 mb-2">{stat.number}</h3>
                  <p className="text-gray-600 font-semibold">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Everything Your Family Needs
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to simplify property management and family organization
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 bg-white rounded-xl p-3 shadow-lg">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Loved by Families Everywhere
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              See what our community has to say about transforming their family life
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all transform hover:-translate-y-2"
              >
                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-white text-lg mb-6 italic leading-relaxed">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center space-x-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover border-4 border-white/20"
                  />
                  <div>
                    <h4 className="text-white font-bold text-lg">{testimonial.name}</h4>
                    <p className="text-blue-200 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Got questions? We've got answers!
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg font-bold text-gray-900 pr-8">
                    {faq.question}
                  </span>
                  {expandedFaq === index ? (
                    <ChevronUp className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-6 py-5 bg-gradient-to-br from-blue-50 to-purple-50 border-t border-gray-200">
                    <p className="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.unsplash.com/photo-1609220136736-443140cffec6?w=1600&h=900&fit=crop"
            alt="Family"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Ready to Transform Your Family Life?
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            Join 50,000+ families who've already simplified their housing management with FamilyHub
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-white hover:bg-gray-50 text-blue-600 px-10 py-5 rounded-2xl font-black text-lg transition-all shadow-2xl hover:shadow-white/50 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-6 h-6" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-10 py-5 rounded-2xl font-black text-lg transition-all border-2 border-white/30 hover:border-white/50"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center space-x-8">
            <div className="flex items-center space-x-2 text-white">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold">No credit card required</span>
            </div>
            <div className="flex items-center space-x-2 text-white">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold">Free forever plan</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Get In Touch
            </h2>
            <p className="text-xl text-gray-600">
              Have questions? We'd love to hear from you!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 shadow-xl">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Your Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Your Email</label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Your Message</label>
                  <textarea
                    placeholder="Tell us how we can help..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all resize-none text-gray-900"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span>Send Message</span>
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-600">(603) 661-5417</p>
                  <p className="text-sm text-gray-500 mt-1">Mon-Fri, 9am-5pm EST</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600">kwibesamuel@gmail.com</p>
                  <p className="text-sm text-gray-500 mt-1">We'll reply within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Location</h3>
                  <p className="text-gray-600">New Hampshire, USA</p>
                  <p className="text-sm text-gray-500 mt-1">Serving families nationwide</p>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="pt-8 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-900">SSL Secured</p>
                  </div>
                  <div className="text-center">
                    <Lock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-900">Privacy First</p>
                  </div>
                  <div className="text-center">
                    <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-900">Top Rated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-black text-white">FamilyHub</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Your family's complete housing management solution. Trusted by 50,000+ families nationwide.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Sign Up</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} FamilyHub. All rights reserved. Made with <Heart className="w-4 h-4 inline text-red-500 fill-red-500" /> for families everywhere.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -30px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(50px); opacity: 0; }
        }
        .animate-blob {
          animation: blob 10s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
          animation-delay: 1s;
        }
        .animate-float-particle {
          animation: float-particle linear infinite;
        }
      `}</style>
    </div>
  );
}
