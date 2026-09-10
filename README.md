# Simulador ICFES Saber 11° — Subida a Netlify

## 📦 Contenido del ZIP

```
simulador-icfes-netlify.zip
├── index.html          ← Página principal
├── netlify.toml        ← Configuración de Netlify
├── css/style.css       ← Estilos (dark mode profesional)
├── js/app.js           ← Lógica del simulador + Firebase
└── data/banco.json     ← 629 preguntas reales de cuadernillos oficiales ICFES
```

## 🚀 Subida a Netlify

1. Ve a **[app.netlify.com](https://app.netlify.com)** e inicia sesión (es gratis)
2. En el dashboard, arrastra el archivo **ZIP** a la zona "Drag and drop your site output folder"
3. Netlify generará un enlace aleatorio como `https://random-name-123.netlify.app`
4. (Opcional) Ve a **Site configuration → Change site name** y ponle `icfes-eden` o similar

✅ ¡Listo! Ya puedes compartir el enlace con tus amigos.

---

## ⚙️ Configuración de Firebase (para rankings en tiempo real)

**Sin Firebase:** La página funciona perfectamente, pero los rankings no se guardan.

**Con Firebase:** Los puntajes se guardan en la nube y se ven en tiempo real en todas las PC.

### Pasos:

1. Ve a **[console.firebase.google.com](https://console.firebase.google.com)** y crea un proyecto (gratis)
2. En el menú lateral, ve a **Firestore Database** → **Crear base de datos** → **Modo de prueba** → **Habilitar**
3. Ve a **Project settings** (⚙️) → **General** → Baja hasta "Your apps" → **Web** (</>)
4. Registra la app y copia la configuración que te da (apiKey, projectId, etc.)
5. Abre el archivo `js/app.js` y reemplaza los valores en `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "TU_APP_ID"
};
```

6. Vuelve a subir el ZIP a Netlify

---

## 🎯 Funcionalidades

- ✅ **629 preguntas** reales de cuadernillos oficiales ICFES
- ✅ **4 modos:** Examen cronometrado, Práctica por área, Estudio, Repaso de errores
- ✅ **Calculadora de puntaje** con fórmula IRT real
- ✅ **Ranking global** en tiempo real (con Firebase)
- ✅ **Filtros** por área, tema y dificultad
- ✅ **Timer** con alertas de tiempo
- ✅ **Errores guardados** localmente para repaso
- ✅ **Diseño** dark mode profesional, responsive
- ✅ **Comparte el enlace** y los puntajes se sincronizan

---

## 📝 Notas importantes

- Las preguntas provienen de cuadernillos oficiales del ICFES (marzo 2026, 2024, 2021, 2019)
- Los puntajes son estimaciones basadas en la fórmula `Global = (3×Lectura + 3×Matemáticas + 3×Sociales + 3×Ciencias + 1×Inglés) ÷ 13 × 5`
- El modelo IRT real del ICFES puede variar ligeramente los puntajes
- El ranking usa Firebase Firestore (gratis hasta 50K lecturas/día)

---

*Creado con ❤️ para el vault Edén — Preparación ICFES Saber 11°*
