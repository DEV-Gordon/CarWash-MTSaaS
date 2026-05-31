# 📘 Documentación general — CarWash (MT-SaaS)

> Documento de referencia del proyecto. Pensado para **dos públicos**:
> 1. El **grupo evaluador**, para entender qué hace el sistema, cómo está construido y cómo probarlo.
> 2. **Nuestro equipo**, como base para preparar la presentación.

---

## 1. ¿Qué es el proyecto?

**CarWash** es una aplicación web de **gestión para lavaderos de autos**. Permite a un
negocio administrar sus clientes, vehículos, empleados, servicios y citas desde un
panel web, con control de acceso por roles y un modelo de suscripción mensual.

Es un sistema **multi-tenant** (multi-inquilino): un mismo despliegue da servicio a
**varios negocios a la vez**, y cada negocio solo ve y gestiona **sus propios datos**.
De ahí el nombre del repositorio: **MT-SaaS** = *Multi-Tenant Software as a Service*.

### En una frase
> Un panel web donde cada lavadero registra su negocio, paga una suscripción mensual,
> y gestiona su operación diaria (clientes, vehículos, citas y facturas) con cuentas
> de administrador y de empleado.

---

## 2. El problema que resuelve

Los lavaderos pequeños suelen llevar su operación en cuadernos, hojas de cálcula
sueltas o mensajes de WhatsApp. Eso provoca:

- Pérdida de información de clientes y vehículos.
- Citas olvidadas o duplicadas.
- Falta de control sobre cuánto se factura.
- Ningún registro de qué empleado atendió qué servicio.

**CarWash** centraliza todo eso en un solo lugar, accesible desde el navegador, sin
instalar nada en el equipo del usuario.

---

## 3. Concepto multi-tenant (explicado simple)

Imagina un edificio de oficinas:

- El **edificio** = la aplicación (un solo despliegue).
- Cada **oficina** = un negocio (*tenant*), con su propia llave.
- Cada negocio entra y solo ve **su oficina**, nunca la de al lado.

Técnicamente, **todos los datos cuelgan de una entidad `Business`** (Negocio). Cada
consulta a la base de datos se filtra automáticamente por el negocio del usuario
autenticado, así que es **imposible** que un negocio vea datos de otro.

---

## 4. Stack tecnológico

| Capa | Tecnología | Por qué |
|------|------------|---------|
| **Frontend** | Angular 21 (standalone components, signals, *zoneless*) | Framework moderno, reactivo y tipado (TypeScript) |
| **Backend** | Django + Django REST Framework | API REST robusta y rápida de desarrollar |
| **Autenticación** | JWT (`djangorestframework-simplejwt`) | Tokens sin estado, ideales para SPA + API |
| **Base de datos** | SQLite | Cero configuración; suficiente para el alcance académico |
| **Estilos** | CSS propio (sin frameworks) | Control total del diseño, sin dependencias |
| **CORS** | `django-cors-headers` | Permite que el frontend (4200) hable con la API (8000) |

### Datos técnicos clave (de `settings.py`)
- **Token de acceso:** 8 horas · **Token de refresco:** 7 días (con rotación).
- **Paginación:** 20 elementos por página (DRF `PageNumberPagination`).
- **Usuario personalizado:** `AUTH_USER_MODEL = accounts.BusinessUser`.
- **CORS permitido:** `http://localhost:4200` por defecto.

---

## 5. Arquitectura general

```
┌─────────────────────────┐         HTTP / JSON (REST)        ┌──────────────────────────┐
│      FRONTEND (SPA)      │  ───────────────────────────────▶ │       BACKEND (API)       │
│      Angular 21          │   Authorization: Bearer <JWT>     │   Django REST Framework   │
│                          │ ◀─────────────────────────────── │                          │
│  • Guards (auth/rol/sub) │                                   │  • JWT auth               │
│  • Interceptor JWT       │                                   │  • Permisos (IsAdmin)     │
│  • Servicios (signals)   │                                   │  • Middleware suscripción │
│  • Componentes por módulo│                                   │  • Filtro multi-tenant    │
└─────────────────────────┘                                   └────────────┬─────────────┘
                                                                            │
                                                                  ┌─────────▼─────────┐
                                                                  │  SQLite (db)      │
                                                                  └───────────────────┘
```

### Backend — organizado en dos apps
- **`accounts`** → autenticación, negocios, suscripciones y usuarios (cuentas de login).
- **`wash`** → la lógica del negocio: clientes, vehículos, empleados, servicios y citas.

### Frontend — organizado por responsabilidad
- **`core/`** → cosas transversales: autenticación, guards, interceptor, servicio API genérico, modelos.
- **`features/`** → un módulo por pantalla (dashboard, clientes, citas, etc.).
- **`shared/`** → el *shell* (menú lateral + cabecera) que envuelve toda la app.

---

## 6. Modelo de datos

```
Business (Negocio)
 ├── Subscription (1:1)         → estado de la suscripción mensual
 ├── BusinessUser (1:N)         → cuentas que inician sesión (admin / empleado)
 ├── Client (1:N)               → clientes del negocio
 │     └── Vehicle (1:N)        → vehículos de cada cliente
 ├── Employee (1:N)             → fichas del personal (no inician sesión)
 ├── WashService (1:N)          → catálogo de servicios con precio
 └── Appointment (1:N)          → citas
       ├── vehicle (FK)         → qué vehículo se atiende
       ├── employee (FK, opc.)  → quién lo atiende
       └── services (N:M)       → uno o varios servicios
```

### Relación importante: la cita "apunta" al vehículo, no al cliente
Una cita se asocia a un **vehículo**, y el vehículo ya pertenece a un **cliente**. Así,
al elegir el vehículo se sabe automáticamente quién es el dueño. Tiene sentido porque
el servicio se le hace al carro, y un cliente puede tener varios vehículos.

### ⚠️ "Empleados" y "Equipo" NO son lo mismo
Es el punto que más suele confundir. Son dos conceptos distintos a propósito:

| | **Empleados** (`Employee`) | **Equipo / Usuarios** (`BusinessUser`) |
|---|---|---|
| Qué es | Ficha de personal (RRHH) | Cuenta de acceso al sistema |
| ¿Inicia sesión? | ❌ No | ✅ Sí |
| Se usa para | Asignar quién atiende una cita | Entrar al panel con usuario y contraseña |

---

## 7. Roles y permisos

Cada cuenta de login tiene un **rol**, y el acceso se controla en **dos capas**
(no solo se oculta en pantalla, también se bloquea en la API):

| Rol | Qué puede hacer |
|-----|-----------------|
| `admin` / `superadmin` | **Todo**, incluido Empleados, Equipo y Suscripción |
| `employee` | Dashboard, Citas, Clientes, Vehículos, Servicios |

**Módulos solo para administradores:** Empleados, Equipo (usuarios) y Suscripción.

```
Backend  → permiso IsAdmin en las vistas sensibles → responde HTTP 403 si no es admin
Frontend → adminGuard en /employees, /users, /subscription → redirige a /dashboard
         → el menú lateral oculta esos ítems a los empleados
```

> **Defensa en profundidad:** aunque un empleado escriba la URL `/users` a mano, el
> guard lo redirige; y si intentara llamar a la API directamente, recibiría un 403.

---

## 8. Funcionalidades principales (por módulo)

| Módulo | Descripción |
|--------|-------------|
| **Registro** | Alta de un negocio nuevo + su usuario administrador. Inicia 14 días de prueba. |
| **Login** | Inicio de sesión con usuario y contraseña → entrega tokens JWT. |
| **Dashboard** | Estadísticas del negocio: nº de clientes, vehículos, citas de hoy, pendientes, ingresos del mes. |
| **Clientes** | Alta/edición/baja de clientes, con sus vehículos. |
| **Vehículos** | Vehículos asociados a cada cliente (placa, marca, modelo…). |
| **Empleados** | Fichas del personal (para asignarlas a las citas). *Solo admin.* |
| **Equipo** | Cuentas de login del negocio, con rol y contraseña inicial. *Solo admin.* |
| **Servicios** | Catálogo de servicios con precio y duración. |
| **Citas** | Agenda de lavados: vehículo, servicios, empleado, estado y **factura imprimible**. |
| **Suscripción** | Ver estado y renovar la suscripción mensual. *Solo admin.* |

---

## 9. Flujos de uso clave

### 9.1 Alta de un negocio (primer uso)
```
1. El dueño abre /register
2. Registra el negocio + su usuario admin
3. El sistema crea el negocio y le da 14 días de PRUEBA (trial)
4. Entra automáticamente al panel
```

### 9.2 Dar acceso a un empleado
```
1. El admin entra a "Equipo" → "Nuevo usuario"
2. Define usuario, rol = Empleado y una contraseña inicial
3. El empleado ya puede entrar en /login con ese usuario y contraseña
4. El empleado ve un menú REDUCIDO (sin Empleados, Equipo ni Suscripción)
```

### 9.3 Registrar una cita y facturarla
```
1. (Requisito) Tener al menos un vehículo y un servicio registrados
2. "Citas" → "Nueva cita" → elegir vehículo, servicios, empleado, fecha
3. El sistema calcula el total automáticamente
4. Botón "Factura" → vista del comprobante → "Imprimir"
5. El navegador permite imprimir en papel o "Guardar como PDF"
```

### 9.4 Qué pasa si vence la suscripción
```
Suscripción vencida/suspendida
   → el middleware del backend bloquea los endpoints (HTTP 402)
   → el interceptor del frontend redirige a /subscription
   → solo el admin puede renovar
```

---

## 10. Seguridad

- **Autenticación JWT:** cada petición lleva el token en la cabecera `Authorization: Bearer`.
  El interceptor del frontend lo agrega automáticamente y refresca el token al expirar.
- **Aislamiento multi-tenant:** cada consulta se filtra por el negocio del usuario; un
  negocio nunca accede a datos de otro.
- **Roles:** permisos `IsAdmin` en la API + guards en el frontend.
- **Contraseñas:** se almacenan **hasheadas** (nunca en texto plano) usando el sistema de
  Django, con validadores de longitud mínima y contraseñas comunes.

---

## 11. Modelo de negocio: la suscripción

| Estado | Significado |
|--------|-------------|
| `trial` | Periodo de prueba de 14 días al registrarse |
| `active` | Suscripción activa y al día |
| `expired` | Se pasó la fecha de vencimiento (automático) |
| `suspended` | Suspendida manualmente |

El estado se revisa y actualiza solo (`check_and_update_status`) en cada petición
(middleware), al iniciar sesión y al consultar el perfil.

---

## 12. Cómo ejecutar el proyecto

### Backend (Django)
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # opcional, crea un superadmin
python manage.py runserver         # queda en http://localhost:8000
```

### Frontend (Angular)
```bash
cd frontend
npm install
npm start                          # o: ng serve  → http://localhost:4200
```

> La URL de la API se configura en `frontend/src/environments/`. Por defecto apunta a
> `http://localhost:8000/api`.

**Para una demo cómoda:** tener el backend con datos de ejemplo (un negocio, algunos
clientes/vehículos/servicios) para que las pantallas no salgan vacías.

---

## 13. Decisiones técnicas a destacar (puntos fuertes para la presentación)

- **Angular *zoneless* con signals:** estado reactivo moderno sin la antigua dependencia
  de Zone.js — refleja el rumbo actual del framework.
- **Servicio API genérico y tipado:** un solo `ResourceClient<T>` da CRUD a todos los
  recursos, evitando código repetido.
- **Multi-tenant real:** no es solo "una tabla con un campo negocio"; el filtrado está
  centralizado en un *mixin* del backend.
- **Control de acceso en dos capas:** la restricción por rol es real (API + UI), no solo
  cosmética.
- **Suscripción como *gate*:** un middleware bloquea el sistema cuando la suscripción no
  está activa, simulando un SaaS real.
- **Facturación sin backend extra:** la factura se arma con datos que ya tiene la cita y
  se imprime con las capacidades del navegador.

---

## 14. Limitaciones conocidas y trabajo futuro

**Limitaciones actuales (alcance académico):**
- Base de datos SQLite (no apta para producción con mucha carga).
- Pasarela de pago **simulada**: la renovación es manual, no hay cobro real.
- La factura usa el nombre del negocio; aún no incluye dirección/teléfono/NIT.
- El usuario de login y la ficha de empleado no se crean en un solo paso.

**Trabajo futuro:**
- Integrar pasarela de pago real (Stripe / Conekta).
- Notificaciones por correo/WhatsApp al vencer la suscripción.
- Reportes mensuales de ingresos en PDF.
- Subida de logo del negocio.
- Migrar a PostgreSQL y desplegar con Docker.

---

## 15. Glosario rápido

| Término | Significado |
|---------|-------------|
| **SaaS** | Software como Servicio: se usa por internet, sin instalar nada. |
| **Multi-tenant** | Un sistema que sirve a varios clientes (negocios) aislados entre sí. |
| **Tenant** | Cada "inquilino" del sistema; aquí, cada negocio. |
| **JWT** | Token firmado que prueba quién eres en cada petición. |
| **API REST** | Conjunto de URLs que devuelven/reciben datos (JSON). |
| **SPA** | *Single Page Application*: app web que no recarga la página completa. |
| **CRUD** | Crear, Leer, Actualizar, Borrar (operaciones básicas sobre datos). |
| **Middleware** | Código que intercepta cada petición antes de procesarla. |
| **Guard** | En Angular, una "barrera" que decide si se puede entrar a una ruta. |

---

## 16. Guía para la presentación

### Hilo conductor sugerido (storytelling)
1. **El problema** → un lavadero llevando todo en papel.
2. **La solución** → mostrar el registro de un negocio (trial de 14 días).
3. **El día a día** → crear cliente → vehículo → servicio → **una cita**.
4. **El detalle que impresiona** → generar e imprimir la **factura**.
5. **El control de acceso** → entrar como **empleado** y mostrar el menú reducido.
6. **El modelo de negocio** → enseñar la pantalla de suscripción.
7. **Cierre** → arquitectura y trabajo futuro.

### Demo en vivo: checklist previo
- [ ] Backend corriendo (`runserver`) y frontend (`ng serve`).
- [ ] Existe un negocio con datos de ejemplo (no empezar de cero en vivo).
- [ ] Tener creada una **cuenta de empleado** para mostrar la diferencia de roles.
- [ ] Tener al menos una **cita** lista para enseñar la factura.

### Posibles preguntas del evaluador (y respuesta corta)
- **¿Cómo evitan que un negocio vea datos de otro?**
  Todo se filtra por el negocio del usuario autenticado; está centralizado en el backend.
- **¿Las contraseñas se guardan seguras?**
  Sí, hasheadas con el sistema de Django, nunca en texto plano.
- **¿Qué pasa si un empleado intenta entrar a una sección de admin por la URL?**
  El guard lo redirige y, además, la API responde 403. Doble protección.
- **¿La diferencia entre "Empleados" y "Equipo"?**
  Empleados = fichas de personal (no entran al sistema); Equipo = cuentas que sí inician sesión.
- **¿Por qué la cita se asocia al vehículo y no al cliente?**
  Porque el servicio es para el carro, y un cliente puede tener varios; el dueño se deduce del vehículo.
- **¿Es un cobro real la suscripción?**
  No, está simulada (renovación manual); la integración de pagos es trabajo futuro.

---

*Para detalles técnicos de instalación, endpoints y estructura de carpetas, ver también el `README.md`.*
