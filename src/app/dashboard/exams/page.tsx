
"use client"

import { useState, useMemo, useEffect } from "react"
import { PlusCircle, Edit, Trash2, BookOpen } from "lucide-react"
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, doc, where, collectionGroup } from "firebase/firestore"
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
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import type { Teacher, Exam } from "@/lib/types"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

// Data types
interface Subject {
    id: string;
    examId: string;
    subjectName: string;
    teacherId: string;
    maxMarks: number;
}

// Zod schemas
const examFormSchema = z.object({
  examName: z.string().min(3, "Exam name is required."),
});

const subjectFormSchema = z.object({
  subjectName: z.string().min(2, "Subject name is required."),
  teacherId: z.string().min(1, "Please assign a teacher."),
  maxMarks: z.coerce.number().min(1, "Max marks are required.").max(500),
});

export default function ExamsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  // State management
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isExamSheetOpen, setIsExamSheetOpen] = useState(false);
  const [isSubjectSheetOpen, setIsSubjectSheetOpen] = useState(false);
  const [isDeleteExamDialogOpen, setIsDeleteExamDialogOpen] = useState(false);
  const [isDeleteSubjectDialogOpen, setIsDeleteSubjectDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Form hooks
  const examForm = useForm<z.infer<typeof examFormSchema>>({
    resolver: zodResolver(examFormSchema),
    defaultValues: { examName: "" },
  });

  const subjectForm = useForm<z.infer<typeof subjectFormSchema>>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: { subjectName: "", teacherId: "", maxMarks: 100 },
  });

  // Data fetching
  const examsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || !selectedClass) return null;
    return query(collection(firestore, `schools/${schoolId}/exams`), where("className", "==", selectedClass));
  }, [firestore, schoolId, selectedClass]);
  const { data: exams, isLoading: examsLoading } = useCollection<Exam>(examsQuery);
  
  const subjectsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || !selectedExam) return null;
    return query(collection(firestore, `schools/${schoolId}/exams/${selectedExam.id}/subjects`));
  }, [firestore, schoolId, selectedExam]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

  const teachersQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/teachers`));
  }, [firestore, schoolId]);
  const { data: teachers } = useCollection<Teacher>(teachersQuery);

  // Memoized data transformations
  const classOptions = ["UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];
  

  // Handlers
  const handleOpenExamSheet = (exam: Exam | null) => {
    setSelectedExam(exam);
    examForm.reset({ examName: exam?.examName || "" });
    setIsExamSheetOpen(true);
  };
  
  const handleOpenSubjectSheet = (exam: Exam) => {
    setSelectedExam(exam);
    subjectForm.reset({ subjectName: "", teacherId: "", maxMarks: 100 });
    setIsSubjectSheetOpen(true);
  };

  const onExamSubmit = (values: z.infer<typeof examFormSchema>) => {
    if (!firestore || !schoolId || !selectedClass) return;

    const examId = selectedExam ? selectedExam.id : doc(collection(firestore, `schools/${schoolId}/exams`)).id;
    const examDocRef = doc(firestore, `schools/${schoolId}/exams`, examId);
    
    const data = {
        id: examId,
        schoolId,
        className: selectedClass,
        ...values
    };

    if (selectedExam) {
      updateDocumentNonBlocking(examDocRef, data);
      toast({ title: "Exam Updated", description: `${values.examName} has been updated.` });
    } else {
      setDocumentNonBlocking(examDocRef, data, { merge: false });
      toast({ title: "Exam Created", description: `${values.examName} has been created for Class ${selectedClass}.` });
    }
    setIsExamSheetOpen(false);
  };
  
  const onSubjectSubmit = (values: z.infer<typeof subjectFormSchema>) => {
    if (!firestore || !schoolId || !selectedExam) return;

    const subjectId = doc(collection(firestore, `schools/${schoolId}/exams/${selectedExam.id}/subjects`)).id;
    const subjectDocRef = doc(firestore, `schools/${schoolId}/exams/${selectedExam.id}/subjects`, subjectId);
    
    const data = {
        id: subjectId,
        examId: selectedExam.id,
        schoolId: schoolId,
        ...values
    };
    
    setDocumentNonBlocking(subjectDocRef, data, { merge: false });
    toast({ title: "Subject Added", description: `${values.subjectName} added to ${selectedExam.examName}.` });
    setIsSubjectSheetOpen(false);
  };

  const handleDeleteExam = (exam: Exam) => {
    setExamToDelete(exam);
    setIsDeleteExamDialogOpen(true);
  };

  const confirmDeleteExam = () => {
    if (!firestore || !schoolId || !examToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, `schools/${schoolId}/exams`, examToDelete.id));
    toast({ variant: "destructive", title: "Exam Deleted", description: `${examToDelete.examName} has been deleted.` });
    setIsDeleteExamDialogOpen(false);
    setExamToDelete(null);
  };
  
  const handleDeleteSubject = (subject: Subject) => {
     setSubjectToDelete(subject);
     setIsDeleteSubjectDialogOpen(true);
  };

  const confirmDeleteSubject = () => {
    if (!firestore || !schoolId || !selectedExam || !subjectToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, `schools/${schoolId}/exams/${selectedExam.id}/subjects`, subjectToDelete.id));
    toast({ variant: "destructive", title: "Subject Deleted" });
    setIsDeleteSubjectDialogOpen(false);
    setSubjectToDelete(null);
  }

  const getTeacherName = (teacherId: string) => {
    return teachers?.find(t => t.id === teacherId)?.name || "Unknown Teacher";
  };
  
  const getSubjectsForExam = (examId: string) => {
    if (!subjects) return [];
    // Ensure that subjects are loaded for the currently selected exam
    if (selectedExam?.id !== examId) return [];
    return subjects.filter(s => s.examId === examId);
  }

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Exam & Performance Management</CardTitle>
          <CardDescription>
            Create exams and manage subjects for each class.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <Select onValueChange={setSelectedClass} value={selectedClass || ''}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          {selectedClass && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Exams for Class {selectedClass}</h3>
                <Button size="sm" className="h-8 gap-1" onClick={() => handleOpenExamSheet(null)}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Create Exam
                  </span>
                </Button>
              </div>

              {examsLoading ? <p>Loading exams...</p> : 
               exams && exams.length > 0 ? (
                <Accordion type="single" collapsible className="w-full" onValueChange={(value) => {
                    const exam = exams.find(e => e.id === value);
                    setSelectedExam(exam || null);
                }}>
                  {exams.map(exam => (
                    <AccordionItem value={exam.id} key={exam.id}>
                      <div className="flex items-center w-full">
                        <AccordionTrigger>
                          <span className="text-lg font-medium">{exam.examName}</span>
                        </AccordionTrigger>
                        <div className="ml-auto pr-4 flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenExamSheet(exam); }}><Edit className="h-4 w-4 mr-2" /> Edit</Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam); }}><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
                        </div>
                      </div>
                      <AccordionContent>
                        <div className="flex justify-between items-center mb-2 px-4">
                            <h4 className="font-semibold">Subjects</h4>
                            <Button variant="outline" size="sm" onClick={() => handleOpenSubjectSheet(exam)}>
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Subject
                            </Button>
                        </div>
                        {subjectsLoading && selectedExam?.id === exam.id ? <p className="px-4">Loading subjects...</p> : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Teacher</TableHead>
                                        <TableHead>Max Marks</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {getSubjectsForExam(exam.id).map(subject => (
                                        <TableRow key={subject.id}>
                                            <TableCell>{subject.subjectName}</TableCell>
                                            <TableCell>{getTeacherName(subject.teacherId)}</TableCell>
                                            <TableCell>{subject.maxMarks}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteSubject(subject)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                     {getSubjectsForExam(exam.id).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center">No subjects added yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
               ) : (
                <p>No exams created for this class yet.</p>
               )
              }
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Exam Create/Edit Sheet */}
      <Sheet open={isExamSheetOpen} onOpenChange={setIsExamSheetOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>{selectedExam ? 'Edit Exam' : `Create Exam for Class ${selectedClass}`}</SheetTitle>
            </SheetHeader>
            <Form {...examForm}>
                <form onSubmit={examForm.handleSubmit(onExamSubmit)} className="flex flex-col h-full">
                    <div className="grid gap-4 py-4">
                        <FormField
                            control={examForm.control}
                            name="examName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Exam Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Midterm, Final, Unit Test 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <SheetFooter className="mt-auto">
                        <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
                        <Button type="submit" disabled={!selectedClass}>{selectedExam ? 'Save Changes' : 'Create Exam'}</Button>
                    </SheetFooter>
                </form>
            </Form>
        </SheetContent>
      </Sheet>

      {/* Subject Add Sheet */}
      <Sheet open={isSubjectSheetOpen} onOpenChange={setIsSubjectSheetOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>Add Subject to {selectedExam?.examName}</SheetTitle>
            </SheetHeader>
            <Form {...subjectForm}>
                <form onSubmit={subjectForm.handleSubmit(onSubjectSubmit)} className="flex flex-col h-full">
                    <div className="grid gap-4 py-4">
                        <FormField
                            control={subjectForm.control} name="subjectName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Mathematics" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={subjectForm.control} name="teacherId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assign Teacher</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a teacher" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {teachers?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={subjectForm.control} name="maxMarks"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Maximum Marks</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <SheetFooter className="mt-auto">
                        <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
                        <Button type="submit">Add Subject</Button>
                    </SheetFooter>
                </form>
            </Form>
        </SheetContent>
      </Sheet>

      {/* Delete Exam Dialog */}
      <Dialog open={isDeleteExamDialogOpen} onOpenChange={setIsDeleteExamDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>This will permanently delete the exam "{examToDelete?.examName}" and all associated subjects and marks. This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button variant="destructive" onClick={confirmDeleteExam}>Yes, delete exam</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Subject Dialog */}
      <Dialog open={isDeleteSubjectDialogOpen} onOpenChange={setIsDeleteSubjectDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>This will permanently delete the subject "{subjectToDelete?.subjectName}" and all associated marks. This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button variant="destructive" onClick={confirmDeleteSubject}>Yes, delete subject</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

    