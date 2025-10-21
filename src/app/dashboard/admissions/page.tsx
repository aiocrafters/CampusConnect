
"use client"

import { useState, useMemo } from "react"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, writeBatch } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Student, ClassSection } from "@/lib/types"
import { Rocket } from "lucide-react"

const classOptions = ["UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];
const currentYear = new Date().getFullYear();
const sessionOptions = Array.from({ length: 5 }, (_, i) => `${currentYear - i}-${(currentYear - i + 1).toString().slice(-2)}`);

export default function ClassAdmissionPage() {
    const { user, firestore } = useFirebase();
    const schoolId = user?.uid;
    const { toast } = useToast();

    const [session, setSession] = useState<string>(sessionOptions[0]);
    const [fromClass, setFromClass] = useState<string | null>(null);
    const [fromSectionId, setFromSectionId] = useState<string | null>(null);
    const [toClass, setToClass] = useState<string | null>(null);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    // Fetch all class sections for the school
    const classSectionsQuery = useMemoFirebase(() => {
        if (!firestore || !schoolId) return null;
        return query(collection(firestore, `schools/${schoolId}/classSections`));
    }, [firestore, schoolId]);
    const { data: allClassSections } = useCollection<ClassSection>(classSectionsQuery);

    const fromSections = useMemo(() => {
        if (!fromClass || !allClassSections) return [];
        return allClassSections.filter(s => s.className === fromClass);
    }, [fromClass, allClassSections]);

    const studentsInFromSectionQuery = useMemoFirebase(() => {
        if (!firestore || !schoolId || !fromSectionId) return null;
        return query(collection(firestore, `schools/${schoolId}/students`), where("classSectionId", "==", fromSectionId));
    }, [firestore, schoolId, fromSectionId]);
    const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsInFromSectionQuery);

    const handlePromoteStudents = async () => {
        if (!firestore || !schoolId || !fromSectionId || !toClass || selectedStudents.length === 0) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select session, classes, and students to promote." });
            return;
        }

        const toSection = allClassSections?.find(s => s.className === toClass && s.sectionIdentifier === 'A');
        if (!toSection) {
            toast({ variant: "destructive", title: "Destination Section Not Found", description: `Default section 'A' not found for Class ${toClass}. Please create it first.` });
            return;
        }

        const batch = writeBatch(firestore);

        selectedStudents.forEach(studentId => {
            const studentRef = doc(firestore, `schools/${schoolId}/students`, studentId);
            batch.update(studentRef, { classSectionId: toSection.id });

            const timelineEventRef = doc(collection(firestore, `schools/${schoolId}/students/${studentId}/timeline`));
            batch.set(timelineEventRef, {
                id: timelineEventRef.id,
                studentId: studentId,
                timestamp: new Date().toISOString(),
                type: 'PROMOTION',
                description: `Promoted to Class ${toClass} for session ${session}`,
                details: { class: toClass, academicYear: session }
            });
        });

        try {
            await batch.commit();
            toast({ title: "Promotion Successful", description: `${selectedStudents.length} students have been promoted.` });
            setSelectedStudents([]);
        } catch (error) {
            console.error("Promotion Error: ", error);
            toast({ variant: "destructive", title: "Promotion Failed", description: "An error occurred while promoting students." });
        }
    };
    
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudents(students?.map(s => s.id) || []);
        } else {
            setSelectedStudents([]);
        }
    };

    const handleSelectStudent = (studentId: string, checked: boolean) => {
        if (checked) {
            setSelectedStudents(prev => [...prev, studentId]);
        } else {
            setSelectedStudents(prev => prev.filter(id => id !== studentId));
        }
    };

    return (
        <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Class Admission & Promotion</CardTitle>
                    <CardDescription>
                        Promote students from one class to another for the new academic session.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                             <label className="text-sm font-medium">Session</label>
                            <Select onValueChange={setSession} value={session}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {sessionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">From Class</label>
                            <Select onValueChange={(v) => {setFromClass(v); setFromSectionId(null);}} value={fromClass || ''}>
                                <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                                <SelectContent>
                                    {classOptions.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium">From Section</label>
                            <Select onValueChange={setFromSectionId} value={fromSectionId || ''} disabled={!fromClass}>
                                <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                                <SelectContent>
                                    {fromSections?.map(s => <SelectItem key={s.id} value={s.id}>{s.sectionIdentifier}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">To Class</label>
                            <Select onValueChange={setToClass} value={toClass || ''}>
                                <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                                <SelectContent>
                                    {classOptions.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {fromSectionId && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Students in Selected Section</h3>
                                 <Button onClick={handlePromoteStudents} disabled={selectedStudents.length === 0 || !toClass}>
                                    <Rocket className="mr-2 h-4 w-4" /> Promote {selectedStudents.length} Student(s)
                                </Button>
                            </div>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">
                                                <Checkbox
                                                    checked={students && students.length > 0 && selectedStudents.length === students.length}
                                                    onCheckedChange={handleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Admission No.</TableHead>
                                            <TableHead>Parent Name</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentsLoading && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center">Loading students...</TableCell>
                                            </TableRow>
                                        )}
                                        {!studentsLoading && students?.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center">No students found in this section.</TableCell>
                                            </TableRow>
                                        )}
                                        {students?.map(student => (
                                            <TableRow key={student.id} data-state={selectedStudents.includes(student.id) ? "selected" : ""}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedStudents.includes(student.id)}
                                                        onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                                                    />
                                                </TableCell>
                                                <TableCell>{student.fullName}</TableCell>
                                                <TableCell>{student.admissionNumber}</TableCell>
                                                <TableCell>{student.parentGuardianName}</TableCell>
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
    );
}
