export interface CascadeStatus {
  eventId: string;
  currentLevel: 'super_admin' | 'state_admin' | 'branch_admin' | 'zonal_admin';
  nextLevel?: string;
  completedSteps: string[];
  pendingSteps: string[];
  totalBranches?: number;
  selectedBranches?: number;
  totalZones?: number;
  selectedZones?: number;
  participationStatus: 'pending' | 'participating' | 'not_participating';
}

export interface ParticipationOptions {
  eventId: string;
  adminRole: string;
  canParticipate: boolean;
  currentStatus: 'pending' | 'participating' | 'not_participating';
  deadline?: Date;
  requirements?: string[];
}

export interface StatusTimelineEntry {
  timestamp: Date;
  status: string;
  adminId: string;
  adminName: string;
  reason?: string;
  details?: any;
}

export interface EventCascadeFlow {
  eventId: string;
  eventName: string;
  scope: string;
  creator: {
    id: string;
    name: string;
    role: string;
  };
  levels: {
    level: string;
    status: string;
    admins: any[];
    branches?: {
      total: number;
      selected: number;
      details: any[];
    };
    zones?: {
      total: number;
      selected: number;
      details: any[];
    };
  }[];
  participationSummary: {
    total: number;
    participating: number;
    not_participating: number;
    pending: number;
  };
}
