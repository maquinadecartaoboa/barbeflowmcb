import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  cover_url?: string;
  settings: any;
  created_at: string;
  updated_at: string;
}

export const useTenant = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserTenants();
    } else {
      setTenants([]);
      setCurrentTenant(null);
      setLoading(false);
    }
  }, [user]);

  const fetchUserTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTenants(data || []);
      if (data && data.length > 0) {
        setCurrentTenant(data[0]);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTenantBySlug = async (slug: string) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tenant by slug:', error);
      return null;
    }
  };

  return {
    tenants,
    currentTenant,
    loading,
    getTenantBySlug,
    setCurrentTenant,
  };
};