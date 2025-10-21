
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { BookOpenCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, where, getDocs, setDoc, doc, writeBatch } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";

const basicClasses = ["UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];

export default function RegisterPage() {
    const bgImage = PlaceHolderImages.find(p => p.id === 'login-background');
    const router = useRouter();
    const { toast } = useToast();
    const { firestore, auth } = useFirebase();
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const schoolName = formData.get("school-name") as string;
        const udiseCode = formData.get("udise-code") as string;
        const address = formData.get("address") as string;
        const contactEmail = formData.get("contact-email") as string;
        const contactPhone = formData.get("contact-phone") as string;
        const adminName = formData.get("admin-name") as string;
        const password = formData.get("password") as string;

        if (!firestore || !auth) {
            toast({
                variant: "destructive",
                title: "Registration Failed",
                description: "Firebase service is not available. Please try again later.",
            });
            setIsLoading(false);
            return;
        }

        try {
            // Create user first. If email is taken, this will fail.
            const userCredential = await createUserWithEmailAndPassword(auth, contactEmail, password);
            const user = userCredential.user;

            const batch = writeBatch(firestore);

            // 1. Create the school document
            const schoolData = {
                id: user.uid,
                schoolName,
                udiseCode,
                address,
                contactEmail,
                contactPhoneNumber: contactPhone,
                adminName,
            };
            const schoolDocRef = doc(firestore, "schools", user.uid);
            batch.set(schoolDocRef, schoolData);

            // 2. Create the master classes
            basicClasses.forEach(className => {
                const classId = doc(collection(firestore, `schools/${user.uid}/masterClasses`)).id;
                const classRef = doc(firestore, `schools/${user.uid}/masterClasses`, classId);
                batch.set(classRef, { id: classId, schoolId: user.uid, className });
            });
            
            // 3. Reserve the unique phone number
            const uniquePhoneNumberId = `phoneNumber_${contactPhone}`;
            const uniqueIdentifierRef = doc(firestore, "unique_identifiers", uniquePhoneNumberId);
            batch.set(uniqueIdentifierRef, { schoolId: user.uid });


            await batch.commit();
            
            toast({
                title: "Registration Successful",
                description: "Your school account has been created. Please log in.",
            });
            router.push('/login?role=school');

        } catch (error: any) {
            let errorMessage = "An unexpected error occurred. Please try again.";

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email is already registered. Please log in or use a different email.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "The password is too weak. Please use a stronger password.";
            } else if (error.code === 'permission-denied') {
                // This is a likely indicator that the unique_identifiers write failed.
                errorMessage = "This contact phone number is already in use by another school.";
            } else {
                console.error("Registration Error: ", error);
            }
            
            toast({
                variant: "destructive",
                title: "Registration Failed",
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };
  
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
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleRegister}>
                        <div className="grid gap-2">
                            <Label htmlFor="school-name">School Name</Label>
                            <Input id="school-name" name="school-name" placeholder="e.g., Prestige Elite Academy" required disabled={isLoading} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="udise-code">UDISE Code</Label>
                            <Input id="udise-code" name="udise-code" placeholder="Unique Identification Code" required disabled={isLoading} />
                        </div>
                        <div className="md:col-span-2 grid gap-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" name="address" placeholder="Full school address" required disabled={isLoading} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contact-email">Contact Email</Label>
                            <Input id="contact-email" name="contact-email" type="email" placeholder="info@yourschool.com" required disabled={isLoading} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="contact-phone">Contact Phone</Label>
                            <Input id="contact-phone" name="contact-phone" type="tel" placeholder="+91-1234567890" required disabled={isLoading} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="admin-name">Admin Name</Label>
                            <Input id="admin-name" name="admin-name" placeholder="Full name of administrator" required disabled={isLoading} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required disabled={isLoading} />
                        </div>
                        <div className="md:col-span-2 mt-4 flex flex-col gap-4">
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Creating Account...' : 'Create Account'}
                            </Button>
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

    