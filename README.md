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
supabase/
  functions/
    send-reminders/   # Edge Function de recordatorios por email
```

---

## 👤 Autor

**Jostin Diaz** — app personal para el control de finanzas.