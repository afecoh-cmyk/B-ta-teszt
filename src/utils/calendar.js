/**
 * Generál 4 hét naptárat a mai naptól
 */
export function generateCalendarDates() {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 28; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const dayNames = ['Vas', 'Hét', 'Kedd', 'Sze', 'Csüt', 'Pén', 'Szo'];

        dates.push({
            value: date.toISOString().split('T')[0],
            label: i === 0 ? 'Ma' : i === 1 ? 'Holnap' : `${dayNames[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`,
            date: date
        });
    }

    return dates;
}

/**
 * Időpontok generálása (9:00-18:00, óránként)
 */
export function generateTimeSlots() {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
}

/**
 * Visszaszámláló számítás
 */
export function calculateCountdown(targetDate, targetTime) {
    const target = new Date(`${targetDate}T${targetTime}:00`);
    const now = new Date();
    const diff = target - now;

    if (diff <= 0) {
        return { expired: true, text: 'Lejárt' };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
        expired: false,
        days,
        hours,
        minutes,
        seconds,
        text: `${days}n ${hours}ó ${minutes}p ${seconds}mp`
    };
}
