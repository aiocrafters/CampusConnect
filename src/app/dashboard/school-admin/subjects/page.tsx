

"use client"

import { useState, useMemo, useEffect } from "react"
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, doc, writeBatch } from "firebase/firestore"
import { PlusCircle, Edit, Trash2 } from "lucide-react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useToast } from "@/hooks/use-toast"

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
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import type { MasterSubject } from "@/lib/types"

const subjectFormSchema = z.object({
  id: z.string().optional(),
  subjectName: z.string().min(2, "Subject name must be at least 2 characters."),
});

const basicSubjects = [
  "English",
  "Mathematics",
  "Science",
  "Social Studies",
  "Hindi",
  "Urdu",
  "Computer Science",
  "Art",
  "Music",
  "Physical Education"
];

export default function SubjectsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<MasterSubject | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Data fetching
  const subjectsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/masterSubjects`));
  }, [firestore, schoolId]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<MasterSubject>(subjectsQuery);

  // Initialize basic subjects if none exist
  useEffect(() => {
    if (!subjectsLoading && subjects?.length === 0 && firestore && schoolId) {
      const initializeSubjects = async () => {
        setIsInitializing(true);
        const batch = writeBatch(firestore);
        basicSubjects.forEach(subjectName => {
          const subjectId = doc(collection(firestore, `schools/${schoolId}/masterSubjects`)).id;
          const subjectRef = doc(firestore, `schools/${schoolId}/masterSubjects`, subjectId);
          batch.set(subjectRef, {
            id: subjectId,
            schoolId: schoolId,
            subjectName: subjectName
          });
        });
        await batch.commit();
        toast({
          title: "Subjects Initialized",
          description: "Basic subjects have been added to your school.",
        });
        setIsInitializing(false);
      };
      initializeSubjects();
    }
  }, [subjectsLoading, subjects, firestore, schoolId, toast]);

  const form = useForm<z.infer<typeof subjectFormSchema>>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: { subjectName: "" },
  });

  const handleAdd = () => {
    setIsEditMode(false);
    setSelectedSubject(null);
    form.reset({ subjectName: "" });
    setIsSheetOpen(true);
  };

  const handleEdit = (subject: MasterSubject) => {
    setIsEditMode(true);
    setSelectedSubject(subject);
    form.reset({ id: subject.id, subjectName: subject.subjectName });
    setIsSheetOpen(true);
  };

  const handleDelete = (subject: MasterSubject) => {
    setSelectedSubject(subject);
    setIsDeleteDialogOpen(true);
  };

  const onSubjectSubmit = (values: z.infer<typeof subjectFormSchema>) => {
    if (!firestore || !schoolId) return;

    if (isEditMode && selectedSubject) {
      const subjectDocRef = doc(firestore, `schools/${schoolId}/masterSubjects`, selectedSubject.id);
      updateDocumentNonBlocking(subjectDocRef, { subjectName: values.subjectName });
      toast({ title: "Subject Updated", description: "The subject has been successfully updated." });
    } else {
      const subjectId = doc(collection(firestore, `schools/${schoolId}/masterSubjects`)).id;
      const subjectDocRef = doc(firestore, `schools/${schoolId}/masterSubjects`, subjectId);
      const data: MasterSubject = {
        id: subjectId,
        schoolId,
        subjectName: values.subjectName,
      };
      setDocumentNonBlocking(subjectDocRef, data, { merge: false });
      toast({ title: "Subject Added", description: "The new subject has been added." });
    }
    setIsSheetOpen(false);
  };

  const confirmDelete = () => {
    if (!firestore || !schoolId || !selectedSubject) return;
    const subjectDocRef = doc(firestore, `schools/${schoolId}/masterSubjects`, selectedSubject.id);
    deleteDocumentNonBlocking(subjectDocRef);
    toast({ variant: "destructive", title: "Subject Deleted" });
    setIsDeleteDialogOpen(false);
    setSelectedSubject(null);
  };

  const isLoading = subjectsLoading || isInitializing;

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Master Subjects</CardTitle>
            <CardDescription>
              Manage the list of subjects available for your school.
            </CardDescription>
          </div>
          <Button size="sm" className="h-8 gap-1" onClick={handleAdd}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Add Subject
            </span>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">
                    Loading subjects...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && subjects?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">
                    No subjects found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && subjects?.map(subject => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.subjectName}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(subject)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(subject)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>{isEditMode ? 'Edit Subject' : 'Add New Subject'}</SheetTitle>
                <SheetDescription>
                    {isEditMode ? "Update the subject name." : "Enter the name for the new subject."}
                </SheetDescription>
            </SheetHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubjectSubmit)} className="flex flex-col h-full">
                    <div className="grid gap-4 py-4">
                        <FormField
                            control={form.control}
                            name="subjectName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Physics" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <SheetFooter className="mt-auto">
                        <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
                        <Button type="submit">{isEditMode ? 'Save Changes' : 'Add Subject'}</Button>
                    </SheetFooter>
                </form>
            </Form>
        </SheetContent>
      </Sheet>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>This will permanently delete the subject "{selectedSubject?.subjectName}". This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button variant="destructive" onClick={confirmDelete}>Yes, delete subject</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
