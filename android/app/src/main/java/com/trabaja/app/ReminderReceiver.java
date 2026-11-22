package com.trabaja.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import java.util.Calendar;

public class ReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL = "trabaja_missions";

    @Override
    public void onReceive(Context c, Intent i) {
        String action = i.getAction();
        String id = i.getStringExtra(ReminderScheduler.EXTRA_ID);
        String title = i.getStringExtra(ReminderScheduler.EXTRA_TITLE);
        if (title == null || title.trim().isEmpty()) title = "Recordatorio de Trabaja";
        boolean snoozed = ReminderScheduler.ACTION_SNOOZED.equals(action);
        if (id != null && id.startsWith("snooze_")) id = id.substring(7);

        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);

        if (ReminderScheduler.ACTION_SNOOZE.equals(action)) {
            if (nm != null) nm.cancel(title.hashCode());
            if (id != null) ReminderScheduler.snooze(c, id, title);
            return;
        }

        // Las alarmas son de un disparo: deja lista la siguiente aunque hoy no toque avisar.
        if (!snoozed && id != null) ReminderScheduler.reschedule(c, id);

        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        if (!snoozed) {
            Calendar now = Calendar.getInstance();
            int mask = i.getIntExtra(ReminderScheduler.EXTRA_DAYMASK, 127);
            int day = now.get(Calendar.DAY_OF_WEEK) - 1;
            if ((mask & (1 << day)) == 0) return;
            int hour = now.get(Calendar.HOUR_OF_DAY);
            boolean repeating = "water-repeat".equals(id) || "stretch-repeat".equals(id);
            if (repeating && (hour < 8 || hour > 21)) return;
        }

        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Recordatorios de Trabaja",
                    NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Avisos de misiones, pausas y sesiones de enfoque");
            nm.createNotificationChannel(ch);
        }

        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(c, 1, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent snooze = new Intent(c, ReminderReceiver.class);
        snooze.setAction(ReminderScheduler.ACTION_SNOOZE);
        snooze.putExtra(ReminderScheduler.EXTRA_ID, id);
        snooze.putExtra(ReminderScheduler.EXTRA_TITLE, title);
        PendingIntent snoozePi = PendingIntent.getBroadcast(c, ("sn_" + id).hashCode(), snooze,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(c, CHANNEL)
                : new Notification.Builder(c);
        b.setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle("Trabaja · Recordatorio")
                .setContentText(title)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setContentIntent(content)
                .addAction(android.R.drawable.ic_menu_recent_history, "Posponer 10 min", snoozePi);
        nm.notify(title.hashCode(), b.build());
    }
}
