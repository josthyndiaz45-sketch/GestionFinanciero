# 💸 GestionFinanciero

App personal de gestión financiera construida con **React Native + Expo (SDK 54)** y **Supabase**. Permite registrar movimientos, controlar presupuestos, metas de ahorro, estadísticas y recordatorios mensuales con avisos.

Funciona en **Android** (APK), **Web** (Netlify / cualquier estático) y está lista para **iOS** (requiere Apple Developer para el build nativo).

---

## ✨ Funcionalidades

- **Inicio** — saldo, ingresos/gastos del mes, alerta de presupuestos al 75% y últimos movimientos.
- **Movimientos** — registrar ingresos y gastos con categoría, método de pago, etiqueta y descripción. Búsqueda y filtros avanzados (fecha, tipo, categoría, método).
- **Estadísticas** — gráficos por tipo y categoría, comparación entre meses.
- **Presupuestos** — límite mensual por categoría con barra de uso (verde/naranja/rojo).
- **Metas de ahorro** — objetivo, monto ahorrado, fecha límite y aportes/reversiones.
- **Recordatorios** — pagos recurrentes mensuales con día fijo, opción "pagado este mes", aviso días antes (mismo día / 1 / 3 / 7) y tono de notificación (Android).
- **Configuración** — sueldo inicial, modo oscuro, perfil y cierre de sesión.

Todo se sincroniza a la cuenta de Supabase: movimientos, presupuestos, metas, sueldo inicial y recordatorios.

---

## 🧰 Stack

| Capa | Tecnología |
|---|---|
| App | React Native 0.81 · Expo 54 · React 19 · JavaScript |
| Navegación | React Navigation (bottom tabs + stack) |
| Backend | Supabase (auth + Postgres + Edge Functions) |
| Notificaciones locales | expo-notifications (Android) |
| Gráficos | react-native-chart-kit / react-native-svg |
| Persistencia local | @react-native-async-storage/async-storage |
| Comunidad | Icons Ionicons (@expo/vector-icons) |

---

## 🚀 Empezar

```bash
npm install
```

### Desarrollo (web)

```bash
npx expo start --web
```

### Desarrollo en teléfono (Expo Go)

> ⚠️ Actualmente el proyecto usa `expo-dev-client`, lo que **bloquea Expo Go**. Para probar con Expo Go: `npm uninstall expo-dev-client` y luego `npx expo start`.

### Build Android (APK)

```bash
npx eas build --platform android --profile preview
```

### Build Web (para Netlify)

```bash
npx expo export --platform web
```
Arrastra la carpeta `dist/` a https://app.netlify.com/drop.

---

## 🔧 Configuración de Supabase

Crea un proyecto en [Supabase](https://supabase.com) y configura la conexión en `src/config/supabase.js`:

```js
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'tu_anon_key';
```

### Tablas

Ejecuta este SQL en **SQL Editor** (Recordatorios y Sueldo inicial):

```sql
create table public.reminders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  amount numeric not null default 0,
  day_of_month int not null default 1,
  end_year int,
  indefinite boolean not null default true,
  paid_months jsonb not null default '[]',
  note text default '',
  alert_timing int not null default 0,
  sound text not null default 'default',
  notification_ids jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_user_id_idx on public.reminders(user_id);
alter table public.reminders enable row level security;
create policy reminders_own on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  initial_balance numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy user_settings_own on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

> También modela `transactions`, `budgets` y `saving_goals` con RLS sobre `auth.uid() = user_id`.

---

## 📧 Recordatorios por email (Web)

Para que los recordatorios te avisen también en la versión web (sin app nativa):

1. Crea una cuenta en [Resend](https://resend.com) **con el mismo email de tu cuenta de la app** y obtén una API Key.
2. Guarda el secret en Supabase: `RESEND_API_KEY`.
3. Despliega la función:

```bash
npx supabase login
npx supabase link --project-ref TU_PROYECTO_REF
npx supabase secrets set RESEND_API_KEY=re_xxx
npx supabase functions deploy send-reminders
```

4. Crea un horario en **Edge Functions → send-reminders → Schedules**:

```
Cron: 0 12 * * *
Timezone: America/Lima
```

Cada día a las 12 del mediodía llega un correo suave con los pagos que vencen hoy o en los próximos días, respetando el día fijo, el aviso configurado y los recibos ya pagados.

---

## 🔔 Notificaciones Web Push (navegadores)

Solo web: al abrir la app en el navegador se registra automáticamente una suscripción (te pedirá permiso). El envío lo hace la misma Edge Function de las 12:00, **diario hasta que marques "pagado"**.

1. Crea la tabla de suscripciones. Ejecuta en **SQL Editor** el contenido de `supabase/sql/push_subscriptions.sql`.
2. Guarda los secrets en Supabase (usa las llaves generadas en tu proyecto):

```bash
npx supabase secrets set VAPID_PUBLIC_KEY=...
npx supabase secrets set VAPID_PRIVATE_KEY=...
npx supabase secrets set VAPID_SUBJECT=mailto:tu@email.com
```

3. Despliega la función (ahora envía push + email opcional):

```bash
npx supabase functions deploy send-reminders
```

4. Programa el cron diario en **Edge Functions → send-reminders → Schedules** (o crea uno nuevo):

```
Cron: 0 12 * * *
Timezone: America/Lima
```

> ⚠️ Si tu schedule del correo ya existe, ahora enviará push además del email. Si el email no te importa, simplemente no configures `RESEND_API_KEY`.

**Notas de compatibilidad:**
- **Chrome/Edge (Android, PC)** y Windows: suenan y vibran, incluso con el navegador cerrado.
- **iPhone/iPad (Safari)**: debes agregar el sitio a pantalla de inicio (Share → "Añadir a pantalla de inicio") e iOS 16.4+; Apple no permite sonido en web push.
- Para probar al instante: configurado el cron, crea/haz un recordatorio sin pagar y pulsa "Invoke" en la función desde el dashboard.

---

## 📝 Recordatorio diario de "registrar movimientos" (web push)

Si **no registraste ningún movimiento en todo el día**, cada noche se te envía una notificación para que anotes tus gastos/ingresos. Si tuviste al menos un movimiento ese día, no llega nada.

1. Despliega la función (requiere los mismos secrets de VAPID de las notificaciones web):

```bash
npx supabase functions deploy movement-reminder
```

2. Programa el cron diario en **Edge Functions → movement-reminder → Schedules**:

```
Cron: 30 20 * * *
Timezone: America/Lima
```

Eso envía el aviso cada día a las **20:30** (hora de Perú).

3. **Probar desde la app**: en **Configuración → General → "Notificación de prueba"** se envía al instante una notificación web a tu sesión para comprobar que todo funciona (solo en navegador con permiso de notificaciones activado).

> El botón de prueba invoca la función en modo `{ mode: 'test', userId }`; el cron diario la invoca sin cuerpo (modo `daily`). Ambos envían solo a suscripciones web registradas (`push_subscriptions`).

---

## 🗂️ Estructura

```
App.js
src/
  components/      # Componentes reutilizables (calendario, picker de fecha, tile)
  config/          # Cliente de Supabase
  constants/       # Categorías, métodos de pago, temas, etiquetas
  models/          # Modelos Transaction, Budget, SavingGoal
  navigation/      # Navegador de pestañas + stack
  providers/       # Contextos (auth, balance, transacciones, presupuestos...)
  screens/         # Pantallas (home, movimientos, estadísticas, presupuestos, metas, recordatorios, ajustes, login)
  services/        # Servicios Supabase, recordatorios, notificaciones, etiquetas
  utils/           # formatCurrency, generateId
public/
  sw.js            # Service worker de Web Push
supabase/
  functions/
    send-reminders/   # Edge Function de recordatorios (push + email)
    movement-reminder/ # Edge Function de aviso diario si no hubo movimientos (push)
  sql/
    push_subscriptions.sql
```

---

## 👤 Autor

**Jostin Diaz** — app personal para el control de finanzas.