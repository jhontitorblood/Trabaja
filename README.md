# Trabaja

RPG de hábitos y productividad personal para Android (y navegador). Es la evolución de **SISTEMA Despertar**: mismas misiones, guerreros y progresión, con un rediseño visual, más dinamismo y una base técnica nueva.

## Qué incluye

**Visual**
- Fuentes e íconos propios dentro de la app (funciona sin internet).
- Inicio con tu guerrero destacado, anillo de nivel, racha y semana.
- Cinco temas de color, modo oscuro, claro o automático.
- Animaciones, partículas y textos de XP flotantes (se pueden apagar).
- Imágenes optimizadas: los recursos bajaron de 18 MB a 4 MB.

**Dinamismo**
- La pantalla se actualiza sin parpadeo.
- Misiones editables con subtareas, prioridad, recordatorio y temporizador de enfoque.
- Misiones diarias que cambian cada día, retos semanales y un jefe semanal.
- Rachas con escudos, calendario semanal y mapa de constancia de 12 semanas.
- Modo enfoque (15/25/45/60 min) con descanso y XP limitada por día.
- Tienda: temas, marcos de avatar, títulos, escudos de racha y elixir de XP.
- Vibración y sonidos al completar tareas.

**Android**
- La app se carga de forma segura con `WebViewAssetLoader`.
- Recordatorios con alarmas exactas (con permiso) y aviso al terminar el enfoque.
- Exportar/importar respaldo con el selector de archivos del sistema.
- Ícono adaptable, barras del sistema con el color del tema y soporte de Android 15.

## Compilar el APK

1. En GitHub abre **Actions → Build Android APK → Run workflow** (también corre solo al subir cambios).
2. Cuando termine, descarga `Trabaja-Android-APK` y dentro estará `Trabaja.apk`.

El APK está firmado con una clave fija incluida en `android/debug.keystore`, así que cada versión nueva se instala **encima** de la anterior sin perder el progreso. Si el repositorio es público, considera pasarlo a privado o usar una clave propia (abajo).

### Clave propia (opcional)

```bash
keytool -genkeypair -v -keystore trabaja.keystore -alias trabaja -keyalg RSA -keysize 2048 -validity 36500
base64 -w0 trabaja.keystore    # copia el resultado
```

En **Settings → Secrets and variables → Actions** crea: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. El flujo generará además `Trabaja-produccion.apk`. Cambiar de clave exige desinstalar la app: **exporta antes un respaldo** en Ajustes.

## Pasar tu progreso desde SISTEMA Despertar

En la app vieja: Ajustes → Exportar. En Trabaja: Ajustes → Importar. El respaldo se convierte solo al formato nuevo.

## Imágenes de tus jefes semanales

Sube tus imágenes (png, jpg, webp o gif) a `assets/img/bosses/`. Cada semana la app elige una al azar y el **nombre del archivo es el nombre del jefe** (`Hidra del Desorden.png` → «Hidra del Desorden»). Si la carpeta está vacía se usa el ícono de siempre. Al subirlas, el flujo de GitHub las detecta solo; si pruebas en local ejecuta `python3 tools/gen-bosses.py`.

## Estructura

```
index.html  style.css  manifest.json  sw.js
js/       data · icons · state · fx · native · engine · views · ui · main
assets/   fonts · img · audio
android/  proyecto Gradle (WebView + recordatorios)
tools/    gen-sw.py (caché del modo web) · gen-bosses.py (imágenes de jefes)
```

Para probar en el navegador sirve la carpeta con cualquier servidor estático (`python3 -m http.server`) y abre `index.html`.
Tras cambiar archivos web ejecuta `python3 tools/gen-sw.py` para refrescar la caché.
