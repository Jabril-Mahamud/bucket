# 📚 Personal Library

> A modern, web-based personal library management system - think Calibre, but beautiful and accessible everywhere.

## ✨ What is this?

Personal Library is a modern alternative to Calibre that solves its biggest pain points:

- **Beautiful, responsive UI** that works on any device
- **Web-based access** - no desktop app required
- **Cloud sync** - access your library anywhere
- **Simple, clean interface** - not overwhelming like traditional library software
- **Progress tracking** - never lose your place in books or audiobooks

## 🚀 Current Features

### 📁 File Management

- **Drag & drop upload** with progress tracking
- **Multiple format support**: PDF, EPUB, TXT, MP3, WAV, M4A, AAC, OGG
- **Search and filtering** by filename and file type
- **Grid and list views** for browsing your collection

### 📖 Reading Experience  

- **Built-in PDF viewer** with progress saving
- **Audio player** with seeking, volume control, and position memory
- **Progress tracking** across all devices
- **Download and offline access**

### 🎨 Beautiful Interface

- **Modern design** with shadcn/ui components
- **Dark/light mode** support
- **Responsive layout** - perfect on mobile, tablet, and desktop
- **Smooth animations** and intuitive interactions

### 🔐 Secure & Private

- **User authentication** with Supabase Auth
- **Private file storage** - only you can access your files
- **Row-level security** protecting your data

## 🎯 Roadmap - Improving on Calibre

### 📊 Enhanced Metadata (Coming Soon)

- Cover art upload and display
- Book metadata (author, series, genre, publication date)
- Smart collections and custom tags
- Advanced search by metadata

### 🔄 Format Conversion

- PDF ↔ EPUB conversion
- Format optimization
- Batch processing

### 📈 Reading Analytics

- Reading statistics and insights
- Library overview dashboard
- Progress visualization

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Lucide React
- **Backend**: Supabase (Database, Auth, Storage)
- **Deployment**: Vercel-ready

## 🚀 Quick Start

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd personal-library
   npm install
   ```

2. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy `.env.example` to `.env.local`
   - Add your Supabase URL and anon key

3. **Run database migrations**

   ```bash
   # The migration file creates the necessary tables and storage buckets
   # Run it in your Supabase SQL editor: supabase/migrations/20250618201506_create_file_library.sql
   ```

4. **Start development**

   ```bash
   npm run dev
   ```

## 📁 Project Structure

```md
├── app/
│   ├── library/            # Library pages
│   ├── api/files/          # File serving API
│   └── auth/               # Authentication pages
├── components/
│   ├── file/               # File management components
│   └── ui/                 # shadcn/ui components
├── lib/
│   └── supabase/           # Supabase client setup
└── supabase/
    └── migrations/         # Database schema
```

## 🤝 Contributing

This is a personal project, but contributions are welcome! See our [Todo List](TODO.md) for planned features.

## 📄 License

MIT License - feel free to use this for your own personal library!

---

**Why not just use Calibre?**

Calibre is powerful but feels dated and is desktop-only. Personal Library brings library management into the modern web era with a clean, accessible interface that works everywhere. Perfect for the 2025+ era of reading across multiple devices.
