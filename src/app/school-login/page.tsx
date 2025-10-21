
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { BookOpenCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useState } from "react";

export default function SchoolLoginPage() {
  const bgImage = PlaceHolderImages.find(p => p.id === 'login-background');
  const router = useRouter();
  const { toast } = useToast();
  const { auth } = useFirebase();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!auth) {
        toast({ variant: "destructive", title: "Authentication service not ready." });
        return;
    }
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        toast({
          title: "Login Successful",
          description: "Welcome back! Redirecting you to the dashboard.",
        });
        router.push('/dashboard');
    } catch (error) {
        console.error("Google Sign-In Error: ", error);
        toast({ variant: "destructive", title: "Google Sign-In Failed", description: "Could not sign in with Google. Please try again." });
    } finally {
        setIsGoogleLoading(false);
    }
  };
  
  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="relative flex items-center justify-center min-h-screen py-12">
        <div className="absolute inset-0 bg-background/80 z-10" />
        <div className="relative z-20 mx-auto grid w-[380px] gap-6">
          <div className="grid gap-2 text-center">
            <Link href="/" className="flex justify-center items-center gap-2">
              <BookOpenCheck className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-headline">CampusConnect</h1>
            </Link>
            <p className="text-balance text-muted-foreground">
              Sign in to your school administrator account
            </p>
          </div>
          <Card className="z-20">
            <CardHeader>
              <CardTitle className="text-2xl">School Admin Login</CardTitle>
              <CardDescription>
                Use your Google account to access your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                  <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
                    {isGoogleLoading ? 'Signing in...' : 'Sign in with Google'}
                  </Button>
              </div>
            </CardContent>
          </Card>
          <div className="relative z-20 mt-4 text-center text-sm">
            Don&apos;t have a school account?{" "}
            <Link href="/register" className="underline">
              Register here
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        {bgImage && (
            <Image
                src={bgImage.imageUrl}
                alt={bgImage.description}
                fill
                className="object-cover"
                data-ai-hint={bgImage.imageHint}
            />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-background/10" />
      </div>
    </div>
  );
}
