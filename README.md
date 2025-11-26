# Tokens del Sistema de Diseño de Kushki

Este repositorio contiene el archivo de configuración de los **Design Tokens** para el sistema de diseño de Kushki. Estos tokens están diseñados para ser utilizados con [Tokens Studio for Figma](https://www.tokens.studio/) y pueden ser exportados para su uso en diversas plataformas y frameworks.

---

## 🎨 ¿Qué son los Design Tokens?

Los Design Tokens son la fuente única de verdad para los valores de diseño de un sistema. Abstraen decisiones de diseño como colores, tipografía, espaciado y sombras en datos reutilizables.

Al utilizarlos, garantizamos que todas nuestras plataformas y productos tengan una experiencia de usuario unificada, cohesiva y consistente, facilitando a la vez las actualizaciones y el mantenimiento del sistema.

## 🚀 ¿Cómo usar estos tokens?

Para utilizar estos Design Tokens en Figma, necesitas tener instalado el plugin **[Tokens Studio for Figma](https://www.tokens.studio/figma)**. Una vez instalado, sigue estos pasos:

1.  **Clona o descarga** este repositorio.
2.  En Figma, abre el plugin de Tokens Studio.
3.  Ve a la pestaña de **Settings**.
4.  En la sección **Token Storage**, puedes conectar el archivo de varias formas. La más sencilla es:
    * Selecciona `Local` y haz clic en `Edit Storage`.
    * Arrastra tu archivo `tokens.json` directamente a la ventana del plugin.
5.  ¡Listo! Los tokens se cargarán automáticamente, organizados en los grupos que definiste (`primitivos`, `sistema`, etc.).

## 📁 Archivo de Tokens

Actualmente, todos los tokens se gestionan desde un único archivo para simplificar su mantenimiento.

* `tokens.json`: Contiene la totalidad de los design tokens, organizados en los siguientes grupos de alto nivel:
    * **`primitivos`**: Contiene los valores base e inmutables. Aquí se definen la paleta de colores completa (`blue`, `green`, `gray`, etc.), la escala tipográfica y de espaciado.
    * **`sistema`**: Define tokens semánticos que le dan un propósito a los tokens `primitivos`. Por ejemplo, `color.background.interactive.default` hace referencia a un color específico de la paleta primitiva. Estos son los tokens que deben usarse en el diseño de componentes.
    * **`component`**: Contiene tokens específicos para variantes de componentes, como la tipografía para un botón pequeño (`button.small`).

## ✨ Estructura de los Tokens

### Colores (`color`)

Nuestra paleta de colores se divide en primitivos y semánticos.

* **Primitivos**: Valores base de la paleta, incluyendo `blue`, `green`, `red`, `purple`, `yellow`, `gray`, `white` y `black`. También se definen gradientes base en `primitivos.color.gradientes`.
* **Semánticos**: Tokens con significado contextual que se encuentran en `sistema.color`. Están organizados por su función:
    * `background`: Para superficies y fondos.
    * `text`: Para todos los colores de texto.
    * `border`: Para bordes y separadores.
    * `status`: Colores para comunicar estados como `success`, `warning`, `danger` e `info`.
    * `gradient`: Gradientes con propósito, como `principal` y `suave`.

### Tipografía (`typography`)

* **Fuentes Primitivas**: Se utilizan las familias `IBM Plex Sans` e `IBM Plex Mono`. Los pesos disponibles son `light` (300), `regular` (400), `medium` (500) y `semi-bold` (600).
* **Estilos Semánticos**: En `system.typography` se definen todos los estilos de texto para la aplicación, como `h1`, `h2`, `body-1`, `caption`, `numeric-text`, entre otros. Cada uno es una combinación de fuente, peso, tamaño y espaciado.

### Espaciado (`spacing`)

Utilizamos una escala de espaciado en `rem` que va desde `scale-100` (0.25rem) hasta `scale-1600` (9rem). Esta escala se debe utilizar para `padding`, `margin`, `gap` y para definir tamaños consistentes en la UI.

### Sombras (`shadow`)

* **Primitive**: Se definen 4 niveles de elevación (`elevation-1-raw` a `elevation-4-raw`) con valores `dropShadow` complejos.
* **Semántic**: Los tokens en `semantic.shadow` (`ch`, `md`, `xl`, `Menu`) aplican las sombras primitivas a casos de uso específicos.

### Bordes (`radius` y `border-width`)

* **Radius**: Los radios de borde disponibles son `small` (4px), `medium` (8px) y `large` (16px).
* **Border Width**: Se definen anchos de `1px` y `2px`.

## 🤝 Contribuciones

Si deseas contribuir a la mejora de nuestro sistema de diseño, por favor, sigue estos pasos:

1.  Crea una nueva rama (`branch`) para tu `feature` o `bug fix`.
2.  Realiza tus cambios y asegúrate de que estén bien documentados.
3.  Crea un `Pull Request` detallando los cambios que realizaste.
4.  El equipo de Diseño y/o Frontend revisará tu PR.

---

**© 2025 Kushki. Todos los derechos reservados.**
