"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { initializeAnalytics, trackGoal } from "./analytics";
import {
  localDateKey,
  migrateLegacyWeeks,
  startOfLocalWeek,
  storedTaskCalendar,
  type TaskCalendar,
} from "./taskCalendar";

type DayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type WeekId = "current" | "next";
type BackgroundTheme = "lake" | "balloon" | "custom";

type Task = {
  id: number;
  title: string;
  description: string;
  important: boolean;
  completed: boolean;
};

type DayMeta = { id: DayId; short: string; full: string };
type CalendarDay = DayMeta & { date: string; dateKey: string };
type FeedbackStatus = "idle" | "sending" | "success" | "error";

const feedbackEndpoint = "https://functions.yandexcloud.net/d4e8f0eiq0gipgc3agkp";

const dayMeta: DayMeta[] = [
  { id: "mon", short: "Пн", full: "Понедельник" },
  { id: "tue", short: "Вт", full: "Вторник" },
  { id: "wed", short: "Ср", full: "Среда" },
  { id: "thu", short: "Чт", full: "Четверг" },
  { id: "fri", short: "Пт", full: "Пятница" },
  { id: "sat", short: "Сб", full: "Суббота" },
  { id: "sun", short: "Вс", full: "Воскресенье" },
];

const monthNames = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function startOfWeek(date: Date) {
  return startOfLocalWeek(date);
}

function dateLabel(date: Date) {
  return `${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function daysForWeek(date: Date, weekId: WeekId): CalendarDay[] {
  const monday = startOfWeek(date);
  if (weekId === "next") monday.setDate(monday.getDate() + 7);

  return dayMeta.map((day, index) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + index);
    return { ...day, date: dateLabel(dayDate), dateKey: localDateKey(dayDate) };
  });
}

const legacyTaskStorageKey = "seven-weeks-v1";
const taskStorageKey = "seven-tasks-by-date-v2";

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (!a.completed && a.important !== b.important) return Number(b.important) - Number(a.important);
    return 0;
  });
}

function numberTasks(tasks: Task[]) {
  let activeNumber = 0;
  let completedNumber = 0;

  return sortTasks(tasks).map((task) => ({
    task,
    number: task.completed ? ++completedNumber : ++activeNumber,
  }));
}

function dayIdForDate(date: Date): DayId {
  const days: DayId[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[date.getDay()];
}

const builtInBackgrounds: Record<Exclude<BackgroundTheme, "custom">, string> = {
  lake: "images/seven-karelia-forest-mist-night-v1.png",
  balloon: "images/seven-bliss-night-3840x2160.jpg",
};

function ImportantIcon({ className = "", label }: { className?: string; label?: string }) {
  const gradientId = useId();

  return (
    <svg
      className={`importance-dot ${className}`.trim()}
      viewBox="0 0 24 24"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="6" y1="3" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe063" />
          <stop offset="0.52" stopColor="#ffb52e" />
          <stop offset="1" stopColor="#ed781d" />
        </linearGradient>
      </defs>
      <path
        d="M14.35 1.05 4.8 13.1c-.55.7-.02 1.7.86 1.62l5.85-.54-1.75 8.72c-.2.97 1.08 1.48 1.58.63l7.85-13.34c.42-.72-.2-1.6-1.02-1.48l-5.18.76 2.82-7.49c.36-.94-.84-1.72-1.46-.93Z"
        fill={`url(#${gradientId})`}
        stroke="#d86d18"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      <path
        d="M14.35 1.05 4.8 13.1c-.55.7-.02 1.7.86 1.62l5.85-.54c.63-.06 1.12.54.93 1.14l-2.68 7.57c-.2.97 1.08 1.48 1.58.63l1.85-9.08c.18-.87-.54-1.66-1.42-1.55l-5.42.69 9.46-11.6c.36-.94-.84-1.72-1.46-.93Z"
        fill="#f39824"
        opacity="0.82"
      />
    </svg>
  );
}

function CompleteIcon() {
  const gradientId = useId();

  return (
    <svg className="quick-action-check" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="5" y1="5" x2="18" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8ed59a" />
          <stop offset="0.52" stopColor="#59ad70" />
          <stop offset="1" stopColor="#398553" />
        </linearGradient>
      </defs>
      <path
        d="m3.6 12.15 4.65 4.75L20.5 4.8l-2.45-2.2-9.8 9.65-2.35-2.4-2.3 2.3Z"
        fill={`url(#${gradientId})`}
        stroke="#397c4d"
        strokeWidth="1.05"
        strokeLinejoin="round"
        strokeLinecap="round"
        transform="translate(-1.2 1.2) scale(1.1)"
      />
      <path
        d="m3.6 12.15 4.65 4.75 1.65-1.63-4-4.08-2.3.96Z"
        fill="#4d9861"
        opacity="0.72"
        transform="translate(-1.2 1.2) scale(1.1)"
      />
    </svg>
  );
}

function EditIcon() {
  const gradientId = useId();

  return (
    <svg className="quick-action-styled-icon" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="7" y1="18" x2="18" y2="5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#38576b" />
          <stop offset="0.5" stopColor="#587b91" />
          <stop offset="1" stopColor="#86a4b5" />
        </linearGradient>
      </defs>
      <path
        d="M5.15 16.15 15.8 5.5c.72-.72 1.9-.72 2.62 0l.1.1c.72.72.72 1.9 0 2.62L7.87 18.87l-4.02 1.28 1.3-4Z"
        fill={`url(#${gradientId})`}
        stroke="#294759"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      <path d="m5.15 16.15 2.72 2.72-4.02 1.28 1.3-4Z" fill="#d9bd84" stroke="#294759" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="m3.85 20.15.47-1.47.98.99-1.45.48Z" fill="#294759" />
      <path d="m15.8 5.5 2.72 2.72-1.36 1.36-2.72-2.72 1.36-1.36Z" fill="#9bb5c3" opacity="0.8" />
    </svg>
  );
}

function DeleteIcon() {
  const gradientId = useId();
  const crossPath = "M5.4 5.4 18.6 18.6M18.6 5.4 5.4 18.6";

  return (
    <svg className="quick-action-styled-icon" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="6" y1="5" x2="18" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f0796f" />
          <stop offset="0.52" stopColor="#dc4f48" />
          <stop offset="1" stopColor="#b93135" />
        </linearGradient>
      </defs>
      <path d={crossPath} fill="none" stroke="#9f2f33" strokeWidth="5.2" strokeLinecap="round" />
      <path d={crossPath} fill="none" stroke={`url(#${gradientId})`} strokeWidth="3.35" strokeLinecap="round" />
    </svg>
  );
}

function BulbIcon() {
  const glassGradientId = useId();
  const baseGradientId = useId();

  return (
    <svg className="drag-toast-bulb" viewBox="0 0 30 38" aria-hidden="true">
      <defs>
        <linearGradient id={glassGradientId} x1="8" y1="4" x2="22" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff0a5" />
          <stop offset="0.5" stopColor="#ffd263" />
          <stop offset="1" stopColor="#f5a92f" />
        </linearGradient>
        <linearGradient id={baseGradientId} x1="9" y1="27" x2="20" y2="37" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8ca2ad" />
          <stop offset="0.5" stopColor="#607c8b" />
          <stop offset="1" stopColor="#3e5d6d" />
        </linearGradient>
      </defs>
      <path
        d="M15 1.6C7.65 1.6 2.25 7.08 2.25 14.05c0 4.36 2.24 7.23 5.2 9.9 1.16 1.04 1.72 2.08 1.78 3.35h11.54c.06-1.27.62-2.31 1.78-3.35 2.96-2.67 5.2-5.54 5.2-9.9C27.75 7.08 22.35 1.6 15 1.6Z"
        fill={`url(#${glassGradientId})`}
        stroke="#d99a34"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <ellipse cx="19.8" cy="8" rx="3.35" ry="4.05" fill="#fff4bb" opacity="0.82" />
      <path d="m9.9 15.1 5.1 5.05 5.1-5.05M15 20.15v7.05" fill="none" stroke="#c98226" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M8 27h14v7.15c0 1.5-1.2 2.7-2.7 2.7h-8.6A2.7 2.7 0 0 1 8 34.15V27Z"
        fill={`url(#${baseGradientId})`}
        stroke="#314c5c"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M8 30.25h14M8 33.45h14" fill="none" stroke="#365565" strokeWidth="1.15" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="developer-contact-icon" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <mask id="seven-send-shape">
          <rect width="24" height="24" fill="black" />
          <path d="M2.75 10.95 20.1 3.25c1.02-.45 2.1.42 1.88 1.51l-3.16 15.57c-.2.98-1.34 1.41-2.14.82l-6.1-4.5-3 2.7c-.58.52-1.51.11-1.51-.67v-3.73l-1.56-.73c-.84-.39-1.7-.96-2.28-1.68-.35-.44-.42-1.03-.16-1.52.14-.27.38-.48.68-.61Z" fill="white" />
          <path d="m7.95 14.45 8.98-7.19c.46-.37 1.04.23.67.69l-6.97 8.62-2.68-2.12Z" fill="black" />
        </mask>
      </defs>
      <rect width="24" height="24" fill="currentColor" mask="url(#seven-send-shape)" />
    </svg>
  );
}

function BroomIcon() {
  return (
    <svg className="clear-week-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.1 9.55 16.86 3a1.72 1.72 0 0 1 3.17 1.33l-2.2 5.22h.48c.9 0 1.71.51 2.11 1.32l.74 1.5H5.62l1.25-1.72a2.66 2.66 0 0 1 2.15-1.1h5.08Z" fill="currentColor" />
      <path d="M6.06 13.3h14.52l.95 7.05h-3.7l-.42-1.74-.41 1.74H8.55l-.42-1.74-.42 1.74H3.94c.38-2.5 1.08-4.85 2.12-7.05Z" fill="currentColor" />
    </svg>
  );
}

function ScrollableTaskList({ children, layoutKey }: { children: React.ReactNode; layoutKey: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollbar, setScrollbar] = useState({ visible: false, height: 0, top: 0 });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const fitListAboveButton = () => {
      const panel = list.closest<HTMLElement>(".day-panel");
      const header = panel?.querySelector<HTMLElement>(".day-header");
      const addButton = panel?.querySelector<HTMLElement>(".add-task");
      if (!panel || !header || !addButton) return;

      const panelStyle = window.getComputedStyle(panel);
      const panelTop = panel.getBoundingClientRect().top;
      const viewportLimit = window.innerHeight - panelTop - 36;
      const cssMaxHeight = Number.parseFloat(panelStyle.maxHeight);
      const panelLimit = Number.isFinite(cssMaxHeight) ? Math.min(viewportLimit, cssMaxHeight) : viewportLimit;
      const gap = Number.parseFloat(panelStyle.rowGap || panelStyle.gap) || 0;
      const verticalPadding = (Number.parseFloat(panelStyle.paddingTop) || 0) + (Number.parseFloat(panelStyle.paddingBottom) || 0);
      const available = panelLimit - header.offsetHeight - addButton.offsetHeight - verticalPadding - gap * 2;

      list.style.maxHeight = `${Math.max(84, available)}px`;
    };

    const updateScrollbar = () => {
      const visible = list.scrollHeight > list.clientHeight + 1;
      if (!visible) {
        setScrollbar((current) => current.visible ? { visible: false, height: 0, top: 0 } : current);
        return;
      }

      const trackHeight = Math.max(0, list.clientHeight - 6);
      const height = Math.max(36, trackHeight * (list.clientHeight / list.scrollHeight));
      const travel = Math.max(0, trackHeight - height);
      const scrollRange = Math.max(1, list.scrollHeight - list.clientHeight);
      const top = 3 + travel * (list.scrollTop / scrollRange);

      setScrollbar((current) => (
        current.visible && Math.abs(current.height - height) < .5 && Math.abs(current.top - top) < .5
          ? current
          : { visible: true, height, top }
      ));
    };

    const updateLayout = () => {
      fitListAboveButton();
      updateScrollbar();
    };

    list.addEventListener("scroll", updateScrollbar, { passive: true });
    window.addEventListener("resize", updateLayout);
    updateLayout();

    return () => {
      list.removeEventListener("scroll", updateScrollbar);
      window.removeEventListener("resize", updateLayout);
    };
  }, [layoutKey]);

  return (
    <div className="task-list-shell">
      <div className="task-list" ref={listRef}>{children}</div>
      {scrollbar.visible && (
        <span className="custom-scrollbar" aria-hidden="true">
          <span className="custom-scrollbar-thumb" style={{ height: `${scrollbar.height}px`, transform: `translateY(${scrollbar.top}px)` }} />
        </span>
      )}
    </div>
  );
}

export default function SevenPrototype() {
  const [tasksByDate, setTasksByDate] = useState<TaskCalendar<Task>>({});
  const [weekId, setWeekId] = useState<WeekId>("current");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>("lake");
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const [backgroundMenuOpen, setBackgroundMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>("idle");
  const [feedbackStatusText, setFeedbackStatusText] = useState("");
  const [backgroundError, setBackgroundError] = useState("");
  const [welcome, setWelcome] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [dragToast, setDragToast] = useState(false);
  const [neverWelcome, setNeverWelcome] = useState(false);
  const [editor, setEditor] = useState<{ dateKey: string; task?: Task } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ dateKey: string; task: Task } | null>(null);
  const [clearWeekOpen, setClearWeekOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [important, setImportant] = useState(false);
  const [dragged, setDragged] = useState<{ dateKey: string; taskId: number } | null>(null);
  const weekHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragToastTimer = useRef<number | null>(null);
  const backgroundFileRef = useRef<HTMLInputElement>(null);
  const backgroundSettingsRef = useRef<HTMLDivElement>(null);

  const openFeedback = () => {
    setFeedbackStatus("idle");
    setFeedbackStatusText("");
    setFeedbackOpen(true);
  };

  const closeFeedback = () => {
    if (feedbackStatus === "sending") return;
    setFeedbackStatus("idle");
    setFeedbackStatusText("");
    setFeedbackOpen(false);
  };

  const sendFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const message = feedbackText.trim();
    if (!message || feedbackStatus === "sending") return;

    setFeedbackStatus("sending");
    setFeedbackStatusText("Отправляем обращение…");

    try {
      const response = await fetch(feedbackEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: feedbackName.trim(),
          message,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Не удалось отправить обращение");
      }

      setFeedbackName("");
      setFeedbackText("");
      setFeedbackStatus("success");
      setFeedbackStatusText("Спасибо! Обращение отправлено разработчику.");
      trackGoal("feedback_sent");
    } catch {
      setFeedbackStatus("error");
      setFeedbackStatusText("Не удалось отправить. Проверь интернет и попробуй ещё раз.");
    }
  };

  useEffect(() => {
    initializeAnalytics();

    const updateCalendarDate = () => setCalendarDate(new Date());
    updateCalendarDate();
    const calendarTimer = window.setInterval(updateCalendarDate, 60_000);

    const welcomeDismissed = window.localStorage.getItem("seven-welcome-dismissed") === "yes";
    const savedCalendar = storedTaskCalendar<Task>(window.localStorage.getItem(taskStorageKey));
    const migratedCalendar = savedCalendar
      ? null
      : migrateLegacyWeeks<Task>(window.localStorage.getItem(legacyTaskStorageKey), new Date());
    const savedBackgroundTheme = window.localStorage.getItem("seven-background-theme");
    const savedCustomBackground = window.localStorage.getItem("seven-custom-background");
    const initTimer = window.setTimeout(() => {
      if (savedCalendar) setTasksByDate(savedCalendar);
      else if (migratedCalendar) setTasksByDate(migratedCalendar);
      if (savedCustomBackground) setCustomBackground(savedCustomBackground);
      if (savedBackgroundTheme === "custom" && savedCustomBackground) {
        setBackgroundTheme("custom");
      } else if (savedBackgroundTheme === "balloon") {
        setBackgroundTheme("balloon");
      }
      if (!welcomeDismissed) setWelcome(true);
      setInitialized(true);
    }, 0);

    return () => {
      window.clearInterval(calendarTimer);
      window.clearTimeout(initTimer);
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    window.localStorage.setItem(taskStorageKey, JSON.stringify(tasksByDate));
  }, [initialized, tasksByDate]);

  useEffect(() => {
    if (!backgroundMenuOpen) return;

    const closeMenu = (event: PointerEvent) => {
      if (!backgroundSettingsRef.current?.contains(event.target as Node)) setBackgroundMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBackgroundMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [backgroundMenuOpen]);

  useEffect(() => {
    if (!initialized || welcome || window.localStorage.getItem("seven-drag-toast-v16-seen") === "yes") return;

    dragToastTimer.current = window.setTimeout(() => {
      setDragToast(true);
      window.localStorage.setItem("seven-drag-toast-v16-seen", "yes");
      dragToastTimer.current = null;
    }, 2000);

    return () => {
      if (dragToastTimer.current) window.clearTimeout(dragToastTimer.current);
      dragToastTimer.current = null;
    };
  }, [initialized, welcome]);

  const displayDays = useMemo(() => daysForWeek(calendarDate, weekId), [calendarDate, weekId]);
  const todayDayId = dayIdForDate(calendarDate);
  const allTasks = useMemo(
    () => displayDays.flatMap((day) => tasksByDate[day.dateKey] ?? []),
    [displayDays, tasksByDate],
  );
  const completedCount = allTasks.filter((task) => task.completed).length;
  const progress = allTasks.length ? Math.round((completedCount / allTasks.length) * 100) : 0;

  const closeWelcome = () => {
    if (neverWelcome) window.localStorage.setItem("seven-welcome-dismissed", "yes");
    setWelcome(false);
  };

  const openEditor = (dateKey: string, task?: Task) => {
    setEditor({ dateKey, task });
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setImportant(task?.important ?? false);
  };

  const saveTask = (event: FormEvent) => {
    event.preventDefault();
    if (!editor || !title.trim()) return;
    const isNewTask = !editor.task;
    setTasksByDate((current) => {
      const tasks = [...(current[editor.dateKey] ?? [])];
      if (editor.task) {
        const index = tasks.findIndex((task) => task.id === editor.task?.id);
        tasks[index] = { ...tasks[index], title: title.trim(), description: description.trim(), important };
      } else {
        tasks.push({ id: Date.now(), title: title.trim(), description: description.trim(), important, completed: false });
      }
      return { ...current, [editor.dateKey]: tasks };
    });
    if (isNewTask) trackGoal("task_created");
    setEditor(null);
  };

  const updateTask = (dateKey: string, taskId: number, update: (task: Task) => Task) => {
    setTasksByDate((current) => ({
      ...current,
      [dateKey]: (current[dateKey] ?? []).map((task) => (task.id === taskId ? update(task) : task)),
    }));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setTasksByDate((current) => ({
      ...current,
      [deleteTarget.dateKey]: (current[deleteTarget.dateKey] ?? []).filter((task) => task.id !== deleteTarget.task.id),
    }));
    setDeleteTarget(null);
  };

  const confirmClearWeek = () => {
    setTasksByDate((current) => {
      const clearedCalendar = { ...current };
      displayDays.forEach((day) => delete clearedCalendar[day.dateKey]);
      window.localStorage.setItem(taskStorageKey, JSON.stringify(clearedCalendar));
      return clearedCalendar;
    });
    setClearWeekOpen(false);
  };

  const dropOnDay = (targetDateKey: string) => {
    if (!dragged) return;
    const task = (tasksByDate[dragged.dateKey] ?? []).find((item) => item.id === dragged.taskId);
    if (!task || task.completed) return;
    setTasksByDate((current) => {
      const sourceTasks = (current[dragged.dateKey] ?? []).filter((item) => item.id !== dragged.taskId);
      const targetTasks = dragged.dateKey === targetDateKey
        ? sourceTasks
        : [...(current[targetDateKey] ?? [])];
      return {
        ...current,
        [dragged.dateKey]: sourceTasks,
        [targetDateKey]: [...targetTasks, task],
      };
    });
    setDragged(null);
  };

  const hoverWeek = (target: WeekId) => {
    if (!dragged || target === weekId || weekHoverTimer.current) return;
    weekHoverTimer.current = setTimeout(() => {
      setWeekId(target);
      weekHoverTimer.current = null;
    }, 500);
  };

  const cancelWeekHover = () => {
    if (weekHoverTimer.current) clearTimeout(weekHoverTimer.current);
    weekHoverTimer.current = null;
  };

  const dismissDragToast = () => {
    if (dragToastTimer.current) window.clearTimeout(dragToastTimer.current);
    dragToastTimer.current = null;
    setDragToast(false);
  };

  const cycleBuiltInBackground = () => {
    const nextTheme: Exclude<BackgroundTheme, "custom"> = backgroundTheme === "lake" ? "balloon" : "lake";
    setBackgroundTheme(nextTheme);
    setBackgroundError("");
    setBackgroundMenuOpen(false);
    window.localStorage.setItem("seven-background-theme", nextTheme);
  };

  const uploadCustomBackground = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBackgroundError("Выбери файл с изображением");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setBackgroundError("Изображение должно быть меньше 20 МБ");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const maxWidth = 2400;
      const maxHeight = 1600;
      const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        setBackgroundError("Не удалось обработать изображение");
        URL.revokeObjectURL(objectUrl);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", .84);
      URL.revokeObjectURL(objectUrl);

      try {
        window.localStorage.setItem("seven-custom-background", dataUrl);
        window.localStorage.setItem("seven-background-theme", "custom");
        setCustomBackground(dataUrl);
        setBackgroundTheme("custom");
        setBackgroundError("");
        setBackgroundMenuOpen(false);
      } catch {
        setBackgroundError("Файл слишком большой — выбери изображение поменьше");
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setBackgroundError("Не удалось открыть изображение");
    };
    image.src = objectUrl;
  };

  const backgroundUrl = backgroundTheme === "custom" && customBackground
    ? customBackground
    : builtInBackgrounds[backgroundTheme === "balloon" ? "balloon" : "lake"];

  const renderTask = (dateKey: string, task: Task, taskNumber: number) => (
    <article
      className={`task-card ${task.important ? "task-important" : ""} ${task.completed ? "task-completed" : ""}`}
      draggable={!task.completed}
      onDragStart={() => { dismissDragToast(); setDragged({ dateKey, taskId: task.id }); }}
      onDragEnd={() => { setDragged(null); cancelWeekHover(); }}
      key={task.id}
    >
      <div className="task-title-row">
        <div className="task-title-main">
          <span className="task-number" aria-hidden="true">{String(taskNumber).padStart(2, "0")}.</span>
          <p>{task.title}</p>
        </div>
        {task.important && !task.completed && <ImportantIcon className="task-importance-dot" label="Важная задача" />}
      </div>
      {!task.completed && (
        <div className="task-reveal">
          {task.description && <p className="task-description">{task.description}</p>}
          <div className="task-actions">
            <button type="button" data-tip="Отметить выполненной" aria-label="Отметить выполненной" onClick={() => updateTask(dateKey, task.id, (item) => ({ ...item, completed: true }))}>
              <CompleteIcon />
            </button>
            <button type="button" data-tip={task.important ? "Убрать важность" : "Отметить важной"} aria-label={task.important ? "Убрать важность" : "Отметить важной"} onClick={() => updateTask(dateKey, task.id, (item) => ({ ...item, important: !item.important }))}>
              <ImportantIcon className="task-importance-dot" />
            </button>
            <button type="button" data-tip="Редактировать" aria-label="Редактировать" onClick={() => openEditor(dateKey, task)}><EditIcon /></button>
            <button type="button" data-tip="Удалить" aria-label="Удалить" onClick={() => setDeleteTarget({ dateKey, task })}>
              <DeleteIcon />
            </button>
          </div>
        </div>
      )}
      {task.completed && (
        <button className="restore-task" type="button" onClick={() => updateTask(dateKey, task.id, (item) => ({ ...item, completed: false }))}>
          Вернуть в работу
        </button>
      )}
    </article>
  );

  const renderDay = (day: CalendarDay, compact = false) => (
    <section
      className={`day-panel ${day.id === todayDayId && weekId === "current" ? "today" : ""} ${compact ? "compact-day" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => dropOnDay(day.dateKey)}
      key={day.dateKey}
    >
      <header className="day-header">
        <div>
          <h2><span className="day-full">{day.full}</span><span className="day-short">{day.short}</span></h2>
          <p>{day.date}</p>
        </div>
        {day.id === todayDayId && weekId === "current" && <span className="today-label">Сегодня</span>}
      </header>
      <ScrollableTaskList layoutKey={(tasksByDate[day.dateKey] ?? []).map((task) => `${task.id}:${task.title}:${task.completed}:${task.important}`).join("|")}>
        {numberTasks(tasksByDate[day.dateKey] ?? []).map(({ task, number }) => renderTask(day.dateKey, task, number))}
      </ScrollableTaskList>
      <button className="add-task" type="button" aria-label="Добавить задачу" onClick={() => openEditor(day.dateKey)}><span aria-hidden="true">＋</span></button>
    </section>
  );

  return (
    <main className="seven-shell" style={{ backgroundImage: `url("${backgroundUrl}")` }}>
      <div className="mobile-message">
        <div className="mobile-message-card">
          <div className="brand-logo">Seven<span className="brand-dot">.</span></div>
          <h1>Лучше открыть на компьютере</h1>
          <p>Seven создан для планирования недели на большом экране. Версия для смартфона появится в будущем.</p>
        </div>
      </div>

      <div className="desktop-planner">
        <header className="topbar">
          <div className="metrics-group">
            <div className="metrics">
              <div
                className="progress-bar"
                role="progressbar"
                aria-label="Прогресс недели"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <span className="progress-bar-value" style={{ width: `${progress}%` }} />
              </div>
              <div className="completion-summary"><strong>{completedCount}/{allTasks.length}</strong><span>выполнено</span></div>
            </div>
            <button
              className="clear-week-button"
              type="button"
              aria-label="Очистить задачи на этой неделе"
              data-tip="Очистить неделю"
              onClick={() => setClearWeekOpen(true)}
            >
              <BroomIcon />
            </button>
          </div>
          <div className="brand-logo topbar-logo">Seven<span className="brand-dot">.</span></div>
          <div className="brand-controls">
            <div className="background-settings" ref={backgroundSettingsRef}>
              <button
                className={`settings-trigger ${backgroundMenuOpen ? "active" : ""}`}
                type="button"
                aria-label="Настройки фона"
                aria-expanded={backgroundMenuOpen}
                onClick={() => { setBackgroundError(""); setBackgroundMenuOpen((open) => !open); }}
              >
                <span className="settings-gear" aria-hidden="true" />
              </button>
              {backgroundMenuOpen && (
                <div className="background-menu" role="menu" aria-label="Настройки фона">
                  <button type="button" role="menuitem" onClick={cycleBuiltInBackground}>Обновить фон</button>
                  <button type="button" role="menuitem" onClick={() => backgroundFileRef.current?.click()}>Загрузить свой фон</button>
                  {backgroundError && <p role="alert">{backgroundError}</p>}
                </div>
              )}
              <input ref={backgroundFileRef} className="background-file-input" type="file" accept="image/*" onChange={uploadCustomBackground} />
            </div>
            <button
              className="developer-contact"
              type="button"
              aria-label="Написать разработчику"
              data-tip="Написать разработчику"
              onClick={openFeedback}
            >
              <SendIcon />
            </button>
            <nav className="week-switch" aria-label="Выбор недели">
              <button className={weekId === "current" ? "active" : ""} type="button" onClick={() => setWeekId("current")} onDragEnter={() => hoverWeek("current")} onDragLeave={cancelWeekHover}>Эта неделя</button>
              <button className={weekId === "next" ? "active" : ""} type="button" onClick={() => setWeekId("next")} onDragEnter={() => hoverWeek("next")} onDragLeave={cancelWeekHover}>Следующая неделя</button>
            </nav>
          </div>
        </header>

        <section className="week-grid" aria-label="Задачи на неделю">
          {displayDays.slice(0, 5).map((day) => renderDay(day))}
          <div className={`weekend-panel ${weekId === "current" && (todayDayId === "sat" || todayDayId === "sun") ? "today" : ""}`}>
            {renderDay(displayDays[5], true)}
            {renderDay(displayDays[6], true)}
          </div>
        </section>

        <footer className="site-footer">
          <span>Seven</span><span className="footer-divider">·</span><span>Неделя в твоём ритме</span><span className="footer-divider">·</span><span>2026</span>
        </footer>
      </div>

      {dragToast && (
        <aside className="drag-toast" role="status" aria-live="polite">
          <BulbIcon />
          <span className="drag-toast-copy">Задачи можно перетаскивать на другие дни</span>
          <button type="button" aria-label="Закрыть подсказку" onClick={dismissDragToast}>×</button>
        </aside>
      )}

      {welcome && (
        <div className="modal-layer">
          <section className="modal-card welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
            <button className="modal-close" type="button" aria-label="Закрыть" onClick={closeWelcome}>×</button>
            <h2 id="welcome-title" className="welcome-heading"><span className="brand-logo welcome-logo">Seven<span className="brand-dot">.</span></span></h2>
            <span className="modal-kicker">Добро пожаловать</span>
            <p>Это первая версия приложения, и она продолжает развиваться.</p>
            <p className="welcome-storage-note"><strong>Обрати внимание:</strong><span>Пока что все задачи сохраняются только в этом браузере<br />и только на этом устройстве</span></p>
            <p className="welcome-analytics-note">Для улучшения Seven используется Яндекс Метрика. Она считает посещения и действия без передачи текстов задач и обращений.</p>
            <label className="welcome-check"><input type="checkbox" checked={neverWelcome} onChange={(event) => setNeverWelcome(event.target.checked)} /> Больше не показывать</label>
            <div className="modal-actions">
              <button className="button primary-button" type="button" onClick={closeWelcome}>Понял, принял</button>
            </div>
          </section>
        </div>
      )}

      {feedbackOpen && (
        <div className="modal-layer">
          {feedbackStatus === "success" ? (
            <section className="modal-card feedback-success-card" role="dialog" aria-modal="true" aria-labelledby="feedback-success-title">
              <p id="feedback-success-title">Спасибо! Обращение было отправлено разработчику ;)</p>
              <button className="button primary-button" type="button" autoFocus onClick={closeFeedback}>Закрыть</button>
            </section>
          ) : (
            <form className="modal-card feedback-card" onSubmit={sendFeedback} role="dialog" aria-modal="true" aria-labelledby="feedback-title">
              <span className="modal-kicker">Обратная связь</span>
              <h2 id="feedback-title">Написать разработчику</h2>
              <label>
                Имя
                <input
                  autoFocus
                  value={feedbackName}
                  onChange={(event) => {
                    setFeedbackName(event.target.value);
                    if (feedbackStatus !== "sending") setFeedbackStatus("idle");
                  }}
                  placeholder="Необязательно, от анонимов тоже принимаю обратную связь :)"
                  disabled={feedbackStatus === "sending"}
                />
              </label>
              <label>
                Сообщение
                <textarea
                  value={feedbackText}
                  onChange={(event) => {
                    setFeedbackText(event.target.value);
                    if (feedbackStatus !== "sending") setFeedbackStatus("idle");
                  }}
                  placeholder="Расскажи об идее, пожелании или проблеме"
                  disabled={feedbackStatus === "sending"}
                />
              </label>
              {feedbackStatus !== "idle" && (
                <p className={`feedback-status ${feedbackStatus}`} role="status" aria-live="polite">
                  {feedbackStatusText}
                </p>
              )}
              <div className="modal-actions">
                <button className="button primary-button" type="submit" disabled={!feedbackText.trim() || feedbackStatus === "sending"}>
                  {feedbackStatus === "sending" ? "Отправляем…" : "Отправить"}
                </button>
                <button className="button secondary-button" type="button" disabled={feedbackStatus === "sending"} onClick={closeFeedback}>Отменить</button>
              </div>
            </form>
          )}
        </div>
      )}

      {editor && (
        <div className="modal-layer">
          <form className="modal-card task-editor" onSubmit={saveTask} role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
            <span className="modal-kicker">{editor.task ? "Редактирование" : "Новая задача"}</span>
            <h2 id="task-editor-title">{editor.task ? "Редактировать задачу" : "Добавить задачу"}</h2>
            <label>Название задачи <span>{title.length}/50</span><input autoFocus value={title} maxLength={50} onChange={(event) => setTitle(event.target.value)} placeholder="Что нужно сделать?" /></label>
            <label>Описание <span>{description.length}/100</span><textarea value={description} maxLength={100} onChange={(event) => setDescription(event.target.value)} placeholder="Необязательно" /></label>
            <fieldset>
              <legend>Приоритет</legend>
              <div className="priority-options">
                <button className={!important ? "selected" : ""} type="button" onClick={() => setImportant(false)}>Обычная</button>
                <button className={`important-choice ${important ? "selected" : ""}`} type="button" onClick={() => setImportant(true)}><ImportantIcon /><span>Важная</span></button>
              </div>
            </fieldset>
            <div className="modal-actions">
              <button className="button secondary-button" type="button" onClick={() => setEditor(null)}>Отменить</button>
              <button className="button primary-button" type="submit" disabled={!title.trim()}>Сохранить задачу</button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-layer">
          <section className="modal-card delete-card" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <span className="modal-kicker danger-kicker">Удаление</span>
            <h2 id="delete-title">Удалить задачу?</h2>
            <p>«{deleteTarget.task.title}» будет удалена без возможности восстановления.</p>
            <div className="modal-actions">
              <button className="button secondary-button" type="button" onClick={() => setDeleteTarget(null)}>Отменить</button>
              <button className="button danger-button" type="button" onClick={confirmDelete}>Удалить</button>
            </div>
          </section>
        </div>
      )}

      {clearWeekOpen && (
        <div className="modal-layer">
          <section className="modal-card clear-week-card" role="dialog" aria-modal="true" aria-labelledby="clear-week-title">
            <span className="modal-kicker danger-kicker">Очистка недели</span>
            <h2 id="clear-week-title">Очистить все задачи?</h2>
            <p className="clear-week-copy">
              <span>Хочешь очистить текущую неделю</span>
              <span>и начать с чистого листа?)</span>
            </p>
            <div className="modal-actions">
              <button className="button danger-button" type="button" onClick={confirmClearWeek}>Да</button>
              <button className="button secondary-button" type="button" autoFocus onClick={() => setClearWeekOpen(false)}>Не хочу</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
