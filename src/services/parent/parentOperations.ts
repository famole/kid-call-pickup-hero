import { supabase } from "@/integrations/supabase/client";
import { Parent, ParentInput } from "@/types/parent";
import { logger } from "@/utils/logger";

// Core CRUD operations for parents
export const getAllParents = async (includeDeleted: boolean = false): Promise<Parent[]> => {
  let query = supabase
    .from('parents')
    .select('*');
  
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }
  
  const { data, error } = await query.order('name');
  
  if (error) {
    logger.error('Error fetching parents:', error);
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
    logger.error('Error fetching parent:', error);
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
  // Validate that either email or username is provided (but not necessarily both)
  if (!parentData.email && !parentData.username) {
    throw new Error('Either email or username must be provided');
  }
  
  const { data, error } = await supabase
    .from('parents')
    .insert([
      {
        name: parentData.name,
        email: parentData.email || null, // Allow null email for username-only users
        username: parentData.username || null, // Add username support
        phone: parentData.phone || null,
        role: parentData.role || 'parent',
        is_preloaded: parentData.is_preloaded !== undefined ? parentData.is_preloaded : true, // Admin-created parents need password setup by default
        password_set: parentData.password_set !== undefined ? parentData.password_set : false // Admin-created parents must set their own passwords by default
      }
    ])
    .select()
    .single();

  if (error) {
    logger.error('Error creating parent:', error);
    // Handle duplicate email/username errors specifically
    if (error.code === '23505') {
      if (error.message.includes('parents_email_unique')) {
        throw new Error('A parent with this email address already exists');
      } else if (error.message.includes('parents_username_key')) {
        throw new Error('A parent with this username already exists');
      }
    }
    throw new Error(error.message);
  }
  
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    username: data.username,
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
    logger.error('Error updating parent:', error);
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
    logger.error('Error deleting parent:', error);
    throw new Error(error.message);
  }
};

export const reactivateParent = async (id: string): Promise<Parent> => {
  const { data, error } = await supabase
    .from('parents')
    .update({ 
      deleted_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    logger.error('Error reactivating parent:', error);
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

export const resetParentPassword = async (identifier: string): Promise<void> => {
  const { error } = await supabase.functions.invoke('reset-parent-password', {
    body: { identifier }
  });
  
  if (error) {
    logger.error('Error resetting parent password:', error);
    throw new Error(error.message);
  }
};
