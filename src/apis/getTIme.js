

export function getTime(){
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const hour = today.getHours().toString().padStart(2, '0') + '00';
    return { yyyymmdd, hour };

}