export const formatDateWithDay = (dateString: string) => {
  // Force local timezone by appending T00:00:00 to prevent UTC conversion
  const date = new Date(dateString + 'T00:00:00');
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
  const dayName = dayOfWeek === 0 || dayOfWeek === 6 ? null : dayNames[dayOfWeek - 1];
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  if (!dayName) {
    return null; // Weekend day
  }

  return {
    dayName,
    shortDay: dayName.slice(0, 3),
    formattedDate,
    fullDisplay: `${dayName}, ${formattedDate}`,
    shortDisplay: `${dayName.slice(0, 3)}, ${formattedDate}`
  };
};

export const formatTimeRange = (startTime: string, endTime: string) => {
  const formatTime = (time: string) => {
    if (!time || typeof time !== 'string' || !time.includes(':')) {
      return '12:00 AM'; // Default fallback
    }
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

export const getRelativeDay = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dateWithoutTime = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayWithoutTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayWithoutTime = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const tomorrowWithoutTime = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  
  if (dateWithoutTime.getTime() === todayWithoutTime.getTime()) {
    return 'Today';
  } else if (dateWithoutTime.getTime() === yesterdayWithoutTime.getTime()) {
    return 'Yesterday';
  } else if (dateWithoutTime.getTime() === tomorrowWithoutTime.getTime()) {
    return 'Tomorrow';
  } else {
    return null;
  }
};