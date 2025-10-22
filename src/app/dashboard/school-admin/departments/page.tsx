
"use client"

import { useState, useMemo, useEffect } from "react";
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, doc, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Edit, Trash2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import type { Department } from "@/lib/types";

const departmentFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Department name is required."),
  type: z.enum(["Academic", "Non-Academic"], {
    required_error: "Department type is required.",
  }),
  parentId: z.string().optional(),
});

export default function DepartmentsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const departmentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/departments`));
  }, [firestore, schoolId]);
  const { data: departments, isLoading: departmentsLoading } = useCollection<Department>(departmentsQuery);

  const addForm = useForm<z.infer<typeof departmentFormSchema>>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: "",
      parentId: "none",
    },
  });
  
  const editForm = useForm<z.infer<typeof departmentFormSchema>>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: "",
      parentId: "none",
    },
  });

  const parentDepartments = useMemo(() => {
    if (!departments) return [];
    // Only allow top-level departments to be parents
    // Exclude the department being edited from the list of possible parents
    return departments.filter(d => !d.parentId && d.id !== selectedDepartment?.id);
  }, [departments, selectedDepartment]);
  
  const getParentName = (parentId?: string) => {
    if (!parentId || parentId === 'none' || !departments) return "Top-Level";
    return departments.find(d => d.id === parentId)?.name || "Unknown";
  };

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    editForm.reset({
      id: department.id,
      name: department.name,
      type: department.type,
      parentId: department.parentId || "none",
    });
    setIsEditSheetOpen(true);
  };
  
  const handleDelete = (department: Department) => {
     setSelectedDepartment(department);
     setIsDeleteDialogOpen(true);
  };

  const onAddDepartmentSubmit = (values: z.infer<typeof departmentFormSchema>) => {
    if (!firestore || !schoolId) return;
    
    const departmentId = doc(collection(firestore, `schools/${schoolId}/departments`)).id;
    const departmentRef = doc(firestore, `schools/${schoolId}/departments`, departmentId);

    const data: Omit<Department, 'isDefault'> = {
      id: departmentId,
      schoolId: schoolId,
      name: values.name,
      type: values.type,
      parentId: values.parentId === "none" ? "" : values.parentId,
    };
    
    setDocumentNonBlocking(departmentRef, data, { merge: false });
    toast({ title: "Department Created" });
    addForm.reset({ name: "", type: undefined, parentId: "none" });
  };
  
  const onEditDepartmentSubmit = (values: z.infer<typeof departmentFormSchema>) => {
    if (!firestore || !schoolId || !selectedDepartment) return;

    const departmentRef = doc(firestore, `schools/${schoolId}/departments`, selectedDepartment.id);

     const data = {
      name: values.name,
      type: values.type,
      parentId: values.parentId === "none" ? "" : values.parentId,
    };

    updateDocumentNonBlocking(departmentRef, data);
    toast({ title: "Department Updated" });
    setIsEditSheetOpen(false);
  }
  
  const confirmDelete = () => {
    if (!firestore || !schoolId || !selectedDepartment) return;
    
    const childDepartments = departments?.filter(d => d.parentId === selectedDepartment.id);
    if (childDepartments && childDepartments.length > 0) {
        toast({
            variant: "destructive",
            title: "Cannot Delete Department",
            description: "This department has sub-departments. Please delete or reassign them first.",
        });
        setIsDeleteDialogOpen(false);
        return;
    }

    deleteDocumentNonBlocking(doc(firestore, `schools/${schoolId}/departments`, selectedDepartment.id));
    toast({ variant: "destructive", title: "Department Deleted" });
    setIsDeleteDialogOpen(false);
    setSelectedDepartment(null);
  };

  return (
    <main className="grid flex-1 items-start gap-8 sm:px-6 sm:py-0">
        <Card>
            <CardHeader>
                <CardTitle>Add New Department</CardTitle>
                <CardDescription>
                Fill in the details for the new department.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...addForm}>
                    <form onSubmit={addForm.handleSubmit(onAddDepartmentSubmit)} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <FormField
                            control={addForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Principal's Office" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={addForm.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
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
                            control={addForm.control}
                            name="parentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Parent Department</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a parent department" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">None (Top-Level Department)</SelectItem>
                                            {parentDepartments.map(dept => (
                                                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Button type="submit">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Department
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
            <CardTitle>Departments & Offices</CardTitle>
            <CardDescription>
              Manage academic and non-academic departments and their sub-departments.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial</TableHead>
                <TableHead>Department Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Parent Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departmentsLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading departments...</TableCell>
                </TableRow>
              )}
               {!departmentsLoading && departments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No departments created yet. Add one to get started.</TableCell>
                </TableRow>
              )}
              {departments && departments.map((dept, index) => (
                <TableRow key={dept.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>{dept.type}</TableCell>
                  <TableCell>{getParentName(dept.parentId)}</TableCell>
                  <TableCell className="text-right">
                     <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(dept)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent>
            <SheetHeader>
                <SheetTitle>Edit Department</SheetTitle>
                <SheetDescription>
                   Update the department details.
                </SheetDescription>
            </SheetHeader>
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditDepartmentSubmit)} className="flex flex-col h-full">
                    <div className="grid gap-4 py-4">
                        <FormField
                            control={editForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Principal's Office" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={editForm.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
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
                            control={editForm.control}
                            name="parentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Parent Department</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a parent department" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">None (Top-Level Department)</SelectItem>
                                            {parentDepartments.map(dept => (
                                                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <SheetFooter className="mt-auto">
                        <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
                        <Button type="submit">Save Changes</Button>
                    </SheetFooter>
                </form>
            </Form>
        </SheetContent>
      </Sheet>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>This will permanently delete the department "{selectedDepartment?.name}". This action cannot be undone.</DialogDescription>
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

    