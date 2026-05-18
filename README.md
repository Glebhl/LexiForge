# Glosium

Glosium is a web page for generating AI-assisted languages lessons from your request.

## Requirements

- Node.js 20 or newer
- An OpenRouter API key

## Run Locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://127.0.0.1:5173/`.

## API Key

This prototype reads the OpenRouter key from browser `localStorage` under:

```text
openrouter_api_key
```

Use the included local storage utility at `/storage.html` to create or update that value for the current origin. The app links to this utility from the setup screen.

## Development Mode

Pipeline debug stubs live in `src/pipeline/stubs.js`. You can enable them, so exercise content can be tested without spending API calls.

## License

GPL-3.0-only. See [LICENSE](LICENSE).
