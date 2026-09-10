# Simulador ICFES Saber 11°

🌐 **En vivo:** https://dancruzul.github.io/icfes-eden/
📦 **Repo:** https://github.com/DanCruZul/icfes-eden

Simulador con el examen **completo oficial (254 preguntas calificables)** + exámenes por materia + roadmap de 24 semanas.

## 🚀 Deploy

Despliegue automático con **GitHub Pages** desde `main` (raíz). Cada push a `main` se publica solo en 1–2 min. Sin build, sin ZIP.

## 📦 Contenido

```
├── index.html          ← Simulador (examen 254 + por materia + ranking + calculadora)
├── roadmap.html        ← Roadmap 24 semanas con técnica de 400+ y recursos
├── netlify.toml        ← Config (por si se migra a Netlify)
├── css/style.css       ← UI bone-on-black (PAPER #000 · INK #cdc4ba · R2 · sin sombras)
├── js/app.js           ← Lógica: rotación, bloques, estímulos, figuras, Firebase
├── data/banco.json     ← 674 preguntas (cuadernillos oficiales + set propio estilo ICFES)
├── art/                ← hero, torii, power, beauty, beta, grain, favicon
└── fonts/              ← Fraunces, Space Grotesk, Space Mono (bundladas, offline-safe)
```

## ⚙️ Firebase (rankings en tiempo real)

**Sin Firebase:** todo funciona, los rankings no se guardan.

**Con Firebase:** puntajes en la nube en tiempo real.

1. [console.firebase.google.com](https://console.firebase.google.com) → crear proyecto gratis
2. **Firestore Database** → Crear base de datos → Modo de prueba → Habilitar
3. **Project settings** → General → "Your apps" → Web (`</>`)
4. Copiar la config en `firebaseConfig` al inicio de `js/app.js`:

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

5. Commit + push a `main`

## 🎯 Funcionalidades

- ✅ **674 preguntas** (cuadernillos oficiales + propias estilo ICFES con explicación)
- ✅ **Examen completo:** 254 calificables (Mat 50 · Lec 41 · Soc 50 · Cie 58 · Ing 55)
- ✅ **Inglés exacto:** 7 partes 6/6/6/10/9/6/12, formatos A-C (P1–P5) y A-D (P6–P7)
- ✅ **Estímulos compartidos:** el texto se muestra una vez, preguntas agrupadas (11 grupos)
- ✅ **Figuras HTML/CSS/SVG:** barras, tablas, plano cartesiano + soporte `media`
- ✅ **Rotación:** prioriza no vistas; bloques por materia (orden de sesión oficial)
- ✅ **Exámenes por materia:** tamaño real oficial
- ✅ **Etiqueta visible** en toda pregunta (tema/competencia o área)
- ✅ **Calculadora** con fórmula de ponderación oficial
- ✅ **Ranking** en tiempo real (con Firebase)
- ✅ **Timer** con alertas · **Roadmap** 24 semanas con técnica y recursos de 400+

---

## 📝 Notas importantes

- Las preguntas provienen de cuadernillos oficiales del ICFES (marzo 2026, 2024, 2021, 2019)
- Los puntajes son estimaciones: `Global = (3×Lectura + 3×Matemáticas + 3×Sociales + 3×Ciencias + 1×Inglés) ÷ 13 × 5`
- El modelo IRT real del ICFES puede variar ligeramente los puntajes
- El ranking usa Firebase Firestore (gratis hasta 50K lecturas/día)

---

## 🎨 Créditos de diseño

UI basada en [ryoku.dev](https://ryoku.dev) (GPL-3.0):
- Arte bone dithered (`art/*.png`) y textura `grain.png`
- Tipografías `fonts/`: Fraunces Variable, Space Grotesk Variable, Space Mono
- Tokens: PAPER #000 · INK #cdc4ba · RADIUS 2 · NO SHADOW
