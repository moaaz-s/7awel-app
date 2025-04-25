// hooks/use-contacts.ts
"use client"

import { useEffect, useState } from "react"
import { loadPlatform } from "@/platform"

export interface SimpleContact {
  id: string
  name: string
  phone?: string
}

export function useContacts() {
  const [contacts, setContacts] = useState<SimpleContact[]>([])
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)

  useEffect(() => {
    loadPlatform().then(async (p) => {
      const granted = await p.requestContactsPermission()
      setPermissionGranted(granted)
      if (granted) {
        const raw = await p.getContacts()
        setContacts(
          raw.map((c: any) => ({
            id: c.identifier || c.id,
            name: c.displayName || c.name,
            phone: c.phoneNumbers?.[0]?.number,
          })) as SimpleContact[],
        )
      }
    })
  }, [])

  return { contacts, permissionGranted }
}
