"use client"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirebase, useDoc, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"

const formSchema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters."),
  udiseCode: z.string().min(5, "UDISE code is required."),
  address: z.string().min(10, "Address is required."),
  contactEmail: z.string().email("Invalid email address."),
  contactPhoneNumber: z.string().min(10, "Phone number must be at least 10 digits."),
  adminName: z.string().min(2, "Admin name is required."),
});

export default function SettingsPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const schoolRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, `schools/${user.uid}`);
  }, [user, firestore]);

  const { data: school, isLoading: isSchoolLoading } = useDoc(schoolRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: "",
      udiseCode: "",
      address: "",
      contactEmail: "",
      contactPhoneNumber: "",
      adminName: "",
    },
  })

  useEffect(() => {
    if (school) {
      form.reset({
        schoolName: school.schoolName,
        udiseCode: school.udiseCode,
        address: school.address,
        contactEmail: school.contactEmail,
        contactPhoneNumber: school.contactPhoneNumber,
        adminName: school.adminName,
      });
    }
  }, [school, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!schoolRef) return;
    setIsLoading(true);
    
    updateDocumentNonBlocking(schoolRef, values);

    toast({
      title: "Settings Saved",
      description: "Your school's information has been updated.",
    });
    setIsLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>
          Update your school's information here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSchoolLoading ? (
            <div className="space-y-4">
                 <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
                 <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
                 <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
            </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
                <FormField
                control={form.control}
                name="schoolName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Prestige Elite Academy" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="udiseCode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>UDISE Code</FormLabel>
                    <FormControl>
                        <Input placeholder="Unique Identification Code" {...field} disabled />
                    </FormControl>
                    <FormDescription>
                        UDISE code cannot be changed.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                        <Input placeholder="Full school address" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                        <Input placeholder="info@yourschool.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="contactPhoneNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                        <Input placeholder="+91-1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="adminName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Admin Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Full name of administrator" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
        )}
      </CardContent>
    </Card>
  )
}
