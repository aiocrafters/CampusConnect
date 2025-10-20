
"use client"

import { useState, useMemo } from "react"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, doc, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Student } from "@/lib/types"

interface ClassSection {
    id: string;
    schoolId: string;
    className: string;
    sectionName: string;
}

interface MasterClass {
    id: string;
    schoolId: string;
    className: string;
}

export default function ClassesPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Fetch all master classes for the school
  const masterClassesQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/masterClasses`));
  }, [firestore, schoolId]);
  const { data: masterClasses, isLoading: masterClassesLoading } = useCollection<MasterClass>(masterClassesQuery);

  // Fetch all class sections for the school
  const classSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`));
  }, [firestore, schoolId]);
  const { data: allClassSections } = useCollection<ClassSection>(classSectionsQuery);

  // Fetch all students for the school
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/students`));
  }, [firestore, schoolId]);
  const { data: allStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const sectionsForSelectedClass = useMemo(() => {
    if (!selectedClass || !allClassSections) return [];
    return allClassSections.filter(section => section.className === selectedClass);
  }, [selectedClass, allClassSections]);

  const studentsForSelectedClass = useMemo(() => {
    if (!selectedClass || !allStudents) return [];
    return allStudents.filter(student => student.admissionClass === selectedClass);
  }, [selectedClass, allStudents]);

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

  const classOptions = useMemo(() => {
    if (!masterClasses) return [];
    return [...masterClasses].sort((a, b) => a.className.localeCompare(b.className));
  }, [masterClasses]);

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Class & Section Assignments</CardTitle>
          <CardDescription>
            Choose a class to view its students and assign them to their respective sections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <Select onValueChange={setSelectedClass} value={selectedClass || ''}>
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                        {masterClassesLoading ? (
                            <SelectItem value="loading" disabled>Loading classes...</SelectItem>
                        ) : (
                            classOptions.map(mc => (
                                <SelectItem key={mc.id} value={mc.className}>Class {mc.className}</SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>

            {selectedClass && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Students Admitted to Class {selectedClass}</h3>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Admission No.</TableHead>
                                    <TableHead className="w-[250px]">Assign Section</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentsLoading && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">Loading students...</TableCell>
                                    </TableRow>
                                )}
                                {!studentsLoading && studentsForSelectedClass.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">No students found for this class.</TableCell>
                                    </TableRow>
                                )}
                                {studentsForSelectedClass.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell>{student.fullName}</TableCell>
                                        <TableCell>{student.admissionNumber}</TableCell>
                                        <TableCell>
                                             <Select 
                                                value={student.classSectionId}
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
                                                                {section.sectionName}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem value="-" disabled>No sections available</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
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
    </main>
  )
}
