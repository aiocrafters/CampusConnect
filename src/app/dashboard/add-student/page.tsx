
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldAddStudentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/new-admission');
  }, [router]);

  return null; 
}
