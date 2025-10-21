
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
import { collection, query, where, getDocs, setDoc, doc, writeBatch, getDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, type User } from "firebase/auth";
import { useState, useEffect } from "react";

const basicClasses = ["UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];

export default function RegisterPage() {
    const bgImage = PlaceHolderImages.find(p => p.id === 'login-background');
    const router = useRouter();
    const { toast } = useToast();
    const { firestore, auth } = useFirebase();
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isSchoolRegistered, setIsSchoolRegistered] = useState<boolean | null>(null);

    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const schoolQuery = query(collection(firestore!, 'schools'), where('id', '==', currentUser.uid));
                const schoolSnap = await getDocs(schoolQuery);
                const schoolExists = !schoolSnap.empty;
                setIsSchoolRegistered(schoolExists);
                if(schoolExists) {
                  router.push('/dashboard');
                }
            } else {
                setUser(null);
                setIsSchoolRegistered(null);
            }
        });
        return () => unsubscribe();
    }, [auth, firestore, router]);

    const handleGoogleSignIn = async () => {
        if (!auth) {
            toast({ variant: "destructive", title: "Authentication service not ready." });
            return;
        }
        setIsLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Google Sign-In Error: ", error);
            toast({ variant: "destructive", title: "Google Sign-In Failed", description: "Could not sign in with Google. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRegisterSchool = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !firestore) {
             toast({ variant: "destructive", title: "Error", description: "You must be signed in to register a school." });
            return;
        }
        setIsLoading(true);
        
        const formData = new FormData(e.currentTarget);
        const schoolName = formData.get("school-name") as string;
        const udiseCode = formData.get("udise-code") as string;
        const address = formData.get("address") as string;
        const contactPhone = formData.get("contact-phone") as string;
        const adminName = formData.get("admin-name") as string;

        const batch = writeBatch(firestore);

        const schoolData = {
            id: user.uid,
            schoolName,
            udiseCode,
            address,
            contactEmail: user.email,
            contactPhoneNumber: contactPhone,
            adminName,
        };
        const schoolDocRef = doc(firestore, "schools", user.uid);
        batch.set(schoolDocRef, schoolData);

        const phoneIdentifier = `phoneNumber_${contactPhone}`;
        const uniqueIdRef = doc(firestore, "unique_identifiers", phoneIdentifier);
        batch.set(uniqueIdRef, { schoolId: user.uid });

        basicClasses.forEach(className => {
            const classId = doc(collection(firestore, `schools/${user.uid}/masterClasses`)).id;
            const classRef = doc(firestore, `schools/${user.uid}/masterClasses`, classId);
            batch.set(classRef, { id: classId, schoolId: user.uid, className });
        });

        batch.commit()
            .then(() => {
                toast({
                    title: "Registration Successful",
                    description: "Your school account has been created. Redirecting to dashboard...",
                });
                router.push('/dashboard');
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: `schools/${user.uid}`,
                    operation: 'create',
                    requestResourceData: schoolData
                });
                errorEmitter.emit('permission-error', permissionError);

                toast({
                    variant: "destructive",
                    title: "Registration Failed",
                    description: "An unexpected error occurred. Please check the developer console for more details.",
                });
            })
            .finally(() => {
                setIsLoading(false);
            });
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
                {!user ? (
                    <>
                        <CardHeader className="text-center">
                            <Link href="/" className="flex justify-center items-center gap-2 mb-2">
                                <BookOpenCheck className="h-8 w-8 text-primary" />
                                <h1 className="text-3xl font-bold font-headline">CampusConnect</h1>
                            </Link>
                            <CardTitle className="text-2xl">Register Your School</CardTitle>
                            <CardDescription>
                                Start by signing in with your Google Account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                                {isLoading ? 'Signing in...' : 'Register with Google Account'}
                            </Button>
                             <div className="mt-4 text-center text-sm">
                                Already have an account?{" "}
                                <Link href="/login" className="underline">
                                    Login
                                </Link>
                            </div>
                        </CardContent>
                    </>
                ) : (
                    <>
                         <CardHeader className="text-center">
                            <Link href="/" className="flex justify-center items-center gap-2 mb-2">
                                <BookOpenCheck className="h-8 w-8 text-primary" />
                                <h1 className="text-3xl font-bold font-headline">CampusConnect_new</h1>
                            </Link>
                            <CardTitle className="text-2xl">Register Your School</CardTitle>
                            <CardDescription>
                                Almost there! Please fill out your school's details below.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleRegisterSchool}>
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
                                    <Input id="contact-email" name="contact-email" type="email" value={user.email || ''} required disabled />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="contact-phone">Contact Phone</Label>
                                    <Input id="contact-phone" name="contact-phone" type="tel" placeholder="+91-1234567890" required disabled={isLoading} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="admin-name">Admin Name</Label>
                                    <Input id="admin-name" name="admin-name" defaultValue={user.displayName || ''} placeholder="Full name of administrator" required disabled={isLoading} />
                                </div>
                                <div className="md:col-span-2 mt-4 flex flex-col gap-4">
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? 'Creating Account...' : 'Complete Registration'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
}
