
"use client"

import { useState, useMemo, useEffect } from "react"
import { PlusCircle, Edit, Trash2, Save, X, BookOpen, ChevronRight, NotebookText } from "lucide-react"
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, doc, where, writeBatch } from "firebase/firestore"
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import type { Teacher, Student } from "@/lib/types"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

// Data types
interface ClassSection {
  id: string;
  className: string;
  sectionName: string;
}

interface Exam {
  id: string;
  examName: string;
  classSectionId: string;
  schoolId: string;
}

interface Subject {
    id: string;
    examId: string;
    subjectName: string;
    teacherId: string;
    maxMarks: number;
}

interface PerformanceRecord {
    id: string;
    studentId: string;
    subjectId: string;
    marks: number;
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
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isExamSheetOpen, setIsExamSheetOpen] = useState(false);
  const [isSubjectSheetOpen, setIsSubjectSheetOpen] = useState(false);
  const [isMarksSheetOpen, setIsMarksSheetOpen] = useState(false);
  const [selectedSubjectForMarks, setSelectedSubjectForMarks] = useState<Subject | null>(null);
  const [marks, setMarks] = useState<Record<string, number | string>>({});

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
  const classSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`));
  }, [firestore, schoolId]);
  const { data: allClassSections } = useCollection<ClassSection>(classSectionsQuery);

  const examsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || !selectedSectionId) return null;
    return query(collection(firestore, `schools/${schoolId}/exams`), where("classSectionId", "==", selectedSectionId));
  }, [firestore, schoolId, selectedSectionId]);
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

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || !selectedSectionId) return null;
    return query(collection(firestore, `schools/${schoolId}/students`), where("classSectionId", "==", selectedSectionId));
  }, [firestore, schoolId, selectedSectionId]);
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  
  const performanceRecordsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || !selectedSubjectForMarks) return null;
    return query(collection(firestore, `schools/${schoolId}/performanceRecords`), where("subjectId", "==", selectedSubjectForMarks.id));
  }, [firestore, schoolId, selectedSubjectForMarks]);
  const { data: performanceRecords } = useCollection<PerformanceRecord>(performanceRecordsQuery);


  // Memoized data transformations
  const classOptions = useMemo(() => {
    if (!allClassSections) return [];
    return [...new Set(allClassSections.map(s => s.className))].sort((a,b) => {
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    });
  }, [allClassSections]);

  const sectionOptions = useMemo(() => {
    if (!allClassSections || !selectedClass) return [];
    return allClassSections.filter(s => s.className === selectedClass);
  }, [allClassSections, selectedClass]);
  
  useEffect(() => {
    if (selectedSubjectForMarks && performanceRecords) {
      const initialMarks: Record<string, number | string> = {};
      students?.forEach(student => {
        const record = performanceRecords.find(pr => pr.studentId === student.id);
        initialMarks[student.id] = record ? record.marks : '';
      });
      setMarks(initialMarks);
    }
  }, [selectedSubjectForMarks, performanceRecords, students]);

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
  
  const handleOpenMarksSheet = (subject: Subject) => {
    setSelectedSubjectForMarks(subject);
    setIsMarksSheetOpen(true);
  };

  const onExamSubmit = (values: z.infer<typeof examFormSchema>) => {
    if (!firestore || !schoolId || !selectedSectionId) return;

    const examId = selectedExam ? selectedExam.id : doc(collection(firestore, `schools/${schoolId}/exams`)).id;
    const examDocRef = doc(firestore, `schools/${schoolId}/exams`, examId);
    
    const data = {
        id: examId,
        schoolId,
        classSectionId: selectedSectionId,
        ...values
    };

    if (selectedExam) {
      updateDocumentNonBlocking(examDocRef, data);
      toast({ title: "Exam Updated", description: `${values.examName} has been updated.` });
    } else {
      setDocumentNonBlocking(examDocRef, data, { merge: false });
      toast({ title: "Exam Created", description: `${values.examName} has been created.` });
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
        ...values
    };
    
    setDocumentNonBlocking(subjectDocRef, data, { merge: false });
    toast({ title: "Subject Added", description: `${values.subjectName} added to ${selectedExam.examName}.` });
    setIsSubjectSheetOpen(false);
  };

  const handleDeleteExam = (exam: Exam) => {
    if (!firestore || !schoolId) return;
    deleteDocumentNonBlocking(doc(firestore, `schools/${schoolId}/exams`, exam.id));
    toast({ variant: "destructive", title: "Exam Deleted", description: `${exam.examName} has been deleted.` });
  };
  
  const handleDeleteSubject = (subject: Subject) => {
    if (!firestore || !schoolId || !selectedExam) return;
    deleteDocumentNonBlocking(doc(firestore, `schools/${schoolId}/exams/${selectedExam.id}/subjects`, subject.id));
    toast({ variant: "destructive", title: "Subject Deleted" });
  };

  const onMarksSubmit = async () => {
    if (!firestore || !schoolId || !selectedSubjectForMarks || !students) return;

    const batch = writeBatch(firestore);
    
    students.forEach(student => {
        const studentMark = marks[student.id];
        if (studentMark !== '' && studentMark !== undefined) {
             const record = performanceRecords?.find(pr => pr.studentId === student.id);
             const marksAsNumber = Number(studentMark);

             if (record) { // Update existing record
                const recordRef = doc(firestore, `schools/${schoolId}/performanceRecords`, record.id);
                batch.update(recordRef, { marks: marksAsNumber });
             } else { // Create new record
                const newRecordRef = doc(collection(firestore, `schools/${schoolId}/performanceRecords`));
                batch.set(newRecordRef, {
                    id: newRecordRef.id,
                    studentId: student.id,
                    subjectId: selectedSubjectForMarks.id,
                    marks: marksAsNumber,
                    schoolId: schoolId,
                });
             }
        }
    });

    try {
        await batch.commit();
        toast({ title: "Marks Saved", description: "Student marks have been successfully saved." });
        setIsMarksSheetOpen(false);
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: "Failed to save marks." });
    }
  };

  const getTeacherName = (teacherId: string) => {
    return teachers?.find(t => t.id === teacherId)?.name || "Unknown Teacher";
  };

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Exam & Performance Management</CardTitle>
          <CardDescription>
            Create exams, manage subjects, and record student performance for each class section.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <Select onValueChange={value => { setSelectedClass(value); setSelectedSectionId(null); }} value={selectedClass || ''}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedClass && (
              <Select onValueChange={setSelectedSectionId} value={selectedSectionId || ''} disabled={sectionOptions.length === 0}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder={sectionOptions.length > 0 ? "Choose a section" : "No sections for this class"} />
                </SelectTrigger>
                <SelectContent>
                  {sectionOptions.map(s => <SelectItem key={s.id} value={s.id}>Section {s.sectionName}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {selectedSectionId && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Exams</h3>
                <Button size="sm" className="h-8 gap-1" onClick={() => handleOpenExamSheet(null)}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Create Exam
                  </span>
                </Button>
              </div>

              {examsLoading ? <p>Loading exams...</p> : 
               exams && exams.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
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
                        {subjectsLoading ? <p className="px-4">Loading subjects...</p> : (
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
                                    {subjects?.filter(s => s.examId === exam.id).map(subject => (
                                        <TableRow key={subject.id}>
                                            <TableCell>{subject.subjectName}</TableCell>
                                            <TableCell>{getTeacherName(subject.teacherId)}</TableCell>
                                            <TableCell>{subject.maxMarks}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="secondary" size="sm" onClick={() => handleOpenMarksSheet(subject)}>
                                                    <NotebookText className="h-4 w-4 mr-2" /> Enter Marks
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteSubject(subject)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                     {subjects?.filter(s => s.examId === exam.id).length === 0 && (
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
                <p>No exams created for this section yet.</p>
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
                <SheetTitle>{selectedExam ? 'Edit Exam' : 'Create New Exam'}</SheetTitle>
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
                        <Button type="submit">{selectedExam ? 'Save Changes' : 'Create Exam'}</Button>
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

      {/* Marks Entry Sheet */}
       <Sheet open={isMarksSheetOpen} onOpenChange={setIsMarksSheetOpen}>
        <SheetContent className="sm:max-w-lg">
            <SheetHeader>
                <SheetTitle>Enter Marks for {selectedSubjectForMarks?.subjectName}</SheetTitle>
                <SheetDescription>
                    Exam: {selectedExam?.examName} | Max Marks: {selectedSubjectForMarks?.maxMarks}
                </SheetDescription>
            </SheetHeader>
            <div className="py-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Admission No.</TableHead>
                            <TableHead className="w-[120px]">Marks</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {studentsLoading ? <TableRow><TableCell colSpan={3} className="text-center">Loading students...</TableCell></TableRow> :
                         students?.map(student => (
                            <TableRow key={student.id}>
                                <TableCell>{student.fullName}</TableCell>
                                <TableCell>{student.admissionNumber}</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        value={marks[student.id] || ''}
                                        onChange={(e) => setMarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                                        max={selectedSubjectForMarks?.maxMarks}
                                        min={0}
                                    />
                                </TableCell>
                            </TableRow>
                         ))
                        }
                    </TableBody>
                </Table>
            </div>
            <SheetFooter>
                <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
                <Button onClick={onMarksSubmit}>Save Marks</Button>
            </SheetFooter>
        </SheetContent>
      </Sheet>
    </main>
  )
}
