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
  ArrowRight,
  Sparkles
} from "lucide-react";

const features = [
  {
    icon: <Upload className="h-5 w-5" />,
    title: "Easy Upload",
    description: "Drag & drop your PDFs, eBooks, and audio files with progress tracking"
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Smart Reading",
    description: "Built-in PDF viewer and progress tracking for all your documents"
  },
  {
    icon: <Headphones className="h-5 w-5" />,
    title: "Audio Player",
    description: "Beautiful audio player with progress saving and intuitive controls"
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Progress Tracking",
    description: "Never lose your place with automatic progress saving across devices"
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Secure & Private",
    description: "Your files are stored securely with user authentication and privacy"
  },
  {
    icon: <Palette className="h-5 w-5" />,
    title: "Beautiful Design",
    description: "Clean, modern interface with dark/light mode and responsive design"
  }
];

const supportedFormats = [
  { name: "PDF", icon: <FileText className="h-3.5 w-3.5" />, color: "text-red-500" },
  { name: "EPUB", icon: <BookOpen className="h-3.5 w-3.5" />, color: "text-indigo-500" },
  { name: "MP3", icon: <Headphones className="h-3.5 w-3.5" />, color: "text-emerald-500" },
  { name: "WAV", icon: <Headphones className="h-3.5 w-3.5" />, color: "text-emerald-500" },
  { name: "M4A", icon: <Headphones className="h-3.5 w-3.5" />, color: "text-emerald-500" },
  { name: "TXT", icon: <FileText className="h-3.5 w-3.5" />, color: "text-slate-500" },
];

const techStack = [
  { name: "Next.js", icon: <Zap className="h-6 w-6" />, color: "text-blue-500" },
  { name: "Supabase", icon: <Cloud className="h-6 w-6" />, color: "text-green-500" },
  { name: "Tailwind", icon: <Palette className="h-6 w-6" />, color: "text-purple-500" },
  { name: "Responsive", icon: <Smartphone className="h-6 w-6" />, color: "text-orange-500" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Hero Section */}
          <section className="pt-20 pb-16 text-center">
            <div className="space-y-6">
              <Badge variant="secondary" className="text-xs font-medium">
                <Sparkles className="h-3 w-3 mr-1" />
                Modern Library Management
              </Badge>
              
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                  Your Personal Library,
                  <span className="text-primary block">Beautifully Organized</span>
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  A modern, web-based alternative to Calibre. Upload, organize, and read your documents and audio files from anywhere.
                </p>
              </div>

              {hasEnvVars && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button asChild size="lg" className="gap-2 h-11 px-6">
                    <Link href="/auth/sign-up">
                      Get Started Free
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-11 px-6">
                    <Link href="/auth/login">
                      Sign In
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16">
            <div className="text-center space-y-4 mb-12">
              <Badge variant="outline" className="text-xs">
                Features
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Everything you need for your library
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed to make managing your digital collection effortless and enjoyable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="border hover:border-primary/20 transition-all duration-200 hover:shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md text-primary">
                        {feature.icon}
                      </div>
                      <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Supported Formats */}
          <section className="py-16">
            <div className="text-center space-y-4 mb-12">
              <Badge variant="outline" className="text-xs">
                File Support
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Supports all your favorite formats
              </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {supportedFormats.map((format, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 rounded-lg border hover:border-primary/20 transition-colors"
                >
                  <span className={format.color}>{format.icon}</span>
                  <span className="font-medium text-sm">{format.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Tech Stack */}
          <section className="py-16">
            <div className="text-center space-y-4 mb-12">
              <Badge variant="outline" className="text-xs">
                Built with Modern Tech
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Powered by the best tools
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {techStack.map((tech, index) => (
                <div key={index} className="flex flex-col items-center gap-3 p-6 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className={tech.color}>{tech.icon}</span>
                  <span className="font-medium text-sm">{tech.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          {hasEnvVars && (
            <section className="py-20 text-center">
              <div className="space-y-6">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Ready to organize your library?
                </h2>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  Join and start building your personal digital library today
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button asChild size="lg" className="gap-2 h-11 px-6">
                    <Link href="/auth/sign-up">
                      Get Started Free
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-11 px-6">
                    <Link href="/auth/login">
                      Sign In
                    </Link>
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Powered by{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                className="font-medium hover:underline"
                rel="noreferrer"
              >
                Supabase
              </a>
            </p>
            <ThemeSwitcher />
          </div>
        </div>
      </footer>
    </main>
  );
}