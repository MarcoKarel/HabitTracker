import { enrichHabitWithCompletions, formatDate } from './utils';
// Service class for habit management with offline support
export class HabitService {
    constructor(api, storage) {
        this.isOnline = true;
        this.syncQueue = [];
        this.api = api;
        this.storage = storage;
        this.setupNetworkListeners();
    }
    setupNetworkListeners() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.syncPendingChanges();
            });
            window.addEventListener('offline', () => {
                this.isOnline = false;
            });
            this.isOnline = navigator.onLine;
        }
    }
    // Offline-first habit operations
    async getHabitsWithCompletions(userId) {
        try {
            if (this.isOnline) {
                // Try to fetch from server
                const [habitsResponse, completionsResponse] = await Promise.all([
                    this.api.getHabits(userId),
                    this.api.getCompletions(userId)
                ]);
                if (habitsResponse.success && completionsResponse.success) {
                    const enrichedHabits = habitsResponse.data.map(habit => enrichHabitWithCompletions(habit, completionsResponse.data));
                    // Cache the data
                    await this.storage.setItem(`habits_${userId}`, JSON.stringify(habitsResponse.data));
                    await this.storage.setItem(`completions_${userId}`, JSON.stringify(completionsResponse.data));
                    return enrichedHabits;
                }
            }
            // Fallback to cached data
            const [cachedHabits, cachedCompletions] = await Promise.all([
                this.storage.getItem(`habits_${userId}`),
                this.storage.getItem(`completions_${userId}`)
            ]);
            const habits = cachedHabits ? JSON.parse(cachedHabits) : [];
            const completions = cachedCompletions ? JSON.parse(cachedCompletions) : [];
            return habits.map(habit => enrichHabitWithCompletions(habit, completions));
        }
        catch (error) {
            console.error('Error fetching habits:', error);
            return [];
        }
    }
    async createHabit(habit) {
        const tempId = `temp_${Date.now()}`;
        const tempHabit = {
            ...habit,
            id: tempId,
            created_at: new Date().toISOString(),
        };
        try {
            // Optimistic update - add to local storage immediately
            const userId = habit.user_id;
            const cachedHabits = await this.storage.getItem(`habits_${userId}`);
            const habits = cachedHabits ? JSON.parse(cachedHabits) : [];
            habits.unshift(tempHabit);
            await this.storage.setItem(`habits_${userId}`, JSON.stringify(habits));
            if (this.isOnline) {
                const response = await this.api.createHabit(habit);
                if (response.success && response.data) {
                    // Replace temp habit with real one
                    const realHabit = response.data;
                    const updatedHabits = habits.map(h => h.id === tempId ? realHabit : h);
                    await this.storage.setItem(`habits_${userId}`, JSON.stringify(updatedHabits));
                    return realHabit;
                }
            }
            else {
                // Queue for sync when online
                this.syncQueue.push(async () => {
                    const response = await this.api.createHabit(habit);
                    if (response.success && response.data) {
                        const cachedHabits = await this.storage.getItem(`habits_${userId}`);
                        if (cachedHabits) {
                            const habits = JSON.parse(cachedHabits);
                            const updatedHabits = habits.map(h => h.id === tempId ? response.data : h);
                            await this.storage.setItem(`habits_${userId}`, JSON.stringify(updatedHabits));
                        }
                    }
                });
            }
            return tempHabit;
        }
        catch (error) {
            console.error('Error creating habit:', error);
            return null;
        }
    }
    async toggleHabitCompletion(habitId, userId, date = formatDate(new Date())) {
        try {
            // Check if already completed
            const cachedCompletions = await this.storage.getItem(`completions_${userId}`);
            const completions = cachedCompletions ? JSON.parse(cachedCompletions) : [];
            const existingCompletion = completions.find(c => c.habit_id === habitId && c.completed_at === date);
            if (existingCompletion) {
                // Remove completion
                const updatedCompletions = completions.filter(c => c.id !== existingCompletion.id);
                await this.storage.setItem(`completions_${userId}`, JSON.stringify(updatedCompletions));
                if (this.isOnline) {
                    await this.api.deleteCompletion(existingCompletion.id);
                }
                else {
                    this.syncQueue.push(async () => {
                        await this.api.deleteCompletion(existingCompletion.id);
                    });
                }
                return false;
            }
            else {
                // Add completion
                const tempId = `temp_${Date.now()}`;
                const newCompletion = {
                    id: tempId,
                    habit_id: habitId,
                    user_id: userId,
                    completed_at: date,
                    created_at: new Date().toISOString(),
                };
                completions.unshift(newCompletion);
                await this.storage.setItem(`completions_${userId}`, JSON.stringify(completions));
                if (this.isOnline) {
                    const response = await this.api.createCompletion({
                        habit_id: habitId,
                        user_id: userId,
                        completed_at: date,
                    });
                    if (response.success && response.data) {
                        // Replace temp completion with real one
                        const realCompletion = response.data;
                        const updatedCompletions = completions.map(c => c.id === tempId ? realCompletion : c);
                        await this.storage.setItem(`completions_${userId}`, JSON.stringify(updatedCompletions));
                    }
                }
                else {
                    this.syncQueue.push(async () => {
                        const response = await this.api.createCompletion({
                            habit_id: habitId,
                            user_id: userId,
                            completed_at: date,
                        });
                        if (response.success && response.data) {
                            const cachedCompletions = await this.storage.getItem(`completions_${userId}`);
                            if (cachedCompletions) {
                                const completions = JSON.parse(cachedCompletions);
                                const updatedCompletions = completions.map(c => c.id === tempId ? response.data : c);
                                await this.storage.setItem(`completions_${userId}`, JSON.stringify(updatedCompletions));
                            }
                        }
                    });
                }
                return true;
            }
        }
        catch (error) {
            console.error('Error toggling habit completion:', error);
            return false;
        }
    }
    async updateHabit(habitId, userId, updates) {
        try {
            // Optimistic update
            const cachedHabits = await this.storage.getItem(`habits_${userId}`);
            if (cachedHabits) {
                const habits = JSON.parse(cachedHabits);
                const updatedHabits = habits.map(habit => habit.id === habitId ? { ...habit, ...updates, updated_at: new Date().toISOString() } : habit);
                await this.storage.setItem(`habits_${userId}`, JSON.stringify(updatedHabits));
            }
            if (this.isOnline) {
                const response = await this.api.updateHabit(habitId, updates);
                return response.success;
            }
            else {
                this.syncQueue.push(async () => {
                    await this.api.updateHabit(habitId, updates);
                });
                return true;
            }
        }
        catch (error) {
            console.error('Error updating habit:', error);
            return false;
        }
    }
    async deleteHabit(habitId, userId) {
        try {
            // Optimistic update
            const cachedHabits = await this.storage.getItem(`habits_${userId}`);
            if (cachedHabits) {
                const habits = JSON.parse(cachedHabits);
                const updatedHabits = habits.filter(habit => habit.id !== habitId);
                await this.storage.setItem(`habits_${userId}`, JSON.stringify(updatedHabits));
            }
            // Also remove completions
            const cachedCompletions = await this.storage.getItem(`completions_${userId}`);
            if (cachedCompletions) {
                const completions = JSON.parse(cachedCompletions);
                const updatedCompletions = completions.filter(completion => completion.habit_id !== habitId);
                await this.storage.setItem(`completions_${userId}`, JSON.stringify(updatedCompletions));
            }
            if (this.isOnline) {
                const response = await this.api.deleteHabit(habitId);
                return response.success;
            }
            else {
                this.syncQueue.push(async () => {
                    await this.api.deleteHabit(habitId);
                });
                return true;
            }
        }
        catch (error) {
            console.error('Error deleting habit:', error);
            return false;
        }
    }
    async syncPendingChanges() {
        console.log('Syncing pending changes...');
        const queue = [...this.syncQueue];
        this.syncQueue = [];
        for (const syncAction of queue) {
            try {
                await syncAction();
            }
            catch (error) {
                console.error('Error syncing change:', error);
                // Re-queue failed actions
                this.syncQueue.push(syncAction);
            }
        }
        console.log('Sync completed');
    }
    // Manual sync trigger
    async forcSync(userId) {
        if (!this.isOnline)
            return;
        try {
            await this.syncPendingChanges();
            // Refresh data from server
            const [habitsResponse, completionsResponse] = await Promise.all([
                this.api.getHabits(userId),
                this.api.getCompletions(userId)
            ]);
            if (habitsResponse.success && completionsResponse.success) {
                await this.storage.setItem(`habits_${userId}`, JSON.stringify(habitsResponse.data));
                await this.storage.setItem(`completions_${userId}`, JSON.stringify(completionsResponse.data));
            }
        }
        catch (error) {
            console.error('Error during force sync:', error);
        }
    }
    // Get sync status
    getPendingSyncCount() {
        return this.syncQueue.length;
    }
    getConnectionStatus() {
        return this.isOnline;
    }
}
