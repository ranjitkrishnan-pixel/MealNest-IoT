export type Sector =
  | 'Healthcare'
  | 'Aged Care'
  | 'Community Kitchen'
  | 'Aviation Catering'
  | 'Childcare';

export type AlertMode = 'Normal' | 'Warning' | 'Critical';
export type DemoSpeed = 'Slow' | 'Normal' | 'Fast';
export type DeviceStatus = 'Online' | 'Warning' | 'Critical';
export type DeviceCategory =
  | 'Environmental sensor'
  | 'Probe thermometer'
  | 'Dishwasher IoT'
  | 'Hot holding station'
  | 'Cold holding station'
  | 'IoT camera'
  | 'Door sensor'
  | 'Delivery cold-chain sensor'
  | 'Equipment health sensor';

export type TrendPoint = {
  time: string;
  temperature: number;
  humidity: number;
  light: number;
  airQuality: number;
  foodTemp: number;
  washTemp: number;
  rinseTemp: number;
  holdingTemp: number;
  durationMins: number;
  confidence: number;
  eventCount: number;
  doorEvents: number;
};

export type DeviceReading = {
  temperature?: number;
  humidity?: number;
  light?: number;
  airQuality?: number;
  foodTemp?: number;
  washTemp?: number;
  rinseTemp?: number;
  holdingTemp?: number;
  dispatchTemp?: number;
  durationMins?: number;
  battery?: number;
  confidence?: number;
  openDuration?: number;
  accessCount?: number;
  motionDetected?: boolean;
  spillDetected?: boolean;
  obstructionDetected?: boolean;
  doorOpen?: boolean;
  online?: boolean;
  pass?: boolean;
  routeStage?: string;
  cycleStatus?: string;
  linkedItem?: string;
  maintenanceRisk?: string;
  excursionRisk?: string;
  eventCount?: number;
  doorEvents?: number;
  lastCompletedCycle?: string;
};

export type DemoDevice = {
  id: string;
  name: string;
  zone: string;
  category: DeviceCategory;
  model: string;
  deviceId: string;
  firmware: string;
  lastSync: string;
  status: DeviceStatus;
  thresholds: Record<string, string>;
  reading: DeviceReading;
  trend: TrendPoint[];
};

export type DemoSite = {
  id: string;
  name: string;
  supervisor: string;
  zones: string[];
  devices: DemoDevice[];
  insights: string[];
};

export type DemoTemplate = {
  id: string;
  sector: Sector;
  customerName: string;
  logoUrl: string;
  primaryColour: string;
  secondaryColour: string;
  sites: DemoSite[];
};

const nowLabel = (offsetMins: number) => {
  const date = new Date(Date.now() - offsetMins * 60_000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatSyncTime = (offsetSeconds = 0) =>
  new Date(Date.now() - offsetSeconds * 1000).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

const makeTrend = (reading: DeviceReading): TrendPoint[] =>
  Array.from({ length: 12 }, (_, index) => {
    const wave = Math.sin(index / 1.7) * 0.45;
    const temperature = reading.temperature ?? reading.holdingTemp ?? reading.foodTemp ?? reading.dispatchTemp ?? 8;
    const humidity = reading.humidity ?? 48;
    const light = reading.light ?? 460;
    const airQuality = reading.airQuality ?? 28;
    const eventPulse = index % 4 === 0 ? 1 : 0;
    return {
      time: nowLabel((11 - index) * 4),
      temperature: Number((temperature + wave).toFixed(1)),
      humidity: Number((humidity + Math.cos(index / 2) * 1.2).toFixed(1)),
      light: Math.round(light + Math.sin(index / 2.2) * 24),
      airQuality: Math.max(1, Math.round(airQuality + Math.cos(index / 2.4) * 3)),
      foodTemp: Number(((reading.foodTemp ?? temperature) + wave * 0.8).toFixed(1)),
      washTemp: Number(((reading.washTemp ?? 62) + wave * 0.5).toFixed(1)),
      rinseTemp: Number(((reading.rinseTemp ?? 83) + wave * 0.4).toFixed(1)),
      holdingTemp: Number(((reading.holdingTemp ?? temperature) + wave * 0.55).toFixed(1)),
      durationMins: Math.max(0, Math.round((reading.durationMins ?? 0) - (11 - index) * 3)),
      confidence: Math.max(40, Math.min(98, Math.round((reading.confidence ?? 80) + Math.sin(index / 2) * 5))),
      eventCount: reading.eventCount ?? eventPulse,
      doorEvents: reading.doorEvents ?? eventPulse,
    };
  });

const modelByCategory: Record<DeviceCategory, { model: string; deviceId: string; firmware: string }> = {
  'Environmental sensor': { model: 'ArcticSense Pro X1', deviceId: 'AS-PRO-X1', firmware: 'v3.2.1' },
  'Probe thermometer': { model: 'ThermoProbe Elite T2', deviceId: 'TP-EL-T2', firmware: 'v2.8.0' },
  'Dishwasher IoT': { model: 'DishGuard 5000', deviceId: 'DG-5000', firmware: 'v4.1.2' },
  'Hot holding station': { model: 'HoldSafe Station H1', deviceId: 'HS-H1', firmware: 'v1.9.4' },
  'Cold holding station': { model: 'ColdSafe Station C1', deviceId: 'CS-C1', firmware: 'v2.3.5' },
  'IoT camera': { model: 'VisionSpill Cam V2', deviceId: 'VSC-V2', firmware: 'v3.0.7' },
  'Door sensor': { model: 'DoorWatch Sentinel D1', deviceId: 'DWS-D1', firmware: 'v2.2.6' },
  'Delivery cold-chain sensor': { model: 'RouteTemp Link R3', deviceId: 'RTL-R3', firmware: 'v4.4.0' },
  'Equipment health sensor': { model: 'EquipPulse Health E1', deviceId: 'EPH-E1', firmware: 'v1.7.8' },
};

const device = (
  id: string,
  name: string,
  zone: string,
  category: DeviceCategory,
  status: DeviceStatus,
  reading: DeviceReading,
  thresholds: Record<string, string>,
): DemoDevice => ({
  ...modelByCategory[category],
  id,
  name,
  zone,
  category,
  status,
  lastSync: formatSyncTime(id.length * 4),
  thresholds,
  reading,
  trend: makeTrend(reading),
});

type SiteScenario = {
  id: string;
  name: string;
  supervisor: string;
  prefix: string;
  zones: string[];
  insights: string[];
  batchLabel: string;
  routeStage: string;
  statuses?: Partial<Record<DeviceCategory, DeviceStatus>>;
  base?: Partial<{
    ambientTemp: number;
    humidity: number;
    light: number;
    airQuality: number;
    coreTemp: number;
    washTemp: number;
    rinseTemp: number;
    hotTemp: number;
    hotDuration: number;
    coldTemp: number;
    dispatchTemp: number;
    freezerTemp: number;
    routeTemp: number;
    battery: number;
    accessCount: number;
    confidence: number;
  }>;
};

const base = {
  ambientTemp: 10.2,
  humidity: 48.2,
  light: 460,
  airQuality: 26,
  coreTemp: 74.8,
  washTemp: 63.1,
  rinseTemp: 83.5,
  hotTemp: 63.2,
  hotDuration: 96,
  coldTemp: 3.2,
  dispatchTemp: 4.1,
  freezerTemp: -18.4,
  routeTemp: 3.8,
  battery: 91,
  accessCount: 8,
  confidence: 87,
};

const buildScenarioDevices = (scenario: SiteScenario): DemoDevice[] => {
  const value = { ...base, ...scenario.base };
  const status = (category: DeviceCategory, fallback: DeviceStatus = 'Online') => scenario.statuses?.[category] ?? fallback;
  const z = scenario.zones;
  return [
    device(`${scenario.prefix}-env`, `${z[0]} Ambient Monitor`, z[0], 'Environmental sensor', status('Environmental sensor'), {
      temperature: value.ambientTemp,
      humidity: value.humidity,
      light: value.light,
      airQuality: value.airQuality,
    }, { temperature: '8-15 C preparation envelope', humidity: '35-60%', light: '>= 350 lux operational visibility', airQuality: '< 50 AQI' }),
    device(`${scenario.prefix}-cool`, `${z[1]} Cool Room Sensor`, z[1], 'Cold holding station', status('Cold holding station'), {
      holdingTemp: value.coldTemp,
      dispatchTemp: value.dispatchTemp,
      pass: value.coldTemp <= 5 && value.dispatchTemp <= 5,
    }, { holdingTemp: '0-5 C chilled storage', dispatchTemp: '<= 5 C dispatch release' }),
    device(`${scenario.prefix}-freezer`, `${z[2]} Freezer Telemetry`, z[2], 'Cold holding station', status('Cold holding station'), {
      holdingTemp: value.freezerTemp,
      dispatchTemp: value.freezerTemp + 1.2,
      pass: value.freezerTemp <= -18,
    }, { holdingTemp: '<= -18 C frozen storage', dispatchTemp: '<= -15 C transfer tolerance' }),
    device(`${scenario.prefix}-probe`, `${z[3]} Probe Verification`, z[3], 'Probe thermometer', status('Probe thermometer'), {
      foodTemp: value.coreTemp,
      pass: value.coreTemp >= 74,
      linkedItem: scenario.batchLabel,
    }, { foodTemp: '>= 74 C core temperature verification' }),
    device(`${scenario.prefix}-dish`, `${z[4]} Dishwasher Sanitisation`, z[4], 'Dishwasher IoT', status('Dishwasher IoT'), {
      washTemp: value.washTemp,
      rinseTemp: value.rinseTemp,
      cycleStatus: 'Completed',
      pass: value.washTemp >= 60 && value.rinseTemp >= 82,
      lastCompletedCycle: formatSyncTime(84),
    }, { washTemp: '>= 60 C wash stage', rinseTemp: '>= 82 C sanitisation rinse' }),
    device(`${scenario.prefix}-hot`, `${z[5]} Hot Holding Station`, z[5], 'Hot holding station', status('Hot holding station'), {
      holdingTemp: value.hotTemp,
      durationMins: value.hotDuration,
      pass: value.hotTemp >= 60 && value.hotDuration < 135,
    }, { holdingTemp: '>= 60 C hot holding', durationMins: '< 120 mins preferred; CAPA review above 135 mins' }),
    device(`${scenario.prefix}-cold-hold`, `${z[6]} Cold Holding Bay`, z[6], 'Cold holding station', status('Cold holding station'), {
      holdingTemp: value.coldTemp + 0.4,
      dispatchTemp: value.dispatchTemp + 0.2,
      pass: value.coldTemp <= 5,
    }, { holdingTemp: '0-5 C service holding', dispatchTemp: '<= 5 C release check' }),
    device(`${scenario.prefix}-cam`, `${z[7]} Vision Safety Camera`, z[7], 'IoT camera', status('IoT camera', 'Warning'), {
      motionDetected: true,
      spillDetected: status('IoT camera', 'Warning') !== 'Online',
      obstructionDetected: status('IoT camera') === 'Critical',
      confidence: value.confidence,
      eventCount: status('IoT camera', 'Warning') === 'Online' ? 0 : 1,
    }, { confidence: 'Supervisor review above 80% confidence' }),
    device(`${scenario.prefix}-door`, `${z[8]} Door Access Sensor`, z[8], 'Door sensor', status('Door sensor'), {
      doorOpen: status('Door sensor') === 'Critical',
      openDuration: status('Door sensor') === 'Critical' ? 164 : status('Door sensor') === 'Warning' ? 82 : 0,
      accessCount: value.accessCount,
      doorEvents: status('Door sensor') === 'Online' ? 0 : 1,
    }, { openDuration: '< 120 sec door-open tolerance', accessCount: 'Repeated access reviewed during dispatch window' }),
    device(`${scenario.prefix}-route`, `${z[9]} Delivery Cold Chain`, z[9], 'Delivery cold-chain sensor', status('Delivery cold-chain sensor'), {
      temperature: value.routeTemp,
      routeStage: scenario.routeStage,
      excursionRisk: value.routeTemp > 6 ? 'High' : value.routeTemp > 5 ? 'Medium' : 'Low',
    }, { temperature: '0-5 C delivery cold chain' }),
    device(`${scenario.prefix}-health`, `${z[10]} Equipment Health Node`, z[10], 'Equipment health sensor', status('Equipment health sensor'), {
      online: status('Equipment health sensor') !== 'Critical',
      battery: value.battery,
      maintenanceRisk: value.battery < 30 ? 'Medium' : 'Low',
    }, { battery: '> 20% battery reserve', online: 'Heartbeat every 5 mins' }),
  ];
};

const site = (scenario: SiteScenario): DemoSite => ({
  id: scenario.id,
  name: scenario.name,
  supervisor: scenario.supervisor,
  zones: scenario.zones,
  devices: buildScenarioDevices(scenario),
  insights: scenario.insights,
});

export const demoTemplates: DemoTemplate[] = [
  {
    id: 'singhealth-food-services',
    sector: 'Healthcare',
    customerName: 'SingHealth Food Services',
    logoUrl: '',
    primaryColour: '#0f766e',
    secondaryColour: '#0ea5a4',
    sites: [
      site({
        id: 'central-production-kitchen',
        name: 'Central Production Kitchen',
        supervisor: 'Amelia Tan',
        prefix: 'sh-cpk',
        zones: ['Main Production Kitchen', 'Chilled Ingredient Cool Room', 'Freezer Room A', 'Therapeutic Meal Probe Bench', 'Dishwash Area', 'Ward Delivery Holding Area', 'Cold Plating Bay', 'Allergen-Controlled Prep Area', 'Loading Bay Door', 'Ward Trolley Dispatch', 'Combi Oven Bank'],
        batchLabel: 'Batch SH-2407 texture modified renal meal',
        routeStage: 'Ward trolley release',
        statuses: { 'Hot holding station': 'Warning', 'IoT camera': 'Warning' },
        insights: [
          'HACCP monitoring shows chilled ingredients and ward dispatch readings are timestamped and audit-ready.',
          'Allergen-controlled prep area has one camera verification event pending supervisor sign-off.',
          'Texture modified meal batch SH-2407 passed core temperature verification for patient meal service.',
          'Cold chain assurance remains stable across ward trolley dispatch.',
          'Dishwasher sanitisation passed the latest rinse threshold with export-ready evidence.',
        ],
      }),
      site({
        id: 'ward-meal-dispatch-hub',
        name: 'Ward Meal Dispatch Hub',
        supervisor: 'Marcus Lim',
        prefix: 'sh-wdh',
        zones: ['Dispatch Control Desk', 'Ward Trolley Cool Room', 'Frozen Backup Store', 'Final Meal Probe Point', 'Trolley Wash Bay', 'Hot Trolley Holding Lane', 'Cold Tray Holding Lane', 'Camera View Ward Dispatch', 'Dock Door 3', 'Lift Lobby Cold Chain', 'Trolley Charger Bank'],
        batchLabel: 'Batch SH-2511 puree diet supper trolley',
        routeStage: 'Lift lobby handover',
        statuses: { 'Door sensor': 'Warning', 'Delivery cold-chain sensor': 'Warning' },
        base: { routeTemp: 5.2, accessCount: 18, hotDuration: 88 },
        insights: [
          'Ward dispatch door activity is elevated during meal trolley release; cold chain assurance remains under review.',
          'HACCP monitoring confirms timestamped audit evidence for hot and cold trolley lanes.',
          'Texture modified meal governance record SH-2511 is linked to final probe verification.',
          'Repeated dock access may require dispatch workflow review before peak service.',
          'Allergen control handover remains within configured verification thresholds.',
        ],
      }),
      site({
        id: 'specialist-diet-kitchen',
        name: 'Specialist Diet Kitchen',
        supervisor: 'Drishti Rao',
        prefix: 'sh-sdk',
        zones: ['Specialist Diet Kitchen', 'Low-Allergen Cool Room', 'Texture Modified Freezer', 'Dietetic Probe Station', 'Utensil Sanitisation Bay', 'Modified Texture Hot Hold', 'Chilled Diet Tray Bay', 'Allergen Camera Checkpoint', 'Restricted Access Door', 'Diet Tray Dispatch Route', 'Blender Maintenance Node'],
        batchLabel: 'Batch SH-2630 allergen-free minced moist lunch',
        routeStage: 'Diet tray dispatch',
        statuses: { 'Cold holding station': 'Warning' },
        base: { coldTemp: 4.8, dispatchTemp: 5.1, coreTemp: 75.1, confidence: 91 },
        insights: [
          'Allergen control checkpoint has timestamped evidence for specialist diet tray release.',
          'Texture modified meal governance is linked to batch SH-2630 probe readings.',
          'Cold room is near upper HACCP range; supervisor review recommended before next dispatch.',
          'Dishwasher sanitisation and utensil segregation evidence are export-ready.',
          'Specialist diet kitchen telemetry supports audit-ready patient safety records.',
        ],
      }),
    ],
  },
  {
    id: 'aged-care-provider',
    sector: 'Aged Care',
    customerName: 'Aged Care Provider',
    logoUrl: '',
    primaryColour: '#1f6f8b',
    secondaryColour: '#60a5fa',
    sites: [
      site({
        id: 'the-ponds-care-home',
        name: 'The Ponds Care Home',
        supervisor: 'Priya Nair',
        prefix: 'ac-ponds',
        zones: ['Main Kitchen', 'Cool Room 1', 'Freezer Store', 'Texture Modified Meal Probe Bench', 'Dishwasher', 'Hot Holding Bay', 'Servery Cold Holding', 'Resident Dining Camera', 'Kitchen Delivery Door', 'Wing A Meal Trolley', 'Fridge Compressor Health'],
        batchLabel: 'Batch AC-118 texture modified beef casserole',
        routeStage: 'Wing A trolley handover',
        statuses: { 'Hot holding station': 'Warning', 'Equipment health sensor': 'Warning' },
        base: { hotDuration: 118, battery: 29 },
        insights: [
          'Texture modified meal governance is active for batch AC-118 with timestamped audit evidence.',
          'HACCP monitoring shows hot holding approaching preferred duration; service timing review recommended.',
          'Cold chain assurance remains stable for Wing A trolley handover.',
          'Allergen control checks remain clear in the main kitchen workflow.',
          'Fridge compressor health is trending toward maintenance review.',
        ],
      }),
      site({
        id: 'wattle-grove-residence',
        name: 'Wattle Grove Residence',
        supervisor: 'Daniel Brooks',
        prefix: 'ac-wattle',
        zones: ['Residence Kitchen', 'Dairy Cool Room', 'Frozen Dessert Store', 'Puree Meal Probe Station', 'Dishwasher', 'Servery Hot Hold', 'Dessert Cold Hold', 'Dining Room Camera', 'Servery Door', 'Resident Meal Route', 'Dishwasher Pump Health'],
        batchLabel: 'Batch AC-204 minced moist chicken lunch',
        routeStage: 'Resident dining delivery',
        statuses: { 'Door sensor': 'Warning', 'IoT camera': 'Online' },
        base: { accessCount: 21, coreTemp: 75.4, coldTemp: 3.6 },
        insights: [
          'Resident dining dispatch has repeated servery door access during service.',
          'Texture modified meal governance record AC-204 passed core temperature verification.',
          'HACCP monitoring and allergen control evidence are timestamped for audit review.',
          'Cold chain assurance for dairy and dessert holding is within range.',
          'Dishwasher sanitisation completed with export-ready evidence.',
        ],
      }),
      site({
        id: 'north-wing-servery',
        name: 'North Wing Servery',
        supervisor: 'Elena Foster',
        prefix: 'ac-north',
        zones: ['North Wing Servery', 'Servery Cool Drawer', 'Frozen Supplement Store', 'Snack Probe Point', 'Compact Dishwasher', 'Breakfast Hot Hold', 'Cold Dessert Bay', 'Servery Camera', 'Dining Access Door', 'Meal Cart Route', 'Milk Fridge Health'],
        batchLabel: 'Batch AC-331 fortified breakfast porridge',
        routeStage: 'Meal cart to rooms',
        statuses: { 'Cold holding station': 'Online' },
        base: { ambientTemp: 9.8, routeTemp: 4.2, hotDuration: 73 },
        insights: [
          'North Wing timestamped audit evidence is ready for routine care governance review.',
          'Texture modified breakfast batch AC-331 passed HACCP probe verification.',
          'Cold chain assurance remains stable across servery and meal cart movement.',
          'Allergen control and fortified meal handling records are current.',
          'Dishwasher sanitisation threshold passed on the latest compact cycle.',
        ],
      }),
    ],
  },
  {
    id: 'meals-on-wheels-community',
    sector: 'Community Kitchen',
    customerName: 'Meals on Wheels / Community Kitchen',
    logoUrl: '',
    primaryColour: '#2f6f4e',
    secondaryColour: '#65a30d',
    sites: [
      site({
        id: 'community-production-kitchen',
        name: 'Community Production Kitchen',
        supervisor: 'Sofia Nguyen',
        prefix: 'ck-prod',
        zones: ['Production Kitchen', 'Ingredient Cool Room', 'Frozen Meal Store', 'Batch Probe Bench', 'Dishwash Area', 'Hot Holding Station', 'Packing Line Cold Bay', 'Volunteer Prep Camera', 'Dispatch Roller Door', 'Delivery Route Sensors', 'Mixer Health Node'],
        batchLabel: 'Batch MW-410 chicken and vegetable meals',
        routeStage: 'Route A staging',
        statuses: { 'IoT camera': 'Warning' },
        insights: [
          'Production batch MW-410 has audit-ready batch traceability linked to probe verification.',
          'Volunteer prep camera detected a workflow exception requiring supervisor verification.',
          'Meal packing line cold holding remains within delivery cold chain range.',
          'Dispatch telemetry is timestamped and ready for community kitchen audit review.',
          'Dishwasher cycle passed sanitisation threshold after production cleanup.',
        ],
      }),
      site({
        id: 'dispatch-and-packing-hub',
        name: 'Dispatch and Packing Hub',
        supervisor: 'Owen Clarke',
        prefix: 'ck-pack',
        zones: ['Packing Control Area', 'Dispatch Fridge', 'Frozen Backup Meals', 'Final Batch Probe', 'Crate Wash Bay', 'Hot Meal Holding Rack', 'Cold Meal Packing Bench', 'Packing Line Camera', 'Dispatch Dock Door', 'Delivery Van Cold Chain', 'Label Printer Health'],
        batchLabel: 'Batch MW-422 chilled meal packs',
        routeStage: 'Van loading',
        statuses: { 'Door sensor': 'Critical', 'Delivery cold-chain sensor': 'Warning' },
        base: { routeTemp: 5.6, accessCount: 26, coldTemp: 4.4 },
        insights: [
          'Dispatch dock door has exceeded open-duration tolerance during van loading.',
          'Delivery cold chain is showing medium excursion risk for chilled meal packs.',
          'Meal packing batch MW-422 remains linked to timestamped probe and label records.',
          'Audit-ready batch traceability is available for dispatch and packing handover.',
          'Crate wash sanitisation passed on latest completed cycle.',
        ],
      }),
      site({
        id: 'volunteer-prep-zone',
        name: 'Volunteer Prep Zone',
        supervisor: 'Lina Haddad',
        prefix: 'ck-vol',
        zones: ['Volunteer Prep Zone', 'Produce Cool Room', 'Frozen Emergency Stock', 'Soup Batch Probe', 'Volunteer Dishwash', 'Soup Hot Hold', 'Cold Sandwich Bay', 'Prep Bench Camera', 'Volunteer Entry Door', 'Community Route Cool Box', 'Scale Battery Node'],
        batchLabel: 'Batch MW-437 soup and sandwich service',
        routeStage: 'Community cool box check',
        statuses: { 'Equipment health sensor': 'Warning' },
        base: { battery: 31, hotDuration: 91, routeTemp: 3.9 },
        insights: [
          'Volunteer prep records are timestamped for audit-ready batch traceability.',
          'Production batch MW-437 passed core temperature verification before meal packing.',
          'Delivery cold chain is stable across community cool box staging.',
          'Scale battery is approaching maintenance threshold before the next volunteer shift.',
          'Prep bench camera shows no spill or obstruction event at current confidence.',
        ],
      }),
    ],
  },
  {
    id: 'aviation-catering',
    sector: 'Aviation Catering',
    customerName: 'Aviation Catering',
    logoUrl: '',
    primaryColour: '#334155',
    secondaryColour: '#0f766e',
    sites: [
      site({
        id: 'flight-catering-unit',
        name: 'Flight Catering Unit',
        supervisor: 'Noah Patel',
        prefix: 'av-fcu',
        zones: ['High-Volume Production Area', 'Chilled Assembly Cool Room', 'Frozen Uplift Store', 'Meal Tray Probe Station', 'Wash Bay', 'Flight Cart Hot Hold', 'Chilled Assembly Line', 'Allergen Control Camera', 'Loading Dock Door', 'Flight Cart Staging Route', 'Blast Chiller Health'],
        batchLabel: 'Flight batch SQ-782 economy hot meal',
        routeStage: 'Flight cart staging',
        statuses: { 'Hot holding station': 'Warning', 'IoT camera': 'Warning' },
        base: { hotDuration: 124, confidence: 89, light: 520 },
        insights: [
          'Flight cart staging is approaching preferred hot holding duration before uplift.',
          'Chilled assembly telemetry remains in range for high-volume production release.',
          'Allergen control camera has one verification event on the assembly lane.',
          'Cold chain dispatch evidence is timestamped for aviation catering audit review.',
          'Loading dock control remains stable during current flight cart staging window.',
        ],
      }),
      site({
        id: 'cold-chain-dispatch',
        name: 'Cold Chain Dispatch',
        supervisor: 'Isabelle Koh',
        prefix: 'av-cold',
        zones: ['Dispatch Control Room', 'Airside Dispatch Fridge', 'Frozen Cart Store', 'Dispatch Probe Bench', 'Cart Wash Bay', 'Crew Meal Hot Hold', 'Cold Chain Dispatch Lane', 'Loading Dock Camera', 'Airside Dock Door', 'Airside Tug Route', 'Refrigerated Dock Health'],
        batchLabel: 'Flight batch QF-144 chilled entree carts',
        routeStage: 'Airside tug transfer',
        statuses: { 'Delivery cold-chain sensor': 'Warning', 'Door sensor': 'Warning' },
        base: { routeTemp: 5.4, accessCount: 24, coldTemp: 4.6 },
        insights: [
          'Cold chain dispatch is showing medium excursion risk during airside tug transfer.',
          'Loading dock control has repeated access during the current dispatch window.',
          'Flight cart records are timestamped and ready for export as evidence.',
          'Chilled assembly release remains within aviation catering cold chain limits.',
          'Allergen control checks are current for chilled entree carts.',
        ],
      }),
      site({
        id: 'high-volume-assembly-line',
        name: 'High Volume Assembly Line',
        supervisor: 'Kara Mitchell',
        prefix: 'av-hva',
        zones: ['Assembly Control Line', 'Chilled Garnish Room', 'Frozen Dessert Store', 'Tray Probe Point', 'Utensil Wash Tunnel', 'Premium Meal Hot Hold', 'Chilled Assembly Belt', 'Line Camera Sentinel', 'Assembly Access Door', 'Cart Marshalling Route', 'Conveyor Health Node'],
        batchLabel: 'Flight batch EK-511 premium tray line',
        routeStage: 'Cart marshalling',
        statuses: { 'Equipment health sensor': 'Warning' },
        base: { battery: 34, ambientTemp: 9.1, coreTemp: 75.2 },
        insights: [
          'High-volume production telemetry remains stable across chilled assembly.',
          'Conveyor health is approaching maintenance review before the next production wave.',
          'Flight cart staging route has timestamped cold chain evidence.',
          'Allergen control lane checks are complete for premium tray line EK-511.',
          'Wash tunnel sanitisation passed the latest cycle threshold.',
        ],
      }),
    ],
  },
  {
    id: 'hospital-group',
    sector: 'Healthcare',
    customerName: 'Hospital Group',
    logoUrl: '',
    primaryColour: '#1d4ed8',
    secondaryColour: '#0891b2',
    sites: [
      site({
        id: 'hospital-main-kitchen',
        name: 'Hospital Main Kitchen',
        supervisor: 'Grace Wilson',
        prefix: 'hg-main',
        zones: ['Hospital Main Kitchen', 'Main Cool Room', 'Frozen Stock Room', 'Patient Meal Probe Bench', 'Dishwash Tunnel', 'Hot Meal Holding Bank', 'Cold Tray Assembly', 'Allergen Lane Camera', 'Receiving Door', 'Ward Route Cold Chain', 'Oven Battery Node'],
        batchLabel: 'Batch HG-920 cardiac diet lunch',
        routeStage: 'Ward route release',
        statuses: { 'IoT camera': 'Warning' },
        insights: [
          'HACCP monitoring is active across main kitchen, cold tray assembly and ward route release.',
          'Allergen lane camera has one supervisor verification item pending.',
          'Patient meal batch HG-920 is linked to timestamped audit evidence.',
          'Cold chain assurance remains stable from tray assembly to ward route.',
          'Dishwash tunnel sanitisation passed the latest rinse threshold.',
        ],
      }),
      site({
        id: 'multi-site-command-view',
        name: 'Multi-Site Command View',
        supervisor: 'Ethan Wong',
        prefix: 'hg-mscv',
        zones: ['Network Command Desk', 'Campus Cool Room Rollup', 'Network Freezer Rollup', 'Remote Probe Exceptions', 'Sanitisation Rollup', 'Hot Holding Exceptions', 'Cold Holding Exceptions', 'Network Camera Review', 'Receiving Door Rollup', 'Intercampus Cold Chain', 'Equipment Health Rollup'],
        batchLabel: 'Network batch HG-944 renal diet rollup',
        routeStage: 'Intercampus transfer',
        statuses: { 'Delivery cold-chain sensor': 'Warning', 'Equipment health sensor': 'Warning' },
        base: { routeTemp: 5.3, battery: 28, accessCount: 16 },
        insights: [
          'Multi-site command view highlights one cold chain assurance item for intercampus transfer.',
          'HACCP monitoring rollup is export-ready with timestamped audit evidence.',
          'Allergen control and specialist diet exceptions are visible across hospital sites.',
          'Equipment health rollup shows one maintenance risk before evening service.',
          'Texture modified meal governance records are linked to remote probe exceptions.',
        ],
      }),
      site({
        id: 'patient-meal-plating-line',
        name: 'Patient Meal Plating Line',
        supervisor: 'Hannah McKenzie',
        prefix: 'hg-pmpl',
        zones: ['Plating Line Control', 'Cold Garnish Room', 'Frozen Dessert Room', 'Final Probe Station', 'Tray Wash Bay', 'Hot Plating Hold', 'Cold Tray Buffer', 'Camera Over Plating Line', 'Line Access Door', 'Ward Cart Route', 'Trayline Motor Health'],
        batchLabel: 'Batch HG-972 texture modified supper trays',
        routeStage: 'Ward cart loading',
        statuses: { 'Hot holding station': 'Warning', 'Door sensor': 'Warning' },
        base: { hotDuration: 121, accessCount: 20 },
        insights: [
          'Patient meal plating line has a hot holding warning before ward cart loading.',
          'Texture modified meal governance is linked to batch HG-972 timestamped probe records.',
          'Allergen control checks remain current at the final plating stage.',
          'Cold chain assurance is stable across cold tray buffer and ward cart route.',
          'Door access frequency is elevated during plating line dispatch.',
        ],
      }),
    ],
  },
  {
    id: 'childcare-catering',
    sector: 'Childcare',
    customerName: 'Childcare Catering / Early Learning Food Service',
    logoUrl: '',
    primaryColour: '#9a3412',
    secondaryColour: '#0d9488',
    sites: [
      site({
        id: 'early-learning-kitchen',
        name: 'Early Learning Kitchen',
        supervisor: 'Mia Roberts',
        prefix: 'cc-elk',
        zones: ['Early Learning Kitchen', 'Lunch Ingredient Fridge', 'Freezer Store', 'Lunch Probe Bench', 'Dishwasher Sanitisation', 'Warm Lunch Holding', 'Cold Lunch Packing Bay', 'Kitchen Camera', 'Kitchen Entry Door', 'Classroom Delivery Route', 'Bottle Fridge Health'],
        batchLabel: 'Batch EL-305 child-safe pasta lunch',
        routeStage: 'Classroom delivery',
        statuses: { 'Equipment health sensor': 'Warning' },
        base: { battery: 32, hotDuration: 64, coreTemp: 74.9 },
        insights: [
          'Child-safe meal handling records are timestamped for lunch packing and classroom delivery.',
          'Dishwasher sanitisation passed the latest cycle for early learning service.',
          'Bottle/milk fridge health is approaching maintenance review.',
          'Allergen-safe prep checks remain clear for batch EL-305.',
          'Cold holding is stable for classroom delivery route release.',
        ],
      }),
      site({
        id: 'allergy-safe-prep-zone',
        name: 'Allergy Safe Prep Zone',
        supervisor: 'Harper Lee',
        prefix: 'cc-asp',
        zones: ['Allergen-Safe Prep Zone', 'Allergen Fridge', 'Frozen Allergen-Free Stock', 'Allergy Meal Probe Point', 'Sanitised Utensil Dishwasher', 'Warm Allergy Meal Hold', 'Cold Allergy Lunch Bay', 'Allergy Prep Camera', 'Restricted Prep Door', 'Classroom Allergy Route', 'Label Printer Health'],
        batchLabel: 'Batch EL-318 allergen-safe lunch boxes',
        routeStage: 'Classroom allergy handover',
        statuses: { 'IoT camera': 'Warning', 'Door sensor': 'Warning' },
        base: { confidence: 92, accessCount: 19, coldTemp: 3.8 },
        insights: [
          'Allergen-safe prep camera detected a verification event before classroom handover.',
          'Restricted prep door activity is elevated during allergy-safe lunch packing.',
          'Batch EL-318 has timestamped child-safe meal handling evidence.',
          'Dishwasher sanitisation is complete for allergen-safe utensils.',
          'Cold chain assurance remains stable for allergy lunch boxes.',
        ],
      }),
      site({
        id: 'classroom-meal-dispatch',
        name: 'Classroom Meal Dispatch',
        supervisor: 'Ava Martin',
        prefix: 'cc-cmd',
        zones: ['Classroom Dispatch Bench', 'Bottle/Milk Fridge', 'Frozen Snack Store', 'Snack Probe Point', 'Dishwasher', 'Warm Snack Hold', 'Lunch Packing Cold Bay', 'Dispatch Camera', 'Classroom Corridor Door', 'Classroom Delivery Route', 'Milk Fridge Battery Node'],
        batchLabel: 'Batch EL-327 morning tea and milk service',
        routeStage: 'Classroom corridor delivery',
        statuses: { 'Delivery cold-chain sensor': 'Warning' },
        base: { routeTemp: 5.2, coldTemp: 4.2, dispatchTemp: 4.6 },
        insights: [
          'Bottle/milk fridge and classroom delivery temperatures are being monitored for child-safe handling.',
          'Delivery cold chain shows medium excursion risk during corridor delivery.',
          'Lunch packing cold bay remains within range for classroom meal dispatch.',
          'Dishwasher sanitisation evidence is timestamped for morning tea service.',
          'Allergen-safe labels and batch EL-327 records are audit-ready.',
        ],
      }),
    ],
  },
];
