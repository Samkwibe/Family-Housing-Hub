// src/pages/AIAssistant.jsx - AI Assistant for Family Support
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  MessageCircle,
  Send,
  Sparkles,
  FileText,
  HelpCircle,
  Lightbulb,
  Home,
  Heart,
  DollarSign,
  BookOpen,
  Scale,
  MessageSquare,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Clock,
  ChevronRight,
  Mic,
  Upload,
  X,
  AlertCircle,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

// Pre-built responses for common questions (simulated AI)
const AI_RESPONSES = {
  // Housing
  'rent assistance': {
    title: 'Rent Assistance Programs',
    content: `Here are some ways to get help with rent:

**1. Emergency Rental Assistance Program (ERAP)**
- Contact your local housing authority
- Website: treasury.gov/erap
- Covers up to 18 months of rent

**2. Section 8 Housing Choice Voucher**
- Apply through your local Public Housing Agency
- Can cover 70% of rent costs

**3. Local Community Programs**
- Churches and nonprofits often have emergency funds
- United Way 211 can connect you: Call 211

**4. Negotiate with Landlord**
- Request a payment plan
- Document all agreements in writing

Would you like more specific information about any of these programs?`
  },
  'eviction': {
    title: 'Eviction Rights & Help',
    content: `**Know Your Eviction Rights:**

**1. Notice Requirements**
- Landlord must give written notice (usually 30-90 days)
- You have the right to respond in court

**2. Get Legal Help**
- Free legal aid: lawhelp.org
- Legal Aid Society: 1-800-898-9889

**3. Emergency Steps**
- Don't ignore court papers
- Show up to all court dates
- Bring proof of payments/communication

**4. If You Must Move**
- Request moving assistance programs
- Check if you qualify for emergency housing

**Remember:** An eviction notice is NOT the same as an eviction. You have rights!`
  },
  
  // Health
  'insurance': {
    title: 'Health Insurance Options',
    content: `**Health Insurance for Families:**

**1. Medicaid (Free/Low-Cost)**
- For low-income families
- Apply: healthcare.gov or your state website
- Covers children through CHIP

**2. Marketplace Plans (ACA)**
- Healthcare.gov
- Open enrollment: Nov 1 - Jan 15
- Tax credits available based on income

**3. Employer Insurance**
- Check if your job offers coverage
- Family plans usually available

**4. Free/Sliding Scale Clinics**
- Community Health Centers
- Find one: findahealthcenter.hrsa.gov

**Need help enrolling?** Call 1-800-318-2596`
  },
  'vaccine': {
    title: 'Vaccine Schedule for Children',
    content: `**Recommended Vaccine Schedule:**

**Birth - 2 Months:**
- Hepatitis B

**2 Months:**
- DTaP, Hib, Polio, PCV13, Rotavirus

**4 Months:**
- DTaP, Hib, Polio, PCV13, Rotavirus

**6 Months:**
- DTaP, Hib, Polio, PCV13, Flu (annual)

**12-18 Months:**
- MMR, Varicella, Hepatitis A

**4-6 Years (Before School):**
- DTaP, Polio, MMR, Varicella

**Free vaccines available at:**
- Community health centers
- Local health departments
- Vaccines for Children (VFC) program

Track vaccines in the Family Health section of this app!`
  },

  // Financial
  'budget': {
    title: 'Budget Planning Tips',
    content: `**50/30/20 Budget Rule:**

**50% - Needs (Must Pay)**
- Rent/Mortgage
- Utilities
- Groceries
- Insurance
- Transportation

**30% - Wants (Nice to Have)**
- Entertainment
- Dining out
- Shopping
- Subscriptions

**20% - Savings & Debt**
- Emergency fund
- Savings goals
- Extra debt payments

**Quick Tips:**
1. Track every expense for 1 week
2. Use the Budget feature in this app
3. Set up automatic savings
4. Review bills for unused subscriptions

**Free budgeting tools:** Use our Budget page to track everything!`
  },
  'food stamps': {
    title: 'SNAP Benefits (Food Stamps)',
    content: `**How to Apply for SNAP:**

**1. Check Eligibility**
- Based on household size and income
- A family of 4 can earn up to ~$3,000/month

**2. Apply Online or In-Person**
- Visit your state's SNAP website
- Or go to local SNAP office

**3. Documents Needed:**
- ID for all household members
- Proof of income (pay stubs)
- Rent/utility bills
- Social Security numbers

**4. Interview**
- Phone or in-person interview required
- Usually within 30 days

**Benefits:** $200-$800+ per month depending on family size

**Apply:** fns.usda.gov/snap or call 1-800-221-5689`
  },

  // Education
  'school enrollment': {
    title: 'School Enrollment Guide',
    content: `**How to Enroll Your Child in School:**

**Documents Typically Needed:**
1. Proof of age (birth certificate)
2. Proof of address (utility bill, lease)
3. Immunization records
4. Previous school records (if applicable)
5. Parent/Guardian ID

**Steps:**
1. Find your local school district website
2. Locate your assigned school by address
3. Complete registration forms
4. Schedule enrollment meeting
5. Submit all documents

**Special Programs:**
- Free/Reduced Lunch: Apply at school
- ESL classes: Available at most schools
- Special Education: Request evaluation if needed

**Homeless or Transitional Housing?**
McKinney-Vento Act protects your child's right to stay in their school. Ask about transportation assistance.`
  },

  // Legal
  'immigration': {
    title: 'Immigration Resources',
    content: `**Immigration Help & Resources:**

**Free Legal Help:**
- Immigration Advocates Network
- immigrationadvocates.org/nonprofit/legaldirectory
- Catholic Charities Immigration Services

**Know Your Rights:**
- You have the right to remain silent
- You don't have to open your door without a warrant
- You can refuse to sign documents you don't understand

**Important Documents to Keep Safe:**
- Passport (keep copies in a safe place)
- Work permit
- Green card
- Any USCIS notices

**Getting Help:**
- USCIS: uscis.gov
- National Immigration Law Center: nilc.org
- Local immigrant resource centers

**Emergency:** If detained, you have the right to call a lawyer and your consulate.`
  },

  // General
  'help': {
    title: 'How I Can Help You',
    content: `**I can help you with:**

🏠 **Housing**
- Rent assistance programs
- Eviction rights
- Landlord communication
- Housing applications

❤️ **Health**
- Finding healthcare
- Insurance options
- Vaccine schedules
- Mental health resources

💰 **Money**
- Budgeting tips
- SNAP/Food stamps
- Utility assistance
- Tax credits (EITC)

📚 **Education**
- School enrollment
- ESL classes
- College financial aid

⚖️ **Legal**
- Immigration resources
- Tenant rights
- Legal aid

**Just type your question!** For example:
- "How do I apply for food stamps?"
- "What are my rights as a renter?"
- "How do I find free healthcare?"`
  }
};

// Quick action suggestions
const QUICK_ACTIONS = [
  { id: 1, label: 'Rent Help', query: 'How can I get help paying rent?', icon: Home },
  { id: 2, label: 'Healthcare', query: 'How do I find affordable healthcare?', icon: Heart },
  { id: 3, label: 'Food Assistance', query: 'How do I apply for food stamps?', icon: DollarSign },
  { id: 4, label: 'School Enrollment', query: 'How do I enroll my child in school?', icon: BookOpen },
  { id: 5, label: 'Legal Help', query: 'Where can I get free legal help?', icon: Scale },
  { id: 6, label: 'Budget Tips', query: 'How should I budget my money?', icon: Lightbulb }
];

export default function AIAssistant() {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: `Hello ${userProfile?.firstName || 'there'}! 👋 I'm your Family Assistant. I can help you with:

• **Housing** - Rent assistance, tenant rights, maintenance
• **Health** - Insurance, clinics, vaccines, appointments  
• **Money** - Budgeting, food stamps, financial aid
• **Education** - School enrollment, ESL, college aid
• **Legal** - Immigration, tenant rights, legal aid

How can I help you today?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Find best matching response
  const findResponse = (query) => {
    const lowerQuery = query.toLowerCase();
    
    // Check for keywords
    if (lowerQuery.includes('rent') && (lowerQuery.includes('help') || lowerQuery.includes('assist') || lowerQuery.includes('pay'))) {
      return AI_RESPONSES['rent assistance'];
    }
    if (lowerQuery.includes('evict') || lowerQuery.includes('kick out')) {
      return AI_RESPONSES['eviction'];
    }
    if (lowerQuery.includes('insurance') || lowerQuery.includes('healthcare') || lowerQuery.includes('doctor')) {
      return AI_RESPONSES['insurance'];
    }
    if (lowerQuery.includes('vaccine') || lowerQuery.includes('immuniz') || lowerQuery.includes('shot')) {
      return AI_RESPONSES['vaccine'];
    }
    if (lowerQuery.includes('budget') || lowerQuery.includes('money') || lowerQuery.includes('spend')) {
      return AI_RESPONSES['budget'];
    }
    if (lowerQuery.includes('food stamp') || lowerQuery.includes('snap') || lowerQuery.includes('food assist')) {
      return AI_RESPONSES['food stamps'];
    }
    if (lowerQuery.includes('school') || lowerQuery.includes('enroll') || lowerQuery.includes('education')) {
      return AI_RESPONSES['school enrollment'];
    }
    if (lowerQuery.includes('immigra') || lowerQuery.includes('visa') || lowerQuery.includes('green card')) {
      return AI_RESPONSES['immigration'];
    }
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you')) {
      return AI_RESPONSES['help'];
    }

    // Default response
    return {
      title: 'Let Me Help',
      content: `I understand you're asking about "${query}". Here are some ways I can assist:

**Try asking about:**
• Rent assistance and housing help
• Healthcare and insurance options
• Food stamps and financial aid
• School enrollment for children
• Legal resources and rights

**Quick Resources:**
• Emergency: Call 211 for local help
• Housing: Contact local housing authority
• Health: findahealthcenter.hrsa.gov
• Food: SNAP hotline 1-800-221-5689

Would you like me to explain any of these in more detail?`
    };
  };

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const response = findResponse(inputValue);
    
    const assistantMessage = {
      id: Date.now() + 1,
      type: 'assistant',
      title: response.title,
      content: response.content,
      timestamp: new Date()
    };

    setIsTyping(false);
    setMessages(prev => [...prev, assistantMessage]);
  };

  // Handle quick action
  const handleQuickAction = (query) => {
    setInputValue(query);
    inputRef.current?.focus();
  };

  // Copy message
  const copyMessage = (id, content) => {
    navigator.clipboard.writeText(content.replace(/\*\*/g, '').replace(/\n/g, '\n'));
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear chat
  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      type: 'assistant',
      content: `Chat cleared! How can I help you today?`,
      timestamp: new Date()
    }]);
  };

  // Format message content with markdown-like styling
  const formatContent = (content) => {
    return content
      .split('\n')
      .map((line, i) => {
        // Bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Headers
        if (line.startsWith('**') && line.endsWith('**')) {
          return <h4 key={i} className="font-semibold text-gray-900 mt-3 mb-1" dangerouslySetInnerHTML={{ __html: line }} />;
        }
        
        // Bullet points
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <li key={i} className="ml-4 text-gray-700" dangerouslySetInnerHTML={{ __html: line.substring(2) }} />;
        }
        
        // Numbered items
        if (/^\d+\.\s/.test(line)) {
          return <li key={i} className="ml-4 text-gray-700" dangerouslySetInnerHTML={{ __html: line }} />;
        }
        
        // Empty lines
        if (!line.trim()) {
          return <br key={i} />;
        }
        
        return <p key={i} className="text-gray-700" dangerouslySetInnerHTML={{ __html: line }} />;
      });
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-200">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Family Assistant</h1>
            <p className="text-gray-500 text-sm">Get help with housing, health, money & more</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Clear chat"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleQuickAction(action.query)}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-100 transition-colors"
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              {message.type === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs text-gray-500">Assistant</span>
                </div>
              )}
              
              <div className={`rounded-2xl p-4 ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                  : 'bg-white border border-gray-200 shadow-sm'
              }`}>
                {message.title && (
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    {message.title}
                  </h3>
                )}
                <div className={message.type === 'user' ? 'text-white' : ''}>
                  {message.type === 'user' ? message.content : formatContent(message.content)}
                </div>
              </div>

              {message.type === 'assistant' && (
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => copyMessage(message.id, message.content)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy"
                  >
                    {copiedId === message.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <span className="text-xs text-gray-400">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="h-3 w-3 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="mt-4">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl p-2 shadow-sm">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything about housing, health, money..."
            className="flex-1 px-4 py-3 outline-none text-gray-900"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-3 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          This assistant provides general guidance. For emergencies, call 911.
        </p>
      </div>
    </div>
  );
}
