
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { BookOpenCheck, School, Users, FileText, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function LandingPage() {
  const bgImage = PlaceHolderImages.find(p => p.id === 'login-background');

  const features = [
    {
      icon: <School className="h-10 w-10 text-primary" />,
      title: "School Management",
      description: "Oversee all administrative tasks from a single, intuitive dashboard.",
    },
    {
      icon: <Users className="h-10 w-10 text-primary" />,
      title: "Student & Teacher Profiles",
      description: "Manage student information, track academic progress, and maintain teacher records.",
    },
    {
      icon: <FileText className="h-10 w-10 text-primary" />,
      title: "Academic Reports",
      description: "Generate and view detailed performance reports for students and classes.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="#" className="flex items-center gap-2 mr-auto">
            <BookOpenCheck className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold font-headline">CampusConnect</span>
          </Link>
          <nav className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  Login <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href="/login?role=admin">Admin Login</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/login?role=teacher">Teacher Login</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/login?role=student">Student Login</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild>
              <Link href="/register">Register School</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative w-full h-[60vh] flex items-center justify-center text-center">
          {bgImage && (
              <Image
                  src={bgImage.imageUrl}
                  alt={bgImage.description}
                  fill
                  className="object-cover"
                  data-ai-hint={bgImage.imageHint}
              />
          )}
          <div className="absolute inset-0 bg-background/80" />
          <div className="relative z-10 container px-4 md:px-6">
            <div className="grid gap-6">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-foreground">
                The All-in-One School Management Platform
              </h1>
              <p className="max-w-[600px] mx-auto text-muted-foreground md:text-xl">
                CampusConnect streamlines school administration, enhances communication, and empowers educators, students, and parents.
              </p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row justify-center">
                <Button size="lg" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="container py-12 md:py-24 lg:py-32">
          <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-1 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
            <div className="grid gap-1">
              <h2 className="text-3xl font-bold tracking-tighter">Everything You Need</h2>
              <p className="text-muted-foreground">
                All the tools to run your educational institution efficiently.
              </p>
            </div>
            {features.map((feature, index) => (
              <div key={index} className="grid gap-4 p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                {feature.icon}
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} CampusConnect. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
