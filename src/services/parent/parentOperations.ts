import { supabase } from "@/integrations/supabase/client";
import { Parent, ParentInput } from "@/types/parent";

// Core CRUD operations for parents
export const getAllParents = async (): Promise<Parent[]> => {
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .is('deleted_at', null)
    .order('name');
  
  if (error) {
    console.error('Error fetching parents:', error);
    throw new Error(error.message);
  }
  
  return data.map(parent => ({
    id: parent.id,
    name: parent.name,
    email: parent.email,
    phone: parent.phone,
    role: parent.role || 'parent',
    createdAt: new Date(parent.created_at),
    updatedAt: new Date(parent.updated_at),
  }));
};

export const getParentById = async (id: string): Promise<Parent | null> => {
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  
  if (error) {
    console.error('Error fetching parent:', error);
    return null;
  }
  
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role || 'parent',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const createParent = async (parentData: ParentInput): Promise<Parent> => {
  const { data, error } = await supabase
    .from('parents')
    .insert([
      {
        name: parentData.name,
        email: parentData.email,
        phone: parentData.phone || null,
        role: parentData.role || 'parent',
        is_preloaded: true, // Admin-created parents need password setup
        password_set: false // Admin-created parents must set their own passwords
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating parent:', error);
    // Handle duplicate email error specifically
    if (error.code === '23505' && error.message.includes('parents_email_unique')) {
      throw new Error('A parent with this email address already exists');
    }
    throw new Error(error.message);
  }
  
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role || 'parent',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const updateParent = async (id: string, parentData: ParentInput): Promise<Parent> => {
  const { data, error } = await supabase
    .from('parents')
    .update({
      name: parentData.name,
      email: parentData.email,
      phone: parentData.phone || null,
      role: parentData.role || 'parent',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating parent:', error);
    throw new Error(error.message);
  }
  
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role || 'parent',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const deleteParent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('parents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting parent:', error);
    throw new Error(error.message);
  }
};
