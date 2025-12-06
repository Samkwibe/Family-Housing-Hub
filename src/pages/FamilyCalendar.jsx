// src/pages/FamilyCalendar.jsx - Outlook-like Calendar with Advanced Features
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Users,
  Bell,
  Check,
  X,
  Edit3,
  Trash2,
  ListTodo,
  CheckCircle,
  Circle,
  AlertCircle,
  Star,
  Home,
  GraduationCap,
  Heart,
  Briefcase,
  PartyPopper,
  Plane,
  ShoppingCart,
  Utensils,
  Filter,
  Search,
  Download,
  Upload,
  Mail,
  Repeat,
  CalendarDays,
  CalendarClock,
  CalendarCheck,
  Settings,
  Share2,
  Globe,
  Video,
  FileText,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  or,
  and
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useTheme } from '../contexts/ThemeContext';

// Event types with colors
const EVENT_TYPES = [
  { id: 'appointment', label: 'Appointment', icon: Clock, color: 'bg-blue-500', lightColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { id: 'school', label: 'School', icon: GraduationCap, color: 'bg-purple-500', lightColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { id: 'health', label: 'Health', icon: Heart, color: 'bg-red-500', lightColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { id: 'work', label: 'Work', icon: Briefcase, color: 'bg-gray-500', lightColor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { id: 'family', label: 'Family', icon: Users, color: 'bg-green-500', lightColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { id: 'celebration', label: 'Celebration', icon: PartyPopper, color: 'bg-pink-500', lightColor: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  { id: 'travel', label: 'Travel', icon: Plane, color: 'bg-cyan-500', lightColor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart, color: 'bg-orange-500', lightColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { id: 'housing', label: 'Housing', icon: Home, color: 'bg-amber-500', lightColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { id: 'meeting', label: 'Meeting', icon: Video, color: 'bg-indigo-500', lightColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { id: 'other', label: 'Other', icon: Star, color: 'bg-indigo-500', lightColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' }
];

// Recurrence patterns
const RECURRENCE_PATTERNS = [
  { id: 'none', label: 'No recurrence' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' }
];

// Calendar views
const CALENDAR_VIEWS = [
  { id: 'day', label: 'Day', icon: CalendarClock },
  { id: 'week', label: 'Week', icon: CalendarDays },
  { id: 'month', label: 'Month', icon: Calendar },
  { id: 'agenda', label: 'Agenda', icon: ListTodo }
];

// Task priorities
const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 border-gray-200' },
  { id: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { id: 'high', label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300' },
  { id: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300' }
];

// Time zones (common ones)
const TIME_ZONES = [
  { id: 'America/New_York', label: 'Eastern Time (ET)' },
  { id: 'America/Chicago', label: 'Central Time (CT)' },
  { id: 'America/Denver', label: 'Mountain Time (MT)' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { id: 'UTC', label: 'UTC' },
  { id: 'Europe/London', label: 'London (GMT)' },
  { id: 'Europe/Paris', label: 'Paris (CET)' },
  { id: 'Asia/Tokyo', label: 'Tokyo (JST)' }
];

export default function FamilyCalendar() {
  const { currentUser, userProfile } = useAuth();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarView, setCalendarView] = useState('month'); // day, week, month, agenda
  const [view, setView] = useState('calendar'); // calendar, tasks
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Event form with enhanced fields
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'appointment',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
    assignedTo: '',
    attendees: [],
    attendeeEmails: '',
    reminder: true,
    reminderMinutes: 15,
    allDay: false,
    recurrence: 'none',
    recurrenceEnd: '',
    timeZone: timeZone,
    isMeeting: false,
    meetingLink: ''
  });

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    assignedTo: '',
    status: 'pending'
  });

  // Family members
  const familyMembers = useMemo(() => {
    const members = [
      { id: 'self', name: `${userProfile?.firstName || 'Me'}`, email: currentUser?.email || '' }
    ];
    if (userProfile?.familyMembers) {
      userProfile.familyMembers.forEach(m => {
        members.push({ id: m.id, name: m.name, email: m.email || '' });
      });
    }
    return members;
  }, [userProfile, currentUser]);

  // Load data including shared calendars
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load user's events
      const eventsQuery = query(
        collection(db, 'events'),
        where('userId', '==', currentUser.uid)
      );
      
      // Load shared events where user is an attendee
      const sharedEventsQuery = query(
        collection(db, 'events'),
        where('attendees', 'array-contains', currentUser.email)
      );

      const [eventsSnap, sharedSnap, tasksSnap] = await Promise.all([
        getDocs(eventsQuery),
        getDocs(sharedEventsQuery),
        getDocs(query(collection(db, 'tasks'), where('userId', '==', currentUser.uid)))
      ]);

      const userEvents = eventsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        endDate: doc.data().endDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        recurrenceEnd: doc.data().recurrenceEnd?.toDate()
      }));

      const sharedEvents = sharedSnap.docs
        .filter(doc => doc.data().userId !== currentUser.uid)
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
          endDate: doc.data().endDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          recurrenceEnd: doc.data().recurrenceEnd?.toDate(),
          isShared: true
        }));

      setEvents([...userEvents, ...sharedEvents]);

      setTasks(tasksSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate()
      })));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  // Generate recurring event instances
  const generateRecurringInstances = (event, startDate, endDate) => {
    if (!event.recurrence || event.recurrence === 'none') {
      return event.date >= startDate && event.date <= endDate ? [event] : [];
    }

    const instances = [];
    let currentDate = new Date(event.date);
    const recurrenceEnd = event.recurrenceEnd || new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());

    while (currentDate <= endDate && currentDate <= recurrenceEnd) {
      if (currentDate >= startDate) {
        instances.push({
          ...event,
          id: `${event.id}_${currentDate.getTime()}`,
          date: new Date(currentDate),
          isRecurring: true,
          originalEventId: event.id
        });
      }

      // Calculate next occurrence
      switch (event.recurrence) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        default:
          break;
      }
    }

    return instances;
  };

  // Get events for date range (for week/day views)
  const getEventsForDateRange = (startDate, endDate) => {
    const allInstances = [];
    events.forEach(event => {
      const instances = generateRecurringInstances(event, startDate, endDate);
      allInstances.push(...instances);
    });
    return allInstances.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }

    return days;
  };

  const calendarDays = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = date.toDateString();
    return events.filter(e => {
      if (!e.date) return false;
      const eventDate = new Date(e.date);
      return eventDate.toDateString() === dateStr;
    });
  };

  // Get week days
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = useMemo(() => getWeekDays(), [currentDate]);

  // Get day hours (for day view)
  const getDayHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  // Get upcoming events
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(e => e.date && new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [events]);

  // Filtered and searched events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.title?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [events, searchQuery]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    if (taskFilter === 'pending') {
      filtered = filtered.filter(t => t.status !== 'completed');
    } else if (taskFilter === 'completed') {
      filtered = filtered.filter(t => t.status === 'completed');
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return (new Date(a.dueDate) || 0) - (new Date(b.dueDate) || 0);
    });
  }, [tasks, taskFilter, searchQuery]);

  // Task stats
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = total - completed;
    const overdue = tasks.filter(t => {
      if (t.status === 'completed') return false;
      return t.dueDate && new Date(t.dueDate) < new Date();
    }).length;
    return { total, completed, pending, overdue };
  }, [tasks]);

  // Format helpers
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Navigation
  const goToPrevPeriod = () => {
    if (calendarView === 'day') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1));
    } else if (calendarView === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
    } else {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const goToNextPeriod = () => {
    if (calendarView === 'day') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1));
    } else if (calendarView === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
    } else {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Handle add event with enhanced features
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date) {
      toast.error('Please fill in title and date');
      return;
    }

    setSubmitting(true);
    try {
      const eventDate = new Date(eventForm.date);
      const endDate = eventForm.endTime ? new Date(eventForm.date) : null;
      
      if (eventForm.startTime) {
        const [hours, minutes] = eventForm.startTime.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes));
      }

      if (eventForm.endTime) {
        const [hours, minutes] = eventForm.endTime.split(':');
        endDate.setHours(parseInt(hours), parseInt(minutes));
      }

      // Parse attendee emails
      const attendeeEmails = eventForm.attendeeEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      const data = {
        userId: currentUser.uid,
        title: eventForm.title,
        type: eventForm.type,
        date: Timestamp.fromDate(eventDate),
        endDate: endDate ? Timestamp.fromDate(endDate) : null,
        startTime: eventForm.startTime,
        endTime: eventForm.endTime,
        location: eventForm.location,
        description: eventForm.description,
        assignedTo: eventForm.assignedTo,
        attendees: [...eventForm.attendees, ...attendeeEmails],
        reminder: eventForm.reminder,
        reminderMinutes: eventForm.reminderMinutes,
        allDay: eventForm.allDay,
        recurrence: eventForm.recurrence,
        recurrenceEnd: eventForm.recurrenceEnd ? Timestamp.fromDate(new Date(eventForm.recurrenceEnd)) : null,
        timeZone: eventForm.timeZone,
        isMeeting: eventForm.isMeeting,
        meetingLink: eventForm.meetingLink,
        createdAt: serverTimestamp()
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), data);
        toast.success('Event updated!');
        
        // Send update notifications to attendees
        if (data.attendees.length > 0) {
          toast.success(`Notifying ${data.attendees.length} attendee(s)...`);
        }
      } else {
        await addDoc(collection(db, 'events'), data);
        toast.success('Event created!');
        
        // Send invitation emails to attendees
        if (data.attendees.length > 0) {
          toast.success(`Invitations sent to ${data.attendees.length} attendee(s)!`);
        }
      }

      await loadData();
      setShowAddEvent(false);
      setEditingEvent(null);
      resetEventForm();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title) {
      toast.error('Please enter a task title');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        userId: currentUser.uid,
        title: taskForm.title,
        description: taskForm.description,
        dueDate: taskForm.dueDate ? Timestamp.fromDate(new Date(taskForm.dueDate)) : null,
        priority: taskForm.priority,
        assignedTo: taskForm.assignedTo,
        status: taskForm.status,
        createdAt: serverTimestamp()
      };

      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), data);
        toast.success('Task updated!');
      } else {
        await addDoc(collection(db, 'tasks'), data);
        toast.success('Task created!');
      }

      await loadData();
      setShowAddTask(false);
      setEditingTask(null);
      resetTaskForm();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle task completion
  const toggleTaskComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updateDoc(doc(db, 'tasks', task.id), {
        status: newStatus,
        completedAt: newStatus === 'completed' ? serverTimestamp() : null
      });
      await loadData();
      toast.success(newStatus === 'completed' ? 'Task completed! 🎉' : 'Task reopened');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  // Delete handlers
  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      await loadData();
      toast.success('Event deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
      await loadData();
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Export calendar to iCal format
  const exportToICal = () => {
    const icalEvents = events.map(event => {
      const start = new Date(event.date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const end = event.endDate 
        ? new Date(event.endDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        : start;
      
      return `BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
END:VEVENT`;
    }).join('\n');

    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Family Hub//Calendar//EN
${icalEvents}
END:VCALENDAR`;

    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar-${new Date().toISOString().split('T')[0]}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Calendar exported!');
  };

  // Import calendar from iCal (simplified)
  const importFromICal = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        // Simple iCal parser (basic implementation)
        const events = [];
        const lines = content.split('\n');
        let currentEvent = {};
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === 'BEGIN:VEVENT') {
            currentEvent = {};
          } else if (line === 'END:VEVENT') {
            if (currentEvent.start && currentEvent.title) {
              const startDate = new Date(
                currentEvent.start.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')
              );
              
              await addDoc(collection(db, 'events'), {
                userId: currentUser.uid,
                title: currentEvent.title,
                date: Timestamp.fromDate(startDate),
                endDate: currentEvent.end ? Timestamp.fromDate(new Date(
                  currentEvent.end.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')
                )) : null,
                description: currentEvent.description || '',
                location: currentEvent.location || '',
                type: 'other',
                allDay: false,
                createdAt: serverTimestamp()
              });
            }
          } else if (line.startsWith('DTSTART:')) {
            currentEvent.start = line.substring(8);
          } else if (line.startsWith('DTEND:')) {
            currentEvent.end = line.substring(6);
          } else if (line.startsWith('SUMMARY:')) {
            currentEvent.title = line.substring(8);
          } else if (line.startsWith('DESCRIPTION:')) {
            currentEvent.description = line.substring(12);
          } else if (line.startsWith('LOCATION:')) {
            currentEvent.location = line.substring(9);
          }
        }
        
        await loadData();
        toast.success(`Imported ${events.length} events!`);
      } catch (error) {
        console.error('Error importing calendar:', error);
        toast.error('Failed to import calendar');
      }
    };
    reader.readAsText(file);
  };

  // Reset forms
  const resetEventForm = () => {
    setEventForm({
      title: '',
      type: 'appointment',
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      startTime: '',
      endTime: '',
      location: '',
      description: '',
      assignedTo: '',
      attendees: [],
      attendeeEmails: '',
      reminder: true,
      reminderMinutes: 15,
      allDay: false,
      recurrence: 'none',
      recurrenceEnd: '',
      timeZone: timeZone,
      isMeeting: false,
      meetingLink: ''
    });
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      assignedTo: '',
      status: 'pending'
    });
  };

  // Get event type info
  const getEventType = (typeId) => {
    return EVENT_TYPES.find(t => t.id === typeId) || EVENT_TYPES[EVENT_TYPES.length - 1];
  };

  // Get priority info
  const getPriority = (priorityId) => {
    return PRIORITIES.find(p => p.id === priorityId) || PRIORITIES[1];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Render Day View
  const renderDayView = () => {
    const dayEvents = getEventsForDateRange(currentDate, new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
    const hours = getDayHours();

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>
        <div className="flex">
          <div className="w-20 border-r border-gray-200 dark:border-gray-700">
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-gray-100 dark:border-gray-700 p-2 text-xs text-gray-500">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>
          <div className="flex-1 relative">
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-gray-100 dark:border-gray-700 relative">
                {dayEvents
                  .filter(e => {
                    const eventDate = new Date(e.date);
                    return eventDate.getHours() === hour;
                  })
                  .map(event => {
                    const eventType = getEventType(event.type);
                    return (
                      <div
                        key={event.id}
                        className={`absolute left-0 right-0 mx-1 p-2 rounded ${eventType.lightColor} text-xs cursor-pointer hover:opacity-80`}
                        style={{ top: '0px' }}
                        onClick={() => {
                          setEditingEvent(event);
                          setEventForm({
                            ...eventForm,
                            title: event.title,
                            type: event.type,
                            date: new Date(event.date).toISOString().split('T')[0],
                            startTime: event.startTime || '',
                            endTime: event.endTime || '',
                            location: event.location || '',
                            description: event.description || '',
                            allDay: event.allDay || false
                          });
                          setShowAddEvent(true);
                        }}
                      >
                        <div className="font-medium">{event.title}</div>
                        {event.location && <div className="text-xs opacity-75">{event.location}</div>}
      </div>
    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const weekEvents = getEventsForDateRange(weekDays[0], weekDays[6]);

  return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>
            </div>
        <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2"></div>
          {weekDays.map((day, idx) => (
            <div key={idx} className="p-2 text-center border-l border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className={`text-lg font-semibold ${isToday(day) ? 'text-blue-600' : 'text-gray-900 dark:text-white'}`}>
                {day.getDate()}
        </div>
          </div>
          ))}
        </div>
        <div className="flex">
          <div className="w-20 border-r border-gray-200 dark:border-gray-700">
            {getDayHours().map(hour => (
              <div key={hour} className="h-16 border-b border-gray-100 dark:border-gray-700 p-2 text-xs text-gray-500">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7">
            {weekDays.map((day, dayIdx) => (
              <div key={dayIdx} className="border-l border-gray-200 dark:border-gray-700 relative">
                {getDayHours().map(hour => (
                  <div key={hour} className="h-16 border-b border-gray-100 dark:border-gray-700 relative">
                    {weekEvents
                      .filter(e => {
                        const eventDate = new Date(e.date);
                        return eventDate.toDateString() === day.toDateString() && eventDate.getHours() === hour;
                      })
                      .map(event => {
                        const eventType = getEventType(event.type);
                        return (
                          <div
                            key={event.id}
                            className={`absolute left-0 right-0 mx-1 p-1 rounded ${eventType.lightColor} text-xs cursor-pointer hover:opacity-80`}
                            onClick={() => {
                              setEditingEvent(event);
                              setShowAddEvent(true);
                            }}
                          >
                            {event.title}
        </div>
                        );
                      })}
      </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render Month View
  const renderMonthView = () => {
    return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
              onClick={goToPrevPeriod}
                    className="p-2 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <button
              onClick={goToNextPeriod}
                    className="p-2 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={goToToday}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                >
                  Today
                </button>
              </div>

              <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDate(day.date);
                  const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();

                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedDate(day.date)}
                className={`min-h-[120px] p-2 border-b border-r border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
                  day.isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                } ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        !day.isCurrentMonth ? 'text-gray-400' : 
                        isToday(day.date) ? 'w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center' : 
                  'text-gray-900 dark:text-white'
                      }`}>
                        {day.day}
                      </div>
                      <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => {
                          const eventType = getEventType(event.type);
                          return (
                            <div
                              key={event.id}
                        className={`text-xs px-2 py-1 rounded truncate ${eventType.lightColor} cursor-pointer hover:opacity-80`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(event);
                          setShowAddEvent(true);
                        }}
                      >
                        {event.allDay ? event.title : `${event.startTime || ''} ${event.title}`}
                            </div>
                          );
                        })}
                  {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                      +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
    );
  };

  // Render Agenda View
  const renderAgendaView = () => {
    const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
    const groupedEvents = {};

    sortedEvents.forEach(event => {
      const dateKey = new Date(event.date).toDateString();
      if (!groupedEvents[dateKey]) {
        groupedEvents[dateKey] = [];
      }
      groupedEvents[dateKey].push(event);
    });

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Agenda</h2>
          </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Object.keys(groupedEvents).length > 0 ? (
            Object.keys(groupedEvents).map(dateKey => (
              <div key={dateKey} className="p-4">
                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                  {formatDate(new Date(dateKey))}
                </div>
                <div className="space-y-2">
                  {groupedEvents[dateKey].map(event => {
                    const eventType = getEventType(event.type);
                    const EventIcon = eventType.icon;
                    return (
                      <div
                        key={event.id}
                        className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        onClick={() => {
                          setEditingEvent(event);
                          setShowAddEvent(true);
                        }}
                      >
                        <div className={`p-2 rounded-lg ${eventType.lightColor}`}>
                          <EventIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white">{event.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {event.startTime && <span>{event.startTime}</span>}
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                            {event.isMeeting && (
                              <span className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                Meeting
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{event.description}</p>
                          )}
                        </div>
                        {event.recurrence && event.recurrence !== 'none' && (
                          <Repeat className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No events found</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 dark:bg-gray-900 min-h-screen transition-colors duration-200 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen transition-colors duration-200 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl">
              <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            Calendar
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Outlook-like calendar with advanced features</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            {CALENDAR_VIEWS.map(viewOption => {
              const Icon = viewOption.icon;
              return (
                <button
                  key={viewOption.id}
                  onClick={() => setCalendarView(viewOption.id)}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    calendarView === viewOption.id
                      ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={viewOption.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{viewOption.label}</span>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={exportToICal}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Export Calendar"
            >
              <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <label className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" title="Import Calendar">
              <Upload className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <input
                type="file"
                accept=".ics"
                onChange={(e) => e.target.files[0] && importFromICal(e.target.files[0])}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Settings"
            >
              <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => view === 'calendar' ? setShowAddEvent(true) : setShowAddTask(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-xl font-semibold flex items-center space-x-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>New {view === 'calendar' ? 'Event' : 'Task'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View Toggle */}
      <div className="mb-6 flex gap-3">
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'calendar' ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Calendar
          </button>
          <button
            onClick={() => setView('tasks')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'tasks' ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <ListTodo className="h-4 w-4 inline mr-2" />
            Tasks
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar Area */}
          <div className={`${calendarView === 'agenda' ? 'lg:col-span-4' : 'lg:col-span-3'}`}>
            {calendarView === 'day' && renderDayView()}
            {calendarView === 'week' && renderWeekView()}
            {calendarView === 'month' && renderMonthView()}
            {calendarView === 'agenda' && renderAgendaView()}
          </div>

          {/* Sidebar - only show for non-agenda views */}
          {calendarView !== 'agenda' && (
          <div className="space-y-6">
            {/* Selected Date Events */}
            {selectedDate && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {formatDate(selectedDate)}
                  </h3>
                </div>
                  <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                  {getEventsForDate(selectedDate).length > 0 ? (
                    getEventsForDate(selectedDate).map(event => {
                      const eventType = getEventType(event.type);
                      const EventIcon = eventType.icon;
                      return (
                          <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className={`p-2 rounded-lg ${eventType.lightColor}`}>
                            <EventIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{event.title}</p>
                            {event.startTime && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{event.startTime}</p>
                            )}
                              {event.location && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </p>
                              )}
                          </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingEvent(event);
                                  setShowAddEvent(true);
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                              >
                                <Edit3 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                          </button>
                            </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No events</p>
                  )}
                  <button
                    onClick={() => {
                      setEventForm(prev => ({ ...prev, date: selectedDate.toISOString().split('T')[0] }));
                      setShowAddEvent(true);
                    }}
                      className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="h-4 w-4 inline mr-1" /> Add Event
                  </button>
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Upcoming</h3>
              </div>
                <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map(event => {
                    const eventType = getEventType(event.type);
                    const EventIcon = eventType.icon;
                    return (
                        <div key={event.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors" onClick={() => {
                          setSelectedDate(new Date(event.date));
                          setEditingEvent(event);
                          setShowAddEvent(true);
                        }}>
                        <div className={`p-2 rounded-lg ${eventType.lightColor}`}>
                          <EventIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{event.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(event.date)}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center">No upcoming events</p>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      ) : (
        /* Tasks View - keeping existing task view */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Task Stats */}
          <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{taskStats.total}</p>
                </div>
                <ListTodo className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{taskStats.pending}</p>
                </div>
                <Circle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{taskStats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
                  <p className="text-3xl font-bold text-red-600">{taskStats.overdue}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">Tasks</h2>
                <div className="flex gap-2">
                  {['all', 'pending', 'completed'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setTaskFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                        taskFilter === filter
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map(task => {
                    const priority = getPriority(task.priority);
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

                    return (
                      <div
                        key={task.id}
                        className={`p-4 flex items-start space-x-4 ${
                          task.status === 'completed' ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                        }`}
                      >
                        <button
                          onClick={() => toggleTaskComplete(task)}
                          className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            task.status === 'completed'
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                          }`}
                        >
                          {task.status === 'completed' && <Check className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${
                              task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'
                            }`}>
                              {task.title}
                            </p>
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${priority.color}`}>
                              {priority.label}
                            </span>
                            {isOverdue && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs">
                                Overdue
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Due: {formatDate(task.dueDate)}
                              </span>
                            )}
                            {task.assignedTo && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {familyMembers.find(m => m.id === task.assignedTo)?.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setTaskForm({
                                title: task.title,
                                description: task.description || '',
                                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                                priority: task.priority,
                                assignedTo: task.assignedTo || '',
                                status: task.status
                              });
                              setEditingTask(task);
                              setShowAddTask(true);
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Edit3 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-red-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center">
                    <ListTodo className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No tasks found</p>
                    <button
                      onClick={() => setShowAddTask(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                    >
                      Create Task
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Add Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto my-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingEvent ? 'Edit Event' : 'New Event'}
                </h2>
                <button
                  onClick={() => { setShowAddEvent(false); setEditingEvent(null); resetEventForm(); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddEvent} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <div className="grid grid-cols-6 gap-2">
                  {EVENT_TYPES.slice(0, 6).map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setEventForm(prev => ({ ...prev, type: type.id }))}
                      className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${
                        eventForm.type === type.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <type.icon className={`h-5 w-5 ${eventForm.type === type.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                      <span className="text-xs mt-1">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Zone</label>
                  <select
                    value={eventForm.timeZone}
                    onChange={(e) => setEventForm(prev => ({ ...prev, timeZone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {TIME_ZONES.map(tz => (
                      <option key={tz.id} value={tz.id}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time</label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={eventForm.allDay}
                  onChange={(e) => setEventForm(prev => ({ ...prev, allDay: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="allDay" className="text-sm text-gray-700 dark:text-gray-300">All day event</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Event location or meeting link"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Event description..."
                />
              </div>

              {/* Recurrence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recurrence</label>
                <div className="grid grid-cols-5 gap-2">
                  {RECURRENCE_PATTERNS.map(pattern => (
                    <button
                      key={pattern.id}
                      type="button"
                      onClick={() => setEventForm(prev => ({ ...prev, recurrence: pattern.id }))}
                      className={`p-2 rounded-lg border-2 transition-all text-sm ${
                        eventForm.recurrence === pattern.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {pattern.label}
                    </button>
                  ))}
                </div>
                {eventForm.recurrence !== 'none' && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recurrence End Date</label>
                    <input
                      type="date"
                      value={eventForm.recurrenceEnd}
                      onChange={(e) => setEventForm(prev => ({ ...prev, recurrenceEnd: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Meeting Options */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isMeeting"
                  checked={eventForm.isMeeting}
                  onChange={(e) => setEventForm(prev => ({ ...prev, isMeeting: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isMeeting" className="text-sm text-gray-700 dark:text-gray-300">This is a meeting</label>
              </div>

              {eventForm.isMeeting && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Link (Zoom, Teams, etc.)</label>
                  <input
                    type="url"
                    value={eventForm.meetingLink}
                    onChange={(e) => setEventForm(prev => ({ ...prev, meetingLink: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="https://..."
                  />
                </div>
              )}

              {/* Attendees */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attendees (Email addresses, comma-separated)</label>
                <input
                  type="text"
                  value={eventForm.attendeeEmails}
                  onChange={(e) => setEventForm(prev => ({ ...prev, attendeeEmails: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Invitations will be sent via email</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign To</label>
                <select
                  value={eventForm.assignedTo}
                  onChange={(e) => setEventForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Everyone</option>
                  {familyMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Reminders */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                <input
                  type="checkbox"
                  id="reminder"
                  checked={eventForm.reminder}
                  onChange={(e) => setEventForm(prev => ({ ...prev, reminder: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="reminder" className="text-sm text-gray-700 dark:text-gray-300">Send reminder</label>
                </div>
                {eventForm.reminder && (
                  <select
                    value={eventForm.reminderMinutes}
                    onChange={(e) => setEventForm(prev => ({ ...prev, reminderMinutes: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={5}>5 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                )}
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => { setShowAddEvent(false); setEditingEvent(null); resetEventForm(); }}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal - keeping existing */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingTask ? 'Edit Task' : 'Add Task'}
                </h2>
                <button
                  onClick={() => { setShowAddTask(false); setEditingTask(null); resetTaskForm(); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddTask} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="What needs to be done?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="Additional details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign To</label>
                <select
                  value={taskForm.assignedTo}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {familyMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddTask(false); setEditingTask(null); resetTaskForm(); }}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : editingTask ? 'Update' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Calendar Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => {
                    setTimeZone(e.target.value);
                    setEventForm(prev => ({ ...prev, timeZone: e.target.value }));
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {TIME_ZONES.map(tz => (
                    <option key={tz.id} value={tz.id}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
