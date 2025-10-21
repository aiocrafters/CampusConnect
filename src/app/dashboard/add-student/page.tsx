
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
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, doc, writeBatch, orderBy, limit } from "firebase/firestore"
import type { Student, ClassSection } from "@/lib/types"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect, useMemo } from "react"
import { format } from 'date-fns';
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Send } from "lucide-react"

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

export default function AddStudentPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();
  const router = useRouter();
  
  const allStudentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/students`));
  }, [firestore, schoolId]);
  const { data: allStudents } = useCollection<Student>(allStudentsQuery);
  
  const recentStudentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/students`), orderBy("admissionNumber", "desc"), limit(5));
  }, [firestore, schoolId]);
  const { data: recentStudents, isLoading: recentStudentsLoading } = useCollection<Student>(recentStudentsQuery);

  const classSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`));
  }, [firestore, schoolId]);
  const { data: classSections } = useCollection<ClassSection>(classSectionsQuery);


  const nextAdmissionNumber = useMemo(() => {
    if (!allStudents || allStudents.length === 0) {
      return null;
    }
    const maxAdmissionNumber = Math.max(...allStudents.map(s => parseInt(s.admissionNumber, 10)).filter(n => !isNaN(n)));
    return isFinite(maxAdmissionNumber) ? (maxAdmissionNumber + 1).toString() : null;
  }, [allStudents]);

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
      if (!firestore || !schoolId) return;
      const newStudentId = doc(collection(firestore, `schools/${schoolId}/students`)).id;
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
      description: `${values.fullName} has been added. You can now send them to their class section below.`,
    });

    form.reset();
    if(firestore && schoolId) {
        const newStudentId = doc(collection(firestore, `schools/${schoolId}/students`)).id;
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
  }

  const handleAssignToSection = async (student: Student) => {
      if (!firestore || !schoolId || !classSections) {
          toast({ variant: "destructive", title: "Error", description: "Cannot assign section right now." });
          return;
      }
      
      const targetSection = classSections.find(s => s.className === student.admissionClass && s.sectionIdentifier === 'A');

      if (!targetSection) {
          toast({ variant: "destructive", title: "Section Not Found", description: `Default section 'A' for class ${student.admissionClass} does not exist. Please create it on the Sections page first.` });
          return;
      }

      const studentDocRef = doc(firestore, `schools/${schoolId}/students`, student.id);
      updateDocumentNonBlocking(studentDocRef, { classSectionId: targetSection.id });

      toast({
          title: "Student Assigned",
          description: `${student.fullName} has been assigned to Class ${student.admissionClass} - Section A.`,
      });
  };
  
  const classOptions = ["UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Add Student</CardTitle>
          <CardDescription>
            Fill in the details below to add a new student to the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
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
              <div className="flex justify-end gap-2 pt-6">
                <Button variant="outline" type="button" onClick={() => router.push('/dashboard/students')}>Cancel</Button>
                <Button type="submit">Save Student</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Recent Admissions</CardTitle>
            <CardDescription>A list of the 5 most recently added students. Assign them to a section to finalize admission.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Admission No.</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Admission Class</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recentStudentsLoading && Array.from({length: 5}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                        </TableRow>
                    ))}
                    {recentStudents && recentStudents.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell>{student.admissionNumber}</TableCell>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell>{student.admissionClass}</TableCell>
                            <TableCell className="text-right">
                                {!student.classSectionId ? (
                                     <Button size="sm" onClick={() => handleAssignToSection(student)}>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send to Class
                                    </Button>
                                ) : (
                                    <span className="text-sm text-green-600 font-semibold">Assigned</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                     {recentStudents?.length === 0 && !recentStudentsLoading && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">No recent students found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
    </main>
  )
}
