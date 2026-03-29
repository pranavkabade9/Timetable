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
  <>
    <div className="mesh-gradient" />
  </>
);

const CircularProgress = ({ value, color, label, icon: Icon }: any) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
            className="text-white/5"
          />
          <motion.circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 12px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-6 h-6 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ color }} />
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold text-white/70">{label}</p>
        <p className="text-sm font-black tracking-tight text-white">{value}%</p>
      </div>
    </div>
  );
};

const NotificationTicker = () => {
  const alerts = [
    "Mechanical Lab starts in 30 minutes",
    "New timetable update available",
    "Exam schedule released",
    "Final Exam Schedule Released",
    "Library hours extended for finals week",
    "New research grant opportunities available",
    "Guest lecture on Quantum Computing tomorrow at 2 PM",
    "Campus-wide maintenance scheduled for Sunday"
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-10 glass-panel border-t border-white/10 rounded-none flex items-center z-50 bg-black/40 backdrop-blur-xl">
      <div className="marquee">
        <div className="marquee-content gap-12 px-12">
          {[...alerts, ...alerts].map((alert, i) => (
            <div key={i} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-white/80">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
              {alert}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
    <div className="glass-status px-3 py-1.5 flex flex-col items-end transition-all duration-300 hover:bg-white/15 hover:-translate-y-[1px] cursor-default select-none">
      <div className="flex items-center gap-1.5">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          isWorkingHours ? "bg-emerald-500" : "bg-rose-500"
        )} />
        <span className="text-[16px] font-semibold tracking-tight text-white leading-tight">
          {format(now, 'h:mm a')}
        </span>
      </div>
      <span className="text-[12px] font-normal text-white/70 leading-tight">
        {format(now, 'EEE, MMM d')}
      </span>
    </div>
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
    if (saved) return JSON.parse(saved);
    
    // Realistic Test Data
    const baseDate = new Date(2026, 2, 29); // Sunday March 29
    const getDayDate = (offset: number) => format(addDays(baseDate, offset), 'yyyy-MM-dd');
    
    return [
      { id: '1', subject: 'Thermodynamics', faculty: 'Dr. Smith', room: 'L-101', type: 'lecture', startTime: '10:00', endTime: '11:00', date: getDayDate(2) },
      { id: '2', subject: 'Mechanical Lab', faculty: 'Prof. Johnson', room: 'Lab-A', type: 'lab', startTime: '12:00', endTime: '14:00', date: getDayDate(3) },
      { id: '3', subject: 'Fluid Mechanics', faculty: 'Dr. Brown', room: 'L-202', type: 'lecture', startTime: '09:00', endTime: '10:00', date: getDayDate(4) },
      { id: '4', subject: 'Workshop Practice', faculty: 'Mr. Wilson', room: 'Workshop', type: 'lab', startTime: '14:00', endTime: '16:00', date: getDayDate(5) },
      { id: '5', subject: 'Mathematics', faculty: 'Dr. Lee', room: 'L-303', type: 'lecture', startTime: '11:00', endTime: '12:00', date: getDayDate(6) },
      { id: '6', subject: 'Heat Transfer', faculty: 'Dr. Smith', room: 'L-101', type: 'lecture', startTime: '14:00', endTime: '15:00', date: getDayDate(2) },
      { id: '7', subject: 'CAD Lab', faculty: 'Prof. Garcia', room: 'Comp-Lab', type: 'lab', startTime: '11:00', endTime: '13:00', date: getDayDate(4) },
      { id: '8', subject: 'Dynamics of Machines', faculty: 'Dr. Brown', room: 'L-202', type: 'lecture', startTime: '09:00', endTime: '10:00', date: getDayDate(3) },
      { id: '9', subject: 'Engineering Ethics', faculty: 'Prof. Davis', room: 'L-404', type: 'lecture', startTime: '10:00', endTime: '11:00', date: getDayDate(5) },
      { id: '10', subject: 'Project Work', faculty: 'Dr. Lee', room: 'Project-Room', type: 'lab', startTime: '14:00', endTime: '17:00', date: getDayDate(6) },
      { id: '11', subject: 'Material Science', faculty: 'Dr. Smith', room: 'L-101', type: 'lecture', startTime: '11:00', endTime: '12:00', date: getDayDate(2) },
      { id: '12', subject: 'Strength of Materials', faculty: 'Prof. Johnson', room: 'L-202', type: 'lecture', startTime: '11:00', endTime: '12:00', date: getDayDate(3) },
    ];
  });

  const [activities, setActivities] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('activities');
    if (saved) return JSON.parse(saved).map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) }));
    
    return [
      { id: 'a1', type: 'added', description: 'Added Thermodynamics class', timestamp: new Date(Date.now() - 1000 * 60 * 10), itemId: '1' },
      { id: 'a2', type: 'edited', description: 'Updated Mechanical Lab timing', timestamp: new Date(Date.now() - 1000 * 60 * 45), itemId: '2' },
      { id: 'a3', type: 'deleted', description: 'Deleted Mathematics lecture', timestamp: new Date(Date.now() - 1000 * 60 * 120), itemId: '5' },
      { id: 'a4', type: 'restored', description: 'Restored Fluid Mechanics event', timestamp: new Date(Date.now() - 1000 * 60 * 300), itemId: '3' },
    ];
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
    document.body.classList.toggle('light', !isDarkMode);
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
      <NotificationTicker />
      
      {/* --- Header --- */}
      <header className="fixed top-0 left-0 right-0 h-16 md:h-20 px-4 md:px-8 flex items-center justify-between z-40 glass-panel border-b border-white/10 bg-black/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 glass-card p-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30">
            <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
          </div>
          <div>
            <h1 className="text-sm md:text-lg font-bold tracking-tight truncate max-w-[120px] md:max-w-none text-white">Academic Time Table</h1>
            <p className="text-[8px] md:text-[10px] opacity-70 uppercase tracking-widest font-black text-indigo-300 hidden md:block">Academic Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <TimeWidget />
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-8 h-8 md:w-10 md:h-10 glass-card p-0 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
          >
            {isDarkMode ? <Sun className="w-4 h-4 md:w-5 md:h-5 text-amber-400" /> : <Moon className="w-4 h-4 md:w-5 md:h-5 text-indigo-300" />}
          </button>

          <button 
            onClick={() => setIsPanelOpen(true)}
            className="w-8 h-8 md:w-10 md:h-10 glass-card p-0 flex items-center justify-center hover:bg-white/20 transition-all relative active:scale-90"
          >
            <History className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
            {activities.length > 0 && (
              <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-1.5 h-1.5 md:w-2 md:h-2 bg-indigo-500 rounded-full border-2 border-white/40 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            )}
          </button>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="pt-20 md:pt-28 pb-20 md:pb-12 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 h-screen md:h-[calc(100vh-2rem)]">
        {/* Left Sidebar / Controls - Hidden on mobile, replaced by bottom nav */}
        <div className="hidden lg:block lg:col-span-3 space-y-6">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="glass-panel bg-black/20 p-6 space-y-8 h-full"
          >
            <div className="flex justify-around items-center py-4 border-b border-white/10">
              <CircularProgress 
                value={Math.min(100, Math.max(0, Math.round(((new Date().getHours() * 60 + new Date().getMinutes()) - (9 * 60)) / (8 * 60) * 100)))} 
                color="var(--color-neon-cyan)" 
                label="Day Progress" 
                icon={Clock}
              />
              <CircularProgress 
                value={Math.min(100, Math.round((activeEvents.length / 25) * 100))} 
                color="var(--color-neon-magenta)" 
                label="Weekly Load" 
                icon={LayoutDashboard}
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold opacity-60 uppercase tracking-widest">Quick Actions</h2>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="w-full py-3 px-4 bg-gradient-to-br from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/40 font-bold uppercase tracking-wider text-xs active:scale-95"
              >
                <Plus className="w-4 h-4 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
                <span className="drop-shadow-sm">Add New Event</span>
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <h2 className="text-sm font-semibold opacity-60 uppercase tracking-widest">Navigation</h2>
              <nav className="space-y-2">
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
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all relative group",
                      item.active ? "text-cyan-400" : "opacity-60 hover:opacity-100 hover:bg-white/5"
                    )}
                  >
                    {item.active && (
                      <motion.div 
                        layoutId="active-pill"
                        className="absolute inset-0 bg-white/10 border-l-2 border-cyan-400 rounded-xl -z-10"
                      />
                    )}
                    <item.icon className={cn("w-4 h-4", item.active && "drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]")} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </motion.div>
        </div>

        {/* Center Content */}
        <div className="lg:col-span-9 overflow-hidden flex flex-col gap-4 md:gap-6">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-panel bg-white/[0.03] flex-1 overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02]">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">Weekly Timetable</h2>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
                  <p className="text-[10px] md:text-xs font-medium text-white/50">Tue – Sat • 9:00 AM – 5:00 PM</p>
                  <div className="hidden md:block h-3 w-[1px] bg-white/10" />
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
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full glass text-[8px] md:text-[10px] uppercase font-bold tracking-tighter opacity-70">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Lecture
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full glass text-[8px] md:text-[10px] uppercase font-bold tracking-tighter opacity-70">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Lab
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2 md:p-4 custom-scrollbar">
              <div className="min-w-[700px] md:min-w-[800px]">
                <div className="grid grid-cols-[80px_repeat(5,1fr)] md:grid-cols-[100px_repeat(5,1fr)] border border-white/10 rounded-xl overflow-hidden glass">
                  {/* Header */}
                  <div className="bg-white/5 p-2 md:p-4 border-b border-r border-white/10 font-bold text-[8px] md:text-[10px] uppercase opacity-50">Time</div>
                  {['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <div key={day} className="bg-white/5 p-2 md:p-4 border-b border-r border-white/10 font-bold text-[8px] md:text-[10px] uppercase opacity-50 text-center">
                      <span className="hidden md:inline">{day}</span>
                      <span className="md:hidden">{day.substring(0, 3)}</span>
                    </div>
                  ))}
                  
                  {/* Rows */}
                  {Array.from({ length: 9 }, (_, i) => i + 9).map(hour => (
                    <React.Fragment key={hour}>
                      <div className="p-2 md:p-4 border-b border-r border-white/10 text-[8px] md:text-[10px] font-bold opacity-40 flex items-center justify-center">
                        {format(setHours(new Date(), hour), 'h a')}
                      </div>
                      {['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                        const dayEvents = activeEvents.filter(e => {
                          const eventDate = parseISO(e.date);
                          const eventDayName = format(eventDate, 'EEEE');
                          const eventHour = parseInt(e.startTime.split(':')[0]);
                          return eventDayName === day && eventHour === hour;
                        });
                        
                        const isCurrentSlot = format(new Date(), 'EEEE') === day && new Date().getHours() === hour;
                        
                        return (
                          <div 
                            key={day} 
                            className={cn(
                              "p-1 border-b border-r border-white/10 min-h-[80px] md:min-h-[100px] bg-white/[0.01] transition-all duration-300 hover:bg-white/[0.05] group/cell relative",
                              isCurrentSlot && "active-slot bg-cyan-500/10"
                            )}
                          >
                            <div className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-cyan-500/5 to-transparent" />
                            {dayEvents.map(event => (
                              <div key={event.id} className={cn(
                                "p-1.5 md:p-2 rounded-lg text-[8px] md:text-[10px] font-medium mb-1 shadow-md border animate-in fade-in zoom-in-95 duration-300 relative z-10",
                                event.type === 'lecture' ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' :
                                'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                              )}>
                                <div className="font-bold truncate text-xs md:text-sm mb-0.5 text-white">{event.subject}</div>
                                <div className="opacity-90 flex items-center gap-1 mb-0.5 truncate text-white/80">
                                  <span className="opacity-50 hidden md:inline">Prof.</span> {event.faculty}
                                </div>
                                <div className="opacity-90 flex items-center gap-1 mb-1 truncate text-white/80">
                                  <span className="opacity-50 hidden md:inline">Room</span> {event.room}
                                </div>
                                <div className="flex items-center justify-between mt-1 md:mt-2 pt-1 border-t border-white/10">
                                  <span className="font-bold uppercase tracking-tighter text-[7px] md:text-[8px] text-white/60">
                                    {event.type === 'lecture' ? '📘' : '🧪'} <span className="hidden md:inline">{event.type === 'lecture' ? 'Lecture' : 'Lab'}</span>
                                  </span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      softDeleteEvent(event.id);
                                    }}
                                    className="delete-event opacity-40 hover:opacity-100 transition-opacity text-rose-400 font-bold uppercase text-[7px] md:text-[8px] px-1.5 py-0.5 hover:bg-rose-500/20 rounded"
                                    data-id={event.id}
                                  >
                                    Del
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

      {/* --- Mobile Bottom Navigation --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 glass-panel rounded-none border-t border-white/10 z-40 flex items-center justify-around px-4">
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 -translate-y-4"
        >
          <Plus className="w-6 h-6" />
        </button>
        <button 
          onClick={() => {
            if (Notification.permission !== "granted") {
              Notification.requestPermission().then(p => {
                if (p === "granted") setNotificationsEnabled(true);
              });
            } else {
              setNotificationsEnabled(!notificationsEnabled);
            }
          }}
          className={cn(
            "flex flex-col items-center gap-1",
            notificationsEnabled ? "text-indigo-500" : "opacity-40"
          )}
        >
          <Bell className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase">Alerts</span>
        </button>
        <button 
          onClick={() => setIsPrefsOpen(true)}
          className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase">Settings</span>
        </button>
      </div>

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
              className="fixed top-0 right-0 bottom-0 w-full md:max-w-md glass-panel rounded-none border-l border-white/20 z-50 flex flex-col"
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
              className="relative w-full max-w-lg glass-panel p-4 md:p-8 space-y-4 md:space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Schedule Event</h2>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="flex flex-col md:flex-row gap-2 md:gap-4 p-1 bg-white/5 rounded-xl border border-white/10">
                    <button 
                      onClick={() => setNewEvent({...newEvent, type: 'lecture'})}
                      className={cn(
                        "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                        newEvent.type === 'lecture' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "opacity-50 hover:opacity-100"
                      )}
                    >
                      📘 Lecture
                    </button>
                    <button 
                      onClick={() => setNewEvent({...newEvent, type: 'lab'})}
                      className={cn(
                        "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                        newEvent.type === 'lab' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "opacity-50 hover:opacity-100"
                      )}
                    >
                      🧪 Lab
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Start</label>
                    <input 
                      type="time" 
                      value={newEvent.startTime}
                      onChange={e => setNewEvent({...newEvent, startTime: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">End</label>
                    <input 
                      type="time" 
                      value={newEvent.endTime}
                      onChange={e => setNewEvent({...newEvent, endTime: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Date</label>
                  <input 
                    type="date" 
                    value={newEvent.date}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none h-11"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Multi-Event Repeat (Optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map(day => (
                      <button 
                        key={day}
                        onClick={() => {
                          const exists = newEvent.repeatDays.includes(day);
                          setNewEvent({
                            ...newEvent,
                            repeatDays: exists 
                              ? newEvent.repeatDays.filter(d => d !== day)
                              : [...newEvent.repeatDays, day]
                          });
                        }}
                        className={cn(
                          "w-9 h-9 md:w-10 md:h-10 rounded-lg text-[10px] font-bold border transition-all",
                          newEvent.repeatDays.includes(day) 
                            ? "bg-indigo-500 border-indigo-500 text-white" 
                            : "border-white/10 opacity-40 hover:opacity-100"
                        )}
                      >
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day-1]}
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

                <div className="pt-4 flex flex-col md:flex-row gap-3">
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 px-4 glass hover:bg-white/20 transition-all text-sm font-medium h-12"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddEvent}
                    className="flex-[2] py-3 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 h-12"
                  >
                    Create Event
                  </button>
                </div>
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
              className="relative w-full max-w-md glass-panel p-6 md:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Preferences</h2>
                <button onClick={() => setIsPrefsOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 glass rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Notifications</p>
                      <p className="text-[10px] opacity-50">Alerts for upcoming classes</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={cn(
                      "w-12 h-6 rounded-full p-1 transition-all relative",
                      notificationsEnabled ? "bg-indigo-500" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      notificationsEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 ml-1">Accent Color</label>
                  <div className="grid grid-cols-4 gap-3">
                    {['indigo', 'emerald', 'amber', 'rose'].map(color => (
                      <button 
                        key={color}
                        onClick={() => setAccentColor(color)}
                        className={cn(
                          "h-12 rounded-xl border-2 transition-all flex items-center justify-center",
                          accentColor === color ? "border-white" : "border-transparent opacity-40 hover:opacity-100"
                        )}
                        style={{ backgroundColor: color === 'indigo' ? '#6366f1' : color === 'emerald' ? '#10b981' : color === 'amber' ? '#f59e0b' : '#f43f5e' }}
                      >
                        {accentColor === color && <div className="w-2 h-2 bg-white rounded-full" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <button 
                    onClick={() => setIsPrefsOpen(false)}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all h-12"
                  >
                    Done
                  </button>
                </div>
              </div>
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
