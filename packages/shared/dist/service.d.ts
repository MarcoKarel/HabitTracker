import { SupabaseAPI } from './api';
import type { Habit, HabitWithCompletions } from './types';
export interface StorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}
export declare class HabitService {
    private api;
    private storage;
    private isOnline;
    private syncQueue;
    constructor(api: SupabaseAPI, storage: StorageAdapter);
    private setupNetworkListeners;
    getHabitsWithCompletions(userId: string): Promise<HabitWithCompletions[]>;
    createHabit(habit: Omit<Habit, 'id' | 'created_at'>): Promise<Habit | null>;
    toggleHabitCompletion(habitId: string, userId: string, date?: string): Promise<boolean>;
    updateHabit(habitId: string, userId: string, updates: Partial<Habit>): Promise<boolean>;
    deleteHabit(habitId: string, userId: string): Promise<boolean>;
    private syncPendingChanges;
    forcSync(userId: string): Promise<void>;
    getPendingSyncCount(): number;
    getConnectionStatus(): boolean;
}
