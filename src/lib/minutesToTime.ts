export const minutesToTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;

    const time = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    return time;
}   