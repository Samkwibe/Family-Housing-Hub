// src/pages/AIAssistant.jsx - Enhanced ChatGPT-like AI Assistant with AWS Bedrock
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  MessageCircle, Send, Sparkles, FileText, HelpCircle, Lightbulb, Home, Heart,
  DollarSign, BookOpen, Scale, MessageSquare, Copy, Check, RefreshCw, Trash2,
  Clock, ChevronRight, Mic, Upload, X, AlertCircle, Zap, Download, Play, Square,
  Plus, Minus, MapPin, Search, Star, History, Save, Share2, Volume2, VolumeX,
  ExternalLink, Calendar, Users, Shield, Briefcase, Phone, Mail, Globe, Filter,
  ChevronDown, ChevronUp, Bookmark, Settings, Bot, Image as ImageIcon, Loader,
  Wrench, TrendingUp, Brain, Cpu, Cloud, Zap as Lightning, Smartphone, Database,
  ShieldCheck, Globe as Earth, Menu, MoreVertical, Eye, EyeOff, DownloadCloud,
  UploadCloud, Link, Terminal, Code, BarChart, PieChart, TrendingDown, AlertTriangle,
  Info, CheckCircle, XCircle, User, UserPlus, Users as Group, Target, Compass,
  Navigation, Map, Layers, Palette, Type, Bold, Italic, List, ListOrdered,
  Heading, Quote, Link as LinkIcon, Image, Table, DivideCircle as Divider,
  Maximize2, Minimize2, Airplay, Monitor, Smartphone as PhoneIcon, Tablet,
  Watch, Camera, Video, Music, Film, Headphones, Radio, Tv, Gamepad2,
  Command, Keyboard, Mouse, HardDrive, Server, Cpu as CpuIcon, MemoryStick,
  Battery, BatteryCharging, Power, Wifi, Bluetooth, RadioTower, Satellite,
  CloudRain, CloudSnow, CloudLightning, Sun, Moon, Star as StarIcon,
  Umbrella, Droplets, Thermometer, Wind, Sunrise, Sunset, Cloudy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import bedrockService from '../services/aws/bedrockService';
import aiService from '../services/aws/aiService';

// Enhanced system prompt for ChatGPT-like behavior
const buildSystemPrompt = (userType, location, familyInfo, propertyInfo) => {
  const isOwner = userType === 'owner';
  
  let prompt = isOwner
    ? `You are an advanced AI assistant similar to ChatGPT, specialized in helping property owners and landlords with comprehensive support. Your capabilities include:

**CORE RESPONSIBILITIES:**
1. ANSWER ALL QUESTIONS - No matter the topic, provide helpful, accurate information
2. BE RESOURCEFUL - Connect users to relevant resources, tools, and next steps
3. BE COMPREHENSIVE - Cover topics thoroughly with actionable advice
4. BE ADAPTIVE - Adjust to user's knowledge level and specific needs
5. BE PROACTIVE - Anticipate follow-up questions and provide complete answers

**DOMAIN EXPERTISE:**
- Property Management (Tenant Relations, Leases, Maintenance, Legal Compliance)
- Business Operations (Tax Planning, Insurance, Investment Strategies, ROI Analysis)
- Legal Compliance (Landlord Rights, Eviction Procedures, Fair Housing Laws)
- Financial Management (Rent Collection, Expense Tracking, Financial Planning)
- General Knowledge (Technology, Science, Arts, Daily Life, Problem Solving)
- Creative Assistance (Writing, Planning, Brainstorming)

**RESPONSE GUIDELINES:**
1. NEVER say "I don't know" - Instead, provide best available information and suggest research paths
2. ALWAYS provide actionable steps or resources
3. STRUCTURE responses clearly with headings, bullet points, and emphasis
4. ASK clarifying questions when needed for better answers
5. INCLUDE relevant links, tools, or resources when applicable
6. ADAPT language to user's apparent education level
7. ACKNOWLEDGE limitations and suggest verification when uncertain
8. PROVIDE multiple perspectives or options when relevant

**CONTEXT AWARENESS:**
- User Location: ${location}
- User Type: Property Owner
- Property Info: ${propertyInfo ? JSON.stringify(propertyInfo) : 'Not provided'}
- Remember conversation history
- Consider business context when applicable`
    : `You are an advanced AI assistant similar to ChatGPT, specialized in helping families with comprehensive support. Your capabilities include:

**CORE RESPONSIBILITIES:**
1. ANSWER ALL QUESTIONS - No matter the topic, provide helpful, accurate information
2. BE RESOURCEFUL - Connect users to relevant resources, tools, and next steps
3. BE COMPREHENSIVE - Cover topics thoroughly with actionable advice
4. BE ADAPTIVE - Adjust to user's knowledge level and specific needs
5. BE PROACTIVE - Anticipate follow-up questions and provide complete answers

**DOMAIN EXPERTISE:**
- Family Support (Housing, Health, Finance, Education, Legal, Employment)
- Housing Assistance (Rent Help, Eviction Protection, Repairs, Tenant Rights)
- Health Resources (Insurance, Clinics, Mental Health, Family Wellness)
- Financial Aid (Budgeting, Benefits, SNAP, Utility Assistance, Financial Planning)
- Education Support (School Enrollment, Homework Help, Tutoring, College Planning)
- Legal Resources (Immigration, Tenant Rights, Legal Aid, Family Law)
- General Knowledge (Technology, Science, Arts, Daily Life, Problem Solving)
- Creative Assistance (Writing, Planning, Brainstorming)

**RESPONSE GUIDELINES:**
1. NEVER say "I don't know" - Instead, provide best available information and suggest research paths
2. ALWAYS provide actionable steps or resources
3. STRUCTURE responses clearly with headings, bullet points, and emphasis
4. ASK clarifying questions when needed for better answers
5. INCLUDE relevant links, tools, or resources when applicable
6. ADAPT language to user's apparent education level
7. ACKNOWLEDGE limitations and suggest verification when uncertain
8. PROVIDE multiple perspectives or options when relevant

**CONTEXT AWARENESS:**
- User Location: ${location}
- User Type: Family/Renter
- Family Info: ${familyInfo ? JSON.stringify(familyInfo) : 'Not provided'}
- Remember conversation history
- Consider family context when applicable`;

  return prompt;
};

// Enhanced comprehensive response generator for ANY question
const createComprehensiveResponse = (userQuery, context = {}) => {
  const { userLocation = 'your area', userType = 'renter', conversationHistory = [] } = context;
  const lowerQuery = userQuery.toLowerCase();
  
  // Check for emergency/sensitive topics
  const emergencyKeywords = ['suicide', 'kill myself', 'abuse', 'emergency', 'hurt myself'];
  if (emergencyKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return {
      title: '🚨 Immediate Help Available',
      content: `**Your safety is important. Please contact these resources immediately:**

**24/7 Crisis Lines:**
📞 National Suicide Prevention Lifeline: **988**
📞 Crisis Text Line: Text HOME to **741741**
📞 Domestic Violence Hotline: **1-800-799-7233**

**If you're in immediate danger, call 911.**

**You're not alone.** These services are:
• Free and confidential
• Available 24/7
• Staffed by trained professionals

**For ongoing support in ${userLocation}:**
• Local mental health centers
• Community support groups
• Primary care doctors can provide referrals

**I'm here to listen and help connect you with resources. Would you like to talk more about what you're experiencing?**`,
      category: 'emergency',
      priority: 'critical',
      resources: [
        { label: '988 Suicide & Crisis Lifeline', url: 'https://988lifeline.org' },
        { label: 'Crisis Text Line', url: 'https://www.crisistextline.org' },
        { label: 'National Domestic Violence Hotline', url: 'https://www.thehotline.org' }
      ]
    };
  }

  // Generic comprehensive response structure
  return {
    title: 'I Can Help With That',
    content: `**Regarding "${userQuery}":**

I understand you're asking about this topic. Here's how I can help:

**1. Understanding Your Question**
Let me break this down to ensure I address your needs:
• What specifically would you like to know about "${userQuery}"?
• What's your primary goal or concern?
• Have you already tried anything to address this?

**2. General Information**
Based on general knowledge about "${userQuery}":

**Key Points:**
• This is an important topic that requires careful consideration
• There are multiple approaches and perspectives to consider
• Your specific situation will determine the best path forward

**3. How This Applies to You in ${userLocation}**
Considering your location and situation:

**Local Relevance:**
• Check local resources in ${userLocation}
• Consider ${userLocation}-specific regulations or programs
• Look for community organizations that can help

**4. Actionable Steps**
Here's what you can do right now:

**Immediate Actions:**
1. **Research** - Look for credible sources on "${userQuery}"
2. **Contact** - Reach out to relevant organizations or professionals
3. **Document** - Keep notes on what you learn and try
4. **Follow-up** - Check back with me for more specific guidance

**5. Related Areas I Can Help With**
Based on your question, you might also find these helpful:
• Related resources and information
• Similar topics that might be relevant
• Additional support options

**6. Getting More Specific Help**
To give you the best possible help:
• Tell me more about your specific situation
• Ask a more detailed question
• Upload any relevant documents or images
• Let me know if you've already tried something

**Remember:** I'm here to help with ANY question you have, no matter how big or small. What else would you like to know about "${userQuery}"?`,
    category: 'general',
    priority: 'normal',
    showClarifyingQuestions: true,
    clarifyingQuestions: [
      "Can you tell me more about your specific situation?",
      "What have you already tried or researched?",
      "What's your main goal or concern?",
      "Is this related to housing, health, finances, or something else?"
    ]
  };
};

// Enhanced Bedrock configuration
const enhancedBedrockConfig = {
  models: {
    primary: 'claude-3-sonnet-20240229',
    fast: 'claude-3-haiku-20240307',
    powerful: 'claude-3-opus-20240229',
    image: 'claude-3-sonnet-20240229',
  },
  parameters: {
    temperature: 0.7,
    maxTokens: 4000,
    topP: 0.9,
  }
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
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [useBedrock, setUseBedrock] = useState(true);
  const [currentModel, setCurrentModel] = useState(enhancedBedrockConfig.models.primary);
  const [conversationMode, setConversationMode] = useState('comprehensive');
  const [aiPersonality, setAiPersonality] = useState('helpful');
  const [responseLength, setResponseLength] = useState('medium');
  const [useInternetSearch, setUseInternetSearch] = useState(false);
  const [showThinkingProcess, setShowThinkingProcess] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamingRef = useRef(false);

  // Enhanced user context
  const userType = userProfile?.userType || userProfile?.role || 'renter';
  const isOwner = userType === 'owner';
  const isRenter = userType === 'renter';
  
  const userContext = useMemo(() => ({
    userType,
    location: userLocation,
    familyInfo: {
      size: userProfile?.familyMembers?.length || 1,
      hasChildren: (userProfile?.familyMembers || []).some(m => m.relationship === 'child'),
      ages: userProfile?.familyMembers?.map(m => m.age).filter(Boolean) || []
    },
    propertyInfo: isOwner ? {
      type: userProfile?.property?.type || 'residential',
      units: userProfile?.property?.units || 1,
      location: userProfile?.property?.location || userLocation
    } : null,
    preferences: {
      responseStyle: aiPersonality,
      detailLevel: responseLength,
      useExamples: true,
      includeResources: true
    }
  }), [userProfile, userLocation, userType, aiPersonality, responseLength]);

  // Design theme based on user type
  const designTheme = useMemo(() => {
    if (isOwner) {
      return {
        primaryColor: 'emerald',
        secondaryColor: 'teal',
        gradientFrom: 'from-emerald-600',
        gradientTo: 'to-teal-600',
        title: 'Property Owner Assistant',
        subtitle: 'Your AI partner for property management and investments.',
        buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
        borderClass: 'border-emerald-200',
        textClass: 'text-emerald-900',
        iconClass: 'text-teal-700',
        toggleOn: 'bg-emerald-600',
        toggleOff: 'bg-gray-300',
        bgGradient: 'from-emerald-50 via-teal-50 to-cyan-50'
      };
    } else {
      return {
        primaryColor: 'blue',
        secondaryColor: 'indigo',
        gradientFrom: 'from-blue-600',
        gradientTo: 'to-indigo-600',
        title: 'Family Support Assistant',
        subtitle: 'Your AI partner for housing, health, finances, and family well-being.',
        buttonClass: 'bg-blue-600 hover:bg-blue-700',
        borderClass: 'border-blue-200',
        textClass: 'text-blue-900',
        iconClass: 'text-indigo-700',
        toggleOn: 'bg-blue-600',
        toggleOff: 'bg-gray-300',
        bgGradient: 'from-blue-50 via-indigo-50 to-purple-50'
      };
    }
  }, [isOwner]);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage = {
      id: 1,
      type: 'assistant',
      content: `Hello ${userProfile?.firstName || 'there'}! 👋 I'm your ${designTheme.title} powered by **AWS Bedrock AI** for ${userLocation}. I can help with:

• **ANY Question** - Ask me anything, and I'll do my best to help
• **Housing** - Rent assistance, eviction protection, repairs
• **Health** - Insurance, clinics, mental health resources  
• **Money** - Budgeting, benefits, financial aid
• **Education** - School help, tutoring, college planning
• **Legal** - Immigration, rights, legal aid
${isOwner ? '• **Property Management** - Tenants, leases, maintenance, ROI' : ''}

**AI-Powered Features:**
🤖 **AWS Bedrock** - Advanced AI for intelligent responses
📷 **Image Analysis** - Understand documents, bills, homework
🎤 Voice messages & audio guidance
📚 Comprehensive answers to any question
📍 Location-specific resources
💾 Save conversations & bookmarks
🔍 Search past conversations

How can I help you today?`,
      timestamp: new Date(),
      model: 'AWS Bedrock'
    };
    setMessages([welcomeMessage]);
    loadSavedChats();
  }, [userProfile, userLocation, designTheme]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Load saved chats
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
      setSavedChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      // Silently handle permission errors - feature will work but saved chats won't load
      if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
        console.warn('Saved chats feature requires Firestore permissions. Feature disabled.');
        setSavedChats([]); // Set empty array to prevent UI issues
      } else {
      console.error('Error loading saved chats:', error);
      }
    }
  };

  // Enhanced Bedrock chat
  const chatWithBedrock = useCallback(async (query, context, history, options = {}) => {
    const {
      stream = false,
      model = currentModel,
      temperature = enhancedBedrockConfig.parameters.temperature,
      maxTokens = enhancedBedrockConfig.parameters.maxTokens
    } = options;

    try {
      // Build enhanced system prompt
      const systemPrompt = buildSystemPrompt(
        context.userType,
        context.location || userLocation,
        context.familyInfo,
        context.propertyInfo
      );

      // Prepare conversation history
      const formattedHistory = (history || []).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add thinking process if enabled
      if (showThinkingProcess) {
        const thinking = [
          "Analyzing user's question...",
          "Considering user context and history...",
          "Gathering relevant information...",
          "Structuring response for maximum helpfulness..."
        ];
        setThinkingSteps(thinking);
      }

      // Call Bedrock
      const response = await bedrockService.chat(
        query,
        {
          userType: context.userType,
          location: context.location || userLocation,
          familyInfo: context.familyInfo,
          propertyInfo: context.propertyInfo,
          systemPrompt: systemPrompt
        },
        formattedHistory,
        {
          model,
          temperature,
          maxTokens,
          stream
        }
      );

      if (stream && response && typeof response[Symbol.asyncIterator] === 'function') {
        // Handle streaming
        streamingRef.current = true;
        setIsStreaming(true);
        setStreamedContent('');

        let fullResponse = '';
        for await (const chunk of response) {
          if (!streamingRef.current) break;
          fullResponse += chunk;
          setStreamedContent(fullResponse);
        }

        streamingRef.current = false;
        setIsStreaming(false);
        return { response: fullResponse, model, streaming: true };
      } else {
        return { 
          response: response?.response || response?.content || 'I apologize, but I couldn\'t generate a response. Please try again.', 
          model: response?.model || model, 
          streaming: false 
        };
      }
    } catch (error) {
      console.error('Bedrock chat error:', error);
      throw error;
    }
  }, [currentModel, userLocation, showThinkingProcess]);

  // Enhanced message handler
  const handleSend = useCallback(async (text = inputValue) => {
    const query = text.trim();
    const hasImages = uploadedImages.length > 0;
    const hasAudio = uploadedAudio !== null;
    const hasFiles = uploadedFiles.length > 0;
    
    if (!query && !hasImages && !hasAudio && !hasFiles) return;

    setIsTyping(true);
    stopSpeaking();

    // Analyze all attachments
    let attachmentsAnalysis = [];
    
    if (hasImages) {
      for (const image of uploadedImages) {
        try {
          const analysis = await analyzeImage(image.file);
          attachmentsAnalysis.push({
            type: 'image',
            data: analysis,
            description: `Image: ${analysis.description?.substring(0, 100) || 'Image uploaded'}...`
          });
        } catch (error) {
          console.error('Image analysis error:', error);
        }
      }
    }

    if (hasFiles) {
      for (const file of uploadedFiles) {
        attachmentsAnalysis.push({
          type: 'document',
          data: { name: file.name, type: file.type, size: file.size },
          description: `Document: ${file.name} (${file.type})`
        });
      }
    }

    // Create user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: query || 
               (hasImages ? `📷 [${uploadedImages.length} image(s) attached]` : '') ||
               (hasAudio ? '🎤 [Audio message]' : '') ||
               (hasFiles ? `📄 [${uploadedFiles.length} file(s) attached]` : ''),
      images: uploadedImages,
      audio: uploadedAudio,
      files: uploadedFiles,
      attachmentsAnalysis,
      timestamp: new Date(),
      metadata: {
        hasAttachments: hasImages || hasAudio || hasFiles,
        attachmentCount: (hasImages ? uploadedImages.length : 0) + 
                       (hasAudio ? 1 : 0) + 
                       (hasFiles ? uploadedFiles.length : 0)
      }
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessages = [...messages, userMessage];
    setInputValue('');
    setUploadedImages([]);
    setUploadedAudio(null);
    setUploadedFiles([]);

    // Build enhanced query with context
    let enhancedQuery = query;
    if (attachmentsAnalysis.length > 0) {
      enhancedQuery += `\n\nAttachments:\n${attachmentsAnalysis.map(a => a.description).join('\n')}`;
    }

    try {
      // Get conversation history
      const conversationHistory = currentMessages
        .filter(msg => msg.type === 'user' || msg.type === 'assistant')
        .slice(-20)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content || msg.text || '',
          timestamp: msg.timestamp
        }));

      let response;
      
      if (useBedrock) {
        try {
          response = await chatWithBedrock(
            enhancedQuery || 'help',
            userContext,
            conversationHistory,
            {
              model: currentModel,
              stream: false
            }
          );
        } catch (bedrockError) {
          console.warn('Bedrock failed, using comprehensive fallback:', bedrockError);
          const fallback = createComprehensiveResponse(query, {
            userLocation,
            userType,
            conversationHistory
          });
          response = {
            response: fallback.content,
            model: 'comprehensive-fallback'
          };
        }
      } else {
        const fallback = createComprehensiveResponse(query, {
          userLocation,
          userType,
          conversationHistory
        });
        response = {
          response: fallback.content,
          model: 'comprehensive-fallback'
        };
      }

      // Parse and enhance response
      const parsedResponse = parseAIResponse(response.response, query, userContext);
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        title: parsedResponse.title || 'AI Response',
        content: parsedResponse.content,
        structuredContent: parsedResponse.structured,
        suggestions: parsedResponse.suggestions,
        resources: parsedResponse.resources,
        nextSteps: parsedResponse.nextSteps,
        category: parsedResponse.category || 'general',
        model: response.model,
        timestamp: new Date(),
        metadata: {
          wordCount: parsedResponse.content.split(' ').length,
          hasResources: parsedResponse.resources && parsedResponse.resources.length > 0,
          hasSuggestions: parsedResponse.suggestions && parsedResponse.suggestions.length > 0,
          responseTime: Date.now()
        },
        features: {
          canExpand: parsedResponse.structured ? true : false,
          hasAudio: true,
          canSave: true,
          canShare: true
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      toast.success(`🤖 ${response.model?.includes('claude') || response.model?.includes('bedrock') ? 'AWS Bedrock' : 'AI'} responded`, {
        icon: response.model?.includes('claude') ? '🤖' : '💡'
      });

    } catch (error) {
      console.error('Error in AI response:', error);
      toast.error('Failed to get response. Please try again.');
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        title: 'Connection Issue',
        content: `I apologize, but I'm having trouble connecting right now. Here's what you can try:

1. **Check your internet connection**
2. **Try rephrasing your question**
3. **Ask about a different topic**
4. **Try again in a few moments**

In the meantime, for "${query}", consider:
• Searching online with specific keywords
• Contacting relevant local organizations in ${userLocation}
• Checking community resources

I'll keep trying to help - please ask again!`,
        timestamp: new Date(),
        features: {}
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setThinkingSteps([]);
    }
  }, [
    inputValue, uploadedImages, uploadedAudio, uploadedFiles, messages, 
    userLocation, userType, useBedrock, currentModel, chatWithBedrock, 
    userContext
  ]);

  // Enhanced response parser
  const parseAIResponse = (content, originalQuery, context) => {
    const lines = content.split('\n');
    let title = 'AI Response';
    let mainContent = content;
    
    if (lines[0].includes('**') && lines[0].indexOf('**') === lines[0].lastIndexOf('**')) {
      title = lines[0].replace(/\*\*/g, '').trim();
      mainContent = lines.slice(1).join('\n');
    } else if (lines[0].length < 100 && !lines[0].includes('.') && !lines[0].includes('?')) {
      title = lines[0];
      mainContent = lines.slice(1).join('\n');
    }

    const sections = {
      summary: '',
      details: [],
      steps: [],
      resources: [],
      warnings: [],
      tips: []
    };

    const linesArray = content.split('\n');
    let currentSection = 'summary';
    
    for (let i = 0; i < linesArray.length; i++) {
      const line = linesArray[i].trim();
      
      if (line.startsWith('## ') || (line.startsWith('**') && line.endsWith('**') && line.length < 100)) {
        const header = line.replace(/[#\*]/g, '').trim().toLowerCase();
        if (header.includes('step') || header.includes('action') || /^\d+\./.test(line)) {
          currentSection = 'steps';
        } else if (header.includes('resource') || header.includes('link')) {
          currentSection = 'resources';
        } else if (header.includes('warning') || header.includes('important')) {
          currentSection = 'warnings';
        } else if (header.includes('tip') || header.includes('note')) {
          currentSection = 'tips';
        } else {
          currentSection = 'details';
        }
      } else if (line) {
        if (currentSection === 'summary' && i < 3) {
          sections.summary += line + ' ';
        } else {
          if (!sections[currentSection]) sections[currentSection] = [];
          sections[currentSection].push(line);
        }
      }
    }

    const suggestions = generateSuggestions(content, originalQuery, context);
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const resources = [];
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      resources.push({
        label: match[1],
        url: match[2],
        type: classifyLink(match[2])
      });
    }

    return {
      title,
      content: mainContent,
      structured: sections,
      suggestions,
      resources,
      nextSteps: sections.steps.slice(0, 3),
      category: classifyContent(originalQuery, content),
      metadata: {
        hasStructure: Object.values(sections).some(arr => arr.length > 0),
        hasResources: resources.length > 0,
        hasSteps: sections.steps.length > 0
      }
    };
  };

  // Generate follow-up suggestions
  const generateSuggestions = (content, query, context) => {
    const suggestions = [];
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();

    suggestions.push("Ask for more details");
    suggestions.push("Request specific examples");

    if (lowerContent.includes('contact') || lowerContent.includes('call')) {
      suggestions.push("Get help finding local contacts");
    }
    
    if (lowerContent.includes('form') || lowerContent.includes('apply')) {
      suggestions.push("Help with application process");
    }
    
    if (lowerContent.includes('cost') || lowerContent.includes('price') || lowerContent.includes('fee')) {
      suggestions.push("Find financial assistance options");
    }

    if (lowerQuery.includes('how to')) {
      suggestions.push("See step-by-step instructions");
    }
    
    if (lowerQuery.includes('best') || lowerQuery.includes('compare')) {
      suggestions.push("Compare different options");
    }

    if (context.userType === 'renter') {
      suggestions.push("Find local housing resources");
    } else if (context.userType === 'owner') {
      suggestions.push("Property management tips");
    }

    return suggestions.slice(0, 5);
  };

  // Image handling
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
    
    e.target.value = '';
  };

  const removeImage = (id) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  // Analyze image
  const analyzeImage = async (imageFile) => {
    toast.info('Analyzing image with AI...');
    
    try {
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

    try {
      const rekognitionLabels = await aiService.detectLabels(imageFile);
      const labels = rekognitionLabels.Labels?.slice(0, 5).map(l => l.Name).join(', ') || 'various items';
      
      return {
        description: `I can see this image contains: ${labels}. Could you tell me more about what you need help with regarding this image?`,
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
        context: "general",
        model: 'basic-fallback',
        suggestions: []
      };
    }
  };

  // File handling
  const handleFileUpload = async (files) => {
    const newFiles = [];
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      try {
        const storageRef = ref(storage, `ai-assistant/${currentUser.uid}/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        newFiles.push({
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: downloadURL,
          uploadedAt: new Date()
        });

        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  };

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Quick action handler
  const handleQuickAction = useCallback(async (query) => {
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const conversationHistory = messages
        .filter(msg => msg.type === 'user' || msg.type === 'assistant')
        .slice(-10)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content || msg.text || ''
        }));

      let response;
      
      if (useBedrock) {
        try {
          response = await chatWithBedrock(
            query,
            userContext,
            conversationHistory,
            { model: currentModel, stream: false }
          );
        } catch (error) {
          const fallback = createComprehensiveResponse(query, {
            userLocation,
            userType,
            conversationHistory
          });
          response = {
            response: fallback.content,
            model: 'comprehensive-fallback'
          };
        }
      } else {
        const fallback = createComprehensiveResponse(query, {
          userLocation,
          userType,
          conversationHistory
        });
        response = {
          response: fallback.content,
          model: 'comprehensive-fallback'
        };
      }

      const parsedResponse = parseAIResponse(response.response, query, userContext);
    
    const assistantMessage = {
      id: Date.now() + 1,
      type: 'assistant',
        title: parsedResponse.title,
        content: parsedResponse.content,
        structuredContent: parsedResponse.structured,
        suggestions: parsedResponse.suggestions,
        resources: parsedResponse.resources,
        category: parsedResponse.category || 'general',
        model: response.model,
      timestamp: new Date(),
      features: {
          hasAudio: true,
          canSave: true,
          canShare: true
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
  }, [chatWithBedrock, messages, userLocation, userType, useBedrock, currentModel, userContext]);

  // Audio recording
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
      // Handle permission errors gracefully
      if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
        toast.error('Save feature requires Firestore permissions. Please contact support.');
        console.warn('Save conversation feature requires Firestore permissions.');
      } else {
      console.error('Error saving conversation:', error);
      toast.error('Failed to save conversation');
      }
    }
  };

  // Export conversation
  const exportConversation = () => {
    const conversationText = messages.map(msg => {
      const sender = msg.type === 'user' ? 'You' : 'Assistant';
      return `[${sender}]: ${msg.content}`;
    }).join('\n\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conversation exported!');
  };

  // Copy message
  const copyMessage = useCallback((id, content) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Clear chat
  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      stopSpeaking();
      setMessages([{
        id: 1,
        type: 'assistant',
        content: `Hello! I'm your ${designTheme.title}. How can I help you today?`,
        timestamp: new Date(),
        model: 'AWS Bedrock'
      }]);
      toast.success('Chat cleared');
    }
  };

  // Toggle bookmark
  const toggleBookmark = (messageId) => {
    setBookmarkedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
        toast.success('Bookmark removed');
      } else {
        newSet.add(messageId);
        toast.success('Bookmark added');
      }
      return newSet;
    });
  };

  // Speak message
  const speakMessage = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
      toast.success('Playing audio...');
    } else {
      toast.error('Audio not supported in your browser');
    }
  };

  // Format content with markdown
  const formatContent = (content) => {
    if (!content) return '';
    
    return content.split('\n').map((line, idx) => {
      if (!line.trim()) return <br key={idx} />;
      
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-lg font-semibold mt-4 mb-2">{line.replace('## ', '')}</h3>;
      }
      
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-base font-semibold mt-3 mb-1">{line.replace('### ', '')}</h4>;
      }
      
      if (line.startsWith('**') && line.endsWith('**')) {
        return <strong key={idx} className="font-bold">{line.replace(/\*\*/g, '')}</strong>;
      }
      
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={idx} className="ml-4 list-disc">{line.substring(2)}</li>;
      }
      
      if (/^\d+\.\s/.test(line)) {
        return <li key={idx} className="ml-4 list-decimal">{line}</li>;
      }
      
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = linkRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <a
            key={`link-${match.index}`}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-${designTheme.primaryColor}-600 hover:underline`}
          >
            {match[1]}
          </a>
        );
        lastIndex = match.index + match[0].length;
      }
      
      if (parts.length > 0) {
        const remaining = line.substring(lastIndex);
        if (remaining) parts.push(remaining);
        return <p key={idx} className="mb-2">{parts}</p>;
      }
      
      return <p key={idx} className="mb-2">{line}</p>;
    });
  };

  // Quick actions based on user type
  const QUICK_ACTIONS = useMemo(() => {
    if (isOwner) {
      return [
        { id: 1, label: 'Tenant Mgmt', query: 'tenant management', icon: Users, category: 'property', color: 'emerald' },
        { id: 2, label: 'Lease Agmts', query: 'lease agreements', icon: FileText, category: 'property', color: 'teal' },
        { id: 3, label: 'Rent Collect', query: 'rent collection', icon: DollarSign, category: 'financial', color: 'green' },
        { id: 4, label: 'Maintenance', query: 'property maintenance', icon: Wrench, category: 'property', color: 'orange' },
        { id: 5, label: 'Legal Comp.', query: 'legal compliance', icon: Scale, category: 'legal', color: 'red' },
        { id: 6, label: 'Tax Planning', query: 'tax planning for owners', icon: TrendingUp, category: 'financial', color: 'yellow' },
        { id: 7, label: 'ROI Analysis', query: 'property ROI analysis', icon: BarChart, category: 'financial', color: 'indigo' },
        { id: 8, label: 'Eviction Proc.', query: 'eviction process guide', icon: AlertCircle, category: 'legal', color: 'pink' }
      ];
    } else {
      return [
        { id: 1, label: 'Rent Help', query: 'rent assistance', icon: Home, category: 'housing', color: 'blue' },
        { id: 2, label: 'Healthcare', query: 'health insurance', icon: Heart, category: 'health', color: 'red' },
        { id: 3, label: 'Food Assistance', query: 'food stamps', icon: DollarSign, category: 'financial', color: 'green' },
        { id: 4, label: 'School Help', query: 'school enrollment', icon: BookOpen, category: 'education', color: 'purple' },
        { id: 5, label: 'Legal Help', query: 'immigration help', icon: Scale, category: 'legal', color: 'orange' },
        { id: 6, label: 'Budget Tips', query: 'budget planning', icon: Lightbulb, category: 'financial', color: 'yellow' },
        { id: 7, label: 'Job Search', query: 'job assistance', icon: Briefcase, category: 'employment', color: 'indigo' },
        { id: 8, label: 'Childcare', query: 'childcare assistance', icon: Users, category: 'family', color: 'pink' }
      ];
    }
  }, [isOwner]);

  // Search messages
  const searchMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(msg => 
      msg.content?.toLowerCase().includes(query) ||
      msg.title?.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  const categories = ['all', 'housing', 'health', 'financial', 'education', 'legal', 'employment', 'family', 'property'];

  return (
    <div className={`h-screen w-full flex flex-col p-4 lg:p-6 bg-gradient-to-br ${designTheme.bgGradient} overflow-hidden`}>
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-3 bg-gradient-to-br ${designTheme.gradientFrom} ${designTheme.gradientTo} rounded-2xl shadow-lg`}>
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${designTheme.textClass}`}>{designTheme.title}</h1>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`h-4 w-4 ${designTheme.iconClass}`} />
              <span className={designTheme.iconClass}>Resources for {userLocation}</span>
              <button 
                onClick={() => {
                  const newLocation = prompt('Enter your location:', userLocation) || userLocation;
                  setUserLocation(newLocation);
                }}
                className={`${designTheme.iconClass} hover:${designTheme.textClass} text-xs underline`}
              >
                Change
              </button>
          </div>
            <p className={`text-xs mt-1 ${designTheme.iconClass}`}>{designTheme.subtitle}</p>
        </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSavedChats(!showSavedChats)}
            className={`p-2 text-gray-600 hover:${designTheme.iconClass} hover:bg-${designTheme.primaryColor}-50 rounded-lg transition-colors`}
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

      {/* Settings Panel */}
      {showSettings && (
        <div className={`mb-3 p-3 bg-${designTheme.primaryColor}-50 rounded-xl border border-${designTheme.primaryColor}-200 flex-shrink-0`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold text-${designTheme.primaryColor}-900`}>🤖 AI Assistant Settings</h3>
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
                  useBedrock ? designTheme.toggleOn : designTheme.toggleOff
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
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">AI Model</span>
                  <p className="text-xs text-gray-500">Choose the Bedrock model for responses</p>
                </div>
                <select
                  value={currentModel}
                  onChange={(e) => setCurrentModel(e.target.value)}
                  className="p-2 border border-gray-300 rounded-lg text-sm"
                >
                  {bedrockService.getAvailableModels().map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Response Style</span>
                <p className="text-xs text-gray-500">How the AI responds</p>
              </div>
              <select
                value={aiPersonality}
                onChange={(e) => setAiPersonality(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="helpful">Helpful</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="concise">Concise</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Response Length</span>
                <p className="text-xs text-gray-500">Detail level of responses</p>
              </div>
              <select
                value={responseLength}
                onChange={(e) => setResponseLength(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Saved Chats Panel */}
      {showSavedChats && savedChats.length > 0 && (
        <div className="mb-3 p-3 bg-green-50 rounded-xl border border-green-200 max-h-40 overflow-y-auto flex-shrink-0">
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
                  {chat.createdAt ? new Date(chat.createdAt.toDate()).toLocaleDateString() : 'Recently'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Thinking Process */}
      {showThinkingProcess && thinkingSteps.length > 0 && (
        <div className="mb-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
          <h4 className="font-semibold mb-2">🤔 AI Thinking Process</h4>
          <div className="space-y-2">
            {thinkingSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                <div className={`w-6 h-6 rounded-full bg-${designTheme.primaryColor}-100 text-${designTheme.primaryColor}-600 flex items-center justify-center text-xs font-semibold`}>
                  {idx + 1}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? `bg-${designTheme.primaryColor}-600 text-white`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversation..."
            className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 ${
              isOwner 
                ? 'focus:ring-emerald-500 focus:border-emerald-500' 
                : 'focus:ring-blue-500 focus:border-blue-500'
            }`}
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

      {/* Quick Actions */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Quick Help Topics</h3>
          <span className="text-xs text-gray-500">{userLocation} resources</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleQuickAction(action.query)}
              className={`flex flex-col items-center gap-2 p-3 bg-white border-2 rounded-xl text-sm font-medium hover:shadow-md transition-all duration-200 border-${action.color}-200 hover:border-${action.color}-300`}
            >
              <action.icon className={`h-5 w-5 text-${action.color}-600`} />
              <span className="text-xs text-center">{action.label}</span>
          </button>
        ))}
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {(searchQuery ? searchMessages : messages).map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              {message.type === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 bg-gradient-to-br ${designTheme.gradientFrom} ${designTheme.gradientTo} rounded-full flex items-center justify-center`}>
                      <Brain className="h-3 w-3 text-white" />
                  </div>
                    <span className="text-xs text-gray-500 font-medium">{designTheme.title}</span>
                    {message.model && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        message.model.includes('Bedrock') || message.model.includes('claude') ? 'bg-purple-100 text-purple-700' :
                        message.model.includes('Rekognition') ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {message.model}
                      </span>
                    )}
                </div>
              )}
              
              <div className={`rounded-2xl p-4 ${
                message.type === 'user'
                    ? `bg-gradient-to-r ${designTheme.gradientFrom} ${designTheme.gradientTo} text-white`
                    : 'bg-gray-50 border border-gray-100'
              }`}>
                {message.title && (
                    <h3 className={`font-semibold mb-3 flex items-center gap-2 ${designTheme.iconClass}`}>
                      <Sparkles className="h-4 w-4" />
                    {message.title}
                  </h3>
                )}
                  
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

                  {message.audio && (
                    <div className={`mb-3 flex items-center gap-3 p-3 rounded-lg ${message.type === 'user' ? 'bg-white/10' : isOwner ? 'bg-emerald-50 border border-emerald-200' : 'bg-blue-50 border border-blue-200'}`}>
                      <div className={`w-10 h-10 ${isOwner ? 'bg-emerald-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                        <Mic className={`h-5 w-5 ${isOwner ? 'text-emerald-600' : 'text-blue-600'}`} />
                      </div>
                      <audio src={message.audio.url} controls className="flex-1" />
                    </div>
                  )}

                  {message.imageAnalysis && (
                    <div className={`mb-3 p-3 bg-${designTheme.primaryColor}-50 border border-${designTheme.primaryColor}-200 rounded-lg`}>
                      <p className={`text-sm text-${designTheme.primaryColor}-900`}>
                        <strong>📷 Image Analysis ({message.imageAnalysis.model}):</strong> {message.imageAnalysis.description}
                      </p>
                    </div>
                  )}

                  <div className={message.type === 'user' ? 'text-white' : 'text-gray-800'}>
                    {message.type === 'user' ? message.content : formatContent(message.content)}
                  </div>

                  {message.resources && message.resources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {message.resources.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1 px-3 py-1 bg-${designTheme.primaryColor}-100 text-${designTheme.primaryColor}-700 rounded-full text-xs hover:bg-${designTheme.primaryColor}-200 transition-colors`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            {link.label}
                          </a>
                        ))}
              </div>
                    </div>
                  )}

                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">You might also ask:</h4>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, idx) => (
                          <button 
                            key={idx}
                            onClick={() => handleQuickAction(suggestion)}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                        )}

                  {message.type === 'assistant' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2">
                          <button 
                          onClick={() => speakMessage(message.content)}
                          className={`flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs hover:bg-blue-200 transition-colors`}
                        >
                          <Volume2 className="h-3 w-3" />
                          🔊 Listen
                          </button>
                          <button 
                          onClick={() => setInputValue(`Can you elaborate on: ${message.title || 'this topic'}?`)}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors"
                        >
                          <MessageCircle className="h-3 w-3" />
                          Ask follow-up
                          </button>
                      </div>
                    </div>
                  )}
                </div>

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
                    </>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
            </div>
          </div>
        ))}

        {isTyping && (
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 bg-gradient-to-br ${designTheme.gradientFrom} ${designTheme.gradientTo} rounded-full flex items-center justify-center`}>
                <Brain className="h-4 w-4 text-white" />
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

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
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

          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-xs text-gray-700 truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
                  : `text-gray-600 hover:${designTheme.iconClass} hover:bg-${designTheme.primaryColor}-50`
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
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 text-gray-600 ${isOwner ? 'hover:text-teal-600 hover:bg-teal-50' : 'hover:text-indigo-600 hover:bg-indigo-50'} rounded-lg transition-colors`}
              title="Upload file"
            >
              <Upload className="h-5 w-5" />
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              multiple
              onChange={(e) => handleFileUpload(Array.from(e.target.files))}
              className="hidden" 
            />
            
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
                placeholder="Ask me anything... I can help with any question!"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>
            
          <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() && uploadedImages.length === 0 && uploadedFiles.length === 0}
              className={`bg-gradient-to-r ${designTheme.gradientFrom} ${designTheme.gradientTo} text-white p-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
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

// Helper functions
const classifyContent = (query, content) => {
  const lowerQuery = query.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  if (lowerQuery.includes('rent') || lowerQuery.includes('housing') || lowerContent.includes('tenant')) {
    return 'housing';
  } else if (lowerQuery.includes('health') || lowerContent.includes('medical') || lowerContent.includes('doctor')) {
    return 'health';
  } else if (lowerQuery.includes('money') || lowerContent.includes('budget') || lowerContent.includes('financial')) {
    return 'finance';
  } else if (lowerQuery.includes('school') || lowerContent.includes('education') || lowerContent.includes('homework')) {
    return 'education';
  } else if (lowerQuery.includes('legal') || lowerContent.includes('lawyer') || lowerContent.includes('rights')) {
    return 'legal';
  } else if (lowerQuery.includes('job') || lowerContent.includes('employment') || lowerContent.includes('career')) {
    return 'employment';
  } else if (lowerQuery.includes('child') || lowerContent.includes('family') || lowerContent.includes('parent')) {
    return 'family';
  } else {
    return 'general';
  }
};

const classifyLink = (url) => {
  if (url.includes('gov') || url.includes('.gov')) return 'Government';
  if (url.includes('org') || url.includes('.org')) return 'Organization';
  if (url.includes('edu') || url.includes('.edu')) return 'Educational';
  if (url.includes('health') || url.includes('medical')) return 'Health';
  if (url.includes('legal') || url.includes('law')) return 'Legal';
  return 'Resource';
};
