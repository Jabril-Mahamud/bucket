import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  BookOpen, 
  Headphones, 
  FileText, 
  Upload, 
  BarChart3, 
  Shield,
  Zap,
  Cloud,
  Smartphone,
  Palette,
  ArrowRight
} from "lucide-react";

const features = [
  {
    icon: <Upload className="h-6 w-6" />,
    title: "Easy Upload",
    description: "Drag & drop your PDFs, eBooks, and audio files with progress tracking"
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Smart Reading",
    description: "Built-in PDF viewer and progress tracking for all your documents"
  },
  {
    icon: <Headphones className="h-6 w-6" />,
    title: "Audio Player",
    description: "Beautiful audio player with progress saving and intuitive controls"
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Progress Tracking",
    description: "Never lose your place with automatic progress saving across devices"
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Secure & Private",
    description: "Your files are stored securely with user authentication and privacy"
  },
  {
    icon: <Palette className="h-6 w-6" />,
    title: "Beautiful Design",
    description: "Clean, modern interface with dark/light mode and responsive design"
  }
];

const supportedFormats = [
  { name: "PDF", icon: <FileText className="h-4 w-4" />, color: "text-red-500" },
  { name: "EPUB", icon: <BookOpen className="h-4 w-4" />, color: "text-indigo-500" },
  { name: "MP3", icon: <Headphones className="h-4 w-4" />, color: "text-emerald-500" },
  { name: "WAV", icon: <Headphones className="h-4 w-4" />, color: "text-emerald-500" },
  { name: "M4A", icon: <Headphones className="h-4 w-4" />, color: "text-emerald-500" },
  { name: "TXT", icon: <FileText className="h-4 w-4" />, color: "text-slate-500" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-20 max-w-7xl p-5 w-full">
          {/* Hero Section */}
          <div className="pt-16 pb-8">
            <Hero />
          </div>

          {/* Features Section */}
          <section className="space-y-12">
            <div className="text-center space-y-4">
              <Badge variant="secondary" className="text-sm">
                ✨ Features
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
                Everything you need for your personal library
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A beautiful, secure, and intuitive way to manage your documents and audio files with progress tracking and seamless syncing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="border-2 hover:border-primary/20 transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {feature.icon}
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Supported Formats */}
          <section className="space-y-8">
            <div className="text-center space-y-4">
              <Badge variant="outline" className="text-sm">
                📁 File Support
              </Badge>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
                Supports all your favorite formats
              </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {supportedFormats.map((format, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg border-2 border-transparent hover:border-primary/20 transition-colors"
                >
                  <span className={format.color}>{format.icon}</span>
                  <span className="font-medium text-sm">{format.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Tech Stack */}
          <section className="space-y-8">
            <div className="text-center space-y-4">
              <Badge variant="outline" className="text-sm">
                ⚡ Tech Stack
              </Badge>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
                Built with modern technology
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
                <Zap className="h-8 w-8 text-blue-500" />
                <span className="font-medium text-sm">Next.js</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
                <Cloud className="h-8 w-8 text-green-500" />
                <span className="font-medium text-sm">Supabase</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
                <Palette className="h-8 w-8 text-purple-500" />
                <span className="font-medium text-sm">Tailwind</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
                <Smartphone className="h-8 w-8 text-orange-500" />
                <span className="font-medium text-sm">Responsive</span>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          {hasEnvVars && (
            <section className="text-center space-y-8 py-16">
              <div className="space-y-4">
                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
                  Ready to organize your library?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Start building your personal digital library today
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/auth/sign-up">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href="/auth/login">
                    Sign In
                  </Link>
                </Button>
              </div>
            </section>
          )}

          {/* Setup Instructions */}
          <main className="flex-1 flex flex-col gap-6 px-4">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-xl">
                {hasEnvVars ? "Get Started" : "Setup Instructions"}
              </h2>
              <Badge variant="outline" className="text-xs">
                {hasEnvVars ? "Ready to use" : "Configuration needed"}
              </Badge>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16 bg-muted/30">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}