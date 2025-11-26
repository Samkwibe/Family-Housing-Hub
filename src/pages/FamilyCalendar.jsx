// src/pages/FamilyCalendar.jsx - Family Calendar & Task Management
import React, { useState, useEffect, useMemo } from 'react';
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
  Filter
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
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Event types with colors
const EVENT_TYPES = [
  { id: 'appointment', label: 'Appointment', icon: Clock, color: 'bg-blue-500', lightColor: 'bg-blue-100 text-blue-700' },
  { id: 'school', label: 'School', icon: GraduationCap, color: 'bg-purple-500', lightColor: 'bg-purple-100 text-purple-700' },
  { id: 'health', label: 'Health', icon: Heart, color: 'bg-red-500', lightColor: 'bg-red-100 text-red-700' },
  { id: 'work', label: 'Work', icon: Briefcase, color: 'bg-gray-500', lightColor: 'bg-gray-100 text-gray-700' },
  { id: 'family', label: 'Family', icon: Users, color: 'bg-green-500', lightColor: 'bg-green-100 text-green-700' },
  { id: 'celebration', label: 'Celebration', icon: PartyPopper, color: 'bg-pink-500', lightColor: 'bg-pink-100 text-pink-700' },
  { id: 'travel', label: 'Travel', icon: Plane, color: 'bg-cyan-500', lightColor: 'bg-cyan-100 text-cyan-700' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart, color: 'bg-orange-500', lightColor: 'bg-orange-100 text-orange-700' },
  { id: 'housing', label: 'Housing', icon: Home, color: 'bg-amber-500', lightColor: 'bg-amber-100 text-amber-700' },
  { id: 'other', label: 'Other', icon: Star, color: 'bg-indigo-500', lightColor: 'bg-indigo-100 text-indigo-700' }
];

// Task priorities
const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { id: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'high', label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 border-red-200' }
];

export default function FamilyCalendar() {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('calendar'); // calendar, tasks
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [taskFilter, setTaskFilter] = useState('all'); // all, pending, completed

  // Event form
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'appointment',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
    assignedTo: '',
    reminder: true,
    allDay: false
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
      { id: 'self', name: `${userProfile?.firstName || 'Me'}` }
    ];
    if (userProfile?.familyMembers) {
      userProfile.familyMembers.forEach(m => {
        members.push({ id: m.id, name: m.name });
      });
    }
    return members;
  }, [userProfile]);

  // Load data
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsSnap, tasksSnap] = await Promise.all([
        getDocs(query(collection(db, 'events'), where('userId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'tasks'), where('userId', '==', currentUser.uid)))
      ]);

      setEvents(eventsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      })));

      setTasks(tasksSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate()
      })));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
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
    
    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }

    return days;
  };

  const calendarDays = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  // Get events for a specific date
  const getEventsForDate = (date) => {
    return events.filter(e => {
      if (!e.date) return false;
      const eventDate = new Date(e.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  // Get upcoming events
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(e => e.date && new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [events]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    if (taskFilter === 'pending') {
      filtered = filtered.filter(t => t.status !== 'completed');
    } else if (taskFilter === 'completed') {
      filtered = filtered.filter(t => t.status === 'completed');
    }
    return filtered.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return (new Date(a.dueDate) || 0) - (new Date(b.dueDate) || 0);
    });
  }, [tasks, taskFilter]);

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

  // Navigation
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Handle add event
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date) {
      toast.error('Please fill in title and date');
      return;
    }

    setSubmitting(true);
    try {
      const eventDate = new Date(eventForm.date);
      if (eventForm.startTime) {
        const [hours, minutes] = eventForm.startTime.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes));
      }

      const data = {
        userId: currentUser.uid,
        title: eventForm.title,
        type: eventForm.type,
        date: Timestamp.fromDate(eventDate),
        startTime: eventForm.startTime,
        endTime: eventForm.endTime,
        location: eventForm.location,
        description: eventForm.description,
        assignedTo: eventForm.assignedTo,
        reminder: eventForm.reminder,
        allDay: eventForm.allDay,
        createdAt: serverTimestamp()
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), data);
        toast.success('Event updated!');
      } else {
        await addDoc(collection(db, 'events'), data);
        toast.success('Event added!');
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
      reminder: true,
      allDay: false
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            Family Calendar
          </h1>
          <p className="text-gray-600 mt-1">Organize events and tasks for the whole family</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'calendar' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Calendar
            </button>
            <button
              onClick={() => setView('tasks')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'tasks' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              <ListTodo className="h-4 w-4 inline mr-2" />
              Tasks
            </button>
          </div>
          <button
            onClick={() => view === 'calendar' ? setShowAddEvent(true) : setShowAddTask(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="h-5 w-5" />
            <span>Add {view === 'calendar' ? 'Event' : 'Task'}</span>
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Calendar Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={goToPrevMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-xl font-bold text-gray-900">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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

              {/* Days of Week */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDate(day.date);
                  const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();

                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedDate(day.date)}
                      className={`min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors ${
                        day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        !day.isCurrentMonth ? 'text-gray-400' : 
                        isToday(day.date) ? 'w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center' : 
                        'text-gray-900'
                      }`}>
                        {day.day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => {
                          const eventType = getEventType(event.type);
                          return (
                            <div
                              key={event.id}
                              className={`text-xs px-2 py-1 rounded truncate ${eventType.lightColor}`}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500 px-2">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Events */}
            {selectedDate && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">
                    {formatDate(selectedDate)}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {getEventsForDate(selectedDate).length > 0 ? (
                    getEventsForDate(selectedDate).map(event => {
                      const eventType = getEventType(event.type);
                      const EventIcon = eventType.icon;
                      return (
                        <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl">
                          <div className={`p-2 rounded-lg ${eventType.lightColor}`}>
                            <EventIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{event.title}</p>
                            {event.startTime && (
                              <p className="text-sm text-gray-500">{event.startTime}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">No events</p>
                  )}
                  <button
                    onClick={() => {
                      setEventForm(prev => ({ ...prev, date: selectedDate.toISOString().split('T')[0] }));
                      setShowAddEvent(true);
                    }}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="h-4 w-4 inline mr-1" /> Add Event
                  </button>
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Upcoming</h3>
              </div>
              <div className="p-4 space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map(event => {
                    const eventType = getEventType(event.type);
                    const EventIcon = eventType.icon;
                    return (
                      <div key={event.id} className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${eventType.lightColor}`}>
                          <EventIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{event.title}</p>
                          <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm text-center">No upcoming events</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tasks View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Task Stats */}
          <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">{taskStats.total}</p>
                </div>
                <ListTodo className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{taskStats.pending}</p>
                </div>
                <Circle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{taskStats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-3xl font-bold text-red-600">{taskStats.overdue}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Tasks</h2>
                <div className="flex gap-2">
                  {['all', 'pending', 'completed'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setTaskFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                        taskFilter === filter
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map(task => {
                    const priority = getPriority(task.priority);
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

                    return (
                      <div
                        key={task.id}
                        className={`p-4 flex items-start space-x-4 ${
                          task.status === 'completed' ? 'bg-gray-50' : ''
                        }`}
                      >
                        <button
                          onClick={() => toggleTaskComplete(task)}
                          className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            task.status === 'completed'
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {task.status === 'completed' && <Check className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${
                              task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'
                            }`}>
                              {task.title}
                            </p>
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${priority.color}`}>
                              {priority.label}
                            </span>
                            {isOverdue && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                                Overdue
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
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
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit3 className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center">
                    <ListTodo className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No tasks found</p>
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

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingEvent ? 'Edit Event' : 'Add Event'}
                </h2>
                <button
                  onClick={() => { setShowAddEvent(false); setEditingEvent(null); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddEvent} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {EVENT_TYPES.slice(0, 5).map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setEventForm(prev => ({ ...prev, type: type.id }))}
                      className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${
                        eventForm.type === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <type.icon className={`h-5 w-5 ${eventForm.type === type.id ? 'text-blue-600' : 'text-gray-500'}`} />
                      <span className="text-xs mt-1">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="Event location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                <select
                  value={eventForm.assignedTo}
                  onChange={(e) => setEventForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Everyone</option>
                  {familyMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="reminder"
                  checked={eventForm.reminder}
                  onChange={(e) => setEventForm(prev => ({ ...prev, reminder: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="reminder" className="text-sm text-gray-700">Send reminder</label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddEvent(false); setEditingEvent(null); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingEvent ? 'Update' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingTask ? 'Edit Task' : 'Add Task'}
                </h2>
                <button
                  onClick={() => { setShowAddTask(false); setEditingTask(null); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddTask} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="What needs to be done?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="Additional details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                <select
                  value={taskForm.assignedTo}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
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
                  onClick={() => { setShowAddTask(false); setEditingTask(null); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingTask ? 'Update' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

