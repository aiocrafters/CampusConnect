

"use client"

import { useState, useMemo } from "react"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, doc, updateDoc, where, writeBatch } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { GraduationCap } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { Student, ClassSection } from "@/lib/types"

const classOptions = ["UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];

const getNextClass = (currentClass: string): string | null => {
    if (currentClass === 'UKG') return '1';
    const currentGrade = parseInt(currentClass, 10);
    if (!isNaN(currentGrade) && currentGrade < 12) {
        return (currentGrade + 1).toString();
    }
    return null; // No promotion for Class 12
};


export default function ClassesPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Fetch all class sections for the school
  const classSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`));
  }, [firestore, schoolId]);
  const { data: allClassSections } = useCollection<ClassSection>(classSectionsQuery);

  const sectionsForSelectedClass = useMemo(() => {
    if (!selectedClass || !allClassSections) return [];
    return allClassSections.filter(section => section.className === selectedClass);
  }, [selectedClass, allClassSections]);

  const sectionIdsForSelectedClass = useMemo(() => {
      return sectionsForSelectedClass.map(s => s.id);
  }, [sectionsForSelectedClass]);

  // Fetch all students for the school that are in one of the sections for the selected class
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || sectionIdsForSelectedClass.length === 0) return null;
    return query(collection(firestore, `schools/${schoolId}/students`), where('classSectionId', 'in', sectionIdsForSelectedClass));
  }, [firestore, schoolId, sectionIdsForSelectedClass]);
  const { data: studentsForSelectedClass, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);


  const handleStudentSectionChange = async (studentId: string, newSectionId: string) => {
    if (!firestore || !schoolId) return;
    const studentRef = doc(firestore, `schools/${schoolId}/students`, studentId);
    try {
      await updateDoc(studentRef, { classSectionId: newSectionId });
      toast({
        title: "Section Updated",
        description: `Student's section has been successfully updated.`,
      });
    } catch (error) {
      console.error("Error updating student section: ", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update the student's section.",
      });
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
    batch.update(studentRef, { classSectionId: targetSection.id });

    const timelineEventRef = doc(collection(firestore, `schools/${schoolId}/students/${student.id}/timeline`));
    batch.set(timelineEventRef, {
        id: timelineEventRef.id,
        studentId: student.id,
        timestamp: new Date().toISOString(),
        type: 'PROMOTION',
        description: `Promoted from Class ${currentSection.className} to Class ${nextClass}`,
        details: { 
            fromClass: currentSection.className, 
            toClass: nextClass,
            academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
        }
    });

    try {
        await batch.commit();
        toast({
            title: "Student Promoted!",
            description: `${student.fullName} has been promoted to Class ${nextClass}.`
        });
    } catch (error) {
         console.error("Error promoting student: ", error);
         toast({
            variant: "destructive",
            title: "Promotion Failed",
            description: "An error occurred while promoting the student.",
         });
    }
  };


  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Class & Section Assignments</CardTitle>
          <CardDescription>
            Choose a class to view its students, assign sections, and promote them to the next grade.
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
                <div>
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
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">Loading students...</TableCell>
                                    </TableRow>
                                )}
                                {!studentsLoading && studentsForSelectedClass && studentsForSelectedClass.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">No students found for this class.</TableCell>
                                    </TableRow>
                                )}
                                {studentsForSelectedClass && studentsForSelectedClass.map(student => {
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
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Assign a section" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {sectionsForSelectedClass.length > 0 ? (
                                                            sectionsForSelectedClass.map(section => (
                                                                <SelectItem key={section.id} value={section.id}>
                                                                    {section.sectionIdentifier}
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <SelectItem value="-" disabled>No sections available</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 <Button 
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handlePromoteStudent(student)}
                                                    disabled={!canPromote}
                                                >
                                                    <GraduationCap className="mr-2 h-4 w-4" />
                                                    Promote
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </main>
  )
}
