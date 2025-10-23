
"use client"

import { useState, useMemo, useEffect } from "react"
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
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
import type { ClassSection, Teacher } from "@/lib/types"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

const sectionFormSchema = z.object({
  sectionIdentifier: z.string().min(1, "Section is required."),
  sectionInchargeId: z.string().optional(),
});

const defaultClasses = ["LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function ClassesAndSectionsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Data Fetching
  const allClassSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`), where("className", "==", selectedClass || ""));
  }, [firestore, schoolId, selectedClass]);
  const { data: sectionsForSelectedClass, isLoading: allSectionsLoading } = useCollection<ClassSection>(allClassSectionsQuery);
  
  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/staff`));
  }, [firestore, schoolId]);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(staffQuery);

  // Forms
  const sectionForm = useForm<z.infer<typeof sectionFormSchema>>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: { sectionIdentifier: "", sectionInchargeId: "none" },
  });

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
      sectionForm.reset({ sectionIdentifier: nextSectionIdentifier, sectionInchargeId: "none" });
    }
  }, [isSectionDialogOpen, nextSectionIdentifier, sectionForm]);


  // Handlers
  const handleSectionSubmit = (values: z.infer<typeof sectionFormSchema>) => {
    if (!firestore || !schoolId || !selectedClass) return;

    const sectionId = doc(collection(firestore, `schools/${schoolId}/classSections`)).id;
    const sectionDocRef = doc(firestore, `schools/${schoolId}/classSections`, sectionId);

    const newSection: Omit<ClassSection, 'sectionName'> = {
        id: sectionId,
        schoolId,
        className: selectedClass,
        sectionIdentifier: values.sectionIdentifier,
        sectionInchargeId: values.sectionInchargeId === 'none' ? '' : values.sectionInchargeId,
    };

    setDocumentNonBlocking(sectionDocRef, newSection, { merge: false });
    toast({ title: "Section Added", description: `Section ${values.sectionIdentifier} added to Class ${selectedClass}.` });
    sectionForm.reset({ sectionIdentifier: nextSectionIdentifier, sectionInchargeId: "none" });
  };
  
  const handleAddSectionClick = () => {
    if (!selectedClass) {
      toast({
        variant: "destructive",
        title: "No class selected",
        description: "Please select a class first to add a section.",
      });
      return;
    }
    setIsSectionDialogOpen(true);
  }

  const handleDeleteSection = (section: ClassSection) => {
    if (!firestore || !schoolId) return;
    deleteDocumentNonBlocking(doc(firestore, `schools/${schoolId}/classSections`, section.id));
    toast({ variant: "destructive", title: "Section Deleted" });
  }

  const handleSectionInchargeChange = (sectionId: string, inchargeId: string) => {
    if (!firestore || !schoolId) return;
    const sectionDocRef = doc(firestore, `schools/${schoolId}/classSections`, sectionId);
    updateDocumentNonBlocking(sectionDocRef, { sectionInchargeId: inchargeId === 'none' ? '' : inchargeId });
    toast({ title: "Incharge Updated", description: "The section incharge has been updated." });
  };

  const getTeacherName = (teacherId?: string): string => {
    if (!teachers || !teacherId || teacherId === 'none') return "Not Assigned";
    return teachers.find(t => t.id === teacherId)?.name || "Not Assigned";
  };

  return (
    <main className="grid flex-1 items-start gap-8 sm:px-6 sm:py-0">
      <Card>
        <CardHeader>
          <CardTitle>Classes and Sections</CardTitle>
          <CardDescription>Manage sections for each class.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center mb-6">
            <Select onValueChange={setSelectedClass} value={selectedClass || ""}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Choose a class to manage" />
              </SelectTrigger>
              <SelectContent>
                {defaultClasses.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleAddSectionClick} disabled={!selectedClass}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Section
            </Button>
          </div>
          
          {selectedClass && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Sections for Class {selectedClass}</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section Name</TableHead>
                      <TableHead>Section Incharge</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allSectionsLoading && <TableRow><TableCell colSpan={3} className="text-center">Loading...</TableCell></TableRow>}
                    {!allSectionsLoading && sectionsForSelectedClass?.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">No sections yet.</TableCell></TableRow>}
                    {sectionsForSelectedClass?.map(sec => (
                        <TableRow key={sec.id}>
                            <TableCell>{sec.sectionIdentifier}</TableCell>
                            <TableCell>
                                <Select 
                                    value={sec.sectionInchargeId || 'none'} 
                                    onValueChange={(value) => handleSectionInchargeChange(sec.id, value)}
                                    disabled={teachersLoading}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder={teachersLoading ? 'Loading...' : 'Select Teacher'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Not Assigned</SelectItem>
                                        {teachers?.map(teacher => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </TableCell>
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
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Section to Class {selectedClass}</DialogTitle>
            <DialogDescription>Create a new section and optionally assign an incharge.</DialogDescription>
          </DialogHeader>
          <Form {...sectionForm}>
            <form onSubmit={sectionForm.handleSubmit(handleSectionSubmit)} className="grid grid-cols-1 md:grid-cols-2 items-end gap-4 pt-4">
              <FormField
                control={sectionForm.control}
                name="sectionIdentifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Identifier</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={sectionForm.control}
                name="sectionInchargeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Incharge</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger disabled={teachersLoading}>
                          <SelectValue placeholder={teachersLoading ? 'Loading...' : 'Select Teacher'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Not Assigned</SelectItem>
                        {teachers?.map(teacher => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <div className="md:col-span-2 flex justify-end gap-2">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Section
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
