# LexiForge

## Localizations

- [Русский](i18n/ru.md)
- [Español](i18n/es.md)
- [中文](i18n/zh.md)

## Short Overview

LexiForge is a desktop prototype for language learning built with `PySide6`, `Qt WebEngine`, and an HTML/CSS/JavaScript UI. The app lets a learner describe what they want to study, generates vocabulary cards with OpenAI, and then launches a lesson flow based on the selected content.

## Current Capabilities

- Vocabulary card generation through the OpenAI Responses API
- Lesson flow with multiple task types: explanation, matching, translation, filling, and question
- Local JSON lesson plan used as a temporary lesson source

## Project Layout

```text
LexiForge/
├─ main.py                         # Application entry point and dotenv bootstrap
├─ backend.py                      # Python <-> UI bridge via Qt signals/slots
├─ router.py                       # Screen navigation and controller routing
├─ logging_config.py               # Logging setup
├─ answer_matcher.py               # Answer normalization and validation
├─ language_converter.py           # Language labels/helpers
├─ requirements.txt                # Python dependencies
├─ .env                            # Local environment variables (OpenAI key)
├─ lesson_plans/
│  └─ lesson.json                  # Temporary lesson data
├─ llm_gateway/
│  ├─ openai_wrapper.py            # OpenAI Responses API client wrapper
│  ├─ openai_chat.py               # Chat session helper
│  └─ openai_cache.py              # Prompt cache helpers/state
├─ pipeline/
│  └─ vocab.py                     # Vocabulary card generation pipeline
├─ prompts/
│  └─ en/
│     └─ vocab_setup.txt           # System prompt for vocabulary generation
└─ ui/
   ├─ controllers/                 # Python controllers for setup and lesson flow
   ├─ views/                       # HTML/CSS/JS screens
   └─ assets/                      # Fonts, icons, shared theme files
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Glebhl/LexiForge.git
cd LexiForge
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root and add your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Without `OPENAI_API_KEY`, vocabulary generation will not work.

### 5. Run the app

```bash
python main.py
```

## Status

This project is still an early prototype. The vocabulary setup flow already uses OpenAI, while the full lesson generation pipeline is still partially backed by temporary JSON lesson data.

## Roadmap

Planned next steps include:

- Generate full lessons from the selected vocabulary cards
- Add support for more languages.
- Add grammar support
- Add localization other than English.
- Replace temporary lesson templates with fully AI-driven lesson creation
- Add progress tracking

## Contributing

Issues, suggestions, and pull requests are welcome.
