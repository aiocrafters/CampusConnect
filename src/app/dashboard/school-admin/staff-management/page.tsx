

"use client"

import {
  File,
  PlusCircle,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
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
import type { Teacher, Designation, Department } from "@/lib/types"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect, useMemo } from "react"
import { format, parseISO } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { sendWelcomeEmail } from "@/ai/flows/send-email-flow"


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
  designationId: z.string().optional(),
  departmentId: z.string().optional(),
});

const designationFormSchema = z.object({
  name: z.string().min(2, "Designation name is required."),
});


export default function StaffManagementPage() {
  const { user, firestore, auth } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();
  const [isStaffSheetOpen, setIsStaffSheetOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Teacher | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [isDesignationSheetOpen, setIsDesignationSheetOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);
  const [isDesignationEditMode, setIsDesignationEditMode] = useState(false);
  const [isDeleteDesignationDialogOpen, setIsDeleteDesignationDialogOpen] = useState(false);
  const [designationSearchTerm, setDesignationSearchTerm] = useState("");


  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/staff`));
  }, [firestore, schoolId]);
  
  const designationsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/designations`));
  }, [firestore, schoolId]);

  const departmentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/departments`));
  }, [firestore, schoolId]);

  const { data: staffMembers, isLoading: staffLoading } = useCollection<Teacher>(staffQuery);
  const { data: designations, isLoading: designationsLoading } = useCollection<Designation>(designationsQuery);
  const { data: departments, isLoading: departmentsLoading } = useCollection<Department>(departmentsQuery);

  const filteredDesignations = useMemo(() => {
    if (!designations) return [];
    return designations.filter(d => 
        d.name.toLowerCase().includes(designationSearchTerm.toLowerCase())
    );
  }, [designations, designationSearchTerm]);


  const staffForm = useForm<z.infer<typeof staffFormSchema>>({
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
      departmentId: "",
      role: "",
    },
  });
  
  const designationForm = useForm<z.infer<typeof designationFormSchema>>({
    resolver: zodResolver(designationFormSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (isStaffSheetOpen) {
      if (isEditMode && selectedStaff) {
        staffForm.reset({
          ...selectedStaff,
          dateOfJoining: selectedStaff.dateOfJoining ? format(parseISO(selectedStaff.dateOfJoining), 'yyyy-MM-dd') : '',
          password: "",
          designationId: selectedStaff.designationId || "none",
          departmentId: selectedStaff.departmentId || "none",
        });
      } else {
        const newStaffId = doc(collection(firestore!, `schools/${schoolId}/staff`)).id;
        staffForm.reset({
          id: newStaffId,
          name: "",
          email: "",
          password: "",
          contactNumber: "",
          qualification: "",
          address: "",
          dateOfJoining: format(new Date(), 'yyyy-MM-dd'),
          designationId: "none",
          departmentId: "none",
          role: "",
        });
      }
    }
  }, [isStaffSheetOpen, isEditMode, selectedStaff, staffForm, firestore, schoolId]);

  useEffect(() => {
    if (isDesignationSheetOpen) {
      if (isDesignationEditMode && selectedDesignation) {
        designationForm.reset({
          name: selectedDesignation.name,
        });
      } else {
        designationForm.reset({
          name: "",
        });
      }
    }
  }, [isDesignationSheetOpen, isDesignationEditMode, selectedDesignation, designationForm]);

  const handleAddNewStaff = () => {
    setIsEditMode(false);
    setSelectedStaff(null);
    setIsStaffSheetOpen(true);
  };

  const handleEditStaff = (staff: Teacher) => {
    setIsEditMode(true);
    setSelectedStaff(staff);
    setIsStaffSheetOpen(true);
  };
  
  const handleViewStaff = (staff: Teacher) => {
    setSelectedStaff(staff);
    setIsViewDialogOpen(true);
  };

  const handleDeleteStaff = (staff: Teacher) => {
    setSelectedStaff(staff);
    setIsDeleteDialogOpen(true);
  };

  const handleAddNewDesignation = () => {
    setIsDesignationEditMode(false);
    setSelectedDesignation(null);
    designationForm.reset({ name: "" });
    setIsDesignationSheetOpen(true);
  };

  const handleEditDesignation = (designation: Designation) => {
    setIsDesignationEditMode(true);
    setSelectedDesignation(designation);
    designationForm.reset({ name: designation.name });
    setIsDesignationSheetOpen(true);
  };

  const handleDeleteDesignation = (designation: Designation) => {
    setSelectedDesignation(designation);
    setIsDeleteDesignationDialogOpen(true);
  };

  async function onStaffSubmit(values: z.infer<typeof staffFormSchema>) {
    if (!firestore || !schoolId || !auth) {
      toast({ variant: "destructive", title: "Error", description: "Could not find school information or auth service." });
      return;
    }
    
    const { password, ...staffData } = values;
    const staffDocRef = doc(firestore, `schools/${schoolId}/staff`, values.id);
    
    const dataToSave = {
        ...staffData,
        schoolId,
        designationId: values.designationId === 'none' ? '' : values.designationId,
        departmentId: values.departmentId === 'none' ? '' : values.departmentId,
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

    staffForm.reset();
    setIsStaffSheetOpen(false);
    setIsEditMode(false);
    setSelectedStaff(null);
  }

  async function confirmDeleteStaff() {
    if (!firestore || !schoolId || !selectedStaff) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete staff member." });
      return;
    }
    const staffDocRef = doc(firestore, `schools/${schoolId}/staff`, selectedStaff.id);
    deleteDocumentNonBlocking(staffDocRef);
    toast({ title: "Staff Deleted", description: `${selectedStaff.name} has been removed.` });
    setIsDeleteDialogOpen(false);
    setSelectedStaff(null);
  }

  async function onDesignationSubmit(values: z.infer<typeof designationFormSchema>) {
    if (!firestore || !schoolId) return;

    if (isDesignationEditMode && selectedDesignation) {
      const designationDocRef = doc(firestore, `schools/${schoolId}/designations`, selectedDesignation.id);
      updateDocumentNonBlocking(designationDocRef, values);
      toast({ title: "Designation Updated" });
    } else {
      const designationId = doc(collection(firestore, `schools/${schoolId}/designations`)).id;
      const designationDocRef = doc(firestore, `schools/${schoolId}/designations`, designationId);
      const data: Designation = { id: designationId, schoolId, name: values.name };
      setDocumentNonBlocking(designationDocRef, data);
      toast({ title: "Designation Added" });
    }
    designationForm.reset({name: ""});
    setIsDesignationEditMode(false);
    setSelectedDesignation(null);
  }

  async function confirmDeleteDesignation() {
    if (!firestore || !schoolId || !selectedDesignation) return;
    const designationDocRef = doc(firestore, `schools/${schoolId}/designations`, selectedDesignation.id);
    deleteDocumentNonBlocking(designationDocRef);
    toast({ title: "Designation Deleted", variant: "destructive" });
    setIsDeleteDesignationDialogOpen(false);
  }

  const getDesignationName = (designationId?: string) => {
    if (!designationId || !designations || designationId === 'none') return "Not Assigned";
    return designations.find(d => d.id === designationId)?.name || "Not Assigned";
  };
  
  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId || !departments || departmentId === 'none') return "Not Assigned";
    return departments.find(d => d.id === departmentId)?.name || "Not Assigned";
  };

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
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleAddNewDesignation}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Manage Designations
              </span>
            </Button>
            <Sheet open={isStaffSheetOpen} onOpenChange={setIsStaffSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm" className="h-8 gap-1" onClick={handleAddNewStaff}>
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
                <Form {...staffForm}>
                  <form onSubmit={staffForm.handleSubmit(onStaffSubmit)}>
                   <ScrollArea className="h-[calc(100vh-10rem)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 px-4">
                      <FormField
                        control={staffForm.control}
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
                        control={staffForm.control}
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
                        control={staffForm.control}
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
                        control={staffForm.control}
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
                        control={staffForm.control}
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
                        control={staffForm.control}
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
                        control={staffForm.control}
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
                        control={staffForm.control}
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
                        control={staffForm.control}
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
                        control={staffForm.control}
                        name="departmentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'none'}>
                              <FormControl>
                                <SelectTrigger disabled={departmentsLoading}>
                                  <SelectValue placeholder={departmentsLoading ? "Loading..." : "Select a department"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={staffForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Responsibilities</FormLabel>
                            <FormControl>
                               <Input placeholder="e.g., Class Teacher, Accountant" {...field} />
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
                <TableHead>Serial</TableHead>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Responsibilities</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    Loading staff data...
                  </TableCell>
                </TableRow>
              )}
              {!staffLoading && staffMembers?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    No staff found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
              {staffMembers && staffMembers.map((staff, index) => (
              <TableRow key={staff.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium truncate max-w-24">{staff.id}</TableCell>
                <TableCell className="font-medium">{staff.name}</TableCell>
                <TableCell>{staff.email}</TableCell>
                <TableCell>{getDepartmentName(staff.departmentId)}</TableCell>
                <TableCell>{getDesignationName(staff.designationId)}</TableCell>
                <TableCell>{staff.contactNumber}</TableCell>
                <TableCell>{staff.role}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleEditStaff(staff)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewStaff(staff)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteStaff(staff)}>Delete</DropdownMenuItem>
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
                <span className="font-semibold text-muted-foreground">Department</span>
                <span>{getDepartmentName(selectedStaff.departmentId)}</span>
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
            <Button variant="destructive" onClick={confirmDeleteStaff}>
              Yes, delete staff member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isDesignationSheetOpen} onOpenChange={setIsDesignationSheetOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>{isDesignationEditMode ? 'Edit Designation' : 'Add New Designation'}</SheetTitle>
                 <SheetDescription>
                    {isDesignationEditMode ? "Update the designation name." : "Manage all staff designations for your school."}
                </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-8">
                <Form {...designationForm}>
                    <form onSubmit={designationForm.handleSubmit(onDesignationSubmit)} className="flex items-end gap-2">
                        <FormField
                            control={designationForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormLabel>Designation Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Principal, Accountant" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Button type="submit">{isDesignationEditMode ? 'Save' : 'Add'}</Button>
                    </form>
                </Form>

                <div className="space-y-4">
                  <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                          type="search"
                          placeholder="Search designations..."
                          className="pl-8 w-full"
                          value={designationSearchTerm}
                          onChange={(e) => setDesignationSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="rounded-md border">
                      <Table>
                          <TableHeader>
                          <TableRow>
                              <TableHead>Designation Name</TableHead>
                              <TableHead className="text-right w-[100px]">Actions</TableHead>
                          </TableRow>
                          </TableHeader>
                          <TableBody>
                          {designationsLoading && (
                              <TableRow>
                              <TableCell colSpan={2} className="text-center">
                                  Loading designations...
                              </TableCell>
                              </TableRow>
                          )}
                          {!designationsLoading && filteredDesignations.length === 0 && (
                              <TableRow>
                              <TableCell colSpan={2} className="text-center">
                                  No designations found.
                              </TableCell>
                              </TableRow>
                          )}
                          {filteredDesignations.map(designation => (
                          <TableRow key={designation.id}>
                              <TableCell className="font-medium">{designation.name}</TableCell>
                              <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditDesignation(designation)}>
                                      <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteDesignation(designation)}>
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </TableCell>
                          </TableRow>
                          ))}
                          </TableBody>
                      </Table>
                  </div>
                </div>
            </div>
            <SheetFooter>
                <SheetClose asChild><Button variant="outline">Close</Button></SheetClose>
            </SheetFooter>
        </SheetContent>
      </Sheet>

       <Dialog open={isDeleteDesignationDialogOpen} onOpenChange={setIsDeleteDesignationDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>This will permanently delete the designation "{selectedDesignation?.name}". This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button variant="destructive" onClick={confirmDeleteDesignation}>Yes, delete designation</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </main>
  )
}




