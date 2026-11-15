# Deto

Deto is a focused study and spaced revision system designed to help you log what you study and retain it indefinitely through two independent revision workflows:

1. **Queue View (FIFO Rotation)**: First-in, first-out rotation where the top card is "today's topic". Marking it done moves it to the bottom of the queue. The queue can also be manually reordered by dragging cards.
2. **Due View (Spaced Repetition)**: Systematic revision scheduling following an expanding interval cycle: 1 day after study, then 3, 7, 14, 30 days, and repeating every 30 days indefinitely.

Anyone can read notes, links, and attachments in **Visitor Mode**. Only the authenticated owner has access to **Owner Mode** to create, edit, delete, mark done, or drag-reorder topics.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router) + TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (official `mongodb` Node driver)
- **Attachment Storage**: MongoDB GridFS (PDFs & images)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/) (vertical sortable list with pointer & keyboard support)
- **Markdown**: `react-markdown`
- **Auth**: Built-in Node `crypto` HMAC-SHA256 session cookie + timing-safe comparison

---

## Environment Variables

Configure these variables in `.env.local` (see `.env.example` for placeholders):

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string (e.g. MongoDB Atlas cluster) |
| `MONGODB_DB` | MongoDB database name (default: `deto`) |
| `ADMIN_USERNAME` | Username for the single owner account |
| `ADMIN_PASSWORD` | Secure password for the owner account |
| `AUTH_SECRET` | Secret key (32+ characters) used to sign session cookies |

> **Security Note**: Never commit `.env.local` or hardcode credentials into source code. `.env.local` is excluded by `.gitignore`.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example environment configuration and fill in your details:

```bash
cp .env.example .env.local
```

### 3. Run development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

### 4. Build for production

```bash
npm run build
npm run start
```

### 5. Run tests & linting

```bash
npm test         # Run Vitest unit tests
npm run lint     # Run ESLint checks
```
