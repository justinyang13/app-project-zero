export interface Promotion {
  id: string;
  name: string;
  chainName: string;
  isActive: boolean;
}

export interface CollectibleItem {
  id: string;
  name: string;
  imageUrl: string;
}

export interface VenueSummary {
  id: string;
  chainName: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  checkInCount: number;
  lastCheckInAtUtc: string | null;
  recentItems: CollectibleItem[];
}

export interface CheckIn {
  id: string;
  collectibleItemId: string;
  venueId: string;
  reportedAtUtc: string;
  nickname: string | null;
}
