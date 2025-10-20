
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { BookOpenCheck } from "lucide-react";

export default function RegisterPage() {
    const bgImage = PlaceHolderImages.find(p => p.id === 'login-background');
  
    return (
        <div className="w-full min-h-screen flex items-center justify-center p-4 bg-background">
             <div className="absolute inset-0 z-0">
                {bgImage && (
                    <Image
                        src={bgImage.imageUrl}
                        alt={bgImage.description}
                        fill
                        className="object-cover"
                        data-ai-hint={bgImage.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-background/90" />
            </div>
            <Card className="w-full max-w-2xl z-10">
                <CardHeader className="text-center">
                    <Link href="/" className="flex justify-center items-center gap-2 mb-2">
                        <BookOpenCheck className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold font-headline">CampusConnect</h1>
                    </Link>
                    <CardTitle className="text-2xl">Register Your School</CardTitle>
                    <CardDescription>
                        Join our platform by filling out the details below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="school-name">School Name</Label>
                            <Input id="school-name" placeholder="e.g., Prestige Elite Academy" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="udise-code">UDISE Code</Label>
                            <Input id="udise-code" placeholder="Unique Identification Code" required />
                        </div>
                        <div className="md:col-span-2 grid gap-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" placeholder="Full school address" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contact-email">Contact Email</Label>
                            <Input id="contact-email" type="email" placeholder="info@yourschool.com" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contact-phone">Contact Phone</Label>
                            <Input id="contact-phone" type="tel" placeholder="+91-1234567890" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="admin-name">Admin Name</Label>
                            <Input id="admin-name" placeholder="Full name of administrator" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" required />
                        </div>
                        <div className="md:col-span-2 mt-4 flex flex-col gap-4">
                            <Button type="submit" className="w-full">Create Account</Button>
                            <div className="text-center text-sm">
                                Already have an account?{" "}
                                <Link href="/login" className="underline">
                                    Login
                                </Link>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
