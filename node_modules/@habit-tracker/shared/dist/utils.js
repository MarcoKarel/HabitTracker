// Date utilities
export const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};
export const parseDate = (dateString) => {
    return new Date(dateString + 'T00:00:00.000Z');
};
export const isToday = (date) => {
    const today = new Date();
    const targetDate = parseDate(date);
    return formatDate(today) === formatDate(targetDate);
};
export const isYesterday = (date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = parseDate(date);
    return formatDate(yesterday) === formatDate(targetDate);
};
export const daysDifference = (date1, date2) => {
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
export const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
// Frequency utilities
export const getDayOfWeek = (date) => {
    // Convert JS day (0=Sunday) to our bitmask (1=Monday)
    const jsDay = date.getDay();
    return jsDay === 0 ? 7 : jsDay; // Sunday becomes 7, Monday-Saturday become 1-6
};
export const isDayIncludedInFrequency = (frequency, dayOfWeek) => {
    const bitmask = Math.pow(2, dayOfWeek - 1);
    return (frequency & bitmask) !== 0;
};
export const isHabitDueOnDate = (habit, date) => {
    const dayOfWeek = getDayOfWeek(date);
    const startDate = parseDate(habit.start_date);
    // Check if the date is after or on the start date
    if (date < startDate) {
        return false;
    }
    return isDayIncludedInFrequency(habit.frequency, dayOfWeek);
};
export const getFrequencyDays = (frequency) => {
    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
        if (frequency & Math.pow(2, i)) {
            days.push(dayNames[i]);
        }
    }
    return days;
};
export const createFrequencyFromDays = (days) => {
    return days.reduce((frequency, day) => frequency | Math.pow(2, day - 1), 0);
};
// Streak calculations
export const calculateStreak = (habit, completions) => {
    if (completions.length === 0) {
        return { current_streak: 0, longest_streak: 0 };
    }
    // Sort completions by date (newest first)
    const sortedCompletions = [...completions].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    const yesterday = addDays(today, -1);
    // Check if we should start counting from today or yesterday
    let checkDate = isToday(sortedCompletions[0].completed_at) ? today : yesterday;
    // Calculate current streak
    for (let i = 0; i < sortedCompletions.length; i++) {
        const completion = sortedCompletions[i];
        const completionDate = parseDate(completion.completed_at);
        if (formatDate(completionDate) === formatDate(checkDate) && isHabitDueOnDate(habit, checkDate)) {
            currentStreak++;
            // Move to the previous due date
            do {
                checkDate = addDays(checkDate, -1);
            } while (!isHabitDueOnDate(habit, checkDate) && checkDate >= parseDate(habit.start_date));
        }
        else {
            break;
        }
    }
    // Calculate longest streak
    for (let i = 0; i < sortedCompletions.length; i++) {
        const completion = sortedCompletions[i];
        const completionDate = parseDate(completion.completed_at);
        if (i === 0 || daysDifference(sortedCompletions[i - 1].completed_at, completion.completed_at) <= 1) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
        }
        else {
            tempStreak = 1;
        }
    }
    return { current_streak: currentStreak, longest_streak: longestStreak };
};
export const calculateCompletionRate = (habit, completions) => {
    const startDate = parseDate(habit.start_date);
    const today = new Date();
    let totalDueDays = 0;
    let currentDate = startDate;
    // Count total due days from start date to today
    while (currentDate <= today) {
        if (isHabitDueOnDate(habit, currentDate)) {
            totalDueDays++;
        }
        currentDate = addDays(currentDate, 1);
    }
    if (totalDueDays === 0)
        return 0;
    const completedDays = completions.filter(completion => {
        const completionDate = parseDate(completion.completed_at);
        return completionDate >= startDate && completionDate <= today;
    }).length;
    return Math.round((completedDays / totalDueDays) * 100);
};
// Transform habit data with calculations
export const enrichHabitWithCompletions = (habit, completions) => {
    const habitCompletions = completions.filter(c => c.habit_id === habit.id);
    const { current_streak, longest_streak } = calculateStreak(habit, habitCompletions);
    const completion_rate = calculateCompletionRate(habit, habitCompletions);
    const today = new Date();
    const todayString = formatDate(today);
    const is_due_today = isHabitDueOnDate(habit, today);
    const is_completed_today = habitCompletions.some(c => c.completed_at === todayString);
    const last_completed = habitCompletions.length > 0
        ? habitCompletions.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0].completed_at
        : undefined;
    return {
        ...habit,
        completions: habitCompletions,
        current_streak,
        longest_streak,
        completion_rate,
        last_completed,
        is_due_today,
        is_completed_today,
    };
};
// Validation utilities
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
export const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
};
export const validateHabitTitle = (title) => {
    return title.trim().length >= 2 && title.trim().length <= 100;
};
export const validateFrequency = (frequency) => {
    return frequency > 0 && frequency <= 127; // All days (2^7 - 1)
};
// Animation utilities
export const getStreakColor = (streak) => {
    if (streak === 0)
        return '#gray';
    if (streak < 7)
        return '#orange';
    if (streak < 30)
        return '#yellow';
    if (streak < 100)
        return '#green';
    return '#purple';
};
export const shouldShowConfetti = (oldStreak, newStreak) => {
    const milestones = [7, 30, 100, 365];
    return milestones.some(milestone => oldStreak < milestone && newStreak >= milestone);
};
// Export utilities
export const exportHabitsToCSV = (habits) => {
    const headers = [
        'Title',
        'Description',
        'Frequency Days',
        'Start Date',
        'Current Streak',
        'Longest Streak',
        'Completion Rate',
        'Total Completions',
        'Last Completed'
    ];
    const rows = habits.map(habit => [
        habit.title,
        habit.description || '',
        getFrequencyDays(habit.frequency).join(', '),
        habit.start_date,
        habit.current_streak.toString(),
        habit.longest_streak.toString(),
        `${habit.completion_rate}%`,
        habit.completions.length.toString(),
        habit.last_completed || ''
    ]);
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');
    return csvContent;
};
export const exportHabitsToJSON = (habits) => {
    return JSON.stringify(habits, null, 2);
};
