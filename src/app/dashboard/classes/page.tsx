
"use client"

import { useState, useMemo, useEffect } from "react"
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, doc, where } from "firebase/firestore"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import type { Teacher } from "@/lib/types"

// Based on backend.json
interface ClassSection {
    id: string;
    schoolId: string;
    className: string;
    sectionName: string;
    classInchargeId?: string;
}

const predefinedClasses = ["LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];

const sectionFormSchema = z.object({
  id: z.string().optional(),
  sectionName: z.string().min(1, "Section name is required."),
  classInchargeId: z.string().optional(),
});

export default function ClassesPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  const [isSectionSheetOpen, setIsSectionSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<ClassSection | null>(null);
  const [isManageSectionsDialogOpen, setIsManageSectionsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch all class sections for the school
  const classSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`));
  }, [firestore, schoolId]);
  const { data: allClassSections, isLoading: classSectionsLoading } = useCollection<ClassSection>(classSectionsQuery);

  // Fetch all teachers for the school
  const teachersQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/teachers`));
  }, [firestore, schoolId]);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

  const sectionsForSelectedClass = useMemo(() => {
    if (!selectedClass || !allClassSections) return [];
    return allClassSections.filter(section => section.className === selectedClass);
  }, [selectedClass, allClassSections]);

  const form = useForm<z.infer<typeof sectionFormSchema>>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: {
      sectionName: "",
      classInchargeId: "",
    },
  });

  useEffect(() => {
    if (isSectionSheetOpen) {
      if (isEditMode && selectedSection) {
        form.reset({
          id: selectedSection.id,
          sectionName: selectedSection.sectionName,
          classInchargeId: selectedSection.classInchargeId || "none",
        });
      } else {
        form.reset({
          sectionName: "",
          classInchargeId: "none",
        });
      }
    }
  }, [isSectionSheetOpen, isEditMode, selectedSection, form]);

  const handleManageSections = (className: string) => {
    setSelectedClass(className);
    setIsManageSectionsDialogOpen(true);
  };

  const handleAddSection = () => {
    setIsEditMode(false);
    setSelectedSection(null);
    setIsSectionSheetOpen(true);
  };

  const handleEditSection = (section: ClassSection) => {
    setIsEditMode(true);
    setSelectedSection(section);
    setIsSectionSheetOpen(true);
  };

  const handleDeleteSection = (section: ClassSection) => {
    setSelectedSection(section);
    setIsDeleteDialogOpen(true);
  };

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId || !teachers || teacherId === "none") return "Not Assigned";
    return teachers.find(t => t.id === teacherId)?.name || "Unknown Teacher";
  };
  
  async function onSectionSubmit(values: z.infer<typeof sectionFormSchema>) {
    if (!firestore || !schoolId || !selectedClass) {
      toast({ variant: "destructive", title: "Error", description: "Could not save section." });
      return;
    }

    const sectionId = isEditMode && selectedSection ? selectedSection.id : doc(collection(firestore, `schools/${schoolId}/classSections`)).id;
    const sectionDocRef = doc(firestore, `schools/${schoolId}/classSections`, sectionId);
    
    const dataToSave = {
        id: sectionId,
        schoolId,
        className: selectedClass,
        sectionName: values.sectionName,
        classInchargeId: values.classInchargeId === 'none' ? '' : values.classInchargeId,
    };
    
    if (isEditMode) {
      updateDocumentNonBlocking(sectionDocRef, dataToSave);
      toast({ title: "Section Updated", description: `Section ${values.sectionName} for Class ${selectedClass} has been updated.` });
    } else {
      setDocumentNonBlocking(sectionDocRef, dataToSave, { merge: false });
      toast({ title: "Section Added", description: `Section ${values.sectionName} has been added to Class ${selectedClass}.` });
    }

    form.reset();
    setIsSectionSheetOpen(false);
    setIsEditMode(false);
    setSelectedSection(null);
  }

  async function confirmDeleteSection() {
    if (!firestore || !schoolId || !selectedSection) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete section." });
      return;
    }
    const sectionDocRef = doc(firestore, `schools/${schoolId}/classSections`, selectedSection.id);
    deleteDocumentNonBlocking(sectionDocRef);
    toast({ title: "Section Deleted", description: `Section ${selectedSection.sectionName} has been removed.` });
    setIsDeleteDialogOpen(false);
    setSelectedSection(null);
  }

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Class & Section Management</CardTitle>
          <CardDescription>
            Manage sections for each class and assign an in-charge teacher.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Serial No.</TableHead>
                <TableHead>Class Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predefinedClasses.map((className, index) => (
                <TableRow key={className}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{className}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" onClick={() => handleManageSections(className)}>
                      Manage Sections
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Dialog to Manage Sections for a specific class */}
      <Dialog open={isManageSectionsDialogOpen} onOpenChange={setIsManageSectionsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Sections for Class {selectedClass}</DialogTitle>
            <DialogDescription>
              Add, edit, or remove sections for this class.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-end mb-4">
                 <Button size="sm" className="h-8 gap-1" onClick={handleAddSection}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add Section
                  </span>
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Section Name</TableHead>
                        <TableHead>Class Incharge</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {classSectionsLoading && (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center">Loading sections...</TableCell>
                        </TableRow>
                    )}
                    {!classSectionsLoading && sectionsForSelectedClass.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center">No sections found. Add one to get started.</TableCell>
                        </TableRow>
                    )}
                    {sectionsForSelectedClass.map(section => (
                        <TableRow key={section.id}>
                            <TableCell>{section.sectionName}</TableCell>
                            <TableCell>{getTeacherName(section.classInchargeId)}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleEditSection(section)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteSection(section)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet to Add/Edit a Section */}
      <Sheet open={isSectionSheetOpen} onOpenChange={setIsSectionSheetOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>{isEditMode ? 'Edit Section' : `Add Section to Class ${selectedClass}`}</SheetTitle>
                <SheetDescription>
                    {isEditMode ? "Update the section details." : "Fill in the details for the new section."}
                </SheetDescription>
            </SheetHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSectionSubmit)} className="flex flex-col h-full">
                    <div className="grid gap-4 py-4">
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
                                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
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
                        <Button type="submit">{isEditMode ? 'Save Changes' : 'Save Section'}</Button>
                    </SheetFooter>
                </form>
            </Form>
        </SheetContent>
      </Sheet>

      {/* Dialog for Delete Confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the section <span className="font-semibold">{selectedSection?.sectionName}</span> from Class {selectedClass}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDeleteSection}>
              Yes, delete section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

    