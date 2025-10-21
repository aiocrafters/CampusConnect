'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs, collectionGroup } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Student, Exam, Subject, ClassSection, PerformanceRecord } from '@/lib/types';
import { Save } from 'lucide-react';

const marksSchema = z.object({
  marks: z.array(
    z.object({
      studentId: z.string(),
      marks: z.coerce.number().min(0, 'Marks cannot be negative.').optional(),
    })
  ),
});

export default function AwardSheetPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Data Fetching
  const classOptions = ['UKG', ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];
  
  const examsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || !selectedClass) return null;
    return query(collection(firestore, `schools/${schoolId}/exams`), where('className', '==', selectedClass));
  }, [firestore, schoolId, selectedClass]);
  const { data: exams } = useCollection<Exam>(examsQuery);

  const subjectsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || !selectedExam) return null;
    return query(collection(firestore, `schools/${schoolId}/exams/${selectedExam.id}/subjects`));
  }, [firestore, schoolId, selectedExam]);
  const { data: subjects } = useCollection<Subject>(subjectsQuery);
  
  const classSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || !selectedClass) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`), where("className", "==", selectedClass));
  }, [firestore, schoolId, selectedClass]);
  const { data: classSections } = useCollection<ClassSection>(classSectionsQuery);
  
  const sectionIds = useMemo(() => classSections?.map(s => s.id) || [], [classSections]);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || sectionIds.length === 0) return null;
    return query(collection(firestore, `schools/${schoolId}/students`), where('classSectionId', 'in', sectionIds));
  }, [firestore, schoolId, sectionIds]);
  const { data: students } = useCollection<Student>(studentsQuery);


  const form = useForm<z.infer<typeof marksSchema>>({
    resolver: zodResolver(marksSchema),
    defaultValues: { marks: [] },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'marks',
  });
  
  // Effect to populate form when students and subject are selected
  useEffect(() => {
    const fetchAndSetMarks = async () => {
        if (students && selectedSubject && firestore && schoolId) {
            setIsLoading(true);
            const performanceRecordsRef = collectionGroup(firestore, 'performanceRecords');
            const q = query(performanceRecordsRef, 
                where('schoolId', '==', schoolId), 
                where('subjectId', '==', selectedSubject.id)
            );
            const recordsSnapshot = await getDocs(q);
            const existingMarks = new Map<string, number>();
            recordsSnapshot.forEach(doc => {
                const record = doc.data() as PerformanceRecord;
                existingMarks.set(record.studentId, record.marks);
            });

            const marksData = students.map(student => ({
                studentId: student.id,
                marks: existingMarks.get(student.id) ?? undefined,
            }));
            replace(marksData);
            setIsLoading(false);
        } else {
             replace([]);
        }
    };
    fetchAndSetMarks();
  }, [students, selectedSubject, replace, firestore, schoolId]);


  const onSubmit = (data: z.infer<typeof marksSchema>) => {
    if (!firestore || !schoolId || !selectedSubject) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot save marks.' });
      return;
    }

    let recordsSaved = 0;
    data.marks.forEach((markEntry) => {
        if (markEntry.marks !== undefined && markEntry.marks !== null) {
            const recordId = `${markEntry.studentId}_${selectedSubject.id}`;
            const recordRef = doc(firestore, `schools/${schoolId}/students/${markEntry.studentId}/performanceRecords`, recordId);
            
            const performanceRecord: PerformanceRecord = {
                id: recordId,
                studentId: markEntry.studentId,
                subjectId: selectedSubject.id,
                schoolId: schoolId,
                examId: selectedSubject.examId,
                marks: markEntry.marks,
                remarks: '', // remarks can be added later
            };
            setDocumentNonBlocking(recordRef, performanceRecord, { merge: true });
            recordsSaved++;
        }
    });
    
    if (recordsSaved > 0) {
        toast({
            title: 'Marks Saved!',
            description: `Successfully saved marks for ${recordsSaved} students.`,
        });
    } else {
        toast({
            title: 'No Marks to Save',
            description: 'No new marks were entered.',
        });
    }
  };
  
  const handleExamChange = (examId: string) => {
      const exam = exams?.find(e => e.id === examId) || null;
      setSelectedExam(exam);
      setSelectedSubject(null);
  }

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Award Sheet</CardTitle>
          <CardDescription>
            Select a class, exam, and subject to enter student marks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select onValueChange={setSelectedClass} value={selectedClass || ''}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((c) => (
                  <SelectItem key={c} value={c}>Class {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={handleExamChange} value={selectedExam?.id || ''} disabled={!selectedClass || !exams}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select Exam" />
              </SelectTrigger>
              <SelectContent>
                {exams?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.examName} - {e.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select onValueChange={(subjectId) => setSelectedSubject(subjects?.find(s => s.id === subjectId) || null)} value={selectedSubject?.id || ''} disabled={!selectedExam || !subjects}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.subjectName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedSubject && students && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Admission No.</TableHead>
                                <TableHead>Student Name</TableHead>
                                <TableHead className="w-[180px]">Maximum Marks</TableHead>
                                <TableHead className="w-[180px]">Marks Obtained</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">Loading student marks...</TableCell>
                                </TableRow>
                            )}
                            {!isLoading && fields.map((field, index) => {
                                const student = students.find(s => s.id === field.studentId);
                                if (!student) return null;

                                return (
                                    <TableRow key={field.id}>
                                        <TableCell>{student.admissionNumber}</TableCell>
                                        <TableCell>{student.fullName}</TableCell>
                                        <TableCell>{selectedSubject.maxMarks}</TableCell>
                                        <TableCell>
                                            <FormField
                                                control={form.control}
                                                name={`marks.${index}.marks`}
                                                render={({ field: formField }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                          <Input 
                                                            type="number" 
                                                            placeholder="Enter marks"
                                                            {...formField}
                                                            max={selectedSubject.maxMarks}
                                                          />
                                                        </FormControl>
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                 <div className="flex justify-end mt-6">
                    <Button type="submit">
                        <Save className="mr-2 h-4 w-4"/>
                        Save Marks
                    </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
