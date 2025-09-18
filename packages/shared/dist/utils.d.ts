import { type Habit, type HabitCompletion, type HabitWithCompletions } from './types';
export declare const formatDate: (date: Date) => string;
export declare const parseDate: (dateString: string) => Date;
export declare const isToday: (date: string) => boolean;
export declare const isYesterday: (date: string) => boolean;
export declare const daysDifference: (date1: string, date2: string) => number;
export declare const addDays: (date: Date, days: number) => Date;
export declare const getDayOfWeek: (date: Date) => number;
export declare const isDayIncludedInFrequency: (frequency: number, dayOfWeek: number) => boolean;
export declare const isHabitDueOnDate: (habit: Habit, date: Date) => boolean;
export declare const getFrequencyDays: (frequency: number) => string[];
export declare const createFrequencyFromDays: (days: number[]) => number;
export declare const calculateStreak: (habit: Habit, completions: HabitCompletion[]) => {
    current_streak: number;
    longest_streak: number;
};
export declare const calculateCompletionRate: (habit: Habit, completions: HabitCompletion[]) => number;
export declare const enrichHabitWithCompletions: (habit: Habit, completions: HabitCompletion[]) => HabitWithCompletions;
export declare const validateEmail: (email: string) => boolean;
export declare const validatePassword: (password: string) => {
    valid: boolean;
    errors: string[];
};
export declare const validateHabitTitle: (title: string) => boolean;
export declare const validateFrequency: (frequency: number) => boolean;
export declare const getStreakColor: (streak: number) => string;
export declare const shouldShowConfetti: (oldStreak: number, newStreak: number) => boolean;
export declare const exportHabitsToCSV: (habits: HabitWithCompletions[]) => string;
export declare const exportHabitsToJSON: (habits: HabitWithCompletions[]) => string;
