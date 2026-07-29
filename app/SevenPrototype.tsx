"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type DayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type WeekId = "current" | "next";
type Period = "morning" | "day" | "twilight" | "night";
type BackgroundTheme = "karelia" | "forest" | "custom";

type Task = {
  id: number;
  title: string;
  description: string;
  important: boolean;
  completed: boolean;
};

type Week = Record<DayId, Task[]>;

const dayMeta: Array<{ id: DayId; short: string; full: string; date: string }> = [
  { id: "mon", short: "Пн", full: "Понедельник", date: "27 июля" },
  { id: "tue", short: "Вт", full: "Вторник", date: "28 июля" },
  { id: "wed", short: "Ср", full: "Среда", date: "29 июля" },
  { id: "thu", short: "Чт", full: "Четверг", date: "30 июля" },
  { id: "fri", short: "Пт", full: "Пятница", date: "31 июля" },
  { id: "sat", short: "Сб", full: "Суббота", date: "1 августа" },
  { id: "sun", short: "Вс", full: "Воскресенье", date: "2 августа" },
];

const emptyWeek = (): Week => ({
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
});

const emptyWeeks = (): Record<WeekId, Week> => ({ current: emptyWeek(), next: emptyWeek() });
const taskStorageKey = "seven-weeks-v1";

function storedWeeks(value: string | null): Record<WeekId, Week> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<Record<WeekId, Partial<Week>>>;
    const restored = emptyWeeks();
    const dayIds: DayId[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    for (const weekId of ["current", "next"] as WeekId[]) {
      for (const dayId of dayIds) {
        const tasks = parsed[weekId]?.[dayId];
        if (Array.isArray(tasks)) restored[weekId][dayId] = tasks;
      }
    }
    return restored;
  } catch {
    return null;
  }
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (!a.completed && a.important !== b.important) return Number(b.important) - Number(a.important);
    return 0;
  });
}

function timePeriod(hour: number): Period {
  if (hour >= 5 && hour < 9) return "morning";
  if (hour >= 9 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "twilight";
  return "night";
}

function dayIdForDate(date: Date): DayId {
  const days: DayId[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[date.getDay()];
}

const backgroundSets: Record<Exclude<BackgroundTheme, "custom">, Record<Period, string>> = {
  karelia: {
    morning: "images/seven-karelia-morning-v1.png",
    day: "images/seven-karelia-day-v1.png",
    twilight: "images/seven-karelia-twilight-v1.png",
    night: "images/seven-karelia-night-v1.png",
  },
  forest: {
    morning: "images/seven-karelia-forest-option2-morning-v1.png",
    day: "images/seven-karelia-forest-option2-day-v1.png",
    twilight: "images/seven-karelia-forest-option2-twilight-v1.png",
    night: "images/seven-karelia-forest-option2-night-v1.png",
  },
};

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
  const [weeks, setWeeks] = useState<Record<WeekId, Week>>(emptyWeeks);
  const [weekId, setWeekId] = useState<WeekId>("current");
  const [period, setPeriod] = useState<Period>("day");
  const [todayDayId, setTodayDayId] = useState<DayId>(() => dayIdForDate(new Date()));
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>("karelia");
  const [customBackground, setCustomBackground] = useState<string | null>(null);
  const [backgroundMenuOpen, setBackgroundMenuOpen] = useState(false);
  const [backgroundError, setBackgroundError] = useState("");
  const [welcome, setWelcome] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [dragToast, setDragToast] = useState(false);
  const [neverWelcome, setNeverWelcome] = useState(false);
  const [editor, setEditor] = useState<{ day: DayId; task?: Task } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ day: DayId; task: Task } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [important, setImportant] = useState(false);
  const [dragged, setDragged] = useState<{ week: WeekId; day: DayId; taskId: number } | null>(null);
  const weekHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundFileRef = useRef<HTMLInputElement>(null);
  const backgroundSettingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setPeriod(timePeriod(now.getHours()));
      setTodayDayId(dayIdForDate(now));
    };
    updateClock();
    const periodTimer = window.setInterval(updateClock, 60_000);

    const welcomeDismissed = window.localStorage.getItem("seven-welcome-dismissed") === "yes";
    const savedWeeks = storedWeeks(window.localStorage.getItem(taskStorageKey));
    const savedBackgroundTheme = window.localStorage.getItem("seven-background-theme");
    const savedCustomBackground = window.localStorage.getItem("seven-custom-background");
    const initTimer = window.setTimeout(() => {
      if (savedWeeks) setWeeks(savedWeeks);
      if (savedCustomBackground) setCustomBackground(savedCustomBackground);
      if (savedBackgroundTheme === "forest" || savedBackgroundTheme === "custom") {
        setBackgroundTheme(savedBackgroundTheme === "custom" && !savedCustomBackground ? "karelia" : savedBackgroundTheme);
      }
      if (!welcomeDismissed) setWelcome(true);
      setInitialized(true);
    }, 0);

    return () => {
      window.clearInterval(periodTimer);
      window.clearTimeout(initTimer);
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    window.localStorage.setItem(taskStorageKey, JSON.stringify(weeks));
  }, [initialized, weeks]);

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

  const week = weeks[weekId];
  const allTasks = useMemo(() => Object.values(week).flat(), [week]);
  const completedCount = allTasks.filter((task) => task.completed).length;
  const importantCount = allTasks.filter((task) => task.important && !task.completed).length;
  const ordinaryCount = allTasks.filter((task) => !task.important && !task.completed).length;
  const progress = allTasks.length ? Math.round((completedCount / allTasks.length) * 100) : 0;

  const closeWelcome = () => {
    if (neverWelcome) window.localStorage.setItem("seven-welcome-dismissed", "yes");
    setWelcome(false);
  };

  const openEditor = (day: DayId, task?: Task) => {
    setEditor({ day, task });
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setImportant(task?.important ?? false);
  };

  const saveTask = (event: FormEvent) => {
    event.preventDefault();
    if (!editor || !title.trim()) return;
    setWeeks((current) => {
      const copy = { ...current, [weekId]: { ...current[weekId] } };
      const tasks = [...copy[weekId][editor.day]];
      if (editor.task) {
        const index = tasks.findIndex((task) => task.id === editor.task?.id);
        tasks[index] = { ...tasks[index], title: title.trim(), description: description.trim(), important };
      } else {
        tasks.push({ id: Date.now(), title: title.trim(), description: description.trim(), important, completed: false });
      }
      copy[weekId][editor.day] = tasks;
      return copy;
    });
    setEditor(null);
  };

  const updateTask = (day: DayId, taskId: number, update: (task: Task) => Task) => {
    setWeeks((current) => ({
      ...current,
      [weekId]: {
        ...current[weekId],
        [day]: current[weekId][day].map((task) => (task.id === taskId ? update(task) : task)),
      },
    }));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setWeeks((current) => ({
      ...current,
      [weekId]: {
        ...current[weekId],
        [deleteTarget.day]: current[weekId][deleteTarget.day].filter((task) => task.id !== deleteTarget.task.id),
      },
    }));
    setDeleteTarget(null);
  };

  const dropOnDay = (targetDay: DayId) => {
    if (!dragged) return;
    const task = weeks[dragged.week][dragged.day].find((item) => item.id === dragged.taskId);
    if (!task || task.completed) return;
    setWeeks((current) => {
      const sourceWeek = { ...current[dragged.week] };
      const targetWeek = dragged.week === weekId ? sourceWeek : { ...current[weekId] };
      sourceWeek[dragged.day] = sourceWeek[dragged.day].filter((item) => item.id !== dragged.taskId);
      targetWeek[targetDay] = [...targetWeek[targetDay], task];
      return { ...current, [dragged.week]: sourceWeek, [weekId]: targetWeek };
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
    const nextTheme: Exclude<BackgroundTheme, "custom"> = backgroundTheme === "forest" ? "karelia" : "forest";
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
    : backgroundSets[backgroundTheme === "forest" ? "forest" : "karelia"][period];

  const renderTask = (day: DayId, task: Task) => (
    <article
      className={`task-card ${task.important ? "task-important" : ""} ${task.completed ? "task-completed" : ""}`}
      draggable={!task.completed}
      onDragStart={() => { dismissDragToast(); setDragged({ week: weekId, day, taskId: task.id }); }}
      onDragEnd={() => { setDragged(null); cancelWeekHover(); }}
      key={task.id}
    >
      <div className="task-title-row">
        <p>{task.title}</p>
        {task.important && !task.completed && <span className="importance-dot task-importance-dot" aria-label="Важная задача" />}
        {task.completed && <span className="task-check" aria-label="Выполнено">✓</span>}
      </div>
      {!task.completed && (
        <div className="task-reveal">
          {task.description && <p className="task-description">{task.description}</p>}
          <div className="task-actions">
            <button type="button" data-tip="Отметить выполненной" aria-label="Отметить выполненной" onClick={() => updateTask(day, task.id, (item) => ({ ...item, completed: true }))}><span className="action-symbol" aria-hidden="true">✓</span></button>
            <button type="button" data-tip={task.important ? "Убрать важность" : "Отметить важной"} aria-label={task.important ? "Убрать важность" : "Отметить важной"} onClick={() => updateTask(day, task.id, (item) => ({ ...item, important: !item.important }))}><span className="importance-dot action-importance-dot" aria-hidden="true" /></button>
            <button type="button" data-tip="Редактировать" aria-label="Редактировать" onClick={() => openEditor(day, task)}><span className="edit-icon" aria-hidden="true" /></button>
            <button type="button" data-tip="Удалить" aria-label="Удалить" onClick={() => setDeleteTarget({ day, task })}><span className="action-symbol delete-symbol" aria-hidden="true">✗</span></button>
          </div>
        </div>
      )}
      {task.completed && (
        <button className="restore-task" type="button" onClick={() => updateTask(day, task.id, (item) => ({ ...item, completed: false }))}>
          Вернуть в работу
        </button>
      )}
    </article>
  );

  const renderDay = (day: (typeof dayMeta)[number], compact = false) => (
    <section
      className={`day-panel ${day.id === todayDayId && weekId === "current" ? "today" : ""} ${compact ? "compact-day" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => dropOnDay(day.id)}
      key={day.id}
    >
      <header className="day-header">
        <div>
          <h2><span className="day-full">{day.full}</span><span className="day-short">{day.short}</span></h2>
          <p>{day.date}</p>
        </div>
        {day.id === todayDayId && weekId === "current" && <span className="today-label">Сегодня</span>}
      </header>
      <ScrollableTaskList layoutKey={week[day.id].map((task) => `${task.id}:${task.title}:${task.completed}`).join("|")}>
        {sortTasks(week[day.id]).map((task) => renderTask(day.id, task))}
      </ScrollableTaskList>
      <button className="add-task" type="button" aria-label="Добавить задачу" onClick={() => openEditor(day.id)}><span aria-hidden="true">＋</span></button>
    </section>
  );

  return (
    <main className={`seven-shell period-${period}`} style={{ backgroundImage: `linear-gradient(180deg, rgba(3,15,28,.18), rgba(2,14,25,.48)), url("${backgroundUrl}")` }}>
      <div className="mobile-message">
        <div className="mobile-message-card">
          <div className="brand-logo">Seven</div>
          <h1>Лучше открыть на компьютере</h1>
          <p>Seven создан для планирования недели на большом экране. Версия для смартфона появится в будущем.</p>
        </div>
      </div>

      <div className="desktop-planner">
        <header className="topbar">
          <div className="metrics">
            <div className="progress-wrap">
              <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><span>{progress}%</span></div>
              <div><strong>Прогресс недели</strong><small>{weekId === "current" ? "Текущая неделя" : "Следующая неделя"}</small></div>
            </div>
            <div className="metric"><strong>{completedCount} <span>/ {allTasks.length}</span></strong><small>Выполнено</small></div>
            <div className="metric metric-important"><strong>{importantCount}</strong><small>Важные в фокусе</small></div>
            <div className="metric metric-ordinary"><strong>{ordinaryCount}</strong><small>Обычные в фокусе</small></div>
          </div>
          <div className="brand-area">
            <div className="brand-logo">Seven</div>
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
              <nav className="week-switch" aria-label="Выбор недели">
                <button className={weekId === "current" ? "active" : ""} type="button" onClick={() => setWeekId("current")} onDragEnter={() => hoverWeek("current")} onDragLeave={cancelWeekHover}>Эта неделя</button>
                <button className={weekId === "next" ? "active" : ""} type="button" onClick={() => setWeekId("next")} onDragEnter={() => hoverWeek("next")} onDragLeave={cancelWeekHover}>Следующая неделя</button>
              </nav>
            </div>
          </div>
        </header>

        <section className="week-grid" aria-label="Задачи на неделю">
          {dayMeta.slice(0, 5).map((day) => renderDay(day))}
          <div className="weekend-panel">
            {renderDay(dayMeta[5], true)}
            {renderDay(dayMeta[6], true)}
          </div>
        </section>

        <footer className="site-footer">
          <span>Seven</span><span className="footer-divider">·</span><span>Неделя в твоём ритме</span><span className="footer-divider">·</span><span>2026</span>
        </footer>
      </div>

      {dragToast && (
        <aside className="drag-toast" role="status" aria-live="polite">
          <span className="drag-toast-bulb" aria-hidden="true">
            <i className="bulb-glass" />
            <i className="bulb-filament" />
            <i className="bulb-base" />
          </span>
          <span>Задачи можно перетаскивать на другие дни</span>
          <button type="button" aria-label="Закрыть подсказку" onClick={dismissDragToast}>×</button>
        </aside>
      )}

      {welcome && (
        <div className="modal-layer">
          <section className="modal-card welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
            <button className="modal-close" type="button" aria-label="Закрыть" onClick={closeWelcome}>×</button>
            <h2 id="welcome-title" className="welcome-heading"><span className="brand-logo welcome-logo">Seven</span></h2>
            <span className="modal-kicker">Добро пожаловать</span>
            <p>Это первая версия приложения, и она продолжает развиваться.</p>
            <p className="welcome-storage-note">Пока что все задачи сохраняются только в этом браузере<br />и только на этом устройстве</p>
            <p className="welcome-feedback">Понравился планер или есть идеи?<span>Напиши разработчику — она будет очень рада <span className="welcome-heart" aria-hidden="true" /></span></p>
            <label className="welcome-check"><input type="checkbox" checked={neverWelcome} onChange={(event) => setNeverWelcome(event.target.checked)} /> Больше не показывать</label>
            <div className="modal-actions">
              <a className="button secondary-button" href="https://t.me/annakenga" target="_blank" rel="noreferrer">Написать в Telegram</a>
              <button className="button primary-button" type="button" onClick={closeWelcome}>Продолжить</button>
            </div>
          </section>
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
                <button className={`important-choice ${important ? "selected" : ""}`} type="button" onClick={() => setImportant(true)}><span className="importance-dot" aria-hidden="true" /><span>Важная</span></button>
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
    </main>
  );
}
