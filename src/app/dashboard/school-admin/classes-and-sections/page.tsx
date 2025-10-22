
"use client"

import { useState, useMemo, useEffect } from "react"
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, doc, where } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { PlusCircle, Trash2 } from "lucide-react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import type { ClassSection, MasterClass } from "@/lib/types"

const classFormSchema = z.object({
  className: z.string().min(1, "Class name is required."),
});

const sectionFormSchema = z.object({
  sectionIdentifier: z.string().min(1, "Section is required."),
});

export default function ClassesAndSectionsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<MasterClass | null>(null);

  // Data Fetching
  const masterClassesQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/masterClasses`));
  }, [firestore, schoolId]);
  const { data: masterClasses, isLoading: masterClassesLoading } = useCollection<MasterClass>(masterClassesQuery);

  const classSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || !selectedClass) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`), where("className", "==", selectedClass.className));
  }, [firestore, schoolId, selectedClass]);
  const { data: sectionsForSelectedClass, isLoading: sectionsLoading } = useCollection<ClassSection>(classSectionsQuery);

  // Forms
  const classForm = useForm<z.infer<typeof classFormSchema>>({
    resolver: zodResolver(classFormSchema),
    defaultValues: { className: "" },
  });

  const sectionForm = useForm<z.infer<typeof sectionFormSchema>>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: { sectionIdentifier: "" },
  });
  
  const sortedMasterClasses = useMemo(() => {
    if (!masterClasses) return [];
    return [...masterClasses].sort((a, b) => {
      const classA = a.className;
      const classB = b.className;

      if (classA === 'UKG') return -1;
      if (classB === 'UKG') return 1;

      const numA = parseInt(classA, 10);
      const numB = parseInt(classB, 10);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      
      return classA.localeCompare(classB); // Fallback for non-numeric names
    });
  }, [masterClasses]);

  const nextSectionIdentifier = useMemo(() => {
    if (!sectionsForSelectedClass) return "A";
    const existingIdentifiers = sectionsForSelectedClass.map(s => s.sectionIdentifier);
    for (let i = 0; i < 26; i++) {
        const identifier = String.fromCharCode(65 + i); // A, B, C...
        if (!existingIdentifiers.includes(identifier)) return identifier;
    }
    return "Z";
  }, [sectionsForSelectedClass]);
  
  useEffect(() => {
    if (isSectionDialogOpen) {
      sectionForm.reset({ sectionIdentifier: nextSectionIdentifier });
    }
  }, [isSectionDialogOpen, nextSectionIdentifier, sectionForm]);


  // Handlers
  const handleClassSubmit = (values: z.infer<typeof classFormSchema>) => {
    if (!firestore || !schoolId) return;

    const classId = doc(collection(firestore, `schools/${schoolId}/masterClasses`)).id;
    const classDocRef = doc(firestore, `schools/${schoolId}/masterClasses`, classId);
    
    const newClass: MasterClass = {
        id: classId,
        schoolId,
        className: values.className,
    };

    setDocumentNonBlocking(classDocRef, newClass, { merge: false });
    toast({ title: "Class Created", description: `Class ${values.className} has been added.` });
    classForm.reset();
  };

  const handleSectionSubmit = (values: z.infer<typeof sectionFormSchema>) => {
    if (!firestore || !schoolId || !selectedClass) return;

    const sectionId = doc(collection(firestore, `schools/${schoolId}/classSections`)).id;
    const sectionDocRef = doc(firestore, `schools/${schoolId}/classSections`, sectionId);

    const newSection: Omit<ClassSection, 'sectionName' | 'sectionInchargeId'> = {
        id: sectionId,
        schoolId,
        className: selectedClass.className,
        sectionIdentifier: values.sectionIdentifier,
    };

    setDocumentNonBlocking(sectionDocRef, newSection, { merge: false });
    toast({ title: "Section Added", description: `Section ${values.sectionIdentifier} added to Class ${selectedClass.className}.` });
    sectionForm.setValue('sectionIdentifier', nextSectionIdentifier); // Reset for next entry
  };
  
  const handleAddSectionClick = (masterClass: MasterClass) => {
    setSelectedClass(masterClass);
    setIsSectionDialogOpen(true);
  }

  const handleDeleteSection = (section: ClassSection) => {
    if (!firestore || !schoolId) return;
    deleteDocumentNonBlocking(doc(firestore, `schools/${schoolId}/classSections`, section.id));
    toast({ variant: "destructive", title: "Section Deleted" });
  }

  return (
    <main className="grid flex-1 items-start gap-8 sm:px-6 sm:py-0">
      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Add New Class</CardTitle>
            <CardDescription>Create a new master class for your school (e.g., UKG, 1, 2, ... 12).</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...classForm}>
              <form onSubmit={classForm.handleSubmit(handleClassSubmit)} className="flex items-end gap-2">
                <FormField
                  control={classForm.control}
                  name="className"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormLabel>Class Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 10 or UKG" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Class
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Classes and Sections</CardTitle>
          <CardDescription>Manage sections for each class.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial No.</TableHead>
                  <TableHead>Class Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masterClassesLoading && (
                  <TableRow><TableCell colSpan={3} className="text-center">Loading classes...</TableCell></TableRow>
                )}
                {!masterClassesLoading && sortedMasterClasses.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center">No classes found. Add one to get started.</TableCell></TableRow>
                )}
                {sortedMasterClasses.map((mc, index) => (
                  <TableRow key={mc.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-semibold text-lg">{mc.className}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleAddSectionClick(mc)}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Manage Sections
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Sections for Class {selectedClass?.className}</DialogTitle>
            <DialogDescription>Add or remove sections for this class.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div>
              <h4 className="font-medium mb-2">Add New Section</h4>
               <Form {...sectionForm}>
                <form onSubmit={sectionForm.handleSubmit(handleSectionSubmit)} className="flex items-end gap-2">
                  <FormField
                    control={sectionForm.control}
                    name="sectionIdentifier"
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormLabel>Section Identifier</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add
                  </Button>
                </form>
              </Form>
            </div>
             <div>
              <h4 className="font-medium mb-2">Existing Sections</h4>
               <div className="rounded-md border max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section Name</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectionsLoading && <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow>}
                    {!sectionsLoading && sectionsForSelectedClass?.length === 0 && <TableRow><TableCell colSpan={2} className="text-center">No sections yet.</TableCell></TableRow>}
                    {sectionsForSelectedClass?.map(sec => (
                        <TableRow key={sec.id}>
                            <TableCell>{sec.sectionIdentifier}</TableCell>
                            <TableCell className="text-right">
                                 <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteSection(sec)}>
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
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
