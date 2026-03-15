import { writable } from 'svelte/store';
import type Sidebar from '$lib/components/Sidebar.svelte';

export const sidebarRef = writable<Sidebar | null>(null);
