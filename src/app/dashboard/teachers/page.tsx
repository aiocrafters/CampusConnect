
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, doc } from "firebase/firestore"
import type { Teacher } from "@/lib/types"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"

const teacherFormSchema = z.object({
  id: z.string().min(1, "Teacher ID is required."),
  name: z.string().min(2, "Teacher name is required."),
  contactDetails: z.string().min(10, "Contact details must be at least 10 characters."),
});

export default function TeachersPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const teachersQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/teachers`));
  }, [firestore, schoolId]);

  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

  const form = useForm<z.infer<typeof teacherFormSchema>>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      id: "",
      name: "",
      contactDetails: "",
    },
  });

  useEffect(() => {
    if (isSheetOpen) {
      if (isEditMode && selectedTeacher) {
        form.reset(selectedTeacher);
      } else {
        const newTeacherId = doc(collection(firestore!, `schools/${schoolId}/teachers`)).id;
        form.reset({
          id: newTeacherId,
          name: "",
          contactDetails: "",
        });
      }
    }
  }, [isSheetOpen, isEditMode, selectedTeacher, form, firestore, schoolId]);

  const handleAddNew = () => {
    setIsEditMode(false);
    setSelectedTeacher(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setIsEditMode(true);
    setSelectedTeacher(teacher);
    setIsSheetOpen(true);
  };
  
  const handleView = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsDeleteDialogOpen(true);
  };

  async function onSubmit(values: z.infer<typeof teacherFormSchema>) {
    if (!firestore || !schoolId) {
      toast({ variant: "destructive", title: "Error", description: "Could not find school information." });
      return;
    }
    
    const teacherDocRef = doc(firestore, `schools/${schoolId}/teachers`, values.id);
    
    const dataToSave: Omit<Teacher, 'schoolId'> & { schoolId: string } = {
        ...values,
        schoolId,
    };
    
    if (isEditMode) {
      updateDocumentNonBlocking(teacherDocRef, dataToSave);
      toast({ title: "Teacher Updated", description: `${values.name}'s information has been updated.` });
    } else {
      setDocumentNonBlocking(teacherDocRef, dataToSave, { merge: false });
      toast({ title: "Teacher Added", description: `${values.name} has been added to the teacher list.` });
    }

    form.reset();
    setIsSheetOpen(false);
    setIsEditMode(false);
    setSelectedTeacher(null);
  }

  async function confirmDelete() {
    if (!firestore || !schoolId || !selectedTeacher) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete teacher." });
      return;
    }
    const teacherDocRef = doc(firestore, `schools/${schoolId}/teachers`, selectedTeacher.id);
    deleteDocumentNonBlocking(teacherDocRef);
    toast({ title: "Teacher Deleted", description: `${selectedTeacher.name} has been removed.` });
    setIsDeleteDialogOpen(false);
    setSelectedTeacher(null);
  }

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Management</CardTitle>
          <CardDescription>
            Manage all teachers in your school.
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
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm" className="h-8 gap-1" onClick={handleAddNew}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add Teacher
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>{isEditMode ? 'Edit Teacher Details' : 'Add a New Teacher'}</SheetTitle>
                  <SheetDescription>
                   {isEditMode ? "Update the teacher's information below." : 'Fill in the details to add a new teacher.'}
                  </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                    <div className="grid gap-4 py-4">
                      <FormField
                        control={form.control}
                        name="id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teacher ID</FormLabel>
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
                        name="contactDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Details</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 9876543210 or email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <SheetFooter className="mt-auto">
                      <SheetClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </SheetClose>
                      <Button type="submit">{isEditMode ? 'Save Changes' : 'Save Teacher'}</Button>
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
                <TableHead>Teacher ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact Details</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachersLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading teacher data...
                  </TableCell>
                </TableRow>
              )}
              {!teachersLoading && teachers?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No teachers found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
              {teachers && teachers.map(teacher => (
              <TableRow key={teacher.id}>
                <TableCell className="font-medium truncate max-w-[150px]">{teacher.id}</TableCell>
                <TableCell>{teacher.name}</TableCell>
                <TableCell>{teacher.contactDetails}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleEdit(teacher)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleView(teacher)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(teacher)}>Delete</DropdownMenuItem>
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
            <DialogTitle>Teacher Details</DialogTitle>
            <DialogDescription>
              Full information for {selectedTeacher?.name}.
            </DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <div className="grid gap-4 py-4 text-sm">
              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Teacher ID</span>
                <span className="truncate">{selectedTeacher.id}</span>
              </div>
              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Full Name</span>
                <span>{selectedTeacher.name}</span>
              </div>
              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="font-semibold text-muted-foreground">Contact Details</span>
                <span>{selectedTeacher.contactDetails}</span>
              </div>
            </div>
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
              This action cannot be undone. This will permanently delete the teacher record for <span className="font-semibold">{selectedTeacher?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Yes, delete teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  )
}

    