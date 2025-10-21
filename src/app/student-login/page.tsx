"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { BookOpenCheck, Construction } from "lucide-react";

export default function StudentLoginPage() {
    const bgImage = PlaceHolderImages.find(p => p.id === 'login-background');
  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="relative flex items-center justify-center min-h-screen py-12">
         <div className="absolute inset-0 bg-background/80 z-10" />
        <div className="relative z-20 mx-auto grid w-[380px] gap-6 text-center">
             <Link href="/" className="flex justify-center items-center gap-2">
              <BookOpenCheck className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold font-headline">CampusConnect</h1>
            </Link>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Student Portal</CardTitle>
              <CardDescription>
                This feature is coming soon!
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <Construction className="w-16 h-16 text-primary" />
                <p className="text-muted-foreground">The student login portal is currently under construction. Please check back later.</p>
                <Link href="/" className="underline text-sm">Return to Homepage</Link>
            </CardContent>
          </Card>
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
