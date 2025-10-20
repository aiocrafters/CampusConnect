
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
import type { Teacher } from "@/lib/types"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"

// Define the ClassSection type based on your backend.json
interface ClassSection {
    id: string;
    schoolId: string;
    className: string;
    sectionName: string;
    classInchargeId?: string;
}

const classSectionFormSchema = z.object({
  id: z.string().min(1, "ID is required."),
  className: z.string().min(1, "Class name is required."),
  sectionName: z.string().min(1, "Section name is required."),
  classInchargeId: z.string().optional(),
});

export default function ClassesPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassSection | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const classesQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`));
  }, [firestore, schoolId]);

  const teachersQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/teachers`));
  }, [firestore, schoolId]);

  const { data: classes, isLoading: classesLoading } = useCollection<ClassSection>(classesQuery);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

  const form = useForm<z.infer<typeof classSectionFormSchema>>({
    resolver: zodResolver(classSectionFormSchema),
    defaultValues: {
      id: "",
      className: "",
      sectionName: "",
      classInchargeId: "",
    },
  });

  useEffect(() => {
    if (isSheetOpen) {
      if (isEditMode && selectedClass) {
        form.reset(selectedClass);
      } else {
        const newClassId = doc(collection(firestore!, `schools/${schoolId}/classSections`)).id;
        form.reset({
          id: newClassId,
          className: "",
          sectionName: "",
          classInchargeId: "",
        });
      }
    }
  }, [isSheetOpen, isEditMode, selectedClass, form, firestore, schoolId]);

  const handleAddNew = () => {
    setIsEditMode(false);
    setSelectedClass(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (classSection: ClassSection) => {
    setIsEditMode(true);
    setSelectedClass(classSection);
    setIsSheetOpen(true);
  };

  const handleDelete = (classSection: ClassSection) => {
    setSelectedClass(classSection);
    setIsDeleteDialogOpen(true);
  };

  async function onSubmit(values: z.infer<typeof classSectionFormSchema>) {
    if (!firestore || !schoolId) {
      toast({ variant: "destructive", title: "Error", description: "Could not find school information." });
      return;
    }
    
    const classDocRef = doc(firestore, `schools/${schoolId}/classSections`, values.id);
    
    const dataToSave = {
        ...values,
        schoolId,
    };
    
    if (isEditMode) {
      updateDocumentNonBlocking(classDocRef, dataToSave);
      toast({ title: "Class Updated", description: `Class ${values.className} - ${values.sectionName} has been updated.` });
    } else {
      setDocumentNonBlocking(classDocRef, dataToSave, { merge: false });
      toast({ title: "Class Added", description: `Class ${values.className} - ${values.sectionName} has been created.` });
    }

    form.reset();
    setIsSheetOpen(false);
    setIsEditMode(false);
    setSelectedClass(null);
  }

  async function confirmDelete() {
    if (!firestore || !schoolId || !selectedClass) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete class." });
      return;
    }
    const classDocRef = doc(firestore, `schools/${schoolId}/classSections`, selectedClass.id);
    deleteDocumentNonBlocking(classDocRef);
    toast({ title: "Class Deleted", description: `Class ${selectedClass.className} - ${selectedClass.sectionName} has been removed.` });
    setIsDeleteDialogOpen(false);
    setSelectedClass(null);
  }

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId || !teachers) return "Not Assigned";
    return teachers.find(t => t.id === teacherId)?.name || "Unknown Teacher";
  }

  const classOptions = ["LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Class & Section Management</CardTitle>
          <CardDescription>
            Manage all classes and sections in your school.
          </CardDescription>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search by class name..." className="pl-8 sm:w-1/2 md:w-1/3" />
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
                    Add Class
                  </span>
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>{isEditMode ? 'Edit Class Details' : 'Add a New Class'}</SheetTitle>
                  <SheetDescription>
                   {isEditMode ? "Update the class information below." : 'Fill in the details to add a new class section.'}
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
                            <FormLabel>Class ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Auto-generated ID" {...field} disabled />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="className"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Class Name</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select a class" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {classOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                      <FormField
                        control={form.control}
                        name="sectionName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., A, B, C" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="classInchargeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Class Incharge</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger disabled={teachersLoading}>
                                  <SelectValue placeholder={teachersLoading ? "Loading teachers..." : "Select a teacher"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Not Assigned</SelectItem>
                                {teachers && teachers.map(teacher => 
                                  <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <SheetFooter className="mt-auto">
                      <SheetClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </SheetClose>
                      <Button type="submit">{isEditMode ? 'Save Changes' : 'Save Class'}</Button>
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
                <TableHead>Class Name</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Class Incharge</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classesLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Loading class data...
                  </TableCell>
                </TableRow>
              )}
              {!classesLoading && classes?.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No classes found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
              {classes && teachers && classes.map(classSection => (
              <TableRow key={classSection.id}>
                <TableCell className="font-medium">{classSection.className}</TableCell>
                <TableCell>{classSection.sectionName}</TableCell>
                <TableCell>{getTeacherName(classSection.classInchargeId)}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleEdit(classSection)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(classSection)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the class record for <span className="font-semibold">{selectedClass?.className} - {selectedClass?.sectionName}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Yes, delete class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

    