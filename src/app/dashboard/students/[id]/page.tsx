
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { doc, collection, query, orderBy, where, getDoc, getDocs } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import type { Student, StudentTimelineEvent, Exam, Subject, PerformanceRecord } from "@/lib/types";
import { ScrollText, ClipboardCheck, User, Mail, Phone, Calendar, Hash, Home, GraduationCap, ArrowRight, Edit, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";


interface PerformanceDetails extends PerformanceRecord {
  subjectName: string;
  maxMarks: number;
}

const studentFormSchema = z.object({
  id: z.string().min(1, "Student ID is required."),
  admissionNumber: z.string().min(1, "Admission Number is required."),
  admissionDate: z.string().min(1, "Admission Date is required."),
  fullName: z.string().min(2, "Full name is required."),
  pen: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  parentGuardianName: z.string().min(2, "Father's name is required."),
  motherName: z.string().optional(),
  address: z.string().min(5, "Address is required."),
  aadhaarNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  ifscCode: z.string().optional(),
  admissionClass: z.string().min(1, "Admission Class is required"),
  currentClass: z.string().min(1, "Current Class is required"),
});


export default function StudentDetailPage() {
    const { user, firestore } = useFirebase();
    const params = useParams();
    const studentId = params.id as string;
    const { toast } = useToast();
    
    const [isExamDetailOpen, setIsExamDetailOpen] = useState(false);
    const [examDetails, setExamDetails] = useState<Exam | null>(null);
    const [performanceDetails, setPerformanceDetails] = useState<PerformanceDetails[] | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<'Active' | 'Inactive'>('Active');
    const [inactiveReason, setInactiveReason] = useState('');

    const studentRef = useMemoFirebase(() => {
        if (!user || !firestore || !studentId) return null;
        return doc(firestore, `schools/${user.uid}/students/${studentId}`);
    }, [user, firestore, studentId]);

    const timelineQuery = useMemoFirebase(() => {
        if (!user || !firestore || !studentId) return null;
        return query(collection(firestore, `schools/${user.uid}/students/${studentId}/timeline`), orderBy("timestamp", "desc"));
    }, [user, firestore, studentId]);

    const { data: student, isLoading: studentLoading } = useDoc<Student>(studentRef);
    const { data: timelineEvents, isLoading: timelineLoading } = useCollection<StudentTimelineEvent>(timelineQuery);

    const form = useForm<z.infer<typeof studentFormSchema>>({
        resolver: zodResolver(studentFormSchema),
        defaultValues: {},
    });

    useEffect(() => {
        if (isEditSheetOpen && student) {
            form.reset({
                ...student,
                dateOfBirth: student.dateOfBirth ? format(new Date(student.dateOfBirth), 'yyyy-MM-dd') : '',
                admissionDate: student.admissionDate ? format(new Date(student.admissionDate), 'yyyy-MM-dd') : '',
            });
        }
    }, [isEditSheetOpen, student, form]);

    useEffect(() => {
        if (isStatusDialogOpen && student) {
            setCurrentStatus(student.status);
            setInactiveReason(student.inactiveReason || '');
        }
    }, [isStatusDialogOpen, student]);

    async function onEditSubmit(values: z.infer<typeof studentFormSchema>) {
        if (!studentRef) {
          toast({ variant: "destructive", title: "Error", description: "Could not save student data." });
          return;
        }
        updateDocumentNonBlocking(studentRef, values);
        toast({ title: "Student Updated", description: `${values.fullName}'s information has been updated.` });
        setIsEditSheetOpen(false);
    }

    async function handleSaveStatus() {
        if (!studentRef || !student) {
          toast({ variant: "destructive", title: "Error", description: "Could not save status." });
          return;
        }
        const dataToUpdate: Partial<Student> = {
          status: currentStatus,
          inactiveReason: currentStatus === 'Inactive' ? inactiveReason : '',
        };
        updateDocumentNonBlocking(studentRef, dataToUpdate);
        toast({ title: "Status Updated", description: `${student.fullName}'s status has been updated.`});
        setIsStatusDialogOpen(false);
    }

    const handleEventClick = async (event: StudentTimelineEvent) => {
        if (event.type !== 'EXAM_RESULT' || !event.details.examId || !firestore || !user) return;
        
        setIsExamDetailOpen(true);
        setIsLoadingDetails(true);
        setExamDetails(null);
        setPerformanceDetails(null);

        try {
            const examRef = doc(firestore, `schools/${user.uid}/exams`, event.details.examId);
            const examSnap = await getDoc(examRef);
            if (examSnap.exists()) {
                setExamDetails(examSnap.data() as Exam);
            }

            const subjectsRef = collection(firestore, `schools/${user.uid}/exams/${event.details.examId}/subjects`);
            const subjectsSnap = await getDocs(subjectsRef);
            const subjectsMap = new Map<string, Subject>();
            subjectsSnap.forEach(doc => subjectsMap.set(doc.id, doc.data() as Subject));

            const performanceRef = collection(firestore, `schools/${user.uid}/performanceRecords`);
            const q = query(performanceRef, 
                where('studentId', '==', studentId),
                where('examId', '==', event.details.examId)
            );
            const performanceSnap = await getDocs(q);
            
            const details: PerformanceDetails[] = [];
            performanceSnap.forEach(doc => {
                const record = doc.data() as PerformanceRecord;
                const subject = subjectsMap.get(record.subjectId);
                if (subject) {
                    details.push({
                        ...record,
                        subjectName: subject.subjectName,
                        maxMarks: subject.maxMarks
                    });
                }
            });
            setPerformanceDetails(details);

        } catch (error) {
            console.error("Error fetching exam details:", error);
            setExamDetails(null);
            setPerformanceDetails(null);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const renderIcon = (type: StudentTimelineEvent['type']) => {
        switch (type) {
            case 'ADMISSION':
                return <ScrollText className="w-5 h-5 text-primary" />;
            case 'PROMOTION':
                return <GraduationCap className="w-5 h-5 text-green-500" />;
            case 'EXAM_RESULT':
                 return <ClipboardCheck className="w-5 h-5 text-blue-500" />;
            case 'CLASS_ASSIGNMENT':
                 return <ArrowRight className="w-5 h-5 text-indigo-500" />;
            default:
                return <ScrollText className="w-5 h-5 text-primary" />;
        }
    };
    
     const getPercentage = (marks: number, maxMarks: number) => {
        if (maxMarks === 0 || isNaN(marks) || isNaN(maxMarks)) return "N/A";
        return ((marks / maxMarks) * 100).toFixed(2) + "%";
    };

    const classOptions = ["UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];
    const isLoading = studentLoading || timelineLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <p>Loading student details...</p>
            </div>
        );
    }
    
    if (!student) {
         return (
            <Card>
                <CardHeader>
                    <CardTitle>Student Not Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The requested student could not be found.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-8">
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                <User className="w-6 h-6" /> {student.fullName}
                                </CardTitle>
                                <CardDescription>
                                    Admission No: {student.admissionNumber}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setIsEditSheetOpen(true)}><Edit className="mr-2 h-4 w-4"/>Edit</Button>
                                <Button variant="outline" size="sm" onClick={() => setIsStatusDialogOpen(true)}><ShieldCheck className="mr-2 h-4 w-4"/>Status</Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                            <Badge variant={student.status === 'Active' ? 'default' : 'secondary'} className={student.status === 'Active' ? 'bg-green-500 hover:bg-green-600' : ''}>
                              {student.status}
                            </Badge>
                             {student.status === 'Inactive' && <p className="text-muted-foreground text-xs">({student.inactiveReason})</p>}
                        </div>
                         <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span><strong>DOB:</strong> {student.dateOfBirth}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Admission Class:</strong> {student.admissionClass}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Current Class:</strong> {student.currentClass}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Father:</strong> {student.parentGuardianName}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Mother:</strong> {student.motherName || 'N/A'}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Home className="w-4 h-4 text-muted-foreground" />
                            <span className="break-all"><strong>Address:</strong> {student.address}</span>
                        </div>
                        <Separator />
                        <h4 className="font-semibold">Additional Information</h4>
                         <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>PEN:</strong> {student.pen || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Aadhar:</strong> {student.aadhaarNumber || 'N/A'}</span>
                        </div>
                         <Separator />
                        <h4 className="font-semibold">Bank Details</h4>
                         <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Account No:</strong> {student.bankAccountNumber || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Bank Name:</strong> {student.bankName || 'N/A'}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>IFSC:</strong> {student.ifscCode || 'N/A'}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Academic Timeline</CardTitle>
                        <CardDescription>
                            An overview of the student's academic journey and important events.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative pl-6">
                            <div className="absolute left-[34px] h-full w-0.5 bg-border -translate-x-1/2"></div>
                            
                            <div className="space-y-8">
                                {timelineEvents && timelineEvents.length > 0 ? (
                                    timelineEvents.map((event) => (
                                    <div key={event.id} className="relative flex items-start">
                                        <div className="flex-shrink-0 w-16 text-right pr-6">
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(event.timestamp), 'dd MMM yyyy')}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 z-10">
                                            <div className={`w-4 h-4 rounded-full mt-1 ${event.type === 'EXAM_RESULT' ? 'bg-blue-500' : event.type === 'PROMOTION' ? 'bg-green-500' : event.type === 'CLASS_ASSIGNMENT' ? 'bg-indigo-500' : 'bg-primary'}`}></div>
                                        </div>
                                        <div className="ml-6 flex-1">
                                            <div className="flex items-center gap-2">
                                                {renderIcon(event.type)}
                                                <h4 className="font-semibold">{event.type.replace(/_/g, ' ')}</h4>
                                            </div>
                                            <p 
                                              className={`mt-1 text-sm ${event.type === 'EXAM_RESULT' ? 'text-blue-600 dark:text-blue-400 cursor-pointer hover:underline' : 'text-muted-foreground'}`}
                                              onClick={() => handleEventClick(event)}
                                            >
                                                {event.description}
                                            </p>
                                        </div>
                                    </div>
                                    ))
                                ) : (
                                    <p>No timeline events found for this student.</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isExamDetailOpen} onOpenChange={setIsExamDetailOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            Exam Performance: {examDetails?.examName} ({examDetails?.year})
                        </DialogTitle>
                        <DialogDescription>
                            Detailed report for {student?.fullName} in Class {examDetails?.className}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {isLoadingDetails ? (
                            <p>Loading details...</p>
                        ) : performanceDetails ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject Name</TableHead>
                                        <TableHead>Maximum Marks</TableHead>
                                        <TableHead>Marks Obtained</TableHead>
                                        <TableHead>Percentage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {performanceDetails.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell>{record.subjectName}</TableCell>
                                            <TableCell>{record.maxMarks}</TableCell>
                                            <TableCell>{record.marks}</TableCell>
                                            <TableCell>{getPercentage(record.marks, record.maxMarks)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p>Could not load performance details for this exam.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExamDetailOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
                <SheetContent className="sm:max-w-2xl">
                    <SheetHeader>
                        <SheetTitle>Edit Student Details</SheetTitle>
                        <SheetDescription>Update {student?.fullName}'s information below.</SheetDescription>
                    </SheetHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onEditSubmit)}>
                        <ScrollArea className="h-[calc(100vh-10rem)]">
                            <div className="grid gap-4 py-4 px-4">
                                <FormField name="id" render={({ field }) => (<FormItem><FormControl><Input type="hidden" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="admissionNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Admission Number</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="admissionDate" render={({ field }) => (
                                    <FormItem><FormLabel>Admission Date</FormLabel><FormControl><Input type="date" {...field} disabled /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="fullName" render={({ field }) => (
                                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="pen" render={({ field }) => (
                                    <FormItem><FormLabel>Student PEN</FormLabel><FormControl><Input placeholder="Personal Education Number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                                    <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} disabled /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="parentGuardianName" render={({ field }) => (
                                    <FormItem><FormLabel>Father's Full Name</FormLabel><FormControl><Input placeholder="Rakesh Sharma" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="motherName" render={({ field }) => (
                                    <FormItem><FormLabel>Mother's Full Name</FormLabel><FormControl><Input placeholder="Sunita Sharma" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123, Main Street" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="aadhaarNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Aadhar Number</FormLabel><FormControl><Input placeholder="xxxx-xxxx-xxxx" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="bankAccountNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Bank Account Number</FormLabel><FormControl><Input placeholder="Bank Account Number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="bankName" render={({ field }) => (
                                    <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="Bank Name" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="ifscCode" render={({ field }) => (
                                    <FormItem><FormLabel>Bank IFSC Code</FormLabel><FormControl><Input placeholder="IFSC Code" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="admissionClass" render={({ field }) => (
                                    <FormItem><FormLabel>Admission Class</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                                        <FormControl><SelectTrigger disabled><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>{classOptions.map((c) => (<SelectItem key={c} value={c}>Class {c}</SelectItem>))}</SelectContent>
                                    </Select><FormDescription>Admission class cannot be changed.</FormDescription><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="currentClass" render={({ field }) => (
                                    <FormItem><FormLabel>Current Class</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a current class" /></SelectTrigger></FormControl>
                                        <SelectContent>{classOptions.map((c) => (<SelectItem key={c} value={c}>Class {c}</SelectItem>))}</SelectContent>
                                    </Select><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </ScrollArea>
                        <SheetFooter>
                            <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
                            <Button type="submit">Save Changes</Button>
                        </SheetFooter>
                        </form>
                    </Form>
                </SheetContent>
            </Sheet>

            <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Change Student Status</DialogTitle>
                    <DialogDescription>Update the status for {student?.fullName}.</DialogDescription>
                </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">Status</Label>
                        <RadioGroup defaultValue={student?.status} onValueChange={(v: 'Active' | 'Inactive') => setCurrentStatus(v)} className="col-span-3 flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Active" id="active" /><Label htmlFor="active">Active</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Inactive" id="inactive" /><Label htmlFor="inactive">Inactive</Label></div>
                        </RadioGroup>
                    </div>
                    {currentStatus === 'Inactive' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reason" className="text-right">Reason</Label>
                            <Textarea id="reason" value={inactiveReason} onChange={(e) => setInactiveReason(e.target.value)} className="col-span-3" placeholder="Enter reason for inactivation"/>
                        </div>
                    )}
                    </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveStatus}>Save Changes</Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
