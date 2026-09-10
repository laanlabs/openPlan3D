import { writable } from 'svelte/store';

export interface ProjectSettings {
  units: 'metric' | 'imperial';         // m,cm vs ft,inch
  showDimensions: boolean;               // wall length labels
  showExternalDimensions: boolean;       // outside-wall dimensions
  showInternalDimensions: boolean;       // inside-room dimensions
  showExtensionLines: boolean;           // perpendicular tick marks on dimension lines
  showObjectDistance: boolean;            // distance from objects to walls
  dimensionLineColor: string;            // color for dimension lines/text
  wallMeasureMode: 'centerline' | 'edge'; // measure walls center-to-center or edge-to-edge (clear span)
  snapToGrid: boolean;                   // snap elements to grid when dragging
  snapToWalls: boolean;                  // snap furniture to nearby walls when dragging
  gridSize: number;                      // grid snap size in cm (default 25)
}

const defaultSettings: ProjectSettings = {
  units: 'metric',
  showDimensions: true,
  showExternalDimensions: true,
  showInternalDimensions: false,
  showExtensionLines: true,
  showObjectDistance: true,
  dimensionLineColor: '#1e293b',
  wallMeasureMode: 'centerline',
  snapToGrid: true,
  snapToWalls: true,
  gridSize: 25,
};

// Load from localStorage if available
function loadSettings(): ProjectSettings {
  if (typeof window === 'undefined') return { ...defaultSettings };
  try {
    const saved = localStorage.getItem('o3d_settings');
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch {}
  return { ...defaultSettings };
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<ProjectSettings>(loadSettings());

  return {
    subscribe,
    set(value: ProjectSettings) {
      set(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem('o3d_settings', JSON.stringify(value));
      }
    },
    update(fn: (s: ProjectSettings) => ProjectSettings) {
      update((current) => {
        const next = fn(current);
        if (typeof window !== 'undefined') {
          localStorage.setItem('o3d_settings', JSON.stringify(next));
        }
        return next;
      });
    },
    reset() {
      this.set({ ...defaultSettings });
    },
  };
}

export const projectSettings = createSettingsStore();

/** Convert cm to display string based on current units */
export function formatLength(cm: number, units: 'metric' | 'imperial'): string {
  if (units === 'imperial') {
    const totalInches = Math.round(Math.abs(cm) / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    const sign = cm < 0 && totalInches > 0 ? '-' : '';
    if (feet === 0) return `${sign}${inches}"`;
    if (inches === 0) return `${sign}${feet}'`;
    return `${sign}${feet}'${inches}"`;
  }
  // Metric
  if (cm >= 100) {
    const m = cm / 100;
    if (m % 1 === 0) return `${m} m`;
    return `${parseFloat(m.toFixed(2))} m`;
  }
  return `${Math.round(cm)} cm`;
}

/** Convert cm to display with full precision */
export function formatLengthPrecise(cm: number, units: 'metric' | 'imperial'): string {
  if (units === 'imperial') {
    const totalTenths = Math.round(Math.abs(cm) / 2.54 * 10);
    const feet = Math.floor(totalTenths / 120);
    const inches = (totalTenths % 120) / 10;
    const sign = cm < 0 && totalTenths > 0 ? '-' : '';
    if (feet === 0) return `${sign}${inches.toFixed(1)}"`;
    return `${sign}${feet}'${inches.toFixed(1)}"`;
  }
  if (cm >= 100) {
    return `${(cm / 100).toFixed(2)} m`;
  }
  return `${cm.toFixed(1)} cm`;
}

/** Format area (m²) to display string based on units */
export function formatArea(m2: number, units: 'metric' | 'imperial'): string {
  if (units === 'imperial') {
    const ft2 = m2 * 10.7639;
    return `${ft2.toFixed(1)} ft²`;
  }
  return `${m2.toFixed(1)} m²`;
}

/** Parse user input back to cm */
export function parseLengthInput(input: string, units: 'metric' | 'imperial'): number | null {
  if (units === 'imperial') {
    // Try ft'in" format
    const match = input.match(/^(\d+(?:\.\d+)?)'?\s*(\d+(?:\.\d+)?)?"?$/);
    if (match) {
      const feet = parseFloat(match[1]) || 0;
      const inches = parseFloat(match[2]) || 0;
      return (feet * 12 + inches) * 2.54;
    }
    // Try just inches
    const inMatch = input.match(/^(\d+(?:\.\d+)?)"?$/);
    if (inMatch) return parseFloat(inMatch[1]) * 2.54;
    // Try just feet
    const ftMatch = input.match(/^(\d+(?:\.\d+)?)'$/);
    if (ftMatch) return parseFloat(ftMatch[1]) * 12 * 2.54;
  }
  // Metric — try m then cm
  const mMatch = input.match(/^(\d+(?:\.\d+)?)\s*m$/);
  if (mMatch) return parseFloat(mMatch[1]) * 100;
  const num = parseFloat(input);
  return isNaN(num) ? null : num;
}
