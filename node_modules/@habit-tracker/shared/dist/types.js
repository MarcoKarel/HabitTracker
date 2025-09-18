// Shared types for the habit tracker application
// Frequency helpers
export const FREQUENCY_DAYS = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 4,
    THURSDAY: 8,
    FRIDAY: 16,
    SATURDAY: 32,
    SUNDAY: 64,
};
export const FREQUENCY_PRESETS = {
    DAILY: 127, // All days (1+2+4+8+16+32+64)
    WEEKDAYS: 31, // Monday to Friday (1+2+4+8+16)
    WEEKENDS: 96, // Saturday and Sunday (32+64)
};
