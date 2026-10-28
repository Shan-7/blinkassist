export interface AssistiveOption {
  id: string;
  label: string;
  description: string;
  iconName: string;
  color: string;
  bgGlow: string;
  borderColor: string;
  spokenText: string;
  category: 'urgent' | 'daily' | 'social';
}

export interface DeviceControlItem {
  id: string;
  name: string;
  description: string;
  iconName: string;
  state: boolean;
  commandOn: string;
  commandOff: string;
  activeLabel: string;
  inactiveLabel: string;
  color: string;
}

export type ConnectionMode = 'serial' | 'ble' | 'webcam' | 'simulator';
export type InputSourceMode = 'hardware' | 'cv';

export interface BlinkLog {
  id: string;
  timestamp: string;
  count: number;
  source: ConnectionMode;
  actionTaken: string;
}

export interface ArduinoSketchSnippet {
  title: string;
  code: string;
}
