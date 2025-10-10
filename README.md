# 🎮 Gitts Trivia Game

Un juego de trivia interactivo y divertido construido con HTML, CSS y JavaScript vanilla.

## 📝 Descripción

Gitts Trivia Game es un juego de preguntas y respuestas que pone a prueba tus conocimientos en diversas áreas. El juego presenta 10 preguntas aleatorias de cultura general y lleva un registro de tu puntuación.

## ✨ Características

- 🎯 10 preguntas de trivia de cultura general
- 🔀 Preguntas aleatorias en cada partida
- 💯 Sistema de puntuación
- ✅ Retroalimentación inmediata (respuestas correctas/incorrectas)
- 📱 Diseño responsive (funciona en móviles y tablets)
- 🎨 Interfaz moderna y atractiva
- 🌟 Mensajes de rendimiento personalizados

## 🚀 Cómo Jugar

1. Abre el archivo `index.html` en tu navegador web
2. Haz clic en "Comenzar Juego"
3. Lee cada pregunta y selecciona la respuesta que crees correcta
4. Después de seleccionar, verás si tu respuesta fue correcta o incorrecta
5. Haz clic en "Siguiente Pregunta" para continuar
6. Al final, verás tu puntuación total y un mensaje de rendimiento

## 💻 Instalación

No se requiere instalación. Simplemente descarga los archivos y abre `index.html` en tu navegador:

```bash
# Clona el repositorio
git clone https://github.com/EmanolGonzalez/gitts-trivia-game.git

# Navega al directorio
cd gitts-trivia-game

# Abre index.html en tu navegador favorito
# O usa un servidor local como:
python -m http.server 8000
# Luego visita: http://localhost:8000
```

## 📁 Estructura del Proyecto

```
gitts-trivia-game/
│
├── index.html      # Estructura HTML del juego
├── styles.css      # Estilos y diseño
├── script.js       # Lógica del juego y preguntas
└── README.md       # Documentación
```

## 🎨 Tecnologías Utilizadas

- HTML5
- CSS3 (con Flexbox y Grid)
- JavaScript (ES6+)

## 🔧 Personalización

### Agregar Nuevas Preguntas

Para agregar más preguntas, edita el archivo `script.js` y añade objetos al array `triviaQuestions`:

```javascript
{
    question: "Tu pregunta aquí",
    answers: ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
    correct: 0 // Índice de la respuesta correcta (0-3)
}
```

### Cambiar Colores

Los colores principales se pueden cambiar en `styles.css`:
- Background gradient: líneas 8-9
- Botón principal: línea 74
- Colores de respuestas: líneas 157-169

## 📄 Licencia

Este proyecto está disponible libremente para uso personal y educativo.

## 👤 Autor

EmanolGonzalez

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Si tienes ideas para mejorar el juego:

1. Haz un Fork del proyecto
2. Crea una nueva rama (`git checkout -b feature/mejora`)
3. Realiza tus cambios
4. Commit tus cambios (`git commit -m 'Añadir nueva característica'`)
5. Push a la rama (`git push origin feature/mejora`)
6. Abre un Pull Request