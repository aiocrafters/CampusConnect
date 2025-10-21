
"use client"

import {
  File,
  PlusCircle,
  Search,
  MoreHorizontal,
  History,
  View
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
import { Textarea } from "@/components/ui/textarea"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { collection, query, doc } from "firebase/firestore"
import type { Student, ClassSection } from "@/lib/types"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { format } from 'date-fns';
import { Label } from "@/components/ui/label"
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
  currentClass: z.string().min(1, "Current Class is required"),
});


export default function StudentsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'Active' | 'Inactive'>('Active');
  const [inactiveReason, setInactiveReason] = useState('');


  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/students`));
  }, [firestore, schoolId]);

  const classSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`));
  }, [firestore, schoolId]);

  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  const { data: classSections } = useCollection<ClassSection>(classSectionsQuery);


  const getSectionDetails = (sectionId?: string) => {
    if (!classSections || !sectionId) return { className: "N/A", sectionIdentifier: "" };
    const section = classSections.find(s => s.id === sectionId);
    return section 
      ? { className: section.className, sectionIdentifier: section.sectionIdentifier } 
      : { className: "Not Assigned", sectionIdentifier: "" };
  };


  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (isSheetOpen && selectedStudent) {
        form.reset({
          ...selectedStudent,
          dateOfBirth: selectedStudent.dateOfBirth ? format(new Date(selectedStudent.dateOfBirth), 'yyyy-MM-dd') : '',
          admissionDate: selectedStudent.admissionDate ? format(new Date(selectedStudent.admissionDate), 'yyyy-MM-dd') : '',
        });
    }
  }, [isSheetOpen, selectedStudent, form]);

  useEffect(() => {
    if (isStatusDialogOpen && selectedStudent) {
      setCurrentStatus(selectedStudent.status);
      setInactiveReason(selectedStudent.inactiveReason || '');
    }
  }, [isStatusDialogOpen, selectedStudent]);
  

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setIsSheetOpen(true);
  };
  
  const handleView = (student: Student) => {
    router.push(`/dashboard/students/${student.id}`);
  };

  const handleStatusChange = (student: Student) => {
    setSelectedStudent(student);
    setIsStatusDialogOpen(true);
  };

  async function onSubmit(values: z.infer<typeof studentFormSchema>) {
    if (!firestore || !schoolId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find school information.",
      });
      return;
    }
    
    const studentDocRef = doc(firestore, `schools/${schoolId}/students`, values.id);
    
    const dataToSave: Partial<Student> = {
        ...values,
    };
    
    updateDocumentNonBlocking(studentDocRef, dataToSave);
    toast({
      title: "Student Updated",
      description: `${values.fullName}'s information has been updated.`,
    });

    form.reset();
    setIsSheetOpen(false);
    setSelectedStudent(null);
  }

  async function handleSaveStatus() {
    if (!firestore || !schoolId || !selectedStudent) {
      toast({ variant: "destructive", title: "Error", description: "Could not save status." });
      return;
    }
    const studentDocRef = doc(firestore, `schools/${schoolId}/students`, selectedStudent.id);
    const dataToUpdate: Partial<Student> = {
      status: currentStatus,
      inactiveReason: currentStatus === 'Inactive' ? inactiveReason : '',
    };
    updateDocumentNonBlocking(studentDocRef, dataToUpdate);
    toast({
      title: "Status Updated",
      description: `${selectedStudent.fullName}'s status has been updated.`,
    });
    setIsStatusDialogOpen(false);
    setSelectedStudent(null);
  }
  
  const classOptions = ["UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];

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
                    <TableHead>Student ID</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admission Date</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Admission Class</TableHead>
                    <TableHead>Current Class</TableHead>
                    <TableHead>Current Section</TableHead>
                    <TableHead>Father's Name</TableHead>
                    <TableHead>Mother's Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>PEN</TableHead>
                    <TableHead>Aadhar</TableHead>
                    <TableHead>Bank Acc No.</TableHead>
                    <TableHead>Bank Name</TableHead>
                    <TableHead>IFSC</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsLoading && (
                    <TableRow>
                      <TableCell colSpan={18} className="text-center">
                        Loading student data...
                      </TableCell>
                    </TableRow>
                  )}
                  {!studentsLoading && students?.length === 0 && (
                     <TableRow>
                      <TableCell colSpan={18} className="text-center">
                        No students found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {students && students.map(student => {
                    const { className, sectionIdentifier } = getSectionDetails(student.classSectionId);
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium truncate max-w-[100px]">{student.id}</TableCell>
                        <TableCell className="font-medium">{student.admissionNumber}</TableCell>
                        <TableCell>{student.fullName}</TableCell>
                        <TableCell>
                           <Badge variant={student.status === 'Active' ? 'default' : 'secondary'} className={student.status === 'Active' ? 'bg-green-500 hover:bg-green-600' : ''}>
                              {student.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{student.admissionDate}</TableCell>
                        <TableCell>{student.dateOfBirth}</TableCell>
                        <TableCell>{student.admissionClass}</TableCell>
                        <TableCell>{student.currentClass || className}</TableCell>
                        <TableCell>{sectionIdentifier}</TableCell>
                        <TableCell>{student.parentGuardianName}</TableCell>
                        <TableCell>{student.motherName}</TableCell>
                        <TableCell className="truncate max-w-xs">{student.address}</TableCell>
                        <TableCell>{student.pen}</TableCell>
                        <TableCell>{student.aadhaarNumber}</TableCell>
                        <TableCell>{student.bankAccountNumber}</TableCell>
                        <TableCell>{student.bankName}</TableCell>
                        <TableCell>{student.ifscCode}</TableCell>
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
                              <DropdownMenuItem onClick={() => handleEdit(student)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleView(student)}>
                                <View className="mr-2 h-4 w-4" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(student)}>Change Status</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
       <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetContent className="sm:max-w-2xl">
                <SheetHeader>
                  <SheetTitle>Edit Student Details</SheetTitle>
                  <SheetDescription>
                   Update the student's information below.
                  </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <ScrollArea className="h-[calc(100vh-10rem)]">
                      <div className="grid gap-4 py-4 px-4">
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
                                  disabled
                                />
                              </FormControl>
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
                                <Input type="date" {...field} disabled />
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
                                <Input placeholder="Aarav Sharma" {...field} disabled />
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
                                <Input type="date" {...field} disabled />
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
                          name="admissionClass"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Admission Class</FormLabel>
                               <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                                <FormControl>
                                  <SelectTrigger disabled>
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
                              <FormDescription>The admission class cannot be changed.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="currentClass"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Class</FormLabel>
                               <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a current class" />
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
                    <SheetFooter>
                      <SheetClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </SheetClose>
                      <Button type="submit">Save Changes</Button>
                    </SheetFooter>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
      
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Student Status</DialogTitle>
            <DialogDescription>
              Update the status for {selectedStudent?.fullName}.
            </DialogDescription>
          </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <RadioGroup
                  defaultValue={selectedStudent?.status}
                  onValueChange={(value: 'Active' | 'Inactive') => setCurrentStatus(value)}
                  className="col-span-3 flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Active" id="active" />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Inactive" id="inactive" />
                    <Label htmlFor="inactive">Inactive</Label>
                  </div>
                </RadioGroup>
              </div>
              {currentStatus === 'Inactive' && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reason" className="text-right">
                      Reason
                    </Label>
                    <Textarea
                      id="reason"
                      value={inactiveReason}
                      onChange={(e) => setInactiveReason(e.target.value)}
                      className="col-span-3"
                      placeholder="Enter reason for inactivation"
                    />
                 </div>
              )}
            </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
             <Button onClick={handleSaveStatus}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
