export type Achievement = {
  id: string;
  name: string;
  icon: string;
  description: string;
  dateEarned: string;
};

export type Student = {
  id: string;
  name: string;
  year: string;
  subjects: string[];
  interests: string[];
  avatar: string | null;
  achievements: Achievement[];
};

export type Message = {
  text: string;
  sent: boolean;
};

export type SwipeAction = 'connect' | 'skip';

export interface SwipeHistoryItem {
  id: string;
  action: SwipeAction;
} 