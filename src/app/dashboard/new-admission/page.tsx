
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldNewAdmissionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/add-student');
  }, [router]);

  return null; 
}
