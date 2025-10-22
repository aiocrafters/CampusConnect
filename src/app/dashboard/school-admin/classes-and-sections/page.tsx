"use client"

import { useState, useMemo, useEffect } from "react"
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, doc, updateDoc, where, writeBatch } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { GraduationCap, PlusCircle, Edit, Trash2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { Student, ClassSection, Teacher } from "@/lib/types"

const classOptions = ["UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];

const getNextClass = (currentClass: string): string | null => {
    if (currentClass === 'UKG') return '1';
    const currentGrade = parseInt(currentClass, 10);
    if (!isNaN(currentGrade) && currentGrade < 12) {
        return (currentGrade + 1).toString();
    }
    return null; // No promotion for Class 12
};

const sectionFormSchema = z.object({
  id: z.string().optional(),
  sectionIdentifier: z.string().min(1, "Section Identifier is required."),
  sectionName: z.string().optional(),
  sectionInchargeId: z.string().optional(),
});

export default function ClassesAndSectionsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Section Management State
  const [isSectionSheetOpen, setIsSectionSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ClassSection | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Data Fetching
  const allClassSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`));
  }, [firestore, schoolId]);
  const { data: allClassSections, isLoading: classSectionsLoading } = useCollection<ClassSection>(allClassSectionsQuery);

  const allStaffQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/staff`));
  }, [firestore, schoolId]);
  const { data: allStaff, isLoading: staffLoading } = useCollection<Teacher>(allStaffQuery);

  // Memoized Derived Data
  const sectionsForSelectedClass = useMemo(() => {
    if (!selectedClass || !allClassSections) return [];
    return allClassSections.filter(section => section.className === selectedClass).sort((a, b) => a.sectionIdentifier.localeCompare(b.sectionIdentifier));
  }, [selectedClass, allClassSections]);

  const sectionIdsForSelectedClass = useMemo(() => {
    return sectionsForSelectedClass.map(s => s.id);
  }, [sectionsForSelectedClass]);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || sectionIdsForSelectedClass.length === 0) return null;
    return query(collection(firestore, `schools/${schoolId}/students`), where('classSectionId', 'in', sectionIdsForSelectedClass));
  }, [firestore, schoolId, sectionIdsForSelectedClass]);
  const { data: studentsForSelectedClass, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  // Section Form
  const sectionForm = useForm<z.infer<typeof sectionFormSchema>>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: { sectionIdentifier: "", sectionName: "", sectionInchargeId: "" },
  });

  const nextSectionIdentifier = useMemo(() => {
    const existingIdentifiers = sectionsForSelectedClass.map(s => s.sectionIdentifier);
    for (let i = 0; i < 26; i++) {
        const identifier = String.fromCharCode(65 + i); // A, B, C...
        if (!existingIdentifiers.includes(identifier)) return identifier;
    }
    return "Z";
  }, [sectionsForSelectedClass]);

  useEffect(() => {
    if (isSectionSheetOpen) {
      if (isEditMode && selectedSection) {
        sectionForm.reset({
          id: selectedSection.id,
          sectionIdentifier: selectedSection.sectionIdentifier,
          sectionName: selectedSection.sectionName,
          sectionInchargeId: selectedSection.sectionInchargeId || "none",
        });
      } else {
        sectionForm.reset({ sectionIdentifier: nextSectionIdentifier, sectionName: "", sectionInchargeId: "none" });
      }
    }
  }, [isSectionSheetOpen, isEditMode, selectedSection, sectionForm, nextSectionIdentifier]);


  // Handlers
  const handleStudentSectionChange = async (studentId: string, newSectionId: string) => {
    if (!firestore || !schoolId) return;
    const studentRef = doc(firestore, `schools/${schoolId}/students`, studentId);
    try {
      await updateDoc(studentRef, { classSectionId: newSectionId });
      toast({ title: "Section Updated", description: `Student's section has been successfully updated.` });
    } catch (error) {
      console.error("Error updating student section: ", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update the student's section." });
    }
  };
  
  const handlePromoteStudent = async (student: Student) => {
    if (!firestore || !schoolId || !allClassSections) return;
    
    const currentSection = allClassSections.find(s => s.id === student.classSectionId);
    if (!currentSection) {
        toast({ variant: "destructive", title: "Error", description: "Cannot find student's current class." });
        return;
    }

    const nextClass = getNextClass(currentSection.className);
    if (!nextClass) {
        toast({ variant: "destructive", title: "Cannot Promote", description: "Student is in the highest class." });
        return;
    }
    
    const targetSection = allClassSections.find(s => s.className === nextClass && s.sectionIdentifier === 'A');
     if (!targetSection) {
        toast({ variant: "destructive", title: "Promotion Failed", description: `Default section 'A' for Class ${nextClass} not found. Please create it first.` });
        return;
    }
    
    const batch = writeBatch(firestore);
    const studentRef = doc(firestore, `schools/${schoolId}/students`, student.id);
    batch.update(studentRef, { classSectionId: targetSection.id, currentClass: nextClass });

    const timelineEventRef = doc(collection(firestore, `schools/${schoolId}/students/${student.id}/timeline`));
    batch.set(timelineEventRef, {
        id: timelineEventRef.id,
        studentId: student.id,
        timestamp: new Date().toISOString(),
        type: 'PROMOTION',
        description: `Promoted from Class ${currentSection.className} to Class ${nextClass}`,
        details: { fromClass: currentSection.className, toClass: nextClass, academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` }
    });

    try {
        await batch.commit();
        toast({ title: "Student Promoted!", description: `${student.fullName} has been promoted to Class ${nextClass}.` });
    } catch (error) {
         console.error("Error promoting student: ", error);
         toast({ variant: "destructive", title: "Promotion Failed", description: "An error occurred while promoting the student." });
    }
  };

  const handleAddSection = () => {
    if (!selectedClass) {
        toast({ variant: "destructive", title: "No Class Selected", description: "Please select a class before adding a section." });
        return;
    }
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

  const getStaffName = (staffId?: string) => {
    if (!staffId || !allStaff || staffId === "none") return "Not Assigned";
    return allStaff.find(t => t.id === staffId)?.name || "Unknown";
  };
  
  const onSectionSubmit = (values: z.infer<typeof sectionFormSchema>) => {
    if (!firestore || !schoolId || !selectedClass) return;

    const sectionId = isEditMode && selectedSection ? selectedSection.id : doc(collection(firestore, `schools/${schoolId}/classSections`)).id;
    const sectionDocRef = doc(firestore, `schools/${schoolId}/classSections`, sectionId);
    
    const dataToSave = {
        id: sectionId,
        schoolId,
        className: selectedClass,
        sectionIdentifier: values.sectionIdentifier,
        sectionName: values.sectionName,
        sectionInchargeId: values.sectionInchargeId === 'none' ? '' : values.sectionInchargeId,
    };
    
    if (isEditMode) {
      updateDocumentNonBlocking(sectionDocRef, dataToSave);
      toast({ title: "Section Updated", description: `Section ${values.sectionIdentifier} for Class ${selectedClass} has been updated.` });
    } else {
      setDocumentNonBlocking(sectionDocRef, dataToSave, { merge: false });
      toast({ title: "Section Added", description: `Section ${values.sectionIdentifier} has been added to Class ${selectedClass}.` });
    }

    sectionForm.reset();
    setIsSectionSheetOpen(false);
  };

  const confirmDeleteSection = () => {
    if (!firestore || !schoolId || !selectedSection) return;
    deleteDocumentNonBlocking(doc(firestore, `schools/${schoolId}/classSections`, selectedSection.id));
    toast({ title: "Section Deleted", variant: "destructive" });
    setIsDeleteDialogOpen(false);
  };

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Class &amp; Section Management</CardTitle>
          <CardDescription>
            Manage students, sections, and promotions for each class.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <Select onValueChange={setSelectedClass} value={selectedClass || ''}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map(mc => (
                  <SelectItem key={mc} value={mc}>Class {mc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClass && (
            <Tabs defaultValue="students">
              <TabsList>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="sections">Sections</TabsTrigger>
              </TabsList>
              
              <TabsContent value="students" className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Students in Class {selectedClass}</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Admission No.</TableHead>
                        <TableHead className="w-[200px]">Assign Section</TableHead>
                        <TableHead className="text-right w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsLoading && (
                        <TableRow><TableCell colSpan={4} className="text-center">Loading students...</TableCell></TableRow>
                      )}
                      {!studentsLoading && studentsForSelectedClass?.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center">No students found for this class.</TableCell></TableRow>
                      )}
                      {studentsForSelectedClass?.map(student => {
                        const currentSection = allClassSections?.find(s => s.id === student.classSectionId);
                        const canPromote = currentSection && getNextClass(currentSection.className) !== null;
                        return (
                          <TableRow key={student.id}>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell>{student.admissionNumber}</TableCell>
                            <TableCell>
                              <Select 
                                value={student.classSectionId || ''}
                                onValueChange={(newSectionId) => handleStudentSectionChange(student.id, newSectionId)}
                                disabled={sectionsForSelectedClass.length === 0}
                              >
                                <SelectTrigger><SelectValue placeholder="Assign a section" /></SelectTrigger>
                                <SelectContent>
                                  {sectionsForSelectedClass.length > 0 ? (
                                    sectionsForSelectedClass.map(section => (
                                      <SelectItem key={section.id} value={section.id}>{section.sectionIdentifier}</SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="-" disabled>No sections available</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => handlePromoteStudent(student)} disabled={!canPromote}>
                                <GraduationCap className="mr-2 h-4 w-4" /> Promote
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="sections" className="mt-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Sections in Class {selectedClass}</h3>
                    <Button size="sm" className="h-9 gap-1" onClick={handleAddSection}>
                        <PlusCircle className="h-4 w-4" /> Add Section
                    </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Section</TableHead>
                        <TableHead>Section Name (Custom)</TableHead>
                        <TableHead>Section Incharge</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classSectionsLoading && (
                        <TableRow><TableCell colSpan={4} className="text-center">Loading sections...</TableCell></TableRow>
                      )}
                      {!classSectionsLoading && sectionsForSelectedClass.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center">No sections found. Add one to get started.</TableCell></TableRow>
                      )}
                      {sectionsForSelectedClass.map(section => (
                        <TableRow key={section.id}>
                          <TableCell>{section.sectionIdentifier}</TableCell>
                          <TableCell>{section.sectionName || '-'}</TableCell>
                          <TableCell>{getStaffName(section.sectionInchargeId)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditSection(section)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteSection(section)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSectionSheetOpen} onOpenChange={setIsSectionSheetOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>{isEditMode ? 'Edit Section' : `Add Section to Class ${selectedClass}`}</SheetTitle>
                <SheetDescription>{isEditMode ? "Update details." : "Fill in details."}</SheetDescription>
            </SheetHeader>
            <Form {...sectionForm}>
                <form onSubmit={sectionForm.handleSubmit(onSectionSubmit)} className="flex flex-col h-full">
                    <div className="grid gap-4 py-4">
                        <FormField control={sectionForm.control} name="sectionIdentifier" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Section</FormLabel>
                                <FormControl><Input placeholder="e.g., A, B, C" {...field} disabled /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={sectionForm.control} name="sectionName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Section Name (Optional)</FormLabel>
                                <FormControl><Input placeholder="e.g., Red, Blue" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={sectionForm.control} name="sectionInchargeId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Section Incharge</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                    <FormControl>
                                        <SelectTrigger disabled={staffLoading}>
                                            <SelectValue placeholder={staffLoading ? "Loading..." : "Select a teacher"} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">Not Assigned</SelectItem>
                                        {allStaff?.map(teacher => 
                                          <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                    <SheetFooter className="mt-auto">
                        <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
                        <Button type="submit">{isEditMode ? 'Save Changes' : 'Save Section'}</Button>
                    </SheetFooter>
                </form>
            </Form>
        </SheetContent>
      </Sheet>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete section <span className="font-semibold">{selectedSection?.sectionIdentifier}</span> from Class {selectedClass}. Any students will need to be reassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={confirmDeleteSection}>Yes, delete section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
