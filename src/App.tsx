import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Battery,
  Camera,
  CheckCircle2,
  Clock3,
  Droplets,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  Palette,
  Settings2,
  ShieldCheck,
  Thermometer,
  Wifi,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertMode,
  DemoDevice,
  DemoSpeed,
  DemoTemplate,
  DeviceStatus,
  demoTemplates,
} from './data/demoTemplates';

type TabState = Record<string, 'live' | 'trend'>;
type Overrides = Partial<Record<'temperature' | 'humidity' | 'light' | 'airQuality', string>>;
type AppMode = 'setup' | 'dashboard';
type CustomConfig = {
  customerName: string;
  siteName: string;
  supervisor: string;
  logoUrl: string;
  customerLogo: string;
  numiLogo: string;
  primaryColour: string;
  secondaryColour: string;
};

type SavedDashboardConfig = {
  mode: AppMode;
  sector: string;
  templateId: string;
  siteId: string;
  demoSpeed: DemoSpeed;
  alertMode: AlertMode;
  custom: CustomConfig;
  overrides: Overrides;
};

const speedMs: Record<DemoSpeed, number> = {
  Slow: 5000,
  Normal: 3200,
  Fast: 2000,
};

const drift = (value: number, amount: number, min: number, max: number) => {
  const movement = (Math.random() - 0.48) * amount;
  const visibleMovement = Math.abs(movement) < 0.08 ? (Math.random() > 0.5 ? 0.1 : -0.1) : movement;
  return Number(Math.min(max, Math.max(min, value + visibleMovement)).toFixed(1));
};

const syncTime = () =>
  new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

const formatNumber = (value: number | undefined, suffix = '', digits = 1) =>
  value === undefined ? 'N/A' : `${value.toFixed(digits)}${suffix}`;

const avg = (values: number[]) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const numeric = Number.parseInt(value, 16);
  const red = (numeric >> 16) & 255;
  const green = (numeric >> 8) & 255;
  const blue = numeric & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getTemplateDefaults = (template: DemoTemplate, site = template.sites[0]): CustomConfig => ({
  customerName: template.customerName,
  siteName: site.name,
  supervisor: site.supervisor,
  logoUrl: template.logoUrl,
  customerLogo: '',
  numiLogo: '',
  primaryColour: template.primaryColour,
  secondaryColour: template.secondaryColour,
});

const getInitials = (name: string) =>
  name
    .split(/[ /&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'MN';

const readImageAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadSavedDashboard = (): SavedDashboardConfig | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('mealnest-iot-dashboard-config');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDashboardConfig;
    const template = demoTemplates.find((item) => item.id === parsed.templateId);
    const site = template?.sites.find((item) => item.id === parsed.siteId);
    if (!template || !site) return null;
    const defaults = getTemplateDefaults(template, site);
    return {
      ...parsed,
      custom: {
        ...defaults,
        ...parsed.custom,
        customerLogo: parsed.custom?.customerLogo ?? '',
        numiLogo: parsed.custom?.numiLogo ?? '',
      },
      overrides: parsed.overrides ?? {},
    };
  } catch {
    return null;
  }
};

const statusClass = (status: DeviceStatus) => {
  if (status === 'Critical') return 'border-red-200 bg-red-50 text-red-700 ring-1 ring-red-100';
  if (status === 'Warning') return 'border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-amber-100';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
};

const inferStatus = (device: DemoDevice, alertMode: AlertMode): DeviceStatus => {
  if (alertMode === 'Critical' && ['Door sensor', 'Hot holding station', 'IoT camera'].includes(device.category)) {
    return 'Critical';
  }
  if (alertMode === 'Warning' && ['Hot holding station', 'IoT camera'].includes(device.category)) {
    return 'Warning';
  }
  if (device.category === 'Hot holding station' && (device.reading.durationMins ?? 0) > 118) return 'Warning';
  if (device.category === 'Door sensor' && (device.reading.openDuration ?? 0) > 130) return 'Warning';
  if (device.category === 'Dishwasher IoT' && !device.reading.pass) return 'Critical';
  if (device.category === 'Probe thermometer' && !device.reading.pass) return 'Critical';
  if (device.category === 'Delivery cold-chain sensor' && device.reading.excursionRisk === 'High') return 'Critical';
  return device.status === 'Critical' ? 'Critical' : device.status === 'Warning' ? 'Warning' : 'Online';
};

const simulateDevices = (devices: DemoDevice[], alertMode: AlertMode, overrides: Overrides): DemoDevice[] => {
  const time = syncTime();
  return devices.map((device) => {
    const reading = { ...device.reading };
    if (reading.temperature !== undefined) reading.temperature = drift(reading.temperature, 0.65, -22, 85);
    if (reading.humidity !== undefined) reading.humidity = drift(reading.humidity, 1.2, 25, 72);
    if (reading.light !== undefined) reading.light = Math.round(drift(reading.light, 22, 120, 900));
    if (reading.airQuality !== undefined) reading.airQuality = Math.round(drift(reading.airQuality, 2.6, 8, 92));
    if (reading.foodTemp !== undefined) reading.foodTemp = drift(reading.foodTemp, 0.42, 60, 82);
    if (reading.washTemp !== undefined) reading.washTemp = drift(reading.washTemp, 0.42, 57, 70);
    if (reading.rinseTemp !== undefined) reading.rinseTemp = drift(reading.rinseTemp, 0.38, 79, 88);
    if (reading.holdingTemp !== undefined) reading.holdingTemp = drift(reading.holdingTemp, 0.48, -21, 75);
    if (reading.dispatchTemp !== undefined) reading.dispatchTemp = drift(reading.dispatchTemp, 0.35, 0, 8);
    if (reading.durationMins !== undefined) reading.durationMins = Math.min(145, reading.durationMins + 1);
    if (reading.battery !== undefined) reading.battery = Math.max(18, Number((reading.battery - 0.05).toFixed(1)));
    if (reading.confidence !== undefined) reading.confidence = Math.round(drift(reading.confidence, 3, 55, 96));
    if (device.category === 'Door sensor') {
      reading.doorOpen = alertMode === 'Critical' || Math.random() > 0.72;
      reading.openDuration = reading.doorOpen ? Math.round((reading.openDuration ?? 0) + 8) : 0;
      reading.accessCount = (reading.accessCount ?? 0) + (reading.doorOpen ? 1 : 0);
      reading.doorEvents = reading.doorOpen ? 1 : 0;
    }
    if (device.category === 'IoT camera') {
      reading.spillDetected = alertMode !== 'Normal' && Math.random() > 0.35;
      reading.obstructionDetected = alertMode === 'Critical';
      reading.motionDetected = alertMode === 'Critical' || Math.random() > 0.28;
      reading.eventCount = Number(Boolean(reading.motionDetected)) + Number(Boolean(reading.spillDetected)) + Number(Boolean(reading.obstructionDetected));
    }
    if (device.category === 'Dishwasher IoT') {
      reading.pass = (reading.rinseTemp ?? 0) >= 82 && (reading.washTemp ?? 0) >= 60;
      reading.cycleStatus = Math.random() > 0.82 ? 'In cycle' : 'Completed';
      if (reading.cycleStatus === 'Completed') reading.lastCompletedCycle = time;
    }
    if (device.category === 'Probe thermometer') {
      reading.pass = (reading.foodTemp ?? 0) >= 74;
    }
    if (device.category === 'Hot holding station') {
      reading.pass = (reading.holdingTemp ?? 0) >= 60 && (reading.durationMins ?? 0) < 135;
    }
    if (device.category === 'Cold holding station') {
      reading.pass = (reading.holdingTemp ?? 0) <= 5 && (reading.dispatchTemp ?? 0) <= 5;
    }
    if (device.category === 'Delivery cold-chain sensor') {
      const temp = reading.temperature ?? 0;
      reading.excursionRisk = temp > 6 ? 'High' : temp > 5 ? 'Medium' : 'Low';
      reading.routeStage = temp > 5 ? 'Supervisor review' : reading.routeStage;
    }
    if (device.category === 'Environmental sensor') {
      if (reading.temperature !== undefined) reading.temperature = drift(reading.temperature + 0.12, 0.2, 0, 18);
      if (reading.humidity !== undefined) reading.humidity = drift(reading.humidity + 0.18, 0.4, 30, 68);
      if (reading.light !== undefined) reading.light = Math.round(drift(reading.light + 3, 10, 120, 900));
      if (reading.airQuality !== undefined) reading.airQuality = Math.round(drift(reading.airQuality + 0.3, 1.2, 8, 92));
      if (overrides.temperature) reading.temperature = Number(overrides.temperature);
      if (overrides.humidity) reading.humidity = Number(overrides.humidity);
      if (overrides.light) reading.light = Number(overrides.light);
      if (overrides.airQuality) reading.airQuality = Number(overrides.airQuality);
    }
    const status = inferStatus({ ...device, reading }, alertMode);
    const trendPoint = {
      time,
      temperature: reading.temperature ?? reading.holdingTemp ?? reading.foodTemp ?? reading.dispatchTemp ?? device.trend.at(-1)?.temperature ?? 0,
      humidity: reading.humidity ?? device.trend.at(-1)?.humidity ?? 48,
      light: reading.light ?? device.trend.at(-1)?.light ?? 460,
      airQuality: reading.airQuality ?? device.trend.at(-1)?.airQuality ?? 28,
      foodTemp: reading.foodTemp ?? device.trend.at(-1)?.foodTemp ?? 0,
      washTemp: reading.washTemp ?? device.trend.at(-1)?.washTemp ?? 0,
      rinseTemp: reading.rinseTemp ?? device.trend.at(-1)?.rinseTemp ?? 0,
      holdingTemp: reading.holdingTemp ?? reading.temperature ?? device.trend.at(-1)?.holdingTemp ?? 0,
      durationMins: reading.durationMins ?? device.trend.at(-1)?.durationMins ?? 0,
      confidence: reading.confidence ?? device.trend.at(-1)?.confidence ?? 0,
      eventCount: reading.eventCount ?? 0,
      doorEvents: reading.doorEvents ?? 0,
    };
    return {
      ...device,
      status,
      reading,
      lastSync: time,
      trend: [...device.trend.slice(-17), trendPoint],
    };
  });
};

function App() {
  const savedDashboard = useMemo(() => loadSavedDashboard(), []);
  const sectors = Array.from(new Set(demoTemplates.map((template) => template.sector)));
  const [mode, setMode] = useState<AppMode>(savedDashboard?.mode === 'dashboard' ? 'dashboard' : 'setup');
  const [sector, setSector] = useState(savedDashboard?.sector ?? demoTemplates[0].sector);
  const [templateId, setTemplateId] = useState(savedDashboard?.templateId ?? demoTemplates[0].id);
  const [siteId, setSiteId] = useState(savedDashboard?.siteId ?? demoTemplates[0].sites[0].id);
  const [demoSpeed, setDemoSpeed] = useState<DemoSpeed>(savedDashboard?.demoSpeed ?? 'Normal');
  const [alertMode, setAlertMode] = useState<AlertMode>(savedDashboard?.alertMode ?? 'Normal');
  const [activeTabs, setActiveTabs] = useState<TabState>({});
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [overrides, setOverrides] = useState<Overrides>(savedDashboard?.overrides ?? {});
  const [custom, setCustom] = useState<CustomConfig>(() => savedDashboard?.custom ?? getTemplateDefaults(demoTemplates[0], demoTemplates[0].sites[0]));
  const [devices, setDevices] = useState(demoTemplates[0].sites[0].devices);

  const sectorTemplates = useMemo(
    () => demoTemplates.filter((template) => template.sector === sector),
    [sector],
  );
  const selectedTemplate = useMemo(
    () => demoTemplates.find((template) => template.id === templateId) ?? sectorTemplates[0],
    [sectorTemplates, templateId],
  );
  const selectedSite = useMemo(
    () => selectedTemplate.sites.find((site) => site.id === siteId) ?? selectedTemplate.sites[0],
    [selectedTemplate, siteId],
  );

  useEffect(() => {
    const nextTemplate = sectorTemplates[0];
    if (!sectorTemplates.some((template) => template.id === templateId)) {
      setTemplateId(nextTemplate.id);
      setSiteId(nextTemplate.sites[0].id);
    }
  }, [sector, sectorTemplates, templateId]);

  useEffect(() => {
    setDevices(selectedSite.devices);
    if (mode === 'setup') {
      setCustom(getTemplateDefaults(selectedTemplate, selectedSite));
      setOverrides({});
    }
    setLastUpdated(new Date());
  }, [selectedTemplate, selectedSite, mode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDevices((current) => simulateDevices(current, alertMode, overrides));
      setLastUpdated(new Date());
    }, speedMs[demoSpeed]);
    return () => window.clearInterval(timer);
  }, [alertMode, demoSpeed, overrides]);

  useEffect(() => {
    if (mode !== 'dashboard' || typeof window === 'undefined') return;
    const payload: SavedDashboardConfig = {
      mode,
      sector,
      templateId,
      siteId,
      demoSpeed,
      alertMode,
      custom,
      overrides,
    };
    window.localStorage.setItem('mealnest-iot-dashboard-config', JSON.stringify(payload));
  }, [alertMode, custom, demoSpeed, mode, overrides, sector, siteId, templateId]);

  const averages = useMemo(() => {
    const temperatures = devices
      .map((device) => device.reading.temperature)
      .filter((value): value is number => typeof value === 'number');
    const humidities = devices
      .map((device) => device.reading.humidity)
      .filter((value): value is number => typeof value === 'number');
    const lights = devices
      .map((device) => device.reading.light)
      .filter((value): value is number => typeof value === 'number');
    const airQuality = devices
      .map((device) => device.reading.airQuality)
      .filter((value): value is number => typeof value === 'number');
    const alerts = devices.filter((device) => device.status !== 'Online').length;
    return {
      temperature: avg(temperatures),
      humidity: avg(humidities),
      light: avg(lights),
      airQuality: avg(airQuality),
      alerts,
    };
  }, [devices]);

  const online = devices.filter((device) => device.status !== 'Critical').length;
  const customerLogoSrc = custom.customerLogo || custom.logoUrl;
  const brandStyle = {
    '--brand': custom.primaryColour,
    '--brand2': custom.secondaryColour,
    '--brand-soft': hexToRgba(custom.primaryColour, 0.1),
    '--brand-border': hexToRgba(custom.primaryColour, 0.22),
    '--brand2-soft': hexToRgba(custom.secondaryColour, 0.12),
  } as React.CSSProperties;

  const launchDashboard = () => {
    setMode('dashboard');
    setSettingsOpen(false);
    setLastUpdated(new Date());
  };

  const backToSetup = () => {
    setMode('setup');
    setSettingsOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mealnest-iot-dashboard-config');
    }
  };

  if (mode === 'setup') {
    return (
      <SetupScreen
        sectors={sectors}
        sector={sector}
        setSector={setSector}
        sectorTemplates={sectorTemplates}
        templateId={templateId}
        setTemplateId={(id) => {
          const template = demoTemplates.find((item) => item.id === id);
          setTemplateId(id);
          if (template) setSiteId(template.sites[0].id);
        }}
        selectedTemplate={selectedTemplate}
        siteId={siteId}
        setSiteId={setSiteId}
        custom={custom}
        setCustom={setCustom}
        demoSpeed={demoSpeed}
        setDemoSpeed={setDemoSpeed}
        alertMode={alertMode}
        setAlertMode={setAlertMode}
        overrides={overrides}
        setOverrides={setOverrides}
        launchDashboard={launchDashboard}
        brandStyle={brandStyle}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-900" style={brandStyle}>
      <header className="border-b border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-4 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-base font-bold text-white shadow-soft">
                {customerLogoSrc ? <img src={customerLogoSrc} alt={`${custom.customerName} logo`} className="h-full w-full rounded-lg object-contain p-1" /> : <span>{getInitials(custom.customerName)}</span>}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-normal text-slate-950">{custom.customerName}</h1>
                  <LiveBadge />
                </div>
                <p className="mt-1 text-sm font-medium text-slate-600">IoT Command Centre <span className="text-slate-400">powered by MealNest</span></p>
                <p className="mt-1 text-xs text-slate-500">
                  {sector} {' · '} {custom.siteName} {' · '} Live telemetry and timestamped evidence for regulated food operations.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 lg:justify-end">
              <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <Clock3 className="h-4 w-4 text-[var(--brand)]" />
                Last updated {lastUpdated.toLocaleTimeString()}
              </span>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                onClick={() => setSettingsOpen(true)}
                aria-label="Admin settings"
              >
                <Settings2 className="h-4 w-4" />
                Admin
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1500px] gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="space-y-5">
          <SummaryCards averages={averages} />
          <StatusStrip supervisor={custom.supervisor} online={online} total={devices.length} updated={lastUpdated} />
          {devices.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  activeTab={activeTabs[device.id] ?? 'live'}
                  setActiveTab={(tab) => setActiveTabs((current) => ({ ...current, [device.id]: tab }))}
                  brand={custom.primaryColour}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No devices configured" body="Return to setup to load telemetry for another customer environment." />
          )}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <InsightsPanel insights={selectedSite.insights} devices={devices} numiLogo={custom.numiLogo} />
          <CompliancePanel />
        </aside>
      </section>

      {settingsOpen && (
        <ConfigDrawer
          custom={custom}
          setCustom={setCustom}
          alertMode={alertMode}
          setAlertMode={setAlertMode}
          demoSpeed={demoSpeed}
          setDemoSpeed={setDemoSpeed}
          overrides={overrides}
          setOverrides={setOverrides}
          templateDefaults={getTemplateDefaults(selectedTemplate, selectedSite)}
          resetToDefaults={() => {
            setCustom(getTemplateDefaults(selectedTemplate, selectedSite));
            setAlertMode('Normal');
            setDemoSpeed('Normal');
            setOverrides({});
          }}
          backToSetup={backToSetup}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}

function SetupScreen(props: {
  sectors: string[];
  sector: string;
  setSector: (value: any) => void;
  sectorTemplates: DemoTemplate[];
  templateId: string;
  setTemplateId: (value: string) => void;
  selectedTemplate: DemoTemplate;
  siteId: string;
  setSiteId: (value: string) => void;
  custom: CustomConfig;
  setCustom: React.Dispatch<React.SetStateAction<CustomConfig>>;
  demoSpeed: DemoSpeed;
  setDemoSpeed: (value: DemoSpeed) => void;
  alertMode: AlertMode;
  setAlertMode: (value: AlertMode) => void;
  overrides: Overrides;
  setOverrides: React.Dispatch<React.SetStateAction<Overrides>>;
  launchDashboard: () => void;
  brandStyle: React.CSSProperties;
}) {
  const selectedSite = props.selectedTemplate.sites.find((site) => site.id === props.siteId) ?? props.selectedTemplate.sites[0];
  const customerLogoSrc = props.custom.customerLogo || props.custom.logoUrl;
  const updateCustom = (key: keyof CustomConfig, value: string) => {
    props.setCustom((current) => ({ ...current, [key]: value }));
  };
  const initials = getInitials(props.custom.customerName);

  return (
    <main className="min-h-screen bg-[#f3f6fa] px-5 py-8 text-slate-900 lg:px-8" style={props.brandStyle}>
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">Private pre-demo setup</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Generate a client-facing command centre</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Configure the customer environment, branding and live telemetry posture before launching the dedicated customer dashboard.
            </p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Presenter only
          </span>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Setup Configuration</h2>
              <p className="mt-1 text-sm text-slate-600">These presenter controls are hidden from the client-facing dashboard.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Select label="Sector" value={props.sector} onChange={props.setSector} options={props.sectors} />
              <Select
                label="Customer/template"
                value={props.templateId}
                onChange={props.setTemplateId}
                options={props.sectorTemplates.map((template) => ({ value: template.id, label: template.customerName }))}
              />
              <Select
                label="Site/location"
                value={props.siteId}
                onChange={props.setSiteId}
                options={props.selectedTemplate.sites.map((site) => ({ value: site.id, label: site.name }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Customer display name" value={props.custom.customerName} onChange={(value) => updateCustom('customerName', value)} />
              <Field label="Site display name" value={props.custom.siteName} onChange={(value) => updateCustom('siteName', value)} />
              <Field label="Supervisor name" value={props.custom.supervisor} onChange={(value) => updateCustom('supervisor', value)} />
              <Field label="Logo URL" value={props.custom.logoUrl} onChange={(value) => updateCustom('logoUrl', value)} placeholder="https://example.com/logo.png" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <LogoUpload
                label="Upload customer or MealNest logo"
                value={props.custom.customerLogo}
                fallbackValue={props.custom.logoUrl}
                onChange={(value) => updateCustom('customerLogo', value)}
              />
              <LogoUpload
                label="Upload NUMI logo"
                value={props.custom.numiLogo}
                onChange={(value) => updateCustom('numiLogo', value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ColourField icon={<Palette className="h-4 w-4" />} label="Primary colour" value={props.custom.primaryColour} onChange={(value) => updateCustom('primaryColour', value)} />
              <ColourField icon={<Palette className="h-4 w-4" />} label="Secondary colour" value={props.custom.secondaryColour} onChange={(value) => updateCustom('secondaryColour', value)} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Demo speed" value={props.demoSpeed} onChange={props.setDemoSpeed} options={['Slow', 'Normal', 'Fast']} />
              <Select label="Alert mode" value={props.alertMode} onChange={props.setAlertMode} options={['Normal', 'Warning', 'Critical']} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Optional key reading overrides</p>
              <p className="mt-1 text-xs text-slate-500">Leave blank to use live simulated telemetry from the selected template.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {[
                  { key: 'temperature' as const, label: 'Temperature C' },
                  { key: 'humidity' as const, label: 'Humidity %' },
                  { key: 'light' as const, label: 'Light lux' },
                  { key: 'airQuality' as const, label: 'Air quality AQI' },
                ].map((item) => (
                  <Field
                    key={item.key}
                    label={item.label}
                    value={props.overrides[item.key] ?? ''}
                    onChange={(value) => props.setOverrides((current) => ({ ...current, [item.key]: value }))}
                    placeholder="Auto"
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Dashboard preview</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white">
                  {customerLogoSrc ? <img src={customerLogoSrc} alt="" className="h-full w-full rounded-lg object-contain p-1" /> : initials}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-slate-950">{props.custom.customerName}</h2>
                  <p className="text-sm font-medium text-slate-700">IoT Command Centre powered by MealNest</p>
                  <p className="text-xs text-slate-500">{props.sector} · {props.custom.siteName}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 text-sm text-slate-700">
                <span className="rounded-md bg-slate-50 px-3 py-2">Supervisor {props.custom.supervisor}</span>
                <span className="rounded-md bg-slate-50 px-3 py-2">{selectedSite.devices.length}/{selectedSite.devices.length} configured devices</span>
                <span className="rounded-md bg-slate-50 px-3 py-2">{props.demoSpeed} speed · {props.alertMode} alert mode</span>
                <span className="rounded-md bg-slate-50 px-3 py-2">Audit-ready telemetry · Cold chain assurance</span>
              </div>
            </div>
            <button
              onClick={props.launchDashboard}
              className="w-full rounded-md border border-[var(--brand-border)] bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
            >
              Generate Dashboard
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}

function LiveBadge() {
  return (
    <span className="live-pulse inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">
      <span className="h-2 w-2 rounded-full bg-[var(--brand)]" />
      Live
    </span>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: any) => void;
  options: Array<string | { value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <select
        className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[var(--brand)] focus:bg-white focus:ring-2 focus:ring-[var(--brand-soft)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </label>
  );
}

function SummaryCards({ averages }: { averages: { temperature: number; humidity: number; light: number; airQuality: number; alerts: number } }) {
  const cards = [
    { label: 'Avg Temperature', value: `${averages.temperature.toFixed(1)}°C`, detail: 'Live average', icon: Thermometer },
    { label: 'Avg Humidity', value: `${averages.humidity.toFixed(1)}%`, detail: 'Ambient control', icon: Droplets },
    { label: 'Avg Light', value: `${Math.round(averages.light)} lux`, detail: 'Work area visibility', icon: Lightbulb },
    { label: 'Avg Air Quality', value: `${Math.round(averages.airQuality)} AQI`, detail: 'Environmental signal', icon: Gauge },
    { label: 'Alerts', value: averages.alerts ? `${averages.alerts} Active` : 'All Clear', detail: 'Warning/Critical', icon: AlertTriangle },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, detail, icon: Icon }) => (
        <article key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function StatusStrip({ supervisor, online, total, updated }: { supervisor: string; online: number; total: number; updated: Date }) {
  const items = [
    `Supervisor ${supervisor}`,
    `${online}/${total} Devices Online`,
    `Updated at ${updated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`,
    'Audit-ready telemetry',
    'Export-ready evidence',
    'Cold chain assurance',
    'CAPA-ready events',
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
      <LiveBadge />
      {items.map((item) => (
        <span key={item} className="inline-flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5">
          <ShieldCheck className="h-4 w-4 text-[var(--brand)]" />
          {item}
        </span>
      ))}
    </div>
  );
}

function DeviceCard({ device, activeTab, setActiveTab, brand }: {
  device: DemoDevice;
  activeTab: 'live' | 'trend';
  setActiveTab: (tab: 'live' | 'trend') => void;
  brand: string;
}) {
  return (
    <article className={`rounded-lg border bg-white shadow-sm transition hover:shadow-soft ${device.status === 'Critical' ? 'border-red-200' : device.status === 'Warning' ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-950">{device.zone}</h2>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass(device.status)}`}>{device.status}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{device.name} {' · '} {device.category}</p>
            <p className="mt-2 text-xs text-slate-500">
              {device.model} {' · '} {device.deviceId} {' · '} {device.firmware} {' · '} {device.lastSync}
            </p>
          </div>
          <DeviceIcon category={device.category} />
        </div>
      </div>
      <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <TabButton active={activeTab === 'live'} onClick={() => setActiveTab('live')}>Live Readings</TabButton>
        <TabButton active={activeTab === 'trend'} onClick={() => setActiveTab('trend')}>Trend Charts</TabButton>
      </div>
      <div className="p-4">
        {activeTab === 'live' ? <LiveReadings device={device} /> : <TrendChart device={device} brand={brand} />}
      </div>
    </article>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition ${active ? 'border border-[var(--brand-border)] bg-white text-[var(--brand)] shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'}`}
    >
      {children}
    </button>
  );
}

function LiveReadings({ device }: { device: DemoDevice }) {
  const riskStatus = device.status === 'Online' ? 'Safe' : device.status;
  const rows = readingRows(device, riskStatus);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">{row.label}</p>
            <p className="text-xs text-slate-500">{row.threshold}</p>
          </div>
          <p className="max-w-[180px] text-right text-sm font-semibold text-slate-950">{row.value}</p>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-500">
        <span className="rounded border border-slate-100 bg-white px-2 py-1">Timestamped readings</span>
        <span className="rounded border border-slate-100 bg-white px-2 py-1">HACCP monitoring</span>
        <span className="rounded border border-slate-100 bg-white px-2 py-1">Device health</span>
      </div>
    </div>
  );
}

function readingRows(device: DemoDevice, riskStatus: string) {
  const lastSync = device.lastSync;
  const passFail = device.reading.pass ? 'Pass' : 'Fail';
  const yesNo = (value?: boolean) => (value ? 'Yes' : 'No');

  switch (device.category) {
    case 'Environmental sensor':
      return [
        { label: 'Temperature', value: formatNumber(device.reading.temperature, '°C'), threshold: device.thresholds.temperature },
        { label: 'Humidity', value: formatNumber(device.reading.humidity, '%'), threshold: device.thresholds.humidity },
        { label: 'Light', value: `${Math.round(device.reading.light ?? 0)} lux`, threshold: 'Operational lighting baseline' },
        { label: 'Air Quality', value: `${Math.round(device.reading.airQuality ?? 0)} AQI`, threshold: device.thresholds.airQuality },
        { label: 'Threshold status', value: riskStatus, threshold: 'Calculated against configured limits' },
        { label: 'Last sync', value: lastSync, threshold: 'Export-ready timestamp' },
      ];
    case 'Probe thermometer':
      return [
        { label: 'Food item or batch', value: device.reading.linkedItem ?? 'Prepared food batch', threshold: 'Linked production record' },
        { label: 'Core temperature', value: formatNumber(device.reading.foodTemp, '°C'), threshold: device.thresholds.foodTemp },
        { label: 'Required threshold', value: device.thresholds.foodTemp ?? '>= 74°C', threshold: 'HACCP verification' },
        { label: 'Pass/fail status', value: passFail, threshold: 'Timestamped probe check' },
        { label: 'Timestamp', value: lastSync, threshold: 'Audit-ready reading' },
      ];
    case 'Dishwasher IoT':
      return [
        { label: 'Wash temperature', value: formatNumber(device.reading.washTemp, '°C'), threshold: device.thresholds.washTemp },
        { label: 'Rinse temperature', value: formatNumber(device.reading.rinseTemp, '°C'), threshold: device.thresholds.rinseTemp },
        { label: 'Cycle status', value: device.reading.cycleStatus ?? 'Completed', threshold: 'Latest machine heartbeat' },
        { label: 'Sanitisation pass/fail', value: passFail, threshold: 'Automated sanitisation evidence' },
        { label: 'Last completed cycle', value: device.reading.lastCompletedCycle ?? lastSync, threshold: 'Export-ready cycle timestamp' },
      ];
    case 'Hot holding station':
      return [
        { label: 'Holding temperature', value: formatNumber(device.reading.holdingTemp, '°C'), threshold: device.thresholds.holdingTemp },
        { label: 'Holding duration', value: `${Math.round(device.reading.durationMins ?? 0)} mins`, threshold: device.thresholds.durationMins },
        { label: 'Safe / warning / critical status', value: riskStatus, threshold: 'Holding time and temperature rule' },
      ];
    case 'Cold holding station':
      return [
        { label: 'Holding temperature', value: formatNumber(device.reading.holdingTemp, '°C'), threshold: device.thresholds.holdingTemp },
        { label: 'Dispatch temperature', value: formatNumber(device.reading.dispatchTemp, '°C'), threshold: device.thresholds.dispatchTemp },
        { label: 'Safe / warning / critical status', value: riskStatus, threshold: 'Cold chain assurance' },
        { label: 'Last sync', value: lastSync, threshold: 'Timestamped reading' },
      ];
    case 'IoT camera':
      return [
        { label: 'Motion detected', value: yesNo(device.reading.motionDetected), threshold: 'Computer vision event' },
        { label: 'Spill detected', value: yesNo(device.reading.spillDetected), threshold: 'Supervisor verification trigger' },
        { label: 'Obstruction/unattended zone', value: yesNo(device.reading.obstructionDetected), threshold: 'Incident/CAPA trigger ready' },
        { label: 'Confidence score', value: `${Math.round(device.reading.confidence ?? 0)}%`, threshold: device.thresholds.confidence },
        { label: 'Event timestamp', value: lastSync, threshold: 'Timestamped camera event' },
      ];
    case 'Door sensor':
      return [
        { label: 'Door open/closed', value: device.reading.doorOpen ? 'Open' : 'Closed', threshold: 'Door contact state' },
        { label: 'Open duration', value: `${Math.round(device.reading.openDuration ?? 0)} sec`, threshold: device.thresholds.openDuration },
        { label: 'Repeated access count', value: String(device.reading.accessCount ?? 0), threshold: device.thresholds.accessCount },
        { label: 'Risk status', value: riskStatus, threshold: 'Repeated access and open duration' },
      ];
    case 'Delivery cold-chain sensor':
      return [
        { label: 'Current temperature', value: formatNumber(device.reading.temperature, '°C'), threshold: device.thresholds.temperature },
        { label: 'Route stage', value: device.reading.routeStage ?? 'In transit', threshold: 'Delivery milestone' },
        { label: 'Excursion risk', value: device.reading.excursionRisk ?? 'Low', threshold: 'Cold chain assurance' },
        { label: 'Last sync', value: lastSync, threshold: 'Timestamped route reading' },
      ];
    default:
      return [
        { label: 'Online/offline', value: device.reading.online === false ? 'Offline' : 'Online', threshold: device.thresholds.online },
        { label: 'Battery percentage', value: `${Math.round(device.reading.battery ?? 0)}%`, threshold: device.thresholds.battery },
        { label: 'Maintenance risk', value: device.reading.maintenanceRisk ?? 'Low', threshold: 'Device health' },
        { label: 'Last sync', value: lastSync, threshold: 'Device heartbeat' },
      ];
  }
}

function TrendChart({ device, brand }: { device: DemoDevice; brand: string }) {
  const series = trendSeries(device, brand);
  if (!device.trend.length) {
    return <EmptyState title="No trend history yet" body="Live readings will populate this chart as telemetry arrives." />;
  }
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {series.map((line) => (
          <span key={line.key} className="inline-flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.stroke }} />
            {line.name}
          </span>
        ))}
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={device.trend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={18} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }} />
            {series.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.stroke}
                strokeWidth={line.width}
                dot={false}
                isAnimationActive
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function trendSeries(device: DemoDevice, brand: string) {
  const muted = '#64748b';
  const amber = '#d97706';
  const red = '#dc2626';
  switch (device.category) {
    case 'Environmental sensor':
      return [
        { key: 'temperature', name: 'Temperature trend', stroke: brand, width: 2.5 },
        { key: 'humidity', name: 'Humidity trend', stroke: muted, width: 2 },
        { key: 'airQuality', name: 'Air quality trend', stroke: amber, width: 2 },
      ];
    case 'Probe thermometer':
      return [{ key: 'foodTemp', name: 'Core temperature trend', stroke: brand, width: 2.5 }];
    case 'Dishwasher IoT':
      return [
        { key: 'washTemp', name: 'Wash temperature trend', stroke: brand, width: 2.5 },
        { key: 'rinseTemp', name: 'Rinse temperature trend', stroke: muted, width: 2 },
      ];
    case 'Hot holding station':
      return [
        { key: 'holdingTemp', name: 'Holding temperature trend', stroke: brand, width: 2.5 },
        { key: 'durationMins', name: 'Holding duration trend', stroke: amber, width: 2 },
      ];
    case 'IoT camera':
      return [
        { key: 'eventCount', name: 'Events detected over time', stroke: red, width: 2.5 },
        { key: 'confidence', name: 'Confidence score trend', stroke: brand, width: 2 },
      ];
    case 'Door sensor':
      return [{ key: 'doorEvents', name: 'Door open events over time', stroke: amber, width: 2.5 }];
    case 'Delivery cold-chain sensor':
      return [{ key: 'temperature', name: 'Delivery temperature trend', stroke: brand, width: 2.5 }];
    case 'Cold holding station':
      return [
        { key: 'holdingTemp', name: 'Holding temperature trend', stroke: brand, width: 2.5 },
        { key: 'temperature', name: 'Dispatch temperature trend', stroke: muted, width: 2 },
      ];
    default:
      return [
        { key: 'temperature', name: 'Device signal trend', stroke: brand, width: 2.5 },
        { key: 'confidence', name: 'Health confidence trend', stroke: muted, width: 2 },
      ];
  }
}

function DeviceIcon({ category }: { category: DemoDevice['category'] }) {
  const Icon = category === 'IoT camera' ? Camera : category === 'Equipment health sensor' ? Battery : category === 'Environmental sensor' ? Activity : Wifi;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-100 bg-slate-50 text-slate-600">
      <Icon className="h-5 w-5" />
    </div>
  );
}

function InsightsPanel({ insights, devices, numiLogo }: { insights: string[]; devices: DemoDevice[]; numiLogo: string }) {
  const alertCount = devices.filter((device) => device.status !== 'Online').length;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">NUMI Live Insights</h2>
          <p className="mt-1 text-sm text-slate-600">Operational compliance translated from live telemetry.</p>
        </div>
        <div className="flex h-10 w-20 shrink-0 items-center justify-center rounded-md bg-[var(--brand-soft)] p-2 text-[var(--brand)]">
          {numiLogo ? (
            <img src={numiLogo} alt="NUMI logo" className="h-full w-full object-contain" />
          ) : (
            <LayoutDashboard className="h-5 w-5" />
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded border border-slate-100 bg-slate-50 px-2 py-1">HACCP monitoring</span>
        <span className="rounded border border-slate-100 bg-slate-50 px-2 py-1">Cold chain assurance</span>
        <span className="rounded border border-slate-100 bg-slate-50 px-2 py-1">CAPA-ready</span>
      </div>
      <div className="mt-4 space-y-3">
        {insights.length ? insights.map((insight, index) => (
          <div key={insight} className={`rounded-md border p-3 ${index < alertCount ? 'border-amber-100 bg-amber-50/60' : 'border-slate-100 bg-slate-50'}`}>
            <div className="flex gap-3">
              {index < alertCount ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
              <p className="text-sm leading-6 text-slate-700">{insight}</p>
            </div>
          </div>
        )) : <EmptyState title="No NUMI insights yet" body="Insights appear when site telemetry and alerts are available." />}
      </div>
    </section>
  );
}

function CompliancePanel() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Compliance Evidence Layer</h2>
      <p className="mt-1 text-sm text-slate-600">Timestamped telemetry is structured for inspection, audit reporting and incident/CAPA workflows.</p>
      <div className="mt-4 grid gap-2 text-sm text-slate-700">
        {['Cold chain assurance', 'Timestamped readings', 'Incident/CAPA trigger ready', 'Export-ready evidence', 'Device health'].map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--brand)]" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}

function LogoUpload({
  label,
  value,
  fallbackValue,
  onChange,
}: {
  label: string;
  value: string;
  fallbackValue?: string;
  onChange: (value: string) => void;
}) {
  const preview = value || fallbackValue || '';

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    onChange(await readImageAsDataUrl(file));
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-200 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:border-slate-300"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
      </label>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex h-14 w-24 items-center justify-center rounded-md border border-slate-200 bg-white p-2">
          {preview ? (
            <img src={preview} alt={`${label} preview`} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs font-medium text-slate-400">No logo</span>
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Remove logo
          </button>
        )}
      </div>
    </div>
  );
}

function ConfigDrawer(props: {
  custom: CustomConfig;
  setCustom: React.Dispatch<React.SetStateAction<CustomConfig>>;
  alertMode: AlertMode;
  setAlertMode: (value: AlertMode) => void;
  demoSpeed: DemoSpeed;
  setDemoSpeed: (value: DemoSpeed) => void;
  overrides: Overrides;
  setOverrides: React.Dispatch<React.SetStateAction<Overrides>>;
  templateDefaults: CustomConfig;
  resetToDefaults: () => void;
  backToSetup: () => void;
  onClose: () => void;
}) {
  const updateCustom = (key: keyof CustomConfig, value: string) => {
    props.setCustom((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]">
      <aside className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">Admin controls</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Enterprise Configuration</h2>
            <p className="mt-1 text-sm text-slate-600">Private configuration for this customer environment. No backend required.</p>
            </div>
            <button onClick={props.onClose} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Close settings">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-soft)] p-3">
            <p className="text-sm font-semibold text-slate-900">{props.custom.customerName || props.templateDefaults.customerName}</p>
            <p className="mt-1 text-xs text-slate-600">
              {props.custom.siteName || props.templateDefaults.siteName} · Supervisor {props.custom.supervisor || props.templateDefaults.supervisor}
            </p>
          </div>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader title="Identity" description="Customer, site and supervisor labels used throughout the dashboard." />
            <div className="mt-4 grid gap-3">
              <Field label="Customer/template name" value={props.custom.customerName} onChange={(value) => updateCustom('customerName', value)} />
              <Field label="Site name" value={props.custom.siteName} onChange={(value) => updateCustom('siteName', value)} />
              <Field label="Supervisor name" value={props.custom.supervisor} onChange={(value) => updateCustom('supervisor', value)} />
              <Field label="Logo URL" value={props.custom.logoUrl} onChange={(value) => updateCustom('logoUrl', value)} placeholder="https://example.com/logo.png" />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader title="Branding" description="Primary colour drives key controls; secondary colour supports subtle highlights." />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <LogoUpload
                label="Upload customer or MealNest logo"
                value={props.custom.customerLogo}
                fallbackValue={props.custom.logoUrl}
                onChange={(value) => updateCustom('customerLogo', value)}
              />
              <LogoUpload
                label="Upload NUMI logo"
                value={props.custom.numiLogo}
                onChange={(value) => updateCustom('numiLogo', value)}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ColourField icon={<Palette className="h-4 w-4" />} label="Primary colour" value={props.custom.primaryColour} onChange={(value) => updateCustom('primaryColour', value)} />
              <ColourField icon={<Palette className="h-4 w-4" />} label="Secondary colour" value={props.custom.secondaryColour} onChange={(value) => updateCustom('secondaryColour', value)} />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader title="Live Behaviour" description="Control telemetry speed, alert posture and selected manual readings." />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Select label="Alert mode" value={props.alertMode} onChange={props.setAlertMode} options={['Normal', 'Warning', 'Critical']} />
              <Select label="Demo speed" value={props.demoSpeed} onChange={props.setDemoSpeed} options={['Slow', 'Normal', 'Fast']} />
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">Manual reading override</p>
              <p className="mt-1 text-xs text-slate-500">Optional values override the environmental sensor for presenter storytelling.</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  { key: 'temperature' as const, label: 'Temperature C' },
                  { key: 'humidity' as const, label: 'Humidity %' },
                  { key: 'light' as const, label: 'Light lux' },
                  { key: 'airQuality' as const, label: 'Air quality AQI' },
                ].map((item) => (
                  <Field
                    key={item.key}
                    label={item.label}
                    value={props.overrides[item.key] ?? ''}
                    onChange={(value) => props.setOverrides((current) => ({ ...current, [item.key]: value }))}
                    placeholder="Auto"
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">No backend required</p>
            <p className="mt-1 text-sm text-slate-600">Changes apply immediately to the active dashboard.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={props.backToSetup}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300"
            >
              Back to Setup
            </button>
            <button
              onClick={props.resetToDefaults}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300"
            >
              Reset to template defaults
            </button>
            <button
              onClick={props.onClose}
              className="rounded-md border border-[var(--brand-border)] bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white shadow-sm hover:brightness-95"
            >
              Apply changes
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <input
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ColourField({ label, value, onChange, icon }: { label: string; value: string; onChange: (value: string) => void; icon: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{icon}{label}</span>
      <div className="flex h-10 overflow-hidden rounded-md border border-slate-200 bg-white focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand-soft)]">
        <input type="color" className="h-10 w-12 border-0 bg-white p-1" value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} />
        <input className="min-w-0 flex-1 border-0 px-2 text-sm outline-none" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`${label} hex value`} />
      </div>
    </label>
  );
}

export default App;
