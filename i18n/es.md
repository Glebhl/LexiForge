# LexiForge

> Aviso: este texto fue traducido automaticamente.

LexiForge es un prototipo de escritorio para el aprendizaje de idiomas construido con `PySide6`, `Qt WebEngine` y una interfaz HTML/CSS/JavaScript. La aplicacion permite que el estudiante describa lo que quiere estudiar, genera tarjetas de vocabulario con OpenAI y luego inicia un flujo de leccion basado en el contenido seleccionado.

## Capacidades actuales

- Generacion de tarjetas de vocabulario mediante la OpenAI Responses API
- Flujo de leccion con varios tipos de tareas: explicacion, emparejamiento, traduccion, completar y pregunta
- Plan de leccion local en JSON usado como fuente temporal de la leccion

## Estructura del proyecto

```text
LexiForge/
├─ main.py                         # Punto de entrada de la aplicacion e inicializacion de dotenv
├─ backend.py                      # Puente Python <-> UI mediante senales/slots de Qt
├─ router.py                       # Navegacion entre pantallas y enrutamiento de controladores
├─ logging_config.py               # Configuracion de logging
├─ answer_matcher.py               # Normalizacion y validacion de respuestas
├─ language_converter.py           # Etiquetas de idioma y utilidades auxiliares
├─ requirements.txt                # Dependencias de Python
├─ .env                            # Variables de entorno locales (clave de OpenAI)
├─ lesson_plans/
│  └─ lesson.json                  # Datos temporales de la leccion
├─ llm_gateway/
│  ├─ openai_wrapper.py            # Envoltorio del cliente de OpenAI Responses API
│  ├─ openai_chat.py               # Helper para sesiones de chat
│  └─ openai_cache.py              # Helpers/estado de cache de prompts
├─ pipeline/
│  └─ vocab.py                     # Flujo de generacion de tarjetas de vocabulario
├─ prompts/
│  └─ en/
│     └─ vocab_setup.txt           # Prompt del sistema para generar vocabulario
└─ ui/
   ├─ controllers/                 # Controladores Python para configuracion y flujo de leccion
   ├─ views/                       # Pantallas HTML/CSS/JS
   └─ assets/                      # Fuentes, iconos y archivos compartidos del tema
```

## Primeros pasos

### 1. Clona el repositorio

```bash
git clone https://github.com/Glebhl/LexiForge.git
cd LexiForge
```

### 2. Crea y activa un entorno virtual

```bash
python -m venv venv
venv\Scripts\Activate.ps1
```

### 3. Instala las dependencias

```bash
pip install -r requirements.txt
```

### 4. Configura las variables de entorno

Crea un archivo `.env` en la raiz del proyecto y agrega tu clave de OpenAI API:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Sin `OPENAI_API_KEY`, la generacion de tarjetas de vocabulario no funcionara.

### 5. Ejecuta la aplicacion

```bash
python main.py
```

## Estado

Este proyecto sigue siendo un prototipo temprano. El flujo de configuracion del vocabulario ya usa OpenAI, mientras que el pipeline completo de generacion de lecciones todavia depende en parte de datos temporales de leccion en JSON.

## Hoja de ruta

Los siguientes pasos planificados incluyen:

- Generar lecciones completas a partir de las tarjetas de vocabulario seleccionadas
- Agregar soporte para mas idiomas
- Agregar soporte gramatical
- Agregar localizacion ademas del ingles
- Reemplazar las plantillas temporales de leccion por una creacion de lecciones totalmente impulsada por IA
- Agregar seguimiento del progreso

## Contribuciones

Se agradecen issues, sugerencias y pull requests.
