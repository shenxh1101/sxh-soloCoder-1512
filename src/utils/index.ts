export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatTime = (isoString: string): string => {
  const d = new Date(isoString);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (date: Date): string => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatPlateNumber = (plate: string): string => {
  return plate.toUpperCase().replace(/\s/g, '');
};

export const normalizePlateNumber = (plate: string): string => {
  return formatPlateNumber(plate);
};

export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (e) {
    console.error('Error reading from localStorage:', e);
  }
  return defaultValue;
};

export const setToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error writing to localStorage:', e);
  }
};

export const calculateWaitingTime = (
  position: number,
  durationMinutes: number
): { minutes: number; display: string } => {
  const totalMinutes = position * durationMinutes;
  if (totalMinutes < 60) {
    return { minutes: totalMinutes, display: `约 ${totalMinutes} 分钟` };
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return {
    minutes: totalMinutes,
    display: mins > 0 ? `约 ${hours} 小时 ${mins} 分钟` : `约 ${hours} 小时`
  };
};
