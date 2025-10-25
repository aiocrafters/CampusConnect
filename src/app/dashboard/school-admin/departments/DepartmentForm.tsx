"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { PlusCircle } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const departmentFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Department name is required."),
  type: z.enum(["Academic", "Non-Academic", "Vocational"], {
    required_error: "Department type is required.",
  }),
  parentId: z.string().optional(),
});

type DepartmentFormData = z.infer<typeof departmentFormSchema>;

interface DepartmentFormProps {
  form: ReturnType<typeof useForm<DepartmentFormData>>;
  onSubmit: (values: DepartmentFormData) => void;
  parentDepartments: { value: string; label: string }[];
  isLoading: boolean;
}

export const DepartmentForm: React.FC<DepartmentFormProps> = ({ form, onSubmit, parentDepartments, isLoading }) => (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
      <FormField
        control={form.control}
        name="parentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Parent Department</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a parent department" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {parentDepartments.map(dept => (
                  <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
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
            <FormControl>
              <Input placeholder="e.g., Senior Secondary Wing" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit" disabled={isLoading}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Department
      </Button>
    </form>
  </Form>
);