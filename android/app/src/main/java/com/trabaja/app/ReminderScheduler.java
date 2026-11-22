package com.trabaja.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.util.Calendar;
import java.util.Map;
import org.json.JSONObject;

/**
 * Programa los recordatorios con alarmas exactas cuando el sistema lo permite.
 * Cada alarma es de un solo disparo; el receptor reprograma la siguiente al recibirla.
 */
final class ReminderScheduler {
    static final String EXTRA_ID = "rid";
    static final String EXTRA_TITLE = "rtitle";
    static final String EXTRA_DAYMASK = "daymask";
    static final String ACTION_SNOOZE = "com.trabaja.app.SNOOZE";
    static final String ACTION_SNOOZED = "com.trabaja.app.SNOOZED";
    private static final String PREF = "trabaja_native_reminders";

    private ReminderScheduler() {}

    private static AlarmManager alarms(Context c) {
        return (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
    }

    /** true si se pueden usar alarmas exactas (siempre en Android 11 o menos). */
    static boolean canExact(Context c) {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager a = alarms(c);
        return a != null && a.canScheduleExactAlarms();
    }

    private static void setAlarm(Context c, long at, PendingIntent pi) {
        AlarmManager a = alarms(c);
        if (a == null) return;
        try {
            if (canExact(c)) a.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } catch (SecurityException e) {
            a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    static PendingIntent pending(Context c, String id, String title, int mask) {
        Intent i = new Intent(c, ReminderReceiver.class);
        i.putExtra(EXTRA_ID, id);
        i.putExtra(EXTRA_TITLE, title);
        i.putExtra(EXTRA_DAYMASK, mask);
        return PendingIntent.getBroadcast(c, id.hashCode(), i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    private static JSONObject read(Context c, String id) {
        try {
            String raw = prefs(c).getString("r_" + id, null);
            return raw == null ? null : new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    private static void persist(Context c, String id, String title, String mode, String time,
                                int minutes, int mask, long next) {
        try {
            JSONObject o = new JSONObject();
            o.put("id", id);
            o.put("title", title);
            o.put("mode", mode);
            o.put("time", time);
            o.put("minutes", minutes);
            o.put("mask", mask);
            o.put("next", next);
            prefs(c).edit().putString("r_" + id, o.toString()).apply();
        } catch (Exception ignored) {
            // sin persistencia: el aviso actual igual queda programado
        }
    }

    /** Próxima hora hm ("HH:mm") que caiga en un día permitido por la máscara (bit 0 = domingo). */
    private static long nextDaily(String hm, int mask) {
        String[] p = hm.split(":");
        int hour = Integer.parseInt(p[0]);
        int minute = Integer.parseInt(p[1]);
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, minute);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        long now = System.currentTimeMillis();
        for (int i = 0; i < 8; i++) {
            int dow = cal.get(Calendar.DAY_OF_WEEK) - 1;
            if (cal.getTimeInMillis() > now + 1000 && (mask & (1 << dow)) != 0) return cal.getTimeInMillis();
            cal.add(Calendar.DAY_OF_YEAR, 1);
        }
        return -1;
    }

    static void daily(Context c, String id, String title, String hm, int mask) {
        try {
            long at = nextDaily(hm, mask);
            if (at < 0) {
                cancelAlarm(c, id);
                return;
            }
            setAlarm(c, at, pending(c, id, title, mask));
            persist(c, id, title, "daily", hm, 0, mask, at);
        } catch (Exception ignored) {
            // hora con formato inválido
        }
    }

    static void interval(Context c, String id, String title, int minutes) {
        try {
            int mins = Math.max(30, minutes);
            long period = mins * 60L * 1000L;
            long now = System.currentTimeMillis();
            long at = now + period;
            JSONObject prev = read(c, id);
            if (prev != null && "interval".equals(prev.optString("mode")) && prev.optInt("minutes") == mins) {
                long pendingAt = prev.optLong("next", 0);
                // conserva el aviso ya programado para no empujarlo cada vez que se abre la app
                if (pendingAt > now + 1000 && pendingAt <= now + period) at = pendingAt;
            }
            setAlarm(c, at, pending(c, id, title, 127));
            persist(c, id, title, "interval", "", mins, 127, at);
        } catch (Exception ignored) {
            // sin alarma
        }
    }

    /** Aviso único (por ejemplo, fin de una sesión de enfoque). No se guarda ni se repite. */
    static void once(Context c, String id, String title, int seconds) {
        long at = System.currentTimeMillis() + Math.max(1, seconds) * 1000L;
        setAlarm(c, at, pending(c, id, title, 127));
    }

    static void snooze(Context c, String id, String title) {
        try {
            String sid = "snooze_" + id;
            Intent i = new Intent(c, ReminderReceiver.class);
            i.setAction(ACTION_SNOOZED);
            i.putExtra(EXTRA_ID, sid);
            i.putExtra(EXTRA_TITLE, title);
            PendingIntent p = PendingIntent.getBroadcast(c, sid.hashCode(), i,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            setAlarm(c, System.currentTimeMillis() + 10 * 60 * 1000L, p);
        } catch (Exception ignored) {
            // sin pospuesto
        }
    }

    private static void cancelAlarm(Context c, String id) {
        try {
            AlarmManager a = alarms(c);
            PendingIntent p = pending(c, id, "", 127);
            if (a != null) a.cancel(p);
            p.cancel();
        } catch (Exception ignored) {
            // nada que cancelar
        }
    }

    static void cancel(Context c, String id) {
        cancelAlarm(c, id);
        prefs(c).edit().remove("r_" + id).apply();
    }

    /** Programa de nuevo el siguiente aviso de un recordatorio guardado. */
    static void reschedule(Context c, String id) {
        JSONObject o = read(c, id);
        if (o == null) return;
        try {
            if ("daily".equals(o.getString("mode"))) {
                daily(c, id, o.getString("title"), o.getString("time"), o.optInt("mask", 127));
            } else {
                interval(c, id, o.getString("title"), o.getInt("minutes"));
            }
        } catch (Exception ignored) {
            // registro dañado
        }
    }

    /** Tras reiniciar, actualizar la app o cambiar la hora: vuelve a programar todo. */
    static void restore(Context c) {
        for (Map.Entry<String, ?> e : prefs(c).getAll().entrySet()) {
            String key = e.getKey();
            if (key.startsWith("r_")) reschedule(c, key.substring(2));
        }
    }
}
