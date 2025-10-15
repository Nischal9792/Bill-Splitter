// src/store.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "./api";

export type Person = { id: string; name: string };
export type Item = { id: string; description: string; cost: number; paid_by: string; split_with: string[] };
export type GroupListItem = { id: string; name: string; people_count: number; items_count: number };
export type Group = { id: string; name: string; people: Person[]; items: Item[] };

type Store = {
  groups: Record<string, GroupListItem>;
  activeGroupId: string | null;
  activeGroup: Group | null;
  loadGroups: () => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  setActiveGroup: (id: string) => Promise<void>;
  addPerson: (name: string) => Promise<void>;
  deletePerson: (personId: string) => Promise<void>;
  addItem: (desc: string, cost: number, paidBy: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);
const uid = () => Math.random().toString(36).slice(2);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<Record<string, GroupListItem>>({});
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);

  const loadGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/groups`);
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      const data: GroupListItem[] = await res.json();
      const groupsMap = data.reduce((acc, g) => ({ ...acc, [g.id]: g }), {});
      setGroups(groupsMap);
    } catch (err) {
      console.error("Error loading groups:", err);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const refreshActive = async () => {
    if (!activeGroupId) return;
    try {
      const res = await fetch(`${API_URL}/groups/${activeGroupId}`);
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      const data = await res.json();
      
      // Fix: Properly map the backend response to frontend structure
      const mappedGroup: Group = {
        id: data.id,
        name: data.name,
        people: data.people || [],
        items: (data.items || []).map((it: any) => ({
          id: it.id,
          description: it.description,
          cost: parseFloat(it.cost) || 0, // Ensure cost is a number
          paid_by: it.paid_by,
          split_with: it.split_with || []
        }))
      };
      
      setActiveGroupState(mappedGroup);
    } catch (err) {
      console.error("Error refreshing active group:", err);
    }
  };

  const addGroup = async (name: string) => {
    try {
      const id = "g_" + uid();
      const res = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      await loadGroups();
    } catch (err) {
      console.error("Error adding group:", err);
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const res = await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      
      // If the deleted group was active, clear active group
      if (activeGroupId === groupId) {
        setActiveGroupId(null);
        setActiveGroupState(null);
      }
      
      await loadGroups();
    } catch (err) {
      console.error("Error deleting group:", err);
      throw err; // Re-throw to handle in UI
    }
  };

  const setActiveGroup = async (id: string) => {
    setActiveGroupId(id);
    await refreshActive();
  };

  const addPerson = async (name: string) => {
    if (!activeGroupId) return;
    try {
      const id = "p_" + uid();
      const res = await fetch(`${API_URL}/groups/${activeGroupId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      await refreshActive();
      await loadGroups();
    } catch (err) {
      console.error("Error adding person:", err);
    }
  };

  const deletePerson = async (personId: string) => {
    if (!activeGroupId) return;
    try {
      const res = await fetch(`${API_URL}/groups/${activeGroupId}/people/${personId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      await refreshActive();
      await loadGroups();
    } catch (err) {
      console.error("Error deleting person:", err);
    }
  };

  const addItem = async (description: string, cost: number, paidBy: string) => {
    if (!activeGroupId) return;
    try {
      const id = "i_" + uid();
      const res = await fetch(`${API_URL}/groups/${activeGroupId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, description, cost, paid_by: paidBy }),
      });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      await refreshActive();
      await loadGroups();
    } catch (err) {
      console.error("Error adding item:", err);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!activeGroupId) return;
    try {
      const res = await fetch(`${API_URL}/groups/${activeGroupId}/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      await refreshActive();
      await loadGroups();
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  return (
    <Ctx.Provider
      value={{
        groups,
        activeGroupId,
        activeGroup,
        loadGroups,
        addGroup,
        deleteGroup,
        setActiveGroup,
        addPerson,
        deletePerson,
        addItem,
        deleteItem,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be inside StoreProvider");
  return s;
};

/* ---------- Calculations for summary ---------- */
export function calcBalances(g: Group) {
  const balances: Record<string, number> = {};
  g.people.forEach((p) => (balances[p.id] = 0));
  const total = g.items.reduce((sum, it) => sum + (it.cost || 0), 0); // Add safety check for cost
  const perHead = g.people.length ? total / g.people.length : 0;
  
  for (const it of g.items) {
    if (it.paid_by) balances[it.paid_by] += (it.cost || 0); // Add safety check for cost
  }
  
  for (const p of g.people) {
    balances[p.id] -= perHead;
  }
  
  return { total, balances };
}

export function simplify(balances: Record<string, number>) {
  const debtors: { id: string; amt: number }[] = [];
  const creditors: { id: string; amt: number }[] = [];
  
  Object.entries(balances).forEach(([id, v]) => {
    if (v < -0.01) debtors.push({ id, amt: -v });
    else if (v > 0.01) creditors.push({ id, amt: v });
  });
  
  const txns: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;
  
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    txns.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }
  
  return txns;
}