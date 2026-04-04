import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="#">
          <Video className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-bold">VideoEngine</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="/auth/sign-in">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button size="sm">Get Started</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1 overflow-hidden">
        <section className="w-full flex items-center justify-center py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Video Generator Templater
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Simple, fast, and powerful video generation from templates. 
                  Get started in seconds.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="px-8">
                    Start Generating
                  </Button>
                </Link>
                <Link href="/auth/sign-in">
                  <Button variant="outline" size="lg" className="px-8">
                    Documentation
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          © 2026 VideoEngine. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
