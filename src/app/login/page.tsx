
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { BookOpenCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { signInWithEmailAndPassword, query, collection, where, getDocs } from "firebase/auth";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const bgImage = PlaceHolderImages.find(p => p.id === 'login-background');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("admin");

  useEffect(() => {
    const role = searchParams.get('role');
    if (role === 'student') {
      setActiveTab('student');
    } else {
      setActiveTab('admin');
    }
  }, [searchParams]);

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      if (!auth) throw new Error("Auth service not available");
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting you to the dashboard.",
      });
      router.push('/dashboard');
    } catch (error) {
      console.error("Login error", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials. Please check your email and password.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const admissionNumber = formData.get("admissionNumber") as string;
    const dob = formData.get("dob") as string; // yyyy-mm-dd

    toast({
        variant: "destructive",
        title: "Student Login Not Implemented",
        description: "Student login is not yet available.",
    });

    setIsLoading(false);
    // TODO: Implement student login logic
    // 1. Query 'students' collection group for matching admissionNumber.
    // 2. If found, verify the dateOfBirth matches the provided 'dob'.
    // 3. If matches, you need a way to sign the user in. This usually requires a custom auth system
    //    or mapping student records to Firebase Auth users, which is complex.
    // 4. For now, we'll just show a "not implemented" message.
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
              Sign in to your account
            </p>
          </div>
          <Card className="z-20">
            <CardHeader>
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>
                Select your role and enter your credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="admin">Admin / Teacher</TabsTrigger>
                  <TabsTrigger value="student">Student</TabsTrigger>
                </TabsList>
                <TabsContent value="admin">
                  <form onSubmit={handleAdminLogin} className="pt-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="m@example.com"
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="flex items-center">
                          <Label htmlFor="password">Password</Label>
                          <Link
                            href="#"
                            className="ml-auto inline-block text-sm underline"
                          >
                            Forgot your password?
                          </Link>
                        </div>
                        <Input id="password" name="password" type="password" placeholder="••••••••" required disabled={isLoading} />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
                <TabsContent value="student">
                   <form onSubmit={handleStudentLogin} className="pt-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="admissionNumber">Admission Number</Label>
                        <Input
                          id="admissionNumber"
                          name="admissionNumber"
                          type="text"
                          placeholder="e.g., 2024001"
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input id="dob" name="dob" type="date" required disabled={isLoading} />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
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
