// src/pages/Help.jsx - Complete Help & Support Center
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronUp,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  Home,
  DollarSign,
  Wrench,
  Shield,
  Users,
  Clock,
  ExternalLink,
  Book,
  Video,
  Zap,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Help() {
  const { userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  // FAQ Categories
  const categories = [
    { id: 'all', label: 'All Topics', icon: HelpCircle },
    { id: 'rent', label: 'Rent & Payments', icon: DollarSign },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'account', label: 'Account', icon: Users },
  ];

  // FAQs
  const faqs = [
    {
      id: 1,
      category: 'rent',
      question: 'How do I pay my rent?',
      answer: 'You can pay your rent through the Rent & Payments section of the app. We support various payment methods including bank transfer, credit card, and more. Navigate to "Rent" in the sidebar, click "Pay Rent" or "Record Payment" to log a payment you\'ve already made.'
    },
    {
      id: 2,
      category: 'rent',
      question: 'When is my rent due?',
      answer: 'Rent is typically due on the 1st of each month. You can see your specific due date in the Rent section or on your Dashboard. We\'ll send you reminders before the due date if you have notifications enabled.'
    },
    {
      id: 3,
      category: 'rent',
      question: 'What happens if I pay rent late?',
      answer: 'Late payments may incur fees as specified in your lease agreement. We recommend setting up rent reminders in your Settings to avoid late payments. If you\'re having trouble making a payment on time, please contact us as soon as possible.'
    },
    {
      id: 4,
      category: 'maintenance',
      question: 'How do I submit a maintenance request?',
      answer: 'Go to the Maintenance section and click "New Request". Fill out the form with details about the issue, including the location, priority level, and any photos if applicable. You\'ll receive updates as your request is processed.'
    },
    {
      id: 5,
      category: 'maintenance',
      question: 'What qualifies as an emergency maintenance request?',
      answer: 'Emergencies include: water leaks/flooding, no heat in winter, gas leaks, electrical hazards, broken locks/security issues, and sewage backup. For true emergencies, please also call our emergency hotline directly.'
    },
    {
      id: 6,
      category: 'maintenance',
      question: 'How long does maintenance usually take?',
      answer: 'Response times vary by priority: Emergency requests are addressed within 24 hours, urgent issues within 48 hours, and routine maintenance within 5-7 business days. You\'ll receive status updates throughout the process.'
    },
    {
      id: 7,
      category: 'documents',
      question: 'What documents should I upload?',
      answer: 'We recommend uploading: your lease agreement, income verification documents, valid ID, renter\'s insurance policy, and any other documents requested by property management. Keep documents updated as they expire.'
    },
    {
      id: 8,
      category: 'documents',
      question: 'How secure are my uploaded documents?',
      answer: 'All documents are encrypted and stored securely. Only you and authorized property management staff can access your documents. We use industry-standard security measures to protect your personal information.'
    },
    {
      id: 9,
      category: 'account',
      question: 'How do I update my profile information?',
      answer: 'Go to your Profile page by clicking your name/avatar in the sidebar. You can update your personal information, phone number, and address. Some changes may require verification by property management.'
    },
    {
      id: 10,
      category: 'account',
      question: 'How do I add family members to my account?',
      answer: 'In your Profile, go to the "Family" tab and click "Add Member". Enter their name, relationship, and contact information. This helps us know who\'s living in your unit and can contact them if needed.'
    },
    {
      id: 11,
      category: 'account',
      question: 'How do I change my password?',
      answer: 'Go to Profile > Security tab, or Settings > Privacy & Security. You\'ll need to enter your current password and then set a new one. For security, we recommend using a strong, unique password.'
    },
    {
      id: 12,
      category: 'account',
      question: 'How do I enable/disable notifications?',
      answer: 'Go to Settings > Notifications. You can customize email, SMS, and push notification preferences. We recommend keeping rent reminders and maintenance updates enabled so you don\'t miss important information.'
    }
  ];

  // Filter FAQs
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Quick Links
  const quickLinks = [
    { label: 'Pay Rent', icon: DollarSign, href: '/rent', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { label: 'Submit Maintenance', icon: Wrench, href: '/maintenance', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { label: 'Upload Document', icon: FileText, href: '/documents', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
    { label: 'Send Message', icon: MessageCircle, href: '/messages', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl mb-4">
          <HelpCircle className="h-10 w-10 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Help & Support</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Find answers to common questions or get in touch with our support team
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {quickLinks.map((link, index) => (
          <Link
            key={index}
            to={link.href}
            className={`p-4 rounded-xl ${link.color} transition-all flex flex-col items-center space-y-2 group`}
          >
            <link.icon className="h-6 w-6" />
            <span className="font-medium text-sm">{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FAQs Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Category Tabs */}
            <div className="p-4 border-b border-gray-200 overflow-x-auto">
              <div className="flex space-x-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center space-x-2 ${
                      activeCategory === cat.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <cat.icon className="h-4 w-4" />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ List */}
            <div className="divide-y divide-gray-100">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq) => (
                  <div key={faq.id} className="p-0">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                      className="w-full p-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                      {expandedFAQ === faq.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {expandedFAQ === faq.id && (
                      <div className="px-5 pb-5">
                        <p className="text-gray-600 bg-gray-50 rounded-xl p-4">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No results found for "{searchTerm}"</p>
                  <button
                    onClick={() => { setSearchTerm(''); setActiveCategory('all'); }}
                    className="text-blue-600 font-medium mt-2 hover:text-blue-700"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact & Resources */}
        <div className="space-y-6">
          {/* Contact Support */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-bold mb-4">Need More Help?</h3>
            <p className="text-blue-100 mb-6">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            
            <div className="space-y-3">
              <a 
                href="/messages" 
                className="flex items-center space-x-3 bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="font-medium">Send a Message</span>
              </a>
              <a 
                href="mailto:support@familyhousinghub.com" 
                className="flex items-center space-x-3 bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span className="font-medium">Email Support</span>
              </a>
              <a 
                href="tel:1-800-HOUSING" 
                className="flex items-center space-x-3 bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"
              >
                <Phone className="h-5 w-5" />
                <span className="font-medium">Call Us</span>
              </a>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-red-800">Emergency?</h3>
            </div>
            <p className="text-red-700 mb-4">
              For urgent issues like gas leaks, flooding, or security emergencies:
            </p>
            <a 
              href="tel:911" 
              className="block w-full bg-red-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Call Emergency: 911
            </a>
            <p className="text-red-600 text-sm mt-3 text-center">
              Maintenance Emergency: 1-800-FIX-ASAP
            </p>
          </div>

          {/* Office Hours */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900">Office Hours</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Monday - Friday</span>
                <span className="font-medium text-gray-900">9:00 AM - 6:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Saturday</span>
                <span className="font-medium text-gray-900">10:00 AM - 4:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sunday</span>
                <span className="font-medium text-gray-900">Closed</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Currently Open</span>
              </div>
            </div>
          </div>

          {/* Useful Links */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Useful Links</h3>
            <div className="space-y-2">
              <Link to="/profile" className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                <span className="text-gray-700">Your Profile</span>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </Link>
              <Link to="/settings" className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                <span className="text-gray-700">Settings</span>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </Link>
              <Link to="/privacy" className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                <span className="text-gray-700">Privacy Policy</span>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
