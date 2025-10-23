
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
import { useFirebase, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, doc, writeBatch, serverTimestamp, runTransaction, increment } from "firebase/firestore"
import type { Student, ClassSection, StudentTimelineEvent } from "@/lib/types"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect, useMemo, useCallback } from "react"
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
  year: z.coerce.number().optional(),
  session: z.string().optional(),
  admissionClass: z.string().optional(),
});

const setupFormSchema = z.object({
    lastAdmissionNumber: z.coerce.number().min(0, "Admission number must be a positive number.")
});

export default function NewAdmissionPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();
  const router = useRouter();
  
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(true);

  const schoolDocRef = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return doc(firestore, `schools/${schoolId}`);
  }, [firestore, schoolId]);

  const { data: schoolData, isLoading: isSchoolLoading } = useDoc(schoolDocRef);

  const classSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`));
  }, [firestore, schoolId]);
  const { data: classSections } = useCollection<ClassSection>(classSectionsQuery);
  
  const uniqueClasses = useMemo(() => {
    if (!classSections) return [];
    const classNames = classSections.map(cs => cs.className);
    return [...new Set(classNames)].sort((a,b) => {
        if (a === 'UKG') return -1;
        if (b === 'UKG') return 1;
        return parseInt(a, 10) - parseInt(b, 10);
    });
  }, [classSections]);

  const studentForm = useForm<z.infer<typeof studentFormSchema>>({
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
      year: new Date().getFullYear(),
      session: "",
      admissionClass: "",
    },
  });

  const setupForm = useForm<z.infer<typeof setupFormSchema>>({
      resolver: zodResolver(setupFormSchema),
      defaultValues: { lastAdmissionNumber: 0 }
  });

  const resetForm = useCallback(() => {
    if (!firestore || !schoolId || !schoolData) return;
    const newStudentId = doc(collection(firestore, `schools/${schoolId}/students`)).id;
    const nextAdmissionNumber = (schoolData.lastAdmissionNumber || 0) + 1;

    studentForm.reset({
      id: newStudentId,
      admissionNumber: nextAdmissionNumber.toString(),
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
      year: new Date().getFullYear(),
      session: "",
      admissionClass: "",
    });
    setSelectedClass(null);
  }, [firestore, schoolId, studentForm, schoolData]);

  useEffect(() => {
    if (schoolData) {
        if (schoolData.lastAdmissionNumber === undefined || schoolData.lastAdmissionNumber === null) {
            setIsSettingUp(true);
        } else {
            setIsSettingUp(false);
            resetForm();
        }
    }
  }, [schoolData, resetForm]);

  async function handleSetupSubmit(values: z.infer<typeof setupFormSchema>) {
    if (!schoolDocRef) return;
    setIsLoading(true);
    await updateDocumentNonBlocking(schoolDocRef, { lastAdmissionNumber: values.lastAdmissionNumber });
    toast({
        title: "Setup Complete",
        description: "Automatic admission numbering is now active."
    });
    setIsSettingUp(false);
    setIsLoading(false);
  }

  async function onStudentSubmit(values: z.infer<typeof studentFormSchema>) {
    if (!firestore || !schoolId || !schoolDocRef) {
      toast({ variant: "destructive", title: "Error", description: "Could not find school information." });
      return;
    }
    
    setIsLoading(true);
    try {
        await runTransaction(firestore, async (transaction) => {
            const schoolDoc = await transaction.get(schoolDocRef);
            if (!schoolDoc.exists()) {
                throw "School document does not exist!";
            }
            const newAdmissionNumber = (schoolDoc.data().lastAdmissionNumber || 0) + 1;
            
            const studentDocRef = doc(firestore, `schools/${schoolId}/students`, values.id);
            const studentData: Omit<Student, 'currentClass'> & Partial<Pick<Student, 'currentClass'>> & { schoolId: string, status: 'Active' } = {
                ...values,
                admissionNumber: newAdmissionNumber.toString(),
                schoolId,
                status: 'Active' as const,
                currentClass: selectedClass || undefined,
            };
            transaction.set(studentDocRef, studentData);

            const admissionTimelineEventRef = doc(collection(firestore, `schools/${schoolId}/students/${values.id}/timeline`));
            transaction.set(admissionTimelineEventRef, {
                id: admissionTimelineEventRef.id,
                studentId: values.id,
                timestamp: new Date().toISOString(),
                type: 'ADMISSION',
                description: `Admitted to the school.`,
                details: { academicYear: new Date().getFullYear().toString() }
            });

            if (selectedClass) {
                const classAssignTimelineEventRef = doc(collection(firestore, `schools/${schoolId}/students/${values.id}/timeline`));
                transaction.set(classAssignTimelineEventRef, {
                    id: classAssignTimelineEventRef.id,
                    studentId: values.id,
                    timestamp: new Date().toISOString(),
                    type: 'CLASS_ASSIGNMENT',
                    description: `Assigned to Class ${selectedClass}.`,
                    details: { class: selectedClass, academicYear: new Date().getFullYear().toString() }
                });
            }

            transaction.update(schoolDocRef, { lastAdmissionNumber: increment(1) });
        });
        
        toast({
            title: "Student Added",
            description: `${values.fullName} has been successfully added.`,
        });
        resetForm();

    } catch (error) {
        console.error("Transaction failed: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to add student. Please try again.",
        });
    } finally {
        setIsLoading(false);
    }
  }

  if (isSchoolLoading) {
      return <p>Loading setup...</p>
  }
  
  if (isSettingUp) {
      return (
        <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Setup Admission Numbers</CardTitle>
              <CardDescription>
                To enable automatic admission numbers, please enter the last admission number you used manually. The system will start from the next number.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...setupForm}>
                    <form onSubmit={setupForm.handleSubmit(handleSetupSubmit)} className="space-y-6">
                        <FormField
                            control={setupForm.control}
                            name="lastAdmissionNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Last Manual Admission Number</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 1000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save and Start"}</Button>
                    </form>
                </Form>
            </CardContent>
          </Card>
        </main>
      )
  }

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>New Admission</CardTitle>
          <CardDescription>
            Fill in the details below to add a new student to the system. The admission number is automatically generated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...studentForm}>
            <form onSubmit={studentForm.handleSubmit(onStudentSubmit)}>
              <div className="grid md:grid-cols-2 gap-6 p-4">
                <div className="md:col-span-2 grid md:grid-cols-2 gap-6">
                    <FormField
                      control={studentForm.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 2024" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={studentForm.control}
                      name="session"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 2024-2025" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={studentForm.control}
                      name="admissionClass"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel>Admission Class</FormLabel>
                            <Select onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedClass(value);
                            }} value={field.value || ''}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a class" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {uniqueClasses.map((className) => (
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
                <FormField
                  control={studentForm.control}
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
                  control={studentForm.control}
                  name="admissionNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admission Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Auto-generated" 
                          {...field} 
                          disabled
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={studentForm.control}
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
                  control={studentForm.control}
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
                  control={studentForm.control}
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
                  control={studentForm.control}
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
                  control={studentForm.control}
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
                  control={studentForm.control}
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
                  control={studentForm.control}
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
                  control={studentForm.control}
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
                  control={studentForm.control}
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
                  control={studentForm.control}
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
                  control={studentForm.control}
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
              </div>
              <div className="flex justify-end gap-2 pt-6">
                <Button variant="outline" type="button" onClick={() => router.push('/dashboard/school-admin/students')}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Student"}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  )
}
