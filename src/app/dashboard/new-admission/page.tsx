
"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, doc, writeBatch } from "firebase/firestore"
import type { Student } from "@/lib/types"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect, useMemo } from "react"
import { format } from 'date-fns';
import { useRouter } from "next/navigation"

const studentFormSchema = z.object({
  id: z.string().min(1, "Student ID is required."),
  admissionNumber: z.string().min(1, "Admission Number is required."),
  admissionDate: z.string().min(1, "Admission Date is required."),
  fullName: z.string().min(2, "Full name is required."),
  pen: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  parentGuardianName: z.string().min(2, "Father's name is required."),
  motherName: z.string().optional(),
  address: z.string().min(5, "Address is required."),
  aadhaarNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  ifscCode: z.string().optional(),
  admissionClass: z.string().min(1, "Admission Class is required"),
});

export default function NewAdmissionPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();
  const router = useRouter();
  
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/students`));
  }, [firestore, schoolId]);

  const { data: students } = useCollection<Student>(studentsQuery);

  const nextAdmissionNumber = useMemo(() => {
    if (!students || students.length === 0) {
      return null;
    }
    const maxAdmissionNumber = Math.max(...students.map(s => parseInt(s.admissionNumber, 10)).filter(n => !isNaN(n)));
    return isFinite(maxAdmissionNumber) ? (maxAdmissionNumber + 1).toString() : null;
  }, [students]);

  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      id: "",
      admissionNumber: "",
      admissionDate: format(new Date(), 'yyyy-MM-dd'),
      fullName: "",
      pen: "",
      dateOfBirth: "",
      parentGuardianName: "",
      motherName: "",
      address: "",
      aadhaarNumber: "",
      bankAccountNumber: "",
      bankName: "",
      ifscCode: "",
      admissionClass: "",
    },
  });

  useEffect(() => {
      const newStudentId = doc(collection(firestore!, `schools/${schoolId}/students`)).id;
      form.reset({
        id: newStudentId,
        admissionNumber: nextAdmissionNumber || "",
        admissionDate: format(new Date(), 'yyyy-MM-dd'),
        fullName: "",
        pen: "",
        dateOfBirth: "",
        parentGuardianName: "",
        motherName: "",
        address: "",
        aadhaarNumber: "",
        bankAccountNumber: "",
        bankName: "",
        ifscCode: "",
        admissionClass: "",
      });
  }, [form, firestore, schoolId, nextAdmissionNumber]);

  async function onSubmit(values: z.infer<typeof studentFormSchema>) {
    if (!firestore || !schoolId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find school information.",
      });
      return;
    }
    
    const batch = writeBatch(firestore);
    const studentDocRef = doc(firestore, `schools/${schoolId}/students`, values.id);
    
    const dataToSave: Omit<Student, 'status' | 'schoolId' | 'inactiveReason' | 'classSectionId'> & { schoolId: string } = {
        ...values,
        schoolId,
    };
    
    const dataWithStatus: Student = {
      ...dataToSave,
      status: 'Active' as const,
      classSectionId: '', // Initially empty, assigned in classes page
    };
    batch.set(studentDocRef, dataWithStatus);

    const timelineEventRef = doc(collection(firestore, `schools/${schoolId}/students/${values.id}/timeline`));
    batch.set(timelineEventRef, {
        id: timelineEventRef.id,
        studentId: values.id,
        timestamp: new Date().toISOString(),
        type: 'ADMISSION',
        description: `Admitted to Class ${values.admissionClass}`,
        details: { class: values.admissionClass, academicYear: new Date().getFullYear().toString() }
    });

    await batch.commit();

    toast({
      title: "Student Added",
      description: `${values.fullName} has been added. Assign a section in the Classes page.`,
    });

    form.reset();
    const newStudentId = doc(collection(firestore!, `schools/${schoolId}/students`)).id;
    form.reset({
      id: newStudentId,
      admissionNumber: (parseInt(values.admissionNumber, 10) + 1).toString(),
      admissionDate: format(new Date(), 'yyyy-MM-dd'),
      fullName: "",
      pen: "",
      dateOfBirth: "",
      parentGuardianName: "",
      motherName: "",
      address: "",
      aadhaarNumber: "",
      bankAccountNumber: "",
      bankName: "",
      ifscCode: "",
      admissionClass: "",
    });
  }
  
  const classOptions = ["UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>New Student Admission</CardTitle>
          <CardDescription>
            Fill in the details below to add a new student to the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <ScrollArea className="h-[calc(100vh-20rem)]">
                <div className="grid md:grid-cols-2 gap-6 p-4">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Auto-generated ID" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="admissionNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admission Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 1001" 
                            {...field} 
                            disabled={!!nextAdmissionNumber} 
                          />
                        </FormControl>
                         { !nextAdmissionNumber && (
                          <FormDescription>
                            Set the starting admission number for your first student.
                          </FormDescription>
                         )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="admissionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admission Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Aarav Sharma" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pen"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student PEN</FormLabel>
                        <FormControl>
                          <Input placeholder="Personal Education Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="parentGuardianName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Father's Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Rakesh Sharma" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="motherName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mother's Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Sunita Sharma" {...field} />
                        </FormControl>
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
                          <Input placeholder="123, Main Street, City, State, Pin Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="aadhaarNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aadhar Number</FormLabel>
                        <FormControl>
                          <Input placeholder="xxxx-xxxx-xxxx" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankAccountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Account Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Bank Account Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Bank Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ifscCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank IFSC Code</FormLabel>
                        <FormControl>
                          <Input placeholder="IFSC Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="admissionClass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admission Class</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an admission class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {classOptions.map((className) => (
                                  <SelectItem key={className} value={className}>
                                      Class {className}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2 pt-6">
                <Button variant="outline" type="button" onClick={() => router.push('/dashboard/students')}>Cancel</Button>
                <Button type="submit">Save Student</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  )
}
