/**
 * Quiet Index style reminder: this page is a calm editorial study ledger with a terracotta
 * margin signal, paper-like cards, revision beads, and clear local-data ownership.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  AlertCircle,
  Archive,
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  CloudOff,
  Database,
  Download,
  FileUp,
  LayoutDashboard,
  Menu,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Timer,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

type View = "overview" | "planner" | "archive" | "settings";
type ThemePreference = "light" | "dark" | "system";
type Accent = "terracotta" | "mineral" | "moss";
type Density = "comfortable" | "compact";
type RevisionKey = "revision1" | "revision2" | "revision3" | "revision4" | "revision5";
type RevisionStatus = "pending" | "done";

interface TopicEntry {
  id: string;
  topic: string;
  subject: string;
  firstStudy: string;
  timeTook: number;
  revisions: Record<RevisionKey, string>;
  status: Record<RevisionKey, RevisionStatus>;
  createdAt: string;
  updatedAt: string;
}

interface AppSettings {
  theme: ThemePreference;
  accent: Accent;
  density: Density;
}

interface RevisionAction {
  entry: TopicEntry;
  key: RevisionKey;
  dueAt: Date;
}

interface EntryDraft {
  topic: string;
  subject: string;
  firstStudy: string;
  timeTook: string;
}

interface PendingImport {
  entries: TopicEntry[];
  settings?: AppSettings;
  name: string;
}

const ENTRY_STORAGE_KEY = "study-track:entries:v2";
const SETTINGS_STORAGE_KEY = "study-track:settings:v2";
const revisionKeys: RevisionKey[] = ["revision1", "revision2", "revision3", "revision4", "revision5"];
const revisionLabels: Record<RevisionKey, string> = {
  revision1: "1h review",
  revision2: "25h review",
  revision3: "8-day review",
  revision4: "16-day review",
  revision5: "31-day review",
};
const subjects = [
  "BN Literature",
  "BN Grammar",
  "EN Literature",
  "EN Grammar",
  "Math",
  "Mental Ability",
  "BN Affairs",
  "International Affairs",
  "ICT",
  "Science",
  "Geography",
  "Ethics",
];

const defaultSettings: AppSettings = {
  theme: "system",
  accent: "terracotta",
  density: "comfortable",
};

const blankDraft = (): EntryDraft => ({
  topic: "",
  subject: subjects[0],
  firstStudy: toDateInputValue(new Date()),
  timeTook: "45",
});

const accentTokens: Record<Accent, { name: string; color: string; soft: string }> = {
  terracotta: { name: "Terracotta Signal", color: "#c7654f", soft: "#f3dfd8" },
  mineral: { name: "Mineral Blue", color: "#4f788b", soft: "#dce9ed" },
  moss: { name: "Moss Ledger", color: "#60785e", soft: "#e0e8dd" },
};

function toDateInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function calculateRevisions(firstStudy: string): Record<RevisionKey, string> {
  const origin = new Date(firstStudy).getTime();
  return {
    revision1: new Date(origin + 60 * 60 * 1000).toISOString(),
    revision2: new Date(origin + 25 * 60 * 60 * 1000).toISOString(),
    revision3: new Date(origin + 8 * 24 * 60 * 60 * 1000).toISOString(),
    revision4: new Date(origin + 16 * 24 * 60 * 60 * 1000).toISOString(),
    revision5: new Date(origin + 31 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function formatDate(value: string | Date, withTime = true) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : { year: "numeric" }),
  }).format(date);
}

function relativeTime(value: Date) {
  const difference = value.getTime() - Date.now();
  const absolute = Math.abs(difference);
  if (absolute < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.round(absolute / 60_000));
    return difference <= 0 ? `${minutes}m overdue` : `in ${minutes}m`;
  }
  if (absolute < 24 * 60 * 60 * 1000) {
    const hours = Math.round(absolute / 3_600_000);
    return difference <= 0 ? `${hours}h overdue` : `in ${hours}h`;
  }
  const days = Math.round(absolute / 86_400_000);
  return difference <= 0 ? `${days}d overdue` : `in ${days}d`;
}

function isSameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getSchedule(entries: TopicEntry[]) {
  return entries
    .flatMap((entry) =>
      revisionKeys
        .filter((key) => entry.status[key] !== "done")
        .map((key) => ({ entry, key, dueAt: new Date(entry.revisions[key]) })),
    )
    .sort((first, second) => first.dueAt.getTime() - second.dueAt.getTime());
}

function getCompletion(entry: TopicEntry) {
  return revisionKeys.filter((key) => entry.status[key] === "done").length;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStoredEntries(): TopicEntry[] {
  try {
    const stored = JSON.parse(localStorage.getItem(ENTRY_STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.map(normalizeEntry).filter(Boolean) as TopicEntry[] : [];
  } catch {
    return [];
  }
}

function getStoredSettings(): AppSettings {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}"));
  } catch {
    return defaultSettings;
  }
}

function normalizeSettings(value: unknown): AppSettings {
  const input = (value && typeof value === "object" ? value : {}) as Partial<AppSettings>;
  return {
    theme: input.theme === "light" || input.theme === "dark" || input.theme === "system" ? input.theme : defaultSettings.theme,
    accent: input.accent === "terracotta" || input.accent === "mineral" || input.accent === "moss" ? input.accent : defaultSettings.accent,
    density: input.density === "compact" || input.density === "comfortable" ? input.density : defaultSettings.density,
  };
}

function normalizeEntry(value: unknown): TopicEntry | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<TopicEntry>;
  if (
    typeof source.topic !== "string" ||
    !source.topic.trim() ||
    typeof source.subject !== "string" ||
    typeof source.firstStudy !== "string" ||
    Number.isNaN(new Date(source.firstStudy).getTime())
  ) {
    return null;
  }
  const revisions = source.revisions && typeof source.revisions === "object" ? source.revisions : calculateRevisions(source.firstStudy);
  const sourceStatus: Partial<Record<RevisionKey, RevisionStatus>> =
    source.status && typeof source.status === "object"
      ? (source.status as Partial<Record<RevisionKey, RevisionStatus>>)
      : {};
  const resolvedRevisions = {} as Record<RevisionKey, string>;
  const resolvedStatus = {} as Record<RevisionKey, RevisionStatus>;
  for (const key of revisionKeys) {
    const candidate = revisions[key];
    if (typeof candidate !== "string" || Number.isNaN(new Date(candidate).getTime())) return null;
    resolvedRevisions[key] = candidate;
    resolvedStatus[key] = sourceStatus[key] === "done" ? "done" : "pending";
  }
  const fallbackTime = Number.isFinite(Number(source.timeTook)) ? Math.max(0, Number(source.timeTook)) : 0;
  const now = new Date().toISOString();
  return {
    id: typeof source.id === "string" && source.id ? source.id : makeId(),
    topic: source.topic.trim(),
    subject: source.subject,
    firstStudy: source.firstStudy,
    timeTook: fallbackTime,
    revisions: resolvedRevisions,
    status: resolvedStatus,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
  };
}

function downloadFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function RevisionBeads({ entry, compact = false }: { entry: TopicEntry; compact?: boolean }) {
  return (
    <div className={`revision-beads ${compact ? "is-compact" : ""}`} aria-label={`${getCompletion(entry)} of 5 revisions completed`}>
      {revisionKeys.map((key, index) => {
        const done = entry.status[key] === "done";
        const due = !done && new Date(entry.revisions[key]).getTime() <= Date.now();
        return (
          <span key={key} className={`revision-bead ${done ? "is-done" : due ? "is-due" : ""}`} title={`${revisionLabels[key]} — ${formatDate(entry.revisions[key])}`}>
            {done ? <Check size={compact ? 10 : 12} strokeWidth={3} /> : index + 1}
          </span>
        );
      })}
    </div>
  );
}

function IconButton({ label, onClick, children, className = "" }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" className={`icon-button ${className}`} onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

export default function Home() {
  const [entries, setEntries] = useState<TopicEntry[]>(getStoredEntries);
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings);
  const [activeView, setActiveView] = useState<View>("overview");
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [draft, setDraft] = useState<EntryDraft>(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [entryMenuId, setEntryMenuId] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const fileInput = useRef<HTMLInputElement>(null);

  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const resolvedTheme = settings.theme === "system" ? (systemDark ? "dark" : "light") : settings.theme;
  const accent = accentTokens[settings.accent];

  useEffect(() => {
    localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.title = "Study Track — private revision desk";
  }, [resolvedTheme]);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  const schedule = useMemo(() => getSchedule(entries), [entries]);
  const now = new Date();
  const todayActions = schedule.filter((item) => isSameCalendarDay(item.dueAt, now) || item.dueAt < now);
  const weekLimit = new Date(now);
  weekLimit.setDate(weekLimit.getDate() + 7);
  const weekActions = schedule.filter((item) => item.dueAt <= weekLimit);
  const completedSteps = entries.reduce((total, entry) => total + getCompletion(entry), 0);
  const totalSteps = entries.length * revisionKeys.length;
  const completionRate = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const totalMinutes = entries.reduce((total, entry) => total + entry.timeTook, 0);
  const focusHours = totalMinutes >= 60 ? `${(totalMinutes / 60).toFixed(totalMinutes % 60 ? 1 : 0)}h` : `${totalMinutes}m`;
  const nextAction = schedule[0];

  const filteredEntries = useMemo(
    () =>
      entries
        .filter((entry) => selectedSubject === "all" || entry.subject === selectedSubject)
        .filter((entry) => `${entry.topic} ${entry.subject}`.toLowerCase().includes(search.toLowerCase()))
        .sort((first, second) => {
          const firstNext = getSchedule([first])[0]?.dueAt.getTime() ?? Number.MAX_SAFE_INTEGER;
          const secondNext = getSchedule([second])[0]?.dueAt.getTime() ?? Number.MAX_SAFE_INTEGER;
          return firstNext - secondNext;
        }),
    [entries, search, selectedSubject],
  );

  const appStyle = {
    "--signal": accent.color,
    "--signal-soft": accent.soft,
  } as CSSProperties;

  function openNewEntry() {
    setDraft(blankDraft());
    setEditingId(null);
    setFormOpen(true);
    setSidebarOpen(false);
  }

  function openEditEntry(entry: TopicEntry) {
    setDraft({
      topic: entry.topic,
      subject: entry.subject,
      firstStudy: toDateInputValue(new Date(entry.firstStudy)),
      timeTook: String(entry.timeTook),
    });
    setEditingId(entry.id);
    setEntryMenuId(null);
    setFormOpen(true);
  }

  function handleEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.topic.trim()) {
      toast.error("Give this study record a topic name.");
      return;
    }
    if (Number(draft.timeTook) < 0 || !Number.isFinite(Number(draft.timeTook))) {
      toast.error("Study time must be zero minutes or more.");
      return;
    }
    const existing = entries.find((entry) => entry.id === editingId);
    const timestamp = new Date().toISOString();
    const entry: TopicEntry = {
      id: existing?.id ?? makeId(),
      topic: draft.topic.trim(),
      subject: draft.subject,
      firstStudy: new Date(draft.firstStudy).toISOString(),
      timeTook: Number(draft.timeTook),
      revisions: calculateRevisions(draft.firstStudy),
      status: existing?.status ?? { revision1: "pending", revision2: "pending", revision3: "pending", revision4: "pending", revision5: "pending" },
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    setEntries((current) => (existing ? current.map((item) => (item.id === existing.id ? entry : item)) : [entry, ...current]));
    setFormOpen(false);
    setEditingId(null);
    toast.success(existing ? "Study record updated." : "Study record added to your ledger.");
  }

  function markRevisionDone(entryId: string, key: RevisionKey) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? { ...entry, status: { ...entry.status, [key]: "done" }, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
    setEntryMenuId(null);
    toast.success("Revision marked complete.");
  }

  function snoozeRevision(entryId: string, key: RevisionKey) {
    const newDue = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? { ...entry, revisions: { ...entry.revisions, [key]: newDue }, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
    setEntryMenuId(null);
    toast.message("Revision moved forward by one hour.");
  }

  function deleteEntry(entryId: string) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry || !window.confirm(`Remove “${entry.topic}” and its revision plan? This cannot be undone without a backup.`)) return;
    setEntries((current) => current.filter((item) => item.id !== entryId));
    setEntryMenuId(null);
    toast.success("Study record removed.");
  }

  function exportBackup() {
    const backup = {
      app: "study-track",
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      entries,
      settings,
    };
    downloadFile(`study-track-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), "application/json");
    toast.success("Backup downloaded. Keep it somewhere you trust.");
  }

  function requestImport() {
    fileInput.current?.click();
  }

  function readImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const rawEntries = Array.isArray(parsed) ? parsed : parsed?.entries;
        if (!Array.isArray(rawEntries)) throw new Error("No study records found");
        const validEntries = rawEntries.map(normalizeEntry).filter(Boolean) as TopicEntry[];
        if (rawEntries.length && !validEntries.length) throw new Error("No valid study records found");
        setPendingImport({
          entries: validEntries,
          settings: Array.isArray(parsed) ? undefined : normalizeSettings(parsed?.settings),
          name: file.name,
        });
      } catch {
        toast.error("That file is not a compatible Study Track backup.");
      }
    };
    reader.onerror = () => toast.error("The backup file could not be read.");
    reader.readAsText(file);
  }

  function applyImport() {
    if (!pendingImport) return;
    setEntries(pendingImport.entries);
    if (pendingImport.settings) setSettings(pendingImport.settings);
    setPendingImport(null);
    setActiveView("overview");
    toast.success("Backup restored to this device.");
  }

  function resetAllData() {
    setEntries([]);
    setConfirmReset(false);
    toast.success("Your local study ledger has been cleared.");
  }

  const navigation = [
    { id: "overview" as View, label: "Overview", icon: LayoutDashboard },
    { id: "planner" as View, label: "Revision plan", icon: CalendarDays },
    { id: "archive" as View, label: "All topics", icon: Archive },
    { id: "settings" as View, label: "Settings", icon: Settings },
  ];

  return (
    <div className={`app-shell theme-${resolvedTheme}`} data-density={settings.density} style={appStyle}>
      <aside className={`side-rail ${sidebarOpen ? "is-open" : ""}`} aria-label="Study Track navigation">
        <div className="rail-brand">
          <img src="/manus-storage/study-track-ledger-mark_03e195a4.png" alt="Study Track" className="brand-mark" />
          <div>
            <p className="brand-name"><span>Study</span> Track</p>
            <p className="brand-subtitle">Private revision desk</p>
          </div>
          <IconButton label="Close navigation" className="rail-close" onClick={() => setSidebarOpen(false)}><X size={18} /></IconButton>
        </div>

        <nav className="rail-nav">
          <p className="eyebrow nav-label">Study ledger</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={`nav-item ${activeView === item.id ? "is-active" : ""}`}
                onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}
              >
                <Icon size={18} strokeWidth={activeView === item.id ? 2.4 : 1.8} />
                <span>{item.label}</span>
                {item.id === "planner" && todayActions.length > 0 && <b>{todayActions.length}</b>}
              </button>
            );
          })}
        </nav>

        <div className="rail-note">
          <CloudOff size={17} />
          <div>
            <strong>{online ? "Local only" : "Offline mode"}</strong>
            <span>Your study data stays on this device.</span>
          </div>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="rail-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

      <main className="ledger-main">
        <header className="mobile-header">
          <IconButton label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={20} /></IconButton>
          <div className="mobile-brand"><img src="/manus-storage/study-track-ledger-mark_03e195a4.png" alt="" /> <span>Study Track</span></div>
          <IconButton label="Add study record" onClick={openNewEntry}><Plus size={20} /></IconButton>
        </header>

        <div className="page-frame">
          <div className="desk-index" aria-label="Study Track private revision desk">
            <img src="/manus-storage/study-track-ledger-mark_03e195a4.png" alt="" />
            <span className="desk-wordmark"><i>Study</i> <b>TRACK</b></span>
            <span className="desk-rule" />
            <em>Private desk · 01</em>
          </div>
          <header className="page-topline">
            <div>
              <p className="eyebrow">{activeView === "overview" ? "Today’s desk" : activeView === "planner" ? "Your study rhythm" : activeView === "archive" ? "Your private archive" : "Personal preferences"}</p>
              <h1>{activeView === "overview" ? "Keep the next review in sight." : activeView === "planner" ? "Revision plan" : activeView === "archive" ? "Study ledger" : "Settings"}</h1>
            </div>
            <div className="page-actions">
              <button type="button" className="quiet-action" onClick={() => setActiveView("settings")}><ShieldCheck size={16} /> Local-first</button>
              <button type="button" className="primary-action" onClick={openNewEntry}><Plus size={17} /> Add topic</button>
            </div>
          </header>

          {activeView === "overview" && (
            <section className="view-stack overview-view" aria-label="Overview">
              <section className="focus-card">
                <div className="focus-copy">
                  <div className="margin-mark"><Sparkles size={14} /> Current focus</div>
                  {nextAction ? (
                    <>
                      <p className="focus-pretitle">{revisionLabels[nextAction.key]} · {nextAction.entry.subject}</p>
                      <h2>{nextAction.entry.topic}</h2>
                      <p className="focus-detail"><CalendarClock size={16} /> {nextAction.dueAt.getTime() <= Date.now() ? "Ready whenever you are" : `Scheduled ${formatDate(nextAction.dueAt)}`}</p>
                      <div className="focus-actions">
                        <button type="button" className="primary-action" onClick={() => markRevisionDone(nextAction.entry.id, nextAction.key)}><CheckCircle2 size={17} /> Mark reviewed</button>
                        <button type="button" className="text-action" onClick={() => setActiveView("planner")}>See plan <ArrowUpRight size={15} /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="focus-pretitle">A clear desk is useful, too</p>
                      <h2>{entries.length ? "Every planned review is complete." : "Your revision desk is waiting."}</h2>
                      <p className="focus-detail">{entries.length ? "Add a new topic whenever you begin your next study session." : "Add the first topic you studied and Study Track will build its review rhythm locally."}</p>
                      <button type="button" className="primary-action" onClick={openNewEntry}><Plus size={17} /> Add first topic</button>
                    </>
                  )}
                </div>
                <div className="focus-art" role="img" aria-label="Illustration of an organized study ledger" />
              </section>

              <section className="metrics-strip" aria-label="Study overview statistics">
                <article className="metric-card"><div className="metric-icon signal"><AlertCircle size={18} /></div><div><span>Ready now</span><strong>{todayActions.length}</strong><small>{todayActions.length === 1 ? "review needs attention" : "reviews need attention"}</small></div></article>
                <article className="metric-card"><div className="metric-icon blue"><CalendarDays size={18} /></div><div><span>Next 7 days</span><strong>{weekActions.length}</strong><small>planned revision sessions</small></div></article>
                <article className="metric-card"><div className="metric-icon green"><CheckCircle2 size={18} /></div><div><span>Revision pace</span><strong>{completionRate}%</strong><small>{completedSteps} of {totalSteps} sessions complete</small></div></article>
                <article className="metric-card"><div className="metric-icon ink"><Timer size={18} /></div><div><span>Study time</span><strong>{focusHours}</strong><small>across {entries.length} topic{entries.length === 1 ? "" : "s"}</small></div></article>
              </section>

              <section className="ledger-section upcoming-section">
                <div className="section-heading">
                  <div><p className="eyebrow">Revision queue</p><h2>What to review next</h2></div>
                  <button type="button" className="text-action" onClick={() => setActiveView("planner")}>Open full plan <ChevronRight size={15} /></button>
                </div>
                {schedule.length ? (
                  <div className="upcoming-list">
                    {schedule.slice(0, 5).map((item, index) => <RevisionRow key={`${item.entry.id}-${item.key}`} item={item} index={index} onDone={markRevisionDone} onSnooze={snoozeRevision} />)}
                  </div>
                ) : (
                  <EmptyLedger onAdd={openNewEntry} />
                )}
              </section>
            </section>
          )}

          {activeView === "planner" && (
            <section className="view-stack planner-view" aria-label="Revision plan">
              <section className="planner-intro">
                <div><p className="eyebrow">A spaced rhythm</p><h2>Review close to the moment it matters.</h2><p>Each new study session receives five local reminders: one hour, twenty-five hours, eight days, sixteen days, and thirty-one days after the original session.</p></div>
                <div className="revision-rhythm" aria-label="Revision schedule intervals"><span>1h</span><i /><span>25h</span><i /><span>8d</span><i /><span>16d</span><i /><span>31d</span></div>
              </section>
              <section className="ledger-section plan-list-section">
                <div className="section-heading"><div><p className="eyebrow">Active schedule</p><h2>{schedule.length ? `${schedule.length} review${schedule.length === 1 ? "" : "s"} remaining` : "No remaining reviews"}</h2></div><button type="button" className="quiet-action" onClick={() => window.print()}><Printer size={16} /> Print plan</button></div>
                {schedule.length ? <div className="upcoming-list detailed">{schedule.map((item, index) => <RevisionRow key={`${item.entry.id}-${item.key}`} item={item} index={index} onDone={markRevisionDone} onSnooze={snoozeRevision} />)}</div> : <EmptyLedger onAdd={openNewEntry} />}
              </section>
            </section>
          )}

          {activeView === "archive" && (
            <section className="view-stack archive-view" aria-label="All study topics">
              <section className="archive-toolbar ledger-section">
                <div className="toolbar-title"><p className="eyebrow">Stored locally</p><h2>{entries.length} topic{entries.length === 1 ? "" : "s"} in your ledger</h2></div>
                <div className="toolbar-controls">
                  <label className="search-box"><Search size={17} /><span className="sr-only">Search topics and subjects</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your topics" /></label>
                  <label className="select-box"><span className="sr-only">Filter by subject</span><select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}><option value="all">All subjects</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
                </div>
              </section>
              <section className="topic-table-wrap ledger-section">
                {filteredEntries.length ? (
                  <div className="topic-table" role="table" aria-label="Study topics">
                    <div className="topic-head" role="row"><span role="columnheader">Topic</span><span role="columnheader">Study session</span><span role="columnheader">Revision progress</span><span role="columnheader">Next review</span><span role="columnheader" /></div>
                    {filteredEntries.map((entry) => {
                      const entryNext = getSchedule([entry])[0];
                      return <article className="topic-row" role="row" key={entry.id}>
                        <div role="cell" className="topic-title"><span className="subject-swatch">{entry.subject.slice(0, 2).toUpperCase()}</span><div><strong>{entry.topic}</strong><small>{entry.subject}</small></div></div>
                        <div role="cell" className="topic-meta"><Clock size={15} /><span>{formatDate(entry.firstStudy)} · {entry.timeTook}m</span></div>
                        <div role="cell" className="topic-progress"><RevisionBeads entry={entry} /><span>{getCompletion(entry)}/5 complete</span></div>
                        <div role="cell" className={`topic-next ${entryNext && entryNext.dueAt <= now ? "is-due" : ""}`}>{entryNext ? <><strong>{revisionLabels[entryNext.key]}</strong><small>{relativeTime(entryNext.dueAt)}</small></> : <><strong>Complete</strong><small>All reviews finished</small></>}</div>
                        <div role="cell" className="row-menu"><IconButton label={`Actions for ${entry.topic}`} onClick={() => setEntryMenuId((value) => value === entry.id ? null : entry.id)}><span className="dots">•••</span></IconButton>{entryMenuId === entry.id && <div className="entry-popover"><button type="button" onClick={() => openEditEntry(entry)}><Pencil size={15} /> Edit topic</button><button type="button" className="danger" onClick={() => deleteEntry(entry.id)}><Trash2 size={15} /> Remove topic</button></div>}</div>
                      </article>;
                    })}
                  </div>
                ) : (
                  <EmptyLedger onAdd={openNewEntry} text={entries.length ? "No topics match that search." : undefined} />
                )}
              </section>
            </section>
          )}

          {activeView === "settings" && (
            <section className="view-stack settings-view" aria-label="Settings">
              <section className="settings-intro"><div className="settings-intro-icon"><Settings size={24} /></div><div><p className="eyebrow">You are in control</p><h2>Make the desk yours.</h2><p>Your preferences and study records are saved only in this browser’s local storage. Export a backup before clearing browser data or moving devices.</p></div></section>
              <section className="settings-card ledger-section"><div className="settings-heading"><Palette size={19} /><div><h2>Appearance</h2><p>Choose how your study ledger feels across this device.</p></div></div><div className="settings-grid"><SettingGroup label="Color mode" hint="Choose a stable reading surface."><div className="segmented-control">{(["light", "dark", "system"] as ThemePreference[]).map((theme) => <button key={theme} type="button" className={settings.theme === theme ? "is-selected" : ""} onClick={() => setSettings((current) => ({ ...current, theme }))}>{theme === "light" ? <Sun size={15} /> : theme === "dark" ? <Moon size={15} /> : <Monitor size={15} />}<span>{theme}</span></button>)}</div></SettingGroup><SettingGroup label="Signature color" hint="Used for priority signals and your ledger margin."><div className="accent-picker">{(Object.keys(accentTokens) as Accent[]).map((key) => <button key={key} type="button" className={`accent-choice ${settings.accent === key ? "is-selected" : ""}`} onClick={() => setSettings((current) => ({ ...current, accent: key }))}><i style={{ backgroundColor: accentTokens[key].color }} /><span>{accentTokens[key].name}</span>{settings.accent === key && <Check size={15} />}</button>)}</div></SettingGroup><SettingGroup label="Reading density" hint="Controls the breathing room in list views."><div className="segmented-control"><button type="button" className={settings.density === "comfortable" ? "is-selected" : ""} onClick={() => setSettings((current) => ({ ...current, density: "comfortable" }))}>Comfortable</button><button type="button" className={settings.density === "compact" ? "is-selected" : ""} onClick={() => setSettings((current) => ({ ...current, density: "compact" }))}>Compact</button></div></SettingGroup></div></section>
              <section className="settings-card ledger-section"><div className="settings-heading"><Database size={19} /><div><h2>Backup & restore</h2><p>Move a portable copy of your private study ledger whenever you need it.</p></div></div><div className="backup-grid"><article className="backup-action"><div><span className="backup-icon"><Download size={18} /></span><div><h3>Export backup</h3><p>Download every topic, revision state, and appearance preference as JSON.</p></div></div><button type="button" className="quiet-action" onClick={exportBackup}>Export JSON</button></article><article className="backup-action"><div><span className="backup-icon"><Upload size={18} /></span><div><h3>Import backup</h3><p>Restore a compatible Study Track backup. It will replace this device’s data after your confirmation.</p></div></div><button type="button" className="quiet-action" onClick={requestImport}>Choose file</button><input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" onChange={readImport} /></article></div></section>
              <section className="settings-card ledger-section danger-zone"><div className="settings-heading"><Trash2 size={19} /><div><h2>Local data</h2><p>Clearing this removes the saved ledger from this browser. Export a backup first if the records matter.</p></div></div><div className="data-status"><div><span><Database size={16} /> {entries.length} records</span><span><CheckCircle2 size={16} /> Saved automatically</span></div><button type="button" className="danger-action" onClick={() => setConfirmReset(true)}><Trash2 size={16} /> Clear local data</button></div></section>
            </section>
          )}
        </div>
      </main>

      <nav className="mobile-dock" aria-label="Mobile navigation">{navigation.slice(0, 4).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={activeView === item.id ? "is-active" : ""} onClick={() => setActiveView(item.id)}><Icon size={19} /><span>{item.id === "planner" && todayActions.length ? `Plan · ${todayActions.length}` : item.label}</span></button>; })}</nav>

      {formOpen && <EntryDialog draft={draft} editing={Boolean(editingId)} onClose={() => { setFormOpen(false); setEditingId(null); }} onChange={setDraft} onSubmit={handleEntrySubmit} />}
      {pendingImport && <ConfirmDialog title="Restore this backup?" description={`“${pendingImport.name}” contains ${pendingImport.entries.length} study record${pendingImport.entries.length === 1 ? "" : "s"}. Restoring it will replace the records currently saved on this device.`} confirmLabel="Restore backup" icon={<FileUp size={22} />} onCancel={() => setPendingImport(null)} onConfirm={applyImport} />}
      {confirmReset && <ConfirmDialog title="Clear your local ledger?" description="This deletes all Study Track records stored in this browser. If you may want these records again, export a JSON backup before continuing." confirmLabel="Clear local data" destructive icon={<AlertCircle size={22} />} onCancel={() => setConfirmReset(false)} onConfirm={resetAllData} />}
    </div>
  );
}

function RevisionRow({ item, index, onDone, onSnooze }: { item: RevisionAction; index: number; onDone: (entryId: string, key: RevisionKey) => void; onSnooze: (entryId: string, key: RevisionKey) => void }) {
  const due = item.dueAt.getTime() <= Date.now();
  return <article className={`revision-row ${due ? "is-due" : ""}`}><div className="revision-order">{index + 1}</div><div className="revision-main"><div className="revision-title"><strong>{item.entry.topic}</strong><span>{item.entry.subject}</span></div><p>{revisionLabels[item.key]} <i /> <time dateTime={item.dueAt.toISOString()}>{formatDate(item.dueAt)}</time></p></div><div className={`revision-when ${due ? "is-due" : ""}`}><span>{due ? "Ready now" : relativeTime(item.dueAt)}</span><small>{due ? "This review is waiting" : "Scheduled locally"}</small></div><div className="revision-actions"><button type="button" className="mark-done" onClick={() => onDone(item.entry.id, item.key)}><Check size={16} /> <span>Done</span></button><button type="button" className="snooze" onClick={() => onSnooze(item.entry.id, item.key)} title="Snooze one hour"><RotateCcw size={15} /></button></div></article>;
}

function EmptyLedger({ onAdd, text }: { onAdd: () => void; text?: string }) {
  return <div className="empty-ledger"><div className="empty-icon"><BookOpen size={23} /></div><div><h3>{text ?? "No reviews are waiting."}</h3><p>{text ? "Try a different search or subject filter." : "Start a topic and its spaced review plan will be saved here on this device."}</p></div>{!text && <button type="button" className="primary-action" onClick={onAdd}><Plus size={16} /> Add a topic</button>}</div>;
}

function SettingGroup({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return <article className="setting-group"><div><h3>{label}</h3><p>{hint}</p></div>{children}</article>;
}

function EntryDialog({ draft, editing, onClose, onChange, onSubmit }: { draft: EntryDraft; editing: boolean; onClose: () => void; onChange: (draft: EntryDraft) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-layer" role="presentation"><button type="button" className="modal-scrim" aria-label="Close editor" onClick={onClose} /><section className="entry-dialog" role="dialog" aria-modal="true" aria-labelledby="entry-dialog-title"><header><div><p className="eyebrow">{editing ? "Refine your ledger" : "A new study record"}</p><h2 id="entry-dialog-title">{editing ? "Edit topic" : "Add what you studied"}</h2></div><IconButton label="Close editor" onClick={onClose}><X size={18} /></IconButton></header><form onSubmit={onSubmit}><label className="form-field"><span>Topic</span><input autoFocus value={draft.topic} onChange={(event) => onChange({ ...draft, topic: event.target.value })} placeholder="e.g. Algebraic equations" required /></label><div className="form-grid"><label className="form-field"><span>Subject</span><select value={draft.subject} onChange={(event) => onChange({ ...draft, subject: event.target.value })}>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label><label className="form-field"><span>Focused minutes</span><input value={draft.timeTook} onChange={(event) => onChange({ ...draft, timeTook: event.target.value })} type="number" min="0" inputMode="numeric" required /></label></div><label className="form-field"><span>Study date & time</span><input value={draft.firstStudy} onChange={(event) => onChange({ ...draft, firstStudy: event.target.value })} type="datetime-local" required /></label><div className="schedule-preview"><CalendarClock size={17} /><p><strong>Five revisions will be scheduled automatically.</strong> 1 hour, 25 hours, 8 days, 16 days, and 31 days after this study session.</p></div><footer><button type="button" className="quiet-action" onClick={onClose}>Cancel</button><button type="submit" className="primary-action">{editing ? <Pencil size={16} /> : <Plus size={16} />}{editing ? "Save changes" : "Add to ledger"}</button></footer></form></section></div>;
}

function ConfirmDialog({ title, description, confirmLabel, destructive = false, icon, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; destructive?: boolean; icon: React.ReactNode; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-layer" role="presentation"><button type="button" className="modal-scrim" aria-label="Cancel" onClick={onCancel} /><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title"><div className={`confirm-icon ${destructive ? "is-danger" : ""}`}>{icon}</div><h2 id="confirm-dialog-title">{title}</h2><p>{description}</p><footer><button type="button" className="quiet-action" onClick={onCancel}>Cancel</button><button type="button" className={destructive ? "danger-action" : "primary-action"} onClick={onConfirm}>{confirmLabel}</button></footer></section></div>;
}
