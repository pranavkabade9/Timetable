import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Plus, 
  Trash2, 
  History, 
  X, 
  Sun, 
  Moon, 
  Calendar, 
  RotateCcw, 
  LayoutDashboard,
  Settings,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isWithinInterval, setHours, setMinutes, parseISO, addDays } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Event {
  id: string;
  subject: string;
  faculty: string;
  room: string;
  type: 'lecture' | 'lab';
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  date: string; // YYYY-MM-DD
  isDeleted?: boolean;
}

interface ActivityLog {
  id: string;
  type: 'added' | 'edited' | 'deleted' | 'restored';
  description: string;
  timestamp: Date;
  itemId: string;
}

// --- Constants ---
const COLLEGE_START = { hour: 9, minute: 0 };
const COLLEGE_END = { hour: 17, minute: 0 };

// --- Components ---

const GlassCard = ({ children, className, ...props }: any) => (
  <div className={cn("glass-card p-4", className)} {...props}>
    {children}
  </div>
);

const Wallpaper = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient opacity-40 dark:opacity-60" />
    <div className="absolute inset-0 backdrop-blur-[100px]" />
  </div>
);

const TimeWidget = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isWorkingHours = useMemo(() => {
    const start = setMinutes(setHours(now, COLLEGE_START.hour), COLLEGE_START.minute);
    const end = setMinutes(setHours(now, COLLEGE_END.hour), COLLEGE_END.minute);
    return isWithinInterval(now, { start, end });
  }, [now]);

  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass px-6 py-3 flex flex-col items-end gap-1"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl font-light tracking-tight">
          {format(now, 'h:mm a')}
        </span>
        <div className={cn(
          "w-2 h-2 rounded-full",
          isWorkingHours ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-slate-400"
        )} />
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs font-medium opacity-60 uppercase tracking-widest">
          {format(now, 'EEEE, d MMM')}
        </span>
        <span className="text-[10px] opacity-40 uppercase tracking-tighter">
          {isWorkingHours ? "College Hours" : "Outside Hours"}
        </span>
      </div>
    </motion.div>
  );
};

export default function App() {
  useEffect(() => {
    document.title = "Academic Time Table";
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notificationsEnabled') === 'true';
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('accentColor') || 'indigo';
  });

  const [isPrefsOpen, setIsPrefsOpen] = useState(false);

  const [events, setEvents] = useState<Event[]>(() => {
    const saved = localStorage.getItem('events');
    return saved ? JSON.parse(saved) : [];
  });

  const [activities, setActivities] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('activities');
    return saved ? JSON.parse(saved).map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) })) : [];
  });

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'trash'>('activity');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [newEvent, setNewEvent] = useState({
    subject: '',
    faculty: '',
    room: '',
    type: 'lecture' as 'lecture' | 'lab',
    startTime: '09:00',
    endTime: '10:00',
    date: format(new Date(), 'yyyy-MM-dd'),
    repeatDays: [] as number[], // 0-6
    repeatCount: 1
  });

  const [filters, setFilters] = useState({
    lecture: true,
    lab: true
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPanelOpen(false);
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('accentColor', accentColor);
    const colors: Record<string, string> = {
      indigo: '#6366f1',
      emerald: '#10b981',
      amber: '#f59e0b',
      rose: '#f43f5e'
    };
    document.documentElement.style.setProperty('--color-indigo-500', colors[accentColor] || colors.indigo);
    document.documentElement.style.setProperty('--color-indigo-600', colors[accentColor] || colors.indigo);
  }, [accentColor]);

  const sendNotification = (title: string, body: string) => {
    if (!notificationsEnabled) return;
    
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification(title, { body });
          }
        });
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('activities', JSON.stringify(activities));
  }, [activities]);

  const logActivity = (type: ActivityLog['type'], description: string, itemId: string) => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      description,
      timestamp: new Date(),
      itemId
    };
    setActivities(prev => [newLog, ...prev].slice(0, 20));
  };

  const handleAddEvent = () => {
    if (!newEvent.subject) return;

    // Validation: Prevent overlapping events
    const hasOverlap = events.some(e => {
      if (e.isDeleted || e.date !== newEvent.date) return false;
      
      const newStart = parseInt(newEvent.startTime.replace(':', ''));
      const newEnd = parseInt(newEvent.endTime.replace(':', ''));
      const eStart = parseInt(e.startTime.replace(':', ''));
      const eEnd = parseInt(e.endTime.replace(':', ''));

      return (newStart >= eStart && newStart < eEnd) || (newEnd > eStart && newEnd <= eEnd);
    });

    if (hasOverlap) {
      alert("This event overlaps with another scheduled event.");
      return;
    }

    const newEvents: Event[] = [];
    const baseDate = parseISO(newEvent.date);

    // Multi-add logic: Repeat across days or just one
    if (newEvent.repeatDays.length > 0) {
      // For each selected day, add events for the next X weeks
      for (let i = 0; i < newEvent.repeatCount; i++) {
        newEvent.repeatDays.forEach(day => {
          // Find the next occurrence of this day
          const date = addDays(baseDate, (day - baseDate.getDay() + 7) % 7 + (i * 7));
          newEvents.push({
            id: Math.random().toString(36).substr(2, 9),
            subject: newEvent.subject,
            faculty: newEvent.faculty,
            room: newEvent.room,
            type: newEvent.type,
            startTime: newEvent.startTime,
            endTime: newEvent.endTime,
            date: format(date, 'yyyy-MM-dd')
          });
        });
      }
    } else {
      newEvents.push({
        id: Math.random().toString(36).substr(2, 9),
        subject: newEvent.subject,
        faculty: newEvent.faculty,
        room: newEvent.room,
        type: newEvent.type,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        date: newEvent.date
      });
    }

    setEvents(prev => [...prev, ...newEvents]);
    logActivity('added', `Added ${newEvents.length} event(s): ${newEvent.subject}`, newEvents[0].id);
    sendNotification("Event Added", `Successfully scheduled: ${newEvent.subject}`);
    setIsAddModalOpen(false);
    setNewEvent({
      subject: '',
      faculty: '',
      room: '',
      type: 'lecture',
      startTime: '09:00',
      endTime: '10:00',
      date: format(new Date(), 'yyyy-MM-dd'),
      repeatDays: [],
      repeatCount: 1
    });
  };

  const softDeleteEvent = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    const event = events.find(e => e.id === deleteConfirmId);
    if (!event) {
      setDeleteConfirmId(null);
      return;
    }
    setEvents(prev => prev.map(e => e.id === deleteConfirmId ? { ...e, isDeleted: true } : e));
    logActivity('deleted', `Deleted event: ${event.subject}`, deleteConfirmId);
    sendNotification("Event Deleted", `Moved to trash: ${event.subject}`);
    setDeleteConfirmId(null);
  };

  const restoreEvent = (id: string) => {
    const event = events.find(e => e.id === id);
    if (!event) return;
    setEvents(prev => prev.map(e => e.id === id ? { ...e, isDeleted: false } : e));
    logActivity('restored', `Restored event: ${event.subject}`, id);
  };

  const permanentDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this forever?')) {
      setEvents(prev => prev.filter(e => e.id !== id));
    }
  };

  const activeEvents = useMemo(() => 
    events.filter(e => !e.isDeleted && (e.type ? filters[e.type] : true)).sort((a, b) => 
      `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
    ), [events, filters]);

  const trashEvents = useMemo(() => events.filter(e => e.isDeleted), [events]);

  // Check for upcoming events every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentDay = format(now, 'yyyy-MM-dd');
      const currentTime = format(now, 'HH:mm');

      activeEvents.forEach(event => {
        if (event.date === currentDay && event.startTime === currentTime) {
          sendNotification("Upcoming Class", `${event.subject} is starting now!`);
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [activeEvents, notificationsEnabled]);

  return (
    <div className="min-h-screen w-full relative font-sans">
      <Wallpaper />
      
      {/* --- Header --- */}
      <header className="fixed top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 glass flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Academic Time Table</h1>
            <p className="text-[10px] opacity-50 uppercase tracking-widest font-bold">Academic Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <TimeWidget />
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-10 h-10 glass flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => setIsPanelOpen(true)}
            className="w-10 h-10 glass flex items-center justify-center hover:bg-white/20 transition-colors relative"
          >
            <History className="w-5 h-5" />
            {activities.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white/20" />
            )}
          </button>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="pt-28 pb-12 px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-2rem)]">
        {/* Left Sidebar / Controls */}
        <div className="lg:col-span-3 space-y-6">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="glass-panel p-6 space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-sm font-semibold opacity-60 uppercase tracking-widest">Quick Actions</h2>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="w-full py-3 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add New Event</span>
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <h2 className="text-sm font-semibold opacity-60 uppercase tracking-widest">Navigation</h2>
              <nav className="space-y-1">
                {[
                  { icon: Calendar, label: 'Timetable', active: true },
                  { icon: Bell, label: 'Notifications', onClick: () => {
                    if (Notification.permission !== "granted") {
                      Notification.requestPermission().then(p => {
                        if (p === "granted") setNotificationsEnabled(true);
                      });
                    } else {
                      setNotificationsEnabled(!notificationsEnabled);
                    }
                  }},
                  { icon: Settings, label: 'Preferences', onClick: () => setIsPrefsOpen(true) },
                ].map((item) => (
                  <button 
                    key={item.label}
                    onClick={item.onClick}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                      item.active ? "bg-white/10 text-indigo-500" : "opacity-60 hover:opacity-100 hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </motion.div>
        </div>

        {/* Center Content */}
        <div className="lg:col-span-9 overflow-hidden flex flex-col gap-6">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-panel flex-1 overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Weekly Timetable</h2>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-xs opacity-50">Tuesday – Saturday • 9:00 AM – 5:00 PM</p>
                  <div className="h-3 w-[1px] bg-white/10" />
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Show:</span>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={filters.lecture}
                        onChange={() => setFilters(f => ({...f, lecture: !f.lecture}))}
                        className="hidden"
                      />
                      <div className={cn(
                        "w-4 h-4 rounded border border-white/20 flex items-center justify-center transition-all",
                        filters.lecture ? "bg-blue-500 border-blue-500" : "bg-white/5"
                      )}>
                        {filters.lecture && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className={cn("text-[10px] font-bold uppercase transition-all", filters.lecture ? "opacity-100" : "opacity-40")}>Lectures</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={filters.lab}
                        onChange={() => setFilters(f => ({...f, lab: !f.lab}))}
                        className="hidden"
                      />
                      <div className={cn(
                        "w-4 h-4 rounded border border-white/20 flex items-center justify-center transition-all",
                        filters.lab ? "bg-emerald-500 border-emerald-500" : "bg-white/5"
                      )}>
                        {filters.lab && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className={cn("text-[10px] font-bold uppercase transition-all", filters.lab ? "opacity-100" : "opacity-40")}>Labs</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full glass text-[10px] uppercase font-bold tracking-tighter opacity-70">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Lecture
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full glass text-[10px] uppercase font-bold tracking-tighter opacity-70">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Lab
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[100px_repeat(5,1fr)] border border-white/10 rounded-xl overflow-hidden glass">
                  {/* Header */}
                  <div className="bg-white/5 p-4 border-b border-r border-white/10 font-bold text-[10px] uppercase opacity-50">Time</div>
                  {['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <div key={day} className="bg-white/5 p-4 border-b border-r border-white/10 font-bold text-[10px] uppercase opacity-50 text-center">
                      {day}
                    </div>
                  ))}
                  
                  {/* Rows */}
                  {Array.from({ length: 9 }, (_, i) => i + 9).map(hour => (
                    <React.Fragment key={hour}>
                      <div className="p-4 border-b border-r border-white/10 text-[10px] font-bold opacity-40 flex items-center justify-center">
                        {format(setHours(new Date(), hour), 'h:00 a')}
                      </div>
                      {['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                        const dayEvents = activeEvents.filter(e => {
                          const eventDate = parseISO(e.date);
                          const eventDayName = format(eventDate, 'EEEE');
                          const eventHour = parseInt(e.startTime.split(':')[0]);
                          return eventDayName === day && eventHour === hour;
                        });
                        
                        return (
                          <div key={day} className="p-1 border-b border-r border-white/10 min-h-[100px] bg-white/[0.02]">
                            {dayEvents.map(event => (
                              <div key={event.id} className={cn(
                                "p-2 rounded-lg text-[10px] font-medium mb-1 shadow-sm border animate-in fade-in zoom-in-95 duration-300",
                                event.type === 'lecture' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                                'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              )}>
                                <div className="font-bold truncate text-sm mb-0.5">{event.subject}</div>
                                <div className="opacity-70 flex items-center gap-1 mb-0.5">
                                  <span className="opacity-50">Prof.</span> {event.faculty}
                                </div>
                                <div className="opacity-70 flex items-center gap-1 mb-1">
                                  <span className="opacity-50">Room</span> {event.room}
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-1 border-t border-current/10">
                                  <span className="font-bold uppercase tracking-tighter">
                                    {event.type === 'lecture' ? '📘 Lecture' : '🧪 Lab'}
                                  </span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      softDeleteEvent(event.id);
                                    }}
                                    className="delete-event opacity-60 hover:opacity-100 transition-opacity text-red-500 font-bold uppercase text-[8px] px-2 py-1 hover:bg-red-500/10 rounded"
                                    data-id={event.id}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* --- Right Side Panel (Activity & Trash) --- */}
      <AnimatePresence>
        {isPanelOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md glass-panel rounded-none border-l border-white/20 z-50 flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Activity Center</h2>
                  <p className="text-xs opacity-50">Recent actions & deleted items</p>
                </div>
                <button 
                  onClick={() => setIsPanelOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex p-2 gap-1 border-b border-white/5">
                <button 
                  onClick={() => setActiveTab('activity')}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                    activeTab === 'activity' ? "bg-white/10 text-indigo-500" : "opacity-40 hover:opacity-100"
                  )}
                >
                  Activity
                </button>
                <button 
                  onClick={() => setActiveTab('trash')}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                    activeTab === 'trash' ? "bg-white/10 text-indigo-500" : "opacity-40 hover:opacity-100"
                  )}
                >
                  Trash ({trashEvents.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {activeTab === 'activity' ? (
                  activities.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-2">
                      <History className="w-8 h-8" />
                      <p className="text-xs">No recent activity</p>
                    </div>
                  ) : (
                    activities.map((log) => (
                      <div key={log.id} className="flex gap-3 p-3 glass-card border-none bg-white/5">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          log.type === 'added' ? 'bg-emerald-500/20 text-emerald-500' :
                          log.type === 'deleted' ? 'bg-red-500/20 text-red-500' :
                          'bg-indigo-500/20 text-indigo-500'
                        )}>
                          {log.type === 'added' ? <Plus className="w-4 h-4" /> :
                           log.type === 'deleted' ? <Trash2 className="w-4 h-4" /> :
                           <RotateCcw className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{log.description}</p>
                          <p className="text-[10px] opacity-40 mt-1">
                            {format(log.timestamp, 'h:mm a')} • {format(log.timestamp, 'MMM d')}
                          </p>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  trashEvents.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-2">
                      <Trash2 className="w-8 h-8" />
                      <p className="text-xs">Trash is empty</p>
                    </div>
                  ) : (
                    trashEvents.map((event) => (
                      <div key={event.id} className="p-3 glass-card border-none bg-white/5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-semibold">{event.subject}</h3>
                            <p className="text-[10px] opacity-40">{event.startTime} - {event.endTime}</p>
                          </div>
                          <span className="text-[10px] opacity-40 uppercase font-bold">{event.type}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => restoreEvent(event.id)}
                            className="flex-1 py-1.5 bg-indigo-500/20 text-indigo-500 text-[10px] font-bold uppercase rounded-lg hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                          <button 
                            onClick={() => permanentDelete(event.id)}
                            className="flex-1 py-1.5 bg-red-500/20 text-red-500 text-[10px] font-bold uppercase rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Delete Confirmation Modal --- */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm glass-panel p-6 space-y-6 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Delete Event?</h3>
                <p className="text-sm opacity-60 mt-2">
                  This event will be moved to the trash. You can restore it later if needed.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 rounded-xl glass hover:bg-white/10 transition-all text-sm font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all text-sm font-bold shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Add Event Modal --- */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg glass-panel p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Schedule Event</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Subject</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Thermodynamics"
                    value={newEvent.subject}
                    onChange={e => setNewEvent({...newEvent, subject: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Faculty</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Dr. Kulkarni"
                      value={newEvent.faculty}
                      onChange={e => setNewEvent({...newEvent, faculty: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Room / Lab</label>
                    <input 
                      type="text" 
                      placeholder="e.g. A102"
                      value={newEvent.room}
                      onChange={e => setNewEvent({...newEvent, room: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Class Type</label>
                  <div className="flex gap-4 p-1 bg-white/5 rounded-xl border border-white/10">
                    <button 
                      onClick={() => setNewEvent({...newEvent, type: 'lecture'})}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                        newEvent.type === 'lecture' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "opacity-50 hover:opacity-100"
                      )}
                    >
                      📘 Lecture
                    </button>
                    <button 
                      onClick={() => setNewEvent({...newEvent, type: 'lab'})}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                        newEvent.type === 'lab' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "opacity-50 hover:opacity-100"
                      )}
                    >
                      🧪 Lab
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Start</label>
                    <input 
                      type="time" 
                      value={newEvent.startTime}
                      onChange={e => setNewEvent({...newEvent, startTime: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">End</label>
                    <input 
                      type="time" 
                      value={newEvent.endTime}
                      onChange={e => setNewEvent({...newEvent, endTime: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Date</label>
                  <input 
                    type="date" 
                    value={newEvent.date}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Multi-Event Repeat (Optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setNewEvent(prev => ({
                            ...prev,
                            repeatDays: prev.repeatDays.includes(idx) 
                              ? prev.repeatDays.filter(d => d !== idx)
                              : [...prev.repeatDays, idx]
                          }))
                        }}
                        className={cn(
                          "w-9 h-9 rounded-lg border border-white/10 text-xs font-bold transition-all",
                          newEvent.repeatDays.includes(idx) ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-white/5 opacity-60 hover:opacity-100"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  {newEvent.repeatDays.length > 0 && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                      <span className="text-[10px] font-bold opacity-50">Repeat for</span>
                      <select 
                        value={newEvent.repeatCount}
                        onChange={e => setNewEvent({...newEvent, repeatCount: parseInt(e.target.value)})}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none"
                      >
                        {[1, 2, 4, 8, 12].map(n => (
                          <option key={n} value={n} className="bg-slate-800">{n} {n === 1 ? 'week' : 'weeks'}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 px-4 glass hover:bg-white/20 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddEvent}
                  className="flex-[2] py-3 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
                >
                  Create Event
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Preferences Modal --- */}
      <AnimatePresence>
        {isPrefsOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrefsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass-panel p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Preferences</h2>
                <button onClick={() => setIsPrefsOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Dark Mode</p>
                    <p className="text-[10px] opacity-50">Switch between light and dark themes</p>
                  </div>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      isDarkMode ? "bg-indigo-500" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      isDarkMode ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Notifications</p>
                    <p className="text-[10px] opacity-50">Receive alerts for upcoming classes</p>
                  </div>
                  <button 
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      notificationsEnabled ? "bg-indigo-500" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      notificationsEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Accent Color</p>
                  <div className="flex gap-3">
                    {['indigo', 'emerald', 'amber', 'rose'].map(color => (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          accentColor === color ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-100",
                          color === 'indigo' ? 'bg-indigo-500' :
                          color === 'emerald' ? 'bg-emerald-500' :
                          color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsPrefsOpen(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}
