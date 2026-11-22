package com.trabaja.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Reprograma los recordatorios cuando el sistema los pierde (reinicio, actualización, cambio de hora). */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
                || Intent.ACTION_TIME_CHANGED.equals(a)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(a)
                || "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(a)) {
            ReminderScheduler.restore(c);
        }
    }
}
