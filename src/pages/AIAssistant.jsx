// src/pages/AIAssistant.jsx - Enhanced AI Assistant with AWS Bedrock
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  MessageCircle, Send, Sparkles, FileText, HelpCircle, Lightbulb, Home, Heart,
  DollarSign, BookOpen, Scale, MessageSquare, Copy, Check, RefreshCw, Trash2,
  Clock, ChevronRight, Mic, Upload, X, AlertCircle, Zap, Download, Play, Square,
  Plus, Minus, MapPin, Search, Star, History, Save, Share2, Volume2, VolumeX,
  ExternalLink, Calendar, Users, Shield, Briefcase, Phone, Mail, Globe, Filter,
  ChevronDown, ChevronUp, Bookmark, Settings, Bot, Image as ImageIcon, Loader,
  Wrench, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import bedrockService from '../services/aws/bedrockService';
import aiService from '../services/aws/aiService';

// Enhanced AI responses with location-based resources
const createAIResponses = (userLocation = 'US') => ({
  // Housing with location-specific resources
  'rent assistance': {
    title: 'Rent Assistance Programs',
    content: `Here are ways to get help with rent in ${userLocation}:

**1. Emergency Rental Assistance Program (ERAP)**
• Contact local housing authority
• Website: treasury.gov/erap
• Covers up to 18 months of rent

**2. Section 8 Housing Choice Voucher**
• Apply through local Public Housing Agency
• Can cover 70% of rent costs

**3. Local Community Programs**
• Churches and nonprofits often have emergency funds
• United Way 211: Call 211

**4. Negotiate with Landlord**
• Request a payment plan
• Document all agreements in writing

**Local ${userLocation} Resources:**
• Community Action Agencies
• Salvation Army emergency assistance
• Catholic Charities rental help`,
    homework: `**Homework: Rent Assistance Action Plan**

1. 📞 Call 211 to find local rental assistance
2. 📝 Gather: ID, proof of income, lease agreement
3. 🏢 Contact 3 local agencies from your search
4. 📅 Schedule appointments this week
5. 💰 Calculate how much assistance you need`,
    childrenActivity: `**Family Activity: Budget Helper**

Help your children understand money by:
• Give play money for chores
• Create a "rent" piggy bank
• Draw pictures of your home
• Talk about helping neighbors`,
    audioPrompt: "Let me help you find rent assistance. First, gather your ID, proof of income, and lease agreement. Then call 211 to find local programs that can help pay your rent.",
    links: [
      { label: 'ERAP Website', url: 'https://home.treasury.gov/policy-issues/coronavirus/assistance-for-state-local-and-tribal-governments/emergency-rental-assistance-program' },
      { label: 'Find Local Help', url: 'https://www.211.org' }
    ],
    category: 'housing'
  },
  'eviction': {
    title: 'Eviction Rights & Help',
    content: `**Know Your Eviction Rights in ${userLocation}:**

**1. Notice Requirements**
• Landlord must give written notice
• You have the right to respond in court

**2. Get Legal Help**
• Free legal aid: lawhelp.org
• Local tenant unions

**3. Emergency Steps**
• Don't ignore court papers
• Show up to all court dates
• Bring proof of payments

**4. If You Must Move**
• Request moving assistance
• Check emergency housing options`,
    homework: `**Homework: Eviction Protection Plan**

1. 📋 Document all communication with landlord
2. 📞 Find free legal help in your area
3. 📅 Mark court dates on calendar
4. 💼 Gather: lease, payment records, photos
5. 🏠 Research backup housing options`,
    audioPrompt: "If facing eviction, remember you have rights. Document everything, show up to court, and seek legal help immediately. Don't ignore any legal notices.",
    links: [
      { label: 'Legal Aid', url: 'https://www.lawhelp.org' },
      { label: 'Tenant Rights', url: 'https://www.tenantresourcecenter.org' }
    ],
    category: 'housing'
  },
  'insurance': {
    title: 'Health Insurance Options',
    content: `**Health Insurance for Families in ${userLocation}:**

**1. Medicaid (Free/Low-Cost)**
• For low-income families
• Apply: healthcare.gov or your state website
• Covers children through CHIP

**2. Marketplace Plans (ACA)**
• Healthcare.gov
• Open enrollment: Nov 1 - Jan 15
• Tax credits available based on income

**3. Employer Insurance**
• Check if your job offers coverage
• Family plans usually available

**4. Free/Sliding Scale Clinics**
• Community Health Centers
• Find one: findahealthcenter.hrsa.gov`,
    homework: `**Homework: Health Insurance Action Plan**

1. 📋 Check if you qualify for Medicaid
2. 📞 Call 211 to find local health centers
3. 🌐 Visit healthcare.gov to compare plans
4. 📝 Gather: income proof, family size, current coverage
5. 📅 Mark open enrollment dates`,
    childrenActivity: `**Family Activity: Health Heroes**

Teach children about staying healthy:
• Practice washing hands together
• Create a "doctor visit" pretend play
• Draw pictures of healthy foods
• Talk about why we see doctors`,
    audioPrompt: "Health insurance is important for your family. Start by checking if you qualify for free or low-cost Medicaid. Visit healthcare.gov or call 211 to find local health centers that offer sliding scale fees.",
    links: [
      { label: 'Healthcare.gov', url: 'https://www.healthcare.gov' },
      { label: 'Find Health Centers', url: 'https://findahealthcenter.hrsa.gov' }
    ],
    category: 'health'
  },
  'health insurance': {
    title: 'Health Insurance Options',
    content: `**Health Insurance for Families in ${userLocation}:**

**1. Medicaid (Free/Low-Cost)**
• For low-income families
• Apply: healthcare.gov or your state website
• Covers children through CHIP

**2. Marketplace Plans (ACA)**
• Healthcare.gov
• Open enrollment: Nov 1 - Jan 15
• Tax credits available based on income

**3. Employer Insurance**
• Check if your job offers coverage
• Family plans usually available

**4. Free/Sliding Scale Clinics**
• Community Health Centers
• Find one: findahealthcenter.hrsa.gov`,
    homework: `**Homework: Health Insurance Action Plan**

1. 📋 Check if you qualify for Medicaid
2. 📞 Call 211 to find local health centers
3. 🌐 Visit healthcare.gov to compare plans
4. 📝 Gather: income proof, family size, current coverage
5. 📅 Mark open enrollment dates`,
    childrenActivity: `**Family Activity: Health Heroes**

Teach children about staying healthy:
• Practice washing hands together
• Create a "doctor visit" pretend play
• Draw pictures of healthy foods
• Talk about why we see doctors`,
    audioPrompt: "Health insurance is important for your family. Start by checking if you qualify for free or low-cost Medicaid. Visit healthcare.gov or call 211 to find local health centers that offer sliding scale fees.",
    links: [
      { label: 'Healthcare.gov', url: 'https://www.healthcare.gov' },
      { label: 'Find Health Centers', url: 'https://findahealthcenter.hrsa.gov' }
    ],
    category: 'health'
  },
  'budget': {
    title: 'Budget Planning Tips',
    content: `**50/30/20 Budget Rule:**

**50% - Needs (Must Pay)**
• Rent/Mortgage
• Utilities
• Groceries
• Insurance
• Transportation

**30% - Wants (Nice to Have)**
• Entertainment
• Dining out
• Shopping
• Subscriptions

**20% - Savings & Debt**
• Emergency fund
• Savings goals
• Extra debt payments

**Quick Tips:**
1. Track every expense for 1 week
2. Use the Budget feature in this app
3. Set up automatic savings
4. Review bills for unused subscriptions`,
    homework: `**Homework: Create Your Budget**

1. 📊 List all income sources
2. 📝 Write down all expenses for one month
3. 🎯 Categorize: Needs, Wants, Savings
4. ✂️ Find 3 expenses to reduce
5. 💰 Set a savings goal`,
    childrenActivity: `**Family Activity: Money Smart Kids**

Help children learn about money:
• Use play money to "buy" groceries
• Create a family savings jar
• Play "store" with real prices
• Talk about needs vs wants`,
    audioPrompt: "Creating a budget helps you take control of your money. Start by tracking all your expenses for one week. Then use the 50-30-20 rule: 50% for needs, 30% for wants, and 20% for savings.",
    category: 'financial'
  },
  'budget planning': {
    title: 'Budget Planning Tips',
    content: `**50/30/20 Budget Rule:**

**50% - Needs (Must Pay)**
• Rent/Mortgage
• Utilities
• Groceries
• Insurance
• Transportation

**30% - Wants (Nice to Have)**
• Entertainment
• Dining out
• Shopping
• Subscriptions

**20% - Savings & Debt**
• Emergency fund
• Savings goals
• Extra debt payments

**Quick Tips:**
1. Track every expense for 1 week
2. Use the Budget feature in this app
3. Set up automatic savings
4. Review bills for unused subscriptions`,
    homework: `**Homework: Create Your Budget**

1. 📊 List all income sources
2. 📝 Write down all expenses for one month
3. 🎯 Categorize: Needs, Wants, Savings
4. ✂️ Find 3 expenses to reduce
5. 💰 Set a savings goal`,
    childrenActivity: `**Family Activity: Money Smart Kids**

Help children learn about money:
• Use play money to "buy" groceries
• Create a family savings jar
• Play "store" with real prices
• Talk about needs vs wants`,
    audioPrompt: "Creating a budget helps you take control of your money. Start by tracking all your expenses for one week. Then use the 50-30-20 rule: 50% for needs, 30% for wants, and 20% for savings.",
    category: 'financial'
  },
  'food stamps': {
    title: 'SNAP Benefits (Food Stamps)',
    content: `**How to Apply for SNAP:**

**1. Check Eligibility**
• Based on household size and income
• A family of 4 can earn up to ~$3,000/month

**2. Apply Online or In-Person**
• Visit your state's SNAP website
• Or go to local SNAP office

**3. Documents Needed:**
• ID for all household members
• Proof of income (pay stubs)
• Rent/utility bills
• Social Security numbers

**4. Interview**
• Phone or in-person interview required
• Usually within 30 days

**Benefits:** $200-$800+ per month depending on family size`,
    homework: `**Homework: SNAP Application Steps**

1. 📋 Gather all required documents
2. 🌐 Find your state's SNAP website
3. 📝 Complete the application online or in person
4. 📞 Schedule your interview
5. ✅ Follow up if you don't hear back in 30 days`,
    childrenActivity: `**Family Activity: Healthy Eating**

Involve children in meal planning:
• Let them help choose healthy foods
• Teach them about different food groups
• Create a "healthy plate" drawing
• Practice reading food labels together`,
    audioPrompt: "SNAP benefits can help your family buy healthy food. Check your eligibility online, gather your documents, and apply through your state's website. The process usually takes about 30 days.",
    links: [
      { label: 'SNAP Info', url: 'https://www.fns.usda.gov/snap' },
      { label: 'Apply Online', url: 'https://www.benefits.gov' }
    ],
    category: 'financial'
  },
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
5. Submit all documents`,
    homework: `**Homework: School Enrollment Checklist**

1. 📋 Gather all required documents
2. 🌐 Find your school district website
3. 📞 Call the school to schedule enrollment
4. 📝 Fill out registration forms
5. 📅 Mark enrollment date on calendar`,
    childrenActivity: `**Family Activity: School Ready**

Prepare children for school:
• Visit the school together
• Practice the morning routine
• Read books about school
• Talk about making friends`,
    audioPrompt: "To enroll your child in school, gather birth certificate, proof of address, and immunization records. Contact your local school district to find your assigned school and schedule an enrollment meeting.",
    links: [
      { label: 'Find Your School', url: 'https://www.greatschools.org' },
      { label: 'School Enrollment Info', url: 'https://www.ed.gov' }
    ],
    category: 'education'
  },
  'homework': {
    title: 'Homework Help & Support',
    content: `**Helping Your Child with Homework:**

**1. Create a Study Space**
• Quiet, well-lit area
• All supplies nearby
• Remove distractions

**2. Set a Routine**
• Same time each day
• Break into smaller tasks
• Take short breaks

**3. Be Supportive**
• Help them understand, don't do it for them
• Ask questions to guide thinking
• Praise effort, not just results

**4. Get Help When Needed**
• Contact your child's teacher
• Look for tutoring programs
• Use online resources

**5. Make It Fun**
• Use games for learning
• Connect to real life
• Celebrate small wins`,
    homework: `**Homework Helper Checklist:**

1. 📚 Set up a quiet study space
2. ⏰ Create a daily homework schedule
3. 📝 Break big assignments into small steps
4. 🎯 Set goals and track progress
5. 🎉 Celebrate when homework is done`,
    childrenActivity: `**Family Activity: Homework Time**

Make homework fun:
• Create a special homework corner
• Use colorful supplies
• Play "teacher" and let child explain
• Take brain breaks with movement`,
    audioPrompt: "Help your child with homework by creating a quiet study space, setting a daily routine, and being supportive. Break big tasks into smaller steps and celebrate their progress.",
    links: [
      { label: 'Homework Help Resources', url: 'https://www.khanacademy.org' },
      { label: 'Study Tips', url: 'https://www.understood.org' }
    ],
    category: 'education'
  },
  'immigration': {
    title: 'Immigration Resources',
    content: `**Immigration Help & Resources:**

**Free Legal Help:**
• Immigration Advocates Network
• immigrationadvocates.org/nonprofit/legaldirectory
• Catholic Charities Immigration Services

**Know Your Rights:**
• You have the right to remain silent
• You don't have to open your door without a warrant
• You can refuse to sign documents you don't understand`,
    homework: `**Homework: Immigration Help Plan**

1. 📋 Document your immigration status
2. 🔍 Find free legal help in your area
3. 📞 Schedule a consultation
4. 📝 Gather all your documents
5. ⚖️ Know your rights before any meetings`,
    audioPrompt: "If you need immigration help, find free legal assistance through Immigration Advocates Network or Catholic Charities. Remember, you have rights - you can remain silent and don't have to open your door without a warrant.",
    links: [
      { label: 'USCIS', url: 'https://www.uscis.gov' },
      { label: 'Immigration Help', url: 'https://www.immigrationadvocates.org' }
    ],
    category: 'legal'
  },
  'immigration help': {
    title: 'Immigration Resources',
    content: `**Immigration Help & Resources:**

**Free Legal Help:**
• Immigration Advocates Network
• immigrationadvocates.org/nonprofit/legaldirectory
• Catholic Charities Immigration Services

**Know Your Rights:**
• You have the right to remain silent
• You don't have to open your door without a warrant
• You can refuse to sign documents you don't understand`,
    homework: `**Homework: Immigration Help Plan**

1. 📋 Document your immigration status
2. 🔍 Find free legal help in your area
3. 📞 Schedule a consultation
4. 📝 Gather all your documents
5. ⚖️ Know your rights before any meetings`,
    audioPrompt: "If you need immigration help, find free legal assistance through Immigration Advocates Network or Catholic Charities. Remember, you have rights - you can remain silent and don't have to open your door without a warrant.",
    links: [
      { label: 'USCIS', url: 'https://www.uscis.gov' },
      { label: 'Immigration Help', url: 'https://www.immigrationadvocates.org' }
    ],
    category: 'legal'
  },
  'job assistance': {
    title: 'Job Search & Employment Help',
    content: `**Job Search Resources in ${userLocation}:**

**1. Local Job Centers**
• One-Stop Career Centers
• Free job search assistance
• Resume help and interview prep

**2. Online Job Boards**
• Indeed.com
• LinkedIn.com
• USAJobs.gov (government jobs)

**3. Training Programs**
• Free job training programs
• Skills development courses
• Certification programs

**4. Resume & Interview Help**
• Free resume templates
• Mock interview practice
• Career counseling`,
    homework: `**Homework: Job Search Action Plan**

1. 📝 Create or update your resume
2. 🌐 Set up profiles on job websites
3. 📞 Contact local job centers
4. 📅 Apply to 5 jobs this week
5. 💼 Practice interview questions`,
    childrenActivity: `**Family Activity: Career Exploration**

Help children learn about jobs:
• Talk about different careers
• Play "what do you want to be?"
• Visit a parent's workplace (if possible)
• Draw pictures of jobs they know`,
    audioPrompt: "Start your job search by visiting your local One-Stop Career Center for free help. Create profiles on Indeed and LinkedIn, and apply to at least 5 jobs each week. Don't forget to practice your interview skills.",
    links: [
      { label: 'Indeed', url: 'https://www.indeed.com' },
      { label: 'USA Jobs', url: 'https://www.usajobs.gov' },
      { label: 'Career One Stop', url: 'https://www.careeronestop.org' }
    ],
    category: 'employment'
  },
  'childcare assistance': {
    title: 'Childcare Help & Resources',
    content: `**Childcare Assistance in ${userLocation}:**

**1. Child Care Subsidy Programs**
• State-funded childcare assistance
• Based on income and need
• Helps pay for licensed childcare

**2. Head Start & Early Head Start**
• Free preschool for low-income families
• Ages 0-5
• Includes meals and health services

**3. After-School Programs**
• Free or low-cost after-school care
• School-based programs
• Community centers

**4. Finding Quality Care**
• Check state licensing
• Visit facilities in person
• Ask about staff qualifications`,
    homework: `**Homework: Childcare Search Plan**

1. 📋 Check your eligibility for subsidies
2. 🔍 Find licensed childcare centers near you
3. 📞 Call to schedule visits
4. 📝 Prepare questions to ask
5. ✅ Choose the best option for your family`,
    childrenActivity: `**Family Activity: School Ready**

Prepare children for childcare:
• Practice saying goodbye
• Talk about what they'll do
• Visit the center together
• Read books about school`,
    audioPrompt: "Childcare assistance is available through state subsidy programs and Head Start. Check your eligibility, visit local centers, and ask about their programs. Quality childcare helps children learn and grow.",
    links: [
      { label: 'Child Care Aware', url: 'https://www.childcareaware.org' },
      { label: 'Head Start', url: 'https://www.acf.hhs.gov/ohs' },
      { label: 'Child Care Subsidies', url: 'https://www.childcare.gov' }
    ],
    category: 'family'
  },
  'help': {
    title: 'How I Can Help You',
    content: `**I can help you with:**

🏠 **Housing**
• Rent assistance programs
• Eviction rights
• Landlord communication

❤️ **Health**
• Finding healthcare
• Insurance options
• Vaccine schedules

💰 **Money**
• Budgeting tips
• SNAP/Food stamps
• Utility assistance

📚 **Education**
• School enrollment
• ESL classes
• College financial aid

⚖️ **Legal**
• Immigration resources
• Tenant rights
• Legal aid

**Just type your question!**`,
    category: 'general'
  }
});

// Quick action suggestions - will be filtered by user type
const ALL_QUICK_ACTIONS = {
  renter: [
    { id: 1, label: 'Rent Help', query: 'rent assistance', icon: Home, category: 'housing', color: 'blue' },
    { id: 2, label: 'Healthcare', query: 'health insurance', icon: Heart, category: 'health', color: 'red' },
    { id: 3, label: 'Food Assistance', query: 'food stamps', icon: DollarSign, category: 'financial', color: 'green' },
    { id: 4, label: 'School Help', query: 'school enrollment', icon: BookOpen, category: 'education', color: 'purple' },
    { id: 5, label: 'Legal Help', query: 'immigration help', icon: Scale, category: 'legal', color: 'orange' },
    { id: 6, label: 'Budget Tips', query: 'budget planning', icon: Lightbulb, category: 'financial', color: 'yellow' },
    { id: 7, label: 'Job Search', query: 'job assistance', icon: Briefcase, category: 'employment', color: 'indigo' },
    { id: 8, label: 'Childcare', query: 'childcare assistance', icon: Users, category: 'family', color: 'pink' }
  ],
  owner: [
    { id: 1, label: 'Tenant Management', query: 'how to manage tenants', icon: Users, category: 'property', color: 'emerald' },
    { id: 2, label: 'Lease Agreements', query: 'lease agreement help', icon: FileText, category: 'property', color: 'teal' },
    { id: 3, label: 'Rent Collection', query: 'rent collection strategies', icon: DollarSign, category: 'financial', color: 'green' },
    { id: 4, label: 'Property Maintenance', query: 'property maintenance management', icon: Wrench, category: 'property', color: 'blue' },
    { id: 5, label: 'Legal Compliance', query: 'landlord legal requirements', icon: Scale, category: 'legal', color: 'purple' },
    { id: 6, label: 'Tax Planning', query: 'property tax deductions', icon: Briefcase, category: 'financial', color: 'indigo' },
    { id: 7, label: 'ROI Analysis', query: 'property investment ROI', icon: TrendingUp, category: 'property', color: 'emerald' },
    { id: 8, label: 'Eviction Process', query: 'eviction procedures', icon: AlertCircle, category: 'legal', color: 'orange' }
  ]
};

// Homework templates
const HOMEWORK_TEMPLATES = {
  research: `**Research Homework: [TOPIC]**

1. 🔍 Find 3 local resources for [TOPIC]
2. 📞 Call each one and ask about:
   • Eligibility requirements
   • Application process
   • Wait times
3. 📝 Write down what you learn
4. ✅ Choose the best option`,
  documents: `**Document Preparation: [TOPIC]**

Gather these documents:
1. Identification (ID, birth certificates)
2. Proof of income (pay stubs, tax returns)
3. Proof of address (utility bills, lease)
4. [SPECIFIC DOCUMENTS]
5. Keep everything in a safe folder`,
  phone_calls: `**Phone Call Preparation: [TOPIC]**

Before calling:
1. Write down your questions
2. Have your documents ready
3. Note the date and who you spoke with
4. Ask about:
   • Next steps
   • Timeline
   • Required documents`
};

export default function AIAssistant() {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [activeFeature, setActiveFeature] = useState(null);
  const [userLocation, setUserLocation] = useState('your area');
  const [savedChats, setSavedChats] = useState([]);
  const [showSavedChats, setShowSavedChats] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bookmarkedMessages, setBookmarkedMessages] = useState(new Set());
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedAudio, setUploadedAudio] = useState(null);
  const [useBedrock, setUseBedrock] = useState(true); // Toggle for AWS Bedrock
  const [currentModel, setCurrentModel] = useState('claude-3-haiku-20240307');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);

  // Determine user type and design theme
  const userType = userProfile?.userType || userProfile?.role || 'renter';
  const isOwner = userType === 'owner';
  const isRenter = userType === 'renter';

  // User-type specific design themes
  const designTheme = useMemo(() => {
    if (isOwner) {
      return {
        primary: 'from-emerald-600 to-teal-600',
        primaryHover: 'from-emerald-700 to-teal-700',
        secondary: 'from-purple-600 to-pink-600',
        secondaryHover: 'from-purple-700 to-pink-700',
        bgGradient: 'from-emerald-50 via-teal-50 to-cyan-50',
        cardBg: 'bg-white border-emerald-200',
        accent: 'emerald',
        iconBg: 'bg-emerald-500',
        textPrimary: 'text-emerald-900',
        textSecondary: 'text-teal-700',
        badge: 'bg-emerald-100 text-emerald-700',
        title: 'Property Owner Assistant',
        subtitle: 'Your property management and business support',
      };
    } else {
      return {
        primary: 'from-blue-600 to-indigo-600',
        primaryHover: 'from-blue-700 to-indigo-700',
        secondary: 'from-purple-600 to-pink-600',
        secondaryHover: 'from-purple-700 to-pink-700',
        bgGradient: 'from-blue-50 via-indigo-50 to-purple-50',
        cardBg: 'bg-white border-blue-200',
        accent: 'blue',
        iconBg: 'bg-blue-500',
        textPrimary: 'text-blue-900',
        textSecondary: 'text-indigo-700',
        badge: 'bg-blue-100 text-blue-700',
        title: 'Family Support Assistant',
        subtitle: 'Your family resource and housing support',
      };
    }
  }, [isOwner, isRenter]);

  // Initialize with welcome message (user-type specific)
  useEffect(() => {
    const welcomeContent = isOwner 
      ? `Hello ${userProfile?.firstName || 'there'}! 👋 I'm your **Property Owner Assistant** powered by **AWS Bedrock AI** for ${userLocation}. I specialize in property management and business support:

• **Property Management** - Tenant relations, lease agreements, property maintenance
• **Business Operations** - Tax planning, insurance, property investment advice
• **Legal & Compliance** - Landlord rights, eviction procedures, fair housing laws
• **Financial Management** - Rent collection, expense tracking, ROI analysis
• **Tenant Relations** - Communication strategies, conflict resolution, tenant screening

**AI-Powered Features:**
🤖 **AWS Bedrock** - Advanced AI for intelligent responses
📷 **Image Analysis** - Understand documents, property photos, invoices
🎤 Voice messages & audio guidance
📊 Business insights & recommendations
💼 Property management best practices
📍 Location-specific resources
💾 Save conversations & bookmarks
🔍 Search past conversations

**Current AI Model:** Claude 3 Haiku (Fast & Smart)

Ask me anything about property management, tenant relations, or business operations!`
      : `Hello ${userProfile?.firstName || 'there'}! 👋 I'm your **Family Support Assistant** powered by **AWS Bedrock AI** for ${userLocation}. I can help with:

• **Housing** - Rent assistance, eviction protection, repairs, tenant rights
• **Health** - Insurance, clinics, mental health resources, family wellness
• **Money** - Budgeting, benefits, SNAP, utility assistance, financial planning
• **Education** - School enrollment, homework help, tutoring, college planning
• **Legal** - Immigration resources, tenant rights, legal aid, family law
• **Family Support** - Childcare, parenting resources, family activities

**AI-Powered Features:**
🤖 **AWS Bedrock** - Advanced AI for intelligent responses
📷 **Image Analysis** - Understand documents, bills, homework, forms
🎤 Voice messages & audio guidance
📚 Homework assignments & action plans
👨‍👩‍👧‍👦 Family activities for children
📍 Location-specific resources
💾 Save conversations & bookmarks
🔍 Search past conversations

**Current AI Model:** Claude 3 Haiku (Fast & Smart)

Ask me anything - I'm here to help with any question you have!`;

    const welcomeMessage = {
      id: 1,
      type: 'assistant',
      content: welcomeContent,
      timestamp: new Date(),
      model: 'bedrock'
    };
    setMessages([welcomeMessage]);
    loadSavedChats();
  }, [userProfile, userLocation, isOwner]);

  // Load saved chats from Firestore
  const loadSavedChats = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'aiAssistantChats'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      setSavedChats(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })));
    } catch (error) {
      console.error('Error loading saved chats:', error);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Use AWS Bedrock for AI responses (with comprehensive fallback to ensure ANY question gets answered)
  const findResponse = useCallback(async (query, conversationHistory = [], useBedrock = true) => {
    // Try AWS Bedrock first if enabled
    if (useBedrock) {
      try {
        const context = {
          location: userLocation,
          userType: userProfile?.userType || 'renter',
          familyInfo: {
            familySize: userProfile?.familyMembers?.length || 1,
            hasChildren: (userProfile?.familyMembers || []).some(m => m.relationship === 'child'),
          },
          // Add owner-specific context
          ...(isOwner && {
            propertyInfo: {
              totalProperties: userProfile?.property ? 1 : 0,
              propertyType: userProfile?.property?.type || 'residential',
            }
          }),
        };

        const bedrockResponse = await bedrockService.chat(
          query,
          context,
          conversationHistory,
          { 
            stream: false, 
            model: 'claude-3-haiku-20240307',
            temperature: 0.8, // Slightly higher for more creative responses
            maxTokens: 2000 // Allow longer responses
          }
        );

        if (bedrockResponse && bedrockResponse.response) {
          // Parse Bedrock response and format it
          const content = bedrockResponse.response;
          
          // Extract title if present (first line or bold text)
          const titleMatch = content.match(/\*\*(.+?)\*\*/);
          const title = titleMatch ? titleMatch[1] : 'AI Assistant Response';
          
          // Extract links if present
          const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
          const links = linkMatches.map(link => {
            const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
            return { label: match[1], url: match[2] };
          });

          // Determine category from query
          const lowerQuery = query.toLowerCase();
          let category = 'general';
          if (lowerQuery.includes('rent') || lowerQuery.includes('housing') || lowerQuery.includes('evict') || lowerQuery.includes('tenant') || lowerQuery.includes('property')) {
            category = isOwner ? 'property' : 'housing';
          } else if (lowerQuery.includes('health') || lowerQuery.includes('insurance') || lowerQuery.includes('medical')) {
            category = 'health';
          } else if (lowerQuery.includes('budget') || lowerQuery.includes('money') || lowerQuery.includes('food stamp') || lowerQuery.includes('financial')) {
            category = 'financial';
          } else if (lowerQuery.includes('school') || lowerQuery.includes('education') || lowerQuery.includes('homework')) {
            category = 'education';
          } else if (lowerQuery.includes('immigration') || lowerQuery.includes('legal') || lowerQuery.includes('law')) {
            category = 'legal';
          } else if (lowerQuery.includes('job') || lowerQuery.includes('employment') || lowerQuery.includes('career')) {
            category = 'employment';
          } else if (lowerQuery.includes('childcare') || lowerQuery.includes('family') || lowerQuery.includes('child')) {
            category = 'family';
          }

          return {
            title: title,
            content: content,
            homework: null,
            childrenActivity: null,
            audioPrompt: content.substring(0, 300), // First 300 chars for audio
            links: links,
            category: category,
            model: bedrockResponse.model || 'bedrock',
          };
        }
      } catch (error) {
        console.warn('Bedrock error, falling back to enhanced responses:', error);
        // Fall through to enhanced static responses
      }
    }

    // Enhanced fallback - ensures ANY question gets answered
    const AI_RESPONSES = createAIResponses(userLocation);
    const lowerQuery = query.toLowerCase();
    
    // Owner-specific responses
    if (isOwner) {
      if (lowerQuery.includes('tenant') || lowerQuery.includes('renter') || lowerQuery.includes('lease')) {
        return {
          title: 'Tenant & Lease Management',
          content: `I can help you with tenant and lease management:

**1. Tenant Screening**
• Background checks and credit reports
• Reference verification
• Income verification (typically 3x rent)

**2. Lease Agreements**
• Standard lease templates
• State-specific requirements
• Renewal and termination procedures

**3. Rent Collection**
• Payment methods and policies
• Late fees and grace periods
• Eviction procedures (if needed)

**4. Property Maintenance**
• Maintenance request handling
• Emergency repairs
• Property inspections

**5. Legal Compliance**
• Fair housing laws
• Landlord-tenant laws by state
• Eviction laws and procedures

Would you like more specific help with any of these areas?`,
          category: 'property',
          model: 'fallback',
        };
      }
      
      if (lowerQuery.includes('property') || lowerQuery.includes('investment') || lowerQuery.includes('roi')) {
        return {
          title: 'Property Investment & Management',
          content: `Here's guidance on property investment and management:

**1. Property Investment**
• ROI calculations and analysis
• Market research and property valuation
• Financing options and mortgage strategies

**2. Tax Benefits**
• Depreciation deductions
• Expense deductions
• 1031 exchanges

**3. Property Management**
• Maintenance scheduling
• Vendor management
• Property improvement strategies

**4. Financial Planning**
• Cash flow management
• Expense tracking
• Profit optimization

Need help with a specific aspect of property management?`,
          category: 'property',
          model: 'fallback',
        };
      }
    }
    
    // Priority-based keyword matching (more specific first)
    if (lowerQuery.includes('homework') || lowerQuery.includes('home work') || 
        lowerQuery.includes('school work') || lowerQuery.includes('assignment')) {
      return AI_RESPONSES['homework'] || AI_RESPONSES['school enrollment'] || AI_RESPONSES['help'];
    }
    
    if (lowerQuery.includes('rent') && !lowerQuery.includes('parent')) {
      return AI_RESPONSES['rent assistance'];
    }
    
    if (lowerQuery.includes('evict')) {
      return AI_RESPONSES['eviction'];
    }
    
    if (lowerQuery.includes('health insurance') || (lowerQuery.includes('insurance') && lowerQuery.includes('health'))) {
      return AI_RESPONSES['health insurance'];
    }
    
    if (lowerQuery.includes('budget') || lowerQuery.includes('money') || lowerQuery.includes('save money')) {
      return AI_RESPONSES['budget'] || AI_RESPONSES['budget planning'];
    }
    
    if (lowerQuery.includes('food stamp') || lowerQuery.includes('snap') || 
        lowerQuery.includes('food assistance') || lowerQuery.includes('food help')) {
      return AI_RESPONSES['food stamps'];
    }
    
    if (lowerQuery.includes('school') || lowerQuery.includes('enroll') || 
        lowerQuery.includes('education') || lowerQuery.includes('child school')) {
      return AI_RESPONSES['school enrollment'];
    }
    
    if (lowerQuery.includes('immigration') || lowerQuery.includes('immigrant')) {
      return AI_RESPONSES['immigration'] || AI_RESPONSES['immigration help'];
    }
    
    if ((lowerQuery.includes('job') || lowerQuery.includes('employment') || 
         lowerQuery.includes('career') || lowerQuery.includes('work')) && 
        !lowerQuery.includes('homework') && !lowerQuery.includes('school work')) {
      return AI_RESPONSES['job assistance'];
    }
    
    if (lowerQuery.includes('childcare') || lowerQuery.includes('child care') || 
        lowerQuery.includes('daycare') || lowerQuery.includes('babysit')) {
      return AI_RESPONSES['childcare assistance'];
    }
    
    // COMPREHENSIVE FALLBACK - Ensures ANY question gets answered
    // If no specific match, provide a helpful general response
    return {
      title: 'I\'m Here to Help!',
      content: `Thank you for your question: "${query}"

I understand you're asking about this topic. While I may not have a pre-written response for this specific question, I can help you in several ways:

**1. General Guidance**
Based on your question, here are some steps you can take:
• Research the topic online using reliable sources
• Contact relevant organizations or agencies
• Consult with professionals in the field
• Check local resources in ${userLocation}

**2. How I Can Help**
• If you provide more details, I can give more specific guidance
• I can help you find relevant resources and organizations
• I can break down complex topics into simple steps
• I can help you prepare questions to ask professionals

**3. Related Topics I Can Help With:**
${isOwner ? `
• Property management and tenant relations
• Business operations and tax planning
• Legal compliance and landlord rights
• Financial management and ROI analysis` : `
• Housing assistance and tenant rights
• Health insurance and medical resources
• Financial aid and budgeting
• Education and school enrollment
• Legal resources and immigration help`}

**4. Next Steps**
Please feel free to:
• Ask a more specific question
• Tell me more about your situation
• Ask about a related topic I mentioned above
• Upload a document or image if relevant

I'm here to help with any question you have!`,
      category: 'general',
      model: 'comprehensive-fallback',
      links: isOwner ? [
        { label: 'Landlord Resources', url: 'https://www.nolo.com/legal-encyclopedia/landlord-tenant-law' },
        { label: 'Property Management', url: 'https://www.biggerpockets.com' }
      ] : [
        { label: '211 Resources', url: 'https://www.211.org' },
        { label: 'Find Local Help', url: 'https://www.findhelp.org' }
      ],
    };
  }, [userLocation, userProfile, isOwner]);

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = {
          id: Date.now() + Math.random(),
          file: file,
          url: e.target.result,
          name: file.name
        };
        setUploadedImages(prev => [...prev, imageData]);
        toast.success(`${file.name} added`);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
  };

  // Remove uploaded image
  const removeImage = (id) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  // Analyze image using AWS Bedrock Vision (with Rekognition fallback)
  const analyzeImage = async (imageFile) => {
    toast.info('Analyzing image with AI...');
    
    try {
      // Try Bedrock Vision first
      const bedrockAnalysis = await bedrockService.analyzeImage(
        imageFile,
        'What is in this image? Please describe it in detail and identify any text, documents, or important information.',
        { location: userLocation, userType: userProfile?.userType }
      );

      if (bedrockAnalysis && bedrockAnalysis.description) {
        return {
          description: bedrockAnalysis.description,
          detectedObjects: bedrockAnalysis.labels || [],
          context: bedrockAnalysis.context || 'general',
          model: bedrockAnalysis.model || 'bedrock-vision',
          suggestions: [
            "I can help you understand this image better",
            "If it's a document, I can help you with next steps",
            "If it's homework, I can provide study guidance",
            "If it's a bill or form, I can help you take action"
          ]
        };
      }
    } catch (error) {
      console.warn('Bedrock Vision error, trying Rekognition:', error);
    }

    // Fallback to Rekognition
    try {
      const rekognitionLabels = await aiService.detectLabels(imageFile);
      const labels = rekognitionLabels.Labels?.slice(0, 5).map(l => l.Name).join(', ') || 'various items';
      
      return {
        description: `I can see this image contains: ${labels}. Could you tell me more about what you need help with regarding this image? For example: 'This is a document about rent' or 'This is my child's homework' or 'This is a medical bill'.`,
        detectedObjects: rekognitionLabels.Labels || [],
        context: 'general',
        model: 'rekognition',
        suggestions: [
          "If it's a document, I can help you understand it",
          "If it's homework, I can provide study tips",
          "If it's a bill, I can help with payment assistance",
          "If it's a form, I can guide you through filling it out"
        ]
      };
    } catch (error) {
      console.error('Image analysis error:', error);
      return {
        description: "I can see you've shared an image. To provide the most helpful response, please tell me what you see in the image or what specific help you need related to it.",
        detectedObjects: [],
        context: 'general',
        model: 'basic-fallback',
        suggestions: []
      };
    }
  };

  // Optimized message handler with AWS Bedrock
  const handleSend = useCallback(async (text = inputValue) => {
    const query = text.trim();
    const hasImages = uploadedImages.length > 0;
    const hasAudio = uploadedAudio !== null;
    
    if (!query && !hasImages && !hasAudio) return;

    setIsTyping(true);

    // Analyze images if any using AWS Bedrock Vision or Rekognition
    let imageAnalysis = null;
    if (hasImages && uploadedImages[0].file) {
      try {
        imageAnalysis = await analyzeImage(uploadedImages[0].file);
        toast.success('Image analyzed!');
      } catch (error) {
        console.error('Error analyzing image:', error);
        toast.error('Failed to analyze image');
      }
    }

    // Add user message with attachments
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: query || (hasImages ? '📷 [Image attached]' : '') || (hasAudio ? '🎤 [Audio message]' : ''),
      images: uploadedImages.map(img => ({ url: img.url, name: img.name })),
      audio: uploadedAudio ? { url: uploadedAudio.url, blob: uploadedAudio.blob } : null,
      imageAnalysis: imageAnalysis,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessages = [...messages, userMessage];
    setInputValue('');
    setUploadedImages([]);
    setUploadedAudio(null);

    // Build response query considering image context
    let responseQuery = query || 'help';
    if (imageAnalysis && imageAnalysis.description) {
      responseQuery = `${query} ${imageAnalysis.description}`.trim();
    }

    try {
      // Get conversation history for context
      const conversationHistory = currentMessages
        .filter(msg => msg.type === 'user' || msg.type === 'assistant')
        .slice(-10) // Last 10 messages
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content || msg.text || ''
        }));

      // Use AWS Bedrock for AI response
      const response = await findResponse(responseQuery, conversationHistory, useBedrock);
      
      // Create assistant response with image context
      let assistantContent = response.content;
      if (imageAnalysis && hasImages) {
        assistantContent = `**📷 Image Analysis (${imageAnalysis.model || 'AI'}):**\n${imageAnalysis.description}\n\n---\n\n**💬 Response:**\n${response.content}`;
      }
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        title: response.title,
        content: assistantContent,
        homework: response.homework,
        childrenActivity: response.childrenActivity,
        audioPrompt: response.audioPrompt || assistantContent.substring(0, 200),
        links: response.links || [],
        category: response.category || 'general',
        model: response.model || 'bedrock',
        timestamp: new Date(),
        features: {
          hasHomework: !!response.homework,
          hasChildrenActivity: !!response.childrenActivity,
          hasAudio: !!(response.audioPrompt || assistantContent),
          hasLinks: !!(response.links && response.links.length > 0)
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      toast.success(`Response from ${response.model || 'AI'} Assistant`);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get response. Please try again.');
      
      // Fallback response
      const fallbackMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        title: 'I\'m having trouble connecting',
        content: 'I apologize, but I\'m having trouble connecting to the AI service right now. Please try again in a moment, or try rephrasing your question.',
        timestamp: new Date(),
        features: {}
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, findResponse, uploadedImages, uploadedAudio, messages, userLocation, userProfile, useBedrock]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Quick action handler with AWS Bedrock
  const handleQuickAction = useCallback(async (query) => {
    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Get conversation history for context
      const conversationHistory = messages
        .filter(msg => msg.type === 'user' || msg.type === 'assistant')
        .slice(-10)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content || msg.text || ''
        }));

      // Use AWS Bedrock for AI response
      const response = await findResponse(query, conversationHistory, useBedrock);
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        title: response.title,
        content: response.content,
        homework: response.homework,
        childrenActivity: response.childrenActivity,
        audioPrompt: response.audioPrompt || response.content.substring(0, 200),
        links: response.links || [],
        category: response.category || 'general',
        model: response.model || 'bedrock',
        timestamp: new Date(),
        features: {
          hasHomework: !!response.homework,
          hasChildrenActivity: !!response.childrenActivity,
          hasAudio: !!(response.audioPrompt || response.content),
          hasLinks: !!(response.links && response.links.length > 0)
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      toast.success(`Response from ${response.model || 'AI'} Assistant`);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get response. Please try again.');
    } finally {
      setIsTyping(false);
    }
  }, [findResponse, messages, userLocation, userProfile, useBedrock]);

  // Audio recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setUploadedAudio({
          blob: audioBlob,
          url: audioUrl,
          timestamp: new Date()
        });
        toast.success('Audio recorded! Click send to include it in your message.');
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.success('Recording started...');
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      toast.success('Recording stopped');
    }
  };

  // Save conversation
  const saveConversation = async () => {
    if (!currentUser || messages.length <= 1) {
      toast.error('No conversation to save');
      return;
    }
    try {
      await addDoc(collection(db, 'aiAssistantChats'), {
        userId: currentUser.uid,
        title: `Chat - ${new Date().toLocaleDateString()}`,
        messages: messages,
        location: userLocation,
        createdAt: serverTimestamp()
      });
      toast.success('Conversation saved!');
      loadSavedChats();
    } catch (error) {
      console.error('Error saving conversation:', error);
      toast.error('Failed to save conversation');
    }
  };

  // Export conversation
  const exportConversation = () => {
    const conversationText = messages.map(msg => {
      const time = new Date(msg.timestamp).toLocaleString();
      return `${msg.type === 'user' ? 'You' : 'Assistant'}: ${msg.content}\n${time}\n\n`;
    }).join('---\n\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conversation exported!');
  };

  // Bookmark message
  const toggleBookmark = (messageId) => {
    setBookmarkedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
        toast.success('Bookmark removed');
      } else {
        newSet.add(messageId);
        toast.success('Bookmark saved');
      }
      return newSet;
    });
  };

  // Feature handlers
  const generateHomework = useCallback((topic, type = 'research') => {
    const template = HOMEWORK_TEMPLATES[type] || HOMEWORK_TEMPLATES.research;
    return template.replace(/\[TOPIC\]/g, topic);
  }, []);

  const createChildrenActivity = useCallback((topic) => {
    return `**Family Activity: Learning About ${topic}**

👨‍👩‍👧‍👦 **Ages 3-6:**
• Draw pictures about ${topic}
• Create a story together
• Play "helper" pretend games

👦👧 **Ages 7-12:**
• Research fun facts
• Create a poster
• Interview family members

📱 **Teens:**
• Help with research
• Practice phone calls
• Learn about community resources`;
  }, []);

  // Copy message with enhanced feedback
  const copyMessage = useCallback((id, content) => {
    const plainText = content.replace(/\*\*/g, '').replace(/\*\*(.*?)\*\*/g, '$1');
    navigator.clipboard.writeText(plainText);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Clear chat with confirmation
  const clearChat = () => {
    if (window.confirm('Clear conversation history?')) {
      stopSpeaking();
    setMessages([{
      id: Date.now(),
      type: 'assistant',
        content: `Chat cleared! How can I help your family in ${userLocation} today?`,
      timestamp: new Date()
    }]);
      toast.success('Conversation cleared');
    }
  };

  // Format message content with enhanced styling
  const formatContent = useCallback((content) => {
    return content.split('\n').map((line, i) => {
      if (!line.trim()) return <br key={i} />;
        
        // Headers
        if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={i} className="font-semibold text-gray-900 mt-4 mb-2 text-lg" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*/g, '') }} />;
      }
      
      // Bold text
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      
      // List items
      if (line.startsWith('- ') || line.startsWith('• ') || /^\d+\.\s/.test(line)) {
        return <li key={i} className="ml-4 mb-1 text-gray-700" dangerouslySetInnerHTML={{ __html: line.replace(/^[-•\d\.\s]+/, '') }} />;
      }
      
      return <p key={i} className="text-gray-700 mb-2" dangerouslySetInnerHTML={{ __html: line }} />;
    });
  }, []);

  // Get user-type specific quick actions
  const QUICK_ACTIONS = useMemo(() => {
    return ALL_QUICK_ACTIONS[userType] || ALL_QUICK_ACTIONS.renter;
  }, [userType]);

  // Filter messages by category
  const filteredQuickActions = useMemo(() => {
    if (selectedCategory === 'all') return QUICK_ACTIONS;
    return QUICK_ACTIONS.filter(action => action.category === selectedCategory);
  }, [selectedCategory, QUICK_ACTIONS]);

  // Search messages
  const searchMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(query) ||
      (msg.title && msg.title.toLowerCase().includes(query))
    );
  }, [messages, searchQuery]);

  const categories = useMemo(() => {
    if (isOwner) {
      return ['all', 'property', 'financial', 'legal', 'business', 'maintenance'];
    }
    return ['all', 'housing', 'health', 'financial', 'education', 'legal', 'employment', 'family'];
  }, [isOwner]);

  return (
    <div className={`h-[calc(100vh-120px)] flex flex-col max-w-7xl mx-auto p-4 lg:p-6 min-h-screen ${
      isOwner 
        ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Enhanced Header with User-Type Specific Design */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 bg-gradient-to-br ${isOwner ? 'from-emerald-600 to-teal-600' : 'from-blue-600 to-indigo-600'} rounded-2xl shadow-lg`}>
            <Zap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isOwner ? 'text-emerald-900' : 'text-blue-900'}`}>{designTheme.title}</h1>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`h-4 w-4 ${isOwner ? 'text-teal-700' : 'text-indigo-700'}`} />
              <span className={isOwner ? 'text-teal-700' : 'text-indigo-700'}>Resources for {userLocation}</span>
              <button 
                onClick={() => {
                  const newLocation = prompt('Enter your location:', userLocation) || userLocation;
                  setUserLocation(newLocation);
                }}
                className={`${isOwner ? 'text-teal-700 hover:text-emerald-900' : 'text-indigo-700 hover:text-blue-900'} text-xs underline`}
              >
                Change
              </button>
          </div>
          <p className={`text-xs mt-1 ${isOwner ? 'text-teal-700' : 'text-indigo-700'}`}>{designTheme.subtitle}</p>
        </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSavedChats(!showSavedChats)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Saved chats"
          >
            <History className="h-5 w-5" />
          </button>
          <button
            onClick={saveConversation}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Save conversation"
          >
            <Save className="h-5 w-5" />
          </button>
          <button
            onClick={exportConversation}
            className={`p-2 text-gray-600 ${isOwner ? 'hover:text-emerald-600 hover:bg-emerald-50' : 'hover:text-blue-600 hover:bg-blue-50'} rounded-lg transition-colors`}
            title="Export conversation"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        <button
          onClick={clearChat}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Clear chat"
        >
            <Trash2 className="h-5 w-5" />
        </button>
        </div>
      </div>

      {/* Settings Panel with User-Type Specific Design */}
      {showSettings && (
        <div className={`mb-4 p-4 ${isOwner ? 'bg-emerald-50' : 'bg-blue-50'} rounded-xl border ${isOwner ? 'border-emerald-200' : 'border-blue-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold ${isOwner ? 'text-emerald-900' : 'text-blue-900'}`}>AI Settings</h3>
            <button onClick={() => setShowSettings(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">🤖 AWS Bedrock AI</span>
                <p className="text-xs text-gray-500">Use advanced AI for intelligent responses</p>
              </div>
              <button
                onClick={() => setUseBedrock(!useBedrock)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useBedrock 
                    ? isOwner ? 'bg-emerald-600' : 'bg-blue-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useBedrock ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {useBedrock && (
              <div className="pl-4 border-l-2 border-blue-300">
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Current Model:</strong> Claude 3 Haiku
                </p>
                <p className="text-xs text-gray-500">
                  Fast, affordable, and intelligent AI responses powered by AWS Bedrock
                </p>
              </div>
            )}
            <div className="pt-2 border-t border-blue-200">
              <p className="text-xs text-gray-600">
                💡 <strong>Audio:</strong> Click the 🔊 Listen button on any message to hear the response
              </p>
              <p className="text-xs text-gray-600 mt-1">
                📷 <strong>Images:</strong> Upload images for AI-powered analysis using AWS Rekognition & Bedrock Vision
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Saved Chats Panel */}
      {showSavedChats && savedChats.length > 0 && (
        <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-900">Saved Conversations</h3>
            <button onClick={() => setShowSavedChats(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {savedChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  setMessages(chat.messages);
                  setShowSavedChats(false);
                  toast.success('Chat loaded!');
                }}
                className="w-full text-left p-2 bg-white rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="font-medium text-sm">{chat.title}</div>
                <div className="text-xs text-gray-500">
                  {chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : 'Recently'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? isOwner 
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversation..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Quick Actions with Categories */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Quick Help Topics</h3>
          <span className="text-xs text-gray-500">{userLocation} resources</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {filteredQuickActions.map((action) => {
            const getColorClasses = (color) => {
              const colorMap = {
                blue: isOwner ? 'border-emerald-200 hover:border-emerald-300 text-emerald-600' : 'border-blue-200 hover:border-blue-300 text-blue-600',
                red: 'border-red-200 hover:border-red-300 text-red-600',
                green: 'border-green-200 hover:border-green-300 text-green-600',
                purple: 'border-purple-200 hover:border-purple-300 text-purple-600',
                orange: 'border-orange-200 hover:border-orange-300 text-orange-600',
                yellow: 'border-yellow-200 hover:border-yellow-300 text-yellow-600',
                emerald: 'border-emerald-200 hover:border-emerald-300 text-emerald-600',
                teal: 'border-teal-200 hover:border-teal-300 text-teal-600',
                indigo: 'border-indigo-200 hover:border-indigo-300 text-indigo-600',
              };
              return colorMap[color] || 'border-gray-200 hover:border-gray-300 text-gray-600';
            };
            
            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.query)}
                className={`flex flex-col items-center gap-2 p-3 bg-white border-2 rounded-xl text-sm font-medium hover:shadow-md transition-all duration-200 ${getColorClasses(action.color)}`}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-xs text-center">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Enhanced Chat Container */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {(searchQuery ? searchMessages : messages).map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              {message.type === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 bg-gradient-to-br ${isOwner ? 'from-emerald-500 to-teal-600' : 'from-blue-500 to-indigo-600'} rounded-full flex items-center justify-center`}>
                      <Zap className="h-3 w-3 text-white" />
                  </div>
                    <span className="text-xs text-gray-500 font-medium">{isOwner ? 'Property Owner Assistant' : 'Family Assistant'}</span>
                    {message.model && (
                      <span className={`text-xs px-2 py-0.5 ${isOwner ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'} rounded-full font-medium`}>
                        {message.model === 'bedrock' ? '🤖 AWS Bedrock' : 
                         message.model === 'rekognition' ? '👁️ AWS Vision' :
                         message.model === 'fallback' ? '📝 Smart Fallback' : 
                         message.model === 'comprehensive-fallback' ? '💡 Smart Response' : message.model}
                      </span>
                    )}
                </div>
              )}
              
                {/* Message Bubble with User-Type Specific Design */}
              <div className={`rounded-2xl p-4 ${
                message.type === 'user'
                  ? `bg-gradient-to-r ${isOwner ? 'from-emerald-600 to-teal-600' : 'from-blue-600 to-indigo-600'} text-white`
                    : isOwner 
                      ? 'bg-white border border-emerald-200'
                      : 'bg-white border border-blue-200'
              }`}>
                {message.title && (
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className={`h-4 w-4 ${isOwner ? 'text-emerald-500' : 'text-blue-500'}`} />
                    {message.title}
                  </h3>
                )}
                  
                  {/* Display Images */}
                  {message.images && message.images.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {message.images.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img 
                            src={img.url} 
                            alt={img.name || 'Uploaded image'} 
                            className="max-w-full h-auto rounded-lg border border-gray-200"
                            style={{ maxHeight: '300px' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Display Audio */}
                  {message.audio && (
                    <div className={`mb-3 flex items-center gap-3 p-3 rounded-lg ${message.type === 'user' ? 'bg-white/10' : isOwner ? 'bg-emerald-50 border border-emerald-200' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className={`w-10 h-10 ${isOwner ? 'bg-emerald-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                        <Mic className={`h-5 w-5 ${isOwner ? 'text-emerald-600' : 'text-blue-600'}`} />
                      </div>
                      <audio src={message.audio.url} controls className="flex-1" />
                    </div>
                  )}

                  {/* Image Analysis */}
                  {message.imageAnalysis && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <strong>📷 Image Analysis:</strong> {message.imageAnalysis.description}
                      </p>
                    </div>
                  )}

                  <div className={message.type === 'user' ? 'text-white' : 'text-gray-800'}>
                    {message.type === 'user' ? message.content : formatContent(message.content)}
                  </div>

                  {/* Links */}
                  {message.links && message.links.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {message.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs hover:bg-blue-200 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {link.label}
                          </a>
                        ))}
              </div>
                    </div>
                  )}

                  {/* Enhanced Features for Assistant Messages */}
                  {message.type === 'assistant' && message.features && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {message.features.hasHomework && (
                          <button 
                            onClick={() => {
                              const homeworkText = message.homework || generateHomework(message.title || 'this topic');
                              navigator.clipboard.writeText(homeworkText);
                              toast.success('Homework copied to clipboard!');
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs hover:bg-green-200 transition-colors"
                          >
                            <FileText className="h-3 w-3" />
                            Save Homework
                          </button>
                        )}
                        {message.features.hasChildrenActivity && (
                          <button 
                            onClick={() => {
                              const activityText = message.childrenActivity || createChildrenActivity(message.title || 'this topic');
                              navigator.clipboard.writeText(activityText);
                              toast.success('Activity copied to clipboard!');
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs hover:bg-orange-200 transition-colors"
                          >
                            <Users className="h-3 w-3" />
                            Save Activity
                          </button>
                        )}
                        {message.features.hasAudio && (
                          <button 
                            onClick={() => {
                              if (message.audioPrompt && 'speechSynthesis' in window) {
                                // Stop any current speech
                                window.speechSynthesis.cancel();
                                
                                // Create and play new utterance
                                const utterance = new SpeechSynthesisUtterance(message.audioPrompt);
                                utterance.rate = 0.9;
                                utterance.pitch = 1;
                                utterance.volume = 0.8;
                                
                                utterance.onstart = () => {
                                  toast.success('Playing audio...');
                                };
                                
                                utterance.onend = () => {
                                  // Audio finished silently
                                };
                                
                                utterance.onerror = () => {
                                  toast.error('Audio playback error');
                                };
                                
                                window.speechSynthesis.speak(utterance);
                              } else {
                                toast.error('Audio not supported in your browser');
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs hover:bg-blue-200 transition-colors"
                            title="Click to listen to audio guide"
                          >
                            <Play className="h-3 w-3" />
                            🔊 Listen
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Actions */}
                <div className={`flex items-center gap-3 mt-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.type === 'assistant' && (
                    <>
                      <button
                        onClick={() => toggleBookmark(message.id)}
                        className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                        title="Bookmark"
                      >
                        <Bookmark className={`h-4 w-4 ${bookmarkedMessages.has(message.id) ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                      </button>
                  <button
                    onClick={() => copyMessage(message.id, message.content)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {copiedId === message.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                    ) : (
                          <Copy className="h-3 w-3" />
                    )}
                        {copiedId === message.id ? 'Copied!' : 'Copy'}
                  </button>
                      <button 
                        onClick={() => {
                          const shareText = `${message.title || 'AI Assistant Response'}\n\n${message.content}`;
                          if (navigator.share) {
                            navigator.share({ text: shareText });
                          } else {
                            navigator.clipboard.writeText(shareText);
                            toast.success('Copied to share!');
                          }
                        }}
                        className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        Share
                      </button>
                    </>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
            </div>
          </div>
        ))}

          {/* Enhanced Typing Indicator */}
        {isTyping && (
            <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 bg-gradient-to-br ${isOwner ? 'from-emerald-500 to-teal-600' : 'from-blue-500 to-indigo-600'} rounded-full flex items-center justify-center`}>
                        <Zap className="h-4 w-4 text-white" />
                    </div>
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
              <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
                <p className="text-xs text-gray-500 mt-1">Finding the best resources for {userLocation}...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

        {/* Enhanced Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          {/* Show uploaded images preview */}
          {uploadedImages.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
              {uploadedImages.map((img) => (
                <div key={img.id} className="relative flex-shrink-0">
                  <img 
                    src={img.url} 
                    alt={img.name} 
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Show audio preview */}
          {uploadedAudio && (
            <div className={`mb-3 flex items-center gap-3 p-3 ${isOwner ? 'bg-emerald-50' : 'bg-blue-50'} rounded-lg border ${isOwner ? 'border-emerald-200' : 'border-blue-200'}`}>
              <div className={`w-10 h-10 ${isOwner ? 'bg-emerald-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                <Mic className={`h-5 w-5 ${isOwner ? 'text-emerald-600' : 'text-blue-600'}`} />
              </div>
              <audio src={uploadedAudio.url} controls className="flex-1" />
              <button
                onClick={() => setUploadedAudio(null)}
                className="p-1 text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-lg transition-colors ${
                isRecording 
                  ? 'text-red-600 bg-red-50 animate-pulse' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
              title={isRecording ? 'Stop recording' : 'Record audio message'}
            >
              {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            
            <button
              onClick={() => imageInputRef.current?.click()}
              className={`p-2 text-gray-600 ${isOwner ? 'hover:text-emerald-600 hover:bg-emerald-50' : 'hover:text-green-600 hover:bg-green-50'} rounded-lg transition-colors`}
              title="Upload image"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
            <input 
              ref={imageInputRef}
              type="file" 
              accept="image/*" 
              multiple
              onChange={handleImageUpload}
              className="hidden" 
            />
            
            <button
              onClick={() => {
                const fileInput = document.getElementById('file-upload');
                if (fileInput) {
                  fileInput.click();
                }
              }}
              className={`p-2 text-gray-600 ${isOwner ? 'hover:text-teal-600 hover:bg-teal-50' : 'hover:text-indigo-600 hover:bg-indigo-50'} rounded-lg transition-colors`}
              title="Upload documents"
            >
              <Upload className="h-5 w-5" />
            </button>
            <input type="file" id="file-upload" className="hidden" accept=".pdf,.doc,.docx,.txt" />
            
            <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about housing, health, money, education, legal help..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            
          <button
              onClick={() => handleSend()}
            disabled={!inputValue.trim() || isTyping}
              className={`bg-gradient-to-r ${isOwner ? 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' : 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
          
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>💡 Try: "help with rent in {userLocation}", upload a photo, or record audio</span>
            <span>{messages.length} messages</span>
          </div>
        </div>
      </div>
    </div>
  );
}
