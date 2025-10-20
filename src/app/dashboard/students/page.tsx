
"use client"

import {
  File,
  PlusCircle,
  Search,
  MoreHorizontal
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase"
import { collection, query } from "firebase/firestore"
import type { Student } from "@/lib/types"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

const studentFormSchema = z.object({
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
  classSectionId: z.string().min(1, "Class/Section is required"),
});


export default function StudentsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/students`));
  }, [firestore, schoolId]);

  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
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
      classSectionId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof studentFormSchema>) {
    if (!firestore || !schoolId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find school information.",
      });
      return;
    }

    const studentsRef = collection(firestore, `schools/${schoolId}/students`);
    const studentData = {
      ...values,
      schoolId: schoolId,
      udiseCode: schoolId, // Assuming schoolId is the UDISE code for now
      status: 'Active', // Default status
      admissionNumber: `ADM-${Date.now()}`
    };

    addDocumentNonBlocking(studentsRef, studentData);
    
    toast({
      title: "Student Added",
      description: `${values.fullName} has been added to the student list.`,
    });
    form.reset();
    setIsSheetOpen(false);
  }

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Tabs defaultValue="all">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export
              </span>
            </Button>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm" className="h-8 gap-1">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add Student
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-2xl">
                <SheetHeader>
                  <SheetTitle>Add a New Student</SheetTitle>
                  <SheetDescription>
                    Fill in the details below to add a new student to the system.
                  </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <ScrollArea className="h-[calc(100vh-10rem)]">
                      <div className="grid gap-4 py-4 px-4">
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
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Input placeholder="123, Main Street" {...field} />
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
                          name="classSectionId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Class & Section</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Grade 5 - A" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </ScrollArea>
                    <SheetFooter>
                      <SheetClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </SheetClose>
                      <Button type="submit">Save Student</Button>
                    </SheetFooter>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                Manage all students in your school.
              </CardDescription>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search by name, ID, or UDISE code..." className="pl-8 sm:w-1/2 md:w-1/3" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Parent Name</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Loading student data...
                      </TableCell>
                    </TableRow>
                  )}
                  {!studentsLoading && students?.length === 0 && (
                     <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No students found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {students && students.map(student => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.admissionNumber}</TableCell>
                    <TableCell>{student.fullName}</TableCell>
                    <TableCell>
                       <Badge variant={student.status === 'Active' ? 'default' : 'secondary'} className={student.status === 'Active' ? 'bg-green-500 hover:bg-green-600' : ''}>
                          {student.status}
                        </Badge>
                    </TableCell>
                    <TableCell>{student.classSectionId}</TableCell>
                    <TableCell>{student.parentGuardianName}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
