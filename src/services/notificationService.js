import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const SOUND_OPTIONS = [
  { id: 'default', label: 'Predeterminado', channelId: 'reminder_default', importance: Notifications.AndroidImportance.DEFAULT, vibration: [0, 200] },
  { id: 'urgent', label: 'Urgente', channelId: 'reminder_urgent', importance: Notifications.AndroidImportance.MAX, vibration: [0, 150, 100, 150, 100, 150] },
  { id: 'soft', label: 'Suave', channelId: 'reminder_soft', importance: Notifications.AndroidImportance.LOW, vibration: [0, 300] },
  { id: 'chime', label: 'Campana', channelId: 'reminder_chime', importance: Notifications.AndroidImportance.HIGH, vibration: [0, 100, 50, 100] },
];

export { SOUND_OPTIONS };

const ALERT_TIMING_OPTIONS = [
  { id: 0, label: 'El mismo día' },
  { id: 1, label: '1 día antes' },
  { id: 3, label: '3 días antes' },
  { id: 7, label: '1 semana antes' },
];

export { ALERT_TIMING_OPTIONS };

export async function setupNotifications() {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    for (const opt of SOUND_OPTIONS) {
      await Notifications.setNotificationChannelAsync(opt.channelId, {
        name: `Recordatorios ${opt.label}`,
        importance: opt.importance,
        vibrationPattern: opt.vibration,
        sound: undefined,
      });
    }
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function getNextOccurrences(dayOfMonth, count) {
  const dates = [];
  const now = new Date();
  let month = now.getMonth();
  let year = now.getFullYear();

  while (dates.length < count) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(dayOfMonth, lastDay);
    const d = new Date(year, month, safeDay, 8, 0, 0);
    if (d > now) {
      dates.push(d);
    }
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return dates;
}

export async function scheduleReminderNotifications(reminder) {
  if (Platform.OS === 'web') return [];
  const soundId = reminder.sound || 'default';
  const alertDays = reminder.alertTiming ?? 0;
  const soundOpt = SOUND_OPTIONS.find((s) => s.id === soundId) || SOUND_OPTIONS[0];

  await cancelReminderNotifications(reminder);

  const maxMonth = reminder.endYear ? reminder.endYear : new Date().getFullYear() + 2;
  const now = new Date();
  const totalMonths = ((maxMonth - now.getFullYear()) * 12) + 12;
  const occurrences = getNextOccurrences(reminder.dayOfMonth, Math.min(totalMonths, 36));

  const ids = [];
  for (const dueDate of occurrences) {
    const triggerDate = new Date(dueDate);
    triggerDate.setDate(triggerDate.getDate() - alertDays);
    triggerDate.setHours(9, 0, 0, 0);

    if (triggerDate <= new Date()) continue;

    const title = alertDays > 0
      ? `Recordatorio en ${alertDays} día${alertDays > 1 ? 's' : ''}`
      : 'Recordatorio de pago hoy';
    const body = `${reminder.name} - ${reminder.amount > 0 ? `S/ ${reminder.amount.toFixed(2)}` : ''}${reminder.note ? ` · ${reminder.note}` : ''}`;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { reminderId: reminder.id } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: soundOpt.channelId,
        },
      });
      ids.push(id);
    } catch (e) {
      console.warn('Failed to schedule notification:', e);
    }
  }
  return ids;
}

export async function cancelReminderNotifications(reminder) {
  if (Platform.OS === 'web') return;
  if (reminder.notificationIds && reminder.notificationIds.length > 0) {
    for (const nid of reminder.notificationIds) {
      try { await Notifications.cancelScheduledNotificationAsync(nid); } catch (e) {}
    }
  }
}

export async function cancelAllNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
