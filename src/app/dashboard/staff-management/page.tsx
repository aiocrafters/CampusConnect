
"use client"

import {
  File,
  PlusCircle,
  Search,
  MoreHorizontal
} from "lucide-react"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, doc } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import type { Teacher, Designation } from "@/lib/types"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { sendWelcomeEmail } from "@/ai/flows/send-email-flow"
import { Label } from "@/components/ui/label"


const staffFormSchema = z.object({
  id: z.string().min(1, "Staff ID is required."),
  name: z.string().min(2, "Staff name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().optional(),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits."),
  qualification: z.string().min(2, "Qualification is required."),
  address: z.string().min(5, "Address is required."),
  dateOfJoining: z.string().min(1, "Date of joining is required."),
  role: z.string().min(2, "Role is required."),
  subject: z.enum(['General', 'English', 'Urdu', 'Math', 'Science', 'Social Studies']),
  designationId: z.string().optional(),
});

const designationFormSchema = z.object({
  name: z.string().min(2, "Designation name is required."),
});

export default function StaffManagementPage() {
  const { user, firestore, auth } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Teacher | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDesignationDialogOpen, setIsDesignationDialogOpen] = useState(false);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/teachers`));
  }, [firestore, schoolId]);
  
  const designationsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/designations`));
  }, [firestore, schoolId]);

  const { data: staffMembers, isLoading: staffLoading } = useCollection<Teacher>(staffQuery);
  const { data: designations, isLoading: designationsLoading } = useCollection<Designation>(designationsQuery);


  const form = useForm<z.infer<typeof staffFormSchema>>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      id: "",
      name: "",
      email: "",
      password: "",
      contactNumber: "",
      qualification: "",
      address: "",
      dateOfJoining: format(new Date(), 'yyyy-MM-dd'),
      designationId: "",
      role: "",
    },
  });
  
  const designationForm = useForm<z.infer<typeof designationFormSchema>>({
    resolver: zodResolver(designationFormSchema),
    defaultValues: { name: "" },
  });


  useEffect(() => {
    if (isSheetOpen) {
      if (isEditMode && selectedStaff) {
        form.reset({
          ...selectedStaff,
          dateOfJoining: selectedStaff.dateOfJoining ? format(parseISO(selectedStaff.dateOfJoining), 'yyyy-MM-dd') : '',
          password: "",
          designationId: selectedStaff.designationId || "none",
        });
      } else {
        const newStaffId = doc(collection(firestore!, `schools/${schoolId}/teachers`)).id;
        form.reset({
          id: newStaffId,
          name: "",
          email: "",
          password: "",
          contactNumber: "",
          qualification: "",
          address: "",
          dateOfJoining: format(new Date(), 'yyyy-MM-dd'),
          designationId: "none",
          role: "",
        });
      }
    }
  }, [isSheetOpen, isEditMode, selectedStaff, form, firestore, schoolId]);

  const handleAddNew = () => {
    setIsEditMode(false);
    setSelectedStaff(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (staff: Teacher) => {
    setIsEditMode(true);
    setSelectedStaff(staff);
    setIsSheetOpen(true);
  };
  
  const handleView = (staff: Teacher) => {
    setSelectedStaff(staff);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (staff: Teacher) => {
    setSelectedStaff(staff);
    setIsDeleteDialogOpen(true);
  };

  async function onSubmit(values: z.infer<typeof staffFormSchema>) {
    if (!firestore || !schoolId || !auth) {
      toast({ variant: "destructive", title: "Error", description: "Could not find school information or auth service." });
      return;
    }
    
    const { password, ...staffData } = values;
    const staffDocRef = doc(firestore, `schools/${schoolId}/teachers`, values.id);
    
    const dataToSave = {
        ...staffData,
        schoolId,
        designationId: values.designationId === 'none' ? '' : values.designationId,
    };
    
    if (isEditMode) {
      updateDocumentNonBlocking(staffDocRef, dataToSave);
      toast({ title: "Staff Updated", description: `${values.name}'s information has been updated.` });
    } else {
      if (!password || password.length < 6) {
        toast({ variant: "destructive", title: "Password Required", description: "A password of at least 6 characters is required for new staff." });
        return;
      }
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, password);
        
        const dataWithUid = { ...dataToSave, uid: userCredential.user.uid };
        
        setDocumentNonBlocking(staffDocRef, dataWithUid, { merge: false });

        await sendWelcomeEmail({
          to: values.email,
          name: values.name,
          password: password
        });

        toast({ title: "Staff Added", description: `${values.name} has been added and a welcome email has been sent.` });

      } catch (error: any) {
         let description = "An error occurred while creating the staff member's login account.";
         if (error.code === 'auth/email-already-in-use') {
           description = "This email is already in use. Please use a different email.";
         } else if (error.code === 'auth/weak-password') {
            description = "The password is too weak. Please use a stronger password.";
         }
         toast({ variant: "destructive", title: "Account Creation Failed", description });
         return; 
      }
    }

    form.reset();
    setIsSheetOpen(false);
    setIsEditMode(false);
    setSelectedStaff(null);
  }

  async function confirmDelete() {
    if (!firestore || !schoolId || !selectedStaff) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete staff member." });
      return;
    }
    const staffDocRef = doc(firestore, `schools/${schoolId}/teachers`, selectedStaff.id);
    deleteDocumentNonBlocking(staffDocRef);
    toast({ title: "Staff Deleted", description: `${selectedStaff.name} has been removed.` });
    setIsDeleteDialogOpen(false);
    setSelectedStaff(null);
  }
  
  async function onDesignationSubmit(values: z.infer<typeof designationFormSchema>) {
    if (!firestore || !schoolId) return;

    const designationId = doc(collection(firestore, `schools/${schoolId}/designations`)).id;
    const designationRef = doc(firestore, `schools/${schoolId}/designations`, designationId);
    
    setDocumentNonBlocking(designationRef, {
      id: designationId,
      schoolId: schoolId,
      name: values.name
    }, { merge: false });

    toast({ title: "Designation Created", description: `The designation "${values.name}" has been created.` });
    designationForm.reset();
  }

  const getDesignationName = (designationId?: string) => {
    if (!designationId || !designations || designationId === 'none') return "Not Assigned";
    return designations.find(d => d.id === designationId)?.name || "Not Assigned";
  };

  const subjects = ['General', 'English', 'Urdu', 'Math', 'Science', 'Social Studies'];

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Staff Management</CardTitle>
          <CardDescription>
            Manage all staff members in your school.
          </CardDescription>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search by name or ID..." className="pl-8 sm:w-1/2 md:w-1/3" />
            </div>
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export
              </span>
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setIsDesignationDialogOpen(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add Designation
                </span>
            </Button>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm" className="h-8 gap-1" onClick={handleAddNew}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add Staff
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-2xl">
                <SheetHeader>
                  <SheetTitle>{isEditMode ? 'Edit Staff Details' : 'Add a New Staff Member'}</SheetTitle>
                  <SheetDescription>
                   {isEditMode ? "Update the staff member's information below." : 'Fill in the details to add a new staff member.'}
                  </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                   <ScrollArea className="h-[calc(100vh-10rem)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 px-4">
                      <FormField
                        control={form.control}
                        name="id"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Staff ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Auto-generated ID" {...field} disabled />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Anjali Kapoor" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="staff@example.com" {...field} disabled={isEditMode} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       {!isEditMode && <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Set Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Min. 6 characters" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />}
                       <FormField
                        control={form.control}
                        name="contactNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Number</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 9876543210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dateOfJoining"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Joining</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="qualification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Qualification</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., M.Sc, B.Ed" {...field} />
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
                              <Input placeholder="Residential Address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="designationId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Designation</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'none'}>
                              <FormControl>
                                <SelectTrigger disabled={designationsLoading}>
                                  <SelectValue placeholder={designationsLoading ? "Loading..." : "Select a designation"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {designations?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role / Responsibilities (for Staff Member)</FormLabel>
                            <FormControl>
                               <Input placeholder="e.g., Class Teacher, Accountant" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Subject (for Teachers)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subjects.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
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
                      <Button type="submit">{isEditMode ? 'Save Changes' : 'Save Staff'}</Button>
                    </SheetFooter>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Date of Joining</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading staff data...
                  </TableCell>
                </TableRow>
              )}
              {!staffLoading && staffMembers?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No staff found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
              {staffMembers && staffMembers.map(staff => (
              <TableRow key={staff.id}>
                <TableCell className="font-medium">{staff.name}</TableCell>
                <TableCell>{staff.email}</TableCell>
                <TableCell>{getDesignationName(staff.designationId)}</TableCell>
                <TableCell>{staff.contactNumber}</TableCell>
                <TableCell>{staff.role}</TableCell>
                <TableCell>{staff.dateOfJoining}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleEdit(staff)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleView(staff)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(staff)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
            <DialogDescription>
              Full information for {selectedStaff?.name}.
            </DialogDescription>
          </DialogHeader>
          {selectedStaff && (
             <ScrollArea className="max-h-[60vh] pr-6">
            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Staff ID</span>
                <span className="truncate">{selectedStaff.id}</span>
              </div>
              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Full Name</span>
                <span>{selectedStaff.name}</span>
              </div>
              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Designation</span>
                <span>{getDesignationName(selectedStaff.designationId)}</span>
              </div>
              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Email</span>
                <span>{selectedStaff.email}</span>
              </div>
              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Contact Number</span>
                <span>{selectedStaff.contactNumber}</span>
              </div>
               <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Date of Joining</span>
                <span>{selectedStaff.dateOfJoining}</span>
              </div>
               <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Address</span>
                <span>{selectedStaff.address}</span>
              </div>
               <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Qualification</span>
                <span>{selectedStaff.qualification}</span>
              </div>
              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Role</span>
                <span>{selectedStaff.role}</span>
              </div>
              <div className="grid grid-cols-[1d, 1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Subject</span>
                <span>{selectedStaff.subject}</span>
              </div>
            </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the staff record for <span className="font-semibold">{selectedStaff?.name}</span>. The associated login account will NOT be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Yes, delete staff member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDesignationDialogOpen} onOpenChange={setIsDesignationDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Manage Designations</DialogTitle>
                <DialogDescription>
                    Add a new designation or view existing ones.
                </DialogDescription>
            </DialogHeader>
            <Form {...designationForm}>
                <form onSubmit={designationForm.handleSubmit(onDesignationSubmit)} className="space-y-4">
                    <FormField
                        control={designationForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New Designation Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Principal, Accountant" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit">Create Designation</Button>
                </form>
            </Form>
            <div className="mt-6">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Existing Designations</h3>
                <ScrollArea className="h-40 rounded-md border">
                    <Table>
                        <TableBody>
                            {designationsLoading && <TableRow><TableCell>Loading...</TableCell></TableRow>}
                            {designations?.map(d => <TableRow key={d.id}><TableCell>{d.name}</TableCell></TableRow>)}
                            {!designationsLoading && designations?.length === 0 && (
                                <TableRow><TableCell>No designations created yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDesignationDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  )
}

    