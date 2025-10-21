
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
import type { Department } from "@/lib/types"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table"

const departmentFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Department name must be at least 2 characters."),
  parentId: z.string().optional(),
  type: z.enum(["Academic", "Non-Academic"], { required_error: "Department type is required."}),
  isDefault: z.boolean().optional(),
});

const defaultDepartments: Omit<Department, 'id' | 'schoolId'>[] = [
    // Academic
    { name: 'Academic Departments', type: 'Academic', isDefault: true },
    { name: 'English', type: 'Academic', parentId: 'academic_root', isDefault: true },
    { name: 'Mathematics', type: 'Academic', parentId: 'academic_root', isDefault: true },
    { name: 'Science', type: 'Academic', parentId: 'academic_root', isDefault: true },
    { name: 'Social Studies', type: 'Academic', parentId: 'academic_root', isDefault: true },
    { name: 'ICT', type: 'Academic', parentId: 'academic_root', isDefault: true },
    { name: 'Arts', type: 'Academic', parentId: 'academic_root', isDefault: true },
    { name: 'Physical Education', type: 'Academic', parentId: 'academic_root', isDefault: true },
    { name: 'Business', type: 'Academic', parentId: 'academic_root', isDefault: true },
    
    // Non-Academic
    { name: 'Administrative Departments', type: 'Non-Academic', isDefault: true },
    { name: 'Principal’s Office', type: 'Non-Academic', parentId: 'administrative_root', isDefault: true },
    { name: 'Vice Principal’s Office', type: 'Non-Academic', parentId: 'administrative_root', isDefault: true },
    { name: 'Finance', type: 'Non-Academic', parentId: 'administrative_root', isDefault: true },
    { name: 'Human Resources', type: 'Non-Academic', parentId: 'administrative_root', isDefault: true },
    { name: 'Records & Examinations', type: 'Non-Academic', parentId: 'administrative_root', isDefault: true },
    { name: 'Administration Office', type: 'Non-Academic', parentId: 'administrative_root', isDefault: true },

    { name: 'Student Support Departments', type: 'Non-Academic', isDefault: true },
    { name: 'Guidance & Counseling', type: 'Non-Academic', parentId: 'student_support_root', isDefault: true },
    { name: 'Health Services', type: 'Non-Academic', parentId: 'student_support_root', isDefault: true },
    { name: 'Library', type: 'Non-Academic', parentId: 'student_support_root', isDefault: true },
    { name: 'Special Education', type: 'Non-Academic', parentId: 'student_support_root', isDefault: true },
    { name: 'Student Affairs', type: 'Non-Academic', parentId: 'student_support_root', isDefault: true },

    { name: 'Operational & Maintenance Departments', type: 'Non-Academic', isDefault: true },
    { name: 'Facilities & Maintenance', type: 'Non-Academic', parentId: 'operational_root', isDefault: true },
    { name: 'Security', type: 'Non-Academic', parentId: 'operational_root', isDefault: true },
    { name: 'Transport', type: 'Non-Academic', parentId: 'operational_root', isDefault: true },
    { name: 'Cafeteria', type: 'Non-Academic', parentId: 'operational_root', isDefault: true },
    { name: 'Cleaning & Sanitation', type: 'Non-Academic', parentId: 'operational_root', isDefault: true },

    { name: 'ICT & Innovation Departments', type: 'Non-Academic', isDefault: true },
    { name: 'Computer Science', type: 'Non-Academic', parentId: 'ict_root', isDefault: true },
    { name: 'Educational Technology', type: 'Non-Academic', parentId: 'ict_root', isDefault: true },
    { name: 'IT Support', type: 'Non-Academic', parentId: 'ict_root', isDefault: true },
];

const rootMapping: { [key: string]: string } = {
    'academic_root': 'Academic Departments',
    'administrative_root': 'Administrative Departments',
    'student_support_root': 'Student Support Departments',
    'operational_root': 'Operational & Maintenance Departments',
    'ict_root': 'ICT & Innovation Departments',
};

export default function DepartmentsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [parentForNewSubDept, setParentForNewSubDept] = useState<Department | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Data fetching
  const departmentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/departments`));
  }, [firestore, schoolId]);
  const { data: departments, isLoading: departmentsLoading } = useCollection<Department>(departmentsQuery);

  useEffect(() => {
    if (departmentsLoading) {
      setIsInitializing(true);
      return;
    }
  
    if (departments && departments.length === 0 && firestore && schoolId) {
      const initializeDepartments = async () => {
        const batch = writeBatch(firestore);
        
        const rootDeptIds: { [key: string]: string } = {};

        // First pass: create root departments and get their IDs
        defaultDepartments.forEach(dept => {
            if (!dept.parentId) {
                const deptRef = doc(collection(firestore, `schools/${schoolId}/departments`));
                rootDeptIds[dept.name] = deptRef.id;
                batch.set(deptRef, { ...dept, id: deptRef.id, schoolId });
            }
        });

        // Second pass: create sub-departments with correct parentId
        defaultDepartments.forEach(dept => {
            if (dept.parentId) {
                const parentName = rootMapping[dept.parentId];
                const parentId = rootDeptIds[parentName];
                if (parentId) {
                    const deptRef = doc(collection(firestore, `schools/${schoolId}/departments`));
                    batch.set(deptRef, { ...dept, id: deptRef.id, schoolId, parentId });
                }
            }
        });
        
        try {
          await batch.commit();
          toast({
            title: "Departments Initialized",
            description: "Default departments have been added to your school.",
          });
        } catch (error) {
           console.error("Error initializing departments:", error);
           toast({
              variant: "destructive",
              title: "Initialization Failed",
              description: "Could not add default departments.",
           });
        }
      };
      initializeDepartments();
    }
    setIsInitializing(false);
  }, [departmentsLoading, departments, firestore, schoolId, toast]);

  const form = useForm<z.infer<typeof departmentFormSchema>>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { name: "", parentId: "none", type: "Academic" },
  });

  const { academicDepartments, nonAcademicDepartments, subDepartmentsMap } = useMemo(() => {
    if (!departments) return { academicDepartments: [], nonAcademicDepartments: [], subDepartmentsMap: new Map() };
    const academic: Department[] = [];
    const nonAcademic: Department[] = [];
    const subMap = new Map<string, Department[]>();

    departments.forEach(dept => {
      if (dept.parentId) {
        const children = subMap.get(dept.parentId) || [];
        children.push(dept);
        subMap.set(dept.parentId, children);
      } else {
        if (dept.type === 'Academic') {
          academic.push(dept);
        } else {
          nonAcademic.push(dept);
        }
      }
    });

    return { academicDepartments: academic, nonAcademicDepartments: nonAcademic, subDepartmentsMap: subMap };
  }, [departments]);


  const handleAdd = (parent: Department | null = null) => {
    setIsEditMode(false);
    setSelectedDepartment(null);
    setParentForNewSubDept(parent);
    form.reset({ name: "", parentId: parent?.id || "none", type: parent?.type || 'Academic' });
    setIsSheetOpen(true);
  };

  const handleEdit = (department: Department) => {
    setIsEditMode(true);
    setSelectedDepartment(department);
    setParentForNewSubDept(null);
    form.reset({ id: department.id, name: department.name, parentId: department.parentId || "none", type: department.type || 'Academic' });
    setIsSheetOpen(true);
  };

  const handleDelete = (department: Department) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  };

  const onDepartmentSubmit = (values: z.infer<typeof departmentFormSchema>) => {
    if (!firestore || !schoolId) return;
    
    const dataToSave = {
        name: values.name,
        parentId: values.parentId === 'none' ? undefined : values.parentId,
        type: values.type,
        isDefault: values.isDefault || false,
    };

    if (isEditMode && selectedDepartment) {
      const departmentDocRef = doc(firestore, `schools/${schoolId}/departments`, selectedDepartment.id);
      updateDocumentNonBlocking(departmentDocRef, dataToSave);
      toast({ title: "Department Updated", description: "The department has been successfully updated." });
    } else {
      const departmentId = doc(collection(firestore, `schools/${schoolId}/departments`)).id;
      const departmentDocRef = doc(firestore, `schools/${schoolId}/departments`, departmentId);
      const newDept: Omit<Department, 'id' | 'schoolId'> & { id: string, schoolId: string } = {
        id: departmentId,
        schoolId,
        name: values.name,
        parentId: values.parentId === 'none' ? undefined : values.parentId,
        type: values.type,
        isDefault: false
      };
      setDocumentNonBlocking(departmentDocRef, newDept, { merge: false });
      toast({ title: "Department Added", description: "The new department has been added." });
    }
    setIsSheetOpen(false);
    setParentForNewSubDept(null);
  };

  const confirmDelete = () => {
    if (!firestore || !schoolId || !selectedDepartment) return;

    const subDepts = subDepartmentsMap.get(selectedDepartment.id) || [];
    if (subDepts.length > 0) {
        toast({ variant: "destructive", title: "Deletion Failed", description: "Cannot delete a department that has sub-departments. Please delete them first."});
        setIsDeleteDialogOpen(false);
        return;
    }
    
    if (selectedDepartment.isDefault) {
      toast({ variant: "destructive", title: "Deletion Failed", description: "Cannot delete a default department."});
      setIsDeleteDialogOpen(false);
      return;
    }

    const departmentDocRef = doc(firestore, `schools/${schoolId}/departments`, selectedDepartment.id);
    deleteDocumentNonBlocking(departmentDocRef);
    toast({ variant: "destructive", title: "Department Deleted" });
    setIsDeleteDialogOpen(false);
    setSelectedDepartment(null);
  };

  const renderDepartmentAccordion = (depts: Department[], title: string) => (
    <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        {depts.length > 0 ? (
            <Accordion type="multiple" className="w-full">
            {depts.map(dept => {
                    const children = subDepartmentsMap.get(dept.id) || [];
                    return (
                    <AccordionItem value={dept.id} key={dept.id}>
                        <div className="flex items-center w-full border-b">
                            <AccordionTrigger className="flex-1 text-lg font-medium pr-2">
                                {dept.name}
                            </AccordionTrigger>
                            <div className="ml-auto pr-4 flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleAdd(dept)}>
                                    <PlusCircle className="h-4 w-4 mr-2" /> Add Sub-dept
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}><Edit className="h-4 w-4" /></Button>
                                {!dept.isDefault && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(dept)}><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                        </div>
                        <AccordionContent>
                            {children.length > 0 ? (
                                <div className="pl-6 pt-2">
                                    <Table>
                                            <TableHeader>
                                            <TableRow>
                                                <TableHead>Sub-Department / Office</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {children.map(child => (
                                            <TableRow key={child.id}>
                                                <TableCell className="font-medium">{child.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(child)}><Edit className="h-4 w-4" /></Button>
                                                    {!child.isDefault && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(child)}><Trash2 className="h-4 w-4" /></Button>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm p-4 text-center">No sub-departments found.</p>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                    )
            })}
        </Accordion>
        ) : (
            <p className="text-center text-muted-foreground py-4">No {title.toLowerCase()} found.</p>
        )}
    </div>
  );

  const isLoading = departmentsLoading || isInitializing;

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Departments & Offices</CardTitle>
            <CardDescription>
              Manage academic and non-academic departments and their sub-departments.
            </CardDescription>
          </div>
          <Button size="sm" className="h-8 gap-1" onClick={() => handleAdd(null)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Add Department
            </span>
          </Button>
        </CardHeader>
        <CardContent>
            {isLoading && <p className="text-center py-8">Loading departments...</p>}
            {!isLoading && departments?.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                    No departments found. Add one to get started.
                </div>
            )}
            {!isLoading && departments && departments.length > 0 && (
                <>
                  {renderDepartmentAccordion(academicDepartments, "Academic Departments")}
                  <Separator className="my-6" />
                  {renderDepartmentAccordion(nonAcademicDepartments, "Non-Academic Departments")}
                </>
            )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>{isEditMode ? 'Edit Department' : (parentForNewSubDept ? `Add Sub-department to ${parentForNewSubDept.name}`: 'Add New Department')}</SheetTitle>
                <SheetDescription>
                    {isEditMode ? "Update the department details." : "Enter the details for the new department."}
                </SheetDescription>
            </SheetHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onDepartmentSubmit)} className="flex flex-col h-full">
                    <div className="grid gap-4 py-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department Type</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value} disabled={!!parentForNewSubDept}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a department type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="Academic">Academic</SelectItem>
                                        <SelectItem value="Non-Academic">Non-Academic</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="parentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Parent Department</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                      <FormControl>
                                        <SelectTrigger disabled={!!parentForNewSubDept}>
                                          <SelectValue placeholder="Select a parent department" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="none">None (Top-Level Department)</SelectItem>
                                        {[...academicDepartments, ...nonAcademicDepartments]
                                          .filter(d => d.id !== selectedDepartment?.id)
                                          .map(dept => (
                                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Academics, HR Office" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <SheetFooter className="mt-auto">
                        <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
                        <Button type="submit">{isEditMode ? 'Save Changes' : 'Add Department'}</Button>
                    </SheetFooter>
                </form>
            </Form>
        </SheetContent>
      </Sheet>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                    This will permanently delete the department "{selectedDepartment?.name}". This action cannot be undone. 
                    You cannot delete a department that has sub-departments or is a default department.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button variant="destructive" onClick={confirmDelete}>Yes, delete department</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

    